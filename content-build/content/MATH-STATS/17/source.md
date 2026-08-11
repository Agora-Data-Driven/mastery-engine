# SOURCE PACK — Mathematics / Statistics and Probability / Probability Theory Foundations

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Sample spaces, events, and axioms of probability   (7 questions)
2. Permutations and Combinations   (4 questions)
3. Conditional probability and Independence   (5 questions)
4. Bayes' Theorem and its applications in ML   (6 questions)
5. Law of Large Numbers and Central Limit Theorem   (5 questions)
6. Probability as a measure   (4 questions)
7. Venn diagrams in probability   (4 questions)

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

## Covered by LATER lessons — do not teach these here

- Random Variables and Distributions: Discrete vs. Continuous random variables, PMF, PDF, and CDF, Bernoulli, Binomial, Poisson, Uniform, and Normal, Expected Value and Variance of random variables
- Statistical Inference: Point estimation and sampling distributions, MLE and MAP estimation, Confidence intervals and margins of error
- Hypothesis Testing: Null and Alternative hypotheses, Type I and Type II errors, P-values and Significance levels (α), Z-tests and T-tests (one-sample and two-sample), Chi-squared tests for independence
- Advanced Statistical Applications: Linear Regression from a statistical perspective, Multiple Linear Regression and R-squared, Principal Component Analysis (PCA) math foundations, Introduction to Bayesian Statistics and Inference

## The live quiz bank for these topics — 35 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Sample spaces, events, and axioms of probability

- Q: In probability theory, what is an event?
    [ ] A single probability formula
    [ ] An outcome with probability above 1
    [ ] The entire sample space itself
    [CORRECT] A subset of the sample space
- Q: When adding probabilities, why must overlapping events not be treated as disjoint?
    [ ] Because only independent events are allowed to overlap
    [ ] Because any overlap makes the probability undefined
    [CORRECT] Because the shared overlap would be counted twice
    [ ] Because two disjoint events can never exist
- Q: Let $S = \{a, b, c, d\}$ be a sample space. A proposed probability assignment is $P(\{a\}) = 0.4$, $P(\{b\}) = 0.3$, $P(\{c\}) = 0.2$, $P(\{d\}) = 0.2$, and $P$ is defined for all other events by the finite additivity rule $P(E) = \sum_{x \in E} P(\{x\})$. Does this assignment satisfy the three axioms of probability? If not, which axiom is violated?
    [ ] It satisfies all three axioms.
    [ ] It violates Axiom 1: $P(A) \ge 0$ for any event $A$.
    [CORRECT] It violates Axiom 2: $P(S) = 1$.
    [ ] It violates Axiom 3: additivity for disjoint events.
- Q: Let the sample space be $S = \{1, 2, 3, 4, 5, 6\}$. Consider two proposed probability functions, $P_1$ and $P_2$, defined on events in $S$. $P_1$: For any event $A \subseteq S$, let $P_1(A) = \frac{|A| - 1}{6}$ if $A$ is non‑empty, and $P_1(\emptyset) = 0$. $P_2$: For the elementary events, suppose $P_2(\{i\}) = 0.15$ for $i = 1, 2, 3, 4, 5, 6$, and for any event $A$, $P_2(A) = \sum_{i \in A} P_2(\{i\})$. Which statement is true?
    [CORRECT] $P_1$ violates Axiom 2 only; $P_2$ violates no axioms.
    [ ] $P_1$ violates Axiom 1 only; $P_2$ violates Axiom 2.
    [ ] $P_1$ violates Axiom 3 only; $P_2$ violates Axiom 3.
    [ ] $P_1$ violates Axiom 1; $P_2$ violates Axiom 3.
- Q: In probability theory, what is a sample space?
    [ ] The set of favorable outcomes only
    [ ] The set of outcomes that cannot occur
    [ ] The single most likely outcome
    [CORRECT] The set of all possible outcomes
- Q: If an event A has probability 0.3, what is the probability of its complement?
    [CORRECT] 0.7
    [ ] 0.3
    [ ] 1.3
    [ ] 0.5
- Q: A sample space $S$ contains two events $A$ and $B$ with the following given probabilities: $P(A) = 0.5$, $P(B) = 0.4$, and $P(A \cap B) = 0.1$. A student claims that by the third axiom of probability, $P(A \cup B) = P(A) + P(B) = 0.9$. Is this application valid?
    [CORRECT] No, because $A$ and $B$ are not mutually exclusive, so the axiom does not apply directly
    [ ] Yes, because the axiom holds for any two events in the same sample space
    [ ] Yes, because $P(A)$ and $P(B)$ are both between 0 and 1, satisfying the other axioms
    [ ] No, because the sum exceeds 1, which violates the first axiom of probability

### Permutations and Combinations

- Q: Which expression gives the number of permutations of r items chosen from a set of n distinct items?
    [ ] $\frac{r!}{(n - r)!}$
    [CORRECT] $\frac{n!}{(n - r)!}$
    [ ] $n^r$
    [ ] $\frac{n!}{r! (n - r)!}$
