# SOP — Turning an online course into a growing Mastery Engine curriculum

> The standard operating procedure for taking a course (Coursera, DeepLearning.AI, StatQuest,
> a book, a YouTube series) and loading it into the engine **as the backbone of a subject, not
> as a copy of the course** — then expanding that subject with AI over time without ever
> restructuring it again. Distilled from the three builds that already happened: the ML track
> restructure (2026-07-24/25), the AI Engineering program (2026-07-25) and the Linear Algebra
> re-gel (2026-07-25). Mechanics referenced here are documented in [../AGENTS.md](../AGENTS.md)
> §3/§5 and [HOW-IT-WORKS.md](HOW-IT-WORKS.md) §7–10.

---

## 0. The one principle

**The course is a SOURCE. The curriculum tree is a CONCEPT MAP. Never let the first shape the second.**

A course's module structure is optimised for the course's own runtime (weekly pacing, one
instructor's order, what fits in a Coursera quiz). The engine's tree has to be optimised for a
different thing: every future piece of material about that subject must have an obvious,
stable home. That is what the ML restructure proved: "Machine Learning Specialization" as a
lesson name was a dead end (a second course on gradient boosting had nowhere to go), while
"Tree-Based Models → Gradient Boosting & AdaBoost" absorbed Andrew Ng, StatQuest and XGBoost
docs alike.

So the tree is built **concept-first**, and the course maps onto it as transcripts attached at
the lesson grain. Source-course names live in transcript titles, never in track/course/lesson
names.

Two layers, kept separate, each with its own owner and its own rules:

| Layer | What | Owner | Mutation rule |
|---|---|---|---|
| **Skeleton** | Track → Course → Lesson → Topic (the concept map, plus boundary rules) | You + one AI planning pass, reviewed | Id-preserving ops only (`moveTopics`, `upsertTopics`, `curriculum/apply`). Never delete-and-recreate. Versioned as JSON in `content-build/skeletons/`. |
| **Mass** | Transcripts → questions, flashcards, study guides, visuals, prereq edges | AI, grounded in sources | Always additive, always `batchTag`-ged, always reversible ("Delete batch"). Read before trusting. |

Everything below is how to build the skeleton once and then keep pouring mass into it.

---

## 1. Vocabulary — what each grain means (so the map stays consistent)

| Grain | Rule | Good | Bad |
|---|---|---|---|
| **Track** | A field. Sentinel/roadmap card unit. | Machine Learning · Information Retrieval | "Coursera courses" |
| **Course** | A subject inside the field that someone could name as a skill. | Tree-Based Models · Linear Algebra | "Machine Learning Specialization" (a source) · "Week 3" |
| **Lesson** | A concept cluster; the grain transcripts attach to and study guides/decks are built at. | Gradient Boosting & AdaBoost · Four Fundamental Subspaces | "Video 12" · a single idea |
| **Topic** | **One testable idea**, a short noun phrase. The unit of mastery, the quiz-log key, the graph node. | Join Fan-out: Row Duplication When Keys Are Not Unique | "Introduction" · "Advanced topics" · a whole algorithm |

Two rules that stop drift:

- **Boundary rules are part of the skeleton.** When two courses could both claim a topic,
  write the rule down (ML example: *named tree algorithm → Tree-Based Models; combination
  strategy across arbitrary models → Ensemble Methods*). The auto-filer, the next Claude
  session and you will all make the same call.
- **A topic's identity is its doc id, never its name path** (AGENTS.md §3). Renames and moves
  keep the id, so stats, questions and prereq edges survive. Deleting and re-adding a topic
  under a "better" name throws all three away.

---

## 2. Loading a new course — the build

Budget: half a day for a 3-course specialization, most of it in step 2. Steps 3–7 are mechanical.

### Step 1 — Harvest the source (no thinking yet)

Upload as you harvest: Academy Admin → **Library** → *Add to the library* takes many files at
once and files nothing. It is the ONE way material enters — files, paste and Watcher pulls all
land there. A source sitting in the library is inert — no scope, no questions, no effect on any
learner — so there is no cost to loading everything and deciding later.

Put each course in its own **folder** as you upload (the *Put it in* box applies to everything
added in that session). Folders are shelving only: they never affect what a lesson grounds on,
so they are safe to reorganise at any time, and the folder rail is how you find one course's
material again once the library holds several.

**One source per lecture/video/chapter — not one per module.** Drop all forty files in at once;
that is one drag. Concatenating a module into a single file looks tidier and grounds worse:
the catalogue would read only its first 24k characters and every lesson it grounds would draw
questions from the same first 12k. If you already have one big file, add it and press **Split
into lessons** — that cuts it at its own lesson boundaries and gives you the same result.

Routes for getting the text, in order of preference:

1. **Atrium Watcher** — if the course is on YouTube, add the channel/playlist; Academy Admin →
   Compose can then "pick a Watcher video" straight into the ingest box.
2. **Paste** — Coursera/DeepLearning.AI expose transcripts per video; copy them.
3. **PDF/notes** — your own notes count as a source (the Linear Algebra re-gel came from a
   capstone PDF, and it was the best skeleton of the three).

Keep them in a scratch folder named by the source's own order (`01-week1-video3.txt`). Do not
file anything yet. The batch of raw transcripts is the input to step 2.

### Step 2 — Design the skeleton, concept-first (the step that matters)

**In-app path (added 2026-09-07 — try this first).** Academy Admin → **Library**: upload the
whole harvest with *Add to the library* (unfiled, nothing generated), tick the sources, then
**Catalogue selected** → **Design the curriculum**. That runs `digestSource` over each source
once, then `planFromSources` over the digests, and returns exactly what this step asks for: a
concept-shaped tree, a per-lesson source manifest, and a gap list — all editable before
anything is written. The steer box is where the boundary rules and "merge into the existing
Machine Learning track" instructions go. Committing files each source onto the lesson it
grounds, so grounding is live immediately.

Use a Claude session instead when the corpus is very large, when you are reshaping a course
that already carries learner stats, or when you want the skeleton JSON authored by hand. The
in-app planners are built for one-course increments and have mis-planned every
multi-hundred-topic reshape (AGENTS.md §5).

Give the session three things:

1. The **syllabus + the harvested transcripts** (or their titles + first paragraphs if huge).
2. The **live catalog outline** for the target program, so it reuses existing names
   character-for-character instead of forking near-duplicates:
   `GET /api/catalog?program=<id>` (cookie recipe: AGENTS.md §4), or the Academy Admin
   Curriculum tree.
3. **The ask**, in this shape:

> Design a concept taxonomy (Track → Course → Lesson → Topic) for *<subject>* that this course
> will be the first source for. Do NOT mirror the course's modules. Lessons are concept
> clusters; topics are one testable idea each, 3–6 per lesson. Reuse existing names from the
> catalog outline exactly where the concept already exists. Then list, separately:
> **(a) coverage** — which course videos ground which lessons (a source manifest);
> **(b) gaps** — concepts a practitioner of this subject needs that the course does not
> teach, as topics under the right lessons, marked `gap: true`;
> **(c) boundary rules** — for any pair of courses/lessons that could both claim a topic.
> Global `order` across the track in study sequence, prerequisites first.

Review it yourself against three checks:

- **Home test**: for three things you know the course *doesn't* cover, is there an obvious
  lesson they would land in? If not, the map is still course-shaped.
- **Grain test**: can every topic be quizzed with six distinct questions? Split the ones that
  can't be quizzed with two; merge the ones that need twenty.
- **Name test**: no source names, no "Week N", no "Introduction".

Save the result as `content-build/skeletons/<program>-<track>.json` in the shape of
[`content-build/ai-engineering-skeleton.json`](../content-build/ai-engineering-skeleton.json),
extended with `sources[]` (the manifest), `gaps[]` and `boundaryRules[]`. **This file is the
versioned record of the map.** The ML restructure was done with a temp script that was deleted
afterwards; its map now exists only in Firestore and in a memory file. Don't repeat that.

### Step 3 — Write the skeleton (id-preserving)

Two supported paths; both upsert on stable ids and never remove rows you omit:

- **New course/track** → `POST /api/admin/topics/bulk` with the rows
  `{program, track, course, lesson, topic, order}` (one call per lesson or the whole course).
  Gap topics go in now with no questions (`qCount=0`) — that is the intended state, they are
  placeholders the expansion loop fills.
- **Reshaping an existing course** (a course that already has questions/stats) → build an op
  list for `POST /api/admin/curriculum/apply` (merge/move/rename/reorder, ≤ ~50 ops per batch,
  dry-run first via `/edit/stream`). The Linear Algebra re-gel was 52 ops in one batch with
  every learner stat intact. Above that scale, a script doing merge-set `{course, lesson,
  order}` on doc ids (the ML restructure recipe) is more reliable than the editor.
  🔴 There is no `rename_topic` op — a topic rename is a `move_topic` to the same lesson under
  the new name only if you accept a new id; otherwise keep the name.

Then `POST /api/admin/sequence-topics` (or leave `placeNewTopicsInOrder` to do it on ingest)
so the tree reads in study order rather than alphabetically.

### Step 4 — Attach the sources (mass, part 1)

For each transcript, Academy Admin → Compose → paste → **Analyze & place with AI**. The router
(`classifyTranscript`) proposes a lesson and topic chips with new/existing badges; new-vs-
existing is decided server-side against the live catalog, never trusted from the model.

- Check the badges against your manifest. Every chip should be **existing**. A **new** chip
  means either the skeleton missed a concept (add it — good catch) or the model is forking a
  near-duplicate (rename the chip to the existing name).
- Tick **generate**. The commit attaches the transcript at lesson grain, upserts the topics,
  auto-sequences the lesson and starts a strict-transcript genjob (Kimi: $0 marginal).
- For many transcripts, skip the UI: `POST /api/admin/transcripts` with `{program, track,
  course, lesson, title, text, source}` in a loop, then one `POST /api/admin/genjobs` per
  lesson. Transcripts **skip an existing title** — bump the title to replace one.

Source naming: `title` = "<Course name> · Week 2 · Gradient descent intuition"; `source` =
`coursera` / `youtube` / `book` / `notes`. This is where the course's identity lives.

### Step 5 — Fill the gaps (mass, part 2)

Gap topics have no transcript, so a strict-transcript genjob cannot touch them. Two grades of
fill, pick per topic:

| Grade | When | How |
|---|---|---|
| **Brief** (10 min/topic) | Peripheral concept, you mostly want it on the map and drillable | Ask the session for a 250–500-word brief per lesson of gaps, `POST /api/admin/transcripts` with `source: 'gap-brief'`, then a genjob with `grounding: 'topic'` (brief as supporting reference, expert knowledge fills the rest) — the mechanism Build-with-AI uses. |
| **Authored** (1–2 h/lesson) | Core concept the course skipped, or you want it taught as well as the rest | Author `doc.md` + `questions.json` + `cards.json` per the [content-build contract](../content-build/INSTRUCTIONS.md), gate with `check-questions.js`, publish with `assemble.cjs --apply`. This is the quality ceiling — the AI Engineering program is entirely this. |

🔴 **Genjobs and `/api/generate` ADD `targetPerTopic` questions; nothing tops up to a target.**
Re-running doubles the bank. Delete the topic's questions first (`DELETE /api/admin/questions/:id`
per question, or `/api/admin/questions/delete-batch` by `batchTag`), then regenerate.

