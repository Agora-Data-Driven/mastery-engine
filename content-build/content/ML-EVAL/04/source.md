# SOURCE PACK — Machine Learning / Model Evaluation & Tuning / Cross-Validation & Hyperparameter Tuning

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Validation Curves to Tune a Hyperparameter   (5 questions)
2. k-Fold Cross-Validation   (5 questions)
3. Stratified k-Fold for Classification   (5 questions)
4. Grid Search and Random Search   (5 questions)
5. Nested Cross-Validation for Unbiased Evaluation   (5 questions)

## Already taught earlier in this course

- Confusion Matrix: TP, TN, FP, FN
- Accuracy, Precision, Recall, and F1-Score
- ROC Curve and Area Under the Curve (AUC)
- Precision-Recall Curve for Imbalanced Data
- Threshold Tuning and Cost-Sensitive Decisions
- Systematic Error Analysis (Per-Class FP/FN Patterns)
- Data Augmentation and Feature Engineering from Error Insights
- Class Imbalance: Undersampling, Oversampling, and SMOTE
- Cost-Sensitive Learning and Threshold Adjustment
- Ceiling Analysis to Prioritize Improvements
- Underfitting vs Overfitting Identification
- Expected Prediction Error Decomposition
- Bias, Variance, and Irreducible Error
- Impact of Model Complexity on Bias and Variance
- Learning Curves for Diagnosing Bias and Variance
- Dropout as a Regularizer for Neural Networks
- Early Stopping in Gradient Boosting and Neural Networks

## The live quiz bank for these topics — 25 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Validation Curves to Tune a Hyperparameter

- Q: You are tuning the learning rate of a gradient boosting classifier using a validation curve computed with 5-fold cross-validation. The training AUC remains 0.95 across all tried rates, while the validation AUC peaks at learning rate 0.1 and then drops sharply. Which learning rate should you select for the final model?
    [ ] Select 0.01 because it maximizes the training AUC.
    [CORRECT] Select 0.1 because it yields the highest validation AUC.
    [ ] Select 0.5 where validation AUC is lower but stable.
    [ ] Select 0.8 because the curve suggests underfitting.
- Q: You train a support vector classifier with a soft-margin parameter C (larger C means less regularization). A validation curve shows training accuracy steadily rising with C, while validation accuracy peaks at C=10 and then declines. What does this pattern most likely indicate?
    [ ] The model is underfitting when C is small.
    [CORRECT] The model is overfitting when C is large.
    [ ] The model's bias is too high for all C values.
    [ ] The validation set is too small to detect overfitting.
- Q: A junior analyst runs a validation curve for the number of trees (n_estimators) in a random forest, varying n_estimators from 10 to 1000. The training error decreases continuously, while the validation error decreases until 200 trees and then flattens. The analyst concludes that collecting more training data will further reduce validation error. Is this conclusion valid?
    [CORRECT] No, the curve shows sensitivity to complexity, not data size.
    [ ] Yes, adding data would shift the validation curve down.
    [ ] Yes, a plateau indicates high bias that extra data can remedy.
    [ ] No, the training error would eventually drop as well.
- Q: You plot a validation curve for the max_depth of a decision tree. Training accuracy increases with depth, while validation accuracy climbs to a maximum at depth 6 and then decreases. What does the decrease in validation accuracy after depth 6 primarily signal?
    [CORRECT] The model is beginning to overfit the training data.
    [ ] The training data is insufficient for deeper trees.
    [ ] The model is underfitting when depth exceeds six.
    [ ] The cross-validation splits are biased or unreliable.
- Q: You fit a neural network and plot the validation curve for the number of hidden units using cross-entropy loss. Both training and validation losses are high and nearly identical across all tested unit counts. Based on this validation curve, what is the most appropriate adjustment?
    [CORRECT] Increase the number of hidden units beyond the tested range.
    [ ] Add L2 regularization to reduce model overfitting.
    [ ] Increase the learning rate to escape local minima.
    [ ] Use a larger validation set for more stable loss estimates.

### k-Fold Cross-Validation

- Q: When using k-fold cross-validation to tune hyperparameters and assess the final model, what approach provides an unbiased estimate of generalization performance?
    [ ] Performing a single k-fold CV and reporting the best fold's score.
    [CORRECT] Performing nested CV with an inner loop for tuning and an outer loop for evaluation.
    [ ] Performing a train/validation/test split and running CV on the training portion.
    [ ] Performing k-fold CV and selecting the hyperparameters that maximize the mean score.
- Q: What is the primary advantage of using 5-fold cross-validation over a single 80/20 train-test split?
    [CORRECT] It yields a more stable error estimate through repeated validation.
    [ ] It reduces overfitting by training each fold on less data.
    [ ] It increases training set size in every individual fold.
    [ ] It eliminates the need to randomize the dataset beforehand.
