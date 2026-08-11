# SOURCE PACK — Machine Learning / Unsupervised Learning / Clustering with K-Means

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Clustering as Structure Discovery in Unlabeled Data   (10 questions)
2. Clustering vs. Supervised Classification   (11 questions)
3. Cluster Centroids   (10 questions)
4. K-Means Clustering   (10 questions)
5. K-Means Assignment Step   (11 questions)
6. K-Means Centroid Update Step   (10 questions)
7. K-Means Cost Function / Distortion Objective   (11 questions)
8. K-Means Convergence   (10 questions)
9. Why K-Means Converges   (10 questions)
10. Random Initialization in K-Means   (10 questions)
11. Multiple Random Initializations for Better Clustering   (25 questions)
12. Choosing the Number of Clusters K   (7 questions)
13. Limits of the Elbow Method   (10 questions)
14. Choosing K Based on Downstream Use   (7 questions)

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
- Dimensionality Reduction

## The live quiz bank for these topics — 152 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Clustering as Structure Discovery in Unlabeled Data

- Q: What is the primary objective of clustering, an unsupervised technique applied to unlabeled data?
    [ ] To minimize the prediction bias of a linear model
    [CORRECT] To uncover groups or patterns not specified or labeled in advance
    [ ] To fit weights and biases that match given output labels
    [ ] To predict a continuous target value from input features
- Q: How does market segmentation illustrate clustering applied to a customer database?
    [ ] It manually tags each customer as Type 1 or Type 2 by their age
    [CORRECT] It automatically finds distinct groups by motivation and behavior
    [ ] It predicts the exact product a customer buys via linear regression
    [ ] It compresses the customer count to make plotting easier
- Q: Which task best illustrates clustering as structure discovery?
    [ ] Predicting a house's sale price from its floor area
    [ ] Diagnosing a tumor as either benign or malignant
    [CORRECT] Sorting unlabeled news articles into emergent topic groups
    [ ] Translating a sentence from English into Spanish
- Q: What is the core goal of clustering?
    [ ] To strip every source of variation out of the dataset
    [CORRECT] To uncover useful structure in data that has no output labels
    [ ] To fit a best line through a set of labeled points
    [ ] To estimate class probabilities for a binary label
- Q: Which statement best describes what makes a clustering algorithm "unsupervised"?
    [ ] It is supplied the correct output label for each input example
    [CORRECT] It must figure out on its own what structure exists in the data
    [ ] It relies on a cross-validation set to reduce model variance
    [ ] It is restricted to discovering only linear decision boundaries
- Q: Why is clustering categorized as unsupervised learning?
    [ ] Because it is unable to process numerical features
    [ ] Because each example must be labeled manually by a person
    [CORRECT] Because it receives no correct output label for any example
    [ ] Because it is given no input features whatsoever
- Q: Why can clustering still be valuable even when the true groups are unknown in advance?
    [ ] Because it only runs when the groups are already plainly obvious
    [CORRECT] Because it can expose patterns that help organize or understand the data
    [ ] Because it removes any need to inspect the resulting groups
    [ ] Because it is guaranteed to return the single correct grouping
- Q: Which belief about clustering is a misconception to avoid?
    [CORRECT] During training it is told the correct group label for each example
    [ ] It tends to place similar examples together within the same group
    [ ] It can serve as a genuinely useful tool for exploratory data analysis
    [ ] It searches for hidden structure without any labeled output data
- Q: Applied to DNA microarray data, what does clustering let researchers discover?
    [CORRECT] Distinct types of individuals grouped by genetic activity, with no labels supplied
    [ ] A regression estimate predicting the eventual dollar cost of a medical procedure
    [ ] The single shortest connecting path running between two given specified DNA segments
    [ ] The single most frequently expressed gene found across an entire human population
- Q: Why might an astronomer apply clustering to data about bodies in space?
    [ ] To compute the distance to Mars using a GPS positioning method
    [ ] To predict a star's surface temperature with supervised learning
    [ ] To attach names to stars that are already individually identified
    [CORRECT] To see whether bodies group into coherent structures like galaxies

### Clustering vs. Supervised Classification

- Q: An analyst receives a dataset where each row contains a customer's annual spending on electronics, clothing, and groceries, along with the number of support calls last year. No column indicates customer segments or churn status. The goal is to divide customers into distinct groups for targeted marketing. Considering the nature of the data, which approach is appropriate for this task?
    [CORRECT] Clustering, because the dataset lacks a target label and only contains input features $x^{(i)}$
    [ ] Supervised classification, because the spending and calls columns serve as labels $y^{(i)}$
    [ ] Clustering, because predicting churn status requires grouping similar customers first
    [ ] Supervised classification, because any dataset with more than one feature is a classification problem
- Q: What is the main difference between clustering and supervised classification?
    [ ] Clustering predicts the known labels while classification groups unaided
    [ ] Clustering handles only image data while classification handles text
    [CORRECT] Clustering finds structure in unlabeled data; classification uses labels
    [ ] They are identical except for which optimizer trains the model used
- Q: Why is grouping customers into market segments usually treated as a clustering task rather than supervised classification?
    [ ] Because every customer belongs to infinitely many distinct categories
    [ ] Because clustering methods only work on business and finance data
    [CORRECT] Because the segments are typically not provided in advance as labeled outputs
    [ ] Because supervised classification cannot be trained with gradient descent
- Q: Which statement about clustering versus classification is a misconception to avoid?
    [ ] Supervised classification depends on having labeled examples
    [ ] Clustering operates on data that has no output labels
    [CORRECT] Clustering is merely classification that achieves lower accuracy
    [ ] The two address related tasks but rest on different label assumptions
- Q: What does supervised classification require during training that clustering does not?
    [ ] An explicit cost function for it to try to minimize
    [ ] A separate held-out validation set used for tuning
    [ ] More than just a single input feature per example
    [CORRECT] Labeled examples giving the correct output category
- Q: Why is clustering best described as structure discovery?
    [ ] Because it always splits any given dataset into exactly two classes
    [CORRECT] Because it surfaces patterns or groupings latent in unlabeled data
    [ ] Because it memorizes the category label attached to each example
    [ ] Because it outputs one continuous numeric prediction per example
