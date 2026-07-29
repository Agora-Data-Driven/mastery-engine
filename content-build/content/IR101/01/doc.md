Lexical retrieval begins by reversing the corpus. Documents arrive as sequences of terms, but a query needs to ask which documents contain a term without scanning every document. The inverted index performs that reversal, storing only observed term-document relationships in an order that makes Boolean intersection and later scoring efficient. Its structure is a sparse matrix represented by columns of nonzero entries, not a mysterious search-specific database.

## Term-Document Incidence and Why Matrices Do Not Scale

Let the vocabulary contain $V$ terms and the corpus contain $N$ documents. A **term-document incidence matrix** $A$ has one row per term and one column per document:

$$
A_{t,d} =
\begin{cases}
1 & \text{if term }t\text{ occurs in document }d\\
0 & \text{otherwise}
\end{cases}
$$

For three documents:

- d1: `vector search`
- d2: `database search`
- d3: `vector database`

the binary matrix is:

| term | d1 | d2 | d3 |
|---|---:|---:|---:|
| vector | 1 | 0 | 1 |
| search | 1 | 1 | 0 |
| database | 0 | 1 | 1 |

A Boolean AND query for `vector database` performs a row-wise logical AND: `[1,0,1] AND [0,1,1] = [0,0,1]`, returning d3. The model is mathematically clean and generalizes to counts or weights instead of bits.

The physical problem is sparsity. A realistic corpus might have $N=100$ million documents and $V=10$ million distinct terms. A dense binary matrix needs $10^{15}$ cells. Even at one bit each, that is $1.25\times10^{14}$ bytes, about 125 TB. Most cells are zero because one document contains perhaps hundreds of distinct terms, not millions.

Suppose each of 100 million documents contains 300 distinct indexed terms. The number of nonzero term-document pairs is about 30 billion. Storing only those pairs is still large, but it is over 30,000 times fewer entries than $10^{15}$. Compression later shrinks their ordered document IDs further.

Scanning a dense term row is also wrong for rare terms. If `quokka` occurs in 20 documents, reading a 100-million-bit vector spends nearly all work proving absence. A sparse representation directly stores those 20 document IDs. Query cost should scale with occurrences, not corpus size.

Dense bitmaps are not useless. For a frequent Boolean attribute such as `language=en` or `published=true`, one bit per document can be compact and intersections can process machine words or SIMD vectors rapidly. Compressed bitmap formats exploit long zero or one runs. The judgment depends on density and operation: sparse postings for terms with few matches; bitmaps for sufficiently dense filter sets and repeated bitwise operations.

The matrix remains the conceptual contract. A postings list is simply the list of column indexes where one matrix row is nonzero. This view prevents confusion when adding term frequency, positions, or weights: those enrich the nonzero entries without changing the underlying reversal.

## The Inverted Index: Dictionary and Postings

An inverted index has two primary components:

1. A **dictionary** mapping each normalized term to metadata and a pointer or offset.
2. A **postings list** containing ordered document IDs where that term occurs, often plus frequency and positions.

Index the earlier corpus after assigning IDs d1=1, d2=2, d3=3:

```
database -> [2, 3]
search   -> [1, 2]
vector   -> [1, 3]
```

The index is “inverted” because the forward representation maps document to terms, while this representation maps term to documents. A search engine commonly retains stored document fields or a separate document store because postings alone do not reconstruct the original text.

Construction starts with analysis: transform each document into normalized tokens, emit occurrence tuples `(term, doc_id, position)`, sort by that tuple, then group equal terms. For d1 `vector search`, emissions are `(vector,1,1)` and `(search,1,2)`. Once all occurrences are sorted, equal terms and increasing document IDs are adjacent, letting the builder stream postings to disk and record each list's byte offset in the dictionary.

Term metadata commonly includes **document frequency** $df_t$, the number of documents containing term $t$, and perhaps collection frequency, the total occurrence count. Document frequency here is 2 for every example term. The distinction matters: a document repeating `vector` ten times contributes one to document frequency but ten to collection frequency.

Postings can carry payload:

```
vector -> [(doc=1, tf=1, pos=[1]),
           (doc=3, tf=1, pos=[1])]
```

Document IDs are sorted, enabling intersection and gap compression. Positions support phrases and proximity later. Term frequency supports ranking later. Each field costs storage and decode time, so an index omits features the product never uses.

Dictionary implementation follows the prior course: a hash table favors exact term lookup; a sorted array or FST supports compact storage and prefix enumeration. The dictionary is much smaller than postings because it has one entry per term rather than one per term-document pair, but a noisy corpus can create millions of one-off strings. Vocabulary controls such as normalization and quality filtering affect both relevance and memory.

Worked lookup for `vector`: analyze the query with the same analyzer used at indexing, look up normalized `vector` in the dictionary, seek to its postings offset, decode `[1,3]`, and fetch or score those documents. If query and index normalization differ, a logically present term can miss because the lookup key differs.

