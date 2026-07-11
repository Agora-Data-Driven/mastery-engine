/**
 * Knowledge graph over the topic catalog.
 *
 * Nodes are TOPICS (sub-lessons) — the stable, quiz-logged unit of mastery whose
 * doc id (slug(track,course,lesson,topic)) never changes. Flashcards hang OFF a
 * node (they're regenerated wholesale, so their ids can't anchor edges).
 *
 * Two edge kinds:
 *   flow    — the curriculum spine, computed here for free on every request:
 *             topic -> next topic within a lesson, last topic -> first topic of
 *             the next lesson, last lesson -> first lesson of the next course
 *             (courses follow COURSE_ORDER). Always up to date with the catalog.
 *   prereq  — semantic "you need X to understand Y" links (often cross-course /
 *             cross-track: Limits -> Derivatives -> Gradient Descent). These are
 *             AI-generated once per topic and persisted in `graphLinks`
 *             (lib/firestore.js); this module only consumes them.
 *
 * The same graph feeds the learning algorithm: computeInsights() derives
 * "frontier" topics (untouched but every prerequisite is strong — the natural
 * next thing to learn) and "keystone" gaps (weak/untouched topics that block the
 * most downstream concepts), and prereqContext() gives question generation the
 * learner's standing on a topic's prerequisites.
 */
import { deriveStats } from './priority.js';

// Pedagogical course order within a track (foundations first). Course names are
// globally unique across tracks. KEEP IN SYNC with COURSE_ORDER in public/app.js
// (the progress tree uses the same list for display order).
export const COURSE_ORDER = [
  // Mathematics — build up the foundations, then the applied "for ML" courses last.
  'Trigonometry',
  'College Algebra',
  'Precalculus',
  'Calculus',
  'Statistics and Probability',
  'Linear Algebra for ML',
  'Calculus for ML',
  'Prob & Stats for ML',
  // Programming Foundations — beginner to advanced.
  'Python Syntax & Logic Foundations',
  'Python Data Types',
  'Efficient Iteration & Memory Optimization',
  'Object-Oriented Programming (OOP) in Python',
  'Modularity, Packages & Robust Code',
  'Data Structures and Algorithms',
];
const COURSE_RANK = new Map(COURSE_ORDER.map((name, i) => [name, i]));

const byNatural = (a, b) =>
  String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });

function byCourseName(a, b) {
  const ra = COURSE_RANK.has(a) ? COURSE_RANK.get(a) : Infinity;
  const rb = COURSE_RANK.has(b) ? COURSE_RANK.get(b) : Infinity;
  if (ra !== rb) return ra - rb;
  return byNatural(a, b);
}

/** A topic row is "strong" once practised at >= this accuracy (matches the
 *  difficulty ramp's "still shaky below 70" line in gemini.js). */
const STRONG_ACC = 70;
const WEAK_ACC = 60;

const toDate = (v) => (v?.toDate ? v.toDate() : v || null);

/**
 * Shape one catalog row into a graph node the frontend can paint directly.
 * `now` keeps priority/daysSince consistent across the batch.
 */
export function toNode(row, now = new Date()) {
  const attempts = row.totalAttempts || 0;
  const correct = row.correctCount || 0;
  const d = deriveStats(
    { correctCount: correct, totalAttempts: attempts, lastAttempted: toDate(row.lastAttempted) },
    now,
  );
  return {
    id: row.id,
    topic: row.topic || '',
    track: row.track || 'Unknown Track',
    course: row.course || 'Unknown Course',
    lesson: row.lesson || 'Unknown Lesson',
    questionCount: row.questionCount || 0,
    attempts,
    correct,
    accuracy: attempts ? d.accuracy : null,
    priority: d.priority,
    lastAttempted: toDate(row.lastAttempted)?.toISOString?.() || null,
  };
}

/**
 * The curriculum spine: [{from, to, kind:'flow'}] chaining every track's topics
 * in study order (topics within a lesson, lessons within a course, courses by
 * COURSE_ORDER). Derived from the catalog on demand — nothing to store, so it
 * can never go stale when topics are added or re-keyed.
 */
export function buildFlowEdges(catalog) {
  // track -> course -> lesson -> [rows]
  const tracks = new Map();
  for (const r of catalog) {
    if (!r.topic) continue;
    const t = tracks.get(r.track) || new Map();
    const c = t.get(r.course) || new Map();
    const l = c.get(r.lesson) || [];
    l.push(r);
    c.set(r.lesson, l);
    t.set(r.course, c);
    tracks.set(r.track, t);
  }

  const edges = [];
  const link = (a, b) => { if (a && b && a.id !== b.id) edges.push({ from: a.id, to: b.id, kind: 'flow' }); };

  for (const courses of tracks.values()) {
    const courseNames = [...courses.keys()].sort(byCourseName);
    let prevCourseTail = null;
    for (const cName of courseNames) {
      const lessons = courses.get(cName);
      const lessonNames = [...lessons.keys()].sort(byNatural);
      let prevLessonTail = null;
      let courseHeadLinked = false;
      for (const lName of lessonNames) {
        const rows = lessons.get(lName).sort((a, b) => byNatural(a.topic, b.topic));
        for (let i = 1; i < rows.length; i++) link(rows[i - 1], rows[i]);
        if (prevLessonTail) link(prevLessonTail, rows[0]);
        if (!courseHeadLinked && prevCourseTail) { link(prevCourseTail, rows[0]); courseHeadLinked = true; }
        prevLessonTail = rows[rows.length - 1];
      }
      if (prevLessonTail) prevCourseTail = prevLessonTail;
    }
  }
  return edges;
}