- Q: Which algorithm learns a decision boundary between known, labeled classes?
    [ ] Principal Component Analysis
    [CORRECT] Logistic regression
    [ ] The normal equation
    [ ] The K-means clustering algorithm
- Q: In terms of the dataset provided, what is the fundamental difference between supervised classification and clustering?
    [ ] Supervised classification needs large data, while clustering needs small data
    [CORRECT] Supervised classification gives a target label y per input, while clustering gives only inputs x
    [ ] Supervised classification uses only inputs x, while clustering uses both x and labels y
    [ ] There is no real difference, since both just find decision boundaries
- Q: Why is clustering classified as an unsupervised learning algorithm?
    [ ] It applies a sigmoid function to output class probabilities
    [CORRECT] It finds structure in data without being given labeled right answers
    [ ] It requires the user to supply the target variable y
    [ ] It must be guided step by step by a human analyst
- Q: In the Google News example, why is grouping related stories treated as clustering rather than supervised classification?
    [ ] Because the story groupings are actually produced by a previously fitted linear regression model
    [CORRECT] Because topics shift daily and staff cannot keep hand-labeling which stories belong together
    [ ] Because every incoming news story already arrives carefully pre-labeled by staff journalists
    [ ] Because the system can process only attached photographs and cannot read any of the article text
- Q: Looking at a scatter plot of the data, how can you tell a supervised classification task from an unsupervised clustering task?
    [CORRECT] Supervised points are marked by class (e.g., crosses vs. circles), while clustering points are unlabeled dots
    [ ] Supervised points are scattered randomly across the plot, while clustering points form tight structured groups
    [ ] Supervised data always forms smoothly curving nonlinear bands, while clustering data always falls on a line
    [ ] Supervised data is always plotted in full 3D space, while clustering data is shown flat in only two dimensions

### Cluster Centroids

- Q: What happens to the centroids over the course of K-means training?
    [CORRECT] They are repeatedly recomputed from their assigned examples
    [ ] They are discarded after the first assignment pass
    [ ] They gradually turn into the target class labels
    [ ] They stay fixed at their random initial positions
- Q: How is each centroid typically computed in K-means?
    [ ] By sorting the examples and taking the median index
    [ ] By selecting the single densest data point
    [ ] By maximizing distance to every data point
    [CORRECT] By averaging the points assigned to that cluster
- Q: Which cluster centroid does K-means assign a training example $x^{(i)}$ to?
    [CORRECT] The centroid located closest to that example
    [ ] The centroid that currently carries the highest weight
    [ ] A centroid selected at random by the algorithm
    [ ] The centroid located farthest from that example
- Q: In K-means, what does the parameter $\mu_k$ denote?
    [ ] The total number of training examples
    [CORRECT] The position of the k-th cluster centroid
    [ ] The straight-line distance between two data points
    [ ] The step size used to update the model
- Q: Which common misconception about K-means centroids should be avoided?
    [ ] A centroid can shift to a new location on each iteration
    [ ] A centroid acts as a reference for assigning nearby points
    [CORRECT] A centroid must coincide with an actual data point in its cluster
    [ ] A centroid is the mean of the points currently assigned to it
- Q: What is the recommended way to choose the initial positions of the K cluster centroids?
    [ ] Sort the data and take the first K points in order
    [ ] Set all K centroids at the origin point (0, 0)
    [CORRECT] Pick K training examples at random and use their locations
    [ ] Place the centroids as far from the data as possible
- Q: How does a cluster centroid's location change during the move step of K-means?
    [ ] It stays fixed in place until the algorithm converges
    [ ] It jumps to the single point that is farthest from it
    [CORRECT] It moves to the average location of its assigned points
    [ ] It drifts steadily toward the origin each iteration
- Q: If the first training example $x^{(1)}$ is assigned to cluster centroid 1, what value does the assignment variable $c^{(1)}$ take?
    [CORRECT] 1
    [ ] $\mu_1$
    [ ] 0
    [ ] 47
- Q: Why are centroids central to how K-means works?
    [ ] They are stored so the raw training data can be discarded
    [ ] They are only consulted once the algorithm has converged
    [CORRECT] They serve as the reference points for assigning each example to a cluster
    [ ] They supply the ground-truth labels needed for supervised training
- Q: In K-means clustering, what does a centroid represent?
    [ ] The running average of the cost function
    [ ] A human-chosen labeled training example
    [ ] The data point farthest from all clusters
    [CORRECT] The representative center point of a cluster

### K-Means Clustering

- Q: What does the K in K-means stand for?
    [CORRECT] The number of clusters the algorithm forms
    [ ] The number of labels already present in the data
    [ ] The number of training iterations that are required
    [ ] The number of input features in the data
- Q: Why is K-means considered an unsupervised algorithm?
    [ ] Because it accepts only categorical input data
    [ ] Because it disregards the distances between points
    [CORRECT] Because it operates without any labeled outputs
    [ ] Because it outputs a probability for each class
- Q: What does K-means produce as output for each example?
    [ ] The value of a gradient or derivative
    [CORRECT] An assignment to one of the K clusters
    [ ] A real-valued regression prediction
    [ ] A binary anomaly score and nothing else
- Q: What two steps does the K-means clustering algorithm repeat on each iteration?
    [ ] Running a full forward propagation pass, then performing complete backpropagation of the output errors
    [CORRECT] Assigning each point to its nearest centroid, then moving each centroid to the mean of its points
    [ ] Computing the best-fit regression line's slope, then algebraically solving for its y-intercept
    [ ] Applying min-max feature scaling to all the inputs, then performing per-feature mean normalization
- Q: What must happen before K-means can start its iterative assign-and-update loop?
    [ ] The cost function's global minimum must be computed first
    [ ] Every training example must first be labeled by hand
    [CORRECT] The K cluster centroids must be randomly initialized
    [ ] The data must be mapped into an infinite-dimensional space
