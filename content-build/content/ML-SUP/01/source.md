# SOURCE PACK — Machine Learning / Supervised Machine Learning / Gradient Descent & Optimization

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Derivatives and Gradient Descent Intuition   (15 questions)
2. Gradient Descent   (14 questions)
3. Learning Rate and Convergence   (14 questions)
4. Batch Gradient Descent   (14 questions)
5. Gradient Descent for Multiple Linear Regression   (13 questions)
6. Normal Equation vs. Gradient Descent   (13 questions)

## Covered by LATER lessons — do not teach these here

- Classification & Regularized Linear Models: Limitations of Linear Regression for Classification, Logistic Regression, Decision Boundary, L2 (Ridge) Regularization for Linear and Logistic Regression, L1 (Lasso) Regularization and Feature Sparsity, Elastic Net Regularization
- Support Vector Machines: Core Idea of Support Vector Machines, The Kernel Trick, When to Use SVMs: Strengths and Limitations
- Linear Regression & Cost Functions: Linear Regression Model, Cost Function and Squared Error, Visualizing the Cost Function, Cost Function Intuition and Model Fit, Why Linear Regression’s Cost Function Has a Global Minimum, Multiple Linear Regression

## The live quiz bank for these topics — 83 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Derivatives and Gradient Descent Intuition

- Q: Using the same update w := w - alpha * (dJ/dw) with alpha > 0, if the derivative dJ/dw at the current point is negative, how does w change?
    [ ] w is set to zero automatically
    [ ] w is converted into a class label
    [ ] w decreases even further
    [CORRECT] w increases
- Q: At a given parameter value, what information does the derivative term provide to gradient descent?
    [ ] Whether the dataset's examples are labeled or not
    [ ] The total number of training examples available
    [ ] The exact location of the global minimum of the cost
    [CORRECT] The direction and local steepness for updating the parameter
- Q: A learner argues: "If $\frac{dJ}{dw} = 0$ at a point, then gradient descent will stop there, so that point must be a local minimum." What is the most precise flaw in this reasoning, applied to minimizing $J(w) = w^3$ with $\frac{dJ}{dw} = 3w^2$?
    [CORRECT] Gradient descent stops at $w = 0$ because the derivative is zero, but this is a saddle point, not a local minimum, showing zero derivative is necessary but not sufficient for a minimum.
    [ ] Gradient descent will never stop at a point where the derivative is zero because the update always modifies $w$.
    [ ] The function $w^3$ has no stationary points, so the learner's scenario cannot occur.
    [ ] Gradient descent stops only when the cost value $J(w)$ reaches exactly zero, not when the derivative is zero.
- Q: You are minimizing $J(w) = \frac{1}{2}(w - 3)^4$ using gradient descent with learning rate $\alpha = 0.1$, starting at $w = 1$. The derivative is $\frac{dJ}{dw} = 2(w - 3)^3$. After 5 updates, $w$ is approximately $1.67$. At this new point, the magnitude of the derivative is $|\frac{dJ}{dw}| \approx 4.71$. Compared to the first step where $|\frac{dJ}{dw}| = 16$, how should you interpret what this diminishing derivative magnitude tells you about the landscape near the minimum?
    [CORRECT] The cost surface is flattening near the minimum because the function approaches its lowest value more gradually than a quadratic bowl would.
    [ ] The learning rate is too large, causing the derivative magnitude to decrease artificially.
    [ ] The cost surface is convex but the derivative magnitude always increases near the minimum for higher even-powered functions.
    [ ] The function has no minimum, and the decreasing derivative magnitude confirms divergence from the optimal point.
- Q: You are using gradient descent to minimize a cost function $J(w)$, with the update rule $w := w - \alpha \frac{\partial J}{\partial w}$ where $\alpha = 0.1$. At the current step, you compute the derivative $\frac{\partial J}{\partial w} = -2.5$. What happens to $w$ after the update, and why does this help?
    [CORRECT] $w$ increases, because the negative derivative means we are left of the minimum, so moving right heads downhill.
    [ ] $w$ decreases, because subtracting a negative derivative reduces the weight value.
    [ ] $w$ increases, because a negative derivative always makes the update rule positive.
    [ ] $w$ decreases, because a steep slope forces a larger step toward the minimum.
- Q: You want to fit a linear regression model $\hat{y} = w_0 + w_1 x$ to data where the input $x$ is a numeric temperature in Celsius. If you rescale the input by converting to Kelvin ($x_K = x_C + 273.15$), the optimal $w_1^*$ changes. However, you are using gradient descent to minimize MSE. After rescaling, the derivative $\frac{\partial J}{\partial w_1}$ at the same initial guess will have a different magnitude. What is the primary challenge this rescaling introduces for gradient descent convergence speed?
    [CORRECT] The feature scale changes the condition number of the problem, potentially creating highly elliptical contours that slow gradient descent.
    [ ] The intercept $w_0$ no longer has any meaning, causing the derivative to vanish.
    [ ] The learning rate automatically adapts to the new scale, so convergence speed is unchanged.
    [ ] Gradient descent cannot be used after rescaling because the cost function becomes non-convex.
- Q: You are explaining gradient descent to a colleague. They ask: "If I use the sign of the derivative instead of its magnitude in the update $w := w - \alpha \cdot \text{sign}(\frac{dJ}{dw})$, will it still find the minimum of $J(w) = (w - 5)^2$?" You recognize this as a variant of gradient descent with a fixed step size along the direction of the sign. What is the key difference in behavior near the minimum compared to standard gradient descent?
    [CORRECT] The updates never shrink near the minimum, so it oscillates by a fixed distance around the optimal $w$, never truly converging unless you decay $\alpha$.
    [ ] It converges faster than standard gradient descent because the sign gives the exact direction with less computation.
    [ ] It converges to the exact minimum in a finite number of steps regardless of the starting point.
    [ ] It diverges immediately because the sign of the derivative does not point downhill when near the minimum.
