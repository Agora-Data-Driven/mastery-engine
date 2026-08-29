**The big idea**: **Composing functions and modeling**, **Invertible functions and restricting domains**, and **Verifying inverse functions** were the last lesson's tools, and trigonometry is the first place all three carry weight at once. Everything starts from one map: wrap $\theta$ around the unit circle from $(1,0)$ and read where you land. Cosine is that map composed with "take the $x$-coordinate", sine with "take the $y$-coordinate", tangent with "take $y/x$" — composition in the sense you just practised. Because the wrap repeats every $2\pi$ it is violently many-to-one, so **inverse trigonometric functions** do not exist until the domain is restricted — the previous lesson's rule, verbatim. Three facts carry the rest. The circle's equation $x^2 + y^2 = 1$ *is* the Pythagorean identity. Rotations compose, and that *is* the **angle addition identities**. One dropped perpendicular extends right-triangle ratios to every triangle: the **laws of sines and cosines**. **Sinusoidal equations and models** is the payoff — fitting and solving the wave all of this describes.

**Key concepts**

- **Special trig values and identities on the unit circle begin with one definition: the terminal point *is* $(\cos\theta, \sin\theta)$, in that order.** Follow a standard-position angle's terminal ray to the unit circle: that point's coordinates *define* cosine and sine. Every sign rule is then free — in quadrant II, $x < 0$ and $y > 0$, so cosine is negative and sine positive. If a quadrant-II angle has $y = \frac{\sqrt{3}}{2}$ then $\sin\theta = \frac{\sqrt{3}}{2}$: the quadrant changes nothing, because sine *is* the $y$-coordinate. It fixes the other coordinate, $\cos\theta = -\frac{1}{2}$, so $\theta = \frac{2\pi}{3}$.

- **$\sin^2\theta + \cos^2\theta = 1$ is the circle's equation wearing different notation.** Substitute $x = \cos\theta$, $y = \sin\theta$ into $x^2 + y^2 = 1$ and the derivation is finished. That is why it holds for *every* $\theta$ — obtuse, negative, past a full turn: it is about the circle, not a triangle. At $\theta = \pi/4$, $\left(\frac{\sqrt{2}}{2}\right)^2 + \left(\frac{\sqrt{2}}{2}\right)^2 = \frac{1}{2} + \frac{1}{2} = 1$.

- **The special values come from two triangles, so nothing needs memorising sixteen times.** The 45–45–90 triangle has legs $1, 1$ and hypotenuse $\sqrt{2}$; scale the hypotenuse to 1 and $\sin(\pi/4) = \cos(\pi/4) = \frac{\sqrt{2}}{2}$. The 30–60–90 triangle is half an equilateral one, sides $1, \sqrt{3}, 2$, so at $\pi/3$ the adjacent leg is the short one: $\cos(\pi/3) = \frac{1}{2}$, $\sin(\pi/3) = \frac{\sqrt{3}}{2}$, the two swapping at $\pi/6$. Reflect those into the other quadrants with the sign rules: the whole circle, from two triangles.

- **Angle addition identities give trig values of a sum from angles you already know, and the derivation is a rotation matrix product.** Recall from linear algebra that rotation by $A$ is $R(A) = \begin{pmatrix} \cos A & -\sin A \\ \sin A & \cos A \end{pmatrix}$, and rotating by $B$ then $A$ rotates by $A + B$: $R(A)R(B) = R(A+B)$. Read that product's first column: $\cos(A+B) = \cos A\cos B - \sin A\sin B$, $\sin(A+B) = \sin A\cos B + \cos A\sin B$. The minus sign is not a convention to drill — it is the $-\sin A$ entry. At $30^\circ + 60^\circ$: $\frac{\sqrt{3}}{2}\cdot\frac{1}{2} - \frac{1}{2}\cdot\frac{\sqrt{3}}{2} = 0 = \cos 90^\circ$.

- **Subtraction is the same identity with $B \to -B$, and the cofunction identity falls out of it.** Cosine is even and sine odd — off the circle, $-\theta$ mirrors $y$ and leaves $x$ alone — so $\sin(A - B) = \sin A\cos B - \cos A\sin B$ and $\cos(A - B) = \cos A\cos B + \sin A\sin B$. Then $\cos(90^\circ - \theta) = \cos 90^\circ\cos\theta + \sin 90^\circ\sin\theta = 0 + \sin\theta = \sin\theta$ — the whole "co-" in cosine; at $\theta = 30^\circ$, $\cos 60^\circ = \frac{1}{2} = \sin 30^\circ$.

