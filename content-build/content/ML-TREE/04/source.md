# SOURCE PACK — Machine Learning / Tree-Based Models / XGBoost

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. XGBoost vs. Gradient Boosting   (10 questions)
2. XGBoost Objective Function: Loss Plus Regularization   (5 questions)
3. Second-Order Taylor Approximation with Gradients (G) and Hessians (H)   (5 questions)
4. Residuals in XGBoost   (10 questions)
5. XGBoost for Regression   (5 questions)
6. Similarity Score   (10 questions)
7. Gain in XGBoost   (10 questions)
8. Output Values for XGBoost Leaves   (10 questions)
9. Initial Prediction in XGBoost   (15 questions)
10. Sequential Residual Correction in XGBoost   (5 questions)
11. Additive Tree-Based Prediction in XGBoost   (5 questions)
12. How Lambda Shrinks Similarity Scores   (5 questions)
13. How Lambda Shrinks Leaf Output Values   (15 questions)
14. Pruning with Gamma   (9 questions)
15. Tree Depth Constraints in XGBoost   (10 questions)
16. Minimum Child Weight   (5 questions)
17. Learning Rate in XGBoost   (4 questions)
18. XGBoost for Classification   (10 questions)
19. Similarity Score for Classification Trees   (5 questions)
20. Cover in XGBoost   (10 questions)
21. Gain for Classification Splits   (5 questions)
22. Leaf Output Formula for Classification   (5 questions)
23. Converting Log-Odds to Probability   (10 questions)
24. Approximate Greedy Algorithm for Split Finding   (5 questions)
25. Quantiles as Candidate Split Thresholds   (6 questions)
26. Weighted Quantile Sketch   (5 questions)
27. Parallel Learning and Sketch Algorithms for Large Data   (5 questions)

## Already taught earlier in this course

- Random Forest: Decorrelating Trees via Feature Sampling
- Out-of-Bag Error Estimation
- Feature Importance from Random Forests
- Random Forest Hyperparameters (n_estimators, max_features, max_depth)
- AdaBoost in a Nutshell: Reweight, Add a Weak Learner, Repeat
- Decision Stumps as Weak Learners
- The Ensemble as a Weighted Vote of Weak Learners
- Sequential Error Correction in Boosting
- Ensemble Prediction as Additive Modeling
- Gradient Boosting for Regression
- Loss Function for Gradient Boost Regression
- Why Squared Error Works for Gradient Boosting
- Initial Prediction in Gradient Boosting
- Pseudo-Residuals
- Why the Gradient Equals the Negative Residual
- Why Gradient Boost Uses Differentiable Loss Functions
- Fitting Trees to Residuals
- Optimizing Leaf Output Values
- Updating Predictions After Each Tree
- Learning Rate in Gradient Boosting
- Gradient Boost Algorithm Steps
- Gradient Boosting for Classification
- Negative Log-Likelihood Loss
- Initial Log-Odds Prediction
- Classification Residuals in Gradient Boosting
- Converting Log-Odds to Probability
- First and Second Derivatives in Gradient Boost Classification
- Newton-Style Leaf Updates in Classification Boosting
- Leaf Output Transformation for Classification
- Updating Log-Odds with New Trees
- Final Classification from Predicted Probability
- Performance Trade-offs: Sensitivity to Noisy Data and Outliers

## Covered by LATER lessons — do not teach these here

- Decision Trees: Decision Trees, Root Nodes, Internal Nodes, and Leaf Nodes, Recursive Tree Growth, Classification Trees vs. Regression Trees, How Classification Trees Make Decisions, Leaf Output as Majority Class, Gini Impurity, Weighted Gini Impurity for Splits, Choosing the Best Split in a Classification Tree, Handling Numeric Features in Decision Trees, Threshold Selection for Continuous Variables, Regression Trees, Leaves as Numeric Predictions, Regression Tree Predictions as Leaf Averages, Sum of Squared Residuals for Split Selection, Choosing the Best Split in a Regression Tree, Building Regression Trees with Multiple Predictors, Automatic Feature Selection in Trees, Missing Data Strategies for Trees, Bias-Variance Tradeoff in Regression Trees, Overfitting in Decision Trees, Limiting Tree Growth, Minimum Samples per Leaf / Node, Pruning in Decision Trees, Cost Complexity Pruning, Tree Complexity Penalty, Alpha as the Pruning Hyperparameter, Using Cross-Validation to Choose Alpha, Selecting the Final Pruned Tree

## Authored transcript for this lesson (AUTHORITATIVE — prefer this over the questions)

[object Object],[object Object]

## The live quiz bank for these topics — 204 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### XGBoost vs. Gradient Boosting

- Q: How does XGBoost's tree pruning strategy differ from the greedy early-stopping used by many decision trees?
    [ ] It raises the learning rate when a split shows negative gain
    [CORRECT] It grows to maximum depth, then prunes negative-gain nodes
    [ ] It halts a branch the moment a split shows negative gain
    [ ] It keeps a fixed symmetric shape and ignores negative gain
- Q: Which statement about XGBoost is a misconception to avoid?
    [ ] That it relies on boosted decision trees to act as its base learners
    [CORRECT] That it is unrelated to gradient boosting, not an enhanced form of it
    [ ] That it is carefully engineered and tuned for fast, practical daily use
    [ ] That it adds regularization terms to the objective that it optimizes
- Q: Compared with basic gradient boosting, what does XGBoost add to the algorithm?
    [ ] A switch from decision trees to linear base learners
    [ ] Unsupervised clustering of the training examples first
    [ ] Restriction to regression, dropping classification support
    [CORRECT] Built-in regularization and specialized tree-building rules
- Q: In optimizing its objective, how does XGBoost's loss approximation primarily differ from standard Gradient Boosting?
    [ ] It uses a third-order Taylor expansion of the loss
    [ ] It uses a first-order Taylor expansion of the loss
    [CORRECT] It uses a second-order Taylor expansion of the loss
    [ ] It uses a zero-order Taylor expansion of the loss
- Q: How does XGBoost's sparsity-aware split finding handle a feature's missing values when training a tree?
    [ ] It always sends missing values down the right branch
    [ ] It always sends missing values down the left branch
    [CORRECT] It learns an optimal default branch per node
    [ ] It drops rows with missing values before scoring splits
- Q: Which mechanism lets XGBoost control model complexity and curb overfitting more effectively than basic Gradient Boosting?
    [ ] It applies L1 and L2 penalties only after post-pruning
    [ ] It uses L1 and L2 penalties to normalize input features
    [ ] It drops L1 and L2 penalties to cut computational cost
    [CORRECT] It bakes L1 and L2 penalty terms into the objective
