A production retriever rarely asks one model to search the entire corpus and make the final ordering. It uses a funnel: inexpensive stages protect recall over many items, while increasingly expensive stages spend computation on fewer candidates to improve precision. The architecture succeeds only when candidate budgets, filters, and latency objectives are treated as one end-to-end system.

## Recall Stage vs Precision Stage: The Ranking Funnel

The recall stage performs candidate generation. Given a corpus of N items, it cheaply selects a set C that is several orders of magnitude smaller. Its primary obligation is that C contains the documents needed by later stages. BM25, dense nearest-neighbor search, curated rules, and metadata-aware retrievers can each contribute candidates.

The precision stage orders or classifies candidates using richer evidence. It may compute more features, compare query and document jointly, apply business constraints, collapse near-duplicates, or select passages for an answer generator. It cannot recover a relevant document absent from C. This gives the funnel its central asymmetry: early false negatives are usually permanent, while early false positives can be removed later.

Suppose a corpus has one million chunks and five labeled relevant chunks for a query. A candidate generator returns 200 chunks containing four relevant ones. Candidate recall is 4/5 = 0.8. Even a perfect reranker can place at most those four relevant chunks in the final ranking; the fifth is unreachable. If the reranker places all four in its top ten, final precision@10 is 0.4 and recall@10 remains 0.8 relative to the five known relevant items.

Recall and precision must be stated with cutoffs and relevance definitions. `Recall stage has high recall` is incomplete. Say `candidate recall@200 is 0.96 on adjudicated support queries`. The candidate cutoff belongs to the metric because recall generally rises as more documents are admitted. Measure by query segment, since exact identifiers, paraphrases, and multilingual queries may favor different retrievers.

The candidate set creates a mathematical ceiling for downstream ranking. For binary relevance, if only r of R relevant items enter the funnel, recall at every later cutoff can never exceed r/R. Ranking metrics that emphasize the top positions can still improve dramatically, because the precision stage can move those r items upward. This is why a team should report both candidate coverage and final ordering quality. One number cannot distinguish missing evidence from bad ordering.

A funnel can include more than two stages:

1. retrieve 1,000 lexical and dense candidates;
2. fuse and deduplicate to 300;
3. apply a lightweight scorer to 100;
4. use an expensive relevance model on 30;
5. enforce display diversity and return 10.

Each transition needs a contract: input width, output width, score meaning, timeout, fallback, filters, and diagnostic identifiers. Without those contracts, a stage can silently truncate candidates or reinterpret scores.

Scores often should not cross that contract without transformation. A BM25 score, vector similarity, and classifier probability arise from different scales. A merge stage can use ranks or a calibrated fusion rule, while the next stage receives stable IDs and the features it explicitly understands. Preserve original source ranks and scores for diagnosis even if the production ordering uses a fused score. When a document falls, engineers can then see whether it entered low from every source or was damaged during fusion.

Authorization belongs before exposure and ideally before expensive scoring. If a vector engine searches globally and filters afterward, it may return too few eligible candidates and waste compute. If a reranker receives unauthorized text, the system has already crossed a security boundary even if the final UI hides it. Apply tenant and ACL constraints inside candidate generation where supported, over-fetch safely where necessary, and recheck authorization at the serving boundary.

Deduplication affects both stages. Chunking can yield many near-identical passages from one source. Allowing all of them into a fixed candidate set crowds out other evidence and inflates offline metrics if duplicates share labels. Deduplicate by stable source or content signature at a defined point, but retain the best passage coordinates needed for answer grounding.

Fallbacks preserve availability. If the dense service times out, a lexical candidate set may still serve a degraded response. If the final reranker fails, the fused candidate order can be returned. A fallback is a separately evaluated mode, not an accidental exception handler. Log which path served the result and ensure it maintains authorization and minimum quality.

Evaluate the funnel with stage-wise attribution. For every relevant document missing from the final top k, ask whether no candidate source found it, fusion discarded it, deduplication collapsed it, a filter removed it, or a precision stage misordered it. This decomposition tells engineers where additional computation can help. Tuning a reranker cannot repair candidate recall, and widening retrieval cannot fix a systematically wrong final scorer by itself.

## Budgeting Candidates per Stage

