# SOURCE PACK — Machine Learning / Ensemble Methods / Ensemble Foundations

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Why Ensembles Work: Diversity and Error Reduction   (13 questions)
2. Bootstrap Aggregating (Bagging)   (18 questions)
3. Boosting vs. Bagging: Sequential vs. Parallel Ensembles   (23 questions)
4. Hard and Soft Voting Classifiers   (18 questions)

## Covered by LATER lessons — do not teach these here

- Stacking & Blending: Stacking: Combining Models with a Meta-Learner, Blending with a Holdout Set, Combining Neural Networks with Gradient-Boosted Trees

## The live quiz bank for these topics — 72 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Why Ensembles Work: Diversity and Error Reduction

- Q: You average the predictions of two regression models, A and B, that were trained on different bootstrap samples. Model A has error variance $\sigma^2_A = 4.0$ and Model B has error variance $\sigma^2_B = 9.0$, and their errors have correlation $\rho = 0.6$. What is the error variance of the equally weighted ensemble $\frac{A+B}{2}$?
    [CORRECT] It is exactly $3.25$, which is less than the average of the individual variances
    [ ] It is exactly $6.5$, the arithmetic mean of the two individual variances
    [ ] It is exactly $1.0$, the variance of the difference divided by two
    [ ] It is exactly $2.5$, the geometric mean of the two individual variances
- Q: An ensemble of five classifiers uses majority voting. Each classifier misclassifies a given example with probability $0.30$, and their errors are perfectly correlated on that example. What is the probability that the majority vote is wrong?
    [CORRECT] It stays at $0.30$, the same as any single classifier
    [ ] It drops to roughly $0.16$, because three must agree to be wrong
    [ ] It drops to roughly $0.03$, since errors must coincide five ways
    [ ] It rises to roughly $0.50$, because the classifiers are tied
- Q: Every model in an ensemble was trained on a dataset where the labels were systematically shifted by the same constant. All models learned the same biased pattern. What will averaging their predictions accomplish?
    [ ] It will cancel the bias because the average spreads across many models
    [CORRECT] It will keep roughly the same bias while still reducing random variance
    [ ] It will double the bias because correlated biases add together linearly
    [ ] It will remove the bias only if the ensemble size is increased further
- Q: For $n$ equally correlated regression models with error variance $\sigma^2$ and pairwise error correlation $\rho$, the averaged error variance is $$\operatorname{Var}(\bar{e})=\frac{\sigma^2}{n}+\frac{n-1}{n}\rho\sigma^2.$$ As $n$ grows with $\rho=0.25$, what does this show?
    [ ] The variance approaches $0$, so enough models remove all error variance.
    [CORRECT] The variance approaches $0.25\sigma^2$, leaving a shared-error floor.
    [ ] The variance approaches $\sigma^2$, matching a single model's variance.
    [ ] The variance approaches $0.75\sigma^2$, removing one quarter of it.
- Q: Why do bagged tree ensembles often use deep, low-bias trees rather than heavily pruned, high-bias trees?
    [CORRECT] Averaging deep trees lowers variance while preserving most of their low bias.
    [ ] Averaging deep trees lowers bias while preserving most of their high variance.
    [ ] Averaging deep trees removes shared bias without changing their high variance.
    [ ] Averaging deep trees raises variance because each tree sees different data.
- Q: You train an ensemble by taking one base model and creating copies that each receive a different random subset of the training features. The models are then combined by averaging their predictions. Which source of error is most directly reduced by this procedure, assuming the base model has high variance and the resampled feature subsets are small?
    [CORRECT] It reduces variance while largely preserving the bias of the base model
    [ ] It reduces bias by exposing each model to a richer variety of training signals
    [ ] It reduces irreducible error by cleaning the feature space of noise
    [ ] It reduces bias variance and irreducible error equally through randomization
- Q: A team trains five copies of the same neural network on the same data with identical settings, then averages their outputs. The ensemble barely improves over one model. What is the most likely reason?
    [CORRECT] The five models make highly correlated errors, leaving little to cancel
    [ ] Averaging requires at least ten models before it can reduce any error
    [ ] The averaging step amplifies each model's bias by a factor of five
    [ ] Identical models produce overflow errors when their outputs are summed
- Q: At each split, a random forest considers only a random subset of features, even when one feature is usually strongest. How does this mainly help the ensemble?
    [ ] It forces every tree to use different labels, raising each tree's accuracy.
    [ ] It gives every tree lower variance, making averaging across trees unnecessary.
    [ ] It assigns equal feature counts to trees, guaranteeing balanced training times.
    [CORRECT] It keeps one strong feature from dominating, decorrelating the trees' errors.
