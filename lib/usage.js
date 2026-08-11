/**
 * AI token/cost accounting for the on-screen cost calculator.
 *
 * Every provider call (Gemini, DeepSeek, Ollama, LM Studio, cloud TTS) reports
 * usage via `recordUsage`. An AsyncLocalStorage store scopes those records to
 * the in-flight HTTP request, so server.js can wrap a request in `runWithUsage`,
 * let the handler run (streaming or not), and read the accumulated tally when
 * the response finishes — then persist it per user.
 *
 * PRICING is approximate and EDITABLE — USD per 1,000,000 tokens. Local engines
 * (Ollama / LM Studio) run on the user's machine, so they're always $0 (tokens
 * are still counted for information). Update these as provider prices change.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

const als = new AsyncLocalStorage();

// USD per 1,000,000 tokens. "in" = input/prompt, "out" = output (thinking tokens
// are billed as output). Approximate — adjust to match your billing.
export const PRICING = {
  'gemini-2.5-flash': { in: 0.30, out: 2.50 },
  'gemini-2.5-pro': { in: 1.25, out: 10.0 },
  'gemini-3.1-pro-preview': { in: 2.0, out: 12.0 },
  'gemini-2.5-pro-preview': { in: 1.25, out: 10.0 },
  'deepseek-v4-flash': { in: 0.28, out: 0.42 },
  'deepseek-v4-pro': { in: 0.55, out: 2.19 },
  // Kimi Code is a flat subscription (weekly quota), not per-token billing, so
  // its marginal token cost is $0 — tokens are still counted for information.
  'k3': { in: 0, out: 0 },
  'kimi-for-coding': { in: 0, out: 0 },
  'kimi-for-coding-highspeed': { in: 0, out: 0 },
  'claude-opus-4-8': { in: 5.0, out: 25.0 },
  'claude-sonnet-5': { in: 3.0, out: 15.0 },
};
const FREE = { in: 0, out: 0 };

// Voice synthesis pricing is centralized here with the text-model pricing above.
// Chirp bills per character. Gemini-TTS bills input text tokens plus output audio
// tokens; Google exposes no usage metadata on the synthesize response, so the
// token counts are estimates used only for cost visibility.
export const TTS_PRICING = {
  'chirp3-hd': {
    label: 'Chirp 3 HD',
    characterUsdPerMillion: 30,
  },
  'gemini-2.5-flash-tts': {
    label: 'Gemini 2.5 Flash TTS',
    textInputUsdPerMillionTokens: 0.50,
    audioOutputUsdPerMillionTokens: 10,
    audioTokensPerSecond: 25,
    // Spoken assistant replies average about 250 chars / 15 seconds in this app.
    estimatedCharsPerSecond: 250 / 15,
    estimatedTextCharsPerToken: 4,
  },
};

function priceFor(provider, model) {
  if (provider === 'ollama' || provider === 'lmstudio') return FREE; // local = free
  if (!model) return FREE;
  if (PRICING[model]) return PRICING[model];
  // Fall back to a prefix match for versioned ids (e.g. "gemini-2.5-flash-002").
  const key = Object.keys(PRICING).find((k) => model.startsWith(k));
  return key ? PRICING[key] : FREE;
}

// Per-character/token twin of priceFor for the voice engines (TTS_PRICING).
function ttsPriceFor(model) {
  if (!model) return null;
  if (TTS_PRICING[model]) return TTS_PRICING[model];
  const key = Object.keys(TTS_PRICING).find((k) => model.startsWith(k));
  return key ? TTS_PRICING[key] : null;
}

function cleanCount(n) {
  return Math.max(0, Math.ceil(Number(n) || 0));
}

/** Estimate one TTS call's usage and cost from the text length we submitted. */
export function estimateTtsUsage(model, chars = 0) {
  const ttsChars = cleanCount(chars);
  const p = ttsPriceFor(model);
  const out = {
    label: p?.label || '',
    ttsChars,
    ttsInputTokens: 0,
    ttsAudioTokens: 0,
    costUsd: 0,
  };
  if (!ttsChars || !p) return out;
  if (p.characterUsdPerMillion != null) {
    out.costUsd = (ttsChars / 1e6) * p.characterUsdPerMillion;
    return out;
  }
  const charsPerTextToken = p.estimatedTextCharsPerToken || 4;
  const charsPerSecond = p.estimatedCharsPerSecond || (250 / 15);
  const audioTokensPerSecond = p.audioTokensPerSecond || 25;
  out.ttsInputTokens = cleanCount(ttsChars / charsPerTextToken);
  out.ttsAudioTokens = cleanCount((ttsChars / charsPerSecond) * audioTokensPerSecond);
  out.costUsd =
    (out.ttsInputTokens / 1e6) * (p.textInputUsdPerMillionTokens || 0) +
    (out.ttsAudioTokens / 1e6) * (p.audioOutputUsdPerMillionTokens || 0);
  return out;
}

