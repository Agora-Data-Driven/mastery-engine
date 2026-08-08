/**
 * Mastery / spaced-repetition scoring. TWO scores live here, and they answer
 * different questions — see `computeMastery` below for why both exist:
 *
 *   computePriority()  what should I study NEXT?     (drives quiz selection)
 *   computeMastery()   do I actually KNOW this?      (depth: evidence + freshness)
 *
 * In the original Google Sheet, `Accuracy`, `Days Since`, and `Master Priority`
 * were spreadsheet formulas (NOT in Code.gs), so the exact coefficients could
 * not be recovered from the repo. This is a faithful reconstruction that
 * captures the same three drivers observed in the data:
 *
 *   - lower accuracy           -> higher priority (you're weak here)
 *   - more days since attempt  -> higher priority (spaced repetition / decay)
 *   - fewer attempts           -> higher priority (low confidence in the stat)
 *
 * Priority is returned as a 0-100 number so it reads like the old percentage.
 */

const RECENCY_CAP_DAYS = 30; // days-since saturates here
const CONFIDENCE_CAP_ATTEMPTS = 10; // attempts needed for full confidence

// Weights sum to 1.0
const W_ACCURACY = 0.5;
const W_RECENCY = 0.3;
const W_CONFIDENCE = 0.2;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Whole days between `lastAttempted` (Date|null) and now. Null => very stale. */
export function daysSince(lastAttempted, now = new Date()) {
  if (!lastAttempted) return RECENCY_CAP_DAYS; // never attempted = maximally stale
  const then = lastAttempted instanceof Date ? lastAttempted : new Date(lastAttempted);
  if (isNaN(then.getTime())) return RECENCY_CAP_DAYS;
  return Math.max(0, (now.getTime() - then.getTime()) / MS_PER_DAY);
}

/** accuracy as a 0..1 fraction; 0 attempts => treat as 0 (unknown = weak). */
export function accuracyFraction(correctCount, totalAttempts) {
  if (!totalAttempts || totalAttempts <= 0) return 0;
  return Math.min(1, Math.max(0, correctCount / totalAttempts));
}

/**
 * Compute the 0-100 Master Priority score for a topic's running stats.
 * @param {object} stats
 * @param {number} stats.correctCount
 * @param {number} stats.totalAttempts
 * @param {Date|string|null} stats.lastAttempted
 */
export function computePriority(stats, now = new Date()) {
  const acc = accuracyFraction(stats.correctCount, stats.totalAttempts);
  const days = daysSince(stats.lastAttempted, now);

  const accuracyGap = 1 - acc; // 0 (perfect) .. 1 (always wrong)
  const recency = Math.min(days / RECENCY_CAP_DAYS, 1);
  const confidence = Math.min((stats.totalAttempts || 0) / CONFIDENCE_CAP_ATTEMPTS, 1);

  const score =
    W_ACCURACY * accuracyGap +
    W_RECENCY * recency +
    W_CONFIDENCE * (1 - confidence);

  return Math.round(score * 1000) / 10; // 0.0 .. 100.0
}

/* ------------------------------- Depth mastery ------------------------------ */
/**
 * The SECOND score, and the one that answers "do I actually know this?".
 *
 * The engine's original number (a topic's raw accuracy, averaged over the shelf with
 * untouched topics counted as 0) is a BREADTH measure: it rewards touching a topic once
 * and never coming back. On a real shelf that degenerates — 542 practised topics carrying
 * 1,473 attempts, 509 of them sitting at exactly 100%, 322 of those on <=2 questions. The
 * ring read 66%; coverage was 67%. It was measuring coverage twice, so "protect the 100%"
 * beat "answer more questions", which is backwards for a spaced-repetition app.
 *
 * This one is DEPTH: how much evidence backs the claim, and how fresh it is.
 *
 *   mastery = retention x ( 0.7 x smoothedAccuracy + 0.3 x depth )
 *
 * Three properties are load-bearing — change a constant and re-check all three
 * (lib/_priority_test.js asserts them):
 *
 *  1. VOLUME BEATS PERFECTION WHERE IT MATTERS. Doubling your questions at 90% outscores
 *     staying perfect, anywhere below ~15 attempts on a topic — which is the entire range
 *     a real shelf lives in (2.7 attempts per practised topic). It CROSSES OVER around 20:
 *     m(40,36)=85.9 < m(20,20)=86.1. That is correct, not a bug to tune away — twenty
 *     straight correct answers really is stronger evidence than forty at 90%. The problem
 *     being solved is the 1-to-5-attempt band, not the well-drilled tail.
 *  2. ONE MORE QUESTION ALWAYS PAYS, IN EXPECTATION, AT ANY SKILL. Even at 50% skill the
 *     expected change is positive. The depth term is a/(a+H) — saturating but never capped
 *     — so there is no attempt count at which declining to practise maximises the score.
 *     That is the entire point; a hard cap (min(a/T,1)) breaks it, because past the cap
 *     only accuracy moves and a shaky topic is then better left alone.
 *  3. IT NEVER REACHES 100. Asymptotic on both terms. Mastery is not a box to tick.
 *
 * A single wrong answer still visibly dents the number — that is real evidence, and only
 * the EXPECTATION is guaranteed positive. Don't "fix" that by making it a ratchet: a
 * best-ever score stops describing what you currently know.
 */

