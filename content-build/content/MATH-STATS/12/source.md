# SOURCE PACK — Mathematics / Statistics and Probability / 12 Significance tests (hypothesis testing) (khanacademy.khanacademy.org)

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. The idea of significance tests (khanacademy.khanacademy.org)   (5 questions)
2. Error probabilities and power (khanacademy.org)   (4 questions)
3. Tests about a population proportion (khanacademy.org)   (5 questions)
4. Tests about a population mean (Khan Academy)   (5 questions)
5. More significance testing videos (khanacademy.org)   (5 questions)

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

## Covered by LATER lessons — do not teach these here

- 13 Two-sample inference for the difference between groups (httpswww.khanacademy.org): Comparing two means (httpswww.khanacademy.org), Comparing two proportions (httpswww.khanacademy.org)
- 14 Inference for categorical data (chi-square tests) (khanacademy.org): Chi-square goodness-of-fit tests (khanacademy.org), Chi-square tests for relationships (khanacademy.org)
- 15 Advanced regression (inference and transforming) (khanacademy.org): Inference about slope (khanacademy.org), Nonlinear regression (khanacademy.org)
- 16 Analysis of variance (ANOVA) (khanacademy.org): Analysis of variance (ANOVA) (khanacademy.org)
- Probability Theory Foundations: Sample spaces, events, and axioms of probability, Permutations and Combinations, Conditional probability and Independence, Bayes' Theorem and its applications in ML, Law of Large Numbers and Central Limit Theorem, Probability as a measure, Venn diagrams in probability
- Random Variables and Distributions: Discrete vs. Continuous random variables, PMF, PDF, and CDF, Bernoulli, Binomial, Poisson, Uniform, and Normal, Expected Value and Variance of random variables
- Statistical Inference: Point estimation and sampling distributions, MLE and MAP estimation, Confidence intervals and margins of error
- Hypothesis Testing: Null and Alternative hypotheses, Type I and Type II errors, P-values and Significance levels (α), Z-tests and T-tests (one-sample and two-sample), Chi-squared tests for independence
- Advanced Statistical Applications: Linear Regression from a statistical perspective, Multiple Linear Regression and R-squared, Principal Component Analysis (PCA) math foundations, Introduction to Bayesian Statistics and Inference

## The live quiz bank for these topics — 24 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### The idea of significance tests (khanacademy.khanacademy.org)

- Q: If the p-value is less than the significance level α, what is the standard decision?
    [ ] Accept the null as proven
    [ ] Fail to reject the null
    [ ] Increase the sample mean
    [CORRECT] Reject the null hypothesis
- Q: Which statement correctly describes what a p-value measures?
    [ ] The probability that the data prove a causal link
    [CORRECT] How surprising the data are if the null holds
    [ ] The overall confidence level chosen for the test
    [ ] The probability that the null hypothesis is actually true
- Q: In a significance test, what does the null hypothesis typically represent?
    [ ] The researcher's own claim, by default
    [ ] A statement that is guaranteed false
    [CORRECT] A claim of no effect or no difference
    [ ] The value of the observed sample statistic
- Q: What does a small p-value indicate in a significance test?
    [ ] Weak evidence against the null
    [ ] That the null hypothesis is certainly true
    [ ] That the collected sample size was small
    [CORRECT] Strong evidence against the null
- Q: What is the main purpose of a significance test?
    [CORRECT] To weigh evidence against a null hypothesis
    [ ] To produce a single point estimate of a value
    [ ] To report only the chosen confidence level
    [ ] To prove the stated null hypothesis is true

### Error probabilities and power (khanacademy.org)

- Q: The power of a hypothesis test is the probability of which outcome?
    [ ] Obtaining a p-value larger than α
    [CORRECT] Rejecting a null that is false
    [ ] Committing a Type I error in the test
    [ ] Incorrectly rejecting a null that is true
- Q: In hypothesis testing, when does a Type II error occur?
    [ ] We set the value of α to 0.05
    [ ] We correctly reject a null that is false
    [CORRECT] We fail to reject a false null
    [ ] We mistakenly reject a null that is true