- Q: Why might a t-shirt manufacturer run K-means on customers' height and weight data?
    [CORRECT] To group customers into sizes such as small, medium, and large
    [ ] To predict each customer's gender from their measurements
    [ ] To total up the fabric cost required for every shirt
    [ ] To flag which incoming t-shirt orders are fraudulent
- Q: What happens during the "move centroid" step of K-means?
    [ ] The whole dataset is recentered to have zero mean
    [CORRECT] Each centroid is reset to the mean of the points currently assigned to it
    [ ] The number of clusters K is incremented by one
    [ ] Each data point is shifted to coincide with its nearest neighbor
- Q: Which belief about K-means is a misconception to avoid?
    [ ] It groups unlabeled input data points into K clusters by similarity
    [ ] It is one very common example of an unsupervised clustering algorithm
    [ ] The value of K is chosen in advance by the practitioner who runs it here
    [CORRECT] It learns predefined labeled categories, like supervised classification
- Q: What is the K-means algorithm trying to accomplish?
    [ ] Estimate a continuous output by fitting a line
    [ ] Locate the global minimum of a neural network's loss
    [ ] Predict a target value y from input features x
    [CORRECT] Partition the data into K groups by similarity
- Q: What does K-means take as input with respect to labels?
    [CORRECT] A set of training examples that carry no labels
    [ ] A vector y holding the ground-truth label of each example
    [ ] A continuous target variable such as a price for each example
    [ ] A binary classification label, either 0 or 1, per example

### K-Means Assignment Step

- Q: What happens when a point $x^{(i)}$ is exactly equidistant from two cluster centroids?
    [ ] The algorithm halts at once with an unrecoverable runtime error
    [ ] It is permanently counted as a member of both clusters all at once
    [CORRECT] It may go to either one, by convention the lower-indexed centroid
    [ ] Both of the tied centroids are immediately moved onto that point
- Q: Which variable records the index of the cluster that a given training example is assigned to?
    [ ] $K$
    [ ] $\mu_k$
    [ ] $x^{(i)}$
    [CORRECT] $c^{(i)}$
- Q: Why is the assignment step needed in each K-means iteration?
    [ ] It locks in the correct number of clusters K
    [ ] It strips out the outliers before clustering begins
    [ ] It computes the gradients used for backpropagation
    [CORRECT] It decides which cluster currently fits each example best
- Q: When the assignment step calls a centroid the "nearest" one, nearness is measured by what?
    [ ] Order of the examples in the alphabet
    [ ] Closeness of their data-collection timestamps
    [ ] Agreement in the predicted output label
    [CORRECT] Distance from the example to the centroid
- Q: You are performing the K-Means assignment step on three data points: $A = (2, 9)$, $B = (5, 6)$, $C = (8, 3)$. The current cluster centroids are $\mu_1 = (3, 8)$ and $\mu_2 = (7, 4)$. Using squared Euclidean distance, which of the following shows the correct cluster assignments?
    [CORRECT] $A \to 1$, $B \to 1$, $C \to 2$
    [ ] $A \to 1$, $B \to 2$, $C \to 2$
    [ ] $A \to 2$, $B \to 1$, $C \to 2$
    [ ] $A \to 1$, $B \to 2$, $C \to 1$
- Q: During the assignment step of $K$-means, are the cluster centroids $\mu_1$ through $\mu_K$ updated?
    [CORRECT] No, they hold still while only the point assignments change
    [ ] Yes, every centroid is randomly reset before assigning points
    [ ] No, each centroid is removed and then later replaced entirely
    [ ] Yes, each one shifts toward the points lying nearest to it
- Q: In the assignment step of K-means, what does the algorithm do for each training example $x^{(i)}$?
    [ ] It relocates the nearest centroid onto $x^{(i)}$
    [ ] It places $x^{(i)}$ into a randomly chosen cluster
    [CORRECT] It assigns $x^{(i)}$ to its closest cluster centroid
    [ ] It computes the mean of every point in the dataset
- Q: What does a single assignment step produce?
    [CORRECT] A cluster index labeling each example
    [ ] Updated regression weights for the model
    [ ] A freshly recomputed feature matrix
    [ ] A set of anomaly-detection thresholds
- Q: Which misconception about the K-means assignment step should be avoided?
    [CORRECT] Examples are assigned at random each pass, ignoring centroid positions
    [ ] Each example is assigned to whichever centroid is closest to it
    [ ] Assignment is one of the two steps K-means repeats each round
    [ ] An example's assignment can change from one iteration to the next
- Q: When assigning a point $x^{(i)}$ to a cluster, which quantity does K-means minimize?
    [ ] The square of the gradient-descent learning step size
    [CORRECT] The squared distance from $x^{(i)}$ to its assigned centroid
    [ ] The summed total of all feature values belonging to $x^{(i)}$
    [ ] The variance of every feature computed over the whole dataset
- Q: What occurs during the assignment step of K-means?
    [ ] Each prediction is compared against the ground-truth label
    [ ] Every centroid is moved to the mean of the whole dataset
    [ ] The current number of clusters is automatically doubled
    [CORRECT] Each example is assigned to its nearest centroid

### K-Means Centroid Update Step

- Q: In the K-means update step, what is the usual handling when a centroid has no points assigned to it?
    [ ] The distortion cost immediately jumps to infinity
    [ ] The algorithm halts and reports convergence
    [CORRECT] The centroid is left in place or simply removed
    [ ] A nearby point is automatically reassigned to it
- Q: A cluster has exactly two assigned points, (1, 2) and (3, 4). After the update step, where does its centroid move?
    [ ] (4, 6)
    [ ] (3, 4)
    [ ] (1, 2)
    [CORRECT] (2, 3)
- Q: How does the centroid update step interact with the assignment step that follows it?
    [ ] The moved centroids permanently freeze every later cluster assignment
    [CORRECT] The moved centroids can change which examples are now nearest to each
    [ ] The moved centroids reset the chosen cluster count K all on their own
    [ ] The moved centroids remove any further need to check for convergence
- Q: What occurs during the centroid update step of K-means?
    [ ] The data is relabeled using the ground-truth classes
    [CORRECT] Each centroid moves to the mean of its assigned points
    [ ] The algorithm's learning rate is decreased a notch
    [ ] Each example is reassigned to the nearest centroid
