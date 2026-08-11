# SOURCE PACK — Machine Learning / Tree-Based Models / Random Forests

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Random Forest: Decorrelating Trees via Feature Sampling   (15 questions)
2. Out-of-Bag Error Estimation   (15 questions)
3. Feature Importance from Random Forests   (15 questions)
4. Random Forest Hyperparameters (n_estimators, max_features, max_depth)   (15 questions)

## Covered by LATER lessons — do not teach these here

- AdaBoost: AdaBoost in a Nutshell: Reweight, Add a Weak Learner, Repeat, Decision Stumps as Weak Learners, The Ensemble as a Weighted Vote of Weak Learners
- Gradient Boosting: Sequential Error Correction in Boosting, Ensemble Prediction as Additive Modeling, Gradient Boosting for Regression, Loss Function for Gradient Boost Regression, Why Squared Error Works for Gradient Boosting, Initial Prediction in Gradient Boosting, Pseudo-Residuals, Why the Gradient Equals the Negative Residual, Why Gradient Boost Uses Differentiable Loss Functions, Fitting Trees to Residuals, Optimizing Leaf Output Values, Updating Predictions After Each Tree, Learning Rate in Gradient Boosting, Gradient Boost Algorithm Steps, Gradient Boosting for Classification, Negative Log-Likelihood Loss, Initial Log-Odds Prediction, Classification Residuals in Gradient Boosting, Converting Log-Odds to Probability, First and Second Derivatives in Gradient Boost Classification, Newton-Style Leaf Updates in Classification Boosting, Leaf Output Transformation for Classification, Updating Log-Odds with New Trees, Final Classification from Predicted Probability, Performance Trade-offs: Sensitivity to Noisy Data and Outliers
- XGBoost: XGBoost vs. Gradient Boosting, XGBoost Objective Function: Loss Plus Regularization, Second-Order Taylor Approximation with Gradients (G) and Hessians (H), Residuals in XGBoost, XGBoost for Regression, Similarity Score, Gain in XGBoost, Output Values for XGBoost Leaves, Initial Prediction in XGBoost, Sequential Residual Correction in XGBoost, Additive Tree-Based Prediction in XGBoost, How Lambda Shrinks Similarity Scores, How Lambda Shrinks Leaf Output Values, Pruning with Gamma, Tree Depth Constraints in XGBoost, Minimum Child Weight, Learning Rate in XGBoost, XGBoost for Classification, Similarity Score for Classification Trees, Cover in XGBoost, Gain for Classification Splits, Leaf Output Formula for Classification, Converting Log-Odds to Probability, Approximate Greedy Algorithm for Split Finding, Quantiles as Candidate Split Thresholds, Weighted Quantile Sketch, Parallel Learning and Sketch Algorithms for Large Data
- Decision Trees: Decision Trees, Root Nodes, Internal Nodes, and Leaf Nodes, Recursive Tree Growth, Classification Trees vs. Regression Trees, How Classification Trees Make Decisions, Leaf Output as Majority Class, Gini Impurity, Weighted Gini Impurity for Splits, Choosing the Best Split in a Classification Tree, Handling Numeric Features in Decision Trees, Threshold Selection for Continuous Variables, Regression Trees, Leaves as Numeric Predictions, Regression Tree Predictions as Leaf Averages, Sum of Squared Residuals for Split Selection, Choosing the Best Split in a Regression Tree, Building Regression Trees with Multiple Predictors, Automatic Feature Selection in Trees, Missing Data Strategies for Trees, Bias-Variance Tradeoff in Regression Trees, Overfitting in Decision Trees, Limiting Tree Growth, Minimum Samples per Leaf / Node, Pruning in Decision Trees, Cost Complexity Pruning, Tree Complexity Penalty, Alpha as the Pruning Hyperparameter, Using Cross-Validation to Choose Alpha, Selecting the Final Pruned Tree

## The live quiz bank for these topics — 60 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Random Forest: Decorrelating Trees via Feature Sampling

