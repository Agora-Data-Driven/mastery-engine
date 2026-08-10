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
const {
  parseVisualGuide, visualGuideLooksComplete,
  splitVisualPanels, visualPanelIndex, canSwapVisualPanel, replaceVisualPanel,
  replaceOutlineLine, visualTabLabelFrom, parseVisualPanel,
} = await import('./gemini.js');

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

/* ------------------- Editing ONE visual, not the whole page ----------------
 * These five functions are what makes "rewrite visual 2" cheaper than rebuilding
 * the page, and every one of them fails silently if it is wrong: a mis-scanned
 * panel splices markup into the middle of another one, a missed shared-script
 * dependency ships a page whose later visuals are dead, and a truncated fragment
 * that slips through corrupts a page that was previously fine.
 */
const FILLER = 'x'.repeat(400);
// Panel 1 nests a <section> INSIDE itself on purpose: a lazy regex stops at that
// first </section> and takes half a panel with it.
const ISO_PAGE = `<!doctype html>
<html><head><style>body{margin:0}</style></head><body>
<nav class="viz-tabs">
<button class="viz-tab" data-viz-tab="1">1. The Rolling Ball</button>
<button class="viz-tab" data-viz-tab="2">2. Step Size Dial</button>
</nav>
<section class="viz-panel" data-viz-panel="1"><h2>1. The Rolling Ball</h2>
<section class="v1-inner"><p>${FILLER}</p></section>
<span id="v1-go"></span>
<script>document.getElementById('v1-go').textContent = 'go';</script>
</section>
<section class="viz-panel" data-viz-panel="2"><h2>2. Step Size Dial</h2>
<input id="v2-lr" type="range"><span id="v2-out"></span>
<script>document.getElementById('v2-lr').oninput = function(){};</script>
</section>
<script>document.querySelectorAll('.viz-panel').forEach(function(p){ p.dataset.seen = 1; });</script>
</body></html>`;
// The same page as older generations built it: ONE script at the bottom wiring
// every control. Pull panel 2's markup out and that script throws on the first
// missing element, taking whatever it wired after it down too.
const SHARED_PAGE = ISO_PAGE.replace(
  "document.querySelectorAll('.viz-panel').forEach(function(p){ p.dataset.seen = 1; });",
  "document.getElementById('v2-lr').oninput = function(){ document.getElementById('v2-out').textContent = 1; };",
);
const NEW_PANEL = `<section class="viz-panel" data-viz-panel="2"><h2>2. Step Dial</h2>
<input id="v2b-lr" type="range"><script>var a = 1;</script></section>`;

console.log('\n-- splitVisualPanels --');
{
  const panels = splitVisualPanels(ISO_PAGE);
  check('finds every panel', panels.length === 2);
  check('keeps them numbered as the page numbered them', panels.map((p) => p.key).join(',') === '1,2');
  check('a NESTED section does not end the panel early', panels[0].html.includes('v1-inner'));
  check('...and the panel still closes at its own tag', panels[0].html.trim().endsWith('</section>'));
  check('the second panel is whole', panels[1].html.includes('v2-out'));
  check('bounds are exact — the slice IS the panel', ISO_PAGE.slice(panels[1].start, panels[1].end) === panels[1].html);
}
check('a panel that never closes is not returned (that is truncation)',
  splitVisualPanels('<section class="viz-panel" data-viz-panel="1"><p>half a thing').length === 0);
check('a page with no panels yields none, and does not throw', splitVisualPanels('<html><body>hi</body></html>').length === 0);
check('null does not throw', splitVisualPanels(null).length === 0);

console.log('\n-- visualPanelIndex (the picker rows) --');
{
  const rows = visualPanelIndex(ISO_PAGE);
  check('one row per panel', rows.length === 2);
  check('named from the TAB, which is what is on screen', rows[0].name === '1. The Rolling Ball');
  check('and the second too', rows[1].name === '2. Step Size Dial');
}
check('a panel with no tab button still lists, unnamed',
  visualPanelIndex('<section data-viz-panel="7">a</section>')[0].name === '');

console.log('\n-- canSwapVisualPanel --');
check('a panel-isolated page can be edited one visual at a time', canSwapVisualPanel(ISO_PAGE, '2').ok === true);
check('a shared script that only touches .viz-panel is not a blocker', canSwapVisualPanel(ISO_PAGE, '1').ok === true);
check('a shared script driving THIS panel blocks it', canSwapVisualPanel(SHARED_PAGE, '2').ok === false);
check('...and says which element it is holding', /v2-lr/.test(canSwapVisualPanel(SHARED_PAGE, '2').reason));
check('...while the OTHER panel is still editable', canSwapVisualPanel(SHARED_PAGE, '1').ok === true);
check('a panel selected by number from outside blocks too',
  canSwapVisualPanel(ISO_PAGE.replace("document.querySelectorAll('.viz-panel')", 'document.querySelector(\'[data-viz-panel="2"]\')'), '2').ok === false);
check('a visual that is not in the page is refused, not crashed', canSwapVisualPanel(ISO_PAGE, '9').ok === false);

