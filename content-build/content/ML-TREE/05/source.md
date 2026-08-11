# SOURCE PACK — Machine Learning / Tree-Based Models / Decision Trees

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Decision Trees   (5 questions)
2. Root Nodes, Internal Nodes, and Leaf Nodes   (5 questions)
3. Recursive Tree Growth   (5 questions)
4. Classification Trees vs. Regression Trees   (5 questions)
5. How Classification Trees Make Decisions   (5 questions)
6. Leaf Output as Majority Class   (5 questions)
7. Gini Impurity   (5 questions)
8. Weighted Gini Impurity for Splits   (5 questions)
9. Choosing the Best Split in a Classification Tree   (5 questions)
10. Handling Numeric Features in Decision Trees   (5 questions)
11. Threshold Selection for Continuous Variables   (5 questions)
12. Regression Trees   (5 questions)
13. Leaves as Numeric Predictions   (5 questions)
14. Regression Tree Predictions as Leaf Averages   (5 questions)
15. Sum of Squared Residuals for Split Selection   (5 questions)
16. Choosing the Best Split in a Regression Tree   (5 questions)
17. Building Regression Trees with Multiple Predictors   (5 questions)
18. Automatic Feature Selection in Trees   (5 questions)
19. Missing Data Strategies for Trees   (5 questions)
20. Bias-Variance Tradeoff in Regression Trees   (5 questions)
21. Overfitting in Decision Trees   (5 questions)
22. Limiting Tree Growth   (5 questions)
23. Minimum Samples per Leaf / Node   (5 questions)
24. Pruning in Decision Trees   (5 questions)
25. Cost Complexity Pruning   (5 questions)
26. Tree Complexity Penalty   (5 questions)
27. Alpha as the Pruning Hyperparameter   (5 questions)
28. Using Cross-Validation to Choose Alpha   (5 questions)
29. Selecting the Final Pruned Tree   (5 questions)

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
- XGBoost vs. Gradient Boosting
- XGBoost Objective Function: Loss Plus Regularization
- Second-Order Taylor Approximation with Gradients (G) and Hessians (H)
- Residuals in XGBoost
- XGBoost for Regression
- Similarity Score
- Gain in XGBoost
- Output Values for XGBoost Leaves
- Initial Prediction in XGBoost
- Sequential Residual Correction in XGBoost
- Additive Tree-Based Prediction in XGBoost
- How Lambda Shrinks Similarity Scores
- How Lambda Shrinks Leaf Output Values
- Pruning with Gamma
- Tree Depth Constraints in XGBoost
- Minimum Child Weight
- Learning Rate in XGBoost
- XGBoost for Classification
- Similarity Score for Classification Trees
- Cover in XGBoost
- Gain for Classification Splits
- Leaf Output Formula for Classification
- Converting Log-Odds to Probability
- Approximate Greedy Algorithm for Split Finding
- Quantiles as Candidate Split Thresholds
- Weighted Quantile Sketch
- Parallel Learning and Sketch Algorithms for Large Data

## The live quiz bank for these topics — 145 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Decision Trees

- Q: What makes decision trees conceptually appealing?
    [ ] They need absolutely no training data whatsoever in order to make predictions
    [CORRECT] They can be followed directly as a clear series of if-then style decisions
    [ ] They are mathematically guaranteed to be the single most accurate model around
    [ ] They are narrowly applicable only to raw image inputs and nothing else at all
- Q: Which statement about decision trees is a misconception to avoid?
    [CORRECT] They are usable only for regression, not for classification
    [ ] They handle classification by branching on feature values
    [ ] They have both a root node and leaf nodes
    [ ] They make predictions by traversing a path from root to leaf
- Q: What is the single topmost node of a decision tree called?
    [ ] The support node
    [ ] The loss node
    [CORRECT] The root node
    [ ] The margin node
- Q: What are the terminal prediction nodes at the bottom of a decision tree called?
    [ ] Support vectors
    [ ] Hyperplanes
    [CORRECT] Leaf nodes
    [ ] Hidden units
- Q: What best describes a decision tree?
    [ ] A margin-based classifier that fundamentally relies on a fixed kernel function
    [ ] A clustering algorithm that assigns each given data point to some centroid
    [CORRECT] A model making a sequence of feature-based decisions to reach a prediction
    [ ] A model that simply averages together all of the available input features

### Root Nodes, Internal Nodes, and Leaf Nodes

- Q: What is the role of a leaf node in a decision tree?
    [CORRECT] It produces the final prediction
    [ ] It rescales the incoming feature values
    [ ] It computes information gain for other nodes
    [ ] It poses another feature-split question
- Q: What is the function of an internal node in a decision tree?
    [CORRECT] It tests a feature and routes the example down one chosen branch
    [ ] It stores only the final prediction value for that whole branch
    [ ] It holds the loss value that is computed and used during training
    [ ] It averages together all of the input features at that tree depth
- Q: What is the single topmost node in a decision tree called?
    [ ] The support node
    [ ] The margin node
    [ ] The entropy node
    [CORRECT] The root node
- Q: Which statement about decision tree node terminology is a misconception to avoid?
    [ ] Internal nodes split examples using feature tests
    [CORRECT] All nodes serve one identical role, not distinct ones
    [ ] The root node always sits at the very top of the tree
    [ ] Leaf nodes generate the tree's final predictions
- Q: Why are leaf nodes considered terminal nodes?
    [ ] Because they never make use of any features
    [CORRECT] Because no further splits occur below them
    [ ] Because they always contain perfectly pure labels
    [ ] Because they are always removed during pruning

### Recursive Tree Growth

- Q: Why is recursion a natural fit for building decision trees?
    [ ] Recursion guarantees perfect training classification
    [CORRECT] Each split yields subproblems on smaller subsets of the data
    [ ] Only numeric features can be processed recursively
    [ ] Every tree is constrained to exactly two levels
