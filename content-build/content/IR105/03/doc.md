The language-modeling view of retrieval asks a generative question: how likely is a document's word distribution to produce the query? This reframes ranking without requiring that a document literally generated anything. It provides a probabilistic score, makes missing terms an explicit problem, and turns smoothing into the central design choice.

## Query Likelihood: Documents as Language Models

For each document d, estimate a language model that assigns a probability to vocabulary terms. The maximum-likelihood estimate is `P(t|d) = tf(t,d) / |d|`, where `|d|` is the document's token count. A document containing 100 tokens with `database` appearing 5 times assigns that term probability 0.05 before smoothing.

The query-likelihood approach ranks documents by `P(q|d)`. Under the unigram independence assumption, a query with terms `q1 ... qm` has:

`P(q|d) = product from i=1 to m of P(q_i|d)`

For query `database timeout`, if a document model assigns probabilities 0.05 and 0.02, its likelihood is `0.05 * 0.02 = 0.001`. Another document assigning 0.02 to each term has likelihood 0.0004, so the first ranks higher. Repeated query terms appear repeatedly in the product and therefore carry additional influence.

The independence assumption discards query order and dependence, much like bag-of-words vector retrieval. `database timeout` and `timeout database` receive the same score. Phrase or proximity features can supplement the unigram model when order matters. The simplification remains useful because it aligns with inverted-index traversal: only query-term statistics need to be gathered for candidate documents.

Products of many small probabilities underflow in floating-point arithmetic. Rankers therefore use log likelihood:

`log P(q|d) = sum from i=1 to m of log P(q_i|d)`

The logarithm preserves ordering because it is monotonic. For probabilities 0.05 and 0.02, the log score is approximately `-2.996 + -3.912 = -6.908`. A less negative score is better. Implementations may omit query-constant terms when they do not affect ranking, but explanations should remain connected to the full model.

Query likelihood balances occurrences with document length through probability estimation. Five occurrences in a 100-token document yield 0.05, while five in a 1,000-token document yield 0.005. The focused document receives stronger evidence. This normalization is not automatically correct for every collection: long documents cover more topics and may need passage retrieval or a smoothing method whose length behavior fits the domain.

Consider query `neural database` and two documents. A has length 100 with tf values 4 and 1; B has length 1,000 with values 20 and 10. Maximum-likelihood probabilities give A `0.04 * 0.01 = 0.0004` and B `0.02 * 0.01 = 0.0002`, so A wins despite B's larger raw counts. The model compares term proportions, not occurrence totals.

Query likelihood is not the probability that a document is relevant. It is a ranking signal derived from how compatible the query is with an estimated document distribution. A fluent but irrelevant document can share terms, and a relevant synonym-only document can have little lexical likelihood. Relevance judgments are still required to select smoothing, fields, candidate generation, and supplementary features.

The model offers interpretable term contributions. An explanation can show document tf, document length, collection probability, smoothed probability, and log contribution for each query term. This makes a zero or rare-term penalty visible and helps distinguish tokenization failure from legitimate statistical behavior.

## Why Smoothing Is Mandatory: The Zero-Frequency Problem

Maximum-likelihood document models assign probability zero to every term absent from a document. Because query likelihood multiplies term probabilities, one missing query term makes the entire product zero. For query `database timeout`, a document strongly discussing databases but using the synonym `latency` instead of `timeout` receives zero, tied with documents missing both terms. The score loses useful distinctions.

The issue also violates the expectation that a language model define a distribution over plausible vocabulary. A short document has observed only a tiny sample of language; unseen does not mean impossible. Smoothing reserves or borrows probability mass for unseen terms, combining document evidence with a background collection model.

The collection model is commonly `P(t|C) = cf(t) / |C|`, where `cf(t)` is the term's total count in the collection and `|C|` is the total collection token count. If `timeout` appears 10,000 times among 100 million tokens, its collection probability is 0.0001. A document missing the term can borrow a positive probability related to that background rate.

Smoothing does more than prevent zeros. It regularizes unreliable estimates. Seeing a term once in a ten-token document gives maximum-likelihood probability 0.1, an extreme estimate based on little data. Seeing it 100 times in a 1,000-token document gives the same ratio with much more evidence. A good smoother controls how strongly each document estimate is trusted.

Probability mass must be redistributed coherently. Adding a fixed epsilon to missing query terms only during scoring may avoid numerical zero but does not form a normalized language model, depends arbitrarily on vocabulary size, and treats common and rare missing terms alike. Interpolation or Bayesian-style smoothing offers a principled relationship between document and collection evidence.

