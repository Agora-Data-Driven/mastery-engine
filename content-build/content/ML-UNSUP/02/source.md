# SOURCE PACK — Machine Learning / Unsupervised Learning / Dimensionality Reduction

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Dimensionality Reduction   (13 questions)

## Already taught earlier in this course

- Anomaly Detection
- When to Use Anomaly Detection
- Anomaly Detection vs. Supervised Learning
- Gaussian / Normal Distribution
- Mean and Variance in Gaussian Modeling
- Estimating Gaussian Parameters from Data
- Density Estimation for Anomaly Detection
- Multivariate Anomaly Detection via Per-Feature Gaussians
- Anomaly Threshold Epsilon
- Building and Evaluating an Anomaly Detection System
- Cross-Validation for Anomaly Detection
- Precision, Recall, and F1 for Rare Anomalies
- Feature Engineering for Anomaly Detection
- Transforming Features to Be More Gaussian

## Covered by LATER lessons — do not teach these here

- Clustering with K-Means: Clustering as Structure Discovery in Unlabeled Data, Clustering vs. Supervised Classification, Cluster Centroids, K-Means Clustering, K-Means Assignment Step, K-Means Centroid Update Step, K-Means Cost Function / Distortion Objective, K-Means Convergence, Why K-Means Converges, Random Initialization in K-Means, Multiple Random Initializations for Better Clustering, Choosing the Number of Clusters K, Limits of the Elbow Method, Choosing K Based on Downstream Use

## The live quiz bank for these topics — 13 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Dimensionality Reduction

- Q: What is a key practical reason dimensionality reduction can matter?
    [ ] It keeps the feature count exactly identical to before
    [ ] It recasts every single learning problem as a regression task
    [ ] It always raises model accuracy no matter the situation
    [CORRECT] It simplifies large data while keeping useful structure
- Q: What is the main purpose of dimensionality reduction?
    [ ] To add extra features so the model grows more complex
    [ ] To assign a correct label to each unlabeled example
    [ ] To guarantee that predictions become perfectly accurate
    [CORRECT] To compress data into fewer dimensions, losing little
- Q: You have a regression problem where the target $y$ depends on only 3 of 200 features, which are highly correlated with each other but uncorrelated with the noise features. Before training a model, you reduce the 200 features to 3 via PCA and fit the model on the components. Which outcome is most likely?
    [CORRECT] The model will underperform compared to using the original 3 features, because the components mix in noise features
    [ ] The model will match the performance of using the original 3 features exactly, since PCA extracts all signal
    [ ] The model will outperform the original 3 features by exploiting subtle nonlinearities that PCA discovers
    [ ] The model will achieve the same training error but higher test error, due to the curse of dimensionality reversal
- Q: Why is dimensionality reduction considered a form of unsupervised learning?
    [ ] Because it relies on reinforcement-style reward signals
    [ ] Because its goal is always to predict discrete categories
    [ ] Because it can only be run after a classification step
    [CORRECT] Because it works on inputs without needing output labels
- Q: A colleague claims: "After reducing 100 features to 10 via PCA, I can interpret each new axis as a specific original feature that survived the reduction." What is the most precise refutation?
    [CORRECT] Each principal component is a linear combination of all original features, not a selection of one
    [ ] PCA discards features randomly, so no single feature is guaranteed to remain intact in the output
    [ ] The axes switch meaning during reconstruction, so interpretation is only valid in the original space
    [ ] Principal components are nonlinear functions of the inputs, making direct feature mapping impossible
- Q: A dataset has features $X_1$, $X_2$, and $X_3$. You compute their pairwise Pearson correlations: $r_{12} = 0.91$, $r_{13} = -0.88$, $r_{23} = -0.85$. If you apply PCA and retain the first principal component only, what does its loading vector most likely represent?
    [CORRECT] A direction capturing the shared variance of $X_1$ and the opposite pole of $X_2$-$X_3$ combined
    [ ] A direction that separates $X_1$ from a cluster formed by $X_2$ and $X_3$ with equal weight
    [ ] A direction strictly aligned with $X_1$ since it has the strongest individual correlation magnitudes
    [ ] A direction orthogonal to all three original axes, capturing noise not present in pairwise relationships
