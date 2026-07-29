/*
 * Seed the "Agora Developer Onboarding" program + roadmap into the LIVE Mastery Engine.
 *
 * What it does, in order (each stage is idempotent or skip-guarded):
 *   1. mint an admin ag_sso cookie (SSO_SECRET env, same recipe as ME AGENTS.md §4)
 *   2. POST /api/admin/programs                -> program agora_dev (category career ->
 *      it appears in Sentinel's Professional tab automatically; academy.js filters
 *      category !== 'growth')
 *   3. POST /api/admin/topics/bulk             -> 5 courses / 16 lessons / 47 topics
 *   4. POST /api/admin/transcripts             -> ONE distilled source doc per lesson.
 *      genjobs ground question generation in lesson-scoped transcripts, so questions
 *      come from OUR docs, not the model's general knowledge.
 *   5. POST /api/admin/genjobs (provider kimi) -> one job per course, 5 q/topic,
 *      then step-loops each job to completion (server-driven; no browser needed)
 *   6. POST /api/admin/roadmaps                -> the 5-stage roadmap, audience everyone
 *
 * Run:  $env:SSO_SECRET = (gcloud secrets versions access latest --secret platform-sso-key --project agora-data-driven)
 *       node seed-agora-dev-onboarding.mjs
 */

import { createHmac } from 'crypto';

const BASE = process.env.ME_URL || 'https://mastery-engine-585951669065.us-central1.run.app';
const SECRET = (process.env.SSO_SECRET || '').trim();
if (!SECRET) { console.error('SSO_SECRET env is required'); process.exit(1); }

const PROGRAM = 'agora_dev';
const TRACK = 'Developer Onboarding';

function cookie() {
  const p = Buffer.from(JSON.stringify({ sub: 'info@agoradatadriven.com', exp: Math.floor(Date.now() / 1000) + 3600 }))
    .toString('base64url');
  return p + '.' + createHmac('sha256', SECRET).update(p, 'ascii').digest('base64url');
}

async function api(path, { method = 'GET', body = null } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Cookie': 'ag_sso=' + cookie(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : (method === 'POST' ? '{}' : undefined),
  });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* leave null */ }
  if (!r.ok) throw new Error(method + ' ' + path + ' -> ' + r.status + ': ' + text.slice(0, 300));
  return json;
}

/* ------------------------------ the curriculum ------------------------------ */
// course -> lesson -> [topics]
const CURRICULUM = {
  'The Agora Estate': {
    'The big picture': [
      'The polyrepo and the container folder',
      'One SSO cookie, one source of truth',
      'The internal HMAC bridges',
      'One project, two regions',
    ],
    'The product repos': [
      'Atrium: portal, workspaces, dashboards',
      'The three-stage client data contract',
      'Sentinel: the ops command center',
      'The Mastery Engine and its local mirror',
      'The website and the SEO pipeline loop',
    ],
    'The toolbox': [
      'What lives in agora-devtools',
      'Canonical launchers and mirrored copies',
      'Skills are thin wrappers',
    ],
  },
  'The Daily Workflow': {
    'Start of day': [
      'What start-day verifies',
      'Reconciles and consent gates',
      'The parked-work report',
    ],
    'Shipping with go': [
      'The pre-flight ritual',
      'push-branch and the safe reconcile',
      'merge-branches: integrate, gate, land',
      'Reading the Summary blocks',
    ],
    'Parking work': [
      'Why parking exists',
      'The wip namespace',
      'Resuming and promoting a park',
    ],
    'When things go wrong': [
      'Resolving a merge conflict with -Resume',
      'Held back and failed previews',
      'The push-protection block',
    ],
  },
  'Why the System Works': {
    'The two guards': [
      'The staleness gate',
      'The reversion net',
      'Why syncing is always the fix',
    ],
    'Deploys and truth': [
      'Last-deploy-wins and the serving revision',
      'A clean tree is not proof of done',
      'Landing versus deploying',
    ],
    'The documentation system': [
      'AGENTS.md and the pointer chain',
      'Unit READMEs: maps and cookbooks',
      'Docs are part of done',
    ],
  },
  'The Tools Layer': {
    'Google Cloud essentials': [
      'Cloud Run services and jobs',
      'The region split',
      'Secret Manager and the no-secrets rule',
      'The pinned gcloud config',
    ],
    'GitHub essentials': [
      'The org and what belongs in it',
      'Push protection and token scopes',
      'Actions: CI versus Deploy',
    ],
    'PowerShell 5.1 survival': [
      'What 5.1 does not have',
      'Exit codes over stderr',
      'The UTC epoch trap',
    ],
  },
  'Working with AI': {
    'The AI cost ladder': [
      'Kimi is the default workhorse',
      'When to escalate a model',
      'Fable is the last resort',
    ],
    'Driving agents well': [
      'Docs before scanning',
      'Verify before you assume',
      'Cookbook discipline',
    ],
    'The launchers and allowlists': [
      'Launching on Kimi',
      'Switching the VS Code panel',
      'The engine AI policy',
    ],
  },
};

