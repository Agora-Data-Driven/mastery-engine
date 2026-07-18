# AGORA Mastery Engine

> **How it works, the exact formulas, and the learning-science research behind it:**
> [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md). That doc is also injected into the in-app Study
> Assistant, so you can just ask it "what's your mastery formula?" or "what research is this based
> on?" and get an accurate answer.

A spaced-repetition quiz web app. Formerly a Google Sheet + Apps Script tool
(`Code.gs` / `index.html`), now a real web app:

- **Cloud Run** — single Node/Express service serving the frontend + JSON API
- **Firestore** — replaces the 3 sheet tabs (`topics`, `questions`, `quizLog`)
- **Gemini** — generates new "mastery-level" questions
- **Two modes** — open *Guest* practice, and *Mastery* mode (history, priority
  quizzes, AI generation)
- **Per-user accounts** — sign in with **Google** (or the shared portal `ag_sso` cookie once this
  app is on a `*.agoradatadriven.com` domain; the legacy password still works). Each user's mastery
  stats + attempt log are their own: the **legacy owner `ianfernandezctm@gmail.com`** maps to the
  original `topics`/`quizLog` collections (so all pre-existing progress is his, no migration), while
  every other user gets `users/{email}/…` subcollections. `info@agoradatadriven.com` is super admin
  and can **act as any user**; admins default to the legacy owner's account. The question bank +
  catalog stay shared. Data-layer detail: [lib/firestore.js](lib/firestore.js); auth resolution +
  test: [lib/auth.js](lib/auth.js) / `node lib/_auth_test.js`.

## Live deployment

The app is **live** — deployed and serving with all data imported:

| | |
|---|---|
| **URL** | https://mastery-engine-585951669065.us-central1.run.app (legacy alias: https://mastery-engine-c732u7m57a-uc.a.run.app) |
| **GCP project** | `agora-data-driven` (info@agoradatadriven.com) |
| **Service / region** | Cloud Run `mastery-engine` · `us-central1` |
| **Firestore** | `(default)`, Native mode, `us-central1` — `topics`, `questions`, `quizLog` |

The CSVs in `data/` are the original sheet export and were imported **once** via
the migration. They are now a frozen snapshot — the live source of truth is
Firestore, which the app reads and writes on every quiz. Editing the CSVs has no
effect on the live app unless the migration is re-run.

**Browse / edit live data:** GCP Console → Firestore → Data (project
`agora-data-driven`), or the app's `/api/catalog` endpoint.

```
server.js          Express app: static frontend + API
lib/firestore.js   Firestore data layer
lib/priority.js    mastery / spaced-repetition scoring (reconstructed)
lib/gemini.js      question generation
lib/migrate.js     one-time CSV -> Firestore importer
lib/bigquery.js    streams logged attempts to BigQuery (analytics sink)
lib/auth.js        password gate (signed cookie)
lib/csv.js         dependency-free CSV parser
public/            frontend (AGORA "Data Driven" aesthetic)
data/*.csv         exported sheet tabs (imported once by the migration)
```

> The old `Code.gs` and root `index.html` are kept for reference and excluded
> from deploy via `.gcloudignore`.

---

## Deploy runbook

> The initial deploy is **already done** (project `agora-data-driven`). This
> runbook is retained for re-deploys and disaster recovery. A code change only
> needs step 4 (`gcloud run deploy ... --source .`); steps 1–3 and 5 were
> one-time setup.

Prereqs: `gcloud` authenticated as **info@agoradatadriven.com**, with a project
selected. No local Node/Docker needed — Cloud Build compiles in the cloud.

