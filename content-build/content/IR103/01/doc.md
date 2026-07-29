An inverted index identifies documents containing query terms; ranking must decide how much each match means. Two observations drive classical lexical weighting: repeated occurrences provide diminishing evidence that a document is about a term, and a match on a rare term is more informative than a match on a ubiquitous one. Term frequency and inverse document frequency turn those observations into numeric weights that later become vector-space scores.

## Term Frequency and Its Saturation Problem

For term $t$ and document $d$, raw **term frequency** $tf_{t,d}$ is the number of times $t$ occurs in $d$. A first scoring rule might sum raw frequencies for query terms:

$$S(q,d)=\sum_{t\in q} tf_{t,d}$$

If query is `vector database`, document A contains `vector` 5 times and `database` once, so score 6; document B contains each twice, so score 4. This rewards repeated evidence.

Raw frequency assumes the tenth occurrence is worth exactly as much as the first. That is rarely true. The first `database` changes the document from nonmatching to matching; the second supports topicality; the fiftieth may be boilerplate or keyword stuffing. Evidence should grow **sublinearly** or saturate.

A common sublinear transform is:

$$w_{tf}(t,d)=
\begin{cases}
1+\log(tf_{t,d}) & tf_{t,d}>0\\
0 & tf_{t,d}=0
\end{cases}
$$

Using natural log, frequencies 1, 2, 10, and 100 become weights 1, 1.693, 3.303, and 5.605. Increasing frequency 10-fold from 10 to 100 adds only $\log 10\approx2.303$, not 90 units. Any logarithm base yields the same ranking when applied consistently up to a scale factor.

Another choice is binary frequency: weight 1 if present, 0 otherwise. It saturates immediately and suits fields where repetition carries little meaning, such as a short tag set. Square root $tf^{1/2}$ is sublinear but less aggressive than logarithm at some scales. Later probabilistic ranking introduces a bounded rational saturation curve; this lesson stays with general weighting choices.

Worked spam comparison: relevant document R contains `retrieval` 8 times in 1,000 words; spam S repeats it 80 times in 300 words. Raw tf gives S ten times R's term evidence, 80 versus 8. Log tf gives $1+\ln8\approx3.08$ and $1+\ln80\approx5.38$, only 1.75 times. Sublinearity does not fully solve spam or length bias, but it prevents repetition from dominating proportionally.

Frequency is field-dependent. Three mentions in a six-word title are suspicious and redundant; three in a long body can be normal. Field-specific weights or normalized variants reflect that difference. Tokenization and stemming also change tf: merging morphological variants increases counts, while stop-word removal deletes counts.

**Maximum-frequency normalization** divides by the largest term frequency in that document, or uses an augmented form such as $0.5+0.5(tf/\max tf)$. It reduces document-specific scale but is unstable: adding one highly repeated unrelated term changes every other term's normalized weight. Document-length normalization at vector-score time, taught next lesson, is often cleaner.

Judgment: choose tf transform from whether repetition is evidence in the field and inspect adversarial tails. Binary for categories and exact attributes; sublinear for prose; raw counts mainly when counts themselves are the phenomenon. No tf rule alone accounts for collection rarity, which is why IDF multiplies it.

The zero-frequency branch must be explicit. Extending $1+\log tf$ to $tf=0$ is undefined and would incorrectly assign weight if handled with a generic fallback. Sparse implementations simply store weights for present terms. Unit tests should cover zero, one, threshold values, and very large counts; a transform that behaves sensibly on ordinary prose can overflow, lose precision, or dominate scores on generated junk.

## Inverse Document Frequency: Rare Terms Carry Signal

Let $N$ be corpus document count and $df_t$ the number containing term $t$. The empirical probability that a uniformly sampled document contains $t$ is $p_t=df_t/N$. The information content of observing an event with probability $p$ is $-\log p$, so:

$$idf_t=-\log\frac{df_t}{N}=\log\frac{N}{df_t}$$

This is the core derivation: a rare event carries more information. If every document contains `the`, $df=N$ and $idf=\log1=0$; matching it does not distinguish documents. If `reciprocal` occurs in 100 of one million documents, $idf=\ln(1{,}000{,}000/100)=\ln10{,}000\approx9.21$.

Worked corpus with $N=10{,}000$: `database` appears in 1,000 documents, so $idf=\ln10\approx2.303$; `vector` in 100, so $idf=\ln100\approx4.605$. One `vector` occurrence carries twice the IDF of one `database` occurrence because it narrows the candidate population by another factor of ten.

IDF is collection-specific. Adding documents changes $N$ and term document frequencies. A specialist corpus where `vector` appears in half the documents gives it low IDF, while a general corpus may make it rare. Scores from separately computed indexes are not inherently comparable.

The unsmoothed formula has edge cases. A query term absent from the corpus has $df=0$ and division by zero; it has no postings and contributes nothing, so an implementation handles absence before scoring. Very small corpora produce unstable values. Smoothed variants include:

$$idf_t=\log\frac{N+1}{df_t+1}+1$$

