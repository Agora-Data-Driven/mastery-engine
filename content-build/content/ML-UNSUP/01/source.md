# SOURCE PACK — Machine Learning / Unsupervised Learning / Anomaly Detection

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Anomaly Detection   (23 questions)
2. When to Use Anomaly Detection   (5 questions)
3. Anomaly Detection vs. Supervised Learning   (5 questions)
4. Gaussian / Normal Distribution   (10 questions)
5. Mean and Variance in Gaussian Modeling   (5 questions)
6. Estimating Gaussian Parameters from Data   (4 questions)
7. Density Estimation for Anomaly Detection   (15 questions)
8. Multivariate Anomaly Detection via Per-Feature Gaussians   (5 questions)
9. Anomaly Threshold Epsilon   (10 questions)
10. Building and Evaluating an Anomaly Detection System   (5 questions)
11. Cross-Validation for Anomaly Detection   (5 questions)
12. Precision, Recall, and F1 for Rare Anomalies   (5 questions)
13. Feature Engineering for Anomaly Detection   (5 questions)
14. Transforming Features to Be More Gaussian   (5 questions)

## Covered by LATER lessons — do not teach these here

- Dimensionality Reduction: Dimensionality Reduction
- Clustering with K-Means: Clustering as Structure Discovery in Unlabeled Data, Clustering vs. Supervised Classification, Cluster Centroids, K-Means Clustering, K-Means Assignment Step, K-Means Centroid Update Step, K-Means Cost Function / Distortion Objective, K-Means Convergence, Why K-Means Converges, Random Initialization in K-Means, Multiple Random Initializations for Better Clustering, Choosing the Number of Clusters K, Limits of the Elbow Method, Choosing K Based on Downstream Use

## The live quiz bank for these topics — 107 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Anomaly Detection

- Q: What makes anomaly detection different from standard supervised learning?
    [ ] It outputs binary class labels by fitting a logistic regression model to the data
    [CORRECT] It flags deviations from normal instead of needing many labeled positive examples
    [ ] It assumes that every future anomaly already appears within the available training data
    [ ] It requires the data to be clustered into groups before any model training begins
- Q: What is the main goal of anomaly detection?
    [ ] Find the shortest path through a graph
    [ ] Predict a continuous value from labels
    [CORRECT] Flag examples that look unusual versus normal
    [ ] Group unlabeled data into clusters
- Q: Which belief about anomaly detection is a misconception to avoid?
    [ ] It is useful precisely when anomalies are rare
    [CORRECT] It needs many labeled anomaly examples to be useful
    [ ] It can model normal behavior and flag low-probability cases
    [ ] It is commonly applied in quality-control settings
- Q: At a high level, how does anomaly detection differ from clustering?
    [ ] Clustering predicts numbers, anomaly detection predicts categories
    [ ] Clustering needs labels, but anomaly detection needs none at all
    [CORRECT] Clustering finds normal structure; anomaly detection flags oddities
    [ ] They are one identical method known by two different names
- Q: What is anomaly detection primarily used for?
    [CORRECT] Detecting unusual events such as fraudulent charges
    [ ] Transcribing long recordings of speech into written text
    [ ] Grouping many similar news stories into shared topics
    [ ] Predicting a house's selling price from its floor area
- Q: Which scenario is the best fit for anomaly detection?
    [ ] Choosing the single best slope for a regression line
    [ ] Estimating the resale value of a family home accurately
    [CORRECT] Flagging account activity unlike its normal behavior
    [ ] Sorting many customer reviews into positive and negative
- Q: Compared with supervised learning, in which situation is anomaly detection specifically more advantageous?
    [ ] When the dataset is perfectly balanced between two classes
    [CORRECT] When future anomalies may look nothing like those seen so far
    [ ] When you have a very large number of positive examples to learn from
    [ ] When the goal is to predict a continuous price value
- Q: You train a model to predict house prices (a real number) using features that include both the number of bedrooms (integer count) and the square footage (continuous measure). Which statement best describes how these different input types are handled in a standard linear regression model?
    [CORRECT] Both features are treated as numerical values multiplied by learned coefficients.
    [ ] The bedroom count is converted to categories while square footage stays continuous.
    [ ] Square footage is standardized while bedroom count is encoded with one-hot vectors.
    [ ] The model uses a different loss function for discrete inputs than for continuous inputs.
- Q: Which common misunderstanding about anomaly detection should be avoided?
    [ ] That it just means finding numerically large values in the data
    [CORRECT] That any rare label is an anomaly, not behavior unlike the norm
    [ ] That it can only ever be applied to image-classification problems
    [ ] That it always requires building a three-dimensional cost surface
