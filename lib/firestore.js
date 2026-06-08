/**
 * Firestore data layer. Replaces the three Google Sheet tabs:
 *   Skill Mastery -> `topics`     (catalog + running mastery stats)
 *   Question Bank -> `questions`  (the MCQ pool)
 *   Quiz Log      -> `quizLog`    (append-only attempt history)
 */
import { Firestore, FieldValue, Timestamp } from '@google-cloud/firestore';
import { computePriority, deriveStats } from './priority.js';

// On Cloud Run, project + credentials come from the runtime automatically.
export const db = new Firestore({
  ignoreUndefinedProperties: true,
});

export const COL = {
  topics: 'topics',
  questions: 'questions',
  quizLog: 'quizLog',
};

/** Deterministic doc id so re-running the import is idempotent. */
export function slug(...parts) {
  return parts
    .join('__')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 480) || 'x';
}

/* ----------------------------- Catalog (topics) ---------------------------- */

/** Full topic catalog with derived priority, used to build the cascading menus. */
export async function getCatalog() {
  const snap = await db.collection(COL.topics).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * The full topic catalog shaped as BigQuery rows: one row per topic with its
 * mastery numbers (accuracy = how well mastered, priority = how urgently it
 * needs work). This is the live, self-updating form of `data/Skill Mastery.csv`.
 */
export async function getTopicsRows(now = new Date()) {
  const cat = await getCatalog();
  const syncedAt = now.toISOString();
  return cat.map((t) => {
    const correctCount = t.correctCount || 0;
    const totalAttempts = t.totalAttempts || 0;
    const lastAttempted = t.lastAttempted?.toDate ? t.lastAttempted.toDate() : null;
    const d = deriveStats({ correctCount, totalAttempts, lastAttempted }, now);
    return {
      track: t.track || '',
      course: t.course || '',
      lesson: t.lesson || '',
      topic: t.topic || '',
      questionCount: t.questionCount || 0,
      totalAttempts,
      correctCount,
      accuracy: totalAttempts ? d.accuracy : null,
      daysSince: totalAttempts ? d.daysSince : null,
      priority: d.priority,
      lastAttempted: lastAttempted ? lastAttempted.toISOString() : null,
      syncedAt,
    };
  });
}

/* --------------------------------- Questions ------------------------------- */

/** All questions for a set of topic names. Firestore `in` caps at 30 values. */
export async function getQuestionsForTopics(topicNames) {
  const out = [];
  for (let i = 0; i < topicNames.length; i += 30) {
    const chunk = topicNames.slice(i, i + 30);
    if (!chunk.length) continue;
    const snap = await db
      .collection(COL.questions)
      .where('topic', 'in', chunk)
      .get();
    snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  }
  return out;
}

/** Every question doc (for the one-time LaTeX migration). */
export async function getAllQuestions() {
  const snap = await db.collection(COL.questions).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Apply {id, question, options, answer} updates in chunked batches. */
export async function bulkUpdateQuestions(updates) {
  let batch = db.batch();
  let ops = 0;
  let n = 0;
  for (const u of updates) {
    batch.update(db.collection(COL.questions).doc(u.id), {
      question: u.question,
      options: u.options,
      answer: u.answer,
    });
    n += 1;
    if (++ops >= 450) { await batch.commit(); batch = db.batch(); ops = 0; }
  }
  if (ops > 0) await batch.commit();
  return n;
}

export async function addQuestion({ topic, question, options, answer }) {
  await db.collection(COL.questions).add({
    topic,
    question,
    options,
    answer,
    createdAt: FieldValue.serverTimestamp(),
    generated: true,
  });
}

/** Set of question texts that have already been answered (mastery mode). */
export async function getSeenQuestionTexts() {
  const snap = await db.collection(COL.quizLog).select('question').get();
  const seen = new Set();
  snap.forEach((d) => {
    const t = d.get('question');
    if (t) seen.add(String(t).trim());
  });
  return seen;
}

/**
 * Recent attempt history bucketed by UTC day, for the progress chart.
 * Reads only the last `days` of quizLog (single-field index on `date` is
 * auto-created by Firestore — no composite index needed).
 */
export async function getRecentActivity(days = 14) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const snap = await db
    .collection(COL.quizLog)
    .where('date', '>=', Timestamp.fromDate(cutoff))
    .select('date', 'result')
    .get();

  const buckets = new Map(); // 'YYYY-MM-DD' -> { total, correct }
  snap.forEach((d) => {
    const ts = d.get('date');
    if (!ts?.toDate) return;
    const day = ts.toDate().toISOString().slice(0, 10);
    const b = buckets.get(day) || { total: 0, correct: 0 };
    b.total += 1;
    b.correct += d.get('result') === 1 ? 1 : 0;
    buckets.set(day, b);
  });

  // Emit a dense series (zero-filled) so the chart has no gaps.
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    out.push({ day, ...(buckets.get(day) || { total: 0, correct: 0 }) });
  }
  return out;
}

