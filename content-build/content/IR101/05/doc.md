An inverted index can contain billions of document IDs and positions, and those bytes sit directly on the query path. Compression is therefore a speed feature as much as a storage feature: fewer bytes fit in cache, cross storage boundaries faster, and let more postings remain memory-resident. The central technique is to exploit sorted order, transform large absolute IDs into small gaps, and encode those small positive integers with a representation whose decode cost is predictable.

## Delta (Gap) Encoding of Postings

Postings document IDs are strictly increasing within a segment. **Gap encoding** stores the first ID, then the difference between each ID and its predecessor:

$$g_1=d_1,\qquad g_i=d_i-d_{i-1}\text{ for }i>1$$

Document IDs `[1000, 1003, 1007, 1012]` become gaps `[1000, 3, 4, 5]`. Decoding uses prefix sums: 1000; $1000+3=1003$; $1003+4=1007$; $1007+5=1012$. The transformation is lossless as long as order and the initial base are preserved.

Why it works follows from distribution. Absolute IDs grow with corpus size and may need 32 or 64 bits. Gaps depend on postings density. A term appearing in one of every ten documents has average gap around 10 even if document IDs reach a billion. Small integers require fewer bits under variable-length or bit-packed codes.

Worked raw cost: four 32-bit IDs need 128 bits. If gaps 3, 4, and 5 can be encoded in one byte each while 1000 needs two bytes under a variable-byte scheme, total is five bytes or 40 bits, ignoring a tiny block header. The saving increases over long lists.

Frequent terms have dense postings and small average gaps, so they often require fewer bits **per posting** than rare terms. A rare term may have large gaps, but it has fewer postings overall. Total list size reflects both document frequency and bits per gap.

Positions inside one document use the same transform. Positions `[2, 10, 20]` become `[2, 8, 10]`, then reset when the next document begins. Term frequencies tell the decoder how many position gaps belong to each posting. Other monotone values, such as offsets into a postings file, can also be delta-encoded.

Sorted order is nonnegotiable. An out-of-order ID produces a negative gap, which many postings codes do not support and which breaks monotone traversal. Duplicate document IDs should be combined into one posting with multiple positions; a zero document gap may be representable but violates the expected one-posting-per-term-document contract.

Large gaps remain large. Gap encoding exposes local scale but does not guarantee every integer is small. Block formats choose a bit width per block, use exceptions for outliers, or mix coding schemes. Segment boundaries reset document-ID bases, so many smaller segments may lose some compression compared with one globally ordered list while improving updateability.

Compression affects skipping. To jump into a delta stream, the decoder needs a known absolute base at a block boundary plus a byte offset. Blocks therefore carry metadata such as last document ID, count, and compressed length. Skipping to a block avoids decoding all preceding gaps.

Judgment: gap encoding is nearly universal for ordered postings because subtraction and prefix addition are cheap. Measure distribution by term and block, not only average gap, because one outlier can inflate fixed-width packing. Validate monotonicity and decoded counts in build tests. Corruption in one gap shifts every later prefix sum, so block checksums and restart points limit blast radius.

Document-ID assignment influences the gap distribution. If documents from the same topical or temporal region receive nearby IDs, some term postings become locally dense and compress better; random IDs destroy that locality. Yet assignment must remain stable across rebuilds and must not make authorization or deletion brittle. Compression is a secondary objective behind identity correctness. Segment-local remapping can improve physical density while preserving an external stable document ID through a separate mapping table.
That mapping adds lookup state, so its serving cost must be measured with the saved postings bytes.

## Variable-Byte Encoding

**Variable-byte encoding** stores a nonnegative integer in groups of seven payload bits. Each byte reserves one bit as a continuation or terminal marker. One common convention sets the high bit to 1 on the final byte and 0 on preceding bytes; exact polarity varies, so a format must document it.

Under the terminal-high-bit convention:

- Values 0 through 127 need one byte.
- Values 128 through 16,383 need two bytes.
- Values through $2^{21}-1$ need three bytes.

Encode by expressing the integer in base 128. For 5, the single payload group is 5, so emit a byte with terminal bit set. For 130, $130=1\times128+2$, so payload groups are 1 and 2; emit the first with continuation state and the second with terminal state. The bit pattern depends on group order, but decoding always accumulates seven-bit groups until the terminal marker.

Worked postings gaps `[1000,3,4,5]`: 1000 needs two groups because it exceeds 127; 3, 4, and 5 each need one. Five bytes replace sixteen fixed-width bytes. Gap 16,384 crosses the next boundary and needs three bytes, illustrating that storage changes stepwise rather than smoothly.