- Q: You are estimating the test error of a model using k-fold cross-validation on a dataset of 50,000 samples. Among the following choices of k, which one typically produces the highest variance in the estimated error?
    [ ] k = 2
    [ ] k = 5
    [ ] k = 10
    [CORRECT] k = 20
- Q: You are evaluating a churn prediction model with only 3% positive class. To obtain a reliable performance estimate via k-fold cross-validation, which technique should you apply?
    [CORRECT] Use stratified k-fold to maintain class ratios in each fold.
    [ ] Use oversampling of the minority class within each training fold.
    [ ] Use leave-one-out cross-validation to cover all positives.
    [ ] Use a k value equal to the total number of positive instances.
- Q: During a standard k-fold cross-validation procedure (with k=5), how many times is a single data point used for model training and for validation?
    [CORRECT] Used for training in 4 folds and for validation in 1 fold.
    [ ] Used for training in 1 fold and for validation in 4 folds.
    [ ] Used for training in all folds but validated in only one fold.
    [ ] Used for training and validation in all folds equally.

### Stratified k-Fold for Classification

- Q: Your dataset for a churn classification task contains only 5% positive cases. You plan to evaluate models using 5-fold cross-validation. Why is stratified k-fold recommended over standard k-fold in this situation?
    [CORRECT] To ensure each fold has roughly 5% positive cases, matching the full dataset
    [ ] To reduce training time by only using a subset of negative samples
    [ ] To prevent the model from learning spurious patterns in the majority class
    [ ] To automatically handle missing values in the minority class
- Q: In which scenario would you be least inclined to use stratified k-fold for a classification problem?
    [ ] A dataset with 1% positive class and 10,000 samples
    [CORRECT] A dataset with 50% positive class and 500,000 samples
    [ ] A dataset with 30% positive class and 200 samples
    [ ] A dataset with three classes at 5%, 15%, and 80% distribution
- Q: A marketing analytics team performs hyperparameter tuning on a classifier using stratified 10-fold cross-validation, then reports the average accuracy from those same folds as the final model performance. What is the primary shortcoming of this evaluation?
    [ ] Stratified folds distort the class distribution, making accuracy misleading
    [CORRECT] The reported accuracy is likely overestimated because the hyperparameters were optimized on the same data used for evaluation
    [ ] Ten folds are insufficient for reliable performance estimation on marketing data
    [ ] Stratified cross-validation cannot be used for hyperparameter tuning
- Q: Your dataset contains multiple records per user, and you are building a classifier to predict ad clicks (0.1% positive). You decide to use stratified 10-fold cross-validation based on the click target. What is the greatest risk with this approach?
    [ ] The validation folds may contain too few positive examples to be reliable
    [CORRECT] Records from the same user could appear in both training and validation folds
    [ ] The class proportions in the training folds will not match the overall dataset
    [ ] The model will be forced to learn only from imbalanced folds
- Q: You have a dataset for campaign segment classification with four categories, each making up about 25% of the data. A colleague insists that stratified k-fold is unnecessary because classes are already balanced. Which statement best justifies still using stratified k-fold?
    [ ] Stratified k-fold guarantees perfectly identical class counts across folds, which standard k-fold cannot
    [ ] Stratified k-fold reduces the risk of order effects caused by sorting the dataset by target
    [CORRECT] Stratified k-fold ensures that each fold reflects the overall class distribution, reducing variance in performance estimates
    [ ] Stratified k-fold speeds up convergence when using stochastic gradient descent

### Grid Search and Random Search

- Q: A marketer plans to tune an XGBoost churn model with 6 hyperparameters (learning rate, max depth, subsample, colsample_bytree, min_child_weight, gamma) using only 100 model evaluations. They worry that simple random search might miss narrow high-performing regions. What strategy should they adopt to mitigate this risk while still using a random-style approach?
    [ ] Perform an exhaustive grid search on a subset of parameters to reduce dimensionality.
    [ ] Run Bayesian optimization, as it is the only method capable of finding narrow peaks.
    [CORRECT] Use Latin hypercube sampling instead of fully random sampling to improve space coverage.
    [ ] Increase the number of trials to 500 to ensure coverage, even if it exceeds the budget.
- Q: A marketer uses grid search to tune a random forest's n_estimators (with values 100, 500) and max_features (choices 'sqrt', 'log2'). What limitation does this approach have?
    [ ] It cannot handle categorical parameters like max_features.
    [CORRECT] The grid may miss good n_estimators values like 250 if only 100 and 500 are provided.
    [ ] Exhaustively testing all combinations can cause overfitting to the validation data.
    [ ] Grid search relies on cross-validation, which limits the number of folds.
