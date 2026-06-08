/**
 * Mastery / spaced-repetition scoring.
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

/** Returns a derived stats object (accuracy %, daysSince, priority) for display. */
export function deriveStats(stats, now = new Date()) {
  const accFrac = accuracyFraction(stats.correctCount, stats.totalAttempts);
  return {
    accuracy: Math.round(accFrac * 100),
    daysSince: Math.round(daysSince(stats.lastAttempted, now) * 100) / 100,
    priority: computePriority(stats, now),
  };
}
