**The big idea**: A pipeline is a series of promises about *where data is allowed to change shape*. Three decisions set every one of them: whether transformation happens before or after data lands (ETL vs ELT), which zone a dataset lives in and how much trust it has earned (staging → raw → curated), and what the producer has promised you in writing (the data contract). Everything later in this course — idempotent reruns, replay, CDC, backfills — assumes you kept an unmodified copy of what actually arrived. If you did not, a bug does not mis-present your data, it destroys it.

**Key concepts**

- **ETL vs ELT is one question: where does the T execute?** In ETL a separate processing tier transforms in flight and loads only the finished product — the warehouse never sees the raw input. In ELT you land the data as-is and transform inside the warehouse with SQL. *Why it matters:* ELT keeps the raw data alive, so a parsing bug found three weeks later is a fixed query and a re-run. In pure ETL the mis-parsed rows were transformed before landing, and anything you did not think to keep is gone unless the source can be re-extracted. *Example:* 10M clickstream events/day. ELT lands ~8 GB of JSON and builds `curated.query_ctr` with a scheduled query; ETL sessionizes in Dataflow and writes a 50 MB summary. The ETL warehouse is cheaper to query — but when you later want dwell-time, a field you discarded, only the ELT design still has it.

- **Cloud economics are what made ELT viable.** Separating storage from compute means columnar storage is roughly $0.02/GB-month while query compute is billed only when used. Landing 500 GB of raw JSON costs pennies to keep; the transform is a SQL statement the warehouse parallelizes across thousands of slots. ELT is not a fashion — it is a consequence of that price change.

- **Zones are levels of earned trust.** **Staging** is a transient airlock: one folder per source per batch (`gs://…/staging/orders/2026-07-25/run-42/part-*.avro`), read only by the loader that promotes it, truncated once verified. Its job is to decouple extraction from loading, so a failed load re-reads the batch instead of hammering the source again. **Raw** is the permanent, append-only archive of what actually arrived — partitioned by date, never UPDATEd, schema-on-read, and it faithfully preserves the source's warts: duplicate deliveries, malformed enums, nulls the docs swore were impossible. **Curated** is modeled and consumer-facing: deduplicated, typed, keys enforced, business logic applied. Dashboards, feature jobs and your retriever's document build read curated. (You may hear these as bronze/silver/gold.)

- **Raw is reprocessing insurance, and that is its whole justification.** Every transform you will ever write contains a bug you have not found yet. With raw intact the fix is: patch the transform, re-run over raw, republish curated. *Example:* on July 25 you find that since July 3 a transform has been coalescing null `click_position` to 0, poisoning your reranker's training label. Because `raw.search_events` still holds every original payload, you correct the transform and rebuild the July 3–25 curated partitions. Recovery cost: one backfill query. With no raw zone: 22 days of labels permanently corrupted.

- **Layering also isolates blast radius.** If a source changes its payload shape, the raw-to-curated transform breaks while raw keeps archiving faithfully. Nothing is lost during the outage and the transform gets fixed at leisure.

- **A data contract is an enforced agreement at the boundary where someone else's system hands data to yours.** It covers four things: **schema** (names, types, nullability), **semantics** (units, enum vocabularies, timezones — what a record *means*), **SLAs** (freshness, completeness, delivery guarantees), and **evolution rules** (what may change without consumer sign-off). *Mechanism:* it lives as a versioned artifact — YAML in a repo or a schema-registry entry — and is enforced at two points: the producer's CI blocks merges that break it, and your staging-to-raw loader validates incoming batches and quarantines violations. *Example:* against `order_created v3`, a PR adding optional `discount_cents` passes; a PR renaming `amount_cents` to `amount` fails CI with a diff — caught in the producer's repo before one bad event is emitted.

- **Backward compatible has a precise meaning:** every existing consumer keeps working. Adding a nullable/defaulted field qualifies. Renaming a field, changing `amount` from int to string, deleting a field, or repurposing an enum value does not.

**Rules to remember**

- ETL = transform *then* load. ELT = load *then* transform. The letters are the execution order.
- Staging is per-run scaffolding you may delete. Raw is the archive you must protect. They are not the same thing.
- Raw is append-only by convention. You never UPDATE raw.
- Additive-optional is backward compatible; rename, retype, delete, and enum-repurpose are breaking.
- The real production shape is **EtLT**: a light in-flight `t` (decompress, validate structure, mask PII, attach lineage) so nothing illegal or malformed lands, then heavy modeling in the warehouse.

**Common pitfalls**

- **Assuming ELT is simply the modern answer.** If regulation forbids raw card numbers landing in the analytics project, masking must happen in flight — that is ETL by requirement, not preference. Same for transforms needing non-SQL libraries (tokenization, embedding generation) or stream-processing latency.
- **Forgetting each pattern's signature failure.** ETL's is *information loss* — the field you did not keep is unrecoverable. ELT's is *cost blow-up* — careless iteration repeatedly full-scanning a giant raw table. Fix ELT's with partitioned raw tables and development against sampled subsets.
- **Consumers shortcutting into raw** because curated lacks a field they want. They inherit an unstable, uncontracted schema and the next upstream change breaks them silently. The correct response is to promote the field into curated, not to bless raw reads.
- **Believing a schema break always announces itself.** A renamed column arriving as all-null survives many loaders — it loads garbage quietly rather than failing at 3 a.m. That silence is the reason contracts are machine-checked rather than documented.
- **Treating immutability as absolute.** A GDPR erasure request must reach raw too. Teams handle it with targeted partition rewrites or crypto-shredding (encrypt per user, delete the key) — not by pretending raw is untouchable.

**How to approach the questions**

1. When a question contrasts ETL and ELT, find what it is really testing: *recoverability* (ELT wins — raw survives), *cost profile*, or *a hard constraint* like compliance or a non-SQL transform (ETL wins). The answer is rarely "ELT is better".
2. If a scenario describes data being lost or corrupted, ask which zone was missing. Almost always: no raw archive, or a consumer reading raw directly.
3. For contract questions, test the change against "does every existing consumer keep working?" That single question separates additive from breaking every time.
4. Watch for staging-vs-raw substitutions in distractors. "Transient, per-batch, deletable" is staging; "permanent, append-only, partitioned" is raw.

**Where this leads**: raw is what makes a rerun *possible*; the next lesson, **Idempotency and Replayability**, is about making a rerun *safe* — writes that produce the same result whether they run once or five times.
