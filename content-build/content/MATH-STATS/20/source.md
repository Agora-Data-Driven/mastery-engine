# SOURCE PACK — Mathematics / Statistics and Probability / Hypothesis Testing

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Null and Alternative hypotheses   (4 questions)
2. Type I and Type II errors   (4 questions)
3. P-values and Significance levels (α)   (4 questions)
4. Z-tests and T-tests (one-sample and two-sample)   (3 questions)
5. Chi-squared tests for independence   (5 questions)

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

## Covered by LATER lessons — do not teach these here

- Advanced Statistical Applications: Linear Regression from a statistical perspective, Multiple Linear Regression and R-squared, Principal Component Analysis (PCA) math foundations, Introduction to Bayesian Statistics and Inference

## The live quiz bank for these topics — 20 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Null and Alternative hypotheses

- Q: What role does the alternative hypothesis Ha play in a hypothesis test?
    [ ] It is the minimum sample size the test requires
    [ ] It is the point estimate of the population mean
    [ ] It is the p-value produced by the test
    [CORRECT] It is the competing claim that challenges the null
- Q: In hypothesis testing, what does the null hypothesis H0 represent?
    [ ] The midpoint of the confidence interval
    [CORRECT] The default position the test evaluates against
    [ ] The claim you intend to prove true at any cost
    [ ] The observed value of the sample statistic
- Q: When the sample evidence is not strong enough to support Ha, what is the correct decision wording?
    [CORRECT] Fail to reject H0
    [ ] Prove that H0 is correct forever
    [ ] Reject the alternative hypothesis Ha
    [ ] Accept H0 with full certainty
- Q: Why does hypothesis testing start from H0 rather than trying to directly prove Ha?
    [ ] The null hypothesis is simply assumed to be true with complete certainty
    [ ] Hypothesis tests can only ever be applied to single population proportions
    [CORRECT] It assumes a default model and checks if the data are surprising under it
    [ ] The alternative hypothesis Ha is never actually written down anywhere

### Type I and Type II errors

- Q: In hypothesis testing, what is a Type I error?
    [ ] Failing to reject a null hypothesis that is actually false
    [CORRECT] Rejecting a null hypothesis that is actually true
    [ ] Reporting a confidence interval that is far too narrow
    [ ] Choosing a sample size too small to detect a real effect
- Q: In hypothesis testing, what is a Type II error?
    [ ] Computing the sample mean from the wrong column of data
    [CORRECT] Failing to reject a null hypothesis that is actually false
    [ ] Rejecting a null hypothesis that is in fact true
    [ ] Obtaining a p-value of exactly 0.5 in the test
- Q: What does the statistical power of a hypothesis test measure?
    [ ] The probability of accepting and proving the null to be true
    [ ] The width of the resulting confidence interval for the mean
    [CORRECT] The probability of correctly rejecting a false null hypothesis
    [ ] The magnitude of the observed sample mean within the study
- Q: Why are Type I and Type II errors typically defined and discussed as a pair?
    [CORRECT] Because a test can err in two ways given the truth and the decision
    [ ] Because committing one of them always forces the other to occur too
    [ ] Because they are the same mistake written with two different symbols
    [ ] Because both kinds of error can arise only ever within a z-test

### P-values and Significance levels (α)

- Q: Using the standard decision rule, what do you conclude when the p-value satisfies $p \le \alpha$?
    [ ] Switch to computing a chi-square statistic
    [CORRECT] Reject the null hypothesis $H_0$
    [ ] Accept the null hypothesis permanently
    [ ] Automatically increase the sample size
- Q: Conceptually, under what assumption is a p-value computed?
    [ ] By averaging the null and alternative models
    [ ] Assuming the alternative hypothesis is true
    [ ] Without reference to any probability model
    [CORRECT] Assuming the null hypothesis is true
- Q: What does the significance level α represent in hypothesis testing?
    [ ] The value of the test statistic computed from the observed data
    [ ] The simple sample mean of all the observed measurements taken
    [ ] The posterior probability that the null hypothesis is true
    [CORRECT] The cutoff for deciding whether the evidence is strong enough
- Q: What does a small p-value indicate about the observed result?
    [CORRECT] It would be surprising if the null hypothesis were true
    [ ] The sample size used was almost certainly too small
    [ ] The null hypothesis is definitively proven false
    [ ] The confidence interval is guaranteed to contain 0

### Z-tests and T-tests (one-sample and two-sample)

- Q: For inference about a population mean when the population standard deviation is unknown, which procedure is typically used?
    [CORRECT] A t-interval or t-test
    [ ] A z-interval or z-test
    [ ] A permutation count
    [ ] A chi-square test
- Q: To compare the average outcomes of two independent quantitative groups, which tool family applies?
    [ ] A side-by-side box plot only
    [CORRECT] Two-sample mean inference
    [ ] A goodness-of-fit test
    [ ] A one-sample proportion z-test
- Q: For inference about a single population proportion, which test family is standard?
    [ ] A chi-square procedure
    [ ] A t-based procedure
    [ ] An ANOVA procedure
    [CORRECT] A z-based procedure

### Chi-squared tests for independence

- Q: A chi-square test works by comparing which two quantities?
    [ ] Prior probabilities against posterior probabilities
    [ ] Sample means against the sample medians
    [CORRECT] Observed counts against expected counts
    [ ] Regression slopes against regression intercepts
- Q: What does a chi-square test for independence assess?
    [ ] Whether a fitted regression slope is equal to zero
    [ ] Whether two population means differ from each other
    [CORRECT] Whether two categorical variables are associated
    [ ] Whether a random variable follows a normal law
- Q: Which expression gives the chi-square test statistic, where O is an observed count and E is the expected count?
    [ ] $\chi^2 = \sum (O - E)$
    [ ] $\chi^2 = \sum O \cdot E$
    [ ] $\chi^2 = \sum (O + E)^2$
    [CORRECT] $\chi^2 = \sum \frac{(O - E)^2}{E}$
- Q: Why must a chi-square test be computed from raw category counts rather than from percentages alone?
    [ ] Because the chi-square test requires continuous measurement data
    [ ] Because converting any value to a percentage will make it inaccurate
    [ ] Because percentages and counts always yield contradictory conclusions
    [CORRECT] Because the statistic compares observed and expected counts per category
- Q: If the observed counts fall far from the counts expected under independence, what happens to the chi-square statistic?
    [ ] It is forced down toward zero
    [ ] It becomes smaller than before
    [ ] It is converted into a t-statistic
    [CORRECT] It becomes larger

