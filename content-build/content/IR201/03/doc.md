Dense vectors solve semantic matching only if nearby candidates can be found within the latency and memory budget. Exact comparison is simple but becomes expensive at corpus scale, so production systems deliberately trade a small amount of recall for much less work. IVF, HNSW, and product quantization make different approximations, and their tuning only makes sense against a measured exact baseline.

## Why Exact k-NN Does Not Scale

Exact k-nearest-neighbor search computes a distance or similarity between the query and every indexed vector, then retains the best k. For N vectors of d dimensions, scoring requires work proportional to N times d. Finding the largest scores adds selection work, though the dense comparisons usually dominate.

With ten million 768-dimensional float vectors, one query requires 7.68 billion coordinate multiplications for brute-force dot products. Raw float32 storage is 10,000,000 times 768 times 4 bytes, or 30.72 GB, before IDs and index structures. Parallel accelerators can make exact search viable at moderate scale, and matrix multiplication is highly optimized, but cost and latency grow directly with the corpus.

Exact search remains valuable. It establishes ground-truth neighbors for an evaluation subset and detects whether an approximate index loses relevant vector candidates. It can also be the right production choice for tens of thousands of vectors, heavily filtered small partitions, offline jobs, or hardware that can batch many queries efficiently. Approximation has overhead and complexity, so no fixed corpus size automatically requires it.

An approximate nearest-neighbor index avoids scoring most vectors. The core metric is ANN recall@k: among the exact top-k neighbors, what fraction did the approximate search return? This is index recall, distinct from retrieval relevance recall. An index can reproduce an embedder's exact neighbors perfectly even when the embedder ranks irrelevant content.

Build a benchmark with representative query vectors, compute exact results, then sweep index parameters. Report p50 and p95 latency, throughput, memory, build time, update behavior, and ANN recall. Filters must be represented because a fast unfiltered index may behave poorly when only a tiny authorized subset is eligible.

Exact baselines can be computed offline for a few thousand held-out queries even when serving the entire corpus exactly would be too expensive. Freeze the corpus snapshot, model version, metric, and tie-breaking rule so later index builds are comparable. If filters define the eligible set, compute exact neighbors inside that same set. Comparing a filtered ANN result with an unfiltered exact list would label correct filtered behavior as a recall failure.

## IVF: k-Means Partitioning of the Vector Space

An inverted file vector index partitions the embedding space into coarse cells. Training runs k-means on representative vectors to learn centroids. Each document vector is assigned to its nearest centroid, producing posting lists of vector IDs and payloads. At query time, the system finds the nearest centroids and scans only their lists.

Suppose 1,000,000 vectors are distributed evenly across 1,000 cells. One list contains about 1,000 vectors. Probing 10 cells examines roughly 10,000 candidates, about one percent of the corpus, plus centroid comparisons. The real distribution is rarely even, and vector clusters can be skewed.

The main search control is commonly called `nprobe`: the number of coarse cells searched. A larger value increases the chance of visiting the cell containing a true neighbor but performs more comparisons. Probing one cell is fast yet brittle near cell boundaries. If query q lies almost equally between centroids A and B, its true closest vector may be assigned to B while q is assigned to A. Probing both cells repairs that miss.

The number of lists also trades coarse precision against overhead. Too few lists leave large scans. Too many produce tiny cells, expensive centroid selection, sparse training, and maintenance complexity. Centroids must be trained on vectors representative of production languages, domains, and model versions. A distribution shift can create overloaded or semantically poor cells.

IVF supports clear physical partition intuition and works well with compressed codes. It also needs a training and rebuild lifecycle. Inserts can be assigned to existing centroids, but enough drift justifies retraining. Monitor list-size imbalance, query probe counts, recall by segment, and the fraction of results removed by post-filtering.

## HNSW: Layered Greedy Graph Search

Hierarchical navigable small world indexing builds a proximity graph. Each vector is a node connected to selected nearby nodes. Upper layers contain progressively fewer nodes and provide long jumps; the bottom layer contains all nodes and supplies detailed local navigation. Search enters at an upper layer, greedily moves to a closer neighbor, descends, and maintains a candidate frontier near the query.

Imagine an upper layer with representatives for broad regions. Starting at node A, the query is closer to A's neighbor F, then to F's neighbor M. At the next layer, M leads to nodes near the target neighborhood. Instead of checking every point between A and the target, graph edges create shortcuts, recalling the role of navigable links in a well-connected network.

