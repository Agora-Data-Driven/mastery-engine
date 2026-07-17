/**
 * Programs — the top-level content dimension (pure logic, no Firestore).
 *
 * The engine used to hold ONE global catalog (all data science). A `program` now
 * sits above Track > Course > Lesson > Topic so several curricula can live side
 * by side in the same bank: `data_science` (the original content) and
 * `digital_marketing` (the team's Academy), with more possible later.
 *
 * Every `topics` and `questions` doc carries a `program`. Docs written before the
 * dimension existed have no such field, so `programOf` treats a missing value as
 * DEFAULT_PROGRAM — which means filtering is a NO-OP until the backfill runs and
 * pre-existing data-science users see byte-identical results either way.
 *
 * Who sees what is an ENROLLMENT: `users/{email}/meta/enrollment` holding
 * { programs: [...], courses: [...] }. An empty `courses` means "every course in
 * the program" (the default), so nobody is locked out by omission.
 *
 * This module is deliberately IO-free (like priority.js) so the filtering rules
 * can be tested off-cloud — see _programs_test.js.
 */

/** The program every pre-existing doc and un-enrolled user belongs to. */
export const DEFAULT_PROGRAM = (process.env.DEFAULT_PROGRAM || 'data_science').trim() || 'data_science';

/** A catalog/question doc's program, defaulting docs written before the backfill. */
export const programOf = (doc) => (doc && doc.program ? String(doc.program) : DEFAULT_PROGRAM);

/** The enrollment every user gets until one is written for them: all of the default program. */
export const defaultEnrollment = () => ({ programs: [DEFAULT_PROGRAM], courses: [] });

const cleanList = (v) =>
  Array.isArray(v) ? [...new Set(v.map((s) => String(s || '').trim()).filter(Boolean))] : [];

/** Coerce a stored (or posted) enrollment into { programs, courses }, never empty-programs. */
export function normalizeEnrollment(data) {
  const programs = cleanList(data?.programs);
  return {
    programs: programs.length ? programs : [DEFAULT_PROGRAM],
    courses: cleanList(data?.courses),
  };
}

/**
 * The program + course scope a request runs in.
 *
 * `requested` is honoured only when the caller is allowed it: admins may inspect
 * any program, guests have no enrollment to violate, and a learner may switch
 * between the programs they're actually enrolled in. Anything else falls back to
 * their first enrolled program — a stray ?program= can never widen access.
 *
 * The course restriction applies only within an enrolled program; an admin
 * looking into someone else's program sees all of its courses.
 */
export function resolveScope(enrollment, { requested = '', anyProgram = false } = {}) {
  const enr = normalizeEnrollment(enrollment);
  const want = String(requested || '').trim();
  const allowed = want && (anyProgram || enr.programs.includes(want));
  const program = allowed ? want : enr.programs[0];
  return { program, courses: enr.programs.includes(program) ? enr.courses : [] };
}

/** Catalog rows inside `scope` (program, then the assigned courses if any). */
export function filterCatalog(rows, scope) {
  const { program, courses } = scope || {};
  if (!program) return rows;
  const only = new Set(courses || []);
  return rows.filter(
    (r) => programOf(r) === program && (!only.size || only.has(r.course)),
  );
}

/**
 * Question docs inside `scope`.
 *
 * Questions are keyed by topic NAME only, so a name used by two programs (say
 * "Attribution") would otherwise serve marketing questions to a data-science
 * quiz. Filtering by the question's own program is what keeps the banks apart;
 * course scoping needs no work here because the caller only ever asks for topic
 * names that already came out of a scoped catalog.
 */
export function filterQuestions(questions, scope) {
  const program = scope?.program;
  if (!program) return questions;
  return questions.filter((q) => programOf(q) === program);
}
