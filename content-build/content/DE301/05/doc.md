Embedding pipelines translate versioned corpus chunks into vector artifacts used for retrieval. Their correctness depends less on calling a model than on deterministic identity, bounded batching, metadata lineage, and filtering semantics. A reliable design can resume after failure, coexist across model versions, and prove that every returned vector still belongs to an eligible source.

## Chunk-and-Embed as an Idempotent Batch Job

A chunk-and-embed job reads an immutable corpus version, selects chunks missing the target embedding version, batches their text, invokes a pinned model, validates vectors, and writes results under deterministic keys. Re-running the same job should converge to the same logical output rather than duplicate vectors.

Embedding identity must include the chunk and every input that affects the vector. A useful recipe is `embedding_id = hash(chunk_id, model_id, model_revision, preprocessing_version)`. If text normalization, instruction prefix, truncation, or pooling changes, the preprocessing version changes and produces a new identity.

Do not identify a vector only by document ID. One document version can have many chunks, and one chunk can have many embeddings. Conversely, a content hash alone can deduplicate identical text, but two occurrences may require distinct metadata and permissions. Separate reusable vector bytes from occurrence records if cross-document deduplication is valuable.

Input pinning matters. Resolve the corpus snapshot and chunker version before work begins. If chunks change while a batch runs, the result can mix generations and orphan vectors. The run manifest should record corpus version, chunk manifest, model endpoint and revision, code artifact, parameters, and expected item count.

Batch size balances throughput, model limits, latency, and failure cost. Suppose an endpoint accepts at most 20,000 tokens and a batch has chunks of 600, 900, and 1,100 tokens. Token-aware packing is safer than a fixed count of 50 chunks. Reserve space for model-specific prefixes and account for the exact tokenizer version.

Retries need stable request items and outputs. If a timeout occurs after the service processed a batch, repeating it should upsert the same embedding IDs. Avoid incrementing counters or appending unnamed vectors as the side effect. Record attempt status separately from committed artifact identity.

Rate limits and transient failures require exponential backoff, jitter, and bounded concurrency. Permanent errors such as input too long, invalid encoding, or unsupported language should enter a quarantine with chunk ID, error class, and model version. Retrying malformed input forever wastes quota and blocks progress.

Validate outputs before commit. Check vector count equals accepted input count, dimensionality matches the model contract, values are finite, norms fall within expected bounds, and response ordering maps correctly to request IDs. A batch API returning results in a changed order can silently attach vectors to the wrong chunks if clients rely on position alone.

Partial publication can be safe when each vector upsert is individually idempotent and the index supports mixed completion, but serving should know whether a corpus generation is complete. A readiness manifest can track expected, succeeded, quarantined, and missing counts; switch a serving alias only after policy thresholds pass.

Model upgrades should build beside the current generation. Embed with the new version, create or populate its index, compare recall, latency, and distributions, then switch routing. Keep the previous generation for rollback. Updating vectors in place removes the ability to reproduce old scores.

Embedding caches need the same identity discipline. Cache by canonical model revision, preprocessing hash, and exact text hash, then verify returned dimension and checksum. A cache keyed only by text can silently reuse vectors from an older model whose numeric space is incompatible.

Track cache provenance and invalidate entries through explicit model-retention policies and regularly audited automated lifecycle jobs.

Cost and progress metrics include chunks selected, tokens submitted, cache hits, batch-size distribution, throughput, retries, quota waits, failures, vector norms, dimension, and estimated spend. Reconcile committed vector IDs against the chunk manifest so silent omissions cannot masquerade as completion.

## Storing Vectors Beside Metadata

A vector without metadata cannot be safely filtered, cited, invalidated, or explained. Each vector record needs at least embedding ID, chunk ID, document-version ID, model version, vector dimension, creation time, and state. Retrieval usually also needs source, language, tenant, permissions, timestamps, content type, and quality attributes.

"Beside" metadata can mean co-located fields in a vector index, a relational catalog joined by stable ID, or both. Co-location enables low-latency filtering and result display. A normalized catalog remains useful as the source of truth for full lineage and attributes too large or mutable for every vector record.

Denormalized filter fields require synchronization. If document permissions change, every affected vector must become inaccessible promptly. A pipeline can update index payloads, delete and rebuild records, or use an external authorization service after retrieval. The choice affects latency and the risk window.

Store immutable attributes directly with the vector generation when possible: chunk parent, language at processing, model version, corpus version, and content hash. Mutable attributes such as current access group may be referenced or updated through a versioned metadata stream. Record metadata version so stale payloads are detectable.

