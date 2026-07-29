Your production retriever — BM25 and embeddings fused with reciprocal rank fusion, then a reranker — emits an *ordered list*, and every tuning decision you make (fusion weights, rerank depth, how many chunks to stuff into a prompt) changes that order. The set-based precision, recall, and F1 you mastered in ML treat output as an unordered bag, so they are blind to most of what your system actually does. This lesson rebuilds evaluation for rankings in three steps: cutoff metrics (P@k, R@k), a whole-ranking summary that rewards putting relevant documents early (AP and MAP), and a first-hit metric for single-answer tasks (RR and MRR).

## Precision@k and Recall@k: What Ranking Changes

Recall from ML: precision = TP/(TP+FP) and recall = TP/(TP+FN), computed over a *fixed predicted set*. A classifier hands you that set by thresholding a score. A retrieval system does not: BM25 or your fused hybrid assigns a score to essentially every document, producing a total ordering of the corpus. "The retrieved set" is undefined until you choose a cutoff `k` — and the cutoff is a modeling decision, not a nuisance parameter.

Cut the ranking at position `k` and treat the top-`k` as the retrieved set:

$P@k = \frac{|\text{relevant} \cap \text{top-}k|}{k}$, and $R@k = \frac{|\text{relevant} \cap \text{top-}k|}{R}$

where $R$ is the total number of relevant documents for the query. Worked example: query `cloud run cold start latency`, with $R = 4$ relevant documents in the judged set. System A ranks relevant documents at positions 1, 3, 5, and 10. Then P@5 = 3/5 = 0.60 and R@5 = 3/4 = 0.75; P@10 = 4/10 = 0.40 and R@10 = 4/4 = 1.00. Note the mechanics: as `k` grows, recall can only rise or stay flat (the numerator is non-decreasing, the denominator fixed), while precision tends to fall (every increment adds 1 to the denominator but only sometimes 1 to the numerator). Sweeping `k` from 1 to the list depth traces exactly the precision-recall tradeoff curve you know from classifiers — the rank cutoff plays the role of the score threshold.

So what does ranking change? Two things. First, there is no longer one precision and one recall per system; there is one *pair per cutoff*, and you must pick cutoffs that match how the output is consumed. Second — the subtle part — P@k and R@k are sensitive to rank only *across* the cutoff boundary, never *within* it. If System B ranks the same four relevant documents at positions 6, 7, 8, 9, it ties System A at P@10 = 0.40 and R@10 = 1.00, even though A answered at rank 1 and B made the user scan five junk results first. Swapping the documents at ranks 1 and 10 changes nothing at P@10. Any metric built from a single cutoff treats the top-`k` as a bag.

Two denominator gotchas bite in practice. (1) If a query has fewer than `k` relevant documents, P@k cannot reach 1: with $R = 3$, the ceiling on P@10 is 0.3, so averaging P@10 across queries with wildly different $R$ punishes queries for having few relevant answers. R-precision — precision at cutoff $R$, i.e. P@R — adapts the cutoff per query and fixes this. (2) R@k needs $R$, the count of *all* relevant documents in the corpus, which nobody knows exactly; in practice $R$ is the count of relevant documents in the judged set, so recall is always relative to those judgments (how judgments get made feasibly is a later lesson).

Judgment layer: choose `k` by consumption point. For a search results page, P@10. For a RAG pipeline that stuffs 5 chunks into the prompt, P@5 and R@5 — a relevant chunk at rank 6 does not exist as far as the LLM is concerned. For a first-stage candidate generator feeding your reranker, R@100 or R@1000 is the metric that matters, and precision there barely matters at all: the reranker can reorder the top 200, but it can never recover a document the first stage failed to surface. Missed recall at the first stage is unfixable downstream; poor precision is merely work for the next stage. What no cutoff metric rewards is placing relevant documents at rank 1 instead of rank `k` — that is the job of average precision.

## Average Precision and MAP

Average precision (AP) summarizes the entire ranking for one query in a way that rewards early placement. Mechanism: walk down the ranking; at each position where a relevant document appears, record the precision at that position; average those precision values over $R$, the total number of relevant documents:

$AP = \frac{1}{R} \sum_{d \in \text{relevant}} P@\text{rank}(d)$

with any relevant document that never gets retrieved (or falls below the evaluation depth) contributing exactly 0 to the sum.

Worked example, same ranking as before (relevant at 1, 3, 5, 10; $R = 4$): P@1 = 1.0, P@3 = 2/3 ≈ 0.667, P@5 = 3/5 = 0.600, P@10 = 4/10 = 0.400. So AP = (1.0 + 0.667 + 0.600 + 0.400)/4 ≈ 0.667. Now move only the last relevant document from rank 10 up to rank 6: P@6 = 4/6 ≈ 0.667 and AP = (1.0 + 0.667 + 0.600 + 0.667)/4 ≈ 0.733. P@10 and R@10 did not move; AP did. That is the whole point — AP sees the position of *every* relevant document, and improving any of those positions improves the score.

