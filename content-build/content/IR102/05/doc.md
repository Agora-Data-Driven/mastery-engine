Acquisition breadth creates a second problem: the corpus now contains popular pages, isolated gems, copied press releases, SEO farms, and sources of unequal authority. Retrieval scores alone cannot decide what deserves to be indexed or trusted. Corpus quality combines graph priors, adversarial-content detection, duplicate retention rules, and evidence-backed credibility signals while preserving enough provenance to audit every exclusion.

## Link Analysis as a Quality Prior (PageRank)

Links are endorsements with structure: a link from a page cited by many good pages should count more than a link from an isolated page, and a page linking to hundreds of targets should distribute its vote. **PageRank** formalizes this recursive intuition.

For $N$ pages, damping factor $d$ commonly near 0.85, and outgoing degree $L(v)$, PageRank satisfies:

$$PR(u)=\frac{1-d}{N}+d\sum_{v\to u}\frac{PR(v)}{L(v)}$$

The teleport term $(1-d)/N$ gives every page some probability and makes the random-surfer process able to restart. The sum transfers rank along incoming links, divided among each source page's outgoing edges.

Worked graph: A links to B and C; B links to C; C links to A. Start uniformly at $1/3$ with $d=0.85$:

- $PR_1(A)=0.05+0.85(1/3)=0.333$
- $PR_1(B)=0.05+0.85(1/3/2)=0.192$
- $PR_1(C)=0.05+0.85(1/3/2+1/3)=0.475$

The values sum to 1. Repeating the update converges to a stationary distribution. C initially gains because both A and B point to it; B receives only half of A's vote.

A **dangling page** with no outgoing links would trap probability if untreated. Standard computation redistributes its rank according to the teleport distribution, commonly uniformly, during each iteration. Sparse adjacency lists make one iteration $O(N+E)$; continue until rank change falls below a tolerance or a fixed iteration cap.

PageRank is query-independent. It estimates graph prominence or endorsement, not relevance to `Firestore transaction retry`. Use it as a prior or feature alongside lexical relevance, not as a replacement. A highly ranked homepage should not outrank a precise low-link API reference merely because of site navigation.

Link graphs contain bias. New pages have fewer links; internal site templates create thousands of non-editorial links; isolated specialist sources can be excellent. Compute separate host-level and page-level signals, downweight repeated navigation edges, and distinguish internal from external endorsements. Time-aware graphs can reduce stale accumulated advantage, but then the signal is no longer classic stationary PageRank.

PageRank is manipulable through link farms, purchased links, and mass-generated pages. No single graph score proves quality. It becomes one feature combined with spam signals, source type, citations, content quality, and human judgments.

Judgment: apply PageRank only inside the graph you intentionally collected. Missing links and crawl scope bias the result. Version the graph snapshot and parameters, validate probability mass and convergence, and inspect top pages for template artifacts. The useful interpretation is “structurally prominent in this observed graph,” never “factually correct.”

## Spam and SEO-Junk Detection

Spam detection asks whether content is designed primarily to manipulate acquisition or ranking rather than satisfy an information need. Signals operate at page, host, and graph levels; adversaries adapt, so rules must be combined and monitored.

Content signals include keyword stuffing, unnatural repetition, very high ad or affiliate density, templated paragraphs with thin unique text, doorway pages differing only by city or product name, hidden text, incoherent machine-generated passages, and a title-body mismatch. Link signals include reciprocal rings, sudden low-quality inbound bursts, and many domains sharing ownership or templates.

Worked page has 2,000 words, but 1,700 are a repeated template and city names; `best vector database` appears 120 times, 40% of visible elements are affiliate links, and the factual section is 80 words. Features might include unique-shingle ratio 0.12, query-term repetition far above peer pages, link density 0.4, and near-duplicate similarity to 5,000 sibling URLs. No single threshold proves spam, but the combination is strong.

Near-duplicate clustering is powerful against scaled junk. Generate text shingles, MinHash signatures, or normalized hashes; pages with almost identical bodies and variable slots form a cluster. Retain a representative only if the template family has value. Exact methods and LSH arrive in later data-engineering lessons; here the signal is corpus-level repetition.

Quality heuristics can harm legitimate content. API references repeat parameter templates; legal pages use formulaic language; a glossary repeats key terms; e-commerce pages naturally share layouts. Compare within source type and examine unique main content rather than full HTML. Language-aware models prevent labeling unfamiliar grammar as incoherent.

An ML classifier can combine features, but its labels and calibration matter. Optimize at an operating point reflecting asymmetric costs: accepting one junk page wastes index and may pollute answers; rejecting a rare authoritative source can be worse. Use quarantine for uncertain high-impact decisions and retain explanation features.

LLM-based quality review can identify incoherence or unsupported claims but is nondeterministic, costly, and vulnerable to instructions embedded in content. Treat page text as data, isolate prompts, request structured evidence, and never let one model judgment silently delete a corpus. Cache decisions by content hash and model version.

SEO optimization itself is not spam. Descriptive headings, structured data, and useful internal links benefit both users and search. The distinction is utility and deception, not whether a publisher cares about ranking.

Judgment pipeline: hard-reject malware, empty extraction, and clear policy violations; downrank or quarantine probabilistic junk; sample both accepted and rejected pages; track precision by source class; and provide appeal or override for curated sources. Adversarial detection decays, so monitor feature distributions and new cluster patterns.

