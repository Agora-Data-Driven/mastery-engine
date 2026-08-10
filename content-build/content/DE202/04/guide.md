**The big idea**: The previous lesson *named* windows, watermarks, triggers and accumulation. This one turns each into a decision with a consequence. Streaming correctness rests on two kinds of time and two kinds of uncertainty: when an event **happened**, when it **arrived**, whether **more are coming**, and whether a delivery may **repeat**. Windows, watermarks, triggers, accumulation and sink idempotency are one contract; acks, ordering keys and dead-letter policy are the transport side of that same contract. The recurring lesson: a guarantee that stops at the runner's boundary is not a guarantee about your data.

**Key concepts**

- **Three window shapes, three questions.** **Fixed**: non-overlapping equal intervals — with 5-minute windows, 10:00 inclusive to 10:05 exclusive is one window. **Sliding**: a size *and* a period; a 10-minute window sliding every 5 minutes overlaps, so an event at 10:07 belongs to both `[10:00,10:10)` and `[10:05,10:15)` — good for rolling metrics, but it duplicates logical membership and multiplies state and output. **Session**: grouped per key by gaps below an inactivity threshold — with a 30-minute gap, events at 10:00 and 10:20 share a session and 11:00 starts a new one.

- **Sessions can *merge*.** A late event arriving between two previously separate sessions bridges them into one. The window's identity therefore changes after the fact, and the sink has to handle a revised window key — this is the one window type whose grouping is not fixed at assignment time.

- **A watermark is an estimate of event-time progress**, not proof that nothing earlier can arrive. Sources derive it from partitions, observed timestamps, backlog and idleness, and **the pipeline watermark is limited by its slowest input** — one idle or stalled partition can hold every window open unless the source identifies idleness safely.

- **Allowed lateness is measured in event time, not arrival delay.** It says how long after the watermark passes a window end the pipeline keeps state and accepts updates. With one hour of allowed lateness, an event 20 minutes late may update the result; one two hours late is dropped, quarantined, or handled by a correction pipeline. Longer lateness buys completeness and costs state, delayed cleanup and correction traffic.

- **Set lateness from the empirical arrival-delay distribution, not a round number.** *Example:* if 99.9% of events arrive within ten minutes but financial corrections arrive days later, a fast stream plus a **separate reconciliation job** beats retaining all window state for days.

- **Late data is often correct data.** Mobile clients reconnect, batch producers publish after reconciliation, upstream systems repair timestamps. Preserve reason codes so a team can tell expected business delay from a broken subscriber.

- **Triggers decide when a window emits panes.** Event-time triggers fire on-time when the watermark passes the window end; processing-time or count triggers emit early speculative panes; late triggers emit corrections. Consumers need pane metadata: the window, the timing category, and whether the pane is final under the configured policy.

- **Accumulating emits replacements; discarding emits deltas.** Counts progressing 80 → 100 → 103 in accumulating mode are three *values*, not three additions. Discarding would emit 80, 20, 3, which a compatible sink adds. *Example of the mismatch:* an accumulating pipeline writing append-only rows without version keys leaves three totals, and a summing sink reports **283 instead of 103**.

- **Pane identity must survive retries.** Build the key from business dimensions, window start and end, and a logical result version. **Never use a worker attempt ID** — it changes on retry and turns one pane into multiple sink rows.

- **The delivery ladder.** *At-most-once* may lose events and never retries. *At-least-once* retries unacknowledged events — no loss under expected failures, but duplicates. *Exactly-once* is only meaningful with a stated **boundary**: source consumption, state updates, external side effects and sink commits must all participate in one coordinated protocol.

- **Internal exactly-once does not make side effects exactly-once.** A runner can checkpoint source offsets and internal state consistently while your external HTTP call fires twice after a retry. Either keep non-transactional side effects out of retried transforms, or give them idempotency keys and a deduplicating receiver.

