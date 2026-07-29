Document-level postings answer whether terms occur, but not whether `cloud run` appears as a phrase, whether two concepts occur near each other, or where to highlight the match. Positional indexes retain within-document order to answer those questions, at substantial storage cost. Skip pointers solve a different problem: avoiding comparisons while intersecting long document-ID lists. Both features trade extra bytes at construction for less or richer work at query time.

## Positional Indexes and Their Size Cost

A non-positional posting needs a document ID and perhaps term frequency. A **positional posting** also stores the ordered token positions where the term occurs in that document:

```
retrieval -> [
  (doc=4, tf=2, positions=[7, 31]),
  (doc=9, tf=1, positions=[12])
]
```

Positions are assigned by the analyzer. If document 4 tokenizes as `hybrid retrieval improves retrieval quality`, `retrieval` appears at positions 2 and 4 under one-based numbering. Character offsets are separate metadata for exact highlighting; token positions express order and distance.

The size distinction follows from counts. Let $T$ be total indexed token occurrences and $P$ be total distinct term-document pairs. Document-only postings store roughly one entry per pair, $O(P)$. Positions store one value per occurrence, $O(T)$. Since a term can repeat inside a document, $T\ge P$, often substantially.

Worked scale: one million documents average 500 indexed tokens, so $T=500$ million positions. Suppose each document contains 300 distinct terms, giving $P=300$ million term-document pairs. Adding positions stores 500 million position values on top of 300 million document-level entries. Raw 32-bit positions alone would be 2 GB, before document IDs and structure. Gap encoding makes the real cost smaller because positions such as `[7,31,35]` become gaps `[7,24,4]`, but it does not make them free.

Per-document term frequency is implied by the number of positions, though formats may store it explicitly to know how many values to decode. Positions are nested: document-ID gaps across postings, then position gaps reset inside each document. Blocks and offsets allow a reader to skip positional payload when scoring does not need it.

Analyzer behavior determines positional truth. If stop words are removed from `state of the art`, retained tokens should keep positions `state:1`, `art:4`; compressing them to 1 and 2 invents the phrase `state art`. Synonyms emitted at the same position can represent alternatives, while multiword synonym expansion requires position lengths or graph-aware analysis to avoid false phrase paths.

Fields may use different index options. Titles can store positions because phrase matching is valuable and text is short. A tag field with one unordered value per tag may need document presence only. A large body field might retain frequencies but omit positions if product requirements never include phrases, proximity, or highlighting. Indexing positions “just in case” increases storage, build time, merge I/O, and cache pressure forever.

Positions also enable proximity features such as terms within five tokens and passage-aware scoring. They do not encode semantic structure: two terms adjacent across a sentence boundary may be less related than distance suggests unless boundary markers or field structure are modeled. Token distance also differs across languages and tokenizers.

Judgment starts from a feature inventory. Exact phrases require positions for all relevant tokens. Approximate highlighting can reanalyze stored text, trading query CPU for index bytes, while exact efficient highlighting benefits from offsets. Rank-only bag-of-words retrieval needs neither. Measure positional bytes by field and query-class value, not only whole-index percentage, because one verbose field can dominate.

Position conventions must also survive segment boundaries and analyzer upgrades. Store the field's index-option and analyzer version in segment metadata, and reject incompatible merges. Mixing segments where one counted removed tokens as gaps and another compressed positions can make identical source phrases behave differently depending on ingestion date, a correctness failure that average index-size monitoring will never reveal.

## Phrase Query Evaluation with Positions

A phrase query such as `"vector database"` requires the terms in the same document at consecutive positions in the specified order. Evaluation has two stages:

1. Intersect document-ID postings to find documents containing every term.
2. Within each candidate document, intersect positional lists with required offsets.

Suppose:

```
vector   in doc 7: [2, 10, 20]
database in doc 7: [3, 12, 21]
```

For a two-term phrase, seek pairs where `database_position = vector_position + 1`. Matches occur at `(2,3)` and `(20,21)`; `(10,12)` has a one-token gap and does not match at exact slop zero.

The positional merge resembles document intersection. Maintain cursors into sorted position lists. Compare $p_v+1$ with $p_d$. If equal, record a phrase occurrence and advance appropriately. If $p_v+1<p_d$, advance vector; otherwise advance database. Work is linear in the two position-list lengths for that document.

For `"neural vector database"`, anchor on one term and require offsets. If `neural` occurs at position $p$, require `vector` at $p+1$ and `database` at $p+2$. Implementations can progressively merge positional matches or maintain several cursors. The output may retain phrase start positions for scoring or highlighting.

