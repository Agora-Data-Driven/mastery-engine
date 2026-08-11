# SOURCE PACK — Mathematics / Calculus / 03 Integrals

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Riemann sums (Left, Right, Midpoint, Trapezoidal)   (14 questions)
2. Definite integrals and the Fundamental Theorem of Calculus   (6 questions)
3. Antiderivatives and Indefinite integrals   (16 questions)
4. Reverse Power Rule   (6 questions)
5. Indefinite integrals of ex,1/x,sin, and cos   (11 questions)
6. u-substitution   (24 questions)
7. Area between curves   (5 questions)

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

## Covered by LATER lessons — do not teach these here

- 04 Multivariate Calculus: Functions of several variables, Partial derivatives and the Gradient vector, Directional derivatives, Higher-order derivatives and the Hessian matrix
- 05 Optimization in Higher Dimensions: Gradients of cost functions (e.g., Mean Squared Error), Introduction to Gradient Descent, Learning rate and convergence, Newton's Method for optimization
- 06 Calculus in Neural Networks: Activations and Activation Functions, Computational graphs and the Chain Rule in graphs, Backpropagation algorithm math

## The live quiz bank for these topics — 82 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Riemann sums (Left, Right, Midpoint, Trapezoidal)

- Q: When building a left Riemann sum, the height of each rectangle is taken from:
    [ ] The right endpoint of the subinterval
    [ ] The average of both endpoints
    [ ] The midpoint of the subinterval
    [CORRECT] The left endpoint of the subinterval
- Q: For a function that is positive and strictly increasing, which Riemann approximation tends to overestimate the integral the most?
    [ ] The trapezoidal sum
    [CORRECT] The right sum
    [ ] The left sum
    [ ] The midpoint sum
- Q: Which of the following statements about Riemann sum approximations is always true?
    [CORRECT] Right Riemann sum underestimates the area for a strictly decreasing function on an interval.
    [ ] Left Riemann sum overestimates the area for a strictly increasing function on an interval.
    [ ] Trapezoidal sum underestimates the area for a strictly concave up function on an interval.
    [ ] Midpoint Riemann sum underestimates the area for a strictly concave down function on an interval.
- Q: On the interval [0, 2] with f(x) = x and 2 equal subintervals, what is the left Riemann sum?
    [CORRECT] 1
    [ ] 2
    [ ] 3
    [ ] 4
- Q: Which of the following statements about Riemann sum approximations is always true?
    [ ] Left Riemann sum overestimates the area for a strictly increasing function on an interval.
    [ ] Right Riemann sum overestimates the area for a strictly decreasing function on an interval.
    [ ] Trapezoidal sum underestimates the area for a strictly concave up function on an interval.
    [CORRECT] Midpoint Riemann sum underestimates the area for a strictly concave up function on an interval.
- Q: Which of the following statements about Riemann sum approximations is always true?
    [CORRECT] Left Riemann sum overestimates the area for a decreasing function on an interval.
    [ ] Right Riemann sum underestimates the area for an increasing function on an interval.
    [ ] Midpoint Riemann sum is always more accurate than the Trapezoidal sum on any interval.
    [ ] Trapezoidal sum underestimates the area for a concave up function on an interval.
- Q: Which of the following statements about Riemann sum approximations is always true?
    [ ] Left Riemann sum underestimates the area for a strictly decreasing function on an interval.
    [ ] Right Riemann sum underestimates the area for a strictly increasing function on an interval.
    [CORRECT] Trapezoidal sum overestimates the area for a strictly concave up function on an interval.
    [ ] Midpoint Riemann sum underestimates the area for a strictly concave down function on an interval.
- Q: Which of the following statements about Riemann sum approximations is always true?
    [CORRECT] Left Riemann sum underestimates the area for a strictly increasing function on an interval.
    [ ] Right Riemann sum overestimates the area for a strictly decreasing function on an interval.
    [ ] Trapezoidal sum overestimates the area for a strictly concave down function on an interval.
    [ ] Midpoint Riemann sum overestimates the area for a strictly concave up function on an interval.
- Q: On a single subinterval [a, b], the trapezoidal rule estimates the area as:
    [ ] Width times the left endpoint height
    [ ] Width times the right endpoint height
    [CORRECT] Width times the mean endpoint height
    [ ] Width times the midpoint height
