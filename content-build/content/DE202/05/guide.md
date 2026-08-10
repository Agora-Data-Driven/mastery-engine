**The big idea**: Streaming Semantics assumed events arrive as a stream. CDC is how a database that was never designed to emit events becomes one — by turning committed mutations into an ordered change stream. It looks simple and is not, because four boundaries have to be made explicit: **where** changes are observed (the log or a poll), whether **deletes** are visible at all, how the initial **snapshot** joins the live stream without a gap or an overwrite, and what happens when **order or schema** shifts underneath you. Every duplicate, ordering and idempotency problem from the previous lesson reappears here, now with a version number attached to each row.

**Key concepts**

- **Log-based CDC reads what the database already writes.** The transaction log / WAL / replication stream exists for recovery, so a connector can decode inserts, updates and deletes without scanning application tables. The **log position** is both a resume point and an ordering authority, and it usually preserves commit order within its documented scope. An event can carry before *and* after values, changed fields, transaction identity, source table, key, commit timestamp and log sequence position.

- **Log-based capture is the only one where deletes come for free.** The log records the deletion even though the row is gone from the table. Transaction boundaries also survive, so a consumer can apply several row changes atomically — or at least know they belong together.

- **Its cost is operational coupling.** Connectors need replication privileges, log retention long enough to survive an outage, and compatibility with the database version. *Consequence:* **a consumer that falls behind past log retention cannot resume — it needs a whole new snapshot.** A connector can be running happily while falling irrecoverably behind.

- **Query-based CDC polls for rows changed since a cursor** (`updated_at`, an increasing ID, a change-tracking table). Easier to adopt through ordinary SQL credentials when log access is unavailable, at the price of recurring query load and much weaker visibility.

- **A naïve `updated_at > last_seen` predicate loses rows.** Two transactions can share a timestamp, and a late commit can land below the stored cursor — the same gap you met with watermarks in lesson 2. *Fix:* a **composite cursor** `(updated_at, primary_key)` compared lexicographically, plus an overlapping safety interval, deduplicated on stable change identities.

- **Polling misses intermediate states by construction.** If a row goes A → B → C between polls, the query returns only C. That is fine for latest-state replication and useless for an audit stream or for side effects that need B. A source-maintained change table preserves transitions, at the cost of write complexity.

- **Deletes need an explicit mechanism in query-based capture** — soft-delete flags that keep tombstoned rows queryable, a separate deletion log of keys, or a periodic full comparison (expensive and delayed). Without one, downstream state quietly accumulates rows that no longer exist upstream.

- **The snapshot-to-stream handoff must have neither a gap nor a bad overwrite.** The log-based pattern: record position L, take a consistent snapshot corresponding to L, replay everything after L. Overlap is harmless *if* keys are stable and writes are idempotent upserts. The dangerous direction is a snapshot row landing **after** a newer change and overwriting it — which is why sinks need source positions or versions to reject stale writes.

- **Per-key ordering is what downstream consumers actually need**, not a global sequence. *Example:* customer C42 updated at positions 105 and 110 — applying 110 before 105 reverts the row. Store the **last applied source version per key** and reject anything not newer. That single rule also makes redelivery idempotent, which is the effectively-once pattern again.

- **Per-key order does not give transactional atomicity.** A transfer debiting one account and crediting another can appear half-applied if the sink commits the two events separately. Consumers needing transaction-level invariants require transaction markers, buffering, and an atomic sink operation — or a modelled reconciliation strategy.

- **Tombstones must participate in ordering.** An update at version 8 arriving after a delete at version 9 must not resurrect the row. Store the delete state and last version even though the visible record is gone, and retain a compact tombstone through the maximum replay window.

- **Schema changes happen while the stream is in flight.** Adding a nullable column is usually compatible — old events omit it, new ones carry it — but consumers must distinguish *missing because it did not exist* from *explicitly null* when that difference matters. A rename looks like drop-plus-add to a name-based consumer, so use stable field identifiers. Type changes are the sharpest edge: widening may be safe, while narrowing, changing timestamp semantics, or string-to-number conversion can fail on historical events.

