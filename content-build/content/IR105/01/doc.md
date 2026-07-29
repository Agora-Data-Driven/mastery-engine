BM25, the sparse half of a production hybrid retriever, looks like a wall of arbitrary constants until you see where it comes from: a chain of probability arguments that begins with a single decision-theoretic claim about what an optimal ranker should compute. This lesson derives the first three links of that chain — the Probability Ranking Principle, the Binary Independence Model, and the Robertson–Spärck Jones term weight — using nothing beyond the odds, Bayes' rule, and independence machinery you already command. The payoff at the end is concrete: the idf term you see inside every BM25 implementation is not a heuristic someone eyeballed; it falls out of this derivation as the special case of "we know nothing about which documents are relevant."

## Ranking by Probability of Relevance

Fix a query $q$ and model relevance as a binary random variable $R \in \{0, 1\}$ for each document $d$: either the document satisfies the information need behind $q$ or it does not. The **Probability Ranking Principle (PRP)**, formalized by Robertson in 1977, states: *present documents in order of decreasing $P(R=1 \mid d, q)$, estimated as well as the available evidence allows.* Every classical ranking model in this course is an attempt to compute something rank-equivalent to that probability.

Why is this ordering optimal and not just plausible? Suppose the ranker's estimates are correct, and consider any cutoff $k$. The expected number of relevant documents in the top $k$ is the sum of the $k$ relevance probabilities you chose to place there — expectation is linear, so this holds regardless of any dependence between documents' relevance. That sum is maximized by choosing the $k$ largest probabilities, and sorting in descending order achieves this *for every $k$ simultaneously with one ordering*. So PRP maximizes expected precision@k and expected recall@k at all cutoffs at once. Concretely: four candidates with $P(R{=}1) = 0.9, 0.7, 0.4, 0.2$. Ranked descending, expected precision@2 is $(0.9 + 0.7)/2 = 0.80$. Swap the second and third and it drops to $(0.9 + 0.4)/2 = 0.65$ — you gave away expected relevant results for nothing.

There is also a decision-theoretic form. If showing a non-relevant document costs $C_{fp}$ and failing to show a relevant one costs $C_{fn}$, the Bayes-optimal rule retrieves $d$ exactly when $P(R=1 \mid d, q) > C_{fp} / (C_{fp} + C_{fn})$. With $C_{fp} = 1$ and $C_{fn} = 4$ (missing an answer is four times worse than showing noise), the threshold is $0.2$. This matters beyond web-style ranked lists: when you decide which retrieved chunks are good enough to spend context-window budget on in a RAG pipeline, you are running exactly this thresholding rule, and it only works if the scores behave like calibrated probabilities. That exposes an important asymmetry: *ranking* needs only the correct ordering — any strictly monotone transform of the probability (a log, dropping a positive constant factor) preserves the ranking — but *thresholding* needs calibration. This "rank-equivalence" license, the freedom to apply monotone transforms and discard document-independent constants, is the engine that drives every derivation in the rest of this lesson.

Judgment layer — what PRP quietly assumes, and when experts knowingly violate it. First, it treats each document's usefulness as independent of what else is ranked. Ten near-duplicates of one relevant answer each have high $P(R=1)$, so PRP happily fills the top ten with them, even though the marginal utility of the second copy is almost zero. Diversification methods like Maximal Marginal Relevance deliberately break PRP for exactly this reason — as does deduplication before a RAG context is assembled. Second, relevance is conditioned on the query as stated, not on the intent behind it; PRP cannot rescue a bad query representation. Third, optimality is a statement about *correct* probabilities; a badly estimated model ranked "optimally" is still bad. PRP tells you what to compute. The rest of the course is about how.

## The Binary Independence Model

The **Binary Independence Model (BIM)** is the first workable answer to "how do we estimate $P(R=1 \mid d, q)$?" Its two title assumptions name its two simplifications. *Binary*: represent each document as an incidence vector $\vec{x} = (x_1, \dots, x_V)$ over the vocabulary, where $x_t = 1$ if term $t$ appears in the document and $0$ otherwise — term frequency is discarded entirely. *Independence*: term occurrences are conditionally independent of each other given the relevance class (the same conditional-independence move a naive Bayes classifier makes). Two further assumptions ride along: relevance is binary, and each document's relevance is independent of other documents' relevance.