- Q: In the update w := w - alpha * (dJ/dw), if the derivative dJ/dw at the current point is positive, how does w change (assuming alpha > 0)?
    [ ] w stays fixed regardless of alpha
    [CORRECT] w decreases
    [ ] w increases
    [ ] w jumps directly to its target value
- Q: Why is drawing the tangent line to the cost curve helpful for building intuition about the derivative?
    [ ] It makes computing the cost function itself wholly unnecessary
    [CORRECT] Its slope approximates how the cost is changing at that point
    [ ] It carries meaning only for classification, never for regression
    [ ] It maps out the model's entire future training path exactly
- Q: You have $J(\mathbf{w}) = w_1^2 + 25w_2^2$, starting at $\mathbf{w} = \begin{bmatrix} 10 \\ 1 \end{bmatrix}$ with $\alpha = 0.01$. The gradient is $\nabla J = \begin{bmatrix} 2w_1 \\ 50w_2 \end{bmatrix}$. The largest eigenvalue of the Hessian is $50$, the smallest is $2$. The condition number is $25$. Why does gradient descent with constant learning rate zigzag severely and converge slowly here?
    [CORRECT] A high condition number means different curvatures along different directions, so a single learning rate cannot simultaneously make large stable progress along both axes.
    [ ] The learning rate is too small for both directions, causing the algorithm to stall immediately.
    [ ] The cost function is non-convex despite being a quadratic, which violates gradient descent assumptions.
    [ ] High condition numbers cause the gradient to point exactly toward the minimum at every step, making updates inefficient.
- Q: What is the key intuition behind subtracting the derivative term when updating a parameter in gradient descent?
    [CORRECT] It moves the parameter opposite the uphill slope, which lowers cost
    [ ] It guarantees the updated parameter value always turns out negative
    [ ] It forces the underlying model to collapse into a purely linear one
    [ ] It makes the derivative term grow steadily larger on every step
- Q: A cost function $J(w_1, w_2)$ has gradient $\nabla J = \begin{bmatrix} 2w_1 - 6 \\ 4w_2^3 \end{bmatrix}$ and you are at $\mathbf{w} = \begin{bmatrix} 3 \\ 0 \end{bmatrix}$. The update is $\mathbf{w} := \mathbf{w} - \alpha \nabla J$ with $\alpha = 0.5$. What happens to $w_2$ after one update, and why is this a potential problem for optimization?
    [CORRECT] $w_2$ remains $0$ because the gradient component is zero, so gradient descent stalls at this saddle point or flat region for $w_2$.
    [ ] $w_2$ becomes negative because the gradient component is positive, pushing it downhill.
    [ ] $w_2$ increases because the update rule flips the sign of the gradient component.
    [ ] $w_2$ oscillates around $0$ because the cubic term causes alternating signs in the gradient.
- Q: You have a cost function $J(\mathbf{w})$ that is a long narrow valley where one direction is very steep and another is very flat. The gradient is $\nabla J = \begin{bmatrix} 100w_1 \\ w_2 \end{bmatrix}$. You start at $\mathbf{w} = \begin{bmatrix} 1 \\ 1 \end{bmatrix}$ and use a fixed learning rate $\alpha = 0.05$. After many steps, you observe sawtooth oscillations along the steep direction while making slow progress along the flat direction. Which best explains why the oscillations occur?
    [CORRECT] The learning rate is too large for the steep curvature of $w_1$, causing overshooting, while being too small to make fast progress along $w_2$.
    [ ] The gradient is computed incorrectly: the $w_1$ component should shrink the step size automatically.
    [ ] The valley structure ensures that any fixed learning rate converges smoothly without oscillations.
    [ ] The oscillations are caused by the gradient having zero magnitude in the flat direction with a vanishing update.
- Q: Consider minimizing $J(w) = w^2$ with the update $w := w - \alpha \frac{dJ}{dw}$ and $\alpha = 1.1$, starting from $w = 1$. After the first update, $w = -1.2$. After the second update, $w = 1.44$. The magnitude of $w$ is growing. Which statement correctly diagnoses the issue?
    [CORRECT] The learning rate $\alpha > 1$ causes divergence because the step size is too large for the curvature of this quadratic.
    [ ] The derivative is being computed with the wrong sign, leading to an ascent direction.
    [ ] The cost function is non-convex, so any fixed learning rate causes divergence.
    [ ] The initial point is on the wrong side of the minimum, causing gradient descent to overshoot.
- Q: You have $J(w) = (w - 4)^2$, current $w = 2$, and $\alpha = 0.2$. Compute $\frac{dJ}{dw}$ at $w = 2$, perform one gradient descent update $w := w - \alpha \frac{dJ}{dw}$, and choose the explanation that correctly links the sign of the derivative to why $w$ moved toward the minimum at $w = 4$.
    [CORRECT] $\frac{dJ}{dw} = -4$, so $w$ updates to $2.8$. The slope is negative (downhill to the right), so subtracting a negative shifts $w$ upward toward $w=4$.
    [ ] $\frac{dJ}{dw} = -4$, so $w$ updates to $1.2$. The slope is negative (downhill to the left), so subtracting a negative pulls $w$ downward away from $w=4$.
    [ ] $\frac{dJ}{dw} = 4$, so $w$ updates to $1.2$. The slope is positive (uphill), so subtracting it reduces $w$ to climb toward $w=4$.
    [ ] $\frac{dJ}{dw} = -4$, so $w$ updates to $2.8$. The slope is negative (downhill to the left), so subtracting it increases $w$ and overshoots the minimum.

### Gradient Descent

- Q: Why can the choice of starting parameter values affect the outcome of gradient descent on some cost surfaces?
    [ ] Because gradient descent does not actually rely on any parameters
    [ ] Because parameter initialization only ever matters in supervised tasks
    [CORRECT] Because different starting values can reach different local minima
    [ ] Because the cost function completely ignores how it is initialized
