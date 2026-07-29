A text corpus becomes useful only after bytes are extracted, normalized, deduplicated, classified, and filtered under reproducible rules. Each stage changes what downstream models can learn and retrieve. Separating stages and recording their versions makes false removals, parser defects, and distribution shifts diagnosable instead of irreversible.

## Parsing and Extraction as Pipeline Stages

Parsing converts source formats such as HTML, PDF, office documents, email, and code into structured content. Extraction selects text, headings, tables, links, images, metadata, and source locations needed downstream. These are distinct from chunking: parsing reconstructs a document representation, while chunking later chooses retrieval units.

Use immutable source bytes as the input boundary. Record content hash, media type, source URI, fetch metadata, parser name, parser version, options, and run ID. Output a versioned parsed artifact rather than overwriting the source record. A parser upgrade can then rebuild descendants without pretending the original document changed.

HTML extraction should remove navigation, scripts, cookie banners, and repeated chrome while preserving meaningful headings and links. PDF extraction must handle reading order, columns, headers, footers, page numbers, scanned images, and tables. OCR adds its own model version, confidence, and layout errors.

Source offsets matter. Normalized text character positions may not map directly to HTML bytes or PDF coordinates. Preserve page and block identifiers, DOM paths, bounding boxes, or span mappings so a retrieved chunk can cite the original evidence. A plain text blob without mapping is insufficient for reliable citations.

Parsing failure should be explicit. Emit a success artifact, a partial artifact with warnings, or a quarantine record with error class and diagnostics. Do not silently return empty text, which looks like a valid short document and can pass downstream unnoticed. Track empty rate and extracted-to-source-size ratios by format.

Normalization policies include Unicode normalization, whitespace handling, line endings, hyphenation repair, and boilerplate removal. Aggressive normalization can change code, identifiers, or tables. Version policies by document type and retain pre-normalized output when audits need to distinguish parser from normalizer errors.

Stage boundaries improve testing. Golden fixtures can assert extracted headings, page spans, table cells, and exact text under each parser version. Corpus-level canaries measure length distributions, language shifts, and failure rates before a new parser is promoted.

Resource limits protect the pipeline from hostile or malformed inputs. Cap decompressed size, page count, recursion depth, OCR time, and memory per artifact. Record a specific limit-exceeded outcome instead of retrying forever. Parse untrusted formats in isolated workers with restricted network and filesystem permissions.

## MinHash and SimHash for Near-Duplicate Detection

Exact hashes detect byte-identical content but miss documents with reordered whitespace, templates, minor edits, or inserted banners. Near-duplicate methods create compact signatures that approximate a similarity measure, allowing a pipeline to cluster variants before training or retrieval.

MinHash estimates Jaccard similarity between sets. Convert each document into a set of shingles, such as normalized word 5-grams. Jaccard similarity is `|A intersection B| / |A union B|`. For each independent hash permutation, retain the minimum hashed shingle. The probability that two documents share one MinHash component equals their Jaccard similarity.

With 128 signature components, the fraction of matching components estimates Jaccard similarity. If 102 components match, the estimate is about `102/128 = 0.797`. More components reduce estimator variance but increase storage and comparison cost. Shingle size changes sensitivity: small shingles tolerate edits but create accidental overlap; large shingles demand longer exact runs.

SimHash approximates angular or cosine similarity of weighted features. Hash each feature to a bit vector, add or subtract its weight in every bit dimension depending on the hash bit, then set each signature bit by the sign of the accumulated coordinate. Similar feature-weight vectors have small Hamming distance between signatures.

MinHash is natural for set overlap and document containment variants when using suitable shingling. SimHash is useful for weighted bag-of-features similarity and detecting pages with similar content under small edits. Neither signature proves semantic equivalence; two contradictory documents sharing a template can look near-duplicate.

Containment requires special treatment when document lengths differ greatly. A short article copied inside a long compilation can have low symmetric Jaccard similarity despite substantial reuse. Compare containment ratios or segment the long document, then retain the metric and threshold in pair provenance.

Review canonical selection separately from similarity classification because they optimize different operational, legal, downstream, governance, retention, and quality risks.

Canonical selection needs policy. Keep the earliest source, highest-quality version, authoritative domain, or richest metadata, and link duplicates to it. Do not simply delete all but one before preserving provenance. Permissions, language, timestamps, and legal retention can make two similar texts operationally distinct.

Evaluate thresholds on labeled pairs. Measure precision and recall by document type and length. Short texts have few shingles and unstable similarity. Boilerplate can dominate. Remove known template regions or weight content blocks before signing, while versioning that choice.