`M`, or a similarly named construction parameter, controls roughly how many neighbor connections each node keeps. More links improve navigability and recall but increase memory and build work. `efConstruction` controls the breadth used while finding neighbors for a new node; higher values generally improve graph quality at slower construction. `efSearch` controls the query-time candidate frontier; raising it usually improves recall and costs latency.

Greedy traversal alone can enter a local neighborhood that looks good but is not globally best. The hierarchical entry and wider frontier reduce this risk but do not eliminate it. Disconnected or weakly connected regions, aggressive parameter settings, and unusual filtered subsets can cause misses.

HNSW often provides strong low-latency recall without a separate centroid-training phase. Its graph consumes substantial memory beyond raw vectors, construction can be expensive, and deletion or high update churn may require maintenance or rebuild strategies. Metadata filtering can be especially difficult if traversal visits many disallowed nodes. Benchmark the actual engine's pre-filter, in-traversal filter, or post-filter behavior.

## Product Quantization: Compressing Vectors

Product quantization compresses a vector by splitting it into subvectors and replacing each subvector with the ID of a learned centroid. If a 768-dimensional vector is split into 96 groups of 8 dimensions and each group has 256 centroids, each group needs one byte to select a centroid. The vector code uses 96 bytes instead of 3,072 float32 bytes, a 32-fold reduction before overhead.

Training runs k-means separately in each subspace. The Cartesian product of subspace codebooks represents an enormous set of possible reconstructed vectors without storing one centroid for every combination. Compression error arises because each original subvector is replaced by its nearest codeword.

At query time, asymmetric distance computation keeps the query uncompressed. For each subspace, the system builds a lookup table of distances or dot products between the query subvector and every codeword. A database code is scored by summing the table entries addressed by its byte IDs. This replaces many floating-point coordinate operations with compact lookups and additions.

More subspaces or larger codebooks can reduce distortion but use larger codes, tables, or training work. Poorly balanced dimensions waste capacity because product quantization assumes the chosen subspaces can be quantized usefully. Rotations such as optimized product quantization can distribute variance more favorably.

PQ often works with IVF: IVF narrows the searched cells and PQ compresses and rapidly scores their contents. The system may rerank the best approximate candidates using original full-precision vectors stored elsewhere. This two-step approach recovers quality while keeping the main index compact.

## The Recall-Latency-Memory Triangle

ANN configuration balances three resources. Searching more IVF cells or a wider HNSW frontier improves recall but increases latency and compute. More HNSW links improve graph navigation but consume memory. Stronger PQ compression saves memory and bandwidth but introduces distance error that can lower recall.

There is no universal best setting. Suppose an HNSW sweep gives:

| efSearch | ANN recall@10 | p95 latency |
|---:|---:|---:|
| 20 | 0.91 | 8 ms |
| 80 | 0.975 | 21 ms |
| 200 | 0.992 | 48 ms |

If the candidate stage has a 25 ms budget, 80 is a defensible operating point. Choosing 200 for a marginal recall gain can break the end-to-end objective. Choosing 20 may be appropriate for an autocomplete path with a stricter budget.

Memory decisions include raw vectors, compressed codes, graph edges, posting lists, metadata, replicas, and transient build capacity. A nominal 30 GB vector collection may need far more resident memory once HNSW edges and serving replicas are counted. Conversely, disk-backed or compressed designs may accept extra latency to reduce RAM.

Tune end to end. ANN recall measures agreement with exact vector search, while relevance recall measures whether useful documents reach the candidate set. Increasing ANN recall from 0.98 to 0.995 may have no measurable relevance gain if lost vector neighbors were redundant. It may matter greatly when each query has one unique relevant document.

Candidate width links the index to later stages. If a reranker needs 100 candidates, evaluate whether ANN search reliably supplies useful documents within those 100, not only whether the first ten approximate neighbors equal the exact first ten. Over-fetching 300 before filters may protect the final width, but it consumes scoring, network, and reranking capacity. Tune the complete funnel with the same cutoff semantics used by the application.

Filters, updates, and failures belong in the triangle. Aggressive tenant filters can force over-fetching. Incremental inserts can degrade balance or graph quality. Replication raises memory cost but supports availability. Build time affects how quickly a new embedding model can ship. Select a configuration from a workload-specific service objective, validate it under concurrency, and keep exact-search regression queries so index upgrades cannot silently exchange relevance for speed.
