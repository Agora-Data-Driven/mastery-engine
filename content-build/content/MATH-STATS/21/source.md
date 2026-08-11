# SOURCE PACK — Mathematics / Statistics and Probability / Advanced Statistical Applications

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Linear Regression from a statistical perspective   (4 questions)
2. Multiple Linear Regression and R-squared   (4 questions)
3. Principal Component Analysis (PCA) math foundations   (4 questions)
4. Introduction to Bayesian Statistics and Inference   (4 questions)

## Already taught earlier in this course

- Analyzing one categorical variable (khanacademy.org)
- Two-way tables (khanacademy.org)
- Distributions in two-way tables (khanacademy.org)
- Displaying quantitative data with graphs (khanacademy.org)
- More on data displays (khanacademy.org)
- Describing and comparing distributions (khanacademy.org)
- Measuring center in quantitative data (Khan Academy)
- More on mean and median (Khan Academy)
- Interquartile range (IQR) (Khan Academy)
- Box and whisker plots (Khan Academy)
- Covariance and Correlation (Pearson and Spearman)
- Variance and standard deviation of a population (Khan Academy)
- Variance and standard deviation of a sample (Khan Academy)
- More on standard deviation (Khan Academy)
- Other measures of spread (Khan Academy)
- Density curves (khanacademy.org)
- Normal distributions and the empirical rule (khanacademy.org)
- Percentiles (khanacademy.org)
- Z-scores (khanacademy.org)
- Normal distribution calculations (khanacademy.org)
- More on normal distributions (khanacademy.org)
- Effects of linear transformations (khanacademy.org)
- Introduction to scatterplots (khanacademy.org)
- Introduction to trend lines (khanacademy.org)
- Correlation coefficients (khanacademy.org)
- Least-squares regression equations (khanacademy.org)
- Assessing the fit in least-squares regression (khanacademy.org)
- More on regression (khanacademy.org)
- Lesson headings were not fully exposed in the live search snippet I could access. (khanacademy.org)
- Randomness, probability, and simulation (khanacademy.org)
- Basic theoretical probability (khanacademy.org)
- Experimental probability (khanacademy.org)
- Probability using sample spaces (khanacademy.org)
- Basic set operations (khanacademy.org)
- Addition rule (khanacademy.org)
- Conditional probability and independence (khanacademy.org)
- Multiplication rule for independent events (khanacademy.org)
- Multiplication rule for dependent events (khanacademy.org)
- Counting principle and factorial (khanacademy.org)
- Permutations (khanacademy.org)
- Combinations (khanacademy.org)
- Combinatorics and probability (khanacademy.org)
- Discrete random variables (khanacademy.org)
- Continuous random variables (khanacademy.org)
- More on expected value (khanacademy.org)
- Binomial random variables (khanacademy.org)
- Binomial mean and standard deviation formulas (khanacademy.org)
- Geometric random variables (khanacademy.org)
- Poisson distribution (Khan Academy)
- Transforming random variables (khanacademy.org)
- Combining random variables (khanacademy.org)
- What is a sampling distribution? (khanacademy.org)
- Sampling distribution of a sample mean (khanacademy.org)
- Sampling distribution of a sample proportion (khanacademy.org)
- Introduction to confidence intervals (khanacademy.org)
- Estimating a population mean (khanacademy.org)
- Estimating a population proportion (khanacademy.org)
- More confidence interval videos (khanacademy.org)
- The idea of significance tests (khanacademy.khanacademy.org)
- Error probabilities and power (khanacademy.org)
- Tests about a population proportion (khanacademy.org)
- Tests about a population mean (Khan Academy)
- More significance testing videos (khanacademy.org)
- Comparing two means (httpswww.khanacademy.org)
- Comparing two proportions (httpswww.khanacademy.org)
- Chi-square goodness-of-fit tests (khanacademy.org)
- Chi-square tests for relationships (khanacademy.org)
- Inference about slope (khanacademy.org)
- Nonlinear regression (khanacademy.org)
- Analysis of variance (ANOVA) (khanacademy.org)
- Sample spaces, events, and axioms of probability
- Permutations and Combinations
- Conditional probability and Independence
- Bayes' Theorem and its applications in ML
- Law of Large Numbers and Central Limit Theorem
- Probability as a measure
- Venn diagrams in probability
- Discrete vs. Continuous random variables
- PMF, PDF, and CDF
- Bernoulli, Binomial, Poisson, Uniform, and Normal
- Expected Value and Variance of random variables
- Point estimation and sampling distributions
- MLE and MAP estimation
- Confidence intervals and margins of error
- Null and Alternative hypotheses
- Type I and Type II errors
- P-values and Significance levels (α)
- Z-tests and T-tests (one-sample and two-sample)
- Chi-squared tests for independence

