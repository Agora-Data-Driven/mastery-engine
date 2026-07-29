A trained model is inseparable from the exact examples and transformations that produced it. Versioning only weights and code leaves a large reproducibility gap: source rows change, labels mature, joins are corrected, and features are backfilled. Dataset versions and immutable snapshots make training inputs addressable, comparable, and governable.

## Versioning Datasets Alongside Models

A model artifact should reference a dataset version just as it references code and hyperparameters. The dataset version identifies example membership, labels, feature values or their reproducible sources, schema, transformation logic, and temporal cutoffs. Without it, two runs described as using "the July data" can train on different rows.

Dataset identity can be a table snapshot ID, a manifest of immutable files and checksums, or a content-addressed build artifact. A human label such as `training_v3` is useful as an alias but insufficient unless it resolves to immutable metadata. Moving the alias later must not rewrite the historical run record.

Identifiers should include a namespace and format version so separate teams cannot accidentally reuse the same friendly name for incompatible artifacts. Resolution APIs should return immutable IDs and checksums, not only storage paths whose contents might later change.

Audit resolution events for unexpected alias movement and unauthorized metadata changes.

A training manifest might contain dataset ID, parent source snapshots, feature-definition versions, label rule, observation and label windows, row count, schema fingerprint, partition list, code commit, container digest, parameters, quality-test results, and creation time. The manifest itself should be immutable and checksummed.

Model registry metadata then links `model_version -> dataset_version -> source snapshots and transformations`. An evaluator can find not only which data trained the model but also which test dataset version produced its metrics. Training and evaluation sets need separate identities because fixes or contamination removal can affect one without the other.

Dataset version does not require copying all bytes for every run. Snapshot-aware tables can share unchanged files across versions. Content-addressed objects can be deduplicated. A manifest may reference existing immutable features. Logical immutability and durable reachability matter more than physical duplication.

Version changes should be explainable. Compare manifests to identify added and removed examples, schema changes, feature revisions, label corrections, and distribution shifts. A model improvement caused by a larger dataset is different from one caused by an algorithm change; factorial or controlled experiments vary one dimension where possible.

Dataset diffs should operate at several levels. Manifest metadata reveals changed partitions and schemas; stable example IDs reveal membership additions and removals; feature summaries reveal value shifts; sampled row-level comparisons reveal transformation defects. A single checksum only says two artifacts differ, not whether the difference is intended.

Semantic version labels can communicate compatibility but should not replace unique IDs. A major dataset revision might change label meaning, a minor revision add compatible examples, and a patch correct erroneous rows. Exact snapshot identity is still required because two patch builds can differ even if a team reuses a friendly version accidentally.

Lineage must include exclusion decisions. Privacy deletion, corrupted source removal, duplicate filtering, and train-test contamination checks change membership. Record rule versions and counts at each filter stage. Otherwise a later rebuild cannot explain why an expected example disappeared.

Data quality evidence belongs with the version. Store uniqueness, null, class balance, feature range, leakage, point-in-time, and split-overlap results. A version can be immutable yet invalid. Promotion should mark whether it passed the training contract rather than assuming creation means approval.

Approval itself should be versioned. Record reviewer or automated policy, decision time, exception reasons, and expiration. If an exception permits a known imbalance for one experiment, it should not silently authorize every later model trained on the same dataset family.

Retention ties models to data governance. Keeping a deployed model reproducible may require retaining its permitted training snapshot, but personal data may need deletion. Maintain deletion lineage, retrain or document irreproducibility when required, and preserve non-sensitive manifests or aggregate evidence where allowed. A registry cannot override legal erasure.

Rollbacks need compatible pairs. Restoring model M7 may also require feature definitions and lookup snapshots expected by M7. A deployment manifest should bind model, preprocessing, feature versions, and serving configuration. Rolling back only weights while leaving newer feature semantics can create skew.

Experiment tracking should reject ambiguous inputs. Instead of logging SQL text alone, resolve every source to a snapshot before training and fail if a mutable table cannot be pinned. The resulting run has a stable provenance chain from source data through dataset build to model artifact and deployment.

Promotion systems can enforce this automatically. Require a resolvable dataset manifest, successful quality report, split manifest, feature-contract versions, and retention status before a model enters staging. Exploratory runs may be less strict, but their artifacts should not be deployable by changing only a label.

## Reproducible Training Data: Snapshots over Live Queries

