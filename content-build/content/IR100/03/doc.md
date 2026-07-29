Retrieval rarely needs a complete ordering of every scored document; it needs the best 10, 100, or 1,000. A binary heap is the small data structure that turns this distinction into a large computational saving, both inside a search shard and when merging candidates across shards. Its value comes from maintaining just enough order to identify the current weakest winner, without paying to sort everything else.

## Binary Heap Mechanics: Insert and Extract-Min

A **binary min-heap** is a complete binary tree satisfying the heap property: every node's key is no greater than either child's key. “Complete” means all levels are full except possibly the last, which fills left to right. The root is therefore the global minimum: following any path away from it can never decrease the key.

The tree is stored compactly in an array, with no node pointers. Using zero-based indexing, node $i$ has parent $\lfloor(i-1)/2\rfloor$, left child $2i+1$, and right child $2i+2$ when those indexes exist. Array `[2, 5, 4, 12, 9, 7]` is a valid min-heap: 2 is below 5 and 4; 5 is below 12 and 9; 4 is below 7. It is not globally sorted: siblings 5 and 4 are unconstrained. A heap promises only ancestor order, which is precisely why updates are cheaper than maintaining a fully sorted array.

**Insert** first appends the new key in the next array slot, preserving completeness. This may violate the heap property with its parent, so **sift up**: while the new key is smaller than its parent, swap them. Each swap moves up one level. A complete tree with $n$ nodes has height $\lfloor\log_2 n\rfloor$, so insertion costs $O(\log n)$ worst case.

Worked insertion: start with `[2, 5, 4, 12, 9, 7]` and insert 3. Append to get `[2, 5, 4, 12, 9, 7, 3]`. Its parent is 4 at index 2; swap to `[2, 5, 3, 12, 9, 7, 4]`. Now its parent is 2, which is smaller, so stop. Only the ancestor chain was touched.

**Extract-min** removes the root. Moving every array element left would cost $O(n)$, so replace the root with the final element, shrink the array, then **sift down**: swap the replacement with its smaller child while it exceeds that child. From `[2, 5, 3, 12, 9, 7, 4]`, remove 2 and move 4 to the root: `[4, 5, 3, 12, 9, 7]`. The smaller child is 3, so swap: `[3, 5, 4, 12, 9, 7]`. The heap is restored in $O(\log n)$.

Reading the minimum is $O(1)$ because it is the root. Finding an arbitrary key is $O(n)$ worst case: the heap property cannot tell whether key 8 lies under node 3 or 5, so many branches remain possible. A heap is a **priority queue**, not a general membership index. A max-heap reverses the comparison so the maximum is at the root; the mechanics and costs are otherwise identical.

Construction has an important judgment. Inserting $n$ elements one by one costs $O(n\log n)$. If all elements already exist, bottom-up **heapify** sifts down each internal node and costs $O(n)$. Most nodes sit near the leaves and travel only a step or two; only a few near the root can travel the full height. Use repeated insertion for streaming arrivals and heapify for a batch. Heaps are ideal when the required operation is repeatedly removing or replacing an extreme; they are poor when queries need ordered ranges, arbitrary lookup, or a completely sorted traversal.

Heap validity is cheap to test and worth asserting after custom implementations: for every index $i>0$, the parent key must not exceed the child key in a min-heap. This $O(n)$ check catches wrong parent arithmetic and incomplete sifting. Production code should normally use a tested priority-queue library, but tracing the array formulas by hand prevents comparator-direction bugs that silently retain the bottom $k$ instead of the top $k$.

## Maintaining Top-k with a Bounded Min-Heap

To retain the $k$ largest scores seen in a stream, maintain a **min-heap capped at size $k$**. The heap contains the current winners, and its root is the smallest score among them, the **admission threshold**.

For each candidate `(score, document)`:

1. If the heap has fewer than $k$ items, insert the candidate.
2. Otherwise compare its score with the root.
3. If the score is no greater than the root, discard it.
4. If greater, replace the root with the candidate and sift down.

The invariant is: after processing any prefix of the stream, the heap contains exactly the $k$ largest items in that prefix, or all items if fewer than $k$ have arrived. Prove it by induction. Before any item the claim is true. While the heap is underfull, retaining the new item preserves it. Once full, the root is the weakest current winner. A new score at or below it cannot belong to the top $k$; a larger score must belong, and evicting the root removes exactly the displaced weakest winner.

