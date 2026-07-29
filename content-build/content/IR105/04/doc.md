Relevance feedback turns retrieval from a one-shot query into an iterative process. Evidence about useful or non-useful results changes the query representation, allowing the next ranking to express an information need more fully. The same core idea appears in classic vector algorithms, probabilistic language models, automatic expansion, and modern learned retrieval pipelines.

## Rocchio Relevance Feedback in Vector Space

Rocchio feedback operates in the vector space model. Begin with original query vector `q0`, a set of judged relevant document vectors `D_r`, and a set of judged nonrelevant vectors `D_nr`. The updated query is:

`q_m = alpha*q0 + beta*(1/|D_r|)*sum(d in D_r) d - gamma*(1/|D_nr|)*sum(d in D_nr) d`

Alpha preserves the original query, beta moves it toward the centroid of relevant documents, and gamma moves it away from the centroid of nonrelevant documents. A centroid is simply the coordinate-wise mean vector. The formula encodes a geometric intuition: position the query closer to the relevant cluster and farther from known distractors.

Suppose a two-term query is `q0 = [1,0]`. Two relevant documents are `[1,1]` and `[0,2]`, giving relevant centroid `[0.5,1.5]`. One nonrelevant document is `[0,1]`. With alpha 1, beta 0.8, and gamma 0.2, the updated vector is `[1,0] + 0.8[0.5,1.5] - 0.2[0,1] = [1.4,1.0]`. The second term, absent from the original query, now carries substantial weight because it characterizes relevant examples.

Document vectors normally use tf-idf or another retrieval-aware weighting scheme. Otherwise common terms can dominate the centroid. After the update, negative coordinates may be clipped to zero when the retrieval system expects nonnegative query weights. The ranker may also keep only the highest-weight expansion terms to control query cost and interpretability.

Parameter choices express trust. A high alpha anchors the update to user wording and limits drift. A high beta lets relevant examples introduce vocabulary strongly. Gamma is often smaller because nonrelevance can be diverse: documents can fail for many unrelated reasons, so their centroid may not describe one coherent direction. When explicit nonrelevant judgments are scarce, the negative term may be omitted.

Rocchio works best when relevant documents form a reasonably coherent region in the representation. If a query has multiple valid intents, their centroid can fall between clusters and emphasize terms common to neither useful interpretation. For `jaguar`, mixing animal and automobile feedback produces an unstable expansion. Intent selection, clustering, or separate reformulations may be better than one averaged vector.

Feedback quality matters more than algebraic elegance. A mislabeled relevant document can introduce off-topic terms. Near-duplicate relevant documents can overweight one source. Sampling diverse positive examples and deduplicating them reduces this effect. If judgments come from clicks, position and presentation bias make the inputs implicit rather than clean relevance labels.

When only one positive example exists, shrink the feedback update toward the original query because the estimated centroid has high variance. More independent relevant examples justify a stronger movement.

The updated query should be inspectable. Show retained original terms, added terms, suppressed terms, and the supporting documents. Evaluate both immediate top-k improvement and robustness on ambiguous, sparse, and adversarial feedback. Rocchio is a transparent baseline because every movement can be traced to weighted document coordinates.

Repeated feedback can apply Rocchio more than once, but each round should preserve provenance and an original-query anchor. Otherwise small early mistakes compound. A practical interface may let users remove an expansion term or undo a judgment, then recompute the vector deterministically. This turns transparency into a control surface rather than a debugging artifact.

## Pseudo-Relevance Feedback and RM3

Explicit relevance feedback asks a user or assessor to label results. Pseudo-relevance feedback, abbreviated PRF, assumes that the top documents from an initial retrieval are relevant and uses them automatically. This removes interaction cost and can improve recall, but it converts ranking errors into expansion evidence.

A basic PRF pipeline runs the original query, selects the top m feedback documents, extracts high-value terms, constructs an expanded query, and retrieves again. Choices include feedback depth, number of expansion terms, term weighting, interpolation with the original query, and document deduplication. Each choice affects both effectiveness and latency.

RM3 is a widely used relevance-model approach. It estimates a relevance language model from the initial top documents, then interpolates that model with the original query model. Conceptually:

`P(t|q_expanded) = lambda*P(t|q_original) + (1-lambda)*P(t|R)`

Here `P(t|R)` estimates how characteristic term t is of the pseudo-relevant set, often weighting each feedback document by how well it explains the original query. Naming conventions vary: some implementations define the interpolation parameter as the feedback weight instead, so configuration must document which side lambda weights.