- Q: For a continuous function $f(x)$ that is strictly decreasing over an interval $[a,b]$, which type of Riemann sum approximation, using $n$ equal subintervals, is guaranteed to *overestimate* the true value of the definite integral $\int_a^b f(x)\,dx$?
    [CORRECT] The Left Riemann Sum, because the function's value at the left endpoint is the maximum within each subinterval.
    [ ] The Right Riemann Sum, because the function's value at the right endpoint is the minimum within each subinterval.
    [ ] The Midpoint Riemann Sum, because it provides the most accurate approximation compared to the left or right sums.
    [ ] None of these Riemann sum methods provides a guaranteed overestimate, as it always depends on the function's concavity.
- Q: Suppose $f$ is a positive, strictly increasing function on $[a,b]$. Consider the left Riemann sum approximation $L_n$ for $\int_a^b f(x)\,dx$ using $n$ equal subintervals. As $n$ increases, which of the following best describes the behavior of $L_n$?
    [ ] $L_n$ decreases and approaches the true value from above.
    [CORRECT] $L_n$ increases and approaches the true value from below.
    [ ] $L_n$ increases and approaches the true value from above.
    [ ] $L_n$ decreases and approaches the true value from below.
- Q: On the interval [0, 2] with f(x) = x and 2 equal subintervals, what is the right Riemann sum?
    [ ] 2
    [CORRECT] 3
    [ ] 4
    [ ] 1
- Q: Which of the following statements about Riemann sum approximations is always true?
    [CORRECT] Left Riemann sum overestimates the area for a strictly decreasing function on an interval.
    [ ] Right Riemann sum underestimates the area for a strictly increasing function on an interval.
    [ ] Trapezoidal sum overestimates the area for a strictly concave down function on an interval.
    [ ] Midpoint Riemann sum underestimates the area for a strictly concave down function on an interval.
- Q: A biologist is estimating the total bacterial growth in a petri dish over a specific period, where the growth rate is modeled by a continuous, strictly decreasing function $G(t)$. To ensure that the calculated Riemann sum approximation of the total growth is definitively an underestimate, which method should the biologist use for each subinterval?
    [ ] A. The Left Riemann sum, using the function value at the left endpoint of each subinterval as the height.
    [CORRECT] B. The Right Riemann sum, using the function value at the right endpoint of each subinterval as the height.
    [ ] C. The Midpoint Riemann sum, using the function value at the midpoint of each subinterval as the height.
    [ ] D. The Trapezoidal Riemann sum, averaging the function values at both endpoints of each subinterval.

### Definite integrals and the Fundamental Theorem of Calculus

- Q: Geometrically, a definite integral of a function over an interval represents:
    [ ] The limit approached by a numerical sequence
    [ ] The function's value at its y-intercept point
    [ ] The slope of the tangent line at the interval midpoint
    [CORRECT] The signed area accumulated across the interval
- Q: Evaluate the definite integral $\int_{0}^{2} 3x^2 \, dx$.
    [ ] 4
    [ ] 12
    [ ] 6
    [CORRECT] 8
- Q: By the Fundamental Theorem of Calculus, if $F'(x) = f(x)$, then $\int_{a}^{b} f(x) \, dx$ equals:
    [CORRECT] $F(b) - F(a)$
    [ ] $F(a) - F(b)$
    [ ] $F(b) + F(a)$
    [ ] $f(b) - f(a)$
- Q: A particle's velocity in meters per second is modeled by the function $v(t) = 2t + 1$, where $t$ is time in seconds. Using the Fundamental Theorem of Calculus, which of the following expressions correctly determines the particle's net displacement, in meters, over the time interval $[1, 3]$ seconds?
    [CORRECT] The value of $F(3) - F(1)$ using the antiderivative $F(t) = t^2 + t$, which precisely yields a net displacement of $10$ meters.
    [ ] The difference $v(3) - v(1)$ using the original velocity function, which incorrectly yields a change in rates of $4$ meters.
    [ ] The result of $F(1) - F(3)$ for the antiderivative $F(t) = t^2 + t$, incorrectly yielding a displacement of $-10$ meters.
    [ ] The sum of antiderivative values $F(3) + F(1)$ for $F(t) = t^2 + t$, incorrectly yielding a total of $14$ meters.
