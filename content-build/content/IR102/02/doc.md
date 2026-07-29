A crawler cannot retrieve documents it never discovers, and link traversal alone is biased toward well-linked, already-known pages. Sitemaps, feeds, notifications, search APIs, and carefully chosen seeds provide complementary discovery paths. Their outputs are leads rather than truth: each channel needs stable identity, scope enforcement, validation, and provenance before content enters a research or RAG corpus.

## Sitemaps, Feeds, and Change Notifications

An XML **sitemap** is a publisher-provided list of canonical-looking URLs, optionally with metadata such as last-modified time. A sitemap index can point to multiple sitemap files, allowing sites to publish large inventories. Crawlers discover locations through `robots.txt`, conventional paths, or explicit configuration.

Mechanically, acquisition fetches the sitemap, parses URL entries, normalizes them, applies scope policy, and enqueues eligible URLs. `lastmod` can prioritize recrawls, but it is a publisher claim, not a guaranteed content timestamp. Some sites update it on every deployment; others never update it. Treat it as a hint whose reliability is measured per source.

Worked source: yesterday's sitemap contained 100,000 URLs; today's contains 100,500. A set difference identifies 500 new candidates. If 200 old URLs disappeared, that does not prove deletion: the publisher may have split files, reached a cap, or changed policy. Confirm with HTTP status and repeated absence before removing indexed content.

Sitemaps improve coverage for orphan pages with no inbound links and expose inventories efficiently. They do not guarantee completeness, quality, accessibility, or permission to crawl. Entries may redirect, return errors, duplicate alternate parameter URLs, or fall outside intended scope. Fetch rules and robots policy still apply.

**Feeds** such as RSS or Atom publish recent items in time order, usually with stable entry IDs, links, publication/update times, and summaries or content. They are naturally incremental: poll using conditional HTTP requests, deduplicate by stable entry ID or canonical URL, and enqueue unseen or updated entries. Feeds often retain only the latest window, so they support freshness rather than historical completeness. Missing a month of polls can create a gap that only a sitemap, archive, or API can fill.

**Change notifications** push events instead of requiring polling: a webhook, queue message, cloud storage event, or publisher protocol says that an object was created, updated, or deleted. Notifications reduce detection lag and wasted polling, but delivery is commonly at least once. Consumers need stable event IDs or object versions, idempotent writes, and a reconciliation scan because events can be duplicated, reordered, or lost through integration defects.

Worked notification: version 7 of document d42 arrives after version 8 because queues reorder. A sink that blindly applies arrival order regresses content. Store the source version and accept an update only if it is newer than the current version. A repeated version 8 becomes harmless.

The robust architecture combines channels: notifications for low latency, feed polls for recent reconciliation, and periodic sitemap or inventory diff for completeness. Record `discovered_via`, discovery time, publisher timestamps, and source version. Channel disagreement becomes observable rather than silently choosing one claim.

Conditional HTTP makes polling cheaper and less disruptive. Persist the sitemap or feed's `ETag` and `Last-Modified` response metadata, then send `If-None-Match` or `If-Modified-Since`; a `304 Not Modified` avoids downloading and parsing the body. These validators describe the fetched resource, not every linked page. A changed sitemap still requires entry-level diffing, and an unchanged sitemap does not prove that listed pages themselves are unchanged.

Judgment: choose poll intervals from freshness SLA and source limits; use conditional requests to avoid transferring unchanged inventories; cap sitemap fan-out and decompressed size against abuse; validate URLs before enqueue. Never interpret publisher metadata as proof without tracking its empirical reliability.

## Search APIs as an Acquisition Channel

A search API returns documents or URLs matching a query from someone else's index. It can expose sources your crawler cannot discover through links, provide domain or date filters, and bootstrap focused corpora. It is not a complete enumeration mechanism unless the provider explicitly guarantees one.

The mechanism is query planning plus pagination. Define acquisition queries, call the API within quotas, record results with rank and query provenance, normalize URLs or stable result IDs, deduplicate, then fetch or ingest permitted content. Pagination may use page numbers, offsets, or opaque cursors. Cursor-based pagination is usually safer under a changing result set because offset pages can shift while crawling.

Worked query set for GCP retrieval research:

```
site:cloud.google.com vertex vector search
site:cloud.google.com bigquery vector_search
site:research.google retrieval embeddings
```

If each returns 100 results, naive ingestion may produce far fewer than 300 unique pages because high-authority pages overlap across queries. Deduplicate by canonical URL, but retain all discovery-query records so later analysis knows why a page entered scope.

Search results are ranked samples. Providers often cap retrievable depth, personalize or localize, suppress near-duplicates, and change ranking without notice. Repeating one broad query does not approach exhaustive coverage: the same popular head pages occupy the available window. Use a query matrix across subtopics, entities, time ranges, languages, file types, and known domains. Even then, coverage is empirical rather than guaranteed.