/* --------------------------- lesson source material -------------------------- */
/* One distilled doc per lesson. Question generation reads THESE (lesson-scoped
 * transcripts), so keep them factual and Agora-specific. No backticks, no dollar-brace. */
const T = {};

T['The big picture'] = String.raw`
Agora is a POLYREPO. The folder Agora/ on every dev machine is a plain container folder, not a
git repository. Each subfolder inside it is its own independent git repo: atrium, sentinel,
mastery-engine, mastery-engine-local, website, seo-pipeline, and the toolbox agora-devtools.
There are six product repos plus the toolbox. Default branches are main everywhere except
seo-pipeline, whose default branch is master.

One cookie signs everyone in everywhere: the ag_sso cookie, HMAC-signed with the shared secret
stored in Secret Manager as platform-sso-key, scoped to .agoradatadriven.com. Crucially, SSO only
AUTHENTICATES. AUTHORIZATION lives in exactly one place: Sentinel's users table. An email with no
active row in Sentinel's users table gets nothing, in every app. Adding a person in Sentinel
(People, Add Employee) is what enables their Google login across the platform; deactivating them
there blocks it everywhere. SSO never creates a user and never grants a role.

The workspace hub document is AGENTS.md at the container root. It is auto-loaded for every agent
session, and every repo has its own AGENTS.md that must be read before editing that repo. The
repo-level CLAUDE.md files are one-line pointers that just import AGENTS.md, so Claude Code,
Kimi-driven Claude, and Codex all read the same manual.

Two data directories at the container root live in NO git repo and must never be swept or
cleaned: _tcs-blog-data (a competitor blog corpus) and ai-eng-build (curriculum source). The
shared Python virtual environment for all Python repos is Agora/.venv, deliberately outside every
repo so no repo tracks it.
`;

T['The product repos'] = String.raw`
atrium is the client-facing Flask portal and CRM. It contains the portal front-door service
platform-dash (which also hosts Agora Atrium, the co-branded client workspace), per-client
dashboard folders under clients/, Windsor.ai ingest loaders under services/ingest that write the
shared raw_windsor BigQuery dataset, and a status-dashboard unit. Client dashboards follow a
three-stage data contract matched BY NAME: a column in sql view files, then a data dict key
assembled in job/main.py, then a data.* key consumed by dash/dashboard.html. Renaming a key at
one stage silently breaks the next. Some clients are Windsor-LIVE or local-build instead
(riverdance, honeytribe, MeloYelo, RHE, S7000) and have no sql stage at all. Inline dashboard
JavaScript must stay esprima-4-safe: no optional chaining and no nullish coalescing operators,
because the pre-deploy gate parses it with esprima 4.

sentinel is the internal staff operations app: FastAPI plus a vanilla JS frontend. Attendance,
gym, tasks, people, leave, payroll, reports, and the Growth hub. Its users table authorizes the
whole platform. Its task board shows two kinds of card: Sentinel's own Postgres rows and cards
that Atrium owns, edited in place over an HMAC bridge. Sentinel deploys ONLY via
deploy/deploy.ps1 because a raw gcloud run deploy wipes the SSO environment variables.

mastery-engine is this quiz app: Node and Express with a framework-free frontend, Firestore data,
AI question generation. mastery-engine-local is NOT a fork: it is a mirror that runs the cloud
repo's code verbatim over a JSON-file Firestore shim. You never hand-port changes into it; from
that repo you run npm run port, which copies the cloud code and applies a small asserted patch
list.

website is the public Astro site for agoradatadriven.com. Pushing its main branch IS a production
deploy (GitHub Actions). seo-pipeline is a Python Cloud Run Jobs pipeline that writes blog posts
INTO the website repo through the GitHub API and triggers deploys - so posts nobody wrote by hand
are the pipeline working as designed.
`;

