An index builder must reorder more data than memory can hold: tokens arrive grouped by document, but an inverted index must group them by term and then document ID. External merge sort solves that physical mismatch using sequential I/O, bounded memory, and a merge whose output is already in index order. It is the foundational batch primitive behind search segments, warehouse sort stages, and many compaction jobs.

## External Merge Sort: Runs, Merging, and Memory Limits

An in-memory comparison sort assumes all $N$ records fit in RAM. When they do not, treating storage like slow random-access memory performs terribly: comparisons trigger scattered page reads, and swapping distant records multiplies I/O. **External merge sort** designs around the real cost model by doing nearly all storage access sequentially.

The first phase is **run generation**:

1. Read up to $M$ records, the amount that fits the memory budget.
2. Sort those records in memory.
3. Write the sorted block as an immutable **run**.
4. Repeat until all input is consumed.

If $N=1$ TB and usable sort memory is 8 GB, simple run generation produces approximately $\lceil1024/8\rceil=128$ sorted runs. Each input byte is read once and written once during this phase. The run files individually satisfy order but overlap in key ranges.

The merge phase reads the run heads and repeatedly emits the smallest remaining record. With enough input buffers and file handles, all 128 runs can be merged in one pass. Otherwise, merge a bounded number at a time into larger runs, then repeat. If the **fan-in** is $F$, the number of merge levels is $\lceil\log_F R\rceil$ for $R$ initial runs. Each level reads and writes the entire dataset once, so total storage traffic is approximately $2N$ for run generation plus $2N$ per merge level.

Worked comparison: 128 runs with fan-in 16 need $\lceil\log_{16}128\rceil=2$ merge levels. One terabyte is read and written during run generation, then read and written twice more, about 6 TB of total I/O. Raising fan-in to 128 permits one merge level and about 4 TB, but requires 128 input buffers and open streams. The largest possible fan-in is not automatically best if it makes each buffer tiny, exceeds file-descriptor limits, or causes inefficient small reads.

Correctness follows from an invariant: each run is sorted, and the smallest un-emitted record globally must be one of the current run heads. Emitting the smallest head and advancing only that run preserves the invariant. Once all runs are exhausted, every record has been emitted in nondecreasing order.

**Replacement selection** can create initial runs longer than memory. Maintain a heap of records; after emitting the minimum, admit the next input record into the current run if it is at least the last output, otherwise freeze it for the next run. Under random input, runs average roughly twice the number of records fitting memory. This reduces later merge work but complicates the builder; straightforward chunk-sort runs are often preferable when simplicity and parallel generation matter.

Judgment centers on I/O and restartability. Large sequential reads and writes amortize object-store requests and saturate disks. Run files should be checksummed, named deterministically, and committed only after complete writes, so a failed job can reuse valid runs rather than restart from raw input. Compression reduces I/O if decoding stays cheaper than moving saved bytes. Stable sorting may be necessary when equal keys must preserve original order, but an index builder can usually encode the full deterministic tie-break key, such as `(term, doc_id, position)`, and use any correct sort.

Memory accounting must include more than record payload. Sort implementations need pointer arrays or temporary merge buffers; variable-length strings carry offsets; the runtime and decoder need working space. If an “8 GB run” is sized from raw fields alone on an 8 GB worker, allocation failure arrives during the sort. Production builders set a conservative explicit budget, spill before reaching it, and measure peak resident memory with realistic skew. More, smaller valid runs are cheaper than repeatedly crashing while attempting an oversized run.
The budget must also leave headroom for operating-system caching, monitoring agents, and concurrent readers sharing the worker.

## K-way Merge with a Heap

Merging two runs needs two cursors and $O(N)$ time. For $K$ runs, scanning all $K$ heads to find the next minimum costs $O(K)$ per emitted record, or $O(NK)$ overall. A min-heap reduces the choice to $O(\log K)$ while holding one candidate per run.

Initialize the heap with each nonempty run's first record, stored as `(key, run_id, record)`. Then:

1. Extract the smallest heap entry and write its record.
2. Read the next record from the same `run_id`.
3. Insert that next record if the run is not exhausted.
4. Repeat until the heap is empty.

Heap size never exceeds $K$. Initialization via heapify costs $O(K)$; each of $N$ records is extracted once and, except for final records, causes one insertion. Time is $O(N\log K)$ and heap memory is $O(K)$, plus one I/O buffer per run and an output buffer.

