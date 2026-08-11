# SOURCE PACK — Machine Learning / Supervised Machine Learning / Classification & Regularized Linear Models

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Limitations of Linear Regression for Classification   (17 questions)
2. Logistic Regression   (18 questions)
3. Decision Boundary   (13 questions)
4. L2 (Ridge) Regularization for Linear and Logistic Regression   (5 questions)
5. L1 (Lasso) Regularization and Feature Sparsity   (5 questions)
6. Elastic Net Regularization   (5 questions)

## Already taught earlier in this course

- Derivatives and Gradient Descent Intuition
- Gradient Descent
- Learning Rate and Convergence
- Batch Gradient Descent
- Gradient Descent for Multiple Linear Regression
- Normal Equation vs. Gradient Descent

## Covered by LATER lessons — do not teach these here

- Support Vector Machines: Core Idea of Support Vector Machines, The Kernel Trick, When to Use SVMs: Strengths and Limitations
- Linear Regression & Cost Functions: Linear Regression Model, Cost Function and Squared Error, Visualizing the Cost Function, Cost Function Intuition and Model Fit, Why Linear Regression’s Cost Function Has a Global Minimum, Multiple Linear Regression

## The live quiz bank for these topics — 63 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Limitations of Linear Regression for Classification

- Q: A data scientist uses linear regression with a 0.5 threshold to classify tumors as malignant (1) or benign (0). After adding one more benign tumor with a very large size, the model's decision boundary shifts significantly. What does the source material say about this outcome?
    [CORRECT] It proves linear regression is unsuitable for classification due to outlier sensitivity.
    [ ] It indicates the threshold should be increased to compensate for the new data.
    [ ] It shows linear regression requires many more examples to be accurate for classification.
    [ ] It suggests the problem requires a different threshold or feature scaling.
- Q: Consider a linear decision boundary $\theta_0 + \theta_1 x_1 + \theta_2 x_2 = 0.5$. A point lies exactly on this boundary. How does the classification outcome for this point compare between linear regression with a 0.5 threshold and logistic regression with a 0.5 probability threshold?
    [CORRECT] Both models classify the point as positive by convention at the threshold.
    [ ] Linear regression classifies it as negative, logistic regression as positive.
    [ ] Linear regression classifies it as positive, logistic regression as negative.
    [ ] Both models reject the point as unclassifiable and require manual review.
- Q: Which of the following best describes the naming of logistic regression as presented in the source?
    [ ] It is called regression because it predicts a continuous value that is then thresholded.
    [CORRECT] It is called logistic regression for historical reasons, even though it is used for classification.
    [ ] It is called regression because it is derived from linear regression.
    [ ] It is called logistic regression to distinguish it from linear regression.
- Q: In binary classification, what do the terms "negative class" and "positive class" refer to according to the source?
    [ ] The negative class always represents absence of a condition, the positive class its presence.
    [CORRECT] The negative class is typically labeled 0 and the positive class labeled 1.
    [ ] The positive class is always the "yes" answer and the negative class the "no" answer.
    [ ] The terms negative and positive indicate whether the outcome is harmful or beneficial.
- Q: In binary classification, which of the following is a common way to represent the two possible output values?
    [CORRECT] 0 and 1
    [ ] -1 and +1
    [ ] 0 and 100
    [ ] 1 and 2
- Q: A dataset combines two types of inputs: a continuous feature $x_1$ representing account age in months, and a binary feature $x_2$ indicating whether the customer has a premium plan (1 if yes, 0 if no). The goal is to predict churn (1 if churns, 0 if not). Which of the following correctly describes how linear regression uses both input types to produce a classification decision?
    [CORRECT] Both $x_1$ and $x_2$ are multiplied by learned coefficients and summed; the binary input simply shifts the output by a constant when activated.
    [ ] Linear regression cannot process binary inputs directly; $x_2$ must be converted to a continuous value through one-hot encoding.
    [ ] The binary input $x_2$ is used only in the threshold step, while the continuous input $x_1$ determines the regression line.
    [ ] Linear regression treats both inputs identically as continuous variables; the binary nature of $x_2$ causes the model to produce invalid predictions.
