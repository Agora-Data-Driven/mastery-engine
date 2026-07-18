/**
 * Kimi transport — a cloud alternative to Gemini via Moonshot AI's
 * OpenAI-compatible Chat Completions API (https://platform.kimi.ai).
 *
 * Unlike Ollama / LM Studio (local, reachability-probed), Kimi is a hosted
 * API, so it's "available" whenever KIMI_API_KEY is configured (wired to
 * Secret Manager on Cloud Run). Models: `kimi-k2.6` (fast, cheap, general)
 * and `kimi-k3` (flagship, best quality). The legacy `kimi-k2-*` preview
 * names retired 2026-05-25, so we no longer surface them.
 */
import { recordUsage } from './usage.js';

const KIMI_KEY = process.env.KIMI_API_KEY;
const BASE = (process.env.KIMI_BASE_URL || 'https://api.moonshot.ai/v1').replace(/\/+$/, '');
const URL = `${BASE}/chat/completions`;
const DEFAULT_MODEL = process.env.KIMI_MODEL || 'kimi-k2.6';

/** Whether Kimi is usable (key present). The UI hides it otherwise. */
export function kimiConfigured() {
  return !!KIMI_KEY;
}

/** Models we surface in the picker (only when a key is configured). */
export function listKimiModels() {
  return KIMI_KEY ? ['kimi-k2.6', 'kimi-k3'] : [];
}

/**
 * Some prompts require a top-level JSON ARRAY, which OpenAI-style
 * `response_format: json_object` forbids — so we do NOT force JSON mode and
 * instead strip any Markdown code fences the model may wrap around its JSON.
 * Callers still JSON.parse the result (and handle parse failures).
 */
function stripFences(text) {
  const s = String(text).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fence ? fence[1].trim() : s;
}

/**
 * kimi-k2.6's thinking toggle defaults to ENABLED server-side, so the "fast"
 * model silently runs a full chain-of-thought unless we opt out. Mirroring
 * the Gemini path, only an explicit `thinking === false` disables it;
 * otherwise we omit the field and let the model's default stand. kimi-k3
 * always reasons (its only control is `reasoning_effort: 'max'`) and errors
 * on `thinking.type: 'disabled'`, so the field is omitted for K3 entirely.
 */
function thinkingField(thinking, model) {
  if ((model || DEFAULT_MODEL).startsWith('kimi-k3')) return {};
  return thinking === false ? { thinking: { type: 'disabled' } } : {};
}

/** Single-prompt completion. Mirrors callGemini's contract (returns text). */
export async function callKimi(prompt, { json = false, model, thinking } = {}) {
  if (!KIMI_KEY) throw new Error('KIMI_API_KEY is not configured');
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_KEY}` },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      ...thinkingField(thinking, model),
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Kimi API ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Kimi returned no content');
  const u = data?.usage || {};
  recordUsage({ provider: 'kimi', model: model || DEFAULT_MODEL, inputTokens: u.prompt_tokens || 0, outputTokens: u.completion_tokens || 0 });
  return json ? stripFences(text) : text;
}

/**
 * Streaming completion (SSE): invokes onToken(textChunk) as tokens arrive.
 * Kimi emits OpenAI-style `data: {choices:[{delta:{content}}]}` lines.
 */
export async function streamKimi(prompt, model, onToken, { thinking } = {}) {
  if (!KIMI_KEY) throw new Error('KIMI_API_KEY is not configured');
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_KEY}` },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      stream_options: { include_usage: true },
      ...thinkingField(thinking, model),
    }),
  });
  if (!res.ok || !res.body) {
    const txt = res.body ? await res.text().catch(() => '') : '';
    throw new Error(`Kimi API ${res.status}: ${txt.slice(0, 300)}`);
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
  recordUsage({ provider: 'kimi', model: model || DEFAULT_MODEL, inputTokens: usage?.prompt_tokens || 0, outputTokens: usage?.completion_tokens || 0 });
}
