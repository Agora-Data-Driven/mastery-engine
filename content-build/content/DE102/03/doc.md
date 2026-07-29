Data changes, but analytical questions often refer to the world as it was. Slowly changing dimensions and document versions preserve that temporal context instead of overwriting it with the latest value. The design challenge is to make history queryable, prevent overlapping truth, and retain only the history whose future value justifies its cost.

## SCD Type 2: Effective-From and Effective-To Rows

A Type 2 slowly changing dimension creates a new row when a tracked attribute changes. The old row remains for historical facts. Each version usually has its own surrogate key, the same business key, an effective-from timestamp, an effective-to timestamp, and often a current-row flag.

Suppose customer C42 belongs to region North from January 1 until March 15, then moves to South. The dimension contains one version effective `[January 1, March 15)` and another effective `[March 15, infinity)`. A sale on February 10 links to or resolves to the North version; a sale on April 2 resolves to South. Historical revenue by region remains faithful to the classification at sale time.

Half-open intervals are a clean convention: `effective_from <= event_time < effective_to`. The end is exclusive, so adjacent versions can meet at exactly one boundary without both matching. Using inclusive ends on both rows makes an event at March 15 join twice. A far-future timestamp can represent the current open end, but a nullable end is also possible if query and database semantics are consistent.

The warehouse should enforce three invariants per business key: at most one current row, no overlapping validity intervals, and deterministic ordering of versions. Gaps may be allowed or forbidden depending on source semantics. Tests can use a window function to compare each row's `effective_to` with the next row's `effective_from`.

Also test that every interval has positive duration. A zero-length or reversed interval can never match a valid event and usually signals bad ordering or timestamp normalization.

When a tracked change arrives, a transactional update commonly closes the current version and inserts the new version. If the change becomes effective at time T, set the old row's end to T and the new row's start to T. The transaction prevents a moment with two current rows or no current row. Append-oriented warehouses may rebuild affected keys in a staged model and atomically replace a partition.

Late-arriving changes are harder. Imagine the warehouse learns on April 1 that the region actually changed on March 15, after facts through March have loaded. If facts store the dimension surrogate key, affected facts may need restatement. If facts store a business key and perform temporal joins at query or build time, the new interval can resolve them correctly but adds join complexity. The design should explicitly state whether history is corrected retroactively.

Facts can connect to Type 2 dimensions in two main ways. An early-binding pipeline resolves and stores the version surrogate key when loading each fact, making later queries simple and fast. A late-binding pipeline retains business key plus event time and joins on the validity interval, allowing revised history but requiring a range join. Some systems keep both for audit and controlled restatement.

Not every attribute deserves Type 2 tracking. Correcting a spelling error in a customer name may not create a meaningful business version, while changing contractual tier or sales territory might. Classify attributes: Type 1 overwrite for values whose old form should not be reported, Type 2 version for historically meaningful changes, and sometimes fixed attributes that should never change without an incident.

Deletes also need semantics. A source deletion may close the current interval, create an `is_deleted` version, or remove data under a legal deletion policy. Analytical history, operational source state, and privacy obligations can conflict. A dimension model cannot turn a mandated erasure into indefinite retention merely by calling it history.

Time zones and precision must be standardized. A date-only source cannot reliably order two same-day changes. An event timestamp in local time without an offset can be ambiguous at daylight-saving transitions. Preserve source timestamps, normalize comparison instants, and define tie-breaking rules for changes sharing a time.

## Document Versioning as SCD Type 2

Documents also have business identity and versions. A policy page, product manual, contract, or knowledge-base article may keep one logical document identifier while its title, body, metadata, and permissions change. Treating every crawl as a new unrelated document loses continuity; overwriting content loses historical reproducibility.

A document-version table can use `document_id` as the stable business identity and `version_id` as the immutable version identity. It stores `effective_from`, `effective_to`, content hash, source modification time, ingestion time, parser version, content location, metadata, and deletion status. Each version represents what the system believed the document to be during a validity interval.

Content-addressed hashes help avoid false versions. If a crawler downloads identical normalized bytes every hour, a stable hash shows that content has not changed. Metadata or permissions may still create a new version even when body content is identical, so the version trigger should cover every tracked attribute, not content alone.

