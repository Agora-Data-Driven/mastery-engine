/**
 * Auth for the Mastery Engine — three ways in, one resolved identity.
 *
 *   1. Central SSO: the portal's `.agoradatadriven.com` `ag_sso` cookie (works once this app is on a
 *      *.agoradatadriven.com custom domain). Its `sub` is the user's email; `clients: ["*"]` = admin.
 *   2. Google sign-in: this app's own OAuth (works today on *.run.app). Sets a signed `mastery_user`
 *      cookie carrying the verified email.
 *   3. Legacy password: the shared APP_PASSWORD (backwards compatible). A password login has no email,
 *      so it resolves to the DEFAULT account (the legacy owner who holds all the existing progress).
 *
 * Roles: ADMINS (default info@ + ianfernandezctm) and any ag_sso "*" holder are admins. THE super
 * admin (info@) — and any admin — can "act as" any user (a `mastery_as` cookie). Admins DEFAULT to
 * the legacy owner's account (the one with the current progress) unless they're acting as someone.
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
const ADMINS = new Set(
  (process.env.MASTERY_ADMINS || `${SUPER_ADMIN},${DEFAULT_ACCOUNT}`)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

const norm = (e) => (e || '').trim().toLowerCase();

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

/** True for THE super admin, an ag_sso "*" holder, or a listed admin email. */
export function isAdmin(req) {
  const sso = verifyAgSso(req.cookies?.ag_sso);
  if (Array.isArray(sso?.clients) && sso.clients.includes('*')) return true;
  const email = currentEmail(req);
  return !!email && (email === SUPER_ADMIN || ADMINS.has(email));
}

/** Email-only admin check, for server-to-server callers (e.g. Sentinel's Academy) that only have
 * the user's email, not their cookies. Matches the email arm of isAdmin (super admin + ADMINS list);
 * the ag_sso "*" arm can't be evaluated without the request, but the academy-admin page itself
 * re-gates the browser with full cookie context, so this only decides Sentinel's default view. */
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
 *   - any admin (incl. the password login) -> the DEFAULT account (holds the current progress)
 *   - a regular signed-in user -> their own account
 */
export function effectiveUser(req) {
  const email = currentEmail(req);
  if (!email) return null;
  if (isAdmin(req)) {
    const as = norm(req.cookies?.[AS_COOKIE]);
    if (as) return as;
    return DEFAULT_ACCOUNT;
  }
  return email;
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