Worked example: runs are $A=[2,8,20]$, $B=[1,8,9]$, and $C=[3,7,30]$. Initialize heads `(2,A)`, `(1,B)`, `(3,C)`. Emit 1 and replace B's head with 8; emit 2 and replace A with 8; emit 3 and replace C with 7; then emit 7, 8 from A, 8 from B, 9, 20, 30 according to the tie-break. The result is sorted, and only three heads compete at any moment.

Equal keys require deterministic ordering. Include `run_id` or a stable secondary key in heap comparison so the comparator is total; otherwise some priority-queue implementations treat equal items inconsistently. For index construction, sort by `(term, doc_id, position)`, not merely term. That makes all postings for a term consecutive, document IDs ordered, and positions ordered inside a document. Duplicate tuples can then be detected adjacently.

The heap does not dominate physical cost in every regime. With $K=128$, $\log_2K=7$, modest next to reading and decoding each record. With extremely large $K$, heap comparisons, tiny per-run buffers, and random alternation among streams can reduce throughput. Multi-level merging uses a practical fan-in to trade another full I/O pass against efficient buffering and manageable resource use.

Object storage adds a specific judgment. Each run is a large immutable object; range reads or streaming downloads provide sequential input. Writing the merged object under a temporary name and publishing a manifest only after validation prevents readers from observing a partial result. Do not emulate local random writes to one object, because object stores are optimized for whole-object or range operations rather than in-place mutation.

Parallelism occurs across independent merge groups at early levels. At the final level, key-range partitioning can produce multiple final outputs, but boundaries must be chosen so identical keys do not split incorrectly unless downstream formats support continuation. The heap algorithm remains local to each partition; orchestration decides which runs and key ranges it owns.

## Why Index Construction Is a Sorting Problem

Documents arrive one at a time. Tokenizing document 42 yields records such as `(vector,42,5)`, `(index,42,6)`, and `(vector,42,19)`. This stream is naturally ordered by document processing, not by term. An inverted index requires:

```
index  -> [(42, [6]), ...]
vector -> [(42, [5,19]), ...]
```

All occurrences of the same term must become adjacent, and within each term document IDs and positions should increase. Sorting occurrence tuples by `(term, doc_id, position)` performs exactly that transformation. A single sequential pass over sorted tuples then groups equal terms, gap-encodes increasing IDs and positions, and writes dictionary entries pointing to each completed postings list.

Worked micro-example: document 1 contains `blue vector`; document 2 contains `blue index`; document 3 contains `vector index`. Tokenization emits in document order:

`(blue,1,1), (vector,1,2), (blue,2,1), (index,2,2), (vector,3,1), (index,3,2)`.

After sorting:

`(blue,1,1), (blue,2,1), (index,2,2), (index,3,2), (vector,1,2), (vector,3,1)`.

The builder streams this once to write postings `blue:[1,2]`, `index:[2,3]`, and `vector:[1,3]`, with positions attached. No corpus-wide random insertion is needed.

This matters because the tempting alternative is a giant in-memory map from term to growing postings. It works only while the vocabulary, postings buffers, and object overhead fit RAM. Spilling individual lists independently creates huge numbers of small random writes and a difficult consistency problem. Sorting converts those scattered updates into immutable sequential runs and one ordered output stream.

Blocked index construction applies the external-sort recipe directly. Parse a memory-sized document block, accumulate occurrence tuples, sort them, and write a run or partial index. Repeat, then merge runs by term and document ID. Runs may aggregate repeated term-document occurrences before writing, reducing merge volume. The final merge can build the term dictionary and postings file simultaneously because term boundaries arrive in order.

Sorting also creates compression opportunities. Increasing document IDs become small gaps; increasing positions within a document do the same. Repeated term keys need not be stored on every occurrence after grouping. The output layout supports sequential query traversal and binary-searchable or FST-backed dictionary lookup. The construction order is therefore chosen for the serving representation, not merely for aesthetic ordering.

Judgment changes for dynamic indexes. Re-sorting the entire corpus after every document is absurd. Instead, build small immutable sorted segments for new data, serve across them, and merge segments in the background. This turns updates into an ongoing sequence of external merges, with write amplification traded for bounded query-time segment count. Deletions can live in tombstone bitsets until merge removes them physically.

The transferable insight is that grouping at scale is often sorting in disguise. SQL `GROUP BY`, distributed shuffle, LSM compaction, and inverted-index construction all route equal keys together and then reduce them. Hash partitioning can perform the routing, but each durable ordered output still benefits from sorting. Once the desired final grain and order are specified, the external-sort design follows: emit key-bearing records, create sorted runs within memory, and merge them sequentially into the serving artifact.