- Q: What technique keeps XGBoost efficient when proposing split points on datasets too large to fit in memory?
    [CORRECT] It uses a weighted quantile sketch to propose splits
    [ ] It ignores gradient statistics when proposing splits
    [ ] It samples random feature subsets to pick an exact split
    [ ] It sorts every unique feature value for an exact split
- Q: Why is XGBoost typically more efficient than a naive boosting loop that resamples the full dataset each round?
    [CORRECT] It uses weighted examples and an optimized implementation
    [ ] It drops residuals and fits the raw labels directly
    [ ] It removes all tree growth in favor of linear fits
    [ ] It trains a single tree and stops after one round
- Q: What is XGBoost's practical reputation among machine learning practitioners?
    [ ] A method that works only on very small datasets
    [ ] A toy method used only for classroom teaching demos
    [ ] A clustering tool for unlabeled exploratory analysis
    [CORRECT] A top performer in competitions and applied problems
- Q: How is XGBoost best understood relative to generic gradient boosting?
    [ ] As a decision-stump-only learner with fixed depth one
    [CORRECT] As a refined boosted-tree implementation with regularization
    [ ] As bagging of independent trees under a new name
    [ ] As an unrelated model family sharing no core ideas

### XGBoost Objective Function: Loss Plus Regularization

- Q: As lambda is increased in the leaf objective, what happens to the optimal output value?
    [ ] It moves farther from zero to chase noise
    [ ] It stays fixed unless gamma is also raised
    [CORRECT] It is pulled closer toward zero by penalty
    [ ] It becomes equal to the largest residual
- Q: Why can Taylor terms that lack the output value be dropped during leaf optimization?
    [ ] Because they are zero for every possible leaf
    [ ] Because they duplicate the lambda penalty term
    [ ] Because they apply only to classification loss
    [CORRECT] Because they do not move the minimum value
- Q: When XGBoost fits a new tree, what is each leaf trying to select?
    [ ] An output value that makes every residual zero
    [CORRECT] An output value that minimizes loss plus penalty
    [ ] An output value that raises total leaf count
    [ ] An output value that ignores prior predictions
- Q: Which statement matches how XGBoost differs from ordinary gradient boost in solving leaf outputs?
    [CORRECT] It uses second-order Taylor for regression and classification
    [ ] It uses Taylor for classification but exact regression math
    [ ] It avoids Taylor approximations for both of those problem types
    [ ] It needs Taylor terms only when lambda is exactly zero
- Q: For regression using one half times the squared residual, how do residuals enter a leaf output numerator?
    [ ] They are squared before they are summed
    [CORRECT] They are summed after the signs cancel
    [ ] They are divided by the initial prediction
    [ ] They are weighted by the value of lambda

### Second-Order Taylor Approximation with Gradients (G) and Hessians (H)

- Q: For regression using half squared residual loss, which leaf output formula follows from G and H?
    [CORRECT] Residual sum divided by (residual count plus lambda)
    [ ] Negative residual sum divided by (residual count plus lambda)
    [ ] Gradient sum divided by (Hessian sum plus lambda)
    [ ] Hessian sum divided by (gradient sum plus lambda)
- Q: When minimizing a leaf objective, why can the previous prediction's loss terms be omitted?
    [CORRECT] They lack the output value, so they cannot move the optimum
    [ ] They equal zero after the Taylor expansion is applied
    [ ] They are absorbed into lambda before differentiation starts
    [ ] They only change pruning, never the leaf objective
- Q: A modeler raises lambda from 0 to 40 and expects larger leaf outputs. What should happen under XGBoost regularization?
    [CORRECT] The optimal leaf output should shift closer toward zero
    [ ] The optimal leaf output should move farther from zero
    [ ] The leaf output should stay fixed at the initial prediction
    [ ] The Hessian sum should become exactly zero
- Q: In XGBoost's second-order Taylor approximation, what do G and H represent?
    [CORRECT] G is the gradient term, and H is the Hessian term
    [ ] G is the Hessian term, and H is the gradient term
    [ ] G is the loss constant, and H is the output value
    [ ] G is the pruning penalty, and H is the learning rate
- Q: How does XGBoost differ from ordinary gradient boosting when solving for leaf output values?
    [CORRECT] It uses second-order Taylor approximation for both task types
    [ ] It avoids Taylor approximation unless labels are binary
    [ ] It uses exact algebra for classification but not regression
    [ ] It changes the tree rule rather than the loss function

### Residuals in XGBoost

- Q: In the iterative boosting process, how is the current ensemble prediction obtained before computing the next set of residuals?
    [ ] By taking only the most recent tree's output
    [ ] By averaging the outputs of all prior trees
    [CORRECT] By summing the outputs of all prior trees
    [ ] By picking the single best prior tree's output
- Q: What is the likely consequence if a training configuration drives the residuals to near zero within the first few boosting iterations?
    [CORRECT] It fits noise and fails to generalize
    [ ] It raises the cost of the earliest splits
    [ ] It shrinks the feature pool each tree sees
    [ ] It yields trees too shallow to fit signal
- Q: Why does XGBoost work with the gradients and Hessians of the loss rather than with plain target-minus-prediction differences?
    [ ] It stops eta from slowing down convergence
    [ ] It removes any need to compute target means
    [ ] It guarantees outliers are fully ignored
    [CORRECT] A Taylor expansion supports arbitrary losses
- Q: Which belief about residuals in XGBoost is a misconception to avoid?
    [ ] That residuals come directly from the model's current set of predictions
    [ ] That residuals steer what the next tree in the sequence learns to fix
    [CORRECT] That each tree fits the original fixed targets alone, not current errors
    [ ] That residuals are refreshed after each single boosting round completes
- Q: After a new tree is built and a learning rate (eta) is applied, how is each example's residual updated for the next boosting round?
    [ ] It is frozen until the final tree is added
    [ ] It grows so the model fits more aggressively
    [CORRECT] It shrinks by the tree's output times eta
    [ ] It is multiplied by eta before any tree fits
- Q: In XGBoost regression, what does a residual represent?
    [ ] The total count of leaf nodes found in the current fitted tree
    [CORRECT] The difference between the observed and the predicted values
    [ ] The node impurity that is measured at a given internal split
    [ ] The set of support vectors that belong to the boosted ensemble
- Q: Why are residuals central to building each new XGBoost tree?
    [ ] They are computed only after all training has finished
    [ ] They set the number of output classes for the model
    [ ] They permanently replace the targets, ignoring predictions
    [CORRECT] The next tree is fit to correct the current model's errors
- Q: What happens to the residuals after a new tree is added to the model?
    [CORRECT] They are recomputed from the updated predictions
    [ ] They stay fixed for all remaining boosting rounds
    [ ] They are converted into the final class labels
    [ ] They are dropped from the rest of the algorithm
