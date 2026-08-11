# SOURCE PACK — Machine Learning / Ensemble Methods / Stacking & Blending

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Stacking: Combining Models with a Meta-Learner   (13 questions)
2. Blending with a Holdout Set   (18 questions)
3. Combining Neural Networks with Gradient-Boosted Trees   (18 questions)

## Already taught earlier in this course

- Why Ensembles Work: Diversity and Error Reduction
- Bootstrap Aggregating (Bagging)
- Boosting vs. Bagging: Sequential vs. Parallel Ensembles
- Hard and Soft Voting Classifiers

## The live quiz bank for these topics — 49 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Stacking: Combining Models with a Meta-Learner

- Q: In 5-fold stacking for regression, row $i$ falls in validation fold 2. Which predictions should become the meta-features for row $i$ when training the meta-learner?
    [ ] Use predictions from base models trained on all rows, including row $i$
    [CORRECT] Use predictions from base models trained without fold 2, for held-out row $i$
    [ ] Use the final full-data base models after they are refit on every row
    [ ] Use the true label $y_i$ together with the average prediction from every fold
- Q: A practitioner builds a stacking regressor with three base models using 5-fold cross-validation. The base models are a random forest, a gradient boosting machine, and a k-nearest neighbors regressor. The meta-learner is a ridge regression. After training, the practitioner examines the learned meta-learner coefficients and finds they are $0.92$, $-0.05$, and $0.11$ (with intercept $0.18$). What does the coefficient of $-0.05$ on the gradient boosting predictions most likely indicate?
    [CORRECT] The gradient boosting model is highly correlated with the random forest, so the meta-learner subtracts a small portion of its contribution to reduce redundancy.
    [ ] The gradient boosting model is performing worse than random guessing on the validation folds, and the meta-learner is correcting its systematic errors.
    [ ] The negative coefficient confirms that the gradient boosting model suffered from data leakage during the out-of-fold prediction generation phase.
    [ ] The ridge regularization penalty was set too high, forcing the coefficient toward zero and eventually making it slightly negative by chance.
- Q: For a binary classifier stack, the meta-learner was trained on base predicted probabilities. For a new point $x$, which inference path matches that training design?
    [ ] Convert base outputs to hard labels, then let the meta-learner vote on labels
    [ ] Train the meta-learner briefly on $x$ so it adapts before predicting $x$
    [CORRECT] Feed base probability scores for $x$ into the meta-learner, then threshold its output
    [ ] Average hard base votes only, and skip the meta-learner to reduce drift
- Q: A data scientist builds a stacking ensemble for regression. Level-0 consists of a support vector regressor, a decision tree, and a lasso regressor. The out-of-fold predictions are generated via 5-fold cross-validation and stored in a matrix $P$ of shape $(n, 3)$. The meta-learner is trained on $P$ and the true targets $y$. Before fitting the meta-learner, the scientist standardizes the columns of $P$ to have zero mean and unit variance. For inference on a new dataset, the base models are retrained on the full training set to produce raw predictions $p_1, p_2, p_3$ for each new instance. What must be done to these new predictions before feeding them into the fitted meta-learner?
    [CORRECT] Apply the same standardization transformation using the mean and standard deviation computed from the original out-of-fold matrix $P$.
    [ ] Standardize the new predictions using the mean and standard deviation computed from the new dataset’s predictions across all instances.
    [ ] No transformation is needed because retraining the base models on the full dataset makes their prediction scales consistent with the original folds.
    [ ] Standardize the new predictions jointly with the original out-of-fold predictions by concatenating and recomputing the mean and standard deviation.
- Q: After base learners run, the meta design matrix has many rows but only four columns, one per base model. The base models are already flexible. What is a sound default meta-learner choice?
    [CORRECT] Use a simple regularized linear or logistic model, tuned with cross-validation
    [ ] Use a very large unregularized network to maximize meta-learner capacity
    [ ] Use a high-degree polynomial over the four scores with no validation check
    [ ] Use a 1-nearest-neighbor rule so the meta-learner memorizes local patterns
