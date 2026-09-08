/**
 * Bulk question generation — the stepper.
 *
 * Seeding a course means ~1000 questions, which is far too much for one request. The obvious shape
 * (kick off a background loop, return immediately) is a trap on Cloud Run: CPU is throttled between
 * requests, so a fire-and-forget loop stalls the moment the response is sent and dies at the next
 * scale-to-zero — silently, hours later, half-done.
 *
 * So the JOB DOC is the state and the caller drives it: each POST to /api/admin/genjobs/:id/step
 * pops one topic off the queue, generates for it, banks the results, and returns the progress. The
 * admin page just calls step in a loop and draws a progress bar. That means:
 *   - a browser tab closing, a deploy, or an instance dying costs at most ONE topic's work;
 *   - resuming is just calling step again — the queue in the doc IS the resume point;
 *   - no min-instances, no CPU-always-on, no Cloud Tasks, no new infra.
 *
 * Cost is accumulated onto the job doc from the same usage tally the rest of the app uses
 * (lib/usage.js), so the admin sees what a run actually spent.
 */
import { generateQuestionsFromTranscript, generateAcademyQuestions } from './gemini.js';
import {
  getGenJob, updateGenJob, getTranscripts, getTranscriptById, addQuestion, bumpQuestionCount, getQuestionsForTopics, getLessonTopicNames, slug,
} from './firestore.js';
import { audienceFor } from './programs.js';
import { newUsage, runWithUsage, aiPolicy } from './usage.js';

/** Transcripts can dwarf a context window; keep the freshest material and stay bounded. */
const MAX_TRANSCRIPT_CHARS = 12000;
/** Never write more than this per topic per step, whatever the model returns. */
const MAX_PER_TOPIC = 25;

/**
 * Normalise a question stem for near-duplicate detection: lowercase, strip
 * punctuation and collapse whitespace. Cheap and local — an embedding call per
 * candidate would cost more than the generation itself, and this catches the
 * realistic case (the model re-emitting a stem it was told to avoid, modulo
 * punctuation or an "a"/"the").
 */
export const dedupeKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();

/* ---------------------- near-duplicate detection --------------------------
 * `dedupeKey` only catches a stem re-emitted verbatim modulo punctuation. The
 * failure that actually happens is a REWORD: the same proposition asked about a
 * different company, or one worked example with the numbers changed. Those sail
 * through an exact key, which is how a single lesson came to ask "how do their
 * IDF values compare" three times across three topics.
 *
 * Content-word overlap (Jaccard over question + answer) catches it for the price
 * of a string split. An embedding call per candidate would cost more than the
 * generation it guards, and this runs against every banked question in the lesson.
 */
const STOP = new Set(('a an the of to in is are and or for on with what which how why does do this that it its as at by from be been being would '
  + 'should could may might will can if when where who whom whose not no than then there their they them these those you your we our').split(' '));

