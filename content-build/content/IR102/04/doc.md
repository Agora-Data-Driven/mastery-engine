Corpus freshness is an allocation problem: every page can change, but fetch capacity and source rate limits are finite. Recrawling everything equally wastes bandwidth on static archives and leaves fast-changing release notes stale. A production crawler estimates change behavior, schedules by expected value under politeness constraints, then lets ranking use recency only when the query actually benefits from it.
The resulting system must explain both why a URL was fetched now and why its age influenced a particular ranked result.
Those are separate decisions.

## Modeling Page Change Rates

For a page, let meaningful changes arrive approximately as a Poisson process with rate $\lambda$ changes per day. The probability of zero changes during interval $t$ is $e^{-\lambda t}$, so the probability that at least one change occurred is:

$$P(\text{changed by }t)=1-e^{-\lambda t}$$

If a release-notes page changes on average once every two days, $\lambda=0.5$. After one day, change probability is $1-e^{-0.5}\approx0.393$; after four days it is $1-e^{-2}\approx0.865$. A policy PDF changing once per year has $\lambda\approx1/365$ and only about $1-e^{-7/365}\approx1.9\%$ weekly change probability.

The Poisson assumption is a tractable baseline: changes are independent with a stable average rate. Real pages violate it. News pages follow bursts; annual reports change seasonally; documentation changes after releases; a deleted product page may stop changing. The model should incorporate features and recent observations rather than pretend one rate is timeless.

Estimate change from fetch history. Store fetch time, status, validators, raw and normalized content hashes, and extractor version. Count **meaningful content changes**, not byte differences caused by ads, timestamps, or template rotation. If a page changed in $c$ of $n$ observed intervals with total exposure time $T$, a simple rate estimate is $\hat\lambda=c/T$. With three meaningful changes over 30 observed days, estimate 0.1/day.

Sparse history needs smoothing. A new page with one unchanged fetch should not be classified permanent. Use a prior by page class or site section: release notes start with a higher prior rate than archived legal PDFs. A Gamma prior for Poisson rate yields a posterior mean $(\alpha+c)/(\beta+T)$, where $\alpha/\beta$ is the prior mean. With prior $\alpha=1,\beta=20$ days and observed $c=3,T=30$, posterior mean is $4/50=0.08$ changes/day rather than the raw 0.1.

HTTP validators are evidence, not content truth. A changed `ETag` may reflect compression or deployment without semantic change; a stable validator from a broken server may hide updates. Fetch conditionally to save bytes, but periodically audit validator reliability using content hashes. Publisher `Last-Modified` deserves the same source-specific calibration.

Magnitude matters. A page changing a rotating timestamp hourly has high byte-change rate and zero research value. Normalize and extract before hashing, or compute similarity and classify change regions. Store both raw and semantic hashes: raw changes diagnose transport, semantic changes drive indexing.

Worked classes:

| Page class | Observed behavior | Initial policy |
|---|---|---|
| release notes | burst near launches | daily, faster after detected release |
| API reference | weekly clusters | every few days |
| historical paper | rarely changes | monthly or quarterly |
| homepage | frequent template edits | content-region hash and moderate interval |

Judgment: a rate estimate is uncertain, so record sample count and confidence. Overconfidently freezing a page after two unchanged fetches creates invisible staleness. Segment models by source and type, detect regime shifts, and retain a maximum audit interval even for pages believed static.

The observation process is censored by the schedule itself. If a page is checked weekly and changes three times between checks, the crawler observes only that the final content differs, not three events. Estimating $\lambda$ from detected changes therefore undercounts fast pages. Publisher versions, feeds, or change logs can improve estimates; otherwise model the probability of at least one interval change rather than treating each changed fetch as exactly one event.
This uncertainty should widen audit coverage rather than justify an unjustifiably precise interval.

## Recrawl Scheduling and Priority

A scheduler turns change probability into a frontier priority. The simplest periodic rule sets interval inversely proportional to estimated rate, but useful scheduling also considers page importance, staleness cost, fetch cost, and source constraints.

One benefit score is:

$$\text{priority}(u)=\frac{w_u\left(1-e^{-\lambda_u a_u}\right)}{c_u}$$

where $w_u$ is page importance or cost of stale content, $a_u$ is age since successful verification, and $c_u$ is expected fetch cost. The numerator is expected value of discovering a change; dividing by cost favors productive fetches.

Worked comparison. Page A has importance 5, $\lambda=0.2/day$, age 3 days, cost 1 unit: priority $=5(1-e^{-0.6})\approx2.26$. Page B has importance 1, $\lambda=0.05/day$, age 10 days, cost 1: $1(1-e^{-0.5})\approx0.39$. Fetch A first despite B being older because A is more important and changes faster. If A costs ten units due to rendering, its priority falls to 0.226 and B may win.