- Q: A data scientist builds a two-level stacking ensemble for regression. Level-0 contains a linear model, a decision tree, and a k-NN regressor. The meta-learner is a ridge regression trained on 5-fold out-of-fold predictions. During inference on a new dataset of 1000 rows, the base models are retrained on the full training set and produce predictions $p_1$, $p_2$, and $p_3$ for each row. The meta-learner coefficients are $\hat{y} = 0.4p_1 + 0.35p_2 + 0.25p_3$. A colleague suggests concatenating the original features $X$ alongside $p_1, p_2, p_3$ when training the meta-learner next time. What is the primary risk of this modification?
    [CORRECT] The meta-learner may overfit by memorizing training set patterns the base models already captured.
    [ ] The meta-learner will lose the ability to weight base models differently across the feature space.
    [ ] The out-of-fold predictions will become correlated with the target in the validation folds.
    [ ] The base models will need to be retrained with a different cross-validation split strategy.
- Q: In a 3-fold stacking pipeline for regression, the base models are trained on folds {1,2}, {1,3}, and {2,3} to generate out-of-fold predictions for folds 3, 2, and 1 respectively. The meta-learner is then fitted on these predictions paired with the true targets. A new data point arrives. Which of the following describes the correct inference procedure?
    [ ] Retrain each base model on a random 2/3 subset of the full training data, average their predictions, and feed the average to the meta-learner.
    [CORRECT] Retrain each base model on the entire training set, obtain their predictions for the new point, and feed those predictions into the fitted meta-learner.
    [ ] For each base model, average the three versions trained during cross-validation, predict with the averaged model, and feed the result to the meta-learner.
    [ ] Apply the 3-fold split to the new point by assigning it to each fold once, collect the out-of-fold predictions, and feed the triplet to the meta-learner.
- Q: An engineer evaluates adding a fourth base model to an existing stack of three regressors. The current stack achieves a validation RMSE of 12.4. The residuals of the three base models on the validation set are nearly uncorrelated with one another (pairwise correlations below 0.1 in absolute value). The candidate fourth model has a validation RMSE of 13.1, and its residuals have correlations of 0.05, 0.03, and 0.92 with the residuals of the three existing models, respectively. What is the most likely outcome of adding this candidate to the stack?
    [ ] Stack performance will noticeably degrade because the new model has a higher RMSE than the existing ensemble.
    [ ] Stack performance will improve substantially because the new model brings a fresh error pattern to the combination.
    [CORRECT] Stack performance will change very little because the new model largely duplicates the error pattern of one existing model.
    [ ] Stack performance will improve but only if the meta-learner is switched from linear regression to a neural network.
- Q: A data scientist trains a two-level stacking classifier for binary classification. Level-0 has three base classifiers: logistic regression, a small neural network, and a decision tree. Each base classifier outputs a predicted probability. The meta-learner is a logistic regression trained on the 5-fold out-of-fold probability predictions. The scientist notices that on the holdout test set, the stacked predictions are only marginally better than the best single base model. The pairwise correlations of the base model predicted probabilities on the test set are $[0.92, 0.88, 0.95]$. What is the most likely explanation for the limited improvement?
    [CORRECT] The base models lack diversity, so the meta-learner receives redundant signals and cannot extract substantial additional information beyond any single model.
    [ ] The meta-learner should have been trained on the original features concatenated with the out-of-fold predictions to capture interactions the base models missed.
    [ ] The 5-fold cross-validation procedure introduced excessive variance in the out-of-fold predictions, which diluted the meta-learner’s ability to learn correct combination weights.
    [ ] Logistic regression is an inappropriate meta-learner for probability inputs because its linear decision boundary cannot model nonlinear combinations of the base predictions.
