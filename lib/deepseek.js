/**
 * DeepSeek transport — a cloud alternative to Gemini via DeepSeek's
 * OpenAI-compatible Chat Completions API.
 *
 * Unlike Ollama / LM Studio (local, reachability-probed), DeepSeek is a hosted
 * API, so it's "available" whenever DEEPSEEK_API_KEY is configured (wired to
 * Secret Manager on Cloud Run). Models: `deepseek-v4-flash` (fast, cheap,
 * general) and `deepseek-v4-pro` (larger, best quality). The legacy
 * `deepseek-chat`/`deepseek-reasoner` names retire 2026-07-24 and map to
 * v4-flash's non-thinking / thinking modes, so we no longer surface them.
 */
import { recordUsage } from './usage.js';

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const BASE = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const URL = `${BASE}/chat/completions`;
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

/** Whether DeepSeek is usable (key present). The UI hides it otherwise. */
export function deepseekConfigured() {
  return !!DEEPSEEK_KEY;
}

/** Models we surface in the picker (only when a key is configured). */
export function listDeepSeekModels() {
  return DEEPSEEK_KEY ? ['deepseek-v4-flash', 'deepseek-v4-pro'] : [];
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

/** Single-prompt completion. Mirrors callGemini's contract (returns text). */
export async function callDeepSeek(prompt, { json = false, model } = {}) {
  if (!DEEPSEEK_KEY) throw new Error('DEEPSEEK_API_KEY is not configured');
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`DeepSeek API ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('DeepSeek returned no content');
  const u = data?.usage || {};
  recordUsage({ provider: 'deepseek', model: model || DEFAULT_MODEL, inputTokens: u.prompt_tokens || 0, outputTokens: u.completion_tokens || 0 });
  return json ? stripFences(text) : text;
}

/**
 * Streaming completion (SSE): invokes onToken(textChunk) as tokens arrive.
 * DeepSeek emits OpenAI-style `data: {choices:[{delta:{content}}]}` lines.
 */
export async function streamDeepSeek(prompt, model, onToken) {
  if (!DEEPSEEK_KEY) throw new Error('DEEPSEEK_API_KEY is not configured');
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
  if (!res.ok || !res.body) {
    const txt = res.body ? await res.text().catch(() => '') : '';
    throw new Error(`DeepSeek API ${res.status}: ${txt.slice(0, 300)}`);
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
  recordUsage({ provider: 'deepseek', model: model || DEFAULT_MODEL, inputTokens: usage?.prompt_tokens || 0, outputTokens: usage?.completion_tokens || 0 });
}
