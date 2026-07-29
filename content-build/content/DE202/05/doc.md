Change data capture turns database mutations into an ordered stream that downstream systems can apply incrementally. Its apparent simplicity hides hard questions: where changes are observed, whether deletes are visible, how an initial snapshot joins the stream, and what happens when schema or transaction order changes. A useful CDC design makes those boundaries explicit.

## CDC: Log-Based vs Query-Based

Log-based CDC reads a database's transaction log, write-ahead log, or replication stream. Because the database already records committed changes for recovery and replication, a connector can decode inserts, updates, and deletes without repeatedly scanning application tables. The log position provides a resume point and usually preserves database commit order within its documented scope.

An update event may contain before and after values, changed fields, transaction identity, source table, key, commit timestamp, and log sequence position. Delete records are available because the log records deletion even though the row no longer exists in the table. Transaction boundaries can let a consumer apply several row changes atomically or at least understand that they belong together.

Log-based capture is low-latency and efficient at scale, but it is operationally coupled to database internals and privileges. Connectors need replication access, log retention long enough to survive outages, and compatibility with database versions. A consumer that falls behind beyond log retention may need a new snapshot rather than resuming.

Query-based CDC polls a source table for rows changed since a cursor, often using `updated_at`, an increasing ID, or a change-tracking table. It is easier to adopt when log access is unavailable and can work through ordinary SQL credentials. It also imposes recurring query load and has weaker visibility into deletes and intermediate changes.

Indexes on cursor columns are essential. Without them, each poll may scan the whole source and compete with application traffic. Explain plans and source CPU should be monitored as data grows.

Throttle polling before it threatens transactional latency.

A naïve predicate `updated_at > last_seen_time` can lose rows. Two transactions may share the same timestamp, or a late commit may receive a timestamp below the stored cursor. Use a composite cursor such as `(updated_at, primary_key)`, query with a lexicographic greater-than predicate, and overlap a safety interval while deduplicating stable change identities.

Polling also misses multiple updates between polls. If a row changes from A to B to C before the next query, selecting the current table shows only C. This is sufficient for state replication when only latest state matters, but not for an audit stream or event-driven side effects that require B. A source-maintained change table can preserve transitions at added write complexity.

Deletes need an explicit mechanism in query-based capture. Soft-delete flags keep tombstoned rows queryable. A separate deletion log records keys. Periodic full comparison can discover missing rows but is expensive and delayed. Without one of these, downstream state accumulates records removed upstream.

Both approaches need an initial snapshot. Reading current rows establishes baseline state, then change events keep it current. The handoff must avoid a gap or duplicate boundary. A log-based process can record position L, take a consistent snapshot corresponding to L, then replay after L. Exact procedures depend on the source database and connector.

If snapshot rows and live changes overlap, stable keys and idempotent upserts make duplicates harmless. If a change is applied before its older snapshot row, the snapshot must not overwrite the newer state. Source positions or versions let sinks reject stale writes.

Choose based on requirements. Log-based CDC fits low latency, delete capture, high change volume, and faithful transitions. Polling fits modest tables, relaxed latency, restricted source access, or latest-state synchronization. Evaluate source load, connector operations, failover, retention, snapshot duration, and recovery, not just feature availability.

Cost comparisons should include downstream amplification. Capturing every intermediate update can create far more events than the final-state table contains, especially during bulk maintenance. Consumers that need only latest state may compact by key, while audit consumers retain the full sequence. One shared stream can support both if identities and positions remain intact.

Monitor source log lag, oldest required position, poll duration, rows scanned versus changed, cursor age, event throughput, snapshot progress, retry volume, and sink apply lag. A connector can be running while falling irrecoverably behind its source retention window.

Security and privacy follow the change stream. Logs may include values users did not expect outside the database, and before images can retain deleted personal data. Minimize captured columns where possible, encrypt transport and storage, restrict access, and propagate erasure to retained CDC archives under policy.

Test recovery by deliberately pausing beyond normal lag, rotating credentials, restarting during a snapshot, and failing between sink write and checkpoint. Verify whether replay duplicates, skips, or reorders changes. A happy-path latency test does not prove the resume protocol.

