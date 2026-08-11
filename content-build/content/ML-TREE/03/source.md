# SOURCE PACK — Machine Learning / Tree-Based Models / Gradient Boosting

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Sequential Error Correction in Boosting   (4 questions)
2. Ensemble Prediction as Additive Modeling   (5 questions)
3. Gradient Boosting for Regression   (5 questions)
4. Loss Function for Gradient Boost Regression   (5 questions)
5. Why Squared Error Works for Gradient Boosting   (4 questions)
6. Initial Prediction in Gradient Boosting   (5 questions)
7. Pseudo-Residuals   (5 questions)
8. Why the Gradient Equals the Negative Residual   (4 questions)
9. Why Gradient Boost Uses Differentiable Loss Functions   (4 questions)
10. Fitting Trees to Residuals   (5 questions)
11. Optimizing Leaf Output Values   (5 questions)
12. Updating Predictions After Each Tree   (4 questions)
13. Learning Rate in Gradient Boosting   (5 questions)
14. Gradient Boost Algorithm Steps   (5 questions)
15. Gradient Boosting for Classification   (5 questions)
16. Negative Log-Likelihood Loss   (5 questions)
17. Initial Log-Odds Prediction   (5 questions)
18. Classification Residuals in Gradient Boosting   (5 questions)
19. Converting Log-Odds to Probability   (10 questions)
20. First and Second Derivatives in Gradient Boost Classification   (5 questions)
21. Newton-Style Leaf Updates in Classification Boosting   (5 questions)
22. Leaf Output Transformation for Classification   (5 questions)
23. Updating Log-Odds with New Trees   (5 questions)
24. Final Classification from Predicted Probability   (5 questions)
25. Performance Trade-offs: Sensitivity to Noisy Data and Outliers   (5 questions)

## Already taught earlier in this course

- Random Forest: Decorrelating Trees via Feature Sampling
- Out-of-Bag Error Estimation
- Feature Importance from Random Forests
- Random Forest Hyperparameters (n_estimators, max_features, max_depth)
- AdaBoost in a Nutshell: Reweight, Add a Weak Learner, Repeat
- Decision Stumps as Weak Learners
- The Ensemble as a Weighted Vote of Weak Learners

## Covered by LATER lessons — do not teach these here

- XGBoost: XGBoost vs. Gradient Boosting, XGBoost Objective Function: Loss Plus Regularization, Second-Order Taylor Approximation with Gradients (G) and Hessians (H), Residuals in XGBoost, XGBoost for Regression, Similarity Score, Gain in XGBoost, Output Values for XGBoost Leaves, Initial Prediction in XGBoost, Sequential Residual Correction in XGBoost, Additive Tree-Based Prediction in XGBoost, How Lambda Shrinks Similarity Scores, How Lambda Shrinks Leaf Output Values, Pruning with Gamma, Tree Depth Constraints in XGBoost, Minimum Child Weight, Learning Rate in XGBoost, XGBoost for Classification, Similarity Score for Classification Trees, Cover in XGBoost, Gain for Classification Splits, Leaf Output Formula for Classification, Converting Log-Odds to Probability, Approximate Greedy Algorithm for Split Finding, Quantiles as Candidate Split Thresholds, Weighted Quantile Sketch, Parallel Learning and Sketch Algorithms for Large Data
- Decision Trees: Decision Trees, Root Nodes, Internal Nodes, and Leaf Nodes, Recursive Tree Growth, Classification Trees vs. Regression Trees, How Classification Trees Make Decisions, Leaf Output as Majority Class, Gini Impurity, Weighted Gini Impurity for Splits, Choosing the Best Split in a Classification Tree, Handling Numeric Features in Decision Trees, Threshold Selection for Continuous Variables, Regression Trees, Leaves as Numeric Predictions, Regression Tree Predictions as Leaf Averages, Sum of Squared Residuals for Split Selection, Choosing the Best Split in a Regression Tree, Building Regression Trees with Multiple Predictors, Automatic Feature Selection in Trees, Missing Data Strategies for Trees, Bias-Variance Tradeoff in Regression Trees, Overfitting in Decision Trees, Limiting Tree Growth, Minimum Samples per Leaf / Node, Pruning in Decision Trees, Cost Complexity Pruning, Tree Complexity Penalty, Alpha as the Pruning Hyperparameter, Using Cross-Validation to Choose Alpha, Selecting the Final Pruned Tree

## The live quiz bank for these topics — 125 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Sequential Error Correction in Boosting

- Q: What is the central idea of sequential error correction in boosting?
    [ ] Mislabeled training examples are deleted from the data before each round
    [ ] Only the first model matters, and all of the later models are ignored
    [ ] Every model is trained independently and then averaged together at the end
    [CORRECT] Each new model is trained to help correct the current ensemble's mistakes
- Q: How does sequential correction improve the ensemble over successive rounds?
    [ ] It guarantees exactly zero training error after only two trees
    [ ] It forces every tree to output one identical set of predictions
    [CORRECT] It reduces residual error by targeting what is still wrong
    [ ] It removes any need to define or evaluate a loss function
- Q: Why is boosting described as sequential rather than parallel?
    [ ] All trees are built at once with no interaction between them
    [ ] Each learner is restricted to using only one feature
    [ ] The training data must first be sorted by its label
    [CORRECT] Each learner depends on the errors left by earlier learners