- Q: Why does the centroid update depend on the current cluster assignments?
    [CORRECT] Because each centroid is recomputed from the points assigned to it
    [ ] Because the centroid update is driven by backpropagated gradients
    [ ] Because K-means relies on externally supplied ground-truth labels
    [ ] Because the centroids are defined without any reference to the data
- Q: How does the centroid update step affect the K-means distortion (cost function) J?
    [CORRECT] It decreases J or leaves it unchanged
    [ ] It resets J exactly to zero each time
    [ ] It always increases J by a fixed amount
    [ ] It has no measurable effect on J at all
- Q: In the K-means update step, how is the new position of each cluster centroid computed?
    [ ] The mean of the coordinates of every example in the entire training set
    [ ] The coordinates of the single training point lying nearest to the old centroid
    [CORRECT] The mean of the coordinates of the points currently assigned to that centroid
    [ ] The old centroid position shifted by a fixed step toward the coordinate origin
- Q: Which misconception about the centroid update step should be avoided?
    [CORRECT] Centroids are updated independently of their assigned points
    [ ] Updating centroids is one of K-means' two repeated steps
    [ ] Each centroid is recomputed from its current cluster members
    [ ] A centroid's position can change on every iteration
- Q: During the centroid update step of K-means, which quantity is held fixed while the centroids are recomputed?
    [ ] The number of training examples $m$
    [CORRECT] The cluster assignment $c^{(i)}$ of each point
    [ ] The gradient-descent learning rate $\alpha$
    [ ] The positions of the cluster centroids
- Q: What is the intuition behind moving a centroid to the mean of its assigned points?
    [ ] It deliberately drives the clustering cost toward its maximum value
    [CORRECT] It positions the centroid centrally among that cluster's points
    [ ] It makes all of the points within that cluster become identical
    [ ] It forces every cluster to end up holding the very same point count

### K-Means Cost Function / Distortion Objective

- Q: What does the K-means distortion (cost) objective measure?
    [ ] The summed pairwise distance between every pair of cluster centroids
    [ ] The probability that a given data point is an anomaly or outlier
    [CORRECT] The total squared distance from points to their assigned centroids
    [ ] The classification accuracy achieved on labeled training examples
- Q: A small dataset has three points: $(0,0)$, $(2,0)$, and $(3,0)$. You run K-means with $K=2$ and consider two possible clusterings. Clustering A: points $(0,0)$ and $(2,0)$ in one cluster, point $(3,0)$ alone in the other. Clustering B: point $(0,0)$ alone in one cluster, points $(2,0)$ and $(3,0)$ in the other. Using the distortion $J(c, \mu) = \frac{1}{m} \sum_{i=1}^{m} \Vert x^{(i)} - \mu_{c^{(i)}} \Vert^2$, how do $J_A$ and $J_B$ compare, and which clustering is better?
    [ ] $J_A = \frac{2}{3}$, $J_B = \frac{2}{3}$; they are equally good because both use two clusters
    [ ] $J_A = \frac{1}{3}$, $J_B = \frac{1}{3}$; they are equally good because the total sum of squared distances is the same
    [ ] $J_A = \frac{2}{3}$, $J_B = \frac{1}{3}$; clustering B is better because it has lower distortion
    [CORRECT] $J_A = \frac{1}{3}$, $J_B = \frac{2}{3}$; clustering A is better because it has lower distortion
- Q: Why compare the final distortion J across several K-means runs that used different random initializations?
    [ ] To count how many input features the dataset contains
    [CORRECT] To select the run that produced the lowest-distortion clustering
    [ ] To estimate how old the training examples happen to be
    [ ] To find out which run was given the largest learning rate
- Q: What does the K-means cost function (distortion) J measure for a given clustering?
    [CORRECT] The average squared distance from each point to its assigned centroid
    [ ] The total count of the distinct clusters used in the current solution
    [ ] The probability that a given training example is a flagged outlier anomaly
    [ ] The numerical gap between the dataset's feature mean and feature variance
- Q: Why is a smaller value of the K-means distortion objective generally better?
    [ ] It proves the clustering model was trained with supervised labels
    [ ] It implies there are now more clusters than there are input features
    [CORRECT] It means points lie closer on average to their assigned centroids
    [ ] It indicates the underlying data are linearly separable into classes
- Q: A K-means solution has a very high distortion cost J. What does this generally indicate?
    [ ] Points are tightly packed around their assigned centroids
    [ ] The algorithm has settled at the true global minimum
    [CORRECT] Centroids are placed poorly and points sit far from their centers
    [ ] The clustering is using far too many separate clusters
- Q: Which distances contribute to the K-means distortion objective?
    [ ] Distances from each point to predefined labeled categories
    [ ] Distances measured only between the cluster centroids themselves
    [ ] Distances from each point to the coordinate origin only
    [CORRECT] Distances from each point to the centroid it is assigned to
- Q: Which expression is the K-means distortion cost $J$, where $\mu_c^{(i)}$ is the centroid assigned to example $x^{(i)}$?
    [ ] $-y\log(f) - (1-y)\log(1-f)$
    [CORRECT] $\frac{1}{m} \sum_{i}$ of $\Vert x^{(i)} - \mu_c^{(i)} \Vert^2$
    [ ] $x^{(i)} - \mu_c^{(i)}$
    [ ] $\mathbf{w} \cdot \mathbf{x} + b$
    [ ] $\frac{1}{m} \sum_{i}$ of
    [ ] $x^{(i)} - \mu_c^{(i)}$
    [ ] $^2$
- Q: How does the distortion objective relate to the K-means algorithm's iterations?
    [ ] It is computed only after training and is unrelated to the steps
    [CORRECT] Each iteration tends to decrease it until the algorithm converges
    [ ] It is maximized so that clusters spread as far apart as possible
    [ ] It is ignored entirely once the value of K has been chosen