Deduplication purpose changes the acceptable error. Training may remove repeated pages to reduce memorization, while retrieval may retain jurisdiction-specific copies whose wording is identical but metadata differs. Define whether the unit is content, source record, document version, or permission-scoped artifact before labeling a pair duplicate.

## LSH: Finding Near-Duplicates Without All-Pairs Comparison

Comparing every pair of N documents requires roughly `N*(N-1)/2` comparisons, which is infeasible at corpus scale. Locality-sensitive hashing, or LSH, places signatures into buckets so similar items are likely to collide and become candidate pairs. Exact or higher-quality similarity is then computed only for candidates.

For MinHash banding, divide a signature into b bands of r rows. Two documents become candidates if all r values match in at least one band. If their Jaccard similarity is s, the candidate probability is `1 - (1 - s^r)^b`.

With 20 bands of 5 rows and similarity 0.8, candidate probability is `1 - (1 - 0.8^5)^20`, approximately 0.9996. At similarity 0.3, it is about 0.0475. Banding creates an S-shaped threshold: high similarities collide often, while low similarities usually do not.

More bands with fewer rows increase recall and candidate volume. Fewer bands with more rows increase selectivity and can miss true duplicates. Tune against labeled pairs plus operational budgets. The LSH stage generates candidates; a verification stage still calculates Jaccard, Hamming distance, or another exact criterion.

Buckets can become hot because of empty documents, common boilerplate, or repeated default pages. Cap or special-case pathological buckets, but do not discard them silently. A huge bucket may represent a real template family or a parsing bug producing identical empty text.

Incremental LSH inserts new signatures and compares them with existing bucket members. Stable document and signature versions are essential. When shingling or hashing changes, build a new index namespace rather than mixing incompatible signatures.

Distributed deduplication needs deterministic pair identity such as sorted `(doc_a, doc_b, method_version)`. This makes retries idempotent and prevents repeated verification. Cluster construction can use connected components, but transitivity deserves review: A may resemble B and B resemble C while A is below threshold with C.

LSH quality monitoring should measure candidate recall against a brute-force sample, candidates per document, bucket-size distribution, verified duplicate rate, and compute cost. A sudden fall in candidate count can signal incompatible signature versions; a huge rise can signal boilerplate or empty extraction.

## Language ID and Quality Filtering

Language identification assigns a language or distribution to text. It supports routing to tokenizers and models, enforcing corpus scope, and measuring coverage. Short text, code, names, and mixed-language documents are difficult, so store confidence and model version rather than only one label.

Run language ID on enough representative content. Boilerplate navigation can overwhelm the body language; extracted title alone may be too short. Section-level detection can preserve multilingual documents that a document-level majority label would misclassify.

Quality filtering removes or downweights artifacts likely to harm training or retrieval: empty text, parser garbage, repeated characters, link farms, machine-generated spam, extreme symbol ratios, unsupported languages, or unsafe content. Each rule encodes a value judgment and can create demographic or domain bias.

Use a funnel with reason codes. Record counts and retained bytes before and after parsing, exact dedupe, near-dedupe, language routing, and each quality rule. Keep a sampled quarantine or metadata record so reviewers can inspect false positives without exposing rejected content broadly.

Thresholds should vary by type. Code legitimately has high punctuation; mathematical text has symbols; chat contains short fragments; OCR contains unusual spacing. One universal alphabetic-character threshold can erase valuable subcorpora. Evaluate by language, format, source, and length bucket.

Classifier-based quality scores need calibration and drift monitoring. A model trained on polished articles may reject dialect, informal help posts, or low-resource languages. Use human-labeled audits, per-group retention rates, and counterexamples. Treat the score as one signal, not unquestioned truth.

Filtering order affects results and cost. Parsing precedes text-based filters. Exact dedupe can reduce expensive model calls. Language-specific quality models run after routing. Near-dedupe may run before or after quality scoring depending on whether canonical choice should favor the highest-quality variant.

Version every decision and retain lineage from rejected item to rule and measured features. When a threshold changes, rebuild a candidate corpus under a new version, compare distribution and downstream evaluation, then publish immutably. Do not gradually mutate the only corpus.

The final corpus report should state source coverage, parsing success, duplicate rates, language distribution, quality retention, quarantine volume, and known blind spots. A smaller corpus with explained provenance and measured filters is often more useful than a larger opaque collection whose missing voices cannot be diagnosed.

Appeals and overrides need governance. A trusted source rejected by a generic rule may receive a scoped exception, but record the owner, rationale, expiry, and affected versions. Global allowlists that bypass every later safety and quality check create permanent blind spots.
