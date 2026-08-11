# SOURCE PACK — Machine Learning / Model Evaluation & Tuning / Bias-Variance & Regularization

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Underfitting vs Overfitting Identification   (5 questions)
2. Expected Prediction Error Decomposition   (5 questions)
3. Bias, Variance, and Irreducible Error   (5 questions)
4. Impact of Model Complexity on Bias and Variance   (5 questions)
5. Learning Curves for Diagnosing Bias and Variance   (5 questions)
6. Dropout as a Regularizer for Neural Networks   (5 questions)
7. Early Stopping in Gradient Boosting and Neural Networks   (5 questions)

## Already taught earlier in this course

- Confusion Matrix: TP, TN, FP, FN
- Accuracy, Precision, Recall, and F1-Score
- ROC Curve and Area Under the Curve (AUC)
- Precision-Recall Curve for Imbalanced Data
- Threshold Tuning and Cost-Sensitive Decisions
- Systematic Error Analysis (Per-Class FP/FN Patterns)
- Data Augmentation and Feature Engineering from Error Insights
- Class Imbalance: Undersampling, Oversampling, and SMOTE
- Cost-Sensitive Learning and Threshold Adjustment
- Ceiling Analysis to Prioritize Improvements

## Covered by LATER lessons — do not teach these here

- Cross-Validation & Hyperparameter Tuning: Validation Curves to Tune a Hyperparameter, k-Fold Cross-Validation, Stratified k-Fold for Classification, Grid Search and Random Search, Nested Cross-Validation for Unbiased Evaluation

## The live quiz bank for these topics — 35 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Underfitting vs Overfitting Identification

- Q: A digital marketer trains a neural network with 10 hidden units on conversion data, obtaining training accuracy 72% and validation accuracy 70%. Increasing to 500 hidden units yields training accuracy 99% and validation accuracy 68%. Which characterization is most accurate?
    [CORRECT] Underfitting for the 10-unit model; overfitting for the 500-unit model.
    [ ] Overfitting for the 10-unit model; underfitting for the 500-unit model.
    [ ] Underfitting for both the 10-unit and the 500-unit models.
    [ ] Overfitting for both the 10-unit and the 500-unit models.
- Q: A marketer uses 5-fold cross-validation to evaluate a gradient boosting model for purchase prediction. The average training fold cross-entropy loss is 0.05 and the average validation fold loss is 0.38. Feature importance shows several noisy keywords with high importance. Which diagnosis is most likely?
    [ ] The model is underfitting and has high bias.
    [CORRECT] The model is overfitting and has high variance.
    [ ] The model is well-fitted and has low variance.
    [ ] The model is underfitting and has high variance.
- Q: You plot learning curves (error vs. training set size) for a click prediction model. The training error starts at 0.30 and slowly drops to 0.25, while the validation error declines similarly and levels off at 0.24. Even with large amounts of data, neither curve falls below 0.20. What does this pattern suggest?
    [ ] The model displays high variance and overfitting.
    [CORRECT] The model displays high bias and underfitting.
    [ ] The model displays low bias and low variance (good fit).
    [ ] The model displays both high bias and high variance.
- Q: You monitor validation loss during neural network training with early stopping. After epoch 15, training loss keeps decreasing, but validation loss begins to rise steadily. The validation loss reached its minimum at epoch 10. What best explains this behavior?
    [CORRECT] The model started overfitting after epoch 10.
    [ ] The model's capacity is too low to improve further.
    [ ] The learning rate was too low, stalling training.
    [ ] The training set is too small, causing memorization.
- Q: You estimate a regression model for customer lifetime value, with irreducible Bayes error around 2000 (MSE). After training, training MSE is 2100 and validation MSE is 2300. What inference can you draw?
    [ ] Overfitting: training error is lower than validation error.
    [CORRECT] Underfitting: both errors are high relative to Bayes error.
    [ ] Good fit: errors are close to the Bayes error lower bound.
    [ ] High variance: validation error exceeds training error.

### Expected Prediction Error Decomposition

- Q: A data scientist trains a neural net to predict customer lifetime value. She then applies bagging: she trains the model on 100 bootstrap samples and averages their predictions. The bagged model's test MSE is 2.2 and the original single model's test MSE is 2.5. She knows the irreducible noise variance is 0.9. According to the expected error decomposition, what are the approximate bias squared and variance of the original model?
    [CORRECT] Bias squared approximately 1.3 and variance approximately 0.3.
    [ ] Bias squared approximately 0.3 and variance approximately 1.3.
    [ ] Bias squared approximately 1.6 and variance approximately 0.9.
    [ ] Bias squared approximately 1.0 and variance approximately 1.5.
