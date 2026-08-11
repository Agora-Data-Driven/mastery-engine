# SOURCE PACK — Machine Learning / Supervised Machine Learning / Linear Regression & Cost Functions

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Linear Regression Model   (5 questions)
2. Cost Function and Squared Error   (16 questions)
3. Visualizing the Cost Function   (5 questions)
4. Cost Function Intuition and Model Fit   (13 questions)
5. Why Linear Regression’s Cost Function Has a Global Minimum   (13 questions)
6. Multiple Linear Regression   (6 questions)

## Already taught earlier in this course

- Derivatives and Gradient Descent Intuition
- Gradient Descent
- Learning Rate and Convergence
- Batch Gradient Descent
- Gradient Descent for Multiple Linear Regression
- Normal Equation vs. Gradient Descent
- Limitations of Linear Regression for Classification
- Logistic Regression
- Decision Boundary
- L2 (Ridge) Regularization for Linear and Logistic Regression
- L1 (Lasso) Regularization and Feature Sparsity
- Elastic Net Regularization
- Core Idea of Support Vector Machines
- The Kernel Trick
- When to Use SVMs: Strengths and Limitations

## The live quiz bank for these topics — 58 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Linear Regression Model

- Q: Why is linear regression classified as a regression model rather than a classification model?
    [ ] Because it needs no labeled training data
    [ ] Because it always relies on multiple features
    [ ] Because it sorts inputs into discrete classes
    [CORRECT] Because it outputs continuous numeric values
- Q: Which expression is the model form for linear regression with one input variable?
    [ ] $f(x) = w + x + b^2$
    [CORRECT] $f(x) = wx + b$
    [ ] $f(x) = \hat{y} + x$
    [ ] $f(x) = x / y$
- Q: In a task that predicts house price from house size, what does linear regression learn?
    [ ] A list of fixed hand-written pricing rules
    [ ] A set of discrete categories for home types
    [ ] A grouping of houses into neighborhood clusters
    [CORRECT] A straight-line map from input to output
- Q: When first studying regression, why is it common to begin with a straight-line model before fitting more complex curves?
    [ ] Because nonlinear models lack cost functions
    [ ] Because curved models cannot fit real data
    [CORRECT] Because it is simple and builds intuition
    [ ] Because straight lines are always most accurate
- Q: What does the term 'univariate linear regression' mean?
    [ ] A linear model fit without any labels
    [CORRECT] A linear regression with a single input
    [ ] A regression model with a single output class
    [ ] A linear model trained on a single example

### Cost Function and Squared Error

- Q: You have a small dataset with $m=4$ examples: $(x, y)$ pairs are $(1, 2), (2, 3), (3, 5), (4, 5)$. Your linear model is $f_{w,b}(x) = wx + b$ with $w = 1$ and $b = 1$. Compute the squared error cost $J(w,b) = \frac{1}{2m} \sum_{i=1}^{m} (f_{w,b}(x^{(i)}) - y^{(i)})^2$. What is the value?
    [CORRECT] $0.125$
    [ ] $0.250$
    [ ] $0.500$
    [ ] $1.000$
- Q: Why is the squared error cost commonly scaled by 1/(2m) rather than 1/m, where m is the number of examples?
    [CORRECT] The 1/2 makes later derivatives cleaner
    [ ] The 1/2 is needed only for classification
    [ ] The 1/2 guarantees zero training error
    [ ] The 1/2 changes which model class is used
- Q: You have a dataset and a linear model $f_{w,b}(x) = wx + b$. You compute $J(0, 0) = 50$ and $J(1, 1) = 8$. A learner says: "Since $J(1,1) < J(0,0)$, the parameters $(1,1)$ are strictly better than $(0,0)$ at making predictions." What is the most precise evaluation of this statement?
    [ ] The statement is always true because lower cost always means better predictions on unseen data
    [CORRECT] The statement is correct as a judgment about fit to the training data
    [ ] The statement is incorrect because cost function values cannot be compared across different parameter settings
    [ ] The statement is incorrect because $J(1,1)$ being lower only implies better fit if the model class is correctly specified
