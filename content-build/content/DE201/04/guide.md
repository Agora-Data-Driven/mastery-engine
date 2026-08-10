**The big idea**: **Compaction: Merging Files Without Breaking Readers** assumed something could swap a metadata pointer atomically and hand every reader a whole snapshot. This lesson is the reason that assumption needs a mechanism. An object store *looks* file-like because keys are path-shaped, but its operational model is different: whole objects, immutable in practice, a namespace with no real directories, listing that is a paginated enumeration rather than a directory snapshot, and rename implemented as copy-then-delete. The single sentence that carries the whole lesson: **strong consistency for individual keys does not imply atomicity across a dataset.** Everything else — manifests, conditional writes, snapshots, checksums — exists to bridge that gap.

**Key concepts**

- **A file system has directories; an object store has a flat key namespace with prefixes.** A key like `events/date=2026-01-01/part-0001.parquet` looks like a path, but the slashes are usually just characters interpreted as a prefix, not real parent directories that exist as entries.
- **The operations are whole-object.** Put an object, get it, read a **byte range**, inspect metadata, list keys by prefix, delete. Some services add multipart upload or conditional writes. **Arbitrary in-place byte updates are not the model**, so changing a Parquet file means writing a new object rather than editing its footer.
- **That favours immutability, and immutability buys real properties.** Writers create unique keys containing a run id, content hash, or generated identifier; once published, an object is never modified and a new version takes a new key. This makes caching, retries, checksums and concurrent reads safe **because a key's content cannot change underneath a reader**.
- **Rename is not a namespace update.** It is typically copy-to-new-key then delete-old-key. For a 500 GB object that transfers or internally copies the data, creates a window where both keys exist, and can fail between the two steps. **Any algorithm that writes `file.tmp` and renames it atomically into place needs a different publication mechanism here.**
- **Listing is not a directory snapshot.** It can require paginated requests, take time proportional to object count, and return only key metadata. A prefix holding ten million objects is expensive to enumerate even when the query needs ten files — and directory-style partition layouts trigger many nested prefix listings during planning.
- **When membership matters, use a manifest or catalog.** A manifest names the exact data objects of one committed version, with checksums, partitions, statistics and perhaps row counts. Readers load a small authoritative structure instead of **inferring table state from whatever objects happen to share a prefix**.
- **Why a `_SUCCESS` marker is not enough.** A batch writes 1,000 objects; a reader listing mid-batch may see 400, 900 or all of them — even under strong list consistency — because the *logical* batch is incomplete. `_SUCCESS` signals completion but does not say which 1,000 files belong to the batch, does not verify them, and does not coordinate concurrent batches. A manifest does all three.
- **Append changes meaning.** Appending records to a local file is cheap; repeatedly replacing a growing object causes rewrite amplification and concurrency hazards. Object-store pipelines write **immutable segments** and compact later, so a log's logical append is a metadata addition of a new segment, not a byte append.
- **Range reads are what make columnar formats practical here.** An engine fetches a footer, inspects row-group metadata, and requests selected byte ranges without downloading the object. Thousands of tiny objects destroy that advantage, because opening each object dominates.
- **Prefix-shaped permissions are not directory inheritance.** Policy may apply at bucket, prefix, key or external-catalog level, and copying data to another prefix may change its effective policy. Encryption keys, object tags, retention locks and legal holds are object-level concerns a path abstraction hides.
- **Cost is part of the semantics.** Stores charge or throttle **requests**, retrieval, egress, and sometimes early deletion from archive tiers. An algorithm issuing millions of HEAD or LIST calls can be expensive while reading almost no bytes — so measure request count alongside bytes scanned.
- **A single PUT is atomic; a batch of them is not.** A completed object is published whole or not at all, and multipart upload keeps parts private until completion. But write ten outputs separately and a reader can observe the prefix after five are committed. **Each object operation is consistent while the logical batch is incomplete.**
- **Overwriting a fixed key loses updates even under strong consistency.** Two writers read pointer `V1`, independently create `V2` and `V3`, and both overwrite `current.json`. Last writer wins and one update is gone. A **conditional write** on an entity tag or generation implements compare-and-swap: publish `V2` only if `current.json` still equals the version read at planning time.
- **Delete-then-recreate is not an atomic replacement.** A reader may see no object between the operations, or hold cached metadata. Versioned keys plus a small pointer avoid the gap: write all immutable data and metadata first, validate, then conditionally switch the pointer. Readers holding the old pointer finish on the old snapshot.
- **Multi-object atomicity needs a metadata layer.** A table snapshot records the exact file set, and the commit atomically changes **one** authoritative reference while the large data objects stay immutable. That is the foundation of open table formats: object storage holds files; table metadata supplies transactions, conflict detection, snapshots and garbage-collection reachability.
- **The compactor, told precisely.** Replacing A and B with C by deleting A, deleting B and putting C exposes states with **missing rows**; putting C first exposes **duplicate rows** if a reader also sees A and B. A snapshot commit creates C privately, then publishes metadata whose active set removes A and B and adds C — so readers see `{A,B}` or `{C}`, never a mixture.
- **Retries must distinguish object creation from logical commit.** A timeout after uploading an immutable object is recoverable: retry the same **deterministic key** and verify the checksum to reuse it. A timeout during the *pointer update* is not — the client must read the pointer to learn whether the conditional commit succeeded. **Blind retries create duplicate snapshots or overwrite newer state.**
- **Locks stored as ordinary objects are fragile.** A client can pause past its lease, another acquires the lock, and the first resumes believing it still holds it. **Fencing tokens** let downstream commits reject a stale holder. Optimistic compare-and-swap usually avoids global locks, but overlapping data changes still need conflict rules.
- **Wall-clock time is not a safe ordering source.** Machines skew and two commits can share a timestamp. Order by metadata sequence numbers, unique snapshot ids, or conditional parent references; timestamps stay useful as descriptive fields and must not be the concurrency guard.
- **Listing must not decide what is committed.** Orphans remain after failed jobs, files from later transactions share prefixes, and a legitimate table can reference objects across several prefixes. **Garbage collection starts from retained manifests** and removes unreachable objects after a safety delay — it never deletes everything absent from the latest prefix scan.
- **Caching is a separate layer with its own staleness.** A store may publish a new object strongly while a CDN, a query-engine metadata cache, or an application cache still holds the old pointer. Versioned immutable URLs remove content ambiguity, and pointer caches need bounded lifetimes or explicit invalidation. **Diagnose the whole read path before blaming the store's consistency.**
- **Replication and archive restores have their own visibility.** A transaction committed in the primary region may be unusable in a replica whose data files have not arrived. Disaster-recovery design must ensure **metadata never advances beyond the available replicated objects**, or publish region-specific readiness pointers.
- **Checksums guard a different boundary than consistency.** A reader can *consistently* retrieve the wrong artifact because the metadata references an incorrect key. Validate object length and checksum against the manifest before accepting critical data, and **quarantine mismatches** rather than retrying forever against a bad reference.