- Q: A regression stack uses $\hat{y}=2+0.5p_1+0.2p_2-0.1p_3$. For one row, the base predictions are $p_1=10$, $p_2=12$, and $p_3=14$. What is the stacked prediction?
    [ ] $7.2$
    [ ] $9.4$
    [ ] $12.0$
    [CORRECT] $8.0$
- Q: A stack helps most when base learners are reasonably accurate and err on different examples. You can add one regressor to three existing ones. Which choice is most promising?
    [ ] Add the model with the lowest training error, even if its residuals match the stack
    [ ] Add the most complex model available, since complexity creates new information
    [CORRECT] Add an accurate model whose residuals are weakly correlated with current residuals
    [ ] Add a clone of the best base model trained with the same data and settings
- Q: A stack contains three base classifiers producing probability estimates for a binary target. The meta-learner is a logistic regression. For a test instance $x$, the base probabilities are $[0.2, 0.8, 0.6]$, and the meta-learner computes $z = -1.5 + 2.0 \cdot p_1 + 1.0 \cdot p_2 - 0.5 \cdot p_3$ and outputs $\sigma(z)$ where $\sigma$ is the sigmoid function. What is the stacked probability prediction for $x$?
    [ ] $\sigma(-0.6) \approx 0.354$
    [CORRECT] $\sigma(-0.2) \approx 0.450$
    [ ] $\sigma(0.4) \approx 0.599$
    [ ] $\sigma(0.0) = 0.500$
- Q: A practitioner designs a two-layer stack for a 10-class classification task. Level-0 has five diverse classifiers, each outputting a 10-dimensional probability vector per instance. The meta-feature matrix therefore has 50 columns. The training set contains 8000 rows. Which meta-learner choice best balances expressiveness with the risk of overfitting to the meta-features?
    [ ] A deep neural network with two hidden layers of 128 units each and ReLU activations.
    [CORRECT] A multinomial logistic regression with $\ell_2$ regularization and cross-validated strength.
    [ ] A k-nearest neighbors classifier with $k = 1$ applied directly to the 50-dimensional meta-features.
    [ ] A gradient-boosted tree ensemble with 500 estimators and max depth 8.

### Blending with a Holdout Set

- Q: You are blending three base models. Model A achieves holdout $R^2$ of 0.80, Model B achieves 0.75, and Model C achieves 0.70. Their holdout residuals show pairwise correlations: $\rho_{A,B} = -0.30$, $\rho_{A,C} = 0.10$, and $\rho_{B,C} = -0.25$. Given this pattern, what should you expect from a well-chosen linear blend?
    [CORRECT] The blend's $R^2$ can exceed 0.80 because the negative error correlations allow cancellation beyond what any single model achieves.
    [ ] The blend's $R^2$ will fall between 0.70 and 0.80, bounded by the best and worst individual model performances.
    [ ] The blend's $R^2$ will be close to 0.80 since Model A dominates and the negative correlations are too weak to matter.
    [ ] The blend's $R^2$ will drop below 0.70 because negatively correlated errors amplify each other when combined linearly.
- Q: You train two base models on 70% of your data and use the remaining 30% as a holdout set. On this holdout set, Model 1 has predictions $\hat{y}_1$ with errors $e_1 = y - \hat{y}_1$, and Model 2 has predictions $\hat{y}_2$ with errors $e_2 = y - \hat{y}_2$. You observe that $\text{Corr}(e_1, e_2) = -0.60$ and both models have similar holdout RMSE around $3.5$. You fit a linear meta-model $\hat{y}_{\text{blend}} = w_1 \hat{y}_1 + w_2 \hat{y}_2$ on the holdout predictions. Which statement best explains why this blend can substantially outperform either base model?
    [CORRECT] The errors tend to have opposite signs, so combining them can cancel out a large portion of the total error.
    [ ] The meta-model can assign higher weight to the model with slightly lower holdout RMSE, giving a boost.
    [ ] Averaging two models always reduces variance by a factor of $\sqrt{2}$ regardless of error correlation.
    [ ] The holdout set is smaller, so the meta-model overfits less and generalizes better than either base model.
