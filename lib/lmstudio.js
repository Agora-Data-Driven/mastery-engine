/**
 * LM Studio transport - a local, drop-in alternative to Gemini.
 *
 * LM Studio exposes an OpenAI-compatible server (default
 * http://127.0.0.1:1234/v1), so we talk to /v1/chat/completions and /v1/models
 * rather than Ollama's native API. Like Ollama, it runs on the user's own
 * machine, so this only works when the server itself can reach it - i.e. when
 * the app is run locally. On Cloud Run these calls fail fast (connection
 * refused) and the UI simply offers Gemini only.
 *
 * Mirrors lib/ollama.js's contract so lib/gemini.js can dispatch to either.
 */
import { recordUsage } from './usage.js';

const LMSTUDIO_HOST = (process.env.LMSTUDIO_HOST || 'http://127.0.0.1:1234').replace(/\/+$/, '');
// How long the availability probe waits. Local is instant (1.5s is plenty), but
// when LMSTUDIO_HOST is a public tunnel (e.g. reaching a laptop from Cloud Run),
// the round-trip is slower — raise this via env so it isn't falsely "down".
const PROBE_MS = parseInt(process.env.LMSTUDIO_PROBE_MS || '1500', 10);
// Optional allowlist for the model picker. Comma-separated, case-insensitive
// substrings; a loaded model is offered only if its id contains one of them.
// Unset = offer everything LM Studio has loaded. e.g. "gemma-4,ornith-1.0-9b,qwen3.5-9b".
const MODEL_ALLOW = (process.env.LMSTUDIO_MODELS || '')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
// LM Studio serves whatever model is loaded (or JIT-loads by id). If unset we
// send a placeholder and let LM Studio route to the currently loaded model.
const DEFAULT_MODEL = process.env.LMSTUDIO_MODEL || 'local-model';
// Cap on generated tokens. -1 means "until the context is full" (LM Studio's
// own default), which we want so long outputs (reviews, batches) aren't cut off.
const MAX_TOKENS = parseInt(process.env.LMSTUDIO_MAX_TOKENS || '-1', 10);

/** Build the OpenAI-style chat body shared by the blocking and streaming paths. */
function chatBody(prompt, { model, json = false, stream = false } = {}) {
  const body = {
    model: model || DEFAULT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    stream,
    max_tokens: MAX_TOKENS,
    temperature: 0.7,
  };
  // Ask for a final usage chunk when streaming (OpenAI-style; harmless if ignored).
  if (stream) body.stream_options = { include_usage: true };
  // OpenAI-style enforced JSON output (LM Studio supports json_object).
  if (json) body.response_format = { type: 'json_object' };
  return body;
}

/** Single-prompt completion. Mirrors callGemini's contract (returns text). */
export async function callLMStudio(prompt, { json = false, model } = {}) {
  const res = await fetch(`${LMSTUDIO_HOST}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chatBody(prompt, { model, json })),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`LM Studio ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('LM Studio returned no content');
  const u = data?.usage || {};
  recordUsage({ provider: 'lmstudio', model: model || DEFAULT_MODEL, inputTokens: u.prompt_tokens || 0, outputTokens: u.completion_tokens || 0 });
  return text;
}

/**
 * Streaming completion: invokes onToken(textChunk) as tokens arrive.
 * LM Studio streams OpenAI-style SSE: `data: {...}` lines, each carrying
 * choices[0].delta.content, terminated by a `data: [DONE]` sentinel.
 */
export async function streamLMStudio(prompt, model, onToken) {
  const res = await fetch(`${LMSTUDIO_HOST}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chatBody(prompt, { model, stream: true })),
  });
  if (!res.ok || !res.body) {
    const txt = res.body ? await res.text().catch(() => '') : '';
    throw new Error(`LM Studio ${res.status}: ${txt.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let usage = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload);
        const t = obj?.choices?.[0]?.delta?.content;
        if (t) onToken(t);
        if (obj?.usage) usage = obj.usage;
      } catch {
        /* ignore keep-alive / partial lines */
      }
    }
  }
  recordUsage({ provider: 'lmstudio', model: model || DEFAULT_MODEL, inputTokens: usage?.prompt_tokens || 0, outputTokens: usage?.completion_tokens || 0 });
}

/**
 * List loaded/available model ids. Returns [] (never throws) if LM Studio is
 * unreachable, with a short timeout so a cloud deployment isn't slowed down.
 */
export async function listLMStudioModels() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_MS);
  try {
    const res = await fetch(`${LMSTUDIO_HOST}/v1/models`, { signal: ctrl.signal });
    if (!res.ok) return [];
    const data = await res.json();
    let ids = (data?.data || []).map((m) => m.id).filter(Boolean);
    if (MODEL_ALLOW.length) {
      ids = ids.filter((id) => MODEL_ALLOW.some((tok) => id.toLowerCase().includes(tok)));
    }
    return ids;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
