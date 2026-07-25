/**
 * Off-cloud test for the warm-up / readiness graph logic (no Firestore, no
 * network). Verifies the transitive prerequisite closure (cycle-safe, depth-
 * capped), the topological sort (prereq-first + cycle fallback), the weighted
 * readiness score + tiering, and the weight normalisation on prereq edges.
 *
 * Run:  node lib/_graph_test.js   (exit 0 = pass)
 */
const {
  buildPrereqEdges,
  prereqClosure,
  topoSortScope,
  computeReadiness,
  PREREQ_WEIGHT_DEFAULT,
} = await import('./graph.js');

const fails = [];
const check = (label, cond) => {
  console.log((cond ? '  [OK] ' : '  [FAIL] ') + label);
  if (!cond) fails.push(label);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A small graph: A (foundational) -> B -> C -> T, and A -> T directly.
// Edge {from: prereq, to: dependent}. Weight = importance of the prereq.
const edges = [
  { from: 'A', to: 'B', kind: 'prereq', why: 'a for b', w: 1 },
  { from: 'B', to: 'C', kind: 'prereq', why: 'b for c', w: 2 },
  { from: 'C', to: 'T', kind: 'prereq', why: 'c for t', w: 3 },
  { from: 'A', to: 'T', kind: 'prereq', why: 'a for t', w: 1 },
];

// --- prereqClosure: transitive, depth-capped, cycle-safe -----------------------
const cl = prereqClosure(['T'], edges).sort((a, b) => a.id.localeCompare(b.id));
check('closure of T = {A,B,C} (transitive)', same(cl.map((x) => x.id), ['A', 'B', 'C']));
check('closure never includes the target itself', !cl.some((x) => x.id === 'T'));
const hopOf = new Map(cl.map((x) => [x.id, x.hop]));
check('direct prereqs are hop 1 (C, A)', hopOf.get('C') === 1 && hopOf.get('A') === 1);
check('transitive prereq is deeper (B at hop 2)', hopOf.get('B') === 2);

const capped = prereqClosure(['T'], edges, { maxDepth: 1 }).map((x) => x.id).sort();
check('maxDepth=1 keeps only direct prereqs', same(capped, ['A', 'C']));

// Cycle: P <-> Q, and target D needs Q. Must terminate.
const cyc = [
  { from: 'P', to: 'Q', w: 2 },
  { from: 'Q', to: 'P', w: 2 },
  { from: 'Q', to: 'D', w: 2 },
];
const cycClosure = prereqClosure(['D'], cyc).map((x) => x.id).sort();
check('cycle in prereqs terminates (P,Q reached once)', same(cycClosure, ['P', 'Q']));

// --- topoSortScope: prerequisite-first + cycle fallback ------------------------
const order = topoSortScope(['A', 'B', 'C', 'T'], edges, (a, b) => a.localeCompare(b));
const pos = new Map(order.map((id, i) => [id, i]));
check('topo order places A before B before C before T',
  pos.get('A') < pos.get('B') && pos.get('B') < pos.get('C') && pos.get('C') < pos.get('T'));
check('topo order keeps every node', same([...order].sort(), ['A', 'B', 'C', 'T']));
const cycOrder = topoSortScope(['P', 'Q'], [{ from: 'P', to: 'Q' }, { from: 'Q', to: 'P' }], (a, b) => a.localeCompare(b));
check('topo sort survives a cycle (no throw, all nodes returned)',
  same([...cycOrder].sort(), ['P', 'Q']));

// --- computeReadiness: weighting, tiering, warm-up set -------------------------
const node = (id, attempts, accuracy, priority = 50) =>
  ({ id, topic: id, track: 'T', course: 'C', lesson: 'L', attempts, accuracy: attempts ? accuracy : null, priority });

// A strong (90%), B weak (40%), C untouched & critical (w=3). Target T.
const mixed = [node('A', 5, 90), node('B', 3, 40), node('C', 0, 0), node('T', 0, 0)];
const r = computeReadiness(['T'], mixed, edges);
check('mixed readiness scores low (< 60)', r.score != null && r.score < 60);
check('critical untouched prereq forces tier "drill"', r.tier === 'drill' && r.ready === false);
check('strong prereq A is not in the warm-up set', !r.weak.some((w) => w.id === 'A'));
check('warm-up set = the not-strong prereqs {B,C}',
  same(r.weak.map((w) => w.id).sort(), ['B', 'C']));
check('warm-up set is ordered prerequisite-first (B before C)',
  r.weak.findIndex((w) => w.id === 'B') < r.weak.findIndex((w) => w.id === 'C'));
check('strongCount counts the strong prereqs', r.strongCount === 1);

// All prereqs strong -> ready.
const allStrong = [node('A', 5, 95), node('B', 5, 85), node('C', 5, 90), node('T', 0, 0)];
const r2 = computeReadiness(['T'], allStrong, edges);
check('all-strong prereqs -> tier "ready"', r2.tier === 'ready' && r2.ready === true);
check('all-strong -> score 100', r2.score === 100);
check('all-strong -> empty weak set', r2.weak.length === 0);
// Warm-up is NOT gated on readiness: even when every prereq is strong, the full
// prereq set is still returned so a learner can refresh/drill it anyway.
check('all-strong -> prereqs still populated (warm-up always available)', (r2.prereqs || []).length === 3);
check('prereqs ordered weak-first then strong', (() => {
  const r = computeReadiness(['T'], [node('A', 5, 95), node('B', 0, 0), node('C', 3, 40), node('T', 0, 0)], edges);
  const ids = (r.prereqs || []).map((p) => p.id);
  // B (untouched) and C (weak) come before A (strong).
  return ids.indexOf('A') > ids.indexOf('B') && ids.indexOf('A') > ids.indexOf('C');
})());

// No prereqs at all -> unknown (caller checks coverage).
const r3 = computeReadiness(['T'], [node('T', 0, 0)], []);
check('target with no known prereqs -> tier "unknown", score null',
  r3.tier === 'unknown' && r3.score === null);

// --- buildPrereqEdges: weight normalisation ------------------------------------
const catalog = [{ id: 'A', topic: 'A' }, { id: 'B', topic: 'B' }, { id: 'C', topic: 'C' }];
const links = [
  { id: 'B', prereqs: [{ id: 'A', why: 'x', weight: 3 }] },       // explicit weight
  { id: 'C', prereqs: [{ id: 'A', why: 'y' }] },                  // missing weight -> default
  { id: 'A', prereqs: [{ id: 'B', why: 'z', weight: 9 }] },       // out of range -> clamp to 3
];
const built = buildPrereqEdges(links, catalog);
const wOf = (from, to) => built.find((e) => e.from === from && e.to === to)?.w;
check('explicit prereq weight is kept', wOf('A', 'B') === 3);
check('missing prereq weight defaults', wOf('A', 'C') === PREREQ_WEIGHT_DEFAULT);
check('out-of-range prereq weight is clamped to 3', wOf('B', 'A') === 3);

if (fails.length) {
  console.log(`\n[graph-test] FAIL (${fails.length}): ${fails.join(', ')}`);
  process.exit(1);
}
console.log('\n[graph-test] PASS');
