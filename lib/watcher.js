/**
 * Watcher — reading Atrium's archive, and adding sources to it.
 *
 * Atrium's Watcher (services/portal/dash/watcher.py) already archives every watched channel's
 * videos WITH their transcripts. That is exactly the raw material the Academy's question generator
 * needs, so rather than re-scrape YouTube or copy files around, this reads Atrium's objects
 * directly out of the shared bucket.
 *
 * The contract (verified against workspace.py, which is the writer of record):
 *   registry: workspace/<client>.json   -> ws["watcher"]["channels"] = [{id, title, kind, ...}]
 *   archive:  workspace/watcher/<client>/<channel_id>.json
 *             -> {"videos": [{id, title, url, transcript, language, error, fetched_at, ...}]}
 *   (the "workspace/" prefix is WORKSPACE_PREFIX on their side; same default here)
 *
 * ACCESS: this app's Cloud Run service account needs storage.objectViewer on the bucket. Without
 * it every call here fails with a clear message rather than a stack trace — the admin UI shows it
 * and the rest of the app is unaffected.
 *
 * 🔴 THE TWO HALVES ARE ASYMMETRIC ON PURPOSE. Reading is a bucket read (cheap, and the archive is
 * already exactly the shape we want). WRITING is never a bucket write: adding a source means
 * scraping YouTube/a blog, minting a registry entry, AI-labelling its industry and leaving an audit
 * trail — all of which belong to Atrium, which owns that data. So `addSource`/`fetchBodies` below
 * call Atrium's HMAC-gated internal bridge and let it do the work. We still never write to Atrium's
 * bucket; see lib/sentinel.js for the same server-to-server scheme.
 */
import { createHmac } from 'node:crypto';
import { Storage } from '@google-cloud/storage';

const BUCKET = process.env.WATCHER_BUCKET || 'agora-data-driven-platform-dash';
const PREFIX = process.env.WATCHER_PREFIX || 'workspace/';

let _storage = null;
const storage = () => (_storage = _storage || new Storage());

/** Read + JSON-parse one object, or null when it doesn't exist. */
async function readJson(name) {
  try {
    const [buf] = await storage().bucket(BUCKET).file(name).download();
    return JSON.parse(buf.toString('utf8'));
  } catch (e) {
    if (e && (e.code === 404 || e.code === 403)) return null;
    throw e;
  }
}

const friendly = (e) =>
  new Error(
    `Couldn't read Atrium's Watcher archive (bucket ${BUCKET}). `
    + `This app's service account may be missing storage.objectViewer on it. [${e.message}]`,
  );

/** Which Atrium clients have a workspace we can see. */
export async function listClients() {
  try {
    const [files] = await storage().bucket(BUCKET).getFiles({ prefix: PREFIX, delimiter: '/' });
    return files
      .map((f) => f.name.slice(PREFIX.length))
      .filter((n) => n.endsWith('.json') && !n.includes('/') && !n.startsWith('_'))
      .map((n) => n.replace(/\.json$/, ''))
      .sort();
  } catch (e) {
    throw friendly(e);
  }
}

/** A client's watched channels (registry only — no transcripts). */
export async function listChannels(client) {
  if (!client) return [];
  try {
    const ws = await readJson(`${PREFIX}${client}.json`);
    const channels = ((ws || {}).watcher || {}).channels || [];
    return channels.map((c) => ({
      id: c.id || '',
      title: c.title || c.id || 'Untitled channel',
      kind: c.kind || 'creator',
      industry: c.industry || '',
      videoCount: c.video_count || 0,
      transcriptCount: c.transcript_count || 0,
    }));
  } catch (e) {
    throw friendly(e);
  }
}

/**
 * A channel's videos. Transcript TEXT is omitted by default so the picker stays
 * small — it can list hundreds of videos, each transcript running to tens of KB.
 */
export async function listVideos(client, channelId, { withText = false } = {}) {
  if (!client || !channelId) return [];
  try {
    const data = await readJson(`${PREFIX}watcher/${client}/${channelId}.json`);
    const videos = (data || {}).videos || [];
    return videos.map((v) => {
      const text = String(v.transcript || '');
      return {
        id: v.id || '',
        title: v.title || v.id || 'Untitled',
        url: v.url || '',
        published: v.published || v.published_text || '',
        chars: text.length,
        hasTranscript: text.length > 0,
        error: v.error || '',
        ...(withText ? { transcript: text } : {}),
      };
    });
  } catch (e) {
    throw friendly(e);
  }
}

/** One video WITH its transcript, or null. */
export async function getVideo(client, channelId, videoId) {
  const videos = await listVideos(client, channelId, { withText: true });
  return videos.find((v) => v.id === videoId) || null;
}

