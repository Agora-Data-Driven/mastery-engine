**The big idea**: **Estimating limits and one-sided limits** taught you to ask what a quantity approaches rather than what it equals, and **Limits by direct substitution, factoring, and conjugates** gave you the algebra for the $0/0$ forms that question produces. This lesson spends all of it on one limit. Form the difference quotient $\frac{f(x+h)-f(x)}{h}$ — the slope of the secant line through $(x, f(x))$ and $(x+h, f(x+h))$, which is the average rate of change over a step of width $h$ — and let $h \to 0$. Substitution alone returns $0/0$ every time, so factoring and conjugates are how a derivative is computed from the definition. As $h$ shrinks the secant rotates into the tangent line, and what survives is $f'(x)$: the tangent-line slope, the instantaneous rate of change. **The Squeeze Theorem** and **Limits of trigonometric functions** hand you $\lim_{h \to 0}\frac{\sin h}{h} = 1$, the entire reason the sine derivative is cosine. **Types of discontinuities** say where this fails, and the **Intermediate Value Theorem (IVT)** is the continuity family the closing optimization rests on.

**Key concepts**

- **Derivative as slope and rate of change — one definition, two readings.** $f'(x) = \lim_{h \to 0}\frac{f(x+h)-f(x)}{h}$. Geometrically the secant rotates into the tangent line at $x$; physically an average rate over an interval collapses to an instantaneous rate. Without the limit you hold only a secant — an average that hides everything in between. Worked: for $f(x) = x^2$ at $x = 2$, $\frac{(2+h)^2-4}{h} = \frac{4h+h^2}{h} = 4+h \to 4$, so $f'(2) = 4$. For $g(x) = \sqrt{x}$ at $x = 4$ the conjugate rescues the $0/0$: $\frac{\sqrt{4+h}-2}{h} = \frac{1}{\sqrt{4+h}+2} \to \frac14$ — the tangent slope there, not a secant slope and not a $y$-coordinate. For the line $h(t) = 5t-1$ the quotient equals $5$ for every $h$, so its instantaneous rate of change is $5$ everywhere.

- **Average versus instantaneous.** For $s(t) = t^2+3t$ the average rate of change from $t=1$ to $t=3$ is $\frac{s(3)-s(1)}{3-1} = \frac{18-4}{2} = 7$, while $s'(t) = 2t+3$ gives $5$ and $9$ at the ends. On a strictly concave-up function $f'(a)$ is strictly *less* than the average rate over $[a,b]$, because the slope is still climbing. Positions of $155$ m at $t=12$ s and $170$ m at $t=13$ s give an average velocity of $15$ m/s; shrinking that interval improves it because the secant slope approaches the tangent slope. Units say what a derivative means: $V(r) = \frac43\pi r^3$ gives $V'(r) = 4\pi r^2$ — volume per unit radius, which is the sphere's surface area.

- **Where the derivative fails to exist.** At a sharp corner or cusp the one-sided limits of the difference quotient disagree, so no two-sided limit exists: for $|x|$ at $0$ it is $+1$ from the right, $-1$ from the left.

