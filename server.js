/**
 * AGORA Mastery Engine — Cloud Run service.
 * Serves the static frontend + a JSON REST API backed by Firestore + Gemini.
 *
 * Modes:
 *   GUEST   (no auth)  -> pick any topic, random questions, score only (nothing saved)
 *   MASTERY (password) -> priority quiz, unseen-first selection, logging, generation
 */
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getCatalog,
  getQuestionsForTopics,
  getSeenQuestionTexts,
  getRecentActivity,
  getQuizLogRows,
  getTopicsRows,
  getStreak,
  logResults,
  addQuestion,
  resetProgress,
} from './lib/firestore.js';
import { deriveStats } from './lib/priority.js';
import { streamAttempts, backfillRows, replaceTopics } from './lib/bigquery.js';
import {
  generateQuestions,
  generateHint,
  generateExplanation,
  generateReview,
  generateAnalysis,
} from './lib/gemini.js';
import { runMigration } from './lib/migrate.js';
import {
  checkPassword,
  setSessionCookie,
  clearSessionCookie,
  isAuthed,
  requireAuth,
} from './lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

/* ------------------------------- helpers ---------------------------------- */

const NA = new Set(['', 'Review All', '-- N/A --', undefined, null]);
const isAll = (v) => NA.has(v);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build a topic-name -> {track,course,lesson} lookup from the catalog. */
function metaIndex(catalog) {
  const idx = new Map();
  for (const t of catalog) if (!idx.has(t.topic)) idx.set(t.topic, t);
  return idx;
}

/** Shape question docs into the payload the frontend expects. */
function packageQuestions(questions, idx, count) {
  return questions.slice(0, count).map((q) => {
    const meta = idx.get(q.topic) || {};
    return {
      track: meta.track || 'Unknown Track',
      course: meta.course || 'Unknown Course',
      lesson: meta.lesson || 'Unknown Lesson',
      topic: q.topic,
      question: q.question,
      options: q.options,
      answer: q.answer,
    };
  });
}

/** Filter the catalog rows down to a Track>Course>Lesson>Topic selection. */
function scopeCatalog(catalog, { track, course, lesson, topic }) {
  if (!isAll(topic)) return catalog.filter((r) => r.topic === topic);
  if (!isAll(lesson)) return catalog.filter((r) => r.lesson === lesson);
  if (!isAll(course)) return catalog.filter((r) => r.course === course);
  if (!isAll(track)) return catalog.filter((r) => r.track === track);
  return catalog;
}

const clampCount = (c) => Math.min(50, Math.max(1, parseInt(c, 10) || 5));

/* Lightweight per-IP rate limiter for the public AI endpoints (cost guard). */
const aiHits = new Map(); // ip -> { count, resetAt }
const AI_WINDOW_MS = 60 * 1000;
const AI_MAX = 25; // per IP per minute
function rateLimitAI(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'anon';
  const now = Date.now();
  const rec = aiHits.get(ip);
  if (!rec || now > rec.resetAt) {
    aiHits.set(ip, { count: 1, resetAt: now + AI_WINDOW_MS });
    return next();
  }
  if (rec.count >= AI_MAX) {
    return res.status(429).json({ error: 'Too many AI requests. Give it a minute.' });
  }
  rec.count++;
  next();
}

/* --------------------------------- auth ----------------------------------- */