Worked document:

`neural vector database and vector database`

Positions are `neural:[1]`, `vector:[2,5]`, `database:[3,6]`. `"vector database"` matches starts 2 and 5. `"neural vector database"` matches start 1 only. Document-level Boolean AND would say all three terms occur but could not distinguish these arrangements.

**Slop** relaxes exact adjacency. A query may allow terms within a positional distance, sometimes preserving order and sometimes allowing transposition depending on engine semantics. Because definitions differ, product code must test its search engine rather than assume one universal interpretation. A proximity query `vector NEAR/5 database` similarly examines distances rather than exact offsets.

Repeated terms need care. Phrase `"to be or not to be"` has `to` and `be` twice. The algorithm must match complete positional sequences without reusing one occurrence incorrectly. Stop-word removal makes exact verification impossible if omitted terms have no postings, even when gaps preserve the distance between retained terms.

Phrase cost depends on both document frequency and within-document frequency. Common terms can create many candidate documents and many positional combinations. Start document intersection with selective terms, but all phrase terms and positions are still needed for verification. A rare anchor can drastically reduce positional work.

Fields and boundaries matter. A phrase should not cross from title to body merely because flattened positions are consecutive. Index fields separately or insert a sufficiently large position gap. Similar gaps prevent phrases crossing array elements, paragraphs, or documents when the product treats them as boundaries.

Judgment: phrase matching is high precision but fragile under tokenization, stemming, synonyms, and stop policy. Analyze the quoted query with phrase-aware rules, preserve source order, and expose looser matching separately instead of silently redefining quotation marks. Validate with adversarial examples containing repeated terms, removed stop words, punctuation, and field boundaries.

## Skip Pointers: Faster Intersection for Extra Storage

Basic postings intersection advances one document ID at a time. If one cursor is far behind, many comparisons merely confirm that intermediate IDs are too small. A **skip pointer** adds a shortcut from one posting to a later posting, labeled with its destination document ID.

Suppose:

```
A = [2, 4, 8, 16, 32, 64, 128]
B = [2, 128]
```

After matching 2, B points at 128 while A points at 4. Without skips, A compares 4, 8, 16, 32, and 64 against 128. If A has a skip from 4 to 32 and from 32 to 128, the cursor can jump while the skip destination is no greater than the opposing ID, reaching 128 with fewer comparisons.

Correctness rule: take a skip only when its destination cannot leap past a possible match. During AND, if A's skip destination is $\le B[j]$, advancing to it discards only IDs smaller than or equal to the target; equality can still be tested at the destination. If the destination exceeds B's current ID, do not take it, because A may contain B's ID before the destination.

Classic layouts place about $\sqrt{L}$ evenly spaced skips in a list of length $L$, producing skip spans around $\sqrt{L}$. This is a heuristic balance: more skips offer shorter jumps but consume more bytes and branch checks; fewer skips save space but bypass less work. Modern formats often store block-level maximum IDs, enabling the same principle at compressed-block granularity.

Worked cost: a million-entry common-term list intersects a thousand-entry rare list. A pure merge may scan large regions of the common list. Skips, galloping search, or binary search can seek toward each rare candidate. Two similarly dense lists with frequent matches provide fewer jump opportunities; sequential decoding may be faster than testing skips.

Skip benefit depends on query pairing and distribution, not list length alone. Evenly spaced skips perform poorly if IDs cluster and gaps vary. Hierarchical skips support large and small jumps but add metadata. Compressed blocks already impose natural checkpoints, and decoding a whole small block can be cheaper than navigating fine-grained pointers.

Updates complicate skips. Inserting document IDs into a mutable list can invalidate positions and spacing. Immutable segments build skips once after postings are finalized; segment merges rebuild them for new lists. This is another reason search indexes favor immutable sorted segments.

Skips improve traversal, not asymptotic worst-case output. Intersecting two identical million-entry lists must emit one million results, so work remains $\Omega(1{,}000{,}000)$. In adversarial layouts, few skips are usable and the algorithm remains $O(m+n)$. Their value is reducing actual comparisons and decoded bytes on favorable unequal lists.

Judgment: store skips where measured workloads justify them, especially long lists frequently intersected with selective constraints. Avoid universal fine-grained skips on tiny lists, where metadata exceeds saved work. Benchmark end-to-end with compression and cache behavior; a skip that saves integer comparisons but causes random reads can lose to a sequential decoder. Extra structure earns its bytes only when it avoids a more expensive operation.
