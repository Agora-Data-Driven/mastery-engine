# SOURCE PACK — Machine Learning / Model Evaluation & Tuning / Classification Metrics

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Confusion Matrix: TP, TN, FP, FN   (5 questions)
2. Accuracy, Precision, Recall, and F1-Score   (5 questions)
3. ROC Curve and Area Under the Curve (AUC)   (5 questions)
4. Precision-Recall Curve for Imbalanced Data   (8 questions)
5. Threshold Tuning and Cost-Sensitive Decisions   (5 questions)

## Covered by LATER lessons — do not teach these here

- Error Analysis & Class Imbalance: Systematic Error Analysis (Per-Class FP/FN Patterns), Data Augmentation and Feature Engineering from Error Insights, Class Imbalance: Undersampling, Oversampling, and SMOTE, Cost-Sensitive Learning and Threshold Adjustment, Ceiling Analysis to Prioritize Improvements
- Bias-Variance & Regularization: Underfitting vs Overfitting Identification, Expected Prediction Error Decomposition, Bias, Variance, and Irreducible Error, Impact of Model Complexity on Bias and Variance, Learning Curves for Diagnosing Bias and Variance, Dropout as a Regularizer for Neural Networks, Early Stopping in Gradient Boosting and Neural Networks
- Cross-Validation & Hyperparameter Tuning: Validation Curves to Tune a Hyperparameter, k-Fold Cross-Validation, Stratified k-Fold for Classification, Grid Search and Random Search, Nested Cross-Validation for Unbiased Evaluation

## The live quiz bank for these topics — 28 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Confusion Matrix: TP, TN, FP, FN

- Q: An online retailer builds a classification model that predicts whether a site visitor will make a purchase (positive class). The marketing team shows a discount offer only to visitors predicted to buy. After the campaign, they see that 340 visitors who actually made a purchase had been correctly shown the offer. These 340 visitors are:
    [CORRECT] True Positives (TP)
    [ ] True Negatives (TN)
    [ ] False Positives (FP)
    [ ] False Negatives (FN)
- Q: An e-commerce platform uses a model to flag possible fraudulent orders (positive class). The fraud team reviews all flagged orders. To reduce unnecessary delays for legitimate customers, the team adjusts the model's classification threshold so that fewer genuine orders are incorrectly flagged. Assuming the adjustment works as intended, which confusion matrix category will show a lower count?
    [ ] True Positives (TP)
    [ ] True Negatives (TN)
    [CORRECT] False Positives (FP)
    [ ] False Negatives (FN)
- Q: A subscription service uses a churn prediction model where churn is the positive class. A loyal customer who does not churn is correctly classified as not churning by the model. This correct prediction corresponds to which confusion matrix cell?
    [ ] True Positive (TP)
    [CORRECT] True Negative (TN)
    [ ] False Positive (FP)
    [ ] False Negative (FN)
- Q: A credit card issuer uses a fraud model where fraudulent transactions are the positive class. A fraudulent transaction of 1200 USD is not flagged by the model and goes through without alerting the fraud team. In the confusion matrix, this transaction is a:
    [ ] True Positive (TP)
    [ ] True Negative (TN)
    [ ] False Positive (FP)
    [CORRECT] False Negative (FN)
- Q: An email provider uses a machine learning model that classifies emails as spam (positive class). A marketing newsletter from a trusted brand is accidentally sent to the spam folder. Which confusion matrix term best describes this outcome?
    [ ] True Positive (TP)
    [ ] True Negative (TN)
    [CORRECT] False Positive (FP)
    [ ] False Negative (FN)

### Accuracy, Precision, Recall, and F1-Score

- Q: An auto-complete suggestion model currently shows high precision but low recall, missing many relevant queries. The team lowers the confidence threshold for displaying suggestions. What is the expected effect on the metrics?
    [CORRECT] Explain how recall rises, precision tends to drop, and F1 may initially climb.
    [ ] Explain how recall rises, precision remains unchanged, and F1 always improves.
    [ ] Explain how precision rises, recall drops, and F1 always falls.
    [ ] Explain how both precision and recall drop, so F1 decreases.
