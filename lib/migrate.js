/**
 * One-time importer: the three CSVs (exported Google Sheet tabs) -> Firestore.
 * Idempotent: deterministic doc ids mean re-running overwrites rather than dupes.
 * Invoked via the protected POST /api/admin/migrate endpoint.
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Timestamp } from '@google-cloud/firestore';
import { db, COL, slug } from './firestore.js';
import { parseCsvObjects, parseSheetDate, parsePercent } from './csv.js';
import { computePriority } from './priority.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

const FILES = {
  mastery: 'Skill Mastery.csv',
  bank: 'Question Bank.csv',
  log: 'Quiz Log.csv',
};

function hashId(...parts) {
  return createHash('sha1').update(parts.join('')).digest('hex').slice(0, 32);
}

async function loadCsv(name) {
  const text = await readFile(path.join(DATA_DIR, name), 'utf8');
  return parseCsvObjects(text);
}

/** Commit an array of {ref, data} ops in chunks (Firestore batch limit = 500). */
async function commitInChunks(ops, size = 450) {
  let written = 0;
  for (let i = 0; i < ops.length; i += size) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + size)) batch.set(op.ref, op.data);
    await batch.commit();
    written += Math.min(size, ops.length - i);
  }
  return written;
}

export async function runMigration() {
  const now = new Date();
  const report = {};

  /* ---- Question Bank ---- */
  {
    const rows = await loadCsv(FILES.bank);
    const ops = rows
      .filter((r) => r['Question Text'])
      .map((r) => {
        const topic = (r['Topic (Sub-Lesson)'] || '').trim();
        const question = (r['Question Text'] || '').trim();
        const options = (r['Options (A|B|C|D)'] || '')
          .split('|')
          .map((o) => o.trim())
          .filter(Boolean);
        const answer = (r['Correct Answer'] || '').trim();
        return {
          ref: db.collection(COL.questions).doc(hashId(topic, question)),
          data: { topic, question, options, answer, generated: false },
        };
      });
    report.questions = await commitInChunks(ops);
  }

  /* ---- Skill Mastery (catalog + stats) ---- */
  {
    const rows = await loadCsv(FILES.mastery);
    const ops = rows
      .filter((r) => r['Topic (Sub-Lesson)'])
      .map((r) => {
        const track = (r['Track'] || '').trim();
        const course = (r['Course'] || '').trim();
        const lesson = (r['Unit Number: Lesson Name'] || '').trim();
        const topic = (r['Topic (Sub-Lesson)'] || '').trim();
        const totalAttempts = parseInt(r['Total Attempts'], 10) || 0;
        const accuracy = parsePercent(r['Accuracy']);
        const correctCount = Math.round(accuracy * totalAttempts);
        const lastAttempted = parseSheetDate(r['Last Date Attempted']);
        const questionCount = parseInt(r['Question Bank'], 10) || 0;
        const stats = { correctCount, totalAttempts, lastAttempted };
        return {
          ref: db.collection(COL.topics).doc(slug(track, course, lesson, topic)),
          data: {
            track,
            course,
            lesson,
            topic,
            questionCount,
            totalAttempts,
            correctCount,
            lastAttempted: lastAttempted ? Timestamp.fromDate(lastAttempted) : null,
            priority: computePriority(stats, now),
          },
        };
      });
    report.topics = await commitInChunks(ops);
  }

  /* ---- Quiz Log (history -> powers "unseen-first") ---- */
  {
    const rows = await loadCsv(FILES.log);
    const ops = rows
      .filter((r) => r['Question Text'])
      .map((r) => {
        const date = parseSheetDate(r['Date']);
        const question = (r['Question Text'] || '').trim();
        const topic = (r['Topic (Sub-Lesson)'] || '').trim();
        return {
          ref: db.collection(COL.quizLog).doc(hashId(r['Date'] || '', topic, question)),
          data: {
            track: (r['Track'] || '').trim(),
            course: (r['Course'] || '').trim(),
            lesson: (r['Unit Number: Lesson Name'] || '').trim(),
            topic,
            question,
            result: parseInt(r['Result'], 10) || 0,
            reviewFlag: r['Review Flag'] ? 1 : 0,
            date: date ? Timestamp.fromDate(date) : null,
          },
        };
      });
    report.quizLog = await commitInChunks(ops);
  }

  return report;
}
