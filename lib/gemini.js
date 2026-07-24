/**
 * Gemini-backed "Wise Teacher" question generator.
 * Ported from Code.gs handleGenSelection.
 *
 * BILLING: this calls Gemini through **Vertex AI** (aiplatform.googleapis.com),
 * so usage is billed to the GCP project's Vertex AI line — NOT the standalone
 * AI Studio "Gemini API" (generativelanguage.googleapis.com + ?key=API_KEY),
 * which is what this used to use. Auth is Application Default Credentials: the
 * Cloud Run runtime service account in prod (needs roles/aiplatform.user), or
 * `gcloud auth application-default login` locally — the same ADC Firestore uses.
 * No GEMINI_API_KEY is required anymore.
 */
import { GoogleAuth } from 'google-auth-library';
import { callOllama, streamOllama } from './ollama.js';
import { callLMStudio, streamLMStudio } from './lmstudio.js';
import { callDeepSeek, streamDeepSeek } from './deepseek.js';
import { callKimi, streamKimi } from './kimi.js';
import { callAnthropic, streamAnthropic } from './anthropic.js';
import { recordUsage } from './usage.js';
import { readFileSync } from 'node:fs';

// The assistant's "self-knowledge": a single authoritative doc (the same one humans read) describing
// how the engine works, its exact formulas, and the research it's built on. Loaded once and injected
// into the assistant prompt so it can answer "what's your mastery formula?" / "what research is this
// based on?" accurately. Missing file degrades gracefully (assistant still works, just less self-aware).
let _appKnowledge;   // undefined = not loaded yet; string (possibly '') once loaded
function appKnowledge() {
  if (_appKnowledge !== undefined) return _appKnowledge;
  try { _appKnowledge = readFileSync(new URL('../docs/HOW-IT-WORKS.md', import.meta.url), 'utf8').trim(); }
  catch { _appKnowledge = ''; }
  return _appKnowledge;
}
// Only spend the tokens on the FULL doc when the question is actually about the app/engine/research;
// otherwise a one-line identity is enough for a "explain this card" style turn.
const META_QUESTION_RE = /\b(you|your|yourself|this app|this tool|mastery engine|the engine|formula|priorit|spaced|repetition|algorithm|research|paper|study|based on|how (do(es)?|is) (you|it|this|the)|what are you|who (made|built)|architecture|academy|drill|weakness|mastery)\b/i;
const APP_IDENTITY = 'You are the built-in study assistant of the AGORA Mastery Engine, a spaced-repetition mastery-learning app.';
function knowledgeBlock(message) {
  const full = appKnowledge();
  if (full && META_QUESTION_RE.test(String(message || ''))) {
    return `ABOUT THIS APP — AUTHORITATIVE GROUND TRUTH (you ARE this app; answer questions about how it works, its exact formulas, and the research behind it from THIS, not from guesses):\n\n${full}`;
  }
  return APP_IDENTITY;
}

/** Record a Gemini call's token usage (thinking tokens are billed as output). */
function recordGeminiUsage(model, um) {
  if (!um) return;
  const input = um.promptTokenCount || 0;
  let output = (um.candidatesTokenCount || 0) + (um.thoughtsTokenCount || 0);
  if (!output && um.totalTokenCount) output = Math.max(0, um.totalTokenCount - input);
  recordUsage({ provider: 'gemini', model, inputTokens: input, outputTokens: output });
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
// Vertex region. "global" serves the 2.5 models everywhere and avoids regional
// capacity errors; override with a region (e.g. us-central1) if data residency
// requires it.
const LOCATION = process.env.GEMINI_LOCATION || 'global';

// One ADC client for the whole process; it caches/refreshes access tokens itself.
const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
let projectIdPromise; // resolved once from the metadata server / ADC / env

async function projectId() {
  if (!projectIdPromise) {
    projectIdPromise = auth.getProjectId().catch((e) => {
      projectIdPromise = undefined; // let a later call retry
      throw new Error(
        `Could not determine the GCP project for Vertex AI (set GOOGLE_CLOUD_PROJECT or run 'gcloud auth application-default login'): ${e.message}`,
      );
    });
  }
  return projectIdPromise;
}

/** Build the Vertex REST target + a fresh bearer token for a model/method. */
async function vertexTarget(model, method, sse = false) {
  const project = await projectId();
  const host = LOCATION === 'global' ? 'aiplatform.googleapis.com' : `${LOCATION}-aiplatform.googleapis.com`;
  const url = `https://${host}/v1/projects/${project}/locations/${LOCATION}/publishers/google/models/${model}:${method}${sse ? '?alt=sse' : ''}`;
  const token = await auth.getAccessToken();
  if (!token) throw new Error('Vertex AI auth failed: no access token from ADC');
  return { url, token };
}

/**
 * Provider dispatcher. Every prompt builder calls this so the AI engine can be
 * switched per request: { provider: 'gemini'|'deepseek'|'kimi'|'ollama'|'lmstudio', model }
 * (defaults Gemini). `model` also selects the Gemini variant, e.g. gemini-2.5-pro.
 * `thinking` turns extended thinking on/off (Gemini via thinkingBudget; DeepSeek
 * V4 and Kimi K2.6 via the `thinking` toggle — which defaults ON server-side, so
 * we must pass it explicitly for the "fast" path); `schema` (Gemini only) is a
 * responseSchema that guarantees the JSON shape at decode time.
 */
async function complete(prompt, { json = false, provider, model, thinking, schema, search = false, attachments = [] } = {}) {
  // `search` (Google Search grounding / internet access) and file attachments are Gemini-via-Vertex
  // capabilities only; the other providers don't support them here, so they're ignored for them.
  if (provider === 'deepseek') return callDeepSeek(prompt, { json, model, thinking });
  if (provider === 'kimi') return callKimi(prompt, { json, model, thinking });
  if (provider === 'anthropic') return callAnthropic(prompt, { json, model });
  if (provider === 'ollama') return callOllama(prompt, { json, model });
  if (provider === 'lmstudio') return callLMStudio(prompt, { json, model });
  return callGemini(prompt, { json, model, thinking, schema, search, attachments });
}

/** Streaming dispatcher: invokes onToken(textChunk, kind) as tokens arrive, where
 * kind is 'content' or 'thinking'. `thoughts:true` asks Gemini for its thought
 * summaries too (the OpenAI-style providers stream reasoning_content regardless);
 * it's opt-in so the learner-facing streams are unchanged. */
async function completeStream(prompt, { provider, model, thinking, thoughts, search, attachments = [] } = {}, onToken) {
  if (provider === 'deepseek') return streamDeepSeek(prompt, model, onToken, { thinking });
  if (provider === 'kimi') return streamKimi(prompt, model, onToken, { thinking });
  if (provider === 'anthropic') return streamAnthropic(prompt, model, onToken);
  if (provider === 'ollama') return streamOllama(prompt, model, onToken);
  if (provider === 'lmstudio') return streamLMStudio(prompt, model, onToken);
  // `search` (Google Search grounding) + file attachments are Gemini-via-Vertex capabilities only.
  return streamGemini(prompt, onToken, model, thinking, thoughts, !!search, attachments);
}

/**
 * Build the Gemini generationConfig shared by the blocking and streaming calls.
 * - JSON mode / responseSchema (schema implies JSON) guarantees a parseable shape.
 * - Extended thinking defaults to the model's own default. When the caller passes
 *   thinking === false we disable it, but ONLY on models that accept a zero budget
 *   (2.5 Flash / Flash-Lite). Pro keeps a minimum thinking budget and would reject
 *   thinkingBudget: 0, so we leave it alone there.
 */
// Turn user-uploaded files into Gemini inlineData parts (multimodal input). Only Gemini-via-Vertex
// gets these; other providers ignore attachments. We accept images, PDFs, and text, cap the count,
// and pass base64 straight through. Anything malformed/unsupported is silently dropped.
function attachmentParts(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((a) => a && a.data && a.mimeType && /^(image\/|application\/pdf|text\/)/i.test(a.mimeType))
    .slice(0, 6)
    .map((a) => ({ inlineData: { mimeType: a.mimeType, data: String(a.data) } }));
}

// The user prompt as Gemini `parts`: the text, then any uploaded files.
function userParts(prompt, attachments) {
  return [{ text: prompt }, ...attachmentParts(attachments)];
}

function geminiGenConfig(model, { json = false, thinking, schema } = {}) {
  const gc = {};
  if (json || schema) gc.responseMimeType = 'application/json';
  if (schema) gc.responseSchema = schema;
  if (thinking === false && /flash/i.test(model)) gc.thinkingConfig = { thinkingBudget: 0 };
  return Object.keys(gc).length ? gc : undefined;
}

/**
 * Runs a prompt. If onToken is supplied, streams (calling onToken per chunk) and
 * returns the accumulated text; otherwise does a single blocking completion.
 *
 * The reasoning trace ('thinking' chunks) is deliberately NOT forwarded here nor
 * accumulated: this is the path the learner-facing endpoints (hint, explanation,
 * analysis, study guides) use, and they want only the answer. Callers that DO want
 * to surface the model's thinking use streamStructured below.
 */
async function run(prompt, opts = {}, onToken) {
  if (typeof onToken === 'function') {
    let acc = '';
    await completeStream(prompt, opts, (t, kind) => {
      if (kind === 'thinking') return;
      acc += t; onToken(t);
    });
    return acc;
  }
  return complete(prompt, opts);
}

/**
 * Stream a prompt while forwarding BOTH the reasoning trace and the answer to
 * `onToken(text, kind)` (kind: 'thinking' | 'content'), and return the accumulated
 * CONTENT only (thinking excluded) so the caller can parse structured JSON out of
 * it. This is what lets the Composing Room show what the model is thinking while it
 * drafts a placement / module plan.
 */
async function streamStructured(prompt, opts = {}, onToken) {
  let acc = '';
  await completeStream(prompt, { ...opts, thoughts: true }, (t, kind) => {
    const k = kind === 'thinking' ? 'thinking' : 'content';
    if (k === 'content') acc += t;
    if (typeof onToken === 'function') onToken(t, k);
  });
  return acc;
}

/**
 * Parse JSON returned by an LLM, which is not always pristine. Providers/models
 * vary: some wrap the JSON in a ```json fence, some (local/"thinking" models)
 * emit a <think>…</think> block before it, and — the big one for our chat and
 * flashcard prompts — models routinely UNDER-ESCAPE LaTeX backslashes ("\int",
 * "\alpha", "\cdot" …). Those are illegal JSON string escapes, so a bare
 * JSON.parse throws ("returned non-JSON content") even though the payload is
 * "obviously" a JSON object. We therefore (1) strip reasoning blocks and code
 * fences, (2) slice to the first balanced {...} / [...], (3) parse; and ONLY if
 * that throws, (4) escape every backslash that doesn't begin a valid JSON escape
 * and parse once more. Strict parsing is always attempted first, so this never
 * alters already-valid JSON. Throws (like JSON.parse) when truly unrecoverable.
 */
function parseLooseJson(raw) {
  if (typeof raw !== 'string') return raw; // already parsed upstream
  let s = raw.trim();
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, '').trim(); // drop reasoning leak
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i); // unwrap a code fence
  if (fence) s = fence[1].trim();
  // Trim prose around the JSON: from the first { or [ to its matching last } or ].
  const open = s.search(/[{[]/);
  if (open > 0) s = s.slice(open);
  if (s[0] === '{' || s[0] === '[') {
    const close = s.lastIndexOf(s[0] === '{' ? '}' : ']');
    if (close > 0) s = s.slice(0, close + 1);
  }
  try {
    return JSON.parse(s);
  } catch (e) {
    // Repair, then retry once. Two malformations dominate LLM JSON, and the
    // "fast" (thinking-off) Flash path emits BOTH far more often than the
    // reasoning path: (1) RAW control chars inside a string — a multi-line
    // markdown reply written with literal newlines/tabs instead of \n/\t, which
    // is illegal JSON ("Bad control character in string literal"); and (2)
    // UNDER-ESCAPED LaTeX — a lone "\" not starting a valid JSON escape
    // (\" \\ \/ \b \f \n \r \t \uXXXX). Fix (1) by escaping control chars that
    // sit INSIDE string literals (structural whitespace between tokens is left
    // alone), then (2) by doubling the stray backslashes.
    const repaired = escapeRawControlsInStrings(s).replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
    if (repaired !== s) {
      try { return JSON.parse(repaired); } catch { /* unrecoverable — throw the original below */ }
    }
    throw e;
  }
}

// Escape raw control characters (U+0000–U+001F) that appear INSIDE a JSON string
// literal, converting each to its \-escape so the payload becomes legal JSON.
// Scans char-by-char tracking string state, so newlines/tabs used for structure
// BETWEEN tokens (e.g. pretty-printed JSON) are untouched. Idempotent on valid
// JSON. An unescaped inner double-quote still defeats it (genuinely ambiguous);
// a responseSchema is the only robust cure for that rarer case.
const CTRL_ESCAPES = { 8: '\\b', 9: '\\t', 10: '\\n', 12: '\\f', 13: '\\r' };
function escapeRawControlsInStrings(s) {
  let out = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) { out += ch; esc = false; continue; }
      if (ch === '\\') { out += ch; esc = true; continue; }
      if (ch === '"') { inStr = false; out += ch; continue; }
      const code = s.charCodeAt(i);
      if (code < 0x20) { out += CTRL_ESCAPES[code] || `\\u${code.toString(16).padStart(4, '0')}`; continue; }
      out += ch;
    } else {
      if (ch === '"') inStr = true;
      out += ch;
    }
  }
  return out;
}

// The nastier cousin of the under-escape above: when a model single-escapes a
// LaTeX command whose first letter is a JSON escape char — "\texttt", "\frac",
// "\neq", "\beta", "\rho" — JSON.parse SUCCEEDS but turns the "\t \f \n \b \r"
// into a literal control CHARACTER, so "\texttt{x}" arrives as TAB+"exttt{x}"
// (renders as "exttt{"). parseLooseJson never sees it because parsing didn't
// fail. Reconstruct the command: a control char IMMEDIATELY followed by a
// LOWERCASE letter was a backslash escape (every LaTeX command that starts
// t/f/n/b/r continues lowercase), so restore the backslash. Requiring lowercase
// leaves genuine line breaks/tabs before capitals, digits, or "- " bullets
// untouched. Idempotent: correctly-stored "\texttt" has no control char.
const CTRL_TO_LATEX = { '\t': '\\t', '\f': '\\f', '\b': '\\b', '\r': '\\r', '\n': '\\n' };
export function restoreLatexEscapes(s) {
  return typeof s === 'string'
    ? s.replace(/[\t\f\b\r\n](?=[a-z])/g, (c) => CTRL_TO_LATEX[c] || c)
    : s;
}

/**
 * Shared formatting contract so all math AND code render in the app's renderer.
 * The frontend auto-renders $...$, $$...$$, \(...\) and \[...\] as KaTeX, and
 * turns \texttt{...} into inline code chips. It does NOT render raw HTML or
 * markdown backticks, so the model must never emit those for code.
 */
const LATEX_RULE = `MATH FORMATTING (the app renders math with KaTeX, so follow this exactly):
- Wrap ALL mathematical notation in LaTeX delimiters: inline math in single dollar signs like $x^2$, and standalone/display math in double dollar signs like $$\\int_0^1 x\\,dx$$.
- Use ONLY standard KaTeX-supported commands (e.g. \\frac, \\sqrt, \\sum, \\int, \\lim, \\partial, ^, _, \\cdot, \\times, \\le, \\ge, \\neq, \\to, \\infty, Greek letters like \\alpha \\beta \\theta, \\mathbf, \\vec, \\hat, and \\begin{aligned}...\\end{aligned} or \\begin{bmatrix}...\\end{bmatrix} for multi-line/matrix layouts).
- Do NOT use unsupported environments (no \\begin{align}, \\begin{equation}, \\label, \\tag, \\require) or custom macros, and do NOT wrap math in code fences or backticks.
- Never write bare Unicode math symbols (no raw ×, ÷, √, ², ∑, ∫, π, ≤): always express them in LaTeX inside the delimiters above.
- If you need a literal dollar sign (for example currency like five dollars), write it escaped as \\$ so it is NOT treated as the start of math.

CODE FORMATTING (the app renders code as inline chips, NOT with HTML or markdown):
- Wrap ALL programming syntax in \\texttt{...}: identifiers, keywords, function/method signatures, snippets, and calls (e.g. \\texttt{def demo(a, b, *args):}, \\texttt{*args}, \\texttt{__iter__}, \\texttt{StopIteration}, \\texttt{model.fit(X, y)}).
- NEVER use HTML tags (no <code>, <pre>, <b>, <i>, <br>, <sub>, <sup>) and NEVER use markdown backticks or asterisks for code — they render as literal characters, not formatting.
- Keep code and math separate: code goes in \\texttt{...}, math goes in $...$. Code must NEVER be placed inside $...$.`;

/** Low-level call to Gemini via Vertex AI. Returns the raw text part. `model` overrides the default (e.g. Pro). */
async function callGemini(prompt, { json = false, model, thinking, schema, search = false, attachments = [] } = {}) {
  const useModel = model || MODEL;
  const { url, token } = await vertexTarget(useModel, 'generateContent');
  const body = {
    contents: [{ role: 'user', parts: userParts(prompt, attachments) }],
  };
  // Google Search grounding (internet access). Vertex forbids pairing it with JSON / responseSchema
  // mode, so when search is on we drop the JSON constraint and take grounded plain text instead —
  // the caller (assistant chat) parses accordingly. Thinking config still applies.
  if (search) {
    body.tools = [{ googleSearch: {} }];
    const gc = geminiGenConfig(useModel, { thinking });
    if (gc) body.generationConfig = gc;
  } else {
    const gc = geminiGenConfig(useModel, { json, thinking, schema });
    if (gc) body.generationConfig = gc;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Vertex Gemini ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  // Concatenate all text parts — a grounded (search) reply can arrive split across several parts.
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p) => p?.text || '').join('') : parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');
  recordGeminiUsage(useModel, data.usageMetadata);
  return text;
}

/** Streaming call to Gemini via Vertex AI (SSE). Invokes onToken(textChunk, kind)
 * as tokens arrive, where kind is 'content' or 'thinking'. `thoughts` (opt-in) asks
 * for thought summaries so a caller can show what the model is thinking; without it
 * this behaves exactly as before (content only). `model` overrides the default. */
async function streamGemini(prompt, onToken, model, thinking, thoughts, search = false, attachments = []) {
  const useModel = model || MODEL;
  const { url, token } = await vertexTarget(useModel, 'streamGenerateContent', true);
  const body = { contents: [{ role: 'user', parts: userParts(prompt, attachments) }] };
  // Google Search grounding: stream a grounded PLAIN-TEXT answer (no JSON/schema
  // conflict since streamed answers aren't JSON). Lets the web path stream + pause.
  if (search) body.tools = [{ googleSearch: {} }];
  const gc = geminiGenConfig(useModel, { thinking }) || {};
  // Thought summaries are opt-in (admin planners) and only when thinking isn't
  // explicitly disabled — so the learner-facing streams are byte-for-byte unchanged.
  // Grounding replaces the reasoning trace, so skip thoughts when searching.
  if (thoughts && thinking !== false && !search) gc.thinkingConfig = { ...(gc.thinkingConfig || {}), includeThoughts: true };
  if (Object.keys(gc).length) body.generationConfig = gc;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const txt = res.body ? await res.text().catch(() => '') : '';
    throw new Error(`Vertex Gemini ${res.status}: ${txt.slice(0, 300)}`);
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
        // A chunk can carry several parts; thought summaries are flagged part.thought.
        for (const part of obj?.candidates?.[0]?.content?.parts || []) {
          if (part?.text) onToken(part.text, part.thought ? 'thinking' : 'content');
        }
        if (obj?.usageMetadata) usage = obj.usageMetadata; // cumulative; last one wins
      } catch {
        /* ignore keep-alive / partial lines */
      }
    }
  }
  recordGeminiUsage(useModel, usage);
}

/**
 * A single hint that nudges WITHOUT revealing the answer.
 * The correct answer is passed only so the model aims the hint correctly,
 * but it is instructed never to state or hint at which option it is.
 */
