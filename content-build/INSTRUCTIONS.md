# Authoring contract — AI Engineering curriculum content

You are authoring the permanent study content for ONE course of a personal mastery-learning
curriculum. Your spec file lists the course, its context, and its lessons (each with topics,
previously-taught topics, and what later lessons cover). For EVERY lesson in the spec you
produce exactly three files under your course's content directory (given in your task prompt):

```
<contentDir>/<NN>/doc.md          NN = two-digit lesson index in spec order (01, 02, ...)
<contentDir>/<NN>/questions.json
<contentDir>/<NN>/cards.json
```

Work lesson by lesson, in order: write doc.md first, then questions.json (grounded ONLY in
your doc), then cards.json. After writing each JSON file, VALIDATE it parses:
`node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" <file>` — fix and
re-validate on failure. At the end, print a one-line summary per lesson (word count, #questions,
#cards) and note any deviation from this contract.

## THE LEARNER (write for exactly this person)

A working data/AI engineer (production Node.js + GCP: Cloud Run, Firestore, Vertex AI; ships a
production hybrid retriever: BM25 + embeddings + reciprocal rank fusion + a reranker).
QUIZ-VERIFIED mastery to build on freely and NEVER re-teach: college algebra through calculus,
trigonometry, statistics & probability, linear algebra (dot products, projections,
eigenvalues/PCA), Python (OOP, iteration/memory, modularity), core ML (linear/logistic
regression, regularization, neural networks, precision/recall/F1/ROC, cross-validation,
k-means, anomaly detection, recommender systems). ZERO prior coursework in SQL, information
retrieval, or data engineering except earlier lessons of this curriculum (listed per lesson in
the spec). Reference mastered material by name ("recall from linear algebra...").

## 1. doc.md — the authoritative lesson document

This becomes the stored source that grounds every quiz question, flashcard, AI review, and
study guide for the lesson — complete enough that an expert could write an exam from it alone,
and good enough to be the learner's primary text.

- 1,600–2,600 words of dense, authoritative teaching prose. No filler, no "in this lesson we
  will", no motivational padding. Open with 2–4 sentences on why the lesson matters for
  building AI/retrieval systems, then go straight into the topic sections.
- One `## ` section per topic, heading EXACTLY the topic name from the spec, verbatim,
  in spec order.
- Every topic section delivers: the MECHANISM (how it actually works, precisely), the WHY
  (what breaks or degrades without it), one concrete worked micro-example with real
  numbers/queries/rows/code-shaped detail, and the JUDGMENT layer (tradeoffs, failure modes,
  when experts choose differently).
- Derive rather than assert wherever the learner's math makes it cheap (probability, linear
  algebra, calculus). Show the steps.
- Markdown. Inline code in backticks. Math in $...$ LaTeX only where it genuinely clarifies.
  Small tables welcome. NEVER put backtick code spans inside $...$ math.
- Do NOT teach material the spec assigns to later lessons; build on earlier lessons' topics.
- Accuracy is absolute: if unsure of a detail, teach the stable core rather than guess. State
  fast-moving product facts conservatively, as of early 2026.
- No title heading (the lesson name is stored separately) — start with the intro paragraph.

## 2. questions.json — the mastery assessment

Shape: `{"questions": [{"topic": "...", "question": "...", "options": ["...","...","...","..."],
"answerIndex": 0, "difficulty": "core"}]}`

For EACH topic in the lesson write EXACTLY 6 questions: 2 "core" (fundamental understanding),
2 "balanced" (application), 2 "challenge" (judgment/edge cases). Every correct answer must be
verifiable from your doc.md alone.

Hard rules:
- Exactly 4 options. All 4 of approximately equal length (within ~25%). Parallel grammatical
  structure (if one starts with a verb, all do).
