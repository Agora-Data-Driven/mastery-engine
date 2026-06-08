# AGORA Mastery Engine

A spaced-repetition quiz web app. Formerly a Google Sheet + Apps Script tool
(`Code.gs` / `index.html`), now a real web app:

- **Cloud Run** — single Node/Express service serving the frontend + JSON API
- **Firestore** — replaces the 3 sheet tabs (`topics`, `questions`, `quizLog`)
- **Gemini** — generates new "mastery-level" questions
- **Two modes** — open *Guest* practice, password-gated *Mastery* mode (history,
  priority quizzes, AI generation)

## Live deployment

The app is **live** — deployed and serving with all data imported:

| | |
|---|---|
| **URL** | https://mastery-engine-c732u7m57a-uc.a.run.app |
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

# 1. Enable the APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com `
  firestore.googleapis.com secretmanager.googleapis.com `
  generativelanguage.googleapis.com artifactregistry.googleapis.com

# 2. Create the Firestore database (Native mode), once per project
gcloud firestore databases create --location=$REGION

# 3. Create secrets (rotate the leaked Gemini key first!)
"YOUR_NEW_GEMINI_KEY"        | gcloud secrets create GEMINI_API_KEY  --data-file=-
"A_LONG_RANDOM_STRING"       | gcloud secrets create SESSION_SECRET  --data-file=-
"YOUR_MASTERY_PASSWORD"      | gcloud secrets create APP_PASSWORD    --data-file=-

# Let Cloud Run's runtime service account read them
$PNUM = gcloud projects describe $PROJECT --format="value(projectNumber)"
$SA = "$PNUM-compute@developer.gserviceaccount.com"
foreach ($s in "GEMINI_API_KEY","SESSION_SECRET","APP_PASSWORD") {
  gcloud secrets add-iam-policy-binding $s `
    --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor"
}
# Firestore access for the same SA
gcloud projects add-iam-policy-binding $PROJECT `
  --member="serviceAccount:$SA" --role="roles/datastore.user"

# 4. Deploy from source (buildpacks; no Dockerfile required)
gcloud run deploy mastery-engine `
  --source . --region $REGION --allow-unauthenticated `
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,SESSION_SECRET=SESSION_SECRET:latest,APP_PASSWORD=APP_PASSWORD:latest" `
  --set-env-vars="GEMINI_MODEL=gemini-2.5-flash"

# 5. One-time data import: open the app URL, click "Mastery Mode", sign in,
#    then run the migration (uses your session cookie):
#    POST <URL>/api/admin/migrate    (or use the browser console / curl with cookie)
```

After step 5 the app is live with the full catalog (541 topics), the question
bank and quiz history imported — confirmed live at the URL above.

---

## AI engine: cloud (Gemini) or local (Ollama)

Every AI feature (hints, explanations, question generation, section reviews,
progress analysis, the LaTeX migration) goes through a single dispatcher in
`lib/gemini.js` (`complete()`), which routes to either Gemini or a local
[Ollama](https://ollama.com) instance based on the engine picked in the
**AI engine** dropdown on the landing page. The choice is stored in cookies the
server reads on each request (`aiProvider` / `aiModel`).

- **Cloud (default):** Gemini, as deployed on Cloud Run. Always available.
- **Local (Ollama):** only appears in the dropdown when the server can reach a
  running Ollama. Because Ollama listens on the user's own machine
  (`127.0.0.1:11434`), this works when you **run the app locally**, not from the
  Cloud Run URL.

Run it locally with Ollama using the helper scripts in `scripts/`:

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
`SESSION_SECRET`, `GOOGLE_CLOUD_PROJECT`, `OLLAMA_*`) and starts on
`http://localhost:8080`; pick the local model in the home-page dropdown and sign
into Mastery Mode (password defaults to `local`, change with `-Password`).

`GET /api/models` lists Gemini plus any locally pulled models. Tunables:
`OLLAMA_HOST` (default `http://127.0.0.1:11434`), `OLLAMA_MODEL`,
`OLLAMA_NUM_CTX` (default `8192` - raise the context so long prompts aren't
truncated), and `OLLAMA_KEEP_ALIVE` (default `30m` - keeps the model resident
so there's no cold-start reload between questions). Tutor responses
(hints/explanations/reviews/analysis) stream token-by-token; the app also caches
the question bank and queues quiz results locally, syncing to Firestore when you
reconnect. Note: smaller local models are fine for hints/explanations/reviews,
but JSON-heavy paths (question generation, LaTeX conversion) need a capable
model to match Gemini's reliability.

---

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