app.post('/api/auth/login', (req, res) => {
  if (!checkPassword(req.body?.password)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  setSessionCookie(res);
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/status', (req, res) => {
  res.json({ authed: isAuthed(req) });
});

/* -------------------------------- catalog --------------------------------- */
// Public: guests need the topic tree to pick what to practice.
app.get('/api/catalog', async (_req, res, next) => {
  try {
    const catalog = await getCatalog();
    res.json(
      catalog.map((t) => ({
        track: t.track,
        course: t.course,
        lesson: t.lesson,
        topic: t.topic,
        accuracy: t.totalAttempts ? Math.round((t.correctCount / t.totalAttempts) * 100) : null,
        priority: t.priority ?? null,
        totalAttempts: t.totalAttempts ?? 0,
        correctCount: t.correctCount ?? 0,
      }))
    );
  } catch (e) {
    next(e);
  }
});

/* --------------------------------- stats ---------------------------------- */
// Auth: progress analytics over the topics catalog + recent quizLog activity.
// All aggregation is in-memory over the (~540-row) catalog — no extra indexes.
function toDate(v) {
  return v?.toDate ? v.toDate() : v || null;
}

function buildStats(catalog, daily, now = new Date()) {
  // Per-topic derived view (accuracy %, daysSince, priority).
  const topics = catalog.map((t) => {
    const stats = {
      correctCount: t.correctCount || 0,
      totalAttempts: t.totalAttempts || 0,
      lastAttempted: toDate(t.lastAttempted),
    };
    const d = deriveStats(stats, now);
    return {
      track: t.track,
      course: t.course,
      lesson: t.lesson,
      topic: t.topic,
      attempts: stats.totalAttempts,
      correct: stats.correctCount,
      accuracy: stats.totalAttempts ? d.accuracy : null,
      daysSince: stats.totalAttempts ? d.daysSince : null,
      priority: d.priority,
    };
  });

  const attempted = topics.filter((t) => t.attempts > 0);
  const totalAttempts = attempted.reduce((s, t) => s + t.attempts, 0);
  const totalCorrect = attempted.reduce((s, t) => s + t.correct, 0);

  const overview = {
    topics: topics.length,
    attempted: attempted.length,
    neverAttempted: topics.length - attempted.length,
    coverage: topics.length ? Math.round((attempted.length / topics.length) * 100) : 0,
    totalAttempts,
    overallAccuracy: totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : null,
  };

  // Weakest *practiced* topics — highest priority first (low accuracy / stale).
  const weakest = [...attempted]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 15);

  // Per-course rollup, weakest course first (lowest accuracy among practiced).
  const byCourseMap = new Map();
  for (const t of topics) {
    const key = `${t.track}||${t.course}`;
    const c = byCourseMap.get(key) || {
      track: t.track, course: t.course,
      topics: 0, attempted: 0, attempts: 0, correct: 0,
    };
    c.topics += 1;
    if (t.attempts > 0) {
      c.attempted += 1;
      c.attempts += t.attempts;
      c.correct += t.correct;
    }
    byCourseMap.set(key, c);
  }
  const byCourse = [...byCourseMap.values()]
    .map((c) => ({
      track: c.track,
      course: c.course,
      topics: c.topics,
      attempted: c.attempted,
      attempts: c.attempts,
      accuracy: c.attempts ? Math.round((c.correct / c.attempts) * 100) : null,
    }))
    .filter((c) => c.attempts > 0)
    .sort((a, b) => a.accuracy - b.accuracy);

  return { overview, weakest, byCourse, daily };
}

app.get('/api/stats', requireAuth, async (_req, res, next) => {
  try {
    const [catalog, daily] = await Promise.all([getCatalog(), getRecentActivity(14)]);
    res.json(buildStats(catalog, daily));
  } catch (e) {
    next(e);
  }
});

// Auth: current activity streak (consecutive days with a logged attempt).
app.get('/api/streak', requireAuth, async (_req, res, next) => {
  try {
    res.json({ streak: await getStreak() });
  } catch (e) {
    next(e);
  }
});

/**
 * "Progress" summary using the tree metric the dashboard shows:
 * a topic's progress = its accuracy, or 0 if never attempted; a parent's
 * progress = the unweighted average across all its topics. Aggregated to
 * course/track and surfaced as weakest-topic and by-course lists for the AI
 * progress analysis.
 */
function topicProgressPct(t) {
  return t.totalAttempts ? Math.round((t.correctCount / t.totalAttempts) * 100) : 0;
}

function buildProgressSummary(catalog) {
  const topics = catalog.map((t) => ({
    track: t.track,
    course: t.course,
    lesson: t.lesson,
    topic: t.topic,
    attempts: t.totalAttempts || 0,
    progress: topicProgressPct(t),
  }));

  const overallProgress = topics.length
    ? Math.round(topics.reduce((s, t) => s + t.progress, 0) / topics.length)
    : 0;
  const attempted = topics.filter((t) => t.attempts > 0).length;

  const cmap = new Map();
  for (const t of topics) {
    const key = `${t.track}||${t.course}`;
    const c = cmap.get(key) || { track: t.track, course: t.course, sum: 0, n: 0, attempted: 0 };
    c.sum += t.progress;
    c.n += 1;
    if (t.attempts > 0) c.attempted += 1;
    cmap.set(key, c);
  }
  const byCourse = [...cmap.values()]
    .map((c) => ({
      track: c.track,
      course: c.course,
      progress: Math.round(c.sum / c.n),
      topics: c.n,
      attempted: c.attempted,
    }))
    .sort((a, b) => a.progress - b.progress);

  const weakest = [...topics]
    .sort((a, b) => a.progress - b.progress || b.attempts - a.attempts)
    .slice(0, 15);

  return { overall: { topics: topics.length, attempted, overallProgress }, byCourse, weakest };
}

/* ----------------------------- guest quiz --------------------------------- */
// Public: random questions for the chosen scope. No history, no logging.
app.post('/api/quiz/guest', async (req, res, next) => {
  try {
    const count = clampCount(req.body?.count);
    const catalog = await getCatalog();
    const scoped = scopeCatalog(catalog, req.body || {});
    const topicNames = [...new Set(scoped.map((r) => r.topic))].filter(Boolean);
    if (!topicNames.length) return res.json([]);

    const pool = await getQuestionsForTopics(topicNames);
    res.json(packageQuestions(shuffle(pool), metaIndex(catalog), count));
  } catch (e) {
    next(e);
  }
});