- Q: A digital marketer uses gradient boosting to forecast weekly sales. As she adds more boosting rounds, training error drops, but validation error eventually rises. According to the error decomposition, which component most likely increases as model complexity grows beyond the optimal point?
    [ ] Bias component
    [CORRECT] Variance component
    [ ] Irreducible noise component
    [ ] Total expected error component
- Q: A marketer wants to reduce prediction error for a churn model. She can either collect 10,000 more labeled examples, or engineer 20 new interaction features. According to the expected prediction error decomposition, which statement about the likely effects is most accurate?
    [ ] More data reduces the bias term; new features reduce the variance term.
    [CORRECT] More data reduces the variance term; new features can reduce bias but increase variance.
    [ ] Neither affects bias or variance; both change irreducible noise only.
    [ ] More data reduces irreducible noise; new features reduce bias and variance equally.
- Q: For a regression task, the expected prediction error on new data is most accurately decomposed into which three additive components?
    [CORRECT] Bias^2, variance, irreducible noise
    [ ] Bias, variance, overfitting error
    [ ] Training error, generalization gap, noise
    [ ] Bias, variance, covariance
- Q: A marketer fits a linear regression to predict ad click-through rate. She then adds many polynomial and interaction features, driving training error near zero. However, test error remains high. According to the expected prediction error decomposition, which combination best explains this?
    [ ] High bias and low variance
    [CORRECT] Low bias and high variance
    [ ] Low bias and low irreducible noise
    [ ] High bias and high irreducible noise

### Bias, Variance, and Irreducible Error

- Q: A churn prediction model consistently achieves a classification error rate of 15% on both training and validation sets, no matter how complex the model is made. The data science team has experimented with many architectures and feature combinations without improving performance. What is the most likely explanation?
    [ ] The model has high bias and needs more features
    [ ] The model has high variance and needs regularization
    [CORRECT] The irreducible error of the problem is high
    [ ] The model has low bias and low variance and is already optimal
- Q: A marketing data scientist trains a model to predict customer lifetime value and finds that both the training RMSE and the validation RMSE are high and nearly identical. After experimenting with several model complexities, the errors barely change. What does this indicate about the model's bias and variance?
    [CORRECT] High bias and low variance
    [ ] High variance and low bias
    [ ] High bias and high variance
    [ ] Low bias and low variance
- Q: A team splits a dataset into training, validation, and test sets. After extensive hyperparameter tuning on the validation set, they find the training error is 10%, the validation error is 12%, and the test error is 25%. Which conclusion best explains this discrepancy through the lens of bias and variance?
    [ ] The model suffers from high bias; the validation set is too small
    [CORRECT] The model has high variance and the validation set was overfitted during tuning
    [ ] The irreducible error of the test set is much larger than that of the training set
    [ ] There is a data leakage problem that artificially lowered the training error
- Q: A marketing team wants to reduce the variance of a gradient boosting model without significantly increasing its bias. Which action is most likely to achieve this?
    [CORRECT] Collect more training data
    [ ] Increase the number of trees
    [ ] Decrease the learning rate and add many more trees
    [ ] Apply stronger L2 regularization to the tree weights
- Q: A marketer is tuning a neural network to predict email open rates. As she increases the number of hidden layers, the training loss keeps dropping, but the validation loss stops improving and then begins to rise. What does this pattern suggest about the model's current state?
    [ ] The model has high bias; use an even larger network
    [CORRECT] The model has high variance; add more data or regularize
    [ ] The model has high irreducible error; accept the performance
    [ ] The model is underfitting; engineer more interaction features

### Impact of Model Complexity on Bias and Variance

- Q: You have trained a logistic regression model on a set of ad campaign features to predict conversion. Both training and validation accuracy are around 65%, while the random baseline is 50%. You suspect the model is underfitting. Which action directly increases model complexity to address this?
    [CORRECT] Add polynomial interaction features and switch to a deeper neural network.
    [ ] Apply L2 regularization with a higher penalty to constrain coefficients.
    [ ] Eliminate low-variance features to reduce noise.
    [ ] Use early stopping and monitor validation loss.
- Q: You are tuning an XGBoost model for a retargeting campaign. As you increase the number of estimators from 50 to 500, training error keeps dropping, but validation error first decreases then rises after 200 estimators. Based on the bias-variance tradeoff, what is the most appropriate next step regarding model complexity?
    [ ] Use 500 estimators because the training error is lowest, which signals low bias.
    [CORRECT] Revert to 200 estimators and add a regularization penalty to lower variance.
    [ ] Increase the maximum depth to allow the model to fit more complex patterns.
    [ ] Change to a linear model to take advantage of its lower variance.
- Q: You are training a neural network to predict customer churn. Your training accuracy is 98% while validation accuracy is 80%. What is the most likely issue related to model complexity, and how should you adjust it?
    [ ] High bias; add more hidden layers to increase model complexity.
    [CORRECT] High variance; reduce the number of hidden layers to decrease model complexity.
    [ ] High bias; reduce the number of hidden layers to decrease model complexity.
    [ ] High variance; add more hidden layers to increase model complexity.