T['The toolbox'] = String.raw`
agora-devtools is the cross-repo machinery, a sibling repo of the product repos. It holds only
repo-agnostic scripts: bootstrap.ps1 for a fresh laptop, agora-start-day.ps1 for the morning
alignment, agora-park.ps1 to durably shelve unfinished work, agora-push.ps1 to commit and push
work-in-progress in every touched repo, agora-ship.ps1 to preview or perform a release across
every touched repo, and agora-go.ps1 which equals push then ship live. Per-repo knowledge lives
in each repo's own scripts (push-branch.ps1 and merge-branches.ps1, kept in scripts/, except
atrium which keeps them in tools/). Repo discovery is automatic: the orchestrators treat every
sibling folder containing a .git directory as a product repo, so adding a repo requires no
toolbox edits.

The AI launchers (kimi-bypass-mode.ps1 and glm-bypass-mode.ps1) are CANONICAL in agora-devtools.
Every product repo carries a copy for convenience, but those copies are overwritten from the
canonical ones on every agora-push run. Never edit a repo's launcher copy; the change belongs in
agora-devtools and reaches every repo and machine automatically.

The slash-commands some agents see (/go, /agora-ship, /park) are Claude Code skills defined in
agora-devtools/dotclaude/skills, reached through a junction at the workspace root. They are THIN
WRAPPERS: each just runs its .ps1 script. A developer on Codex, on Kimi, or with no agent at all
gets identical behavior by running the raw script or double-clicking its .cmd file. If a script's
flags change, its SKILL.md and the README must change in the same commit.
`;

T['Start of day'] = String.raw`
Every working day begins with agora-start-day.ps1 (or its double-clickable .cmd) from
agora-devtools. Skipping it is how devs end up working on stale main, which is how work gets
reverted later.

Start-day verifies IDENTITY, not just that a token exists. It checks the gcloud CLI account AND
the account behind Application Default Credentials separately, because a token can print
successfully while belonging to the wrong Google account; ADC is what Firestore, BigQuery, and
Vertex client libraries actually authenticate with. The expected operator identity is
info@agoradatadriven.com on project agora-data-driven.

It then syncs the toolbox repo FIRST, so new scripts and skills arrive before anything else runs,
and offers to restart itself if start-day itself changed. Then, for every product repo it
fetches, fast-forwards main (even in place while you sit on a dev branch with uncommitted work),
and offers consent-gated reconciles: a stash-sync-restore dance when your tree is dirty, merging
origin/main into a branch with unfinished work, or a fresh start when your branch was already
merged and you began new work on it. Every one of those asks first; declining leaves your work
untouched, and a conflicted stash pop stays recoverable in git stash list. Start-day never
discards work.

It ends with the parked-work report: every wip branch across every repo with its age and how far
behind main it is, a loud warning once a park is a week old, an offer to freshen your own parks
onto the latest main, and the exact delete command once a park has been fully merged.
`;

T['Shipping with go'] = String.raw`
The go command (agora-go.ps1, or the /go skill in Claude Code) is NOT a ship-my-current-change
button. It is a ship-EVERYTHING-that-looks-touched button: it sweeps every repo with a dirty tree
or a non-main branch, and it integrates every dev branch pushed to origin in every touched repo.
It has shipped other machines' unfinished work in the past. That is why the pre-flight ritual is
mandatory before every go: run git status --short and git log origin/HEAD..HEAD in every repo and
ask whether every dirty file everywhere is something you actually want in production. Use
origin/HEAD rather than origin/main in the loop because seo-pipeline's default branch is master.
If unsure, run go with the Preview switch, which pushes your work safely and only dry-runs the
release.

Phase one is agora-push: for every repo with local changes or unpushed commits it runs that
repo's push-branch.ps1, which commits everything to your personal dev branch (named like
ian/work), SAFE-RECONCILES origin/main into the branch so you never publish work built on stale
main, and pushes with force-with-lease over HTTP/1.1. A real conflict stops with the conflict
left in the tree and clear guidance; your commits are never lost.

Phase two is agora-ship with the Go switch: for each touched repo, its merge-branches.ps1
enumerates all origin dev branches except parked wip branches, applies the staleness gate, builds
an integration/merge branch, runs the repo's own sanity gates, runs the reversion net, lands on
main, deploys that repo its own way, and prunes merged branches. To ship a single repo
surgically, run that repo's own merge-branches.ps1 instead of the global go.
`;