export async function generateHint({ question, options, answer }, ai = {}, onToken) {
  const prompt = `You are a patient, encouraging tutor helping a student work through a multiple-choice question.

QUESTION: ${question}
OPTIONS:
${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}

(For your guidance only: the correct answer is: "${answer}". NEVER reveal this.)

Give ONE short hint (1 to 2 sentences, max ~40 words) that points the student toward the right way of thinking.

STRICT RULES:
- Do NOT state, quote, paraphrase, or letter-reference the correct option.
- Do NOT say which options are wrong or eliminate any.
- Point to the underlying concept, a definition to recall, or what to consider.
- Be warm and concise. Output ONLY the hint text, no preamble, no quotes.

${LATEX_RULE}`;
  return (await run(prompt, ai, onToken)).trim();
}

/**
 * A from-scratch explanation aimed at a complete beginner, given after answering.
 */
export async function generateExplanation({ question, options, answer, userAnswer, isCorrect }, ai = {}, onToken) {
  const prompt = `You are a world-class teacher explaining a concept to someone with ZERO background knowledge; assume they are a complete beginner and define every term in plain language.

QUESTION: ${question}
OPTIONS:
${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}
CORRECT ANSWER: ${answer}
THE STUDENT ANSWERED: ${userAnswer || '(no answer recorded)'}, which was ${isCorrect ? 'CORRECT' : 'INCORRECT'}.

Teach them from scratch using this structure (use Markdown):

**The big idea**: In 1 to 2 plain sentences, what concept is this question really about? Define any jargon as if to a 12-year-old.

**Why the correct answer is right**: Explain clearly and simply why "${answer}" is correct. Build the reasoning step by step.

**Why the others miss**: Briefly, in a bullet list, why each other option is a tempting-but-wrong choice or common misconception.

${isCorrect ? 'Start with one short encouraging sentence acknowledging they got it right.' : 'Start with one short, kind sentence (no shaming) then gently clear up the likely misunderstanding.'}

Keep it clear, friendly, and concrete. Use short paragraphs and bullet points. Avoid unnecessary length.

${LATEX_RULE}`;
  return (await run(prompt, ai, onToken)).trim();
}

/**
 * A pre-section study guide: read the questions that exist for a scope and
 * teach the learner the concepts they need BEFORE attempting it. It uses the
 * questions to gauge scope/depth, but teaches concepts rather than dumping
 * answers. Self-contained — assumes little prior knowledge (the "Review" button).
 * For a guide that instead builds on the section's prerequisites, see
 * `generateLesson`.
 */
export async function generateReview({ scopeLabel, topics, questions }, ai = {}, onToken) {
  const prompt = `You are a world-class teacher writing a focused STUDY GUIDE so a student can learn a section before being quizzed on it. Assume little prior knowledge and define jargon in plain language.

SECTION: "${scopeLabel}"
TOPICS COVERED (${topics.length}):
${topics.map((t) => `- ${t}`).join('\n')}

Here is a sample of the questions that exist for this section (use them ONLY to gauge the scope and depth, do NOT just restate them or reveal which option is correct):
${JSON.stringify(questions).slice(0, 6000)}

Write a clear, well-structured study guide in Markdown that teaches what the student needs to know before attempting this section. Use this shape:

**What this section is about**: 2 to 3 sentences framing the big picture.

**Key concepts**: the core ideas, each as a short bolded term followed by a plain-language explanation. Group by topic where it helps.

**Formulas / rules to remember**: a bullet list of the essential formulas, definitions, or rules (only if relevant).

**Common pitfalls**: a short bullet list of mistakes or misconceptions to watch for.

**How to approach the questions**: 2 to 4 practical tips for reasoning through this section.

Keep it concise and concrete; favour short paragraphs and bullets over long prose. Do NOT include a quiz or reveal specific answers.

${LATEX_RULE}`;
  return (await run(prompt, ai, onToken)).trim();
}

/**
 * A prerequisite-aware study guide (the "Lesson" button). Same shape as
 * `generateReview` but, instead of teaching from scratch, it BUILDS ON the
 * section's prerequisites (from the graph behind the Knowledge Map): it
 * references them by name and teaches only the delta, and points at what the
 * section unlocks next (`dependents`). Sits beside Review, not replacing it.
 */
export async function generateLesson(
  { scopeLabel, topics, questions, prereqs = [], dependents = [] },
  ai = {},
  onToken,
) {
  const prereqBlock = prereqs.length
    ? `\nPREREQUISITES the learner has already covered in earlier lessons — BUILD ON these, reference them by name, and do NOT re-explain them from scratch (teach only what is new beyond them):\n${prereqs.map((p) => `- ${p.topic}${p.why ? ` (relevant because: ${p.why})` : ''}`).join('\n')}\n`
    : '\n(This section has no earlier prerequisites on record — it is foundational, so introduce its concepts plainly.)\n';
  const dependentBlock = dependents.length
    ? `\nWHAT THIS SECTION UNLOCKS NEXT (mention briefly at the end so the learner sees where it leads — do NOT teach these):\n${dependents.map((d) => `- ${d.topic}`).join('\n')}\n`
    : '';

  const prompt = `You are a world-class teacher writing a focused STUDY GUIDE so a student can learn a section before being quizzed on it. This section is part of a larger curriculum, so build on what the learner already knows rather than re-teaching prerequisites from scratch. Define genuinely new jargon in plain language.

SECTION: "${scopeLabel}"
TOPICS COVERED (${topics.length}):
${topics.map((t) => `- ${t}`).join('\n')}
${prereqBlock}${dependentBlock}
Here is a sample of the questions that exist for this section (use them ONLY to gauge the scope and depth, do NOT just restate them or reveal which option is correct):
${JSON.stringify(questions).slice(0, 6000)}

Write a clear, well-structured study guide in Markdown that teaches what the student needs to know before attempting this section. Use this shape:

**What this section is about**: 2 to 3 sentences framing the big picture. Where it helps, connect it to the prerequisites named above (e.g. "building on X…").

**Key concepts**: the core ideas, each as a short bolded term followed by a plain-language explanation. Group by topic where it helps. Assume the prerequisites above are known — spend your words on what is new here.

**Formulas / rules to remember**: a bullet list of the essential formulas, definitions, or rules (only if relevant).

**Common pitfalls**: a short bullet list of mistakes or misconceptions to watch for.

**How to approach the questions**: 2 to 4 practical tips for reasoning through this section.
${dependents.length ? '\n**Where this leads**: one short line pointing at what mastering this unlocks next (from the list above).\n' : ''}
Keep it concise and concrete; favour short paragraphs and bullets over long prose. Do NOT include a quiz or reveal specific answers.

${LATEX_RULE}`;
  return (await run(prompt, ai, onToken)).trim();
}

/**
 * Analyze the learner's overall progress and give an encouraging, actionable
 * read-out: where they stand, strengths, what to prioritise, and a plan.
 */
export async function generateAnalysis({ overall, byCourse, weakest, graph }, ai = {}, onToken) {
  // Knowledge-graph signals (optional): what the prerequisite links say about
  // where to go next — sharper than accuracy tables alone.
  const graphBlock = graph && (graph.frontier?.length || graph.keystones?.length)
    ? `\nKNOWLEDGE-GRAPH SIGNALS (from prerequisite links between topics):
${graph.frontier?.length ? `Ready to start (never attempted, but every prerequisite is strong):
${graph.frontier.slice(0, 8).map((f) => `- ${f.topic} [${f.course}] — groundwork done: ${f.readyBecause.join(', ')}`).join('\n')}` : ''}
${graph.keystones?.length ? `Weak links blocking the most downstream topics:
${graph.keystones.slice(0, 8).map((k) => `- ${k.topic} [${k.course}]: ${k.state === 'untouched' ? 'never attempted' : `${k.accuracy}% over ${k.attempts} attempts`} — blocks ${k.blocked} downstream topic(s)`).join('\n')}` : ''}
`
    : '';
  const prompt = `You are a supportive, sharp learning coach analyzing a student's progress dashboard. "Progress" for any area is the average mastery across all its topics (a topic never attempted counts as 0%).

OVERALL: ${overall.overallProgress}% average progress across ${overall.topics} topics; ${overall.attempted} have been practised, ${overall.topics - overall.attempted} are untouched.

PROGRESS BY COURSE (weakest first):
${byCourse.map((c) => `- ${c.course} (${c.track}): ${c.progress}%, ${c.attempted}/${c.topics} topics practised`).join('\n')}

WEAKEST TOPICS (lowest progress first):
${weakest.map((t) => `- ${t.topic} [${t.course}]: ${t.progress}%${t.attempts ? ` (${t.attempts} attempts)` : ' (never attempted)'}`).join('\n')}
${graphBlock}
Write a concise analysis in Markdown using this shape:

**Where you stand**: 2 to 3 sentences summarising the overall picture honestly but encouragingly.

**Strengths**: a short bullet list of what's going well (highest-progress / well-practised areas).

**Focus next**: a short bullet list of the 3 to 5 areas that will move the needle most, with a one-line reason each. Distinguish "weak because untouched" from "weak because struggling". When knowledge-graph signals are provided, weight them heavily: keystone weak links unblock the most downstream material, and "ready to start" topics are momentum wins where the groundwork is already done.

**A suggested plan**: 3 to 4 concrete, ordered steps for the next study sessions.

Be warm, specific, and motivating. Avoid generic filler. Keep it tight.

${LATEX_RULE}`;
  return (await run(prompt, ai, onToken)).trim();
}

/* ---------------------------- Knowledge graph ----------------------------- */

/** Gemini responseSchema for a batch of topic-link results. Candidates are
 *  referenced by their 1-based NUMBER in the prompt's list (numbers can't be
 *  mistyped the way long slug ids can); the caller maps them back to ids. */
const TOPIC_LINKS_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      t: { type: 'integer' }, // target's number in the candidate list
      prereqs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            n: { type: 'integer' }, // prerequisite's number in the candidate list
            why: { type: 'string' },
          },
          required: ['n'],
          propertyOrdering: ['n', 'why'],
        },
      },
    },
    required: ['t', 'prereqs'],
    propertyOrdering: ['t', 'prereqs'],
  },
};

/**
 * Identify each TARGET topic's direct prerequisites from the full catalog, for
 * the knowledge graph. `candidates` is every topic [{id, topic, course, track}]
 * (the search space — cross-course and cross-track links are the point:
 * Limits -> Derivatives -> Gradient Descent -> Neural Networks); `targets` is
 * the subset to link on this call (keep it <= ~20 so the model stays careful).
 *
 * Returns [{id, topic, prereqs: [{id, why}]}] — one entry per target, EMPTY
 * prereqs when a topic is genuinely foundational, so callers can persist
 * "linked, no prereqs" and not re-ask forever.
 */
export async function generateTopicLinks({ targets, candidates }, ai = {}) {
  if (!targets?.length || !candidates?.length) return [];
  const numOf = new Map(candidates.map((c, i) => [c.id, i + 1])); // id -> 1-based number
  const line = (c, i) => `${i + 1}. ${c.topic} — ${c.course}${c.track ? ` (${c.track})` : ''}`;
  const targetNums = targets.map((t) => numOf.get(t.id)).filter(Boolean);

  const prompt = `You are an expert curriculum designer mapping the PREREQUISITE structure of a learning catalog (a knowledge graph). Below is the full numbered list of topics. For each TARGET topic, identify its DIRECT prerequisites: the specific topics a learner must already understand to grasp the target.

RULES:
- 0 to 4 prerequisites per target. Only DIRECT ones (list "Derivatives" for "Gradient Descent", not "Limits" — Limits is a prerequisite of Derivatives, and chains are followed transitively).
- Prerequisites may come from ANY course or track — cross-course and cross-track links (e.g. a Calculus topic underpinning a Machine Learning topic) are the most valuable.
- Prefer prerequisites from EARLIER material; do NOT list a topic that merely follows the target in its own lesson sequence.
- A truly foundational target (nothing in the catalog comes before it) gets an empty list — do not invent tenuous links.
- "why" is a short phrase (max 8 words) naming what the prerequisite supplies, e.g. "supplies the limit definition".
- Reference topics ONLY by their NUMBER in the list.

ALL TOPICS:
${candidates.map(line).join('\n')}

TARGETS (link each of these): ${targetNums.join(', ')}

Return ONLY a JSON array, one object per target: [{"t": <target number>, "prereqs": [{"n": <prerequisite number>, "why": "short phrase"}]}]`;

  const text = await complete(prompt, { json: true, schema: TOPIC_LINKS_SCHEMA, ...ai });
  let arr;
  try {
    arr = parseLooseJson(text);
  } catch {
    throw new Error('topic links: returned non-JSON content');
  }
  if (!Array.isArray(arr)) throw new Error('topic links: not a JSON array');

  // Map numbers back to ids and validate hard: unknown numbers, self-links and
  // duplicates are dropped; every requested target gets a result (missing ones
  // come back with empty prereqs so the sweep can persist-and-move-on).
  const byNum = new Map(candidates.map((c, i) => [i + 1, c]));
  const out = new Map(targets.map((t) => [t.id, { id: t.id, topic: t.topic, prereqs: [] }]));
  for (const item of arr) {
    const target = byNum.get(item?.t);
    if (!target || !out.has(target.id)) continue;
    const seen = new Set();
    const prereqs = [];
    for (const p of Array.isArray(item.prereqs) ? item.prereqs : []) {
      const cand = byNum.get(p?.n);
      if (!cand || cand.id === target.id || seen.has(cand.id)) continue;
      seen.add(cand.id);
      prereqs.push({ id: cand.id, why: String(p.why || '').slice(0, 80) });
      if (prereqs.length >= 4) break;
    }
    out.get(target.id).prereqs = prereqs;
  }
  return [...out.values()];
}

/** Gemini responseSchema for a pedagogical ordering: a permutation of the
 *  candidate topic NUMBERS, foundational first. Numbers (not names) so the
 *  model can't paraphrase a topic and drift off the known set. */
const TOPIC_ORDER_SCHEMA = {
  type: 'array',
  items: { type: 'integer' },
};

/**
 * Order ONE lesson's topics (sub-lessons) into the best sequence to LEARN them:
 * foundational ideas and mechanisms before the concepts, tuning, and edge cases
 * that build on them. `topics` is [{id, topic}] for a SINGLE lesson.
 *
 * Returns the same topics as an ordered array [{id, topic}] — always a complete
 * permutation: unknown/duplicate numbers are dropped and any topics the model
 * omits are appended in their incoming order, so no topic is ever lost. On a
 * hard failure it throws and the caller keeps the existing order.
 */
export async function generateTopicOrder({ course = '', lesson = '', topics }, ai = {}) {
  if (!topics?.length) return [];
  if (topics.length === 1) return [{ id: topics[0].id, topic: topics[0].topic }];
  const line = (t, i) => `${i + 1}. ${t.topic}`;

  const prompt = `You are an expert curriculum designer sequencing the sub-lessons (topics) WITHIN a single lesson into the optimal order for a learner to study them.

Course: ${course}
Lesson: ${lesson}

Order the numbered topics below from the one to study FIRST to the one to study LAST.

RULES:
- Put foundational definitions and mechanisms BEFORE the concepts that build on them (e.g. "Cluster Centroids" and "K-Means Assignment Step" come before "Choosing the Number of Clusters K"; introduce a method before its evaluation, tuning, or edge cases).
- When two topics are independent, keep the more basic / more general one earlier.
- Return EVERY topic number exactly once — a complete permutation, nothing added or dropped.
- Reference topics ONLY by their NUMBER in the list.

TOPICS:
${topics.map(line).join('\n')}

Return ONLY a JSON array of the topic numbers in recommended study order, e.g. [3,1,4,2].`;

  const text = await complete(prompt, { json: true, schema: TOPIC_ORDER_SCHEMA, ...ai });
  let arr;
  try {
    arr = parseLooseJson(text);
  } catch {
    throw new Error('topic order: returned non-JSON content');
  }
  if (!Array.isArray(arr)) throw new Error('topic order: not a JSON array');

  // Map numbers back to topics; keep first occurrence, drop unknown/duplicate,
  // then append any topics the model left out so the result is a full permutation.
  const byNum = new Map(topics.map((t, i) => [i + 1, t]));
  const ordered = [];
  const seen = new Set();
  for (const n of arr) {
    const t = byNum.get(n);
    if (!t || seen.has(t.id)) continue;
    seen.add(t.id);
    ordered.push({ id: t.id, topic: t.topic });
  }
  for (const t of topics) if (!seen.has(t.id)) ordered.push({ id: t.id, topic: t.topic });
  return ordered;
}

/**
 * Convert a batch of existing questions' informal math notation into KaTeX
 * LaTeX, WITHOUT changing wording or meaning. Returns objects keyed by id.
 */
export async function latexifyQuestions(items, ai = {}) {
  const prompt = `You reformat the math notation in quiz questions into KaTeX LaTeX. The app renders LaTeX with KaTeX.

For EACH item, rewrite "question", every entry of "options", and "answer" so that ALL mathematical notation becomes valid KaTeX wrapped in $...$ (inline) or $$...$$ (display).

STRICT RULES:
- Do NOT change wording, numbers, ordering, or meaning. ONLY convert math notation into LaTeX.
- Convert informal notation correctly. Examples:
  - "cos^-1(0)" becomes "$\\cos^{-1}(0)$"
  - "x^2" becomes "$x^2$"   |   "x^0.4" becomes "$x^{0.4}$"
  - "(x^2 - 9)/(x - 3)" becomes "$\\frac{x^2 - 9}{x - 3}$"
  - "lim x->3" or "x→3" becomes "$\\lim_{x \\to 3}$" or "$x \\to 3$"
  - bare symbols like ×, ÷, √, ≤, ≥, ≠, π, ∑, ∫ become \\times, \\div, \\sqrt{}, \\le, \\ge, \\neq, \\pi, \\sum, \\int inside $...$
- Use ONLY standard KaTeX commands. Wrap function names as \\sin, \\cos, \\log, \\ln, etc.
- Escape any literal currency dollar sign as \\$ so it is not treated as math.
- The "answer" string MUST end up EXACTLY equal (character for character) to one of the converted "options".
- If an item genuinely contains no math, return its fields unchanged.

Return ONLY a JSON array; each object keeps the same "id" and has the converted "question", "options" (same length and order) and "answer".

ITEMS:
${JSON.stringify(items)}`;

  const text = await complete(prompt, { json: true, ...ai });
  let arr;
  try {
    arr = parseLooseJson(text);
  } catch {
    throw new Error('latexify: Gemini returned non-JSON');
  }
  if (!Array.isArray(arr)) throw new Error('latexify: not a JSON array');
  return arr.map(cleanQuestionEscapes);
}

// Repair control-char-mangled LaTeX (see restoreLatexEscapes) across a
// reformatted/latexified question's text fields, keeping the answer<->option
// match intact because every field is cleaned the same way.
function cleanQuestionEscapes(o) {
  if (!o || typeof o !== 'object') return o;
  return {
    ...o,
    question: restoreLatexEscapes(o.question),
    options: Array.isArray(o.options) ? o.options.map(restoreLatexEscapes) : o.options,
    answer: restoreLatexEscapes(o.answer),
  };
}

/**
 * Reformat flashcards so their CODE and MATH render correctly, WITHOUT changing
 * any wording or meaning. The frontend renders a card's fields like this:
 *   - code wrapped as \texttt{...} becomes an inline <code> chip (stashCode),
 *   - $...$ / $$...$$ is typeset as math by KaTeX,
 *   - everything else is plain prose ("intuition" also supports **bold** + "- " bullets).
 * The breakage this fixes is code (e.g. "def f(self):") crammed inside a $...$
 * span, or prose glued on with \text{...}/\implies, which KaTeX then prints as
 * garbled red source. Returns the same items ({id, concept, intuition, formula})
 * with cleaned fields; a field that already renders fine is returned unchanged.
 */