- Q: Suppose you train both a linear regression model and a logistic regression model on the same dataset. The dataset has 3 real-valued input features $x_1, x_2, x_3$. For linear regression, $y \in \mathbb{R}$; for logistic regression, $y \in \{0,1\}$. You use gradient descent with MSE for the linear model and cross-entropy for the logistic model. In both cases, you compute the gradient of the cost with respect to the bias term $b$. Which expression correctly contrasts the form of $\frac{\partial J}{\partial b}$ for the two models at a given iteration?
    [CORRECT] For linear regression it is the mean residual; for logistic regression it is the mean difference between predicted probability and true label
    [ ] For linear regression it is the sum of squared residuals; for logistic regression it is the sum of log-probability ratios
    [ ] Both gradients are identical in form because the bias is just an additive constant and the chain rule eliminates the output nonlinearity
    [ ] For linear regression it uses the derivative of the identity function; for logistic regression it uses the derivative of the sigmoid evaluated at the bias alone
- Q: You are building a model to predict the price of a used car. The input features include both numerical features (mileage, year) and categorical features (color, brand). You encode each categorical feature with $k$ levels as $k-1$ indicator columns, and you train a linear regression model with gradient descent. When computing the partial derivative of the cost with respect to the coefficient for 'mileage', what role do the indicator columns for 'color' play in that specific partial derivative calculation?
    [ ] They are multiplied by the mileage value within the partial derivative term due to the chain rule
    [ ] They contribute an interaction penalty that regularizes the mileage coefficient's gradient update
    [CORRECT] They have no direct role; the derivative with respect to mileage depends only on mileage values and the overall residual error
    [ ] They force the derivative to zero whenever a categorical feature is present in the same observation
- Q: You are using gradient descent to minimize a cost function $J(\mathbf{w})$ for a binary classification problem with a linear model. You observe that the gradient magnitude $\|\nabla J(\mathbf{w})\|$ is extremely small (near zero) at a particular set of parameters, yet the classification accuracy on the training set is only 60%. Which situation is the most plausible explanation?
    [ ] The parameters have reached a saddle point that is also a local minimum of the non-convex cost function
    [ ] The learning rate accidentally decayed to zero, preventing progress but also flattening the effective gradient
    [CORRECT] The model has converged to a flat region of the convex cost function corresponding to a poorly-separating hyperplane
    [ ] The input features are perfectly collinear, causing the gradient to vanish irrespective of parameter settings
- Q: In a neural network with a single hidden layer and sigmoid activation, gradient descent updates weights via backpropagation. Consider a weight $w$ connecting an input neuron to a hidden neuron. During a training step, the factor $\delta$ propagated back to this weight from the output layer depends on the derivative of the sigmoid function. If the net input to that hidden neuron is very large in magnitude (say $|z| > 5$), what is the most direct consequence for the update of $w$?
    [ ] The update becomes dominated by second-order curvature effects, requiring a Hessian correction
    [CORRECT] The update step size for $w$ is pushed toward zero regardless of the output error, due to vanishing gradient
    [ ] The update direction for $w$ reverses sign because the sigmoid derivative becomes negative for large $|z|$
    [ ] The update for $w$ amplifies exponentially since the sigmoid saturates and its derivative approaches 1
- Q: You are optimizing a linear regression model on a dataset with 100,000 samples and 50 features. You want to perform gradient descent but suspect some features dominate others in scale. You standardize all features to zero mean and unit variance. If you accidentally standardize the target variable $y$ as well before training, which statement about the resulting learned weights $\mathbf{w}$ is true, assuming you do not transform the target back during training?
    [CORRECT] The weights will be scaled by the inverse of the target's original standard deviation compared to training on the original scale
    [ ] The weights will be unaffected because the gradient of the squared error is invariant to linear scaling of the target
    [ ] The optimization will fail to converge because the cost function becomes non-differentiable after dual standardization
    [ ] The weights will be identical to those obtained without standardizing $y$, but the intercept $b$ will absorb the scaling factor
- Q: When implementing a machine learning model, what is the fundamental purpose of using gradient descent on the cost function $J(\mathbf{w})$?
    [CORRECT] To iteratively update model parameters $\mathbf{w}$ to find the minimum of $J(\mathbf{w})$.
    [ ] To iteratively update model parameters $\mathbf{w}$ to find the maximum of $J(\mathbf{w})$.
    [ ] To choose model parameters $\mathbf{w}$ by randomly sampling different values for $J(\mathbf{w})$.
    [ ] To understand the shape of $J(\mathbf{w})$ without adjusting the parameter values $\mathbf{w}$.
- Q: Suppose you have a dataset where each input is a 28x28 grayscale image and the target is a categorical label (e.g., 'cat', 'dog', 'bird'). You decide to use gradient descent to train a multinomial logistic regression model. Which of the following most accurately describes what the parameter vector $\mathbf{w}$ consists of in this scenario?
    [ ] A separate weight for each class, where each weight is a scalar that multiplies the average pixel intensity of the whole image
    [CORRECT] A matrix of coefficients where each row corresponds to a class and each column to a pixel, plus a bias vector per class
    [ ] A single vector of 784 weights that maps the flattened image directly to a scalar score shared across all classes
    [ ] A set of prototypes, one per class, that are directly compared to the input image using Euclidean distance and updated via gradient descent
- Q: What is meant by a local minimum of a cost function in gradient descent?
    [ ] Another name for the set of training examples that are used
    [ ] The single point holding the highest cost in the whole space
    [CORRECT] A point lower than its neighbors but not the lowest overall
    [ ] Any parameter values at which the total cost turns negative
- Q: What is the central objective of the gradient descent algorithm?
    [ ] To automatically assign labels to unlabeled examples
    [ ] To convert a regression problem into a classification one
    [CORRECT] To iteratively adjust parameters so as to reduce the cost
    [ ] To reach a perfect, zero-error model in a single step
- Q: Why is gradient descent regarded as important well beyond fitting linear regression?
    [ ] It applies only in the case where a model has one single free parameter
    [ ] It removes any need to define a cost function when fitting a model
    [ ] It serves solely to draw the cost contour plots used for inspection
    [CORRECT] It can optimize many functions, including large deep neural networks
