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

  const state = { program: '', catalog: [], watcher: { client: '', channel: '', video: null }, job: null, stop: false };

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
    $('wImport').onclick = async () => {
      const w = state.watcher;
      $('wMsg').textContent = 'Importing…';
      try {
        const s = scopeParts($('tScope').value);
        const r = await api('/api/admin/watcher/import', {
          method: 'POST',
          body: { program: state.program, client: w.client, channel: w.channel, video: w.video, ...s },
        });
        $('wMsg').innerHTML = `<span class="aa-ok">Imported “${esc(r.title)}” (${r.chars} chars).</span>`;
        await loadTranscripts();
      } catch (e) { $('wMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
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
            state.watcher.video = vid; $('wImport').disabled = false;
          });
        });
      });
    } catch (e) {
      $('wClients').innerHTML = `<button disabled style="color:#B3261E">${esc(e.message)}</button>`;
    }
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
     work isn't a server-side loop. */
  async function runSteps(id) {
    for (;;) {
      if (state.stop) { $('gStatus').textContent = 'Stopped. Press Start to resume where it left off.'; return; }
      const { job } = await api(`/api/admin/genjobs/${id}/step`, { method: 'POST' });
      const p = job.progress || {};
      const pct = p.topicsTotal ? Math.round((p.topicsDone / p.topicsTotal) * 100) : 0;
      $('gBar').style.width = pct + '%';
      $('gStatus').textContent =
        `${job.status} — ${p.topicsDone}/${p.topicsTotal} topics · ${p.questionsWritten} questions · $${(p.costUsd || 0).toFixed(4)}`;
      if (job.errors && job.errors.length) {
        show($('gOut'), true);
        $('gOut').textContent = job.errors.map((e) => `${e.topic}: ${e.error}`).join('\n');
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
    $('eLoad').onclick = async () => {
      $('eMsg').textContent = 'Loading…';
      try {
        const r = await api('/api/admin/enrollment?email=' + encodeURIComponent($('eEmail').value.trim()));
        $('ePrograms').value = (r.programs || []).join(', ');
        $('eCourses').value = (r.courses || []).join(', ');
        $('eMsg').textContent = 'Loaded.';
      } catch (e) { $('eMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
    };
    $('eSave').onclick = async () => {
      $('eMsg').textContent = 'Saving…';
      try {
        const r = await api('/api/admin/enrollment', {
          method: 'POST',
          body: { email: $('eEmail').value.trim(), programs: csv($('ePrograms').value), courses: csv($('eCourses').value) },
        });
        $('eMsg').innerHTML = `<span class="aa-ok">Saved: ${esc((r.programs || []).join(', '))}${r.courses.length ? ' · ' + esc(r.courses.join(', ')) : ' · all courses'}</span>`;
      } catch (e) { $('eMsg').innerHTML = `<span class="aa-err">${esc(e.message)}</span>`; }
    };
  }

  boot();
})();
