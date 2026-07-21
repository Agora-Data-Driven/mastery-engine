/* Academy Admin — curriculum, transcripts, generation, flags, enrolment.
 *
 * Deliberately standalone (not part of app.js): the learner SPA is already ~188 KB and these are
 * admin tools with a different audience and different failure modes. Everything here is gated by
 * /api/auth/status AND by requireAdmin on the server — the client gate is only chrome. */
(() => {
  const $ = (id) => document.getElementById(id);
  const show = (el, on) => el.classList.toggle('hidden', !on);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function api(path, opts = {}) {
    const o = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opts.body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opts.body); }
    const res = await fetch(path, o);
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error((data && data.error) || res.statusText);
    return data;
  }

  /* POST `body` and consume a Server-Sent Events response: handlers.onThinking /
   * handlers.onContent receive token deltas as the model works; resolves with the
   * 'result' event's payload, rejects on an 'error' event (or a non-stream error
   * response, surfaced like api()). This is what makes the composer show the model's
   * thinking live instead of a spinner. */
  async function streamSSE(path, body, handlers = {}) {
    const res = await fetch(path, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('text/event-stream')) {
      const data = ct.includes('application/json') ? await res.json().catch(() => null) : await res.text().catch(() => '');
      throw new Error((data && data.error) || res.statusText || 'Request failed');
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', result, failed;
    const handle = (event, dataStr) => {
      let d = {}; try { d = JSON.parse(dataStr); } catch { /* keep-alive / partial */ }
      if (event === 'thinking') handlers.onThinking && handlers.onThinking(d.text || '');
      else if (event === 'content') handlers.onContent && handlers.onContent(d.text || '');
      else if (event === 'result') result = d;
      else if (event === 'error') failed = new Error(d.error || 'AI request failed');
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let sep;
      while ((sep = buf.indexOf('\n\n')) >= 0) {
        const frame = buf.slice(0, sep); buf = buf.slice(sep + 2);
        let event = 'message', dataStr = '';
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) dataStr += line.slice(5).replace(/^ /, '');
        }
        if (event !== 'message' || dataStr) handle(event, dataStr);
      }
    }
    if (failed) throw failed;
    if (!result) throw new Error('The model did not return a result');
    return result;
  }

  /* A live "thinking" panel bound to a #thinking element (head + body). Shows the
   * model's reasoning as it streams, falling back to the raw draft if a model emits
   * no separate reasoning — so the panel is never dead. */
  function thinkPanel(id) {
    const el = $(id);
    const headEl = el.querySelector('.aa-think-head');
    const bodyEl = el.querySelector('.aa-think-body');
    let think = '', content = '';
    const render = () => { bodyEl.textContent = think || content; bodyEl.scrollTop = bodyEl.scrollHeight; };
    return {
      start() { think = ''; content = ''; show(el, true); el.classList.add('live'); headEl.innerHTML = '<span class="aa-think-dot"></span> Thinking…'; bodyEl.textContent = ''; },
      thinking(t) { think += t; render(); },
      content(t) { content += t; render(); },
      done(label) { el.classList.remove('live'); headEl.innerHTML = `<span class="aa-think-dot done"></span> ${esc(label || 'Done')}`; if (!think && !content) show(el, false); },
      fail(label) { el.classList.remove('live'); headEl.innerHTML = `<span class="aa-think-dot err"></span> ${esc(label || 'Stopped')}`; },
    };
  }

  const state = {
    program: '', catalog: [],
    watcher: { client: '', channel: '', video: null, title: '' },
    job: null, stop: false,
    ingest: null, stopIngest: false, // the AI auto-file proposal + its run
    goal: null, stopGoal: false, // the "learn a goal" plan + its run
    bulk: null, stopBulk: false, // the "bulk-build lessons" parsed preview + its run
    assignments: [], // the People tab's who's-assigned-to-what table
  };

  /* ------------------------------- bootstrap ------------------------------- */
  async function boot() {
    let auth;
    try { auth = await api('/api/auth/status'); } catch { auth = { authed: false }; }
    if (!auth.authed || !auth.admin) { $('who').textContent = 'Not signed in as an admin.'; show($('gate'), true); show($('progNew'), false); return; }
    $('who').textContent = `${auth.email}${auth.actingAs ? ` (acting as ${auth.actingAs})` : ''}`;
    show($('main'), true);

    const { programs, current } = await api('/api/programs');
    // Honour a ?program= override (admins can inspect any program); default to the
    // user's current program. Changing it reloads the whole page so every panel is
    // rebuilt cleanly for the new program.
    const urlProg = new URLSearchParams(location.search).get('program');
    state.program = (urlProg && programs.some((p) => p.id === urlProg)) ? urlProg : current;
    $('program').innerHTML = programs.map((p) => `<option value="${esc(p.id)}">${esc(p.name || p.id)}</option>`).join('');
    $('program').value = state.program;
    $('program').onchange = () => { location.search = '?program=' + encodeURIComponent($('program').value); };

    wireTabs();
    wireCurriculum();
    wireTranscripts();
    wireIngest();
    wireGoalPlan();
    wireBulk();
    wireBuildModes();
    wireGenerate();
    loadEngines();
    wirePeople();
    wireAddProgram();
    refreshAll();
  }

  function wireTabs() {
    document.querySelectorAll('.aa-tab').forEach((t) => {
      t.onclick = () => {
        document.querySelectorAll('.aa-tab').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
        document.querySelectorAll('.aa-panel').forEach((p) => p.classList.toggle('on', p.id === 'p-' + t.dataset.panel));
        if (t.dataset.panel === 'flags') loadFlags();
        if (t.dataset.panel === 'generate') loadJobs();
        if (t.dataset.panel === 'people') loadAssignments();
      };
    });
  }

  const q = (extra = {}) => new URLSearchParams({ program: state.program, ...extra }).toString();

  async function refreshAll() {
    await loadCatalog();
    await loadTranscripts();
  }

  /* ------------------------------- curriculum ------------------------------ */
  async function loadCatalog() {
    state.catalog = await api('/api/catalog?' + q());
    $('curCount').textContent = `— ${state.catalog.length} topic${state.catalog.length === 1 ? '' : 's'}`;
    const rt = $('railTopics'); if (rt) rt.textContent = String(state.catalog.length); // mirror into the run-sheet rail
    renderCurriculumTree();
    populateGenerate();
  }

  /* -------- Generate: cascading Course › Lesson › Sub-lesson selectors -------- */
  const trackOf = (course) => (state.catalog.find((r) => r.course === course) || {}).track || '';
  function populateGenerate() {
    const courses = [...new Set(state.catalog.map((r) => r.course))].filter(Boolean);
    $('gCourse').innerHTML = courses.length
      ? courses.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')
      : '<option value="">(no courses yet)</option>';
    populateGenLessons();
  }
  function populateGenLessons() {
    const course = $('gCourse').value;
    const lessons = [...new Set(state.catalog.filter((r) => r.course === course).map((r) => r.lesson))].filter(Boolean);
    $('gLesson').innerHTML = '<option value="">All lessons in this course</option>'
      + lessons.map((l) => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
    populateGenTopics();
  }
  function populateGenTopics() {
    const course = $('gCourse').value, lesson = $('gLesson').value;
    const topics = lesson
      ? [...new Set(state.catalog.filter((r) => r.course === course && r.lesson === lesson).map((r) => r.topic))].filter(Boolean)
      : [];
    $('gTopic').innerHTML = '<option value="">All sub-lessons</option>'
      + topics.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    $('gTopic').disabled = !lesson;
    renderGenSources();
  }
  function renderGenSources() {
    const course = $('gCourse').value, lesson = $('gLesson').value;
    const list = _transcripts.filter((t) => t.course === course && (!lesson || t.lesson === lesson));
    const total = _transcripts.length;
    if (!list.length) {
      const cShort = esc((course || '').split(':')[0]);
      $('gSources').innerHTML = `<div class="aa-note" style="padding:10px">No transcripts on <b>${cShort}</b>${lesson ? ' &rsaquo; ' + esc(lesson) : ''} — questions here are written from expert knowledge.${total ? ` <span style="color:#9aa0ae">(${total} transcript${total === 1 ? '' : 's'} exist in this program, attached to other courses.)</span>` : ''}</div>`;
      return;
    }
    $('gSources').innerHTML = `<div class="aa-note" style="padding:6px 10px">${list.length} transcript${list.length === 1 ? '' : 's'} for this scope. Tick specific ones to ground on, or leave all unticked to use them all.</div>`
      + list.map((t) =>
      `<label style="display:flex;gap:8px;align-items:center;padding:6px 11px;border-bottom:1px solid #F0F1F4;cursor:pointer"><input type="checkbox" data-tid="${esc(t.id)}" style="width:auto"><span><b>${esc(t.title)}</b> <span style="color:#6B7280;font-size:12px">&middot; ${esc(t.lesson)} &middot; ${t.chars || 0} chars</span></span></label>`).join('');
  }

  // Interactive Track > Course > Lesson > Sub-lesson tree with inline add/remove.
  function renderCurriculumTree() {
    const el = $('curTree');
    if (!state.catalog.length) { el.innerHTML = '<div class="aa-note" style="padding:12px">No topics yet — add one above, or paste an outline.</div>'; return; }
    const tree = {};
    const lessonRefs = [];
    for (const r of state.catalog) {
      ((tree[r.track] ||= {})[r.course] ||= {})[r.lesson] ||= [];
      tree[r.track][r.course][r.lesson].push(r);
    }
    let html = '';
    for (const [track, courses] of Object.entries(tree)) {
      html += `<div style="padding:8px 10px 2px;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#6B7280">${esc(track)}</div>`;
      for (const [course, lessons] of Object.entries(courses)) {
        html += `<div style="padding:4px 10px 2px;font-weight:700;font-size:14px">${esc(course)}</div>`;
        for (const [lesson, topics] of Object.entries(lessons)) {
          const li = lessonRefs.push({ track, course, lesson, ids: topics.map((r) => r.id) }) - 1;
          html += `<div style="padding:3px 10px 3px 22px;display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="font-weight:600;color:#374151;font-size:13px">${esc(lesson)}</span><span style="display:flex;gap:6px"><button class="btn" data-li="${li}" style="padding:1px 8px;font-size:11px">+ sub-lesson</button><button class="btn" data-dellesson="${li}" title="Delete this whole lesson and its sub-lessons" style="padding:1px 7px;font-size:12px;color:#B3261E;border-color:#f0d0cd">&times;</button></span></div>`;
          for (const r of topics) {
            html += `<div style="padding:1px 10px 1px 38px;display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px"><span>&middot; ${esc(r.topic)}</span><button class="btn" data-del="${esc(r.id)}" title="Remove this sub-lesson" style="padding:0 7px;font-size:12px;color:#B3261E;border-color:#f0d0cd">&times;</button></div>`;
          }
        }
      }
    }
    el.innerHTML = html;
    el.querySelectorAll('button[data-li]').forEach((b) => { b.onclick = () => {
      const ref = lessonRefs[Number(b.dataset.li)];
      const name = window.prompt(`New sub-lesson under "${ref.lesson}":`);
      if (name && name.trim()) addTopicRow(ref.track, ref.course, ref.lesson, name.trim());
    }; });
    el.querySelectorAll('button[data-del]').forEach((b) => { b.onclick = () => {
      if (window.confirm('Remove this sub-lesson from the curriculum? (Banked questions stay, keyed by name.)')) delTopicRow(b.dataset.del);
    }; });
    el.querySelectorAll('button[data-dellesson]').forEach((b) => { b.onclick = () => {
      const ref = lessonRefs[Number(b.dataset.dellesson)];
      if (window.confirm(`Delete the whole lesson "${ref.lesson}" and all ${ref.ids.length} sub-lesson(s)? (Banked questions stay, keyed by name.)`)) delLessonRows(ref.ids);
    }; });
  }
  async function delLessonRows(ids) {
    try {
      for (const id of ids) await api('/api/admin/topics/' + encodeURIComponent(id), { method: 'DELETE' });
      await loadCatalog();
    } catch (e) { alert(e.message); }
  }
  async function addTopicRow(track, course, lesson, topic) {
    try { await api('/api/admin/topics', { method: 'POST', body: { program: state.program, track, course, lesson, topic } }); await loadCatalog(); }
    catch (e) { alert(e.message); }
  }
  async function delTopicRow(id) {
    try { await api('/api/admin/topics/' + encodeURIComponent(id), { method: 'DELETE' }); await loadCatalog(); }
    catch (e) { alert(e.message); }
  }

  function wireCurriculum() {
    $('nAdd').onclick = async () => {
      const track = $('nTrack').value.trim(), course = $('nCourse').value.trim(), lesson = $('nLesson').value.trim(), topic = $('nTopic').value.trim();
      if (!track || !course || !lesson || !topic) { $('nMsg').innerHTML = '<span class="aa-err">Fill Track, Course, Lesson and Sub-lesson.</span>'; return; }
      try {
        await api('/api/admin/topics', { method: 'POST', body: { program: state.program, track, course, lesson, topic } });
        $('nTopic').value = '';
        $('nMsg').innerHTML = '<span class="aa-ok">Added.</span>';
        await loadCatalog();
      } catch (e) { $('nMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
    };
    $('previewBtn').onclick = async () => {
      $('curMsg').textContent = 'Checking…';
      try {
        const r = await api('/api/admin/topics/bulk', {
          method: 'POST', body: { program: state.program, text: $('outline').value, preview: true },
        });
        show($('curOut'), true);
        $('curOut').textContent =
          `${r.count} topic(s) parsed.\n` +
          (r.problems.length ? `\n${r.problems.length} bad line(s):\n` + r.problems.map((p) => `  line ${p.line}: ${p.text}\n    ${p.error}`).join('\n') : '\nNo problems.\n') +
          '\n' + r.rows.map((x) => `  ${x.track} > ${x.course} > ${x.lesson} > ${x.topic}`).join('\n');
        $('commitBtn').disabled = r.count === 0;
        $('curMsg').textContent = r.problems.length ? `${r.problems.length} line(s) will be skipped.` : 'Looks good.';
      } catch (e) { $('curMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
    };
    $('commitBtn').onclick = async () => {
      $('curMsg').textContent = 'Saving…';
      try {
        const r = await api('/api/admin/topics/bulk', { method: 'POST', body: { program: state.program, text: $('outline').value } });
        $('curMsg').innerHTML = `<span class="aa-ok">${r.created} created, ${r.updated} updated.</span>`;
        $('commitBtn').disabled = true;
        await loadCatalog();
      } catch (e) { $('curMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
    };
  }

  /* ------------------------------- transcripts ----------------------------- */
  let _transcripts = [];
  async function loadTranscripts() {
    try {
      _transcripts = await api('/api/admin/transcripts?' + q());
      renderTranscriptList();
      if ($('gSources')) renderGenSources(); // Generate tab source list depends on these
    } catch (e) { $('tList').textContent = 'Error: ' + e.message; }
  }

  // Watcher-style browser: a filterable list on the left, full text on the right.
  function renderTranscriptList() {
    const term = (($('tSearch') && $('tSearch').value) || '').toLowerCase();
    const list = _transcripts.filter((t) => !term
      || `${t.title} ${t.course} ${t.lesson}`.toLowerCase().includes(term));
    if ($('tCount')) $('tCount').textContent = `— ${_transcripts.length}`;
    if (!list.length) { $('tList').innerHTML = '<div class="aa-note" style="padding:10px">Nothing attached yet.</div>'; return; }
    $('tList').innerHTML = list.map((t) =>
      `<button data-id="${esc(t.id)}"><b>${esc(t.title)}</b><br>` +
      `<span style="color:#6B7280;font-size:12px">${esc((t.course || '').split(':')[0])} &rsaquo; ${esc(t.lesson)} &middot; ${t.chars || 0} chars &middot; ${esc(t.source)}</span></button>`
    ).join('');
    $('tList').querySelectorAll('button').forEach((b) => { b.onclick = () => openTranscript(b.dataset.id, b); });
  }

  async function openTranscript(id, btn) {
    if (btn) {
      $('tList').querySelectorAll('button').forEach((x) => x.removeAttribute('aria-selected'));
      btn.setAttribute('aria-selected', 'true');
    }
    $('tView').textContent = 'Loading…';
    try {
      const t = await api('/api/admin/transcripts/' + encodeURIComponent(id));
      renderTranscriptRead(t);
    } catch (e) { $('tView').textContent = 'Error: ' + e.message; }
  }

  // Read view: the full text + an Edit button that swaps in the edit form.
  function renderTranscriptRead(t) {
    const url = t.watcherRef && t.watcherRef.url;
    const link = url ? ` &middot; <a href="${esc(url)}" target="_blank" rel="noopener">&#9654; Watch video</a>` : '';
    $('tView').innerHTML =
      `<div style="position:sticky;top:0;background:#F7F8F5;padding-bottom:8px;border-bottom:1px solid #E7E8EE;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px">` +
        `<div><b>${esc(t.title)}</b><br><span style="color:#6B7280;font-size:12px">${esc(t.course)} &rsaquo; ${esc(t.lesson)} &middot; ${t.chars || 0} chars${link}</span></div>` +
        `<button class="btn" id="tEdit" style="padding:3px 12px;font-size:12px;flex-shrink:0">Edit</button>` +
      `</div>` +
      `<div style="white-space:pre-wrap;line-height:1.5">${esc(t.text || '')}</div>`;
    $('tEdit').onclick = () => renderTranscriptEdit(t);
  }

  // Edit form: title, scope (with catalog datalists), and the transcript text — plus Delete.
  function renderTranscriptEdit(t) {
    const cat = state.catalog || [];
    const opts = (vals) => [...new Set(vals)].filter(Boolean).sort().map((v) => `<option value="${esc(v)}"></option>`).join('');
    // Sans font on the wrapper (tView is a monospace .aa-out panel); the textarea keeps
    // its own monospace rule. Captions are real <label for> so they focus their field.
    $('tView').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
        <div><label class="aa-field-label" for="teTitle" style="display:block">Title</label><input type="text" id="teTitle" style="width:100%"></div>
        <div class="aa-cols">
          <div><label class="aa-field-label" for="teTrack" style="display:block">Track</label><input type="text" id="teTrack" list="teTrackList" autocomplete="off" style="width:100%"><datalist id="teTrackList">${opts(cat.map((r) => r.track))}</datalist></div>
          <div><label class="aa-field-label" for="teCourse" style="display:block">Course</label><input type="text" id="teCourse" list="teCourseList" autocomplete="off" style="width:100%"><datalist id="teCourseList">${opts(cat.map((r) => r.course))}</datalist></div>
          <div><label class="aa-field-label" for="teLesson" style="display:block">Lesson</label><input type="text" id="teLesson" list="teLessonList" autocomplete="off" style="width:100%"><datalist id="teLessonList">${opts(cat.map((r) => r.lesson))}</datalist></div>
        </div>
        <div><label class="aa-field-label" for="teText" style="display:block">Transcript text</label><textarea id="teText" style="width:100%;min-height:300px"></textarea></div>
        <div class="aa-actions">
          <button class="btn btn-primary" id="teSave">Save changes</button>
          <button class="btn" id="teCancel">Cancel</button>
          <span id="teMsg" class="aa-note"></span>
          <button class="btn" id="teDelete" style="margin-left:auto;color:#B3261E">Delete</button>
        </div>
      </div>`;
    $('teTitle').value = t.title || '';
    $('teTrack').value = t.track || '';
    $('teCourse').value = t.course || '';
    $('teLesson').value = t.lesson || '';
    $('teText').value = t.text || '';
    $('teCancel').onclick = () => renderTranscriptRead(t);
    $('teSave').onclick = async () => {
      const body = {
        title: $('teTitle').value.trim(), track: $('teTrack').value.trim(),
        course: $('teCourse').value.trim(), lesson: $('teLesson').value.trim(), text: $('teText').value,
      };
      if (!body.text.trim()) { $('teMsg').innerHTML = '<span class="aa-err">Text cannot be empty.</span>'; return; }
      $('teSave').disabled = true; $('teMsg').textContent = 'Saving…';
      try {
        await api('/api/admin/transcripts/' + encodeURIComponent(t.id), { method: 'PUT', body });
        await loadTranscripts();
        const row = $('tList').querySelector(`button[data-id="${t.id}"]`);
        await openTranscript(t.id, row); // reopen with saved data, restoring the list highlight
      } catch (e) { $('teMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; $('teSave').disabled = false; }
    };
    $('teDelete').onclick = async () => {
      if (!window.confirm(`Delete transcript "${t.title || 'Untitled'}"? This can't be undone.`)) return;
      $('teDelete').disabled = true; $('teMsg').textContent = 'Deleting…';
      try {
        await api('/api/admin/transcripts/' + encodeURIComponent(t.id), { method: 'DELETE' });
        $('tView').textContent = 'Select a transcript on the left to read it.';
        await loadTranscripts();
      } catch (e) { $('teMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; $('teDelete').disabled = false; }
    };
  }

  function wireTranscripts() {
    if ($('tSearch')) $('tSearch').oninput = renderTranscriptList;
    loadWatcherClients();
    // "Use this video": hand the selection to the auto-file box above. The heavy
    // transcript text is only fetched server-side when Analyze runs, so nothing
    // large rides through the browser here.
    $('wImport').onclick = () => {
      const w = state.watcher;
      if (!w.video) return;
      $('iText').value = '';
      if (!$('iTitle').value) $('iTitle').value = w.title || '';
      state.ingest = { source: 'watcher', watcher: { client: w.client, channel: w.channel, video: w.video }, watcherTitle: w.title };
      $('wMsg').innerHTML = `<span class="aa-ok">Loaded “${esc(w.title || 'video')}”. Press “Analyze &amp; place with AI” below.</span>`;
      $('iMsg').textContent = 'Watcher video ready — press Analyze & place.';
      if ($('wDetails')) $('wDetails').open = false; // collapse the fold-out; the pick is now staged
      $('iPlan').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  }

  function pick(listEl, items, label, onPick) {
    listEl.innerHTML = items.length
      ? items.map((i) => `<button data-v="${esc(i.value)}">${esc(label(i))}</button>`).join('')
      : '<button disabled style="color:#9aa0ae">(none)</button>';
    listEl.querySelectorAll('button[data-v]').forEach((b) => {
      b.onclick = () => {
        listEl.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
        onPick(b.dataset.v);
      };
    });
  }

  async function loadWatcherClients() {
    try {
      const { clients } = await api('/api/admin/watcher/clients');
      pick($('wClients'), clients.map((c) => ({ value: c, name: c })), (i) => i.name, async (v) => {
        state.watcher = { client: v, channel: '', video: null };
        $('wImport').disabled = true;
        $('wVideos').innerHTML = '';
        const { channels } = await api('/api/admin/watcher/channels?client=' + encodeURIComponent(v));
        pick($('wChannels'), channels.map((c) => ({ value: c.id, ...c })), (i) => `${i.title} (${i.transcriptCount}/${i.videoCount})`, async (cid) => {
          state.watcher.channel = cid; state.watcher.video = null; $('wImport').disabled = true;
          $('wVideos').innerHTML = '<button disabled>Loading…</button>';
          const { videos } = await api(`/api/admin/watcher/videos?client=${encodeURIComponent(v)}&channel=${encodeURIComponent(cid)}`);
          const withText = videos.filter((x) => x.hasTranscript);
          pick($('wVideos'), withText.map((x) => ({ value: x.id, ...x })), (i) => `${i.title}  ·  ${i.chars} chars`, (vid) => {
            const chosen = withText.find((x) => x.id === vid);
            state.watcher.video = vid; state.watcher.title = chosen ? chosen.title : '';
            $('wImport').disabled = false;
          });
        });
      });
    } catch (e) {
      $('wClients').innerHTML = `<button disabled style="color:#B3261E">${esc(e.message)}</button>`;
    }
  }

  /* ------------------------- auto-file (AI placement) ---------------------- */
  const stripTiming = (text) => text
    .replace(/^WEBVTT.*$/gm, '')
    .replace(/^\d+$/gm, '')
    .replace(/^[\d:.,]+\s*-->\s*[\d:.,]+.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n').trim();

  const badge = (isNew) => isNew
    ? '<span class="aa-badge-new">new</span>'
    : '<span class="aa-badge-old">existing</span>';

  // Offer the Track/Course/Lesson that already exist, cascading by what's filled
  // in above. Typing anything not on the list still works — that's a new one.
  const fillList = (id, values) => {
    $(id).innerHTML = [...new Set(values)].filter(Boolean).sort()
      .map((v) => `<option value="${esc(v)}"></option>`).join('');
  };
  function populateIngestLists() {
    const cat = state.catalog || [];
    const track = $('iTrack').value.trim().toLowerCase();
    const course = $('iCourse').value.trim().toLowerCase();
    fillList('iTrackList', cat.map((r) => r.track));
    fillList('iCourseList', cat.filter((r) => !track || (r.track || '').toLowerCase() === track).map((r) => r.course));
    fillList('iLessonList', cat.filter((r) => (!track || (r.track || '').toLowerCase() === track) && (!course || (r.course || '').toLowerCase() === course)).map((r) => r.lesson));
  }
  // Recompute the new/existing badges as the admin edits the placement.
  function refreshIngestBadges() {
    const cat = state.catalog || [];
    const has = (field, val) => !!val && cat.some((r) => (r[field] || '').toLowerCase() === val.toLowerCase());
    const track = $('iTrack').value.trim(), course = $('iCourse').value.trim(), lesson = $('iLesson').value.trim();
    $('iTrackNew').innerHTML = badge(!has('track', track));
    $('iCourseNew').innerHTML = badge(!has('course', course));
    $('iLessonNew').innerHTML = badge(!has('lesson', lesson));
  }

  function renderIngestTopics() {
    const rows = (state.ingest && state.ingest.topicRows) || [];
    $('iTopics').innerHTML = rows.length
      ? rows.map((r, i) => `<label>
          <input type="checkbox" data-i="${i}" ${r.on ? 'checked' : ''} />
          <span>${esc(r.topic)}</span> ${badge(r.isNew)}
        </label>`).join('')
      : '<span class="aa-note" style="padding:6px 8px;display:block">No topics yet — add the ones this material should build questions for, or leave empty to just file the transcript.</span>';
    $('iTopics').querySelectorAll('input[data-i]').forEach((cb) => {
      cb.onchange = () => { if (state.ingest) state.ingest.topicRows[Number(cb.dataset.i)].on = cb.checked; };
    });
  }

  // Reset the "generate now" toggle so its state can't leak when the SAME review box
  // is reopened by the other path (AI ↔ manual).
  function resetGenerateToggle() {
    if ($('iGenerate')) $('iGenerate').checked = false;
    show($('iGenOpts'), false);
    $('iCommit').textContent = 'Attach to Academy';
  }

  // Snap a typed Track/Course/Lesson to the catalog's canonical casing when it matches
  // case-insensitively (scoped: course under its track, lesson under its course), so a
  // case/whitespace variant doesn't fork a row or file a transcript the exact-match
  // Generate tab won't surface.
  function canonicalScope(track, course, lesson) {
    const cat = state.catalog || [];
    const ci = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
    const t = (cat.find((r) => ci(track, r.track)) || {}).track || track;
    const c = (cat.find((r) => ci(t, r.track) && ci(course, r.course)) || {}).course || course;
    const l = (cat.find((r) => ci(t, r.track) && ci(c, r.course) && ci(lesson, r.lesson)) || {}).lesson || lesson;
    return { track: t, course: c, lesson: l };
  }

  // The topics label reads differently for AI vs manual placement (manual can file
  // with zero topics; AI always proposes some).
  function setIngestTopicsLabel(manual) {
    $('iTopicsLabel').innerHTML = manual
      ? 'Topics <span class="aa-note">(optional — add topics to build questions for, or leave empty to just file it)</span>'
      : 'Topics to build <span class="aa-note">(uncheck to skip; “new” = created)</span>';
  }

  // Manual placement: skip the AI router and open the SAME review box blank, for the
  // admin to assign Track/Course/Lesson themselves (datalists still offer existing
  // names) and add topics — or none, to just file the transcript.
  function openManualPlacement() {
    const text = $('iText').value.trim();
    if (!text) {
      $('iMsg').innerHTML = '<span class="aa-err">Paste a transcript (or load a file) to place it yourself. To pull a Watcher video’s transcript, use “Analyze &amp; place with AI”.</span>';
      return;
    }
    state.ingest = {
      program: state.program, text, title: $('iTitle').value.trim(),
      source: 'paste', watcherRef: null, manual: true, topicRows: [],
    };
    $('iTrack').value = ''; $('iCourse').value = ''; $('iLesson').value = '';
    $('iTrackNew').innerHTML = ''; $('iCourseNew').innerHTML = ''; $('iLessonNew').innerHTML = '';
    populateIngestLists();
    $('iSummary').innerHTML = `Manual placement · choose where this goes below. <span class="aa-note">· ${text.length} chars</span>`;
    setIngestTopicsLabel(true);
    show($('iPullTopics'), true);
    resetGenerateToggle();
    renderIngestTopics();
    $('iBar').style.width = '0%';
    $('iStatus').textContent = '';
    $('iCommitMsg').textContent = '';
    show($('iThink'), false); // no AI on the manual path — clear any prior thinking panel
    show($('iPlanBox'), true);
    $('iMsg').textContent = '';
    $('iTrack').focus();
  }

  // Convenience for manual placement: if the chosen Track/Course/Lesson matches an
  // existing lesson, offer its current topics (unchecked) so the admin can reinforce
  // them without retyping. Preserves any topics the admin already added by hand.
  function autoloadLessonTopics() {
    if (!state.ingest) return;
    const cat = state.catalog || [];
    const track = $('iTrack').value.trim(), course = $('iCourse').value.trim(), lesson = $('iLesson').value.trim();
    if (!track || !course || !lesson) { $('iCommitMsg').innerHTML = '<span class="aa-err">Fill in Track, Course and Lesson first.</span>'; return; }
    const existing = [...new Set(cat.filter((r) => (r.track || '') === track && (r.course || '') === course && (r.lesson || '') === lesson)
      .map((r) => r.topic).filter(Boolean))];
    if (!existing.length) { $('iCommitMsg').innerHTML = '<span class="aa-note">That lesson has no topics yet — add your own below.</span>'; return; }
    const userAdded = (state.ingest.topicRows || []).filter((t) => t.isNew);
    const names = new Set(existing.map((n) => n.toLowerCase()));
    const rows = existing.map((topic) => ({ topic, isNew: false, on: false }));
    for (const u of userAdded) if (!names.has(u.topic.toLowerCase())) rows.push(u);
    state.ingest.topicRows = rows;
    renderIngestTopics();
    $('iCommitMsg').textContent = '';
  }

  function renderPlan(data) {
    // Everything /commit needs, kept exactly as the AI proposed + the admin approves.
    state.ingest = {
      program: data.program, text: data.text, title: data.title,
      source: data.source, watcherRef: data.watcherRef, manual: false,
      topicRows: (data.topics || []).map((t) => ({ topic: t.topic, isNew: t.isNew, on: true })),
    };
    $('iTitle').value = data.title || '';
    const pl = data.placement || {};
    $('iTrack').value = pl.track || '';
    $('iCourse').value = pl.course || '';
    $('iLesson').value = pl.lesson || '';
    $('iTrackNew').innerHTML = badge(pl.trackIsNew);
    $('iCourseNew').innerHTML = badge(pl.courseIsNew);
    $('iLessonNew').innerHTML = badge(pl.lessonIsNew);
    populateIngestLists();
    $('iSummary').innerHTML = `<b>AI placement</b> · ${esc(data.summary || '')} <span class="aa-note">· ${data.chars} chars · source: ${esc(data.source)}</span>`;
    setIngestTopicsLabel(false);
    show($('iPullTopics'), false);
    resetGenerateToggle();
    renderIngestTopics();
    $('iBar').style.width = '0%';
    $('iStatus').textContent = '';
    $('iCommitMsg').textContent = '';
    show($('iPlanBox'), true);
  }

  function wireIngest() {
    $('iFile').onchange = async () => {
      const f = $('iFile').files[0];
      if (!f) return;
      $('iText').value = stripTiming(await f.text());
      $('iFileName').textContent = f.name;
      // Fresh file content supersedes any in-progress plan/manual placement: drop it
      // and close the review box so its (now stale) state can't be committed.
      state.ingest = null;
      show($('iPlanBox'), false);
      show($('iThink'), false);
      $('iMsg').textContent = '';
      if (!$('iTitle').value) $('iTitle').value = f.name.replace(/\.[^.]+$/, '');
    };
    // Typing/pasting into the box means "use this text", not the Watcher pick.
    $('iText').oninput = () => { if ($('iText').value.trim() && state.ingest && state.ingest.source === 'watcher') state.ingest = null; };

    // "Place it myself": skip the AI call, open the review box for manual assignment.
    $('iManual').onclick = openManualPlacement;
    $('iPullTopics').onclick = autoloadLessonTopics;

    $('iPlan').onclick = async () => {
      const text = $('iText').value.trim();
      const watcher = (!text && state.ingest && state.ingest.watcher) ? state.ingest.watcher : null;
      if (!text && !watcher) { $('iMsg').innerHTML = '<span class="aa-err">Paste a transcript, upload a file, or pull a Watcher video first.</span>'; return; }
      $('iPlan').disabled = true;
      $('iMsg').textContent = 'Reading the material and finding where it fits…';
      const panel = thinkPanel('iThink'); panel.start();
      try {
        const data = await streamSSE('/api/admin/ingest/plan/stream', {
          program: state.program, title: $('iTitle').value, ...(text ? { text } : { watcher }), ...engineBody(),
        }, { onThinking: panel.thinking, onContent: panel.content });
        panel.done('Placement ready');
        renderPlan(data);
        $('iMsg').innerHTML = '<span class="aa-ok">Here is the plan — review, then add it.</span>';
      } catch (e) {
        panel.fail('Analysis failed');
        $('iMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
      }
      $('iPlan').disabled = false;
    };

    $('iAddTopic').onclick = () => {
      const name = $('iNewTopic').value.trim();
      if (!name || !state.ingest) return;
      state.ingest.topicRows.push({ topic: name, isNew: true, on: true });
      $('iNewTopic').value = '';
      renderIngestTopics();
    };

    // Keep the datalists cascading and the new/existing badges honest while the
    // admin edits the placement by hand.
    $('iTrack').oninput = () => { populateIngestLists(); refreshIngestBadges(); };
    $('iCourse').oninput = () => { populateIngestLists(); refreshIngestBadges(); };
    $('iLesson').oninput = refreshIngestBadges;

    // Generation is opt-in: reveal the per-topic count only when asked, and relabel
    // the button so it's clear whether we're just filing it or also building questions.
    if ($('iGenerate')) $('iGenerate').onchange = () => {
      const on = $('iGenerate').checked;
      show($('iGenOpts'), on);
      $('iCommit').textContent = on ? 'Attach & generate' : 'Attach to Academy';
    };

    $('iCommit').onclick = async () => {
      if (!state.ingest) return;
      let track = $('iTrack').value.trim(), course = $('iCourse').value.trim(), lesson = $('iLesson').value.trim();
      if (!track || !course || !lesson) { $('iCommitMsg').innerHTML = '<span class="aa-err">Fill in Track, Course and Lesson.</span>'; return; }
      ({ track, course, lesson } = canonicalScope(track, course, lesson));
      const topics = state.ingest.topicRows.filter((r) => r.on).map((r) => r.topic);
      const generate = !!($('iGenerate') && $('iGenerate').checked);
      // Topics are only required when generating — otherwise this just files the transcript.
      if (generate && !topics.length) { $('iCommitMsg').innerHTML = '<span class="aa-err">Pick at least one topic to build questions for.</span>'; return; }
      // A brand-new lesson needs at least one topic, or it gets no catalog row and the
      // transcript is orphaned (invisible to the curriculum tree + Generate tab).
      const lessonExists = (state.catalog || []).some((r) => (r.track || '') === track && (r.course || '') === course && (r.lesson || '') === lesson);
      if (!topics.length && !lessonExists) {
        $('iCommitMsg').innerHTML = '<span class="aa-err">A new lesson needs at least one topic so it shows in the curriculum. Add a topic above, or file this to an existing lesson.</span>';
        return;
      }
      $('iCommit').disabled = true;
      state.stopIngest = false;
      $('iCommitMsg').textContent = generate ? 'Filing the material, then generating…' : 'Filing the transcript and curriculum…';
      // Watcher picks carry server-fetched text (the box is empty); paste/manual use the
      // live textarea so any edits made after opening the review box are honoured.
      const text = state.ingest.source === 'watcher' ? state.ingest.text : ($('iText').value.trim() || state.ingest.text);
      try {
        const { job, generated } = await api('/api/admin/ingest/commit', {
          method: 'POST',
          body: {
            program: state.ingest.program || state.program,
            track, course, lesson,
            topics, text, title: $('iTitle').value,
            source: state.ingest.source, watcherRef: state.ingest.watcherRef,
            generate,
            targetPerTopic: Number($('iCount').value) || 6,
            ...engineBody(),
          },
        });
        if (generated && job) {
          $('iCommitMsg').innerHTML = '<span class="aa-ok">Attached. Generating questions…</span>';
          await runSteps(job.id, { bar: 'iBar', status: 'iStatus' }, 'stopIngest');
          $('iCommitMsg').innerHTML = '<span class="aa-ok">Done — transcript filed and questions added.</span>';
        } else {
          $('iCommitMsg').innerHTML = topics.length
            ? '<span class="aa-ok">Attached — transcript and curriculum saved (no questions generated).</span>'
            : '<span class="aa-ok">Attached — transcript filed to that lesson.</span>';
        }
        show($('iPlanBox'), false);
        show($('iThink'), false);
        $('iText').value = ''; $('iTitle').value = ''; $('iFileName').textContent = ''; state.ingest = null;
        resetGenerateToggle();
        await loadCatalog();
        await loadTranscripts();
      } catch (e) {
        $('iCommitMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
      }
      $('iCommit').disabled = false;
    };
  }

  /* ----------------------- learn a goal (AI module) ------------------------ */
  // Recompute the new/existing badges on the plan's track/course as the admin edits.
  function refreshGoalBadges() {
    const cat = state.catalog || [];
    const has = (field, val) => !!val && cat.some((r) => (r[field] || '').toLowerCase() === val.toLowerCase());
    $('gpTrackNew').innerHTML = badge(!has('track', $('gpTrack').value.trim()));
    $('gpCourseNew').innerHTML = badge(!has('course', $('gpCourse').value.trim()));
  }
  function populateGoalLists() {
    const cat = state.catalog || [];
    const track = $('gpTrack').value.trim().toLowerCase();
    fillList('gpTrackList', cat.map((r) => r.track));
    fillList('gpCourseList', cat.filter((r) => !track || (r.track || '').toLowerCase() === track).map((r) => r.course));
  }

  function renderGoalLessons() {
    const lessons = (state.goal && state.goal.lessons) || [];
    $('gpLessons').innerHTML = lessons.length
      ? lessons.map((l, li) => `
        <div style="margin:0 0 10px;padding:8px 10px;border:1px solid #E7E8EE;border-radius:8px">
          <div style="font-weight:700;margin-bottom:2px">${esc(l.lesson)} ${badge(l.isNew)}</div>
          ${l.rationale ? `<div class="aa-note" style="margin-bottom:6px">${esc(l.rationale)}</div>` : ''}
          ${l.topics.map((t, ti) => `<label style="display:flex;gap:8px;align-items:center;padding:3px 0">
            <input type="checkbox" data-li="${li}" data-ti="${ti}" ${t.on ? 'checked' : ''} />
            <span>${esc(t.topic)}</span> ${badge(t.isNew)}
          </label>`).join('')}
        </div>`).join('')
      : '<span class="aa-note">No lessons — try drafting again.</span>';
    $('gpLessons').querySelectorAll('input[data-li]').forEach((cb) => {
      cb.onchange = () => { state.goal.lessons[Number(cb.dataset.li)].topics[Number(cb.dataset.ti)].on = cb.checked; };
    });
  }

  function renderGoalPlan(data) {
    state.goal = {
      program: data.program, goal: $('gpGoal').value.trim(), reference: data.reference || '',
      assumedKnowledge: data.assumedKnowledge || [],
      lessons: (data.lessons || []).map((l) => ({
        lesson: l.lesson, rationale: l.rationale, isNew: l.lessonIsNew,
        topics: (l.topics || []).map((t) => ({ topic: t.topic, isNew: t.isNew, on: true })),
      })),
    };
    $('gpTrack').value = data.track || '';
    $('gpCourse').value = data.course || '';
    $('gpTrackNew').innerHTML = badge(data.trackIsNew);
    $('gpCourseNew').innerHTML = badge(data.courseIsNew);
    populateGoalLists();
    const assumed = data.assumedKnowledge || [];
    show($('gpAssumedWrap'), assumed.length > 0);
    $('gpAssumed').innerHTML = assumed
      .map((a) => `<span class="aa-note" style="background:#EEF0F6;border-radius:12px;padding:2px 10px">${esc(a)}</span>`).join('');
    const topicCount = state.goal.lessons.reduce((n, l) => n + l.topics.length, 0);
    $('gpSummary').innerHTML = `${esc(data.summary || '')} <span class="aa-note">· ${state.goal.lessons.length} lessons · ${topicCount} topics</span>`;
    renderGoalLessons();
    $('gpBar').style.width = '0%';
    $('gpStatus').textContent = '';
    $('gpCommitMsg').textContent = '';
    show($('gpPlanBox'), true);
  }

  function wireGoalPlan() {
    $('gpTrack').oninput = () => { populateGoalLists(); refreshGoalBadges(); };
    $('gpCourse').oninput = refreshGoalBadges;
    $('gpStop').onclick = () => { state.stopGoal = true; $('gpStatus').textContent = 'Stopping after this topic…'; };

    $('gpDraft').onclick = async () => {
      const goal = $('gpGoal').value.trim();
      if (!goal) { $('gpMsg').innerHTML = '<span class="aa-err">Describe what you want to learn first.</span>'; return; }
      $('gpDraft').disabled = true;
      $('gpMsg').textContent = 'Reading your progress and drafting a plan…';
      const panel = thinkPanel('gpThink'); panel.start();
      try {
        const data = await streamSSE('/api/admin/goal/plan/stream', {
          program: state.program, goal, reference: $('gpRef').value.trim(), ...engineBody(),
        }, { onThinking: panel.thinking, onContent: panel.content });
        panel.done('Plan ready');
        renderGoalPlan(data);
        $('gpMsg').innerHTML = '<span class="aa-ok">Here is your plan — review, then add it.</span>';
      } catch (e) {
        panel.fail('Draft failed');
        $('gpMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
      }
      $('gpDraft').disabled = false;
    };

    $('gpCommit').onclick = async () => {
      if (!state.goal) return;
      const lessons = state.goal.lessons
        .map((l) => ({ lesson: l.lesson, topics: l.topics.filter((t) => t.on).map((t) => t.topic) }))
        .filter((l) => l.topics.length);
      if (!lessons.length) { $('gpCommitMsg').innerHTML = '<span class="aa-err">Pick at least one topic.</span>'; return; }
      const buildCards = $('gpCards').checked;
      $('gpCommit').disabled = true; state.stopGoal = false; show($('gpStop'), true);
      $('gpCommitMsg').textContent = 'Writing lessons and generating…';
      try {
        const res = await api('/api/admin/goal/commit', {
          method: 'POST',
          body: {
            program: state.goal.program || state.program,
            track: $('gpTrack').value.trim(), course: $('gpCourse').value.trim(),
            goal: state.goal.goal, reference: state.goal.reference,
            assumedKnowledge: state.goal.assumedKnowledge,
            lessons, buildCards,
            ...engineBody(),
            targetPerTopic: Number($('gpCount').value) || 6,
          },
        });
        if (res.job) {
          $('gpCommitMsg').innerHTML = '<span class="aa-ok">Module created. Generating questions…</span>';
          await runSteps(res.job.id, { bar: 'gpBar', status: 'gpStatus' }, 'stopGoal');
        }
        if (buildCards && !state.stopGoal && res.lessons) await buildGoalCards(res.lessons);
        $('gpCommitMsg').innerHTML = state.stopGoal
          ? '<span class="aa-ok">Stopped — what generated so far is saved. Press Add to Academy to resume.</span>'
          : '<span class="aa-ok">Done — module added with lessons, questions and flashcards.</span>';
        if (!state.stopGoal) {
          show($('gpPlanBox'), false);
          show($('gpThink'), false);
          $('gpGoal').value = ''; $('gpRef').value = ''; state.goal = null;
        }
        await loadCatalog();
        await loadTranscripts();
      } catch (e) {
        $('gpCommitMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
      }
      $('gpCommit').disabled = false; show($('gpStop'), false);
    };
  }

  // Build one flashcard deck per lesson of a freshly-committed module. Best-effort:
  // a deck that fails doesn't abort the rest (the module + questions already exist).
  async function buildGoalCards(lessons) {
    const assume = (state.goal && state.goal.assumedKnowledge) || [];
    const instructions = assume.length ? `The learner already knows: ${assume.join(', ')}. Teach only the delta.` : '';
    let done = 0;
    for (const l of lessons) {
      if (state.stopGoal) return;
      $('gpStatus').textContent = `Building flashcards… (${done}/${lessons.length} lessons)`;
      try {
        await api('/api/flashcards/generate', {
          method: 'POST',
          body: { program: state.program, track: l.track, course: l.course, lesson: l.lesson, level: 'lesson', instructions },
        });
      } catch (e) { /* keep going; cards are a bonus layer over the questions */ }
      done += 1;
    }
    $('gpStatus').textContent = `Flashcards built for ${done} lesson${done === 1 ? '' : 's'}.`;
  }

  /* ---------------------------- bulk-build lessons ------------------------- */
  function wireBulk() {
    $('blStop').onclick = () => { state.stopBulk = true; $('blStatus').textContent = 'Stopping after this topic…'; };

    $('blPreview').onclick = async () => {
      const text = $('blText').value.trim();
      if (!text) { $('blMsg').innerHTML = '<span class="aa-err">Paste an outline first.</span>'; return; }
      $('blPreview').disabled = true; $('blMsg').textContent = 'Parsing…';
      try {
        const data = await api('/api/admin/lessons/bulk-commit', {
          method: 'POST',
          body: { program: state.program, text, preview: true },
        });
        state.bulk = data.lessons || [];
        renderBulkPreview(data);
      } catch (e) {
        $('blMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
      }
      $('blPreview').disabled = false;
    };

    $('blCommit').onclick = async () => {
      if (!state.bulk || !state.bulk.length) return;
      const buildCards = $('blCards').checked;
      $('blCommit').disabled = true; state.stopBulk = false; show($('blStop'), true);
      $('blMsg').textContent = 'Writing lessons and generating…';
      try {
        const res = await api('/api/admin/lessons/bulk-commit', {
          method: 'POST',
          body: {
            program: state.program,
            lessons: state.bulk,
            buildCards,
            ...engineBody(),
            targetPerTopic: Number($('blCount').value) || 6,
          },
        });
        if (res.job) {
          $('blMsg').innerHTML = '<span class="aa-ok">Lessons created. Generating questions…</span>';
          await runSteps(res.job.id, { bar: 'blBar', status: 'blStatus' }, 'stopBulk');
        }
        if (buildCards && !state.stopBulk && res.lessons) await buildBulkCards(res.lessons);
        $('blMsg').innerHTML = state.stopBulk
          ? '<span class="aa-ok">Stopped — what generated so far is saved. Press Build all to resume.</span>'
          : '<span class="aa-ok">Done — lessons added with questions and flashcards.</span>';
        if (!state.stopBulk) {
          $('blText').value = ''; state.bulk = null;
          show($('blPreviewBox'), false); show($('blCommit'), false);
        }
        await loadCatalog();
        await loadTranscripts();
      } catch (e) {
        $('blMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
      }
      $('blCommit').disabled = false; show($('blStop'), false);
    };
  }

  // "Build with AI" has two modes — from a goal, or from a pasted outline — behind
  // a segmented control. They share the card, the rail engine/thinking, and (for the
  // goal path) the streaming thinking panel.
  function wireBuildModes() {
    const set = (mode) => {
      const goal = mode === 'goal';
      $('bmGoal').setAttribute('aria-selected', String(goal));
      $('bmOutline').setAttribute('aria-selected', String(!goal));
      show($('bmGoalPane'), goal);
      show($('bmOutlinePane'), !goal);
    };
    $('bmGoal').onclick = () => set('goal');
    $('bmOutline').onclick = () => set('outline');
    set('goal');
  }

  function renderBulkPreview(data) {
    const lessons = data.lessons || [];
    const box = $('blPreviewBox');
    if (!lessons.length) {
      box.innerHTML = '<span class="aa-err">No valid lessons found. Use "Track &gt; Course &gt; Lesson &gt; Topic" per line.</span>';
      show(box, true); show($('blCommit'), false);
      $('blMsg').textContent = '';
      return;
    }
    box.innerHTML = `<div class="aa-note" style="margin-bottom:8px">${data.count} lesson${data.count === 1 ? '' : 's'} · ${data.topicCount} topic${data.topicCount === 1 ? '' : 's'} will be built:</div>`
      + lessons.map((l) => `<div style="margin-bottom:6px">
          <b>${esc(l.track)} › ${esc(l.course)} › ${esc(l.lesson)}</b>
          <div class="aa-note">${l.topics.map((t) => esc(t)).join(' · ')}</div>
        </div>`).join('');
    show(box, true);
    show($('blCommit'), true);
    $('blMsg').innerHTML = '<span class="aa-ok">Looks good? Press Build all.</span>';
  }

  // One flashcard deck per freshly-built lesson. Best-effort: a deck that fails
  // doesn't abort the rest (the lessons + questions already exist).
  async function buildBulkCards(lessons) {
    let done = 0;
    for (const l of lessons) {
      if (state.stopBulk) return;
      $('blStatus').textContent = `Building flashcards… (${done}/${lessons.length} lessons)`;
      try {
        await api('/api/flashcards/generate', {
          method: 'POST',
          body: { program: state.program, track: l.track, course: l.course, lesson: l.lesson, level: 'lesson' },
        });
      } catch (e) { /* keep going; cards are a bonus layer over the questions */ }
      done += 1;
    }
    $('blStatus').textContent = `Flashcards built for ${done} lesson${done === 1 ? '' : 's'}.`;
  }

  /* --------------------------- AI engine + thinking ------------------------ */
  // The engine dropdown + thinking switch live in the run-sheet RAIL and govern
  // EVERYTHING built in this room. They write the same aiProvider/aiModel/aiThinking
  // cookies the learner home page uses, so cookie-reading builds (flashcards,
  // lessons, reviews via aiChoice) follow them; the composer boxes also send
  // {provider, model, thinking} explicitly in their request bodies via engineBody().
  function parseEngine(v) {
    const s = v || 'gemini|';
    const i = s.indexOf('|');
    return { provider: (i >= 0 ? s.slice(0, i) : s) || 'gemini', model: i >= 0 ? s.slice(i + 1) : '' };
  }
  const thinkingOn = () => !!($('aeThinking') && $('aeThinking').checked);
  function applyEngine() {
    const { provider, model } = parseEngine($('aeEngine').value);
    document.cookie = `aiProvider=${encodeURIComponent(provider)}; path=/; max-age=31536000; samesite=lax`;
    document.cookie = `aiModel=${encodeURIComponent(model || '')}; path=/; max-age=31536000; samesite=lax`;
    try { localStorage.setItem('aiProvider', provider); localStorage.setItem('aiModel', model || ''); } catch { /* ignore */ }
  }
  function applyThinking() {
    const on = thinkingOn();
    document.cookie = `aiThinking=${on ? 'on' : 'off'}; path=/; max-age=31536000; samesite=lax`;
    try { localStorage.setItem('aiThinking', on ? 'on' : 'off'); } catch { /* ignore */ }
  }
  const engineChoice = () => parseEngine($('aeEngine').value);
  // The body fields every AI composer request sends, so the server uses the engine
  // and thinking mode the admin picked in the rail.
  const engineBody = () => {
    const { provider, model } = engineChoice();
    return { provider, ...(model ? { model } : {}), thinking: thinkingOn() };
  };

  // Restore + wire the thinking switch (default ON unless a saved pref says off).
  function wireThinking() {
    const cb = $('aeThinking');
    if (!cb) return;
    let saved; try { saved = localStorage.getItem('aiThinking'); } catch { saved = null; }
    cb.checked = saved !== 'off';
    applyThinking();
    cb.onchange = applyThinking;
  }

  async function loadEngines() {
    const sel = $('aeEngine');
    if (!sel) { wireThinking(); return; }
    let data;
    try { data = await api('/api/models'); } catch { sel.innerHTML = '<option value="gemini|">Cloud (Gemini)</option>'; applyEngine(); wireThinking(); return; }
    const opts = [];
    for (const p of data.providers || []) {
      for (const m of p.models || []) opts.push(`<option value="${esc(p.id)}|${esc(m)}">${esc(p.label)} · ${esc(m)}</option>`);
    }
    sel.innerHTML = opts.join('') || '<option value="gemini|">Cloud (Gemini)</option>';
    // Restore the saved engine if it's still on offer.
    let savedP, savedM;
    try { savedP = localStorage.getItem('aiProvider'); savedM = localStorage.getItem('aiModel') || ''; } catch { savedP = null; }
    const want = `${savedP || 'gemini'}|${savedM}`;
    const byExact = [...sel.options].find((o) => o.value === want);
    const byProvider = [...sel.options].find((o) => o.value.split('|')[0] === (savedP || 'gemini'));
    if (byExact) sel.value = byExact.value;
    else if (byProvider) sel.value = byProvider.value;
    applyEngine(); // keep the cookie in sync with whatever ends up shown
    sel.onchange = applyEngine;
    wireThinking();
  }

  function wireGenerate() {
    $('gCourse').onchange = populateGenLessons;
    $('gLesson').onchange = populateGenTopics;
    $('gDoQuestions').onchange = () => show($('gQOpts'), $('gDoQuestions').checked);
    const toggleGuideOpts = () => show($('gGuideOpts'), $('gDoLessons').checked || $('gDoReviews').checked);
    $('gDoLessons').onchange = toggleGuideOpts;
    $('gDoReviews').onchange = toggleGuideOpts;
    $('gStart').onclick = startJob;
    $('gStop').onclick = () => { state.stop = true; $('gStatus').textContent = 'Stopping after this topic…'; };
  }

  async function startJob() {
    const course = $('gCourse').value;
    if (!course) { $('gStatus').innerHTML = '<span class="aa-err">Pick a course.</span>'; return; }
    const lesson = $('gLesson').value || '';
    const topic = $('gTopic').value || '';
    const doQ = $('gDoQuestions').checked, doC = $('gDoCards').checked;
    const doL = $('gDoLessons').checked, doR = $('gDoReviews').checked;
    if (!doQ && !doC && !doL && !doR) { $('gStatus').innerHTML = '<span class="aa-err">Pick something to build.</span>'; return; }
    if ((doL || doR) && !$('gGrainTopic').checked && !$('gGrainLesson').checked) {
      $('gStatus').innerHTML = '<span class="aa-err">For Lessons/Reviews, pick at least one grain (sub-lesson or lesson).</span>'; return;
    }
    const track = trackOf(course);
    const eng = engineChoice();
    const transcriptIds = [...$('gSources').querySelectorAll('input[data-tid]:checked')].map((c) => c.dataset.tid);

    $('gStart').disabled = true; state.stop = false; $('gStatus').textContent = 'Starting…';
    try {
      if (doC) {
        // Flashcards: one deck for the chosen scope (course/lesson/topic level).
        $('gStatus').textContent = 'Building flashcards…';
        const level = topic ? 'topic' : lesson ? 'lesson' : 'course';
        const r = await api('/api/flashcards/generate', {
          method: 'POST',
          body: { program: state.program, track, course, lesson, topic, level, instructions: ($('gInstr') && $('gInstr').value) || '' },
        });
        $('gStatus').innerHTML = `<span class="aa-ok">${(r.cards || []).length} flashcards built.</span>`;
      }
      if (doQ) {
        show($('gStop'), true);
        $('gStatus').textContent = 'Queueing questions…';
        const { job } = await api('/api/admin/genjobs', {
          method: 'POST',
          body: {
            program: state.program, track, course, ...(lesson ? { lesson } : {}), ...(topic ? { topic } : {}),
            targetPerTopic: Number($('gCount').value) || 5,
            provider: eng.provider,
            ...(eng.model ? { model: eng.model } : {}),
            thinking: thinkingOn(),
            instructions: ($('gInstr') && $('gInstr').value) || '',
            transcriptIds,
          },
        });
        state.job = job;
        await runSteps(job.id);
        await loadJobs();
        show($('gStop'), false);
      }
      if (doL || doR) {
        // Pre-build (cache) Lesson/Review study guides for the scope, in parallel.
        const kindsLabel = [doL && 'Lessons', doR && 'Reviews'].filter(Boolean).join(' & ');
        $('gStatus').textContent = `Pre-building ${kindsLabel} in parallel…`;
        const r = await api('/api/admin/study-guides/build', {
          method: 'POST',
          body: {
            program: state.program, track, course, ...(lesson ? { lesson } : {}), ...(topic ? { topic } : {}),
            doLesson: doL, doReview: doR,
            grains: { topic: $('gGrainTopic').checked, lesson: $('gGrainLesson').checked },
            force: $('gForceGuides').checked,
          },
        });
        const parts = [];
        if (r.built) parts.push(`${r.built} built`);
        if (r.skipped) parts.push(`${r.skipped} already cached`);
        if (r.failed) parts.push(`${r.failed} failed`);
        $('gStatus').innerHTML = `<span class="aa-ok">${esc(kindsLabel)}: ${parts.join(', ') || 'nothing to do'} `
          + `<span class="aa-note">(${r.targets} section${r.targets === 1 ? '' : 's'}, ${r.concurrency}-way parallel)</span></span>`;
      }
      await loadCatalog();
    } catch (e) {
      $('gStatus').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
    }
    $('gStart').disabled = false; show($('gStop'), false);
  }

  /* Drive the stepper. One topic per request — see lib/genjobs.js for why the
     work isn't a server-side loop. `els` lets the auto-file flow reuse this with
     its own bar/status; `stopKey` names the state flag that pauses it. */
  async function runSteps(id, els = { bar: 'gBar', status: 'gStatus', out: 'gOut' }, stopKey = 'stop') {
    for (;;) {
      if (state[stopKey]) { $(els.status).textContent = 'Stopped. Press Start to resume where it left off.'; return; }
      const { job } = await api(`/api/admin/genjobs/${id}/step`, { method: 'POST' });
      const p = job.progress || {};
      const pct = p.topicsTotal ? Math.round((p.topicsDone / p.topicsTotal) * 100) : 0;
      $(els.bar).style.width = pct + '%';
      $(els.status).textContent =
        `${job.status} — ${p.topicsDone}/${p.topicsTotal} topics · ${p.questionsWritten} questions · $${(p.costUsd || 0).toFixed(4)}`;
      if (els.out && job.errors && job.errors.length) {
        show($(els.out), true);
        $(els.out).textContent = job.errors.map((e) => `${e.topic}: ${e.error}`).join('\n');
      }
      if (job.status === 'done' || job.status === 'cancelled' || !job.remaining) return;
    }
  }

  async function loadJobs() {
    try {
      const { jobs } = await api('/api/admin/genjobs?' + q());
      if (!jobs.length) { $('gJobs').textContent = 'No runs yet.'; return; }
      $('gJobs').innerHTML = jobs.map((j) => {
        const p = j.progress || {};
        return `<div style="padding:6px 0;border-bottom:1px solid #E7E8EE">
          <b>${esc(j.batchTag)}</b> — ${esc(j.status)} · ${p.questionsWritten || 0} questions · $${(p.costUsd || 0).toFixed(4)}
          <button class="btn" data-batch="${esc(j.batchTag)}" style="padding:3px 9px;font-size:12px;margin-left:8px">Delete batch</button>
        </div>`;
      }).join('');
      $('gJobs').querySelectorAll('button[data-batch]').forEach((b) => {
        b.onclick = async () => {
          if (!confirm(`Delete every question from ${b.dataset.batch}? This also corrects the topic counts.`)) return;
          b.disabled = true;
          try {
            const r = await api('/api/admin/questions/delete-batch', { method: 'POST', body: { batchTag: b.dataset.batch } });
            b.outerHTML = `<span class="aa-ok">deleted ${r.deleted}</span>`;
            await loadCatalog();
          } catch (e) { alert(e.message); b.disabled = false; }
        };
      });
    } catch (e) { $('gJobs').textContent = 'Error: ' + e.message; }
  }

  /* --------------------------------- flags --------------------------------- */
  async function loadFlags() {
    try {
      const { flags } = await api('/api/admin/flags');
      const rf = $('railFlags'); if (rf) rf.textContent = flags.length ? String(flags.length) : ''; // mirror flag count into the rail
      if (!flags.length) { $('fList').textContent = 'Nothing flagged.'; return; }
      $('fList').innerHTML = flags.map((f) => `
        <div style="padding:8px 0;border-bottom:1px solid #E7E8EE">
          <div style="font-size:13px"><b>${esc(f.topic || 'Unknown topic')}</b> — flagged by ${esc(f.email || 'someone')}</div>
          <div class="aa-note">${esc(f.reason || '(no reason given)')}</div>
          <div class="aa-row" style="margin:6px 0 0">
            <button class="btn" data-id="${esc(f.id)}" data-del="0" style="padding:3px 9px;font-size:12px">Keep &amp; resolve</button>
            <button class="btn" data-id="${esc(f.id)}" data-del="1" style="padding:3px 9px;font-size:12px">Delete question</button>
          </div>
        </div>`).join('');
      $('fList').querySelectorAll('button[data-id]').forEach((b) => {
        b.onclick = async () => {
          b.disabled = true;
          try {
            await api(`/api/admin/flags/${b.dataset.id}/resolve`, { method: 'POST', body: { deleteQuestion: b.dataset.del === '1' } });
            await loadFlags();
          } catch (e) { alert(e.message); b.disabled = false; }
        };
      });
    } catch (e) { $('fList').textContent = 'Error: ' + e.message; }
  }

  /* --------------------------------- people -------------------------------- */
  function wirePeople() {
    const csv = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

    // Program dropdown: the programs that exist (data_science, digital_marketing, …).
    api('/api/programs').then(({ programs }) => {
      $('ePrograms').innerHTML = (programs || [])
        .map((p) => `<option value="${esc(p.id)}">${esc(p.name || p.id)}</option>`).join('');
      $('ePrograms').value = 'digital_marketing'; // the common case
    }).catch(() => {});

    // Person dropdown: the Sentinel directory. Falls back to a free-text email input
    // (same id) if the list can't be fetched, so enrolment always works.
    api('/api/admin/people').then(({ people, error }) => {
      const sel = $('eEmail');
      if (people && people.length) {
        sel.innerHTML = '<option value="">— select a person —</option>'
          + people.map((p) => `<option value="${esc(p.email)}">${esc(p.name)} (${esc(p.email)})</option>`).join('');
      } else {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.id = 'eEmail'; inp.placeholder = 'person@agora.ph'; inp.style.minWidth = '280px';
        sel.replaceWith(inp);
        if (error) $('eMsg').innerHTML = `<span class="aa-note">Directory unavailable (${esc(error)}) — type an email.</span>`;
      }
    }).catch(() => {});

    $('eLoad').onclick = async () => {
      const email = $('eEmail').value.trim();
      if (!email) { $('eMsg').textContent = 'Pick a person first.'; return; }
      $('eMsg').textContent = 'Loading…';
      try {
        const r = await api('/api/admin/enrollment?email=' + encodeURIComponent(email));
        if ((r.programs || []).length) $('ePrograms').value = r.programs[0];
        $('eCourses').value = (r.courses || []).join(', ');
        $('eMsg').innerHTML = `<span class="aa-ok">Current: ${esc((r.programs || []).join(', ') || 'default')}${(r.courses || []).length ? ' · ' + esc(r.courses.join(', ')) : ''}</span>`;
      } catch (e) { $('eMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
    };
    $('eSave').onclick = async () => {
      const email = $('eEmail').value.trim();
      if (!email) { $('eMsg').textContent = 'Pick a person first.'; return; }
      $('eMsg').textContent = 'Saving…';
      try {
        const r = await api('/api/admin/enrollment', {
          method: 'POST',
          body: { email, programs: [$('ePrograms').value].filter(Boolean), courses: csv($('eCourses').value) },
        });
        $('eMsg').innerHTML = `<span class="aa-ok">Saved ${esc(email)}: ${esc((r.programs || []).join(', '))}${r.courses.length ? ' · ' + esc(r.courses.join(', ')) : ' · all courses'}</span>`;
        loadAssignments(); // reflect the change in the table below
      } catch (e) { $('eMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
    };

    $('aRefresh').onclick = loadAssignments;
    if ($('aSearch')) $('aSearch').oninput = renderAssignments;

    // Unenroll: the × on a program chip removes that program from the student.
    $('aList').addEventListener('click', async (e) => {
      const x = e.target.closest('.aa-chip-x');
      if (!x) return;
      const { email, program, name } = x.dataset;
      if (!confirm(`Unenroll ${email} from "${name || program}"?`)) return;
      x.disabled = true;
      try {
        await api('/api/admin/enrollment/remove', { method: 'POST', body: { email, program } });
        await loadAssignments();
      } catch (err) { alert(err.message); x.disabled = false; }
    });
  }

  // The "who's assigned to what" table: every directory person + their program/courses.
  async function loadAssignments() {
    $('aList').textContent = 'Loading…';
    try {
      const { assignments, error } = await api('/api/admin/assignments');
      state.assignments = assignments || [];
      if (error && !state.assignments.length) {
        $('aList').innerHTML = `<span class="aa-note">Directory unavailable (${esc(error)}) — assignments still apply, they just can't be listed here.</span>`;
        return;
      }
      renderAssignments();
    } catch (e) { $('aList').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
  }

  function renderAssignments() {
    const term = (($('aSearch') && $('aSearch').value) || '').toLowerCase();
    const rows = (state.assignments || []).filter((a) => !term
      || `${a.name} ${a.email} ${a.programs.map((p) => p.name).join(' ')} ${a.courses.join(' ')}`.toLowerCase().includes(term));
    if (!rows.length) { $('aList').innerHTML = '<span class="aa-note">No one to show.</span>'; return; }
    $('aList').innerHTML = `<div style="overflow-x:auto"><table class="aa-table">`
      + `<thead><tr><th>Person</th><th>Program</th><th>Courses</th></tr></thead><tbody>`
      + rows.map((a) => `<tr>
          <td><b>${esc(a.name)}</b><br><span class="aa-note" style="font-size:12px">${esc(a.email)}</span></td>
          <td>${a.programs.length
            ? a.programs.map((p) => `<span class="aa-chip">${esc(p.name)}<button type="button" class="aa-chip-x" data-email="${esc(a.email)}" data-program="${esc(p.id)}" data-name="${esc(p.name)}" title="Unenroll from ${esc(p.name)}" aria-label="Unenroll ${esc(a.name)} from ${esc(p.name)}">×</button></span>`).join('')
            : '<span class="aa-note">—</span>'}</td>
          <td>${a.courses.length ? a.courses.map((c) => `<span class="aa-chip">${esc(c)}</span>`).join('') : '<span class="aa-chip-all">All courses</span>'}</td>
        </tr>`).join('')
      + `</tbody></table></div>`;
  }

  /* ------------------------------ add a program ---------------------------- */
  function wireAddProgram() {
    const slug = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    $('progNew').onclick = () => {
      const opening = $('progNewBox').classList.contains('hidden');
      show($('progNewBox'), opening);
      $('progNew').setAttribute('aria-expanded', String(opening));
      if (opening) $('progName').focus();
    };
    $('progCancel').onclick = () => {
      show($('progNewBox'), false);
      $('progNew').setAttribute('aria-expanded', 'false');
      $('progName').value = ''; $('progId').value = ''; $('progMsg').textContent = '';
      delete $('progId').dataset.touched;
      $('progNew').focus(); // return focus to the trigger, not lost to <body>
    };
    // Auto-derive the ID from the name until the admin edits the ID themselves. Don't
    // re-slug the ID field on each keystroke (that strips a just-typed trailing "_"); the
    // final value is slugged on create.
    $('progName').oninput = () => { if (!$('progId').dataset.touched) $('progId').value = slug($('progName').value); };
    $('progId').oninput = () => { $('progId').dataset.touched = '1'; };
    $('progCreate').onclick = async () => {
      const name = $('progName').value.trim();
      const id = slug($('progId').value || name);
      if (!name) { $('progMsg').innerHTML = '<span class="aa-err">Give it a name.</span>'; return; }
      if (!id) { $('progMsg').innerHTML = '<span class="aa-err">Need a valid ID (letters, numbers, underscores).</span>'; return; }
      if ([...$('program').options].some((o) => o.value === id)) {
        $('progMsg').innerHTML = '<span class="aa-err">A program with that ID already exists — pick another.</span>'; return;
      }
      $('progCreate').disabled = true; $('progMsg').textContent = 'Creating…';
      try {
        await api('/api/admin/programs', { method: 'POST', body: { id, name } });
        $('progMsg').innerHTML = '<span class="aa-ok">Created — switching…</span>';
        location.search = '?program=' + encodeURIComponent(id); // reload into the new program
      } catch (e) { $('progMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; $('progCreate').disabled = false; }
    };
  }

  boot();
})();
