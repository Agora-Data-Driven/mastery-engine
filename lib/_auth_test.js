/**
 * Off-cloud test for the Mastery auth resolution (no Firestore, no network). Verifies the three
 * sign-in paths, admin detection, and impersonation / default-account logic.
 *
 * Run:  node lib/_auth_test.js   (exit 0 = pass)
 */
import { createHmac } from 'node:crypto';

process.env.SESSION_SECRET = 'test-session-secret';
process.env.SSO_SECRET = 'test-sso-secret';
process.env.MASTERY_DEFAULT_ACCOUNT = 'ianfernandezctm@gmail.com';
process.env.MASTERY_SUPER_ADMIN = 'info@agoradatadriven.com';
delete process.env.MASTERY_ADMINS; // exercise the default: break-glass list = the super admin only
process.env.MASTERY_LOGIN_ACCOUNTS = 'ianfernandezctm@gmail.com:agora,other@x.com:p:a:ss';

const auth = await import('./auth.js');

// Sentinel-role resolver mock — in prod, server.js feeds this from the /api
// gate's cached directory lookup. Roles here mirror Sentinel's constants.
auth.setSentinelRoleResolver((email) => ({
  'lance@agora.ph': 'super_admin',
  'maria@agora.ph': 'admin',
  'ana@agora.ph': 'employee',
  'ianfernandezctm@gmail.com': 'intern',
})[email]);

const fails = [];
const check = (label, cond) => {
  console.log((cond ? '  [OK] ' : '  [FAIL] ') + label);
  if (!cond) fails.push(label);
};

// Mint an ag_sso cookie exactly like platform_sso.py (base64url payload + "." + base64url HMAC).
function mintSso(clients, sub, exp) {
  const payload = Buffer.from(
    JSON.stringify({ sub, clients, iat: 1, exp }),
    'utf8',
  ).toString('base64url');
  const sig = createHmac('sha256', 'test-sso-secret').update(payload, 'ascii').digest('base64url');
  return `${payload}.${sig}`;
}
const soon = Math.floor(Date.now() / 1000) + 3600;
const req = (cookies) => ({ cookies });

// --- Google user token round-trip ------------------------------------------------------------
const tok = auth.makeUserToken('Alice@Gmail.com');
check('user token verifies + normalises email', auth.verifyUserToken(tok) === 'alice@gmail.com');
check('tampered user token rejected', auth.verifyUserToken(tok + 'x') === null);

// --- ag_sso verification ---------------------------------------------------------------------
check('valid ag_sso verifies', auth.verifyAgSso(mintSso(['*'], 'info@agoradatadriven.com', soon))?.sub === 'info@agoradatadriven.com');
check('expired ag_sso rejected', auth.verifyAgSso(mintSso(['*'], 'x', 1)) === null);
check('forged ag_sso rejected', auth.verifyAgSso('abc.def') === null);

// --- currentEmail resolution -----------------------------------------------------------------
check('ag_sso -> sub email', auth.currentEmail(req({ ag_sso: mintSso(['riverdance'], 'bob@x.com', soon) })) === 'bob@x.com');
check('google cookie -> its email', auth.currentEmail(req({ mastery_user: auth.makeUserToken('carol@x.com') })) === 'carol@x.com');
check('password session -> default account', auth.currentEmail(req({ mastery_session: auth.makeToken() })) === 'ianfernandezctm@gmail.com');
check('no cookies -> null', auth.currentEmail(req({})) === null);

// --- admin detection (SENTINEL ROLE decides; env list is break-glass only) ---------------------
check('info@ (google) is admin (break-glass list)', auth.isAdmin(req({ mastery_user: auth.makeUserToken('info@agoradatadriven.com') })) === true);
// Deliberate (2026-07-25): the legacy owner account is an INTERN in Sentinel, so it is a learner —
// it used to be admin via the old ADMINS default; Sentinel's role now decides.
check('ianfernandezctm (Sentinel intern) is NOT admin', auth.isAdmin(req({ mastery_user: auth.makeUserToken('ianfernandezctm@gmail.com') })) === false);
check('Sentinel super_admin is admin (via role)', auth.isAdmin(req({ mastery_user: auth.makeUserToken('lance@agora.ph') })) === true);
check('Sentinel admin is admin (via role)', auth.isAdmin(req({ ag_sso: mintSso([], 'maria@agora.ph', soon) })) === true);
check('Sentinel employee is NOT admin', auth.isAdmin(req({ mastery_user: auth.makeUserToken('ana@agora.ph') })) === false);
// Deliberate (2026-07-25): a portal clients:["*"] grant no longer confers admin by itself —
// Sentinel's role decides, not the portal's.
check('ag_sso "*" alone no longer grants admin', auth.isAdmin(req({ ag_sso: mintSso(['*'], 'someadmin@x.com', soon) })) === false);
check('ag_sso "*" + Sentinel role IS admin', auth.isAdmin(req({ ag_sso: mintSso(['*'], 'lance@agora.ph', soon) })) === true);
check('random google user is NOT admin', auth.isAdmin(req({ mastery_user: auth.makeUserToken('stranger@x.com') })) === false);
// Deliberate (2026-07-25): the SHARED password carries no personal credential, so it must never
// confer admin — one leaked string used to grant admin tools + unrestricted act-as.
check('password session is NOT admin (shared secret, no personal credential)', auth.isAdmin(req({ mastery_session: auth.makeToken() })) === false);
check('isSentinelAdminRole: case-insensitive, unknown falsy', auth.isSentinelAdminRole('Super_Admin') === true && auth.isSentinelAdminRole('intern') === false && auth.isSentinelAdminRole(undefined) === false);

