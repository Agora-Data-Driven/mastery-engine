/**
 * Auth for the Mastery Engine — four ways in, one resolved identity.
 *
 *   1. Central SSO: the portal's `.agoradatadriven.com` `ag_sso` cookie (works once this app is on a
 *      *.agoradatadriven.com custom domain). Its `sub` is the user's email; `clients: ["*"]` = admin.
 *   2. Google sign-in: this app's own OAuth (works today on *.run.app). Sets a signed `mastery_user`
 *      cookie carrying the verified email.
 *   3. Email + password: a configured account (MASTERY_LOGIN_ACCOUNTS). Signs in AS that email — it
 *      gets its OWN identity/progress and the same signed `mastery_user` cookie a Google login mints.
 *   4. Legacy password: the shared APP_PASSWORD (backwards compatible). A password login has no email,
 *      so it resolves to the DEFAULT account (the legacy owner who holds all the existing progress).
 *
 * Roles COME FROM SENTINEL: a person whose Sentinel role is super_admin/admin is an admin here;
 * everyone else (employee/intern/…) is a learner. server.js feeds that role in through
 * setSentinelRoleResolver over the same cached directory lookup its /api gate performs, so this
 * module stays synchronous. The env list (MASTERY_SUPER_ADMIN + MASTERY_ADMINS, default just
 * info@) is the break-glass override — it keeps working when Sentinel is down. Admin requires an
 * identity backed by a real per-person credential (ag_sso / Google cookie): the shared legacy
 * password is never admin, so one leaked string can't reach admin tools or act-as. A portal
 * `clients:["*"]` grant no longer confers admin by itself — Sentinel's role decides, not the
 * portal's. THE super admin (info@) — and any admin — can "act as" a user (a `mastery_as`
 * cookie). Only the EXPLICITLY listed admin emails default to the legacy owner's account (the one
 * holding the historical progress); every other admin keeps their OWN identity. Conversations
 * (chats) NEVER default to the legacy owner, and act-as deliberately does NOT extend to them
 * (changed 2026-07-25): threads are private even from admins — see conversationUser.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.SESSION_SECRET || '';
const PASSWORD = process.env.APP_PASSWORD || '';
const SSO_SECRET = process.env.SSO_SECRET || '';

const COOKIE = 'mastery_session'; // legacy password session
const USER_COOKIE = 'mastery_user'; // Google-verified email
const AS_COOKIE = 'mastery_as'; // admin "act as <email>"
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export const DEFAULT_ACCOUNT = (process.env.MASTERY_DEFAULT_ACCOUNT || 'ianfernandezctm@gmail.com')
  .trim()
  .toLowerCase();
const SUPER_ADMIN = (process.env.MASTERY_SUPER_ADMIN || 'info@agoradatadriven.com').trim().toLowerCase();
// Break-glass override list ONLY (works with Sentinel down). Real admin rights
// come from the person's SENTINEL role — the default deliberately no longer
// includes the legacy owner account: it's an intern in Sentinel, and Sentinel
// decides (changed 2026-07-25; it previously defaulted to admin here).
const ADMINS = new Set(
  (process.env.MASTERY_ADMINS || SUPER_ADMIN)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

const norm = (e) => (e || '').trim().toLowerCase();

/*
 * Configured email+password accounts (the "email + password combo" sign-in), read from
 * MASTERY_LOGIN_ACCOUNTS as `email:password,email2:password2`. The password is everything after the
 * FIRST colon (so a password may contain colons; a comma is the pair separator, so avoid commas in
 * passwords). Kept OUT of source — set it in the deploy env (or back it with a secret), matching how
 * APP_PASSWORD is handled. Empty by default, so this path stays dormant until an account is configured.
 */
const LOGIN_ACCOUNTS = (() => {
  const map = new Map();
  for (const pair of (process.env.MASTERY_LOGIN_ACCOUNTS || '').split(',')) {
    const i = pair.indexOf(':');
    if (i < 1) continue;
    const email = norm(pair.slice(0, i));
    const pw = pair.slice(i + 1); // not trimmed — passwords may have meaningful edge whitespace
    if (email && pw) map.set(email, pw);
  }
  return map;
})();

/** Are any email+password accounts configured? (frontend shows the email field when true). */
export function hasEmailLogin() {
  return LOGIN_ACCOUNTS.size > 0;
}

function sign(payload) {
  return createHmac('sha256', SECRET).update(payload).digest('hex');
}
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/* --------------------------- legacy password session ---------------------- */
export function checkPassword(candidate) {
  if (!PASSWORD) return false;
  return safeEqual(String(candidate || ''), PASSWORD);
}

