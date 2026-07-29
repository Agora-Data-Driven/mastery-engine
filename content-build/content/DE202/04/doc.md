Streaming correctness depends on two kinds of time and two kinds of uncertainty: when an event happened, when it arrived, whether more events are coming, and whether a delivery may repeat. Windows, watermarks, triggers, accumulation, and sink idempotency form one contract. Message acknowledgements, ordering, and dead-letter handling supply the transport side of that contract.

## Windowing: Fixed, Sliding, and Session

Windows divide an unbounded event stream into finite groups that can be aggregated. Fixed windows are non-overlapping intervals of equal duration. With five-minute windows, event times from 10:00 inclusive through 10:05 exclusive share one window, and 10:05 begins the next.

Sliding windows have a size and a period. A ten-minute window sliding every five minutes overlaps its neighbors. An event at 10:07 may belong to windows `[10:00,10:10)` and `[10:05,10:15)`. Overlap supports rolling metrics but duplicates logical membership and increases state and output.

Session windows group events by key when gaps between consecutive events remain below an inactivity threshold. With a 30-minute gap, user events at 10:00 and 10:20 share a session; another at 11:00 starts a new one. Sessions can merge when a late event bridges two previously separate groups, so sinks must handle revised window identity.

Window choice should reflect the business question. Calendar-hour billing may need fixed windows aligned to a timezone. A rolling error rate fits sliding windows. User visits fit sessions. Using processing-time windows because they are convenient changes the question from when events occurred to when infrastructure observed them.

Timestamp assignment is therefore critical. Sources should attach trustworthy event time and the pipeline should validate impossible future or ancient values. If a producer clock is wrong, event-time windowing faithfully places data in the wrong interval. Quarantine or cap pathological timestamps under a documented rule.

State cost grows with active keys, window overlap, and retention. One million keys across twelve overlapping windows can create far more keyed state than one fixed window. Estimate concurrency, configure state cleanup, and monitor active windows rather than choosing fine granularity only for dashboard smoothness.

Window alignment also affects joins. Two streams can join cleanly only when their windowing strategies are compatible or deliberately transformed. Joining a daily fixed window to per-user sessions has no obvious one-to-one temporal meaning. State the interval relationship and expected multiplicity before implementing the join.

## Watermarks and Late-Arriving Data

A watermark estimates event-time progress: the system expects few future events with timestamps earlier than the watermark. When a window end passes the watermark, an on-time trigger can fire. The watermark is not proof that earlier events are impossible, so a late-data policy remains necessary.

Sources derive watermarks from partitions, observed timestamps, backlog, and idleness. The combined pipeline watermark is often limited by its slowest input. One idle or stalled partition can hold every window open unless the source identifies idleness safely.

Allowed lateness specifies how long after the watermark passes a window end the pipeline retains state and accepts late updates. If allowed lateness is one hour, an event arriving 20 minutes late may update the result; one arriving two hours late may be dropped, quarantined, or handled by a correction pipeline.

This clock begins relative to event-time progress, not simply the event's wall-clock arrival delay. Tests should advance watermarks explicitly and verify behavior on both sides of the cleanup boundary.

Production alerts should report that boundary in event-time terms.

Longer lateness improves completeness but increases state, delayed cleanup, and correction traffic. The right value comes from the empirical arrival-delay distribution and business cost. If 99.9 percent of events arrive within ten minutes but financial corrections arrive days later, a fast stream plus a separate reconciliation job may be better than retaining all window state for days.

Track event-time lag distributions, watermark delay, accepted late events, dropped-too-late events, and windows waiting on each source. A healthy processing-latency dashboard can coexist with a watermark stuck hours behind, producing stale event-time results.

Late data may be correct data, not an infrastructure defect. Mobile clients reconnect, batch producers publish after reconciliation, and upstream systems repair timestamps. Preserve reason codes where possible so teams can distinguish expected business delay from a broken subscriber or source partition.

## Triggers and Accumulation Modes

Triggers decide when a window emits panes. An event-time trigger produces an on-time pane when the watermark passes the window end. Processing-time or count triggers can emit early speculative panes. Late triggers emit corrections after additional accepted events arrive.

Early results trade completeness for latency. A dashboard may update every minute before an hour closes, then publish an on-time value and later corrections. Consumers need pane metadata indicating window, timing category, and whether the pane is final under the configured policy.

