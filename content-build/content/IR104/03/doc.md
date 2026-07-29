A retrieval metric is only as credible as the queries and relevance judgments underneath it. Building a test collection means sampling information needs, finding documents worth judging, and producing labels with known limitations. The objective is not a frozen leaderboard but a repeatable instrument that detects useful changes without hiding important user groups.

## Golden Query Sets: Sampling Real Queries

A golden query set is a maintained collection of queries that represent the product's information needs and have enough judgment data for repeatable evaluation. "Golden" does not mean perfect or permanent. It means the set is trusted, versioned, and deliberately constructed rather than assembled from convenient examples.

Production logs are often the best sampling frame because they expose actual wording, spelling errors, identifiers, and ambiguous short queries. A purely uniform sample, however, will be dominated by frequent easy intents. If 60 percent of traffic is navigational, a 100-query uniform set may contain about 60 navigational cases and too few rare safety, multilingual, or no-answer cases to diagnose. Stratified sampling reserves capacity for meaningful classes while recording weights needed to estimate overall performance.

Useful strata can include query frequency, length, language, device, geography, intent, known difficulty, result count, and business-critical workflows. Start with a taxonomy tied to plausible failure mechanisms, not dozens of arbitrary buckets. For example, support search might separate exact error codes, symptom descriptions, how-to questions, policy questions, and account-specific requests. Each class exercises different tokenization and ranking behavior.

Deduplicate carefully. Exact duplicates can overweight a popular wording, but aggressive semantic deduplication may erase legitimate variants such as `ERR_CONNECTION_RESET` versus "browser says connection reset." Keep variants when they test distinct processing or user behavior. Remove queries containing secrets or personal data, and maintain access controls for any sensitive labels or documents.

Temporal sampling matters because language, inventory, and user needs drift. A set collected before a product launch will miss new feature names. Maintain a stable core for longitudinal comparison and a rotating slice for recent traffic. If 800 queries form the core and 200 are refreshed each quarter, trend lines remain interpretable while the collection gains current coverage.

Every query needs context sufficient to define intent. The raw text `jaguar speed` could concern an animal or a car. Session context, locale, filters, and query source may resolve it, but including context can create privacy and reproducibility challenges. Record only what assessors and ranking systems are permitted to use, and write a short intent note when ambiguity is adjudicated.

Sampling should not use system success as the admission rule. Keeping only queries with clicks favors the incumbent and excludes abandonment or zero-result failures. Clicks can help identify candidates, but they are behavior under a particular ranking and interface, not direct relevance labels. Include dissatisfied and no-click sessions through a documented sampling path.

Track the distribution of the test set against production traffic. Report both macro metrics, where each query counts equally, and traffic-weighted metrics when aggregate impact matters. Slice results by the original strata. A five-point average gain can conceal a severe regression on low-frequency compliance queries. The golden set earns trust through coverage evidence and maintenance history, not its name.

## Pooling: Judging Relevance Feasibly at Scale

Exhaustively judging every document for every query is usually impossible. Pooling makes the task feasible by collecting the top results from several retrieval systems, removing duplicates, and asking assessors to judge that union. If four systems contribute their top 20 results and overlap heavily, the pool may contain 35 unique documents rather than the entire collection.

Pooling focuses effort where competitive systems believe relevance is likely. It supports comparisons among the systems that contributed results and creates reusable query-document labels. Random collection documents can be added as controls, but their relevance yield is often low. Targeted candidates from lexical, semantic, freshness-oriented, and specialized systems provide more diverse coverage.

Pool depth is a budget decision. At depth 10, labels are cheap but may cover only obvious winners. At depth 100, recall of relevant material improves while assessment cost grows. Measure how metrics stabilize as depth increases. If system order changes substantially between depth 20 and 50, the shallow pool is weak evidence.

The major limitation is pooling bias. Unjudged documents are often treated as irrelevant during evaluation. A novel system that retrieves relevant material outside the contributors' pools can therefore look worse than incumbent systems. This is especially dangerous when evaluating a new retrieval family, such as comparing a semantic retriever against a pool built only from lexical systems.

Mitigate bias by including diverse pool contributors, judging top results from every serious new system, and refreshing pools after major model changes. Sample unjudged results from new systems to estimate their relevance yield. Metrics designed for incomplete judgments can also help, but no formula replaces coverage inspection.

Judging should be blinded to contributing system and rank. Otherwise assessors may infer that a top-ranked result deserves a high label. Randomize presentation, preserve query context, define grades with examples, and measure agreement on overlapping assignments. Adjudicate conflicts that expose rubric ambiguity rather than merely averaging them away.

Pool provenance belongs in the dataset. Record system versions, retrieval dates, depth per contributor, deduplication rules, document snapshots, and judgment status. A document can change after it is labeled, so reproducible evaluation may require content hashes or snapshots. Access-controlled or deleted documents need an explicit treatment.