export async function reformatFlashcards(items, ai = {}) {
  const prompt = `You fix ONLY the formatting of study flashcards so they render correctly. You must NOT change wording, meaning, facts, numbers, or ordering.

The app renders each field like this:
- CODE wrapped as \\texttt{...} renders as an inline code chip. Put ALL programming syntax here: identifiers, function signatures, snippets (e.g. \\texttt{def method(self, args):}, \\texttt{*args}, \\texttt{model.fit(X, y)}). Code must NEVER go inside $...$.
- MATH inside $...$ (inline) or $$...$$ (display) is typeset by KaTeX. Put ONLY genuine mathematical notation here, using valid KaTeX (\\frac, \\sum, \\to, \\times, \\le, \\cos, ...).
- Everything else is plain prose ("intuition" also supports **bold** and lines starting with "- " as bullets).

FIX these mistakes (this is the whole job):
- ALWAYS REWRITE (never leave as-is): a field of the form $\\texttt{...} \\implies \\text{...}$ (a code chip and prose wrapped together inside ONE $...$). A \\texttt{} chip inside $...$ breaks KaTeX delimiter matching, so it renders as literal "$" and raw "\\implies \\text{}". Unwrap it: drop the outer $...$, keep each code piece as its own \\texttt{...}, turn every \\text{...} into plain prose, and replace \\implies / \\to with a plain arrow -> (or a word like "gives"/"means"). Example: "$\\texttt{obj.get(k)} \\implies \\text{None if missing}$" becomes "\\texttt{obj.get(k)} -> None if missing".
- Code placed inside $...$  ->  move it out of the math span and wrap it in \\texttt{...}.
- Prose glued into math with \\text{...}, \\implies, \\rightarrow etc.  ->  write it as a normal sentence OUTSIDE any $...$; render a real "implies" as the word "implies".
- Stray $ around plain text  ->  remove them.
- Invalid KaTeX inside a real math span  ->  correct it to valid KaTeX.
- A field that is just a code snippet followed by an English explanation  ->  emit the code as \\texttt{...} then the explanation as plain prose.

STRICT RULES:
- Preserve the exact wording and meaning. Reformat ONLY. Do not add, drop, or reword content.
- If a field already renders correctly, return it UNCHANGED (character for character).
- Escape a literal currency dollar sign as \\$.

For EACH item return the same "id" with cleaned "concept", "intuition" and "formula" (all three present, even when unchanged).

Return ONLY a JSON array of {"id", "concept", "intuition", "formula"} objects.

ITEMS:
${JSON.stringify(items)}`;

  const text = await complete(prompt, { json: true, ...ai });
  let arr;
  try {
    arr = parseLooseJson(text);
  } catch {
    throw new Error('reformat: model returned non-JSON');
  }
  if (!Array.isArray(arr)) throw new Error('reformat: not a JSON array');
  return arr;
}

/**
 * Apply a natural-language EDIT to ONE flashcard and return its updated fields.
 * Unlike reformatFlashcards (formatting only), this MAY change wording/content —
 * but ONLY as the instruction asks; everything else is preserved verbatim. The
 * output follows the app's render contract (LATEX_RULE): code in \texttt{}, math
 * in $...$, no HTML/markdown. Returns { concept, intuition, formula }.
 */
export async function editFlashcard(card, instruction, ai = {}) {
  const current = {
    concept: card.concept || '',
    intuition: card.intuition || '',
    formula: card.formula || '',
  };
  const prompt = `You are editing ONE study flashcard. Apply the user's requested change, and nothing more.

The card has three fields:
- "concept": the front prompt (a question or a term to recall).
- "intuition": the plain-language explanation (supports **bold** and lines starting with "- " as bullets).
- "formula": the key formula or code snippet (may be empty, or "—" when there is none).

USER'S REQUESTED CHANGE:
${instruction}

RULES:
- Make ONLY the change the user asked for. Preserve every other field, and every untouched part of an edited field, verbatim (character for character).
- Keep the card accurate and self-consistent. If the requested change makes another field wrong, update just enough to keep it correct.
- Do not invent unrelated content, do not pad, and do not remove content the user did not ask to remove.
- If the request is unclear, off-topic, or does not apply to this card, return all three fields UNCHANGED.
- Never blank a field that had content unless the user explicitly asked to clear it.

${LATEX_RULE}

CURRENT CARD (JSON):
${JSON.stringify(current)}

Return ONLY a JSON object {"concept": "...", "intuition": "...", "formula": "..."} with all three fields present.`;

  const text = await complete(prompt, { json: true, ...ai });
  let obj;
  try {
    obj = parseLooseJson(text);
  } catch {
    throw new Error('edit: model returned non-JSON');
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('edit: not a JSON object');
  return {
    concept: restoreLatexEscapes(String(obj.concept ?? current.concept)),
    intuition: restoreLatexEscapes(String(obj.intuition ?? current.intuition)),
    formula: restoreLatexEscapes(String(obj.formula ?? current.formula)),
  };
}

/**
 * Speaker Mode: grade a learner's SPOKEN (or typed) explanation of a flashcard's
 * concept. The learner is trying to teach the idea back in their own words; we
 * score how well they understand it out of 3 and hand back warm, specific
 * feedback. The transcript comes from browser speech-to-text, so expect run-on
 * phrasing, filler words ("um", "like"), and mis-heard technical terms — judge
 * the UNDERSTANDING, not the wording, and read charitably through obvious
 * transcription slips (e.g. "grade in dissent" for "gradient descent").
 *
 * Rubric (0–3):
 *   3 = accurate AND complete; captures the core idea and the "why".
 *   2 = essentially right with a minor gap or imprecision.
 *   1 = a real spark of the idea but significant gaps or a notable error.
 *   0 = incorrect, off-topic, or no genuine explanation attempted.
 *
 * Returns { score, verdict, strengths[], gaps[], modelAnswer, encouragement }.
 */
export async function gradeExplanation({ concept, intuition, formula, scopeLabel, transcript }, ai = {}) {
  const said = String(transcript || '').trim();
  const prompt = `You are a warm, encouraging tutor grading how well a student EXPLAINED a concept back to you in their own words (they are trying to teach it to you). Reward genuine understanding, not vocabulary or polish.

THE CONCEPT THEY WERE ASKED TO EXPLAIN:
${concept}

REFERENCE MATERIAL (the correct understanding — grade the student against THIS, do not just repeat it back):
- Intuition: ${intuition || '(none provided)'}
- Formula / key detail: ${formula || '(none)'}
${scopeLabel ? `- Where this sits: ${scopeLabel}` : ''}

THE STUDENT'S SPOKEN EXPLANATION (auto-transcribed — may contain filler words, run-ons, and mis-heard technical terms; read charitably and correct obvious transcription errors in your head):
"""
${said || '(the student did not say anything)'}
"""

Score their UNDERSTANDING out of 3 using this rubric:
- 3 = accurate AND complete: they capture the core idea and the reasoning / "why".
- 2 = essentially correct with a minor gap or imprecision.
- 1 = a real spark of the right idea, but significant gaps or a notable error.
- 0 = incorrect, off-topic, or no genuine explanation attempted (including an empty or nonsense transcript).

RULES:
- Judge only what they actually conveyed. Do NOT give credit for things they did not say.
- Be generous about phrasing and word choice; be strict about the actual idea being right.
- Feedback must be specific to what they said — quote or paraphrase their words. No generic filler.
- Tone: kind and motivating, never shaming. Even a 0 gets a gentle, hopeful nudge.
- "modelAnswer" is a short, clear ideal explanation of the concept (2–4 sentences) they can compare against.

${LATEX_RULE}

Return ONLY a JSON object with exactly these keys:
{
  "score": 0 | 1 | 2 | 3,
  "verdict": "one short sentence summarizing how they did",
  "strengths": ["specific thing they got right", "..."],
  "gaps": ["specific thing they missed or got wrong", "..."],
  "modelAnswer": "a short ideal explanation of the concept",
  "encouragement": "one warm, motivating sentence"
}
"strengths" and "gaps" are arrays of short strings (each may be empty []). Every key must be present.`;

  const text = await complete(prompt, { json: true, ...ai });
  let obj;
  try {
    obj = parseLooseJson(text);
  } catch {
    throw new Error('grade: model returned non-JSON');
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('grade: not a JSON object');
  const score = Math.max(0, Math.min(3, Math.round(Number(obj.score) || 0)));
  const cleanList = (v) => (Array.isArray(v) ? v : [])
    .map((s) => restoreLatexEscapes(String(s || '')).trim())
    .filter(Boolean)
    .slice(0, 6);
  return {
    score,
    verdict: restoreLatexEscapes(String(obj.verdict || '')).trim(),
    strengths: cleanList(obj.strengths),
    gaps: cleanList(obj.gaps),
    modelAnswer: restoreLatexEscapes(String(obj.modelAnswer || intuition || '')).trim(),
    encouragement: restoreLatexEscapes(String(obj.encouragement || '')).trim(),
  };
}

/**
 * Reformat quiz QUESTIONS so their code and math render correctly, WITHOUT
 * changing wording or meaning. The frontend renders a question, its options and
 * its answer with the SAME code+math pipeline as flashcards:
 *   - code wrapped as \texttt{...} becomes an inline <code> chip,
 *   - $...$ / $$...$$ is typeset by KaTeX,
 *   - everything else is plain text (NO markdown: **bold**, bullets or raw HTML
 *     do NOT render — they show as literal characters).
 * The breakage this fixes: raw HTML tags left in the text (e.g. literal
 * "<code>def demo(a, b, *args):</code>" printing angle brackets and all), code
 * crammed inside a $...$ span, or malformed KaTeX. Returns the same items
 * ({id, question, options, answer}); a field that already renders fine is
 * returned unchanged. The answer MUST stay exactly equal to one option.
 */
export async function reformatQuestions(items, ai = {}) {
  const prompt = `You fix ONLY the formatting of multiple-choice quiz questions so they render correctly. You must NOT change wording, meaning, facts, numbers, the options, or their order.

The app renders "question", each entry of "options", and "answer" like this:
- CODE wrapped as \\texttt{...} renders as an inline code chip. Put ALL programming syntax here: identifiers, function signatures, snippets (e.g. \\texttt{def demo(a, b, *args):}, \\texttt{*args}, \\texttt{model.fit(X, y)}). Code must NEVER go inside $...$.
- MATH inside $...$ (inline) or $$...$$ (display) is typeset by KaTeX. Put ONLY genuine mathematical notation here, using valid KaTeX (\\frac, \\sum, \\to, \\times, \\le, \\cos, ...).
- Everything else is PLAIN TEXT. There is NO markdown and NO HTML: **bold**, backticks, and tags like <code>, <pre>, <b>, <br>, <sub> do NOT render — they print literally. Never output any of them.

FIX these mistakes (this is the whole job):
- ALWAYS REWRITE (never leave as-is): raw HTML tags in the text. Convert <code>...</code> and <pre>...</pre> content into \\texttt{...}; drop tags like <b>/<i>/<strong>/<em>/<u>/<span> and keep their inner text as plain prose; turn <br> into a space; convert <sub>x</sub>/<sup>2</sup> into KaTeX subscripts/superscripts inside $...$ when they are math. Example: "the call <code>demo(1, 2, 3, x=4)</code>" becomes "the call \\texttt{demo(1, 2, 3, x=4)}".
- Code placed inside $...$  ->  move it out of the math span and wrap it in \\texttt{...}.
- Prose glued into math with \\text{...}, \\implies, \\rightarrow etc.  ->  write it as a normal sentence OUTSIDE any $...$.
- Stray or unbalanced $ around plain text  ->  remove them.
- Invalid KaTeX inside a real math span  ->  correct it to valid KaTeX.
- Any **markdown** or backtick styling  ->  convert code to \\texttt{...} and drop the rest to plain text.

STRICT RULES:
- Preserve the exact wording and meaning. Reformat ONLY. Do not add, drop, or reword content.
- Keep "options" the SAME length and order. Reformat each option the same way.
- The "answer" string MUST end up EXACTLY equal (character for character) to one of the reformatted "options".
- Escape a literal currency dollar sign as \\$.
- If a field already renders correctly, return it UNCHANGED (character for character).

For EACH item return the same "id" with cleaned "question", "options" (same length and order) and "answer".

Return ONLY a JSON array of {"id", "question", "options", "answer"} objects.

ITEMS:
${JSON.stringify(items)}`;

  const text = await complete(prompt, { json: true, ...ai });
  let arr;
  try {
    arr = parseLooseJson(text);
  } catch {
    throw new Error('reformat-questions: model returned non-JSON');
  }
  if (!Array.isArray(arr)) throw new Error('reformat-questions: not a JSON array');
  return arr.map(cleanQuestionEscapes);
}

/**
 * The visual-spec contract shared by the flashcard prompts. The frontend renders
 * these with a small, SAFE function-plotter (no raw SVG from the model), so the
 * model must describe a plot declaratively. Keeping the schema tight is what lets
 * a "visual learner" get clean, on-brand diagrams (tangent lines, shaded areas,
 * limit approaches) instead of unreliable AI-drawn SVG.
 */
const VISUAL_RULE = `OPTIONAL VISUAL (include ONLY when a graph genuinely aids intuition; omit otherwise by leaving "visual" as null):
- "visual" must be an object describing a 2-D function plot that our app draws. NEVER output SVG, image URLs, or ASCII art.
- Shape: {"caption": "one short line under the graph", "domain": [xmin, xmax], "curves": [{"fn": "expr in x", "label": "optional", "color": "green|violet|red|muted"}], "tangentAt": x0 (optional), "area": [a, b] (optional, shades under curves[0]), "secant": [a, b] (optional), "points": [{"x": n, "label": "P"}] (optional), "vlines": [{"x": n, "label": "x→c"}] (optional)}.
- "fn" expressions may use ONLY: the variable x, numbers, + - * / ^, parentheses, the constants pi and e, and the functions sin, cos, tan, exp, ln, log, sqrt, abs. Example fns: "x^2", "sin(x)", "1/x", "exp(x)", "x^3 - 3*x".
- Use "tangentAt" for derivative/slope intuition, "area" for integral/area intuition, "secant" for average-vs-instantaneous rate, "vlines" for limits/asymptotes. Pick a domain that frames the interesting behaviour.
- Keep it to at most 2 curves and one or two annotations, so the picture stays clean.`;

/**
 * Generate a COMPREHENSIVE flashcard deck for a Course- or Lesson-level scope.
 * Each card focuses on two labelled parts — Intuition and Formula — and may carry
 * an optional declarative visual. The deck must be complete enough that mastering
 * it means answering any quiz question in scope; a subset is tagged `highway` for
 * rapid review (highest-impact + concepts that recur across lessons). Every card
 * is mapped to one real `topic` from the provided list so "quiz me" feeds mastery.
 */
export async function generateFlashcards({ scopeLabel, level, topics, questions, instructions = '' }, ai = {}) {
  const count = level === 'course' ? '18 to 30' : level === 'lesson' ? '8 to 14' : '5 to 9';
  const prompt = `You are a world-class teacher who makes highly technical subjects feel simple and intuitive. Build a set of STUDY FLASHCARDS for this ${level}-level section so a student can master it.
${guidanceBlock(instructions)}

SECTION: "${scopeLabel}" (${level} level)
TOPICS IN SCOPE (map every card to EXACTLY ONE of these, verbatim, in its "topic" field):
${topics.map((t) => `- ${t}`).join('\n')}

Here is a sample of the quiz questions that exist for this section (use them to gauge the required scope and depth; do NOT copy them or reveal answers):
${JSON.stringify(questions).slice(0, 6000)}

YOUR MISSION:
1. Write ${count} flashcards that COMPREHENSIVELY cover this section. Mastering every card MUST be enough to answer any question above. Cover each distinct idea; do not leave gaps.
2. Each card has a short "concept" (the FRONT: the idea/term/skill being learned, phrased as a crisp prompt) and a two-part BACK:
   - "intuition": explain the idea in plain, vivid language a beginner grasps immediately. Use analogies and a "why it works" angle. This is where a visual learner should feel it click. Define jargon.
   - "formula": the essential formula, rule, or precise definition to memorize, in LaTeX. If the card is purely conceptual, give the concise rule/definition; only use "—" when truly none applies.
3. HIGHWAY (rapid review): set "highway": true on the SMALLEST set of highest-impact cards — the foundational ideas and the concepts that recur across multiple lessons/topics — so reviewing only those gives the fastest meaningful refresh. Set "highway": false on the rest. Aim for roughly a third of the deck as highway.
4. Map each card to the single best-fitting "topic" from the list above (verbatim).

${VISUAL_RULE}

${LATEX_RULE}
Do NOT use em dashes; use commas, colons, or simple hyphens.

Return ONLY a JSON array, each element:
{"concept": "front text", "intuition": "plain-language explanation", "formula": "LaTeX formula/rule or —", "topic": "one topic verbatim", "highway": true|false, "visual": null | {plot object as specified}}`;

  const text = await complete(prompt, { json: true, ...ai });
  let arr;
  try {
    arr = parseLooseJson(text);
  } catch {
    throw new Error('Flashcard generation returned non-JSON content');
  }
  if (!Array.isArray(arr)) throw new Error('Flashcard generation did not return a JSON array');

  const topicSet = new Set(topics);
  return arr
    .filter((c) => c && c.concept && c.intuition)
    .map((c) => ({
      concept: String(c.concept).trim(),
      intuition: String(c.intuition).trim(),
      formula: c.formula ? String(c.formula).trim() : '—',
      // Snap the topic to a real one; fall back to the first in scope if the model drifted.
      topic: topicSet.has(String(c.topic).trim()) ? String(c.topic).trim() : topics[0] || '',
      highway: !!c.highway,
      visual: sanitizeVisual(c.visual),
    }));
}

/** Whitelist a model-supplied visual spec down to the safe declarative shape the plotter accepts. */
function sanitizeVisual(v) {
  if (!v || typeof v !== 'object') return null;
  const FN_OK = /^[\s0-9x.+\-*/^(),a-z]+$/i; // chars only; the plotter's parser is the real guard
  const COLORS = new Set(['green', 'violet', 'red', 'muted']);
  const num = (n) => (typeof n === 'number' && isFinite(n) ? n : null);
  const pair = (p) => (Array.isArray(p) && num(p[0]) != null && num(p[1]) != null ? [p[0], p[1]] : null);

  const curves = (Array.isArray(v.curves) ? v.curves : [])
    .filter((c) => c && typeof c.fn === 'string' && c.fn.length <= 120 && FN_OK.test(c.fn))
    .slice(0, 2)
    .map((c) => ({
      fn: c.fn.trim(),
      label: c.label ? String(c.label).slice(0, 40) : '',
      color: COLORS.has(c.color) ? c.color : 'green',
    }));
  if (!curves.length) return null;

  const out = { caption: v.caption ? String(v.caption).slice(0, 140) : '', curves };
  const dom = pair(v.domain);
  out.domain = dom && dom[0] < dom[1] ? dom : [-3, 3];
  if (num(v.tangentAt) != null) out.tangentAt = v.tangentAt;
  if (pair(v.area)) out.area = pair(v.area);
  if (pair(v.secant)) out.secant = pair(v.secant);
  if (Array.isArray(v.points)) {
    out.points = v.points.filter((p) => p && num(p.x) != null)
      .slice(0, 4).map((p) => ({ x: p.x, label: p.label ? String(p.label).slice(0, 12) : '' }));
  }
  if (Array.isArray(v.vlines)) {
    out.vlines = v.vlines.filter((p) => p && num(p.x) != null)
      .slice(0, 3).map((p) => ({ x: p.x, label: p.label ? String(p.label).slice(0, 16) : '' }));
  }
  return out;
}

/**
 * Generate ONE mastery MCQ that tests a specific flashcard's concept, staying on
 * the card's real `topic` so the banked question feeds that topic's mastery just
 * like any other. Mirrors generateDrillQuestion's validation (answer must match
 * an option exactly). Retries once on an unusable shape.
 */
export async function generateFlashcardQuestion({ topic, scopeLabel, concept, intuition, formula }, ai = {}, { brief = '', siblings = [], mode = '', difficulty = 'balanced' } = {}) {
  const others = (Array.isArray(siblings) ? siblings : []).map((s) => String(s || '').trim()).filter(Boolean).slice(0, 9);
  const briefBlock = brief
    ? `THIS QUESTION'S BRIEF (write a question that does exactly this):\n${brief}\n${
        mode === 'procedural'
          ? 'This is a PROCEDURAL skill: it is fine to mirror the structure of the sibling questions — vary the specific given, not the wording for its own sake.'
          : mode === 'conceptual'
            ? 'This is a CONCEPTUAL skill: come at it from the specific angle named in the brief.'
            : ''
      }\n\n`
    : '';
  const siblingBlock = others.length
    ? `OTHER QUESTIONS IN THIS SET (yours must NOT be interchangeable with any of them):\n${others.map((s) => `- ${s}`).join('\n')}\n\n`
    : '';
  const prompt = `You are a Wise Master Educator and Professional Test Developer. Write ONE multiple-choice question that checks whether a student has truly mastered the specific concept on the flashcard below. Staying on the SAME sub-topic, test understanding (not mere recall).

SUB-LESSON / TOPIC: "${topic}"${scopeLabel && scopeLabel !== topic ? ` (within: ${scopeLabel})` : ''}

FLASHCARD BEING TESTED:
- Concept: ${concept}
- Intuition: ${intuition}
- Formula/Rule: ${formula || '(none)'}

${briefBlock}${siblingBlock}REQUIREMENTS:
1. The question must directly test the concept above, so that answering it correctly demonstrates understanding of this card.
2. It MUST stay on the topic "${topic}". Do NOT drift to a different sub-lesson.
3. Prefer a question that applies the idea, not one that just quotes the definition.

${DIFFICULTY_DIRECTIVE[difficulty] || DIFFICULTY_DIRECTIVE.balanced}

CRITICAL FORMATTING RULES (TO PREVENT TEST-HACKING):
- OPTION UNIFORMITY: all 4 options approximately the same character length.
- No "Length Bias": the correct answer is not the longest or most detailed.
- PARALLEL STRUCTURE: keep the phrasing of all options symmetrical.
- SOPHISTICATED DISTRACTORS: wrong answers should be plausible common misconceptions.

Do NOT use em dashes; use commas, colons, or simple hyphens.

${LATEX_RULE}
${ANSWER_INDEX_RULE}

Return ONLY a JSON object: {"question": "text", "options": ["A", "B", "C", "D"], "answerIndex": 0}`;

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    let obj;
    try {
      obj = parseLooseJson(await complete(prompt, { json: true, schema: MCQ_SCHEMA, ...ai }));
    } catch {
      lastErr = new Error('flashcard quiz: returned non-JSON content');
      continue;
    }
    if (Array.isArray(obj)) obj = obj[0];
    const q = normalizeMcq(obj, topic);
    if (q) return q;
    lastErr = new Error('flashcard quiz: invalid question shape');
  }
  throw new Error(`Flashcard question generation failed (${lastErr?.message || 'unknown'})`);
}

/**
 * Generate `count` DISTINCT MCQs for a flashcard's concept (the "quiz me on this"
 * count picker), using a plan-then-parallel-write pipeline:
 *   1. planQuestions() decides, in ONE call, how the concept is mastered
 *      (procedural vs conceptual) and emits one brief per question, so a
 *      chain-rule card gets varied-given practice while a definition card gets
 *      varied angles — divergence by design, not by luck.
 *   2. Each brief is written IN PARALLEL by generateFlashcardQuestion. Short,
 *      independent writes stay fast and dodge the output-token truncation a
 *      single N-question call risks; each worker sees its siblings so it can't
 *      collide with them.
 *   3. Exact-text dedupe as a final safety net.
 * If the planner is unavailable it degrades to N blank briefs — i.e. the old
 * "N independent questions" behaviour — so the feature never dead-ends.
 *
 * `ctx.existing` (banked stems for the topic) and `ctx.performance` are passed
 * through to the planner as an avoid-list and a difficulty target.
 */
export async function generateFlashcardQuestions(card, count, ai = {}, ctx = {}) {
  const n = Math.min(10, Math.max(1, parseInt(count, 10) || 1));
  const { existing = [], performance = null, difficulty = 'auto', prereqs = [] } = ctx;
  // Resolve "auto" from this topic's history ONCE, so the plan and every parallel
  // writer aim at the same level (build up from what the learner has answered).
  const level = resolveDifficulty(difficulty, performance);

  // 1) Plan distinct briefs (best-effort — fall back to blank briefs on failure).
  let mode = '';
  let briefs = [];
  try {
    const plan = await planQuestions({
      label: card.scopeLabel || card.topic,
      context: `Concept: ${card.concept}\nIntuition: ${card.intuition}\nFormula/Rule: ${card.formula || '(none)'}`,
      existing,
      performance,
      difficulty,
      prereqs,
      count: n,
    }, ai);
    mode = plan.mode;
    briefs = plan.briefs;
  } catch { /* planner unavailable — fall through to blank briefs */ }
  if (!briefs.length) briefs = Array.from({ length: n }, () => '');

  // 2) Write each brief in parallel; a single failed write yields null, not a throw.
  const results = await mapWithConcurrency(briefs, 4, (brief, i) =>
    generateFlashcardQuestion(card, ai, { brief, mode, siblings: briefs.filter((_, j) => j !== i), difficulty: level })
      .catch(() => null));

  // 3) Drop failures and exact-duplicate stems.
  const out = [];
  const seen = new Set();
  for (const q of results) {
    if (!q) continue;
    const key = q.question.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  if (!out.length) throw new Error('No usable questions were generated');
  return out;
}

/* -------------------------- MCQ shape & contract -------------------------- */

/**
 * The single MCQ shape every question generator now asks for. The correct
 * answer is given as a 0-based INDEX into `options` rather than a copy of the
 * option text: an index can't drift out of sync with the options the way a
 * duplicated string can, so it removes a whole class of "answer didn't match an
 * option" failures (and saves the tokens of re-emitting the answer text).
 */
const ANSWER_INDEX_RULE =
  'Set "answerIndex" to the 0-based position (an integer 0-3) of the correct option within the "options" array. Do NOT repeat the answer text; the index alone identifies it.';

/** Gemini responseSchema for one MCQ (guarantees the shape at decode time). */
const MCQ_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    answerIndex: { type: 'integer' },
  },
  required: ['question', 'options', 'answerIndex'],
  propertyOrdering: ['question', 'options', 'answerIndex'],
};
/** Gemini responseSchema for a batch of MCQs. */
const MCQ_ARRAY_SCHEMA = { type: 'array', items: MCQ_SCHEMA };