- Q: If the current ensemble systematically underpredicts in one region of the input space, what can a later tree do?
    [ ] All subsequent trees must ignore that region
    [ ] That region has to be pruned out of the dataset
    [ ] The ensemble automatically converts itself into a classifier
    [CORRECT] It can add a positive correction in that region

### Ensemble Prediction as Additive Modeling

- Q: Why is the additive-modeling perspective a useful way to think about boosting?
    [ ] It proves that one single tree always suffices for any given modeling task
    [ ] It shows that a loss function is wholly unnecessary during the training
    [CORRECT] Complex prediction functions arise from many simple added contributions
    [ ] It implies the ensemble stays linear in the original raw input features
- Q: Why is gradient boosting described as an additive model?
    [CORRECT] The final prediction is a sum of successive component learners
    [ ] It directly averages all of the training labels together
    [ ] It appends brand-new features to the dataset each step
    [ ] It attaches extra support vectors inside every leaf
- Q: What misconception about additive boosting models should be avoided?
    [ ] That each individual learner matters as just one term within the sum
    [ ] That many stagewise contributions are accumulated together over rounds
    [ ] That the ensemble gradually builds up its overall predictive complexity
    [CORRECT] That one specially chosen tree alone determines the final prediction
- Q: How does the additive-modeling idea connect to the learning rate in boosting?
    [CORRECT] The learning rate scales each contribution before it is summed in
    [ ] Additivity disappears the moment a learning rate is applied
    [ ] The learning rate rewrites the labels before they are summed
    [ ] The learning rate picks how many input features to use
- Q: In the additive view of boosting, what does each newly added tree represent?
    [ ] A pure noise term that the ensemble ignores
    [ ] A freshly introduced output class label
    [ ] A full replacement for every tree built before it
    [CORRECT] A correction function layered onto the current model

### Gradient Boosting for Regression

- Q: Which misunderstanding about gradient boosting should be avoided?
    [ ] That it is an ensemble built from multiple base learners
    [CORRECT] That it is one very deep tree rather than many trees added in sequence
    [ ] That its trees are introduced in successive stages of training
    [ ] That its predictions are refined iteratively as trees are added
- Q: How does the ensemble's prediction change as gradient boosting proceeds?
    [ ] It alternates between tree outputs and SVM outputs
    [CORRECT] It is updated by adding in the contribution of each new tree
    [ ] It is averaged directly with the observed target labels
    [ ] It is locked in after the very first tree is trained
- Q: Why is the method called "boosting"?
    [ ] It scales up the value of every input feature before any single tree is fit
    [CORRECT] Each new tree is added to reduce the current ensemble's errors step by step
    [ ] It relies purely on mapping the data into much higher-dimensional kernel spaces
    [ ] It boosts the dataset by duplicating many of its rows to make the sample larger
- Q: What kind of base learners does gradient boosting for regression typically use?
    [ ] Centroids produced by K-means clustering
    [CORRECT] Small (shallow) regression trees
    [ ] Logistic regression classifiers exclusively
    [ ] Large, deeply layered neural networks
- Q: What best describes gradient boosting for a regression task?
    [ ] A support vector machine using nonlinear kernel functions
    [ ] A single large regression tree fit once over all of the data
    [ ] A clustering method that locates K centroids among the data points
    [CORRECT] An ensemble that builds regression trees in sequence to refine predictions

### Loss Function for Gradient Boost Regression

- Q: How do newly added trees relate to the loss function?
    [ ] They influence only the model's overall training runtime in practice
    [ ] They are fit on randomly reassigned target labels each round
    [CORRECT] They are fit so as to reduce the ensemble's current loss
    [ ] They ignore the loss entirely and just maximize their own depth
- Q: What does the loss function measure in gradient boosting for regression?
    [ ] The number of support vectors that are retained by the model
    [ ] The degree of the polynomial kernel currently being applied
    [CORRECT] How far current predictions are from the true targets
    [ ] The number of leaves in the single most recently added tree
- Q: Which belief about the loss in boosting is a misconception to avoid?
    [ ] The stagewise updates are fundamentally driven by the loss
    [CORRECT] It is just bookkeeping, unrelated to what is minimized
    [ ] Regression boosting commonly relies on squared error loss
    [ ] The loss is closely tied to the residuals and the gradients
- Q: For standard gradient boosting regression, which loss function is most commonly used?
    [ ] Cross-entropy paired with a softmax output
    [ ] Hinge loss
    [CORRECT] Squared error loss
    [ ] Gini impurity
- Q: Why is a loss function needed in gradient boosting?
    [ ] It automatically decides how many input features get used
    [CORRECT] It provides the objective whose reduction guides each stage
    [ ] It serves no real purpose beyond plotting the final results
    [ ] It takes the place of the target variable throughout training

### Why Squared Error Works for Gradient Boosting

- Q: Why is squared error a natural loss for gradient boosting regression?
    [ ] It lets the model fit the data well without ever referencing the target values at all
    [ ] It reframes the regression task entirely as a multi-class classification problem
    [ ] It is valid only when the dataset happens to contain exactly one single input feature
    [CORRECT] It penalizes prediction errors and yields a simple gradient tied to the residuals
- Q: How does squared error weight large prediction mistakes relative to small ones?
    [ ] It ignores large mistakes whenever they are rare
    [ ] It assigns every mistake exactly the same weight
    [ ] It responds only to the sign of each error
    [CORRECT] It penalizes large mistakes more heavily than small ones
