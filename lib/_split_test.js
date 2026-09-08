/**
 * cutAtAnchors — where one oversized source gets sliced into lessons.
 *
 * This is the one place in the app that CUTS the learner's own source material,
 * and every way it can go wrong is silent: text lost, text duplicated into two
 * lessons, or a section attributed to the wrong one. Nothing downstream would
 * complain — the questions would just quietly be about the wrong thing.
 *
 * Run: node lib/_split_test.js
 */
import { cutAtAnchors } from './gemini.js';

let failed = 0;
const ok = (cond, msg) => {
  console.log(`  ${cond ? '[OK]' : '[FAIL]'} ${msg}`);
  if (!cond) failed += 1;
};
const flat = (s) => s.replace(/\s+/g, ' ').trim();

// A transcript shaped like a concatenated module: sponsor intro, then three
// lessons that begin with the phrasing a real lecture actually uses. Padded so
// each section clears the 200-char minimum the cutter enforces.
const pad = (s) => `${s} ${'This is explanatory filler that carries the section past the minimum length the cutter requires before it will treat a slice as a real section of its own. '.repeat(2)}`;
const body = [
  pad('Welcome back everyone. Before we start, a quick word from our sponsor.'),
  '',
  pad('In this lesson we will cover gradient descent and how the learning rate\ncontrols convergence. The update rule steps against the gradient.'),
  '',
  pad('In this video we turn to regularization. L2 shrinks weights toward zero\nand trades a little bias for a lot of variance reduction.'),
  '',
  pad('Finally, lets talk about cross validation and why k-fold beats a single split.'),
].join('\n');

console.log('cutAtAnchors');

// 1. Whitespace tolerance — the anchors below differ from the body in line
//    wrapping and double spaces, exactly as a model's "verbatim" quote does.
const cuts = cutAtAnchors(body, [
  { title: 'Gradient descent', anchor: 'In this lesson we will cover gradient descent and how' },
  { title: 'Regularization', anchor: 'In this video we turn to regularization.  L2 shrinks weights' },
  { title: 'Cross validation', anchor: 'Finally, lets talk about cross validation' },
], 'Module 3');
ok(cuts.length === 4, `3 boundaries + opening = 4 sections (got ${cuts.length})`);
ok(cuts[0].title.includes('opening'), 'text before the first cut becomes an opening section');
ok(cuts.some((s) => s.text.startsWith('In this lesson we will cover gradient')), 'a section starts exactly at its anchor');
ok(cuts.some((s) => s.text.startsWith('In this video we turn to regularization')), 'and so does the next one');

// 2. Conservation — nothing invented, nothing lost, nothing duplicated.
const joined = flat(cuts.map((s) => s.text).join(' '));
ok(joined.length <= flat(body).length, 'no text duplicated across sections');
for (const p of ['gradient descent', 'regularization', 'cross validation', 'quick word from our sponsor'])
  ok(joined.includes(p), `kept "${p}"`);

// 3. A hallucinated anchor is DROPPED, never approximated.
const withGhost = cutAtAnchors(body, [
  { title: 'Real', anchor: 'In this video we turn to regularization' },
  { title: 'Invented', anchor: 'Now we will discuss quantum entanglement at length' },
], 'M');
ok(withGhost.filter((s) => !s.title.includes('opening')).length === 1,
  `only the findable anchor cut (got ${withGhost.filter((s) => !s.title.includes('opening')).length})`);

// 4. Out-of-order proposals never rewind — otherwise a section is duplicated.
const reversed = cutAtAnchors(body, [
  { title: 'Later', anchor: 'Finally, lets talk about cross validation' },
  { title: 'Earlier', anchor: 'In this lesson we will cover gradient descent' },
], 'M');
const bodies = reversed.filter((s) => !s.title.includes('opening'));
ok(bodies.length === 1, 'a backwards anchor is refused, not applied');

// 5. A repeated phrase resolves forward, so two sections never share a start.
const repeated = 'Intro. '.repeat(40) + 'Now the topic begins here with detail. ' + 'Middle. '.repeat(40) + 'Now the topic begins here with detail. ' + 'End. '.repeat(40);
const twice = cutAtAnchors(repeated, [
  { title: 'First', anchor: 'Now the topic begins here with detail' },
  { title: 'Second', anchor: 'Now the topic begins here with detail' },
], 'R');
// Both sections legitimately BEGIN with the same words — that is the point of the
// case. What must differ is where they were cut, so check the bodies, not prefixes.
const rep = twice.filter((s) => !s.title.includes('opening'));
ok(rep.length === 2, `a repeated anchor produced two sections (got ${rep.length})`);
ok(rep.length === 2 && rep[0].text !== rep[1].text, 'the two sections are different slices, not the same one twice');
ok(rep.length === 2 && !rep[1].text.includes(flat(rep[0].text).slice(0, 60)), 'the later section is not nested inside the earlier one');

// 6. Degenerate inputs leave the source alone rather than destroying it.
ok(cutAtAnchors(body, [], 'Whole')[0].text === body, 'no anchors -> one section, text untouched');
ok(cutAtAnchors(body, null, 'Whole').length === 1, 'null candidates -> one section');
ok(cutAtAnchors(body, [{ title: 'x', anchor: 'too short' }], 'W').length === 1, 'an anchor under 12 chars is ignored as unsafe');
ok(cutAtAnchors(body, [{ title: '', anchor: 'In this lesson we will cover gradient descent' }], 'W').length === 1,
  'an untitled section is ignored');

console.log(failed ? `\nFAIL (${failed})` : '\nPASS');
process.exit(failed ? 1 : 0);
