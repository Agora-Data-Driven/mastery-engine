Every AI system you ship is only as good as the pipelines feeding it: the documents your BM25 index and embedding store serve, the features your reranker consumes, and the evaluation metrics that tell you whether relevance actually improved all arrive through ETL. Pipeline architecture is the set of decisions about where data lands, where it is transformed, and what promises each stage makes to the next. Get these right and everything later in this course — idempotent reruns, streaming, CDC, orchestration — has a stable frame to attach to; get them wrong and every bug becomes unrecoverable because the evidence was rewritten at load time.

## ETL vs ELT: Where Transformation Lives

ETL and ELT move the same three verbs — extract, transform, load — but disagree about *where the T executes*, and that single decision cascades into cost, recoverability, and team workflow.

In classic **ETL**, a dedicated processing tier (a Beam/Dataflow job, a Spark cluster, a fleet of workers) pulls data from sources, transforms it in flight — parsing, joining, masking, aggregating — and loads only the finished product into the warehouse. The warehouse never sees the raw input. This layout dates from the era when warehouse compute was the scarcest, most expensive resource in the building, so you spent cheap commodity CPU outside it and reserved the warehouse for serving queries.

In **ELT**, you extract and load the data *as-is* into the warehouse first, then transform it inside the warehouse using SQL (scheduled queries, dbt models, materialized views). Cloud warehouses like BigQuery made this economical by separating storage from compute: columnar storage is cheap (on the order of $0.02/GB-month), and elastic query compute is billed only when used. Landing 500 GB of raw JSON events costs pennies to store; the transformation is a SQL statement the warehouse can parallelize across thousands of slots:

```sql
CREATE OR REPLACE TABLE curated.orders_daily AS
SELECT DATE(event_time) AS day, currency,
       SUM(amount_cents)/100 AS revenue, COUNT(*) AS orders
FROM raw.order_events
WHERE _op = 'created'
GROUP BY day, currency;
```

**Why the placement matters.** ELT's decisive advantage is that the raw data survives. When you discover, three weeks later, that your parsing logic dropped orders with multi-currency line items, you fix the SQL and re-run it over raw data that is still there. In pure ETL, the mis-parsed rows were transformed before landing; the information they carried may be gone unless the source can be re-extracted. ELT also collapses the toolchain: analysts iterate on transformations in SQL without touching pipeline infrastructure. ETL's advantages are the mirror image: the transform tier can run arbitrary code — tokenization, PII masking, calling an embedding model — that SQL cannot express or that must happen *before* data lands anywhere queryable. If a compliance rule says raw card numbers may never be stored in the analytics project, masking must occur in flight: that is ETL by requirement, not preference.

**Worked example.** You ingest 10M clickstream events/day for a retrieval-quality dashboard. ELT version: load newline-delimited JSON into `raw.events` (native JSON columns, no parsing at load), then a scheduled SQL model builds `curated.query_ctr`. Total transform cost: one daily scan of the day's ~8 GB partition. ETL version: a Dataflow job parses, sessionizes, and computes CTR in flight, writing only the 50 MB summary. The warehouse is cheaper to query, but when you later want dwell-time (a field you discarded), only the ELT design still has it.

**Judgment layer.** Experts rarely run either pattern pure. The common production shape is *EtLT*: a light in-flight "t" (decompress, validate structure, mask PII, attach lineage metadata) so nothing illegal or malformed lands, then heavy modeling in the warehouse. Choose ETL-heavy when transformations need non-SQL libraries (ML inference, embedding generation), when latency demands stream processing, or when regulation forbids landing raw data. Choose ELT-heavy when auditability, reprocessability, and analyst iteration speed dominate. The classic ELT failure mode is cost blow-up: careless dev iteration that repeatedly full-scans a giant raw table — mitigated by partitioning raw tables and developing against sampled subsets. The classic ETL failure mode is information loss: any field you did not think to keep is unrecoverable.

## Staging, Raw, and Curated Zones

A pipeline is not one table; it is a sequence of *zones* with increasing trust and decreasing fidelity to the source. The standard three-layer layout (you will also hear the medallion terms bronze/silver/gold) gives every dataset a defined level of cleanliness and a defined owner.

**Staging (landing)** is the transient airlock. Data arrives exactly as extracted — one folder or table per source per load batch, e.g. `gs://agora-lake/staging/orders/2026-07-25/run-42/part-*.avro`. Nothing reads staging except the loader that promotes it. Staging is disposable: once a batch is verified and promoted, it can be truncated. Its job is to decouple extraction from loading — a failed load can re-read the staged batch without hitting the source system again.

**Raw** is the permanent, append-only archive of what actually arrived: `raw.order_events`, partitioned (typically by ingestion or event date), immutable by convention — you never UPDATE raw; you only append. Raw preserves the source's own schema and warts: duplicate deliveries, malformed enum values, nulls where the docs said "never null". Raw is *schema-on-read*: store the payload loosely (JSON/Avro), interpret it downstream.

