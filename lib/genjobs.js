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
import { generateQuestionsFromTranscript } from './gemini.js';
import {
  getGenJob, updateGenJob, getTranscripts, getTranscriptById, addQuestion, bumpQuestionCount, getQuestionsForTopics, slug,
} from './firestore.js';
import { newUsage, runWithUsage } from './usage.js';

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
const dedupeKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();

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
  try {
    await runWithUsage(usage, async () => {
      const [transcripts, existing] = await Promise.all([
        // Lesson-level material is the norm; a topic-specific transcript wins when there is one.
        getTranscripts({ program: job.program, course: job.scope?.course, lesson: entry.lesson, topic }),
        getQuestionsForTopics([topic], { program: job.program }),
      ]);
      // An explicit transcript selection (admin picked exact sources) overrides everything.
      let scoped;
      if (Array.isArray(job.transcriptIds) && job.transcriptIds.length) {
        scoped = (await Promise.all(job.transcriptIds.map((id) => getTranscriptById(id)))).filter(Boolean);
      } else {
        scoped = transcripts.length
          ? transcripts
          : await getTranscripts({ program: job.program, course: job.scope?.course, lesson: entry.lesson });
      }

      const source = sourceFor(scoped);
      if (!source) {
        errors.push({ topic, error: 'No transcript attached to this topic or its lesson' });
        return;
      }

      const want = Math.min(job.targetPerTopic || 5, MAX_PER_TOPIC);
      const generated = await generateQuestionsFromTranscript(
        {
          topic,
          scopeLabel: [entry.course, entry.lesson].filter(Boolean).join(' > '),
          transcript: source,
          existing: existing.map((q) => q.question),
          count: want,
          instructions: job.instructions || '',
        },
        { provider: job.provider || 'deepseek', ...(job.model ? { model: job.model } : {}), ...ai },
      );

      // Drop anything that repeats what's already banked (the prompt asks, but never trust it).
      const seen = new Set(existing.map((q) => dedupeKey(q.question)));
      let written = 0;
      for (const q of generated) {
        const key = dedupeKey(q.question);
        if (!key || seen.has(key)) continue;
        seen.add(key);
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
  return { ...rest, remaining: (queue || []).length };
}