- Q: Which belief about squared error in gradient boosting is a misconception to avoid?
    [ ] That its gradient connects directly to residual-based correction
    [ ] That it penalizes large prediction errors more than small ones
    [ ] That it is a common and reasonable choice for regression problems
    [CORRECT] That it is picked arbitrarily, not for any meaningful objective
- Q: Which property of squared error makes each boosting update easy to compute?
    [CORRECT] Its gradient points directly to residual-like correction targets
    [ ] It forces training error to reach zero after the first tree
    [ ] It depends only on the inputs and not on the targets
    [ ] Its derivative is undefined, so no gradient is needed

### Initial Prediction in Gradient Boosting

- Q: When the loss is squared error, which constant minimizes that loss and is therefore the natural starting value?
    [ ] A value of zero for every example
    [CORRECT] The mean of y in the training data
    [ ] The median of the input feature values
    [ ] The largest label in the training set
- Q: Which statement about the first step of gradient boosting is a misconception to avoid?
    [CORRECT] The ensemble must start from a complex tree rather than a simple constant
    [ ] The starting value of the whole ensemble can simply be a single constant
    [ ] Later trees in the sequence simply refine an initial baseline prediction value
    [ ] Boosting builds up its overall model in an iterative, stagewise fashion overall
- Q: In gradient boosting for regression, what is the initial prediction (before any trees are added) typically set to?
    [ ] A fresh random guess for each training example
    [ ] The single largest observed target value
    [CORRECT] A constant equal to the mean of the target values
    [ ] A deep decision tree fit on all features
- Q: Why does gradient boosting begin with a single constant prediction rather than a complex model?
    [ ] It makes fitting the first tree unnecessary entirely
    [ ] It guarantees the final ensemble will be a linear function
    [CORRECT] It gives a baseline that later trees can correct toward
    [ ] It removes any need to compute residuals later
- Q: What role does the initial constant prediction play in the overall boosting algorithm?
    [ ] It eliminates the need to specify a loss function
    [CORRECT] It is the starting ensemble whose errors later trees reduce
    [ ] It fixes the number of leaves used in every tree
    [ ] It serves as the final model whenever trees stay shallow

### Pseudo-Residuals

- Q: Why are pseudo-residuals central to the gradient boosting procedure?
    [CORRECT] The next tree fits them, so the ensemble corrects its errors
    [ ] They permanently overwrite the original target values used here
    [ ] They exist only to select the pruning parameter alpha used
    [ ] They quantify the class impurity present at each node split
- Q: In gradient boosting for regression with squared-error loss, what are the pseudo-residuals at a given step?
    [ ] The Gini impurity values measured at each leaf
    [ ] Only the final prediction stored at each leaf
    [CORRECT] The current errors, y minus the current prediction
    [ ] The support vectors selected by the ensemble
- Q: For an example with squared-error loss, what does a large positive pseudo-residual indicate about the current model?
    [ ] That example's feature values are missing
    [ ] That example should be dropped from training
    [ ] The model is currently overpredicting that example
    [CORRECT] The model is currently underpredicting that example
- Q: Why are these targets called pseudo-residuals rather than plain residuals in the general boosting framework?
    [ ] Because they apply to classification problems only
    [ ] Because they are random labels unrelated to the loss
    [CORRECT] Because for general losses they are gradients, not raw errors
    [ ] Because they are always exactly zero once training converges
- Q: Which statement about pseudo-residuals is a misconception to avoid?
    [ ] They are tightly connected to the gradients of the chosen loss
    [ ] They indicate exactly what the next learner should correct
    [CORRECT] They are arbitrary targets unrelated to the ensemble's errors
    [ ] They are computed directly from the model's current predictions

### Why the Gradient Equals the Negative Residual

- Q: If the model underpredicts an example (y-hat is below y), what sign is the residual y minus y-hat?
    [ ] Always exactly zero
    [ ] Undefined for regression
    [CORRECT] Positive
    [ ] Negative
- Q: Under squared error loss, what quantity does the negative gradient equal?
    [ ] The margin separating the support vectors
    [ ] The count of trees currently in the ensemble
    [ ] The Gini impurity measured at a tree node
    [CORRECT] The residual, the target y minus the prediction y-hat
- Q: In optimization terms, what does moving in the negative gradient direction represent?
    [ ] The direction that disregards the current prediction errors
    [ ] The direction that always raises overall model complexity
    [CORRECT] The direction that locally decreases the loss the fastest
    [ ] The direction that picks the deepest available tree
- Q: Why does the fact that the negative gradient equals the residual matter for gradient boosting regression?
    [CORRECT] It shows fitting trees to residuals follows the negative gradient
    [ ] It proves that boosting and bagging are the same procedure
    [ ] It removes any need to specify a loss function at all
    [ ] It shows trees should be refit on the original labels each round

### Why Gradient Boost Uses Differentiable Loss Functions

- Q: Without a differentiable loss, which quantity would be hard to compute at each boosting round?
    [CORRECT] The gradient-based pseudo-residuals for the next learner
    [ ] The averaged prediction made by the full tree ensemble
    [ ] The ground-truth target labels given with the training set
    [ ] The leaf count placed in the next fitted boosting tree
- Q: Why is requiring only a differentiable loss useful beyond plain squared error?
    [CORRECT] Any loss that yields gradients can drive stagewise updates
    [ ] It removes the need for any learning rate
    [ ] It guarantees every loss behaves identically
    [ ] Differentiable losses can only be used for regression