/** The content words of a question, for overlap comparison. */
export function contentWords(text) {
  return new Set(
    String(text || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

/** Jaccard overlap of two content-word sets, 0..1. */
export function overlap(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/**
 * Is `candidate` a reworded version of anything in `priorSets`?
 *
 * 0.6 is deliberately high. Below roughly 0.5, genuinely different questions on
 * one narrow topic collide because they share its vocabulary by necessity, and
 * dropping those would quietly thin the bank. This is a backstop for the blatant
 * case, not a semantic judge: the prompt-side fix (siblingTopicsBlock plus the
 * lesson-wide avoid list) is what stops the duplicate being written at all.
 */
export const NEAR_DUPLICATE_THRESHOLD = 0.6;
export function isNearDuplicate(candidate, priorSets, threshold = NEAR_DUPLICATE_THRESHOLD) {
  const set = contentWords(candidate);
  if (set.size < 4) return false; // too short to judge; the exact key decides
  return priorSets.some((prior) => overlap(set, prior) >= threshold);
}

/** Join a scope's transcripts into one bounded block of source material. */
function sourceFor(transcripts) {
  const parts = [];
  let total = 0;
  for (const t of transcripts) {
    const body = String(t.text || '').trim();
    if (!body) continue;
    const chunk = `--- ${t.title || 'Untitled'} ---\n${body}`;
    if (total + chunk.length > MAX_TRANSCRIPT_CHARS) {
      const room = MAX_TRANSCRIPT_CHARS - total;
      if (room > 500) parts.push(chunk.slice(0, room));
      break;
    }
    parts.push(chunk);
    total += chunk.length;
  }
  return parts.join('\n\n');
}

/**
 * Advance `jobId` by one topic. Returns the job's public state (never the queue).
 * Errors on ONE topic are recorded and the topic is dropped, so a single bad
 * batch can't wedge the run.
 */
export async function stepGenJob(jobId, ai = {}) {
  const job = await getGenJob(jobId);
  if (!job) throw new Error('No such job');
  if (job.status === 'cancelled') return publicJob(job);

  const queue = [...(job.queue || [])];
  if (!queue.length) {
    await updateGenJob(jobId, { status: 'done', queue: [] });
    return publicJob({ ...job, status: 'done', queue: [] });
  }

  const entry = queue.shift();
  const topic = typeof entry === 'string' ? entry : entry.topic;
  const progress = { ...(job.progress || {}) };
  const errors = [...(job.errors || [])];

  // Everything this step spends lands on the job doc, so a run reports its own cost.
  const usage = newUsage();
  // Carry the request's AI allowlist into the nested store — it SHADOWS the
  // request-scoped one, and without this the choke point in lib/gemini.js would
  // see no policy (= unrestricted) inside a step. Admin-only today, but airtight.
  usage.aiPolicy = aiPolicy();
  try {
    await runWithUsage(usage, async () => {
      // Per-topic course wins over the job's scope, so one job can span several courses
      // (goal modules whose lessons were filed into different existing units).
      const entryCourse = entry.course || job.scope?.course;
      // The SIBLING sub-lessons of this lesson. Generation is per topic but grounding
      // is per lesson, so without this every topic mines the same transcript blind to
      // the others - the duplication this whole block exists to prevent.
      const [transcripts, lessonTopics] = await Promise.all([
        // Lesson-level material is the norm; a topic-specific transcript wins when there is one.
        getTranscripts({ program: job.program, course: entryCourse, lesson: entry.lesson, topic }),
        getLessonTopicNames({ program: job.program, track: entry.track, course: entryCourse, lesson: entry.lesson })
          .catch(() => [topic]),
      ]);
      const siblings = lessonTopics.filter((t) => t !== topic);
      // One batched read for the whole lesson's bank, then split: this topic's
      // questions are the hard avoid-list, the siblings' are context so the model
      // can see what the lesson already covers.
      const lessonBank = await getQuestionsForTopics(
        [topic, ...siblings].slice(0, 60),
        { program: job.program },
      );
      const existing = lessonBank.filter((q) => q.topic === topic);
      const siblingQuestions = lessonBank.filter((q) => q.topic !== topic);
      // An explicit transcript selection (admin picked exact sources) overrides everything.
      let scoped;
      if (Array.isArray(job.transcriptIds) && job.transcriptIds.length) {
        scoped = (await Promise.all(job.transcriptIds.map((id) => getTranscriptById(id)))).filter(Boolean);
      } else {
        scoped = transcripts.length
          ? transcripts
          : await getTranscripts({ program: job.program, course: entryCourse, lesson: entry.lesson });
      }

      const source = sourceFor(scoped);
      if (!source) {
        errors.push({ topic, error: 'No transcript attached to this topic or its lesson' });
        return;
      }

      const want = Math.min(job.targetPerTopic || 5, MAX_PER_TOPIC);
      const scopeLabel = [entry.course, entry.lesson].filter(Boolean).join(' > ');
      // Own-topic stems FIRST: avoidBlock caps the list, and repeating yourself is
      // worse than repeating the topic next door.
      const avoid = [...existing, ...siblingQuestions].map((q) => q.question);
      // Whose assessment this is. Hardcoded to "a working digital marketer" until
      // 2026-09-08, which framed every AI-engineering question for a marketer.
      const audience = audienceFor(job.program, job.audience);
      const gopts = {
        provider: job.provider || 'deepseek',
        ...(job.model ? { model: job.model } : {}),
        ...(job.thinking === false ? { thinking: false } : {}),
        ...ai,
      };
      // Two grounding modes. Default (`transcript`) tests STRICTLY on the attached
      // material — right for real practitioner transcripts. `topic` anchors on the
      // topic and treats the material as a *supporting reference*, so a thin
      // goal-planned lesson brief supplements from the model's vetted expert
      // knowledge instead of starving the batch (see the "learn a goal" flow).
      const generated = job.grounding === 'topic'
        ? await generateAcademyQuestions(
          { topic, scopeLabel, reference: source, existing: avoid, siblings, audience, count: want, instructions: job.instructions || '' },
          gopts,
        )
        : await generateQuestionsFromTranscript(
          { topic, scopeLabel, transcript: source, existing: avoid, siblings, audience, count: want, instructions: job.instructions || '' },
          gopts,
        );

      // Drop anything that repeats what's already banked (the prompt asks, but never trust it).
      // Exact keys block a verbatim re-emission ACROSS THE WHOLE LESSON; the overlap
      // check additionally blocks a reword, which is the form the failure actually takes.
      const seen = new Set(lessonBank.map((q) => dedupeKey(q.question)));
      const priorSets = lessonBank.map((q) => contentWords(`${q.question} ${q.answer || ''}`));
      let written = 0;
      let dropped = 0;
      for (const q of generated) {
        const key = dedupeKey(q.question);
        if (!key || seen.has(key)) { dropped += 1; continue; }
        if (isNearDuplicate(`${q.question} ${q.answer || ''}`, priorSets)) { dropped += 1; continue; }
        seen.add(key);
        priorSets.push(contentWords(`${q.question} ${q.answer || ''}`));
        await addQuestion({
          ...q,
          program: job.program,
          source: `${job.provider || 'deepseek'}-transcript`,
          batchTag: job.batchTag,
        });
        written += 1;
      }
      if (written && entry.track) {
        await bumpQuestionCount(slug(entry.track, entry.course, entry.lesson, topic), written);
      }
      progress.questionsWritten = (progress.questionsWritten || 0) + written;
      // Surfaced so a run that keeps producing duplicates is visible rather than
      // just quietly under-delivering against targetPerTopic.
      if (dropped) progress.duplicatesDropped = (progress.duplicatesDropped || 0) + dropped;
    });
  } catch (e) {
    errors.push({ topic, error: String(e.message || e).slice(0, 300) });
  }

  progress.topicsDone = (progress.topicsDone || 0) + 1;
  progress.costUsd = Number(((progress.costUsd || 0) + (usage.costUsd || 0)).toFixed(6));

  const status = queue.length ? 'running' : 'done';
  await updateGenJob(jobId, { queue, progress, errors: errors.slice(-50), status });
  return publicJob({ ...job, queue, progress, errors, status });
}

/** The job as the admin UI sees it — queue length, not the queue itself. */
export function publicJob(job) {
  const { queue, ...rest } = job;
  const head = (queue || [])[0];
  return {
    ...rest,
    remaining: (queue || []).length,
    // The topic the NEXT step will work on. The queue itself stays server-side (it can
    // be hundreds of rows), but the admin UI needs to name what it is doing right now:
    // a step is one AI call that can run for minutes, and a progress line that cannot
    // say what it is waiting on is indistinguishable from a hang.
    next: head ? { topic: typeof head === 'string' ? head : head.topic, lesson: head && head.lesson, course: head && head.course } : null,
  };
}