Suppose the original query model gives probability 0.5 each to `database` and `timeout`. The feedback model gives 0.35 to `connection`, 0.25 to `pool`, 0.20 to `database`, and 0.20 to `timeout`. With original-query weight 0.6, expanded probabilities are 0.38 for database, 0.38 for timeout, 0.14 for connection, and 0.10 for pool. The original intent remains dominant while related vocabulary broadens recall.

RM3 should not merely select the most frequent feedback words. Collection-aware estimation or background correction prevents common terms from winning because they occur everywhere. Stop-word handling, field choice, and document length affect the feedback model. Extracting from titles may yield focused terms; full bodies provide coverage but also noise.

Query drift is the main failure mode. For an ambiguous query, the initial top results may favor the wrong intent and reinforce it. For a rare exact identifier, top documents can share generic boilerplate that dilutes the identifier. Anchoring strongly to original terms, limiting expansion count, requiring discriminative terms, and disabling PRF for selected query classes are practical controls.

Feedback depth has a non-monotonic tradeoff. Too few documents make the estimate fragile and duplicate-driven. Too many include weaker or mixed-intent results. Similarly, adding more terms initially improves vocabulary coverage but eventually introduces noise and increases posting traversal. Tune depth and term count jointly on held-out queries.

PRF evaluation must compare the entire two-pass system, including latency. Slice by initial retrieval quality: PRF usually helps when early results are relevant enough to supply vocabulary and harms when the first pass is wrong. An oracle experiment using truly relevant feedback documents estimates potential, while the gap between oracle and pseudo-feedback reveals the cost of selection errors.

Caching can reduce the second-pass cost for frequent queries, but cache keys must include the first-pass index version and every feedback parameter. When documents or collection statistics change, stale expansions can silently preserve obsolete vocabulary. Logging the selected documents, extracted terms, weights, and final query model makes regressions reproducible.

## Relevance Feedback as the Ancestor of Modern Query Expansion

Modern query expansion changes the representation used to retrieve candidates, but its lineage is visible in classic feedback. Rocchio adds directions supported by relevant vectors. RM3 adds terms supported by pseudo-relevant language models. Learned systems add tokens, sparse weights, dense vectors, synthetic passages, or structured constraints supported by a model. All attempt to bridge the mismatch between short user wording and document vocabulary.

Expansion can be local or global. Local methods use results for the current query, as Rocchio and PRF do. Global methods use collection-wide resources such as thesauri, synonym graphs, click logs, or trained models. Local expansion adapts to context but inherits first-pass mistakes. Global expansion is available before retrieval but may add contextually wrong meanings.

Sparse learned expansion assigns weights to vocabulary terms not literally present in the text. A query for `heart attack` might activate `myocardial infarction`, allowing inverted-index matching while preserving term-level explanations. Dense query encoders perform expansion implicitly by mapping related language near one another in embedding space. Generative rewriting can produce alternate queries or a hypothetical answer passage whose vocabulary guides retrieval.

The classic interpolation lesson still applies: retain an anchor to the original query. An unconstrained generated rewrite can omit an exact identifier, negate a condition incorrectly, or commit to one ambiguous intent. Systems often retrieve with both original and expanded representations, then fuse candidates or scores. This preserves exact evidence while gaining semantic breadth.

Candidate diversity is another inherited lesson. If five generated rewrites are paraphrases of one mistaken interpretation, they create false confidence rather than coverage. Encourage controlled alternatives, deduplicate candidates, and cap the contribution from any expansion channel. For ambiguous queries, intent-diverse expansions can be more useful than one highly confident rewrite.

Expansion also changes efficiency and security. More terms lengthen postings traversal; more dense queries increase vector-search calls; generated passages add model latency. An expansion derived from inaccessible documents can leak vocabulary or bias results across permissions. Apply access control before feedback extraction and budget expansion cost against measured recall gains.

Evaluation should compare no expansion, oracle expansion, and deployable expansion. Track top-k relevance, recall, latency, drift rate, exact-match retention, and performance by query class. Inspect added terms or rewrites and their evidence. If expansion improves broad informational queries but harms product codes, route it conditionally rather than searching for one global setting.

The enduring pattern is retrieve, infer a better representation of the need, and retrieve or rerank again. Classic feedback supplies transparent formulas and failure modes that remain relevant when the expansion generator is a neural model. The implementation may change, but anchoring, evidence quality, ambiguity, drift, cost, and evaluation still determine whether expansion helps.

Feedback signals can also arrive over longer horizons. Saved results, repeated successful queries, and explicit preferences may improve future retrieval, but personalization introduces consent, retention, and filter-bubble concerns. Separate session feedback from durable profiles, provide deletion controls, and evaluate whether personalization narrows exposure too aggressively.
