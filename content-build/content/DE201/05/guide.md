**The big idea**: **Consistency and Atomicity Limits of Object Storage** ended with a prescription — immutable data objects plus one authoritative reference, swapped conditionally. An open table format is that prescription built properly. Iceberg and Delta add a transactional **metadata layer** above immutable files so engines agree on membership, history, schema and conflict rules without pretending thousands of objects can change at once. And the same publish-by-pointer pattern explains three things that look unrelated: snapshots and time travel, safe backfills, and the index rebuild-and-swap your search stack already needs. One principle underneath all of them: **build immutable state privately, validate it, then publish by changing a small authoritative reference atomically.**

**Key concepts**

- **The metadata identifies the table; the prefix does not.** Iceberg and Delta manage tables whose data usually lives in Parquet, and their metadata records the active files, schema, partitioning, statistics and snapshot history. **Readers consult that metadata instead of listing a prefix and guessing.**
- **Atomicity comes from committing a small state change after the data is already written.** A writer plans from snapshot S10, produces new immutable files, and attempts to publish S11. Readers holding S10 keep using its files; new readers get S11 after the commit. Nobody observes half the new file set.
- **Consistency and isolation come from conflict handling.** Two append-only writers may both commit when their changes are compatible and the format can rebase or serialise them. Two writers rewriting the same partition or rows **should conflict** rather than silently losing data. Optimistic concurrency validates the planning assumptions at commit time and forces a retry when another transaction invalidated them.
- **Durability still spans both layers.** A commit is useful only if every file in the snapshot is readable and protected from premature cleanup. Object checksums, write completion, catalog durability and DR replication remain **operational responsibilities** even when the format supplies ACID.
- **The metadata itself has layers, because one pointer object cannot hold every file.** Iceberg commonly uses snapshots → manifest lists → manifests; Delta records ordered transaction-log actions plus **checkpoints** so readers need not replay an unbounded log. Physically different, logically the same: membership is explicit and reconstructable. And metadata needs maintenance alongside data compaction — rewrite oversized manifests or create checkpoints based on **measured planning cost**, while retaining every reference protected snapshots need.
- **Format support and engine support are different things.** A feature in the specification may not be implemented consistently across every reader and writer, so compatibility testing must cover the actual engine versions in production.
- **Table-level ACID is not workflow-level ACID.** Updating facts and dimensions in separate commits exposes mismatched versions. Use an orchestration manifest, a higher-level transaction service where one exists, or publish a **dataset-level pointer only after all component snapshots are ready**.
- **A snapshot is an immutable description of table state at a commit** — active data and delete files, plus parent snapshot, timestamp, operation and summary. The parent chain is what lets a reader query a specific version long after later commits moved current state.
- **Time travel by snapshot ID beats time travel by timestamp.** A timestamp lookup picks the latest snapshot committed before an instant and therefore depends on commit clock semantics; a **snapshot ID or sequence number identifies an exact state**. Record the ID in model and report lineage.
- **History is not backup.** Expiring snapshots removes metadata references, and garbage collection can then delete the files. Retention must cover maximum query duration, rollback needs, audit obligations and downstream reproducibility — **a job pinned to an expired snapshot fails once its files are collected.** Where branches and tags exist, a backfill can build on a branch and be promoted after validation, and a tag can protect an important training snapshot from ordinary expiry; governance then has to stop forgotten branches retaining sensitive data forever.
- **Schema evolution depends on stable field IDs.** A robust format identifies a column by ID, so renaming changes the display name rather than making old data appear under a new, unrelated field. **Adding a nullable column is usually safe**; adding a *required* column with no value for historical rows is breaking unless a backfill and staged enforcement establish completeness first.
- **Renames are safe only for ID-aware readers.** Name-only tools treat the new name as a different column. Dropping a column is **logically breaking for consumers** even though the bytes remain in old files — so inventory downstream queries, publish a deprecation, migrate consumers, and wait out a defined window before removing it.
- **Type compatibility is semantic, not syntactic.** Widening an integer is compatible when every value maps exactly; narrowing risks overflow; string-to-number fails on historical values; and a timestamp change can alter timezone or precision *meaning* even where the engine allows the cast.
- **Never recycle a stable identifier.** Reordering columns should not matter to ID-aware readers but breaks positional exports and code. Reusing a dropped **name or field ID** for a new meaning is worse — old files get misinterpreted, silently.
- **Expand and contract is the migration shape:** add the new field, write both forms, backfill, validate, migrate readers, stop writing the old field, then remove it after the compatibility window. Contract tests across *all* production engines catch assumptions one client alone hides.
- **A safe backfill never mutates active files gradually.** It writes the replacement dataset or affected partitions as **new immutable files**, validates them, and publishes one snapshot commit.
- **Pin the input snapshot, or the scope is a moving target.** A six-hour job reading a live table will see different source states at its start and end. Pin input snapshot IDs, record the transformation code, configuration and target partitions, and handle data that arrives meanwhile in a **separate catch-up step**.
- **Make reruns recognisable.** Unique staging paths and deterministic job identifiers let a rerun detect already-written outputs by checksum instead of duplicating them. Outputs stay invisible until a committed snapshot references them, so **a failed job leaves orphans, never partial table state.**
- **Validate by comparing snapshots, not by demanding byte equality.** Row counts, unique keys, null rates, distributions, partition coverage, business totals, referential integrity and targeted samples — with the **expected deltas encoded**, because some differences are the point of the backfill.
- **The commit re-checks the assumptions.** If another writer modified a backfilled partition after planning, fail and rebase rather than overwriting newer data; appends outside the scope may be perfectly compatible. **Conflict rules must match the logical operation, not merely whether file names differ.**
- **Rollback is a metadata operation.** Retain the old snapshot, monitor queries after publication, and switch metadata back to a known state if needed — no terabytes are copied. Garbage collection waits until the rollback and active-reader windows expire. For very large backfills, staged partition commits reduce transaction size and expose **mixed logic**, so a dataset-level version column or a final view pointer must hide incomplete generations until every partition is ready.
- **An index rebuild is the same mechanism with different nouns.** Rather than updating every document in a live index during a schema, analyzer, embedding or scoring change, build a **new index under a versioned name** while the old one serves traffic. The rebuild pins its corpus snapshot and transformation versions, writes all documents, and validates counts, mappings, sample queries, latency and relevance before anything switches.
- **The alias is the pointer.** `knowledge_current` → `knowledge_2026_07_v4`. An atomic alias update sends new requests to the new index while in-flight requests finish against the old one, and clients never learn physical names.
- **Write routing needs its own decision.** Switching the *read* alias while writers still target the old index causes divergence. The options are dual writing during migration, pausing writes for a final catch-up, replaying an ordered change log, or atomically switching **both** aliases — and each needs an idempotent sequence position.
- **Rollback needs the surrounding state to agree.** Keep the old index for a safety period; caches and reranker feature stores must be version-compatible, so **cache keys should include the physical generation or scoring version** or stale results survive the swap. Delete the old index only after the rollback window, under a controlled retention policy.

