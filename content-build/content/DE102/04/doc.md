An AI retrieval corpus is not one table of text. It is a chain of versioned entities: source documents, parsed representations, chunks, and model-specific embeddings. A reliable data model gives each layer a precise grain and identity, then preserves enough lineage to rebuild an answer, invalidate stale artifacts, and cite the original source.

## Documents, Chunks, and Embeddings as Modeling Grains

A document row represents one logical source item or, in a versioned model, one immutable state of that item. A chunk row represents one retrieval unit derived from one document version under one chunking configuration. An embedding row represents one model-specific vector for one embeddable input. Treating these as separate grains avoids repeating document metadata on every vector and prevents one update from overwriting unrelated artifacts.

A practical model might contain `document`, `document_version`, `chunk`, and `embedding` tables. `document` stores stable source identity and ownership. `document_version` stores immutable content, source timestamps, parser version, and permissions. `chunk` stores text, ordinal, character or byte boundaries, and chunker configuration. `embedding` stores or references a vector plus model identifier, dimensionality, normalization policy, and creation time.

The cardinalities are meaningful. One document has many versions. One version has many chunks. One chunk can have many embeddings when multiple models, dimensions, or preprocessing policies coexist. A uniqueness rule such as `(chunk_id, embedding_model_version)` prevents duplicate vectors while allowing a controlled migration.

Embedding grain is sometimes broader or narrower than chunk grain. A multimodal embedding may combine text and an image region. A late-interaction model may produce multiple token vectors per chunk. A document-level vector may support broad candidate retrieval before chunk reranking. The schema should name the input unit explicitly rather than assuming every vector is one fixed-length chunk.

Avoid embedding vectors directly in the document row when one document produces many chunks. That creates repeated or nested state that is difficult to update independently. Conversely, a vector database may denormalize document title, permission filter, and source URI into each vector record for serving speed. The normalized corpus catalog should remain the authority, and replication rules should make the serving copy reconstructable.

Lifecycle differs by grain. A metadata correction might create a new document version without changing normalized text. A parser upgrade creates new parsed content and chunks. An embedding-model upgrade should regenerate embeddings without inventing new source documents. Independent identities let pipelines invalidate only affected descendants.

Facts about processing also deserve their own grain. An ingestion run, parse attempt, chunking run, or embedding batch can record status, configuration, errors, and counts. Storing only a `processed=true` flag on the document loses retries and makes partial failure invisible. A run-to-artifact relationship supports audits and idempotent recovery.

Access control must follow the source version into serving artifacts. If a chunk is retrievable without its document's current permission context, denormalization can leak content. Store immutable permission snapshots when historical reconstruction is required, and propagate revocations promptly to vector and cache layers.

The modeling test is whether every row has one unambiguous meaning. If an embedding row sometimes represents a chunk and sometimes a whole document without a type and parent, its scores and lineage cannot be interpreted. Explicit grain turns corpus processing into manageable data engineering rather than a pile of model outputs.

## Chunking as a Grain Decision

Chunking chooses what one retrieval row means. A chunk may be a paragraph, a fixed token window, a section, a code function, a table, or a semantic segment. This is not merely preprocessing: the choice determines recall, context coherence, citation precision, vector count, and the unit a ranker scores.

Small chunks create focused matches and precise citations but can lose surrounding definitions. Large chunks preserve context but dilute key terms, consume more model tokens, and may mix unrelated sections. A 2,000-token policy chapter can contain the answer plus many distracting clauses; a 50-token fragment may omit the condition that changes the answer.

Overlap mitigates boundary loss. With window size 400 tokens and stride 300, adjacent chunks overlap by 100 tokens. A statement spanning a boundary can appear intact in at least one chunk. The cost is duplication: approximately `ceil((L - window)/stride) + 1` chunks for a document of L tokens, and overlapping passages can crowd the result list.

Structure-aware chunking respects headings, paragraphs, sentences, code blocks, or table rows. It can assemble neighboring units until a token budget is reached, preserving semantic boundaries. Hard maximums remain necessary because one malformed paragraph or minified file may exceed the embedding model's context limit.

Chunk identity must incorporate the decision. If `chunk_7` means ordinal seven, inserting text near the beginning shifts every later ordinal and makes unchanged chunks appear changed. Derive identity from document version, chunker version, boundaries, and optionally normalized chunk content. The precise recipe depends on whether identity should represent occurrence, content, or both.

Store configuration such as tokenizer, target size, maximum size, overlap, boundary rules, table handling, and normalization version. "400 tokens" is ambiguous when tokenizer versions differ. Configuration hashes make it possible to compare or reproduce chunk sets during experiments.

Chunking can be hierarchical. Store small child chunks for precise retrieval and parent sections for context expansion. The ranker retrieves a child, then the answer builder loads its parent or neighbors within a budget. Parent-child IDs and ordered adjacency make this deterministic.

