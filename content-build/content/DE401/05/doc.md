The curriculum ends where operations begin: with a symptom, a number that moved, or a reviewer asking why the system is built this way. This lesson practices the three capstone skills. Triage maps any symptom to the layer that caused it, using cheap checks in the right order. Latency work decomposes the budget and spends effort only on the binding stage. And design defense justifies every architectural choice with constraints, measurements, and a stated condition that would change the decision. Everything that follows is a scenario the curriculum has already prepared you for.

## Symptom-to-Layer Triage: Mapping Failures to Pipeline Stages

Symptoms appear at the top of the system, bad answers, stale answers, missing documents, slow answers, but they are caused at a specific layer, and the cost of triage done wrong is fixing the wrong one. The triage table is the curriculum compressed into a lookup:

| Symptom | Candidate layers | First check |
|---|---|---|
| Wrong but fluent answer | Grounding, retrieval, generation | Claim verification and context recall on that query |
| Document missing | Ingestion, parse, chunk, rank, filters, rerank | Walk the chain of custody |
| Stale answers | Ingestion, pipeline, index visibility | Per-stage watermarks |
| Slow answers | Retrieval, rerank, generation | Latency decomposition |
| Cross-tenant leak | Gateway, filter, cache, response | Which layer saw the foreign tenant context |
| Quality drop after change | Drift, defect, model | Timestamp alignment and canaries |

`Answer is wrong but fluent` splits three ways: grounding, checked by claim verification against the context; retrieval, checked by context recall on that exact query; generation, checked by asking whether the response addresses the question asked. `Document missing from answers` is a chain-of-custody walk: did it land in raw, did it survive parsing into silver, does any chunk contain the fact, does that chunk rank when the index is queried directly, did ACL or metadata filters remove it, did the reranker order it out. `Answers are stale` is the freshness chain, read off the per-stage watermarks. `Quality dropped after a change` is the observability lesson's three families. Each candidate layer has one cheap check that eliminates or confirms it, and checks run in cost order: dashboards first, direct index queries second, log archaeology last.

A full walk shows the method earning its keep. Users report that the new refund policy never appears in answers. The trace ID from the answer contract lets one failing query be followed end to end. Raw landing shows the PDF arrived Monday 09:00. Silver shows the parsed document, intact. A chunk-text search finds the policy sentence, so parsing and chunking are cleared in two minutes. A direct index query for `refund policy extension` ranks the chunk at 34. Funnel attrition shows it entering the rerank set, since BM25 at 34 and dense at 180 fuse to roughly 46, inside the depth of 50. The reranker orders it 11th, and the context budget admits 8. Layer found: context budget and rerank position, not retrieval, not ingestion. The correct fix is an afternoon of depth and context-k tuning. The wrong fix, re-embedding the corpus, costs a week and changes nothing, because the evidence was reaching the system the whole time. Mis-triage is how that week gets spent.

A second scenario is shorter but sharper. Spanish-language queries suddenly return English documents. The index is untouched, canaries are green, and the deployment log shows one change: a new rewriter prompt that dropped the language-preservation instruction. Diffing rewrite outputs before and after confirms it in one check. The defect was in the query-presentation layer, and every hour spent suspecting the index would have been wasted. The triage habit generalizes: before touching any layer, name the evidence that would convict it, and refuse to spend effort on layers the evidence has already cleared.

## Latency Budget Breakdown: Retrieval, Rerank, Generation

The latency lesson built the budget; this lesson spends it under pressure. The method is invariant: decompose into stages, measure p50 and p95 per stage, identify the one binding stage, apply that stage's levers, and re-verify, because the bottleneck moves after every fix.

Scenario A: p95 climbs from 3.8 to 6.1 seconds over two weeks. Decomposition shows retrieval p95 up from 0.45 to 1.9 seconds while rerank and time-to-first-token are flat. The corpus grew forty percent, the ANN probe count was never revisited, and candidates now fail ACL filters more often, forcing deeper fetches. The levers for the retrieval stage are probe depth, pruning, tenant sharding to shrink each graph, and hot-query caching. Sharding plus a probe increase restores retrieval to 0.6 seconds. The discipline that saved the week: measure first, because three of the four plausible fixes targeted stages that were not binding.

