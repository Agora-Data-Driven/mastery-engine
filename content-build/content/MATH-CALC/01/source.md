# SOURCE PACK — Mathematics / Calculus / 01 Limits and continuity

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Estimating limits and one-sided limits   (10 questions)
2. Limits by direct substitution, factoring, and conjugates   (10 questions)
3. The Squeeze Theorem   (9 questions)
4. Limits of trigonometric functions   (10 questions)
5. Types of discontinuities   (10 questions)
6. Intermediate Value Theorem (IVT)   (10 questions)

## Covered by LATER lessons — do not teach these here

- 02 Derivatives: Derivative as slope and rate of change, Derivative rules (Power rule, Product, Quotient), Derivatives of sin(x) and cos(x), Chain Rule and Implicit differentiation, Higher-order derivatives and Second derivatives, Tangent lines and linear approximations, Optimization and Related rates, Square loss and log loss functions
- 03 Integrals: Riemann sums (Left, Right, Midpoint, Trapezoidal), Definite integrals and the Fundamental Theorem of Calculus, Antiderivatives and Indefinite integrals, Reverse Power Rule, Indefinite integrals of ex,1/x,sin, and cos, u-substitution, Area between curves
- 04 Multivariate Calculus: Functions of several variables, Partial derivatives and the Gradient vector, Directional derivatives, Higher-order derivatives and the Hessian matrix
- 05 Optimization in Higher Dimensions: Gradients of cost functions (e.g., Mean Squared Error), Introduction to Gradient Descent, Learning rate and convergence, Newton's Method for optimization
- 06 Calculus in Neural Networks: Activations and Activation Functions, Computational graphs and the Chain Rule in graphs, Backpropagation algorithm math

## The live quiz bank for these topics — 59 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Estimating limits and one-sided limits

- Q: Suppose the left-hand and right-hand limits of f at x = c are both equal to L. Which statement about f(c) is true?
    [ ] f(c) cannot differ from L under any circumstance
    [ ] f(c) must be defined for the limit to equal L
    [ ] f(c) must equal L for the limit to equal L
    [CORRECT] f(c) need not be defined for the limit to equal L
- Q: Which situation guarantees that $\lim_{x \to a} f(x)$ fails to exist?
    [CORRECT] The left-hand and right-hand limits differ
    [ ] The limit happens to equal $f(a)$
    [ ] The value $f(a)$ is undefined
    [ ] The graph has a single hole at $x = a$
- Q: If $\lim_{x \to a^-} f(x) = \infty$ and $\lim_{x \to a^+} f(x) = \infty$, how is the two-sided limit $\lim_{x \to a} f(x)$ categorized in standard calculus?
    [ ] It exists, because both one-sided behaviors agree
    [CORRECT] It does not exist, since $\infty$ is not a real number
    [ ] It does not exist, because $f$ must be undefined there
    [ ] It exists and equals the specific value $\infty$
- Q: Which statement best describes a one-sided limit of f at x = a?
    [ ] The value of f(a) evaluated at the point itself
    [ ] The slope of the tangent line at x = a
    [CORRECT] The value f(x) approaches from just one side of a
    [ ] Whether the graph of f crosses the x-axis
- Q: When estimating a limit from a table of values, which behavior of the function can make the numbers appear to settle on a limit that does not actually exist?
    [ ] A finite jump in the function value at the target point
    [ ] The function being constant on just one side of the point
    [CORRECT] Rapid oscillation of the function near the target point
    [ ] A vertical asymptote located exactly at the target point
- Q: A table shows $f(x)$ approaching 7 as $x \to 4$ from both sides, yet $f(4) = 10$. What is $\lim_{x \to 4} f(x)$?
    [ ] 17
    [ ] Does not exist
    [ ] 10
    [CORRECT] 7
- Q: Which condition rigorously defines the right-hand limit statement $\lim_{x \to a^+} f(x) = L$?
    [ ] f(a) is defined and equals the limiting value L
    [CORRECT] f(x) stays arbitrarily close to L for x just above a
    [ ] f(a) equals the right-hand limit since f is continuous
    [ ] f(x) is exactly equal to L at every point right of a
