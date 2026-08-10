**The big idea**: Every previous lesson made a single pipeline *correct*. This one makes a fleet of them *dependable*. Orchestration schedules work, enforces dependencies, records attempts, coordinates backfills and blocks publication when validation fails. Note what it does **not** do: an orchestrator never makes a task correct. It makes contracts, retries, versions and failure states **explicit** — and every mechanism here is really a way of separating three things that a careless release fuses into one irreversible event: *shipping code*, *computing history*, and *making data visible*.

**Key concepts**

- **A DAG is tasks plus dependencies, and the edges should mean data readiness.** An edge from extract to transform means transform may run only after the required extract condition succeeds. Acyclicity forbids impossible loops; repeated schedules produce distinct DAG **runs** rather than cycles within one. *Why the edges matter:* two dimension builds depending only on the same raw snapshot can run in parallel — an unnecessary edge serializes them and lengthens the critical path, while a missing true edge publishes facts before dimensions are ready.

- **Every task needs a pinned input contract.** Inputs bound by logical date, partition, snapshot or event range; outputs with deterministic identities or transactional publication. *The classic bug:* **a task rerun for `2026-07-20` that calls the wall clock and processes today instead.** That is lesson 2's determinism rule, now at the task level.

- **Retries assume idempotency.** If an attempt writes half a partition and dies, the next attempt must replace, merge or deduplicate that same logical output — appending blindly doubles rows. The durable pattern: **stage output under an attempt ID, validate it, then atomically commit to the logical partition.**

- **Retry policy must separate transient from permanent.** Network timeouts deserve exponential backoff with jitter. A schema-contract violation will not heal after twenty immediate retries and should fail fast with a precise diagnostic. Unlimited retries hide incidents and consume downstream capacity.

- **🔴 Task status is not data quality.** A SQL statement can succeed and write zero rows. Downstream readiness must depend on validation gates, not on an exit code. Record row counts, data interval, input snapshots, output IDs and validation results in run metadata.

- **A validation gate sits between producing bytes and declaring them trustworthy.** Tests run against staged output or a candidate snapshot; publication happens only on success. Four families: **structural** (schema, types, required fields, uniqueness, referential integrity, accepted values), **volume** (missing or explosive data), **distribution** (null rates, quantiles, category shares, freshness vs historical baselines) and **business reconciliation** (totals against an authoritative source).

- **Thresholds must reflect expected variability.** Exact row-count equality fails on normal daily growth; accepting any nonzero count misses a 99% drop. Use absolute bounds, relative change, seasonal baselines and minimum sample sizes — and document who may approve an exception.

- **Classify every test as blocking, warning or informational.** A broken primary-key uniqueness rule should block publication; a modest shift in an optional attribute can warn and continue. Make warning *accumulation* observable rather than permanently ignored.

- **A blocking gate must fail closed.** A test that crashes is not a pass. Version the test suite, record inputs, outputs, measured values, thresholds and results, and unit-test custom checks against known bad data.

- **Version every deployable artifact**: DAG definition, container image, SQL package, dependency lock, schema contract, configuration. A run records exact versions and input snapshots. **Mutable `latest` images make historical retries irreproducible** — you can no longer rebuild what a past run produced.

- **Deployment and backfill are separate phases.** Deploy code that safely handles both the old and new data contract; run a **canary** on a current partition; validate; only then launch the historical backfill with an explicit code version and resource limits. A backfill should never follow automatically from a deployment: declare scope, expected cost, validation, concurrency, rollback and owner, and keep a **manifest of partitions and status** so an interruption resumes deterministically.

- **Rollback differs for code and for data.** Reverting a DAG does not undo already-committed partitions. Immutable snapshots and versioned generations enable a **pointer rollback**; irreversible side effects need a compensating migration in the release plan.

- **Expand-and-contract again, now for pipelines**: deploy readers tolerant of both fields, deploy dual-writing producers, backfill the new field, validate completeness, migrate consumers, remove the old field in a later release. The same shape as the CDC schema change and the data contract in lesson 1.

**Rules to remember**

- The durable release pattern, in order: **deploy compatible code → validate a small real slice → backfill immutably → gate the candidate data → switch a pointer → monitor → retain rollback.**
- Promote the *same immutable artifact* across environments, with secrets and endpoints supplied externally. Rebuilding between test and production creates supply-chain drift; approvals should reference artifact digests.
- Choose an orchestrator by control-plane shape, not brand. **Airflow/Composer** fits many dependencies, calendars, data intervals, backfills, sensors and a shared orchestration plane. A **cloud workflows service** fits a request-driven sequence of a few managed API calls — it is not a distributed data processor and must not carry large datasets in workflow state.
- At any hybrid boundary, define **one owner for retry and timeout**, or retries multiply.
- Transformation logic belongs in testable applications or SQL models. Operators should launch versioned jobs and capture results, not become a monolith of business logic.

**Common pitfalls**

- **Enabling a DAG with catchup on and a distant start date**, launching 1,000 runs at once. Define start date, catchup flag, maximum active runs and backfill procedure deliberately — you may want one bulk rebuild, or no historical execution at all.
- **Letting a backfill starve production.** Limit concurrency; daily runs keep priority.
- **Backfilling with "whatever is deployed"** partway through execution, so the range is computed by two different code versions.
- **Clearing and rerunning a failed task and assuming downstream is fine.** If an upstream partition changes, mark descendants stale or launch a new versioned run — lineage from inputs to outputs is what makes the impact computable.
- **Blocking sensors that hold worker slots.** Use deferrable or event-driven sensors; in a workflow service, durable waits may be native. Check quotas, maximum execution duration, payload limits, callbacks and pricing.
- **Sampling as if it were a full check.** Use full checks for cheap critical invariants (metadata row counts, engine-supported uniqueness) and statistically designed samples for expensive content checks — stating their detection power, and targeting high-risk partitions rather than only the first files.
- **Testing the gate only with passing data.** If you have never injected a duplicate key, a missing partition or a reconciliation mismatch, you have not proved the gate blocks anything under scheduler retries. Exercise override auditing too.
- **Exposing failed artifacts.** Retain staged output and diagnostics long enough to investigate, but never through the production pointer. Alerts should name owner, run, partition, failed expectation, observed value and links to samples.

**How to approach the questions**

1. If a scenario has a job that "succeeded" but the data is wrong, the missing piece is a validation gate — exit code is not quality.
2. If a rerun produced different results, look for wall-clock reads, a mutable `latest` image, or an unpinned input snapshot.
3. For orchestrator-choice questions, count the dependencies and ask whether backfill, catchup and cross-run views are needed. Many partitioned tasks with historical catchup → Airflow. Five managed API calls in sequence → Workflows. The simplest orchestrator that satisfies the recovery requirements wins.
4. For release questions, check whether code rollout, historical computation and consumer visibility are three separate decisions. If one release does all three, that is the planted flaw.
5. Remember that a deployment is not complete when it deploys — it is complete when the resulting data has passed its operational window.

**Where this leads**: that closes DE 202. You now have the whole chain — zones and contracts that make data recoverable, idempotency and deterministic partitioning that make reruns safe, Beam for execution, streaming semantics for unbounded data, CDC for database-sourced change, and orchestration to run it all on a schedule you can trust.
