An inverted index needs two different kinds of structure: a dictionary that finds a term quickly and a postings representation that stores an ordered, growing set of document IDs. Choosing either structure by slogan leads to predictable failures: hash tables can collapse under poor load control, linked lists waste the memory hierarchy, and contiguous arrays make cheap reads by demanding more disciplined writes. The right choice follows from point lookup, ordered traversal, update frequency, and physical layout.

## Hash Tables: Buckets, Collisions, and Load Factor

A hash table maps a key to an array position. For an array of $M$ buckets, compute a deterministic hash $h(k)$ and reduce it to a bucket index, commonly $h(k) \bmod M$. A good hash spreads the actual key distribution approximately uniformly, so a lookup examines only a small number of candidates rather than scanning all $n$ stored keys.

Different keys inevitably produce the same bucket because the key space is larger than $M$; this is a **collision**, not an exceptional error. In **separate chaining**, each bucket refers to a collection of entries sharing that index. Lookup hashes once, then scans or searches that bucket. In **open addressing**, every entry lives directly in the bucket array; on collision the algorithm follows a probe sequence until it finds the key or an empty slot. Linear probing checks consecutive slots and has excellent locality, but contiguous occupied clusters grow. Double hashing spreads probes better but jumps around memory.

The **load factor** is $\alpha=n/M$, stored entries divided by buckets. Under uniform hashing with chaining, the expected unsuccessful lookup examines roughly $\alpha$ entries after reaching a bucket, so expected work is $O(1+\alpha)$. With 750,000 terms and 1,000,000 buckets, $\alpha=0.75$ and most chains are short. Put those terms in 10,000 buckets and $\alpha=75$: the same “hash lookup” now scans dozens of entries. Open-addressed tables require $\alpha<1$ and degrade sharply as the table fills because empty termination slots become rare.

Tables therefore **resize** when a threshold is crossed: allocate a larger bucket array and reinsert entries according to the new modulus. That resize costs $O(n)$ at the moment it occurs. Yet if capacity grows geometrically, such as doubling, insertion remains **amortized $O(1)$**. Across $n$ inserts, the total rehash work forms $1+2+4+\cdots<n\times2$, so total work is $O(n)$ even though a single insertion can be expensive.

Worked example: keys hash to integers 42, 18, and 50 in an eight-bucket table. All map to bucket 2 modulo 8. Chaining stores three entries under bucket 2; a missing key mapping there requires three comparisons. With linear probing, they occupy slots 2, 3, and 4; a lookup starting at 2 follows the cluster until matching or finding an empty slot.

Judgment starts with adversaries and guarantees. A flawed or attacker-controlled distribution can drive every key into one bucket, giving worst-case $O(n)$ lookup. Production runtimes may randomize string hashes to resist chosen-key collision attacks. Stable on-disk indexes instead need stable hashing, but must use a strong function and validate load. Hash tables also trade memory for speed: spare buckets, stored hashes, pointers, and alignment can exceed key payload size. They excel for exact term-to-postings lookup when memory is available; they do not maintain lexicographic order, prefixes, or ranges.

## Linked Lists as Postings: Sequential Access and Cheap Append

A singly linked list stores each posting in a node containing a document ID and a pointer to the next node. The list itself holds the head and often a tail pointer. Appending a new document ID is $O(1)$ when the tail is known: allocate a node, set the old tail's `next`, and update the tail. No existing postings move, so the representation tolerates incremental growth.

Traversal is logically sequential. To read the $i$th posting, follow $i$ pointers from the head; there is no arithmetic that jumps directly to node $i$. Searching an ordered linked list for a document ID is $O(n)$ in the worst case, although it can stop once the current ID exceeds the target. Binary search is not useful: locating the midpoint itself requires linear pointer traversal, and repeating that loses the logarithmic advantage.

Worked example: term `retrieval` has postings 3 → 11 → 19. Adding document 27 with a tail pointer changes two pointers, regardless of list length. Intersecting it with 2 → 3 → 19 → 25 walks forward and emits 3 and 19 using the two-cursor logic from the previous lesson.

That abstract story hides a physical weakness. Individually allocated nodes can be scattered across memory. Each pointer must arrive before the processor knows the next address, so prefetching is ineffective; a 64-byte cache line may deliver one useful 4-byte ID plus pointer and allocator overhead. A node holding a 32-bit ID and 64-bit pointer may consume 16 bytes after alignment, four times the ID payload before allocator metadata. Millions of postings magnify the waste.

Linked lists also complicate storage and compression. Sorted document IDs compress well as gaps, but following pointers between independent nodes prevents processing a dense block of gaps with vectorized decoding. Persisting raw pointers is meaningless because addresses change between processes, so serialization must flatten the list anyway.