- Q: If the current model underpredicts an example, what sign does its residual (observed minus predicted) usually have?
    [CORRECT] Positive
    [ ] Undefined for that example
    [ ] Always exactly zero
    [ ] Negative
- Q: In XGBoost, the "residual" fit by each new tree generalizes from a plain target-minus-prediction error (under squared error) to a more general quantity under a non-linear loss such as logistic loss. What is this general quantity?
    [ ] The log-odds of each misclassified case
    [CORRECT] The negative gradient of the chosen loss
    [ ] The unchanged original target values
    [ ] The second derivative of the prediction

### XGBoost for Regression

- Q: What is XGBoost for regression used for?
    [ ] Classifying data using support vectors alone
    [ ] Detecting anomalies via Gaussian density models
    [ ] Grouping unlabeled records into clusters
    [CORRECT] Predicting numeric target values with boosted trees
- Q: What kind of outputs does an XGBRegressor produce?
    [CORRECT] Continuous numeric predictions
    [ ] Discrete cluster assignments
    [ ] Only binary class labels
    [ ] Distances to support-vector margins
- Q: Why is XGBoost a popular choice for tabular regression problems?
    [CORRECT] It is fast, efficient, and often highly competitive in practice
    [ ] It needs no hyperparameters to be configured by the user at all
    [ ] It is applicable only to raw image-based inputs, not tabular data
    [ ] It guarantees perfect generalization to brand-new unseen data
- Q: Why is XGBoost described as an implementation of boosted trees?
    [CORRECT] It builds trees in sequence so later ones fix the earlier mistakes
    [ ] It grows one single enormous tree and then immediately stops there
    [ ] It averages many fully independent trees that are each trained once
    [ ] It uses neither residuals nor any other kind of corrective updates
- Q: What misconception about XGBoost regression should be avoided?
    [ ] That it sees wide use across real-world practical applications
    [ ] That it outputs continuous numeric values rather than classes
    [CORRECT] That it is a single-tree model rather than a boosted ensemble
    [ ] That it constructs all of its trees one after another in sequence

### Similarity Score

- Q: Which statement about the similarity score is a misconception to avoid?
    [ ] It is a quantity used to evaluate groups of residuals
    [ ] It is used to help assess how good a candidate split is
    [ ] It includes a regularization term in its denominator
    [CORRECT] It is the final prediction a leaf outputs for an example
- Q: For a leaf, the Output Value is $\frac{\text{sum of residuals}}{\text{count} + \lambda}$ and the Similarity Score is $\frac{(\text{sum of residuals})^2}{\text{count} + \lambda}$. What is the key difference in their numerators?
    [ ] One takes absolute residuals, the other raw ones
    [CORRECT] One squares the residual sum, the other does not
    [ ] One adds $\lambda$, the other drops regularization
    [ ] One divides by count, the other by count squared
- Q: What role does the parameter lambda play in the similarity score formula?
    [ ] It serves as the learning rate that shrinks each tree
    [ ] It rescales the target labels before residuals are formed
    [CORRECT] It acts as a regularization term added in the denominator
    [ ] It guarantees every similarity score comes out positive
- Q: Which formula gives the similarity score for a group of residuals in XGBoost regression?
    [ ] $\frac{\text{sum of the squared residuals}}{\text{number of residuals} + \lambda}$
    [CORRECT] $\frac{(\text{sum of the residuals})^2}{\text{number of residuals} + \lambda}$
    [ ] $\frac{(\text{sum of the residuals})^2}{\text{number of residuals} - \lambda}$
    [ ] $\frac{\text{average of the residuals}}{\text{number of residuals} + \lambda}$
- Q: A split's gain is computed as Left + Right - Root using leaf similarity scores. How does raising the regularization parameter lambda constrain tree growth?
    [ ] It scales scores up to avoid low gain
    [CORRECT] It lowers similarity scores, shrinking gain
    [ ] It leaves scores fixed but raises gamma
    [ ] It raises similarity scores, growing gain
- Q: The XGBoost similarity score for a leaf is $(\text{sum of residuals})^2 / (\text{count} + \lambda)$. How does it treat a leaf whose residuals are large but of mixed sign versus large residuals of the same sign?
    [ ] Mixed signs leave it fixed since count rules
    [ ] Mixed signs raise it since variance is high
    [CORRECT] Mixed signs lower it since the sum is squared
    [ ] Mixed signs zero it since magnitudes cancel
- Q: Using $\text{similarity} = \frac{(\text{sum of residuals})^2}{\text{count} + \lambda}$, what happens to the score and to tree construction as $\lambda$ grows without bound?
    [CORRECT] It tends to zero, so no new splits form
    [ ] It tends to one, so every split looks optimal
    [ ] It tends to one, so residuals are disregarded
    [ ] It tends to zero, so the tree maximizes depth
- Q: Two candidate leaves have an identical sum of residuals, but Node A holds 3 residuals and Node B holds 10. Using similarity = $\frac{(\text{sum})^2}{\text{count} + \lambda}$, how do their scores compare?
    [ ] Node B scores lower, having more residual mass
    [CORRECT] Node A scores higher, having fewer residuals
    [ ] Node A scores lower, having less residual mass
    [ ] Node B scores higher, having more residuals
- Q: Why is the similarity score useful when deciding how to split a node?
    [ ] It directly outputs the final depth the tree should reach
    [ ] It fixes the classification threshold used at each leaf
    [CORRECT] It feeds the gain calculation so candidate splits can be compared
    [ ] It is only meaningful after the tree has been fully pruned
- Q: In XGBoost regression, what is the similarity score used to quantify?
    [ ] The final regression value predicted directly for each example
    [ ] The learning rate applied when shrinking each tree's output
    [ ] The number of distinct target classes present in the dataset
    [CORRECT] The quality of the residuals that are grouped together in a node

### Gain in XGBoost

- Q: Why is XGBoost's gain calculation considered more broadly applicable across loss functions than the Gini impurity used in classic decision trees?
    [ ] It uses a first-order Taylor expansion of any differentiable loss.
    [ ] It uses feature-variance analysis of any differentiable loss.
    [CORRECT] It uses a second-order Taylor expansion of any differentiable loss.
    [ ] It uses categorical frequency counts of any differentiable loss.
- Q: Why is a larger gain preferred over a smaller one when evaluating a split?
    [ ] A larger gain makes any later pruning step unnecessary
    [CORRECT] A larger gain signals the split gives a more useful improvement
    [ ] A larger gain automatically forces the tree to grow deeper
    [ ] A larger gain guarantees the tree will reach zero error
