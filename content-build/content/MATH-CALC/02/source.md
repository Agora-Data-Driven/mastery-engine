# SOURCE PACK — Mathematics / Calculus / 02 Derivatives

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Derivative as slope and rate of change   (12 questions)
2. Derivative rules (Power rule, Product, Quotient)   (13 questions)
3. Derivatives of sin(x) and cos(x)   (11 questions)
4. Chain Rule and Implicit differentiation   (13 questions)
5. Higher-order derivatives and Second derivatives   (5 questions)
6. Tangent lines and linear approximations   (8 questions)
7. Optimization and Related rates   (10 questions)
8. Square loss and log loss functions   (4 questions)

## Already taught earlier in this course

- Estimating limits and one-sided limits
- Limits by direct substitution, factoring, and conjugates
- The Squeeze Theorem
- Limits of trigonometric functions
- Types of discontinuities
- Intermediate Value Theorem (IVT)

## Covered by LATER lessons — do not teach these here

- 03 Integrals: Riemann sums (Left, Right, Midpoint, Trapezoidal), Definite integrals and the Fundamental Theorem of Calculus, Antiderivatives and Indefinite integrals, Reverse Power Rule, Indefinite integrals of ex,1/x,sin, and cos, u-substitution, Area between curves
- 04 Multivariate Calculus: Functions of several variables, Partial derivatives and the Gradient vector, Directional derivatives, Higher-order derivatives and the Hessian matrix
- 05 Optimization in Higher Dimensions: Gradients of cost functions (e.g., Mean Squared Error), Introduction to Gradient Descent, Learning rate and convergence, Newton's Method for optimization
- 06 Calculus in Neural Networks: Activations and Activation Functions, Computational graphs and the Chain Rule in graphs, Backpropagation algorithm math

## The live quiz bank for these topics — 76 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Derivative as slope and rate of change

- Q: What does the derivative of a function at a point primarily represent?
    [ ] The y-intercept value where the function crosses the axis
    [ ] The average value of the function over an interval
    [ ] The signed area accumulated under the function's curve
    [CORRECT] The tangent-line slope, the instantaneous rate of change
- Q: For the function $g(x) = \sqrt{x}$, the expression below calculates a specific numerical value. What is the primary geometric interpretation of this value? $$\lim_{h \to 0} \frac{\sqrt{4+h} - \sqrt{4}}{h}$$
    [CORRECT] The slope of the tangent line to the graph of $g(x)$ at the point where $x=4$.
    [ ] The y-coordinate of the graph of $g(x)$ at the point where $x=4$.
    [ ] The slope of a secant line to the graph of $g(x)$ through the point where $x=4$.
    [ ] The average slope of the graph of $g(x)$ over the interval from $x=0$ to $x=4$.
- Q: In the difference quotient definition of the derivative at x, what geometric transition occurs as the step h approaches zero?
    [ ] The tangent through (x, f(x)) and (x+h, f(x+h)) approaches the secant line at x.
    [ ] The normal through (x, f(x)) and (x+h, f(x+h)) approaches the tangent line at x.
    [ ] The secant through (x, f(x)) and (x+h, f(x+h)) approaches the normal line at x.
    [CORRECT] The secant through (x, f(x)) and (x+h, f(x+h)) approaches the tangent line at x.
- Q: If $f(x) = x^2$, what is the value of $f'(2)$?
    [CORRECT] 4
    [ ] 2
    [ ] 16
    [ ] 8
- Q: For the linear function h(t) = 5t - 1, what is its instantaneous rate of change?
    [ ] 0
    [ ] 1
    [ ] It depends on the value of t
    [CORRECT] 5
- Q: At a sharp corner or cusp of an otherwise continuous function f, why is the derivative undefined there?
    [ ] The tangent line there is exactly vertical, giving an indeterminate slope.
    [ ] The difference quotient's limit grows to infinity as the step shrinks to zero.
    [ ] The function's values jump discontinuously relative to the nearby interval.
    [CORRECT] The difference quotient's one-sided limits from the left and right disagree.
