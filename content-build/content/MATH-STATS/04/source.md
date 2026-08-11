# SOURCE PACK — Mathematics / Statistics and Probability / 04 Modeling data distributions (khanacademy.org)

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Density curves (khanacademy.org)   (5 questions)
2. Normal distributions and the empirical rule (khanacademy.org)   (5 questions)
3. Percentiles (khanacademy.org)   (5 questions)
4. Z-scores (khanacademy.org)   (5 questions)
5. Normal distribution calculations (khanacademy.org)   (5 questions)
6. More on normal distributions (khanacademy.org)   (5 questions)
7. Effects of linear transformations (khanacademy.org)   (5 questions)

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

## Covered by LATER lessons — do not teach these here

- 05 Exploring bivariate numerical data (khanacademy.org): Introduction to scatterplots (khanacademy.org), Introduction to trend lines (khanacademy.org), Correlation coefficients (khanacademy.org), Least-squares regression equations (khanacademy.org), Assessing the fit in least-squares regression (khanacademy.org), More on regression (khanacademy.org)
- 06 Study design (khanacademy.org): Lesson headings were not fully exposed in the live search snippet I could access. (khanacademy.org)
- 07 Probability (khanacademy.org): Randomness, probability, and simulation (khanacademy.org), Basic theoretical probability (khanacademy.org), Experimental probability (khanacademy.org), Probability using sample spaces (khanacademy.org), Basic set operations (khanacademy.org), Addition rule (khanacademy.org), Conditional probability and independence (khanacademy.org), Multiplication rule for independent events (khanacademy.org), Multiplication rule for dependent events (khanacademy.org)
- 08 Counting, permutations, and combinations (khanacademy.org): Counting principle and factorial (khanacademy.org), Permutations (khanacademy.org), Combinations (khanacademy.org), Combinatorics and probability (khanacademy.org)
- 09 Random variables (khanacademy.org): Discrete random variables (khanacademy.org), Continuous random variables (khanacademy.org), More on expected value (khanacademy.org), Binomial random variables (khanacademy.org), Binomial mean and standard deviation formulas (khanacademy.org), Geometric random variables (khanacademy.org), Poisson distribution (Khan Academy), Transforming random variables (khanacademy.org), Combining random variables (khanacademy.org)
- 10 Sampling distributions (khanacademy.org): What is a sampling distribution? (khanacademy.org), Sampling distribution of a sample mean (khanacademy.org), Sampling distribution of a sample proportion (khanacademy.org)
- 11 Confidence intervals (khanacademy.org): Introduction to confidence intervals (khanacademy.org), Estimating a population mean (khanacademy.org), Estimating a population proportion (khanacademy.org), More confidence interval videos (khanacademy.org)
- 12 Significance tests (hypothesis testing) (khanacademy.khanacademy.org): The idea of significance tests (khanacademy.khanacademy.org), Error probabilities and power (khanacademy.org), Tests about a population proportion (khanacademy.org), Tests about a population mean (Khan Academy), More significance testing videos (khanacademy.org)
- 13 Two-sample inference for the difference between groups (httpswww.khanacademy.org): Comparing two means (httpswww.khanacademy.org), Comparing two proportions (httpswww.khanacademy.org)
- 14 Inference for categorical data (chi-square tests) (khanacademy.org): Chi-square goodness-of-fit tests (khanacademy.org), Chi-square tests for relationships (khanacademy.org)
- 15 Advanced regression (inference and transforming) (khanacademy.org): Inference about slope (khanacademy.org), Nonlinear regression (khanacademy.org)
- 16 Analysis of variance (ANOVA) (khanacademy.org): Analysis of variance (ANOVA) (khanacademy.org)
- Probability Theory Foundations: Sample spaces, events, and axioms of probability, Permutations and Combinations, Conditional probability and Independence, Bayes' Theorem and its applications in ML, Law of Large Numbers and Central Limit Theorem, Probability as a measure, Venn diagrams in probability
- Random Variables and Distributions: Discrete vs. Continuous random variables, PMF, PDF, and CDF, Bernoulli, Binomial, Poisson, Uniform, and Normal, Expected Value and Variance of random variables
- Statistical Inference: Point estimation and sampling distributions, MLE and MAP estimation, Confidence intervals and margins of error
- Hypothesis Testing: Null and Alternative hypotheses, Type I and Type II errors, P-values and Significance levels (α), Z-tests and T-tests (one-sample and two-sample), Chi-squared tests for independence
- Advanced Statistical Applications: Linear Regression from a statistical perspective, Multiple Linear Regression and R-squared, Principal Component Analysis (PCA) math foundations, Introduction to Bayesian Statistics and Inference

