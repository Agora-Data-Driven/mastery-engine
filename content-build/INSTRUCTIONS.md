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

## Final self-check before you finish

For every lesson: doc.md has one `## ` heading per spec topic (verbatim, all present);
questions.json parses, has topics.length × 6 questions, 4 options each, valid answerIndex,
difficulty mix per topic; cards.json parses with 8–14 cards, all topic fields verbatim-valid.
Fix anything that fails BEFORE reporting. Your final message: the per-lesson summary lines only.
