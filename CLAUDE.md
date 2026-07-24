# CLAUDE.md — Mastery Engine (cloud)

> **Read this before touching any file.** It is the operating manual for this repo.
> If you follow it, you do not need to explore the codebase to make a correct change.
> Product/feature docs live in [README.md](README.md) and [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md).
> Deep file map: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 0. What this is, in 30 seconds

A **spaced-repetition mastery-learning quiz app**. Learners pick a scope
(Track → Course → Lesson → Topic), get questions weighted toward what they're weak at and
haven't seen recently, and their per-topic stats drive a 0–100 "priority" score. AI (Gemini
via Vertex, or DeepSeek/Kimi/local) generates questions, flashcards, study guides, and powers
a study assistant.

| | |
|---|---|
| **Stack** | Node 20, Express 4, **vanilla JS frontend** (no framework, no build step), Firestore, Vertex AI |
| **Runs on** | Cloud Run service `mastery-engine`, project `agora-data-driven`, region `us-central1` |
| **Live URL** | `https://mastery-engine-585951669065.us-central1.run.app` |
| **Embedded in** | Sentinel's **Academy** tab + global **Coach** FAB, via `<iframe>` (`?embed=1`) |
| **Sibling repo** | [`../mastery-engine-local`](../mastery-engine-local) runs this same app offline. **See §7 — it mirrors this repo; never hand-port.** |

**There is no build step and no test runner.** `node server.js` serves `public/` statically.
Editing `public/app.js` and reloading the browser is the whole frontend loop.

---

## 1. Run it / deploy it

```powershell
# Local (needs ADC for Firestore + Vertex)
gcloud auth application-default login     # one time
npm install
npm run dev                                # node --watch server.js → http://localhost:8080

# Deploy to production (from repo root)
gcloud run deploy mastery-engine --source . --region us-central1 --project agora-data-driven
```

**Deploy account matters.** You must be `info@agoradatadriven.com`, not `ian@100.digital`.
This VS Code window is pinned to the `agora` gcloud config — see the root [CLAUDE.md](../CLAUDE.md).
**Never run `gcloud config set …`** here; it breaks the other window.

```powershell
# Verify the pin before deploying
gcloud config list --format="value(core.account,core.project)"
# → info@agoradatadriven.com   agora-data-driven
```

A deploy takes ~3–5 min (Cloud Build). Deploying does **not** require Node or Docker locally.

