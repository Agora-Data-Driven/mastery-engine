Acquisition obtains bytes; retrieval needs trustworthy text with structure and provenance. A perfect ranker cannot recover meaning erased by a broken PDF extractor, and an LLM will confidently quote navigation menus if boilerplate dominates chunks. Extraction is therefore a data-quality stage with typed inputs, versioned parsers, measurable failure signals, and an explicit decision to accept, retry, quarantine, or discard each artifact.

## Main-Content Extraction and Boilerplate Removal

An HTML page contains far more than its article: headers, navigation, cookie banners, related links, comments, advertisements, and footers. **Main-content extraction** identifies the DOM region carrying the page's primary semantic content and removes repeated site chrome.

The mechanism combines features. Text-dense blocks with long sentences and low link density are likely content; blocks dominated by short anchors are likely navigation. Semantic elements such as `<main>` and `<article>`, headings, paragraph counts, CSS classes, and repeated templates across pages provide additional signals. Readability-style algorithms score DOM subtrees and select a high-scoring ancestor, then clean unlikely descendants.

Worked page: a documentation page contains 1,200 words of article text, a 300-link navigation tree, 100 footer words, and a 50-word cookie banner. Naive `document.body.innerText` produces perhaps 3,000 tokens, with navigation labels repeated on every crawled page. A main-content extractor selects the `<main>` subtree and retains title, headings, paragraphs, lists, and code, producing roughly the 1,200 useful words.

Boilerplate harms twice. It dilutes relevance: common navigation terms enter every document, inflating document frequency and returning wrong pages. It also creates near-duplicates because thousands of pages share most template text. Chunking the full body can generate identical menu chunks that consume embedding and retrieval capacity.

Template learning across a site can mark DOM paths repeated on most pages as boilerplate. But repetition is not proof of uselessness: a safety warning or product-version banner repeated site-wide may be essential context. Conversely, unique advertisements may evade repetition rules. Preserve metadata for removed regions or sample them during quality review.

Client-rendered pages complicate extraction. The fetched HTML may contain only an application shell; useful text appears after JavaScript execution or an API call. A headless browser can render the page, but increases cost, attack surface, nondeterminism, and wait-policy complexity. Prefer stable content APIs or embedded structured data when authorized; render only sources that need it, under sandbox and resource limits.

Worked failure: extracted text is just `Enable JavaScript to continue`, 30 words, while the rendered page holds an API guide. The pipeline should not mark extraction successful because the parser returned a string. Low text length plus shell phrases should trigger a rendered fallback or quarantine.

Judgment uses source-specific evaluation. Maintain gold pages with expected headings or key passages, measure text yield, link density, template overlap, and regressions by extractor version. Store raw artifact hashes so improved extraction can be rerun without refetching. Main-content selection should remove chrome while retaining code examples, tables, warnings, and captions that carry meaning.

## HTML to Clean Text: Which Structure to Preserve

After selecting content, conversion must preserve relationships that plain whitespace cannot express. The goal is a stable, readable intermediate such as Markdown-like text plus a structural map, not an undifferentiated string.

Preserve:

- Document title and heading hierarchy, because they supply context to child passages.
- Paragraph and list boundaries, including ordered-list numbering where sequence matters.
- Table rows and headers, because cell meaning depends on row-column association.
- Code blocks and inline code, including whitespace where syntax depends on it.
- Links as anchor text plus destination metadata, especially citations and references.
- Image alt text and captions when they convey content.

Remove scripts, styles, hidden elements, tracking text, duplicated navigation, and purely decorative labels. Decode HTML entities and normalize line endings, but retain original source offsets or DOM references when citations must map back to the page.

Worked conversion:

```html
<h2>Limits</h2>
<p>Maximum batch size is <code>100</code>.</p>
<ul><li>Retry 429 responses.</li><li>Do not retry 400 responses.</li></ul>
```

becomes:

```
[Level-2 heading] Limits
Maximum batch size is `100`.
- Retry 429 responses.
- Do not retry 400 responses.
```

Flattening it to `Limits Maximum batch size is 100 Retry 429 responses Do not retry 400 responses` loses which statements are list peers and that `100` is literal code.

Tables need care. A simple rectangular table converts to Markdown or row records with headers repeated semantically. Complex merged cells may require HTML preservation or structured JSON. Reading cells row-major without headers produces misleading text such as values detached from units. A pricing table should yield records like `tier=standard, requests_per_minute=1000`, not a bag of numbers.

Whitespace normalization should collapse decorative runs while preserving paragraph, preformatted code, and line-break semantics. Hidden DOM text must be excluded according to rendered accessibility rules, yet CSS-dependent visibility is hard without rendering. Source-specific tests matter.

The converter should emit a deterministic content hash after normalization. If the same raw page produces different output under a new parser version, retain both version and hash so downstream chunks and embeddings can be invalidated deliberately. Do not overwrite source provenance with cleaned text; store URL, fetch time, content type, raw hash, extractor version, language, and structural offsets.

Judgment depends on downstream use. Bag-of-words search can tolerate less layout than citation-grounded RAG. Text-to-code retrieval requires exact code. Table question answering requires headers and cells. Preserve the minimum structure that supports declared features, but err toward reversible structured representation before lossy flattening. Cleaning should remove presentation noise, not semantic organization.