```powershell
# 0. Variables
$PROJECT = "agora-data-driven"
$REGION  = "us-central1"
gcloud config set project $PROJECT

# 1. Enable the APIs (Gemini goes through Vertex AI = aiplatform.googleapis.com,
#    billed to this project; the old AI Studio generativelanguage API is gone)
gcloud services enable run.googleapis.com cloudbuild.googleapis.com `
  firestore.googleapis.com secretmanager.googleapis.com `
  aiplatform.googleapis.com artifactregistry.googleapis.com

# 2. Create the Firestore database (Native mode), once per project
gcloud firestore databases create --location=$REGION

# 3. Create secrets (no Gemini key needed anymore — Vertex uses the SA's ADC)
"A_LONG_RANDOM_STRING"       | gcloud secrets create SESSION_SECRET  --data-file=-
"YOUR_MASTERY_PASSWORD"      | gcloud secrets create APP_PASSWORD    --data-file=-

# Let Cloud Run's runtime service account read them
$PNUM = gcloud projects describe $PROJECT --format="value(projectNumber)"
$SA = "$PNUM-compute@developer.gserviceaccount.com"
foreach ($s in "SESSION_SECRET","APP_PASSWORD") {
  gcloud secrets add-iam-policy-binding $s `
    --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor"
}
# Firestore access for the same SA
gcloud projects add-iam-policy-binding $PROJECT `
  --member="serviceAccount:$SA" --role="roles/datastore.user"
# Vertex AI (Gemini) access for the same SA — this is what bills to GCP
gcloud projects add-iam-policy-binding $PROJECT `
  --member="serviceAccount:$SA" --role="roles/aiplatform.user"

# 4. Deploy from source (buildpacks; no Dockerfile required)
#    SSO_SECRET (platform-sso-key) lets the app trust the portal's shared login cookie once this
#    service is on a *.agoradatadriven.com custom domain (central auth). Google sign-in is OPT-IN:
#    add the two GOOGLE_OAUTH_* secrets (same OAuth client as the portal, with this app's
#    /api/auth/google/callback added to its redirect URIs) to turn the "Sign in with Google" button
#    on. MASTERY_BASE_URL builds the Google redirect URI; the account/admin env vars have safe
#    defaults baked in (ianfernandezctm@gmail.com owns the pre-existing progress; info@ is super admin).
gcloud run deploy mastery-engine `
  --source . --region $REGION --allow-unauthenticated `
  --set-secrets="SESSION_SECRET=SESSION_SECRET:latest,APP_PASSWORD=APP_PASSWORD:latest,SSO_SECRET=platform-sso-key:latest" `
  --set-env-vars="GEMINI_MODEL=gemini-2.5-flash,GEMINI_LOCATION=global,MASTERY_BASE_URL=https://mastery-engine-585951669065.us-central1.run.app,MASTERY_DEFAULT_ACCOUNT=ianfernandezctm@gmail.com,MASTERY_SUPER_ADMIN=info@agoradatadriven.com"
# ⚠️ MASTERY_BASE_URL must stay the NEW-STYLE run.app URL above: it builds the Google OAuth
# redirect URI, and that exact URI is what's registered on the shared portal OAuth client.
# (The legacy c732u7m57a alias entry in the console has a typo and is rejected by Google.)
# To enable Google sign-in later, after creating the two secrets, add to --set-secrets:
#   ,GOOGLE_OAUTH_CLIENT_ID=google-oauth-client-id:latest,GOOGLE_OAUTH_CLIENT_SECRET=google-oauth-client-secret:latest

# DeepSeek (optional AI engine, selectable from the "AI model" dropdown). Create the secret
# from a file so the key never lands in shell history, grant the SA access, then redeploy
# with the secret added. Once present, "DeepSeek · Chat/Reasoner" appear in the model picker.
#   gcloud secrets create DEEPSEEK_API_KEY --data-file="C:\path\to\deepseek-key.txt"; Remove-Item "C:\path\to\deepseek-key.txt"
#   gcloud secrets add-iam-policy-binding DEEPSEEK_API_KEY --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor"
#   then add to --set-secrets:  ,DEEPSEEK_API_KEY=DEEPSEEK_API_KEY:latest
# (optional env: DEEPSEEK_MODEL default deepseek-v4-flash, DEEPSEEK_BASE_URL default https://api.deepseek.com)

# Kimi (optional AI engine, selectable from the "AI model" dropdown). Same secret
# drill: create it from a file, grant the SA access, redeploy with the secret added.
# Once present, "Kimi · K2.6/K3" appear in the model picker.
#   gcloud secrets create KIMI_API_KEY --data-file="C:\path\to\kimi-key.txt"; Remove-Item "C:\path\to\kimi-key.txt"
#   gcloud secrets add-iam-policy-binding KIMI_API_KEY --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor"
#   then add to --set-secrets:  ,KIMI_API_KEY=KIMI_API_KEY:latest
# (optional env: KIMI_MODEL default kimi-k2.6, KIMI_BASE_URL default https://api.moonshot.ai/v1)

# 5. One-time data import: open the app URL, click "Mastery Mode", sign in,
#    then run the migration (uses your session cookie):
#    POST <URL>/api/admin/migrate    (or use the browser console / curl with cookie)
```