- Q: Your blend already contains two models. Candidate X has holdout RMSE $3.9$ with errors highly correlated with your current models, while candidate Y has holdout RMSE $4.3$ with errors nearly independent of them. Which addition is more likely to improve the blend, and why?
    [CORRECT] Candidate Y, because its independent errors can cancel the current models' mistakes
    [ ] Candidate X, because its lower RMSE means it always helps the blend more
    [ ] Candidate X, because correlated errors make its weights easier to estimate
    [ ] Neither one, because blends never benefit from adding a third base model
- Q: On one holdout example, base model A predicts $10$ and base model B predicts $14$. Your fitted blending meta-model assigns weight $0.75$ to A and $0.25$ to B. What is the blended prediction for this example?
    [CORRECT] $11$
    [ ] $12$
    [ ] $13$
    [ ] $14$
- Q: You split your data into three parts: 60% for training base models, 20% as a holdout set to generate predictions for the meta-model, and 20% as a test set kept entirely aside. Your linear regression meta-model, fitted on the holdout predictions, assigns a weight of 0.9 to Model A and 0.1 to Model B. You then evaluate the blend on the test set and get an RMSE of 3.8. Which statement about this RMSE is correct?
    [CORRECT] It is the final unbiased estimate of the blended system's generalization performance.
    [ ] It underestimates the true error because the meta-model was fitted on only 20% of the data.
    [ ] It is optimistically biased because the base models saw the test set during training.
    [ ] It reflects the performance of Model A alone since its weight dominates the blend.
- Q: You blend two base models using a holdout set. Model X has holdout MAE of 5.0 and Model Y has holdout MAE of 5.2. Their prediction errors on the holdout set have a correlation of 0.95. You fit a linear meta-model on these holdout predictions. What is the most plausible range for the blended system's MAE?
    [CORRECT] Roughly between 4.9 and 5.2, with only a marginal improvement over the best base model.
    [ ] Substantially below 5.0, because any weighted combination of two unbiased predictors reduces error.
    [ ] Slightly above 5.2, because combining highly correlated models amplifies their shared mistakes.
    [ ] Exactly 5.0, because the meta-model will always select the single best base model.
- Q: You tune each base model's hyperparameters by checking its error on the holdout set, then fit the blending meta-model on those same holdout predictions. Why can this procedure give an overly optimistic view of the blend?
    [CORRECT] The holdout no longer reflects new data, since it shaped both the base models and the blend
    [ ] The base models were never retrained, so their holdout predictions remain permanently stale
    [ ] The meta-model ignores the holdout labels, so it cannot learn any weights at all
    [ ] The hyperparameter search uses too few trials, so the base models are underfit
- Q: You train four base models on a training set and record their predictions on a holdout set. The holdout $R^2$ values are: Model A $0.72$, Model B $0.68$, Model C $0.65$, Model D $0.60$. Their holdout prediction vectors have pairwise correlations all above $0.92$. You fit a linear meta-model on these holdout predictions using ordinary least squares. Which outcome is most likely?
    [ ] The blend achieves $R^2$ significantly above $0.72$ because combining four models always improves performance.
    [CORRECT] The blend achieves $R^2$ roughly between $0.60$ and $0.72$, with little or no improvement over Model A alone.
    [ ] The blend overfits the holdout set and achieves $R^2$ near $1.0$ on the holdout but degrades on new data.
    [ ] The meta-model assigns large negative weights to some models, producing a blend with $R^2$ below $0.60$.
- Q: After fitting a blending meta-model on holdout predictions, you want a final unbiased estimate of the blended system's performance. Which evaluation procedure is correct?
    [ ] Score the blend on the same holdout set used to fit the meta-model
    [CORRECT] Score the blend on a separate test set untouched by all training stages
    [ ] Score the blend on the base models' original training set for stability
    [ ] Average each base model's training accuracy as a proxy for the blend