- Q: When does recursive tree growth stop at a given node?
    [ ] Only once the root node has become completely pure
    [ ] After exactly three levels have formed in each one case
    [ ] As soon as each available feature has been used once
    [CORRECT] When a stopping criterion says not to split that node
- Q: Which statement about recursive tree growth is correct?
    [CORRECT] Every split, not just the root, is chosen from its own subset's data
    [ ] Subtrees ignore their local data and reuse the root's split
    [ ] Only the root split is data-driven; later splits are fixed in advance
    [ ] Stopping criteria play no role in where growth ends
- Q: After the root split is made, how is each resulting child subset handled?
    [ ] By replacing its labels with probabilities only
    [CORRECT] As a smaller tree-building problem of the same kind
    [ ] By halting the algorithm right away
    [ ] By averaging its features into a single new feature
- Q: Why is decision-tree growth described as recursive?
    [ ] Every training example is copied into all of the branches
    [ ] The whole tree is built from the leaves up to the root
    [CORRECT] The same split-selection step is reapplied to each subset
    [ ] Recursion here refers to pruning the already-finished tree

### Classification Trees vs. Regression Trees

- Q: Which statement about classification and regression trees is a misconception to avoid?
    [ ] Classification trees are the variant that predicts categorical labels
    [CORRECT] They differ in every mechanism rather than sharing branching structure
    [ ] Both of them ultimately make their splits based on raw feature values
    [ ] Regression trees are the variant that predicts continuous numeric values
- Q: What does a classification tree typically output at a leaf?
    [ ] A Gaussian probability density value
    [CORRECT] A discrete class such as cat or not cat
    [ ] A continuous average of the target values
    [ ] A kernel-based similarity score
- Q: What is the main difference between a classification tree and a regression tree?
    [CORRECT] A classification tree predicts categories while a regression tree predicts numbers
    [ ] A classification tree uses input features whereas a regression tree does not use any
    [ ] A classification tree contains leaf nodes whereas a regression tree has none at all
    [ ] A classification tree is fully supervised whereas a regression tree is unsupervised
- Q: What does a regression tree typically output at a leaf?
    [ ] A support vector that defines the splitting boundary
    [CORRECT] A numeric prediction such as an average target value
    [ ] A single discrete class label drawn from a fixed set
    [ ] A learned coefficient used for rescaling each feature
- Q: Why are both classification trees and regression trees called decision trees despite differing outputs?
    [CORRECT] Both split the data recursively using feature-based decision rules
    [ ] Both are strictly required to use Gini impurity to choose their splits
    [ ] Both fundamentally depend on an underlying kernel function to operate
    [ ] Both can only ever predict simple binary outputs at their leaf nodes

### How Classification Trees Make Decisions

- Q: Why are classification trees often described as interpretable models?
    [ ] They are structurally incapable of overfitting data
    [ ] They are guaranteed to reach the highest accuracy
    [CORRECT] Each prediction traces a readable path of decisions
    [ ] They make every prediction using a single feature
- Q: Which statement about how a classification tree decides is a misconception to avoid?
    [CORRECT] A prediction is computed as one global formula over the inputs
    [ ] Reaching a leaf yields the class label stored at that leaf
    [ ] A prediction is a sequence of local yes-or-no test outcomes
    [ ] Each internal node applies a test to a single feature value
- Q: What does a classification tree do once an example arrives at a leaf node?
    [CORRECT] It returns the class label stored at that leaf
    [ ] It grows an extra branch beneath that leaf
    [ ] It restarts the traversal from the root node
    [ ] It re-normalizes the feature values once more
- Q: How does a trained classification tree produce a prediction for a single new example?
    [ ] It runs gradient descent on the example at test time
    [ ] It averages the labels of all examples in the training set
    [ ] It assigns the class of the nearest training centroid
    [CORRECT] It follows split decisions from the root down to a leaf
- Q: At an internal node of a classification tree, what decides whether an example is sent to the left or right child?
    [ ] The model's overall accuracy on the training set
    [ ] The order in which the examples were loaded
    [CORRECT] The outcome of that node's test on a feature value
    [ ] The total number of distinct classes present

### Leaf Output as Majority Class

- Q: Why can two different leaves of the same tree predict the same class?
    [ ] Each class is allowed to appear within only a single leaf
    [ ] Majority voting is performed only once at the root node
    [ ] The tree accidentally duplicates labels across its leaves
    [CORRECT] Separate feature-space regions can share a majority label
- Q: In a classification tree, what is typically stored as the prediction at a leaf?
    [ ] The averaged feature vector of the examples at that leaf
    [ ] The full decision path from that leaf back up to the root
    [ ] Only the computed impurity score belonging to that leaf
    [CORRECT] The majority class of training examples reaching the leaf
- Q: What prediction does a terminal leaf give when it still contains mixed classes?
    [CORRECT] It outputs the majority class among that leaf's examples
    [ ] It becomes unable to output any class prediction at all
    [ ] It must first be converted into a regression-style leaf
    [ ] It is deleted from the tree automatically during training
- Q: Which statement about leaf outputs in a classification tree is correct?
    [ ] Only pure leaves are permitted to be terminal
    [ ] A leaf's impurity equals its predicted class label
    [CORRECT] An impure leaf can still predict via its majority class
    [ ] A leaf must be perfectly pure before it can predict a class
- Q: Why is the majority class used as a leaf's prediction?
    [ ] It removes the need for labels during training
    [ ] It applies only when the leaf is perfectly pure
    [CORRECT] It matches the prediction to the region's most common label
    [ ] It guarantees zero error on every training example

### Gini Impurity

- Q: What does Gini impurity measure for a node in a classification tree?
    [CORRECT] How mixed the class labels are among that node's examples
    [ ] How many branches descend from that node in the tree
    [ ] The total count of examples present in the whole dataset
    [ ] The average value of a feature across that node's examples