- Q: What is the range of output values of the sigmoid function used in logistic regression?
    [ ] Between -1 and 1.
    [CORRECT] Between 0 and 1.
    [ ] Between 0 and infinity.
    [ ] Between negative infinity and positive infinity.
- Q: A model is fit to predict whether a loan applicant will default (1) or not (0) using annual income ($x_1$) and credit score ($x_2$). The model is $\hat{y} = 0.0003x_1 - 0.01x_2 + 1.2$. For an applicant with an income of \$40,000 and a credit score of 700, the raw output is 6.2. After applying a sigmoid transformation, the predicted probability is approximately 0.998. Which of the following best explains why the raw linear model can produce values like 6.2, and what the sigmoid resolves?
    [CORRECT] Linear regression gives unbounded outputs; the sigmoid squashes them into a valid probability range.
    [ ] Linear regression is designed for negative values only; the sigmoid translates outputs into positive numbers.
    [ ] Linear regression always gives outputs between 0 and 1; the sigmoid corrects errors from outlier distortion.
    [ ] Linear regression gives probabilities that are too small; the sigmoid amplifies them for binary decisions.
- Q: A student trains a linear regression model for classification and notices that the cost function $J(\theta) = \frac{1}{2m}\sum_{i=1}^{m}(h_\theta(x^{(i)}) - y^{(i)})^2$ decreases steadily during gradient descent. The model achieves 85% accuracy on a balanced test set. A colleague argues that despite the high accuracy, the cost function is inappropriate for classification. Which statement provides the strongest justification for the colleague's claim?
    [ ] The squared error cost penalizes predictions far from 0 or 1 quadratically, creating a non-convex optimization problem with many bad local minima.
    [CORRECT] The squared error cost treats a prediction of 0.4 for a positive example as equally wrong as a prediction of 0.6, even though one leads to a correct classification.
    [ ] The squared error cost cannot be differentiated when predictions reach exactly 0 or 1, which causes gradient descent to halt prematurely.
    [ ] The squared error cost assumes outputs are Gaussian-distributed, which is violated for binary labels that follow a Bernoulli distribution.
- Q: A dataset for classifying emails as spam (1) or ham (0) uses a feature $x_1$ representing the number of exclamation marks. A linear regression model trained on this data gives $\hat{y} = 0.03x_1 + 0.1$. For an email with 30 exclamation marks, $\hat{y} = 1.0$. For an email with 50 exclamation marks, $\hat{y} = 1.6$. Which of the following describes a fundamental disadvantage of this model for classification, even if a threshold is set correctly?
    [CORRECT] The model cannot express that both emails should have similar high probabilities of being spam.
    [ ] The model weights the intercept too heavily, making predictions unstable for low feature values.
    [ ] The linear function guarantees that exactly one class will have predictions outside the unit interval.
    [ ] The coefficient 0.03 is too large, causing the model to overfit on emails with many exclamation marks.
- Q: A practitioner builds a linear model $h(x) = \theta_0 + \theta_1 x_1 + \theta_2 x_2$ and classifies a sample as positive if $h(x) \ge 0.5$ and negative otherwise. The dataset has three features: age ($x_1$), income in thousands ($x_2$), and a categorical variable $x_3$ encoded as 0 or 1 for two regions. A new sample gives $h(x) = 0.7$, so it is classified as positive. When the same sample is evaluated on a different continent where income is measured in euros instead of dollars, $h(x) = 1.9$ after conversion. The threshold is kept at 0.5. Which statement captures the core issue?
    [CORRECT] The threshold must be recalibrated if the output scale changes, but the rank ordering remains the same.
    [ ] The model is incorrect because linear regression requires all inputs to be measured in the same currency.
    [ ] Changing the currency units changes the decision, proving linear models are unusable for classification.
    [ ] The output value 1.9 is a probability, so the model must be rejected because probabilities cannot exceed 1.
