**The big idea**: **Why Sparse and Dense Retrieval Fail Differently** established that BM25 and embeddings break in opposite places, and **Reciprocal Rank Fusion**, **Score Normalization vs Rank Fusion** and **The Atrium Pattern: BM25 + Vectors + RRF + Reranker** turned that complementarity into an architecture — two retrievers, two indexes, a fusion step, then the cross-encoder. Learned sparse retrieval attacks the same problem from *inside one system*. It keeps the inverted index from IR 101, with all of its operational virtues, and replaces the hand-crafted term statistics with weights a neural model assigns. The result matches or beats dense retrieval on many benchmarks while preserving exact-match behaviour, per-term explainability, and the entire Lucene-style serving stack. Three mechanisms carry the lesson: two expansion strategies attacking vocabulary mismatch from opposite sides, neural weights living on classic postings, and the shipped systems.

**Key concepts**

- **SPLADE turns a masked-language-model head into a sparse vector over the vocabulary.** SPLADE — Sparse Lexical and Expansion model — reuses a masked language model transformer. Text passes through the encoder, and at every token position the MLM head produces a distribution over the entire vocabulary, roughly **30,000** terms. Each distribution is squashed with $\log(1 + \mathrm{ReLU}(x))$ — ReLU forces non-negativity, so a term can only add evidence; the log compresses the tail so one huge activation cannot swamp the vector — then the per-position results are **max-pooled** into one vector, making a term's weight the strongest case any position made for it.

- **Two properties make that vector special.** It is *sparse*: a sparsity regulariser during training drives most entries to exactly zero, typically leaving **a few dozen to a couple of hundred** active terms of the 30,000. And it holds terms absent from the original text, because the language-model head activates related vocabulary — encoding `heart attack symptoms` may put positive weight on `myocardial`, `cardiac` and `chest pain`. That is **learned term expansion**: the vocabulary-mismatch fix operating inside one model rather than beside it.

- **The score is a dot product, which is exactly the algebra of an inverted index.** The same encoder runs on documents at ingest and queries at search time, and relevance is $s(q,d) = \sum_{t} w_q(t)\,w_d(t)$ — a sum over shared terms of the product of their weights, since a term missing on either side contributes zero. Compare BM25, which sums a tf-and-IDF contribution over the query's terms: the shape is identical. So each term's posting list stores per-document **impact weights** instead of term frequencies, and scoring still walks the lists of the query's active terms. The retrieval algorithm is untouched.

- **Contextuality is the deep difference from classic term weighting.** Under BM25 a term's contribution is fixed by corpus statistics: `jaguar` always carries the same IDF. Under SPLADE the weight of `jaguar` depends on the surrounding text — high alongside `0-60` and `horsepower`, modulated differently alongside `rainforest` and `prey`. Weights are trained end-to-end on relevance data such as MS MARCO with mined hard negatives, so they encode what separates a relevant document from one that merely shares terms.

- **The sparsity budget is an explicit engineering dial.** Without regularisation the model activates too many terms, postings grow, and query latency dies. A FLOPS-style regulariser lets you choose the effectiveness-versus-index-size operating point, and distillation variants push quality further at the same sparsity. Three judgment points: expansion occasionally activates wrong-sense terms, adding noise a reranker must absorb; weights must be quantised for storage, costing a little accuracy; and the model version becomes part of the index's identity.

- **doc2query attacks the same mismatch from the opposite side: change the documents, not the scoring.** A sequence-to-sequence model, classically T5, is trained on pairs of queries and the documents that answered them, learning to generate queries a document could plausibly answer. At index time each document is run through the generator, a set of predicted queries — commonly **10 to 40** — is appended to the document text, and the augmented document is indexed by plain BM25 in a plain inverted index.

- **Two channels do the work at once.** *Expansion*: the generated queries use the vocabulary of real searchers, so the document now literally contains terms users type. *Reweighting*: the generator repeats the document's salient concepts across its predictions, inflating those terms' frequencies, which BM25 correctly reads as importance. On MS MARCO this historically gave BM25 double-digit percentage gains in ranking metrics for **zero change to the serving stack**.

- **The costs are equally concrete.** Generating 10 queries for a one-million-document corpus is **10 million model inferences**, an offline batch job that reruns whenever documents change. The index grows substantially, often by a third or more. Hallucinated predictions pollute it with off-topic terms. And expansions freeze at generation time: a better generator next year helps only after a full re-expansion pass.

- **The contrast clarifies the design space.** doc2query expands **at index time** and keeps classical tf-based scoring; SPLADE expands **at encode time**, for every text, and scores with learned weights. doc2query is simpler to bolt onto an existing BM25 system, since neither scoring nor the index format changes. SPLADE is more precise: its weights are contextual and continuous rather than implicit in term repetition, and its expansion covers queries too.

- **The impact-sorted index is a scoring upgrade, not an infrastructure replacement.** A classic posting from IR 101 is (docID, tf, positions). Learned sparse stores (docID, weight) — the model's impact score for that term in that document, quantised to one or two bytes. Everything else survives: dictionary, skip structures, blocked compression, segment merges, memory mapping. That is the architectural appeal.

- **What changes is the sort order, and it buys early termination.** Classical postings are docID-sorted, which enables merge intersection. Impact-sorted postings are ordered by **descending weight**. Recall WAND and MaxScore: dynamic pruning needs per-list score upper bounds to skip documents that cannot crack the top $k$. With impact sorting the maximum weight in each remaining block is known a priori, so the bounds are tight — and with quantised weights **exact rather than estimated**. Processing only the highest-impact postings of each query term yields the same top-$k$ as exhaustive scoring, at a fraction of the comparisons.

