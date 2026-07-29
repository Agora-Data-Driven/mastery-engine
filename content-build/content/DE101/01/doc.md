Every serious retrieval system you will build sits next to a relational database: the documents your BM25 engine indexes, the metadata your reranker filters on, and the evaluation labels you score against all live in tables somewhere. SQL is the language of those tables, and the relational model is the contract that makes queries over them predictable. This lesson establishes that contract, the core query shape (`SELECT`-`FROM`-`WHERE`), how results get ordered and truncated, and the one semantic landmine that bites every newcomer: `NULL`.

## Tables, Rows, and Keys: The Relational Contract

A relational database stores data in **tables** (the theory calls them *relations*). A table has a fixed **schema**: a named, typed set of columns declared up front. Every **row** (a *tuple*) supplies a value, or `NULL`, for every column. That is the first half of the contract: unlike a Firestore document, a row cannot carry extra ad-hoc fields, and it cannot omit a column. The database enforces the schema at *write time* (schema-on-write), rejecting an insert of the string `'abc'` into an `INTEGER` column instead of storing it and letting readers discover the mess later (schema-on-read, which is what you live with in document stores and data lakes).

Two structural facts matter more than anything else:

1. **Rows are an unordered set.** A table has no intrinsic row order. Any order you observe without asking for one is an accident of storage and can change between runs.
2. **Rows are identified by keys, not by position.** A **primary key (PK)** is a column (or set of columns, a *composite key*) that the database guarantees is unique and non-`NULL` for every row. There may be several columns that could serve (*candidate keys*, e.g. both `user_id` and `email`); you designate one as primary.

A **foreign key (FK)** is a column in one table whose values must exist as primary-key values in another table. It is how tables reference each other. Concretely:

```sql
CREATE TABLE users (
  user_id  INTEGER PRIMARY KEY,
  email    TEXT NOT NULL UNIQUE,
  country  TEXT
);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  user_id  INTEGER NOT NULL REFERENCES users(user_id),
  amount   NUMERIC NOT NULL
);
```

With this in place, the database will refuse an `orders` row with `user_id = 999` if no such user exists, and will refuse to delete user 7 while orders still point at them (unless you configure cascading). This is **referential integrity**: the impossibility, enforced by the engine, of a dangling reference. In Firestore you maintain this discipline in application code and it silently rots; here it is a constraint the storage layer polices.

Why it matters: keys are what make joins meaningful (lesson 02), and uniqueness of keys is what makes join results predictable. When a "key" you believed unique turns out not to be, row counts silently multiply downstream, which is the single most common way analytics numbers go wrong.

Judgment layer: experts choose between **natural keys** (real-world identifiers like `email`) and **surrogate keys** (meaningless generated integers or UUIDs). Natural keys carry meaning but change (people change emails) and changing a PK ripples through every FK. Surrogate keys are stable and cheap to index but require a lookup to mean anything. Production systems overwhelmingly use surrogates for identity and add `UNIQUE` constraints on the natural candidates. Constraints cost a check per write; teams under write pressure sometimes drop FK enforcement and accept the risk, which is a real tradeoff, not a free win.

## SELECT-FROM-WHERE and Logical Evaluation Order

The basic query reads rows from a table, filters them, and projects columns:

```sql
SELECT email, country
FROM   users
WHERE  country = 'PH' AND signup_year >= 2024;
```

The critical mental model: SQL is **declarative**. You state what result you want; the engine picks the physical strategy. But the *meaning* of a query is fixed by a **logical evaluation order** that differs from the written order:

1. `FROM` — identify the source rows (later in the course: combine tables here).
2. `WHERE` — keep only rows where the predicate evaluates to true, row by row.
3. `SELECT` — compute the output columns (projection), including expressions and aliases.
4. `ORDER BY` — sort the surviving rows.
5. `LIMIT` / `OFFSET` — truncate the sorted stream.

