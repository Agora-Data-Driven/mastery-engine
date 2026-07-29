Joins are how relational data gets recombined: the normalized tables that keys hold apart, joins bring back together at query time. Every retrieval pipeline you operate does this constantly, whether it is attaching document metadata to chunk hits or attaching evaluation labels to ranked results, and the two ways joins go wrong (rows silently vanishing, rows silently multiplying) are the two most expensive silent bugs in data work. This lesson gives you the complete join vocabulary and, more importantly, the row-count discipline to use it safely.

## Inner Joins: Matching Rows on Keys

The cleanest mental model of a join is the logical one: `FROM a JOIN b ON <condition>` forms the **Cartesian product** of the two tables (every row of `a` paired with every row of `b`), then keeps only the pairs where the `ON` predicate evaluates to `TRUE`. No engine literally builds the product; but every join's *meaning* is exactly this, and reasoning from it never lies.

An **inner join** keeps only matched pairs. Given:

`users`

| user_id | country |
|---|---|
| 1 | 'PH' |
| 2 | 'SG' |
| 3 | 'PH' |

`orders`

| order_id | user_id | amount |
|---|---|---|
| 10 | 1 | 40 |
| 11 | 1 | 250 |
| 12 | 3 | 120 |

```sql
SELECT u.user_id, u.country, o.order_id, o.amount
FROM   users u
JOIN   orders o ON o.user_id = u.user_id;
```

Result: three rows, `(1,PH,10,40)`, `(1,PH,11,250)`, `(3,PH,12,120)`. User 1 appears **twice**, once per matching order; user 2 appears **zero** times, having no match. Both behaviors are definitional, not bugs: an inner join's output cardinality is the number of matching pairs, which can be smaller *or larger* than either input.

Details that matter. The `ON` condition is usually key equality (an *equi-join*), typically foreign key to primary key, but it can be any predicate (`ON o.created_at BETWEEN c.start_at AND c.end_at` is a legitimate range join). Table aliases (`users u`) are near-mandatory once two tables carry same-named columns; `u.user_id` disambiguates. `JOIN` and `INNER JOIN` are synonyms. And because comparisons with `NULL` are `UNKNOWN` (recall three-valued logic), **a row whose join key is `NULL` matches nothing, ever**, not even another `NULL`: `NULL = NULL` is `UNKNOWN`, and joins keep only `TRUE`.

Logically, the join happens inside `FROM`, i.e. first in evaluation order: `FROM`+`JOIN` build the combined rows, then `WHERE` filters them, then `SELECT` projects. For inner joins, a condition placed in `ON` or in `WHERE` yields identical results, and experts still put join keys in `ON` and business filters in `WHERE` purely for readability. That equivalence is about to break for outer joins, which is why the habit matters.

Judgment layer: before writing any join, know each side's **grain**, i.e. what one row represents, and whether the join key is unique on each side. FK→PK joins are at-most-one match per FK row and thus safe; anything else demands the fan-out analysis at the end of this lesson.

## LEFT, RIGHT, and FULL Outer Joins and Unmatched Rows

Inner joins drop unmatched rows. Often that is data loss: "show all users and their order totals" must include users with no orders. **Outer joins** keep unmatched rows and pad the missing side with `NULL`.

- `LEFT JOIN` (left outer): every row of the left table survives. Matched rows look like inner-join rows; a left row with no match appears once, with every column of the right table `NULL`.
- `RIGHT JOIN`: mirror image; every right row survives. Rarely written in practice, since `a RIGHT JOIN b` is just `b LEFT JOIN a` with the tables swapped, and pipelines read better when the preserved table comes first.
- `FULL JOIN` (full outer): every row of both tables survives; unmatched rows from either side are padded with `NULL` on the other side. The canonical use is **reconciliation**: full-join yesterday's export to today's on the key, and rows with `NULL` on one side are the adds and deletes.

On our data, `users u LEFT JOIN orders o ON o.user_id = u.user_id` returns four rows: the three inner rows plus `(2, 'SG', NULL, NULL)`.

Now the trap that catches working engineers weekly: **filtering the nullable side in `WHERE` silently turns a left join into an inner join.**

```sql
SELECT u.user_id, o.amount
FROM   users u
LEFT JOIN orders o ON o.user_id = u.user_id
WHERE  o.amount > 100;      -- user 2's row has o.amount = NULL
```

User 2's preserved row has `o.amount = NULL`; the predicate evaluates `UNKNOWN`; `WHERE` drops it. Every unmatched left row dies the same way, so the "LEFT" accomplished nothing. The fix depends on intent:

```sql
-- keep all users; only join to their big orders
FROM users u LEFT JOIN orders o
  ON o.user_id = u.user_id AND o.amount > 100
```

For outer joins, `ON` and `WHERE` are **not** interchangeable: a condition in `ON` decides *what counts as a match* (failing it just leaves the left row unmatched-but-preserved), while a condition in `WHERE` filters *the joined result* (failing it deletes the row). If you genuinely want only matched-and-large rows, use an inner join and say so. The other correct pattern is explicitly allowing the padding through: `WHERE o.amount > 100 OR o.order_id IS NULL`.