- Q: In a regression task trained with Mean Squared Error loss, how does the Hessian H behave inside the XGBoost gain calculation?
    [CORRECT] It equals 1 for every observation, simplifying the gain denominator.
    [ ] It equals the absolute error value, simplifying the gain numerator.
    [ ] It equals the feature variance value, reshaping the gain numerator.
    [ ] It changes with each prediction, reshaping the gain denominator.
- Q: How is gain computed conceptually for a candidate split?
    [ ] By subtracting the learning rate from each residual
    [ ] By averaging the output values of the two child leaves
    [ ] By counting how many support vectors the split produces
    [CORRECT] By comparing the children's similarity scores to the parent's
- Q: The similarity score used in XGBoost gain and the optimal leaf weight w both involve the gradients in a leaf. How do they differ mathematically in their treatment of the gradient sum?
    [CORRECT] Similarity squares the gradient sum, while the leaf weight uses it raw.
    [ ] The leaf weight squares the gradient sum, while similarity uses it raw.
    [ ] The leaf weight sums squared gradients, similarity uses the raw sum.
    [ ] Similarity sums the squared gradients, while the weight uses the raw sum.
- Q: During post-pruning of an XGBoost tree, what condition must a branch's split gain satisfy for that branch to be kept rather than removed?
    [ ] Its gain must equal the ratio of gamma to the tree depth.
    [ ] Its gain must be strictly less than the gamma hyperparameter.
    [CORRECT] Its gain must be strictly greater than the gamma hyperparameter.
    [ ] Its gain must equal the product of gamma and the tree depth.
- Q: What does gain measure when XGBoost builds a tree?
    [CORRECT] How much a proposed split improves the objective versus not splitting
    [ ] The total number of training examples that are present in the dataset
    [ ] The largest single prediction value the tree is ever able to output
    [ ] The class probability value that gets assigned at one particular leaf
- Q: What does a negative or very low gain for a split suggest?
    [ ] The residuals for that node have all vanished to zero
    [CORRECT] The split is not worth keeping and may be pruned away
    [ ] The model can no longer add trees in an additive way
    [ ] The dataset being modeled has become unsupervised
- Q: Which statement about gain is a misconception to avoid?
    [ ] Gain compares the child nodes against their parent node
    [ ] Gain can inform whether a split should later be pruned
    [ ] Gain that is higher indicates a more worthwhile split
    [CORRECT] Gain is the same thing as a leaf's predicted output value
- Q: In the XGBoost gain formula, where each similarity score equals $\frac{(\text{sum of gradients})^2}{\text{sum of Hessians} + \lambda}$, how does increasing the L2 regularization parameter $\lambda$ affect whether a split is accepted?
    [ ] It shrinks the similarity-score denominator, raising total gain.
    [ ] It shrinks the similarity-score numerator, raising total gain.
    [CORRECT] It enlarges the similarity-score denominator, lowering total gain.
    [ ] It enlarges the similarity-score numerator, lowering total gain.

### Output Values for XGBoost Leaves

- Q: Which statement about XGBoost leaf outputs is a misconception to avoid?
    [CORRECT] They are mere branch names, not numeric values
    [ ] They are derived from residual information
    [ ] They can be shrunk by the lambda term
    [ ] They are numeric corrections, not branch labels
- Q: In XGBoost's derivation of leaf output values, what do the symbols G and H stand for?
    [CORRECT] G is the first derivative and H is the second derivative of the loss
    [ ] G is the second derivative and H is the first derivative of the loss
    [ ] G is the residual sum and H is the regularization term lambda
    [ ] G is the leaf output and H is the count of leaves in the tree
- Q: In an XGBoost regression tree, what does the numeric value stored in a leaf represent?
    [ ] The single predicted class label for the region
    [ ] The count of training rows reaching the leaf
    [CORRECT] A correction to the running prediction
    [ ] The information gain of the split above it
- Q: How is the output value of an XGBoost regression leaf computed?
    [ ] The most frequent class among the rows
    [ ] The Gini impurity measured at that leaf
    [CORRECT] Sum of residuals over (count + lambda)
    [ ] The mean of the feature values in the leaf
- Q: When minimizing the approximated loss for a leaf, why can the loss terms that lack the output value be dropped from the optimization?
    [CORRECT] They do not contain the output value, so they cannot change the minimum
    [ ] They cancel out exactly with the regularization penalty term
    [ ] They equal zero once the initial prediction is set to 0.5
    [ ] They were already counted in the previous tree's output value
- Q: In XGBoost regression, what happens to the optimal leaf output value as the regularization parameter lambda is increased?
    [CORRECT] It shifts closer to zero, shrinking the leaf's contribution
    [ ] It grows larger to counteract the smaller residuals
    [ ] It stays fixed because lambda only affects pruning
    [ ] It flips sign once lambda exceeds the residual sum
- Q: Why can the gamma times number-of-leaves term be left out when deriving optimal leaf output values?
    [CORRECT] Pruning happens after the tree is built, so it cannot change the outputs
    [ ] Gamma is fixed at zero by default, so the term always vanishes
    [ ] The term only applies to classification and not regression trees
    [ ] The term is absorbed into lambda during the regularization step
- Q: How does XGBoost's use of second-order Taylor approximation differ from standard gradient boosting?
    [CORRECT] XGBoost applies it to both regression and classification losses
    [ ] XGBoost applies it to classification losses but not regression
    [ ] XGBoost applies it to regression losses but not classification
    [ ] XGBoost avoids it by solving each loss function exactly
- Q: When the regularization term lambda equals zero, the XGBoost regression leaf output reduces to which quantity?
    [ ] The configured learning-rate value
    [ ] The overall mean of the target variable
    [ ] The predicted class probability value
    [CORRECT] The mean residual in the leaf
- Q: Once a tree's structure (its splits) has been fixed, why must leaf output values still be assigned?
    [ ] They fix how many input features the model uses
    [ ] They relabel the branches for visualization
    [CORRECT] They set how much the tree shifts each region
    [ ] They overwrite the stored residuals with targets

### Initial Prediction in XGBoost

- Q: Within the XGBoost objective, what does the constant initial prediction stage represent before any tree is added?
    [CORRECT] A zero-order approximation of the loss
    [ ] A second-order expansion of each split
    [ ] A cross-validation of the model bias
    [ ] A first-order derivative of the leaves
- Q: What is the primary purpose of computing residuals against the constant initial prediction before fitting trees?
    [ ] To remove the need for any feature engineering
    [ ] To rescale the columns of the feature matrix
    [CORRECT] To give each tree a directional error to fit
    [ ] To shrink the variance of the final ensemble
- Q: By default, what value does XGBoost use as its initial prediction before any trees are added?
    [ ] 0
    [CORRECT] 0.5
    [ ] 1.0
    [ ] The median of the targets