T['Parking work'] = String.raw`
Parking is the deliberate opposite of shipping: it makes unfinished work durable and visible
WITHOUT it ever reaching production. Before park existed, there was no way to hold work back on
purpose: go integrates every pushed dev branch, and the only hold was a push-failure record in
one machine's TEMP folder with a thirty-minute lifetime.

agora-park.ps1 (the /park skill, or agora-park.cmd) commits your work-in-progress onto a branch
in the dedicated wip namespace, named wip/yourname/description, pushes it to origin, and leaves
the repo CLEAN on main. The parked state IS the branch's existence on origin: every machine can
see it with the List switch, and nothing local marks it.

Parked work cannot ship because every repo's merge-branches explicitly skips wip branches when it
enumerates branches to integrate, and never prunes them either. The skip is loud, never silent:
each run prints how many parked branches it ignored and their names, and agora-ship repeats that
in its summary.

Re-running park with the same description appends a new commit to the same parked branch. Local
commits sitting on main get moved onto the park and main is reset level with origin, but only
after the push succeeded and only when git ancestry proves the commits are contained in the
parked branch. Parking while on a normal dev branch also retires that branch's origin copy,
because ship would otherwise still integrate it - again only when ancestry proves the park
contains it. Nothing is ever discarded.
`;

T['When things go wrong'] = String.raw`
A merge conflict during integration is normal, not a failure. merge-branches stops with the
conflict LEFT IN THE TREE and prints the runbook: resolve each file semantically keeping both
developers' intent, then git add -A and git commit --no-edit, then re-run merge-branches with the
Resume switch. Resume continues the stopped run from the integration branch; it expects a clean
tree there. Never bypass a conflict any other way, and note that if a branch was flagged STALE,
a hunk that deletes files or features present on main is a reversion - keep the up-to-date side.

Held back means a repo's push did not fully complete this run (usually an unresolved
merge-with-main conflict). Ship refuses to release that repo because landing it would push a
half-done tree. The hold record lives in the local TEMP folder with a thirty-minute lifetime and
is per-machine only - another laptop's failure holds nothing back on yours. The durable,
cross-machine hold is park. Since the 2026-07-29 hardening, push, ship, and go all exit non-zero
on ANY failure, including failed previews - but the detail always lives in the Summary blocks:
read Needs you, Held back, parked-branches-ignored, and any name marked failed or secret-blocked.

If GitHub push protection blocks a push because a secret is in the commit range, treat it as an
accidental park: the work sits safely local. NEVER use GitHub's unblock URL. The fix is to
rewrite the secret out of the unpushed history (safe precisely because those commits were never
pushed), rotate the credential since it must be treated as burned, and push again. A later
commit that merely deletes the secret does NOT unblock the push - protection scans the whole
pushed range, not the final tree.
`;

T['The two guards'] = String.raw`
Two guards make integration safe, and their ordering is deliberate.

The PRIMARY guard is the staleness gate. A dev branch that does not CONTAIN origin/main was built
on an old main, and integrating it can silently revert newer work that already landed - the
number one way this platform has damaged itself. Containment is an exact git ancestry fact, not a
heuristic, so the gate is hard: merge-branches refuses to integrate any stale branch, and there
is deliberately NO bypass flag. The fix is always to sync the branch: merge origin/main into it
(push-branch does this automatically) and push again. Historically the ancestry check was only a
yellow warning while a large heuristic did the blocking; that was backwards and was flipped -
never demote the gate again.

The SECONDARY guard is the reversion net, a heuristic backstop for the one case ancestry cannot
see: main WAS merged in, but newer work got discarded during manual conflict resolution. It trips
when the integrated tree deletes files that exist on main, or is heavily net-negative in lines
(threshold: three hundred lines net removed). Because it is a heuristic it can false-positive on
an intentional big cleanup, so it alone has an escape switch, AllowReverts, to be used only after
confirming a mass deletion is intended.

Sync is always the fix for staleness because merging origin/main into your branch preserves your
commits while guaranteeing containment. Force-pushing over the gate, rebasing away history, or
bypass flags would all reintroduce exactly the incident class the gates were built to prevent.
`;

