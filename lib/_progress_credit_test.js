/**
 * Off-cloud regression test for the "finished quiz shows no progress" bug.
 *
 * A topic doc keeps a STABLE id across re-filing (moveTopics / curriculum edits /
 * renames change the track/course/lesson FIELDS but not the doc id). logResults
 * used to key a user's stats by slug(current fields), which diverges from the real
 * doc id after any move — so the attempt landed on an id the read path never looks
 * up ("Not started / 0%" after a finished quiz), and for the legacy owner spawned a
 * phantom zero-question doc. buildTopicIdIndex resolves each attempt back to the
 * doc that actually holds the content, keeping write, read and display in agreement.
 *
 * Run:  node lib/_progress_credit_test.js   (exit 0 = pass)
 */
const { buildTopicIdIndex, tupleKey } = await import('./firestore.js');

const fails = [];
const check = (label, cond) => {
  console.log((cond ? '  [OK] ' : '  [FAIL] ') + label);
  if (!cond) fails.push(label);
};

// Resolve a quiz result (its CURRENT track/course/lesson/topic) to the doc id
// logResults would credit — exactly what the fixed logResults does.
const resolve = (idx, r) => idx.get(tupleKey(r.track, r.course, r.lesson, r.topic))?.id;

// --- 1. Untouched topic: id already equals slug(fields) -> credits itself -------------------
{
  const rows = [{ id: 'data-science-stats-01-basics-mean', track: 'Data Science', course: 'Stats', lesson: '01 Basics', topic: 'Mean', questionCount: 5 }];
  const idx = buildTopicIdIndex(rows);
  check('untouched topic resolves to its own id',
    resolve(idx, rows[0]) === 'data-science-stats-01-basics-mean');
}

// --- 2. Moved topic: id kept, fields changed -> credits the REAL (old) id, not slug(fields) --
{
  // Was created under "Calculus for ML / 02 …"; moveTopics re-filed it to "Calculus / 04 …"
  // but kept the id. slug(current fields) would be a DIFFERENT string.
  const realId = 'mathematics-calculus-for-ml-02-multivariate-calculus-directional-derivatives';
  const rows = [{ id: realId, track: 'Mathematics', course: 'Calculus', lesson: '04 Multivariate Calculus', topic: 'Directional derivatives', questionCount: 4 }];
  const idx = buildTopicIdIndex(rows);
  check('moved topic resolves to its stable doc id (not slug of new fields)',
    resolve(idx, rows[0]) === realId);
}

// --- 3. The Multivariate bug: phantom (canonical id, 0 questions) + content (old id, has  ---
//        questions) share a tuple -> the doc WITH questions must win.
{
  const content = { id: 'mathematics-calculus-for-ml-02-multivariate-calculus-functions-of-several-variables', track: 'Mathematics', course: 'Calculus', lesson: '04 Multivariate Calculus', topic: 'Functions of several variables', questionCount: 3 };
  const phantom = { id: 'mathematics-calculus-04-multivariate-calculus-functions-of-several-variables', track: 'Mathematics', course: 'Calculus', lesson: '04 Multivariate Calculus', topic: 'Functions of several variables', questionCount: 0 };
  // Order must not matter — try both.
  for (const rows of [[content, phantom], [phantom, content]]) {
    const idx = buildTopicIdIndex(rows);
    check(`duplicate tuple credits the content doc (order ${rows[0] === content ? 'content-first' : 'phantom-first'})`,
      resolve(idx, content) === content.id);
  }
}

// --- 4. Tie on questionCount -> the canonical (id==slug) doc wins ---------------------------
{
  const canonical = { id: 'x-y-z-topic', track: 'X', course: 'Y', lesson: 'Z', topic: 'Topic', questionCount: 2 };
  const other = { id: 'old-legacy-id-topic', track: 'X', course: 'Y', lesson: 'Z', topic: 'Topic', questionCount: 2 };
  for (const rows of [[canonical, other], [other, canonical]]) {
    const idx = buildTopicIdIndex(rows);
    check(`questionCount tie prefers the canonical id (order ${rows[0] === canonical ? 'canonical-first' : 'other-first'})`,
      resolve(idx, canonical) === 'x-y-z-topic');
  }
}

console.log(fails.length ? `\n[progress-credit-test] FAIL (${fails.length})` : '\n[progress-credit-test] PASS');
process.exit(fails.length ? 1 : 0);