- Q: A graph approaches 3 as $x o 2$ from the left and 5 as $x o 2$ from the right. What can be concluded about $\lim_{x o 2} f(x)$?
    [ ] The limit equals 5
    [CORRECT] The two-sided limit does not exist
    [ ] The limit equals 3
    [ ] The limit equals the average, 4
- Q: If $\lim_{x \to 1^-} f(x) = 2$ and $\lim_{x \to 1^+} f(x) = 2$, what is $\lim_{x \to 1} f(x)$?
    [ ] 1
    [ ] 0
    [ ] Cannot be determined
    [CORRECT] 2
- Q: Given $\lim_{x \to c^+} f(x) = A$ and $\lim_{x \to c^+} g(x) = B$, which conclusion about $h(x) = f(x) + g(x)$ is always valid?
    [CORRECT] The right-hand limit of h at c equals $A + B$
    [ ] The left-hand limit of h at c equals $A + B$
    [ ] The two-sided limit of h at c equals $A + B$
    [ ] The function h is continuous at c with value $A + B$

### Limits by direct substitution, factoring, and conjugates

- Q: Evaluate the limit $\lim_{x \to 0} \frac{\sqrt{x + 9} - 3}{x}$.
    [ ] $0$
    [ ] $1/3$
    [ ] $1/9$
    [CORRECT] $1/6$
- Q: Evaluate the limit $\lim_{x \to 1} \frac{x^3 - 1}{x - 1}$.
    [ ] 0
    [CORRECT] 3
    [ ] 1
    [ ] 2
- Q: For which value of $c$ does $\lim_{x \to 3} \frac{x^2 - c}{x - 3}$ evaluate to a finite real number?
    [ ] $c = 12$
    [ ] $c = 3$
    [ ] $c = 6$
    [CORRECT] $c = 9$
- Q: Which technique most directly evaluates $\lim_{x \to 3} \frac{x^2 - 9}{x - 3}$, where substitution gives $\frac{0}{0}$?
    [ ] Substitute $x = 3$ directly into the fraction
    [CORRECT] Factor and cancel the common $(x - 3)$ term
    [ ] Multiply by the conjugate of the numerator
    [ ] Conclude the limit does not exist at $x = 3$
- Q: Evaluate $\lim_{x \to 4} \frac{\sqrt{x} - 2}{x - 4}$ by multiplying by the conjugate.
    [ ] The limit equals 4
    [ ] The limit equals 1/2
    [ ] The limit equals 2
    [CORRECT] The limit equals 1/4
- Q: Evaluate $\lim_{x \to 2} \frac{x^2 + x - 6}{x - 2}$.
    [CORRECT] The limit equals $5$
    [ ] The limit does not exist
    [ ] The limit equals $4$
    [ ] The limit equals $-5$
- Q: Evaluate $\lim_{x \to 3} \frac{x^2 - 9}{x - 3}$.
    [ ] The limit equals 9
    [ ] The limit does not exist
    [ ] The limit equals 3
    [CORRECT] The limit equals 6
- Q: What is the purpose of factoring $\frac{x^2 - 5x + 6}{x - 2}$ before taking the limit as $x \to 2$?
    [ ] To find the removable hole's coordinates
    [ ] To locate the vertical asymptote
    [CORRECT] To resolve the $\frac{0}{0}$ indeterminate form
    [ ] To measure the graph's horizontal shift
- Q: Direct substitution evaluates $\lim_{x \to 2} (x^2 + 3x - 1)$ immediately because:
    [ ] The function is rational with a hole at 2
    [CORRECT] A polynomial is continuous everywhere
    [ ] The conjugate clears the indeterminate form
    [ ] The denominator becomes zero at x = 2
- Q: When a limit involving a radical gives the indeterminate form 0/0, why is multiplying by the conjugate helpful?
    [ ] It removes any need for further algebraic steps
    [ ] It produces a common denominator for the two terms
    [ ] It rewrites the radical as a simple linear polynomial
    [CORRECT] It forms a difference of squares that clears the radical

### The Squeeze Theorem

- Q: To find the limit of $f(x) = x^2 \cdot \sin(1/x)$ as $x \to 0$ via the Squeeze Theorem, which pair of bounding functions is typically used?
    [ ] The reciprocals $g(x) = -1/x$ and $h(x) = 1/x$
    [ ] The constants $g(x) = -1$ and $h(x) = 1$
    [ ] The lines $g(x) = -x$ and $h(x) = x$
    [CORRECT] The quadratics $g(x) = -x^2$ and $h(x) = x^2$
