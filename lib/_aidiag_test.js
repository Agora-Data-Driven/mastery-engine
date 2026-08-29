/**
 * Off-cloud test for the AI-failure diagnostics (no Firestore, no network, no model).
 *
 * These are the two halves of "the model returned non-JSON content" no longer
 * being a dead end:
 *
 *  - `salvageJsonString` recovers the answer from a payload JSON.parse cannot
 *    read. It exists for the exact two malformations the repair pass in
 *    parseLooseJson cannot fix — a tail cut off at the token ceiling, and an
 *    unescaped " inside the value — so those are what it is tested on. If it
 *    silently returned '' the learner would be back to an error page.
 *  - `describeJsonFailure` has to NAME the cause. Its whole value is that a
 *    truncation is reported as a truncation rather than as "malformed": a
 *    finishReason the provider actually told us must beat any guess from the
 *    text, which is the ordering asserted here.
 *
 * Run:  node lib/_aidiag_test.js   (exit 0 = pass)
 */
import { describeJsonFailure, salvageJsonString } from './gemini.js';

const fails = [];
const check = (label, cond) => {
  console.log((cond ? '  [OK] ' : '  [FAIL] ') + label);
  if (!cond) fails.push(label);
};

/** Whatever JSON.parse throws for this payload — the real error, not a stand-in. */
function parseError(s) {
  try { JSON.parse(s); return null; } catch (e) { return e; }
}

console.log('\n-- salvageJsonString: a payload cut off at the token ceiling --');
{
  // No closing quote, no closing brace: the model was still writing.
  const raw = '{"reply": "Here is your quiz. Question 1: what does $\\\\alpha$ control in gradi';
  const out = salvageJsonString(raw, 'reply');
  check('recovers the prose written so far', out.startsWith('Here is your quiz.'));
  check('keeps the LaTeX backslash intact', out.includes('$\\alpha$'));
  check('is not empty (an error page is the alternative)', out.length > 20);
}

console.log('\n-- salvageJsonString: an unescaped " inside the value --');
{
  // The one malformation the repair pass genuinely cannot fix: where the string
  // ends is ambiguous, so the greedy read (last plausible end) is the right one.
  const raw = '{"reply": "They call this "overfitting", and it is the core idea.", "visual": null}';
  const out = salvageJsonString(raw, 'reply');
  check('takes the LAST plausible end, not the first', out.endsWith('the core idea.'));
  check('keeps the inner quotes', out.includes('"overfitting"'));
}

console.log('\n-- salvageJsonString: escapes and misses --');
{
  const out = salvageJsonString('{"reply": "line one\\nline two\\ttabbed \\u00e9"}', 'reply');
  check('unescapes \\n, \\t and \\uXXXX', out === 'line one\nline two\ttabbed é');
  check('a missing key yields nothing to show', salvageJsonString('{"visual": null}', 'reply') === '');
  check('a non-string input yields nothing to show', salvageJsonString(null, 'reply') === '');
}

console.log('\n-- describeJsonFailure: the provider\'s own finishReason wins --');
{
  // Same payload, three verdicts. This is the ordering that matters: the text
  // alone cannot tell truncation from malformation, and guessing wrong is what
  // sent this bug round in circles.
  const raw = '{"reply": "half an answer';
  const err = parseError(raw);
  check('MAX_TOKENS ⇒ truncated', describeJsonFailure(raw, err, { finishReason: 'MAX_TOKENS' }).cause === 'truncated');
  check('length (OpenAI-shaped) ⇒ truncated', describeJsonFailure(raw, err, { finishReason: 'length' }).cause === 'truncated');
  check('SAFETY ⇒ blocked', describeJsonFailure(raw, err, { finishReason: 'SAFETY' }).cause === 'blocked');
  check('explains the ceiling in words, not a code', /ceiling|cut off/i.test(describeJsonFailure(raw, err, { finishReason: 'MAX_TOKENS' }).explain));
}

console.log('\n-- describeJsonFailure: reading the payload when nothing was reported --');
{
  const noJson = 'Sure! Here is the answer you asked for, in prose.';
  check('prose with no object ⇒ no-json', describeJsonFailure(noJson, parseError(noJson), {}).cause === 'no-json');
  check('empty payload ⇒ empty', describeJsonFailure('   ', parseError('   '), {}).cause === 'empty');

  const cut = '{"reply": "half an answer';
  check('unterminated with no finishReason ⇒ truncated', describeJsonFailure(cut, parseError(cut), {}).cause === 'truncated');

  const stray = '{"reply": "they call this "overfitting" here", "visual": null}';
  check('a bare inner quote ⇒ stray-quote', describeJsonFailure(stray, parseError(stray), {}).cause === 'stray-quote');

  const ctrl = '{"reply": "line one\nline two"}';
  check('a raw newline in a string ⇒ raw-control-char', describeJsonFailure(ctrl, parseError(ctrl), {}).cause === 'raw-control-char');
}

console.log('\n-- describeJsonFailure: the evidence it carries --');
{
  const raw = `{"reply": "${'x'.repeat(1500)}" "visual": null}`;
  const d = describeJsonFailure(raw, parseError(raw), { provider: 'gemini', model: 'gemini-2.5-flash' });
  check('reports the payload size', d.chars === raw.length);
  check('reports the engine that ran', d.provider === 'gemini' && d.model === 'gemini-2.5-flash');
  check('points at the offset the parser gave up on', d.position > 0);
  check('quotes the break with a marker', d.excerpt.includes('⟪break⟫'));
  check('samples the head', d.head.length > 0 && d.head.length <= 700);
  check('samples the tail once the payload is long', d.tail.length > 0);
  check('keeps the parser\'s own message', d.parserMessage.length > 0);
}

console.log(fails.length ? `\nFAIL (${fails.length})\n  - ${fails.join('\n  - ')}\n` : '\nPASS\n');
process.exit(fails.length ? 1 : 0);