- Q: In the common analogy of standing on a hill and trying to reach the valley, how does gradient descent behave?
    [ ] It steps uphill to gather more information first
    [ ] It jumps to random spots until it lands in a valley
    [ ] It moves only sideways, keeping its height unchanged
    [CORRECT] It repeatedly steps in the steepest downhill direction
- Q: You are performing multinomial logistic regression (softmax regression) with $K=4$ classes on inputs $\mathbf{x} \in \mathbb{R}^d$. You use full-batch gradient descent on the cross-entropy cost. At a particular iteration, for a given training example $\mathbf{x}^{(i)}$ whose true class is 2, the predicted probability vector is $\hat{\mathbf{y}}^{(i)} = [0.1, 0.1, 0.7, 0.1]^T$. Which statement about the gradient of the cost with respect to the weight vector $\mathbf{w}_2$ (the weights for class 2) for this single example is correct?
    [ ] The gradient is $-\mathbf{x}^{(i)}$ because the predicted probability for the true class is the largest
    [CORRECT] The gradient is $(0.7 - 1)\mathbf{x}^{(i)} = -0.3\mathbf{x}^{(i)}$, pulling weights to increase the score for class 2
    [ ] The gradient is $(1 - 0.7)\mathbf{x}^{(i)} = 0.3\mathbf{x}^{(i)}$, pushing weights to decrease the score for class 2
    [ ] The gradient sums contributions from all classes, weighted by their probabilities, and equals $\mathbf{0}$ since the total probability is 1
- Q: Imagine you train a logistic regression classifier on a dataset with 2 numerical input features. The decision boundary learned after convergence is $\mathbf{w}^T\mathbf{x} + b = 0$, where $\mathbf{w} = [1.5, -0.8]^T$ and $b = 0.2$. For a test point $\mathbf{x}_{test} = [0.4, 2.1]^T$, the model predicts class 1 if $P(y=1|\mathbf{x}) \ge 0.5$, else class 0. What is the predicted class, and what does the magnitude of $\mathbf{w}^T\mathbf{x}_{test} + b$ most directly represent before applying the sigmoid function?
    [CORRECT] Class 0; the signed distance (up to a scaling factor) from the point to the decision boundary
    [ ] Class 0; the posterior probability that the point belongs to class 0
    [ ] Class 1; the Mahalanobis distance from the point to the class-1 centroid
    [ ] Class 1; the change in log-odds when all features are set to the test point values

### Learning Rate and Convergence

- Q: What can go wrong if the learning rate alpha is set too large?
    [ ] The derivative vanishes after just one update
    [CORRECT] It may overshoot the minimum and fail to converge
    [ ] The model automatically becomes more accurate
    [ ] The algorithm silently switches to unsupervised learning
- Q: With a fixed learning rate alpha, why can gradient descent still settle into a minimum rather than stepping past it forever?
    [ ] Because the model gradually stops paying any attention at all to the data
    [ ] Because every local minimum just happens to share the exact same cost
    [ ] Because the value of alpha quietly shrinks toward zero all on its own
    [CORRECT] Because the derivative shrinks near the minimum, so the steps get smaller
- Q: In the gradient descent update rule, what does the learning rate alpha control?
    [ ] The number of output classes to predict
    [ ] The mathematical form of the cost function
    [CORRECT] How large each parameter update step is
    [ ] The number of input features in the model
- Q: If gradient descent arrives at a point where the derivative dJ/dw is exactly zero, what does the basic update rule do next?
    [CORRECT] It leaves the parameter unchanged
    [ ] It replaces the current training set
    [ ] It makes the parameter oscillate widely
    [ ] It drives the cost down below zero
- Q: You train a binary classifier using gradient descent on a dataset where one feature is a continuous height measurement in centimeters and another is a one-hot encoded gender indicator. Your cost plot shows rapid initial decrease but then stalls on a long, nearly flat plateau far above zero. The gradients are tiny but nonzero. Which adjustment to the learning rate is most appropriate?
    [ ] Switch from a constant $\alpha$ to a schedule that increases over time
    [CORRECT] Keep $\alpha$ fixed but normalize the continuous feature to the same scale as the binary feature
    [ ] Multiply $\alpha$ by a decay factor each iteration to shrink steps over time
    [ ] Set $\alpha$ proportional to the inverse of the gradient magnitude at each step
- Q: What is the likely effect of choosing a learning rate alpha that is too small?
    [ ] The derivative becomes zero at every point
    [ ] Gradient descent fails right away on the first step
    [ ] The cost is forced to increase on each step
    [CORRECT] Gradient descent still works but converges very slowly
- Q: A cost function has the shape of a long, narrow ravine with steep walls and a gently sloping floor along the ravine floor's direction. Gradient descent with a fixed, moderate $\alpha$ is run from a point on one of the steep walls. Which trajectory best describes the resulting path?
    [ ] Smooth diagonal descent directly along the negative gradient toward the ravine floor, then slow progress along the floor
    [CORRECT] Zigzagging across the narrow ravine with large horizontal steps, making slow overall progress along the floor direction
    [ ] Rapid descent along the floor direction first, then slow descent down the steep walls once the floor is reached
    [ ] Immediate divergence because the steep wall gradients cause every update to overshoot the entire ravine
- Q: You are running gradient descent for linear regression with one feature. The cost $J(w,b)$ decreases smoothly for several iterations, then suddenly jumps up sharply on iteration 47 before continuing to oscillate. The update rule is $w := w - \alpha \frac{\partial J}{\partial w}$. What is the most direct explanation for why the jump happened on that specific iteration?
    [ ] The cumulative sum of past gradients finally pushed the parameter past the minimum
    [ ] The cost function has a saddle point near iteration 47 that deflected the update direction
    [CORRECT] The local slope was steep enough that $\alpha \cdot \frac{\partial J}{\partial w}$ overstepped the minimum basin
    [ ] The learning rate $\alpha$ spontaneously doubled due to a floating-point overflow in the parameter vector
