# AGENTS.md — Mastery Engine (cloud)

> **Read this before touching any file.** It is the operating manual for this repo.
> If you follow it, you do not need to explore the codebase to make a correct change.
> Product/feature docs live in [README.md](README.md) and [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md).
> Deep file map: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Unit-level maps + cookbooks:
> [lib/README.md](lib/README.md) · [public/README.md](public/README.md) · [scripts/README.md](scripts/README.md).

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
| **Embedded in** | Sentinel's **Professional** tab + **Philosophical**/**Spiritual** tabs + global **Coach** FAB, via `<iframe>` (`?embed=1`; `?program=<id>` PINS the whole session to one program — URL-derived at boot, threaded onto every API call, never persisted) |
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
This VS Code window is pinned to the `agora` gcloud config — see the root [AGENTS.md](../AGENTS.md).
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
| [server.js](server.js) | 5.6k | **All ~130 HTTP routes.** Express app, auth wiring, SSE helpers. |
| [lib/firestore.js](lib/firestore.js) | 1.9k | **All database IO.** Every read/write goes through here. |
| [lib/gemini.js](lib/gemini.js) | 3.3k | **All AI prompts + provider dispatch.** Misleading name — it fronts every provider. |
| [lib/auth.js](lib/auth.js) | 314 | Cookies, tokens, SSO, admin checks. |
| [lib/priority.js](lib/priority.js) | 71 | The mastery formula. Pure, IO-free, testable. |
| [lib/programs.js](lib/programs.js) | 85 | Program/course scoping rules. Pure, IO-free, testable. |
| [public/app.js](public/app.js) | 6.2k | The entire learner frontend, one IIFE (`const App = (() => {…})()`). |
| [public/academy-admin.js](public/academy-admin.js) | 2.2k | The admin "Composing Room" frontend. |
| [public/index.html](public/index.html) | 835 | Learner shell. All views are `<section>`s toggled by `hidden`. |
| [public/styles.css](public/styles.css) | 2.0k | All styling. **Token-driven**: a `:root` light palette, a `:root[data-theme="dark"]` retune of the same tokens, then a few rules for fills that carry white text (§7). |
| [public/theme.js](public/theme.js) | 100 | Light/dark resolution. Loaded **synchronously in `<head>`** so `data-theme` lands before first paint. |
| [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md) | — | **Injected into the AI assistant's prompt** at runtime (`lib/gemini.js:29`). Editing it changes assistant behaviour. |

### `lib/` — one file per concern

