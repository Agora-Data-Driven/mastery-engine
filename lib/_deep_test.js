/**
 * Deep mode's prompt block — the safety invariants, not the wording.
 *
 * Deep mode is the one grounding tier that puts the ANSWER KEY in the prompt, a few lines above an
 * on-screen question the learner may be halfway through answering. Everything asserted here is a
 * property that, if it silently regressed, would either spoil a live quiz or have the assistant
 * report a gap in what it was handed as an absence in the learner's work — the exact failure the
 * growth-journal and task-board blocks were rebuilt to prevent (AGENTS.md §7).
 *
 * Run: node lib/_deep_test.js
 */
import { deepBlock } from './gemini.js';

let failures = 0;
function check(name, cond) {
  if (cond) { console.log(`  ok   ${name}`); return; }
  failures += 1;
  console.log(`  FAIL ${name}`);
}

const FULL = {
  scopeLabel: 'Data Engineering › Table Formats › Compaction',
  topics: ['Compaction Safe Merge', 'Atomic Metadata Commit'],
  bankTotal: 41,
  questions: [
    {
      topic: 'Compaction Safe Merge',
      question: 'What keeps in-flight readers safe during a compaction merge?',
      options: ['Retention of the old files', 'An atomic metadata commit', 'A format-aware rewrite'],
      answer: 'An atomic metadata commit',
    },
  ],
  progress: [
    { topic: 'Compaction Safe Merge', lesson: 'Compaction', attempts: 12, correct: 7, accuracy: 58, mastery: 44.1, priority: 61, daysSince: 3, questions: 9 },
    { topic: 'Atomic Metadata Commit', lesson: 'Compaction', attempts: 0, correct: 0, accuracy: null, mastery: 0, priority: 88, daysSince: null, questions: 6 },
  ],
  guide: '# Compaction\nCompaction rewrites many small files into fewer large ones.',
  gaps: [],
};

console.log('deepBlock: off by default');
check('no hits at all renders NOTHING (the ordinary prompt is byte-identical)', deepBlock(null) === '');

console.log('deepBlock: the answer key and the on-screen rule travel together');
const full = deepBlock(FULL);
check('the key is present (the learner armed this to be quizzed)', full.includes('KEY: An atomic metadata commit'));
check('the on-screen question is explicitly ruled off-limits', /OFF-LIMITS/.test(full));
check('and that rule is stated to OVERRIDE the bank', /OVERRIDES everything above/.test(full));
// The rule is only load-bearing if it sits AFTER the key it has to override — a model reading top
// to bottom must meet the exception after the permission, never before it.
check('the rule comes after the key it overrides', full.indexOf('OFF-LIMITS') > full.indexOf('KEY:'));

console.log('deepBlock: real numbers, not adjectives');
check('accuracy, mastery and priority are all printed', /58% over 12 attempt\(s\)/.test(full) && /mastery 44\.1/.test(full) && /priority 61/.test(full));
check('a never-attempted topic reads as a blind spot, not a weakness', /NEVER ATTEMPTED/.test(full));
check('mastery is explained as the depth score, not re-derived', /never reaches 100/.test(full));
check('the guide ships whole, inside explicit delimiters', full.includes('--- begin guide ---') && full.includes('--- end guide ---'));
check('the bank states how much of it was loaded', full.includes('1 of the 41 questions'));

console.log('deepBlock: gaps are declared, never swallowed');
const gappy = deepBlock({ ...FULL, guide: null, gaps: ['they have not generated a written study guide for this section yet'] });
check('a named gap is printed verbatim', gappy.includes('they have not generated a written study guide'));
check('and is labelled a gap in what was HANDED OVER, not an absence', /NOT[\s\S]{0,40}absences in their work/.test(gappy));
check('no guide loaded => no guide delimiters (never an empty stub)', !gappy.includes('--- begin guide ---'));

console.log('deepBlock: armed but empty still tells the truth');
const empty = deepBlock({ gaps: ['nothing on screen names a section'] });
check('it says deep mode is on but nothing loaded', /DEEP MODE IS ON but nothing could be loaded/.test(empty));
check('it forbids pretending to have the data', /Do NOT pretend to have their questions, scores or notes/.test(empty));
check('it names the gap so the learner can fix it', empty.includes('nothing on screen names a section'));

console.log('deepBlock: partial payloads never crash');
check('progress only', typeof deepBlock({ scopeLabel: 'X', progress: FULL.progress, gaps: [] }) === 'string');
check('questions only', deepBlock({ scopeLabel: 'X', questions: FULL.questions, bankTotal: 1, gaps: [] }).includes('KEY:'));
check('empty arrays render no empty sections', !deepBlock({ scopeLabel: 'X', questions: [], progress: [], gaps: [] }).includes('KEY:'));

console.log(failures ? `\n[deep-test] ${failures} FAILURE(S)` : '\n[deep-test] PASS');
process.exit(failures ? 1 : 0);
