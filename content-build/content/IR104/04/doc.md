Retrieval experiments fail when a precise number is mistaken for complete evidence. Offline metrics, online behavior, statistical tests, and qualitative analysis each expose different parts of system performance. Experimental discipline means knowing what each instrument measures, where it can mislead, and how to combine evidence before shipping a ranking change.

## Offline vs Online Evaluation: When Each Lies

Offline evaluation applies a fixed set of queries and relevance judgments to candidate rankings. It is fast, repeatable, and safe: an engineer can compare dozens of configurations without exposing users. Because the inputs are held constant, per-query score differences can be inspected and reproduced. Offline tests are excellent for catching obvious regressions, tuning within a known design space, and diagnosing retrieval mechanics.

Their central limitation is that judgments approximate user value. A label may say a document is relevant, but not whether its wording inspires trust, whether the answer is understandable, or whether the user completes a task. The query sample can be stale or unrepresentative. Pools can omit novel relevant documents. A metric cutoff may not match the interface. Offline evaluation can therefore be internally correct and externally wrong.

Suppose a new ranker raises nDCG@10 from 0.55 to 0.58 by promoting long authoritative manuals. On a support site, users may prefer concise steps and abandon the manuals. The offline gain is real under the labels and gain mapping, yet the measurement model values authority more than successful resolution. The remedy is not to ignore offline results; it is to revise labels or add task-oriented signals and confirm behavior online.

Online evaluation measures users interacting with systems, often through an A/B test. Randomly assigning eligible traffic to control and treatment helps isolate causal effects. Metrics may include successful reformulation rate, click-through, dwell time, save rate, conversion, or task completion. Guardrails track latency, errors, harmful results, and other costs.

Online metrics also lie. Position bias causes high-ranked results to receive clicks independent of relevance. A flashy but poor result may attract clicks. Long dwell can indicate careful reading or confusion. Short dwell can indicate abandonment or an immediate answer. Revenue can rise while trust deteriorates. Every behavioral metric needs a theory connecting it to user value and counter-metrics for obvious gaming paths.

Interference can violate a simple A/B model. Recommendations shown to one user can change inventory or social signals seen by others. Caches can mix treatment behavior. Returning users may cross devices or experiments. Logging differences between variants can manufacture a metric change. Before interpreting results, verify assignment integrity, exposure, event schemas, sample ratios, and missing data.

Novelty and learning effects matter. Users may initially explore a changed interface, inflating engagement, then settle into different behavior. A ranking change can require repeated exposure before users trust it. Run long enough to cover weekly cycles and inspect time-series effects rather than reporting only a pooled mean.

Offline and online evidence should form a funnel. Use offline gates to reject clearly inferior or unsafe candidates, then run controlled online tests for changes that pass. After an online outcome, return to the offline set and identify which queries predicted or contradicted it. This loop improves the evaluation model instead of treating the two stages as unrelated leaderboards.

A disagreement is diagnostic. Offline up and online down can indicate label mismatch, latency cost, presentation effects, or metric gaming. Offline down and online up can expose incomplete judgments, better diversity, or an online proxy that is itself misleading. Investigate mechanisms and guardrails before declaring either instrument authoritative.

## Variance Across Queries and Significance

A mean retrieval metric hides the distribution of per-query outcomes. If system A has nDCG values `[0.9, 0.9, 0.1, 0.1]` and system B has `[0.6, 0.6, 0.4, 0.4]`, both average 0.5. A is excellent for half the queries and poor for half; B is consistent. Product risk depends on which pattern and which queries matter.

System comparison is naturally paired because both rankers evaluate the same queries. For each query q, calculate `delta_q = metric_B(q) - metric_A(q)`. The mean delta estimates average change, while its distribution shows wins, losses, and outliers. An unpaired analysis throws away this shared-query structure and usually has less power.

Variance arises from query difficulty, intent, available relevant documents, judgment completeness, and metric discreteness. Reciprocal Rank on a small set can jump sharply when the first relevant result moves one position. nDCG may be smoother with multiple graded documents. Report median and quantiles alongside the mean, plus the fraction of queries improved, tied, and regressed.

A confidence interval communicates uncertainty around the estimated average change. Paired bootstrap resampling is practical: repeatedly sample queries with replacement, calculate the mean paired delta for each resample, and take appropriate percentiles. If 10,000 resamples produce a central 95 percent interval from 0.004 to 0.018, zero is outside the interval and the observed positive change is unlikely to be sampling noise under the method's assumptions.