After step 5 the app is live with the full catalog (541 topics), the question
bank and quiz history imported — confirmed live at the URL above.

---

## AI engine: cloud (Gemini / DeepSeek / Kimi) or local (Ollama / LM Studio)

Every AI feature (flashcards, hints, explanations, question generation, section
reviews, progress analysis, the LaTeX migration) goes through a single
dispatcher in `lib/gemini.js` (`complete()` / `completeStream()`), which routes
to Gemini, DeepSeek, Kimi, a local [Ollama](https://ollama.com) instance, or a
local [LM Studio](https://lmstudio.ai) server based on the engine picked in the
**AI model** dropdown (top of the Mastery setup card). The choice is stored in
cookies the server reads on each request (`aiProvider` / `aiModel`), so it
governs flashcards, explanations, and question generation alike.

- **Cloud — Gemini (default):** always available, served through **Vertex AI**
  and billed to this GCP project (no API key — auth is the deploy/runtime
  service account's ADC). Two variants in the picker: **2.5 Flash** (fast, the
  default) and **2.5 Pro** (best quality — worth it for flashcard decks). The
  `model` in the choice selects the variant.
- **Cloud — DeepSeek:** appears when `DEEPSEEK_API_KEY` is set (see deploy
  runbook). Offers **Chat (V3)** and **Reasoner (R1)** via DeepSeek's
  OpenAI-compatible API (`lib/deepseek.js`).
- **Cloud — Kimi:** appears when `KIMI_API_KEY` is set (see deploy runbook).
  Offers **K2.6** (fast, the default) and **K3** (flagship quality) via
  Moonshot AI's OpenAI-compatible API (`lib/kimi.js`).
- **Local (Ollama):** only appears when the server can reach a running Ollama
  (`127.0.0.1:11434`).
- **Local (LM Studio):** only appears when the server can reach LM Studio's
  OpenAI-compatible server (`127.0.0.1:1234`) with at least one model loaded.

Because the local engines listen on the user's own machine, they only work when
you **run the app locally**, not from the Cloud Run URL. Gemini and DeepSeek are
hosted, so they work from the deployed app.

### Run it locally with Ollama

```powershell
# First time on a machine: installs Node + Ollama + gcloud, logs into Google
# Cloud, pulls a starter model if you have none, and runs npm install.
.\scripts\setup.ps1

# Every time: starts Ollama if needed and launches the app on :8080.
.\scripts\start-ollama.ps1
.\scripts\start-ollama.ps1 -Model "qwen3.5:9b"   # pick a specific local model

# If PowerShell blocks scripts:
powershell -ExecutionPolicy Bypass -File .\scripts\start-ollama.ps1
```

`start-ollama.ps1` sets the env the server needs (`APP_PASSWORD`, a generated
`SESSION_SECRET`, `GOOGLE_CLOUD_PROJECT`, `OLLAMA_*`).

### Run it locally with LM Studio

1. Install [LM Studio](https://lmstudio.ai) and, in its UI, **download a model**
   (e.g. *Qwen2.5 7B Instruct*).
2. Start its server: open the **Developer** (server) tab and click **Start
   Server** (port `1234`), or run `lms bootstrap` once to enable the CLI and let
   the script start it for you.
3. Launch the app pointed at LM Studio:

```powershell
.\scripts\start-lmstudio.ps1
.\scripts\start-lmstudio.ps1 -Model "qwen2.5-7b-instruct"   # JIT-load a specific model (needs the lms CLI)

# If PowerShell blocks scripts:
powershell -ExecutionPolicy Bypass -File .\scripts\start-lmstudio.ps1
```

`start-lmstudio.ps1` sets the env the server needs (`APP_PASSWORD`, a generated
`SESSION_SECRET`, `GOOGLE_CLOUD_PROJECT`, `LMSTUDIO_*`). Tunables:
`LMSTUDIO_HOST` (default `http://127.0.0.1:1234`), `LMSTUDIO_MODEL` (leave unset
to use whatever model LM Studio has loaded), and `LMSTUDIO_MAX_TOKENS` (default
`-1` = generate until the context is full, so long outputs aren't cut off).

### Common notes

Both scripts start on `http://localhost:8080`; pick the local model in the
home-page dropdown and sign into Mastery Mode (password defaults to `local`,
change with `-Password`).

`GET /api/models` lists Gemini plus any locally available models. Ollama
tunables: `OLLAMA_HOST` (default `http://127.0.0.1:11434`), `OLLAMA_MODEL`,
`OLLAMA_NUM_CTX` (default `8192` - raise the context so long prompts aren't
truncated), and `OLLAMA_KEEP_ALIVE` (default `30m` - keeps the model resident
so there's no cold-start reload between questions). Tutor responses
(hints/explanations/reviews/analysis) stream token-by-token; the app also caches
the question bank and queues quiz results locally, syncing to Firestore when you
reconnect. Note: smaller local models are fine for hints/explanations/reviews,
but JSON-heavy paths (question generation, LaTeX conversion) need a capable
model to match Gemini's reliability.

---

## Flashcards (Course & Lesson level)

AI-written study decks that sit **above** the quiz: mastering a deck should mean
you can answer any quiz question in that section. Reach them from **My Progress →**
expand a section **→ Cards** (the button shows on **Course** and **Lesson** rows;
there are none per sub-lesson). Each card has two labelled parts — **Intuition**
(plain-language, visual) and **Formula** (the rule to memorise) — and flips on
click.

- **Visual explainers.** A card may carry a declarative plot spec that the app
  draws with a small, dependency-free SVG plotter (`renderVisual` /`compileExpr`
  in `public/app.js`): tangent lines (derivatives), shaded areas (integrals),
  secants, points and asymptote lines. The model never emits SVG — it describes
  the plot, and a hand-rolled expression parser (no `eval`) evaluates the
  functions, so a bad/hostile `fn` simply renders nothing.
- **Highway mode.** A toggle that filters the deck to the smallest high-impact
  set (foundational + cross-lesson concepts) for a rapid review.
- **Labels.** Each card can be marked **Mastered / Still learning / Important**;
  these are per-user (`users/{email}/flashcardStatus/{cardId}`) and private.
- **Quiz me on this.** Generates one real MCQ for the card's topic, banks it
  (`source: 'flashcard'`), and runs it as a normal 1-question quiz — so it is
  logged, updates that topic's mastery, counts to the streak, and mirrors to
  BigQuery exactly like any other question.

Decks are generated on first open and cached in the shared `flashcards`
collection (regenerate from the toolbar). **Enabled for every course/lesson** —
decks are still only built on demand (when a user clicks "Generate"), so nothing
is pre-generated. To scope the feature back to specific courses, make
`flashcardsEnabledFor` in `server.js` a regex test (mirrored by `flashcardsEnabled`
in `public/app.js`), e.g. `/\bcalculus\b/i`. Endpoints:
`GET /api/flashcards`, `POST /api/flashcards/{generate,status,quiz}`
(`server.js`); generators `generateFlashcards` / `generateFlashcardQuestion`
(`lib/gemini.js`); data layer in `lib/firestore.js`.

## Knowledge Map ("Visualize my progress")

My Progress > **Visualize my progress** opens a full knowledge graph of the
catalog: every **topic** is a node (topics are the stable unit all quiz history
and priority scores key on), clustered by track. Node fill = your mastery
(hollow = never attempted, red/amber/green = accuracy); click a node and the
whole chain it builds on / unlocks lights up (Limits -> Derivatives -> Gradient
Descent -> Neural Networks), with a side panel showing its stats, its
flashcards (with your labels), and Quiz / Flashcards actions.

Two edge kinds (`lib/graph.js`):
- **flow** — the curriculum spine (topic -> next topic -> next lesson -> next
  course per `COURSE_ORDER`), derived from the catalog on every request, so it
  can never go stale.
- **prereq** — AI-mapped "you need X to understand Y" links, often cross-course
  and cross-track (`generateTopicLinks` in `lib/gemini.js`), persisted once per
  topic in the shared `graphLinks` collection keyed by the stable topic doc id.

The map is **self-healing**: `GET /api/graph` links a capped batch of any
unmapped topics in the background on every open, so new topics get absorbed
automatically; admins also get a **Build all links now** button
(`POST /api/admin/build-graph`, resumable, `?refresh=1` to re-link everything).

The same graph feeds the learning algorithm:
- `computeInsights()` derives **Ready to start** (untouched topics whose every
  prerequisite is strong) and **Weak links** (weak/untouched topics blocking the
  most downstream material) — shown in the map's side panel and injected into
  the AI progress analysis (`/api/analyze`).
- `prereqContext()` gives question generation (`/api/generate`,
  `/api/flashcards/quiz`) your standing on a topic's prerequisites, so prompts
  steer questions to exercise weak prerequisites as sub-steps.

Frontend is a dependency-free canvas force layout in `public/app.js` (springs
on edges, grid-bucketed repulsion, per-track anchor gravity); positions are
cached in localStorage so reopening is instant.

## Progress & analytics

Two layers, by depth of analysis:

### 1. In-app "My Progress" (Mastery Mode)
A read-only dashboard served by the app itself — no extra infrastructure. Sign
into Mastery Mode and click **📊 View my progress** on the landing card. It shows:

- **Overview tiles** — overall accuracy, topic coverage, untouched topics, total attempts
- **Focus areas** — your weakest topics ranked by mastery *priority* (low accuracy /
  stale / low confidence), with a one-click **🔥 Drill these now** priority quiz
- **Accuracy by course** — weakest course first
- **Last 14 days** — questions answered + daily accuracy

Backed by `GET /api/stats` (auth), which aggregates the `topics` catalog in-memory
plus a 14-day `quizLog` rollup (`getRecentActivity`). No Firestore composite index
is required.

### 2. BigQuery (deep / ad-hoc analysis)  ·  **live**
Every logged attempt is **automatically streamed** to BigQuery for SQL and
dashboards — Firestore stays the operational store; BQ is the analytics sink.

Dataset `agora-data-driven.mastery_analytics` holds two tables:

| Table | Grain | Source / update |
|---|---|---|
| `quiz_log` | one row per attempt (day-partitioned on `date`) | `POST /api/quiz/log` appends each attempt via `streamAttempts()` |
| `topics` | one row per topic — **current mastery snapshot** | full WRITE_TRUNCATE replace via `replaceTopics()`; refreshed after every quiz and via `POST /api/admin/bq-sync-topics` |

`topics` is the live, self-updating form of `data/Skill Mastery.csv` — use it to
see each topic's **mastery score and what to work on next**. Columns: `accuracy`
(% mastered), `priority` (0–100 work-on urgency: low accuracy / stale / few tries),
`totalAttempts`, `correctCount`, `daysSince`, `lastAttempted`, plus the
track/course/lesson hierarchy.

All writes are best-effort — a BigQuery outage never fails a quiz. The Cloud Run
runtime SA has `bigquery.dataEditor` + `bigquery.jobUser`.

**Backfill / sync (one-time-ish):**
- `POST /api/admin/bq-backfill` — load historical `quizLog` into `quiz_log` (re-running **duplicates** rows; call once)
- `POST /api/admin/bq-sync-topics` — refresh the `topics` snapshot (idempotent full replace; safe to re-run)

Example — what should I work on? (weakest practised topics):
```sql
SELECT topic, course, accuracy AS mastery_pct, totalAttempts AS tries, priority
FROM `mastery_analytics.topics`
WHERE totalAttempts > 0
ORDER BY priority DESC
LIMIT 20;
```
Example — accuracy by course over time, from the attempt log:
```sql
SELECT course, COUNT(*) attempts, ROUND(100*AVG(result),1) accuracy_pct
FROM `mastery_analytics.quiz_log`
GROUP BY course HAVING attempts >= 5
ORDER BY accuracy_pct ASC;
```

**Build a dashboard (Looker Studio):** Looker Studio → Create → Data source →
BigQuery → project `agora-data-driven` → `mastery_analytics` → connect
`topics` (for a sortable mastery-by-topic table / "what to work on") and/or
`quiz_log` (for a time-series of `AVG(result)` by `date`). (This step is
interactive in the console; the data is ready.)