### Step 6 — Connect it (graph, guides, decks)

- **Prereq edges**: `POST /api/admin/build-graph?program=<id>&max=600` links every unlinked
  topic; candidates are the whole bank so cross-program edges (this course → the math it rests
  on) appear on their own. For the spine topics of a subject, hand-author the edges instead
  (`graphLinks` with `source: 'hand-authored'`, weights 3/2/1) — `refresh=1` sweeps skip those,
  so a later AI refresh can't clobber them.
- **Study guides / visuals / flashcards** build lazily from transcripts on first click. Only
  pre-build (`/api/admin/study-guides/build`, `assemble-guides.js`) when hand-made quality is
  worth it; those land `locked: true`.
- **Roadmap**: one roadmap, one track-level stage → renders as a standard Mastery Engine card
  (the "premade engine" pattern). Assign to yourself so the track lands on your shelf.

### Step 7 — Read before trusting

Counts being right says nothing about questions being on-topic. Open the lesson's questions
(`GET /api/questions/all?program=<id>`) and read one lesson end to end. Known failure modes:

- Lesson-scoped genjobs **misfile across sibling topics** when the transcript states two
  confusable facts without contrasting them. Fix the transcript (add the contrast), delete,
  regenerate topic-scoped.
- **Length leaks the answer** (72.9% on the first authored batch). `check-questions.js` gates
  on-disk content; for generated banks, spot-check that the longest option isn't usually right.
