/**
 * Does the question bank leak its answers through OPTION LENGTH?
 *
 * The first 1,710-question batch scored 72.9% "correct answer is the single
 * longest option" against a 25% chance baseline — so a learner could score ~73%
 * by always picking the longest option, without reading the question. The bank
 * was measuring reading speed, not mastery.
 *
 * This is the gate that keeps that from coming back. It reads the ON-DISK source
 * (content-build/content/<CODE>/<NN>/questions.json), because that is where the
 * bias originates — fixing Firestore alone lets it return on the next publish.
 *
 * Usage:
 *   node content-build/check-questions.js                 # whole corpus
 *   node content-build/check-questions.js --course=DE202
 *   node content-build/check-questions.js --course=DE202 --list   # name every offender
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(HERE, 'content');
const only = (process.argv.find((a) => a.startsWith('--course=')) || '').split('=')[1] || null;
const LIST = process.argv.includes('--list');

// Chance is 25% for 4 options. Allow headroom for natural variation, but a bank
// above this is exploitable without reading the question.
const MAX_LONGEST_PCT = 35;
// Per question: no option may sit outside this band around the mean length.
const SPREAD = 0.25;

const rows = [];
for (const code of fs.readdirSync(CONTENT)) {
  if (only && code !== only) continue;
  const courseDir = path.join(CONTENT, code);
  if (!fs.statSync(courseDir).isDirectory()) continue;
  for (const nn of fs.readdirSync(courseDir)) {
    const p = path.join(courseDir, nn, 'questions.json');
    if (!fs.existsSync(p)) continue;
    let parsed;
    try { parsed = JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch (e) { console.log(`  [FAIL] ${code}/${nn}/questions.json does not parse — ${e.message}`); process.exitCode = 1; continue; }
    for (const q of parsed.questions || []) rows.push({ code, nn, q });
  }
}
if (!rows.length) { console.log('No questions found.'); process.exit(1); }

const byCourse = {};
const byLesson = {};
const offenders = [];
let malformed = 0;

for (const { code, nn, q } of rows) {
  const opts = Array.isArray(q.options) ? q.options : [];
  const ai = Number(q.answerIndex);
  // The invariant the whole app rests on (AGENTS §3): a bad index marks every
  // attempt wrong, silently, for everyone.
  if (opts.length !== 4 || !Number.isInteger(ai) || ai < 0 || ai > 3) { malformed++; continue; }

  const lens = opts.map((o) => String(o).length);
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const mx = Math.max(...lens), mn = Math.min(...lens);
  const isLongest = lens[ai] === mx && lens.filter((l) => l === mx).length === 1;
  const isShortest = lens[ai] === mn && lens.filter((l) => l === mn).length === 1;
  const outOfBand = lens.filter((l) => Math.abs(l - mean) > mean * SPREAD).length;

  const bump = (bucket) => {
    bucket.n++; bucket.idx[ai]++;
    if (isLongest) bucket.longest++;
    if (isShortest) bucket.shortest++;
    if (outOfBand) bucket.spread++;
  };
  const blank = () => ({ n: 0, longest: 0, shortest: 0, spread: 0, idx: [0, 0, 0, 0] });
  bump(byCourse[code] = byCourse[code] || blank());
  // Per-lesson too: the bias is rarely uniform across a course, and rewriting a
  // lesson that was already fine is wasted work that risks breaking good questions.
  if (only) bump(byLesson[`${code}/${nn}`] = byLesson[`${code}/${nn}`] || blank());

  if (isLongest) offenders.push({ code, nn, topic: q.topic, question: q.question, lens, ai, opts, ratio: lens[ai] / mean });
}

console.log('course     n     longest%   shortest%  uneven%   answerIndex spread');
let TN = 0, TL = 0;
for (const [code, c] of Object.entries(byCourse).sort()) {
  TN += c.n; TL += c.longest;
  const pct = 100 * c.longest / c.n;
  console.log(`${code.padEnd(9)} ${String(c.n).padStart(4)}  ${pct.toFixed(0).padStart(7)}%${pct > MAX_LONGEST_PCT ? ' ✕' : ' ✓'}`
    + `  ${(100 * c.shortest / c.n).toFixed(0).padStart(7)}%`
    + `  ${(100 * c.spread / c.n).toFixed(0).padStart(6)}%`
    + `   ${c.idx.join('/')}`);
}
if (only && Object.keys(byLesson).length > 1) {
  console.log('\nper lesson:');
  for (const [k, c] of Object.entries(byLesson).sort()) {
    const pct = 100 * c.longest / c.n;
    console.log(`  ${k.padEnd(12)} ${String(c.n).padStart(3)}  ${pct.toFixed(0).padStart(4)}% longest`
      + `  ${(100 * c.spread / c.n).toFixed(0).padStart(4)}% uneven  ${pct > MAX_LONGEST_PCT ? '✕ rewrite' : '✓ ok'}`);
  }
}
const overall = 100 * TL / TN;
console.log('\n' + '='.repeat(64));
console.log(`OVERALL ${TL}/${TN} = ${overall.toFixed(1)}% longest-is-correct  (chance 25%, gate ${MAX_LONGEST_PCT}%)`);
if (malformed) console.log(`malformed (not 4 options / bad answerIndex): ${malformed}`);

if (LIST) {
  console.log(`\nEvery question whose correct answer is the longest option (${offenders.length}), worst first:`);
  for (const o of offenders.sort((a, b) => b.ratio - a.ratio)) {
    console.log(`\n  ${o.code}/${o.nn}  [${o.topic}]  ×${o.ratio.toFixed(2)} vs mean`);
    console.log(`  Q: ${o.question}`);
    o.opts.forEach((t, i) => console.log(`     ${i === o.ai ? '✓' : ' '} (${String(String(t).length).padStart(3)}) ${t}`));
  }
}

if (overall > MAX_LONGEST_PCT || malformed) {
  console.log(`\nFAIL — the bank is exploitable by option length. Rewrite the distractors (INSTRUCTIONS.md §2).`);
  process.exit(1);
}
console.log('\nPASS — option length does not leak the answer.');
