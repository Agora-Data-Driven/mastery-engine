A vector database is an operational system for indexing vectors, applying metadata constraints, updating state, and serving similarity queries under latency and availability goals. The product category includes several index structures with different lifecycle costs. Choosing well starts with workload behavior and source-of-truth boundaries, not with the assumption that every embedding needs a specialized database.

## ANN Index Types by Operational Profile

Approximate nearest-neighbor indexes trade exactness for faster search at scale. The important dimensions are recall, latency, build time, memory, disk, update behavior, filtering, concurrency, and recovery. Two indexes with similar benchmark recall may have very different operational profiles.

HNSW builds a multilayer proximity graph. Search enters at sparse upper layers, navigates toward the query, then explores more candidates in a dense lower layer. Its query parameter, often called `efSearch`, controls exploration: larger values usually improve recall and latency cost. Construction parameters affect graph quality, memory, and build time.

HNSW often provides strong low-latency recall and supports incremental insertion, but graph edges consume substantial memory. Deletion may be tombstoned until maintenance or rebuild. Heavy churn can degrade structure or leave dead nodes. Metadata pre-filter behavior depends on implementation because restricting graph traversal can disconnect eligible regions.

Inverted-file indexes, commonly called IVF, train centroids and assign vectors to coarse clusters. At query time, the system searches only a selected number of clusters. If there are 10,000 lists and `nprobe=20`, roughly 0.2 percent of clusters are probed before further candidate scoring, though cluster sizes and distribution vary.

Increasing `nprobe` improves recall and raises work. IVF needs representative training data; poor centroids or distribution drift create unbalanced lists and missed neighbors. Appends are natural after training, but major distribution changes may warrant retraining and rebuilding the quantizer.

Product quantization, or PQ, compresses vectors into short codes by splitting them into subspaces and storing codebook assignments. IVF-PQ combines coarse cluster pruning with compressed approximate distance. It reduces memory and can support very large collections, but quantization loses accuracy and requires training. Reranking a shortlist with original vectors can recover quality.

Disk-oriented graph indexes keep more state on SSD and cache critical graph or vector regions in memory. They trade some latency for a smaller RAM footprint and need careful I/O, cache, and tail-latency planning. They can be compelling when vectors exceed economical memory but still require interactive search.

Flat exact search stores vectors and computes distance to every eligible vector. Its complexity is linear in collection size, yet optimized matrix operations can be excellent for small collections, large batches, or GPU workloads. It provides an exact recall reference and avoids index-build complexity.

Keep this exact implementation in evaluation even after adopting ANN. It clearly reveals whether regressions come from embeddings and relevance or from approximate candidate-generation recall loss.

Index updates can be immutable generations or online mutations. Immutable rebuild-and-swap gives predictable quality and rollback, while online insertion improves freshness. Many systems combine a large stable base index with a small mutable delta, searching both until compaction or rebuild.

Hybrid base-and-delta search needs score compatibility and deduplication. The same source item may appear in both after an update, so select the newest version before returning results. Monitor delta size because a structure designed for freshness can become a second full index and degrade latency if rebuilds stall.

Benchmark with real dimensions, filters, concurrency, update rate, and hardware. Measure recall against exact top k, p50 and tail latency, memory, disk, build time, insertion lag, deletion visibility, and cost. Tune parameters as a curve rather than reporting one default.

Capacity tests should include failure and recovery. Measure replica rebuild time, index loading, cache warmup, node loss, and compaction while serving traffic. An index that meets steady-state latency but takes twelve hours to restore may violate availability goals. Record reproducible build manifests so recovery does not depend on a mutable live corpus.

## Keeping the Vector Store in Sync with the Source of Truth

The source of truth is the authoritative corpus or feature catalog, not the ANN index. The vector store is a derived serving projection that can be rebuilt. Every record needs stable source identity, source version, chunk version, embedding version, metadata version, and lifecycle state.

Changes include inserts, content updates, metadata changes, permission revocations, and deletes. Content updates usually create a new document and chunk generation plus new embeddings. Metadata-only changes may update payload fields without re-embedding. Deletes must remove or make descendants ineligible across every index generation and cache.

A change stream or manifest diff can drive synchronization. Each event carries source key, new version, operation, and ordering position. The consumer upserts deterministically and stores the last applied version per key. Redelivery is harmless, while stale versions are rejected.