- Q: If $F(x) = x^3$, evaluate the definite integral $\int_{1}^{3} F'(x) \, dx$.
    [ ] 27
    [ ] 8
    [CORRECT] 26
    [ ] 28
- Q: When the lower and upper limits are equal, the definite integral $\int_a^a f(x) \, dx$ equals:
    [CORRECT] $0$
    [ ] Undefined
    [ ] $f(a)$
    [ ] 1

### Antiderivatives and Indefinite integrals

- Q: Why does an indefinite integral always include a constant of integration, + C?
    [ ] Every integral evaluates to exactly zero at the origin
    [ ] The integration constant records both endpoints of an interval
    [ ] The integral yields only an approximate numerical value
    [CORRECT] Functions differing by a constant have identical derivatives
- Q: Suppose $F(x)$ and $G(x)$ are two different functions. For which of the following pairs could both $F(x)$ and $G(x)$ be antiderivatives of the same continuous function $f(x)$?
    [ ] $F(x) = x^3 + 2x$ and $G(x) = x^3 - 2x$
    [ ] $F(x) = \sin(2x)$ and $G(x) = \cos(2x)$
    [CORRECT] $F(x) = \ln(7x)$ and $G(x) = \ln(x)$
    [ ] $F(x) = e^{x+3}$ and $G(x) = e^x + 3$
- Q: Evaluate the indefinite integral $\int 7 \, dx$.
    [ ] 0
    [ ] $7 + C$
    [CORRECT] $7x + C$
    [ ] $x^7 + C$
- Q: If $F(x)$ is an antiderivative of $f(x)$, which of the following statements must be true about the indefinite integral $\int f(x)\,dx$?
    [ ] It equals $F(x)$ because $F'(x)=f(x)$.
    [CORRECT] It equals $F(x)+C$ where $C$ is any constant.
    [ ] It equals $\frac{1}{2}[F(x)]^2+C$ for some $C$.
    [ ] It equals $F(x)$ only when $f(x)$ is positive.
- Q: If $F(x)$ and $G(x)$ are both antiderivatives of the same function $f(x)$ on an interval, which of the following must be true about $H(x) = F(x) - G(x)$?
    [CORRECT] $H(x)$ is a constant function.
    [ ] $H(x)$ is equal to $f(x)$.
    [ ] $H(x)$ is equal to zero for all $x$.
    [ ] $H(x)$ is an antiderivative of $f(x)$.
- Q: A function F is called an antiderivative of f when it satisfies:
    [CORRECT] F'(x) = f(x)
    [ ] F(x) = 0
    [ ] F(x) = f'(x)
    [ ] F''(x) = f(x)
- Q: If $F$ and $G$ are both antiderivatives of the same function $f$, which of the following statements must be true?
    [CORRECT] $F(x) = G(x) + C$
    [ ] $F(x) = G(x) \cdot C$
    [ ] $F(x) = G(x) + x$
    [ ] $F(x) = G(x) + Cx$
- Q: Which of the following correctly describes the relationship between two different antiderivatives, $F_1(x)$ and $F_2(x)$, of the same function $f(x)$?
    [CORRECT] $F_1(x) - F_2(x)$ is a constant.
    [ ] $F_1(x) \cdot F_2(x)$ is a constant.
    [ ] $\frac{d}{dx}[F_1(x) - F_2(x)] = f(x)$.
    [ ] $F_1(x) + F_2(x)$ is always zero.
- Q: Two distinct functions, $F(x)$ and $G(x)$, are both antiderivatives of the same function $f(x)$ on the interval $(-\infty, \infty)$. Which statement must be true about the relationship between $F(x)$ and $G(x)$?
    [CORRECT] Their difference, $F(x) - G(x)$, is a non-zero constant value for all $x$.
    [ ] They must be equal, so $F(x) = G(x)$, for at least one specific value of $x$.
    [ ] One is a constant multiple of the other, so $F(x) = C \cdot G(x)$ for some constant $C$.
    [ ] Their values must be equal at $x=0$, meaning $F(0) = G(0)$, but can differ elsewhere.
- Q: Which expression is an antiderivative of $2x + 1$?
    [ ] $2 + C$
    [CORRECT] $x^2 + x + C$
    [ ] $2x^2 + x + C$
    [ ] $x^2 + 1 + C$
