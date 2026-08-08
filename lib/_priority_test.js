/**
 * Off-cloud test for the two scoring formulas (no Firestore, no network).
 *
 * The priority half is regression cover. The MASTERY half is the point: that score exists
 * only because of three behavioural properties, and every one of them is a property of the
 * constants, not of the code shape. Retune the priors, the depth half-life or the weights
 * and this file tells you whether the retune still means what the score claims to mean.
 *
 * Run:  node lib/_priority_test.js   (exit 0 = pass)
 */
const {
  computePriority,
  computeMastery,
  retentionFactor,
  deriveStats,
  accuracyFraction,
  daysSince,
} = await import('./priority.js');

const fails = [];
const check = (label, cond) => {
  console.log((cond ? '  [OK] ' : '  [FAIL] ') + label);
  if (!cond) fails.push(label);
};

const NOW = new Date('2026-08-08T12:00:00Z');
const ago = (days) => new Date(NOW.getTime() - days * 86400000);
/** Mastery for `a` attempts of which `c` correct, practised today. */
const m = (a, c) => computeMastery({ totalAttempts: a, correctCount: c, lastAttempted: ago(0) }, NOW);

console.log('\n-- helpers --');
check('accuracyFraction(0,0) = 0 (unknown reads weak)', accuracyFraction(0, 0) === 0);
check('accuracyFraction clamps above 1', accuracyFraction(9, 5) === 1);
check('daysSince(null) saturates at the recency cap', daysSince(null, NOW) === 30);

console.log('\n-- priority (unchanged behaviour) --');
check('never attempted is maximally urgent (100)',
  computePriority({ correctCount: 0, totalAttempts: 0, lastAttempted: null }, NOW) === 100);
check('perfect + fresh + confident is least urgent',
  computePriority({ correctCount: 20, totalAttempts: 20, lastAttempted: ago(0) }, NOW) === 0);
check('lower accuracy raises priority',
  computePriority({ correctCount: 5, totalAttempts: 10, lastAttempted: ago(0) }, NOW) >
  computePriority({ correctCount: 9, totalAttempts: 10, lastAttempted: ago(0) }, NOW));

console.log('\n-- mastery: the three load-bearing properties --');

// 1. Volume beats protecting a perfect score, THROUGHOUT THE BAND A REAL SHELF LIVES IN.
//    It crosses over around 20 attempts (see the note in priority.js) — asserting it
//    unconditionally would be asserting something we do not actually want to be true.
for (const a of [1, 2, 3, 5, 8, 10, 15]) {
  check(`${2 * a} questions at 90% outscores ${a} at 100%`, m(2 * a, Math.round(2 * a * 0.9)) > m(a, a));
}
check('and the crossover is above 15, not below it', m(40, 36) < m(20, 20));
check('one perfect answer is worth far less than five', m(5, 5) > m(1, 1) + 20);

// 2. More questions always pay in EXPECTATION, at any skill level. If this ever goes
//    negative there is an attempt count at which hiding from the quiz maximises the score.
//    Strictly positive per question out to 40 attempts — the range any learner is in, and
//    the range a regression would show up in. Past that the score is effectively flat (a
//    200-attempt topic sits at ~93 whatever you do) and the true gain is finer than the
//    score's own 0.1 rounding step, so all that is assertable out there is that it never
//    slides by more than one step. A real inversion — capping the depth term, say — costs
//    ~0.7 over a session and is caught comfortably by that bound.
const ROUNDING_STEP = 0.1;
for (const skill of [0.95, 0.9, 0.8, 0.7, 0.5]) {
  // Expected score after `k` more questions at this skill, from `a` attempts / `c` correct.
  const after = (a, c, k) => {
    let ev = 0;
    for (let hits = 0; hits <= k; hits++) {
      let p = Math.pow(skill, hits) * Math.pow(1 - skill, k - hits);
      for (let i = 0; i < hits; i++) p *= (k - i) / (i + 1); // C(k, hits)
      ev += p * m(a + k, c + hits);
    }
    return ev;
  };
  let perQuestion = Infinity, perSession = Infinity;
  for (let a = 1; a <= 200; a++) {
    const c = Math.round(a * skill);
    perSession = Math.min(perSession, after(a, c, 5) - m(a, c));
    if (a <= 40) perQuestion = Math.min(perQuestion, after(a, c, 1) - m(a, c));
  }
  check(`skill ${skill}: one more question gains (min ${perQuestion.toFixed(3)} out to 40 attempts)`, perQuestion > 0);
  check(`skill ${skill}: a 5-question session never really costs, out to 200 attempts (min ${perSession.toFixed(3)})`,
    perSession > -ROUNDING_STEP);
}

// 3. Asymptotic — mastery is never "done".
check('1000 perfect answers still fall short of 100', m(1000, 1000) < 100);
check('never attempted scores 0', m(0, 0) === 0);
check('monotonic in correct answers at fixed volume', m(10, 9) > m(10, 8));
check('monotonic in volume at fixed accuracy', m(20, 20) > m(10, 10));

console.log('\n-- mastery: shape --');
check('one lucky answer reads ~40, not 100', m(1, 1) > 35 && m(1, 1) < 45);
check('a worked-through topic (8 at 100%) reads 70-80', m(8, 8) >= 70 && m(8, 8) <= 80);
check('correct > attempts is clamped, not >100%',
  computeMastery({ totalAttempts: 3, correctCount: 99, lastAttempted: ago(0) }, NOW) === m(3, 3));

console.log('\n-- mastery: retention --');
check('fresh keeps full credit', retentionFactor(0) === 1);
check('decay eases to the floor at 120 days', Math.abs(retentionFactor(120) - 0.65) < 1e-9);
check('and holds there — never toward zero', retentionFactor(3650) === retentionFactor(120));
const drilled = { totalAttempts: 20, correctCount: 18 };
check('a stale topic outranks an untouched one',
  computeMastery({ ...drilled, lastAttempted: ago(400) }, NOW) > m(1, 1));
check('a stale topic ranks below its own fresh self',
  computeMastery({ ...drilled, lastAttempted: ago(400) }, NOW) < m(20, 18));
check('attempted but no date lands mid-decay, not at either extreme', (() => {
  const undated = computeMastery({ ...drilled, lastAttempted: null }, NOW);
  return undated < m(20, 18) && undated > computeMastery({ ...drilled, lastAttempted: ago(400) }, NOW);
})());

console.log('\n-- deriveStats carries it --');
const d = deriveStats({ correctCount: 8, totalAttempts: 10, lastAttempted: ago(2) }, NOW);
check('accuracy is still the RAW ratio, not the smoothed one', d.accuracy === 80);
check('mastery is present and below raw accuracy', d.mastery > 0 && d.mastery < d.accuracy);

console.log(fails.length ? `\nFAILED (${fails.length}):\n - ${fails.join('\n - ')}` : '\nPASS');
process.exit(fails.length ? 1 : 0);
