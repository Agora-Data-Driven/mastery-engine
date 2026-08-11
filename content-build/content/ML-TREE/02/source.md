# SOURCE PACK — Machine Learning / Tree-Based Models / AdaBoost

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. AdaBoost in a Nutshell: Reweight, Add a Weak Learner, Repeat   (5 questions)
2. Decision Stumps as Weak Learners   (5 questions)
3. The Ensemble as a Weighted Vote of Weak Learners   (5 questions)

## Already taught earlier in this course

- Random Forest: Decorrelating Trees via Feature Sampling
- Out-of-Bag Error Estimation
- Feature Importance from Random Forests
- Random Forest Hyperparameters (n_estimators, max_features, max_depth)

## Covered by LATER lessons — do not teach these here

- Gradient Boosting: Sequential Error Correction in Boosting, Ensemble Prediction as Additive Modeling, Gradient Boosting for Regression, Loss Function for Gradient Boost Regression, Why Squared Error Works for Gradient Boosting, Initial Prediction in Gradient Boosting, Pseudo-Residuals, Why the Gradient Equals the Negative Residual, Why Gradient Boost Uses Differentiable Loss Functions, Fitting Trees to Residuals, Optimizing Leaf Output Values, Updating Predictions After Each Tree, Learning Rate in Gradient Boosting, Gradient Boost Algorithm Steps, Gradient Boosting for Classification, Negative Log-Likelihood Loss, Initial Log-Odds Prediction, Classification Residuals in Gradient Boosting, Converting Log-Odds to Probability, First and Second Derivatives in Gradient Boost Classification, Newton-Style Leaf Updates in Classification Boosting, Leaf Output Transformation for Classification, Updating Log-Odds with New Trees, Final Classification from Predicted Probability, Performance Trade-offs: Sensitivity to Noisy Data and Outliers
- XGBoost: XGBoost vs. Gradient Boosting, XGBoost Objective Function: Loss Plus Regularization, Second-Order Taylor Approximation with Gradients (G) and Hessians (H), Residuals in XGBoost, XGBoost for Regression, Similarity Score, Gain in XGBoost, Output Values for XGBoost Leaves, Initial Prediction in XGBoost, Sequential Residual Correction in XGBoost, Additive Tree-Based Prediction in XGBoost, How Lambda Shrinks Similarity Scores, How Lambda Shrinks Leaf Output Values, Pruning with Gamma, Tree Depth Constraints in XGBoost, Minimum Child Weight, Learning Rate in XGBoost, XGBoost for Classification, Similarity Score for Classification Trees, Cover in XGBoost, Gain for Classification Splits, Leaf Output Formula for Classification, Converting Log-Odds to Probability, Approximate Greedy Algorithm for Split Finding, Quantiles as Candidate Split Thresholds, Weighted Quantile Sketch, Parallel Learning and Sketch Algorithms for Large Data
- Decision Trees: Decision Trees, Root Nodes, Internal Nodes, and Leaf Nodes, Recursive Tree Growth, Classification Trees vs. Regression Trees, How Classification Trees Make Decisions, Leaf Output as Majority Class, Gini Impurity, Weighted Gini Impurity for Splits, Choosing the Best Split in a Classification Tree, Handling Numeric Features in Decision Trees, Threshold Selection for Continuous Variables, Regression Trees, Leaves as Numeric Predictions, Regression Tree Predictions as Leaf Averages, Sum of Squared Residuals for Split Selection, Choosing the Best Split in a Regression Tree, Building Regression Trees with Multiple Predictors, Automatic Feature Selection in Trees, Missing Data Strategies for Trees, Bias-Variance Tradeoff in Regression Trees, Overfitting in Decision Trees, Limiting Tree Growth, Minimum Samples per Leaf / Node, Pruning in Decision Trees, Cost Complexity Pruning, Tree Complexity Penalty, Alpha as the Pruning Hyperparameter, Using Cross-Validation to Choose Alpha, Selecting the Final Pruned Tree

## The live quiz bank for these topics — 15 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### AdaBoost in a Nutshell: Reweight, Add a Weak Learner, Repeat

- Q: In AdaBoost, after a stump misclassifies a set of training samples, what is the direct consequence for the next round of training?
    [ ] Those samples are removed from the training set to reduce noise
    [CORRECT] Those samples receive higher weights so the next stump focuses on them
    [ ] The next stump is trained to fit the residuals of the current stump
    [ ] The learning rate is reduced to prevent overfitting on hard examples
- Q: A decision stump in an AdaBoost ensemble achieves a weighted error rate of $0.4$. According to the formula $\alpha = \frac{1}{2} \ln\left(\frac{1 - \text{error}}{\text{error}}\right)$, what is the approximate value of $\alpha$ for this stump?
    [CORRECT] $\alpha \approx 0.20$
    [ ] $\alpha \approx 0.41$
    [ ] $\alpha \approx 0.92$
    [ ] $\alpha \approx 1.00$
- Q: Why is AdaBoost particularly sensitive to outliers and noisy labels compared to some other ensemble methods?
    [ ] Outliers cause the exponential loss function to become convex, making optimization unstable
    [CORRECT] Misclassified outliers receive exponentially increasing weights, forcing later stumps to fit them
    [ ] The algorithm automatically removes outliers, which reduces the effective training set size
    [ ] Outliers are assigned zero weight, causing the model to ignore important patterns