Evaluation should slice by document type and question shape. Code, tables, contracts, and prose often need different policies. Measure retrieval recall, answer grounding, citation correctness, duplicate-result rate, token cost, and latency. A chunking policy that increases vector recall but produces incomplete citations may be unsuitable for the product.

Changing chunk grain is a schema migration. Build the new chunk set under a new version, embed it, validate coverage, switch serving aliases, and retain rollback capability. Do not update rows in place while a live index mixes incompatible boundaries and IDs.

## Stable IDs and Content Addressing via Hashing

Stable identifiers let repeated ingestion recognize the same logical entities. A document ID may derive from a durable source key plus namespace, not a mutable title or URL alone. A version ID identifies one immutable state. Chunk and embedding IDs identify derived artifacts under their configurations.

Content addressing derives identity or deduplication keys from bytes. A cryptographic hash of canonical content changes when the canonical content changes and remains stable across identical inputs. This enables idempotency, cache lookup, corruption detection, and reuse. The hash is evidence of equality under the canonicalization rule, not a replacement for source identity.

Canonicalization must be explicit. Normalizing line endings may prevent meaningless version churn. Collapsing all whitespace might incorrectly merge code or tables where whitespace matters. Lowercasing can change case-sensitive identifiers. Record the canonicalization version in the hash domain so future changes do not silently collide semantically different recipes.

Domain separation avoids ambiguous IDs. Hash a structured input such as `document_version_id`, artifact type, chunker configuration hash, start and end boundaries, and content hash. An embedding ID can include chunk ID and model version. Length-prefixed fields or canonical structured serialization prevent concatenation ambiguity.

For example, `embedding_id = hash("embedding-v1", chunk_id, model_id, preprocessing_hash)`. Re-running the same work yields the same ID and an upsert becomes idempotent. Changing the model or preprocessing yields a different ID, allowing both versions to coexist during migration.

Hashes do not eliminate collision handling or verification. Use a modern hash with sufficient output length, preserve the original metadata, and compare length or bytes when an equality decision has high consequence. Do not expose raw hashes of low-entropy secrets because attackers can guess input and compare hashes.

Mutable pointers still have a role. A serving alias can point from logical document to current version or from model family to active embedding index. The immutable IDs preserve history; the pointer supports current behavior. Updating the pointer is safer than rewriting every artifact's identity.

Stable IDs make deletion tractable. A lineage graph can enumerate every descendant of a document version and remove chunks, embeddings, caches, and index entries. Random IDs without deterministic relationships can still work if lineage tables are complete, but content-derived IDs improve retry behavior and duplicate detection.

## Lineage: Tracing a Chunk to Its Source Document and Offset

Lineage records where an artifact came from and how it was produced. For a retrieved chunk, the minimum path is embedding to chunk, chunk to document version, and version to source document. Processing-run links add parser, chunker, and embedding configurations.

Offsets anchor the chunk in source content. Character offsets are intuitive but depend on Unicode representation. Byte offsets are exact for stored bytes but less convenient for display. Token offsets depend on a tokenizer. Many systems store normalized-text character offsets plus source mapping metadata, and always specify whether ends are exclusive.

If normalized text differs from source HTML or PDF, a simple offset may not locate the original passage. Parsers can retain page numbers, block IDs, bounding boxes, DOM paths, or a mapping from normalized spans to source spans. Citation requirements should shape parser outputs before chunking begins.

Lineage enables answer citations. When retrieval returns a chunk, the application obtains source URI, document title, version, page or section, and exact span. It can verify that quoted text occurs in the recorded artifact. Without lineage, a plausible source link may point to a current document version that no longer contains the evidence.

It also enables impact analysis. If parser version P3 has a bug, query lineage for every chunk produced by P3, rebuild only those descendants, and compare counts. If a source document is deleted, traverse descendants to vector indexes and caches. A plain text blob with no parent cannot support targeted repair.

Store transformations as immutable, versioned records or manifests. Include code or configuration version, input IDs, output IDs, timestamps, checksums, status, and error details. Large many-to-many lineage graphs may live in catalog tables rather than artifact rows, but queries should remain reliable and access-controlled.

Validate lineage with referential integrity and coverage tests. Every active embedding should resolve to an active chunk and permitted source version. Chunk boundaries must lie within the recorded normalized text. Chunk content hashes should match the stored slice when the chunk is defined by offsets. Orphan counts should be zero.

Lineage is also an explanation boundary. It can prove which source and transformation produced an artifact, but not that the source is true or the answer is correct. Combine provenance with relevance evaluation, source-quality policy, and runtime grounding checks. A trustworthy corpus makes origin verifiable and uncertainty visible.