- Q: How does differentiability connect gradient boosting to optimization?
    [CORRECT] It lets the ensemble step in a loss-reducing direction
    [ ] It removes the need to compute residuals at all
    [ ] It makes the ensemble model non-additive
    [ ] It converts the decision trees into neural networks
- Q: Why does gradient boosting require a differentiable loss function?
    [ ] Because differentiable losses are always more accurate
    [ ] Because decision trees cannot be trained otherwise
    [ ] Because non-differentiable losses imply unsupervised data
    [CORRECT] Because it uses gradients to find useful update directions

### Fitting Trees to Residuals

- Q: Which statement about how trees are fit in gradient boosting is a misconception to avoid?
    [ ] Residuals are central to each boosting update
    [CORRECT] Every tree is trained independently on the same fixed target
    [ ] The trees are added in a sequential manner
    [ ] Later trees depend on the current ensemble's errors
- Q: If the residuals across some input region are mostly positive, what will the newly fit tree tend to do there?
    [ ] Force that region to be pruned away
    [CORRECT] Add a positive correction in that region
    [ ] Recast that region as a classification leaf
    [ ] Shrink the ensemble's prediction in that region
- Q: How does fitting each tree to residuals differ from training every tree directly on the original target y?
    [ ] There is no meaningful difference at all between the two schemes
    [ ] Fitting to residuals is valid for only the very first tree
    [ ] It forces every tree in the ensemble to become identical to others
    [CORRECT] Each tree targets the remaining errors, not the whole target anew
- Q: At each step of gradient boosting regression, what is the newly added tree trained to predict?
    [ ] The original labels, ignoring prior trees
    [CORRECT] The current residuals, or pseudo-residuals
    [ ] The margins of the support vectors
    [ ] The epsilon threshold for anomalies
- Q: Why does fitting each new tree to the current residuals help the ensemble improve?
    [ ] It does away with needing an initial prediction
    [CORRECT] It teaches the tree to correct the ensemble's current errors
    [ ] It turns the method into an unsupervised one
    [ ] It guarantees zero training error after a single tree

### Optimizing Leaf Output Values

- Q: Which belief about a newly added boosting tree is a misconception to avoid?
    [ ] That its leaf values scale each region's correction
    [ ] That it acts as a correction added to the ensemble
    [CORRECT] That only its branching pattern matters and leaves are free
    [ ] That both its splits and its leaf values affect the fit
- Q: Beyond selecting good splits, why does carefully optimizing the leaf outputs improve a boosting model?
    [ ] Leaf values matter for classification trees only
    [CORRECT] Splits decide where to correct; leaves, how much
    [ ] Chosen splits already fix the exact predictions
    [ ] Doing so removes the need to compute residuals
- Q: When boosting with squared-error loss, what should each leaf's output value conceptually represent?
    [ ] The most frequent class label in the region
    [CORRECT] A typical summary of the residuals in that leaf
    [ ] The count of support vectors in the region
    [ ] The global mean of all targets in the data
- Q: Why do the output values stored in a boosting tree's leaves matter to the final model?
    [ ] They affect only how the tree is drawn
    [ ] They are ignored after the structure is set
    [ ] They fully replace the learning rate's role
    [CORRECT] They set how large a correction each region adds
- Q: In gradient boosting, once a new regression tree's split structure is fixed, what quantity still must be chosen carefully for each leaf?
    [ ] The total number of classes in the dataset
    [ ] The class labels of the training examples
    [ ] The degree of a polynomial kernel function
    [CORRECT] The numeric output value assigned to that leaf

### Updating Predictions After Each Tree

- Q: Why must the ensemble's predictions be updated before the next boosting tree is fitted?
    [ ] The residuals stay identical from one round to the next
    [CORRECT] The next round's residuals depend on updated predictions
    [ ] Each tree is fit with no reference to predictions
    [ ] The learning rate is only known after the final round
- Q: What does updating the prediction after every tree let the boosting ensemble accomplish over many rounds?
    [ ] Add trees while holding the residuals fixed
    [CORRECT] Refine its predictions gradually round by round
    [ ] Reach a good fit without any loss function
    [ ] Solve the whole problem in one jump, no updates
- Q: In gradient boosting, what happens to the ensemble's prediction once a new tree has been fitted?
    [ ] Only the loss value changes, not the prediction
    [ ] All earlier trees are averaged and then removed
    [CORRECT] A scaled contribution from that tree is added to it
    [ ] It is reset back to the original training labels
- Q: When a new tree's contribution is added to the boosting ensemble, how does the learning rate enter the update?
    [ ] It rewrites the numeric labels of the dataset
    [CORRECT] It scales the size of the added tree's correction
    [ ] It selects the next feature to split on directly
    [ ] It decides whether the new tree gets pruned

### Learning Rate in Gradient Boosting

- Q: Why can a smaller learning rate improve a boosted model's generalization?
    [ ] It removes the need for any validation set
    [ ] It guarantees the model will use fewer trees
    [ ] It always drives training error down more quickly
    [CORRECT] It makes updates gradual, curbing overaggressive steps
- Q: What is the effect of using a smaller learning rate in gradient boosting?
    [CORRECT] Each tree corrects less, so more trees are needed
    [ ] The ensemble stops using residuals to update
    [ ] Each tree automatically grows deeper
    [ ] The ensemble collapses into a single tree