- Q: Which statement about the K-means distortion objective is a misconception to avoid?
    [CORRECT] It quantifies supervised prediction error rather than within-cluster fit
    [ ] K-means iterations act to reduce it rather than increase it
    [ ] Its value depends on both the assignments and the centroid locations
    [ ] Lower values usually reflect tighter clustering around centroids
- Q: What is the objective of the K-means algorithm with respect to the distortion cost $J$?
    [CORRECT] Choose assignments $c^{(i)}$ and centroids $\mu_k$ that minimize $J$
    [ ] Hold $J$ pinned at some fixed constant and nonzero value
    [ ] Make $J$ turn out exactly equal to the overall feature variance
    [ ] Drive the value of $J$ upward to its largest attainable level

### K-Means Convergence

- Q: What is a practical sign that K-means has converged?
    [ ] The algorithm switches over to a regression objective
    [CORRECT] The centroids and assignments stay stable across iterations
    [ ] The clustering cost begins to rise sharply each round
    [ ] The number of input features collapses down to one
- Q: Which misconception about K-means convergence should be avoided?
    [CORRECT] Converging means the best clustering over all initializations was found
    [ ] The starting centroid positions can affect the final clustering
    [ ] The algorithm can settle into a stable, unchanging solution
    [ ] Convergence means the repeated steps no longer change much
- Q: Does reaching convergence guarantee K-means found the globally best clustering?
    [ ] No, because reaching convergence means the whole algorithm has failed
    [CORRECT] No, it can settle at a local solution that depends on initialization
    [ ] Yes, because the underlying K-means clustering objective is convex
    [ ] Yes, convergence on this objective always gives the global optimum
- Q: Run from different starting points, does K-means always reach the same final clustering?
    [ ] Yes, because the cost function has a single global minimum
    [CORRECT] No, the result depends on the random initialization of the centroids
    [ ] Yes, the procedure is fully deterministic regardless of setup
    [ ] No, because the dataset itself is resampled each iteration
- Q: While running K-means, the distortion is still decreasing but only by a tiny amount each iteration. What is the standard response?
    [ ] Restart the whole algorithm from scratch
    [CORRECT] Treat it as effectively converged and stop
    [ ] Manually nudge the centroids to new spots
    [ ] Increase the number of clusters K and rerun
- Q: Why can K-means stop after enough rounds of assigning points and updating centroids?
    [ ] Because the centroid coordinates eventually turn negative
    [ ] Because the data points are consumed and disappear
    [CORRECT] Because further steps stop meaningfully improving the clustering
    [ ] Because unsupervised methods optimize no objective at all
- Q: A full K-means iteration occurs in which no point changes its cluster and no centroid moves. What does this indicate?
    [CORRECT] Successful convergence of the algorithm
    [ ] A clear need for additional clusters
    [ ] High variance in the fitted model
    [ ] A logic bug somewhere in the code
- Q: When is K-means considered to have converged?
    [ ] When the cluster labels match a hidden answer key
    [ ] When all clusters end up with the same number of points
    [ ] After it has completed exactly K full iterations
    [CORRECT] When the assignments and centroids stop changing much
- Q: Why is it useful to track the cost function J across iterations of K-means?
    [CORRECT] To confirm the algorithm is actually reducing the distortion
    [ ] To decide how large the output clusters should be
    [ ] To compute the mean value of each input feature
    [ ] To select the gradient-descent learning rate for the run
- Q: Which condition signals that the K-means algorithm has converged?
    [ ] Every training example ends up inside a single cluster
    [ ] The gradient-descent learning rate has decayed to zero
    [ ] The iteration count becomes equal to the number of features
    [CORRECT] The cost function stops dropping and assignments hold steady

### Why K-Means Converges

- Q: By alternating between assigning points from centroids and updating centroids from assignments, what does K-means accomplish?
    [CORRECT] It steadily lowers the total distortion of the dataset
    [ ] It raises the number of features in the dataset
    [ ] It turns the procedure into a supervised method
    [ ] It enters a cycle that repeats endlessly forever
- Q: Is K-means guaranteed to reach the global minimum of its cost function?
    [CORRECT] No, it can become trapped in a local minimum
    [ ] No, because the procedure tends to diverge
    [ ] Yes, it reaches the global optimum every run
    [ ] Yes, but only when the data carries labels
- Q: How does the move-centroid step of K-means help reduce the cost function J?
    [ ] It randomly relocates every one of the centroids in order to explore more of the surrounding feature space
    [ ] It deliberately pushes all of the centroids far apart so as to maximize the total spacing between them
    [CORRECT] With assignments fixed, it sets each centroid to the mean, minimizing that cluster's squared distances
    [ ] It rescales every single one of the input features so that each separate one ends up with exactly zero mean
- Q: Why does the assignment step of K-means guarantee that the cost function J cannot increase?
    [ ] It runs gradient descent with a sufficiently small step size alpha
    [CORRECT] Each point is sent to its closest centroid, minimizing its distance term
    [ ] It attaches a class label to each example in the dataset
    [ ] It moves every centroid to the mean of its assigned points
- Q: Which statement about why K-means converges is a misconception to avoid?
    [ ] It converges because each repeated step improves or preserves the objective
    [CORRECT] It converges because it secretly already knows the true clusters
    [ ] The choice of initialization still affects the final result
    [ ] Convergence does not guarantee reaching the best global solution
- Q: Why does K-means converging NOT imply it found the globally optimal clustering?
    [ ] Because the distortion objective always reaches exactly zero at the end
    [CORRECT] Because different initializations can settle into different local optima
    [ ] Because convergence can only ever occur when the data are fully labeled
    [ ] Because the K-means algorithm does not actually optimize any objective
- Q: How does the assignment step (reassigning each point to its nearest centroid) support convergence?
    [ ] It forces every point into a single shared cluster
    [ ] It changes how many features each point is described by
    [CORRECT] It can only decrease or leave unchanged the current distortion
    [ ] It randomizes the objective so the algorithm can explore freely
- Q: Considering its two steps, why does K-means eventually stop improving?
    [ ] The cluster count K keeps growing larger until the iterations run out
    [ ] It gradually exhausts the working memory the machine has available
    [ ] It reaches the very last training example and then simply halts there
    [CORRECT] It minimizes a cost bounded below by zero, settling into a minimum
