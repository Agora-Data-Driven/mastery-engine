An inverted index can retrieve only the keys its analyzer creates. Splitting `Cloud Run`, folding case, removing `the`, or reducing `policies` to `polici` changes which surface forms become the same lookup key and which distinctions disappear permanently. Text analysis is therefore relevance modeling at index-construction time: every normalization buys matches while risking false equivalence, and query analysis must reproduce the same contract.

## Tokenization Choices and Their Retrieval Consequences

**Tokenization** segments an input character sequence into indexable units and assigns positions and offsets. Whitespace splitting is a useful toy but fails on punctuation, scripts without spaces, URLs, product names, and code. Consider:

`C++ guide for node.js in Asia-Pacific`

A whitespace tokenizer yields `C++`, `guide`, `for`, `node.js`, `in`, `Asia-Pacific`. A punctuation-splitting tokenizer might yield `C`, `guide`, `for`, `node`, `js`, `in`, `Asia`, `Pacific`, destroying the exact identifiers `C++` and `node.js` while improving matches for `Pacific`. Neither output is inherently correct; correctness depends on query behavior.

Token boundaries define vocabulary and postings. Treating `state-of-the-art` as one token supports an exact lookup but misses a query for `state art` unless additional forms are indexed. Splitting it supports component retrieval but changes phrase positions and may overmatch unrelated uses. A common strategy emits multiple tokens at the same or carefully managed positions: preserve `node.js` as a token and also emit `node` and `js`. This increases recall and index size.

Languages require appropriate segmentation. Chinese and Japanese normally lack spaces between every word, so dictionary or statistical segmentation is needed; character n-grams avoid committing to one segmentation but create more postings and less precise matches. Thai has its own boundary challenges. Applying one English-centric regular expression to multilingual content creates uneven recall that may look like a ranking defect.

Code and identifiers need domain rules. `getUserProfile`, `get_user_profile`, and `get-user-profile` can emit complete identifiers plus subtokens `get`, `user`, `profile`. Version strings such as `v1.2.3`, IPv4 addresses, emails, and URLs may deserve structured tokens. Numeric token policy also matters: retaining every timestamp and UUID explodes vocabulary with one-off terms, while dropping all numbers loses error codes and model versions.

Worked comparison: documents contain `CloudRun`, `Cloud Run`, and `cloud-run`. An analyzer that only whitespace-splits creates three incompatible forms after lowercasing: `cloudrun`, `cloud`+`run`, and `cloud-run`. A domain analyzer can preserve originals while emitting normalized `cloud` and `run` subtokens, allowing a `cloud run` query to reach all three. The extra tokens increase postings and can make a generic `run` query noisier.

Positions and character offsets are outputs, not incidental metadata. Positions later support phrase queries; offsets highlight matching spans in original text. If a tokenizer emits synonyms or compound parts, it must assign positions deliberately so it does not invent phrases. Offsets must refer to the original character sequence even after normalization.

Judgment uses query logs and error analysis. Examine missed queries, false matches, languages, and domain identifiers. Version analyzers because changing boundaries changes term IDs, frequencies, positions, and scores; a full reindex is normally required. Run old and new analyzers on representative text and measure both vocabulary growth and retrieval metrics before migration.

## When Stemming Helps Recall and Hurts Precision

**Stemming** applies heuristic rules to reduce related word forms to a common stem. A Porter-style English stemmer may map `connect`, `connected`, `connecting`, and `connection` toward `connect`, and `policy` and `policies` toward a stem such as `polici`. The stem need not be a valid word; it is an equivalence key.

At both index and query time, stemming lets a query for `connect` match a document containing only `connected`. Recall rises because morphological variants share postings. Without stemming, those surface forms are separate terms unless the query explicitly expands them.

The same merging can hurt precision through **overstemming**: distinct concepts collapse to one key. Classic examples vary by algorithm, but domain terms are especially vulnerable. A stemmer could conflate an organization name or technical identifier with an ordinary morphological family. **Understemming** is the opposite: genuinely related forms remain separate, such as irregular `go` and `went`.

Worked corpus: d1 says `connection timeout`, d2 says `connected clients`, and d3 says `connective tissue`. A query `client connection` should likely retrieve d1 and perhaps d2. A broad stem that merges every `connect*` form also admits d3, raising recall but lowering precision. The value depends on whether the collection is networking documentation or biomedical research.

**Lemmatization** maps inflected words to dictionary lemmas using linguistic analysis: `was` to `be`, `mice` to `mouse`. It can avoid some crude suffix errors but costs more and depends on language and part of speech. Neither stemming nor lemmatization resolves semantic synonymy: `car` and `automobile` remain different without expansion or semantic retrieval.

Fields deserve different treatment. Product codes, legal citations, people names, and exact titles often need an unstemmed field. Long prose may benefit from a stemmed field. A practical multi-field index stores both: exact analyzed terms for precision and stems for recall, with separate scoring weights. Queries can search both rather than destroying surface distinctions globally.