(Grouping clauses slot between 2 and 3; they get their own lesson.) You write `SELECT` first but it evaluates *after* `WHERE`. This explains a classic beginner bug:

```sql
SELECT amount * 1.12 AS amount_with_tax
FROM   orders
WHERE  amount_with_tax > 100;   -- ERROR in most engines
```

The alias `amount_with_tax` does not exist yet when `WHERE` runs, because projection happens after filtering. You must repeat the expression in `WHERE` (or use a derived query). Conversely, `ORDER BY` runs *after* `SELECT`, so it *can* see aliases: `ORDER BY amount_with_tax` is legal.

Worked micro-example. Given `orders`:

| order_id | user_id | amount |
|---|---|---|
| 1 | 7 | 40 |
| 2 | 7 | 250 |
| 3 | 9 | 120 |

`SELECT order_id, amount * 2 AS a2 FROM orders WHERE amount > 100` evaluates: `FROM` yields 3 rows; `WHERE amount > 100` keeps orders 2 and 3; `SELECT` then computes `a2` = 500 and 240. The doubling never happens for order 1 at all; predicates see stored values, not projected ones.

Two more semantics to internalize. `SELECT *` means "all columns of the source" and is fine for exploration but brittle in production code (schema changes silently change your output shape, and you drag wide columns you do not need through the network). And `SELECT DISTINCT` deduplicates *entire output rows* after projection; it is a deduplication of the result, not a per-column operation.

Judgment layer: the optimizer is free to *physically* reorder work (e.g., filter using an index before ever touching most rows) as long as the result matches the logical order's semantics. So the logical order is your tool for reasoning about correctness, never a description of execution. When a query returns something surprising, replay it mentally in logical order; that resolves the surprise in the vast majority of cases.

## Sorting and Limiting Result Sets

Because tables are unordered sets, **the only ordered result is one with an `ORDER BY`**. Engines often return small results in insertion or index order, which trains people to trust an ordering that is not promised; it then breaks after a data reorganization, an engine upgrade, or a plan change.

`ORDER BY` takes a list of sort keys, each independently `ASC` (default) or `DESC`, applied lexicographically like a multi-column sort in any language:

```sql
SELECT user_id, amount
FROM   orders
ORDER  BY amount DESC, order_id ASC
LIMIT  10 OFFSET 20;
```

`LIMIT k` truncates the sorted stream to the first `k` rows, and `OFFSET n` skips `n` rows first. `ORDER BY score DESC LIMIT 10` is exactly the top-k pattern you already know from retrieval: your reranker's "return the 10 best of 200 candidates" is this construct, and good engines implement it the same way you would, with a bounded heap of size k rather than a full sort (a *top-N sort*).

Three failure modes with real consequences:

**Ties make pagination nondeterministic.** If 30 rows share `amount = 100` and your sort key is `amount` alone, the engine may order those 30 differently on every execution. Page 1 (`LIMIT 10`) and page 2 (`LIMIT 10 OFFSET 10`) are computed by *separate queries*, so a row can appear on both pages or on neither. The fix is a **total order**: always append a unique tiebreaker, typically the primary key (`ORDER BY amount DESC, order_id`).

**OFFSET does not skip work.** To serve `OFFSET 100000 LIMIT 10`, the engine must still produce and discard the first 100,000 ordered rows; cost grows linearly with page depth. Deep pagination should use **keyset pagination**: remember the last row's sort-key values and ask for `WHERE (amount, order_id) < (100, 3117) ORDER BY amount DESC, order_id DESC LIMIT 10`. That is a seek, not a scan-and-discard, and it is also stable when rows are inserted between page fetches (OFFSET pages shift; keyset pages do not).

**NULL ordering varies by engine.** The SQL standard leaves it to implementations: PostgreSQL treats `NULL` as largest (`NULLS LAST` on `ASC`), others as smallest. If a nullable column is a sort key, write `NULLS FIRST` or `NULLS LAST` explicitly where supported.