- Q: A dataset has $200$ features, but only $5$ are truly informative; the rest are noise. A teammate suggests raising $\texttt{max\_features}$ from $\sqrt{p}$ to a much larger value. What is the main risk of this change?
    [CORRECT] Splits become dominated by noise features, and trees become more alike
    [ ] The strong features get permanently deleted from the training set
    [ ] Each tree trains faster, but the forest can no longer be averaged
    [ ] Bootstrap sampling stops working because too many features are used
- Q: In a random forest classifier with $p = 25$ total features, the default rule of thumb for classification is to consider about $\sqrt{p}$ features at each split. How many features are typically considered per split?
    [CORRECT] $5$ features at each split
    [ ] $25$ features at each split
    [ ] $12$ features at each split
    [ ] $625$ features at each split
- Q: Using the variance formula $\rho\sigma^2 + \frac{(1-\rho)\sigma^2}{B}$, a forest has trees with $\sigma^2 = 4$ and correlation $\rho = 0.25$. With $B = 100$ trees, what is the approximate variance of the forest's average prediction?
    [CORRECT] About $1.03$
    [ ] About $0.04$
    [ ] About $4.00$
    [ ] About $0.25$
- Q: A student says: "Because random forests sample features at each split, the ensemble's trees have zero correlation with each other." Why is this statement wrong?
    [CORRECT] Trees still share the same data and target, so some correlation remains
    [ ] Feature sampling only changes the leaves, never the split structure
    [ ] Correlation is zero only when exactly one feature is sampled
    [ ] Bootstrap sampling guarantees identical trees, so correlation is one
- Q: Suppose you set the number of features considered at each split to $m = 1$. What is the most likely consequence for the forest?
    [CORRECT] Trees are highly diverse but individually weak, possibly underfitting
    [ ] Trees are nearly identical and individually very strong learners
    [ ] Trees are highly diverse and each one is also very strong
    [ ] Trees are nearly identical and each one severely underfits
- Q: In $\texttt{sklearn}$, a practitioner sets $\texttt{RandomForestClassifier(max\_features=None)}$. What does this setting do to feature sampling at each split?
    [CORRECT] It considers all features at each split, like ordinary bagging of trees
    [ ] It considers exactly one random feature at each split in the tree
    [ ] It considers the square root of the features at each split
    [ ] It disables feature sampling and also disables bootstrapping
- Q: A bagged tree ensemble (no feature sampling) and a random forest are both trained on the same data with the same number of trees. The random forest achieves lower test error. What is the most likely explanation?
    [CORRECT] Feature sampling lowered tree correlation, reducing ensemble variance
    [ ] Feature sampling increased tree depth, reducing ensemble bias only
    [ ] Bagging used fewer training rows, so its trees were much weaker
    [ ] Random forests average probabilities, while bagging cannot average
- Q: You want to verify empirically that feature sampling decorrelates trees. Which experiment most directly tests this?
    [CORRECT] Train two forests with different $\texttt{max\_features}$ and compare average pairwise tree prediction correlation
    [ ] Train one forest twice with the same seed and check that both runs give identical predictions
    [ ] Train a single deep tree and measure the correlation between its left and right subtrees
    [ ] Train one forest and compare its training accuracy against its test accuracy
- Q: Two forests are trained on the same data. Forest A uses $\texttt{max\_features} = p$ (all features at every split), while Forest B uses $\texttt{max\_features} = \sqrt{p}$. Which statement best describes the likely effect of moving from A to B?
    [CORRECT] Trees become less correlated, but each single tree may be weaker
    [ ] Trees become more correlated, and each single tree becomes stronger
    [ ] Trees become less correlated, and each single tree becomes stronger
    [ ] Trees become more correlated, but each single tree may be weaker
- Q: A data scientist builds a random forest where every tree is trained on a bootstrap sample, but at every split the tree may search over all $p$ features. Which step that normally decorrelates the trees has been removed?
    [CORRECT] Random feature sampling at each split
    [ ] Bootstrap sampling of the training rows
    [ ] Averaging predictions across the trees
    [ ] Growing each tree to a large depth