- Q: Which belief about XGBoost's initial prediction is a misconception to avoid?
    [ ] That a simple baseline prediction is made at the start
    [ ] That later trees refine the baseline prediction over rounds
    [ ] That the first residuals depend on that baseline value
    [CORRECT] That XGBoost begins by fitting a complex tree before any baseline
- Q: How does the constant initial prediction directly shape the building of the first gradient-boosted tree?
    [ ] It scales the learning rate applied in later rounds
    [ ] It defines the gain threshold used by the pruner
    [CORRECT] It sets the starting gradients and hessians per sample
    [ ] It fixes the maximum tree depth allowed for splits
- Q: What do the initial residuals (target minus initial prediction) indicate?
    [ ] The number of final leaves the model will have
    [ ] The optimal maximum depth for each tree
    [CORRECT] How far off the baseline prediction is before any trees
    [ ] The strength of the regularization penalty used
- Q: When fitting an XGBoost leaf, the regularization strength lambda is raised from 0 to 4 and then to 40. What happens to the optimal output value for the leaf as lambda increases?
    [CORRECT] It shifts closer to zero with each increase
    [ ] It grows larger in size with each increase
    [ ] It stays fixed at the average of residuals
    [ ] It flips between positive and negative signs
- Q: For XGBoost regression using the one-half squared-residual loss function, what does the gradient g sub i equal for a given observation?
    [CORRECT] The negative residual for that observation
    [ ] The squared residual for that observation
    [ ] The observed value minus the lambda penalty
    [ ] The residual multiplied by the Hessian value
- Q: An XGBoost regression model starts from the constant 0.5 prediction and puts all residuals into a single leaf. With lambda set to 0, testing candidate output values gives a total loss of 104.4 at 0, 109.4 at -1, and 102.4 at +1. Which output value should be chosen for the leaf?
    [ ] 0, since it keeps the initial prediction intact
    [ ] -1, since it reduces the residual for y1
    [CORRECT] +1, since it produces the lowest total loss
    [ ] -1, since negative values always improve fit
- Q: Why does XGBoost need an initial prediction before building any trees?
    [ ] It fixes the final class labels right away
    [CORRECT] It gives a baseline for computing residuals
    [ ] It is used only for plotting, not for learning
    [ ] It removes the need to ever train trees
- Q: In binary classification, why is a probability of 0.5 a common starting constant for an XGBoost model?
    [CORRECT] It corresponds to a neutral log-odds value of zero
    [ ] It minimizes the initial sum of squared errors
    [ ] It balances the initial weights across the leaves
    [ ] It maximizes the gain of the root node split
- Q: What is the first step when fitting an XGBoost model to data?
    [ ] Build the deepest possible tree on the raw data
    [ ] Compute support vectors that define the margin
    [ ] Normalize every feature to zero mean and unit variance
    [CORRECT] Make a single initial prediction for all examples
- Q: For an XGBoost regression task, which expression gives the optimal output value for a leaf once the gradients and Hessians are plugged in?
    [CORRECT] Sum of residuals divided by the number of residuals plus lambda
    [ ] Sum of residuals divided by the sum of the squared residuals
    [ ] Mean of the residuals multiplied by the total number of leaves
    [ ] Sum of squared residuals divided by the lambda penalty value
- Q: When XGBoost is used for a regression task, what property should the constant initial prediction ideally satisfy?
    [ ] It should equal the median value of the target set
    [ ] It should maximize the coverage of the first leaf
    [CORRECT] It should minimize the chosen loss over all targets
    [ ] It should reflect the numeric range of the outputs
- Q: How does XGBoost's use of the second-order Taylor approximation differ from standard gradient boosting when solving for optimal leaf output values?
    [CORRECT] XGBoost applies it to both regression and classification losses
    [ ] XGBoost applies it only when lambda is set to zero
    [ ] XGBoost uses it to prune leaves after tree building
    [ ] XGBoost skips it because exact solutions are easier

### Sequential Residual Correction in XGBoost

- Q: What is the core sequential idea behind how XGBoost builds its trees?
    [ ] Trees are added to the model in random order
    [ ] Residuals are computed only once at the start
    [ ] Every tree predicts the full target on its own
    [CORRECT] Each new tree targets the ensemble's residuals
- Q: How does fitting each tree to the current residuals benefit the ensemble?
    [CORRECT] It refines the fit gradually, not in one tree
    [ ] It guarantees the model will never overfit
    [ ] It removes any need for regularization terms
    [ ] It makes the very first tree irrelevant
- Q: Why is XGBoost's training described as sequential correction?
    [CORRECT] It keeps correcting its remaining errors
    [ ] It trains all of the trees at the same time
    [ ] It sorts features alphabetically before each split
    [ ] It reassigns the class labels on every round
- Q: After predictions improve following a tree, what happens before the next tree is fit?
    [CORRECT] Fresh residuals are computed for it
    [ ] The learning rate is reset all the way to 1
    [ ] Training halts no matter the current error
    [ ] The same tree is reused without any changes
- Q: Which statement about XGBoost's sequential nature is a misconception to avoid?
    [ ] Each tree is trained on the updated residuals
    [ ] Boosting proceeds in a stagewise manner
    [CORRECT] Each tree is unrelated to earlier trees
    [ ] Residuals are recomputed between rounds

### Additive Tree-Based Prediction in XGBoost

- Q: Why is XGBoost described as an additive tree-based model?
    [ ] It relies on only a single decision tree when forming all of its predictions
    [ ] It keeps adding brand-new input features instead of ever adding any new trees
    [CORRECT] The final prediction sums an initial value plus many later tree contributions
    [ ] It averages all of its trees together equally with no real ordering at all
- Q: In XGBoost's additive model, what does each newly added tree contribute?
    [ ] A freshly relabeled set of the training targets
    [ ] A representative centroid for one data cluster
    [CORRECT] A correction to the current running prediction
    [ ] A fixed threshold value used when pruning trees
- Q: Which misunderstanding about additive prediction in XGBoost should be avoided?
    [CORRECT] That only the final tree determines the model's output
    [ ] That the ensemble is built up in a stagewise additive way
    [ ] That all earlier trees remain part of the running sum
    [ ] That the prediction is updated cumulatively over trees
- Q: Why can an additive ensemble of trees be a powerful predictor?
    [ ] Additivity forces the model to stay linear in the inputs
    [ ] Only the single largest tree truly matters
    [CORRECT] Many small corrections combine into a flexible predictor
    [ ] It blocks any use of regularization terms
- Q: How does the learning rate interact with XGBoost's additive prediction?
    [ ] It selects the model's initial baseline prediction
    [ ] It converts a regression model into a classifier
    [ ] It removes the need for the lambda parameter
    [CORRECT] It scales each tree's contribution before it is summed in