- Q: You are given a binary classification problem where the classes are linearly separable. You fit a linear regression model $h(x)$ and choose a threshold $t$ that perfectly classifies all training examples. You then fit a logistic regression model that also achieves perfect separation. When you examine the decision boundaries, you find that $h(x) = t$ and $\sigma(z) = 0.5$ describe the same separating hyperplane. However, a new test point lies exactly midway between the two closest training points from opposite classes. How do the two models' outputs for this test point differ?
    [CORRECT] Logistic regression gives a probability near 0.5; linear regression gives a value exactly at the threshold $t$.
    [ ] Linear regression gives a probability near 0.5; logistic regression gives a value exactly at the threshold.
    [ ] Both models output exactly 0.5, so their interpretations of the test point are identical.
    [ ] Linear regression outputs a value far from $t$ because it extrapolates between the nearest training points.
- Q: What is a key advantage of using logistic regression instead of linear regression for a binary classification problem?
    [CORRECT] It outputs values between 0 and 1 that are easy to interpret
    [ ] It uses a straight line to fit the data the best
    [ ] It always produces outputs that are exactly 0 or 1
    [ ] It does not require any threshold value for predictions
- Q: A machine learning practitioner says: "I'll use linear regression for classification because I can just apply a threshold to the continuous output." According to the source material, what is a key risk of this approach?
    [ ] Linear regression cannot be used with a threshold because its outputs are not bounded between 0 and 1.
    [ ] The threshold must be learned from data, which linear regression cannot do.
    [CORRECT] Adding a single new data point can dramatically shift the decision boundary, leading to poor performance.
    [ ] Linear regression requires normally distributed errors, which classification data violate.
- Q: Suppose logistic regression is used for a binary classification task. The model learns parameters such that the decision boundary occurs where $z = \theta_0 + \theta_1 x_1 = 0$. At $x_1 = -\frac{\theta_0}{\theta_1}$, the predicted probability $\hat{p}$ is exactly 0.5. A new point has $x_1 = -\frac{\theta_0}{\theta_1} + \epsilon$ where $\epsilon$ is a very small positive number and $\theta_1 > 0$. Which statement about the predicted probability at this new point is true?
    [CORRECT] The probability is above 0.5 because the sigmoid is monotonically increasing and $z > 0$.
    [ ] The probability is below 0.5 because the small epsilon is dominated by noise in the intercept term.
    [ ] The probability remains 0.5 because the sigmoid function is flat at its center point.
    [ ] The probability is exactly 0.5 plus epsilon because the sigmoid is approximately linear near zero.
- Q: A data analyst uses linear regression with a 0.5 threshold to classify customer churn. After adding a new customer who did not churn but has a very high monthly spend, the model's decision boundary shifts to the right. Which of the following best describes the problem caused by this shift?
    [ ] The new customer is an outlier that makes the regression line less steep
    [ ] The regression line rotates upward, causing some high-spend customers to be misclassified as churn
    [CORRECT] The regression line shifts right, causing some customers who previously were predicted to churn to now be predicted as not churn
    [ ] The threshold of 0.5 becomes invalid for the new data
- Q: In logistic regression, what does the sigmoid function output when the input value z is exactly zero?
    [ ] 0
    [CORRECT] 0.5
    [ ] 1
    [ ] Undefined

### Logistic Regression

- Q: In the logistic regression model, what does the variable z represent in the expression z = w·x + b?
    [ ] The sigmoid output value.
    [CORRECT] The linear combination of features and weights.
    [ ] The predicted class label.
    [ ] The threshold for classification.
- Q: You train a logistic regression model on a dataset where every feature value has been multiplied by $1000$ (e.g., income in dollars instead of thousands). The original model had weights $\mathbf{w}$. Without regularization, what must happen to the new learned weights for the model to make identical predictions?
    [CORRECT] The new weights scale inversely, becoming roughly $\mathbf{w}/1000$.
    [ ] The new weights remain exactly $\mathbf{w}$, unchanged.
    [ ] The new weights scale proportionally, becoming $1000\mathbf{w}$.
    [ ] The bias term b must change sign to compensate.