- Q: A data scientist wants an ensemble whose members make errors on different examples so that combining them reduces error. Which strategy most directly creates that kind of diversity?
    [CORRECT] Training each model on a different bootstrap sample of the training data
    [ ] Training several copies of one model with the exact same training data
    [ ] Training one very large model and splitting its output into averages
    [ ] Training a single model for more epochs until its training error is zero
- Q: Three classifiers each make errors independently with error rate $0.20$. A majority-vote ensemble of the three is wrong only when at least two of them err on the same example. What is the ensemble's approximate error rate?
    [ ] About $0.20$, since the majority vote inherits the average error rate
    [CORRECT] About $0.10$, since errors must coincide on the same input example
    [ ] About $0.07$, since the error rate gets divided by the model count
    [ ] About $0.01$, since three independent models almost never all agree
- Q: You average the predictions of $n$ regression models whose errors are independent, each with variance $\sigma^2$. Why does the averaged prediction have lower error variance than any single model?
    [ ] Averaging forces each model's individual bias term to equal exactly zero
    [ ] Averaging expands the feature set available to every individual model
    [CORRECT] Averaging cancels independent fluctuations, shrinking variance to $\frac{\sigma^2}{n}$
    [ ] Averaging reweights the training data toward points each model fits best
- Q: Three classifiers are combined by majority vote. Under which error pattern can the ensemble have lower error than its best individual member?
    [ ] The members err on the same examples, so their mistakes reinforce one another.
    [ ] The members copy the strongest model, so its mistakes receive extra votes.
    [CORRECT] The members err on different examples, so two are often right together.
    [ ] The members raise their error rates, so disagreement provides more signal.
- Q: Each of $16$ regression models has squared bias $9$ and random-error variance $36$. The models share the same bias, but their random errors are independent. What is the mean squared error of their averaged prediction?
    [ ] $2.25$
    [CORRECT] $11.25$
    [ ] $2.81$
    [ ] $45.00$

### Bootstrap Aggregating (Bagging)

- Q: You train a bagging ensemble of 100 decision trees, each on a bootstrap sample of size $n$ drawn with replacement from a training set of $n = 1000$ examples. Approximately what fraction of the original training examples do you expect a given tree to see at least once in its bootstrap sample?
    [CORRECT] About 63.2% of the examples
    [ ] About 50% of the examples
    [ ] About 86.5% of the examples
    [ ] About 100% of the examples
- Q: Suppose you apply bagging with 50 decision trees to a classification problem and observe that the ensemble's test error is significantly lower than the average test error of the individual trees. Which phenomenon best explains this improvement?
    [CORRECT] The ensemble reduces variance while bias stays approximately the same
    [ ] The ensemble reduces bias while variance stays approximately the same
    [ ] The ensemble simultaneously reduces both bias and variance
    [ ] The ensemble has a lower capacity than any single tree in the set
- Q: You increase the number of trees $B$ in a bagging ensemble from 50 to 500. Assuming the base model is a decision tree with high variance, what is the most likely effect on the ensemble's performance, and why?
    [CORRECT] Test error continues to decrease because averaging over more trees further reduces variance without increasing bias
    [ ] Test error begins to increase because the ensemble starts to overfit the training data
    [ ] Test error remains unchanged because bagging performance is insensitive to $B$ once $B > 10$
    [ ] Test error decreases initially but then increases because the trees become too correlated
- Q: In bagging, why do we sample with replacement rather than without replacement when creating each bootstrap training set?
    [CORRECT] To ensure the bootstrap samples are independent draws from the empirical distribution
    [ ] To guarantee that no example appears in more than one bootstrap sample
    [ ] To prevent any original example from being omitted from a given sample
    [ ] To maximize the correlation between the trained base models
- Q: In bagging, you start with a training set of $n$ examples and need to create one bootstrap sample to train a single decision tree. Which procedure correctly describes how that bootstrap sample is created?
    [CORRECT] Sample $n$ examples from the training set with replacement
    [ ] Sample $n$ examples from the training set without replacement
    [ ] Sample $n/2$ examples from the training set with replacement
    [ ] Sample $n$ new examples drawn from the feature distribution
- Q: You have a labeled dataset of 5000 examples. You produce 200 bootstrap samples, each of size 2000 drawn with replacement. For a particular example $(x_i, y_i)$, the probability that it appears exactly zero times in a given bootstrap sample is approximately $e^{-0.4}$. Approximately what is the probability that this example appears in at least one of the 200 bootstrap samples?
    [ ] Approximately $1 - e^{-80}$
    [ ] Approximately $(1 - e^{-0.4})^{200}$
    [CORRECT] Approximately $1 - (e^{-0.4})^{200}$
    [ ] Approximately $e^{-0.4} \times 200$
