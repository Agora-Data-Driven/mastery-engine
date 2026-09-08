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
      // Accept matters: /api/admin/genjobs/:id/step serves plain JSON by default and only
      // switches to the heartbeated stream when the caller says it can read one.
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
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
    libSel: new Set(), libShown: [], libFilter: 'all', libFolder: null, libDrag: null, // the Library's ticked sources, its filed/unfiled filter, and the folder rail (null = all folders)
    sourcePlan: null, stopSources: false, // the corpus plan being reviewed + its run
    goal: null, stopGoal: false, // the "learn a goal" plan + its run
    bulk: null, stopBulk: false, // the "bulk-build lessons" parsed preview + its run
    assignments: [], // the People tab's who's-assigned-to-what table
    roadmap: null, // the roadmap plan being reviewed/edited in the Chart tab
    team: [], // the Team tab's per-person rows
    teamProviders: [], // every provider id the server knows (for the access editor)
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
    // The active program's doc (name/category) — category 'growth' marks a READING
    // program, whose ingests are treated as books (deck auto-built on attach).
    state.programMeta = programs.find((p) => p.id === state.program) || {};
    $('program').innerHTML = programs.map((p) => `<option value="${esc(p.id)}">${esc(p.name || p.id)}</option>`).join('');
    $('program').value = state.program;
    $('program').onchange = () => { location.search = '?program=' + encodeURIComponent($('program').value); };

    wireTabs();
    wireCurriculum();
    wireCurriculumAI();
    wireTranscripts();
    wireIngest();
    wireLibrary();
    wireComposeModes();
    wireMergedStations();
    wireGoalPlan();
    wireBulk();
    wireBuildModes();
    wireGenerate();
    wireQuestionBrowser();
    loadEngines();
    wirePeople();
    wireRoadmaps();
    wireTeam();
    wireAddProgram();
    refreshAll();
  }

  function wireTabs() {
    document.querySelectorAll('.aa-tab').forEach((t) => {
      t.onclick = () => {
        document.querySelectorAll('.aa-tab').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
        document.querySelectorAll('.aa-panel').forEach((p) => p.classList.toggle('on', p.id === 'p-' + t.dataset.panel));
        // Two stations each carry two modes now, so opening one loads BOTH its
        // datasets — the mode switch is instant and never shows an empty table.
        if (t.dataset.panel === 'generate') { loadJobs(); loadFlags(); }
        if (t.dataset.panel === 'people') { loadAssignments(); loadTeam(); }
        if (t.dataset.panel === 'roadmaps') loadRoadmaps();
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
    populateQuestionBrowser();
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

  /* ---- curriculum ordering (mirror the learner app: order first, then numeric name) ---- */
  const _num = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  const _cmpOrderName = (oa, na, ob, nb) => {
    const A = Number.isFinite(oa) ? oa : Infinity, B = Number.isFinite(ob) ? ob : Infinity;
    return A !== B ? A - B : _num(na, nb);
  };
  const _minOrder = (rows) => rows.reduce((m, r) => (Number.isFinite(r.order) && r.order < m ? r.order : m), Infinity);
  // Rows of a lesson, in study order.
  function lessonTopics(track, course, lesson) {
    return state.catalog
      .filter((r) => r.track === track && r.course === course && r.lesson === lesson)
      .sort((a, b) => _cmpOrderName(a.order, a.topic, b.order, b.topic));
  }
  // Distinct child names of a parent, ordered by the group's MIN topic order then name.
  function orderedGroups(rows, keyOf) {
    const names = [...new Set(rows.map(keyOf))].filter(Boolean);
    return names.sort((a, b) => {
      const oa = _minOrder(rows.filter((r) => keyOf(r) === a));
      const ob = _minOrder(rows.filter((r) => keyOf(r) === b));
      return oa !== ob ? oa - ob : _num(a, b);
    });
  }

  // Interactive Track > Course > Lesson > Sub-lesson tree with inline add/remove AND
  // drag-and-drop: drag a lesson onto another course to re-file it, a sub-lesson onto
  // another lesson, or reorder either within its parent. Moves keep the topic doc id
  // (so learner stats/questions/graph edges survive — see /api/admin/topics/move).
  function renderCurriculumTree() {
    const el = $('curTree');
    if (!state.catalog.length) { el.innerHTML = '<div class="aa-note" style="padding:12px">No topics yet — add one above, or paste an outline.</div>'; return; }
    const lessonRefs = [];
    const tracks = [...new Set(state.catalog.map((r) => r.track))].filter(Boolean).sort(_num);
    let html = '<div class="cur-hint">Drag the <b>⠿</b> handle to move a lesson to another course, a sub-lesson to another lesson, or reorder within a parent. Learner progress is kept.</div>';
    for (const track of tracks) {
      const trackRows = state.catalog.filter((r) => r.track === track);
      html += `<div class="cur-track-h">${esc(track)}</div>`;
      for (const course of orderedGroups(trackRows, (r) => r.course)) {
        html += `<div class="cur-course" data-track="${esc(track)}" data-course="${esc(course)}">`;
        html += `<div class="cur-course-h">${esc(course)}</div>`;
        const courseRows = trackRows.filter((r) => r.course === course);
        for (const lesson of orderedGroups(courseRows, (r) => r.lesson)) {
          const topics = lessonTopics(track, course, lesson);
          const li = lessonRefs.push({ track, course, lesson, ids: topics.map((r) => r.id) }) - 1;
          html += `<div class="cur-lesson-group" data-track="${esc(track)}" data-course="${esc(course)}" data-lesson="${esc(lesson)}">`;
          html += `<div class="cur-lesson" draggable="true" data-track="${esc(track)}" data-course="${esc(course)}" data-lesson="${esc(lesson)}">`
            + `<span class="cur-handle" title="Drag to move or reorder this lesson">⠿</span>`
            + `<span class="cur-lesson-name">${esc(lesson)}</span>`
            + `<span class="cur-row-actions"><button class="btn" data-li="${li}" style="padding:1px 8px;font-size:11px">+ sub-lesson</button>`
            + `<button class="btn" data-dellesson="${li}" title="Delete this whole lesson and its sub-lessons" style="padding:1px 7px;font-size:12px;color:#B3261E;border-color:#f0d0cd">&times;</button></span>`
            + `</div>`;
          for (const r of topics) {
            html += `<div class="cur-topic" draggable="true" data-id="${esc(r.id)}" data-track="${esc(track)}" data-course="${esc(course)}" data-lesson="${esc(lesson)}" data-topic="${esc(r.topic)}">`
              + `<span class="cur-handle" title="Drag to move or reorder this sub-lesson">⠿</span>`
              + `<span class="cur-topic-name">${esc(r.topic)}</span>`
              + `<button class="btn" data-del="${esc(r.id)}" title="Remove this sub-lesson" style="padding:0 7px;font-size:12px;color:#B3261E;border-color:#f0d0cd">&times;</button>`
              + `</div>`;
          }
          html += `</div>`; // .cur-lesson-group
        }
        html += `</div>`; // .cur-course
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

  /* ------------------------- curriculum drag-and-drop ------------------------ */
  let curDrag = null; // { kind:'lesson'|'topic', track, course, lesson, id?, topic? }
  const curStatus = (html) => { const m = $('curDnDMsg'); if (m) m.innerHTML = html; };
  function clearCurMarks() {
    $('curTree').querySelectorAll('.cur-drop-ok,.cur-insert-top,.cur-insert-bot')
      .forEach((n) => n.classList.remove('cur-drop-ok', 'cur-insert-top', 'cur-insert-bot'));
  }
  // Where would this drop land? Returns null when the target is invalid for the drag.
  function computeCurDrop(e) {
    if (!curDrag) return null;
    const nearest = (nodes) => {
      let index = nodes.length, markEl = null, after = false;
      for (let i = 0; i < nodes.length; i++) {
        const rect = nodes[i].getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) { index = i; markEl = nodes[i]; break; }
      }
      if (index === nodes.length && nodes.length) { markEl = nodes[nodes.length - 1]; after = true; }
      return { index, markEl, after };
    };
    if (curDrag.kind === 'lesson') {
      const courseEl = e.target.closest('.cur-course');
      if (!courseEl) return null;
      const groups = [...courseEl.querySelectorAll(':scope > .cur-lesson-group')];
      return { kind: 'lesson', courseEl, groups, ...nearest(groups) };
    }
    const groupEl = e.target.closest('.cur-lesson-group');
    if (!groupEl) return null;
    const topics = [...groupEl.querySelectorAll(':scope > .cur-topic')];
    return { kind: 'topic', groupEl, topics, ...nearest(topics) };
  }

  function wireCurriculumDnD() {
    const tree = $('curTree');
    if (!tree || tree._dndWired) return;
    tree._dndWired = true;
    tree.addEventListener('dragstart', (e) => {
      const topicEl = e.target.closest('.cur-topic');
      const lessonEl = e.target.closest('.cur-lesson');
      if (topicEl) {
        curDrag = { kind: 'topic', id: topicEl.dataset.id, track: topicEl.dataset.track, course: topicEl.dataset.course, lesson: topicEl.dataset.lesson, topic: topicEl.dataset.topic };
        topicEl.classList.add('cur-dragging');
      } else if (lessonEl) {
        curDrag = { kind: 'lesson', track: lessonEl.dataset.track, course: lessonEl.dataset.course, lesson: lessonEl.dataset.lesson };
        (lessonEl.closest('.cur-lesson-group') || lessonEl).classList.add('cur-dragging');
      } else { return; }
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', curDrag.kind); } catch { /* older browsers */ }
    });
    tree.addEventListener('dragover', (e) => {
      const t = computeCurDrop(e);
      clearCurMarks();
      if (!t) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch { /* noop */ }
      (t.kind === 'lesson' ? t.courseEl : t.groupEl).classList.add('cur-drop-ok');
      if (t.markEl) t.markEl.classList.add(t.after ? 'cur-insert-bot' : 'cur-insert-top');
    });
    tree.addEventListener('drop', async (e) => {
      const t = computeCurDrop(e);
      const drag = curDrag; curDrag = null;
      clearCurMarks();
      tree.querySelectorAll('.cur-dragging').forEach((n) => n.classList.remove('cur-dragging'));
      if (!drag || !t) return;
      e.preventDefault();
      try { await (drag.kind === 'lesson' ? dropLesson(drag, t) : dropTopic(drag, t)); }
      catch (err) { curStatus(`<span class="aa-err">${esc(err.message)}</span>`); }
    });
    tree.addEventListener('dragend', () => {
      curDrag = null; clearCurMarks();
      tree.querySelectorAll('.cur-dragging').forEach((n) => n.classList.remove('cur-dragging'));
    });
  }

  // De-dup an array, preserving first occurrence.
  const _uniq = (a) => a.filter((v, i) => a.indexOf(v) === i);

  // Drop a whole lesson: optionally re-file into a new course, then renumber the target
  // course into contiguous per-lesson blocks so the lesson lands exactly where dropped.
  async function dropLesson(drag, t) {
    const toTrack = t.courseEl.dataset.track, toCourse = t.courseEl.dataset.course;
    const sameCourse = drag.track === toTrack && drag.course === toCourse;
    let lessons = t.groups.map((g) => g.dataset.lesson);
    const from = sameCourse ? lessons.indexOf(drag.lesson) : -1;
    let index = t.index;
    if (from !== -1) { lessons.splice(from, 1); if (from < index) index -= 1; }
    if (sameCourse && from !== -1 && index === from) return; // dropped back in place
    lessons.splice(Math.min(index, lessons.length), 0, drag.lesson);
    lessons = _uniq(lessons);

    if (!sameCourse) {
      const ids = state.catalog
        .filter((r) => r.track === drag.track && r.course === drag.course && r.lesson === drag.lesson)
        .map((r) => r.id);
      const trackNote = toTrack !== drag.track ? ` and track “${toTrack}”` : '';
      if (!window.confirm(`Move lesson “${drag.lesson}” (${ids.length} sub-lesson${ids.length === 1 ? '' : 's'}) into course “${toCourse}”${trackNote}? Learner progress is kept.`)) return;
      curStatus('Moving…');
      await api('/api/admin/topics/move', { method: 'POST', body: { ids, to: { track: toTrack, course: toCourse } } });
    } else {
      curStatus('Reordering…');
    }
    // Renumber every topic in the target course, block by block, in the new lesson order.
    const items = []; const seen = new Set(); let ord = 0;
    for (const le of lessons) {
      const rows = state.catalog
        .filter((r) => r.lesson === le
          && ((r.track === toTrack && r.course === toCourse)
            || (le === drag.lesson && r.track === drag.track && r.course === drag.course)))
        .sort((a, b) => _cmpOrderName(a.order, a.topic, b.order, b.topic));
      for (const r of rows) { if (seen.has(r.id)) continue; seen.add(r.id); items.push({ id: r.id, order: ord++ }); }
    }
    if (items.length) await api('/api/admin/topics/reorder', { method: 'POST', body: { items } });
    curStatus('<span class="aa-ok">Done.</span>');
    await loadCatalog();
  }

  // Drop a sub-lesson: optionally re-file into a new lesson, then renumber the target
  // lesson's topics from its current base order (so its position in the course is kept).
  async function dropTopic(drag, t) {
    const toTrack = t.groupEl.dataset.track, toCourse = t.groupEl.dataset.course, toLesson = t.groupEl.dataset.lesson;
    const sameLesson = drag.track === toTrack && drag.course === toCourse && drag.lesson === toLesson;
    let ids = t.topics.map((el) => el.dataset.id);
    const from = sameLesson ? ids.indexOf(drag.id) : -1;
    let index = t.index;
    if (from !== -1) { ids.splice(from, 1); if (from < index) index -= 1; }
    if (sameLesson && from !== -1 && index === from) return; // dropped back in place
    ids.splice(Math.min(index, ids.length), 0, drag.id);
    ids = _uniq(ids);

    if (!sameLesson) {
      if (!window.confirm(`Move sub-lesson “${drag.topic}” into lesson “${toLesson}” (course “${toCourse}”)? Learner progress is kept.`)) return;
      curStatus('Moving…');
      await api('/api/admin/topics/move', { method: 'POST', body: { ids: [drag.id], to: { track: toTrack, course: toCourse, lesson: toLesson } } });
    } else {
      curStatus('Reordering…');
    }
    // Keep the lesson's slot in its course: number from its current min order (else 0).
    const base = _minOrder(lessonTopics(toTrack, toCourse, toLesson));
    const start = Number.isFinite(base) ? base : 0;
    const items = ids.map((id, i) => ({ id, order: start + i }));
    await api('/api/admin/topics/reorder', { method: 'POST', body: { items } });
    curStatus('<span class="aa-ok">Done.</span>');
    await loadCatalog();
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
    wireCurriculumDnD();
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

  /* --------------------------- Edit with AI (chat) ------------------------- */
  // A conversational curriculum editor. The admin describes a change; the model
  // (streaming its reasoning into the shared rail panel) proposes a set of concrete
  // structural operations, resolved against the live catalog on the server so each
  // is shown exactly as it would run. Nothing is written until the admin clicks
  // Apply — mirroring every other AI action in this room (propose → review → apply).
  let caHistory = [];      // [{role:'user'|'assistant', content}] — prior turns sent for context
  let caPlan = null;       // { operations:[…], steps:[…] } currently under review

  const CA_OP_LABEL = {
    merge_lessons: 'Merge lessons', rename_lesson: 'Rename lesson', rename_course: 'Rename course',
    move_lesson: 'Move lesson', move_topic: 'Move sub-lesson', delete_topic: 'Delete sub-lesson',
    delete_lesson: 'Delete lesson', add_topic: 'Add sub-lesson',
    reorder_lessons: 'Reorder lessons', reorder_topics: 'Reorder sub-lessons',
  };

  function caPushBubble(role, text) {
    const log = $('caLog');
    const div = document.createElement('div');
    div.className = `ca-msg ${role === 'user' ? 'user' : 'ai'}`;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function renderCaOps() {
    const box = $('caOps');
    const steps = (caPlan && caPlan.steps) || [];
    box.innerHTML = steps.map((s, i) => {
      const title = esc(s.description || CA_OP_LABEL[s.op] || s.op || 'Change');
      const sub = !s.ok
        ? `<div class="ca-op-note err">Couldn't resolve: ${esc(s.error || 'unknown error')}</div>`
        : (s.note ? `<div class="ca-op-note">${esc(s.note)}</div>` : '');
      return `<div class="ca-op${s.ok ? '' : ' bad'}">`
        + `<div class="ca-op-body"><div class="ca-op-desc">${title}</div>${sub}</div>`
        + `<button class="ca-op-x" data-i="${i}" title="Remove this change">&times;</button>`
        + `</div>`;
    }).join('');
    box.querySelectorAll('.ca-op-x').forEach((b) => { b.onclick = () => {
      const i = Number(b.dataset.i);
      caPlan.operations.splice(i, 1);
      caPlan.steps.splice(i, 1);
      if (!caPlan.operations.length) { show($('caPlan'), false); caPlan = null; return; }
      renderCaOps();
    }; });
    const ok = steps.filter((s) => s.ok).length;
    const bad = steps.length - ok;
    $('caPlanCount').textContent = `— ${ok} change${ok === 1 ? '' : 's'}${bad ? `, ${bad} skipped` : ''}`;
    $('caApply').disabled = ok === 0;
  }

  function renderCaPlan(result) {
    const ops = Array.isArray(result.operations) ? result.operations : [];
    const steps = Array.isArray(result.steps) ? result.steps : [];
    if (!ops.length) { caPlan = null; show($('caPlan'), false); return; }
    caPlan = { operations: ops, steps };
    $('caSummary').textContent = result.summary || '';
    show($('caSummary'), !!result.summary);
    renderCaOps();
    $('caApplyMsg').textContent = '';
    show($('caPlan'), true);
  }

  async function caSend(message) {
    const msg = String(message || '').trim();
    if (!msg) { $('caMsgOut').innerHTML = '<span class="aa-err">Describe a change first.</span>'; return; }
    $('caSend').disabled = true;
    $('caMsgOut').textContent = 'Thinking…';
    show($('caReset'), true);
    show($('caChips'), false);
    const history = caHistory.slice(); // prior turns only; the server appends this message itself
    caPushBubble('user', msg);
    $('caMsg').value = '';
    const panel = thinkPanel('aeThink'); panel.start();
    try {
      const data = await streamSSE('/api/admin/curriculum/edit/stream', {
        program: state.program, message: msg, history, ...engineBody(),
      }, { onThinking: panel.thinking, onContent: panel.content });
      panel.done(data.operations && data.operations.length ? 'Plan ready' : 'Answered');
      const reply = data.reply || (data.operations && data.operations.length ? 'Here are the changes I propose.' : 'Done.');
      caPushBubble('ai', reply);
      caHistory.push({ role: 'user', content: msg });
      caHistory.push({ role: 'assistant', content: reply });
      renderCaPlan(data);
      $('caMsgOut').textContent = '';
    } catch (e) {
      panel.fail('Stopped');
      caPushBubble('ai', `⚠ ${e.message}`);
      $('caMsgOut').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
    }
    $('caSend').disabled = false;
  }

  async function caApply() {
    if (!caPlan || !caPlan.operations.length) return;
    $('caApply').disabled = true; $('caDiscard').disabled = true;
    $('caApplyMsg').textContent = 'Applying…';
    try {
      const res = await api('/api/admin/curriculum/apply', {
        method: 'POST', body: { program: state.program, operations: caPlan.operations },
      });
      const failed = (res.steps || []).filter((s) => !s.ok);
      await loadCatalog(); // the tree above now reflects the edits
      show($('caPlan'), false); caPlan = null;
      const note = failed.length
        ? `Applied ${res.applied} change${res.applied === 1 ? '' : 's'}; ${failed.length} couldn't be applied.`
        : `✓ Applied ${res.applied} change${res.applied === 1 ? '' : 's'}. The tree above is updated.`;
      caPushBubble('ai', note);
      $('caApplyMsg').textContent = '';
    } catch (e) {
      $('caApplyMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
    }
    $('caApply').disabled = false; $('caDiscard').disabled = false;
  }

  function caReset() {
    caHistory = []; caPlan = null;
    $('caLog').innerHTML = '';
    $('caMsg').value = '';
    $('caMsgOut').textContent = ''; $('caApplyMsg').textContent = '';
    show($('caPlan'), false);
    show($('caReset'), false);
    show($('caChips'), true);
    show($('aeThink'), false);
  }

  function wireCurriculumAI() {
    $('caSend').onclick = () => caSend($('caMsg').value);
    $('caReset').onclick = caReset;
    $('caApply').onclick = caApply;
    $('caDiscard').onclick = () => { show($('caPlan'), false); caPlan = null; };
    // Ctrl/⌘+Enter sends (the textarea is multi-line, so plain Enter inserts a newline).
    $('caMsg').addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); caSend($('caMsg').value); }
    });
    $('caChips').querySelectorAll('.ca-chip').forEach((c) => { c.onclick = () => {
      $('caMsg').value = c.textContent.trim(); $('caMsg').focus();
    }; });
  }

  /* ------------------------------- transcripts ----------------------------- */
  let _transcripts = [];
  async function loadTranscripts() {
    try {
      _transcripts = await api('/api/admin/transcripts?' + q());
      renderTranscriptList();
      if ($('gSources')) renderGenSources(); // Generate tab source list depends on these
      if ($('gpSources')) renderGoalSources(); // goal pane's optional grounding picker
    } catch (e) { $('tList').textContent = 'Error: ' + e.message; }
  }

  // Goal pane: optional "base on transcripts" picker over the WHOLE program (a goal
  // module can span several lessons, so we don't scope to a course here). Ticking
  // any grounds generation strictly on those; leaving all unticked uses the briefs.
  function renderGoalSources() {
    const el = $('gpSources');
    if (!el) return;
    if (!_transcripts.length) { el.innerHTML = '<div class="aa-note" style="padding:8px">No transcripts in this program — questions come from the AI-written lesson briefs.</div>'; return; }
    el.innerHTML = _transcripts.map((t) =>
      `<label style="display:flex;gap:8px;align-items:center;padding:6px 11px;border-bottom:1px solid #F0F1F4;cursor:pointer"><input type="checkbox" data-tid="${esc(t.id)}" style="width:auto"><span><b>${esc(t.title)}</b> <span style="color:#6B7280;font-size:12px">&middot; ${esc(t.course || '—')} &rsaquo; ${esc(t.lesson || '—')} &middot; ${t.chars || 0} chars</span></span></label>`).join('');
  }

  /* A source is UNFILED when it carries no course/lesson — raw material in the
   * library that no lesson grounds on yet. That is the whole point of the
   * sources-first flow, and it is also exactly what `getScopeTranscripts` skips,
   * so an unfiled source can never leak into a lesson's grounding by accident. */
  const isUnfiled = (t) => !String(t.course || '').trim() && !String(t.lesson || '').trim();

  /* A source's library FOLDER. Shelving only — orthogonal to `course`/`lesson`, which
   * is what actually decides grounding. '' means the top level. */
  const folderOf = (t) => String(t.folder || '').trim();

  /* The folder rail + the datalists that offer existing folder names. Folders are
   * DERIVED from the sources themselves (distinct values), so there is no folder
   * registry to keep in sync and an empty folder simply stops existing. */
  function renderFolderRail() {
    const el = $('libFolders');
    if (!el) return;
    const counts = new Map();
    for (const t of _transcripts) counts.set(folderOf(t), (counts.get(folderOf(t)) || 0) + 1);
    const names = [...counts.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b));
    const chip = (label, key, n) => {
      const on = state.libFolder === key;
      return `<button class="btn${on ? ' btn-primary' : ''}" data-folder="${key === null ? '' : esc(key)}" data-all="${key === null}" style="padding:3px 11px;font-size:12px">${esc(label)} <span style="opacity:.65">${n}</span></button>`;
    };
    el.innerHTML = [
      chip('All', null, _transcripts.length),
      ...(counts.get('') ? [chip('Top level', '', counts.get(''))] : []),
      ...names.map((f) => chip(f, f, counts.get(f))),
    ].join('');
    el.querySelectorAll('button[data-folder]').forEach((b) => {
      b.classList.add('fold-chip');
      b.onclick = () => {
        state.libFolder = b.dataset.all === 'true' ? null : b.dataset.folder;
        renderTranscriptList();
      };
      // "All" is a view, not a folder, so it is the one chip you cannot drop onto.
      if (b.dataset.all === 'true') return;
      b.addEventListener('dragover', (e) => {
        if (!state.libDrag) return;
        e.preventDefault(); e.dataTransfer.dropEffect = 'move'; b.classList.add('drop-over');
      });
      b.addEventListener('dragleave', () => b.classList.remove('drop-over'));
      b.addEventListener('drop', async (e) => {
        b.classList.remove('drop-over');
        const ids = state.libDrag;
        if (!ids || !ids.length) return;
        e.preventDefault(); e.stopPropagation();
        state.libDrag = null;
        try {
          const r = await api('/api/admin/transcripts/folder', { method: 'POST', body: { ids, folder: b.dataset.folder } });
          await loadTranscripts();
          $('libSel').innerHTML = `<span class="aa-ok">Moved ${r.moved} to ${b.dataset.folder ? esc(b.dataset.folder) : 'the top level'}.</span>`;
        } catch (err) { $('libSel').innerHTML = `<span class="aa-err">${esc(err.message)}</span>`; }
      });
    });
    const dl = $('upFolderList');
    if (dl) dl.innerHTML = names.map((f) => `<option value="${esc(f)}"></option>`).join('');
  }

  // The library browser: filterable list on the left, full text on the right, and a
  // tick per row. The ticks drive BOTH library actions (catalogue, and design a
  // curriculum), so selection lives in state and survives re-renders and filtering.
  function renderTranscriptList() {
    const term = (($('tSearch') && $('tSearch').value) || '').toLowerCase();
    const list = _transcripts.filter((t) => {
      if (state.libFilter === 'unfiled' && !isUnfiled(t)) return false;
      if (state.libFilter === 'filed' && isUnfiled(t)) return false;
      if (state.libFolder !== null && folderOf(t) !== state.libFolder) return false;
      return !term || `${t.title} ${t.course} ${t.lesson} ${folderOf(t)}`.toLowerCase().includes(term);
    });
    renderFolderRail();
    state.libShown = list.map((t) => t.id);
    const unfiled = _transcripts.filter(isUnfiled).length;
    if ($('tCount')) $('tCount').textContent = `— ${_transcripts.length}${unfiled ? `, ${unfiled} unfiled` : ''}`;
    const rs = $('railSources'); if (rs) rs.textContent = String(_transcripts.length);
    if (!list.length) {
      $('tList').innerHTML = `<div class="aa-note" style="padding:10px">${_transcripts.length ? 'Nothing matches that filter.' : 'The library is empty — add some source material above.'}</div>`;
      renderLibSelection();
      return;
    }
    $('tList').innerHTML = list.map((t) => {
      const where = isUnfiled(t)
        ? '<span style="color:#B45309">Unfiled</span>'
        : `${esc((t.course || '').split(':')[0])} &rsaquo; ${esc(t.lesson)}`;
      // "Catalogued" = a cached digest exists, which is what the corpus planner reads.
      const cat = t.abstract ? ' &middot; <span style="color:#15803D">catalogued</span>' : '';
      const fold = folderOf(t) ? ` &middot; 📁 ${esc(folderOf(t))}` : '';
      const sp = t.splitInto ? ` &middot; <span style="color:#B45309">split into ${t.splitInto}</span>` : '';
      return `<div class="lib-row" draggable="true" data-row="${esc(t.id)}" style="display:flex;align-items:stretch;border-bottom:1px solid #F0F1F4">` +
        `<label style="display:flex;align-items:center;padding:0 4px 0 9px;cursor:pointer">` +
          `<input type="checkbox" data-lib="${esc(t.id)}" style="width:auto"${state.libSel.has(t.id) ? ' checked' : ''}></label>` +
        `<button data-id="${esc(t.id)}" style="flex:1;border-bottom:0"><b>${esc(t.title)}</b><br>` +
        `<span style="color:#6B7280;font-size:12px">${where} &middot; ${t.chars || 0} chars &middot; ${esc(t.source)}${cat}${fold}${sp}</span></button></div>`;
    }).join('');
    $('tList').querySelectorAll('button[data-id]').forEach((b) => { b.onclick = () => openTranscript(b.dataset.id, b); });
    // Dragging a row carries the whole TICKED set when the dragged row is one of
    // them, so "tick five, drag one" moves all five - the desktop behaviour.
    $('tList').querySelectorAll('.lib-row').forEach((row) => {
      row.addEventListener('dragstart', (e) => {
        const id = row.dataset.row;
        state.libDrag = state.libSel.has(id) ? [...state.libSel] : [id];
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        // Some payload is required or Firefox cancels the drag immediately.
        e.dataTransfer.setData('text/plain', state.libDrag.join(','));
      });
      row.addEventListener('dragend', () => { row.classList.remove('dragging'); state.libDrag = null; });
    });
    $('tList').querySelectorAll('input[data-lib]').forEach((c) => {
      c.onchange = () => {
        if (c.checked) state.libSel.add(c.dataset.lib); else state.libSel.delete(c.dataset.lib);
        renderLibSelection();
      };
    });
    renderLibSelection();
    renderScopeOptions();
  }

  /* One line of truth about what is ticked. Both library actions read it, and it
   * reports how many of the ticked sources still need cataloguing — the planner
   * degrades to title-only on those rather than failing, so this is a nudge. */
  function renderLibSelection() {
    const picked = _transcripts.filter((t) => state.libSel.has(t.id));
    const el = $('libSel');
    if (el) {
      if (!picked.length) el.textContent = 'None selected.';
      else {
        const raw = picked.filter((t) => !t.abstract).length;
        el.innerHTML = `<b>${picked.length}</b> selected${raw ? ` · <span style="color:#B45309">${raw} not catalogued yet</span>` : ' · all catalogued'}`;
      }
    }
    // The filing card acts on exactly ONE source, so it says which one — or why it
    // can't act yet. Both its buttons re-check this, so the readout is a hint, not a gate.
    const pk = $('iPicked');
    if (pk) {
      if (picked.length === 1) {
        const t = picked[0];
        pk.innerHTML = `Filing <b>${esc(t.title)}</b> <span class="aa-note">· ${t.chars || 0} chars${isUnfiled(t) ? '' : ` · currently in ${esc(t.course)} › ${esc(t.lesson)}`}</span>`;
      } else if (!picked.length) pk.textContent = 'Tick exactly one source in the library above.';
      else pk.innerHTML = `<span style="color:#B45309">${picked.length} sources ticked — this files ONE. Use “Build a curriculum from these sources” for the whole set.</span>`;
    }
  }

  /* ---- the "design from" scope ----
   *
   * A folder is the unit, because a folder is how a module arrives: drop one module's
   * transcripts into one folder, then design from that folder. Ticking forty
   * checkboxes to say "this module" was the step that made the flow feel manual.
   * Ticked sources stay available as an option for the subset case. */
  function renderScopeOptions() {
    const sel = $('spScope');
    if (!sel) return;
    const counts = new Map();
    for (const t of _transcripts) counts.set(folderOf(t), (counts.get(folderOf(t)) || 0) + 1);
    const names = [...counts.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b));
    const keep = sel.value;
    const opts = [];
    for (const f of names) opts.push(`<option value="f:${esc(f)}">${esc(f)} (${counts.get(f)})</option>`);
    if (counts.get('')) opts.push(`<option value="top">Top level, no folder (${counts.get('')})</option>`);
    opts.push(`<option value="unfiled">Everything not yet in the curriculum (${_transcripts.filter(isUnfiled).length})</option>`);
    opts.push(`<option value="ticked">Just the ticked sources (${state.libSel.size})</option>`);
    sel.innerHTML = opts.join('');
    // Keep the admin's choice across reloads where it still exists.
    if (keep && [...sel.options].some((o) => o.value === keep)) sel.value = keep;
    renderScopeNote();
  }

  /* The sources the current "design from" choice resolves to. */
  function scopeSources() {
    const v = ($('spScope') && $('spScope').value) || '';
    if (v === 'ticked') return _transcripts.filter((t) => state.libSel.has(t.id));
    if (v === 'unfiled') return _transcripts.filter(isUnfiled);
    if (v === 'top') return _transcripts.filter((t) => !folderOf(t));
    if (v.startsWith('f:')) return _transcripts.filter((t) => folderOf(t) === v.slice(2));
    return [];
  }

  /* Say what the choice covers and how much of it still needs reading, so the wait
   * that Design is about to impose is visible before it starts. */
  function renderScopeNote() {
    const el = $('spScopeNote');
    if (!el) return;
    const picked = scopeSources();
    if (!picked.length) { el.textContent = 'Nothing in this selection.'; return; }
    const unread = picked.filter((t) => !t.abstract).length;
    el.innerHTML = `<b>${picked.length}</b> source${picked.length === 1 ? '' : 's'}`
      + (unread ? ` \u00b7 ${unread} to read first` : ' \u00b7 all already read');
  }

  /* The single ticked source, or null. The filing card is deliberately one-at-a-time:
   * placing a source needs a human decision about where it goes, and the many-source
   * answer to "where does all this belong" is the corpus planner, not a loop. */
  function pickedSource() {
    const picked = _transcripts.filter((t) => state.libSel.has(t.id));
    return picked.length === 1 ? picked[0] : null;
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

  /* ------------------------------ the Library ------------------------------ */
  /*
   * Sources-FIRST authoring, the mirror of the curriculum-first flow above.
   *
   * Upload raw material with NO scope and NO generation (it is just a database),
   * then select some of it and have the curriculum DESIGNED from what those
   * sources teach. Three server steps: digest each source once (cached on the doc
   * forever), design the tree from those digests, commit — which also FILES each
   * source onto the lesson it grounds, so every existing grounding path picks it
   * up for free. See docs/COURSE-TO-CURRICULUM-SOP.md for why the tree must not
   * mirror the sources' own order.
   */
  function wireLibrary() {
    if (!$('upFiles')) return;

    /* --- adding raw material (unfiled by construction: no track/course/lesson) --- */
    $('upPick').onclick = () => $('upFiles').click();
    $('upFiles').onchange = async () => {
      const files = [...($('upFiles').files || [])];
      $('upFiles').value = '';
      await addFilesToLibrary(files);
    };

    /* Drop OS files anywhere on the Library panel. `dragenter`/`dragleave` fire for
     * every child element, so the highlight is refcounted rather than toggled -
     * decrementing on each leave is what stops it flickering off as the pointer
     * crosses a card boundary mid-drag. */
    const panel = $('p-sources');
    if (panel) {
      let depth = 0;
      const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
      panel.addEventListener('dragenter', (e) => {
        if (!hasFiles(e)) return;
        e.preventDefault(); depth += 1; panel.classList.add('over');
      });
      panel.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
      panel.addEventListener('dragleave', (e) => {
        if (!hasFiles(e)) return;
        depth = Math.max(0, depth - 1);
        if (!depth) panel.classList.remove('over');
      });
      panel.addEventListener('drop', async (e) => {
        if (!hasFiles(e)) return;
        e.preventDefault(); depth = 0; panel.classList.remove('over');
        await addFilesToLibrary([...(e.dataTransfer.files || [])]);
      });
    }

    wireLibraryRest();
  }

  /* One implementation behind the file picker AND the drop zone. Everything lands
   * UNFILED, into whatever folder the "Put it in" box names. */
  async function addFilesToLibrary(files) {
    if (!files || !files.length) return;
    const bar = $('upBar'); const st = $('upStatus');
    let done = 0; let failed = 0;
    for (const f of files) {
      st.textContent = `Reading ${f.name}… (${done + 1} of ${files.length})`;
      try {
        // .vtt/.srt are accepted, and their cue numbers and timecodes are noise to
        // every downstream reader (digester, planner, question writer).
        const text = stripTiming(await f.text());
        if (!text.trim()) throw new Error('empty file');
        await api('/api/admin/transcripts', {
          method: 'POST',
          // No track/course/lesson: this lands UNFILED, on purpose.
          body: { program: state.program, title: f.name.replace(/\.[^.]+$/, ''), text, source: 'upload', folder: $('upFolder').value.trim() },
        });
      } catch (e) { failed += 1; console.error('upload failed', f.name, e.message); }
      done += 1;
      bar.style.width = `${Math.round((done / files.length) * 100)}%`;
    }
    st.innerHTML = failed
      ? `<span class="aa-err">Added ${done - failed} of ${files.length}; ${failed} failed (see console).</span>`
      : `<span class="aa-ok">Added ${done} source${done === 1 ? '' : 's'} to the library — unfiled, nothing generated.</span>`;
    bar.style.width = '0%';
    await loadTranscripts();
  }

  /* The rest of the Library wiring — split out only so the drop-zone setup above
   * stays readable; called from wireLibrary(). */
  function wireLibraryRest() {

    $('upAdd').onclick = async () => {
      const text = $('upText').value.trim();
      if (!text) { $('upMsg').innerHTML = '<span class="aa-err">Paste something first.</span>'; return; }
      $('upAdd').disabled = true; $('upMsg').textContent = 'Adding…';
      try {
        await api('/api/admin/transcripts', {
          method: 'POST',
          body: { program: state.program, title: $('upTitle').value.trim() || 'Untitled', text, source: 'paste', folder: $('upFolder').value.trim() },
        });
        $('upText').value = ''; $('upTitle').value = '';
        $('upMsg').innerHTML = '<span class="aa-ok">Added to the library.</span>';
        await loadTranscripts();
      } catch (e) { $('upMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
      $('upAdd').disabled = false;
    };

    /* --- filtering + selection --- */
    const setFilter = (f) => {
      state.libFilter = f;
      $('lfAll').setAttribute('aria-selected', String(f === 'all'));
      $('lfUnfiled').setAttribute('aria-selected', String(f === 'unfiled'));
      $('lfFiled').setAttribute('aria-selected', String(f === 'filed'));
      renderTranscriptList();
    };
    $('lfAll').onclick = () => setFilter('all');
    $('lfUnfiled').onclick = () => setFilter('unfiled');
    $('lfFiled').onclick = () => setFilter('filed');
    // "Select all shown" respects the filter + search, so it is safe on a big library.
    $('libAll').onclick = () => { state.libShown.forEach((id) => state.libSel.add(id)); renderTranscriptList(); };
    $('libNone').onclick = () => { state.libSel.clear(); renderTranscriptList(); };
    // Re-shelving is safe by construction: it touches `folder` only, never the
    // course/lesson that decides grounding, so it can't change anyone's questions.
    $('libMove').onclick = async () => {
      const ids = [...state.libSel];
      if (!ids.length) { $('libSel').innerHTML = '<span class="aa-err">Tick some sources first.</span>'; return; }
      const folder = $('libMoveTo').value.trim();
      $('libMove').disabled = true;
      try {
        const r = await api('/api/admin/transcripts/folder', { method: 'POST', body: { ids, folder } });
        $('libMoveTo').value = '';
        await loadTranscripts();
        $('libSel').innerHTML = `<span class="aa-ok">Moved ${r.moved} to ${folder ? esc(folder) : 'the top level'}.</span>`;
      } catch (e) { $('libSel').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
      $('libMove').disabled = false;
    };

    /* Split one oversized source into the lessons it contains.
     *
     * This is the answer to "can I just upload the whole module as one file?" — yes,
     * then press this. It matters because every reader downstream is bounded (digest
     * 24k, classify 9k, generation 12k per lesson), so an unsplit module would
     * catalogue from its opening third and ground every one of its lessons on the
     * same first 12k. The parent is kept, so nothing is destroyed if the cut is wrong. */
    $('libSplit').onclick = async () => {
      const pick = pickedSource();
      if (!pick) { $('libSel').innerHTML = '<span class="aa-err">Tick exactly one source to split.</span>'; return; }
      $('libSplit').disabled = true;
      $('libStatus').textContent = `Looking for lesson boundaries in “${pick.title}”…`;
      try {
        const r = await api(`/api/admin/transcripts/${encodeURIComponent(pick.id)}/split`, { method: 'POST', body: { ...engineBody() } });
        await loadTranscripts();
        if (!r.split) {
          $('libStatus').innerHTML = `<span class="aa-note">${esc(r.note || 'No lesson boundaries found.')}</span>`;
        } else {
          state.libSel.clear();
          renderTranscriptList();
          $('libStatus').innerHTML = `<span class="aa-ok">Split into ${r.sections} sources in folder “${esc(r.folder)}”. `
            + `The original is kept — <a href="#" id="libDropOrig" data-id="${esc(pick.id)}">delete it</a> once the parts look right.</span>`;
          const del = $('libDropOrig');
          if (del) del.onclick = async (ev) => {
            ev.preventDefault();
            try {
              await api('/api/admin/transcripts/' + encodeURIComponent(del.dataset.id), { method: 'DELETE' });
              await loadTranscripts();
              $('libStatus').innerHTML = '<span class="aa-ok">Original removed — only the split parts remain.</span>';
            } catch (e) { $('libStatus').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
          };
        }
      } catch (e) { $('libStatus').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
      $('libSplit').disabled = false;
    };

    /* --- designing a curriculum from library sources ---
     *
     * ONE button. Reading the sources is phase 1 of it, not a step you have to know
     * about: a source is digested once and cached forever, so this only pays for what
     * is new. Phase 2 designs from those digests, never from full text - a corpus is
     * far past any prompt (lib/gemini.js says why). */
    $('spScope').onchange = renderScopeNote;

    $('spPlan').onclick = async () => {
      const picked = scopeSources();
      if (!picked.length) { $('spMsg').innerHTML = '<span class="aa-err">That folder has no sources in it.</span>'; return; }
      const reread = $('spReread').checked;
      const todo = reread ? picked : picked.filter((t) => !t.abstract);

      state.stopSources = false;
      $('spPlan').disabled = true;
      show($('spStop'), true);
      $('spMsg').textContent = '';
      show($('spPlanBox'), false);

      // Phase 1 - read anything not already read. One source per request: a long
      // single call gets CPU-throttled by Cloud Run and a closed tab would lose the
      // lot, where stepping keeps every source it already got through.
      let failed = 0;
      for (let i = 0; i < todo.length; i += 1) {
        if (state.stopSources) break;
        $('spStatus').textContent = `Reading source ${i + 1} of ${todo.length}…`;
        $('spBar').style.width = `${Math.round((i / todo.length) * 100)}%`;
        try {
          await api(`/api/admin/transcripts/${encodeURIComponent(todo[i].id)}/digest`, {
            method: 'POST', body: { force: reread, ...engineBody() },
          });
        } catch (e) { failed += 1; console.error('digest failed', todo[i].id, e.message); }
      }
      $('spBar').style.width = '0%';
      if (state.stopSources) {
        $('spStatus').innerHTML = '<span class="aa-note">Stopped. What was read is saved — press Design again to carry on.</span>';
        $('spPlan').disabled = false; show($('spStop'), false);
        await loadTranscripts();
        return;
      }
      if (todo.length) await loadTranscripts();

      // Phase 2 - design from the digests.
      $('spStatus').textContent = '';
      $('spMsg').textContent = `Designing from ${picked.length} source${picked.length === 1 ? '' : 's'}…`;
      const panel = thinkPanel('aeThink'); panel.start();
      try {
        const plan = await streamSSE('/api/admin/sources/plan/stream', {
          program: state.program,
          sourceIds: picked.map((t) => t.id),
          guidance: $('spGuidance').value.trim(),
          ...engineBody(),
        }, { onThinking: panel.thinking, onContent: panel.content });
        panel.done('Design ready');
        state.sourcePlan = plan;
        renderSourcePlan(plan);
        $('spMsg').innerHTML = failed
          ? `<span class="aa-err">${failed} source${failed === 1 ? '' : 's'} could not be read and were designed from their titles alone.</span>`
          : '';
      } catch (e) {
        panel.fail('Failed');
        $('spMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
      }
      $('spPlan').disabled = false;
      show($('spStop'), false);
    };

    $('spStop').onclick = () => { state.stopSources = true; $('spStatus').textContent = 'Stopping…'; };

    $('spDiscard').onclick = () => {
      state.sourcePlan = null; show($('spPlanBox'), false); show($('aeThink'), false); $('spMsg').textContent = '';
    };
    $('spGenerate').onchange = () => show($('spGenOpts'), $('spGenerate').checked);
    $('spCommit').onclick = commitSourcePlan;
  }

  /* The review table. Every name is editable before anything is written, "new"
   * badges came from the server against the live catalog, and GAP topics are shown
   * distinctly because they are created EMPTY and deliberately excluded from
   * generation — they have no source to generate from. */
  function renderSourcePlan(plan) {
    const cat = state.catalog || [];
    const opts = (vals) => [...new Set(vals)].filter(Boolean).sort().map((v) => `<option value="${esc(v)}"></option>`).join('');
    $('spTrack').value = plan.track || '';
    $('spTrackList').innerHTML = opts(cat.map((r) => r.track));
    $('spTrackNew').innerHTML = badge(plan.trackIsNew);
    $('spSummary').textContent = plan.summary || '';

    $('spCourses').innerHTML = plan.courses.map((c, ci) => {
      const lessons = c.lessons.map((l, li) => {
        const topics = l.topics.map((t, ti) => `
          <label style="display:flex;gap:9px;align-items:center;padding:5px 8px;border-radius:8px">
            <input type="checkbox" data-tk="${ci}.${li}.${ti}" style="width:auto" checked>
            <span>${esc(t.topic)}
              ${t.isNew ? badge(true) : ''}
              ${t.isGap ? `<span class="aa-badge-new" style="color:#B45309" title="${esc(t.why || 'Not covered by your sources')}">gap &mdash; no source</span>` : ''}
            </span>
          </label>`).join('');
        const srcs = l.sources.length
          ? l.sources.map((s) => esc(s.title)).join(' · ')
          : '<i>no source — these topics get created empty</i>';
        return `
          <div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:8px 0">
            <div style="font-weight:700;font-size:13px">${esc(l.lesson)} ${l.lessonIsNew ? badge(true) : ''}</div>
            ${l.rationale ? `<div class="aa-note" style="margin:2px 0 6px">${esc(l.rationale)}</div>` : ''}
            <div class="aa-note" style="margin:0 0 6px">Sources: ${srcs}</div>
            <div class="aa-topics">${topics}</div>
          </div>`;
      }).join('');
      return `
        <div style="margin:0 0 14px">
          <div class="aa-field-label" style="text-transform:none;letter-spacing:0;font-size:14px;color:var(--text)">
            ${esc(c.course)} ${c.courseIsNew ? badge(true) : ''}
          </div>
          ${lessons}
        </div>`;
    }).join('');
  }

  async function commitSourcePlan() {
    const plan = state.sourcePlan;
    if (!plan) return;
    const track = $('spTrack').value.trim();
    if (!track) { $('spCommitMsg').innerHTML = '<span class="aa-err">Name the track.</span>'; return; }

    // Only the ticked topics are written; a lesson whose topics were all unticked
    // is dropped, and with it any claim on its sources.
    const on = new Set([...$('spCourses').querySelectorAll('input[data-tk]:checked')].map((c) => c.dataset.tk));
    const courses = plan.courses.map((c, ci) => ({
      course: c.course,
      lessons: c.lessons.map((l, li) => ({
        lesson: l.lesson,
        sourceIds: l.sources.map((s) => s.id),
        topics: l.topics.map((t, ti) => ({ ...t, _k: `${ci}.${li}.${ti}` }))
          .filter((t) => on.has(t._k))
          .map((t) => ({ topic: t.topic, isGap: !!t.isGap })),
      })).filter((l) => l.topics.length),
    })).filter((c) => c.lessons.length);
    if (!courses.length) { $('spCommitMsg').innerHTML = '<span class="aa-err">Tick at least one topic.</span>'; return; }

    const generate = $('spGenerate').checked;
    $('spCommit').disabled = true; state.stopSources = false; show($('spStop'), true);
    $('spCommitMsg').textContent = 'Creating the curriculum and filing the sources…';
    try {
      const res = await api('/api/admin/sources/commit', {
        method: 'POST',
        body: {
          program: state.program, track, courses, generate,
          targetPerTopic: Number($('spCount').value) || 6, ...engineBody(),
        },
      });
      $('spCommitMsg').innerHTML = `<span class="aa-ok">Created ${res.topics} topics · filed ${res.filed} source${res.filed === 1 ? '' : 's'}${res.copied ? ` (+${res.copied} copies for lessons sharing a source)` : ''}.</span>`;
      if (res.job) {
        $('spStatus').textContent = 'Generating questions…';
        await runSteps(res.job.id, { bar: 'spBar', status: 'spStatus' }, 'stopSources');
      }
      if (!state.stopSources) {
        state.sourcePlan = null; state.libSel.clear();
        show($('spPlanBox'), false); show($('aeThink'), false);
        $('spGuidance').value = '';
      }
      await loadCatalog();
      await loadTranscripts();
    } catch (e) {
      $('spCommitMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
    }
    $('spCommit').disabled = false; show($('spStop'), false);
  }

  /* Compose's two AI cards, one at a time. The tree above them is the object being
   * edited and stays visible; these are just the two ways to change it. */
  /* The two merged stations. Questions = build the bank, then fix it; People =
   * enrol someone, then see how they are doing. Each was two rail entries for what
   * is one job, which is most of why the rail had seven. */
  function wireMergedStations() {
    if ($('qmBuildBtn')) {
      const set = (m) => {
        $('qmBuildBtn').setAttribute('aria-selected', String(m === 'build'));
        $('qmProofBtn').setAttribute('aria-selected', String(m !== 'build'));
        show($('qmBuild'), m === 'build');
        show($('qmProof'), m !== 'build');
      };
      $('qmBuildBtn').onclick = () => set('build');
      $('qmProofBtn').onclick = () => { set('proof'); loadFlags(); };
      set('build');
    }
    if ($('pmEnrolBtn')) {
      const set = (m) => {
        $('pmEnrolBtn').setAttribute('aria-selected', String(m === 'enrol'));
        $('pmTeamBtn').setAttribute('aria-selected', String(m !== 'enrol'));
        show($('pmEnrol'), m === 'enrol');
        show($('pmTeam'), m !== 'enrol');
      };
      $('pmEnrolBtn').onclick = () => set('enrol');
      $('pmTeamBtn').onclick = () => { set('team'); loadTeam(); };
      set('enrol');
    }
  }

  /* The three ways to change the curriculum, one at a time. The tree above them stays
   * visible throughout - it is the object being edited, they are just the tools. */
  function wireComposeModes() {
    if (!$('cmSrcBtn')) return;
    const panes = { src: ['cmSrcBtn', 'cmSrc'], build: ['cmBuildBtn', 'cmBuild'], edit: ['cmEditBtn', 'cmEdit'] };
    const set = (mode) => {
      for (const [key, [btn, pane]] of Object.entries(panes)) {
        $(btn).setAttribute('aria-selected', String(key === mode));
        show($(pane), key === mode);
      }
      // The scope picker counts what is in the library, which may have changed while
      // the admin was in another mode.
      if (mode === 'src') renderScopeOptions();
    };
    for (const [key, [btn]] of Object.entries(panes)) $(btn).onclick = () => set(key);
    set('src');
  }

  function wireTranscripts() {
    if ($('tSearch')) $('tSearch').oninput = renderTranscriptList;
    loadWatcherClients();
    wireWatcherAdd();
    // "Use this video": pull it INTO the library, unfiled, like any other source.
    // The transcript is fetched and stored server-side, so nothing large rides
    // through the browser. What you do with it next is a separate choice.
    $('wImport').onclick = async () => {
      const w = state.watcher;
      if (!w.video) return;
      $('wImport').disabled = true;
      $('wMsg').textContent = 'Pulling the transcript into the library…';
      try {
        const r = await api('/api/admin/transcripts/from-watcher', {
          method: 'POST',
          body: { program: state.program, client: w.client, channel: w.channel, video: w.video, title: w.title, folder: $('upFolder').value.trim() },
        });
        $('wMsg').innerHTML = `<span class="aa-ok">Added “${esc(r.title)}” to the library (${r.chars} chars), unfiled.</span>`;
        if ($('wDetails')) $('wDetails').open = false;
        await loadTranscripts();
      } catch (e) { $('wMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
      $('wImport').disabled = false;
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

  // Load (or re-load) one client's channels. Split out of loadWatcherClients so that adding a
  // source can refresh the picker in place and show what it just created.
  async function loadWatcherChannels(v, keepChannel) {
    state.watcher = { client: v, channel: '', video: null, title: '' };
    $('wImport').disabled = true;
    $('wAdd').disabled = false;
    $('wVideos').innerHTML = '';
    $('wChannels').innerHTML = '<button disabled>Loading…</button>';
    const { channels } = await api('/api/admin/watcher/channels?client=' + encodeURIComponent(v));
    const openChannel = async (cid) => {
      state.watcher.channel = cid; state.watcher.video = null; $('wImport').disabled = true;
      $('wVideos').innerHTML = '<button disabled>Loading…</button>';
      const { videos } = await api(`/api/admin/watcher/videos?client=${encodeURIComponent(v)}&channel=${encodeURIComponent(cid)}`);
      const withText = videos.filter((x) => x.hasTranscript);
      pick($('wVideos'), withText.map((x) => ({ value: x.id, ...x })), (i) => `${i.title}  ·  ${i.chars} chars`, (vid) => {
        const chosen = withText.find((x) => x.id === vid);
        state.watcher.video = vid; state.watcher.title = chosen ? chosen.title : '';
        $('wImport').disabled = false;
      });
    };
    pick($('wChannels'), channels.map((c) => ({ value: c.id, ...c })), (i) => `${i.title} (${i.transcriptCount}/${i.videoCount})`, openChannel);
    // After an add, drop straight into the source that was just created.
    if (keepChannel && channels.some((c) => c.id === keepChannel)) {
      const btn = $('wChannels').querySelector(`button[data-v="${keepChannel}"]`);
      if (btn) btn.setAttribute('aria-selected', 'true');
      await openChannel(keepChannel);
    }
  }

  async function loadWatcherClients() {
    try {
      const { clients } = await api('/api/admin/watcher/clients');
      pick($('wClients'), clients.map((c) => ({ value: c, name: c })), (i) => i.name,
        (v) => loadWatcherChannels(v));
    } catch (e) {
      $('wClients').innerHTML = `<button disabled style="color:#B3261E">${esc(e.message)}</button>`;
    }
  }

  /**
   * Add a source to Atrium's Watcher from here.
   *
   * Two shapes, because Atrium's own pipeline has two: a SINGLE link comes back with its text
   * already fetched (so we stage it for placement immediately — the whole point of doing this
   * here), while a whole channel/blog is registered first and its bodies arrive over a loop of
   * batch fetches, exactly as Atrium's Watcher tab does it.
   */
  function wireWatcherAdd() {
    const msg = (html) => { $('wAddMsg').innerHTML = html; };
    const busy = (on) => { $('wAdd').disabled = on || !state.watcher.client; $('wAddUrl').disabled = on; };
    // The source IS added by this point, so a failed picker refresh must not read as a failed add.
    const reshow = async (client, chan) => {
      try { await loadWatcherChannels(client, chan); } catch { /* the add still stands */ }
    };

    $('wAdd').onclick = async () => {
      const client = state.watcher.client;
      const url = $('wAddUrl').value.trim();
      const op = $('wAddOp').value;
      if (!client) { msg('<span class="aa-err">Pick a client above first.</span>'); return; }
      if (!url) { msg('<span class="aa-err">Paste a link first.</span>'); return; }
      busy(true);
      msg(op === 'add_video'
        ? 'Scraping the link…'
        : 'Listing everything on that source — this can take a minute…');
      let added;
      try {
        added = await api('/api/admin/watcher/add', { method: 'POST', body: { client, url, op } });
      } catch (e) { msg(`<span class="aa-err">${esc(e.message)}</span>`); busy(false); return; }

      if (op === 'add_video') {
        // Already fetched by Atrium — stage it for placement the same way "Use this video" does,
        // so pasting a link here goes all the way to "Analyze & place" in one step.
        $('wAddUrl').value = '';
        busy(false);
        if (added.blocked) {
          msg('<span class="aa-err">Saved to Watcher, but YouTube rate-limited the transcript pull. '
            + 'Try “Fetch missing” in Atrium later — nothing was lost.</span>');
        } else if (!added.transcript) {
          msg(`<span class="aa-err">Saved to Watcher, but no text came back${added.error ? ` (${esc(added.error)})` : ''}.</span>`);
        } else {
          // Straight into the library, so a pasted link becomes a source in one step.
          try {
            const r = await api('/api/admin/transcripts/from-watcher', {
              method: 'POST',
              body: { program: state.program, client, channel: added.channel, video: added.video_id, title: added.title, folder: $('upFolder').value.trim() },
            });
            msg(`<span class="aa-ok">Added “${esc(added.title || 'it')}” to Watcher (${added.words} words) and into the library, unfiled.</span>`);
            if (r) await loadTranscripts();
          } catch (e) {
            msg(`<span class="aa-err">Saved to Watcher, but adding it to the library failed: ${esc(e.message)}</span>`);
          }
        }
        await reshow(client, added.channel);
        return;
      }

      // A whole channel/blog: registered, now pull the bodies one batch at a time. Bounded on
      // every axis — a rate-limit, a stalled batch, or a runaway loop all end the run with a
      // message, because the archive is durable and the next attempt resumes where this stopped.
      const total = added.videos || added.posts || 0;
      const label = op === 'add_site' ? 'posts' : 'videos';
      msg(`Added “${esc(added.title || url)}” — ${total} ${label}. Pulling text…`);
      let left = total;
      for (let i = 0; i < 200; i += 1) {
        let step;
        try {
          step = await api('/api/admin/watcher/fetch', { method: 'POST', body: { client, channel: added.channel } });
        } catch (e) { msg(`<span class="aa-err">Added, but fetching text stopped: ${esc(e.message)}</span>`); break; }
        if (step.blocked) {
          msg(`<span class="aa-err">Added “${esc(added.title || url)}”. YouTube rate-limited the pull at `
            + `${step.done}/${step.total} — use Safe pull in Atrium, or try again later. Nothing was lost.</span>`);
          break;
        }
        msg(`Pulling text… ${step.done}/${step.total}`);
        if (step.remaining <= 0) { msg(`<span class="aa-ok">Added “${esc(added.title || url)}” — ${step.done} ${label} with text, ready to use above.</span>`); break; }
        if (step.remaining >= left) { // no progress this batch: stop rather than spin
          msg(`<span class="aa-err">Added, but ${step.remaining} ${label} still have no text. Finish them in Atrium.</span>`);
          break;
        }
        left = step.remaining;
      }
      $('wAddUrl').value = '';
      busy(false);
      await reshow(client, added.channel);
    };
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

  // Is this course / lesson / sub-lesson already in the live catalog? (Drives the
  // new/existing badges on the goal plan's per-lesson targeting fields.)
  const _goalHas = (pred) => (state.catalog || []).some(pred);
  const _courseIsNew = (c) => !c || !_goalHas((r) => (r.course || '') === c);
  const _lessonIsNew = (c, le) => !(c && le) || !_goalHas((r) => r.course === c && r.lesson === le);
  const _topicIsNew = (c, le, to) => !(c && le && to) || !_goalHas((r) => r.course === c && r.lesson === le && r.topic === to);
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
    const pick = pickedSource();
    if (!pick) {
      $('iMsg').innerHTML = '<span class="aa-err">Tick exactly one source in the library above to place it yourself.</span>';
      return;
    }
    // No `text`: commit resolves it from the id, and filing MOVES that doc rather
    // than writing a second copy of material the library already holds.
    state.ingest = {
      program: state.program, transcriptId: pick.id, title: pick.title,
      chars: pick.chars || 0, manual: true, topicRows: [],
    };
    $('iTrack').value = ''; $('iCourse').value = ''; $('iLesson').value = '';
    $('iTrackNew').innerHTML = ''; $('iCourseNew').innerHTML = ''; $('iLessonNew').innerHTML = '';
    populateIngestLists();
    $('iSummary').innerHTML = `Manual placement of <b>${esc(pick.title)}</b> · choose where this goes below. <span class="aa-note">· ${pick.chars || 0} chars</span>`;
    setIngestTopicsLabel(true);
    show($('iPullTopics'), true);
    resetGenerateToggle();
    renderIngestTopics();
    $('iBar').style.width = '0%';
    $('iStatus').textContent = '';
    $('iCommitMsg').textContent = '';
    show($('aeThink'), false); // no AI on the manual path — clear any prior thinking panel
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
      program: data.program, transcriptId: data.transcriptId, title: data.title,
      manual: false,
      topicRows: (data.topics || []).map((t) => ({ topic: t.topic, isNew: t.isNew, on: true })),
    };
    const pl = data.placement || {};
    $('iTrack').value = pl.track || '';
    $('iCourse').value = pl.course || '';
    $('iLesson').value = pl.lesson || '';
    $('iTrackNew').innerHTML = badge(pl.trackIsNew);
    $('iCourseNew').innerHTML = badge(pl.courseIsNew);
    $('iLessonNew').innerHTML = badge(pl.lessonIsNew);
    populateIngestLists();
    // Reading programs treat this as a BOOK: lesson = the title, topics = its key
    // points, and the book-shaped deck (title card → point cards) builds on commit.
    const bookNote = (state.programMeta && state.programMeta.category) === 'growth'
      ? ' <span class="aa-ok">· 📖 reading program — the book deck builds automatically on attach</span>' : '';
    $('iSummary').innerHTML = `<b>AI placement</b> · ${esc(data.summary || '')} <span class="aa-note">· ${data.chars} chars · source: ${esc(data.source)}</span>${bookNote}`;
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
    // "Place it myself": skip the AI call, open the review box for manual assignment.
    $('iManual').onclick = openManualPlacement;
    $('iPullTopics').onclick = autoloadLessonTopics;

    $('iPlan').onclick = async () => {
      const pick = pickedSource();
      if (!pick) { $('iMsg').innerHTML = '<span class="aa-err">Tick exactly one source in the library above.</span>'; return; }
      $('iPlan').disabled = true;
      $('iMsg').textContent = 'Reading the material and finding where it fits…';
      const panel = thinkPanel('aeThink'); panel.start();
      try {
        // Only the ID travels: the server reads the text it already stored, so a
        // 40k-character transcript never makes a round trip through the browser.
        const data = await streamSSE('/api/admin/ingest/plan/stream', {
          program: state.program, transcriptId: pick.id, ...engineBody(),
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
      try {
        const { job, generated, bookDeck } = await api('/api/admin/ingest/commit', {
          method: 'POST',
          body: {
            program: state.ingest.program || state.program,
            track, course, lesson,
            // The source is already stored; naming it by id files THAT doc in place.
            topics, transcriptId: state.ingest.transcriptId,
            generate,
            targetPerTopic: Number($('iCount').value) || 6,
            ...engineBody(),
          },
        });
        // Reading programs (Subject = personal growth / philosophy) auto-build the
        // book-shaped flashcard deck on commit — say so when it happened.
        const deckNote = bookDeck ? ' 📖 Book deck built (title card → point cards).' : '';
        if (generated && job) {
          $('iCommitMsg').innerHTML = '<span class="aa-ok">Attached. Generating questions…</span>';
          await runSteps(job.id, { bar: 'iBar', status: 'iStatus' }, 'stopIngest');
          $('iCommitMsg').innerHTML = `<span class="aa-ok">Done — transcript filed and questions added.${deckNote}</span>`;
        } else {
          $('iCommitMsg').innerHTML = topics.length
            ? `<span class="aa-ok">Attached — transcript and curriculum saved (no questions generated).${deckNote}</span>`
            : '<span class="aa-ok">Attached — transcript filed to that lesson.</span>';
        }
        show($('iPlanBox'), false);
        show($('aeThink'), false);
        state.ingest = null;
        state.libSel.clear();
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

  // Each lesson card can be re-targeted: pick an existing Course (unit) and Lesson
  // (autocompleted from the catalog — typing a new name creates it), and edit each
  // sub-lesson name. Defaults to the AI's new module; badges show new-vs-existing live.
  function renderGoalLessons() {
    const lessons = (state.goal && state.goal.lessons) || [];
    const cat = state.catalog || [];
    const track = ($('gpTrack').value || '').trim().toLowerCase();
    const courseOpts = [...new Set(cat.filter((r) => !track || (r.track || '').toLowerCase() === track).map((r) => r.course))].filter(Boolean).sort(_num);
    const lessonsIn = (course) => [...new Set(cat.filter((r) => r.course === course).map((r) => r.lesson))].filter(Boolean).sort(_num);
    const opts = (vals) => vals.map((v) => `<option value="${esc(v)}"></option>`).join('');
    const courseDL = `<datalist id="gpCardCourseList">${opts(courseOpts)}</datalist>`;

    $('gpLessons').innerHTML = courseDL + (lessons.length
      ? lessons.map((l, li) => {
        const c = l.course || '';
        return `
        <div style="margin:0 0 10px;padding:8px 10px;border:1px solid #E7E8EE;border-radius:8px">
          <div class="aa-cols" style="margin-bottom:6px">
            <div><div class="aa-field-label" style="font-size:11px">Course (unit) <span data-cnew="${li}">${badge(_courseIsNew(c))}</span></div>
              <input type="text" data-gc="${li}" list="gpCardCourseList" autocomplete="off" value="${esc(c)}" style="width:100%" /></div>
            <div><div class="aa-field-label" style="font-size:11px">Lesson <span data-lnew="${li}">${badge(_lessonIsNew(c, l.lesson))}</span></div>
              <input type="text" data-gl="${li}" list="gpLeList${li}" autocomplete="off" value="${esc(l.lesson)}" style="width:100%" /><datalist id="gpLeList${li}">${opts(lessonsIn(c))}</datalist></div>
          </div>
          ${l.rationale ? `<div class="aa-note" style="margin-bottom:6px">${esc(l.rationale)}</div>` : ''}
          ${l.topics.map((t, ti) => `<label style="display:flex;gap:8px;align-items:center;padding:3px 0">
            <input type="checkbox" data-li="${li}" data-ti="${ti}" ${t.on ? 'checked' : ''} style="width:auto" title="Uncheck to skip this sub-lesson" />
            <input type="text" data-gt="${li}" data-tti="${ti}" value="${esc(t.topic)}" style="flex:1 1 auto;min-width:0" />
            <span data-tnew="${li}-${ti}" style="flex:0 0 auto">${badge(_topicIsNew(c, l.lesson, t.topic))}</span>
          </label>`).join('')}
        </div>`;
      }).join('')
      : '<span class="aa-note">No lessons — try drafting again.</span>');

    const g = $('gpLessons');
    g.querySelectorAll('input[data-gc]').forEach((inp) => { inp.oninput = () => {
      const li = Number(inp.dataset.gc);
      state.goal.lessons[li].course = inp.value.trim();
      const dl = $('gpLeList' + li); if (dl) dl.innerHTML = opts(lessonsIn(inp.value.trim()));
      refreshCardBadges(li);
    }; });
    g.querySelectorAll('input[data-gl]').forEach((inp) => { inp.oninput = () => {
      const li = Number(inp.dataset.gl);
      state.goal.lessons[li].lesson = inp.value.trim();
      refreshCardBadges(li);
    }; });
    g.querySelectorAll('input[data-gt]').forEach((inp) => { inp.oninput = () => {
      state.goal.lessons[Number(inp.dataset.gt)].topics[Number(inp.dataset.tti)].topic = inp.value.trim();
      refreshCardBadges(Number(inp.dataset.gt));
    }; });
    g.querySelectorAll('input[type=checkbox][data-li]').forEach((cb) => {
      cb.onchange = () => { state.goal.lessons[Number(cb.dataset.li)].topics[Number(cb.dataset.ti)].on = cb.checked; };
    });
  }

  // Update just one card's new/existing badges in place (no re-render — keeps focus
  // while typing). Reads the card's current course/lesson/topic values from state.
  function refreshCardBadges(li) {
    const l = state.goal && state.goal.lessons[li]; if (!l) return;
    const g = $('gpLessons'); const c = l.course || '';
    const set = (sel, isNew) => { const el = g.querySelector(sel); if (el) el.innerHTML = badge(isNew); };
    set(`[data-cnew="${li}"]`, _courseIsNew(c));
    set(`[data-lnew="${li}"]`, _lessonIsNew(c, l.lesson));
    l.topics.forEach((t, ti) => set(`[data-tnew="${li}-${ti}"]`, _topicIsNew(c, l.lesson, t.topic)));
  }

  function renderGoalPlan(data) {
    state.goal = {
      program: data.program, goal: $('gpGoal').value.trim(), reference: data.reference || '',
      assumedKnowledge: data.assumedKnowledge || [],
      // The module's default course — each lesson can be re-targeted to a different one.
      course: data.course || '',
      lessons: (data.lessons || []).map((l) => ({
        lesson: l.lesson, course: data.course || '', rationale: l.rationale, isNew: l.lessonIsNew,
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
    $('gpTrack').oninput = () => { populateGoalLists(); refreshGoalBadges(); if (state.goal) renderGoalLessons(); };
    // Changing the module's course cascades to every lesson still on the old default,
    // so "file the whole module into an existing unit" is one edit — then per-lesson
    // overrides still win. Lessons already retargeted elsewhere are left alone.
    $('gpCourse').oninput = () => {
      if (state.goal) {
        const prev = state.goal.course || '';
        const val = $('gpCourse').value.trim();
        state.goal.lessons.forEach((l) => { if ((l.course || '') === prev) l.course = val; });
        state.goal.course = val;
        renderGoalLessons();
      }
      refreshGoalBadges();
    };
    $('gpStop').onclick = () => { state.stopGoal = true; $('gpStatus').textContent = 'Stopping after this topic…'; };

    $('gpDraft').onclick = async () => {
      const goal = $('gpGoal').value.trim();
      if (!goal) { $('gpMsg').innerHTML = '<span class="aa-err">Describe what you want to learn first.</span>'; return; }
      $('gpDraft').disabled = true;
      $('gpMsg').textContent = 'Reading your progress and drafting a plan…';
      const panel = thinkPanel('aeThink'); panel.start();
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
      const defTrack = $('gpTrack').value.trim(), defCourse = $('gpCourse').value.trim();
      // Each lesson carries its own course/lesson (defaulting to the module's); topics
      // may have been renamed. Server slots them under those exact nodes.
      const lessons = state.goal.lessons
        .map((l) => ({
          track: defTrack,
          course: (l.course || '').trim() || defCourse,
          lesson: (l.lesson || '').trim(),
          topics: l.topics.filter((t) => t.on).map((t) => (t.topic || '').trim()).filter(Boolean),
        }))
        .filter((l) => l.track && l.course && l.lesson && l.topics.length);
      if (!lessons.length) { $('gpCommitMsg').innerHTML = '<span class="aa-err">Pick at least one topic (each lesson needs a course and lesson name).</span>'; return; }
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
            transcriptIds: [...$('gpSources').querySelectorAll('input[data-tid]:checked')].map((c) => c.dataset.tid),
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
          // Phase 2 handoff: offer to chart a roadmap over the content just built.
          const chartGoal = (state.goal && state.goal.goal) || '';
          const chartTitle = $('gpCourse').value.trim();
          const chartBtn = $('gpChartBtn');
          if (chartBtn) { show(chartBtn, true); chartBtn.onclick = () => startRoadmapFromGoal(chartTitle, chartGoal); }
          show($('gpPlanBox'), false);
          show($('aeThink'), false);
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

  /* -------------------------------- roadmaps ------------------------------- */
  // A roadmap is a curated PATH over existing topics: the AI SELECTS + ORDERS
  // topics from this program's catalog into stages toward a goal, and we let the
  // admin edit the result before saving. Content generation is NOT here — the
  // goal builder (Compose) does that; a roadmap only re-groups. Phase 2 of the
  // goal flow hands off here via startRoadmapFromGoal().
  let _roadmapsCache = [];

  function switchToTab(panel) {
    const tab = document.querySelector(`.aa-tab[data-panel="${panel}"]`);
    if (tab) tab.click();
  }

  async function loadRoadmaps() {
    const rp = $('rmProgName'); if (rp) rp.textContent = state.program;
    const list = $('rmList');
    if (!list) return;
    list.textContent = 'Loading…';
    try {
      // No ?program= — list EVERY roadmap. The old program-scoped list made a
      // roadmap from another program look deleted (the page's default program is
      // the effective account's first enrollment, rarely the one you charted in).
      const { roadmaps } = await api('/api/admin/roadmaps');
      renderRoadmapAdminList(roadmaps);
      const rr = $('railRoadmaps'); if (rr) rr.textContent = roadmaps.length ? String(roadmaps.length) : '';
    } catch (e) { list.textContent = 'Error: ' + e.message; }
  }

  function renderRoadmapAdminList(roadmaps) {
    _roadmapsCache = roadmaps || [];
    $('rmCount').textContent = `— ${_roadmapsCache.length} roadmap${_roadmapsCache.length === 1 ? '' : 's'}`;
    const list = $('rmList');
    if (!_roadmapsCache.length) { list.innerHTML = '<div class="aa-note">No roadmaps yet — chart one above.</div>'; return; }
    list.innerHTML = _roadmapsCache.map((r) => `
      <div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #E7E8EE">
        <div style="flex:1;min-width:0">
          <b>${esc(r.title)}</b> <span class="aa-chip" style="margin-left:4px">${esc(r.program || '')}</span> <span class="aa-note">· ${r.stages.length} stage${r.stages.length === 1 ? '' : 's'} · ${r.topicCount} topics · ${r.audience === 'everyone' ? 'everyone' : 'this program'}</span>
          <div class="aa-note" style="margin-top:2px">${esc(r.summary || r.goal || '')}</div>
        </div>
        <button class="btn" data-assign="${esc(r.id)}" style="padding:3px 10px;font-size:12px">Assign</button>
        <button class="btn" data-edit="${esc(r.id)}" style="padding:3px 10px;font-size:12px">Edit</button>
        <button class="btn" data-del="${esc(r.id)}" style="padding:3px 10px;font-size:12px">Delete</button>
      </div>`).join('');
  }

  // Assign a roadmap to workers: a soft label + auto-populates their Mastery Engine
  // (no exclusive access — the bank is open to all). People come from the directory.
  let _assignPeople = null;
  async function openAssignPanel(roadmapId) {
    const rm = _roadmapsCache.find((x) => x.id === roadmapId);
    if (!rm) return;
    if (!_assignPeople || !_assignPeople.length) {
      // Cache only a NON-EMPTY directory — a transient Sentinel failure used to
      // cache [] forever, leaving the picker empty for the rest of the session.
      try { const { people } = await api('/api/admin/people'); _assignPeople = people || []; }
      catch { _assignPeople = []; }
    }
    let ov = $('rmAssignOverlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'rmAssignOverlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(14,21,18,.42);padding:20px';
      document.body.appendChild(ov);
      ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
    }
    const peopleHtml = _assignPeople.length
      ? _assignPeople.map((p) => `<label style="display:flex;gap:8px;align-items:center;padding:6px 4px;border-bottom:1px solid #F0F1F4;cursor:pointer"><input type="checkbox" value="${esc(p.email)}" style="width:auto"><span>${esc(p.name || p.email)} <span class="aa-note">${esc(p.email)}</span></span></label>`).join('')
      : '<div class="aa-note" style="padding:8px">No directory people found — they appear once they\'ve signed in.</div>';
    ov.innerHTML = `<div style="background:#fff;border-radius:16px;max-width:520px;width:100%;max-height:80vh;display:flex;flex-direction:column;gap:12px;padding:20px;box-shadow:0 20px 60px rgba(14,21,18,.3)">
      <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Assign “${esc(rm.title)}”</h3><button class="btn" id="rmAssignClose" style="padding:2px 9px">✕</button></div>
      <p class="aa-note" style="margin:0">Assigned people get an <b>Assigned</b> badge and this roadmap's tracks auto-appear in their Mastery Engine. Everyone still has access to every roadmap regardless.</p>
      <div style="overflow-y:auto;flex:1;border:1px solid #E7E8EE;border-radius:10px;padding:4px 10px">${peopleHtml}</div>
      <div style="display:flex;gap:8px;align-items:center"><button class="btn btn-primary" id="rmAssignGo">Assign selected</button><button class="btn" id="rmUnassignGo">Unassign selected</button><span id="rmAssignMsg" class="aa-note"></span></div>
    </div>`;
    $('rmAssignClose').onclick = () => ov.remove();
    const doAssign = async (action) => {
      const emails = [...ov.querySelectorAll('input[type=checkbox]:checked')].map((c) => c.value);
      if (!emails.length) { $('rmAssignMsg').innerHTML = '<span class="aa-err">Pick at least one person.</span>'; return; }
      $('rmAssignMsg').textContent = action === 'unassign' ? 'Unassigning…' : 'Assigning…';
      try {
        const r = await api(`/api/admin/roadmaps/${encodeURIComponent(roadmapId)}/assign`, { method: 'POST', body: { emails, action } });
        $('rmAssignMsg').innerHTML = `<span class="aa-ok">${action === 'unassign' ? 'Unassigned' : 'Assigned'} ${r.count} ${r.count === 1 ? 'person' : 'people'}.</span>`;
      } catch (e) { $('rmAssignMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
    };
    $('rmAssignGo').onclick = () => doAssign('assign');
    $('rmUnassignGo').onclick = () => doAssign('unassign');
  }

  async function roadmapDraft() {
    const goal = $('rmGoal').value.trim();
    const title = $('rmTitle').value.trim();
    if (!goal) { $('rmMsg').innerHTML = '<span class="aa-err">Describe the goal first.</span>'; return; }
    $('rmDraft').disabled = true;
    $('rmMsg').textContent = 'Selecting and ordering topics…';
    const panel = thinkPanel('aeThink'); panel.start();
    try {
      const data = await streamSSE('/api/admin/roadmap/plan/stream', {
        program: state.program, goal, title, reference: $('rmRef').value.trim(), ...engineBody(),
      }, { onThinking: panel.thinking, onContent: panel.content });
      panel.done('Roadmap ready');
      state.roadmap = {
        id: null, title: data.title || title, summary: data.summary || '', goal,
        program: data.program || state.program, audience: $('rmAudience').value,
        stages: data.stages || [], gaps: data.gaps || [],
      };
      if (data.title) $('rmTitle').value = data.title;
      renderRoadmapReview();
      const topics = (data.stages || []).reduce((n, s) => n + (s.items ? s.items.length : 0), 0);
      $('rmMsg').innerHTML = `<span class="aa-ok">Charted ${data.stages.length} stage${data.stages.length === 1 ? '' : 's'} · ${topics} topics — review, then save.</span>`;
    } catch (e) {
      panel.fail('Draft failed');
      $('rmMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
    }
    $('rmDraft').disabled = false;
  }

  function renderRoadmapReview() {
    const rm = state.roadmap; if (!rm) return;
    $('rmSummary').value = rm.summary || '';
    const gaps = rm.gaps || [];
    show($('rmGapsWrap'), gaps.length > 0);
    $('rmGaps').innerHTML = gaps
      .map((g) => `<span class="aa-note" style="background:#FBECEC;color:#B4413B;border-radius:12px;padding:2px 10px">${esc(g)}</span>`).join('');
    $('rmStages').innerHTML = (rm.stages || []).length
      ? rm.stages.map((s, si) => renderRmStage(s, si)).join('')
      : '<span class="aa-note">No stages — try drafting again.</span>';
    show($('rmPlanBox'), true);
  }

  function renderRmStage(s, si) {
    const items = (s.items || []).map((it, ii) => {
      const lvl = it.level || 'topic';
      const name = lvl === 'topic' ? it.topic : (it.lesson || it.course || it.track);
      const kind = lvl === 'topic' ? ''
        : ` <span style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;background:#EEF0F6;color:#6B7280;border-radius:8px;padding:1px 6px">${esc(lvl)}</span>`;
      const path = (lvl === 'topic' ? [it.course, it.lesson]
        : lvl === 'lesson' ? [it.track, it.course]
        : lvl === 'course' ? [it.track] : []).filter(Boolean).join(' › ');
      return `
      <div data-si="${si}" data-ii="${ii}" style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-top:1px solid #F0F1F4">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600">${esc(name || '(unnamed)')}${kind}</div>
          ${path ? `<div class="aa-note">${esc(path)}</div>` : ''}
          <input type="text" data-f="itemNote" data-si="${si}" data-ii="${ii}" value="${esc(it.note || '')}" placeholder="note (optional)" style="width:100%;margin-top:3px;font-size:12px" />
        </div>
        <div style="display:flex;flex-direction:column;gap:2px">
          <button class="btn" data-act="itemUp" data-si="${si}" data-ii="${ii}" style="padding:1px 7px;font-size:12px" title="Move up">↑</button>
          <button class="btn" data-act="itemDown" data-si="${si}" data-ii="${ii}" style="padding:1px 7px;font-size:12px" title="Move down">↓</button>
          <button class="btn" data-act="itemDel" data-si="${si}" data-ii="${ii}" style="padding:1px 7px;font-size:12px" title="Remove">✕</button>
        </div>
      </div>`;
    }).join('');
    return `<div style="border:1px solid #E7E8EE;border-radius:10px;padding:10px 12px;margin-bottom:10px">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
        <span style="font-weight:800;color:#16a34a;font-variant-numeric:tabular-nums">${String(si + 1).padStart(2, '0')}</span>
        <input type="text" data-f="stageTitle" data-si="${si}" value="${esc(s.title)}" style="flex:1;font-weight:700" />
        <button class="btn" data-act="stageUp" data-si="${si}" style="padding:2px 8px;font-size:12px" title="Move up">↑</button>
        <button class="btn" data-act="stageDown" data-si="${si}" style="padding:2px 8px;font-size:12px" title="Move down">↓</button>
        <button class="btn" data-act="stageDel" data-si="${si}" style="padding:2px 8px;font-size:12px">Remove</button>
      </div>
      <input type="text" data-f="stageSummary" data-si="${si}" value="${esc(s.summary || '')}" placeholder="one line: what they can do after this stage" style="width:100%;margin-bottom:6px;font-size:13px" />
      <div class="aa-note">${(s.items || []).length} item${(s.items || []).length === 1 ? '' : 's'}</div>
      ${items}
    </div>`;
  }

  async function saveRoadmap() {
    const rm = state.roadmap; if (!rm) return;
    const title = $('rmTitle').value.trim();
    if (!title) { $('rmSaveMsg').innerHTML = '<span class="aa-err">Give the roadmap a title.</span>'; return; }
    if (!rm.stages || !rm.stages.length) { $('rmSaveMsg').innerHTML = '<span class="aa-err">The roadmap has no stages.</span>'; return; }
    $('rmSave').disabled = true; $('rmSaveMsg').textContent = 'Saving…';
    try {
      await api('/api/admin/roadmaps', { method: 'POST', body: {
        id: rm.id || undefined, title, goal: $('rmGoal').value.trim(),
        summary: $('rmSummary').value.trim(),
        // The roadmap's OWN program (set at draft/edit time) — posting the page's
        // current program silently re-stamped an edited roadmap into it.
        program: rm.program || state.program,
        audience: $('rmAudience').value, stages: rm.stages, source: rm.id ? 'admin-edit' : 'goal',
      } });
      $('rmSaveMsg').innerHTML = '<span class="aa-ok">Saved — learners see it in the app\'s Roadmaps tab.</span>';
      state.roadmap = null; show($('rmPlanBox'), false);
      await loadRoadmaps();
    } catch (e) { $('rmSaveMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
    $('rmSave').disabled = false;
  }

  function editRoadmap(id) {
    const r = _roadmapsCache.find((x) => x.id === id);
    if (!r) return;
    state.roadmap = {
      id: r.id, title: r.title, summary: r.summary, goal: r.goal, program: r.program,
      audience: r.audience, stages: JSON.parse(JSON.stringify(r.stages || [])), gaps: [],
    };
    $('rmTitle').value = r.title || '';
    $('rmGoal').value = r.goal || '';
    $('rmAudience').value = r.audience === 'everyone' ? 'everyone' : 'program';
    renderRoadmapReview();
    $('rmMsg').textContent = 'Editing an existing roadmap. Re-draft to re-select topics, or edit the stages directly.';
    $('rmPlanBox').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function deleteRoadmapAdmin(id) {
    if (!confirm('Delete this roadmap? The topics it points to are not affected.')) return;
    try { await api('/api/admin/roadmaps/' + encodeURIComponent(id), { method: 'DELETE' }); await loadRoadmaps(); }
    catch (e) { alert('Error: ' + e.message); }
  }

  /* ---------------------------------- team ---------------------------------- */
  // The Academy home base: one row per Sentinel person — progress, accuracy,
  // attempts, Speaker-Mode explains, lifetime AI spend, and the per-person AI
  // engine allowlist (default Kimi-only; enforced server-side, this is the view).

  const AI_LABELS = {
    kimi: 'Kimi', gemini: 'Gemini', deepseek: 'DeepSeek',
    anthropic: 'Claude', ollama: 'Ollama (local)', lmstudio: 'LM Studio (local)',
  };
  const fmtUsd = (n) => '$' + (n >= 1 ? n.toFixed(2) : (n || 0).toFixed(4));
  const fmtTok = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n || 0);

  function wireTeam() {
    const refresh = $('tmRefresh'), search = $('tmSearch'), list = $('tmList');
    if (!list) return;
    if (refresh) refresh.onclick = () => loadTeam();
    if (search) search.oninput = () => renderTeam();
    // One delegated handler: ✎ opens a row's engine editor, Save posts it, Cancel re-renders.
    list.addEventListener('click', async (e) => {
      const edit = e.target.closest('[data-tm-edit]');
      if (edit) { renderTeam(edit.dataset.tmEdit); return; }
      const cancel = e.target.closest('[data-tm-cancel]');
      if (cancel) { renderTeam(); return; }
      const save = e.target.closest('[data-tm-save]');
      if (save) {
        const email = save.dataset.tmSave;
        const providers = [...list.querySelectorAll(`input[data-tm-prov="${CSS.escape(email)}"]:checked`)].map((c) => c.value);
        save.disabled = true;
        try {
          const r = await api('/api/admin/ai-access', { method: 'POST', body: { email, providers } });
          const row = state.team.find((t) => t.email === email);
          if (row) { row.aiProviders = r.providers; row.aiConfigured = true; }
          $('tmMsg').innerHTML = `<span class="aa-ok">Saved ${esc(email)} — takes effect within a minute.</span>`;
          renderTeam();
        } catch (err) {
          $('tmMsg').innerHTML = `<span class="aa-err">${esc(err.message)}</span>`;
          save.disabled = false;
        }
      }
    });
  }

  async function loadTeam() {
    const list = $('tmList');
    if (!list) return;
    list.textContent = 'Loading team…';
    $('tmMsg').textContent = '';
    try {
      const { team, providers, error } = await api('/api/admin/team');
      state.team = team || [];
      state.teamProviders = providers || Object.keys(AI_LABELS);
      if (error) $('tmMsg').innerHTML = `<span class="aa-err">Directory: ${esc(error)}</span>`;
      const rt = $('railTeam'); if (rt) rt.textContent = state.team.length ? String(state.team.length) : '';
      renderTeam();
    } catch (e) { list.innerHTML = `<span class="aa-err">Error: ${esc(e.message)}</span>`; }
  }

  function renderTeam(editingEmail) {
    const list = $('tmList');
    if (!list) return;
    const qy = ($('tmSearch')?.value || '').trim().toLowerCase();
    const rows = state.team.filter((t) => !qy
      || t.email.includes(qy) || (t.name || '').toLowerCase().includes(qy) || (t.role || '').toLowerCase().includes(qy));
    if (!rows.length) { list.innerHTML = '<div class="aa-note">Nobody matches.</div>'; return; }
    const engineCell = (t) => {
      if (t.email === editingEmail) {
        const boxes = state.teamProviders.map((p) => `
          <label style="text-transform:none;font-weight:600;color:var(--text);letter-spacing:0;display:flex;gap:7px;align-items:center;font-size:12px;padding:2px 0">
            <input type="checkbox" value="${esc(p)}" data-tm-prov="${esc(t.email)}" style="width:auto" ${t.aiProviders.includes(p) ? 'checked' : ''}>
            ${esc(AI_LABELS[p] || p)}
          </label>`).join('');
        return `<div>${boxes}
          <div style="display:flex;gap:6px;margin-top:6px">
            <button class="btn btn-primary" data-tm-save="${esc(t.email)}" style="padding:2px 10px;font-size:12px">Save</button>
            <button class="btn" data-tm-cancel="1" style="padding:2px 10px;font-size:12px">Cancel</button>
          </div>
          <div class="aa-note" style="margin-top:4px">Empty = back to Kimi-only. Admins are never restricted.</div></div>`;
      }
      const chips = t.aiProviders.map((p) => `<span class="aa-chip">${esc(AI_LABELS[p] || p)}</span>`).join(' ');
      const def = t.aiConfigured ? '' : ' <span class="aa-note">(default)</span>';
      return `${chips}${def} <button class="btn" data-tm-edit="${esc(t.email)}" style="padding:1px 8px;font-size:12px" title="Edit engine access">✎</button>`;
    };
    list.innerHTML = `<div style="overflow-x:auto"><table class="aa-table">
      <thead><tr><th>Person</th><th>Progress</th><th>Accuracy</th><th>Attempts</th><th>Explained</th><th>AI spend</th><th>Engines</th></tr></thead>
      <tbody>${rows.map((t) => `
        <tr>
          <td style="min-width:170px"><b>${esc(t.name)}</b><div class="aa-note">${esc(t.email)} · ${esc(t.role || '')}</div>
            <div class="aa-note">${t.programs.map((p) => esc(p.name)).join(', ') || '—'}</div></td>
          <td style="min-width:130px">
            <div class="aa-bar" style="max-width:120px"><i style="width:${t.progressPct}%"></i></div>
            <div class="aa-note">${t.progressPct}% · ${t.topicsPracticed}/${t.topicsTotal} topics</div></td>
          <td>${t.accuracy == null ? '—' : t.accuracy + '%'}</td>
          <td>${t.attempts}</td>
          <td>${t.explains}</td>
          <td style="min-width:110px">${fmtUsd(t.usage.costUsd)}<div class="aa-note">${t.usage.calls} calls · ${fmtTok(t.usage.inputTokens + t.usage.outputTokens)} tok</div></td>
          <td style="min-width:150px">${engineCell(t)}</td>
        </tr>`).join('')}</tbody>
    </table></div>`;
  }

  // Phase 2 of the goal flow: jump here from the goal pane with the goal pre-filled
  // and auto-draft the path over the content just built.
  function startRoadmapFromGoal(title, goal) {
    switchToTab('roadmaps');
    $('rmTitle').value = title || '';
    $('rmGoal').value = goal || '';
    $('rmAudience').value = 'program';
    roadmapDraft();
  }

  function wireRoadmaps() {
    const draft = $('rmDraft'); if (draft) draft.onclick = roadmapDraft;
    const save = $('rmSave'); if (save) save.onclick = saveRoadmap;
    const summ = $('rmSummary'); if (summ) summ.oninput = () => { if (state.roadmap) state.roadmap.summary = summ.value; };
    const stages = $('rmStages');
    if (stages) {
      stages.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        const rm = state.roadmap; if (!rm) return;
        const si = Number(b.dataset.si), ii = Number(b.dataset.ii), act = b.dataset.act;
        const st = rm.stages;
        if (act === 'stageUp' && si > 0) { [st[si - 1], st[si]] = [st[si], st[si - 1]]; }
        else if (act === 'stageDown' && si < st.length - 1) { [st[si + 1], st[si]] = [st[si], st[si + 1]]; }
        else if (act === 'stageDel') { st.splice(si, 1); }
        else if (act === 'itemUp' && ii > 0) { const its = st[si].items; [its[ii - 1], its[ii]] = [its[ii], its[ii - 1]]; }
        else if (act === 'itemDown') { const its = st[si].items; if (ii < its.length - 1) [its[ii + 1], its[ii]] = [its[ii], its[ii + 1]]; }
        else if (act === 'itemDel') { st[si].items.splice(ii, 1); if (!st[si].items.length) st.splice(si, 1); }
        else return;
        renderRoadmapReview();
      });
      stages.addEventListener('input', (e) => {
        const f = e.target.closest('[data-f]'); if (!f) return;
        const rm = state.roadmap; if (!rm) return;
        const si = Number(f.dataset.si), ii = Number(f.dataset.ii);
        if (f.dataset.f === 'stageTitle') rm.stages[si].title = f.value;
        else if (f.dataset.f === 'stageSummary') rm.stages[si].summary = f.value;
        else if (f.dataset.f === 'itemNote') rm.stages[si].items[ii].note = f.value;
      });
    }
    const list = $('rmList');
    if (list) list.addEventListener('click', (e) => {
      const asg = e.target.closest('[data-assign]'); if (asg) { openAssignPanel(asg.dataset.assign); return; }
      const ed = e.target.closest('[data-edit]'); if (ed) { editRoadmap(ed.dataset.edit); return; }
      const del = e.target.closest('[data-del]'); if (del) { deleteRoadmapAdmin(del.dataset.del); }
    });
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
      $('gStatus').innerHTML = '<span class="aa-err">For Lessons, pick at least one grain (sub-lesson or lesson).</span>'; return;
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
        // Pre-build (cache) the study guides for the scope, in parallel. Review
        // and Lesson merged into ONE guide per section (2026-08-10), so either
        // checkbox now builds the same thing and ticking both is not double work.
        $('gStatus').textContent = 'Pre-building Lessons in parallel…';
        const r = await api('/api/admin/study-guides/build', {
          method: 'POST',
          body: {
            program: state.program, track, course, ...(lesson ? { lesson } : {}), ...(topic ? { topic } : {}),
            doLesson: true,
            grains: { topic: $('gGrainTopic').checked, lesson: $('gGrainLesson').checked },
            force: $('gForceGuides').checked,
          },
        });
        const parts = [];
        if (r.built) parts.push(`${r.built} built`);
        // How many were written FROM the authored lesson document rather than
        // inferred from the question bank. The single biggest quality split, and
        // the only place it is visible.
        if (r.grounded) parts.push(`${r.grounded} grounded on source docs`);
        if (r.skipped) parts.push(`${r.skipped} already cached`);
        if (r.failed) parts.push(`${r.failed} failed`);
        $('gStatus').innerHTML = `<span class="aa-ok">Lessons: ${parts.join(', ') || 'nothing to do'} `
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
  const STEP_POLL_MS = 8000;      // how often to re-check the job doc after a dropped step
  const STEP_POLL_MAX_MS = 900000; // 15 min — well past the slowest observed topic (~5 min)

  /* A dropped connection is NOT a failed step. The server keeps generating and banks the
     result, so firing a second /step here would put TWO steps on one job and both would
     shift the same topic off the queue — one topic generated twice, the next skipped.
     So watch the job doc until the in-flight step lands, then let the loop carry on.
     Returns null if the admin pressed Stop while we waited. */
  async function waitOutStep(id, before, els, stopKey) {
    const from = (before && before.progress && before.progress.topicsDone) || 0;
    const started = Date.now();
    for (;;) {
      if (state[stopKey]) return null;
      const waited = Math.round((Date.now() - started) / 1000);
      if (waited * 1000 > STEP_POLL_MAX_MS) {
        throw new Error('Lost the connection and the step never landed. Press Resume to pick it back up.');
      }
      $(els.status).textContent =
        `Connection dropped — the step is still running on the server, waiting for it to land… (${waited}s)`;
      await new Promise((r) => setTimeout(r, STEP_POLL_MS));
      let job;
      try { ({ job } = await api(`/api/admin/genjobs/${id}`)); } catch { continue; } // the poll can drop too
      if (job.status === 'done' || job.status === 'cancelled') return job;
      if (((job.progress || {}).topicsDone || 0) > from) return job;
    }
  }

  async function runSteps(id, els = { bar: 'gBar', status: 'gStatus', out: 'gOut' }, stopKey = 'stop') {
    // Baseline for waitOutStep: it must know topicsDone as it was BEFORE the step it is
    // waiting on, and a Resume starts mid-run, so a fresh loop reads it once up front.
    let last = null;
    try { ({ job: last } = await api(`/api/admin/genjobs/${id}`)); } catch { /* the step will surface it */ }
    for (;;) {
      if (state[stopKey]) { $(els.status).textContent = 'Stopped. Press Start to resume where it left off.'; return; }
      let job;
      try {
        // SSE, not a plain POST: one step is a single thinking-model call that can run
        // minutes, and a POST sending no bytes that whole time gets cut by whatever sits
        // in front of Cloud Run. The stream's heartbeat keeps the socket alive.
        ({ job } = await streamSSE(`/api/admin/genjobs/${id}/step`, {}));
      } catch (e) {
        // fetch reports transport failures as TypeError; anything else is a real error
        // the server sent us in-band, and re-trying it would just fail the same way.
        if (!(e instanceof TypeError)) throw e;
        job = await waitOutStep(id, last, els, stopKey);
        if (!job) { $(els.status).textContent = 'Stopped. Press Start to resume where it left off.'; return; }
      }
      last = job;
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

  /* Runs are listed newest-first with identical-looking batch tags, so the date is
     the only way to tell one from another. Year only when it isn't the current one. */
  function fmtRunWhen(ms) {
    if (!ms) return '';
    const d = new Date(ms);
    const opts = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    return d.toLocaleString([], opts);
  }

  async function loadJobs() {
    try {
      const { jobs } = await api('/api/admin/genjobs?' + q());
      if (!jobs.length) { $('gJobs').textContent = 'No runs yet.'; return; }
      $('gJobs').innerHTML = jobs.map((j) => {
        const p = j.progress || {};
        const when = fmtRunWhen(j.createdAtMs);
        // The stepper is browser-driven (lib/genjobs.js): a queued/stalled run only
        // advances while some tab calls /step. Offer Resume whenever there's work left.
        const resumable = (j.status === 'queued' || j.status === 'running') && j.remaining > 0;
        return `<div style="padding:6px 0;border-bottom:1px solid #E7E8EE">
          <b>${esc(j.batchTag)}</b> — ${esc(j.status)} · ${p.questionsWritten || 0} questions · $${(p.costUsd || 0).toFixed(4)}${when ? ` · <span style="color:#6B7280">${esc(when)}</span>` : ''}
          ${resumable ? `<button class="btn" data-resume="${esc(j.id)}" style="padding:3px 9px;font-size:12px;margin-left:8px">Resume</button>` : ''}
          <button class="btn" data-batch="${esc(j.batchTag)}" style="padding:3px 9px;font-size:12px;margin-left:8px">Delete batch</button>
        </div>`;
      }).join('');
      $('gJobs').querySelectorAll('button[data-resume]').forEach((b) => {
        b.onclick = async () => {
          // Re-attach THIS tab as the driver where the last one left off — the queue in
          // the job doc is the resume point, so no topic is redone or skipped.
          $('gJobs').querySelectorAll('button[data-resume]').forEach((x) => { x.disabled = true; });
          state.stop = false;
          show($('gStop'), true);
          try {
            await runSteps(b.dataset.resume);
          } catch (e) {
            $('gStatus').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
          }
          show($('gStop'), false);
          await loadJobs();
          await loadCatalog();
        };
      });
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

  /* ---------------------- questions: read + edit + delete ------------------- */
  /*
   * ONE question editor, two homes: the flag list (Proof) and the browser under
   * it. Both render a question with qBodyHtml and swap in openQuestionEditor on
   * demand, so a fix looks and behaves the same however you arrived at it.
   *
   * The answer is a RADIO over the options on purpose. /api/questions/set
   * refuses a save whose `answer` matches no option, because the learner app
   * grades by comparing the clicked option's TEXT to `answer` — an answer that
   * matches nothing marks every attempt wrong, silently, for everyone.
   */

  /** A question as it reads, with the correct option marked. */
  function qBodyHtml(q) {
    if (!q) return '<div class="aa-q-del">This question has already been deleted — clear the flag below.</div>';
    const ans = String(q.answer || '').trim();
    return `<div class="aa-q">
      <div class="aa-q-meta">${esc(q.topic || 'no topic')}${q.difficulty ? ' · ' + esc(q.difficulty) : ''}${q.batchTag ? ' · batch ' + esc(q.batchTag) : ''}</div>
      <div class="aa-q-text">${esc(q.question)}</div>
      <ul class="aa-q-opts">${(q.options || []).map((o) =>
        `<li class="${String(o).trim() === ans ? 'ok' : ''}">${esc(o)}</li>`).join('')}</ul>
    </div>`;
  }

  /**
   * Swap `host` (an element sitting where the read-only question was) for the
   * editor. `onSaved(question)` gets the saved doc back; `onCancel()` restores.
   */
  function openQuestionEditor(host, q, onSaved, onCancel) {
    const name = 'qe-' + q.id;
    const ans = String(q.answer || '').trim();
    host.innerHTML = `<div class="aa-qedit">
      <label class="aa-field-label">Question</label>
      <textarea class="qe-text">${esc(q.question)}</textarea>
      <label class="aa-field-label">Options — tick the correct answer</label>
      <div class="qe-opts">${(q.options || []).map((o, i) => `
        <label class="qe-opt">
          <input type="radio" name="${esc(name)}" value="${i}"${String(o).trim() === ans ? ' checked' : ''} />
          <input type="text" value="${esc(o)}" />
        </label>`).join('')}</div>
      <div class="aa-row" style="margin:12px 0 0">
        <button class="btn btn-primary qe-save">Save for everyone</button>
        <button class="btn qe-cancel">Cancel</button>
        <span class="aa-note qe-msg" style="margin:0"></span>
      </div>
    </div>`;

    const msg = host.querySelector('.qe-msg');
    const save = host.querySelector('.qe-save');
    host.querySelector('.qe-cancel').onclick = () => onCancel();
    save.onclick = async () => {
      const question = host.querySelector('.qe-text').value.trim();
      const options = [...host.querySelectorAll('.qe-opt input[type=text]')].map((el) => el.value.trim());
      const picked = host.querySelector('.qe-opt input[type=radio]:checked');
      if (!picked) { msg.className = 'aa-err qe-msg'; msg.textContent = 'Tick which option is correct.'; return; }
      save.disabled = true;
      msg.className = 'aa-note qe-msg';
      msg.textContent = 'Saving…';
      try {
        const r = await api('/api/questions/set', {
          method: 'POST',
          body: { questionId: q.id, question, options, answer: options[Number(picked.value)] || '' },
        });
        onSaved(r.question, r.changed || []);
      } catch (e) {
        save.disabled = false;
        msg.className = 'aa-err qe-msg';
        msg.textContent = e.message;
      }
    };
  }

  /** Delete one question for good (also corrects its sub-lesson's count). */
  async function deleteQuestion(id, label) {
    if (!confirm(`Delete this question for everyone?\n\n${label}\n\nThis cannot be undone.`)) return false;
    await api('/api/admin/questions/' + encodeURIComponent(id), { method: 'DELETE' });
    return true;
  }

  /* --------------------------------- flags --------------------------------- */
  async function loadFlags() {
    try {
      const { flags } = await api('/api/admin/flags');
      const rf = $('railFlags'); if (rf) rf.textContent = flags.length ? String(flags.length) : ''; // mirror flag count into the rail
      if (!flags.length) { $('fList').textContent = 'Nothing flagged.'; return; }
      $('fList').innerHTML = flags.map((f) => `
        <div style="padding:10px 0;border-bottom:1px solid #E7E8EE" data-flag="${esc(f.id)}">
          <div style="font-size:13px"><b>${esc(f.topic || f.question?.topic || 'Unknown topic')}</b> — flagged by ${esc(f.email || 'someone')}</div>
          <div class="aa-note">“${esc(f.reason || '(no reason given)')}”</div>
          <div class="fq-body">${qBodyHtml(f.question)}</div>
          <div class="aa-row" style="margin:6px 0 0">
            ${f.question ? '<button class="btn fq-edit" style="padding:3px 9px;font-size:12px">✏️ Edit question</button>' : ''}
            <button class="btn fq-resolve" style="padding:3px 9px;font-size:12px">Keep &amp; resolve</button>
            ${f.question ? '<button class="btn aa-danger fq-delete" style="padding:3px 9px;font-size:12px">Delete question</button>' : ''}
            <span class="aa-note fq-msg" style="margin:0"></span>
          </div>
        </div>`).join('');

      $('fList').querySelectorAll('[data-flag]').forEach((row) => {
        const f = flags.find((x) => x.id === row.dataset.flag);
        const body = row.querySelector('.fq-body');
        const msg = row.querySelector('.fq-msg');
        const edit = row.querySelector('.fq-edit');
        // Editing a flagged question does NOT resolve the flag: fixing the text and
        // agreeing the report is handled are two decisions, and only the admin
        // knows whether the fix actually answered what was reported.
        if (edit) {
          edit.onclick = () => {
            edit.disabled = true;
            openQuestionEditor(body, f.question,
              (saved, changed) => {
                f.question = saved;
                body.innerHTML = qBodyHtml(saved);
                edit.disabled = false;
                msg.className = 'aa-ok fq-msg';
                msg.textContent = changed.length ? `Saved (${changed.join(' + ')}). Resolve the flag when you're happy.` : 'Nothing changed.';
              },
              () => { body.innerHTML = qBodyHtml(f.question); edit.disabled = false; });
          };
        }
        row.querySelector('.fq-resolve').onclick = async () => {
          row.querySelectorAll('button').forEach((b) => (b.disabled = true));
          try { await api(`/api/admin/flags/${f.id}/resolve`, { method: 'POST', body: { deleteQuestion: false } }); await loadFlags(); }
          catch (e) { msg.className = 'aa-err fq-msg'; msg.textContent = e.message; row.querySelectorAll('button').forEach((b) => (b.disabled = false)); }
        };
        const del = row.querySelector('.fq-delete');
        if (del) {
          // Resolve-with-delete: one call that removes the question AND clears the
          // flag, so a deleted question never leaves an unresolvable report behind.
          del.onclick = async () => {
            if (!confirm(`Delete this question for everyone?\n\n${f.question.question}\n\nThis cannot be undone.`)) return;
            row.querySelectorAll('button').forEach((b) => (b.disabled = true));
            try { await api(`/api/admin/flags/${f.id}/resolve`, { method: 'POST', body: { deleteQuestion: true } }); await loadFlags(); }
            catch (e) { msg.className = 'aa-err fq-msg'; msg.textContent = e.message; row.querySelectorAll('button').forEach((b) => (b.disabled = false)); }
          };
        }
      });
    } catch (e) { $('fList').textContent = 'Error: ' + e.message; }
  }

  /* ---------------------------- question browser --------------------------- */
  /* The same editor over the whole bank, scoped through the catalog rather than
   * by topic name alone — a name shared by two lessons would otherwise list both
   * sections' questions under whichever one you picked (see scopedMetaIndex). */
  let _questions = [];

  function wireQuestionBrowser() {
    $('qbCourse').onchange = () => { populateQbLessons(); };
    $('qbLesson').onchange = () => { populateQbTopics(); };
    $('qbLoad').onclick = () => loadQuestions();
    $('qbSearch').oninput = () => renderQuestions();
  }

  // Populated from the shared catalog, the same cascade the Generate station uses.
  function populateQuestionBrowser() {
    const courses = [...new Set(state.catalog.map((r) => r.course))].filter(Boolean);
    $('qbCourse').innerHTML = courses.length
      ? courses.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')
      : '<option value="">(no courses yet)</option>';
    populateQbLessons();
  }
  function populateQbLessons() {
    const course = $('qbCourse').value;
    const lessons = [...new Set(state.catalog.filter((r) => r.course === course).map((r) => r.lesson))].filter(Boolean);
    $('qbLesson').innerHTML = '<option value="">All lessons in this course</option>'
      + lessons.map((l) => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
    populateQbTopics();
  }
  function populateQbTopics() {
    const course = $('qbCourse').value, lesson = $('qbLesson').value;
    const topics = lesson
      ? [...new Set(state.catalog.filter((r) => r.course === course && r.lesson === lesson).map((r) => r.topic))].filter(Boolean)
      : [];
    $('qbTopic').innerHTML = '<option value="">All sub-lessons</option>'
      + topics.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    $('qbTopic').disabled = !lesson;
  }

  async function loadQuestions() {
    const course = $('qbCourse').value;
    if (!course) { $('qbList').textContent = 'There are no courses in this program yet.'; return; }
    $('qbList').textContent = 'Loading…';
    try {
      const { questions } = await api('/api/admin/questions?' + q({
        track: trackOf(course), course, lesson: $('qbLesson').value, topic: $('qbTopic').value,
      }));
      _questions = questions || [];
      renderQuestions();
    } catch (e) { $('qbList').textContent = 'Error: ' + e.message; }
  }

  function renderQuestions() {
    const term = ($('qbSearch').value || '').trim().toLowerCase();
    const rows = !term ? _questions : _questions.filter((x) =>
      (x.question + ' ' + x.topic + ' ' + (x.options || []).join(' ')).toLowerCase().includes(term));
    if (!rows.length) {
      $('qbList').textContent = _questions.length
        ? 'No question in this section matches that filter.'
        : 'No questions banked for this section yet.';
      return;
    }
    $('qbList').innerHTML = `<div class="aa-note" style="margin-bottom:6px">${rows.length} of ${_questions.length} question${_questions.length === 1 ? '' : 's'}</div>`
      + rows.map((x) => `
        <div data-qid="${esc(x.id)}">
          <div class="qb-body">${qBodyHtml(x)}</div>
          <div class="aa-row" style="margin:0 0 14px">
            <button class="btn qb-edit" style="padding:3px 9px;font-size:12px">✏️ Edit</button>
            <button class="btn aa-danger qb-delete" style="padding:3px 9px;font-size:12px">Delete</button>
            <span class="aa-note qb-msg" style="margin:0"></span>
          </div>
        </div>`).join('');

    $('qbList').querySelectorAll('[data-qid]').forEach((row) => {
      const x = _questions.find((r) => r.id === row.dataset.qid);
      const body = row.querySelector('.qb-body');
      const msg = row.querySelector('.qb-msg');
      const edit = row.querySelector('.qb-edit');
      edit.onclick = () => {
        edit.disabled = true;
        openQuestionEditor(body, x,
          (saved, changed) => {
            // Patch the cached row so the filter and a later re-render agree with
            // what was just saved, without re-reading the whole section.
            Object.assign(x, saved);
            body.innerHTML = qBodyHtml(x);
            edit.disabled = false;
            msg.className = 'aa-ok qb-msg';
            msg.textContent = changed.length ? `Saved (${changed.join(' + ')}).` : 'Nothing changed.';
          },
          () => { body.innerHTML = qBodyHtml(x); edit.disabled = false; });
      };
      row.querySelector('.qb-delete').onclick = async () => {
        row.querySelectorAll('button').forEach((b) => (b.disabled = true));
        try {
          if (!await deleteQuestion(x.id, x.question)) { row.querySelectorAll('button').forEach((b) => (b.disabled = false)); return; }
          _questions = _questions.filter((r) => r.id !== x.id);
          renderQuestions();
        } catch (e) {
          msg.className = 'aa-err qb-msg';
          msg.textContent = e.message;
          row.querySelectorAll('button').forEach((b) => (b.disabled = false));
        }
      };
    });
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
        await api('/api/admin/programs', { method: 'POST', body: { id, name, category: ($('progCategory') && $('progCategory').value) || 'career' } });
        $('progMsg').innerHTML = '<span class="aa-ok">Created — switching…</span>';
        location.search = '?program=' + encodeURIComponent(id); // reload into the new program
      } catch (e) { $('progMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; $('progCreate').disabled = false; }
    };
  }

  boot();
})();