Judgment layer: sorting the full table to serve a top-10 is one of the classic performance cliffs; later you will see how an index that already stores rows in sorted order lets the engine satisfy `ORDER BY ... LIMIT` by reading just ten entries. For now the rule is: every `LIMIT` deserves an `ORDER BY`, and every `ORDER BY` used for pagination deserves a unique tiebreaker.

## NULL Semantics and Three-Valued Logic

`NULL` is not zero, not an empty string, and not `false`. It is a marker meaning **"no value here"**, usually read as *unknown*. That single decision forces SQL's logic to have three truth values: `TRUE`, `FALSE`, and `UNKNOWN`.

The rules derive cleanly if you treat `UNKNOWN` as "could be either." Any comparison with `NULL` yields `UNKNOWN`, including `NULL = NULL`; if both sides are unknown quantities, you cannot assert they are equal. For the connectives, ask whether the unknown could change the outcome:

| p | q | p AND q | p OR q |
|---|---|---|---|
| TRUE | UNKNOWN | UNKNOWN | TRUE |
| FALSE | UNKNOWN | FALSE | UNKNOWN |
| UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

`FALSE AND anything` is `FALSE` because one false conjunct dooms a conjunction no matter what the unknown turns out to be; `TRUE OR anything` is `TRUE` symmetrically. `NOT UNKNOWN` stays `UNKNOWN`. This is exactly interval logic over {0,1}, the same reasoning as bounding a probability you know only lies in (0,1).

The operational rule that makes this bite: **`WHERE` keeps a row only when the predicate is `TRUE`**. `FALSE` and `UNKNOWN` are both dropped. Worked example, with `users`:

| user_id | country |
|---|---|
| 1 | 'PH' |
| 2 | NULL |
| 3 | 'SG' |

- `WHERE country = 'PH'` returns user 1 only. For user 2 the comparison is `UNKNOWN`, dropped.
- `WHERE country <> 'PH'` returns user 3 only, **not** users 2 and 3. Row 2 is `UNKNOWN` again.
- Therefore `country = 'PH'` and `country <> 'PH'` together do **not** cover the table. Rows with `NULL` fall through every ordinary comparison, in both directions. This is the number-one source of silently missing rows in filters.
- The correct membership tests are `country IS NULL` and `country IS NOT NULL`, special predicates that return `TRUE`/`FALSE`, never `UNKNOWN`.

A second trap follows directly: `WHERE country NOT IN ('PH', NULL)` returns **zero rows**, always. `NOT IN` expands to `country <> 'PH' AND country <> NULL`; the second conjunct is `UNKNOWN` for every row, and `TRUE AND UNKNOWN` is `UNKNOWN`, so nothing passes. One `NULL` in a `NOT IN` list annihilates the whole query, silently. Keep this in your pocket; it returns with force when we compare `NOT IN` against `NOT EXISTS` in the joins lesson.

Tools for working with `NULL` deliberately: `COALESCE(x, fallback)` returns the first non-`NULL` argument, letting you map unknown to a sentinel *at projection time* (`COALESCE(country, 'unknown')`). Many engines offer `IS DISTINCT FROM`, a null-safe inequality under which `NULL IS DISTINCT FROM 'PH'` is `TRUE` and `NULL IS NOT DISTINCT FROM NULL` is `TRUE`; it restores two-valued logic when you genuinely want "different, treating NULL as a comparable value."

Judgment layer: the deepest fix is schema design. Declare `NOT NULL` wherever the domain guarantees a value, and reserve nullable columns for genuinely optional facts. Every nullable column taxes every future query that touches it with three-valued reasoning; experienced modelers pay that tax only where "unknown" is a real state of the world, and they never encode "unknown" as `0` or `''`, because those collide with legitimate values and *cannot* be told apart later, whereas `NULL` at least declares itself.