- Q: Why does a node with a mix of class labels count as more impure?
    [ ] It is structurally unable to be split any further
    [ ] It necessarily holds fewer examples than a pure node
    [CORRECT] Its class membership is a less certain blend of labels
    [ ] Its feature values for those examples are missing
- Q: Which belief about Gini impurity is a misconception to avoid?
    [ ] Candidate splits are scored using the impurity of children
    [CORRECT] It directly reports a node's prediction accuracy, not label mix
    [ ] A node mixing several classes carries higher impurity
    [ ] A node of a single class has impurity at its minimum value
- Q: How is Gini impurity used while a classification tree is being built?
    [ ] To set the learning rate used for updating the model
    [CORRECT] To score how well a candidate split yields purer children
    [ ] To directly output the predicted class at each leaf node
    [ ] To overwrite the training labels during the fitting step
- Q: Under what condition is a node's Gini impurity at its lowest value?
    [ ] When the split at the node uses a numeric threshold
    [ ] When the node holds as many examples as possible
    [CORRECT] When all of the node's examples share one single class
    [ ] When the tree containing the node has many levels

### Weighted Gini Impurity for Splits

- Q: A split yields one tiny but perfectly pure child and one large impure child. What does size weighting help prevent?
    [CORRECT] Overrating the split just for its tiny pure branch
    [ ] The use of continuous features when splitting
    [ ] The later pruning of branches from the tree
    [ ] The creation of any leaf nodes within the tree
- Q: Why is it not enough to judge a split by the purity of just one of its child nodes?
    [ ] The impurity of the parent node never changes after a split
    [ ] One of the two children produced by a split is always empty
    [CORRECT] A split's quality depends on both children and their sizes
    [ ] Only the right child of a split affects the prediction made
- Q: Why is the impurity after a split computed as a weighted average over the child nodes rather than a plain average?
    [ ] Weighted averaging is only ever meaningful for regression trees
    [ ] Weighting the children removes any need for the class labels
    [ ] Every child must contribute equally regardless of how many it holds
    [CORRECT] The children may hold different counts and should count proportionally
- Q: Under weighted Gini impurity, what makes a candidate split attractive?
    [ ] It produces the largest possible number of child branches
    [ ] It increases the overall depth of the resulting tree most
    [CORRECT] Its children are fairly pure once weighted by their sizes
    [ ] It always splits on the feature having the most categories
- Q: Which statement about evaluating a split is a misconception to avoid?
    [CORRECT] A split can be scored well while ignoring its child node sizes
    [ ] Split quality is judged by comparing it against alternatives
    [ ] Weighted impurity reflects both child purity and child sizes
    [ ] Both child nodes of a split bear on that split's quality

### Choosing the Best Split in a Classification Tree

- Q: What broader benefit can a strong split near the top of a tree provide?
    [ ] It guarantees the finished tree will never overfit the data
    [ ] It removes any need to prune the tree after it is built
    [ ] It makes every leaf in the tree perfectly pure on its own
    [CORRECT] It separates the data into subsets that ease later splits
- Q: Why is choosing a split considered a local decision during tree building?
    [ ] Local choices are made only when building regression trees
    [CORRECT] Each node weighs only the data subset that reached it
    [ ] The whole dataset is disregarded after the root split
    [ ] The tree is built all at once from the leaves upward
- Q: How does a classification tree pick the best split to use at a given node?
    [ ] It maximizes the count of leaf nodes created right away
    [ ] It always uses the feature listed first in the dataset
    [CORRECT] It takes the split that reduces impurity most among candidates
    [ ] It picks the feature holding the largest raw numeric value
- Q: Which belief about choosing the best split is a misconception to avoid?
    [ ] The data subset reaching the current node drives the choice
    [ ] The best split depends on the data, so it varies by node
    [ ] Several candidate features are compared before one is chosen
    [CORRECT] The best split is fixed by feature name or order, not impurity
- Q: When candidate splits at a node are compared, what quantity is actually being weighed?
    [ ] Only the finished tree's accuracy on the training set
    [ ] The number of missing values present in the dataset
    [CORRECT] How pure the resulting children are under each split
    [ ] Only the impurity of the parent node before splitting

### Handling Numeric Features in Decision Trees

- Q: Why does splitting on a numeric feature require selecting a specific threshold?
    [ ] Each numeric feature admits exactly one valid split point
    [ ] Numeric features are otherwise unusable inside any tree
    [CORRECT] Many distinct cutoffs can divide the values into branches
    [ ] Thresholds are relevant only when building regression trees
- Q: In what way is a numeric (threshold) split like a categorical split?
    [ ] Both stop producing predictions at the leaves
    [ ] Both avoid using any impurity measure
    [CORRECT] Both route examples down branches using a feature test
    [ ] Both always create more than two branches
- Q: What form does a split on a numeric feature $x$ typically take at a node?
    [ ] A test that drops the feature from the node
    [ ] A request for the exact mean of that column
    [ ] A simultaneous comparison against every training point
    [CORRECT] A yes/no test of the form "is $x \le t$?" for some threshold $t$
- Q: How can a decision tree split on a continuous-valued (numeric) feature?
    [ ] Require a separate kernel function for each feature
    [ ] Treat numeric features as unusable for any splitting
    [CORRECT] Choose a threshold and route examples left or right
    [ ] Convert each numeric value into a class label first
- Q: Which statement about numeric features in decision trees is correct?
    [ ] Trees can only split on categorical features
    [ ] Numeric features must be discretized before any tree can use them
    [CORRECT] Trees handle continuous features directly via threshold tests
    [ ] A numeric split can never be binary

### Threshold Selection for Continuous Variables