- Q: Evaluate the indefinite integral $\int 3x^2 \,dx$.
    [CORRECT] $x^3 + C$
    [ ] $x^2 + C$
    [ ] $3x^3 + C$
    [ ] $6x + C$
- Q: Suppose $F(x)$ and $G(x)$ are two distinct antiderivatives of the same function $h(x)$. Which of the following statements must be true?
    [CORRECT] The difference $F(x) - G(x)$ is necessarily a constant function.
    [ ] The ratio $F(x) / G(x)$ is necessarily a constant function.
    [ ] The difference $F(x) - G(x)$ is necessarily equal to $h(x)$.
    [ ] The sum $F(x) + G(x)$ is necessarily a constant function.
- Q: If $F(x)$ is an antiderivative of $f(x)$, which of the following represents the most general antiderivative of $f(x)$?
    [ ] $F(x)+5$
    [CORRECT] $F(x)+C$
    [ ] $F(x)+f(x)$
    [ ] $f(x)+C$
- Q: If $F(x)$ is an antiderivative of $f(x)$, which of the following correctly describes the relationship between $\int f(x) \,dx$ and $F(x)$?
    [CORRECT] $\int f(x) \,dx = F(x) + C$, where $C$ is any constant
    [ ] $\int f(x) \,dx = F(x)$, and $C$ is added only if not specified
    [ ] $\int f(x) \,dx = F(x) \cdot C$, where $C$ is a scaling factor
    [ ] $\int f(x) \,dx = F(x) + C$, but only when $f$ is a polynomial
- Q: If $\frac{d}{dx}[F(x)] = 2x$ and $G(x) = F(x) + 5$, which statement is true about $\int 2x\,dx$?
    [ ] It equals $F(x) + C$ but not $G(x) + C$.
    [ ] It equals $G(x) + C$ but not $F(x) + C$.
    [ ] It equals $F(x) + C$ because $F(x) \neq G(x) + C$.
    [CORRECT] It equals both $F(x) + C$ and $G(x) + C$.
- Q: If $F(x) = x^3 + 2x$ and $G(x) = x^3 + 2x + 5$, which of the following is true about their relationship as antiderivatives?
    [CORRECT] $F(x)$ and $G(x)$ are both antiderivatives of the same function $f(x)$.
    [ ] $F(x)$ is an antiderivative of $x^3+2x$, but $G(x)$ is not.
    [ ] $F(x)$ and $G(x)$ are antiderivatives of different functions because they differ by 5.
    [ ] $F(x)$ is an antiderivative of $3x^2+2$, while $G(x)$ is not.

### Reverse Power Rule

- Q: Evaluate the indefinite integral $\int x^{-2} \, dx$.
    [ ] $-\frac{x^{-3}}{3} + C$
    [CORRECT] $-x^{-1} + C$
    [ ] $x^{-1} + C$
    [ ] $-2x^{-3} + C$
- Q: Evaluate the indefinite integral $\int x^4 \, dx$.
    [ ] $4x^3 + C$
    [ ] $x^5 + C$
    [CORRECT] $\frac{x^5}{5} + C$
    [ ] $5x^5 + C$
- Q: For any real exponent $n \neq -1$, the antiderivative $\int x^n \,dx$ equals:
    [CORRECT] $\frac{x^{n+1}}{n+1} + C$
    [ ] $n \cdot x^{n-1} + C$
    [ ] $(n+1) \cdot x^n + C$
    [ ] $x^{n+1} + C$
- Q: Evaluate $\int \sqrt{x} \,dx$ by first writing $\sqrt{x}$ as $x^{1/2}$.
    [ ] $2x^{1/2} + C$
    [ ] $\frac{1}{2}x^{-1/2} + C$
    [CORRECT] $\frac{2}{3}x^{3/2} + C$
    [ ] $\frac{3}{2}x^{3/2} + C$
- Q: Why does the formula $\int x^n \, dx = \frac{x^{n+1}}{n+1} + C$ fail for the case $n = -1$?
    [ ] $x^{-1}$ has no antiderivative
    [CORRECT] The denominator $n + 1$ becomes $0$
    [ ] The exponent $n + 1$ becomes $0$
    [ ] $x^{-1}$ is negative for $x > 0$