Vector dimensionality and distance semantics belong in the schema. A 768-dimensional cosine-normalized vector cannot share one field blindly with a 1,536-dimensional inner-product vector. Index namespaces or typed collections should bind model, dimension, normalization, and metric.

The original chunk text may be stored in the vector system for convenient retrieval, but duplication increases storage and deletion scope. Alternatively, return chunk ID and fetch text from an authoritative document store. This adds a network hop but avoids stale copied content. A cache can reduce latency if keyed by immutable chunk version.

Lineage supports invalidation. Deleting document version V should enumerate every chunk and embedding descendant across models and indexes. Changing only the logical document's current pointer does not remove old vectors if the serving query still searches them. Maintain state such as active, superseded, deleted, or quarantined.

Metadata cardinality affects index performance. Filtering on tenant or language is common and selective. Storing huge arrays of individual principals per vector may be expensive. Access-control modeling might use compact group IDs, partitioned indexes, or a precomputed authorization token set. Security review must validate the exact query behavior.

Audit returned results by logging vector and metadata versions, subject to privacy policy. An explanation should trace score to embedding model and chunk to source span. Monitor orphan vectors, stale metadata versions, dimension mismatches, inactive hits, and catalog-index count differences.

## Pre-Filter vs Post-Filter in ANN Search

Filtering restricts which vectors are eligible for a query. Pre-filtering applies eligibility before or during approximate nearest-neighbor search. Post-filtering retrieves approximate neighbors from the broader index and removes ineligible results afterward. The placement changes recall, cost, and security behavior.

Suppose the request needs top 10 results for tenant A, but tenant A owns only 1 percent of a shared index. A post-filter search requesting 10 global neighbors may return zero tenant-A items. Increasing the candidate count to 1,000 raises the expected eligible count to about 10 under uniform assumptions, but relevance and tenant distribution are not uniform.

Pre-filtering guarantees the search operates on eligible vectors when the index supports the predicate correctly. It can improve recall within a tenant because ineligible nodes do not consume the top-k budget. However, restrictive filters can fragment an ANN graph or leave too few candidates, and some index types implement filters by oversampling internally rather than truly restricting traversal.

Post-filtering is simple and preserves one global ANN structure, but it needs oversampling. If eligible fraction is p and k results are needed, `k/p` is a rough candidate starting point, not a guarantee. For p=0.05 and k=20, that suggests 400 candidates. Skew, correlation with similarity, and ANN misses require evaluation and caps.

Authorization is not merely a relevance filter. An ineligible vector must never be returned, logged as visible content, or sent to a reranker that exposes it to an unauthorized service. Post-filtering can be secure only if removal happens inside a trusted boundary before any prohibited disclosure. Logs and traces need the same protection.

Hybrid strategies partition high-level security domains into separate indexes, pre-filter on supported structured fields, then post-filter residual conditions. Tenant-specific indexes strengthen isolation and predictable recall but increase operational count and reduce pooling efficiency. Shared indexes simplify management but demand robust filters and synchronization.

Filtering interacts with graph connectivity. In graph ANN, eligible nodes may be reachable through ineligible nodes even if only eligible results are returned. Some engines allow traversal through filtered nodes; others prune them. The former can preserve recall but still must ensure metadata and content are not exposed. Understand implementation semantics rather than assuming the word pre-filter specifies them.

Evaluate filtered recall against exact search within the eligible subset. Slice by eligible-set size, tenant, filter combination, k, index type, and candidate budget. Measure zero-result rate, latency, nodes visited, oversampling, and authorization violations. Global unfiltered recall does not predict filtered behavior.

Adaptive candidate sizing can estimate selectivity from metadata statistics and request more neighbors for rare filters. Bound work to protect latency, and fall back to exact search for very small eligible sets where exact scanning is cheaper and more reliable. If an eligible subset has 500 vectors, brute-force cosine may beat navigating a massive ANN index.

Filter values must be versioned and current. A revoked user group with stale vector payload can pass a correct pre-filter against incorrect metadata. Propagate change events, reconcile indexes with the source of truth, and fail safely when authorization metadata age exceeds policy.

The design decision is workload-specific. Prefer pre-filtering or physical partitioning for mandatory selective security constraints. Use post-filtering for inexpensive, non-sensitive refinements when oversampling maintains measured recall. Combine methods when necessary, but prove both eligibility safety and top-k quality under real selectivity distributions.