- Q: A dataset contains a mix of numerical features (age, income) and categorical features (city, subscription tier) and the target is a binary churn label. You decide to use a decision tree classifier. How does the tree algorithm inherently handle the differing nature of these input types during splitting?
    [CORRECT] It selects split thresholds for numerical features and partitions categories for categorical features.
    [ ] It requires all categorical features to be label-encoded into integers before any splitting occurs.
    [ ] It transforms numerical features into bins and treats all inputs as categorical during training.
    [ ] It computes Euclidean distances for numerical features and Hamming distances for categorical ones.
- Q: A regression task uses a categorical feature ‘zip code’ with 800 levels and a continuous target. You decide to use entity embedding by treating zip code as a trainable embedding layer in a neural network. What does the model learn in that embedding space during training?
    [CORRECT] A dense vector for each zip code such that zip codes with similar target values end up nearby.
    [ ] A direct mapping from each zip code to its conditional mean of the target variable.
    [ ] A frequency-weighted one-hot representation that reduces the dimensionality of the input.
    [ ] A separate regression coefficient for each zip code analogous to a linear fixed effect.
- Q: A neural network classifier receives both a dense numerical vector (sensor readings) and a sparse categorical feature (device model with 10,000 possible values). What is the most common architectural pattern for combining these heterogeneous inputs before the final classification layer?
    [CORRECT] Pass the numerical features through dense layers, embed the categorical feature, and concatenate both representations.
    [ ] One-hot encode the categorical feature, append it to the numerical vector, and feed the combined sparse vector directly to a softmax.
    [ ] Compute the outer product of the numerical vector and the one-hot categorical vector to form a joint interaction tensor.
    [ ] Average the numerical features and the integer-encoded categorical feature into a single scalar input node.
- Q: In the aircraft-engine example, what are the features meant to capture?
    [CORRECT] Measurements like heat and vibration of the engine
    [ ] The ranked output of a recommender system
    [ ] Just the labels good and bad
    [ ] Only the engine's serial number
- Q: You train separate models on the same binary classification dataset: Model A uses the raw numerical age feature and one-hot encoded city, while Model B uses only numerical features after target-encoding city with the mean training-set response rate. Why might Model B show higher cross-validation accuracy even though both use the same underlying information?
    [CORRECT] Target encoding creates a single ordered feature that aligns more directly with the decision boundary.
    [ ] One-hot encoding always introduces too much noise from low-frequency city categories.
    [ ] Numerical-only models cannot learn nonlinear relationships when categorical data is present.
    [ ] Target encoding removes the need for regularization by collapsing all city effects into one dimension.
- Q: Why can anomaly detection be valuable in finance?
    [ ] Because every single transaction is already labeled by default
    [ ] Because only supervised regression is able to detect fraud
    [ ] Because financial data contains no real patterns at all
    [CORRECT] Because rare, unusual transactions may signal fraud
- Q: While building a Gaussian-based anomaly detector, you find that one feature's histogram is strongly non-Gaussian (heavily skewed). What is the recommended response?
    [ ] Leave it unchanged, since Gaussian models prefer skewed inputs
    [CORRECT] Apply a transform such as log(x) or sqrt(x) to make it more Gaussian
    [ ] Scale the feature up by a large constant factor
    [ ] Drop the feature from the model right away
- Q: In a probabilistic anomaly detection model that fits p(x) and uses threshold epsilon, when is an input x classified as an anomaly?
    [ ] When p(x) is greater than the threshold epsilon
    [ ] When p(x) is exactly equal to one
    [ ] When p(x) equals the mean of the distribution
    [CORRECT] When p(x) is less than the threshold epsilon
- Q: Why is overall (total) accuracy usually a poor metric for evaluating an anomaly detection system?
    [CORRECT] Anomalies are so rare that always predicting 'normal' still scores high accuracy
    [ ] Anomaly detection involves no real mathematical computation that could be scored
    [ ] Accuracy is a metric that is mathematically defined only for regression problems
    [ ] Accuracy can be computed and reported only with a full 3D visualization plot
- Q: You apply k-nearest neighbors for a classification problem where features include ‘height in cm’ (range 140–200) and ‘number of prior purchases’ (range 0–5). Without preprocessing, why might the ‘height’ feature dominate the distance calculations?
    [CORRECT] Its larger numerical scale inflates its contribution to the Euclidean distance.
    [ ] Continuous features are always weighted more heavily by the distance metric.
    [ ] The algorithm counts dimensions, and height contributes more distinct integer values.
    [ ] Nearest-neighbor methods ignore discrete features when calculating proximity.
- Q: Why is anomaly detection often practical in a manufacturing setting?
    [ ] Because it works only when every defect is known beforehand
    [ ] Because the method needs no input features
    [CORRECT] Because normal behavior can be modeled and odd units flagged
    [ ] Because defective products outnumber good ones