- Q: Why is squared error a sensible loss choice for linear regression?
    [ ] It is valid only when the bias b is zero
    [ ] It ignores all of the smaller errors
    [ ] It forces the predictions to be categorical
    [CORRECT] It penalizes large errors heavily and works well
- Q: Your model is $f_{w,b}(x) = wx + b$, and the squared error cost is $J(w,b) = \frac{1}{2m} \sum_{i=1}^{m} (f_{w,b}(x^{(i)}) - y^{(i)})^2$. Suppose you find that $J(0, 10) = 18$ and $J(0, 12) = 14$. What can you definitively conclude about the best-fit constant predictor $f(x) = b$ for this dataset?
    [ ] The optimal $b$ is strictly less than 10
    [ ] The optimal $b$ lies between 10 and 12
    [CORRECT] The optimal $b$ is strictly greater than 12
    [ ] The dataset must contain at least one negative target value
- Q: Why does the squared error cost function average the errors over the training set instead of just summing them?
    [ ] So that the model becomes nonlinear
    [ ] So that labels turn into input features
    [CORRECT] So cost does not grow with example count
    [ ] So that predictions are no longer needed
- Q: A linear model $f_{w,b}(x) = wx + b$ is evaluated using squared error cost. For a given parameter setting, the residuals $r^{(i)} = f_{w,b}(x^{(i)}) - y^{(i)}$ across $m=4$ examples are: $r^{(1)} = -2$, $r^{(2)} = 4$, $r^{(3)} = -1$, $r^{(4)} = -1$. Without computing the final numeric cost, which statement is true about the contribution of these residuals to $J(w,b)$?
    [ ] Example 2 contributes exactly four times as much as example 3
    [ ] Example 1 contributes the same amount as examples 3 and 4 combined
    [ ] The sum of signed residuals is zero, so the cost must be zero
    [CORRECT] Example 2 contributes sixteen times as much as example 3
- Q: You are training a linear model $f_{w,b}(x) = wx + b$ on a dataset with $m=3$ examples: $(x^{(1)}, y^{(1)}) = (1, 2)$, $(x^{(2)}, y^{(2)}) = (2, 4)$, $(x^{(3)}, y^{(3)}) = (3, 6)$. For the current parameters $w=1$ and $b=0$, what is the value of the cost function $J(w,b)$?
    [CORRECT] $J(w,b) = \frac{7}{3}$
    [ ] $J(w,b) = \frac{14}{3}$
    [ ] $J(w,b) = 7$
    [ ] $J(w,b) = \frac{7}{6}$
- Q: You have a linear model $f_{w,b}(x) = wx + b$ and a dataset with $m=5$ examples. The squared error cost is $J(w,b) = \frac{1}{2m} \sum_{i=1}^{m} (f_{w,b}(x^{(i)}) - y^{(i)})^2$. Suppose you compute the cost at two different parameter settings: (A) $w=0, b=\bar{y}$ where $\bar{y}$ is the mean of the targets, and (B) $w=2, b=0$. For setting A, the cost is $2.0$. For setting B, the cost is $5.0$. If you now double ALL target values $y^{(i)}$ (so $y_{\text{new}}^{(i)} = 2y^{(i)}$) and recompute costs WITHOUT changing parameters, what happens to the ratio $J_A / J_B$?
    [CORRECT] The ratio stays exactly the same
    [ ] The ratio doubles
    [ ] The ratio becomes four times larger
    [ ] The ratio becomes half
- Q: You compute the squared error cost $J(w,b)$ on a training set and get $J = 9$. You then create a second dataset by taking each training example and duplicating it exactly once (so every $(x^{(i)}, y^{(i)})$ appears twice). You recompute $J(w,b)$ on this new doubled dataset using the SAME parameters. What is the new cost?
    [ ] $4.5$
    [CORRECT] $9$
    [ ] $18$
    [ ] $36$
