A retrieval system can only rank what acquisition brings home: your BM25 statistics, your embedding space, and your reranker's training signal are all downstream of the crawler. Crawler architecture is the machinery that decides *which* URLs get fetched, *when*, and *at what cost to whom* — and getting it wrong produces the two classic failure modes of corpus building: a corpus full of junk aliases and trap pages, and a crawler that gets itself banned from the sources that matter most. This lesson covers the three load-bearing components every crawler has: the frontier, the politeness layer, and the URL hygiene that keeps both honest.

## The Crawl Frontier: Prioritization and Queue Management

The **crawl frontier** is the data structure holding every URL that has been *discovered but not yet fetched*. The crawl loop is: pop a URL from the frontier, fetch it, parse the HTML, extract outlinks, canonicalize each one, run it through a **URL-seen test** (has this canonical URL ever been enqueued?), and push the survivors back into the frontier. The frontier is therefore both the crawler's to-do list and its scheduler.

A naive frontier is a FIFO queue, which gives you breadth-first search over the web graph. This breaks quickly for two reasons. First, growth: a typical page yields 50–100 outlinks, so the frontier grows far faster than you drain it — a serious crawl holds hundreds of millions of frontier URLs, which forces a disk-backed design with batched reads and writes rather than an in-memory queue. Second, locality: most links on a page point *within the same host*, so a FIFO frontier clusters consecutive pops onto a handful of hosts. Combined with politeness delays (next section), this means your workers either hammer one server or sit idle waiting for that host's next allowed fetch time.

The classic fix is the **Mercator design**, which splits the frontier into two tiers:

- **Front queues** implement *prioritization*: URLs are routed into one of F queues based on a priority score (estimated page value from signals like link indegree, source importance, and — later in this course — modeled change rates and quality priors).
- **Back queues** implement *politeness*: each back queue is dedicated to exactly one host, and a min-heap keyed on each host's *earliest next allowed fetch time* decides which back queue a worker draws from next. When a back queue empties, it is refilled from the front queues, biased toward higher-priority queues.

This separation is the important idea: **what is worth fetching** (front) is a different question from **what may be fetched right now** (back). In steady state, politeness dominates short-horizon scheduling — the heap decides the next fetch — while priority dominates long-horizon allocation — it decides which hosts and URLs get frontier slots at all.

Worked example. Suppose your crawl budget is 2 million fetches/day and politeness allows one fetch per 5 seconds per host. The per-host ceiling is $86{,}400 / 5 = 17{,}280$ fetches per day, so a 500,000-page site takes at least 29 days *no matter how many workers you add*. With 50,000 active hosts, the back-queue heap does trivial work; the actual hot path is the URL-seen test, which must check hundreds of millions of canonical-URL hashes per day — typically an in-memory hash of recent URLs in front of a disk-backed store, checked in batches.

Judgment layer. Strict max-priority popping causes **starvation**: a mid-tier site discovered early can wait forever behind an endless supply of higher-scored URLs. Production frontiers therefore *sample* across priority queues with probability weighted by priority rather than always taking the max. Also know when not to build the full machine: for a scoped research corpus (tens of millions of pages from thousands of vetted hosts), per-host FIFO queues under a simple host scheduler are usually the right call — most of Mercator's complexity exists to survive the open web. Finally, plain breadth-first order is a surprisingly strong baseline early in a crawl: high-indegree, high-quality pages tend to be shallow, so BFS finds them first even without explicit scoring.

## Politeness: Rate Limits, robots.txt, and Crawl Delay

Politeness is the contract that keeps you unbanned. It has a declarative half (robots.txt) and a behavioral half (rate limiting), and a crawler needs both.

**robots.txt** lives at exactly one place per origin: `scheme://host:port/robots.txt`. The Robots Exclusion Protocol was standardized in **RFC 9309 (2022)**. The file is a sequence of groups, each starting with one or more `User-agent:` lines followed by `Allow:` and `Disallow:` rules. A crawler picks the group with the most specific matching user-agent (falling back to `*`), then for a given URL path applies the **longest-match rule**: among all rules whose path prefix matches, the one with the longest matched path wins; on a tie, `Allow` wins. Patterns support `*` wildcards and `$` end-anchors. Example:

```
User-agent: *
Disallow: /search
Allow: /search/about
Crawl-delay: 10
Sitemap: https://example.com/sitemap.xml
```

`/search/results?q=x` is disallowed (matches `/search`, length 7). `/search/about` is **allowed** — the `Allow` rule matches 13 characters, beating the 7-character `Disallow`. The `Sitemap:` line is a discovery hint we use next lesson.

Fetch-status semantics matter and are asymmetric: a **4xx** response (including 404) means "no restrictions — crawl freely," while a **5xx** or unreachable robots.txt should be treated conservatively as **complete disallow, temporarily** — the site is telling you it's in trouble, and you cannot know its policy. Cache robots.txt (24 hours is the conventional ceiling) rather than refetching per URL.

`Crawl-delay` is *not* part of RFC 9309 — it's a de-facto directive honored by some crawlers (Bing historically; Google ignores it), specifying seconds between requests. Honor it if present; it is the site operator telling you their capacity in plain text.

