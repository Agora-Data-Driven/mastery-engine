An embedding index inherits the judgments encoded during model training: which pairs count as matches, which nonmatches are confusing, and which distinctions the vector must preserve. Production quality therefore depends on more than choosing a model name. Engineers need to understand the contrastive objective, adapt without overfitting, evaluate the right task, and decide how much numeric precision and dimensionality the service can afford.

## The Contrastive Training Objective

Contrastive retrieval training starts with positive query-document pairs. An encoder produces query vector q and document vectors d. For each query, the model should assign its positive document a higher similarity than competing documents. A common softmax loss for one positive d+ and negatives d1 through dn is:

loss = negative log of exp(score(q,d+)/temperature) divided by the sum of exp(score(q,dj)/temperature) over all candidates.

This is cross-entropy over candidate documents. If positive and two negative logits are [3, 1, 0] with temperature 1, the positive probability is exp(3) divided by exp(3)+exp(1)+exp(0), about 20.09/23.81 = 0.844. The loss is negative log 0.844, about 0.17. If a hard negative scores 2.8, the positive probability falls and the gradient becomes larger.

Temperature controls softmax sharpness. A smaller temperature magnifies score differences and produces stronger gradients around close candidates, but overly small values can make optimization unstable or overemphasize mislabeled negatives. Normalized embeddings and dot products turn the score into cosine similarity; unnormalized training can also learn through vector norms.

The objective shapes relative geometry, not an absolute semantic truth. Positives teach what should be close, negatives teach what distinctions matter, and the sampling distribution defines the difficulty. Duplicate documents, false negatives, and leaked labels corrupt the signal. Evaluate on groups or time periods separated from training so memorized near-duplicates do not masquerade as generalization.

The loss also does not make scores calibrated probabilities of relevance. A dot product of 0.72 from one model cannot be compared directly with 0.72 from another, and even one model's score distribution can vary by query segment. Candidate generation normally ranks within a query. If an application uses an absolute threshold, calibrate and validate that decision separately on held-out data, including queries with no relevant document.

## In-Batch Negatives vs Hard Negative Mining

In-batch negatives reuse the other positives in a training batch as negatives. With B aligned query-document pairs, each query receives one positive and roughly B minus 1 convenient negatives, while one matrix multiplication produces all pair scores. Larger batches supply more comparisons and use accelerators efficiently.

The assumption is that another query's positive is irrelevant to the current query. This fails when a batch contains duplicate intents or multiple valid answers. Treating a valid passage as a negative pushes useful neighbors apart. Deduplicate examples, group known positives, or mask false-negative pairs from the loss.

Random in-batch negatives often become too easy. A billing query and a cooking passage already have low similarity, so their gradient contributes little after basic training. Hard-negative mining retrieves documents that score highly but are judged nonrelevant. A passage about changing a subscription plan is a useful negative for `cancel my subscription` because it shares vocabulary and topic while failing the requested action.

Mine with a lexical retriever, the current dense model, or a stronger teacher, then filter known positives. Very hard candidates can be mislabeled relevant passages, so hardness is not automatically quality. Mix easy and hard negatives, refresh mined sets as the model improves, and inspect top examples. If training loss rises after introducing hard negatives while validation retrieval improves, the harder task is doing useful work.

## Fine-Tuning an Embedder on Domain Data

Fine-tuning adapts a pretrained encoder to the organization's relevance relation. Build positives from human judgments, clicked results with bias correction, accepted answers, or carefully generated pairs verified against source content. Preserve the production query style, document formatting, languages, and chunk boundaries. A model trained on polished synthetic questions may fail on abbreviated support queries.

Split data to prevent leakage by document family, customer, or time when those groups share language. Keep a frozen general benchmark if broad capability matters. Before training, evaluate the base model, a lexical baseline, and the production hybrid system. The goal is an incremental system gain, not merely a lower training loss.

Use a modest learning rate and monitor validation recall and ranking metrics. Parameter-efficient adapters can reduce training and storage cost, while full fine-tuning offers more capacity and more catastrophic-forgetting risk. Suppose base recall@20 is 0.78 overall and 0.61 for internal acronyms. Fine-tuning raises them to 0.80 and 0.75 but lowers multilingual recall from 0.74 to 0.58. The deployment decision depends on traffic and requirements, not the overall two-point gain.

Version the training data, model, instructions, tokenizer, pooling, normalization, and maximum lengths. Fine-tuning creates a new vector space, so documents require re-embedding and a controlled index migration. Shadow evaluation, dual writes, and rollback artifacts reduce release risk. Monitor norm distributions and segment metrics for drift after launch.