Dual-write from the application to source and vector database is unsafe without a shared transaction. One write can succeed while the other fails. Prefer commit to the source first, then asynchronously project through an outbox, CDC stream, or durable job. Serving exposes freshness lag, but reconciliation can repair it.

Permissions need stricter service levels than ordinary embedding freshness. A new article may tolerate minutes before searchability; a revoked permission may need immediate denial. A trusted authorization check after retrieval can fail closed while index metadata catches up. Track separate freshness and revocation objectives.

Reconciliation compares expected artifacts from the source manifest with actual index records. Detect missing vectors, orphans, stale source versions, wrong model versions, dimension mismatches, deleted-but-searchable records, and metadata divergence. Counts alone cannot find one missing item paired with one orphan.

Use both full and sampled reconciliation. A periodic full ID diff provides strong coverage but may be expensive across billions of records. Continuous samples catch drift sooner, and targeted scans cover recent changes, revocations, and failed partitions. Store discrepancies as repair tasks with source evidence rather than issuing untracked ad hoc updates.

Index generation manifests make completeness explicit. A generation declares corpus snapshot, embedding model, expected record count and IDs, filtering schema, index parameters, build artifact, and validation. Only a ready generation receives the read alias. Online updates after the base snapshot are replayed through a recorded sequence.

Failure recovery should be idempotent. If a consumer times out after an upsert, repeat the same record ID and version. If an alias swap is ambiguous, read the authoritative alias state. If reconciliation finds broad corruption, rebuilding may be safer than patching an unknown index.

Observe source-to-index lag, rejected stale events, update failures, orphan rate, missing rate, deletion and permission propagation, generation age, and search hits on inactive content. Sample returned IDs and verify them against source state continuously.

Freshness contracts should be query-visible when relevant. A response can include corpus generation or last-update watermark for diagnostics, while internal routing can avoid replicas lagging beyond policy. Do not silently combine shards at incompatible source positions if this permits stale permissions or inconsistent versions.

## When You Do Not Need a Vector Database

A vector database adds infrastructure, indexing delay, memory or disk cost, backup, security, and synchronization work. Use it only when approximate vector search at the required scale and latency provides enough value to justify that operational surface.

Small collections can use exact search. One hundred thousand vectors of dimension 384 contain 38.4 million scalar values. In 32-bit floats that is about 154 megabytes before metadata. A single process or existing analytical engine may scan this efficiently, especially for batch queries or modest request rates.

Existing databases increasingly support vector columns and indexes. If the product already needs strong relational filters, transactions, and joins, keeping vectors beside authoritative rows can simplify consistency. Evaluate the database's vector performance under real selectivity before introducing another system.

Offline similarity joins can run in a data warehouse, distributed batch engine, or matrix library. Training-data deduplication performed once per day does not need a highly available online service. A file-backed library can build a local index inside the job and discard it afterward.

Lexical retrieval may solve the need better. Exact error codes, names, legal phrases, and identifiers benefit from inverted indexes. A vector database does not replace tokenization, filters, or relevance evaluation. Hybrid retrieval may use an existing search engine capable of both sparse and dense fields.

Precomputed recommendations are appropriate when the query set is bounded, such as related items for every catalog product. Calculate neighbors offline and store top IDs in a key-value table. Request-time ANN adds little if queries never introduce new vectors.

Decision criteria include collection size and growth, query rate, latency, recall target, filter complexity, update and deletion rate, availability, team expertise, and cost. Estimate the exact baseline first. If it meets the objective with operational headroom, approximation is unnecessary.

Build a total-cost model covering compute, index replicas, storage, network, backups, re-embedding, synchronization, on-call labor, and vendor limits. A low per-query benchmark price can hide the cost of always-on replicas or frequent full rebuilds. Compare against the simplest credible alternative over expected growth, not only today's demo.

Avoid adopting a vector database merely because embeddings exist. Embeddings can feed clustering, classification, reranking, anomaly detection, or offline analysis without online ANN. Start from the user interaction and service-level requirement.

The eventual exit cost matters. Preserve vectors and metadata in an open authoritative format, stable IDs, model versions, and exact evaluation sets so the serving engine can be replaced. Product-specific APIs should sit behind a narrow retrieval interface rather than spread throughout application code.

A sensible progression is exact search or existing storage, then measured pressure, then the simplest ANN structure meeting the need. Reassess as the collection and workload evolve. Operational simplicity is a feature, and an unnecessary vector database can reduce reliability more than approximate search improves relevance. That progression also preserves negotiating leverage: a system you can credibly leave is a system you can negotiate with.
