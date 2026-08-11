# SOURCE PACK — Machine Learning / Model Evaluation & Tuning / Error Analysis & Class Imbalance

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Systematic Error Analysis (Per-Class FP/FN Patterns)   (5 questions)
2. Data Augmentation and Feature Engineering from Error Insights   (5 questions)
3. Class Imbalance: Undersampling, Oversampling, and SMOTE   (5 questions)
4. Cost-Sensitive Learning and Threshold Adjustment   (5 questions)
5. Ceiling Analysis to Prioritize Improvements   (5 questions)

## Already taught earlier in this course

- Confusion Matrix: TP, TN, FP, FN
- Accuracy, Precision, Recall, and F1-Score
- ROC Curve and Area Under the Curve (AUC)
- Precision-Recall Curve for Imbalanced Data
- Threshold Tuning and Cost-Sensitive Decisions

## Covered by LATER lessons — do not teach these here

- Bias-Variance & Regularization: Underfitting vs Overfitting Identification, Expected Prediction Error Decomposition, Bias, Variance, and Irreducible Error, Impact of Model Complexity on Bias and Variance, Learning Curves for Diagnosing Bias and Variance, Dropout as a Regularizer for Neural Networks, Early Stopping in Gradient Boosting and Neural Networks
- Cross-Validation & Hyperparameter Tuning: Validation Curves to Tune a Hyperparameter, k-Fold Cross-Validation, Stratified k-Fold for Classification, Grid Search and Random Search, Nested Cross-Validation for Unbiased Evaluation

## The live quiz bank for these topics — 25 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Systematic Error Analysis (Per-Class FP/FN Patterns)

- Q: A binary classifier achieves 95% accuracy on a test set where class 0 makes up 90% of the samples. Per-class error analysis reveals FP = 50 and FN = 0. What conclusion is BEST justified by this pattern alone?
    [ ] The model predicts the minority class too aggressively, sacrificing precision on the majority class.
    [ ] The high accuracy confirms the model has learned meaningful features for both classes.
    [CORRECT] The model defaults to predicting the majority class, never identifying the minority class.
    [ ] The zero FN indicates perfect recall, so the model is suitable for minority-class detection.
- Q: You train a binary classifier for medical screening and obtain the following per-class error counts on a validation set of 200 patients (100 healthy, 100 diseased): among healthy patients, FP = 5; among diseased patients, FN = 20. You can reduce exactly one error type by half. Which reduction MOST improves the model’s recall?
    [CORRECT] Reduce FN from 20 to 10 among diseased patients.
    [ ] Reduce FP from 5 to 2 or 3 among healthy patients.
    [ ] Reduce FN from 20 to 10 among healthy patients.
    [ ] Reduce FP from 5 to 2 or 3 among diseased patients.
- Q: You analyze per-class errors for a loan-default classifier and find that FP (predict default when the customer would repay) is concentrated among applicants with income below $30,000, while FN is uniformly distributed across income brackets. Which fairness concern does this pattern raise?
    [CORRECT] The model systematically denies credit to a protected low-income subgroup despite their actual ability to repay.
    [ ] The model approves too many high-risk applicants uniformly, increasing lender losses across all income levels.
    [ ] The uniform FN distribution indicates the model is unbiased because errors affect all groups equally.
    [ ] The concentration of FP in one income band is expected because default rates are naturally higher there.
- Q: Consider a neural network trained for image classification with class A and class B. The validation confusion matrix shows: A predicted as A = 90, A predicted as B = 10, B predicted as A = 30, B predicted as B = 70. If you must improve precision for class B without reducing its recall, which strategy is MOST directly supported by this per-class error pattern?
    [ ] Adjust the decision threshold to require higher confidence for predicting class B.
    [CORRECT] Collect more training examples of class A to reduce confusion from A to B.
    [ ] Oversample class B during training to balance the total instances per class.
    [ ] Lower the decision threshold for class A to capture more true positives of A.
- Q: A spam filter has a high false positive rate on legitimate promotional emails and a low false negative rate on actual spam. The team notices that promotional emails often contain phrases like 'limited offer' that overlap with spam vocabulary. What does this per-class FP/FN pattern MOST directly suggest about the feature representation?
    [CORRECT] Features that separate classes in training fail to generalize to the legitimate promotional subgroup.
    [ ] The model has overfit to spam keywords, causing low FN but excessive FP on promotional mail.
    [ ] The class imbalance in training caused the decision boundary to shift toward the spam class.
    [ ] The FN rate is misleading because the test set underrepresents certain spam subtypes.