- Q: Which sequence correctly orders the stages of a blending workflow that ends with an honest performance estimate?
    [CORRECT] Train base models on the training split, predict the holdout, fit the meta-model there, then score on a separate test set
    [ ] Fit the meta-model on training predictions, retrain the base models on the holdout, then score on that same holdout
    [ ] Train base models on all the data, predict the test set, fit the meta-model there, then score on that same test set
    [ ] Fit the meta-model first on the holdout labels, then train the base models to match its holdout predictions
- Q: You have four base models but only $40$ holdout examples. A colleague proposes fitting an unconstrained linear meta-model with four weights plus an intercept. What is the most defensible alternative?
    [CORRECT] Use a simple equal-weight average, which has almost nothing to estimate from the small holdout
    [ ] Fit the unconstrained linear meta-model, since more parameters always reduce bias
    [ ] Drop the holdout and fit the meta-model on the base models' training predictions
    [ ] Increase the number of base models so the meta-model has more inputs to learn from
- Q: You train five base models on 70% of your dataset and reserve 30% as a holdout set. On the holdout set, you record each model's predictions and fit a meta-model. Before deploying, you want to estimate how your blend will perform on genuinely new data. Your dataset has 10,000 rows. Which procedure gives the most trustworthy estimate?
    [CORRECT] Set aside a separate test split before any training, and evaluate the final blend only on that split.
    [ ] Use the holdout set's performance of the meta-model, since the meta-model never saw those targets during its own fitting.
    [ ] Average the holdout RMSEs of the five base models, weighted by their meta-model coefficients, to avoid data leakage.
    [ ] Run k-fold cross-validation on the entire dataset after blending, retraining both base and meta-models in each fold.
- Q: A colleague blends two models: a decision tree with holdout RMSE of $4.2$ and a linear model with holdout RMSE of $4.0$. Their errors on the holdout are nearly uncorrelated. What does ensemble theory suggest about a well-fitted blend?
    [ ] It will equal the average of the two errors, about $4.1$, since blending averages the errors
    [CORRECT] It can fall below $4.0$ because uncorrelated mistakes partially cancel when combined
    [ ] It cannot drop below $4.0$ since no combination can beat the best single base model
    [ ] It will lie above $4.2$ since combining models always adds variance to the system
- Q: You train three base models on 80% of your data and want to blend them with a meta-model. Why should the meta-model be fitted on the base models' predictions for the remaining 20% holdout, rather than their predictions on the same 80% used for training?
    [ ] Because base models can only produce predictions for data they have never seen before
    [CORRECT] Because predictions on training data are optimistically biased and mislead the meta-model
    [ ] Because the holdout set is always more representative of the final test distribution
    [ ] Because the meta-model requires fewer examples than the base models to converge
- Q: A teammate suggests fitting the blending meta-model directly on the base models' training-set predictions instead of on a holdout set, arguing that this uses more data and should improve the meta-model. Why is this approach likely to produce a worse blend?
    [CORRECT] Because training-set predictions carry optimistic bias that misleads the meta-model into trusting overconfident patterns.
    [ ] Because the meta-model will overfit the training data and assign zero weight to all but one base model.
    [ ] Because training-set predictions have higher variance than holdout predictions, destabilizing the meta-model coefficients.
    [ ] Because the base models will have memorized the training targets, making their predictions identical and useless for blending.
- Q: You build a blending system by training three base models on 80% of the data and generating their predictions on the remaining 20% holdout. You then fit a ridge regression meta-model on those holdout predictions. After finalizing the blend, you need an unbiased estimate of its generalization RMSE. The original dataset has 5,000 rows. Which procedure gives the best estimate?
    [ ] Compute the RMSE of the blend on the same 20% holdout used to fit the meta-model.
    [ ] Randomly sample 10% from the training set, evaluate the blend there, and report that RMSE.
    [CORRECT] Before any training, set aside a separate 15% test split and evaluate the final blend only on that.
    [ ] Use 5-fold cross-validation on the full dataset, fitting both base models and meta-model in each fold.