- Q: What is the purpose of the cost function in linear regression?
    [ ] It assigns a discrete class label to inputs
    [CORRECT] It gauges how well predictions match targets
    [ ] It selects how many examples to train on
    [ ] It rescales every input feature automatically
- Q: In the squared error cost function, what quantity is squared for each example?
    [ ] The value of the input feature x used
    [CORRECT] The gap between the prediction and target
    [ ] The value of the model's bias parameter b
    [ ] The count of examples in the training set
- Q: You are using the cost function $J(w,b) = \frac{1}{2m} \sum_{i=1}^{m} (wx^{(i)} + b - y^{(i)})^2$ with $m=6$ examples. Suppose you know the following six residuals for a particular $(w,b)$: $3, -3, 2, -2, 1, -1$. A colleague claims: "Because the residuals sum to zero, this $(w,b)$ must be the optimal solution that minimizes $J$." Is this claim correct?
    [ ] Yes, because zero sum of residuals is a necessary and sufficient condition for the minimum
    [CORRECT] No, because zero sum of residuals is necessary but not sufficient for the minimum
    [ ] No, because zero sum of residuals is neither necessary nor sufficient for the minimum
    [ ] Yes, because the cost function is convex and zero-sum guarantees the global minimum
- Q: Given the dataset $x = [1, 2, 3]$, $y = [2, 3, 5]$ and the linear model $f_{w,b}(x) = 1 + 1.5x$, what is the value of the squared error cost $J(w,b)$?
    [ ] $\frac{1}{3}$
    [CORRECT] $\frac{1}{6}$
    [ ] $\frac{2}{3}$
    [ ] $\frac{1}{2}$
- Q: For a linear regression model $f_{w,b}(x) = wx + b$, the cost function $J(w,b) = \frac{1}{2m} \sum_{i=1}^{m} (f_{w,b}(x^{(i)}) - y^{(i)})^2$ is computed on a dataset where all $x^{(i)}$ values are distinct. Suppose you discover that for the current parameters, the individual squared errors $(f_{w,b}(x^{(i)}) - y^{(i)})^2$ are identical for every single example $i$. What can you conclude?
    [ ] The parameter $w$ must equal exactly 0
    [ ] The model is a constant predictor for this dataset
    [ ] The cost $J(w,b)$ equals that common squared error value
    [CORRECT] The residuals $f_{w,b}(x^{(i)}) - y^{(i)}$ all have the same magnitude but possibly different signs
- Q: You have a dataset with three examples: $(1, 1), (2, 2), (3, 3)$. You fit a model $f_{w,b}(x) = wx + b$. At $(w=1, b=0)$, the cost is $0$. A friend claims: "Since the cost is zero, if I add a fourth example $(4, 3.5)$, the new cost $J_{\text{new}}$ must be strictly positive, no matter what." Which of the following best evaluates this claim?
    [ ] The claim is wrong because adding any new point always keeps the cost at zero
    [CORRECT] The claim is correct because the model cannot pass through the new point
    [ ] The claim is correct because the new point deviates from the perfect line
    [ ] The claim is wrong because parameters could be changed to still achieve zero cost

### Visualizing the Cost Function

- Q: On a contour plot of the cost function J(w,b), what does a single contour line represent?
    [ ] Predicted outputs for one fixed input value
    [ ] The decision boundary of a trained classifier
    [ ] Training examples that share the same label
    [CORRECT] Parameter pairs (w,b) that yield the same cost
- Q: What relationship is illustrated by plotting candidate regression lines alongside their positions on the cost contour plot?
    [ ] The quality of the line's fit is unrelated to the cost
    [CORRECT] Better-fitting lines map to parameters nearer the cost minimum
    [ ] Only perfectly horizontal lines can minimize the cost
    [ ] Every line through the data attains an identical cost value
- Q: Why is a contour plot a useful way to study the cost function J(w,b)?
    [ ] It can only be drawn when the minimum cost equals zero
    [ ] It removes the need to evaluate cost on the data
    [ ] It shows model predictions without using any parameters
    [CORRECT] It depicts a 3D cost surface in 2D using equal-cost curves