- Q: In a binary classification problem for fraud detection, you decide which class is positive. According to the convention described in the material, which of the following is a valid assignment?
    [CORRECT] Fraudulent transactions are labeled 1 (positive) because they represent the presence of fraud
    [ ] Fraudulent transactions are always labeled 0 because negative means bad outcomes
    [ ] Positive class must be the majority class in the dataset
    [ ] Positive class is defined by the largest numeric label, so it must be 1
- Q: In logistic regression, why is the sigmoid function $g(z) = \frac{1}{1+e^{-z}}$ preferred over a step function that jumps from 0 to 1 at $z=0$?
    [CORRECT] The sigmoid is differentiable, enabling gradient-based optimization.
    [ ] The sigmoid guarantees predictions are exactly 0 or 1.
    [ ] The sigmoid makes the linear combination z always positive.
    [ ] The sigmoid eliminates the need for a bias term b.
- Q: A logistic regression decision boundary is defined by $w_1 x_1 + w_2 x_2 + b = 0$. From the material, what is the geometric interpretation of this equation in the feature space?
    [CORRECT] A straight line separating the two predicted classes.
    [ ] A curved boundary shaped by the sigmoid function.
    [ ] An ellipse whose axes depend on the weights.
    [ ] A point at the origin of the feature space.
- Q: A data scientist uses the sigmoid (logistic) function g(z) = 1 / (1 + e^(-z)) as part of a logistic regression model. What is the output of g(z) when the input z is exactly 0?
    [CORRECT] 0.5 because e^0 equals 1, so 1 over 1 plus 1 gives 0.5
    [ ] 0 because the function always outputs values close to zero for negative inputs
    [ ] 1 because the exponential term becomes 1 and the denominator is 2
    [ ] Undefined because the function has a discontinuity at z = 0
- Q: In logistic regression, a decision boundary is often set at a predicted probability of 0.5. Based on the properties of the sigmoid function described in the source material, what value of the linear combination z corresponds to this decision boundary?
    [CORRECT] z equals 0.
    [ ] z equals 1.
    [ ] z equals 0.5.
    [ ] z equals -0.5.
- Q: A logistic regression model $g(\mathbf{w}\cdot\mathbf{x} + b)$ is trained on data with continuous features like 'age' and categorical features like 'gender' (one-hot encoded). Which component of the model processes these fundamentally different input types into a single real number?
    [CORRECT] The linear combination $z = \mathbf{w}\cdot\mathbf{x} + b$.
    [ ] The sigmoid function $g(z) = 1/(1+e^{-z})$.
    [ ] The decision threshold, typically 0.5.
    [ ] The loss function $-\log(\hat{y})$.
- Q: You want to use logistic regression to classify images as either 'cat' or 'not cat'. Each image is 64x64 pixels with 3 color channels (RGB). You unroll the pixels into a feature vector $\mathbf{x}$. How many components does the weight vector $\mathbf{w}$ have, not counting the bias term?
    [CORRECT] $64 \times 64 \times 3$
    [ ] $64 \times 64$
    [ ] $64 + 64 + 3$
    [ ] $64 \times 3$
- Q: A logistic regression model for tumor classification outputs a value of 0.7 for a patient. Based specifically on the description in the source material, what does this number indicate?
    [CORRECT] The tumor is more likely to be malignant than benign, but the output is not a precise probability
    [ ] There is a 70% probability that the tumor is malignant because the output always represents probability
    [ ] The model predicts the tumor is benign because 0.7 is below the default classification threshold
    [ ] The tumor belongs to the positive class with a confidence of 0.7 out of 1.0
- Q: Which sequence of steps correctly describes how logistic regression produces a prediction between 0 and 1?
    [CORRECT] Compute a linear combination of features (z = w·x + b) then pass z through the sigmoid function
    [ ] Pass the features through the sigmoid function first, then compute a linear combination of the results
    [ ] Apply the sigmoid function directly to each feature, then average the outputs
    [ ] Multiply the features by a weight, then take the reciprocal of the sum plus a constant