- Q: Which statement correctly contrasts blending with stacking that uses k-fold cross-validation?
    [CORRECT] Blending uses a single holdout split for meta-training, while stacking uses out-of-fold predictions from every training point
    [ ] Blending retrains base models on all folds, while stacking trains each base model only one single time
    [ ] Blending requires the meta-model to be linear, while stacking permits any nonlinear meta-model
    [ ] Blending uses more data for meta-training, while stacking reserves a fixed 20% for the meta-model
- Q: In blending, suppose your three base models all make nearly identical predictions on the holdout set. What is the most likely outcome when you fit a linear meta-model on these predictions?
    [ ] The meta-model will learn large weights and greatly amplify small errors
    [ ] The blend will fail to train because the inputs become perfectly collinear
    [CORRECT] The blend offers little gain since the models provide redundant information
    [ ] The blend will outperform each base model by a wide, stable margin

### Combining Neural Networks with Gradient-Boosted Trees

- Q: When is gradient boosted trees alone often a better first choice than a neural network plus tree hybrid?
    [CORRECT] When the data are modest sized clean tables and fast iteration matters most.
    [ ] When the inputs are raw pixels and every layer must learn spatial filters.
    [ ] When the goal is end to end differentiation from pixels to final prediction.
    [ ] When there is unlimited labeled data and no constraint on inference latency.
- Q: You stack a neural network and gradient-boosted trees with a logistic meta-learner. Which base-model outputs should train the meta-learner?
    [ ] Test-set predictions from each base model
    [ ] In-sample scores fitted on all rows
    [CORRECT] Out-of-fold predictions from each base model
    [ ] Raw features copied after model training
- Q: In stacking, the meta learner is trained on out of fold predictions from the neural network and the boosted trees instead of their predictions on the same rows used to fit them. What problem does this mainly reduce?
    [CORRECT] It reduces leakage from in sample predictions that look stronger than new data.
    [ ] It reduces memory use by forcing both base models to share one parameter set.
    [ ] It increases tree depth automatically whenever the neural network is underfitting.
    [ ] It converts every neural network output into a perfectly calibrated probability.
- Q: A team has tabular customer features plus a separate image for each customer. They train a neural network on images and pass its learned embedding, together with the tabular columns, into gradient boosted trees. What is the main benefit of this design?
    [CORRECT] It lets trees use compact image embeddings while keeping tabular splits efficient.
    [ ] It makes the trees differentiable so gradients can update the input image pixels.
    [ ] It removes the need to validate either model on held out customer data.
    [ ] It guarantees lower training loss than using either model family alone.
- Q: Why are most standard gradient boosted trees not trained jointly with a neural network by ordinary backpropagation?
    [CORRECT] Tree predictions are piecewise constant, so useful gradients through hard splits are unavailable.
    [ ] Gradient boosting has no loss function, so there is no signal for either model to use.
    [ ] Neural networks cannot accept tabular inputs unless every feature is first one hot encoded.
    [ ] Boosted trees require unlabeled data, while backpropagation requires image pixels only.
- Q: In a regression task, a neural network $f_{\theta}$ and a gradient-boosted tree ensemble $g$ are combined as $\hat{y} = \alpha f_{\theta}(x) + (1-\alpha) g(x)$ where $\alpha \in [0,1]$ is chosen by minimizing validation error. The neural network is trained first on the original targets, then frozen. The trees are then trained on the residuals $r = y - f_{\theta}(x)$ using the original features. After fixing both models, $\alpha$ is tuned on validation data. Which statement about this pipeline is true?
    [CORRECT] $\alpha$ acts as a blending weight that balances the contributions of the smooth and sharp components of the prediction.
    [ ] The frozen network must be unfrozen and retrained jointly with the trees after $\alpha$ is selected to avoid inconsistency.
    [ ] The trees are trained on a different target distribution than the neural network, making the weighted sum invalid.
    [ ] $\alpha$ should always be set to 0.5 to ensure neither model dominates and to maximize ensemble diversity.