T['Deploys and truth'] = String.raw`
Deploys on this platform are last-deploy-wins. Cloud Run serves whatever revision was deployed
most recently; a teammate deploying from a stale tree after you silently replaces your revision.
So when a shipped change seems missing, the FIRST check is never browser cache - it is what is
actually serving. Describe the service and read the whole status.traffic array, because the first
traffic entry can be a tagged OLD revision kept for rollback; the entry with latestRevision true
and percent one hundred is what users get. This exact trap produced a false alarm during the
2026-07-29 audit: platform-dash looked seventy-seven revisions behind until the tagged prev
revision in traffic position zero was recognized.

A clean git tree is NOT proof there is nothing to do. The cross-laptop sync can land merges on
main WITHOUT deploying them, and can commit your files under someone else's message. Verify with
git log and the serving revision's creation time, not with git status alone: if the newest main
commit is newer than the serving revision and touches runtime code, production is behind main.

Landing and deploying are different events, and the website makes the difference visible: landing
on its main only TRIGGERS the GitHub Actions deploy, which is asynchronous - confirm with gh run
list. In every repo's merge-branches, main is landed BEFORE the deploy runs, so a deploy failure
leaves main ahead of production; the script says exactly that, and the remedy is to re-run the
deploy, never to re-land.
`;

T['The documentation system'] = String.raw`
Every repo's canonical manual is its AGENTS.md, read natively by Codex and most agents. The
CLAUDE.md files that Claude Code auto-loads are exactly one line - an import pointer to AGENTS.md
- so there is ONE copy of the prose and every agent reads the same rules. The workspace root
follows the same pattern, and atrium's .claude/CLAUDE.md points a level up to the repo AGENTS.md.
Never grow prose back into a pointer file.

Below the manuals sit the unit READMEs - one per major unit (atrium's portal dash, ingest, each
client, sentinel's backend, frontend and deploy, the engine's lib, public and scripts, the
website's src, the pipeline's stages and config). Each follows one standard: what the unit is in
three lines, a FILE MAP with every file and the greppable anchors an editor searches for, the
unit's DATA CONTRACT table where one exists, a COOKBOOK of the most common edits with exact
files, verify commands and deploy commands, the gotchas and a do-not-touch list, and volatile
status. The goal is that a routine edit is completed from the docs alone, touching only the files
a cookbook entry lists, with zero exploratory scanning.

Volatile status - live URLs, serving revisions, verified-on dates - lives ONLY in READMEs, never
in AGENTS.md, so the manuals stay stable while status changes freely.

The whole system stays alive through one rule: DOCS ARE PART OF DONE. A change that alters a
contract, a layout, a flag, or a deploy step updates the repo's AGENTS.md or the unit README in
the SAME commit. A merged change with stale docs is an unfinished change.
`;

T['Google Cloud essentials'] = String.raw`
Everything runs in one GCP project, agora-data-driven, operated as info@agoradatadriven.com.
Cloud Run hosts two kinds of workload: SERVICES, which serve HTTP continuously (the portal,
sentinel, the dashboards, the engine, the website), and JOBS, which run to completion on a
schedule or on demand (the client export jobs, the ingest loaders, the seo-pipeline daily,
weekly and smoke jobs).

The region split is the number one wrong assumption on the platform: mastery-engine and the three
seo-pipeline JOBS live in us-central1, while sentinel, platform-dash, the website service and
every client dash and export job live in asia-southeast1. A gcloud command with the wrong region
does not error - it silently targets nothing and looks like the resource does not exist. Check
the region table in the root AGENTS.md before any gcloud call.

Secrets NEVER live in git. They live in Secret Manager (the shared SSO secret is platform-sso-key)
and reach services as mounted environment variables at deploy time. The push scripts refuse
secret-looking files as defense in depth. Two more fixed facts: the org policy rejects
allow-unauthenticated, so web services deploy with no-invoker-iam-check and authenticate
in-process; and the project number is never hardcoded - resolve it at runtime with gcloud
projects describe.

Each VS Code window pins its own named gcloud configuration through the
CLOUDSDK_ACTIVE_CONFIG_NAME environment variable. NEVER run gcloud config set account or project;
to target something else, pass explicit project and account flags on that one command. Verify the
pin with gcloud config list before deploying anything.
`;

