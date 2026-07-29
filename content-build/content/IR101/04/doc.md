An inverted index is too large to assemble as one in-memory term map, and a production corpus does not stop changing after its first build. Construction therefore creates sorted immutable pieces under a memory bound, while update policy decides when to merge those pieces or replace the whole index. These are not maintenance details: they govern freshness, query fan-out, write amplification, recovery, and whether a failed build can safely resume.

## Blocked Index Construction: Build Runs, Merge Runs

**Blocked sort-based indexing** partitions the input into blocks that fit a controlled memory budget. For each block:

1. Parse documents and apply the versioned analyzer.
2. Emit occurrence records `(term, doc_id, position)`.
3. Sort records by term, then document ID, then position.
4. Group records into a partial dictionary and postings lists.
5. Write an immutable sorted run or partial index.

After all blocks are built, merge their sorted term dictionaries. Equal terms from different runs meet in the merge; their already sorted document postings are merged into one final list. The final writer records dictionary offsets and encodes document and position gaps.

Worked example uses three input blocks:

```
run A: cloud->[1,4], vector->[2]
run B: database->[5], vector->[3,6]
run C: cloud->[8], search->[7], vector->[9]
```

A three-way term merge emits:

```
cloud    -> [1,4,8]
database -> [5]
search   -> [7]
vector   -> [2,3,6,9]
```

Only current term heads and postings buffers need be active. The merge is sequential over immutable files rather than random insertion into one giant postings structure.

If total emitted occurrences are $T$ and a block holds $M$, the builder creates roughly $\lceil T/M\rceil$ initial runs. Sorting each run costs $O(M\log M)$ comparisons; across all runs this is $O(T\log M)$. The external merge then processes every occurrence through one or more levels, with I/O proportional to the dataset per level. Memory remains bounded.

Local aggregation reduces run size. If term `vector` appears five times in one document, the block can combine those occurrences into one posting containing five positions before writing. Duplicate documents or repeated ingestion must be resolved by stable source IDs and build policy, not by hoping the merge recognizes semantic duplicates.

Parallel workers can build blocks independently because document-ID ranges or input partitions define ownership. Deterministic IDs and analyzer versions are essential: if workers assign IDs from local counters or use different tokenization, merging creates collisions or inconsistent keys. A manifest should record each run's input scope, checksum, record counts, minimum and maximum term, analyzer version, and completion state.

Failure recovery follows immutable outputs. Write a run under a temporary name, validate counts and checksum, then add it to the manifest. A retry for the same deterministic block either reuses the committed run or replaces the uncommitted temporary artifact. The final index is published only after all expected blocks and validation gates pass.

Memory budgeting includes token strings, positions, sort pointers, runtime overhead, and output buffers. Highly repetitive or unusually long documents can exceed assumptions; builders should cap individual document size or spill safely rather than crash the block. Increasing block size creates fewer runs and merge work but raises peak memory and retry cost.

Judgment: blocked construction is ideal for reproducible batch indexes. It yields compact globally ordered postings and makes validation natural, but freshness is limited by build duration. It also requires enough temporary storage for runs plus final output. Construction metrics should reconcile source document count, indexed count, rejected documents, vocabulary, postings, and bytes before cutover; a syntactically valid index can still omit an input block.

## Merge-Based Dynamic Index Updates (Logarithmic Merge)

For dynamic updates, rebuilding the full corpus after every arrival is wasteful. A **logarithmic merge** keeps a hierarchy of immutable indexes whose capacities grow geometrically, analogous to binary digits or an LSM tree.

Let level 0 hold up to $B$ postings or documents, level 1 up to $2B$, level 2 up to $4B$, and so on. New documents first form a small sorted level-0 segment. If level 0 is occupied, merge the two size-$B$ segments into one size-$2B$ segment at level 1. If level 1 is occupied, merge again and carry to level 2. A single insertion batch can cascade upward exactly like adding one to a binary counter.

Worked example with $B=1{,}000$ documents:

- After batch 1: L0 contains 1,000.
- Batch 2 collides at L0; merge into L1 containing 2,000.
- Batch 3 occupies L0 and leaves L1 unchanged.
- Batch 4 first creates 2,000 at L1, collides with existing L1, and merges into L2 containing 4,000.

After $N$ base batches, at most one segment occupies each level, so there are $O(\log N)$ segments. A document can be rewritten once per level as merges carry it upward, giving $O(\log N)$ write amplification in the simple model rather than rewriting the full corpus per batch.