/**
 * Normalize one raw MCQ (from any provider) into the stored shape
 * {topic, question, options, answer}. Prefers the numeric `answerIndex`; falls
 * back to a legacy `answer` string if a provider ignored the index. Returns null
 * if the item is unusable (missing text, too few options, or no resolvable
 * answer), so callers can filter a batch without throwing.
 */
function normalizeMcq(raw, topic) {
  if (!raw || !raw.question || !Array.isArray(raw.options)) return null;
  // restoreLatexEscapes repairs "\texttt"/"\frac"/... mangled into control chars
  // by JSON parsing, so generated questions are stored with valid LaTeX.
  const options = raw.options.map((o) => restoreLatexEscapes(String(o).trim()));
  if (options.length < 2 || options.some((o) => !o)) return null;

  let idx = raw.answerIndex;
  if (typeof idx === 'string' && /^\d+$/.test(idx.trim())) idx = parseInt(idx, 10);

  let answer;
  if (Number.isInteger(idx) && idx >= 0 && idx < options.length) {
    answer = options[idx];
  } else if (raw.answer != null) {
    // Fallback for providers that emitted the answer text instead of an index.
    const a = restoreLatexEscapes(String(raw.answer).trim());
    if (options.includes(a)) answer = a;
  }
  if (!answer) return null;

  return { topic, question: restoreLatexEscapes(String(raw.question).trim()), options, answer };
}

/**
 * Fan `fn` across `items` with at most `limit` promises in flight, preserving
 * order. Local copy of the server's helper so this module's generators can
 * parallelize their per-question writes without importing the server.
 */
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return results;
}

/** Render learner performance for a generation prompt (null-safe). Summary only;
 *  how HARD to aim is decided separately by the difficulty directive below. */
function performanceBlock(performance) {
  if (!performance || performance.accuracy == null) {
    return 'LEARNER PERFORMANCE: no attempts recorded on this topic yet (treat as a first pass).';
  }
  const missed = Array.isArray(performance.missed) ? performance.missed.filter(Boolean).slice(0, 12) : [];
  return `LEARNER PERFORMANCE ON THIS TOPIC: ${performance.accuracy}% accuracy over ${performance.attempts || 0} attempt(s).${
    missed.length ? `\nRecently MISSED (bias new questions toward closing these gaps):\n${missed.map((m) => `- ${m}`).join('\n')}` : ''
  }`;
}

/**
 * Difficulty control. "auto" ramps from the learner's history on THIS topic —
 * untouched or shaky topics get CORE (rebuild fundamentals), solid topics get
 * BALANCED, well-mastered topics get CHALLENGE (edge-case stress test). A manual
 * pick (core|balanced|challenge) overrides the ramp. The CHALLENGE directive
 * keeps a fairness guard so "hard" never means "unfair/ambiguous".
 */
export const DIFFICULTIES = ['auto', 'core', 'balanced', 'challenge'];
export function resolveDifficulty(level, performance) {
  if (level === 'core' || level === 'balanced' || level === 'challenge') return level;
  const acc = performance && performance.accuracy != null ? performance.accuracy : null;
  const attempts = (performance && performance.attempts) || 0;
  if (acc == null || attempts < 2) return 'core'; // first pass / barely seen -> rebuild
  if (acc < 70) return 'core';                     // still shaky -> fundamentals
  if (acc < 90) return 'balanced';                 // solid -> apply under pressure
  return 'challenge';                              // mastered -> stress-test edges
}
const DIFFICULTY_DIRECTIVE = {
  core: `DIFFICULTY: CORE (reactivation / first pass). Write a FAIR question that checks the learner can APPLY the core idea in a straightforward, representative case. Do NOT use trick questions, obscure edge cases, or answers that hinge on an error/exception the learner could not anticipate. Aim so someone who just studied this gets it right roughly 85% of the time. Distractors are honest common mistakes, not adversarial traps.`,
  balanced: `DIFFICULTY: BALANCED. Write a question that needs genuine understanding — apply the idea in a slightly non-obvious case, with plausible-misconception distractors. Mild edge-awareness is fine; avoid adversarial trickery and ambiguous corner cases.`,
  challenge: `DIFFICULTY: CHALLENGE. Push into edge cases, boundary conditions, and subtle misconceptions that separate deep mastery from surface familiarity. It MUST remain FAIR: exactly one defensibly-correct answer, unambiguous, and never dependent on an error/exception or trivia the learner cannot reason out from the concept itself.`,
};
/** Performance summary + difficulty directive for a generation prompt. `level` is
 *  the raw choice ('auto'|'core'|'balanced'|'challenge'); 'auto' ramps from history. */
function difficultyBlock(level, performance) {
  return `${performanceBlock(performance)}\n\n${DIFFICULTY_DIRECTIVE[resolveDifficulty(level, performance)]}`;
}

/** Render the "already asked, do not repeat" avoid-list (bounded to keep prompts small). */
function avoidBlock(existing, verb = 'do NOT duplicate or paraphrase any of these') {
  const list = (Array.isArray(existing) ? existing : []).map((q) => String(q || '').trim()).filter(Boolean).slice(0, 60);
  if (!list.length) return '';
  return `ALREADY IN THE BANK (${verb}):\n${list.map((q) => `- ${q}`).join('\n')}\n`;
}

/**
 * Optional steer for a generation run — whoever triggered it describing what kind
 * of questions/cards they want (e.g. "more application scenarios", "focus on RNNs",
 * "harder edge cases", or a weakness to drill). Used by both the admin generator
 * and the learner's Generate-Questions box. Injected as high-priority guidance on
 * emphasis/style, but it never overrides accuracy or the formatting rules. Empty
 * when no guidance is given.
 */
function guidanceBlock(instructions) {
  const s = String(instructions || '').trim().slice(0, 2000);
  if (!s) return '';
  return `\nREQUESTED FOCUS (what kind of questions to write — follow this closely for emphasis, angle and difficulty, but NEVER at the expense of accuracy, grounding, or the formatting rules):\n"""\n${s}\n"""\n`;
}

/**
 * Optional source material the learner chose to base generated questions on
 * (concatenated transcript text). Questions may draw on its specifics; it is a
 * reference, not a hard grounding contract (generateQuestions stays a
 * knowledge-based generator). Empty when no transcripts were selected.
 */
function referenceBlock(reference) {
  const s = String(reference || '').trim().slice(0, 8000);
  if (!s) return '';
  return `\nREFERENCE MATERIAL the learner chose to base these questions on (draw on its specifics and terminology where relevant; do not contradict it):\n"""\n${s}\n"""\n`;
}

/**
 * Render the knowledge graph's prerequisite context for a generation prompt:
 * what this topic builds on and where the learner stands on each piece
 * ([{topic, accuracy, attempts, why}] from lib/graph.js prereqContext). Weak or
 * untouched prerequisites steer questions to exercise them as sub-steps —
 * that's how the graph "tells the algorithm what to include in the prompt".
 */
function prereqBlock(prereqs) {
  const list = (Array.isArray(prereqs) ? prereqs : []).filter((p) => p && p.topic).slice(0, 6);
  if (!list.length) return '';
  const line = (p) => {
    const standing = p.attempts > 0
      ? `learner at ${p.accuracy}% over ${p.attempts} attempt(s)${(p.accuracy ?? 0) < 70 ? ' — WEAK' : ''}`
      : 'never practised — assume NO fluency';
    return `- ${p.topic}: ${standing}${p.why ? ` (${p.why})` : ''}`;
  };
  return `PREREQUISITE CONTEXT (knowledge graph — what this topic builds on, and the learner's standing on each):
${list.map(line).join('\n')}
Use it: where a prerequisite is WEAK or never practised, prefer questions whose solution path exercises that prerequisite as a natural sub-step (practising this topic should also repair the gap), and never let a correct answer HINGE on unexplained fluency in it. Where prerequisites are strong, build on them freely for depth.
`;
}

/**
 * Plan a set of DISTINCT questions BEFORE any are written. One cheap call reads
 * the concept, decides HOW mastery is actually built for it, and emits one
 * "brief" per question so the parallel writers diverge by design instead of by
 * luck.
 *
 * The key idea (the chain-rule case): "distinct" does NOT mean "differently
 * worded". For a PROCEDURAL skill, mastery comes from repeating the SAME process
 * over varied givens, so the briefs vary the inputs and the questions SHOULD look
 * structurally parallel. For a CONCEPTUAL skill, mastery comes from probing
 * different facets, so the briefs vary the angle. The planner classifies the
 * skill first, then varies along the right axis.
 *
 * `existing` (already-banked stems) is an avoid-list so plans don't recreate what
 * the learner has seen; `performance` ({accuracy, attempts, missed}) aims the
 * plan at real weak spots. Returns up to `count` briefs — callers MUST degrade
 * gracefully when fewer (or none) come back.
 *
 * @returns {Promise<{mode: string, briefs: string[]}>}
 */
export async function planQuestions({ label, context, existing = [], performance = null, difficulty = 'auto', prereqs = [], count }, ai = {}) {
  const n = Math.min(10, Math.max(1, parseInt(count, 10) || 1));
  const prompt = `You are an expert instructional designer planning a set of up to ${n} quiz questions that TOGETHER make a student fully master ONE concept. You are NOT writing the questions yet — only a one-line brief for each, so specialist writers can produce them in parallel without overlapping.

CONCEPT / SCOPE: "${label}"
WHAT IS BEING TESTED:
${context}

${difficultyBlock(difficulty, performance)}

${prereqBlock(prereqs)}
${avoidBlock(existing, 'do NOT plan a question that duplicates or paraphrases any of these')}
STEP 1 — Decide how THIS concept is actually mastered:
- "procedural": a process/skill mastered by REPEATED PRACTICE over varied givens (e.g. applying the chain rule, integrating by parts, matrix multiplication). Different questions run the SAME procedure on DIFFERENT inputs and SHOULD look structurally similar — that is correct practice, not repetition.
- "conceptual": an idea mastered by understanding it from multiple ANGLES (definitions, implications, edge cases, comparisons, common misconceptions).
- "mixed": needs a few conceptual anchors plus several practice repetitions.

STEP 2 — Produce up to ${n} briefs that TOGETHER give full coverage with NO wasted question (no two briefs may be interchangeable):
- If procedural: each brief names a DIFFERENT given/input/scenario to run the process on (vary functions, numbers, contexts, difficulty), holding the process constant.
- If conceptual: each brief names a DIFFERENT facet, angle, or misconception to target.
- If the concept is narrow and genuinely supports fewer than ${n} distinct, non-redundant questions, return FEWER briefs rather than padding with near-duplicates.

Each brief is ONE sentence: what THIS question should test and, where relevant, the exact given to use or the misconception to bait.

Return ONLY JSON: {"mode": "procedural|conceptual|mixed", "briefs": ["brief 1", "brief 2"]}`;

  const obj = parseLooseJson(await complete(prompt, { json: true, ...ai }));
  const rawBriefs = Array.isArray(obj?.briefs) ? obj.briefs : Array.isArray(obj) ? obj : [];
  const briefs = rawBriefs.map((b) => String(b || '').trim()).filter(Boolean).slice(0, n);
  const mode = ['procedural', 'conceptual', 'mixed'].includes(obj?.mode) ? obj.mode : 'mixed';
  return { mode, briefs };
}

function buildPrompt(topic, baseline, count, { existing = [], performance = null, difficulty = 'auto', prereqs = [], instructions = '', reference = '' } = {}) {
  return `You are a Wise Master Educator and Professional Test Developer.
Below are a few "Baseline Questions" from my database for the topic: "${topic}", shown ONLY so you can calibrate the expected depth.

BASELINE DATA (depth calibration only):
${JSON.stringify(baseline)}

${difficultyBlock(difficulty, performance)}

${prereqBlock(prereqs)}
${avoidBlock(existing)}${referenceBlock(reference)}${guidanceBlock(instructions)}
YOUR MISSION:
1. Build ON TOP of the baseline: increase rigor beyond simple definitions toward conceptual mechanics, implications, and multi-step reasoning.
2. First decide how THIS topic is mastered, then make the ${count} new questions DISTINCT accordingly:
   - PROCEDURAL skill (a process practised over varied inputs, e.g. applying the chain rule): each question runs the same process on a DIFFERENT given; questions MAY share structure — that is correct practice, not repetition.
   - CONCEPTUAL skill: each question probes a DIFFERENT facet, angle, or misconception.
3. No two of the new questions may be interchangeable, and none may duplicate or paraphrase anything already in the bank (above).

CRITICAL FORMATTING RULES (TO PREVENT TEST-HACKING):
- OPTION UNIFORMITY: All 4 options must be of approximately the same character length.
- No "Length Bias": Do not make the correct answer the longest or most detailed.
- PARALLEL STRUCTURE: If one option starts with a verb, all must start with a verb. Keep the phrasing symmetrical.
- SOPHISTICATED DISTRACTORS: Ensure wrong answers are plausible and address common high-level misconceptions.

Generate ${count} NEW "Mastery Level" MCQs.
Do NOT use em dashes (the long dash). Use commas, colons, or simple hyphens instead.

${LATEX_RULE}
${ANSWER_INDEX_RULE}

Return ONLY a JSON array: [{"question": "text", "options": ["A", "B", "C", "D"], "answerIndex": 0}]`;
}

/* ------------------- Transcript-grounded generation (Academy) --------------- */
/*
 * The prompts above are a DATA-SCIENCE profile: they exist to produce maths, and
 * LATEX_RULE is the giveaway. A marketing curriculum needs the opposite —
 * scenario/case questions about campaigns, budgets and decisions, with NO KaTeX
 * anywhere (a stray "$500" would render as broken math, since $...$ IS the math
 * delimiter — hence the explicit rule below).
 *
 * The other difference is where the truth comes from. generateQuestions() draws
 * on the model's own knowledge, calibrated by baseline questions. Here the
 * TRANSCRIPT is the source of truth: it is the actual course material, and a
 * question about something the video never said is worse than no question at
 * all. So the prompt is strictly grounded and the model is told to write fewer
 * questions rather than invent.
 */

