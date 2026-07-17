/**
 * Watcher transcript import — read-only access to Atrium's video archive.
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
 * and the rest of the app is unaffected. Strictly read-only: we never write to Atrium's bucket.
 */
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