- Q: You train a neural network on tabular data and extract the penultimate layer activations as a 32-dimensional vector $\mathbf{z}$. You then train gradient-boosted trees on $[\mathbf{z}, X_{\mathrm{num}}]$ where $X_{\mathrm{num}}$ are the original numeric features. The trees achieve lower test error than the neural network alone. Which of the following is the most likely reason?
    [CORRECT] The trees can exploit axis-aligned splits on $\mathbf{z}$, which already encodes smooth nonlinear transformations learned by the network.
    [ ] The 32-dimensional vector reduces the feature count below 100, which is a hard upper bound required for gradient boosting to converge.
    [ ] Concatenating $X_{\mathrm{num}}$ forces the trees to ignore $\mathbf{z}$ entirely, so performance gains come solely from duplicated numeric inputs.
    [ ] The penultimate layer activations are binary, enabling the trees to partition the space with single-split conditions on each dimension.
- Q: For squared-error regression, a hybrid keeps a trained neural network fixed and boosts trees to correct it. The first tree should be fit to which target?
    [ ] Fit to $y$ again while ignoring network outputs
    [CORRECT] Fit to $y-\hat{y}_{\mathrm{NN}}$ at each training row
    [ ] Fit to $\partial \mathcal{L}/\partial \theta$ for network weights
    [ ] Fit to leaf scores sampled from random trees
- Q: For a simple two stage combination, which workflow best avoids optimistic test estimates when blending a neural network and gradient boosted trees?
    [CORRECT] Fit both models on train, tune the blend on validation, then evaluate once on test.
    [ ] Fit both models on test, tune the blend on train, then report the validation score.
    [ ] Fit the neural net on validation, fit trees on test, then average the two training losses.
    [ ] Fit trees on all data, refit the neural net on test, then select the best blend weight.
- Q: A regression hybrid is built as follows: a neural network is trained on all features, then frozen. A gradient-boosted tree ensemble is trained on the original features $X$ with target $r = y - \hat{y}_{\mathrm{NN}}$. For a test sample, the final prediction is $\hat{y}_{\mathrm{NN}} + g(x)$. During training, the first tree in the ensemble splits on the feature most correlated with $r$. Which statement explains why this hybrid can succeed when a standalone neural network underfits sharp nonlinear interactions?
    [CORRECT] The trees can model hard splits on feature interactions that the smooth neural network fails to capture, and they explicitly target the remaining error.
    [ ] The neural network's frozen weights serve as a regulariser that shrinks the tree ensemble's leaf weights toward zero, preventing overfitting.
    [ ] The residual $r$ contains only irreducible noise, so the trees learn a pure denoising function that improves the network's bias.
    [ ] The first tree's split on $\hat{y}_{\mathrm{NN}}$ eliminates the need for the neural network to learn any interaction terms at all.
- Q: A data scientist trains a neural network on raw image pixels and extracts the activations of the final hidden layer as an embedding vector. She then appends three numeric metadata features to this embedding and trains gradient-boosted trees on the concatenated vector. Why might this design outperform training the trees directly on the raw pixels and metadata together?
    [CORRECT] The embedding provides a smooth, high-level representation that trees can split on more effectively than raw pixel values.
    [ ] The trees can backpropagate their splitting criteria into the network to fine-tune the convolutional filters.
    [ ] The metadata features are converted into image channels, letting the network process them as spatial information.
    [ ] The embedding discards all spatial information so the trees only need to learn from the numeric metadata.