- Q: How does the centroid update step support convergence?
    [ ] It recomputes the centroids while ignoring the points assigned to them
    [ ] It converts the clustering task into a supervised regression problem
    [CORRECT] Moving each centroid to its points' mean cannot raise the objective
    [ ] It deliberately raises the objective to escape a local minimum
- Q: Why is K-means guaranteed to converge?
    [CORRECT] Because each step is designed so the distortion never increases
    [ ] Because the centroids are permanently frozen right after initialization
    [ ] Because it performs gradient descent on a globally convex function
    [ ] Because it gradually memorizes the correct cluster labels for the points

### Random Initialization in K-Means

- Q: Why can K-means produce different final clusters depending on which random initial centroids are chosen?
    [ ] Because each run trains on a randomly resampled subset of the data
    [CORRECT] Because it can converge to different local minima from different starts
    [ ] Because the chosen value of K silently changes between runs
    [ ] Because feature scaling is recomputed differently on every run
- Q: Why can the choice of random initialization matter a lot in K-means?
    [CORRECT] Different starting centroids can lead to different final clusterings
    [ ] The randomness changes how many features each data point has
    [ ] Random starting points decide whether or not the data are labeled
    [ ] Initialization only affects the plots, not the actual clustering results
- Q: What can happen if a single random initialization of K-means is "unlucky"?
    [ ] The algorithm loops forever and never actually reaches convergence
    [CORRECT] It settles on a high-distortion clustering versus a better start
    [ ] The distortion cost function takes on a negative final value
    [ ] Every data point is silently dropped from the dataset entirely
- Q: Why does K-means require an initialization step before its main loop?
    [CORRECT] It must pick initial centroids before it alternates assignments and updates
    [ ] It needs ground-truth class labels to be supplied before it can start
    [ ] It begins by selecting the anomaly detection threshold epsilon to use
    [ ] It must fit a regression line to the data before the main loop can begin
- Q: What risk arises from a poor random initialization of the centroids?
    [ ] The algorithm silently turns into a supervised classifier
    [ ] Some of the input features are dropped from the data
    [ ] The distortion cost function becomes mathematically undefined
    [CORRECT] It may converge to a worse, suboptimal local clustering
- Q: What is the recommended way to choose the initial cluster centroids for K-means?
    [ ] Set every centroid equal to the overall mean of the dataset
    [CORRECT] Choose K random examples from the training set as the centroids
    [ ] Pick K arbitrary points anywhere in the feature space
    [ ] Use the coordinates of the first K rows stored in the database
- Q: What is the main purpose of running K-means several times with different random initializations?
    [ ] To grow the number of examples in the training set
    [CORRECT] To find the clustering that achieves the lowest distortion cost
    [ ] To gradually rotate the final cluster centroids over time
    [ ] To consume more CPU cycles during the training job
- Q: Which statement about K-means initialization is a misconception to avoid?
    [ ] Initialization happens first, before the iterative assignment and update steps
    [ ] Choosing the centroids at random is a common initialization approach
    [ ] The starting centroids can strongly affect the final clustering outcome
    [CORRECT] Initialization is irrelevant since K-means always returns one fixed result
- Q: With three true clusters in the data, what poor outcome can a bad set of starting centroids lead to in K-means?
    [ ] The algorithm lands on the global minimum on the first pass
    [ ] Each data point is automatically given a ground-truth label
    [CORRECT] One centroid claims two clusters while another gets no points
    [ ] All three centroids collapse onto a single identical location
- Q: What is a common and recommended way to initialize the centroids in K-means?
    [ ] Reuse final centroids from an unrelated dataset without checking
    [ ] Place every centroid at the origin (all zeros) on every run
    [ ] Begin with one centroid located at each individual example
    [CORRECT] Pick K of the training examples at random as the centroids

### Multiple Random Initializations for Better Clustering

- Q: What is a likely consequence of one "unlucky" random initialization when running K-means just once?
    [CORRECT] It converges to a local minimum that groups the data poorly
    [ ] The training dataset is permanently erased from memory
    [ ] The reported distortion automatically drops to exactly zero
    [ ] The algorithm fails to ever converge to a solution
- Q: About how many random initializations (complete runs of K-means) are typically recommended to obtain a high-quality clustering?
    [CORRECT] Somewhere from 50 to 1000
    [ ] Exactly 10,000 runs
    [ ] Just 1 to 5 runs
    [ ] No fewer than 1 million
- Q: Running K-means from several random centroid initializations and keeping the best result is most worthwhile for which range of the number of clusters K?
    [ ] K roughly between 100 and 500
    [ ] K strictly greater than 1000
    [CORRECT] K roughly between 2 and 10
    [ ] K set equal to the number of examples
- Q: Across several random initializations of K-means, what does the distortion cost function J let you determine?
    [ ] The number of features in the dataset
    [CORRECT] Which random run gave the best clustering
    [ ] The best learning rate for gradient descent
    [ ] The maximum iterations the run may take
- Q: Which statement about using multiple random initializations is a misconception to avoid?
    [ ] The best run is chosen by comparing the distortion objective values
    [ ] Different starts can lead to different local clustering solutions
    [CORRECT] They are unnecessary because one random start is always good enough
    [ ] Repeating K-means improves robustness against poor starting centroids
- Q: Why does keeping the best of several K-means runs help in practice?
    [ ] Because random initializations automatically change the number of clusters
    [CORRECT] Because a single run can get stuck in a poorer local solution
    [ ] Because clustering fundamentally requires labeled data to work
    [ ] Because K-means has no objective function to compare runs with
- Q: Why are multiple random initializations often seen as less necessary when K is very large (e.g., K = 500)?
    [CORRECT] A single random start usually already gives a good result
    [ ] K-means will keep merging nearby clusters together on its own
    [ ] The distortion cost J cannot be computed for very large K
    [ ] Clusterings with large K simply have no local minima at all
