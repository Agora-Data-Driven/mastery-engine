Machine-learning data must represent what the model could have known at the moment of prediction. Ordinary warehouse joins often answer what is known now, silently giving historical examples future information. Point-in-time joins, leakage controls, and training-serving parity turn that temporal requirement into enforceable data contracts.

## Point-in-Time Correctness and Time-Travel Joins

Each training example needs a prediction timestamp, sometimes called event time, observation time, or cutoff time. Features for that example must be computed only from information available at or before the cutoff under the product's real serving rules. A current-value join is insufficient when entities and aggregates change.

Suppose a loan application was scored on March 10. The customer dimension says income 60,000 from January 1 through April 1, then 75,000. Training in July must join the March application to the 60,000 version, not the current 75,000 value. A Type 2 interval join uses `effective_from <= prediction_time < effective_to`.

Event history needs similar cutoffs. A feature `purchase_count_30d` for a prediction at noon on March 10 should include purchases with event times in `[February 8 noon, March 10 noon)`, assuming the current event itself should be excluded. Writing the exact interval and endpoint convention prevents off-by-one leakage.

Feature time and availability time can differ. A lab result may describe a specimen collected at 09:00 but become available to the application at 14:00. A prediction at 11:00 cannot use it even though its event time is earlier. Store both event time and ingestion or availability time when delayed observation matters, and filter by the serving availability boundary.

Bitemporal source data distinguishes when a fact was valid in the world from when the system learned it. A corrected address may be valid from January but entered in March. To reproduce a February prediction, use the system-known timeline, not truth as later corrected. Training for a hypothetical ideal system might use valid time, but that is a different experiment.

A point-in-time join typically starts from labeled examples `(entity_id, prediction_time)` and selects the latest feature record for the same entity whose availability timestamp is not after prediction time. SQL can join candidates and use a row-number ordered by feature timestamp descending, or an as-of join where supported.

For example, feature records for C42 occur at 09:00 with value 3 and 11:00 with value 5. Examples occur at 10:00 and 12:00. The as-of results are 3 and 5. Joining only by C42 would create two rows per example or select the current value 5 for both, corrupting the 10:00 example.

Point-in-time correctness also applies to aggregates and reference data. Currency conversion must use the rate available at prediction time. Category taxonomies, risk lists, model-derived embeddings, and business rules need versioned snapshots. A single unversioned lookup table can leak even when primary event features are correct.

Late-arriving events create a policy choice. If serving would not have seen an event by the cutoff, historically recomputed features should exclude it even after it arrives. Retaining ingestion time lets training simulate that behavior. An alternative model trained on corrected event-time truth will see cleaner data than production and may overestimate performance.

Efficient implementation can partition examples and features by date, range-limit candidate history, and sort within entity. Precomputed daily feature snapshots simplify joins but reduce temporal precision. A noon prediction joined to end-of-day features is wrong unless the snapshot represents the previous completed day.

Test with hand-built timelines. Include events exactly at boundaries, late arrivals, overlapping dimension versions, missing history, and multiple updates at one timestamp. Assert one feature row per example and record the chosen source version as lineage. Temporal correctness should be provable for an individual training row.

## Label Leakage: Learning from the Future

Label leakage occurs when training inputs contain information unavailable at prediction time or encode the target through the data-generation process. The model learns a shortcut that performs well offline but fails when deployed. Leakage can be obvious, such as including `loan_defaulted`, or indirect, such as using a status updated only after default.

Consider predicting whether a support ticket will escalate within seven days. A feature `final_resolution_team` is highly predictive, but that team may be assigned after escalation. Current-row extraction gives every historical ticket its final team and leaks the outcome process. Use the team known at ticket creation or at the intended scoring time.

Aggregation windows are common leaks. A feature named `transactions_last_30_days` can accidentally use the dataset build time as its endpoint rather than each example's prediction time. For an example from January, it then includes December months later or events after the label. Parameterize windows by the example cutoff, not a global run date.

Train-test splitting by random row can leak temporal and entity dependence. Near-duplicate sessions, repeated customers, or later events can appear in both sets. A temporal split trains on earlier periods and evaluates later periods, closer to deployment drift. Group splits prevent the same entity or document family from crossing when memorization is a risk.

