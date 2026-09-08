/**
 * One-off data repair: rewrite the Philosophy program's sub-lessons from bare
 * LABELS into the CLAIM each key point actually makes, then rebuild every book
 * deck's title card so its recall list shows the new names.
 *
 * WHY. In a reading program a lesson is a book and its sub-lessons are that
 * book's key points, and the point's NAME is the whole front of the recall card
 * (`buildBookDeck` in server.js). "Myth of innate talent" names a subject the
 * reader has to already know to decode; "Innate talent is a myth: the future
 * stars showed no early edge" teaches on its own. The generators now ask for
 * claim-shaped names for reading programs (`topicNameRule` in lib/gemini.js);
 * this fixes the 28 sub-lessons that shipped before that existed.
 *
 * Renaming is NOT a field write. A sub-lesson's name is also the key of its
 * banked questions, its deck cards and its topic-level study guide, so this goes
 * through `renameTopics`, which keeps the doc id (per-user stats and prereq
 * edges survive) and re-keys the rest. See lib/firestore.js.
 *
 * THE ONE AMBIGUITY. "Attention spotlight and zooming" was a sub-lesson of BOTH
 * Chatter and Shift, and a question doc carries only {topic, program} — so those
 * two books' ten questions are one indistinguishable pool by name. They split
 * cleanly by `batchTag` (one generation run per book), which is what
 * QUESTION_SPLIT below encodes; `renameTopics` refuses to guess without it.
 *
 * Run:
 *   node scripts/rename-philosophy-points.mjs            # dry run, writes nothing
 *   node scripts/rename-philosophy-points.mjs --apply    # writes
 *
 * Needs ADC for Firestore (`gcloud auth application-default login`). Idempotent:
 * a second run reports every row as "already named that" and changes nothing.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { db, COL, renameTopics, getCatalog, getFlashcards, flashcardScopeId } from '../lib/firestore.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROGRAM = 'philosophy';
const APPLY = process.argv.includes('--apply');

/** Sub-lessons of one program that share a name: which generation run follows which row. */
const QUESTION_SPLIT = {
  'emotional-intelligence-emotion-regulation-chatter-by-ethan-kross-attention-spotlight-and-zooming': 'gen-cseZNlv8hk3EGQn2JsK9',
  'emotional-intelligence-emotion-regulation-shift-by-ethan-kross-attention-spotlight-and-zooming': 'gen-bh04EhfkKLNutfhiEwyT',
};

const plan = JSON.parse(readFileSync(resolve(HERE, 'philosophy-points.json'), 'utf8')).renames;

/* ---------------------------- preflight ----------------------------------- */
const items = [];
const problems = [];
for (const r of plan) {
  const doc = await db.collection(COL.topics).doc(r.id).get();
  if (!doc.exists) { problems.push(`${r.id}: no such sub-lesson`); continue; }
  const cur = doc.data();
  if (cur.topic === r.to) { console.log(`  = already renamed: ${r.to}`); continue; }
  if (cur.topic !== r.from) { problems.push(`${r.id}: expected "${r.from}", found "${cur.topic}"`); continue; }

  const item = { id: r.id, topic: r.to };
  const tag = QUESTION_SPLIT[r.id];
  if (tag) {
    const snap = await db.collection(COL.questions).where('topic', '==', r.from).get();
    item.questionIds = snap.docs.filter((d) => d.data().batchTag === tag).map((d) => d.id);
    if (!item.questionIds.length) problems.push(`${r.id}: no questions carry batchTag ${tag}`);
  }
  items.push({ ...item, from: r.from, questions: item.questionIds ? item.questionIds.length : null });
}

if (problems.length) {
  console.error('\nPREFLIGHT FAILED — nothing written:');
  for (const p of problems) console.error('  ! ' + p);
  process.exit(1);
}

console.log(`\n${items.length} sub-lesson${items.length === 1 ? '' : 's'} to rename:\n`);
for (const it of items) {
  console.log(`  "${it.from}"`);
  console.log(`   -> "${it.topic}"${it.questions != null ? `   [${it.questions} questions matched by batchTag]` : ''}`);
}

if (!APPLY) {
  console.log('\nDry run — pass --apply to write.');
  process.exit(0);
}

/* ------------------------------ rename ------------------------------------ */
const res = await renameTopics(items.map(({ id, topic, questionIds }) => ({ id, topic, questionIds })));
console.log('\nrenameTopics:', JSON.stringify(res, null, 2));
if (res.ambiguous.length) console.warn('  ! questions left in place for:', res.ambiguous.join(', '));

/* ------------------- rebuild each book's title card ------------------------
 * The title card's back is the recall list — literally the point names — so it
 * still holds the OLD ones. Rebuild it deterministically from the deck's own
 * point cards, in deck order, exactly as `buildBookDeck` writes it. No AI: the
 * per-point backs are unchanged and still correct.
 */
const rows = (await getCatalog(null, { program: PROGRAM })).filter((r) => r.topic);
const lessons = [...new Map(rows.map((r) => [`${r.track}/${r.course}/${r.lesson}`, r])).values()];

let rebuilt = 0;
for (const l of lessons) {
  const scope = { level: 'lesson', track: l.track, course: l.course, lesson: l.lesson };
  const cards = await getFlashcards(scope);
  const title = cards.find((c) => c.kind === 'title');
  if (!title) continue;
  const points = cards.filter((c) => c.kind === 'point').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (!points.length) continue;

  const names = points.map((c) => c.topic);
  await db.collection(COL.flashcards).doc(title.id).set({
    intuition: `The ${names.length} key points:\n\n${names.map((p, i) => `${i + 1}. **${p}**`).join('\n')}`,
    formula: `${names.length} points — can you name and explain them all?`,
  }, { merge: true });
  rebuilt += 1;
  console.log(`\nRebuilt title card — ${l.lesson}`);
  for (const n of names) console.log(`   - ${n}`);
  if (flashcardScopeId(scope) !== title.scopeId) console.warn('   ! scopeId drift on the title card:', title.scopeId);
}

console.log(`\nDone. ${res.renamed} renamed, ${res.questions} questions re-keyed, ${res.cards} cards, ${res.guides} guides, ${rebuilt} title cards rebuilt.`);