- Q: When K-means uses a very large number of clusters (e.g., K = 400), why are multiple random initializations usually less critical than for small K?
    [ ] The distortion cost function genuinely applies only when the value of K is small
    [ ] Such a large K conveniently places every single centroid right at the global optimum
    [ ] Such a large value of K stops the algorithm from reaching any local minimum
    [CORRECT] Each separate run is costly and the very first initialization is usually good enough
- Q: Why is running K-means multiple times with different random initializations a standard practice?
    [CORRECT] To reduce the risk of a poor local minimum and lower distortion
    [ ] To deliberately burn extra CPU time without any benefit
    [ ] To force the algorithm to use a much larger learning rate
    [ ] To raise the total count of training examples being used
- Q: After running K-means from several random initializations, which solution is typically kept?
    [CORRECT] The run achieving the lowest distortion objective value
    [ ] The run that ended with the largest distortion value
    [ ] The run that produced the most equally sized clusters
    [ ] The very first run obtained, regardless of its quality
- Q: What is the main trade-off of using multiple random initializations?
    [CORRECT] It costs more computation for a better chance of a good result
    [ ] It guarantees the resulting clusters will be interpretable
    [ ] It selects the value of K automatically at no extra cost
    [ ] It uses less computation while also reducing robustness
- Q: When performing 100 random restarts of K-means, how should the initial centroids be set for each run?
    [ ] Choose the K points that lie farthest from all the data
    [CORRECT] Pick K random training examples as that run's centroids
    [ ] Initialize every centroid at the fixed origin (0, 0)
    [ ] Place all centroids at the single center of the dataset
- Q: With three groups present in the data, how can a bad initial placement of centroids affect a K-means run?
    [CORRECT] One centroid grabs two groups while another captures none
    [ ] The distortion cost function turns into a negative number
    [ ] The centroids endlessly orbit the data in fixed circles
    [ ] All three centroids converge onto one shared location
- Q: When you perform 50 random initializations of K-means, which quantity are you trying to make as small as possible across the runs?
    [ ] The average spacing between the initial chosen centroids
    [ ] The total count m of data points in the training set
    [CORRECT] Sum of squared distances from points to their centroids
    [ ] The number of iterations the algorithm needs to converge
- Q: When using multiple random initializations of K-means, what does a single 'run' consist of?
    [ ] A single cluster-assignment step performed just one time only
    [ ] An elbow-method search sweeping K values to pick out the best one
    [ ] A single centroid-update step carried out just one single time
    [CORRECT] K-means from one random start, iterated through to convergence
- Q: Running K-means with many random initializations and keeping the best result is generally most worthwhile for which range of K (number of clusters)?
    [ ] When K equals the number of training examples
    [CORRECT] Small K, such as roughly 2 to 10 clusters
    [ ] Only the degenerate case where K equals 1
    [ ] Very large K, such as more than 100 clusters
- Q: What is the main trade-off when raising the number of random K-means initializations from 10 to 1000?
    [CORRECT] Total run time grows roughly linearly with the runs
    [ ] The number of clusters K must rise to match
    [ ] The final distortion cost is guaranteed to rise
    [ ] Finding a global minimum becomes less likely
- Q: After running K-means with 100 different random initializations, which clustering should you keep?
    [ ] The run that produced the largest number of clusters
    [ ] The clustering from whichever run finished last
    [ ] The run whose centroids moved the greatest distance
    [CORRECT] The clustering that achieved the lowest distortion cost
- Q: How is the 'distortion' value, used to compare different K-means random initializations, defined?
    [ ] The straight-line distance between the two farthest centroids
    [CORRECT] The sum of squared distances from each point to its assigned centroid
    [ ] The total number of iterations needed before convergence
    [ ] The count of points that switched clusters on the final step
- Q: After running K-means 50 times from different random starts, which run should you keep as the final model?
    [ ] The run that achieved the highest cost-function value J
    [ ] The 50th run, regardless of its resulting distortion
    [CORRECT] The run that achieved the lowest cost-function value J
    [ ] A model formed by averaging all 50 sets of centroids
- Q: After running K-means from 50 to 1000 different random initializations, which criterion selects the final clustering to keep?
    [CORRECT] The run with the smallest distortion J(c, mu)
    [ ] The run with the most spread-out centroids
    [ ] The run that took the most iterations
    [ ] The run with the fewest points per cluster
- Q: What is the main trade-off when raising the number of K-means random initializations from 10 to 500?
    [ ] A reduced chance of ever reaching a good local optimum
    [ ] A requirement to gather substantially more training data first
    [CORRECT] More compute and runtime for a better shot at the global minimum
    [ ] A distortion value that necessarily grows with each extra run
- Q: Which property of the K-means cost function (distortion) is the reason multiple random initializations are recommended?
    [ ] It is unbounded below and has no minimum value
    [CORRECT] It is non-convex, so it can settle into many local optima
    [ ] It is convex, with exactly one reachable global minimum
    [ ] It is perfectly linear in the centroid positions
- Q: Why is it useful to run K-means several times with different random initializations?
    [ ] To average the predicted labels together across all of the runs
    [ ] To enlarge the dataset by generating extra synthetic examples
    [ ] To guarantee that the global optimum is reached on every single run
    [CORRECT] To improve the chance of finding a lower-distortion clustering
- Q: For which range of the number of clusters K is it most common and useful to run K-means from multiple random initializations?
    [ ] Only in the special case K equals 1
    [ ] Only when K exceeds the example count
    [CORRECT] K roughly between 2 and 10
    [ ] K roughly between 100 and 1000

### Choosing the Number of Clusters K

- Q: Which approach gives a quantitative way to help choose K for K-means?
    [ ] Read K from the output activation function
    [ ] Set K equal to the number of training examples
    [ ] Always fix K at 2 regardless of data
    [CORRECT] Track how the distortion cost changes as K varies
- Q: Why is selecting a value of K for K-means often not straightforward?
    [ ] Because a larger value of K always yields a strictly better result
    [CORRECT] Because unlabeled data gives no ground truth on the right group count
    [ ] Because the value of K must always equal the number of input features
    [ ] Because K-means itself selects the one correct K with no human input