- Q: Which expression gives the number of combinations of $r$ items chosen from a set of $n$ distinct items?
    [ ] $\frac{r!}{n!}$
    [ ] $\frac{n!}{(n - r)!}$
    [CORRECT] $\frac{n!}{r!(n - r)!}$
    [ ] $n^r$
- Q: When counting selections from a set of objects, combinations (rather than permutations) are the right tool in which situation?
    [ ] When the arrangement order of the chosen items matters
    [ ] Only when the variable involved is continuous
    [ ] Only when no object in the set is repeated
    [CORRECT] When only the chosen group matters, not its order
- Q: When counting the number of ways to arrange a selection of objects, you should use permutations rather than combinations in which situation?
    [ ] Only when computing a probability value
    [ ] When the order of the items is irrelevant
    [CORRECT] When the order of the selected items matters
    [ ] Only when sampling is done with replacement

### Conditional probability and Independence

- Q: You roll two fair dice and want the probability that their sum is 10. Why does this probability change once you learn the first die shows a 6?
    [ ] Because conditioning makes the individual dice rolls nonrandom
    [ ] Because the denominator is required to stay fixed at 36 outcomes
    [ ] Because the two events of interest are now considered completely disjoint
    [CORRECT] Because the sample space shrinks to outcomes meeting the condition
- Q: A spam filter examines an email. Let $B$ be the event that the email contains the word "prize", and let $A$ be the event that the email is spam. Suppose $P(B) = 0.6$, and the probability that an email is spam given that it contains "prize" is $P(A \mid B) = 0.4$. What is the probability that an email both contains "prize" and is spam, $P(A \cap B)$?
    [CORRECT] $0.24$
    [ ] $0.40$
    [ ] $0.60$
    [ ] $1.00$
- Q: What does the conditional probability P(A | B) represent?
    [ ] The probability that A and B are independent
    [ ] The probability that A or B occurs
    [ ] The probability that B was caused by A
    [CORRECT] The probability of A given that B has occurred
- Q: For events $A$ and $B$, you are given $P(A) = 0.3$, $P(B) = 0.5$, and $P(A \cap B) = 0.15$. Which conclusion is correct?
    [CORRECT] $A$ and $B$ are independent because $P(A \cap B) = P(A)P(B)$ and $P(A \mid B) = P(A)$
    [ ] $A$ and $B$ are dependent because $P(A \cap B) = 0.15$ is less than both $P(A)$ and $P(B)$
    [ ] $A$ and $B$ are independent because $P(A \mid B) = 0.30$ while $P(B \mid A) = 0.50$
    [ ] $A$ and $B$ are dependent because $P(A \mid B) = 0.30 \neq P(B) = 0.50$, so the events cannot be independent
- Q: Let $A$ and $B$ be two events with $P(A) > 0$ and $P(B) > 0$. If $A$ and $B$ are independent, which of the following must be true?
    [CORRECT] $P(A \cap B) = P(A) P(B)$ holds, and the occurrence of $B$ does not change the probability of $A$.
    [ ] $A$ and $B$ cannot occur together, which means $P(A \cap B) = 0$ is always satisfied.
    [ ] $P(A \cup B) = P(A) + P(B)$ because the events are unrelated and their probabilities simply add.
    [ ] $P(A \mid B) = 0$ since independence means one event has no effect on the other.

### Bayes' Theorem and its applications in ML

- Q: What is the key simplifying assumption that the naive Bayes classifier makes?
    [ ] The model uses no probabilities at all
    [ ] Every feature is equally likely to occur
    [CORRECT] The features are independent given the class
    [ ] The posterior is always equal to the prior
- Q: In Bayesian reasoning, what does the term 'prior' refer to?
    [ ] The denominator of every probability formula
    [ ] The updated belief after seeing evidence
    [ ] The observed evidence itself
    [CORRECT] The belief held before seeing new evidence
- Q: In Bayesian reasoning, what does the term 'posterior' refer to?
    [ ] The probability of the complement of an event
    [ ] The probability of the evidence on its own
    [CORRECT] The updated belief after incorporating the evidence
    [ ] The belief held before any data is seen
- Q: Bayes' theorem is used to compute which kind of quantity?
    [ ] A prior derived from a known posterior
    [ ] A variance measured from a mean
    [CORRECT] A posterior from a prior and a likelihood
    [ ] A covariance from conditional independence
- Q: A screening test for a rare condition has a true positive rate of 95% and a false positive rate of 8%. The condition affects 1 in 200 people in the population. If a randomly selected person tests positive, what is the probability they actually have the condition?
    [CORRECT] $\frac{0.95 \times 0.005}{0.95 \times 0.005 + 0.08 \times 0.995}$
    [ ] $\frac{0.95 \times 0.005}{0.95 \times 0.005 + 0.08 \times 0.005}$
    [ ] $\frac{0.95 \times 0.005}{0.95 \times 0.995 + 0.08 \times 0.005}$
    [ ] $\frac{0.08 \times 0.995}{0.95 \times 0.005 + 0.08 \times 0.995}$