- Q: You are using a support vector machine with an RBF kernel to classify high-value users. With gamma=0.01, training and validation F1 are both 0.70. With gamma=10, training F1 is 0.99 and validation F1 is 0.65. Based on the role of model complexity, what does this indicate and what should you do?
    [CORRECT] The model is overfitting at gamma=10; select a lower gamma value to reduce variance.
    [ ] The model is underfitting at gamma=0.01; increase gamma above 10 to capture more details.
    [ ] The model is robust at gamma=10; deploy it since the training performance is excellent.
    [ ] The model suffers from high bias at gamma=10; decrease gamma further to below 0.01 to generalize.
- Q: You are building a random forest model to predict email opens. With max_depth=3, both training and validation AUC are 0.75. With max_depth=None, training AUC is 0.99 and validation AUC is 0.72. Applying the bias-variance tradeoff, which conclusion is correct?
    [CORRECT] max_depth=None shows high variance; restrict max_depth to a moderate value (e.g., 5) to balance bias and variance.
    [ ] max_depth=3 suffers from high bias; set max_depth=None and gather more training data to improve validation.
    [ ] Both settings are underfitting; try a gradient boosting model instead.
    [ ] max_depth=None has high bias; reduce max_depth to prevent overfitting.

### Learning Curves for Diagnosing Bias and Variance

- Q: You are tuning an XGBoost model for ad click prediction. The learning curve shows training log-loss consistently at 0.10. Validation log-loss is 0.18 with 5,000 examples, drops to 0.14 with 50,000, and then only to 0.135 with 100,000, with little further improvement expected. The gap remains around 0.03. What is the most cost-effective next step?
    [ ] Collect more training examples.
    [CORRECT] Apply more regularization or simplify.
    [ ] Increase the learning rate significantly.
    [ ] Drop a large number of features.
- Q: A data scientist plots training accuracy and validation accuracy against training set size. Training accuracy stays at 99.9% regardless of size. Validation accuracy starts at 70% for 200 examples, rises to 85% for 2000 examples, then reaches 88% for 10,000 examples, and appears to be approaching 90% asymptotically. What does this learning curve indicate?
    [ ] High bias, the model is underfitting.
    [CORRECT] High variance, the model is overfitting.
    [ ] Good bias-variance tradeoff, near-optimal fit.
    [ ] Both high bias and high variance simultaneously.
- Q: Two decision tree models are trained: an unpruned tree and a pruned tree. Their learning curves show: unpruned: training accuracy 100% at all sizes, validation accuracy 75%, stable. Pruned: training accuracy 90%, validation accuracy 85%, stable. What do the learning curves reveal?
    [ ] High bias in unpruned tree; pruning increased it.
    [CORRECT] High variance in unpruned tree; pruning reduced it.
    [ ] High bias in both trees; pruning had no effect.
    [ ] Higher variance in pruned tree than in unpruned.
- Q: A marketer plots learning curves for a churn prediction model. The training error (cross-entropy) starts low at 0.2 with 100 examples, rises to 1.5 at 1000 examples, and stabilizes at 1.6 at 10,000. Validation error starts at 1.9 with 100 examples, drops to 1.7 at 1000, and plateaus at 1.65. What is the most likely diagnosis?
    [CORRECT] High bias, the model is underfitting.
    [ ] High variance, the model is overfitting.
    [ ] Low bias and low variance, a good fit.
    [ ] High bias and high variance together.
- Q: A logistic regression model for email open prediction yields a learning curve with training error 0.35 and validation error 0.36 at all training sizes from 500 to 50,000. Both errors are high and show no sign of decreasing. What is the most appropriate next action?
    [ ] Collect additional training examples.
    [CORRECT] Add more features to increase model complexity.
    [ ] Remove some features to simplify the model.
    [ ] Lower the learning rate to improve convergence.

### Dropout as a Regularizer for Neural Networks

- Q: A developer is choosing between dropout and L2 regularization for a fully connected neural network trained on a moderate-sized dataset. Which statement accurately contrasts the two techniques?
    [CORRECT] Dropout randomly deactivates neurons during training, creating an ensemble effect; L2 penalizes large weight values to keep them small.
    [ ] Dropout works only on hidden layers, while L2 regularization is effective only on the output layer.
    [ ] Dropout reduces the total number of trainable parameters, while L2 adds noise to the gradients during backpropagation.
    [ ] Dropout is applied during both training and inference, whereas L2 regularization is applied only during training.
