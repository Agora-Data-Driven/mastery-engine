/**
 * Off-cloud test for the program dimension (no Firestore, no network). Verifies scope resolution
 * (enrollment, admin override, guests), catalog/question filtering, and — most importantly — that
 * pre-backfill data-science data is completely unaffected.
 *
 * Run:  node lib/_programs_test.js   (exit 0 = pass)
 */
const {
  DEFAULT_PROGRAM,
  programOf,
  defaultEnrollment,
  normalizeEnrollment,
  resolveScope,
  filterCatalog,
  filterQuestions,
} = await import('./programs.js');

const fails = [];
const check = (label, cond) => {
  console.log((cond ? '  [OK] ' : '  [FAIL] ') + label);
  if (!cond) fails.push(label);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const DS = 'data_science';
const DM = 'digital_marketing';

// --- programOf: the pre-backfill safety net --------------------------------------------------
check('doc with no program -> default', programOf({ topic: 'Bias' }) === DS);
check('doc with a program -> that program', programOf({ program: DM }) === DM);
check('DEFAULT_PROGRAM is data_science', DEFAULT_PROGRAM === DS);

// --- enrollment normalisation ----------------------------------------------------------------
check('default enrollment = default program, all courses',
  same(defaultEnrollment(), { programs: [DS], courses: [] }));
check('missing/empty enrollment -> default program',
  same(normalizeEnrollment(null), { programs: [DS], courses: [] }));
check('enrollment dedupes + trims',
  same(normalizeEnrollment({ programs: [DM, ' ' + DM, ''], courses: ['SEO', 'SEO'] }),
    { programs: [DM], courses: ['SEO'] }));

// --- scope resolution ------------------------------------------------------------------------
check('no enrollment -> default program, no course limit',
  same(resolveScope(null), { program: DS, courses: [] }));
check('enrolled learner -> their program + assigned courses',
  same(resolveScope({ programs: [DM], courses: ['SEO'] }), { program: DM, courses: ['SEO'] }));
check('learner may switch to a program they ARE enrolled in',
  resolveScope({ programs: [DS, DM], courses: [] }, { requested: DM }).program === DM);
check('learner may NOT switch to a program they are not enrolled in',
  resolveScope({ programs: [DM], courses: [] }, { requested: DS }).program === DM);
check('admin override reaches any program',
  resolveScope({ programs: [DS], courses: [] }, { requested: DM, anyProgram: true }).program === DM);
check('admin override into another program drops the course limit',
  same(resolveScope({ programs: [DS], courses: ['Stats'] }, { requested: DM, anyProgram: true }),
    { program: DM, courses: [] }));
check('guest (anyProgram) may request a program',
  resolveScope(null, { requested: DM, anyProgram: true }).program === DM);
check('blank request -> first enrolled program',
  resolveScope({ programs: [DM] }, { requested: '   ' }).program === DM);

// --- catalog filtering -----------------------------------------------------------------------
const catalog = [
  { topic: 'Bias', course: 'Stats', program: DS },
  { topic: 'Gradient Descent', course: 'ML' }, // pre-backfill: no program field
  { topic: 'Attribution', course: 'Analytics', program: DM },
  { topic: 'Keyword Research', course: 'SEO', program: DM },
];
check('catalog scoped to DS keeps pre-backfill rows',
  same(filterCatalog(catalog, { program: DS, courses: [] }).map((r) => r.topic),
    ['Bias', 'Gradient Descent']));
check('catalog scoped to DM excludes DS',
  same(filterCatalog(catalog, { program: DM, courses: [] }).map((r) => r.topic),
    ['Attribution', 'Keyword Research']));
check('assigned courses narrow the catalog',
  same(filterCatalog(catalog, { program: DM, courses: ['SEO'] }).map((r) => r.topic),
    ['Keyword Research']));
check('empty courses = every course in the program',
  filterCatalog(catalog, { program: DM, courses: [] }).length === 2);
check('no scope -> unfiltered (guest/legacy paths)', filterCatalog(catalog, {}).length === 4);

// --- question filtering (the topic-name collision guard) --------------------------------------
const questions = [
  { topic: 'Attribution', question: 'ds one', program: DS },
  { topic: 'Attribution', question: 'dm one', program: DM },
  { topic: 'Bias', question: 'old one' }, // pre-backfill
];
check('DS scope gets the DS "Attribution", not the DM one',
  same(filterQuestions(questions, { program: DS }).map((q) => q.question), ['ds one', 'old one']));
check('DM scope gets only the DM "Attribution"',
  same(filterQuestions(questions, { program: DM }).map((q) => q.question), ['dm one']));

// --- REGRESSION: a pre-backfill world must behave exactly as before ---------------------------
const legacyCatalog = [
  { topic: 'Bias', course: 'Stats' },
  { topic: 'Gradient Descent', course: 'ML' },
];
const legacyQuestions = [{ topic: 'Bias', question: 'q1' }, { topic: 'Gradient Descent', question: 'q2' }];
const legacyScope = resolveScope(null); // what an existing DS user resolves to
check('pre-backfill catalog passes through untouched',
  same(filterCatalog(legacyCatalog, legacyScope), legacyCatalog));
check('pre-backfill questions pass through untouched',
  same(filterQuestions(legacyQuestions, legacyScope), legacyQuestions));

if (fails.length) {
  console.log(`\n[programs-test] FAIL (${fails.length}): ${fails.join(', ')}`);
  process.exit(1);
}
console.log('\n[programs-test] PASS');
