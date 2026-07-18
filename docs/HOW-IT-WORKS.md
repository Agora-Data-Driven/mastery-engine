# How the AGORA Mastery Engine works

This is the single source of truth for how the app is built, the exact formulas it uses, and the
learning-science research it is based on. It is written for humans *and* injected into the in-app
Study Assistant so it can answer questions about itself accurately (e.g. "what's your mastery
formula?", "what research is this based on?"). If something here disagrees with the code, the code
wins — keep this in sync.

---

## 1. What it is

A spaced-repetition **mastery-learning** app: a Node/Express service on Cloud Run, Firestore for
data, and AI (Gemini via Vertex, with DeepSeek/Kimi/local options) for generating questions,
flashcards, hints, and explanations. You practise questions, the app tracks how well you know each
topic, and it keeps steering you toward what you're weakest at and haven't seen recently.

## 2. Content model

`Program → Track → Course → Lesson → Topic`. A **topic** (the UI calls it a "sub-lesson") is one
testable idea and is the stable unit everything keys on: every quiz attempt, priority score, and
graph node is per-topic. A **program** (default `data_science`, plus `digital_marketing`, etc.) lets
multiple curricula share one question bank. The **question bank** is shared across users; each
user's **stats and attempt log are their own** (the legacy owner `ianfernandezctm@gmail.com` maps to
the original shared docs; everyone else gets `users/{email}/…` subcollections).

## 3. The mastery / priority formula (exact)

Each topic gets a **Master Priority** score from 0–100 — higher means "work on this next." It's a
weighted blend of three drivers (`lib/priority.js`):

```
priority = 100 × ( 0.5·accuracyGap + 0.3·recency + 0.2·(1 − confidence) )

  accuracyGap = 1 − accuracy          accuracy = correctCount / totalAttempts   (0 if never tried)
  recency     = min(daysSince / 30, 1)   days since last attempt, saturating at 30 days
  confidence  = min(attempts / 10, 1)    full confidence after 10 attempts
```