A live query reads whatever state source tables contain at execution time. Running identical SQL today and tomorrow can produce different examples because new rows arrive, corrections rewrite history, dimensions change, and late events backfill old partitions. SQL text is a recipe, not a captured ingredient set.

Snapshots freeze logical table state. Open table formats provide snapshot IDs; warehouses may offer time travel; pipelines can materialize a versioned table or immutable file manifest. Training should resolve a snapshot once at run start and use it throughout, preventing a long job from observing mixed source generations.

Consider a six-hour feature build that reads January partitions sequentially while an upstream backfill replaces them. Without snapshot isolation, early partitions may use old logic and later partitions new logic. The output is internally inconsistent but may pass row-count checks. Pinning the source snapshot makes every task read one coherent generation.

Timestamp-based time travel is convenient but less exact than snapshot IDs. Clock precision, commit timing, and retention can make `AS OF 10:00` ambiguous across systems. Resolve it to an exact source version and record that identifier in the training manifest.

Multiple input tables require a coherent cut. Independently choosing each table's latest snapshot at task start can mix facts and dimensions from different publication cycles. A dataset release manifest can list the approved snapshot of every component. Alternatively, a dataset-level pointer publishes the compatible set atomically after all tables pass gates.

Coherence also includes reference assets outside tables: tokenizer vocabularies, taxonomy mappings, stop-word lists, and label guidelines. Store their hashes or version IDs in the manifest. A changed vocabulary can alter model inputs even when every source-table snapshot remains identical.

External sources that lack snapshots need capture. Download source objects to content-addressed storage, record HTTP or API metadata where relevant, checksum bytes, and train from the captured copy. An API response that changes under the same URL is not a reproducible input.

Randomness also belongs in the snapshot contract. Record split assignment algorithm, seed, grouping keys, and deterministic ordering. Hash-based splits by stable entity ID are often more reproducible than pseudorandom row ordering. Library versions can change random sequences even with the same numeric seed.

Materialized training examples can simplify reproducibility, but their provenance must remain available. Store example ID, prediction time, label version, and feature-source versions. A giant opaque tensor file is immutable yet difficult to audit when one row appears suspicious.

Live feature queries can also leak future corrections. A training run replaying March examples against today's feature tables may use values not known in March. Pinning today's table snapshot alone does not solve point-in-time correctness; the snapshot must contain temporal history, and the join must enforce each example's cutoff.

Snapshot retention must outlive training, evaluation, investigation, and required model support. If garbage collection deletes referenced source files after one week while a model remains deployed for a year, its lineage becomes unusable. Protect snapshots with tags or retention policy, then release them when no governed artifact depends on them.

Validation should prove the snapshot is complete and readable before expensive training. Verify manifests and checksums, expected partitions, row counts, schema, label maturity, split separation, feature ranges, and point-in-time constraints. Store results beside the dataset version.

Rebuilding from lineage is the strongest test. In a clean environment, resolve the recorded source snapshots, run the pinned transformation artifact, and compare output manifest, row identities, and checksums or tolerance-based numeric results. Differences can arise from nondeterministic distributed aggregation, hardware math, or unpinned dependencies and should be documented.

Schedule periodic rebuild drills for important deployed models instead of waiting for an incident. A drill exposes expired snapshots, unavailable containers, revoked credentials, undocumented manual inputs, and dependency registries that no longer retain artifacts. Recovery documentation is credible only when the path still executes.

Some transforms cannot be bitwise deterministic. Floating-point reduction order can change low-order bits, and image or text libraries may vary by hardware. Define acceptable reproducibility: exact membership and categorical values, bounded numeric tolerance, same schema and distributions, or bitwise identity where required. Do not call outputs identical without stating the level.

Snapshots also improve incident response. If a source correction is required, create a new snapshot and dataset version rather than mutating the old training state. Retrain and compare against the prior version. The original result remains explainable, while the corrected lineage is explicit.

Cost controls should preserve metadata even when detailed data expires. Keep manifests, schema fingerprints, counts, approved deletion records, and dependency links where policy permits. This allows teams to explain why exact reconstruction is unavailable and which models require replacement, rather than discovering broken lineage during an audit.

The practical invariant is that every model and reported metric resolves to immutable model code, immutable preprocessing, exact dataset and split versions, and retained validation evidence. Live queries remain useful for exploration, but promoted training runs must cross the boundary into snapshot-backed inputs.