## Ordering and Schema Changes in CDC Streams

CDC events need enough order to reconstruct intended state. A source log position is usually safer than wall-clock timestamps because clocks can tie or skew. Ordering scope matters: one database instance may provide a total log order, while sharded databases or multiple sources provide only per-shard order.

Downstream consumers often need per-key ordering rather than a global sequence. If customer C42 is updated at positions 105 and 110, applying 110 before 105 can revert the row. Store the last applied source version per key and reject events whose position is not newer. This also makes redelivery idempotent.

Transactions can modify multiple keys. Preserving per-key order does not preserve atomic visibility across those rows. A transfer that debits one account and credits another can appear half-applied if a sink commits events separately. Consumers requiring transaction-level invariants need transaction markers, buffering, and an atomic sink operation or a modeled reconciliation strategy.

Partitions increase throughput but can reorder events. Hashing by stable primary key keeps one entity on one partition, preserving its sequence while parallelizing different keys. Changing partition count or key serialization can alter routing during migration. Coordinate cutovers or include versions so consumers handle both paths without inversions.

Tombstones must participate in ordering. An update at version 8 arriving after a delete at version 9 must not resurrect the row. Store delete state and last version, even if the visible record is removed. Retaining a compact tombstone through the maximum replay window protects against stale events.

Schema changes occur while streams are in flight. Adding a nullable column is usually compatible: old events omit it and new events carry it. Consumers must distinguish missing because the field did not exist from an explicit null when that difference matters. Include schema identifiers or versions with events.

Renaming a column can appear as drop plus add to name-based consumers. Stable field identifiers or a compatibility layer preserve identity. Type changes are more dangerous: widening may be safe, while narrowing, changing timestamp semantics, or converting strings to numbers can fail on historical events.

A schema registry or versioned event contract lets consumers decode each record with the writer schema and map it to a reader schema. Compatibility rules should run before producer deployment. Backward compatibility means new consumers can read old events; forward compatibility means old consumers can tolerate new events. Teams must define which direction their rollout requires.

Use expand-and-contract for breaking changes. Add the new field, dual-publish old and new representations, migrate and backfill consumers, then stop the old field after an agreed window. Do not change meaning under the same field name and type, because schema validators cannot detect semantic breakage.

Consumer rollout status is part of the contract. Record which applications have adopted the new schema and block contraction until every required consumer has migrated or been retired. A time-based deprecation deadline without usage evidence can break a forgotten but critical job.

Dead-lettering an undecodable schema event keeps the stream moving but can break per-key order. Later events for that key may depend on the failed change. A quarantine policy should record the blocked key and position, prevent unsafe advancement where required, and support ordered replay after the consumer is fixed.

Source DDL and data events may travel through separate channels or be observed in different order. A data event using a new column can arrive before the consumer installs its schema. Embed schema references and make schema retrieval durable and highly available. Consumers should retry unknown schema IDs rather than guessing.

Initial snapshots also have schema versions. If a table changes during a long snapshot, rows may have inconsistent shapes unless the source supplies snapshot isolation and a fixed schema view. Record snapshot schema and log position; apply later schema transitions in order during catch-up.

Ordering across disaster recovery deserves testing. A connector failing over to a replica may use a different position namespace. Map source epochs, transaction IDs, or monotonically increasing fencing generations so consumers do not compare unrelated offsets as if they shared one sequence.

Observability should include out-of-order rejects, duplicate positions, gaps, unknown schema IDs, decode failures, tombstone age, transactions waiting for completion, and consumer version distribution. A growing reject count can indicate partition routing changes rather than random duplicates.

The sink contract is the final authority. For latest-state replication, an upsert keyed by primary key with a source-version guard is often sufficient. For immutable history, append each uniquely identified change and derive state later. For transactionally coupled effects, preserve transaction groups. The CDC stream is useful only when its ordering and schema guarantees match what the sink assumes.

Maintain a reference replay test containing inserts, repeated updates, deletes, duplicate deliveries, out-of-order arrivals, transaction groups, and schema transitions. Rebuild an empty sink and compare exact expected state and history. This proves the combination of connector metadata and consumer logic, not merely either component alone.
