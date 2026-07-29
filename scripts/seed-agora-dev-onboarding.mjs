/*
 * Seed/refresh the "Agora Developer Onboarding" program + roadmap in the LIVE Mastery Engine.
 *
 * v2 (2026-07-29): rewritten for a NON-TECHNICAL audience — people who vibe code with AI and
 * nothing else. Plain language, real commands with full paths, practical scenarios. The lesson
 * transcripts below are the questions' SOURCE OF TRUTH, and the Developer Onboarding
 * presentation (linked in the program's Resources tab) is written from the same facts — so
 * studying the presentation is enough to pass every quiz question.
 *
 * Stages (run from the mastery-engine repo root so @google-cloud/firestore resolves):
 *   0. --wipe: delete this program's existing questions, transcripts, and topics straight from
 *      Firestore (ADC auth). Use when the curriculum or transcripts changed; the roadmap and
 *      program doc are kept (course names are stable, so roadmap stages keep working).
 *   1. ensure program agora_dev (career -> auto-appears in Sentinel's Professional tab)
 *   2. bulk-create topics    3. add one source transcript per lesson
 *   4. genjobs on KIMI (flat-rate, $0 marginal), 5 questions/topic  5. step jobs to done
 *   6. upsert the roadmap
 *
 * Run:  $env:SSO_SECRET = (gcloud secrets versions access latest --secret platform-sso-key --project agora-data-driven)
 *       node scripts\seed-agora-dev-onboarding.mjs --wipe     (fresh content)
 *       node scripts\seed-agora-dev-onboarding.mjs            (append-only / first run)
 */

import { createHmac } from 'crypto';

const BASE = process.env.ME_URL || 'https://mastery-engine-585951669065.us-central1.run.app';
const SECRET = (process.env.SSO_SECRET || '').trim();
if (!SECRET) { console.error('SSO_SECRET env is required'); process.exit(1); }

const PROGRAM = 'agora_dev';
const TRACK = 'Developer Onboarding';
const WIPE = process.argv.includes('--wipe');

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
// course -> lesson -> [topics]. COURSE NAMES ARE STABLE (the roadmap references them) —
// rename lessons/topics freely, never the five course names.
const CURRICULUM = {
  'The Agora Estate': {
    'The folder tour': [
      'One folder, seven projects',
      'What each app does',
      'The clients folder you never clean',
    ],
    'How it all connects': [
      'One login for everything',
      'Sentinel decides who gets in',
      'Blog posts that write themselves',
    ],
    'The special pair': [
      'mastery-engine and its offline copy',
      'Never edit the offline copy directly',
      'npm run port keeps them in sync',
    ],
  },
  'The Daily Workflow': {
    'Start your day right': [
      'Always run start-day first',
      'What start-day does for you',
      'Skipping start-day causes disasters',
    ],
    'Shipping your work': [
      'What go really does',
      'The pre-flight check',
      'Preview when unsure',
      'Ship only what you changed',
    ],
    'Parking unfinished work': [
      'When to park',
      'How park keeps work safe',
      'Getting parked work back',
    ],
    'If something goes wrong': [
      'Merge conflicts are normal',
      'Never use the GitHub unblock link',
      'Let the AI fix it, never force it',
    ],
  },
  'Why the System Works': {
    'The safety gates': [
      'The staleness gate',
      'Why the gate has no bypass',
      'The reversion net',
    ],
    'What is actually live': [
      'Deploys: last one wins',
      'A clean folder does not mean done',
      'The website deploys itself',
    ],
    'The docs run the show': [
      'AGENTS.md is the rulebook',
      'Point your AI at the docs first',
      'Update docs when things change',
    ],
  },
  'The Tools Layer': {
    'Google Cloud basics': [
      'Services and jobs, simply',
      'Two regions and why it matters',
      'Secrets never go in code',
    ],
    'GitHub basics': [
      'The org is for Agora only',
      'Push protection saves you',
      'Pushing the website is deploying it',
    ],
  },
  'Working with AI': {
    'Your AI lineup': [
      'Kimi is your daily driver',
      'Fable is the expensive expert',
      'When to escalate',
    ],
    'Launching your AI': [
      'The Kimi launcher',
      'claude-panel-mode for VS Code',
      'Two Kimi keys, never mixed',
    ],
    'Vibe coding the right way': [
      'Name the app, point at the docs',
      'Make the AI verify, not assume',
      'Ship with go, shelve with park',
    ],
  },
};