/** One MCQ plus the difficulty tag the Academy's selector uses. */
const TRANSCRIPT_MCQ_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    answerIndex: { type: 'integer' },
    difficulty: { type: 'string', enum: ['core', 'balanced', 'challenge'] },
  },
  required: ['question', 'options', 'answerIndex', 'difficulty'],
  propertyOrdering: ['question', 'options', 'answerIndex', 'difficulty'],
};
const TRANSCRIPT_MCQ_ARRAY_SCHEMA = { type: 'array', items: TRANSCRIPT_MCQ_SCHEMA };

const NO_LATEX_RULE = `PLAIN-TEXT RULE (this course is NOT maths — the app renders $...$ as LaTeX):
- Never use dollar-sign delimiters. Write money as "USD 500" or "500 dollars", NEVER "$500" (a lone $ would be parsed as the start of a formula and mangle the question).
- No LaTeX commands, no backslash macros, no code fences, no backticks.
- Percentages, ratios and simple arithmetic go in plain words/digits: "a 3.2% CTR", "2x ROAS".`;

const DIFFICULTY_MIX_RULE = `DIFFICULTY: tag every question "core", "balanced", or "challenge".
- core: can they recall/recognise what was taught?
- balanced: can they apply it to a straightforward situation?
- challenge: can they judge a realistic trade-off, diagnose a problem, or pick between two defensible options?
Aim for a spread across the batch rather than all one level.`;

/* --------------------------- auto-file router ------------------------------ */
/**
 * The shape the router returns: where a piece of source material belongs, and
 * which topics it should build. New-vs-existing is decided by the CALLER from
 * these names against the live catalog, so the model is never trusted to know
 * what already exists — only to place the material sensibly.
 */
const PLACEMENT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    track: { type: 'string' },
    course: { type: 'string' },
    lesson: { type: 'string' },
    topics: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'summary', 'track', 'course', 'lesson', 'topics'],
  propertyOrdering: ['title', 'summary', 'track', 'course', 'lesson', 'topics'],
};

/** Longest slice of a transcript worth reading just to decide WHERE it belongs. */
const CLASSIFY_TRANSCRIPT_CHARS = 9000;

/** Render a catalog (rows of {track,course,lesson,topic}) as an indented outline for the router. */
function catalogOutline(catalog, cap = 12000, focus = '') {
  const tree = new Map();
  for (const r of catalog) {
    const key = [r.track, r.course, r.lesson].join(' > ');
    if (!tree.has(key)) tree.set(key, []);
    if (r.topic) tree.get(key).push(r.topic);
  }
  const groups = [...tree].map(([key, topics]) => ({
    key,
    text: [key, ...topics.map((t) => `    - ${t}`)].join('\n'),
  }));
  const full = groups.map((g) => g.text).join('\n');
  // The common case: it fits, so emit the whole thing in curriculum order.
  if (full.length <= cap) return full;

  /*
   * It does not fit. Cutting the string at `cap` would keep whatever happens to sit first in
   * curriculum order, which is unrelated to what was asked — on a small local model that produced
   * answers like "I don't see a card on boosting" for a learner whose engine contains a whole
   * Ensemble Methods course, and then invented plausible topic names to fill the gap.
   *
   * So when we must drop content, drop the LEAST relevant: score each lesson group against the
   * words in the question and emit best-first. Ties keep curriculum order, so a question with no
   * usable keywords degrades to exactly the old behaviour.
   */
  const words = [...new Set(String(focus).toLowerCase().match(/[a-z][a-z+#.-]{2,}/g) || [])];
  const score = (g) => {
    const hay = g.text.toLowerCase();
    return words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0);
  };
  const ranked = words.length
    ? groups.map((g, i) => ({ g, i, s: score(g) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.g)
    : groups;

  const kept = [];
  let used = 0;
  let dropped = 0;
  for (const g of ranked) {
    if (used + g.text.length + 1 > cap) { dropped += 1; continue; }
    kept.push(g);
    used += g.text.length + 1;
  }
  // Re-sort what survived back into curriculum order so the outline still reads as a curriculum.
  const order = new Map(groups.map((g, i) => [g.key, i]));
  kept.sort((a, b) => order.get(a.key) - order.get(b.key));
  return `${kept.map((g) => g.text).join('\n')}\n… (${dropped} further lesson group(s) omitted — ask about one by name to see it)`;
}

/**
 * Ground the Study Assistant in the REAL curriculum so it can answer "which card /
 * topic / lesson teaches X" from what actually exists instead of inventing a name.
 * The caller passes the learner's catalog ONLY for content-location questions (so
 * ordinary turns don't pay the tokens); empty → no block. A "card"/"topic"/
 * "sub-lesson" the student can study IS one of these leaf items.
 */
/**
 * How much curriculum to paste into the assistant prompt.
 *
 * A hosted model swallows 32k characters of catalog without noticing. A local one on a laptop does
 * not: with ~900 topics that block alone overruns a typical 8k context, and generation slows from
 * seconds to many minutes — the answer is still correct, but nobody waits that long. So when the
 * engine is Ollama or LM Studio the grounding is trimmed to something a small model can actually
 * read. Raise it with LOCAL_GROUNDING_CHARS if you run a long-context local model.
 */
const LOCAL_GROUNDING_CHARS = parseInt(process.env.LOCAL_GROUNDING_CHARS || '6000', 10);
function groundingBudget(ai = {}) {
  const local = ai.provider === 'ollama' || ai.provider === 'lmstudio';
  return local
    ? { catalogChars: LOCAL_GROUNDING_CHARS, transcriptChars: Math.round(LOCAL_GROUNDING_CHARS / 3) }
    : { catalogChars: 32000, transcriptChars: 12000 };
}

function assistantCatalogBlock(catalog, transcripts = [], budget = {}, focus = '') {
  const { catalogChars = 32000, transcriptChars = 12000 } = budget;
  if ((!Array.isArray(catalog) || !catalog.length) && (!Array.isArray(transcripts) || !transcripts.length)) return '';
  let block = '';
  if (Array.isArray(catalog) && catalog.length) {
    block += `THE LEARNER'S MASTERY ENGINE — the EXACT set of content they've chosen to master: their tracks, courses, lessons and sub-lessons. Sections they removed are NOT here; sections they individually added ARE. When they ask "what's in my Mastery Engine" / "what am I studying" / to audit their engine, THIS list is the answer (not the whole catalog or a roadmap). Track > Course > Lesson, then each lesson's sub-lessons — these sub-lessons ARE the "cards"/"topics" they can study:
${catalogOutline(catalog, catalogChars, focus)}
`;
  }
  if (Array.isArray(transcripts) && transcripts.length) {
    const lines = transcripts.slice(0, 400)
      .map((t) => `    - "${t.title}"${[t.track, t.course, t.lesson].filter(Boolean).length ? `  (${[t.course, t.lesson].filter(Boolean).join(' > ')})` : ''}`);
    let txt = lines.join('\n');
    if (txt.length > transcriptChars) txt = `${txt.slice(0, transcriptChars)}\n    … (more)`;
    block += `\nSOURCE TRANSCRIPTS attached to the curriculum (videos/notes the questions were built from — these are the ONLY transcripts that exist; a "transcript"/"video" the student can point to is one of these):\n${txt}\n`;
  }
  return `${block}
HARD RULE — CONTENT LOCATION: when the student asks where something is taught, or which card / sub-lesson / lesson / course / track / transcript / video covers a concept, answer ONLY with names copied VERBATIM from the lists above. NEVER invent, rename, or guess a card/topic/lesson/section/transcript that is not listed. If nothing clearly matches, say so plainly (e.g. "I don't see a dedicated card on that exact thing") and point to the closest real items that do exist. Do not present an inferred or "should-exist" name as if it were real.`;
}

/**
 * COACH MODE grounding: the student's own progress (what they've mastered / are
 * weak on) plus the instruction to answer AND recommend a personalised drill path
 * of REAL sub-lessons. Only injected when the caller turns coach mode on (it rides
 * on top of the catalog/transcripts block, which the caller always supplies here).
 */
function assistantCoachBlock(coach, progress, admin = false) {
  if (!coach) return '';
  const prog = String(progress || '').trim();
  // Admins can generate new curriculum from Academy Admin → "Build with AI (From a
  // goal)": paste a goal, and the app drafts a course of lessons+topics on top of
  // what's already known, then generates questions + flashcards. So in coach mode an
  // admin can ask the assistant to write that goal for them, targeting their gaps.
  const buildTool = admin
    ? `\n\nBUILD-WITH-AI (you are talking to an ADMIN): the app can GENERATE new lessons from Academy Admin → "Build with AI" → "From a goal" — you paste a plain-English GOAL and it drafts a module (a course of lessons + sub-lessons) on top of what the learner already knows, then writes questions and flashcards. If the student asks you to fill their gaps, build content, or "write a prompt to Build with AI", produce a READY-TO-PASTE goal inside a fenced code block: one tight paragraph that (a) names the specific weak/missing areas from the progress above, (b) states what they've ALREADY mastered so the module builds on it instead of re-teaching, and (c) states the concrete can-do outcome to reach. Then tell them to paste it into Academy Admin → Build with AI → From a goal.`
    : '';
  return `${prog ? `THE STUDENT'S PROGRESS SO FAR (calibrate to this — do NOT re-teach what they've mastered; start where they're weak or haven't begun):\n${prog}\n\n` : ''}COACH MODE IS ON. WHEN — AND ONLY WHEN — the student's message is about their LEARNING (a concept or curriculum topic, what to study next, how to improve at something in the curriculum above, or their study progress), end that reply with a section headed exactly "**Suggested path to drill this**": a NUMBERED list of 2 to 6 real sub-lessons drawn VERBATIM from the curriculum above, in order (prerequisites first), tailored to their progress (skip what they've mastered, start where they're weak or haven't begun, end at whichever existing sub-lesson most directly covers what they asked about). Every item MUST be a sub-lesson that literally appears in the curriculum above — never invent one.
DO NOT append a study path when the conversation is not about studying the curriculum — e.g. logging a workout or body stats, career or goals, personal reflections, editing their profile, or small talk. In those cases just answer naturally, with no "Suggested path" section. Never force a curriculum tangent onto an unrelated topic.${buildTool}`;
}

/**
 * Decide where a piece of source material belongs in a program and what topics it
 * should build — the "auto-file" router behind the admin's paste-and-go flow.
 *
 * Given the transcript and the program's current Track > Course > Lesson > Topic
 * tree, it either slots the material into an EXISTING lesson (reusing names
 * exactly so nothing forks a near-duplicate) or proposes new track/course/lesson/
 * topic names. It only decides placement; the caller upserts the rows, attaches
 * the transcript, and runs the normal generation job — so this stays a pure,
 * side-effect-free classification.
 *
 * @returns {Promise<{title:string,summary:string,track:string,course:string,lesson:string,topics:string[]}>}
 */
export async function classifyTranscript({ transcript, catalog = [], programName = '' }, ai = {}, onToken) {
  const body = String(transcript || '').trim().slice(0, CLASSIFY_TRANSCRIPT_CHARS);
  if (!body) throw new Error('No source material to place');

  const outline = catalogOutline(catalog);
  const prompt = `You are the curriculum architect for a professional training program${programName ? ` ("${programName}")` : ''}. New source material has arrived and you must decide where it belongs.

CURRENT CURRICULUM (Track > Course > Lesson, with each lesson's topics):
${outline || '(the curriculum is empty — you are placing the very first material)'}

NEW SOURCE MATERIAL:
"""
${body}
"""

YOUR JOB — return a single placement:
1. Decide the Track, Course, and Lesson this material belongs under.
   - If it fits an EXISTING track/course/lesson above, reuse that name EXACTLY, character-for-character, so it merges instead of forking a near-duplicate ("Meta Ads" must not become "Facebook Ads").
   - If it is genuinely new, propose a clear, concise name. Only name a lesson "Unit N: Name" if that matches the course's existing style; otherwise a plain descriptive lesson name is fine.
2. Choose the TOPICS this material should build questions for (1 to 6):
   - Include existing topics in the chosen lesson that this material genuinely covers (reuse their exact names) so learners get reinforced on them.
   - Add new topics for distinct skills or concepts this material teaches that no existing topic covers.
   - A topic is ONE testable idea named as a short noun phrase ("Frequency capping", "UTM parameters"). Do not make a topic per sentence; group into a handful of meaningful ones.
3. Write a short "title" for this material (like a video or lesson title) and a one-sentence "summary" of what it teaches.

Ignore filler: greetings, sponsor reads, subscribe requests and tangents are not curriculum.

Return ONLY JSON: {"title":"...","summary":"...","track":"...","course":"...","lesson":"...","topics":["...","..."]}`;

  // Streaming path (onToken) forwards the reasoning trace live and drops the JSON
  // schema (the stream API can't carry it); parseLooseJson recovers the object.
  const text = onToken
    ? await streamStructured(prompt, ai, onToken)
    : await complete(prompt, { json: true, schema: PLACEMENT_SCHEMA, ...ai });
  let out;
  try { out = parseLooseJson(text); } catch { throw new Error('The model returned non-JSON content'); }
  if (!out || typeof out !== 'object' || Array.isArray(out)) throw new Error('The model did not return a placement object');

  const clean = (v) => String(v == null ? '' : v).trim();
  const track = clean(out.track); const course = clean(out.course); const lesson = clean(out.lesson);
  if (!track || !course || !lesson) throw new Error('The model did not return a full Track / Course / Lesson placement');
  const topics = [...new Set((Array.isArray(out.topics) ? out.topics : []).map(clean).filter(Boolean))].slice(0, 8);
  if (!topics.length) throw new Error('The model did not propose any topics');

  return { title: clean(out.title) || 'Untitled', summary: clean(out.summary), track, course, lesson, topics };
}

/* ----------------------- goal-based module planner ------------------------- */
/**
 * The shape the goal planner returns: a whole MODULE (one course, several lessons)
 * that builds toward a stated goal. New-vs-existing is decided by the CALLER from
 * these names against the live catalog, exactly like classifyTranscript — the
 * model only proposes a sensible structure, never asserts what already exists.
 */
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    track: { type: 'string' },
    course: { type: 'string' },
    summary: { type: 'string' },
    assumedKnowledge: { type: 'array', items: { type: 'string' } },
    lessons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          lesson: { type: 'string' },
          rationale: { type: 'string' },
          topics: { type: 'array', items: { type: 'string' } },
        },
        required: ['lesson', 'topics'],
        propertyOrdering: ['lesson', 'rationale', 'topics'],
      },
    },
  },
  required: ['track', 'course', 'summary', 'lessons'],
  propertyOrdering: ['track', 'course', 'summary', 'assumedKnowledge', 'lessons'],
};

/** Render a capped bullet list of topic names for the planner's baseline blocks. */
function nameList(names, cap = 120) {
  const list = [...new Set((Array.isArray(names) ? names : []).map((n) => String(n || '').trim()).filter(Boolean))].slice(0, cap);
  return list.length ? list.map((n) => `- ${n}`).join('\n') : '';
}

/**
 * Draft a whole learning MODULE from a stated GOAL, building on what the learner
 * already knows — the "just-in-time / learn-a-goal" planner behind the admin's
 * goal box. It returns one course of several lessons (each with a handful of
 * topics), plus the prerequisites it is deliberately NOT re-teaching
 * (`assumedKnowledge`). It only proposes structure — the caller upserts the rows,
 * writes+attaches a brief per lesson, and runs the normal generation job — so this
 * stays a pure, side-effect-free classification, mirroring classifyTranscript.
 *
 * @returns {Promise<{track:string,course:string,summary:string,assumedKnowledge:string[],lessons:Array<{lesson:string,rationale:string,topics:string[]}>}>}
 */
export async function planCurriculum(
  { goal, known = [], learning = [], catalog = [], programName = '', reference = '' },
  ai = {},
  onToken,
) {
  const want = String(goal || '').trim();
  if (!want) throw new Error('Describe what you want to learn first');

  const outline = catalogOutline(catalog);
  const knownBlock = nameList(known);
  const learningBlock = nameList(learning);
  const ref = String(reference || '').trim().slice(0, 10000);
  const refBlock = ref
    ? `\nREFERENCE MATERIAL the learner supplied (e.g. their own code or docs — ground the plan in it where relevant, and prefer its concrete specifics over generic treatment):\n"""\n${ref}\n"""\n`
    : '';

  const prompt = `You are the curriculum architect for a personal, spaced-repetition mastery program${programName ? ` ("${programName}")` : ''}. A learner has told you a GOAL, and you must design a single MODULE (one course, broken into several lessons) that takes them there — building on what they already know rather than re-teaching it.

THE LEARNER'S GOAL:
"""
${want}
"""
${refBlock}
WHAT THE LEARNER HAS ALREADY MASTERED (do NOT create topics that re-teach these — treat them as prerequisites you build ON TOP of, and list the ones this module leans on under "assumedKnowledge"):
${knownBlock || '(no strong mastery on record — assume solid general fundamentals unless the goal says otherwise)'}

WHAT THE LEARNER IS STILL SHAKY ON (fair game to reinforce as a sub-step if the goal needs it):
${learningBlock || '(nothing on record)'}

CURRENT CURRICULUM (Track > Course > Lesson, with each lesson's topics) — reuse an existing Track/Course name EXACTLY if this module belongs there, otherwise propose a clear new one:
${outline || '(the curriculum is empty)'}

YOUR JOB — return ONE module as JSON:
1. "track" and "course": where this module lives. Reuse an existing track name character-for-character if it fits; propose a concise new course name for the module.
2. "summary": one or two sentences on what the learner will be able to do after this module.
3. "assumedKnowledge": the specific things (prefer names from the mastered list above) this module assumes and will NOT re-teach. This is the whole point — build on their base.
4. "lessons": 3 to 8 lessons, ordered so each builds on the previous. Each lesson has:
   - "lesson": a short, clear name.
   - "rationale": one sentence on why it's here / what it unlocks.
   - "topics": 2 to 6 TOPICS, each ONE testable idea named as a short noun phrase ("Express middleware", "Firestore vs SQL joins"). Not a topic per sentence; group into meaningful, quiz-able units. Do not include anything already in "assumedKnowledge".

Return ONLY JSON: {"track":"...","course":"...","summary":"...","assumedKnowledge":["..."],"lessons":[{"lesson":"...","rationale":"...","topics":["...","..."]}]}`;

  // Streaming path (onToken) forwards the reasoning trace live and drops the JSON
  // schema (the stream API can't carry it); parseLooseJson recovers the object.
  const text = onToken
    ? await streamStructured(prompt, ai, onToken)
    : await complete(prompt, { json: true, schema: PLAN_SCHEMA, ...ai });
  let out;
  try { out = parseLooseJson(text); } catch { throw new Error('The model returned non-JSON content'); }
  if (!out || typeof out !== 'object' || Array.isArray(out)) throw new Error('The model did not return a plan object');

  const clean = (v) => String(v == null ? '' : v).trim();
  const track = clean(out.track); const course = clean(out.course);
  if (!track || !course) throw new Error('The model did not return a Track / Course for the module');

  const seenLesson = new Set();
  const lessons = (Array.isArray(out.lessons) ? out.lessons : [])
    .map((l) => {
      const lesson = clean(l && l.lesson);
      const topics = [...new Set((Array.isArray(l && l.topics) ? l.topics : []).map(clean).filter(Boolean))].slice(0, 6);
      return { lesson, rationale: clean(l && l.rationale), topics };
    })
    .filter((l) => {
      if (!l.lesson || !l.topics.length) return false;
      const key = l.lesson.toLowerCase();
      if (seenLesson.has(key)) return false;
      seenLesson.add(key);
      return true;
    })
    .slice(0, 8);
  if (!lessons.length) throw new Error('The model did not propose any lessons');

  const assumedKnowledge = [...new Set((Array.isArray(out.assumedKnowledge) ? out.assumedKnowledge : []).map(clean).filter(Boolean))].slice(0, 24);
  return { track, course, summary: clean(out.summary), assumedKnowledge, lessons };
}