> ⚠️ Deploy is **last-deploy-wins**. If a teammate deploys a stale tree after you, your
> revision is silently replaced. Before blaming browser cache, check what's actually serving:
> ```powershell
> gcloud run services describe mastery-engine --region us-central1 `
>   --format="value(status.traffic[0].revisionName)"
> ```

---

## 2. Map — where everything lives

### Top level

| Path | Lines | What it is |
|---|---:|---|
| [server.js](server.js) | 4.7k | **All ~140 HTTP routes.** Express app, auth wiring, SSE helpers. |
| [lib/firestore.js](lib/firestore.js) | 1.8k | **All database IO.** Every read/write goes through here. |
| [lib/gemini.js](lib/gemini.js) | 2.9k | **All AI prompts + provider dispatch.** Misleading name — it fronts every provider. |
| [lib/auth.js](lib/auth.js) | 250 | Cookies, tokens, SSO, admin checks. |
| [lib/priority.js](lib/priority.js) | 72 | The mastery formula. Pure, IO-free, testable. |
| [lib/programs.js](lib/programs.js) | 86 | Program/course scoping rules. Pure, IO-free, testable. |
| [public/app.js](public/app.js) | 5.8k | The entire learner frontend, one IIFE (`const App = (() => {…})()`). |
| [public/academy-admin.js](public/academy-admin.js) | 2.0k | The admin "Composing Room" frontend. |
| [public/index.html](public/index.html) | 804 | Learner shell. All views are `<section>`s toggled by `hidden`. |
| [public/styles.css](public/styles.css) | 1.9k | All styling. Dark theme, CSS custom properties. |
| [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md) | — | **Injected into the AI assistant's prompt** at runtime (`lib/gemini.js:29`). Editing it changes assistant behaviour. |

### `lib/` — one file per concern

| File | Purpose |
|---|---|
| `firestore.js` | Data layer. Collections in `COL` at [firestore.js:33](lib/firestore.js#L33). |
| `gemini.js` | Prompt builders + `complete()` / `completeStream()` dispatchers. |
| `auth.js` | 4 sign-in paths (see §4). |
| `anthropic.js` `deepseek.js` `kimi.js` `ollama.js` `lmstudio.js` | One provider adapter each. Same shape: `callX()` + `streamX()`. |
| `genjobs.js` | Background question-generation job runner (stepped, resumable). |
| `graph.js` | Knowledge-map prerequisite edges. |
| `programs.js` `priority.js` | Pure logic. **The only two files with unit tests.** |
| `usage.js` | Token/cost tallying per user. |
| `googleauth.js` | Google OAuth flow. |
| `sentinel.js` | Fetches the Sentinel people list (for admin enrollment UI). |
| `bigquery.js` `csv.js` `migrate.js` `watcher.js` | Import/analytics side-paths. |
| `_*_test.js` | Node test files — see §6. |

### Finding a route fast

Routes are declared in source order in `server.js`. To find one:

```powershell
Select-String -Path server.js -Pattern "app\.(get|post|put|delete)\('/api/quiz" -AllMatches
```

Rough zones in `server.js`:

| Lines | Zone |
|---|---|
| 167–430 | Middleware, CSP, helpers (`shuffle`, `mapWithConcurrency`, `streamText`, `sseInit`, rate limit) |
| 435–500 | Auth routes |
| 506–830 | Catalog, stats, streak, usage |
| 851–1090 | Quiz select/multi/priority/log |
| 1086–1300 | Question generation, drills, transcripts |
| 1358–1830 | Flashcards (incl. Speaker Mode `explain`, card chat) |
| 1928–2200 | Study assistant (blocking + SSE streaming) |
| 2196–2460 | Review / Lesson study guides |
| 2480–2660 | Knowledge graph, topic sequencing |
| 2675–2870 | Admin data repair (latexify, fix-formats, merge-math) |
| 2866–3180 | Programs, enrollment, video lessons, internal SSO endpoints |
| 3180–3520 | **Curriculum edit engine** (`runCurriculumEdits`) + AI curriculum editing |
| 3521–3870 | Transcripts, Watcher import, ingest plan/commit |
| 3873–4220 | Goal planning, bulk lessons, genjobs |
| 4223–4630 | Roadmaps + learner shelf (`/api/me/*`) |
| 4629–4720 | Flags, migrations, static serving, error handler |

---

## 3. Data model (Firestore)

Collections are named in `COL` — [lib/firestore.js:33](lib/firestore.js#L33):

```
topics  questions  quizLog  flashcards  studyGuides
graphLinks  programs  transcripts  genJobs  questionFlags  roadmaps
```

### The content hierarchy

```
program  →  track  →  course  →  lesson  →  topic
(data_science | digital_marketing | …)
```

A `topics` doc is one leaf. It carries `{ program, track, course, lesson, topic, order, qCount }`.

### ⚠️ The single most important rule in this repo

> **A topic's identity is its DOCUMENT ID, never its field values.**

`slug()` ([firestore.js:72](lib/firestore.js#L72)) builds an id from the field values *at
creation time*. But `moveTopics()` ([firestore.js:227](lib/firestore.js#L227)) deliberately
**keeps the doc id** when a topic is renamed or moved to another lesson — that's what
preserves its questions and the learner's stats.

So after any move/rename, `slug(current fields) !== docId`.

**Any code that keys stats/progress by `slug(fields)` is a bug.** It writes to one key and
reads from another; the learner finishes a quiz and sees no progress. This exact bug has been
fixed twice. Use `buildTopicIdIndex()` ([firestore.js:1729](lib/firestore.js#L1729)) to map
rows → real doc ids.

### Per-user data lives in two shapes

There is a **legacy owner** (`LEGACY_OWNER`, [firestore.js:48](lib/firestore.js#L48), default
`ianfernandezctm@gmail.com`) whose stats are embedded directly on the `topics` docs — that's
how the original single-user Google Sheet imported. Everyone else gets subcollections:

| | Legacy owner | Everyone else |
|---|---|---|
| Stats | `topics/{id}` (inline fields) | `users/{email}/topicStats/{topicId}` |
| Quiz log | `quizLog/*` | `users/{email}/quizLog/*` |

`statsCol()` / `logCol()` ([firestore.js:56–69](lib/firestore.js#L56)) hide this. **Always go
through them.** Branching on the legacy owner yourself is how the "no questions found" and
"phantom qCount=0 docs" bugs happened.

Also per-user, under `users/{email}/meta/`: `enrollment` (programs + courses), `shelf`
(which tracks are on their Mastery Engine, plus `hidden[]` / `included[]`), `usage`.

### The mastery formula ([lib/priority.js](lib/priority.js))

```
priority = 0.5·(1−accuracy) + 0.3·min(daysSince/30, 1) + 0.2·(1 − min(attempts/10, 1))
```
Returned 0–100. Higher = study this next. Never attempted ⇒ maximally stale ⇒ high priority.

---

## 4. Auth — four sign-in paths

Resolved in [lib/auth.js](lib/auth.js). In precedence order:

| # | Path | Mechanism |
|---|---|---|
| 1 | **`ag_sso` cookie** | Portal-wide SSO, HMAC-signed with `SSO_SECRET`. Works only on a `*.agoradatadriven.com` domain. |
| 2 | **Google sign-in** | OAuth. Opt-in — dormant unless `GOOGLE_OAUTH_*` secrets are set. |
| 3 | **Email + password** | `MASTERY_LOGIN_ACCOUNTS="email:pw,email:pw"`. Mints the same cookie a Google login does. Opt-in. |
| 4 | **Shared password** | `APP_PASSWORD`. Legacy. Blank email ⇒ this path. Signs in *as the legacy owner*. |

Guards: `requireAuth` and `requireAdmin` ([auth.js:239](lib/auth.js#L239)). Admin = `MASTERY_SUPER_ADMIN`
(`info@agoradatadriven.com`) plus the admin list. `act-as` lets an admin impersonate a learner
for debugging — `effectiveUser(req)` is the identity you almost always want, **not**
`currentEmail(req)`.

### Calling an admin endpoint with curl

```powershell
# Mint an ag_sso cookie locally (needs the same SSO_SECRET as prod)
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$msg = "info@agoradatadriven.com|$ts"
$h = New-Object System.Security.Cryptography.HMACSHA256
$h.Key = [Text.Encoding]::UTF8.GetBytes($env:SSO_SECRET)
$sig = [Convert]::ToBase64String($h.ComputeHash([Text.Encoding]::UTF8.GetBytes($msg))) -replace '\+','-' -replace '/','_' -replace '='
curl.exe -s -X POST "$URL/api/admin/sequence-topics" -H "Cookie: ag_sso=$msg|$sig"
```

---

## 5. Recipes

### Add an API endpoint

1. Put it in `server.js` **next to its siblings** (see the zone table in §2) — not at the bottom.
2. Pick guards: `requireAuth`, `requireAdmin`, `rateLimitAI` (for anything that calls a model),
   `bigJson` (for payloads > 1 MB, e.g. transcripts).
3. Always `next(e)` on error so the handler at [server.js:4712](server.js#L4712) formats it.

```js
app.post('/api/thing', requireAuth, rateLimitAI, async (req, res, next) => {
  try {
    const email = effectiveUser(req);              // NOT currentEmail
    const scope = await resolveProgramScope(email, { requested: req.body?.program });
    const out = await someLib(req.body, aiChoice(req));
    res.json(out);
  } catch (e) { next(e); }
});
```

> **`app.get('*')` at [server.js:4707](server.js#L4707) is the SPA catch-all.** Any route
> declared after it is unreachable. Never append routes to the end of the file.

### Add an AI feature

All prompts live in `lib/gemini.js`. Never call a provider SDK directly from `server.js`.

```js
export async function generateThing({ topic, context }, ai = {}, onToken) {
  const prompt = `…instructions…\n\nTOPIC: ${topic}\n${context}`;
  return complete(prompt, { json: true, schema: THING_SCHEMA, ...ai });
}
```

- `complete(prompt, opts)` — blocking. `completeStream(prompt, opts, onToken)` — streaming.
- Pass `...ai` through so the user's provider choice is honoured.
- For JSON, prefer a `schema` (Gemini responseSchema) — it guarantees shape at decode time
  and removes a whole class of parse failures.
- `search: true` and `attachments` are **Gemini-only** capabilities; other providers ignore them.

### Stream a response

Two mechanisms, don't mix them:

| Use | Helper | For |
|---|---|---|
| Plain text | `streamText(res, onToken => …)` [server.js:330](server.js#L330) | Learner-facing prose (hints, explanations, guides) |
| Typed events | `sseInit(res)` + `sseSend(res, event, data)` [server.js:358](server.js#L358) | Admin planners — streams `thinking` / `content` / `result` / `done` |

Both set `X-Accel-Buffering: no`. **Without it Cloud Run buffers the whole response** and
streaming silently degrades to one big blob at the end.

> **SSE "network error" in the browser almost always means a 500 *before* the stream opened.**
> Build expensive context *after* `sseInit()`, behind a heartbeat.

### Add a frontend view

`public/index.html` holds every view as a `<section id="view-x" class="hidden">`. `app.js`
toggles them with `show(id)` / `hide(id)`. There is no router and no build step.

Add the section to the HTML, then wire it in `app.js` near the other view handlers. Reload the
browser — that's the full loop.

### Change the curriculum (move/rename/merge topics)

Use the ops engine, not raw Firestore writes: `runCurriculumEdits()`
([server.js:3180](server.js#L3180)) → `moveTopics()`. It preserves doc ids, and therefore
questions and learner stats.

Admin UI: Academy Admin → Compose → Curriculum ("Edit with AI").

> The in-app AI editor has historically mis-planned large restructures (placeholder junk,
> partial applies). For a big multi-hundred-topic reorganisation, a one-off script doing
> `merge`-update `{course, lesson}` on stable doc ids is more reliable. Preserve the doc id.

---

## 6. Verify your change

There is **no test runner and no linter configured**. `npm test` does not exist. What you have:

```powershell
# 1. Syntax check — catches the majority of breakages, costs a second
node --check server.js
Get-ChildItem lib\*.js | ForEach-Object { node --check $_.FullName }

# 2. The three real unit tests (pure logic, no cloud needed — all print "PASS")
node lib\_auth_test.js
node lib\_programs_test.js
node lib\_progress_credit_test.js

# 3. Boot it and hit a route
npm run dev
curl.exe -s http://localhost:8080/api/auth/status
```

**Always run `node --check` on every file you edited before deploying.** A syntax error is only
discovered at container start otherwise, and Cloud Run will serve the *old* revision while the
new one crash-loops — which looks like "my deploy did nothing".

After deploying, confirm the revision actually changed:

```powershell
gcloud run services describe mastery-engine --region us-central1 `
  --format="value(status.latestReadyRevisionName,status.traffic[0].revisionName)"
```

---

## 7. Gotchas — read before debugging

Each of these cost real hours. Symptom → cause → fix.

### 🔴 `Edit` fails to match a string that's clearly in the file

**Cause:** three files contain **literal NUL (0x00) bytes** used as map-key separators. `Read`
renders them as spaces, so the string you copy back is not the string on disk. Grep reports the
file as binary.

| File | Line | Content |
|---|---|---|
| [public/app.js](public/app.js) | 521 | `` lo(le, `${r.course}<NUL>${r.lesson}`, r.order); `` |
| [server.js](server.js) | 2617 | `` const key = `${r.track}<NUL>${r.course}<NUL>${r.lesson}`; `` |
| [lib/firestore.js](lib/firestore.js) | 1703, 1705 | `tupleKey()` — joins with `<NUL>` |

**Fix:** don't edit those lines with `Edit`. Use a Node script with explicit ` `:

```js
const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
s = s.replace('${r.track} ${r.course}', '…');
fs.writeFileSync('server.js', s);
```

Audit any file before a delicate edit: `` tr -cd '\000' < server.js | wc -c ``

### 🔴 "I finished a quiz and got no progress"

**Cause:** stats keyed by `slug(current fields)` instead of the stable doc id. See §3.
**Fix:** `buildTopicIdIndex()`. Never re-derive an id from field values.

### 🔴 "No questions found" for a topic that plainly has questions

**Cause:** the legacy owner gets `priority: null` on never-attempted topics, and
`/api/quiz/select` filtered on `priority != null`. Fixed in `getCatalog`'s legacy branch — but
the shape of the bug recurs. Any query filtering on a stat field must tolerate `null`.

### 🔴 LM Studio returns 400, or is unbearably slow

Two separate problems, both fixed in [lib/lmstudio.js](lib/lmstudio.js) — don't reintroduce:
- `response_format: { type: 'json_object' }` → **400**. LM Studio accepts only `json_schema` or `text`.
- qwen3-family models emit `<think>` blocks that destroy latency and corrupt JSON. Thinking must
  be suppressed.

### 🔴 DeepSeek is slow when you asked for the fast path

DeepSeek V4 Flash defaults **thinking ON server-side**. You must explicitly send
`thinking: { type: 'disabled' }` to get the fast path. Passing nothing is not neutral.

### 🔴 Kimi returns 401

`KIMI_API_KEY` is a **Kimi *Code* subscription key** (`sk-kimi-…`). It authenticates only
against `https://api.kimi.com/coding/v1` — **never** `api.moonshot.ai`. Models: `k3`,
`kimi-for-coding`, `kimi-for-coding-highspeed`.

### 🔴 Gemini: "search + JSON" fails

Vertex forbids Google Search grounding together with a JSON response schema. Web-search answers
must go down the **plain-text** path. This is why the assistant has two branches.

### 🔴 "non-JSON content" from a model

Under-escaped LaTeX backslashes. `parseLooseJson` / `restoreLatexEscapes`
([gemini.js:275](lib/gemini.js#L275)) repair it. Also: with thinking OFF, raw newlines/tabs in
strings break parsing.

### 🔴 KaTeX renders broken math

A `<code>` chip inside a `$…$` span splits the TeX. The renderer has `stashTexttNoSplit` to
handle it. Don't "simplify" that.

### 🟡 Microphone dead when embedded in Sentinel

The iframe needs `allow="microphone"` **and** Sentinel's own `Permissions-Policy` header must
delegate to this origin. An empty `microphone=()` blocks delegation even with the `allow`
attribute set. Both sides must agree.

### 🟡 Truncated AI output

`maxOutputTokens` too low — thinking tokens count against output. Symptom is a response that
stops mid-sentence or mid-JSON.

---

## 8. Never do this

| ❌ | Why |
|---|---|
| `gcloud config set project/account` | Two VS Code windows share one global gcloud config. Breaks the other one. |
| Add a route after `app.get('*')` ([server.js:4707](server.js#L4707)) | Unreachable — the SPA catch-all swallows it. |
| Key stats/progress by `slug(fields)` | Moved topics keep their doc id. Guaranteed silent data bug. |
| Branch on the legacy owner outside `statsCol`/`logCol` | That's how the phantom-doc bugs happened. |
| Call a provider SDK from `server.js` | All AI goes through `complete()`/`completeStream()` in `lib/gemini.js`. |
| Hand-port a change to `mastery-engine-local` | Run `npm run port` there. See §9. |
| Commit real secrets | Everything comes from Secret Manager via `--set-secrets`. |
| Deploy without `node --check` | A syntax error crash-loops and silently keeps the old revision live. |
| Edit lines with NUL bytes using `Edit` | It cannot match. Use a Node script. |

---

## 9. Relationship to `mastery-engine-local`

[`../mastery-engine-local`](../mastery-engine-local) runs **this repo's code verbatim** against a
JSON-file shim that stands in for Firestore, so it works offline with local LLMs.

**It is a mirror, not a fork.** Only ~5 files are local-owned (the shim + launcher). Everything
else is copied from here.

> **Never hand-port a change into it.** From that repo run `npm run port`. Hand-porting drifts
> the two apart and silently breaks the mirror.

If you change `server.js`, `lib/*`, or `public/*` here, the local repo needs a re-port to pick it up.

---

## 10. Conventions

- **ES modules** (`"type": "module"`). `import`, not `require`, in app code.
- **2-space indent**, semicolons, single quotes.
- Comments explain **why**, not what. The existing code is unusually well-commented — match that
  density. When you encounter a comment explaining a workaround, do not delete the workaround.
- Frontend is deliberately framework-free. **Do not introduce React/Vue/a bundler.**
- No TypeScript in this repo.
- Firestore writes use `{ merge: true }` unless you specifically intend to replace a document.
- Prefer adding to an existing `lib/` file over creating a new one.