- **Derivative rules (Power rule, Product, Quotient) exist so you never run that limit twice.** Power rule: $\frac{d}{dx}x^n = nx^{n-1}$ for *any* constant exponent, so $\frac{d}{dx}x^{e} = e\,x^{e-1}$ — $e$ is just a number. Term by term on a polynomial of degree $n \ge 1$ it lowers the degree by exactly one. Product rule: $(fg)' = f'g + fg'$, emphatically not $f'g'$ — it keeps terms built from the *original* functions. With $f(2)=3$, $f'(2)=4$, $g(2)=5$, $g'(2)=6$: $(fg)'(2) = 4\cdot5 + 3\cdot6 = 38$; and $h(x) = x^2g(x)$ with $g(1)=4$, $g'(1)=2$ gives $h'(1) = 10$. Quotient rule: $\left(\frac fg\right)' = \frac{f'g - fg'}{g^2}$, so $y = \frac{3x^2+2x}{x^3}$ gives $\frac{x^3(6x+2)-(3x^2+2x)(3x^2)}{x^6}$ — the numerator order is not symmetric, the denominator is the *bottom* squared. Special case: $y = \frac{1}{f(x)}$ gives $y' = -\frac{f'(x)}{[f(x)]^2}$.

- **Pick the rule from the shape; rewrite when rewriting is cheaper.** $(x^2+1)(x^3-4)$ is a product; $x^2(x+1)$ expands to $x^3+x^2$ and gives $3x^2+2x$ either way; $\frac{x^2+1}{x}$ is best rewritten as $x + x^{-1}$, giving $1 - \frac{1}{x^2}$ with no quotient rule at all. Setting a derivative to zero locates horizontal tangents: $f(x) = \frac{x}{x^2+1}$ has $f'(x) = \frac{1-x^2}{(x^2+1)^2}$, zero at $x = \pm 1$.

- **Derivatives of sin(x) and cos(x), and the cycle they generate.** $\frac{d}{dx}\sin x = \cos x$ and $\frac{d}{dx}\cos x = -\sin x$; the minus sign lives on cosine only. Read it off the graph: the slope of $\sin x$ at $x=0$ is $\cos 0 = 1$. Linearity does the rest — $4\sin x - 3\cos x$ gives $4\cos x + 3\sin x$, and $\sin x + \cos x$ gives $\cos x - \sin x$, zero at $x = \pi/4$ on $[0,\pi]$. There $\cos(\pi/4) = \frac{\sqrt2}{2}$ and $-\sin(\pi/4) = -\frac{\sqrt2}{2}$: equal magnitude, opposite signs.

- **Higher-order derivatives and Second derivatives.** $f''$ is the derivative of $f'$: $f(x) = x^3$ has $f''(x) = 6x$, and $s(t) = t^4$ has $s'''(t) = 24t$. Sine's derivatives cycle $\sin \to \cos \to -\sin \to -\cos \to \sin$ with period four, so the $n$th depends only on $n \bmod 4$ — the $100$th derivative of $\sin x$ is $\sin x$, the $102$nd is $-\sin x$. The second derivative reports concavity and how $f'$ is changing: $f''>0$ concave up, $f''<0$ concave down, and a sign change of $f''$ marks a possible inflection point. So $f'>0$ with $f''<0$ means values rise while the tangent's steepness declines, and $\cos x$ is concave down on $(0,\pi/2)$ because $f'' = -\cos x < 0$ there.

- **Chain Rule: outer derivative evaluated at the inner function, times the inner derivative.** $(f\circ g)'(x) = f'(g(x))\,g'(x)$. With $g(1)=2$, $g'(1)=3$, $f'(2)=7$, the composite $h = f\circ g$ has $h'(1) = 21$ — $f'(1)$ is a decoy, since the outer derivative is evaluated at $g(1) = 2$. Worked: $(3x+1)^4 \to 12(3x+1)^3$; $\sin(x^2) \to 2x\cos(x^2)$; $\sqrt{5x+1} \to \frac{5}{2\sqrt{5x+1}}$; $(x^2+3)^4 \to 4(x^2+3)^3\cdot 2x$; $\sin(\cos x) \to -\sin(x)\cos(\cos x)$.

- **Implicit differentiation treats $y$ as an unknown function of $x$.** Differentiate both sides, chain-rule every $y$ term (so $\frac{d}{dx}y^2 = 2y\frac{dy}{dx}$), then solve for $\frac{dy}{dx}$. On $x^2+y^2 = 25$: $2x + 2yy' = 0$, so $y' = -\frac xy$. On $y^3 + xy - x^2 = 3$ at $(2,1)$: $3y' + 1 + 2y' - 4 = 0$, giving slope $\frac35$. Once more on $x^2+y^2=1$: $\frac{d^2y}{dx^2} = -\frac{y - xy'}{y^2} = -\frac{1}{y^3}$. It also gives logarithmic differentiation — $y = x^{\sin x}$ has $\ln y = \sin x\ln x$, so $y' = x^{\sin x}\left[\cos x\ln x + \frac{\sin x}{x}\right]$ — and the inverse rule $(f^{-1})'(b) = 1/f'(a)$ with $f(a)=b$: $f(x) = x^3+x$ has $f(1)=2$, $f'(1)=4$, so $(f^{-1})'(2) = \frac14$.

- **Tangent lines and linear approximations.** The tangent line at $a$ is $L(x) = f(a) + f'(a)(x-a)$, the best straight-line stand-in near $a$. With $g(2)=5$ and $g'(2)=3$, $g(2.1) \approx 5 + 3(0.1) = 5.3$. Backwards, a tangent through $(2,5)$ and $(2.2, 5.6)$ has slope $\frac{5.6-5}{0.2} = 3.0$. A slope of $-4$ means decreasing at $4$ output units per input unit — nothing about the output value. The error is $f(x) - L(x) \approx \frac12 f''(a)(x-a)^2$: quadratic in the step and carrying the sign of $f''$, so a concave-up function is *underestimated* by its own tangent line.

- **Optimization and Related rates are the same derivative pointed two ways.** For an interior optimum check $f'(x) = 0$ first, then compare those critical points against the **endpoints** of a closed interval — a global extremum can occur at a boundary point. Perimeter fixed at $20$ with one side $x$: $A(x) = x(10-x)$, $A' = 10-2x = 0$ at $x = 5$. For $C(x) = ax + \frac bx$ with $a,b>0$: $C' = a - \frac{b}{x^2} = 0$ at $x^{*} = \sqrt{b/a}$, where $ax^{*} = \frac{b}{x^{*}} = \sqrt{ab}$ — the two terms are exactly equal. A closed cylindrical can of fixed volume minimises surface area at $h = 2r$. Related rates run the chain rule in time: $\frac{dV}{dt} = \frac{dV}{dr}\cdot\frac{dr}{dt}$. With $A = \pi r^2$ and $\frac{dr}{dt} = 2$ cm/s, $\frac{dA}{dt} = 12\pi$ cm²/s at $r = 3$ cm — numbers go in only *after* differentiating. For $PV = k$, $\frac{dP}{dt} = -\frac{k}{V^2}\frac{dV}{dt}$, inversely proportional to the square of the volume; a sliding ladder's $\frac{d\theta}{dt}$ is inversely related to the top's height $y$.

- **Square loss and log loss functions are optimization wearing a machine-learning hat.** Predicting a house price from bedroom count is regression, and training minimises the square loss — the squared difference between actual and predicted prices. Deciding whether an email is spam is a probability question, so it minimises the log loss function, built from the logarithm of the predicted probabilities. Either way the derivative gives the *direction* to adjust the parameters; it does not measure the error. Worked: with $\hat y = wx$ on $(x,y) = (2,3)$, $L(w) = (2w-3)^2$ and $\frac{dL}{dw} = 8w - 12$ — negative at $w=1$ so push $w$ up, zero at $w = 1.5$, positive at $w = 2$.

**Rules to remember**

- $f'(x) = \lim_{h \to 0}\frac{f(x+h)-f(x)}{h}$: secant slope in, tangent slope out.
- Average rate of change: slope over an interval. Instantaneous rate of change: slope at a point.
- $(fg)' = f'g + fg'$; $\left(\frac fg\right)' = \frac{f'g-fg'}{g^2}$; $\frac{d}{dx}x^n = nx^{n-1}$.
- $\frac{d}{dx}\sin x = \cos x$, $\frac{d}{dx}\cos x = -\sin x$; sine's derivatives repeat every four.
- Chain rule: the outer derivative goes *at* the inner function, times the inner derivative. Implicit differentiation: every $y$ term picks up a $\frac{dy}{dx}$.
- $f''>0$ concave up, $f''<0$ concave down; a sign change of $f''$ marks a possible inflection point.
- $L(x) = f(a) + f'(a)(x-a)$, with error growing like $\frac12 f''(a)(x-a)^2$.
- Optimization: critical points where $f' = 0$, **then** the endpoints. Related rates: differentiate first, substitute second.
- Square loss for continuous targets; log loss for predicted probabilities.

**Common pitfalls**

- **Calling the limit of the difference quotient a secant slope.** The secant is what it came *from*.
- **Writing $(fg)' = f'g'$, or differentiating a quotient's top and bottom separately and dividing.** Both throw away the terms built from the original functions.
- **Losing the inner derivative.** $(x^2+3)^4$ gives $4(x^2+3)^3\cdot 2x$, not $4(x^2+3)^3$ — and the outer derivative goes at $g(x)$, not at $x$.
- **Treating $y$ as a constant while differentiating implicitly.** It is an unknown *function* of $x$.
- **Substituting numbers before differentiating a related rates problem.** A constant differentiates to zero and the relationship vanishes.
- **Stopping at the critical points on a closed interval.** The absolute maximum can sit on an endpoint, where $f'$ is never zero.
- **Reading $f'' = 0$ as an automatic inflection point, or as the first test for an optimum.** The sign must change, and interior optima start from $f' = 0$.
- **Reaching for square loss on a classification task.** Spam-or-not is a probability question; log loss is its loss function.

**How to approach the questions**

1. If the question shows a limit, name the pieces first: what is $f$, the point, the step $h$? The answer is almost always "the tangent-line slope there".
2. For any rate question, decide whether the wording gives an interval (average, secant) or an instant (instantaneous, tangent); the distractors offer the other one.
3. Choose the rule by shape — product, quotient, composition — and check whether an algebraic rewrite beats it.
4. When values are supplied at several points, write them down first: chain rule and product rule questions are built from mismatched evaluation points.
5. For higher-order derivatives of sine or cosine, reduce the order modulo 4. For shape questions, translate every option into signs of $f'$ and $f''$.
6. For optimization, set up objective and constraint, differentiate, then check the endpoints. For related rates, differentiate with respect to $t$ before substituting.
7. Sanity-check numerically: if $\frac{f(x+0.001)-f(x-0.001)}{0.002}$ disagrees with your formula, the formula is wrong.

**Where this leads**: every question so far started from a function and asked for a rate. The next lesson, **03 Integrals**, runs the machine backwards — Riemann sums accumulate a quantity from its rate, antiderivatives and the reverse power rule undo the rules you just learned, and the Fundamental Theorem of Calculus proves the two operations are inverse. $u$-substitution is the chain rule read right to left, which is why it repays getting the chain rule exact now.