- Q: The main statistical reason bagging improves over a single decision tree is best described by which statement?
    [CORRECT] Averaging many trees reduces the variance of the prediction
    [ ] Averaging many trees reduces the bias of each single tree
    [ ] Sampling with replacement increases the size of the dataset
    [ ] Training many trees guarantees each tree is fully decorrelated
- Q: In bagging, which procedure gives a proper out-of-bag estimate for a training example $(x_i, y_i)$?
    [ ] Average all trees in the ensemble, then score $(x_i, y_i)$
    [ ] Average only trees that saw $(x_i, y_i)$, then score it
    [CORRECT] Average only trees that skipped $(x_i, y_i)$, then score it
    [ ] Average the trees with the lowest loss, then score it
- Q: Bagging tends to give the largest improvement when the base learner has certain properties. Which base learner is the best candidate to benefit from bagging?
    [CORRECT] A deep decision tree with low bias but high variance
    [ ] A shallow decision stump with high bias but low variance
    [ ] A linear regression model with high bias but low variance
    [ ] A constant model that predicts the mean target for all inputs
- Q: A learner says: "Since each tree in a bagged ensemble is trained on a different bootstrap sample, the trees are fully independent of one another." What is the most accurate response?
    [CORRECT] The trees are correlated because all bootstrap samples are drawn from the same original dataset
    [ ] The statement is correct because each bootstrap sample is drawn independently with replacement
    [ ] The trees are independent only if the original dataset has fewer than 100 examples
    [ ] The trees become independent once the number of trees exceeds the size of the original dataset
- Q: You train a bagged ensemble of $B$ decision trees for a regression task, and each tree outputs a numeric prediction $\hat{y}_1, \hat{y}_2, \dots, \hat{y}_B$ for a new input. How does the ensemble produce its final prediction?
    [ ] It returns the prediction of the single most accurate tree
    [CORRECT] It returns the arithmetic mean of all $B$ tree predictions
    [ ] It returns the majority class among all $B$ tree predictions
    [ ] It returns the median feature value across all $B$ trained trees
- Q: A bagged classifier has 5 trees with positive-class probabilities $0.20$, $0.40$, $0.60$, $0.70$, and $0.90$. What is the bagged positive-class probability?
    [ ] $0.46$
    [CORRECT] $0.56$
    [ ] $0.60$
    [ ] $0.90$
- Q: If bagged trees stay positively correlated because they share one dataset, what happens as $B$ grows?
    [ ] The variance goes to zero once $B$ is large
    [CORRECT] The variance nears a floor, so gains taper off
    [ ] The bias climbs steadily with each added tree
    [ ] The trees turn independent after enough averaging
- Q: You train 50 deterministic trees on the identical full training set, with no bootstrapping or randomness. What should the ensemble look like?
    [ ] It keeps improving, since more trees always lower error
    [ ] It acts like bagging, since averaging still removes bias
    [ ] It becomes unbiased, since fifty votes cancel noise
    [CORRECT] It acts like one tree, since every member is identical
- Q: Bagging is most likely to give a large gain for which base learner?
    [ ] A linear model whose main problem is systematic bias
    [ ] A stable rule that gives the same output every run
    [CORRECT] A deep tree whose splits change after tiny data changes
    [ ] A model already tuned to near zero training error
- Q: A data scientist runs bagging on a training set of size $n = 800$ and creates $B = 30$ bootstrap samples, each also of size 800. They notice that roughly 37% of the original examples never appear in a given tree’s training set. They then double the bootstrap sample size to 1600 (still drawing with replacement from the same 800 examples). What is the most immediate effect on each tree’s training set?
    [CORRECT] Each tree now sees a larger absolute number of distinct original examples, and the fraction of unseen examples drops to roughly 13.5%.
    [ ] The fraction of unseen examples stays near 37% because it depends only on the original dataset size, not the bootstrap sample size.
    [ ] Doubling the bootstrap sample size forces each tree to see every example multiple times, reducing the unseen fraction to 0%.
    [ ] Each tree now sees fewer distinct examples because overfitting is amplified at larger sample sizes.