- Q: You train a neural network with gradient descent and monitor the validation loss. The training loss decreases monotonically, but the validation loss drops to a minimum around epoch 30, then begins increasing while the training loss continues to fall. The learning rate is fixed. Which description correctly characterizes the convergence behavior at epoch 50?
    [ ] Gradient descent has converged to the global minimum of the training loss but an unrelated shift in the data distribution harms validation
    [CORRECT] The optimization has not converged on the training loss; it continues to move parameters into a region where the validation loss surface curves upward
    [ ] The training and validation losses have both converged, but the gap between them is caused by an incorrectly chosen learning rate
    [ ] Gradient descent on the training set diverges after epoch 30, but the validation loss masks this by averaging over fewer examples
- Q: You have two independent datasets: Dataset A for a regression task (predicting house prices from square footage) and Dataset B for a classification task (predicting loan default from credit score). You train one model on A using mean squared error and another on B using binary cross-entropy, both with gradient descent and the same fixed $\alpha$. You observe that the cost curve for B converges to a stable minimum, while the cost curve for A diverges after a few iterations. What difference between the two tasks best accounts for this?
    [ ] Classification problems always have bounded cost functions, ensuring stability regardless of $\alpha$
    [CORRECT] Squared error gradients scale with prediction error magnitude, which can explode if target values have a wider numerical range than class labels
    [ ] Cross-entropy implicitly normalizes the effective learning rate by the prediction probability, stabilizing updates
    [ ] Regression models require two parameters $(w,b)$ while classification models require only one, causing twice the update variance
- Q: You are training a linear regression model and notice on the cost versus iteration plot that $J(w,b)$ is not decreasing. Instead, each update causes the cost to swing back and forth with larger and larger values. What is the most likely diagnosis, and what will happen if you continue training without changing anything?
    [CORRECT] The learning rate $\alpha$ is too large, and the cost will eventually diverge to infinity.
    [ ] The learning rate $\alpha$ is too large, and the algorithm will oscillate around a local minimum without converging.
    [ ] The learning rate $\alpha$ is too small, and the cost will eventually diverge to infinity.
    [ ] The learning rate $\alpha$ is too small, and the algorithm will oscillate around a local minimum without converging.
- Q: At iteration $t$, gradient descent updates a parameter by $\Delta w_t = -\alpha \nabla J(w_t)$. Suppose the true minimum is at $w^*$. If $w_t$ is currently to the left of $w^*$ and $\nabla J(w_t)$ is negative, the update adds a positive amount. If $\alpha$ is exactly right for one clean step to $w^*$, what must be true?
    [ ] $\alpha$ must equal the reciprocal of the second derivative at $w_t$
    [CORRECT] $\alpha$ must equal $\frac{w_t - w^*}{\nabla J(w_t)}$
    [ ] $\alpha$ must be numerically equal to the distance between $w_t$ and $w^*$
    [ ] $\alpha$ must be chosen such that $\nabla J(w_{t+1}) = 0$ exactly one iteration later
- Q: Consider a cost function $J(w) = (w-3)^4 + 2$. You start gradient descent at $w=0$ with $\alpha = 0.02$. The derivative is $\frac{dJ}{dw} = 4(w-3)^3$. After many iterations, $w$ approaches $2.99$ but the updates become vanishingly small. Why does convergence effectively halt even though $w$ is not exactly $3$?
    [CORRECT] The derivative decays faster than linearly, so the product $\alpha \cdot \frac{dJ}{dw}$ drops below machine precision before $w=3$
    [ ] The learning rate is too small to overcome the flatness of a fourth-power basin near the minimum
    [ ] The gradient is zero everywhere inside the interval $[2.99, 3.01]$, so the update rule does nothing
    [ ] The cost function has an inflection point at $w=3$ that traps the parameter with no escape direction
- Q: You implement batch gradient descent for logistic regression with features $x_1$ (annual income in dollars, range 20,000 to 200,000) and $x_2$ (age in years, range 18 to 90). Without feature scaling, you find that setting $\alpha = 0.3$ causes divergence. After standardizing both features to zero mean and unit variance, $\alpha = 0.3$ converges smoothly. Which statement explains why the same $\alpha$ behaves differently after scaling?
    [ ] Scaling reduces the number of parameters, making the update magnitude proportionally smaller
    [CORRECT] Standardization contracts the condition number of the Hessian, shrinking the largest eigenvalues so the same $\alpha$ no longer violates stability limits
    [ ] Zero-mean features cancel out the intercept term's contribution, reducing the effective gradient magnitude
    [ ] Scaling converts the cost surface from a narrow valley to a perfect hemisphere where any $\alpha$ below $1.0$ is safe

### Batch Gradient Descent

- Q: A dataset has three inputs: age in years (continuous), city population (continuous), and a binary indicator for subscription status. Batch gradient descent is used for linear regression. The gradient of the cost function with respect to a single weight $w_j$ involves a sum over all $m$ training examples. For the binary indicator input, what contribution does one training example make to that sum?
    [CORRECT] $(\hat{y}^{(i)} - y^{(i)}) \cdot x_j^{(i)}$, where $x_j^{(i)}$ is 0 or 1
    [ ] $(\hat{y}^{(i)} - y^{(i)}) \cdot 1$ regardless of the indicator value
    [ ] $(\hat{y}^{(i)} - y^{(i)})$ multiplied by the mean of all binary values
    [ ] $(\hat{y}^{(i)} - y^{(i)})$ with no additional factor for categorical variables
- Q: When computing the gradient in batch gradient descent for linear regression, what is the sum taken over?
    [ ] Only the single largest-error example
    [CORRECT] Every training example in the dataset
    [ ] Only features with the largest values
    [ ] Only the unlabeled examples present
- Q: How does batch gradient descent differ from variants that use subsets of the data, such as mini-batch or stochastic gradient descent?
    [ ] It computes updates without using any derivatives
    [ ] It is identical in practice with no real difference
    [CORRECT] It uses all examples per step; the others use smaller subsets
    [ ] It works only for classification, not regression tasks