T['GitHub essentials'] = String.raw`
The GitHub organization is Agora-Data-Driven, and it holds EXACTLY the platform's repos: the six
product repos plus agora-devtools. Client projects and personal experiments do not belong in the
org - they live on personal accounts. This rule was enforced in the 2026-07-29 cleanup, when the
retired Web-port prototype and a client CRM repo were transferred out.

Push protection scans every push for secrets, and it scans the whole pushed COMMIT RANGE, not
just the final tree - so committing a deletion of the secret afterwards does not unblock you. The
fix is to rewrite the secret out of the unpushed history, rotate the burned credential, and push
again. Never click GitHub's unblock URL.

The default token on a dev machine lacks the workflow scope, so any push that touches files under
.github/workflows is rejected. The documented dance: gh auth switch to the Agoradatadriven
account, push, and switch back to your own account.

The website repo turns GitHub into a deploy pipeline: every push to its main triggers TWO
independent Actions workflows - CI (type-check, lint, build) and Deploy (the actual Cloud Run
deploy via Workload Identity). They do not gate each other, so Deploy can be green while CI is
red. Keep CI green: it went red on every push for a while over formatting debt and was fixed on
2026-07-29 - run npm run lint before pushing, and remember every push to that main IS a
production deploy.

Pushes to these repos hang over HTTP/2. Every script forces HTTP/1.1 on git network operations;
if you push by hand, do the same.
`;

T['PowerShell 5.1 survival'] = String.raw`
The whole estate runs Windows PowerShell 5.1, not PowerShell 7, and every script must parse and
run there. Three modern operators simply do not exist in 5.1: the double-ampersand and
double-pipe pipeline chains, the ternary conditional, and the null-coalescing and
null-conditional operators. Using any of them is a parse error - an entire deploy script once
failed to load because of a single ternary. Write if-else and sequence commands with semicolons,
gating on success explicitly.

Native commands like git and gcloud write ordinary progress to stderr. Under a Stop error
preference, or when output is captured with a stderr redirect, PowerShell wraps those harmless
lines into NativeCommandError records and can kill a script that actually succeeded - sentinel's
deploy script once died exactly this way. The house pattern: keep the error preference on
Continue and gate every step on the exit code variable LASTEXITCODE, and avoid wrapping native
commands in stderr-merging redirects when capturing output.

The UTC epoch trap: Get-Date with the UFormat percent-s option in 5.1 returns a LOCAL-time epoch,
eight hours off in Manila. Every HMAC-signed internal call uses a timestamp with a three-hundred
second skew window, so the local epoch produces 401 responses that look like a wrong secret and
have burned real debugging time. Always take epochs from DateTimeOffset UtcNow ToUnixTimeSeconds.

Two more habits: Read-Host returns null when there is no console, so wrap it defensively before
calling Trim; and splat arguments as hashtables, never arrays - array splatting binds positionally
and silently drops switches, which once degraded a live release into a no-op preview.
`;

T['The AI cost ladder'] = String.raw`
Agora runs a deliberate AI cost ladder, and using it well is part of the job.

KIMI IS THE DEFAULT WORKHORSE. The org holds a flat-rate Kimi Code subscription, so Kimi usage is
effectively free at the margin - the launchers run Claude Code on Kimi by default, start-day
launches straight into it, and the Mastery Engine's default learner policy allows only Kimi. Do
your daily development driving on Kimi: routine edits, cookbook tasks, running the workflow,
writing tests, drafting docs.

ESCALATE DELIBERATELY, not habitually. Move up the ladder when the task is genuinely beyond the
current tier: subtle cross-repo reasoning, gnarly concurrent-git forensics, high-blast-radius
production changes, or when the cheaper model has failed twice on the same problem with clear
effort. A failed cheap attempt costs little; starting expensive costs every time.

FABLE IS THE LAST RESORT. It is the strongest and by far the most expensive model, so it is
reserved for what actually needs it: full-system audits, architecture design, incidents where a
wrong answer is costlier than the model time. Do not idle Fable on routine work a Kimi session
handles.

Cost discipline is enforced, not just requested: inside the Mastery Engine, every AI call funnels
through one policy gate, and non-admin users are clamped to Kimi unless an admin grants more. The
per-person spend dashboard makes usage visible. The same mindset applies in your editor: know
which model your session is running before you paste a big task into it.
`;

T['Driving agents well'] = String.raw`
The single biggest speedup when driving any agent on Agora is DOCS BEFORE SCANNING. Every repo's
AGENTS.md exists so an agent does not have to explore the codebase to make a correct change, and
the unit READMEs carry file maps with greppable anchors plus cookbooks for the common edits. An
agent pointed at the right cookbook entry touches only the files that entry lists and finishes in
minutes; an agent told to go figure the repo out burns time and tokens rediscovering documented
landmines. So open every session by naming the repo and pointing the agent at its AGENTS.md and
the relevant unit README.

VERIFY BEFORE YOU ASSUME is the platform's debugging culture, and agents must be held to it. The
region table before any gcloud call. The serving revision - the whole traffic array - before
blaming caching. git log before trusting a clean tree. The exit code AND the Summary blocks after
any push or ship. When an agent claims something is deployed or fixed, ask it to show the
verification, because every repo's docs give the exact command.

COOKBOOK DISCIPLINE keeps changes reviewable: a routine edit that follows a cookbook entry should
touch only that entry's files, run that entry's verify command, and use that entry's deploy
command with the right region. An agent whose diff sprawls beyond the listed files either found
something the docs missed - in which case the docs get updated in the same change, because docs
are part of done - or it is off the rails and needs reining in. The workflow gates will catch a
stale branch or a mass deletion, but the cheapest fix is the agent never producing one.
`;