Accumulating mode emits the full aggregate so far. If counts progress from 80 to 100 to 103, those are replacement values, not deltas. Discarding mode emits only new contributions, perhaps 80, 20, and 3, which a compatible sink adds. Retractions explicitly withdraw prior output where supported.

Mismatch causes double counting. An accumulating pipeline writing append-only rows without version keys leaves multiple totals. A sink that sums them produces 283 instead of 103. Use idempotent upserts keyed by query dimensions and window, or store panes as a versioned history whose readers deliberately select the latest.

Trigger frequency affects cost. Per-element firing can overwhelm sinks and checkpointing. Bundle updates, use a meaningful delay, and protect downstream rate limits. Test the full pane sequence with out-of-order data, not only the final number.

Pane identity must survive retries. A deterministic key can include business dimensions, window start and end, and a logical result version. Do not rely on worker attempt IDs, which change on retry and turn the same pane into multiple sink rows.

## Exactly-Once vs At-Least-Once vs Effectively-Once

At-most-once delivery may lose events but does not retry them. At-least-once retries unacknowledged events, preventing loss under expected failures but allowing duplicates. Exactly-once processing claims require a defined boundary: source consumption, state updates, external side effects, and sink commits must participate in a coordinated protocol.

A runner can checkpoint source offsets and internal state consistently while an external HTTP call occurs twice after a retry. Internal exactly-once state does not make arbitrary side effects exactly once. Avoid non-transactional side effects inside retried transforms, or give them idempotency keys and a deduplicating receiver.

Effectively-once output uses at-least-once execution plus deterministic identity and idempotent writes. Assign each event a stable ID, derive an output key, and upsert or conditionally insert. Reprocessing the same event then produces the same final state.

Deduplication needs a scope and retention. Remembering every event ID forever is unbounded. A streaming dedupe window works only if duplicates arrive within that duration; source redelivery after expiry can reappear. Durable sinks with unique keys can provide longer protection.

Non-idempotent aggregates require care. Incrementing a counter for every delivery double counts duplicates. Store per-event contributions with unique IDs and aggregate them, use transactional offset-and-output commits, or upsert complete window aggregates. Exactly-once is a system property, not a label attached to one connector.

Define the failure boundary in service-level language. For example: every valid event eventually affects the keyed daily total once, provided it arrives within seven days, while malformed events enter a reviewed quarantine. This is more testable than claiming exactly-once without scope or expiry.

## Pub/Sub Delivery Semantics: Acks, Ordering Keys, Dead-Letter Queues

In a publish-subscribe system, an acknowledgement tells the service that a subscriber successfully handled a message. If processing fails or the acknowledgement deadline expires, the message can be redelivered. Acknowledge only after the durable effect required by the pipeline is committed.

Long processing may require extending the acknowledgement deadline, but a crashed worker can still cause redelivery. Consumers must assume duplicates. Stable message or event IDs, idempotent sinks, and side-effect keys are essential even when duplicate rates are low.

Ordering keys provide ordered delivery within a key under the service's documented conditions, not one total order for the topic. Choosing one global key destroys parallelism. Choose a business entity whose events require sequence, such as account ID, and include sequence numbers when gaps or producer reordering must be detected.

Ordering can interact with poison messages. If one failed message blocks later messages for the same key, retry limits and dead-letter policy prevent indefinite head-of-line blocking. Moving a message to a dead-letter queue restores flow but creates an obligation to inspect, repair, replay, or explicitly discard it.

A dead-letter record should preserve original payload or reference, attributes, message ID, ordering key, publish time, failure stage, error class, attempt count, and code version. Access controls should match the source because failed messages can contain sensitive data.

Replay must be idempotent and observable. Correct the parser or data, publish with the original stable event identity, and track replay status. Creating a fresh identity defeats deduplication and can duplicate effects. Separate transient failures, which deserve retries, from permanent validation failures, which need quarantine.

Monitor oldest unacknowledged age, redelivery rate, acknowledgement latency, per-key backlog, dead-letter volume, replay success, and message age at processing. A flat queue depth can still hide one blocked ordering key or a growing dead-letter backlog.

Subscriber scaling should respect ordering and downstream capacity. More workers improve parallel keys but cannot parallelize one strictly ordered key safely, and they may overload the sink. Autoscaling signals should combine backlog age with processing latency, error rate, and external quota headroom.

The complete streaming guarantee spans producer identity, broker delivery, runner state, window semantics, and sink writes. Acknowledgement does not mean correct transformation, and exactly-once marketing does not remove the need for idempotent business effects. Design and test the failure path end to end.
