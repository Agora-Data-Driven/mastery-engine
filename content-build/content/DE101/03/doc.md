Aggregation changes the grain of a result: millions of event rows become one row per customer, day, model version, or query class. That collapse powers retrieval evaluation summaries and pipeline monitoring, but it is also where silent errors flourish because filters can act on the wrong side of the collapse and joins can multiply rows before totals are computed. Correct SQL starts by naming the intended output grain and tracing how each clause reaches it.

## GROUP BY Mechanics and Aggregate Functions

`GROUP BY` partitions the input rows into equivalence classes: rows belong to the same group when their grouping expressions compare equal for grouping purposes. The query then emits one result row per group. Aggregate functions consume all rows in a group and return one value: `COUNT`, `SUM`, `AVG`, `MIN`, and `MAX` are the core set.

Given:

| query_class | latency_ms |
|---|---:|
| factoid | 120 |
| factoid | 180 |
| research | 900 |
| factoid | NULL |

```sql
SELECT query_class,
       COUNT(*) AS requests,
       COUNT(latency_ms) AS measured,
       SUM(latency_ms) AS total_ms,
       AVG(latency_ms) AS avg_ms
FROM retrieval_runs
GROUP BY query_class;
```

The `factoid` group produces `requests=3`, `measured=2`, `total_ms=300`, and `avg_ms=150`. `COUNT(*)` counts rows, including rows containing `NULL`. `COUNT(expression)` counts only rows where that expression is non-`NULL`. `SUM` and `AVG` ignore `NULL`; `AVG(x)` is effectively `SUM(x)/COUNT(x)`, not `SUM(x)/COUNT(*)`. `MIN` and `MAX` also ignore `NULL`. If every input value is `NULL`, these value aggregates return `NULL`, while counts return zero.

Without a `GROUP BY`, the complete filtered input is one implicit group, so `SELECT COUNT(*) FROM retrieval_runs` emits one row. With multiple grouping columns, the grain is their combination:

```sql
SELECT run_date, model_version, COUNT(*) AS requests
FROM retrieval_runs
GROUP BY run_date, model_version;
```

One output row represents one date-version pair. `NULL` grouping values form a group together, unlike equality joins where `NULL = NULL` is not true. This grouping behavior is intentional: all rows with unknown `model_version` can still be counted under one `NULL` bucket.

Logical evaluation order explains the mechanism. `FROM` and joins form input rows; `WHERE` filters individual rows; `GROUP BY` creates groups; aggregates are computed; `HAVING` filters groups; `SELECT` produces expressions; `ORDER BY` sorts; `LIMIT` trims. The engine may execute differently, but results must match that model.

Judgment begins with grain. If the desired result is one row per document, group by `document_id`; adding `chunk_id` changes it to one row per document-chunk and defeats the collapse. Aggregation cannot repair earlier fan-out: joining orders to both line items and logins before summing duplicates amounts multiplicatively. Aggregate each one-to-many source to the target grain first, then join. Finally, decide whether missing values mean “unknown” and should remain `NULL`, or genuinely mean zero; applying `COALESCE` without that semantic decision can turn missing measurements into fabricated zeros.

## HAVING vs WHERE: Filtering Before and After Aggregation

`WHERE` filters input rows before groups exist. `HAVING` filters completed groups after aggregate values exist. The distinction changes both meaning and cost.

Suppose daily retrieval rows contain `status`, `latency_ms`, and `model_version`. To find model versions whose **successful requests** have average latency above 500 ms:

```sql
SELECT model_version, AVG(latency_ms) AS avg_latency
FROM retrieval_runs
WHERE status = 'success'
GROUP BY model_version
HAVING AVG(latency_ms) > 500;
```

`WHERE` first removes failures; the average is computed only over successes. `HAVING` then removes version groups whose computed average is at most 500. Moving `status='success'` to `HAVING` is invalid in portable SQL because `status` is neither grouped nor aggregated. Moving `AVG(latency_ms)>500` to `WHERE` is impossible because no group average exists at that stage.

A predicate on a grouping key can normally appear in either clause without changing results:

```sql
WHERE model_version = 'v3'
```

or

```sql
HAVING model_version = 'v3'
```

Both ultimately retain the v3 group, but `WHERE` is preferable: it discards irrelevant rows before grouping, reduces shuffle and aggregate state, and states that the condition concerns source rows rather than a group calculation. Optimizers may push a safe `HAVING` predicate down automatically, but clear SQL should not depend on that rewrite.

Worked numbers: version A has successful latencies 100 and 300 plus one failed request at 2,000; version B has successful latencies 700 and 900. Filtering failures in `WHERE` yields averages A=200 and B=800, so `HAVING AVG(...)>500` returns B. If all rows are grouped first and a careless calculation includes failure latency, A becomes 800 and incorrectly qualifies. The placement encoded which population the metric described.

`HAVING COUNT(*) >= 100` is a common reliability gate: retain only query classes with enough observations. `HAVING COUNTIF(relevant)` or dialect-equivalent conditional aggregates can filter by group evidence. Where portability matters, use `SUM(CASE WHEN relevant THEN 1 ELSE 0 END)`.