- Q: You have 10,000 normal examples and 20 anomalous examples. Which data split is most appropriate for building and evaluating an anomaly detector?
    [ ] Put all 20 of the anomalous examples directly into the training set for fitting
    [CORRECT] Train on mostly normal data; split the rare anomalies across the CV and test sets
    [ ] Discard the anomalies entirely, since they are not really needed anywhere
    [ ] Train on 10 of the anomalies and then evaluate on the other 10 anomalies
- Q: In a logistic regression model, you include a categorical feature ‘color’ with levels {red, blue, green} and a numerical feature ‘temperature’. To avoid the dummy variable trap, you drop the ‘red’ indicator. How should you interpret the learned coefficient for the ‘blue’ indicator?
    [CORRECT] It represents the change in log-odds relative to the ‘red’ baseline, holding temperature constant.
    [ ] It measures the absolute effect of blueness on the predicted probability independent of other features.
    [ ] It captures the interaction effect between temperature and the color blue on the log-odds scale.
    [ ] It is the average log-odds of the positive class across all observations where color equals blue.
- Q: When using a gradient-boosted tree model for a regression task with both numerical and high-cardinality categorical inputs, which preprocessing step is most directly handled by the algorithm’s own mechanisms rather than requiring external transformation?
    [CORRECT] Learning meaningful groupings of categorical levels based on the target variable.
    [ ] Normalizing continuous features to have zero mean and unit variance before splitting.
    [ ] Imputing missing numerical values using the column median before training begins.
    [ ] Applying a logarithmic transformation to skewed numerical features for symmetry.

### When to Use Anomaly Detection

- Q: Which belief about when to use anomaly detection is a mistake to hold?
    [ ] The surrounding application context should inform the decision
    [ ] Some rare-event tasks are still better served by supervised learning
    [CORRECT] Rarity alone decides it, and whether future positives are novel is irrelevant
    [ ] Anomaly detection shines when abnormal cases may be new or evolving
- Q: Why does diagnosing a known, well-characterized disease lean toward supervised learning rather than anomaly detection?
    [ ] Because a known, well-characterized disease reliably produces no observable symptoms whatsoever
    [CORRECT] Because the positive class is a previously seen condition, not an open-ended novel failure mode
    [ ] Because supervised learning can be fully trained without using any labeled examples of the disease
    [ ] Because anomaly detection is structurally unable to make any use of the available medical features
- Q: Why are many security applications good candidates for anomaly detection?
    [ ] Because anomaly detection is guaranteed to produce zero false positives
    [CORRECT] Because attackers may invent brand-new behaviors absent from past data
    [ ] Because the data in security tasks contains no usable features
    [ ] Because every security problem is fundamentally a clustering problem
- Q: Which situation is the best fit for anomaly detection?
    [ ] A task where positive examples are frequent and highly repetitive
    [CORRECT] A task where abnormal behavior is rare and may appear in new forms
    [ ] A task that involves predicting continuous house prices from features
    [ ] A task with a small fixed set of well-labeled outcomes seen repeatedly
- Q: Why is monitoring machines in a data center a natural fit for anomaly detection?
    [ ] Because data-center machines always form a few obvious clusters
    [ ] Because only supervised learning can read CPU-load measurements
    [ ] Because the label of every machine is known perfectly in advance
    [CORRECT] Because a hacked or faulty machine can behave in unfamiliar ways

### Anomaly Detection vs. Supervised Learning

- Q: Why is supervised learning often the better fit for tasks like spam detection or weather prediction?
    [CORRECT] Because future positive cases tend to resemble patterns already labeled
    [ ] Because these tasks come with no labeled examples to learn from
    [ ] Because anomaly detection is incapable of working with text data
    [ ] Because supervised learning deliberately ignores past examples
- Q: What is the key conceptual difference between anomaly detection and supervised learning?
    [ ] Anomaly detection inherently requires the use of far fewer input features than any supervised learning method ever does
    [ ] Supervised learning is really just unsupervised learning supplied with a much larger amount of labeled training data
    [ ] The two approaches differ only in the way their final prediction results are charted and plotted for a human review
    [CORRECT] Anomaly detection models normality and flags deviations; supervised learning trains on labeled examples of each class
- Q: Why can anomaly detection outperform supervised learning on fraud or security problems?
    [ ] Because anomaly detection works without using any features
    [CORRECT] Because new attack patterns can appear that no labeled data captured
    [ ] Because supervised methods are unable to handle binary labels
    [ ] Because fraudulent activity always follows a Gaussian distribution
- Q: In which situation is anomaly detection typically the better choice over supervised learning?
    [ ] When every output must come from a fixed, known set of classes
    [ ] When labeled positive examples cover every future failure mode
    [CORRECT] When positive examples are very few and future anomalies may look novel
    [ ] When the two classes are present in roughly equal proportions
