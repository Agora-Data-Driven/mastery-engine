**The big idea**: **Feature Pipelines: From Raw Events to Model Inputs** insisted a feature carries an as-of timestamp, and **Feature Stores: Offline Training vs Online Serving** insisted both stores come from one computation. This lesson is why. Machine-learning data must represent **what the model could have known at the moment of prediction** — and an ordinary warehouse join answers what is known *now*, silently handing historical examples the future. Three failures follow from that one gap: a join that picks the wrong version (**point-in-time incorrectness**), a feature that encodes the outcome (**label leakage**), and a value that differs between the two paths (**training-serving skew**). All three produce a model that scores beautifully offline and cannot work in production.

**Key concepts**

- **Every training example needs a prediction timestamp** — event time, observation time, cutoff time. Features for that example must be computed only from information available at or before the cutoff, **under the product's real serving rules**. A current-value join is not merely imprecise; it is wrong whenever entities or aggregates change.
- **Dimension versions need an interval join.** A loan scored on March 10, with income 60,000 effective Jan 1–Apr 1 and 75,000 after: training in July must join to **60,000**. That is `effective_from <= prediction_time < effective_to` — SCD Type 2, used as a join condition.
- **Event windows need explicit endpoints.** `purchase_count_30d` for a prediction at noon on March 10 covers `[Feb 8 noon, Mar 10 noon)`, assuming the current event itself is excluded. **Write the interval and the endpoint convention down** — off-by-one leakage is the most common kind.
- **Feature time and *availability* time are different clocks.** A lab result describes a specimen collected at 09:00 but reaches the application at 14:00; a prediction at 11:00 **cannot use it** even though its event time is earlier. Store both, and filter by the **serving availability boundary**.
- **Bitemporal sources: reproduce what the system knew, not what turned out to be true.** A corrected address valid from January but entered in March must not appear in a February prediction. Training on later-corrected truth is a different experiment — legitimate to run, dishonest to deploy against.
- **The join itself — a time-travel join, also called an as-of join.** Start from labeled examples `(entity_id, prediction_time)` and select the **latest feature record for that entity whose availability timestamp is not after prediction time** — a `ROW_NUMBER` ordered by feature timestamp descending, or a native as-of join. *Example:* C42 has features at 09:00 (value 3) and 11:00 (value 5); examples at 10:00 and 12:00 correctly get **3 and 5**. Joining on C42 alone gives two rows per example, or the current value 5 for both — corrupting the 10:00 example.
- **Reference data leaks too.** Currency rates must be the rate available at prediction time; taxonomies, risk lists, model-derived embeddings and business rules need **versioned snapshots**. A single unversioned lookup table leaks even when every event feature is correct.
- **Late arrivals are a policy choice, not an accident.** If serving would not have seen an event by the cutoff, the historically recomputed feature should **exclude it even after it arrives** — which is only possible if ingestion time was retained. A model trained on corrected event-time truth sees cleaner data than production ever will and overestimates its own performance.
- **Precomputed daily snapshots trade precision for simplicity.** A noon prediction joined to end-of-day features is wrong **unless the snapshot represents the previous completed day**.
- **Label leakage is training inputs containing information unavailable at prediction time, or encoding the target through the data-generation process.** Obvious form: including `loan_defaulted`. Indirect form: a status field updated only *after* default.
- **The classic shape.** Predicting whether a support ticket escalates within seven days, with a feature `final_resolution_team` — highly predictive, and often assigned *after* escalation. Current-row extraction gives every historical ticket its final team and leaks the outcome process. Use the team known **at ticket creation or the intended scoring time**.
- **Windows anchored to the build date instead of the example's cutoff.** `transactions_last_30_days` computed against the dataset build time means a January example silently includes December — and events after its label. **Parameterise every window by the example cutoff, never a global run date.**
- **Random train-test splits leak.** Near-duplicate sessions, repeated customers and later events cross the boundary. A **temporal split** (train earlier, evaluate later) mirrors deployment drift; a **group split** stops the same entity or document family appearing on both sides where memorisation is a risk.
- **Preprocessing leaks.** Fitting normalisation means, vocabularies, imputation values, target encodings or feature selection on the full dataset exposes the validation distribution. **Fit learned preprocessing on the training fold only**, persist it with the model, apply it unchanged everywhere else.
- **Target encoding is the sharpest case.** Encoding a category with its average label using the same row's target leaks the answer directly. Use **out-of-fold estimates** for training rows and training-only statistics for validation, with smoothing so a rare category with one observation does not become a near-perfect feature.
- **Negative construction can encode the future.** Selecting non-churners only from customers *known to have survived a year* uses future survival. Define an observation window and a label window, require sufficient follow-up for positives **and** negatives, and exclude examples near the dataset end whose labels are not yet mature.
- **The counterfactual test settles every case:** *could the production system obtain this exact value, with this freshness and this processing logic, before making the prediction?* If not, the feature is invalid for that deployment point — even if it is causally related and sitting in today's warehouse.
- **Training-serving skew is the same logical feature having different values or semantics offline and online.** Causes: duplicated transformation code, different defaults, inconsistent tokenizers, freshness gaps, timezone handling, lookup versions, and sources unavailable online.
- **Shared code is necessary and not sufficient.** Batch may run daily while online updates per event; offline may see corrected late data while serving sees only what arrived; one environment may use double precision and the other something narrower. **The data lifecycle must match, not only the function source.**
- **Freshness is part of the value.** A balance of 100 offline and 100 online *matches numerically* — and if the serving value is three days old it may be unreliable. Define a **maximum age per feature** and the behaviour when stale: fail closed, fall back, fetch synchronously, or use a reduced model.
- **Default-value skew is subtle and common.** Offline SQL leaves missing history as `NULL`; online code converts missing to `0`. The model reads those differently, **especially when missingness is itself predictive**. Persist explicit missing indicators, or one canonical default policy, and test it end to end.
- **Version skew appears during rollout.** A model trained on feature definition V3 receives V4 values because serving always fetches latest. **Bind the model artifact to compatible feature versions**, support parallel materialisations during migration, switch model and features coherently, and retire old versions after the rollback window.
- **The end-to-end invariant, stated concretely:** for a captured prediction identity and timestamp, the historical feature pipeline should reproduce **the values and versions the model actually received**, within declared tolerances and availability rules. Parity tests compute both paths on identical captured inputs; **shadow logging** samples real predictions, records feature names, values or privacy-safe hashes, versions and timestamps, and reconstructs them offline for comparison.