- Q: On a contour plot of J(w,b) drawn as concentric ellipses, where does the parameter pair giving the minimum cost lie?
    [ ] On the largest outermost ellipse
    [CORRECT] At the center of the smallest ellipse
    [ ] Only along the line where b equals 0
    [ ] At any point where w is largest
- Q: For linear regression with squared-error cost, when both the weight w and bias b are allowed to vary, what shape does the cost function J(w,b) trace out over the (w,b) plane?
    [ ] A flat tilted plane with one constant slope all over
    [ ] A rugged surface with many separate isolated valleys
    [ ] A staircase built from discrete flat horizontal steps
    [CORRECT] A convex bowl with a single lowest point at its base

### Cost Function Intuition and Model Fit

- Q: Why does minimizing the squared error cost tend to improve how well the model fits the data?
    [ ] Because the cost is unrelated to prediction quality
    [ ] Because a lower cost makes the slope steeper
    [CORRECT] Because lower cost means smaller squared errors
    [ ] Because minimizing cost automatically adds data
- Q: What key intuition emerges from comparing the cost produced by different values of the weight w?
    [CORRECT] Each value of w gives a different line and cost
    [ ] One value of w can stand for many models
    [ ] The cost is independent of the training data
    [ ] The weight w changes the cost but not the line
- Q: You have four training points and fit $f(x) = wx$. The cost function $J(w)$ is a parabola. At $w = 0$ the cost is $50$, and at $w = 2$ the cost is $10$. The parabola's vertex lies at $w = 3$. What is the minimum achievable cost?
    [ ] It is exactly $0$ since a parabola always crosses zero
    [ ] It is $5$ because the vertex is halfway between $w = 2$ and its symmetric counterpart
    [ ] It cannot be determined from only two points and the vertex location
    [CORRECT] It is less than $10$ but its exact value requires the third point to compute
- Q: What does a smaller value of the cost function generally indicate?
    [ ] The model is using a larger feature set
    [CORRECT] Predictions sit closer to the training targets
    [ ] The training set contains fewer examples
    [ ] The target labels have become categorical
- Q: On a scatter plot with a fitted regression line, what does the vertical gap between a data point and the line represent?
    [ ] The total size of the training set
    [ ] The learning rate used in training
    [ ] The number of input features used
    [CORRECT] The prediction error for that point
- Q: A student claims: "If $J(w) = 0$ at some $w$, then that $w$ must be the unique global minimum." Under what condition is this claim false?
    [CORRECT] When the cost function is not strictly convex and multiple $w$ values achieve zero cost
    [ ] When the model uses a bias term in addition to the weight
    [ ] When the training set contains duplicate data points
    [ ] When the cost is computed using mean absolute error instead of mean squared error
- Q: A regression model $f(x) = wx + b$ produces zero cost on a dataset with three distinct $x$ values. What must be true about the targets $y$?
    [ ] The targets must all be equal to each other
    [CORRECT] The targets must lie exactly on a straight line when plotted against $x$
    [ ] The targets must increase as $x$ increases
    [ ] The targets must be symmetric around their mean
- Q: For the dataset (1,1), (2,2), (3,3) fit with f(x) = wx (no bias), why does the cost J(w) equal 0 when w = 1?
    [ ] Because the slope of the line is negative
    [ ] Because the learning rate is set to zero
    [CORRECT] Because each prediction equals its target
    [ ] Because there is no training data to fit
- Q: For the model $f(x) = wx$ and dataset $(1, 3), (2, 5), (3, 7)$, the cost $J(w)$ is minimized at $w = 2.33$ (approximately). Why is the optimal $w$ not exactly $2$?
    [ ] Because the squared errors penalize the point $(1, 3)$ disproportionately due to its smaller $x$ value
    [CORRECT] Because the absence of a bias term forces the line through the origin, skewing the fit
    [ ] Because the targets do not form an arithmetic progression
    [ ] Because the cost function is not differentiable at integer values of $w$
