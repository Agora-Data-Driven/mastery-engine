Dense retrieval turns a collection of vectors into a geometric search problem, and graph indexes turn geometry into navigation: store a small set of neighbors for each vector, enter somewhere, then walk toward the query. Understanding the representation and the failure modes of greedy traversal is the prerequisite for judging approximate nearest-neighbor systems later. The essential tension is sparse storage and fast local movement versus the risk that local choices cannot reach the globally nearest region.

## Graph Representations: Adjacency Lists in Practice

A graph $G=(V,E)$ contains vertices and edges. In a retrieval graph, a vertex usually represents a document or chunk vector; an edge connects vectors considered neighbors. Edges may be **directed**, where $u\to v$ does not imply $v\to u$, or **undirected**, where a connection is symmetric. A stored neighbor relation created by taking each vector's nearest $M$ candidates is naturally directed: vector A can include B among its closest neighbors even when A is not among B's.

An **adjacency matrix** for $|V|=n$ stores an $n\times n$ table whose cell indicates whether an edge exists. It gives $O(1)$ edge-existence checks but consumes $O(n^2)$ space. For one million vertices, one bit per possible edge still requires $10^{12}$ bits, about 125 GB, before weights or overhead. A proximity graph with 32 outgoing neighbors per vertex has only about 32 million edges; the matrix represents almost a trillion absent edges.

An **adjacency list** stores, for each vertex, only its outgoing neighbors. Space is $O(|V|+|E|)$. Enumerating a vertex's neighbors costs $O(\deg(v))$, where $\deg(v)$ is its outgoing degree. Checking whether a particular edge exists is $O(\deg(v))$ with a simple array, expected $O(1)$ if each neighbor set is hashed, or $O(\log\deg(v))$ if sorted and binary-searched. Retrieval traversal primarily enumerates neighbors, so compact arrays are usually better than per-vertex hash tables.

Worked example:

```
A: [B, D]
B: [A, C, D]
C: [B]
D: [A, B, E]
E: [D]
```

This representation stores ten directed adjacency entries. If the graph is undirected, every logical edge appears twice, once from each endpoint. A breadth-first traversal from A maintains a queue and visits A, then B and D, then C and E, never visiting a vertex twice. Its cost is $O(|V|+|E|)$ for the reachable component because each vertex is enqueued once and each adjacency entry is examined once.

Physical layout matters. An object per vertex holding a JavaScript array is convenient for building but carries object and pointer overhead. A compressed sparse row-style layout uses one `offsets` array and one flat `neighbors` array: neighbors of vertex $i$ occupy `neighbors[offsets[i]..offsets[i+1])`. For degrees `[2,3,1,3,1]`, offsets are `[0,2,5,6,9,10]`. This packs 32-bit IDs contiguously, improves cache behavior, and serializes directly. Edge weights or distances live in a parallel array.

Mutability is the tradeoff. Flat compact arrays are excellent for read-heavy traversal but expensive to edit because inserting into the middle shifts later entries. Builders use growable per-node buffers, reserve fixed neighbor capacity, or construct immutable graph segments and periodically rebuild. Deletion may use a tombstone bitmap until compaction. Stable integer vertex IDs make arrays possible; an external map resolves document IDs to those integers.

Judgment: adjacency matrices fit dense small graphs and workloads dominated by arbitrary edge tests. Adjacency lists fit sparse retrieval graphs because traversal asks “which few neighbors can I visit?” Degree controls memory and search branching. Too few edges create disconnected components or narrow paths; too many increase build storage and distance computations at every visited vertex. Graph quality is therefore partly a data-model decision about which edges deserve scarce adjacency slots.

## Greedy Nearest-Neighbor Graph Traversal

Suppose every vertex has a vector $x_v$ and the query has vector $q$. A greedy traversal starts at an entry vertex $c$, computes distance $d(q,x_c)$, examines $c$'s neighbors, and moves to the neighbor with the smallest query distance if it is closer than $c$. Repeat until no neighbor improves the distance. With cosine-normalized embeddings, maximizing dot product is equivalent to maximizing cosine similarity; the direction of comparison changes, but the mechanism does not.

Worked two-dimensional graph: query $q=(9,9)$. Entry A is $(0,0)$ with Euclidean distance $\sqrt{162}\approx12.73$. A connects to B $(4,3)$ and C $(2,5)$, at distances $\sqrt{61}\approx7.81$ and $\sqrt{65}\approx8.06$, so move to B. B connects to D $(7,7)$ at $\sqrt8\approx2.83$ and E $(6,4)$ at $\sqrt34\approx5.83$, so move to D. D connects to F $(9,8)$ at distance 1, so move to F. If no F neighbor is closer, return F. The traversal evaluated a handful of vertices rather than all vectors.

