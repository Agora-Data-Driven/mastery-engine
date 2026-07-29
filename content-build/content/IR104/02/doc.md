Binary relevance asks whether a result is relevant at all, but many search experiences need a richer judgment. A definitive answer, a useful overview, and a marginally related page should not receive identical credit. Graded relevance metrics preserve those distinctions while still rewarding systems that place their strongest results near the top.

## Cumulative Gain and Discounting: nDCG

Cumulative Gain starts with an ordered result list and assigns each result a relevance grade. A common scale is 0 for irrelevant, 1 for marginally relevant, 2 for relevant, and 3 for highly relevant. For grades `[3, 0, 2, 1]`, the simplest cumulative gain through rank four is `CG@4 = 3 + 0 + 2 + 1 = 6`. This recognizes graded usefulness, but it does not care where each grade occurs. Reordering the list to `[0, 1, 2, 3]` still gives 6.

Search users care strongly about rank, so Discounted Cumulative Gain reduces the value of results appearing later. One common linear-gain definition is:

`DCG@k = rel_1 + sum from i=2 to k of rel_i / log2(i + 1)`

The first position receives full credit. Rank two is divided by `log2(3)`, rank three by `log2(4) = 2`, and later ranks receive progressively smaller credit. The discount models declining attention without pretending that everything after rank one is worthless. Some definitions apply the logarithmic denominator from rank one as well; because `log2(2) = 1`, the numeric result is the same.

Another widespread variant transforms each grade into exponential gain:

`DCG@k = sum from i=1 to k of (2^rel_i - 1) / log2(i + 1)`

For grades 0, 1, 2, and 3, the gains become 0, 1, 3, and 7. This makes a highly relevant result worth more than several marginal results. Whether that is desirable depends on the product. In medical or legal search, one authoritative answer may indeed be disproportionately valuable. In exploratory browsing, several diverse, moderately relevant results may collectively be better. The gain mapping expresses a utility assumption and must be documented.

Using exponential gain, compare lists A `[3, 0, 2]` and B `[2, 3, 0]`. A receives `7/1 + 0/log2(3) + 3/2 = 8.5`. B receives `3/1 + 7/log2(3) + 0/2`, approximately `3 + 4.417 = 7.417`. Both contain the same high and relevant results, but A wins because the best item is first. DCG therefore captures both the quality of retrieved items and their placement.

Raw DCG is difficult to compare across queries. A query with many highly relevant documents has more attainable gain than one with a single marginal answer. Normalized Discounted Cumulative Gain divides observed DCG by the best possible DCG for that query:

`nDCG@k = DCG@k / IDCG@k`

IDCG is the ideal DCG obtained by sorting the judged documents by decreasing relevance grade. For list B above, the ideal ordering is `[3, 2, 0]`, whose DCG is `7 + 3/log2(3)`, approximately 8.893. Thus B's `nDCG@3` is approximately `7.417 / 8.893 = 0.834`. The ideal ordering itself scores 1.

Normalization generally puts queries on a zero-to-one scale, enabling an average across a test collection. There is an edge case when IDCG is zero because no judged document has positive relevance. Division is undefined. Evaluation code must choose and report a policy, such as excluding those queries from nDCG aggregation or assigning a specified value. Silently treating them inconsistently can change experiment conclusions.

The cutoff k is part of the metric. nDCG@5 reflects a compact first screen, while nDCG@20 values deeper ranking. A system can improve one and harm the other. Suppose it moves a grade-3 result from rank 15 to rank 7 by displacing useful results near rank 4. nDCG@20 might rise while nDCG@5 falls. Choose cutoffs based on the interface and user behavior, and report multiple cutoffs when the product supports different depths.

Incomplete judgments also affect nDCG. Unjudged documents are often treated as grade zero, but an unjudged result is not proven irrelevant. A new system retrieving novel documents can be unfairly penalized compared with systems whose results formed the original judging pool. Deeper pooling, targeted judging of changed results, and metrics designed for incomplete judgments can reduce the bias. The metric's mathematical precision does not repair weak labels.

Grades need operational definitions. Assessors should know what separates a 2 from a 3, whether authority and freshness count, and how intent ambiguity is handled. Measure agreement and adjudicate difficult examples. If one assessor calls any topical mention relevant while another requires a complete answer, score changes may reflect annotation drift rather than ranking quality.

