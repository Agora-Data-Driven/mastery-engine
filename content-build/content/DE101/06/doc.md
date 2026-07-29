SQL describes a result, not the steps used to produce it. Production judgment begins where syntax ends: reading the physical plan, choosing an index whose key grain matches the predicate, knowing which multi-write states a transaction forbids, and recognizing whether a workload is transactional or analytical. These distinctions decide whether a retrieval pipeline returns in milliseconds, corrupts counters during failure, or spends its budget scanning the wrong storage layout.

## Reading a Query Execution Plan

The optimizer translates declarative SQL into a tree of physical operators. Leaves read tables or indexes; operators filter, join, aggregate, sort, and exchange data; the root returns results. `EXPLAIN` shows the planned tree, while `EXPLAIN ANALYZE` or an engine equivalent executes it and reports observed rows, time, memory, and I/O. Exact labels differ, but the reading method is stable.

Read from the leaves upward. For each operator ask: how many rows enter and leave; which algorithm runs; where do rows move; and are estimates close to reality? A filter reducing ten million rows to ten thousand is valuable when applied near the scan. The same filter above a join means the join processed needless rows.

Common scans:

- A **sequential/table scan** reads the eligible table or partitions. It is correct and often fastest when a large fraction is needed.
- An **index scan/seek** navigates an index to matching keys, then may fetch base rows. It wins for selective predicates but random row fetches can lose when many rows match.
- A **partition-pruned scan** reads only partitions whose metadata can satisfy the predicate.

Common joins reflect earlier cost models. A nested-loop join reads outer rows and probes the inner side, excellent for a small outer set with an indexed inner key but dangerous as two large scans. A hash join builds a hash table on one input and probes it with the other, typically $O(m+n)$ but memory-hungry and possibly spilling. A merge join walks two sorted inputs and is linear once ordering exists, but sorting can dominate if it does not.

Worked plan: `orders` has 100 million rows, `customers` 1 million, and a date filter should retain 1% of orders. A good plan prunes date partitions or filters orders to 1 million, builds a customer hash table, joins, then aggregates. A bad plan scans and joins all 100 million before filtering. If the optimizer estimated 10,000 filtered rows but observed 10 million, it may choose a nested loop that performs millions of probes. That **estimated-versus-actual row divergence** points to stale statistics, correlated predicates, skew, or a non-sargable expression.

A predicate is **sargable** when it can become an index search argument. `WHERE created_at >= '2026-07-01'` can seek a timestamp index. `WHERE DATE(created_at) = '2026-07-01'` may force applying a function to every row unless the engine rewrites it or has a matching expression index. Express the equivalent half-open range: `created_at >= '2026-07-01' AND created_at < '2026-07-02'`.

Look for sorts, shuffles/exchanges, spills, repeated subplans, and unexpectedly wide rows. Sort and hash operators spilling to disk signal inadequate memory or excessive input. A distributed shuffle can dominate arithmetic because matching keys must cross workers. `SELECT *` increases moved bytes and can prevent index-only scans.

Judgment: no operator name is inherently bad. A full scan of a small dimension is healthy; an index probe returning half a table may be worse. Compare alternative plans using representative parameters, because cached pages and skew affect results. Never read cost numbers across different database products as universal time units; use them to compare choices within one optimizer, then confirm with actual runtime and bytes.

## B-tree Database Index vs Inverted Search Index

A database B-tree index stores ordered **row keys** and references to rows. An index on `(tenant_id, created_at)` supports exact tenant lookup, time ranges within a tenant, ordered retrieval, and often prefix use of the leading column. It does not automatically index words contained inside a text value.

An **inverted index** changes the grain. It analyzes text into terms, then maps each term to a postings list of matching document IDs, often with positions and frequencies:

```
retrieval -> [(doc 2, positions 4,19), (doc 8, position 7)]
```

The dictionary finds `retrieval`; postings enumerate documents containing it. Boolean intersection, phrase matching, and BM25 operate over those lists.

Worked comparison: `documents(body TEXT)` contains one million articles. A B-tree on `body` orders complete body strings. It can help `body = 'exact full contents'` or perhaps a left-anchored prefix under suitable collation, but `body LIKE '%retrieval%'` cannot navigate by an interior token and usually scans. An inverted index tokenizes each body and directly opens `retrieval` postings.

Conversely, an inverted text index is not the natural tool for `created_at BETWEEN ...` or an exact primary-key lookup. Search systems attach structured fields and may maintain columnar, bitmap, or tree-like structures for filters. Hybrid retrieval commonly applies tenant and status constraints alongside term postings, but authorization must not depend on text relevance.

B-tree column order matters. `(tenant_id, created_at)` efficiently supports tenant equality plus date range; a query only on `created_at` may not use the leading tenant-organized layout effectively. An inverted index's analogous design choices are analyzer, token normalization, positions, and stored frequencies. Changing tokenization changes which keys exist, requiring reindexing just as changing key expression or collation may require rebuilding a database index.

