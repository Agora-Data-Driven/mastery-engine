/**
 * Firestore data layer.
 *
 * SHARED across all users (unchanged):
 *   Question Bank -> `questions`  (the MCQ pool)
 *   Catalog       -> `topics`     (track/course/lesson/topic + questionCount)
 *
 * PER-USER progress (mastery stats + attempt log), keyed by a normalised email `userKey`:
 *   - The LEGACY OWNER (MASTERY_DEFAULT_ACCOUNT, default ianfernandezctm@gmail.com) maps to the
 *     ORIGINAL top-level collections: stats live embedded on the `topics` docs and attempts in
 *     `quizLog`. So all pre-existing progress is his, with NO migration.
 *   - Every OTHER user gets their own subcollections: `users/{userKey}/topicStats/{topicId}` and
 *     `users/{userKey}/quizLog/{id}`. The catalog is still read from the shared `topics` docs and
 *     each user's stats are overlaid on top (so nobody sees anyone else's numbers).
 * A null `userKey` (guest) reads the catalog with fresh/zero stats.
 */
import { Firestore, FieldValue, Timestamp } from '@google-cloud/firestore';
import { computePriority, deriveStats } from './priority.js';

// On Cloud Run, project + credentials come from the runtime automatically.
export const db = new Firestore({
  ignoreUndefinedProperties: true,
});

export const COL = {
  topics: 'topics',
  questions: 'questions',
  quizLog: 'quizLog',
  flashcards: 'flashcards',
};

// The account that owns the pre-existing (global) progress; env-overridable.
export const LEGACY_OWNER = (process.env.MASTERY_DEFAULT_ACCOUNT || 'ianfernandezctm@gmail.com')
  .trim()
  .toLowerCase();

const normKey = (userKey) => (userKey || '').trim().toLowerCase();
const isLegacy = (userKey) => normKey(userKey) === LEGACY_OWNER;

/** The collection holding a user's per-topic stats (embedded on `topics` for the legacy owner). */
function statsCol(userKey) {
  return isLegacy(userKey)
    ? db.collection(COL.topics)
    : db.collection('users').doc(normKey(userKey)).collection('topicStats');
}
function statsDoc(userKey, topicId) {
  return statsCol(userKey).doc(topicId);
}
/** The collection holding a user's attempt log. */
function logCol(userKey) {
  return isLegacy(userKey)
    ? db.collection(COL.quizLog)
    : db.collection('users').doc(normKey(userKey)).collection('quizLog');
}

/** Deterministic doc id so re-running the import is idempotent. */
export function slug(...parts) {
  return (
    parts
      .join('__')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 480) || 'x'
  );
}

/* ----------------------------- Catalog (topics) ---------------------------- */

/**
 * Full topic catalog for `userKey`, each row carrying THAT user's mastery stats (accuracy/priority
 * are derived downstream). Legacy owner: stats are already on the `topics` docs. Others: the shared
 * catalog with their own stats overlaid (zeros where they haven't practised). Guest (null): zeros.
 */
export async function getCatalog(userKey = null) {
  const snap = await db.collection(COL.topics).get();
  const catalog = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (isLegacy(userKey)) return catalog; // stats embedded on the catalog docs (original behaviour)

  const now = new Date();
  const freshPriority = computePriority({ correctCount: 0, totalAttempts: 0, lastAttempted: null }, now);
  let byId = new Map();
  if (userKey) {
    const sSnap = await statsCol(userKey).get();
    byId = new Map(sSnap.docs.map((d) => [d.id, d.data()]));
  }
  return catalog.map((t) => {
    const s = byId.get(t.id) || {};
    return {
      ...t,
      correctCount: s.correctCount || 0,
      totalAttempts: s.totalAttempts || 0,
      lastAttempted: s.lastAttempted || null,
      priority: s.priority != null ? s.priority : freshPriority,
    };
  });
}