The added constants keep values finite and positive. Another variant uses $\log(N/(1+df_t))$. These are engineering conventions, not interchangeable numbers. Persist the formula with model configuration.

High IDF is not automatically trustworthy. A random UUID, typo, or extraction corruption is maximally rare but may be useless. Vocabulary filtering, spelling correction, field rules, and quality controls prevent noise from receiving extreme influence. Cap IDF or ignore terms below a minimum collection frequency when rare noise dominates, while recognizing that genuine identifiers may also be rare.

Document frequency counts documents, not occurrences. Repeating a term 1,000 times in one document increases collection frequency but adds only one to $df$. This makes IDF complementary to tf: tf describes within-document evidence; IDF describes across-collection discrimination.

Judgment: IDF favors exact rare identifiers and specialist terms, which is lexical retrieval's great strength. It hurts when rare surface forms are typos or when common terms are essential to phrases. Use phrase constraints and analyzer quality rather than expecting one scalar rarity weight to encode all semantics. Recompute or version statistics when corpus composition changes materially.

Segment-local IDF creates another trap. If each immutable segment computes rarity independently, a term rare in a tiny new segment can receive a score incomparable with the same term in the main segment. Search systems commonly use collection-level statistics, approximate global statistics, or merge-normalized scoring. Whatever choice is made, evaluation must include newly ingested documents because inconsistent statistics can create freshness-looking rank boosts unrelated to content quality.

## tf-idf Variants and Weighting Schemes

The basic document-term weight is:

$$w_{t,d}=tf_{t,d}\times idf_t$$

With logarithmic tf:

$$w_{t,d}=(1+\log tf_{t,d})\log\frac{N}{df_t}$$

for present terms, zero otherwise. A query can receive analogous weights, and document-query scoring later combines their vectors.

Worked example: $N=10{,}000$. `vector` has $df=100$, IDF 4.605; `database` has $df=1{,}000$, IDF 2.303. Document A has tf values 3 and 1. Raw tf-idf gives vector $3(4.605)=13.815$ and database $1(2.303)=2.303$. Log tf-idf gives $(1+\ln3)(4.605)\approx9.665$ and 2.303. The rarer term still dominates, while repetition is moderated.

The choices form a family:

- **Binary tf × idf:** term presence only; good for short sets.
- **Raw tf × idf:** linear repetition; simple but vulnerable to verbosity.
- **Log tf × idf:** diminishing returns; common prose baseline.
- **Augmented tf × idf:** normalize by document maximum; reduces scale but couples terms.
- **Boolean weighting without idf:** exact set matching when rarity should not affect eligibility.

Query weights need not match document weights. Short user queries usually contain each term once, so binary query tf is adequate while document tf is logarithmic. Repeating a query term intentionally could boost it, but accidental repetition should not multiply importance unchecked.

SMART notation describes combinations compactly. A three-letter code specifies term-frequency, document-frequency, and normalization choices for document or query. For example, `ltc` commonly means logarithmic tf, idf, cosine normalization; `nnn` means natural/raw tf, no idf, no normalization. Exact notation conventions should be documented rather than memorized without implementation context.

Weighting applies after analysis. If stemming maps `databases` and `database` together, their tf and df combine. If title and body are separate fields, calculate field-specific statistics or weights; simply adding title repetitions to a 5,000-word body treats incomparable evidence as one count.

Numerical scale matters. Changing log base scales IDF consistently, but smoothing, caps, field boosts, and normalization can change rankings. Store enough precision and use deterministic tie-breaking. Sparse vectors omit zero-weight terms; there is no need to materialize the vocabulary dimension.

Worked field judgment: document X has `vector` once in its title and ten times in body; Y has it twice in body and not title. A flat tf-idf may let body repetition dominate. A fielded scheme could score `3 × title_tfidf + 1 × body_tfidf`, making explicit that title evidence has higher value. Weight selection should be tuned on judged queries, not chosen because a formula is traditional.

tf-idf does not model term proximity, word order, document-length fairness by itself, synonymy, or interaction between query terms. It supplies interpretable lexical evidence: repeated terms matter sublinearly, rare terms matter more. The next lesson turns these weights into document vectors and normalizes for document length; later ranking models refine saturation and length treatment.

Judgment: begin with log tf, smoothed IDF, and explicit field handling; evaluate per query class; inspect rare-noise failures; version corpus statistics and formulas. A weighting scheme is part of the index model, so changing it invalidates score comparisons and may require recomputing stored norms even when postings remain unchanged.

Explainability is a practical advantage. For a returned document, report matched terms, their document frequencies, transformed term frequencies, field boosts, and contribution to the total. This decomposition reveals whether a result won through one rare identifier, repeated generic prose, or a boosted title. It also makes analyzer regressions visible: a missing expected term contribution points upstream to tokenization rather than downstream to ranking arithmetic.
Keep these explanations tied to the exact index generation, because later corpus statistics can otherwise produce a plausible but historically false reconstruction of the score.
Reproducible ranking requires reproducible statistics as well as documents.
