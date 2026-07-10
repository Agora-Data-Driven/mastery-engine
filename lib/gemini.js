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
import { recordUsage } from './usage.js';

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
 * switched per request: { provider: 'gemini'|'deepseek'|'ollama'|'lmstudio', model }
 * (defaults Gemini). `model` also selects the Gemini variant, e.g. gemini-2.5-pro.
 * `thinking` turns extended thinking on/off (Gemini via thinkingBudget; DeepSeek
 * V4 via the `thinking` toggle — which defaults ON server-side, so we must pass
 * it explicitly for the "fast" path); `schema` (Gemini only) is a responseSchema
 * that guarantees the JSON shape at decode time.
 */
async function complete(prompt, { json = false, provider, model, thinking, schema } = {}) {
  if (provider === 'deepseek') return callDeepSeek(prompt, { json, model, thinking });
  if (provider === 'ollama') return callOllama(prompt, { json, model });
  if (provider === 'lmstudio') return callLMStudio(prompt, { json, model });
  return callGemini(prompt, { json, model, thinking, schema });
}

/** Streaming dispatcher: invokes onToken(textChunk) as tokens arrive. */
async function completeStream(prompt, { provider, model, thinking } = {}, onToken) {
  if (provider === 'deepseek') return streamDeepSeek(prompt, model, onToken, { thinking });
  if (provider === 'ollama') return streamOllama(prompt, model, onToken);
  if (provider === 'lmstudio') return streamLMStudio(prompt, model, onToken);
  return streamGemini(prompt, onToken, model, thinking);
}

/**
 * Build the Gemini generationConfig shared by the blocking and streaming calls.
 * - JSON mode / responseSchema (schema implies JSON) guarantees a parseable shape.
 * - Extended thinking defaults to the model's own default. When the caller passes
 *   thinking === false we disable it, but ONLY on models that accept a zero budget
 *   (2.5 Flash / Flash-Lite). Pro keeps a minimum thinking budget and would reject
 *   thinkingBudget: 0, so we leave it alone there.
 */
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
 */
async function run(prompt, opts = {}, onToken) {
  if (typeof onToken === 'function') {
    let acc = '';
    await completeStream(prompt, opts, (t) => { acc += t; onToken(t); });
    return acc;
  }
  return complete(prompt, opts);
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
    // Repair under-escaped LaTeX: any "\" not starting a valid JSON escape
    // (\" \\ \/ \b \f \n \r \t \uXXXX) gets doubled so the string becomes legal.
    const repaired = s.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
    if (repaired !== s) return JSON.parse(repaired);
    throw e;
  }
}

/**
 * Shared formatting contract so all math renders in the app's KaTeX setup.
 * The frontend auto-renders $...$, $$...$$, \(...\) and \[...\].
 */
const LATEX_RULE = `MATH FORMATTING (the app renders math with KaTeX, so follow this exactly):
- Wrap ALL mathematical notation in LaTeX delimiters: inline math in single dollar signs like $x^2$, and standalone/display math in double dollar signs like $$\\int_0^1 x\\,dx$$.
- Use ONLY standard KaTeX-supported commands (e.g. \\frac, \\sqrt, \\sum, \\int, \\lim, \\partial, ^, _, \\cdot, \\times, \\le, \\ge, \\neq, \\to, \\infty, Greek letters like \\alpha \\beta \\theta, \\mathbf, \\vec, \\hat, and \\begin{aligned}...\\end{aligned} or \\begin{bmatrix}...\\end{bmatrix} for multi-line/matrix layouts).
- Do NOT use unsupported environments (no \\begin{align}, \\begin{equation}, \\label, \\tag, \\require) or custom macros, and do NOT wrap math in code fences or backticks.
- Never write bare Unicode math symbols (no raw ×, ÷, √, ², ∑, ∫, π, ≤): always express them in LaTeX inside the delimiters above.
- If you need a literal dollar sign (for example currency like five dollars), write it escaped as \\$ so it is NOT treated as the start of math.`;

/** Low-level call to Gemini via Vertex AI. Returns the raw text part. `model` overrides the default (e.g. Pro). */
async function callGemini(prompt, { json = false, model, thinking, schema } = {}) {
  const useModel = model || MODEL;
  const { url, token } = await vertexTarget(useModel, 'generateContent');
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  };
  const gc = geminiGenConfig(useModel, { json, thinking, schema });
  if (gc) body.generationConfig = gc;

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
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');
  recordGeminiUsage(useModel, data.usageMetadata);
  return text;
}