- Q: Consider a model $f(x) = wx$ (no bias) trained on two points: $(2, 4)$ and $(4, 8)$. If we constrain $w$ to be exactly $1.5$, what is the squared error cost $J(w)$?
    [ ] $J(1.5) = 1.25$
    [ ] $J(1.5) = 2.5$
    [CORRECT] $J(1.5) = 5.0$
    [ ] $J(1.5) = 3.75$
- Q: Two different weight vectors produce the same non-zero cost on a regression task. What can you definitively conclude?
    [ ] The cost function must have a flat region between those two weight vectors
    [ ] The two weight vectors are symmetric about the global minimum
    [ ] The model must be underfitting the training data
    [CORRECT] The two models achieve identical average prediction error on the training set
- Q: A dataset with $n$ points is fit with $f(x) = wx + b$. The cost $J(w, b)$ reaches its global minimum. If you add a new training point far from the existing $x$ values but exactly on the fitted line, how does the minimum change?
    [ ] The values of $w$ and $b$ at the minimum remain identical and the minimum cost remains zero
    [ ] The minimum cost could increase because the new point adds to the sum
    [CORRECT] The optimal $w$ and $b$ remain identical and the minimum cost stays the same non-zero value
    [ ] The optimal $w$ shifts to accommodate the new point's leverage
- Q: Why is the squared error cost $J(w) = \frac{1}{m} \sum_{i=1}^m (f_w(x^{(i)}) - y^{(i)})^2$ convex for linear regression $f_w(x) = wx$?
    [ ] Because squaring the residuals makes all terms non-negative
    [CORRECT] Because the cost is a quadratic function of the parameter $w$ with a positive leading coefficient
    [ ] Because the derivative of $J(w)$ is a linear function of $w$
    [ ] Because the dataset contains real-valued features

### Why Linear Regression’s Cost Function Has a Global Minimum

- Q: What practical benefit does the convexity of the squared-error cost provide when training linear regression with gradient descent?
    [ ] Training the model no longer requires using any data at all
    [ ] Gradient descent converges to the answer in a single update step
    [ ] The particular choice of cost function stops mattering at all
    [CORRECT] With a suitable learning rate, it reaches the global minimum
- Q: Consider a linear regression model with one feature, $f(x) = \theta_0 + \theta_1 x$, and the mean squared error cost $J(\theta_0, \theta_1)$. Why is the Hessian matrix $\mathbf{H}$ of $J$ with respect to $\theta$ constant, and why does this matter for optimization?
    [CORRECT] It equals $\mathbf{X}^T\mathbf{X}$, which is independent of $\theta$, guaranteeing the cost surface has exactly one stationary point that is the global minimum
    [ ] It equals $\mathbf{X}^T\mathbf{y}$, which vanishes at the optimum, proving all critical points are saddle points that gradient descent will avoid
    [ ] It equals the identity matrix scaled by the residual sum, creating a flat surface where any step direction reaches the minimum in one iteration
    [ ] It equals the Jacobian of the model output, which ensures the cost is always decreasing regardless of the regularisation parameter chosen
- Q: Suppose you transform the inputs of a linear regression by an invertible linear map $\mathbf{Z} = \mathbf{A}\mathbf{X}$. How does the shape of the squared-error cost surface change, and why does the global minimum property survive?
    [CORRECT] The surface remains a convex quadratic form because the cost is still $\frac{1}{n}\|\mathbf{Z}\theta - \mathbf{y}\|^2$, and its Hessian $\mathbf{Z}^T\mathbf{Z}$ is still positive semidefinite
    [ ] The surface becomes a flat hyperplane through the origin because the linear transformation cancels all curvature in the original $\mathbf{X}^T\mathbf{X}$ matrix
    [ ] The surface develops a ridge of equivalent minima along the nullspace of $\mathbf{A}$, turning the single global minimum into an infinite flat region with no unique solution
    [ ] The surface becomes non-convex but retains the original global minimum location, because invertible maps preserve critical points but not second-order structure