- Q: What trade-off accompanies choosing a very small learning rate?
    [ ] It needs less computation for the same tree count
    [ ] It eliminates the possibility of overfitting
    [ ] It removes the additive structure of the model
    [CORRECT] Better control, but more trees and more computation
- Q: What does the learning rate control in gradient boosting?
    [CORRECT] How much each new tree shifts the ensemble's prediction
    [ ] How many features each individual tree may use
    [ ] Which feature is chosen at the root split of each tree
    [ ] Which loss function the algorithm optimizes
- Q: Which statement about the gradient boosting learning rate is a misconception to avoid?
    [ ] It scales how much each tree contributes
    [ ] Smaller steps can sometimes generalize better
    [CORRECT] The largest possible learning rate is always best
    [ ] It is a hyperparameter that can be tuned

### Gradient Boost Algorithm Steps

- Q: What happens to the ensemble's predictions after each new tree is fit?
    [ ] All previously fitted trees are discarded immediately
    [ ] They reset back to the original constant baseline value
    [ ] Only the loss changes while the predictions stay fixed
    [CORRECT] They are adjusted by adding a scaled output of the new tree
- Q: What is the first broad step in gradient boosting regression?
    [ ] Randomly reassign the training labels to the pseudo-residuals
    [CORRECT] Begin with an initial prediction, such as a constant baseline
    [ ] Choose the number of clusters K the model should form
    [ ] Fit one deep, fully grown tree using all features at once
- Q: After the initial prediction, what loop is repeated in gradient boosting?
    [ ] Reinitialize the entire model from scratch at the start of each round
    [CORRECT] Compute the pseudo-residuals, fit a tree to them, update the ensemble
    [ ] Drop the hardest-to-predict examples from the training set each round
    [ ] Replace every existing tree in the ensemble with one single new tree
- Q: Why is gradient boosting described as an iterative algorithm?
    [ ] It repeats because the loss cannot be evaluated directly
    [ ] It uses a single tree but loops over the input features
    [ ] It alternates between supervised and unsupervised phases
    [CORRECT] The prediction is updated stage by stage by successive learners
- Q: Which statement about the steps of gradient boosting is a misconception to avoid?
    [ ] That residuals are recomputed at the start of each round
    [CORRECT] That all trees are trained independently and then combined
    [ ] That the ensemble's predictions evolve over the rounds
    [ ] That the procedure is stagewise rather than one-shot

### Gradient Boosting for Classification

- Q: What stays the same between regression boosting and classification boosting?
    [CORRECT] Trees are added in sequence to improve the ensemble
    [ ] The procedure operates without any loss function
    [ ] The labels are turned into continuous residuals only
    [ ] Only the very first tree has any real effect
- Q: Which belief about classification boosting is a misconception to avoid?
    [CORRECT] That it is an unrelated method, not boosting with a new loss
    [ ] That its outputs are interpreted differently than targets
    [ ] That it still adds its trees in a stagewise manner
    [ ] That it relies on a different loss than regression does
- Q: Why can't classification boosting reuse the regression setup completely unchanged?
    [CORRECT] It needs a loss and outputs suited to class probabilities
    [ ] Classification problems have no loss function at all
    [ ] Regression trees are unusable as classifier base learners
    [ ] Residuals cannot be defined in a classification task
- Q: In binary classification with boosting, what form does each training target typically take?
    [ ] A signed distance to a support vector
    [CORRECT] A binary label, such as 0 or 1
    [ ] A cluster index produced by K-means
    [ ] A continuous value like a house price
- Q: How does gradient boosting change when applied to classification rather than regression?
    [ ] It turns into a fully unsupervised clustering method without any labels
    [CORRECT] It uses a classification loss and updates score-like log-odds values
    [ ] It abandons decision trees entirely as its chosen base learner here
    [ ] It predicts only the simple running sum of the computed residuals

### Negative Log-Likelihood Loss

- Q: The negative log-likelihood loss for a single example is computed from which quantities?
    [ ] Only the raw input feature values
    [CORRECT] The true label and the predicted probability
    [ ] Only the total number of trees in the ensemble
    [ ] Only the learning rate used during training
- Q: Which statement about classification loss in gradient boosting is a misconception to avoid?
    [ ] Logistic loss matches binary probability modeling closely
    [CORRECT] Regression squared-error loss can be reused unchanged here
    [ ] Output probabilities are meaningful and genuinely matter
    [ ] The loss provides gradients that guide each new tree's fit
- Q: Which loss function is most commonly used when gradient boosting is applied to binary classification?
    [ ] Gini impurity of the leaf
    [ ] Squared error on the class labels
    [CORRECT] Negative log-likelihood (logistic loss)
    [ ] Hinge loss on the margins
- Q: Why is negative log-likelihood a sensible loss for binary classification?
    [CORRECT] It heavily penalizes confident but wrong probabilities
    [ ] It depends only on hard labels, not probabilities
    [ ] It forces every leaf to become perfectly pure
    [ ] It applies only to multiclass clustering tasks
- Q: How does minimizing negative log-likelihood encourage good predictions?
    [ ] It rewards hard labels while ignoring probabilities
    [ ] It rewards deeper trees with more leaves
    [ ] It rewards ensembles that are not additive
    [CORRECT] It rewards high probability on the correct class

### Initial Log-Odds Prediction