- Q: Which expression is the difference quotient of a function f at the point x?
    [ ] f(x)/h
    [ ] f(x + h) - f(x)
    [ ] f'(x + h)
    [CORRECT] [f(x + h) - f(x)]/h
- Q: For a strictly concave-up (convex) function f on [a, b], how does the derivative f'(a) at the left endpoint compare to the average rate of change of f across [a, b]?
    [CORRECT] f'(a) is strictly less than the average rate of change over [a, b].
    [ ] f'(a) is inversely related to the average rate of change over [a, b].
    [ ] f'(a) is strictly greater than the average rate of change over [a, b].
    [ ] f'(a) is exactly equal to the average rate of change over [a, b].
- Q: If $s(t) = t^2 + 3t$, what is the average rate of change of $s$ from $t = 1$ to $t = 3$?
    [CORRECT] 7
    [ ] 4
    [ ] 10
    [ ] 6
- Q: Suppose f'(x) > 0 and f''(x) < 0 for every x. Which statement best describes the behavior of f?
    [ ] Its values fall, while its tangent's steepness steadily declines.
    [CORRECT] Its values rise, while its tangent's steepness steadily declines.
    [ ] Its values fall, while its tangent's steepness steadily grows.
    [ ] Its values rise, while its tangent's steepness steadily grows.
- Q: If V(r) is the volume of a sphere of radius r, what does the derivative V'(r) represent physically?
    [CORRECT] The rate of change of volume per unit radius, equal to the surface area.
    [ ] The rate of change of radius per unit volume, equal to the circumference.
    [ ] The rate of change of radius per unit volume, equal to the surface area.
    [ ] The rate of change of volume per unit radius, equal to the circumference.
- Q: The value of a stock is modeled by the function $V(t)$, where $t$ is the number of days after purchase. A financial analyst calculates two quantities: $Q_1 = V'(30)$ and $Q_2 = \frac{V(60) - V(0)}{60}$. Which statement correctly interprets these quantities?
    [CORRECT] $Q_1$ represents the stock's instantaneous rate of change at $t=30$, while $Q_2$ represents its average rate of change over the interval $[0, 60]$.
    [ ] $Q_1$ represents the stock's average rate of change over the interval $[0, 30]$, while $Q_2$ represents its instantaneous rate of change at $t=60$.
    [ ] $Q_1$ represents the stock's value at $t=30$, while $Q_2$ represents the total change in its value from $t=0$ to $t=60$.
    [ ] $Q_1$ represents the stock's exact rate of change at $t=30$, while $Q_2$ is a secant slope used to approximate the rate of change at $t=30$.

### Derivative rules (Power rule, Product, Quotient)

- Q: If $f(x) = x^5$, what is $f'(x)$ by the power rule?
    [CORRECT] $5x^4$
    [ ] $5x$
    [ ] $x^6$
    [ ] $x^4$
- Q: Differentiate $f(x) = \frac{x^2 + 1}{x}$ with respect to $x$.
    [ ] $x + 1$
    [ ] $1 + \frac{1}{x^2}$
    [CORRECT] $1 - \frac{1}{x^2}$
    [ ] $\frac{2}{x}$
- Q: Compute the derivative of $f(x) = x^{e}$, where $e$ is a constant.
    [CORRECT] $e x^{e-1}$
    [ ] $x^{e} \ln x$
    [ ] $e x^{e}$
    [ ] $x^{e-1}$
- Q: Which of the following is a common error when differentiating a quotient f(x)/g(x)?
    [ ] Placing the denominator squared underneath
    [ ] Rewriting negative powers before differentiating
    [CORRECT] Differentiating top and bottom separately, then dividing
    [ ] Applying the power rule to each separate term