The global priority queue cannot ignore politeness. Each host needs a next-allowed time based on crawl rate, robots policy, errors, and server feedback. A two-level scheduler selects among eligible hosts, then selects that host's highest-value URL. This prevents one high-rate site from monopolizing workers or causing synchronized bursts.

Conditional requests change cost. An `If-None-Match` response returning 304 transfers little, so a reliable validator lowers expected fetch cost and justifies more frequent checks. Rendering JavaScript or downloading a 500 MB PDF raises cost. Expected extraction and reindex work can also be included.

Failures need backoff separate from freshness. Repeated 429 or 503 responses should exponentially delay attempts with jitter, respect `Retry-After`, and reduce host concurrency. Permanent 404 or 410 responses may mark absence after confirmation. Authentication failures require alerting rather than indefinite hot retries.

Avoid starvation through maximum intervals. A low predicted rate can drive priority near zero forever, so impose an audit deadline: every eligible page is eventually revalidated. New pages receive exploratory fetches to learn their rate. Pages with repeated no-change outcomes can lengthen intervals; detected change shortens them.

Change notifications override normal timing but remain hints. An event can enqueue a page immediately, while version checks prevent out-of-order regression. Periodic scheduled checks remain as reconciliation.

Freshness SLA translates to measurable lag: time from publisher change to detection, extraction, indexing, and serving. Recrawl scheduling controls only detection lag. A page fetched in one minute but stuck in a six-hour embedding queue is not fresh. Track stage timestamps separately.

Judgment: optimize expected stale-content harm per constrained fetch, not crawl volume. Use importance from source trust, query demand, and business consequence, but cap popularity feedback so head pages do not starve long-tail coverage. Simulate schedules with historical changes, then monitor changed-fetch yield, detection lag percentiles, host errors, and overdue audit count.

Scheduling must also be idempotent under worker failure. Lease a frontier item for a bounded time, record the intended source version, and make fetch output keyed by URL plus observed content hash. If a worker commits content but loses its acknowledgment, a retry should recognize the same hash rather than create duplicate versions. Expired leases return work to the queue; they do not imply that the prior fetch failed before writing.

## Recency as a Ranking Signal Fused with Relevance

Recrawling decides what version exists in the corpus; ranking decides whether freshness should affect a particular query. **Recency** is query-dependent. `latest Vertex AI quotas` benefits from current documents. `PageRank original paper` does not become better because a blog repost is newer.

A simple time-decay signal uses age $a$:

$$r(a)=e^{-\gamma a}$$

The half-life $h$ is the age where recency weight halves, so $\gamma=\ln2/h$. With a 30-day half-life, a new page has recency 1, a 30-day page 0.5, and a 90-day page $0.5^3=0.125$.

Do not replace relevance with recency. Fuse:

$$S(d,q)=S_{\text{rel}}(d,q)+\alpha(q)\,r(a_d)$$

after placing signals on compatible scales, or rerank using recency features. $\alpha(q)$ is larger for freshness-intent queries and near zero for timeless ones. Raw BM25 and cosine scores are not directly comparable with a 0-to-1 decay; normalize, learn the combination, or use rank-based fusion.

Worked ranking: document Old scores relevance 0.95 and recency 0.1; New scores relevance 0.80 and recency 0.9. With $\alpha=0.1$, scores are 0.96 and 0.89, so Old remains first. With explicit latest intent and $\alpha=0.4$, scores are 0.99 and 1.16, so New leads. Recency changes the result only when the query policy values it enough.

Which date should decay? Publication date, last meaningful content update, event effective date, and crawl time are different. Crawl time measures when the system observed the page, not when content became current; using it rewards freshly fetched ancient documents. Prefer trusted content timestamps, retain provenance, and cap or ignore implausible future dates. A template edit should not reset semantic freshness if the main content is unchanged.

Versioned material often needs validity rather than generic decay. A 2024 policy may be correct for a question explicitly about 2024. Metadata filters or temporal query understanding should select the requested effective period before recency ranking. Newest is not synonymous with correct.

Recency can amplify low-quality churn and SEO spam. A site publishing frequent superficial updates can dominate unless source quality and relevance remain primary. Consider a freshness prior by source type and detect date manipulation. Duplicate versions should be collapsed or linked so minor updates do not fill the top results.

Freshness intent can be explicit (`latest`, `current`, `this week`, version names) or inferred from query class. A conservative system boosts only when evidence supports temporal intent. Evaluate on query slices: current-events, mutable documentation, evergreen reference, and historical lookup. A global metric can hide damage to evergreen queries.

Judgment: measure temporal relevance with time-aware judgments taken against a defined evaluation date. Log which timestamp and decay contributed to a score. Recency is useful when the information need changes with time; elsewhere it is noise. The aim is not newest-first but relevance to the user's requested time.