- Q: You train a bagging ensemble of 50 decision trees for a binary classification task and evaluate it on a held-out test set. The first tree in the ensemble achieves 75% test accuracy, and the full ensemble achieves 82% test accuracy. If you remove the first tree and re-evaluate, the remaining 49-tree ensemble scores 81.8% accuracy. Which statement best explains why the drop is so small?
    [ ] The first tree was redundant because bagging decorrelates trees completely, making each one individually dispensable.
    [CORRECT] Bagging averages predictions, so removing one tree leaves 49 correlated voters whose joint decision barely shifts.
    [ ] The first tree overfit its bootstrap sample and therefore contributed negligible signal to the ensemble’s aggregated output.
    [ ] Test accuracy is an unstable metric for bagging; the 0.2% drop is within random sampling noise and carries no structural meaning.
- Q: A colleague says: "Once I have a bagged ensemble, doubling the number of trees from 100 to 200 will keep reducing the training bias of the ensemble, so more trees will eventually make training error reach zero through bias reduction." Which statement best corrects this reasoning?
    [CORRECT] More trees mainly reduce variance, and this benefit levels off as $B$ grows
    [ ] More trees mainly reduce bias, and this benefit levels off as $B$ grows
    [ ] More trees mainly cause overfitting, so $B$ must stay below one hundred
    [ ] More trees mainly add correlation, so error grows without bound as $B$ grows

### Boosting vs. Bagging: Sequential vs. Parallel Ensembles

- Q: A 500-stump AdaBoost run crashes after round 250. A colleague notes that when their bagged forest crashed, they resumed by only retraining the missing trees. Why does that shortcut not fully work for the AdaBoost run?
    [CORRECT] AdaBoost stumps rely on the sample weights left by earlier rounds
    [ ] AdaBoost stumps are fit on independent bootstrap data samples
    [ ] AdaBoost rounds can be reordered safely without changing output
    [ ] AdaBoost saves each stump without its round's training weights
- Q: An engineer implements bagging but samples without replacement, drawing $n$ rows from the $n$-row training set for every tree. The tree learner is deterministic, meaning the same training data always yields the same tree. What is the result?
    [ ] Every tree sees a different subset, so tree variance still averages out
    [CORRECT] Every tree trains on the full dataset, so all trees come out identical
    [ ] Each tree sees about 63% of rows, matching the usual bagging behavior
    [ ] Trees differ only at their root split, so averaging still helps slightly
- Q: A team bags 200 trees using bootstrap samples of size $n$ from an $n$-row dataset. A colleague argues that replacing bootstrap sampling with $k$-fold cross-validation subsamples (training each tree on $k-1$ folds) would improve the ensemble because every row is guaranteed to appear in more training sets. What is the most direct consequence of this substitution?
    [CORRECT] Trees become more correlated, reducing the variance reduction that bagging provides.
    [ ] Trees become less correlated, amplifying the variance reduction that bagging provides.
    [ ] The ensemble bias increases sharply because each tree trains on fewer total rows.
    [ ] The ensemble bias decreases because the overlapping folds act as a regularizer.
- Q: A bagged forest's test accuracy keeps improving slightly as more trees are added, but an AdaBoost model's test accuracy gets worse after many rounds on noisy click data. What best explains this difference?
    [CORRECT] Later boosting rounds concentrate weight on noisy, mislabeled cases
    [ ] Later boosting rounds train every stump on identical data samples
    [ ] Extra bagging trees amplify the mistakes of all earlier trees
    [ ] Extra bagging trees focus on the hardest remaining training cases
- Q: In an AdaBoost run, one stump lands at weighted error $\epsilon_t = 0.62$, worse than random guessing. What does the standard update rule $\alpha_t = \frac{1}{2}\ln\frac{1-\epsilon_t}{\epsilon_t}$ do with this stump?
    [CORRECT] It assigns a negative $\alpha_t$, so the stump's vote is effectively flipped.
    [ ] It assigns a zero $\alpha_t$, so the stump is ignored in the final vote.
    [ ] It restarts the round with uniform weights and a fresh stump.
    [ ] It clips $\alpha_t$ to a small positive floor and keeps the vote.
- Q: A team runs AdaBoost with stumps on a clean, separable dataset. The ensemble's training error reaches zero at round 20, yet test error keeps falling as they continue training to round 200. What best explains the continued improvement?
    [CORRECT] Later rounds keep enlarging the margins of already correct training points.
    [ ] Later rounds cut variance by averaging many independent stump fits.
    [ ] Later rounds freeze example weights once training error hits zero.
    [ ] Later rounds hold out stumps that act as a validation signal.
