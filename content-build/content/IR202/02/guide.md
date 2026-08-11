**The big idea**: **Recall Stage vs Precision Stage: The Ranking Funnel** established that a production ranker is two jobs wearing one name — a cheap stage that protects coverage, and an expensive stage that reads a shortlist carefully — and **Budgeting Candidates per Stage** turned that into arithmetic, where each stage's candidate count is set by what the next stage can afford. This lesson supplies the instrument that occupies the precision stage, and explains why the funnel has to exist at all. A cross-encoder is a transformer that scores a query and a document *together*, in one pass, with full token-level interaction. It is the most accurate ranker most teams can deploy, and because it can judge only one pair at a time, it is exactly the model that forces the architecture you just learned. Three things carry the lesson: joint query-document attention, the effectiveness-versus-efficiency trade against the bi-encoder, and how many candidates to rescore.

**Key concepts**

- **A cross-encoder consumes one sequence, not two.** The input is `[CLS] query tokens [SEP] document tokens [SEP]`, passed through a transformer encoder. In every layer of self-attention each query token attends to every document token and every document token attends back. A lightweight scoring head — typically one linear layer over the `[CLS]` representation — emits a single relevance logit per pair. Training uses labelled pairs with a classification or ranking loss, and the negatives matter enormously: **hard negatives** mined by BM25 or a bi-encoder teach the distinctions production traffic actually requires.

- **Joint attention is the entire point, and three recurring wins show why.** *Disambiguation:* for `jaguar 0-60 time`, `jaguar` is read jointly with `0-60`, so the car sense is favoured over the animal. *Negation:* for `exercises that do not load the knee`, attention can bind `do not` to `load the knee`, while lexical matching and most embedding models read those tokens as strong positive evidence for knee exercises. *Numeric and unit constraints:* for `laptop under 4 pounds`, the model relates `weighs 3.8 lb` to the constraint token by token, unit conversion included. None of this is available to a model that computed the document's representation before the query existed.

- **The cost structure follows from the mechanism, exactly.** Because the pair encoding depends on both inputs, **nothing about a document can be precomputed** for a query that has not yet arrived. Scoring $n$ candidates costs $n$ forward passes, batched for hardware efficiency, and attention inside each pass grows quadratically with sequence length. A base-sized cross-encoder on a modern inference GPU does **1,500 to 3,000 short pairs per second**; on CPU it is one to two orders of magnitude slower.

- **A worked budget makes it tangible.** Passages average 180 tokens and batches of 32 pairs take about 18 ms. Rescoring 100 candidates needs $\lceil 100/32 \rceil = 4$ batches, roughly **60–75 ms** of model time once tail queuing is included. That is the direct input to the previous lesson's funnel budgeting, and it is why rerank depth is measured in the tens or low hundreds and never in the corpus size.

- **The 512-token window is a hard constraint with a silent failure mode.** A 30-token query leaves about 480 tokens for the document, so full documents must be truncated or the pipeline must rerank focused chunks. Truncation can delete the decisive evidence with no error appearing, so retrieve chunks small enough that the relevant span survives the window, and measure the truncation rate as a quality metric.

- **Raw logits are not calibrated probabilities.** They order pairs within one model reasonably well, but blending them arithmetically with BM25 scores or another model's logits, uncalibrated, produces erratic rankings. Batch by token budget rather than pair count too: fifty 500-token pairs and fifty 150-token pairs are very different work.

- **The bi-encoder is the opposite bargain.** Encode query and document independently into fixed-size vectors, then compare with a dot product or cosine. Documents are encoded once, offline, into an approximate nearest-neighbour index; at query time the system encodes the query once and searches. The per-pair online cost is effectively one multiply, which is how a bi-encoder scans millions of passages in tens of milliseconds.

- **The asymmetry between the architectures is informational, and that is the whole explanation.** A bi-encoder must compress everything a document might ever need to say to any future query into one fixed vector — say **768 floats** — before the query is known. A cross-encoder defers the comparison and then uses the full token sequences of both sides: orders of magnitude more representational capacity per judged pair. It shows in measurements — on standard passage-ranking benchmarks a fine-tuned cross-encoder reranking a first-stage top-100 consistently beats a same-scale bi-encoder alone by **several points of nDCG or MRR**. The gap concentrates in predictable places: exact lexical signals such as part numbers and rare names, which a vector smooths over; negation and conjunctive constraints; fine-grained numeric conditions; and out-of-domain text.

- **The efficiency verdict is equally decisive in the opposite direction.** Scoring one million passages at 32 pairs per 18 ms batch is 31,250 batches ≈ 562 seconds — **over nine minutes per query**. No serving architecture tolerates that, which is why the two models are complements rather than competitors: the bi-encoder, with BM25 beside it, owns the recall stage and produces the shortlist, and the cross-encoder owns the precision stage over it. Every serious production ranker is this pair, not a choice between them.

- **The gap is not fixed, and there is a legitimate single-stage exception.** Domain fine-tuning with mined hard negatives, larger embedding dimensions and better ANN indexes narrow it from the bi-encoder side; zero-shot out-of-domain traffic and constraint-heavy queries widen it. With a small corpus — a few thousand documents — and modest query rates, brute-force cross-encoding every candidate is affordable and the funnel collapses into one simpler stage. Internal tools should take that simplification rather than operating machinery they do not need.