- **Effectively-once is the practical target**: at-least-once execution *plus* deterministic identity *plus* idempotent writes. Assign each event a stable ID, derive an output key, upsert or conditionally insert. Reprocessing then converges on the same final state — the same trick as lesson 2, moved into streaming.

- **Acknowledge only after the durable effect is committed.** An ack tells the service a subscriber handled the message; if processing fails or the ack deadline expires, it is redelivered. Long processing may need the deadline extended, but a crashed worker still causes redelivery — **consumers must assume duplicates** even when the observed rate is low.

- **Ordering keys give order within a key, not a total order for the topic.** Choose a business entity whose events genuinely need sequence (account ID). Include sequence numbers where gaps or producer reordering must be detectable. Choosing one global key destroys parallelism.

- **Dead-letter queues exist to break head-of-line blocking.** With ordering, one poison message can block every later message for that key; retry limits plus DLQ restore flow — and create an obligation to inspect, repair, replay or explicitly discard. A DLQ record should preserve the original payload or a reference, attributes, message ID, ordering key, publish time, failure stage, error class, attempt count and code version. **Its access controls must match the source**, because failed messages can contain sensitive data.

**Rules to remember**

- Membership is decided by event time. Processing-time windows answer a different question — when infrastructure observed the data.
- Fixed = one window per event. Sliding = size ÷ period windows per event. Session = per key, ended by a gap, and mergeable.
- Dedup needs a **scope and a retention**. Remembering every event ID forever is unbounded; a dedupe window only works if duplicates arrive inside it, and source redelivery after expiry reappears.
- Replay with the **original stable event identity**. A fresh ID defeats deduplication and duplicates the effect.
- Separate transient failures (retry) from permanent validation failures (quarantine).

**Common pitfalls**

- **Trusting a healthy processing-latency dashboard.** It can look perfect while the watermark sits hours behind, producing stale event-time results. Track event-time lag distribution, watermark delay, accepted late events, dropped-too-late events, and which windows are waiting on which source.
- **Assuming a flat queue depth means health.** It can hide one blocked ordering key or a growing dead-letter backlog. Monitor oldest unacknowledged age, redelivery rate, ack latency, per-key backlog and DLQ volume.
- **Incrementing a counter per delivery.** That double counts every duplicate. Store per-event contributions with unique IDs and aggregate, use transactional offset-and-output commits, or upsert complete window aggregates.
- **Believing event-time windowing fixes a wrong producer clock.** It faithfully files the data in the wrong interval. Validate impossible future or ancient timestamps and quarantine or cap them under a documented rule.
- **Choosing fine window granularity for dashboard smoothness.** State cost grows with active keys × overlap × retention: one million keys across twelve overlapping windows is far more keyed state than one fixed window.
- **Joining incompatible windowing.** A daily fixed window joined to per-user sessions has no obvious one-to-one temporal meaning. State the interval relationship and expected multiplicity *before* implementing.
- **Scaling subscribers to fix a backlog.** More workers help parallel keys, cannot safely parallelize one strictly ordered key, and may simply overload the sink. Combine backlog age with latency, error rate and quota headroom.

**How to approach the questions**

1. For window-membership questions, place the event by its **event time** and count how many windows contain it. Sliding is where the "how many windows?" trap lives.
2. When a scenario reports a number that is too large, look for accumulating panes written to an appending sink. When it reports one too small, look for discarding panes with a dropped pane, or a dedupe window that expired.
3. Any "is this exactly-once?" question is really "where is the boundary?" Internal state and sink commits can be coordinated; arbitrary external calls cannot. Effectively-once + idempotent writes is the answer that survives scrutiny.
4. State guarantees in service-level language — *every valid event eventually affects the keyed daily total once, provided it arrives within seven days; malformed events enter a reviewed quarantine.* That is testable in a way "exactly-once" is not.

**Where this leads**: these semantics assume events arrive as a stream in the first place. **Change Data Capture** is how a database that was never designed to emit events becomes one — and it inherits every ordering and duplicate problem here.