Now derive the ranking function step by step. Since probabilities and odds are related by the strictly monotone map $O = P/(1-P)$, ranking by odds is rank-equivalent to ranking by probability, and odds make Bayes' rule collapse beautifully. Apply Bayes to numerator and denominator; $P(\vec{x} \mid q)$ cancels:

$$O(R \mid \vec{x}, q) = \frac{P(R=1 \mid \vec{x}, q)}{P(R=0 \mid \vec{x}, q)} = \frac{P(R=1 \mid q)}{P(R=0 \mid q)} \cdot \frac{P(\vec{x} \mid R=1, q)}{P(\vec{x} \mid R=0, q)}$$

The first factor is the prior odds of relevance for this query — the same number for every document — so by rank-equivalence we drop it. Now invoke conditional independence to factor the likelihood ratio across terms, and define the two probabilities that carry all the model's knowledge: $p_t = P(x_t = 1 \mid R=1, q)$, the chance a *relevant* document contains $t$, and $u_t = P(x_t = 1 \mid R=0, q)$, the chance a *non-relevant* one does. Splitting the product by whether the document contains each term:

$$\frac{P(\vec{x} \mid R=1, q)}{P(\vec{x} \mid R=0, q)} = \prod_{t : x_t = 1} \frac{p_t}{u_t} \prod_{t : x_t = 0} \frac{1 - p_t}{1 - u_t}$$

Next assumption: for terms *not in the query*, $p_t = u_t$ — a term the user didn't ask about is equally likely in relevant and non-relevant documents. Every non-query factor becomes 1, so both products now run over query terms only. One problem remains: the second product ranges over query terms *absent* from the document, so it changes from document to document. The fix is an algebraic trick worth memorizing. For each query term present in the document, multiply by $\frac{1-p_t}{1-u_t}$ and divide it back out. The multiplied copies complete the second product into $\prod_{t \in q} \frac{1-p_t}{1-u_t}$ — over *all* query terms, hence document-independent, hence droppable — and the divided copies join the first product:

$$O(R \mid \vec{x}, q) \;\propto\; \prod_{t \in q \,\cap\, d} \frac{p_t (1 - u_t)}{u_t (1 - p_t)}$$

Take the log (monotone again) to get the **Retrieval Status Value**:

$$RSV(d) = \sum_{t \in q \cap d} \log \frac{p_t (1 - u_t)}{u_t (1 - p_t)}$$

Micro-example. Query `gke autoscaler`, with $p_{gke} = 0.6$, $u_{gke} = 0.02$, $p_{auto} = 0.4$, $u_{auto} = 0.01$. The `gke` weight is $\ln\frac{0.6 \times 0.98}{0.02 \times 0.4} = \ln 73.5 \approx 4.30$; the `autoscaler` weight is $\ln\frac{0.4 \times 0.99}{0.01 \times 0.6} = \ln 66 \approx 4.19$. A document containing both scores $\approx 8.49$; one containing only `gke` scores $4.30$; one containing neither scores $0$.

Pause on the *shape* of the result, because it outlives every assumption used to reach it: the score is a **sum, over query terms present in the document, of a per-term weight**. That is precisely the computation an inverted index makes cheap — walk the postings lists of the query terms only, accumulate weights per document, never touch the rest of the collection. BIM's assumptions are false in detail (in `new york`, the terms are wildly dependent; the binary representation cannot distinguish one mention from thirty; document length is invisible), and the last two failures are exactly what BM25 repairs in the next lesson. But the additive-over-matched-terms skeleton, and the license to derive weights via odds and rank-equivalence, are the permanent contributions.

## The RSJ Term Weight and Its idf Connection

The per-term log-odds weight from the BIM derivation is the **Robertson–Spärck Jones (RSJ) weight**:

$$c_t = \log \frac{p_t (1 - u_t)}{u_t (1 - p_t)}$$

Read it as the sum of two log odds: $\log\frac{p_t}{1-p_t}$ (how strongly relevant documents attract the term) minus $\log\frac{u_t}{1-u_t}$ (how strongly non-relevant ones do). Estimating it requires guessing $p_t$ and $u_t$. Suppose we have relevance judgments: out of $N$ documents, $n_t$ contain term $t$; $R$ are judged relevant, of which $r_t$ contain $t$. The contingency table is:

