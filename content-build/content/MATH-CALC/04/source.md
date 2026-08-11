# SOURCE PACK — Mathematics / Calculus / 04 Multivariate Calculus

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Functions of several variables   (3 questions)
2. Partial derivatives and the Gradient vector   (5 questions)
3. Directional derivatives   (5 questions)
4. Higher-order derivatives and the Hessian matrix   (4 questions)

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

## Covered by LATER lessons — do not teach these here

- 05 Optimization in Higher Dimensions: Gradients of cost functions (e.g., Mean Squared Error), Introduction to Gradient Descent, Learning rate and convergence, Newton's Method for optimization
- 06 Calculus in Neural Networks: Activations and Activation Functions, Computational graphs and the Chain Rule in graphs, Backpropagation algorithm math

## The live quiz bank for these topics — 17 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Functions of several variables

- Q: The tangent plane to a surface is found by taking slices in the x- and y-directions. Why do these two tangent lines determine the plane?
    [ ] Because the two partial derivatives are always equal
    [ ] Because one tangent line determines the other
    [CORRECT] Because two intersecting lines fix a unique plane
    [ ] Because both tangent lines have the same slope
- Q: A function f(x, y) takes how many inputs and produces how many outputs?
    [CORRECT] Two inputs and one output
    [ ] One input and two outputs
    [ ] Three inputs and one output
    [ ] Two inputs and two outputs
- Q: On the surface z = f(x, y), if you hold y fixed and vary only x, what are you measuring?
    [ ] A probability density value
    [ ] The determinant of the Hessian
    [ ] The inverse of the gradient vector
    [CORRECT] The partial derivative with respect to x

### Partial derivatives and the Gradient vector

- Q: For a function of two variables, what is the gradient?
    [CORRECT] The vector formed from its partial derivatives
    [ ] A single number measuring total curvature
    [ ] The ratio of the function to its variables
    [ ] The matrix of all second partial derivatives
- Q: To decrease a function's value as fast as possible in one tiny step, which direction should you move?
    [CORRECT] Along the negative gradient
    [ ] In any random direction
    [ ] Perpendicular to the gradient
    [ ] Along the gradient
- Q: At any point, the gradient of a function points in which direction?
    [ ] A direction perpendicular to every slope
    [ ] The direction of zero change
    [ ] The direction of steepest descent
    [CORRECT] The direction of steepest ascent
- Q: Why are gradients central to machine learning?
    [CORRECT] They give the direction for optimization steps like gradient descent
    [ ] They apply only to problems with exact analytic solutions
    [ ] They are useful only for plotting smooth continuous surfaces
    [ ] They completely remove the need for any algebra at all
- Q: Given $f(x,y)=x^{3}y^{2}$, what is $\frac{\partial f}{\partial x}$?
    [CORRECT] $3x^{2}y^{2}$
    [ ] $2x^{3}y$
    [ ] $3x^{2}y$
    [ ] $x^{3}y^{2}$

### Directional derivatives

- Q: Temperature in a room is given by T(x, y). To cool down as fast as possible with one tiny step from your current spot, which direction should you move?
    [ ] Along the gradient of T
    [ ] Any direction with a positive x-component
    [CORRECT] Opposite to the gradient of T
    [ ] Perpendicular to the gradient of T
- Q: Picture a room whose temperature varies from place to place, modeled by a function T(x, y). At a given point, in which direction does the gradient of T point?
    [CORRECT] The direction of steepest increase of T
    [ ] A direction perpendicular to every possible move
    [ ] A direction along which T does not change
    [ ] The direction of steepest decrease of T
- Q: Why does moving opposite to the gradient give the best single small step toward lower function values?
    [ ] Because it instantly resets both input coordinates to the value zero
    [CORRECT] Because it decreases the function the most per unit of distance moved
    [ ] Because it leaves all of the partial derivatives completely unchanged
    [ ] Because it always lands you exactly at the true minimum in one move
- Q: At the point $(1,2)$, the gradient of a function $f(x,y)$ is $\nabla f = (3,4)$. What is the directional derivative $D_{\vec{u}} f(1,2)$ in the direction $\vec{u} = (0,3)$?
    [CORRECT] $4$
    [ ] $0$
    [ ] $12$
    [ ] $\frac{12}{5}$
- Q: For a multivariable function f(x, y), what does a directional derivative measure?
    [CORRECT] The instantaneous rate of change of f as you move from a point in a chosen direction
    [ ] The determinant of the Hessian matrix of second partial derivatives of f at a point
    [ ] The coordinates of the specific point where f attains its global maximum value
    [ ] The total volume enclosed beneath the entire surface of f over its domain

### Higher-order derivatives and the Hessian matrix

- Q: At a critical point where every eigenvalue of the Hessian is positive, how is the Hessian classified and what is the local shape of the surface?
    [ ] Singular, giving a locally flat surface
    [CORRECT] Positive definite, giving a concave-up surface
    [ ] Orthogonal, giving a periodic surface
    [ ] Negative definite, giving a concave-down surface
- Q: For $f(x, y) = 2x^2 + 3y^2 - xy$, the Hessian is constant and positive definite everywhere. What does this tell you about the critical point?
    [CORRECT] The critical point is a local minimum
    [ ] The gradient and the Hessian are identical
    [ ] The critical point is a saddle point
    [ ] The mixed partial derivatives must be zero
- Q: In one variable, the second derivative test asks whether f''(x) > 0 at a critical point. What is the multivariable analogue of that single check?
    [CORRECT] Whether the Hessian's eigenvalues are all positive
    [ ] Whether every first partial derivative is equal
    [ ] Whether both x and y come out positive
    [ ] Whether the gradient's determinant is positive
- Q: For a scalar function of two variables f(x, y), what does its Hessian matrix contain?
    [CORRECT] All of the second-order partial derivatives of f
    [ ] The values of f sampled at four nearby points
    [ ] The reciprocals of the diagonal of the Jacobian
    [ ] All of the first-order partial derivatives of f