Both structures pay write amplification. A B-tree insert modifies leaf pages and may split nodes. An inverted index buffers occurrences, writes sorted immutable segments, and later merges them. Both trade storage and write work for read speed, but their predicates differ.

Judgment test: identify the lookup key. If it is an ordered scalar or tuple attached to a row, use a B-tree-style database index. If it is a token contained across many documents, use an inverted index. If a query combines text with structured constraints, maintain both access paths and let the engine intersect candidates. Calling both “indexes” does not make them interchangeable.

## Transactions and ACID Guarantees

A **transaction** groups operations into one logical unit. ACID names four properties that constrain failures and concurrency.

**Atomicity:** all transaction writes commit, or none become visible. Transferring $100 from account A to B requires debit and credit together. If the process crashes after the debit, rollback prevents money from disappearing.

**Consistency:** a committed transaction takes the database from one state satisfying declared invariants to another. Constraints such as nonnegative balances, foreign keys, and unique order IDs help enforce this. Consistency is not magical business correctness: if application logic transfers the wrong amount while satisfying constraints, ACID faithfully commits the wrong decision.

**Isolation:** concurrent transactions behave according to an isolation level that restricts which intermediate effects they observe. Without sufficient isolation, two workers can read stock 1, both decide to sell, and both write stock 0, overselling one unit. Serializable isolation aims for outcomes equivalent to some serial order. Weaker levels permit more concurrency but may allow nonrepeatable reads, phantoms, or write skew depending on the database.

**Durability:** after commit succeeds, the result survives process or machine failure according to the system's durability contract, typically through write-ahead logs and replicated or persistent storage. A client timeout does not prove rollback: the server may have committed but lost the acknowledgment. That uncertain outcome is why external requests still need idempotency keys.

Worked retrieval ingestion: create a document row, 20 chunk rows, and increment a document counter. If readers must never see the document without its chunks, one transaction can publish them atomically, subject to database transaction limits. For a massive index rebuild, one transaction is impractical; build a versioned index separately, validate it, then transactionally or atomically switch a small alias. ACID protects the cutover, not every byte of long-running computation.

Transactions also define boundaries, and broad is not always better. Holding locks while calling an LLM or remote API increases contention and makes retry behavior complex. Perform external work outside, then open a short transaction to validate current state and commit deterministic writes. Retried transactions must avoid irreversible side effects inside the retryable callback.

Isolation judgment comes from invariants, not fear. A dashboard query may tolerate a snapshot slightly behind current writes. Allocating a unique quota or preventing double spend needs stronger coordination. Firestore transactions optimistically rerun when read documents change; code inside must be safe to execute multiple times. ACID applies within the datastore's documented boundary and does not create atomicity across Firestore, GCS, Pub/Sub, and an external API. Cross-system workflows use idempotency, outbox patterns, state machines, and reconciliation.

## OLTP vs OLAP Workloads

**Online transaction processing (OLTP)** serves many short, concurrent operations: fetch one user, create an order, update one job state. Queries are selective, latency-sensitive, and write-heavy relative to analytics. Schemas are commonly normalized to keep facts authoritative and updates small. Row-oriented storage and B-tree indexes make fetching or changing a complete row by key efficient.

**Online analytical processing (OLAP)** scans and aggregates many rows: daily revenue by region, retrieval quality by query class, or latency percentiles across months. Queries are fewer but heavier, throughput-oriented, and mostly read-intensive. Columnar storage reads only referenced columns, compresses repeated values, and vectorizes computation. Denormalized stars or nested tables reduce repeated joins.

Worked contrast. An endpoint `GET /jobs/abc` needs one job row in under 20 ms and may immediately update its status. A transactional database with a primary-key B-tree is appropriate. A report computing weekly success rate over five billion events needs `week`, `model_version`, and `status`, not the remaining event fields. A columnar warehouse scans those columns in parallel; making five billion indexed point probes would be absurd.

Workload shape, not data name, determines placement. The same `orders` domain may have normalized operational tables in Cloud SQL or Spanner and a denormalized analytical copy in BigQuery. A change pipeline keeps the copy fresh. The OLAP store is derived and can lag; it should not become the authority for transactional updates.

Mixed workloads interfere. A full-table dashboard scan on an OLTP primary can evict hot pages, consume CPU, hold snapshots, and slow customer writes. Heavy point-update traffic fragments analytical files and defeats compression. Systems separate workloads through replicas, exports, or storage-compute architectures rather than demanding one engine optimize contradictory access patterns.

There are hybrids: operational analytics, distributed SQL, and warehouse features that support updates. Labels are tendencies, not prohibitions. Evaluate transaction requirements, concurrency, freshness, row selectivity, scan volume, and latency. A small lookup table can live comfortably in a warehouse; a large event history can be queried selectively in a transactional store with indexes, but economics may be poor.

For an AI system, operational state includes ingestion jobs, document metadata, ACLs, and serving configuration; analytical facts include evaluation runs, click events, cost, and latency history. Index artifacts and vector stores are specialized serving copies. The professional architecture declares which system is authoritative for each fact and how derived copies are rebuilt, rather than treating OLTP versus OLAP as a one-time vendor choice.
