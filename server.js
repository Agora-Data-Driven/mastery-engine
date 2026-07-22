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
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

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
  getAllQuestions,
  getQuestionById,
  bulkUpdateQuestions,
  bulkUpdateFlashcards,
  getFlashcards,
  getFlashcardById,
  getAllFlashcards,
  getAllFlashcardsWithId,
  saveFlashcards,
  studyGuideId,
  getStudyGuide,
  saveStudyGuide,
  getStudyGuideIds,
  getFlashcardStatuses,
  setFlashcardStatus,
  getCardChat,
  saveCardChat,
  resetCardChat,
  getCardOverlays,
  getScopeChat,
  saveScopeChat,
  getTopicAttempts,
  listAssistantChats,
  getAssistantChat,
  saveAssistantChat,
  deleteAssistantChat,
  mergeIntoMathematics,
  getGraphLinks,
  saveGraphLinks,
  setTopicOrders,
  moveTopics,
  addUsage,
  getUsage,
  slug,
  resolveProgramScope,
  backfillPrograms,
  getPrograms,
  saveProgram,
  getEnrollment,
  setEnrollment,
  upsertTopic,
  upsertTopics,
  deleteTopic,
  addTranscript,
  getTranscripts,
  getTranscriptById,
  deleteTranscript,
  updateTranscript,
  createGenJob,
  getGenJob,
  listGenJobs,
  updateGenJob,
  flagQuestion,
  listQuestionFlags,
  resolveQuestionFlag,
  deleteQuestionBatch,
  saveRoadmap,
  getRoadmap,
  listRoadmaps,
  deleteRoadmap,
  collectRoadmapTracks,
  getShelf,
  setShelf,
  listBankTracks,
} from './lib/firestore.js';
import * as watcher from './lib/watcher.js';
import { stepGenJob, publicJob } from './lib/genjobs.js';
import { deriveStats } from './lib/priority.js';
import { DEFAULT_PROGRAM } from './lib/programs.js';
import {
  toNode,
  buildFlowEdges,
  buildPrereqEdges,
  computeInsights,
  prereqContext,
} from './lib/graph.js';
import { streamAttempts, backfillRows, replaceTopics } from './lib/bigquery.js';
import {
  generateQuestions,
  generateHint,
  generateExplanation,
  generateReview,
  generateLesson,
  generateAnalysis,
  generateConfusions,
  generateDrillQuestion,
  generateSimilarQuestions,
  generateFlashcards,
  generateFlashcardQuestion,
  generateCardChat,
  generateScopeChat,
  generateAssistantChat,
  streamAssistantChat,
  generateFlashcardQuestions,
  generateTopicLinks,
  generateTopicOrder,
  classifyTranscript,
  planCurriculum,
  planRoadmap,
  writeLessonBrief,
  latexifyQuestions,
  reformatFlashcards,
  editFlashcard,
  gradeExplanation,
  reformatQuestions,
  restoreLatexEscapes,
} from './lib/gemini.js';
import { holisticProfile } from './lib/sentinel.js';
import { runWithUsage, newUsage } from './lib/usage.js';
import { listOllamaModels } from './lib/ollama.js';
import { listLMStudioModels } from './lib/lmstudio.js';
import { deepseekConfigured, listDeepSeekModels } from './lib/deepseek.js';
import { kimiConfigured, listKimiModels } from './lib/kimi.js';
import { runMigration } from './lib/migrate.js';
import {
  checkPassword,
  setSessionCookie,
  clearSessionCookie,
  clearUserCookie,
  setUserCookie,
  setActAs,
  clearActAs,
  isAuthed,
  isAdmin,
  isAdminEmail,
  effectiveUser,
  authContext,
  requireAuth,
  requireAdmin,
  DEFAULT_ACCOUNT,
} from './lib/auth.js';
import * as googleauth from './lib/googleauth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

/*
 * Who may embed this app in a frame.
 *
 * It ships inside two sibling apps already — the public website's /skill-mastery page and
 * Sentinel's Academy tab — and the shared `ag_sso` cookie only rides along because they all sit
 * under agoradatadriven.com. Until now NO framing header was sent at all, which let ANY site frame
 * the app (clickjacking); this pins it to the Agora family while keeping both real embeds working.
 * Override with FRAME_ANCESTORS (space-separated sources) if a new host ever needs it.
 */
const FRAME_ANCESTORS = process.env.FRAME_ANCESTORS
  || "'self' https://*.agoradatadriven.com https://agoradatadriven.com";
app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', `frame-ancestors ${FRAME_ANCESTORS}`);
  next();
});

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

/**
 * A topic-name -> {track,course,lesson} lookup that PREFERS rows living inside
 * the requested scope container (track/course/lesson).
 *
 * A few topic names are shared by two different lessons/courses — e.g. "Anomaly
 * Detection" exists under BOTH the "Supervised Machine Learning" and
 * "Unsupervised Learning, Recommenders, Reinforcement" lessons. Questions in the
 * bank are keyed by topic NAME only, so the plain metaIndex resolves such a name
 * to whichever catalog row sorts first by doc-id (here: the Supervised one). A
 * quiz launched from the OTHER lesson then gets its results slugged to the wrong
 * topic doc — so a perfect score shows no progress on the section you clicked.
 *
 * When the request names a track/course/lesson, resolve shared names to the row
 * that actually lives in that container. Falls back to the global first-by-name
 * for topics outside the scope (and for unscoped, cross-topic quizzes).
 */
function scopedMetaIndex(catalog, scope = {}) {
  const idx = metaIndex(catalog);
  if ([scope.track, scope.course, scope.lesson].every(isAll)) return idx;
  const overridden = new Set();
  for (const r of catalog) {
    if (!r.topic || overridden.has(r.topic)) continue;
    if (!isAll(scope.track) && r.track !== scope.track) continue;
    if (!isAll(scope.course) && r.course !== scope.course) continue;
    if (!isAll(scope.lesson) && r.lesson !== scope.lesson) continue;
    idx.set(r.topic, r); // an in-scope row wins over the global first-by-name
    overridden.add(r.topic);
  }
  return idx;
}

