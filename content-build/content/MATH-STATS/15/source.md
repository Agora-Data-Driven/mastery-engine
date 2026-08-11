# SOURCE PACK — Mathematics / Statistics and Probability / 15 Advanced regression (inference and transforming) (khanacademy.org)

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Inference about slope (khanacademy.org)   (5 questions)
2. Nonlinear regression (khanacademy.org)   (5 questions)

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

## Covered by LATER lessons — do not teach these here

- 16 Analysis of variance (ANOVA) (khanacademy.org): Analysis of variance (ANOVA) (khanacademy.org)
- Probability Theory Foundations: Sample spaces, events, and axioms of probability, Permutations and Combinations, Conditional probability and Independence, Bayes' Theorem and its applications in ML, Law of Large Numbers and Central Limit Theorem, Probability as a measure, Venn diagrams in probability
- Random Variables and Distributions: Discrete vs. Continuous random variables, PMF, PDF, and CDF, Bernoulli, Binomial, Poisson, Uniform, and Normal, Expected Value and Variance of random variables
- Statistical Inference: Point estimation and sampling distributions, MLE and MAP estimation, Confidence intervals and margins of error
- Hypothesis Testing: Null and Alternative hypotheses, Type I and Type II errors, P-values and Significance levels (α), Z-tests and T-tests (one-sample and two-sample), Chi-squared tests for independence
- Advanced Statistical Applications: Linear Regression from a statistical perspective, Multiple Linear Regression and R-squared, Principal Component Analysis (PCA) math foundations, Introduction to Bayesian Statistics and Inference

## The live quiz bank for these topics — 10 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Inference about slope (khanacademy.org)

- Q: In a linear regression model, the slope represents
    [CORRECT] the predicted change in y per 1-unit rise in x
    [ ] the strength of the correlation only
    [ ] the average value of the predictor x
    [ ] the spread of the residuals about the line
- Q: A regression slope estimate is positive and statistically significant. What does this provide evidence of?
    [ ] No relationship between x and y
    [CORRECT] A positive linear association
    [ ] A proven cause-and-effect link
    [ ] A negative linear association
- Q: When performing inference about the slope of a population regression line, which parameter is being tested?
    [ ] The standard deviation sigma
    [ ] The mean mu
    [ ] The proportion p
    [CORRECT] The slope beta
- Q: A confidence interval for the slope of a regression line does not contain 0. What does this suggest?
    [ ] The intercept of the line equals 0
    [ ] The residuals are normally distributed
    [ ] There is no evidence of a linear relationship
    [CORRECT] There is evidence the true slope is not 0
- Q: Inference about the slope of a regression line is used to assess whether
    [ ] the intercept of the fitted line is equal to 0
    [ ] the value of r-squared is exactly equal to 1
    [ ] all of the residuals turn out to be positive
    [CORRECT] the population slope differs from a value such as 0

### Nonlinear regression (khanacademy.org)

- Q: Which of the following equations describes a nonlinear relationship between x and y?
    [ ] $y = 2x + 1$
    [ ] y goes up by 3 for each unit of x
    [CORRECT] $y = x^2$
    [ ] $y = -x + 4$
- Q: Nonlinear regression is the appropriate modeling choice when:
    [CORRECT] a curved trend fits the data better than a line
    [ ] the explanatory variables are all categorical labels
    [ ] a straight line already fits the points closely
    [ ] the data set happens to contain only two points
- Q: After fitting a straight line, a residual plot that shows a clear curved pattern is evidence that:
    [ ] the linear fit is essentially perfect
    [ ] there is no association at all
    [CORRECT] a nonlinear model may fit better
    [ ] the mean of the data was computed wrong
- Q: Which model form is best suited to capture exponential growth in the response y?
    [ ] $y = \frac{x}{b}$
    [ ] $y = b$ for all $x$
    [CORRECT] $y = ab^x$
    [ ] $y = a + bx$
- Q: When deciding between a linear and a nonlinear model for a data set, the key consideration is:
    [CORRECT] which model best fits the trend and residuals
    [ ] which equation contains the most math symbols
    [ ] which equation has the larger coefficient values
    [ ] which equation is the shortest to write down

