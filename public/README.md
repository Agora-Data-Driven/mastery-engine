# public/ — the entire frontend

Vanilla JS, **no framework, no bundler, no build step**: `server.js` serves this folder
statically (express.static, server.js:5625) and `app.js` is one IIFE. Edit a file, reload the
browser — that is the whole loop. Views are `<section>`s toggled by the `hidden` class.

Operating rules + repo-wide gotchas: [../AGENTS.md](../AGENTS.md). Frontend structure notes:
[../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## File map

| File | What it is | Greppable anchors |
|---|---|---|
| [index.html](index.html) | Learner shell (835 lines). Every view is a `<section id="xView" class="hidden">`. | `loginView` `:20` · `setupView` `:70` · `quizView` `:288` · `resultView` `:381` · `statsView` `:400` · `graphView` `:451` · `flashcardView` `:506` |
| [app.js](app.js) | The entire learner frontend (6.2k lines), one IIFE. | `const App = (() => {` `:2` · `show()`/`hide()` `:4`/`:5` (the whole "router") · embed-mode boot block `:8–35` (`?embed=assistant`/`?actions=1` URL-only, never persisted) · **NUL line `:559`** |
| [academy-admin.html](academy-admin.html) / [academy-admin.js](academy-admin.js) | The admin "Composing Room" (2.2k lines JS). **Server-gated**: an explicit route at server.js:5616 302s non-admins ahead of express.static. | station panels; typed-SSE consumers for the planners |
| [styles.css](styles.css) | All styling (1.9k lines). Dark theme, CSS custom properties. | — |
| [video-lessons.json](video-lessons.json) | Curated video list served by `/api/video-lessons`. | — |
| [agora-logo.png](agora-logo.png) / [logo.svg](logo.svg) | Branding assets. | — |

Data contract (Firestore doc → lib accessor → app.js consumer): the single table lives in
[../lib/README.md](../lib/README.md#data-contract--firestore-doc--lib-accessor--appjs-consumer).

## Cookbook

1. **Add a frontend view** — add `<section id="xView" class="hidden">` to `index.html` near its
   sibling sections; add a render function in `app.js` near the other view handlers; navigate
   with `show('xView')` / `hide(...)`. Reload the browser — done. No router, no build.
2. **Call an API** — use the in-file `api()` helper (see the catalog fetch at app.js:1753) so
   cookies (identity + AI engine choice) and error handling ride along.
3. **Consume a streamed response** — learner-facing prose (hint/explain/guides) arrives as a
   plain-text stream: read the fetch body incrementally and append. Typed SSE
   (`thinking`/`content`/`result`/`done`) is only for the admin planners in `academy-admin.js`.
   Server side of both: AGENTS.md §5 "Stream a response".
4. **Edit the NUL line** (app.js:559) — Node script only (`fs.readFileSync` → `replace` →
   `writeFileSync`); `Edit` cannot match it and the file must never be open-and-rewritten.
5. **Verify → deploy → re-port** — `node --check public\app.js` (syntax only — it parses fine
   as a script), reload locally (`npm run dev`), then
   `gcloud run deploy mastery-engine --source . --region us-central1 --project
   agora-data-driven`; confirm the serving revision changed (AGENTS.md §6); then re-port
   `../../mastery-engine-local` (`npm run port` there — **never hand-port**).

## Gotchas + do-not-touch

- 🔴 **NUL (0x00) byte** on app.js line **559** — Node-script edits only.
- 🔴 `?embed=assistant` and `?actions=1` must stay **URL-only, never persisted**: same-origin
  iframes share one `sessionStorage`, and persisting them flipped Sentinel's Academy tab into
  the assistant (the "stuck in the chat" bug). See the boot block, app.js:8–35.
- 🔴 The **root** `index.html` and `Code.gs` (repo root, NOT this folder) are the old
  Apps-Script tool, kept for reference and excluded from deploy via `.gcloudignore` — never
  "modernize", move, or delete them.
- `stashTexttNoSplit` (KaTeX code-chip-inside-`$…$`) and `renderVisual`/`compileExpr` (no-eval
  plot parser) are load-bearing workarounds — don't simplify them away.
- No React/Vue/bundler/TypeScript. Match the existing comment density.

## Status (volatile)

Live: `https://mastery-engine-585951669065.us-central1.run.app` · serving revision
`mastery-engine-00193-scv` · verified 2026-07-29.
