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

/*
 * Reasoning models (the qwen3 family especially) spend a long time in a <think> scratchpad before
 * the first useful token, and that scratchpad also corrupts JSON parsing when it leaks into the
 * response. Suppressing it is the single biggest latency win on a laptop, so it is ON by default.
 * Set LMSTUDIO_NO_THINK=0 to let models think normally.
 *
 * Two switches, because there is no standard: `chat_template_kwargs.enable_thinking` is the
 * structured form LM Studio passes into the chat template, and `/no_think` is qwen's own in-prompt
 * soft switch. The in-prompt marker is only appended for qwen-family ids so it cannot leak into
 * another model's prompt as a stray token.
 */
const NO_THINK = process.env.LMSTUDIO_NO_THINK !== '0';
const wantsNoThinkMarker = (model) => /qwen\s*3|qwen3/i.test(String(model || ''));

/** Strip a reasoning scratchpad out of a finished response. */
function stripThink(text) {
  return String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    // A close tag with no open (the model started mid-thought): drop everything up to it.
    .replace(/^[\s\S]*?<\/think>/i, '')
    // An open tag that never closes — the model hit the token cap while still thinking. Everything
    // after it is scratchpad, not answer, so it goes too.
    .replace(/<think>[\s\S]*$/i, '')
    .trim();
}

/**
 * Wrap an onToken callback so text inside <think>…</think> is reported as kind 'thinking' rather
 * than as answer content — the same contract the other providers use, so the UI shows a reasoning
 * trace instead of splicing the scratchpad into the reply. Chunk boundaries can fall inside a tag,
 * so partial tags are held back until they resolve.
 */
function makeThinkFilter(onToken) {
  const OPEN = '<think>';
  const CLOSE = '</think>';
  let buf = '';
  let inThink = false;
  const couldStartTag = (s) => {
    const tag = inThink ? CLOSE : OPEN;
    for (let i = 1; i < tag.length; i += 1) if (s.endsWith(tag.slice(0, i))) return true;
    return false;
  };
  const emit = (chunk) => {
    buf += chunk;
    for (;;) {
      const tag = inThink ? CLOSE : OPEN;
      const at = buf.indexOf(tag);
      if (at < 0) break;
      const before = buf.slice(0, at);
      if (before) onToken(before, inThink ? 'thinking' : 'content');
      buf = buf.slice(at + tag.length);
      inThink = !inThink;
    }
    // Emit everything that cannot be the start of a tag we are still waiting to complete.
    if (buf && !couldStartTag(buf)) {
      onToken(buf, inThink ? 'thinking' : 'content');
      buf = '';
    }
  };
  /* Release whatever was held back as a possible partial tag. Without this a response ending in a
   * character that could begin "<think>" (a bare "<") would silently lose it. */
  emit.flush = () => {
    if (buf) onToken(buf, inThink ? 'thinking' : 'content');
    buf = '';
  };
  return emit;
}

/*
 * How this build of LM Studio wants JSON requested.
 *
 * Older builds accept OpenAI's `{type:'json_object'}`. Newer ones reject it outright with
 * "'response_format.type' must be 'json_schema' or 'text'". We cannot know which is running (it is
 * whatever the user installed), and guessing wrong fails every AI feature in the app.
 *
 * So we start with json_object and, on the specific 400 that says otherwise, drop the flag and
 * retry. The prompts already instruct the model to answer in JSON and gemini.js repairs loose JSON
 * on the way out, so an un-enforced request is a mild quality trade, not a failure. The answer is
 * remembered for the process so it costs one extra round-trip, once.
 */
let jsonMode = null; // null = not yet probed, 'json_object' | 'off'
const isResponseFormatComplaint = (status, txt) => status === 400 && /response_format/i.test(txt || '');

/** Build the OpenAI-style chat body shared by the blocking and streaming paths. */
function chatBody(prompt, { model, json = false, stream = false, mode = 'json_object' } = {}) {
  const id = model || DEFAULT_MODEL;
  const content = NO_THINK && wantsNoThinkMarker(id) ? `${prompt}\n\n/no_think` : prompt;
  const body = {
    model: id,
    messages: [{ role: 'user', content }],
    stream,
    max_tokens: MAX_TOKENS,
    temperature: 0.7,
  };
  // Ask for a final usage chunk when streaming (OpenAI-style; harmless if ignored).
  if (stream) body.stream_options = { include_usage: true };
  if (NO_THINK) body.chat_template_kwargs = { enable_thinking: false };
  if (json && mode === 'json_object') body.response_format = { type: 'json_object' };
  return body;
}

