Every storage system you ship embodies a decision about where each fact lives and how many copies of it exist: a Firestore document that repeats a user's display name, a warehouse table that embeds product attributes in every order row, a chunk store that copies the source document's title into every chunk. Normalization is the discipline for making that decision deliberately instead of by accident, and denormalization is the discipline for un-making it on purpose when read performance demands it. Retrieval systems live or die on exactly this tradeoff: the corpus you serve to an LLM is a heavily denormalized read model, and it stays correct only if you understand what redundancy costs and who pays for it.

## Normal Forms 1NF-3NF: Removing Redundancy

A relational table is a set of rows sharing typed columns. A **candidate key** is a minimal combination of columns whose values uniquely identify a row; the **primary key** is the candidate key you choose to enforce. The engine of normalization is the **functional dependency** (FD): `X → Y` means that whenever two rows agree on the column set `X`, they must also agree on `Y` — X determines Y. Redundancy appears exactly where an FD's left side is *not* a key: the same `X` value recurs across many rows, dragging identical copies of `Y` along with it.

Start from the flat table a naive exporter produces, one row per order line:

`order_lines(order_id, line_no, customer_id, customer_email, product_sku, product_name, qty, unit_price)`, primary key `(order_id, line_no)`.

Its real dependencies: `(order_id, line_no) → qty`; `order_id → customer_id` (an order belongs to one customer); `customer_id → customer_email`; `product_sku → product_name`. Now the three working normal forms:

- **1NF** — every column holds one atomic value per row: no comma-packed lists, no repeating column groups like `phone1, phone2, phone3`. This is what makes a column queryable at all. A value the engine must string-split is a value it cannot index, join on, or constrain; the "list in a string" is invisible to the query planner.
- **2NF** — 1NF, plus no non-key column depends on a *proper subset* of a composite key. Here `customer_id` (and through it `customer_email`) depends on `order_id` alone, not on the full `(order_id, line_no)` key, so customer data repeats once per line of every order. Fix: split out an `orders` table keyed by `order_id`.
- **3NF** — 2NF, plus no non-key column depends on another non-key column (a **transitive dependency**: key → `product_sku` → `product_name`). A product's name repeats in every line that ever sold it. Fix: split out a `products` table keyed by `product_sku`.

The classic mnemonic compresses all three: every non-key column must depend on *the key* (1NF gives you a key over atomic values), *the whole key* (2NF), *and nothing but the key* (3NF). Decomposed to 3NF:

| Table | Columns | Key |
|---|---|---|
| `customers` | customer_id, customer_email | customer_id |
| `products` | product_sku, product_name, list_price | product_sku |
| `orders` | order_id, customer_id, order_ts | order_id |
| `order_lines` | order_id, line_no, product_sku, qty, unit_price | (order_id, line_no) |

Note the judgment call hiding in that design: `unit_price` stays on the order line even though `products` carries `list_price`, because the price *at the moment of sale* is a fact about the sale, not about the product — prices change; the sale happened at one of them. Normalization's transferable skill is exactly this question: *which entity does this fact truly describe?* Higher forms exist (BCNF closes an edge case where a non-key column determines part of a key), but 3NF is the working target for transactional schemas; beyond it the returns diminish fast.

## Update Anomalies: What Normalization Prevents

Redundancy would cost only disk if data never changed. It changes. When one real-world fact is stored in N rows, the database acquires the ability to disagree with itself, and three classic anomalies follow.

**Update anomaly.** In flat `order_lines`, customer 4417's email is stored on all 812 of their lines. When they change email, you must `UPDATE` 812 rows. If the job dies after 640 — instance killed, statement timeout — the table now asserts two emails for one customer, and any query that joins to "the" email nondeterministically returns one or the other depending on which row it touches. No constraint can save you: the engine has no way to know those 812 cells are supposed to be one fact. Correctness rests on every writer, everywhere, forever, remembering to update every copy.

**Insertion anomaly.** You cannot record a new product's name and price until someone orders it, because product facts live only inside order-line rows and the primary key demands an `order_id`. Facts about one entity are hostage to the existence of another.

**Deletion anomaly.** Delete customer 4417's only order and their email vanishes with it: removing one fact (the order) silently destroys an unrelated fact (the contact info) that happened to share the row.

Normalization dissolves all three *by construction*. Each fact lives in exactly one row of exactly one table, so an update is a single-row write (atomic in any transactional store), an insert needs no host row, and a delete removes only its own facts. That is the deep claim of 3NF: it is not tidiness — it makes inconsistency structurally unrepresentable rather than merely discouraged.