The decoder loops byte by byte:

1. Read a byte.
2. Append or accumulate its seven payload bits.
3. If terminal, emit the integer; otherwise continue.
4. For postings, add the gap to the previous document ID.

The advantages are simplicity, byte alignment, and tolerance of mixed magnitudes. No bit-level seek is required, and an outlier uses more bytes without forcing every neighboring value to adopt its width. It is a strong teaching codec and a practical baseline.

The cost is branchy decoding and one marker bit per byte. A stream of tiny gaps uses eight bits to store values needing perhaps three or four. Modern block codecs bit-pack many integers at a shared width and decode with SIMD, often achieving better ratio and throughput. Variable-byte remains useful when simplicity, random restart, or heterogeneous values matter more than maximum compression.

Byte order and terminal convention must be consistent. A decoder expecting terminal-high-bit cannot read continuation-high-bit data. Protect formats with magic/version metadata and golden byte-level test vectors. Malformed input with no terminal byte must fail at a bounded length rather than read indefinitely or overflow an integer.

Random access into a raw variable-byte stream is poor because byte position $p$ may land in the middle of an integer and preceding gaps determine absolute IDs. Block indexes solve this: every block records compressed offset and an absolute or previous ID. Within the block, decode sequentially.

Judgment depends on total query latency, not ratio alone. A denser codec saving 20% may lose if it doubles decode CPU on hot postings; conversely, a faster compact block codec can win twice by reducing memory movement and arithmetic. Benchmark realistic term-frequency distributions, cache state, intersections, and skip behavior rather than encoding isolated random integers.

## Postings Compression vs Parquet Encodings

Postings compression and Parquet column encoding share one principle: apply a cheap reversible transform that exposes low entropy, then spend bits according to residual magnitude or repetition. Delta-encoded document IDs resemble Parquet `DELTA_BINARY_PACKED` timestamps; dictionary-encoded column values resemble mapping terms or values into compact integer IDs; run-length encoding benefits repeated small codes in either system.

Worked parallel:

- Postings IDs `[1000,1003,1007,1012]` become gaps `[1000,3,4,5]`, then variable-byte or block packing.
- Sorted event timestamps `[1000,1003,1007,1012]` in a Parquet page undergo the same delta transformation and bit packing.
- A `status` column with four strings maps to 2-bit dictionary indexes; long equal-index runs can use RLE.

The major difference is access path. Search traverses postings during an interactive query, intersects lists, skips blocks, and accumulates scores. Decode latency and the ability to jump without expanding all values are critical. Parquet analytics normally reads selected column pages into vectorized batches, decodes thousands of values, and applies predicates or aggregates. Random access to one value inside a compressed page is less central.

Grain differs too. A postings list is already partitioned by term and stores monotone document IDs with optional nested positions. Parquet stores columns within row groups and needs repetition/definition levels for nested schemas. Row-group statistics enable pruning before page decode; postings dictionaries and skip metadata identify relevant lists and blocks.

General-purpose codecs such as Snappy or Zstd may compress encoded Parquet pages after type-aware encoding. Search postings typically rely heavily on specialized integer codecs because decoding lies in the tight scoring loop; applying a heavy whole-stream codec can destroy skip granularity and add latency. Some index formats compress stored fields or larger blocks with general codecs while keeping navigation metadata independently addressable.

Sortedness helps both. In postings, document order is required for intersection and creates small gaps. In Parquet, sorting a column tightens min/max statistics, creates runs, and reduces deltas. The same write-time ordering choice improves compression and reads.

Their optimization objectives differ. A warehouse often favors high scan throughput and reduced billed bytes over many columns. A search engine favors tail latency, cache residency, and selective decode of a few term lists. A codec that gives excellent whole-file ratio but requires decompressing an entire large stream to reach one posting is unsuitable for search.

Worked judgment: a hot term list is read thousands of times per minute and frequently skipped by blocks. Choose a block integer codec with restart points and fast SIMD decoding even if Zstd could make the full list slightly smaller. A cold archival Parquet column read once a month may justify stronger Zstd because storage savings amortize one slower decode.

Both ecosystems require versioned formats, checksums, and metrics for compressed bytes per value and decode throughput. Neither should optimize compression ratio in isolation. The correct metric is work avoided per unit of CPU and complexity under the real read pattern. Compression succeeds when moving and caching fewer bytes saves more than transformation and decoding cost.
