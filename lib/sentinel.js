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