|              | relevant    | non-relevant          | total     |
|--------------|-------------|-----------------------|-----------|
| contains $t$ | $r_t$       | $n_t - r_t$           | $n_t$     |
| lacks $t$    | $R - r_t$   | $N - n_t - R + r_t$   | $N - n_t$ |
| total        | $R$         | $N - R$               | $N$       |

Raw maximum-likelihood estimates ($\hat{p}_t = r_t / R$, $\hat{u}_t = (n_t - r_t)/(N - R)$) explode whenever a cell is zero — a term appearing in every judged-relevant document gives $\hat{p}_t = 1$ and an infinite log odds. The standard fix adds $0.5$ to every cell (a continuity correction in the spirit of a Jeffreys prior), giving the estimated RSJ weight:

$$c_t = \log \frac{(r_t + 0.5)\,/\,(R - r_t + 0.5)}{(n_t - r_t + 0.5)\,/\,(N - n_t - R + r_t + 0.5)}$$

Worked example with feedback. $N = 100{,}000$, term `gke` with $n_t = 2{,}000$; a user has judged $R = 20$ documents relevant, $r_t = 15$ of which contain `gke`. Relevant-side odds: $15.5 / 5.5 = 2.82$. Non-relevant side: $(2000 - 15 + 0.5) = 1985.5$ occurrences among $(100000 - 2000 - 20 + 15 + 0.5) = 97995.5$ non-occurrences, giving inverted odds $97995.5 / 1985.5 = 49.4$. So $c_t = \ln(2.82 \times 49.4) = \ln 139.1 \approx 4.94$.

Now the punchline of the lesson: **what happens with no relevance information at all** — the situation of every cold-start query. Set $R = r_t = 0$ in the formula. The relevant-side ratio becomes $0.5 / 0.5 = 1$ (equivalently: with zero evidence, assume $p_t = 0.5$, a maximum-ignorance prior that cancels out of the weight), and what survives is:

$$c_t = \log \frac{N - n_t + 0.5}{n_t + 0.5}$$

This is an **inverse document frequency**. The same conclusion falls out of a second route: with no judgments, the relevant set is a negligible sliver of the collection, so the non-relevant distribution is essentially the collection distribution, $u_t \approx n_t / N$, and with $p_t = 0.5$ the weight is $\log\frac{N - n_t}{n_t} \approx \log\frac{N}{n_t}$ for rare terms. Spärck Jones proposed $\log(N/n_t)$ in 1972 as a purely empirical heuristic — rare terms discriminate, common terms don't. The RSJ derivation shows it is the zero-knowledge limit of a principled relevance weight. And the smoothed form above is *verbatim* the idf inside BM25, which the next lesson assembles.

Numbers, with $N = 100{,}000$ throughout and natural logs. A selective term with $n_t = 1{,}000$: $\ln(99000.5 / 1000.5) = \ln 98.9 \approx 4.59$. A very rare term with $n_t = 10$: $\ln(99990.5 / 10.5) \approx 9.16$, and the classic $\ln(N/n_t) = \ln 10000 \approx 9.21$ — the two variants agree closely for rare terms. But a stopword-like term with $n_t = 90{,}000$: $\ln(10000.5 / 90000.5) \approx -2.20$. The RSJ weight goes **negative** for any term in more than half the documents ($n_t > N/2$), because under the model, presence of a near-ubiquitous term is mild evidence *against* relevance. That is theoretically coherent but operationally awkward — a document can be penalized for containing a common query word — so practical systems floor or reformulate the weight; you will meet Lucene's specific fix when tuning BM25.

Judgment layer. The full RSJ weight, not just its idf limit, is what you'd use whenever real relevance signal exists — and modern systems have one lying around: clicks. Treating clicked results as judged-relevant lets you estimate $r_t$ and $R$ per query, and the worked example above shows how strongly it sharpens weights (4.94 vs 3.89 for `gke` had we used the no-feedback formula with $n_t = 2000$: $\ln(98000.5/2000.5) \approx 3.89$). The caveats are real, though: click data is biased toward whatever ranked high already (presentation bias), tiny $R$ makes $\hat{p}_t$ extremely noisy, and with $R$ in the single digits the $0.5$ corrections dominate the estimate. Formal relevance feedback — asking the model to update on explicit judgments — returns as this course's final lesson; the RSJ weight is the probabilistic machinery it was originally built for.
