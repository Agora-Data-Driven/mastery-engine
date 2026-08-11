/**
 * Off-cloud test for the request-scoped usage/cost tally (no Firestore, no network).
 *
 * Run: node lib/_usage_test.js
 */
const {
  newUsage,
  runWithUsage,
  recordUsage,
  estimateTtsUsage,
} = await import('./usage.js');

const fails = [];
const check = (label, cond) => {
  console.log((cond ? '  [OK] ' : '  [FAIL] ') + label);
  if (!cond) fails.push(label);
};
const approx = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

console.log('\n-- TTS pricing estimates --');
{
  const chirp = estimateTtsUsage('chirp3-hd', 1000);
  check('Chirp 3 HD bills characters at $30/M', chirp.ttsChars === 1000 && approx(chirp.costUsd, 0.03));
  check('Chirp has no fake token counts', chirp.ttsInputTokens === 0 && chirp.ttsAudioTokens === 0);

  const gemini = estimateTtsUsage('gemini-2.5-flash-tts', 250);
  check('Gemini Flash TTS estimates input text tokens', gemini.ttsInputTokens === 63);
  check('Gemini Flash TTS estimates audio tokens at 25/sec', gemini.ttsAudioTokens === 375);
  check('Gemini Flash TTS prices input + audio tokens',
    approx(gemini.costUsd, (63 / 1e6) * 0.50 + (375 / 1e6) * 10));

  const unknown = estimateTtsUsage('future-voice', 123);
  check('unknown TTS engines still count characters but cost $0 until priced',
    unknown.ttsChars === 123 && unknown.costUsd === 0);
}

console.log('\n-- request-scoped tally --');
const usage = newUsage();
await runWithUsage(usage, async () => {
  recordUsage({ provider: 'gemini', model: 'gemini-2.5-flash', inputTokens: 1000, outputTokens: 2000 });
  recordUsage({ provider: 'tts', model: 'chirp3-hd', chars: 1000 });
  recordUsage({ provider: 'tts', model: 'gemini-2.5-flash-tts', chars: 250 });
});

check('text token totals stay text-only', usage.inputTokens === 1000 && usage.outputTokens === 2000);
check('voice totals accumulate separately',
  usage.ttsChars === 1250 && usage.ttsInputTokens === 63 && usage.ttsAudioTokens === 375);
check('all successful provider calls count once', usage.calls === 3);
check('total cost includes text + both TTS calls',
  approx(usage.costUsd, 0.0053 + 0.03 + ((63 / 1e6) * 0.50 + (375 / 1e6) * 10)));
check('Chirp row is labelled and marked as TTS',
  usage.byModel['chirp3-hd'].label === 'Chirp 3 HD' && usage.byModel['chirp3-hd'].kind === 'tts');
check('Gemini TTS row carries estimated audio-token usage',
  usage.byModel['gemini-2.5-flash-tts'].ttsAudioTokens === 375);
check('text model row still carries token usage',
  usage.byModel['gemini-2.5-flash'].inputTokens === 1000 &&
  usage.byModel['gemini-2.5-flash'].outputTokens === 2000);

console.log('\n-- no active request --');
check('recordUsage outside runWithUsage is a no-op that does not throw', (() => {
  try {
    recordUsage({ provider: 'tts', model: 'chirp3-hd', chars: 10 });
    return true;
  } catch {
    return false;
  }
})());

if (fails.length) {
  console.log(`\n[usage-test] FAIL (${fails.length}): ${fails.join(', ')}`);
  process.exit(1);
}
console.log('\n[usage-test] PASS');
