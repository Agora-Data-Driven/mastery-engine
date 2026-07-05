/**
 * Google Sign-In for the Mastery Engine — OAuth 2.0 authorization-code flow (Node global fetch, no
 * extra dependency). Mirrors the portal's google_oauth.py: exchange the code directly with Google's
 * TLS token endpoint (authenticated by our client secret), then read + defensively re-check the
 * id_token's email claims. OFF unless GOOGLE_OAUTH_CLIENT_ID/_SECRET are set (button hidden).
 *
 * Reuse the SAME OAuth client the portal uses — just add this app's callback to its authorized
 * redirect URIs: `${MASTERY_BASE_URL}/api/auth/google/callback`.
 */
import crypto from 'node:crypto';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const VALID_ISS = new Set(['accounts.google.com', 'https://accounts.google.com']);

export const clientId = () => (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
export const clientSecret = () => (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();
export const isConfigured = () => !!(clientId() && clientSecret());

export function redirectUri() {
  const explicit = (process.env.GOOGLE_OAUTH_REDIRECT_URI || '').trim();
  if (explicit) return explicit;
  const base = (process.env.MASTERY_BASE_URL || '').trim().replace(/\/$/, '');
  return `${base}/api/auth/google/callback`;
}

export const newState = () => crypto.randomUUID();

export function authUrl(state) {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

function decodeIdToken(idToken) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('malformed id_token');
  const pad = '='.repeat((4 - (parts[1].length % 4)) % 4);
  return JSON.parse(Buffer.from(parts[1] + pad, 'base64').toString('utf8'));
}

/** Exchange an auth `code` for the verified Google email. Returns { email } or { error }. */
export async function exchangeCode(code, now = Date.now()) {
  if (!code) return { error: 'no_code' };
  let tok;
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId(),
        client_secret: clientSecret(),
        redirect_uri: redirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    tok = await res.json();
  } catch {
    return { error: 'token_exchange_failed' };
  }
  if (!tok?.id_token) return { error: tok?.error || 'no_id_token' };
  let payload;
  try {
    payload = decodeIdToken(tok.id_token);
  } catch {
    return { error: 'bad_id_token' };
  }
  if (!VALID_ISS.has(payload.iss)) return { error: 'bad_issuer' };
  if (payload.aud !== clientId()) return { error: 'bad_audience' };
  if (!payload.exp || now / 1000 > payload.exp) return { error: 'expired' };
  if (!payload.email) return { error: 'no_email' };
  if (payload.email_verified !== true && payload.email_verified !== 'true') {
    return { error: 'email_unverified' };
  }
  return { email: String(payload.email).trim().toLowerCase() };
}