- Q: Which belief about choosing between anomaly detection and supervised learning is a mistake to hold?
    [CORRECT] Having only a few positive examples by itself always means supervised learning is the right call
    [ ] Supervised learning assumes that future positive cases will closely resemble the past positive cases
    [ ] Both the quantity of labeled data and the novelty of future positive cases genuinely matter here
    [ ] Certain detection tasks are simply a much better structural fit for anomaly detection than for labels

### Gaussian / Normal Distribution

- Q: How does changing the mean parameter mu affect the plot of a Gaussian?
    [CORRECT] It shifts the distribution's center left or right
    [ ] It adjusts only the peak height of the curve
    [ ] It widens or narrows the spread of the curve
    [ ] It flips the curve upside down vertically
- Q: What is a Gaussian (normal) distribution?
    [CORRECT] A bell-shaped probability distribution over a numeric variable
    [ ] A discrete list of the possible output classes for a label
    [ ] An objective function that is minimized during data clustering
    [ ] A type of binary decision tree used to split examples apart
- Q: What is the common visual name for the shape of a Gaussian distribution?
    [ ] The sharp triangular peak
    [ ] The straight linear line
    [CORRECT] The bell-shaped curve
    [ ] The flat square distribution
- Q: Which parameter controls the spread or width of a Gaussian distribution?
    [ ] The total number of input features n
    [ ] The mean parameter taken by itself
    [ ] The optimizer's learning rate alpha
    [CORRECT] The variance, or standard deviation
- Q: Why does a Gaussian curve become taller as it gets narrower?
    [CORRECT] Because the total area under the curve must stay equal to 1
    [ ] Because the mean automatically grows larger as width shrinks
    [ ] Because every Gaussian curve must share one fixed peak height
    [ ] Because the anomaly threshold epsilon was just decreased a bit
- Q: Which statement about the Gaussian distribution is a misconception to avoid?
    [ ] It can serve as the underlying model in anomaly detection
    [CORRECT] Changing the mean widens the curve rather than shifting it
    [ ] The overall shape of the Gaussian curve is bell-shaped here
    [ ] The mean and the variance each play a different distinct role
- Q: Which parameter determines where a Gaussian distribution is centered?
    [ ] The anomaly decision threshold epsilon
    [ ] The total count of training examples
    [CORRECT] The mean mu
    [ ] The variance of the distribution shape
- Q: As the variance (sigma squared) of a Gaussian increases, how does its curve change?
    [CORRECT] It becomes wider and shorter
    [ ] It shifts rightward along the axis
    [ ] It stays exactly the same shape
    [ ] It grows skinnier and taller
- Q: By the rules of probability, what is the total area under any Gaussian curve?
    [ ] One hundred
    [ ] 0.5
    [ ] Zero
    [CORRECT] One
- Q: Why must a skinnier (smaller-variance) Gaussian be taller than a wider one?
    [CORRECT] Because the total area under it must stay equal to one
    [ ] Because it is merely a fixed plotting convention
    [ ] Because a taller curve simply looks more bell-like
    [ ] Because the mean must exceed the variance numerically

### Mean and Variance in Gaussian Modeling

- Q: When fitting a Gaussian to data, what does the variance represent?
    [ ] The size of the training set considered alone
    [ ] The exact probability that a point is an anomaly
    [CORRECT] How spread out the values are around the mean
    [ ] The number of separate features contained in x
- Q: How does increasing the variance change the shape of a Gaussian curve?
    [CORRECT] It makes the curve wider and generally lower overall
    [ ] It always makes the anomalies far easier to detect
    [ ] It turns the continuous distribution into a discrete one
    [ ] It shifts the center of the curve to the left side
- Q: Why do the mean and variance matter for Gaussian-based anomaly detection?
    [ ] They fix the value of K that gets used inside the K-means routine
    [CORRECT] They define the probability model judging whether values are typical
    [ ] They remove the need to select any input features for the model
    [ ] They are used only for plotting and never by the algorithm itself
- Q: Which statement about the mean and variance is a misconception to avoid?
    [ ] The variance parameter controls the width of the curve
    [ ] The mean parameter controls the location of the curve
    [ ] Both quantities together help to define a Gaussian shape
    [CORRECT] They are interchangeable rather than center and spread
- Q: When fitting a Gaussian to data, what does the mean mu represent?
    [CORRECT] The center value around which the data tends to lie
    [ ] The number of anomalies found within the dataset here
    [ ] The threshold value that is used to classify the points
    [ ] The total area that is enclosed under the whole curve

### Estimating Gaussian Parameters from Data

- Q: In the simple anomaly model that treats features independently, what is estimated separately for each feature?
    [ ] A separate vocabulary of possible class labels
    [CORRECT] A mean and variance specific to that feature
    [ ] A distinct learning rate value for that feature
    [ ] A different number of clusters for each feature