// --- effectiveUser (impersonation + default) -------------------------------------------------
check('listed admin with no act-as -> default account',
  auth.effectiveUser(req({ mastery_user: auth.makeUserToken('info@agoradatadriven.com') })) === 'ianfernandezctm@gmail.com');
check('admin acting as X -> X',
  auth.effectiveUser(req({ mastery_user: auth.makeUserToken('info@agoradatadriven.com'), mastery_as: 'Someone@X.com' })) === 'someone@x.com');
// Deliberate (2026-07-25): admins who aren't on the break-glass list keep their OWN identity —
// they must not silently read/write the legacy owner's account.
check('Sentinel-role admin keeps their OWN account',
  auth.effectiveUser(req({ mastery_user: auth.makeUserToken('lance@agora.ph') })) === 'lance@agora.ph');
check('regular user -> their own account',
  auth.effectiveUser(req({ mastery_user: auth.makeUserToken('dana@x.com') })) === 'dana@x.com');
check('regular user cannot impersonate (act-as ignored)',
  auth.effectiveUser(req({ mastery_user: auth.makeUserToken('dana@x.com'), mastery_as: 'victim@x.com' })) === 'dana@x.com');
check('guest -> null', auth.effectiveUser(req({})) === null);

// --- conversationUser (chats never default to the legacy owner) ------------------------------
check('admin chats key to their OWN email',
  auth.conversationUser(req({ mastery_user: auth.makeUserToken('info@agoradatadriven.com') })) === 'info@agoradatadriven.com');
check('admin acting as X chats as X',
  auth.conversationUser(req({ mastery_user: auth.makeUserToken('info@agoradatadriven.com'), mastery_as: 'someone@x.com' })) === 'someone@x.com');
check('regular user chats as themselves',
  auth.conversationUser(req({ mastery_user: auth.makeUserToken('dana@x.com') })) === 'dana@x.com');
check('regular user act-as ignored for chats',
  auth.conversationUser(req({ mastery_user: auth.makeUserToken('dana@x.com'), mastery_as: 'victim@x.com' })) === 'dana@x.com');

// --- isSuperAdmin ----------------------------------------------------------------------------
check('info@ is super admin', auth.isSuperAdmin(req({ mastery_user: auth.makeUserToken('info@agoradatadriven.com') })) === true);
check('ianfernandezctm is NOT super admin', auth.isSuperAdmin(req({ mastery_user: auth.makeUserToken('ianfernandezctm@gmail.com') })) === false);

// --- authContext shape -----------------------------------------------------------------------
const ctx = auth.authContext(req({ mastery_user: auth.makeUserToken('info@agoradatadriven.com'), mastery_as: 'zed@x.com' }));
check('authContext reports actingAs', ctx.actingAs === 'zed@x.com' && ctx.effective === 'zed@x.com' && ctx.admin === true);
check('authContext exposes emailLogin flag', ctx.emailLogin === true);

// --- email + password combo login ------------------------------------------------------------
check('hasEmailLogin true when configured', auth.hasEmailLogin() === true);
check('combo: correct pair -> normalised email', auth.checkEmailPassword(' IanFernandezCTM@Gmail.com ', 'agora') === 'ianfernandezctm@gmail.com');
check('combo: wrong password -> null', auth.checkEmailPassword('ianfernandezctm@gmail.com', 'nope') === null);
check('combo: unknown email -> null', auth.checkEmailPassword('stranger@x.com', 'agora') === null);
check('combo: empty email -> null', auth.checkEmailPassword('', 'agora') === null);
check('combo: password may contain colons', auth.checkEmailPassword('other@x.com', 'p:a:ss') === 'other@x.com');
// A combo login mints the SAME user cookie a Google login does, so it resolves to that identity.
check('combo email resolves via user cookie', auth.currentEmail(req({ mastery_user: auth.makeUserToken('ianfernandezctm@gmail.com') })) === 'ianfernandezctm@gmail.com');

if (fails.length) {
  console.log(`\n[auth-test] FAIL (${fails.length}): ${fails.join(', ')}`);
  process.exit(1);
}
console.log('\n[auth-test] PASS');
