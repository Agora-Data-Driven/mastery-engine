/**
 * Off-cloud test for the sub-lesson NAMING rule (no Firestore, no network).
 *
 * A sub-lesson's name is the front of its recall card, so the two kinds of
 * curriculum need opposite names and every planner has to ask for the right one.
 * These guard the 2026-09-08 fix, after the Philosophy program shipped 28
 * label-only key points ("Myth of innate talent") whose cards taught nothing on
 * their own. See AGENTS.md §7 and `topicNameRule` in lib/gemini.js.
 *
 * Run:  node lib/_naming_test.js   (exit 0 = pass)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const { topicNameRule } = await import('./gemini.js');

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`  ok  ${label}`);
  else { console.error(`  FAIL ${label}`); failures += 1; }
};

console.log('topicNameRule');
const career = topicNameRule(false);
const reading = topicNameRule(true);

// The career rule is the one every technical program has always had. A claim-shaped
// name would assert ONE thing about a topic that has many, so it must not leak in.
ok(/short noun phrase/.test(career), 'career programs still ask for a short noun phrase');
ok(!/READING/.test(career), 'career rule says nothing about reading programs');
ok(topicNameRule() === career, 'omitting the flag keeps the career rule (every existing caller)');

// The reading rule has to do two things a softer instruction would not: forbid the
// label form outright, and cap the length, or the model returns a paragraph that
// no longer fits a card front.
ok(/CLAIM/.test(reading), 'reading rule asks for a claim');
ok(/14 words/.test(reading), 'reading rule caps the length');
ok(/Myth of innate talent/.test(reading), 'reading rule shows the label form it is rejecting');
ok(career !== reading, 'the two rules are actually different');

// Every planner that names a sub-lesson must interpolate the rule rather than
// hardcode one, or a program's names diverge by which door the content came in.
console.log('\nplanners interpolate the rule');
const HERE = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(HERE, 'gemini.js'), 'utf8');
for (const fn of ['classifyTranscript', 'digestSource', 'planFromSources', 'planCurriculum', 'planCurriculumEdit']) {
  const start = src.indexOf(`export async function ${fn}`);
  const body = src.slice(start, start + 12000);
  ok(start > -1 && /\{\s*reading\s*=\s*false\s*\}|reading = false/.test(body), `${fn} accepts a reading flag`);
  ok(body.includes('${topicNameRule(reading)}'), `${fn} interpolates topicNameRule`);
}

// The one hardcoded phrase this replaced must be gone from the prompts, or a
// planner would carry both rules and contradict itself for reading programs.
const prompts = src.slice(src.indexOf('const TOPIC_NAME_RULE_CONCEPT'));
const strays = prompts.split('named as a short noun phrase').length - 1;
ok(strays === 1, `only the shared constant says "named as a short noun phrase" (found ${strays})`);

console.log(failures ? `\n${failures} FAILED` : '\nAll naming tests passed.');
process.exit(failures ? 1 : 0);