- Q: Which of the following is the correct antiderivative of $f(x)=x^{-3}$ (including the constant of integration)?
    [CORRECT] $\frac{-1}{2}x^{-2}+C$
    [ ] $\frac{1}{2}x^{-2}+C$
    [ ] $\frac{-3}{1}x^{-4}+C$
    [ ] $\frac{-1}{3}x^{-3}+C$

### Indefinite integrals of ex,1/x,sin, and cos

- Q: A student is asked to find the general antiderivative of the function $g(x) = e^x - 2\sin(x) - \frac{3}{x}$. Which of the following expressions represents the correct result?
    [ ] The antiderivative is $e^x - 2\cos(x) - 3\ln|x| + C$.
    [ ] The antiderivative is $e^x + 2\cos(x) - 3\ln(x) + C$.
    [ ] The antiderivative is $e^x - 2\cos(x) - 3\ln(x) + C$.
    [CORRECT] The antiderivative is $e^x + 2\cos(x) - 3\ln|x| + C$.
- Q: Evaluate the indefinite integral $\int \sin(x) \, dx$.
    [CORRECT] $-\cos(x) + C$
    [ ] $\cos(x) + C$
    [ ] $-\sin(x) + C$
    [ ] $\tan(x) + C$
- Q: Evaluate the indefinite integral $\int \cos(x) \, dx$.
    [ ] $-\sin(x) + C$
    [CORRECT] $\sin(x) + C$
    [ ] $\cos(x) + C$
    [ ] $-\cos(x) + C$
- Q: Which of the following indefinite integrals is stated correctly?
    [ ] $\int \frac{1}{x} dx = \frac{1}{x^2} + C$
    [CORRECT] $\int e^x dx = e^x + C$
    [ ] $\int \cos(x) dx = -\sin(x) + C$
    [ ] $\int e^x dx = x \cdot e^x + C$
- Q: Evaluate the indefinite integral $$\int \cos(x) \, dx$$.
    [ ] $-\cos(x) + C$
    [ ] $\sec^2(x) + C$
    [ ] $-\sin(x) + C$
    [CORRECT] $\sin(x) + C$
- Q: Evaluate the indefinite integral $\int e^x dx$.
    [ ] $\ln(x) + C$
    [ ] $(\frac{1}{e^x}) + C$
    [CORRECT] $e^x + C$
    [ ] $x e^x + C$
- Q: Evaluate the indefinite integral $\int -\sin(x) \, dx$.
    [ ] $-\cos(x) + C$
    [ ] $\sin(x) + C$
    [CORRECT] $\cos(x) + C$
    [ ] $\tan(x) + C$
- Q: To confirm that F(x) = −cos(x) is an antiderivative of sin(x), which condition must hold?
    [CORRECT] F'(x) = sin(x)
    [ ] F''(x) = sin(x)
    [ ] F'(x) = cos(x)
    [ ] F(0) = 0
- Q: Why is $\int \frac{1}{x} \, dx$ written as $\ln|x| + C$ rather than $\ln(x) + C$?
    [ ] Because a constant cannot be added to $\ln(x)$
    [ ] Because the function $\frac{1}{x}$ is defined only for $x > 0$
    [ ] Because ln
    [ ] $x$
    [ ] differentiates to give $-\frac{1}{x}$
    [CORRECT] Because the antiderivative must also cover $x < 0$
- Q: Which of the following expressions represents the indefinite integral of the function $f(x) = 3e^x - \frac{2}{x} + \sin(x) - 4\cos(x)$?
    [CORRECT] A. $3e^x - 2\ln|x| - \cos(x) - 4\sin(x) + C$
    [ ] B. $3e^x - 2\ln|x| + \cos(x) + 4\sin(x) + C$
    [ ] C. $3e^x - 2\ln x - \cos(x) + 4\sin(x) + C$
    [ ] D. $3e^x - 2\ln|x| + \cos(x) - 4\sin(x) + C$
- Q: A function $F(x)$ is an antiderivative of $f(x) = \frac{1}{x}$. If the domain of $F(x)$ is restricted to the interval $(-\infty, 0)$, which of the following must be the form of $F(x)$ for some real constant $C$?
    [ ] $\ln(x) + C$
    [ ] $- \ln(x) + C$
    [CORRECT] $\ln(-x) + C$
    [ ] $- \ln(-x) + C$