- Q: A logistic regression model outputs a probability of $0.95$ for a particular observation. The true label is $0$. What is the value of the loss $-\log(\hat{y})$ for a single example when $y=0$, computed as $-\log(1 - \hat{y})$?
    [CORRECT] $-\log(0.05)$
    [ ] $-\log(0.95)$
    [ ] $\log(0.05)$
    [ ] $\log(0.95)$
- Q: A logistic regression model with one feature $x$ has $w = 2$ and $b = -1$. At decision threshold $0.5$, the decision boundary is at $x = 0.5$. If the threshold is lowered to $0.2$, in which direction does the effective decision boundary on $x$ shift?
    [CORRECT] It shifts to a smaller value of x.
    [ ] It shifts to a larger value of x.
    [ ] It stays exactly at x = 0.5.
    [ ] It becomes undefined for this model.
- Q: Logistic regression is used for binary classification despite having 'regression' in its name. According to the source material, what is the reason for this naming?
    [ ] The algorithm was originally developed for regression tasks.
    [ ] The term 'regression' refers to the linear combination step.
    [CORRECT] The name was given for historical reasons.
    [ ] It can also be used for continuous prediction.
- Q: A logistic regression model is trained to predict whether a loan will default ($y=1$) or not ($y=0$) using two features: annual income $x_1$ (in thousands of dollars) and credit score $x_2$. The learned parameters are $w_1 = -0.04$, $w_2 = -0.02$, and $b = 6$. For an applicant with an income of \$80,000 and a credit score of 700, what is the value of $z$ (the linear combination) before it enters the sigmoid?
    [CORRECT] $z = -0.04(80) - 0.02(700) + 6$
    [ ] $z = -0.04(80) + -0.02(700) + 6$
    [CORRECT] $z = -0.04(80) - 0.02(700) + 6$
    [ ] $z = -0.04(80) + 0.02(700) - 6$
- Q: A marketing team builds a classification model to predict whether a customer will click on an ad (click=1, no click=0). They first try linear regression and set a threshold of 0.5 to make predictions. After adding a new customer with a very high click probability, the model's best-fit line shifts and the decision boundary moves right. What does the source material say about this behavior?
    [CORRECT] Adding an extreme example should not change the classification boundary, which is why linear regression is unsuitable for classification
    [ ] Linear regression always works for classification if the threshold is adjusted, but the new boundary is still valid
    [ ] The new boundary improves accuracy because the model correctly accounts for the extra data point
    [ ] Linear regression fails because the sigmoid function cannot be used with continuous data
- Q: In logistic regression, the sigmoid function g(z) = 1/(1+e^{-z}) is used. What happens to g(z) when z is a very large negative number?
    [CORRECT] It becomes very close to 0.
    [ ] It becomes very close to 1.
    [ ] It equals exactly 0.
    [ ] It becomes undefined.
- Q: A marketing team builds a logistic regression model to predict customer conversion. Adding an extreme data point does not shift the model's decision boundary significantly. Which property of logistic regression, as described in the source material, is primarily responsible?
    [CORRECT] Its output is bounded between 0 and 1.
    [ ] It uses a linear function of the inputs.
    [ ] It requires a threshold to make predictions.
    [ ] It assumes normally distributed errors.

### Decision Boundary

- Q: You train a logistic regression classifier on two features and obtain the decision boundary $2x_1 - 3x_2 + 6 = 0$. If you multiply both features by 10 (changing units, not meaning) and retrain on the scaled data, which boundary equation would produce predictions identical to the original model on the original-scale inputs?
    [CORRECT] $0.2x_1 - 0.3x_2 + 6 = 0$
    [ ] $20x_1 - 30x_2 + 60 = 0$
    [ ] $2x_1 - 3x_2 + 0.6 = 0$
    [ ] $0.02x_1 - 0.03x_2 + 6 = 0$
