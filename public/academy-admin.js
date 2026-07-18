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
    state.program = current;
    $('program').innerHTML = programs.map((p) => `<option value="${esc(p.id)}">${esc(p.name || p.id)}</option>`).join('');
    $('program').value = current;
    $('program').onchange = () => { state.program = $('program').value; refreshAll(); };

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
    $('curTree').textContent = byLesson.size
      ? [...byLesson.entries()].map(([k, v]) => `${k}\n${v.map((t) => '    · ' + t).join('\n')}`).join('\n\n')
      : 'No topics in this program yet — paste an outline above.';

    // Lesson pickers (transcripts + generation scope) come from the live catalog.
    const lessons = [...byLesson.keys()];
    const opts = lessons.map((l) => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
    $('tScope').innerHTML = opts || '<option value="">(no lessons yet)</option>';
    const courses = [...new Set(state.catalog.map((r) => [r.track, r.course].join(' > ')))];
    $('gScope').innerHTML = [
      ...courses.map((c) => `<option value="course::${esc(c)}">Course: ${esc(c)}</option>`),
      ...lessons.map((l) => `<option value="lesson::${esc(l)}">Lesson: ${esc(l)}</option>`),
    ].join('') || '<option value="">(nothing to generate yet)</option>';
  }

  function wireCurriculum() {
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

  async function loadTranscripts() {
    try {
      const list = await api('/api/admin/transcripts?' + q());
      $('tList').textContent = list.length
        ? list.map((t) => `${t.title}\n    ${t.course} > ${t.lesson}${t.topic ? ' > ' + t.topic : ''}  ·  ${t.chars} chars  ·  ${t.source}`).join('\n\n')
        : 'Nothing attached yet.';
    } catch (e) { $('tList').textContent = 'Error: ' + e.message; }
  }

  function wireTranscripts() {
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

    $('iCommit').onclick = async () => {
      if (!state.ingest) return;
      const topics = state.ingest.topicRows.filter((r) => r.on).map((r) => r.topic);
      if (!topics.length) { $('iCommitMsg').innerHTML = '<span class="aa-err">Pick at least one topic.</span>'; return; }
      $('iCommit').disabled = true;
      state.stopIngest = false;
      $('iCommitMsg').textContent = 'Creating topics and attaching the material…';
      try {
        const { job } = await api('/api/admin/ingest/commit', {
          method: 'POST',
          body: {
            program: state.ingest.program || state.program,
            track: $('iTrack').value.trim(), course: $('iCourse').value.trim(), lesson: $('iLesson').value.trim(),
            topics, text: state.ingest.text, title: $('iTitle').value,
            source: state.ingest.source, watcherRef: state.ingest.watcherRef,
            targetPerTopic: Number($('iCount').value) || 6,
          },
        });
        $('iCommitMsg').innerHTML = '<span class="aa-ok">Generating questions…</span>';
        await runSteps(job.id, { bar: 'iBar', status: 'iStatus' }, 'stopIngest');
        $('iCommitMsg').innerHTML = '<span class="aa-ok">Done — added to everyone\'s quiz.</span>';
        show($('iPlanBox'), false);
        $('iText').value = ''; $('iTitle').value = ''; state.ingest = null;
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
    $('gStart').onclick = startJob;
    $('gStop').onclick = () => { state.stop = true; $('gStatus').textContent = 'Stopping after this topic…'; };
  }

  async function startJob() {
    const v = $('gScope').value;
    if (!v) return;
    const [kind, rest] = v.split('::');
    const s = scopeParts(rest);
    const body = {
      program: state.program, track: s.track, course: s.course,
      ...(kind === 'lesson' ? { lesson: s.lesson } : {}),
      targetPerTopic: Number($('gCount').value) || 5,
      provider: $('gModel').value,
      instructions: ($('gInstr') && $('gInstr').value) || '',
    };
    $('gStart').disabled = true; show($('gStop'), true); state.stop = false;
    $('gStatus').textContent = 'Queueing…';
    try {
      const { job } = await api('/api/admin/genjobs', { method: 'POST', body });
      state.job = job;
      await runSteps(job.id);
    } catch (e) {
      $('gStatus').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`;
    }
    $('gStart').disabled = false; show($('gStop'), false);
    await loadJobs();
    await loadCatalog();
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