- Q: Why are midpoints between consecutive sorted values used as candidate thresholds?
    [ ] They let the node skip the impurity computation
    [ ] They force the threshold to equal an observed data point
    [CORRECT] They mark the only points where branch membership can change
    [ ] They reliably maximize the tree's eventual depth
- Q: How is the threshold for a continuous feature chosen at a decision-tree node?
    [CORRECT] Test candidate cutoffs and keep the best impurity reduction
    [ ] Always set it to the feature's median value across the node
    [ ] Pick a random value once and never reconsider that choice
    [ ] Always fix it at zero regardless of the data distribution
- Q: When comparing candidate thresholds for one feature, which threshold is selected?
    [ ] The one written using the fewest decimal places of all
    [ ] The one lying closest to the dataset's overall global mean
    [CORRECT] The one giving the best split quality on this node's data
    [ ] The one having the smallest numeric value among candidates
- Q: Which statement about choosing a threshold for a continuous feature is correct?
    [CORRECT] Candidate cutoffs must be scored by split quality, not assumed equal
    [ ] Split quality is irrelevant to which threshold is chosen
    [ ] Any reasonable cutoff performs equally well without scoring
    [ ] The threshold should be fixed before seeing the node's data
- Q: What are the usual candidate thresholds for a continuous feature?
    [ ] Only the integer values within the feature's range
    [ ] Only the smallest observed value of the feature
    [ ] Only the largest observed value of the feature
    [CORRECT] Values lying between consecutive sorted feature values

### Regression Trees

- Q: Compared with a classification tree, what changes at the leaves of a regression tree?
    [CORRECT] Leaves output numeric values, not class labels
    [ ] Leaves are removed from the structure
    [ ] Leaves emit kernel scores, not outputs
    [ ] Leaves must each hold one example
- Q: Which belief about regression trees is a misconception that should be avoided?
    [ ] The branching idea still applies to numeric targets
    [ ] Trees can be adapted to produce numeric outputs
    [ ] Leaf predictions differ in the regression setting
    [CORRECT] Decision trees can only classify, never predict numbers
- Q: In what way does a regression tree still resemble a classification tree?
    [ ] It still always requires explicit class labels in order to train
    [CORRECT] It splits on features and routes examples through the tree
    [ ] It has no leaf nodes located anywhere within its structure
    [ ] It is fundamentally unable to accept any categorical features
- Q: What kind of output is a regression tree designed to predict?
    [ ] A single discrete category
    [ ] An assigned cluster index
    [ ] A classifier's margin width
    [CORRECT] A continuous numeric target value
- Q: Why might a regression tree be preferable to fitting a single straight line?
    [ ] It requires no training data at all in order to be fit
    [CORRECT] It fits piecewise patterns, giving regions distinct predictions
    [ ] It reframes the regression problem as a classification task instead
    [ ] It always attains the lowest possible bias of any model whatsoever

### Leaves as Numeric Predictions

- Q: In a regression tree, what is stored at each leaf node?
    [ ] A class label such as cat or not-cat
    [ ] A kernel similarity score
    [ ] A count of support vectors
    [CORRECT] A single numeric prediction value
- Q: Which belief about regression-tree leaves is a misconception that should be avoided?
    [ ] Path-dependent prediction still occurs in regression
    [CORRECT] Leaves store only classes and cannot hold numbers
    [ ] Leaves can hold numeric values, not just labels
    [ ] The tree's branching structure still matters
- Q: Why does storing a numeric value at each leaf make a regression tree a piecewise model?
    [ ] Leaves exist only while the tree is training and then vanish afterward
    [ ] The fitted model behaves as one straight line across all of the inputs
    [CORRECT] Different leaves give different constants to different input regions
    [ ] Every leaf in the tree is required to predict the exact same number
- Q: Why is it valid for a regression-tree leaf to output just one number?
    [ ] Regression trees ignore the training targets when predicting
    [ ] By that depth the tree has stopped consulting any features
    [ ] A numeric output must stay constant across all of the data
    [CORRECT] Examples reaching that leaf are summarized by one prediction
- Q: How does a regression tree produce a prediction for a new example?
    [ ] It returns the global mean target regardless of the path taken
    [ ] It averages the new example against all stored training points
    [ ] It outputs the parent node's variance as the predicted value
    [CORRECT] It follows the splits to a leaf and returns that leaf's value

### Regression Tree Predictions as Leaf Averages

- Q: If a leaf ends up containing only one training example, what is its prediction?
    [ ] The global mean of all targets
    [CORRECT] Simply that single example's target value
    [ ] Undefined, so it makes no prediction
    [ ] Invalid, so the leaf must be pruned
- Q: Which belief about regression-tree predictions is a misconception that should be avoided?
    [ ] Averaging the targets in a region is a common rule for leaves
    [CORRECT] Each leaf fits a fitted formula rather than often just an average
    [ ] Routing through the splits decides which leaf's value is used
    [ ] Different leaves of the same tree can predict different constants
- Q: How is the prediction at a regression-tree leaf most commonly chosen?
    [ ] By using the median class label in it
    [ ] By fitting a regression line within the leaf
    [CORRECT] By averaging the targets of the training examples in it
    [ ] By taking only the maximum target value present
- Q: Why is the mean target a sensible value to predict at a leaf?
    [CORRECT] It represents that region's targets with one central number
    [ ] It guarantees a residual of exactly zero for each example
    [ ] It is valid only when the output variable is strictly binary
    [ ] It discards the training targets within that region entirely
- Q: Why do different leaves of a regression tree often predict different values?
    [ ] Because every leaf is forced to hold an equal number of examples
    [ ] Because the leaf averages are fixed in advance before any training
    [ ] Because each leaf's output value is assigned uniformly at random
    [CORRECT] Because their regions hold examples with different average targets

### Sum of Squared Residuals for Split Selection