/* --------------------------- lesson source material -------------------------- */
/* Plain language. Real paths and commands. Every topic name is covered explicitly.
 * No backticks and no dollar-brace sequences inside the text. */
const T = {};

T['The folder tour'] = String.raw`
ONE FOLDER, SEVEN PROJECTS. Everything Agora runs lives in one folder on your computer:
C:\Users\<you>\Desktop\Repositories\Agora. That folder itself is just a container - it is not a
git project. Inside it are seven separate projects, each with its own git history: atrium,
sentinel, mastery-engine, mastery-engine-local, website, seo-pipeline, and agora-devtools.

WHAT EACH APP DOES, in one line each. Atrium is the client-facing portal - clients log in there
to see their dashboards, tasks, and reports. Sentinel is our internal staff app - attendance,
tasks, people, payroll, and the learning hub you are using right now. Mastery-engine is this
quiz app. Mastery-engine-local is an offline copy of the quiz app (more on that pair in another
lesson). Website is agoradatadriven.com, our public marketing site. Seo-pipeline is a robot that
writes and publishes blog posts onto the website automatically. Agora-devtools is the toolbox:
the scripts that keep everyone's work in sync, like start-day, go, and park.

THE CLIENTS FOLDER YOU NEVER CLEAN. Inside the Agora folder there is one data folder that
belongs to NO git project: clients. It holds per-client work products, one subfolder per client.
For example clients\the-contract-shop\blog-data is the ONLY copy of the 679-post competitor blog
research behind a client report. Because it is not in git there is no undo: never delete it,
never "tidy it up", and never let an AI sweep it into a cleanup. If an AI ever proposes deleting
anything under clients, say no. New loose client files always go INSIDE clients\<client-name>,
never directly in the Agora folder - and if a file does not fit any named subfolder, it goes in
clients\<client-name>\others, a catch-all every client folder has. (History: until 2026-07-29 this data sat in two loose root
folders, _tcs-blog-data and ai-eng-build. The first is now clients\the-contract-shop\blog-data;
the second is now git-tracked inside mastery-engine as content-build, so it is versioned and no
longer fragile.) There is also a hidden .venv folder (shared Python setup) - leave it alone too.
`;

T['How it all connects'] = String.raw`
ONE LOGIN FOR EVERYTHING. You sign in once with your Agora Google account and every app trusts
it - the portal, Sentinel, and this quiz app all share one login cookie. You never manage
separate passwords per app.

SENTINEL DECIDES WHO GETS IN. Logging in with Google only proves who you are. Whether you are
ALLOWED in is decided by one list: the users list inside Sentinel. If a person is added in
Sentinel (People, then Add Employee), their Google login starts working everywhere. If they are
deactivated in Sentinel, they are locked out everywhere at once. So when someone new joins, the
whole setup is: add them in Sentinel. That is it.

BLOG POSTS THAT WRITE THEMSELVES. The seo-pipeline robot runs every morning. It picks a topic,
writes an article, quality-checks it, and publishes it straight onto the website - no human
approval step. So if you see new blog posts on agoradatadriven.com that nobody on the team
wrote, that is not a hack - that is the pipeline doing its job. It publishes by adding the post
to the website project, which then updates the live site automatically. The apps also talk to
each other behind the scenes (for example, Sentinel's task board can edit tasks that live in
Atrium) - you do not need to manage any of that; just know the connections exist so surprises
have explanations.
`;

