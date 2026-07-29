Every improvement to the retrieval layer, a new embedding model, a new chunker, a new quantization level, is a rebuild, and rebuilds are where backbones get hurt. The difference between a non-event and an incident is a playbook that was written before it was needed: build beside, never in place; validate against live traffic before anyone is exposed; backfill only what the change actually touches; and make rollback a rehearsed drill measured in minutes, not an improvisation measured in hours.

## Index Rebuild-and-Swap with Versioned Aliases

The primitive is rebuild-and-swap. For any generation change, a complete new index is built beside the serving one under a new generation tag, validated, and then an alias moves from old to new in one atomic metadata operation. Consumers address only the alias, never a physical index, so the swap is instant and total, with no propagation window where half the fleet serves v3 and half serves v4. Rollback is the same operation in reverse.

The build follows three rules from earlier lessons. It reads from the source of truth, the lake's silver layer, never from the old index, because errors photocopy. It records the snapshot timestamp and replays the events since that snapshot before the swap, eliminating the staleness-at-publish gap from the observability lesson. And it runs the same transform code as the streaming path in bulk mode, because a forked build path is the drift trap from lesson one. Builds are also rate-shaped like any backfill: they run as scavenger capacity against the serving path, large enough to finish on schedule, small enough that a mid-build traffic spike never turns the rebuild into a serving incident.

Cutover is a procedure, not a command. The new index is pre-warmed, loaded into serving memory, exercised with the golden set and a replay of recent production queries so caches and autoscaling are hot before real users arrive. The swap happens at low traffic, with the observability lesson's dashboards up and the old generation kept hot for the rollback window. A generation is the whole tuple, embedding model, chunker version, quantization config, index build, tagged together, so metrics and reconciliation can attribute every number to exactly one system state.

A clean run looks like this: the v4 build finishes Tuesday 23:40, the staleness replay catches it up to 23:55, the golden gate passes Wednesday morning, shadowing runs twenty-four hours, the alias moves Thursday at 08:00 in thirty seconds, and v3 stays hot until Friday. Total user-visible change: none. That is what success looks like.

## Shadow Index Validation Before Cutover

Validation runs as four ordered gates. Structural validation: counts of documents, chunks, and vectors per tenant, schema conformance, ACL field presence, all checked by the reconciliation machinery. Golden-set validation: per-class metrics against the old index, paired, with no class regressing past its threshold. Shadow traffic: a sample of live queries mirrored to the new index with results logged but never served, comparing overlap, score distributions, and latency under the real query mix. Canary soak: the production canaries pointed at the new index for hours or days.

Shadow traffic earns its place because it catches what three hundred adjudicated queries cannot: tail queries nobody imagined, cache interactions that only appear under real traffic mix, latency behavior under concurrent load, and rare ACL shapes. A two percent shadow for a day surfaces more truth about the new system than a week of offline benchmarking. Sizing the shadow is its own small discipline. The sample must be large enough to contain the query classes you fear: if the exact-ID class is three percent of traffic, a one percent shadow shows it only a few hundred times a day, too thin to trust, so the shadow is either raised or stratified to oversample rare classes. Duration must cover the traffic cycle: an hour of Tuesday morning misses the batch-window load profile entirely. And shadow results are compared, not just collected: overlap and score-distribution deltas are computed continuously, so a degradation visible at hour three stops the soak at hour three rather than being read about on Friday.

The overlap analysis is the subtle instrument. Top-10 overlap between old and new will not be one hundred percent, and should not be, since improvement means different answers. But the delta must be explained. A few percent of queries changing is a healthy upgrade; sixty percent changing means either the build is broken or the upgrade is a far larger behavioral change than advertised, and in both cases a sample of changed queries gets read by a human before the swap proceeds.

Sign-off is written: each gate has an owner, a threshold, and a recorded result. The cutover meeting is a formality when the data is green and a no-go when it is not; it is never a debate about whether the results feel acceptable. A scenario makes the point: shadowing shows 0.9 percent of queries timing out on the new index under load despite a green golden set, traced to cold caches on long-tail tenants and fixed by per-tenant pre-warming. Without the shadow, those are nine hundred failures a day discovered by users instead of by a dashboard.