- Q: A logistic regression model for predicting loan default uses two features: annual income $x_1$ (in thousands of dollars) and a binary feature $x_2$ (1 if the applicant has prior defaults, 0 otherwise). The learned boundary is $0.1x_1 - 5x_2 + 2 = 0$. An applicant with no prior defaults needs what minimum income (in thousands) to be classified as non-defaulting?
    [CORRECT] 20
    [ ] 10
    [ ] 30
    [ ] 50
- Q: What happens when a linear regression model is used for classification and a new extreme data point is added far to the right of existing points?
    [ ] The decision boundary remains unchanged from the original fit.
    [CORRECT] The best-fit line rotates and the decision boundary shifts to the right.
    [ ] The model begins to output values only between 0 and 1 for all inputs.
    [ ] The classification accuracy for all examples always improves.
- Q: A binary classification model is trained on data where feature $x$ is measured in centimeters. The decision boundary occurs at $x = 15$ cm. If you retrain the same model architecture on the same data but with $x$ measured in millimeters, where does the new decision boundary fall (in mm)?
    [CORRECT] 150 mm
    [ ] 15 mm
    [ ] 1.5 mm
    [ ] 1500 mm
- Q: A logistic regression model uses features that include both continuous values (e.g., income in dollars) and binary indicators (e.g., owns home: 1 or 0). How does the model treat these two types of input when computing the decision boundary?
    [CORRECT] Both are multiplied by their weights and summed identically in the linear combination.
    [ ] Continuous features are multiplied by weights; binary features are added as intercept offsets.
    [ ] Binary features determine the intercept; continuous features determine the slope.
    [ ] Binary features are first converted to z-scores to match the scale of continuous features.
- Q: Consider a logistic regression model where the decision boundary is $0.5x_1 + 0.25x_2 - 10 = 0$. A point $P$ on the boundary has coordinates $(x_1, x_2)$. If $x_1$ increases by 4 units, by how much must $x_2$ change for the point to remain exactly on the boundary?
    [CORRECT] $x_2$ decreases by 8.
    [ ] $x_2$ decreases by 16.
    [ ] $x_2$ increases by 8.
    [ ] $x_2$ increases by 16.
- Q: You have a dataset with two features: $x_1$ (age in years) and $x_2$ (resting heart rate in bpm). A logistic regression model learns the decision boundary $3x_1 + 0.5x_2 - 180 = 0$. For a 40-year-old patient with a heart rate of 70 bpm, what is the raw input to the sigmoid function $z$?
    [CORRECT] -25
    [ ] -10
    [ ] 25
    [ ] 10
- Q: You have the same set of labeled training points but two different model types: a linear regression model (with threshold at 0.5) and a logistic regression model. Both are trained to minimize their respective loss functions on identical binary data. Which statement about their decision boundaries is most accurate?
    [CORRECT] They can differ because the two loss functions penalize errors differently during training.
    [ ] They are always identical because both compute a linear combination of the same inputs.
    [ ] Linear regression always produces a steeper boundary because it minimizes squared error.
    [ ] Logistic regression always places the boundary closer to the majority class centroid.
- Q: What is the value of the sigmoid function g(z) when z equals 0?
    [ ] 0.0
    [CORRECT] 0.5
    [ ] 1.0
    [ ] 2.7
- Q: In binary classification, the designation of which class is called 'positive' and which 'negative' is:
    [ ] determined by the majority class in the training set.
    [CORRECT] arbitrary and can be swapped between the two classes.
    [ ] always set so that the positive class equals 1.
    [ ] defined by the algorithm used for classification.
- Q: A logistic regression model has decision boundary $w_1 x_1 + w_2 x_2 + b = 0$ with $w_1 > 0$ and $w_2 > 0$. The model predicts class 1 when $z > 0$ and class 0 otherwise. For a fixed $x_2 = 10$, what is the classification outcome for a point with $x_1 = 100$ compared to a point with $x_1 = 5$, assuming all other parameters unchanged?
    [CORRECT] The $x_1 = 100$ point is more likely to be class 1 than the $x_1 = 5$ point.
    [ ] The $x_1 = 5$ point is more likely to be class 1 than the $x_1 = 100$ point.
    [ ] Both points are equally likely to be class 1 because $x_2$ is held constant.
    [ ] The outcome depends on the value of $b$ and cannot be compared without it.