Stemming changes document frequency. Merging several variants creates a more common term with lower rarity weight in later ranking. Scores from stemmed and unstemmed indexes are therefore not directly comparable. Analyzer migration needs reindexing and evaluation, not merely enabling a query-side option.

Judgment: use stemming when morphological mismatch is visible and exact form is not itself meaningful. Be conservative in technical corpora where `policy`, identifiers, and named entities carry precise semantics. Measure per-query effects; a mean metric can hide severe regressions in acronyms or proper nouns. Hybrid lexical-dense retrieval reduces pressure to make one aggressive lexical equivalence solve every vocabulary mismatch.

## Stop Words: Space Savings vs Phrase-Query Damage

**Stop words** are very frequent function words such as `the`, `of`, and `to`. Historically, removing them saved substantial index space and avoided processing postings present in most documents. Their low inverse-document-frequency contribution also makes them weak ranking signals for many topical queries.

Removal is irreversible for features that depend on those terms. If the index drops `to` and `be`, the phrase `to be or not to be` cannot be verified exactly from term positions because several required postings do not exist. Titles such as `The Who`, queries such as `The Hague`, code symbols, and legal phrases show that frequent words can be decisive in context.

Positions create a subtle choice. Suppose text is `state of the art`, and `of`, `the` are removed. If retained tokens receive compressed positions `state:1, art:2`, the index falsely makes `"state art"` an exact phrase. Correct **position increments** preserve gaps: `state:1, art:4`. Then a phrase query for `state art` does not match at slop zero, although the original stop words still cannot be verified individually.

Worked storage estimate: a corpus has 100 million documents and `the` occurs in 80 million. Its postings consume many bytes even with excellent gap compression. Dropping it saves storage and decode work. But modern compression makes dense postings cheap per document, and query engines can skip low-impact common terms, so the saving may not justify lost functionality.

Alternatives preserve options. Keep stop words but assign their low statistical weight naturally. Omit them from a general body field while retaining an exact phrase field. Index positions and use query planning to avoid seeding with common lists. A search UI may ignore a stop word for loose topical retrieval but retain it inside quoted phrases.

A stop list is language- and domain-specific. `can` is frequent English grammar but also a meaningful container noun; `us` can be a pronoun or the country abbreviation `US` before case folding. In a corpus about operating systems, `os` is not noise. Blindly applying a generic list after normalization can erase important tokens.

Judgment starts from product capabilities. If exact phrases, names, citations, or highlighting matter, retain enough information to support them. If storage is severely constrained and queries are broad topical bags of words, removal may be rational. Evaluate phrase and entity query classes separately, not only average ranking. Stop words are low average signal, not zero conditional signal.

## Normalization: Case, Accents, and Equivalence Classes

Normalization maps surface strings into equivalence classes before dictionary lookup. Lowercasing makes `Cloud`, `CLOUD`, and `cloud` share one key. Unicode normalization resolves multiple code-point sequences that render identically: composed `é` and `e` plus a combining acute accent should not become different terms accidentally.

Case folding is broader and more language-aware than simple ASCII lowercasing. Yet case can carry meaning: `US` versus `us`, `Apple` versus `apple`, or identifiers in case-sensitive code. A multi-field design can store a folded field for recall and an exact field for precision. Query intent determines weighting.

**Accent folding** maps `café` toward `cafe`, improving recall for users who omit diacritics. It can also merge distinct words or names in languages where accents change meaning. The safe pattern is often to index both the original normalized token and a folded variant, or apply folding only in languages and fields where evaluation supports it.

Unicode has compatibility normalization as well. NFKC can map stylistic or compatibility characters to common forms, such as full-width Latin characters. It may also erase distinctions that matter in mathematical or technical text. Choose and document a normalization form; never rely on whatever byte sequence happened to arrive.

Worked example: documents contain `Résumé`, `resume`, and `RESUME`. Lowercase plus accent folding maps all three to `resume`, maximizing match recall. If the query asks for the French noun résumé and the English verb resume is common, precision falls. An exact token alongside the folded token lets exact-accent matches receive more weight while folded matches remain candidates.

Normalization must be deterministic and identical at index and query time. Store the analyzer configuration version with each index. During migration, searching old and new segments with different rules under one unversioned query analyzer creates systematic misses. Either analyze per segment version or rebuild and cut over atomically.

Equivalence extends beyond characters: punctuation folding, possessive removal, width normalization, and canonicalizing URLs all decide which strings count as the same. Each transformation should be idempotent: applying it twice yields the same token. Order matters; Unicode normalization before case and accent handling is easier to reason about than ad hoc byte replacements.

Judgment separates display from retrieval. Preserve original text for rendering, citations, and offsets; normalized terms are lookup keys, not replacements for source content. Maintain test cases for multilingual strings, combining marks, identifiers, and known collisions. The governing question is always: which distinctions may safely disappear for this field and user population? Normalization is valuable precisely because it discards distinctions, so discarded meaning is its principal failure mode.