- Q: A practitioner fits two models on the same dataset: a linear regression with squared error, and a neural network with a similar number of parameters. The neural network's cost surface has many local minima while the linear regression's has only one. Which fundamental property of the squared-error cost for linear regression directly prevents the existence of multiple isolated minima?
    [CORRECT] The cost is a positive semidefinite quadratic form in the parameters, yielding a Hessian that never depends on $\theta$
    [ ] The cost is a positive definite quadratic form in the residuals, making every local minimum also a saddle point of the output
    [ ] The cost is a logarithmic function of the design matrix, ensuring monotonic reduction of the gradient norm to zero
    [ ] The cost is a diagonal matrix of observation weights, forcing all eigenvalues of the Hessian to be exactly one
- Q: Why does squared-error linear regression avoid the multiple-local-minima problem that can affect more complex cost surfaces?
    [ ] Because it holds w and b fixed at zero
    [ ] Because it never relies on any derivatives
    [CORRECT] Because its cost function is convex and bowl-shaped
    [ ] Because its cost ignores the training data
- Q: A learner claims: "The normal equation $(\mathbf{X}^T\mathbf{X})\theta = \mathbf{X}^T\mathbf{y}$ always gives the global minimum, so the cost function must always be convex." Is the reasoning direction correct, and what is the actual logical relationship?
    [ ] Yes, because solving the normal equation is equivalent to setting the gradient to zero, and any zero-gradient point of a smooth function is a global minimum
    [CORRECT] No, the normal equation yields a global minimum precisely because the cost is convex; the existence of a closed-form solution does not itself guarantee a single global minimum
    [ ] Yes, because any linear system with $\mathbf{X}^T\mathbf{X}$ positive definite generates a convex cost, and the normal equation solves all such systems regardless of data
    [ ] No, the normal equation only gives a local minimum unless the design matrix is orthogonal; convexity is an extra property that must be verified by computing eigenvalues
- Q: Which statement best distinguishes the linear regression cost surface from a general "hilly" surface with many valleys?
    [ ] The hilly case alone is supervised, while regression is unsupervised
    [ ] Only the hilly surface ever makes any real use of gradient steps
    [CORRECT] Its squared-error surface is a single convex bowl, not many valleys
    [ ] Linear regression actually has no free parameters left to optimize
- Q: Why can stochastic gradient descent (SGD) on a single noisy data point still converge toward the global minimum of the squared-error cost, even though each individual update uses a different, noisier approximation of the true gradient?
    [CORRECT] Averaged over steps, the expected SGD direction equals the true gradient, which points down a convex surface toward the unique global minimum
    [ ] A single data point's gradient always points exactly toward the global minimum, only scaled by the residual, guaranteeing direct convergence
    [ ] The noise adds curvature that turns the cost surface into a sequence of local minima, and SGD hops between them until it finds the deepest one
    [ ] SGD ignores convexity and minimises a different loss for each data point, converging to a compromise point that is not the true global minimum
- Q: Which belief about gradient descent applied to squared-error linear regression is a misconception that should be avoided?
    [ ] That its updates are computed from derivatives
    [CORRECT] That it tends to get stuck in poor local minima
    [ ] That it depends on a chosen learning rate
    [ ] That its goal is to minimize the cost function
- Q: What does it mean for the squared-error cost function to be "convex"?
    [ ] It always evaluates to zero at initialization
    [CORRECT] It is bowl-shaped with a single global minimum
    [ ] It depends on exactly one input feature
    [ ] Its prediction must be a linear function
- Q: In which scenario would the squared-error cost surface for a linear model still be convex but NOT strictly convex, and what practical issue arises for gradient descent as a result?
    [CORRECT] When $\mathbf{X}^T\mathbf{X}$ is singular due to linearly dependent features, creating a valley of equivalent global minima and making the final parameter values depend on initialization
    [ ] When the number of samples exceeds the number of features, causing the cost to have many flat directions that prevent gradient descent from ever reaching the minimum
    [ ] When all target values are identical, causing the Hessian to become a zero matrix and the cost to collapse into a point with no defined gradient
    [ ] When the learning rate is exactly the inverse of the largest eigenvalue, causing the descent path to cycle around the minimum without converging
