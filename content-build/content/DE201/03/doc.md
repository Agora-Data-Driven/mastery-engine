Analytical storage performs well when engines can avoid opening irrelevant data and can read useful data in large sequential units. Partitioning, file sizing, and compaction control those physical behaviors. They are not independent tuning knobs: an overly granular partition scheme creates small files, and compaction must preserve the snapshot semantics that make concurrent readers safe.

## Partitioning Strategy: Pruning What You Do Not Read

Partitioning groups rows into physically or logically separate data units using values derived from one or more columns. A query engine examines the filter, identifies partitions that cannot match, and skips their files. If a table contains five years of events partitioned by day, a query for one week can avoid reading almost all other days.

The partition key should align with common, selective predicates. Event time is a frequent choice because analytics often filters ranges and ingestion naturally advances through time. Tenant, region, or source can help when queries nearly always constrain them. Partitioning by a column that users rarely filter provides little pruning and adds metadata overhead.

Suppose a table stores 3.65 terabytes across 365 daily partitions of roughly 10 gigabytes. A one-day query can scan about 10 gigabytes rather than 3.65 terabytes, ignoring column and row-group pruning. Partitioning the same data only by year forces the engine to consider an entire 3.65-terabyte partition. Partitioning by hour could reduce one-hour scans further but creates 8,760 partitions and may fragment writes.

Cardinality determines risk. Partitioning directly by a nearly unique user ID can create millions of directories or metadata entries, many containing tiny files. Listing, planning, authorization checks, and catalog updates may cost more than reading the data. Bucketing or clustering by a hash can distribute users into a fixed number of groups without one partition per user.

Partition transforms often provide a better abstraction than exposing raw values. A table format may partition a timestamp by day or month and a high-cardinality key by a fixed bucket transform. The query engine can translate `event_time >= ...` into partition pruning without forcing users to filter a separate `event_date` column. Hidden partitioning also permits layout evolution with less query breakage.

Multi-column partitions should follow real access patterns. `date/region` can help queries constrained by both, but creates a cell for every date-region combination. If many regions have little data, the layout becomes sparse. Ordering also affects directory-style systems: pruning by region without date may still require enumerating many date prefixes.

Partition pruning requires predicates the optimizer can translate. A direct date range is usually effective. Wrapping the column in an unsupported function, comparing incompatible types, or filtering after a transformation can block pruning. Explain plans and scanned-byte metrics should verify behavior; a partitioned table does not guarantee a pruned query.

Late data and corrections complicate write patterns. An event arriving thirty days late reopens an old partition. Pipelines need an overwrite or merge strategy that changes only affected data while preserving concurrent readers. A rolling window that rewrites the last seven days will miss later records unless a separate reconciliation path handles them.

Partition evolution is necessary as volume and query patterns change. Early data may fit monthly partitions; later scale may require daily transforms. Snapshot-aware table formats can let old and new layouts coexist while metadata routes readers correctly. A directory-only convention may require an explicit migration and query logic that understands both layouts.

Choose partitioning with measurements: bytes per partition, files per partition, filter frequency, pruning ratio, planning latency, skew, and late-write frequency. The goal is not maximum partition count. It is to skip large irrelevant regions while keeping each selected region efficient to plan and scan.

## The Small-File Problem

A small file contains too little useful data to amortize the fixed cost of discovering, opening, authorizing, scheduling, and decoding it. Object stores can hold enormous numbers of objects, but query engines still pay per-object work. Ten thousand 1-megabyte files and ten 1-gigabyte files contain similar bytes, yet the first layout needs far more requests and tasks.

Fixed costs appear throughout the stack. The engine lists or reads metadata, opens an object, performs network round trips, parses a footer, allocates a task, initializes decompression, and closes the stream. A distributed scheduler handling thousands of tiny tasks spends CPU coordinating rather than scanning. Rate limits and request charges may become visible before bandwidth is saturated.

Small files often come from parallel streaming writers, overly granular partitions, frequent micro-batches, retries, and low-volume partition combinations. If 200 workers each write one file every minute, a day can produce 288,000 files. Even at 5 megabytes each, the aggregate data is substantial, but the file count makes planning and metadata operations painful.

Target file size depends on engine, format, workload, and object store. A range such as hundreds of megabytes is common for analytical Parquet, but there is no universal optimum. Very large files reduce open costs yet limit scan parallelism, make rewrites expensive, and can contain broad value ranges that weaken statistics. Very small files maximize parallel units but drown the scheduler.