Pooling is iterative. Begin with diverse systems, judge, analyze where unjudged high-ranked documents remain, and expand selectively. The stopping question is not whether every document is labeled, but whether remaining incompleteness is unlikely to reverse the decisions being made. That claim should be supported by saturation curves and audits.

## LLM-as-Relevance-Judge: Uses and Failure Modes

An LLM can accelerate relevance assessment by reading a query, optional intent description, and candidate document, then returning a grade and rationale. It is useful for preliminary labels, rubric testing, disagreement triage, and scaling judgments where human review is expensive. It should be treated as a measurement instrument with calibration error, not an oracle.

Prompts must define relevance operationally. Specify whether topicality, completeness, authority, recency, and harmfulness affect the grade. Include boundary examples and require a structured output such as `{grade, rationale, evidence}`. Asking simply "Is this relevant?" invites inconsistent private criteria.

Position bias can arise if candidates are shown in ranked order or with incumbent scores. Blind and randomize inputs. Verbosity bias can favor long documents that repeat query language, while style bias can favor polished prose over terse correct records. Citation-like formatting may be mistaken for authority. Test these effects with paired counterexamples where only the suspected feature changes.

LLMs can hallucinate support that the candidate does not contain. Evidence extraction helps: require the judge to point to passages, then verify that cited text exists. For high-stakes or ambiguous cases, human review remains necessary. A confident rationale is not proof that the grade is correct.

Calibration requires a human-labeled sample drawn from relevant query classes. Compare agreement, confusion matrices, and per-grade precision rather than reporting one accuracy number. If the judge frequently maps human grade 2 to grade 3, exponential-gain nDCG may be distorted substantially. Recalibrate prompts or collapse grades when distinctions are unreliable.

Judge models can share biases with the system being evaluated. A retriever and judge from similar training distributions may reward familiar phrasing. Evaluate with multiple judge families or human audits, and include adversarial documents containing query terms but wrong answers. Avoid letting the evaluated system generate the only reference rationale used by its judge.

Version everything: model identifier, prompt, decoding settings, context truncation, rubric, and retry policy. A provider update or changed context window can shift labels. Cache immutable judging inputs and outputs when permitted, then rerun a calibration suite before adopting a new judge version.

Use confidence to route work, but validate that confidence predicts correctness. A practical workflow may auto-accept clear grade-0 cases, send uncertain or high-impact cases to humans, and audit random accepted cases. Cost savings are meaningful only if the resulting label error is understood and acceptable for the decision.

## Public Benchmarks in Context: MS MARCO and BEIR

Public benchmarks provide shared data, metrics, and baselines. They help verify an implementation, compare broad retrieval approaches, and expose a system to queries beyond one product. They do not prove production quality because their corpus, labels, query distribution, and success criteria may differ from the application.

MS MARCO grew from real search queries paired with passages or documents and relevance information, and it became a central benchmark for passage ranking and learned retrieval. Its ranking tasks encouraged research on rerankers, dense retrieval, and efficient first-stage systems. The labels are relatively sparse for many uses, so unjudged relevant passages and dataset-specific supervision must be considered when interpreting results.

BEIR is a heterogeneous benchmark suite designed to test zero-shot information retrieval across multiple datasets and domains. Its value is breadth: a method strong on one web-style corpus may struggle on scientific claims, biomedical text, arguments, or question answering. Reporting an average alongside per-dataset results reveals whether gains are broad or concentrated.

Benchmark transfer depends on matching mechanisms. A support-search product with short error codes may need exact lexical behavior scarcely represented by a semantic benchmark. A multilingual catalog cannot be validated by English-only results. Corpus freshness, document length, domain terminology, and query intent all affect transfer.

Data contamination is another concern. Widely available benchmark documents and queries may appear in model training. Strong scores can partly reflect familiarity rather than general retrieval ability. Use held-out private tests and temporally newer data when possible, and describe contamination risk rather than making unsupported purity claims.

Avoid tuning repeatedly to the public test set. Selecting prompts, fusion weights, and checkpoints based on test results turns that set into development data. Preserve validation and test separation, report the tuning process, and resist comparing numbers produced with different corpus versions, preprocessing, or evaluation scripts.

A sound workflow uses public benchmarks as one layer. First, reproduce established baselines to catch indexing and metric bugs. Next, test across heterogeneous datasets to identify general strengths and weaknesses. Finally, evaluate on a private golden set reflecting actual users, documents, constraints, and failure costs.

When reporting a benchmark score, include dataset and task version, corpus, query split, metric cutoff, judgment handling, preprocessing, and resource budget. A one-point nDCG gain achieved with a hundredfold latency increase may be irrelevant to production. Benchmarks create common reference points; product decisions still require contextual evidence.