T['The launchers and allowlists'] = String.raw`
Launching a terminal agent on Kimi is one script: kimi-bypass-mode.ps1, canonical in
agora-devtools and mirrored into every repo's scripts folder (tools in atrium). It fetches the
shared Kimi key from Secret Manager (the lower-case kimi-api-key secret) and starts Claude Code
against the Kimi Code endpoint. It is the DEFAULT: agora-start-day ends by launching it, so the
normal morning flow lands you in a Kimi-powered session automatically. glm-bypass-mode.ps1 is the
same pattern for the alternative GLM provider.

The VS Code extension panel spawns its own Claude and ignores the terminal launchers, so it has
its own switcher: claude-panel-mode.ps1 with kimi or claude as the argument (bare for status). It
edits the VS Code user settings at machine scope and requires a window reload; remember it
affects every VS Code window on the machine.

Two Kimi keys exist and must never be mixed: the lower-case kimi-api-key secret is the LAUNCHER
key for driving Claude Code, while the upper-case KIMI_API_KEY secret is the application key the
products mount (the engine, Atrium's assistant). Both authenticate only against the Kimi Code
coding endpoint - the moonshot domain rejects them.

Inside the Mastery Engine, the AI allowlist is per-user data: admins are unrestricted, everyone
else defaults to Kimi-only, and grants are edited from the Academy Admin Team station. The hard
gate is enforced in the model dispatch layer itself, so no frontend trick reaches an ungrated
provider - the same defense-in-depth pattern as everything else on the platform.
`;

/* ------------------------------- the roadmap -------------------------------- */
const ROADMAP = {
  id: 'agora-developer-onboarding',
  title: 'Agora Developer Onboarding',
  program: PROGRAM,
  audience: 'everyone',
  source: 'manual',
  goal: 'Onboard a developer to work fluidly and safely across the whole Agora polyrepo: know every repo, run the daily start-day / park / go workflow without ever losing work, explain WHY the gates keep production safe, use GCP and GitHub at a working level, and drive AI agents cost-effectively (Kimi first, Fable last).',
  summary: 'Five stages, in order. Do not skip Stage 2 - the daily workflow is the contract that keeps everyone\'s work safe. Quiz yourself to at least 80 percent mastery per stage before moving on; the coach can explain any topic deeper, and every fact here is also in the repos\' AGENTS.md files.',
  stages: [
    {
      title: '1 · Know the estate',
      summary: 'The seven repos, how they connect (one SSO cookie, HMAC bridges, the SEO-to-website loop), and where the canonical docs live. After this stage you can say what each repo is for and where to look before touching it.',
      items: [{ level: 'course', program: PROGRAM, track: TRACK, course: 'The Agora Estate', note: 'Read each repo AGENTS.md header as you go - the course mirrors them.' }],
    },
    {
      title: '2 · The daily contract',
      summary: 'THE stage that prevents lost work, merge disasters, and mystery deletions: start-day every morning, pre-flight before every go, park anything unfinished. Master this before shipping anything.',
      items: [{ level: 'course', program: PROGRAM, track: TRACK, course: 'The Daily Workflow', note: 'Practice for real: run start-day, park a scratch change, list it from another repo, promote it.' }],
    },
    {
      title: '3 · Explain the why',
      summary: 'The staleness gate, the reversion net, last-deploy-wins, landing versus deploying, and the docs system. After this stage you can explain to a new teammate WHY the system is shaped this way - which is what makes it durable.',
      items: [{ level: 'course', program: PROGRAM, track: TRACK, course: 'Why the System Works', note: 'Test yourself: explain the two guards from memory, then check against the devtools AGENTS.md.' }],
    },
    {
      title: '4 · The tools layer',
      summary: 'Working knowledge of GCP (services vs jobs, THE region split, Secret Manager, the pinned config), GitHub (org rules, push protection, CI vs Deploy), and PowerShell 5.1 survival. Enough to act fast and safely - not a deep dive.',
      items: [{ level: 'course', program: PROGRAM, track: TRACK, course: 'The Tools Layer', note: 'Keep the region table within reach until it is reflex.' }],
    },
    {
      title: '5 · AI leverage',
      summary: 'The cost ladder (Kimi default, escalate deliberately, Fable last resort), how to drive agents with docs-first + verify-before-assume + cookbook discipline, and the launchers. This is how one dev does the work of three without burning the budget.',
      items: [{ level: 'course', program: PROGRAM, track: TRACK, course: 'Working with AI', note: 'From tomorrow: start-day, then a Kimi session, then point it at an AGENTS.md.' }],
    },
  ],
};