T['The special pair'] = String.raw`
MASTERY-ENGINE AND ITS OFFLINE COPY. There are two quiz-app folders and they are NOT two
projects. Mastery-engine is the main one - it is what actually runs on the internet.
Mastery-engine-local is an offline copy that can run on a laptop with no internet, for example
with a local AI model. The copy refreshes ITSELF from the main one.

NEVER EDIT THE OFFLINE COPY DIRECTLY. If you want to change how the quiz app works, always ask
your AI to make the change in the mastery-engine folder - the main one. If you (or your AI) edit
the app files inside mastery-engine-local instead, the change LOOKS fine at first: files change,
the app behaves differently. But it is doomed: the next refresh overwrites those files with the
main version, and your change silently disappears. It also never reaches the real app online.
This exact mistake once put the offline copy months behind, which is why the rule exists.

NPM RUN PORT KEEPS THEM IN SYNC. The refresh is one command, run inside the
mastery-engine-local folder: npm run port. After any change to the main quiz app, someone (your
AI, usually) runs npm run port and then npm test in the local folder, and the copy catches up.
So the working rhythm is: describe the change to your AI, the AI edits mastery-engine, you ship
it, the AI runs npm run port in mastery-engine-local. You never hand-copy anything between the
two folders.
`;

T['Start your day right'] = String.raw`
ALWAYS RUN START-DAY FIRST. Before you touch anything, run the morning script. It lives at
C:\Users\<you>\Desktop\Repositories\Agora\agora-devtools\agora-start-day.ps1 - and there is a
double-clickable agora-start-day.cmd right next to it if you do not want to open a terminal.
Make it a habit: sit down, run start-day, THEN start working or vibe coding.

WHAT START-DAY DOES FOR YOU. Three things. First, it checks you are signed in to Google Cloud as
the right account - not just signed in, but as the CORRECT identity, because being on the wrong
account makes things fail in confusing ways later. Second, it updates every project folder with
the latest team work, so you start from what everyone else finished - it even handles the case
where you left unfinished changes lying around, always ASKING before it touches anything, and
never throwing your work away. Third, it shows a report of any parked (shelved) work across the
team, warns if a parked branch is getting old, and offers to freshen up your own parked work.
At the end it can launch your AI session on Kimi automatically.

SKIPPING START-DAY CAUSES DISASTERS. If you skip it and work on yesterday's version of the code,
your work is built on a stale base. When it later gets combined with everyone else's, it can
silently UNDO things teammates already shipped. The safety gates will usually catch it and block
your ship - which means extra fixing work for you. Every real work-loss incident in this
workspace traces back to someone working on a stale base. One script run per day prevents all
of it.
`;

T['Shipping your work'] = String.raw`
WHAT GO REALLY DOES. When your change is ready, you ship it with one command: go. In a Claude
Code session type /go, or run
C:\Users\<you>\Desktop\Repositories\Agora\agora-devtools\agora-go.ps1. But understand what it
is: go is NOT a "ship my last change" button. It is a "ship EVERYTHING that looks changed, in
EVERY project" button. It collects your changes in every project folder, combines them with the
team's work, lands them, and puts them live in production. It has, in the past, shipped
half-finished work that was just lying around in a folder.

THE PRE-FLIGHT CHECK. Because go sweeps everything, always look before you ship. Ask your AI:
"show me what is changed in every repo before we go". It will list every modified file across
all seven projects. Read the list and ask yourself one question: is every single item something
I want live in production right now? If yes, go. If something unfinished is in the list, PARK it
first (next lesson), or ship the narrow way with now (below), then go.

PREVIEW WHEN UNSURE. Not sure what go would do? Run it with the word Preview: /go -Preview in
Claude Code, or agora-go.ps1 -Preview. Preview safely saves your work and then only SHOWS the
release plan - nothing goes live. When the plan looks right, run the real go. After any go, read
the summary it prints: anything listed under "Needs you" or "Held back" did NOT ship and is
waiting for a fix.

SHIP ONLY WHAT YOU CHANGED. There is a second, smaller shipping command for when go is too big a
hammer: now. In Claude Code type /now, or run
C:\Users\<you>\Desktop\Repositories\Agora\agora-devtools\agora-now.ps1. The difference is that
now never guesses. You give it the exact list of files to ship, and it ships those and nothing
else - every other project, every other loose file, and every teammate's unfinished work stay
exactly where they are. In practice you simply tell your AI "ship only what we changed in this
conversation" and it builds that list for you, because only the AI that made the edits knows
which files are its own. Use now whenever a second AI session is working at the same time as
you: go would scoop up that other session's half-written files and put them live, and now will
not. Both commands have a Preview, and the two are NOT the same: go's Preview saves your work
first and then shows the release plan, while now's Preview writes absolutely nothing at all -
not even a save. That makes now's Preview the safest way to look before you leap. One rule to
remember: if now tells you it is
holding the release back because there are loose files it did not write, that is the safety net
doing its job. Never add those files to your list just to force it through - wait for the other
session to finish, or park that work first.
`;