- Q: What kind of data is most useful for fitting the normal-behavior model in anomaly detection?
    [ ] Examples drawn only from the held-out test set
    [ ] A tiny handful of anomalies, and nothing else
    [ ] Randomly generated class labels for the points
    [CORRECT] A large set of mostly normal examples
- Q: How are the parameters of a Gaussian typically estimated from training data?
    [ ] By reading the parameter values off of a plotted graph by hand
    [CORRECT] By computing each feature's mean and variance from the data
    [ ] By using only the anomalous examples found inside the dataset
    [ ] By first running a full K-means clustering pass on the data
- Q: Why might a few accidental anomalies in the training set not ruin the fitted Gaussian model?
    [ ] Because the estimated parameters do not depend on the data
    [ ] Because the anomalies are always removed fully automatically
    [ ] Because the method ignores the training set data entirely
    [CORRECT] Because the training set is dominated by normal examples

### Density Estimation for Anomaly Detection

- Q: A website builds a model p(x) to detect fraudulent user activity by flagging behavior with low probability. Which set of features would most plausibly drive p(x)?
    [CORRECT] Typing speed, login frequency, and access location
    [ ] The user's preferred website color scheme
    [ ] The alphabetical ranking of the username
    [ ] The brand printed on the user's keyboard
- Q: Which scenario is best suited to anomaly detection via density estimation rather than to standard supervised learning?
    [ ] You have millions of clearly labeled anomalous examples to train on
    [ ] You must predict a specific category label for every data point
    [CORRECT] You have very few positive (anomalous) examples but many normal ones
    [ ] You only need to compute the average value of the data points
- Q: Why are points lying far from the high-density region treated as more suspicious?
    [CORRECT] Because they tend to have lower probability under the normal model
    [ ] Because the distance value is the only feature the model ever uses
    [ ] Because they always form a brand-new separate class on their own
    [ ] Because supervised learning methods reliably fail on every one
- Q: In anomaly detection, what does density estimation aim to do?
    [ ] Estimate the slope of the fitted linear regression line
    [CORRECT] Estimate how likely each value of x is under normal data
    [ ] Count how many hidden layers the trained model contains
    [ ] Assign every example to its closest cluster centroid here
- Q: Why is modeling the probability density p(x) of normal examples useful for anomaly detection?
    [CORRECT] Examples with very low estimated p(x) can be flagged as anomalies
    [ ] It guarantees perfectly perfect recall across every anomaly seen
    [ ] It directly supplies the ground-truth supervised labels we need
    [ ] It removes any need to choose or engineer input features at all
- Q: Which statement about density-based anomaly detection is a misconception to avoid?
    [ ] The value p(x) reflects how typical a given data point really is
    [ ] Examples with a low estimated probability value can be flagged
    [CORRECT] It models the anomalies directly rather than modeling normal data
    [ ] A chosen threshold applied to p(x) is one part of the method
- Q: In density-estimation anomaly detection, an example is flagged when its estimated probability falls below a value epsilon. What does epsilon represent?
    [CORRECT] The probability threshold separating normal from anomalous points
    [ ] The total number of input features measured in the training set
    [ ] The learning rate used by the optimization algorithm during fitting
    [ ] The mean of the fitted normal distribution over the features
- Q: In the density-estimation approach to anomaly detection, what does the model fundamentally learn?
    [ ] A decision boundary separating pre-labeled good and bad examples
    [CORRECT] A probability model p(x) marking high- vs low-likelihood regions
    [ ] A count of how many examples fall in each category
    [ ] The slope of a line fit through the data points
- Q: In a density-estimation system that flags points with p(x) below threshold epsilon, what is the most likely effect of setting epsilon extremely high?
    [ ] The system stops flagging any point as an anomaly
    [CORRECT] Almost every data point gets flagged as an anomaly
    [ ] The probability p(x) rises automatically for all points
    [ ] The stored training data is erased from the model
- Q: What kind of data is primarily used to train the model p(x) for anomaly detection?
    [CORRECT] Examples of typical, mostly normal behavior
    [ ] Examples drawn solely from already-shipped units
    [ ] Randomly generated synthetic numbers
    [ ] Only the anomalous or defective examples
- Q: A density-estimation model computes $p(x_{\text{test}})$ for a new point and compares it to threshold $\epsilon$. If $p(x_{\text{test}}) \ge \epsilon$, how is the point classified?
    [ ] It indicates the model needs more training data
    [ ] It signals that the features must be rescaled
    [CORRECT] It is treated as a normal (non-anomalous) example
    [ ] It is immediately flagged as an anomaly
- Q: What does a low value of p(x) indicate about a new test example?
    [ ] It sits exactly at the distribution's peak
    [ ] It closely resembles the training examples
    [CORRECT] It is unusual relative to the normal data seen before
    [ ] It is most likely a normal, expected example