## Extracting Text from PDFs and Office Documents

PDF is a page-description format, not a semantic document format. It stores glyphs at coordinates; reading order, paragraphs, tables, and even spaces may be absent. Extraction first determines whether pages contain an embedded text layer. If so, parse glyphs and infer lines and blocks from coordinates. If not, render page images and run optical character recognition (OCR).

Worked two-column page: visual reading order is left column top-to-bottom, then right column. A naive extractor sorts all glyphs by vertical coordinate and alternates left and right lines, producing nonsense. Layout-aware parsing clusters text into columns and blocks before ordering them. Headers and footers repeated at similar page coordinates can be removed while retaining page numbers for citation.

OCR introduces recognition errors. `O` versus `0`, `l` versus `1`, hyphenated line breaks, and low-resolution scans corrupt identifiers and numbers. Store OCR confidence by page or span, the engine/version, and the rendered page reference. A page with low confidence should be retried with better resolution or quarantined, not silently treated as authoritative.

Tables in PDFs require layout extraction: detect ruling lines or aligned text, infer rows and columns, and validate header associations. Formulae and diagrams may need specialized extraction or image retention. Reading order and page coordinates should be stored so citations can reference page and bounding box.

Office formats such as DOCX, PPTX, and XLSX are ZIP packages of XML and assets. Use format-aware parsers, not string extraction from the archive. DOCX has paragraphs, styles, tables, headers, footnotes, comments, and tracked changes. Decide whether to accept revisions or expose both versions. PPTX requires slide order, text boxes, speaker notes, and shape geometry; reading XML order can differ from visual order. XLSX contains typed cells, formulas, displayed values, sheets, merged cells, and hidden rows.

Worked spreadsheet: cell B2 contains formula `=A2*1.1`, cached displayed value `110`, and header `Adjusted Price`. Extraction must decide whether the corpus needs formula, value, or both. Emitting only `110` loses logic; emitting only the formula may not answer a business question. Record sheet, cell coordinates, headers, value, and formula.

Security is mandatory. Documents can contain macros, external links, decompression bombs, malformed objects, and parser exploits. Parse in isolated workers with CPU, memory, page, file-count, and decompressed-size limits. Do not execute macros or follow external resources. MIME-sniff content rather than trusting filename extensions.

Judgment routes by type and quality. Born-digital PDF text extraction is cheaper and usually more accurate than OCR. Scanned pages need OCR. Complex layouts may need a managed layout model; simple documents do not justify that cost. Preserve raw files and extraction provenance so better parsers can regenerate text. Never call a PDF “empty” until distinguishing a scan from a genuinely blank artifact.

## Extraction Quality Judgments: When to Discard a Document

Extraction quality is multidimensional. A nonempty string can still be unusable through scrambled order, boilerplate dominance, encoding corruption, missing tables, repeated pages, or OCR hallucinations. Build a quality record and route the artifact according to thresholds.

Useful signals include:

- Text yield: extracted characters or tokens per page and relative to file size.
- Printable-character and replacement-character ratios.
- Language confidence and consistency with source expectations.
- OCR confidence and fraction of low-confidence spans.
- Repetition: duplicate lines, headers, footers, or repeated page bodies.
- Structural coverage: headings, paragraphs, tables, code, pages processed versus expected.
- Boilerplate/link density for HTML.
- Parser warnings, timeouts, truncated output, and encrypted or password-protected status.

Worked thresholds for a 20-page English PDF: 19 pages parse, median 350 words per page, replacement characters below 0.1%, and OCR confidence 0.96. It passes. Another yields 25 words total, 15% replacement characters, and only two processed pages; it fails automatic acceptance and should retry or quarantine.

Routing has at least four outcomes. **Accept** when quality passes. **Retry with fallback** when another renderer, OCR engine, password path, or parser may repair it. **Quarantine for review** when the document is important but confidence is uncertain. **Discard** when content is provably empty, out of scope, unsupported after fallbacks, malicious, or below a documented utility threshold.

Discarding should not erase evidence. Store source ID, raw hash or retained artifact according to policy, reason code, extractor attempts, metrics, and decision time. This prevents endless reacquisition and supports later reprocessing. A discard is a lineage event, not absence.

Quality must be source- and type-aware. A two-line release notice is valid despite low token count; a 200-page manual with two lines is not. A code file has unusual punctuation that would fail a prose heuristic. Combine rules rather than one global minimum length.

Duplicate and near-empty pages need document-level judgment. Removing repeated headers is good; removing every page because a template detector calls the legal warning boilerplate may destroy the document. Sample output and maintain gold fixtures for known layouts.

Downstream impact supplies the final metric. Evaluate whether extracted documents answer gold queries, preserve cited spans, and avoid corrupted chunks. Track rejection and fallback rates by source and extractor version; a sudden spike is an incident. Human review samples should include both accepted and rejected cases to estimate false acceptance and false rejection.

Judgment biases depend on risk. A broad web research corpus may discard low-value failures cheaply. A compliance corpus cannot silently discard a required contract; quarantine and alert instead. The governing principle is explicit uncertainty: low-quality text should never enter the same trusted path as verified extraction merely because both are strings.