- **Lower accuracy → higher priority** (you're weak here). Weight **0.5**.
- **More days since you practised → higher priority** (spaced-repetition decay). Weight **0.3**,
  saturating at **30 days** (`RECENCY_CAP_DAYS`).
- **Fewer attempts → higher priority** (low confidence in the stat, so keep testing it). Weight
  **0.2**, reaching full confidence at **10 attempts** (`CONFIDENCE_CAP_ATTEMPTS`).

A never-attempted topic is treated as accuracy 0 and 30 days stale, so it surfaces as high priority
rather than being invisible. Priority is **recomputed and stored on every logged attempt**
(`logResults` in `lib/firestore.js`), not just derived at read time.

> Honest note: the original tool was a Google Sheet whose priority column was a spreadsheet formula
> that couldn't be recovered, so this is a faithful **reconstruction** of the same three drivers —
> a bespoke heuristic, not a textbook algorithm like SM-2.

## 4. How questions are selected

- **Mastery quiz** (`/api/quiz/select`): scope the catalog, rank topics by priority (random
  tiebreak), take the **top 15** topics, and serve **unseen questions before ones you've already
  answered**.
- **Priority quiz / "🔥 Drill these now"** (`/api/quiz/priority`): rank each track's topics by
  priority, then **interleave round-robin across every track** (topic pool capped at 90) so
  consecutive questions come from different paths — you don't get 10 calculus questions in a row.
- **Live/multi quiz** (`/api/quiz/multi`): an explicit topic set you pick; unseen-first for
  signed-in users. **Guest practice** (`/api/quiz/guest`): a shuffled sample, no history.

## 5. Study modes

1. **Mastery quiz** — priority-ranked, unseen-first.
2. **Priority quiz** — cross-track interleaved, weakest-first ("Drill these now").
3. **Live/multi quiz** — build your own topic set.
4. **Guest practice** — open, no account.
5. **Flashcard decks** (course/lesson/topic) — with Highway rapid-review + per-user labels.
6. **Mastery flashcard deck** — 24 cards from your weakest topics, interleaved.
7. **"Quiz me on this"** — turns a flashcard into a real logged MCQ.
8. **Speaker mode** — explain a card aloud (browser speech-to-text), AI grades it out of 3
   (pass ≥ 2), and a pass counts toward that topic's mastery.
9. **Per-card chat / personalization** — ask about a card; it can rewrite that card's explanation
   privately for you.
10. **Drill deeper** — diagnoses your confusion on a missed question and generates a targeted one.
11. **Generate questions / "more like this"** — AI writes new bank questions for a scope.
12. **Progress analysis & Knowledge Map** — AI coaching + a graph of your whole curriculum.

## 6. Difficulty selector

Four levels (`Auto`/`Core`/`Balanced`/`Challenge`) applied to *generated* questions. **Auto** ramps
from your per-topic history (`resolveDifficulty` in `lib/gemini.js`):

```
< 2 attempts  → Core       (first pass / barely seen — rebuild fundamentals)
accuracy < 70 → Core
accuracy < 90 → Balanced   (solid — apply under pressure)
else          → Challenge  (mastered — stress-test the edges)
```

**Fair-challenge guard:** the Challenge directive explicitly requires questions to stay *fair* —
exactly one defensibly-correct answer, unambiguous, never hinging on trivia or an exception you
couldn't reason out from the concept. "Hard" never means "unfair." (These 70/90 thresholds line up
with the graph's `STRONG_ACC = 70` / `WEAK_ACC = 60`.)

## 7. How questions are generated

Two AI paths:

- **Bulk topic generation** (`/api/generate`): one call per topic (concurrency 4), given a baseline
  of existing Q/A for calibration, the learner's performance, and prerequisite standing.
- **Flashcard "Quiz me" — plan-then-parallel** (`/api/flashcards/quiz`): a cheap **planner** first
  classifies the skill and emits one **brief** per question, then writers fill the briefs **in
  parallel**, each shown its siblings so they don't collide. The planner distinguishes:
  - **procedural** skills (a process practised by repetition) — briefs vary the *given/input*, and
    questions *should* look structurally similar (that's correct practice, not repetition);
  - **conceptual** skills — briefs probe different *angles, facets, and misconceptions*;
  - **mixed** — a few conceptual anchors plus practice reps.

Every prompt carries an **avoid-list** (up to 60 existing question stems: "do NOT duplicate or
paraphrase"), anti-test-hacking formatting rules (option uniformity, no length bias, plausible
distractors), and emits the answer as a 0-based index, not a copyable string.

## 8. Flashcards

Decks are AI-written and scoped by level — **course** (18–30 cards), **lesson** (8–14), **topic**
(5–9). Each card has a front **concept** and a two-part back: **Intuition** (plain-language) +
**Formula** (the rule to memorise). **Highway mode** filters to the smallest high-impact set.
Cards can carry a declarative **visual** (tangent lines, shaded integrals, etc.) drawn by a
dependency-free SVG plotter with no `eval` — the model describes the plot, it never emits SVG.
Per-user labels (Mastered / Still learning / Important) are private. **Speaker mode** grades a
spoken explanation out of 3 and folds a pass into topic mastery.

## 9. Knowledge Map

Every topic is a node; two edge kinds (`lib/graph.js`):

- **flow** — the curriculum spine (topic → next topic → next lesson → next course), derived from the
  catalog every request so it's never stale.
- **prereq** — AI-mapped "you need X to understand Y" links (often cross-course), persisted per
  topic.

From this it derives **frontier** ("Ready to start": untouched topics whose prerequisites are all
strong) and **keystones** ("Weak links": weak/untouched topics blocking the most downstream
material). These feed the AI **progress analysis** and steer **generation** so questions exercise
your weak prerequisites as sub-steps.

## 10. Academy Admin

A separate admin console (`/academy-admin.html`, gated by `requireAdmin`) for authoring the
curriculum for a team. Four tabs:

- **Curriculum & Sources** — edit the Track→Course→Lesson→Topic tree; **auto-file ingest**: paste a
  transcript (or pick an Atrium "Watcher" video) → AI proposes where it belongs (reusing existing
  names or proposing new ones; new-vs-existing is decided **server-side against the live catalog**,
  never trusted from the model) → you review/edit → attach, optionally generating questions.
- **Generate** — bulk question generation runs as a **stepper** (one topic per HTTP call, because
  Cloud Run throttles CPU between requests), so a closed tab costs at most one topic; every run is
  tagged with a `batchTag` and is fully reversible via "Delete batch." Flashcards generate in a
  single request per scope.
- **Flags** — learners flag bad questions; admins keep-or-delete them (the safety valve for
  auto-published generated content).
- **People** — set each person's **enrollment** (`{programs, courses}`; empty courses = all).

**Sentinel tie-in:** the team portal's Academy tab reads `/api/internal/enrollment-progress`
(HMAC-signed, 5-minute replay window on the shared `SSO_SECRET`) to show each person's per-program
progress, and defaults admins straight to this Academy Admin view.

## 11. AI engines

One dispatcher (`complete()` / `completeStream()` in `lib/gemini.js`) routes every AI feature to the
picked engine (cookie `aiProvider`/`aiModel`):

- **Gemini via Vertex AI (default)** — billed to the GCP project, no API key (uses the runtime
  service account). Variants: 2.5 Flash (fast) and Pro (best). **Extended thinking** is on by
  default (off trades depth for speed). **Web search / internet access** is a Gemini-only capability
  (Google Search grounding) — when enabled it drops JSON mode and returns a grounded plain-text
  answer with sources.
- **DeepSeek / Kimi** — optional, appear when their API keys are configured.
- **Local (Ollama / LM Studio)** — only when running the app locally.

## 12. Data & analytics

**Firestore** is the operational store (`topics`, `questions`, `quizLog`, per-user subcollections).
Every attempt is best-effort **streamed to BigQuery** (`mastery_analytics.quiz_log` per-attempt +
`topics` mastery snapshot) for SQL/dashboards — a BigQuery outage never fails a quiz.

---

## 13. The research it's built on

The engine operationalizes a stack of well-established findings from cognitive science and education
research. Each maps to a concrete feature:

- **The spacing effect / distributed practice** — spreading practice over time beats cramming.
  *Ebbinghaus's* forgetting curve (1885); *Cepeda et al.* (2006) meta-analysis. → the **recency**
  term in the priority score (staleness raises priority) and the whole spaced-repetition loop. The
  Leitner box system (1972) and SuperMemo's SM-2 (Woźniak, 1990s) are the classic algorithms in this
  lineage; the engine uses a simpler bespoke priority heuristic in the same spirit.
- **The testing effect / retrieval practice** — retrieving an answer strengthens memory more than
  re-reading. *Roediger & Karpicke* (2006), "Test-Enhanced Learning." → the entire quiz-first
  design; even flashcards push you to "Quiz me on this."
- **Mastery learning** — advance by *demonstrated* proficiency, not by seat time; with good
  feedback most learners can reach high mastery. *Bloom* (1968, "Learning for Mastery"; 1984, the
  "2-sigma problem"). → the app's name and its accuracy-gated difficulty ramp.
- **Deliberate practice** — targeted effort at the edge of your ability, aimed at weaknesses, with
  feedback. *Ericsson, Krampe & Tesch-Römer* (1993). → the priority score's focus on **low-accuracy**
  topics and the "🔥 Drill these now" weak-spot drills.
- **Desirable difficulties** — making practice harder (in the right way) improves long-term
  retention. *Bjork & Bjork* (2011). → the difficulty selector ramping toward **Challenge**, with the
  fair-challenge guard so difficulty never becomes unfairness.
- **Interleaving** — mixing topics beats blocked practice for discrimination and transfer.
  *Rohrer & Taylor* (2007); *Rohrer* (2012). → the priority quiz **interleaves across tracks**.
- **Prerequisite structure / knowledge components** — knowledge has a dependency graph; you learn Y
  faster once its prerequisites X are solid. Knowledge-space theory (*Doignon & Falmagne*, 1985);
  knowledge-component / ITS work (*Koedinger et al.*). → the **Knowledge Map's** prereq edges,
  "Ready to start" frontier, and prereq-aware question generation.
- **The generation & self-explanation effects** — producing/explaining material yourself deepens
  understanding. *Chi et al.* (1994), self-explanation. → **Speaker mode** (explain a card aloud,
  AI-graded).
- **Feedback** — timely, specific feedback is one of the largest levers on learning.
  *Hattie & Timperley* (2007), "The Power of Feedback." → per-question explanations, hints, the
  drill-your-confusion flow, and the AI progress analysis.
- **Metacognition & calibration** — knowing what you don't know. → the **confidence** term (few
  attempts ⇒ keep testing) and the progress dashboard surfacing untouched/weak areas.

In short: **spaced repetition** decides *when*, **retrieval practice + mastery learning** decide
*how*, **deliberate practice + desirable difficulties** decide *what* (your weak edges), and
**interleaving + a prerequisite graph** decide *in what order*.