- Q: What makes squared residuals a sensible quantity to minimize when splitting a regression tree?
    [CORRECT] They reward splits whose leaves give accurate numeric predictions
    [ ] They apply only to neural networks, not to trees
    [ ] They convert the regression task into a classification task
    [ ] They let the tree split without using the target values
- Q: When measuring fit for a regression-tree split, why are residuals squared rather than left as raw differences?
    [ ] Squaring forces each leaf to contain a single class
    [CORRECT] Squaring penalizes large errors more and is easy to optimize
    [ ] Squaring makes every error positive and exactly equal
    [ ] Squaring lets the split ignore the target values
- Q: When deciding which split to make at a node of a regression tree, which quantity is the standard criterion to minimize?
    [CORRECT] The sum of squared residuals within the child nodes
    [ ] The Gini impurity of the labels at the node
    [ ] The margin to the nearest training point
    [ ] The Shannon entropy of the label distribution
- Q: Which belief about the split criterion for a regression tree is a misconception to avoid?
    [ ] That the quality of a split depends on the target values
    [CORRECT] That Gini impurity is the natural objective for numeric targets
    [ ] That residual-based error is a natural objective for regression
    [ ] That a lower sum of squared residuals means a better split
- Q: A candidate split lowers the total sum of squared residuals compared with the parent node. What does this tell you?
    [ ] The resulting tree now uses more input features
    [CORRECT] The child regions' leaf values fit their targets better
    [ ] The split makes the tree easier to interpret
    [ ] The model has switched to unsupervised learning

### Choosing the Best Split in a Regression Tree

- Q: Which belief about how a regression tree picks its splits is a misconception to avoid?
    [ ] That fit to the numeric target is what scores each split
    [CORRECT] That the best split is found without using the target values
    [ ] That several candidate splits are compared at each node
    [ ] That how well leaves fit the targets drives the choice
- Q: Why do the numeric target values y enter directly into split selection for a regression tree?
    [CORRECT] Because a split is scored by how well it predicts those targets
    [ ] Because only the root node is allowed to look at y
    [ ] Because y is added to the inputs and used as a feature
    [ ] Because regression trees split without looking at the inputs
- Q: In classification trees a good split produces purer child nodes. What is the analogous goal for a regression-tree split?
    [ ] Child nodes that each hold as many examples as possible
    [CORRECT] Child nodes whose target values a single leaf value fits well
    [ ] Child nodes that together use as many features as possible
    [ ] Child nodes holding exactly equal numbers of examples
- Q: At a node of a regression tree, how is the best split among the candidates selected?
    [CORRECT] By picking the split that most reduces error, e.g. squared residuals
    [ ] By picking whatever split makes the tree deepest right away
    [ ] By picking the feature that has the most distinct categories
    [ ] By always reusing the same feature that was used at the root
- Q: After the best split at a node has been chosen, how does building the regression tree proceed?
    [ ] The numeric targets are first binned into discrete categories
    [CORRECT] The same split-selection step is repeated on each child subset
    [ ] Building stops, since a regression tree allows only one split
    [ ] The feature values are discarded before any further splitting

### Building Regression Trees with Multiple Predictors

- Q: When several predictors are available, how does a node decide which feature to split on?
    [ ] It cycles through the predictors in alphabetical order
    [ ] It reuses the same feature that the parent node split on
    [ ] It always splits on the feature with the largest mean value
    [CORRECT] It compares splits across features and takes the best error drop
- Q: Why is it useful that a regression tree can split on different predictors at different nodes?
    [CORRECT] Different predictors can be informative in different regions
    [ ] It guarantees the resulting tree will be perfectly balanced
    [ ] It lets the tree be built without using the target values
    [ ] It makes every predictor contribute equally at every node
- Q: Which belief about how a regression tree uses several predictors is a misconception to avoid?
    [ ] That a tree can vary which feature it uses by region
    [CORRECT] That a tree merges predictors via one global linear formula
    [ ] That each split is chosen locally and from the data
    [ ] That different branches may split on different features
- Q: After one feature is chosen to split a node, what is true of the rest of the tree?
    [CORRECT] Deeper nodes may still split on other features if they help
    [ ] The numeric target must be rescaled before continuing
    [ ] All of the remaining predictors are discarded outright
    [ ] The entire tree is now locked to that one feature
- Q: Given several input predictors, how does a regression tree make use of them?
    [ ] It must commit to one predictor for the whole tree
    [ ] It works only when there are exactly two predictors
    [ ] It averages all predictors into one before any split
    [CORRECT] It may split on different features at different nodes

### Automatic Feature Selection in Trees

- Q: Why is a tree's ability to ignore unhelpful features convenient in practice?
    [ ] It entirely removes any need to preprocess the input data beforehand
    [ ] It means that careful feature engineering can simply never matter at all
    [ ] It makes the resulting tree absolutely guaranteed to be interpretable
    [CORRECT] It can focus on informative features without needing every one to help
- Q: What typically happens to an uninformative feature when a decision tree is trained?
    [ ] It is averaged into the choice at every split
    [CORRECT] It may simply never get chosen for any split
    [ ] It becomes the predicted value at a leaf
    [ ] It is automatically placed at the root node
- Q: Why are decision trees often said to perform automatic feature selection?
    [ ] They are limited to using just one feature across the whole tree
    [ ] They delete every unused column from the data before training
    [ ] They demand that manual feature selection be completed first
    [CORRECT] They split on the most useful features and can ignore the rest
- Q: When a tree chooses which feature to split on at a node, what is that choice based on?
    [ ] The alphabetical order of the feature's column name
    [CORRECT] How much the feature improves split quality at the current node
    [ ] The physical units in which the feature is measured
    [ ] How often the feature is mentioned in the data's documentation
