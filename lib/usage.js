/**
 * AI token/cost accounting for the on-screen cost calculator.
 *
 * Every provider call (Gemini, DeepSeek, Ollama, LM Studio) reports its token
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
};
const FREE = { in: 0, out: 0 };

function priceFor(provider, model) {
  if (provider === 'ollama' || provider === 'lmstudio') return FREE; // local = free
  if (!model) return FREE;
  if (PRICING[model]) return PRICING[model];
  // Fall back to a prefix match for versioned ids (e.g. "gemini-2.5-flash-002").
  const key = Object.keys(PRICING).find((k) => model.startsWith(k));
  return key ? PRICING[key] : FREE;
}

/** A fresh, empty tally. */
export function newUsage() {
  return { inputTokens: 0, outputTokens: 0, costUsd: 0, calls: 0, byModel: {} };
}

/** Run `fn` with `store` as the active usage tally (async-context scoped). */
export function runWithUsage(store, fn) {
  return als.run(store, fn);
}

/**
 * Record one provider call's usage into the active request tally (no-op when
 * there's no active store, e.g. a call outside an HTTP request).
 */
export function recordUsage({ provider, model, inputTokens = 0, outputTokens = 0 }) {
  const store = als.getStore();
  if (!store) return;
  const p = priceFor(provider, model);
  const cost = (inputTokens / 1e6) * p.in + (outputTokens / 1e6) * p.out;
  store.inputTokens += inputTokens;
  store.outputTokens += outputTokens;
  store.costUsd += cost;
  store.calls += 1;
  const key = model || provider || 'unknown';
  const m = store.byModel[key] || (store.byModel[key] = { inputTokens: 0, outputTokens: 0, costUsd: 0, calls: 0 });
  m.inputTokens += inputTokens;
  m.outputTokens += outputTokens;
  m.costUsd += cost;
  m.calls += 1;
}