- Q: Which belief about the starting point of classification boosting is a misunderstanding to avoid?
    [ ] That probabilities are obtained only after a final transformation step
    [ ] That the chosen initial score can reflect the overall class prevalence
    [CORRECT] That boosting must begin with a tree, not a constant log-odds score
    [ ] That later boosting trees go on to repeatedly update this starting score
- Q: What quantity determines the value of the initial constant log-odds prediction?
    [ ] The total count of distinct input features used by the model
    [CORRECT] The fraction of positives versus negatives in the data
    [ ] The maximum tree depth chosen for the very first boosting tree
    [ ] The plain arithmetic mean of all of the model's input variables
- Q: Why is the internal boosting score kept in log-odds form rather than as a raw probability?
    [ ] Raw probabilities simply cannot be used at all within a classification task
    [CORRECT] It gives an additive scale for updates before mapping to a probability
    [ ] Decision trees are only ever able to output log-odds values at their own leaves
    [ ] Log-odds values are conveniently constrained to always lie between 0 and 1
- Q: How should a larger (more positive) initial log-odds value be interpreted?
    [ ] The configured learning-rate hyperparameter is set much larger
    [CORRECT] The positive class is more prevalent in the baseline
    [ ] The training dataset happens to contain more input features
    [ ] The boosting ensemble has already been given many more trees
- Q: In binary gradient boosting, what is commonly used as the initial prediction before any trees are added?
    [ ] A raw count equal to the number of positive examples in the data
    [ ] The output produced by the single deepest tree in the ensemble
    [CORRECT] A constant log-odds set from the overall class proportion
    [ ] A separate random probability drawn for each training example

### Classification Residuals in Gradient Boosting

- Q: If an example has true label 1 but the model assigns it a low probability for class 1, what should the next update tend to do?
    [ ] Decrease the ensemble's score for it even further
    [CORRECT] Increase the ensemble's score for that example
    [ ] Move that example into a brand-new separate class
    [ ] Drop that example from the training set entirely
- Q: In binary gradient boosting, what do the residual-like training targets reflect?
    [CORRECT] How current predicted probabilities differ from true labels
    [ ] Only the total number of positive training examples present
    [ ] The geometric margin distances between the support vectors
    [ ] The Gini impurity value measured at each individual tree leaf
- Q: Why are the residual-like targets recomputed after each boosting round?
    [CORRECT] They depend on the ensemble's latest predictions
    [ ] Cross-validation strictly requires recomputation
    [ ] Tree depth must be re-derived from scratch each time
    [ ] The true labels themselves change every round
- Q: Why are these targets called pseudo-residuals rather than ordinary residuals?
    [ ] They are computed purely for visualization and later manual inspection
    [ ] They are arbitrary values with no real connection to the learning at all
    [ ] They are fixed in advance and never depend on the model's predictions
    [CORRECT] They come from the gradient of the loss, not plain subtraction
- Q: Which belief about residuals in classification boosting is a misunderstanding to avoid?
    [CORRECT] That they identically match regression residuals for any loss
    [ ] That they guide the corrections that the next added tree will make
    [ ] That they depend on the current predicted probabilities
    [ ] That they are tied to the classification objective being optimized

### Converting Log-Odds to Probability

- Q: When the sigmoid is applied to a log-odds value of 0, what probability does it produce?
    [ ] 1
    [ ] 0
    [CORRECT] 0.5
    [ ] Undefined
- Q: After the sigmoid is applied, what happens to the result of a positive increase in the log-odds score?
    [CORRECT] The predicted positive-class probability rises
    [ ] The predicted probability is forced to decrease
    [ ] The split's information gain becomes zero
    [ ] The example's class label becomes missing
- Q: Which belief about log-odds in classification boosting is a misunderstanding to avoid?
    [ ] That the final probabilities are produced after a transformation step
    [ ] That the log-odds value serves only as an internal additive scale
    [ ] That the sigmoid function converts internal scores into probabilities
    [CORRECT] That the internal log-odds score is itself the final probability
- Q: Which function converts an internal log-odds score into a probability in XGBoost classification?
    [ ] The ReLU function
    [ ] The information-gain function
    [CORRECT] The logistic (sigmoid) function
    [ ] The squaring function
- Q: What does a very large negative log-odds value become after the logistic function is applied?
    [CORRECT] A probability that is close to 0
    [ ] A probability that is close to 1
    [ ] Exactly the midpoint 0.5
    [ ] An undefined, invalid value
- Q: What does a very large positive log-odds value become after the logistic function is applied?
    [ ] A negative value below zero
    [ ] A probability that is close to 0
    [ ] The same value, left unchanged
    [CORRECT] A probability that is close to 1
- Q: Why is it acceptable for the ensemble to track its internal score on the log-odds scale?
    [ ] Doing so removes any need to define a loss function at all
    [ ] Trees can only ever output class labels and never raw numbers
    [CORRECT] It can later be mapped to a valid probability in (0, 1)
    [ ] A log-odds value is, by itself, already a valid probability
- Q: Which belief about converting log-odds to probability in XGBoost is a misconception to avoid?
    [ ] That log-odds are an additive internal representation
    [CORRECT] That the internal score is already a probability
    [ ] That a log-odds value of 0 maps to 0.5
    [ ] That a conversion step is required at all
- Q: Which function converts an internal log-odds score into a probability in binary gradient boosting?
    [CORRECT] The sigmoid (logistic) function
    [ ] The ReLU rectifier function
    [ ] A softmax taken over all the trees
    [ ] The simple squaring function $x^2$