- Q: Which belief about automatic feature selection in trees is a misconception to avoid?
    [CORRECT] That the tree ranks features globally once and never reevaluates
    [ ] That some available features may end up never being used at all
    [ ] That different features may be considered at different tree nodes
    [ ] That a feature's usefulness depends on the data reaching a node

### Missing Data Strategies for Trees

- Q: When a categorical feature value is missing for a training example in a decision tree, what is one simple imputation strategy?
    [CORRECT] Fill it in with the most common category
    [ ] Always flag the row as anomalous
    [ ] Discard the entire training dataset
    [ ] Replace it with the leaf's class prediction
- Q: How might a missing numeric feature value be handled when fitting a decision tree?
    [ ] Convert the affected example into a single support vector
    [ ] Automatically prune the entire branch that the example reaches
    [CORRECT] Impute it with the mean, median, or a correlated predictor
    [ ] Create a brand-new dedicated class label specifically for it
- Q: Beyond filling a missing categorical value with the most frequent category, what is a more informed imputation idea?
    [ ] Randomly draw a category each split
    [ ] Drop every row that has no missing values
    [ ] Force its value to zero everywhere
    [CORRECT] Use a correlated feature to infer its likely value
- Q: Why do strategies for handling missing values matter when fitting decision trees?
    [ ] Missing values only ever affect the very first root split
    [ ] Missing entries effectively reduce the task to plain clustering
    [ ] Trees simply cannot otherwise be trained on the given data
    [CORRECT] A split still needs usable values or a practical fallback rule
- Q: Which belief about missing data in decision trees is a misconception that should be avoided?
    [ ] Numeric and categorical gaps may be handled in different ways
    [ ] Correlated features can guide imputation of a gap
    [CORRECT] Rows with any missing value must always be discarded outright
    [ ] Several imputation strategies are available to choose from

### Bias-Variance Tradeoff in Regression Trees

- Q: Why does a very shallow regression tree tend to have high bias?
    [CORRECT] It may be too simple to capture real structure in y
    [ ] It relies on far too many input predictors at once
    [ ] It contains too many leaves to summarize cleanly
    [ ] It always overfits whatever training set it is given
- Q: Why does a very deep regression tree tend to have high variance?
    [ ] It always just predicts the global mean of the target
    [CORRECT] It can fit training-data quirks that do not generalize
    [ ] It throws away the training data and never uses it
    [ ] It is unable to handle numeric input features at all
- Q: How does the depth of a regression tree relate to the bias-variance tradeoff?
    [CORRECT] Greater depth can lower bias but raise variance
    [ ] Greater depth always lowers both bias and variance
    [ ] Depth only changes how long training takes to run
    [ ] Depth matters for classification trees but not regression
- Q: Which belief about the complexity of a regression tree is a misconception to avoid?
    [ ] That very shallow trees are prone to underfitting the data
    [ ] That very deep trees are prone to overfitting the data
    [ ] That good generalization comes from balancing bias and variance
    [CORRECT] That the deepest tree is best since it minimizes train error
- Q: Why is a validation set useful when choosing the complexity of a regression tree?
    [ ] It guarantees the tree will reach zero error on test data
    [ ] It removes any need to prune the tree afterward
    [ ] It makes the depth of the tree completely irrelevant
    [CORRECT] It helps pick a size that balances fit and generalization

### Overfitting in Decision Trees

- Q: Why are decision trees especially prone to overfitting if left unconstrained?
    [ ] They are restricted to using only a single chosen input feature
    [ ] They are mathematically unable to produce pure leaf nodes
    [CORRECT] They keep splitting until the leaves capture training noise
    [ ] They systematically underfit whenever the dataset is small
- Q: Which property of the training data most directly drives a tree toward overfitting?
    [ ] The dataset containing exactly two target classes
    [CORRECT] Random noise and accidental patterns in the examples
    [ ] The use of categorical features instead of numeric
    [ ] The presence of both root nodes and leaf nodes in it
- Q: What does it mean to say a decision tree has overfit the data?
    [ ] It always predicts whichever class is most frequent
    [ ] It uses numeric rather than categorical input features
    [ ] It has too few branches to capture the training set
    [CORRECT] It performs well on training data but poorly on new data
- Q: Which belief about making a decision tree larger is a misconception to avoid?
    [ ] That a sufficiently deep tree is capable of overfitting
    [ ] That generalization can worsen even as training fit improves
    [CORRECT] That a deeper tree is always better since it lowers training error
    [ ] That controlling tree complexity is worth doing in practice
- Q: Why can growing a decision tree to a very large depth be risky?
    [ ] Deep trees force every split node to be strictly binary
    [ ] Deep trees can no longer assign predictions at their leaves
    [CORRECT] Deep trees may memorize training patterns that fail to generalize
    [ ] Deep trees stop using impurity measures to choose splits

### Limiting Tree Growth

- Q: Which of the following is a valid way to limit a decision tree's growth?
    [CORRECT] Require a minimum number of examples in a node before splitting
    [ ] Keep splitting until each leaf contains a single example
    [ ] Strip all thresholds away from the numeric features
    [ ] Swap the impurity measure out for a kernel function
- Q: Why might you deliberately limit how far a decision tree grows during training?
    [ ] To turn a classification tree into a regression tree
    [ ] To force every leaf node to remain impure
    [ ] To stop the model from using any input features
    [CORRECT] To reduce overfitting by preventing an overly complex tree
- Q: Why can limiting a tree's growth improve how well it generalizes?
    [ ] It automatically increases the number of available features
    [ ] It makes the tree fit the training set perfectly
    [ ] It guarantees that every resulting split is pure
    [CORRECT] It keeps the tree from chasing tiny details that may be noise
- Q: What trade-off typically comes with limiting a decision tree's growth?
    [ ] The model gets converted into an unsupervised learning method
    [ ] The tree invariably grows even more complex than it ever was before
    [ ] The tree completely loses its ability to make any predictions
    [CORRECT] It fits the training data less perfectly but generalizes better