- Q: A team's base learner is a rigid linear model that underfits: training error is 25% and test error is 27%. They bag 500 copies of it on bootstrap samples. What is the most likely outcome?
    [CORRECT] Test error stays near 27%, because averaging preserves the shared bias.
    [ ] Test error falls toward 2%, because averaging cancels the shared bias.
    [ ] Test error falls sharply, because each copy sees a different sample.
    [ ] Test error rises sharply, because bootstrap sampling injects label noise.
- Q: An AdaBoost ensemble with 100 stumps achieves a final weighted training error of 0.02. A teammate suggests freezing the sample-weight vector at round 50 and using it to train the remaining 50 stumps, then combining all 100 stumps with their original $\alpha_t$ votes. What property of the sequential ensemble is lost?
    [CORRECT] Later stumps no longer focus on examples that earlier stumps misclassified
    [ ] The ensemble loses the ability to average uncorrelated predictions
    [ ] The frozen weight vector doubles the variance of the final ensemble
    [ ] The vote weights $\alpha_t$ become undefined for all stumps after round 50
- Q: AdaBoost theory guarantees that if every stump achieves weighted error $\epsilon_t \le \frac{1}{2} - \gamma$ for some fixed $\gamma > 0$, the ensemble's training error falls at least as fast as $e^{-2\gamma^2 T}$. A team's stumps reach only $\epsilon_t \approx 0.48$ each round. What does the guarantee say about this run?
    [CORRECT] Training error still decays exponentially, though slowly given the small $\gamma$.
    [ ] Training error stalls, since stumps must beat chance by a wide margin.
    [ ] Training error decays only linearly, since the bound needs large $\gamma$.
    [ ] The guarantee is void, since the bound applies only when $\gamma \ge 0.1$.
- Q: A team trains a bagged ensemble of 500 trees on bootstrap samples of size $n$ drawn with replacement. They then compute the out-of-bag error estimate. If they had instead drawn bootstrap samples of size $n/2$ with replacement, how would the out-of-bag estimate's properties most directly change?
    [ ] Each tree would leave more rows unused, reducing the variance of the OOB estimate per row
    [CORRECT] Each tree would see fewer distinct rows, making the OOB estimate biased high
    [ ] The smaller samples would force all rows into every training set, making OOB impossible
    [ ] The OOB estimate would become identical to the training error because no row stays unseen
- Q: In bagging, each bootstrap sample leaves some rows unused, so a team scores each row only on trees that never trained on it, getting a validation estimate with no held-out set. Why does the analogous trick fail for a standard AdaBoost run?
    [ ] Boosting weights votes by accuracy, which blocks any per-row scoring
    [ ] Boosting uses stumps, and stumps cannot score single rows reliably
    [ ] Boosting samples with replacement, which hides which rows were used
    [CORRECT] Boosting trains every round on all rows, so no row stays unseen
- Q: Consider the AdaBoost weight update: for a training example $i$, $w_{i}^{(t+1)} = w_{i}^{(t)} \cdot e^{-\alpha_t y_i h_t(x_i)}$, followed by normalization so $\sum_i w_i^{(t+1)} = 1$. A stump has weighted error $\epsilon_t = 0.3$, giving $\alpha_t = \frac{1}{2}\ln\frac{0.7}{0.3} \approx 0.424$. By what factor is the weight of a correctly classified example multiplied before normalization?
    [CORRECT] $e^{-0.424} \approx 0.654$
    [ ] $e^{0.424} \approx 1.528$
    [ ] $e^{-0.3} \approx 0.741$
    [ ] $e^{0.3} \approx 1.350$
- Q: A team bags trees on bootstrap samples of size $n$ drawn with replacement from an $n$-row training set. For a particular row, what is the approximate probability that it never appears in one tree's sample when $n$ is large?
    [CORRECT] About $e^{-1} \approx 0.37$, since each draw skips it with probability $1 - \frac{1}{n}$.
    [ ] About $1 - e^{-1} \approx 0.63$, since each draw hits it with probability $\frac{1}{n}$.
    [ ] About $0.50$, since sampling with replacement balances inclusion and exclusion.
    [ ] About $\frac{1}{n}$, since it is skipped only when the draw order repeats.
- Q: A colleague claims base learners are interchangeable between ensembles, so they bag 300 decision stumps and, separately, boost 300 deep unpruned trees. Which outcome best matches the standard account of how these ensembles reduce error?
    [CORRECT] Bagged stumps stay underfit, since averaging cannot erase shared bias
    [ ] Bagged stumps fix their bias, since averaging diverse fits removes bias
    [ ] Boosted deep trees train fastest, since deep trees are cheapest to fit
    [ ] Boosted deep trees resist overfit, since depth limits model capacity