/** Shape question docs into the payload the frontend expects. */
function packageQuestions(questions, idx, count) {
  return questions.slice(0, count).map((q) => {
    const meta = idx.get(q.topic) || {};
    return {
      id: q.id, // needed by the admin "Fix format" button
      track: meta.track || 'Unknown Track',
      course: meta.course || 'Unknown Course',
      lesson: meta.lesson || 'Unknown Lesson',
      topic: q.topic,
      // restoreLatexEscapes repairs any control-char-mangled LaTeX ("\texttt"
      // arriving as a literal tab) at read time, so even questions banked before
      // the generator fix render correctly.
      question: restoreLatexEscapes(q.question),
      options: Array.isArray(q.options) ? q.options.map(restoreLatexEscapes) : q.options,
      answer: restoreLatexEscapes(q.answer),
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

/**
 * The BigQuery mirror stays on the DEFAULT program deliberately. Its tables feed
 * the existing data-science dashboards and aren't program-aware, so a second
 * curriculum's topics must not leak into that snapshot. It's pinned to the
 * constant rather than the owner's enrollment so enrolling him in another program
 * later can't silently change what the dashboards report.
 */
const BQ_SCOPE = { program: DEFAULT_PROGRAM, courses: [] };

/** The AI engine the client picked (cookies set by the home-page dropdown). */
function aiChoice(req) {
  const p = req.cookies?.aiProvider;
  const provider = ['deepseek', 'kimi', 'ollama', 'lmstudio'].includes(p) ? p : 'gemini';
  const model = req.cookies?.aiModel ? decodeURIComponent(req.cookies.aiModel) : undefined;
  // Extended thinking (Gemini): ON unless the user explicitly turned it off, so
  // nothing regresses by default; turning it off trades some depth for speed.
  const thinking = req.cookies?.aiThinking !== 'off';
  return { provider, model, thinking };
}

/** The question difficulty the learner picked (cookie set by the settings panel).
 *  'auto' (default) ramps from their per-topic history; core|balanced|challenge
 *  override it. */
function difficultyChoice(req) {
  const d = req.cookies?.difficulty;
  return ['core', 'balanced', 'challenge'].includes(d) ? d : 'auto';
}

/**
 * Run `fn` over `items` with at most `limit` promises in flight, preserving
 * result order. Used to fan out per-topic LLM generation instead of awaiting
 * each topic serially (N round-trips -> ceil(N/limit) waves).
 */
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Stream a text response. `produce(onToken)` should call onToken with chunks.
 * Headers are set lazily on the first chunk so that an error before any output
 * can still be returned as a clean JSON 500.
 */
async function streamText(res, produce) {
  let wrote = false;
  const onToken = (t) => {
    if (!wrote) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no'); // don't buffer the stream
      wrote = true;
    }
    res.write(t);
  };
  try {
    await produce(onToken);
    if (!wrote) res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end();
  } catch (e) {
    if (!wrote) res.status(500).json({ error: e.message || 'AI request failed' });
    else { try { res.end(); } catch { /* already closed */ } }
  }
}

/**
 * Server-Sent Events for the admin planners: open the stream, then push typed
 * events — 'thinking'/'content' token deltas while the model works, then one
 * 'result' with the finished plan, then 'done'. The Composing Room renders the
 * thinking live so you can watch the model reason instead of staring at a spinner.
 * Disabling buffering + an opening comment defeats proxy buffering on Cloud Run.
 */
function sseInit(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  res.write(': open\n\n');
}
function sseSend(res, event, data) {
  // JSON.stringify keeps the payload to a single line, so the `data:` framing holds.
  res.write(`event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`);
}

/** The AI engine an admin composer request picked (provider/model/thinking in the
 *  body, written by the Composing Room's rail control). Thinking defaults ON. */
const aiFromBody = (req) => ({
  provider: req.body?.provider || 'deepseek',
  ...(req.body?.model ? { model: req.body.model } : {}),
  thinking: req.body?.thinking !== false,
});

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

// The account whose progress a request reads/writes: the effective user when signed in, else null
// (guest). Guests see the catalog with fresh/zero stats.
const optionalUser = (req) => (isAuthed(req) ? effectiveUser(req) : null);

/**
 * The {program, courses} slice of the bank this request may see — pass it to
 * getCatalog/getQuestionsForTopics so a learner only ever gets their own
 * curriculum. Resolved from the user's enrollment; `?program=` (or a `program` in
 * the body) is honoured only for admins and guests, so it can never widen a
 * learner's access (see lib/programs.js resolveScope).
 *
 * Everyone who existed before programs did resolves to the default program with
 * no course limit, which is exactly the whole catalog they see today.
 */
const requestScope = (req) =>
  resolveProgramScope(optionalUser(req), {
    requested: req.query?.program || req.body?.program || '',
    isAdmin: isAdmin(req),
  });

// AI cost accounting: scope every /api request in an AsyncLocalStorage usage
// tally that the provider calls write into (lib/usage.js). When the response
// finishes (works for streaming too) and any tokens were spent, persist the
// delta to the signed-in user's lifetime tally for the on-screen cost widget.
app.use('/api', (req, res, next) => {
  const store = newUsage();
  res.on('finish', () => {
    if (store.calls > 0) {
      const user = optionalUser(req);
      if (user) addUsage(user, store).catch(() => {});
    }
  });
  runWithUsage(store, () => next());
});

app.post('/api/auth/login', (req, res) => {
  if (!checkPassword(req.body?.password)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  setSessionCookie(res);
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(res);
  clearUserCookie(res);
  clearActAs(res);
  res.json({ ok: true });
});

// Rich auth context (used by the frontend to show who you are / who you're acting as).
app.get('/api/auth/status', (req, res) => res.json(authContext(req)));
app.get('/api/auth/whoami', (req, res) => res.json(authContext(req)));

// Whether Google sign-in is wired (frontend hides the button when not).
app.get('/api/auth/google/enabled', (_req, res) => res.json({ enabled: googleauth.isConfigured() }));

// Google OAuth: start the flow (stash a CSRF state cookie), then handle the callback.
app.get('/api/auth/google/login', (req, res) => {
  if (!googleauth.isConfigured()) return res.redirect('/');
  const state = googleauth.newState();
  res.cookie('g_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600000, path: '/' });
  res.redirect(googleauth.authUrl(state));
});

app.get('/api/auth/google/callback', async (req, res) => {
  if (!googleauth.isConfigured()) return res.redirect('/');
  if (!req.query.state || req.query.state !== req.cookies?.g_state) {
    return res.redirect('/?login=error');
  }
  res.clearCookie('g_state', { path: '/' });
  const { email } = await googleauth.exchangeCode(req.query.code);
  if (!email) return res.redirect('/?login=error');
  setUserCookie(res, email);
  res.redirect('/?login=ok');
});

// Impersonation (admins): act as any user, or stop.
app.post('/api/auth/act-as', requireAdmin, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || email.indexOf('@') < 0) return res.status(400).json({ error: 'A valid email is required' });
  setActAs(res, email);
  res.json({ ok: true, actingAs: email });
});
app.post('/api/auth/stop-acting', requireAdmin, (req, res) => {
  clearActAs(res);
  res.json({ ok: true });
});

/* -------------------------------- catalog --------------------------------- */
// Public: guests need the topic tree to pick what to practice.
/**
 * The learner's Mastery-Engine shelf as a concrete (program, track) set: their
 * CURATED shelf if they have one, else DERIVED from enrollment (every track in
 * their enrolled programs) so never-curated users are unaffected. null for guests.
 */
async function effectiveShelf(email) {
  if (!email) return null;
  const shelf = await getShelf(email);
  if (shelf && shelf.tracks.length) return shelf.tracks;
  const enr = await getEnrollment(email);
  const set = new Map();
  for (const program of enr.programs) {
    const cat = await getCatalog(email, { program, courses: enr.courses });
    for (const r of cat) if (r.track) set.set(JSON.stringify([program, r.track]), { program, track: r.track });
  }
  return [...set.values()];
}

app.get('/api/catalog', async (req, res, next) => {
  try {
    const email = optionalUser(req);
    let catalog;
    // Learner app (no ?program) → the user's Mastery-Engine shelf (curated tracks,
    // may span programs). Admin/curation loads pass ?program → the old program
    // scope, unchanged. Guests → their default program scope.
    if (email && !req.query.program) {
      const tracks = (await effectiveShelf(email)) || [];
      const set = new Set(tracks.map((t) => JSON.stringify([t.program, t.track])));
      const full = await getCatalog(email, null); // whole bank + this user's stats
      catalog = full.filter((t) => set.has(JSON.stringify([t.program || DEFAULT_PROGRAM, t.track])));
    } else {
      catalog = await getCatalog(email, await requestScope(req));
    }
    res.json(
      catalog.map((t) => ({
        id: t.id,
        // The topic's program — carried so a track pulled from any program launches
        // its quizzes correctly (the learner shelf can span programs).
        program: t.program || DEFAULT_PROGRAM,
        track: t.track,
        course: t.course,
        lesson: t.lesson,
        topic: t.topic,
        // Pedagogical within-lesson study order (admin "Sequence Topics" sweep);
        // null when not yet sequenced, which sorts to the end / alphabetical.
        order: Number.isFinite(t.order) ? t.order : null,
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

/* --------------------------------- models --------------------------------- */
// Public: which AI engines are available. Gemini (cloud) always; local engines
// (Ollama, LM Studio) only when this server can reach them (i.e. run locally).
app.get('/api/models', async (_req, res, next) => {
  try {
    // Cloud (Gemini): offer both the fast and the higher-quality Pro variant.
    const geminiModels = [...new Set([
      process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
    ])];
    const providers = [{ id: 'gemini', label: 'Cloud', models: geminiModels }];
    // DeepSeek (hosted): available whenever an API key is configured.
    if (deepseekConfigured()) providers.push({ id: 'deepseek', label: 'DeepSeek', models: listDeepSeekModels() });
    // Kimi (hosted): available whenever an API key is configured.
    if (kimiConfigured()) providers.push({ id: 'kimi', label: 'Kimi', models: listKimiModels() });
    // Local engines only when this server can reach them (i.e. run locally).
    const [ollama, lmstudio] = await Promise.all([listOllamaModels(), listLMStudioModels()]);
    if (ollama.length) providers.push({ id: 'ollama', label: 'Local (Ollama)', models: ollama });
    if (lmstudio.length) providers.push({ id: 'lmstudio', label: 'Local (LM Studio)', models: lmstudio });
    res.json({
      providers,
      deepseekAvailable: deepseekConfigured(),
      kimiAvailable: kimiConfigured(),
      ollamaAvailable: ollama.length > 0,
      lmstudioAvailable: lmstudio.length > 0,
    });
  } catch (e) {
    next(e);
  }
});

// Public: the whole question bank with hierarchy, for offline caching in the
// browser. Lets the app serve quizzes and render menus without a connection.
app.get('/api/questions/all', async (req, res, next) => {
  try {
    // Guests may name any program here (this cache is public and the content
    // isn't secret); without one they get the default program's bank.
    const scope = await requestScope(req);
    const [catalog, questions] = await Promise.all([getCatalog(null, scope), getAllQuestions(scope)]);
    const idx = metaIndex(catalog);
    res.json(
      questions
        .filter((q) => q.question && Array.isArray(q.options))
        .map((q) => {
          const m = idx.get(q.topic) || {};
          return {
            id: q.id, // needed by the admin "Fix format" button
            track: m.track || '',
            course: m.course || '',
            lesson: m.lesson || '',
            topic: q.topic,
            question: restoreLatexEscapes(q.question),
            options: Array.isArray(q.options) ? q.options.map(restoreLatexEscapes) : q.options,
            answer: restoreLatexEscapes(q.answer),
          };
        })
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

app.get('/api/stats', requireAuth, async (req, res, next) => {
  try {
    const [catalog, daily] = await Promise.all([
      getCatalog(req.userEmail, await requestScope(req)),
      getRecentActivity(req.userEmail, 14),
    ]);
    res.json(buildStats(catalog, daily));
  } catch (e) {
    next(e);
  }
});

// Auth: current activity streak (consecutive days with a logged attempt).
app.get('/api/streak', requireAuth, async (req, res, next) => {
  try {
    res.json({ streak: await getStreak(req.userEmail) });
  } catch (e) {
    next(e);
  }
});

// Auth: lifetime AI token/cost tally for the on-screen cost calculator.
app.get('/api/usage', requireAuth, async (req, res, next) => {
  try {
    res.json(await getUsage(req.userEmail));
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
    const scope = await requestScope(req);
    const catalog = await getCatalog(optionalUser(req), scope);
    const scoped = scopeCatalog(catalog, req.body || {});
    const topicNames = [...new Set(scoped.map((r) => r.topic))].filter(Boolean);
    if (!topicNames.length) return res.json([]);

    const pool = await getQuestionsForTopics(topicNames, scope);
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
    const scope = await requestScope(req);
    const catalog = await getCatalog(req.userEmail, scope);
    const seen = await getSeenQuestionTexts(req.userEmail);

    const scoped = scopeCatalog(catalog, req.body || {});
    const targetTopics = scoped
      .filter((r) => r.topic && r.priority != null)
      .sort((a, b) => (b.priority - a.priority) || (Math.random() - 0.5))
      .slice(0, 15)
      .map((r) => r.topic);

    const valid = await getQuestionsForTopics([...new Set(targetTopics)], scope);
    const unseen = shuffle(valid.filter((q) => !seen.has(q.question.trim())));
    const seenQs = shuffle(valid.filter((q) => seen.has(q.question.trim())));

    // Resolve topic hierarchy within the requested scope so a topic name shared
    // by two lessons is credited to the section the learner actually launched.
    res.json(packageQuestions([...unseen, ...seenQs], scopedMetaIndex(catalog, req.body || {}), count));
  } catch (e) {
    next(e);
  }
});

// Public + mastery: quiz over an EXPLICIT set of topics (the multi-select Live
// Quiz builder). The client resolves its checkbox tree to a union of topic names
// and posts them here. Signed-in users get unseen questions first (like
// /api/quiz/select); guests just get a shuffled sample.
app.post('/api/quiz/multi', async (req, res, next) => {
  try {
    const count = clampCount(req.body?.count);
    const topics = [...new Set((Array.isArray(req.body?.topics) ? req.body.topics : [])
      .map((t) => String(t || '').trim()).filter(Boolean))];
    if (!topics.length) return res.json([]);

    const user = optionalUser(req);
    const scope = await requestScope(req);
    const catalog = await getCatalog(user, scope);
    const pool = await getQuestionsForTopics(topics, scope);
    if (!user) {
      return res.json(packageQuestions(shuffle(pool), metaIndex(catalog), count));
    }
    const seen = await getSeenQuestionTexts(user);
    const unseen = shuffle(pool.filter((q) => !seen.has(q.question.trim())));
    const seenQs = shuffle(pool.filter((q) => seen.has(q.question.trim())));
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
    const scope = await requestScope(req);
    const catalog = await getCatalog(req.userEmail, scope);
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
    const pool = await getQuestionsForTopics(topicNames, scope);

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

// Auth: the flashcard analogue of the Mastery quiz. Instead of one deck, build a
// single review deck of cards drawn from the learner's WEAKEST topics, interleaved
// round-robin across tracks (and across topics within a track) — the same "mix it
// up, weakest first" philosophy as /api/quiz/priority, applied to flashcards.
const MASTERY_DECK_SIZE = 24;
app.post('/api/flashcards/mastery', requireAuth, async (req, res, next) => {
  try {
    const catalog = await getCatalog(req.userEmail, await requestScope(req));
    // Priority per topic (weakest/stalest first), carrying its track for interleaving.
    const topicMeta = new Map();
    for (const r of catalog) {
      if (!r.topic || r.priority == null) continue;
      if (!topicMeta.has(r.topic)) topicMeta.set(r.topic, { track: r.track || 'Unknown', priority: r.priority });
    }

    // All cards, grouped by topic; keep only the MOST-SPECIFIC deck level per topic
    // (topic > lesson > course) so we don't mix near-duplicate cards from wider decks.
    const LEVEL_RANK = { topic: 3, lesson: 2, course: 1 };
    const all = await getAllFlashcardsWithId();
    const byTopic = new Map();
    for (const c of all) {
      const t = c.topic || '';
      if (!t || !topicMeta.has(t)) continue;
      const rank = LEVEL_RANK[c.level] || 0;
      const cur = byTopic.get(t);
      if (!cur || rank > cur.rank) byTopic.set(t, { rank, cards: [c] });
      else if (rank === cur.rank) cur.cards.push(c);
    }
    if (!byTopic.size) {
      return res.json({ cards: [], topics: 0, tracks: 0 });
    }

    // Order each topic's cards, and rank topics that HAVE cards by priority.
    for (const g of byTopic.values()) g.cards.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const rankedTopics = [...byTopic.keys()]
      .sort((a, b) => (topicMeta.get(b).priority - topicMeta.get(a).priority) || (Math.random() - 0.5));

    // Group weakest-first topics by track so we can round-robin across tracks.
    const byTrack = new Map();
    for (const t of rankedTopics) {
      const tr = topicMeta.get(t).track;
      if (!byTrack.has(tr)) byTrack.set(tr, []);
      byTrack.get(tr).push({ t, cards: byTopic.get(t).cards, i: 0 });
    }

    // Interleave: round-robin across tracks; within a track, advance across its weak
    // topics one card at a time, so consecutive cards mix topics AND tracks.
    const trackState = shuffle([...byTrack.keys()]).map((tr) => ({ topics: byTrack.get(tr), ptr: 0 }));
    const picked = [];
    for (let more = true; more && picked.length < MASTERY_DECK_SIZE; ) {
      more = false;
      for (const st of trackState) {
        if (picked.length >= MASTERY_DECK_SIZE) break;
        const n = st.topics.length;
        for (let step = 0; step < n; step++) {
          const topic = st.topics[st.ptr % n];
          st.ptr = (st.ptr + 1) % n;
          if (topic.i < topic.cards.length) { picked.push(topic.cards[topic.i++]); more = true; break; }
        }
      }
    }

    res.json({
      cards: await packageFlashcards(picked, req.userEmail),
      topics: byTopic.size,
      tracks: byTrack.size,
    });
  } catch (e) {
    next(e);
  }
});

// Auth: persist results + update running mastery stats.
app.post('/api/quiz/log', requireAuth, async (req, res, next) => {
  try {
    const results = Array.isArray(req.body?.results) ? req.body.results : [];
    if (!results.length) return res.json({ ok: true, topicsUpdated: 0 });
    const topicsUpdated = await logResults(req.userEmail, results);
    // Mirror into BigQuery for analytics (best-effort). The BQ tables aren't per-user, so we mirror
    // ONLY the default account (the one seeding the dashboards); other users stay in Firestore only.
    if (req.userEmail === DEFAULT_ACCOUNT) {
      streamAttempts(results).catch(() => {});
      getTopicsRows(DEFAULT_ACCOUNT, new Date(), BQ_SCOPE).then(replaceTopics).catch(() => {});
    }
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
    const scope = await requestScope(req);
    const catalog = await getCatalog(req.userEmail, scope);
    const scoped = scopeCatalog(catalog, req.body || {});
    const topics = [...new Set(scoped.map((r) => r.topic))].filter(Boolean);
    if (!topics.length) return res.status(400).json({ error: 'No topics in scope' });

    let created = 0;
    const errors = [];
    const ai = aiChoice(req);
    const difficulty = difficultyChoice(req);
    // Optional learner steer: free-text focus + transcripts to base questions on.
    const instructions = String(req.body?.instructions || '').trim().slice(0, 2000);
    let reference = '';
    const wantIds = new Set((Array.isArray(req.body?.transcriptIds) ? req.body.transcriptIds : [])
      .map((v) => String(v || '').trim()).filter(Boolean).slice(0, 10));
    if (wantIds.size) {
      // Fetch within the learner's program only (no cross-program leakage).
      const docs = (await getTranscripts({ program: scope.program })).filter((t) => wantIds.has(t.id));
      reference = docs
        .map((t) => `# ${t.title || t.lesson || 'Source'}\n${t.text || ''}`)
        .join('\n\n---\n\n')
        .slice(0, 8000);
    }
    // Knowledge-graph links (best-effort): each topic's prompt gets the learner's
    // standing on its prerequisites, steering questions toward weak sub-steps.
    const graphLinks = await getGraphLinks().catch(() => []);
    // Fan out across topics (bounded) instead of one serial round-trip each.
    await mapWithConcurrency(topics, 4, async (topic) => {
      try {
        const [existing, attempts] = await Promise.all([
          getQuestionsForTopics([topic], scope),
          getTopicAttempts(req.userEmail, topic),
        ]);
        // A few full Q/A for depth calibration; ALL stems as a de-dup avoid-list.
        const baseline = existing.slice(0, 6).map((q) => ({ q: q.question, a: q.answer }));
        const stems = existing.map((q) => q.question);
        // Difficulty ramps from THIS learner's history on the topic when set to
        // "auto" (weak/untouched -> core, mastered -> challenge); a manual pick
        // overrides it. Missed questions bias new ones toward closing gaps.
        const performance = {
          accuracy: attempts.accuracy,
          attempts: attempts.attempts,
          missed: (attempts.questions || []).filter((q) => q.result === 0).map((q) => q.question),
        };
        const prereqs = prereqContext(topic, catalog, graphLinks);
        const generated = await generateQuestions(topic, baseline, count, ai, { existing: stems, performance, difficulty, prereqs, instructions, reference });
        for (const g of generated) {
          await addQuestion({ ...g, program: scope.program });
          created++;
        }
      } catch (e) {
        errors.push(`${topic}: ${e.message}`);
      }
    });
    res.json({ ok: true, created, topics: topics.length, errors });
  } catch (e) {
    next(e);
  }
});

// Auth: a light list of transcripts the learner can base generated questions on,
// scoped to their program (id/title/course/lesson only — never the full text).
// Optional ?course=/?lesson= narrow it to the scope the learner is generating for.
app.get('/api/transcripts', requireAuth, async (req, res, next) => {
  try {
    const scope = await requestScope(req);
    const filter = { program: scope.program };
    if (req.query.course && !isAll(req.query.course)) filter.course = String(req.query.course);
    if (req.query.lesson && !isAll(req.query.lesson)) filter.lesson = String(req.query.lesson);
    const list = (await getTranscripts(filter))
      .map((t) => ({ id: t.id, title: t.title || t.lesson || 'Untitled', course: t.course || '', lesson: t.lesson || '' }))
      .sort((a, b) => `${a.course} ${a.lesson} ${a.title}`.localeCompare(`${b.course} ${b.lesson} ${b.title}`, undefined, { numeric: true }));
    res.json({ transcripts: list });
  } catch (e) {
    next(e);
  }
});

/* ------------------------------- drill deeper ----------------------------- */
// Auth: "master this question" step 1 — given a question the learner just
// answered (often without really understanding it), propose specific things
// that might be confusing them. The UI adds its own 4th "let me explain"
// free-text option, so this returns only the AI-suggested confusions.
app.post('/api/drill/confusions', requireAuth, rateLimitAI, async (req, res, next) => {
  try {
    const { question, options, answer, topic, userAnswer, isCorrect } = req.body || {};
    if (!question || !Array.isArray(options)) {
      return res.status(400).json({ error: 'question and options are required' });
    }
    const confusions = await generateConfusions(
      { question, options, answer: answer || '', topic: topic || '', userAnswer, isCorrect: !!isCorrect },
      aiChoice(req)
    );
    res.json({ confusions });
  } catch (e) {
    next(e);
  }
});

// Auth: "master this question" step 2 — generate ONE new question that drills
// into the chosen confusion, SAVE it to the bank under the SAME topic, and
// return it packaged with its full hierarchy so the client can serve it
// immediately. Because it shares the topic, it feeds the exact sub-lesson:
// future quizzes pick it up and answering it updates that topic's mastery.
app.post('/api/drill/question', requireAuth, rateLimitAI, async (req, res, next) => {
  try {
    const { question, options, answer, topic } = req.body || {};
    // Bound the free-text confusion before it reaches the prompt (injection surface).
    const confusion = String(req.body?.confusion || '').slice(0, 500).trim();
    if (!topic || !confusion) {
      return res.status(400).json({ error: 'topic and confusion are required' });
    }
    const scope = await requestScope(req);
    const catalog = await getCatalog(req.userEmail, scope);
    // Prefer the running question's own hierarchy so a shared topic name drills
    // into (and later logs against) the exact sub-lesson it came from.
    const idx = scopedMetaIndex(catalog, req.body || {});
    if (!idx.has(topic)) {
      return res.status(400).json({ error: 'Unknown topic; cannot drill into it' });
    }
    const meta = idx.get(topic);
    const scopeLabel = [meta.course, meta.lesson, topic].filter(Boolean).join(' › ');

    const drilled = await generateDrillQuestion(
      { topic, scopeLabel, question: question || '', options: options || [], answer: answer || '', confusion },
      aiChoice(req)
    );
    // Persist into the bank so it feeds future quizzes for this exact sub-lesson.
    // Tag it `drill` so these can be audited/pruned separately from seeded ones.
    const id = await addQuestion({ ...drilled, source: 'drill', program: scope.program });

    // Package with the topic's full hierarchy (same shape the quiz endpoints use),
    // carrying the new id so the client can reformat it inline.
    res.json(packageQuestions([{ ...drilled, id }], idx, 1)[0]);
  } catch (e) {
    next(e);
  }
});

// Auth: in-quiz "generate more like this" — write N fresh questions on the SAME
// topic, matching the current question's style/difficulty, bank them under that
// topic (so they feed future quizzes), and return them packaged so the client
// can queue them into the running quiz immediately.
app.post('/api/generate/like', requireAuth, rateLimitAI, async (req, res, next) => {
  try {
    const { question, options, answer, topic } = req.body || {};
    const count = Math.min(10, Math.max(1, parseInt(req.body?.count, 10) || 3));
    if (!topic) return res.status(400).json({ error: 'topic is required' });

    const scope = await requestScope(req);
    const catalog = await getCatalog(req.userEmail, scope);
    // Prefer the running question's own hierarchy so a shared topic name is
    // resolved to (and logged against) the exact sub-lesson it came from.
    const idx = scopedMetaIndex(catalog, req.body || {});
    if (!idx.has(topic)) return res.status(400).json({ error: 'Unknown topic; cannot generate for it' });
    const meta = idx.get(topic);
    const scopeLabel = [meta.course, meta.lesson, topic].filter(Boolean).join(' › ');

    // Existing stems for this topic become an avoid-list so "more like this"
    // widens coverage instead of re-emitting questions already in the bank.
    const pool = await getQuestionsForTopics([topic], scope);
    const generated = await generateSimilarQuestions(
      { topic, scopeLabel, question: question || '', options: options || [], answer: answer || '', existing: pool.map((q) => q.question) },
      count,
      aiChoice(req)
    );
    // Persist into the bank (tagged so these can be audited/pruned separately),
    // carrying each new id back so the client copies can be reformatted inline.
    const banked = [];
    for (const g of generated) {
      banked.push({ ...g, id: await addQuestion({ ...g, source: 'similar', program: scope.program }) });
    }

    res.json(packageQuestions(banked, idx, count));
  } catch (e) {
    next(e);
  }
});

// Public: every shared flashcard deck, so the local offline app's Sync can pull
// the cloud's (better) cards. Card definitions are user-agnostic, so no auth.
app.get('/api/flashcards/all', async (_req, res, next) => {
  try {
    res.json(await getAllFlashcards());
  } catch (e) {
    next(e);
  }
});

/* -------------------------------- flashcards ------------------------------ */
// Flashcards are enabled for EVERY course/lesson. Decks are still only created
// on demand (when a user clicks "Generate"), so nothing is pre-built. To scope
// the feature back to specific courses, return a regex test here instead, e.g.
//   const FLASHCARD_COURSE_RE = /\bcalculus\b/i;
//   const flashcardsEnabledFor = (course) => FLASHCARD_COURSE_RE.test(course || '');
const flashcardsEnabledFor = (course) => !!String(course || '').trim();

// Normalise a {track,course,lesson,topic} request into a scope + level.
// Flashcards exist at Course level (highest), Lesson level, and Topic level (the
// smallest grain, i.e. a single sub-lesson) — most-specific field present wins.
function flashcardScope(src = {}) {
  const track = String(src.track || '').trim();
  const course = String(src.course || '').trim();
  const lesson = isAll(src.lesson) ? '' : String(src.lesson || '').trim();
  const topic = isAll(src.topic) ? '' : String(src.topic || '').trim();
  return { track, course, lesson, topic, level: topic ? 'topic' : lesson ? 'lesson' : 'course' };
}
const flashcardScopeLabel = (s) => [s.course, s.lesson, s.topic].filter(Boolean).join(' › ');

// Merge a user's private status labels + personalized "rewrite in place" overlay
// onto shared card definitions.
async function packageFlashcards(cards, userEmail) {
  const ids = cards.map((c) => c.id);
  const [statuses, overlays] = await Promise.all([
    getFlashcardStatuses(userEmail, ids),
    getCardOverlays(userEmail, ids),
  ]);
  return cards.map((c) => {
    const o = overlays[c.id];
    return {
      id: c.id,
      concept: c.concept,
      intuition: o ? o.intuition : c.intuition,
      formula: o && o.formula ? o.formula : c.formula,
      visual: o ? (o.visual || null) : (c.visual || null),
      highway: !!c.highway,
      topic: c.topic || '',
      status: statuses[c.id] || null,
      personalized: !!o,
    };
  });
}

// Auth: fetch the (cached) deck for a Course/Lesson scope, with this user's labels.
// `generated:false` tells the client to offer a "Generate flashcards" action.
app.get('/api/flashcards', requireAuth, async (req, res, next) => {
  try {
    const scope = flashcardScope(req.query);
    if (!scope.course) return res.status(400).json({ error: 'A course is required' });
    const enabled = flashcardsEnabledFor(scope.course);
    if (!enabled) return res.json({ enabled: false, level: scope.level, cards: [], generated: false });

    const cards = await getFlashcards(scope);
    res.json({
      enabled: true,
      level: scope.level,
      generated: cards.length > 0,
      cards: await packageFlashcards(cards, req.userEmail),
    });
  } catch (e) {
    next(e);
  }
});

// Auth: (re)generate the deck for a scope from the questions/topics it contains,
// bank it, and return it. Rate-limited (an AI call). Gated to enabled courses.
app.post('/api/flashcards/generate', requireAuth, rateLimitAI, async (req, res, next) => {
  try {
    const scope = flashcardScope(req.body);
    if (!scope.course) return res.status(400).json({ error: 'A course is required' });
    if (!flashcardsEnabledFor(scope.course)) {
      return res.status(403).json({ error: 'Flashcards are not enabled for this course yet' });
    }
    const programScope = await requestScope(req);
    const catalog = await getCatalog(req.userEmail, programScope);
    const scoped = scopeCatalog(catalog, scope);
    const topics = [...new Set(scoped.map((r) => r.topic))].filter(Boolean);
    if (!topics.length) return res.status(400).json({ error: 'No topics in this section yet' });

    // Sample the section's questions so the deck is comprehensive enough to cover them.
    const pool = await getQuestionsForTopics(topics.slice(0, 60), programScope);
    const questions = shuffle(pool).slice(0, 40)
      .map((q) => ({ topic: q.topic, question: q.question, answer: q.answer }));

    const cards = await generateFlashcards(
      { scopeLabel: flashcardScopeLabel(scope), level: scope.level, topics, questions, instructions: req.body?.instructions || '' },
      aiChoice(req),
    );
    if (!cards.length) return res.status(502).json({ error: 'No flashcards were generated; try again' });

    await saveFlashcards(scope, cards);
    const saved = await getFlashcards(scope);
    res.json({
      enabled: true,
      level: scope.level,
      generated: true,
      cards: await packageFlashcards(saved, req.userEmail),
    });
  } catch (e) {
    next(e);
  }
});

// Auth: set/clear this user's label on a card (mastered | learning | important).
app.post('/api/flashcards/status', requireAuth, async (req, res, next) => {
  try {
    const cardId = String(req.body?.cardId || '').trim();
    const status = req.body?.status ? String(req.body.status).trim() : null;
    if (!cardId) return res.status(400).json({ error: 'cardId is required' });
    await setFlashcardStatus(req.userEmail, cardId, status);
    res.json({ ok: true, status });
  } catch (e) {
    next(e);
  }
});

// Auth: "quiz me on this" — generate `count` MCQs (1–10, chosen by the learner)
// for a card's concept, bank them under the card's real topic (source
// 'flashcard'), and return them packaged so the client runs them as a normal
// quiz (logged, mastery + streak updated).
app.post('/api/flashcards/quiz', requireAuth, rateLimitAI, async (req, res, next) => {
  try {
    const cardId = String(req.body?.cardId || '').trim();
    const count = Math.min(10, Math.max(1, parseInt(req.body?.count, 10) || 1));
    if (!cardId) return res.status(400).json({ error: 'cardId is required' });
    const card = await getFlashcardById(cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const programScope = await requestScope(req);
    const catalog = await getCatalog(req.userEmail, programScope);
    // Resolve within the card's own deck scope so a topic name shared by two
    // lessons quizzes (and logs) against the section this card belongs to.
    const idx = scopedMetaIndex(catalog, { track: card.track, course: card.course, lesson: card.lesson });
    if (!card.topic || !idx.has(card.topic)) {
      return res.status(400).json({ error: 'This card is not linked to a known topic' });
    }
    const meta = idx.get(card.topic);
    const scopeLabel = [meta.course, meta.lesson, card.topic].filter(Boolean).join(' › ');

    // Feed the planner what already exists for this topic (avoid-list), how
    // this learner has done on it (difficulty target + missed-question focus),
    // and the graph's prerequisite standing (weak prereqs become sub-steps).
    const [pool, attempts, graphLinks] = await Promise.all([
      getQuestionsForTopics([card.topic], programScope),
      getTopicAttempts(req.userEmail, card.topic),
      getGraphLinks().catch(() => []),
    ]);
    const existing = pool.map((q) => q.question);
    const performance = {
      accuracy: attempts.accuracy,
      attempts: attempts.attempts,
      missed: (attempts.questions || []).filter((q) => q.result === 0).map((q) => q.question),
    };
    const prereqs = prereqContext(card.topic, catalog, graphLinks);

    const qs = await generateFlashcardQuestions(
      { topic: card.topic, scopeLabel, concept: card.concept, intuition: card.intuition, formula: card.formula },
      count,
      aiChoice(req),
      { existing, performance, difficulty: difficultyChoice(req), prereqs },
    );
    // Bank each question and carry its new id back so the client copy can be
    // reformatted inline (the admin "Fix format" button needs the id).
    const banked = [];
    for (const q of qs) {
      banked.push({ ...q, id: await addQuestion({ ...q, source: 'flashcard', program: programScope.program }) });
    }
    res.json(packageQuestions(banked, idx, count));
  } catch (e) {
    next(e);
  }
});

// Auth: per-flashcard quiz stats — how many questions exist for the card's topic,
// and this user's accuracy + attempted-question list for it (task: tie cards to
// quiz performance). Multiple cards can share a topic, so these reflect the topic.
app.get('/api/flashcards/card-stats', requireAuth, async (req, res, next) => {
  try {
    const cardId = String(req.query?.cardId || '').trim();
    if (!cardId) return res.status(400).json({ error: 'cardId is required' });
    const card = await getFlashcardById(cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    if (!card.topic) return res.json({ topic: '', questionCount: 0, attempts: 0, correct: 0, accuracy: null, questions: [] });

    const [pool, attempts] = await Promise.all([
      getQuestionsForTopics([card.topic], await requestScope(req)),
      getTopicAttempts(req.userEmail, card.topic),
    ]);
    res.json({ topic: card.topic, questionCount: pool.length, ...attempts });
  } catch (e) {
    next(e);
  }
});

/* ------------------------------ Speaker Mode ------------------------------ */
// Auth: grade a spoken (or typed) explanation of a card's concept out of 3 and
// fold it into the learner's topic mastery. The transcript comes from browser
// speech-to-text; the AI scores UNDERSTANDING (see gradeExplanation) and we log
// it as ONE quiz-equivalent attempt on the card's topic — a "pass" when the
// learner scores 2/3 or better — so a good explanation moves mastery exactly
// like answering a question does. Rate-limited (one AI call per request).
app.post('/api/flashcards/explain', requireAuth, rateLimitAI, async (req, res, next) => {
  try {
    const cardId = String(req.body?.cardId || '').trim();
    // Bound the transcript before it reaches the prompt (cost + injection surface).
    const transcript = String(req.body?.transcript || '').slice(0, 4000).trim();
    if (!cardId) return res.status(400).json({ error: 'cardId is required' });
    if (!transcript) return res.status(400).json({ error: 'An explanation is required' });

    const card = await getFlashcardById(cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    // Resolve the card's full hierarchy (same lookup the quiz endpoint uses) so
    // the attempt logs against the right Track > Course > Lesson > Topic.
    const catalog = await getCatalog(req.userEmail, await requestScope(req));
    const idx = metaIndex(catalog);
    const meta = card.topic && idx.has(card.topic) ? idx.get(card.topic) : null;
    const scopeLabel = meta
      ? [meta.course, meta.lesson, card.topic].filter(Boolean).join(' › ')
      : (card.topic || '');

    const grade = await gradeExplanation(
      { concept: card.concept, intuition: card.intuition, formula: card.formula, scopeLabel, transcript },
      aiChoice(req),
    );

    // Progress (lighter mapping): count the whole explanation as ONE attempt on
    // the topic — correct when they scored 2/3+. Only log when the card is tied
    // to a known topic, so mastery keys correctly; otherwise just return the grade.
    const pass = grade.score >= 2;
    let logged = false;
    if (meta) {
      const row = {
        track: meta.track || '',
        course: meta.course || '',
        lesson: meta.lesson || '',
        topic: card.topic || '',
        question: '🎙️ Explained aloud: ' + String(card.concept || '').slice(0, 140),
        isCorrect: pass,
        reviewFlag: 0,
      };
      await logResults(req.userEmail, [row]);
      logged = true;
      // Mirror into BigQuery for the analytics dashboards, same as /api/quiz/log
      // (best-effort, default account only).
      if (req.userEmail === DEFAULT_ACCOUNT) {
        streamAttempts([row]).catch(() => {});
        getTopicsRows(DEFAULT_ACCOUNT).then(replaceTopics).catch(() => {});
      }
    }

    res.json({ ...grade, pass, pointsMax: 3, progress: { logged, topic: card.topic || '' } });
  } catch (e) {
    next(e);
  }
});

/* -------------------------------- Chat ------------------------------------ */
// Auth: load this user's saved chat thread for one card (empty if none yet).
app.get('/api/flashcards/chat', requireAuth, async (req, res, next) => {
  try {
    const cardId = String(req.query?.cardId || '').trim();
    if (!cardId) return res.status(400).json({ error: 'cardId is required' });
    const chat = await getCardChat(req.userEmail, cardId);
    res.json({ messages: chat?.messages || [], personalized: !!chat?.intuition });
  } catch (e) {
    next(e);
  }
});

// Auth: send a message about ONE card. Answers it AND rewrites the card's
// explanation in place for this user (stored as a private overlay). Rate-limited.
app.post('/api/flashcards/chat', requireAuth, rateLimitAI, async (req, res, next) => {
  try {
    const cardId = String(req.body?.cardId || '').trim();
    const message = String(req.body?.message || '').trim();
    if (!cardId) return res.status(400).json({ error: 'cardId is required' });
    if (!message) return res.status(400).json({ error: 'A message is required' });

    const card = await getFlashcardById(cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    // Start from this user's personalized version of the card if they have one.
    const existing = await getCardChat(req.userEmail, cardId);
    const history = existing?.messages || [];
    const baseIntuition = existing?.intuition || card.intuition;
    const baseFormula = existing?.formula || card.formula;
    const baseVisual = existing?.intuition ? existing.visual : card.visual;

    // A little context: sample questions from the same topic to gauge depth.
    const programScope = await requestScope(req);
    const catalog = await getCatalog(req.userEmail, programScope);
    const idx = metaIndex(catalog);
    const meta = card.topic && idx.has(card.topic) ? idx.get(card.topic) : {};
    const scopeLabel = [meta.course, meta.lesson, card.topic].filter(Boolean).join(' › ') || card.topic || '';
    const pool = card.topic ? await getQuestionsForTopics([card.topic], programScope) : [];
    const questions = shuffle(pool).slice(0, 8).map((q) => ({ question: q.question, answer: q.answer }));

    const out = await generateCardChat(
      {
        topic: card.topic, scopeLabel, concept: card.concept,
        intuition: baseIntuition, formula: baseFormula, visual: baseVisual,
        questions, history, message,
      },
      aiChoice(req),
    );

    const messages = [...history, { role: 'user', text: message }, { role: 'assistant', text: out.reply }];
    await saveCardChat(req.userEmail, cardId, {
      messages, intuition: out.intuition, formula: out.formula, visual: out.visual,
    });

    res.json({
      reply: out.reply,
      visual: out.visual,
      card: { intuition: out.intuition, formula: out.formula, visual: out.visual, personalized: true },
    });
  } catch (e) {
    next(e);
  }
});

// Auth: revert this user's card to the shared original (drops chat + overlay).
app.post('/api/flashcards/chat/reset', requireAuth, async (req, res, next) => {
  try {
    const cardId = String(req.body?.cardId || '').trim();
    if (!cardId) return res.status(400).json({ error: 'cardId is required' });
    const card = await getFlashcardById(cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    await resetCardChat(req.userEmail, cardId);
    res.json({
      card: { intuition: card.intuition, formula: card.formula, visual: card.visual || null, personalized: false },
    });
  } catch (e) {
    next(e);
  }
});

/* --------------------------- Fix card formatting -------------------------- */
// Candidate detection for the BATCH sweep (the per-card "fixformat" command
// reformats whatever card you point it at, so it does NOT gate on this).
// Deliberately TIGHT to avoid touching valid math: \lambda, \det, \frac etc. are
// KaTeX commands, NOT code, so we strip \texttt{}/\text{}/\<command> BEFORE
// hunting for raw code left inside a $...$ span. A `\implies` on its own is
// legitimate math (derivations), so we only flag the awkward "code chip glued to
// prose by an arrow" pattern (the screenshot case), plus unbalanced $ delimiters.
const CODE_TOK = /\b(def|class|import|return|lambda|print)\b|=>/;
const stripLatex = (s) => String(s)
  .replace(/\\texttt\{[^{}]*\}/g, ' ') // code chips (render fine as <code>)
  .replace(/\\text\{[^{}]*\}/g, ' ')   // \text{...} prose (valid in math)
  .replace(/\\[a-zA-Z]+/g, ' ');       // \lambda, \frac, \det, \implies, ...
function fieldLooksBroken(s) {
  const str = String(s || '');
  if (!str) return false;
  // Unbalanced (odd) count of unescaped $ -> KaTeX delimiter mismatch.
  if (((str.match(/(?<!\\)\$/g) || []).length) % 2 === 1) return true;
  // A \texttt{} code chip immediately glued to prose by an arrow (screenshot style).
  if (/\\texttt\{[^{}]*\}\s*\\(implies|Rightarrow|to)\b/.test(str)) return true;
  // Raw code still sitting inside a math span once real LaTeX is stripped out.
  const spans = stripLatex(str).match(/\$\$[\s\S]*?\$\$|\$[^$]*\$/g) || [];
  return spans.some((sp) => CODE_TOK.test(sp));
}
const flashcardNeedsFormatFix = (c) =>
  fieldLooksBroken(c.formula) || fieldLooksBroken(c.intuition) || fieldLooksBroken(c.concept);

// Keep only cleaned fields that are non-empty AND actually differ, so a bad or
// no-op model response can never blank a card. Returns the accepted patch.
function acceptCardFix(original, out) {
  const patch = {};
  if (!out) return patch;
  for (const f of ['concept', 'intuition', 'formula']) {
    const v = out[f];
    if (typeof v === 'string' && v.trim() && v !== original[f]) patch[f] = v;
  }
  return patch;
}

// Admin: reformat ONE shared flashcard's code/math so it renders correctly, and
// save it for everyone. Meaning is preserved (formatting only); never blanks a
// field. Backs the assistant's "fixformat" quick command. Returns the (possibly
// unchanged) card plus which fields changed.
app.post('/api/flashcards/fix-format', requireAdmin, rateLimitAI, async (req, res, next) => {
  try {
    const cardId = String(req.body?.cardId || '').trim();
    if (!cardId) return res.status(400).json({ error: 'cardId is required' });
    const card = await getFlashcardById(cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const orig = { concept: card.concept || '', intuition: card.intuition || '', formula: card.formula || '' };
    let arr;
    try {
      arr = await reformatFlashcards([{ id: card.id, ...orig }], aiChoice(req));
    } catch {
      return res.status(502).json({ error: 'The reformatter did not return usable output. Try again.' });
    }
    const out = (arr || []).find((o) => o && o.id === card.id) || (arr || [])[0];
    const patch = acceptCardFix(orig, out);
    const changed = Object.keys(patch);
    if (changed.length) await bulkUpdateFlashcards([{ id: card.id, ...patch }]);

    const merged = { ...orig, ...patch };
    res.json({ changed, card: { id: card.id, ...merged } });
  } catch (e) {
    next(e);
  }
});

// Admin: apply a natural-language EDIT to ONE shared flashcard and save it for
// everyone. Unlike fix-format (formatting only) this can change wording/content,
// but only as the instruction asks. Reuses acceptCardFix, so it never blanks a
// field and only persists fields that actually changed. Returns which changed.
app.post('/api/flashcards/edit', requireAdmin, rateLimitAI, async (req, res, next) => {
  try {
    const cardId = String(req.body?.cardId || '').trim();
    const instruction = String(req.body?.instruction || '').trim();
    if (!cardId) return res.status(400).json({ error: 'cardId is required' });
    if (!instruction) return res.status(400).json({ error: 'An edit instruction is required' });
    if (instruction.length > 1000) return res.status(400).json({ error: 'Instruction is too long (max 1000 characters)' });

    const card = await getFlashcardById(cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const orig = { concept: card.concept || '', intuition: card.intuition || '', formula: card.formula || '' };
    let out;
    try {
      out = await editFlashcard({ id: card.id, ...orig }, instruction, aiChoice(req));
    } catch {
      return res.status(502).json({ error: 'The editor did not return usable output. Try again.' });
    }
    const patch = acceptCardFix(orig, out);
    const changed = Object.keys(patch);
    if (changed.length) await bulkUpdateFlashcards([{ id: card.id, ...patch }]);

    const merged = { ...orig, ...patch };
    res.json({ changed, card: { id: card.id, ...merged } });
  } catch (e) {
    next(e);
  }
});

// Admin: manual edit — save the exact text the admin typed for ONE shared card
// (no AI involved). Concept and intuition are required; formula may be blank.
// Persists only the fields that actually changed and returns which those were.
app.post('/api/flashcards/set', requireAdmin, async (req, res, next) => {
  try {
    const cardId = String(req.body?.cardId || '').trim();
    if (!cardId) return res.status(400).json({ error: 'cardId is required' });

    const concept = String(req.body?.concept ?? '').trim();
    const intuition = String(req.body?.intuition ?? '').trim();
    // Formula is optional: keep the admin's text (only trim trailing space) and
    // allow an empty value to clear it.
    const formula = String(req.body?.formula ?? '').replace(/\s+$/, '');
    if (!concept) return res.status(400).json({ error: 'The concept (front of the card) cannot be empty' });
    if (!intuition) return res.status(400).json({ error: 'The intuition cannot be empty' });
    if (concept.length > 4000 || intuition.length > 8000 || formula.length > 8000) {
      return res.status(400).json({ error: 'One of the fields is too long' });
    }

    const card = await getFlashcardById(cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const orig = { concept: card.concept || '', intuition: card.intuition || '', formula: card.formula || '' };
    const next_ = { concept, intuition, formula };
    const patch = {};
    for (const f of ['concept', 'intuition', 'formula']) {
      if (next_[f] !== orig[f]) patch[f] = next_[f];
    }
    const changed = Object.keys(patch);
    if (changed.length) await bulkUpdateFlashcards([{ id: card.id, ...patch }]);

    const merged = { ...orig, ...patch };
    res.json({ changed, card: { id: card.id, ...merged } });
  } catch (e) {
    next(e);
  }
});

/* ------------------------ Fix quiz-question formatting -------------------- */
// Raw HTML that leaked into a question renders literally (the "<code>def
// demo(a, b, *args):</code>" case), so flag any recognised tag. Combined with
// the flashcard-style checks (code inside $...$, unbalanced $) this decides the
// BATCH sweep's candidates; the per-question button fixes whatever you point it
// at and does NOT gate on this.
const HTML_TAG = /<\/?(code|pre|b|i|strong|em|u|br|span|sub|sup|tt|kbd|samp|mark)\b[^>]*>/i;
// A literal control char glued to lowercase text is a LaTeX command mangled by
// JSON parsing (e.g. "\texttt" -> TAB+"exttt"); flag it so the batch sweep fixes
// these even though they contain no HTML and parse fine. \b here is backspace.
const CTRL_LATEX = /[\t\f\b\r\n][a-z]/;
const questionFieldLooksBroken = (s) =>
  HTML_TAG.test(String(s || '')) || CTRL_LATEX.test(String(s || '')) || fieldLooksBroken(s);
const questionNeedsFormatFix = (q) =>
  questionFieldLooksBroken(q.question) ||
  (Array.isArray(q.options) && q.options.some(questionFieldLooksBroken)) ||
  questionFieldLooksBroken(q.answer);

// Deterministically repair control-char-mangled LaTeX across a question's text
// fields (same transform as gemini's, applied to the {question, options, answer}
// shape the fixer uses). The answer<->option match is preserved because every
// field is cleaned identically.
const cleanQuestionEscapes = (q) => ({
  question: restoreLatexEscapes(q.question || ''),
  options: (q.options || []).map((o) => restoreLatexEscapes(String(o))),
  answer: restoreLatexEscapes(q.answer || ''),
});

// Validate a reformatted question before saving: keep the same option count, and
// require the answer to still equal one option exactly (trimmed). Returns the
// accepted {question, options, answer} — falling back to the original per field —
// or null if the shape is unusable, so a bad model response never corrupts a
// question. Never blanks a field.
function acceptQuestionFix(orig, out) {
  if (!out) return null;
  const question = typeof out.question === 'string' && out.question.trim() ? out.question : orig.question;
  const options = Array.isArray(out.options) && out.options.length === orig.options.length
    ? out.options.map(String)
    : orig.options;
  const answer = typeof out.answer === 'string' && out.answer.trim() ? out.answer : orig.answer;
  const answerMatches = options.map((s) => s.trim()).includes(String(answer).trim());
  if (!answerMatches) return null;
  return { question, options, answer };
}

// List which of question/options/answer actually changed (so the UI can report it
// and we skip a no-op write).
function questionFixChanges(orig, fix) {
  const changed = [];
  if (fix.question !== orig.question) changed.push('question');
  if (JSON.stringify(fix.options) !== JSON.stringify(orig.options)) changed.push('options');
  if (fix.answer !== orig.answer) changed.push('answer');
  return changed;
}

// Admin: reformat ONE shared quiz question's code/math (and strip any raw HTML)
// so it renders correctly, and save it for everyone. Meaning is preserved
// (formatting only); the answer stays matched to an option. Backs the quiz
// view's "Fix format" button. Returns the (possibly unchanged) question plus
// which fields changed.
app.post('/api/questions/fix-format', requireAdmin, rateLimitAI, async (req, res, next) => {
  try {
    const questionId = String(req.body?.questionId || '').trim();
    if (!questionId) return res.status(400).json({ error: 'questionId is required' });
    const q = await getQuestionById(questionId);
    if (!q) return res.status(404).json({ error: 'Question not found' });

    const stored = {
      question: q.question || '',
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      answer: q.answer || '',
    };
    // Deterministically repair control-char-mangled LaTeX first, so the model
    // sees valid LaTeX AND so this class of breakage is fixed even if the model
    // returns the text unchanged. `cleaned` is the AI input and the fallback.
    const cleaned = cleanQuestionEscapes(stored);
    let arr;
    try {
      arr = await reformatQuestions([{ id: q.id, ...cleaned }], aiChoice(req));
    } catch {
      return res.status(502).json({ error: 'The reformatter did not return usable output. Try again.' });
    }
    const out = (arr || []).find((o) => o && o.id === q.id) || (arr || [])[0];
    const fix = acceptQuestionFix(cleaned, out);
    if (!fix) return res.status(502).json({ error: 'The reformatter returned an unusable result. Try again.' });

    // Compare against the TRUE stored value so a control-char-only repair still
    // counts as a change and gets saved.
    const changed = questionFixChanges(stored, fix);
    if (changed.length) await bulkUpdateQuestions([{ id: q.id, ...fix }]);

    res.json({ changed, question: { id: q.id, ...fix } });
  } catch (e) {
    next(e);
  }
});

// Scope-level chat id: works for any track/course/lesson selection.
const scopeChatId = ({ track, course, lesson }) =>
  slug(track || '', isAll(course) ? '' : course || '', isAll(lesson) ? '' : lesson || '');

// Auth: load this user's saved chat thread for a lesson/course scope.
app.get('/api/chat', requireAuth, async (req, res, next) => {
  try {
    const id = scopeChatId(req.query || {});
    const messages = await getScopeChat(req.userEmail, id);
    res.json({ messages });
  } catch (e) {
    next(e);
  }
});

// Auth: send a message about a whole section. Reads the section's flashcards +
// quiz questions to answer big-picture questions. Rate-limited (an AI call).
app.post('/api/chat', requireAuth, rateLimitAI, async (req, res, next) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) return res.status(400).json({ error: 'A message is required' });

    const programScope = await requestScope(req);
    const catalog = await getCatalog(req.userEmail, programScope);
    const scoped = scopeCatalog(catalog, req.body || {});
    const topics = [...new Set(scoped.map((r) => r.topic))].filter(Boolean).slice(0, 60);
    if (!topics.length) return res.status(400).json({ error: 'No topics in this section yet' });

    const { track, course, lesson, topic } = req.body || {};
    const scopeLabel = !isAll(topic) ? topic
      : !isAll(lesson) ? lesson
      : !isAll(course) ? course
      : !isAll(track) ? track
      : 'Your selection';

    const pool = await getQuestionsForTopics(topics, programScope);
    const questions = shuffle(pool).slice(0, 30).map((q) => ({ topic: q.topic, question: q.question, answer: q.answer }));

    // Include the section's flashcards when a deck exists (course/lesson scope).
    let cards = [];
    const fscope = flashcardScope(req.body || {});
    if (fscope.course && flashcardsEnabledFor(fscope.course)) {
      try { cards = await getFlashcards(fscope); } catch { /* no deck; questions are enough */ }
    }

    const id = scopeChatId(req.body || {});
    const history = await getScopeChat(req.userEmail, id);

    const out = await generateScopeChat(
      { scopeLabel, topics, cards, questions, history, message },
      aiChoice(req),
    );

    const messages = [...history, { role: 'user', text: message }, { role: 'assistant', text: out.reply }].slice(-40);
    await saveScopeChat(req.userEmail, id, messages);

    res.json({ reply: out.reply, visual: out.visual });
  } catch (e) {
    next(e);
  }
});

/* --------------------------- Global AI assistant -------------------------- */
// Auth: list this user's saved conversations (metadata for the history dropdown).
app.get('/api/assistant/chats', requireAuth, async (req, res, next) => {
  try {
    res.json({ chats: await listAssistantChats(req.userEmail) });
  } catch (e) {
    next(e);
  }
});

// Auth: load one conversation's messages (by ?id=), or the most recent if no id.
app.get('/api/assistant/chat', requireAuth, async (req, res, next) => {
  try {
    const id = req.query?.id ? String(req.query.id) : '';
    if (id) {
      const chat = await getAssistantChat(req.userEmail, id);
      return res.json(chat || { id: '', title: '', messages: [] });
    }
    const list = await listAssistantChats(req.userEmail);
    if (!list.length) return res.json({ id: '', title: '', messages: [] });
    const chat = await getAssistantChat(req.userEmail, list[0].id);
    return res.json(chat || { id: '', title: '', messages: [] });
  } catch (e) {
    next(e);
  }
});

// Auth: delete one conversation (the history dropdown's trash button).
app.delete('/api/assistant/chat', requireAuth, async (req, res, next) => {
  try {
    const id = req.query?.id ? String(req.query.id) : '';
    if (!id) return res.status(400).json({ error: 'A conversation id is required' });
    await deleteAssistantChat(req.userEmail, id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// A content-location question ("which card teaches X", "where is Y", "is there a
// lesson on Z") — only then do we spend tokens grounding the assistant in the full
// catalog so it answers from real topics instead of inventing a card name.
function looksLikeCatalogLookup(msg) {
  return /\b(card|deck|topic|sub-?lesson|lesson|course|track|section|module|curriculum|syllabus|teach|cover|where|study|learn about|is there|which|list|find)\b/i.test(String(msg || ''));
}

/** The learner's accessible catalog (their Mastery-Engine shelf), as {track,course,lesson,topic}
 *  rows — the real curriculum the assistant grounds "which card teaches X" answers in. */
async function learnerCatalog(email) {
  if (!email) return [];
  const tracks = (await effectiveShelf(email)) || [];
  if (!tracks.length) return [];
  const set = new Set(tracks.map((t) => JSON.stringify([t.program, t.track])));
  const full = await getCatalog(email, null);
  return full
    .filter((t) => set.has(JSON.stringify([t.program || DEFAULT_PROGRAM, t.track])))
    // carry mastery stats too, for Coach mode's progress digest (outline ignores them)
    .map((t) => ({ track: t.track, course: t.course, lesson: t.lesson, topic: t.topic, totalAttempts: t.totalAttempts || 0, correctCount: t.correctCount || 0 }));
}

/** A compact progress digest for Coach mode: overall accuracy + the topics the
 *  learner has mastered vs is weak on, so the assistant tailors its recommended path. */
function coachDigest(rows) {
  let attempted = 0; let sumAcc = 0; const mastered = []; const weak = [];
  for (const r of rows || []) {
    if (!r.totalAttempts) continue;
    const acc = Math.round((r.correctCount / r.totalAttempts) * 100);
    attempted += 1; sumAcc += acc;
    if (acc >= 80) mastered.push(r.topic);
    else if (acc < 60) weak.push(r.topic);
  }
  const cap = (a) => [...new Set(a.filter(Boolean))].slice(0, 60);
  const m = cap(mastered); const w = cap(weak);
  const parts = [`Overall: ${attempted ? Math.round(sumAcc / attempted) : 0}% across ${attempted} practised topic${attempted === 1 ? '' : 's'} (of ${(rows || []).length} in their engine; ${(rows || []).length - attempted} not yet started).`];
  if (m.length) parts.push(`Mastered (≥80%): ${m.join(', ')}.`);
  if (w.length) parts.push(`Weak / still learning (<60%): ${w.join(', ')}.`);
  return parts.join('\n');
}

/** Every transcript in the learner's enrolled programs (title + scope) — so the
 *  assistant is aware of the source videos/notes and can point to them by real name. */
async function learnerTranscripts(email) {
  if (!email) return [];
  const enr = await getEnrollment(email);
  const seen = new Set();
  const out = [];
  for (const program of enr.programs) {
    let list = [];
    try { list = await getTranscripts({ program }); } catch { list = []; }
    for (const t of list) {
      if (!t || !t.title) continue;
      const k = t.id || `${t.title}|${t.lesson || ''}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ title: t.title, track: t.track, course: t.course, lesson: t.lesson });
      if (out.length >= 500) return out;
    }
  }
  return out;
}

// Auth: send a message to the always-available assistant. The client passes a
// STRUCTURED snapshot of what's on screen (view, selection, current question or
// flashcard, recent answers) as `context`; the assistant answers grounded in it.
// Appends to `conversationId` when given; otherwise starts a new conversation.
app.post('/api/assistant/chat', requireAuth, rateLimitAI, async (req, res, next) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) return res.status(400).json({ error: 'A message is required' });
    const context = req.body?.context && typeof req.body.context === 'object' ? req.body.context : {};
    const conversationId = req.body?.conversationId ? String(req.body.conversationId) : '';
    // Voice conversation mode: the answer will be read aloud, so ask for spoken-style prose.
    const conversational = !!req.body?.conversational;
    // Web access: Google Search grounding (Gemini only — ignored for other providers downstream).
    const search = !!req.body?.web;

    const existing = conversationId ? await getAssistantChat(req.userEmail, conversationId) : null;
    const history = existing ? existing.messages : [];
    const coach = !!req.body?.coach;
    const [catalog, transcripts] = (coach || looksLikeCatalogLookup(message))
      ? await Promise.all([learnerCatalog(req.userEmail), learnerTranscripts(req.userEmail)])
      : [[], []];
    const progress = coach ? coachDigest(catalog) : '';
    // Whole-person context from Sentinel (body-fat/PRs, career goals, reading, obstacles). Null-safe:
    // an unreachable/unconfigured Sentinel just means no holistic block.
    const holistic = await holisticProfile(req.userEmail);
    const out = await generateAssistantChat({ context, history, message, conversational, search, catalog, transcripts, coach, progress, holistic, admin: isAdmin(req) }, aiChoice(req));

    const messages = [...history, { role: 'user', text: message }, { role: 'assistant', text: out.reply }];
    const saved = await saveAssistantChat(req.userEmail, existing ? conversationId : '', messages);
    res.json({ reply: out.reply, visual: out.visual, conversationId: saved.id, title: saved.title });
  } catch (e) {
    next(e);
  }
});

// Auth: STREAMING assistant (SSE) — the text-chat path. Emits the model's
// reasoning ('thinking') and answer ('content') deltas live so the chat shows
// what the AI is doing, and can be paused + steered: the client aborts the
// stream and re-POSTs the SAME message with an accumulated `steer` note (see the
// Atrium assistant — no server-side run state; abort + resend is the mechanism).
// Streams PLAIN MARKDOWN (no visual), unlike the blocking sibling above. The
// turn is persisted on 'done'. Heavy setup runs inside the stream, after the
// heartbeat, so a failure surfaces as an 'error' event, not a dropped connection.
app.post('/api/assistant/chat/stream', requireAuth, rateLimitAI, async (req, res, next) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'A message is required' });
  const context = req.body?.context && typeof req.body.context === 'object' ? req.body.context : {};
  const conversationId = req.body?.conversationId ? String(req.body.conversationId) : '';
  const steer = String(req.body?.steer || '').trim();
  const search = !!req.body?.web; // web access now streams (grounded plain text) so pause still works

  // If the client aborts (a Pause), the socket closes: don't persist the turn the
  // user is about to discard/steer, and stop trying to write to a dead stream.
  let clientGone = false;
  res.on('close', () => { clientGone = true; });

  sseInit(res);
  try {
    const existing = conversationId ? await getAssistantChat(req.userEmail, conversationId) : null;
    const history = existing ? existing.messages : [];

    // A steer restart re-sends the SAME message (with an added steer note) against
    // the same conversation, so the first pass's turn is already saved. Drop that
    // turn here so the model re-answers cleanly (not seeing its own draft in the
    // history), and so we overwrite it rather than duplicating on save.
    const baseHistory = (steer && history.length >= 2
      && history[history.length - 1]?.role === 'assistant')
      ? history.slice(0, -2) : history;

    // Coach mode forces full grounding (progress + catalog + transcripts) so it can
    // recommend a personalised path; otherwise ground only on content-lookup turns.
    const coach = !!req.body?.coach;
    const [catalog, transcripts] = (coach || looksLikeCatalogLookup(message))
      ? await Promise.all([learnerCatalog(req.userEmail), learnerTranscripts(req.userEmail)])
      : [[], []];
    const progress = coach ? coachDigest(catalog) : '';
    // Whole-person context from Sentinel; fetched before streaming starts (null-safe) so a Sentinel
    // outage can never break the SSE stream — it just yields no holistic block.
    const holistic = await holisticProfile(req.userEmail);
    const out = await streamAssistantChat(
      { context, history: baseHistory, message, steer, catalog, transcripts, search, coach, progress, holistic, admin: isAdmin(req) }, aiChoice(req),
      (t, kind) => { if (!clientGone) sseSend(res, kind === 'thinking' ? 'thinking' : 'content', { text: t }); },
    );

    if (clientGone) return;   // paused/navigated away — leave the prior turn untouched
    const reply = String(out.reply || '').trim();
    const messages = [...baseHistory, { role: 'user', text: message }, { role: 'assistant', text: reply }];
    const saved = await saveAssistantChat(req.userEmail, existing ? conversationId : '', messages);
    sseSend(res, 'done', { conversationId: saved.id, title: saved.title });
    res.end();
  } catch (e) {
    if (clientGone) return;
    // Headers are already sent (sseInit), so surface the failure as an event.
    try { sseSend(res, 'error', { message: e.message || 'AI request failed' }); res.end(); } catch { /* closed */ }
  }
});

/* --------------------------- progress AI features ------------------------- */
// Shared by /api/review and /api/lesson: narrow the catalog to a scope and pull
// a question sample + a scope label for the study-guide generators.
async function reviewScopeInputs(req) {
  const programScope = await requestScope(req);
  const catalog = await getCatalog(req.userEmail, programScope);
  return buildReviewInputs(catalog, req.body || {}, programScope);
}

// The catalog-derived inputs for one scope. Factored out of reviewScopeInputs
// so the admin bulk pre-build can reuse it for an ENUMERATED scope (not tied to
// a request body) with the catalog + program slice fetched once up front.
async function buildReviewInputs(catalog, body, programScope) {
  const scoped = scopeCatalog(catalog, body);
  const topics = [...new Set(scoped.map((r) => r.topic))].filter(Boolean).slice(0, 60);
  if (!topics.length) return null;
  const pool = await getQuestionsForTopics(topics, programScope);
  const questions = shuffle(pool).slice(0, 40).map((q) => ({ topic: q.topic, question: q.question, answer: q.answer }));
  const { track, course, lesson, topic } = body;
  const scopeLabel = !isAll(topic) ? topic
    : !isAll(lesson) ? lesson
    : !isAll(course) ? course
    : !isAll(track) ? track
    : 'Your selection';
  return { catalog, scoped, topics, questions, scopeLabel };
}

// A study guide's cache key mirrors the exact scope tuple a learner's progress
// node carries (track/course/lesson/topic in data-*), with "all"/N-A fields
// normalised to empty so both sides slug to the same id.
const cleanScopeField = (v) => (isAll(v) ? '' : String(v || '').trim());
function guideScope(kind, program, body = {}) {
  return {
    program: program || '',
    kind,
    track: cleanScopeField(body.track),
    course: cleanScopeField(body.course),
    lesson: cleanScopeField(body.lesson),
    topic: cleanScopeField(body.topic),
  };
}

// Send a cached guide as a single-chunk text response (same shape the client
// already streams into renderMarkdown) — instant, and costs zero tokens.
function sendCachedText(res, text) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Study-Guide', 'cache-hit');
  res.end(text);
}

/**
 * The prerequisite context for a Lesson scope, derived from the same stored graph
 * the Knowledge Map uses: which sections OUTSIDE this scope it builds on
 * (`prereqs`, with the graph's "why") and which OUTSIDE sections it unlocks
 * (`dependents`). Each entry is a full {track,course,lesson,topic} scope so the
 * client can render a clickable chip that opens that lesson, and the names feed
 * the Lesson generator so it teaches the delta instead of from scratch.
 */
function lessonGraphContext(scoped, catalog, links) {
  const rows = catalog.filter((r) => r.topic && r.id);
  const edges = buildPrereqEdges(links, rows);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const scopeIds = new Set(scoped.map((r) => r.id).filter(Boolean));
  const toScope = (r, why) => ({
    track: r.track, course: r.course, lesson: r.lesson, topic: r.topic, ...(why ? { why } : {}),
  });
  const prereqs = new Map();
  const dependents = new Map();
  for (const e of edges) {
    if (scopeIds.has(e.to) && !scopeIds.has(e.from) && byId.has(e.from) && !prereqs.has(e.from)) {
      prereqs.set(e.from, toScope(byId.get(e.from), e.why));
    }
    if (scopeIds.has(e.from) && !scopeIds.has(e.to) && byId.has(e.to) && !dependents.has(e.to)) {
      dependents.set(e.to, toScope(byId.get(e.to)));
    }
  }
  return { prereqs: [...prereqs.values()].slice(0, 12), dependents: [...dependents.values()].slice(0, 12) };
}

// Auth: the original self-contained AI study guide for a scope — reads the
// existing questions and teaches the concepts from scratch (the "Review" button).
// The guide is derived from shared data, so it's cached (once) and replayed
// instantly on later clicks; only a cache miss (or ?refresh=1) spends tokens.
app.post('/api/review', requireAuth, async (req, res, next) => {
  try {
    const programScope = await requestScope(req);
    const scope = guideScope('review', programScope.program, req.body || {});
    if (req.query.refresh !== '1') {
      const cached = await getStudyGuide(scope).catch(() => null);
      if (cached && cached.markdown) return sendCachedText(res, cached.markdown);
    }
    const catalog = await getCatalog(req.userEmail, programScope);
    const inp = await buildReviewInputs(catalog, req.body || {}, programScope);
    if (!inp) return res.status(400).json({ error: 'No topics in this section yet' });
    let acc = '';
    await streamText(res, (onToken) =>
      generateReview({ scopeLabel: inp.scopeLabel, topics: inp.topics, questions: inp.questions }, aiChoice(req),
        (t) => { acc += t; onToken(t); }));
    if (acc.trim()) saveStudyGuide(scope, acc, { scopeLabel: inp.scopeLabel }).catch(() => {});
  } catch (e) {
    if (!res.headersSent) next(e);
  }
});

// Auth: the prerequisite-aware study guide (the "Lesson" button) — same scope,
// but built ON the section's prerequisites from the graph (teaches the delta)
// rather than from scratch. Cached the same way as Review (the "Builds on /
// Leads to" chips come from /api/lesson/context, which stays live + free).
app.post('/api/lesson', requireAuth, async (req, res, next) => {
  try {
    const programScope = await requestScope(req);
    const scope = guideScope('lesson', programScope.program, req.body || {});
    if (req.query.refresh !== '1') {
      const cached = await getStudyGuide(scope).catch(() => null);
      if (cached && cached.markdown) return sendCachedText(res, cached.markdown);
    }
    const catalog = await getCatalog(req.userEmail, programScope);
    const inp = await buildReviewInputs(catalog, req.body || {}, programScope);
    if (!inp) return res.status(400).json({ error: 'No topics in this section yet' });
    let graphCtx = { prereqs: [], dependents: [] };
    try {
      graphCtx = lessonGraphContext(inp.scoped, inp.catalog, await getGraphLinks());
    } catch { /* graph unavailable — falls back to a plain from-scratch lesson */ }
    let acc = '';
    await streamText(res, (onToken) =>
      generateLesson({
        scopeLabel: inp.scopeLabel, topics: inp.topics, questions: inp.questions,
        prereqs: graphCtx.prereqs, dependents: graphCtx.dependents,
      }, aiChoice(req), (t) => { acc += t; onToken(t); }));
    if (acc.trim()) saveStudyGuide(scope, acc, { scopeLabel: inp.scopeLabel }).catch(() => {});
  } catch (e) {
    if (!res.headersSent) next(e);
  }
});

// Auth: the prereq/dependent context for a Lesson scope (non-streaming), so the
// modal can render clickable "Builds on / Leads to" chips while the guide streams.
// Reuses the exact graph computation the streamed Lesson is built on.
app.post('/api/lesson/context', requireAuth, async (req, res, next) => {
  try {
    const programScope = await requestScope(req);
    const catalog = await getCatalog(req.userEmail, programScope);
    const scoped = scopeCatalog(catalog, req.body || {});
    if (!scoped.length) return res.json({ prereqs: [], dependents: [] });
    try {
      return res.json(lessonGraphContext(scoped, catalog, await getGraphLinks()));
    } catch {
      return res.json({ prereqs: [], dependents: [] });
    }
  } catch (e) {
    next(e);
  }
});

// Admin: PRE-BUILD (cache) Lesson/Review study guides for a whole scope in
// parallel, so a learner's buttons open instantly and cost zero tokens. It
// enumerates the selected scope into per-sub-lesson and/or per-lesson targets
// (matching exactly where the buttons live), builds each requested kind with
// several generations in flight at once (never one-after-the-other), skips what
// is already cached unless `force`, and returns counts. The engine is whatever
// was picked at the top of the Composing Room (aiChoice — the aiProvider/aiModel
// cookies). Synchronous: the admin leaves the page open until it reports done.
const STUDY_GUIDE_CONCURRENCY = Math.max(
  1, Math.min(12, parseInt(process.env.STUDY_GUIDE_CONCURRENCY, 10) || 5),
);
app.post('/api/admin/study-guides/build', requireAdmin, async (req, res, next) => {
  try {
    const programScope = await requestScope(req);
    const program = programScope.program;
    const catalog = await getCatalog(req.userEmail, programScope);
    const scoped = scopeCatalog(catalog, req.body || {});
    if (!scoped.length) return res.status(400).json({ error: 'No topics in that scope' });

    const kinds = [];
    if (req.body?.doLesson) kinds.push('lesson');
    if (req.body?.doReview) kinds.push('review');
    if (!kinds.length) return res.status(400).json({ error: 'Pick Lessons and/or Reviews to build' });

    // Grain: which button locations to pre-warm. Default = both (sub-lessons and
    // lessons), matching where the learner can click.
    const grains = req.body?.grains || {};
    const doTopicGrain = grains.topic !== false;
    const doLessonGrain = grains.lesson !== false;
    const force = req.body?.force === true;

    // Enumerate the (deduped) target scopes at the requested grains. Each target
    // tuple mirrors the data-* a progress node carries so the key matches.
    const targets = new Map(); // dedupe-key -> scope
    const add = (s) => {
      const k = JSON.stringify([s.track || '', s.course || '', s.lesson || '', s.topic || '']);
      if (!targets.has(k)) targets.set(k, s);
    };
    if (doTopicGrain) {
      for (const r of scoped) if (r.topic) add({ track: r.track, course: r.course, lesson: r.lesson, topic: r.topic });
    }
    if (doLessonGrain) {
      const seen = new Set();
      for (const r of scoped) {
        if (!r.lesson) continue;
        const k = JSON.stringify([r.track || '', r.course || '', r.lesson || '']);
        if (!seen.has(k)) { seen.add(k); add({ track: r.track, course: r.course, lesson: r.lesson }); }
      }
    }
    if (!targets.size) return res.status(400).json({ error: 'Nothing to build for that grain' });

    // The prereq graph is shared; fetch it once for all Lesson builds.
    let links = [];
    if (kinds.includes('lesson')) { try { links = await getGraphLinks(); } catch { links = []; } }

    const ai = aiChoice(req);
    const cachedIds = force ? new Set() : await getStudyGuideIds(program).catch(() => new Set());

    // Flatten to a work list of {kind, scope, gscope}, dropping already-cached.
    const jobs = [];
    let skipped = 0;
    for (const scope of targets.values()) {
      for (const kind of kinds) {
        const gscope = guideScope(kind, program, scope);
        if (!force && cachedIds.has(studyGuideId(gscope))) { skipped++; continue; }
        jobs.push({ kind, scope, gscope });
      }
    }

    let built = 0, failed = 0;
    await mapWithConcurrency(jobs, STUDY_GUIDE_CONCURRENCY, async ({ kind, scope, gscope }) => {
      try {
        const inp = await buildReviewInputs(catalog, scope, programScope);
        if (!inp) return;
        let acc = '';
        const onToken = (t) => { acc += t; };
        if (kind === 'review') {
          await generateReview(
            { scopeLabel: inp.scopeLabel, topics: inp.topics, questions: inp.questions }, ai, onToken);
        } else {
          let g = { prereqs: [], dependents: [] };
          try { g = lessonGraphContext(inp.scoped, catalog, links); } catch { /* plain lesson */ }
          await generateLesson({
            scopeLabel: inp.scopeLabel, topics: inp.topics, questions: inp.questions,
            prereqs: g.prereqs, dependents: g.dependents,
          }, ai, onToken);
        }
        if (acc.trim()) { await saveStudyGuide(gscope, acc, { scopeLabel: inp.scopeLabel }); built += 1; }
        else failed += 1;
      } catch (e) {
        failed += 1;
        console.error('study-guide build failed:', kind, scope.topic || scope.lesson, e.message);
      }
    });

    res.json({
      ok: true, program, kinds,
      targets: targets.size, attempted: jobs.length,
      built, failed, skipped,
      concurrency: STUDY_GUIDE_CONCURRENCY,
    });
  } catch (e) {
    next(e);
  }
});

// Auth: AI analysis of the learner's overall progress dashboard (streamed).
// The knowledge graph's frontier/keystone signals ride along (best-effort) so
// the coach can say WHAT to study next, not just where accuracy is low.
app.post('/api/analyze', requireAuth, async (req, res, next) => {
  try {
    const catalog = await getCatalog(req.userEmail, await requestScope(req));
    const summary = buildProgressSummary(catalog);
    try {
      const links = await getGraphLinks();
      const rows = catalog.filter((r) => r.topic);
      const now = new Date();
      summary.graph = computeInsights(rows.map((r) => toNode(r, now)), buildPrereqEdges(links, rows), { limit: 8 });
    } catch { /* graph unavailable — the analysis still works without it */ }
    await streamText(res, (onToken) => generateAnalysis(summary, aiChoice(req), onToken));
  } catch (e) {
    if (!res.headersSent) next(e);
  }
});

/* ------------------------------ knowledge graph ---------------------------- */
// Nodes are topics (the stable unit every quiz attempt and priority score keys
// on); each node carries its flashcards + this user's labels. Edges are the
// computed curriculum "flow" spine plus stored AI "prereq" links (lib/graph.js).

/** Link a batch of topics (LLM -> graphLinks), chunked so each call stays
 *  careful. Shared by the admin sweep and the background top-up. */
async function linkTopics(rows, targets, ai) {
  const candidates = rows.map((r) => ({ id: r.id, topic: r.topic, course: r.course || '', track: r.track || '' }));
  const chunks = [];
  for (let i = 0; i < targets.length; i += 20) chunks.push(targets.slice(i, i + 20));
  let linked = 0;
  await mapWithConcurrency(chunks, 2, async (chunk) => {
    try {
      const results = await generateTopicLinks({ targets: chunk, candidates }, ai);
      linked += await saveGraphLinks(results);
    } catch (e) {
      console.error('graph: link batch failed:', e.message);
    }
  });
  return linked;
}

// Self-healing map: whenever the graph is opened and topics without stored
// links exist (a fresh install, or newly added topics), link a capped batch in
// the background. Repeat opens finish the job; no admin action required.
let graphLinkingInFlight = false;
function kickBackgroundLinking(rows, unlinked, ai) {
  if (graphLinkingInFlight || !unlinked.length) return;
  graphLinkingInFlight = true;
  linkTopics(rows, unlinked.slice(0, 30), ai)
    .catch(() => {})
    .finally(() => { graphLinkingInFlight = false; });
}

// Auth: the full graph for the "Visualize my progress" map — nodes with THIS
// user's mastery state, flow + prereq edges, coverage, and the deterministic
// insights (frontier = ready to start; keystones = weak links blocking the most).
app.get('/api/graph', requireAuth, async (req, res, next) => {
  try {
    const [catalog, links, allCards] = await Promise.all([
      getCatalog(req.userEmail, await requestScope(req)),
      getGraphLinks(),
      getAllFlashcardsWithId(),
    ]);
    const rows = catalog.filter((r) => r.topic);
    const now = new Date();
    const nodes = rows.map((r) => toNode(r, now));

    // Hang each topic's flashcards off its node (compact), with this user's
    // private labels, so clicking a node shows its cards and their state.
    const statuses = await getFlashcardStatuses(req.userEmail, allCards.map((c) => c.id));
    const cardsByTopic = new Map();
    for (const c of allCards) {
      if (!c.topic) continue;
      if (!cardsByTopic.has(c.topic)) cardsByTopic.set(c.topic, []);
      cardsByTopic.get(c.topic).push({
        id: c.id,
        concept: c.concept || '',
        level: c.level || 'course',
        status: statuses[c.id] || null,
      });
    }
    const LEVEL_RANK = { topic: 0, lesson: 1, course: 2 }; // most-specific first
    for (const n of nodes) {
      n.cards = (cardsByTopic.get(n.topic) || [])
        .sort((a, b) => (LEVEL_RANK[a.level] ?? 3) - (LEVEL_RANK[b.level] ?? 3));
    }

    const prereqEdges = buildPrereqEdges(links, rows);
    const edges = [...buildFlowEdges(rows), ...prereqEdges];
    const insights = computeInsights(nodes, prereqEdges);

    const linkedIds = new Set(links.map((l) => l.id));
    const unlinked = rows.filter((r) => !linkedIds.has(r.id));
    kickBackgroundLinking(rows, unlinked, aiChoice(req));

    res.json({
      nodes,
      edges,
      insights,
      coverage: {
        linked: rows.length - unlinked.length,
        total: rows.length,
        building: unlinked.length > 0,
      },
    });
  } catch (e) {
    next(e);
  }
});

// Admin: bulk-build the prereq links (resumable sweep, like the format fixers).
// Processes up to `max` unlinked topics per call; `?refresh=1` re-links
// EVERYTHING (e.g. after a big catalog change). Safe to re-run.
app.post('/api/admin/build-graph', requireAdmin, async (req, res, next) => {
  try {
    const max = Math.min(parseInt(req.query.max, 10) || 120, 600);
    // Scoped so a build covers one program's topics at a time (?program=…);
    // prerequisites never cross curricula.
    const [catalog, links] = await Promise.all([
      getCatalog(req.userEmail, await requestScope(req)),
      getGraphLinks(),
    ]);
    const rows = catalog.filter((r) => r.topic);
    const linkedIds = new Set(links.map((l) => l.id));
    const pending = req.query.refresh === '1' ? rows : rows.filter((r) => !linkedIds.has(r.id));
    const todo = pending.slice(0, max);
    const linked = await linkTopics(rows, todo, aiChoice(req));
    res.json({ ok: true, linked, remaining: Math.max(0, pending.length - todo.length) });
  } catch (e) {
    next(e);
  }
});

// Admin: AI-sequence each lesson's topics into study order and persist an
// `order` field per topic doc (resumable sweep, like the format fixers). Every
// view then sorts topics by that order instead of alphabetically.
//
// Processes up to `max` LESSONS per call; a lesson is "pending" until every one
// of its topics has a stored order. `?refresh=1` re-sequences every lesson (e.g.
// after adding topics). `?track=`/`?course=` narrow the sweep to one curriculum
// slice — the ML button passes ?track=Machine Learning. Safe to re-run.
app.post('/api/admin/sequence-topics', requireAdmin, async (req, res, next) => {
  try {
    const maxLessons = Math.min(parseInt(req.query.max, 10) || 40, 200);
    const catalog = await getCatalog(req.userEmail, await requestScope(req));
    const track = (req.query.track || '').trim();
    const course = (req.query.course || '').trim();
    const rows = catalog.filter((r) =>
      r.topic && (!track || r.track === track) && (!course || r.course === course));

    // Group rows into lessons (track+course+lesson is the unit we sequence).
    const groups = new Map();
    for (const r of rows) {
      const key = `${r.track} ${r.course} ${r.lesson}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }

    const refresh = req.query.refresh === '1';
    const pending = [...groups.values()].filter(
      (g) => refresh || g.some((r) => !Number.isFinite(r.order)));
    const todo = pending.slice(0, maxLessons);
    const ai = aiChoice(req);

    let sequenced = 0;
    await mapWithConcurrency(todo, 2, async (g) => {
      try {
        const ordered = await generateTopicOrder(
          { course: g[0].course, lesson: g[0].lesson, topics: g.map((r) => ({ id: r.id, topic: r.topic })) },
          ai,
        );
        await setTopicOrders(ordered.map((t, i) => ({ id: t.id, order: i })));
        sequenced += 1;
      } catch (e) {
        console.error('sequence-topics: lesson failed:', e.message);
      }
    });
    res.json({ ok: true, sequenced, remaining: Math.max(0, pending.length - todo.length) });
  } catch (e) {
    next(e);
  }
});

/* ------------------------------- AI tutor --------------------------------- */
// Public (rate-limited): a hint that does NOT reveal the answer (streamed).
app.post('/api/hint', rateLimitAI, async (req, res) => {
  const { question, options, answer } = req.body || {};
  if (!question || !Array.isArray(options)) {
    return res.status(400).json({ error: 'question and options are required' });
  }
  await streamText(res, (onToken) =>
    generateHint({ question, options, answer: answer || '' }, aiChoice(req), onToken));
});

// Public (rate-limited): a from-scratch explanation, shown after answering (streamed).
app.post('/api/explain', rateLimitAI, async (req, res) => {
  const { question, options, answer, userAnswer, isCorrect } = req.body || {};
  if (!question || !Array.isArray(options) || !answer) {
    return res.status(400).json({ error: 'question, options and answer are required' });
  }
  await streamText(res, (onToken) =>
    generateExplanation({ question, options, answer, userAnswer, isCorrect: !!isCorrect }, aiChoice(req), onToken));
});

/* -------------------------------- admin ----------------------------------- */
// Auth: wipe all progress (reset topic stats + delete quiz history). Keeps the
// catalog and the question bank. Start-from-scratch.
app.post('/api/admin/reset', requireAuth, async (req, res, next) => {
  try {
    const report = await resetProgress(req.userEmail);
    // Best-effort: refresh the BQ topics snapshot to mirror the wipe (default account only).
    if (req.userEmail === DEFAULT_ACCOUNT) getTopicsRows(DEFAULT_ACCOUNT).then(replaceTopics).catch(() => {});
    res.json({ ok: true, ...report });
  } catch (e) {
    next(e);
  }
});

// Auth: one-time migration that converts the existing question bank's informal
// math notation (x^2, cos^-1, x->3, ...) into KaTeX LaTeX so it renders. Safe
// and resumable: processes up to `max` un-converted questions per call, skips
// any whose converted answer no longer matches an option (keeps the original),
// and reports how many remain. Call repeatedly until remaining = 0.
const MATH_HINT = /[\^_√→×÷≤≥≠∞∑∫π]|\\[a-zA-Z]/;
const hasDollar = (q) =>
  String(q.question || '').includes('$') || (q.options || []).some((o) => String(o).includes('$'));
const needsLatex = (q) =>
  !hasDollar(q) && (MATH_HINT.test(q.question || '') || (q.options || []).some((o) => MATH_HINT.test(String(o))));

app.post('/api/admin/latexify', requireAdmin, async (req, res, next) => {
  try {
    const max = Math.min(parseInt(req.query.max, 10) || 200, 800);
    // Scoped: this is a MATH formatter, so it must not reach a non-maths
    // program's bank. Defaults to the admin's program (data science today, which
    // is the whole bank); pass ?program= to sweep another one.
    const all = await getAllQuestions(await requestScope(req));
    const pending = all.filter(needsLatex);
    const todo = pending.slice(0, max);

    let converted = 0;
    let skipped = 0;
    const BATCH = 12;
    for (let i = 0; i < todo.length; i += BATCH) {
      const chunk = todo.slice(i, i + BATCH).map((q) => ({
        id: q.id, question: q.question, options: q.options, answer: q.answer,
      }));
      let out;
      try {
        out = await latexifyQuestions(chunk, aiChoice(req));
      } catch {
        skipped += chunk.length;
        continue;
      }
      const byId = new Map((out || []).map((o) => [o.id, o]));
      const updates = [];
      for (const q of chunk) {
        const o = byId.get(q.id);
        const okShape =
          o && typeof o.question === 'string' && Array.isArray(o.options) &&
          o.options.length === q.options.length && typeof o.answer === 'string';
        const answerMatches =
          okShape && o.options.map((s) => String(s).trim()).includes(String(o.answer).trim());
        if (okShape && answerMatches) {
          updates.push({
            id: q.id,
            question: o.question,
            options: o.options.map(String),
            answer: String(o.answer),
          });
          converted += 1;
        } else {
          skipped += 1;
        }
      }
      // Commit each batch immediately so progress persists and is resumable
      // even if the request later times out.
      await bulkUpdateQuestions(updates);
    }
    res.json({ ok: true, converted, skipped, remaining: Math.max(0, pending.length - converted) });
  } catch (e) {
    next(e);
  }
});

// Admin: sweep every shared flashcard and fix the code/math formatting of the
// broken ones (same reformatter as the per-card "fixformat" command). Processes
// up to `max` candidates per call, commits each batch (resumable), and reports
// how many were fixed. Meaning is preserved; a field is only rewritten when it
// actually changes to non-empty content.
app.post('/api/admin/fix-flashcard-formats', requireAdmin, async (req, res, next) => {
  try {
    const max = Math.min(parseInt(req.query.max, 10) || 120, 600);
    const all = await getAllFlashcardsWithId();
    const pending = all.filter(flashcardNeedsFormatFix);
    const todo = pending.slice(0, max);

    let fixed = 0;
    let skipped = 0;
    const BATCH = 10;
    for (let i = 0; i < todo.length; i += BATCH) {
      const chunk = todo.slice(i, i + BATCH).map((c) => ({
        id: c.id, concept: c.concept || '', intuition: c.intuition || '', formula: c.formula || '',
      }));
      let out;
      try {
        out = await reformatFlashcards(chunk, aiChoice(req));
      } catch {
        skipped += chunk.length;
        continue;
      }
      const byId = new Map((out || []).map((o) => [o.id, o]));
      const updates = [];
      for (const c of chunk) {
        const patch = acceptCardFix(c, byId.get(c.id));
        if (Object.keys(patch).length) { updates.push({ id: c.id, ...patch }); fixed += 1; }
        else skipped += 1;
      }
      // Commit each batch immediately so progress persists / is resumable.
      await bulkUpdateFlashcards(updates);
    }
    res.json({ ok: true, fixed, skipped, candidates: pending.length, remaining: Math.max(0, pending.length - fixed) });
  } catch (e) {
    next(e);
  }
});

// Admin: sweep every shared quiz question and fix the code/math formatting (and
// strip raw HTML) of the broken ones (same reformatter as the per-question "Fix
// format" button). Processes up to `max` candidates per call, commits each batch
// (resumable), and reports how many were fixed. Meaning is preserved; the answer
// always stays matched to an option, and a field is only rewritten when it
// actually changes.
app.post('/api/admin/fix-question-formats', requireAdmin, async (req, res, next) => {
  try {
    const max = Math.min(parseInt(req.query.max, 10) || 120, 600);
    // Scoped like /api/admin/latexify — the reformatter's rules are maths-shaped.
    const all = await getAllQuestions(await requestScope(req));
    const pending = all.filter(questionNeedsFormatFix);
    const todo = pending.slice(0, max);

    let fixed = 0;
    let skipped = 0;
    const BATCH = 10;
    for (let i = 0; i < todo.length; i += BATCH) {
      // `stored` keeps the true values for change detection; `cleaned` (control
      // chars repaired) is what the model sees and the fallback baseline.
      const stored = todo.slice(i, i + BATCH).map((q) => ({
        id: q.id,
        question: q.question || '',
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        answer: q.answer || '',
      }));
      const cleanedById = new Map(stored.map((q) => [q.id, cleanQuestionEscapes(q)]));
      let out;
      try {
        out = await reformatQuestions(stored.map((q) => ({ id: q.id, ...cleanedById.get(q.id) })), aiChoice(req));
      } catch {
        skipped += stored.length;
        continue;
      }
      const byId = new Map((out || []).map((o) => [o.id, o]));
      const updates = [];
      for (const orig of stored) {
        const fix = acceptQuestionFix(cleanedById.get(orig.id), byId.get(orig.id));
        if (fix && questionFixChanges(orig, fix).length) {
          updates.push({ id: orig.id, ...fix });
          fixed += 1;
        } else {
          skipped += 1;
        }
      }
      // Commit each batch immediately so progress persists / is resumable.
      await bulkUpdateQuestions(updates);
    }
    res.json({ ok: true, fixed, skipped, candidates: pending.length, remaining: Math.max(0, pending.length - fixed) });
  } catch (e) {
    next(e);
  }
});

// Admin: one-time, idempotent merge of the math tracks into a single
// "Mathematics" track (renames Math Foundations, folds in Mathematics for ML),
// re-keying mastery stats + flashcard decks. Safe to re-run (reports 0 moved).
app.post('/api/admin/merge-math', requireAdmin, async (_req, res, next) => {
  try {
    const report = await mergeIntoMathematics();
    // Refresh the BigQuery topics snapshot to mirror the rename (default account only).
    getTopicsRows(DEFAULT_ACCOUNT, new Date(), BQ_SCOPE).then(replaceTopics).catch(() => {});
    res.json({ ok: true, ...report });
  } catch (e) {
    next(e);
  }
});

/* -------------------------------- programs -------------------------------- */

// Auth: the programs this user may study + which one this request resolves to.
// The frontend uses it to know whether to offer a program switcher at all.
app.get('/api/programs', requireAuth, async (req, res, next) => {
  try {
    const [all, enrollment, scope] = await Promise.all([
      getPrograms(),
      getEnrollment(req.userEmail),
      requestScope(req),
    ]);
    // Admins may study/inspect anything; a learner sees only what they're enrolled in.
    const mine = req.isAdmin ? all : all.filter((p) => enrollment.programs.includes(p.id));
    res.json({ programs: mine, current: scope.program, courses: scope.courses, admin: req.isAdmin });
  } catch (e) {
    next(e);
  }
});

// The curated video baseline (public/video-lessons.json), read once and cached.
let _videoSeed = null;
function videoSeed() {
  if (_videoSeed) return _videoSeed;
  try { _videoSeed = JSON.parse(readFileSync(path.join(__dirname, 'public', 'video-lessons.json'), 'utf8')); }
  catch { _videoSeed = {}; }
  return _videoSeed;
}

// Auth: the Video Lessons watch-list for the user's program — the curated baseline
// PLUS any transcript attached in Academy Admin that carries a video URL (Watcher
// imports, or a paste with a URL). Admins may pass ?program= to preview another.
app.get('/api/video-lessons', requireAuth, async (req, res, next) => {
  try {
    const scope = await requestScope(req);
    const program = scope.program;
    // Start from the curated, curriculum-ordered baseline for this program.
    const base = (videoSeed()[program] && JSON.parse(JSON.stringify(videoSeed()[program]))) || { intro: '', tracks: [] };
    const tracks = base.tracks || (base.tracks = []);
    const seenUrls = new Set();
    for (const t of tracks) for (const c of (t.courses || [])) for (const v of (c.videos || [])) if (v.url) seenUrls.add(v.url);

    const findGroup = (track, course) => {
      let tg = tracks.find((x) => x.track === track);
      if (!tg) { tg = { track, courses: [] }; tracks.push(tg); }
      let cg = tg.courses.find((x) => x.course === course);
      if (!cg) { cg = { course, videos: [], note: null }; tg.courses.push(cg); }
      return cg;
    };

    // Merge in attached transcripts that reference a video URL (deduped).
    const transcripts = await getTranscripts({ program });
    for (const tr of transcripts) {
      const url = tr.watcherRef && tr.watcherRef.url;
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);
      const cg = findGroup(tr.track || 'Other', tr.course || 'Attached videos');
      cg.videos.push({ title: tr.title || 'Video', url, lessons: tr.lesson ? [tr.lesson] : [] });
    }
    res.json({ program, ...base });
  } catch (e) {
    next(e);
  }
});

// Verify an internal service-to-service HMAC (shared platform-sso-key both apps mount
// as SSO_SECRET). Signature is over `${purpose}:${ts}` with a 5-min replay window.
// Returns true/false; used for sister-app calls that carry no user session.
function verifyInternalSig(req, purpose) {
  const secret = process.env.SSO_SECRET || '';
  if (!secret) return false;
  const ts = req.get('x-academy-ts');
  const sig = req.get('x-academy-sig');
  if (!ts || !sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${purpose}:${ts}`).digest('hex');
  return expected === sig;
}

// Internal (HMAC-gated): a user's enrolled courses with progress, for Sentinel's
// native Academy dashboard. No user session — Sentinel calls this server-to-server
// with the logged-in worker's email. Returns courses in curriculum order.
app.get('/api/internal/enrollment-progress', async (req, res, next) => {
  try {
    if (!verifyInternalSig(req, 'enrollment-progress')) return res.status(401).json({ error: 'bad signature' });
    const email = String(req.query?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email required' });
    const [enrollment, allPrograms] = await Promise.all([getEnrollment(email), getPrograms()]);
    const nameOf = (id) => (allPrograms.find((p) => p.id === id) || {}).name || id;
    // One card per ASSIGNED PROGRAM, each with aggregate topic progress across its courses.
    const programs = [];
    for (const pid of enrollment.programs) {
      const rows = await getCatalog(email, { program: pid, courses: enrollment.courses });
      let total = 0, practiced = 0, progSum = 0;
      const courses = new Set();
      for (const r of rows) {
        total += 1;
        courses.add(r.course);
        const attempts = r.totalAttempts || 0;
        if (attempts > 0) { practiced += 1; progSum += Math.round((r.correctCount || 0) / attempts * 100); }
      }
      programs.push({
        id: pid, name: nameOf(pid),
        courseCount: courses.size,
        topicsTotal: total, topicsPracticed: practiced,
        pct: total ? Math.round(progSum / total) : 0,
      });
    }
    // `admin` lets the Sentinel Academy tab default admins straight to the admin view. The
    // academy-admin page itself still re-gates the browser, so this is only a UI default.
    res.json({ programs, admin: isAdminEmail(email) });
  } catch (e) {
    next(e);
  }
});

// Admin: create/rename a program (merge — a rename keeps its defaultCourses).
app.post('/api/admin/programs', requireAdmin, async (req, res, next) => {
  try {
    const id = String(req.body?.id || '').trim();
    if (!id) return res.status(400).json({ error: 'id is required' });
    await saveProgram({ id, name: req.body?.name, defaultCourses: req.body?.defaultCourses });
    res.json({ ok: true, id });
  } catch (e) {
    next(e);
  }
});

// Admin: read/set any user's enrollment ({programs, courses}); empty courses = all.
app.get('/api/admin/enrollment', requireAdmin, async (req, res, next) => {
  try {
    const email = String(req.query?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email is required' });
    res.json({ email, ...(await getEnrollment(email)) });
  } catch (e) {
    next(e);
  }
});

app.post('/api/admin/enrollment', requireAdmin, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email is required' });
    const saved = await setEnrollment(email, {
      programs: req.body?.programs,
      courses: req.body?.courses,
    });
    res.json({ ok: true, email, ...saved });
  } catch (e) {
    next(e);
  }
});

// Admin: unenroll a student from ONE program. Drops that program from their list
// and clears course filters (courses aren't program-keyed, so we don't want a
// removed program's course filter to leak onto what remains). Removing their last
// program reverts them to the platform default (normalizeEnrollment never leaves
// programs empty) — an explicit "remove this program" action, not "block access".
app.post('/api/admin/enrollment/remove', requireAdmin, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const program = String(req.body?.program || '').trim();
    if (!email) return res.status(400).json({ error: 'email is required' });
    if (!program) return res.status(400).json({ error: 'program is required' });
    const current = await getEnrollment(email);
    const programs = (current.programs || []).filter((p) => p !== program);
    const saved = await setEnrollment(email, { programs, courses: [] });
    res.json({ ok: true, email, ...saved });
  } catch (e) {
    next(e);
  }
});

// Admin: the Sentinel people directory, for the enrolment person-picker. Fetched
// server-side from Sentinel's HMAC-gated internal endpoint using the shared
// platform-sso-key both apps mount (no CORS, no browser credentials). Degrades
// gracefully to an empty list (UI falls back to typing an email) if Sentinel is
// unreachable or the secret/URL isn't configured.
// Fetch the Sentinel people directory over the shared HMAC. Returns { people, error }
// and never throws — a missing secret / unreachable Sentinel degrades to an empty list.
// Shared by /api/admin/people (enrolment picker) and /api/admin/assignments (the view).
async function fetchSentinelPeople() {
  const secret = process.env.SSO_SECRET || '';
  const base = (process.env.SENTINEL_URL || 'https://sentinel.agoradatadriven.com').replace(/\/+$/, '');
  if (!secret) return { people: [], error: 'SSO_SECRET not configured' };
  try {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = createHmac('sha256', secret).update(`academy-people:${ts}`).digest('hex');
    const r = await fetch(`${base}/api/internal/people`, {
      headers: { 'x-academy-ts': ts, 'x-academy-sig': sig },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return { people: [], error: `sentinel ${r.status}` };
    const data = await r.json();
    return { people: Array.isArray(data.people) ? data.people : [] };
  } catch (e) {
    return { people: [], error: String(e.message || e) };
  }
}

app.get('/api/admin/people', requireAdmin, async (_req, res) => {
  res.json(await fetchSentinelPeople());
});

// Admin: everyone in the directory with the program(s) + courses they're assigned.
// Empty courses = the whole program. Enrolment reads run concurrently; a person with
// no explicit enrolment shows their effective default (default program, all courses).
app.get('/api/admin/assignments', requireAdmin, async (_req, res, next) => {
  try {
    const [{ people, error }, programs] = await Promise.all([fetchSentinelPeople(), getPrograms()]);
    const nameOf = (id) => (programs.find((p) => p.id === id) || {}).name || id;
    const assignments = await Promise.all((people || []).map(async (p) => {
      const enr = await getEnrollment(p.email);
      return {
        email: p.email,
        name: p.name || p.email,
        programs: (enr.programs || []).map((id) => ({ id, name: nameOf(id) })),
        courses: enr.courses || [],
      };
    }));
    // Explicit course assignments first, then alphabetical — the interesting rows on top.
    assignments.sort((a, b) => (b.courses.length ? 1 : 0) - (a.courses.length ? 1 : 0)
      || String(a.name).localeCompare(String(b.name)));
    res.json({ assignments, error });
  } catch (e) {
    next(e);
  }
});

// Admin: one-time, idempotent tagging of pre-program content as the default
// program + creation of the starting program docs. Re-running reports zeros.
app.post('/api/admin/backfill-programs', requireAdmin, async (_req, res, next) => {
  try {
    res.json({ ok: true, ...(await backfillPrograms()) });
  } catch (e) {
    next(e);
  }
});

/* ------------------------------- curriculum -------------------------------- */
// Admin: author the catalog in place (the Academy's curriculum is hand-written,
// not CSV-imported). Idempotent on slug(track,course,lesson,topic).
app.post('/api/admin/topics', requireAdmin, async (req, res, next) => {
  try {
    const scope = await requestScope(req);
    const id = await upsertTopic({ ...req.body, program: req.body?.program || scope.program });
    res.json({ ok: true, id });
  } catch (e) {
    next(e);
  }
});

app.delete('/api/admin/topics/:id', requireAdmin, async (req, res, next) => {
  try {
    res.json({ ok: await deleteTopic(req.params.id) });
  } catch (e) {
    next(e);
  }
});

/**
 * Admin: re-file topics under a new track/course/lesson (drag-and-drop in the
 * curriculum tree). Updates the stored fields in place, KEEPING the doc id — so
 * per-user stats (keyed by id), banked questions (keyed by name) and prereq graph
 * edges (keyed by id) all survive the move. Body: { ids:[...], to:{track?,course?,lesson?} }.
 */
app.post('/api/admin/topics/move', requireAdmin, async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
    const to = req.body?.to || {};
    if (!ids.length) return res.status(400).json({ error: 'No topics to move' });
    const moved = await moveTopics(ids, to);
    res.json({ ok: true, moved });
  } catch (e) {
    next(e);
  }
});

/**
 * Admin: persist a new study `order` on a set of topics (drag-and-drop reorder of
 * sub-lessons within a lesson, or lessons within a course). Body: { items:[{id,order}] }.
 * The client computes the order numbers; lessons sort by their MIN topic order.
 */
app.post('/api/admin/topics/reorder', requireAdmin, async (req, res, next) => {
  try {
    const items = (Array.isArray(req.body?.items) ? req.body.items : [])
      .map((it) => ({ id: String(it?.id || ''), order: Number(it?.order) }))
      .filter((it) => it.id && Number.isFinite(it.order));
    if (!items.length) return res.status(400).json({ error: 'Nothing to reorder' });
    const n = await setTopicOrders(items);
    res.json({ ok: true, n });
  } catch (e) {
    next(e);
  }
});

/**
 * Admin: bulk outline import. Accepts either rows [{track,course,lesson,topic}]
 * or `text` — one "Track > Course > Lesson > Topic" per line, which is what you
 * get from pasting a curriculum outline. `preview: true` parses and reports
 * WITHOUT writing, so a typo in a 200-line paste is caught before it lands.
 */
app.post('/api/admin/topics/bulk', requireAdmin, async (req, res, next) => {
  try {
    const scope = await requestScope(req);
    const program = req.body?.program || scope.program;
    let rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const problems = [];

    if (!rows.length && typeof req.body?.text === 'string') {
      req.body.text.split('\n').forEach((line, i) => {
        const raw = line.trim();
        if (!raw || raw.startsWith('#')) return;
        const parts = raw.split('>').map((p) => p.trim());
        if (parts.length !== 4 || parts.some((p) => !p)) {
          problems.push({ line: i + 1, text: raw.slice(0, 80), error: 'Expected "Track > Course > Lesson > Topic"' });
          return;
        }
        rows.push({ track: parts[0], course: parts[1], lesson: parts[2], topic: parts[3] });
      });
    }
    rows = rows.map((r) => ({ ...r, program }));
    if (req.body?.preview) return res.json({ ok: true, preview: true, rows, problems, count: rows.length });
    if (!rows.length) return res.status(400).json({ error: 'Nothing to import', problems });

    const report = await upsertTopics(rows);
    res.json({ ok: true, ...report, problems });
  } catch (e) {
    next(e);
  }
});

/* ------------------------------- transcripts ------------------------------- */
/* Transcripts run to tens of KB and the global express.json cap is 1mb, so these
 * routes get their own generous limit. */
const bigJson = express.json({ limit: '12mb' });

app.get('/api/admin/transcripts', requireAdmin, async (req, res, next) => {
  try {
    const scope = await requestScope(req);
    const list = await getTranscripts({ program: scope.program, course: req.query.course, lesson: req.query.lesson });
    // Never ship every full transcript to the list view.
    res.json(list.map(({ text, ...rest }) => rest));
  } catch (e) {
    next(e);
  }
});

app.get('/api/admin/transcripts/:id', requireAdmin, async (req, res, next) => {
  try {
    const t = await getTranscriptById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (e) {
    next(e);
  }
});

// Admin: attach source material (paste, uploaded file text, or a Watcher video).
app.post('/api/admin/transcripts', requireAdmin, bigJson, async (req, res, next) => {
  try {
    const scope = await requestScope(req);
    const id = await addTranscript({ ...req.body, program: req.body?.program || scope.program });
    res.json({ ok: true, id });
  } catch (e) {
    next(e);
  }
});

app.delete('/api/admin/transcripts/:id', requireAdmin, async (req, res, next) => {
  try {
    res.json({ ok: await deleteTranscript(req.params.id) });
  } catch (e) {
    next(e);
  }
});

// Admin: edit an attached transcript in place (title, scope, and/or text).
app.put('/api/admin/transcripts/:id', requireAdmin, bigJson, async (req, res, next) => {
  try {
    const existing = await getTranscriptById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await updateTranscript(req.params.id, {
      title: req.body?.title,
      text: req.body?.text,
      track: req.body?.track,
      course: req.body?.course,
      lesson: req.body?.lesson,
    });
    res.json({ ok: true, id: req.params.id });
  } catch (e) {
    next(e);
  }
});

/* --------------------------- Watcher import (Atrium) ------------------------ */
// Admin: browse Atrium's Watcher archive and pull a video's transcript across.
// Read-only; a missing bucket grant surfaces as a clean message, not a crash.
app.get('/api/admin/watcher/clients', requireAdmin, async (_req, res, next) => {
  try {
    res.json({ clients: await watcher.listClients() });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.get('/api/admin/watcher/channels', requireAdmin, async (req, res, next) => {
  try {
    res.json({ channels: await watcher.listChannels(String(req.query.client || '')) });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.get('/api/admin/watcher/videos', requireAdmin, async (req, res, next) => {
  try {
    const videos = await watcher.listVideos(String(req.query.client || ''), String(req.query.channel || ''));
    res.json({ videos });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// Admin: copy one Watcher video's transcript in, attached to a lesson/topic.
app.post('/api/admin/watcher/import', requireAdmin, async (req, res, next) => {
  try {
    const { client, channel, video, track, course, lesson, topic } = req.body || {};
    const v = await watcher.getVideo(client, channel, video);
    if (!v) return res.status(404).json({ error: 'Video not found in the Watcher archive' });
    if (!v.transcript) return res.status(400).json({ error: `That video has no transcript yet${v.error ? ` (${v.error})` : ''}` });
    const scope = await requestScope(req);
    const id = await addTranscript({
      program: req.body?.program || scope.program,
      track, course, lesson, topic,
      title: v.title,
      text: v.transcript,
      source: 'watcher',
      watcherRef: { client, channel, video, url: v.url },
    });
    res.json({ ok: true, id, title: v.title, chars: v.chars });
  } catch (e) {
    next(e);
  }
});

/* ------------------------- auto-file (AI placement) ------------------------ */
/**
 * Admin: read a piece of source material (pasted text OR a Watcher video) and let
 * the AI decide where it belongs — which existing Track/Course/Lesson it slots
 * into, or what new ones to create, and which topics to build. This is a DRY RUN:
 * it writes nothing. It returns the proposal (with new-vs-existing computed HERE
 * against the live catalog, never trusting the model) plus the resolved transcript
 * text, so /commit acts on exactly what the admin saw and approved.
 */
/**
 * Resolve the source material for an ingest plan: pasted text wins; otherwise pull
 * the chosen Watcher video's transcript. Returns everything the classifier + the
 * response shaper need, or throws an Error tagged with an HTTP `.status`.
 */
async function prepareIngest(req) {
  const scope = await requestScope(req);
  const program = req.body?.program || scope.program;
  let text = String(req.body?.text || '').trim();
  let title = String(req.body?.title || '').trim();
  let watcherRef = null;
  let source = 'paste';
  if (!text && req.body?.watcher) {
    const { client, channel, video } = req.body.watcher;
    const v = await watcher.getVideo(client, channel, video);
    if (!v) throw Object.assign(new Error('Video not found in the Watcher archive'), { status: 404 });
    if (!v.transcript) throw Object.assign(new Error(`That video has no transcript yet${v.error ? ` (${v.error})` : ''}`), { status: 400 });
    text = v.transcript;
    source = 'watcher';
    if (!title) title = v.title;
    watcherRef = { client, channel, video, url: v.url };
  }
  if (!text) throw Object.assign(new Error('Paste a transcript or pick a Watcher video first'), { status: 400 });
  const catalog = await getCatalog(req.userEmail, scope);
  const programName = (await getPrograms()).find((p) => p.id === program)?.name || program;
  return { program, programName, catalog, text, title, watcherRef, source };
}

// New-vs-existing is decided HERE, from the live catalog — never trusted from the model.
function shapeIngestPlan(p, { program, title, source, watcherRef, text, catalog }) {
  const has = (tr, co, le, to) => catalog.some((r) => r.track === tr && r.course === co && r.lesson === le && (to == null || r.topic === to));
  return {
    program,
    title: title || p.title,
    summary: p.summary,
    source,
    watcherRef,
    chars: text.length,
    text,
    placement: {
      track: p.track, course: p.course, lesson: p.lesson,
      trackIsNew: !catalog.some((r) => r.track === p.track),
      courseIsNew: !catalog.some((r) => r.track === p.track && r.course === p.course),
      lessonIsNew: !has(p.track, p.course, p.lesson),
    },
    topics: p.topics.map((t) => ({ topic: t, isNew: !has(p.track, p.course, p.lesson, t) })),
  };
}

app.post('/api/admin/ingest/plan', requireAdmin, bigJson, async (req, res, next) => {
  try {
    const ctx = await prepareIngest(req);
    const p = await classifyTranscript({ transcript: ctx.text, catalog: ctx.catalog, programName: ctx.programName }, aiFromBody(req));
    res.json(shapeIngestPlan(p, ctx));
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

// Streaming sibling: same plan, but the model's thinking is streamed live (SSE) and
// the finished placement arrives as a single 'result' event. See sseInit/sseSend.
app.post('/api/admin/ingest/plan/stream', requireAdmin, bigJson, async (req, res) => {
  let started = false;
  try {
    const ctx = await prepareIngest(req);
    sseInit(res); started = true;
    const p = await classifyTranscript(
      { transcript: ctx.text, catalog: ctx.catalog, programName: ctx.programName },
      aiFromBody(req),
      (t, kind) => sseSend(res, kind === 'thinking' ? 'thinking' : 'content', { text: t }),
    );
    sseSend(res, 'result', shapeIngestPlan(p, ctx));
    sseSend(res, 'done', {});
    res.end();
  } catch (e) {
    if (started) { try { sseSend(res, 'error', { error: e.message || 'AI request failed' }); res.end(); } catch { /* closed */ } }
    else res.status(e.status || 500).json({ error: e.message || 'AI request failed' });
  }
});

/**
 * Give freshly-created topics a sensible study `order` so new content lands in
 * place instead of at the very bottom of the tree (every view sorts topics by
 * `order`, and lessons/courses by their MIN topic order — a topic with no order
 * sorts last). We touch ONLY topics that have no order yet, appending them after
 * the highest order already used in their lesson — or, for a brand-new lesson,
 * after the highest order in their course — so a new sub-lesson trails its lesson
 * and a new lesson trails its course, never disturbing an existing sequence (safe
 * for both globally-ordered and per-lesson-ordered programs). Finer pedagogical
 * ordering is still a manual "Sequence Topics" sweep away.
 */
async function placeNewTopicsInOrder(program) {
  const catalog = (await getCatalog(null, { program })).filter((r) => r.topic && r.id);
  // Unambiguous tuple keys (no separator char to collide with names).
  const ck = (r) => JSON.stringify([r.track, r.course]);
  const lk = (r) => JSON.stringify([r.track, r.course, r.lesson]);
  const courseMax = new Map();
  const lessonMax = new Map();
  const bump = (m, k, v) => { if (!m.has(k) || v > m.get(k)) m.set(k, v); };
  for (const r of catalog) {
    if (!Number.isFinite(r.order)) continue;
    bump(courseMax, ck(r), r.order);
    bump(lessonMax, lk(r), r.order);
  }
  const groups = new Map(); // lessonKey -> [rows with no order yet]
  for (const r of catalog) {
    if (Number.isFinite(r.order)) continue;
    if (!groups.has(lk(r))) groups.set(lk(r), []);
    groups.get(lk(r)).push(r);
  }
  const updates = [];
  for (const rows of groups.values()) {
    const r0 = rows[0];
    const base = lessonMax.has(lk(r0)) ? lessonMax.get(lk(r0))
      : courseMax.has(ck(r0)) ? courseMax.get(ck(r0))
      : -1;
    rows.sort((a, b) => String(a.topic).localeCompare(String(b.topic), undefined, { numeric: true, sensitivity: 'base' }));
    rows.forEach((r, i) => updates.push({ id: r.id, order: base + 1 + i }));
  }
  if (updates.length) await setTopicOrders(updates);
  return updates.length;
}

/**
 * Admin: act on an approved placement. Creates any new topic rows, attaches the
 * transcript at the lesson level (so every chosen topic can use it), and queues a
 * generation job over exactly those topics. Returns the job; the admin page then
 * drives the existing /genjobs/:id/step stepper. Auto-publish, same as a manual
 * run — the flag + delete-batch valves still apply.
 */
app.post('/api/admin/ingest/commit', requireAdmin, bigJson, async (req, res, next) => {
  try {
    const scope = await requestScope(req);
    const program = req.body?.program || scope.program;
    const track = String(req.body?.track || '').trim();
    const course = String(req.body?.course || '').trim();
    const lesson = String(req.body?.lesson || '').trim();
    const topics = [...new Set((Array.isArray(req.body?.topics) ? req.body.topics : [])
      .map((t) => String(t || '').trim()).filter(Boolean))];
    const text = String(req.body?.text || '').trim();
    if (!track || !course || !lesson) return res.status(400).json({ error: 'Track, course and lesson are all required' });
    if (!text) return res.status(400).json({ error: 'The source material is empty' });
    // Topics are only mandatory when generating: manual placement can just FILE the
    // transcript against a lesson (the old "attach manually" flow), building nothing.
    if (req.body?.generate === true && !topics.length) return res.status(400).json({ error: 'Pick at least one topic to build questions for' });

    // 1. Ensure the topic rows exist (new ones created, existing ones untouched).
    await upsertTopics(topics.map((topic) => ({ program, track, course, lesson, topic })));
    // Slot the new topics/lesson into study order instead of the bottom of the tree.
    await placeNewTopicsInOrder(program);

    // 2. Attach the transcript at the lesson level, so every chosen topic can draw on it.
    await addTranscript({
      program, track, course, lesson,
      title: req.body?.title || 'Untitled',
      text,
      source: req.body?.source || 'paste',
      watcherRef: req.body?.watcherRef || null,
    });

    // 3. Generation is OPT-IN. By default this just files the transcript + curriculum
    // rows and stops — attaching material and building questions are separate acts.
    if (req.body?.generate !== true) {
      return res.json({ ok: true, generated: false, topics: topics.length });
    }
    const job = await createGenJob({
      program,
      scope: { track, course, lesson },
      targetPerTopic: Math.min(25, Math.max(1, parseInt(req.body?.targetPerTopic, 10) || 6)),
      provider: req.body?.provider || 'deepseek',
      model: req.body?.model || null,
      thinking: req.body?.thinking !== false,
      instructions: req.body?.instructions || '',
      topics: topics.map((topic) => ({ topic, track, course, lesson })),
    });
    res.json({ ok: true, generated: true, job: publicJob(job) });
  } catch (e) {
    next(e);
  }
});

/* --------------------- goal-based module planner --------------------------- */
/**
 * Summarise a user's catalog into the baseline the goal planner builds on. We
 * deliberately IGNORE quiz performance: everything already in the curriculum is
 * treated as "known" (content that exists and shouldn't be re-taught), so a new
 * module builds on top of the whole catalog regardless of how the learner has
 * scored. `learning` is kept for the planner's stable signature but is empty —
 * there is no performance-derived "shaky" list any more.
 */
function masteryDigest(catalog) {
  const known = [];
  for (const r of catalog || []) {
    if (r.topic) known.push(r.topic);
  }
  const cap = (a) => [...new Set(a)].slice(0, 120);
  return { known: cap(known), learning: [] };
}

/**
 * Admin: draft a whole MODULE from a stated learning goal, building on what the
 * acting user already knows. Pure planning — new-vs-existing is decided HERE from
 * the live catalog (never trusted from the model); the tree is returned for review
 * and the companion /goal/commit writes it. Mirrors /ingest/plan.
 */
/** Gather the goal + the learner's baseline the planner builds on, or throw a
 *  status-tagged Error. Shared by the JSON and streaming plan endpoints. */
async function prepareGoal(req) {
  const scope = await requestScope(req);
  const program = req.body?.program || scope.program;
  const goal = String(req.body?.goal || '').trim();
  const reference = String(req.body?.reference || '').trim();
  if (!goal) throw Object.assign(new Error('Describe what you want to learn first'), { status: 400 });
  const catalog = await getCatalog(req.userEmail, scope);
  const { known, learning } = masteryDigest(catalog);
  const programName = (await getPrograms()).find((p) => p.id === program)?.name || program;
  return { program, programName, catalog, goal, reference, known, learning };
}

// New-vs-existing decided HERE from the live catalog, never from the model.
function shapeGoalPlan(plan, { program, reference, catalog }) {
  const has = (le, to) => catalog.some((r) => r.track === plan.track && r.course === plan.course
    && (le == null || r.lesson === le) && (to == null || r.topic === to));
  return {
    program,
    track: plan.track,
    course: plan.course,
    summary: plan.summary,
    assumedKnowledge: plan.assumedKnowledge,
    reference,
    trackIsNew: !catalog.some((r) => r.track === plan.track),
    courseIsNew: !catalog.some((r) => r.track === plan.track && r.course === plan.course),
    lessons: plan.lessons.map((l) => ({
      lesson: l.lesson,
      rationale: l.rationale,
      lessonIsNew: !has(l.lesson),
      topics: l.topics.map((t) => ({ topic: t, isNew: !has(l.lesson, t) })),
    })),
  };
}

app.post('/api/admin/goal/plan', requireAdmin, bigJson, async (req, res, next) => {
  try {
    const ctx = await prepareGoal(req);
    const plan = await planCurriculum(
      { goal: ctx.goal, known: ctx.known, learning: ctx.learning, catalog: ctx.catalog, programName: ctx.programName, reference: ctx.reference },
      aiFromBody(req),
    );
    res.json(shapeGoalPlan(plan, ctx));
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

// Streaming sibling: the model's reasoning streams live (SSE) while it drafts the
// module, then the finished plan arrives as one 'result' event.
app.post('/api/admin/goal/plan/stream', requireAdmin, bigJson, async (req, res) => {
  let started = false;
  try {
    const ctx = await prepareGoal(req);
    sseInit(res); started = true;
    const plan = await planCurriculum(
      { goal: ctx.goal, known: ctx.known, learning: ctx.learning, catalog: ctx.catalog, programName: ctx.programName, reference: ctx.reference },
      aiFromBody(req),
      (t, kind) => sseSend(res, kind === 'thinking' ? 'thinking' : 'content', { text: t }),
    );
    sseSend(res, 'result', shapeGoalPlan(plan, ctx));
    sseSend(res, 'done', {});
    res.end();
  } catch (e) {
    if (started) { try { sseSend(res, 'error', { error: e.message || 'AI request failed' }); res.end(); } catch { /* closed */ } }
    else res.status(e.status || 500).json({ error: e.message || 'AI request failed' });
  }
});

/**
 * Admin: materialise an approved goal-plan. Upserts every topic, writes+attaches a
 * short brief per lesson (the stored "lesson" AND the grounding material), and
 * queues ONE topic-anchored generation job over all topics. Flashcards are built
 * client-side per lesson afterwards. Auto-publish + batchTag/flag valves still apply.
 */
app.post('/api/admin/goal/commit', requireAdmin, bigJson, async (req, res, next) => {
  try {
    const scope = await requestScope(req);
    const program = req.body?.program || scope.program;
    const track = String(req.body?.track || '').trim();
    const course = String(req.body?.course || '').trim();
    const goal = String(req.body?.goal || '').trim();
    const reference = String(req.body?.reference || '').trim();
    const assumedKnowledge = (Array.isArray(req.body?.assumedKnowledge) ? req.body.assumedKnowledge : [])
      .map((s) => String(s || '').trim()).filter(Boolean);
    // `course` here is only the module-level default; each lesson may carry its own,
    // so a blank module course is fine as long as every lesson resolves one below.
    if (!track) return res.status(400).json({ error: 'Track is required' });

    // The approved lesson tree: {track?, course?, lesson, topics:[...]}, empties dropped.
    // Each lesson may target its own course/lesson (admin re-filed it into an existing
    // unit); missing track/course fall back to the module-level defaults.
    const lessons = (Array.isArray(req.body?.lessons) ? req.body.lessons : [])
      .map((l) => ({
        track: String(l?.track || track).trim() || track,
        course: String(l?.course || course).trim() || course,
        lesson: String(l?.lesson || '').trim(),
        topics: [...new Set((Array.isArray(l?.topics) ? l.topics : []).map((t) => String(t || '').trim()).filter(Boolean))],
      }))
      .filter((l) => l.track && l.course && l.lesson && l.topics.length);
    if (!lessons.length) return res.status(400).json({ error: 'Pick at least one topic to build' });

    // 1. Ensure every topic row exists (new ones created, existing untouched).
    const flat = [];
    for (const l of lessons) for (const topic of l.topics) flat.push({ program, track: l.track, course: l.course, lesson: l.lesson, topic });
    await upsertTopics(flat);
    await placeNewTopicsInOrder(program); // slot new lessons/topics into order, not the bottom

    // 2. Write a brief per lesson (parallel) and attach it — the stored lesson + grounding.
    const ai = aiFromBody(req);
    await Promise.all(lessons.map(async (l) => {
      const brief = await writeLessonBrief({ course: l.course, lesson: l.lesson, topics: l.topics, assumedKnowledge, goal, reference }, ai);
      if (brief) await addTranscript({ program, track: l.track, course: l.course, lesson: l.lesson, title: l.lesson, text: brief, source: 'goal-plan' });
    }));

    // 3. One topic-anchored generation job over all topics (the briefs are the reference).
    const assumeNote = assumedKnowledge.length
      ? `The learner already knows: ${assumedKnowledge.join(', ')}. Do not test these directly; build on them.` : '';
    // Optional: exact transcripts the admin picked to ground generation on. When
    // present, stepGenJob uses these as the source material (overriding the thin
    // per-lesson briefs) — right when real practitioner transcripts exist for the goal.
    const transcriptIds = Array.isArray(req.body?.transcriptIds)
      ? req.body.transcriptIds.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 20)
      : [];
    const job = await createGenJob({
      program,
      scope: { track, course },
      targetPerTopic: Math.min(25, Math.max(1, parseInt(req.body?.targetPerTopic, 10) || 6)),
      provider: ai.provider,
      model: ai.model || null,
      thinking: ai.thinking,
      grounding: 'topic',
      instructions: [assumeNote, String(req.body?.instructions || '').trim()].filter(Boolean).join(' '),
      transcriptIds,
      topics: flat.map(({ topic, track: tr, course: co, lesson }) => ({ topic, track: tr, course: co, lesson })),
    });

    res.json({
      ok: true,
      job: publicJob(job),
      buildCards: req.body?.buildCards !== false,
      lessons: lessons.map((l) => ({ track: l.track, course: l.course, lesson: l.lesson, topics: l.topics })),
    });
  } catch (e) {
    next(e);
  }
});

/* ------------------------- bulk lesson builder ----------------------------- */
/** Clean a structured [{track,course,lesson,topics[]}] list from the client. */
function normalizeBulkLessons(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map((l) => ({
      track: String(l?.track || '').trim(),
      course: String(l?.course || '').trim(),
      lesson: String(l?.lesson || '').trim(),
      topics: [...new Set((Array.isArray(l?.topics) ? l.topics : []).map((t) => String(t || '').trim()).filter(Boolean))],
    }))
    .filter((l) => l.track && l.course && l.lesson && l.topics.length);
}

/**
 * Parse a pasted outline into lessons. One "Track > Course > Lesson > Topic" per
 * line (# comments and blanks ignored); lines sharing a Track/Course/Lesson are
 * grouped into a single lesson with several topics. Mirrors the splitter used by
 * /api/admin/topics/bulk, but rolls rows up to the lesson grain.
 */
function lessonsFromOutline(text) {
  const byKey = new Map();
  String(text || '').split('\n').forEach((line) => {
    const raw = line.trim();
    if (!raw || raw.startsWith('#')) return;
    const parts = raw.split('>').map((p) => p.trim());
    if (parts.length !== 4 || parts.some((p) => !p)) return;
    const [track, course, lesson, topic] = parts;
    const key = JSON.stringify([track, course, lesson]);
    if (!byKey.has(key)) byKey.set(key, { track, course, lesson, topics: [] });
    byKey.get(key).topics.push(topic);
  });
  return [...byKey.values()]
    .map((l) => ({ ...l, topics: [...new Set(l.topics)] }))
    .filter((l) => l.topics.length);
}

/**
 * Admin: build MANY complete lessons in one run. For every lesson it upserts the
 * topic rows, writes a study brief (the stored lesson + generation grounding),
 * and queues ONE topic-anchored generation job across all topics. Flashcards are
 * built client-side per lesson afterwards. This is the bulk sibling of
 * /goal/commit and /ingest/commit. `preview:true` just parses and echoes back.
 */
app.post('/api/admin/lessons/bulk-commit', requireAdmin, bigJson, async (req, res, next) => {
  try {
    const scope = await requestScope(req);
    const program = req.body?.program || scope.program;

    let lessons = normalizeBulkLessons(req.body?.lessons);
    if (!lessons.length && typeof req.body?.text === 'string') lessons = lessonsFromOutline(req.body.text);

    if (req.body?.preview) {
      const topicCount = lessons.reduce((n, l) => n + l.topics.length, 0);
      return res.json({ ok: true, preview: true, lessons, count: lessons.length, topicCount });
    }
    if (!lessons.length) return res.status(400).json({ error: 'Add at least one lesson with a track, course, lesson and topics' });

    // 1. Ensure every topic row exists (new ones created, existing untouched).
    const flat = [];
    for (const l of lessons) for (const topic of l.topics) flat.push({ program, track: l.track, course: l.course, lesson: l.lesson, topic });
    await upsertTopics(flat);
    await placeNewTopicsInOrder(program); // slot new lessons/topics into order, not the bottom

    // 2. Write a brief per lesson (parallel) and attach it — the stored lesson + grounding.
    const ai = aiFromBody(req);
    const instructions = String(req.body?.instructions || '').trim();
    await Promise.all(lessons.map(async (l) => {
      const brief = await writeLessonBrief({ course: l.course, lesson: l.lesson, topics: l.topics, reference: instructions }, ai);
      if (brief) await addTranscript({ program, track: l.track, course: l.course, lesson: l.lesson, title: l.lesson, text: brief, source: 'bulk' });
    }));

    // 3. One topic-anchored generation job over all topics (the briefs are the reference).
    const job = await createGenJob({
      program,
      scope: {},
      targetPerTopic: Math.min(25, Math.max(1, parseInt(req.body?.targetPerTopic, 10) || 6)),
      provider: ai.provider,
      model: ai.model || null,
      thinking: ai.thinking,
      grounding: 'topic',
      instructions,
      topics: flat.map(({ topic, track, course, lesson }) => ({ topic, track, course, lesson })),
    });

    res.json({
      ok: true,
      job: publicJob(job),
      buildCards: req.body?.buildCards !== false,
      lessons: lessons.map((l) => ({ track: l.track, course: l.course, lesson: l.lesson, topics: l.topics })),
    });
  } catch (e) {
    next(e);
  }
});

/* ---------------------------- generation jobs ------------------------------ */
/**
 * Admin: queue a bulk generation over a scope's topics.
 *
 * The runner is a STEPPER (see lib/genjobs.js): this only builds the queue. The
 * caller then POSTs /step repeatedly — which is what survives Cloud Run's
 * between-request CPU throttling without min-instances or new infra.
 */
app.post('/api/admin/genjobs', requireAdmin, async (req, res, next) => {
  try {
    const scope = await requestScope(req);
    const catalog = await getCatalog(req.userEmail, scope);
    const scoped = scopeCatalog(catalog, req.body || {});
    const topics = scoped
      .filter((r) => r.topic)
      .map((r) => ({ topic: r.topic, track: r.track, course: r.course, lesson: r.lesson }));
    if (!topics.length) return res.status(400).json({ error: 'No topics in that scope' });

    const job = await createGenJob({
      program: scope.program,
      scope: { track: req.body?.track, course: req.body?.course, lesson: req.body?.lesson },
      targetPerTopic: Math.min(25, Math.max(1, parseInt(req.body?.targetPerTopic, 10) || 5)),
      provider: req.body?.provider || 'deepseek',
      model: req.body?.model || null,
      thinking: req.body?.thinking !== false,
      instructions: req.body?.instructions || '',
      transcriptIds: Array.isArray(req.body?.transcriptIds) ? req.body.transcriptIds : [],
      topics,
    });
    res.json({ ok: true, job: publicJob(job) });
  } catch (e) {
    next(e);
  }
});

app.get('/api/admin/genjobs', requireAdmin, async (req, res, next) => {
  try {
    const scope = await requestScope(req);
    res.json({ jobs: await listGenJobs(scope.program) });
  } catch (e) {
    next(e);
  }
});

app.get('/api/admin/genjobs/:id', requireAdmin, async (req, res, next) => {
  try {
    const job = await getGenJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'No such job' });
    res.json({ job: publicJob(job) });
  } catch (e) {
    next(e);
  }
});

/* Advance a job by ONE topic. Deliberately NOT behind rateLimitAI: that limiter
 * is a per-IP cost guard for learner-facing AI, and this is an admin-triggered
 * server-internal batch that would trip it within seconds. */
app.post('/api/admin/genjobs/:id/step', requireAdmin, async (req, res, next) => {
  try {
    res.json({ job: await stepGenJob(req.params.id) });
  } catch (e) {
    next(e);
  }
});

app.post('/api/admin/genjobs/:id/cancel', requireAdmin, async (req, res, next) => {
  try {
    await updateGenJob(req.params.id, { status: 'cancelled', queue: [] });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* -------------------------------- roadmaps --------------------------------- */
/**
 * A ROADMAP is a curated PATH over existing catalog topics — a second lens on the
 * shared bank (see lib/firestore.js). The admin plans one from a goal (the AI
 * SELECTS existing topics and orders them into stages; it never invents a topic —
 * it only returns indices into the catalog we hand it, resolved to real rows in
 * planRoadmap). Learners see the roadmaps for their program and take them straight
 * from the "Roadmap" tab, their per-topic mastery derived from what they already
 * track. Content generation stays the goal flow's job — a roadmap only re-groups.
 */

/** Shape one stored roadmap for a client, adding progress the caller can compute. */
function publicRoadmap(rm) {
  if (!rm) return null;
  return {
    id: rm.id,
    title: rm.title || 'Roadmap',
    goal: rm.goal || '',
    summary: rm.summary || '',
    program: rm.program || DEFAULT_PROGRAM,
    audience: rm.audience === 'everyone' ? 'everyone' : 'program',
    stages: (Array.isArray(rm.stages) ? rm.stages : []).map((s) => ({
      id: s.id,
      title: s.title || '',
      summary: s.summary || '',
      items: (Array.isArray(s.items) ? s.items : []).map((it) => ({
        level: it.level || 'topic',
        program: it.program || rm.program || DEFAULT_PROGRAM,
        topicId: it.topicId || '',
        track: it.track || '',
        course: it.course || '',
        lesson: it.lesson || '',
        topic: it.topic || '',
        note: it.note || '',
      })),
    })),
    itemCount: (Array.isArray(rm.stages) ? rm.stages : []).reduce((n, s) => n + (s.items?.length || 0), 0),
    // Kept as topicCount for back-compat with existing admin list rendering.
    topicCount: (Array.isArray(rm.stages) ? rm.stages : []).reduce((n, s) => n + (s.items?.length || 0), 0),
    updatedAt: rm.updatedAt?.toMillis?.() || null,
  };
}

// Learner: the roadmaps visible in my program (plus any 'everyone' roadmap), each
// flagged with whether I'm enrolled / it was assigned to me. Access is OPEN — the
// flags are soft labels, not gates. The client joins topics to its own mastery.
app.get('/api/roadmaps', requireAuth, async (req, res, next) => {
  try {
    const scope = await requestScope(req);
    const list = await listRoadmaps({ program: scope.program });
    const shelf = (await getShelf(req.userEmail)) || { roadmaps: [], assignedRoadmaps: [] };
    const enrolled = new Set(shelf.roadmaps);
    const assigned = new Set(shelf.assignedRoadmaps);
    res.json({
      roadmaps: list.map((rm) => ({
        ...publicRoadmap(rm),
        enrolled: enrolled.has(rm.id),
        assigned: assigned.has(rm.id),
      })),
    });
  } catch (e) {
    next(e);
  }
});

app.get('/api/roadmaps/:id', requireAuth, async (req, res, next) => {
  try {
    const rm = await getRoadmap(req.params.id);
    if (!rm) return res.status(404).json({ error: 'No such roadmap' });
    // A learner may only open a roadmap in a program they can see.
    const scope = await requestScope(req);
    if (!isAdmin(req) && rm.audience !== 'everyone' && rm.program !== scope.program) {
      return res.status(403).json({ error: 'Not available in your program' });
    }
    res.json({ roadmap: publicRoadmap(rm) });
  } catch (e) {
    next(e);
  }
});

// Admin: manage roadmaps (list/save/delete) and plan one from a goal.
app.get('/api/admin/roadmaps', requireAdmin, async (req, res, next) => {
  try {
    const program = req.query?.program || undefined;
    res.json({ roadmaps: (await listRoadmaps({ program })).map(publicRoadmap) });
  } catch (e) {
    next(e);
  }
});

app.post('/api/admin/roadmaps', requireAdmin, bigJson, async (req, res, next) => {
  try {
    const scope = await requestScope(req);
    const saved = await saveRoadmap({
      id: req.body?.id,
      title: req.body?.title,
      goal: req.body?.goal,
      summary: req.body?.summary,
      program: req.body?.program || scope.program,
      audience: req.body?.audience,
      stages: req.body?.stages,
      source: req.body?.source || 'admin',
      createdBy: req.userEmail,
      updatedBy: req.userEmail,
    });
    res.json({ ok: true, roadmap: publicRoadmap(saved) });
  } catch (e) {
    if (String(e.message || '').includes('title')) return res.status(400).json({ error: e.message });
    next(e);
  }
});

app.delete('/api/admin/roadmaps/:id', requireAdmin, async (req, res, next) => {
  try {
    await deleteRoadmap(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** Gather the goal + the program's live catalog the roadmap planner selects from. */
async function prepareRoadmap(req) {
  const scope = await requestScope(req);
  const program = req.body?.program || scope.program;
  const goal = String(req.body?.goal || '').trim();
  if (!goal) throw Object.assign(new Error('Describe the goal of the roadmap first'), { status: 400 });
  const catalog = await getCatalog(req.userEmail, { ...scope, program });
  const programName = (await getPrograms()).find((p) => p.id === program)?.name || program;
  return { program, programName, catalog, goal, title: String(req.body?.title || '').trim(), reference: String(req.body?.reference || '').trim() };
}

/** Attach the program to a resolved roadmap plan (planRoadmap already resolved refs to real rows). */
function shapeRoadmapPlan(plan, { program }) {
  return {
    program,
    title: plan.title,
    summary: plan.summary,
    stages: plan.stages,
    gaps: plan.gaps || [],
  };
}

app.post('/api/admin/roadmap/plan', requireAdmin, bigJson, async (req, res, next) => {
  try {
    const ctx = await prepareRoadmap(req);
    const plan = await planRoadmap(
      { goal: ctx.goal, title: ctx.title, catalog: ctx.catalog, programName: ctx.programName, reference: ctx.reference },
      aiFromBody(req),
    );
    res.json(shapeRoadmapPlan(plan, ctx));
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

// Streaming sibling: reasoning streams live (SSE), finished plan arrives as 'result'.
app.post('/api/admin/roadmap/plan/stream', requireAdmin, bigJson, async (req, res) => {
  let started = false;
  try {
    const ctx = await prepareRoadmap(req);
    sseInit(res); started = true;
    const plan = await planRoadmap(
      { goal: ctx.goal, title: ctx.title, catalog: ctx.catalog, programName: ctx.programName, reference: ctx.reference },
      aiFromBody(req),
      (t, kind) => sseSend(res, kind === 'thinking' ? 'thinking' : 'content', { text: t }),
    );
    sseSend(res, 'result', shapeRoadmapPlan(plan, ctx));
    sseSend(res, 'done', {});
    res.end();
  } catch (e) {
    if (started) { try { sseSend(res, 'error', { error: e.message || 'AI request failed' }); res.end(); } catch { /* closed */ } }
    else res.status(e.status || 500).json({ error: e.message || 'AI request failed' });
  }
});

/* ------------------- Mastery Engine shelf (user-curated tracks) ------------- */
/*
 * The learner curates their own Mastery Engine by adding TRACKS from the open
 * bank. Adding a track also ensures its program is in the user's enrollment, so
 * the program-scoped quiz/review endpoints keep working for a track from any
 * program. A roadmap can be added in one click — it drops its referenced tracks
 * onto the shelf.
 */

// The bank browser: every (program, track) with counts. Open — any track addable.
app.get('/api/bank/tracks', requireAuth, async (_req, res, next) => {
  try {
    res.json({ tracks: await listBankTracks() });
  } catch (e) {
    next(e);
  }
});

// My current shelf (resolved: curated, else enrollment-derived).
app.get('/api/me/shelf', requireAuth, async (req, res, next) => {
  try {
    res.json({ tracks: (await effectiveShelf(req.userEmail)) || [] });
  } catch (e) {
    next(e);
  }
});

/** Materialise the user's shelf (from enrollment if they've never curated), apply
 *  a set of {program, track} mutations, and ensure each added track's program is in
 *  their enrollment so quizzes resolve. `add`/`remove` are arrays of {program, track}. */
async function mutateShelf(email, add = [], remove = []) {
  const base = (await effectiveShelf(email)) || [];
  const map = new Map(base.map((t) => [JSON.stringify([t.program, t.track]), t]));
  for (const t of remove) if (t && t.track) map.delete(JSON.stringify([t.program || DEFAULT_PROGRAM, t.track]));
  const addPrograms = new Set();
  for (const t of add) {
    if (!t || !t.track) continue;
    const rec = { program: t.program || DEFAULT_PROGRAM, track: t.track };
    map.set(JSON.stringify([rec.program, rec.track]), rec);
    addPrograms.add(rec.program);
  }
  const saved = await setShelf(email, { tracks: [...map.values()] });
  // Open bank: adding a track from a program you're not enrolled in enrolls you in
  // it (courses stay "all"), so requestScope honours that program for quizzes.
  if (addPrograms.size) {
    const enr = await getEnrollment(email);
    const programs = new Set(enr.programs);
    let changed = false;
    for (const p of addPrograms) if (!programs.has(p)) { programs.add(p); changed = true; }
    if (changed) await setEnrollment(email, { programs: [...programs], courses: enr.courses });
  }
  return saved;
}

/** Enrol `email` in a roadmap: auto-add its tracks to their Mastery Engine and
 *  record the roadmap id (assigned=true also badges it "Assigned"). */
async function enrollRoadmap(email, roadmap, { assigned = false } = {}) {
  await mutateShelf(email, collectRoadmapTracks(roadmap), []);
  const shelf = (await getShelf(email)) || { roadmaps: [], assignedRoadmaps: [] };
  const roadmaps = new Set(shelf.roadmaps); roadmaps.add(roadmap.id);
  const assignedRoadmaps = new Set(shelf.assignedRoadmaps);
  if (assigned) assignedRoadmaps.add(roadmap.id);
  await setShelf(email, { roadmaps: [...roadmaps], assignedRoadmaps: [...assignedRoadmaps] });
}

/** Un-enrol: drop the roadmap id and (by default) its tracks from the shelf. */
async function unenrollRoadmap(email, roadmap, { removeTracks = true } = {}) {
  const shelf = (await getShelf(email)) || { tracks: [], roadmaps: [], assignedRoadmaps: [] };
  const roadmaps = shelf.roadmaps.filter((x) => x !== roadmap.id);
  const assignedRoadmaps = shelf.assignedRoadmaps.filter((x) => x !== roadmap.id);
  const patch = { roadmaps, assignedRoadmaps };
  if (removeTracks) {
    const drop = new Set(collectRoadmapTracks(roadmap).map((t) => JSON.stringify([t.program, t.track])));
    const base = (await effectiveShelf(email)) || [];
    patch.tracks = base.filter((t) => !drop.has(JSON.stringify([t.program, t.track])));
  }
  await setShelf(email, patch);
}

// Add or remove one track from my Mastery Engine.
app.post('/api/me/tracks', requireAuth, async (req, res, next) => {
  try {
    const program = String(req.body?.program || DEFAULT_PROGRAM);
    const track = String(req.body?.track || '').trim();
    if (!track) return res.status(400).json({ error: 'track is required' });
    const action = req.body?.action === 'remove' ? 'remove' : 'add';
    const saved = await mutateShelf(
      req.userEmail,
      action === 'add' ? [{ program, track }] : [],
      action === 'remove' ? [{ program, track }] : [],
    );
    res.json({ ok: true, ...saved });
  } catch (e) {
    next(e);
  }
});

// Enrol in / add a whole roadmap to my Mastery Engine (auto-adds its tracks).
app.post('/api/me/roadmaps/:id/add', requireAuth, async (req, res, next) => {
  try {
    const rm = await getRoadmap(req.params.id);
    if (!rm) return res.status(404).json({ error: 'No such roadmap' });
    const tracks = collectRoadmapTracks(rm);
    if (!tracks.length) return res.status(400).json({ error: 'This roadmap has no tracks to add' });
    await enrollRoadmap(req.userEmail, rm, { assigned: false });
    res.json({ ok: true, added: tracks.length });
  } catch (e) {
    next(e);
  }
});

// Remove a roadmap from my Mastery Engine (drops its tracks too).
app.post('/api/me/roadmaps/:id/remove', requireAuth, async (req, res, next) => {
  try {
    const rm = await getRoadmap(req.params.id);
    if (!rm) return res.status(404).json({ error: 'No such roadmap' });
    await unenrollRoadmap(req.userEmail, rm, { removeTracks: true });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Admin: assign / unassign a roadmap to workers. Assignment is a SOFT label +
// auto-populates their Mastery Engine — it grants no exclusive access (the bank
// is open to everyone regardless).
app.post('/api/admin/roadmaps/:id/assign', requireAdmin, bigJson, async (req, res, next) => {
  try {
    const rm = await getRoadmap(req.params.id);
    if (!rm) return res.status(404).json({ error: 'No such roadmap' });
    const emails = (Array.isArray(req.body?.emails) ? req.body.emails : [])
      .map((e) => String(e || '').trim().toLowerCase()).filter(Boolean);
    if (!emails.length) return res.status(400).json({ error: 'Pick at least one person' });
    const unassign = req.body?.action === 'unassign';
    for (const email of emails) {
      if (unassign) await unenrollRoadmap(email, rm, { removeTracks: false });
      else await enrollRoadmap(email, rm, { assigned: true });
    }
    res.json({ ok: true, count: emails.length, action: unassign ? 'unassign' : 'assign' });
  } catch (e) {
    next(e);
  }
});

/* ------------------------- flags (auto-publish valve) ---------------------- */
// Any signed-in learner can flag a bad question — the safety valve that makes
// auto-publishing generated questions survivable.
app.post('/api/questions/:id/flag', requireAuth, async (req, res, next) => {
  try {
    const id = await flagQuestion({
      questionId: req.params.id,
      email: req.userEmail,
      reason: req.body?.reason,
      topic: req.body?.topic,
    });
    res.json({ ok: true, id });
  } catch (e) {
    next(e);
  }
});

app.get('/api/admin/flags', requireAdmin, async (req, res, next) => {
  try {
    res.json({ flags: await listQuestionFlags(req.query.all === '1') });
  } catch (e) {
    next(e);
  }
});

app.post('/api/admin/flags/:id/resolve', requireAdmin, async (req, res, next) => {
  try {
    const ok = await resolveQuestionFlag(req.params.id, { deleteQuestion: req.body?.deleteQuestion === true });
    res.json({ ok });
  } catch (e) {
    next(e);
  }
});

// Admin: pull an entire generation batch (the "that run was bad" button).
app.post('/api/admin/questions/delete-batch', requireAdmin, async (req, res, next) => {
  try {
    res.json({ ok: true, ...(await deleteQuestionBatch(String(req.body?.batchTag || ''))) });
  } catch (e) {
    next(e);
  }
});

// Auth: one-time CSV -> Firestore import (idempotent).
app.post('/api/admin/migrate', requireAdmin, async (_req, res, next) => {
  try {
    const report = await runMigration();
    res.json({ ok: true, report });
  } catch (e) {
    next(e);
  }
});

// Auth: one-time backfill of historical quizLog into BigQuery. Idempotent only
// in the sense of "re-runnable" — running twice duplicates rows, so call once.
app.post('/api/admin/bq-backfill', requireAdmin, async (_req, res, next) => {
  try {
    const rows = await getQuizLogRows(DEFAULT_ACCOUNT);
    const inserted = await backfillRows(rows);
    res.json({ ok: true, inserted });
  } catch (e) {
    next(e);
  }
});

// Auth: refresh the BigQuery `topics` mastery snapshot from live Firestore.
// Full replace (WRITE_TRUNCATE) — safe to re-run anytime; also runs
// automatically after every logged quiz.
app.post('/api/admin/bq-sync-topics', requireAdmin, async (_req, res, next) => {
  try {
    const rows = await getTopicsRows(DEFAULT_ACCOUNT, new Date(), BQ_SCOPE);
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