- Q: Why is the standard form of gradient descent called "batch" gradient descent?
    [ ] It trains many separate models in parallel
    [CORRECT] Each step uses the entire training set at once
    [ ] It applies only to batches of image inputs
    [ ] It updates one training example per step
- Q: A practitioner trains a regression model on a dataset containing a continuous variable (income) and a categorical variable (city, with 50 unique values). After one-hot encoding, batch gradient descent must update 51 weights from the original two inputs. What is one direct consequence for the gradient computation at each step?
    [CORRECT] The gradient vector has 51 components, each summed over the full dataset
    [ ] Each of the 51 weights is updated using only rows matching its city
    [ ] The gradient sums only over the income variable, with cities handled separately
    [ ] The 50 city weights share a single gradient component to avoid redundancy
- Q: Consider a regression dataset with two inputs: temperature in Celsius (continuous) and a weather type encoded as sunny $= [1,0,0]$, rainy $= [0,1,0]$, cloudy $= [0,0,1]$. The model is $\hat{y} = b + w_1 x_1 + w_2 s + w_3 r + w_4 c$. At prediction time, a sample has temperature $25$ and weather cloudy. Which expression correctly gives the model output?
    [CORRECT] $b + 25w_1 + 0 \cdot w_2 + 0 \cdot w_3 + 1 \cdot w_4$
    [ ] $b + 25w_1 + w_2 + w_3 + w_4$ for the cloudy category
    [ ] $b + 25w_1 + w_4$, ignoring $w_2$ and $w_3$ entirely
    [ ] $b + 25w_1 + w_4$ multiplied by the probability of cloudiness
- Q: Batch gradient descent minimises a cost function $J(\mathbf{w})$ by computing $\nabla J(\mathbf{w})$ over all $m$ examples. Suppose a dataset for binary classification contains a continuous glucose level and a binary family history indicator. The cost function is the average log loss across the full batch. Why does the presence of the binary input not break the differentiability assumption required for gradient descent?
    [CORRECT] The cost is a function of real-valued weights, and binary inputs are just real constants fed into linear combinations
    [ ] Gradient descent approximates gradients for discrete inputs using finite differences
    [ ] The binary input is converted into probabilities before computing log loss
    [ ] Differentiability is only required for continuous inputs; categorical inputs skip the derivative step
- Q: What is one implication of computing each gradient descent update using the full training set?
    [CORRECT] Each update reflects the whole dataset
    [ ] No cost function is needed to train
    [ ] The parameter b can no longer change
    [ ] The algorithm ignores the target values
- Q: Which feature of the update rule justifies the name "batch" gradient descent?
    [CORRECT] Each derivative sums over i=1 to m, the whole set
    [ ] "Batch" is just another word for vectorization
    [ ] Parameters are updated in alphabetical order
    [ ] The fitted line is plotted in separate batches
- Q: A linear regression model predicts house price from two inputs: square footage (a continuous value) and a binary indicator for whether the house has a garage. The model is $\hat{y} = w_0 + w_1 x_1 + w_2 x_2$ trained with batch gradient descent. What does $w_2$ represent after the model converges?
    [CORRECT] The additive adjustment to the predicted price when a garage is present
    [ ] The expected price increase per additional square foot of garage area
    [ ] The probability the house has a garage given its price
    [ ] The fixed weight assigned to square footage for homes with garages
- Q: Suppose a dataset contains both height in centimetres (a continuous input) and blood type (a categorical input with values A, B, AB, O). For batch gradient descent to update parameters correctly in a linear regression model, how must blood type be handled before training begins?
    [CORRECT] Convert it to multiple binary indicator columns, one per category
    [ ] Map each category to a distinct integer such as 0, 1, 2, 3
    [ ] Leave it as text labels since the cost function handles strings
    [ ] Replace it with the mean height for each blood type group
- Q: In batch gradient descent, why does using the entire training set of $m$ examples produce an accurate gradient estimate but also make each update step computationally slow?
    [CORRECT] Evaluating all $m$ examples reduces variance in the gradient direction, but requires summing gradients over the full dataset before adjusting parameters.
    [ ] Evaluating all $m$ examples eliminates bias in the gradient direction, but forces the algorithm to store multiple past gradients in memory.
    [ ] Evaluating all $m$ examples smooths the loss landscape, but prevents the algorithm from escaping shallow local minima.
    [ ] Evaluating all $m$ examples normalizes the learning rate, but scales the cost linearly with the number of model parameters.
- Q: You train a logistic regression classifier on a dataset where one input is income (continuous) and another is employment status (employed, unemployed, self-employed). Batch gradient descent minimises the binary cross-entropy cost. The decision boundary is defined by $\sigma(\mathbf{w} \cdot \mathbf{x} + b) = 0.5$, which is equivalent to $\mathbf{w} \cdot \mathbf{x} + b = 0$. How does the employment status input influence this linear boundary?
    [CORRECT] It shifts the intercept by different amounts for each category
    [ ] It lets the boundary curve to separate nonlinear groups
    [ ] It has no effect because classification requires purely continuous inputs
    [ ] It changes the slope coefficient of income multiplicatively
- Q: You are using batch gradient descent to train a model for a classification task with a continuous sensor reading and a three-category colour input (red, green, blue). After one-hot encoding, the cost function $J(\mathbf{w})$ includes weights for the encoded colour features. During a single batch gradient descent update, what data does the gradient computation use to update the weight associated with the red indicator?
    [CORRECT] Every training example, with the red indicator value determining its contribution
    [ ] Only the training examples whose colour is red
    [ ] A random subset of examples, sampled uniformly from the full batch
    [ ] Only the continuous sensor readings, ignoring the colour columns

### Gradient Descent for Multiple Linear Regression

- Q: Which belief is a common conceptual mistake when reasoning about the multi-feature gradient descent update?
    [ ] The update is applied iteratively until the cost converges
    [CORRECT] Assuming there is still only one weight left to optimize
    [ ] Vector notation can simplify how the update is written
    [ ] Each input feature has its own weight that must be learned
