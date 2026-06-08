/* AGORA Mastery Engine — frontend controller */
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
    } catch (e) {
      console.error(e);
    }
    refreshModeChip();
    populateTracks();
  }

  function tickClock() {
    $('clock').textContent = new Date().toLocaleTimeString([], {
      hour: 'numeric', minute: '2-digit', second: '2-digit',
    });
  }

  function refreshModeChip() {
    const chip = $('modeChip');
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

  const VIEWS = ['homeView', 'setupView', 'quizView', 'resultView', 'statsView'];

  function currentView() {
    for (const v of VIEWS) {
      if (!$(v).classList.contains('hidden')) return v.replace('View', '');
    }
    return 'home';
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
      '<option value="Review All">— Review Full Track —</option>' +
      courses.map((c) => `<option>${esc(c)}</option>`).join('');
    filterLessons();
  }

  function filterLessons() {
    const c = $('courseSel').value;
    if (c !== 'Review All') {
      const ls = uniqSorted(state.catalog.filter((r) => r.course === c).map((r) => r.lesson));
      $('lessonSel').innerHTML =
        '<option value="Review All">— Review Full Course —</option>' +
        ls.map((l) => `<option>${esc(l)}</option>`).join('');
    } else {
      $('lessonSel').innerHTML = '<option value="-- N/A --">— N/A —</option>';
    }
    filterTopics();
  }

  function filterTopics() {
    const l = $('lessonSel').value;
    if (l !== 'Review All' && l !== '-- N/A --') {
      const ts = uniqSorted(state.catalog.filter((r) => r.lesson === l).map((r) => r.topic));
      $('topicSel').innerHTML =
        '<option value="Review All">— Review Full Lesson —</option>' +
        ts.map((t) => `<option>${esc(t)}</option>`).join('');
    } else {
      $('topicSel').innerHTML = '<option value="-- N/A --">— N/A —</option>';
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
      openAuth();
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
      $('setupTitle').textContent = '🤖 Generate mastery questions';
      $('setupSub').textContent = 'Pick a scope and let the Wise Teacher write harder questions into your bank.';
      $('launchBtn').textContent = 'Generate Questions';
    } else {
      $('setupTitle').textContent = '🎯 Build your quiz';
      $('setupSub').textContent = 'Drill down as far as you like — leave lower levels on "Review All" to widen the net.';
      $('launchBtn').textContent = 'Launch Engine';
    }
  }

  function goHome() {
    state.guest = false;
    showOnly('homeView');
  }

  /* -------------------------------- Auth --------------------------------- */
  function openAuth() {
    $('authError').textContent = '';
    $('passwordInput').value = '';
    show('authModal');
    setTimeout(() => $('passwordInput').focus(), 50);
  }
  function closeAuth() { hide('authModal'); }

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
      closeAuth();
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
        let msg = `✅ Generated ${r.created} question(s) across ${r.topics} topic(s).`;
        if (r.errors && r.errors.length) msg += `\n\n⚠️ Some failed:\n` + r.errors.join('\n');
        alert(msg);
      } else {
        const path = state.guest ? '/api/quiz/guest' : '/api/quiz/select';
        const qs = await api(path, { method: 'POST', body: JSON.stringify(selection()) });
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
      const qs = await api('/api/quiz/priority', { method: 'POST', body: JSON.stringify(selection()) });
      startQuiz(qs);
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------- Stats --------------------------------- */
  function openStats() {
    if (!state.authed) { openAuth(); return; }
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

  // Accuracy → colour: red (weak) ramps to green (strong).
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
      : 'No attempts logged yet — run a Mastery quiz and your progress will appear here.';

    $('statTiles').innerHTML = [
      tile(o.overallAccuracy == null ? '—' : o.overallAccuracy + '%', 'Overall accuracy',
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
        const last = t.daysSince == null ? '—'
          : t.daysSince < 1 ? 'today'
          : `${Math.round(t.daysSince)}d`;
        return `<tr>
          <td><strong>${esc(t.topic)}</strong></td>
          <td style="color:var(--muted)">${esc(t.course)}</td>
          <td style="color:${accColor(t.accuracy)};font-weight:700">${t.accuracy == null ? '—' : t.accuracy + '%'}</td>
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
    showOnly('quizView');
    try {
      // Broad priority quiz across everything — server ranks by weakness.
      const qs = await api('/api/quiz/priority', { method: 'POST', body: JSON.stringify({ count: 10 }) });
      startQuiz(qs);
    } catch (e) {
      alert('Error: ' + e.message);
      showOnly('statsView');
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

  // Stable, deterministic order — by lesson/unit number (and natural name order
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
          <button class="prog-btn" data-action="quiz" title="Live quiz on this section">▶ Quiz</button>
          <button class="prog-btn review" data-action="review" title="AI teaches this section first">📖 Review</button>
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
      const qs = await api('/api/quiz/select', {
        method: 'POST',
        body: JSON.stringify({ ...scope, count }),
      });
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
    $('reviewTitle').textContent = '📖 Review — ' + (label || 'Section');
    $('reviewBody').innerHTML =
      '<div class="ai-loading"><div class="spinner"></div> Reading the questions & preparing your review…</div>';
    show('reviewModal');
    try {
      const r = await api('/api/review', { method: 'POST', body: JSON.stringify(scope) });
      $('reviewBody').innerHTML = renderMarkdown(r.review);
    } catch (e) {
      $('reviewBody').innerHTML = '<span class="err">Couldn\'t build a review: ' + esc(e.message) + '</span>';
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
      '<div class="ai-head">🧠 Progress analysis</div><div class="ai-loading"><div class="spinner"></div> Analyzing your progress…</div>';
    try {
      const r = await api('/api/analyze', { method: 'POST' });
      box.innerHTML = '<div class="ai-head">🧠 Progress analysis</div>' + renderMarkdown(r.analysis);
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
    $('reviewFlag').checked = false;
    hide('postAnswer');

    // reset AI tutor UI for the new question
    $('hintBtn').disabled = false;
    $('hintBtn').textContent = '💡 Get a hint';
    $('hintBox').classList.add('hidden');
    $('hintBox').innerHTML = '';
    $('explainBtn').disabled = false;
    $('explainBtn').classList.remove('hidden');
    $('explainBox').classList.add('hidden');
    $('explainBox').innerHTML = '';

    const area = $('optionsArea');
    area.innerHTML = '';
    shuffle([...q.options]).forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'option';
      b.innerHTML = `<span class="key">${KEYS[i] || '•'}</span><span>${esc(opt)}</span>`;
      b.onclick = () => handleAnswer(opt, q, b);
      area.appendChild(b);
    });
  }

  function handleAnswer(choice, q, btn) {
    const correct = choice.trim() === q.answer.trim();
    if (correct) state.score++;

    document.querySelectorAll('.option').forEach((el) => {
      el.disabled = true;
      const txt = el.querySelector('span:last-child').textContent.trim();
      if (txt === q.answer.trim()) el.classList.add('correct');
      else if (el === btn) el.classList.add('wrong');
    });

    const f = $('feedback');
    f.textContent = correct ? 'Correct ✨' : `Incorrect — answer: ${q.answer}`;
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
    try {
      const r = await api('/api/hint', {
        method: 'POST',
        body: JSON.stringify({ question: q.question, options: q.options, answer: q.answer }),
      });
      box.innerHTML = '<div class="ai-head">💡 Hint</div>' + renderMarkdown(r.hint);
      btn.textContent = '💡 Hint shown';
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
    try {
      const r = await api('/api/explain', {
        method: 'POST',
        body: JSON.stringify({
          question: q.question, options: q.options, answer: q.answer,
          userAnswer: rec.userAnswer, isCorrect: rec.isCorrect,
        }),
      });
      box.innerHTML = '<div class="ai-head">✨ Explanation</div>' + renderMarkdown(r.explanation);
      btn.classList.add('hidden');
    } catch (e) {
      box.innerHTML = '<span class="err">Couldn\'t load explanation: ' + esc(e.message) + '</span>';
      btn.disabled = false;
    }
  }

  /** Minimal, safe Markdown -> HTML (bold, bullets, paragraphs). */
  function renderMarkdown(md) {
    const lines = String(md || '').split('\n');
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
      note.textContent = 'Guest mode — results were not saved.';
    } else {
      note.textContent = 'Saving results…';
      api('/api/quiz/log', { method: 'POST', body: JSON.stringify({ results: state.log }) })
        .then(() => {
          note.textContent = '✅ Results saved & mastery updated.';
          // refresh catalog so priorities reflect the new attempt.
          return api('/api/catalog').then((c) => { state.catalog = c; });
        })
        .catch((e) => { note.textContent = '⚠️ Could not save: ' + e.message; });
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
    startGuest, enterMastery, goHome, setMode,
    openAuth, closeAuth, submitPassword,
    launchManual, launchPriority, nextQuestion,
    askHint, askExplain,
    openStats, priorityFromStats,
    analyzeProgress, closeReview, quizFromReview,
  };
})();