- Q: The variance of an average of $B$ trees, each with variance $\sigma^2$ and pairwise correlation $\rho$, is $\rho\sigma^2 + \frac{(1-\rho)\sigma^2}{B}$. According to this formula, what happens as $B \to \infty$?
    [CORRECT] Variance approaches $\rho\sigma^2$, so lowering $\rho$ is essential
    [ ] Variance approaches zero, so tree correlation no longer matters
    [ ] Variance approaches $\sigma^2$, so adding trees stops helping early
    [ ] Variance approaches $\frac{\sigma^2}{B}$, shrinking without any limit
- Q: A dataset contains one extremely strong predictor that dominates every decision tree, so bagged trees all split on it first and look nearly identical. How does random feature sampling at each split mainly reduce this problem?
    [CORRECT] It sometimes hides the dominant feature, letting other features be used
    [ ] It shrinks the dominant feature's coefficient toward zero each split
    [ ] It removes the dominant feature from the dataset before training
    [ ] It forces every tree to split on a different first feature
- Q: A colleague claims: "Random forests decorrelate trees because each tree is trained on a different bootstrap sample of rows." What is the most accurate refinement of this claim?
    [CORRECT] Bootstrap rows help, but per-split feature sampling adds further decorrelation
    [ ] Bootstrap rows are the only source of decorrelation in a random forest
    [ ] Feature sampling matters only when bootstrap sampling is turned off
    [ ] Bootstrap rows decorrelate trees by removing strong features entirely
- Q: Which description correctly states when feature sampling occurs during the training of a single random forest tree?
    [CORRECT] A fresh random subset of features is drawn at each node split
    [ ] One random feature subset is drawn and reused for the whole tree
    [ ] Features are sampled once per forest and shared by every tree
    [ ] Features are sampled only at the root node of each tree
- Q: A regression forest is trained on data with $p = 100$ features. A common default for regression is to consider $p/3$ features per split, rounded as needed. About how many features does each split evaluate?
    [CORRECT] About $33$ features per split
    [ ] About $10$ features per split
    [ ] About $100$ features per split
    [ ] About $3$ features per split

### Out-of-Bag Error Estimation

- Q: For a regression problem using bagging, how is the out-of-bag prediction for a training observation $x_i$ typically computed?
    [CORRECT] By averaging the predictions of trees that did not train on $x_i$
    [ ] By averaging the predictions of all trees in the ensemble
    [ ] By taking the median prediction of trees that trained on $x_i$
    [ ] By using the prediction of the single best-performing tree
- Q: A learner is confused about why out-of-bag error is not overly optimistic like training error. Which explanation correctly addresses this misconception?
    [CORRECT] OOB predictions come from models that never saw the evaluated point
    [ ] OOB error is computed on the bootstrap samples used for training
    [ ] OOB error applies a penalty term to correct for overfitting
    [ ] OOB predictions are made by the single best tree in the forest
- Q: A data scientist trains a random forest and wants an unbiased estimate of its generalization error without using a separate validation set. Which property of out-of-bag error estimation makes this possible?
    [CORRECT] Each observation is predicted only by trees that did not train on it
    [ ] Each observation is predicted by all trees using majority voting
    [ ] Each tree is evaluated on its own bootstrap training sample
    [ ] Each tree is tested on the full training set after fitting
- Q: When computing the out-of-bag prediction for a classification problem, how are the predictions from the relevant trees combined?
    [ ] By taking a weighted vote based on each tree's training accuracy
    [CORRECT] By taking a simple majority vote among the out-of-bag trees
    [ ] By averaging the predicted probabilities from all trees in the forest
    [ ] By selecting the prediction from the deepest tree available
- Q: Why is out-of-bag error generally considered a reliable estimate of test error for bagging ensembles, similar to cross-validation?
    [ ] Because it uses the training labels twice to reduce variance
    [CORRECT] Because it evaluates each point on models that never saw it
    [ ] Because it averages errors over all bootstrap samples equally
    [ ] Because it penalizes model complexity using an information criterion