/** The catalog shaped as BigQuery rows (mastery snapshot) for `userKey`. */
export async function getTopicsRows(userKey = null, now = new Date()) {
  const cat = await getCatalog(userKey);
  const syncedAt = now.toISOString();
  return cat.map((t) => {
    const correctCount = t.correctCount || 0;
    const totalAttempts = t.totalAttempts || 0;
    const lastAttempted = t.lastAttempted?.toDate ? t.lastAttempted.toDate() : null;
    const d = deriveStats({ correctCount, totalAttempts, lastAttempted }, now);
    return {
      track: t.track || '',
      course: t.course || '',
      lesson: t.lesson || '',
      topic: t.topic || '',
      questionCount: t.questionCount || 0,
      totalAttempts,
      correctCount,
      accuracy: totalAttempts ? d.accuracy : null,
      daysSince: totalAttempts ? d.daysSince : null,
      priority: d.priority,
      lastAttempted: lastAttempted ? lastAttempted.toISOString() : null,
      syncedAt,
    };
  });
}

/* --------------------------------- Questions ------------------------------- */
/* (Shared across all users — the question bank is common.) */

/** All questions for a set of topic names. Firestore `in` caps at 30 values. */
export async function getQuestionsForTopics(topicNames) {
  const out = [];
  for (let i = 0; i < topicNames.length; i += 30) {
    const chunk = topicNames.slice(i, i + 30);
    if (!chunk.length) continue;
    const snap = await db.collection(COL.questions).where('topic', 'in', chunk).get();
    snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  }
  return out;
}