**Rules to remember**

- Strong per-key consistency ≠ atomicity across a dataset. Everything in this lesson follows from that.
- Objects are immutable in practice. New content means a new key.
- Rename = copy + delete. Never build a publication protocol on it.
- Listing is enumeration, not membership. Manifests define membership.
- Conditional write on etag/generation = compare-and-swap. That is how a pointer moves safely.
- Uploads are retryable against a deterministic key; pointer commits are not blindly retryable.
- Order by sequence numbers or snapshot ids, never by wall-clock time.
- GC starts from retained manifests, plus a safety delay.
- Measure requests, not only bytes.

**Common pitfalls**

- **Treating a prefix as a directory.** It has no atomic rename, no cheap snapshot listing, no inheritance guarantees, and no membership semantics.
- **Publishing with `_SUCCESS`.** It answers "did the job finish" and nothing about which files, whether they are valid, or what a concurrent batch wrote.
- **Overwriting `current.json` unconditionally.** Two writers, last-writer-wins, one update silently gone — even with perfect consistency underneath.
- **Deleting the old data before publishing the new.** There is now a window where the table has missing rows, and any reader in it gets a wrong answer rather than an error.
- **Blindly retrying after a commit timeout.** The commit may have landed; the retry then overwrites newer state or creates a duplicate snapshot. Read the pointer first.
- **Using an object as a lock.** Without fencing tokens a paused client resumes and writes as though it still owns the lease.
- **Ordering commits by timestamp.** Skew and ties are not rare at scale, and the failure is a silently wrong history.
- **Garbage-collecting by prefix scan.** It deletes orphans *and* files a retained snapshot still needs — and the second kind is unrecoverable.
- **Blaming the store for a stale read.** Check the CDN, the engine's metadata cache and the application cache before the object store.
- **Testing against a local emulator.** It answers listings cheaply and makes rename look native, which hides every effect in this lesson. Integration tests need the real API with pagination, conditional requests, multipart completion, credentials and realistic object counts.

**How to approach the questions**

1. Ask whether the scenario is about *one key* or *many*. Per-key guarantees are usually strong; the bug is nearly always at the dataset level.
2. For any publication protocol, trace what a reader sees at each intermediate step. If any step exposes missing or duplicated rows, the protocol is wrong regardless of how it recovers.
3. When two writers appear, look for a conditional write. Unconditional overwrite of a shared pointer is the standard wrong answer.
4. Separate "the upload failed" from "the commit acknowledgement was lost" — they have different, non-interchangeable recoveries.
5. Anything relying on rename being atomic, or listing being a snapshot, is a distractor built on file-system intuition.
6. For garbage collection, the correct answer always starts from retained metadata and adds a safety delay.

**Where this leads**: every fix in this lesson pointed the same way — immutable data objects plus one authoritative, atomically-swapped metadata reference. The next lesson, **Open Table Formats**, is that layer built properly: Iceberg and Delta, the metadata tree that adds ACID to object storage, snapshots and time travel, safe schema evolution, backfills on immutable snapshots, and the atomic rebuild-and-swap that makes an index cutover a single instant.