### Data Augmentation and Feature Engineering from Error Insights

- Q: You train a neural network on a small dataset of medical images and notice the validation accuracy is much worse than training accuracy. Which action is the MOST direct application of the core idea behind data augmentation to address this specific discrepancy?
    [CORRECT] Apply random rotations, zooms, and flips to the training images to generate additional varied examples.
    [ ] Collect new patient images from the hospital to increase the total size of the original dataset.
    [ ] Add more layers to the network so it can learn more complex patterns from the existing images.
    [ ] Reduce the number of training epochs to stop the model before it memorizes the training set noise.
- Q: You are building a model to classify handwritten digits. Error analysis on a digit '3' that is consistently misclassified as '8' shows the digit is written with a slight clockwise rotation. Which engineered feature or augmentation directly targets this pattern?
    [CORRECT] Introduce small random rotations within ±15 degrees in the training data generation.
    [ ] Extract the Hough line transform features from each image and append them to the raw pixels.
    [ ] Apply min-max scaling to each pixel so the intensity range becomes uniform across samples.
    [ ] Train a secondary model to predict the rotation angle and use it to pre-process all test images.
- Q: An error analysis reveals your image classifier has high false negatives for 'cat' when the cat is partially occluded. You decide to engineer a new training pipeline step. Which choice correctly connects the error insight to a feature engineering or augmentation fix?
    [CORRECT] Insert a random crop and partial masking step into the data loader before training.
    [ ] Train a separate binary classifier to detect occluded cats before the main model runs.
    [ ] Increase the weight of the 'cat' class in the loss function by a factor proportional to its error rate.
    [ ] Collect images from a different domain, such as sketches, to make the dataset more diverse.
- Q: You perform a systematic error analysis and find that a model trained on daytime street scenes has high false positives for 'pedestrian' on nighttime images. Which augmentation strategy targets the root cause of this error?
    [CORRECT] Apply brightness and contrast adjustments during training to simulate varied lighting conditions.
    [ ] Increase the model capacity by doubling the number of filters in each convolutional layer.
    [ ] Use k-means clustering on pixel values to separate daytime from nighttime test instances.
    [ ] Add a post-processing rule that suppresses pedestrian predictions if the image is too dark.
- Q: A speech recognition model performs poorly on utterances with background cafe noise. Your systematic error analysis confirms high false negatives for specific words in noisy conditions. What direct change to the training setup best uses this insight?
    [CORRECT] Mix the original clean audio samples with recorded cafe noise at varying signal-to-noise ratios.
    [ ] Generate text transcripts of the cafe noise segments and add them to the language model vocabulary.
    [ ] Apply dropout to the acoustic model layers to make the model more robust to input perturbations.
    [ ] Retrain the model exclusively on the noisy subset where errors were most frequent.

### Class Imbalance: Undersampling, Oversampling, and SMOTE

- Q: A data scientist applies random undersampling by removing majority class examples until the classes are balanced. The original majority class had 10,000 examples with a feature distribution that is approximately normal. After undersampling to 100 examples, which statement about the sampled feature distribution is correct?
    [ ] The distribution remains exactly normal with the same mean and variance as the original 10,000 examples
    [CORRECT] The distribution shape approximates the original but may have different sample statistics due to the reduced sample size
    [ ] The distribution becomes uniform because undersampling eliminates the tails of the normal distribution
    [ ] The distribution shifts to match the minority class distribution, introducing systematic bias
- Q: You apply SMOTE to a binary classification dataset. For a chosen minority example $x$, the algorithm randomly selects one of its $k$ nearest minority neighbors, $x_{nn}$, and creates a synthetic example. Which expression describes the synthetic example?
    [ ] $x_{new} = x + \lambda \cdot x_{nn}$ where $\lambda$ is a random number in $[0,1]$
    [CORRECT] $x_{new} = x + \lambda \cdot (x_{nn} - x)$ where $\lambda$ is a random number in $[0,1]$
    [ ] $x_{new} = \lambda \cdot x + (1 - \lambda) \cdot x_{nn}$ where $\lambda$ is a random number in $[0,0.5]$
    [ ] $x_{new} = x_{nn} + \lambda \cdot (x - x_{nn})$ where $\lambda$ is a random number in $[-1,1]$