/* --------------------------------- stages ----------------------------------- */
async function main() {
  console.log('== 1. program');
  const progs = await api('/api/programs');
  const have = (progs?.programs || []).some((p) => p.id === PROGRAM);
  if (have) console.log('   program exists - skipping create');
  else {
    await api('/api/admin/programs', { method: 'POST', body: { id: PROGRAM, name: 'Agora Developer Onboarding', category: 'career' } });
    console.log('   created', PROGRAM);
  }

  console.log('== 2. topics (bulk upsert)');
  const rows = [];
  for (const [course, lessons] of Object.entries(CURRICULUM))
    for (const [lesson, topics] of Object.entries(lessons))
      for (const topic of topics) rows.push({ track: TRACK, course, lesson, topic });
  const bulk = await api('/api/admin/topics/bulk', { method: 'POST', body: { program: PROGRAM, rows } });
  console.log('   rows:', rows.length, 'report:', JSON.stringify(bulk).slice(0, 200));

  console.log('== 3. lesson transcripts');
  const existing = await api('/api/admin/transcripts?program=' + PROGRAM).catch(() => null);
  const haveTitles = new Set((existing?.transcripts || existing?.items || []).map((t) => t.title));
  let tAdded = 0;
  for (const [course, lessons] of Object.entries(CURRICULUM)) {
    for (const lesson of Object.keys(lessons)) {
      const title = 'Source: ' + lesson;
      if (haveTitles.has(title)) { console.log('   have:', title); continue; }
      const text = (T[lesson] || '').trim();
      if (!text) { console.log('   !! missing source text for lesson:', lesson); continue; }
      await api('/api/admin/transcripts', { method: 'POST', body: {
        program: PROGRAM, track: TRACK, course, lesson, title, text, source: 'onboarding-seed',
      } });
      tAdded++; console.log('   added:', title, '(' + text.length + ' chars)');
    }
  }
  console.log('   transcripts added:', tAdded);

  console.log('== 4. genjobs (kimi, 5 questions per topic, one job per course)');
  const jobs = [];
  for (const course of Object.keys(CURRICULUM)) {
    const j = await api('/api/admin/genjobs', { method: 'POST', body: {
      program: PROGRAM, track: TRACK, course,
      targetPerTopic: 5, provider: 'kimi', thinking: false,
      instructions: 'These questions onboard Agora developers on their real internal platform. '
        + 'Ground EVERY question strictly in the provided source material - never general industry knowledge. '
        + 'Never invent commands, flags, file paths, region names, or behaviors not present in the source. '
        + 'Prefer practical scenario questions (a developer does X - what happens / what should they do?) over trivia. '
        + 'Wrong answers must be plausible mistakes a real dev would make (e.g. the wrong region, the bypassed gate, the raw deploy).',
    } });
    jobs.push({ course, id: j.job.id });
    console.log('   job', j.job.id, 'for', course);
  }

  console.log('== 5. stepping jobs to completion');
  for (const { course, id } of jobs) {
    for (let i = 0; i < 200; i++) {
      const r = await api('/api/admin/genjobs/' + id + '/step', { method: 'POST' });
      const jb = r.job || r;
      const status = jb.status || 'unknown';
      const done = jb.doneTopics ?? jb.done ?? '?';
      const total = jb.totalTopics ?? jb.total ?? '?';
      if (i % 5 === 0 || status !== 'running') console.log('   [' + course + '] step', i + 1, status, done + '/' + total);
      if (status !== 'running' && status !== 'queued') break;
    }
  }

  console.log('== 6. roadmap');
  const rm = await api('/api/admin/roadmaps', { method: 'POST', body: ROADMAP });
  console.log('   roadmap saved:', rm?.roadmap?.id || rm?.id || JSON.stringify(rm).slice(0, 120));

  console.log('== DONE');
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
