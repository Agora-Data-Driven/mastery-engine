Production SQL is rarely one flat operation. Retrieval evaluation may filter valid judgments, aggregate per query, compare against a baseline, and combine current with historical runs. Correct composition requires named grains, clear dependency direction, and explicit duplicate semantics. CTEs, subqueries, and set operators provide those tools, but none absolves the author from reasoning about what one row represents at every stage.

## Common Table Expressions for Readable Query Pipelines

A **common table expression** (CTE) gives a query result a temporary name within one statement:

```sql
WITH valid_runs AS (
  SELECT query_id, model_version, reciprocal_rank
  FROM evaluation_runs
  WHERE judged = TRUE
),
per_model AS (
  SELECT model_version,
         COUNT(*) AS queries,
         AVG(reciprocal_rank) AS mrr
  FROM valid_runs
  GROUP BY model_version
)
SELECT *
FROM per_model
WHERE queries >= 100
ORDER BY mrr DESC;
```

Read it as a relational pipeline. `valid_runs` preserves query-run grain while defining the eligible population. `per_model` changes grain to model version. The final query filters model summaries. Each stage has a name and an inspectable contract.

CTEs are not stored tables and normally last only for the statement. They differ from views, which are catalog objects reusable across statements, and temporary tables, which materialize data for a session or script and can be indexed or reused by several statements. A CTE can reference earlier CTEs in the same `WITH` list, forming an acyclic dependency pipeline in ordinary nonrecursive use.

Mechanically, optimizers may **inline** a CTE, substituting its logic into consumers, or **materialize** it, computing and storing the intermediate result. Behavior varies by engine, query shape, and explicit hints. Therefore “CTEs always make a query faster” and “CTEs are always optimization fences” are both unreliable generalizations. Inspect the execution plan when repeated expensive work matters.

Worked grain example: raw `ranked_results` is one row per query-document. A first CTE filters to top 10. A second groups by query to compute reciprocal rank. A third averages across queries to produce one row per model. Writing all three in one nested expression is possible, but stage names make illegal column use and fan-out easier to spot.

A CTE referenced twice may be evaluated once or its inlined logic may execute twice. If a costly stable intermediate must be computed exactly once, reused across several statements, or audited independently, create a temporary or persisted table explicitly. Materialization costs a write and later read, so it is not free.

CTEs can also hide bad design when used as a pile of tiny aliases with no grain or semantic boundary. A useful stage normally performs one meaningful transformation: population filter, deduplication, aggregation, enrichment, or final projection. Name it after what its rows mean, such as `latest_event_per_id`, not `cte2`.

Column selection is part of the contract. Passing `SELECT *` through every stage obscures which attributes remain valid after a grain change and moves unnecessary bytes through shuffles. Project stable keys and required measures explicitly. During development, query each CTE independently by temporarily making it the final `SELECT`; check row counts and uniqueness at every boundary. Those checks turn a long statement into a sequence of testable transformations rather than one opaque result.

Recursive CTEs exist for hierarchies and graph-like iteration, but they are outside this lesson's composition goal. For ordinary pipelines, the judgment rule is: use CTEs to make grain transitions and dependencies visible; use execution plans and explicit materialization choices for performance. Readability helps correctness, but syntax alone promises no physical strategy.

## Correlated vs Uncorrelated Subqueries

A **subquery** is a query nested inside another query. An **uncorrelated subquery** has no reference to columns from its outer query, so it can be evaluated independently. A **correlated subquery** refers to the current outer row; logically it is reevaluated for each outer row.

Uncorrelated example:

```sql
SELECT document_id, score
FROM ranked_results
WHERE score > (SELECT AVG(score) FROM ranked_results);
```

The inner average is global and independent. Compute it once, then compare every outer row. If scores are 0.9, 0.6, and 0.3, the average is 0.6 and only 0.9 qualifies.

Correlated example:

```sql
SELECT r.query_id, r.document_id, r.score
FROM ranked_results r
WHERE r.score > (
  SELECT AVG(r2.score)
  FROM ranked_results r2
  WHERE r2.query_id = r.query_id
);
```

The inner query uses `r.query_id`, so each outer row is compared with its own query's average. For q1 scores 0.9 and 0.5, average 0.7 retains 0.9; for q2 scores 0.8, 0.7, and 0.6, average 0.7 retains 0.8. The same inner SQL has different input per outer row.

Correlation is especially natural with `EXISTS`:

```sql
SELECT d.document_id
FROM documents d
WHERE EXISTS (
  SELECT 1
  FROM chunks c
  WHERE c.document_id = d.document_id
    AND c.embedding_status = 'failed'
);
```

This states “keep documents having at least one failed chunk” and preserves document grain. Optimizers commonly rewrite it as a semi-join and stop after the first match.

The logical per-row model explains semantics, not necessarily physical execution. A capable optimizer may **decorrelate** a subquery into a join and aggregate. But correlation can block decorrelation when it contains complex limits, volatile functions, inequality conditions, or engine-specific constructs. A literal nested-loop execution over one million outer rows can be disastrous if each inner evaluation scans a large table.