/* ----------------------- conversational curriculum editor ------------------ */
/**
 * The vocabulary of structural edits the AI curriculum editor may propose. Kept in
 * ONE place so the prompt, the client review UI and the server executor stay in
 * lock-step. Every op references EXISTING nodes by their exact names (track /
 * course / lesson / topic) — the server resolves those to real catalog rows and
 * REJECTS anything it can't find, so the model proposes and the code decides what
 * actually exists (same discipline as planCurriculum / classifyTranscript). New
 * names (rename targets, added sub-lessons, a merge target that doesn't exist yet)
 * are the only names allowed to be absent from the tree.
 */
const CURRICULUM_EDIT_OPS = `AVAILABLE OPERATIONS — every "op" is one JSON object. Reference existing Tracks, Courses, Lessons and Sub-lessons by their EXACT names from the tree above (copy them character-for-character). Always include "track". Add a short "note" (a few words) explaining WHY, shown to the admin.

- Merge one or more lessons into another (moves the sub-lessons in; overlapping sub-lessons are dropped):
  {"op":"merge_lessons","track":"…","course":"…","from":["Lesson A","Lesson B"],"into":"Target Lesson","drop":["duplicate sub-lesson name",…],"note":"…"}
  • "from": the lesson(s) being dissolved. "into": the lesson that survives (may be one of the existing lessons, or a brand-new name). "drop": sub-lessons to delete as redundant/overlapping (by name). Any moved sub-lesson whose name already exists in "into" is auto-dropped, so you only list genuinely-overlapping ones you want gone.

- Rename a lesson (keeps all its sub-lessons and learner progress):
  {"op":"rename_lesson","track":"…","course":"…","lesson":"Old name","newName":"New name","note":"…"}

- Rename a course:
  {"op":"rename_course","track":"…","course":"Old name","newName":"New name","note":"…"}

- Move a whole lesson into a different course (optionally a different track):
  {"op":"move_lesson","track":"…","course":"…","lesson":"…","toCourse":"…","toTrack":"…","note":"…"}   (omit toTrack to keep the track)

- Move a single sub-lesson into a different lesson (optionally a different course):
  {"op":"move_topic","track":"…","course":"…","lesson":"…","topic":"…","toLesson":"…","toCourse":"…","note":"…"}   (omit toCourse to keep the course)

- Delete a single sub-lesson:
  {"op":"delete_topic","track":"…","course":"…","lesson":"…","topic":"…","note":"…"}

- Delete a whole lesson and every sub-lesson under it:
  {"op":"delete_lesson","track":"…","course":"…","lesson":"…","note":"…"}

- Add a new sub-lesson (the course/lesson may be new):
  {"op":"add_topic","track":"…","course":"…","lesson":"…","topic":"…","note":"…"}

- Reorder the lessons within a course (list ALL of that course's lessons in the new order):
  {"op":"reorder_lessons","track":"…","course":"…","order":["Lesson 1","Lesson 2",…],"note":"…"}

- Reorder the sub-lessons within a lesson (list ALL of that lesson's sub-lessons in the new order):
  {"op":"reorder_topics","track":"…","course":"…","lesson":"…","order":["Sub-lesson 1","Sub-lesson 2",…],"note":"…"}`;

/**
 * A conversational curriculum editor. The admin describes a change in plain
 * English ("merge the Calculus and Calculus-for-ML lessons and drop the overlap");
 * given the live Track > Course > Lesson > Sub-lesson tree and the conversation so
 * far, the model returns a short chat reply PLUS a full set of structural
 * operations to propose. It is PURE planning — it never mutates anything; the
 * caller resolves the ops against the real catalog, shows them for review, and
 * only the companion apply step writes. Streams its reasoning like the other
 * Composing-Room planners.
 *
 * `history` is prior turns [{role:'user'|'assistant', content}]. Each turn the
 * model returns the COMPLETE proposed op set for the request so far (not a diff),
 * so the review panel always reflects the latest intent.
 *
 * @returns {Promise<{reply:string, summary:string, operations:Array<object>}>}
 */
export async function planCurriculumEdit(
  { message, history = [], catalog = [], programName = '' },
  ai = {},
  onToken,
) {
  const msg = String(message || '').trim();
  if (!msg) throw new Error('Tell the editor what to change');

  const outline = catalogOutline(catalog, 24000);
  const turns = (Array.isArray(history) ? history : [])
    .slice(-8)
    .map((t) => `${t.role === 'assistant' ? 'YOU' : 'ADMIN'}: ${String(t.content || '').trim()}`)
    .filter((l) => l.length > 4)
    .join('\n');

  const prompt = `You are the curriculum editor for a spaced-repetition mastery program${programName ? ` ("${programName}")` : ''}. An ADMIN is reshaping the curriculum by talking to you. You suggest concrete structural edits; the admin reviews them and applies them with one click. You NEVER teach content or write questions here — you only restructure the tree (merge, split, move, rename, delete, add, reorder).

THE CURRENT CURRICULUM — Track > Course > Lesson, then each lesson's sub-lessons indented beneath it. These exact names are the ONLY things you may reference in operations:
${outline || '(the curriculum is empty)'}

${CURRICULUM_EDIT_OPS}

HOW TO WORK:
- Read what the admin wants, then propose the SMALLEST set of operations that achieves it well. Prefer merging/renaming/moving (which keep learner progress and banked questions) over deleting-and-re-adding.
- When two lessons overlap, MERGE them: move the unique sub-lessons into the one that should survive and "drop" the redundant duplicates. Judge overlap by meaning, not just identical names ("Derivatives" and "Differentiation" overlap).
- Resequence when it clearly improves the learning order (prerequisites before what builds on them). Do NOT reorder gratuitously if the admin didn't ask and the order is already fine.
- If the admin is only asking a question, chatting, or you need clarification, return an EMPTY operations array and just answer in "reply".
- NEVER invent a track/course/lesson/sub-lesson name that isn't in the tree above, except as a NEW name in a rename target, an added sub-lesson, or a merge "into" you are intentionally creating.

Return ONLY JSON in this shape (no prose outside it):
{"reply":"a short, friendly message to the admin explaining what you're proposing (or answering their question) — plain text, no markdown","summary":"one short headline for the whole change set, e.g. \\"Merge Calculus for ML into Calculus, drop 3 overlaps\\" (empty string if no operations)","operations":[ …ops… ]}

${turns ? `CONVERSATION SO FAR:\n${turns}\n\n` : ''}ADMIN: ${msg}`;

  const text = onToken
    ? await streamStructured(prompt, ai, onToken)
    : await complete(prompt, { json: true, ...ai });
  let out;
  try { out = parseLooseJson(text); } catch { throw new Error('The model returned non-JSON content'); }
  if (!out || typeof out !== 'object' || Array.isArray(out)) throw new Error('The model did not return an editor response');

  const clean = (v) => String(v == null ? '' : v).trim();
  const operations = (Array.isArray(out.operations) ? out.operations : [])
    .filter((o) => o && typeof o === 'object' && clean(o.op))
    .slice(0, 40);
  return {
    reply: clean(out.reply) || (operations.length ? 'Here are the changes I propose — review them, then apply.' : ''),
    summary: clean(out.summary),
    operations,
  };
}

/* -------------------------- goal-based roadmap planner --------------------- */
/**
 * The shape the roadmap planner returns. The model references topics ONLY by their
 * [index] into the enumerated catalog we hand it — it never supplies a name — so
 * every selected topic is resolved from a REAL catalog row here, the same
 * "the model proposes, the code decides existence" discipline as planCurriculum.
 */
const ROADMAP_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    stages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: { ref: { type: 'integer' }, note: { type: 'string' } },
              required: ['ref'],
              propertyOrdering: ['ref', 'note'],
            },
          },
        },
        required: ['title', 'items'],
        propertyOrdering: ['title', 'summary', 'items'],
      },
    },
    gaps: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'stages'],
  propertyOrdering: ['title', 'summary', 'stages', 'gaps'],
};

/**
 * Enumerate catalog topics as "[i] Track > Course > Lesson > Topic" so the planner
 * can reference exact rows by INDEX (never by a hallucinated name). Returns
 * `{ rows, text }` where `rows[i]` is the catalog row for index `i`.
 */
function enumerateTopics(catalog, cap = 600) {
  const rows = (Array.isArray(catalog) ? catalog : []).filter((r) => r && r.topic).slice(0, cap);
  const lines = rows.map((r, i) => `[${i}] ${[r.track, r.course, r.lesson, r.topic].filter(Boolean).join(' > ')}`);
  let text = lines.join('\n');
  if (text.length > 22000) text = `${text.slice(0, 22000)}\n… (only the indices above are selectable)`;
  return { rows, text };
}

/**
 * Draft a ROADMAP — an ordered learning PATH toward a GOAL — by SELECTING and
 * SEQUENCING topics that already exist in the catalog and grouping them into
 * STAGES that build on each other. It re-uses the shared bank as-is (it does not
 * create content); topics it thinks the goal NEEDS but the catalog lacks come back
 * as `gaps` (short names) so the caller can author them. Pure and side-effect-free
 * like the other planners: the model only picks indices, we resolve real rows.
 *
 * @returns {Promise<{title:string,summary:string,stages:Array<{title:string,summary:string,items:Array<{topicId:string,track:string,course:string,lesson:string,topic:string,note:string}>}>,gaps:string[]}>}
 */
export async function planRoadmap(
  { goal, title = '', catalog = [], programName = '', reference = '' },
  ai = {},
  onToken,
) {
  const want = String(goal || '').trim();
  if (!want) throw new Error('Describe the goal of the roadmap first');

  const { rows, text: enumText } = enumerateTopics(catalog);
  if (!rows.length) throw new Error('There are no topics to build a roadmap from yet');
  const ref = String(reference || '').trim().slice(0, 8000);
  const refBlock = ref
    ? `\nREFERENCE MATERIAL the admin supplied (ground the path in it where relevant):\n"""\n${ref}\n"""\n`
    : '';

  const prompt = `You are a senior curriculum architect designing a ROADMAP for a mastery program${programName ? ` ("${programName}")` : ''}: an ordered learning PATH that takes someone from zero to a concrete GOAL by SELECTING and SEQUENCING topics that ALREADY EXIST in the catalog and grouping them into STAGES that build on each other.

THE GOAL:
"""
${want}
"""
${refBlock}
AVAILABLE TOPICS — each line is "[index] Track > Course > Lesson > Topic". Reference topics ONLY by their [index] number; never invent a topic:
${enumText}

YOUR JOB — return a roadmap as JSON:
1. "title": a short, memorable name for this roadmap${title ? ` (the admin suggested "${String(title).trim().slice(0, 120)}" — use it unless a clearly better one fits)` : ''}.
2. "summary": one or two sentences — who this is for and what they will be able to do at the end.
3. "stages": ordered MILESTONES (aim for 4 to 8), each building on the ones before. Each stage has:
   - "title": a short milestone name written as an OUTCOME ("Read and run the code", "Understand the data layer").
   - "summary": one sentence on what the learner can do once this stage is complete.
   - "items": the topics for this stage, IN STUDY ORDER, as {"ref": <index>, "note": "<short: why it's here / what to focus on for the goal>"}. Pull ONLY from the indices above. Order stages AND items so a prerequisite always comes before whatever needs it. Pull topics from ANYWHERE in the catalog regardless of how they are currently filed — the roadmap does not have to respect the course structure.
4. "gaps": things the goal genuinely REQUIRES that NO available topic covers, as short topic names (so they can be authored later). Empty array if the catalog already covers the goal.

Be selective: a roadmap is the SHORTEST honest path to the goal, not a dump of everything. Skip topics that don't serve the goal. Never list the same topic in two stages.

Return ONLY JSON: {"title":"...","summary":"...","stages":[{"title":"...","summary":"...","items":[{"ref":0,"note":"..."}]}],"gaps":["..."]}`;

  // Streaming path (onToken) forwards the reasoning trace live and drops the JSON
  // schema (the stream API can't carry it); parseLooseJson recovers the object.
  const raw = onToken
    ? await streamStructured(prompt, ai, onToken)
    : await complete(prompt, { json: true, schema: ROADMAP_SCHEMA, ...ai });
  let out;
  try { out = parseLooseJson(raw); } catch { throw new Error('The model returned non-JSON content'); }
  if (!out || typeof out !== 'object' || Array.isArray(out)) throw new Error('The model did not return a roadmap object');

  const clean = (v) => String(v == null ? '' : v).trim();
  const used = new Set(); // a topic appears in the roadmap at most once (first stage wins)
  const stages = (Array.isArray(out.stages) ? out.stages : [])
    .map((s, si) => {
      const items = (Array.isArray(s && s.items) ? s.items : [])
        .map((it) => {
          const idx = Number(it && it.ref);
          const row = Number.isInteger(idx) ? rows[idx] : null;
          if (!row || used.has(row.id)) return null;
          used.add(row.id);
          return {
            topicId: row.id,
            track: row.track || '',
            course: row.course || '',
            lesson: row.lesson || '',
            topic: row.topic || '',
            note: clean(it && it.note).slice(0, 500),
          };
        })
        .filter(Boolean);
      return { title: clean(s && s.title) || `Stage ${si + 1}`, summary: clean(s && s.summary), items };
    })
    .filter((s) => s.items.length)
    .slice(0, 12);
  if (!stages.length) throw new Error('The model did not select any topics for the roadmap');

  const gaps = [...new Set((Array.isArray(out.gaps) ? out.gaps : []).map(clean).filter(Boolean))].slice(0, 24);
  return { title: clean(out.title) || clean(title) || 'Roadmap', summary: clean(out.summary), stages, gaps };
}

/**
 * Write a compact teaching brief for ONE lesson of a goal-planned module. This is
 * the stored "lesson" the learner can read AND the source material that grounds
 * the lesson's generated questions and flashcards. It is written for someone who
 * already knows `assumedKnowledge`, so it teaches only the delta — dense enough to
 * support real MCQs, not a wall of text. Plain prose (no JSON).
 *
 * @returns {Promise<string>}
 */