- Q: You have a dataset with 50 000 rows of mixed tabular features and a text field. You plan to train a neural network on the text alone, extract the final hidden layer as an embedding, and then input that embedding together with the original numeric columns into gradient-boosted trees. The trees are trained on the full 50 000 rows using the neural network's in-sample embeddings. Which risk does this design introduce?
    [CORRECT] The trees may memorise patterns the neural network overfit, weakening generalisation to new text.
    [ ] The embedding dimensionality will exceed the trees' capacity to split, causing underfitting on numeric features.
    [ ] The neural network's gradients will flow through the trees during backpropagation, corrupting the text representation.
    [ ] The trees will ignore the embedding entirely because tree splits operate on raw text tokens, not dense vectors.
- Q: When is a neural network plus gradient-boosted-tree design most clearly justified?
    [ ] A tiny clean table with simple linear trends only
    [ ] A need for one model trained by one optimizer
    [ ] A rule that every feature must be one-hot encoded
    [CORRECT] Image inputs with useful tabular metadata at inference
- Q: A practitioner chooses a hybrid design: first train gradient-boosted trees on tabular features, then train a neural network using the original features concatenated with the trees' leaf membership indicators as input. Which property of this design is most likely to benefit the neural network?
    [CORRECT] The leaf indicators provide explicit, hard partitions of the feature space as a preprocessing step.
    [ ] The neural network can adjust the tree splits via gradient descent, refining the initial tree boundaries.
    [ ] The trees learn a differentiable approximation of the target that the network uses as a warm start.
    [ ] The leaf indicators guarantee the neural network converges in fewer epochs due to reduced feature variance.
- Q: A standard two-stage hybrid trains the neural network first, freezes it, then trains boosted trees on its outputs. Which constraint follows?
    [ ] Both stages must share one loss and optimizer
    [ ] The trees must use the same activation as the network
    [CORRECT] Tree gradients do not flow into the frozen network
    [ ] The network must be retrained after every tree
- Q: A practitioner fits a neural network to a dataset of 100 000 rows, freezes its weights, and obtains predictions $\hat{y}_{\text{NN}}$ for every training row. They then train a gradient-boosted tree ensemble on the same 100 000 rows using the original features $X$ and the residual $r = y - \hat{y}_{\text{NN}}$ as the target. After training, the final prediction for a new input $x_{\text{new}}$ is formed by summing the frozen network output and the tree ensemble output. Which statement about this workflow is correct?
    [CORRECT] The tree ensemble learns the leftover signal that the frozen network could not capture from the same feature set.
    [ ] The tree ensemble receives gradient information from the neural network, enabling end-to-end optimization of both models.
    [ ] The frozen network must be retrained on the residuals after the trees are fitted to avoid bias in the final predictions.
    [ ] The tree ensemble is redundant because the neural network already extracted all useful information from $X$.
- Q: A team trains a neural network on mixed tabular and text features, then feeds its penultimate embedding plus the numeric columns into gradient-boosted trees. What is the main benefit of this handoff?
    [CORRECT] It lets trees add sharp splits to a smooth representation
    [ ] It makes the full pipeline differentiable during boosting
    [ ] It removes the need for held-out validation data
    [ ] It guarantees calibrated outputs for every subgroup
- Q: A team stacks a neural network and gradient-boosted trees using 5-fold cross-validation. For each fold, the neural network is trained on 4 folds and makes predictions on the held-out fold. These out-of-fold predictions are collected across all 5 folds. The team then trains the gradient-boosted trees on the original features $X$ and the neural network's out-of-fold predictions as an additional feature. What is the primary reason for using out-of-fold predictions instead of the network's full training set predictions?
    [CORRECT] To prevent the trees from overfitting to the neural network's in-sample prediction patterns.
    [ ] To allow the trees to backpropagate gradients into the neural network during boosting iterations.
    [ ] To ensure the neural network is trained on exactly the same data as the gradient-boosted trees.
    [ ] To reduce the number of features the trees must process by averaging correlated predictions.

