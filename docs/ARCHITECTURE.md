# Mastery Engine — Architecture & API reference

Deep reference. For the operating rules (how to make a change safely) read
[../CLAUDE.md](../CLAUDE.md) first — it is shorter and contains the gotchas.

---

## Request lifecycle

```
Browser (public/app.js, vanilla IIFE)
   │  fetch('/api/…')  — cookies carry identity + AI engine choice
   ▼
server.js
   │  CSP/frame-ancestors middleware        (:181)
   │  /api guard — auth gate                (:424)
   │  requireAuth | requireAdmin            (lib/auth.js:239)
   │  rateLimitAI — 25/IP/min               (:383)
   ▼
lib/firestore.js  ──►  Firestore (agora-data-driven)
lib/gemini.js     ──►  complete() / completeStream()
                         ├── Vertex AI (Gemini)      default
                         ├── DeepSeek / Kimi / Anthropic
                         └── Ollama / LM Studio      (local)
```

**Cookies drive behaviour.** The client sets `aiProvider`, `aiModel`, `aiThinking`,
`difficulty`; the server reads them per request via `aiChoice(req)`
([server.js:279](../server.js#L279)) and `difficultyChoice(req)` ([:302](../server.js#L302)).
This is why the engine picker works across every AI feature without threading state.

---

## The AI provider layer

Every prompt in the app funnels through two functions in `lib/gemini.js`:

```js
complete(prompt, { json, provider, model, thinking, schema, search, attachments })
completeStream(prompt, { provider, model, thinking, thoughts, search }, onToken)
```

| Provider | Adapter | Notes |
|---|---|---|
| `gemini` (default) | inline, Vertex REST | Only provider supporting `search` + `attachments` + `schema`. No API key — ADC. |
| `deepseek` | `lib/deepseek.js` | Thinking defaults **ON** server-side; must send `thinking:{type:'disabled'}` for the fast path. |
| `kimi` | `lib/kimi.js` | Code-subscription key; `api.kimi.com/coding/v1` only. |
| `anthropic` | `lib/anthropic.js` | |
| `ollama` | `lib/ollama.js` | Local. |
| `lmstudio` | `lib/lmstudio.js` | Local. `json_object` response_format → 400; use `json_schema`. |

`onToken(chunk, kind)` where `kind` is `'content'` or `'thinking'`.

### Assistant self-knowledge

`docs/HOW-IT-WORKS.md` is read from disk ([gemini.js:29](../lib/gemini.js#L29)) and injected
into the assistant prompt **only when the question looks meta** (`META_QUESTION_RE`,
[:35](../lib/gemini.js#L35)) — otherwise a one-line identity is used, to save tokens.
**Editing that markdown file changes what the assistant says about itself.**

---

## API reference

Guards: 🔓 public · 👤 `requireAuth` · 🛡 `requireAdmin` · ⏱ `rateLimitAI` · 📦 `bigJson`

### Auth
| Method | Path | Guard | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | 🔓 | Password / email+password sign-in |
| POST | `/api/auth/logout` | 🔓 | Clear cookies |
| GET | `/api/auth/status` `/whoami` | 🔓 | Current identity + flags |
| GET | `/api/auth/google/enabled` | 🔓 | Is Google sign-in configured |
| GET | `/api/auth/google/login` `/callback` | 🔓 | OAuth dance |
| POST | `/api/auth/act-as` `/stop-acting` | 🛡 | Impersonate a learner |

### Catalog, stats, progress
| Method | Path | Guard | Purpose |
|---|---|---|---|
| GET | `/api/catalog` | 🔓 | Scoped topic tree + per-user stats |
| GET | `/api/models` | 🔓 | Which AI engines are available |
| GET | `/api/questions/all` | 🔓 | Whole question bank (scoped) |
| GET | `/api/stats` | 👤 | Dashboard aggregates |
| GET | `/api/streak` | 👤 | Daily streak |
| GET | `/api/usage` | 👤 | Token/cost tally |
| GET | `/api/programs` | 👤 | Programs the user is enrolled in |
| GET | `/api/bank/tracks` | 👤 | Full track list (for roadmap building) |
| GET | `/api/video-lessons` | 👤 | Curated video list |

### Quiz
| Method | Path | Guard | Purpose |
|---|---|---|---|
| POST | `/api/quiz/guest` | 🔓 | Guest-mode quiz |
| POST | `/api/quiz/select` | 👤 | Questions for a chosen scope |
| POST | `/api/quiz/multi` | 🔓 | Multi-select variant |
| POST | `/api/quiz/priority` | 👤 | Weakest-first (uses the priority score) |
| POST | `/api/quiz/log` | 👤 | **Record results → updates stats** |
| POST | `/api/questions/:id/flag` | 👤 | Learner reports a bad question |

### Question generation & drilling
| Method | Path | Guard | Purpose |
|---|---|---|---|
| POST | `/api/generate` | 👤 | Generate questions for a scope |
| POST | `/api/generate/like` | 👤⏱ | "More like this" |
| POST | `/api/drill/confusions` | 👤⏱ | Diagnose *why* an answer was wrong |
| POST | `/api/drill/question` | 👤⏱ | Targeted drill on that confusion |
| POST | `/api/hint` `/api/explain` | ⏱ | In-quiz help (streamed) |
| GET | `/api/transcripts` | 👤 | Source transcripts for grounding |

### Flashcards
| Method | Path | Guard | Purpose |
|---|---|---|---|
| GET | `/api/flashcards` `/all` | 👤/🔓 | Decks for a scope |
| POST | `/api/flashcards/generate` | 👤⏱ | Build a deck |
| POST | `/api/flashcards/mastery` | 👤 | Spaced-repetition deck (24 cards) |
| POST | `/api/flashcards/status` | 👤 | Mark known/unknown |
| POST | `/api/flashcards/quiz` | 👤⏱ | Quiz from a card |
| GET | `/api/flashcards/card-stats` | 👤 | Per-card stats |
| POST | `/api/flashcards/explain` | 👤⏱ | **Speaker Mode** — grade a spoken explanation 0–3 |
| GET/POST | `/api/flashcards/chat` | 👤⏱ | Per-card chat |
| POST | `/api/flashcards/chat/reset` | 👤 | Clear it |
| POST | `/api/flashcards/edit` `/set` `/fix-format` | 🛡 | Admin card repair |

### Study assistant
| Method | Path | Guard | Purpose |
|---|---|---|---|
| GET/POST | `/api/chat` | 👤⏱ | Scope-level chat |
| GET | `/api/assistant/chats` | 👤 | Conversation list |
| GET/DELETE | `/api/assistant/chat` | 👤 | One conversation |
| POST | `/api/assistant/chat` | 👤⏱ | Blocking turn (voice/web-search path) |
| POST | `/api/assistant/chat/stream` | 👤⏱ | **SSE streaming + pause-and-steer** |

### Study guides & analysis
| Method | Path | Guard | Purpose |
|---|---|---|---|
| POST | `/api/review` | 👤 | Section review guide (cached) |
| POST | `/api/lesson` `/lesson/context` | 👤 | Lesson guide (cached) |
| POST | `/api/analyze` | 👤 | Progress analysis |
| GET | `/api/graph` | 👤 | Knowledge map nodes + edges |
| POST | `/api/admin/study-guides/build` | 🛡 | Bulk pre-build (concurrent) |
| POST | `/api/admin/build-graph` | 🛡 | Recompute prerequisite edges |
| POST | `/api/admin/sequence-topics` | 🛡 | AI-assign `order` to topics |

Guides are cached in `studyGuides`; `?refresh=1` forces regeneration.

### Curriculum authoring (Academy Admin "Composing Room")
| Method | Path | Guard | Purpose |
|---|---|---|---|
| POST | `/api/admin/topics` | 🛡 | Create |
| DELETE | `/api/admin/topics/:id` | 🛡 | Delete |
| POST | `/api/admin/topics/move` | 🛡 | **Move/rename preserving doc id** |
| POST | `/api/admin/topics/reorder` `/bulk` | 🛡 | Ordering, bulk create |
| POST | `/api/admin/curriculum/edit/stream` | 🛡 | AI plans an edit (SSE) |
| POST | `/api/admin/curriculum/apply` | 🛡 | Apply the reviewed ops |
| POST | `/api/admin/ingest/plan[/stream]` `/commit` | 🛡📦 | Transcript → auto-filed topics |
| POST | `/api/admin/goal/plan[/stream]` `/commit` | 🛡📦 | "Learn a goal" → whole module |
| POST | `/api/admin/lessons/bulk-commit` | 🛡📦 | Outline → lessons |
| GET/POST/DELETE | `/api/admin/transcripts[/:id]` | 🛡📦 | Transcript CRUD |
| GET/POST | `/api/admin/genjobs[/:id]` | 🛡 | Background generation jobs |
| POST | `/api/admin/genjobs/:id/step` `/cancel` | 🛡 | Drive/stop a job |

### Roadmaps & the learner "shelf"
| Method | Path | Guard | Purpose |
|---|---|---|---|
| GET | `/api/roadmaps[/:id]` | 👤 | Curated learning paths |
| GET/POST/DELETE | `/api/admin/roadmaps[/:id]` | 🛡📦 | Manage them |
| POST | `/api/admin/roadmap/plan[/stream]` | 🛡📦 | AI-draft a roadmap |
| POST | `/api/admin/roadmaps/:id/assign` | 🛡📦 | Assign to people |
| GET | `/api/me/shelf` | 👤 | What's on my engine |
| POST | `/api/me/tracks` | 👤 | Add/remove tracks |
| POST | `/api/me/hide` | 👤 | Hide **any** subtree level |
| POST | `/api/me/section` | 👤 | Add/remove any grain (＋/✓) |
| POST | `/api/me/roadmaps/:id/add` `/remove` | 👤 | Enrol/leave a roadmap |

**Shelf model:** three layers resolved by specificity — `tracks` (base), `included[]`
(additive), `hidden[]` (subtractive). `inEngine()` ([server.js:575](../server.js#L575))
resolves them; most-specific match wins.

### Enrollment & people (admin)
| Method | Path | Guard | Purpose |
|---|---|---|---|
| GET/POST | `/api/admin/enrollment` | 🛡 | Who studies what |
| POST | `/api/admin/enrollment/remove` | 🛡 | Unenroll |
| GET | `/api/admin/people` | 🛡 | Roster pulled from **Sentinel** |
| GET | `/api/admin/assignments` | 🛡 | Assignment overview |
| POST | `/api/admin/programs` | 🛡 | Create/rename a program |
| GET | `/api/internal/enrollment-progress` | HMAC | **Sentinel calls this** — signed, not cookie-auth |

### Data repair (admin)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/admin/migrate` | Import CSVs → Firestore (one-time) |
| POST | `/api/admin/latexify` | Convert plain math → LaTeX |
| POST | `/api/admin/fix-question-formats` `/fix-flashcard-formats` | Reformat sweeps |
| POST | `/api/admin/merge-math` | Merge legacy math tracks → `Mathematics` |
| POST | `/api/admin/backfill-programs` | Stamp `program` on pre-dimension docs |
| POST | `/api/admin/bq-backfill` `/bq-sync-topics` | BigQuery analytics sync |
| GET/POST | `/api/admin/flags[/:id/resolve]` | Triage learner-flagged questions |
| POST | `/api/admin/questions/delete-batch` | Delete by `batchTag` |
| POST | `/api/admin/reset` | Reset progress |
| GET | `/api/export/local` | Dump everything for `mastery-engine-local` |

---

## Firestore schema

### `topics/{slug}`
```jsonc
{
  "program": "data_science", "track": "…", "course": "…",
  "lesson": "…", "topic": "…",
  "order": 12,            // AI-assigned study order
  "qCount": 8,            // cached question count
  // legacy owner ONLY — everyone else uses users/{email}/topicStats/{topicId}:
  "correctCount": 14, "totalAttempts": 20, "lastAttempted": Timestamp
}
```
> Doc id is created from the fields but **does not track them** after a move. See CLAUDE.md §3.

### `questions/{auto}`
```jsonc
{
  "program": "…", "topic": "…",      // keyed by topic NAME, so program filtering is essential
  "question": "…", "options": ["…"], "answerIndex": 2,
  "explanation": "…", "difficulty": "balanced",
  "batchTag": "dm-2026-07-17"        // lets a whole generation run be deleted
}
```

### `users/{email}/`
| Sub-path | Contents |
|---|---|
| `topicStats/{topicId}` | `correctCount`, `totalAttempts`, `lastAttempted` |
| `quizLog/{auto}` | One attempt |
| `meta/enrollment` | `{ programs[], courses[] }` — empty `courses` = all |
| `meta/shelf` | `{ tracks[], included[], hidden[], roadmaps[] }` |
| `meta/usage` | Token/cost tally |
| `cardChats/{cardId}`, `scopeChats/{scopeId}`, `assistant/{id}` | Chat histories (capped at 40 msgs) |

### Others
| Collection | Key | Notes |
|---|---|---|
| `flashcards` | `flashcardScopeId({level,track,course,lesson,topic})` | Deck per scope level |
| `studyGuides` | `studyGuideId({program,kind,…})` | Cached markdown |
| `graphLinks` | — | Prerequisite edges for the Knowledge Map |
| `programs` | program id | `{ name, defaultCourses[], category }` — `category` routes it to the right Sentinel tab |
| `transcripts` | auto | Source material for grounded generation |
| `genJobs` | auto | Resumable generation jobs |
| `roadmaps` | auto | Curated paths; stages of `{level, track, course, lesson, topic}` |
| `questionFlags` | auto | Learner reports |

---

## Integration with Sentinel

Sentinel embeds this app and reads from it:

| Direction | Mechanism |
|---|---|
| Sentinel → ME (UI) | `<iframe src="…?embed=1">` — Academy tab. `?embed=assistant&actions=1` — Coach FAB. |
| Sentinel → ME (data) | `GET /api/internal/enrollment-progress`, **HMAC-signed** (`verifyInternalSig`, [server.js:2929](../server.js#L2929)) |
| ME → Sentinel | `lib/sentinel.js` fetches the people roster for the admin enrollment UI |
| Shared identity | `ag_sso` cookie signed with `SSO_SECRET` (Secret Manager: `platform-sso-key`) |

**Embed mode matters in the frontend.** `?embed=1` is remembered in `sessionStorage`;
`?embed=assistant` and `?actions=1` are deliberately **URL-only, never persisted**, because
same-origin iframes share one `sessionStorage` and persisting them flipped the Academy tab into
the assistant (the "stuck in the chat" bug). See [public/app.js:12–35](../public/app.js#L12).

---

## Frontend structure (`public/app.js`)

One IIFE, ~5,800 lines, no framework, no build.

- `$(id)` / `show(id)` / `hide(id)` — the entire "router". Views are `<section>`s in
  `index.html` toggled by the `hidden` class.
- Boot block (lines 12–40) resolves embed/assistant/actions modes and `START_MODE`
  (`?home=quiz` makes Sentinel's Academy open straight into the quiz builder).
- State lives in module-scoped `let`s; `state.fullCatalog` holds the unfiltered bank for
  roadmap building while the shelf-filtered view drives the engine.
- Rendering is string-template → `innerHTML`.

To add UI: add a `<section>` to `index.html`, add a render function near its siblings in
`app.js`, wire the nav. Reload. That's it.