- Q: The Squeeze Theorem applies most directly when a function is:
    [CORRECT] Bounded between two functions sharing one limit
    [ ] Expressible as a product of two polynomials
    [ ] Differentiable on the entire interval of interest
    [ ] Equal to a logarithm that must be simplified
- Q: Given bounds $g(x) \le f(x) \le h(x)$ near $c$, which condition on the bounding functions $g(x)$ and $h(x)$ lets the Squeeze Theorem pin down the limit of $f$ at $c$?
    [ ] Their y-intercepts must coincide exactly
    [ ] Their derivatives at $c$ must coincide
    [ ] Their domains of definition must coincide
    [CORRECT] Their limits at $c$ must coincide
- Q: Using the Squeeze Theorem, $\lim_{x \to 0} x \cdot \sin(1/x)$ equals:
    [ ] The limit equals 1
    [CORRECT] The limit equals 0
    [ ] The limit equals $-1$
    [ ] The limit does not exist
- Q: Which condition on f(x) is a genuine prerequisite for applying the Squeeze Theorem to evaluate its limit at a point c?
    [ ] f(x) must stay positive across its whole domain
    [CORRECT] f(x) must be defined on an open interval around c
    [ ] f(x) must be strictly monotonic near c
    [ ] f(x) must be differentiable at the point c
- Q: Using the bounds $-\frac{1}{x} \le \frac{\sin(x)}{x} \le \frac{1}{x}$ for $x > 0$, what is the limit of $f(x) = \frac{\sin(x)}{x}$ as $x \to \infty$?
    [ ] The limit equals positive one
    [ ] The limit oscillates forever
    [ ] The limit diverges to infinity
    [CORRECT] The limit converges to zero
- Q: If $-x^2 \le f(x) \le x^2$ for all $x$ near $0$, then $\lim_{x \to 0} f(x)$ equals:
    [CORRECT] The limit equals $0$
    [ ] The limit equals $-1$
    [ ] The limit does not exist
    [ ] The limit equals $1$
- Q: What fact lets you squeeze $x \cdot \sin(1/x)$ to find its limit as $x \to 0$?
    [ ] $\sin(1/x)$ equals $1/x$ for small $x$
    [ ] $\sin(1/x)$ is continuous at $x = 0$
    [CORRECT] $\sin(1/x)$ stays bounded in $[-1, 1]$
    [ ] $x$ is a nonzero constant near $0$
- Q: In the Squeeze Theorem, what is the primary analytical role of the outer bounding functions g(x) and h(x)?
    [ ] They fix the symmetry of f(x) during the calculation
    [ ] They supply the slope of f(x) at the limiting point
    [ ] They set the domain of f(x) over a connected interval
    [CORRECT] They confine the values of f(x) toward a single limit

### Limits of trigonometric functions

- Q: Which algebraic rewrite lets you apply $\lim_{u \to 0} \sin(u)/u = 1$ to evaluate $\lim_{x \to 0} \sin(7x)/x$?
    [CORRECT] $\sin(7x)/x = 7 \cdot \sin(7x)/(7x)$
    [ ] $\sin(7x)/x = \sin(x)/(7x)$
    [ ] $\sin(7x)/x = 7 \cdot \cos(7x)$
    [ ] $\sin(7x)/x = \cos(7x)/7$
- Q: Evaluate the limit $\lim_{x \to 0} \frac{\tan(3x)}{\sin(5x)}$.
    [ ] 0
    [ ] $\frac{5}{3}$
    [ ] 1
    [CORRECT] $\frac{3}{5}$
- Q: Evaluate $\lim_{x \to 0} \frac{\sin(3x)}{x}$.
    [ ] The limit equals $1$
    [ ] The limit does not exist
    [ ] The limit equals $0$
    [CORRECT] The limit equals $3$
- Q: Evaluate the limit $\lim_{x \to 0} \frac{1 - \cos(x)}{x^2}$.
    [CORRECT] $\frac{1}{2}$
    [ ] $1$
    [ ] $\frac{1}{4}$
    [ ] $0$