- Q: A bagged ensemble averages $B$ trees, each with variance $\sigma^2$ and pairwise prediction correlation $\rho$, giving ensemble variance $\rho\sigma^2 + \frac{1-\rho}{B}\sigma^2$. A team's 500 trees have highly correlated errors. Which change most reduces the variance component of test error?
    [ ] Grow the ensemble from 500 to 5,000 trees on fresh bootstrap samples
    [ ] Weight each tree's vote by accuracy so the strongest trees dominate
    [CORRECT] Add randomness that decorrelates trees, like random feature subsets
    [ ] Retrain with one fixed seed so the trees agree more consistently
- Q: In AdaBoost, a stump with weighted error $\epsilon_t$ receives vote weight $\alpha_t = \frac{1}{2}\ln\frac{1-\epsilon_t}{\epsilon_t}$, and example weights are multiplied by $e^{-\alpha_t}$ where it was right and $e^{\alpha_t}$ where it was wrong. One stump lands exactly at $\epsilon_t = 0.5$. What best describes its effect on the ensemble?
    [ ] $\alpha_t = 1$, so it votes normally and the weights update as usual
    [ ] $\alpha_t < 0$, so its vote reverses and the weights flip direction
    [CORRECT] $\alpha_t = 0$, so it casts no vote and leaves the weights unchanged
    [ ] $\alpha_t \to \infty$, so it dominates the vote and freezes training
- Q: An AdaBoost run produces three stumps with vote weights $\alpha_1 = 0.8$, $\alpha_2 = 0.5$, and $\alpha_3 = 0.2$. On a test example, stump 1 predicts class $+1$, stump 2 predicts $-1$, and stump 3 predicts $+1$. The ensemble predicts via the sign of the weighted sum. What is the weighted sum, and which class does the ensemble predict?
    [CORRECT] Sum $= 0.5$, predicts class $+1$.
    [ ] Sum $= 0.5$, predicts class $-1$.
    [ ] Sum $= 1.5$, predicts class $+1$.
    [ ] Sum $= 0.1$, predicts class $+1$.
- Q: A team observes that their AdaBoost model with 50 stumps achieves near-zero training error, but test error is high. They try adding 50 more stumps and see test error rise further. They then switch to bagging 100 stumps on the same data and see lower test error. Which explanation best accounts for the bagged stumps outperforming the boosted stumps here?
    [CORRECT] Boosting adaptively focuses on hard examples, which here are largely noise, while bagging averages over many noisy fits.
    [ ] Bagging assigns higher weight to misclassified examples, which counteracts the noise in the training labels.
    [ ] Boosting uses equal voting weights, which overfits less than bagging's weighted voting scheme.
    [ ] Bagging trains each stump on a different random feature subset, which boosting cannot do with stumps.
- Q: Which property most directly allows bagging to train its base learners at the same time on separate machines?
    [CORRECT] Each learner is fit on an independent bootstrap sample of data
    [ ] Each learner adjusts sample weights after seeing prior errors
    [ ] Each learner shares its split choices with all other learners
    [ ] Each learner is validated against a shared held-out test fold
- Q: A growth team retrains a 400-model ensemble every night on a cluster of 8 machines and wants the job to finish sooner. Which change gives the largest speedup?
    [CORRECT] Switch from AdaBoost to bagging and spread trees across machines
    [ ] Switch from bagging to AdaBoost and spread rounds across machines
    [ ] Keep using AdaBoost but train every fourth stump per machine
    [ ] Keep using bagging but train each tree on a single machine
- Q: A team debugs a bagging implementation and discovers that for each bootstrap sample, they accidentally fixed the random seed so that every tree receives identical training data. The base learner is a deterministic decision tree. They compute the ensemble variance formula $\rho\sigma^2 + \frac{1-\rho}{B}\sigma^2$. What values of $\rho$ and effective ensemble variance do they observe?
    [CORRECT] $\rho = 1$, variance $= \sigma^2$, no reduction from bagging.
    [ ] $\rho = 0$, variance $= \sigma^2 / B$, full reduction from bagging.
    [ ] $\rho = 0.5$, variance $= 0.5\sigma^2 + 0.5\sigma^2/B$, partial reduction.
    [ ] $\rho = 1/B$, variance $\approx \sigma^2/B$, near-full reduction.
