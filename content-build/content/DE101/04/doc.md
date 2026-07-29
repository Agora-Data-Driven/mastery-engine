Retrieval and pipeline analysis constantly need group context without losing individual rows: rank documents inside each query, compare today with yesterday, or attach a rolling latency average to every request. Window functions provide that context while preserving row grain. Their power depends on three separate choices that must never be blurred: which rows share a partition, how rows are ordered, and which ordered rows belong to the current frame.
Because the original rows survive, several windows can be computed side by side in one query, each with a different partition, order, or frame. That composability is powerful, but it also makes explicit naming and review of every window specification essential.

## OVER and PARTITION BY: Aggregating Without Collapsing Rows

A regular aggregate with `GROUP BY` collapses many input rows into one row per group. A **window function** computes over a related set of rows and attaches the result to every input row. The `OVER (...)` clause defines that set.

Given:

| query_id | document_id | score |
|---|---|---:|
| q1 | d1 | 0.90 |
| q1 | d2 | 0.70 |
| q2 | d3 | 0.80 |

```sql
SELECT query_id, document_id, score,
       AVG(score) OVER (PARTITION BY query_id) AS query_avg
FROM ranked_results;
```

The result still has three rows. Both q1 rows receive 0.80, while q2 receives 0.80. `PARTITION BY query_id` divides rows into independent windows, but unlike `GROUP BY query_id`, it does not change the grain from query-document to query.

Omit `PARTITION BY` and the partition is the full result after `FROM`, joins, and `WHERE`; every row receives the global average. Window functions are logically evaluated after grouping and `HAVING` but before final `ORDER BY`. They can therefore operate on grouped output:

```sql
SELECT run_date,
       COUNT(*) AS requests,
       SUM(COUNT(*)) OVER () AS all_requests
FROM runs
GROUP BY run_date;
```

`COUNT(*)` first creates one count per date; the outer windowed `SUM` adds those grouped rows without collapsing them further.

Common aggregate functions become windows when followed by `OVER`: `SUM`, `AVG`, `MIN`, `MAX`, and `COUNT`. Ranking and navigation functions exist only as windows. SQL does not generally allow a window result in `WHERE` because `WHERE` runs earlier. Use a subquery or, in dialects such as BigQuery, `QUALIFY`:

```sql
SELECT *
FROM ranked_results
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY query_id ORDER BY score DESC, document_id
) <= 10;
```

This retains top ten rows per query. A global `LIMIT 10` would retain ten rows total, a different grain.

Worked judgment: attaching `COUNT(*) OVER (PARTITION BY source_document_id)` to chunk rows identifies how many chunks came from each source while retaining every chunk for inspection. Grouping would lose chunk detail. But windows can amplify earlier join defects: if a join duplicated each chunk, both row count and window count are wrong. Preserve the intended base grain before adding analytic context.

Partitions can be expensive because the engine must colocate rows sharing keys, often through shuffle. An unpartitioned global window can funnel enormous state into one logical partition. Partition on the real analytical unit, filter early, and select only needed columns, while remembering that changing the partition key changes the question.

## Ranking Functions: ROW_NUMBER, RANK, DENSE_RANK

Ranking windows require `ORDER BY` inside `OVER`. `ROW_NUMBER`, `RANK`, and `DENSE_RANK` differ only when ordered values tie.

For scores 100, 90, 90, 70 ordered descending:

| score | ROW_NUMBER | RANK | DENSE_RANK |
|---:|---:|---:|---:|
| 100 | 1 | 1 | 1 |
| 90 | 2 or 3 | 2 | 2 |
| 90 | 3 or 2 | 2 | 2 |
| 70 | 4 | 4 | 3 |

`ROW_NUMBER` assigns a unique sequence, so tied rows still receive different numbers. Without a complete tie-breaker, which 90 receives 2 is nondeterministic. Add a stable key:

```sql
ROW_NUMBER() OVER (
  PARTITION BY query_id
  ORDER BY score DESC, document_id ASC
)
```

`RANK` gives equal ordered values the same rank, then leaves gaps: two rows at rank 2 mean the next is rank 4 because three rows precede it. `DENSE_RANK` also ties equals but leaves no gaps, so the next distinct score is rank 3.

Choose by semantics. “Select exactly one latest event per entity” uses `ROW_NUMBER` with deterministic tie-breakers, then keeps row 1. “Competition position” uses `RANK`: if two entrants tie for second, the next is fourth. “Group into the first three distinct score tiers” uses `DENSE_RANK <= 3`; it may return more than three rows.

Worked deduplication:

```sql
SELECT *
FROM events
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY event_id
  ORDER BY updated_at DESC, ingest_id DESC
) = 1;
```

One row survives per `event_id`: latest timestamp, then largest stable ingestion ID. Omitting `ingest_id` makes equal-timestamp duplicates nondeterministic. Using `RANK=1` could retain several tied rows and fail deduplication.

Ranking order and final display order are separate. `ORDER BY` inside `OVER` determines rank; the query's final `ORDER BY` determines presentation. A result can compute rank by score then display by query ID. Never assume a window order controls output row order.