- Anything wrong that a learner will meet → they hit "Report a problem" → Academy Admin → Proof.
  That queue is the safety valve; keep it empty.

---

## 3. Growing it — the expansion loop

This is the part that runs forever, and it should be boring. Four triggers, one routine each.

### Trigger A — a new source arrives (video, article, paper, another course)

Academy Admin → Compose → paste → **Analyze & place** → check badges → commit with generate.
Ten minutes. Because the tree is concept-shaped, the router almost always lands it in an
existing lesson and reinforces existing topics; a genuinely new **new** chip is the map growing
by one node, which is exactly right. The transcript's title carries the source; the topic
doesn't care that it now has three sources.

If the new source is a *whole second course* on the subject, do **not** re-run section 2. Run
the router per transcript and let the manifest grow. Only touch the skeleton if the home test
fails for material the second course brings — then it's a handful of `add_topic` /
`move_topic` ops through Edit with AI, not a rebuild.

### Trigger B — a gap surfaces from studying

Sources of the signal: a Coach conversation ("what does the course not cover about X?"), a
Knowledge Map **keystone** (a weak/untouched topic blocking many downstream ones), a question
you flagged, or you simply noticed a hole. Routine: add the topic under its lesson
(`add_topic` op or `POST /api/admin/topics`), fill it at **brief** grade (section 2, step 5),
read the six questions. The topic's `order` places it in the study sequence, and the next
`build-graph` call links it.