Retrieval reproducibility benefits directly. If an evaluation run on June 1 used document version V7, storing only the current content makes later explanations impossible after V8 arrives. Versioned corpus snapshots can reconstruct candidates, chunks, embeddings, and permissions as of the run. Index manifests should record the exact version set or source snapshot.

Chunks are children of a specific document version, not merely of a logical document. When content changes, offsets and boundaries can shift even if most text remains similar. A chunk identifier should include or derive from the version and chunking configuration. Reusing an old chunk ID for new text corrupts embedding caches, citations, and evaluation labels.

Version timelines distinguish source-effective time from system-observed time. A policy may take effect on July 1 but be ingested July 3. Effective time answers which policy governed an event; ingestion time answers what the retrieval system could have known. Bitemporal designs keep both when audits require reconstructing knowledge as observed and truth as later corrected.

Corrections require care. If V7 contained a parser defect rather than authentic source history, create a new derived artifact under a new parser version while preserving the source version. Otherwise content history and processing history become conflated. Lineage should connect source bytes, parser configuration, normalized text, chunks, and embeddings.

Version-aware queries must state intent. "Show the current policy" selects the open current version. "Which policy applied to a claim on May 4?" uses effective time. "What answer did the system have on May 4?" may use ingestion or index snapshot time. A generic `latest version` helper cannot satisfy all three.

Storage can be controlled through immutable object blobs plus metadata rows, deduplication by content hash, compression, and lifecycle tiers. Do not discard version identity merely because bytes are shared. Two versions can reference the same blob while differing in permissions or effective interval.

## Choosing What History to Keep

History has value when it supports a concrete obligation or decision. Common needs include financial restatement, compliance audit, model reproducibility, debugging, user-visible revision history, legal discovery, and trend analysis. List the questions first, then choose temporal granularity and retention.

Keeping every change forever is not automatically safe. It increases storage, catalog volume, query complexity, breach exposure, and legal discovery scope. Personal data may have deletion or purpose-limitation requirements. Conversely, keeping only current values can make revenue reports shift silently and prevent investigation of model behavior.

Classify data by change significance. A pricing tier, permission policy, or model configuration may need every version. A transient crawler header may need none. Rapid telemetry attributes may be better represented as an event fact or periodic snapshot than a Type 2 dimension that creates millions of tiny intervals.

Retention can use tiers. Keep recent versions in the primary warehouse for interactive analysis, older required versions in lower-cost immutable storage, and aggregate summaries beyond detailed retention when allowed. A manifest and restoration procedure are necessary; archived data that cannot be located or interpreted is not useful history.

Granularity is part of the choice. Daily snapshots cannot answer which value applied at 10:00 versus 16:00. Event-level change logs can, but require reliable timestamps and more storage. Match precision to decision risk. If billing uses daily status at midnight, daily grain may be sufficient; access-control changes may require seconds and observation time.

Retention policies should be machine-enforced and versioned. Record data class, owner, legal basis, retention duration, archive rule, deletion rule, and exceptions. Apply policies to derived copies such as chunks, embeddings, caches, exports, and backups, not only the primary table. A deleted document that remains searchable through an embedding is not actually deleted from the product.

Reproducibility sometimes needs artifacts rather than raw personal data. A model evaluation may retain aggregate metrics, configuration hashes, and anonymized judgments while expiring sensitive source text. Decide which evidence is sufficient to reproduce or audit conclusions without retaining unnecessary identity.

Test historical models with temporal assertions. Verify non-overlapping intervals, exactly one current version when expected, fact-to-version coverage, stable content hashes, lineage completeness, and deletion propagation. Reconcile counts before and after restatement. Sample "as of" queries around boundary timestamps because off-by-one errors hide there.

Ownership is essential. Source teams define when a change is effective; data teams implement capture and intervals; governance defines retention and erasure; consumers define required historical questions. Without named owners, a Type 2 table tends to become an unbounded archive whose semantics no one trusts.

The sound decision is not maximum history but sufficient, governed history. Preserve versions that protect analytical truth, auditability, and reproducibility. Overwrite noise whose prior form has no legitimate use. Expire sensitive or costly detail according to policy, while maintaining lineage that explains what was retained, transformed, archived, or removed.