nDCG is most useful when relevance genuinely has levels, position matters, and the gain mapping resembles product utility. Always record the grade scale, gain transform, logarithm convention, cutoff, zero-IDCG policy, and unjudged-document policy. Two dashboards both labeled nDCG can otherwise calculate materially different quantities.

Ties deserve an explicit policy too. If two documents share a grade, exchanging them does not change ideal gain, but deterministic ordering makes experiments reproducible. When predicted scores tie, use a stable secondary key so repeated runs do not produce noisy metric differences that look like ranking changes.

## MAP vs nDCG: Choosing by Relevance Model

Mean Average Precision and nDCG answer related but different questions. Average Precision assumes binary relevance. For one query, it averages precision at the ranks where relevant documents appear, usually dividing by the number of known relevant documents. MAP then averages AP across queries. It rewards retrieving all relevant items and placing them early, but every relevant item has the same relevance value.

nDCG naturally supports graded relevance and applies an explicit positional discount. It asks how much discounted gain the ranking achieved relative to the ideal ordering. MAP asks how effectively the ranking retrieves the binary relevant set. The choice should begin with the product's relevance model, not with whichever metric is more familiar.

Consider two rankings with binary labels at the first four positions. A is `[1, 0, 1, 0]`; B is `[1, 1, 0, 0]`. If exactly two relevant documents exist, A has `AP = (P@1 + P@3) / 2 = (1 + 2/3) / 2`, approximately 0.833. B has `AP = (P@1 + P@2) / 2 = 1`. MAP favors B because it retrieves both relevant documents without an irrelevant interruption.

Now suppose the two relevant results have grades 1 and 3. Binary AP treats them equally. A system placing grade 1 first and grade 3 third can receive the same AP as one placing grade 3 first and grade 1 third. nDCG distinguishes them because the high-gain result benefits more from the early position. If users strongly prefer the definitive result, this distinction is essential.

MAP is well suited to tasks where relevance is meaningfully yes or no and retrieving the complete relevant set matters. Examples include finding all documents responsive to a narrow legal request, locating every known duplicate, or retrieving a set of eligible records for later review. It is sensitive to missed relevant items through the AP denominator and to interruptions through precision at relevant ranks.

nDCG is often better for web search, recommendations, help centers, and other ranked experiences where usefulness varies. A direct answer can receive grade 3, a strong supporting page grade 2, and a tangential result grade 1. The cutoff and discount can reflect attention at the top of the interface. nDCG does not require every positive grade to be equally interchangeable.

Neither metric automatically captures all product value. MAP does not directly express graded utility. nDCG may give little pressure to find every relevant item if k is shallow. Neither inherently measures novelty, diversity, latency, trust, harmful content, or task completion. A recommender showing ten near-identical highly relevant items can have excellent nDCG but a poor user experience. Metrics should be a small portfolio tied to known risks.

Label quality can determine the choice. Graded judgments demand assessors reliably distinguish levels. If agreement between grades 2 and 3 is poor, exponential gain may amplify noise. Collapsing uncertain grades into binary labels and using MAP can produce a more stable signal, although it loses nuance. Alternatively, improve the rubric, use adjudication, and test metric sensitivity under plausible label changes.

Metric aggregation can also hide behavior. Both MAP and mean nDCG give each query equal weight by default, regardless of traffic. This is helpful when every information need should count equally, but it may not predict aggregate user impact. Report macro averages alongside traffic-weighted summaries and per-query deltas. A modest average gain produced by large improvements on rare queries and regressions on frequent ones demands different judgment from the reverse.

Statistical testing should operate on per-query metric differences. If system B improves mean nDCG from 0.52 to 0.53, inspect whether the change is broad or driven by a few queries. Use paired resampling or an appropriate paired test, confidence intervals, and query-class slices. The same discipline applies to MAP. A metric value without its variation is weak evidence.

Sometimes reporting both metrics is valuable. For a collection with grades, calculate nDCG on the full labels and MAP after mapping chosen positive grades to relevant. If nDCG improves while MAP falls, the new ranker may be promoting the best items but losing coverage of marginally relevant ones. That is not automatically good or bad; it exposes the tradeoff for a product owner to resolve.

Choose MAP when binary set retrieval and coverage are the faithful abstraction. Choose nDCG when degrees of gain and rank-sensitive utility are faithful. Define the labels and cutoff before comparing systems, retain per-query results for diagnosis, and avoid retroactively selecting the metric that makes a preferred experiment win. Evaluation is a model of user value, and the metric is correct only insofar as that model is correct.
