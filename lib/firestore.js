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
import {
  DEFAULT_PROGRAM,
  defaultEnrollment,
  normalizeEnrollment,
  resolveScope,
  filterCatalog,
  filterQuestions,
} from './programs.js';

// On Cloud Run, project + credentials come from the runtime automatically.
export const db = new Firestore({
  ignoreUndefinedProperties: true,
});

export const COL = {
  topics: 'topics',
  questions: 'questions',
  quizLog: 'quizLog',
  flashcards: 'flashcards',
  graphLinks: 'graphLinks',
  programs: 'programs',
  transcripts: 'transcripts',
  genJobs: 'genJobs',
  questionFlags: 'questionFlags',
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

/* ------------------------------ Programs ----------------------------------- */
/*
 * A `program` (data_science | digital_marketing | …) sits above the whole
 * hierarchy so several curricula share one engine. See programs.js for the rules;
 * this section is only the IO. Everything here degrades to the original
 * single-curriculum behaviour when no program docs / enrollments exist yet.
 */

/** Every program doc: [{ id, name, defaultCourses[] }]. */
export async function getPrograms() {
  const snap = await db.collection(COL.programs).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** One program doc by id, or null. */
export async function getProgram(id) {
  if (!id) return null;
  const doc = await db.collection(COL.programs).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/** Upsert a program (merge, so a rename never drops defaultCourses). */
export async function saveProgram({ id, name, defaultCourses }) {
  if (!id) throw new Error('program id required');
  await db.collection(COL.programs).doc(id).set(
    {
      name: name || id,
      ...(Array.isArray(defaultCourses) ? { defaultCourses } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

/* A user's enrollment lives beside their usage tally (users/{u}/meta/enrollment)
 * rather than in a top-level collection: it is per-user data, it is read on
 * nearly every request, and this keeps a user's whole footprint under one doc. */
const enrollmentDoc = (userKey) =>
  db.collection('users').doc(normKey(userKey)).collection('meta').doc('enrollment');

/** `userKey`'s enrollment, or the default (all of the default program) when unset. */
export async function getEnrollment(userKey) {
  if (!userKey) return defaultEnrollment();
  const doc = await enrollmentDoc(userKey).get();
  return doc.exists ? normalizeEnrollment(doc.data()) : defaultEnrollment();
}

/** Set `userKey`'s enrollment. Empty `courses` = every course in the program. */
export async function setEnrollment(userKey, { programs, courses }) {
  if (!userKey) return null;
  const enr = normalizeEnrollment({ programs, courses });
  await enrollmentDoc(userKey).set({ ...enr, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return enr;
}

/**
 * The { program, courses } scope a request runs in: the user's enrollment, with
 * `requested` honoured only where allowed (admins anywhere, guests freely, a
 * learner only among their own programs — see resolveScope).
 */
export async function resolveProgramScope(userKey, { requested = '', isAdmin = false } = {}) {
  const enrollment = await getEnrollment(userKey);
  return resolveScope(enrollment, { requested, anyProgram: isAdmin || !userKey });
}

/* ----------------------------- Catalog (topics) ---------------------------- */

/**
 * Full topic catalog for `userKey`, each row carrying THAT user's mastery stats (accuracy/priority
 * are derived downstream). Legacy owner: stats are already on the `topics` docs. Others: the shared
 * catalog with their own stats overlaid (zeros where they haven't practised). Guest (null): zeros.
 *
 * `scope` ({program, courses}) narrows the rows to one curriculum. Omit it to read the whole bank
 * (admin tools, migrations). Rows written before programs existed count as DEFAULT_PROGRAM, so a
 * data-science request returns exactly what it always did.
 */
export async function getCatalog(userKey = null, scope = null) {
  const snap = await db.collection(COL.topics).get();
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const catalog = scope ? filterCatalog(all, scope) : all;
  const now = new Date();
  const freshPriority = computePriority({ correctCount: 0, totalAttempts: 0, lastAttempted: null }, now);
  // Legacy owner: stats are embedded on the catalog docs (original behaviour), but a topic doc
  // only carries a `priority` once it's been attempted. Fill the never-attempted ones with the
  // fresh (high) priority so a just-generated topic isn't invisible to quiz/select and the
  // priority quiz, which both drop rows where priority is null.
  if (isLegacy(userKey)) {
    return catalog.map((t) => ({ ...t, priority: t.priority != null ? t.priority : freshPriority }));
  }

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

/**
 * Persist each topic's within-lesson study order onto its catalog doc.
 * `items` is [{id, order}] (order = 0-based rank inside its lesson). Written
 * with merge so it never disturbs the doc's other fields; chunked into batches.
 * Returns the number of docs written. The display layer sorts topics by this
 * `order`, falling back to natural name for any doc that lacks one.
 */
export async function setTopicOrders(items) {
  let batch = db.batch();
  let ops = 0;
  let n = 0;
  for (const it of items) {
    if (!it?.id || !Number.isFinite(it.order)) continue;
    batch.set(db.collection(COL.topics).doc(it.id), { order: it.order }, { merge: true });
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

/** The catalog shaped as BigQuery rows (mastery snapshot) for `userKey`. */
export async function getTopicsRows(userKey = null, now = new Date(), scope = null) {
  const cat = await getCatalog(userKey, scope);
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

/**
 * All questions for a set of topic names. Firestore `in` caps at 30 values.
 *
 * Pass `scope` to keep one program's bank out of another's: questions are keyed
 * by topic NAME alone, so a name two programs share (e.g. "Attribution") would
 * otherwise mix marketing questions into a data-science quiz. The program filter
 * runs in memory rather than as a second `where`, which keeps this a single-field
 * query and needs no composite index.
 */
export async function getQuestionsForTopics(topicNames, scope = null) {
  const out = [];
  for (let i = 0; i < topicNames.length; i += 30) {
    const chunk = topicNames.slice(i, i + 30);
    if (!chunk.length) continue;
    const snap = await db.collection(COL.questions).where('topic', 'in', chunk).get();
    snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  }
  return scope ? filterQuestions(out, scope) : out;
}

/** Every question doc (for the one-time LaTeX migration); `scope` narrows to one program. */
export async function getAllQuestions(scope = null) {
  const snap = await db.collection(COL.questions).get();
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return scope ? filterQuestions(all, scope) : all;
}

/** One question doc by id (for the per-question "fix format" action). */
export async function getQuestionById(id) {
  const doc = await db.collection(COL.questions).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
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

/** Apply {id, concept?, intuition?, formula?} updates to shared flashcards in
 *  chunked batches (used by the "fix formatting" reformatter). Only the fields
 *  present on each update are written, so a partial patch never blanks the rest.
 *  Returns the number of docs updated. */
export async function bulkUpdateFlashcards(updates) {
  let batch = db.batch();
  let ops = 0;
  let n = 0;
  for (const u of updates) {
    const patch = {};
    if (typeof u.concept === 'string') patch.concept = u.concept;
    if (typeof u.intuition === 'string') patch.intuition = u.intuition;
    if (typeof u.formula === 'string') patch.formula = u.formula;
    if (!u.id || !Object.keys(patch).length) continue;
    batch.update(db.collection(COL.flashcards).doc(u.id), patch);
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

// Returns the new doc id so callers can hand the banked question back to the
// client already carrying its id (needed by the admin "Fix format" button).
//
// `program` tags which curriculum the question belongs to — callers should pass
// the scope they generated under, since a topic name alone can't say (see
// getQuestionsForTopics). `batchTag` marks a bulk generation run so one bad batch
// can be deleted wholesale, and `difficulty` (core|balanced|challenge) feeds the
// difficulty selector. The last two are dropped when undefined
// (ignoreUndefinedProperties), so existing callers are unaffected.
export async function addQuestion({
  topic, question, options, answer, source, program, batchTag, difficulty,
}) {
  const ref = await db.collection(COL.questions).add({
    topic,
    question,
    options,
    answer,
    program: program || DEFAULT_PROGRAM,
    batchTag,
    difficulty,
    createdAt: FieldValue.serverTimestamp(),
    generated: true,
    source,
  });
  return ref.id;
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
 * This user's attempts on ONE topic (for the per-flashcard stats). Dedupes by
 * question text keeping the LATEST result, so "attempted questions" reflects
 * where the learner currently stands. Returns counts + the per-question list.
 */
export async function getTopicAttempts(userKey = null, topic = '') {
  const empty = { attempts: 0, correct: 0, accuracy: null, questions: [] };
  if (!userKey || !topic) return empty;
  const snap = await logCol(userKey).where('topic', '==', topic).get();
  const byQuestion = new Map(); // question -> { question, result, date }
  snap.forEach((d) => {
    const x = d.data();
    const q = String(x.question || '').trim();
    if (!q) return;
    const date = x.date?.toDate ? x.date.toDate() : null;
    const prev = byQuestion.get(q);
    if (!prev || (date && prev.date && date > prev.date) || (date && !prev.date)) {
      byQuestion.set(q, { question: q, result: x.result === 1 ? 1 : 0, date });
    }
  });
  const questions = [...byQuestion.values()].sort((a, b) => (b.date || 0) - (a.date || 0));
  const attempts = questions.length;
  const correct = questions.reduce((s, q) => s + q.result, 0);
  return {
    attempts,
    correct,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : null,
    questions: questions.map((q) => ({ question: q.question, result: q.result, date: q.date ? q.date.toISOString() : null })),
  };
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

/* --------------------------- Track merge migration ------------------------- */
/*
 * One-time, idempotent merge of the two math tracks into a single "Mathematics"
 * track: rename `Math Foundations` -> `Mathematics` and move every
 * `Mathematics for Machine Learning` course under `Mathematics` (course names
 * unchanged). Questions are keyed only by `topic`, so they need no change — only
 * the docs that embed the track name:
 *   - `topics` (legacy owner's catalog + embedded stats; id = slug(track,course,lesson,topic))
 *   - each user's `users/{u}/topicStats` (lean stats, id = same slug)
 *   - `flashcards` (carry track + a derived scopeId)
 * Historical `quizLog` rows keep their old denormalized track (harmless — charts
 * read the live catalog). Old scope-chat threads are left as harmless orphans.
 */
const MATH_OLD_TRACKS = new Set(['Math Foundations', 'Mathematics for Machine Learning']);
const MATH_NEW_TRACK = 'Mathematics';

/** Merge two docs' stats when a rename collides onto an existing target id. */
function mergeStats(a = {}, b = {}, now = new Date()) {
  const correctCount = (a.correctCount || 0) + (b.correctCount || 0);
  const totalAttempts = (a.totalAttempts || 0) + (b.totalAttempts || 0);
  const la = a.lastAttempted?.toDate ? a.lastAttempted.toDate() : a.lastAttempted || null;
  const lb = b.lastAttempted?.toDate ? b.lastAttempted.toDate() : b.lastAttempted || null;
  const last = la && lb ? (la > lb ? la : lb) : la || lb;
  const stats = { correctCount, totalAttempts, lastAttempted: last };
  return {
    correctCount,
    totalAttempts,
    lastAttempted: last ? Timestamp.fromDate(new Date(last)) : FieldValue.delete(),
    priority: computePriority(stats, now),
  };
}

export async function mergeIntoMathematics(now = new Date()) {
  const report = { topicsMoved: 0, statsMoved: 0, decksMoved: 0, usersScanned: 0 };

  // 1. Read the shared `topics` catalog and build the old-id -> new-id map (also
  //    the vehicle that re-keys the legacy owner's embedded stats).
  const topicsSnap = await db.collection(COL.topics).get();
  const idMap = new Map(); // oldId -> newId (only for docs that actually move)
  const moves = []; // { oldId, newId, data }
  for (const d of topicsSnap.docs) {
    const data = d.data();
    if (!MATH_OLD_TRACKS.has(data.track)) continue;
    const newId = slug(MATH_NEW_TRACK, data.course || '', data.lesson || '', data.topic || '');
    idMap.set(d.id, newId);
    if (newId !== d.id) moves.push({ oldId: d.id, newId, data });
  }

  // 2. Move the `topics` docs (merge stats on collision), then delete the olds.
  let batch = db.batch();
  let ops = 0;
  const flush = async () => { if (ops) { await batch.commit(); batch = db.batch(); ops = 0; } };
  const col = db.collection(COL.topics);
  for (const m of moves) {
    const targetRef = col.doc(m.newId);
    const target = await targetRef.get();
    const base = { ...m.data, track: MATH_NEW_TRACK };
    if (target.exists) {
      batch.set(targetRef, { ...base, ...mergeStats(target.data(), m.data, now) }, { merge: true });
    } else {
      batch.set(targetRef, base, { merge: true });
    }
    batch.delete(col.doc(m.oldId));
    report.topicsMoved += 1;
    if ((ops += 2) >= 440) await flush();
  }
  await flush();

  // 3. Re-key each non-legacy user's topicStats using the same old->new id map.
  const userRefs = await db.collection('users').listDocuments();
  for (const uref of userRefs) {
    report.usersScanned += 1;
    const statsSnap = await uref.collection('topicStats').get();
    for (const s of statsSnap.docs) {
      const newId = idMap.get(s.id);
      if (!newId || newId === s.id) continue;
      const targetRef = uref.collection('topicStats').doc(newId);
      const target = await targetRef.get();
      const data = s.data();
      if (target.exists) {
        batch.set(targetRef, { ...target.data(), ...mergeStats(target.data(), data, now) }, { merge: true });
      } else {
        batch.set(targetRef, { ...data, ...mergeStats({}, data, now) }, { merge: true });
      }
      batch.delete(s.ref);
      report.statsMoved += 1;
      if ((ops += 2) >= 440) await flush();
    }
  }
  await flush();

  // 4. Re-track flashcard decks (update track + recompute scopeId).
  const fcSnap = await db.collection(COL.flashcards).get();
  for (const d of fcSnap.docs) {
    const data = d.data();
    if (!MATH_OLD_TRACKS.has(data.track)) continue;
    const scopeId = flashcardScopeId({
      level: data.level, track: MATH_NEW_TRACK, course: data.course, lesson: data.lesson, topic: data.topic,
    });
    batch.update(d.ref, { track: MATH_NEW_TRACK, scopeId });
    report.decksMoved += 1;
    if (++ops >= 440) await flush();
  }
  await flush();

  return report;
}

/* -------------------------------- Curriculum -------------------------------- */
/*
 * Admin-authored catalog rows. The catalog used to arrive only by CSV import
 * (lib/migrate.js); the Academy needs it editable in place, because Ian writes
 * the digital-marketing curriculum by hand. Same doc shape and the same
 * slug(track,course,lesson,topic) id as the imported rows, so everything
 * downstream (stats, questions, the graph) treats them identically.
 */

/** Upsert one catalog row; returns its id. Idempotent on the slug. */
export async function upsertTopic({ program, track, course, lesson, topic }) {
  const clean = (v) => String(v || '').trim();
  const [tr, co, le, to] = [clean(track), clean(course), clean(lesson), clean(topic)];
  if (!tr || !co || !le || !to) throw new Error('track, course, lesson and topic are all required');
  const id = slug(tr, co, le, to);
  const ref = db.collection(COL.topics).doc(id);
  const existing = await ref.get();
  await ref.set(
    {
      track: tr, course: co, lesson: le, topic: to,
      program: program || DEFAULT_PROGRAM,
      // Never reset a live count/stats on re-run — merge only what identifies the row.
      ...(existing.exists ? {} : { questionCount: 0, createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  return id;
}

/** Delete a catalog row (does NOT touch questions — they're keyed by topic name). */
export async function deleteTopic(id) {
  if (!id) return false;
  await db.collection(COL.topics).doc(id).delete();
  return true;
}

/** Bulk-upsert catalog rows in batches. Returns {created, updated}. */
export async function upsertTopics(rows) {
  const report = { created: 0, updated: 0 };
  let batch = db.batch();
  let ops = 0;
  const flush = async () => { if (ops) { await batch.commit(); batch = db.batch(); ops = 0; } };
  for (const r of rows) {
    const clean = (v) => String(v || '').trim();
    const [tr, co, le, to] = [clean(r.track), clean(r.course), clean(r.lesson), clean(r.topic)];
    if (!tr || !co || !le || !to) continue;
    const ref = db.collection(COL.topics).doc(slug(tr, co, le, to));
    const existing = await ref.get();
    batch.set(
      ref,
      {
        track: tr, course: co, lesson: le, topic: to,
        program: r.program || DEFAULT_PROGRAM,
        ...(existing.exists ? {} : { questionCount: 0, createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );
    report[existing.exists ? 'updated' : 'created'] += 1;
    if (++ops >= 450) await flush();
  }
  await flush();
  return report;
}

/** Bump a topic's questionCount by `n` (keeps the catalog's counter honest). */
export async function bumpQuestionCount(topicId, n) {
  if (!topicId || !n) return;
  await db.collection(COL.topics).doc(topicId).set(
    { questionCount: FieldValue.increment(n) }, { merge: true },
  );
}

/* -------------------------------- Transcripts ------------------------------- */
/*
 * Source material for generation: a pasted/uploaded document, or a video
 * transcript imported from Atrium's Watcher. Stored whole (Firestore's 1 MiB doc
 * cap is far above a typical transcript; the caller trims). Attached to a scope
 * — usually a lesson — and read back by the generation job.
 */

export async function addTranscript({ program, track, course, lesson, topic, title, text, source, watcherRef }) {
  const body = String(text || '').trim();
  if (!body) throw new Error('Transcript text is empty');
  const ref = await db.collection(COL.transcripts).add({
    program: program || DEFAULT_PROGRAM,
    track: track || '', course: course || '', lesson: lesson || '', topic: topic || '',
    title: title || 'Untitled', text: body, source: source || 'paste',
    watcherRef: watcherRef || null,
    chars: body.length,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

/** Transcripts in a scope. Filtered in memory so no composite index is needed. */
export async function getTranscripts({ program, course, lesson, topic } = {}) {
  const snap = await db.collection(COL.transcripts).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((t) => (!program || (t.program || DEFAULT_PROGRAM) === program)
      && (!course || t.course === course)
      && (!lesson || t.lesson === lesson)
      && (!topic || t.topic === topic));
}

/** One transcript with its full text. */
export async function getTranscriptById(id) {
  const doc = await db.collection(COL.transcripts).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function deleteTranscript(id) {
  if (!id) return false;
  await db.collection(COL.transcripts).doc(id).delete();
  return true;
}

/* ----------------------------- Generation jobs ------------------------------ */
/*
 * A long bulk generation (~1000 questions/course) can't run as one request:
 * Cloud Run throttles CPU between requests, so a fire-and-forget loop dies
 * silently. The job doc IS the state, and the admin UI drives it forward one
 * step at a time (see /api/admin/genjobs/:id/step) — which also survives a
 * restart and needs no infra change.
 */

export async function createGenJob({ program, scope, targetPerTopic, provider, model, topics, batchTag, instructions, transcriptIds }) {
  const ref = await db.collection(COL.genJobs).doc();
  const job = {
    program: program || DEFAULT_PROGRAM,
    scope: scope || {},
    targetPerTopic: targetPerTopic || 5,
    provider: provider || 'deepseek',
    model: model || null,
    instructions: String(instructions || '').slice(0, 2000),
    // Optional: exact transcripts to ground on (else the lesson's attached ones).
    transcriptIds: Array.isArray(transcriptIds) ? transcriptIds.filter(Boolean).slice(0, 20) : [],
    batchTag: batchTag || `gen-${ref.id}`,
    status: 'queued',
    queue: topics || [],           // topic names still to do
    progress: { topicsDone: 0, topicsTotal: (topics || []).length, questionsWritten: 0, costUsd: 0 },
    errors: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(job);
  return { id: ref.id, ...job };
}

export async function getGenJob(id) {
  const doc = await db.collection(COL.genJobs).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function listGenJobs(program = null) {
  const snap = await db.collection(COL.genJobs).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((j) => !program || j.program === program)
    .map(({ queue, ...rest }) => ({ ...rest, remaining: (queue || []).length }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

export async function updateGenJob(id, patch) {
  await db.collection(COL.genJobs).doc(id).set(
    { ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true },
  );
}

/* ------------------------------ Question flags ------------------------------ */
/*
 * The safety valve for auto-published generation: any learner can flag a bad
 * question, and an admin can pull a whole generation batch by its tag.
 */

export async function flagQuestion({ questionId, email, reason, topic }) {
  if (!questionId) throw new Error('questionId is required');
  const ref = await db.collection(COL.questionFlags).add({
    questionId, email: normKey(email), reason: String(reason || '').slice(0, 500),
    topic: topic || '', resolved: false, createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function listQuestionFlags(includeResolved = false) {
  const snap = await db.collection(COL.questionFlags).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((f) => includeResolved || !f.resolved)
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

export async function resolveQuestionFlag(id, { deleteQuestion = false } = {}) {
  const ref = db.collection(COL.questionFlags).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  if (deleteQuestion) {
    const qid = doc.get('questionId');
    if (qid) await db.collection(COL.questions).doc(qid).delete().catch(() => {});
  }
  await ref.set({ resolved: true, resolvedAt: FieldValue.serverTimestamp() }, { merge: true });
  return true;
}

/**
 * Delete every question from one generation batch and correct the affected
 * topics' counts — the "that batch was bad, pull it" button. Returns how many
 * went. Batched at 450 like the other migrations.
 */
export async function deleteQuestionBatch(batchTag) {
  if (!batchTag) throw new Error('batchTag is required');
  const snap = await db.collection(COL.questions).where('batchTag', '==', batchTag).get();
  const byTopic = new Map(); // topic name -> count removed
  let batch = db.batch();
  let ops = 0;
  const flush = async () => { if (ops) { await batch.commit(); batch = db.batch(); ops = 0; } };
  for (const d of snap.docs) {
    const t = d.get('topic');
    if (t) byTopic.set(t, (byTopic.get(t) || 0) + 1);
    batch.delete(d.ref);
    if (++ops >= 450) await flush();
  }
  await flush();

  // Put the catalog counters back. Topic names alone can't identify a row, so
  // resolve through the program's catalog (see programs.js on name collisions).
  const cat = await db.collection(COL.topics).get();
  for (const d of cat.docs) {
    const n = byTopic.get(d.get('topic'));
    if (!n) continue;
    batch.set(d.ref, { questionCount: FieldValue.increment(-n) }, { merge: true });
    if (++ops >= 450) await flush();
  }
  await flush();
  return { deleted: snap.size, topicsTouched: byTopic.size };
}

/* ------------------------ Program backfill migration ----------------------- */
/*
 * One-time, idempotent tagging of the pre-program world. Every `topics` and
 * `questions` doc written before the program dimension existed belongs to
 * DEFAULT_PROGRAM (data science), and the two starting programs get their
 * registry docs.
 *
 * Idempotent because it only writes docs that are MISSING `program` — a second
 * run tags nothing and reports zeros. Safe to run before the code that reads the
 * field ships, since programOf() already treats an absent field as
 * DEFAULT_PROGRAM: the backfill makes explicit what was already implied, so the
 * catalog a data-science user sees is identical before, during, and after.
 */
const STARTING_PROGRAMS = [
  { id: 'data_science', name: 'Data Science' },
  { id: 'digital_marketing', name: 'Digital Marketing' },
];

export async function backfillPrograms() {
  const report = { programsCreated: 0, topicsTagged: 0, questionsTagged: 0 };

  // 1. Registry docs — create only when absent so a later rename isn't undone.
  for (const p of STARTING_PROGRAMS) {
    const ref = db.collection(COL.programs).doc(p.id);
    if (!(await ref.get()).exists) {
      await ref.set({ name: p.name, defaultCourses: [], createdAt: FieldValue.serverTimestamp() });
      report.programsCreated += 1;
    }
  }

  // 2. Tag every untagged catalog + question doc as the default program.
  let batch = db.batch();
  let ops = 0;
  const flush = async () => { if (ops) { await batch.commit(); batch = db.batch(); ops = 0; } };
  for (const [col, key] of [[COL.topics, 'topicsTagged'], [COL.questions, 'questionsTagged']]) {
    const snap = await db.collection(col).get();
    for (const d of snap.docs) {
      if (d.get('program')) continue; // already tagged — the idempotency guard
      batch.update(d.ref, { program: DEFAULT_PROGRAM });
      report[key] += 1;
      if (++ops >= 450) await flush();
    }
    await flush();
  }
  return report;
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

/** Every shared flashcard with its doc id + scope fields — for building a
 *  cross-scope deck (e.g. the Mastery deck that mixes many topics' cards). */
export async function getAllFlashcardsWithId() {
  const snap = await db.collection(COL.flashcards).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Every shared flashcard deck (for the local app's Sync to pull good cards). */
export async function getAllFlashcards() {
  const snap = await db.collection(COL.flashcards).get();
  return snap.docs.map((d) => {
    const c = d.data();
    return {
      scopeId: c.scopeId, level: c.level || 'course',
      track: c.track || '', course: c.course || '', lesson: c.lesson || '', topic: c.topic || '',
      concept: c.concept || '', intuition: c.intuition || '', formula: c.formula || '',
      visual: c.visual || null, highway: !!c.highway, order: c.order ?? 0,
    };
  });
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

/* ------------------------------ Graph links -------------------------------- */
/*
 * Knowledge-graph prerequisite links, SHARED across users (like the question
 * bank). One doc per topic, keyed by the topic's own catalog doc id (the stable
 * slug(track,course,lesson,topic)), holding that topic's DIRECT prerequisites:
 *   graphLinks/{topicId} = { topic, prereqs: [{id, why}], source, updatedAt }
 * A doc with an EMPTY prereqs array still counts as "linked" (the AI decided the
 * topic has no prerequisites), which is what coverage tracking needs. The
 * curriculum "flow" edges are NOT stored — lib/graph.js derives them from the
 * catalog on every read.
 */

/** Every stored link doc: [{id, topic, prereqs:[{id, why}]}]. */
export async function getGraphLinks() {
  const snap = await db.collection(COL.graphLinks).get();
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      topic: x.topic || '',
      prereqs: Array.isArray(x.prereqs)
        ? x.prereqs.filter((p) => p && p.id).map((p) => ({ id: p.id, why: p.why || '' }))
        : [],
    };
  });
}

/** Upsert link docs [{id, topic, prereqs}] in chunked batches. Returns count. */
export async function saveGraphLinks(items) {
  let batch = db.batch();
  let ops = 0;
  let n = 0;
  for (const it of items) {
    if (!it?.id) continue;
    batch.set(
      db.collection(COL.graphLinks).doc(it.id),
      {
        topic: it.topic || '',
        prereqs: Array.isArray(it.prereqs)
          ? it.prereqs.map((p) => ({ id: p.id, why: p.why || '' }))
          : [],
        source: 'ai',
        updatedAt: FieldValue.serverTimestamp(),
      },
    );
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

/* --------------------------- Global assistant chat ------------------------- */
/* The floating assistant now keeps MULTIPLE saved conversations per user, one
 * doc each under users/{user}/assistantChats. Context is passed per message, so
 * conversations aren't scoped to a lesson. Each doc: { messages[], title,
 * createdAt, updatedAt }. The old single running thread (scopeChats/assistant)
 * is migrated in on first read so no history is lost. */
const ASSISTANT_ID = 'assistant';
const ASSISTANT_CAP = 40; // keep the last N messages per conversation

const assistantChatCol = (userKey) =>
  db.collection('users').doc(normKey(userKey)).collection('assistantChats');

/** Millis from a Firestore Timestamp (or 0 if not set yet). */
const tsMillis = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : (typeof t === 'number' ? t : 0));

/** A short conversation title derived from its first user message. */
function chatTitle(messages) {
  const first = (messages || []).find((m) => m && m.role === 'user' && m.text);
  const t = first ? String(first.text).trim().replace(/\s+/g, ' ') : '';
  return t.slice(0, 60) || 'New conversation';
}

/**
 * One-time lazy migration: if a user has no conversations yet but still has the
 * legacy single thread, import it as their first conversation and drop the
 * legacy doc (so deleting all conversations later can't resurrect it).
 */
async function migrateLegacyAssistantChat(userKey) {
  const col = assistantChatCol(userKey);
  const any = await col.limit(1).get();
  if (!any.empty) return;
  const legacy = await getScopeChat(userKey, ASSISTANT_ID);
  if (!legacy.length) return;
  const msgs = legacy.slice(-ASSISTANT_CAP);
  await col.doc().set({
    messages: msgs,
    title: chatTitle(msgs),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await scopeChatCol(userKey).doc(ASSISTANT_ID).delete().catch(() => {});
}

/** List a user's conversations (metadata only), newest first. */
export async function listAssistantChats(userKey) {
  if (!userKey) return [];
  await migrateLegacyAssistantChat(userKey);
  const snap = await assistantChatCol(userKey).orderBy('updatedAt', 'desc').get();
  return snap.docs.map((d) => {
    const m = d.get('messages');
    return {
      id: d.id,
      title: d.get('title') || 'Conversation',
      count: Array.isArray(m) ? m.length : 0,
      updatedAt: tsMillis(d.get('updatedAt')),
    };
  });
}

/** Load one conversation's messages, or null if it doesn't exist. */
export async function getAssistantChat(userKey, id) {
  if (!userKey || !id) return null;
  const doc = await assistantChatCol(userKey).doc(id).get();
  if (!doc.exists) return null;
  const m = doc.get('messages');
  return { id: doc.id, title: doc.get('title') || 'Conversation', messages: Array.isArray(m) ? m : [] };
}

/**
 * Create (id omitted/blank) or update a conversation. Auto-titles from the first
 * user message and caps history. Returns { id, title }.
 */
export async function saveAssistantChat(userKey, id, messages) {
  if (!userKey) return null;
  const msgs = (Array.isArray(messages) ? messages : []).slice(-ASSISTANT_CAP);
  const title = chatTitle(msgs);
  const col = assistantChatCol(userKey);
  const isNew = !id;
  const ref = isNew ? col.doc() : col.doc(id);
  await ref.set(
    {
      messages: msgs,
      title,
      updatedAt: FieldValue.serverTimestamp(),
      ...(isNew ? { createdAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true },
  );
  return { id: ref.id, title };
}

/** Delete one conversation. */
export async function deleteAssistantChat(userKey, id) {
  if (!userKey || !id) return;
  await assistantChatCol(userKey).doc(id).delete();
}

/* ------------------------------- AI usage --------------------------------- */
/* Persistent per-user token/cost tally for the on-screen cost calculator. One
 * doc per user accumulates lifetime totals + a per-model breakdown. */
const usageDoc = (userKey) => db.collection('users').doc(normKey(userKey)).collection('meta').doc('usage');

export async function getUsage(userKey) {
  const zero = { inputTokens: 0, outputTokens: 0, costUsd: 0, calls: 0, byModel: {} };
  if (!userKey) return zero;
  const doc = await usageDoc(userKey).get();
  return doc.exists ? { ...zero, ...doc.data() } : zero;
}

/** Add a request's usage delta (tokens/cost, optionally per-model) to the user's tally. */
export async function addUsage(userKey, delta = {}) {
  if (!userKey) return;
  const inc = FieldValue.increment;
  // Build a NESTED object (not dotted keys): model ids like "gemini-2.5-flash"
  // contain dots, and set({merge:true}) treats dotted keys as literal names.
  const byModel = {};
  for (const [model, m] of Object.entries(delta.byModel || {})) {
    byModel[model] = {
      inputTokens: inc(m.inputTokens || 0),
      outputTokens: inc(m.outputTokens || 0),
      costUsd: inc(m.costUsd || 0),
      calls: inc(m.calls || 0),
    };
  }
  await usageDoc(userKey).set(
    {
      inputTokens: inc(delta.inputTokens || 0),
      outputTokens: inc(delta.outputTokens || 0),
      costUsd: inc(delta.costUsd || 0),
      calls: inc(delta.calls || 1),
      byModel,
      updatedAt: FieldValue.serverTimestamp(),
    },
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