- Q: What situation makes choosing the number of clusters K genuinely ambiguous?
    [ ] The numeric values of the features are very large
    [ ] The processor running the algorithm is unusually slow
    [CORRECT] The data shows no clear sign of how many groups exist
    [ ] The learning rate chosen for the run is too small
- Q: In the K-means algorithm, what does the value of K specify?
    [CORRECT] How many clusters the algorithm forms
    [ ] The step size used during each update
    [ ] How many input features to retain
    [ ] The threshold for flagging anomalies
- Q: Is there always one single "correct" number of clusters K for a given dataset?
    [ ] Yes, the math always pins down one exact value of K
    [ ] Yes, but only when the Elbow Method is applied first
    [CORRECT] No, it is often ambiguous and depends on the application
    [ ] No, K must always equal the number of input features
- Q: Which belief about choosing K is a misconception to avoid?
    [ ] The choice of K can weigh both the cost behavior and downstream uses
    [ ] Choosing a value of K is one part of applying the K-means algorithm
    [ ] The chosen value of K directly affects the resulting cluster output
    [CORRECT] One obviously correct value of K always exists regardless of context
- Q: Why can practical judgment matter when selecting K, beyond minimizing the cost?
    [CORRECT] Because the most useful K can depend on how the clusters get used
    [ ] Because the distortion cost is entirely irrelevant to this choice
    [ ] Because the best choice of K is reliably always the largest one
    [ ] Because the value of K only carries meaning in supervised learning

### Limits of the Elbow Method

- Q: What is a common reason practitioners often avoid relying on the Elbow Method to choose K?
    [ ] It requires the dataset to already be labeled
    [ ] It is far too computationally expensive to run
    [CORRECT] It often yields a smooth curve with no clear optimal K
    [ ] It can only be applied to two-dimensional data
- Q: If the distortion curve shows no clear elbow, what is the reasonable conclusion?
    [CORRECT] The method is inconclusive, so other judgment is needed
    [ ] The data has no real structure and cannot be clustered
    [ ] K-means has failed outright and cannot be rerun at all
    [ ] A supervised model must be substituted for the clustering
- Q: Why is the elbow method often limited in practice?
    [ ] Distortion rises as K grows larger
    [ ] It is hardwired to always return K equal to 1
    [ ] It works only on fully labeled datasets
    [CORRECT] The distortion curve frequently shows no clear bend
- Q: Why is relying blindly on the elbow method a poor idea?
    [ ] It assigns class labels to the data in an incorrect way
    [ ] Distortion bears no relationship to true clustering quality
    [ ] The chosen value of K never affects the final clustering result
    [CORRECT] It can give false confidence when the bend is faint or absent
- Q: Which belief about the elbow method is a misconception to avoid?
    [ ] It is a heuristic that can fail to be clear
    [ ] Practical considerations may still matter alongside it
    [CORRECT] It always pins down the single best value of K
    [ ] It relies on the trend of the distortion cost
- Q: When plotting distortion against K, what shape signals that the Elbow Method will not give a clear choice of K?
    [ ] A perfectly straight vertical line rising on the far left of the plot
    [ ] A distortion value that stays completely flat at zero across every K
    [ ] A single very pronounced and sharp bend occurring right at K equals 3
    [CORRECT] A smooth curve where distortion falls gradually without a sharp elbow
- Q: What is often a more dependable alternative to the Elbow Method for selecting K?
    [ ] Running K-means only a single time
    [CORRECT] Choosing K from the goals of the downstream application
    [ ] Switching to a supervised learning algorithm instead
    [ ] Selecting K with a random number generator
- Q: What is the elbow method trying to accomplish?
    [ ] Pick a learning rate for gradient descent
    [ ] Estimate the probability that a point is anomalous
    [CORRECT] Choose K from a bend in the distortion-versus-K curve
    [ ] Select the activation used in the output layer
- Q: On an Elbow Method graph, what quantity is plotted along the horizontal axis?
    [ ] The distortion cost function J
    [ ] The number of training examples m
    [CORRECT] The number of clusters K
    [ ] The learning rate alpha
- Q: On an Elbow Method plot, which feature of the curve identifies the K you should choose?
    [ ] The value of K at which the cost J first reaches zero
    [ ] The K closest to the average value of the cost J
    [ ] The K corresponding to the highest point on the curve
    [CORRECT] The K past which the cost J drops much more slowly

### Choosing K Based on Downstream Use

- Q: When the goal is a downstream application, how should you evaluate different candidate values of K?
    [ ] Ignore distortion entirely and judge by the labels
    [CORRECT] Run K-means for each K and pick the one best for the goal
    [ ] Average together the outputs of the K=3 and K=5 runs
    [ ] Only ever test the smallest candidate value of K
- Q: What does choosing K by downstream use add beyond the elbow method?
    [ ] It guarantees the single globally optimal clustering of the data
    [ ] It converts K-means into a fully supervised classification method
    [CORRECT] It stresses usefulness for the application, not just curve shape
    [ ] It proves that the underlying distortion cost objective does not matter
- Q: Which scenario best reflects choosing K based on downstream use?
    [CORRECT] Picking the K that yields the most useful market segments
    [ ] Setting K equal to the total number of input features
    [ ] Assigning K by the alphabetical order of the cluster names
    [ ] Choosing K=3 simply because that value is a common default
- Q: Why is choosing K by downstream use a practical rather than purely theoretical concern?
    [ ] Because supervised labels fix the correct answer regardless of K
    [ ] Because K-means optimizes no underlying distortion cost objective
    [ ] Because practical choices disregard the underlying data entirely
    [CORRECT] Because clustering often supports decisions outside the algorithm
- Q: A t-shirt company clusters customer measurements to define sizes. How should it decide between 3 and 5 size clusters?
    [ ] By flipping a fair coin to choose one of the two candidate options
    [ ] By applying the standard Elbow Method to the distortion curve alone
    [CORRECT] By weighing better-fitting garments against the cost of more sizes
    [ ] By simply setting K equal to the median customer height in the data


(2 further questions omitted from this pack for length; the topics above are complete.)