export async function writeLessonBrief(
  { course, lesson, topics = [], assumedKnowledge = [], goal = '', reference = '' },
  ai = {},
) {
  const topicList = nameList(topics, 12) || '(the lesson topics)';
  const assume = nameList(assumedKnowledge, 24);
  const ref = String(reference || '').trim().slice(0, 8000);
  const refBlock = ref
    ? `\nREFERENCE MATERIAL (prefer its concrete specifics where it covers a topic; ignore where it doesn't):\n"""\n${ref}\n"""\n`
    : '';

  const prompt = `You are an expert instructor writing a concise study brief for one lesson of a self-paced mastery course${course ? ` ("${course}")` : ''}.

LESSON: "${lesson}"
${goal ? `\nThe learner's overall goal: ${String(goal).trim().slice(0, 600)}\n` : ''}
THE LEARNER ALREADY KNOWS THIS (do NOT re-explain it — build on it, reference it freely):
${assume || '(assume solid general fundamentals)'}

TOPICS THIS LESSON TEACHES (cover every one clearly enough that a good multiple-choice question could be written from your brief):
${topicList}
${refBlock}
WRITE THE BRIEF:
- 250 to 500 words, markdown, aimed at a capable learner. Teach ONLY the delta beyond what they already know.
- For each topic: the intuition (why it works / when it matters) AND the concrete rule, mechanism, or steps. Include real specifics (names, behaviours, trade-offs), not vague generalities.
- Be accurate. If you are unsure a detail is correct, leave it out rather than guess.
- No filler, no "in this lesson we will", no motivational padding. Start straight into the material.

Return ONLY the markdown brief.`;

  const text = await complete(prompt, { ...ai });
  return String(text || '').trim().slice(0, 8000);
}

/**
 * Write MCQs for `topic` grounded STRICTLY in `transcript`.
 *
 * Returns questions carrying their own `difficulty` tag. Anything the model
 * emits that isn't usable is dropped by normalizeMcq rather than thrown, so one
 * bad item never loses the batch — the caller banks whatever survived.
 *
 * @returns {Promise<Array<{topic,question,options,answer,difficulty}>>}
 */
export async function generateQuestionsFromTranscript(
  { topic, scopeLabel = '', transcript = '', existing = [], count = 5, instructions = '' },
  ai = {},
) {
  const body = String(transcript || '').trim();
  if (!body) return [];

  const prompt = `You are a Professional Test Developer building an assessment for a working digital marketer.

TOPIC: "${topic}"${scopeLabel ? `\nWHERE IT SITS: ${scopeLabel}` : ''}

SOURCE MATERIAL (the ONLY thing you may test on):
"""
${body}
"""

${avoidBlock(existing)}${guidanceBlock(instructions)}
YOUR MISSION:
1. Write up to ${count} multiple-choice questions that test whether someone UNDERSTOOD the source material above.
2. GROUNDING IS ABSOLUTE: every question and every correct answer must be verifiable from the source material alone. If the material does not support ${count} good questions, write FEWER. Never invent facts, numbers, or claims it does not contain.
3. Test understanding, not recall of phrasing. Prefer realistic scenarios ("a campaign is doing X, what does this material say to do?") over "what did the speaker say".
4. No two questions may be interchangeable, and none may duplicate anything already in the bank (above).
5. Ignore filler: greetings, sponsor reads, subscribe requests, and tangents are not course content.

CRITICAL FORMATTING RULES (TO PREVENT TEST-HACKING):
- OPTION UNIFORMITY: All 4 options must be of approximately the same character length.
- No "Length Bias": Do not make the correct answer the longest or most detailed.
- PARALLEL STRUCTURE: If one option starts with a verb, all must start with a verb. Keep the phrasing symmetrical.
- SOPHISTICATED DISTRACTORS: Wrong answers must be plausible to someone who half-understood the material — common misconceptions, not obvious nonsense.
- EVERY QUESTION MUST STAND ALONE. The learner cannot see the source material, so a question that points at it is unanswerable. Never refer to the material in ANY form — no "according to the source/material/transcript/video/speaker/author", no "what does the material recommend", no "in this lesson", no "as described above". Ask about the SUBJECT directly: not "what does the source recommend for frequency control?" but "when running an omnipresent content campaign, which frequency setting enforces a strict per-viewer maximum?". This applies to the options as well as the question.

Do NOT use em dashes (the long dash). Use commas, colons, or simple hyphens instead.

${NO_LATEX_RULE}

${DIFFICULTY_MIX_RULE}

${ANSWER_INDEX_RULE}

Return ONLY a JSON array: [{"question": "text", "options": ["A", "B", "C", "D"], "answerIndex": 0, "difficulty": "core"}]`;

  const text = await complete(prompt, { json: true, schema: TRANSCRIPT_MCQ_ARRAY_SCHEMA, ...ai });
  let generated;
  try {
    generated = parseLooseJson(text);
  } catch {
    throw new Error('The model returned non-JSON content');
  }
  if (!Array.isArray(generated)) throw new Error('The model did not return a JSON array');

  const DIFFS = new Set(['core', 'balanced', 'challenge']);
  return generated
    .map((q) => {
      const mcq = normalizeMcq(q, topic);
      if (!mcq) return null;
      const d = String(q.difficulty || '').toLowerCase();
      return { ...mcq, difficulty: DIFFS.has(d) ? d : 'balanced' };
    })
    .filter(Boolean);
}

/**
 * Author `count` MCQs for `topic`, ANCHORED ON THE TOPIC, with an optional
 * transcript as supporting reference. This is the Academy's main generator for a
 * canonical curriculum: the topic (not the video) is the source of truth, so a
 * video that only partly covers a lesson can't drag a topic off-subject (a
 * value-rules video must not turn "Lookalike audiences" into value-rules
 * questions). Where the reference genuinely covers the topic, prefer its current,
 * concrete detail; otherwise author from expert knowledge — always staying
 * strictly on the topic and never testing a fact that isn't certainly correct.
 */
export async function generateAcademyQuestions(
  { topic, scopeLabel = '', reference = '', existing = [], count = 5, instructions = '' },
  ai = {},
) {
  const hasRef = String(reference || '').trim().length > 0;
  const refBlock = hasRef
    ? `SUPPORTING REFERENCE (a practitioner video transcript; may only partly cover the topic):
"""
${String(reference).trim().slice(0, 14000)}
"""

HOW TO USE THE REFERENCE:
- Where it genuinely covers "${topic}", prefer its concrete, current specifics (real settings, steps, numbers, current platform behavior).
- Where it does NOT cover "${topic}" (or drifts to a neighbouring subject), IGNORE it and author from your own expert knowledge.
- Never let the reference pull a question off "${topic}" onto a different subject it happens to discuss.
`
    : '';

  const prompt = `You are a Professional Test Developer and a senior digital-marketing practitioner building an assessment for a working marketer.

TOPIC (the subject every question must test): "${topic}"${scopeLabel ? `\nWHERE IT SITS: ${scopeLabel}` : ''}

${refBlock}${avoidBlock(existing)}${guidanceBlock(instructions)}
YOUR MISSION:
1. Write ${count} multiple-choice questions that test whether someone genuinely UNDERSTANDS "${topic}" as it is practiced today.
2. ACCURACY IS ABSOLUTE: every correct answer must be factually correct and reflect current mainstream best practice. If you are not certain a fact is correct, do not use it.
3. STAY STRICTLY ON "${topic}". Do not drift to adjacent topics, even if a reference or your knowledge tempts you.
4. Test applied understanding, not vocabulary recall. Prefer realistic scenarios ("a campaign is doing X, what should you do?") over "what is the definition of Y".
5. No two questions may be interchangeable, and none may duplicate anything already in the bank (above).

CRITICAL FORMATTING RULES (TO PREVENT TEST-HACKING):
- OPTION UNIFORMITY: All 4 options must be of approximately the same character length.
- No "Length Bias": Do not make the correct answer the longest or most detailed.
- PARALLEL STRUCTURE: If one option starts with a verb, all must start with a verb. Keep the phrasing symmetrical.
- SOPHISTICATED DISTRACTORS: Wrong answers must be plausible to someone who half-understood the topic — common misconceptions, not obvious nonsense.
- EVERY QUESTION MUST STAND ALONE. Ask about the SUBJECT directly; never refer to "this lesson", "the material", "the reference", "the video", or any source.

Do NOT use em dashes (the long dash). Use commas, colons, or simple hyphens instead.

${NO_LATEX_RULE}

${DIFFICULTY_MIX_RULE}

${ANSWER_INDEX_RULE}

Return ONLY a JSON array: [{"question": "text", "options": ["A", "B", "C", "D"], "answerIndex": 0, "difficulty": "core"}]`;

  const text = await complete(prompt, { json: true, schema: TRANSCRIPT_MCQ_ARRAY_SCHEMA, ...ai });
  let generated;
  try {
    generated = parseLooseJson(text);
  } catch {
    throw new Error('The model returned non-JSON content');
  }
  if (!Array.isArray(generated)) throw new Error('The model did not return a JSON array');

  const DIFFS = new Set(['core', 'balanced', 'challenge']);
  return generated
    .map((q) => {
      const mcq = normalizeMcq(q, topic);
      if (!mcq) return null;
      const d = String(q.difficulty || '').toLowerCase();
      return { ...mcq, difficulty: DIFFS.has(d) ? d : 'balanced' };
    })
    .filter(Boolean);
}

/**
 * Author `count` MCQs for `topic` from the model's OWN expert knowledge, with NO
 * transcript. This is the hybrid fallback for curriculum areas the video library
 * doesn't cover (SQL, tag management, analytics fundamentals, email deliverability…)
 * where a strong model's knowledge is more accurate than a tangential video. Same
 * validated shape and formatting rules as the grounded generator; only the source
 * of truth differs (expertise vs transcript), which the caller records via `source`.
 */
export async function generateQuestionsFromKnowledge(
  { topic, scopeLabel = '', existing = [], count = 5 },
  ai = {},
) {
  const prompt = `You are a Professional Test Developer and a senior digital-marketing practitioner building an assessment for a working marketer.

TOPIC: "${topic}"${scopeLabel ? `\nWHERE IT SITS: ${scopeLabel}` : ''}

${avoidBlock(existing)}
YOUR MISSION:
1. Write ${count} multiple-choice questions that test whether someone genuinely UNDERSTANDS "${topic}" as it is practiced today.
2. ACCURACY IS ABSOLUTE: every correct answer must be factually correct and reflect current, mainstream best practice. Do not test on niche edge cases, deprecated features, or anything ambiguous. If you are not certain a fact is correct, do not use it.
3. Test applied understanding, not vocabulary recall. Prefer realistic scenarios ("a campaign is doing X — what should you do?") over "what is the definition of Y".
4. No two questions may be interchangeable, and none may duplicate anything already in the bank (above).
5. Stay strictly on THIS topic (as framed by where it sits above); do not drift into adjacent topics.

CRITICAL FORMATTING RULES (TO PREVENT TEST-HACKING):
- OPTION UNIFORMITY: All 4 options must be of approximately the same character length.
- No "Length Bias": Do not make the correct answer the longest or most detailed.
- PARALLEL STRUCTURE: If one option starts with a verb, all must start with a verb. Keep the phrasing symmetrical.
- SOPHISTICATED DISTRACTORS: Wrong answers must be plausible to someone who half-understood the topic — common misconceptions, not obvious nonsense.
- EVERY QUESTION MUST STAND ALONE. Ask about the SUBJECT directly; never refer to "this lesson", "the material", "the course", or any source.

Do NOT use em dashes (the long dash). Use commas, colons, or simple hyphens instead.

${NO_LATEX_RULE}

${DIFFICULTY_MIX_RULE}

${ANSWER_INDEX_RULE}

Return ONLY a JSON array: [{"question": "text", "options": ["A", "B", "C", "D"], "answerIndex": 0, "difficulty": "core"}]`;

  const text = await complete(prompt, { json: true, schema: TRANSCRIPT_MCQ_ARRAY_SCHEMA, ...ai });
  let generated;
  try {
    generated = parseLooseJson(text);
  } catch {
    throw new Error('The model returned non-JSON content');
  }
  if (!Array.isArray(generated)) throw new Error('The model did not return a JSON array');

  const DIFFS = new Set(['core', 'balanced', 'challenge']);
  return generated
    .map((q) => {
      const mcq = normalizeMcq(q, topic);
      if (!mcq) return null;
      const d = String(q.difficulty || '').toLowerCase();
      return { ...mcq, difficulty: DIFFS.has(d) ? d : 'balanced' };
    })
    .filter(Boolean);
}

/**
 * Generate `count` new questions for `topic`, given a few baseline questions.
 * `ctx.existing` (all banked stems for the topic) is an avoid-list so a re-run
 * doesn't recreate what's already there; `ctx.performance` aims difficulty. Bulk
 * seeding leaves performance null on purpose — the bank is shared across users,
 * so a mass seed stays neutral rather than skewing toward one learner's gaps.
 * @returns {Promise<Array<{topic,question,options,answer}>>}
 */
export async function generateQuestions(topic, baseline, count, ai = {}, ctx = {}) {
  const { existing = [], performance = null, difficulty = 'auto', prereqs = [], instructions = '', reference = '' } = ctx;
  const text = await complete(buildPrompt(topic, baseline, count, { existing, performance, difficulty, prereqs, instructions, reference }), { json: true, schema: MCQ_ARRAY_SCHEMA, ...ai });

  let generated;
  try {
    generated = parseLooseJson(text);
  } catch {
    throw new Error('Gemini returned non-JSON content');
  }
  if (!Array.isArray(generated)) throw new Error('Gemini did not return a JSON array');

  // Normalize/validate shape (answerIndex -> stored answer string).
  return generated.map((q) => normalizeMcq(q, topic)).filter(Boolean);
}

/**
 * Diagnose what might be confusing a learner about a question they just
 * answered. Returns up to 3 short, specific, first-person confusions to pick
 * from — the drill UI always appends its own 4th "let me explain" free-text
 * option, so this only produces the AI-suggested ones. Never throws: if the
 * model misbehaves it falls back to generic-but-useful confusions so the drill
 * flow can't dead-end.
 */
export async function generateConfusions({ question, options, answer, topic, userAnswer, isCorrect }, ai = {}) {
  const prompt = `You are a perceptive tutor diagnosing exactly what a student might be struggling with on a specific multiple-choice question they just answered.

TOPIC: ${topic || '(unspecified)'}
QUESTION: ${question}
OPTIONS:
${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}
CORRECT ANSWER: ${answer || '(unknown)'}
THE STUDENT ANSWERED: ${userAnswer || '(no answer recorded)'}, which was ${isCorrect ? 'CORRECT' : 'INCORRECT'}.

List the 3 MOST LIKELY specific things that could be confusing this student about THIS question or the concept behind it.

RULES:
- Write each as a short, concrete, first-person statement of a confusion, as the student would say it (e.g. "I don't get why ...", "I mixed up ... and ...", "I'm not sure how to ...").
- Make them SPECIFIC to this question's concept, not generic study advice.
- Cover three DISTINCT, plausible misconceptions (do not repeat the same idea).
- Max ~14 words each. No numbering, no quotes, no preamble.

${LATEX_RULE}

Return ONLY a JSON array of exactly 3 strings.`;

  try {
    const text = await complete(prompt, { json: true, ...ai });
    const arr = parseLooseJson(text);
    const cleaned = (Array.isArray(arr) ? arr : [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 3);
    if (cleaned.length) return cleaned;
  } catch {
    /* fall through to the generic set below */
  }
  // Never dead-end the drill: generic but still useful confusions.
  return [
    "I don't really understand the core concept this question tests",
    "I don't get why the correct answer is right",
    "I can't see why the other options are wrong",
  ];
}

/**
 * Generate ONE new mastery question that drills into a SPECIFIC confusion the
 * learner has, while staying squarely on the SAME topic / sub-lesson. Returns
 * the normalized {topic, question, options, answer} (same shape as
 * generateQuestions) so it can be banked and served immediately. Retries once
 * if the model returns an unusable shape (e.g. answer not among the options).
 */
export async function generateDrillQuestion({ topic, scopeLabel, question, options, answer, confusion }, ai = {}) {
  const prompt = `You are a Wise Master Educator helping a student who just struggled with a question. They have told you exactly what is confusing them. Write ONE NEW multiple-choice question that directly targets and helps resolve that specific confusion, while staying on the SAME sub-topic.

SUB-LESSON / TOPIC: "${topic}"${scopeLabel && scopeLabel !== topic ? ` (within: ${scopeLabel})` : ''}

THE QUESTION THEY JUST STRUGGLED WITH:
${question}
OPTIONS: ${JSON.stringify(options || [])}
CORRECT ANSWER: ${answer || '(unknown)'}

WHAT THE STUDENT SAYS IS CONFUSING THEM:
"${confusion}"

YOUR MISSION:
1. Write ONE new MCQ that zeroes in on the exact point of confusion above, so that working through it builds the understanding they are missing.
2. It MUST stay on the topic "${topic}". Do NOT drift to a different sub-lesson or a broader subject.
3. Approach the SAME underlying idea from a slightly different angle than the original. Do NOT simply reword the original question.

CRITICAL FORMATTING RULES (TO PREVENT TEST-HACKING):
- OPTION UNIFORMITY: All 4 options must be of approximately the same character length.
- No "Length Bias": Do not make the correct answer the longest or most detailed.
- PARALLEL STRUCTURE: keep the phrasing of all options symmetrical.
- SOPHISTICATED DISTRACTORS: wrong answers should be plausible and reflect the very misconception described above.

Do NOT use em dashes (the long dash). Use commas, colons, or simple hyphens instead.

${LATEX_RULE}
${ANSWER_INDEX_RULE}

Return ONLY a JSON object: {"question": "text", "options": ["A", "B", "C", "D"], "answerIndex": 0}`;

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    let obj;
    try {
      obj = parseLooseJson(await complete(prompt, { json: true, schema: MCQ_SCHEMA, ...ai }));
    } catch {
      lastErr = new Error('drill: returned non-JSON content');
      continue;
    }
    // The model may wrap the single question in an array.
    if (Array.isArray(obj)) obj = obj[0];
    const q = normalizeMcq(obj, topic);
    if (q) return q;
    lastErr = new Error('drill: invalid question shape');
  }
  throw new Error(`Drill generation failed (${lastErr?.message || 'unknown'})`);
}

/**
 * Generate `count` fresh questions "like" one the learner is looking at: same
 * sub-topic, same style and difficulty, new angles (NOT reworded copies). Used
 * by the in-quiz "Generate more like this" action. Returns normalized
 * {topic,question,options,answer} objects (same shape as generateQuestions) so
 * they can be banked and served immediately; any that come back malformed or
 * with a non-matching answer are dropped rather than failing the whole batch.
 */
export async function generateSimilarQuestions({ topic, scopeLabel, question, options, answer, existing = [] }, count, ai = {}) {
  const n = Math.min(10, Math.max(1, parseInt(count, 10) || 3));
  const prompt = `You are a Wise Master Educator and Professional Test Developer. A student is practising and wants MORE questions like the one below, so they can drill the same idea until it sticks.

SUB-LESSON / TOPIC: "${topic}"${scopeLabel && scopeLabel !== topic ? ` (within: ${scopeLabel})` : ''}

THE QUESTION THEY WANT MORE LIKE:
${question}
OPTIONS: ${JSON.stringify(options || [])}
CORRECT ANSWER: ${answer || '(unknown)'}

${avoidBlock(existing, 'do NOT reproduce or paraphrase any of these')}
YOUR MISSION:
1. Write ${n} NEW multiple-choice questions that test the SAME underlying concept as the question above.
2. Match its DIFFICULTY and STYLE - do not make them noticeably harder or easier.
3. Approach the idea from DIFFERENT angles each time (different numbers, scenarios, or framings). Do NOT simply reword the original or repeat each other.
4. Stay strictly on the topic "${topic}". Do NOT drift to a different sub-lesson.

CRITICAL FORMATTING RULES (TO PREVENT TEST-HACKING):
- OPTION UNIFORMITY: All 4 options must be of approximately the same character length.
- No "Length Bias": Do not make the correct answer the longest or most detailed.
- PARALLEL STRUCTURE: keep the phrasing of all options symmetrical.
- SOPHISTICATED DISTRACTORS: wrong answers should be plausible common misconceptions.

Do NOT use em dashes (the long dash). Use commas, colons, or simple hyphens instead.

${LATEX_RULE}
${ANSWER_INDEX_RULE}

Return ONLY a JSON array of ${n} objects: [{"question": "text", "options": ["A", "B", "C", "D"], "answerIndex": 0}]`;

  let generated;
  try {
    generated = parseLooseJson(await complete(prompt, { json: true, schema: MCQ_ARRAY_SCHEMA, ...ai }));
  } catch {
    throw new Error('generate-like: returned non-JSON content');
  }
  if (!Array.isArray(generated)) generated = [generated];

  const clean = generated
    .map((q) => normalizeMcq(q, topic))
    .filter(Boolean)
    .slice(0, n);

  if (!clean.length) throw new Error('generate-like: no usable questions came back');
  return clean;
}

/* --------------------------------- Chat ----------------------------------- */
// Render a stored chat thread as plain text for the prompt (oldest first).
function historyBlock(history = []) {
  if (!Array.isArray(history) || !history.length) return '(this is the first message)';
  return history
    .slice(-12) // keep the prompt bounded; recent turns matter most
    .map((m) => `${m.role === 'assistant' ? 'TUTOR' : 'STUDENT'}: ${String(m.text || '').slice(0, 1200)}`)
    .join('\n');
}

/**
 * Per-card tutor chat. Answers the student's message about ONE flashcard AND
 * returns an IMPROVED, rewritten personalized explanation for the card that
 * folds in what was just clarified. Because the student is a visual learner, it
 * leans on the declarative visual whenever a picture helps. Returns
 * { reply, intuition, formula, visual }; the caller stores intuition/formula/
 * visual as this user's private overlay on the (shared) card.
 */
export async function generateCardChat(
  { topic, scopeLabel, concept, intuition, formula, visual, questions = [], history = [], message },
  ai = {},
) {
  const prompt = `You are a world-class, patient tutor helping ONE student master a single flashcard through conversation. The student is a VISUAL learner, so prefer intuitive, concrete, picture-friendly explanations.

FLASHCARD (${scopeLabel || topic}):
- Concept (front): ${concept}
- Current intuition (this is the student's CURRENT personalized explanation; improve on it): ${intuition}
- Formula/Rule: ${formula || '(none)'}
${visual ? `- The card currently has a visual.` : ''}

For context, here is a sample of quiz questions from the same topic (use ONLY to judge the depth the student needs; do NOT reveal answers or quote them):
${JSON.stringify(questions).slice(0, 3000)}

CONVERSATION SO FAR:
${historyBlock(history)}

THE STUDENT'S NEW MESSAGE:
"${message}"

Do TWO things and return them as JSON:
1. "reply": a clear, friendly, direct answer to the student's message. Teach, use analogies, and lean visual. Markdown. Keep it focused, not padded.
2. "intuition": a REWRITTEN, improved version of the card's intuition explanation that incorporates what you just clarified, so that next time the student reads the card it makes complete sense to THEM. Keep it self-contained (do not reference "as we discussed"). Plain, vivid, beginner-friendly Markdown.
3. "formula": keep the existing formula unless the conversation genuinely requires correcting or clarifying it; then return the improved LaTeX. If unchanged, return it as-is. Use "—" only if truly none applies.
4. "visual": include or update the declarative visual ONLY when a graph genuinely helps this student see the idea; otherwise return null.

${VISUAL_RULE}

${LATEX_RULE}
Do NOT use em dashes; use commas, colons, or simple hyphens.

Return ONLY a JSON object: {"reply": "markdown answer", "intuition": "rewritten markdown", "formula": "LaTeX or —", "visual": null | {plot object as specified}}`;

  const text = await complete(prompt, { json: true, ...ai });
  let obj;
  try {
    obj = parseLooseJson(text);
  } catch {
    throw new Error('card chat returned non-JSON content');
  }
  if (Array.isArray(obj)) obj = obj[0];
  if (!obj || !obj.reply) throw new Error('card chat returned an unusable shape');
  return {
    reply: String(obj.reply).trim(),
    intuition: obj.intuition ? String(obj.intuition).trim() : String(intuition || '').trim(),
    formula: obj.formula ? String(obj.formula).trim() : (formula || '—'),
    visual: sanitizeVisual(obj.visual),
  };
}

/**
 * Scope-level tutor chat. Reads the flashcards AND the quiz questions in a
 * lesson/course and answers big-picture questions ("why is this useful?", "how
 * does this relate to my work as an AI engineer?", "what are the prerequisites?").
 * Returns { reply, visual }. Stateless persistence lives in the caller.
 */
export async function generateScopeChat(
  { scopeLabel, topics = [], cards = [], questions = [], history = [], message },
  ai = {},
) {
  const cardsBlock = cards.length
    ? JSON.stringify(cards.map((c) => ({ concept: c.concept, intuition: c.intuition, formula: c.formula }))).slice(0, 4000)
    : '(no flashcards have been generated for this section yet)';

  const prompt = `You are a sharp, practical tutor for a working AI engineer who is studying to deepen their foundations. You answer questions about a whole study SECTION, grounded in its actual flashcards and quiz questions. When useful, connect ideas to real machine-learning / data / AI-engineering practice.

SECTION: "${scopeLabel}"
TOPICS IN SCOPE (${topics.length}):
${topics.map((t) => `- ${t}`).join('\n').slice(0, 2000)}

FLASHCARDS IN THIS SECTION (the concepts being taught):
${cardsBlock}

SAMPLE OF QUIZ QUESTIONS IN THIS SECTION (use to gauge scope/depth; do NOT reveal which option is correct):
${JSON.stringify(questions).slice(0, 3500)}

CONVERSATION SO FAR:
${historyBlock(history)}

THE STUDENT'S NEW MESSAGE:
"${message}"

Answer clearly and specifically, grounded in the material above. If they ask why something is useful, how it relates to their work as an AI engineer, or what the prerequisites are, be concrete and practical. Use Markdown, short paragraphs, and bullets where they help. Optionally include a declarative visual ONLY when a graph genuinely aids understanding.

${VISUAL_RULE}

${LATEX_RULE}
Do NOT use em dashes; use commas, colons, or simple hyphens.

Return ONLY a JSON object: {"reply": "markdown answer", "visual": null | {plot object as specified}}`;

  const text = await complete(prompt, { json: true, ...ai });
  let obj;
  try {
    obj = parseLooseJson(text);
  } catch {
    throw new Error('scope chat returned non-JSON content');
  }
  if (Array.isArray(obj)) obj = obj[0];
  if (!obj || !obj.reply) throw new Error('scope chat returned an unusable shape');
  return { reply: String(obj.reply).trim(), visual: sanitizeVisual(obj.visual) };
}

/**
 * The always-available floating assistant. It answers the student's message
 * grounded in a STRUCTURED snapshot of what is on their screen right now (the
 * view, their track/course selection, the exact question they're looking at and
 * how they answered it, or the flashcard they're studying, plus recent results).
 * No image is sent — the caller assembles the context object. Returns
 * { reply, visual }.
 */
function assistantContextBlock(ctx = {}) {
  const lines = [];
  const viewName = {
    setup: 'the home screen (building a quiz / viewing progress)',
    quiz: 'a live quiz question',
    result: 'a quiz results screen',
    stats: 'their progress dashboard',
    flashcard: 'a flashcard',
    login: 'the sign-in screen',
  }[ctx.view] || ctx.view || 'the app';
  lines.push(`CURRENT SCREEN: ${viewName}.`);

  const scope = ctx.scope || {};
  const scopeStr = ['track', 'course', 'lesson', 'topic']
    .map((k) => scope[k]).filter((v) => v && !/^(review all|-- n\/a --)$/i.test(v)).join(' › ');
  if (scopeStr) lines.push(`CURRENT SELECTION: ${scopeStr}.`);

  if (ctx.question && ctx.question.question) {
    const q = ctx.question;
    lines.push(`QUESTION ON SCREEN: ${q.question}`);
    if (Array.isArray(q.options) && q.options.length) {
      lines.push(`OPTIONS:\n${q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}`);
    }
    if (q.answer) lines.push(`CORRECT ANSWER: ${q.answer}`);
    if (q.userAnswer != null) lines.push(`THE STUDENT ANSWERED: ${q.userAnswer} (${q.isCorrect ? 'correct' : 'incorrect'}).`);
    else lines.push('The student has NOT answered this question yet — do NOT reveal the correct option; guide them.');
  }

  if (ctx.card && ctx.card.concept) {
    lines.push(`FLASHCARD ON SCREEN — Concept: ${ctx.card.concept}`);
    if (ctx.card.intuition) lines.push(`Intuition: ${ctx.card.intuition}`);
    if (ctx.card.formula) lines.push(`Formula/Rule: ${ctx.card.formula}`);
    if (ctx.card.topic) lines.push(`Topic: ${ctx.card.topic}`);
  }

  if (Array.isArray(ctx.recent) && ctx.recent.length) {
    lines.push(`RECENT ANSWERS: ${ctx.recent.map((r) => `${r.topic || '?'}=${r.isCorrect ? '✓' : '✗'}`).join(', ')}`);
  }
  return lines.join('\n') || 'No specific on-screen context was provided.';
}

/**
 * The learner's WHOLE-PERSON context, pulled from Sentinel (body-fat/PRs, career goals, required
 * reading, personal obstacles). This is what turns the Study Assistant into a holistic development
 * coach: the same bot can talk to their gym progress and career goals, not just their curriculum.
 * Returns '' when there's no profile (Sentinel unreachable/unconfigured) so the prompt is unchanged.
 */
function holisticBlock(profile) {
  if (!profile) return '';
  const lines = [];
  const phys = profile.physical || {};
  const physBits = [];
  if (phys.body_fat_pct != null) physBits.push(`body fat ${phys.body_fat_pct}%`);
  if (phys.weight_kg != null) physBits.push(`weight ${phys.weight_kg}kg`);
  if (physBits.length) lines.push(`- Physical: ${physBits.join(', ')}${phys.as_of ? ` (as of ${phys.as_of})` : ''}.`);
  if (Array.isArray(phys.recent_prs) && phys.recent_prs.length) lines.push(`- Personal records: ${phys.recent_prs.join('; ')}.`);
  const gym = profile.gym || {};
  if (gym.weekly_split) {
    const cardio = gym.weekly_cardio || {};
    const split = Object.entries(gym.weekly_split).map(([d, t]) => `${d} ${t}${cardio[d] ? ` + ${cardio[d]}` : ''}`).join(', ');
    lines.push(`- Gym plan (recurring weekly split + cardio): ${split}. Trained ${gym.sessions_last_14d ?? 0} time(s) in the last 14 days (${gym.completed_last_14d ?? 0} full sessions). BE TRAINING-LOAD AWARE when advising what/how much to STUDY: on physically hard days (leg day, interval runs, a long run like their ~10k) their mental energy is lower — nudge them toward lighter or review work, a shorter session, or consolidating what they know, and save the hardest NEW material (a tough new model, dense proofs/theory) for a rest or light-training day; on rest days, encourage taking on the demanding topics. Raise this proactively when they ask what to study, but naturally — don't lecture.`);
  }
  const car = profile.career || {};
  if (car.headline) lines.push(`- Career headline: ${car.headline}.`);
  if (Array.isArray(profile.skills) && profile.skills.length) {
    const srcLabel = { project: 'real project experience', mastery_engine: 'Mastery Engine', course: 'a course', certification: 'a certification', other: 'other' };
    lines.push(`- Skills they already HAVE (do NOT assume their skills are limited to Mastery Engine topics): ${profile.skills.map((s) => `${s.name} (${s.level}, via ${srcLabel[s.source] || s.source})`).join('; ')}.`);
  }
  if (Array.isArray(car.goals) && car.goals.length) lines.push(`- Professional goals: ${car.goals.map((g) => `${g.title} (${g.status}, ${g.progress}%${g.target ? `, target ${g.target}` : ''})`).join('; ')}.`);
  if (Array.isArray(car.achievements) && car.achievements.length) lines.push(`- Recent achievements: ${car.achievements.join('; ')}.`);
  if (car.resume_excerpt) lines.push(`- Resume/bio (excerpt): ${car.resume_excerpt}`);
  const rd = profile.reading || {};
  if (Array.isArray(rd.reading_now) && rd.reading_now.length) lines.push(`- Currently reading: ${rd.reading_now.join('; ')}.`);
  if (Array.isArray(rd.done) && rd.done.length) lines.push(`- Has read: ${rd.done.join('; ')}.`);
  const gr = profile.growth || {};
  if (Array.isArray(gr.obstacles) && gr.obstacles.length) lines.push(`- Obstacles they're working through: ${gr.obstacles.join('; ')}.`);
  if (Array.isArray(gr.reflections) && gr.reflections.length) lines.push(`- Recent reflections: ${gr.reflections.join('; ')}.`);
  if (!lines.length) return '';
  const who = profile.name ? ` (${profile.name})` : '';
  return `THIS PERSON'S HOLISTIC DEVELOPMENT${who} — their whole-life context from their Agora profile, beyond just studying. Coach across all of it (physical, career, learning, reading, personal growth) when it's relevant; weave it in naturally, don't recite it back unprompted:\n${lines.join('\n')}`;
}

