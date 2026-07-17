/**
 * Anthropic (Claude) transport — the highest-quality authoring engine.
 *
 * Used for the Academy question bank: Claude (Opus/Sonnet) writes far stronger
 * scenario-based MCQs and distractors than the cheaper models. Called through
 * the same `complete()` dispatcher as the others (provider: 'anthropic'), so any
 * existing generator (generateQuestionsFromTranscript, generateQuestions, …)
 * can run on Claude just by passing { provider: 'anthropic', model }.
 *
 * Direct Messages API (api.anthropic.com) — NOT Vertex, because the GCP project
 * has no Vertex-Anthropic quota (the SEO pipeline hit the same wall and uses the
 * direct API too). Key: ANTHROPIC_API_KEY (Secret Manager `SEO_ANTHROPIC_API_KEY`
 * mounted under that name on Cloud Run). Absent key => provider is simply hidden.
 */
import { recordUsage } from './usage.js';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const BASE = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '');
const URL = `${BASE}/v1/messages`;
const VERSION = '2023-06-01';
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
// Generation asks for a handful of MCQs; 8k leaves generous headroom so a long
// answer is never truncated mid-JSON (a real failure mode with tight caps).
const DEFAULT_MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS || 8192);

/** Whether Claude is usable (key present). The UI hides it otherwise. */
export function anthropicConfigured() {
  return !!ANTHROPIC_KEY;
}

/** Models we surface in the picker (only when a key is configured). */
export function listAnthropicModels() {
  return ANTHROPIC_KEY ? ['claude-opus-4-8', 'claude-sonnet-5'] : [];
}

/** Strip any Markdown code fences so callers can JSON.parse the payload. */
function stripFences(text) {
  const s = String(text).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fence ? fence[1].trim() : s;
}

/** Single-prompt completion. Mirrors callDeepSeek's contract (returns text). */
export async function callAnthropic(prompt, { json = false, model, maxTokens } = {}) {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY is not configured');
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': VERSION,
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: maxTokens || DEFAULT_MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Anthropic API ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  // content is an array of blocks; concatenate the text blocks.
  const text = (data?.content || []).filter((b) => b?.type === 'text').map((b) => b.text).join('');
  if (!text) throw new Error('Anthropic returned no content');
  const u = data?.usage || {};
  recordUsage({ provider: 'anthropic', model: model || DEFAULT_MODEL, inputTokens: u.input_tokens || 0, outputTokens: u.output_tokens || 0 });
  return json ? stripFences(text) : text;
}

/**
 * Streaming completion (SSE): invokes onToken(textChunk) as tokens arrive.
 * Anthropic emits `event: content_block_delta` with `{delta:{type:'text_delta',text}}`.
 */
export async function streamAnthropic(prompt, model, onToken, { maxTokens } = {}) {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY is not configured');
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': VERSION,
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: maxTokens || DEFAULT_MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const txt = res.body ? await res.text().catch(() => '') : '';
    throw new Error(`Anthropic API ${res.status}: ${txt.slice(0, 300)}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let inTok = 0;
  let outTok = 0;
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
      if (!payload) continue;
      try {
        const obj = JSON.parse(payload);
        if (obj?.type === 'content_block_delta' && obj?.delta?.text) onToken(obj.delta.text);
        if (obj?.type === 'message_start' && obj?.message?.usage) inTok = obj.message.usage.input_tokens || 0;
        if (obj?.usage?.output_tokens != null) outTok = obj.usage.output_tokens;
      } catch {
        /* ignore keep-alive / partial lines */
      }
    }
  }
  recordUsage({ provider: 'anthropic', model: model || DEFAULT_MODEL, inputTokens: inTok, outputTokens: outTok });
}
