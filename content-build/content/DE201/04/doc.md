Object storage looks file-like because applications use path-shaped keys, but its operational model is different from a mounted file system. The distinction matters whenever a pipeline lists data, renames outputs, coordinates writers, or tries to publish a consistent table. Reliable systems build around immutable objects and explicit metadata rather than assuming directory and transaction semantics that are not present.

## Object Stores vs File Systems: Immutability and Listing

A file system exposes files inside directories, commonly with operations such as open, append, rename, list, and modify bytes at an offset. A local or distributed file system maintains a hierarchical namespace with directory entries. An object store exposes whole objects addressed by keys inside a bucket or container. A key like `events/date=2026-01-01/part-0001.parquet` resembles a path, but its slashes are usually characters interpreted as prefixes rather than real parent directories.

Object operations commonly include put a whole object, get it, read a byte range, inspect metadata, list keys by prefix, and delete. Some services support multipart upload or conditional writes, but arbitrary in-place byte updates are not the normal model. Changing a Parquet file generally means writing a new object, not editing its footer in place.

This favors immutability. Writers create unique object names containing a run ID, content hash, or generated identifier. Once published, an object is not modified; a new version uses a new key. Immutable objects simplify caching, retries, checksums, and concurrent reads because a key's content does not change underneath a reader.

An object-store "rename" is often implemented as copy to a new key followed by deletion of the old key. For a 500-gigabyte object, that is not a cheap constant-time namespace update. It transfers or internally copies data, creates a period when both keys may exist, and can fail between steps. Algorithms that write `file.tmp` and rename it atomically into place need a different publication mechanism.

Listing is not equivalent to reading a directory snapshot. It can require paginated requests, consume time proportional to object count, and return only key metadata. A prefix containing ten million objects may be expensive to enumerate even when a query needs ten files. Directory-style partition layouts can also trigger many nested prefix listings during planning.

Use manifests or catalogs when a dataset's membership matters. A manifest lists the exact data objects, checksums, partitions, statistics, and perhaps row counts for one committed version. Readers load a small authoritative metadata structure instead of inferring table state from whatever objects happen to share a prefix.

Suppose a batch writes 1,000 data objects. A reader that lists the output prefix during the batch might observe 400, 900, or all objects depending on timing, even under strong list consistency, because the writer has not completed the logical batch. A final `_SUCCESS` marker signals completion but does not itself list which 1,000 files belong to the batch, verify them, or coordinate concurrent batches. A manifest does.

File append also changes meaning. Appending log records to one local file can be efficient, while repeatedly replacing a growing object causes rewrite amplification and concurrency hazards. Object-store pipelines instead write immutable segments and compact them later. A log's logical append is a metadata addition of a new segment, not a byte append to an existing object.

Range reads make columnar formats practical on object storage. An engine can fetch a footer, inspect row-group metadata, and request selected byte ranges without downloading the entire object. Good file sizing balances request overhead with parallelism and pruning. Thousands of tiny objects lose this advantage because opening each object dominates.

Permissions may apply at bucket, prefix, key, or external catalog layers. Prefix-shaped policy is convenient but should not be confused with directory inheritance. Moving data by copying to another prefix may change its effective policy. Encryption keys, object tags, retention locks, and legal holds are also object-level concerns that a simple path abstraction can hide.

Costs are part of semantics in practice. Object stores charge or limit requests, retrieval, egress, and sometimes early deletion from archive tiers. An algorithm issuing millions of HEAD or LIST requests can be expensive even if it reads few bytes. Storage design should measure request count along with data scanned.

Local development can conceal these effects because an emulator or mounted adapter answers listings cheaply and makes rename appear native. Integration tests should run against the real API behavior with pagination, conditional requests, multipart completion, credentials, and realistic object counts. Performance and correctness assumptions belong in those tests.

The reliable mental model is an immutable key-value namespace with whole-object operations and prefix enumeration. Libraries may expose a familiar file API, but engineering decisions should still account for copy-based renames, paginated listings, request costs, and explicit dataset metadata.

## Consistency and Atomicity Limits of Object Storage

