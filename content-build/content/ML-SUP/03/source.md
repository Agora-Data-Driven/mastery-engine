# SOURCE PACK — Machine Learning / Supervised Machine Learning / Support Vector Machines

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Core Idea of Support Vector Machines   (5 questions)
2. The Kernel Trick   (5 questions)
3. When to Use SVMs: Strengths and Limitations   (3 questions)

## Already taught earlier in this course

- Derivatives and Gradient Descent Intuition
- Gradient Descent
- Learning Rate and Convergence
- Batch Gradient Descent
- Gradient Descent for Multiple Linear Regression
- Normal Equation vs. Gradient Descent
- Limitations of Linear Regression for Classification
- Logistic Regression
- Decision Boundary
- L2 (Ridge) Regularization for Linear and Logistic Regression
- L1 (Lasso) Regularization and Feature Sparsity
- Elastic Net Regularization

## Covered by LATER lessons — do not teach these here

- Linear Regression & Cost Functions: Linear Regression Model, Cost Function and Squared Error, Visualizing the Cost Function, Cost Function Intuition and Model Fit, Why Linear Regression’s Cost Function Has a Global Minimum, Multiple Linear Regression

## The live quiz bank for these topics — 13 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Core Idea of Support Vector Machines

- Q: How does the SVM approach address cases where a straight-line classifier failed?
    [ ] It shows that linear classifiers were never actually useful at all
    [ ] It abandons the idea of maximizing the margin entirely
    [CORRECT] It changes the representation so nonlinear patterns can separate
    [ ] It recasts the whole classification task as a regression problem
- Q: After the data is mapped to a higher-dimensional space, what stays linear?
    [ ] The chosen kernel parameter value
    [ ] The original feature space, which stays unchanged
    [ ] The class labels assigned to the points
    [CORRECT] The classifier built in the transformed space
- Q: What is the central idea behind a support vector machine?
    [CORRECT] Map data to a higher dimension, then fit a linear separator
    [ ] Fit a polynomial curve directly to the numeric output labels
    [ ] Replace each class with its centroid, then classify by distance
    [ ] Run a decision tree first and classify based on its output
- Q: Why can moving the data to a higher-dimensional space help with classification?
    [ ] It guarantees a wider margin back in the original space
    [ ] It always reduces the amount of training data that is required
    [CORRECT] Points inseparable by a line originally may separate there
    [ ] It automatically detects and removes outlier data points
- Q: Which belief about how SVMs work is a misconception to avoid?
    [ ] Higher-dimensional representations are central to the intuition
    [CORRECT] They draw arbitrary curves in the original space with no remapping
    [ ] Changing the representation can help with nonlinear data
    [ ] A linear classifier is still what gets found in the transformed space

### The Kernel Trick

- Q: What does the kernel trick allow a support vector machine to do?
    [ ] Hand-select the optimal full set of support vectors before any fitting even begins
    [CORRECT] Compute inner products in a high-dimensional space without mapping the data there
    [ ] Standardize and rescale all of the raw input features prior to training the model
    [ ] Convert a binary classifier into a continuous-valued regression model automatically
- Q: Why is the kernel trick especially important when using a kernel such as the RBF kernel?
    [ ] The RBF kernel relies on no notion of distance between any points whatsoever
    [ ] Using the RBF kernel removes the need to retain any support vectors at all
    [CORRECT] Its implied feature space can be extremely large or even infinite-dimensional
    [ ] The RBF kernel always induces a strictly linear, flat, global decision boundary
- Q: Which belief about the kernel trick is a misconception to avoid?
    [CORRECT] That a kernel must physically expand each example into explicit coordinates
    [ ] That a kernel makes high-dimensional comparisons computationally feasible
    [ ] That a kernel evaluates a similarity function between given pairs of points
    [ ] That a kernel implies some underlying transformed higher-dimensional space
- Q: What does the kernel trick let an SVM avoid doing explicitly?
    [ ] Running any form of cross-validation to pick parameters from the given data
    [ ] Measuring the similarity or distance between individual pairs of data points
    [ ] Making any use of the available class labels during the training procedure
    [CORRECT] Constructing all the transformed coordinates in the higher-dimensional space
- Q: Why is the kernel trick valuable in practice?
    [ ] It guarantees a fully interpretable, human-readable final decision boundary
    [ ] It removes any need to choose or tune the model's hyperparameters at all
    [ ] It applies only to ordinary least-squares linear regression style problems
    [CORRECT] It cuts computation while still enabling rich high-dimensional comparisons

### When to Use SVMs: Strengths and Limitations

- Q: You train a linear SVM on a 1000-dimensional text dataset with only 200 training examples. The model achieves 100% training accuracy but performs poorly on a held-out validation set. Which single adjustment is most likely to improve generalization without fundamentally changing the model class?
    [ ] Increase the regularization parameter $C$ to allow more margin violations.
    [CORRECT] Decrease the regularization parameter $C$ to penalize margin violations more heavily.
    [ ] Switch from a linear kernel to an RBF kernel with a small $\gamma$ value.
    [ ] Increase the dimensionality by adding polynomial feature interactions before training.
- Q: You apply an SVM with RBF kernel to a binary classification problem and observe that all support vectors lie exactly on the margin boundaries, with none inside the margin. What does this observation most directly imply about your model's fit?
    [ ] The training data is perfectly linearly separable in the original input space.
    [ ] The value of $C$ is effectively infinite, prohibiting any margin violations.
    [ ] The kernel width $\gamma$ is too small, causing each point to form its own local neighborhood.
    [CORRECT] The training data is perfectly separable in feature space with no margin violations occurring.
- Q: A dataset contains 10,000 samples with 50 features, but only 80 of the samples belong to the positive class. You need a classifier that outputs well-calibrated probability estimates for ranking. An SVM is trained using Platt scaling. In what way does the extreme class imbalance most directly compromise the resulting probability estimates?
    [ ] The hinge loss function is asymmetric by design and inherently underestimates minority class probabilities.
    [CORRECT] The sigmoid fit for Platt scaling is dominated by the majority class, yielding biased probability outputs.
    [ ] SVMs compute distances from the separating hyperplane, which are not meaningful probability surrogates.
    [ ] The kernel matrix becomes ill-conditioned when one class has far fewer examples, distorting Platt scaling.