- **Backward vs forward compatibility is a direction you must choose.** Backward = new consumers can read old events. Forward = old consumers tolerate new events. Which one your rollout needs depends on whether producers or consumers deploy first.

- **Expand-and-contract is the safe path for a breaking change**: add the new field, dual-publish both representations, migrate and backfill consumers, then drop the old field after an agreed window. **Never change meaning under the same field name and type** — schema validators cannot detect semantic breakage.

**Rules to remember**

- Log position beats wall-clock timestamps for ordering: clocks tie and skew.
- Ordering scope is a property of the source. One instance may give a total log order; sharded sources give only per-shard order.
- Hash-partition by stable primary key to keep one entity on one partition — that preserves its sequence while parallelizing different keys.
- Contraction is blocked by **consumer rollout evidence**, not by a calendar date. A time-based deprecation without usage data breaks a forgotten but critical job.
- The sink contract is the final authority: latest-state → upsert by PK with a source-version guard; immutable history → append each uniquely identified change and derive state later; transactional effects → preserve transaction groups.

**Common pitfalls**

- **Polling without an index on the cursor column.** Every poll scans the whole source and competes with application traffic. Watch explain plans and source CPU as the table grows, and throttle before polling threatens transactional latency.
- **Assuming a running connector is a healthy one.** Monitor source log lag, oldest required position, poll duration, rows scanned vs changed, cursor age, snapshot progress and sink apply lag.
- **Ignoring downstream amplification.** Capturing every intermediate update can produce far more events than the final table holds — bulk maintenance is the classic spike. Latest-state consumers can compact by key while audit consumers keep the full sequence; one stream serves both *if* identities and positions stay intact.
- **Changing partition count or key serialization mid-flight.** Routing changes and events reorder. Coordinate the cutover or carry versions so consumers handle both paths without inversions. A rising out-of-order reject count usually means routing changed, not that duplicates appeared.
- **Dead-lettering an undecodable event and moving on.** That keeps the stream flowing but breaks per-key order — later events for that key may depend on the failed change. The quarantine policy has to record the blocked key and position and support ordered replay after the fix.
- **Guessing at an unknown schema ID.** Data and DDL can travel through different channels, so an event using a new column can arrive before the consumer has the schema. Embed schema references, make retrieval durable and highly available, and **retry** rather than guess.
- **Forgetting privacy follows the change stream.** Logs can expose values users never expected to leave the database, and before-images retain deleted personal data. Minimize captured columns, encrypt transport and storage, restrict access, and propagate erasure into retained CDC archives.
- **Proving correctness with a happy-path latency test.** That proves nothing about the resume protocol.

**How to approach the questions**

1. If a question turns on deletes, intermediate states, or transaction boundaries, the answer is log-based. If it turns on restricted source access, modest volume, or latest-state sync, polling is legitimate.
2. For "the row came back after we deleted it" or "the update was reverted", look for a missing per-key version guard. Storing the last applied position per key and rejecting non-newer events solves both.
3. For snapshot questions, check the direction of the overwrite: overlap is safe with idempotent upserts; a snapshot row overwriting a newer change is the failure.
4. For schema questions, decide the compatibility *direction* first, then test the change against it. "Adding a nullable column" is the standard safe answer; renames and narrowing types are the standard traps.
5. Keep a reference replay test in mind as the model answer: inserts, repeated updates, deletes, duplicate deliveries, out-of-order arrivals, transaction groups and schema transitions, rebuilt into an empty sink and compared exactly. It proves connector metadata *and* consumer logic together — neither alone is enough.

**Where this leads**: you now have pipelines that are replayable, streamable and change-driven. The last lesson, **Orchestration and Pipeline Operations**, is what runs them on a schedule, retries them safely, gates their output, and ships changes to them without breaking history.
