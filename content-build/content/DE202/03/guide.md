**The big idea**: You now have replayable slices — the previous lesson gave you idempotent writes and deterministic partitioning. This lesson gives you the engine that runs them. Beam offers one programming model for bounded batch and unbounded streams, and its central move is separating the **logical pipeline** (a graph of transforms over collections) from the **runner** that executes it. But portability does not abolish physics: the network still costs money, and time still has two meanings. Two things carry most of the weight here — the **shuffle**, which is where the wall-clock and the bill go, and the **four questions** (what/where/when/how), which turn a vague streaming requirement into an implementable contract.

**Key concepts**

- **A PCollection is a potentially distributed, immutable multiset.** Bounded (rows from a fixed set of files) or unbounded (events arriving continuously). *Immutable does not mean physically copied at each step* — it means your code treats the output as a new logical collection rather than mutating the input. The runner is then free to fuse transforms, stream elements through memory, or materialize intermediates as its plan sees fit.

- **A PTransform takes zero or more PCollections and produces zero or more.** `ParDo` applies user logic and may emit any number of outputs; `Map` is one-out-per-in; `FlatMap` may emit several; `Filter` emits those satisfying a predicate. Composite transforms package several steps behind a reusable interface.

- **The graph is built on the client; the work happens on workers.** Beam code constructs the logical graph at the driver and does not ordinarily process distributed data while doing so. Your functions are *serialized* and shipped. *Why it matters:* capturing a non-serializable database client, or a large local object, either fails deployment or ships excessive state to every worker.

- **Coders encode elements for transport, shuffle and state — and key encoding must be deterministic.** Two logically equal keys must encode identically, or grouping and state will split them. A map or set with nondeterministic iteration order is a dangerous key representation.

- **Prefer a combiner to a raw group.** `GroupByKey` gathers all values for a key; `CombinePerKey` aggregates them and can combine *locally before network transfer*. *Example:* 100 million purchase rows reduced to one partial sum per customer per worker before the shuffle collapses network volume. This works because sum is **associative and commutative** — partial sums merge in any grouping and order. Median has no small exact accumulator in the same way; it needs retained values or an approximate sketch. A custom combiner must correctly define accumulator creation, input addition, accumulator merging, and output extraction.

- **A shuffle redistributes elements across workers so all values for a key meet in one place.** `GroupByKey`, keyed joins, distinct, and many global orderings require one. It breaks element-wise fusion and adds serialization, network transfer, intermediate storage, coordination and straggler risk. *Example:* 1 TB mapped locally is fine — workers process their own partitions. A subsequent group-by-customer can move much of that terabyte across the network and wait for every key partition. **Wall time can be dominated by the shuffle even when the aggregation is trivial.**

- **Key skew turns one partition into a bottleneck.** If customer `UNKNOWN` owns 40% of events, ordinary key partitioning cannot spread it: most workers finish while one grinds through the hot key, creating a long tail and possibly exhausting memory. **Salting** splits it into `(UNKNOWN, shard_0 … shard_99)`, aggregates each, then shuffles the partial results back to `UNKNOWN`. That adds a stage but distributes the work — and the shard assignment must be *deterministic* when replay consistency matters (exactly the property from the previous lesson).

- **Joins cause shuffle *and* multiplicative output.** 100 rows joined against 1,000 at one key produces up to 100,000 pairs; a co-group does not make that semantic explosion cheap. Pre-aggregate, deduplicate, filter, or reformulate the model when full pairwise output is not needed.

- **The four questions.** **What** is computed (the algebra — exact distinct count and an approximate sketch have very different state and shuffle costs). **Where** in *event time* it is grouped: fixed windows (non-overlapping), sliding (overlapping), session (grouped by inactivity gaps). **When** results are emitted — the watermark fires an on-time result, early triggers emit speculative updates, late triggers revise. **How** later refinements relate to earlier output: **discarding** emits only what changed since the last firing, **accumulating** emits the full updated aggregate, **retracting** (where supported) withdraws a prior result before publishing a correction.

- **Event time decides window membership, not arrival time.** For fixed five-minute windows, an event at 10:07 belongs to `[10:05, 10:10)` whether it arrives at 10:08 or 10:20. Correct timestamp assignment is therefore part of *source ingestion*. If the source has no trustworthy event time, processing-time windows answer a genuinely different question.

- **Accumulation mode is a contract with the sink, and it is where silent corruption lives.** *Example:* a window's early count is 8; two more events arrive before the on-time trigger. In accumulating mode the outputs are 8, then 10. A sink that naïvely sums both stores **18**, which is wrong. It must upsert by window and key — or receive deltas under discarding semantics. Pipeline and sink must be designed together.

**Rules to remember**

- Element-wise work (map, filter, most `ParDo`) fuses and stays local. Anything that must bring a key's values together shuffles.
- Use a combiner when the operation is associative and commutative; sending every raw value to one keyed group wastes bandwidth and memory.
- A watermark is an **estimate of event-time progress**, not a wall-clock promise and not proof that nothing earlier will arrive.
- Allowed lateness defines how long window state stays available — it trades correctness against latency and state cost.
- A complete design states: element type and key, computation, timestamp source, window function, trigger, allowed lateness, accumulation mode, state cleanup, and sink write semantics. Anything left implicit is a runner default that may be syntactically correct and wrong for the product.

**Common pitfalls**

- **Assuming runner independence means identical behaviour.** Beam defines semantics; runners differ in autoscaling, fusion, checkpointing, supported features, metrics and performance. Test logic with small deterministic cases, then load-test the actual runner.
- **Treating a multi-gigabyte dimension as a side input.** Side inputs are convenient only when the data fits the runner's distribution mechanism. Otherwise use a keyed join, an external service, or a runner-specific optimized join.
- **Leaving a side output unsunk.** A parse transform emitting malformed records to a quarantine output is only useful if something reads it. Every branch needs a sink or an explicit decision to discard — otherwise errors become invisible.
- **Fixing skew by assigning overflow "wherever there is room".** That reintroduces the nondeterminism the previous lesson spent its whole budget removing.
- **Replacing a shuffle with millions of synchronous API calls.** External enrichment avoids the shuffle but adds remote latency and rate limits. Batch requests, cache immutable lookups, set timeouts, make retries idempotent — and check it is actually an improvement.
- **Trusting a pipeline diagram.** A shuffle can hide inside a composite transform. Read the runner's execution graph to find materialization boundaries, and optimize the largest movement first rather than micro-optimizing local parsing.
- **Testing only with ordered local samples.** That avoids precisely the failures that make streaming semantics necessary. Feed events out of order, advance a test watermark, fire early and late panes, assert exact outputs.

**How to approach the questions**

1. When a question asks why a job is slow or expensive, look for the shuffle first: `GroupByKey`, a join, a distinct. Then ask whether a combiner could have reduced data before transfer, and whether one key is hot.
2. For window-membership questions, use the event timestamp and ignore arrival time entirely. That is usually the whole trick.
3. For "the numbers came out wrong at the sink", check accumulation mode against the sink's write semantics — accumulating output written with append/sum is the standard planted error.
4. Watch the watermark distractors: it is an estimate driven by observed progress, partitions and idleness, so one stalled input partition can delay on-time firing. It never guarantees that no earlier event will arrive.

**Where this leads**: this lesson names windows, watermarks, triggers and accumulation. The next one, **Streaming Semantics**, is where each becomes a decision with consequences — including what "exactly-once" actually promises.