- Q: A medical screening model must not miss true disease cases (high recall) while still minimizing unnecessary follow-up procedures from false alarms. To choose a decision threshold that balances these goals with an emphasis on recall, which metric should the team maximize?
    [CORRECT] Maximize the F2-score to give recall twice the weight of precision.
    [ ] Maximize the F1-score to treat precision and recall identically.
    [ ] Maximize overall accuracy to account for all correct predictions.
    [ ] Maximize the ROC-AUC to capture performance across all thresholds.
- Q: A fraud detection system flags transactions as fraudulent (positive class). Only 0.1% of transactions are fraudulent. The model outputs no positive predictions, labeling every transaction as non-fraudulent. How should its performance be described?
    [CORRECT] State that accuracy is nearly 100% while recall is 0%.
    [ ] State that precision is nearly 100% while recall is 0%.
    [ ] State that recall is nearly 100% while accuracy is 0%.
    [ ] State that F1-score is nearly 100% while accuracy is low.
- Q: A marketing team evaluates two churn prediction models. Model A achieves precision 0.80 and recall 0.60. Model B achieves precision 0.60 and recall 0.80. What can be concluded about their F1-scores?
    [ ] Identify that Model A has a higher F1-score.
    [ ] Identify that Model B has a higher F1-score.
    [CORRECT] Identify that both models have the same F1-score.
    [ ] Identify that the provided data is insufficient for F1.
- Q: A sentiment classifier is evaluated on a dataset with three classes: positive (15% of data), neutral (80%), and negative (5%). The model performs perfectly on neutral but poorly on positive and negative. Which metric would most clearly expose the model's weakness on the rare classes?
    [CORRECT] Report macro-averaged F1 to equally weight each class.
    [ ] Report micro-averaged F1 to count every prediction equally.
    [ ] Report weighted F1, weighting each class by its prevalence.
    [ ] Report accuracy, because it reflects overall correctness.

### ROC Curve and Area Under the Curve (AUC)

- Q: A data scientist shows you the ROC curve for a model forecasting customer churn. The curve hugs the upper‑left corner, with an AUC of 0.97. What does this tell you about the model?
    [ ] It has a very low false positive rate.
    [ ] It is well‑calibrated across all probability thresholds.
    [CORRECT] It separates the two outcome classes very effectively.
    [ ] It delivers high precision at any recall level.
- Q: You train two click prediction models: Model A (AUC 0.85) and Model B (AUC 0.75). Based only on AUC, which statement is correct?
    [ ] Model A will always have higher accuracy at any threshold.
    [ ] Model B will detect more clicks (higher recall).
    [CORRECT] Model A has a greater ability to rank clickers above non‑clickers.
    [ ] Model B has a lower false positive rate across all thresholds.
- Q: The ROC curve of a retargeting model rises sharply to a TPR of 0.9 while FPR stays below 0.05, then levels off. Your team wants to maximize profit, and false positives cost 20 times more than false negatives. Which threshold selection strategy should you apply?
    [ ] Choose the point closest to (0,1) to maximize discrimination.
    [ ] Pick the threshold where TPR is highest, ignoring FPR.
    [CORRECT] Select a threshold with very low FPR, sacrificing some TPR.
    [ ] Use Youden’s index to balance sensitivity and specificity.
- Q: Your team is comparing two lead‑scoring models: Model X (AUC 0.92) and Model Y (AUC 0.88). At the target 80% recall, Model Y achieves higher precision. Which conclusion is best?
    [ ] Model X is better because AUC is higher.
    [CORRECT] Model Y is better at the desired recall level.
    [ ] AUC alone determines which model is best.
    [ ] Model Y has a lower false positive rate overall.
