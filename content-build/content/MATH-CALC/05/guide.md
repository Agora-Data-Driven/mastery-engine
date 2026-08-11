**The big idea**: **Optimization and Related rates** taught you the classical recipe for a minimum — differentiate, set the derivative to zero, solve. **Functions of several variables**, **Partial derivatives and the Gradient vector**, **Directional derivatives** and **Higher-order derivatives and the Hessian matrix** carried that machinery into many dimensions, and **Square loss and log loss functions** supplied the scalar worth minimizing. This lesson is what happens when the *solve* step stops being practical. With two parameters you can still solve exactly; with ten thousand, the exact solve is a linear system whose cost grows roughly with the cube of the number of variables. So you replace solving with **stepping**: evaluate the gradient where you stand, move against it, repeat. The cost you differentiate, the step rule, the single number that scales it, and the second-order alternative are all that one substitution worked out.

**Key concepts**

- **Gradients of cost functions (e.g., Mean Squared Error) start from the residual, and the residual is prediction minus observed.** For a line $y = mx + b$ and one point $(x_1, y_1)$ the residual before squaring is $mx_1 + b - y_1$: the model's prediction first, the observation subtracted. Least squares minimizes the **squared errors between the observed values and the line's predictions**, so the cost is $J(m,b) = \frac{1}{n}\sum_{i=1}^{n}(mx_i + b - y_i)^2$. Worked: points $(1,2), (2,3), (3,5)$ with $m=1, b=0.5$ predict $1.5, 2.5, 3.5$, giving residuals $-0.5, -0.5, -1.5$ and $J = (0.25+0.25+2.25)/3 = 0.9167$.

- **Squaring exists to stop errors cancelling.** Sum the *signed* residuals and a model that is $+10$ too high on one point and $-10$ too low on another scores $0$ — a perfect fit by that measure, while the squared total is $200$. Positive and negative errors cancel, hiding large mistakes; squaring makes every contribution non-negative and penalises one big miss more than several small ones. Absolute error also blocks cancellation, but squaring is differentiable everywhere.

- **The gradient is taken with respect to the parameters — nothing else moves.** By the chain rule, $\partial J/\partial m = \frac{2}{n}\sum (mx_i + b - y_i)x_i$ and $\partial J/\partial b = \frac{2}{n}\sum (mx_i + b - y_i)$. The inputs $x_i$, the observed $y_i$ and the number of observations $n$ are fixed data: an optimizer updates $m$ and $b$ and never touches them. On the numbers above, $\partial J/\partial m = \frac{2}{3}(-0.5 - 1.0 - 4.5) = -4.0$ and $\partial J/\partial b = \frac{2}{3}(-2.5) = -1.667$.

- **Introduction to Gradient Descent: new point = old point − α times the gradient.** In symbols $\theta_{k+1} = \theta_k - \alpha\,\nabla J(\theta_k)$. The minus sign is the whole idea — recall from **Directional derivatives** that $\nabla J$ points in the direction of steepest *increase*, so the steepest decrease is the exact opposite direction. The gradient must be evaluated **at the current point** before every step; it is a function of position, not a constant computed once. Worked, with $\alpha = 0.1$: $m \leftarrow 1 - 0.1(-4.0) = 1.4$ and $b \leftarrow 0.5 - 0.1(-1.667) = 0.667$, and the cost falls from $0.9167$ to $0.0800$ in that one step (the optimum is $m = 1.5$, $b = 0.333$, $J = 0.0556$).

- **Iterating is a cost decision, not an admission that no solution exists.** Least squares does have a closed form — the normal equations $\hat{\beta} = (X^{\top}X)^{-1}X^{\top}y$. Recall from linear algebra that solving that system is roughly $O(p^3)$, so at $p = 10{,}000$ it is about $10^{12}$ operations, while one gradient evaluation is a single pass over the data. Exact solutions get complicated in high dimensions; that, not their non-existence, is why iterative methods take over.

