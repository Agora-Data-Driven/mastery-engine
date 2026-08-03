/* Light/dark for the Mastery Engine.
 *
 * Loaded SYNCHRONOUSLY in <head> (by index.html and academy-admin.html) so `data-theme` is on
 * <html> before the first paint — resolving it later gives every dark-mode user a white flash.
 * CSP here is frame-ancestors only, so an inline block would work too; a file keeps the two
 * shells from drifting apart.
 *
 * Where the theme comes from, in precedence order:
 *   1. `?theme=dark|light` on THIS document's URL. Sentinel appends it to every iframe it
 *      embeds (Professional / Philosophical / Spiritual / the Coach FAB) so the engine opens in
 *      whatever theme the host is wearing. Remembered in sessionStorage because in-app
 *      navigation drops the query string — and unlike `?program=` / `?embed=assistant` this is
 *      safe to share across same-origin frames: every frame on a Sentinel page is handed the
 *      same theme, so there is no per-frame value to leak (see the app.js boot IIFE for why
 *      that distinction matters).
 *   2. The learner's own toggle (localStorage) — top-level use, where nobody else owns the page.
 *   3. The OS preference, live-updated while the page is open.
 *
 * A host can also flip us at runtime by postMessage-ing {type:'agora-theme', theme}: Sentinel
 * does that from its own theme toggle, so the embedded engine changes with it instead of
 * staying light inside a dark page until the next reload.
 */
(function () {
  'use strict';
  var LOCAL = 'mastery-theme';       // the learner's own choice (top-level only)
  var SESSION = 'mastery-theme-host'; // the host's theme, for this tab's session
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function clean(t) { return t === 'dark' || t === 'light' ? t : ''; }
  function ss(key, val) {
    try { if (val === undefined) return sessionStorage.getItem(key); sessionStorage.setItem(key, val); }
    catch (e) { /* private mode — theming is cosmetic, never block boot */ }
    return null;
  }
  function ls(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); }
    catch (e) { /* as above */ }
    return null;
  }

  var param = '';
  try { param = clean(new URLSearchParams(location.search).get('theme')); } catch (e) { /* no URL API */ }
  if (param) ss(SESSION, param);

  var hosted = param || clean(ss(SESSION));

  function resolve() {
    return hosted || clean(ls(LOCAL)) || (media && media.matches ? 'dark' : 'light');
  }

  function apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.textContent = t === 'dark' ? '☀' : '☾';
      btn.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      btn.setAttribute('aria-label', btn.title);
    }
  }

  apply(resolve());

  // The OS preference only decides anything while neither the host nor the learner has spoken.
  if (media && media.addEventListener) {
    media.addEventListener('change', function () { if (!hosted && !clean(ls(LOCAL))) apply(resolve()); });
  }

  // The host owns the theme while we're inside its frame. Only the framing window may say so.
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'agora-theme' || !clean(d.theme)) return;
    if (window.parent === window || e.source !== window.parent) return;
    hosted = d.theme;
    ss(SESSION, hosted);
    apply(hosted);
  });

  window.AgoraTheme = {
    get: function () { return document.documentElement.getAttribute('data-theme') || 'light'; },
    set: function (t) { t = clean(t) || 'light'; ls(LOCAL, t); hosted = ''; apply(t); },
    toggle: function () { window.AgoraTheme.set(window.AgoraTheme.get() === 'dark' ? 'light' : 'dark'); },
  };

  // The toggle belongs to whoever owns the page. Embedded (Sentinel's tabs and Coach), the host
  // already has one in its topbar and a second control here would only let the two disagree.
  var embedded = window.parent !== window || !!param;
  if (embedded) return;
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('themeToggle')) return;
    var b = document.createElement('button');
    b.id = 'themeToggle';
    b.type = 'button';
    b.className = 'theme-toggle';
    b.onclick = window.AgoraTheme.toggle;
    document.body.appendChild(b);
    apply(window.AgoraTheme.get());
  });
})();