console.log('\n-- replaceVisualPanel --');
{
  const before = splitVisualPanels(ISO_PAGE);
  const out = replaceVisualPanel(ISO_PAGE, '2', NEW_PANEL, '2. Step Dial');
  check('the new panel is in', out.includes('v2b-lr'));
  check('the old one is gone', !out.includes('v2-lr'));
  // The point of the whole feature: an untouched visual is not re-rolled, it is
  // the same bytes it was before.
  check('the UNTOUCHED panel is byte-identical', out.includes(before[0].html));
  check('the tab is renamed with it', /data-viz-tab="2">2\. Step Dial</.test(out));
  check('the other tab is left alone', out.includes('>1. The Rolling Ball<'));
  check('the result is still a complete document', visualGuideLooksComplete(out) === true);
  check('still exactly two panels — no duplicate slot', splitVisualPanels(out).length === 2);
}
check('replacing a panel the page does not have returns null, never a mangled page',
  replaceVisualPanel(ISO_PAGE, '9', NEW_PANEL, 'x') === null);

console.log('\n-- replaceOutlineLine + visualTabLabelFrom --');
{
  const outline = ['Title: Gradient Descent: Visual Guide',
    '1. The Rolling Ball | a ball on a curve | steps shrink',
    '2. Step Size Dial | a slider | too big overshoots'].join('\n');
  const next = replaceOutlineLine(outline, '2', '2. Step Dial | a dial | overshoot vs crawl');
  check('the edited row is swapped', next.includes('2. Step Dial | a dial'));
  check('the untouched row survives', next.includes('1. The Rolling Ball | a ball on a curve'));
  check('the title survives', next.startsWith('Title: Gradient Descent'));
  check('a row for a number that was not there is appended, not dropped',
    replaceOutlineLine(outline, '3', '3. New Thing | a | b').trim().endsWith('3. New Thing | a | b'));
  check('an empty replacement leaves the index alone', replaceOutlineLine(outline, '2', '   ') === outline);
}
check('a numbered index line becomes the tab label', visualTabLabelFrom('2. Step Size Dial | a | b', '2') === '2. Step Size Dial');
check('an unnumbered one is numbered for us', visualTabLabelFrom('Step Size Dial | a | b', '2') === '2. Step Size Dial');
check('") " numbering is normalised to a dot', visualTabLabelFrom('2) Step Size Dial | a', '2') === '2. Step Size Dial');
check('an empty line yields no label (the tab keeps its old one)', visualTabLabelFrom('', '2') === '');

console.log('\n-- parseVisualPanel --');
{
  const p = parseVisualPanel(`===VISUAL-INDEX===\n2. Step Dial | a dial | overshoot\n\n===VISUAL-HTML===\n${NEW_PANEL}\n`, '2');
  check('the fragment comes back', p && p.html.includes('v2b-lr'));
  check('and its index line with it', p.line === '2. Step Dial | a dial | overshoot');
}
check('a ```html wrapper is unwrapped here too',
  (parseVisualPanel(`===VISUAL-HTML===\n\`\`\`html\n${NEW_PANEL}\n\`\`\``, '2') || {}).html?.startsWith('<section'));
check('a sign-off after the fragment does not break it',
  (parseVisualPanel(`===VISUAL-HTML===\n${NEW_PANEL}\n\nHope that helps!`, '2') || {}).html?.endsWith('</section>'));
{
  // A model that renumbered its own panel: spliced as-is the page would have two
  // visual 3s, and the tab for slot 2 would point at nothing.
  const p = parseVisualPanel(`===VISUAL-HTML===\n${NEW_PANEL.replace('data-viz-panel="2"', 'data-viz-panel="3"')}`, '2');
  check('a renumbered fragment is re-stamped with the number we asked for',
    p && p.html.includes('data-viz-panel="2"') && !p.html.includes('data-viz-panel="3"'));
}
{
  // No wrapper at all, but balanced: worth keeping, so we supply the wrapper.
  const bare = `<div class="thing"><p>${FILLER}</p></div>`;
  const p = parseVisualPanel(`===VISUAL-HTML===\n${bare}`, '2');
  check('a missing wrapper is supplied rather than the visual thrown away',
    p && /^<section class="viz-panel" data-viz-panel="2">/.test(p.html));
  check('...and the wrapped result is a findable panel', p && splitVisualPanels(p.html).length === 1);
}
check('a fragment cut off mid-document is rejected, not spliced in',
  parseVisualPanel(`===VISUAL-HTML===\n${NEW_PANEL.slice(0, NEW_PANEL.length - 30)}`, '2') === null);
check('an unterminated <script> is rejected even with a closing tag on the end',
  parseVisualPanel(`===VISUAL-HTML===\n<div><p>${FILLER}</p><script>var a = 1;</div>`, '2') === null);
check('prose with no markup is rejected', parseVisualPanel('===VISUAL-HTML===\nI could not do that.', '2') === null);
check('empty is rejected, not thrown on', parseVisualPanel('', '2') === null);

if (fails.length) {
  console.log(`\n[visual-test] FAIL (${fails.length}): ${fails.join(', ')}`);
  process.exit(1);
}
console.log('\n[visual-test] PASS');