- Q: Which belief about limiting tree growth is a misconception to avoid?
    [ ] That growth control has a direct effect on tree complexity
    [ ] That a smaller tree can sometimes generalize better than a larger one
    [ ] That overfitting is a genuine concern for decision trees
    [CORRECT] That stopping splits early must always hurt model performance

### Minimum Samples per Leaf / Node

- Q: How does increasing the minimum-samples-per-leaf setting tend to affect a tree's variance?
    [ ] Larger minimum leaf sizes always increase the model's variance very sharply
    [ ] It has no measurable effect on the variance of the fitted model at all
    [CORRECT] Larger minimum leaf sizes usually reduce variance by smoothing predictions
    [ ] It changes only the training speed and leaves the variance untouched
- Q: How does raising the minimum-samples-per-leaf requirement affect the resulting decision tree?
    [ ] It rescales and normalizes the target values
    [ ] It makes every split strictly binary and pure
    [CORRECT] It forces the tree to stay simpler with fewer splits
    [ ] It automatically grows the tree to a greater depth
- Q: Why set a minimum number of samples required in each leaf or node of a decision tree?
    [ ] To convert the tree into a linear regression model
    [CORRECT] To block splits creating tiny regions that overfit noise
    [ ] To raise the count of features used at each split
    [ ] To force every leaf to become perfectly pure
- Q: Why can leaves containing only a handful of training examples be problematic?
    [ ] They are strictly required before any pruning can occur
    [ ] They reliably improve generalization to new data
    [ ] They are unable to output numeric predictions at all
    [CORRECT] Their predictions hinge too heavily on a few noisy points
- Q: Which belief about the minimum-samples-per-leaf setting is a misconception to avoid?
    [CORRECT] That permitting leaves with one or two examples is always harmless
    [ ] That leaves with very few examples can overfit noise
    [ ] That minimum-size constraints can act to regularize a tree
    [ ] That this setting is a tunable control over model complexity

### Pruning in Decision Trees

- Q: Which belief about a pruned branch is a misconception to avoid?
    [ ] That pruning serves as a genuinely useful tool for combating overfitting
    [ ] That pruning reliably yields a much simpler overall model than the original
    [CORRECT] That it must have been useless in training, not harmful for generalization
    [ ] That training fit and out-of-sample generalization can diverge widely
- Q: Which branches are the best candidates for pruning?
    [CORRECT] Those adding complexity without enough held-out benefit
    [ ] Every branch that happens to end in a pure leaf
    [ ] Only the single branch emerging from the root node
    [ ] Only branches that split on numeric thresholds
- Q: What is the main reason for pruning a decision tree?
    [ ] To convert a classification task into a clustering task
    [ ] To drive the training error as low as it can possibly go
    [CORRECT] To reduce overfitting and improve generalization
    [ ] To strip the target labels out of the dataset
- Q: What does pruning a decision tree refer to?
    [ ] Rescaling the input features at each internal node
    [ ] Replacing leaf predictions with cluster centroids
    [CORRECT] Removing some branches from a grown tree to simplify it
    [ ] Adding extra branches to the tree after training ends
- Q: How does pruning affect the complexity of a decision tree?
    [CORRECT] It reduces complexity by cutting parts of the tree back
    [ ] It has no bearing on the tree's complexity at all
    [ ] It raises the total number of leaves in the tree
    [ ] It reliably makes the tree deeper than before

### Cost Complexity Pruning

- Q: Conceptually, what quantity does cost complexity pruning seek to minimize?
    [ ] The number of leaves and nothing else
    [ ] The depth of the tree and nothing else
    [ ] Training error alone, with no penalty applied
    [CORRECT] Prediction error plus a penalty for tree complexity
- Q: Which belief about cost complexity pruning is a misconception to avoid?
    [CORRECT] That the best tree is the one with lowest training error, ignoring its size
    [ ] That a tree's complexity can be penalized explicitly during the pruning step
    [ ] That pruning trades off quality of the fit against the model's simplicity
    [ ] That penalizing model complexity can improve how well it generalizes to data
- Q: How does cost complexity pruning differ from simply minimizing training error?
    [ ] It always retains the single deepest tree available
    [ ] It applies only to classification trees, never regression
    [ ] It disregards how well the tree fits the data entirely
    [CORRECT] It values simpler trees when added complexity is not worth it
- Q: What is cost complexity pruning of a decision tree?
    [ ] Growing the tree deeper until training error reaches zero
    [CORRECT] Pruning that balances tree fit against a penalty on tree size
    [ ] A kernel-based method for fitting nonlinear trees
    [ ] A technique that rescales features before each split
- Q: Why include a complexity penalty when pruning a decision tree?
    [ ] To remove the need for any target values at all
    [ ] To maximize the total number of branches grown
    [CORRECT] To discourage overly large trees that tend to overfit
    [ ] To make every leaf predict one identical value

### Tree Complexity Penalty

- Q: Why is a tree complexity penalty useful when fitting a model?
    [CORRECT] It curbs overfitting by discouraging needless complexity
    [ ] It affects only runtime and not generalization at all
    [ ] It guarantees the most accurate possible training fit
    [ ] It removes the need to use a validation set
- Q: What is the purpose of adding a complexity penalty to a decision tree's objective?
    [ ] To guarantee that all leaves end up perfectly pure
    [ ] To increase the number of splits the tree makes
    [CORRECT] To make large trees pay an extra cost in the objective
    [ ] To substitute for and replace the target variable
- Q: Under a tree complexity penalty, which trees are penalized most heavily?
    [ ] Trees that were trained on larger datasets
    [CORRECT] More complex trees with more leaves or structure
    [ ] Smaller trees that have only a few leaves
    [ ] Trees that rely on numeric predictor variables