Worked cost: 1,000,000 documents each ask for `MAX(updated_at)` among chunks. With no useful index and ten million chunks, naive per-document scans approach an impossible product. Pre-aggregate once:

```sql
WITH latest AS (
  SELECT document_id, MAX(updated_at) AS latest_at
  FROM chunks
  GROUP BY document_id
)
SELECT d.document_id, l.latest_at
FROM documents d
LEFT JOIN latest l USING (document_id);
```

This scans chunks once, builds one row per document, then joins. A composite index on `(document_id, updated_at)` might also make correlated lookups efficient, especially when the outer set is small.

Scalar subqueries must return at most one row; otherwise the statement errors. Aggregates without grouping guarantee one row, though that value may be `NULL`. `IN` and `EXISTS` accept sets. Correlated `NOT EXISTS` is the safest exclusion form when nullable keys are involved, building on the earlier join lesson.

NULL behavior still applies inside comparisons. If an uncorrelated scalar aggregate returns `NULL`, `score > NULL` is `UNKNOWN` and filters every row. `EXISTS` avoids interpreting returned values entirely; it tests only whether at least one qualifying row exists. When using a scalar subquery, decide whether an empty input should yield unknown, zero, or a fallback, and apply `COALESCE` only when that fallback matches the domain.

Judgment depends on clarity, outer cardinality, indexes, and plan. Correlation is not automatically bad: ten indexed probes can beat aggregating a billion-row table. It becomes risky when the outer set is large and the inner work is not a cheap keyed probe. State the logical intent cleanly, then verify whether the optimizer decorrelates or the index makes repeated probes affordable.

## UNION vs UNION ALL and Duplicate Semantics

`UNION ALL` concatenates compatible result sets and preserves every row. `UNION` concatenates them and then removes duplicate rows across the complete selected tuple. Both require the same number of columns in corresponding positions with compatible types; output column names normally come from the first branch.

Example:

`current` contains `(q1,d1)` and `(q2,d2)`. `archive` contains `(q2,d2)` and `(q3,d3)`.

```sql
SELECT query_id, document_id FROM current
UNION ALL
SELECT query_id, document_id FROM archive;
```

returns four rows, including `(q2,d2)` twice. Replacing `UNION ALL` with `UNION` returns three distinct pairs.

Duplicate identity covers all selected columns. If branches select `(query_id, document_id, score)`, rows `(q2,d2,0.8)` and `(q2,d2,0.7)` are not duplicates. If business identity is only `(query_id,document_id)`, `UNION` over the score cannot decide which score should survive. Use an explicit rule such as `ROW_NUMBER` ordered by source priority and update time.

`UNION` requires deduplication through hashing or sorting. Like `COUNT DISTINCT`, that means memory, possible spill, and often distributed shuffle. `UNION ALL` can stream or concatenate branches with much less coordination. Therefore default to `UNION ALL` when duplicates are impossible by construction or are meaningful, and choose `UNION` only when set semantics are part of correctness.

Worked pipeline: daily partitions are disjoint by enforced event date. Combining July 24 and July 25 should use `UNION ALL`; deduplication spends resources to prove an invariant already guaranteed by partition constraints. Combining overlapping retry exports may require deduplication, but plain `UNION` is adequate only if duplicate rows are byte-for-byte equal. If retries have different ingestion timestamps, a keyed latest-wins policy is required.

Neither operator guarantees output order. `ORDER BY` belongs once at the end of the compound query. Ordering individual branches does not define final order and may be rejected unless paired with a branch-local `LIMIT` inside a subquery. Likewise, `LIMIT` after a union applies to the combined result.

Set operators align columns by **position**, not by alias:

```sql
SELECT document_id, score FROM sparse_hits
UNION ALL
SELECT score, document_id FROM dense_hits;
```

is a defect even if coercion makes it run; values cross semantic columns. Use identical explicit column order and cast types intentionally. Avoid `SELECT *`, because schema evolution in one branch can change positions or make the union fail.

`UNION` also removes duplicates within each branch, not merely overlaps between branches. That can mask upstream duplicate defects just as `DISTINCT` can. If duplicates are unexpected, assert branch uniqueness and investigate rather than using set semantics as cleanup.

Provenance often resolves ambiguity. Add a literal source column in each branch, such as `'current' AS source`, before `UNION ALL`; then a later ranking stage can prefer current data while retaining an audit trail. Note that this source column makes otherwise equal rows distinct to plain `UNION`, another reason keyed deduplication should be explicit when precedence matters.

Judgment asks three questions: are duplicate rows valid events or redundant copies; what columns define business identity; and which row should win when non-key attributes disagree? `UNION ALL` answers only concatenation. `UNION` answers exact-tuple set membership. Anything involving keyed precedence, freshness, or source trust requires an explicit deduplication stage after concatenation.