- The correct answer must never be systematically the longest or most detailed option.
- Distractors are the misconceptions of someone who half-understood — never obvious nonsense.
- Every question stands alone: never reference "the document", "this lesson", "the material".
- Prefer scenario/judgment framing ("Your nightly re-index job re-runs after an outage and
  downstream counts double — which defect explains it?") over definition recall, especially
  for balanced and challenge.
- No two questions interchangeable (different angle, failure mode, or scenario).
- Vary answerIndex roughly uniformly across 0–3; never the same index more than twice in a row.
- 🔴 **LENGTH MUST NOT LEAK THE ANSWER — the single worst failure in this file.** Measured on the
  first 1,710-question batch: **72.9%** had the correct answer as the single longest option
  (chance is 25%), because distractors were written as short dismissive stubs — "Only index name",
  "The day of the week" — beside a full, specific correct sentence. A learner scores ~73% by
  picking the longest option **without reading the question**, and the whole bank stops measuring
  anything. Rules, all four:
  - Every option within **±25% of the mean option length** for that question. No stubs.
  - The correct answer must be the longest in **no more than ~1 question in 4**, and the shortest
    about as often. Check across the lesson, not per question.
  - Each distractor states a **specific, plausible, genuinely wrong** claim — a real misconception,
    a right idea applied at the wrong layer, a true statement that does not answer the question, or
    the correct mechanism with one detail wrong. Never nonsense, never a joke option.
  - Same grammatical shape and register across all four, so no option stands out structurally.
  Verify with `node content-build/check-questions.js --course=<CODE>` before you finish.
- PLAIN TEXT ONLY in question/options: no LaTeX, no $ delimiters; words or plain Unicode
  (×, ², →, log). Backtick code spans allowed for SQL/code. No em dashes.
- "topic" must match a spec topic name character-for-character.

## 3. cards.json — the lesson flashcard deck

Shape: `{"cards": [{"concept": "...", "intuition": "...", "formula": "...", "topic": "...",
"highway": true}]}`

8–14 cards covering the lesson comprehensively — mastering the deck must be enough to answer
any assessment question. Each card:
- "concept": the FRONT — the idea as a crisp prompt (question or evocative phrase).
- "intuition": plain, vivid language a smart beginner grasps immediately; use an analogy and a
  "why it works" angle; define jargon.
- "formula": the essential formula/rule/definition to memorize — valid LaTeX for real math
  (double-escape backslashes in JSON: "\\\\text{score}"), or a concise plain-text rule, or
  exactly "—" when truly none applies.
- "topic": one spec topic name, verbatim.
- "highway": true on the ~⅓ highest-impact foundational cards, false otherwise.
- No em dashes in prose (the "—" formula sentinel is the one exception).

## 4. guide.md + visual.html + visual.json — the learner-facing artifacts (optional)

`doc.md` is the SOURCE. These three are the two artifacts a learner actually opens, and they are
published by [`assemble-guides.js`](assemble-guides.js) (dry-run by default, `--apply` to write),
not by `assemble.cjs`. Author them only when hand-made quality is worth it — the engine generates
both from `doc.md` automatically otherwise, and does it well.

**`guide.md`** — what the **Lesson** button shows. A distillation of `doc.md` for someone about to
be quizzed, not a copy of it. Follow the shape the generator uses so hand-made and generated
guides read alike: `**The big idea**` · `**Key concepts**` (each with mechanism, why, and a
concrete micro-example carrying real numbers) · `**Rules to remember**` · `**Common pitfalls**` ·
`**How to approach the questions**` · `**Where this leads**`. Open by connecting to the lesson's
`alreadyTaughtInCourse` topics by name. 1,200–2,000 words.

**`visual.html`** — what the **✨ Visuals** button frames. ONE self-contained page of 3–6 numbered,
named, interactive visuals. Non-negotiables, because the app enforces every one of them:

- `<nav class="viz-tabs">` of `<button class="viz-tab" data-viz-tab="N">N. Name</button>`, then one
  `<section class="viz-panel" data-viz-panel="N">` per visual. Names are 2–4 concrete words — the
  learner says them out loud to the assistant.
- 🔴 **Each panel carries its own `<style>` and `<script>`, inside the section, script last**, with
  every id and class prefixed `vN-`. Nothing outside a panel may reference anything inside one, or
  `canSwapVisualPanel` refuses and that visual can no longer be rewritten on its own.
- 🔴 **Never write the literal script tag name in a comment.** The panel scanner reads tags
  textually and treats it as a real page-level script — which silently un-editables that panel.
- No external resources and no storage APIs: the artifact runs in an opaque-origin sandbox where a
  CDN script, web font, remote image, `fetch` or `localStorage` is blocked or throws.
- Colours only from `--viz-bg --viz-surface --viz-ink --viz-muted --viz-line --viz-accent
  --viz-green --viz-red --viz-amber --viz-violet`. Never hard-code a background or text colour, and
  never let colour alone carry meaning.
- Never declare a `display` value on `.viz-panel` — the app shows and hides panels.
- Interactivity must TEACH: the learner changes an input and sees the consequence. Reads well at
  390px, touch targets ≥44px. Maths as plain text or SVG (`x^2`, `sqrt(x)`) — no LaTeX renders here.
- Where the lesson has prerequisites, make **visual 1 the bridge**: familiar ground on one side,
  this section on the other, the connection drawn.

**`visual.json`** — `{ "title": "…: Visual Guide", "outline": ["Title: …", "1. Name | what it shows
| the takeaway", …] }`. The outline is the assistant's ONLY view of the page (the iframe is
opaque-origin), so it needs one line per panel with matching numbers, or "teach me visual 3"
resolves to nothing.

Both artifacts are written with `locked: true`, so the app refuses to regenerate over them without
an explicit confirm. Validate with `node content-build/assemble-guides.js --course=<CODE>` — it runs
the server's own parsers and reports every problem before anything is written.

## Final self-check before you finish

For every lesson: doc.md has one `## ` heading per spec topic (verbatim, all present);
questions.json parses, has topics.length × 6 questions, 4 options each, valid answerIndex,
difficulty mix per topic; cards.json parses with 8–14 cards, all topic fields verbatim-valid.
If you authored guides/visuals, `assemble-guides.js --course=<CODE>` must report "validation:
clean". Fix anything that fails BEFORE reporting. Your final message: the per-lesson summary lines
only.