- Q: An e‑commerce fraud detection model has only 0.1% positive cases. A colleague suggests evaluating it with the ROC curve and AUC. What should you recommend?
    [ ] Use the ROC curve; it is the usual choice for classification.
    [CORRECT] Use a precision‑recall curve; it suits imbalanced data better.
    [ ] Calculate accuracy on the test set to measure performance.
    [ ] Balance the data with oversampling and then compute AUC.

### Precision-Recall Curve for Imbalanced Data

- Q: A lead scoring model operates on a highly imbalanced dataset with a 2% conversion rate. The team initially sets a threshold that yields a precision of 0.15 and a recall of 0.40. They then deploy an improved model that, at the exact same recall of 0.40, achieves a precision of 0.25. Assuming the set of actual positive leads remains unchanged, what is the most likely effect on the number of true positives and false positives?
    [CORRECT] True positives stay the same; false positives decrease.
    [ ] True positives increase; false positives stay the same.
    [ ] True positives decrease; false positives increase.
    [ ] Both true positives and false positives increase.
- Q: Two models are built for churn prediction on a dataset where 5% of customers churn. Model A has an area under the precision-recall curve (AUC-PR) of 0.25; its precision never exceeds 0.10 for any recall. Model B has an AUC-PR of 0.60; its precision is 0.90 at recall 0.3 and 0.40 at recall 0.8. Which conclusion is most justified from these precision-recall characteristics?
    [CORRECT] Model B is clearly superior because its AUC-PR is much higher.
    [ ] Model A may be a better choice if the business demands very high recall.
    [ ] Model B will always show higher precision than Model A at any chosen recall.
    [ ] Model A's low AUC-PR only matters when the target class proportion changes.
- Q: A marketer working on a rare-event classification problem with a 1% positive class plots the precision-recall curve of a model. The curve stays nearly flat and horizontal, hovering around precision = 0.01 for all recall values. What does this pattern most likely indicate about the model?
    [CORRECT] The model performs no better than random guessing.
    [ ] The model is perfectly calibrated and highly accurate.
    [ ] The model achieves very high precision across all thresholds.
    [ ] The model is overfitting the minority class examples.
- Q: A fraud model is evaluated at two thresholds. At threshold $0.5$: $TP = 40$, $FP = 10$, $FN = 60$. At a lowered threshold $0.3$: $TP = 70$, $FP = 45$, $FN = 30$. Compute precision and recall at each threshold. How did they move when the threshold was lowered?
    [CORRECT] Recall rose from $0.40$ to $0.70$, while precision fell from $0.80$ to about $0.61$
    [ ] Recall fell from $0.70$ to $0.40$, while precision rose from $0.61$ to about $0.80$
    [ ] Recall rose from $0.40$ to $0.70$, while precision rose from $0.80$ to about $0.88$
    [ ] Recall stayed fixed at $0.70$, while precision fell from $0.80$ to about $0.61$
- Q: A fraud-detection team keeps their trained classifier fixed and lowers the decision threshold from $0.5$ to $0.3$. A colleague claims this move was chosen to increase both recall and precision at the same time. Why can this claim not hold for the fixed model?
    [CORRECT] A threshold change only moves the operating point along the existing PR curve; lifting both metrics requires a better model that shifts the curve.
    [ ] A threshold change moves the entire PR curve outward for the fixed model, so both metrics will eventually rise together as recall grows.
    [ ] Precision rises alongside recall because capturing more true positives always reduces the number of false positives in the denominator.
    [ ] Both metrics improve together whenever the classifier is retrained longer on the same data, so the colleague simply needs more epochs.
- Q: A fraud detection system uses a model trained on transactions with only 0.2% fraud. At the current operating threshold, the precision-recall curve shows a precision of 0.60 and a recall of 0.30. The risk team decides to lower the classification threshold to catch more fraud cases, even if that means more false positives. What is the most likely trade-off this adjustment creates?
    [CORRECT] Recall will increase and precision will decrease.
    [ ] Recall will decrease and precision will increase.
    [ ] Both recall and precision will increase.
    [ ] Both recall and precision will decrease.