// The action protocol: when the host (Sentinel's Coach) supports it, the assistant can PROPOSE edits
// to the person's development profile. It never writes directly — it emits an `agora-action` fenced
// block that the app turns into an Approve/Cancel card; on approval the host executes it in the user's
// own session. Returns '' unless actions are enabled AND we have a profile with editable items.
function assistantActionBlock(profile, enabled) {
  if (!enabled || !profile) return '';
  const ed = profile.editable || {};
  const list = (label, arr) => (Array.isArray(arr) && arr.length)
    ? `  ${label}: ${arr.map((x) => `[${x.id}] ${x.label}`).join('; ')}`
    : null;
  const items = [
    list('PRs', ed.prs), list('Goals', ed.goals), list('Achievements', ed.achievements),
    list('Skills', ed.skills), list('Journal', ed.growth), list('Reading canon', ed.reading),
  ].filter(Boolean).join('\n');
  const gym = profile.gym || {};
  const gc = gym.weekly_cardio || {};
  const gymNow = gym.weekly_split
    ? `\nTheir current weekly gym split (edit with the gym ops below): ${Object.entries(gym.weekly_split).map(([d, t]) => `${d}=${t}${gc[d] ? `(+${gc[d]})` : ''}`).join(', ')}.\n`
    : '';
  return `YOU CAN EDIT THIS PERSON'S DEVELOPMENT PROFILE — but ONLY with their approval. When they ask you to add, change, or remove anything in their profile (a PR, body-fat/weight, a professional goal, an achievement, a skill, a journal note, reading progress, or their GYM SCHEDULE), DO NOT say you already did it. Instead emit a fenced code block tagged \`agora-action\` holding ONE JSON object, and tell them you've proposed it and just need their tap to Approve. You may emit several such blocks in one reply. For updates/deletes, use the exact ids listed below.

Action JSON shape: {"op": <op>, "args": { ... }, "summary": "<one short human sentence describing the change>"}
ROUTING — put each thing in the RIGHT place (don't force-fit):
- A PHYSICAL feat or personal best — a lift, run, time, distance, hold, bodyweight rep — is a PR (add_pr), NOT an achievement. For non-weight PRs (runs/times/distances) fill \`detail\` (e.g. "10 km in ~59 min") and leave weight_value out.
- A CAREER / professional win (shipped a project, a promotion, an award) is an achievement (add_achievement).
- A capability the person HAS (SQL, pandas, a language) is a skill (add_skill).
- Something they're aiming for is a goal; an obstacle or a reflection is a journal entry (add_growth).
Available ops and their args:
  add_pr {exercise_name, weight_value?, weight_unit?, reps?, detail?, achieved_on?}   update_pr {id, ...}   delete_pr {id}
  add_body_metric {body_fat_pct?, weight_kg?, date?}
  add_goal {title, description?, target_date?, status?, progress_pct?}   update_goal {id, ...}   delete_goal {id}
  add_achievement {title, description?, achieved_on?}   update_achievement {id, ...}   delete_achievement {id}
  add_skill {name, level?(Beginner|Intermediate|Advanced), source?(project|mastery_engine|course|certification|other), note?}   update_skill {id, ...}   delete_skill {id}
  add_growth {kind(obstacle|reflection|note), title, detail?}   update_growth {id, ...}   delete_growth {id}
  update_resume {headline?, resume_text?}
  set_reading_progress {reading_item_id, status?(not_started|reading|done), reflection?}
GYM SCHEDULE — the recurring weekly split + optional cardio, shown on their calendar (day-types: Push, Pull, Legs, Custom, Rest):
  set_gym_week {week, cardio?}  — replace the WHOLE weekly split. \`week\` is a full map with keys Mon,Tue,Wed,Thu,Fri,Sat,Sun. \`cardio\` is an OPTIONAL map of the same keys to a short run note (e.g. {"Mon":"5k run","Thu":"~10k run","Sat":"intervals"}); include it whenever they mention runs/cardio, and carry over their existing cardio for days they didn't change. Omit \`cardio\` entirely to leave cardio untouched.
  set_gym_day {date, day_type, cardio?}  — override ONE date (ISO YYYY-MM-DD), e.g. move a split onto it, mark it Rest, or note a one-off run.
  clear_gym_day {date}  — drop a date's override so it reverts to the weekly split.
${gymNow}${items ? `\nCurrent items (use these ids):\n${items}\n` : ''}
Example — if they say "bump my backend-dev goal to 60%":
\`\`\`agora-action
{"op":"update_goal","args":{"id":12,"progress_pct":60},"summary":"Set the goal progress to 60%"}
\`\`\`
Example — if they say "I run a 5k on Monday push days, ~10k on Thursday push, and intervals on Saturday legs":
\`\`\`agora-action
{"op":"set_gym_week","args":{"week":{"Mon":"Push","Tue":"Pull","Wed":"Legs","Thu":"Push","Fri":"Legs","Sat":"Legs","Sun":"Rest"},"cardio":{"Mon":"5k run","Thu":"~10k run","Sat":"intervals"}},"summary":"Add cardio: 5k Mon, ~10k Thu, intervals Sat"}
\`\`\``;
}

// Shared persona for the assistant: primarily the on-screen Study Assistant, but also a holistic
// development coach when the person's Agora profile is available (injected below as HOLISTIC DEVELOPMENT).
const ASSISTANT_PERSONA = `You are the always-available assistant and development coach inside the AGORA workspace, helping a working data/AI engineer. Primarily you are their Study Assistant in the Mastery Engine: you can SEE what's on their screen (below) and tutor them over their shoulder. You ALSO know their holistic development (physical, career, learning, reading, personal growth) when it appears below, and can coach across all of it. Be direct, warm, and concrete. When it genuinely deepens understanding, draw ANALOGIES across their worlds — connect a technical concept they're studying to a philosophy, book, or growth theme they care about, and vice versa (e.g. the stoic dichotomy of control and how a model learns only from what it can change). Use these sparingly and only when they illuminate, never as filler.`;

export async function generateAssistantChat({ context = {}, history = [], message, conversational = false, search = false, catalog = [], transcripts = [], coach = false, progress = '', holistic = null, actions = false, attachments = [], admin = false }, ai = {}) {
  // Web search (Google Search grounding) is a Gemini-via-Vertex capability only. The default
  // provider is Gemini, so treat an unset provider as Gemini too.
  const canWeb = search && (!ai.provider || ai.provider === 'gemini');

  // Self-knowledge: inject the full engine/research doc when the question is about the app itself,
  // otherwise a one-line identity — so it can accurately answer "what's your mastery formula?" or
  // "what research is this based on?" without paying the token cost on every ordinary turn.
  const knowledge = knowledgeBlock(message);
  // Real-curriculum grounding for "which card/topic teaches X" — non-empty only when
  // the caller decided this is a content-location question (keeps normal turns cheap).
  const catalogGround = assistantCatalogBlock(catalog, transcripts, groundingBudget(ai), message);
  const coachGround = assistantCoachBlock(coach, progress, admin);
  const holisticGround = holisticBlock(holistic);
  const actionGround = assistantActionBlock(holistic, actions);

  const head = `${ASSISTANT_PERSONA}

${knowledge}
${catalogGround ? `\n${catalogGround}\n` : ''}${coachGround ? `\n${coachGround}\n` : ''}${holisticGround ? `\n${holisticGround}\n` : ''}${actionGround ? `\n${actionGround}\n` : ''}
WHAT'S ON THE STUDENT'S SCREEN RIGHT NOW:
${assistantContextBlock(context)}

CONVERSATION SO FAR:
${historyBlock(history)}

THE STUDENT'S NEW MESSAGE:
"${message}"

Answer helpfully, grounded in the on-screen context when it's relevant (if they say "this question" or "this card", they mean the one above). If they have NOT yet answered the on-screen question, help them reason without giving away the correct option.`;

  // --- Grounded (web) path: Vertex forbids Search + JSON mode, so we take plain text. ------------
  if (canWeb) {
    const styleWeb = conversational
      ? `This reply will be READ ALOUD, so talk, don't write: plain sentences, usually 1 to 3, no markdown/headings/bullets/code fences, read symbols and code as words, no URLs spoken.`
      : `Answer in clear Markdown.`;
    const prompt = `${head}

You have LIVE WEB SEARCH. Use it whenever the answer depends on current facts, recent events, specific numbers, or anything beyond your training, and briefly say what you found. If the question is about THIS app, prefer the authoritative "ABOUT THIS APP" facts above over the web.

${styleWeb}
${LATEX_RULE}
Do NOT use em dashes; use commas, colons, or simple hyphens.`;
    const text = await complete(prompt, { ...ai, search: true, attachments });
    return { reply: String(text || '').trim(), visual: null };
  }

  // --- Standard JSON path -----------------------------------------------------------------------
  // Spoken mode: the reply is read aloud by a TTS voice, so markdown (headings, bullets, code
  // fences) gets read out literally ("hashtag hashtag"). Ask for natural talk instead.
  const styleRule = conversational
    ? `This reply will be READ ALOUD by a voice, so answer like you're TALKING, not writing:
- Plain conversational sentences only. NO markdown: no headings (#), no bullet or numbered lists, no bold/italic, no code fences, no tables.
- Keep it short — usually 1 to 3 sentences. Say the key point first, the way a tutor would say it out loud. If you must give steps, say them as a flowing sentence ("first X, then Y").
- Spell things out for the ear: read symbols and code as words (say "the loss function" not \`loss_fn\`). Avoid URLs.
- Do NOT include a visual (set "visual": null).`
    : `Use Markdown, short paragraphs, and bullets where they help. Optionally include a declarative visual ONLY when a graph genuinely aids understanding.

${VISUAL_RULE}`;

  const prompt = `${head}

${styleRule}

${LATEX_RULE}
Do NOT use em dashes; use commas, colons, or simple hyphens.

Return ONLY a JSON object: {"reply": "${conversational ? 'plain spoken answer, no markdown' : 'markdown answer'}", "visual": null${conversational ? '' : ' | {plot object as specified}'}}`;

  // Keep complete() OUTSIDE the parse try so a Vertex/auth/HTTP failure surfaces
  // its real message instead of being mislabeled "returned non-JSON content".
  const text = await complete(prompt, { json: true, ...ai, attachments });
  let obj;
  try {
    obj = parseLooseJson(text);
  } catch {
    throw new Error('assistant chat returned non-JSON content');
  }
  if (Array.isArray(obj)) obj = obj[0];
  if (!obj || !obj.reply) throw new Error('assistant chat returned an unusable shape');
  return { reply: String(obj.reply).trim(), visual: sanitizeVisual(obj.visual) };
}

/**
 * A team-reviewer's mid-answer steer, appended to the prompt so it overrides the
 * model's earlier direction. Mirrors the Atrium assistant's pause-&-steer: the
 * client aborts the stream and re-sends the SAME question with accumulated steer.
 */
function steerNote(steer) {
  const s = String(steer || '').trim();
  if (!s) return '';
  return `\n\nIMPORTANT — while you were answering, the student paused you and added this direction. Follow it, and let it override your earlier approach where they conflict:\n${s.slice(0, 1000)}`;
}

/**
 * Streaming twin of generateAssistantChat. Forwards BOTH the reasoning trace and
 * the answer to onToken(text, kind) so the chat can show what the AI is thinking
 * live (and be paused + steered). Unlike the blocking version this streams PLAIN
 * MARKDOWN — no {reply, visual} JSON envelope, because streaming a JSON wrapper
 * would show the user braces. Returns the accumulated answer text (thinking
 * excluded) so the caller can persist the turn.
 */
export async function streamAssistantChat({ context = {}, history = [], message, steer = '', catalog = [], transcripts = [], search = false, coach = false, progress = '', holistic = null, actions = false, attachments = [], admin = false }, ai = {}, onToken) {
  // Web search grounding streams as plain text (Gemini only); pause/steer still work.
  const canWeb = search && (!ai.provider || ai.provider === 'gemini');
  const catalogGround = assistantCatalogBlock(catalog, transcripts, groundingBudget(ai), message);
  const coachGround = assistantCoachBlock(coach, progress, admin);
  const holisticGround = holisticBlock(holistic);
  const actionGround = assistantActionBlock(holistic, actions);
  const prompt = `${ASSISTANT_PERSONA}

${knowledgeBlock(message)}
${catalogGround ? `\n${catalogGround}\n` : ''}${coachGround ? `\n${coachGround}\n` : ''}${holisticGround ? `\n${holisticGround}\n` : ''}${actionGround ? `\n${actionGround}\n` : ''}
WHAT'S ON THE STUDENT'S SCREEN RIGHT NOW:
${assistantContextBlock(context)}

CONVERSATION SO FAR:
${historyBlock(history)}

THE STUDENT'S NEW MESSAGE:
"${message}"

Answer helpfully, grounded in the on-screen context when it's relevant (if they say "this question" or "this card", they mean the one above). If they have NOT yet answered the on-screen question, help them reason without giving away the correct option.
${canWeb ? '\nYou have LIVE WEB SEARCH — use it whenever the answer depends on current facts, recent events, or anything beyond your training, and briefly say what you found. For questions about THIS app or curriculum, prefer the authoritative facts above over the web.\n' : ''}
Answer in clear Markdown, short paragraphs, and bullets where they help.

${LATEX_RULE}
Do NOT use em dashes; use commas, colons, or simple hyphens.${steerNote(steer)}`;
  const reply = await streamStructured(prompt, { ...ai, search: canWeb, attachments }, onToken);
  return { reply: String(reply || '').trim() };
}