/** Every question doc (for the one-time LaTeX migration). */
export async function getAllQuestions() {
  const snap = await db.collection(COL.questions).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Apply {id, question, options, answer} updates in chunked batches. */
export async function bulkUpdateQuestions(updates) {
  let batch = db.batch();
  let ops = 0;
  let n = 0;
  for (const u of updates) {
    batch.update(db.collection(COL.questions).doc(u.id), {
      question: u.question,
      options: u.options,
      answer: u.answer,
    });
    n += 1;
    if (++ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return n;
}

export async function addQuestion({ topic, question, options, answer, source }) {
  await db.collection(COL.questions).add({
    topic,
    question,
    options,
    answer,
    createdAt: FieldValue.serverTimestamp(),
    generated: true,
    source,
  });
}

/** Set of question texts THIS user has already answered (mastery mode). */
export async function getSeenQuestionTexts(userKey = null) {
  if (!userKey) return new Set();
  const snap = await logCol(userKey).select('question').get();
  const seen = new Set();
  snap.forEach((d) => {
    const t = d.get('question');
    if (t) seen.add(String(t).trim());
  });
  return seen;
}

/**
 * Recent attempt history bucketed by UTC day for `userKey`, for the progress chart.
 * Reads only the last `days` of the user's quizLog (single-field `date` index is auto-created).
 */
export async function getRecentActivity(userKey = null, days = 14) {
  const out = [];
  const buckets = new Map(); // 'YYYY-MM-DD' -> { total, correct }
  if (userKey) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const snap = await logCol(userKey)
      .where('date', '>=', Timestamp.fromDate(cutoff))
      .select('date', 'result')
      .get();
    snap.forEach((d) => {
      const ts = d.get('date');
      if (!ts?.toDate) return;
      const day = ts.toDate().toISOString().slice(0, 10);
      const b = buckets.get(day) || { total: 0, correct: 0 };
      b.total += 1;
      b.correct += d.get('result') === 1 ? 1 : 0;
      buckets.set(day, b);
    });
  }
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    out.push({ day, ...(buckets.get(day) || { total: 0, correct: 0 }) });
  }
  return out;
}

/** Full quizLog history for `userKey`, shaped as BigQuery rows (for the one-time backfill). */
export async function getQuizLogRows(userKey = null) {
  if (!userKey) return [];
  const snap = await logCol(userKey).get();
  return snap.docs.map((d) => {
    const x = d.data();
    const date = x.date?.toDate ? x.date.toDate() : null;
    return {
      date: (date || new Date(0)).toISOString(),
      track: x.track || '',
      course: x.course || '',
      lesson: x.lesson || '',
      topic: x.topic || '',
      question: x.question || '',
      result: x.result === 1 ? 1 : 0,
      reviewFlag: x.reviewFlag === 1 ? 1 : 0,
    };
  });
}

/** Current activity streak (consecutive UTC days with a logged attempt) for `userKey`. */
export async function getStreak(userKey = null, now = new Date()) {
  if (!userKey) return 0;
  const snap = await logCol(userKey).select('date').get();
  const days = new Set();
  snap.forEach((d) => {
    const ts = d.get('date');
    if (ts?.toDate) days.add(ts.toDate().toISOString().slice(0, 10));
  });
  if (!days.size) return 0;

  const DAY_MS = 24 * 60 * 60 * 1000;
  let cursor = new Date(now.getTime());
  const keyOf = (dt) => dt.toISOString().slice(0, 10);

  if (!days.has(keyOf(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS);
    if (!days.has(keyOf(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(keyOf(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

/**
 * Wipe `userKey`'s progress. Legacy owner: zero every `topics` doc's embedded stats + delete
 * `quizLog` (as before). Others: delete their `topicStats` + `quizLog` subcollection docs.
 */
export async function resetProgress(userKey = null, now = new Date()) {
  if (!userKey) return { topicsReset: 0, logDeleted: 0 };

  let topicsReset = 0;
  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (ops > 0) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  };

  if (isLegacy(userKey)) {
    const freshPriority = computePriority(
      { correctCount: 0, totalAttempts: 0, lastAttempted: null },
      now,
    );
    const topicsSnap = await db.collection(COL.topics).get();
    for (const doc of topicsSnap.docs) {
      batch.set(
        doc.ref,
        { correctCount: 0, totalAttempts: 0, lastAttempted: FieldValue.delete(), priority: freshPriority },
        { merge: true },
      );
      topicsReset += 1;
      if (++ops >= 450) await flush();
    }
    await flush();
  } else {
    const statsSnap = await statsCol(userKey).get();
    for (const doc of statsSnap.docs) {
      batch.delete(doc.ref);
      topicsReset += 1;
      if (++ops >= 450) await flush();
    }
    await flush();
  }

  // Delete the user's attempt log.
  const logSnap = await logCol(userKey).get();
  let logDeleted = 0;
  for (const doc of logSnap.docs) {
    batch.delete(doc.ref);
    logDeleted += 1;
    if (++ops >= 450) await flush();
  }
  await flush();

  return { topicsReset, logDeleted };
}

/* -------------------------------- Flashcards ------------------------------- */
/*
 * Flashcards are AI-generated study cards for a Course- or Lesson-level scope
 * (never per sub-lesson). The card DEFINITIONS are shared across users (like the
 * question bank) and live in the `flashcards` collection, tagged with a
 * deterministic `scopeId` so a scope's deck can be fetched (and regenerated)
 * cleanly. Each user's own LABELS (mastered / learning / important) are private
 * and stored under `users/{userKey}/flashcardStatus/{cardId}` for EVERY user
 * (this is all-new data, so there is no legacy-owner special case).
 */

/** Deterministic id for a Course/Lesson/Topic scope so its deck can be looked up + replaced. */
export function flashcardScopeId({ level, track, course, lesson, topic }) {
  return slug(level || 'course', track || '', course || '', lesson || '', topic || '');
}

const flashcardStatusCol = (userKey) =>
  db.collection('users').doc(normKey(userKey)).collection('flashcardStatus');

/** All cards for a scope, ordered by their stored `order` (sorted in-memory: no index needed). */
export async function getFlashcards(scope) {
  const scopeId = flashcardScopeId(scope);
  const snap = await db.collection(COL.flashcards).where('scopeId', '==', scopeId).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** A single card by id (for "quiz me on this"). */
export async function getFlashcardById(id) {
  const doc = await db.collection(COL.flashcards).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/**
 * Replace a scope's deck: delete any existing cards for the scope, then write the
 * freshly-generated ones. Returns the number of cards written.
 */
export async function saveFlashcards(scope, cards) {
  const scopeId = flashcardScopeId(scope);
  const col = db.collection(COL.flashcards);

  // Clear the old deck for this scope.
  const existing = await col.where('scopeId', '==', scopeId).get();
  let batch = db.batch();
  let ops = 0;
  const flush = async () => { if (ops) { await batch.commit(); batch = db.batch(); ops = 0; } };
  for (const d of existing.docs) {
    batch.delete(d.ref);
    if (++ops >= 450) await flush();
  }
  // Write the new deck.
  cards.forEach((c, i) => {
    batch.set(col.doc(), {
      scopeId,
      level: scope.level || 'course',
      track: scope.track || '',
      course: scope.course || '',
      lesson: scope.lesson || '',
      topic: c.topic || '',
      concept: c.concept || '',
      intuition: c.intuition || '',
      formula: c.formula || '',
      visual: c.visual || null,
      highway: !!c.highway,
      order: i,
      createdAt: FieldValue.serverTimestamp(),
      source: 'ai',
    });
    ops += 1;
  });
  await flush();
  return cards.length;
}

/** Map of cardId -> status label for `userKey` over the given card ids. */
export async function getFlashcardStatuses(userKey, cardIds = []) {
  const out = {};
  if (!userKey || !cardIds.length) return out;
  const col = flashcardStatusCol(userKey);
  // Firestore getAll in chunks; ids are our own doc ids.
  for (let i = 0; i < cardIds.length; i += 300) {
    const chunk = cardIds.slice(i, i + 300).map((id) => col.doc(id));
    const snaps = await db.getAll(...chunk);
    snaps.forEach((s) => { if (s.exists) out[s.id] = s.get('status'); });
  }
  return out;
}

/** Set (or clear, when status is falsy) a user's label for one card. */
export async function setFlashcardStatus(userKey, cardId, status) {
  if (!userKey || !cardId) return;
  const ref = flashcardStatusCol(userKey).doc(cardId);
  const valid = ['mastered', 'learning', 'important'];
  if (!status || !valid.includes(status)) {
    await ref.delete();
  } else {
    await ref.set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
}

/* ----------------------------- Card chat ----------------------------------- */
/*
 * Per-user, per-card tutor chat. The shared `flashcards` docs are never touched;
 * a user's conversation AND their personalized "rewrite in place" of the card
 * (intuition/formula/visual) live privately under
 * `users/{userKey}/cardChats/{cardId}`. On read, packageFlashcards overlays any
 * personalized fields so the user sees their own version of the card.
 */
const cardChatCol = (userKey) =>
  db.collection('users').doc(normKey(userKey)).collection('cardChats');

/** This user's chat + personalized overlay for one card (or null). */
export async function getCardChat(userKey, cardId) {
  if (!userKey || !cardId) return null;
  const doc = await cardChatCol(userKey).doc(cardId).get();
  return doc.exists ? doc.data() : null;
}

/** Merge-write this user's chat thread + personalized card fields for one card. */
export async function saveCardChat(userKey, cardId, { messages, intuition, formula, visual }) {
  if (!userKey || !cardId) return;
  await cardChatCol(userKey).doc(cardId).set(
    {
      messages: Array.isArray(messages) ? messages : [],
      intuition: intuition ?? '',
      formula: formula ?? '',
      visual: visual ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/** Revert this user's card to the shared original (drops chat + overlay). */
export async function resetCardChat(userKey, cardId) {
  if (!userKey || !cardId) return;
  await cardChatCol(userKey).doc(cardId).delete();
}

/**
 * Map cardId -> { intuition, formula, visual, personalized:true } for any of the
 * given cards this user has personalized. Batched getAll, like getFlashcardStatuses.
 */
export async function getCardOverlays(userKey, cardIds = []) {
  const out = {};
  if (!userKey || !cardIds.length) return out;
  const col = cardChatCol(userKey);
  for (let i = 0; i < cardIds.length; i += 300) {
    const chunk = cardIds.slice(i, i + 300).map((id) => col.doc(id));
    const snaps = await db.getAll(...chunk);
    snaps.forEach((s) => {
      if (!s.exists) return;
      const d = s.data();
      // Only counts as an overlay once the user has personalized the intuition.
      if (d && d.intuition) {
        out[s.id] = { intuition: d.intuition, formula: d.formula || '', visual: d.visual || null, personalized: true };
      }
    });
  }
  return out;
}

/* ---------------------------- Scope chat ----------------------------------- */
/* Per-user chat thread for a whole lesson/course scope (AI Support > Chat). */
const scopeChatCol = (userKey) =>
  db.collection('users').doc(normKey(userKey)).collection('scopeChats');

export async function getScopeChat(userKey, scopeId) {
  if (!userKey || !scopeId) return [];
  const doc = await scopeChatCol(userKey).doc(scopeId).get();
  const msgs = doc.exists ? doc.get('messages') : null;
  return Array.isArray(msgs) ? msgs : [];
}

export async function saveScopeChat(userKey, scopeId, messages) {
  if (!userKey || !scopeId) return;
  await scopeChatCol(userKey).doc(scopeId).set(
    { messages: Array.isArray(messages) ? messages : [], updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

/* --------------------------------- Quiz Log -------------------------------- */

/**
 * Append `userKey`'s results to their log AND update their running mastery stats. Mirrors the old
 * sheet (append rows) + its formulas (recompute accuracy / days-since / priority). For the legacy
 * owner this writes the original `topics`/`quizLog`; for others, their subcollections.
 */
export async function logResults(userKey, results) {
  if (!userKey) return 0;
  const now = new Date();
  const legacy = isLegacy(userKey);
  const batch = db.batch();

  // 1. Append each attempt to the user's quizLog.
  const logRef = logCol(userKey);
  for (const r of results) {
    batch.set(logRef.doc(), {
      track: r.track || '',
      course: r.course || '',
      lesson: r.lesson || '',
      topic: r.topic || '',
      question: r.question || '',
      result: r.isCorrect ? 1 : 0,
      reviewFlag: r.reviewFlag ? 1 : 0,
      date: Timestamp.fromDate(now),
    });
  }

  // 2. Aggregate per-topic deltas from this session.
  const deltas = new Map(); // topicDocId -> { meta, correct, total }
  for (const r of results) {
    const id = slug(r.track, r.course, r.lesson, r.topic);
    const cur = deltas.get(id) || { meta: r, correct: 0, total: 0 };
    cur.correct += r.isCorrect ? 1 : 0;
    cur.total += 1;
    deltas.set(id, cur);
  }

  // 3. Read current stats, then update counters + recompute priority.
  for (const [id, delta] of deltas) {
    const ref = statsDoc(userKey, id);
    const snap = await ref.get();
    const prev = snap.exists ? snap.data() : {};
    const correctCount = (prev.correctCount || 0) + delta.correct;
    const totalAttempts = (prev.totalAttempts || 0) + delta.total;
    const stats = { correctCount, totalAttempts, lastAttempted: now };
    if (legacy) {
      // Preserve the catalog fields living on the shared `topics` doc (original behaviour).
      batch.set(
        ref,
        {
          track: prev.track ?? delta.meta.track ?? '',
          course: prev.course ?? delta.meta.course ?? '',
          lesson: prev.lesson ?? delta.meta.lesson ?? '',
          topic: prev.topic ?? delta.meta.topic ?? '',
          questionCount: prev.questionCount ?? 0,
          correctCount,
          totalAttempts,
          lastAttempted: Timestamp.fromDate(now),
          priority: computePriority(stats, now),
        },
        { merge: true },
      );
    } else {
      // A lean per-user stats doc (catalog stays on the shared `topics` doc, overlaid on read).
      batch.set(
        ref,
        {
          topic: delta.meta.topic ?? '',
          correctCount,
          totalAttempts,
          lastAttempted: Timestamp.fromDate(now),
          priority: computePriority(stats, now),
        },
        { merge: true },
      );
    }
  }

  await batch.commit();
  return deltas.size;
}
