**The big idea**: **Temporal Correctness** made one training set honest. This lesson makes it *findable again*. A trained model is inseparable from the exact examples and transformations that produced it, so versioning only weights and code leaves a large gap: source rows arrive, labels mature, joins get corrected, features get backfilled. Two runs both described as "the July data" can train on different rows. The fix has two halves. **Version the dataset alongside the model**, so a model artifact references a dataset version exactly as it references a code commit. And **build from snapshots rather than live queries**, because SQL text is a recipe, not a captured ingredient set — the same query run tomorrow reads a table that has moved on.

**Key concepts**

- **A dataset version identifies everything that decides what the model saw**: example membership, labels, feature values or their reproducible sources, schema, transformation logic, and temporal cutoffs. A model artifact should reference it the way it references hyperparameters.
- **Identity must resolve to something immutable.** A table snapshot ID, a manifest of immutable files and checksums, or a content-addressed build artifact. A human label like `training_v3` is a useful **alias** and insufficient on its own — and **moving the alias later must not rewrite the historical run record**. Include a namespace and format version so two teams cannot reuse a friendly name for incompatible artifacts, and have resolution APIs return **immutable IDs and checksums, not storage paths** whose contents can change underneath.
- **The training manifest is the unit of record.** Dataset ID, parent source snapshots, feature-definition versions, label rule, observation and label windows, row count, schema fingerprint, partition list, code commit, container digest, parameters, quality-test results, creation time — and **the manifest itself is immutable and checksummed**.
- **The registry links `model_version → dataset_version → source snapshots and transformations`.** Training and evaluation sets need **separate identities**, because a contamination fix or a label correction can affect one without the other — and an evaluator needs to know which test version produced the reported metric.
- **Versioning does not mean copying bytes.** Snapshot-aware tables share unchanged files across versions; content-addressed objects deduplicate; a manifest can reference existing immutable features. **Logical immutability and durable reachability matter more than physical duplication.**
- **A version change must be explainable, and one checksum cannot explain it.** Diff at four levels: **manifest metadata** (changed partitions, schema), **stable example IDs** (membership added and removed), **feature summaries** (value shifts), and **sampled row-level comparison** (transformation defects). A single checksum says two artifacts differ, never whether the difference was intended.
- **Attribute improvements to one dimension at a time.** A model that got better because the dataset grew is a different finding from one that got better because the algorithm changed. Vary one dimension where you can.
- **Semantic labels communicate compatibility and do not replace IDs.** A **major** revision changes label meaning, a **minor** adds compatible examples, a **patch** corrects erroneous rows. Exact snapshot identity is still required, because two patch builds can differ while a team reuses a friendly version by accident.
- **Lineage must include exclusion decisions.** Privacy deletion, corrupted-source removal, duplicate filtering and contamination checks all change membership, so **record the rule version and the count at each filter stage** — otherwise a later rebuild cannot explain why an expected example vanished.
- **A version can be immutable and still invalid.** Store the quality evidence with it: uniqueness, nulls, class balance, feature ranges, leakage, point-in-time and split-overlap results. **Promotion should mark that it passed the training contract**, rather than treating creation as approval. Version the approval too — reviewer or policy, decision time, exception reasons, expiry — so an exception granted for one experiment does not silently authorise every later model in the family.
- **Rollbacks need compatible *pairs*.** Restoring model M7 may also require the feature definitions and lookup snapshots M7 expects. A **deployment manifest** binds model, preprocessing, feature versions and serving configuration; rolling back weights alone while leaving newer feature semantics in place **creates skew** — the exact failure the previous lesson was about.
- **Retention meets governance here, and governance wins.** Keeping a deployed model reproducible may require retaining its training snapshot, and personal data may require deletion. Maintain deletion lineage, retrain or **document irreproducibility** where required, and preserve non-sensitive manifests or aggregate evidence where allowed. **A registry cannot override legal erasure.**
- **A live query reads whatever the tables contain at execution time.** Identical SQL run today and tomorrow yields different examples because new rows arrive, corrections rewrite history, dimensions change and late events backfill old partitions.
- **Resolve the snapshot once, at run start, and use it throughout.** *Example:* a six-hour feature build reads January partitions sequentially while an upstream backfill replaces them — early partitions use the old logic, later ones the new. The output is **internally inconsistent and passes row-count checks**. Pinning the source snapshot makes every task read one coherent generation.
- **Snapshot IDs beat timestamp time travel.** Clock precision, commit timing and retention make `AS OF 10:00` ambiguous across systems. Resolve it to an exact source version and record **that** identifier in the manifest.
- **Multiple inputs need a coherent *cut*.** Letting each task pick its own table's latest snapshot mixes facts and dimensions from different publication cycles. Use a **dataset release manifest** listing the approved snapshot of every component, or a dataset-level pointer published atomically once all tables pass their gates.
- **Coherence extends past tables.** Tokenizer vocabularies, taxonomy mappings, stop-word lists and label guidelines all change model inputs. **Store their hashes or version IDs in the manifest** — a changed vocabulary alters inputs while every source-table snapshot stays identical.
- **External sources without snapshots must be captured.** Download to content-addressed storage, record the HTTP or API metadata, checksum the bytes, and train from the captured copy. **An API response that changes under the same URL is not a reproducible input.**
- **Randomness is part of the contract.** Record the split algorithm, seed, grouping keys and deterministic ordering. **Hash-based splits on a stable entity ID reproduce better than pseudorandom row ordering**, and a library upgrade can change the sequence a numeric seed produces.
- **Pinning today's snapshot does not give point-in-time correctness.** A run replaying March examples against today's feature tables can use values that were unknown in March. The snapshot must **contain temporal history**, and the join must still enforce each example's cutoff. Two independent requirements.
- **Snapshot retention must outlive training, evaluation, investigation and the model's supported life.** Garbage collection that deletes referenced source files after a week, while the model stays deployed for a year, leaves lineage that resolves to nothing. Protect with tags or retention policy, release when no governed artifact depends on it.
- **Rebuilding from lineage is the strongest test, and it should be a drill rather than an incident.** In a clean environment, resolve the recorded snapshots, run the pinned transformation artifact, and compare manifest, row identities and checksums or tolerance-based results. Drills expose expired snapshots, unavailable containers, revoked credentials, undocumented manual inputs and dependency registries that no longer retain artifacts.
- **State the reproducibility *level* you mean.** Floating-point reduction order, hardware math and library differences make bitwise identity unattainable for many transforms. Define what you require: exact membership and categorical values, bounded numeric tolerance, same schema and distributions, or bitwise identity. **Do not call outputs identical without saying at which level.**