- Q: Which scenario would make out-of-bag error estimation unreliable or impossible for a bagging ensemble?
    [ ] When the base learners are decision trees with unlimited depth
    [ ] When the dataset contains both numerical and categorical features
    [CORRECT] When each bootstrap sample includes every training observation
    [ ] When the ensemble contains a very large number of base learners
- Q: In a bagging ensemble, each base learner is trained on a bootstrap sample drawn with replacement from the training set. For a large training set of size $n$, approximately what fraction of the original observations is expected to appear in a given bootstrap sample?
    [ ] About $0.50$ of the observations
    [CORRECT] About $0.632$ of the observations
    [ ] About $0.75$ of the observations
    [ ] About $0.90$ of the observations
- Q: A practitioner notices that the out-of-bag error of a random forest is slightly pessimistic compared to the true test error. Which characteristic of the OOB estimation procedure best explains this tendency?
    [CORRECT] Each OOB prediction uses only a subset of the full ensemble
    [ ] Each tree in the forest is trained on the complete dataset
    [ ] The OOB error averages predictions from unrelated models
    [ ] The bootstrap samples always contain all training observations
- Q: In a bagging ensemble with a very large number of trees, what happens to the out-of-bag error estimate as more trees are added?
    [CORRECT] It converges to a stable value and then remains roughly constant
    [ ] It decreases linearly toward zero as the forest grows larger
    [ ] It increases because each new tree adds more variance to the model
    [ ] It oscillates randomly and never stabilizes for any dataset
- Q: A data scientist wants to use out-of-bag error to tune the number of features $m$ considered at each split in a random forest. Why is this approach valid?
    [CORRECT] Because OOB error provides an unbiased estimate for each value of $m$
    [ ] Because OOB error always decreases as $m$ increases monotonically
    [ ] Because OOB error is independent of the choice of $m$ entirely
    [ ] Because OOB error equals the training error for the optimal $m$
- Q: In a random forest, approximately what fraction of trees in the ensemble are expected to be out-of-bag for any given observation?
    [ ] About $0.10$ of the trees
    [ ] About $0.25$ of the trees
    [CORRECT] About $0.368$ of the trees
    [ ] About $0.632$ of the trees
- Q: A colleague claims that out-of-bag error estimation is computationally cheaper than $k$-fold cross-validation for a random forest. What is the primary reason this claim is usually correct?
    [CORRECT] OOB error requires no additional model training beyond the forest itself
    [ ] OOB error uses fewer data points than any single fold of CV
    [ ] OOB error can be computed exactly with a closed-form formula
    [ ] OOB error avoids randomness by using deterministic data splits
- Q: A random forest is trained on a dataset where some observations are easier to classify than others. Why might the out-of-bag error still provide a fair estimate of generalization performance?
    [ ] Because easy observations are excluded from the OOB computation
    [CORRECT] Because every observation serves as its own held-out test case
    [ ] Because hard observations are weighted more heavily in the vote
    [ ] Because the forest automatically balances class difficulty levels
- Q: For a single observation $x_i$ in the training set, which set of trees contributes to its out-of-bag prediction in a random forest?
    [ ] All trees in the forest, weighted equally by their depth
    [CORRECT] Only the trees whose bootstrap sample excluded $x_i$
    [ ] Only the trees whose bootstrap sample included $x_i$
    [ ] The single tree with the highest training accuracy overall
- Q: What is the main advantage of using out-of-bag error over a single train-test split when evaluating a bagging ensemble?
    [ ] It guarantees the lowest possible error estimate for the model
    [CORRECT] It uses all data for both training and validation efficiently
    [ ] It eliminates the need to tune any hyperparameters at all
    [ ] It removes all randomness from the evaluation procedure

### Feature Importance from Random Forests

- Q: In scikit-learn, which attribute of a fitted \texttt{RandomForestClassifier} provides the impurity-based feature importance scores?
    [CORRECT] exttt{feature_importances_}
    [ ] exttt{coef_}
    [ ] exttt{permutation_importance_}
    [ ] exttt{feature_weights_}
