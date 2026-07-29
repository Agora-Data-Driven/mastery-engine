/**
 * Validate the authored content (specs + content/<CODE>/<NN>/{doc.md,questions.json,cards.json})
 * and write it to prod Firestore in the engine's exact shapes:
 *   transcripts: addTranscript shape, source 'claude-authored', lesson grain
 *   questions:   addQuestion shape (answer = options[answerIndex]), batchTag AI_ENG_BATCH
 *   counters:    questionCount increment on slug(track,course,lesson,topic)
 *   flashcards:  replace-deck per scopeId = slug('lesson',track,course,lesson,'')
 * Idempotent: skips lessons whose transcript already exists (same source), topics that
 * already have questions in this program, decks that already exist for the scope.
 * Dry-run by default; --apply writes. --course=IR100 limits to one course.
 */
const fs = require('fs');
const path = require('path');
const { Firestore, FieldValue } = require('@google-cloud/firestore');

const APPLY = process.argv.includes('--apply');
const only = (process.argv.find((a) => a.startsWith('--course=')) || '').split('=')[1] || null;
const db = new Firestore({ projectId: 'agora-data-driven', ignoreUndefinedProperties: true });

const PROGRAM = 'ai_engineering';
const AI_ENG_BATCH = 'ai-eng-20260725';
const SOURCE = 'claude-authored';
const SPECS = path.join(__dirname, 'specs');
const CONTENT = path.join(__dirname, 'content');

const slug = (...parts) =>
  parts.join('__').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 480) || 'x';
const CODE = (course) => course.split(':')[0].replace(/\s+/g, '');

function loadLesson(dir) {
  const out = {};
  for (const [key, file] of [['doc', 'doc.md'], ['questions', 'questions.json'], ['cards', 'cards.json']]) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) { out[key] = null; continue; }
    const raw = fs.readFileSync(p, 'utf8');
    out[key] = key === 'doc' ? raw.trim() : JSON.parse(raw);
  }
  return out;
}

/** Validate one lesson's content against its spec entry. Returns {ok, problems, questions, cards}. */
function validate(specLesson, content) {
  const problems = [];
  const topics = new Set(specLesson.topics);

  if (!content.doc || content.doc.length < 4000) problems.push(`doc missing or short (${content.doc ? content.doc.length : 0} chars)`);
  else for (const t of specLesson.topics) if (!content.doc.includes(`## ${t}`)) problems.push(`doc missing section: ${t}`);

  let questions = [];
  if (!content.questions || !Array.isArray(content.questions.questions)) problems.push('questions.json missing/malformed');
  else {
    const byTopic = new Map();
    for (const q of content.questions.questions) {
      const errs = [];
      if (!topics.has(q.topic)) errs.push(`unknown topic "${q.topic}"`);
      if (!q.question || typeof q.question !== 'string') errs.push('empty question');
      if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => !o)) errs.push('bad options');
      if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) errs.push('bad answerIndex');
      if (!['core', 'balanced', 'challenge'].includes(q.difficulty)) q.difficulty = 'balanced';
      if (errs.length) { problems.push(`question dropped (${errs.join(', ')}): ${String(q.question).slice(0, 60)}`); continue; }
      byTopic.set(q.topic, (byTopic.get(q.topic) || 0) + 1);
      questions.push(q);
    }
    for (const t of specLesson.topics) {
      const n = byTopic.get(t) || 0;
      if (n < 4) problems.push(`topic "${t}" has only ${n} valid questions`);
    }
  }

  let cards = [];
  if (!content.cards || !Array.isArray(content.cards.cards)) problems.push('cards.json missing/malformed');
  else {
    cards = content.cards.cards.filter((c) => c && c.concept && c.intuition && topics.has(c.topic))
      .map((c) => ({
        concept: String(c.concept).trim(), intuition: String(c.intuition).trim(),
        formula: c.formula ? String(c.formula).trim() : '—',
        topic: String(c.topic).trim(), highway: !!c.highway,
      }));
    if (cards.length < 6) problems.push(`only ${cards.length} valid cards`);
    if (content.cards.cards.length !== cards.length) problems.push(`${content.cards.cards.length - cards.length} cards dropped (bad topic/fields)`);
  }

  // A lesson is writable if the doc is present with all sections and it has usable questions.
  const hardFail = !content.doc || content.doc.length < 4000
    || specLesson.topics.some((t) => !content.doc || !content.doc.includes(`## ${t}`))
    || questions.length === 0;
  return { ok: !hardFail, problems, questions, cards };
}