- Q: A dataset has $p = 100$ features and $n = 80$ observations. You apply PCA and find that only 79 eigenvalues are nonzero. A student asks why the 80th is exactly zero. What is the correct explanation?
    [CORRECT] The centered data matrix has rank at most $n-1$, so the covariance matrix cannot have more than 79 nonzero eigenvalues
    [ ] The 80th component corresponds to the mean vector, which PCA suppresses by construction
    [ ] Eigenvalues beyond the 79th are rounded to zero by numerical underflow in the SVD algorithm
    [ ] PCA enforces a sparsity constraint that zeros out components exceeding the observation count
- Q: You perform PCA twice on the same dataset: once on the raw features and once after standardizing each feature to zero mean and unit variance. The first two eigenvalues for the raw data are $\lambda_1 = 48.2$, $\lambda_2 = 3.1$. After standardization, they are $\lambda_1' = 2.4$, $\lambda_2' = 1.9$. What does this dramatic shift in the first eigenvalue most strongly suggest?
    [CORRECT] At least one original feature had a variance vastly larger than the others, dominating the first PC
    [ ] Standardization introduced multicollinearity, inflating the leading eigenvalue artificially
    [ ] The raw data contained outliers that PCA suppressed, but standardization amplified their influence
    [ ] The number of meaningful dimensions doubled, spreading the leading eigenvalue across two components
- Q: You run PCA on a centered $n \times p$ design matrix $\mathbf{X}$ and obtain scores $\mathbf{T} = \mathbf{X} \mathbf{W}$. The columns of $\mathbf{W}$ are orthonormal eigenvectors of $\mathbf{X}^\top \mathbf{X}$. You then reconstruct the data as $\hat{\mathbf{X}}_k$ using only the first $k$ loadings. Which quantity is minimized by this reconstruction?
    [CORRECT] The Frobenius norm of the reconstruction error, $\lVert \mathbf{X} - \hat{\mathbf{X}}_k \rVert_F^2$
    [ ] The sum of absolute deviations between $\mathbf{X}$ and $\hat{\mathbf{X}}_k$ across all entries
    [ ] The maximum entrywise absolute difference in the matrix $\mathbf{X} - \hat{\mathbf{X}}_k$
    [ ] The Kullback-Leibler divergence between the empirical covariance of $\mathbf{X}$ and that of $\hat{\mathbf{X}}_k$
- Q: Which outcome best reflects successful dimensionality reduction?
    [ ] More dimensions, with added redundancy in the features
    [ ] A perfectly correct predicted label for every example
    [CORRECT] Fewer dimensions, with the key information preserved
    [ ] Complete removal of any need for data preprocessing
- Q: Which misunderstanding about dimensionality reduction should be avoided?
    [CORRECT] That it shrinks the representation deliberately, not arbitrarily
    [ ] That it can only ever be applied to image datasets in practice
    [ ] That it just means dropping columns chosen completely at random
    [ ] That it counts as supervised because it changes the model's inputs
- Q: After applying PCA to a dataset of housing prices with features like square footage, number of rooms, and lot size, you find that PC1 explains 94% of the variance and its loading vector has nearly equal positive weights on all features. What is the most defensible interpretation?
    [CORRECT] PC1 captures an underlying 'size' factor that all three features redundantly measure
    [ ] The features are uncorrelated, and PC1 randomly aligns with their centroid by chance
    [ ] PC1 corresponds to square footage alone, with the other features contributing negligible signal
    [ ] The equal weights indicate a degenerate solution where PCA failed to find optimal directions
- Q: You have a binary classification task with 500 continuous features. You apply PCA before training a logistic regression. The validation accuracy peaks at 30 components, then degrades as more are added. Which phenomenon best explains the degradation beyond the peak?
    [CORRECT] Later components primarily model variance from noise, overfitting the classifier when included
    [ ] The orthogonality constraint collapses and components begin correlating, inflating the feature space
    [ ] Logistic regression becomes numerically unstable when the number of components exceeds $\sqrt{n}$
    [ ] The reconstruction error grows non-monotonically, introducing artifacts after a certain rank threshold

