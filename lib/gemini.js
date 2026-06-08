/**
 * Gemini-backed "Wise Teacher" question generator.
 * Ported from Code.gs handleGenSelection. The API key is read from the
 * environment (wired to Secret Manager on Cloud Run) — never hardcoded.
 */
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/** Low-level call to Gemini. Returns the raw text part. */
async function callGemini(prompt, { json = false } = {}) {
  if (!API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };
  if (json) body.generationConfig = { response_mime_type: 'application/json' };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini API ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');
  return text;
}

/**
 * A single hint that nudges WITHOUT revealing the answer.
 * The correct answer is passed only so the model aims the hint correctly —
 * it is instructed never to state or hint at which option it is.
 */
export async function generateHint({ question, options, answer }) {
  const prompt = `You are a patient, encouraging tutor helping a student work through a multiple-choice question.

QUESTION: ${question}
OPTIONS:
${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}

(For your guidance only — the correct answer is: "${answer}". NEVER reveal this.)

Give ONE short hint (1–2 sentences, max ~40 words) that points the student toward the right way of thinking.

STRICT RULES:
- Do NOT state, quote, paraphrase, or letter-reference the correct option.
- Do NOT say which options are wrong or eliminate any.
- Point to the underlying concept, a definition to recall, or what to consider.
- Be warm and concise. Output ONLY the hint text — no preamble, no quotes.`;
  return (await callGemini(prompt)).trim();
}

/**
 * A from-scratch explanation aimed at a complete beginner, given after answering.
 */
export async function generateExplanation({ question, options, answer, userAnswer, isCorrect }) {
  const prompt = `You are a world-class teacher explaining a concept to someone with ZERO background knowledge — assume they are a complete beginner and define every term in plain language.

QUESTION: ${question}
OPTIONS:
${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}
CORRECT ANSWER: ${answer}
THE STUDENT ANSWERED: ${userAnswer || '(no answer recorded)'} — which was ${isCorrect ? 'CORRECT' : 'INCORRECT'}.

Teach them from scratch using this structure (use Markdown):

**The big idea** — In 1–2 plain sentences, what concept is this question really about? Define any jargon as if to a 12-year-old.

**Why the correct answer is right** — Explain clearly and simply why "${answer}" is correct. Build the reasoning step by step.

**Why the others miss** — Briefly, in a bullet list, why each other option is a tempting-but-wrong choice or common misconception.

${isCorrect ? 'Start with one short encouraging sentence acknowledging they got it right.' : 'Start with one short, kind sentence — no shaming — then gently clear up the likely misunderstanding.'}

Keep it clear, friendly, and concrete. Use short paragraphs and bullet points. Avoid unnecessary length.`;
  return (await callGemini(prompt)).trim();
}

/**
 * A pre-section study guide: read the questions that exist for a scope and
 * teach the learner the concepts they need BEFORE attempting it. It uses the
 * questions to gauge scope/depth, but teaches concepts rather than dumping
 * answers.
 */
export async function generateReview({ scopeLabel, topics, questions }) {
  const prompt = `You are a world-class teacher writing a focused STUDY GUIDE so a student can learn a section before being quizzed on it. Assume little prior knowledge and define jargon in plain language.

SECTION: "${scopeLabel}"
TOPICS COVERED (${topics.length}):
${topics.map((t) => `- ${t}`).join('\n')}

Here is a sample of the questions that exist for this section (use them ONLY to gauge the scope and depth — do NOT just restate them or reveal which option is correct):
${JSON.stringify(questions).slice(0, 6000)}

Write a clear, well-structured study guide in Markdown that teaches what the student needs to know before attempting this section. Use this shape:

**What this section is about** — 2–3 sentences framing the big picture.

**Key concepts** — the core ideas, each as a short bolded term followed by a plain-language explanation. Group by topic where it helps.

**Formulas / rules to remember** — a bullet list of the essential formulas, definitions, or rules (only if relevant).

**Common pitfalls** — a short bullet list of mistakes or misconceptions to watch for.

**How to approach the questions** — 2–4 practical tips for reasoning through this section.

Keep it concise and concrete — favour short paragraphs and bullets over long prose. Do NOT include a quiz or reveal specific answers.`;
  return (await callGemini(prompt)).trim();
}

/**
 * Analyze the learner's overall progress and give an encouraging, actionable
 * read-out: where they stand, strengths, what to prioritise, and a plan.
 */
export async function generateAnalysis({ overall, byCourse, weakest }) {
  const prompt = `You are a supportive, sharp learning coach analyzing a student's progress dashboard. "Progress" for any area is the average mastery across all its topics (a topic never attempted counts as 0%).

OVERALL: ${overall.overallProgress}% average progress across ${overall.topics} topics; ${overall.attempted} have been practised, ${overall.topics - overall.attempted} are untouched.

PROGRESS BY COURSE (weakest first):
${byCourse.map((c) => `- ${c.course} (${c.track}): ${c.progress}% — ${c.attempted}/${c.topics} topics practised`).join('\n')}

WEAKEST TOPICS (lowest progress first):
${weakest.map((t) => `- ${t.topic} [${t.course}]: ${t.progress}%${t.attempts ? ` (${t.attempts} attempts)` : ' (never attempted)'}`).join('\n')}

Write a concise analysis in Markdown using this shape:

**Where you stand** — 2–3 sentences summarising the overall picture honestly but encouragingly.

**Strengths** — a short bullet list of what's going well (highest-progress / well-practised areas).

**Focus next** — a short bullet list of the 3–5 areas that will move the needle most, with a one-line reason each. Distinguish "weak because untouched" from "weak because struggling".

**A suggested plan** — 3–4 concrete, ordered steps for the next study sessions.

Be warm, specific, and motivating. Avoid generic filler. Keep it tight.`;
  return (await callGemini(prompt)).trim();
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
Return ONLY a JSON array: [{"topic": "${topic}", "question": "text", "options": ["A", "B", "C", "D"], "answer": "exact correct option text"}]`;
}

/**
 * Generate `count` new questions for `topic`, given a few baseline questions.
 * @returns {Promise<Array<{topic,question,options,answer}>>}
 */
export async function generateQuestions(topic, baseline, count) {
  const text = await callGemini(buildPrompt(topic, baseline, count), { json: true });

  let generated;
  try {
    generated = JSON.parse(text);
  } catch {
    throw new Error('Gemini returned non-JSON content');
  }
  if (!Array.isArray(generated)) throw new Error('Gemini did not return a JSON array');

  // Normalize/validate shape.
  return generated
    .filter((q) => q && q.question && Array.isArray(q.options) && q.answer)
    .map((q) => ({
      topic,
      question: String(q.question).trim(),
      options: q.options.map((o) => String(o).trim()),
      answer: String(q.answer).trim(),
    }));
}