**Rules to remember**

- Membership is metadata. Never infer a table from a prefix listing.
- Commit = one small authoritative reference change, after immutable data is written and validated.
- Optimistic concurrency: validate planning assumptions at commit, retry on conflict.
- Time travel by **snapshot ID**, not timestamp. Record it in lineage.
- Snapshot retention ≥ longest query + rollback + audit + reproducibility needs.
- Add nullable = safe. Add required, drop, narrow, or recycle an ID = breaking.
- Expand and contract, with a compatibility window and contract tests per engine.
- Backfills pin an input snapshot, stage outputs, validate against the old snapshot, commit once.
- Rollback is a pointer move, not a restore.
- Read alias and write alias are two decisions. Cache keys carry the generation.

**Common pitfalls**

- **Assuming table ACID makes a multi-table workflow atomic.** Facts and dimensions committed separately give consumers a mismatched pair, and no format prevents it.
- **Letting metadata grow unmaintained.** Planning cost rises quietly until a query spends longer planning than scanning. Compaction has a metadata twin.
- **Pinning an experiment to a timestamp.** Two commits can share one, and the resolution rule depends on clock semantics. Pin the ID.
- **Treating snapshot history as a backup.** Expiry plus garbage collection deletes the files, and the pinned job fails at read time rather than at expiry time.
- **Renaming a column and testing with one engine.** A name-only reader silently treats it as a different column, so the old one reads as absent.
- **Reusing a dropped field ID or name.** Old files are then decoded as the new meaning, with no error anywhere.
- **Backfilling by overwriting partitions in place.** Readers see a mixture of old and new logic, and a failure leaves the table in a state nobody designed.
- **Validating a backfill by byte equality.** The backfill exists to change values; encode the expected deltas instead.
- **Switching the read alias and leaving writes on the old index.** The two generations diverge immediately, and the divergence is invisible until someone queries for a recent document.
- **Deleting the old index or old snapshot at cutover.** That converts a one-line rollback into an emergency rebuild.

**How to approach the questions**

1. For any commit question, separate *writing data* from *publishing it*. Almost every correct answer writes and validates first, then changes one reference.
2. For schema changes, ask whether an ID-aware reader and a name-only reader would agree. Where they diverge, the change is breaking in practice.
3. For time travel, prefer the deterministic identifier. A question that mentions clocks is usually testing exactly that.
4. For backfills, look for a pinned input snapshot and a separate catch-up path. Without them the scope is undefined regardless of how careful the rest is.
5. For alias swaps, check that write routing was addressed and that caches key on the generation. Read-side-only answers are incomplete.
6. Watch for anything that deletes the previous generation at cutover — it is the single most common wrong option in this lesson.

**Where this leads**: you now have a table that behaves transactionally over object storage, with history you can query and a cutover you can undo. What comes next is what flows *into* it — the pipeline patterns that produce these commits: idempotent reruns, replay, change data capture and orchestration, all of which assume exactly the publish-by-pointer discipline this lesson established.