- Q: Which statement accurately describes a key difference between how AdaBoost and gradient boosting build their ensembles?
    [ ] AdaBoost fits new learners to the residuals of previous learners, while gradient boosting reweights training samples
    [CORRECT] AdaBoost reweights training samples after each round, while gradient boosting fits new learners to residuals
    [ ] AdaBoost uses deep decision trees as weak learners, while gradient boosting uses only decision stumps
    [ ] AdaBoost combines learners using a simple majority vote, while gradient boosting uses a weighted vote
- Q: The final prediction in AdaBoost is computed as $\text{sign}\left(\sum_i \alpha_i \cdot h_i(x)\right)$. What does this formulation imply about how individual stumps contribute to the ensemble's output?
    [ ] All stumps contribute equally to the final prediction regardless of their individual accuracy
    [CORRECT] Stumps with lower weighted error have larger $\alpha$ values and thus more influence on the vote
    [ ] Only the stump with the highest $\alpha$ value determines the final classification for each sample
    [ ] The contribution of each stump is determined by the order in which it was added to the ensemble

### Decision Stumps as Weak Learners

- Q: A data scientist is configuring AdaBoost to predict which email subscribers will convert. She considers using deep decision trees as the base learners instead of decision stumps. Why is the stump the standard choice here?
    [CORRECT] Stumps have low variance, so the ensemble can focus on reducing bias sequentially
    [ ] Stumps have low bias, so the ensemble only needs to correct residual variance
    [ ] Stumps train on full depth, so each round captures more feature interactions
    [ ] Stumps avoid thresholds, so every round splits on the exact same single feature
- Q: After 50 boosting rounds, each a decision stump, a marketing mix classifier still underfits. A junior analyst suggests the stumps are too simple and should be replaced with one large tree. Which reasoning best counters this?
    [CORRECT] Combining many stumps lets the ensemble model complexity that no single stump can
    [ ] Replacing all stumps keeps variance low while removing the bias the rounds corrected
    [ ] Combining many stumps works because each stump alone captures feature interactions
    [ ] Replacing all stumps helps because boosting only functions with deep base learners
- Q: A churn model uses a stump that splits customers at exactly 14 days since last login. By itself, the stump beats random guessing only slightly. What does this tell a practitioner about its role in a boosting ensemble?
    [CORRECT] It qualifies as a weak learner, since it needs only to edge out chance to be useful
    [ ] It fails as a weak learner, since boosting requires each base model to reach high accuracy
    [ ] It qualifies as a strong learner, since a single feature can drive final predictions
    [ ] It fails as a strong learner, since stump depth cannot exceed two split thresholds
- Q: A team boosts stumps for lead scoring and notices that with very noisy labels, performance degrades as rounds increase, while a colleague's clean dataset keeps improving. Which diagnosis best explains the difference?
    [CORRECT] Stumps amplify noisy rows as reweighting focuses later rounds on mislabeled cases
    [ ] Stumps ignore noisy rows since single splits cannot memorize any outlier labels
    [ ] Stumps stabilize noisy rows because shallow depth caps the ensemble's variance
    [ ] Stumps filter noisy rows by dropping examples that earlier rounds misclassified
- Q: In an AdaBoost run predicting ad click likelihood, one stump misclassifies a set of high-value customer rows. What happens to those rows when the next stump is trained?
    [CORRECT] Their weights increase, so the next stump is pushed to fit them more closely
    [ ] Their weights decrease, so the next stump treats them as settled easy cases
    [ ] They get removed, so the next stump trains only on cleanly separable examples
    [ ] They stay constant, so the next stump repeats the same split with new features

### The Ensemble as a Weighted Vote of Weak Learners

- Q: Three candidate weak learners have weighted error rates of 0.20, 0.35, and 0.45 for learners A, B, and C. Under the standard AdaBoost weighting rule, how should their voting influence compare?
    [ ] Weight C above B, and weight B above A.
    [CORRECT] Weight A above B, and weight B above C.
    [ ] Weight A, B, and C exactly the same.
    [ ] Weight only A, and remove both B and C.
- Q: An AdaBoost-style ensemble labels users as likely to convert (+1) or not convert (-1). Learner A votes +1 with weight 0.6, learner B votes -1 with weight 0.4, and learner C votes -1 with weight 0.3. What is the ensemble prediction?
    [ ] Predict conversion because the largest single learner weight is positive.
    [ ] Predict conversion because the positive learner outweighs the other two.
    [CORRECT] Predict non-conversion because the negative weighted total is larger.
    [ ] Declare the result a tie because all three learner weights are used.
- Q: A conversion ensemble produces a signed weighted score of 0.08, so the default zero threshold predicts conversion. A false positive is costly, and the team wants stricter predictions without changing what the trained learners contribute. What is the most appropriate adjustment?
    [ ] Increase every learner weight according to recent validation performance.
    [ ] Reassign each learner weight according to the false-positive cost.
    [CORRECT] Raise the final decision threshold while keeping learner weights unchanged.
    [ ] Require unanimity by discarding every learner that votes negative.
- Q: An analyst chooses the next weak learner using ordinary unweighted accuracy, even though the current training rows carry different importance weights. Why is this a mistake in a weighted-vote ensemble?
    [ ] It applies row weights only after the weak learner is selected.
    [ ] It treats previously misclassified rows as less important later.
    [ ] It gives each selected weak learner the same final vote weight.
    [CORRECT] It ignores the row weights that define the learner-selection objective.
- Q: After reweighting the training data, a newly fitted weak learner has a weighted error rate of 0.49 on a binary task. In standard AdaBoost-style aggregation, what should happen to that learner's vote?
    [ ] Give it substantial influence because it avoids the largest errors.
    [CORRECT] Give it almost no influence because it performs near chance.
    [ ] Give it a negative influence because its error remains below half.
    [ ] Give it the median influence because every learner remains useful.