**Rate limiting** is what you do when robots.txt is silent. The standard heuristics: keep **one open connection per host**; wait between requests an **adaptive delay proportional to observed response time**, `delay ≈ k × t_response` with k around 3–10 and a floor of ~1 second — a server answering in 200 ms with k = 10 gets one request every 2 s (43,200/day max); a struggling server answering in 3 s automatically gets more breathing room. On **429 or 503, honor `Retry-After`** exactly if present, otherwise back off exponentially. Identify yourself honestly: a descriptive `User-Agent` string with a URL explaining the project and a contact address. And beware the hostname/server distinction: shared hosting and small providers put *many hostnames on one IP*, so a crawler that is polite per-hostname can still melt one physical server — cluster limits **per IP** as well as per host.

Why all this matters: an impolite crawler gets IP-banned (you lose the source *permanently*, which for a research corpus can be worse than never crawling it), knocks over small sites, and burns the reputation attached to your user agent. Politeness is voluntary in the mechanical sense — nothing stops you from ignoring robots.txt — but treating it as binding is the professional norm, keeps you on the right side of operators, and is increasingly load-bearing legally.

Judgment layer. When a critical source sets `Crawl-delay: 60` on 2 million pages (≈ 3.8 years at that rate), the answer is not a technical workaround like rotating IPs — it's to seek a *sanctioned bulk channel*: an official API, a published dump, a sitemap-guided partial crawl of just what you need, or an email to the operator. Distinguish "this is slow" (engineering problem) from "the owner said no" (policy problem).

## Crawler Traps and URL Canonicalization

A **crawler trap** is a region of URL space that generates unbounded numbers of unique URLs carrying worthless or duplicate content. Classic instances: an events **calendar** whose "next month" link exists forever (the crawler happily walks into the year 3000); **session IDs** embedded in URLs, minting a fresh URL universe per visit; **faceted navigation** on e-commerce sites, where color × size × brand × sort-order × page combine multiplicatively into millions of URLs over a few thousand products; relative-link bugs that build repeating paths like `/a/b/a/b/a/b/`; and **soft-404s** — pages that return HTTP 200 with an "not found" body, so error space looks like content space. Traps are usually accidental, occasionally adversarial; either way, an undefended crawler can sink its entire budget for a host into one.

Defenses are budget- and shape-based: **per-host page budgets** (a trap can then cost at most one host's allocation), caps on URL **length**, path **depth**, and **query-parameter count**, and — most diagnostic — monitoring the **unique-content-per-URL ratio** per host. When URLs fetched keeps climbing but newly seen *distinct content* flattens out, you are in a trap or a duplicate farm, and the host's budget and parameter rules should tighten automatically. (Content fingerprinting mechanics get their full treatment in the dedup material of DE 301; here it is enough that the crawler keeps a cheap fingerprint of extracted text to notice "nothing new.")

**URL canonicalization** (normalization) converts each URL to a single canonical form so the URL-seen test, the frontier, and the corpus all agree on identity. RFC 3986 defines transformations that are *always safe* — they cannot change what the server returns:

- lowercase the **scheme** and **host** (`HTTPS://Example.COM` → `https://example.com`)
- remove **default ports** (`:443` for https, `:80` for http)
- resolve **dot-segments** in the path (`/a/../docs/` → `/docs/`)
- normalize **percent-encoding**: decode unreserved characters (`%7E` → `~`), uppercase remaining hex escapes
- drop the **fragment** (`#top`) — it never reaches the server

Then there are *heuristic* normalizations that usually help and sometimes lie: stripping known tracking parameters (`utm_*`, `gclid`, `fbclid`), sorting query parameters, removing trailing slashes, collapsing duplicate slashes, and dropping obvious session IDs. Worked example — all of these should collapse to `https://example.com/docs/`:

```
HTTPS://Example.COM:443/a/../docs/?utm_source=news#top
https://example.com/docs/?utm_source=partner
https://example.com/docs/
```

Two things you must **not** do blindly: lowercase the **path** (paths are case-sensitive on most servers — `/Docs` and `/docs` can be different resources), and strip parameters that select real content — `?page=2` and `?id=42` are content, not tracking, and aggressive stripping silently collapses a forum's every thread page onto page 1, a coverage hole you'll discover months later. Production crawlers maintain *per-site parameter rules*, learned by fetching URL variants and checking whether content is actually identical.

Sites can help via `rel="canonical"` (a `<link>` tag or HTTP `Link` header) declaring which URL a page considers its true self. Treat it as a **hint, not a directive**: it is frequently wrong or abused (every article pointing to the homepage), so weigh it against your own content-equality evidence.

Why this section exists: without canonicalization the seen test fails open — the frontier fills with aliases of pages you already have, budget burns on duplicate fetches, and downstream dedup has to clean up a mess that one string transform would have prevented. With over-aggressive canonicalization the seen test fails *closed* — distinct content is declared "seen" and never fetched. The first failure wastes money; the second silently costs coverage, which for a research corpus is the more dangerous defect. Prefer per-host budgets plus priority over brutal global caps for hosts you care about, and audit what your normalizer collapses before trusting it at scale.