/** Streaming call to Gemini via Vertex AI (SSE). Invokes onToken(textChunk) as tokens arrive. `model` overrides the default. */
async function streamGemini(prompt, onToken, model, thinking) {
  const useModel = model || MODEL;
  const { url, token } = await vertexTarget(useModel, 'streamGenerateContent', true);
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  const gc = geminiGenConfig(useModel, { thinking });
  if (gc) body.generationConfig = gc;
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
        const t = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (t) onToken(t);
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
 * answers.
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
 * Analyze the learner's overall progress and give an encouraging, actionable
 * read-out: where they stand, strengths, what to prioritise, and a plan.
 */
export async function generateAnalysis({ overall, byCourse, weakest }, ai = {}, onToken) {
  const prompt = `You are a supportive, sharp learning coach analyzing a student's progress dashboard. "Progress" for any area is the average mastery across all its topics (a topic never attempted counts as 0%).

OVERALL: ${overall.overallProgress}% average progress across ${overall.topics} topics; ${overall.attempted} have been practised, ${overall.topics - overall.attempted} are untouched.

PROGRESS BY COURSE (weakest first):
${byCourse.map((c) => `- ${c.course} (${c.track}): ${c.progress}%, ${c.attempted}/${c.topics} topics practised`).join('\n')}

WEAKEST TOPICS (lowest progress first):
${weakest.map((t) => `- ${t.topic} [${t.course}]: ${t.progress}%${t.attempts ? ` (${t.attempts} attempts)` : ' (never attempted)'}`).join('\n')}

Write a concise analysis in Markdown using this shape:

**Where you stand**: 2 to 3 sentences summarising the overall picture honestly but encouragingly.

**Strengths**: a short bullet list of what's going well (highest-progress / well-practised areas).

**Focus next**: a short bullet list of the 3 to 5 areas that will move the needle most, with a one-line reason each. Distinguish "weak because untouched" from "weak because struggling".

**A suggested plan**: 3 to 4 concrete, ordered steps for the next study sessions.

Be warm, specific, and motivating. Avoid generic filler. Keep it tight.

${LATEX_RULE}`;
  return (await run(prompt, ai, onToken)).trim();
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
  return arr;
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
export async function generateFlashcards({ scopeLabel, level, topics, questions }, ai = {}) {
  const count = level === 'course' ? '18 to 30' : level === 'lesson' ? '8 to 14' : '5 to 9';
  const prompt = `You are a world-class teacher who makes highly technical subjects feel simple and intuitive. Build a set of STUDY FLASHCARDS for this ${level}-level section so a student can master it.

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
export async function generateFlashcardQuestion({ topic, scopeLabel, concept, intuition, formula }, ai = {}) {
  const prompt = `You are a Wise Master Educator and Professional Test Developer. Write ONE multiple-choice question that checks whether a student has truly mastered the specific concept on the flashcard below. Staying on the SAME sub-topic, test understanding (not mere recall).

SUB-LESSON / TOPIC: "${topic}"${scopeLabel && scopeLabel !== topic ? ` (within: ${scopeLabel})` : ''}

FLASHCARD BEING TESTED:
- Concept: ${concept}
- Intuition: ${intuition}
- Formula/Rule: ${formula || '(none)'}

REQUIREMENTS:
1. The question must directly test the concept above, so that answering it correctly demonstrates understanding of this card.
2. It MUST stay on the topic "${topic}". Do NOT drift to a different sub-lesson.
3. Prefer a question that applies the idea, not one that just quotes the definition.

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
 * Generate `count` distinct MCQs for a flashcard's concept (the "quiz me on this"
 * count picker). Runs generateFlashcardQuestion sequentially, dedupes by question
 * text, and skips individual failures so a partial batch still returns. Throws
 * only if NONE came back usable.
 */
export async function generateFlashcardQuestions(card, count, ai = {}) {
  const n = Math.min(10, Math.max(1, parseInt(count, 10) || 1));
  const out = [];
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    try {
      const q = await generateFlashcardQuestion(card, ai);
      const key = q.question.trim().toLowerCase();
      if (seen.has(key)) continue; // avoid near-duplicate prompts in one batch
      seen.add(key);
      out.push(q);
    } catch (e) {
      if (!out.length && i === n - 1) throw e; // surface the error only if we got nothing
    }
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
  const options = raw.options.map((o) => String(o).trim());
  if (options.length < 2 || options.some((o) => !o)) return null;

  let idx = raw.answerIndex;
  if (typeof idx === 'string' && /^\d+$/.test(idx.trim())) idx = parseInt(idx, 10);

  let answer;
  if (Number.isInteger(idx) && idx >= 0 && idx < options.length) {
    answer = options[idx];
  } else if (raw.answer != null) {
    // Fallback for providers that emitted the answer text instead of an index.
    const a = String(raw.answer).trim();
    if (options.includes(a)) answer = a;
  }
  if (!answer) return null;

  return { topic, question: String(raw.question).trim(), options, answer };
}

function buildPrompt(topic, baseline, count) {
  return `You are a Wise Master Educator and Professional Test Developer.
Below are the "Baseline Questions" currently in my database for the topic: "${topic}".

BASELINE DATA:
${JSON.stringify(baseline)}

YOUR MISSION:
1. Analyze the depth of these baseline questions and build ON TOP of them.
2. Increase the rigor. Move beyond simple definitions to conceptual mechanics, implications, and multi-step reasoning.

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

/**
 * Generate `count` new questions for `topic`, given a few baseline questions.
 * @returns {Promise<Array<{topic,question,options,answer}>>}
 */
export async function generateQuestions(topic, baseline, count, ai = {}) {
  const text = await complete(buildPrompt(topic, baseline, count), { json: true, schema: MCQ_ARRAY_SCHEMA, ...ai });

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
export async function generateSimilarQuestions({ topic, scopeLabel, question, options, answer }, count, ai = {}) {
  const n = Math.min(10, Math.max(1, parseInt(count, 10) || 3));
  const prompt = `You are a Wise Master Educator and Professional Test Developer. A student is practising and wants MORE questions like the one below, so they can drill the same idea until it sticks.

SUB-LESSON / TOPIC: "${topic}"${scopeLabel && scopeLabel !== topic ? ` (within: ${scopeLabel})` : ''}

THE QUESTION THEY WANT MORE LIKE:
${question}
OPTIONS: ${JSON.stringify(options || [])}
CORRECT ANSWER: ${answer || '(unknown)'}

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

  let obj;
  try {
    obj = parseLooseJson(await complete(prompt, { json: true, ...ai }));
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

  let obj;
  try {
    obj = parseLooseJson(await complete(prompt, { json: true, ...ai }));
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

export async function generateAssistantChat({ context = {}, history = [], message }, ai = {}) {
  const prompt = `You are the always-available study assistant inside a mastery-learning app for a working data/AI engineer. You can SEE what is on the student's screen (described below) and should answer with that context in mind — like a tutor looking over their shoulder. Be direct, warm, and concrete.

WHAT'S ON THE STUDENT'S SCREEN RIGHT NOW:
${assistantContextBlock(context)}

CONVERSATION SO FAR:
${historyBlock(history)}

THE STUDENT'S NEW MESSAGE:
"${message}"

Answer helpfully, grounded in the on-screen context when it's relevant (if they say "this question" or "this card", they mean the one above). If they have NOT yet answered the on-screen question, help them reason without giving away the correct option. Use Markdown, short paragraphs, and bullets where they help. Optionally include a declarative visual ONLY when a graph genuinely aids understanding.

${VISUAL_RULE}

${LATEX_RULE}
Do NOT use em dashes; use commas, colons, or simple hyphens.

Return ONLY a JSON object: {"reply": "markdown answer", "visual": null | {plot object as specified}}`;

  let obj;
  try {
    obj = parseLooseJson(await complete(prompt, { json: true, ...ai }));
  } catch {
    throw new Error('assistant chat returned non-JSON content');
  }
  if (Array.isArray(obj)) obj = obj[0];
  if (!obj || !obj.reply) throw new Error('assistant chat returned an unusable shape');
  return { reply: String(obj.reply).trim(), visual: sanitizeVisual(obj.visual) };
}