Queries must search all live segments and merge their results. Term lookup checks each segment dictionary; Boolean or ranked results then combine document IDs and scores. With at most logarithmically many levels this is bounded, but more segments still add seeks, dictionary probes, duplicate resolution, and per-segment statistics. Background merging trades write I/O for lower query fan-out.

Updates and deletes require version semantics. A newer segment can contain a replacement for a stable document ID while older content still exists below. Queries must prefer the newest version or consult a live-doc/version map. A deletion writes a **tombstone** that suppresses older postings; the record disappears physically only when a merge includes both the tombstone and obsolete data. Until then, tombstones and superseded postings consume space and query work.

Merging two inverted segments walks term dictionaries in order. For equal terms, merge their sorted postings while resolving duplicate document IDs by generation. Terms present on one side pass through. Because output is new and immutable, readers can continue using old segments until the new segment is validated and a manifest atomically replaces the old set.

Concurrency needs generation IDs. A merge snapshots input segments; documents arriving later enter another segment and are not lost. At commit, verify the inputs are still live, then atomically publish the new manifest containing the merged output plus any newer segments. Garbage-collect old segments only after no reader references them.

Judgment knobs include size ratio, level versus tier strategy, merge concurrency, and throttling. Aggressive merges reduce read amplification and reclaim deletes but consume I/O and CPU that may hurt ingestion or queries. Delayed merges improve write throughput but leave many segments and stale bytes. Monitor segment count, tombstone ratio, merge backlog, bytes written per source byte, and query latency.

## Rebuild vs Merge: Index Update Strategy Tradeoffs

A **full rebuild** reads the authoritative corpus and constructs a new index from scratch. An **incremental merge** incorporates changed data into existing index state. The choice is a cost and correctness decision, not a maturity ladder where incremental is always superior.

Full rebuild strengths:

- Produces one coherent artifact under one analyzer and schema version.
- Physically removes deletes, superseded documents, and accumulated fragmentation.
- Self-heals drift because output is derived again from authoritative sources.
- Simplifies validation and rollback through build-version aliases.

Its weaknesses are latency, compute, temporary storage, and freshness. A ten-hour build cannot reflect events arriving during the build unless it uses a snapshot plus a catch-up delta. Rebuilding a petabyte to update 0.01% of documents is severe write amplification.

Incremental merge strengths are low update latency and work proportional to changes plus merge amplification. It fits continual ingestion. Its weaknesses are operational state: segments, tombstones, version precedence, background backlog, and mixed analyzer generations. Bugs and missed deletes can persist until reconciliation.

Worked decision: a 10-million-document research corpus changes 5,000 documents daily. A nightly full rebuild rewrites all 10 million for a 0.05% delta. Small daily segments plus scheduled merging are efficient. A monthly full rebuild or source-to-index reconciliation bounds drift. Conversely, a 50,000-document policy corpus changes weekly and builds in four minutes; full replacement is simpler, self-healing, and likely cheaper than permanent merge machinery.

Analyzer changes force a broader view. New stemming or tokenization changes keys and term statistics. Mixing old and new analysis across segments creates inconsistent retrieval, so build a complete new version or reprocess every old segment. Schema changes adding positions similarly require reindexing source text; a merge cannot invent payload absent from old postings.

Large deletion waves can favor rebuild. If 40% of documents are removed, writing tombstones and carrying dead postings through several merges wastes space and query work. A rebuild emits only live data. Small frequent deletes favor tombstones plus normal compaction.

Atomic cutover is required for both strategies. A rebuild publishes a versioned index and switches an alias after shadow validation. A merge publishes a new segment manifest only after output is durable. Never expose a directory while files are being replaced individually; mixed dictionaries and postings offsets corrupt reads.

The professional default is often hybrid: incremental segments meet freshness, merges control fan-out, and periodic reconciliation or rebuild proves the index still matches source truth. Trigger rebuilds on analyzer/schema changes, high deleted-byte ratio, unexplained count drift, or when cumulative merge cost approaches replacement cost.

Compare costs explicitly. Let corpus size be $S$, daily changed bytes $\Delta$, and merge write amplification $W$. Incremental daily write cost is roughly $W\Delta$; rebuild cost is roughly $S$ plus temporary output. But include query read amplification, operational labor, and incident risk. If $S$ is small enough that rebuild is routine, simplicity has measurable value.

Judgment question: what failure should the system heal automatically? Rebuild heals historical index state from the source. Merge preserves existing state efficiently, including any undetected mistakes. Whichever path is chosen, stable IDs, deterministic analysis, manifests, counts, golden queries, and rollback versions are the controls that make update strategy a reversible engineering choice rather than a leap of faith.