**Curated** is the modeled, cleaned, consumer-facing layer: deduplicated, typed, conformed to naming standards, keys enforced, business logic applied. Dashboards, ML feature jobs, and your retriever's document-build pipeline read curated, never raw.

**Why the layering exists.** The raw zone is your *reprocessing insurance*. Every transformation you will ever write contains a bug you have not found yet. If raw is intact, the fix is: patch the transform, re-run it over raw, republish curated. If consumers had been fed directly from in-flight transforms, that bug would have destroyed data instead of merely mis-presenting it. The layering also isolates blast radius: a source can change its payload shape and break the raw-to-curated transform while raw keeps faithfully archiving — nothing is lost during the outage, and the transform is fixed at leisure.

**Worked example.** Your reranker's training pipeline reads `curated.search_interactions`. On July 25 you discover that since July 3, a transform bug has been coalescing null `click_position` to 0, poisoning the label. Because `raw.search_events` still holds every original payload since day one, you correct the transform and rebuild the July 3–25 partitions of curated. Recovery cost: one backfill query. Without a raw zone: 22 days of training labels permanently corrupted.

**Judgment layer.** Raw retention is a cost/compliance negotiation: storing everything forever is cheap but not free, and privacy law cuts against immutability — a GDPR erasure request must reach raw too, which teams handle by targeted partition rewrites or by encrypting per-user with deletable keys (crypto-shredding). The most common anti-pattern is consumers "shortcutting" into raw because curated lacks a field they want: they inherit an unstable, uncontracted schema, and the next upstream change breaks them without warning. The correct response to that pressure is to promote the field into curated, not to bless raw reads. Finally, do not confuse staging with raw: staging is per-run scaffolding you may delete; raw is the archive you must protect.

## Data Contracts Between Producers and Consumers

Zones organize data *within* your platform; data contracts govern the boundary where someone else's system hands data to yours. A data contract is an explicit, machine-checkable agreement between a producer (an app team emitting events, a service exposing a table) and its consumers, covering four things: **schema** (field names, types, nullability), **semantics** (units, enum vocabularies, timezone conventions, what a record *means*), **SLAs** (freshness, completeness, delivery guarantees), and **evolution rules** (which changes are allowed without consumer sign-off).

**Mechanism.** The contract lives as a versioned artifact — YAML/JSON in a repo, or a schema in a schema registry — and is *enforced*, not merely documented, at two points. First, in the producer's CI: a check compares the proposed schema against the contract and blocks merges that make breaking changes. Second, at your ingestion boundary: the staging-to-raw loader validates incoming batches against the contract and quarantines or rejects violations. A change is *backward compatible* if every existing consumer keeps working — adding a new optional (nullable, defaulted) field qualifies; renaming a field, changing `amount` from int to string, deleting a field, or repurposing an enum value does not.

**Worked example.** The orders service publishes `order_created` under this contract:

```yaml
contract: order_created v3
fields:
  order_id:    {type: string, required: true, unique: true}
  event_time:  {type: timestamp, required: true, tz: UTC}
  amount_cents:{type: int64, required: true, semantics: minor currency units}
  currency:    {type: string, required: true, enum: [USD, EUR, PHP]}
sla: {freshness: 15m p95, completeness: 99.9% within 24h}
evolution: additive-optional-only
```

A producer PR adding optional `discount_cents` passes CI. A PR renaming `amount_cents` to `amount` fails CI with a diff against v3 — the breakage is caught at review time, in the producer's repo, before a single bad event is emitted.

**Why contracts exist.** Without them, the de facto interface is "whatever the producer's database happens to look like today". Producers refactor their schema for their own reasons — as they should — and consumers discover the change when a 3 a.m. pipeline run fails or, worse, silently loads garbage (a renamed column arriving as all-null survives many loaders). The contract converts an invisible runtime coupling into a visible compile-time one, and it assigns responsibility: the producer owns not breaking v3; the consumer owns coping with anything v3 permits.

**Judgment layer.** The first real decision is *gate versus monitor*: blocking producer deploys on contract checks gives maximum safety but demands organizational buy-in; a lighter-weight start is monitoring — validate at ingestion, alert on drift, quarantine bad batches — which protects you without requiring another team to change their CI. The second is *breaking-change process*: when a break is genuinely needed, the standard move is versioned coexistence — publish `order_created.v4` alongside v3 (dual-publish) for a migration window, then retire v3 once consumers have moved — rather than a coordinated big-bang cutover. Third, right-size the ceremony: a contract between two engineers on one team can be a shared schema file; a contract feeding thirty downstream consumers deserves registry enforcement and a deprecation policy. Contracts complement zones: the contract is enforced at the staging-to-raw boundary, which is exactly what lets you promise curated consumers stability at all.