- Q: Why might a data center apply density estimation to its computers?
    [ ] To increase the network's bandwidth and speed
    [ ] To group users according to their stated preferences
    [CORRECT] To flag machines behaving very differently from the norm
    [ ] To estimate the combined physical weight of the servers
- Q: Using a trained model $p(x)$, how is a faulty aircraft engine identified from its measurements $x_{\text{test}}$?
    [ ] By matching it against engines built at a different factory
    [ ] By tracking the engine's physical location over time
    [CORRECT] By checking whether $p(x_{\text{test}})$ is below a small threshold $\epsilon$
    [ ] By confirming the engine produces measurable heat output
- Q: After fitting $p(x)$ on normal data, what role does $p(x_{\text{test}})$ play for a new example?
    [ ] It replaces the input feature vector entirely during scoring time
    [ ] It sets how many separate clusters the data ought to form first
    [ ] It exactly equals the model's average training loss value here
    [CORRECT] It is compared to a threshold to decide if the example is unusual

### Multivariate Anomaly Detection via Per-Feature Gaussians

- Q: Which statement about fitting one Gaussian per feature and multiplying them is a misunderstanding to avoid?
    [CORRECT] That all features share one identical Gaussian rather than each having its own fit
    [ ] That the overall probability is the product of the per-feature probabilities
    [ ] That this independent-product form is a practical simplification
    [ ] That different features can have different means and variances
- Q: Why can the product of per-feature probabilities p(x1)p(x2)...p(xn) become very small for an anomaly?
    [ ] Because the threshold epsilon is forced to be a negative number
    [ ] Because anomalous features are dropped before the product is taken
    [CORRECT] Because just one unusual feature value can pull the whole product low
    [ ] Because this product model always evaluates exactly to zero
- Q: Multiplying the per-feature probabilities as p(x1)p(x2)...p(xn) relies on which assumption about the features?
    [ ] That all features are forced to share one common mean
    [ ] That anomalous cases occur more often than normal ones
    [ ] That every feature takes only binary values 0 or 1
    [CORRECT] That the features are modeled as statistically independent
- Q: In the simple anomaly-detection model p(x) = p(x1)p(x2)...p(xn), how are multiple input features handled?
    [CORRECT] Each feature gets its own Gaussian, and these are multiplied into one model
    [ ] Each feature must be paired with its own class label before fitting
    [ ] All features are averaged into a single value before fitting one Gaussian
    [ ] Features, not training examples, are grouped into clusters
- Q: What is an important benefit of modeling each feature with its own one-dimensional Gaussian and multiplying them?
    [ ] It makes the anomaly threshold epsilon entirely unnecessary
    [ ] It recovers the exact true data distribution every time
    [CORRECT] It scales to many features while keeping each fit simple
    [ ] It removes any need to estimate means or variances at all

### Anomaly Threshold Epsilon

- Q: Which statement about the threshold epsilon is a misunderstanding to avoid?
    [ ] That it is chosen to balance how aggressively anomalies are flagged
    [ ] That changing it changes which examples get flagged
    [ ] That a lower p(x) reflects a more unusual example
    [CORRECT] That it is set automatically and needs no evaluation or tuning
- Q: What is the likely effect of setting the threshold epsilon too high?
    [ ] The detector silently turns itself into a fully supervised classifier
    [ ] The Gaussian probability model fitted to the data is no longer used at all
    [ ] No example can ever cross the raised threshold to be flagged
    [CORRECT] Many normal examples get flagged as anomalies along with true ones
- Q: What is a recognized practical difficulty when applying the threshold epsilon?
    [CORRECT] Choosing an appropriate value of epsilon is quite hard
    [ ] Epsilon can only be used with one-dimensional inputs
    [ ] Epsilon is always forced to be larger than one
    [ ] Epsilon must replace the model's cost function
- Q: Why is a threshold epsilon still needed even after p(x) has been modeled?
    [ ] Because epsilon takes the place of the fitted Gaussian parameters
    [ ] Because the value of p(x) cannot be computed without epsilon
    [CORRECT] Because a rule is needed to turn probabilities into anomaly decisions
    [ ] Because epsilon is what makes the feature distributions Gaussian
- Q: What is the purpose of the threshold epsilon in anomaly detection?
    [ ] To compute the mean value of the training data
    [CORRECT] To set the cutoff below which p(x) is flagged anomalous
    [ ] To set the step size used by gradient descent
    [ ] To fix the number of layers in a neural network
- Q: In the anomaly-detection algorithm, what is epsilon?
    [CORRECT] A threshold deciding whether p(x) is low enough to flag an anomaly
    [ ] The total count of input features present in each training example
    [ ] The mean parameter of the Gaussian distribution fitted to the data
    [ ] The step size used by the gradient descent parameter update rule