- Q: Why is linear regression unsuitable for binary classification problems?
    [ ] It can only predict values between 0 and 1 for any input.
    [CORRECT] Its output can fall outside the 0-1 range and cause threshold-based decision boundaries to be unstable.
    [ ] It requires the decision boundary to pass through the origin of the feature space.
    [ ] It cannot handle more than one input feature in the model.
- Q: A logistic regression model for tumor classification outputs 0.7 for a given patient. Based on the material, what does this value suggest?
    [ ] The patient has a 70% chance of having a malignant tumor.
    [ ] The tumor is 70% likely to be malignant relative to benign.
    [CORRECT] The model is more confident that the tumor is malignant than benign.
    [ ] The decision boundary for this patient is located at 0.7.

### L2 (Ridge) Regularization for Linear and Logistic Regression

- Q: A logistic regression model classifies website visitors as converters or non-converters using 50 behavioral features. The training set error is very low but the hold-out validation error is high. The analyst adds L2 regularization with a moderate lambda. What outcome should the analyst expect?
    [CORRECT] Training error will increase slightly, but validation error will decrease.
    [ ] Both training and validation error will increase because regularization adds bias.
    [ ] Training error will decrease further, and validation error will decrease.
    [ ] The model will remove irrelevant features by setting their coefficients exactly to zero.
- Q: A digital marketing analyst trains an L2-regularized logistic regression model to predict ad clicks and applies z-score normalization to all predictors before training. Why is feature scaling especially important with L2 regularization?
    [CORRECT] Without scaling, features with larger magnitudes would be penalized disproportionately, biasing coefficient shrinkage.
    [ ] Scaling is mandatory for L2 to work because the cost function requires all features to have unit variance.
    [ ] Scaling transforms L2 regularization into L1 regularization so the model can perform feature selection.
    [ ] Scaling only reduces the number of gradient descent iterations but does not affect the regularization penalty.
- Q: A marketing mix model uses linear regression to forecast sales from TV, radio, social, search, display, and email ad spend that are highly correlated with one another. The analyst applies L2 ridge regression. How does L2 help with multicollinearity compared to ordinary least squares?
    [CORRECT] It produces stable coefficient estimates where OLS would have high variance due to correlated predictors.
    [ ] It completely removes the correlation between predictors by orthogonalizing the feature space.
    [ ] It picks the most important channel and sets all other correlated channel coefficients to zero.
    [ ] It transforms the target variable to reduce variance, making the predictions more accurate.
- Q: While tuning the L2 regularization parameter lambda for a churn-prediction logistic regression model, the marketer sets lambda to an extremely large value. Which result is most likely?
    [CORRECT] The model will underfit, showing high bias and poor accuracy on both training and test sets.
    [ ] The model will perfectly separate churners from non-churners on the training set.
    [ ] The model’s coefficients will become larger, amplifying the effect of noisy features.
    [ ] The model will automatically select only the most relevant features and discard others.
- Q: A marketer adds L2 regularization to a linear regression model predicting sales from ad spend across multiple channels. Which statement correctly describes the change to the cost function?
    [CORRECT] A penalty proportional to the sum of squared coefficients is added to the original cost.
    [ ] A penalty proportional to the sum of absolute coefficient values is added to the original cost.
    [ ] A random subset of coefficients is temporarily dropped during each training iteration.
    [ ] The learning rate is increased when the gradient becomes small to escape local minima.

### L1 (Lasso) Regularization and Feature Sparsity

- Q: When the L1 regularization hyperparameter (lambda) is increased for a linear regression model, what happens to the number of non-zero coefficients?
    [ ] The number of non-zero coefficients increases.
    [CORRECT] The number of non-zero coefficients decreases.
    [ ] The count of non-zero coefficients stays constant.
    [ ] The count first increases then decreases.