Worked example with $k=3$ and scores `[8, 2, 5, 10, 7, 1]`. Insert the first three, yielding a heap with values `{2,5,8}` and root 2. Score 10 exceeds 2, so replace it; winners become `{5,8,10}` with root 5. Score 7 exceeds 5, producing `{7,8,10}`. Score 1 does not exceed 7 and is discarded. The final heap contains the correct top three, although its array is heap-ordered rather than descending.

Processing the first $k$ candidates costs at most $O(k\log k)$ with repeated insertion, or $O(k)$ if buffered and heapified. Each of the remaining $n-k$ candidates needs an $O(1)$ root comparison; only candidates that enter the winners pay $O(\log k)$ replacement. The standard worst-case bound is $O(n\log k)$ time and $O(k)$ memory. When $k=100$ and $n=10{,}000{,}000$, heap height is under 7, and only 100 winners occupy memory.

Why a **min**-heap for the largest values? The algorithm needs immediate access to the weakest retained item, not the strongest. A max-heap puts the best winner at the root, which tells nothing about whether a new candidate beats the cutoff; finding the weakest would cost $O(k)$. Symmetrically, retaining the $k$ smallest values uses a bounded max-heap.

Ties require an explicit deterministic rule. If two documents have equal scores, compare a secondary stable key such as document ID. Without it, traversal or shard timing can change which equal-score candidate survives, making evaluation and pagination irreproducible. Compare tuples such as `(score, -doc_id)` consistently in both the heap and final output.

Distributed search repeats the pattern. Each shard keeps its local top $k$ rather than sending every score. A coordinator then merges the shard candidates and keeps the global top $k$. Local top $k$ is sufficient for pure score ordering: a document not in its own shard's top $k$ has at least $k$ documents in that shard alone scoring above it, so it cannot enter the global top $k$. Judgment changes when later stages use cross-document diversity, quotas, or a different reranker; then shards must overfetch because local score order no longer proves global eligibility under the new objective.

## Heap-Based Top-k vs Full Sort: Cost Comparison

A comparison sort of all $n$ candidates costs $O(n\log n)$ time and typically stores or rearranges all $n$ scored records. After sorting, taking the first $k$ is trivial, but the algorithm paid to establish the relative order of every loser. Bounded-heap selection costs $O(n\log k)$ time and $O(k)$ retained memory, establishing only the order needed to enforce the cutoff.

With $n=1{,}000{,}000$ and $k=10$, base-two comparison scales make the gap visible: full sort performs on the order of $n\log_2 n \approx 20$ million comparison units; heap top-k uses at most $n\log_2 k \approx 3.3$ million, with most candidates actually doing only one root comparison. At $k=n$, the bounds meet: $\log k=\log n$, and a heap offers no selection advantage.

The heap does not return a fully sorted top-k list. Its root is the weakest winner and parent-child relationships hold, but arbitrary array positions are not ranked. Sort the final $k$ winners in $O(k\log k)$, or repeatedly extract the minimum. The combined bound remains $O(n\log k+k\log k)$, dominated by $O(n\log k)$ when $n$ is much larger than $k$.

Full sorting remains correct and sometimes preferable. If the consumer needs all results in order, sorting performs necessary work. If $n$ is small, library sort is simple and highly optimized. If $k$ is a large fraction of $n$, heap maintenance's branches and swaps may lose to cache-friendly sorting despite similar asymptotics. For numeric data, non-comparison algorithms or vectorized partial-selection routines can also outperform a binary heap.

There is a third option: **selection** algorithms such as quickselect partition an in-memory array around the $k$th boundary in expected $O(n)$ time, then sort only the winning $k$. Quickselect often wins for one batch already resident in mutable memory, but it rearranges and retains the full input and has a quadratic worst case without careful pivoting. A bounded heap works online: it never needs to see future candidates, uses $O(k)$ memory, and supports streams larger than RAM.

Worked judgment: a Cloud Run service receives ten million scored chunk IDs from a streaming iterator and needs 100 candidates for a reranker. Full sort requires materializing all ten million records and sorting them; quickselect still requires the full array. A bounded heap consumes the iterator once and retains 100 entries. Conversely, a UI asks to export every scored record ordered by score; the heap cannot avoid producing a complete order, so full external or in-memory sorting is the honest operation.

Experts choose by required output and data arrival: full sort for complete order, quickselect for one in-memory batch and a boundary, bounded heap for streaming or memory-constrained top-k. The decisive question is not “which algorithm is fastest?” but “how much order must the consumer actually receive?”