- Q: A marketer trains a neural network with 5 hyperparameters: learning rate, batch size, number of layers, dropout rate, and optimizer choice. They suspect that only learning rate and number of layers have a large impact on model performance, while the others have little effect. They can run 100 training experiments. Which hyperparameter tuning approach is most likely to find a better model?
    [ ] Perform grid search with 2 values per parameter (32 trials) and repeat with different seeds.
    [CORRECT] Use random search to sample all parameters, testing many distinct learning rates and layer numbers.
    [ ] Conduct a grid search only on learning rate and layers, with the others set to default values.
    [ ] Iteratively tune one hyperparameter at a time while holding the others constant.
- Q: A marketing data scientist wants to tune an XGBoost model's many hyperparameters (learning rate, max depth, subsample, colsample_bytree, etc.) and has time to evaluate only 50 different models. Which search method is most appropriate to efficiently explore the parameter space?
    [ ] Run a grid search across all combinations of five values per parameter.
    [CORRECT] Perform random search over continuous parameter ranges for 50 trials.
    [ ] Manually test parameter values one by one, adjusting based on prior results.
    [ ] Use Bayesian optimization starting with a Latin hypercube sample.
- Q: A marketer uses grid search to tune a neural network's learning rate (values 0.001, 0.01, 0.1) and number of layers (2, 3, 4). The model with learning rate 0.01 and 3 layers gives the lowest validation loss. What should they conclude?
    [ ] These hyperparameters are the optimal values for this dataset.
    [ ] Grid search always identifies the optimal combination in the tested ranges.
    [CORRECT] Only nine discrete combinations were tested; better values may exist between them.
    [ ] Grid search's exhaustive nature guarantees the best hyperparameters were found.

### Nested Cross-Validation for Unbiased Evaluation

- Q: A marketing analyst uses nested cross-validation to estimate the performance of a regularization parameter tuning pipeline. How does the procedure avoid optimistic bias?
    [CORRECT] It uses the outer loop to evaluate the selected model on data not seen during tuning.
    [ ] It averages the inner-loop validation scores to compute an unbiased performance estimate.
    [ ] It selects the best hyperparameters from the outer-loop test sets for final evaluation.
    [ ] It increases the number of folds to reduce variance in the performance estimate across runs.
- Q: A marketing analyst evaluates 15 different model variants (different algorithms and hyperparameter sets) using a single train/validation/test split. He selects the variant with the highest validation AUC and then measures a much lower AUC on the held-out test set. What change to the evaluation workflow would give the most reliable estimate of how the final chosen model will perform on new data?
    [ ] Increase the validation set size to 25% to reduce variance in the model selection metric.
    [CORRECT] Replace the single validation set with nested cross-validation to obtain an unbiased estimate.
    [ ] Increase the test set size to 30% to obtain a more stable estimate of future performance.
    [ ] Limit the number of candidate models to five to reduce the multiple-comparisons selection bias.
- Q: A campaign performance model was tuned using nested cross-validation, yielding an average AUC of 0.80. Then a standard 5-fold cross-validation on the full dataset gave a best mean AUC of 0.82. Which value should the marketer report as the expected AUC on new data?
    [ ] Report 0.82, because it is the best cross-validated AUC from the final tuning on the full dataset.
    [CORRECT] Report 0.80, because nested CV yields an unbiased estimate of the pipeline’s future performance.
    [ ] Report 0.81, averaging the nested CV and standard CV estimates to balance bias and variance.
    [ ] Report 0.80 only when ten or more outer folds were used, else report 0.82 for reliability.
- Q: In nested cross-validation, which subset of the data is used to choose the best hyperparameters for a given outer fold?
    [CORRECT] The outer training data, further split into inner training and validation folds.
    [ ] The outer test data, split into inner training and validation folds.
    [ ] The entire dataset, using a separate nested cross-validation process.
    [ ] The validation metrics from the inner loop, without using any outer test data.
- Q: A digital marketer builds a classification model to identify high-value leads. She uses 5-fold cross-validation to tune the learning rate of XGBoost and reports the best mean cross-validated AUC of 0.78 as the expected performance on new data. Which statement best describes the flaw in this evaluation?
    [CORRECT] The reported AUC is optimistically biased because the same data was used for model selection and evaluation.
    [ ] The reported AUC is pessimistic because cross-validation reduces the size of the training set.
    [ ] The reported AUC is accurate because cross-validation provides an unbiased estimate of true performance.
    [ ] The reported AUC is meaningless because AUC is not suitable for marketing classification problems.