### How Lambda Shrinks Similarity Scores

- Q: Which belief about lambda's effect on similarity scores is a misconception to avoid?
    [ ] Lambda can lower the value of computed similarity scores
    [ ] Lambda is one component of XGBoost's regularization
    [ ] Lambda's shrinkage influences gain and therefore pruning
    [CORRECT] Lambda touches only leaf outputs, not split-evaluation terms
- Q: What broader modeling benefit does shrinking similarity scores support?
    [ ] It has an effect only for classification problems
    [ ] It removes any need to also limit tree depth
    [ ] It guarantees a strictly better fit to the training set
    [CORRECT] It regularizes the tree and can reduce overfitting
- Q: Why does adding lambda to the denominator shrink the similarity score?
    [ ] Adding lambda normalizes the labels before summing them
    [CORRECT] The same summed residuals are divided by a larger quantity
    [ ] Adding lambda makes all of the residuals vanish to zero
    [ ] Adding lambda forces the resulting gain to be negative
- Q: Numerically, how does lambda change an XGBoost similarity score?
    [ ] It increases the numerator, so the score becomes larger
    [ ] It drops the parent node out of the gain calculation
    [CORRECT] It enlarges the denominator, so the score becomes smaller
    [ ] It flips the signs of the residuals in the numerator
- Q: Why can shrinking similarity scores make pruning more likely to occur?
    [ ] It forces a larger fraction of the leaves to become pure
    [ ] It blocks residuals from being recomputed each round
    [CORRECT] Smaller gain values more easily fall below the gamma threshold
    [ ] It causes the trees to grow deeper before pruning runs

### How Lambda Shrinks Leaf Output Values

- Q: When XGBoost moves from a regression task to a classification task, what primarily changes in the tree-building derivation?
    [CORRECT] The loss function and its derivatives
    [ ] The initial prediction and its scale
    [ ] The pruning penalty and its timing
    [ ] The leaf count and its constraint
- Q: With lambda held constant, where is its relative shrinkage of a leaf's weight most pronounced?
    [ ] Only in regions where the Hessian sum exceeds lambda.
    [CORRECT] In regions where the leaf's Hessian sum is very small.
    [ ] In regions where the leaf's Hessian sum is very large.
    [ ] Equally in every region, regardless of the Hessian sum.
- Q: In the XGBoost optimal leaf-weight formula w = -G / (H + lambda), how does the L2 term lambda relate to the Hessian sum H?
    [ ] It joins the numerator, weakening the gradient sum's effect on weight size.
    [ ] It joins the denominator, strengthening the gradient sum's effect on weight size.
    [ ] It joins the numerator, strengthening the gradient sum's effect on weight size.
    [CORRECT] It joins the denominator, weakening the gradient sum's effect on weight size.
- Q: How does lambda affect an XGBoost leaf output value?
    [ ] It removes all leaf predictions from the tree
    [ ] It sets each leaf output equal to the learning rate
    [ ] It reverses the sign of every leaf's output value
    [CORRECT] It enlarges the formula's denominator, shrinking the output
- Q: From a bias-variance view, how does increasing lambda change the model's behavior during additive boosting?
    [ ] It lowers variance by enlarging the maximum correction each new leaf can add.
    [CORRECT] It lowers variance by limiting the maximum correction each new leaf can add.
    [ ] It lowers bias by enlarging the maximum correction each new leaf can add.
    [ ] It lowers bias by limiting the maximum correction each new leaf can add.
- Q: Why is shrinking leaf outputs with lambda especially important for leaves holding few observations?
    [ ] Few-observation leaves are pruned automatically in every case
    [ ] Leaves with few observations are always harmless to predictions
    [CORRECT] Without shrinkage, a tiny leaf could make an overly extreme correction
    [ ] Lambda adjusts only leaves that hold many observations
- Q: Which statement matches how XGBoost handles squared-error and negative-log-likelihood losses when solving for leaf outputs?
    [ ] It uses exact algebra for both losses each time
    [CORRECT] It uses one Taylor approximation for both losses
    [ ] It reserves Taylor steps for classification only
    [ ] It skips derivatives and searches output values
- Q: A modeler adds gamma times leaf count into the objective while deriving an optimal leaf weight before the tree is finished. Why is that misplaced?
    [ ] It sets eta, scaling every later tree update
    [ ] It sets H, sitting in the leaf denominator
    [CORRECT] It tunes post-build pruning, not leaf derivation
    [ ] It sets p0, shifting every residual equally
- Q: For squared-error loss, one leaf has residuals 2, -1, and 4, with lambda set to 5. Using the XGBoost leaf rule, what is the output value?
    [ ] 1.67
    [ ] 5.00
    [ ] 8.00
    [CORRECT] 0.63
- Q: As lambda approaches infinity in XGBoost, what is the limiting behavior of the leaf outputs and the overall model?
    [CORRECT] Leaf outputs approach zero, so the model converges to its initial prediction.
    [ ] Leaf outputs approach zero, so the model converges to the mean of the labels.
    [ ] Leaf outputs approach one, so the model converges to the mean of the labels.
    [ ] Leaf outputs approach one, so the model converges to its initial prediction.
- Q: Why does shrinking leaf output values act as a form of regularization?
    [ ] It removes the need to compute gain for any split
    [ ] It forces every leaf in the tree to predict exactly zero
    [CORRECT] Smaller corrections reduce sensitivity to individual observations
    [ ] It guarantees the model reaches higher training accuracy
- Q: What happens to a leaf output value when lambda increases from 0 to a positive number?
    [CORRECT] Its magnitude typically decreases
    [ ] Its value always exactly doubles
    [ ] It stops depending on the residuals
    [ ] It turns into a discrete class label
- Q: Which belief about lambda and leaf outputs is a misconception to avoid?
    [ ] Shrinking leaf outputs is a regularization effect
    [ ] Lambda can reduce the size of a leaf's correction
    [CORRECT] Leaf output values stay unchanged when lambda changes
    [ ] The leaf-output formula genuinely depends on lambda
- Q: What best distinguishes the regularizing effect of lambda from that of the learning rate (eta) in XGBoost?
    [ ] Lambda scales the whole tree's contribution; eta shrinks each leaf's weight via its Hessian sum.
    [CORRECT] Lambda shrinks each leaf's weight via its Hessian sum; eta scales the whole tree's contribution.
    [ ] Lambda cuts the number of leaf nodes per tree; eta shrinks the loss-function gradients.
    [ ] Lambda shrinks the loss-function gradients; eta cuts the number of leaf nodes per tree.
- Q: When minimizing the Taylor-approximated objective for one leaf, why can the previous-loss constant terms be dropped?
    [ ] They copy lambda and only enlarge the penalty
    [CORRECT] They lack output terms and cannot move the minimum
    [ ] They store H and must stay in the denominator
    [ ] They fix p0 and must be optimized first

