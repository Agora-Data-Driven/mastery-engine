Dense retrieval becomes practical when document representations can be computed before a query arrives. The bi-encoder makes that separation possible: encode each side independently, then compare compact vectors with a cheap similarity function. Its speed comes from an information bottleneck, so production choices about pooling and metric geometry directly determine what the retriever can distinguish.

## Dual-Tower Architecture: Encode Separately, Compare by Dot Product

A bi-encoder has a query tower and a document tower. Each tower maps its own token sequence to one fixed-dimensional vector without seeing the other input. Retrieval scores a pair with a simple function, commonly the dot product:

score(q, d) = f_query(q) dot f_document(d).

The towers can share all parameters, share a base model but use different instructions, or use distinct parameters. Shared weights reduce model count and encourage one common language space. Asymmetric towers can better represent different input roles, such as a short question versus a long passage, but training and deployment become more complex. Compatibility matters more than architectural symmetry: the two outputs must inhabit a space whose comparison was trained for the task.

The separation resembles a dual-tower recommender. A user tower precomputes or produces a user vector, an item tower precomputes item vectors, and the dot product retrieves candidates. Here the query is the user-side context and a text passage is the item. This factorization is the source of scale. If one million document vectors are already stored, request-time work is one query encoding plus vector comparisons or index traversal, not one transformer pass over one million query-document pairs.

Suppose the query vector is q = [0.8, 0.6]. Three precomputed document vectors are d1 = [0.7, 0.7], d2 = [-0.2, 0.9], and d3 = [0.9, -0.1]. Their dot products are 0.98, 0.38, and 0.66. The ranking is d1, d3, d2. Only q changes per request; the three document vectors can be reused for every query.

Precomputation creates an artifact lifecycle. Each vector needs a document and chunk ID, model version, preprocessing version, source revision, dimensions, and ACL metadata. When text changes, the corresponding vector must change. When the encoder changes, the index and query service must move through a coordinated migration because vectors from unrelated spaces produce meaningless scores even when dimensions happen to match.

Independent encoding is also the main quality limitation. The document representation cannot emphasize different words for different queries because it was computed before the query existed. A passage about installation, upgrades, and deletion compresses all three subjects into one vector. For query `remove the agent`, the model cannot perform token-by-token interaction between `remove` and `deletion` at scoring time. This makes the bi-encoder an excellent candidate generator but not always the best final judge.

Engineers manage the bottleneck with focused chunks, task-appropriate training, useful titles, and a later reranking stage. They batch document encoding on accelerators, cache frequent query vectors only when privacy and versioning permit, and keep the online encoder identical to the evaluated build. They also benchmark encoding latency separately from vector search latency because optimizing the index cannot fix an overloaded query model endpoint.

Batching affects throughput without changing the mathematical score. If one accelerator encodes 32 passages in 40 milliseconds, its batch throughput is 800 passages per second, even though the first passage waits roughly for the whole batch. Offline indexing favors large batches and high utilization. An interactive query service favors small dynamic batches, a bounded queue, and tail-latency protection. Record both examples per second and percentile latency because one average hides this tradeoff.

The two towers can also accept different maximum lengths. A query may be capped at 32 tokens while a passage uses 256, reducing online compute without truncating document context to the same size. That asymmetry must be an evaluated model contract, not an arbitrary serving shortcut.

## Sentence Embeddings vs Token Embeddings

Transformer layers produce one contextual vector per input token. A sentence embedding pools those token states into one vector intended to summarize the entire query, sentence, passage, or chunk. Mean pooling averages eligible token states, special-token pooling selects a designated state, and learned pooling assigns content-dependent weights. Padding tokens must be excluded, and the pooling rule used in production must match the model's training and documentation.

For a teaching example, suppose three unmasked token states are h1 = [1,0], h2 = [0.6,0.8], and h3 = [0.2,1]. Mean pooling produces [(1 + 0.6 + 0.2)/3, (0 + 0.8 + 1)/3] = [0.6,0.6]. That single vector is cheap to index, but it no longer exposes which token supplied each signal. If five padding vectors of [0,0] were mistakenly included, the result would shrink to [0.225,0.225]. Cosine direction would remain the same in this artificial case, but real padding states are not guaranteed to be zero and dot-product magnitude would change.