- Q: Evaluate the limit $\lim_{x \to \pi} \frac{\sin(x)}{x - \pi}$ using a substitution such as $u = x - \pi$.
    [ ] Does not exist
    [CORRECT] $-1$
    [ ] $0$
    [ ] $+1$
- Q: Which inequality bounds $\frac{\sin(x)}{x}$ in the Squeeze Theorem proof that $\lim_{x \to 0} \frac{\sin(x)}{x} = 1$ (for $x$ near $0$)?
    [ ] $\sec(x) < \frac{\sin(x)}{x} < 1$
    [CORRECT] $\cos(x) < \frac{\sin(x)}{x} < 1$
    [ ] $\tan(x) < \frac{\sin(x)}{x} < 1$
    [ ] $\sin(x) < \frac{\sin(x)}{x} < 1$
- Q: Which equation is the foundational trigonometric limit used to evaluate sine-based indeterminate forms?
    [ ] $\lim_{x \to 0} \frac{\tan(x)}{x} = 0$
    [CORRECT] $\lim_{x \to 0} \frac{\sin(x)}{x} = 1$
    [ ] $\lim_{x \to 0} \frac{\cos(x)}{x} = 1$
    [ ] $\lim_{x \to 0} \frac{x}{\sin(x)} = 0$
- Q: Evaluate $\lim_{x \to 0} \frac{1 - \cos(x)}{x}$.
    [ ] The limit does not exist
    [CORRECT] The limit equals $0$
    [ ] The limit equals $1$
    [ ] The limit is infinite
- Q: Evaluate the limit $\lim_{x \to 0} \frac{\sin(4x)}{\tan(2x)}$.
    [ ] 4
    [CORRECT] 2
    [ ] 1
    [ ] 0.5
- Q: Evaluate $\lim_{x \to 0} \frac{\sin(5x)}{5x}$.
    [ ] The limit does not exist
    [ ] The limit equals 5
    [CORRECT] The limit equals 1
    [ ] The limit equals 0

### Types of discontinuities

- Q: If g(x) has a jump discontinuity at x = c and f is strictly monotonic and continuous, what is the discontinuity of the composition f(g(x)) at x = c?
    [ ] An oscillating discontinuity, provided that f is a periodic function
    [ ] An infinite discontinuity, provided that f is a linear polynomial
    [ ] A removable discontinuity, since f closes the gap left by g at c
    [CORRECT] A jump discontinuity, since the one-sided limits map to distinct values
- Q: For a rational function f(x) = P(x)/Q(x), which condition makes x = a a removable discontinuity?
    [ ] The factor (x-a) is in Q to a higher power than it is in P
    [ ] The factor (x-a) is only in P, giving a root rather than a break
    [CORRECT] The factor (x-a) appears in both P and Q and cancels completely
    [ ] The factor (x-a) is only in Q, making the function grow unbounded
- Q: Under exactly which condition is a discontinuity of a function at x = c classified as an infinite discontinuity?
    [ ] The function is undefined there and its limit fails to exist
    [CORRECT] At least one one-sided limit is positive or negative infinity
    [ ] Both the left-hand and right-hand limits must be positive infinity
    [ ] The function approaches a finite value from just one side only
- Q: What distinguishes an oscillating discontinuity of a function as the input x approaches a value c?
    [CORRECT] The values fluctuate between bounds without settling on a limit
    [ ] The values grow without bound as the input approaches the point
    [ ] The values jump between two distinct finite limits at the point
    [ ] The values approach a single limit unequal to the defined value
- Q: For $f(x) = \frac{x^2 - 1}{x - 1}$ defined only where $x \neq 1$, what type of discontinuity occurs at $x = 1$?
    [ ] An infinite discontinuity
    [CORRECT] A removable discontinuity
    [ ] No discontinuity at all
    [ ] A jump discontinuity
- Q: If the left-hand and right-hand limits both exist but are unequal, the discontinuity is classified as:
    [CORRECT] A jump discontinuity
    [ ] An infinite discontinuity
    [ ] No discontinuity at all
    [ ] A removable discontinuity
- Q: Which condition makes a discontinuity at x = a removable rather than essential?
    [ ] The graph oscillates endlessly near a
    [ ] The function grows without bound near a
    [ ] The one-sided limits at a are unequal values
    [CORRECT] The limit at a exists but f(a) is missing or wrong