- Q: You train a classifier on an imbalanced dataset where the minority class appears 1% of the time. On a balanced test set (50% positive), the model achieves 90% recall but only 10% precision. What is the most likely explanation for this combination of metrics?
    [ ] The model has overfit to the minority class due to aggressive oversampling during training
    [CORRECT] The model is predicting the positive class too frequently, causing many false positives
    [ ] The model is predicting the positive class too rarely, causing many false negatives
    [ ] The model has learned a decision boundary that perfectly separates the two classes
- Q: You have a dataset with a severe class imbalance (5% positive class). You need to evaluate multiple model configurations and want your validation strategy to give a reliable estimate of performance on future imbalanced data. Which combination of techniques is most appropriate?
    [ ] Apply SMOTE to the entire dataset, then perform standard k-fold cross-validation
    [ ] Perform stratified k-fold cross-validation and compute the precision-recall AUC for each fold
    [CORRECT] Use random undersampling on the training folds only, and evaluate on the original imbalanced validation fold
    [ ] Oversample the minority class in both training and validation folds to ensure balanced evaluation
- Q: You have a binary classification training set with 990 majority examples and 10 minority examples. You decide to apply random oversampling of the minority class until the classes are perfectly balanced. After this procedure, what is the total number of training examples, and what is the primary risk this introduces?
    [CORRECT] 1980 examples; the model may memorize repeated minority examples and overfit to them
    [ ] 1980 examples; the model will struggle because the effective sample size has not increased
    [ ] 20 examples; the model may lose important information from the majority class
    [ ] 20 examples; the model will become biased toward the minority class during inference

### Cost-Sensitive Learning and Threshold Adjustment

- Q: A bank has a credit-scoring logistic regression model. The current threshold of $0.5$ yields a confusion matrix with $TP = 85$, $TN = 400$, $FP = 100$, $FN = 15$. If the bank lowers the decision threshold, what would be the most likely immediate effect on the precision and recall of the positive class?
    [CORRECT] Precision decreases and recall increases
    [ ] Precision increases and recall decreases
    [ ] Precision decreases and recall decreases
    [ ] Precision increases and recall increases
- Q: You are building a medical screening classifier. The prevalence of the disease in the screened population is 1 in 10,000. A false negative is deemed 50,000 times more costly than a false positive. You decide to adjust the decision threshold. Which of the following threshold values would be most appropriate to minimize the expected cost?
    [CORRECT] A threshold near $0.00002$
    [ ] A threshold near $0.0001$
    [ ] A threshold near $0.5$
    [ ] A threshold near $0.9999$
- Q: An email spam filter outputs a probability $p$ that a message is spam. The company's acceptable false-positive rate (legitimate mail sent to spam) is at most 0.2%, regardless of the false-negative rate. The development team computes a precision-recall curve and an ROC curve. To select a threshold that guarantees the false-positive rate constraint, which metric should they directly control when choosing the cut-off?
    [CORRECT] Set the threshold by finding the $p$ that yields $FPR = 0.002$
    [ ] Set the threshold by finding the $p$ that yields $FNR = 0.002$
    [ ] Set the threshold by finding the $p$ that yields $TNR = 0.002$
    [ ] Set the threshold by finding the $p$ that yields $TPR = 0.002$
- Q: You train a model to predict customer churn and obtain a predicted probability $p$ for each customer. The cost of offering a retention incentive to a customer who would not have churned is \$50 (FP). The cost of losing a customer who actually churns is \$500 (FN). You use the threshold $t^* = \frac{\$50}{\$50 + \$500} \approx 0.091$. What is the correct interpretation of predicting churn for a customer whose $p = 0.15$?
    [CORRECT] Predict churn, because 0.15 exceeds the optimal threshold
    [ ] Predict no churn, because 0.15 is less than the default 0.5
    [ ] Predict no churn, because 0.15 is below the optimal threshold
    [ ] Predict churn, because 0.15 is above the base rate