Scenario B: time-to-first-token doubles after a quality initiative raised context from 8 chunks to 16. Input tokens rose from 4,000 to 9,000, and prefill cost tracks input size. The levers for the generation stage are context size, prompt compression, and model routing. The resolution keeps the quality: chunk count returns to 10 with a reranker score threshold doing the filtering that raw volume was doing, chunk wrappers are stripped of redundant metadata, and simple query classes route to a smaller model. Every change passes the faithfulness and relevance gates, because a latency fix that spends quality is a trade, not a fix.

Scenario C: decode dominates at 12-second p95 because the prompt requests detailed explanations and answers average 900 tokens. The lever is the output budget: concise-by-default generation with user-expandable detail, a 400-token cap, and streaming that puts first token at 1.5 seconds. Perceived latency collapses while total compute barely changes.

The meta-rules: decompose before optimizing, since work on a non-binding stage buys zero user-visible gain; budget at p95, because users live in the tail; remember that each stage has its own lever set, index and probes and caches for retrieval, depth and batching and hardware for rerank, tokens in, tokens out, model size, and routing for generation; and re-run the decomposition after every change, because the bottleneck always moves to wherever you just made room.

| Stage | Primary levers | Signature when binding |
|---|---|---|
| Retrieval | Probe depth, pruning, sharding, caching | Retrieval p95 grows with corpus size |
| Rerank | Depth, batch size, accelerator pool | Rerank p95 grows with depth and queueing |
| Generation | Tokens in, tokens out, model size, routing | TTFT tracks input size, decode tracks output size |

One more phenomenon belongs in every latency review: queueing. Each stage's p95 includes time spent waiting for a worker, not just working, so a stage whose p50 is flat but whose p95 climbs is usually saturated, not slow, and the fix is capacity or admission control, not optimization. The scenarios above were algorithmic; plenty of real incidents are just a reranker pool one replica short at peak.

## Design Review Defense: Justifying Choices Under Constraints

The final skill is defending the architecture with numbers against reasonable alternatives. The format is fixed: state the constraint set, name the forces in tension, show where the chosen design sits on the tradeoff frontier, and give each rejected alternative its rejection reason.

`Why not drop the index and use long context?` The answer is arithmetic from the latency lesson: two million chunks cannot ride the prompt, per-query input cost multiplies by twenty or more, prefill takes seconds, freshness becomes snapshot-bound, and needle recall degrades with context length. Retrieval stays; long context is admitted where it wins, nightly whole-corpus synthesis. The defender shows the math, not the preference.

`Why RRF instead of learned fusion?` No labels exist to train on, ranks do not drift when models are swapped, and the reranker already owns final ordering, so the fraction of a point a learned merger might add does not pay for a training pipeline and its permanent maintenance at this team size. And the decision is reversible: the fusion stage is a contract boundary, so a learned fusion can replace RRF later without touching either retriever.

`Why per-tenant namespaces instead of per-tenant indexes?` Three hundred tenants make per-index operations unsupportable, the isolation analysis from the security lesson places namespaces mid-spectrum, and the compensating controls, gateway-injected tenant context plus response-layer re-verification, close the gap, with a documented graduation path to dedicated indexes for regulated tenants that requires no schema change.

`Why is quarterly re-embedding not the policy?` Because the cost lesson's triggers are evidence, not dates: a golden-set gain, measured drift, a corpus shape change. The calendar cannot know when a rebuild is worth its cost, and the playbook makes event-driven rebuilds safe enough to wait for evidence.

`Why one transform codebase for batch and streaming instead of a fast streaming rewrite?` Because the drift trap from lesson one is not hypothetical: two parse logics produce two chunk sets from the same document, and the divergence is discovered during an incident with the index in an unknown state. The single codebase costs some streaming efficiency; the alternative costs correctness you cannot see until it matters. The reversal condition: if streaming-path compute cost ever exceeds the incident budget it protects, the split gets re-proposed, with a conformance test suite as the price of admission.

Every one of those defenses ends the same way: with the condition that would reverse the decision. If multilingual traffic crosses thirty percent, re-embed on the newer model. If retrieval p95 crosses 800 milliseconds, shard. A decision defended by preference is opinion; defended by constraints, measurements, and reversal conditions, it is engineering. The reviewer's checklist follows: constraints listed explicitly, alternatives considered with rejection reasons, blast radius bounded, rollback rehearsed, observability named, unit cost computed. The backbone, in the end, is not the diagram from lesson one. It is the set of decisions you can defend this way, together with the humility to state, in writing, what would change your mind.
