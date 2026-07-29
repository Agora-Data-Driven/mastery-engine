Google Cloud streaming systems divide responsibility across messaging, processing, and database change capture. Pub/Sub transports independently consumed events, Dataflow executes Beam pipelines, and Datastream turns supported source changes into managed replication streams. Choosing among them, or comparing Pub/Sub with Kafka, requires understanding state, ordering, replay, scaling, and operational ownership.

## Pub/Sub: Topics, Subscriptions, and Delivery Guarantees

A Pub/Sub publisher sends a message to a topic. A subscription is a durable, named delivery path attached to that topic. Each subscription receives its own copy of published messages and tracks acknowledgement state independently, so analytics, alerting, and archival consumers do not coordinate one shared cursor.

Pull subscriptions let clients request or stream messages and acknowledge them. Push subscriptions deliver HTTP requests to an endpoint. Export subscriptions can write to supported destinations. The choice affects flow control, error handling, and delivery features; it is not merely a client-library preference.

Standard delivery is at least once. A message can be redelivered if its acknowledgement deadline expires or the subscriber negatively acknowledges it. Consumers should use stable business or message IDs and idempotent sinks. An acknowledgement should occur after the required durable effect, not before processing begins.

Pub/Sub also supports an exactly-once delivery option for pull subscriptions within its documented regional scope. It provides acknowledgement success information and prevents redelivery after successful acknowledgement for a Pub/Sub message ID. It does not merge distinct duplicate publishes by an application, and it does not make an external database write atomic with acknowledgement.

Ordering is subscription-specific and based on ordering keys. Publishers use the same nonempty key for related messages, publish that key consistently under the documented regional requirements, and the subscription enables ordering. Different ordering keys can process in parallel; one hot key can serialize progress and create backlog.

Redelivery can affect subsequent messages for the same ordering key. Ordered consumers must tolerate repeated processing and acknowledge promptly. A dead-letter topic can prevent a poison message from blocking forever, but dead-letter forwarding and ordering interactions have documented limitations and should not be treated as a perfect ordered transaction log.

Retention and replay are finite and configured. A new subscription generally does not provide an infinite history of messages published before it existed unless topic retention and subscription behavior cover them. Choose retention from outage recovery and replay requirements, while accounting for cost and governance.

Monitor oldest unacknowledged age, backlog bytes and messages, acknowledgement latency, redelivery, expired deadlines, dead-letter volume, publish errors, and per-ordering-key hot spots. Queue depth alone can hide stale messages behind continuous throughput.

Pub/Sub decouples services and autoscaling capacity, but the application owns schema contracts, idempotency, business ordering, and sink correctness. Use message attributes for routing metadata, keep large payloads in object storage when appropriate, and publish references with checksums and authorization.

Subscription design should mirror consumer responsibility. Sharing one subscription load-balances messages among instances of one logical consumer; creating separate subscriptions gives independent delivery to different applications. Accidentally sharing a subscription between analytics and alerts makes them compete instead of each receiving all events.

## Dataflow in Production: Autoscaling and Streaming Jobs

Dataflow is Google Cloud's managed runner for Apache Beam batch and streaming pipelines. A streaming job continuously consumes unbounded input, maintains windows and state, processes late data, and writes sinks. Production correctness begins with Beam semantics; Dataflow adds managed execution, autoscaling, metrics, updates, and service integration.

Streaming Engine moves much streaming execution and state management from worker VMs into the Dataflow service backend. It reduces worker persistent-disk needs and supports more responsive horizontal autoscaling, with separate service cost. It does not remove per-key state limits or inefficient pipeline design.

Horizontal autoscaling responds to backlog, throughput, CPU, and available parallelism within configured bounds. More workers help only if work can be split. A single hot key, too few source partitions, or one serialized external sink can leave backlog high while autoscaling correctly decides that extra workers cannot help.

Set worker minima and maxima from steady-state demand, spike recovery, quotas, and downstream capacity. A high maximum is useless when CPU, IP, regional, or service quotas prevent allocation. Excessive concurrency can overload BigQuery, APIs, or databases even if Dataflow itself can scale.

Observe system lag, data freshness, backlog, watermark progress, per-stage throughput, worker CPU, autoscaling decisions, parallelism, persistence, shuffle, and failed bundles. A job can have low CPU while being stuck on I/O, a key bottleneck, quota, or external calls.

Design external calls with batching, caching, bounded timeouts, idempotency, and rate limiting. Avoid creating a client per element. A side effect inside a retried transform can execute again; coordinate with transactional sinks or stable idempotency keys.

Operational changes require a plan. Some compatible pipeline updates can preserve state, while incompatible topology, coder, window, or state changes may require draining or a new job. A drain stops new input and lets in-flight windows progress under constraints; cancellation can abandon work. Version job names, templates, code, and state assumptions.