**Rules to remember**

- Every example has a prediction timestamp, and every feature is filtered by it.
- Time-travel joins on dimensions use `effective_from <= prediction_time < effective_to`. Event windows use an explicit half-open interval.
- Availability time, not event time, is the serving boundary. Store both.
- Reference data and lookups need versions too.
- Parameterise windows by the example's cutoff, never by the dataset build date.
- Fit preprocessing on the training fold only. Target encoding is out-of-fold.
- Temporal split by default; group split when entities repeat.
- Exact equality for categorical and integer parity; analysed tolerances for floating point.
- Define maximum age per feature and the stale behaviour explicitly.
- Bind a model artifact to the feature versions it was trained on.

**Common pitfalls**

- **Joining on entity id alone.** It returns either the current value for every historical example, or one row per feature version — and both look like ordinary join results.
- **A single unversioned lookup table.** Currency rates, taxonomies and risk lists leak quietly while every event feature is correct, so the audit that only covers features finds nothing.
- **Celebrating an implausibly dominant feature.** An offline score far above domain expectations deserves investigation, not a launch. Remove the suspect feature and measure the drop.
- **Splitting randomly because the rows look independent.** Repeated customers and near-duplicate sessions make random splits optimistic in exactly the way that survives review.
- **Fitting the scaler on everything "because it is just normalisation".** It exposes the validation distribution, and the effect is largest on the small datasets where it is most tempting.
- **Selecting negatives by known outcome.** "Customers who stayed a year" is a future fact, and it makes the label almost deterministic from the sampling.
- **Assuming shared code eliminates skew.** Different schedules, different lateness visibility and different numeric types all survive shared code untouched.
- **Comparing offline and online values without comparing *ages*.** Identical numbers with a three-day gap are not parity.
- **Letting serving fetch "latest" feature versions.** During a rollout the model receives definitions it never trained on, and the failure looks like model drift.
- **Waiting for model metrics to reveal a problem.** Performance degradation is a **late signal**; a feature-contract violation should alert before enough bad predictions accumulate to move an aggregate.

**How to approach the questions**

1. For any temporal question, write the prediction timestamp first, then ask what each feature's *availability* time was. Most wrong answers use event time where availability was required.
2. Test every window's endpoints explicitly. Inclusive-both and build-date-anchored windows are the two leaks that hide in correct-looking SQL.
3. For a suspiciously strong feature, ask whether the label's *generation process* could have written it. `final_resolution_team` is the template.
4. When a question describes a split, check for entity repetition and for time ordering before anything else.
5. For skew, ask three things in order: same definition, same lifecycle, same freshness. Shared code answers only the first.
6. Apply the counterfactual: could production obtain this exact value, at this freshness, before predicting? It resolves nearly every case in the lesson.
7. When exact parity is impossible, prefer training on the deployable signal — **a slightly less accurate model on real inputs beats a high-scoring one that depends on unavailable truth.**

**Where this leads**: temporal correctness makes one training set honest. Reproducing it is a different problem — the same query run next month reads a table that has moved on. The next lesson, **Dataset Versioning and Reproducibility**, is about versioning datasets alongside models and building training data from **snapshots rather than live queries**, so an experiment from June can be rebuilt, byte for byte, in December.