/**
 * Prereq edges [{from, to, kind:'prereq', why}] from the stored graphLinks docs
 * ({id, prereqs:[{id, why}]}), keeping only edges whose BOTH ends exist in the
 * current catalog (stale links from renamed topics just drop out).
 */
export function buildPrereqEdges(links, catalog) {
  const known = new Set(catalog.map((r) => r.id));
  const edges = [];
  for (const doc of links) {
    if (!known.has(doc.id)) continue;
    for (const p of doc.prereqs || []) {
      if (!p || !known.has(p.id) || p.id === doc.id) continue;
      edges.push({ from: p.id, to: doc.id, kind: 'prereq', why: p.why || '' });
    }
  }
  return edges;
}

/** node id -> array of prerequisite node ids (from prereq edges). */
function prereqIndex(prereqEdges) {
  const idx = new Map();
  for (const e of prereqEdges) {
    if (!idx.has(e.to)) idx.set(e.to, []);
    idx.get(e.to).push(e.from);
  }
  return idx;
}

/** node id -> array of dependent node ids (edges pointing OUT of a node). */
function dependentIndex(prereqEdges) {
  const idx = new Map();
  for (const e of prereqEdges) {
    if (!idx.has(e.from)) idx.set(e.from, []);
    idx.get(e.from).push(e.to);
  }
  return idx;
}

/** How many distinct topics transitively depend on `id` (BFS, cycle-safe). */
function countDescendants(id, depIdx) {
  const seen = new Set([id]);
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift();
    for (const next of depIdx.get(cur) || []) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return seen.size - 1;
}

const isStrong = (n) => n.attempts > 0 && (n.accuracy ?? 0) >= STRONG_ACC;
const isWeak = (n) => n.attempts > 0 && (n.accuracy ?? 0) < WEAK_ACC;

/**
 * Deterministic weakness/opportunity signals derived from nodes + prereq edges.
 *
 *   frontier  — "ready to unlock": never-attempted topics whose EVERY stored
 *               prerequisite is strong (and at least one is). The graph says the
 *               learner has done the groundwork; these are the highest-leverage
 *               new topics to start.
 *   keystones — "weak links": topics that are weak (practised but < 60%) or
 *               untouched, ranked by how many downstream topics they block.
 *               Fixing the top of this list unblocks the most of the map.
 *
 * Both lists carry enough context to render AND to prompt an LLM with.
 */
export function computeInsights(nodes, prereqEdges, { limit = 12 } = {}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pIdx = prereqIndex(prereqEdges);
  const dIdx = dependentIndex(prereqEdges);

  const frontier = [];
  for (const n of nodes) {
    if (n.attempts > 0) continue;
    const prereqs = (pIdx.get(n.id) || []).map((id) => byId.get(id)).filter(Boolean);
    if (!prereqs.length || !prereqs.every(isStrong)) continue;
    frontier.push({
      id: n.id,
      topic: n.topic,
      track: n.track,
      course: n.course,
      readyBecause: prereqs.map((p) => `${p.topic} (${p.accuracy}%)`),
    });
  }
  frontier.sort((a, b) => b.readyBecause.length - a.readyBecause.length);

  const keystones = [];
  for (const n of nodes) {
    const untouched = n.attempts === 0;
    if (!untouched && !isWeak(n)) continue;
    const blocked = countDescendants(n.id, dIdx);
    if (!blocked) continue;
    keystones.push({
      id: n.id,
      topic: n.topic,
      track: n.track,
      course: n.course,
      accuracy: n.accuracy,
      attempts: n.attempts,
      blocked,
      state: untouched ? 'untouched' : 'weak',
    });
  }
  keystones.sort((a, b) => b.blocked - a.blocked || (a.accuracy ?? -1) - (b.accuracy ?? -1));

  return {
    frontier: frontier.slice(0, limit),
    keystones: keystones.slice(0, limit),
  };
}

/**
 * The learner's standing on ONE topic's prerequisites, for question-generation
 * prompts: [{topic, accuracy, attempts, why}]. `topicName` is matched against
 * the catalog (the generators are keyed by topic name, not doc id). Returns []
 * when the topic has no stored prereqs — callers just omit the prompt block.
 */
export function prereqContext(topicName, catalog, links, now = new Date()) {
  const row = catalog.find((r) => r.topic === topicName);
  if (!row) return [];
  const doc = links.find((l) => l.id === row.id);
  if (!doc || !doc.prereqs?.length) return [];
  const byId = new Map(catalog.map((r) => [r.id, r]));
  const out = [];
  for (const p of doc.prereqs) {
    const pr = byId.get(p.id);
    if (!pr) continue;
    const n = toNode(pr, now);
    out.push({ topic: n.topic, accuracy: n.accuracy, attempts: n.attempts, why: p.why || '' });
  }
  return out;
}