## The live quiz bank for these topics — 16 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Linear Regression from a statistical perspective

- Q: Which statement about regression is correct?
    [ ] Residuals can be ignored whenever the correlation r is large
    [ ] Regression can be applied only to variables that are categorical
    [CORRECT] A fitted line is descriptive; testing the slope makes it inferential
    [ ] A strong correlation between x and y is enough to demonstrate causation
- Q: Which inferential question turns a fitted regression line into a statistical inference about the population?
    [CORRECT] Whether the population slope likely differs from zero
    [ ] Whether every residual in the sample is positive
    [ ] Whether the intercept is meaningful in all cases
    [ ] Whether the correlation r is exactly equal to 1
- Q: What quantity does the least-squares regression line minimize?
    [ ] The correlation coefficient between x and y
    [ ] The sample variance of the predictor x
    [CORRECT] The sum of the squared residuals
    [ ] The sum of the raw signed residuals
- Q: In a fitted regression, what is a residual for a given data point?
    [ ] The slope of the line times its intercept
    [ ] The squared error computed before fitting
    [ ] The predicted value minus the overall mean
    [CORRECT] The observed value minus the predicted value

### Multiple Linear Regression and R-squared

- Q: At a high level, what does the R-squared of a regression model summarize?
    [ ] How large a sample is needed for the inference to be valid
    [ ] How many outliers are present within the given data set
    [ ] How small the p-value of the fitted slope happens to be
    [CORRECT] How much of the variation in the outcome the model explains
- Q: What is the basic purpose of multiple linear regression?
    [ ] To replace every probability model in use
    [ ] To count the frequencies of categorical labels
    [CORRECT] To predict one outcome from several input features
    [ ] To diagonalize a square matrix of raw data
- Q: Using several traits of a country together (such as income, health, and freedom) to predict its happiness score illustrates which capability of multiple linear regression?
    [ ] It requires the response variable to be strictly categorical
    [ ] It can only be run from inside an interactive coding lab
    [ ] It forbids a model from ever using only a single predictor
    [CORRECT] It lets several predictors jointly contribute to one model
- Q: Adding more predictors makes a regression model more flexible. What concern does that added flexibility raise?
    [ ] The sample mean of the outcome variable becomes undefined
    [ ] The slope coefficients can no longer be interpreted in any way at all
    [ ] The response variable stops being a quantitative measure
    [CORRECT] The model may fit random noise unless its complexity is controlled

### Principal Component Analysis (PCA) math foundations

- Q: Why does PCA use the eigenvectors of the covariance matrix as its principal components?
    [ ] Because they make every transformed coordinate come out positive
    [CORRECT] Because they point along the directions that maximize variance
    [ ] Because they remove any need to center the data first
    [ ] Because they always coincide with the standard basis vectors
- Q: What is the primary goal of Principal Component Analysis?
    [CORRECT] To find the directions of greatest variation in the data
    [ ] To convert each variable into a probability value
    [ ] To fit a least-squares line using a single predictor
    [ ] To maximize the determinant of the data matrix
- Q: Once the covariance matrix's eigenvalues and eigenvectors are computed, what is the next step in PCA?
    [ ] Replace each eigenvector with its corresponding residual
    [ ] Invert the covariance matrix before doing anything else
    [ ] Add the feature means back before selecting any components
    [CORRECT] Sort by descending eigenvalue and keep the top directions
- Q: After centering the data, which matrix does the PCA procedure form next?
    [ ] The Hessian matrix of a loss function
    [ ] The inverse of the correlation matrix
    [ ] The projection matrix onto the null space
    [CORRECT] The covariance matrix of the features

### Introduction to Bayesian Statistics and Inference

- Q: In Bayesian inference, what does the posterior represent?
    [ ] The p-value associated with the null hypothesis
    [ ] The sampling distribution of the sample mean x̄
    [ ] The prior rescaled so its probabilities sum to one
    [CORRECT] The belief about a quantity after incorporating the data
- Q: What is the central idea of Bayesian inference?
    [ ] Use only observed frequencies and discard prior beliefs
    [ ] Treat every model as equally probable no matter the data
    [CORRECT] Update a prior belief into a posterior after seeing data
    [ ] Replace the likelihood with a fixed confidence interval
- Q: In Bayesian inference, what does the prior represent?
    [ ] The width of the resulting confidence interval
    [ ] The probability of the observed evidence on its own
    [ ] The belief about a quantity after observing the data
    [CORRECT] The belief about a quantity before observing new data
- Q: Why can Bayesian methods be especially appealing when only limited data is available?
    [ ] Because small samples guarantee an exact posterior
    [CORRECT] Because the prior adds useful structure when data is scarce
    [ ] Because Bayesian methods need no probability model at all
    [ ] Because the prior removes all subjectivity from inference