Judgment layer: `IS NULL` on the right side's key after a left join is the standard "find the childless parents" idiom (`WHERE o.order_id IS NULL` returns exactly user 2), but test a column that is `NOT NULL` in the base table (the PK is ideal); testing a naturally-nullable column like a free-text field cannot distinguish "no match" from "matched row that happens to have NULL there."

## Semi-Joins and Anti-Joins with EXISTS and NOT EXISTS

Often the question is not "combine these tables" but merely "**does a match exist?**" Which users have at least one order? A `JOIN` answers it badly: user 1 comes back twice (once per order), forcing a `DISTINCT` to clean up duplication you never wanted. The relational operation you want is the **semi-join**: return each left row at most once if any match exists. SQL spells it `EXISTS`:

```sql
SELECT u.user_id
FROM   users u
WHERE  EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.user_id);
```

Read it as: for each `users` row, probe `orders` for at least one row satisfying the condition; keep the user if the probe finds one. The inner `SELECT 1` returns nothing of interest; `EXISTS` only asks whether *any* row comes back, and the engine stops probing at the first hit (a real efficiency win when users have thousands of orders). Output grain: exactly the grain of `users`, never multiplied, no `DISTINCT` needed. Result here: users 1 and 3, once each.

The **anti-join** is the negation, "left rows with *no* match," spelled `NOT EXISTS`:

```sql
SELECT u.user_id
FROM   users u
WHERE  NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.user_id);
```

Returns user 2. This is semantically the same question as the left-join-then-`IS NULL` idiom, and optimizers usually execute both identically; `NOT EXISTS` states the intent more directly.

Why not `NOT IN`? `WHERE u.user_id NOT IN (SELECT user_id FROM orders)` looks equivalent and is the direct descendant of the lesson-01 trap: if `orders.user_id` contains even one `NULL`, the expansion contains a `<> NULL` conjunct, every row's predicate is `UNKNOWN`, and the query returns **zero rows**, silently. `NOT EXISTS` has no such failure mode, because the probe's comparison happening to be `UNKNOWN` simply means that probe row is not a match. Rule of practice: `IN` is tolerable, `NOT IN` against anything nullable is a defect; write `NOT EXISTS`.

Judgment layer: choose the form by output grain. Need columns from the other table, or one output row per *match*? Join. Need each left row at most once, filtered by existence? Semi/anti-join. Deduplicating a join with `DISTINCT` to fake a semi-join both wastes work and can mask real duplication elsewhere in the query; treat a `DISTINCT` that "fixed" a count as a flag that the grain went wrong upstream.

## Join Fan-out: Row Duplication When Keys Are Not Unique

**Fan-out** is what happens when the join key is not unique on the far side: each left row is duplicated once per match. Joining `users` (one row per user) to `orders` on `user_id` produces one row per *order*, because `user_id` is not unique in `orders`. The join silently changed the result's grain from "user" to "user-order pair."

The counting rule: if a key value appears $m$ times on the left and $n$ times on the right, the join emits $m \times n$ rows for that value. FK→PK is the safe case ($n = 1$, at most). Many-to-many is the dangerous one: joining `users` to `orders` *and* to `logins` (both one-to-many) in one query yields, for a user with 3 orders and 4 logins, $3 \times 4 = 12$ rows, every order duplicated 4 times and every login 3 times. Nothing errored. The result simply answers a question nobody asked.

Fan-out is not inherently wrong; "one row per order with user attributes attached" is often exactly the goal. It becomes a defect when the *consumer assumes the old grain*: any downstream count or total computed over fanned-out rows is inflated by the duplication factor. In our example, summing `amount` after also joining `logins` counts each order four times; a report built on it overstates revenue by 4× for that user, and by a *different* factor for users with different login counts, which makes the error maddening to spot because no single scale factor explains it.

Detection and prevention discipline:

1. **Know the expected grain** of the result before writing the query, and which side of every join is unique on the key. A `UNIQUE` constraint is a machine-checked guarantee; a naming convention is a hope.
2. **Assert cardinality**: if the result should be one row per user, check `COUNT(*)` equals the user count, or check the key for duplicates, immediately after the query, in code or in tests. Row-count assertions are the join world's unit tests, and they are exactly the same discipline as asserting your retrieval evaluation set has one judgment per query-document pair before computing metrics: a duplicated label row inflates recall the same way a fanned-out join inflates revenue.
3. **Combine at matching grain**: when you need per-user order totals *and* per-user login counts, aggregate each side to one row per user *first*, then join the two one-row-per-user results. Reducing before joining is the general cure for many-to-many fan-out (the aggregation tools arrive next lesson).

Judgment layer: experienced reviewers read every join in a query asking one question, "what can this multiply?" One-to-one: nothing. One-to-many: the one side. Many-to-many: both, multiplicatively, and the query almost certainly needs restructuring. Making that question reflexive is most of what "being good at SQL joins" means in practice.