- Q: Suppose you are running gradient descent on a multiple linear regression model with features $x_1, x_2, x_3$ and bias $b$. You notice that the update for $w_2$ depends only on the error terms and the values of $x_2$ across all training examples. What does this independence from $x_1$ and $x_3$ in the update rule reveal about the gradient?
    [CORRECT] The partial derivative of the cost with respect to $w_2$ isolates $x_2$ regardless of other features
    [ ] The cost function is separable across features during optimization
    [ ] The model assumes features are uncorrelated for the update to be valid
    [ ] The learning rate automatically compensates for interdependencies among features
- Q: In multiple linear regression with gradient descent, the weight vector $\mathbf{w}$ and bias $b$ are updated simultaneously using the full gradient. What would be the consequence of updating $b$ first using current $\mathbf{w}$, and then updating $\mathbf{w}$ using the newly updated $b$?
    [CORRECT] The algorithm becomes a valid alternative optimization method with different convergence properties
    [ ] The updates would diverge immediately because the operations are not commutative
    [ ] The bias would systematically dominate the optimization process
    [ ] The weight vector would converge to zero regardless of the data
- Q: You run gradient descent for multiple linear regression and observe that the cost decreases smoothly for the first 100 iterations but then oscillates without further meaningful reduction. The learning rate is fixed. What is the most likely geometric interpretation of this behavior?
    [CORRECT] The iterates are bouncing across the walls of a narrow valley in the cost surface
    [ ] The cost function has developed saddle points due to numerical overflow
    [ ] The gradient is exactly zero, causing random perturbations to dominate
    [ ] The model has reached the global minimum and noise is causing harmless fluctuation
- Q: During training of a multiple linear regression model, what quantities are actually being updated?
    [ ] The algebraic formula of the cost function
    [CORRECT] The weight vector w and the bias term b
    [ ] The labeled training examples in the dataset
    [ ] The names assigned to each input feature
- Q: How does the gradient descent update change when moving from one feature to multiple features?
    [CORRECT] Each weight $w_j$ gets its own update along with the bias $b$
    [ ] The model becomes unsupervised and needs no labels
    [ ] Only the bias $b$ is updated while the weights stay fixed
    [ ] The cost function is no longer needed during training
- Q: Why is vectorization especially helpful for gradient descent in multiple linear regression?
    [CORRECT] Because many parameters and features must be updated efficiently
    [ ] Because it prevents the model from overfitting on its own
    [ ] Because it converts the regression task into clustering
    [ ] Because linear regression otherwise has no closed-form solution
- Q: What stays conceptually the same when extending gradient descent to multiple linear regression?
    [ ] The need for labeled training examples disappears
    [ ] The number of parameters is always exactly one
    [ ] The model output must now become categorical
    [CORRECT] Repeatedly updating parameters to reduce a cost function
- Q: A learner inspects the gradient descent update for multiple linear regression and sees that the bias $b$ is updated using the same error signal as the weights, but without multiplying by any feature value. Why is this mathematically consistent?
    [CORRECT] The bias acts as the coefficient of an implicit feature whose value is always 1
    [ ] The bias uses a separate learning rate that absorbs the missing feature factor
    [ ] The bias gradient is an approximation that ignores feature scaling effects
    [ ] The bias is updated less frequently than the weights to maintain stability
- Q: Consider the mean squared error cost function $J(\mathbf{w}, b) = \frac{1}{2m} \sum_{i=1}^{m} (\hat{y}^{(i)} - y^{(i)})^2$ for multiple linear regression. When computing $\frac{\partial J}{\partial w_j}$, the chain rule introduces a factor from the derivative of the prediction. What is the origin of that factor?
    [CORRECT] The derivative of the weighted sum with respect to $w_j$, which simplifies to $x_j$
    [ ] The derivative of the squared error with respect to $\hat{y}$, which yields the factor 2
    [ ] The derivative of the bias term, which propagates through all weights equally
    [ ] The derivative of the loss with respect to each training label $y^{(i)}$
- Q: A student claims: "In gradient descent for multiple linear regression, if we set the learning rate too small, the algorithm will converge to a worse minimum than with a properly tuned learning rate." Is this claim correct when the cost function is the mean squared error?
    [CORRECT] No, because the cost is convex and has a unique global minimum for linear regression
    [ ] Yes, because a small learning rate causes the optimizer to settle in a local minimum
    [ ] Yes, because a small learning rate amplifies noise from the gradient estimates
    [ ] No, because a smaller learning rate always produces a lower final cost value
- Q: You train a multiple linear regression model with two features using gradient descent. After convergence, $w_1 = 4.2$ and $w_2 = 1.8$. You then rescale $x_2$ by dividing all its values by 10 and retrain from scratch with the same learning rate and initialization. How does the trajectory of $w_1$ during retraining compare to the original run?
    [CORRECT] The updates for $w_1$ change because the error surface has been stretched along the $w_2$ axis
    [ ] The updates for $w_1$ remain identical since $x_1$ was not modified
    [ ] The updates for $w_1$ slow down because the overall loss magnitude decreases
    [ ] The updates for $w_1$ accelerate because $w_2$ now converges faster
- Q: A dataset contains a categorical feature "color" with three possible values: red, blue, green. You encode it using one-hot encoding for multiple linear regression, resulting in three binary columns. During gradient descent, what does the sum of the three corresponding weight updates equal after one iteration if the initial weights are all zero?
    [CORRECT] A value proportional to the average prediction error across all training examples
    [ ] Zero, because the one-hot columns are linearly dependent
    [ ] The average prediction error for the most frequent color class only
    [ ] A value exactly equal to the bias update for that iteration

### Normal Equation vs. Gradient Descent

- Q: What is the normal equation method used for?
    [ ] Choosing how many input features to keep automatically
    [CORRECT] Solving for linear regression parameters without iterating
    [ ] Grouping unlabeled data points into clusters
    [ ] Training an arbitrary deep neural network architecture
- Q: What is a key limitation of the normal equation compared with gradient descent?
    [ ] It cannot be applied to linear regression problems
    [ ] It requires all labels to be removed before solving
    [ ] It always produces worse predictions than gradient descent
    [CORRECT] It does not generalize to most other learning algorithms