Updates commonly create immutable index segments. New documents produce a new dictionary and postings set; queries search several segments, while background merges combine ordered terms and postings. Deletions use tombstones until merging removes entries. This avoids random insertion into compressed files but introduces segment and merge management.

Judgment: the inverted index is a derived serving artifact, not the authoritative corpus. Store stable document IDs and analyzer/version metadata so it can be rebuilt. Validate postings order, document-frequency counts, and source-to-index coverage. A corrupt offset can misread an entire list; checksums and versioned publish-after-build make replacement safer than in-place repair.

## Boolean Query Processing by Intersecting Postings

For an AND query, retrieve each term's sorted postings and compute their intersection. The two-cursor algorithm compares current document IDs, emits a match when equal, and advances the smaller ID otherwise. With list lengths $m$ and $n$, work is $O(m+n)$ and needs constant cursor state besides output.

Example:

```
vector   -> [1, 3, 7, 10, 14]
database -> [2, 3, 6, 10, 12, 14]
```

Compare 1 with 2 and advance `vector`; compare 3 with 2 and advance `database`; match 3; compare 7 with 6 and advance `database`; compare 7 with 10 and advance `vector`; match 10; then eventually match 14. Result: `[3,10,14]`.

OR computes a sorted union. When IDs match, emit once and advance both; otherwise emit the smaller and advance its cursor. NOT requires a universe. `vector AND NOT database` subtracts database postings from vector postings, returning `[1,7]`. Materializing the complement of a rare term over all document IDs is expensive, so negation is usually applied as exclusion while traversing a positive candidate list.

For three AND terms, intersect an initial pair, then intersect the result with the third list. Because each intersection can only shrink, the intermediate result is sorted and compatible with the next merge. A multiway implementation can advance several cursors toward the current maximum ID, but the same monotone-order principle applies.

Phrase queries cannot be resolved by document IDs alone. Intersect document postings to find candidates containing all terms, then compare positions inside each candidate to enforce adjacency and order. That later lesson depends on this Boolean candidate stage.

Skip pointers or exponential advances can jump a lagging cursor when lists are imbalanced. But skipping has overhead and cannot avoid output work. Dense equal lists require processing many matches. Modern postings codecs often operate in blocks and attach block maximum IDs, enabling a decoder to skip blocks without expanding every integer.

Judgment includes representation switching. Two dense bitmaps intersect with word-wise AND faster than cursor-merging millions of IDs; two sparse lists favor postings. Some engines choose dynamically by list density. The semantic result is identical, while the physical representation changes.

Always distinguish set Boolean retrieval from ranked retrieval. AND returns documents satisfying a logical condition, with no inherent order. A ranked engine may use “should” semantics where matching more terms raises score without requiring all. The same postings feed both, but the query operator defines eligibility.

## Query Optimization: Processing Rarest Terms First

Document frequency predicts postings length. For an AND query, process the rarest term first because the result can never contain more documents than the shortest list. Small early intermediates reduce later comparisons, decoding, memory, and scoring.

Suppose:

```
the        df = 80,000,000
database   df = 2,000,000
vectorized df = 5,000
```

Intersecting `the` and `database` first can scan roughly 82 million postings and produce a large intermediate before `vectorized` discards almost all of it. Starting with `vectorized` yields at most 5,000 candidates; probing or intersecting those against the other lists performs dramatically less useful work. The final Boolean set is commutative, but execution cost is not.

For similarly sized lists, sequential merging is efficient. For a tiny list against an enormous list, iterate the tiny candidates and seek or gallop within the large list. The optimizer therefore uses both document frequency and available skip/seek structures, not only a fixed pairwise merge order.

Term statistics must match the live index. If an analyzer change makes a term common but stale metadata calls it rare, planning can choose a poor order. Segment-level frequencies complicate estimates because one term may be dense in a specialized segment and absent elsewhere. Aggregate statistics or plan per segment where the engine supports it.

OR queries differ: every list contributes results, so rarest-first does not shrink eligibility in the same way. Ordering may still affect heap use, deduplication, and scoring optimizations, but the AND proof does not transfer. Negation also cannot seed a useful candidate set because its complement may be enormous; begin with positive constraints.

Worked conjunctive query `neural vector database` has frequencies 500,000, 200,000, and 2,000,000. Start with `vector`, then `neural`, then `database`, unless measured distribution or access structures justify a different pairing. If the first intersection returns only 700 IDs, later work operates on 700 candidates rather than hundreds of thousands.

Rarest-term-first can hurt if the rare term's postings are expensive to access remotely while a slightly larger list is cached, or if the rare term is optional rather than required. Cost-based optimization combines cardinality with I/O location, compression, cache state, and operator semantics. Document frequency is the stable first approximation, not a complete latency model.

The expert habit is to inspect query terms as filters: which condition removes the most candidates at the lowest cost? In an inverted index, document frequency provides that selectivity signal nearly for free. Processing selective constraints early is the search equivalent of pushing SQL filters below a join.
