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
      state.catalog = catalog;
      lsSet(LS.catalog, catalog);
      localStorage.setItem('agora.authed', status.authed ? '1' : '0');
    } catch (e) {
      // Offline / server unreachable: fall back to cached catalog + auth.
      console.error(e);
      state.catalog = lsGet(LS.catalog) || [];
      state.authed = localStorage.getItem('agora.authed') === '1';
    }
    refreshModeChip();
    populateTracks();
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
  // is stored in cookies the server reads on every AI request.
  function setAiChoice(provider, model) {
    document.cookie = `aiProvider=${encodeURIComponent(provider)}; path=/; max-age=31536000; samesite=lax`;
    document.cookie = `aiModel=${encodeURIComponent(model || '')}; path=/; max-age=31536000; samesite=lax`;
    localStorage.setItem('aiProvider', provider);
    localStorage.setItem('aiModel', model || '');
  }

  async function loadModels() {
    const sel = $('aiEngineSel');
    if (!sel) return;
    try {
      const r = await api('/api/models');
      const opts = [];
      for (const p of r.providers || []) {
        for (const m of p.models || []) {
          opts.push({ provider: p.id, model: m, label: `${p.label}: ${m}` });
        }
      }
      if (!opts.length) return;
      sel.innerHTML = opts
        .map((o) => `<option value="${esc(o.provider)}::${esc(o.model)}">${esc(o.label)}</option>`)
        .join('');

      // Restore the saved choice, falling back to the first available option
      // (so a previously-picked local model resets to cloud when unavailable).
      const savedP = localStorage.getItem('aiProvider') || 'gemini';
      const savedM = localStorage.getItem('aiModel') || '';
      const match = opts.find((o) => o.provider === savedP && (!savedM || o.model === savedM)) || opts[0];
      sel.value = `${match.provider}::${match.model}`;
      setAiChoice(match.provider, match.model);

      $('aiEngineHint').textContent = (r.ollamaAvailable || r.lmstudioAvailable)
        ? 'Local engine detected. Pick a local model to keep everything on your machine.'
        : 'Cloud uses Gemini. Local models appear here when Ollama or LM Studio is running and the app is run locally.';
    } catch (e) {
      console.error(e);
    }
  }

  function onAiEngineChange() {
    const [provider, model] = $('aiEngineSel').value.split('::');
    setAiChoice(provider, model);
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

  const VIEWS = ['loginView', 'setupView', 'quizView', 'resultView', 'statsView'];

  function currentView() {
    for (const v of VIEWS) {
      if (!$(v).classList.contains('hidden')) return v.replace('View', '');
    }
    return 'login';
  }

  function showOnly(view) {
    VIEWS.forEach((v) => (v === view ? show(v) : hide(v)));
    refreshModeChip();
  }

  /* --------------------------- Cascading menus --------------------------- */
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
    const courses = uniqSorted(state.catalog.filter((r) => r.track === t).map((r) => r.course));
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
    setMode('QUIZ'); // always reset to the quiz builder when (re)entering setup
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
    // Priority CTA only makes sense in mastery quiz/gen flows.
    $('priorityBtn').classList.toggle('hidden', !mastery || isProgress);

    if (isProgress) renderProgressTree();
    else updateSetupCopy();
  }

  function updateSetupCopy() {
    if (state.mode === 'GEN') {
      $('setupTitle').textContent = 'Generate mastery questions';
      $('setupSub').textContent = 'Pick a scope and let the Wise Teacher write harder questions into your bank.';
      $('launchBtn').textContent = 'Generate Questions';
    } else {
      $('setupTitle').textContent = 'Build your quiz';
      $('setupSub').textContent = 'Drill down as far as you like. Leave lower levels on "Review All" to widen the net.';
      $('launchBtn').textContent = 'Launch Engine';
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
        const path = state.guest ? '/api/quiz/guest' : '/api/quiz/select';
        const qs = await getQuiz(path, selection());
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

  function renderProgressNode(node, level, scope) {
    const pct = nodeProgress(node);
    const color = accColor(pct);
    const kids = [...node.children.values()].sort(byName);
    const hasKids = kids.length > 0 && !node.leaf;
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

    return `<div class="prog-node ${hasKids ? 'has-children' : ''}" data-level="${level}" data-label="${esc(node.name)}" ${dataAttrs}>
      <div class="prog-row" style="padding-left:${level * 16}px">
        <span class="prog-caret">${hasKids ? '▸' : ''}</span>
        <div class="prog-info">
          <span class="prog-name">${esc(node.name)}</span>
          <span class="prog-sub">${esc(sub)}</span>
        </div>
        <div class="prog-bar-wrap">
          <span class="mini-bar"><span class="mini-fill" style="width:${pct}%;background:${color}"></span></span>
          <span class="prog-pct" style="color:${color}">${pct}%</span>
        </div>
        <div class="prog-actions">
          <button class="prog-btn" data-action="quiz" title="Live quiz on this section">Quiz</button>
          <button class="prog-btn review" data-action="review" title="AI teaches this section first">Review</button>
        </div>
      </div>
      ${childHtml}
    </div>`;
  }

  function renderProgressTree() {
    const tree = $('progressTree');
    const empty = $('progressEmpty');
    if (!state.catalog.length) {
      tree.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    const root = buildProgressTree(state.catalog);
    const tracks = [...root.children.values()].sort(byName);
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
  function startQuiz(qs) {
    if (!qs || !qs.length) {
      alert('No questions found for this selection.');
      return;
    }
    state.questions = qs;
    state.idx = 0;
    state.score = 0;
    state.log = [];
    showOnly('quizView');
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.questions[state.idx];
    const n = state.questions.length;
    $('progressFill').style.width = (state.idx / n) * 100 + '%';
    $('progressCount').textContent = `Question ${state.idx + 1} of ${n}`;
    $('progressScore').textContent = `Score ${state.score}`;
    $('qCrumb').textContent = [q.course, q.topic].filter(Boolean).join('  ›  ');
    $('qText').textContent = q.question;
    typeset($('qText'));
    $('reviewFlag').checked = false;
    hide('postAnswer');

    // reset AI tutor UI for the new question
    $('hintBtn').disabled = false;
    $('hintBtn').textContent = 'Get a hint';
    $('hintBox').classList.add('hidden');
    $('hintBox').innerHTML = '';
    $('explainBtn').disabled = false;
    $('explainBtn').classList.remove('hidden');
    $('explainBox').classList.add('hidden');
    $('explainBox').innerHTML = '';

    // reset the "drill deeper" UI - only in mastery mode (it banks a new
    // question, needing auth) and only when online (it needs the AI + a write),
    // so guests and offline quizzes never see it.
    const canDrill = state.authed && !state.guest && !state.offline;
    $('drillWrap').classList.toggle('hidden', !canDrill);
    $('drillBtn').disabled = false;
    $('drillPanel').classList.add('hidden');
    $('confusionList').innerHTML = '';
    $('confusionCustom').classList.add('hidden');
    $('confusionSubmit').disabled = false; // re-arm after a prior drill disabled it
    $('confusionText').value = '';
    $('drillError').textContent = '';
    $('drillLoader').classList.add('hidden');

    const area = $('optionsArea');
    area.innerHTML = '';
    shuffle([...q.options]).forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'option';
      // Keep the raw option text on the node so answer-matching survives LaTeX
      // typesetting (which rewrites the rendered text).
      b.dataset.opt = opt;
      b.innerHTML = `<span class="key">${KEYS[i] || '•'}</span><span class="opt-text">${esc(opt)}</span>`;
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
      ans.textContent = q.answer;
      f.appendChild(ans);
      typeset(ans);
    }
    f.className = 'feedback ' + (correct ? 'ok' : 'no');
    $('progressScore').textContent = `Score ${state.score}`;
    show('postAnswer');
    state.log[state.idx] = { ...q, isCorrect: correct, reviewFlag: false, userAnswer: choice };
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
      btn.classList.add('hidden');
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

  /** Minimal, safe Markdown -> HTML (bold, bullets, paragraphs). */
  function renderMarkdown(md) {
    // Normalise em/en dashes to plain hyphens in AI output (no em dashes anywhere).
    const lines = String(md || '').replace(/[—–]/g, '-').split('\n');
    let html = '', inList = false;
    for (const raw of lines) {
      const trimmed = raw.trim();
      let line = esc(trimmed).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
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
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'option'],
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
        <td><span class="tag ${r.isCorrect ? 'pass' : 'fail'}">${r.isCorrect ? 'PASS' : 'FAIL'}</span></td>`;
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

    // Progress tree: action buttons + expand/collapse (event delegation).
    $('progressTree').addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const node = actionBtn.closest('.prog-node');
        const scope = nodeScope(node);
        if (actionBtn.dataset.action === 'quiz') quizFromScope(scope);
        else if (actionBtn.dataset.action === 'review') reviewFromScope(scope, node.dataset.label);
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
    submitPassword,
    launchManual, launchPriority, nextQuestion,
    askHint, askExplain,
    startDrill, submitCustomConfusion,
    openStats, priorityFromStats,
    analyzeProgress, closeReview, quizFromReview,
  };
})();