/** Full quizLog history, shaped as BigQuery rows (for the one-time backfill). */
export async function getQuizLogRows() {
  const snap = await db.collection(COL.quizLog).get();
  return snap.docs.map((d) => {
    const x = d.data();
    const date = x.date?.toDate ? x.date.toDate() : null;
    return {
      date: (date || new Date(0)).toISOString(),
      track: x.track || '',
      course: x.course || '',
      lesson: x.lesson || '',
      topic: x.topic || '',
      question: x.question || '',
      result: x.result === 1 ? 1 : 0,
      reviewFlag: x.reviewFlag === 1 ? 1 : 0,
    };
  });
}

/**
 * Current activity streak: number of consecutive days (UTC) ending today (or
 * yesterday, if today has no activity yet) that have at least one logged attempt.
 */
export async function getStreak(now = new Date()) {
  const snap = await db.collection(COL.quizLog).select('date').get();
  const days = new Set();
  snap.forEach((d) => {
    const ts = d.get('date');
    if (ts?.toDate) days.add(ts.toDate().toISOString().slice(0, 10));
  });
  if (!days.size) return 0;

  const DAY_MS = 24 * 60 * 60 * 1000;
  let cursor = new Date(now.getTime());
  const keyOf = (dt) => dt.toISOString().slice(0, 10);

  // Today may not have activity yet; anchor on yesterday so the streak holds.
  if (!days.has(keyOf(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS);
    if (!days.has(keyOf(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(keyOf(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

/**
 * Wipe all progress: zero every topic's running mastery stats (keeping the
 * catalog rows) and delete the entire quizLog history. Start-from-scratch.
 */
export async function resetProgress(now = new Date()) {
  const freshPriority = computePriority(
    { correctCount: 0, totalAttempts: 0, lastAttempted: null },
    now
  );

  // 1. Reset every topic's stats (keep track/course/lesson/topic/questionCount).
  const topicsSnap = await db.collection(COL.topics).get();
  let topicsReset = 0;
  let batch = db.batch();
  let ops = 0;
  for (const doc of topicsSnap.docs) {
    batch.set(
      doc.ref,
      {
        correctCount: 0,
        totalAttempts: 0,
        lastAttempted: FieldValue.delete(),
        priority: freshPriority,
      },
      { merge: true }
    );
    topicsReset += 1;
    if (++ops >= 450) { await batch.commit(); batch = db.batch(); ops = 0; }
  }
  if (ops > 0) await batch.commit();

  // 2. Delete all quiz log history.
  const logSnap = await db.collection(COL.quizLog).get();
  let logDeleted = 0;
  batch = db.batch();
  ops = 0;
  for (const doc of logSnap.docs) {
    batch.delete(doc.ref);
    logDeleted += 1;
    if (++ops >= 450) { await batch.commit(); batch = db.batch(); ops = 0; }
  }
  if (ops > 0) await batch.commit();

  return { topicsReset, logDeleted };
}

/* --------------------------------- Quiz Log -------------------------------- */

/**
 * Append results to the log AND update the running mastery stats on each topic.
 * Mirrors what the old sheet did (append rows) plus what the sheet *formulas*
 * did (recompute accuracy / days-since / priority).
 */
export async function logResults(results) {
  const now = new Date();
  const batch = db.batch();

  // 1. Append each attempt to quizLog.
  for (const r of results) {
    const ref = db.collection(COL.quizLog).doc();
    batch.set(ref, {
      track: r.track || '',
      course: r.course || '',
      lesson: r.lesson || '',
      topic: r.topic || '',
      question: r.question || '',
      result: r.isCorrect ? 1 : 0,
      reviewFlag: r.reviewFlag ? 1 : 0,
      date: Timestamp.fromDate(now),
    });
  }

  // 2. Aggregate per-topic deltas from this session.
  const deltas = new Map(); // topicDocId -> { topicDoc, correct, total }
  for (const r of results) {
    const id = slug(r.track, r.course, r.lesson, r.topic);
    const cur = deltas.get(id) || { meta: r, correct: 0, total: 0 };
    cur.correct += r.isCorrect ? 1 : 0;
    cur.total += 1;
    deltas.set(id, cur);
  }

  // 3. Read current stats, then update counters + recompute priority.
  for (const [id, delta] of deltas) {
    const ref = db.collection(COL.topics).doc(id);
    const snap = await ref.get();
    const prev = snap.exists ? snap.data() : {};
    const correctCount = (prev.correctCount || 0) + delta.correct;
    const totalAttempts = (prev.totalAttempts || 0) + delta.total;
    const stats = { correctCount, totalAttempts, lastAttempted: now };
    batch.set(
      ref,
      {
        track: prev.track ?? delta.meta.track ?? '',
        course: prev.course ?? delta.meta.course ?? '',
        lesson: prev.lesson ?? delta.meta.lesson ?? '',
        topic: prev.topic ?? delta.meta.topic ?? '',
        questionCount: prev.questionCount ?? 0,
        correctCount,
        totalAttempts,
        lastAttempted: Timestamp.fromDate(now),
        priority: computePriority(stats, now),
      },
      { merge: true }
    );
  }

  await batch.commit();
  return deltas.size;
}