Judgment: linked lists teach the update/read tradeoff cleanly, and they can serve mutable in-memory buffers where constant-time splice or append matters more than scans. They are rarely the final representation for a read-heavy search index. Search engines normally accumulate updates in a mutable structure, then flush immutable contiguous postings segments. This separates cheap ingestion from fast serving instead of forcing one structure to be mediocre at both.

## Arrays vs Linked Lists for Postings Storage

An array stores postings in contiguous memory. If its base address is $b$ and each ID occupies $w$ bytes, element $i$ resides at $b+iw$, so random access is $O(1)$. Sorted arrays support binary search in $O(\log n)$, two-cursor intersection in $O(m+n)$, and block compression over consecutive values. Their locality lets cache lines, prefetchers, and SIMD decoding work efficiently.

A fixed array cannot grow without allocating a replacement. A **dynamic array** keeps a capacity larger than its current length. Append writes into spare capacity; when full, allocate a geometrically larger block, copy the existing elements, then append. One resizing append costs $O(n)$, but the same geometric-series argument as hash-table resizing makes append amortized $O(1)$. The cost is occasional latency spikes and temporary memory for old plus new buffers.

Worked numbers expose the layout gap. One million 32-bit document IDs require about 4 MB in a packed array. A linked representation using 16 bytes per node requires about 16 MB before allocator overhead and touches scattered cache lines. Sequentially intersecting the array can stream near memory bandwidth. The linked list may wait on one dependent cache miss per node.

Middle insertion reverses the advantage. Inserting ID 500 into a sorted million-element array may shift roughly half a million IDs, $O(n)$ work. A linked list can splice a node in $O(1)$ only **after** the insertion predecessor is known; finding that position remains $O(n)$. The common claim “linked-list insertion is constant time” silently assumes a pointer to the correct location. For postings arriving in increasing document-ID order, both can append cheaply, and the array wins on reads. Out-of-order updates require buffering, a side structure, or segment merging rather than repeated middle shifts.

Deletion has similar semantics. An array deletion shifts later elements unless using tombstones or rebuilding; a linked list reconnects pointers after locating the predecessor. Search indexes prefer immutable segments partly because deletion can be represented in a separate bitset and applied during a later merge.

Choose arrays for read-heavy postings, compactness, binary search, compression, and intersection. Choose linked structures for small mutable buffers or workloads dominated by known-position splices. A practical hybrid uses a dynamic array for an in-memory postings builder, freezes and compresses it into an immutable segment, then creates new segments for later documents. It preserves append economics while serving from contiguous bytes.

## Hash Map vs Sorted Structure: When Order Matters

A hash map and a sorted map both associate keys with values, but their supported questions differ. A hash map provides expected $O(1)$ exact lookup: find postings for exactly `vector`. It has no meaningful iteration order. Finding all terms between `vector` and `vertex`, the first key at least `vec`, or every key with prefix `retr` requires scanning all keys, $O(n)$, unless another structure exists.

A sorted array of key-value entries provides exact lookup by binary search in $O(\log n)$ and range lookup by two boundary searches plus output traversal, $O(\log n+k)$ for $k$ returned entries. Balanced search trees offer $O(\log n)$ lookup, insertion, and deletion while maintaining order. Later lessons develop trees and tries; the decision here is whether ordering is part of the query contract.

Worked example: a dictionary contains one million terms. Exact lookup of `retrieval` is an expected constant-time hash probe or about 20 binary-search comparisons. Autocomplete for prefix `retr` cannot be answered from the hash layout without examining roughly one million keys. In a sorted array, binary-search the lower bound of `retr`, then scan consecutive terms until the prefix stops matching. If 80 terms match, cost is about 20 comparisons plus 80 outputs.

Order also enables merge operations. Two sorted dictionaries can be combined by a linear two-cursor pass, preserving key order and identifying equal terms. This is why immutable index segments are commonly sorted: merging a new segment with an old one becomes sequential I/O. A hash table would require probing or rebuilding and would produce no ordered output without a later sort.

Hash maps still win when the workload is overwhelmingly exact point lookup and updates are frequent. Sorted arrays win when data is built in batches and then read, or when prefixes, ranges, ordered iteration, compression, and merge construction matter. Balanced trees occupy the mutable ordered middle at the cost of pointers and weaker locality. Hybrid systems often keep a hash table for a mutable ingestion buffer and write sorted immutable segments for serving.

The expert test is to list required operations before choosing a structure. If the contract is only `get(key)`, hashing is compelling. If it includes `lower_bound`, prefix enumeration, range scan, ordered merge, or nearest key, order is data, not decoration. Paying $O(\log n)$ for exact lookup can be the cheaper system choice because it avoids an $O(n)$ scan or a duplicated secondary index for every ordered query.