/* ---------------------- email + password combo login ---------------------- */
/**
 * Verify an email + password pair against the configured accounts. Returns the normalized email on
 * success (so the caller mints the user cookie AS that email), or null. Constant-time compare on the
 * password; a normal safeEqual against a fixed dummy on a missing account keeps the timing uniform so
 * the response can't be used to enumerate which emails exist.
 */
export function checkEmailPassword(email, password) {
  const e = norm(email);
  const expected = e ? LOGIN_ACCOUNTS.get(e) : undefined;
  const ok = safeEqual(String(password || ''), expected == null ? '\0no-such-account\0' : expected);
  return expected != null && ok ? e : null;
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

/* ------------------------------ Google session ---------------------------- */
export function makeUserToken(email, now = Date.now()) {
  const exp = String(now + TTL_MS);
  const body = `${norm(email)}|${exp}`;
  return `${body}.${sign(body)}`;
}
export function verifyUserToken(token, now = Date.now()) {
  if (!token || !SECRET) return null;
  const dot = String(token).lastIndexOf('.');
  if (dot < 1) return null;
  const body = String(token).slice(0, dot);
  const sig = String(token).slice(dot + 1);
  if (!safeEqual(sig, sign(body))) return null;
  const [email, exp] = body.split('|');
  if (!email || !exp || Number(exp) <= now) return null;
  return norm(email);
}

/* ------------------------------ central ag_sso ---------------------------- */
export function verifyAgSso(raw, now = Date.now()) {
  if (!SSO_SECRET || !raw || String(raw).indexOf('.') < 0) return null;
  try {
    const dot = String(raw).lastIndexOf('.');
    const payloadB64 = String(raw).slice(0, dot);
    const sig = String(raw).slice(dot + 1);
    const expected = createHmac('sha256', SSO_SECRET).update(payloadB64, 'ascii').digest('base64url');
    if (sig !== expected) return null;
    const pad = '='.repeat((4 - (payloadB64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(payloadB64 + pad, 'base64').toString('utf8'));
    if (!payload.exp || now / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/* -------------------------------- cookies --------------------------------- */
// SameSite=None + Secure + Partitioned so the cookie survives inside a cross-site iframe (embedded use)
// and Chrome's third-party-cookie blocking. Cloud Run is always HTTPS (localhost counts as secure).
const COOKIE_OPTS = { httpOnly: true, secure: true, sameSite: 'none', partitioned: true, path: '/' };

export function setSessionCookie(res) {
  res.cookie(COOKIE, makeToken(), { ...COOKIE_OPTS, maxAge: TTL_MS });
}
export function clearSessionCookie(res) {
  res.clearCookie(COOKIE, COOKIE_OPTS);
}
export function setUserCookie(res, email) {
  res.cookie(USER_COOKIE, makeUserToken(email), { ...COOKIE_OPTS, maxAge: TTL_MS });
}
export function clearUserCookie(res) {
  res.clearCookie(USER_COOKIE, COOKIE_OPTS);
}
export function setActAs(res, email) {
  res.cookie(AS_COOKIE, norm(email), { ...COOKIE_OPTS, maxAge: TTL_MS });
}
export function clearActAs(res) {
  res.clearCookie(AS_COOKIE, COOKIE_OPTS);
}

/* --------------------------- identity resolution -------------------------- */
/** The signed-in user's real email, or null. ag_sso > Google cookie > legacy password (→ default). */
export function currentEmail(req) {
  const sso = verifyAgSso(req.cookies?.ag_sso);
  if (sso?.sub) return norm(sso.sub);
  const g = verifyUserToken(req.cookies?.[USER_COOKIE]);
  if (g) return g;
  if (verifyToken(req.cookies?.[COOKIE])) return DEFAULT_ACCOUNT; // password → the default account
  return null;
}

export function isAuthed(req) {
  return currentEmail(req) !== null;
}

/**
 * The email of an identity backed by a REAL per-person credential (ag_sso or the
 * Google/email-login cookie) — null for the shared legacy password session. Admin
 * rights and conversation keying hang off this, so the one shared string can
 * never confer admin or open someone's private chats under a borrowed identity.
 */
function credentialedEmail(req) {
  const sso = verifyAgSso(req.cookies?.ag_sso);
  if (sso?.sub) return norm(sso.sub);
  return verifyUserToken(req.cookies?.[USER_COOKIE]);
}

/* ------------------------ Sentinel-derived admin role ---------------------- */
/* Sentinel's users table is the source of truth for ROLES as well as access:
 * super_admin/admin there = admin here, interns/employees are learners. This
 * module must stay synchronous (isAdmin is consulted everywhere), so server.js
 * registers a resolver over the SAME cached Sentinel lookup its /api gate
 * awaits before any route runs — the cache is warm by the time we read it.
 * Unknown email / no resolver / Sentinel outage => NOT admin: an outage can
 * only briefly demote role-admins, never mint one. The env list above stays
 * as the break-glass that works with Sentinel down. */
const SENTINEL_ADMIN_ROLES = new Set(['super_admin', 'admin']);
export const isSentinelAdminRole = (role) => SENTINEL_ADMIN_ROLES.has(String(role || '').trim().toLowerCase());
let sentinelRoleResolver = null;
/** server.js plugs in a SYNC (email) => role|undefined reader over its gate cache. */
export function setSentinelRoleResolver(fn) { sentinelRoleResolver = fn; }
function sentinelAdmin(email) {
  if (!email || typeof sentinelRoleResolver !== 'function') return false;
  try { return isSentinelAdminRole(sentinelRoleResolver(email)); } catch { return false; }
}

/** True for THE super admin, a break-glass listed email, or a person whose
 *  SENTINEL role is super_admin/admin — never for the shared legacy password
 *  session (no personal credential), and no longer for a bare portal
 *  `clients:["*"]` grant: Sentinel's role decides, not the portal's. */
export function isAdmin(req) {
  const email = credentialedEmail(req);
  return !!email && (email === SUPER_ADMIN || ADMINS.has(email) || sentinelAdmin(email));
}

/** Email-only admin check, for server-to-server callers (e.g. Sentinel's Academy) that only have
 * the user's email, not their cookies. Matches the email arm of isAdmin (super admin + ADMINS list);
 * the role arm can't be evaluated without the request, but the academy-admin page is server-gated
 * with full cookie context (non-admins 302 home), so this only decides Sentinel's default view. */
export function isAdminEmail(email) {
  const e = norm(email);
  return !!e && (e === SUPER_ADMIN || ADMINS.has(e));
}

export function isSuperAdmin(req) {
  const sso = verifyAgSso(req.cookies?.ag_sso);
  if (sso?.sub && norm(sso.sub) === SUPER_ADMIN) return true;
  return currentEmail(req) === SUPER_ADMIN;
}

/**
 * The account whose data the request operates on:
 *   - admin acting as someone (mastery_as cookie) -> that account
 *   - an EXPLICITLY LISTED admin email -> the DEFAULT account (holds the historical progress;
 *     this is the legacy owner's own convenience default, so it stays scoped to the two
 *     configured admin emails)
 *   - any other admin (an ag_sso "*" holder not in the list) -> their OWN account, so a
 *     portal admin never silently reads/writes the legacy owner's data
 *   - a regular signed-in user -> their own account
 */
export function effectiveUser(req) {
  const email = currentEmail(req);
  if (!email) return null;
  if (isAdmin(req)) {
    const as = norm(req.cookies?.[AS_COOKIE]);
    if (as) return as;
    if (email === SUPER_ADMIN || ADMINS.has(email)) return DEFAULT_ACCOUNT;
  }
  return email;
}

/**
 * The account whose CONVERSATIONS (assistant chats, card chats, scope chats) the
 * request reads/writes. Chats ALWAYS key to the real signer — unlike effectiveUser,
 * conversationUser deliberately IGNORES act-as (mastery_as), even for admins:
 * threads are private to the person who wrote them, and "let me impersonate a
 * learner to debug" must never become a way to read their Coach conversations.
 * The legacy-owner default exists for progress continuity only; chats have no
 * legacy migration story and never fall back to it either.
 */
export function conversationUser(req) {
  return currentEmail(req);
}

/** Full auth context for /api/auth/whoami. */
export function authContext(req) {
  const email = currentEmail(req);
  const admin = isAdmin(req);
  return {
    authed: email !== null,
    email,
    admin,
    superAdmin: isSuperAdmin(req),
    effective: effectiveUser(req),
    actingAs: admin ? norm(req.cookies?.[AS_COOKIE]) || null : null,
    defaultAccount: DEFAULT_ACCOUNT,
    emailLogin: hasEmailLogin(), // show the email field on the login screen when accounts are configured
  };
}

/* ------------------------------- middleware ------------------------------- */
/** Guard mastery-only routes; attaches req.userEmail (effective) + req.isAdmin. */
export function requireAuth(req, res, next) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Authentication required' });
  req.userEmail = effectiveUser(req);
  req.isAdmin = isAdmin(req);
  return next();
}
/** Guard admin-only routes (shared-data admin tools + impersonation). */
export function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  req.userEmail = effectiveUser(req);
  req.isAdmin = true;
  return next();
}
