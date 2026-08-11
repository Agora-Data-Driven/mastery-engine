# SOURCE PACK — Mathematics / Statistics and Probability / Statistical Inference

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Point estimation and sampling distributions   (5 questions)
2. MLE and MAP estimation   (5 questions)
3. Confidence intervals and margins of error   (4 questions)

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

## Covered by LATER lessons — do not teach these here

- Hypothesis Testing: Null and Alternative hypotheses, Type I and Type II errors, P-values and Significance levels (α), Z-tests and T-tests (one-sample and two-sample), Chi-squared tests for independence
- Advanced Statistical Applications: Linear Regression from a statistical perspective, Multiple Linear Regression and R-squared, Principal Component Analysis (PCA) math foundations, Introduction to Bayesian Statistics and Inference

## The live quiz bank for these topics — 14 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Point estimation and sampling distributions

- Q: What trend in a statistic's sampling distribution emerges as the sample size grows?
    [ ] Every raw data value converges to one number
    [CORRECT] It becomes more stable and more precise
    [ ] Outliers vanish from the population itself
    [ ] Population parameters shift to match the sample
- Q: Why is a sampling distribution different from the distribution of the raw data?
    [ ] Because the individual raw data values can never be graphed
    [ ] Because sample statistics never vary from one sample to another
    [CORRECT] Because it tracks a statistic like x̄ or p̂ across many samples
    [ ] Because sampling distributions involve no probability whatsoever
- Q: For the sampling distribution of the sample proportion $\hat{p}$, what are its mean and standard deviation?
    [ ] $\mu_{\hat{p}} = 0$ and $\sigma_{\hat{p}} = p$
    [ ] $\mu_{\hat{p}} = \frac{p}{n}$ and $\sigma_{\hat{p}} = p(1-p)$
    [ ] $\mu_{\hat{p}} = \mu$ and $\sigma_{\hat{p}} = \frac{\sigma}{\sqrt{n}}$
    [CORRECT] $\mu_{\hat{p}} = p$ and $\sigma_{\hat{p}} = \sqrt{\frac{p(1-p)}{n}}$
- Q: For the sampling distribution of the sample mean $\bar{x}$, what are its mean and standard deviation?
    [CORRECT] $\mu_{\bar{x}} = \mu$ and $\sigma_{\bar{x}} = \sigma/\sqrt{n}$
    [ ] $\mu_{\bar{x}} = \mu/n$ and $\sigma_{\bar{x}} = \sigma \cdot n$
    [ ] $\mu_{\bar{x}} = 0$ and $\sigma_{\bar{x}} = \sigma$
    [ ] $\mu_{\bar{x}} = p$ and $\sigma_{\bar{x}} = \sqrt{p(1-p)}$
- Q: What is a sampling distribution?
    [ ] The spread of all raw values within one sample
    [CORRECT] The distribution of a statistic across repeated samples
    [ ] The distribution of just the outliers in a dataset
    [ ] The probability attached to one single observation

### MLE and MAP estimation

- Q: In a simple setting, using a flat (uninformative) prior makes the MAP estimate coincide with which estimate?
    [CORRECT] The maximum likelihood estimate (MLE)
    [ ] The median of the observations
    [ ] The sample variance of the data
    [ ] The midpoint of the confidence interval
- Q: In maximum likelihood estimation (MLE), which quantity is chosen to be as large as possible?
    [ ] The width of the resulting confidence interval
    [ ] The variance of the sampling distribution
    [ ] The prior probability of the parameter value
    [CORRECT] The likelihood of the observed data under the model
- Q: Compared with maximum likelihood estimation, what additional ingredient does MAP estimation incorporate?
    [ ] A fixed significance cutoff such as the value 0.05
    [CORRECT] A prior probability distribution over the parameter
    [ ] A chi-square reference table matched to the sample data
    [ ] A preset confidence level chosen before any sampling
- Q: Why is MAP estimation closely connected to regularization in model fitting?
    [ ] MAP estimation can only ever be applied to purely categorical variables
    [ ] Adding any regularization completely removes the need for a prior at all
    [CORRECT] A prior favoring simpler parameters acts as a penalty in the objective
    [ ] MAP estimation manages to work without ever defining a loss function
- Q: Why is it common to maximize the log of the likelihood rather than the likelihood itself in MLE or MAP?
    [ ] Taking logs forces the data to follow a normal distribution
    [ ] Logs make every individual probability equal to one
    [CORRECT] Products of terms turn into sums, simplifying the optimization
    [ ] Logs remove the observed data from the objective entirely

### Confidence intervals and margins of error

- Q: What is the general form of a confidence interval for a parameter?
    [CORRECT] Point estimate $\pm$ margin of error
    [ ] Sample mean $\div$ standard deviation
    [ ] Point estimate $-$ the p-value
    [ ] Point estimate $\times$ margin of error
- Q: Holding the confidence level fixed, what happens to a confidence interval as the sample size increases?
    [ ] It stays exactly the same
    [ ] It becomes statistically invalid
    [CORRECT] It becomes narrower
    [ ] It becomes wider
- Q: Holding the sample size fixed, what is the effect of raising the confidence level (e.g., from 90% to 99%)?
    [ ] The margin of error decreases
    [ ] The interval width is unchanged
    [ ] The sample mean becomes less random
    [CORRECT] The margin of error increases
- Q: What is the correct interpretation of a 95% confidence level?
    [ ] The sample mean equals the true parameter with probability 0.95
    [ ] About 95% of the individual data values lie inside the interval
    [CORRECT] Across repeated samples, about 95% of such intervals contain the true parameter
    [ ] There is a 95% probability the parameter falls inside this one interval