/** A fresh, empty tally. */
export function newUsage() {
  return {
    inputTokens: 0,
    outputTokens: 0,
    ttsChars: 0,
    ttsInputTokens: 0,
    ttsAudioTokens: 0,
    costUsd: 0,
    calls: 0,
    byModel: {},
  };
}

/** Run `fn` with `store` as the active usage tally (async-context scoped). */
export function runWithUsage(store, fn) {
  return als.run(store, fn);
}

/**
 * The per-user AI access policy resolved for the in-flight request — server.js
 * stores it on the same request-scoped store it opens for usage accounting.
 * null = unrestricted (admins, and requests outside an HTTP context, e.g. gen
 * jobs an admin steps); { providers: [...] } = only those providers may serve
 * the request. Read at the complete()/completeStream() choke point in
 * lib/gemini.js so EVERY AI path is covered without threading a new argument
 * through every prompt builder.
 */
export function aiPolicy() {
  const store = als.getStore();
  return store && store.aiPolicy ? store.aiPolicy : null;
}

/**
 * Record one provider call's usage into the active request tally (no-op when
 * there's no active store, e.g. a call outside an HTTP request).
 *
 * A voice-synthesis call passes `chars` instead of text-model tokens (lib/tts.js):
 * cost comes from TTS_PRICING, text token totals stay text-only, and the engine
 * id lands in byModel as its own spend row.
 */
export function recordUsage({ provider, model, inputTokens = 0, outputTokens = 0, chars = 0, label = '' }) {
  const store = als.getStore();
  if (!store) return;
  let cost;
  const tts = chars > 0 ? estimateTtsUsage(model, chars) : null;
  inputTokens = cleanCount(inputTokens);
  outputTokens = cleanCount(outputTokens);
  if (tts) {
    cost = tts.costUsd;
    store.ttsChars = (store.ttsChars || 0) + tts.ttsChars;
    store.ttsInputTokens = (store.ttsInputTokens || 0) + tts.ttsInputTokens;
    store.ttsAudioTokens = (store.ttsAudioTokens || 0) + tts.ttsAudioTokens;
  } else {
    const p = priceFor(provider, model);
    cost = (inputTokens / 1e6) * p.in + (outputTokens / 1e6) * p.out;
    store.inputTokens += inputTokens;
    store.outputTokens += outputTokens;
  }
  store.costUsd += cost;
  store.calls += 1;
  const key = model || provider || 'unknown';
  const m = store.byModel[key] || (store.byModel[key] = {
    inputTokens: 0,
    outputTokens: 0,
    ttsChars: 0,
    ttsInputTokens: 0,
    ttsAudioTokens: 0,
    costUsd: 0,
    calls: 0,
  });
  if (provider) m.provider = provider;
  if (tts) m.kind = 'tts';
  const rowLabel = label || tts?.label || '';
  if (rowLabel) m.label = rowLabel;
  m.inputTokens += inputTokens;
  m.outputTokens += outputTokens;
  if (tts) {
    m.ttsChars = (m.ttsChars || 0) + tts.ttsChars;
    m.ttsInputTokens = (m.ttsInputTokens || 0) + tts.ttsInputTokens;
    m.ttsAudioTokens = (m.ttsAudioTokens || 0) + tts.ttsAudioTokens;
  }
  m.costUsd += cost;
  m.calls += 1;
}