- **Tangent adds through $\tan(A+B) = \frac{\tan A + \tan B}{1 - \tan A\tan B}$, and the denominator is the interesting part.** Divide the sine formula by the cosine formula, then top and bottom by $\cos A\cos B$. Worked: $\tan A = 2$ and $\tan B = 3$ give $\frac{2 + 3}{1 - 6} = -1$. A vanishing denominator is not a bug — $\tan A\tan B = 1$ means $A + B = 90^\circ$, where tangent is undefined. For a non-special angle, split it into ones you know: $105^\circ = 60^\circ + 45^\circ$, so $\tan 105^\circ = \frac{\sqrt{3} + 1}{1 - \sqrt{3}} = -(2 + \sqrt{3})$.

- **Inverse trigonometric functions exist only after a domain restriction — the last lesson's rule, applied.** Sine on $\mathbb{R}$ fails the horizontal line test infinitely often, so it has no inverse. Restrict it to $\left[-\frac{\pi}{2}, \frac{\pi}{2}\right]$, where it climbs monotonically from $-1$ to $1$ and is one-to-one onto $[-1, 1]$; that branch is what $\sin^{-1}$ inverts. So $\sin^{-1}(x)$ returns *the angle whose sine is $x$* — an angle, never a ratio, never $\frac{1}{\sin x}$. Principal ranges: $\sin^{-1}$ into $\left[-\frac{\pi}{2}, \frac{\pi}{2}\right]$, $\cos^{-1}$ into $[0, \pi]$, $\tan^{-1}$ into $\left(-\frac{\pi}{2}, \frac{\pi}{2}\right)$; hence $\sin^{-1}\left(\frac{1}{2}\right) = \frac{\pi}{6}$, $\cos^{-1}(0) = \frac{\pi}{2}$, $\tan^{-1}(1) = \frac{\pi}{4}$.

- **Verifying inverse functions is where the restriction shows its teeth.** $\sin(\sin^{-1}x) = x$ for every $x \in [-1,1]$, but $\sin^{-1}(\sin\theta) = \theta$ *only* when $\theta$ already lies in the restricted domain. At $\theta = \frac{5\pi}{6}$, $\sin\theta = \frac{1}{2}$ and $\sin^{-1}\left(\frac{1}{2}\right) = \frac{\pi}{6} \neq \frac{5\pi}{6}$. Nothing is broken: it returns the principal-branch representative of $\theta$, all a restricted function's inverse can promise.

- **Laws of sines and cosines carry those ratios to triangles with no right angle.** The Law of Cosines, $c^2 = a^2 + b^2 - 2ab\cos C$, is a dot product identity you know: with side vectors $\mathbf{u}, \mathbf{v}$ at angle $C$, $\|\mathbf{u} - \mathbf{v}\|^2 = \|\mathbf{u}\|^2 + \|\mathbf{v}\|^2 - 2\,\mathbf{u}\cdot\mathbf{v}$ and $\mathbf{u}\cdot\mathbf{v} = ab\cos C$. It is Pythagoras plus a correction that vanishes exactly at $C = 90^\circ$: with $a = 3$, $b = 4$, $c^2 = 9 + 16 - 0$ and $c = 5$. The Law of Sines, $\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C}$, comes from writing the area three ways as $\frac{1}{2}ab\sin C$. With $A = 30^\circ$, $a = 5$, $B = 60^\circ$: $b = \frac{a\sin B}{\sin A} = \frac{5 \cdot \frac{\sqrt{3}}{2}}{\frac{1}{2}} = 5\sqrt{3}$.

- **Match the law to the shape of the data, and know which shape is ambiguous.** SAS and SSS go to the Law of Cosines: each gives one equation in one unknown. ASA and AAS go to the Law of Sines, since a complete angle–side pair is in hand. SSA also goes to the Law of Sines and is the **ambiguous case**: two distinct triangles fit the same data. With $A = 30^\circ$, $b = 8$, the altitude is $h = b\sin A = 4$, so $a = 5$ satisfies $4 < 5 < 8$: an arc of radius 5 cuts the base twice and both triangles are valid, $B \approx 53.1^\circ$ and $B \approx 126.9^\circ$ sharing a sine. Below $h$ no triangle, at $h$ one right triangle, for $a \ge b$ exactly one.

- **Sinusoidal equations and models: four parameters, each with a geometric name.** In $y = A\sin\big(B(x - C)\big) + D$ the **midline** is $y = D$, the **amplitude** $|A|$, the period $\frac{2\pi}{|B|}$, and $C$ the horizontal shift. Read them from the extremes, not the symbols: amplitude $= \frac{\max - \min}{2}$, midline $= \frac{\max + \min}{2}$; a model with maximum 9 and minimum 1 has amplitude $\frac{9 - 1}{2} = 4$ and midline $y = 5$. In $y = 3\sin(x) + 2$ the amplitude is 3 and the midline $y = 2$ — the additive constant, never the multiplier.

