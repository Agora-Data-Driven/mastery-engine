Production data engineering connects architecture to operations. A design is incomplete until engineers can detect failure, explain cost, recover data, and show how every component satisfies a requirement. This final lesson builds that operational view and then turns it into a certification-ready reference architecture.

## Monitoring and Logging Data Pipelines on GCP

Observability begins with outcomes. A pipeline is healthy when the expected data arrives within its service objective, is complete and correct, and remains usable by consumers. A green virtual machine or a running job is only an implementation signal. Define indicators such as freshness lag, input and output counts, rejected records, duplicate rate, processing latency, backlog age, quality failures, and successful publication time.

Cloud Monitoring collects metrics, supports dashboards, and evaluates alerting policies. Cloud Logging centralizes structured logs that can be searched, routed, retained, or converted into log-based metrics. Audit logs answer security and administrative questions about who changed or accessed supported resources. Service-specific interfaces add context: the Dataflow monitoring view exposes the job graph, step details, logs, and streaming signals such as system lag.

Use a layered dashboard. The first layer reports consumer-facing objectives, such as whether the sales table is ready by 07:00. The second shows pipeline health, including run state, throughput, backlog, watermark, retries, and error rate. The third exposes resource pressure and dependencies, such as worker CPU, BigQuery job failures, Pub/Sub oldest-unacked-message age, external API latency, or quota consumption. This structure lets responders move from impact to cause.

Structured logs should include a stable run ID, pipeline and stage name, source partition or event identifier, severity, attempt, duration, record counts, and a sanitized error classification. Avoid writing raw credentials or unrestricted personal data. Correlation IDs should cross orchestration and processing boundaries so one execution can be traced from trigger to published dataset.

Alerts must be actionable. Alert on sustained user impact or a strong precursor, not every transient retry. Include the affected resource, current value, threshold, runbook, dashboard, and owner. Use different routing and urgency for late data, partial quality degradation, and complete outage. Test notification paths and review noisy alerts; chronic noise trains operators to ignore real incidents.

Data quality monitoring belongs beside infrastructure monitoring. Check schema, uniqueness, null rates, accepted ranges, referential integrity, and reconciled totals where the data contract requires them. Quarantine or withhold publication when a failed rule makes the output unsafe. Record quality results as time series so gradual drift becomes visible before a hard threshold fails.

## Quotas, Billing, and Troubleshooting

Quotas protect shared services and projects from uncontrolled consumption. Rate quotas limit operations over time, allocation quotas cap provisioned resources, and service limits may be fixed. A quota failure can appear as an HTTP 429, a resource-exhausted response, or a service-specific error. The failing project may be the consumer or quota project rather than the project that stores the target resource.

Treat quota planning as capacity engineering. Inventory the quotas on critical paths, measure normal and peak use, estimate growth, and request increases before a launch. Spread load only when the architecture and service terms support it; creating many projects solely to evade a limit is not a sound substitute. Back off with jitter for retryable rate limits and bound retries so an outage does not create a synchronized retry storm.

Billing visibility needs labels, project boundaries, budgets, and detailed export data. Budgets notify; they do not normally stop spend automatically. Use billing exports to BigQuery for allocation and trend analysis. Relate cost to a useful unit such as processed gigabytes, completed jobs, active customers, or published datasets. A lower total bill is not an improvement if freshness or reliability collapses.

Investigate cost changes by separating volume, unit price, and efficiency. More input data can raise spend even if the design is stable. A partition filter regression can increase bytes scanned per output row. An idle persistent cluster creates cost without workload volume. Attribute by project, service, SKU, label, and time, then correlate the change with deployments and workload metrics.

Troubleshooting should proceed from symptom to dependency. Confirm scope and start time, inspect the orchestrator, identify the first failed stage, read the service-specific error, and check recent changes. Then evaluate IAM, Organization Policy, quota, region, schema, network, and downstream availability as hypotheses supported by evidence. Preserve run IDs and relevant logs before rerunning.

Retries are not a universal fix. Retry transient exhaustion or temporary service failures with bounded exponential backoff. Do not repeatedly retry an invalid schema, denied permission, missing source, or deterministic bad record without a corrective action. A dead-letter or quarantine path prevents one poison record from blocking an entire stream and preserves evidence for repair.

## Dataproc: Persistent vs Ephemeral Clusters

Dataproc runs managed open source data frameworks such as Apache Spark and Hadoop. A persistent cluster remains available across many jobs. An ephemeral cluster is created for a workflow or job group and deleted afterward. Both models can be valid; the selection depends on latency, isolation, configuration diversity, utilization, and operational ownership.

Ephemeral clusters provide workload-specific sizing, image versions, initialization, network settings, and service accounts. They reduce idle compute, simplify cost attribution, and limit cross-workload interference. Infrastructure as code makes the environment reproducible, and deletion removes configuration drift. They are a strong default for scheduled batch jobs that tolerate cluster startup time.

The data lifecycle must not depend on ephemeral local disks. Store durable inputs, outputs, checkpoints, code, and required metadata in services such as Cloud Storage, BigQuery, or an external metastore appropriate to the design. If cluster deletion removes the only useful copy of an intermediate or shuffle-dependent recovery state, the workflow was not truly disposable.