**Rules to remember**

- Model version → dataset version → source snapshots. Aliases resolve to immutable IDs; moving an alias never rewrites history.
- Training and evaluation datasets are separately versioned.
- Diff at four levels. A checksum detects difference and explains nothing.
- Quality evidence and approval live with the version. Immutable ≠ valid.
- Resolve one snapshot at run start, for every input, as one coherent cut.
- Version non-table assets too: vocabularies, taxonomies, label guidelines.
- Capture external sources to content-addressed storage before training on them.
- Record split algorithm, seed, grouping keys and ordering.
- Retention outlives the model's supported life, unless erasure law says otherwise.
- Say which reproducibility level you achieved.

**Common pitfalls**

- **Logging SQL text as provenance.** It is a recipe. Resolve every source to a snapshot before training, and **fail the run if a mutable table cannot be pinned**.
- **Letting a long job read a moving table.** The result is internally inconsistent, and row-count checks pass, so nothing surfaces it.
- **Pinning by timestamp.** Two commits can share one, retention can move the resolution, and different systems disagree about what `AS OF` means.
- **Choosing each input's latest snapshot independently.** Facts from one publication cycle joined to dimensions from another — a coherent-looking dataset that never existed.
- **Forgetting the vocabulary.** A tokenizer change alters every input while the table lineage looks untouched.
- **Assuming a snapshot fixes leakage.** Snapshot isolation and point-in-time correctness are independent; you need both.
- **Rolling back weights only.** Newer feature semantics plus older model equals skew, reintroduced deliberately.
- **Treating creation as approval.** A dataset can be perfectly immutable and fail its own quality contract.
- **Letting an exception outlive its experiment.** Version the approval, with an expiry.
- **Discovering broken lineage during an audit.** Run rebuild drills on deployed models; recovery documentation is credible only when the path still executes.

**How to approach the questions**

1. Ask what the run resolves to. If any input is named by SQL, a path, a friendly label or a timestamp, the provenance chain is broken at that link.
2. For "the same query gave different results", look for arriving rows, corrections, dimension changes or late backfills — all four are normal, which is the point.
3. Distinguish snapshot isolation (one coherent generation) from point-in-time correctness (each example's own cutoff). Questions often supply one and ask about the other.
4. For rollback questions, check whether features and preprocessing roll back with the model.
5. When a question asks whether two datasets are "the same", ask at which level — membership, values, distributions, or bytes.
6. Watch for retention: a lineage chain is only as good as the shortest-lived thing it references.

**Where this leads**: everything so far has been tabular. The corpus behind a retrieval system is not — it is documents that must be parsed, deduplicated, language-identified and quality-filtered before anything can be embedded. The next lesson, **Text Pipeline Construction**, is those stages, including the MinHash/SimHash and LSH mechanics that make near-duplicate detection possible without comparing every pair.