### u-substitution

- Q: u-substitution is the most natural integration technique to try when the integrand contains:
    [ ] A sum of two unrelated power functions
    [ ] A removable discontinuity at one point
    [ ] A graph defined piecewise on the interval
    [CORRECT] An inner function and its derivative as a factor
- Q: A common error when applying u-substitution is to:
    [ ] Pick u to be a nonzero constant value
    [ ] Differentiate the result after integrating
    [ ] Always square the chosen inner expression
    [CORRECT] Replace the function but leave dx unchanged
- Q: A student attempts to evaluate $\int 2x(x^2+1)^3\,dx$ using u-substitution. They let $u = x^2+1$ and correctly obtain $\int u^3\,du$. They write the answer as $\frac{1}{4}u^4+C$. Which key step did they fail to complete?
    [ ] They forgot to choose the correct u.
    [ ] They forgot to compute du properly.
    [CORRECT] They forgot to back-substitute for x.
    [ ] They forgot to add the constant C.
- Q: Considering the principle of u-substitution as a method to reverse the Chain Rule, which of the following integrals is most directly solvable by choosing a substitution $u=g(x)$ such that $du=g'(x) \, dx$?
    [CORRECT] A. $\int x \cos(x^2) \, dx$
    [ ] B. $\int \cos(x^2) \, dx$
    [ ] C. $\int x \cos(x) \, dx$
    [ ] D. $\int (x^2 + 1) \cos(x) \, dx$
- Q: A student attempts to evaluate $\int 2x \cos(x^2)\,dx$ using u-substitution. They write the answer as $\sin(u)+C$, with $u=x^2$. Which key step of the u-substitution process did they fail to complete?
    [ ] They forgot to choose the correct u.
    [ ] They forgot to compute du properly.
    [CORRECT] They forgot to back-substitute for x.
    [ ] They forgot to add the constant C.
- Q: Evaluate $\int 2x(x^2 + 1)^3 \,dx$.
    [ ] $\frac{(x^2 + 1)^4}{2} + C$
    [ ] $2(x^2 + 1)^4 + C$
    [CORRECT] $\frac{(x^2 + 1)^4}{4} + C$
    [ ] $x(x^2 + 1)^3 + C$
- Q: To evaluate $\int \cos(3x) dx$ by substitution, the most useful choice is:
    [ ] $u = \cos(3x)$
    [ ] $u = \sin(3x)$
    [ ] $u = x^3$
    [CORRECT] $u = 3x$
- Q: When evaluating $\int x \cos(x^2+1)\,dx$ using u-substitution, a student lets $u = x^2+1$ and obtains $\frac12 \int \cos u\,du$. After integrating, they get $\frac12 \sin u + C$. Which final step must they complete to finish correctly?
    [CORRECT] Replace $u$ with $x^2+1$ to get $\frac12 \sin(x^2+1)+C$.
    [ ] Replace $u$ with $\cos(x^2+1)$ to get $\frac12 \sin(\cos(x^2+1))+C$.
    [ ] Multiply by $\frac{2}{x}$ to reverse the substitution and get $\frac{1}{x}\sin(x^2+1)+C$.
    [ ] Divide by $g'(x)$ again to get $\frac12 \sin u + C$ and leave the answer as is.
- Q: Evaluate $\int \cos(3x) \,dx$.
    [ ] $3 \sin(3x) + C$
    [ ] $\sin(3x) + C$
    [ ] $-\frac{1}{3} \sin(3x) + C$
    [CORRECT] $\frac{1}{3} \sin(3x) + C$
- Q: A student attempts to evaluate $\int 4x^3 \cos(x^4)\,dx$ using u-substitution. They let $u = x^4$ and correctly obtain $\int \cos(u)\,du$. They write the answer as $\sin(u)+C$. Which key step did they fail to complete?
    [ ] They forgot to choose the correct u.
    [ ] They forgot to compute du properly.
    [CORRECT] They forgot to back-substitute for x.
    [ ] They forgot to add the constant C.
- Q: Which of the following integrals correctly illustrates the need to use u-substitution as the chain rule in reverse?
    [CORRECT] $\int \cos(x^2) \cdot 2x \, dx$
    [ ] $\int \cos(x^2) \, dx$
    [ ] $\int \cos(x) \cdot 2x \, dx$
    [ ] $\int \cos(2x) \cdot x \, dx$
