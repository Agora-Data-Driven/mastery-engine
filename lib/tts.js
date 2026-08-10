/**
 * Google Cloud Text-to-Speech — the cloud voices for spoken replies.
 *
 * WHY THIS EXISTS: conversation mode and Speaker Mode's read-aloud used to speak only
 * through the browser's own `speechSynthesis`, which tops out at whatever voices the OS
 * happens to have installed — mostly robotic. The browser voice is still the DEFAULT and
 * still free; nothing reaches this file unless the learner explicitly picks a cloud engine
 * in the assistant settings.
 *
 * BILLING: both engines bill to the GCP project via texttospeech.googleapis.com (already
 * enabled on agora-data-driven) — NOT to Vertex, which is a separate line. Auth is the same
 * Application Default Credentials everything else uses: the Cloud Run runtime service
 * account in prod, `gcloud auth application-default login` locally. No API key.
 *
 *   chirp3-hd     ~$30 per 1M characters
 *   gemini-flash  ~$10 per 1M audio-output tokens, billed at 25 tokens/second of speech
 *
 * A spoken assistant reply is ~250 characters / ~15 seconds, so roughly 0.75c and 0.4c per
 * turn respectively. What keeps that true is the 1-to-3-sentence rule in the spoken prompt
 * (`styleRule` in gemini.js) — loosen it and this bill scales with it.
 *
 * 🔴 BOTH engines go through the SAME endpoint, the same auth and the same response shape;
 * they differ only in whether a model id is sent alongside the voice name. That symmetry is
 * why this file is small — keep it when adding a third engine.
 */
import { GoogleAuth } from 'google-auth-library';

// One ADC client for the process, exactly like gemini.js — it caches/refreshes tokens itself.
const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });

const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Cloud TTS itself rejects input over 5,000 bytes, and a spoken reply that long means
// something upstream went wrong (they run ~250 chars). Refusing is cheaper than synthesizing
// a runaway, and it caps the worst case a single request can cost.
export const MAX_TTS_CHARS = 5000;

/**
 * The voices offered in the picker. Both engines are given the SAME eight names on purpose:
 * switching engine keeps your voice, and these are the documented overlap between Chirp 3 HD
 * and Gemini-TTS. Chirp addresses them as `en-US-Chirp3-HD-<Name>`; Gemini takes the bare
 * name plus a `model_name`.
 */
const VOICES = ['Aoede', 'Charon', 'Fenrir', 'Kore', 'Leda', 'Orus', 'Puck', 'Zephyr'];

const DEFAULT_VOICE = 'Aoede';

/**
 * The cloud engines. `browser` is not here and never will be — it is client-side only and
 * never touches the server, which is exactly what makes it the free default.
 */
export const TTS_ENGINES = {
  'chirp3-hd': {
    label: 'Chirp 3 HD',
    note: 'Most natural. Paid — about $30 per 1M characters.',
    // Chirp voices are selected purely by NAME; there is no model field for them.
    voiceName: (v) => `en-US-Chirp3-HD-${v}`,
    modelName: '',
    stylable: false,
  },
  'gemini-flash': {
    label: 'Gemini Flash TTS',
    note: 'Natural and steerable. Paid — the cheaper of the two.',
    // Gemini-TTS takes the bare voice name; the engine is carried by voice.model_name.
    voiceName: (v) => v,
    modelName: 'gemini-2.5-flash-tts',
    stylable: true,
  },
};

/** What the settings picker renders. Server-driven so a voice change is one file, not two. */
export function ttsCatalog() {
  return {
    voices: VOICES,
    defaultVoice: DEFAULT_VOICE,
    engines: Object.entries(TTS_ENGINES).map(([id, e]) => ({ id, label: e.label, note: e.note })),
  };
}

/**
 * Synthesize one utterance. Returns the audio BYTES, not a URL: the client plays it from a
 * blob on our own origin, so no third-party media host is involved and the app's CSP needs
 * no `media-src` widening.
 *
 * Throws on any failure — the caller (and ultimately the browser) falls back to the free
 * browser voice, because a voice mode that goes silent looks broken in a way a slightly
 * worse voice does not.
 */
export async function synthesize({ text, engine, voice, style } = {}) {
  const cfg = TTS_ENGINES[engine];
  if (!cfg) throw new Error(`Unknown voice engine "${engine}"`);

  const said = String(text || '').trim();
  if (!said) throw new Error('Nothing to speak');
  if (said.length > MAX_TTS_CHARS) {
    throw new Error(`Too long to speak (${said.length} characters, limit ${MAX_TTS_CHARS})`);
  }
  // An unknown voice is a stale localStorage value, not an error worth failing a reply over.
  const name = VOICES.includes(voice) ? voice : DEFAULT_VOICE;

  const body = {
    input: { text: said },
    voice: { languageCode: 'en-US', name: cfg.voiceName(name) },
    // MP3 keeps the round trip small and <audio> plays it everywhere with no decoding step.
    audioConfig: { audioEncoding: 'MP3' },
  };
  if (cfg.modelName) body.voice.model_name = cfg.modelName;
  // Style steering is Gemini-only. Sending `prompt` to Chirp is a 400, not a no-op.
  if (cfg.stylable && style) body.input.prompt = String(style);

  const token = await auth.getAccessToken();
  if (!token) throw new Error('Text-to-Speech auth failed: no access token from ADC');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Surface Google's own sentence — "voice not found", "API not enabled", quota — rather
    // than a bare status, because those are the three things that actually go wrong here.
    const detail = await res.text().catch(() => '');
    let msg = detail;
    try { msg = JSON.parse(detail)?.error?.message || detail; } catch { /* not JSON */ }
    throw new Error(`Text-to-Speech failed (${res.status}): ${String(msg).slice(0, 300)}`);
  }

  const json = await res.json();
  if (!json.audioContent) throw new Error('Text-to-Speech returned no audio');
  return {
    audio: Buffer.from(json.audioContent, 'base64'),
    mime: 'audio/mpeg',
    chars: said.length,
    engine,
    voice: name,
  };
}