T['Parking unfinished work'] = String.raw`
WHEN TO PARK. Park whenever you have work that is real but not ready: a half-built feature, an
experiment, anything you do not want going live. Park it before you run go, before you stop for
the day, or before you switch to something else. In Claude Code type /park, or run
C:\Users\<you>\Desktop\Repositories\Agora\agora-devtools\agora-park.ps1. Give it a short name:
/park -Desc my-feature.

HOW PARK KEEPS WORK SAFE. Park takes your unfinished changes, saves them onto a specially-named
shelf branch (the name always starts with wip/), uploads that shelf to GitHub, and leaves your
folder clean. Because the shelf lives on GitHub, it survives anything that happens to your
laptop, and every teammate's machine can see it. And because every shipping script deliberately
IGNORES shelf branches, parked work can never accidentally go live - even if someone else runs
go. The ship even prints a line telling you how many parked branches it skipped, so shelved work
is never forgotten silently. The morning start-day report lists all parked work with its age and
nags when something has been parked for over a week.

GETTING PARKED WORK BACK. One command: run the same park script with -Restore and the name you
used, for example agora-park.ps1 -Restore my-feature (or tell your AI "restore my parked work
named my-feature" - the /park workflow understands restore). Restore checks that your folder has
no unrelated loose changes first (park or finish those before restoring - it never mixes two
pieces of work), then puts your shelved files back and, crucially, refreshes them with the
latest team code - so you continue on top of what the team has now, not on the old snapshot you
parked from. If your parked work clashes with something the team changed since, restore stops
and asks - your shelf on GitHub stays untouched, so nothing can be lost. When the work is
finished, run go and it ships like anything else. To see everything parked anywhere, run
agora-park.ps1 -List.
`;

T['If something goes wrong'] = String.raw`
MERGE CONFLICTS ARE NORMAL. Sometimes two people change the same file and the system stops and
asks for a human decision - that is a merge conflict, and it is routine, not a disaster. The
shipping script stops, leaves both versions marked in the file, and prints instructions. The
right move as a vibe coder: tell your AI "resolve this merge conflict, keep both sides' intent,
then continue the ship". The AI fixes the file, saves it, and re-runs the ship with its Resume
option. Your work is never lost during a conflict - it is already saved.

NEVER USE THE GITHUB UNBLOCK LINK. If a push is ever blocked because GitHub detected a secret (a
password or key) in the changes, GitHub offers a tempting "unblock" link. NEVER click it. The
block is protecting us: clicking it would publish a live secret to the internet. The correct
move: tell your AI "a secret got into my changes - remove it from the history properly and flag
the secret for rotation". The work itself is safe on your machine the whole time.

LET THE AI FIX IT, NEVER FORCE IT. General rule for every scary moment: the system stopping is
the system WORKING - a gate caught something. Do not look for force flags, do not delete things
to make errors go away, do not retry the same command harder. Describe the situation to your AI
and let it follow the documented fix. Every gate in this workspace has a written recovery path,
and the AI knows where to find it.
`;