## The live quiz bank for these topics — 35 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Density curves (khanacademy.org)

- Q: Which statement holds for every density curve?
    [ ] It must be symmetric
    [CORRECT] It stays on or above the x-axis
    [ ] It must be bell-shaped
    [ ] It never touches the x-axis
- Q: For any valid density curve, what is the total area under the curve?
    [ ] The standard deviation
    [CORRECT] 1
    [ ] The mean of the distribution
    [ ] 0
- Q: Can the total area under a density curve ever be greater than 1?
    [CORRECT] No, it must equal 1
    [ ] Yes, but only for normal curves
    [ ] Yes, if the curve is tall
    [ ] Yes, if the mean is large
- Q: On a density curve, the probability that a value falls in an interval is represented by which quantity?
    [CORRECT] The area over that interval
    [ ] The width of the interval
    [ ] The mean of the distribution
    [ ] The height of the curve there
- Q: For a continuous variable $X$, the area under its density curve from 2 to 5 equals 0.3. What does this value tell you?
    [ ] The mean of $X$ equals $0.3$
    [ ] Exactly 30 data points lie there
    [ ] The curve has height $0.3$ there
    [CORRECT] $P(2 \le X \le 5) = 0.3$

### Normal distributions and the empirical rule (khanacademy.org)

- Q: In a normal distribution, approximately what percent of values lie within 1 standard deviation of the mean?
    [CORRECT] About 68%
    [ ] About 50%
    [ ] About 95%
    [ ] About 99.7%
- Q: The empirical rule (68-95-99.7) gives accurate percentages for distributions that are
    [ ] strongly skewed
    [ ] clearly bimodal
    [CORRECT] approximately normal
    [ ] roughly uniform
- Q: In a normal distribution, approximately what percent of values lie within 3 standard deviations of the mean?
    [CORRECT] About 99.7%
    [ ] About 95%
    [ ] About 75%
    [ ] About 68%
- Q: In a normal distribution, approximately what percent of values lie within 2 standard deviations of the mean?
    [CORRECT] About 95%
    [ ] About 99.7%
    [ ] About 90%
    [ ] About 68%
- Q: Under the empirical rule, a score more than 2 standard deviations above the mean is best described as
    [ ] below average
    [CORRECT] somewhat unusual
    [ ] essentially impossible
    [ ] near the center

### Percentiles (khanacademy.org)

- Q: The first quartile (Q1) of a data set corresponds to which percentile?
    [ ] The 50th percentile
    [CORRECT] The 25th percentile
    [ ] The 10th percentile
    [ ] The 75th percentile
- Q: If a test score falls at the 30th percentile, how does it compare with the other scores?
    [ ] It is lower than every other score
    [ ] It is exactly the average score
    [CORRECT] It is higher than about 30% of scores
    [ ] It is higher than about 70% of scores
- Q: If a value lies at the 90th percentile of a data set, what does that tell you?
    [ ] Roughly 90% of the values are identical
    [ ] About 90% of the values exceed it
    [CORRECT] About 90% of the values are at or below it
    [ ] It is the single largest value present
- Q: The third quartile (Q3) of a data set corresponds to which percentile?
    [CORRECT] The 75th percentile
    [ ] The 90th percentile
    [ ] The 25th percentile
    [ ] The 50th percentile
- Q: Which percentile of a distribution coincides with its median?
    [ ] The 100th percentile
    [ ] The 75th percentile
    [CORRECT] The 50th percentile
    [ ] The 25th percentile

### Z-scores (khanacademy.org)

- Q: What does the z-score of a data value measure?
    [ ] The probability of observing that event
    [ ] The original, unstandardized data value itself
    [ ] The median of the underlying distribution
    [CORRECT] How many standard deviations it lies from the mean