- Q: Consider AdaBoost with the update $w_i^{(t+1)} = w_i^{(t)} \cdot e^{-\alpha_t y_i h_t(x_i)}$ followed by normalization. A stump classifies all examples correctly at round 5, giving $\epsilon_5 = 0$. What best describes the behavior of the algorithm for round 6 and beyond?
    [ ] All example weights become equal after normalization, so subsequent rounds behave like bagging
    [CORRECT] The vote weight $\alpha_5$ becomes undefined, and the algorithm cannot proceed without modification
    [ ] The correctly classified examples receive zero weight, and the algorithm terminates early
    [ ] The error $\epsilon_5 = 0$ causes the weight update to double all misclassified examples' weights
- Q: An engineer tries to speed up AdaBoost by fitting all stumps at once on separate bootstrap samples and combining them with equal votes. What best describes the result?
    [CORRECT] It behaves like bagging and loses the focus on hard cases
    [ ] It matches standard AdaBoost but trains considerably faster
    [ ] It keeps boosting's weighting while cutting model variance
    [ ] It improves on AdaBoost by removing dependence between rounds

### Hard and Soft Voting Classifiers

- Q: A three-classifier soft voting ensemble with uniform weights outputs these probability vectors for a single instance: Classifier 1: $[0.7,\, 0.2,\, 0.1]$ Classifier 2: $[0.3,\, 0.4,\, 0.3]$ Classifier 3: $[0.2,\, 0.3,\, 0.5]$ What is the ensemble's final predicted class?
    [CORRECT] Class 0, with averaged probability $0.4$
    [ ] Class 1, with averaged probability $0.3$
    [ ] Class 2, with averaged probability $0.3$
    [ ] Class 0, with averaged probability $0.45$
- Q: What is the main reason soft voting can outperform hard voting with the same base classifiers?
    [CORRECT] It accounts for how confident each classifier is in its output
    [ ] It trains each base classifier on a different subset of data
    [ ] It guarantees the ensemble beats every single base classifier
    [ ] It removes the need for the base classifiers to be diverse
- Q: A hard voting ensemble contains classifiers A, B, and C, all weighted equally. On a three-class problem with labels 0, 1, and 2, their predictions for a single instance are 0, 1, and 1 respectively. The ensemble predicts class 1. Before the final prediction is made, classifier C is retrained and now always predicts class 2 on the same instance. The ensemble now predicts class 2. What must be true about the retrained classifier C?
    [ ] Classifier C now carries a higher weight than A and B combined
    [ ] The ensemble switched from hard voting to soft voting after retraining
    [ ] Classifier C has a confidence score above 0.5 for class 2
    [CORRECT] The original prediction was a tie and C acts as the tie‑breaker
- Q: An ensemble of three base classifiers uses soft voting with weights $[0.5, 0.3, 0.2]$. For a test instance with true class $1$, the predicted probability for class $1$ is $0.44$, so the ensemble predicts class $0$. If you switch to hard voting on the same three classifiers with the same weights, what must be true?
    [ ] Hard voting always predicts the same class as soft voting
    [CORRECT] Hard voting may predict class $1$ if classifiers disagree
    [ ] Hard voting requires retraining all base classifiers
    [ ] Hard voting uses the median prediction, not the mean
- Q: In a soft voting ensemble with three binary classifiers, the predicted probabilities for class $1$ are $0.6$, $0.6$, and $0.1$. Using a $0.5$ threshold on the averaged probability, what does the ensemble predict?
    [ ] Class $1$, since two classifiers give probability above $0.5$
    [ ] Class $1$, since the majority of classifiers vote for it
    [CORRECT] Class $0$, since the averaged probability is about $0.43$
    [ ] Class $0$, since the lowest probability decides the vote
- Q: A soft voting ensemble with weights $[0.3, 0.4, 0.3]$ combines three classifiers for a binary problem. Their probabilities for class $1$ are $P_1 = 0.8$, $P_2 = 0.35$, and $P_3 = 0.4$. What does the ensemble predict and what is the weighted average probability for class $1$?
    [ ] Class $1$, with weighted average $0.50$
    [CORRECT] Class $1$, with weighted average $0.517$
    [ ] Class $0$, with weighted average $0.50$
    [ ] Class $0$, with weighted average $0.517$
- Q: An ensemble of five classifiers uses hard voting with uniform weights. On a binary classification test set, the individual classifiers achieve accuracies of $95\%$, $95\%$, $95\%$, $95\%$, and $60\%$. The ensemble accuracy is $95\%$. Which statement best explains why the weak classifier does not hurt the ensemble?
    [ ] Soft voting down-weights low-confidence predictions from the weak classifier
    [CORRECT] Majority voting requires only three correct classifiers to override a minority
    [ ] The weak classifier learns from the mistakes of the stronger classifiers
    [ ] Hard voting averages probabilities so the weak signal is diluted