T['The safety gates'] = String.raw`
THE STALENESS GATE. When work gets combined for a release, the system first checks: was this
work built on top of the LATEST team code, or on an old version? Work built on an old version is
called stale, and shipping it can silently erase things teammates already finished - that is how
published content once got reverted. The staleness gate simply refuses to combine stale work.
The fix is never to force it: the fix is to refresh the work with the latest code (your AI does
this in seconds - and the daily start-day habit prevents it entirely).

WHY THE GATE HAS NO BYPASS. There is deliberately NO override switch on the staleness gate. That
is a design decision: the check is exact - work either contains the latest code or it does not -
and refreshing is always possible and always safe. A bypass would only exist to ship something
known-dangerous. Earlier versions had it backwards (the exact check only warned while a fuzzy
check did the blocking); it was fixed, and it must never be demoted back to a warning.

THE REVERSION NET. One thing the staleness gate cannot see: work that WAS refreshed properly,
but where a human (or an AI) accidentally deleted teammates' code while fixing a conflict. The
reversion net is the backstop for that: if a release would delete files that exist in the
current version, or removes a suspiciously large amount of code, it stops and asks. Unlike the
staleness gate, this one has a confirmation option - because sometimes a big deletion is truly
intended - but it should be confirmed by a human who understands what is being deleted.
`;

T['What is actually live'] = String.raw`
DEPLOYS: LAST ONE WINS. When an app is put live (deployed), the newest deploy simply replaces
whatever was live before. There is no merging in production. So if a teammate deploys an older
version after you deployed a newer one, your version is silently gone from the live site - even
though your code is still safely in the project. That is why "my change disappeared" is usually
not a bug and not caching: someone deployed after you. The check is always: what version is
ACTUALLY serving right now? Your AI can check that in one command - ask "check what revision is
serving for this app".

A CLEAN FOLDER DOES NOT MEAN DONE. Your project folders can look perfectly clean while
production is behind. Team machines sync code around in the background, and code can LAND in the
project without being DEPLOYED to the live app. So never conclude "nothing to do here" from a
clean folder. When in doubt, ask your AI: "is the live version of this app up to date with the
project?".

THE WEBSITE DEPLOYS ITSELF. The website project is special: the moment anything lands on its
main branch, an automatic pipeline builds it and puts it live. There is no separate deploy step
and no staging site. Treat every website change as an immediate production change - and note the
blog robot (seo-pipeline) lands posts there daily, so the website updating "by itself" is
normal.
`;

T['The docs run the show'] = String.raw`
AGENTS.MD IS THE RULEBOOK. Every project folder contains a file called AGENTS.md - the operating
manual for that project. It says what the project is, how to change things safely, what the
known traps are, and how to verify and ship. The workspace also has a top-level AGENTS.md hub
describing the whole folder. These manuals are written FOR AI agents (and humans): every rule
your AI needs is in them. The CLAUDE.md files you might see are just pointers to the same
manuals - one rulebook, many doors.

POINT YOUR AI AT THE DOCS FIRST. The single biggest quality upgrade in your vibe coding: start
tasks by naming the project and telling the AI to read its manual. For example: "We are working
in the atrium project. Read atrium's AGENTS.md and the README of the unit you are about to
touch, then make this change: ...". An AI that reads the manual follows the house rules, uses
the right commands, and avoids every documented trap. An AI that explores freely burns time
rediscovering them - or falls into one.

UPDATE DOCS WHEN THINGS CHANGE. House rule, no exceptions: docs are part of done. If a change
alters how something works - a command, a rule, a connection - the matching manual gets updated
in the SAME change. When you vibe code a change like that, tell the AI: "update the AGENTS.md /
README for this in the same commit". That is what keeps the manuals trustworthy for the next
person - and for the next AI.
`;

T['Google Cloud basics'] = String.raw`
SERVICES AND JOBS, SIMPLY. All our apps run on Google Cloud, in one account (the project is
called agora-data-driven). Things that run there come in two flavors. A SERVICE is always on,
waiting for visitors - the portal, Sentinel, the website, this quiz app are services. A JOB
wakes up, does a task, and goes back to sleep - the blog robot's daily run and the dashboard
data refreshers are jobs. You rarely touch Google Cloud yourself; your AI does. But knowing the
two words makes every conversation clearer.

TWO REGIONS AND WHY IT MATTERS. Our apps physically run in two different Google data-center
regions: most things (Sentinel, the portal, the website, client dashboards) run in Singapore -
asia-southeast1 - while the quiz app and the blog robot run in the US - us-central1. Why care?
Because a Google Cloud command aimed at the wrong region does not show an error - it just finds
NOTHING, which looks exactly like "the app does not exist". If your AI ever says it cannot find
one of our apps, the first thing to ask is: "are you looking in the right region? Check the
region table in the root AGENTS.md".

SECRETS NEVER GO IN CODE. Passwords, API keys, and tokens live in one safe place called Secret
Manager, and the apps receive them at deploy time. They are NEVER written into project files.
The scripts even refuse to save files that look like secrets. If you ever see a real key sitting
in a file, treat it as an incident: tell your AI to remove it properly and flag the key for
rotation - and remember, never the GitHub unblock link.
`;