A candidate budget is the maximum or target number of items passed between stages. It converts a quality goal into resource demand. If a reranker processes each query-document pair independently, its compute grows roughly with candidate depth. Doubling depth from 50 to 100 approximately doubles pair scoring, token processing, and intermediate data, though batching can improve hardware utilization.

Begin from the final objective and work backward. Suppose the final top ten must contain a relevant answer for at least 95 percent of answerable queries. Measure candidate success@k, the fraction of queries with at least one relevant candidate, across k values:

| Candidate depth | Success rate | Rerank p95 |
|---:|---:|---:|
| 20 | 0.90 | 22 ms |
| 50 | 0.95 | 47 ms |
| 100 | 0.968 | 88 ms |
| 200 | 0.973 | 169 ms |

If the reranking budget is 60 ms and the quality floor is 0.95, depth 50 is the natural starting point. Depth 100 provides more headroom but violates the current latency allocation. An optimized or smaller precision model might shift the frontier.

Budgets exist at each source as well as after merging. Allocating 100 results each to BM25 and dense search does not guarantee 200 unique candidates because their overlap may be high. If they overlap on 60, the union contains 140. That overlap is informative: high agreement may indicate strong obvious candidates, while each source's unique tail supplies complementary recall.

Fixed budgets are simple and predictable. Adaptive budgets use query features or intermediate confidence. An exact product-code query with a dominant lexical match may need fewer candidates, while an ambiguous natural-language query may need more. Adaptation can save average cost but complicates tail latency and evaluation. It also risks starving hard queries if confidence is poorly calibrated.

A cautious adaptive policy uses observable query classes rather than an opaque confidence threshold at first. For example, validated identifier syntax may receive depth 20, ordinary text depth 50, and multilingual or low-agreement queries depth 100. Evaluate each route separately and enforce a global maximum. The policy should fall back to the safer wider route when classification is uncertain. Otherwise an incorrect cheap-route decision becomes an unrecoverable early false negative.

Budget filters before committing capacity. Imagine retrieving 50 vectors, then discovering that only five satisfy an ACL filter. Passing five to the reranker is not the same experiment as reranking 50 eligible candidates. Prefer filter-aware retrieval. When only post-filtering exists, over-fetch based on measured selectivity and cap the work. If eligibility rate is p, the expected eligible count from n independent candidates is n times p, but tenant distributions and vector neighborhoods make independence a weak assumption. Use observed percentiles rather than relying only on that expectation.

Token length creates a second budget. A reranker with maximum sequence length L must allocate tokens between query and document. Fifty 2,000-token documents are not equivalent to fifty 200-token passages if truncation and batching differ. Chunk retrieval upstream, apply deterministic truncation, and measure how often relevance evidence falls beyond the retained span.

Parallelism can reduce latency but not total work. Scoring 100 pairs in batches of 25 may require four batch steps; running them concurrently can increase accelerator contention and memory. Set bounded queues, batch timeouts, and admission control. Under overload, a deliberate smaller depth or cheaper fallback is safer than unbounded queueing that causes every request to miss its deadline.

Capacity arithmetic connects the per-request budget to fleet size. At 200 queries per second and depth 50, the precision service must sustain 10,000 pair evaluations per second before retries or shadow traffic. A model server capable of 2,500 pairs per second at the required token length needs at least four fully utilized replicas in the ideal case. Headroom, uneven batches, failures, and p95 objectives require more. Increasing depth to 100 doubles the pair arrival rate even if retrieval latency is unchanged.

Budgeting must include network and serialization. Fetching full document bodies for 500 candidates can dominate latency even when scores are fast. Store compact reranking text or retrieve bodies in batches by stable IDs. Carry only necessary metadata between stages, while preserving trace information for debugging.

Offline sweeps find a candidate frontier, but online traffic validates cost. Record requested and actual depth, source contribution, unique union size, filter attrition, tokens, batch count, model time, queue time, and final quality proxies. Plot marginal relevance gain per additional candidate. A flat curve indicates wasted compute; a rising tail may reveal a query segment needing its own policy.

The correct budget is not the largest affordable number on a quiet benchmark. It is the smallest configuration that meets quality floors under representative concurrency, with headroom for growth and a defined degraded mode. Revisit it when corpus size, retrievers, filters, hardware, or the precision model changes, because every one of those changes moves the funnel's operating point.