### Pruning with Gamma

- Q: If the gain of a split minus gamma comes out negative, what does XGBoost do to that branch?
    [CORRECT] It prunes (removes) the branch
    [ ] It raises the learning rate for that branch
    [ ] It promotes the branch to become the root
    [ ] It randomly reweights the branch's data
- Q: How does raising the gamma parameter affect an XGBoost model's bias-variance tradeoff?
    [ ] A larger gamma yields a more complex model with deeper branches.
    [ ] A larger gamma yields a sharper model with lower local bias.
    [CORRECT] A larger gamma yields a more conservative model with lower variance.
    [ ] A larger gamma yields a more flexible model with higher variance.
- Q: What is the effect of increasing the gamma value in XGBoost?
    [ ] The boosting loss function is replaced entirely by a different objective
    [ ] Trees automatically become deeper, adding more split levels than before
    [CORRECT] Pruning grows more aggressive, since splits need larger gain to survive
    [ ] Leaf output magnitudes automatically grow larger across every tree built
- Q: During XGBoost's pruning phase, what must hold for a split to be kept in the tree?
    [ ] The split's computed gain must be smaller than the chosen learning rate.
    [ ] The split's computed gain must be added onto the total leaf weight.
    [CORRECT] The split's computed gain must be strictly greater than the gamma value.
    [ ] The split's computed gain must be exactly equal to the gamma value.
- Q: Conceptually, how does XGBoost use gamma when deciding whether to keep a split?
    [ ] It uses gamma to choose the model's initial prediction
    [CORRECT] It compares gain minus gamma against zero to decide pruning
    [ ] It adds gamma to each training label before fitting
    [ ] It sets gamma equal to the total number of trees built
- Q: In XGBoost tree pruning, what role does the gamma parameter play?
    [ ] It counts the number of training examples in each class
    [ ] It scales each tree's learning rate before adding it
    [CORRECT] It sets a minimum gain a split must exceed to be retained
    [ ] It converts raw leaf scores into class probabilities
- Q: Why does XGBoost prune trees bottom-up after growing them, rather than stopping a branch early when a split looks unhelpful?
    [ ] So the computed feature-importance scores stay consistent and stable.
    [ ] So the learning rate is applied consistently across every tree level.
    [ ] So the maximum-depth constraint is enforced strictly at each node.
    [CORRECT] So a beneficial split deeper in the tree is not discarded prematurely.
- Q: In the XGBoost objective, what is the primary role of the gamma parameter during tree construction?
    [ ] It smooths the Hessian values relied on during the split-finding step.
    [CORRECT] It penalizes complexity in proportion to the tree's total number of leaves.
    [ ] It normalizes the output weights assigned to each leaf of the tree.
    [ ] It rescales the loss-function gradients used when evaluating each split.
- Q: Conceptually, how does pruning via gamma differ from L2 regularization via the lambda parameter in XGBoost?
    [ ] Gamma governs the learning rate, while lambda governs feature selection.
    [CORRECT] Gamma governs structural complexity, while lambda governs leaf magnitude.
    [ ] Gamma governs feature selection, while lambda governs the learning rate.
    [ ] Gamma governs leaf magnitude, while lambda governs structural complexity.

### Tree Depth Constraints in XGBoost

- Q: How does limiting tree depth relate to regularization?
    [ ] It is equivalent to setting the parameter lambda to zero
    [ ] It has no bearing on whether the model overfits
    [ ] It acts as a direct replacement for the learning rate
    [CORRECT] It is one practical way to restrict the model's complexity
- Q: What does the max_depth parameter control about feature interactions modeled within a single XGBoost tree?
    [ ] It sets the maximum count of distinct features allowed in the whole model.
    [ ] It sets a floor on the variance explained by each individual split node.
    [CORRECT] It sets a ceiling on the order of feature interactions one tree can model.
    [ ] It sets the minimum importance weight assigned to every input feature.
- Q: How does limiting trees with max_depth differ from pruning splits via the gamma (min_split_loss) parameter in XGBoost?
    [CORRECT] It imposes a structural cap on path length regardless of any node's gain.
    [ ] It imposes a penalty on total leaf weight applied during the pruning step.
    [ ] It imposes a statistical cap on leaf purity regardless of any node's gain.
    [ ] It imposes a penalty on total leaf count applied during the pruning step.
- Q: When XGBoost builds trees under a strict depth limit, what effect does this have on how the second-order (gradient/Hessian) objective is optimized?
    [CORRECT] It blocks the model from partitioning the gradient space into fine regions.
    [ ] It blocks the model from computing any Hessian values at leaf nodes.
    [ ] It forces the model to favor training speed over predictive accuracy.
    [ ] It forces the model to drop the regularization terms while searching splits.
- Q: Which statement about tree depth in XGBoost is a misconception to avoid?
    [ ] Limiting tree depth is one way of controlling overall model complexity
    [CORRECT] Deeper trees are always better since they fit the training data closely
    [ ] Boosting can still work quite well even when using relatively small trees
    [ ] Restricting the maximum tree depth helps guard against severe overfitting
- Q: Why does XGBoost impose constraints on tree depth?
    [ ] To require that the model make use of every feature
    [ ] To remove residuals from the boosting process entirely
    [CORRECT] To control model complexity and reduce overfitting
    [ ] To turn a regression problem into a classification one
- Q: Why can a shallow tree still be useful within a boosting ensemble?
    [CORRECT] Many simple trees combine additively into a strong model
    [ ] Shallow trees disregard the residuals during training
    [ ] Boosting demands that each tree be grown to full depth
    [ ] A shallow tree is unable to contribute anything meaningful
- Q: If you decrease the max_depth parameter in an XGBoost model, holding predictive goals fixed, how does this typically change the optimal number of boosting rounds?
    [ ] Fewer boosting rounds are needed, since shallower trees capture less per round.
    [CORRECT] More boosting rounds are needed, since shallower trees capture less per round.
    [ ] More boosting rounds are needed, since shallower trees overfit each round.
    [ ] Fewer boosting rounds are needed, since deeper signal is already captured.
- Q: In bias-variance terms, how does constraining the depth of each tree primarily affect an XGBoost ensemble?
    [ ] It lowers each learner's variance but raises the ensemble's bias.
    [CORRECT] It raises each learner's bias but lowers the ensemble's variance.
    [ ] It raises each learner's variance but lowers the ensemble's bias.
    [ ] It lowers each learner's bias but raises the ensemble's variance.
- Q: What is the main effect of limiting how deep a tree can grow?
    [ ] It makes pruning the tree afterward impossible
    [CORRECT] It keeps trees from becoming arbitrarily complex
    [ ] It guarantees the training error will reach zero
    [ ] It removes the need to compute gain at each split