T['GitHub basics'] = String.raw`
THE ORG IS FOR AGORA ONLY. Our GitHub organization is called Agora-Data-Driven, and it holds
exactly the platform's own projects: the six product repos plus the agora-devtools toolbox.
Client projects, experiments, and personal repos do NOT belong in the org - they live on
personal accounts. When something client-specific shows up in the org, it gets moved out (that
cleanup already happened once; keep it clean).

PUSH PROTECTION SAVES YOU. GitHub scans everything we upload for secrets - passwords, keys,
tokens. If it finds one anywhere in the upload, it blocks the push. Important detail: it scans
the whole history of the upload, so just deleting the secret afterwards does NOT unblock you -
the secret has to be properly removed from the history, and the leaked key treated as burned
(rotated). And once more, because it matters: never click GitHub's unblock link.

PUSHING THE WEBSITE IS DEPLOYING IT. The website repo has automation attached: any push to its
main branch triggers two independent robots - one that checks the code (CI) and one that
actually deploys the site live. They do not wait for each other, so keep the checks green and
treat every website push as a production release. The blog robot pushes there daily, which is
why the website's history is full of commits nobody typed.
`;

T['Your AI lineup'] = String.raw`
KIMI IS YOUR DAILY DRIVER. Agora pays a flat monthly rate for Kimi, which means using it costs
us nothing extra per task. That makes Kimi the default for basically everything you do: routine
changes, following a cookbook recipe from the docs, running the daily workflow, writing tests,
drafting copy. The morning start-day script even launches your Claude Code session on Kimi
automatically. Default to Kimi without thinking about it.

FABLE IS THE EXPENSIVE EXPERT. Fable is the strongest model we use - and by far the most
expensive, billed by usage. Treat Fable like a specialist consultant: brought in for the big
stuff - whole-system audits, designing something new and complex, untangling a production
incident where a wrong answer costs more than the model time. Fable built and hardened the
workflow system you are learning right now. Do not run everyday tasks on Fable; that is burning
money a Kimi session would have handled.

WHEN TO ESCALATE. The ladder is: start on Kimi; escalate only when the task genuinely exceeds
it. Two honest triggers: the problem obviously spans many projects with subtle interactions, or
Kimi has failed the same task twice despite clear, well-pointed effort (docs given, task named
precisely). A failed cheap attempt costs almost nothing; starting expensive costs every time.
When you do escalate, bring the context: tell the stronger model what was tried and what
failed.
`;

T['Launching your AI'] = String.raw`
THE KIMI LAUNCHER. To start a Claude Code terminal session running on Kimi, use the launcher
script: C:\Users\<you>\Desktop\Repositories\Agora\agora-devtools\kimi-bypass-mode.ps1 (there is
a .cmd next to it to double-click). It fetches the shared team key automatically - you never
paste keys. Normally you do not even run it by hand: agora-start-day.ps1 ends by offering to
launch it for you. Copies of the launcher sit inside every project folder for convenience, but
those are auto-refreshed mirrors - if a launcher ever needs changing, it gets changed in
agora-devtools only.

CLAUDE-PANEL-MODE FOR VS CODE. The Claude panel INSIDE VS Code is separate from the terminal
session and needs its own switch:
C:\Users\<you>\Desktop\Repositories\Agora\agora-devtools\claude-panel-mode.ps1. Run it with the
word kimi to put the panel on Kimi, with claude to put it back on Anthropic's own models, or
with nothing to see which mode it is currently in. After switching, reload the VS Code window.
Note it switches the panel for every VS Code window on the machine.

TWO KIMI KEYS, NEVER MIXED. The team has TWO different Kimi keys for two different purposes: one
key powers your coding sessions (the launchers fetch it), and a different key powers the AI
features inside our products (the quiz app's tutor, Atrium's assistant). They are not
interchangeable, and the launchers and apps each fetch their own automatically. All you need to
remember: never copy a key from one place into another - if AI features misbehave, tell your
AI "check which Kimi key this is using" rather than swapping keys around.
`;