### Trigger C — a scheduled gap review (monthly, per active track)

The standardised "get AI to expand on the topic" step. In a session, hand over the track's
catalog outline plus its transcript titles and ask:

> For a practitioner of *<subject>* in 2026, what does this map not cover that they would be
> expected to know? Propose topics under existing lessons (reuse lesson names exactly), one
> testable idea each, with a one-line rationale and a `weight` (3 = must, 2 = should, 1 = nice).
> Also name any existing topic that is now stale or duplicated.

Take the 3s, maybe the 2s. Add as gap topics, fill at brief grade, generate, read. Cap at
~10 topics per review so the shelf's priority ordering isn't swamped by untouched nodes — new
topics enter at maximal priority and will dominate the next quizzes.

Alternatively, **Build with AI → goal** in Academy Admin does a one-course version of this
interactively (goal → module draft → briefs → questions). Use it when the gap is a whole new
course; use the session review when it's topics scattered across existing lessons.

### Trigger D — a lesson has outgrown its grain

Symptoms: a lesson with 15+ topics, a topic whose questions span two ideas, a course with
lessons that overlap by meaning ("Derivatives" and "Differentiation"). Routine: Edit with AI
with a small op set (merge / move / split via add + move / reorder), review every line, apply.
Ids survive, so nothing is lost. Update the skeleton JSON to match and note the boundary rule
that would have prevented it.