/* ---------------------- Adding a source (writes, through Atrium) ---------------------- */

const ATRIUM = (process.env.ATRIUM_URL || 'https://portal.agoradatadriven.com').replace(/\/+$/, '');
const ADD_PURPOSE = 'watcher-add';

// Listing a channel or a blog is a SCRAPE on Atrium's side (paged YouTube browse calls, or a
// sitemap walk), not a lookup — a 200-video channel routinely runs tens of seconds. Give it room,
// but stay under Cloud Run's request cap so the caller gets our message and not a dead socket.
const ADD_TIMEOUT_MS = 240_000;
const FETCH_TIMEOUT_MS = 180_000;

/**
 * POST one op to Atrium's internal Watcher bridge.
 *
 * Unlike the read helpers this THROWS on failure — adding a source is an action the admin
 * explicitly asked for, so a silent degrade would leave them staring at a source that was never
 * created. Every error is a sentence an admin can act on.
 */
async function bridgePost(body, timeoutMs) {
  const secret = process.env.SSO_SECRET || '';
  if (!secret) {
    throw new Error('Adding to Watcher needs the shared platform-sso-key (SSO_SECRET), which '
      + 'isn\'t set on this instance. Reading the archive still works.');
  }
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac('sha256', secret).update(`${ADD_PURPOSE}:${ts}`).digest('hex');
  let r;
  try {
    r = await fetch(`${ATRIUM}/api/internal/watcher/add`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-academy-ts': ts, 'x-academy-sig': sig },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const timedOut = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
    throw new Error(timedOut
      // The scrape may well have finished on Atrium's side after we stopped listening, so say so
      // rather than inviting a blind retry that would then report "already watching".
      ? `Atrium took longer than ${Math.round(timeoutMs / 1000)}s to list that source. It may still `
        + 'have landed — check the channel list before adding it again.'
      : `Couldn't reach Atrium at ${ATRIUM} to add the source. [${e.message}]`);
  }
  let data = null;
  try { data = await r.json(); } catch { data = null; }
  if (!r.ok) {
    const err = (data && (data.error || data.message)) || `HTTP ${r.status}`;
    if (r.status === 401 || r.status === 503) {
      throw new Error(`Atrium refused the request (${err}). The two apps must share the same `
        + 'platform-sso-key, and the clocks must agree within 5 minutes.');
    }
    if (err === 'no_workspace') throw new Error(`Atrium has no workspace for "${body.client}".`);
    if (err === 'not_found') throw new Error('That channel is no longer in Atrium\'s Watcher.');
    throw new Error(`Atrium rejected the request: ${err}`);
  }
  // A well-formed refusal (bad link, already watching, blog listing found nothing) comes back
  // 200 + {ok:false, message} — Atrium's own tab treats it the same way.
  if (!data || data.ok !== true) {
    throw new Error((data && data.message) || 'Atrium could not add that source.');
  }
  return data;
}

/**
 * Add one watched source to `client`'s Atrium Watcher.
 *
 * `op` mirrors Atrium's own vocabulary, so there is one word for one behaviour on both sides:
 *   'add_video' — ONE pasted link. A YouTube URL is scraped as a video, anything else as an
 *                 article; the body comes back in this response. This is the default because it is
 *                 the only op that is instantly useful — the Academy usually wants one talk.
 *   'add'       — a whole YouTube channel: every video is registered, bodies come from fetchBodies.
 *   'add_site'  — a whole website's blog, same two-step.
 * `actor` is the admin's email; it lands in Atrium's Activity feed so a source added from here is
 * traceable to a person, not to "the Academy".
 */
export async function addSource(client, { url, op = 'add_video', actor = '' } = {}) {
  if (!client) throw new Error('Pick which Atrium client to add this source to.');
  if (!url || !url.trim()) throw new Error('Paste a link first.');
  if (!['add', 'add_site', 'add_video'].includes(op)) throw new Error(`Unknown add mode "${op}".`);
  return bridgePost({ client, op, url: url.trim(), actor }, ADD_TIMEOUT_MS);
}

/**
 * Pull the next batch of MISSING transcripts/articles for one channel.
 *
 * Deliberately one batch per call, exactly like Atrium's own tab: the caller loops until
 * `remaining` is 0 so no single request has to outlive a whole channel. `blocked` true means
 * YouTube rate-limited Atrium — nothing was marked failed, and a later call resumes untouched.
 */
export async function fetchBodies(client, channel, { retry = false, actor = '' } = {}) {
  if (!client || !channel) throw new Error('Missing client or channel.');
  return bridgePost({ client, op: 'fetch', channel, retry, actor }, FETCH_TIMEOUT_MS);
}