| File | Purpose |
|---|---|
| `firestore.js` | Data layer. Collections in `COL` at [firestore.js:33](lib/firestore.js#L33). |
| `gemini.js` | Prompt builders + `complete()` / `completeStream()` dispatchers. |
| `auth.js` | 4 sign-in paths (see §4). |
| `anthropic.js` `deepseek.js` `kimi.js` `ollama.js` `lmstudio.js` | One provider adapter each. Same shape: `callX()` + `streamX()`. |
| `genjobs.js` | Background question-generation job runner (stepped, resumable). |
| `graph.js` | Knowledge-map prerequisite edges + warm-up/readiness logic. |
| `programs.js` `priority.js` | Pure logic, IO-free. |
| `usage.js` | Token/cost tallying per user. |
| `googleauth.js` | Google OAuth flow. |
| `sentinel.js` | Sentinel bridge: people list, user lookup, the holistic digest, mentor search, and `growthDetail` (growth-journal bodies — see §7). |
| `bigquery.js` `csv.js` `migrate.js` | Import/analytics side-paths. |
| `watcher.js` | Atrium's Watcher archive. **Asymmetric on purpose** — reads are bucket reads; `addSource`/`fetchBodies` write through Atrium's HMAC bridge (§7). |
| `_*_test.js` | The **four** Node unit tests (auth, graph, programs, progress credit) — see §6. |

### Finding a route fast

Routes are declared in source order in `server.js`. To find one:

```powershell
Select-String -Path server.js -Pattern "app\.(get|post|put|delete)\('/api/quiz" -AllMatches
```

Rough zones in `server.js`:

| Lines | Zone |
|---|---|
| 167–430 | Middleware, CSP (`:198`), helpers (`shuffle`, `mapWithConcurrency`, `aiChoice` `:310`, `difficultyChoice` `:333`, `streamText` `:361`, `sseInit` `:389`, `rateLimitAI` `:419`) |
| 430–577 | `bigJson`, the `/api` gate (`:555` — Sentinel user-lookup + per-user AI policy) |
| 578–660 | Auth routes |
| 660–1010 | Catalog, models, question bank, stats, streak, usage (+ shelf resolver `inEngine` `:739`) |
| 1021–1260 | Quiz guest/select/multi/priority/log (+ mastery flashcard deck `:1168`) |
| 1264–1445 | Question generation, transcripts, drills |
| 1451–2270 | Flashcards (incl. Speaker Mode `explain` `:1835`, card chat, admin card repair) |
| 2281–2725 | Study assistant (scope chat, conversations, blocking + SSE streaming `:2578`) |
| 2730–2970 | Review / Lesson study guides, progress analysis |
| 2979–3340 | Knowledge graph, readiness, warm-ups, learn-next, topic sequencing |
| 3343–3550 | Hint/explain + admin data repair (latexify, fix-formats, merge-math) |
| 3556–3995 | Programs, enrollment, video lessons, internal SSO endpoints (`verifyInternalSig` `:3619`), team + AI access, topic CRUD |
| 4001–4345 | **Curriculum edit engine** (`runCurriculumEdits` `:4001`) + AI curriculum editing |
| 4349–4800 | Transcripts admin, Watcher import (3 read GETs) + **Watcher add/fetch** (2 POSTs, §7), ingest plan/commit |
| 4772–5100 | Goal planning, bulk lessons, genjobs |
| 5105–5525 | Roadmaps + learner shelf (`/api/me/*`) |
| 5527–5615 | Flags, question edits, migrations, BigQuery sync |
| 5616–5638 | Academy-admin gate, static serving, SPA catch-all (`:5627`), error handler (`:5632`) |

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
fixed twice. Use `buildTopicIdIndex()` ([firestore.js:1814](lib/firestore.js#L1814)) to map
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
(which tracks are on their Mastery Engine, plus `hidden[]` / `included[]`), `usage`, and
`ai` (the AI-provider allowlist the Team tab edits — **absent doc = Kimi only** for
non-admins; admins are never policed).

> **Growth-category programs are open to EVERY learner, enrollment or not** (2026-08-05).
> Sentinel's Philosophical/Spiritual tabs pin `?program=` for the whole staff, so
> `resolveProgramScope` honours a growth program's pin for any signed-in user (whole-program
> scope, no course filter), and `/api/internal/enrollment-progress` emits growth cards for
> everyone. Enrollment still gates **career** programs exactly as before.

Chats (`cardChats` / `scopeChats` / `assistantChats` subcollections) are keyed by
**`conversationUser(req)`**, not `effectiveUser(req)`: an admin's threads are their OWN,
never the legacy owner's, and act-as is **not** honoured for chats (changed 2026-07-25) —
threads are private even from admins. Progress/stats stay on `effectiveUser`.

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

Guards: `requireAuth` and `requireAdmin` ([auth.js](lib/auth.js)). **Admin = the person's SENTINEL
role** (`super_admin`/`admin` there → admin here; interns/employees are learners) — fed to the sync
`isAdmin()` via `setSentinelRoleResolver` over the /api gate's cached lookup. `MASTERY_SUPER_ADMIN`
(`info@agoradatadriven.com`) + `MASTERY_ADMINS` (default: just the super admin) are the
**break-glass override only** — they keep working when Sentinel is down; a Sentinel outage can
briefly demote role-admins but never mint one. A portal `ag_sso clients:["*"]` grant no longer
confers admin by itself, and only identities backed by a real per-person credential (ag_sso /
Google cookie) can be admin: the shared `APP_PASSWORD` session never is (changed 2026-07-25).
`act-as` lets an admin impersonate a learner for debugging, and its target must be an active
Sentinel person (super admin exempt). Identity resolvers, pick deliberately:

| Resolver | Use for | Admin default |
|---|---|---|
| `effectiveUser(req)` | progress, stats, quiz log | LISTED admins → `DEFAULT_ACCOUNT`; ag_sso `"*"` holders → own email |
| `conversationUser(req)` | chats, card overlays/labels | always the real signer — act-as **not** honoured (private even from admins) |
| `currentEmail(req)` | the real signer (gate, rate limit) | — |

**The Academy Admin page is gated at the server** (added 2026-07-27): `/academy-admin.html` and
`/academy-admin.js` are claimed by an explicit route ahead of `express.static` — non-admins
(and the signed-out) get a 302 to `/` (`?embed=1` preserved) and never receive the admin shell;
the in-page "Admins only" card is just chrome. The route awaits `sentinelInfo()` first because a
bare page navigation hasn't warmed the role cache behind the sync `isAdmin()`.

**Sentinel is the source of truth for accounts** (added 2026-07-25): the `/api` middleware calls
Sentinel's HMAC `user-lookup` (5-min cache) and 403s any signed-in email that isn't an ACTIVE
Sentinel user. `/api/auth/*` is exempt; the super admin is break-glass; a FAILED lookup (Sentinel
down, or no `SSO_SECRET` locally) fails open. The Google callback also refuses non-Sentinel
accounts (`/?login=noaccount`).

**Per-user AI allowlist** (added 2026-07-25): the same middleware resolves `req.aiPolicy`
(admins → `null` = unrestricted; others → `users/{email}/meta/ai`, default `['kimi']`; guests →
Kimi) and stores it on the usage ALS store. The HARD gate is `clampToPolicy()` inside
`complete()`/`completeStream()` in [lib/gemini.js](lib/gemini.js) — every AI path funnels
through it. `/api/models` is filtered per caller; the Team tab (Academy Admin station 06)
edits grants via `GET/POST /api/admin/ai-access`; `GET /api/admin/team` is the per-person
dashboard (progress/accuracy/attempts/explains/spend).

### Calling an admin endpoint with curl

```powershell
# Mint an ag_sso cookie locally. Format (lib/auth.js verifyAgSso): base64url({sub,exp}).base64url(HMAC)
# — NOT the old "email|ts|sig" shape. exp is unix SECONDS. Secret = platform-sso-key.
$env:SSO_SECRET = (gcloud secrets versions access latest --secret platform-sso-key --project agora-data-driven)
$cookie = node -e "const {createHmac}=require('crypto');const p=Buffer.from(JSON.stringify({sub:'info@agoradatadriven.com',exp:Math.floor(Date.now()/1000)+900})).toString('base64url');console.log(p+'.'+createHmac('sha256',process.env.SSO_SECRET).update(p,'ascii').digest('base64url'))"
# POSTs through Google's frontend need a body (411 Length Required otherwise):
curl.exe -s -X POST "$URL/api/admin/sequence-topics" -H "Cookie: ag_sso=$cookie" -H "Content-Type: application/json" -d "{}"
```

---

## 5. Recipes

### Add an API endpoint

1. Put it in `server.js` **next to its siblings** (see the zone table in §2) — not at the bottom.
2. Pick guards: `requireAuth`, `requireAdmin`, `rateLimitAI` (for anything that calls a model),
   `bigJson` (for payloads > 1 MB, e.g. transcripts).
3. Always `next(e)` on error so the handler at [server.js:5632](server.js#L5632) formats it.

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

> **`app.get('*')` at [server.js:5627](server.js#L5627) is the SPA catch-all.** Any route
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
| Plain text | `streamText(res, onToken => …)` [server.js:361](server.js#L361) | Learner-facing prose (hints, explanations, guides) |
| Typed events | `sseInit(res)` + `sseSend(res, event, data)` [server.js:389](server.js#L389) | Admin planners — streams `thinking` / `content` / `result` / `done` |

Both set `X-Accel-Buffering: no`. **Without it Cloud Run buffers the whole response** and
streaming silently degrades to one big blob at the end.

> **SSE "network error" in the browser almost always means a 500 *before* the stream opened.**
> Build expensive context *after* `sseInit()`, behind a heartbeat.

### Add a frontend view

`public/index.html` holds every view as a `<section id="xView" class="hidden">` (e.g.
`quizView`, `statsView`, `graphView`). `app.js` toggles them with `show(id)` / `hide(id)`.
There is no router and no build step.

Add the section to the HTML, then wire it in `app.js` near the other view handlers. Reload the
browser — that's the full loop.

### Change the curriculum (move/rename/merge topics)

Use the ops engine, not raw Firestore writes: `runCurriculumEdits()`
([server.js:4001](server.js#L4001)) → `moveTopics()`. It preserves doc ids, and therefore
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

# 2. The four real unit tests (pure logic, no cloud needed — all print "PASS")
node lib\_auth_test.js
node lib\_graph_test.js              # warm-up / readiness graph logic
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
| [public/app.js](public/app.js) | 559 | `` lo(le, `${r.course}<NUL>${r.lesson}`, r.order); `` |
| [server.js](server.js) | 3307 | `` const key = `${r.track}<NUL>${r.course}<NUL>${r.lesson}`; `` |
| [lib/firestore.js](lib/firestore.js) | 1788, 1790 | `tupleKey()` — joins with `<NUL>` (the comment above it contains one too) |

**Fix:** don't edit those lines with `Edit`. Use a Node script with explicit ` `:

```js
const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
s = s.replace('${r.track} ${r.course}', '…');
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

### 🔴 Bulk generation dies with "Failed to fetch" while the server logged 200

**Cause:** one `POST /api/admin/genjobs/:id/step` is a single thinking-model call, measured at
**78–313s per topic**. Held as a plain POST the socket sends **no bytes** for those minutes, and
a silent connection that long gets dropped in front of us — the `ghs.googlehosted.com`
domain-mapping frontend, an office proxy, NAT. The step still **succeeds** (200 in the request
log, questions banked); only the response is lost, so the browser reports a network-level
`TypeError: Failed to fetch` and the run strands at `queued`/`running`. Observed cleanly:
every step ≤115s came back, every step ≥148s did not. The service timeout (3600s) is a red
herring, and there is no OOM or 5xx to find.

**Fix (2026-08-03):** `/step` now content-negotiates. Send `Accept: text/event-stream` and it
opens the stream immediately and heartbeats (`: ping`) every 15s until the model returns, then
emits one `result` event — the same shape the admin planners use, for the same reason. Without
that header it still answers plain JSON, which is what `scripts/` drives it with.

> **Never "retry" a dropped step by re-POSTing `/step`.** The first one is almost certainly
> still running: both would `queue.shift()` the same topic, so that topic gets generated twice
> and the next one is skipped. `waitOutStep()` in `public/academy-admin.js` polls
> `GET /api/admin/genjobs/:id` until the in-flight step lands instead.

### 🔴 Kimi returns 401

`KIMI_API_KEY` is a **Kimi *Code* subscription key** (`sk-kimi-…`). It authenticates only
against `https://api.kimi.com/coding/v1` — **never** `api.moonshot.ai`. Models: `k3`,
`kimi-for-coding`, `kimi-for-coding-highspeed`.

### 🔴 Gemini: "search + JSON" fails

Vertex forbids Google Search grounding together with a JSON response schema. Web-search answers
must go down the **plain-text** path. This is why the assistant has two branches.

### 🔴 "non-JSON content" from a model

Under-escaped LaTeX backslashes. `parseLooseJson` ([gemini.js:242](lib/gemini.js#L242)) /
`restoreLatexEscapes` ([gemini.js:314](lib/gemini.js#L314)) repair it. Also: with thinking OFF,
raw newlines/tabs in strings break parsing.

### 🔴 KaTeX renders broken math

A `<code>` chip inside a `$…$` span splits the TeX. The renderer has `stashTexttNoSplit` to
handle it. Don't "simplify" that.

### 🔴 The assistant's growth-journal index is complete; only the BODIES are lazy

The learner's Sentinel growth journal reaches the assistant as **small-to-big retrieval**: the
holistic digest carries every entry's TITLE (uncapped, every turn), and `growthGroundingFor`
([server.js](server.js)) fetches the full `detail` bodies for the entries this turn bears on via
`growthDetail` → Sentinel's `/api/internal/growth-detail`. `growthNotesBlock`
([lib/gemini.js](lib/gemini.js)) renders both halves.

Three invariants, and each one is load-bearing — breaking any of them makes the assistant deny
things the learner can see on their own screen:

1. **Everything ships while it fits.** Under `GROWTH_HYDRATE_BUDGET_CHARS` the whole journal is
   hydrated and scoring is skipped entirely. Retrieval only switches on once the corpus genuinely
   outgrows the prompt — small and complete beats large and sampled.
2. **A body is whole or absent.** Sizes come from the index's `chars`, so budgeting happens
   *before* fetching and no body is ever cut to fit. A truncated note reads exactly like a complete
   one and gets summarised as though it were the whole thing.
3. **Gaps are declared.** Anything not loaded is named in the prompt, so a retrieval miss becomes
   "you have a note called X I haven't opened" instead of "you have no note about X".

Keep `GROWTH_MAX_IDS` in sync with Sentinel's `MAX_GROWTH_DETAIL_IDS` — ask for more than it accepts
and it drops the tail silently, which renders unloaded entries as loaded. See sentinel's AGENTS.md
for the Sentinel half and the incident that produced all of this.

### 🟡 A new colour looks wrong in dark mode

Added 2026-08-03. There is one palette and it lives in `public/styles.css`: `:root` (light) and
`:root[data-theme="dark"]` retuning **the same token names**. Put a new colour there, not in a
`[data-theme="dark"] .something` rule — the ~180 literals that used to be scattered through the
file are exactly what made a dark theme a day of work instead of an hour.

Two things that are NOT arbitrary:

- **`--x-deep` tokens exist because a fill that carries white text cannot lighten.** `--green-dark`
  and `--violet` are overwhelmingly *text* colours, so in dark mode they have to go light to stay
  readable on the canvas — which would leave `.btn-primary`'s white label on a pale green slab.
  The handful of rules after the token block re-fill those with `--green-deep` / `--violet-deep`.
- **A `<canvas>` cannot resolve CSS custom properties.** The knowledge graph therefore keeps its
  own two-entry `GRAPH_INK` map in `app.js`, read per draw off the live `data-theme` attribute
  (an attribute lookup, not a style recalc) so flipping the theme repaints without a reload.

**Where the theme comes from** ([public/theme.js](public/theme.js), precedence order): `?theme=`
on this document's URL → the learner's own toggle (`localStorage`) → the OS preference. Sentinel
appends `&theme=` to every iframe src it builds and postMessages `{type:'agora-theme'}` when its
own toggle moves, so the embedded engine wears the host's skin and changes with it. Unlike
`?program=` / `?embed=assistant`, the theme IS safe in `sessionStorage`: every frame on a Sentinel
page is handed the same value, so there is no per-frame value to leak across same-origin iframes.

**The Composing Room is deliberately light-only.** `academy-admin.html` carries its own design
system (`--pine`/`--paper`/`--surface`, inline) and does not load `theme.js`; loading it there
would half-darken the page. Theming it is a separate piece of work.

### 🟡 "Add to Watcher" fails locally but reading the archive works

The two halves of [lib/watcher.js](lib/watcher.js) use **different transports, deliberately**.
Reading is a direct GCS read of Atrium's archive objects (needs `storage.objectViewer`). **Adding a
source is never a bucket write** — scraping YouTube/a blog, minting the registry entry, AI-labelling
the industry and the audit trail all belong to Atrium, so `addSource`/`fetchBodies` POST to its
HMAC-gated `POST /api/internal/watcher/add` (purpose `watcher-add`, shared `SSO_SECRET`, `ATRIUM_URL`
defaults to `https://portal.agoradatadriven.com`). So: **no `SSO_SECRET` ⇒ adding fails while
browsing still works**, which is exactly the local-dev picture. Same posture as `lib/sentinel.js`.

Unlike the read helpers, these **throw** — the admin explicitly asked for the action, so a silent
degrade would leave them looking at a source that was never created. Server routes
`POST /api/admin/watcher/{add,fetch}` return Atrium's own sentence as a 400.
`add`/`add_site` register the listing ONLY; the browser then loops `/fetch` until `remaining` is 0
(one batch per call, exactly like Atrium's tab) — `blocked: true` means YouTube rate-limited Atrium
and **nothing was marked failed**, so a later run resumes over the same missing set.

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
| Add a route after `app.get('*')` ([server.js:5627](server.js#L5627)) | Unreachable — the SPA catch-all swallows it. |
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