Three interpretations make AP less arbitrary than it first looks. First, it is (approximately) the *area under the uninterpolated precision-recall curve*: each relevant hit raises recall by exactly $1/R$, and you sample precision at each of those $R$ equally spaced recall increments, so the average approximates $\int_0^1 P \, dR$ — a Riemann sum with width $1/R$, as you know from calculus. Second, it is the *expected precision experienced by a user who stops reading at a relevant document chosen uniformly at random* — a crude but honest user model. Third, it is intrinsically top-heavy without any explicit discount function: a relevant document at rank 1 contributes 1.0 to the sum, while a relevant document at rank 100 preceded by few relevant ones contributes P@100 ≈ small. Late hits are worth little because precision at deep ranks is diluted by everything above them.

MAP (mean average precision) is the arithmetic mean of AP over the query set. It is a *macro*-average: each query carries equal weight whether it has 1 relevant document or 50. Queries with zero relevant documents in the judgments are excluded (AP is undefined there — $R = 0$).

Judgment layer. AP assumes *binary* relevance: a document is relevant or it is not. If your judgments are graded ("perfect", "partially useful", "off-topic"), you must squash them to binary before computing MAP, and the squashing threshold can change which of two systems wins — a real hazard covered in the next lesson. MAP also evaluates the ranking to the full evaluation depth (commonly 1000): if your product only ever exposes the top 5, MAP happily credits improvements at ranks 20 to 50 that no user will ever see, so a MAP win can be a product non-event. On single-relevant-document queries AP degenerates into something simpler (next section). Finally, because AP is an average whose granularity depends on $R$, per-query AP values are noisy and heavy-tailed — report the per-query distribution, not just the mean; the statistics of that come in the final lesson of this course.

## Reciprocal Rank and MRR

Some tasks need exactly one hit: known-item search ("that runbook about Firestore backups"), navigational queries, factoid lookup, or a RAG setup where a single gold passage contains the answer. For these, define the reciprocal rank of a query as $RR = 1/r_1$, where $r_1$ is the rank of the *first* relevant result, and $RR = 0$ if no relevant result appears in the list (or above the cutoff — MRR@10, which only inspects the top 10, is a common variant). MRR is the mean of RR over the query set.

Worked example: three queries whose first relevant results land at ranks 1, 2, and 4 give RR values 1.0, 0.5, and 0.25, so MRR = 1.75/3 ≈ 0.583. Add a fourth query with no relevant document in the top 10, scored under MRR@10: it contributes 0, and MRR = 1.75/4 ≈ 0.438.

Why the *reciprocal* of the rank rather than the rank itself? Two reasons, both practical. First, the reciprocal is top-heavy in a way that matches user abandonment: dropping from rank 1 to rank 2 costs 0.5 of the score, while dropping from rank 9 to rank 10 costs about 0.011 — differences deep in the list barely matter, which is how users behave. Second, boundedness: RR lives in (0, 1] (or {0} ∪ (0,1] with a cutoff), so one catastrophic query — first hit at rank 500 — cannot dominate the mean the way it would dominate *mean rank*, which is unbounded and outlier-hostile. Note from probability that the mean of reciprocals is not the reciprocal of the mean rank: by Jensen's inequality, $E[1/r] \ge 1/E[r]$, so never convert an MRR back into "average position" — compute and report the median first-relevant rank separately if stakeholders want a rank number.

Here is a clean identity worth deriving. Suppose a query has exactly one relevant document, at rank $r$. Then $R = 1$ and the AP sum has one term: $AP = \frac{1}{1} \cdot P@r = \frac{1}{r} = RR$, since precision at rank $r$ is one relevant document out of $r$ seen. So AP equals RR whenever $R = 1$, and MRR is exactly MAP restricted to single-answer queries. If your evaluation set has one judged relevant passage per query, MAP and MRR are the same number — computing both tells you nothing extra.

Judgment layer. MRR is completely blind past the first hit: a system returning one relevant document followed by nine junk results ties a system returning ten relevant documents. That makes it *wrong* for recall-oriented tasks (research queries, legal-style discovery, candidate generation) and for any consumer that reads multiple results — a RAG prompt built from the top 5 chunks cares about all five slots, not the first. MRR is also statistically chunky: per-query RR takes only the discrete values 1, 0.5, 0.333, 0.25 … so the per-query distribution is coarse and high-variance, and you need a large query set before small MRR deltas mean anything. And the cutoff variant has a cliff: under MRR@10, moving a first hit from rank 10 (0.1) to rank 11 (0.0) reads as total failure, an artifact rather than a user-visible catastrophe.

The three families in one view:

| Metric | Sees | Blind to | Natural home |
|---|---|---|---|
| P@k, R@k | membership of top-`k` | order within top-`k` | fixed-size consumption (RAG top-5, results page), first-stage recall |
| AP / MAP | position of every relevant doc | graded degrees of relevance | whole-ranking quality, recall-oriented tasks with binary judgments |
| RR / MRR | position of first relevant doc | everything after the first hit | known-item, navigational, single-answer QA |

All three assume binary relevance. What happens when "relevant" comes in degrees — and which metric to reach for then — is the next lesson.