- Q: On a graph, a removable discontinuity appears as:
    [ ] A jump between two heights
    [ ] An endpoint of the domain
    [ ] A vertical asymptote line
    [CORRECT] A single hole at one point
- Q: A rational function with denominator (x − 2) and a nonzero numerator at x = 2 has what type of discontinuity at x = 2?
    [ ] An oscillating discontinuity
    [ ] A removable discontinuity
    [CORRECT] An infinite discontinuity
    [ ] A jump discontinuity
- Q: Why does f(x) = |x-3|/(x-3) fail to be continuous at x = 3, in terms of limits?
    [ ] The two-sided limit fails because the function grows unbounded
    [ ] The two-sided limit exists but the value is set to a different real
    [ ] The two-sided limit exists but the function is undefined there
    [CORRECT] The two-sided limit fails because the one-sided limits differ

### Intermediate Value Theorem (IVT)

- Q: Why does the IVT fail for a function that has a hole (removable discontinuity) inside the interval?
    [ ] Because negative x-values can appear inside the interval
    [CORRECT] Because a break lets the function skip intermediate values
    [ ] Because the interval endpoints are excluded from the domain
    [ ] Because a removable hole makes it nondifferentiable there
- Q: Let f be continuous on [1, 5] with f(1) = 10 and f(5) = 10. Which single condition guarantees, via the IVT, that f(c) = 5 for some c in (1, 5)?
    [CORRECT] f drops below 5 at some interior point
    [ ] f stays strictly monotonic on the interval
    [ ] f has a negative average rate of change
    [ ] f is differentiable at every interior point
- Q: A continuous function f has no roots anywhere on [2, 6]. By the IVT, what must be true of the endpoint values f(2) and f(6)?
    [CORRECT] They must carry the same sign
    [ ] They must be integers if f is linear
    [ ] They must be the global extrema of f
    [ ] They must exceed the interval length
- Q: For a continuous f on [0, 5] with f(0) = -2 and f(5) = 10, the IVT guarantees at least one root. What is a key limitation of what it tells you?
    [ ] It cannot fix the sign outside the interval
    [CORRECT] It gives no count of how many roots exist
    [ ] It cannot confirm differentiability anywhere
    [ ] It cannot bound the maximum on the interval
- Q: Functions f and g are continuous on [a, b] with f(a) < g(a) and f(b) > g(b). Applying the IVT to f - g, what must hold on (a, b)?
    [ ] They never meet but share a limit
    [CORRECT] The two graphs cross at least once
    [ ] They share an equal derivative somewhere
    [ ] They are equal only at the midpoint
- Q: Let f be continuous and map the closed interval [0, 1] into [0, 1]. Applying the Intermediate Value Theorem to g(x) = f(x) - x, which statement is guaranteed?
    [CORRECT] Some point satisfies input equal to output
    [ ] Some point has a derivative equal to zero
    [ ] Some point's output equals the minimum
    [ ] Some point's output equals the maximum
- Q: A student claims the IVT proves f has a root on [1, 2] because f is continuous with f(1) = 3 and f(2) = 5. Why is this reasoning flawed?
    [ ] The IVT applies only to derivatives, not values
    [ ] The interval [1, 2] is too short to apply it
    [ ] The function would first need to be a polynomial
    [CORRECT] The value 0 does not lie between f(1) and f(2)
- Q: If f is continuous on [-2, 3] with f(-2) = -1 and f(3) = 4, which conclusion does the IVT guarantee?
    [CORRECT] There is a c in (-2, 3) with f(c) = 0
    [ ] No value of f can be guaranteed here
    [ ] There is a c in (-2, 3) with f'(c) = 0
    [ ] There is a c in (-2, 3) with f(c) = 5
- Q: Under which condition on a function f does the Intermediate Value Theorem apply on an interval [a, b]?
    [CORRECT] f is continuous on the closed interval [a, b]
    [ ] f is differentiable on the open interval (a, b)
    [ ] f is monotonic somewhere on [a, b]
    [ ] f is linear on the open interval (a, b)
- Q: If f is continuous on [1, 4] with f(1) = 2 and f(4) = 9, which target value is the IVT guaranteed to be attained by f somewhere on the interval?
    [ ] 12
    [ ] 0
    [CORRECT] 5
    [ ] -3