// Beta prior on accuracy: worth PRIOR_ATTEMPTS pseudo-questions at PRIOR_ACCURACY.
// Its job is to make one lucky answer read as ~40, not 100.
const PRIOR_ATTEMPTS = 4;
const PRIOR_ACCURACY = 0.4;
// Depth half-life: attempts at which the depth term hits 0.5. The median topic's bank is
// ~5 questions, so 6 is roughly "you have worked through this topic once".
const DEPTH_HALF_ATTEMPTS = 6;
const W_MASTERY_ACCURACY = 0.7;
const W_MASTERY_DEPTH = 1 - W_MASTERY_ACCURACY;
// Retention: earned mastery fades toward a floor while a topic goes untouched, and one
// revision session restores it. The FLOOR is deliberate — decaying to 0 would rank a topic
// you drilled 20 times last year below one you have never opened, which is false.
const RETENTION_FLOOR = 0.65;
const RETENTION_DAYS = 120;

/**
 * Retention multiplier for a topic last practised `days` ago: 1.0 fresh, easing linearly
 * to RETENTION_FLOOR at RETENTION_DAYS and holding there.
 */
export function retentionFactor(days) {
  const d = Math.max(0, Number(days) || 0);
  return 1 - (1 - RETENTION_FLOOR) * Math.min(d / RETENTION_DAYS, 1);
}

/**
 * Compute the 0-100 depth-aware mastery score for a topic's running stats.
 * Never attempted => 0 (same convention as the breadth metric, so the two averages
 * share a denominator and are directly comparable).
 * @param {object} stats
 * @param {number} stats.correctCount
 * @param {number} stats.totalAttempts
 * @param {Date|string|null} stats.lastAttempted
 */
export function computeMastery(stats, now = new Date()) {
  const attempts = Math.max(0, stats.totalAttempts || 0);
  if (attempts <= 0) return 0;
  // Clamp: an import or a reset can leave correct > attempts, and >100% accuracy is not
  // a number. Clamping makes the worst case "reads low", never nonsense.
  const correct = Math.min(attempts, Math.max(0, stats.correctCount || 0));

  const acc = (correct + PRIOR_ATTEMPTS * PRIOR_ACCURACY) / (attempts + PRIOR_ATTEMPTS);
  const depth = attempts / (attempts + DEPTH_HALF_ATTEMPTS);
  // `daysSince(null)` is RECENCY_CAP_DAYS (30) — the "never attempted" convention. Here
  // that branch means "attempted, but the date didn't survive an import", so it lands at
  // a mild 0.91x rather than either extreme. Deliberate.
  const retention = retentionFactor(daysSince(stats.lastAttempted, now));

  const score = retention * (W_MASTERY_ACCURACY * acc + W_MASTERY_DEPTH * depth);
  return Math.round(score * 1000) / 10; // 0.0 .. 100.0
}

/** Returns a derived stats object (accuracy %, daysSince, priority, mastery) for display. */
export function deriveStats(stats, now = new Date()) {
  const accFrac = accuracyFraction(stats.correctCount, stats.totalAttempts);
  return {
    accuracy: Math.round(accFrac * 100),
    daysSince: Math.round(daysSince(stats.lastAttempted, now) * 100) / 100,
    priority: computePriority(stats, now),
    mastery: computeMastery(stats, now),
  };
}
