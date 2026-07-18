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

  const state = {
    program: '', catalog: [],
    watcher: { client: '', channel: '', video: null, title: '' },
    job: null, stop: false,
    ingest: null, stopIngest: false, // the AI auto-file proposal + its run
  };

  /* ------------------------------- bootstrap ------------------------------- */
  async function boot() {
    let auth;
    try { auth = await api('/api/auth/status'); } catch { auth = { authed: false }; }
    if (!auth.authed || !auth.admin) { $('who').textContent = 'Not signed in as an admin.'; show($('gate'), true); return; }
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
    wireGenerate();
    wirePeople();
    refreshAll();
  }

  function wireTabs() {
    document.querySelectorAll('.aa-tab').forEach((t) => {
      t.onclick = () => {
        document.querySelectorAll('.aa-tab').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
        document.querySelectorAll('.aa-panel').forEach((p) => p.classList.toggle('on', p.id === 'p-' + t.dataset.panel));
        if (t.dataset.panel === 'flags') loadFlags();
        if (t.dataset.panel === 'generate') loadJobs();
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
    const byLesson = new Map();
    for (const r of state.catalog) {
      const key = [r.track, r.course, r.lesson].join(' > ');
      if (!byLesson.has(key)) byLesson.set(key, []);
      byLesson.get(key).push(r.topic);
    }
    renderCurriculumTree();

    // Lesson pickers (transcripts + generation scope) come from the live catalog.
    const lessons = [...byLesson.keys()];
    const opts = lessons.map((l) => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
    $('tScope').innerHTML = opts || '<option value="">(no lessons yet)</option>';
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
    if (!list.length) { $('gSources').innerHTML = '<div class="aa-note" style="padding:10px">No transcripts attached to this scope — generation will use expert knowledge, or attach some in the Curriculum tab.</div>'; return; }
    $('gSources').innerHTML = list.map((t) =>
      `<label style="display:flex;gap:8px;align-items:center;padding:6px 11px;border-bottom:1px solid #F0F1F4;cursor:pointer">
        <input type="checkbox" data-tid="${esc(t.id)}" style="width:auto">
        <span><b>${esc(t.title)}</b> <span style="color:#6B7280;font-size:12px">· ${esc(t.lesson)} · ${t.chars || 0} chars</span></span></label>`).join('');
  }

  // Interactive Track › Course › Lesson › Sub-lesson tree with inline add/remove.
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
          const li = lessonRefs.push({ track, course, lesson }) - 1;
          html += `<div style="padding:3px 10px 3px 22px;display:flex;justify-content:space-between;align-items:center;gap:8px">
            <span style="font-weight:600;color:#374151;font-size:13px">${esc(lesson)}</span>
            <button class="btn" data-addtopic="${esc(track)}${esc(course)}${esc(lesson)}" style="padding:1px 8px;font-size:11px">+ sub-lesson</button></div>`;
          for (const r of topics) {
            html += `<div style="padding:1px 10px 1px 38px;display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px">
              <span>· ${esc(r.topic)}</span>
              <button class="btn" data-del="${esc(r.id)}" title="Remove this sub-lesson" style="padding:0 7px;font-size:12px;color:#B3261E;border-color:#f0d0cd">✕</button></div>`;
          }
        }
      }
    }
    el.innerHTML = html;
    el.querySelectorAll('button[data-li]').forEach((b) => { b.onclick = () => {
      const [track, course, lesson] = b.dataset.addtopic.split('');
      const name = window.prompt(`New sub-lesson under "${ref.lesson}":`);
      if (name && name.trim()) addTopicRow(ref.track, ref.course, ref.lesson, name.trim());
    }; });
    el.querySelectorAll('button[data-del]').forEach((b) => { b.onclick = () => {
      if (window.confirm('Remove this sub-lesson from the curriculum? (Any banked questions stay — they are keyed by name.)')) delTopicRow(b.dataset.del);
    }; });
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
  const scopeParts = (v) => { const [track, course, lesson] = String(v || '').split(' > '); return { track, course, lesson }; };

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
    $('tList').querySelectorAll('button').forEach((x) => x.removeAttribute('aria-selected'));
    if (btn) btn.setAttribute('aria-selected', 'true');
    $('tView').textContent = 'Loading…';
    try {
      const t = await api('/api/admin/transcripts/' + encodeURIComponent(id));
      const url = t.watcherRef && t.watcherRef.url;
      const link = url ? ` &middot; <a href="${esc(url)}" target="_blank" rel="noopener">&#9654; Watch video</a>` : '';
      $('tView').innerHTML =
        `<div style="position:sticky;top:0;background:#F7F8F5;padding-bottom:8px;border-bottom:1px solid #E7E8EE;margin-bottom:10px">` +
        `<b>${esc(t.title)}</b><br><span style="color:#6B7280;font-size:12px">${esc(t.course)} &rsaquo; ${esc(t.lesson)} &middot; ${t.chars || 0} chars${link}</span></div>` +
        `<div style="white-space:pre-wrap;line-height:1.5">${esc(t.text || '')}</div>`;
    } catch (e) { $('tView').textContent = 'Error: ' + e.message; }
  }

  function wireTranscripts() {
    if ($('tSearch')) $('tSearch').oninput = renderTranscriptList;
    $('tFile').onchange = async () => {
      const f = $('tFile').files[0];
      if (!f) return;
      let text = await f.text();
      // Strip WebVTT/SRT timing so the model sees prose, not timestamps.
      text = text.replace(/^WEBVTT.*$/gm, '')
        .replace(/^\d+$/gm, '')
        .replace(/^[\d:.,]+\s*-->\s*[\d:.,]+.*$/gm, '')
        .replace(/\n{3,}/g, '\n\n').trim();
      $('tText').value = text;
      if (!$('tTitle').value) $('tTitle').value = f.name.replace(/\.[^.]+$/, '');
    };
    $('tSave').onclick = async () => {
      $('tMsg').textContent = 'Saving…';
      try {
        const s = scopeParts($('tScope').value);
        await api('/api/admin/transcripts', {
          method: 'POST',
          body: { program: state.program, ...s, title: $('tTitle').value || 'Untitled', text: $('tText').value, source: 'paste' },
        });
        $('tMsg').innerHTML = '<span class="aa-ok">Attached.</span>';
        $('tText').value = ''; $('tTitle').value = '';
        await loadTranscripts();
      } catch (e) { $('tMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
    };
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
      $('wMsg').innerHTML = `<span class="aa-ok">Loaded “${esc(w.title || 'video')}”. Click “Analyze &amp; place with AI” above.</span>`;
      $('iMsg').textContent = 'Watcher video ready — press Analyze & place.';
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
    ? '<span style="color:#2E7D32;font-weight:700;font-size:12px">new</span>'
    : '<span class="aa-note" style="font-size:12px">existing</span>';

  function renderIngestTopics() {
    const rows = (state.ingest && state.ingest.topicRows) || [];
    $('iTopics').innerHTML = rows.length
      ? rows.map((r, i) => `<label style="display:flex;gap:8px;align-items:center;padding:4px 0">
          <input type="checkbox" data-i="${i}" ${r.on ? 'checked' : ''} />
          <span>${esc(r.topic)}</span> ${badge(r.isNew)}
        </label>`).join('')
      : '<span class="aa-note">No topics — add one below.</span>';
    $('iTopics').querySelectorAll('input[data-i]').forEach((cb) => {
      cb.onchange = () => { state.ingest.topicRows[Number(cb.dataset.i)].on = cb.checked; };
    });
  }

  function renderPlan(data) {
    // Everything /commit needs, kept exactly as the AI proposed + the admin approves.
    state.ingest = {
      program: data.program, text: data.text, title: data.title,
      source: data.source, watcherRef: data.watcherRef,
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
    $('iSummary').innerHTML = `${esc(data.summary || '')} <span class="aa-note">· ${data.chars} chars · source: ${esc(data.source)}</span>`;
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
      state.ingest = null; // a fresh paste supersedes any picked Watcher video
      if (!$('iTitle').value) $('iTitle').value = f.name.replace(/\.[^.]+$/, '');
    };
    // Typing/pasting into the box means "use this text", not the Watcher pick.
    $('iText').oninput = () => { if ($('iText').value.trim() && state.ingest && state.ingest.source === 'watcher') state.ingest = null; };

    $('iPlan').onclick = async () => {
      const text = $('iText').value.trim();
      const watcher = (!text && state.ingest && state.ingest.watcher) ? state.ingest.watcher : null;
      if (!text && !watcher) { $('iMsg').innerHTML = '<span class="aa-err">Paste a transcript or pick a Watcher video first.</span>'; return; }
      $('iPlan').disabled = true;
      $('iMsg').textContent = 'Reading the material and finding where it fits…';
      try {
        const data = await api('/api/admin/ingest/plan', {
          method: 'POST',
          body: { program: state.program, title: $('iTitle').value, ...(text ? { text } : { watcher }) },
        });
        renderPlan(data);
        $('iMsg').innerHTML = '<span class="aa-ok">Here is the plan — review, then add it.</span>';
      } catch (e) {
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

    // Generation is opt-in: reveal the per-topic count only when asked, and relabel
    // the button so it's clear whether we're just filing it or also building questions.
    if ($('iGenerate')) $('iGenerate').onchange = () => {
      const on = $('iGenerate').checked;
      show($('iGenOpts'), on);
      $('iCommit').textContent = on ? 'Attach & generate' : 'Attach to Academy';
    };

    $('iCommit').onclick = async () => {
      if (!state.ingest) return;
      const topics = state.ingest.topicRows.filter((r) => r.on).map((r) => r.topic);
      if (!topics.length) { $('iCommitMsg').innerHTML = '<span class="aa-err">Pick at least one topic.</span>'; return; }
      const generate = !!($('iGenerate') && $('iGenerate').checked);
      $('iCommit').disabled = true;
      state.stopIngest = false;
      $('iCommitMsg').textContent = generate ? 'Filing the material, then generating…' : 'Filing the transcript and curriculum…';
      try {
        const { job, generated } = await api('/api/admin/ingest/commit', {
          method: 'POST',
          body: {
            program: state.ingest.program || state.program,
            track: $('iTrack').value.trim(), course: $('iCourse').value.trim(), lesson: $('iLesson').value.trim(),
            topics, text: state.ingest.text, title: $('iTitle').value,
            source: state.ingest.source, watcherRef: state.ingest.watcherRef,
            generate,
            targetPerTopic: Number($('iCount').value) || 6,
          },
        });
        if (generated && job) {
          $('iCommitMsg').innerHTML = '<span class="aa-ok">Attached. Generating questions…</span>';
          await runSteps(job.id, { bar: 'iBar', status: 'iStatus' }, 'stopIngest');
          $('iCommitMsg').innerHTML = '<span class="aa-ok">Done — transcript filed and questions added.</span>';
        } else {
          $('iCommitMsg').innerHTML = '<span class="aa-ok">Attached — transcript and curriculum saved (no questions generated).</span>';
        }
        show($('iPlanBox'), false);
        $('iText').value = ''; $('iTitle').value = ''; state.ingest = null;
        if ($('iGenerate')) { $('iGenerate').checked = false; show($('iGenOpts'), false); $('iCommit').textContent = 'Attach to Academy'; }
        await loadCatalog();
        await loadTranscripts();
      } catch (e) {
        $('iCommitMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
      }
      $('iCommit').disabled = false;
    };
  }

  /* -------------------------------- generate ------------------------------- */
  function wireGenerate() {
    $('gCourse').onchange = populateGenLessons;
    $('gLesson').onchange = populateGenTopics;
    $('gDoQuestions').onchange = () => show($('gQOpts'), $('gDoQuestions').checked);
    $('gStart').onclick = startJob;
    $('gStop').onclick = () => { state.stop = true; $('gStatus').textContent = 'Stopping after this topic…'; };
  }

  async function startJob() {
    const course = $('gCourse').value;
    if (!course) { $('gStatus').innerHTML = '<span class="aa-err">Pick a course.</span>'; return; }
    const lesson = $('gLesson').value || '';
    const topic = $('gTopic').value || '';
    const doQ = $('gDoQuestions').checked, doC = $('gDoCards').checked;
    if (!doQ && !doC) { $('gStatus').innerHTML = '<span class="aa-err">Pick Questions and/or Flashcards.</span>'; return; }
    const track = trackOf(course);
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
            provider: $('gModel').value,
            instructions: ($('gInstr') && $('gInstr').value) || '',
            transcriptIds,
          },
        });
        state.job = job;
        await runSteps(job.id);
        await loadJobs();
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
      } catch (e) { $('eMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
    };
  }

  boot();
})();
