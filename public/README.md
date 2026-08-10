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
| [app.js](app.js) | The entire learner frontend (6.4k lines), one IIFE. | `const App = (() => {` `:2` · `show()`/`hide()` `:4`/`:5` (the whole "router") · embed-mode boot block `:8–33` (`?embed=assistant` URL-only, never persisted) · **NUL line `:598`** · quiz replay (`markOptions` / `paintFeedback` / `showAnswered` / `prevQuestion` / `queueAfterCurrent`) · `toggleCardHighway` · report + admin question editor (`resetReportUI` … `saveQuestionEdit`) |
| [academy-admin.html](academy-admin.html) / [academy-admin.js](academy-admin.js) | The admin "Composing Room" (2.2k lines JS). **Server-gated**: an explicit route at server.js:5616 302s non-admins ahead of express.static. | station panels; typed-SSE consumers for the planners |
| [styles.css](styles.css) | All styling. Token-driven: a `:root` light palette, a `:root[data-theme="dark"]` retune of the SAME tokens, then a handful of dark rules for fills that carry white text. | `:root {` `:5` · `:root[data-theme="dark"]` (right after it) · tint families (`--violet-line`, `--amber-soft`, `--green-line`, …) |
| [theme.js](theme.js) | Light/dark resolution, loaded **synchronously in `<head>`** so `data-theme` lands before first paint. Order: `?theme=` (what Sentinel passes into every iframe) → the learner's own toggle → the OS. Also accepts `{type:"agora-theme"}` from the framing window. | `window.AgoraTheme` · `SESSION`/`LOCAL` keys |
| [video-lessons.json](video-lessons.json) | Curated resource list served by `/api/video-lessons`, shown in the **Resources** tab (UI label renamed from "Video Lessons" 2026-07-29; mode key `VIDEOS`, ids, and the API path stay canonical). Entries can be any link, not just videos — `agora_dev` links the onboarding presentation. | — |
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
4. **Render model-authored HTML** — there is exactly one place this happens and it must stay
   that way: `#vizModal`'s `<iframe id="vizFrame" sandbox="allow-scripts">` pointed at
   `/api/visuals/:id/html`. NO `allow-same-origin`, no `srcdoc`, no `innerHTML`. The frame is
   opaque-origin, so you cannot read into it — it postMessages its tab state up, and `app.js`
   accepts that only when `e.source === vizFrame.contentWindow`. Everything else the model
   writes still goes through `esc()`/`renderMarkdown()`. Rationale: [../AGENTS.md §7](../AGENTS.md).
5. **Let the assistant see something new on screen** — add it to `assistantContext()` (app.js).
   That single object is sent by BOTH assistant transports, so one edit covers typing, streaming,
   voice and Sentinel's Coach FAB; the server renders it in `assistantContextBlock()`
   ([../lib/gemini.js](../lib/gemini.js)), which is likewise shared by both.
6. **Edit the NUL line** (app.js:559) — Node script only (`fs.readFileSync` → `replace` →
   `writeFileSync`); `Edit` cannot match it and the file must never be open-and-rewritten.
7. **Change what the progress/roadmap trees score** — every ring, bar and % in both trees
   resolves through four places, and all four must agree or the tree and its hero disagree
   with each other: `rollupNode()` (accumulates the per-topic sums), `nodeStats()` /
   `nodeProgress()` (pick the numerator for the active metric), `metricColor()` (each metric
   needs its OWN bands — mastery is asymptotic, so accuracy's 80/60 would paint a healthy
   shelf red), and `overviewHtml()` (the hero, which relabels with the metric). The score
   itself is **not** computed here — the server ships `row.mastery` per catalog row, and the
   client only averages it. See AGENTS.md §3.
8. **Verify → deploy → re-port** — `node --check public\app.js` (syntax only — it parses fine
   as a script), reload locally (`npm run dev`), then
   `gcloud run deploy mastery-engine --source . --region us-central1 --project
   agora-data-driven`; confirm the serving revision changed (AGENTS.md §6); then re-port
   `../../mastery-engine-local` (`npm run port` there — **never hand-port**).

## Gotchas + do-not-touch

- 🔴 **NUL (0x00) byte** on app.js line **559** — Node-script edits only.
- 🔴 **`state.log` is a POSITIONAL parallel array to `state.questions`.** Splice one and you must
  splice the other (`queueAfterCurrent`), or every later result is filed against the wrong
  question. A question the learner steps BACK to is replayed read-only — never re-answerable.
  Full rationale: [../AGENTS.md §7](../AGENTS.md).
- 🔴 `?embed=assistant` must stay **URL-only, never persisted**: same-origin iframes share one
  `sessionStorage`, and persisting it flipped Sentinel's Academy tab into the assistant (the
  "stuck in the chat" bug). See the boot block, app.js:8–33. (`?actions=1` was removed
  2026-08-10 — nothing read it.)
- 🔴 That frame IS Sentinel's **Coach** — one assistant, two doors. `coachOn()` is forced true
  there; Sentinel hides its own FAB on pages that embed the engine. See
  [../AGENTS.md §7](../AGENTS.md).
- 🔴 The **root** `index.html` and `Code.gs` (repo root, NOT this folder) are the old
  Apps-Script tool, kept for reference and excluded from deploy via `.gcloudignore` — never
  "modernize", move, or delete them.
- `stashTexttNoSplit` (KaTeX code-chip-inside-`$…$`) and `renderVisual`/`compileExpr` (no-eval
  plot parser) are load-bearing workarounds — don't simplify them away.
- 🔴 **Colours belong in the token block**, not in a `[data-theme="dark"] .something` rule. The
  only legitimate dark-mode rules are fills that carry WHITE text: their base token is a *text*
  colour in dark mode (it has to lighten to stay readable on the canvas), so those few keep an
  explicit `--*-deep` fill. Anything else added as an override will drift.
- 🟡 **The Composing Room (`academy-admin.html`) is deliberately light-only** — it carries its own
  design system (`--pine`/`--paper`/`--surface`, ~36 literals inline) and does NOT load `theme.js`.
  Loading it there would half-darken the page. Theming it is its own piece of work.
- A `<canvas>` cannot resolve CSS custom properties, so the knowledge graph keeps a two-entry
  `GRAPH_INK` palette in `app.js`, read per draw off the live `data-theme`.
- No React/Vue/bundler/TypeScript. Match the existing comment density.

## Status (volatile)

Live: `https://mastery-engine-585951669065.us-central1.run.app` · serving revision
`mastery-engine-00193-scv` · verified 2026-07-29.