APIs may return snippets rather than full documents. Snippets are query-biased fragments, incomplete, and sometimes stale; they can help triage but should not become authoritative text when the source can be fetched. If full licensed content is returned, preserve provider IDs, version or timestamp, rights metadata, and response provenance.

Quotas and economics shape design. Use request budgets, exponential backoff for transient errors, and provider-specified retry headers. Cache immutable responses when terms permit; do not repeatedly purchase or request the same page. A 429 response means slow down, not rotate credentials to evade limits.

Worked cost: 1,000 planned queries, five pages each, at $0.005 per request produce 5,000 calls and $25 before document fetching. If pagination overlap yields only 2,000 unique URLs, cost per unique discovery is 1.25 cents. Track unique eligible discoveries per request and stop query families with diminishing yield.

Security and trust matter. Result URLs are untrusted input: apply scheme and host allowlists, prevent requests to private IP ranges, and process content in a sandbox. Search rank is not source credibility. A spam page can rank well, while contractual access and robots rules still govern fetching.

Judgment: use search APIs for targeted discovery and gap filling, not as the sole inventory of a domain. Store provider, query, rank, cursor, retrieval time, and raw response identifiers for reproducibility. Validate value through incremental unique in-scope yield and downstream relevance, not total result count.

## Seed Selection and Crawl Scope Policy

A **seed** is a starting URL or resource from which crawling begins. Seeds determine which connected regions are reachable and how quickly important content is found. A homepage is obvious but often dominated by navigation and marketing links; documentation indexes, repository roots, sitemap URLs, and trusted topic hubs can provide better coverage.

Seed selection is a set-cover-style judgment. Let each candidate seed reach a subset of desired corpus regions under the crawler's link and depth rules. Choose several diverse seeds whose union covers product docs, API references, release notes, research, and support material, rather than many seeds that reach the same central pages.

Worked policy for an official documentation corpus:

```
allowed hosts: cloud.google.com, research.google
allowed path prefixes: /vertex-ai/, /bigquery/, selected /pubs/
allowed schemes: https
denied patterns: /search, /login, calendar parameters, session IDs
max depth from seed: 8
query parameters: drop tracking; retain documented semantic parameters
content types: HTML and PDF
```

Every discovered URL is normalized, then evaluated against this policy **before** entering the frontier. Redirect targets are checked again; otherwise an allowed URL can redirect to an internal or out-of-scope host. DNS and resolved IPs are validated to prevent server-side request forgery.

Scope has several dimensions: hosts and subdomains, path prefixes, schemes, ports, query-parameter policy, content type, language, date, maximum response size, and crawl depth. “Same domain” is ambiguous: `example.com` may link to user-controlled subdomains or a CDN shared with unrelated tenants. Specify exact hosts or reviewed patterns.

Canonicalization and scope interact. Removing all query parameters can merge genuinely different resources such as `?version=v1` and `?version=v2`; retaining every tracking parameter creates infinite duplicates. Define parameter semantics per source. Canonical tags are hints, and a canonical target outside scope should not automatically authorize ingestion.

A hard maximum depth prevents runaway traversal but can omit important pages behind deep navigation. Priority and host/path budgets are often better: crawl known documentation regions deeply while limiting low-yield blog archives. Frontier metrics should report discovered, rejected by each rule, fetched, redirected, duplicated, and failed URLs. A sudden surge of rejected URLs can reveal a bad seed or site redesign.

Seed quality can be tested through marginal coverage: add one seed, crawl to a fixed budget, and measure new canonical in-scope documents beyond the current seed set. Remove seeds that yield only duplicates. Maintain seeds and policy as version-controlled configuration with review, because changing either changes the corpus.

Coverage needs a denominator whenever possible. Compare crawled canonical URLs with publisher inventories, known documentation navigation, API counts, or manually curated gold pages. “The crawler fetched 100,000 pages” proves volume, not completeness. Stratify missingness by host, path family, language, and date so a blocked subsite does not disappear inside a high aggregate count.

Scope is also a legal and product boundary. Permission, terms, robots directives, credentials, tenant isolation, and data residency can be stricter than technical reachability. “The crawler can fetch it” is not authorization. Credentials should be scoped to approved sources, and acquired records should preserve access classification.

Judgment: begin narrowly with high-trust seeds, explicit allow rules, denial safeguards, and small budgets; inspect discovered topology; then expand deliberately. Broad crawling followed by deleting unwanted content is unsafe because fetching itself can violate limits and untrusted content has already entered systems. Scope must be enforced at discovery, fetch, storage, and downstream indexing as defense in depth.
