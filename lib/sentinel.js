// Reads a worker's holistic development digest from Sentinel, so the SAME Study Assistant that knows
// the learner's curriculum can also speak to their body-fat/PRs, career goals, required reading, and
// personal obstacles. Server-to-server over the shared platform-sso-key both apps mount (the mirror
// image of Sentinel's own outbound call for Academy progress) — no CORS, no browser credentials.
//
// It NEVER throws: a missing secret, an unreachable Sentinel, or a bad response all degrade to null,
// so the assistant simply has no holistic context and behaves exactly as before.
import { createHmac } from 'node:crypto';

const PURPOSE = 'holistic-profile';

/**
 * Is `email` a Sentinel user, and active? This is what makes Sentinel the source
 * of truth for who may use the Mastery Engine: the /api gate in server.js calls
 * this (cached) and turns away any signed-in email Sentinel doesn't vouch for.
 * Returns { found, active, name, role } — or null when Sentinel can't be reached
 * or the shared secret isn't configured (the caller decides how to degrade;
 * local dev has no secret, so the gate fails open there by design).
 */
export async function sentinelUserLookup(email) {
  const secret = process.env.SSO_SECRET || '';
  const base = (process.env.SENTINEL_URL || 'https://sentinel.agoradatadriven.com').replace(/\/+$/, '');
  if (!secret || !email) return null;
  try {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = createHmac('sha256', secret).update(`user-lookup:${ts}`).digest('hex');
    const url = `${base}/api/internal/user-lookup?email=${encodeURIComponent(email)}`;
    const r = await fetch(url, {
      headers: { 'x-academy-ts': ts, 'x-academy-sig': sig },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data && typeof data.found === 'boolean' ? data : null;
  } catch {
    return null;
  }
}

/**
 * Passages from the learner's Sentinel Mentor Library that bear on `q` — the grounding behind
 * "what would Nick say about my plan?" and "act as Nick and mentor me".
 *
 * WHY A SEARCH AND NOT PART OF THE PROFILE: the library is huge (one creator can be ~104
 * transcripts / ~1M words), so the holistic digest can only ever list titles. Sentinel does the
 * retrieval — it owns the text, and shipping megabytes here per chat turn would be absurd — and
 * returns just the handful of relevant excerpts.
 *
 * `mentor` narrows to one person and is matched loosely there ("nick" → "Nick Saraev").
 * Returns { mentors, mentor, matched_mentor, excerpts } or null. NEVER throws: an unreachable
 * Sentinel simply means no mentor grounding, exactly like holisticProfile.
 */
export async function mentorSearch(email, { q = '', mentor = '', limit = 8 } = {}) {
  const secret = process.env.SSO_SECRET || '';
  const base = (process.env.SENTINEL_URL || 'https://sentinel.agoradatadriven.com').replace(/\/+$/, '');
  if (!secret || !email || !q.trim()) return null;
  try {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = createHmac('sha256', secret).update(`mentor-search:${ts}`).digest('hex');
    const qs = new URLSearchParams({ email, q, mentor, limit: String(limit) });
    const r = await fetch(`${base}/api/internal/mentor-search?${qs}`, {
      headers: { 'x-academy-ts': ts, 'x-academy-sig': sig },
      // Building the index on a cold instance tokenises megabytes, so allow more than the 8s
      // the light calls use — a slow first turn beats silently ungrounded mentor advice.
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data && data.found ? data : null;
  } catch {
    return null;
  }
}

/**
 * Full bodies for specific growth-journal entries — the "big" half of small-to-big retrieval.
 *
 * WHY THIS EXISTS: the holistic digest carries a COMPLETE index of the learner's journal (every
 * entry's title, uncapped) but no bodies, because the journal grows without bound and most turns
 * need none of it. When a turn does bear on some entries, we name their ids and get the text back
 * WHOLE. Index complete, bodies lazy — that split is what lets the notes grow forever without
 * either blowing up the prompt or letting the assistant mistake a gap for an absence.
 *
 * Bodies are never excerpted, here or at the Sentinel end: a half-loaded note reads to the model
 * exactly like a complete one, and it will confidently summarise the fragment as the whole thing.
 *
 * Returns { entries: [...] } or null. NEVER throws — an unreachable Sentinel just means the coach
 * works from titles alone, which is degraded but still honest (it can see what it hasn't read).
 */
export async function growthDetail(email, ids) {
  const secret = process.env.SSO_SECRET || '';
  const base = (process.env.SENTINEL_URL || 'https://sentinel.agoradatadriven.com').replace(/\/+$/, '');
  const wanted = (Array.isArray(ids) ? ids : []).filter((n) => Number.isInteger(n));
  if (!secret || !email || !wanted.length) return null;
  try {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = createHmac('sha256', secret).update(`growth-detail:${ts}`).digest('hex');
    const qs = new URLSearchParams({ email, ids: wanted.join(',') });
    const r = await fetch(`${base}/api/internal/growth-detail?${qs}`, {
      headers: { 'x-academy-ts': ts, 'x-academy-sig': sig },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data && data.found && Array.isArray(data.entries) ? data : null;
  } catch {
    return null;
  }
}

/**
 * THE TASK BOARD, as this person is allowed to see it — Sentinel's other half of their working life.
 *
 * The holistic profile knows their goals, training load and reading; this knows what is actually on
 * their plate. Together they are what makes "what should I work on today?" answerable in one place:
 * the coach can see that they have three overdue cards AND that they run 10k tonight.
 *
 * 🔴 WHAT THIS PAYLOAD IS NOT: a company-wide board. Sentinel scopes it to the caller through
 * `task_perms.can_view` — an employee gets their own work plus their team's unclaimed queue, a team
 * lead their team, a manager the estate — and `digest.viewer.sees` spells that out in one sentence.
 * Never present it to the learner as "the company's tasks"; `workBlock` in lib/gemini.js carries that
 * instruction into the prompt for the same reason.
 *
 * Returns the digest object or null. NEVER throws: a missing secret, an unreachable Sentinel or a bad
 * response all mean the coach simply has no work context and behaves exactly as before.
 */
export async function workDigest(email) {
  const secret = process.env.SSO_SECRET || '';
  const base = (process.env.SENTINEL_URL || 'https://sentinel.agoradatadriven.com').replace(/\/+$/, '');
  if (!secret || !email) return null;
  try {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = createHmac('sha256', secret).update(`work-digest:${ts}`).digest('hex');
    const url = `${base}/api/internal/work-digest?email=${encodeURIComponent(email)}`;
    const r = await fetch(url, {
      headers: { 'x-academy-ts': ts, 'x-academy-sig': sig },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data && data.found ? data.digest : null;
  } catch {
    return null;
  }
}

/**
 * Full bodies for specific task cards — the "big" half of small-to-big retrieval, exactly like
 * `growthDetail`. The digest lists every card the viewer may see as one compact line; this fetches
 * the description, internal notes, breakdown and comment thread for the handful a turn is about.
 *
 * Bodies are never excerpted at either end: a half-loaded description reads to the model like a
 * complete one and gets summarised as though it were the whole card.
 *
 * Sentinel rows only — an `atrium:<key>:<id>` card lives in Atrium's workspace JSON, so those ids are
 * filtered out here rather than sent to be silently skipped. Returns { cards } or null; never throws.
 */
export async function workDetail(email, ids) {
  const secret = process.env.SSO_SECRET || '';
  const base = (process.env.SENTINEL_URL || 'https://sentinel.agoradatadriven.com').replace(/\/+$/, '');
  const wanted = (Array.isArray(ids) ? ids : []).filter((n) => Number.isInteger(n));
  if (!secret || !email || !wanted.length) return null;
  try {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = createHmac('sha256', secret).update(`work-detail:${ts}`).digest('hex');
    const qs = new URLSearchParams({ email, ids: wanted.join(',') });
    const r = await fetch(`${base}/api/internal/work-detail?${qs}`, {
      headers: { 'x-academy-ts': ts, 'x-academy-sig': sig },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data && data.found && Array.isArray(data.cards) ? data : null;
  } catch {
    return null;
  }
}

export async function holisticProfile(email) {
  const secret = process.env.SSO_SECRET || '';
  const base = (process.env.SENTINEL_URL || 'https://sentinel.agoradatadriven.com').replace(/\/+$/, '');
  if (!secret || !email) return null;
  try {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = createHmac('sha256', secret).update(`${PURPOSE}:${ts}`).digest('hex');
    const url = `${base}/api/internal/holistic-profile?email=${encodeURIComponent(email)}`;
    const r = await fetch(url, {
      headers: { 'x-academy-ts': ts, 'x-academy-sig': sig },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data && data.found ? data.profile : null;
  } catch {
    return null;
  }
}