- Q: In hypothesis testing, when does a Type I error occur?
    [CORRECT] We reject a null that is true
    [ ] We reject a null that is false
    [ ] We fail to reject a true null
    [ ] We fail to reject a false null
- Q: Holding other factors constant, how does increasing the sample size usually affect the power of a test?
    [ ] It decreases power
    [ ] It has no effect on power
    [ ] It guarantees a Type I error
    [CORRECT] It increases power

### Tests about a population proportion (khanacademy.org)

- Q: In a proportion test run at significance level α = 0.05 with a p-value of 0.02, the correct decision is to
    [ ] collect a larger sample first
    [ ] fail to reject H0
    [CORRECT] reject H0
    [ ] accept H0 as proven
- Q: In a one-sample proportion test, which quantity is computed directly from the collected data?
    [CORRECT] the sample proportion p-hat
    [ ] the claim stated in H0
    [ ] the hypothesized value p0
    [ ] the significance level α
- Q: When the observed p-hat is many standard errors away from the hypothesized p0, the resulting p-value tends to be
    [ ] exactly equal to 1
    [ ] large
    [ ] mathematically undefined
    [CORRECT] small
- Q: The z test statistic in a one-sample proportion test measures how far the
    [CORRECT] observed p-hat lies from p0 in standard errors
    [ ] sample mean x-bar lies from μ in raw units
    [ ] sample median sits above the sample mean
    [ ] correlation r lies from a value of 0
- Q: In a one-sample z-test for a proportion, the parameter named in the null hypothesis is the population
    [ ] mean μ
    [CORRECT] proportion p
    [ ] correlation r
    [ ] standard deviation σ

### Tests about a population mean (Khan Academy)

- Q: In a test about a mean with significance level α = 0.05, a computed p-value of 0.12 leads you to
    [ ] accept H0 as true
    [ ] reject the null H0
    [CORRECT] fail to reject H0
    [ ] rewrite the null hypothesis
- Q: In a test about a mean, a large positive value of the test statistic indicates the sample mean lies
    [CORRECT] far above the null value
    [ ] right at the null value
    [ ] outside the usable range
    [ ] far below the null value
- Q: Holding the effect size fixed, which change typically pushes the p-value of a mean test lower?
    [ ] a smaller sample size
    [ ] a lower confidence level
    [CORRECT] a larger sample size
    [ ] a higher choice of α
- Q: In a one-sample t-test about a mean, the parameter named in the null hypothesis is the population
    [CORRECT] mean μ
    [ ] proportion p
    [ ] correlation r
    [ ] standard deviation σ
- Q: Which sample statistic serves as the point estimate in a test about a population mean?
    [CORRECT] the sample mean x-bar
    [ ] the sample proportion p-hat
    [ ] the correlation r
    [ ] the first quartile Q1

### More significance testing videos (khanacademy.org)

- Q: In a significance test, which quantity should be chosen before the data are examined?
    [ ] the resulting p-value
    [ ] the observed test statistic
    [CORRECT] the significance level α
    [ ] the value of the sample mean
- Q: When the alternative hypothesis is two-sided, the significance test is sensitive to
    [ ] only decreases below H0
    [CORRECT] differences in either direction
    [ ] a difference of exactly zero
    [ ] only increases above H0
- Q: A significance test that yields a p-value of 0.80 provides
    [ ] proof that H0 is impossible
    [ ] proof the sample was biased
    [ ] strong evidence against H0
    [CORRECT] weak evidence against H0
- Q: Rejecting the null hypothesis H0 at significance level α means that the
    [CORRECT] data give enough evidence against H0 at α
    [ ] alternative now holds in every population
    [ ] null has been proven false for certain
    [ ] sample is known to contain no error
- Q: Failing to reject the null hypothesis H0 means that the
    [CORRECT] sample lacks enough evidence against H0
    [ ] p-value must have come out to 1
    [ ] alternative hypothesis has been disproven
    [ ] null H0 has been shown to be true

