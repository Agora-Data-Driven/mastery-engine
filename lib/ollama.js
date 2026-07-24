/**
 * Ollama transport - a local, drop-in alternative to Gemini.
 *
 * Ollama runs on the user's own machine (default http://127.0.0.1:11434), so
 * this only works when the server itself can reach it - i.e. when the app is
 * run locally. On Cloud Run these calls fail fast (connection refused) and the
 * UI simply offers Gemini only.
 */
import { recordUsage } from './usage.js';

const OLLAMA_HOST = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, '');
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';
// Ollama defaults to a 4096-token context, which truncates our longer prompts
// (the LaTeX migration batches and section reviews). Bump it; override via env.
const NUM_CTX = parseInt(process.env.OLLAMA_NUM_CTX || '8192', 10);
// Keep the model resident between requests so there's no cold-start reload.
const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || '30m';

/**
 * POST a generation. ALWAYS streams on the wire, even for the blocking call below.
 *
 * With `stream:false` Ollama withholds response headers until the whole generation is done, so a
 * long answer on a laptop trips undici's 300s headers timeout and fetch rejects with
 * UND_ERR_HEADERS_TIMEOUT — minutes of work discarded. Streaming returns headers immediately and
 * keeps the connection active, so only a genuine stall fails.
 */
const postGenerate = (prompt, { model, json }) =>
  fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      prompt,
      stream: true,
      keep_alive: KEEP_ALIVE,
      options: { num_ctx: NUM_CTX },
      ...(json ? { format: 'json' } : {}), // Ollama-enforced JSON output
    }),
  });

/** Consume Ollama's newline-delimited JSON stream, forwarding text to onToken. Returns usage. */
async function readNdjson(res, onToken) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let usage = { prompt_eval_count: 0, eval_count: 0 };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.response) onToken(obj.response);
        if (obj.done) usage = { prompt_eval_count: obj.prompt_eval_count || 0, eval_count: obj.eval_count || 0 };
      } catch {
        /* ignore partial/non-JSON lines */
      }
    }
  }
  return usage;
}

/** Single-prompt completion. Mirrors callGemini's contract (returns text). */
export async function callOllama(prompt, { json = false, model } = {}) {
  const res = await postGenerate(prompt, { model, json });
  if (!res.ok || !res.body) {
    const txt = res.body ? await res.text().catch(() => '') : '';
    throw new Error(`Ollama ${res.status}: ${txt.slice(0, 200)}`);
  }
  let text = '';
  const usage = await readNdjson(res, (t) => { text += t; });
  if (!text) throw new Error('Ollama returned no content');
  recordUsage({ provider: 'ollama', model: model || DEFAULT_MODEL, inputTokens: usage.prompt_eval_count, outputTokens: usage.eval_count });
  return text;
}

/**
 * Streaming completion: invokes onToken(textChunk) as tokens arrive.
 * Ollama streams newline-delimited JSON objects ({ response, done }).
 */
export async function streamOllama(prompt, model, onToken) {
  const res = await postGenerate(prompt, { model, json: false });
  if (!res.ok || !res.body) {
    const txt = res.body ? await res.text().catch(() => '') : '';
    throw new Error(`Ollama ${res.status}: ${txt.slice(0, 200)}`);
  }
  const usage = await readNdjson(res, onToken);
  recordUsage({ provider: 'ollama', model: model || DEFAULT_MODEL, inputTokens: usage.prompt_eval_count, outputTokens: usage.eval_count });
}

/**
 * List locally available model names. Returns [] (never throws) if Ollama is
 * unreachable, with a short timeout so a cloud deployment isn't slowed down.
 */
export async function listOllamaModels() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1500);
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: ctrl.signal });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.models || []).map((m) => m.name).filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