- **Quantisation deserves care.** The model emits real-valued weights; the index stores a byte or two. Uniform or learned quantisation maps the weight range into **256 levels** at 8 bits, and small weights are often thresholded to zero outright, enforcing sparsity at index time. The accuracy cost is typically small, and it buys a compact, cache-friendly index whose scores stay deterministic.

- **Two operational consequences stand out.** Learned weights free the index from corpus statistics: BM25's IDF shifts as the corpus grows, altering scores under your feet, while a learned impact weight depends only on the document and the checkpoint — so incremental updates are clean and localised. But the coupling moves to the **model version**: upgrading the encoder invalidates every stored weight, so a model change means a full re-encode and index rebuild.

- **Query latency looks like BM25 with extra terms.** Expansion terms are extra posting lists to walk, so the training-time sparsity budget shows up directly as serving latency. Early termination claws much of it back, on **CPUs**.

- **Shipped learned sparse, one: Elastic's ELSER.** The Elastic Learned Sparse EncodeR is a production expansion model served as a managed inference endpoint. Documents pass through it at ingest, producing weighted tokens stored in a `rank_features`-style field; queries take a lighter encoding path; scoring is the sparse dot product, executed by the same engine that runs BM25. Later versions improved effectiveness and trimmed inference cost, and it is tied to Elastic's commercial tiers — a real procurement consideration.

- **Shipped learned sparse, two: OpenSearch neural sparse search.** Sparse encoding models from Hugging Face, including published SPLADE checkpoints, deploy through ML Commons into `rank_features` fields. Two serving modes matter: **document-only encoding** runs the heavy model on documents and a lightweight or lexical path on queries, minimising query latency; **bi-encoder mode** encodes both sides fully for maximum quality. Neural sparse scores can also join BM25 in hybrid queries.

- **The operational profile against dense vectors is the deciding comparison.** A learned sparse index lives in the same engine, cluster, ACL model and runbook as the BM25 system the team already operates; there is no second storage system to reconcile. Memory economics favour sparse at scale — a few hundred quantised term weights per document, no float vectors, no proximity graph — and serving runs on CPUs. Zero-shot transfer has been strong on BEIR, often beating bi-encoders never fine-tuned on the target domain.

**Rules to remember**

- SPLADE: MLM head → $\log(1+\mathrm{ReLU})$ → max-pool → sparse vector. Score = dot product = inverted-index scoring with learned weights standing in for tf and IDF.
- doc2query changes the *documents*; SPLADE changes the *weights*. Index time versus encode time keeps them apart.
- Only SPLADE expands the **query**. doc2query expands documents alone, and still scores with plain BM25.
- Impact-sorted postings trade merge intersection for early termination; quantised weights make the WAND/MaxScore bounds exact rather than estimated.
- A learned weight depends on the document and the checkpoint, never on corpus statistics — so updates are local and encoder upgrades are total.
- Quantising to one or two bytes costs a little accuracy, buys a compact deterministic index.
- The training-time sparsity budget is a serving-latency budget.
- Choose learned sparse for mixed exact-match and paraphrase traffic, Lucene-family infrastructure, CPU-only serving, or per-term explainability. Dense still wins for multilingual and multimodal corpora, very short documents, and shops already home on a managed vector database.

**Common pitfalls**

- **Believing learned sparse abandons the inverted index.** It is the same index with a different payload; an answer invoking an ANN graph or float vectors has it backwards.
- **Assuming doc2query needs a new index format or scorer.** It needs neither — that is its selling point. What it needs is an offline inference pass over the corpus: ten predicted queries across a million documents is ten million forward passes, repeated whenever documents change.
- **Treating impact sorting as free.** Descending-weight order makes early termination work and gives up docID-ordered merge intersection.
- **Forgetting the model version is part of the index.** Swapping the encoder without a re-encode scores two checkpoints' weights against each other.
- **Expecting expansion to be clean.** Wrong-sense terms do get activated; the reranker downstream absorbs the noise.
- **Reading strong BEIR zero-shot numbers as universal superiority.** A real strength, not a verdict on multilingual, multimodal or very short-document corpora.
- **Treating ELSER and OpenSearch neural sparse as interchangeable.** One is a managed endpoint on a commercial tier; the other is open, model-pluggable, and makes you pick a serving mode.

**How to approach the questions**

1. For any expansion question, ask *when* it happens and *what it changes*: index-time text (doc2query) or encode-time weights (SPLADE). Distractors routinely swap the two.
2. Ask whether the **query** side is expanded. That fact separates the two approaches more reliably than anything else.
3. For an index question, read the posting payload: (docID, tf, positions) is classical, (docID, quantised weight) is learned sparse.
4. For latency, count posting lists walked — the active query terms the sparsity budget set at training time.
5. "We upgraded the encoder" implies a full re-encode and rebuild, never an incremental update.
6. For system choice, read the constraints rather than the benchmark: infrastructure family, serving hardware, explainability, corpus language and document length.
7. Watch for claims that learned sparse abolishes the funnel. It is a stronger recall stage; the reranker still sits behind it.

**Where this leads**: learned sparse is the inverted index taught to read — IR 101's mechanisms kept, much of IR 201's semantics bought, paid for with ingest-time inference and model-versioned indexes. The next lesson, **Beyond the Cross-Encoder**, goes after the other end of the funnel: **late interaction** — ColBERT's token-level matching and PLAID serving, keeping per-token representations instead of collapsing to one vector — and **distilling cross-encoders into faster students**.