- **Solving a sinusoidal equation needs the inverse *and* the circle.** $\sin(x) = \frac{1}{2}$ has two solutions per period because one $y$-value is reached at two different angles: a horizontal line between midline and peak crosses each arch twice. The inverse hands you only the principal one, $x = \frac{\pi}{6}$; the circle's mirror symmetry about the vertical axis gives its partner $x = \pi - \frac{\pi}{6} = \frac{5\pi}{6}$, and adding $2\pi k$ gives the rest. For a full model, isolate $\sin\big(B(x-C)\big) = \frac{y - D}{A}$ — if that ratio exceeds 1 in magnitude the line misses the wave: no solution.

**Rules to remember**

- The terminal point is $(\cos\theta, \sin\theta)$: cosine first and horizontal, sine second and vertical.
- $\sin^2\theta + \cos^2\theta = 1$ is $x^2 + y^2 = 1$. No triangle needed, no angle excluded.
- $\sin(A \pm B) = \sin A\cos B \pm \cos A\sin B$; $\cos(A \pm B) = \cos A\cos B \mp \sin A\sin B$. Sine keeps the sign, cosine flips it.
- Trig functions are not linear: $\sin(A + B) \neq \sin A + \sin B$.
- Principal ranges: $\sin^{-1} \to \left[-\frac{\pi}{2}, \frac{\pi}{2}\right]$, $\cos^{-1} \to [0, \pi]$, $\tan^{-1} \to \left(-\frac{\pi}{2}, \frac{\pi}{2}\right)$.
- SAS or SSS $\to$ Law of Cosines. ASA or AAS $\to$ Law of Sines. SSA $\to$ Law of Sines, then check for a second triangle.
- The Law of Cosines at $C = 90^\circ$ *is* Pythagoras; $-2ab\cos C$ corrects for the angle not being right.
- Amplitude $= \frac{\max - \min}{2}$, midline $= \frac{\max + \min}{2}$, period $= \frac{2\pi}{|B|}$.

**Common pitfalls**

- **Writing the terminal point as $(\sin\theta, \cos\theta)$.** The order is fixed by the definition, and swapping it is the commonest unit-circle distractor.
- **Letting the quadrant overwrite a coordinate you were given.** A quadrant-II angle with $y = \frac{\sqrt{3}}{2}$ has $\sin\theta = \frac{\sqrt{3}}{2}$; the quadrant sets the sign of the *other* coordinate.
- **Distributing sine over a sum.** $\sin(60^\circ + 45^\circ) \approx 0.966$, while $\sin 60^\circ + \sin 45^\circ \approx 1.573$ — a value sine can never take.
- **Flipping the sign in $\cos(A + B)$.** Minus for a sum, plus for a difference — the opposite of sine.
- **Forgetting the tangent denominator can vanish.** $\tan A\tan B = 1$ means the sum is $90^\circ$ and the value is undefined, not zero.
- **Reading $\sin^{-1}$ as a reciprocal.** $\frac{1}{\sin x}$ is $\csc x$, a different object.
- **Expecting $\sin^{-1}(\sin\theta) = \theta$ for every $\theta$.** It holds only on the restricted domain, and `numpy.arcsin` returns exactly that principal value — recovering a full-turn angle needs `math.atan2(y, x)`.
- **Missing the second triangle in the SSA case.** The Law of Sines returns one angle; its supplement usually fits too, and the question tests whether you checked.
- **Confusing amplitude with maximum, or midline with amplitude.** In $y = 3\sin(x) + 2$ the maximum is 5, the amplitude 3 and the midline 2 — three different numbers.
- **Working in the wrong angle unit.** Every standard library's `sin` takes radians, and a model fitted in degrees is silently wrong.

**How to approach the questions**

1. Sketch the circle first: most exact-value questions collapse the moment the terminal point is placed and named.
2. Separate reference angle from quadrant: the reference angle gives the magnitude from the two special triangles, the quadrant the sign.
3. If an angle is not one of the sixteen, decompose it — $105^\circ = 60^\circ + 45^\circ$, $15^\circ = 45^\circ - 30^\circ$. An odd angle in the question is asking for an addition identity.
4. For inverse questions ask two things: is the input inside $[-1, 1]$, and the answer inside the principal range? Distractors are usually correct angles from the wrong branch.
5. For triangles, classify the data as SSS, SAS, ASA, AAS or SSA *before* choosing a law: the pattern selects it and flags the ambiguous case by itself.
6. For sinusoidal questions, get maximum and minimum first, then amplitude and midline from them — faster than parsing the formula, and immune to the swap.

**Where this leads**: the next lesson, **03 Complex numbers**, attaches a radius to this circle. Modulus and argument are exactly the $r$ and $\theta$ of a point, and polar form $r(\cos\theta + i\sin\theta)$ turns multiplication into "multiply the moduli, add the arguments" — a rule whose proof is the angle addition identities derived here, the rotation matrix compressed into one number. It closes with the Fundamental Theorem of Algebra: that number system is finally big enough for every polynomial.