Judgment: push row-level filters into `WHERE` for meaning and efficiency, but do not push a filter when it would alter the aggregate population. “Customers with 2026 revenue above $1,000” requires `WHERE order_year=2026`, then `HAVING SUM(amount)>1000`. Filtering orders after aggregation would be too late; filtering individual orders by `amount>1000` would answer a different question. Say the population and the group test in words before placing clauses.

## COUNT DISTINCT and the Cost of Deduplication

`COUNT(DISTINCT expression)` counts unique non-`NULL` values within each group. It differs from both row count and non-null count:

| query_id | document_id |
|---|---|
| q1 | d7 |
| q1 | d7 |
| q1 | d9 |
| q1 | NULL |

For q1, `COUNT(*)=4`, `COUNT(document_id)=3`, and `COUNT(DISTINCT document_id)=2`. Duplicate d7 contributes once, and `NULL` contributes zero.

The engine must maintain or derive a set of seen values. A hash-based aggregate stores distinct keys in memory, expected $O(n)$ work but memory proportional to distinct cardinality. A sort-based plan orders values and removes adjacent duplicates, $O(n\log n)$ comparison work but can spill and merge predictably. In a distributed warehouse, rows with the same distinct key often must be shuffled to the same worker, making network movement the dominant cost.

Worked scale: one billion events contain 200 million unique user IDs. Ordinary `COUNT(*)` needs only one integer counter per partial aggregate. Exact `COUNT(DISTINCT user_id)` may need state representing 200 million IDs, plus repartitioning and merge. The SQL text differs by one word, but the physical problem changes from scalar accumulation to large-set construction.

Multiple dimensions amplify state. `COUNT(DISTINCT user_id)` per day can be computed independently for each day, but summing daily distinct counts does **not** give monthly unique users because a user active on three days is counted three times. Distinct counts are non-additive across overlapping groups. The correct monthly count must deduplicate at month grain.

Before using `DISTINCT`, diagnose why duplicates exist. If a join accidentally fans each query judgment out across several logs, `COUNT(DISTINCT query_id)` may hide the row multiplication while `SUM(cost)` remains wrong. Repair the join grain rather than sprinkling `DISTINCT`. When duplication is legitimate, such as repeated events for one active user, distinct is the intended statistic.

At large scale, approximate algorithms such as HyperLogLog store a compact sketch and estimate cardinality with known error instead of retaining every ID. They are appropriate for dashboards and capacity trends where a small relative error is acceptable, not for billing, uniqueness constraints, or exact evaluation denominators. Another optimization is pre-aggregation: deduplicate `(day,user_id)` close to ingestion, then count a far smaller table at day grain, while remembering it still cannot be summed across months.

Judgment weighs exactness, grain, and reuse. Inspect the execution plan for large shuffle or spill, cluster data on grouping keys when repeated workloads justify it, and materialize reusable deduplicated grains. `COUNT DISTINCT` is not “a slightly slower count”; it is a distributed set problem.

## GROUP BY Pitfalls: Non-Aggregated Columns

After grouping, each output group may contain many source rows. A selected expression must therefore either be a grouping expression, be aggregated to one value, or be functionally determined in a way the SQL dialect explicitly recognizes. Otherwise the query asks for an arbitrary value.

This query is invalid in standard SQL:

```sql
SELECT customer_id, order_id, SUM(amount)
FROM orders
GROUP BY customer_id;
```

One customer may have many `order_id` values. Which one should the single customer output row display? Strict engines reject it. Some permissive modes choose an arbitrary member, producing results that can change with execution plan, storage order, or parallelism. Adding `order_id` to `GROUP BY` makes the query legal but changes grain to one row per customer-order; it does not preserve the intended customer summary.

The correct repair follows intent. If no order ID is needed, omit it. If the latest order is needed, compute that concept explicitly using a later window-function technique or an aggregate designed for value-at-extreme semantics. If any representative truly suffices, use an explicit `ANY_VALUE(order_id)` where supported and document the nondeterminism. If each customer is guaranteed one order, enforce that uniqueness rather than relying on hope.

Worked retrieval example:

```sql
SELECT query_id, document_id, MAX(score)
FROM ranked_results
GROUP BY query_id;
```

This does not return the document with maximum score. `MAX(score)` chooses a score, while an arbitrary `document_id` is unrelated to the row producing it. For q1 rows `(d1,0.9)` and `(d2,0.7)`, the desired pair is `(d1,0.9)`, but permissive SQL may emit `(d2,0.9)`, a combination that never existed. Aggregates operate independently unless a function explicitly preserves row association.

Functional dependencies explain a safe-looking case. If `customer_id` is a declared primary key in a grouped table, `customer_name` is determined by it. Some engines allow selecting the name; others require grouping or aggregation for portability. Joining a dimension before grouping can also break the dependency if the supposedly unique key is duplicated. The robust pattern is to aggregate facts at key grain, then join the one-row-per-key dimension.

Aliases and expression equivalence vary by dialect. A portable query repeats the exact grouping expression or uses a subquery:

```sql
WITH labeled AS (
  SELECT DATE(event_time) AS event_date, latency_ms
  FROM runs
)
SELECT event_date, AVG(latency_ms)
FROM labeled
GROUP BY event_date;
```

Judgment rule: every selected column must have a one-value-per-output-group explanation. “It happens to look constant” is not one. A key constraint, an explicit aggregate, or inclusion in the group is. Treat permissive non-aggregated selection as a correctness defect because distributed execution is free to choose a different representative tomorrow.