Randomization or permutation tests offer another paired approach. Under a null hypothesis that system labels are exchangeable per query, randomly swap A and B outcomes within each pair and calculate a mean difference. The p-value is the fraction of randomized differences at least as extreme as observed. This tests evidence against a null; it does not measure business importance or the probability that the new system is good.

Statistical significance is not practical significance. With a very large query set, a mean nDCG increase of 0.0002 can be statistically clear but operationally irrelevant. Conversely, a large estimated improvement with a wide interval may warrant more data rather than rejection. Define a minimum practically important effect and interpret the estimate and interval against it.

Multiple comparisons inflate false discoveries. If an engineer tries 100 configurations and reports the one with the smallest p-value, chance can look like progress. Separate exploration from confirmation, retain a final untouched test set, limit declared primary metrics, or apply an appropriate multiplicity correction. The experiment log should include failed variants, not just the winner.

Query dependence can invalidate naïve resampling. Near-duplicate queries or many queries from one user session do not provide independent evidence. Resample at a cluster level, such as user, intent group, or session, when that matches data generation. In online experiments, use the randomization unit for inference and account for repeated measures.

Ties and deterministic evaluation matter too. Stable document ordering, fixed corpus snapshots, and versioned metric code prevent irrelevant run-to-run noise. Validate the metric implementation with hand-calculated cases and a trusted library. A confidence interval around a buggy metric is merely precise misinformation.

## Error Analysis by Query Class

Aggregate metrics say whether a system changed; error analysis helps explain why. Start from per-query deltas, inspect the largest regressions and improvements, and assign each query to classes connected to actionable mechanisms. The purpose is not storytelling around a few examples but finding repeated failure patterns that guide engineering work.

Useful classes include navigational, informational, transactional, exact identifier, entity, broad topic, multi-hop, multilingual, freshness-sensitive, and no-answer queries. Product-specific classes are often stronger. An enterprise search system might distinguish people, policies, project codes, and permission-restricted documents. A commerce system might distinguish category browsing, exact SKU, compatibility, and attribute constraints.

Classes can also describe failure mechanism: tokenization mismatch, synonym gap, overaggressive stemming, stale document, missing index coverage, poor length normalization, semantic false positive, filter failure, or reranker truncation. Intent and failure labels answer different questions and can coexist. Define guidelines so analysts apply them consistently.

For each class, report query count, baseline level, mean delta, uncertainty, win rate, and severe regressions. A class with three queries and a 0.20 gain is a lead, not strong proof. A class with 500 queries and a 0.02 loss demands attention even if overall performance rises. Include traffic or risk weights when priorities differ.

Consider a hybrid retriever whose mean nDCG rises 0.015. Slicing reveals broad natural-language queries improve 0.04, while exact error-code queries fall 0.12. Inspection shows semantic candidates consume the limited reranking pool, excluding exact lexical matches. The actionable fix may be protected exact-match candidates or query-dependent fusion, not reverting hybrid retrieval entirely.

Avoid defining classes after seeing every outcome solely to isolate wins. Maintain a preregistered core taxonomy, then mark newly discovered exploratory classes as hypotheses for the next evaluation. Otherwise repeated slicing can manufacture impressive segments by chance. Correct for multiple comparisons when making confirmatory claims across many slices.

Qualitative inspection needs a structured worksheet. Record query and intent, control and treatment rankings, labels, score contributions, candidate-source coverage, filters, and suspected root cause. Separate label errors from ranking errors. If a treatment retrieves a genuinely useful unjudged page, the evaluation set needs repair; forcing the ranker to match the stale label would be counterproductive.

Counterfactual debugging can localize pipeline loss. Ask whether the relevant document exists in the corpus, is indexed, enters lexical or semantic candidates, survives fusion, reaches the reranker, and remains after filters. Each stage has a different remedy. A final top-k miss alone does not identify where the system failed.

Prioritize by impact, frequency, severity, and tractability. Fixing a common tokenizer bug may help thousands of queries. A rare but dangerous compliance failure may outrank a larger average gain. Track discovered classes and root causes as regression suites, adding representative queries to the golden set without allowing it to become dominated by past incidents.

The final experiment review should combine aggregate metrics, uncertainty, class slices, representative cases, online guardrails when available, and known judgment limitations. A ship decision becomes an explicit tradeoff: which users improve, which risks remain, and what monitoring or rollback thresholds apply. That is more durable than declaring victory because one mean crossed a significance threshold.
