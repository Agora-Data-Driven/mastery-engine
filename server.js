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
  getAllQuestions,
  getQuestionById,
  bulkUpdateQuestions,
  bulkUpdateFlashcards,
  getFlashcards,
  getFlashcardById,
  getAllFlashcards,
  getAllFlashcardsWithId,
  saveFlashcards,
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
  addUsage,
  getUsage,
  slug,
} from './lib/firestore.js';
import { deriveStats } from './lib/priority.js';
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
  generateAnalysis,
  generateConfusions,
  generateDrillQuestion,
  generateSimilarQuestions,
  generateFlashcards,
  generateFlashcardQuestion,
  generateCardChat,
  generateScopeChat,
  generateAssistantChat,
  generateFlashcardQuestions,
  generateTopicLinks,
  latexifyQuestions,
  reformatFlashcards,
  editFlashcard,
  reformatQuestions,
  restoreLatexEscapes,
} from './lib/gemini.js';
import { runWithUsage, newUsage } from './lib/usage.js';
import { listOllamaModels } from './lib/ollama.js';
import { listLMStudioModels } from './lib/lmstudio.js';
import { deepseekConfigured, listDeepSeekModels } from './lib/deepseek.js';
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

/** The AI engine the client picked (cookies set by the home-page dropdown). */
function aiChoice(req) {
  const p = req.cookies?.aiProvider;
  const provider = ['deepseek', 'ollama', 'lmstudio'].includes(p) ? p : 'gemini';
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
app.get('/api/catalog', async (req, res, next) => {
  try {
    const catalog = await getCatalog(optionalUser(req));
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
    // Local engines only when this server can reach them (i.e. run locally).
    const [ollama, lmstudio] = await Promise.all([listOllamaModels(), listLMStudioModels()]);
    if (ollama.length) providers.push({ id: 'ollama', label: 'Local (Ollama)', models: ollama });
    if (lmstudio.length) providers.push({ id: 'lmstudio', label: 'Local (LM Studio)', models: lmstudio });
    res.json({
      providers,
      deepseekAvailable: deepseekConfigured(),
      ollamaAvailable: ollama.length > 0,
      lmstudioAvailable: lmstudio.length > 0,
    });
  } catch (e) {
    next(e);
  }
});

// Public: the whole question bank with hierarchy, for offline caching in the
// browser. Lets the app serve quizzes and render menus without a connection.
app.get('/api/questions/all', async (_req, res, next) => {
  try {
    const [catalog, questions] = await Promise.all([getCatalog(null), getAllQuestions()]);
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
      getCatalog(req.userEmail),
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
    const catalog = await getCatalog(optionalUser(req));
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
    const catalog = await getCatalog(req.userEmail);
    const seen = await getSeenQuestionTexts(req.userEmail);

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
    const catalog = await getCatalog(user);
    const pool = await getQuestionsForTopics(topics);
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
    const catalog = await getCatalog(req.userEmail);
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

// Auth: the flashcard analogue of the Mastery quiz. Instead of one deck, build a
// single review deck of cards drawn from the learner's WEAKEST topics, interleaved
// round-robin across tracks (and across topics within a track) — the same "mix it
// up, weakest first" philosophy as /api/quiz/priority, applied to flashcards.
const MASTERY_DECK_SIZE = 24;
app.post('/api/flashcards/mastery', requireAuth, async (req, res, next) => {
  try {
    const catalog = await getCatalog(req.userEmail);
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
      getTopicsRows(DEFAULT_ACCOUNT).then(replaceTopics).catch(() => {});
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
    const catalog = await getCatalog(req.userEmail);
    const scoped = scopeCatalog(catalog, req.body || {});
    const topics = [...new Set(scoped.map((r) => r.topic))].filter(Boolean);
    if (!topics.length) return res.status(400).json({ error: 'No topics in scope' });

    let created = 0;
    const errors = [];
    const ai = aiChoice(req);
    const difficulty = difficultyChoice(req);
    // Knowledge-graph links (best-effort): each topic's prompt gets the learner's
    // standing on its prerequisites, steering questions toward weak sub-steps.
    const graphLinks = await getGraphLinks().catch(() => []);
    // Fan out across topics (bounded) instead of one serial round-trip each.
    await mapWithConcurrency(topics, 4, async (topic) => {
      try {
        const [existing, attempts] = await Promise.all([
          getQuestionsForTopics([topic]),
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
        const generated = await generateQuestions(topic, baseline, count, ai, { existing: stems, performance, difficulty, prereqs });
        for (const g of generated) {
          await addQuestion(g);
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
    const catalog = await getCatalog(req.userEmail);
    const idx = metaIndex(catalog);
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
    const id = await addQuestion({ ...drilled, source: 'drill' });

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

    const catalog = await getCatalog(req.userEmail);
    const idx = metaIndex(catalog);
    if (!idx.has(topic)) return res.status(400).json({ error: 'Unknown topic; cannot generate for it' });
    const meta = idx.get(topic);
    const scopeLabel = [meta.course, meta.lesson, topic].filter(Boolean).join(' › ');

    // Existing stems for this topic become an avoid-list so "more like this"
    // widens coverage instead of re-emitting questions already in the bank.
    const pool = await getQuestionsForTopics([topic]);
    const generated = await generateSimilarQuestions(
      { topic, scopeLabel, question: question || '', options: options || [], answer: answer || '', existing: pool.map((q) => q.question) },
      count,
      aiChoice(req)
    );
    // Persist into the bank (tagged so these can be audited/pruned separately),
    // carrying each new id back so the client copies can be reformatted inline.
    const banked = [];
    for (const g of generated) banked.push({ ...g, id: await addQuestion({ ...g, source: 'similar' }) });

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
    const catalog = await getCatalog(req.userEmail);
    const scoped = scopeCatalog(catalog, scope);
    const topics = [...new Set(scoped.map((r) => r.topic))].filter(Boolean);
    if (!topics.length) return res.status(400).json({ error: 'No topics in this section yet' });

    // Sample the section's questions so the deck is comprehensive enough to cover them.
    const pool = await getQuestionsForTopics(topics.slice(0, 60));
    const questions = shuffle(pool).slice(0, 40)
      .map((q) => ({ topic: q.topic, question: q.question, answer: q.answer }));

    const cards = await generateFlashcards(
      { scopeLabel: flashcardScopeLabel(scope), level: scope.level, topics, questions },
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

    const catalog = await getCatalog(req.userEmail);
    const idx = metaIndex(catalog);
    if (!card.topic || !idx.has(card.topic)) {
      return res.status(400).json({ error: 'This card is not linked to a known topic' });
    }
    const meta = idx.get(card.topic);
    const scopeLabel = [meta.course, meta.lesson, card.topic].filter(Boolean).join(' › ');

    // Feed the planner what already exists for this topic (avoid-list), how
    // this learner has done on it (difficulty target + missed-question focus),
    // and the graph's prerequisite standing (weak prereqs become sub-steps).
    const [pool, attempts, graphLinks] = await Promise.all([
      getQuestionsForTopics([card.topic]),
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
    for (const q of qs) banked.push({ ...q, id: await addQuestion({ ...q, source: 'flashcard' }) });
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
      getQuestionsForTopics([card.topic]),
      getTopicAttempts(req.userEmail, card.topic),
    ]);
    res.json({ topic: card.topic, questionCount: pool.length, ...attempts });
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
    const catalog = await getCatalog(req.userEmail);
    const idx = metaIndex(catalog);
    const meta = card.topic && idx.has(card.topic) ? idx.get(card.topic) : {};
    const scopeLabel = [meta.course, meta.lesson, card.topic].filter(Boolean).join(' › ') || card.topic || '';
    const pool = card.topic ? await getQuestionsForTopics([card.topic]) : [];
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

    const catalog = await getCatalog(req.userEmail);
    const scoped = scopeCatalog(catalog, req.body || {});
    const topics = [...new Set(scoped.map((r) => r.topic))].filter(Boolean).slice(0, 60);
    if (!topics.length) return res.status(400).json({ error: 'No topics in this section yet' });

    const { track, course, lesson, topic } = req.body || {};
    const scopeLabel = !isAll(topic) ? topic
      : !isAll(lesson) ? lesson
      : !isAll(course) ? course
      : !isAll(track) ? track
      : 'Your selection';

    const pool = await getQuestionsForTopics(topics);
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

    const existing = conversationId ? await getAssistantChat(req.userEmail, conversationId) : null;
    const history = existing ? existing.messages : [];
    const out = await generateAssistantChat({ context, history, message }, aiChoice(req));

    const messages = [...history, { role: 'user', text: message }, { role: 'assistant', text: out.reply }];
    const saved = await saveAssistantChat(req.userEmail, existing ? conversationId : '', messages);
    res.json({ reply: out.reply, visual: out.visual, conversationId: saved.id, title: saved.title });
  } catch (e) {
    next(e);
  }
});

/* --------------------------- progress AI features ------------------------- */
// Auth: AI study guide for a scope — reads the existing questions and teaches
// the concepts the learner needs BEFORE attempting that section.
app.post('/api/review', requireAuth, async (req, res, next) => {
  try {
    const catalog = await getCatalog(req.userEmail);
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

    await streamText(res, (onToken) =>
      generateReview({ scopeLabel, topics, questions }, aiChoice(req), onToken));
  } catch (e) {
    if (!res.headersSent) next(e);
  }
});

// Auth: AI analysis of the learner's overall progress dashboard (streamed).
// The knowledge graph's frontier/keystone signals ride along (best-effort) so
// the coach can say WHAT to study next, not just where accuracy is low.
app.post('/api/analyze', requireAuth, async (req, res, next) => {
  try {
    const catalog = await getCatalog(req.userEmail);
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
      getCatalog(req.userEmail),
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
    const [catalog, links] = await Promise.all([getCatalog(req.userEmail), getGraphLinks()]);
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
    const all = await getAllQuestions();
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
    const all = await getAllQuestions();
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
    getTopicsRows(DEFAULT_ACCOUNT).then(replaceTopics).catch(() => {});
    res.json({ ok: true, ...report });
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
    const rows = await getTopicsRows(DEFAULT_ACCOUNT);
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