Test with out-of-order data, source stalls, poison records, hot keys, worker loss, quota exhaustion, sink slowdown, and restart. Load testing should measure tail latency and recovery, not only average steady-state throughput. Maintain a dead-letter and replay path for records that cannot be processed permanently.

Use a canary pipeline or low-risk traffic slice for SDK and transform upgrades. Compare watermark, output counts, late panes, costs, and sink effects before replacing the stable job. Keep the old deployment available until state migration or drain behavior is proven.

## Datastream for Managed CDC

Datastream is a managed change data capture and replication service. It connects to supported operational sources, performs an initial backfill or snapshot, reads ongoing changes through source-specific mechanisms, and writes supported Google Cloud destinations with low latency.

Use Datastream when the requirement is database replication or CDC rather than arbitrary event processing. It can feed BigQuery for analytics, Cloud Storage for a durable change landing zone, and supported table destinations according to current service capabilities. Dataflow or SQL transformations can consume the replicated data afterward.

Source preparation matters. Log-based capture needs database-specific logging, permissions, network connectivity, and log retention. Private connectivity may use Google Cloud networking plus VPN or Interconnect for external sources. Validate source versions and limitations before choosing the service.

The initial snapshot and change stream must meet at a consistent boundary. Datastream manages much of that process, but operators still monitor backfill progress, stream status, source lag, destination errors, schema drift, and failed objects or tables. A stream shown as running can still have tables falling behind.

Schema evolution behavior varies by source and destination. Adding a column may propagate differently from renaming, type change, or table recreation. Test required DDL, version downstream consumers, and avoid assuming operational schemas are automatically safe analytical contracts.

Deletes and updates need destination-aware interpretation. A raw change stream may carry operation and ordering metadata; a BigQuery destination may present replicated current state under service behavior. Consumers should know whether they are reading event history, latest state, or both.

Recovery planning includes source log retention. If an outage exceeds retained logs, resnapshotting may be necessary. Monitor the distance to the oldest required source position and size infrastructure to catch up without harming the transactional source.

Datastream reduces connector operations but does not provide arbitrary Beam transforms, business deduplication, or end-to-end exactly-once side effects. Treat it as managed capture and replication, then design downstream idempotency, quality gates, and lineage.

Reconcile replicated keys and business totals periodically because operational status alone cannot prove destination completeness, transaction ordering, full historical coverage, or downstream semantic correctness.

## Kafka vs Pub/Sub: An Awareness-Level Comparison

Apache Kafka and Pub/Sub both transport event streams, but their abstractions and ownership differ. Kafka exposes partitioned logs whose partition count, key mapping, broker storage, replication, retention, and consumer groups shape scaling and ordering. Pub/Sub is a managed service organized around topics and subscriptions with capacity scaling handled by Google.

Kafka gives ordered records within a partition and lets consumers manage offsets. Replaying from an offset and retaining long event histories are central patterns. Pub/Sub provides replay within configured retention and subscription or topic semantics, but applications should not assume Kafka's partition and offset API exists underneath.

Kafka keys assign records to partitions, making partition count a capacity and parallelism decision. Pub/Sub ordering keys request ordered delivery for related messages without users provisioning topic partitions. Hot keys still limit useful parallelism, and ordered delivery introduces availability and latency tradeoffs.

Kafka ecosystems provide stream processing, connectors, schemas, compaction, and transactions through Kafka and related components. They also require operating or purchasing clusters and planning partitions, brokers, upgrades, storage, and disaster recovery. Pub/Sub offloads infrastructure, autoscaling, and service availability while exposing Google Cloud integration and service quotas.

Transactions differ. Kafka supports transactional producer and consume-transform-produce patterns under its semantics. Pub/Sub exactly-once delivery is subscription and message-delivery behavior, not a general transaction spanning arbitrary external systems. Idempotent consumers remain the portable design.

Choose Kafka when its log model, partition control, ecosystem, portability, or existing organizational investment is central. Choose Pub/Sub when managed operations, elastic capacity, global Google Cloud integration, and topics with independent subscriptions fit. A managed Kafka service changes the ownership comparison but not the programming model.

Migration needs semantic mapping, not API translation. Inventory ordering, retention, replay, transactions, compaction, consumer groups, message size, connectors, and monitoring. Run parallel streams, compare counts and ordering by key, validate consumers, and preserve a rollback window.

At awareness level, neither system is universally superior. Calculate total cost of ownership, operational skills, recovery objectives, latency, throughput, data locality, and ecosystem dependencies. The correct choice is the one whose guarantees and responsibilities best match the product.