A safe online experiment keeps authorization, chunking, and candidate width constant while routing a controlled share of queries to the new index. Compare relevance proxies, no-result rates, latency, downstream answer quality, and user segments. Log which index served each request. If both the model and reranker change simultaneously, attribution becomes weak and rollback becomes harder.

## MTEB and Instruction-Tuned Embedding Models

The Massive Text Embedding Benchmark, or MTEB, evaluates embedding models across multiple datasets and task families such as retrieval, semantic textual similarity, classification, clustering, and reranking-related uses. It provides useful comparative evidence, but an aggregate leaderboard score is not a production requirement.

Select benchmark slices that resemble the target language, domain, input length, and task. A model leading on classification may not lead on passage retrieval. Dataset contamination, hardware cost, licensing, context limits, and model size also matter. Shortlist candidates with public evidence, then run the organization's held-out queries through the complete chunking and retrieval pipeline.

Instruction-tuned embedding models accept task or role prefixes such as `query: find a support procedure` and `passage: ...`. Instructions help one model organize different tasks and asymmetric roles. Follow the model card exactly: omitting a required query instruction can place queries in a geometry incompatible with indexed documents. Do not invent a prefix because it sounds descriptive without validation.

Compare models using relevance metrics, encoding throughput, p95 query latency, vector dimensions, maximum input behavior, language segments, and total serving cost. Model A with recall@20 0.86 at 768 dimensions may be less attractive than model B at 0.85 and 384 dimensions if B halves index memory and meets every segment floor.

## Matryoshka Embeddings: Truncatable Dimensions

Matryoshka representation learning trains earlier prefixes of an embedding to remain useful. A 768-dimensional output may be truncated to its first 384, 256, or another supported prefix, then normalized and searched according to the model's contract. Ordinary embeddings do not guarantee that their first dimensions form a good smaller representation.

Training applies objectives to several prefix lengths, nesting coarse useful structure inside larger representations. The longer vector can preserve finer distinctions while shorter prefixes reduce storage, bandwidth, and comparison work. For ten million float32 vectors, 768 dimensions require 30.72 GB raw, while 256 require 10.24 GB.

Truncation is not free. Suppose recall@20 is 0.88 at 768 dimensions, 0.872 at 384, and 0.84 at 128. If the service target is at least 0.86, 384 is a strong candidate while 128 is not. Rebuild and benchmark the actual ANN index because lower dimensions can change both graph behavior and system latency.

Store the selected dimension as part of the index version. Query and document prefixes must match, and normalization must occur at the documented point. Matryoshka makes one trained model flexible; it does not make mixed dimensions comparable inside one ordinary index.

## Scalar and Binary Quantization: Recall per Dollar

Scalar quantization maps each floating-point coordinate to a smaller numeric representation, commonly 8-bit integers. A scale and offset translate values into discrete bins. Moving from float32 to int8 reduces raw vector memory by about four times. Quantization error perturbs similarities, but well-behaved embeddings often preserve most neighbor ordering.

For values mapped over range [-1,1] into 256 levels, the bin width is approximately 2/255 = 0.00784. A value 0.503 may reconstruct near 0.506 depending on the rounding convention. Outliers widen the range and waste resolution, so calibration data and clipping policy matter.

Binary quantization compresses each dimension to a bit, often by sign. A 768-dimensional vector then uses 96 bytes rather than 3,072 bytes, a 32-fold raw reduction. Hamming distance and bit operations are extremely fast, but magnitude information is lost and recall degradation can be larger. Binary search can generate candidates that are reranked with scalar or full-precision vectors.

Quantization differs from Matryoshka truncation. Truncation removes trailing dimensions from a model trained to support that prefix; quantization reduces precision within retained dimensions. They can be combined, but errors can compound. Evaluate each configuration rather than multiplying theoretical savings and assuming quality.

Recall per dollar includes RAM, storage, network, replicas, encoding, index construction, and reranking. If int8 reduces memory fourfold while recall@20 falls from 0.88 to 0.877, it may enable more replicas or a larger corpus. If binary codes fall to 0.79 and double reranker work, their apparent saving may disappear. Measure relevance, ANN recall, latency, and total infrastructure at the chosen candidate width, then select the cheapest configuration that meets quality floors.

Recheck these economics as corpus size, traffic mix, hardware pricing, and reliability requirements change over the system's lifetime.