- **Learning rate and convergence: the gradient picks the direction, $\alpha$ scales the size of each step.** Take $J(\theta) = \theta^2$, so $\nabla J = 2\theta$ and the update collapses to $\theta \leftarrow (1 - 2\alpha)\theta$. That single factor classifies every behaviour you will be asked about. $\alpha = 0.05$ gives factor $0.90$: monotone but crawling ($1 \to 0.90 \to 0.81 \to 0.73$). $\alpha = 0.4$ gives $0.20$: fast. $\alpha = 0.9$ gives $-0.80$: the sign flips every step, so the iterate **overshoots and oscillates** across the minimum — $1 \to -0.80 \to 0.64 \to -0.51$ — yet the magnitude shrinks, so it converges. $\alpha = 1.1$ gives $-1.20$ and diverges: $1 \to -1.2 \to 1.44 \to -1.73$.

- **Reading a cost curve is a diagnosis.** A convex-cost sequence such as $2.5,\ 1.2,\ 1.8,\ 0.9,\ 1.4,\ 0.7$ zig-zags yet trends downward overall. That is the $\alpha = 0.9$ regime: **too large** — the updates overshoot the minimum and cause oscillations — but not divergent, because the peaks are falling. A steadily decreasing but painfully slow curve means $\alpha$ is too small; swings that keep growing mean divergence. On a convex cost a well-scaled step decreases monotonically, so any oscillation is a step-size symptom.

- **Convergence announces itself by the steps shrinking.** Near a minimum $\nabla J \to 0$, so the step $\alpha\nabla J$ shrinks with it and progress nearly stops — that stalling, not the cost reaching zero, is the signal you are close, and comparing successive steps against a tolerance is the usual stopping rule.

- **Choosing $\alpha$ well is genuinely unsolved.** No single method is guaranteed to work for every problem: there is no closed-form best learning rate, and the workable range depends on the curvature of the surface, which varies from problem to problem and from point to point. Practice is empirical — sweep a few values on a log scale and watch the cost curve.

- **On a non-convex surface, descent is a local rule, so it can get trapped in a local minimum.** It sees only the gradient at the current point, so it settles into whichever basin it started in and cannot know a deeper one exists. Worked: $f(x) = x^4 - 4x^2 + 0.5x$. From $x_0 = 1$ descent converges to $x \approx 1.382$, $f \approx -3.301$; from $x_0 = -1$ the same algorithm with the same $\alpha$ reaches $x \approx -1.445$, $f \approx -4.715$. Two runs from different points on a surface with several valleys **may settle into different local minima**. The practical remedy is **random restarts**: search from many different starting points and keep the best result found.