- Q: What might happen inside a mature machine learning library when it fits a linear regression model?
    [ ] It is unable to solve for the parameters on its own
    [CORRECT] It may use the normal equation behind the scenes
    [ ] It always restricts itself to batch gradient descent
    [ ] It converts the regression problem into classification
- Q: Why might gradient descent still be preferred even though the normal equation exists?
    [CORRECT] It works across far more models and scales better
    [ ] It removes the need to define any cost function
    [ ] It only ever needs a single training example to run
    [ ] It avoids every matrix computation entirely and forever
- Q: Consider two linear regression training runs on identical data: one using the normal equation, the other using batch gradient descent with a well-chosen fixed learning rate run to convergence. Which statement correctly describes the resulting parameter vectors $\theta_{NE}$ and $\theta_{GD}$?
    [CORRECT] They minimize the same convex cost function and converge to the identical optimal parameters, within numerical precision.
    [ ] $\theta_{GD}$ converges to a slightly different solution because gradient descent optimizes a regularized cost by default.
    [ ] $\theta_{NE}$ always has smaller coefficients because the matrix inversion implicitly applies L2 shrinkage.
    [ ] They minimize different cost functions because the normal equation uses the pseudo-inverse, altering the objective.
- Q: You are teaching peers who confuse the normal equation with gradient-based optimization. They ask: "Does the normal equation internally use gradient information?" Which response correctly explains the mechanism while dispelling the misconception?
    [CORRECT] It does not numerically follow a gradient path; it directly solves for the point where the gradient vector equals zero.
    [ ] It computes the full gradient at every iteration but uses a closed-form update rule instead of a learning rate.
    [ ] It approximates the gradient using finite differences and then jumps directly to the estimated minimum in one step.
    [ ] It bypasses the gradient entirely by solving an unrelated algebraic system that happens to minimize the cost.
- Q: You implement a linear regression fitter that decides algorithmically whether to use the normal equation or gradient descent. The heuristic checks $d$ (feature count) against a threshold. Which combination of metrics must the heuristic weigh to make a sound runtime decision?
    [CORRECT] The $O(d^3)$ cost of inversion against the $O(k \cdot n \cdot d)$ cost of $k$ gradient descent iterations.
    [ ] The $O(d^2)$ cost of matrix multiplication against the $O(k \cdot d)$ cost of $k$ stochastic steps.
    [ ] The $O(n \cdot d)$ memory footprint of $X^TX$ against the $O(n)$ memory cost of a single prediction pass.
    [ ] The $O(d!)$ combinatorial cost of feature subset selection against the $O(d \log d)$ cost of sorting coefficients.
- Q: When using the normal equation $\theta = (X^TX)^{-1}X^Ty$, what must be true of $X^TX$ for a unique solution to exist, and what does this condition imply about the dataset?
    [CORRECT] $X^TX$ must be invertible; this requires that no feature is an exact linear combination of the others.
    [ ] $X^TX$ must be diagonal; this requires that all features be uncorrelated with each other.
    [ ] $X^TX$ must be symmetric; this requires that the number of samples equal the number of features.
    [ ] $X^TX$ must be orthogonal; this requires that all features have zero mean and unit variance.
- Q: You fit a linear regression model with $n=10000$ samples and $d=1500$ features. Computing $(X^TX)^{-1}$ requires roughly $O(d^3)$ operations. Given $d=1500$, what asymptotic operation count best characterizes this inversion, and what practical consequence follows?
    [CORRECT] Approximately $3.4 \times 10^9$ operations; the normal equation becomes computationally heavy but may still finish on modern hardware.
    [ ] Approximately $2.25 \times 10^6$ operations; the normal equation runs faster than gradient descent for this size.
    [ ] Approximately $1.5 \times 10^4$ operations; the normal equation is always preferred when $n > d$.
    [ ] Approximately $1.0 \times 10^{10}$ operations; the normal equation is impossible to compute for any $d > 1000$.
- Q: Which statement about the normal equation is a misunderstanding that should be avoided?
    [ ] It is a specialized alternative mainly for linear regression
    [ ] Libraries may sometimes call it internally to fit a model
    [ ] It skips iterative updates for that specific problem
    [CORRECT] It is the main general-purpose training method for modern models
- Q: A learner claims: "The normal equation works only when the target variable $y$ is normally distributed, because the derivation assumes Gaussian errors." What is the most precise evaluation of this claim?
    [CORRECT] The claim is incorrect; the normal equation solves the least-squares problem regardless of the error distribution.
    [ ] The claim is correct; the normal equation derivation relies on maximizing the Gaussian likelihood function.
    [ ] The claim is partially correct; the normal equation requires normally distributed features but not targets.
    [ ] The claim is incorrect only for classification; for regression, the normal equation strictly requires Gaussian $y$.
- Q: Suppose $X^TX$ is singular due to linearly dependent features. The pseudo-inverse $(X^TX)^+$ can still produce a solution. Which characterization of that solution is correct?
    [CORRECT] It yields the minimum-norm parameter vector among all solutions that minimize the least-squares cost.
    [ ] It yields the parameter vector that maximizes the margin between predicted and actual target values.
    [ ] It yields the solution that regularizes the coefficients toward zero with a fixed L1 penalty.
    [ ] It yields the unique solution that sets all coefficients of the dependent features to exactly zero.
- Q: You run the normal equation on a dataset where feature $x_3$ has values approximately $10^6$ times larger than feature $x_1$. No two features are linearly dependent. What is the most likely numerical consequence?
    [CORRECT] The condition number of $X^TX$ becomes very large, producing potentially unstable or inaccurate computed coefficients.
    [ ] The matrix $X^TX$ becomes exactly singular despite the features not being linearly dependent in theory.
    [ ] Gradient descent would also fail because the cost function becomes non-convex under extreme feature scaling.
    [ ] The normal equation automatically standardizes all features before inversion, so no numerical issue arises.

