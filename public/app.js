/* AGORA Mastery Engine - frontend controller */
const App = (() => {
  const $ = (id) => document.getElementById(id);
  const show = (id) => $(id).classList.remove('hidden');
  const hide = (id) => $(id).classList.add('hidden');
  const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

  const state = {
    catalog: [],
    authed: false,
    guest: false,
    mode: 'QUIZ',
    questions: [],
    idx: 0,
    score: 0,
    log: [],
  };

  /* ------------------------------- API ----------------------------------- */
  async function api(path, opts = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      ...opts,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${res.status})`);
    }
    return res.json();
  }

  /** POST that streams a text/plain response; calls onText(accumulated) per chunk. */
  async function apiStream(path, body, onText) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `Request failed (${res.status})`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let acc = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      acc += dec.decode(value, { stream: true });
      onText(acc);
    }
    return acc;
  }

  /* ---------------------- Offline cache + sync queue --------------------- */
  const LS = { catalog: 'agora.catalog', qbank: 'agora.qbank', qbankTs: 'agora.qbank.ts', queue: 'agora.logqueue' };
  const lsGet = (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const isNetworkError = (e) => !navigator.onLine || /Failed to fetch|NetworkError|load failed/i.test(e && e.message || '');

  // Cache the full question bank (once per day) so quizzes work offline.
  async function prefetchQuestionBank() {
    try {
      const ts = Number(localStorage.getItem(LS.qbankTs) || 0);
      if (lsGet(LS.qbank) && Date.now() - ts < 24 * 60 * 60 * 1000) return;
      const bank = await api('/api/questions/all');
      if (Array.isArray(bank) && lsSet(LS.qbank, bank)) localStorage.setItem(LS.qbankTs, String(Date.now()));
    } catch { /* offline or failed - keep any existing cache */ }
  }

  // Pick questions from the cached bank for a scope (offline fallback).
  function offlineSelect(scope, count) {
    const bank = lsGet(LS.qbank) || [];
    const all = (v) => !v || v === 'Review All' || v === '-- N/A --';
    let pool = bank;
    if (!all(scope.topic)) pool = bank.filter((q) => q.topic === scope.topic);
    else if (!all(scope.lesson)) pool = bank.filter((q) => q.lesson === scope.lesson);
    else if (!all(scope.course)) pool = bank.filter((q) => q.course === scope.course);
    else if (!all(scope.track)) pool = bank.filter((q) => q.track === scope.track);
    const n = Math.min(50, Math.max(1, parseInt(count, 10) || 5));
    return shuffle([...pool]).slice(0, n);
  }

  // Try the server for a quiz; on a network failure fall back to the cache.
  async function getQuiz(path, body) {
    try {
      const qs = await api(path, { method: 'POST', body: JSON.stringify(body) });
      state.offline = false; // served live - clear any stale offline flag
      return qs;
    } catch (e) {
      if (isNetworkError(e)) {
        const qs = offlineSelect(body, body.count);
        if (qs.length) { state.offline = true; return qs; }
      }
      throw e;
    }
  }

  // Multi-topic quiz (the searchable multi-select Live Quiz builder). Falls back
  // to the cached bank, filtered to the selected topics, when offline.
  async function getQuizMulti(topics, count) {
    try {
      const qs = await api('/api/quiz/multi', { method: 'POST', body: JSON.stringify({ topics, count }) });
      state.offline = false;
      return qs;
    } catch (e) {
      if (isNetworkError(e)) {
        const bank = lsGet(LS.qbank) || [];
        const set = new Set(topics);
        const n = Math.min(50, Math.max(1, parseInt(count, 10) || 5));
        const qs = shuffle(bank.filter((q) => set.has(q.topic))).slice(0, n);
        if (qs.length) { state.offline = true; return qs; }
      }
      throw e;
    }
  }

  function enqueueResults(results) {
    const q = lsGet(LS.queue) || [];
    q.push({ results, at: Date.now() });
    lsSet(LS.queue, q);
  }

  // Send any locally-queued results once we're back online + authed.
  async function flushQueue() {
    if (!state.authed) return;
    const q = lsGet(LS.queue) || [];
    if (!q.length) return;
    const remaining = [];
    for (const item of q) {
      try { await api('/api/quiz/log', { method: 'POST', body: JSON.stringify({ results: item.results }) }); }
      catch { remaining.push(item); }
    }
    lsSet(LS.queue, remaining);
    if (!remaining.length) {
      loadStreak();
      try { state.catalog = await api('/api/catalog'); lsSet(LS.catalog, state.catalog); } catch { /* ignore */ }
    }
  }

  /* ------------------------------- Boot ---------------------------------- */
  async function init() {
    tickClock();
    setInterval(tickClock, 1000);
    try {
      const [status, catalog] = await Promise.all([
        api('/api/auth/status'),
        api('/api/catalog'),
      ]);
      state.authed = !!status.authed;
      state.auth = status;
      state.catalog = catalog;
      lsSet(LS.catalog, catalog);
      localStorage.setItem('agora.authed', status.authed ? '1' : '0');
    } catch (e) {
      // Offline / server unreachable: fall back to cached catalog + auth.
      console.error(e);
      state.catalog = lsGet(LS.catalog) || [];
      state.authed = localStorage.getItem('agora.authed') === '1';
    }
    renderAuthUi();
    refreshModeChip();
    populateTracks();
    loadModels();
    loadStreak();
    prefetchQuestionBank();
    flushQueue();
    window.addEventListener('online', flushQueue);
    // Login-first: no landing page. Authed users go straight to the quiz
    // builder; everyone else sees the sign-in screen.
    if (state.authed) enterMastery();
    else showLogin();
  }

  /* ----------------------------- AI engine ------------------------------- */
  // Lets the user pick the cloud (Gemini) or a local Ollama model. The choice
  // is stored in cookies the server reads on every AI request, so it governs
  // flashcards, explanations, question generation AND the Study Assistant alike.
  //
  // The picker lives in the Study Assistant panel (⚙). These id lists keep the
  // helpers below generic, so re-mirroring the choice into additional dropdowns
  // (should the picker ever return elsewhere) is a one-line change.
  const AI_ENGINE_SELECTS = ['asstEngineSel'];
  const AI_THINKING_WRAPS = ['asstThinkingWrap'];
  const AI_THINKING_CHECKS = ['asstThinkingChk'];
  const AI_DIFFICULTY_SELECTS = ['asstDifficultySel', 'fcDifficultySel', 'notesDifficultySel'];

  function setAiChoice(provider, model) {
    document.cookie = `aiProvider=${encodeURIComponent(provider)}; path=/; max-age=31536000; samesite=lax`;
    document.cookie = `aiModel=${encodeURIComponent(model || '')}; path=/; max-age=31536000; samesite=lax`;
    localStorage.setItem('aiProvider', provider);
    localStorage.setItem('aiModel', model || '');
    // Mirror the selection into every model dropdown so both stay in sync.
    const val = `${provider}::${model || ''}`;
    AI_ENGINE_SELECTS.forEach((id) => {
      const el = $(id);
      if (el && el.value !== val) el.value = val;
    });
    syncThinkingVisibility(provider);
  }

  // Extended thinking applies to the cloud engines that support it (Gemini and
  // DeepSeek V4 — whose Flash model defaults to thinking ON, hence slow); hide the
  // toggle for the local engines that don't take the lever.
  function syncThinkingVisibility(provider) {
    const supported = provider === 'gemini' || provider === 'deepseek';
    AI_THINKING_WRAPS.forEach((id) => $(id)?.classList.toggle('hidden', !supported));
  }

  // Persist the extended-thinking choice (default ON, so nothing regresses).
  // The server reads the aiThinking cookie; 'off' disables Gemini thinking for
  // faster, cheaper generation.
  function setThinking(on) {
    document.cookie = `aiThinking=${on ? 'on' : 'off'}; path=/; max-age=31536000; samesite=lax`;
    localStorage.setItem('aiThinking', on ? 'on' : 'off');
    // Keep both toggle checkboxes reflecting the same state.
    AI_THINKING_CHECKS.forEach((id) => {
      const el = $(id);
      if (el && el.checked !== on) el.checked = on;
    });
  }

  // Change handlers take the source control's id (the panel's onchange passes it),
  // so the same helpers can drive any dropdown we mirror the choice across.
  function onAiEngineChange(selId) {
    const el = $(selId || 'asstEngineSel');
    if (!el) return;
    const [provider, model] = el.value.split('::');
    setAiChoice(provider, model);
  }

  function onThinkingChange(chkId) {
    const el = $(chkId || 'asstThinkingChk');
    if (el) setThinking(!!el.checked);
  }

  // Persist the question-difficulty choice (default 'auto', which ramps from the
  // learner's per-topic history server-side). The server reads the `difficulty`
  // cookie in difficultyChoice().
  const DIFFICULTIES = ['auto', 'core', 'balanced', 'challenge'];
  function setDifficulty(level) {
    const val = DIFFICULTIES.includes(level) ? level : 'auto';
    document.cookie = `difficulty=${val}; path=/; max-age=31536000; samesite=lax`;
    localStorage.setItem('difficulty', val);
    AI_DIFFICULTY_SELECTS.forEach((id) => {
      const el = $(id);
      if (el && el.value !== val) el.value = val;
    });
  }

  function onDifficultyChange(selId) {
    const el = $(selId || 'asstDifficultySel');
    if (el) setDifficulty(el.value);
  }

  // Friendly names for the known cloud models (falls back to "Provider: id").
  const MODEL_LABELS = {
    'gemini-2.5-flash': 'Cloud · Gemini 2.5 Flash (fast)',
    'gemini-2.5-pro': 'Cloud · Gemini 2.5 Pro (best quality)',
    'deepseek-v4-flash': 'DeepSeek · V4 Flash (fast)',
    'deepseek-v4-pro': 'DeepSeek · V4 Pro (best quality)',
  };
  function prettyModel(providerLabel, model) {
    return MODEL_LABELS[model] || `${providerLabel}: ${model}`;
  }

  async function loadModels() {
    // Both the home card and the assistant panel host a model dropdown; bail
    // only if neither is present.
    const sels = AI_ENGINE_SELECTS.map((id) => $(id)).filter(Boolean);
    if (!sels.length) return;
    try {
      const r = await api('/api/models');
      const opts = [];
      for (const p of r.providers || []) {
        for (const m of p.models || []) {
          opts.push({ provider: p.id, model: m, label: prettyModel(p.label, m) });
        }
      }
      if (!opts.length) return;
      const optionsHtml = opts
        .map((o) => `<option value="${esc(o.provider)}::${esc(o.model)}">${esc(o.label)}</option>`)
        .join('');
      sels.forEach((sel) => { sel.innerHTML = optionsHtml; });

      // Restore the saved choice, falling back to the first available option
      // (so a previously-picked model resets to cloud when unavailable).
      // setAiChoice mirrors the value into every dropdown.
      const savedP = localStorage.getItem('aiProvider') || 'gemini';
      const savedM = localStorage.getItem('aiModel') || '';
      const match = opts.find((o) => o.provider === savedP && (!savedM || o.model === savedM)) || opts[0];
      setAiChoice(match.provider, match.model);

      // Restore the extended-thinking toggle (default ON); setThinking mirrors
      // the state into every checkbox.
      setThinking(localStorage.getItem('aiThinking') !== 'off');
      // Restore the difficulty choice (default 'auto').
      setDifficulty(localStorage.getItem('difficulty') || 'auto');
    } catch (e) {
      console.error(e);
    }
  }

  function tickClock() {
    const el = $('clock');
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString([], {
      hour: 'numeric', minute: '2-digit', second: '2-digit',
    });
  }

  /* ------------------------------- Streak -------------------------------- */
  // A motivating "N day streak" badge: consecutive days with logged activity.
  async function loadStreak() {
    const chip = $('streakChip');
    if (!chip) return;
    if (!state.authed) { chip.classList.add('hidden'); return; }
    try {
      const r = await api('/api/streak');
      renderStreak(r.streak);
    } catch (e) {
      console.error(e);
    }
  }

  function renderStreak(days) {
    const chip = $('streakChip');
    if (!chip) return;
    if (!days || days < 1) { chip.classList.add('hidden'); return; }
    chip.textContent = (days === 1 ? '1 day streak' : days + ' day streak');
    chip.classList.remove('hidden');
  }

  function refreshModeChip() {
    const chip = $('modeChip');
    if (!chip) return;
    if (state.authed && !state.guest && currentView() !== 'home') {
      chip.className = 'mode-chip mastery';
      $('modeChipText').textContent = 'Mastery';
    } else {
      chip.className = 'mode-chip guest';
      $('modeChipText').textContent = state.guest ? 'Guest' : 'Visitor';
    }
    // Reflect unlocked state on the landing card.
    const btn = $('masteryEntryBtn');
    if (btn) btn.textContent = state.authed ? 'Open Mastery Mode' : 'Sign in';
    const statsBtn = $('statsEntryBtn');
    if (statsBtn) statsBtn.classList.toggle('hidden', !state.authed);
  }

  const VIEWS = ['loginView', 'setupView', 'quizView', 'resultView', 'statsView', 'flashcardView', 'graphView', 'notesView'];

  // Flashcards are enabled for every course/lesson (must stay in sync with
  // server.js flashcardsEnabledFor). To scope back to specific courses, make this
  // a regex test, e.g. (c) => /\bcalculus\b/i.test(c || '').
  const flashcardsEnabled = (course) => !!(course && course.trim());

  function currentView() {
    for (const v of VIEWS) {
      if (!$(v).classList.contains('hidden')) return v.replace('View', '');
    }
    return 'login';
  }

  // Whether the signed-in user is an admin (gates the inline "Fix format" buttons).
  const isAdmin = () => !!(state.auth && state.auth.admin);

  function showOnly(view) {
    VIEWS.forEach((v) => (v === view ? show(v) : hide(v)));
    refreshModeChip();
    refreshAssistantDock();
  }

  // The floating assistant + cost widget are available on every view once signed
  // in (hidden on the login screen).
  function refreshAssistantDock() {
    const dock = $('assistantDock');
    if (!dock) return;
    const on = state.authed && currentView() !== 'login';
    dock.classList.toggle('hidden', !on);
    if (on) refreshCost();
    else $('assistantPanel')?.classList.add('hidden');
  }

  /* --------------------------- Cascading menus --------------------------- */
  // Pedagogical course order within a track (foundations first). Course names are
  // globally unique across tracks, so one flat list is enough; anything not listed
  // falls back to alphabetical, after the ranked ones. Edit this list to re-sequence.
  const COURSE_ORDER = [
    // Mathematics — build up the foundations, then the applied "for ML" courses last.
    'Trigonometry',
    'College Algebra',
    'Precalculus',
    'Calculus',
    'Statistics and Probability',
    'Linear Algebra for ML',
    'Calculus for ML',
    'Prob & Stats for ML',
    // Programming Foundations — beginner to advanced.
    'Python Syntax & Logic Foundations',
    'Python Data Types',
    'Efficient Iteration & Memory Optimization',
    'Object-Oriented Programming (OOP) in Python',
    'Modularity, Packages & Robust Code',
    'Data Structures and Algorithms',
  ];
  const COURSE_RANK = new Map(COURSE_ORDER.map((name, i) => [name, i]));
  // Order two course names by curriculum rank, then alphabetically as a fallback.
  function byCourseName(a, b) {
    const ra = COURSE_RANK.has(a) ? COURSE_RANK.get(a) : Infinity;
    const rb = COURSE_RANK.has(b) ? COURSE_RANK.get(b) : Infinity;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  function uniqSorted(arr) {
    return [...new Set(arr)].filter(Boolean).sort();
  }

  function populateTracks() {
    const tracks = uniqSorted(state.catalog.map((r) => r.track));
    $('trackSel').innerHTML = tracks.map((t) => `<option>${esc(t)}</option>`).join('');
    filterCourses();
  }

  function filterCourses() {
    const t = $('trackSel').value;
    const courses = [...new Set(state.catalog.filter((r) => r.track === t).map((r) => r.course))]
      .filter(Boolean).sort(byCourseName);
    $('courseSel').innerHTML =
      '<option value="Review All">Review Full Track</option>' +
      courses.map((c) => `<option>${esc(c)}</option>`).join('');
    filterLessons();
  }

  function filterLessons() {
    const c = $('courseSel').value;
    if (c !== 'Review All') {
      const ls = uniqSorted(state.catalog.filter((r) => r.course === c).map((r) => r.lesson));
      $('lessonSel').innerHTML =
        '<option value="Review All">Review Full Course</option>' +
        ls.map((l) => `<option>${esc(l)}</option>`).join('');
    } else {
      $('lessonSel').innerHTML = '<option value="-- N/A --">N/A</option>';
    }
    filterTopics();
  }

  function filterTopics() {
    const l = $('lessonSel').value;
    if (l !== 'Review All' && l !== '-- N/A --') {
      const ts = uniqSorted(state.catalog.filter((r) => r.lesson === l).map((r) => r.topic));
      $('topicSel').innerHTML =
        '<option value="Review All">Review Full Lesson</option>' +
        ts.map((t) => `<option>${esc(t)}</option>`).join('');
    } else {
      $('topicSel').innerHTML = '<option value="-- N/A --">N/A</option>';
    }
  }

  function selection() {
    return {
      track: $('trackSel').value,
      course: $('courseSel').value,
      lesson: $('lessonSel').value,
      topic: $('topicSel').value,
      count: $('count').value,
    };
  }

  /* ------------------------------ Mode flow ------------------------------ */
  function startGuest() {
    state.guest = true;
    configureSetupForMode();
    showOnly('setupView');
  }

  function enterMastery() {
    if (state.authed) {
      state.guest = false;
      configureSetupForMode();
      showOnly('setupView');
    } else {
      showLogin();
    }
  }

  function configureSetupForMode() {
    const mastery = state.authed && !state.guest;
    $('genModeWrap').classList.toggle('hidden', !mastery);
    // Mastery users land on "My Progress" (their dashboard); guests (no mode
    // switcher) fall back to the quiz builder so they have something to do.
    setMode(mastery ? 'PROGRESS' : 'QUIZ');
  }

  function setMode(mode) {
    state.mode = mode;
    const mastery = state.authed && !state.guest;
    const isProgress = mode === 'PROGRESS';

    document.querySelectorAll('#modeSegment button').forEach((b) =>
      b.classList.toggle('active', b.dataset.mode === mode)
    );

    // Toggle the two panels of the setup card.
    $('quizBuilder').classList.toggle('hidden', isProgress);
    $('progressPanel').classList.toggle('hidden', !isProgress);
    // Mastery Quiz / Flashcards CTAs are available to mastery users on EVERY tab
    // (including My Progress) — they sit above the mode segment so they render on all.
    $('priorityBtnRow').classList.toggle('hidden', !mastery);

    if (isProgress) renderProgressTree();
    else updateSetupCopy();
  }

  function updateSetupCopy() {
    const isGen = state.mode === 'GEN';
    // Live Quiz uses the multi-select tree; Generate keeps the single-scope selects.
    $('multiSelect').classList.toggle('hidden', isGen);
    $('cascadeSelect').classList.toggle('hidden', !isGen);
    if (isGen) {
      $('setupTitle').textContent = 'Generate mastery questions';
      $('setupSub').textContent = 'Pick a scope and let the Wise Teacher write harder questions into your bank.';
      $('launchBtn').textContent = 'Generate Questions';
    } else {
      $('setupTitle').textContent = 'Build your quiz';
      $('setupSub').textContent = 'Search and tick any mix of tracks, courses, and units to quiz on.';
      $('launchBtn').textContent = 'Launch Engine';
      renderMultiTree();
    }
  }

  function goHome() {
    state.guest = false;
    if (state.authed) {
      configureSetupForMode();
      showOnly('setupView');
    } else {
      showLogin();
    }
  }

  function showLogin() {
    showOnly('loginView');
    const p = $('passwordInput');
    if (p) setTimeout(() => p.focus(), 50);
  }

  /* -------------------------------- Auth --------------------------------- */
  // Show the Google sign-in button when configured, and the admin "acting as" bar for admins.
  async function renderAuthUi() {
    try {
      const g = await api('/api/auth/google/enabled');
      if (g.enabled) $('googleWrap')?.classList.remove('hidden');
    } catch {
      /* ignore — button stays hidden */
    }
    const ctx = state.auth || {};
    const bar = $('adminBar');
    if (!bar) return;
    if (ctx.admin) {
      bar.classList.remove('hidden');
      $('adminBarText').textContent = ctx.actingAs
        ? `Acting as ${ctx.effective}`
        : `Admin${ctx.email ? ' · ' + ctx.email : ''} — viewing ${ctx.effective}`;
      $('adminStopActing').classList.toggle('hidden', !ctx.actingAs);
    } else {
      bar.classList.add('hidden');
    }
  }

  // Admin: act as another user (impersonation), or stop and return to the default account.
  async function actAs() {
    const email = window.prompt('Act as which user? Enter their Google email:');
    if (!email) return;
    try {
      await api('/api/auth/act-as', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
      window.location.reload();
    } catch (e) {
      window.alert(e.message);
    }
  }
  async function stopActing() {
    try {
      await api('/api/auth/stop-acting', { method: 'POST' });
      window.location.reload();
    } catch (e) {
      window.alert(e.message);
    }
  }

  // Admin: run the one-time math-track merge (idempotent; safe to re-run).
  async function mergeMath() {
    if (!confirm('Merge "Math Foundations" and "Mathematics for Machine Learning" into a single "Mathematics" track? This re-keys mastery stats and is safe to re-run.')) return;
    const btn = $('adminMergeMath');
    if (btn) { btn.disabled = true; btn.textContent = 'Merging…'; }
    try {
      const r = await api('/api/admin/merge-math', { method: 'POST' });
      alert(`Done. Topics moved: ${r.topicsMoved}, stats moved: ${r.statsMoved}, decks moved: ${r.decksMoved}.`);
      window.location.reload();
    } catch (e) {
      alert('Merge failed: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Merge Math'; }
    }
  }

  // Admin: sweep every shared flashcard and fix broken code/math formatting.
  // Loops the endpoint until no candidates remain (each call handles a batch).
  async function fixAllFormats() {
    if (!confirm('Scan every flashcard and fix broken code/math formatting? This rewrites the shared cards for all users. Meaning is preserved; safe to re-run.')) return;
    const btn = $('adminFixFormats');
    if (btn) { btn.disabled = true; btn.textContent = 'Fixing…'; }
    let fixed = 0;
    try {
      for (let pass = 0; pass < 30; pass++) {
        const r = await api('/api/admin/fix-flashcard-formats', { method: 'POST' });
        fixed += r.fixed || 0;
        if (btn) btn.textContent = `Fixing… (${fixed})`;
        // Stop once a pass fixes nothing (remaining candidates are false positives).
        if (!r.fixed) break;
      }
      alert(`Done. Cards fixed: ${fixed}.`);
      window.location.reload();
    } catch (e) {
      alert('Fix formats failed: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Fix Card Formats'; }
    }
  }

  // Admin: sweep every shared quiz question and fix broken code/math formatting
  // (and strip raw HTML). Loops the endpoint until no candidates remain.
  async function fixAllQuestionFormats() {
    if (!confirm('Scan every quiz question and fix broken code/math formatting (and stray HTML)? This rewrites the shared questions for all users. Meaning is preserved; safe to re-run.')) return;
    const btn = $('adminFixQuestionFormats');
    if (btn) { btn.disabled = true; btn.textContent = 'Fixing…'; }
    let fixed = 0;
    try {
      for (let pass = 0; pass < 30; pass++) {
        const r = await api('/api/admin/fix-question-formats', { method: 'POST' });
        fixed += r.fixed || 0;
        if (btn) btn.textContent = `Fixing… (${fixed})`;
        // Stop once a pass fixes nothing (remaining candidates are false positives).
        if (!r.fixed) break;
      }
      alert(`Done. Questions fixed: ${fixed}.`);
      window.location.reload();
    } catch (e) {
      alert('Fix question formats failed: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Fix Question Formats'; }
    }
  }

  async function submitPassword() {
    const btn = $('authSubmit');
    btn.disabled = true;
    $('authError').textContent = '';
    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password: $('passwordInput').value }),
      });
      state.authed = true;
      loadStreak();
      enterMastery();
    } catch (e) {
      $('authError').textContent = e.message;
    } finally {
      btn.disabled = false;
    }
  }

  /* ------------------------------ Launchers ------------------------------ */
  function setLoading(on) {
    $('setupLoader').classList.toggle('hidden', !on);
    $('launchBtn').disabled = on;
    $('priorityBtn').disabled = on;
    $('priorityCardsBtn').disabled = on;
  }

  async function launchManual() {
    setLoading(true);
    try {
      if (state.mode === 'GEN') {
        const r = await api('/api/generate', { method: 'POST', body: JSON.stringify(selection()) });
        let msg = `Generated ${r.created} question(s) across ${r.topics} topic(s).`;
        if (r.errors && r.errors.length) msg += `\n\nSome failed:\n` + r.errors.join('\n');
        alert(msg);
      } else {
        // Live Quiz: the multi-select tree's union of ticked topics.
        const topics = [...ms.selected];
        if (!topics.length) { alert('Pick at least one track, course, or unit to quiz on.'); return; }
        const count = clampCountClient($('count').value);
        const qs = await getQuizMulti(topics, count);
        startQuiz(qs);
      }
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function launchPriority() {
    setLoading(true);
    try {
      const qs = await getQuiz('/api/quiz/priority', selection());
      startQuiz(qs);
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  // Same weakest-topic logic as the Mastery Quiz, but for flashcards: opens ONE
  // review deck mixing cards from the learner's weakest topics across all tracks.
  async function launchPriorityCards() {
    if (!state.authed) { showLogin(); return; }
    setLoading(true);
    try {
      await openMasteryDeck();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ------------------- Quiz from my notes (BYO content) ------------------ */
  // Upload documents and/or paste text; the same Wise Teacher engine writes a
  // quiz on exactly that material. PDFs/images are read by the model server-side;
  // text/markdown files are decoded directly. The resulting quiz is ad-hoc: it
  // isn't banked or logged to mastery (no catalog topic), so it runs with
  // startQuiz({ adhoc: true }).
  const notes = { files: [], wired: false };
  const NOTES_MAX_FILES = 12;
  const NOTES_MAX_BYTES = 16 * 1024 * 1024; // keep in step with server CONTENT_MAX_FILE_BYTES

  function openNotesQuiz() {
    if (!state.authed) { showLogin(); return; }
    state.guest = false;
    notes.files = [];
    $('notesText').value = '';
    $('notesContext').value = '';
    $('notesCount').value = '8';
    $('notesError').textContent = '';
    const warn = $('notesNotes'); warn.textContent = ''; warn.classList.add('hidden');
    $('notesLoader').classList.add('hidden');
    $('notesGenBtn').disabled = false;
    renderNotesFiles();
    wireNotesDrop();
    // Reflect the shared difficulty choice (default 'auto') in this panel's select.
    setDifficulty(localStorage.getItem('difficulty') || 'auto');
    showOnly('notesView');
  }

  // Wire the file input + drag-and-drop once (the elements persist across opens).
  function wireNotesDrop() {
    if (notes.wired) return;
    notes.wired = true;
    const input = $('notesFiles');
    const drop = $('notesDrop');
    if (input) input.addEventListener('change', (e) => { addNotesFiles(e.target.files); input.value = ''; });
    if (drop) {
      ['dragenter', 'dragover'].forEach((ev) =>
        drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
      ['dragleave', 'dragend'].forEach((ev) =>
        drop.addEventListener(ev, () => drop.classList.remove('drag')));
      drop.addEventListener('drop', (e) => {
        e.preventDefault();
        drop.classList.remove('drag');
        if (e.dataTransfer && e.dataTransfer.files) addNotesFiles(e.dataTransfer.files);
      });
    }
  }

  async function addNotesFiles(fileList) {
    const arr = Array.from(fileList || []);
    $('notesError').textContent = '';
    for (const f of arr) {
      if (notes.files.length >= NOTES_MAX_FILES) {
        $('notesError').textContent = `You can add up to ${NOTES_MAX_FILES} files.`;
        break;
      }
      if (f.size > NOTES_MAX_BYTES) {
        $('notesError').textContent = `"${f.name}" is over 16 MB and was skipped.`;
        continue;
      }
      try {
        const dataBase64 = await fileToBase64(f);
        notes.files.push({ name: f.name, mime: f.type || '', size: f.size, dataBase64 });
      } catch {
        $('notesError').textContent = `Couldn't read "${f.name}".`;
      }
    }
    renderNotesFiles();
  }

  // Read a File to raw base64 (strip the "data:...;base64," prefix the reader adds).
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result || '');
        const comma = s.indexOf(',');
        resolve(comma >= 0 ? s.slice(comma + 1) : s);
      };
      r.onerror = () => reject(r.error || new Error('read failed'));
      r.readAsDataURL(file);
    });
  }

  function fileGlyph(f) {
    const n = (f.name || '').toLowerCase();
    const m = (f.mime || '').toLowerCase();
    if (m.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic|heif)$/.test(n)) return '🖼️';
    if (m === 'application/pdf' || /\.pdf$/.test(n)) return '📄';
    return '📝';
  }

  function fmtBytes(b) {
    if (b == null) return '';
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return Math.round(b / 1024) + ' KB';
    return (b / 1024 / 1024).toFixed(1) + ' MB';
  }

  function renderNotesFiles() {
    const wrap = $('notesFileList');
    if (!notes.files.length) { wrap.innerHTML = ''; wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    wrap.innerHTML = notes.files.map((f, i) => `
      <div class="notes-file">
        <span class="nf-ico" aria-hidden="true">${fileGlyph(f)}</span>
        <span class="nf-name" title="${esc(f.name)}">${esc(f.name)}</span>
        <span class="nf-size">${fmtBytes(f.size)}</span>
        <button class="nf-x" title="Remove" aria-label="Remove ${esc(f.name)}" onclick="App.removeNotesFile(${i})">×</button>
      </div>`).join('');
  }

  function removeNotesFile(i) {
    notes.files.splice(i, 1);
    renderNotesFiles();
  }

  async function generateNotesQuiz() {
    const text = $('notesText').value.trim();
    if (!notes.files.length && !text) {
      $('notesError').textContent = 'Add at least one file or paste some text first.';
      return;
    }
    const count = Math.min(30, Math.max(1, parseInt($('notesCount').value, 10) || 8));
    const extraContext = $('notesContext').value.trim();
    const btn = $('notesGenBtn');
    btn.disabled = true;
    $('notesError').textContent = '';
    const warn = $('notesNotes'); warn.textContent = ''; warn.classList.add('hidden');
    $('notesLoader').classList.remove('hidden');
    try {
      const r = await api('/api/generate/from-content', {
        method: 'POST',
        body: JSON.stringify({
          texts: text ? [text] : [],
          files: notes.files.map((f) => ({ name: f.name, mime: f.mime, dataBase64: f.dataBase64 })),
          count, extraContext,
        }),
      });
      if (!r.questions || !r.questions.length) throw new Error('No questions came back. Try adding more material.');
      startQuiz(r.questions, { adhoc: true });
    } catch (e) {
      $('notesError').textContent = 'Could not build the quiz: ' + e.message;
    } finally {
      btn.disabled = false;
      $('notesLoader').classList.add('hidden');
    }
  }

  /* ------------------------------- Stats --------------------------------- */
  function openStats() {
    if (!state.authed) { showLogin(); return; }
    state.guest = false;
    showOnly('statsView');
    loadStats();
  }

  async function loadStats() {
    $('statsBody').classList.add('hidden');
    $('statsError').textContent = '';
    $('statsLoader').classList.remove('hidden');
    try {
      const s = await api('/api/stats');
      renderStats(s);
      $('statsBody').classList.remove('hidden');
    } catch (e) {
      $('statsError').textContent = 'Could not load progress: ' + e.message;
    } finally {
      $('statsLoader').classList.add('hidden');
    }
  }

  function tile(value, label, sub) {
    return `<div class="stat-tile">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${esc(label)}</div>
      ${sub ? `<div class="stat-sub">${esc(sub)}</div>` : ''}
    </div>`;
  }

  // Accuracy to colour: red (weak) ramps to green (strong).
  function accColor(pct) {
    if (pct == null) return 'var(--faint)';
    if (pct >= 80) return 'var(--green)';
    if (pct >= 60) return 'var(--warning)';
    return 'var(--error)';
  }

  function renderStats(s) {
    const o = s.overview;
    $('statsSub').textContent = o.attempted
      ? `You've practised ${o.attempted} of ${o.topics} topics. Here's where to focus next.`
      : 'No attempts logged yet. Run a Mastery quiz and your progress will appear here.';

    $('statTiles').innerHTML = [
      tile(o.overallAccuracy == null ? '-' : o.overallAccuracy + '%', 'Overall accuracy',
        o.totalAttempts ? `${o.totalAttempts} questions answered` : 'no attempts yet'),
      tile(o.coverage + '%', 'Topic coverage', `${o.attempted} of ${o.topics} practised`),
      tile(o.neverAttempted, 'Untouched topics', 'never attempted'),
      tile(o.totalAttempts, 'Total attempts', 'all-time'),
    ].join('');

    // Weakest topics table
    const wb = $('weakBody');
    if (!s.weakest.length) {
      wb.innerHTML = `<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:24px">Nothing practised yet.</td></tr>`;
    } else {
      wb.innerHTML = s.weakest.map((t) => {
        const last = t.daysSince == null ? '-'
          : t.daysSince < 1 ? 'today'
          : `${Math.round(t.daysSince)}d`;
        return `<tr>
          <td><strong>${esc(t.topic)}</strong></td>
          <td style="color:var(--muted)">${esc(t.course)}</td>
          <td style="color:${accColor(t.accuracy)};font-weight:700">${t.accuracy == null ? '-' : t.accuracy + '%'}</td>
          <td style="color:var(--muted)">${t.attempts}</td>
          <td style="color:var(--muted)">${last}</td>
          <td>${bar(t.priority, 'var(--error)')}</td>
        </tr>`;
      }).join('');
    }

    // By-course accuracy bars
    const cb = $('courseBars');
    cb.innerHTML = s.byCourse.length
      ? s.byCourse.map((c) => `
        <div class="course-row">
          <div class="course-meta">
            <span class="course-name">${esc(c.course)}</span>
            <span class="course-track">${esc(c.track)} · ${c.attempted}/${c.topics} topics</span>
          </div>
          <div class="course-bar-wrap">
            ${bar(c.accuracy, accColor(c.accuracy))}
            <span class="course-pct" style="color:${accColor(c.accuracy)}">${c.accuracy}%</span>
          </div>
        </div>`).join('')
      : `<p class="section-sub" style="margin:0">No practised courses yet.</p>`;

    // Activity chart (last 14 days)
    const max = Math.max(1, ...s.daily.map((d) => d.total));
    $('activityChart').innerHTML = s.daily.map((d) => {
      const h = Math.round((d.total / max) * 100);
      const acc = d.total ? Math.round((d.correct / d.total) * 100) : null;
      const label = d.day.slice(5); // MM-DD
      const title = d.total ? `${d.day}: ${d.correct}/${d.total} correct (${acc}%)` : `${d.day}: no activity`;
      return `<div class="act-col" title="${title}">
        <div class="act-bar" style="height:${Math.max(h, d.total ? 6 : 2)}%;background:${d.total ? accColor(acc) : 'var(--bg-2)'}"></div>
        <span class="act-x">${label}</span>
      </div>`;
    }).join('');
  }

  // 0..100 horizontal mini-bar.
  function bar(pct, color) {
    const v = Math.max(0, Math.min(100, pct == null ? 0 : pct));
    return `<span class="mini-bar"><span class="mini-fill" style="width:${v}%;background:${color}"></span></span>`;
  }

  async function priorityFromStats() {
    try {
      // Broad priority quiz across everything - server ranks by weakness.
      const qs = await getQuiz('/api/quiz/priority', { count: 10 });
      startQuiz(qs);
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  /* --------------------------- Progress tree ----------------------------- */
  // Builds a Track > Course > Unit > Topic tree from the catalog and rolls
  // accuracy up each level (weighted by attempts). Each row is a progress bar.

  function upsertChild(parent, name) {
    if (!parent.children.has(name)) {
      parent.children.set(name, {
        name, children: new Map(), attempts: 0, correct: 0, leaf: false,
      });
    }
    return parent.children.get(name);
  }

  // Progress metric: a topic's progress = its accuracy, or 0 if never attempted.
  // A parent's progress = the unweighted average across ALL its topics. We carry
  // a running progressSum + topicCount so any level is sum/count.
  function rollupNode(node) {
    if (node.leaf) {
      node.topicCount = 1;
      node.attemptedCount = node.attempts > 0 ? 1 : 0;
      node.progressSum = node.attempts > 0 ? (node.correct / node.attempts) * 100 : 0;
      return;
    }
    node.topicCount = 0; node.attemptedCount = 0; node.progressSum = 0;
    for (const child of node.children.values()) {
      rollupNode(child);
      node.topicCount += child.topicCount;
      node.attemptedCount += child.attemptedCount;
      node.progressSum += child.progressSum;
    }
  }

  function buildProgressTree(catalog) {
    const root = { children: new Map() };
    for (const r of catalog) {
      const track = upsertChild(root, r.track || 'Unknown Track');
      const course = upsertChild(track, r.course || 'Unknown Course');
      const lesson = upsertChild(course, r.lesson || 'Unknown Unit');
      const topic = upsertChild(lesson, r.topic || 'Unknown Topic');
      topic.leaf = true;
      topic.attempts = r.totalAttempts || 0;
      topic.correct = r.correctCount || 0;
    }
    for (const node of root.children.values()) rollupNode(node);
    return root;
  }

  function nodeProgress(node) {
    return node.topicCount ? Math.round(node.progressSum / node.topicCount) : 0;
  }

  // Stable, deterministic order - by lesson/unit number (and natural name order
  // everywhere else). NEVER depends on progress, so the tree never reshuffles.
  function byName(a, b) {
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  }

  // The Track>Course>Unit>Topic keys, indexed by depth level.
  const LEVEL_KEYS = ['track', 'course', 'lesson', 'topic'];

  // Donut ring showing a percentage in a tier colour, centred label. `size` is
  // the SVG box in px; the stroke width scales with it via the --sw CSS var.
  function ringHtml(pct, color, size = 56) {
    const sw = size >= 68 ? 7 : 6;
    const r = size / 2 - sw;
    const circ = 2 * Math.PI * r;
    const off = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
    const c = (size / 2).toFixed(0);
    return `<div class="prog-ring-wrap" style="width:${size}px;height:${size}px">
      <svg class="prog-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="--sw:${sw}px">
        <circle class="ring-bg" cx="${c}" cy="${c}" r="${r.toFixed(1)}"></circle>
        <circle class="ring-fg" cx="${c}" cy="${c}" r="${r.toFixed(1)}"
          style="stroke:${color};stroke-dasharray:${circ.toFixed(1)};stroke-dashoffset:${off.toFixed(1)}"></circle>
      </svg>
      <span class="ring-num" style="color:${color}">${pct}<i>%</i></span>
    </div>`;
  }

  // The three action groups (root / Learn / AI Support) are identical at every
  // level, so build them once.
  function progActionsHtml(level, scope) {
    return `<div class="prog-actions" data-menu="root">
          <div class="menu-group root">
            <button class="prog-btn learn" data-action="learn" title="Quiz or study cards for this section">Learn ▸</button>
            <button class="prog-btn ai" data-action="ai" title="AI review or chat for this section">AI Support ▸</button>
          </div>
          <div class="menu-group learn">
            <button class="prog-btn menu-back" data-action="back" title="Back" aria-label="Back">‹</button>
            <button class="prog-btn" data-action="quiz" title="Live quiz on this section">Quiz</button>
            ${level >= 1 && flashcardsEnabled(scope.course)
              ? `<button class="prog-btn cards" data-action="cards" title="Study flashcards for this section">Cards</button>`
              : ''}
          </div>
          <div class="menu-group ai">
            <button class="prog-btn menu-back" data-action="back" title="Back" aria-label="Back">‹</button>
            <button class="prog-btn review" data-action="review" title="AI teaches this section first">Review</button>
            <button class="prog-btn chat" data-action="chat" title="Chat about this section: reads its cards & questions">Chat</button>
          </div>
        </div>`;
  }

  function renderProgressNode(node, level, scope) {
    const pct = nodeProgress(node);
    const color = accColor(pct);
    // Courses (the children of a track, level 0) follow the curriculum order;
    // everything else stays in natural name/unit-number order.
    const kids = [...node.children.values()].sort(
      level === 0 ? (a, b) => byCourseName(a.name, b.name) : byName,
    );
    const hasKids = kids.length > 0 && !node.leaf;
    const isTrack = level === 0;
    const sub = node.leaf
      ? (node.attempts ? `${node.attempts} attempt${node.attempts === 1 ? '' : 's'}` : 'Not started')
      : `${node.attemptedCount}/${node.topicCount} topics practised`;

    // data-* carry this node's full scope so the action buttons know what to launch.
    const dataAttrs = LEVEL_KEYS
      .filter((k) => scope[k] != null)
      .map((k) => `data-${k}="${esc(scope[k])}"`)
      .join(' ');

    const childKey = LEVEL_KEYS[level + 1];
    const childHtml = hasKids
      ? `<div class="prog-children">${kids
          .map((k) => renderProgressNode(k, level + 1, { ...scope, [childKey]: k.name }))
          .join('')}</div>`
      : '';

    const actions = progActionsHtml(level, scope);

    // Tracks (level 0) read as cards anchored by a donut ring; deeper levels are
    // slim rows with a status dot + linear bar.
    const rowInner = isTrack
      ? `<span class="prog-caret">${hasKids ? '▸' : ''}</span>
        ${ringHtml(pct, color, 56)}
        <div class="prog-info">
          <span class="prog-name">${esc(node.name)}</span>
          <span class="prog-sub">${esc(sub)}</span>
        </div>
        ${actions}`
      : `<span class="prog-caret">${hasKids ? '▸' : ''}</span>
        <span class="prog-dot" style="color:${color};background:${color}"></span>
        <div class="prog-info">
          <span class="prog-name">${esc(node.name)}</span>
          <span class="prog-sub">${esc(sub)}</span>
        </div>
        <div class="prog-bar-wrap">
          <span class="mini-bar"><span class="mini-fill" style="width:${pct}%;background:${color}"></span></span>
          <span class="prog-pct" style="color:${color}">${pct}%</span>
        </div>
        ${actions}`;

    return `<div class="prog-node ${hasKids ? 'has-children' : ''}" data-level="${level}" data-label="${esc(node.name)}" ${dataAttrs}>
      <div class="prog-row ${isTrack ? 'track-row' : ''}"${isTrack ? '' : ` style="padding-left:${level * 16}px"`}>
        ${rowInner}
      </div>
      ${childHtml}
    </div>`;
  }

  // Overall-mastery hero: a big ring + a linear bar, rolled up across all tracks.
  function overviewHtml(tracks) {
    let sum = 0, count = 0, attempted = 0;
    for (const t of tracks) { sum += t.progressSum; count += t.topicCount; attempted += t.attemptedCount; }
    const overall = count ? Math.round(sum / count) : 0;
    const color = accColor(overall);
    return `${ringHtml(overall, color, 76)}
      <div class="po-body">
        <div class="po-label">Overall mastery</div>
        <div class="po-bar"><span style="width:${overall}%;background:${color}"></span></div>
        <div class="po-sub">${attempted} of ${count} topics practised · ${tracks.length} track${tracks.length === 1 ? '' : 's'}</div>
      </div>`;
  }

  function renderProgressTree() {
    const tree = $('progressTree');
    const empty = $('progressEmpty');
    const overview = $('progressOverview');
    if (!state.catalog.length) {
      tree.innerHTML = '';
      if (overview) overview.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    const root = buildProgressTree(state.catalog);
    const tracks = [...root.children.values()].sort(byName);
    if (overview) overview.innerHTML = overviewHtml(tracks);
    tree.innerHTML = tracks.map((t) => renderProgressNode(t, 0, { track: t.name })).join('');
  }

  /* Read a node's scope from its data-* attributes. */
  function nodeScope(el) {
    const s = {};
    for (const k of LEVEL_KEYS) if (el.dataset[k]) s[k] = el.dataset[k];
    return s;
  }

  const clampCountClient = (c) => Math.min(50, Math.max(1, parseInt(c, 10) || 5));

  /* ---- Per-node actions: live quiz / AI review / progress analysis ------ */
  async function quizFromScope(scope) {
    try {
      const count = clampCountClient($('count').value);
      const qs = await getQuiz('/api/quiz/select', { ...scope, count });
      if (!qs || !qs.length) {
        alert('No questions found for this section yet.');
        return;
      }
      startQuiz(qs);
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  let reviewScope = null; // remember scope so "quiz me on this" works from the modal

  async function reviewFromScope(scope, label) {
    reviewScope = scope;
    $('reviewTitle').textContent = 'Review: ' + (label || 'Section');
    const box = $('reviewBody');
    box.innerHTML = '<div class="ai-loading"><div class="spinner"></div> Reading the questions & preparing your review…</div>';
    show('reviewModal');
    try {
      await apiStream('/api/review', scope, (acc) => { box.innerHTML = renderMarkdown(acc); });
      typeset(box);
    } catch (e) {
      box.innerHTML = '<span class="err">Couldn\'t build a review: ' + esc(e.message) + '</span>';
    }
  }

  function closeReview() { hide('reviewModal'); }

  function quizFromReview() {
    const scope = reviewScope;
    closeReview();
    if (scope) quizFromScope(scope);
  }

  async function analyzeProgress() {
    const box = $('analysisBox'), btn = $('analyzeBtn');
    btn.disabled = true;
    box.classList.remove('hidden');
    box.innerHTML =
      '<div class="ai-head">Progress analysis</div><div class="ai-loading"><div class="spinner"></div> Analyzing your progress…</div>';
    const head = '<div class="ai-head">Progress analysis</div>';
    try {
      await apiStream('/api/analyze', {}, (acc) => { box.innerHTML = head + renderMarkdown(acc); });
      typeset(box);
    } catch (e) {
      box.innerHTML = '<span class="err">Couldn\'t analyze your progress: ' + esc(e.message) + '</span>';
    } finally {
      btn.disabled = false;
    }
  }

  /* -------------------------------- Quiz --------------------------------- */
  // opts.returnTo: where "Done" goes after the quiz. Default (null) = home menu;
  // 'flashcard' = back to the exact card the quiz was launched from.
  function startQuiz(qs, opts = {}) {
    if (!qs || !qs.length) {
      alert('No questions found for this selection.');
      return;
    }
    state.questions = qs;
    state.idx = 0;
    state.score = 0;
    state.log = [];
    // Ad-hoc quizzes (e.g. "Quiz from my notes") have no catalog topic, so they
    // are never banked or logged to mastery — finish() and renderQuestion() key
    // off this to skip the save and hide the bank-writing "keep learning" chips.
    state.adhoc = !!opts.adhoc;
    state.quizReturn = opts.returnTo || null;
    // Label the exit button for where this quiz returns to (flashcard vs. menu).
    $('quizExitBtn').textContent = (state.quizReturn === 'flashcard' && fc.view[fc.idx]) ? 'Back to Flashcard' : 'Back to menu';
    showOnly('quizView');
    renderQuestion();
  }

  // "Done" on the results screen: return to the flashcard we came from, else home.
  function doneQuiz() {
    if (state.quizReturn === 'flashcard' && fc.view[fc.idx]) {
      state.quizReturn = null;
      showOnly('flashcardView');
      renderCard();
      return;
    }
    goHome();
  }

  function renderQuestion() {
    const q = state.questions[state.idx];
    const n = state.questions.length;
    $('progressFill').style.width = (state.idx / n) * 100 + '%';
    $('progressCount').textContent = `Question ${state.idx + 1} of ${n}`;
    $('progressScore').textContent = `Score ${state.score}`;
    $('qCrumb').textContent = [...new Set([q.course, q.topic].filter(Boolean))].join('  ›  ');
    $('qText').innerHTML = codeSpans(q.question);
    typeset($('qText'));

    // Admin-only: "Fix format" reformats this shared question for everyone.
    const qFix = $('qFixFormatBtn');
    qFix.classList.toggle('hidden', !isAdmin());
    qFix.disabled = false;
    qFix.textContent = '🛠️ Fix format';

    $('reviewFlag').checked = false;
    hide('postAnswer');

    // Skip control: shown until the learner answers or skips.
    show('skipWrap');
    $('skipBtn').disabled = false;

    // reset AI tutor UI for the new question
    $('hintBtn').disabled = false;
    $('hintBtn').textContent = 'Get a hint';
    $('hintBox').classList.add('hidden');
    $('hintBox').innerHTML = '';

    // "Keep learning" chips + their panels.
    $('explainBtn').disabled = false;
    $('explainBtn').classList.remove('active');
    $('explainBox').classList.add('hidden');
    $('explainBox').innerHTML = '';

    // Drill deeper & Generate-more both bank questions (need auth + a real
    // catalog topic) and hit the AI over the network, so guests, offline, and
    // ad-hoc "from my notes" quizzes don't get those chips.
    const canDrill = state.authed && !state.guest && !state.offline && !state.adhoc;
    $('drillBtn').classList.toggle('hidden', !canDrill);
    $('genMoreBtn').classList.toggle('hidden', !canDrill);

    // reset the "drill deeper" UI
    $('drillBtn').disabled = false;
    $('drillBtn').classList.remove('active');
    $('drillPanel').classList.add('hidden');
    $('confusionList').innerHTML = '';
    $('confusionCustom').classList.add('hidden');
    $('confusionSubmit').disabled = false; // re-arm after a prior drill disabled it
    $('confusionText').value = '';
    $('drillError').textContent = '';
    $('drillLoader').classList.add('hidden');

    // reset the "generate more like this" UI
    $('genMoreBtn').disabled = false;
    $('genMoreBtn').classList.remove('active');
    $('genMorePanel').classList.add('hidden');
    $('genMoreLoader').classList.add('hidden');
    $('genMoreSubmit').disabled = false;
    $('genMoreMsg').textContent = '';
    $('genMoreMsg').classList.remove('ok');
    $('genMoreError').textContent = '';

    const area = $('optionsArea');
    area.innerHTML = '';
    shuffle([...q.options]).forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'option';
      // Keep the raw option text on the node so answer-matching survives LaTeX
      // typesetting (which rewrites the rendered text).
      b.dataset.opt = opt;
      b.innerHTML = `<span class="key">${KEYS[i] || '•'}</span><span class="opt-text">${codeSpans(opt)}</span>`;
      b.onclick = () => handleAnswer(opt, q, b);
      area.appendChild(b);
    });
    typeset(area);
  }

  function handleAnswer(choice, q, btn) {
    const correct = choice.trim() === q.answer.trim();
    if (correct) state.score++;

    document.querySelectorAll('.option').forEach((el) => {
      el.disabled = true;
      const raw = (el.dataset.opt || '').trim();
      if (raw === q.answer.trim()) el.classList.add('correct');
      else if (el === btn) el.classList.add('wrong');
    });

    const f = $('feedback');
    if (correct) {
      f.textContent = 'Correct';
    } else {
      f.textContent = '';
      f.appendChild(document.createTextNode('Incorrect. Answer: '));
      const ans = document.createElement('span');
      ans.innerHTML = codeSpans(q.answer);
      f.appendChild(ans);
      typeset(ans);
    }
    f.className = 'feedback ' + (correct ? 'ok' : 'no');
    $('progressScore').textContent = `Score ${state.score}`;
    hide('skipWrap');
    show('postAnswer');
    state.log[state.idx] = { ...q, isCorrect: correct, reviewFlag: false, userAnswer: choice };
  }

  // Skip: reveal the answer without recording a guess. Logged as a miss
  // (isCorrect false, skipped true) so mastery and priority bring it back.
  function skipQuestion() {
    const q = state.questions[state.idx];
    document.querySelectorAll('.option').forEach((el) => {
      el.disabled = true;
      const raw = (el.dataset.opt || '').trim();
      if (raw === q.answer.trim()) el.classList.add('correct');
    });
    const f = $('feedback');
    f.textContent = '';
    f.appendChild(document.createTextNode('Skipped. Answer: '));
    const ans = document.createElement('span');
    ans.innerHTML = codeSpans(q.answer);
    f.appendChild(ans);
    typeset(ans);
    f.className = 'feedback skip';
    hide('skipWrap');
    show('postAnswer');
    state.log[state.idx] = { ...q, isCorrect: false, skipped: true, reviewFlag: false, userAnswer: null };
  }

  /* ------------------------------ AI tutor ------------------------------- */
  async function askHint() {
    const q = state.questions[state.idx];
    const btn = $('hintBtn'), box = $('hintBox');
    btn.disabled = true;
    box.classList.remove('hidden');
    box.innerHTML = '<div class="ai-loading"><div class="spinner"></div> Thinking of a hint…</div>';
    const head = '<div class="ai-head">Hint</div>';
    try {
      await apiStream('/api/hint', { question: q.question, options: q.options, answer: q.answer },
        (acc) => { box.innerHTML = head + renderMarkdown(acc); });
      typeset(box);
      btn.textContent = 'Hint shown';
    } catch (e) {
      box.innerHTML = '<span class="err">Couldn\'t get a hint: ' + esc(e.message) + '</span>';
      btn.disabled = false;
    }
  }

  async function askExplain() {
    const q = state.questions[state.idx];
    const rec = state.log[state.idx] || {};
    const btn = $('explainBtn'), box = $('explainBox');
    btn.disabled = true;
    box.classList.remove('hidden');
    box.innerHTML = '<div class="ai-loading"><div class="spinner"></div> Teaching from scratch…</div>';
    const head = '<div class="ai-head">Explanation</div>';
    try {
      await apiStream('/api/explain', {
        question: q.question, options: q.options, answer: q.answer,
        userAnswer: rec.userAnswer, isCorrect: rec.isCorrect,
      }, (acc) => { box.innerHTML = head + renderMarkdown(acc); });
      typeset(box);
      btn.classList.add('active'); // keep the chip in place, marked as used
    } catch (e) {
      box.innerHTML = '<span class="err">Couldn\'t load explanation: ' + esc(e.message) + '</span>';
      btn.disabled = false;
    }
  }

  /* ------------------------------- Drill --------------------------------- */
  // "Master this question": diagnose what's confusing the learner, then generate
  // (and bank) a fresh question that drills into that exact gap. The generated
  // question carries the SAME topic, so it feeds the exact sub-lesson and updates
  // its mastery once answered. Drilled questions are inserted into the running
  // quiz, so the learner can answer one and immediately drill again - as deep as
  // they need to go.
  function setDrillLoading(on, text) {
    $('drillLoader').classList.toggle('hidden', !on);
    if (text) $('drillLoaderText').textContent = text;
  }

  async function startDrill() {
    const q = state.questions[state.idx];
    const rec = state.log[state.idx] || {};
    const btn = $('drillBtn');
    btn.disabled = true;
    btn.classList.add('active');
    $('drillPanel').classList.remove('hidden');
    $('drillError').textContent = '';
    $('confusionCustom').classList.add('hidden');
    $('confusionList').innerHTML = '';
    setDrillLoading(true, 'Finding what might be confusing you…');
    try {
      const r = await api('/api/drill/confusions', {
        method: 'POST',
        body: JSON.stringify({
          question: q.question, options: q.options, answer: q.answer, topic: q.topic,
          userAnswer: rec.userAnswer, isCorrect: rec.isCorrect,
        }),
      });
      renderConfusions(r.confusions || []);
    } catch (e) {
      $('drillError').textContent = "Couldn't load this: " + e.message;
      btn.disabled = false;
    } finally {
      setDrillLoading(false);
    }
  }

  // Render the AI-suggested confusions as pickable options, always adding a
  // final "let me explain" choice that opens a free-text box for the learner.
  function renderConfusions(list) {
    const items = list.slice(0, 3);
    const wrap = $('confusionList');
    wrap.innerHTML =
      items
        .map((c, i) => `<button class="confusion-opt" data-i="${i}"><span class="key">${KEYS[i]}</span><span class="confusion-txt">${esc(c)}</span></button>`)
        .join('') +
      `<button class="confusion-opt custom" data-custom="1"><span class="key">${KEYS[items.length]}</span><span class="confusion-txt">Something else: let me explain</span></button>`;
    wrap.querySelectorAll('.confusion-opt').forEach((b) => {
      b.onclick = () => {
        if (b.dataset.custom) {
          $('confusionCustom').classList.remove('hidden');
          $('confusionText').focus();
        } else {
          chooseConfusion(items[Number(b.dataset.i)]);
        }
      };
    });
    typeset(wrap); // confusions can contain math ("I mixed up $x^2$ and $2x$")
  }

  function submitCustomConfusion() {
    const text = $('confusionText').value.trim();
    if (!text) { $('confusionText').focus(); return; }
    chooseConfusion(text);
  }

  async function chooseConfusion(confusion) {
    const q = state.questions[state.idx];
    $('drillError').textContent = '';
    $('confusionList').querySelectorAll('.confusion-opt').forEach((b) => (b.disabled = true));
    $('confusionSubmit').disabled = true;
    setDrillLoading(true, 'Writing a question that targets this…');
    try {
      const nq = await api('/api/drill/question', {
        method: 'POST',
        body: JSON.stringify({
          question: q.question, options: q.options, answer: q.answer,
          topic: q.topic, confusion,
        }),
      });
      if (!nq || !nq.question || !Array.isArray(nq.options)) throw new Error('No usable question came back');
      insertDrillQuestion(nq);
    } catch (e) {
      $('drillError').textContent = "Couldn't build a question: " + e.message;
      $('confusionList').querySelectorAll('.confusion-opt').forEach((b) => (b.disabled = false));
      $('confusionSubmit').disabled = false;
    } finally {
      setDrillLoading(false);
    }
  }

  // Insert the freshly-generated question right after the current one and jump
  // to it (mirroring nextQuestion's bookkeeping) so the learner answers it now.
  function insertDrillQuestion(nq) {
    if (state.log[state.idx]) state.log[state.idx].reviewFlag = $('reviewFlag').checked;
    state.questions.splice(state.idx + 1, 0, nq);
    state.idx++;
    renderQuestion();
  }

  /* -------------------- Generate more questions like this ---------------- */
  // A post-answer action: write N fresh questions on the SAME topic, matching
  // this question's style, bank them, and queue them right after the current
  // one so the learner meets them by hitting Next (no jump — they can still
  // finish reviewing this answer first).
  function toggleGenMore() {
    const panel = $('genMorePanel');
    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !opening);
    $('genMoreBtn').classList.toggle('active', opening);
    if (opening) {
      $('genMoreError').textContent = '';
      setTimeout(() => $('genMoreCount').focus(), 30);
    }
  }

  function setGenMoreLoading(on) {
    $('genMoreLoader').classList.toggle('hidden', !on);
  }

  async function generateSimilar() {
    const q = state.questions[state.idx];
    const count = Math.min(10, Math.max(1, parseInt($('genMoreCount').value, 10) || 3));
    const submit = $('genMoreSubmit');
    submit.disabled = true;
    $('genMoreError').textContent = '';
    const msg = $('genMoreMsg');
    msg.textContent = '';
    msg.classList.remove('ok');
    setGenMoreLoading(true);
    try {
      const qs = await api('/api/generate/like', {
        method: 'POST',
        body: JSON.stringify({
          question: q.question, options: q.options, answer: q.answer,
          topic: q.topic, count,
        }),
      });
      if (!Array.isArray(qs) || !qs.length) throw new Error('No usable questions came back');
      // Queue them right after this one; don't advance (learner is still reviewing).
      state.questions.splice(state.idx + 1, 0, ...qs);
      $('progressCount').textContent = `Question ${state.idx + 1} of ${state.questions.length}`;
      msg.textContent = `Added ${qs.length} question${qs.length === 1 ? '' : 's'} - they're queued up next. Hit Next when you're ready.`;
      msg.classList.add('ok');
    } catch (e) {
      $('genMoreError').textContent = "Couldn't generate more: " + e.message;
    } finally {
      submit.disabled = false;
      setGenMoreLoading(false);
    }
  }

  /* ------------------------------ Code + math --------------------------- */
  // Programming content arrives as LaTeX \texttt{...} (usually inside $...$ or
  // \(...\)), but Python syntax (*args, **kwargs, underscores, quotes) isn't
  // valid KaTeX math, so KaTeX prints the raw source in its red error colour.
  // We pull those out and render them as inline <code> instead, leaving real
  // math for KaTeX. Works on already-banked content — no regeneration needed.
  function stashCode(raw) {
    const codes = [];
    // SENT is a control char (SOH) that never appears in real content, so it is
    // a collision-proof placeholder that survives esc() and the bold pass.
    const SENT = String.fromCharCode(1);
    const stash = (c) => { codes.push(c); return SENT + (codes.length - 1) + SENT; };
    let s = String(raw ?? '')
      // A whole math span that is ONLY a \texttt{...}  ->  code (drop the $ / \( \)).
      .replace(/\$\s*\\texttt\{([^{}]*)\}\s*\$/g, (_, c) => stash(c))
      .replace(/\\\(\s*\\texttt\{([^{}]*)\}\s*\\\)/g, (_, c) => stash(c));
    // Any remaining \texttt{...}  ->  code, but WITHOUT splitting a math span
    // across the injected <code>. KaTeX auto-render matches $...$ delimiters per
    // DOM text node, never across an element, so a <code> dropped into the
    // middle of "$... \texttt{x} ...$" orphans the opening $ and mis-pairs every
    // following $ — italicising the prose after it (the "half the question turns
    // italic" bug). So a \texttt found inside math is lifted OUT of the span and
    // the surrounding math keeps its own delimiters.
    s = stashTexttNoSplit(s, stash);
    return { s, codes };
  }
  // Replace \texttt{...} with a code placeholder, never leaving one inside a math
  // span. Math spans ($$..$$, $..$, \[..\], \(..\)) are located first; a \texttt
  // inside one is lifted out, re-wrapping the math fragments on either side.
  function stashTexttNoSplit(str, stash) {
    const DELIMS = [['$$', '$$'], ['$', '$'], ['\\[', '\\]'], ['\\(', '\\)']];
    const codeOut = (t) => t.replace(/\\texttt\{([^{}]*)\}/g, (_, c) => stash(c));
    // Split a math span's inner text at each \texttt; drop empty math fragments so
    // we never emit a bare "$$". Returns null when there was no \texttt inside.
    const splitMath = (inner, l, r) => {
      const re = /\\texttt\{([^{}]*)\}/g;
      let out = '', last = 0, m, found = false;
      while ((m = re.exec(inner))) {
        found = true;
        const before = inner.slice(last, m.index);
        if (before.trim()) out += l + before + r;
        out += stash(m[1]);
        last = m.index + m[0].length;
      }
      if (!found) return null;
      const tail = inner.slice(last);
      if (tail.trim()) out += l + tail + r;
      return out;
    };
    let out = '', i = 0, textStart = 0;
    while (i < str.length) {
      let hit = null;
      for (const [l, r] of DELIMS) {
        if (str.startsWith(l, i)) {
          const close = str.indexOf(r, i + l.length);
          if (close !== -1) { hit = { l, r, close }; break; }
        }
      }
      if (!hit) { i++; continue; }
      out += codeOut(str.slice(textStart, i));               // prose before the span
      const inner = str.slice(i + hit.l.length, hit.close);
      const split = splitMath(inner, hit.l, hit.r);
      out += split !== null ? split : hit.l + inner + hit.r;
      i = hit.close + hit.r.length;
      textStart = i;
    }
    return out + codeOut(str.slice(textStart));               // trailing prose
  }
  function restoreCode(html, codes) {
    const re = new RegExp(String.fromCharCode(1) + '(\\d+)' + String.fromCharCode(1), 'g');
    return html.replace(re, (_, i) => '<code>' + esc(codes[+i]) + '</code>');
  }
  // Escape a string for HTML, turning any \texttt{...} code into <code>. Real
  // math delimiters survive for a later typeset() call.
  function codeSpans(raw) {
    const { s, codes } = stashCode(raw);
    return restoreCode(esc(s), codes);
  }

  /** Minimal, safe Markdown -> HTML (bold, bullets, paragraphs, inline code). */
  function renderMarkdown(md) {
    // Normalise em/en dashes to plain hyphens in AI output (no em dashes anywhere).
    const lines = String(md || '').replace(/[—–]/g, '-').split('\n');
    let html = '', inList = false;
    for (const raw of lines) {
      const trimmed = raw.trim();
      // Stash code first so the bold pass can't see ** inside it (e.g. **kwargs).
      const { s, codes } = stashCode(trimmed);
      let line = restoreCode(esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'), codes);
      if (/^[-*]\s+/.test(trimmed)) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + line.replace(/^[-*]\s+/, '') + '</li>';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        if (line) html += '<p>' + line + '</p>';
      }
    }
    if (inList) html += '</ul>';
    return html;
  }

  /**
   * Render LaTeX inside an element with KaTeX auto-render (loaded from CDN).
   * Supports $...$ / $$...$$ inline & display, and \(...\) / \[...\]. Safe to
   * call before KaTeX has loaded (no-op until it's available).
   */
  function typeset(el) {
    if (!el || !window.renderMathInElement) return;
    try {
      window.renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'option', 'code'],
      });
    } catch (e) {
      /* never let a malformed expression break the UI */
    }
  }

  function nextQuestion() {
    state.log[state.idx].reviewFlag = $('reviewFlag').checked;
    state.idx++;
    if (state.idx < state.questions.length) renderQuestion();
    else finish();
  }

  function finish() {
    showOnly('resultView');
    const n = state.questions.length;
    const pct = Math.round((state.score / n) * 100);
    $('scoreNum').textContent = pct + '%';
    $('scoreLabel').textContent = `${state.score} of ${n} correct`;

    const body = $('breakdownBody');
    body.innerHTML = '';
    state.log.forEach((r) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:var(--muted)">${esc(r.track)}</td>
        <td><strong>${esc(r.course)}</strong></td>
        <td style="color:var(--muted)">${esc(r.topic)}</td>
        <td><span class="tag ${r.skipped ? 'skip' : r.isCorrect ? 'pass' : 'fail'}">${r.skipped ? 'SKIP' : r.isCorrect ? 'PASS' : 'FAIL'}</span></td>`;
      body.appendChild(tr);
    });

    const note = $('syncNote');
    if (state.adhoc) {
      note.textContent = 'Practice quiz from your material — not saved to your mastery stats.';
    } else if (state.guest || !state.authed) {
      note.textContent = 'Guest mode: results were not saved.';
    } else {
      note.textContent = 'Saving results…';
      const results = state.log.slice();
      api('/api/quiz/log', { method: 'POST', body: JSON.stringify({ results }) })
        .then(() => {
          note.textContent = 'Results saved & mastery updated.';
          // refresh catalog so priorities reflect the new attempt, and bump the streak.
          loadStreak();
          return api('/api/catalog').then((c) => { state.catalog = c; lsSet(LS.catalog, c); });
        })
        .catch((e) => {
          // Offline (or save failed): keep results locally and sync when back online.
          if (isNetworkError(e)) {
            enqueueResults(results);
            note.textContent = 'Saved on this device. It will sync when you\'re back online.';
          } else {
            note.textContent = 'Could not save: ' + e.message;
          }
        });
    }
  }

  /* ----------------------------- Flashcards ------------------------------ */
  // A Course/Lesson-level deck of AI-written Intuition + Formula cards (with
  // visual explainers). Cards flip on click, carry a personal label
  // (mastered / still learning / important), have a Highway rapid-review filter,
  // and a "quiz me" that banks + serves one real question for the card's topic.
  const fc = {
    scope: null, label: '', level: 'course', mastery: false,
    cards: [], view: [], idx: 0, flipped: false, highway: false,
  };

  function fcSetLoading(on, text) {
    $('fcLoader').classList.toggle('hidden', !on);
    if (text) $('fcLoaderText').textContent = text;
  }

  async function openFlashcards(scope, label) {
    if (!state.authed) { showLogin(); return; }
    fc.mastery = false;
    fc.scope = { track: scope.track, course: scope.course, lesson: scope.lesson || '', topic: scope.topic || '' };
    fc.level = scope.topic ? 'topic' : scope.lesson ? 'lesson' : 'course';
    fc.label = label || scope.course || 'Flashcards';
    fc.highway = false;
    fc.statsOpen = false;
    fc._statsByTopic = {};
    $('fcHighway').checked = false;
    $('fcRegen').classList.remove('hidden'); // single-scope deck can be regenerated
    showOnly('flashcardView');
    $('fcTitle').textContent = 'Flashcards: ' + fc.label;
    $('fcSub').textContent = fc.level === 'course'
      ? 'A comprehensive deck for the whole course. Intuition first, then the formula.'
      : fc.level === 'lesson'
        ? 'Focused cards for this lesson. Intuition first, then the formula.'
        : 'A focused deck for this sub-lesson. Intuition first, then the formula.';
    await loadFlashcards();
  }

  // A single review deck mixing cards from the learner's weakest topics across
  // every track (the flashcard analogue of the Mastery quiz). It spans many
  // scopes, so there's no single deck to (re)generate — hide that control.
  async function openMasteryDeck() {
    if (!state.authed) { showLogin(); return; }
    fc.mastery = true;
    fc.scope = null;
    fc.label = 'Mastery Flashcards';
    fc.highway = false;
    fc.statsOpen = false;
    fc._statsByTopic = {};
    $('fcHighway').checked = false;
    $('fcRegen').classList.add('hidden');
    showOnly('flashcardView');
    $('fcTitle').textContent = 'Mastery Flashcards';
    $('fcSub').textContent = 'Cards from your weakest topics, interleaved across every track.';
    $('fcError').textContent = '';
    $('fcDeck').classList.add('hidden');
    $('fcEmpty').classList.add('hidden');
    fcSetLoading(true, 'Building your mastery deck…');
    try {
      const r = await api('/api/flashcards/mastery', { method: 'POST', body: '{}' });
      if (r.cards && r.cards.length) renderDeck(r.cards);
      else $('fcError').textContent = 'No flashcard decks exist for your weakest topics yet. Open a topic below and generate its deck first.';
    } catch (e) {
      $('fcError').textContent = 'Could not build your mastery deck: ' + e.message;
    } finally {
      fcSetLoading(false);
    }
  }

  function fcQuery() {
    const p = new URLSearchParams();
    p.set('track', fc.scope.track || '');
    p.set('course', fc.scope.course || '');
    if (fc.scope.lesson) p.set('lesson', fc.scope.lesson);
    if (fc.scope.topic) p.set('topic', fc.scope.topic);
    return p.toString();
  }

  async function loadFlashcards() {
    $('fcError').textContent = '';
    $('fcDeck').classList.add('hidden');
    $('fcEmpty').classList.add('hidden');
    fcSetLoading(true, 'Loading your deck…');
    try {
      const r = await api('/api/flashcards?' + fcQuery());
      if (!r.enabled) {
        $('fcError').textContent = 'Flashcards are not enabled for this course yet.';
        return;
      }
      if (r.generated && r.cards.length) renderDeck(r.cards);
      else $('fcEmpty').classList.remove('hidden');
    } catch (e) {
      $('fcError').textContent = 'Could not load flashcards: ' + e.message;
    } finally {
      fcSetLoading(false);
    }
  }

  async function generateFlashcards() {
    $('fcError').textContent = '';
    $('fcEmpty').classList.add('hidden');
    $('fcGenerateBtn').disabled = true;
    fcSetLoading(true, 'Writing your deck — this can take up to a minute…');
    try {
      const r = await api('/api/flashcards/generate', {
        method: 'POST', body: JSON.stringify(fc.scope),
      });
      if (r.cards && r.cards.length) renderDeck(r.cards);
      else { $('fcEmpty').classList.remove('hidden'); $('fcError').textContent = 'No cards came back. Try again.'; }
    } catch (e) {
      $('fcEmpty').classList.remove('hidden');
      $('fcError').textContent = 'Could not generate flashcards: ' + e.message;
    } finally {
      fcSetLoading(false);
      $('fcGenerateBtn').disabled = false;
    }
  }

  function regenerateFlashcards() {
    if (!confirm('Regenerate this deck? Your current cards for this section will be replaced (your labels reset).')) return;
    generateFlashcards();
  }

  function renderDeck(cards) {
    fc.cards = cards;
    applyHighwayFilter();
    fc.idx = 0;
    fc.flipped = false;
    $('fcEmpty').classList.add('hidden');
    $('fcDeck').classList.remove('hidden');
    renderCard();
  }

  function applyHighwayFilter() {
    const hw = fc.cards.filter((c) => c.highway);
    fc.view = fc.highway && hw.length ? hw : fc.cards;
    if (fc.idx >= fc.view.length) fc.idx = 0;
  }

  function toggleHighway() {
    fc.highway = $('fcHighway').checked;
    const hw = fc.cards.filter((c) => c.highway);
    if (fc.highway && !hw.length) {
      $('fcHighway').checked = false;
      fc.highway = false;
      alert('No highway cards in this deck yet.');
      return;
    }
    applyHighwayFilter();
    fc.idx = 0;
    fc.flipped = false;
    renderCard();
  }

  function renderCard() {
    const card = fc.view[fc.idx];
    const stage = $('flashcard');
    if (!card) {
      $('fcFront').innerHTML = '<div class="fc-concept">No cards to show.</div>';
      $('fcBack').innerHTML = '';
      updateCounter();
      return;
    }
    stage.classList.toggle('flipped', fc.flipped);

    const badges = card.highway ? '<span class="fc-badge highway">Highway</span>' : '';

    // Front: the concept prompt.
    $('fcFront').innerHTML = `
      <div class="fc-badges">${badges}</div>
      <div class="fc-topic">${esc(card.topic || '')}</div>
      <div class="fc-concept">${codeSpans(card.concept)}</div>
      <div class="fc-flip-hint">Click to reveal</div>`;
    typeset($('fcFront'));

    // Back: Intuition (+ optional visual) then Formula.
    const visualHtml = card.visual ? `<div class="fc-visual">${renderVisual(card.visual)}</div>` : '';
    $('fcBack').innerHTML = `
      <div class="fc-back-inner">
        <div class="fc-section">
          <div class="fc-label intuition">Intuition</div>
          <div class="fc-body">${renderMarkdown(card.intuition)}</div>
        </div>
        ${visualHtml}
        <div class="fc-section">
          <div class="fc-label formula">Formula</div>
          <div class="fc-body fc-formula">${codeSpans(card.formula || '—')}</div>
        </div>
      </div>
      <div class="fc-flip-hint">Click to flip back</div>`;
    typeset($('fcBack'));

    updateCounter();
    $('fcQuizErr').textContent = '';
    $('fcPrev').disabled = fc.idx === 0;
    $('fcNext').disabled = fc.idx >= fc.view.length - 1;

    // Admin-only: edit this card / fix its formatting, saved for everyone. Reset
    // the edit panel to its idle (collapsed) state whenever the card changes.
    $('fcAdminActions').classList.toggle('hidden', !isAdmin());
    resetCardEditUI();

    // Per-card quiz performance (its topic's questions + your attempts).
    renderCardStats(card);
  }

  function updateCounter() {
    const mastered = fc.cards.filter((c) => c.status === 'mastered').length;
    const total = fc.view.length;
    const pos = total ? fc.idx + 1 : 0;
    $('fcCounter').textContent =
      `Card ${pos} of ${total}${fc.highway ? ' (highway)' : ''} · ${mastered}/${fc.cards.length} mastered`;
  }

  function flipCard() { fc.flipped = !fc.flipped; $('flashcard').classList.toggle('flipped', fc.flipped); }
  function nextCard() { if (fc.idx < fc.view.length - 1) { fc.idx++; fc.flipped = false; renderCard(); } }
  function prevCard() { if (fc.idx > 0) { fc.idx--; fc.flipped = false; renderCard(); } }

  /* ------------------- Per-card quiz performance (stats) ----------------- */
  // Cards are tied to their topic's questions: show how many exist and the
  // learner's accuracy, with an expandable list of the questions they attempted.
  function renderCardStats(card) {
    const summary = $('fcStatsSummary');
    const body = $('fcStatsBody');
    if (!summary || !body) return;
    // Collapse state persists across cards; body re-populates per card.
    $('fcStatsBody').classList.toggle('hidden', !fc.statsOpen);
    $('fcStatsCaret').textContent = fc.statsOpen ? '▾' : '▸';
    $('fcStatsToggle').setAttribute('aria-expanded', String(fc.statsOpen));

    const topic = card.topic || '';
    const cached = topic ? fc._statsByTopic[topic] : null;
    if (cached) { paintCardStats(cached); return; }
    summary.textContent = 'Loading question stats…';
    body.innerHTML = '';
    if (!topic) { summary.textContent = 'This card is not linked to a topic yet.'; return; }
    loadCardStats(card.id, topic);
  }

  async function loadCardStats(cardId, topic) {
    try {
      const r = await api('/api/flashcards/card-stats?cardId=' + encodeURIComponent(cardId));
      fc._statsByTopic[topic] = r;
      // Only paint if we're still on a card of this topic.
      const cur = fc.view[fc.idx];
      if (cur && cur.topic === topic) paintCardStats(r);
    } catch (e) {
      $('fcStatsSummary').textContent = 'Could not load question stats.';
    }
  }

  function paintCardStats(r) {
    const acc = r.accuracy == null ? '—' : r.accuracy + '%';
    $('fcStatsSummary').innerHTML =
      `<strong>${r.questionCount}</strong> question${r.questionCount === 1 ? '' : 's'} · ` +
      `<span style="color:${accColor(r.accuracy)};font-weight:700">${acc}</span> accuracy · ` +
      `${r.attempts} attempted`;
    const body = $('fcStatsBody');
    if (!r.questions || !r.questions.length) {
      body.innerHTML = '<p class="fc-stats-empty">You have not attempted any questions on this topic yet. Try "Quiz me on this".</p>';
    } else {
      body.innerHTML = r.questions.map((q) => `
        <div class="fc-stats-q">
          <span class="tag ${q.result ? 'pass' : 'fail'}">${q.result ? 'PASS' : 'FAIL'}</span>
          <span class="fc-stats-qtext">${esc(q.question)}</span>
        </div>`).join('');
      typeset(body);
    }
  }

  function toggleCardStats() {
    fc.statsOpen = !fc.statsOpen;
    $('fcStatsBody').classList.toggle('hidden', !fc.statsOpen);
    $('fcStatsCaret').textContent = fc.statsOpen ? '▾' : '▸';
    $('fcStatsToggle').setAttribute('aria-expanded', String(fc.statsOpen));
  }

  async function quizMeOnCard() {
    const card = fc.view[fc.idx];
    if (!card) return;
    const count = Math.min(10, Math.max(1, parseInt($('fcQuizCount').value, 10) || 3));
    const btn = $('fcQuizBtn');
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = count > 1 ? `Writing ${count} questions…` : 'Writing a question…';
    $('fcQuizErr').textContent = '';
    try {
      const qs = await api('/api/flashcards/quiz', {
        method: 'POST', body: JSON.stringify({ cardId: card.id, count }),
      });
      const list = Array.isArray(qs) ? qs : [qs];
      if (!list.length || !list[0] || !Array.isArray(list[0].options)) throw new Error('No usable questions came back');
      // Stats will change once these are answered — drop the cache so returning
      // to the card re-fetches the fresh accuracy.
      if (card.topic) delete fc._statsByTopic[card.topic];
      state.guest = false;
      // logs + updates mastery/streak like any other quiz; "Done" returns to this card.
      startQuiz(list, { returnTo: 'flashcard' });
    } catch (e) {
      $('fcQuizErr').textContent = "Couldn't build questions: " + e.message;
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  /* ------------------------------- Chat ---------------------------------- */
  // Two tutor chats share these render helpers. A message is { role, text } and
  // the live reply may carry a declarative visual (rendered with renderVisual).
  function bubbleHtml(role, text, visual) {
    const who = role === 'assistant' ? 'ai' : 'me';
    const vis = visual ? `<div class="chat-visual">${renderVisual(visual)}</div>` : '';
    return `<div class="chat-msg ${who}"><div class="chat-bubble">${renderMarkdown(text)}${vis}</div></div>`;
  }
  function renderChatLog(el, messages) {
    el.innerHTML = (messages || []).map((m) => bubbleHtml(m.role, m.text)).join('') ||
      '<div class="chat-empty">No messages yet. Ask your first question below.</div>';
    typeset(el);
    el.scrollTop = el.scrollHeight;
  }
  function appendBubble(el, role, text, visual) {
    const empty = el.querySelector('.chat-empty');
    if (empty) empty.remove();
    el.insertAdjacentHTML('beforeend', bubbleHtml(role, text, visual));
    typeset(el.lastElementChild);
    el.scrollTop = el.scrollHeight;
    return el.lastElementChild;
  }

  /* ---- Scope chat: reads a section's cards + questions (AI Support) ------ */
  let scopeChat = { scope: null, label: '' };

  async function openScopeChat(scope, label) {
    if (!state.authed) { showLogin(); return; }
    scopeChat = { scope, label: label || scope.course || scope.track || 'Section' };
    $('chatTitle').textContent = 'Chat: ' + scopeChat.label;
    const log = $('scopeChatLog');
    log.innerHTML = '<div class="chat-empty">Loading…</div>';
    show('chatModal');
    $('scopeChatInput').focus();
    try {
      const p = new URLSearchParams();
      for (const k of ['track', 'course', 'lesson']) if (scope[k]) p.set(k, scope[k]);
      const r = await api('/api/chat?' + p.toString());
      renderChatLog(log, r.messages);
    } catch (e) {
      log.innerHTML = '<div class="chat-empty">Could not load chat: ' + esc(e.message) + '</div>';
    }
  }

  function closeScopeChat() { hide('chatModal'); }

  async function sendScopeChat() {
    const input = $('scopeChatInput');
    const msg = input.value.trim();
    if (!msg || !scopeChat.scope) return;
    const log = $('scopeChatLog');
    const send = $('scopeChatSend');
    input.value = '';
    appendBubble(log, 'user', msg);
    const thinking = appendBubble(log, 'assistant', 'Thinking…');
    thinking.classList.add('thinking');
    send.disabled = true;
    try {
      const r = await api('/api/chat', {
        method: 'POST', body: JSON.stringify({ ...scopeChat.scope, message: msg }),
      });
      thinking.remove();
      appendBubble(log, 'assistant', r.reply, r.visual);
    } catch (e) {
      thinking.remove();
      appendBubble(log, 'assistant', 'Sorry, that failed: ' + esc(e.message));
    } finally {
      send.disabled = false;
      input.focus();
    }
  }

  /* -------------------- Card visuals: safe function plots ----------------- */
  // A tiny, dependency-free plotter. The AI supplies a declarative spec (never
  // SVG); we evaluate the function expressions with a hand-rolled parser (no
  // eval/Function) and draw a clean SVG graph — tangent lines, shaded areas,
  // secants, points and vertical lines — so a visual learner sees the idea.

  // Compile "expr in x" to a numeric fn, or null if it uses anything unsupported.
  function compileExpr(src) {
    const FN = {
      sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp,
      ln: Math.log, log: (v) => Math.log(v) / Math.LN10, sqrt: Math.sqrt, abs: Math.abs,
    };
    const CONST = { pi: Math.PI, e: Math.E };
    const toks = src.match(/[0-9]*\.?[0-9]+|[a-z]+|[-+*/^(),]/gi);
    if (!toks) return null;
    const out = [], ops = [];
    // Two unary-minus precedences so both conventions hold: normally unary binds
    // BELOW ^ (so -x^2 = -(x^2)), but in an exponent it binds ABOVE ^ (so 2^-x = 2^(-x)).
    const prec = { '+': 1, '-': 1, '*': 2, '/': 2, u: 3, '^': 4, U: 5 };
    const right = { '^': true, u: true, U: true };
    let prev = null;
    for (let tk of toks) {
      if (/^[0-9.]/.test(tk)) { out.push({ n: parseFloat(tk) }); prev = 'num'; }
      else if (/^[a-z]+$/i.test(tk)) {
        const low = tk.toLowerCase();
        if (FN[low]) { ops.push({ f: low }); prev = 'fn'; }
        else if (low === 'x') { out.push({ x: true }); prev = 'num'; }
        else if (CONST[low] !== undefined) { out.push({ n: CONST[low] }); prev = 'num'; }
        else return null;
      } else if (tk === ',') {
        while (ops.length && !ops[ops.length - 1].paren) out.push(ops.pop());
        prev = 'op';
      } else if (tk === '(') { ops.push({ paren: true }); prev = 'op'; }
      else if (tk === ')') {
        while (ops.length && !ops[ops.length - 1].paren) out.push(ops.pop());
        if (!ops.length) return null;
        ops.pop();
        if (ops.length && ops[ops.length - 1].f) out.push(ops.pop());
        prev = 'num';
      } else {
        let op = tk;
        if (op === '+' && (prev === null || prev === 'op')) { prev = 'op'; continue; }
        if (op === '-' && (prev === null || prev === 'op')) {
          // In exponent position (right after ^) unary binds tighter than ^.
          op = (ops.length && ops[ops.length - 1].op === '^') ? 'U' : 'u';
        }
        while (ops.length) {
          const top = ops[ops.length - 1];
          if (top.paren || top.f) break;
          if (right[op] ? prec[op] < prec[top.op] : prec[op] <= prec[top.op]) out.push(ops.pop());
          else break;
        }
        ops.push({ op });
        prev = 'op';
      }
    }
    while (ops.length) { const o = ops.pop(); if (o.paren) return null; out.push(o); }
    return (xVal) => {
      const st = [];
      for (const t of out) {
        if ('n' in t) st.push(t.n);
        else if (t.x) st.push(xVal);
        else if (t.f) st.push(FN[t.f](st.pop()));
        else if (t.op === 'u' || t.op === 'U') st.push(-st.pop());
        else {
          const b = st.pop(), a = st.pop();
          st.push(t.op === '+' ? a + b : t.op === '-' ? a - b : t.op === '*' ? a * b
            : t.op === '/' ? a / b : Math.pow(a, b));
        }
      }
      const v = st.pop();
      return typeof v === 'number' && isFinite(v) ? v : NaN;
    };
  }

  const PLOT_COLOR = { green: '#2fa14a', violet: '#7c6ff0', red: '#d6453f', muted: '#9aa39e' };

  function renderVisual(spec) {
    try {
      const W = 460, H = 250, pad = 26;
      const [x0, x1] = spec.domain;
      const compiled = spec.curves.map((c) => ({ ...c, f: compileExpr(c.fn) })).filter((c) => c.f);
      if (!compiled.length) return '';

      const N = 200;
      const xs = [];
      for (let i = 0; i <= N; i++) xs.push(x0 + (i / N) * (x1 - x0));

      // Collect finite y-values (robustly bounded) to auto-scale the y-axis.
      const ally = [];
      for (const c of compiled) for (const x of xs) {
        const y = c.f(x);
        if (isFinite(y) && Math.abs(y) < 1e4) ally.push(y);
      }
      if (spec.area) ally.push(0);
      if (!ally.length) return '';
      let ymin = Math.min(...ally), ymax = Math.max(...ally);
      if (ymin === ymax) { ymin -= 1; ymax += 1; }
      const padY = (ymax - ymin) * 0.12;
      ymin -= padY; ymax += padY;
      if (ymin > 0) ymin = 0; if (ymax < 0) ymax = 0; // keep the x-axis visible

      const sx = (x) => pad + ((x - x0) / (x1 - x0)) * (W - 2 * pad);
      const sy = (y) => H - pad - ((y - ymin) / (ymax - ymin)) * (H - 2 * pad);

      const parts = [];
      // Axes.
      if (0 >= ymin && 0 <= ymax) parts.push(`<line x1="${pad}" y1="${sy(0)}" x2="${W - pad}" y2="${sy(0)}" class="fcax"/>`);
      if (0 >= x0 && 0 <= x1) parts.push(`<line x1="${sx(0)}" y1="${pad}" x2="${sx(0)}" y2="${H - pad}" class="fcax"/>`);

      // Shaded area under the first curve.
      if (spec.area) {
        const f = compiled[0].f;
        const [a, b] = spec.area;
        let d = `M ${sx(a)} ${sy(0)}`;
        for (let i = 0; i <= 60; i++) {
          const x = a + (i / 60) * (b - a); const y = f(x);
          if (isFinite(y)) d += ` L ${sx(x)} ${sy(Math.max(ymin, Math.min(ymax, y)))}`;
        }
        d += ` L ${sx(b)} ${sy(0)} Z`;
        parts.push(`<path d="${d}" fill="${PLOT_COLOR[compiled[0].color] || PLOT_COLOR.green}" opacity="0.16"/>`);
      }

      // Curves (breaking the path across asymptotes / out-of-range points).
      compiled.forEach((c) => {
        const col = PLOT_COLOR[c.color] || PLOT_COLOR.green;
        let d = '', pen = false;
        for (const x of xs) {
          const y = c.f(x);
          if (!isFinite(y) || y < ymin - (ymax - ymin) || y > ymax + (ymax - ymin)) { pen = false; continue; }
          d += `${pen ? 'L' : 'M'} ${sx(x).toFixed(1)} ${sy(y).toFixed(1)} `;
          pen = true;
        }
        parts.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linejoin="round"/>`);
      });

      // Tangent line to curve[0] at x0.
      if (spec.tangentAt !== undefined) {
        const f = compiled[0].f, xt = spec.tangentAt, h = (x1 - x0) / 1000;
        const yt = f(xt), slope = (f(xt + h) - f(xt - h)) / (2 * h);
        if (isFinite(yt) && isFinite(slope)) {
          const ya = yt + slope * (x0 - xt), yb = yt + slope * (x1 - xt);
          parts.push(`<line x1="${sx(x0)}" y1="${sy(ya)}" x2="${sx(x1)}" y2="${sy(yb)}" stroke="${PLOT_COLOR.violet}" stroke-width="1.8" stroke-dasharray="5 4"/>`);
          parts.push(`<circle cx="${sx(xt)}" cy="${sy(yt)}" r="4.5" fill="${PLOT_COLOR.violet}"/>`);
        }
      }

      // Secant line through curve[0] at a,b.
      if (spec.secant) {
        const f = compiled[0].f, [a, b] = spec.secant;
        const ya = f(a), yb = f(b);
        if (isFinite(ya) && isFinite(yb)) {
          parts.push(`<line x1="${sx(a)}" y1="${sy(ya)}" x2="${sx(b)}" y2="${sy(yb)}" stroke="${PLOT_COLOR.red}" stroke-width="1.8" stroke-dasharray="5 4"/>`);
          parts.push(`<circle cx="${sx(a)}" cy="${sy(ya)}" r="4" fill="${PLOT_COLOR.red}"/><circle cx="${sx(b)}" cy="${sy(yb)}" r="4" fill="${PLOT_COLOR.red}"/>`);
        }
      }

      // Vertical reference lines (limits / asymptotes).
      for (const v of spec.vlines || []) {
        if (v.x < x0 || v.x > x1) continue;
        parts.push(`<line x1="${sx(v.x)}" y1="${pad}" x2="${sx(v.x)}" y2="${H - pad}" stroke="${PLOT_COLOR.muted}" stroke-width="1.5" stroke-dasharray="3 4"/>`);
        if (v.label) parts.push(`<text x="${sx(v.x) + 4}" y="${pad + 10}" class="fctx">${esc(v.label)}</text>`);
      }

      // Highlighted points.
      for (const p of spec.points || []) {
        const y = compiled[0].f(p.x);
        if (!isFinite(y)) continue;
        parts.push(`<circle cx="${sx(p.x)}" cy="${sy(y)}" r="4.5" fill="${PLOT_COLOR.green}"/>`);
        if (p.label) parts.push(`<text x="${sx(p.x) + 7}" y="${sy(y) - 7}" class="fctx">${esc(p.label)}</text>`);
      }

      const caption = spec.caption ? `<div class="fc-caption">${esc(spec.caption)}</div>` : '';
      return `<svg viewBox="0 0 ${W} ${H}" class="fc-plot" role="img" aria-label="${esc(spec.caption || 'function plot')}">${parts.join('')}</svg>${caption}`;
    } catch {
      return ''; // never let a bad spec break the card
    }
  }

  /* --------------------- Floating study assistant ------------------------ */
  // Always-available tutor that answers with a STRUCTURED snapshot of what's on
  // screen (view, selection, current question/flashcard, recent answers).
  // activeId '' = a fresh, unsent conversation (created on first message).
  const assistant = { loaded: false, activeId: '', chats: [] };

  function assistantContext() {
    const view = currentView();
    const ctx = { view };
    if (view === 'setup') {
      const s = selection();
      ctx.scope = { track: s.track, course: s.course, lesson: s.lesson, topic: s.topic };
    }
    if (view === 'quiz') {
      const q = state.questions[state.idx];
      if (q) {
        const rec = state.log[state.idx];
        ctx.question = { question: q.question, options: q.options, answer: q.answer };
        if (rec) { ctx.question.userAnswer = rec.userAnswer; ctx.question.isCorrect = !!rec.isCorrect; }
      }
    }
    if (view === 'flashcard') {
      const c = fc.view[fc.idx];
      if (c) ctx.card = { id: c.id, concept: c.concept, intuition: c.intuition, formula: c.formula, topic: c.topic };
      else if (fc.scope) ctx.scope = fc.scope;
    }
    const recent = (state.log || []).filter(Boolean).slice(-5).map((r) => ({ topic: r.topic, isCorrect: !!r.isCorrect }));
    if (recent.length) ctx.recent = recent;
    return ctx;
  }

  function toggleAssistant() {
    const panel = $('assistantPanel');
    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !opening);
    $('assistantFab').classList.toggle('active', opening);
    if (opening) {
      updateAssistantHint();
      if (!assistant.loaded) loadAssistant();
      setTimeout(() => $('assistantInput').focus(), 30);
    }
  }

  // Reveal/hide the in-panel AI model + thinking controls. These drive the same
  // global choice as the home card, so switching here affects everything.
  function toggleAssistantSettings() {
    const box = $('assistantSettings');
    if (!box) return;
    const opening = box.classList.contains('hidden');
    box.classList.toggle('hidden', !opening);
    $('assistantSettingsBtn')?.classList.toggle('active', opening);
  }

  function updateAssistantHint() {
    const view = currentView();
    $('assistantHint').textContent = {
      quiz: "I can see this question. Ask for a nudge or an explanation.",
      flashcard: "I can see this flashcard. Ask me to explain it another way.",
      stats: "I can see your progress. Ask me what to focus on.",
      setup: "Ask me what to study, or anything about a topic.",
      result: "Ask me about anything you just answered.",
    }[view] || "I can see what's on your screen. Ask me anything.";
  }

  async function loadAssistant() {
    const log = $('assistantLog');
    log.innerHTML = '<div class="chat-empty">Loading…</div>';
    try {
      await refreshAssistantChats();
      // Reopen the last conversation used on this device, else the most recent.
      const saved = localStorage.getItem('assistant.activeId') || '';
      const pick = assistant.chats.some((c) => c.id === saved) ? saved
        : (assistant.chats[0]?.id || '');
      await openAssistantChat(pick, true);
      assistant.loaded = true;
    } catch (e) {
      log.innerHTML = '<div class="chat-empty">Could not load: ' + esc(e.message) + '</div>';
    }
  }

  // Fetch the conversation list and repaint the slide-in history list.
  async function refreshAssistantChats() {
    const r = await api('/api/assistant/chats');
    assistant.chats = r.chats || [];
    renderAssistantHistList();
  }

  // Human-friendly "time ago" for the history list.
  function relTime(ms) {
    if (!ms) return '';
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    if (d < 7) return d + 'd ago';
    const w = Math.floor(d / 7);
    if (w < 5) return w + 'w ago';
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // Paint the slide-in conversation history. Each row: title + "N messages · time",
  // with a hover-reveal delete. The open conversation is highlighted.
  function renderAssistantHistList() {
    const list = $('assistantHistList');
    if (!list) return;
    if (!assistant.chats.length) {
      list.innerHTML = '<div class="hist-empty">No saved conversations yet.<br>Start chatting and they’ll show up here.</div>';
      return;
    }
    list.innerHTML = assistant.chats.map((c) => {
      const active = c.id === assistant.activeId ? ' active' : '';
      const n = c.count || 0;
      const meta = [n ? `${n} message${n === 1 ? '' : 's'}` : 'Empty', relTime(c.updatedAt)]
        .filter(Boolean).join(' · ');
      return `<button type="button" class="hist-item${active}" onclick="App.openAssistantChatById('${esc(c.id)}')">
        <span class="hist-title">${esc(c.title || 'Conversation')}</span>
        <span class="hist-meta">${esc(meta)}</span>
        <span class="hist-del" role="button" tabindex="0" title="Delete conversation" aria-label="Delete conversation"
              onclick="event.stopPropagation();App.deleteAssistantChat('${esc(c.id)}')">🗑</span>
      </button>`;
    }).join('');
  }

  // Slide the history panel in/out over the chat.
  function toggleAssistantHistory() {
    const hist = $('assistantHistory');
    if (!hist) return;
    const opening = hist.classList.contains('hidden');
    if (opening) { renderAssistantHistList(); hist.classList.remove('hidden'); }
    else hist.classList.add('hidden');
  }

  // Pick a conversation from the history list, then drop back to the chat view.
  function openAssistantChatById(id) {
    $('assistantHistory')?.classList.add('hidden');
    openAssistantChat(id);
  }

  // Load and show a conversation by id ('' = fresh blank chat).
  async function openAssistantChat(id, silent) {
    const log = $('assistantLog');
    assistant.activeId = id || '';
    localStorage.setItem('assistant.activeId', assistant.activeId);
    renderAssistantHistList();
    if (!assistant.activeId) {
      renderChatLog(log, []);
      return;
    }
    if (!silent) log.innerHTML = '<div class="chat-empty">Loading…</div>';
    try {
      const r = await api('/api/assistant/chat?id=' + encodeURIComponent(assistant.activeId));
      renderChatLog(log, r.messages || []);
    } catch (e) {
      log.innerHTML = '<div class="chat-empty">Could not load: ' + esc(e.message) + '</div>';
    }
  }

  // Start a fresh conversation, keeping existing ones in history. Nothing is
  // saved until the first message is sent.
  function newAssistantChat() {
    $('assistantHistory')?.classList.add('hidden');
    openAssistantChat('');
    updateAssistantHint();
    const input = $('assistantInput');
    input.value = '';
    input.focus();
  }

  // Delete a conversation (defaults to the open one). If it was the active chat,
  // fall back to the most recent; otherwise just repaint the list in place.
  async function deleteAssistantChat(id) {
    const target = id || assistant.activeId;
    if (!target) return;
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    const wasActive = target === assistant.activeId;
    try {
      await api('/api/assistant/chat?id=' + encodeURIComponent(target), { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
    await refreshAssistantChats();
    if (wasActive) await openAssistantChat(assistant.chats[0]?.id || '', true);
    else renderAssistantHistList();
  }

  async function sendAssistant() {
    const input = $('assistantInput');
    const msg = input.value.trim();
    if (!msg) return;
    const log = $('assistantLog');
    const send = $('assistantSend');
    input.value = '';
    appendBubble(log, 'user', msg);
    // Quick command: "fixformat" cleans up the current card instead of chatting.
    if (/^\/?fix[\s-]?formats?\b/i.test(msg)) {
      await fixFormatCommand(log);
      input.focus();
      return;
    }
    const thinking = appendBubble(log, 'assistant', 'Thinking…');
    thinking.classList.add('thinking');
    send.disabled = true;
    try {
      const r = await api('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: msg,
          context: assistantContext(),
          conversationId: assistant.activeId || undefined,
        }),
      });
      thinking.remove();
      appendBubble(log, 'assistant', r.reply, r.visual);
      assistant.loaded = true;
      // First message of a new chat gets an id + title — sync the history list.
      if (r.conversationId) {
        assistant.activeId = r.conversationId;
        localStorage.setItem('assistant.activeId', assistant.activeId);
        await refreshAssistantChats();
      }
      refreshCost();
    } catch (e) {
      thinking.remove();
      appendBubble(log, 'assistant', 'Sorry, that failed: ' + esc(e.message));
    } finally {
      send.disabled = false;
      input.focus();
    }
  }

  // Handle the "fixformat" quick command: reformat the CURRENT flashcard's code
  // and math so it renders correctly, and save the corrected card for everyone
  // (admin only). This is a client action, not an LLM chat turn, so it is not
  // saved to the conversation thread. Assumes the user bubble is already shown.
  async function fixFormatCommand(log) {
    const send = $('assistantSend');
    const card = currentView() === 'flashcard' ? fc.view[fc.idx] : null;
    if (!card || !card.id) {
      appendBubble(log, 'assistant', 'Open the flashcard you want fixed, then type **fixformat** and I’ll clean up its code and math formatting.');
      return;
    }
    const thinking = appendBubble(log, 'assistant', 'Fixing the formatting…');
    thinking.classList.add('thinking');
    send.disabled = true;
    try {
      const r = await api('/api/flashcards/fix-format', {
        method: 'POST', body: JSON.stringify({ cardId: card.id }),
      });
      thinking.remove();
      applyCardFix(r.card);
      const changed = r.changed || [];
      if (!changed.length) {
        appendBubble(log, 'assistant', 'This card’s formatting already looks fine — nothing to change.');
      } else {
        fc.flipped = true; // reveal the back so the fixed formula is visible
        renderCard();
        appendBubble(log, 'assistant', 'Fixed the ' + changed.join(' + ') + ' and saved this card for everyone. ✅');
      }
      refreshCost();
    } catch (e) {
      thinking.remove();
      const msg = /admin|forbidden|\(403\)/i.test(e.message)
        ? 'Only an admin can edit shared cards.'
        : 'Sorry, that failed: ' + esc(e.message);
      appendBubble(log, 'assistant', msg);
    } finally {
      send.disabled = false;
    }
  }

  // Patch a card's fields in place across both the visible deck and the master
  // list (same id may appear in each), so the fix shows without a reload.
  function applyCardFix(fields) {
    if (!fields || !fields.id) return;
    for (const arr of [fc.view, fc.cards]) {
      if (!Array.isArray(arr)) continue;
      for (const c of arr) {
        if (c && c.id === fields.id) {
          c.concept = fields.concept;
          c.intuition = fields.intuition;
          c.formula = fields.formula;
        }
      }
    }
  }

  // Admin button (flashcard view): reformat the CURRENT card's code/math and save
  // it for everyone. Same action as the assistant's "fixformat" command, but a
  // one-click button instead of typing.
  async function fixCardFormat() {
    const card = fc.view[fc.idx];
    const btn = $('fcFixFormatBtn');
    const err = $('fcQuizErr');
    if (!card || !card.id) { if (err) err.textContent = 'No card to fix.'; return; }
    err.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Fixing…';
    try {
      const r = await api('/api/flashcards/fix-format', {
        method: 'POST', body: JSON.stringify({ cardId: card.id }),
      });
      applyCardFix(r.card);
      const changed = r.changed || [];
      if (changed.length) {
        fc.flipped = true; // reveal the back so the fixed formula is visible
        renderCard();
        err.textContent = 'Fixed the ' + changed.join(' + ') + ' and saved for everyone.';
      } else {
        btn.disabled = false;
        btn.textContent = '🛠️ Fix format';
        err.textContent = 'This card already looks fine — nothing to change.';
      }
      refreshCost();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = '🛠️ Fix format';
      err.textContent = /admin|forbidden|\(403\)/i.test(e.message)
        ? 'Only an admin can edit shared cards.'
        : 'Fix failed: ' + e.message;
    }
  }

  // Show/hide the inline "edit this card" panel (admin only). Opening it defaults
  // to the hand-edit mode with the current card's fields pre-filled; collapsing it
  // clears everything and resets the buttons.
  function toggleCardEdit() {
    const panel = $('fcEditPanel');
    if (!panel) return;
    if (panel.classList.contains('hidden')) {
      panel.classList.remove('hidden');
      $('fcEditBtn')?.classList.add('active');
      $('fcQuizErr').textContent = '';
      setCardEditMode('manual');
    } else {
      resetCardEditUI();
    }
  }

  // Switch between the two edit modes: "manual" (hand-edit the raw fields) and
  // "prompt" (describe a change for the selected model to apply). Manual mode is
  // (re)filled from the current card each time it's shown so it always reflects
  // what's on screen.
  function setCardEditMode(mode) {
    const manual = mode !== 'prompt';
    $('fcEditManual')?.classList.toggle('hidden', !manual);
    $('fcEditPrompt')?.classList.toggle('hidden', manual);
    $('fcEditModeManual')?.classList.toggle('active', manual);
    $('fcEditModePrompt')?.classList.toggle('active', !manual);
    $('fcQuizErr').textContent = '';
    if (manual) {
      const card = fc.view[fc.idx] || {};
      const c = $('fcEditConcept'); if (c) c.value = card.concept || '';
      const i = $('fcEditIntuition'); if (i) i.value = card.intuition || '';
      const f = $('fcEditFormula'); if (f) f.value = card.formula || '';
      setTimeout(() => $('fcEditConcept')?.focus(), 20);
    } else {
      setTimeout(() => $('fcEditInput')?.focus(), 20);
    }
  }

  // Collapse + reset the edit panel and its buttons to their idle state. Called on
  // every card render (so edit state never leaks across cards) and on Cancel.
  function resetCardEditUI() {
    $('fcEditPanel')?.classList.add('hidden');
    $('fcEditBtn')?.classList.remove('active');
    const inp = $('fcEditInput'); if (inp) inp.value = '';
    for (const id of ['fcEditConcept', 'fcEditIntuition', 'fcEditFormula']) {
      const el = $(id); if (el) el.value = '';
    }
    const save = $('fcEditSave'); if (save) { save.disabled = false; save.textContent = 'Save changes'; }
    const apply = $('fcEditApply'); if (apply) { apply.disabled = false; apply.textContent = 'Apply edit'; }
    const fcFix = $('fcFixFormatBtn'); if (fcFix) { fcFix.disabled = false; fcFix.textContent = '🛠️ Fix format'; }
    // Default back to the hand-edit tab for the next open.
    $('fcEditManual')?.classList.remove('hidden');
    $('fcEditPrompt')?.classList.add('hidden');
    $('fcEditModeManual')?.classList.add('active');
    $('fcEditModePrompt')?.classList.remove('active');
  }

  // ⌘/Ctrl+Enter in the edit box applies the edit (Enter alone inserts a newline).
  function cardEditKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); applyCardEdit(); }
  }

  // Manual mode: save the exact field text the admin typed for this card (no AI),
  // shared for everyone, then re-render so the change shows at once.
  async function saveCardEdit() {
    const card = fc.view[fc.idx];
    const err = $('fcQuizErr');
    const save = $('fcEditSave');
    if (!card || !card.id) { if (err) err.textContent = 'No card to edit.'; return; }
    const concept = ($('fcEditConcept')?.value || '').trim();
    const intuition = ($('fcEditIntuition')?.value || '').trim();
    const formula = ($('fcEditFormula')?.value || '').trim();
    if (!concept) { if (err) err.textContent = 'The concept (front of the card) can’t be empty.'; $('fcEditConcept')?.focus(); return; }
    if (!intuition) { if (err) err.textContent = 'The intuition can’t be empty.'; $('fcEditIntuition')?.focus(); return; }
    err.textContent = '';
    save.disabled = true;
    save.textContent = 'Saving…';
    try {
      const r = await api('/api/flashcards/set', {
        method: 'POST', body: JSON.stringify({ cardId: card.id, concept, intuition, formula }),
      });
      applyCardFix(r.card);
      const changed = r.changed || [];
      if (changed.length) {
        fc.flipped = true; // reveal the back so an edited intuition/formula shows
        renderCard();      // also collapses/resets the edit panel
        $('fcQuizErr').textContent = 'Saved the ' + changed.join(' + ') + ' for everyone. ✅';
      } else {
        save.disabled = false;
        save.textContent = 'Save changes';
        err.textContent = 'Nothing changed — the fields match what’s already saved.';
      }
    } catch (e) {
      save.disabled = false;
      save.textContent = 'Save changes';
      err.textContent = /admin|forbidden|\(403\)/i.test(e.message)
        ? 'Only an admin can edit shared cards.'
        : 'Save failed: ' + e.message;
    }
  }

  // Admin action (flashcard view): apply a plain-English edit to the CURRENT card
  // and save it for everyone, then re-render so the change shows at once. Content
  // may change (unlike Fix format, which only repairs code/math rendering).
  async function applyCardEdit() {
    const card = fc.view[fc.idx];
    const err = $('fcQuizErr');
    const apply = $('fcEditApply');
    if (!card || !card.id) { if (err) err.textContent = 'No card to edit.'; return; }
    const instruction = ($('fcEditInput')?.value || '').trim();
    if (!instruction) { if (err) err.textContent = 'Describe what to change first.'; $('fcEditInput')?.focus(); return; }
    err.textContent = '';
    apply.disabled = true;
    apply.textContent = 'Applying…';
    try {
      const r = await api('/api/flashcards/edit', {
        method: 'POST', body: JSON.stringify({ cardId: card.id, instruction }),
      });
      applyCardFix(r.card);
      const changed = r.changed || [];
      if (changed.length) {
        fc.flipped = true; // reveal the back so an edited intuition/formula shows
        renderCard();      // also collapses/resets the edit panel
        $('fcQuizErr').textContent = 'Updated the ' + changed.join(' + ') + ' and saved for everyone. ✅';
      } else {
        apply.disabled = false;
        apply.textContent = 'Apply edit';
        err.textContent = 'No change was made — try rewording your instruction.';
      }
      refreshCost();
    } catch (e) {
      apply.disabled = false;
      apply.textContent = 'Apply edit';
      err.textContent = /admin|forbidden|\(403\)/i.test(e.message)
        ? 'Only an admin can edit shared cards.'
        : 'Edit failed: ' + e.message;
    }
  }

  // Admin button (quiz view): reformat the CURRENT question's code/math (and strip
  // raw HTML) and save it for everyone, then re-render so the fix shows at once.
  async function fixQuestionFormat() {
    const q = state.questions[state.idx];
    const btn = $('qFixFormatBtn');
    if (!q || !q.id) { alert('This question has no id to fix (offline or generated preview).'); return; }
    btn.disabled = true;
    btn.textContent = 'Fixing…';
    try {
      const r = await api('/api/questions/fix-format', {
        method: 'POST', body: JSON.stringify({ questionId: q.id }),
      });
      // Patch the live question in place (question bank + any log entry) so the
      // re-render reflects the fix without a reload.
      const fix = r.question || {};
      for (const arr of [state.questions, state.log]) {
        if (!Array.isArray(arr)) continue;
        for (const item of arr) {
          if (item && item.id === q.id) {
            item.question = fix.question;
            item.options = fix.options;
            item.answer = fix.answer;
          }
        }
      }
      const changed = r.changed || [];
      renderQuestion(); // resets qFixFormatBtn text/disabled
      if (!changed.length) {
        btn.textContent = 'Already clean ✓';
        btn.disabled = true;
      }
      refreshCost();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = '🛠️ Fix format';
      alert(/admin|forbidden|\(403\)/i.test(e.message)
        ? 'Only an admin can edit shared questions.'
        : 'Fix failed: ' + e.message);
    }
  }

  /* ----------------------------- Cost widget ----------------------------- */
  // Live AI token/cost pill: "session" (spend since this page load) + all-time.
  const cost = { baseline: null, total: null };

  function fmtUsd(n) {
    const v = Number(n) || 0;
    return '$' + (v < 1 ? v.toFixed(4) : v.toFixed(2));
  }
  function fmtTokens(n) {
    const v = Number(n) || 0;
    if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k';
    return String(v);
  }

  async function refreshCost() {
    if (!state.authed) return;
    try {
      const u = await api('/api/usage');
      cost.total = u;
      if (cost.baseline == null) cost.baseline = u.costUsd || 0; // this session starts here
      renderCost();
    } catch { /* ignore (guest / offline) */ }
  }

  function renderCost() {
    const u = cost.total;
    if (!u) return;
    const sessionCost = Math.max(0, (u.costUsd || 0) - (cost.baseline || 0));
    $('costMain').textContent = fmtUsd(sessionCost);
    $('costSub').textContent = `session · ${fmtUsd(u.costUsd)} all-time`;
    const rows = Object.entries(u.byModel || {})
      .sort((a, b) => (b[1].costUsd || 0) - (a[1].costUsd || 0))
      .map(([m, x]) => `<div class="cost-row"><span>${esc(m)}</span><span>${fmtUsd(x.costUsd)}</span></div>`)
      .join('') || '<div class="cost-row"><span>No spend yet</span><span>$0</span></div>';
    $('costDetail').innerHTML = `
      <div class="cost-detail-head">Your AI spend</div>
      <div class="cost-row total"><span>All-time</span><span>${fmtUsd(u.costUsd)}</span></div>
      <div class="cost-row"><span>Tokens in / out</span><span>${fmtTokens(u.inputTokens)} / ${fmtTokens(u.outputTokens)}</span></div>
      <div class="cost-row"><span>Requests</span><span>${u.calls || 0}</span></div>
      <div class="cost-detail-head">By model</div>
      ${rows}`;
  }

  function toggleCostDetail() { $('costDetail').classList.toggle('hidden'); }

  /* --------------------- Multi-select quiz builder ----------------------- */
  // A searchable Track > Course > Unit checkbox tree. Selection is tracked at the
  // topic (leaf) level; ticking a parent toggles all its topics. Search narrows
  // which nodes are rendered without changing the current selection.
  const ms = { selected: new Set(), search: '', open: new Set(), nodeTopics: new Map() };

  const msSortKeys = (m) => [...m.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  function renderMultiTree() {
    const treeEl = $('msTree');
    if (!treeEl) return;
    const term = ms.search;
    let leaves = state.catalog.filter((r) => r.topic);
    if (term) {
      leaves = leaves.filter((r) =>
        [r.track, r.course, r.lesson, r.topic].some((v) => (v || '').toLowerCase().includes(term)));
    }
    const tracks = new Map();
    for (const r of leaves) {
      const t = r.track || 'Unknown Track', c = r.course || 'Unknown Course', l = r.lesson || 'Unknown Unit';
      if (!tracks.has(t)) tracks.set(t, new Map());
      const courses = tracks.get(t);
      if (!courses.has(c)) courses.set(c, new Map());
      const lessons = courses.get(c);
      if (!lessons.has(l)) lessons.set(l, new Set());
      lessons.get(l).add(r.topic);
    }

    ms.nodeTopics = new Map();
    let html = '';
    for (const track of msSortKeys(tracks)) {
      const courses = tracks.get(track);
      const tKey = 'T::' + track;
      const tTopics = [];
      courses.forEach((ls) => ls.forEach((set) => set.forEach((x) => tTopics.push(x))));
      ms.nodeTopics.set(tKey, tTopics);
      const tOpen = !!term || ms.open.has(tKey);
      html += msRow(tKey, 0, track, tTopics, true, tOpen);
      if (!tOpen) continue;
      for (const course of [...courses.keys()].sort(byCourseName)) {
        const lessons = courses.get(course);
        const cKey = 'C::' + track + '||' + course;
        const cTopics = [];
        lessons.forEach((set) => set.forEach((x) => cTopics.push(x)));
        ms.nodeTopics.set(cKey, cTopics);
        const cOpen = !!term || ms.open.has(cKey);
        html += msRow(cKey, 1, course, cTopics, true, cOpen);
        if (!cOpen) continue;
        for (const lesson of msSortKeys(lessons)) {
          const lTopics = [...lessons.get(lesson)];
          const lKey = 'L::' + track + '||' + course + '||' + lesson;
          ms.nodeTopics.set(lKey, lTopics);
          html += msRow(lKey, 2, lesson, lTopics, false, false);
        }
      }
    }
    treeEl.innerHTML = html || '<p class="ms-empty">No matches.</p>';
    updateMsSummary();
  }

  function msCheckState(topics) {
    let sel = 0;
    for (const t of topics) if (ms.selected.has(t)) sel++;
    return !sel ? 'off' : sel === topics.length ? 'on' : 'partial';
  }

  function msRow(key, level, name, topics, expandable, open) {
    const st = msCheckState(topics);
    const caret = expandable
      ? `<button class="ms-caret" data-exp="${esc(key)}" aria-label="Expand">${open ? '▾' : '▸'}</button>`
      : '<span class="ms-caret-sp"></span>';
    const mark = st === 'on' ? '✓' : st === 'partial' ? '–' : '';
    return `<div class="ms-row lvl-${level}" style="padding-left:${8 + level * 18}px">
      ${caret}
      <button class="ms-box ${st}" data-check="${esc(key)}" aria-label="Select ${esc(name)}">${mark}</button>
      <span class="ms-name" data-check="${esc(key)}">${esc(name)}</span>
      <span class="ms-count">${topics.length}</span>
    </div>`;
  }

  function toggleMsNode(key) {
    const topics = ms.nodeTopics.get(key);
    if (!topics) return;
    if (msCheckState(topics) === 'on') topics.forEach((t) => ms.selected.delete(t));
    else topics.forEach((t) => ms.selected.add(t));
    renderMultiTree();
  }

  function updateMsSummary() {
    const n = ms.selected.size;
    $('msSummary').textContent = n ? `${n} topic${n === 1 ? '' : 's'} selected` : 'Nothing selected yet';
  }

  function msClear() { ms.selected.clear(); renderMultiTree(); }

  /* ---------------------------- Knowledge Map ---------------------------- */
  // "Visualize my progress": the catalog as a graph, at three zoom levels —
  // Courses / Units (default) / Topics — clustered by track. Aggregate nodes
  // (courses/units) render as pies: the filled slice is the share of topics
  // practised, its colour the accuracy there. Topic nodes are dots (hollow =
  // never attempted). Click anything to light up what it builds on / unlocks;
  // units drill down into their topics. Served by /api/graph; the level
  // aggregation is all client-side.
  //
  // Rendered on a <canvas> with a small custom force layout (no library):
  // springs along edges, grid-bucketed repulsion, track anchors + per-course
  // sub-anchors so clusters form organic clumps instead of one hairball.
  const graph = {
    raw: null,            // last /api/graph payload (topic-level truth)
    level: null,          // 'course' | 'lesson' | 'topic'
    nodes: [],            // current-level nodes [{..., x, y, vx, vy, r}]
    byId: new Map(),
    edges: [],            // current-level edges (aggregated above topic level)
    prereqIn: new Map(),  // id -> [ids it builds on]
    prereqOut: new Map(), // id -> [ids it unlocks]
    flowAdj: new Map(),   // id -> [curriculum neighbours]
    anchors: new Map(),   // track -> {x, y}
    subAnchor: new Map(), // node id -> {x, y} (course clump inside the track)
    trackColor: new Map(),
    tf: { x: 0, y: 0, k: 1 }, // world -> screen: screen = world * k + (x, y)
    selected: null,
    chainDir: 'both',     // 'up' (builds on) | 'both' | 'down' (unlocks)
    related: null,        // Set of node ids highlighted for the selection
    relatedEdges: null,
    hot: null,            // Set of 1-hop neighbour ids (labelled + strongest)
    focus: null,          // Set of node ids scoped by a drill-down (no selection)
    focusInfo: null,      // {label, ids} for the drill-down panel
    hover: null,
    settleTimer: 0,
    drag: null,
    sized: false,
  };

  const GRAPH_POS_KEY = 'agora.graphpos.v4'; // bump when the physics change enough that cached layouts mislead
  const GRAPH_LOD_KEY = 'agora.graphlod';
  // Track identity colours — deliberately distinct from the mastery scale
  // (green/amber/red) and from the violet prereq edges.
  const TRACK_PALETTE = ['#1856c9', '#b3387a', '#0f8f8f', '#c95816', '#5b6ee1', '#7a5c2e'];

  // Physics + sizing per level. `cell` is the seed-grid pitch; rest lengths,
  // repulsion and label sizes all scale from it.
  const LOD = {
    course: { cell: 200, flowK: 0.04, prereqK: 0.010, rep: 4400, gravity: 0.0032, sub: 0, label: 13 },
    lesson: { cell: 105, flowK: 0.045, prereqK: 0.007, rep: 2200, gravity: 0.0023, sub: 0.0022, label: 12 },
    topic: { cell: 44, flowK: 0.05, prereqK: 0.004, rep: 560, gravity: 0.0013, sub: 0.0020, label: 11 },
  };

  // Solid hex versions of accColor (canvas can't resolve CSS vars).
  function accHex(pct) {
    if (pct == null) return '#9aa39e';
    if (pct >= 80) return '#2fa14a';
    if (pct >= 60) return '#c98a16';
    return '#d6453f';
  }

  async function openGraph() {
    if (!state.authed) { showLogin(); return; }
    showOnly('graphView');
    $('graphError').textContent = '';
    // Always refetch: cheap, and it's how newly unlocked cards/attempts/links
    // show up automatically every time the map is opened.
    show('graphLoader'); hide('graphBody');
    try {
      const data = await api('/api/graph');
      hide('graphLoader'); show('graphBody');
      graph.raw = data;
      const saved = localStorage.getItem(GRAPH_LOD_KEY);
      setGraphLevel(LOD[saved] ? saved : 'lesson', { force: true });
      renderGraphCoverage();
    } catch (e) {
      hide('graphLoader');
      $('graphError').textContent = 'Couldn’t load your knowledge map: ' + e.message;
    }
  }

  const pushTo = (map, key, val) => { if (!map.has(key)) map.set(key, []); map.get(key).push(val); };
  const natCmp = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });

  /* --------------------------- level aggregation ------------------------- */
  // The group a topic belongs to at a level (its own id at topic level).
  function groupKeyOf(t, level) {
    if (level === 'course') return `c|${t.track}|${t.course}`;
    if (level === 'lesson') return `l|${t.track}|${t.course}|${t.lesson}`;
    return t.id;
  }

  // Roll topic nodes up into course/unit nodes: pies carrying their members.
  function buildLevelNodes(level) {
    const raw = graph.raw.nodes;
    if (level === 'topic') {
      return raw.map((n) => ({
        ...n,
        agg: false,
        label: n.topic,
        nTopics: 1,
        attemptedTopics: n.attempts > 0 ? 1 : 0,
        x: 0, y: 0, vx: 0, vy: 0,
        r: 4 + Math.min(5, Math.sqrt(n.questionCount || 1)),
      }));
    }
    const groups = new Map();
    for (const t of raw) {
      const key = groupKeyOf(t, level);
      let g = groups.get(key);
      if (!g) {
        g = {
          id: key, agg: true,
          label: level === 'course' ? t.course : t.lesson,
          topic: level === 'course' ? t.course : t.lesson, // panel/search title
          track: t.track, course: t.course, lesson: level === 'lesson' ? t.lesson : '',
          topics: [], nTopics: 0, attemptedTopics: 0, attempts: 0,
          accSum: 0, questionCount: 0, cardCount: 0, priority: 0,
          x: 0, y: 0, vx: 0, vy: 0, r: 0,
        };
        groups.set(key, g);
      }
      g.topics.push(t);
      g.nTopics += 1;
      g.questionCount += t.questionCount || 0;
      g.cardCount += (t.cards || []).length;
      g.priority = Math.max(g.priority, t.priority || 0);
      if (t.attempts > 0) {
        g.attemptedTopics += 1;
        g.attempts += t.attempts;
        g.accSum += t.accuracy || 0;
      }
    }
    for (const g of groups.values()) {
      g.accuracy = g.attemptedTopics ? Math.round(g.accSum / g.attemptedTopics) : null;
      g.topics.sort((a, b) => natCmp(a.lesson, b.lesson) || natCmp(a.topic, b.topic));
      g.r = level === 'course'
        ? 14 + Math.min(18, Math.sqrt(g.nTopics) * 2.2)
        : 8 + Math.min(12, Math.sqrt(g.nTopics) * 2.4);
    }
    return [...groups.values()];
  }

  // Project topic-level edges onto the current level, merging duplicates into
  // one weighted edge and dropping edges that fold inside a single group.
  function buildLevelEdges(level) {
    const raw = graph.raw.edges || [];
    const known = new Set(graph.raw.nodes.map((n) => n.id));
    if (level === 'topic') {
      return raw.filter((e) => known.has(e.from) && known.has(e.to)).map((e) => ({ ...e, weight: 1 }));
    }
    const keyOf = new Map(graph.raw.nodes.map((n) => [n.id, groupKeyOf(n, level)]));
    const agg = new Map();
    for (const e of raw) {
      const from = keyOf.get(e.from), to = keyOf.get(e.to);
      if (!from || !to || from === to) continue;
      const k = `${e.kind}|${from}|${to}`;
      const cur = agg.get(k);
      if (cur) { cur.weight += 1; }
      else agg.set(k, { from, to, kind: e.kind, why: e.why || '', weight: 1 });
    }
    return [...agg.values()];
  }

  /* ------------------------------ structures ----------------------------- */
  function buildGraphStructures() {
    const level = graph.level;
    graph.selected = null;
    graph.related = graph.relatedEdges = graph.hot = null;
    graph.focus = graph.focusInfo = null;
    graph.hover = null;
    graph.nodes = buildLevelNodes(level);
    graph.byId = new Map(graph.nodes.map((n) => [n.id, n]));
    graph.edges = buildLevelEdges(level);
    graph.prereqIn = new Map(); graph.prereqOut = new Map(); graph.flowAdj = new Map();
    for (const e of graph.edges) {
      if (e.kind === 'prereq') {
        pushTo(graph.prereqIn, e.to, e.from);
        pushTo(graph.prereqOut, e.from, e.to);
      } else {
        pushTo(graph.flowAdj, e.from, e.to);
        pushTo(graph.flowAdj, e.to, e.from);
      }
    }

    // One anchor per track, separated far enough that the two biggest clusters
    // can't touch; per-course sub-anchors ring each track so courses clump.
    const cell = LOD[level].cell;
    const counts = new Map();
    for (const n of graph.nodes) counts.set(n.track, (counts.get(n.track) || 0) + 1);
    const tracks = [...counts.keys()].sort();
    graph.trackColor = new Map(tracks.map((t, i) => [t, TRACK_PALETTE[i % TRACK_PALETTE.length]]));
    const leg = $('graphTrackLegend');
    if (leg) {
      leg.innerHTML = tracks.map((t) =>
        `<span class="gl-item gl-track"><span class="gl-dot" style="background:${graph.trackColor.get(t)}"></span>${esc(t)}</span>`).join('');
    }
    const radii = tracks.map((t) => (Math.ceil(Math.sqrt(counts.get(t))) * cell) / 2);
    const sorted = [...radii].sort((a, b) => b - a);
    // Anchor circle sized so the biggest clusters slightly interlock (chord
    // between adjacent anchors < their radii sum): the lobes touch and the map
    // reads as one organic mass — brain, not islands.
    const chord = 0.72 * ((sorted[0] || 0) + (sorted[1] || 0));
    const R = tracks.length > 1 ? Math.max(160, chord / (2 * Math.sin(Math.PI / tracks.length))) : 0;
    graph.anchors = new Map(tracks.map((t, i) => {
      const a = (i / tracks.length) * Math.PI * 2 - Math.PI / 2;
      return [t, { x: Math.cos(a) * R, y: Math.sin(a) * R }];
    }));

    // Course clumps: courses of a track sit on a ring inside its cluster, in
    // curriculum order, and every node is pulled gently toward its course spot.
    graph.subAnchor = new Map();
    if (LOD[level].sub > 0) {
      const byTrack = new Map();
      for (const n of graph.nodes) pushTo(byTrack, n.track, n);
      for (const [t, list] of byTrack) {
        const anchor = graph.anchors.get(t);
        const courses = [...new Set(list.map((n) => n.course))].sort(byCourseName);
        const ringR = (Math.ceil(Math.sqrt(list.length)) * cell) / 2;
        const spot = new Map(courses.map((c, i) => {
          if (courses.length === 1) return [c, anchor];
          const a = (i / courses.length) * Math.PI * 2;
          return [c, { x: anchor.x + Math.cos(a) * ringR * 0.62, y: anchor.y + Math.sin(a) * ringR * 0.62 }];
        }));
        for (const n of list) graph.subAnchor.set(n.id, spot.get(n.course) || anchor);
      }
    }
  }

  // Deterministic starting positions: each track is a boustrophedon grid in
  // curriculum order around its anchor, so the flow spine starts untangled.
  // Cached positions (per level, from the last visit) take precedence.
  function initGraphPositions(cachedPos) {
    const cell = LOD[graph.level].cell;
    const byTrack = new Map();
    for (const n of graph.nodes) pushTo(byTrack, n.track, n);
    for (const [t, list] of byTrack) {
      list.sort((a, b) => byCourseName(a.course, b.course) || natCmp(a.lesson, b.lesson) || natCmp(a.topic, b.topic));
      const anchor = graph.anchors.get(t);
      const cols = Math.ceil(Math.sqrt(list.length));
      list.forEach((n, i) => {
        if (cachedPos && cachedPos[n.id]) { n.x = cachedPos[n.id][0]; n.y = cachedPos[n.id][1]; return; }
        const row = Math.floor(i / cols);
        const col = i % cols;
        const c = row % 2 ? cols - 1 - col : col;
        n.x = anchor.x + (c - (cols - 1) / 2) * cell + (Math.random() - 0.5) * 8;
        n.y = anchor.y + (row - (list.length / cols - 1) / 2) * cell + (Math.random() - 0.5) * 8;
      });
    }
  }

  // One physics step: springs along edges (cross-track prerequisites are
  // drawn but exert almost no pull, so clusters stay apart), short-range
  // repulsion via a spatial grid, anchor + course-clump gravity, damping.
  function graphTick() {
    const P = LOD[graph.level];
    const cell = P.cell;
    for (const e of graph.edges) {
      const a = graph.byId.get(e.from), b = graph.byId.get(e.to);
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const rest = e.kind === 'flow' ? cell * 1.35 : cell * 3.2;
      let k = e.kind === 'flow' ? P.flowK : P.prereqK;
      if (e.kind === 'prereq' && a.track !== b.track) k *= 0.22;
      const f = (k * (d - rest)) / d;
      a.vx += dx * f; a.vy += dy * f;
      b.vx -= dx * f; b.vy -= dy * f;
    }
    const CELL = cell * 1.8;
    const buckets = new Map();
    const keyOf = (cx, cy) => cx * 100003 + cy;
    for (const n of graph.nodes) {
      pushTo(buckets, keyOf(Math.floor(n.x / CELL), Math.floor(n.y / CELL)), n);
    }
    for (const n of graph.nodes) {
      const cx = Math.floor(n.x / CELL), cy = Math.floor(n.y / CELL);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          const bucket = buckets.get(keyOf(gx, gy));
          if (!bucket) continue;
          for (const m of bucket) {
            if (m === n) continue;
            let dx = n.x - m.x, dy = n.y - m.y;
            let d2 = dx * dx + dy * dy;
            if (d2 > CELL * CELL) continue;
            if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
            const f = P.rep / d2;
            n.vx += dx * f * 0.05;
            n.vy += dy * f * 0.05;
          }
        }
      }
    }
    for (const n of graph.nodes) {
      const a = graph.anchors.get(n.track) || { x: 0, y: 0 };
      n.vx += (a.x - n.x) * P.gravity;
      n.vy += (a.y - n.y) * P.gravity;
      if (P.sub > 0) {
        const s = graph.subAnchor.get(n.id);
        if (s) { n.vx += (s.x - n.x) * P.sub; n.vy += (s.y - n.y) * P.sub; }
      }
      n.vx *= 0.82; n.vy *= 0.82;
      n.x += Math.max(-16, Math.min(16, n.vx));
      n.y += Math.max(-16, Math.min(16, n.vy));
    }
  }

  // Relax the layout over rAF chunks so the tab stays responsive, then cache
  // the settled positions (per level) for instant reopening.
  function layoutGraph() {
    const cacheKey = `${GRAPH_POS_KEY}.${graph.level}`;
    const cached = lsGet(cacheKey);
    const pos = cached && cached.pos ? cached.pos : null;
    const covered = pos ? graph.nodes.filter((n) => pos[n.id]).length : 0;
    const warm = pos && covered / graph.nodes.length > 0.95;
    initGraphPositions(warm ? pos : null);
    let remaining = warm ? 60 : 320;
    cancelAnimationFrame(graph.settleTimer);
    graph.userCam = false; // becomes true the moment the user pans/zooms
    fitGraphView();
    if (!warm) show('graphSettling');
    const level = graph.level; // bail out if the level changes mid-settle
    const step = () => {
      if (graph.level !== level) return;
      for (let i = 0; i < 25 && remaining > 0; i++, remaining--) graphTick();
      // Camera follows the layout while it settles (a drill-down tracks its
      // group), unless the user has taken over the viewport.
      if (!graph.userCam) {
        const members = graph.focus ? [...graph.focus].map((id) => graph.byId.get(id)).filter(Boolean) : graph.nodes;
        if (members.length) fitGraphView(members, graph.focus ? 1.6 : 2);
      }
      graphDraw();
      if (remaining > 0) {
        graph.settleTimer = requestAnimationFrame(step);
      } else {
        hide('graphSettling');
        // Final frame after the physics settle: a drill-down keeps its group
        // centred; otherwise show the whole map (unless the user took over).
        if (!graph.userCam) {
          if (graph.focus) {
            const members = [...graph.focus].map((id) => graph.byId.get(id)).filter(Boolean);
            if (members.length) fitGraphView(members, 1.6);
          } else if (!graph.selected) {
            fitGraphView();
          }
        }
        graphDraw();
        const save = {};
        for (const n of graph.nodes) save[n.id] = [Math.round(n.x), Math.round(n.y)];
        lsSet(cacheKey, { pos: save });
      }
    };
    graph.settleTimer = requestAnimationFrame(step);
  }

  // Switch Courses / Units / Topics. Rebuilds structures + layout from the
  // same payload; the picked level sticks across visits.
  function setGraphLevel(level, { force = false } = {}) {
    if (!LOD[level] || !graph.raw) return;
    if (!force && level === graph.level) return;
    graph.level = level;
    localStorage.setItem(GRAPH_LOD_KEY, level);
    document.querySelectorAll('#graphLod button').forEach((b) =>
      b.classList.toggle('active', b.dataset.lod === level));
    buildGraphStructures();
    sizeGraphCanvas();
    layoutGraph();
    renderGraphPanel();
  }

  function sizeGraphCanvas() {
    const wrap = $('graphCanvasWrap');
    const cv = $('graphCanvas');
    if (!wrap || !cv) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.max(1, Math.round(rect.width * dpr));
    cv.height = Math.max(1, Math.round(rect.height * dpr));
    cv.style.width = rect.width + 'px';
    cv.style.height = rect.height + 'px';
    graph.sized = true;
  }

  function graphViewSize() {
    const cv = $('graphCanvas');
    const dpr = window.devicePixelRatio || 1;
    return { w: cv.width / dpr, h: cv.height / dpr };
  }

  function nodesBBox(nodes) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }
    return { minX, minY, maxX, maxY };
  }

  function fitGraphView(nodes = graph.nodes, maxK = 2) {
    if (!nodes.length) return;
    const { minX, minY, maxX, maxY } = nodesBBox(nodes);
    const { w, h } = graphViewSize();
    const pad = 56;
    const k = Math.min(maxK, Math.max(0.12,
      Math.min((w - pad * 2) / Math.max(1, maxX - minX), (h - pad * 2) / Math.max(1, maxY - minY))));
    graph.tf.k = k;
    graph.tf.x = w / 2 - ((minX + maxX) / 2) * k;
    graph.tf.y = h / 2 - ((minY + maxY) / 2) * k;
  }

  function graphCenterOn(n, minZoom = 1.1) {
    graph.userCam = true; // an explicit jump owns the viewport
    const { w, h } = graphViewSize();
    if (graph.tf.k < minZoom) graph.tf.k = minZoom;
    graph.tf.x = w / 2 - n.x * graph.tf.k;
    graph.tf.y = h / 2 - n.y * graph.tf.k;
    graphDraw();
  }

  /* ------------------------------ drawing -------------------------------- */
  function graphDraw() {
    const cv = $('graphCanvas');
    if (!cv || !graph.sized) return;
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = graphViewSize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const { x, y, k } = graph.tf;
    ctx.translate(x, y);
    ctx.scale(k, k);

    const sel = graph.selected;
    const rel = graph.related;
    const relE = graph.relatedEdges;
    const focus = !sel ? graph.focus : null;
    const lw = (px) => px / k;
    const dimmedNode = (n) => (sel && !rel.has(n.id)) || (focus && !focus.has(n.id));


    // Edges: curriculum in quiet gray, prerequisites in violet. Aggregated
    // edges thicken with how many topic-links they bundle.
    for (const e of graph.edges) {
      const a = graph.byId.get(e.from), b = graph.byId.get(e.to);
      const hot = relE && relE.has(e);
      const dim = (sel && !hot) || (focus && !(focus.has(e.from) && focus.has(e.to)));
      const wgt = Math.min(3, Math.sqrt(e.weight || 1));
      if (e.kind === 'flow') {
        ctx.strokeStyle = hot ? 'rgba(31,125,56,0.8)' : dim ? 'rgba(108,118,113,0.05)' : 'rgba(108,118,113,0.22)';
        ctx.lineWidth = lw(hot ? 2 : 0.9 + wgt * 0.3);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      } else {
        ctx.strokeStyle = hot ? 'rgba(124,111,240,0.9)' : dim ? 'rgba(124,111,240,0.04)' : `rgba(124,111,240,${0.10 + wgt * 0.05})`;
        ctx.lineWidth = lw(hot ? 2.2 : 0.8 + wgt * 0.5);
        const mx = (a.x + b.x) / 2 - (b.y - a.y) * 0.10;
        const my = (a.y + b.y) / 2 + (b.x - a.x) * 0.10;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.stroke();
        if (hot) drawArrowhead(ctx, mx, my, b, lw(9));
      }
    }

    // Nodes.
    for (const n of graph.nodes) {
      const isSel = sel && n.id === sel.id;
      const isHover = graph.hover && graph.hover.id === n.id;
      ctx.globalAlpha = dimmedNode(n) ? 0.16 : 1;
      if (isSel || isHover) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + lw(6), 0, Math.PI * 2);
        ctx.fillStyle = isSel ? 'rgba(124,111,240,0.28)' : 'rgba(14,21,18,0.10)';
        ctx.fill();
      }
      if (n.agg) drawPieNode(ctx, n, lw);
      else drawTopicNode(ctx, n, lw);
      if (isSel) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + lw(3), 0, Math.PI * 2);
        ctx.strokeStyle = '#7c6ff0';
        ctx.lineWidth = lw(2.2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    drawGraphLabels(ctx, lw, k);
  }

  // Aggregate node: a pie — filled slice = share of its topics practised,
  // slice colour = accuracy over those. The ring is the TRACK's colour (that's
  // how clusters are identified — no blob, no big on-canvas names).
  function drawPieNode(ctx, n, lw) {
    const frac = n.nTopics ? n.attemptedTopics / n.nTopics : 0;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fillStyle = '#eef1ea';
    ctx.fill();
    if (frac > 0) {
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.arc(n.x, n.y, n.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac));
      ctx.closePath();
      ctx.fillStyle = accHex(n.accuracy);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.strokeStyle = graph.trackColor.get(n.track) || 'rgba(14,21,18,0.20)';
    ctx.lineWidth = lw(1.7);
    ctx.stroke();
  }

  // Topic node: fill = mastery (light gray = never attempted), ring = track.
  function drawTopicNode(ctx, n, lw) {
    const taken = n.attempts > 0;
    const track = graph.trackColor.get(n.track) || '#9aa39e';
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fillStyle = taken ? accHex(n.accuracy) : '#f3f5f1';
    ctx.fill();
    ctx.lineWidth = lw(taken ? 1.4 : 1.2);
    ctx.strokeStyle = taken ? track : track + '99';
    ctx.stroke();
  }

  // Labels with collision culling: candidates in priority order each claim a
  // rectangle; anything that would overlap simply doesn't draw. A soft halo
  // keeps text readable over edges.
  function drawGraphLabels(ctx, lw, k) {
    const sel = graph.selected;
    const size = LOD[graph.level].label;
    const zoomedIn = graph.level === 'topic' ? k >= 1.25 : true;

    let candidates = [];
    if (sel) {
      // Selected + its DIRECT neighbours get labels; the further chain glows
      // but stays quiet (that's what killed readability before).
      candidates = [sel, ...(graph.hot ? [...graph.hot].map((id) => graph.byId.get(id)).filter(Boolean) : [])];
    } else if (graph.focus) {
      candidates = [...graph.focus].map((id) => graph.byId.get(id)).filter(Boolean);
    } else if (zoomedIn) {
      candidates = [...graph.nodes].sort((a, b) => b.r - a.r);
    }
    if (graph.hover && !candidates.includes(graph.hover)) candidates.unshift(graph.hover);
    if (!candidates.length) return;

    ctx.font = `600 ${lw(size)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    const placed = [];
    const lh = lw(size + 3);
    for (const n of candidates) {
      const text = n.label.length > 28 ? n.label.slice(0, 27) + '…' : n.label;
      const tw = ctx.measureText(text).width;
      const rect = { x: n.x - tw / 2 - lw(3), y: n.y - n.r - lh - lw(6), w: tw + lw(6), h: lh + lw(4) };
      if (placed.some((p) => rect.x < p.x + p.w && p.x < rect.x + rect.w && rect.y < p.y + p.h && p.y < rect.y + rect.h)) continue;
      placed.push(rect);
      const ty = n.y - n.r - lw(7);
      ctx.strokeStyle = 'rgba(255,255,255,0.88)';
      ctx.lineWidth = lw(3.5);
      ctx.strokeText(text, n.x, ty);
      ctx.fillStyle = sel && n.id === sel.id ? 'rgba(14,21,18,0.95)' : 'rgba(14,21,18,0.72)';
      ctx.fillText(text, n.x, ty);
    }
  }

  function drawArrowhead(ctx, cx, cy, b, size) {
    const ang = Math.atan2(b.y - cy, b.x - cx);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - size * Math.cos(ang - 0.42), b.y - size * Math.sin(ang - 0.42));
    ctx.lineTo(b.x - size * Math.cos(ang + 0.42), b.y - size * Math.sin(ang + 0.42));
    ctx.closePath();
    ctx.fillStyle = 'rgba(124,111,240,0.9)';
    ctx.fill();
  }

  /* ---------------------------- interaction ------------------------------ */
  function graphHit(sx, sy) {
    const wx = (sx - graph.tf.x) / graph.tf.k;
    const wy = (sy - graph.tf.y) / graph.tf.k;
    const slack = 6 / graph.tf.k;
    let best = null, bestD = Infinity;
    for (const n of graph.nodes) {
      const d = Math.hypot(n.x - wx, n.y - wy);
      if (d < n.r + slack && d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  // Select a node: BFS both ways along prereq edges gives the chain it builds
  // on and unlocks; only DIRECT neighbours get labels (graph.hot).
  function graphSelect(id, center = false) {
    graph.focus = graph.focusInfo = null;
    graph.selected = id ? graph.byId.get(id) || null : null;
    if (!graph.selected) {
      graph.related = graph.relatedEdges = graph.hot = null;
      renderGraphPanel();
      graphDraw();
      return;
    }
    const n = graph.selected;
    const dir = graph.chainDir || 'both';
    const rel = new Set([n.id]);
    const walk = (adj) => {
      const q = [n.id];
      const seen = new Set([n.id]);
      while (q.length) {
        const cur = q.shift();
        for (const next of adj.get(cur) || []) {
          if (!seen.has(next)) { seen.add(next); rel.add(next); q.push(next); }
        }
      }
    };
    if (dir !== 'down') walk(graph.prereqIn);   // what it builds on
    if (dir !== 'up') walk(graph.prereqOut);    // what it unlocks
    if (dir === 'both') for (const f of graph.flowAdj.get(n.id) || []) rel.add(f);
    graph.related = rel;
    graph.hot = new Set([
      ...(dir !== 'down' ? graph.prereqIn.get(n.id) || [] : []),
      ...(dir !== 'up' ? graph.prereqOut.get(n.id) || [] : []),
    ]);
    graph.relatedEdges = new Set(graph.edges.filter((e) =>
      (e.kind === 'prereq' && rel.has(e.from) && rel.has(e.to)) ||
      (e.kind === 'flow' && (e.from === n.id || e.to === n.id))));
    renderGraphPanel();
    if (center) graphCenterOn(n);
    else graphDraw();
  }

  // Jump to ONE topic from anywhere (search, insights, a unit's topic list):
  // switches to the Topics level if needed, then selects + centres it.
  function graphJumpToTopic(topicId) {
    if (graph.level !== 'topic') setGraphLevel('topic');
    graphSelect(topicId, true);
  }

  // Drill into a unit/course: switch to Topics scoped (visually) to its
  // members — they stay bright, the rest of the map fades back.
  function graphDrillInto(aggId) {
    const g = graph.byId.get(aggId);
    if (!g || !g.agg) return;
    const ids = g.topics.map((t) => t.id);
    const label = g.label;
    const crumb = [g.track, g.course, g.lesson].filter(Boolean).join(' › ');
    setGraphLevel('topic');
    graph.focus = new Set(ids);
    graph.focusInfo = { label, crumb, ids };
    const members = ids.map((id) => graph.byId.get(id)).filter(Boolean);
    if (members.length) fitGraphView(members, 1.6);
    renderGraphPanel();
    graphDraw();
  }

  function wireGraphEvents() {
    const cv = $('graphCanvas');
    if (!cv) return;
    const tip = $('graphTip');

    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      graph.drag = { sx: e.offsetX, sy: e.offsetY, tx: graph.tf.x, ty: graph.tf.y, moved: false };
    });
    cv.addEventListener('pointermove', (e) => {
      if (graph.drag) {
        const dx = e.offsetX - graph.drag.sx, dy = e.offsetY - graph.drag.sy;
        if (Math.abs(dx) + Math.abs(dy) > 4) graph.drag.moved = true;
        if (graph.drag.moved) {
          graph.userCam = true;
          graph.tf.x = graph.drag.tx + dx;
          graph.tf.y = graph.drag.ty + dy;
          graphDraw();
        }
        return;
      }
      const hit = graphHit(e.offsetX, e.offsetY);
      if (hit !== graph.hover) {
        graph.hover = hit;
        cv.style.cursor = hit ? 'pointer' : 'grab';
        if (hit) {
          const stats = hit.agg
            ? `${hit.attemptedTopics}/${hit.nTopics} topics practised${hit.accuracy != null ? ` · ${hit.accuracy}%` : ''}`
            : hit.attempts ? `${hit.accuracy}% · ${hit.attempts} attempt${hit.attempts === 1 ? '' : 's'}` : 'Not started';
          tip.innerHTML = `<b>${esc(hit.label)}</b><span>${esc(stats)} · ${esc(hit.agg && graph.level === 'course' ? hit.track : hit.course)}</span>`;
          tip.classList.remove('hidden');
        } else {
          tip.classList.add('hidden');
        }
        graphDraw();
      }
      if (hit) {
        tip.style.left = e.offsetX + 14 + 'px';
        tip.style.top = e.offsetY + 12 + 'px';
      }
    });
    cv.addEventListener('pointerup', (e) => {
      const wasDrag = graph.drag && graph.drag.moved;
      graph.drag = null;
      if (wasDrag) return;
      const hit = graphHit(e.offsetX, e.offsetY);
      graphSelect(hit ? hit.id : null);
    });
    cv.addEventListener('pointerleave', () => {
      graph.hover = null;
      tip.classList.add('hidden');
      graphDraw();
    });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      graph.userCam = true;
      const factor = Math.exp(-e.deltaY * 0.0012);
      const k2 = Math.min(6, Math.max(0.1, graph.tf.k * factor));
      graph.tf.x = e.offsetX - ((e.offsetX - graph.tf.x) / graph.tf.k) * k2;
      graph.tf.y = e.offsetY - ((e.offsetY - graph.tf.y) / graph.tf.k) * k2;
      graph.tf.k = k2;
      graphDraw();
    }, { passive: false });

    const zoomBy = (f) => {
      graph.userCam = true;
      const { w, h } = graphViewSize();
      const k2 = Math.min(6, Math.max(0.1, graph.tf.k * f));
      graph.tf.x = w / 2 - ((w / 2 - graph.tf.x) / graph.tf.k) * k2;
      graph.tf.y = h / 2 - ((h / 2 - graph.tf.y) / graph.tf.k) * k2;
      graph.tf.k = k2;
      graphDraw();
    };
    $('graphZoomIn').addEventListener('click', () => zoomBy(1.35));
    $('graphZoomOut').addEventListener('click', () => zoomBy(1 / 1.35));
    $('graphZoomFit').addEventListener('click', () => { fitGraphView(); graphDraw(); });

    // Search topics AND units; picking a result jumps (switching level if
    // needed) and selects it.
    const search = $('graphSearch');
    const results = $('graphSearchResults');
    const runSearch = () => {
      const q = search.value.trim().toLowerCase();
      if (!q || !graph.raw) { results.classList.add('hidden'); return; }
      const topicHits = graph.raw.nodes
        .filter((n) => n.topic.toLowerCase().includes(q))
        .slice(0, 6)
        .map((n) => ({ kind: 'topic', id: n.id, label: n.topic, sub: n.course, acc: n.attempts ? n.accuracy : null, taken: n.attempts > 0 }));
      const seen = new Set();
      const unitHits = [];
      for (const n of graph.raw.nodes) {
        if (!n.lesson.toLowerCase().includes(q)) continue;
        const key = `l|${n.track}|${n.course}|${n.lesson}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unitHits.push({ kind: 'unit', id: key, label: n.lesson, sub: n.course, acc: null, taken: true });
        if (unitHits.length >= 3) break;
      }
      const hits = [...unitHits, ...topicHits].slice(0, 8);
      if (!hits.length) { results.classList.add('hidden'); return; }
      results.innerHTML = hits.map((hkt) => `
        <button data-graph-kind="${hkt.kind}" data-graph-id="${esc(hkt.id)}">
          <span class="gsr-dot" style="background:${hkt.kind === 'unit' ? '#7c6ff0' : hkt.taken ? accHex(hkt.acc) : '#fff'};border:1.5px solid ${hkt.kind === 'unit' || hkt.taken ? 'transparent' : '#9aa39e'}"></span>
          <span class="gsr-name">${esc(hkt.label)}</span>
          <span class="gsr-course">${esc(hkt.kind === 'unit' ? 'unit · ' + hkt.sub : hkt.sub)}</span>
        </button>`).join('');
      results.classList.remove('hidden');
    };
    const pickSearchHit = (btn) => {
      results.classList.add('hidden');
      if (btn.dataset.graphKind === 'unit') {
        if (graph.level !== 'lesson') setGraphLevel('lesson');
        graphSelect(btn.dataset.graphId, true);
      } else {
        graphJumpToTopic(btn.dataset.graphId);
      }
    };
    search.addEventListener('input', runSearch);
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = results.querySelector('[data-graph-id]');
        if (first) { pickSearchHit(first); search.blur(); }
      }
      if (e.key === 'Escape') results.classList.add('hidden');
    });
    results.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-graph-id]');
      if (btn) { pickSearchHit(btn); search.value = ''; }
    });

    // The coverage footer hosts the admin "Build all links now" button.
    $('graphCoverage').addEventListener('click', (e) => {
      const act = e.target.closest('[data-graph-act="build"]');
      if (act) buildGraphLinks(act);
    });

    // The side panel's node links + action buttons (event delegation).
    $('graphPanel').addEventListener('click', (e) => {
      const dirBtn = e.target.closest('[data-graph-dir]');
      if (dirBtn && graph.selected) {
        graph.chainDir = dirBtn.dataset.graphDir;
        graphSelect(graph.selected.id);
        return;
      }
      const topicBtn = e.target.closest('[data-graph-topic]');
      if (topicBtn) { graphJumpToTopic(topicBtn.dataset.graphTopic); return; }
      const nodeBtn = e.target.closest('[data-graph-id]');
      if (nodeBtn) { graphSelect(nodeBtn.dataset.graphId, true); return; }
      const act = e.target.closest('[data-graph-act]');
      if (!act) return;
      const n = graph.selected;
      if (act.dataset.graphAct === 'quiz' && n) {
        quizFromScope({ track: n.track, course: n.course, lesson: n.lesson || undefined, topic: n.agg ? undefined : n.topic });
      } else if (act.dataset.graphAct === 'cards' && n) {
        openFlashcards({ track: n.track, course: n.course, lesson: n.lesson || '', topic: n.agg ? '' : n.topic }, n.label);
      } else if (act.dataset.graphAct === 'drill' && n) {
        graphDrillInto(n.id);
      } else if (act.dataset.graphAct === 'clear') {
        graphSelect(null);
      } else if (act.dataset.graphAct === 'build') {
        buildGraphLinks(act);
      }
    });

    window.addEventListener('resize', () => {
      if (currentView() !== 'graph') return;
      sizeGraphCanvas();
      graphDraw();
    });
  }

  /* ------------------------------ side panel ----------------------------- */
  function graphNodeButton(n, extra = '') {
    const dot = n.agg
      ? `<span class="gp-dot" style="background:${n.attemptedTopics ? accHex(n.accuracy) : '#fff'};${n.attemptedTopics ? '' : 'border:1.5px solid var(--faint);'}"></span>`
      : n.attempts
        ? `<span class="gp-dot" style="background:${accHex(n.accuracy)}"></span>`
        : '<span class="gp-dot gp-hollow"></span>';
    const chip = n.agg
      ? `<span class="gp-chip" style="color:var(--muted)">${n.attemptedTopics}/${n.nTopics}</span>`
      : n.attempts
        ? `<span class="gp-chip" style="color:${accHex(n.accuracy)}">${n.accuracy}%</span>`
        : '<span class="gp-chip gp-new">not started</span>';
    return `<button class="gp-node" data-graph-id="${esc(n.id)}">${dot}
      <span class="gp-node-name">${esc(n.label)}</span>${extra}${chip}</button>`;
  }

  // A raw-topic row (used inside unit/drill panels): jumps to Topics level.
  function graphTopicRow(t) {
    const dot = t.attempts
      ? `<span class="gp-dot" style="background:${accHex(t.accuracy)}"></span>`
      : '<span class="gp-dot gp-hollow"></span>';
    const chip = t.attempts
      ? `<span class="gp-chip" style="color:${accHex(t.accuracy)}">${t.accuracy}%</span>`
      : '<span class="gp-chip gp-new">not started</span>';
    return `<button class="gp-node" data-graph-topic="${esc(t.id)}">${dot}
      <span class="gp-node-name">${esc(t.topic)}</span>${chip}</button>`;
  }

  // Chain-direction toggle for a selected node: prerequisites, everything, or
  // what it unlocks downstream.
  function graphDirSegHtml() {
    const d = graph.chainDir || 'both';
    const b = (val, txt) => `<button type="button" class="${d === val ? 'active' : ''}" data-graph-dir="${val}">${txt}</button>`;
    return `<div class="gp-dir">
      ${b('up', '⬆ Builds on')}${b('both', 'Both')}${b('down', 'Unlocks ⬇')}
    </div>`;
  }

  function renderGraphPanel() {
    const el = $('graphPanel');
    if (!el) return;
    const n = graph.selected;
    if (!n) {
      el.innerHTML = graph.focusInfo ? graphFocusHtml() : graphInsightsHtml();
      return;
    }
    el.innerHTML = n.agg ? graphAggPanelHtml(n) : graphTopicPanelHtml(n);
  }

  // Panel for a selected course/unit pie.
  function graphAggPanelHtml(n) {
    const crumb = [n.track, graph.level === 'lesson' ? n.course : ''].filter(Boolean).join(' › ');
    const kind = graph.level === 'course' ? 'course' : 'unit';
    return `
      <div class="gp-head">
        <div class="gp-crumb">${esc(crumb)}</div>
        <button class="gp-close" data-graph-act="clear" aria-label="Close">×</button>
      </div>
      <h3 class="gp-title">${esc(n.label)}</h3>
      <div class="gp-stats">
        <span class="gp-stat" style="color:${n.attemptedTopics ? accHex(n.accuracy) : 'var(--faint)'}">
          ${n.attemptedTopics ? `${n.accuracy}% where practised` : 'Not started yet'}
        </span>
        <span class="gp-stat">${n.attemptedTopics}/${n.nTopics} topics practised</span>
        <span class="gp-stat">${n.questionCount} questions</span>
        ${n.cardCount ? `<span class="gp-stat">${n.cardCount} cards</span>` : ''}
      </div>
      <div class="gp-actions">
        <button class="btn btn-primary" data-graph-act="quiz">Quiz this ${kind}</button>
        <button class="btn btn-neutral" data-graph-act="cards">Flashcards</button>
      </div>
      ${graphDirSegHtml()}
      <button class="gp-drill" data-graph-act="drill">🔍 See its ${n.nTopics} topics on the map</button>
      <div class="gp-sec">Topics inside <span class="gp-sec-hint">${n.nTopics}</span></div>
      ${n.topics.map(graphTopicRow).join('')}
    `;
  }

  // Panel for a selected topic dot.
  function graphTopicPanelHtml(n) {
    const prereqs = (graph.prereqIn.get(n.id) || []).map((id) => graph.byId.get(id)).filter(Boolean);
    const unlocks = (graph.prereqOut.get(n.id) || []).map((id) => graph.byId.get(id)).filter(Boolean);
    const cards = n.cards || [];
    const STATUS_ICON = { mastered: '✅', learning: '📖', important: '⭐' };
    const cardLine = (c) => `<div class="gp-card">
        <span class="gp-card-ico">${STATUS_ICON[c.status] || '·'}</span>
        <span class="gp-card-name">${esc(c.concept.length > 70 ? c.concept.slice(0, 69) + '…' : c.concept)}</span>
        ${c.level !== 'topic' ? `<span class="gp-card-lvl">${esc(c.level)}</span>` : ''}
      </div>`;
    return `
      <div class="gp-head">
        <div class="gp-crumb">${esc(n.track)} › ${esc(n.course)} › ${esc(n.lesson)}</div>
        <button class="gp-close" data-graph-act="clear" aria-label="Close">×</button>
      </div>
      <h3 class="gp-title">${esc(n.topic)}</h3>
      <div class="gp-stats">
        <span class="gp-stat" style="color:${n.attempts ? accHex(n.accuracy) : 'var(--faint)'}">
          ${n.attempts ? `${n.accuracy}% accuracy` : 'Not started yet'}
        </span>
        ${n.attempts ? `<span class="gp-stat">${n.attempts} attempt${n.attempts === 1 ? '' : 's'}</span>` : ''}
        <span class="gp-stat">${n.questionCount || 0} question${n.questionCount === 1 ? '' : 's'} banked</span>
        <span class="gp-stat">priority ${Math.round(n.priority)}</span>
      </div>
      <div class="gp-actions">
        <button class="btn btn-primary" data-graph-act="quiz">Quiz this topic</button>
        <button class="btn btn-neutral" data-graph-act="cards">Flashcards</button>
      </div>
      ${graphDirSegHtml()}
      ${prereqs.length ? `<div class="gp-sec">Builds on</div>${prereqs.map((p) => graphNodeButton(p)).join('')}` : ''}
      ${unlocks.length ? `<div class="gp-sec">Unlocks</div>${unlocks.map((p) => graphNodeButton(p)).join('')}` : ''}
      ${cards.length
        ? `<div class="gp-sec">Flashcards here <span class="gp-sec-hint">${cards.length}</span></div>${cards.slice(0, 14).map(cardLine).join('')}`
        : '<div class="gp-sec">Flashcards here</div><p class="gp-none">No cards yet — "Flashcards" above will offer to generate a deck.</p>'}
    `;
  }

  // Panel after drilling into a unit: its topics, with the map scoped to them.
  function graphFocusHtml() {
    const f = graph.focusInfo;
    const topics = f.ids.map((id) => graph.byId.get(id)).filter(Boolean);
    return `
      <div class="gp-head">
        <div class="gp-crumb">${esc(f.crumb || '')}</div>
        <button class="gp-close" data-graph-act="clear" aria-label="Close">×</button>
      </div>
      <h3 class="gp-title">${esc(f.label)}</h3>
      <p class="gp-intro">Its topics are highlighted on the map. Click one to see its chain.</p>
      <div class="gp-sec">Topics <span class="gp-sec-hint">${topics.length}</span></div>
      ${topics.map((t) => graphNodeButton(t)).join('')}
    `;
  }

  function graphInsightsHtml() {
    const ins = (graph.raw && graph.raw.insights) || {};
    const frontier = ins.frontier || [];
    const keystones = ins.keystones || [];
    const topicOf = (x) => graph.raw.nodes.find((n) => n.id === x.id);
    const row = (x, extra = '') => {
      const t = topicOf(x);
      return t ? graphTopicRow(t).replace('</button>', `${extra}</button>`) : '';
    };
    return `
      <h3 class="gp-title gp-title-idle">Your map, read for you</h3>
      <p class="gp-intro">Click any node to see its chain — units drill down into topics. The graph itself suggests:</p>
      <div class="gp-sec">🚀 Ready to start <span class="gp-sec-hint">groundwork done</span></div>
      ${frontier.length ? frontier.slice(0, 8).map((f) => row(f)).join('') : '<p class="gp-none">Nothing yet — as you master topics, the concepts they unlock appear here.</p>'}
      <div class="gp-sec">🧱 Weak links <span class="gp-sec-hint">blocking the most</span></div>
      ${keystones.length ? keystones.slice(0, 8).map((kx) => row(kx, `<span class="gp-blocked">blocks ${kx.blocked}</span>`)).join('') : '<p class="gp-none">No blockers found — keep practising and check back.</p>'}
    `;
  }

  function renderGraphCoverage() {
    const el = $('graphCoverage');
    const cov = (graph.raw && graph.raw.coverage) || {};
    if (!el || !cov.total) { if (el) el.textContent = ''; return; }
    let txt = `Prerequisite links: ${cov.linked} of ${cov.total} concepts mapped.`;
    if (cov.building) txt += ' The rest are being mapped automatically in the background — reopen the map in a minute to see more links.';
    el.innerHTML = esc(txt) + (isAdmin() && cov.building
      ? ' <button class="gp-build" data-graph-act="build">Build all links now</button>'
      : '');
  }

  // Admin: run the link-building sweep to completion (batched, resumable).
  async function buildGraphLinks(btn) {
    if (!confirm('Map prerequisite links for every remaining topic now? This runs a batch of AI calls (a few minutes).')) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Building…'; }
    try {
      let linked = 0;
      for (let pass = 0; pass < 20; pass++) {
        const r = await api('/api/admin/build-graph?max=120', { method: 'POST' });
        linked += r.linked || 0;
        if (btn) btn.textContent = `Building… (${linked})`;
        if (!r.remaining) break;
      }
      alert(`Done. Topics linked: ${linked}.`);
      openGraph(); // refetch with the new edges
    } catch (e) {
      alert('Link building failed: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Build all links now'; }
    }
  }

  /* ------------------------------- Utils --------------------------------- */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  // wire cascading selects
  window.addEventListener('DOMContentLoaded', () => {
    $('trackSel').addEventListener('change', filterCourses);
    $('courseSel').addEventListener('change', filterLessons);
    $('lessonSel').addEventListener('change', filterTopics);

    // Multi-select Live Quiz builder: search + tree (event delegation).
    $('msSearch').addEventListener('input', (e) => {
      ms.search = e.target.value.trim().toLowerCase();
      renderMultiTree();
    });
    $('msTree').addEventListener('click', (e) => {
      const exp = e.target.closest('[data-exp]');
      if (exp) {
        const k = exp.dataset.exp;
        if (ms.open.has(k)) ms.open.delete(k); else ms.open.add(k);
        renderMultiTree();
        return;
      }
      const chk = e.target.closest('[data-check]');
      if (chk) toggleMsNode(chk.dataset.check);
    });

    // Knowledge Map: canvas pan/zoom/hover/click, search, panel actions.
    wireGraphEvents();

    // Keep the cost pill fresh when returning to the tab.
    window.addEventListener('focus', refreshCost);

    // Progress tree: action buttons + expand/collapse (event delegation).
    $('progressTree').addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const node = actionBtn.closest('.prog-node');
        const scope = nodeScope(node);
        const act = actionBtn.dataset.action;
        const menu = actionBtn.closest('.prog-actions');
        // Two-level menu: Learn / AI Support open a sub-menu; ‹ goes back.
        if (act === 'learn' || act === 'ai') { if (menu) menu.dataset.menu = act; return; }
        if (act === 'back') { if (menu) menu.dataset.menu = 'root'; return; }
        if (act === 'quiz') quizFromScope(scope);
        else if (act === 'review') reviewFromScope(scope, node.dataset.label);
        else if (act === 'cards') openFlashcards(scope, node.dataset.label);
        else if (act === 'chat') openScopeChat(scope, node.dataset.label);
        return; // don't also toggle the row
      }
      const row = e.target.closest('.prog-row');
      if (!row) return;
      const node = row.parentElement;
      if (node.classList.contains('has-children')) node.classList.toggle('open');
    });

    init();
  });

  return {
    enterMastery, goHome, setMode,
    submitPassword, actAs, stopActing, mergeMath, fixAllFormats, fixAllQuestionFormats,
    fixQuestionFormat, fixCardFormat,
    toggleCardEdit, setCardEditMode, saveCardEdit, applyCardEdit, cardEditKey,
    launchManual, launchPriority, launchPriorityCards, nextQuestion, skipQuestion, doneQuiz,
    askHint, askExplain,
    startDrill, submitCustomConfusion,
    toggleGenMore, generateSimilar,
    openNotesQuiz, generateNotesQuiz, removeNotesFile,
    openStats, priorityFromStats, onAiEngineChange, onThinkingChange, onDifficultyChange,
    analyzeProgress, closeReview, quizFromReview,
    openGraph, setGraphLevel,
    generateFlashcards, regenerateFlashcards, toggleHighway,
    flipCard, nextCard, prevCard, quizMeOnCard, toggleCardStats,
    openScopeChat, closeScopeChat, sendScopeChat,
    toggleAssistant, sendAssistant, newAssistantChat, deleteAssistantChat,
    toggleAssistantHistory, openAssistantChatById, toggleAssistantSettings,
    toggleCostDetail, msClear,
  };
})();