- Q: Why does XGBoost work in log-odds space internally rather than directly in probabilities during classification?
    [ ] Because trees are able to predict only class labels
    [ ] Because log-odds always stay between 0 and 1
    [CORRECT] Because log-odds form an additive scale updated stage by stage
    [ ] Because probabilities cannot be computed while training

### First and Second Derivatives in Gradient Boost Classification

- Q: Why do first derivatives of the loss matter in gradient boosting classification?
    [ ] They decide how many classes the problem has
    [ ] They replace the structure of the fitted trees
    [ ] They are only consulted at test time, not training
    [CORRECT] They give the immediate direction for reducing the loss
- Q: Why can second derivatives of the loss also be useful in classification boosting?
    [ ] They serve only to prune already-grown boosting trees
    [ ] They supply the training labels assigned to each leaf
    [ ] They turn the boosting procedure into an unsupervised one
    [CORRECT] They give curvature that refines how leaf values are set
- Q: Which belief about derivative information in boosting is a misconception to avoid?
    [CORRECT] Only the first derivative ever matters and curvature is useless
    [ ] Second-derivative information can meaningfully refine updates
    [ ] Optimization can draw on both the slope and curvature together
    [ ] Classification boosting frequently benefits from added curvature
- Q: Why is curvature information especially relevant in logistic-style (classification) boosting?
    [ ] Second-derivative terms matter only in regression-style boosting
    [CORRECT] The loss is nonlinear in the score, so curvature aids updates
    [ ] The loss stays perfectly linear in the score for every example
    [ ] The logistic loss has no usable derivatives anywhere at all
- Q: What is the intuitive role of curvature (second-derivative) information during optimization?
    [CORRECT] It tells you how the loss bends, not just its slope
    [ ] It counts the number of examples in each leaf
    [ ] It replaces predicted probabilities with hard labels
    [ ] It has no bearing on the optimization process

### Newton-Style Leaf Updates in Classification Boosting

- Q: A Newton-style leaf update in classification boosting is designed to use what?
    [ ] Only the tree depth and the leaf count
    [ ] Only the majority class found in each leaf
    [ ] Only the support vectors from this round
    [CORRECT] Both first- and second-derivative information
- Q: When Newton-style logic is applied in boosted trees, what is actually being adjusted?
    [CORRECT] The numeric output value assigned to each leaf
    [ ] The number of classes present in the problem
    [ ] The tree's branching structure after it is fit
    [ ] The true training labels held inside the leaf
- Q: Why can Newton-style leaf updates be beneficial in classification boosting?
    [ ] They remove the need for any loss function
    [CORRECT] They use curvature and gradient for better step sizes
    [ ] They convert the boosting procedure into bagging
    [ ] They make predicted probabilities unnecessary
- Q: How does a Newton-style leaf update differ from simply averaging residual-like targets in a leaf?
    [ ] It works only for regression, never classification
    [ ] It replaces the whole ensemble with one tree
    [ ] It ignores gradient information entirely
    [CORRECT] It uses a curvature-informed formula from the loss
- Q: Which belief about Newton-style leaf updates is a misconception to avoid?
    [CORRECT] Leaf values must always be plain means of residual targets
    [ ] Second-derivative information can modify the update
    [ ] Leaf outputs are quantities derived from optimization
    [ ] The shape of the classification loss affects them

### Leaf Output Transformation for Classification

- Q: Which belief about classification-boosting leaves is a misconception to avoid?
    [ ] That each leaf contributes an additive numeric update
    [ ] That leaf outputs are real numbers rather than category labels
    [ ] That the final class is decided later by the whole ensemble
    [CORRECT] That the leaf stores a predicted class instead of a score adjustment
- Q: Why is a nonlinear transformation conceptually needed when interpreting leaf values in classification boosting?
    [ ] Because the raw input features are somehow re-encoded yet again within each separate leaf
    [ ] Because probabilities play no part whatsoever in classification boosting as a method
    [ ] Because classification trees are simply not permitted to contain any leaf nodes at all
    [CORRECT] Because the model updates an internal score linked to probability by a nonlinear map
- Q: How should leaf values in classification boosting be understood relative to plain class labels?
    [CORRECT] They are numeric correction terms, not final categorical predictions
    [ ] They are identical to the leaf's own majority-vote class label
    [ ] They are the support vectors that define that particular input region
    [ ] They are raw, calibrated class probabilities read off directly
- Q: What is the role of a leaf's output value in a gradient-boosting classification tree?
    [ ] It permanently fixes the final predicted class for those examples there
    [ ] It computes the Gini impurity of that leaf node at test time directly
    [ ] It sets the single global learning rate used across the whole ensemble
    [CORRECT] It says how much to adjust the running score for examples in the leaf
- Q: In gradient boosting for classification, why are leaf outputs not simply the average of the training labels falling in that leaf?
    [ ] Because the original class labels are discarded once boosting begins
    [ ] Because only the tree's root node is allowed to emit numeric updates
    [CORRECT] Because they must encode how to adjust the running score under the loss
    [ ] Because leaf nodes are strictly forbidden from outputting numeric values

### Updating Log-Odds with New Trees