- Q: A practitioner trains a large neural network for CTR prediction and adds dropout with keep probability 0.5 to fight overfitting. The validation loss improves, but the training loss becomes much higher than before. What is the most logical next step to improve overall performance?
    [CORRECT] Increase the keep probability to 0.8 to allow the model to fit the training data better while still regularizing.
    [ ] Decrease the keep probability to 0.2 to regularize more heavily and force the model to generalize even more.
    [ ] Remove dropout entirely because the higher training loss indicates that the model is now underfitting.
    [ ] Replace dropout with L2 regularization, which can reduce overfitting without noticeably increasing training loss.
- Q: Dropout is often described as training a large ensemble of sub-networks. Which consequence of this interpretation is most responsible for reducing overfitting?
    [CORRECT] It forces neurons to learn features that are useful even when other neurons are absent, reducing co-adaptation.
    [ ] It doubles the effective number of parameters by creating an ensemble, thus increasing the model's capacity.
    [ ] It acts as additive Gaussian noise on the inputs of each layer, which serves as a data augmentation method.
    [ ] It guarantees that gradient updates are always large, preventing the network from settling in sharp minima.
- Q: A data scientist adds a dropout layer with keep probability 0.5, using the inverted dropout implementation common in deep learning frameworks. How does the forward pass differ between training and inference?
    [CORRECT] During training, half the neurons are dropped and the remaining outputs are doubled; during inference, all neurons are active and unscaled.
    [ ] During training, all neurons are kept and their outputs are halved; during inference, half the neurons are randomly dropped.
    [ ] During training, half the neurons are dropped and the rest are unchanged; during inference, all weights are halved.
    [ ] During training, the dropout rate increases from 0 to 0.5 over batches; during inference, the final rate is used.
- Q: A team builds a deep net to predict rare conversions, using dropout (keep prob 0.5) to reduce overfitting. On a held-out set, AUC is slightly better but predicted probabilities are systematically underestimated for the positive class. What step directly addresses this calibration issue while preserving dropout's regularization benefit?
    [CORRECT] Apply temperature scaling on a calibration set after training to adjust the model's output probabilities.
    [ ] Lower the keep probability to 0.3 to shrink the output probabilities further, then clip predictions below 0.5.
    [ ] Switch to original dropout with weight scaling at test time to correct the probability inflation caused by inverted dropout.
    [ ] Perform inference with dropout enabled and average 100 forward passes to obtain well-calibrated probabilities.

### Early Stopping in Gradient Boosting and Neural Networks

- Q: A data scientist is building a gradient boosting model for credit scoring. She notices that the training logloss is falling rapidly while the validation logloss has been flat for the last 50 rounds, with no early stopping configured. Which approach is the most principled way to prevent overfitting and select the best iteration?
    [CORRECT] Implement early stopping when validation loss stops improving for a set number of rounds.
    [ ] Raise the learning rate to force the model to converge faster on the training data.
    [ ] Apply a heavier L1 regularization term on the tree weights.
    [ ] Replace the model with a random forest to avoid overfitting.
- Q: In XGBoost's native Python API, you set early_stopping_rounds=10 while training with a validation set. After boosting round 30, the validation logloss has not improved for the last 10 consecutive rounds. What does the training process do?
    [CORRECT] Training stops at round 30 and the best iteration is recorded as round 20.
    [ ] Training continues for 10 more rounds to confirm no further improvement.
    [ ] Training stops and the model automatically reverts to round 20's parameters.
    [ ] Training raises an EarlyStoppingWarning and continues indefinitely.
- Q: When training a deep neural network with Keras EarlyStopping configured with patience=5 and restore_best_weights=True, the validation loss reaches its minimum at epoch 15, then increases for epochs 16 through 20. What occurs at the end of epoch 20?
    [ ] Training continues because the loss only increased for five epochs.
    [CORRECT] Training stops and the model weights from epoch 15 are restored.
    [ ] Training stops and the model weights from epoch 20 are kept.
    [ ] The learning rate is halved and training continues.
- Q: You set early_stopping_rounds=20 in XGBoost. The validation AUC improves up to round 85, then declines slightly at round 90 and again at round 95. At round 100, the validation AUC is still below the best value seen. How does early stopping behave at round 100?
    [ ] Training stops because the validation metric decreased twice.
    [CORRECT] Training continues since only 15 rounds have passed since the last improvement.
    [ ] Training stops because the maximum default number of rounds is exceeded.
    [ ] Training continues while the learning rate is automatically halved.
- Q: You train a gradient boosting regressor with a validation set. The validation RMSE stops decreasing and begins to fluctuate after 150 boosting rounds, while the training RMSE continues to drop steadily. What is the most appropriate action?
    [ ] Keep adding rounds until the training RMSE also stabilizes.
    [CORRECT] Stop training at the round where validation RMSE first stopped improving.
    [ ] Reduce the number of features to force the model to simplify.
    [ ] Double the learning rate and continue training.

