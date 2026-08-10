/**
 * Off-cloud test for the visual-guide parsers (no Firestore, no network, no model).
 *
 * These two functions are the entire safety net between a model's answer and a
 * cached artifact, and both failure modes they guard are silent:
 *
 *  - `parseVisualGuide` has to survive the ways a model deviates from the fence
 *    contract (a ```html wrapper, a sentence of preamble, a missing index) —
 *    otherwise a page that was actually fine is thrown away.
 *  - `visualGuideLooksComplete` has to reject a page that ran out of tokens.
 *    A truncated page LOOKS like a working one until you reach the tab that is
 *    not there, and caching it makes that permanent.
 *
 * Run:  node lib/_visual_test.js   (exit 0 = pass)
 */
const { parseVisualGuide, visualGuideLooksComplete } = await import('./gemini.js');

const fails = [];
const check = (label, cond) => {
  console.log((cond ? '  [OK] ' : '  [FAIL] ') + label);
  if (!cond) fails.push(label);
};

const INDEX = ['Title: Gradient Descent: Visual Guide',
  '1. The Rolling Ball | a ball on a curved surface | steps shrink as the slope flattens',
  '2. Step Size Dial | a slider over the learning rate | too big overshoots, too small crawls'].join('\n');

const PAGE = `<!doctype html>
<html><head><style>.x{color:red}</style></head><body>
<nav class="viz-tabs"><button class="viz-tab" data-viz-tab="1">1. The Rolling Ball</button></nav>
<section class="viz-panel" data-viz-panel="1"><h2>1. The Rolling Ball</h2>${'.'.repeat(900)}</section>
</body></html>`;

console.log('\n-- parseVisualGuide: the happy path --');
{
  const { outline, html } = parseVisualGuide(`===VISUAL-INDEX===\n${INDEX}\n\n===VISUAL-HTML===\n${PAGE}\n`);
  check('the index comes back without its fence', outline.startsWith('Title: Gradient Descent'));
  check('the index keeps every visual line', /2\. Step Size Dial/.test(outline));
  check('the page starts at the doctype', html.startsWith('<!doctype html>'));
  check('the page is not truncated by the split', html.trim().endsWith('</html>'));
}

console.log('\n-- parseVisualGuide: the ways a model deviates --');
{
  // Some models wrap the document in a markdown fence out of habit.
  const { html } = parseVisualGuide(`===VISUAL-HTML===\n\`\`\`html\n${PAGE}\n\`\`\``);
  check('a ```html wrapper is unwrapped, not kept', html.startsWith('<!doctype html>'));
  check('the closing fence is not left on the end', !html.includes('```'));
}
{
  // ...or say something first. Anything before the first tag would otherwise be
  // served as the opening bytes of a text/html body.
  const { html } = parseVisualGuide(`===VISUAL-HTML===\nHere is your guide!\n${PAGE}`);
  check('prose before the document is dropped', html.startsWith('<!doctype html>'));
}
{
  // No index fence at all: the page still has to survive, because the outline is
  // only the assistant's grounding — losing it must not lose the artifact.
  const { outline, html } = parseVisualGuide(`===VISUAL-HTML===\n${PAGE}`);
  check('a missing index fence still yields the page', html.startsWith('<!doctype html>'));
  check('a missing index yields an empty outline, not junk', outline === '');
}
{
  // No fences whatsoever — treat the whole answer as the page.
  const { html } = parseVisualGuide(PAGE);
  check('an unfenced answer is treated as the page', html.startsWith('<!doctype html>'));
}
{
  // ...and just as many sign off AFTER the document. That trailing sentence used
  // to survive into the cached page and then fail visualGuideLooksComplete's
  // end-anchor, throwing away a page that was actually complete.
  const { html } = parseVisualGuide(`===VISUAL-HTML===\n${PAGE}\n\nLet me know if you'd like more visuals!`);
  check('prose AFTER the document is dropped', html.trim().endsWith('</html>'));
  check('and the result still reads as complete', visualGuideLooksComplete(html) === true);
}
{
  const { outline, html } = parseVisualGuide('');
  check('empty input does not throw', outline === '' && html === '');
}

console.log('\n-- visualGuideLooksComplete --');
check('a whole page passes', visualGuideLooksComplete(PAGE) === true);
check('trailing whitespace does not fail it', visualGuideLooksComplete(PAGE + '\n\n  ') === true);
check('a page cut off mid-document is rejected',
  visualGuideLooksComplete(PAGE.slice(0, PAGE.length - 40)) === false);
check('a stub with the right tags is still rejected (too short)',
  visualGuideLooksComplete('<html><body>hi</body></html>') === false);
check('prose that never opened a document is rejected',
  visualGuideLooksComplete('I could not build that. '.repeat(60)) === false);
check('empty is rejected', visualGuideLooksComplete('') === false);
check('null is rejected, not thrown on', visualGuideLooksComplete(null) === false);
// A page whose model built its OWN tab widget is still a working page — refusing
// it would send the learner round a regeneration loop for nothing.
check('a page without the data-viz-panel hooks still passes',
  visualGuideLooksComplete(PAGE.replace(/data-viz-(tab|panel)="1"/g, '')) === true);

if (fails.length) {
  console.log(`\n[visual-test] FAIL (${fails.length}): ${fails.join(', ')}`);
  process.exit(1);
}
console.log('\n[visual-test] PASS');
