/**
 * Off-cloud test for the question de-duplication logic (no Firestore, no network).
 *
 * These guard the fix for the 2026-09-08 duplication bug: generation runs per TOPIC
 * but grounds on a LESSON's transcript, so sibling topics were each mining the same
 * passage. `dedupeKey` alone never caught it, because the collisions were rewordings
 * rather than verbatim repeats.
 *
 * Run:  node lib/_gendupe_test.js   (exit 0 = pass)
 */
const {
  dedupeKey,
  contentWords,
  overlap,
  isNearDuplicate,
  NEAR_DUPLICATE_THRESHOLD,
} = await import('./genjobs.js');

const { audienceFor, DEFAULT_AUDIENCE } = await import('./programs.js');

const fails = [];
const check = (label, cond) => {
  console.log((cond ? '  [OK] ' : '  [FAIL] ') + label);
  if (!cond) fails.push(label);
};

// --- dedupeKey: what it does and does NOT catch -------------------------------
check('dedupeKey ignores punctuation and case',
  dedupeKey('What is BM25?') === dedupeKey('what is bm25'));
check('dedupeKey collapses runs of spaces',
  dedupeKey('a   b  c') === 'a b c');
// Quirk worth knowing: dedupeKey DELETES non-alphanumerics rather than replacing
// them with a space, so a tab joins its neighbours ("a	b" keys as "ab"). Harmless
// for question stems, and it errs toward calling things duplicates, which is safe.
check('dedupeKey deletes rather than splits on other whitespace',
  dedupeKey('a\tb') === 'ab');
check('dedupeKey does NOT catch a reword (this is why overlap exists)',
  dedupeKey('What does the inverted index do?') !== dedupeKey('What is the role of the inverted index?'));

// --- contentWords: stopwords and short tokens out -----------------------------
const cw = contentWords('What is the role of the inverted index in keyword search?');
check('contentWords drops stopwords', !cw.has('the') && !cw.has('what') && !cw.has('is'));
check('contentWords drops tokens of 3 chars or fewer', !cw.has('of') && !cw.has('in'));
check('contentWords keeps the substantive terms',
  cw.has('inverted') && cw.has('index') && cw.has('keyword') && cw.has('search'));

// --- overlap ------------------------------------------------------------------
check('overlap of a set with itself is 1', overlap(cw, cw) === 1);
check('overlap with an empty set is 0', overlap(cw, new Set()) === 0);
check('overlap of disjoint sets is 0',
  overlap(contentWords('cosine similarity direction'), contentWords('pizza oven recipe')) === 0);

// --- isNearDuplicate: the REAL cases, taken from the RAG bank ------------------
// These four shipped in four different topics of one lesson, all asking the same thing.
const banked = [
  'A knowledge base holds 100 documents. The word pizza appears in 5 of them and the word the appears in all 100. Before any log is applied, how do their inverse document frequency values compare? Pizza scores 20 and the scores 1',
];
const priorSets = banked.map(contentWords);

check('catches the same question reworded (the failure that actually happened)',
  isNearDuplicate(
    'A knowledge base holds 100 documents. The word pizza appears in 5 of them, and the word the appears in all 100. Before any logarithm is applied, how do their inverse document frequency weights compare? Pizza receives a weight of 20',
    priorSets,
  ));

check('does NOT flag a genuinely different question on the same topic',
  !isNearDuplicate(
    'When is the inverted index for a keyword-search knowledge base normally built? Once ahead of time, before any search is processed',
    priorSets,
  ));

check('does NOT flag a different question that merely shares topic vocabulary',
  !isNearDuplicate(
    'In a term document matrix, what does a single row represent? One vocabulary word, across every document in the collection',
    priorSets,
  ));

check('a very short candidate is left to the exact key, not judged on overlap',
  !isNearDuplicate('Why?', priorSets));

check('threshold is the documented 0.6', NEAR_DUPLICATE_THRESHOLD === 0.6);

// An empty prior list can never match — a fresh topic must not be blocked.
check('nothing is a duplicate when the bank is empty',
  !isNearDuplicate('Anything at all about retrieval scoring', []));

// --- audienceFor: the hardcoded-marketer fix ----------------------------------
check('a known program resolves to its own practitioner',
  audienceFor('ai_engineering') === 'a working applied AI engineer');
check('the RAG program resolves to a retrieval engineer',
  /retrieval/i.test(audienceFor('retrieval_augmented_generation_rag')));
check('marketing still resolves to a marketer (no regression)',
  audienceFor('digital_marketing') === 'a working digital marketer');
check('an unknown program falls back to the neutral phrase',
  audienceFor('something_new') === DEFAULT_AUDIENCE);
check('the neutral fallback names no profession',
  !/marketer|engineer|scientist/i.test(DEFAULT_AUDIENCE));
check('a stored per-program audience overrides the map',
  audienceFor('digital_marketing', 'a growth lead') === 'a growth lead');
check('a blank stored audience falls through to the map',
  audienceFor('digital_marketing', '   ') === 'a working digital marketer');

if (fails.length) {
  console.log(`\n[gendupe-test] FAIL (${fails.length}): ${fails.join(', ')}`);
  process.exit(1);
}
console.log('\n[gendupe-test] PASS');