- **Rerank depth $k$ is the number of first-stage candidates the cross-encoder actually rescores**; everything deeper keeps its retrieval order or is discarded. Choosing how many candidates to rescore is two-sided. *Too shallow* and the **candidate ceiling** binds: if relevant documents sit near rank 150 and $k = 50$, the reranker never sees them, final metrics stay flat, and upgrading the reranker accomplishes nothing. *Too deep* and cost grows roughly linearly in $k$ while marginal gain flattens, because retrieval scores at depth are noisy and those candidates are mostly irrelevant. Worse, the deep region is **off-distribution** for a reranker trained on top-100 negatives, so confidently wrong rescoring can hurt the final order.

- **The selection method is a sweep, not a guess.** On labelled queries, rerank at depths 20, 50, 100 and 200 and record final metric and latency: 20 → nDCG@10 0.410 at 25 ms p95; 50 → 0.440 at 50 ms; 100 → 0.452 at 95 ms; 200 → 0.455 at 180 ms. Under a 100 ms tail budget depth 100 is the justified operating point — it buys most of the available quality, while 200 adds 0.003 of nDCG for nearly double the latency. **The knee of the curve, not the largest affordable number, is the answer.**

- **Depth is a property of the retriever-reranker pair, not of the reranker alone.** When the first stage improves — after adding the hybrid fusion of the next lesson, say — relevant documents move from rank 150 toward rank 40, and a shallower depth buys the same final quality at lower cost. Recompute the sweep whenever either stage changes materially: new embedder, new fusion, new reranker, doubled corpus.

- **Fleet arithmetic ties depth to capacity.** Pair throughput equals query rate times depth: 200 queries per second at depth 100 is **20,000 pairs per second**, and at 2,500 pairs per second per replica that is **eight replicas** before headroom, retries and shadow traffic. Halving depth halves the fleet. Depth debates are capacity debates in disguise.

**Rules to remember**

- Cross-encoder: one sequence, joint attention, one logit per pair. Bi-encoder: two independent vectors, one similarity.
- Nothing about a document can be precomputed for a query that has not arrived. Cost is $n$ forward passes, always.
- Effectiveness goes to the cross-encoder, efficiency to the bi-encoder. They are complements, and production runs both.
- Pick depth by sweeping and taking the knee at your tail-latency budget — never the largest affordable number.
- Deduplicate before rescoring: near-identical chunks from one source waste pair budget and crowd out diverse evidence.
- Order by the reranker within the top $k$ and keep retrieval order below $k$, rather than blending uncalibrated scores across the boundary. If blending is required, calibrate first.
- Adapt depth by observable query class — a part-number query needs 20, an ambiguous natural-language question may merit 150 — but gate on the class, never on model confidence, and enforce a hard maximum.
- Fallback is part of the depth decision: if the reranker times out, retrieval order is the evaluated degraded mode, so it must be acceptable on its own.

**Common pitfalls**

- **Treating the two architectures as a choice.** They solve different halves of the same problem; "bi-encoder or cross-encoder" is almost always the wrong question.
- **Blending raw logits arithmetically.** A cross-encoder logit is not on the same scale as a BM25 score or another model's logit. Adding, averaging or thresholding one uncalibrated is a planted error in questions and a real bug in systems.
- **Ignoring truncation.** A 512-token window silently drops the evidence that decided relevance, and nothing says so until you measure it.
- **Trusting one aggregate off-distribution.** Cross-encoders trained on short web queries degrade on long legal or medical documents. Evaluate by content segment, not by a single number.
- **Comparing models instead of pipelines.** A bi-encoder top-10 and a bi-encoder top-100 plus cross-encoder rerank are different systems with different latencies and prices. Compare at equal p95 latency and equal infrastructure cost, and report the retriever-reranker pair as the unit of analysis — teams that report only model-level benchmarks overinvest in the reranker and underinvest in candidate recall.
- **Upgrading the reranker when the ceiling is the problem.** If relevant documents never enter the top $k$, no reranker helps.
- **Chasing a small offline gain into a production regression.** A team doubled depth from 100 to 200 for 0.003 of nDCG; p95 doubled, autoscaling lagged at a traffic peak, batch timeouts fired, and the fallback served unreranked retrieval order to a third of peak queries. Production quality ended up worse than at depth 100. The sweep must include load, not just labels.
- **Freezing depth after one sweep.** It is a property of the current pair of stages, and both change.

**How to approach the questions**

1. When a scenario describes a query the system got wrong, ask which architecture *could* have got it right. Negation, numeric and unit constraints, disambiguation and rare exact terms are cross-encoder territory.
2. For any cost question, count forward passes. $n$ candidates means $n$ passes; corpus size enters only through the recall stage.
3. When metrics stay flat after a reranker upgrade, suspect the candidate ceiling before the model.
4. For depth questions, find the knee against the stated tail-latency budget. The largest depth in the table is nearly always the distractor.
5. Convert a depth into a fleet: query rate × depth ÷ throughput per replica. Capacity questions are depth questions wearing a hat.
6. Watch for "the first stage improved" — the correct consequence is usually that depth can be *reduced*, not that quality became free.
7. Distinguish uncalibrated ordering from calibrated probability, and the reranker's order above $k$ from retrieval order below it.

**Where this leads**: this lesson assumed a shortlist arrives from somewhere. The next lesson, **Hybrid Sparse-Dense Fusion**, builds it properly — why sparse and dense retrieval fail differently, reciprocal rank fusion versus score normalisation, and the BM25 + vectors + RRF + reranker pattern, with the cross-encoder sitting last in it.