- Q: Using threshold epsilon, when is a new example x flagged as anomalous?
    [ ] When its probability p(x) is greater than epsilon
    [CORRECT] When its probability p(x) is less than epsilon
    [ ] When the example x happens to have exactly two features
    [ ] When the fitted Gaussian mean for x equals zero
- Q: Using the threshold epsilon, when is a test example declared an anomaly?
    [ ] When p(x) is exactly zero
    [CORRECT] When p(x) is less than epsilon
    [ ] When p(x) equals epsilon exactly
    [ ] When p(x) is greater than epsilon
- Q: In aircraft manufacturing, when is a newly built engine flagged for inspection?
    [ ] When the threshold epsilon turns out to exceed one
    [CORRECT] When its probability p(x) falls below epsilon
    [ ] When it rolls off the assembly line as expected
    [ ] When its measurements exactly match the training mean
- Q: In system monitoring, what happens when a computer behaves in a way never observed before?
    [ ] It is automatically assigned the normal class label of y equals 0
    [CORRECT] It is flagged as anomalous because p(x) likely drops below epsilon
    [ ] It is silently ignored by the detector and is simply never reported
    [ ] It instead receives an unusually high p(x) value above the threshold

### Building and Evaluating an Anomaly Detection System

- Q: How do a few labeled anomaly examples help even though the method is largely unsupervised?
    [CORRECT] They let you judge whether the system catches rare abnormal cases
    [ ] They fully replace the normal examples in the training set
    [ ] They are useful only for choosing the number of clusters
    [ ] They make the per-feature Gaussian assumption unnecessary
- Q: Why does evaluating an anomaly-detection system matter while you are still developing it?
    [CORRECT] It guides smarter choices of features and the threshold epsilon
    [ ] It guarantees the finished model will generalize perfectly
    [ ] It is a step that applies only to supervised learning systems
    [ ] It lets you proceed without collecting any training data
- Q: What kind of development decisions can a labeled evaluation set support?
    [ ] Dropping the cost function from the procedure entirely
    [ ] Choosing how many hidden layers a network should have
    [ ] Recasting the anomaly task as a regression problem
    [CORRECT] Choosing better features and a better value of epsilon
- Q: What is one key challenge in evaluating an anomaly-detection system?
    [ ] No labels of any kind are ever obtainable for evaluation
    [CORRECT] True anomalies are rare, so evaluation data is highly imbalanced
    [ ] The algorithm simply cannot be tested before it is deployed
    [ ] How well it does turns out not to depend on epsilon at all
- Q: Which belief about evaluating an anomaly detector is a misunderstanding to avoid?
    [ ] That development genuinely benefits from this feedback
    [ ] That even a small labeled set is valuable for tuning and assessment
    [CORRECT] That being unsupervised means labeled examples are never needed
    [ ] That the rarity of anomalies makes evaluation tricky

### Cross-Validation for Anomaly Detection

- Q: Which belief about train/CV/test splits in anomaly detection is a misunderstanding to avoid?
    [ ] That normal examples dominate the available data
    [ ] That very rare anomalies may force special handling of the splits
    [ ] That labeled anomalies are especially valuable for evaluation
    [CORRECT] That balanced-classification splitting always applies with no adaptation
- Q: When there are very few anomalies in total, what practical problem can arise with the data splits?
    [CORRECT] You may lack enough anomalies for a separate test set
    [ ] The fitted Gaussian model suddenly becomes exact
    [ ] Cross-validation turns into the same thing as clustering
    [ ] You are forced to switch over to linear regression
- Q: Why is the training set usually mostly normal examples, with anomalies placed in the cross-validation and test sets?
    [ ] Because normal examples provide no useful signal for training
    [CORRECT] Because the model fits normal behavior while anomalies gauge detection
    [ ] Because anomalous examples simply cannot be stored in a dataset
    [ ] Because a cross-validation set never requires any labels
- Q: How is a cross-validation set typically used in anomaly detection?
    [CORRECT] To tune epsilon and features using labeled normals and anomalies
    [ ] To select the number of clusters K used to partition the data
    [ ] To estimate only the mean of the Gaussian model fitted to the data
    [ ] To take the place of the training set when fitting the model
- Q: If scarce anomaly data forces you to use the cross-validation set as your only evaluation set, what trade-off appears?
    [CORRECT] You can still tune, but lose a fair final test estimate
    [ ] You no longer need a threshold epsilon at all
    [ ] You turn anomaly detection into supervised classification
    [ ] You make overfitting impossible from then on

### Precision, Recall, and F1 for Rare Anomalies

- Q: Precision answers which question about a model's anomaly predictions?
    [ ] How many input features were used to make each prediction
    [CORRECT] Of the examples flagged as anomalies, how many truly were anomalies
    [ ] Of all the true anomalies present, how many did the model catch
    [ ] What is the average variance of the fitted Gaussian model