- Q: A digital advertiser builds a click prediction model on a dataset with a 0.5% click-through rate. She evaluates the model using both the ROC curve and the precision-recall curve. The ROC AUC is 0.95, but the precision-recall AUC is only 0.15. Which interpretation best explains this performance pattern?
    [ ] The model is excellent because a high ROC AUC always signals strong performance on rare events.
    [CORRECT] The high ROC AUC is largely driven by the huge number of true negatives, while the low PR AUC reveals the model struggles to select high-probability clicks.
    [ ] The model must have very high precision at a recall of 0.15, explaining the low PR AUC.
    [ ] The PR AUC will automatically rise to match the ROC AUC if the dataset is resampled to have balanced classes.
- Q: A company runs a spam filter where a false positive is very costly: a legitimate email sent to the spam folder can mean a missed contract. To reduce false positives, the team raises the classification threshold, so the model must be more confident before labeling an email as spam. For the same fixed model, which outcome is most likely?
    [ ] More emails get flagged as spam, so recall rises while precision falls.
    [CORRECT] Fewer emails get flagged as spam, so precision rises while recall falls.
    [ ] Both precision and recall rise, because the filter becomes stricter.
    [ ] Both precision and recall fall, because fewer spam emails are caught.

### Threshold Tuning and Cost-Sensitive Decisions

- Q: An e-commerce site uses a fraud detection model. Historical data shows 0.2 percent of transactions are fraudulent. Missing a fraud costs 400 dollars; blocking a legitimate transaction costs 15 dollars in lost sales. The model's probabilities are calibrated. The team evaluates two thresholds: Threshold X gives recall 0.8 and precision 0.1, while Threshold Y gives recall 0.4 and precision 0.6. Which threshold yields a lower expected total cost per transaction?
    [CORRECT] Threshold X has a lower expected cost.
    [ ] Threshold Y has a lower expected cost.
    [ ] Both thresholds have equal expected cost.
    [ ] The total number of transactions is required to decide.
- Q: A subscription business trains a model to predict churn. Sending a retention offer to a non-churner costs 5 dollars; losing a churner costs 100 dollars. The model outputs a churn probability for each customer. What is the most effective way to choose the classification threshold?
    [ ] Set the threshold to 0.5 because the model is well-calibrated.
    [ ] Lower the threshold until the recall reaches 0.90.
    [CORRECT] Choose the threshold that maximizes total profit given the misclassification costs.
    [ ] Raise the threshold to eliminate false positives.
- Q: A marketing team sends promotional emails to users predicted to convert. Without the email, a conversion generates a net profit of 5 dollars; the email costs 0.20 dollars per recipient and is known to increase the user's baseline conversion probability by 20 percent (from p to 1.2p). The model provides well-calibrated baseline conversion probabilities. To maximize expected profit, the team should target users whose predicted baseline probability exceeds which value?
    [ ] 0.04
    [CORRECT] 0.20
    [ ] 0.50
    [ ] 0.80
- Q: A healthcare provider implements a screening test for a serious disease. A false negative (missing the disease) has severe health consequences; a false positive leads to a follow-up appointment costing 200 dollars and minor anxiety. The disease prevalence is low. Which approach to setting the test's threshold is most appropriate for cost-sensitive decision making?
    [ ] Set the threshold at 0.5 to achieve balanced accuracy.
    [CORRECT] Choose a low threshold to maximize recall and use a confirmatory test for positives.
    [ ] Maximize the F1 score to balance false positives and false negatives.
    [ ] Select the threshold where the ROC curve is nearest to the top-left corner.
- Q: A digital advertising team uses a model to predict click probability. Showing an ad to a user costs 0.10 dollars; a click generates 2.00 dollars revenue. They need to set a probability threshold to decide which users to target. Which method is most appropriate?
    [ ] Select the threshold that yields an F1 score of 0.9.
    [ ] Set the threshold to 0.5 to balance precision and recall.
    [CORRECT] Calculate expected profit per impression for each threshold and choose the highest.
    [ ] Minimize the false positive rate to reduce wasted ad impressions.

