# SOURCE PACK — Mathematics / Calculus / 05 Optimization in Higher Dimensions

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Gradients of cost functions (e.g., Mean Squared Error)   (5 questions)
2. Introduction to Gradient Descent   (5 questions)
3. Learning rate and convergence   (6 questions)
4. Newton's Method for optimization   (5 questions)

## Already taught earlier in this course

- Estimating limits and one-sided limits
- Limits by direct substitution, factoring, and conjugates
- The Squeeze Theorem
- Limits of trigonometric functions
- Types of discontinuities
- Intermediate Value Theorem (IVT)
- Derivative as slope and rate of change
- Derivative rules (Power rule, Product, Quotient)
- Derivatives of sin(x) and cos(x)
- Chain Rule and Implicit differentiation
- Higher-order derivatives and Second derivatives
- Tangent lines and linear approximations
- Optimization and Related rates
- Square loss and log loss functions
- Riemann sums (Left, Right, Midpoint, Trapezoidal)
- Definite integrals and the Fundamental Theorem of Calculus
- Antiderivatives and Indefinite integrals
- Reverse Power Rule
- Indefinite integrals of ex,1/x,sin, and cos
- u-substitution
- Area between curves
- Functions of several variables
- Partial derivatives and the Gradient vector
- Directional derivatives
- Higher-order derivatives and the Hessian matrix

## Covered by LATER lessons — do not teach these here

- 06 Calculus in Neural Networks: Activations and Activation Functions, Computational graphs and the Chain Rule in graphs, Backpropagation algorithm math

## The live quiz bank for these topics — 21 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Gradients of cost functions (e.g., Mean Squared Error)

- Q: Why is squared error used as the cost instead of simply summing the signed errors?
    [ ] Because squaring forces each individual error term to equal exactly 1
    [ ] Because only a strictly squared cost can ever be fit using a straight line
    [CORRECT] Because positive and negative errors can cancel, hiding large mistakes
    [ ] Because squared error removes any need to compute gradients during fitting
- Q: When using gradient-based optimization to minimize least-squares cost for a line $y = mx + b$, which quantities get updated on each step?
    [ ] The number of observations $n$
    [ ] Only the predicted values $y_i$
    [ ] Only the input values $x_i$
    [CORRECT] The parameters $m$ and $b$
- Q: For one data point $(x_1, y_1)$ and a line $y = mx + b$, which expression is the residual (prediction minus observed) before squaring?
    [ ] $y_1 - m - b$
    [ ] $y_1 + mx_1 + b$
    [CORRECT] $mx_1 + b - y_1$
    [ ] $m + b - x_1 \cdot y_1$
- Q: Why does iterative optimization become attractive for least-squares problems with many variables?
    [CORRECT] Because solving the full linear system directly grows quite costly in high dimensions
    [ ] Because adding more variables makes the whole cost function become perfectly linear
    [ ] Because iterating fully removes any need at all to compute derivatives during fitting
    [ ] Because least-squares problems with many variables have no exact closed-form solution
- Q: When fitting a line to data by least squares, what quantity is being minimized?
    [ ] The determinant of the matrix formed from the input feature data
    [ ] The product of the fitted line's slope and its vertical intercept
    [ ] The sum of the raw signed residuals taken across every data point
    [CORRECT] The squared errors between the observed values and the line's predictions

### Introduction to Gradient Descent

- Q: Which formula gives the gradient descent update step for a function of several variables, with learning rate α?
    [ ] New point = the gradient - α times the old point
    [ ] New point = old point + α times the gradient
    [ ] New point = the Hessian times the gradient
    [CORRECT] New point = old point - α times the gradient
- Q: Why is an iterative method like gradient descent often preferred over solving an optimization problem analytically?
    [ ] Because gradient descent works only on one-variable problems
    [ ] Because a gradient can never be computed exactly
    [CORRECT] Because exact solutions get complicated in high dimensions
    [ ] Because analytic solutions are always wrong in practice
- Q: What is a well-known limitation of gradient descent on a non-convex function?
    [ ] It cannot make use of partial derivatives
    [ ] It can be applied only in one dimension
    [ ] It always reaches the global minimum
    [CORRECT] It can get trapped in a local minimum
- Q: When minimizing a function with gradient descent, what must be evaluated at the current point before taking the next step?
    [ ] Only the Hessian at that point
    [ ] Only the function's value at the origin
    [CORRECT] The gradient evaluated at that point
    [ ] The determinant of the gradient