## Incremental vs Full Backfill Triggers and Idempotent Replay

The backfill type follows the blast radius of the change. Full backfill, a complete rebuild, is required when the change alters every artifact: a new embedding model changes every vector, a new chunker changes every chunk ID, a new analyzer changes every posting, a new quantization config changes every code. Incremental backfill recomputes only an affected subset: a parser bug affecting PDF tables reprocesses only PDFs, a new enrichment field re-runs metadata while reusing embeddings, an ACL schema change rewrites metadata under the security SLA.

The trigger table is the decision artifact:

| Change | Blast radius | Backfill |
|---|---|---|
| New embedding model | Every vector | Full |
| New chunker version | Every chunk ID | Full |
| New analyzer or tokenizer | Every posting | Full |
| New quantization config | Every stored code | Full |
| Parser bug in one format | That format's documents | Incremental |
| New enrichment field | Metadata only, embeddings reused | Incremental |
| ACL schema change | Metadata only, security-gated | Incremental with revocation clock |

The right column is written before the work starts, because the backfill type determines the schedule, the cost, and the rollback plan, and discovering mid-build that a supposedly incremental fix actually changes every chunk ID is how week-long incidents begin.

Replay is idempotent or it is a hazard. The contract machinery from lesson one supplies the properties: deterministic IDs, upsert semantics by ID and version, and no side effects outside the target generation, so running the backfill twice is safe and resuming a failed one continues rather than restarts. Checkpoints record partition-level progress. Rate limits make backfill scavenger traffic that never starves serving: serving is the foreground, backfill runs at the capacity the dashboards say is spare. Completion is a verified count match from reconciliation, not a job exit code, because `finished` is a state of the data, not of the scheduler.

The incremental win is concrete: a parser fix touches 180,000 PDFs in a 2.1 million document corpus, so the backfill reprocesses nine percent of the corpus in three hours at a quarter of capacity with zero serving impact. The full-rebuild alternative costs a day and four times the compute for the identical outcome.

## Rollback Design and Mixed-Version Serving Risks

Rollback is a designed, rehearsed path. The alias moves back to the previous generation, which stayed hot for exactly this purpose; generation-keyed caches are invalidated, since the cache discipline from the latency lesson keys on generation; and a verification pass, canaries plus the golden set, runs against the rolled-back state, because that state has been receiving live updates and is not byte-identical to what you left. The rollback window is the economic dial from the cost lesson: long enough for weekly traffic patterns to reveal a regression, short enough that keeping a second hot generation does not eat the savings. Past the window, rollback stops being an alias move and becomes a rebuild from truth, hours instead of seconds, and everyone should know which world they are in before they need it.

Mixed-version serving is the subtle hazard during incremental backfills. Two risks dominate. Incomparable scores: vectors from different models live in different spaces, and a fused or reranked list that mixes them compares incommensurables, so model changes never mix generations inside one serving unit; they run as complete parallel generations with an alias between them. Identity skew: chunker changes alter chunk IDs, so a corpus mid-backfill can return both the v3 and v4 chunk of the same passage, or neither, and dedup logic must key on document identity to survive it. The failure shape is worth picturing: a user asks about the refund policy and receives two near-identical citations, one from each chunker generation, which crowds a genuinely different source off the answer and doubles the citation count for one fact. The safe rule: metadata-only incremental backfills may mix, because vectors and scores are untouched; model and chunker changes go full-generation dual-run. Metrics collected during any mix are contaminated and flagged as such.

The rehearsed incident: Thursday 10:20 the alias moves to v4; 11:05 canaries show the exact-ID class down nine percent; 11:10 the pre-agreed threshold makes the decision; 11:12 the alias is back on v3; caches invalidated; 11:20 verification is green. Users saw forty-two minutes of degraded exact-ID behavior instead of a day of it. The post-mortem adds an exact-ID shadow gate for v5. That is the whole philosophy: in an incident you do not rise to the occasion, you fall to the level of your rehearsal, so the rehearsal is the engineering.
