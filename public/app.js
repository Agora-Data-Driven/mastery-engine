/* AGORA Mastery Engine - frontend controller */
const App = (() => {
  const $ = (id) => document.getElementById(id);
  const show = (id) => $(id).classList.remove('hidden');
  const hide = (id) => $(id).classList.add('hidden');
  const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

  /* Embedded mode (?embed=1): this app is running inside a host that already provides the page
     chrome — Sentinel's Academy tab today. The host supplies the frame, so we trim our own
     full-page padding. Remembered for the session because in-app navigation drops the query
     string, and once set it should not flicker back on every route change. */
  (() => {
    try {
      const q = new URLSearchParams(location.search).get('embed');
      if (q === '1') sessionStorage.setItem('embed', '1');
      else if (q === '0') sessionStorage.removeItem('embed');
      if (sessionStorage.getItem('embed') === '1') document.documentElement.classList.add('embed');
    } catch { /* private mode / no storage — embed styling is cosmetic, never block boot */ }
  })();

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

  /** Parse one SSE frame ("event: x\ndata: {...}") and dispatch to onEvent(event, data).
   *  Comment heartbeats (": open") and dataless frames are ignored. */
  function dispatchSSE(frame, onEvent) {
    let ev = 'message', data = '';
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) ev = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) return;
    let parsed;
    try { parsed = JSON.parse(data); } catch { return; }
    onEvent(ev, parsed);
  }

  /** POST that reads a Server-Sent-Events stream, calling onEvent(event, data) per
   *  frame. `signal` lets the caller abort (pause). Errors before the stream opens
   *  surface as thrown Errors; in-stream failures arrive as an 'error' event. */
  async function apiStreamSSE(path, body, onEvent, signal) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok || !res.body) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `Request failed (${res.status})`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const frames = buf.split('\n\n');
      buf = frames.pop();               // keep the incomplete tail
      for (const f of frames) dispatchSSE(f, onEvent);
    }
    if (buf.trim()) dispatchSSE(buf, onEvent);
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
  const AI_DIFFICULTY_SELECTS = ['asstDifficultySel', 'fcDifficultySel'];

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

  // Extended thinking applies to the cloud engines that support it (Gemini,
  // DeepSeek V4, and Kimi K2.6 — all of which default thinking ON, hence slow);
  // hide the toggle for the local engines that don't take the lever.
  function syncThinkingVisibility(provider) {
    const supported = provider === 'gemini' || provider === 'deepseek' || provider === 'kimi';
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

  const VIEWS = ['loginView', 'setupView', 'quizView', 'resultView', 'statsView', 'flashcardView', 'graphView'];

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
  // Curriculum sequence, data-driven: the minimum stored `order` within each
  // track/course/lesson. When topics carry a GLOBAL order (as the digital-marketing
  // bank does), a group's min order is its curriculum position, so tracks, courses
  // and lessons all sort into the intended flow. Programs whose topics use a
  // per-lesson order (e.g. data science, 0-based each lesson) tie at 0 here and
  // fall through to the existing name-based ordering below — so they're unaffected.
  // Memoised on the catalog array identity; rebuilt when the catalog changes.
  let _orderMaps = null, _orderMapsFor = null;
  function orderMaps() {
    if (_orderMaps && _orderMapsFor === state.catalog) return _orderMaps;
    const tr = new Map(), co = new Map(), le = new Map();
    const lo = (m, k, v) => { if (!m.has(k) || v < m.get(k)) m.set(k, v); };
    for (const r of state.catalog) {
      if (!Number.isFinite(r.order)) continue;
      lo(tr, r.track, r.order);
      lo(co, r.course, r.order);
      lo(le, `${r.course} ${r.lesson}`, r.order);
    }
    _orderMaps = { tr, co, le }; _orderMapsFor = state.catalog;
    return _orderMaps;
  }
  const _minOrder = (m, k) => (m.has(k) ? m.get(k) : Infinity);

  // Order two course names by curriculum order (min topic order), then rank, then name.
  function byCourseName(a, b) {
    const m = orderMaps().co;
    const oa = _minOrder(m, a), ob = _minOrder(m, b);
    if (oa !== ob) return oa - ob;
    const ra = COURSE_RANK.has(a) ? COURSE_RANK.get(a) : Infinity;
    const rb = COURSE_RANK.has(b) ? COURSE_RANK.get(b) : Infinity;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  // Recommended lesson sequence for courses whose lessons DON'T carry a leading
  // unit number. Every other course already numbers its lessons ("01 …") so they
  // sort naturally; the two Machine Learning courses don't, so they'd otherwise
  // fall back to alphabetical. These are DISPLAY-ONLY: the stored lesson names are
  // unchanged (quiz/stat routing slugs the raw name), we only re-sequence the rows
  // and prefix a number in the UI. Edit these lists to re-order.
  const LESSON_ORDER = {
    'Machine Learning Specialization': [
      'Supervised Machine Learning',
      'Unsupervised Learning, Recommenders, Reinforcement',
      'Advanced Learning Algorithms',
    ],
    'StatQuest ML': [
      'Decision Trees',
      'Gradient Boost',
      'Xgboost',
      'Support Vector Machines',
    ],
  };
  // Rank of a lesson within its course's recommended order (Infinity if unranked).
  function lessonRank(course, lesson) {
    const order = LESSON_ORDER[course];
    if (!order) return Infinity;
    const i = order.indexOf(lesson);
    return i === -1 ? Infinity : i;
  }
  // Order two lesson names within a course: curriculum order (min topic order)
  // first, then the recommended rank, then natural name.
  function byLessonName(course, a, b) {
    const m = orderMaps().le;
    const oa = _minOrder(m, `${course} ${a}`), ob = _minOrder(m, `${course} ${b}`);
    if (oa !== ob) return oa - ob;
    const ra = lessonRank(course, a), rb = lessonRank(course, b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }
  // Distinct lesson names of a course, in recommended order.
  function orderedLessons(course, lessons) {
    return [...new Set(lessons)].filter(Boolean).sort((a, b) => byLessonName(course, a, b));
  }
  // Cosmetic label: prefix a 2-digit recommended-order number for lessons in
  // LESSON_ORDER (whose stored names lack their own unit number). Never mutates
  // the raw name used for routing.
  function lessonLabel(course, lesson) {
    const r = lessonRank(course, lesson);
    return r === Infinity ? lesson : `${String(r + 1).padStart(2, '0')} ${lesson}`;
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
      const ls = orderedLessons(c, state.catalog.filter((r) => r.course === c).map((r) => r.lesson));
      $('lessonSel').innerHTML =
        '<option value="Review All">Review Full Course</option>' +
        // value = raw lesson name (drives scope/routing); text = numbered label.
        ls.map((l) => `<option value="${esc(l)}">${esc(lessonLabel(c, l))}</option>`).join('');
    } else {
      $('lessonSel').innerHTML = '<option value="-- N/A --">N/A</option>';
    }
    filterTopics();
  }

  function filterTopics() {
    const l = $('lessonSel').value;
    if (l !== 'Review All' && l !== '-- N/A --') {
      // Topics in pedagogical study order (stored `order`), not alphabetical.
      const rows = state.catalog.filter((r) => r.lesson === l)
        .sort((a, b) => cmpOrderThenName(a.order, a.topic, b.order, b.topic));
      const ts = [...new Set(rows.map((r) => r.topic))].filter(Boolean);
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
    const isVideos = mode === 'VIDEOS';
    const isRoadmap = mode === 'ROADMAP';

    updateModeNav(mode);

    // Toggle the panels of the setup card (quiz builder / progress / roadmaps / video lessons).
    $('quizBuilder').classList.toggle('hidden', isProgress || isVideos || isRoadmap);
    $('progressPanel').classList.toggle('hidden', !isProgress);
    const rp = $('roadmapPanel');
    if (rp) rp.classList.toggle('hidden', !isRoadmap);
    const vp = $('videoPanel');
    if (vp) vp.classList.toggle('hidden', !isVideos);
    // Mastery Quiz / Flashcards CTAs are available to mastery users on EVERY tab
    // (including My Progress) — they sit above the mode segment so they render on all.
    $('priorityBtnRow').classList.toggle('hidden', !mastery);

    if (isProgress) renderProgressTree();
    else if (isRoadmap) renderRoadmapList();
    else if (isVideos) renderVideoLessons();
    else updateSetupCopy();
  }

  // Grouped dropdown nav: light up the active item, relabel its group's trigger to
  // the active child (so the current view shows without opening the menu), and close
  // any open menu.
  function updateModeNav(mode) {
    document.querySelectorAll('#modeNav .modenav-group').forEach((g) => {
      let active = null;
      g.querySelectorAll('[data-mode]').forEach((b) => {
        const on = b.dataset.mode === mode;
        b.classList.toggle('active', on);
        if (on) active = b;
      });
      const trigger = g.querySelector('.modenav-trigger');
      trigger.classList.toggle('active', !!active);
      g.querySelector('.mn-label').textContent = active ? active.textContent : g.dataset.groupLabel;
      trigger.setAttribute('aria-expanded', 'false');
      g.classList.remove('open');
    });
  }

  // Open/close the dropdown menus (one at a time; outside-click closes).
  function wireModeNav() {
    const nav = $('modeNav');
    if (!nav) return;
    const closeAll = () => nav.querySelectorAll('.modenav-group.open').forEach((g) => {
      g.classList.remove('open');
      g.querySelector('.modenav-trigger').setAttribute('aria-expanded', 'false');
    });
    nav.querySelectorAll('.modenav-trigger').forEach((t) => {
      t.addEventListener('click', (e) => {
        e.stopPropagation();
        const g = t.closest('.modenav-group');
        const willOpen = !g.classList.contains('open');
        closeAll();
        if (willOpen) { g.classList.add('open'); t.setAttribute('aria-expanded', 'true'); }
      });
    });
    document.addEventListener('click', closeAll);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
  }

  // Video Lessons: a curated, ordered watch-list per program (static
  // /video-lessons.json). Watching a course's videos should let a learner answer
  // its quiz questions; concept-based courses (no video) are flagged. Videos open
  // on YouTube in a new tab (they can't be embedded here).
  let _videoData = null;
  let _videoProg = null; // admin program override for the tab
  async function renderVideoLessons() {
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const list = $('videoList');
    // The program to show. `/api/programs` is authoritative (the catalog rows don't
    // carry a program); admins get a switcher so they can preview any program's videos.
    let info = { current: 'data_science', programs: [], admin: false };
    try { info = await api('/api/programs'); } catch { /* fall back to default */ }
    const prog = _videoProg || info.current || 'data_science';
    // Live: curated baseline + any transcript attached in Academy Admin that has a
    // video URL. Server-scoped to `prog` (admins may pass ?program= to preview).
    let p = { tracks: [] };
    try { p = await api('/api/video-lessons?program=' + encodeURIComponent(prog)); } catch { p = { tracks: [] }; }

    // Admin-only program picker (learners just see their enrolled program's videos).
    const switcher = (info.admin && (info.programs || []).length)
      ? `<div class="field" style="margin-bottom:14px"><span class="label">Program</span>
          <div class="select-wrap"><select id="videoProgSel">${info.programs.map((pr) =>
            `<option value="${esc(pr.id)}"${pr.id === prog ? ' selected' : ''}>${esc(pr.name || pr.id)}</option>`).join('')}</select></div></div>`
      : '';
    const wire = () => { const s = $('videoProgSel'); if (s) s.onchange = () => { _videoProg = s.value; renderVideoLessons(); }; };

    $('videoIntro').textContent = (p && p.intro) || '';
    if (!p || !Array.isArray(p.tracks) || !p.tracks.length) {
      list.innerHTML = switcher + '<p class="section-sub">No video lessons are curated for this program yet.</p>';
      wire();
      return;
    }
    let html = switcher;
    for (const t of p.tracks) {
      html += `<h3 style="margin:22px 0 8px;font-size:16px">${esc(t.track)}</h3>`;
      for (const c of (t.courses || [])) {
        html += `<div style="margin:0 0 14px;padding:12px 14px;border:1px solid var(--line,#E7E8EE);border-radius:12px">
          <div style="font-weight:700;margin-bottom:6px">${esc(c.course)}</div>`;
        if (c.videos && c.videos.length) {
          html += '<ol style="margin:0;padding-left:20px;line-height:1.9">'
            + c.videos.map((v) => `<li><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)}</a>`
              + (v.lessons && v.lessons.length ? ` <span style="color:var(--muted,#6B7280);font-size:12.5px">— ${esc(v.lessons.join(', '))}</span>` : '')
              + '</li>').join('')
            + '</ol>';
        } else {
          html += `<div style="color:var(--muted,#6B7280);font-size:13px">${esc(c.note || 'No video for this course yet.')}</div>`;
        }
        html += '</div>';
      }
    }
    list.innerHTML = html;
    wire();
  }

  function updateSetupCopy() {
    const isGen = state.mode === 'GEN';
    // Live Quiz uses the multi-select tree; Generate keeps the single-scope selects.
    $('multiSelect').classList.toggle('hidden', isGen);
    $('cascadeSelect').classList.toggle('hidden', !isGen);
    $('genExtras').classList.toggle('hidden', !isGen);
    if (isGen) {
      $('setupTitle').textContent = 'Generate mastery questions';
      $('setupSub').textContent = 'Pick a scope and let the Wise Teacher write harder questions into your bank.';
      $('launchBtn').textContent = 'Generate Questions';
      loadGenSources();
    } else {
      $('setupTitle').textContent = 'Build your quiz';
      $('setupSub').textContent = 'Search and tick any mix of tracks, courses, and units to quiz on.';
      $('launchBtn').textContent = 'Launch Engine';
      renderMultiTree();
    }
  }

  // Fill the GEN-mode "Base on transcripts" picker with the learner's program
  // transcripts (best-effort; the picker is optional). Loaded once per entry to
  // GEN mode. Cached so re-entering doesn't refetch.
  let _genSourcesLoaded = false;
  async function loadGenSources() {
    const box = $('genSources');
    if (!box || _genSourcesLoaded) return;
    box.innerHTML = '<span class="gen-sources-empty">Loading sources…</span>';
    try {
      const { transcripts } = await api('/api/transcripts');
      _genSourcesLoaded = true;
      if (!transcripts || !transcripts.length) {
        box.innerHTML = '<span class="gen-sources-empty">No transcripts in your program yet.</span>';
        return;
      }
      box.innerHTML = transcripts.map((t) => {
        const scopeLabel = [t.course, t.lesson].filter(Boolean).join(' › ');
        return `<label class="gen-source"><input type="checkbox" value="${esc(t.id)}" />
          <span class="gen-source-title">${esc(t.title)}</span>${scopeLabel ? `<span class="gen-source-scope">${esc(scopeLabel)}</span>` : ''}</label>`;
      }).join('');
    } catch (e) {
      box.innerHTML = `<span class="gen-sources-empty">Couldn't load sources: ${esc(e.message)}</span>`;
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

  // Admin: pick a user to impersonate from a dropdown of the Sentinel directory.
  // Resolves to the chosen email (or null). Falls back to a prompt if the
  // directory can't be fetched, so impersonation always works.
  function pickUserModal(people) {
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;';
      const opts = people.map((p) => `<option value="${esc(p.email)}">${esc(p.name || p.email)} (${esc(p.email)})</option>`).join('');
      ov.innerHTML = `<div style="background:#fff;color:#111;border-radius:14px;padding:20px;min-width:340px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.35);">
        <div style="font-weight:700;font-size:16px;margin-bottom:10px;">Act as user</div>
        <select id="__actAsSel" style="width:100%;padding:9px;border-radius:8px;border:1px solid #ccc;font-size:14px;">${opts}</select>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
          <button id="__actAsCancel" style="padding:7px 15px;border-radius:8px;border:1px solid #ccc;background:#f2f2f2;cursor:pointer;">Cancel</button>
          <button id="__actAsOk" style="padding:7px 15px;border-radius:8px;border:none;background:#16a34a;color:#fff;font-weight:600;cursor:pointer;">Act as</button>
        </div></div>`;
      document.body.appendChild(ov);
      const close = (val) => { ov.remove(); resolve(val); };
      ov.querySelector('#__actAsCancel').onclick = () => close(null);
      ov.querySelector('#__actAsOk').onclick = () => close(ov.querySelector('#__actAsSel').value);
      ov.onclick = (e) => { if (e.target === ov) close(null); };
    });
  }

  // Admin: act as another user (impersonation), or stop and return to the default account.
  async function actAs() {
    let people = [];
    try { const r = await api('/api/admin/people'); people = (r && r.people) || []; } catch { /* fall back to prompt */ }
    const email = people.length
      ? await pickUserModal(people)
      : window.prompt('Act as which user? Enter their Google email:');
    if (!email) return;
    try {
      await api('/api/auth/act-as', { method: 'POST', body: JSON.stringify({ email: String(email).trim() }) });
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

  // Admin: AI-sequence the Machine Learning topics into study order (writes each
  // topic's `order`). Loops the resumable sweep until no lessons remain. Runs
  // only on lessons not yet sequenced; pass refresh to re-order everything.
  async function sequenceMlTopics(refresh = false) {
    if (!confirm('AI-order the Machine Learning sub-lessons into the best sequence to learn them? This runs a batch of AI calls (a minute or two) and reorders the topic lists for all users. Safe to re-run.')) return;
    const btn = $('adminSequenceTopics');
    if (btn) { btn.disabled = true; btn.textContent = 'Sequencing…'; }
    const q = `?track=${encodeURIComponent('Machine Learning')}&max=40${refresh ? '&refresh=1' : ''}`;
    let sequenced = 0;
    try {
      for (let pass = 0; pass < 20; pass++) {
        const r = await api(`/api/admin/sequence-topics${q}`, { method: 'POST' });
        sequenced += r.sequenced || 0;
        if (btn) btn.textContent = `Sequencing… (${sequenced})`;
        if (!r.remaining) break;
      }
      alert(`Done. Lessons sequenced: ${sequenced}.`);
      window.location.reload();
    } catch (e) {
      alert('Sequence topics failed: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Sequence ML Topics'; }
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
        const body = {
          ...selection(),
          instructions: ($('genInstr').value || '').trim(),
          transcriptIds: [...$('genSources').querySelectorAll('input[type="checkbox"]:checked')].map((c) => c.value),
        };
        const r = await api('/api/generate', { method: 'POST', body: JSON.stringify(body) });
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
      // A track's rows all share a program; stash it so scopes/quiz launches carry
      // the right program (the Mastery-Engine shelf can span programs).
      if (r.program) track.program = r.program;
      const course = upsertChild(track, r.course || 'Unknown Course');
      const lesson = upsertChild(course, r.lesson || 'Unknown Unit');
      const topic = upsertChild(lesson, r.topic || 'Unknown Topic');
      topic.leaf = true;
      topic.attempts = r.totalAttempts || 0;
      topic.correct = r.correctCount || 0;
      topic.order = Number.isFinite(r.order) ? r.order : undefined;
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

  // Compare by a stored pedagogical `order` first (foundational -> advanced),
  // then natural name. Anything without a numeric order sorts to the end (so a
  // freshly added, not-yet-sequenced topic just trails the ordered ones). Works
  // on any object exposing an order + a name string.
  function cmpOrderThenName(oa, na, ob, nb) {
    const a = Number.isFinite(oa) ? oa : Infinity;
    const b = Number.isFinite(ob) ? ob : Infinity;
    if (a !== b) return a - b;
    return String(na).localeCompare(String(nb), undefined, { numeric: true, sensitivity: 'base' });
  }
  // Topic (sub-lesson) tree nodes: pedagogical order, then natural name.
  function byTopicOrder(a, b) {
    return cmpOrderThenName(a.order, a.name, b.order, b.name);
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

  // One action group behind an "AI Support ▸" entry: Quiz, Cards (where the
  // course has decks) and Review all live under it. The root shows just the
  // entry button so rows stay compact; ‹ collapses back. Identical at every
  // level, so build it once.
  function progActionsHtml(level, scope) {
    return `<div class="prog-actions" data-menu="root">
          <div class="menu-group root">
            <button class="prog-btn ai" data-action="ai" title="Quiz, study cards or AI review for this section">AI Support ▸</button>
          </div>
          <div class="menu-group ai">
            <button class="prog-btn menu-back" data-action="back" title="Back" aria-label="Back">‹</button>
            <button class="prog-btn" data-action="quiz" title="Live quiz on this section">Quiz</button>
            ${level >= 1 && flashcardsEnabled(scope.course)
              ? `<button class="prog-btn cards" data-action="cards" title="Study flashcards for this section">Cards</button>`
              : ''}
            <button class="prog-btn review" data-action="review" title="AI teaches this section from scratch">Review</button>
            <button class="prog-btn lesson" data-action="lesson" title="A lesson that builds on this section's prerequisites">Lesson</button>
          </div>
        </div>`;
  }

  function renderProgressNode(node, level, scope) {
    const pct = nodeProgress(node);
    const color = accColor(pct);
    // Courses (children of a track, level 0) follow the curriculum order; a
    // course's lessons (level 1) follow their recommended sequence; everything
    // else stays in natural name/unit-number order.
    const kids = [...node.children.values()].sort(
      level === 0 ? (a, b) => byCourseName(a.name, b.name)
      : level === 1 ? (a, b) => byLessonName(node.name, a.name, b.name)
      : level === 2 ? byTopicOrder // a lesson's topics follow their study order
      : byName,
    );
    const hasKids = kids.length > 0 && !node.leaf;
    const isTrack = level === 0;
    // Lesson rows (level 2) show a recommended-order number prefix for the ML
    // courses; the raw name still drives data-* / routing.
    const displayName = level === 2 ? lessonLabel(scope.course, node.name) : node.name;
    const sub = node.leaf
      ? (node.attempts ? `${node.attempts} attempt${node.attempts === 1 ? '' : 's'}` : 'Not started')
      : `${node.attemptedCount}/${node.topicCount} topics practised`;

    // data-* carry this node's full scope so the action buttons know what to launch.
    // `program` rides along (from the track node) so quizzes resolve to the right
    // program even when the shelf mixes programs.
    const dataAttrs = LEVEL_KEYS
      .filter((k) => scope[k] != null)
      .map((k) => `data-${k}="${esc(scope[k])}"`)
      .join(' ') + (scope.program ? ` data-program="${esc(scope.program)}"` : '');

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
          <span class="prog-name" title="${esc(displayName)}">${esc(displayName)}</span>
          <span class="prog-sub">${esc(sub)}</span>
        </div>
        ${actions}
        <button class="me-track-remove" data-action="removetrack" title="Remove this track from your Mastery Engine" aria-label="Remove track">✕</button>`
      : `<span class="prog-caret">${hasKids ? '▸' : ''}</span>
        <span class="prog-dot" style="color:${color};background:${color}"></span>
        <div class="prog-info">
          <span class="prog-name" title="${esc(displayName)}">${esc(displayName)}</span>
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

  // Restore the learner to where they left off in the progress tree after a quiz
  // or flashcard round — same expanded nodes, same scroll position — instead of a
  // collapsed tree scrolled back to the top. A snapshot is captured when they leave
  // the tree to practise (see startQuiz / openFlashcards) and consumed on the next
  // render. Keyed by each node's full Track/Course/Unit/Topic scope path.
  let progressSnapshot = null;

  function progNodeKey(el) {
    // Joined with a control char that can't appear in a track/course/unit/topic name.
    return LEVEL_KEYS.map((k) => el.dataset[k] || '').join('');
  }

  function captureProgressState() {
    const tree = $('progressTree');
    if (!tree) return null;
    const open = [];
    tree.querySelectorAll('.prog-node.open').forEach((n) => open.push(progNodeKey(n)));
    return { open, scrollY: window.scrollY || window.pageYOffset || 0 };
  }

  function applyProgressState(snap) {
    if (!snap) return;
    const tree = $('progressTree');
    if (!tree) return;
    const want = new Set(snap.open);
    tree.querySelectorAll('.prog-node.has-children').forEach((n) => {
      if (want.has(progNodeKey(n))) n.classList.add('open');
    });
    // The view was display:none until this render, so defer the scroll to the next
    // frame once the expanded rows have laid out and the page has its full height.
    const y = snap.scrollY || 0;
    requestAnimationFrame(() => window.scrollTo(0, y));
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
    // Tracks in curriculum order (min topic order), falling back to name.
    const tm = orderMaps().tr;
    const tracks = [...root.children.values()].sort((a, b) => {
      const oa = _minOrder(tm, a.name), ob = _minOrder(tm, b.name);
      return oa !== ob ? oa - ob : byName(a, b);
    });
    if (overview) overview.innerHTML = overviewHtml(tracks);
    tree.innerHTML = tracks.map((t) => renderProgressNode(t, 0, { track: t.name, program: t.program })).join('');
    // Returning from a quiz/flashcard round? Re-expand + re-scroll to where they were.
    if (progressSnapshot) { applyProgressState(progressSnapshot); progressSnapshot = null; }
  }

  /* ------------------------------ Roadmaps ------------------------------- */
  // A roadmap is a curated PATH over existing topics: ordered STAGES, each a set
  // of topics pulled from anywhere in the catalog. It renders like the progress
  // tree (mastery bar + Quiz/Cards/Review per topic) but grouped by stage; each
  // topic's mastery is DERIVED by joining the item to the learner's own catalog,
  // so a roadmap never stores per-user progress and never re-files the content.
  const RM_STRONG = 80; // accuracy at/above which a topic counts as "mastered"
  let _roadmaps = null;      // cached list from /api/roadmaps
  let _openRoadmapId = null; // which one is expanded in the view

  // All catalog rows an item covers. A coarse item (level track/course/lesson)
  // expands to every matching topic; a topic item resolves to its one row. Matched
  // within the item's program so a shelf spanning programs stays correct.
  function itemRows(item) {
    const lvl = item.level || 'topic';
    const prog = item.program || '';
    return state.catalog.filter((r) => {
      if (prog && (r.program || '') !== prog) return false;
      if (lvl === 'topic') {
        return (item.topicId && r.id === item.topicId)
          || (r.track === item.track && r.course === item.course && r.lesson === item.lesson && r.topic === item.topic);
      }
      if (!item.track || r.track !== item.track) return false;
      if (lvl === 'track') return true;
      if (r.course !== item.course) return false;
      if (lvl === 'course') return true;
      if (lvl === 'lesson') return r.lesson === item.lesson;
      return false;
    });
  }
  const rowAcc = (r) => (r.totalAttempts ? Math.round((r.correctCount / r.totalAttempts) * 100) : 0);
  // Roll a set of catalog rows to {pct, done, total}: pct = mean accuracy (0 for
  // untouched), done = topics at/above the mastery bar.
  function rollRows(rows) {
    let sum = 0, done = 0;
    for (const r of rows) { const a = rowAcc(r); sum += a; if (r.totalAttempts && a >= RM_STRONG) done += 1; }
    return { pct: rows.length ? Math.round(sum / rows.length) : 0, done, total: rows.length };
  }
  // Every distinct topic row across a set of items (coarse items expanded, deduped).
  function itemsRows(items) {
    const seen = new Set();
    const out = [];
    for (const it of items) for (const r of itemRows(it)) if (r.id && !seen.has(r.id)) { seen.add(r.id); out.push(r); }
    return out;
  }
  const allItems = (rm) => rm.stages.reduce((a, s) => a.concat(s.items), []);

  async function reloadCatalog() {
    try { state.catalog = await api('/api/catalog'); lsSet(LS.catalog, state.catalog); } catch { /* keep cached */ }
  }

  async function renderRoadmapList() {
    const listEl = $('roadmapList');
    const emptyEl = $('roadmapEmpty');
    const viewEl = $('roadmapView');
    if (viewEl) viewEl.classList.add('hidden');
    if (listEl) listEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    if (!listEl) return;
    listEl.innerHTML = '<div class="ai-loading"><div class="spinner"></div> Loading roadmaps…</div>';
    try {
      const res = await api('/api/roadmaps');
      _roadmaps = res.roadmaps || [];
    } catch (e) {
      listEl.innerHTML = '<span class="err">Couldn\'t load roadmaps: ' + esc(e.message) + '</span>';
      return;
    }
    if (!_roadmaps.length) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    listEl.innerHTML = _roadmaps.map((rm) => {
      const p = rollRows(itemsRows(allItems(rm)));
      const color = accColor(p.pct);
      const badge = rm.assigned ? '<span class="rm-badge assigned">Assigned</span>'
        : rm.enrolled ? '<span class="rm-badge added">In your engine</span>' : '';
      return `<button type="button" class="rm-card" data-rm="${esc(rm.id)}">
        ${ringHtml(p.pct, color, 60)}
        <div class="rm-card-body">
          <div class="rm-card-title">${esc(rm.title)} ${badge}</div>
          <div class="rm-card-sub">${esc(rm.summary || rm.goal || '')}</div>
          <div class="rm-card-meta">${rm.stages.length} stage${rm.stages.length === 1 ? '' : 's'} · ${p.total} topics · ${p.done} mastered</div>
        </div>
        <span class="rm-card-go" aria-hidden="true">›</span>
      </button>`;
    }).join('');
  }

  function openRoadmap(id) {
    const rm = (_roadmaps || []).find((r) => r.id === id);
    if (!rm) return;
    _openRoadmapId = id;
    $('roadmapList').classList.add('hidden');
    $('roadmapEmpty').classList.add('hidden');
    const view = $('roadmapView');
    view.classList.remove('hidden');
    // Enrol/remove button reflects whether this roadmap is on your shelf.
    const addBtn = $('rmAddBtn');
    if (addBtn) {
      addBtn.textContent = rm.enrolled ? '✓ In your Mastery Engine — Remove' : '＋ Add to my Mastery Engine';
      addBtn.classList.toggle('btn-primary', !rm.enrolled);
      addBtn.classList.toggle('btn-ghost', !!rm.enrolled);
    }
    const p = rollRows(itemsRows(allItems(rm)));
    const color = accColor(p.pct);
    const badge = rm.assigned ? '<span class="rm-badge assigned">Assigned to you</span>'
      : rm.enrolled ? '<span class="rm-badge added">In your engine</span>' : '';
    $('roadmapHead').innerHTML = `
      <div class="rm-head-top">
        ${ringHtml(p.pct, color, 72)}
        <div class="rm-head-body">
          <h3 class="rm-title">${esc(rm.title)} ${badge}</h3>
          <p class="rm-goal">${esc(rm.summary || rm.goal || '')}</p>
          <div class="po-bar rm-headbar"><span style="width:${p.pct}%;background:${color}"></span></div>
          <div class="rm-head-meta">${p.done}/${p.total} topics mastered · ${rm.stages.length} stage${rm.stages.length === 1 ? '' : 's'}</div>
        </div>
      </div>`;
    $('roadmapStages').innerHTML = rm.stages.map((s, i) => renderRoadmapStage(s, i)).join('');
    window.scrollTo(0, 0);
  }

  function renderRoadmapStage(stage, i) {
    const p = rollRows(itemsRows(stage.items));
    const color = accColor(p.pct);
    const itemsHtml = stage.items.map((it) => {
      const lvl = it.level || 'topic';
      const rws = itemRows(it);
      const available = rws.length > 0;
      const ip = rollRows(rws);
      const attempted = rws.some((r) => r.totalAttempts);
      const c = attempted ? accColor(ip.pct) : 'var(--border-strong, #cbd5e1)';
      const scopeAttrs = available
        ? ['program', 'track', 'course', 'lesson', 'topic'].filter((k) => it[k]).map((k) => `data-${k}="${esc(it[k])}"`).join(' ')
        : '';
      const name = lvl === 'topic' ? it.topic : (it.lesson || it.course || it.track);
      const kind = lvl === 'topic' ? '' : `<span class="rm-item-kind">${esc(lvl)}</span>`;
      const path = (lvl === 'topic' ? [it.course, it.lesson]
        : lvl === 'lesson' ? [it.track, it.course]
        : lvl === 'course' ? [it.track] : []).filter(Boolean).join(' › ');
      const status = !available ? 'Not in your catalog'
        : lvl === 'topic'
          ? (attempted ? `${ip.pct}% · ${rws[0].totalAttempts} attempt${rws[0].totalAttempts === 1 ? '' : 's'}` : 'Not started')
          : `${ip.total} topics · ${ip.done} mastered`;
      const showPct = lvl !== 'topic' || attempted;
      const bar = available
        ? `<div class="prog-bar-wrap"><span class="mini-bar"><span class="mini-fill" style="width:${ip.pct}%;background:${c}"></span></span><span class="prog-pct" style="color:${c}">${showPct ? ip.pct + '%' : '–'}</span></div>`
        : '';
      const actions = available
        ? `<div class="rm-item-actions">
            <button class="prog-btn" data-rmaction="quiz" title="Quiz on this">Quiz</button>
            ${(lvl !== 'track' && flashcardsEnabled(it.course)) ? `<button class="prog-btn cards" data-rmaction="cards" title="Study flashcards">Cards</button>` : ''}
            <button class="prog-btn review" data-rmaction="review" title="AI teaches this">Review</button>
          </div>`
        : '';
      return `<div class="rm-item ${available ? '' : 'locked'}" ${scopeAttrs} data-label="${esc(name || '')}">
        <span class="prog-dot" style="color:${c};background:${c}"></span>
        <div class="rm-item-info">
          <span class="rm-item-name" title="${esc(name || '')}">${esc(name || '')} ${kind}</span>
          ${path ? `<span class="rm-item-path">${esc(path)}</span>` : ''}
          ${it.note ? `<span class="rm-item-note">${esc(it.note)}</span>` : ''}
          <span class="rm-item-status">${esc(status)}</span>
        </div>
        ${bar}
        ${actions}
      </div>`;
    }).join('');
    return `<div class="rm-stage">
      <div class="rm-stage-head">
        <span class="rm-stage-num">${String(i + 1).padStart(2, '0')}</span>
        ${ringHtml(p.pct, color, 46)}
        <div class="rm-stage-info">
          <div class="rm-stage-title">${esc(stage.title)}</div>
          ${stage.summary ? `<div class="rm-stage-sum">${esc(stage.summary)}</div>` : ''}
          <div class="rm-stage-meta">${p.done}/${p.total} topics mastered</div>
        </div>
      </div>
      <div class="rm-items">${itemsHtml}</div>
    </div>`;
  }

  // Toggle this roadmap on/off your Mastery Engine (auto-adds/removes its tracks).
  async function addRoadmapToEngine() {
    const rm = (_roadmaps || []).find((r) => r.id === _openRoadmapId);
    if (!rm) return;
    const btn = $('rmAddBtn');
    if (btn) btn.disabled = true;
    try {
      const path = rm.enrolled ? 'remove' : 'add';
      await api(`/api/me/roadmaps/${encodeURIComponent(rm.id)}/${path}`, { method: 'POST' });
      rm.enrolled = !rm.enrolled;
      await reloadCatalog();  // Mastery-Engine tracks changed
      openRoadmap(rm.id);     // re-render button + progress
    } catch (e) {
      alert('Error: ' + e.message);
    }
    if (btn) btn.disabled = false;
  }

  function closeRoadmap() {
    _openRoadmapId = null;
    const view = $('roadmapView');
    if (view) view.classList.add('hidden');
    renderRoadmapList(); // re-fetch so mastery reflects any quiz just taken
  }

  /* ---- Mastery Engine curation: add/remove tracks from the open bank -------- */
  let _bankTracks = null;
  const shelfHasTrack = (program, track) =>
    state.catalog.some((r) => (r.program || '') === (program || '') && r.track === track);

  async function openAddTracks() {
    const modal = $('addTracksModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    const list = $('addTracksList');
    list.innerHTML = '<div class="ai-loading"><div class="spinner"></div> Loading the bank…</div>';
    try {
      const res = await api('/api/bank/tracks');
      _bankTracks = res.tracks || [];
    } catch (e) {
      list.innerHTML = '<span class="err">Couldn\'t load the bank: ' + esc(e.message) + '</span>';
      return;
    }
    renderAddTracks();
  }
  function closeAddTracks() { const m = $('addTracksModal'); if (m) m.classList.add('hidden'); }
  function filterAddTracks() { renderAddTracks(); }

  function renderAddTracks() {
    const list = $('addTracksList');
    if (!list || !_bankTracks) return;
    const term = ($('addTrackSearch').value || '').toLowerCase();
    const rows = _bankTracks.filter((t) => !term || t.track.toLowerCase().includes(term) || t.program.toLowerCase().includes(term));
    if (!rows.length) { list.innerHTML = '<div class="section-sub" style="padding:12px">No tracks match.</div>'; return; }
    list.innerHTML = rows.map((t) => {
      const on = shelfHasTrack(t.program, t.track);
      return `<div class="me-track-row">
        <div class="me-track-info">
          <span class="me-track-name">${esc(t.track)}</span>
          <span class="me-track-meta">${esc(t.program)} · ${t.courses} course${t.courses === 1 ? '' : 's'} · ${t.topics} topics</span>
        </div>
        <button type="button" class="btn ${on ? 'btn-ghost' : 'btn-primary'} me-track-toggle" data-prog="${esc(t.program)}" data-track="${esc(t.track)}" data-on="${on ? '1' : '0'}">${on ? '✓ Added — Remove' : '＋ Add'}</button>
      </div>`;
    }).join('');
  }

  async function toggleBankTrack(program, track, on) {
    try {
      await api('/api/me/tracks', { method: 'POST', body: JSON.stringify({ program, track, action: on ? 'remove' : 'add' }) });
      await reloadCatalog();
      renderAddTracks();     // reflect new add/remove state
      renderProgressTree();  // Mastery Engine tree updates behind the modal
    } catch (e) { alert('Error: ' + e.message); }
  }

  // Remove one track straight from a track card in the Mastery Engine tree.
  async function removeTrackScope(scope) {
    if (!scope || !scope.track) return;
    if (!confirm(`Remove "${scope.track}" from your Mastery Engine? (The content stays in the bank — re-add it anytime.)`)) return;
    try {
      await api('/api/me/tracks', { method: 'POST', body: JSON.stringify({ program: scope.program || '', track: scope.track, action: 'remove' }) });
      await reloadCatalog();
      renderProgressTree();
    } catch (e) { alert('Error: ' + e.message); }
  }

  /* Read a node's scope from its data-* attributes (incl. program for quiz routing). */
  function nodeScope(el) {
    const s = {};
    for (const k of LEVEL_KEYS) if (el.dataset[k]) s[k] = el.dataset[k];
    if (el.dataset.program) s.program = el.dataset.program;
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

  // Original self-contained study guide (the "Review" button): teaches the
  // section from scratch, no cross-lesson links.
  async function reviewFromScope(scope, label) {
    reviewScope = scope;
    $('reviewTitle').textContent = 'Review: ' + (label || 'Section');
    $('reviewLinks').innerHTML = ''; // the plain Review has no prereq chips
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

  // A clickable chip for a prerequisite / dependent lesson. Carries the referred
  // section's full scope in data-* so clicking it opens that lesson.
  function lessonLinkChip(item, kind) {
    const data = LEVEL_KEYS
      .filter((k) => item[k] != null)
      .map((k) => `data-${k}="${esc(item[k])}"`)
      .join(' ');
    const why = kind === 'prereq' && item.why ? `<span class="rl-why">${esc(item.why)}</span>` : '';
    return `<button type="button" class="rl-chip" ${data} data-label="${esc(item.topic || '')}">${esc(item.topic || '')}${why}</button>`;
  }

  // Fetch this section's prereq/dependent context (same graph as the Knowledge
  // Map) and render "Builds on / Leads to" chips above the guide. Best-effort —
  // the guide still streams if this fails or there are no links.
  async function loadLessonLinks(scope) {
    const wrap = $('reviewLinks');
    if (!wrap) return;
    wrap.innerHTML = '';
    try {
      const ctx = await api('/api/lesson/context', { method: 'POST', body: JSON.stringify(scope) });
      const prereqs = ctx.prereqs || [], deps = ctx.dependents || [];
      wrap.innerHTML =
        (prereqs.length ? `<div class="rl-sec"><span class="rl-lbl">Builds on</span>${prereqs.map((p) => lessonLinkChip(p, 'prereq')).join('')}</div>` : '')
        + (deps.length ? `<div class="rl-sec"><span class="rl-lbl">Leads to</span>${deps.map((p) => lessonLinkChip(p, 'dep')).join('')}</div>` : '');
    } catch { wrap.innerHTML = ''; }
  }

  // Prerequisite-aware study guide (the "Lesson" button): builds ON the section's
  // prerequisites and shows clickable "Builds on / Leads to" links to jump around.
  async function lessonFromScope(scope, label) {
    reviewScope = scope;
    $('reviewTitle').textContent = 'Lesson: ' + (label || 'Section');
    const box = $('reviewBody');
    box.innerHTML = '<div class="ai-loading"><div class="spinner"></div> Reading the questions & preparing your lesson…</div>';
    show('reviewModal');
    loadLessonLinks(scope); // fire-and-forget; chips fill in when ready
    try {
      await apiStream('/api/lesson', scope, (acc) => { box.innerHTML = renderMarkdown(acc); });
      typeset(box);
    } catch (e) {
      box.innerHTML = '<span class="err">Couldn\'t build a lesson: ' + esc(e.message) + '</span>';
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
    state.quizReturn = opts.returnTo || null;
    // Launching from the progress tree (My Progress view)? Remember its expanded +
    // scroll state so "Done"/"Back to menu" drops the learner right back where they
    // were, not at the top of a collapsed tree. Flashcard-origin quizzes return to
    // the card, so they skip this.
    if (opts.returnTo !== 'flashcard' && currentView() === 'setup' && state.mode === 'PROGRESS') {
      progressSnapshot = captureProgressState();
    }
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
    $('qCrumb').textContent = [q.course, q.topic].filter(Boolean).join('  ›  ');
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

    // Drill deeper & Generate-more both bank questions (need auth) and hit the
    // AI over the network, so guests and offline quizzes don't get those chips.
    const canDrill = state.authed && !state.guest && !state.offline;
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
          // Forward the hierarchy so a shared topic name drills into this exact sub-lesson.
          track: q.track, course: q.course, lesson: q.lesson,
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
          // Forward the hierarchy so a shared topic name resolves to this exact sub-lesson.
          track: q.track, course: q.course, lesson: q.lesson,
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
    if (state.guest || !state.authed) {
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

  // Speaker Mode: explain a card's concept aloud; browser speech-to-text feeds
  // an AI grade (0–3) that folds into the topic's mastery. See openSpeaker().
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const SILENCE_MS = 2500; // pause after speaking that auto-triggers grading
  const sp = {
    rec: null, recording: false, typing: false, grading: false, starting: false, blocked: false,
    finalText: '', interim: '', silenceTimer: null, stopReason: null,
    lastGrade: null, supported: !!SR,
  };

  function fcSetLoading(on, text) {
    $('fcLoader').classList.toggle('hidden', !on);
    if (text) $('fcLoaderText').textContent = text;
  }

  async function openFlashcards(scope, label) {
    if (!state.authed) { showLogin(); return; }
    // Same "return me where I was" snapshot as quizzes, for cards opened from the tree.
    if (currentView() === 'setup' && state.mode === 'PROGRESS') {
      progressSnapshot = captureProgressState();
    }
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

    // Collapse Speaker Mode so a graded panel never lingers onto the next card.
    resetSpeakerUI();

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

  /* --------------------------- Speaker Mode ------------------------------ */
  // Teach the current card's concept back in your own words. The browser's free
  // speech-to-text (Web Speech API) captures it, we wait for a pause, then the
  // AI grades it 0–3 and the score feeds this topic's mastery (a "pass" at 2+).
  // A typed box is the fallback when speech recognition isn't available.

  // Fully reset + hide the panel, stopping any live recognition or read-aloud.
  function resetSpeakerUI() {
    stopRecognition('reset');
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    sp.finalText = ''; sp.interim = ''; sp.lastGrade = null; sp.grading = false;
    sp.blocked = false; sp.starting = false;
    const panel = $('fcSpeaker');
    if (panel) panel.classList.add('hidden');
    $('fcsResult')?.classList.add('hidden');
    $('fcsGrading')?.classList.add('hidden');
    $('fcsRecordStage')?.classList.remove('hidden');
    const t = $('fcsTranscript'); if (t) t.innerHTML = '';
    const typed = $('fcsTyped'); if (typed) typed.value = '';
    $('fcsError') && ($('fcsError').textContent = '');
    paintMic(false);
    spSyncGradeBtn();
  }

  // Open the panel for the current card. Requires sign-in (grading writes progress).
  function openSpeaker() {
    if (!state.authed) { showLogin(); return; }
    const card = fc.view[fc.idx];
    if (!card) return;
    resetSpeakerUI();
    $('fcSpeaker').classList.remove('hidden');
    // No speech recognition here (Safari/Firefox/etc.) → go straight to typing.
    if (!sp.supported) {
      enableTyped(true);
      $('fcsStatus').textContent = 'Speech input isn’t available in this browser — type your explanation instead.';
    } else {
      sp.typing = false;
      $('fcsTypedWrap').classList.add('hidden');
      $('fcsTypeToggle').textContent = '⌨️ Type instead';
      $('fcsStatus').textContent = 'Tap the mic to start';
    }
    $('fcSpeaker').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function closeSpeaker() { resetSpeakerUI(); }

  // Mic button: start listening, or stop (a manual stop just pauses — you then
  // review the transcript and hit "Grade", or tap the mic again to add more).
  function toggleSpeaking() {
    if (!sp.supported) { enableTyped(true); return; }
    if (sp.recording) stopRecognition('manual');
    else startRecognition();
  }

  // Ask for the mic with a real getUserMedia prompt before starting recognition.
  // This surfaces the standard Chrome permission prompt (the one that works on
  // other sites) and gives a precise allowed/blocked signal — SpeechRecognition
  // on its own can fail with a SILENT 'not-allowed' when the mic is merely
  // un-granted or when the page is embedded in an iframe without
  // allow="microphone". Returns true if the mic is usable.
  async function ensureMicPermission() {
    const md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) return true; // can't pre-check; let recognition try
    try {
      const stream = await md.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop()); // release it; recognition opens its own
      return true;
    } catch {
      return false;
    }
  }

  // Mic denied: fall back to typing, and explain how to fix it. When we're inside
  // an iframe (e.g. the website's /skill-mastery embed), the block is the parent
  // page's Permissions Policy — offer to open the app in its own tab where voice
  // works. Otherwise it's a per-site permission the user can flip in the address bar.
  function showMicBlocked() {
    sp.blocked = true;
    enableTyped(false);
    const err = $('fcsError');
    const inIframe = window.self !== window.top;
    if (inIframe) {
      err.innerHTML = 'Your microphone is blocked inside this embedded page. '
        + `<a href="${esc(window.location.href)}" target="_blank" rel="noopener">Open Skill Mastery in its own tab</a>`
        + ' to use your voice — or just type your explanation below.';
      $('fcsStatus').textContent = 'Voice is blocked in the embed — open in a new tab, or type below.';
    } else {
      err.textContent = 'Microphone access is blocked for this site. Click the mic (or lock) icon in your address bar, allow the microphone, then tap the mic again — or type your explanation below.';
      $('fcsStatus').textContent = 'Voice unavailable — type instead, or allow the mic and retry.';
    }
  }

  async function startRecognition() {
    if (!sp.supported || sp.recording || sp.starting) return;
    sp.starting = true;
    sp.blocked = false;
    $('fcsStatus').textContent = 'Requesting microphone…';
    const ok = await ensureMicPermission();
    sp.starting = false;
    if (!ok) { showMicBlocked(); return; }
    let rec;
    try { rec = new SR(); } catch { sp.supported = false; enableTyped(true); return; }
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    sp.rec = rec;
    sp.stopReason = null;
    sp.finalText = ''; sp.interim = '';
    $('fcsError').textContent = '';
    $('fcsResult').classList.add('hidden');

    rec.onresult = (e) => {
      let finalT = '', interimT = '';
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalT += res[0].transcript;
        else interimT += res[0].transcript;
      }
      sp.finalText = finalT;
      sp.interim = interimT;
      paintTranscript();
      spSyncGradeBtn();
      armSilenceTimer();
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        showMicBlocked();
      } else if (e.error === 'no-speech') {
        $('fcsStatus').textContent = 'Didn’t catch anything — tap the mic and try again.';
      } else if (e.error !== 'aborted') {
        $('fcsError').textContent = 'Speech recognition error: ' + e.error;
      }
    };
    rec.onend = () => {
      sp.recording = false;
      clearSilence();
      paintMic(false);
      // Mic was denied — showMicBlocked() already set a clear message; don't
      // overwrite it with a "didn't catch anything" hint.
      if (sp.blocked) { spSyncGradeBtn(); return; }
      const hasText = !!(sp.finalText.trim() || sp.interim.trim());
      // A manual stop just pauses for review; any other end (silence pause,
      // an explicit Grade tap, or the browser closing the stream) grades now.
      if (sp.stopReason === 'manual' || sp.stopReason === 'reset') {
        $('fcsStatus').textContent = hasText ? 'Paused — tap the mic to add more, or grade it.' : 'Tap the mic to start';
      } else if (hasText) {
        gradeSpeaking();
      } else {
        $('fcsStatus').textContent = 'Didn’t catch anything — tap the mic and try again.';
      }
      spSyncGradeBtn();
    };

    try {
      rec.start();
      sp.recording = true;
      paintMic(true);
      $('fcsStatus').textContent = 'Listening… explain the concept. I’ll wait for a pause.';
    } catch {
      sp.recording = false;
      paintMic(false);
    }
  }

  // reason: 'manual' (pause for review) | 'silence' | 'grade' | 'reset'.
  function stopRecognition(reason) {
    clearSilence();
    if (sp.rec && sp.recording) {
      sp.stopReason = reason;
      try { sp.rec.stop(); } catch {}
    } else if (!sp.recording && sp.rec) {
      // already stopped; nothing to do
    }
  }

  function armSilenceTimer() {
    clearSilence();
    if (!(sp.finalText.trim() || sp.interim.trim())) return; // wait until they've said something
    sp.silenceTimer = setTimeout(() => { stopRecognition('silence'); }, SILENCE_MS);
  }
  function clearSilence() { if (sp.silenceTimer) { clearTimeout(sp.silenceTimer); sp.silenceTimer = null; } }

  function paintMic(on) {
    const mic = $('fcsMic');
    if (mic) mic.classList.toggle('recording', !!on);
  }

  function paintTranscript() {
    const el = $('fcsTranscript');
    if (!el) return;
    const fin = esc(sp.finalText);
    const int = sp.interim ? ` <span class="fcs-interim">${esc(sp.interim)}</span>` : '';
    el.innerHTML = (fin + int).trim() || '<span class="fcs-transcript-empty">Your words will appear here…</span>';
  }

  // Reveal the typed fallback (and, when speech is unsupported, hide the mic row).
  function enableTyped(focus) {
    sp.typing = true;
    $('fcsTypedWrap').classList.remove('hidden');
    $('fcsTypeToggle').textContent = '🎙️ Use the mic';
    // No speech support → hide just the mic button (keep the status hint, which
    // lives in the same row, visible). Also hide the "use the mic" toggle, since
    // there's nothing to switch back to.
    if (!sp.supported) {
      $('fcsMic')?.classList.add('hidden');
      $('fcsTypeToggle')?.classList.add('hidden');
    }
    const ta = $('fcsTyped');
    if (ta && !ta._spBound) { ta.addEventListener('input', spSyncGradeBtn); ta._spBound = true; }
    if (focus && ta) ta.focus();
    spSyncGradeBtn();
  }

  function toggleSpeakerType() {
    if (sp.typing && sp.supported) {
      sp.typing = false;
      $('fcsTypedWrap').classList.add('hidden');
      $('fcsTypeToggle').textContent = '⌨️ Type instead';
      spSyncGradeBtn();
    } else {
      enableTyped(true);
    }
  }

  // Enable the Grade button whenever there's something to grade.
  function spSyncGradeBtn() {
    const btn = $('fcsGradeBtn');
    if (!btn) return;
    const typed = sp.typing ? ($('fcsTyped')?.value || '').trim() : '';
    const spoken = (sp.finalText.trim() + ' ' + sp.interim.trim()).trim();
    btn.disabled = sp.grading || !(typed || spoken);
  }

  async function gradeSpeaking() {
    if (sp.grading) return;
    // If still listening, stop first; onend re-enters here with the final text.
    if (sp.recording) { stopRecognition('grade'); return; }
    clearSilence();
    const card = fc.view[fc.idx];
    if (!card) return;
    const transcript = sp.typing
      ? ($('fcsTyped')?.value || '').trim()
      : (sp.finalText.trim() + ' ' + sp.interim.trim()).trim();
    if (!transcript) { $('fcsError').textContent = 'Say (or type) your explanation first.'; return; }

    sp.grading = true;
    spSyncGradeBtn();
    $('fcsError').textContent = '';
    $('fcsRecordStage').classList.add('hidden');
    $('fcsResult').classList.add('hidden');
    $('fcsGrading').classList.remove('hidden');
    try {
      const r = await api('/api/flashcards/explain', {
        method: 'POST', body: JSON.stringify({ cardId: card.id, transcript }),
      });
      renderSpeakerResult(r, transcript, card);
      // Progress changed for this topic — drop the cached stats so the card's
      // accuracy re-fetches, and refresh the panel behind us.
      if (card.topic) { delete fc._statsByTopic[card.topic]; renderCardStats(card); }
    } catch (e) {
      $('fcsGrading').classList.add('hidden');
      $('fcsRecordStage').classList.remove('hidden');
      $('fcsError').textContent = 'Could not grade that: ' + e.message;
    } finally {
      sp.grading = false;
      spSyncGradeBtn();
    }
  }

  function renderSpeakerResult(r, transcript, card) {
    sp.lastGrade = r;
    $('fcsGrading').classList.add('hidden');
    $('fcsRecordStage').classList.add('hidden');
    $('fcsResult').classList.remove('hidden');

    const score = Math.max(0, Math.min(3, r.score | 0));
    const scoreEl = $('fcsScore');
    scoreEl.className = 'fcs-score fcs-s' + score;
    $('fcsScoreNum').textContent = score;
    $('fcsVerdict').innerHTML = codeSpans(r.verdict || '');

    // Progress note reflects the lighter mapping (pass at 2/3+).
    const note = $('fcsProgressNote');
    if (r.progress && r.progress.logged) {
      note.textContent = r.pass
        ? `✅ Counted as a pass on “${r.progress.topic}” — mastery updated.`
        : `Logged on “${r.progress.topic}” — aim for 2/3 to pass. Keep at it.`;
      note.className = 'fcs-progress-note ' + (r.pass ? 'ok' : 'miss');
    } else {
      note.textContent = 'This card isn’t linked to a topic yet, so it won’t change your mastery.';
      note.className = 'fcs-progress-note neutral';
    }

    $('fcsSaid').textContent = transcript;

    const fillList = (wrapId, listId, items) => {
      const wrap = $(wrapId), list = $(listId);
      if (!items || !items.length) { wrap.classList.add('hidden'); list.innerHTML = ''; return; }
      wrap.classList.remove('hidden');
      list.innerHTML = items.map((s) => `<li>${codeSpans(s)}</li>`).join('');
      typeset(list);
    };
    fillList('fcsStrengthsWrap', 'fcsStrengths', r.strengths);
    fillList('fcsGapsWrap', 'fcsGaps', r.gaps);

    $('fcsModel').innerHTML = renderMarkdown(r.modelAnswer || '');
    typeset($('fcsModel'));
    $('fcsEncouragement').innerHTML = codeSpans(r.encouragement || '');
    typeset($('fcsVerdict'));

    // Hide the read-aloud button if this browser can't speak.
    $('fcsRead').classList.toggle('hidden', !window.speechSynthesis);
    $('fcsResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Fresh attempt on the same card.
  function restartSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    sp.finalText = ''; sp.interim = ''; sp.lastGrade = null; sp.blocked = false;
    $('fcsResult').classList.add('hidden');
    $('fcsGrading').classList.add('hidden');
    $('fcsRecordStage').classList.remove('hidden');
    paintTranscript();
    const ta = $('fcsTyped'); if (ta) ta.value = '';
    $('fcsError').textContent = '';
    $('fcsStatus').textContent = sp.supported ? 'Tap the mic to start' : 'Type your explanation, then grade it.';
    spSyncGradeBtn();
  }

  function speakerNextCard() { closeSpeaker(); nextCard(); }

  // Read-aloud: speak the assessment with the browser's free TTS. Toggles off if
  // it's already talking. Strips LaTeX/code markup so it reads naturally.
  function readAssessment() {
    const synth = window.speechSynthesis;
    if (!synth || !sp.lastGrade) return;
    if (synth.speaking) { synth.cancel(); return; }
    const g = sp.lastGrade;
    const parts = [`You scored ${g.score} out of 3.`, g.verdict];
    if (g.strengths && g.strengths.length) parts.push('What you got right: ' + g.strengths.join('; ') + '.');
    if (g.gaps && g.gaps.length) parts.push('What to work on: ' + g.gaps.join('; ') + '.');
    if (g.modelAnswer) parts.push('Model answer: ' + g.modelAnswer);
    if (g.encouragement) parts.push(g.encouragement);
    const u = new SpeechSynthesisUtterance(plainForSpeech(parts.filter(Boolean).join(' ')));
    u.rate = 1.02;
    synth.cancel();
    synth.speak(u);
  }

  // Turn markdown/LaTeX into something a TTS voice reads naturally — otherwise it literally says
  // "hashtag hashtag" for an H3, "star star" for bold, and reads out URLs.
  function plainForSpeech(s) {
    return String(s || '')
      // fenced code blocks -> keep inner text, drop the fences + language tag
      .replace(/```[a-zA-Z0-9]*\r?\n?/g, ' ').replace(/```/g, ' ')
      // images ![alt](url) -> alt ; links [text](url) -> text
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      // headings, blockquotes and list bullets at the start of a line
      .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
      .replace(/^[ \t]*>[ \t]?/gm, '')
      .replace(/^[ \t]*[-*+][ \t]+/gm, '')
      .replace(/^[ \t]*\d+\.[ \t]+/gm, '')
      // emphasis + inline code markers
      .replace(/`([^`]*)`/g, '$1')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // LaTeX
      .replace(/\\texttt\{([^}]*)\}/g, '$1')
      .replace(/\${1,2}/g, ' ')
      .replace(/\\[a-zA-Z]+/g, ' ')
      .replace(/[{}\\]/g, ' ')
      // stray table pipes / leftover markers
      .replace(/\|/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s*\n\s*/g, '. ')   // line breaks become sentence pauses
      .replace(/\.\s*\.\s*/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
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
  const assistant = { loaded: false, activeId: '', chats: [], abort: null };

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
      syncConvoUi();
      if (convoOn()) startConvo();   // resume hands-free if it was left on
    } else {
      stopConvo();                            // never keep the mic open behind a closed panel
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
    if (opening) syncConvoUi();
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
      // Open a FRESH chat every time the assistant is opened — a new session should be
      // a blank slate, not a resumed thread. Past conversations stay one tap away via
      // the 🕑 History button (and "+ New" here just repeats this).
      await openAssistantChat('', true);
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
    // Abort any in-flight stream so it can't write into the conversation we're leaving.
    if (assistant.abort) { try { assistant.abort.abort(); } catch { /* closed */ } assistant.abort = null; }
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
    input.value = '';
    appendBubble(log, 'user', msg);
    // Quick command: "fixformat" cleans up the current card instead of chatting.
    if (/^\/?fix[\s-]?formats?\b/i.test(msg)) {
      await fixFormatCommand(log);
      input.focus();
      return;
    }
    // Only hands-free VOICE still blocks (TTS needs the whole reply at once). Web
    // search now STREAMS too (grounded plain text), so every typed turn shows the
    // live thinking + ⏸ Pause & steer controls (see streamAssistantAnswer).
    if (convoOn()) { await sendAssistantBlocking(log, msg, true); return; }
    await streamAssistantAnswer(log, msg, '');
    input.focus();
  }

  // The blocking send path: one request, full reply rendered at once. `spoken`
  // asks for TTS-friendly prose and reads it aloud (voice mode); otherwise it's a
  // normal markdown+visual reply (used for web-search turns).
  async function sendAssistantBlocking(log, msg, spoken) {
    const send = $('assistantSend');
    const thinking = appendBubble(log, 'assistant', 'Thinking…');
    thinking.classList.add('thinking');
    send.disabled = true;
    if (spoken) setPhase('thinking');
    const ac = new AbortController();           // barge-in / Stop can abort it
    if (spoken) convo.abort = ac;
    try {
      const r = await api('/api/assistant/chat', {
        method: 'POST',
        signal: ac.signal,
        body: JSON.stringify({
          message: msg,
          context: assistantContext(),
          conversationId: assistant.activeId || undefined,
          conversational: spoken || undefined,
          web: webAccessOn() || undefined,
        }),
      });
      if (spoken && convo.abort === ac) convo.abort = null;
      thinking.remove();
      appendBubble(log, 'assistant', r.reply, r.visual);
      assistant.loaded = true;
      if (spoken) speakAssistantReply(r.reply);
      if (r.conversationId) {
        assistant.activeId = r.conversationId;
        localStorage.setItem('assistant.activeId', assistant.activeId);
        await refreshAssistantChats();
      }
      refreshCost();
    } catch (e) {
      thinking.remove();
      if (e.name === 'AbortError') return;      // superseded by a barge-in / Stop — stay quiet
      appendBubble(log, 'assistant', 'Sorry, that failed: ' + esc(e.message));
      if (spoken && convoActive()) ensureListening();  // keep the hands-free loop alive after a failure
    } finally {
      send.disabled = false;
    }
  }

  // Build an assistant bubble wired for streaming: a collapsible live "thinking"
  // panel, the answer body, and a controls row (Pause, later the steer box).
  function appendStreamingBubble(log) {
    const empty = log.querySelector('.chat-empty');
    if (empty) empty.remove();
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg ai';
    wrap.innerHTML = '<div class="chat-bubble">'
      + '<details class="chat-think is-live" open><summary>Thinking</summary><div class="chat-think-body"></div></details>'
      + '<div class="chat-answer"></div>'
      + '<div class="chat-controls"></div></div>';
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
    return {
      wrap,
      think: wrap.querySelector('.chat-think'),
      thinkBody: wrap.querySelector('.chat-think-body'),
      thinkSummary: wrap.querySelector('summary'),
      answer: wrap.querySelector('.chat-answer'),
      controls: wrap.querySelector('.chat-controls'),
    };
  }

  // Stream one assistant answer, showing the reasoning live and letting the user
  // Pause (abort) + steer (re-run with added guidance) — Atrium's pause-&-steer,
  // which is client abort + re-POST of the SAME message with an accumulated steer.
  // `els` is reused across steer restarts so the answer stays in one bubble.
  async function streamAssistantAnswer(log, msg, steer, els) {
    const send = $('assistantSend');
    els = els || appendStreamingBubble(log);
    // Reset the bubble for this (re)run.
    els.thinkBody.textContent = '';
    els.answer.innerHTML = '';
    els.think.classList.remove('hidden');
    els.think.classList.add('is-live');
    els.think.open = true;
    els.thinkSummary.textContent = 'Thinking';
    els.controls.innerHTML = '<button type="button" class="chat-pause">⏸ Pause &amp; steer</button>';
    const pauseBtn = els.controls.querySelector('.chat-pause');
    send.disabled = true;

    const ac = new AbortController();
    assistant.abort = ac;
    let thinkText = '', answerText = '', gotThinking = false, gotAnswer = false, paused = false, done = false;

    pauseBtn.onclick = () => {
      if (done) return;
      paused = true;
      try { ac.abort(); } catch { /* already closed */ }
      els.think.classList.remove('is-live');
      showSteerBox(log, msg, steer, els);
    };

    try {
      await apiStreamSSE('/api/assistant/chat/stream', {
        message: msg,
        context: assistantContext(),
        conversationId: assistant.activeId || undefined,
        steer: steer || undefined,
        web: webAccessOn() || undefined,
      }, (ev, data) => {
        if (ev === 'thinking') {
          gotThinking = true;
          thinkText += (data.text || '');
          els.thinkBody.textContent = thinkText;
          log.scrollTop = log.scrollHeight;
        } else if (ev === 'content') {
          if (!gotAnswer) {                 // first answer token — collapse the thinking panel
            gotAnswer = true;
            els.think.classList.remove('is-live');
            els.think.open = false;
            els.thinkSummary.textContent = 'Thoughts';
          }
          answerText += (data.text || '');
          els.answer.innerHTML = renderMarkdown(answerText);
          log.scrollTop = log.scrollHeight;
        } else if (ev === 'done') {
          done = true;
          if (data.conversationId) {
            assistant.activeId = data.conversationId;
            localStorage.setItem('assistant.activeId', assistant.activeId);
          }
        } else if (ev === 'error') {
          throw new Error(data.message || 'AI request failed');
        }
      }, ac.signal);

      // Finalize: drop the (empty) thinking panel if the model never reasoned,
      // typeset any math, sync the history list + cost.
      els.think.classList.remove('is-live');
      if (!gotThinking) els.think.classList.add('hidden');
      els.controls.innerHTML = '';
      typeset(els.answer);
      assistant.loaded = true;
      if (done) { await refreshAssistantChats(); refreshCost(); }
    } catch (e) {
      if (e.name === 'AbortError' || paused) return;   // paused → steer box already shown
      els.think.classList.remove('is-live');
      els.controls.innerHTML = '';
      els.answer.innerHTML = renderMarkdown('Sorry, that failed: ' + e.message);
    } finally {
      if (assistant.abort === ac) assistant.abort = null;
      send.disabled = false;
    }
  }

  // The paused steer box: type extra direction, then Continue (re-run with the
  // accumulated steer) or Stop (keep whatever streamed so far).
  function showSteerBox(log, msg, steer, els) {
    els.thinkSummary.textContent = 'Paused';
    els.controls.innerHTML =
      '<div class="chat-steer">'
      + '<textarea class="chat-steer-input" rows="2" placeholder="Add direction, e.g. \'be more concise\', \'focus on the intuition\', \'show a worked example\'…"></textarea>'
      + '<div class="chat-steer-actions">'
      + '<button type="button" class="chat-steer-go">▶ Continue with guidance</button>'
      + '<button type="button" class="chat-steer-stop">Stop</button>'
      + '</div></div>';
    const ta = els.controls.querySelector('.chat-steer-input');
    ta.focus();
    els.controls.querySelector('.chat-steer-go').onclick = () => {
      const g = ta.value.trim();
      const combined = steer ? (g ? steer + ' ' + g : steer) : g;
      streamAssistantAnswer(log, msg, combined, els);   // re-run into the SAME bubble
    };
    els.controls.querySelector('.chat-steer-stop').onclick = () => {
      els.controls.innerHTML = '';
      els.think.open = false;
      els.thinkSummary.textContent = 'Thoughts';
      if (!els.answer.innerHTML.trim()) els.answer.innerHTML = renderMarkdown('_Stopped._');
      typeset(els.answer);
      $('assistantSend').disabled = false;
    };
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
        for (const lesson of orderedLessons(course, [...lessons.keys()])) {
          const lTopics = [...lessons.get(lesson)];
          const lKey = 'L::' + track + '||' + course + '||' + lesson;
          ms.nodeTopics.set(lKey, lTopics);
          // display the recommended-order number prefix; the key stays raw.
          html += msRow(lKey, 2, lessonLabel(course, lesson), lTopics, false, false);
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
        // AI Support opens the action group; ‹ goes back to the compact row.
        if (act === 'ai') { if (menu) menu.dataset.menu = act; return; }
        if (act === 'back') { if (menu) menu.dataset.menu = 'root'; return; }
        if (act === 'quiz') quizFromScope(scope);
        else if (act === 'review') reviewFromScope(scope, node.dataset.label);
        else if (act === 'lesson') lessonFromScope(scope, node.dataset.label);
        else if (act === 'cards') openFlashcards(scope, node.dataset.label);
        else if (act === 'removetrack') removeTrackScope(scope);
        return; // don't also toggle the row
      }
      const row = e.target.closest('.prog-row');
      if (!row) return;
      const node = row.parentElement;
      if (node.classList.contains('has-children')) node.classList.toggle('open');
    });

    // Grouped dropdown mode-nav (open/close menus).
    wireModeNav();

    // Add-tracks modal: toggle a bank track on/off your Mastery Engine.
    const atl = $('addTracksList');
    if (atl) atl.addEventListener('click', (e) => {
      const b = e.target.closest('.me-track-toggle');
      if (!b) return;
      toggleBankTrack(b.dataset.prog, b.dataset.track, b.dataset.on === '1');
    });
    const atModal = $('addTracksModal');
    if (atModal) atModal.addEventListener('click', (e) => { if (e.target === atModal) closeAddTracks(); });

    // Roadmaps: open a roadmap card, or launch a topic's Quiz/Cards/Review.
    const rmPanel = $('roadmapPanel');
    if (rmPanel) rmPanel.addEventListener('click', (e) => {
      const card = e.target.closest('.rm-card');
      if (card) { openRoadmap(card.dataset.rm); return; }
      const actBtn = e.target.closest('[data-rmaction]');
      if (!actBtn) return;
      const item = actBtn.closest('.rm-item');
      if (!item) return;
      const scope = nodeScope(item); // reads data-track/course/lesson/topic
      const act = actBtn.dataset.rmaction;
      if (act === 'quiz') quizFromScope(scope);
      else if (act === 'review') reviewFromScope(scope, item.dataset.label);
      else if (act === 'cards') openFlashcards(scope, item.dataset.label);
    });

    // Clicking a "Builds on / Leads to" chip opens that referred lesson.
    $('reviewLinks').addEventListener('click', (e) => {
      const chip = e.target.closest('.rl-chip');
      if (!chip) return;
      const scope = {};
      for (const k of LEVEL_KEYS) if (chip.dataset[k]) scope[k] = chip.dataset[k];
      lessonFromScope(scope, chip.dataset.label);
    });

    init();
  });

  // Voice input: dictate speech into a chat textarea (Web Speech API). Reuses the Speaker-Mode
  // mic-permission prime (ensureMicPermission) so it works inside the website's cross-origin iframe.
  // Graceful: the button hides itself when the browser has no SpeechRecognition. One live at a time.
  let _dictation = null;
  async function dictateInto(inputId, btn) {
    const input = $(inputId);
    if (!input) return;
    if (!SR) { if (btn) btn.style.display = 'none'; return; }
    if (_dictation) { try { _dictation.rec.stop(); } catch {} return; }   // toggle off
    const ok = await ensureMicPermission();
    if (!ok) return;
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true;
    const base = input.value ? input.value.replace(/\s+$/, '') + ' ' : '';
    _dictation = { rec, btn };
    rec.onstart = () => { if (btn) btn.classList.add('recording'); };
    rec.onresult = (e) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      input.value = base + t;
    };
    rec.onerror = () => {};
    rec.onend = () => { if (btn) btn.classList.remove('recording'); _dictation = null; input.focus(); };
    try { rec.start(); } catch { _dictation = null; if (btn) btn.classList.remove('recording'); }
  }

  /* ----------------------- Conversation mode ---------------------------- */
  // Hands-free voice chat with the Study Assistant: you talk, it replies aloud, then the mic
  // reopens for your next turn — AND you can barge in. The mic stays open while it's thinking or
  // speaking, so talking over it (or the Stop button) interrupts: a spoken reply is cut off and a
  // still-generating answer is aborted, and whatever you just said becomes the next question.
  // Toggled in the assistant settings (⚙) and remembered across sessions. Needs BOTH speech
  // recognition and synthesis — the toggle hides itself when either is missing (falls back to
  // typed chat). phase: 'idle' | 'listening' | 'thinking' | 'speaking'.
  const convo = { rec: null, running: false, starting: false, fatal: null, phase: 'idle', abort: null, spoken: '', voice: null, voices: [], muted: false };
  // Browser voices load asynchronously (especially in Chrome) — repopulate the picker when they arrive.
  if (window.speechSynthesis && window.speechSynthesis.addEventListener) {
    window.speechSynthesis.addEventListener('voiceschanged', () => loadConvoVoices());
  }

  function convoSupported() { return !!SR && !!window.speechSynthesis; }
  function convoOn() { return convoSupported() && localStorage.getItem('assistant.convoMode') === '1'; }

  // Web access (Google Search grounding) — applies to any assistant chat, not just voice. Gemini-only
  // server-side; harmless to request on other providers (it's ignored). Persisted, default off.
  function webAccessOn() { return localStorage.getItem('assistant.web') === '1'; }
  function onWebAccessChange(chk) { localStorage.setItem('assistant.web', chk && chk.checked ? '1' : '0'); }
  function convoActive() { return convoOn() && !$('assistantPanel')?.classList.contains('hidden'); }
  function assistantMicBtn() { return document.querySelector('#assistantPanel .chat-input .me-mic'); }

  // Rank the browser's built-in voices by how human they sound (all free). Microsoft "Natural"
  // (Edge/Windows) and Google network voices are far nicer than the robotic "Desktop"/eSpeak
  // defaults, so we auto-pick the best one instead of whatever the OS default is.
  function voiceScore(v) {
    const n = (v.name || '').toLowerCase();
    const lang = (v.lang || '').toLowerCase();
    let s = 0;
    if (lang.startsWith('en')) s += 10;
    if (lang === 'en-us') s += 3;
    if (n.includes('natural')) s += 30;                                  // MS Natural — best
    if (n.includes('google')) s += 20;                                   // Google network voices
    if (/\b(aria|jenny|guy|ava|samantha|allison|serena|zoe|neural|premium|enhanced)\b/.test(n)) s += 12;
    if (v.localService === false) s += 5;                                // network voices are usually higher quality
    if (/desktop|espeak|compact|pico/.test(n)) s -= 15;                  // known-robotic
    return s;
  }
  function voiceLabel(v) {
    // Trim the noisy " - English (United States)" tails so the dropdown stays readable.
    return (v.name || 'Voice').replace(/\s*[-–]\s*English.*$/i, '').replace(/\s*\([^)]*\)\s*$/, '').trim() || v.name;
  }
  function loadConvoVoices() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const all = synth.getVoices() || [];
    if (!all.length) return;                                             // not ready yet — voiceschanged will refire
    const en = all.filter((v) => (v.lang || '').toLowerCase().startsWith('en'));
    const list = (en.length ? en : all).slice().sort((a, b) => voiceScore(b) - voiceScore(a));
    convo.voices = list;
    const saved = localStorage.getItem('assistant.voice') || '';
    convo.voice = list.find((v) => v.name === saved) || list[0] || null;
    const sel = $('convoVoiceSel');
    if (sel) {
      sel.innerHTML = list
        .map((v) => `<option value="${esc(v.name)}"${convo.voice && v.name === convo.voice.name ? ' selected' : ''}>${esc(voiceLabel(v))}</option>`)
        .join('');
    }
  }
  function onConvoVoiceChange(sel) {
    localStorage.setItem('assistant.voice', sel.value);
    convo.voice = convo.voices.find((v) => v.name === sel.value) || null;
    // Quick preview so the choice is audible.
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance("Hi, this is how I'll sound.");
      if (convo.voice) u.voice = convo.voice;
      u.rate = 1.02;
      synth.speak(u);
    } catch { /* preview is best-effort */ }
  }

  function setConvoStatus(state) {
    const el = $('assistantConvoStatus');
    if (!el) return;
    const txt = $('assistantConvoText');
    const stop = $('assistantConvoStop');
    const mute = $('assistantConvoMute');
    el.classList.remove('listening', 'speaking', 'muted');
    if (!state) { el.classList.add('hidden'); if (txt) txt.textContent = ''; stop?.classList.add('hidden'); mute?.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const label = {
      listening: 'Listening… speak now',
      thinking: 'Thinking… (say something to interrupt)',
      speaking: 'Speaking… (talk over me, or tap Stop)',
      muted: 'Mic muted — tap Unmute to talk',
    }[state] || '';
    if (txt) txt.textContent = label;
    if (state === 'listening') el.classList.add('listening');
    else if (state === 'speaking') el.classList.add('speaking');
    else if (state === 'muted') el.classList.add('muted');
    // Interrupt affordance only while there's something to interrupt.
    stop?.classList.toggle('hidden', !(state === 'thinking' || state === 'speaking'));
    // Mute toggle is offered whenever conversation mode is engaged.
    if (mute) { mute.classList.remove('hidden'); mute.textContent = convo.muted ? 'Unmute' : 'Mute mic'; }
  }

  // Mute is a transient control: silence the mic without leaving conversation mode. It still
  // speaks its replies; it just won't listen (or barge-in) until you unmute. Not persisted —
  // turning conversation mode off resets it.
  function convoToggleMute() {
    convo.muted = !convo.muted;
    if (convo.muted) {
      if (convo.rec) { try { convo.rec.stop(); } catch {} }
      convo.rec = null; convo.running = false;
      assistantMicBtn()?.classList.remove('recording');
      if (convo.phase !== 'speaking' && convo.phase !== 'thinking') setConvoStatus('muted');
      else setConvoStatus(convo.phase);   // keep the current label, just flip the button
    } else {
      if (convo.phase !== 'speaking' && convo.phase !== 'thinking') setPhase('listening');
      else setConvoStatus(convo.phase);
      ensureListening();
    }
  }

  function setPhase(p) { convo.phase = p; setConvoStatus(p === 'idle' ? '' : p); }

  // Reflect the saved state onto the checkbox and hide the whole row when unsupported.
  function syncConvoUi() {
    const supported = convoSupported();
    const wrap = $('asstConvoWrap');
    if (wrap) wrap.style.display = supported ? '' : 'none';
    const chk = $('convoModeChk');
    if (chk) chk.checked = convoOn();
    const vwrap = $('asstVoiceWrap');
    if (vwrap) vwrap.style.display = supported ? '' : 'none';
    if (supported) loadConvoVoices();
    const webChk = $('asstWebChk');
    if (webChk) webChk.checked = webAccessOn();
  }

  function toggleConvoMode(chk) {
    localStorage.setItem('assistant.convoMode', chk && chk.checked ? '1' : '0');
    if (convoOn()) startConvo();
    else stopConvo();
  }

  function startConvo() { if (convoActive()) { setPhase('listening'); ensureListening(); } }

  function abortGeneration() { if (convo.abort) { try { convo.abort.abort(); } catch {} convo.abort = null; } }
  function duckTts() { if (window.speechSynthesis) window.speechSynthesis.cancel(); convo.spoken = ''; }

  // Heuristic to keep the recognizer from hearing our OWN voice while we speak: if most of what
  // was "heard" is words we're currently saying, it's speaker echo (on devices without hardware
  // echo-cancellation) — ignore it. Anything else is the user genuinely barging in.
  function looksLikeEcho(said) {
    const spoken = (convo.spoken || '').toLowerCase();
    if (!spoken) return false;                       // nothing playing -> not echo
    const words = said.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const hit = words.filter((w) => spoken.includes(w)).length;
    return hit / words.length > 0.6;
  }

  // The single always-restarting recognizer. Runs through every phase so the user can interrupt.
  async function ensureListening() {
    if (!convoActive() || convo.running || convo.starting) return;
    if (convo.muted) { assistantMicBtn()?.classList.remove('recording'); if (convo.phase !== 'speaking' && convo.phase !== 'thinking') setConvoStatus('muted'); return; }
    convo.starting = true;
    const ok = await ensureMicPermission();
    convo.starting = false;
    if (!ok) { forceConvoOff('Microphone is blocked — allow it, then turn Conversation mode back on.'); return; }
    if (!convoActive()) return;
    const input = $('assistantInput');
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false;  // ends on your pause
    convo.rec = rec; convo.running = true; convo.fatal = null;
    let finalText = '';
    rec.onstart = () => { assistantMicBtn()?.classList.add('recording'); };
    rec.onresult = (e) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      finalText = t;
      const said = t.trim();
      // Live barge-in: the instant we're sure it's the user (not echo), cut off whatever's happening.
      if (convo.phase === 'speaking') {
        if (said && !looksLikeEcho(said)) { duckTts(); setPhase('listening'); input.value = said; }
      } else if (convo.phase === 'thinking') {
        if (said.length > 1) { abortGeneration(); setPhase('listening'); input.value = said; }
      } else {
        input.value = said;
      }
    };
    rec.onerror = (e) => { convo.fatal = e.error; };
    rec.onend = () => {
      convo.running = false; convo.rec = null; assistantMicBtn()?.classList.remove('recording');
      if (convo.fatal === 'not-allowed' || convo.fatal === 'service-not-allowed') {
        forceConvoOff('Microphone is blocked — allow it, then turn Conversation mode back on.');
        return;
      }
      handleUtterance((finalText || '').trim());
    };
    try { rec.start(); } catch { convo.running = false; convo.rec = null; }
  }

  // Decide what a finished utterance means, then always keep the ear open for the next one.
  function handleUtterance(said) {
    if (!convoActive()) { if (convo.phase !== 'idle') setPhase('idle'); return; }
    const keepListening = () => setTimeout(ensureListening, 200);   // small gap avoids a tight restart loop
    if (convo.phase === 'listening') {
      if (said) { $('assistantInput').value = said; sendAssistant(); }   // reply is spoken; loop continues
    } else if (convo.phase === 'thinking') {
      if (said && !looksLikeEcho(said)) { abortGeneration(); $('assistantInput').value = said; sendAssistant(); }
    } else if (convo.phase === 'speaking') {
      if (said && !looksLikeEcho(said)) { duckTts(); $('assistantInput').value = said; sendAssistant(); }
    }
    keepListening();
  }

  // Manual interrupt (Stop button): silence any speech, cancel any in-flight answer, go back to listening.
  function convoInterrupt() {
    abortGeneration();
    duckTts();
    setPhase('listening');
    ensureListening();
  }

  function stopConvo() {
    if (convo.rec) { try { convo.rec.stop(); } catch {} }
    convo.rec = null; convo.running = false;
    abortGeneration();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    convo.spoken = '';
    convo.muted = false;
    assistantMicBtn()?.classList.remove('recording');
    convo.phase = 'idle';
    setConvoStatus('');
  }

  function forceConvoOff(msg) {
    localStorage.setItem('assistant.convoMode', '0');
    stopConvo();
    syncConvoUi();
    const log = $('assistantLog');
    if (msg && log) appendBubble(log, 'assistant', msg);
  }

  // Speak an assistant reply aloud. The mic stays open throughout so the user can talk over it.
  function speakAssistantReply(text) {
    const synth = window.speechSynthesis;
    if (!synth || !convoOn()) { if (convoOn()) setPhase('listening'); else setConvoStatus(''); return; }
    const spoken = plainForSpeech(text);
    if (!spoken) { setPhase('listening'); ensureListening(); return; }
    convo.spoken = spoken;
    const u = new SpeechSynthesisUtterance(spoken);
    if (convo.voice) u.voice = convo.voice;   // best available browser voice
    u.rate = 1.02;
    u.onstart = () => setPhase('speaking');
    u.onend = () => { convo.spoken = ''; if (convo.phase === 'speaking') setPhase('listening'); if (convoActive()) ensureListening(); };
    u.onerror = () => { convo.spoken = ''; if (convo.phase === 'speaking') setPhase('listening'); if (convoActive()) ensureListening(); };
    synth.cancel();
    synth.speak(u);
    ensureListening();   // arm barge-in while we talk
  }

  return {
    dictateInto, toggleConvoMode, convoInterrupt, convoToggleMute, onConvoVoiceChange, onWebAccessChange,
    enterMastery, goHome, setMode,
    submitPassword, actAs, stopActing, fixAllFormats, fixAllQuestionFormats,
    sequenceMlTopics,
    fixQuestionFormat, fixCardFormat,
    toggleCardEdit, setCardEditMode, saveCardEdit, applyCardEdit, cardEditKey,
    launchManual, launchPriority, launchPriorityCards, nextQuestion, skipQuestion, doneQuiz,
    askHint, askExplain,
    startDrill, submitCustomConfusion,
    toggleGenMore, generateSimilar,
    openStats, priorityFromStats, onAiEngineChange, onThinkingChange, onDifficultyChange,
    analyzeProgress, closeReview, quizFromReview,
    closeRoadmap, addRoadmapToEngine,
    openAddTracks, closeAddTracks, filterAddTracks,
    openGraph, setGraphLevel,
    generateFlashcards, regenerateFlashcards, toggleHighway,
    flipCard, nextCard, prevCard, quizMeOnCard, toggleCardStats,
    openSpeaker, closeSpeaker, toggleSpeaking, gradeSpeaking, toggleSpeakerType,
    restartSpeaking, speakerNextCard, readAssessment,
    toggleAssistant, sendAssistant, newAssistantChat, deleteAssistantChat,
    toggleAssistantHistory, openAssistantChatById, toggleAssistantSettings,
    toggleCostDetail, msClear,
  };
})();