- Q: A data scientist wants an interpretable model that identifies key drivers from thousands of features but worries about losing small yet predictive features. She chooses L1 regularization alone. What is a key limitation of using only L1 for this goal?
    [ ] L1 retains all features, complicating interpretation.
    [ ] L1 cannot handle thousands of features efficiently.
    [CORRECT] L1 may arbitrarily drop a useful correlated feature.
    [ ] L1 inflates small coefficients, hiding their importance.
- Q: A marketing analyst builds a logistic regression model with 50 behavioral features, many highly correlated. She uses L1 regularization for feature selection. After training, she finds that from a group of five correlated clickstream features, only one is retained with a non-zero coefficient and the others are zero. Is this expected?
    [ ] No, L1 retains all correlated features with tiny coefficients.
    [CORRECT] Yes, L1 tends to arbitrarily retain one from a correlated group.
    [ ] Yes, L1 always picks the most correlated feature to keep.
    [ ] No, L1 shrinks coefficients equally, so many remain nonzero.
- Q: A data scientist fits a Lasso regression to predict click-through rate from 200 ad creative features. Which outcome best demonstrates that L1 regularization has worked as intended?
    [ ] Every coefficient shrinks but none become zero.
    [CORRECT] Many coefficient estimates become exactly zero.
    [ ] Training error is lower than the unregularized model.
    [ ] The intercept term also becomes exactly zero.
- Q: What geometric shape of the L1 regularization constraint region (in coefficient space) leads to sparse solutions?
    [ ] A circular constraint region
    [CORRECT] A diamond-shaped constraint region
    [ ] An elliptical constraint region
    [ ] A parabolic constraint region

### Elastic Net Regularization

- Q: An analyst runs an Elastic Net model and reviews the model summary, which states a mixing parameter l1_ratio of 0.8. What does this value indicate about the penalty used in the loss function?
    [CORRECT] The penalty consists of 80% L1 component and 20% L2 component
    [ ] The total regularization strength applied to the loss is 0.8
    [ ] The model applies only L1 penalty and drops the L2 component
    [ ] The model shrinks all coefficients to the constant value 0.8
- Q: You are tuning an ElasticNet model in scikit-learn. The current parameters are alpha=0.5 and l1_ratio=0.3. You want to double the total regularization penalty but keep the same L1/L2 balance. How should you adjust the parameters?
    [CORRECT] Increase alpha to 1.0 and keep l1_ratio at 0.3
    [ ] Increase l1_ratio to 0.6 and keep alpha at 0.5
    [ ] Increase alpha to 1.0 and l1_ratio to 0.6
    [ ] Decrease alpha to 0.25 and increase l1_ratio to 0.6
- Q: A demand forecasting model uses Lasso to select predictors from several paid-media channels. The search, display, and video channels are highly correlated, yet Lasso retains only the search channel. Stakeholders require visibility into all three correlating channels. How should you modify the regularization approach?
    [CORRECT] Switch to Elastic Net and set l1_ratio to a moderate value such as 0.5
    [ ] Increase the L1 penalty to force the model to select more channels
    [ ] Replace the L1 penalty with an L2 penalty and rely on ranking magnitudes
    [ ] Set alpha to zero so all channels receive non-zero coefficients
- Q: A retailer has 2000 features but only 800 historical observations, and many features are known to be highly correlated. The goal is to predict repeat purchase value and identify a subset of the most important drivers. Which approach is most appropriate?
    [CORRECT] Apply Elastic Net with cross-validated alpha and l1_ratio
    [ ] Apply ordinary least squares and use backward feature elimination
    [ ] Apply Ridge regression and rank features by coefficient magnitude
    [ ] Apply Lasso with a single tuned alpha and no mixing parameter
- Q: A subscription platform fits two Elastic Net churn models with identical alpha, one using l1_ratio=0.9 and another using l1_ratio=0.1. How will the second model's coefficients most likely differ from the first model's coefficients?
    [CORRECT] It will retain more non-zero coefficients, each with smaller magnitude
    [ ] It will retain fewer non-zero coefficients, each with larger magnitude
    [ ] It will produce identical coefficients because alpha is unchanged
    [ ] It will convert all negative coefficients to positive values