- Q: In a Random Forest, the feature importance of a variable is typically computed by averaging which quantity across all trees?
    [ ] The total number of times the feature is used for splitting
    [CORRECT] The total reduction in impurity achieved by splits on that feature
    [ ] The total depth at which the feature first appears in each tree
    [ ] The total variance of the feature values within each terminal node
- Q: Why does feature sampling at each split in a Random Forest help produce more reliable feature importance estimates than a single decision tree?
    [ ] It forces every tree to use identical features, reducing variance
    [CORRECT] It decorrelates trees, so importance reflects broader evidence
    [ ] It ensures all features are used equally often across the forest
    [ ] It prevents any single feature from being selected for splitting
- Q: If you randomly shuffle the values of an unimportant feature and retrain the Random Forest, what is the expected effect on the computed importance of other features?
    [ ] The importance of all other features will increase proportionally
    [CORRECT] The importance of other features should remain relatively unchanged
    [ ] The importance of other features will decrease due to added noise
    [ ] The importance of other features will become exactly zero
- Q: A feature has high impurity-based importance but low permutation importance on validation data. What does this discrepancy most likely indicate?
    [ ] The feature is useful for prediction but was rarely sampled
    [CORRECT] The feature is overfitting to noise in the training data
    [ ] The feature is correlated with the target only in validation
    [ ] The feature has low variance and should be removed entirely
- Q: Two highly correlated features are both strong predictors. In a Random Forest, how is importance typically distributed between them?
    [ ] The importance is concentrated entirely on the feature with higher variance
    [CORRECT] The importance is split roughly equally, potentially lowering both ranks
    [ ] The importance is assigned to the feature that appears first in the data
    [ ] The importance is doubled for both features due to their redundancy
- Q: You compute feature importance on the training set and find that a noisy, irrelevant feature ranks highly. What is the most likely explanation?
    [ ] Random Forests cannot handle noisy features and always rank them highly
    [CORRECT] The feature by chance correlated with the target in the training sample
    [ ] The feature has low variance, causing the algorithm to favor it strongly
    [ ] The feature was excluded from the random subset sampling process
- Q: A colleague claims that a feature with low importance in a Random Forest must be irrelevant for prediction. Which statement best critiques this claim?
    [ ] Low importance confirms the feature has no correlation with the target
    [CORRECT] Low importance may result from correlation with another strong feature
    [ ] Low importance proves the feature was never sampled during training
    [ ] Low importance indicates the feature has high variance but no signal
- Q: How does increasing the maximum depth of trees in a Random Forest typically affect the distribution of feature importance scores?
    [CORRECT] It concentrates importance on fewer features by allowing more splits
    [ ] It distributes importance more evenly by using all features equally
    [ ] It eliminates importance for features that only appear in deep nodes
    [ ] It forces all features to have identical importance scores
- Q: You train a Random Forest and compute feature importances. To obtain a more stable estimate, which approach is most appropriate?
    [CORRECT] Increase the number of trees and average the importance scores
    [ ] Decrease the maximum depth of trees to reduce overfitting
    [ ] Use only the single tree with the highest validation accuracy
    [ ] Remove half the features and retrain on the remaining subset
- Q: Compared to impurity-based importance, what is a key advantage of permutation importance?
    [ ] It is computed directly during training without extra computation
    [CORRECT] It is less biased toward high-cardinality continuous features
    [ ] It always produces the same ranking as impurity-based methods
    [ ] It requires no access to a validation set or out-of-bag samples
- Q: When using permutation importance with a Random Forest, how is the importance of a feature determined?
    [CORRECT] By measuring the decrease in model accuracy after shuffling that feature
    [ ] By counting how many trees in the forest actually contain that feature
    [ ] By computing the average information gain at the root node only
    [ ] By recording the total number of samples that reach the leaf nodes
- Q: Which scenario best illustrates when feature importance from a Random Forest should be interpreted with caution?
    [ ] When the model achieves high accuracy on a held-out test set
    [CORRECT] When the dataset contains many features with strong multicollinearity
    [ ] When the number of trees is set to the default value of one hundred
    [ ] When the target variable is binary rather than continuous or multiclass
