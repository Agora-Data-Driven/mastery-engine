**The big idea**: Building on the zones from *Pipeline Architecture* — raw is what makes a re-run *possible* — this lesson is about making a re-run *safe*. Duplicated execution is not an edge case, it is the steady state of distributed systems: queues deliver at-least-once, orchestrators retry, workers crash mid-commit, humans re-run yesterday after a fix. So you do not prevent re-execution, you make it harmless. Three pillars do it: idempotent **writes** (how), deterministic **partitioning** (where), and a deliberate choice of **how much** to recompute. The unifying test for any design: *if this job re-ran twice for the same slice, or re-ran for last Tuesday, would the target be byte-identical to the single-run, on-time world?*

**Key concepts**

- **Idempotent means f(f(x)) = f(x).** For pipelines: running a job N times over the same input leaves exactly the state one run would. Note what is *not* promised — that the job never re-runs. It will. *Why it matters:* a blind `INSERT INTO curated.orders SELECT …` doubles rows on every retry, and nothing errors. *Example:* the nightly aggregate for July 24 times out on the final commit acknowledgment, the orchestrator retries, and revenue reads **$214,882 instead of $107,441**. Appends give you no way to tell which copy is legitimate.

- **"Failed" usually means the write succeeded and the ack was lost.** This is why retries re-write rather than resume, and why the only durable defence is at the write path, not the retry policy.

- **Four shapes of idempotent write**, all reducible to *make the effect a function of the data, not of how many times it ran*:
  1. **Overwrite a deterministic target** — `curated.orders$20260724` with `WRITE_TRUNCATE`, or `DELETE FROM … WHERE day='2026-07-24'` then insert, in one job. Once or five times, the partition is identical.
  2. **Merge/upsert on a business key** — `MERGE … ON t.order_id = b.order_id WHEN MATCHED THEN UPDATE … WHEN NOT MATCHED THEN INSERT`. The key makes rows *converge* instead of accumulate.
  3. **Stage-and-swap** — build a temp table, validate, atomically replace the target or repoint a view. Re-runs just rebuild the temp.
  4. **Dedup windows** — a stable unique id the sink drops repeats on. BigQuery's streaming `insertId` is **best-effort over a short window**: duplicate *reduction*, not a guarantee. Strict correctness still needs a keyed `MERGE` or a `QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingest_time DESC) = 1` dedup downstream.

- **An idempotent write mode is necessary but not sufficient — the transform must also be deterministic.** A job that stamps `CURRENT_TIMESTAMP()`, samples with `RAND()`, reads mutable reference data "as of now", or calls an LLM produces different content each execution. Overwriting with it is still a changed table. Either derive from the input (use `event_time`, seed the sampler, snapshot reference data, cache model outputs by input hash) or accept and document the drift.

- **Deterministic partitioning answers *where*.** A scheme is deterministic when an element's partition is a pure function of its own data — `DATE(event_time)`, `ABS(FARM_FINGERPRINT(user_id)) % 64` — never of processing context: wall-clock time at load, arrival order, worker identity, batch number. *Why it is the other half:* overwrite-style writes only work if a re-run targets the same slice the original wrote. Combine the two and you get the property this course leans on — *re-running slice X rewrites exactly the partitions X maps to and touches nothing else.*

- **The canonical violation is ingestion-time partitioning for event data.** On the happy path it looks identical to event-date partitioning. Replay Monday's failed load on Wednesday and the rows land in Wednesday's partition: Monday stays wrong, Wednesday is polluted, and the overwrite has no correct slice to truncate. The output now depends on *when it ran*. *Example done right:* partition by `DATE(event_time,'UTC')`; on July 25 you backfill July 20–23 and each day maps to its own partition — the backfill cannot touch July 24–25.

- **`FARM_FINGERPRINT` is stable across runs and machines**, unlike an in-memory hash that varies per process. That stability is the entire reason it can be used for replayable bucketing: rebuilding bucket 17 affects exactly the users who hash to 17.

- **Full vs incremental refresh.** Full is `CREATE OR REPLACE TABLE … AS SELECT …` — brutally simple and **self-healing**, since whatever was wrong yesterday is rebuilt from scratch today. Incremental needs a **high-water mark**: record the max `updated_at` processed, then `WHERE updated_at > @wm`, transform the delta, apply it with an idempotent write. The two earlier pillars are what make incremental *safe* — without them, a retried incremental run corrupts both its target and its watermark.

- **The arithmetic forces the choice.** 2 TB of history growing 5 GB/day: a daily full refresh scans 2 TB × 365 ≈ **730 TB/year**, and the scan grows as history grows. Incremental scans ~5 GB/day plus merge overhead — roughly **400× less**. At a few dollars per TB scanned that is a rounding error versus a five-figure annual bill for one table.

**Rules to remember**

- Idempotent = same input, same result, any number of runs.
- Deterministic partition = pure function of the element's own data. If wall-clock or arrival order appears anywhere in the mapping, it is not deterministic.
- `DELETE WHERE day = X` is idempotent **only if the job writes all of day X**. A job owning half a partition that truncates all of it destroys its neighbour's data on every run.
- Cost pushes large pipelines to partition overwrite over `MERGE`: a `MERGE` against a multi-terabyte target rescans expensive data every run.
- Lookback windows are safe *because* the writes are idempotent — reprocessing overlap is harmless by construction.

**Common pitfalls**

- **Assuming an idempotent write mode is enough.** Non-deterministic content inside a deterministic write still changes the table.
- **Partitioning by a mutable attribute** (a user's *current* country), so history moves between partitions across runs. Partition by immutable event facts.
- **Timezone drift**: `DATE(event_time)` in one job and `DATE(event_time,'Asia/Manila')` in another silently assign a 23:30 UTC purchase to different days. Pick one convention (UTC by default) and enforce it in the contract.
- **Confusing deterministic with balanced.** One whale user can make bucket 17 ten times its peers. Fix skew with a better key or more buckets — *never* by assigning overflow "wherever there is room", which reintroduces nondeterminism.
- **Four ways incremental silently rots**: an unreliable `updated_at` (bulk fixes that do not touch it are permanently skipped); clock skew and in-flight transactions (a row committed at 10:00:00 becoming visible after the watermark passed 10:00:00 falls in the gap — insure with a lookback window); **deletes are invisible** (a deleted row just stops appearing, so no `updated_at` filter can ever select it — you need soft deletes or CDC); and drift that compounds over months.
- **Dumping late data into today's partition.** An event for July 20 arriving July 25 still maps to `$20260720`; handle it by re-running recent partitions on a lookback schedule.

**How to approach the questions**

1. For any "did this corrupt the data?" scenario, apply the test: would a second run of the same slice leave the target byte-identical? Then check *both* halves — the write mode *and* the determinism of the content.
2. If a question mentions a retry, an outage replay, or a backfill, look for ingestion-time partitioning. It is the single most common planted flaw.
3. On full vs incremental, the discriminators are **volume** (does a full scan cost real money?), **self-healing** (must errors not persist?), and **incrementalizability** (global dedup, window functions over all history, and top-K over all time cannot be computed from a delta alone).
4. Treat **hybrid** as the professional default for large important tables: incremental daily for cost, plus a scheduled full refresh or reconciliation diff that bounds how wrong the table can silently become.

**Where this leads**: with replayable slices established, **Batch Processing and the Beam Model** gives you the execution engine that runs them — and the shuffle, which is where the money goes.
