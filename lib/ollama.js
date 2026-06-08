/**
 * Ollama transport - a local, drop-in alternative to Gemini.
 *
 * Ollama runs on the user's own machine (default http://127.0.0.1:11434), so
 * this only works when the server itself can reach it - i.e. when the app is
 * run locally. On Cloud Run these calls fail fast (connection refused) and the
 * UI simply offers Gemini only.
 */
const OLLAMA_HOST = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, '');
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

/** Single-prompt completion. Mirrors callGemini's contract (returns text). */
export async function callOllama(prompt, { json = false, model } = {}) {
  const body = {
    model: model || DEFAULT_MODEL,
    prompt,
    stream: false,
  };
  if (json) body.format = 'json'; // Ollama-enforced JSON output

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Ollama ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.response;
  if (!text) throw new Error('Ollama returned no content');
  return text;
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