- Q: Differentiate $f(x) = x^2(x + 1)$ with respect to $x$.
    [CORRECT] $3x^2 + 2x$
    [ ] $x^3 + x^2$
    [ ] $3x^2 + 1$
    [ ] $2x + 1$
- Q: Which differentiation rule is the appropriate one to use for $f(x) = (x^2 + 1)(x^3 - 4)$?
    [ ] The quotient rule
    [ ] The power rule alone
    [ ] The chain rule alone
    [CORRECT] The product rule
- Q: For a nonzero differentiable function $f(x)$, which expression gives the derivative of $y = \frac{1}{f(x)}$?
    [ ] $-\frac{1}{[f'(x)]^2}$
    [ ] $\frac{1}{[f'(x)]^2}$
    [CORRECT] $-\frac{f'(x)}{[f(x)]^2}$
    [ ] $\frac{f'(x)}{[f(x)]^2}$
- Q: How does the derivative of a product f(x)g(x) compare with the simple product of the two derivatives f'(x)g'(x)?
    [ ] It can be obtained using only the quotient rule instead.
    [ ] It can be obtained using only the power rule instead.
    [CORRECT] It also includes terms built from the original functions.
    [ ] It excludes any terms built from the original functions.
- Q: Let $f$ and $g$ be differentiable functions with the following values at $x=2$: $f(2)=3$, $f'(2)=4$, $g(2)=5$, $g'(2)=6$. If $h(x)=f(x)g(x)$, what is $h'(2)$?
    [ ] $24$
    [ ] $20$
    [ ] $18$
    [CORRECT] $38$
- Q: At which x-coordinates does the function $f(x) = \frac{x}{x^2 + 1}$ have a horizontal tangent line?
    [CORRECT] At $x = 1$ and $x = -1$
    [ ] At $x = 1$ and $x = 0$
    [ ] At $x = 2$ and $x = -2$
    [ ] At $x = 0$ and $x = -1$
- Q: Suppose $h(x) = x^2 g(x)$. If $g(1) = 4$ and $g'(1) = 2$, what is the value of $h'(1)$?
    [ ] $12$
    [ ] $6$
    [CORRECT] $10$
    [ ] $8$
- Q: When the power rule is applied once to every term of a polynomial P(x) of degree n (with n >= 1), how does the polynomial's degree change?
    [ ] The degree drops straight to zero.
    [CORRECT] The degree decreases by exactly one.
    [ ] The degree increases by exactly one.
    [ ] The degree stays exactly the same.
- Q: A student applies the quotient rule to differentiate $y = \frac{3x^2+2x}{x^3}$. Which expression is the correct unsimplified derivative?
    [CORRECT] $\frac{x^3(6x+2) - (3x^2+2x)(3x^2)}{x^6}$
    [ ] $\frac{x^3(6x+2) + (3x^2+2x)(3x^2)}{x^6}$
    [ ] $\frac{(3x^2+2x)(3x^2) - x^3(6x+2)}{x^6}$
    [ ] $\frac{x^3(6x+2) - (3x^2+2x)(3x^2)}{x^3}$

### Derivatives of sin(x) and cos(x)

- Q: Differentiate y = cos(x) with respect to x.
    [ ] -cos(x)
    [CORRECT] -sin(x)
    [ ] sin(x)
    [ ] cos(x)
- Q: For f(x) = sin(x) and g(x) = cos(x), how do f'(x) and g'(x) compare at x = pi/4?
    [CORRECT] They have equal magnitude but opposite signs.
    [ ] They have equal magnitude and the same sign.
    [ ] They are reciprocals of each other there.
    [ ] They are both exactly equal to zero there.
- Q: Since d/dx sin(x) = cos(x), which graph feature of y = sin(x) does this imply at x = 0?
    [ ] The slope of sin(x) equals 0 at x = 0
    [CORRECT] The slope of sin(x) equals 1 at x = 0
    [ ] The slope of sin(x) is undefined at x = 0
    [ ] The slope of sin(x) equals -1 at x = 0
- Q: Differentiate y = sin(x) + cos(x) with respect to x.
    [ ] sin(x) - cos(x)
    [ ] cos(x) + sin(x)
    [CORRECT] cos(x) - sin(x)
    [ ] -cos(x) - sin(x)
- Q: What is the 102nd derivative of $f(x) = \sin(x)$?
    [ ] $f^{(102)}(x) = \cos(x)$
    [ ] $f^{(102)}(x) = \sin(x)$
    [CORRECT] $f^{(102)}(x) = -\sin(x)$
    [ ] $f^{(102)}(x) = -\cos(x)$
- Q: What is the first derivative of the composite function y = sin(cos(x))?
    [CORRECT] y' = -sin(x) * cos(cos(x))
    [ ] y' = -cos(x) * sin(sin(x))
    [ ] y' = -sin(x) * sin(sin(x))
    [ ] y' = -cos(x) * cos(cos(x))
- Q: Which pair of statements gives the correct derivatives of sin(x) and cos(x)?
    [ ] d/dx sin(x) = sin(x) and d/dx cos(x) = cos(x)
    [ ] d/dx sin(x) = -cos(x) and d/dx cos(x) = sin(x)
    [ ] d/dx sin(x) = cos(x) and d/dx cos(x) = sin(x)
    [CORRECT] d/dx sin(x) = cos(x) and d/dx cos(x) = -sin(x)
- Q: Differentiate y = 4sin(x) - 3cos(x) with respect to x.
    [ ] 4cos(x) - 3sin(x)
    [CORRECT] 4cos(x) + 3sin(x)
    [ ] 4sin(x) + 3cos(x)
    [ ] -4cos(x) + 3sin(x)
- Q: At which x-value in [0, pi] does f(x) = sin(x) + cos(x) have a slope of zero?
    [CORRECT] The slope is zero at x = pi/4.
    [ ] The slope is zero at x = pi/2.
    [ ] The slope is zero at x = pi/6.
    [ ] The slope is zero at x = pi/3.
- Q: The derivatives of $\sin(x)$ follow a repeating cycle. What is the 100th derivative of $\sin(x)$?
    [CORRECT] $\sin(x)$
    [ ] $\cos(x)$
    [ ] $-\sin(x)$
    [ ] $-\cos(x)$
- Q: What is the concavity of f(x) = cos(x) on the interval (0, pi/2)?
    [ ] Concave down, because f''(x) is more than zero there.
    [ ] Concave up, because f''(x) is less than zero there.
    [ ] Concave up, because f''(x) is more than zero there.
    [CORRECT] Concave down, because f''(x) is less than zero there.

### Chain Rule and Implicit differentiation

- Q: When performing implicit differentiation of an equation in x and y, the variable y is treated as:
    [CORRECT] An unknown function of x
    [ ] A variable independent of x
    [ ] Always identical to x
    [ ] A fixed numerical constant
- Q: Suppose $f(x) = x^3 + x$. Using the inverse-function derivative rule, find the value of $(f^{-1})'(2)$.
    [ ] $(f^{-1})'(2) = 1/5$
    [CORRECT] $(f^{-1})'(2) = 1/4$
    [ ] $(f^{-1})'(2) = 1/2$
    [ ] $(f^{-1})'(2) = 1/3$
- Q: Let h(x) = f(g(x)). Given g(1)=2, g'(1)=3, f(1)=4, f'(1)=5, f(2)=6, and f'(2)=7, determine h'(1).
    [ ] h'(1) = 35
    [CORRECT] h'(1) = 21
    [ ] h'(1) = 12
    [ ] h'(1) = 15
- Q: Using the Chain Rule, differentiate $y = \sin(x^2)$ with respect to $x$.
    [CORRECT] $2x \cos(x^2)$
    [ ] $\cos(2x)$
    [ ] $\cos(x^2)$
    [ ] $2x \sin(x^2)$
- Q: The Chain Rule is the differentiation rule that applies specifically when you need to:
    [ ] Differentiate a product of two functions
    [ ] Differentiate a sum of two functions
    [ ] Differentiate a quotient of two functions
    [CORRECT] Differentiate a composition of functions
- Q: Using implicit differentiation on $x^2 + y^2 = 25$, find $\frac{dy}{dx}$.
    [CORRECT] $-\frac{x}{y}$
    [ ] $\frac{y}{x}$
    [ ] $-\frac{y}{x}$
    [ ] $\frac{x}{y}$
- Q: Using logarithmic differentiation, which expression equals the derivative of $y = x^{\sin(x)}$ for $x > 0$?
    [ ] $x^{\sin(x)} [\sin(x) \cdot \ln(x) + \frac{\cos(x)}{x}]$
    [ ] $x^{\sin(x)} [\sin(x) \cdot \ln(x) - \frac{\cos(x)}{x}]$
    [ ] $x^{\sin(x)} [\cos(x) \cdot \ln(x) - \frac{\sin(x)}{x}]$
    [CORRECT] $x^{\sin(x)} [\cos(x) \cdot \ln(x) + \frac{\sin(x)}{x}]$
- Q: If $x^2 + y^2 = 1$, find the second derivative $\frac{d^2y}{dx^2}$ expressed solely in terms of y.
    [ ] $-\frac{y}{x^3}$
    [ ] $-\frac{1}{x^2}$
    [ ] $-\frac{x}{y^2}$
    [CORRECT] $-\frac{1}{y^3}$
- Q: The volume $V$ of a balloon is a function of its radius $r$, and the radius $r$ is a function of time $t$. According to the Chain Rule, which equation correctly relates the rates of change?
    [CORRECT] $\frac{dV}{dt} = \frac{dV}{dr} \cdot \frac{dr}{dt}$
    [ ] $\frac{dV}{dt} = \frac{dV}{dr} + \frac{dr}{dt}$
    [ ] $\frac{dV}{dt} = \frac{dV}{dr} \cdot \frac{dt}{dr}$
    [ ] $\frac{dV}{dt} = \frac{d}{dr}\left(\frac{dr}{dt}\right)$
- Q: Using the chain rule, the derivative of $h(x) = \sqrt{5x+1}$ is:
    [CORRECT] $\frac{5}{2\sqrt{5x+1}}$
    [ ] $\frac{1}{2\sqrt{5x+1}}$
    [ ] $\frac{5}{2\sqrt{5x}}$
    [ ] $\frac{1}{2\sqrt{5x}}$
- Q: Using implicit differentiation, find the slope of the tangent line to the curve $y^3 + xy - x^2 = 3$ at the point $(2, 1)$.
    [CORRECT] The slope is $\frac{3}{5}$.
    [ ] The slope is $\frac{2}{3}$.
    [ ] The slope is $\frac{1}{5}$.
    [ ] The slope is $\frac{4}{3}$.
- Q: Using the Chain Rule, differentiate $y = (3x + 1)^4$ with respect to $x$.
    [ ] $4(3x + 1)^3$
    [CORRECT] $12(3x + 1)^3$
    [ ] $12(3x + 1)^4$
    [ ] $4(3x + 1)^4$
- Q: Which of the following is the derivative of $h(x) = (x^2+3)^4$?
    [CORRECT] $4(x^2+3)^3 \cdot 2x$
    [ ] $4(x^2+3)^3$
    [ ] $4(x^2+3)^3 \cdot x^2$
    [ ] $4(x^2+3)^3 \cdot (2x)^2$

### Higher-order derivatives and Second derivatives

- Q: A point where f''(x) changes sign is associated with a possible:
    [ ] Vertical asymptote
    [ ] Removable hole
    [CORRECT] Inflection point
    [ ] Local maximum
- Q: If $f(x) = x^3$, what is the second derivative $f''(x)$?
    [ ] $6x^2$
    [CORRECT] $6x$
    [ ] $3x^2$
    [ ] 6
- Q: If f''(x) > 0 throughout an interval, the graph of f on that interval is:
    [CORRECT] Concave up
    [ ] A straight line
    [ ] Concave down
    [ ] Decreasing
- Q: If $s(t) = t^4$, what is the third derivative $s'''(t)$?
    [CORRECT] $24t$
    [ ] $12t^2$
    [ ] $4t^3$
    [ ] $24$
- Q: The second derivative f''(x) of a function primarily provides information about:
    [ ] The average rate of change of f
    [CORRECT] Concavity and how f'(x) is changing
    [ ] The domain on which f is defined
    [ ] The x-intercepts (roots) of f

### Tangent lines and linear approximations

- Q: The tangent line to y = f(x) at a point has slope -4. What does this say about the function near that point?
    [ ] It is momentarily not changing near that point
    [CORRECT] It is decreasing at 4 output units per input unit there
    [ ] It must attain a local maximum at that point
    [ ] Its output value at that point equals -4
- Q: Which statement best captures the difference between average rate of change and instantaneous rate of change?
    [CORRECT] Average rate is the slope over an interval; instantaneous rate is the slope at a point
    [ ] Instantaneous rate of change is only ever defined for problems involving motion
    [ ] On a curved graph these two rates of change always turn out to be exactly equal
    [ ] Average rate uses just one point, while instantaneous rate is found using two points
- Q: When estimating instantaneous velocity as the average velocity over an interval around a point, why does shrinking that interval give a better estimate?
    [CORRECT] The secant slope approaches the tangent slope as the interval shrinks
    [ ] Average velocity stops changing after the first step
    [ ] Every function becomes exactly linear on a small interval
    [ ] For small intervals the change in x always equals the change in t
- Q: A function $g$ satisfies $g(2)=5$ and $g'(2)=3$. Which of the following best approximates $g(2.1)$ using the tangent line at $x=2$?
    [CORRECT] $5 + 3(0.1)$
    [ ] $5 + 3(2.1)$
    [ ] $3 + 5(0.1)$
    [ ] $5 + 2(0.1)$
- Q: An object's position is 155 m at t = 12 s and 170 m at t = 13 s. What is its average velocity over that interval?
    [ ] 12.5 meters per second
    [ ] 10 meters per second
    [ ] 25 meters per second
    [CORRECT] 15 meters per second
- Q: Geometrically, what does the derivative of a function at a point represent?
    [ ] The area bounded by the curve there
    [CORRECT] The slope of the tangent line at that point
    [ ] The y-intercept of the tangent line
    [ ] The mean slope across the whole graph
- Q: The tangent line to the graph of $f$ at $x=2$ passes through $(2, f(2))$ and $(2.2, 5.6)$. If $f(2)=5$, what is $f'(2)$?
    [CORRECT] $3.0$
    [ ] $0.6$
    [ ] $1.5$
    [ ] $6.0$
- Q: A function $f$ satisfies $f(2)=5$ and $f'(2)=3$. Using the tangent line at $x=2$ to approximate $f(2.1)$, which of the following gives the approximation?
    [CORRECT] $5 + 3(0.1)$
    [ ] $5 + 3(2.1)$
    [ ] $3 + 5(0.1)$
    [ ] $3 + 5(2.1)$

### Optimization and Related rates

- Q: To locate an interior optimum of a differentiable function, which condition is typically checked first?
    [CORRECT] f'(x) = 0
    [ ] f(x) = 0
    [ ] f'(x) is undefined
    [ ] f''(x) = 0
- Q: For an ideal gas held at constant temperature (PV = k), the volume V decreases at a constant rate. How does the rate of change of pressure, dP/dt, relate to the volume?
    [ ] It is directly proportional to the square of the volume.
    [ ] It is inversely proportional to the cube of the volume.
    [ ] It is directly proportional to the cube of the volume.
    [CORRECT] It is inversely proportional to the square of the volume.
- Q: A rectangle has a fixed perimeter of 20. If one side has length x, its area as a function of x is A(x) =
    [CORRECT] x(10 - x)
    [ ] x(10 + x)
    [ ] 2x(10 - x)
    [ ] x(20 - x)
- Q: When solving a related rates problem, at what stage should specific known numerical values be substituted in?
    [ ] Only into the final answer, never into the equation
    [CORRECT] After differentiating the equation relating the variables
    [ ] Substituting numbers is not allowed in related rates
    [ ] Before differentiating, directly into the original equation
- Q: A ladder of fixed length L leans against a vertical wall, and its base slides away from the wall at a constant rate. How does the angular rate dθ/dt (θ measured from the ground) behave as a function of the height y of the top?
    [CORRECT] It is inversely related to the height y of the top.
    [ ] It is directly proportional to the height y of the top.
    [ ] It depends only on the fixed ladder length L.
    [ ] It stays constant for the entire sliding motion.
- Q: A cost is modeled by C(x) = a·x + b/x with constants a, b > 0 and x > 0. At the value of x that minimizes C(x), what is true of the two terms?
    [ ] The term a·x is twice the value of b/x.
    [ ] The term a·x equals the square of b/x.
    [CORRECT] The term a·x equals the term b/x exactly.
    [ ] The term a·x is half the value of b/x.
- Q: When finding the absolute maximum of a continuous function on a closed interval [a, b], why must the endpoints be evaluated in addition to the critical points?
    [ ] Because it locates where the second derivative is zero.
    [CORRECT] Because a global extremum can occur at a boundary point.
    [ ] Because the Mean Value Theorem requires the endpoint values.
    [ ] Because it confirms the function stays continuous on [a, b].
- Q: A closed cylindrical can must hold a fixed volume. Which relationship between its height h and radius r minimizes the total surface area?
    [CORRECT] The height equals twice the radius (h = 2r).
    [ ] The radius equals three times the height (r = 3h).
    [ ] The radius equals twice the height (r = 2h).
    [ ] The height equals the radius exactly (h = r).
- Q: An optimization problem in calculus generally asks you to find:
    [ ] All vertical and horizontal asymptotes
    [ ] The average value over a closed interval
    [CORRECT] Maximum or minimum values subject to constraints
    [ ] Every antiderivative of the given function
- Q: A circle's radius grows at $2 \text{ cm/s}$. Using $A = \pi r^2$, what is $\frac{dA}{dt}$ at the instant $r=3 \text{ cm}$?
    [ ] $6 \pi \text{ cm}^2/\text{s}$
    [ ] $18 \pi \text{ cm}^2/\text{s}$
    [CORRECT] $12 \pi \text{ cm}^2/\text{s}$
    [ ] $36 \pi \text{ cm}^2/\text{s}$

### Square loss and log loss functions

- Q: A model predicts house prices from bedroom count. Which loss function is typically minimized during training?
    [CORRECT] It uses the squared difference between actual and predicted prices.
    [ ] It uses the probability of correct classification.
    [ ] It uses the absolute difference between actual and predicted prices.
    [ ] It uses the logarithm of the predicted probabilities.
- Q: During model training, derivatives are used primarily to:
    [ ] Allow making predictions without using data.
    [CORRECT] Enable minimizing loss by adjusting parameters.
    [ ] Compute the average loss across all training examples.
    [ ] Generate new training data from existing patterns.
- Q: A data scientist is training a classifier to predict whether an email is spam. Which loss function is most appropriate for this task?
    [ ] Mean squared error
    [ ] Square loss function
    [CORRECT] Log loss function
    [ ] Absolute error function
- Q: In the alien classification example from the material, the model's training minimizes a loss function to separate happy and sad sentences. What is the role of the derivative in that process?
    [ ] To measure the error of each prediction.
    [CORRECT] To find the direction to adjust model parameters.
    [ ] To calculate the average squared difference.
    [ ] To determine the curvature of the loss surface.