- Q: A model predicts the probability that a transaction is fraudulent. The average cost of failing to detect a real fraud case (a false negative) is \$500, while the cost of incorrectly flagging a legitimate transaction (a false positive) is \$10. The transaction base rate is 2% fraudulent. Using the cost-based threshold formula $t = \frac{C_{\text{FP}}}{C_{\text{FP}} + C_{\text{FN}}}$, what probability threshold should the model use to minimize the total expected cost?
    [CORRECT] Approximately $0.0196$
    [ ] Approximately $0.0200$
    [ ] Approximately $0.5000$
    [ ] Approximately $0.9800$

### Ceiling Analysis to Prioritize Improvements

- Q: You are conducting ceiling analysis on an ML pipeline that includes a preprocessing step P and a model step M. You compute four F1 scores: baseline $F1_{\text{base}}$, $F1_{\text{P-perfect}}$, $F1_{\text{M-perfect}}$ (M perfect, P still predicted), and $F1_{\text{both-perfect}}$. What does the difference $F1_{\text{P-perfect}} - F1_{\text{base}}$ represent?
    [CORRECT] The maximum improvement attainable by perfecting preprocessing alone, assuming the model remains unchanged.
    [ ] The total pipeline error attributable to preprocessing, including interactions where the model compounds preprocessing failures.
    [ ] The isolated contribution of the model, since improving preprocessing exposes the model's true performance ceiling.
    [ ] The irreducible error remaining in the pipeline after preprocessing is made perfect and the model is optimized.
- Q: You are building a pipeline with a text detection model followed by a text recognition model. After running ceiling analysis, you find that swapping the ground-truth bounding boxes into the detection step improves overall pipeline F1 from 0.74 to 0.88, while swapping ground-truth text transcripts into the recognition step improves it from 0.74 to 0.82. Both swaps together raise F1 to 0.99. Based on this, improving which component offers the greatest potential gain?
    [CORRECT] The detection model, because its isolated ceiling gain (0.14) exceeds the recognition model's isolated gain (0.08).
    [ ] The detection model, because swapping ground-truth boxes improves F1 by 0.14, while recognition only improves it by 0.08.
    [ ] The recognition model, because the gap from 0.88 to 0.99 shows its remaining contribution of 0.11 after detection is perfect.
    [ ] Both models equally, because each component’s isolated improvement is within a few percentage points of the other.
- Q: You perform ceiling analysis on a pipeline with three sequential components A, B, and C. Ground-truth is injected at each stage. Which sequence of F1 scores would indicate that component B is the primary bottleneck?
    [CORRECT] Baseline 0.70; A perfect 0.76; A+B perfect 0.92; all perfect 0.97.
    [ ] Baseline 0.70; A perfect 0.89; A+B perfect 0.91; all perfect 0.96.
    [ ] Baseline 0.70; A perfect 0.85; A+B perfect 0.87; all perfect 0.94.
    [ ] Baseline 0.70; A perfect 0.93; A+B perfect 0.94; all perfect 0.95.
- Q: A developer identifies that the current pipeline's strongest bottleneck is a vision module. She plans to spend three weeks collecting more training images. What is the most rigorous justification for using ceiling analysis to support this decision?
    [CORRECT] Ceiling analysis quantifies how much overall performance would rise if that module were perfect, estimating the return on improving it.
    [ ] Ceiling analysis confirms that vision modules always benefit most from additional data compared to other component types.
    [ ] Ceiling analysis isolates which module has the lowest F1 score, revealing where the absolute error count is highest.
    [ ] Ceiling analysis validates that the current training set is insufficient by comparing its size to a recommended minimum.
- Q: A team runs ceiling analysis on a pipeline. After replacing component X's output with ground truth, F1 jumps from 0.68 to 0.91. They conclude X must be the bottleneck. Which of the following is the strongest counterargument?
    [CORRECT] A large ceiling gain for X does not rule out that later components also have substantial room for improvement.
    [ ] The metric used was F1 rather than accuracy, so the gain may be inflated due to class imbalance in the dataset.
    [ ] Ceiling analysis cannot isolate errors when components are arranged sequentially rather than in parallel.
    [ ] If X were truly the bottleneck, the jump would have approached 1.0 rather than stopping at 0.91.