T['Vibe coding the right way'] = String.raw`
NAME THE APP, POINT AT THE DOCS. Start every task the same way: say WHICH project it is in, and
tell the AI to read that project's AGENTS.md first. "In the sentinel project - read its
AGENTS.md, then add X to the dashboard page." That one sentence is the difference between an AI
that follows the house rules and an AI that wanders. For routine changes, the docs even contain
step-by-step recipes (cookbooks) - an AI following a cookbook touches only the files the recipe
lists, which keeps changes small and safe.

MAKE THE AI VERIFY, NOT ASSUME. Hold your AI to the house habit: verify before you assume. After
it makes a change, it should run the project's checks (every AGENTS.md lists them). After it
ships, it should confirm what is actually serving. If it says "this is probably because of
caching", push back: "check what revision is live first". If it cannot find a cloud resource:
"check the region". The docs give the exact commands for all of these - a good session ends with
the AI SHOWING you the verification, not asserting success.

SHIP WITH GO, SHELVE WITH PARK. End every work session in one of exactly two states. Either the
work is DONE - pre-flight, then /go, then read the summary. Or the work is NOT done - /park it
with a short name. What you never do is walk away leaving loose, unshipped, unparked changes in
a folder: loose changes are what the next person's go sweeps into production by accident. Done
or parked - nothing in between.
`;

/* ------------------------------- the roadmap -------------------------------- */
const ROADMAP = {
  id: 'agora-developer-onboarding',
  title: 'Agora Developer Onboarding',
  program: PROGRAM,
  audience: 'everyone',
  source: 'manual',
  goal: 'Get anyone - technical or not - working safely and fluidly in the Agora folder with AI: know what each project is, run the daily start-day / park / go rhythm so work is never lost, understand the safety gates well enough to explain them, know just enough Google Cloud and GitHub to act sensibly, and drive AI cost-effectively (Kimi first, Fable last).',
  summary: 'Five stages, in order. Stage 2 is the contract - master it before shipping anything. The Resources tab holds the full Developer Onboarding presentation: studying it is enough to pass every quiz here. Quiz to 80 percent per stage before moving on.',
  stages: [
    {
      title: '1 · Know the estate',
      summary: 'The one folder, its seven projects, how they connect, and the special mastery-engine pair. After this you know what everything is and what never to touch.',
      items: [{ level: 'course', program: PROGRAM, track: TRACK, course: 'The Agora Estate', note: 'Open the real folder side by side while you study.' }],
    },
    {
      title: '2 · The daily contract',
      summary: 'THE stage that prevents lost work: start-day every morning, pre-flight before every go, park anything unfinished, and what to do when something stops.',
      items: [{ level: 'course', program: PROGRAM, track: TRACK, course: 'The Daily Workflow', note: 'Practice for real: run start-day, park a scratch change, list it, promote it.' }],
    },
    {
      title: '3 · Explain the why',
      summary: 'The staleness gate, the reversion net, last-one-wins deploys, and why the docs run the show. After this you can explain the system to a new teammate.',
      items: [{ level: 'course', program: PROGRAM, track: TRACK, course: 'Why the System Works', note: 'Test yourself: explain the two gates out loud, from memory.' }],
    },
    {
      title: '4 · The tools layer',
      summary: 'Just enough Google Cloud (services vs jobs, the two regions, secrets) and GitHub (org rules, push protection, website auto-deploy) to work confidently with your AI.',
      items: [{ level: 'course', program: PROGRAM, track: TRACK, course: 'The Tools Layer', note: 'The region table lives in the root AGENTS.md - know where, not by heart.' }],
    },
    {
      title: '5 · AI leverage',
      summary: 'Kimi by default, Fable as the expensive expert, the launchers (terminal and VS Code panel), and the three habits of good vibe coding.',
      items: [{ level: 'course', program: PROGRAM, track: TRACK, course: 'Working with AI', note: 'From tomorrow: start-day, Kimi session, name the app, point at the docs.' }],
    },
  ],
};