/**
 * POST a chat completion. ALWAYS streams on the wire, even for the blocking API below.
 *
 * With `stream:false` LM Studio sends no response headers until the entire completion is finished,
 * so a long generation on a laptop trips undici's 300s headers timeout and fetch rejects with
 * UND_ERR_HEADERS_TIMEOUT — the whole answer thrown away after minutes of work. Streaming makes the
 * headers arrive immediately and the connection stay active, so only genuine stalls fail.
 */
const postChat = (prompt, { model, json, mode }) =>
  fetch(`${LMSTUDIO_HOST}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chatBody(prompt, { model, json, mode, stream: true })),
  });

/** Consume an OpenAI-style SSE body, forwarding chunks to onToken(text, kind). Returns usage. */
async function readSse(res, onToken) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let usage = null;
  const emit = makeThinkFilter(onToken);
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
        const delta = obj?.choices?.[0]?.delta || {};
        // Some builds stream the scratchpad in its own field rather than as inline tags.
        if (delta.reasoning_content) onToken(delta.reasoning_content, 'thinking');
        if (delta.content) emit(delta.content);
        if (obj?.usage) usage = obj.usage;
      } catch {
        /* ignore keep-alive / partial lines */
      }
    }
  }
  emit.flush();
  return usage;
}

/** Single-prompt completion. Mirrors callGemini's contract (returns text). */
export async function callLMStudio(prompt, { json = false, model } = {}) {
  const post = (mode) => postChat(prompt, { model, json, mode });

  // Decide the mode ONCE, and base the retry on what THIS call actually sent — not on the shared
  // `jsonMode`, which a concurrent first call may have already flipped. Gating on the shared value
  // meant that when two requests probed at the same time (the graph builder runs two at once), the
  // loser saw jsonMode === 'off', skipped its own retry, and threw the 400 it should have absorbed.
  const modeUsed = json ? (jsonMode || 'json_object') : 'off';
  let res = await post(modeUsed);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (modeUsed === 'json_object' && isResponseFormatComplaint(res.status, txt)) {
      jsonMode = 'off'; // this build wants json_schema or text — stop sending json_object
      res = await post('off');
      if (!res.ok) {
        const t2 = await res.text().catch(() => '');
        throw new Error(`LM Studio ${res.status}: ${t2.slice(0, 200)}`);
      }
    } else {
      throw new Error(`LM Studio ${res.status}: ${txt.slice(0, 200)}`);
    }
  } else if (modeUsed === 'json_object') {
    jsonMode = 'json_object'; // it worked; remember and stop probing
  }
  if (!res.body) throw new Error('LM Studio returned no body');

  // Accumulate the answer, discarding the reasoning trace: this is the path hints, explanations,
  // study guides and JSON generation use, and none of them want the scratchpad.
  let raw = '';
  const u = (await readSse(res, (t, kind) => { if (kind !== 'thinking') raw += t; })) || {};
  recordUsage({ provider: 'lmstudio', model: model || DEFAULT_MODEL, inputTokens: u.prompt_tokens || 0, outputTokens: u.completion_tokens || 0 });
  // Belt and braces: the filter handles inline tags, this catches anything that slipped through.
  const text = stripThink(raw);
  if (!text) {
    // Nothing but scratchpad: the model spent its whole budget thinking. Say so plainly rather than
    // handing back reasoning dressed up as an answer, or an empty string that reads as a silent bug.
    throw new Error(
      'LM Studio returned only reasoning, no answer — the model hit its token cap while thinking. '
      + 'Try a non-reasoning model, or raise LMSTUDIO_MAX_TOKENS.',
    );
  }
  return text;
}

/**
 * Streaming completion: invokes onToken(textChunk) as tokens arrive.
 * LM Studio streams OpenAI-style SSE: `data: {...}` lines, each carrying
 * choices[0].delta.content, terminated by a `data: [DONE]` sentinel.
 */
export async function streamLMStudio(prompt, model, onToken) {
  const res = await postChat(prompt, { model, json: false, mode: 'off' });
  if (!res.ok || !res.body) {
    const txt = res.body ? await res.text().catch(() => '') : '';
    throw new Error(`LM Studio ${res.status}: ${txt.slice(0, 200)}`);
  }
  // readSse routes <think>…</think> to kind 'thinking', so callers that only want the answer can
  // drop it and callers that surface a reasoning trace get one.
  const usage = await readSse(res, onToken);
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