- Q: In a roughly normal distribution, which z-score corresponds to the most unusual (least likely) value?
    [ ] z = 0.2
    [ ] z = -0.5
    [CORRECT] z = 2.7
    [ ] z = 1.0
- Q: If a value has a z-score of -1.5, where does it lie relative to the mean?
    [ ] 1.5 standard deviations above the mean
    [CORRECT] 1.5 standard deviations below the mean
    [ ] Exactly 1.5 raw units below zero
    [ ] Precisely equal to the distribution mean
- Q: A positive z-score indicates that the corresponding value is
    [ ] Exactly equal to the median
    [ ] Automatically a clear outlier
    [ ] Below the mean of the data
    [CORRECT] Above the mean of the data
- Q: For a value x = 80 from a distribution with mean 70 and standard deviation 5, what is its z-score?
    [ ] 1
    [ ] -2
    [CORRECT] 2
    [ ] 3

### Normal distribution calculations (khanacademy.org)

- Q: For a standard normal distribution, the empirical rule says about 68% of values fall between z = -1 and z = 1. Using this, approximately what percent of values lie above z = 1?
    [ ] About 2.5%
    [CORRECT] About 16%
    [ ] About 32%
    [ ] About 50%
- Q: In a normal model, which of these z-scores corresponds to the most extreme (least typical) observation?
    [ ] z = 1.1
    [ ] z = 0.5
    [ ] z = -0.5
    [CORRECT] z = 2.2
- Q: A value x = 85 comes from a distribution with mean 70 and standard deviation 5. What is its z-score?
    [ ] -3
    [ ] 2
    [CORRECT] 3
    [ ] 15
- Q: To look up probabilities in a standard normal table, raw values are first converted to
    [ ] quartiles
    [ ] medians
    [ ] sample means
    [CORRECT] z-scores
- Q: A normal distribution has mean 100 and standard deviation 15. Which value lies exactly 1 standard deviation below the mean?
    [ ] 100
    [CORRECT] 85
    [ ] 115
    [ ] 90

### More on normal distributions (khanacademy.org)

- Q: Which change makes a normal curve wider and flatter?
    [CORRECT] A larger standard deviation
    [ ] A lower median
    [ ] A larger mean
    [ ] A smaller sample size
- Q: In a perfectly normal distribution, how do the mean, median, and mode compare?
    [ ] They are all equal to 0
    [ ] They are always different
    [CORRECT] They are approximately equal
    [ ] They are unrelated values
- Q: Increasing the mean of a normal distribution while keeping the standard deviation fixed changes
    [ ] its symmetry but not its center
    [ ] its total area under the curve
    [CORRECT] its center but not its shape
    [ ] its shape but not its center
- Q: Using the notation Normal(mean, standard deviation), suppose X ~ Normal(50, 4). What does the 4 represent?
    [ ] The variance
    [ ] The mean
    [ ] A probability
    [CORRECT] The standard deviation
- Q: Which description matches the graph of a normal distribution?
    [ ] Skewed to the right
    [ ] Flat and uniform
    [CORRECT] Symmetric and bell-shaped
    [ ] Discrete and spiky

### Effects of linear transformations (khanacademy.org)

- Q: Every value in a data set is increased by 7. What happens to the mean?
    [ ] It is multiplied by 7
    [CORRECT] It increases by 7
    [ ] It does not change
    [ ] It decreases by 7
- Q: Every value in a data set is multiplied by 4. What happens to the standard deviation?
    [ ] It is multiplied by 16
    [CORRECT] It is multiplied by 4
    [ ] It increases by 4
    [ ] It is unchanged
- Q: Each value x is transformed by y = 2x + 1. In terms of the old mean, what is the new mean?
    [ ] New mean = (old mean)/2 + 1
    [ ] New mean = 2(old mean)
    [ ] New mean = old mean + 1
    [CORRECT] New mean = 2(old mean) + 1
- Q: Every value in a data set is increased by 3. What happens to the median?
    [ ] It is unchanged
    [ ] It is multiplied by 3
    [CORRECT] It increases by 3
    [ ] It decreases by 3
- Q: Every value in a data set is shifted by adding the same constant. What happens to the shape of the distribution?
    [ ] It changes unpredictably
    [CORRECT] It is unchanged, just shifted
    [ ] It becomes more spread out
    [ ] It becomes symmetric