/* ------------------------------- wipe (Firestore) ---------------------------- */
async function wipeProgram() {
  const { Firestore } = await import('@google-cloud/firestore');
  const db = new Firestore({ projectId: 'agora-data-driven' });
  for (const col of ['questions', 'transcripts', 'topics']) {
    const snap = await db.collection(col).where('program', '==', PROGRAM).get();
    console.log('   wipe ' + col + ': ' + snap.size + ' docs');
    let batch = db.batch(); let n = 0;
    for (const doc of snap.docs) {
      batch.delete(doc.ref); n++;
      if (n % 400 === 0) { await batch.commit(); batch = db.batch(); }
    }
    await batch.commit();
  }
}

/* --------------------------------- stages ----------------------------------- */
async function main() {
  if (WIPE) { console.log('== 0. wipe existing agora_dev content (questions/transcripts/topics)'); await wipeProgram(); }

  console.log('== 1. program');
  const progs = await api('/api/programs');
  if ((progs?.programs || []).some((p) => p.id === PROGRAM)) console.log('   program exists - skipping create');
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
  console.log('   rows:', rows.length, 'report:', JSON.stringify(bulk).slice(0, 160));

  console.log('== 3. lesson transcripts');
  let tAdded = 0;
  for (const [course, lessons] of Object.entries(CURRICULUM)) {
    for (const lesson of Object.keys(lessons)) {
      const text = (T[lesson] || '').trim();
      if (!text) { console.log('   !! missing source text for lesson:', lesson); continue; }
      await api('/api/admin/transcripts', { method: 'POST', body: {
        program: PROGRAM, track: TRACK, course, lesson, title: 'Source: ' + lesson, text, source: 'onboarding-seed',
      } });
      tAdded++;
    }
  }
  console.log('   transcripts added:', tAdded);

  console.log('== 4. genjobs (kimi, 5 questions per topic, one job per course)');
  const jobs = [];
  for (const course of Object.keys(CURRICULUM)) {
    const j = await api('/api/admin/genjobs', { method: 'POST', body: {
      program: PROGRAM, track: TRACK, course,
      targetPerTopic: 5, provider: 'kimi', thinking: false,
      instructions: 'AUDIENCE: non-technical people who build with AI (vibe coders) - they do not read code. '
        + 'Write in plain everyday language; no jargon unless the source material itself explains it. '
        + 'Ground EVERY question strictly in the provided source material - never outside knowledge, never invented commands, paths, or names. '
        + 'Every question must test a PRACTICAL decision: what to run, what to say to the AI, what to do next, what never to do. '
        + 'Prefer short real-life scenarios (You sit down in the morning... / Your AI suggests... / A teammate asks...). '
        + 'Wrong answers must be believable bad habits (skipping start-day, clicking the unblock link, editing the offline copy, forcing past a gate, using Fable for routine work). '
        + 'Keep questions short and unambiguous; exactly one defensibly correct answer.',
    } });
    jobs.push({ course, id: j.job.id });
    console.log('   job', j.job.id, 'for', course);
  }

  console.log('== 5. stepping jobs to completion');
  for (const { course, id } of jobs) {
    for (let i = 0; i < 200; i++) {
      const r = await api('/api/admin/genjobs/' + id + '/step', { method: 'POST' });
      const jb = r.job || r;
      const pr = jb.progress || {};
      if (i % 5 === 0 || jb.status !== 'running') console.log('   [' + course + '] step', i + 1, jb.status, (pr.topicsDone ?? '?') + '/' + (pr.topicsTotal ?? '?'), 'q=' + (pr.questionsWritten ?? '?'));
      if (jb.status !== 'running' && jb.status !== 'queued') break;
    }
  }

  console.log('== 6. roadmap');
  const rm = await api('/api/admin/roadmaps', { method: 'POST', body: ROADMAP });
  console.log('   roadmap saved:', rm?.roadmap?.id || rm?.id || 'ok');

  console.log('== DONE');
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