/* ---------------------------- mastery quiz -------------------------------- */
// Auth: ranks scoped topics by priority, serves UNSEEN questions before seen.
app.post('/api/quiz/select', requireAuth, async (req, res, next) => {
  try {
    const count = clampCount(req.body?.count);
    const catalog = await getCatalog();
    const seen = await getSeenQuestionTexts();

    const scoped = scopeCatalog(catalog, req.body || {});
    const targetTopics = scoped
      .filter((r) => r.topic && r.priority != null)
      .sort((a, b) => (b.priority - a.priority) || (Math.random() - 0.5))
      .slice(0, 15)
      .map((r) => r.topic);

    const valid = await getQuestionsForTopics([...new Set(targetTopics)]);
    const unseen = shuffle(valid.filter((q) => !seen.has(q.question.trim())));
    const seenQs = shuffle(valid.filter((q) => seen.has(q.question.trim())));

    res.json(packageQuestions([...unseen, ...seenQs], metaIndex(catalog), count));
  } catch (e) {
    next(e);
  }
});

// Auth: the priority quiz. It ALWAYS mixes across every Track/Path (interleaving)
// so a daily run practises all areas, weakest topics first within each track.
// Selection is in-memory over the (~540-row) catalog, so no composite index.
app.post('/api/quiz/priority', requireAuth, async (req, res, next) => {
  try {
    const count = clampCount(req.body?.count);
    const catalog = await getCatalog();
    const idx = metaIndex(catalog);

    // Rank each track's topics by priority (weakest/stalest first).
    const byTrack = new Map();
    for (const r of catalog) {
      if (!r.topic || r.priority == null) continue;
      if (!byTrack.has(r.track)) byTrack.set(r.track, []);
      byTrack.get(r.track).push(r);
    }
    for (const list of byTrack.values()) {
      list.sort((a, b) => (b.priority - a.priority) || (Math.random() - 0.5));
    }

    // Round-robin across tracks so every track is represented in the topic pool.
    const tracks = shuffle([...byTrack.keys()]);
    const orderedTopics = [];
    for (let i = 0, added = true; added; i++) {
      added = false;
      for (const t of tracks) {
        const list = byTrack.get(t);
        if (i < list.length) { orderedTopics.push(list[i].topic); added = true; }
      }
    }
    const topicNames = [...new Set(orderedTopics)].slice(0, 90);
    const pool = await getQuestionsForTopics(topicNames);

    // Group available questions by track, then interleave round-robin across
    // tracks so consecutive questions come from different paths.
    const qByTrack = new Map();
    for (const q of shuffle(pool)) {
      const tr = (idx.get(q.topic) || {}).track || 'Unknown';
      if (!qByTrack.has(tr)) qByTrack.set(tr, []);
      qByTrack.get(tr).push(q);
    }
    const qTracks = shuffle([...qByTrack.keys()]);
    const interleaved = [];
    for (let more = true; more && interleaved.length < count; ) {
      more = false;
      for (const tr of qTracks) {
        const list = qByTrack.get(tr);
        if (list.length) {
          interleaved.push(list.shift());
          more = true;
          if (interleaved.length >= count) break;
        }
      }
    }

    res.json(packageQuestions(interleaved, idx, count));
  } catch (e) {
    next(e);
  }
});

// Auth: persist results + update running mastery stats.
app.post('/api/quiz/log', requireAuth, async (req, res, next) => {
  try {
    const results = Array.isArray(req.body?.results) ? req.body.results : [];
    if (!results.length) return res.json({ ok: true, topicsUpdated: 0 });
    const topicsUpdated = await logResults(results);
    // Mirror into BigQuery for analytics (best-effort, non-blocking):
    //  - append each attempt to quiz_log
    //  - refresh the topics mastery snapshot (stats just changed)
    streamAttempts(results).catch(() => {});
    getTopicsRows().then(replaceTopics).catch(() => {});
    res.json({ ok: true, topicsUpdated });
  } catch (e) {
    next(e);
  }
});

/* --------------------------- question generation -------------------------- */
// Auth: Gemini generates new mastery-level MCQs into the bank.
app.post('/api/generate', requireAuth, async (req, res, next) => {
  try {
    const count = clampCount(req.body?.count);
    const catalog = await getCatalog();
    const scoped = scopeCatalog(catalog, req.body || {});
    const topics = [...new Set(scoped.map((r) => r.topic))].filter(Boolean);
    if (!topics.length) return res.status(400).json({ error: 'No topics in scope' });

    let created = 0;
    const errors = [];
    for (const topic of topics) {
      try {
        const existing = await getQuestionsForTopics([topic]);
        const baseline = existing.slice(0, 8).map((q) => ({ q: q.question, a: q.answer }));
        const generated = await generateQuestions(topic, baseline, count);
        for (const g of generated) {
          await addQuestion(g);
          created++;
        }
      } catch (e) {
        errors.push(`${topic}: ${e.message}`);
      }
    }
    res.json({ ok: true, created, topics: topics.length, errors });
  } catch (e) {
    next(e);
  }
});

