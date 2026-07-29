Sparse retrieval is powerful when queries and relevant documents share words, but meaning does not always reuse vocabulary. Dense retrieval attacks that gap by placing texts in a learned vector space where semantic relatedness can survive different wording. Understanding the transition from count matrices to learned embeddings makes dense retrieval an engineering tool rather than a mysterious model call.

## The Vocabulary Mismatch Problem

A sparse representation assigns a coordinate to each vocabulary term. A document containing `automobile repair` and a query containing `car mechanic` occupy different active coordinates even though a reader recognizes the same intent. BM25 can reward exact overlap, term rarity, and document-length normalization, but without additional expansion it cannot give direct lexical credit to a synonym that never appears.

Vocabulary mismatch includes more than synonyms. An abbreviation may differ from its expansion, such as `ACL` and `access control list`. A concept may be expressed at different specificity, such as `database outage` and `primary replica unavailable`. A user may describe a symptom while the relevant document names the cause. Morphological normalization and analyzers solve surface variation such as `indexes` versus `index`, but they do not reliably map arbitrary descriptions to the same concept.

Consider three short documents:

1. D1: `automobile mechanic repairs engines`
2. D2: `car insurance claim form`
3. D3: `bicycle mechanic replaces chains`

For query `car mechanic`, an exact term-overlap score sees D1 matching only `mechanic`, D2 matching only `car`, and D3 matching only `mechanic`. Depending on inverse document frequency and length, D2 or D3 could outrank D1, even though D1 best satisfies the combined intent. The sparse system has independent evidence for two query terms but no learned knowledge that `car` and `automobile` are related.

Query expansion can bridge known variants. A synonym rule might rewrite the query to `(car OR automobile) AND mechanic`. Expansion is transparent and precise for a curated domain, but maintaining every paraphrase is costly. Broad synonym sets can also destroy intent: treating `java` as both a language and a beverage expands ambiguity rather than resolving it. Relevance feedback and learned sparse methods offer other bridges, but the fundamental issue remains that token identity is not semantic identity.

Dense retrieval represents the query and document with vectors whose coordinates are learned features rather than literal vocabulary terms. If the query vector for `car mechanic` lies near the document vector for `automobile mechanic repairs engines`, similarity can be high despite incomplete word overlap. Geometry supplies soft matching across every dimension instead of a binary match on named terms.

The fix creates new failure modes. A semantic encoder may collapse important distinctions, retrieving `bicycle mechanic` because both texts concern repair work. It can underweight exact identifiers, product codes, negation, dates, or rare names. Sparse retrieval is often superior for `ERR_CONNECTION_RESET`, invoice `A19-884`, or an exact legal phrase. Experts therefore diagnose the query distribution before replacing lexical retrieval. Hybrid retrieval preserves exact-match strength while adding semantic candidates.

Evaluate mismatch with labeled examples, not anecdotes. Segment queries by exact identifiers, natural-language descriptions, abbreviations, and paraphrases. Compare recall at a candidate cutoff: if relevant documents frequently fail to enter the sparse candidate set for descriptive queries, semantic retrieval has a clear job. If failures are mostly bad filters, stale content, or missing documents, embeddings do not solve the actual problem.

## LSA as a Bridge: SVD on the Term-Document Matrix

Latent semantic analysis starts with a weighted term-document matrix and compresses it with singular value decomposition. It is a useful conceptual bridge because it turns lexical counts into dense coordinates through familiar linear algebra, without a neural encoder. Rows represent terms, columns represent documents, and an entry can be a count or a weight such as TF-IDF.

Let matrix A have m terms and n documents. Singular value decomposition factors it as A = U times Sigma times V transpose. Columns of U are orthonormal directions in term space, columns of V are directions in document space, and singular values in Sigma order the amount of matrix structure captured by each direction. Keeping only the largest k singular values gives the rank-k approximation A_k = U_k times Sigma_k times V_k transpose.

This is the same low-rank idea encountered in principal component methods. Instead of preserving every independent word coordinate, LSA preserves directions that explain strong co-occurrence patterns. Terms used in similar documents acquire similar coordinates even if they do not appear together directly. Documents become points in the reduced latent space and can be compared by cosine similarity.

Take a simplified vocabulary `[car, automobile, engine, policy]` and documents:

- D1: `car engine`
- D2: `automobile engine`
- D3: `car policy`

The raw binary columns are D1 = [1,0,1,0], D2 = [0,1,1,0], and D3 = [1,0,0,1]. In the matrix, `car` co-occurs once with `engine` and once with `policy`, while `automobile` co-occurs with `engine`. A low-rank approximation captures an automotive direction supported by `car`, `automobile`, and `engine`, while another direction helps distinguish policy language. After projection, D1 and D2 are closer than their raw dot product of 1 alone would express.