- Q: A soft voting classifier with equal weights combines three classifiers that output probability $0.9$, $0.45$, and $0.45$ for class $1$. What does the ensemble predict?
    [CORRECT] Class $1$, since the averaged probability $0.6$ exceeds $0.5$
    [ ] Class $0$, since two of the three probabilities are below $0.5$
    [ ] Class $1$, since the largest probability $0.9$ decides the vote
    [ ] Class $0$, since the smallest probability $0.45$ decides the vote
- Q: A hard voting ensemble combines three binary classifiers. For one test example, they predict classes $1$, $0$, and $1$ respectively. What does the ensemble output for this example?
    [CORRECT] Class $1$, because two of the three votes select it
    [ ] Class $0$, because the predictions are not unanimous
    [ ] Class $1$, because the first classifier predicted it
    [ ] Class $0$, because ties default to the smaller label
- Q: A hard voting ensemble of five classifiers shows no improvement over its best member. What is the most likely explanation?
    [CORRECT] The base models make highly correlated errors on the same inputs
    [ ] The base models are too diverse and cancel out useful signals
    [ ] Majority voting requires unanimous agreement among base models
    [ ] Voting ensembles require an even number of base classifiers
- Q: Under which condition can a soft voting classifier outperform a hard voting classifier built from the same base models?
    [ ] When base models are trained on entirely identical feature sets
    [CORRECT] When base models output probabilities reflecting varied confidence
    [ ] When base models always agree with each other on every input
    [ ] When base models are forced to output only hard class labels
- Q: You train four binary classifiers on the same dataset. Three achieve $85\%$ accuracy and one achieves $55\%$ accuracy. Their errors are uncorrelated. You combine them with hard voting using equal weights. Why might the ensemble underperform the best individual classifier?
    [ ] Hard voting requires all classifiers to be correct
    [ ] Majority voting amplifies the weakest classifier's bias
    [CORRECT] The weak classifier consistently joins the losing minority
    [ ] Accuracy metrics ignore probability calibration errors
- Q: To use soft voting, what must each base classifier in the ensemble provide for every input?
    [CORRECT] A probability estimate for each of the possible classes
    [ ] A different algorithm type than all the other members
    [ ] A higher training accuracy than every other member
    [ ] A separate feature subset on which it was trained
- Q: Which choice of base models is most likely to make a voting classifier outperform its individual members?
    [ ] Three copies of one decision tree trained on identical data
    [ ] Three strong models making identical errors on every input
    [ ] One accurate model paired with two random guessing models
    [CORRECT] A logistic regression, a decision tree, and an SVM, each decent
- Q: A team builds a voting ensemble from three models but sees no gain over its single best model. What is the most likely cause?
    [CORRECT] The base classifiers are nearly identical, so their errors correlate
    [ ] The ensemble uses soft voting rather than a hard voting rule
    [ ] The base classifiers each have accuracy above random guessing
    [ ] The ensemble holds an odd rather than an even number of voters
- Q: You have three base classifiers with soft voting and uniform weights. For a binary classification problem, they output the following probabilities for class 1: $0.6$, $0.55$, and $0.3$. The ensemble predicts class 1. You now change the weight of the third classifier to $0$ while keeping the other two weights equal and summing to $1$. What changes about the ensemble?
    [ ] The decision threshold drops from $0.5$ to $0.33$
    [CORRECT] The averaged probability for class 1 increases
    [ ] The ensemble prediction flips to class 0
    [ ] The ensemble becomes a hard voting classifier
- Q: A hard voting classifier combines three base classifiers with equal weight. On one test example, they predict classes $1$, $0$, and $1$ respectively. What is the ensemble's final prediction?
    [CORRECT] Class $1$, since a majority of the classifiers predict it
    [ ] Class $0$, since hard voting requires unanimous agreement
    [ ] Class $1$, since the first classifier's output breaks ties
    [ ] Class $0$, since each classifier contributes one equal vote
- Q: You train two classifiers on the same data. Classifier P has $80\%$ accuracy and classifier Q has $80\%$ accuracy. When combined in a hard voting ensemble with equal weights, the ensemble accuracy is also $80\%$. Which change is most likely to make the ensemble outperform either individual classifier?
    [CORRECT] Train both classifiers on mutually exclusive subsets of the training data
    [ ] Use soft voting instead while keeping the same two classifiers
    [ ] Add a third classifier that also achieves exactly $80\%$ accuracy
    [ ] Replace one classifier with a copy of the other to reduce variance