- Q: When evaluating $\int \sqrt{3x+4}\,dx$, a student sets $u = 3x+4$ and obtains $\frac{1}{3}\int \sqrt{u}\,du$. After integrating, they get $\frac{2}{9}u^{3/2}+C$. What is the next correct step?
    [CORRECT] Replace $u$ with $3x+4$ to get $\frac{2}{9}(3x+4)^{3/2}+C$.
    [ ] Add the original variable $x$ back as $\frac{2}{9}u^{3/2}+x+C$.
    [ ] Divide by the derivative $g'(x)=3$ again to get $\frac{2}{27}u^{3/2}+C$.
    [ ] Leave the answer as $\frac{2}{9}u^{3/2}+C$ since $u$ is a dummy variable.
- Q: A student attempts to evaluate $\int \frac{2x+1}{x^2+x}\,dx$ using u-substitution. They let $u = x^2+x$ and correctly obtain $\int \frac{1}{u}\,du$. They write the answer as $\ln|u|+C$. Which key step did they fail to complete?
    [ ] They forgot to choose the correct u.
    [ ] They forgot to compute du properly.
    [CORRECT] They forgot to back-substitute for x.
    [ ] They forgot to add the constant C.
- Q: A student attempts to evaluate $\int \frac{3x^2}{x^3+2}\,dx$ using u-substitution. They let $u = x^3+2$ and correctly obtain $\int \frac{1}{u}\,du$. They write the answer as $\ln|u|+C$. Which key step did they fail to complete?
    [ ] They forgot to choose the correct u.
    [ ] They forgot to compute du properly.
    [CORRECT] They forgot to back-substitute for x.
    [ ] They forgot to add the constant C.
- Q: To compute $\int 2x \cos(x^2)\,dx$ using u-substitution, which of the following steps is essential and distinguishes a correct application from a common mistake?
    [CORRECT] Let $u = x^2$, $du = 2x\,dx$, then integrate $\cos(u)\,du$ and replace $u$ with $x^2$ in the antiderivative.
    [ ] Let $u = x^2$, $du = 2x\,dx$, then integrate $\cos(u)\,du$ and conclude that $u = x^2$ is the final answer.
    [ ] Let $u = \cos(x^2)$, $du = -2x\sin(x^2)\,dx$, then integrate $2xu\,du$ and replace $u$ with $\cos(x^2)$.
    [ ] Let $u = 2x$, $du = 2\,dx$, then integrate $u\cos(x^2)\,du$ and replace $u$ with $2x$.
- Q: Which of the following is a valid first step to evaluate the integral $$\int x e^{x^2}\,dx$$ using u-substitution?
    [ ] Let $u = e^{x^2}$ and $du = 2x e^{x^2}\,dx$.
    [CORRECT] Let $u = x^2$ and $du = 2x\,dx$.
    [ ] Let $u = x$ and $du = dx$.
    [ ] Let $u = e^{x}$ and $du = e^{x}\,dx$.
- Q: A student attempts to evaluate $\int \frac{\cos(\ln x)}{x}\,dx$ using u-substitution. They let $u = \ln x$ and correctly obtain $\int \cos(u)\,du$. They write the answer as $\sin(u)+C$. Which key step did they fail to complete?
    [ ] They forgot to choose the correct u.
    [ ] They forgot to compute du properly.
    [CORRECT] They forgot to back-substitute for x.
    [ ] They forgot to add the constant C.
- Q: Which of the following integrals is best solved by the substitution $u = x^2 + 1$?
    [CORRECT] $\int 2x (x^2+1)^3 \, dx$
    [ ] $\int x (x^2+1)^3 \, dx$
    [ ] $\int (x^2+1)^3 \, dx$
    [ ] $\int 2x (x+1)^3 \, dx$
- Q: When evaluating the integral $$\int 2x\cos(x^2)\,dx$$ using u-substitution, a student sets $u = x^2$ and obtains $$\int \cos(u)\,du.$$ After integrating, they get $\sin(u) + C$. What is the final step needed to complete the problem correctly?
    [CORRECT] Rewrite the answer as $\sin(x^2) + C$
    [ ] Rewrite the answer as $\sin(2x) + C$
    [ ] Rewrite the answer as $\cos(x^2) + C$
    [ ] Leave the answer as $\sin(u) + C$ since $u = x^2$