## Corpus-Level Dedup Policy: What to Keep and What to Drop

Duplicates arise through URL parameters, print views, mirrored sites, syndicated articles, document revisions, and overlapping chunks. Deduplication needs a **cluster policy**, not merely a similarity threshold.

Exact duplicates share a normalized content hash. Near-duplicates share most content after boilerplate removal but may differ in title, date, commentary, or one crucial paragraph. Cluster at document grain using canonical IDs and similarity evidence, then choose a representative according to explicit priorities.

A representative score might consider:

1. Authoritative or original source over scraper or mirror.
2. Complete content over excerpt.
3. Stable canonical URL over tracking or print variant.
4. Current valid version over superseded revision, unless history is required.
5. Better extraction and metadata quality.
6. Permitted access and durable availability.

Worked cluster contains an original research paper, an author-hosted copy, a news summary quoting 60%, and a scraped full copy. The paper and author copy may be exact content duplicates; keep the licensed authoritative version as canonical and record the alternate URL. The news summary is not a duplicate if its commentary is a distinct information object, despite quotation overlap. Drop or quarantine the scraper.

Deduplication is task-dependent. A legal archive may retain every revision with effective dates. A current-answer RAG corpus may serve only the latest version but keep history offline. News analysis may need syndicated copies as evidence of propagation even when text is identical. Define whether identity is “same bytes,” “same work,” “same claim,” or “same current serving content.”

Do not deduplicate solely by URL canonical tags; they are publisher hints and can be wrong or malicious. Do not use one global similarity threshold across short notices and long books: a shared 100-word footer dominates a short page but is negligible in a manual. Boilerplate removal and length-aware thresholds matter.

Stable cluster IDs and membership lineage enable reversibility. Store representative ID, member IDs, similarity evidence, rule version, and reason. If the representative disappears or loses access permission, promote another eligible member without rediscovering the cluster.

Dedup affects ranking and evaluation. Leaving copies lets one source occupy several top ranks, inflates perceived recall, and gives repeated claims disproportionate weight in RAG. Removing too aggressively erases independent corroboration. Source-domain diversity can distinguish copies from genuinely independent reports, but shared wire-service text is not independent evidence.

At chunk grain, overlapping passages from one document should be collapsed during context assembly while document-level identity remains. Corpus-level dedup should occur before embedding to avoid paying for copies, but retain mappings so citations resolve to user-accessible sources.

Judgment: keep one serving representative per declared equivalence class, preserve alternates and provenance, and route uncertain clusters for review. Re-run clustering when extraction improves because bad boilerplate can create false similarity. Deduplication is an information-policy decision encoded with similarity tools.

## Source Credibility Signals for a Research Corpus

Credibility is the degree to which a source is appropriate evidence for a claim. It is not one permanent number: an official product manual is authoritative for its API, not for independent safety evaluation; a peer-reviewed paper may be authoritative for its experiment but outdated for current pricing.

Signals include:

- Provenance: identifiable publisher, author, organization, and stable URL.
- Primary-source status: specifications, official records, original datasets, and first-party documentation.
- Editorial process: peer review, corrections policy, named editors, and transparent methodology.
- Evidence: citations, accessible data, reproducible methods, and explicit uncertainty.
- Currency and version: meaningful update date, effective period, and supersession links.
- Independence and conflicts: sponsorship, affiliate incentives, and organizational interest.
- Track record: correction history and agreement with verified references.

Worked scoring rubric for a claim about a Cloud Run limit: official versioned documentation scores high on primary-source fit and currency; a two-year-old forum answer may offer useful troubleshooting but lower authority; an affiliate blog copying the forum has weak provenance and independence. For a claim about real-world user experience, the forum may supply evidence the official limit table cannot.

Store signals separately rather than collapsing immediately into one opaque score. At query time, source-type intent can weight them: factual product configuration favors official current docs; scientific synthesis favors primary studies and reputable reviews; breaking-event verification favors multiple independent sources.

Corroboration requires independence. Five sites copying one press release are one evidence lineage, not five confirmations. Dedup clusters, quoted-source links, publication timing, and shared wording help identify dependence. Preserve citation graphs and `derived_from` relationships.

Credibility does not authorize access or guarantee relevance. Apply ACL and scope constraints first, retrieve relevant candidates, then use credibility in reranking or answer policy. Low-credibility content may still be useful when explicitly requested or when labeled as anecdotal; hiding it globally can bias research.

Automated ratings can encode cultural, language, institutional, and popularity bias. Smaller regional sources may lack inbound links or polished metadata yet provide primary evidence. Create transparent rubrics, source-specific overrides with review, and human sampling across languages and source classes.

The answer layer should expose provenance instead of relying on an invisible quality score. Citations let users inspect the source; labels can distinguish official, peer-reviewed, news, community, and unknown. When credible sources conflict, preserve the disagreement and effective dates rather than forcing a single blended claim.

Judgment: credibility is claim-relative, time-relative, and evidence-relative. Version signal extraction, record why a source received each label, and evaluate whether reranking improves trustworthy-answer metrics without suppressing relevant minority sources. The system's job is to support calibrated trust, not manufacture certainty.