File size is distinct from row-group size. A 512-megabyte Parquet file might contain four 128-megabyte row groups, allowing row-group statistics and parallel readers. Combining thousands of tiny files into one file with sensible row groups improves metadata amortization without turning the entire file into one indivisible unit.

Skew can hide behind averages. A table averaging 256 megabytes per file may still have one partition with 50,000 tiny files and another with a few huge files. Report distributions by partition: count, p50, p95, minimum, and maximum sizes. Track files added per ingestion batch and the ratio of bytes to objects.

Writers can reduce the problem upstream. Buffer more rows, repartition by target keys, limit concurrent writers per partition, and use adaptive sizing. Streaming systems may land micro-batches quickly into a raw tier, then compact them asynchronously for analytical serving. Forcing every low-latency writer to create a large file would increase ingestion delay.

Do not solve small files by blindly concatenating bytes. Columnar file formats contain footers, schemas, encodings, and row groups; valid compaction reads logical rows or copies compatible structures through a format-aware writer. It should preserve schema, partition values, null semantics, and statistics.

The operational signal is end-to-end: planning time, object requests, task count, scan throughput, query latency, and compaction cost. A file-size threshold is a means, not the goal. A layout is healthy when reads efficiently use compute and maintenance does not consume disproportionate resources.

## Compaction: Merging Files Without Breaking Readers

Compaction rewrites many small data files into fewer larger files, often sorting or clustering rows at the same time. The logical table contents should remain equivalent unless the job explicitly deduplicates or applies deletes. A safe compactor produces new immutable files and commits a metadata change that replaces old file references atomically.

In-place mutation is dangerous on object storage. A reader may list old and new objects at different moments, observe a partially written file, or combine both generations and double count rows. Immutable data files plus an atomic snapshot pointer let readers remain on the old snapshot until the new snapshot is fully committed.

A typical workflow selects eligible files within one partition, records the input snapshot, reads and validates their rows, writes replacement files to unique temporary or final object names, then attempts a compare-and-swap metadata commit. The commit removes input files from the new snapshot and adds outputs. If another writer changed overlapping files, conflict detection forces a retry or replanning.

For example, a partition contains 1,000 files of 8 megabytes, totaling about 8 gigabytes. A compactor targets 512-megabyte outputs and creates roughly 16 files. Before committing, it verifies row count, key checksums or aggregate measures, partition values, schema, and output readability. The old 1,000 files remain available to readers of the prior snapshot.

Old files cannot be deleted immediately. Active queries may still reference the old snapshot, and rollback or time travel may require it. A garbage-collection process expires files only after the snapshot-retention period and a safety interval. It should delete objects proven unreachable from retained metadata, not everything absent from the latest file list.

Compaction must coexist with ingestion. Partition-scoped locking is one option but can reduce throughput. Optimistic concurrency is more flexible: writers create immutable files independently, while the table format detects conflicts during metadata commit. A compactor should avoid claiming new files that appeared after its planning snapshot unless it replans.

Sorting during compaction can improve row-group statistics and data skipping. Clustering events by tenant within a date partition makes tenant filters touch narrower ranges. The benefit should justify rewrite CPU and potential skew. Repeatedly compacting already healthy files merely burns resources and increases storage churn.

Eligibility policies combine file size, file count, age, delete density, and query importance. Recent streaming partitions may compact every hour; cold partitions compact once after they settle. Avoid compacting files still being rapidly superseded. A bin-packing planner groups inputs into target-sized outputs without crossing partition boundaries unless the partition scheme itself is being migrated.

Idempotency and observability are essential. Give every compaction attempt an ID, record input and output files, and use deterministic selection or conflict checks. Metrics should include bytes read and written, files removed and added, amplification, duration, conflicts, validation failures, and query impact.

Failure before commit leaves unreferenced output files, which a later orphan cleanup can remove after a safety delay. Failure after a confirmed atomic commit must not retry as if inputs were still active. The job should query table metadata by attempt ID or output IDs to establish state before recovery.

Compaction is successful when readers see a consistent snapshot throughout: either the old set of small files or the new compacted set, never an accidental mixture. That guarantee matters more than achieving an exact target size. Physical maintenance should improve performance without changing the table's logical history.