The judgment layer: anomalies are a **write-side** disease. A read-only copy that is periodically rebuilt from a normalized source cannot drift, because it is never edited in place — every rebuild re-derives every value. That loophole is precisely what deliberate denormalization exploits. And the disease follows you outside relational databases: a chunk store that copies each document's title into every chunk row has a textbook update anomaly the moment the title changes upstream — either your ingestion rewrites every chunk of that document, or your citations display stale titles. Same pathology, new costume.

## Deliberate Denormalization: Paying Storage to Eliminate Joins

A join is a read-time computation. A hash join between `orders` (100M rows) and `customers` (10M rows) must build a hash table over the smaller side, then probe it once per order row; in a distributed warehouse, both sides may first be **shuffled** across the network so that matching keys land on the same worker. Run that on every dashboard refresh, multiplied by every descriptive table the query touches, and join cost dominates the workload. Denormalization moves the computation to write time: perform the join once during load and store its result — a wide table where `customer_region` sits directly on every order row. You spend storage and write-path complexity; the per-query join disappears.

Two properties of analytics make this trade favorable. First, warehouse workloads are read-mostly: one load per night, thousands of reads per day, so a cost paid once at write time is amortized across every read. Second, columnar storage makes the redundancy nearly free. An analytical engine scans only the columns a query references, and a repeated low-cardinality column like `customer_region` dictionary-encodes to roughly a byte per row — about 100 MB to attach region to 100M orders, a rounding error next to re-running a 10M-row join shuffle on every query.

The failure mode is the previous section's anomaly, now installed on purpose: when a customer moves region, the wide table is wrong in as many rows as that customer has orders. So deliberate denormalization is safe only under discipline: (1) reads must dominate writes; (2) a normalized system of record persists upstream — the wide table is a *derived artifact*, never the truth; (3) refresh is automated and idempotent (rebuild the table, or recompute affected partitions), so drift is bounded by pipeline latency instead of by human memory. Experts denormalize the serving layer and keep the system of record normalized; the amateur mistake is denormalizing the only copy and then hand-patching it. Your retrieval corpus follows the same pattern: chunk rows carrying copied document metadata are a denormalized read model, and they stay trustworthy only because ingestion rebuilds them from source.

## Nested and Repeated Fields (STRUCT/ARRAY) as Modern Denormalization

Flat wide-table denormalization has an ugly cost for one-to-many data: if you flatten orders and their lines into one table, every *order-level* column (customer, region, timestamp) repeats on every line — fan-out duplication. Modern columnar engines offer a third shape: keep the child rows *inside* the parent row as typed, schema-declared structure. In BigQuery this is `items ARRAY<STRUCT<sku STRING, qty INT64, unit_price NUMERIC>>` — an **ARRAY** is a repeated field, a **STRUCT** is a nested record with named, typed subfields. This deliberately violates 1NF's atomicity rule, but unlike a comma-packed string, the structure is part of the schema: the engine knows `items.unit_price` exists, knows its type, and can address it as a real column.

One order is now one row: parent columns stored once, child records nested inside. To query the children, you flatten at read time:

```sql
SELECT item.sku, SUM(item.qty * item.unit_price) AS revenue
FROM orders, UNNEST(items) AS item
GROUP BY item.sku
```

`UNNEST(items)` expands each order into one output row per array element — a correlated cross join between the parent row and its own children — recreating order-line grain exactly when a query wants it.

Why this works physically: the Dremel storage model (the lineage behind BigQuery and Parquet) stores every *leaf* field as its own column stripe, with repetition metadata recording how values reassemble into nested rows. Scanning `items.unit_price` across a billion orders reads that one stripe — nested does not mean "row stored as a blob". The result is the best of both earlier worlds: the join is pre-materialized (parent and children physically co-located, no shuffle), *without* the flat table's duplication of parent columns. If you have modeled a Firestore document holding an array of maps, you have already made this exact move; BigQuery adds columnar scans and SQL over it.

Choose nesting when children are queried overwhelmingly *with* their parent and arrive with it — an order's lines are created in the same event and rarely mean anything alone. Choose a separate child table when children are first-class entities: queried standalone across many parents, updated independently (mutating one element of an array means rewriting the entire parent row), or shared between parents. Deep nesting also taxes every human who has to write `UNNEST` three levels down. Followed to its endpoint, this design yields the "one big table": a single nested, denormalized table per analytical domain — the modern denormalization endpoint, and the shape your corpus tables will echo.