async function main() {
  const specFiles = fs.readdirSync(SPECS).filter((f) => f.startsWith('spec-') && f.endsWith('.json'));
  const specs = specFiles.map((f) => JSON.parse(fs.readFileSync(path.join(SPECS, f), 'utf8')))
    .filter((s) => !only || CODE(s.course) === only);

  // Existing state for idempotency.
  const [trSnap, qSnap] = await Promise.all([
    db.collection('transcripts').where('program', '==', PROGRAM).get(),
    db.collection('questions').where('program', '==', PROGRAM).get(),
  ]);
  const haveTranscript = new Set(trSnap.docs.filter((d) => d.data().source === SOURCE)
    .map((d) => `${d.data().course}::${d.data().lesson}`));
  const topicQCount = new Map();
  for (const d of qSnap.docs) {
    const t = d.data().topic;
    topicQCount.set(t, (topicQCount.get(t) || 0) + 1);
  }

  let totals = { lessons: 0, ready: 0, written: 0, transcripts: 0, questions: 0, cards: 0, skipped: 0 };
  const failures = [];

  for (const spec of specs) {
    const code = CODE(spec.course);
    for (const sl of spec.lessons) {
      totals.lessons += 1;
      const dir = path.join(CONTENT, code, sl.index);
      if (!fs.existsSync(dir)) { failures.push(`${code}/${sl.index} ${sl.lesson}: NO CONTENT DIR`); continue; }
      let content;
      try { content = loadLesson(dir); } catch (e) { failures.push(`${code}/${sl.index} ${sl.lesson}: parse error ${e.message}`); continue; }
      const v = validate(sl, content);
      for (const p of v.problems) console.log(`  [warn] ${code}/${sl.index}: ${p}`);
      if (!v.ok) { failures.push(`${code}/${sl.index} ${sl.lesson}: validation failed`); continue; }
      totals.ready += 1;
      if (!APPLY) continue;

      // 1. Transcript (skip if this lesson already has one from us).
      const tKey = `${spec.course}::${sl.lesson}`;
      if (!haveTranscript.has(tKey)) {
        await db.collection('transcripts').add({
          program: PROGRAM, track: spec.track, course: spec.course, lesson: sl.lesson, topic: '',
          title: sl.lesson.replace(/^\d+\s+/, ''), text: content.doc, source: SOURCE,
          watcherRef: null, chars: content.doc.length, createdAt: FieldValue.serverTimestamp(),
        });
        totals.transcripts += 1;
      }

      // 2. Questions per topic (skip topics that already have any in this program).
      const byTopic = new Map();
      for (const q of v.questions) {
        if (!byTopic.has(q.topic)) byTopic.set(q.topic, []);
        byTopic.get(q.topic).push(q);
      }
      for (const [topic, qs] of byTopic) {
        if ((topicQCount.get(topic) || 0) > 0) { totals.skipped += qs.length; continue; }
        let batch = db.batch(); let ops = 0;
        for (const q of qs) {
          batch.set(db.collection('questions').doc(), {
            topic, question: q.question, options: q.options, answer: q.options[q.answerIndex],
            program: PROGRAM, batchTag: AI_ENG_BATCH, difficulty: q.difficulty,
            createdAt: FieldValue.serverTimestamp(), generated: true, source: SOURCE,
          });
          ops += 1;
        }
        if (ops) await batch.commit();
        await db.collection('topics').doc(slug(spec.track, spec.course, sl.lesson, topic)).set(
          { questionCount: FieldValue.increment(qs.length) }, { merge: true },
        );
        topicQCount.set(topic, qs.length);
        totals.questions += qs.length;
      }

      // 3. Flashcard deck (replace-per-scope, exactly saveFlashcards' shape).
      if (v.cards.length >= 6) {
        const scopeId = slug('lesson', spec.track, spec.course, sl.lesson, '');
        const col = db.collection('flashcards');
        const existing = await col.where('scopeId', '==', scopeId).get();
        let batch = db.batch(); let ops = 0;
        for (const d of existing.docs) { batch.delete(d.ref); if (++ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; } }
        v.cards.forEach((c, i) => {
          batch.set(col.doc(), {
            scopeId, level: 'lesson', track: spec.track, course: spec.course, lesson: sl.lesson,
            topic: c.topic, concept: c.concept, intuition: c.intuition, formula: c.formula,
            visual: null, highway: c.highway, order: i,
            createdAt: FieldValue.serverTimestamp(), source: 'ai',
          });
          ops += 1;
        });
        await batch.commit();
        totals.cards += v.cards.length;
      }
      totals.written += 1;
      console.log(`  [ok] ${code}/${sl.index} ${sl.lesson}: doc ${content.doc.length}ch, ${v.questions.length}q, ${v.cards.length} cards`);
    }
  }

  console.log(`\nmode=${APPLY ? 'APPLY' : 'DRY RUN'}  lessons=${totals.lessons} ready=${totals.ready} written=${totals.written}`);
  console.log(`transcripts=${totals.transcripts} questions=${totals.questions} (skipped ${totals.skipped} for already-covered topics) cards=${totals.cards}`);
  if (failures.length) { console.log(`\nNOT WRITTEN (${failures.length}):`); for (const f of failures) console.log(`  - ${f}`); }
}

main().catch((e) => { console.error('ERR', e.stack || e.message); process.exit(1); });