- Q: You want to interpret a Random Forest model for a business stakeholder. Which visualization is most appropriate for communicating feature importance?
    [ ] A scatter plot of the two most important features against each other
    [CORRECT] A horizontal bar chart ranking features by their importance scores
    [ ] A line plot showing importance versus the depth of each decision tree
    [ ] A heatmap displaying the correlation matrix of all input features
- Q: Why might a continuous feature with many unique values receive inflated impurity-based importance compared to a categorical feature with few levels?
    [ ] Continuous features always have higher information gain than categorical
    [CORRECT] Continuous features offer more potential split points to reduce impurity
    [ ] Continuous features are automatically scaled to have larger variance
    [ ] Continuous features are sampled more frequently during tree building

### Random Forest Hyperparameters (n_estimators, max_features, max_depth)

- Q: Which pair of hyperparameters in a random forest both serve to introduce randomness that helps decorrelate the individual trees?
    [CORRECT] Bootstrap sampling of data and $\texttt{max\_features}$ at each split
    [ ] $\texttt{n\_estimators}$ and $\texttt{max\_depth}$ working together
    [ ] $\texttt{max\_depth}$ and $\texttt{min\_samples\_split}$ combined
    [ ] $\texttt{n\_estimators}$ and the random seed for reproducibility
- Q: A student sets $\texttt{max\_depth = 1}$ for every tree in a random forest. Each tree can only make a single split. What is the most likely outcome for the ensemble?
    [CORRECT] The ensemble may still perform reasonably if many stumps are combined
    [ ] The ensemble will always achieve perfect training accuracy quickly
    [ ] The ensemble will collapse into a single decision stump prediction
    [ ] The ensemble will overfit severely because stumps are high variance
- Q: A colleague claims that doubling $\texttt{n\_estimators}$ from 100 to 200 will cause the random forest to overfit the training data. Why is this claim generally incorrect?
    [CORRECT] Adding more trees averages predictions, which does not increase overfitting
    [ ] Random forests never overfit regardless of any hyperparameter settings
    [ ] Doubling trees always halves the training error by construction design
    [ ] More trees force each individual tree to become shallower and simpler
- Q: A data scientist trains a random forest with $\texttt{n\_estimators = 5}$ and observes that the validation accuracy fluctuates wildly each time the model is retrained with a different random seed. What is the most direct remedy for this instability?
    [CORRECT] Increase $\texttt{n\_estimators}$ to reduce variance in predictions
    [ ] Decrease $\texttt{max\_depth}$ to make each tree much shallower
    [ ] Increase $\texttt{max\_features}$ so trees consider more splits
    [ ] Decrease $\texttt{max\_features}$ to decorrelate the trees more
- Q: You are tuning $\texttt{max\_depth}$ for a random forest. Setting it to $\texttt{None}$ allows trees to grow until all leaves are pure. What is the typical effect of this on individual trees and the ensemble?
    [CORRECT] Individual trees may overfit, but aggregation often still generalizes well
    [ ] Individual trees underfit badly, and the ensemble always underfits too
    [ ] Individual trees become identical, so the ensemble acts as one tree
    [ ] Individual trees stop early, so the ensemble loses predictive power
- Q: A random forest regressor is trained with $\texttt{max\_features = 0.3}$ on a dataset with 50 features. How many features are considered at each split?
    [CORRECT] $15$ features, computed as $0.3 \times 50$ rounded to integer
    [ ] $30$ features, computed as $0.3 \times 100$ percent of total
    [ ] $7$ features, computed as $\sqrt{50}$ rounded down to integer
    [ ] $50$ features, since fractions are ignored and all are used