- Q: Which belief about evaluating a detector on rare anomalies is a mistake to hold?
    [ ] Precision and recall together give a fuller picture than accuracy
    [ ] Severe class imbalance can make raw accuracy misleading
    [CORRECT] A very high overall accuracy guarantees the detector is performing well
    [ ] The F1 score offers a balanced trade-off between the two metrics
- Q: Why is the F1 score a useful single metric when both precision and recall matter?
    [CORRECT] It collapses precision and recall into one balanced number
    [ ] It reports the mean of the fitted Gaussian distribution directly
    [ ] It is exactly equal to accuracy on imbalanced datasets
    [ ] It selects the anomaly threshold epsilon for you automatically
- Q: Why are precision and recall preferred over plain accuracy when evaluating an anomaly detector on a highly imbalanced dataset?
    [ ] Because they let you evaluate the detector without choosing a decision threshold
    [CORRECT] Because a classifier that labels everything normal can still score very high accuracy
    [ ] Because these metrics are designed exclusively for regression-style numeric outputs
    [ ] Because the rarity of anomalies makes nearly all evaluation metrics numerically equal
- Q: Recall answers which question about a model's anomaly predictions?
    [CORRECT] Of all the true anomalies present, how many did the model catch
    [ ] What is the average predicted probability of normal examples
    [ ] Of the examples labeled normal, how many were correctly labeled
    [ ] How many cluster centroids the model ended up using

### Feature Engineering for Anomaly Detection

- Q: In a fraud-detection example, why might adding a user's typing speed as a feature help?
    [CORRECT] Because it adds a signal that can separate suspicious users from normal ones
    [ ] Because the typing-speed value itself becomes the anomaly threshold
    [ ] Because a typing-speed feature proves the user is fraudulent
    [ ] Because it makes all of the original features unnecessary
- Q: Why can careful feature engineering greatly improve an anomaly detector?
    [ ] Because an anomaly detector can only ever make use of one single input feature
    [CORRECT] Because better features can make anomalies stand out more clearly from normal data
    [ ] Because the features stop mattering entirely once the threshold epsilon has been fixed
    [ ] Because the Gaussian modeling assumption strictly forbids adding any brand-new features
- Q: What is a good sign that a newly engineered feature is helping an anomaly detector?
    [ ] The total number of labeled examples in the dataset increases
    [ ] It forces every example into a single shared Gaussian peak
    [ ] It strips essentially all of the variance out of the data
    [CORRECT] Normal examples keep a high p(x) while known anomalies get a low p(x)
- Q: Why can a ratio of two raw quantities be a useful engineered feature for anomaly detection?
    [CORRECT] Some abnormal cases only stand out once relationships between raw quantities are captured
    [ ] Taking ratios is fully guaranteed to make any input data perfectly Gaussian in its shape
    [ ] Ratio features can only ever turn out to be useful inside unsupervised clustering algorithms
    [ ] Using ratio features removes any further need to ever evaluate the trained anomaly detector
- Q: Which belief about feature engineering for anomaly detection is a mistake to hold?
    [ ] Relationships between different measurements can carry useful signal
    [ ] Designing extra informative features can materially boost detection
    [CORRECT] If the first features fail, nothing more can be done to improve the model
    [ ] Evaluation results can guide which features you choose to add

### Transforming Features to Be More Gaussian

- Q: Which transformation is a common way to make a right-skewed feature x look more Gaussian?
    [ ] Multiplying every value of x by zero
    [ ] Sorting the examples by x
    [CORRECT] Taking the logarithm, log(x)
    [ ] Replacing x with its target label
- Q: Which statement about transforming features is a misconception you should avoid?
    [ ] Histograms are a handy way to inspect a feature's distribution
    [ ] Better-shaped features can improve anomaly detection
    [CORRECT] Raw features must always be used exactly as collected
    [ ] A suitable transformation can make a feature more symmetric
- Q: A Gaussian anomaly detection model assumes each feature is roughly normally distributed. Why might you transform a feature before feeding it into such a model?
    [ ] To convert the continuous feature into a discrete output class label
    [ ] To reduce the total number of training examples present in the set
    [CORRECT] To reshape a skewed feature so it better fits the Gaussian assumption
    [ ] To decide how many distinct clusters the underlying data actually contains
- Q: Besides taking a logarithm, what is another transformation used to reduce skew in a feature?
    [ ] Running K-means on that single feature
    [CORRECT] Raising the feature to a fractional power, such as $x^{0.4}$
    [ ] Always replacing the feature with its mean value
    [ ] Recoding the feature as a categorical class label
- Q: When applying a log transform as log(x + c) for a small constant c, why add the constant first?
    [CORRECT] Because some values of x may be zero, and log(0) is undefined
    [ ] Because adding a constant increases the sample size
    [ ] Because it guarantees a perfectly Gaussian result
    [ ] Because the constant removes the need to tune epsilon

