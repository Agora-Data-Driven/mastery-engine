// One-off: load Ian's DM curriculum into program=digital_marketing. Idempotent (upsert on slug).
// Usage: node _load_dm_curriculum.mjs <outline.txt> [--commit]
import fs from 'node:fs';
import { upsertTopics } from './lib/firestore.js';

const file = process.argv[2];
const commit = process.argv.includes('--commit');
const text = fs.readFileSync(file, 'utf8');

const rows = [];
const problems = [];
text.split('\n').forEach((line, i) => {
  const raw = line.trim();
  if (!raw || raw.startsWith('#')) return;
  const parts = raw.split('>').map((p) => p.trim());
  if (parts.length !== 4 || parts.some((p) => !p)) {
    problems.push({ line: i + 1, text: raw.slice(0, 80) });
    return;
  }
  rows.push({ program: 'digital_marketing', track: parts[0], course: parts[1], lesson: parts[2], topic: parts[3] });
});

// Structure summary
const byTrack = {};
for (const r of rows) {
  byTrack[r.track] ??= new Set();
  byTrack[r.track].add(r.course);
}
console.log(`Parsed ${rows.length} topics, ${problems.length} problems`);
for (const [t, courses] of Object.entries(byTrack)) console.log(`  TRACK "${t}": ${courses.size} courses`);
const courses = new Set(rows.map((r) => `${r.track}|${r.course}`));
const lessons = new Set(rows.map((r) => `${r.track}|${r.course}|${r.lesson}`));
console.log(`  totals: ${Object.keys(byTrack).length} tracks, ${courses.size} courses, ${lessons.size} lessons, ${rows.length} topics`);
if (problems.length) { console.log('PROBLEMS:'); problems.forEach((p) => console.log(`  L${p.line}: ${p.text}`)); }

if (!commit) { console.log('\n(preview only — pass --commit to write)'); process.exit(problems.length ? 1 : 0); }
if (problems.length) { console.log('Refusing to commit with problems.'); process.exit(1); }

const report = await upsertTopics(rows);
console.log('WROTE:', JSON.stringify(report));
process.exit(0);