Maintain a `visited` set so cycles cannot cause repeated work. If only the single best current node is followed, memory is proportional to visited IDs and the path is cheap. A broader **best-first** variant maintains a candidate priority queue ordered by query distance and an explicit result set. It expands the best unexpanded candidate and can continue after one path stalls. The wider search costs more distance computations but improves recall by exploring alternative routes.

Graph traversal is approximate because it does not prove that an unseen vertex is farther than the current result. Exact linear k-nearest-neighbor search computes the query distance to every one of $n$ vectors, $O(nd)$ arithmetic for dimension $d$. Graph search computes distances only for neighbors of visited vertices, roughly $O(vMd)$ if it visits $v$ vertices of degree $M$. The advantage exists when $vM\ll n$.

Distance computation and memory movement both matter. A 768-dimensional float32 vector is 3,072 bytes. Evaluating 10,000 scattered vectors moves about 30 MB before graph metadata; batching neighbor vectors contiguously and using SIMD dot products improves throughput. Caching the query norm and normalizing corpus vectors offline avoid repeated work. Graph navigation reduces the number of vectors touched, while quantization later reduces bytes per touched vector.

For top-k rather than one nearest neighbor, retain a bounded result queue and continue exploring while candidates could plausibly improve it. A stopping rule governs the latency-recall tradeoff: stop early for speed, or expand more candidates for recall. The exact knobs belong to later ANN implementations; the stable judgment is that the graph does not eliminate search effort, it exposes a controllable frontier between exhaustive scoring and one fragile greedy path.

Multiple entry points help when the graph has separated regions. Start from several seeds, or select an entry using a coarse partition, then keep the best traversal. This spends more work to reduce dependence on one arbitrary start. Deterministic tie-breaking and a visit budget make latency reproducible; wall-clock-only stopping can produce variable results under load.

## Local Minima in Greedy Search and Why Layered Graphs Help

A **local minimum** is a vertex closer to the query than all of its stored neighbors but not the globally closest vertex. Greedy traversal stops because every legal one-edge move looks worse, even though a better region exists beyond a temporarily worse step. The failure comes from the graph, not the distance metric.

Consider query at 10 on a number line. Entry A is at 0, connected to B at 6. B is connected back to A and to C at 4, while the true nearest D at 9.8 is connected only to C. Greedy moves A → B because distance falls from 10 to 4. From B, A has distance 10 and C has distance 6, both worse than 4, so it stops at B. Reaching D requires first moving away from the query through C. Pure greedy search forbids that escape.

Disconnected components are the extreme form: no sequence of edges reaches the true region at all. Poor neighbor selection can also form dense clusters with few bridges, a geometric community that traps walks. High-dimensional spaces intensify the problem because distance contrast weakens and local neighbor relations can be noisy.

Increasing degree adds escape routes but raises memory and per-expansion cost. Broader best-first search can cross a valley by preserving alternative candidates instead of committing to one path. Multiple random restarts sample different basins. These are useful but spend work at the same local scale.

A **layered graph** adds a small upper graph containing a subset of vertices and longer-range connections, above a dense base layer containing all vertices and local links. Search begins at the sparse top. Greedy moves there cover large geometric distances because upper-layer neighbors are far apart. Once no upper neighbor improves the query, descend at that vertex to a denser layer and refine with shorter links. This resembles using highways for the cross-city trip, then local streets near the destination.

Worked layout: ten base clusters lie along a line, each with dense local edges. A base-only walk entering cluster 1 may need many hops and can be trapped by weak bridges before cluster 9. An upper layer keeps one representative per cluster and links representatives across several clusters. The search jumps 1 → 5 → 8 at the upper layer, descends, then walks locally to 9.8. The long links reduce path length and approach the correct basin before local refinement.

Layering does not guarantee exactness. If upper links are poor, the entry path can still choose the wrong region; if base connectivity is insufficient, descent cannot repair it. More layers, degree, candidate breadth, and construction effort improve navigability but consume memory and latency. Search recall must be measured against exact neighbors on representative queries.

The reason layers help can be stated as scale matching. Local nearest-neighbor edges are useful when already near the query but inefficient for crossing the corpus. Sparse long-range edges are useful for global routing but too coarse to identify the final nearest vectors. Combining scales supplies both reach and precision. This is the conceptual seed of hierarchical navigable small-world indexes taught later, without assuming that every layered graph automatically has their construction or guarantees.

Experts diagnose a recall miss by tracing the path: was the true component unreachable, did greedy stop at a local minimum, did the candidate budget end early, or were approximate distances distorted? The remedies differ. Connectivity requires better construction; local minima require breadth, restarts, or bridges; budget misses require more search; distorted distance requires representation repair. “Increase the ANN parameter” is not a diagnosis until the failed navigation mechanism is known.