- Q: Which belief about a tree complexity penalty is a misconception to avoid?
    [ ] That a simpler tree can sometimes generalize better to unseen data
    [ ] That model complexity can and often should be penalized when fitting
    [ ] That overfitting is closely linked to having excess tree structure
    [CORRECT] That adding more branches is always free from a modeling standpoint
- Q: What trade-off does a tree complexity penalty create during fitting?
    [ ] The tree is forced to stop using any predictors
    [ ] The model always becomes simpler with no loss of fit
    [CORRECT] Extra complexity must be justified by enough gain in fit
    [ ] The penalty constrains only the very first root split

### Alpha as the Pruning Hyperparameter

- Q: In cost complexity pruning, what does the hyperparameter alpha control?
    [ ] The variance of a Gaussian distribution
    [ ] The learning rate used by gradient descent
    [ ] The number of target classes in the data
    [CORRECT] How strongly tree complexity is penalized
- Q: Which belief about the pruning hyperparameter alpha is a misconception to avoid?
    [ ] That alpha generally needs to be tuned separately for each dataset
    [ ] That alpha governs the trade-off between fit quality and model simplicity
    [CORRECT] That one fixed alpha value is universally optimal for every tree problem
    [ ] That alpha directly influences the preferred final size of the tree
- Q: Why is alpha treated as a tunable hyperparameter rather than a fixed constant?
    [CORRECT] Different datasets need different complexity-vs-fit trade-offs
    [ ] It is read directly from the labels with no choice involved
    [ ] It is effectively always set to zero in practice
    [ ] It is relevant only for classification trees, not regression
- Q: What happens when alpha, the cost complexity pruning hyperparameter, is very small?
    [ ] The model is converted into an unsupervised clustering method instead
    [CORRECT] The penalty on complexity is weak, so larger trees are more acceptable
    [ ] The tree becomes completely unable to make predictions for any input
    [ ] All of the leaves immediately collapse together into a single root node
- Q: What is the effect of increasing alpha, the cost complexity pruning hyperparameter?
    [ ] The target values are rescaled before the tree is ever fit to them
    [CORRECT] The algorithm prefers simpler, smaller trees much more strongly
    [ ] Every split made within the tree is driven to be perfectly pure
    [ ] The tree is necessarily forced to grow deeper and add more splits

### Using Cross-Validation to Choose Alpha

- Q: After validating across candidate alpha values, which choice of alpha is generally preferred?
    [ ] Whichever alpha produces the single largest number of leaves
    [ ] The smallest alpha available, so almost nothing is pruned
    [CORRECT] One that balances fit against simplicity well on held-out data
    [ ] The largest alpha available, collapsing the tree to its root
- Q: In cost-complexity pruning of a decision tree, why is cross-validation used to choose the complexity parameter alpha rather than fixing it by hand?
    [ ] To compute the predicted target values stored at the leaf nodes
    [ ] To guarantee the lowest possible error on the training set
    [CORRECT] To find the pruning strength that generalizes best to unseen data
    [ ] To force the tree to use every available predictor at least once
- Q: Why is it a mistake to select the pruning parameter alpha using training error alone?
    [CORRECT] Training error keeps favoring larger trees and need not track generalization
    [ ] Training error stays exactly the same no matter which alpha is used
    [ ] Cross-validation applies only to neural networks, never to trees
    [ ] Alpha takes effect only at prediction time, not during fitting
- Q: When sweeping over a grid of candidate alpha values during cost-complexity pruning, what quantity is actually compared across those values?
    [ ] The total number of leaf nodes in the pruned tree that each alpha yields
    [ ] The alphabetical ordering of the predictor names chosen at the tree splits
    [CORRECT] The held-out validation performance of the pruned tree each alpha yields
    [ ] The depth of the single root split that gets selected by each candidate tree
- Q: Which belief about tuning a pruning hyperparameter like alpha should be avoided?
    [ ] That alpha ought to be tuned with generalization as the goal
    [CORRECT] That training performance by itself is enough to select alpha reliably
    [ ] That the size of the tree is itself a modeling decision to make
    [ ] That validation results can expose when a tree is overfitting

### Selecting the Final Pruned Tree

- Q: Conceptually, what does the final pruned tree selected at the tuned alpha represent?
    [ ] The deepest tree the training data can possibly support
    [ ] The tree with the lowest training error whatever its size
    [CORRECT] A chosen balance between predictive fit and model simplicity
    [ ] The tree that manages to use the largest number of predictors
- Q: Once cross-validation has identified a good value of the cost-complexity parameter alpha, what is the usual next step?
    [ ] Discard alpha and simply keep the largest unpruned tree
    [ ] Average all the candidate pruned trees with equal weight
    [ ] Switch the model from a tree to a neural network instead
    [CORRECT] Select or refit the final pruned tree using that chosen alpha
- Q: Why can a pruned tree outperform the full unpruned tree on new data?
    [CORRECT] Cutting away unnecessary branches can reduce overfitting
    [ ] Smaller trees are able to memorize more training examples
    [ ] The act of pruning relabels the targets at the leaves
    [ ] Pruning automatically raises accuracy on the training set
- Q: After tuning the complexity parameter, why is it preferable to deploy a single pruned tree rather than every candidate that was evaluated?
    [ ] Two decision trees can never be compared against each other
    [CORRECT] One final model chosen at the tuned complexity setting is what is wanted
    [ ] All of the candidate pruned trees turn out to have identical accuracy
    [ ] Pruning is only an analysis step and yields nothing deployable
- Q: Which belief about choosing the final tree should be avoided?
    [CORRECT] That keeping the full unpruned tree is always the best choice
    [ ] That the selection should rest on validation evidence
    [ ] That pruning the tree can improve how it generalizes
    [ ] That the final model reflects a tuned complexity choice