---

## 4. The invariants (what must be true after any of the above)

1. **No source name in the tree.** Sources live in transcript titles.
2. **Every topic has a lesson-level transcript or a brief behind it** before it has questions —
   otherwise the study guide, review and assistant have nothing to ground on.
3. **Every generation run has a `batchTag`** and was read by a human before the next one.
4. **The skeleton JSON in `content-build/skeletons/` matches Firestore** after any structural
   change. It is the only record of the boundary rules and the source manifest.
5. **Ids never change.** Every structural edit went through `moveTopics` / `upsertTopics` /
   `curriculum/apply`, never delete + re-add.
6. **The local mirror is re-ported** after any code change this work required
   (`npm run port` in `../mastery-engine-local`). Pure data migrations need no deploy.

---

## 5. Where each mechanic lives

| Need | Endpoint / file | Notes |
|---|---|---|
| Live catalog outline | `GET /api/catalog?program=` | Cookie: AGENTS.md §4 |
| Create/upsert topics | `POST /api/admin/topics/bulk` · `POST /api/admin/topics` | True upsert, never removes omitted rows |
| Structural edits | `POST /api/admin/curriculum/edit/stream` (dry) → `/apply` | 10 ops, name-resolved server-side; no `rename_topic` |
| Bulk move by id | script: `set(doc(id), {course, lesson, order}, {merge:true})` | The ML-restructure recipe; ADC, project `agora-data-driven` |
| Upload unfiled source material | Library → Add to the library · `POST /api/admin/transcripts` with no scope | Inert until filed; `track`/`course`/`lesson` default to `''` |
| Catalogue a source | `POST /api/admin/transcripts/:id/digest` | Cached on the doc; the corpus planner reads these, never full text |
| Design a curriculum from sources | `POST /api/admin/sources/plan(/stream)` → `/sources/commit` | Commit also FILES each source onto its lesson; gap topics created empty, never generated |
| Attach a source | Library → File a source into the curriculum · `POST /api/admin/ingest/commit` with `transcriptId` | Files that doc IN PLACE — keeps its id, folder and digest |
| Shelve sources | Library folder rail (drag rows onto a chip) · `POST /api/admin/transcripts/folder` | Organisation only; never touches grounding |
| Split an oversized source | Library → Split into lessons · `POST /api/admin/transcripts/:id/split` | Parent kept + marked `splitInto`; delete it yourself once the parts look right |
| Generate from transcript | `POST /api/admin/genjobs` `{program,track,course,lesson[,topic]}` | Stepper, one topic per call; ADDS, never tops up |
| Generate from expert knowledge | genjob `grounding:'topic'` · `POST /api/generate` | For gap topics with a brief |
| Author at the quality ceiling | `content-build/` INSTRUCTIONS → `check-questions.js` → `assemble.cjs --apply` | 6 Q/topic, 8–14 cards/lesson, 1,600–2,600-word doc |
| Delete questions | `DELETE /api/admin/questions/:id` · `POST /api/admin/questions/delete-batch {batchTag}` | Both go through `deleteQuestionById` (qCount stays right); never delete a question doc in Firestore directly |
| Prereq graph | `POST /api/admin/build-graph?program=&max=600[&refresh=1]` | Hand-authored edges survive refresh |
| Sequence | `POST /api/admin/sequence-topics` | Or rely on ingest's auto-sequence |
| Roadmap card | `POST /api/admin/roadmaps` (one track-level stage) → `/assign` | |
| Rollback a build | delete by `batchTag`, reset `questionCount`, delete the batch's transcripts | Scope to one `program` |