- Q: Why does boosting update predictions on the log-odds scale instead of on hard class labels?
    [ ] Because using the log-odds scale removes any need for a logistic function
    [ ] Because directly averaging the discrete class labels is meaningful in this case
    [CORRECT] Because log-odds are continuous and additive, so they refine stage by stage
    [ ] Because discrete hard labels are far easier to optimize with gradient steps
- Q: What is the learning rate's role when each new tree updates the log-odds?
    [ ] It converts the log-odds value into a probability
    [ ] It automatically selects the depth of each fitted tree
    [ ] It sets the probability threshold used for the final class
    [CORRECT] It scales how strongly the new tree shifts the current score
- Q: After a new tree is fit in binary classification boosting, what happens to the current log-odds score?
    [ ] The score is converted permanently into a hard class label
    [ ] The current score is discarded and rebuilt from scratch
    [CORRECT] A scaled version of the tree's output is added to the current score
    [ ] The training labels are overwritten with probabilities
- Q: Which belief about classification boosting updates is a misconception to avoid?
    [ ] That output probabilities are recovered only after the score is formed
    [ ] That the boosting process proceeds in a stagewise manner, tree by tree
    [ ] That successive model updates accumulate on one continuous score scale
    [CORRECT] That each tree directly outputs a final probability, not a score nudge
- Q: Why must the log-odds scores be recomputed before fitting the next tree?
    [ ] Because the loss stops mattering after the first update
    [CORRECT] Because the next pseudo-residuals depend on the updated scores
    [ ] Because each round of boosting trains on a different dataset
    [ ] Because trees can only ever be fit to the final hard labels

### Final Classification from Predicted Probability

- Q: Why might a decision threshold other than 0.5 be chosen in practice?
    [ ] Because a threshold of 0.5 applies only to regression
    [CORRECT] Because applications differ in their precision-recall trade-offs
    [ ] Because any probability below 0.5 is considered invalid
    [ ] Because boosting requires asymmetric class labels
- Q: How is the final class label usually obtained from the boosted model's predicted probability?
    [ ] By rounding each log-odds value to the nearest integer
    [ ] By reading the label from the deepest tree's leaf
    [CORRECT] By applying a threshold such as 0.5 to the probability
    [ ] By selecting the class with the largest input feature
- Q: Why does the model typically produce a probability before assigning a class label?
    [ ] Because the model cannot output discrete classes at all
    [CORRECT] Because a probability is richer and can then be thresholded into a decision
    [ ] Because probabilities are used only in training, never at prediction
    [ ] Because thresholding applies only to regression outputs
- Q: Which belief about the boosted model's final predictions is a misconception to avoid?
    [CORRECT] That the internal score is itself the class label, with no threshold step
    [ ] That 0.5 is a common default decision threshold applied to the probability
    [ ] That predicted probabilities can be thresholded to yield discrete classes
    [ ] That the raw model score is just an intermediate quantity, not the answer
- Q: If the predicted probability for class 1 exceeds the chosen threshold, what does the model predict?
    [ ] Its prediction is undefined
    [ ] It predicts class 0
    [ ] It discards the example
    [CORRECT] It predicts class 1

### Performance Trade-offs: Sensitivity to Noisy Data and Outliers

- Q: Before training a revenue model, a marketing analyst finds extreme order values. Some may be data errors, but some may be genuine enterprise buyers whose behavior the business cares about. Which approach best balances losing signal against letting outliers distort the model?
    [ ] Remove every point beyond three standard deviations from the mean
    [ ] Keep all rows untouched because outliers always carry real signal
    [CORRECT] Cap extreme targets at a high percentile and validate the effect
    [ ] Duplicate the extreme rows so the model weights them more heavily
- Q: A marketer predicts customer lifetime value with gradient boosting using squared error loss. A few whale customers with enormous spend dominate training, and predictions for typical customers suffer. What is the most appropriate fix?
    [ ] Train with plain squared error since it converges the fastest here
    [ ] Delete the whale customers since they are clear statistical outliers
    [ ] Add more whale examples so the model sees that pattern more often
    [CORRECT] Train with Huber or absolute error loss to limit the whales' pull
- Q: A retail analyst suspects their click-to-purchase labels are noisy because of double-counted pixel fires. They must choose between a random forest and gradient boosting on the same tabular features. Which choice is generally more robust to this label noise, and why?
    [CORRECT] Random forest, since averaging independent trees dilutes the noise
    [ ] Gradient boosting, since each new tree corrects earlier label errors
    [ ] Gradient boosting, since its learning rate filters out noisy rows
    [ ] Random forest, since deeper trees can isolate the few noisy rows
- Q: A team models purchase amounts using a decision tree, and a handful of customers spend 50 times more than everyone else. Why does the tree handle these extreme feature values better than a plain linear regression would?
    [ ] It scales all input features to unit variance before choosing splits
    [CORRECT] It splits on feature ordering, so the size of a value barely matters
    [ ] It fits a smooth global curve that flattens out the extreme values
    [ ] It averages many features together, diluting each of the extreme values
- Q: A marketer trains an AdaBoost classifier to predict email conversions, but a past tracking bug mislabeled a slice of the training examples. Compared with a clean dataset, what behavior should they expect from AdaBoost on this noisy data?
    [ ] AdaBoost will average out the mislabeled rows across its weak learners
    [ ] AdaBoost will detect the mislabeled rows and exclude them from training
    [CORRECT] AdaBoost will keep raising the weight of mislabeled rows and fit the noise
    [ ] AdaBoost will ignore the mislabeled rows once early stopping is applied