Sentence embeddings enable single-vector retrieval. Storage grows roughly with number of chunks times embedding dimensions. A 768-dimensional float32 vector uses 3,072 bytes before index overhead, so ten million chunks require about 30.72 GB for raw vectors. This compactness supports efficient approximate search and simple serving.

Token embeddings keep multiple vectors per document, often one for each retained token or segment. A late-interaction retriever can compare each query-token vector against document-token vectors and aggregate the best matches. One common conceptual score sums, for every query token, its maximum similarity to any document token. This preserves fine-grained evidence: a query token for `deletion` can match the relevant document token without forcing the whole passage into one average.

Assume query token vectors qa and qb compare with three document tokens. Their similarities are [0.9, 0.2, 0.1] for qa and [0.1, 0.4, 0.8] for qb. A max-per-query-token sum gives 0.9 + 0.8 = 1.7. Each query concept finds its own supporting token. A single pooled vector might blur those two alignments.

The benefit costs memory and computation. If a chunk retains 128 token vectors of 128 float32 dimensions, its raw representation uses 65,536 bytes, far above one 128-dimensional vector at 512 bytes. Compression, pruning, and specialized indexing become important. Query-time scoring also performs many more comparisons.

Choose sentence embeddings for high-throughput candidate generation, moderate memory, and a strong whole-text semantic signal. Choose token-level or multi-vector representations when exact local interactions materially improve recall, especially for long or detail-sensitive texts, and the infrastructure budget supports them. A common multi-stage design uses a single-vector retriever to find a manageable candidate set and a richer interaction model afterward. The decisive evidence is end-to-end quality per unit of latency and memory, not the label sentence or token.

Validate pooling with controlled tests. Encode the same text alone and inside a padded batch; its vector should remain effectively unchanged when masking is correct and the model is deterministic. Track vector norms, NaN counts, token truncation rates, and empty inputs during batch indexing. A silent masking or truncation regression can rebuild an entire index successfully while degrading every neighborhood.

## Similarity Metrics: Cosine vs Dot Product vs Euclidean

Dot product combines vector alignment and magnitude. For vectors x and y:

x dot y = norm(x) times norm(y) times cosine(theta).

Cosine similarity divides the dot product by both norms and therefore measures direction only:

cosine(x, y) = (x dot y) / (norm(x) times norm(y)).

Euclidean distance measures straight-line separation:

distance(x, y) squared = norm(x - y) squared.

These metrics are related but not interchangeable for arbitrary vectors. Let q = [1,0], a = [2,0], and b = [0.8,0.6]. Dot products are 2 for a and 0.8 for b, so dot product prefers a. Both q and a point in the same direction, giving cosine 1, while q and b have cosine 0.8. Euclidean distances are 1 for a and square root of 0.4, about 0.632, for b, so Euclidean distance prefers b. Magnitude changes the ranking.

If every vector is normalized to unit length, dot product equals cosine similarity. Squared Euclidean distance also becomes 2 minus 2 times the dot product because both squared norms equal 1. Therefore maximizing dot product, maximizing cosine, and minimizing Euclidean distance yield the same ordering for normalized vectors. This equivalence is useful when an index supports one metric more efficiently.

Normalization is a modeling choice. If the training objective uses normalized embeddings, serving should normally normalize exactly the same way. If vector magnitude encodes confidence, popularity, or some learned relevance property, normalizing at retrieval discards that information. Conversely, an unnormalized dot-product system can favor large-norm documents even when their direction is less relevant. Inspect norm distributions and evaluate segments rather than guessing.

Index configuration must match the score used during model training and evaluation. An index built for Euclidean distance but queried as if higher scores were better can invert results. Some APIs return distance, others similarity, and some expose transformed values. Treat the metric name, normalization step, and score direction as versioned interface fields.

Numerical stability also matters. A zero vector has no defined cosine because its norm is zero. Empty or fully truncated inputs can produce pathological embeddings, so validate norms and route invalid records rather than indexing them. Floating-point precision and quantization may perturb close scores; ranking tests should tolerate tiny numeric differences while detecting meaningful changes.

Metric selection cannot rescue a weak representation. Trying cosine, dot product, and Euclidean on the same unlabeled examples is not model adaptation. Start with the metric prescribed by the model or training loss, reproduce the preprocessing contract, and evaluate retrieval metrics. Change the metric only when evidence shows that the geometry and use case support it, then rebuild or reconfigure the vector index consistently.