/* --------------------------- progress AI features ------------------------- */
// Auth: AI study guide for a scope — reads the existing questions and teaches
// the concepts the learner needs BEFORE attempting that section.
app.post('/api/review', requireAuth, async (req, res, next) => {
  try {
    const catalog = await getCatalog();
    const scoped = scopeCatalog(catalog, req.body || {});
    const topics = [...new Set(scoped.map((r) => r.topic))].filter(Boolean).slice(0, 60);
    if (!topics.length) return res.status(400).json({ error: 'No topics in this section yet' });

    const pool = await getQuestionsForTopics(topics);
    const questions = shuffle(pool)
      .slice(0, 40)
      .map((q) => ({ topic: q.topic, question: q.question, answer: q.answer }));

    const { track, course, lesson, topic } = req.body || {};
    const scopeLabel = !isAll(topic) ? topic
      : !isAll(lesson) ? lesson
      : !isAll(course) ? course
      : !isAll(track) ? track
      : 'Your selection';

    const review = await generateReview({ scopeLabel, topics, questions });
    res.json({ review });
  } catch (e) {
    next(e);
  }
});

// Auth: AI analysis of the learner's overall progress dashboard.
app.post('/api/analyze', requireAuth, async (_req, res, next) => {
  try {
    const catalog = await getCatalog();
    const analysis = await generateAnalysis(buildProgressSummary(catalog));
    res.json({ analysis });
  } catch (e) {
    next(e);
  }
});

/* ------------------------------- AI tutor --------------------------------- */
// Public (rate-limited): a hint that does NOT reveal the answer.
app.post('/api/hint', rateLimitAI, async (req, res, next) => {
  try {
    const { question, options, answer } = req.body || {};
    if (!question || !Array.isArray(options)) {
      return res.status(400).json({ error: 'question and options are required' });
    }
    const hint = await generateHint({ question, options, answer: answer || '' });
    res.json({ hint });
  } catch (e) {
    next(e);
  }
});

// Public (rate-limited): a from-scratch explanation, shown after answering.
app.post('/api/explain', rateLimitAI, async (req, res, next) => {
  try {
    const { question, options, answer, userAnswer, isCorrect } = req.body || {};
    if (!question || !Array.isArray(options) || !answer) {
      return res.status(400).json({ error: 'question, options and answer are required' });
    }
    const explanation = await generateExplanation({
      question, options, answer, userAnswer, isCorrect: !!isCorrect,
    });
    res.json({ explanation });
  } catch (e) {
    next(e);
  }
});

/* -------------------------------- admin ----------------------------------- */
// Auth: wipe all progress (reset topic stats + delete quiz history). Keeps the
// catalog and the question bank. Start-from-scratch.
app.post('/api/admin/reset', requireAuth, async (_req, res, next) => {
  try {
    const report = await resetProgress();
    // Best-effort: refresh the BigQuery topics snapshot to mirror the wipe.
    getTopicsRows().then(replaceTopics).catch(() => {});
    res.json({ ok: true, ...report });
  } catch (e) {
    next(e);
  }
});

// Auth: one-time CSV -> Firestore import (idempotent).
app.post('/api/admin/migrate', requireAuth, async (_req, res, next) => {
  try {
    const report = await runMigration();
    res.json({ ok: true, report });
  } catch (e) {
    next(e);
  }
});

// Auth: one-time backfill of historical quizLog into BigQuery. Idempotent only
// in the sense of "re-runnable" — running twice duplicates rows, so call once.
app.post('/api/admin/bq-backfill', requireAuth, async (_req, res, next) => {
  try {
    const rows = await getQuizLogRows();
    const inserted = await backfillRows(rows);
    res.json({ ok: true, inserted });
  } catch (e) {
    next(e);
  }
});

// Auth: refresh the BigQuery `topics` mastery snapshot from live Firestore.
// Full replace (WRITE_TRUNCATE) — safe to re-run anytime; also runs
// automatically after every logged quiz.
app.post('/api/admin/bq-sync-topics', requireAuth, async (_req, res, next) => {
  try {
    const rows = await getTopicsRows();
    const synced = await replaceTopics(rows);
    res.json({ ok: true, synced });
  } catch (e) {
    next(e);
  }
});

/* ------------------------------ static + 404 ------------------------------ */
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// JSON error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Mastery Engine listening on :${PORT}`));