- Q: Spam detection is a classic application of Bayes' theorem. What makes it a good fit?
    [ ] The spam-versus-not-spam label is treated as being fully deterministic
    [CORRECT] It updates the probability an email is spam as word features appear
    [ ] Bayes' theorem is able to work only on completely raw text data
    [ ] Spam detection depends entirely on counting word permutations

### Law of Large Numbers and Central Limit Theorem

- Q: In simple terms, what does the law of large numbers describe?
    [ ] Every empirical distribution eventually becomes perfectly uniform
    [ ] The sample variance always shrinks down to become exactly 0
    [ ] Extreme outliers are gradually removed from the underlying data
    [CORRECT] The sample mean approaches the true mean as the sample grows
- Q: Why is the central limit theorem regarded as one of the pinnacles of statistics?
    [ ] It removes the need to ever collect or take any data samples at all
    [ ] It applies only to the narrow special case of repeated fair coin flips
    [CORRECT] It explains why normal approximations arise even from non-normal data
    [ ] It proves that essentially all real-world data sets are truly Gaussian
- Q: Repeated sample averages of a quantity become less erratic as the sample size increases. Which result best matches this behavior?
    [ ] The box-plot rule
    [CORRECT] The law of large numbers
    [ ] The addition rule
    [ ] Bayes' theorem
- Q: When you flip a fair coin many times, the distribution of the total number of heads comes to resemble which shape?
    [ ] Exponential
    [ ] Uniform
    [ ] Poisson with mean 1
    [CORRECT] Normal
- Q: A population of household incomes is heavily right‑skewed. An analyst draws repeated random samples of size $n$ from this population and computes each sample mean. As $n$ grows from 10 to 1,000, which statement correctly contrasts the Law of Large Numbers (LLN) and the Central Limit Theorem (CLT)?
    [ ] LLN says each individual sample mean gets closer to $\mu$; CLT guarantees the collection of sample means becomes more Normal in shape.
    [ ] LLN says the sample mean $\bar{X}_n$ converges to $\mu$; CLT guarantees the population itself becomes approximately Normal as $n$ grows.
    [CORRECT] LLN says the sample mean $\bar{X}_n$ converges to $\mu$; CLT guarantees the distribution of $\bar{X}_n$ approaches a Normal curve centered at $\mu$ with shrinking spread.
    [ ] LLN guarantees the sampling distribution becomes Normal; CLT guarantees the sample mean equals $\mu$ when $n$ is large enough.

### Probability as a measure

- Q: A spam detection algorithm outputs a probability of 0.9 that an email is spam. Which interpretation aligns with the definition of probability as a measure?
    [ ] The algorithm is 90% certain the email is spam.
    [ ] 90% of emails with similar content are spam.
    [CORRECT] There is a 90% chance the email is spam.
    [ ] The algorithm's precision rate is 90%.
- Q: When flipping two fair coins, what is the probability of getting exactly one head?
    [ ] 1/4
    [CORRECT] 1/2
    [ ] 3/4
    [ ] 1
- Q: A marketing team has 2000 customers in a database. 350 of them purchased a product in the last month. If one customer is selected at random, what is the probability that they made a purchase?
    [CORRECT] 350 divided by 2000
    [ ] 2000 divided by 350
    [ ] 350 divided by 1650
    [ ] 1650 divided by 2000
- Q: Which statement best describes the concept of probability as presented in the foundational material?
    [ ] Probability is the number of favorable outcomes divided by total possible outcomes.
    [CORRECT] Probability is a measure of how likely an event is to occur.
    [ ] Probability is the percentage of times an event occurs in repeated trials.
    [ ] Probability is the ratio of the event's size to the sample space's size.

### Venn diagrams in probability

- Q: In a probability Venn diagram, the entire rectangle represents the sample space. If a circle inside the rectangle represents an event, what does the area of the rectangle that lies outside the circle represent?
    [CORRECT] The complement of the event
    [ ] The empty set of outcomes
    [ ] The intersection of two events
    [ ] The sample space for another event
- Q: You flip three fair coins. Based on the list of all possible outcomes, what is the probability that exactly two of the coins land heads?
    [ ] 1/8
    [CORRECT] 3/8
    [ ] 1/4
    [ ] 1/2
- Q: You roll two fair six-sided dice. What is the probability that the sum of the two numbers is 2?
    [ ] 1/6
    [ ] 1/12
    [CORRECT] 1/36
    [ ] 1/18
- Q: In a school of 10 children, 3 play soccer and 7 do not. What is the probability that a randomly chosen child does not play soccer?
    [ ] 3/10
    [CORRECT] 7/10
    [ ] 1/10
    [ ] 5/10