Preprocessing can leak too. Fitting normalization means, vocabularies, imputation values, target encodings, or feature selection on the full dataset exposes validation distribution. Fit learned preprocessing only on the training fold, persist it with the model, and apply it unchanged to validation and test.

Target encoding is especially sensitive. Encoding a category with its average label using the same row's target directly leaks the answer. Use out-of-fold estimates for training rows and training-only statistics for validation. Apply smoothing for rare categories so one label does not become a near-perfect feature.

Negative example construction can encode future knowledge. If non-churners are selected only from customers known to remain for a year, the selection uses future survival. Define an observation window and a label window, then require sufficient follow-up for both positives and negatives. Examples near the dataset end may need exclusion because their label is not mature.

Leakage audits should classify every feature by source, event time, availability time, computation window, and whether label generation can affect it. Remove suspect features and measure the performance drop. An implausibly dominant feature or an offline score far above domain expectations deserves investigation, not celebration.

Permutation and adversarial checks help. Shuffle labels and confirm performance collapses. Train using only identifiers or timestamps to detect dataset artifacts. Compare a feature's distribution before and after the outcome. These tests do not prove absence of leakage, but they expose common shortcuts.

The governing question is counterfactual: could the production system obtain this exact value, with this freshness and processing logic, before making the prediction? If not, the feature is invalid for that deployment point even if it is causally related or present in today's warehouse.

## Training-Serving Skew

Training-serving skew occurs when a feature has different values or semantics offline and online for the same logical prediction. Causes include duplicated transformation code, different default values, inconsistent tokenizers, freshness gaps, timezone handling, lookup versions, and unavailable online sources.

One shared feature definition reduces skew. A feature registry can specify sources, transformation, keys, timestamp logic, null policy, type, owner, and versions. Batch computation materializes historical values; online computation or serving retrieves current values under the same contract. "Same definition" is stronger than matching column names.

Skew can persist even with shared code. Batch jobs may run daily while online features update per event. Offline training might see corrected late data while serving sees only arrived data. One environment may use floating-point double precision and another a narrower type. The data lifecycle, not just function source, must match.

Feature materialization often uses an offline store for historical training and an online store for low-latency serving. Each online row needs feature version and freshness metadata. A write pipeline should update both from a common event or snapshot where possible. If the online write fails after offline success, monitoring must detect divergence.

Parity tests calculate both paths on identical captured inputs and compare outputs. For exact categorical or integer features, require equality. For floating-point features, define tolerances based on numerical analysis rather than convenient broad bounds. Include nulls, malformed input, boundary timestamps, and unknown categories.

Online shadow logging provides stronger evidence. For sampled predictions, log feature names, values or privacy-safe hashes, versions, and timestamps. Later reconstruct the same examples offline and compare. Respect privacy and storage constraints; not every raw feature should be retained indefinitely.

Freshness is part of value. An account balance of 100 at training and 100 at serving matches numerically, but if the serving value is three days old it may be unreliable. Define maximum age per feature and behavior when stale: fail closed, fall back to a default, fetch synchronously, or use a reduced model.

Default-value skew is subtle. Offline SQL may use null for missing history, while online code converts missing to zero. The model interprets them differently, especially if missingness itself is predictive. Persist explicit missing indicators or one canonical default policy and test it end to end.

Version skew appears during rollout. A model trained on feature definition V3 can receive V4 values if serving always fetches latest. Bind the model artifact to compatible feature versions and support parallel materializations during migration. Switch model and features coherently, then retire old versions after rollback windows.

Monitor feature availability, freshness, distribution drift, null rates, out-of-range values, and offline-online parity by model version. Model-performance degradation is a late signal. A feature contract violation should alert before enough bad predictions accumulate to move aggregate metrics.

When exact online parity is impossible, train for the serving reality. Simulate online delay, missingness, quantization, or approximate computation in historical features. A slightly less accurate offline model trained on deployable signals is more valuable than a high-scoring model that depends on unavailable truth.

The end-to-end invariant is concrete: for a captured prediction identity and timestamp, the historical feature pipeline should reproduce the values and versions the model actually received, within declared tolerances and availability rules. Build lineage and tests around that invariant.