Consistency describes what a read or list can observe after an operation. Atomicity describes whether a set of changes appears all at once. Modern object stores may provide strong read-after-write and listing consistency for individual object operations, but that does not turn a group of 1,000 puts and 500 deletes into one atomic table transaction.

A single PUT is normally published as a complete object or fails; readers should not see half of that completed object. Multipart upload keeps parts private until completion. However, if a job writes ten outputs separately, another reader can observe a prefix after the first five are committed. Each object operation is consistent while the logical batch is incomplete.

Overwriting a fixed key creates coordination problems even with strong consistency. Two writers read pointer value V1, independently create V2 and V3, then both overwrite `current.json`. Last writer wins, potentially losing one update. A conditional write using an entity tag or generation can implement compare-and-swap: publish V2 only if `current.json` still equals the version read during planning.

Delete and recreate is not an atomic replacement protocol for a dataset. A reader may see no object between operations or may hold cached metadata. Versioned keys plus a small pointer avoid the gap: write all immutable data and metadata first, validate them, then conditionally switch the pointer. Readers that captured the old pointer finish on the old snapshot.

Multi-object atomicity needs a metadata layer or transaction service. A table snapshot records the exact file set. The commit atomically changes one authoritative metadata reference, while large data objects remain immutable. This is the foundation used by open table formats: object storage holds files, and table metadata supplies transactions, conflict detection, snapshots, and garbage-collection reachability.

Consider a compactor replacing files A and B with C. Deleting A, deleting B, and putting C exposes states with missing rows. Putting C first exposes duplicate rows if a reader also sees A and B. A snapshot commit creates C privately, then publishes metadata whose active set removes A and B and adds C. Readers see either `{A,B}` or `{C}`.

Retries must distinguish object creation from logical commit. If a timeout occurs after uploading an immutable object, retrying the same deterministic key can verify its checksum and reuse it. If a timeout occurs during pointer update, the client must read the pointer to learn whether the conditional commit succeeded before attempting another change. Blind retries can create duplicate snapshots or overwrite newer state.

Distributed locks stored as ordinary objects can be fragile. A client may pause beyond a lease, another client acquires it, and the first resumes believing it still owns the lock. Fencing tokens let downstream commits reject stale lock holders. Optimistic compare-and-swap often avoids global locks, but overlapping data changes still require conflict rules.

Clock time is not a safe source of transaction order across distributed writers. Machines can skew, and two commits can share timestamps. Use metadata sequence numbers, unique snapshot IDs, or conditional parent references. Timestamps remain useful descriptive fields but should not be the sole concurrency guard.

Listing should not decide which objects are committed. Orphan data can remain after failed jobs, and files from later transactions may share a prefix. Conversely, a logical table can legitimately reference objects across multiple prefixes. Garbage collection starts from retained manifests and identifies unreachable objects after a safety delay; it does not delete everything absent from the latest prefix scan.

Caching introduces another layer. A service may strongly publish a new object while a CDN, query-engine metadata cache, or application cache still holds the old pointer. Versioned immutable URLs avoid content ambiguity, and pointer caches need bounded lifetimes or explicit invalidation. Diagnose the entire read path before blaming the underlying store's consistency.

Cross-region replication and archive restores can have separate visibility and recovery properties. A transaction committed in the primary region may not be immediately usable in a replica if referenced data files have not arrived. Disaster-recovery design should validate that metadata never advances beyond available replicated objects, or should publish region-specific readiness pointers.

Checksums protect a different boundary from consistency. A reader may consistently retrieve the wrong artifact because metadata references an incorrect key. Validate object length and checksum against the manifest before accepting critical data, and quarantine mismatches instead of retrying indefinitely against the same bad reference.

Test failure windows deliberately: crash after some uploads, after all uploads, before pointer commit, during conditional commit, and after commit but before acknowledgement. Verify that readers see a complete old or new snapshot, recovery is idempotent, and orphan cleanup cannot delete retained data. Consistency claims become trustworthy only when the multi-step protocol is tested.

The essential distinction is simple: strong consistency for individual keys does not imply atomicity across a dataset. Use immutable versioned objects, checksums, manifests, conditional pointer updates, and retained snapshots. Those mechanisms turn object-store primitives into a reliable analytical publication protocol.
