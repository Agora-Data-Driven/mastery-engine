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
process.env.MASTERY_ADMINS = 'info@agoradatadriven.com,ianfernandezctm@gmail.com';

const auth = await import('./auth.js');

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

// --- admin detection -------------------------------------------------------------------------
check('info@ (google) is admin', auth.isAdmin(req({ mastery_user: auth.makeUserToken('info@agoradatadriven.com') })) === true);
check('ianfernandezctm is admin', auth.isAdmin(req({ mastery_user: auth.makeUserToken('ianfernandezctm@gmail.com') })) === true);
check('ag_sso "*" is admin', auth.isAdmin(req({ ag_sso: mintSso(['*'], 'someadmin@x.com', soon) })) === true);
check('random google user is NOT admin', auth.isAdmin(req({ mastery_user: auth.makeUserToken('stranger@x.com') })) === false);
check('password session is admin (defaults to owner)', auth.isAdmin(req({ mastery_session: auth.makeToken() })) === true);

// --- effectiveUser (impersonation + default) -------------------------------------------------
check('admin with no act-as -> default account',
  auth.effectiveUser(req({ mastery_user: auth.makeUserToken('info@agoradatadriven.com') })) === 'ianfernandezctm@gmail.com');
check('admin acting as X -> X',
  auth.effectiveUser(req({ mastery_user: auth.makeUserToken('info@agoradatadriven.com'), mastery_as: 'Someone@X.com' })) === 'someone@x.com');
check('regular user -> their own account',
  auth.effectiveUser(req({ mastery_user: auth.makeUserToken('dana@x.com') })) === 'dana@x.com');
check('regular user cannot impersonate (act-as ignored)',
  auth.effectiveUser(req({ mastery_user: auth.makeUserToken('dana@x.com'), mastery_as: 'victim@x.com' })) === 'dana@x.com');
check('guest -> null', auth.effectiveUser(req({})) === null);

// --- isSuperAdmin ----------------------------------------------------------------------------
check('info@ is super admin', auth.isSuperAdmin(req({ mastery_user: auth.makeUserToken('info@agoradatadriven.com') })) === true);
check('ianfernandezctm is NOT super admin', auth.isSuperAdmin(req({ mastery_user: auth.makeUserToken('ianfernandezctm@gmail.com') })) === false);

// --- authContext shape -----------------------------------------------------------------------
const ctx = auth.authContext(req({ mastery_user: auth.makeUserToken('info@agoradatadriven.com'), mastery_as: 'zed@x.com' }));
check('authContext reports actingAs', ctx.actingAs === 'zed@x.com' && ctx.effective === 'zed@x.com' && ctx.admin === true);

if (fails.length) {
  console.log(`\n[auth-test] FAIL (${fails.length}): ${fails.join(', ')}`);
  process.exit(1);
}
console.log('\n[auth-test] PASS');
