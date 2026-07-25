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

// Order two topic rows within a lesson: stored pedagogical `order` first
// (foundational -> advanced), then natural topic name. Rows without a numeric
// order (not yet sequenced) trail the ordered ones. Mirrors the UI's sort so the
// map's curriculum spine follows the same study sequence learners see.
const byTopicOrder = (a, b) => {
  const oa = Number.isFinite(a.order) ? a.order : Infinity;
  const ob = Number.isFinite(b.order) ? b.order : Infinity;
  if (oa !== ob) return oa - ob;
  return byNatural(a.topic, b.topic);
};

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
        const rows = lessons.get(lName).sort(byTopicOrder);
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
 * Prereq edges [{from, to, kind:'prereq', why, w}] from the stored graphLinks docs
 * ({id, prereqs:[{id, why, weight}]}), keeping only edges whose BOTH ends exist in
 * the current catalog (stale links from renamed topics just drop out).
 *
 * `w` is the prerequisite's importance (1 helpful .. 3 critical), authored by the
 * offline graph build. Old edges have no stored weight; they default to
 * PREREQ_WEIGHT_DEFAULT so readiness/warm-up ranking still works uniformly until a
 * refresh re-links with weights.
 */
export const PREREQ_WEIGHT_DEFAULT = 2;
export function buildPrereqEdges(links, catalog) {
  const known = new Set(catalog.map((r) => r.id));
  const edges = [];
  for (const doc of links) {
    if (!known.has(doc.id)) continue;
    for (const p of doc.prereqs || []) {
      if (!p || !known.has(p.id) || p.id === doc.id) continue;
      const w = Number.isFinite(p.weight) ? Math.min(3, Math.max(1, p.weight)) : PREREQ_WEIGHT_DEFAULT;
      edges.push({ from: p.id, to: doc.id, kind: 'prereq', why: p.why || '', w });
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

/* ============================ Warm-up / readiness ==========================
 * Deterministic, LLM-free at runtime. Given the topic(s) a learner is about to
 * LEARN, walk the prerequisite graph UPSTREAM (mirror of countDescendants, which
 * walks downstream), score how ready they are from their existing mastery stats,
 * and pick the prerequisites to warm up on. The graph itself is authored offline;
 * everything here is arithmetic over nodes + prereq edges + the stored weights.
 * ========================================================================= */

export { STRONG_ACC, WEAK_ACC };

/**
 * Every prerequisite of `targetIds`, transitively, up to `maxDepth` hops.
 * Cycle-safe BFS over the prereq edges (the upstream mirror of countDescendants).
 * Returns [{id, hop, w}] where `hop` is the shortest distance from a target
 * (1 = direct prereq) and `w` is the importance weight of the edge by which the
 * node was first reached (its edge toward the thing it unlocks). Targets
 * themselves are never included.
 */
export function prereqClosure(targetIds, prereqEdges, { maxDepth = 3 } = {}) {
  // node -> [{from, w}] : its direct prerequisites and the edge weight.
  const pIdx = new Map();
  for (const e of prereqEdges) {
    if (!pIdx.has(e.to)) pIdx.set(e.to, []);
    pIdx.get(e.to).push({ from: e.from, w: Number.isFinite(e.w) ? e.w : PREREQ_WEIGHT_DEFAULT });
  }
  const seen = new Set(targetIds); // don't fold a target back in as its own prereq
  const found = new Map(); // id -> {id, hop, w}
  let frontier = [...targetIds];
  for (let hop = 1; hop <= maxDepth && frontier.length; hop++) {
    const next = [];
    for (const cur of frontier) {
      for (const { from, w } of pIdx.get(cur) || []) {
        if (seen.has(from)) continue;
        seen.add(from);
        found.set(from, { id: from, hop, w });
        next.push(from);
      }
    }
    frontier = next;
  }
  return [...found.values()];
}

/**
 * A prerequisite-first topological order of `nodeIds` (Kahn's algorithm over the
 * induced prereq subgraph). Ties — and any nodes left in a cycle — fall back to
 * the caller's comparator `cmp(idA, idB)` so the result is stable. Never throws
 * on a cycle: leftover nodes are appended in `cmp` order (same cycle-safe stance
 * as countDescendants).
 */
export function topoSortScope(nodeIds, prereqEdges, cmp = () => 0) {
  const set = new Set(nodeIds);
  const indeg = new Map([...set].map((id) => [id, 0]));
  const outs = new Map([...set].map((id) => [id, []]));
  for (const e of prereqEdges) {
    if (!set.has(e.from) || !set.has(e.to) || e.from === e.to) continue;
    outs.get(e.from).push(e.to);
    indeg.set(e.to, indeg.get(e.to) + 1);
  }
  const ready = [...set].filter((id) => indeg.get(id) === 0).sort(cmp);
  const order = [];
  const placed = new Set();
  while (ready.length) {
    ready.sort(cmp);
    const id = ready.shift();
    if (placed.has(id)) continue;
    placed.add(id);
    order.push(id);
    for (const to of outs.get(id) || []) {
      indeg.set(to, indeg.get(to) - 1);
      if (indeg.get(to) === 0) ready.push(to);
    }
  }
  // Anything left is in a cycle — append deterministically so we never drop nodes.
  const leftover = [...set].filter((id) => !placed.has(id)).sort(cmp);
  return [...order, ...leftover];
}

/** How ready a touched prereq is: 1.0 once accuracy hits STRONG_ACC, 0 if never
 *  attempted (unknown = not ready). Accuracy is on the 0..100 scale (node.accuracy). */
function readyFactor(node) {
  if (!node || !node.attempts) return 0;
  return Math.min(1, Math.max(0, (node.accuracy ?? 0) / STRONG_ACC));
}

/**
 * Readiness diagnosis for the topic(s) a learner is about to start.
 *
 * @param {string[]} targetIds     the doc ids being learned
 * @param {object[]} nodes         toNode() rows for the WHOLE program (so cross-
 *                                 course prereqs carry real stats, not attempts=0)
 * @param {object[]} prereqEdges   buildPrereqEdges() over the same rows
 *
 * Returns { score, tier, ready, prereqCount, strongCount, weak } where:
 *   score  — 0..100 weighted readiness, or null when there are no known prereqs
 *   tier   — 'ready' | 'warmup' | 'drill' | 'unknown' (unknown = no prereqs found)
 *   ready  — tier === 'ready'
 *   weak   — the NOT-strong prerequisites to warm up on, prereq-first ordered,
 *            each {id, topic, track, course, lesson, accuracy, attempts, why, w, hop}
 */
export function computeReadiness(targetIds, nodes, prereqEdges, { maxDepth = 3 } = {}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const whyOf = new Map(prereqEdges.map((e) => [`${e.from} ${e.to}`, e.why]));
  const closure = prereqClosure(targetIds, prereqEdges, { maxDepth });

  if (!closure.length) {
    return { score: null, tier: 'unknown', ready: false, prereqCount: 0, strongCount: 0, weak: [] };
  }

  let wSum = 0;
  let wReady = 0;
  let strongCount = 0;
  let criticalUntouched = false;
  let anyUntouched = false;
  const weakRows = [];
  for (const p of closure) {
    const node = byId.get(p.id);
    if (!node) continue;
    const hopDecay = 1 / p.hop; // nearer prerequisites weigh more
    const weight = p.w * hopDecay;
    const rf = readyFactor(node);
    wSum += weight;
    wReady += weight * rf;
    const strong = node.attempts > 0 && (node.accuracy ?? 0) >= STRONG_ACC;
    const untouched = !node.attempts;
    if (strong) { strongCount += 1; continue; }
    if (untouched) { anyUntouched = true; if (p.w >= 3) criticalUntouched = true; }
    // find a "why" phrase from any edge this prereq supplies
    let why = '';
    for (const e of prereqEdges) { if (e.from === p.id) { why = e.why || ''; if (why) break; } }
    weakRows.push({
      id: p.id,
      topic: node.topic,
      track: node.track,
      course: node.course,
      lesson: node.lesson,
      accuracy: node.accuracy,
      attempts: node.attempts,
      priority: node.priority,
      why,
      w: p.w,
      hop: p.hop,
    });
  }

  const score = wSum ? Math.round((wReady / wSum) * 100) : null;
  // Order the warm-up set prerequisite-first (foundational prereqs before the
  // ones that depend on them), tie-broken by importance×priority (drill the most
  // critical, weakest first).
  const byImportance = (a, b) =>
    (b.w * (b.priority ?? 0)) - (a.w * (a.priority ?? 0)) || (a.accuracy ?? -1) - (b.accuracy ?? -1);
  const ordered = topoSortScope(
    weakRows.map((r) => r.id),
    prereqEdges,
    (x, y) => byImportance(weakRows.find((r) => r.id === x), weakRows.find((r) => r.id === y)),
  );
  const rank = new Map(ordered.map((id, i) => [id, i]));
  weakRows.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));

  let tier;
  if (score >= 80 && !criticalUntouched && !anyUntouched) tier = 'ready';
  else if (score >= 60 && !criticalUntouched) tier = 'warmup';
  else tier = 'drill';

  return {
    score,
    tier,
    ready: tier === 'ready',
    prereqCount: closure.length,
    strongCount,
    weak: weakRows,
  };
}