- Q: In linear regression, the squared-error cost $J(\theta) = \frac{1}{2n}\|\mathbf{X}\theta - \mathbf{y}\|^2$ is convex. If you add a regularisation term $\lambda\|\theta\|^2$ with $\lambda > 0$, which statement characterises the new cost surface's minima?
    [CORRECT] Stays a single convex bowl with a unique global minimum, now shifted toward the origin and strictly convex even if $\mathbf{X}^T\mathbf{X}$ was singular
    [ ] Splits into two symmetric bowls because the penalty creates a competing attractor at $\theta = \mathbf{0}$, and gradient descent oscillates between them
    [ ] Becomes a flat basin where all parameters with the same norm have identical cost, eliminating the unique minimum property that unregularised regression had
    [ ] Transforms into a saddle-shaped surface with one minimum along the first principal component and one maximum along the last, requiring second-order optimisation
- Q: A student argues: "The squared-error cost for linear regression is convex, so if I initialise gradient descent at any point and use a fixed learning rate, I will always converge to the global minimum." What nuance must be added to make this statement fully accurate?
    [ ] Increase the fixed rate to guarantee convergence without needing to check any caveats
    [ ] Restrict the initialisation to points where the cost is already below a threshold set by the condition number of $\mathbf{X}^T\mathbf{X}$
    [ ] Add a momentum term to avoid overshooting, because a fixed learning rate alone creates a non-convex trust region
    [CORRECT] Specify that the learning rate must be small enough not to cause divergence, otherwise even a convex surface allows overshooting past the minimum

### Multiple Linear Regression

- Q: In multiple-feature notation, what does $x^{(i)}$ represent?
    [ ] The ith feature across all examples
    [ ] The target value of the ith example
    [CORRECT] The vector of all features for example i
    [ ] The ith gradient descent update
- Q: What is the key change when moving from univariate to multiple linear regression?
    [ ] The training set no longer needs labels
    [CORRECT] It uses several input features instead of one
    [ ] The model no longer has any parameters
    [ ] The predicted output stops being numeric
- Q: A real estate model for house prices uses three features: size in square feet ($x_1$), age in years ($x_2$), and number of floors ($x_3$). The trained model has weights $w_1 = 150$, $w_2 = -2000$, $w_3 = 10000$ and bias $b = 50000$. What is the predicted price for a house with size 2000 sq ft, age 10 years, and 2 floors?
    [CORRECT] $150 \cdot 2000 + (-2000) \cdot 10 + 10000 \cdot 2 + 50000 = 350000$
    [ ] $150 \cdot 2000 + (-2000) \cdot 10 + 10000 \cdot 2 = 320000$
    [ ] $150 \cdot 2000 + (-2000) \cdot 10 + 10000 \cdot 2 + 50000 = 380000$
    [ ] $150 \cdot 2000 + 2000 \cdot 10 + 10000 \cdot 2 + 50000 = 390000$
- Q: Which model form correctly expresses multiple linear regression?
    [CORRECT] f(x) = w1*x1 + w2*x2 + ... + wn*xn + b
    [ ] f(x) = x / y, a ratio of inputs
    [ ] f(x) = category(x), a class label
    [ ] f(x) = b, a constant with no inputs
- Q: Why might multiple linear regression predict housing prices better than single-variable regression?
    [CORRECT] It can use more relevant inputs like size, floors, and age
    [ ] It mathematically guarantees perfectly accurate predictions
    [ ] It quietly reframes the prediction task as a clustering problem
    [ ] It completely removes the need to train on any data at all
- Q: In multiple linear regression, what does the symbol n typically represent?
    [CORRECT] The number of input features
    [ ] The number of training examples
    [ ] The number of gradient descent steps
    [ ] The number of output categories