### Minimum Child Weight

- Q: How does min_child_weight use a node's cover when deciding whether a split is allowed?
    [ ] It ignores cover entirely and counts the raw rows in the child
    [CORRECT] It requires the cover of a child to clear a set threshold
    [ ] It forces the cover of a node to equal the regularization term $\lambda$
    [ ] It overrides the cover value and uses residual signs in its place
- Q: Why is $\text{min\_child\_weight}$ a useful hyperparameter to tune?
    [ ] It guarantees that every resulting leaf will be perfectly pure
    [ ] It removes any need to also tune the pruning value $\gamma$
    [CORRECT] It blocks leaves that rest on too little effective data
    [ ] It takes effect only once the model has finished its training
- Q: Which belief about min_child_weight is a misconception that should be avoided?
    [ ] It governs which of the candidate splits are permitted
    [ ] It acts as a regularization-style control over tree growth
    [ ] It depends on the cover quantity computed for a node
    [CORRECT] It refers to physical feature weights, not child support
- Q: What does the min_child_weight setting control in XGBoost?
    [CORRECT] The smallest cover a child node may have to be kept
    [ ] The exact maximum depth that is allowed for each tree
    [ ] The number of distinct classes present in the target
    [ ] The learning-rate value that is applied at each child node
- Q: Which modeling problem can a well-chosen min_child_weight help reduce?
    [ ] Underfitting from packing too many rows per leaf
    [ ] Class imbalance present in the training labels
    [CORRECT] Overfitting caused by tiny, unstable leaves
    [ ] Poor scaling among the numeric input features

### Learning Rate in XGBoost

- Q: What role does the learning rate play in XGBoost?
    [ ] It computes the similarity score per leaf
    [ ] It sets only the model's initial prediction
    [ ] It directly picks the optimal split point
    [CORRECT] It scales each new tree's output when added
- Q: Which symbol is conventionally used for the learning rate in XGBoost?
    [ ] Gamma
    [ ] Lambda
    [ ] Cover
    [CORRECT] Eta
- Q: What is the main trade-off of choosing a smaller learning rate in XGBoost?
    [ ] The model gives up its additive structure
    [CORRECT] More trees are needed for strong accuracy
    [ ] The leaf output values stop mattering at all
    [ ] The initial prediction is no longer required
- Q: Which statement about eta (the XGBoost learning rate) is a misconception to avoid?
    [CORRECT] It is a regularization penalty like lambda
    [ ] It is a step size for tree contributions
    [ ] It controls how fast the ensemble grows
    [ ] It scales the size of each tree's update

### XGBoost for Classification

- Q: Which setting is the most common entry point when first learning XGBoost classification?
    [CORRECT] Sorting examples into two categories, like yes versus no
    [ ] Estimating the variance of a Gaussian distribution from data
    [ ] Predicting a continuous drug dosage amount for each patient
    [ ] Selecting the number of clusters K that best fits the data
- Q: In an XGBoost binary classifier, the raw output is a sum of leaf values across all trees. How is this raw score converted into a final class probability?
    [ ] It is divided by the standard deviation of the current loss.
    [ ] It is passed through a ReLU to clip away any negative values.
    [CORRECT] It is passed through a sigmoid to map it into the range (0, 1).
    [ ] It is divided by the total tree count to average the class weights.
- Q: During tree construction, XGBoost uses the second-order derivative (Hessian) of the loss in addition to the gradient. What does the Hessian provide?
    [ ] A pruning signal that drops branches not aiding accuracy.
    [CORRECT] A second-order approximation used to set optimal leaf weights.
    [ ] A variance penalty that removes high-error training samples.
    [ ] A speedup that cuts the number of splits needed per tree.
- Q: How does XGBoost classification relate to XGBoost regression?
    [ ] It is the very same method but skips all regularization terms
    [ ] It belongs to an entirely separate family of algorithms
    [ ] It drops decision trees in favor of a single linear model
    [CORRECT] It keeps the boosting idea but adapts the loss to probabilities
- Q: In the XGBoost split-gain formula, how does the complexity parameter gamma affect the growth of a classification tree?
    [ ] It adds a fixed penalty on the sum of squared leaf weights.
    [ ] It sets the maximum depth allowed for any single tree.
    [CORRECT] It sets the minimum gain a split must exceed to be kept.
    [ ] It acts as a learning-rate multiplier that curbs overfitting.
- Q: Which scikit-learn-style class does the XGBoost library provide for classification?
    [ ] SupportVectorBoost
    [CORRECT] XGBClassifier
    [ ] LinearClassifierTree
    [ ] KMeansClassifier
- Q: How does XGBoost's structure change when moving from binary classification to multi-class classification?
    [ ] It swaps logistic loss for a multi-dimensional exponential loss.
    [CORRECT] It builds one tree per class on each boosting iteration.
    [ ] It builds one tree per forest to get a joint probability.
    [ ] It swaps gradient descent for a genetic-algorithm search.
- Q: Which statement about XGBoost classification is a misconception that should be avoided?
    [ ] Probability-based loss formulas play a role in the method
    [ ] It builds boosted decision trees in order to classify data
    [ ] XGBoost provides a dedicated variant meant for classification
    [CORRECT] XGBoost handles only regression and cannot classify
- Q: What task is XGBoost for classification designed to perform?
    [ ] Finding the nearest neighbors for each incoming query point
    [ ] Estimating a single continuous numeric target value only
    [ ] Grouping unlabeled examples into clusters that it discovers
    [CORRECT] Predicting class probabilities or labels with boosted trees
- Q: When training an XGBoost classifier on a heavily imbalanced dataset, what does the scale_pos_weight hyperparameter primarily do?
    [ ] It lowers the learning rate applied to the majority class only.
    [CORRECT] It scales the positive class's gradients to balance class influence.
    [ ] It deepens the trees so the minority class is captured fully.
    [ ] It drops majority class samples until the class ratio is equal.

### Similarity Score for Classification Trees

- Q: What stays the same between the regression and classification similarity scores in XGBoost?
    [CORRECT] The numerator is still the squared sum of the residuals
    [ ] The lambda regularization term disappears completely
    [ ] Gain is no longer derived from similarity scores
    [ ] Leaf outputs are no longer numeric values
- Q: Why does the classification similarity-score denominator depend on the predicted probabilities?
    [CORRECT] Because the loss curvature depends on the current probability estimates
    [ ] Because the model must count classes instead of examples
    [ ] Because the predicted probabilities are identical in every round
    [ ] Because leaf cover has no relationship to the predictions


(54 further questions omitted from this pack for length; the topics above are complete.)
