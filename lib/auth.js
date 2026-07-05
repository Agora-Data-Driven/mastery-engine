/**
 * Lightweight password gate for "mastery mode".
 *
 * - Guest mode needs no auth (pick a topic, get random questions, see a score).
 * - Mastery mode requires the single app password (APP_PASSWORD).
 *
 * On success we set an HttpOnly, signed cookie (HMAC-SHA256 over an expiry),
 * so there's no server-side session store to manage. No external JWT dep.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.SESSION_SECRET || '';
const PASSWORD = process.env.APP_PASSWORD || '';
const COOKIE = 'mastery_session';
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function sign(payload) {
  return createHmac('sha256', SECRET).update(payload).digest('hex');
}

/** Constant-time string compare. */
function safeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function checkPassword(candidate) {
  if (!PASSWORD) return false;
  return safeEqual(String(candidate || ''), PASSWORD);
}

export function makeToken(now = Date.now()) {
  const exp = String(now + TTL_MS);
  return `${exp}.${sign(exp)}`;
}

export function verifyToken(token, now = Date.now()) {
  if (!token || !SECRET) return false;
  const [exp, sig] = String(token).split('.');
  if (!exp || !sig) return false;
  if (!safeEqual(sig, sign(exp))) return false;
  return Number(exp) > now;
}

// Cookie attributes shared by set + clear so the browser treats them as the
// same cookie. SameSite=None + Secure lets the cookie ride along when the app
// is loaded inside a cross-site iframe (embedded use); Partitioned (CHIPS)
// keeps it working under Chrome's third-party-cookie blocking by scoping it to
// the embedding top-level site. Secure is required for both None and
// Partitioned, and Cloud Run is always HTTPS (localhost is treated as secure).
const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  partitioned: true,
  path: '/',
};

export function setSessionCookie(res) {
  res.cookie(COOKIE, makeToken(), { ...COOKIE_OPTS, maxAge: TTL_MS });
}

export function clearSessionCookie(res) {
  // Match the set attributes (incl. Partitioned) so the expiry actually
  // overwrites the live cookie in the browser's partitioned jar.
  res.clearCookie(COOKIE, COOKIE_OPTS);
}

export function isAuthed(req) {
  return verifyToken(req.cookies?.[COOKIE]);
}

/** Express middleware guarding mastery-only routes. */
export function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  return res.status(401).json({ error: 'Authentication required' });
}