- Q: You train a random forest and notice that training accuracy is 100% but validation accuracy is only 72%. The trees are fully grown with $\texttt{max\_depth = None}$. Which single change most directly targets this overfitting gap?
    [CORRECT] Set $\texttt{max\_depth}$ to a smaller value to limit tree complexity
    [ ] Set $\texttt{n\_estimators}$ to a larger value to average more trees
    [ ] Set $\texttt{max\_features}$ to a larger value to use more features
    [ ] Set $\texttt{n\_estimators}$ to a smaller value to reduce model size
- Q: A team has a very large dataset and limited compute budget. They want to reduce training time without drastically hurting accuracy. Which adjustment is most appropriate?
    [CORRECT] Decrease $\texttt{n\_estimators}$ to train fewer trees and save time
    [ ] Increase $\texttt{max\_depth}$ so each tree learns the data faster
    [ ] Increase $\texttt{n\_estimators}$ so the model converges more quickly
    [ ] Decrease $\texttt{max\_features}$ so each split evaluates fewer options
- Q: Consider two random forests: Forest A uses $\texttt{max\_features = 1}$ and Forest B uses $\texttt{max\_features = p}$ (all features). Assuming all other settings are identical, which statement best compares them?
    [CORRECT] Forest A has more diverse trees; Forest B has more similar trees
    [ ] Forest A has less diverse trees; Forest B has more diverse trees
    [ ] Forest A always underfits; Forest B always achieves perfect accuracy
    [ ] Forest A trains much slower; Forest B trains faster with fewer splits
- Q: In a random forest, setting $\texttt{max\_features}$ equal to the total number of features $p$ means each split considers every feature. What is the primary consequence of this choice?
    [CORRECT] Trees become highly correlated, reducing the benefit of ensembling
    [ ] Trees become unable to split, causing severe underfitting of data
    [ ] Each tree trains much faster because no random subset is needed
    [ ] The model becomes equivalent to bagging with zero total features
- Q: A random forest trained on a dataset with 100 features uses $\texttt{max\_features = 'sqrt'}$. How many features are considered at each split?
    [CORRECT] $10$ features are randomly sampled at each candidate split point
    [ ] $50$ features are randomly sampled at each candidate split point
    [ ] $100$ features are all considered at each candidate split point
    [ ] $1$ feature is randomly sampled at each candidate split point
- Q: A practitioner reduces $\texttt{max\_features}$ from $p$ down to $\sqrt{p}$ in a random forest classifier. What is the main motivation behind this reduction?
    [CORRECT] To decorrelate individual trees by introducing randomness at each split
    [ ] To guarantee that every tree in the forest becomes much shallower
    [ ] To ensure that the strongest feature is selected at every split
    [ ] To increase the total number of trees that the forest will train
- Q: You are comparing two configurations for a random forest on the same dataset. Config 1: $\texttt{n\_estimators = 500}$, $\texttt{max\_depth = 3}$. Config 2: $\texttt{n\_estimators = 50}$, $\texttt{max\_depth = 20}$. Which config is more likely to have higher variance in its predictions across different training runs?
    [CORRECT] Config 2, because fewer and deeper trees lead to higher variance
    [ ] Config 1, because more trees always lead to higher variance overall
    [ ] Config 1, because shallow trees cannot capture any real patterns
    [ ] Config 2, because deeper trees always underfit the training data
- Q: Which hyperparameter in a random forest directly controls the number of decision trees that are trained and aggregated?
    [CORRECT] $\texttt{n\_estimators}$ sets how many trees are built in the forest
    [ ] $\texttt{max\_depth}$ sets how many trees are built in the forest
    [ ] $\texttt{max\_features}$ sets how many trees are built in the forest
    [ ] $\texttt{min\_samples\_leaf}$ sets how many trees are in the forest
- Q: In scikit-learn's $\texttt{RandomForestClassifier}$, the default value of $\texttt{max\_features}$ for classification is typically $\texttt{'sqrt'}$. What does this setting accomplish at each node split?
    [CORRECT] It samples $\sqrt{p}$ features randomly as candidates for the best split
    [ ] It uses the square root of the training samples to pick one feature
    [ ] It squares the feature importances before selecting the best split
    [ ] It splits each node into $\sqrt{p}$ children using all $p$ features