- **Newton's Method for optimization fits a parabola and jumps to its vertex.** Extend the tangent-line approximation one order: $q(x) = g(x_k) + g'(x_k)(x - x_k) + \tfrac{1}{2}g''(x_k)(x-x_k)^2$. Set $q'(x) = g'(x_k) + g''(x_k)(x-x_k) = 0$ and solve: $x_{k+1} = x_k - \frac{g'(x_k)}{g''(x_k)}$. It uses $g'$ and $g''$ rather than $g$ itself because **minima occur where $g'(x) = 0$, and $g''$ confirms the type** — this is root-finding applied to the *derivative*, which is why it is not the familiar $x_k - g(x_k)/g'(x_k)$ that hunts zeros of $g$.

- **When it works, it reaches a near-exact answer in only a few iterations.** Minimizing $g(x) = x^4 - 4x$ (true minimum $x = 1$) from $x_0 = 2$: Newton gives $1.4167, 1.1105, 1.0106, 1.000112$ — errors $0.42, 0.11, 0.011, 0.0001$, each roughly the square of the last, so the correct digits double every step. Gradient descent with $\alpha = 0.02$ needs about 30 iterations for the same accuracy. On a genuinely quadratic cost Newton lands exactly on the minimum in **one** step, because there the parabola model *is* the function.

- **In several variables the Hessian matrix takes the place of $g''$, and the order of the product matters.** The update is $\mathbf{x}_{k+1} = \mathbf{x}_k - H^{-1}\nabla g$. Check the shapes: $H^{-1}$ is $n \times n$ and $\nabla g$ is $n \times 1$, so $H^{-1}\nabla g$ is $n \times 1$ and can be subtracted from a point. Reversed, a column gradient cannot left-multiply the inverse Hessian — $(n \times 1)(n \times n)$ is undefined. The price is scale: storing and inverting $H$ costs $O(n^2)$ memory and $O(n^3)$ work per step, which is why models with millions of parameters stay first-order. And Newton chases *critical points*: if $H$ is not positive definite the step can march toward a maximum or a saddle.

**Rules to remember**

- Residual = prediction − observed = $mx_i + b - y_i$. Least squares minimizes those squared.
- Square the errors because signed errors cancel and hide large mistakes.
- Gradient descent updates the **parameters** $m$ and $b$; the data $x_i$, $y_i$, $n$ are constants.
- The update is new point = old point − $\alpha$ × gradient, with the gradient re-evaluated at the current point every step.
- Iterate because exact solutions get expensive in high dimensions — not because none exists.
- $\alpha$ scales the step; the gradient sets the direction.
- Oscillating cost with a downward trend = $\alpha$ too large. Slow monotone = too small. Growing swings = divergence.
- Shrinking steps and stalled progress mean you are near a minimum.
- Non-convex surface: descent can be trapped in a local minimum, and different starts give different answers. Restart from many points.
- Newton needs no learning rate: the curvature $g''$ sets the step size for you.
- Newton: $x_{k+1} = x_k - g'(x_k)/g''(x_k)$ in one variable; $\mathbf{x} - H^{-1}\nabla g$ in several. Inverse Hessian on the **left**.

**Common pitfalls**

- **Writing the residual as observed minus prediction when the question says prediction minus observed.** Squaring hides the sign; the gradient and the answer options do not.
- **Believing least squares has no closed-form solution.** It does. The argument for iterating is cost in high dimensions.
- **Adding $\alpha$ times the gradient.** That is gradient *ascent*; it climbs.
- **Computing the gradient once and reusing it.** It is a function of position; a stale gradient is a wrong direction after the first step.
- **Reading any oscillation as divergence.** Falling peaks with a downward trend mean an overshooting-but-converging step size.
- **Blaming a small learning rate for a bumpy loss curve.** Too small produces slow, smooth, monotone decrease — never zig-zags.
- **Expecting one good run to find the global minimum of a non-convex cost.** It finds a local one. Restarts, not a bigger $\alpha$, are the answer.
- **Using $g$ itself in the Newton update, or reversing the matrix product.** Optimization seeks zeros of $g'$, and $\nabla g\,H^{-1}$ is not even a defined product.
- **Assuming Newton is always better.** It costs $O(n^3)$ per step and converges to whichever critical point it finds.

**How to approach the questions**

1. For any update-rule question, check the sign and what is updated: minus the gradient, applied to the parameters.
2. For "why iterate" questions, choose the option about **cost in high dimensions**. Options claiming no exact solution exists, or that iterating removes the need for derivatives, are the distractors.
3. For a cost sequence, look at two things separately — the local pattern (monotone or zig-zag) and the overall trend (down or up). Zig-zag plus down means the step size is too large.
4. For learning-rate questions, remember $\alpha$ only scales: it cannot create a gradient, turn a maximum into a minimum, or choose coordinates.
5. For non-convexity, the safe answers are "may reach different local minima" and "restart from many points". Anything guaranteeing the global minimum is wrong.
6. For Newton, first decide whether the problem is root-finding ($g/g'$) or optimization ($g'/g''$), then map it up: gradient replaces $g'$, Hessian replaces $g''$, inverse Hessian on the left.

**Where this leads**: the next and final lesson, **06 Calculus in Neural Networks**, supplies the missing piece. This lesson assumed you could obtain $\nabla J$ — easy for a line, hopeless by hand for a network with millions of weights. Activations and activation functions build the cost as a long composition, computational graphs and the chain rule in graphs give it a data structure, and backpropagation computes every partial derivative in roughly one extra forward pass. The loop stays exactly the one you have just learned — evaluate the gradient, step against it, watch the learning rate — with a far better gradient factory bolted to its front.