Judgment: ties often expose insufficient metric precision. Rounding similarity to two decimals before ranking creates artificial ties; rank on the full score and round only for display. Conversely, if the business truly treats equal values as equal tiers, adding an arbitrary tie-breaker to `RANK` destroys the tie because the complete ordered tuple differs. Add tie-breakers to `ROW_NUMBER`, but for `RANK` or `DENSE_RANK` include only attributes that define a real tie.

## Ordered Windows: Running Totals and Moving Averages

Adding `ORDER BY` to an aggregate window introduces order-sensitive calculation. A **window frame** defines which ordered rows contribute to the current row. A running total usually uses:

```sql
SUM(cost) OVER (
  PARTITION BY project_id
  ORDER BY event_time, event_id
  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)
```

The first row includes itself; each subsequent row includes every earlier row in the partition. For costs 10, 20, 5, running totals are 10, 30, 35.

A three-row moving average uses:

```sql
AVG(latency_ms) OVER (
  ORDER BY event_time, event_id
  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
)
```

For latencies 10, 20, 30, 80, results are 10, 15, 20, and $(20+30+80)/3=43.33$. Early rows use the available smaller frame; SQL does not invent missing predecessors.

`ROWS` counts physical rows relative to the current row. `RANGE` groups **peers** sharing the same ordering value and can define value-based boundaries in supported dialects. This distinction makes default frames dangerous. Many engines default an ordered aggregate window to something equivalent to `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. If several events share the same timestamp, their running totals may jump together because each peer's frame includes all equal-timestamp peers.

Worked tie: amounts 10 and 20 share timestamp 09:00, followed by 5 at 10:00. With a `ROWS` frame and deterministic event-ID ordering, totals can be 10, 30, 35. With peer-inclusive `RANGE`, both 09:00 rows can show 30, then 35. Neither is universally wrong. `ROWS` answers “through this physical event”; `RANGE` answers “through this ordering value.”

Always state frames explicitly for production analytics. Include a stable tie-breaker when row sequence matters. For a time-duration average such as “previous 24 hours,” a fixed number of rows is wrong when event rate varies; use a supported time `RANGE`, join, or pre-bucketed time table. Conversely, “last 100 requests” is inherently a `ROWS` question.

Frames do not reduce result cardinality, and broad frames can require large state. A bounded trailing frame can stream with a limited buffer; unbounded or following-looking frames may require retaining more data. Partitioning by tenant or service can create parallel independent sequences, while one global running total imposes one total order and can be a scalability bottleneck.

## LAG and LEAD for Row-to-Row Comparison

`LAG(expression, offset, default)` retrieves a value from an earlier row in the window order; `LEAD` retrieves a later value. Default offset is one. They do not join rows by themselves: `PARTITION BY` and `ORDER BY` define what “previous” and “next” mean.

```sql
SELECT service, run_date, error_rate,
       LAG(error_rate) OVER (
         PARTITION BY service ORDER BY run_date
       ) AS previous_rate,
       error_rate - LAG(error_rate) OVER (
         PARTITION BY service ORDER BY run_date
       ) AS change
FROM daily_metrics;
```

For rates 0.02, 0.03, 0.01, previous values are `NULL`, 0.02, 0.03 and changes are `NULL`, 0.01, -0.02. The first row has no predecessor, so `LAG` returns its specified default or `NULL`. Replacing it with zero changes semantics from “no comparison exists” to “compare with zero”; do that only when zero is genuinely the baseline.

`LAG` compares rows, not necessarily adjacent time periods. If daily data omits Tuesday, Wednesday's `LAG` is Monday. To measure day-over-day change including missing days, join to a calendar and create the absent Tuesday row before applying `LAG`. Similarly, duplicate dates make ordering ambiguous; aggregate to one row per service-date or add a tie-breaker matching the intended event sequence.

Worked event-duration calculation:

```sql
event_time - LAG(event_time) OVER (
  PARTITION BY session_id ORDER BY event_time, event_id
) AS gap
```

This finds time since the prior event in each session. `LEAD(event_time) - event_time` finds time until the next. Session boundaries remain isolated by partitioning.

Navigation functions are often clearer and cheaper than self-joining a table to its previous row, but they operate by position. If the requirement is “value exactly seven days earlier,” use a date-keyed self-join or complete calendar unless the data guarantees one row per day. `LAG(value,7)` means seven rows earlier, not seven calendar days.

In the same navigation family, `FIRST_VALUE` and `LAST_VALUE` retrieve boundary values of the window or frame. `FIRST_VALUE(score) OVER (PARTITION BY query_id ORDER BY score DESC)` attaches each query's best score to every row, which turns absolute scores into relative ones, as in `score / FIRST_VALUE(score) OVER (...)` for within-query normalization. The frame caution from the previous section applies directly: `LAST_VALUE` with the default frame sees only rows up to the current one, so a full-partition frame must be declared when the intent is the partition's final value, not the value so far.

Judgment: define the analytical sequence explicitly. Partition at the entity whose history is independent; order by the true chronology plus a stable tie-breaker; decide whether gaps should be skipped or materialized; preserve `NULL` when no predecessor exists. Most incorrect `LAG` results are not function errors but failures to define “previous” with enough precision.