- Q: What is the main purpose of gradient descent?
    [ ] To compute the exact symbolic derivative by hand
    [ ] To formally prove that a given function is continuous
    [ ] To diagonalize a square matrix into its eigenvalues
    [CORRECT] To iteratively step toward a minimum of a function

### Learning rate and convergence

- Q: What role does the learning rate α play in a gradient descent update?
    [ ] It decides whether the gradient exists
    [CORRECT] It scales the size of each step
    [ ] It converts a maximum into a minimum
    [ ] It selects the coordinate system used
- Q: On a surface with many local minima, what is a practical way to improve your chances of finding a very good solution?
    [ ] Restrict the problem to one-dimensional data
    [CORRECT] Restart the search from many different points
    [ ] Swap the gradient for the Hessian every step
    [ ] Set the learning rate to zero after one step
- Q: Why is choosing a good learning rate considered difficult?
    [ ] It only ever matters when using Newton's second method
    [ ] A known closed-form formula gives it but rarely works
    [ ] The step size must always equal exactly one in every case
    [CORRECT] No single method is guaranteed to work for every problem
- Q: As gradient descent approaches a minimum, what behavior signals that you are getting close?
    [ ] The starting point immediately repeats
    [CORRECT] The steps shrink and progress nearly stops
    [ ] The function value hits exactly zero
    [ ] The gradient becomes a square matrix
- Q: Two gradient descent runs start from different points on a surface with several valleys. What can result?
    [ ] They must converge to the same point
    [ ] They are unable to converge at all
    [CORRECT] They may settle into different local minima
    [ ] They both jump straight to the global minimum
- Q: You are using batch gradient descent to minimize a convex cost function $J(\theta)$. You record the cost after each iteration: $J(\theta_0)=2.5$, $J(\theta_1)=1.2$, $J(\theta_2)=1.8$, $J(\theta_3)=0.9$, $J(\theta_4)=1.4$, $J(\theta_5)=0.7$. Based on this pattern, what can you conclude about the learning rate $\alpha$?
    [ ] $\alpha$ is too small; the loss should decrease monotonically.
    [CORRECT] $\alpha$ is too large; the updates overshoot and cause oscillations.
    [ ] $\alpha$ is optimal; the oscillations are from gradient noise.
    [ ] $\alpha$ is causing instability; the loss will eventually diverge.

### Newton's Method for optimization

- Q: To minimize a smooth one-variable function $g(x)$, Newton's method iterates by updating the current estimate $x_k$. Which update formula does it use?
    [ ] $x_{k+1} = x_k - \frac{g(x_k)}{g'(x_k)}$
    [ ] $x_{k+1} = x_k + \alpha \cdot g'(x_k)$
    [CORRECT] $x_{k+1} = x_k - \frac{g'(x_k)}{g''(x_k)}$
    [ ] $x_{k+1} = g''(x_k) - g'(x_k)$
- Q: Extending Newton's method to minimize a function of several variables, what plays the role held by the second derivative g''(x) in the one-variable case?
    [ ] The Jacobian transpose
    [ ] The cost function itself
    [CORRECT] The Hessian matrix
    [ ] The gradient vector
- Q: When using Newton's method to minimize a function g(x), why does the update rely on g'(x) and g''(x) rather than on g(x) itself?
    [ ] Because the method is only defined for logarithmic functions
    [ ] Because optimization seeks the zeros of the function's value g(x)
    [ ] Because the second derivative is cheaper to evaluate than the first
    [CORRECT] Because minima occur where g'(x) = 0, and g''(x) confirms the type
- Q: When Newton's method for optimization works well, how does its convergence typically compare with that of gradient descent?
    [ ] It generally requires many more iterations to converge
    [CORRECT] It reaches a near-exact answer in only a few iterations
    [ ] It always converges to the global minimum
    [ ] It cannot be applied to optimization problems
- Q: In the multivariable Newton update, the step is the inverse Hessian times the gradient. Why does the order of this matrix-vector product matter?
    [ ] Because the gradient commutes freely with every square matrix
    [ ] Because the resulting update step is required to be a single scalar
    [CORRECT] Because a column gradient cannot left-multiply the inverse Hessian
    [ ] Because the Hessian must be a diagonal matrix in this update