Smoothing introduces a retrieval effect resembling rarity weighting. A query term common in the collection receives a relatively large background probability, so observing it in a document is less surprising. A rare query term has a small background probability, and a genuine document occurrence can create a stronger likelihood ratio. This connection helps explain why language-model scoring and tf-idf-style scoring often produce related rankings despite different derivations.

Over-smoothing makes document models resemble the collection and weakens discrimination. Under-smoothing leaves brittle estimates dominated by sparse counts. The right strength depends on document length, corpus homogeneity, tokenization, query type, and evaluation labels. Tune on held-out queries, inspect length slices, and retain a separate test set.

Out-of-vocabulary terms require a policy beyond ordinary document smoothing. If a query token never occurs in the collection, `P(t|C)` is also zero. Character models, subword tokenization, spelling correction, a reserved unknown-token probability, or query rewriting can supply coverage. Silently dropping the term may be reasonable for noise but disastrous for a new product identifier.

Numerical safeguards remain necessary after smoothing. Calculate scores in log space, validate that probabilities are positive and finite, and define behavior for empty documents and empty queries. Version collection statistics with the index so segments do not mix incompatible background models.

## Jelinek-Mercer vs Dirichlet Smoothing

Jelinek-Mercer smoothing uses a fixed interpolation between document and collection models:

`P_JM(t|d) = (1 - lambda) * P_ML(t|d) + lambda * P(t|C)`

Lambda lies between zero and one. At lambda zero, the model is unsmoothed. At lambda one, every document becomes the collection model and lexical discrimination disappears. A common design tunes lambda globally or by field and query class.

Suppose `P_ML(timeout|d) = 0.02`, `P(timeout|C) = 0.001`, and lambda is 0.2. The smoothed probability is `0.8 * 0.02 + 0.2 * 0.001 = 0.0162`. If the term is absent, the probability is `0.2 * 0.001 = 0.0002`. The fixed mixture gives every document the same interpolation proportion, regardless of length.

Dirichlet smoothing can be written:

`P_Dir(t|d) = (tf(t,d) + mu * P(t|C)) / (|d| + mu)`

Mu is a prior strength measured in pseudo-tokens. It adds `mu * P(t|C)` expected occurrences and `mu` background tokens. With document length 100, tf 2, collection probability 0.001, and mu 1,000, the probability is `(2 + 1) / 1,100`, approximately 0.00273.

Dirichlet has an adaptive interpolation interpretation:

`P_Dir(t|d) = (|d|/(|d|+mu)) * P_ML(t|d) + (mu/(|d|+mu)) * P(t|C)`

Short documents receive more background influence because their evidence is sparse. Long documents receive more weight on their own model. With mu 1,000, a 100-token document has background weight about 0.909, while a 2,000-token document has background weight about 0.333.

This length adaptation distinguishes the methods. Jelinek-Mercer applies a fixed lambda, though document probabilities already contain length normalization. Dirichlet changes the mixture weight directly with document length. Dirichlet scoring also contains a document-length-dependent penalty through its denominator, which can affect queries even when term ratios appear similar.

Parameter direction is easy to confuse. Increasing lambda in Jelinek-Mercer means more collection smoothing. Increasing mu in Dirichlet also means more background influence. But their numeric scales are incomparable: lambda is a fraction from zero to one, whereas mu relates to token count. A value of 0.2 is plausible for lambda but generally not an equivalent Dirichlet strength.

Jelinek-Mercer can work well when a consistent fixed interpolation suits the collection or when query behavior motivates its term treatment. Dirichlet is often attractive for varied document lengths because evidence strength changes naturally with length. Neither wins by theorem for relevance. Tokenization, fields, passages, and label definitions alter the observed optimum.

Tune parameters on held-out queries using the target metric, and plot performance across a broad grid rather than reporting one point. Examine long and short documents, rare and common query terms, and exact identifiers. A flat region is operationally preferable to a narrow optimum that may drift when the collection changes.

Implementation should precompute collection probabilities, use consistent token counts, and calculate log scores. For efficiency, algebraic rearrangements may separate matched-term contributions from document-level normalization, but tests should compare optimized results with the direct formula. Record smoothing family, parameter, collection-statistics version, tokenizer, and field policy as part of the scoring model.

The practical decision is a modeling judgment: Jelinek-Mercer says every document borrows the same fraction from the collection, while Dirichlet says shorter evidence should borrow more. Choose the assumption that best matches the corpus, then verify it with relevance evaluation and error analysis rather than relying on a conventional default.