Persistent clusters make sense for continuously running workloads, interactive users who need low startup latency, or a steady stream of short jobs where repeated cluster creation dominates useful work. They can amortize initialization and support warm caches. In return, teams must manage idle cost, multi-tenancy, upgrades, patching, dependency conflicts, access separation, and capacity contention.

Autoscaling helps match worker capacity to work but does not cure a skewed Spark stage or an unbounded driver. Secondary workers can supply flexible capacity for fault-tolerant processing. Preemptible or Spot capacity can reduce cost but may disappear, so jobs must tolerate loss and critical control components should follow documented placement guidance.

For persistent upgrades, a blue-green approach can create a new cluster with the target image and configuration, route new jobs to it, drain the old cluster, and then delete it. For ephemeral workloads, update the versioned cluster template and validate it in lower environments. In either model, pin and test dependencies rather than downloading mutable packages without control.

## Replication, Failover, and Backup-DR Basics

Availability and recoverability are related but different. Replication maintains additional current copies and may enable continued service after an infrastructure failure. A backup preserves a recoverable point in time and can protect against deletion, corruption, or malicious change. Replicating corrupted data quickly is not a backup.

Recovery point objective, or RPO, is the maximum acceptable data loss measured in time. Recovery time objective, or RTO, is the target time to restore service. A zero or very small RPO can require synchronous or frequent replication, while a short RTO may require warm capacity and automated failover. These choices add cost and sometimes write latency, so classify workloads instead of assigning the strictest target to everything.

Failover transfers serving or processing responsibility to a healthy location or instance. Some managed regional or multi-regional services handle certain failures automatically; other products require an application, operator, or orchestrator to act. Read each service's availability model. A regional name does not guarantee resilience to a complete regional outage, and a multi-region storage choice does not automatically recreate every pipeline dependency.

Backups need retention, immutability or deletion protection where required, encryption, access separation, and restore testing. Store recovery instructions and infrastructure definitions outside the failed component. A backup success event proves that bytes were written, not that the business system can be restored. Periodic exercises should restore data, rebuild services, validate permissions, reconcile correctness, and measure actual RPO and RTO.

Design for corruption separately from outage. Point-in-time recovery, versioned objects, snapshots, immutable exports, and delayed deletion can help. Replication health metrics and lag show whether a secondary is ready. After failover, prevent split brain, decide how writes return to the original site, and reconcile records created during the event.

A DR plan names triggers, authority, communications, dependencies, steps, validation criteria, and return-to-normal procedures. It must also respect residency and CMEK requirements in the recovery location. Start with business impact, choose service mechanisms that meet the targets, and test the complete path rather than assuming a diagram is executable.

## Drawing the Certification-Ready Reference Architecture

A useful architecture diagram tells a requirements story. Arrange it from producers through ingestion, storage, processing, serving, and consumers. Draw batch and streaming paths distinctly. Surround the path with cross-cutting control planes for identity, keys, catalog, monitoring, orchestration, and recovery. Label projects, regions, and trust boundaries when they affect the decision.

Begin with workload facts: data sources, volume, velocity, formats, consumers, latency objective, retention, quality contract, security classification, residency, RPO, and RTO. Every major box should answer one or more facts. Pub/Sub can decouple streaming producers and consumers; Dataflow can transform event streams; Cloud Storage can retain replayable raw objects; BigQuery can serve analytical SQL; Dataform can build tested warehouse models.

Show identities and permissions at important transitions. A source-specific identity publishes to a topic. A Dataflow service account reads the subscription and writes only its permitted destinations. Analysts query curated datasets rather than raw sensitive storage. A BigLake connection identity reads governed external files. CMEK arrows should identify which service identity uses which KMS key, not merely place a lock icon on the page.

Make operational behavior visible. Include dead-letter or quarantine destinations, data quality gates, observability, and the orchestrator. Mark idempotency or deduplication at retry boundaries. Draw replication or backups separately from primary flows and annotate RPO and RTO. If the recovery environment needs copied code, secrets, network rules, or keys, include those dependencies.

Avoid product-logo collages. An arrow should mean a flow, API call, dependency, or permission, and the legend should say which. Do not add a service solely because it appeared in study material. Choose the simplest managed product that meets the requirement, then state the tradeoff: latency versus cost, native storage versus open files, persistent environment versus ephemeral isolation, or zero-copy sharing versus independent retention.

Validate the diagram with failure questions. What happens if a message is delivered twice, a schema changes, a region is unavailable, a key is disabled, a quota is exhausted, or a curated table fails quality checks? Who receives the alert, what is replayed, and which data remains authoritative? If the diagram cannot support those answers, revise it before presenting.

A strong certification response links requirement, product, configuration, and consequence in one sentence. For example: use a metadata cache-enabled BigLake table with access delegation because analysts need governed SQL over Parquet that remains in Cloud Storage, accepting a defined metadata freshness window. This pattern demonstrates selection skill, operational awareness, and an explicit tradeoff, which is the heart of architecture reasoning.