- Q: When using u-substitution to evaluate $\int 2x \cos(x^2)\,dx$, a student sets $u = x^2$ and $du = 2x\,dx$, obtaining $\int \cos(u)\,du = \sin(u) + C$. Which further step is required to complete the integration?
    [CORRECT] Substitute $x^2$ back for $u$, yielding $\sin(x^2) + C$.
    [ ] Replace $u$ with $x$, giving $\sin(x) + C$.
    [ ] Multiply by $\frac{1}{2x}$, resulting in $\frac{\cos(x^2)}{2x} + C$.
    [ ] Add a constant multiple, obtaining $2\sin(u) + C$, then substitute back.
- Q: When evaluating $$\int 2x \cos(x^2) \, dx$$ using u-substitution, which of the following correctly shows the step after substituting $u$ and $du$ but before solving the simpler integral?
    [CORRECT] $$\int \cos(u) \, du$$
    [ ] $$\int 2x \cos(u) \, du$$
    [ ] $$\int \cos(u) \, dx$$
    [ ] $$\int \cos(x^2) \, du$$
- Q: To evaluate the integral $\int 2x \cos(x^2) \, dx$ using u-substitution, which step must be performed first?
    [CORRECT] Let $u = x^2$ and $du = 2x\,dx$
    [ ] Let $u = \cos(x^2)$ and $du = -\sin(x^2)\,dx$
    [ ] Let $u = 2x$ and $du = 2\,dx$
    [ ] Let $u = x^2$ and $du = x\,dx$
- Q: When evaluating \(\int 2x \cos(x^2)\,dx\) using u-substitution, a student lets \(u = x^2\) and obtains \(\int \cos(u)\,du\). After integrating, they get \(\sin(u) + C\). What must they do to complete the problem correctly?
    [ ] Multiply the result by \(2x\) to account for the missing factor.
    [CORRECT] Substitute \(x^2\) back in place of \(u\) to get \(\sin(x^2) + C\).
    [ ] Divide the result by \(2x\) because they forgot the chain rule.
    [ ] Add the original \(2x\) as a coefficient: \(2x \sin(x^2) + C\).
- Q: Consider the principle of u-substitution, which states that an integral is suitable when it contains a composite function $f(g(x))$ and the derivative of its inner function $g'(x)$ as a factor. Which of the following integral forms *fails* to meet this specific condition for a straightforward application?
    [ ] $\int x \sqrt{x^2+4} \, dx$
    [ ] $\int \frac{\cos(x)}{\sin(x)} \, dx$
    [CORRECT] $\int x^2 \sin(x) \, dx$
    [ ] $\int e^x \cos(e^x) \, dx$

### Area between curves

- Q: Before writing the integral for the area between two curves, you should first:
    [ ] Rewrite both equations using polar coordinates
    [CORRECT] Identify which curve is on top over the interval
    [ ] Differentiate both functions across the interval
    [ ] Compute the slope of each curve at the midpoint
- Q: What is the area of the region between $y = x$ and $y = x^2$ on $[0, 1]$?
    [ ] $\frac{1}{3}$
    [ ] $\frac{2}{3}$
    [CORRECT] $\frac{1}{6}$
    [ ] $\frac{1}{2}$
- Q: The area between $y = f(x)$ and $y = g(x)$ on $[a, b]$, where one curve stays above the other, is found by:
    [ ] the difference $f(b) - g(a)$ of endpoints
    [ ] $\int_{a}^{b} (\text{bottom} - \text{top}) \, dx$
    [ ] the sum of the two $x$-intercepts on $[a, b]$
    [CORRECT] $\int_{a}^{b} (\text{top} - \text{bottom}) \, dx$
- Q: If the two curves cross each other inside the interval, the correct area setup usually requires:
    [ ] Taking the absolute value of the x-values
    [ ] Ignoring the crossing and using one integral
    [ ] Integrating only up to the first crossing point
    [CORRECT] Splitting the integral at the intersection points
- Q: An area computed between two curves must always be:
    [ ] Undefined whenever the two curves intersect
    [CORRECT] Nonnegative
    [ ] Negative when the lower curve exceeds the upper
    [ ] Equal to zero