A query vector q in the original weighted term space must be folded into the learned latent space using the same term weighting and decomposition. One common document-coordinate convention places documents in Sigma_k times V_k transpose; the compatible query coordinate uses q transpose times U_k, with scaling choices kept consistent. The exact library convention matters less than never comparing vectors produced under different weighting or scaling conventions.

Truncation denoises and generalizes, but choosing k is a bias-variance tradeoff. A very small k merges unrelated senses into broad themes and loses rare distinctions. A large k approaches the original sparse matrix and preserves noise. The decomposition is also global: adding a large body of documents can shift latent directions, so coordinates are not stable independent encodings. Classical SVD over a very large, changing vocabulary is expensive to refresh.

Polysemy is a major limitation. The row for `bank` combines its financial and river meanings because each term has one vector. LSA can infer correlations from the corpus but cannot condition the word representation on its sentence. It also learns only from the indexed corpus, so weak co-occurrence evidence yields weak semantics. Its enduring value is conceptual: distributional patterns plus dimensionality reduction create a geometry that supports soft matching.

Use LSA when a small, stable corpus needs an interpretable baseline or when teaching the mechanism of latent representations. Modern retrieval usually chooses learned encoders because they can transfer semantic knowledge from much larger training corpora and encode new text without refactoring the entire term-document matrix. Still, an LSA baseline can expose whether a claimed dense improvement comes merely from low-rank smoothing.

## Learned Embeddings: Meaning as Geometry

A learned text encoder maps a variable-length token sequence to a fixed-dimensional vector. During training, model parameters are adjusted so texts that should match receive compatible vectors and mismatched texts are separated. The individual coordinates usually have no stable human label. Meaning is represented by the pattern of direction and magnitude across dimensions.

The encoder begins with token representations and contextual layers. Attention lets each token representation depend on surrounding tokens, so `bank` in `river bank erosion` differs internally from `bank approved the loan`. A pooling rule or designated output combines contextual token states into one text vector for single-vector retrieval. The same encoder can process new queries and documents without rebuilding a corpus-wide factorization.

Suppose a two-dimensional teaching model produces:

- q(`car mechanic`) = [0.90, 0.30]
- d1(`automobile repair shop`) = [0.84, 0.36]
- d2(`car insurance policy`) = [0.55, -0.30]
- d3(`bicycle repair shop`) = [0.62, 0.45]

The dot products with q are 0.864 for d1, 0.405 for d2, and 0.693 for d3. The geometry correctly raises the paraphrase d1 above the exact-word distractor d2, while d3 remains plausibly similar because it shares repair intent. This last score illustrates that semantic similarity is graded rather than logically exact. Metadata filters or a later scoring stage may be needed to enforce vehicle type.

Dense retrieval precomputes document embeddings and stores them with document IDs and metadata. At request time, it encodes the query, finds vectors with high similarity, applies allowed filters, and returns candidate documents. The vector index is a search structure over the learned geometry. Encoding and indexing are separate: changing the model changes coordinates, so query and document vectors must come from compatible model versions.

Embedding quality is task-dependent. A general model may place topically related texts together while a retrieval task requires answer relevance. `How do I cancel a subscription?` should retrieve the cancellation procedure, not merely a document mentioning subscription analytics. Training objectives, query/document formatting, language coverage, domain vocabulary, and input truncation all influence the geometry. Model dimensions alone do not measure usefulness.

Chunking determines what a document vector means. One vector for a 100-page manual blends many subjects and can hide the relevant paragraph. Very small chunks preserve focus but lose context and increase index size. A practical design chunks at semantic boundaries, carries titles or section paths into the encoded text, and keeps source metadata for reconstruction. Evaluate chunk size with end-to-end retrieval labels.

Embeddings can encode undesirable correlations from training data and may leak information through overly broad retrieval. Similarity is not authorization. Apply access filters before results reach the user, and ensure the indexing pipeline carries current ACL metadata. Deleting a source must also remove or invalidate its chunks and vectors.

Experts treat geometry empirically. Visualizing a few projected points can build intuition but cannot prove neighborhood quality in hundreds of dimensions. Measure recall at k, ranking metrics, latency, and segment performance on representative queries. Compare dense results with a strong lexical baseline and inspect disagreements. Dense retrieval earns its place when it contributes relevant candidates that lexical matching systematically misses, while its weaknesses are contained by filters, hybrid scoring, or later reranking.
