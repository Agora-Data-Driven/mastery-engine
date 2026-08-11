**The big idea**: **Equations with parentheses, decimals, and fractions** trained you to distribute — $a(b + c) = ab + ac$ — as a cleaning move on the road to $ax = b$. This lesson turns that same law into an engine. Apply it twice and two binomials become a quadratic; run the engine backwards and a quadratic becomes two binomials. **Introduction to inverse functions** already gave you the frame for that pairing: multiplying and factoring undo each other, which is why every factorization is checked by expanding it, exactly as you check an inverse by composing back to $x$. Three ideas carry the lesson. First, $(x + p)(x + q) = x^2 + (p + q)x + pq$: the middle coefficient is a **sum** and the constant is a **product**, and that one identity is both the multiplication rule and the factoring recipe. Second, three special products recur so often that recognising them beats grinding them out — and their standard errors are utterly predictable. Third, factoring is pattern recognition with a fixed opening move: take out the greatest common factor, then count terms.

**Key concepts**

- **Multiplying binomials is the distributive law used twice; FOIL is just a name for the four products it generates.** $(x + 3)(x + 5)$: treat the second bracket as one object and distribute — $x(x + 5) + 3(x + 5)$ — then distribute again to get $x^2 + 5x + 3x + 15$, and combine like terms to $x^2 + 8x + 15$. Firsts, Outers, Inners, Lasts is a bookkeeping order over those same four products, nothing more — and it covers binomial times binomial only. The area-box version (a 2-by-2 grid of partial products) survives into three terms and more, which is why it is the one to keep.
- **Read the general shape and you never multiply from scratch again.** $(x + p)(x + q) = x^2 + (p + q)x + pq$. In $(x + 3)(x + 5)$, $8 = 3 + 5$ and $15 = 3 \times 5$. Signs ride along untouched: $(x - 3)(x + 5) = x^2 + 2x - 15$, since $-3 + 5 = 2$ and $-3 \times 5 = -15$.
- **Coefficients get multiplied too, and squared when the binomial is squared.** $(ax + b)(cx + d) = acx^2 + (ad + bc)x + bd$: $(2x + 3)(x + 4) = 2x^2 + 8x + 3x + 12 = 2x^2 + 11x + 12$. The trap is the leading term — $(2x + 1)(2x - 1)$ has first term $(2x)^2 = 4x^2$, not $2x^2$, because the coefficient is inside the square.
- **Special product 1 — the square of a sum: $(a + b)^2 = a^2 + 2ab + b^2$.** The mechanism is that $(a+b)(a+b)$ produces *two* cross terms, $ab$ from the outers and $ab$ from the inners, which add rather than cancel. What breaks without it: $(a + b)^2 = a^2 + b^2$ is false and is the single most common error in algebra. With $a = 3$, $b = 4$: the truth is $7^2 = 49$; the error gives $9 + 16 = 25$; the gap is exactly $2ab = 24$.
- **Special product 2 — the square of a difference: $(a - b)^2 = a^2 - 2ab + b^2$.** Only the middle sign changes, because the last term is $(-b)^2 = +b^2$. So $(x - 4)^2 = x^2 - 8x + 16$. Note what it is *not*: not $x^2 - 16$ (that is a different pattern entirely), not $x^2 + 8x + 16$ (wrong middle sign), not $x^2 - 4x + 16$ (middle term forgot the factor of 2).
- **Special product 3 — the difference of squares: $(a + b)(a - b) = a^2 - b^2$.** Here the two cross terms are $-ab$ and $+ab$, so they annihilate and the middle term vanishes. That is the whole reason this product has only two terms. $(2x + 1)(2x - 1) = 4x^2 - 2x + 2x - 1 = 4x^2 - 1$. Read backwards it is the fastest factorization there is: $x^2 - 9 = x^2 - 3^2 = (x - 3)(x + 3)$.
- **Factoring always opens with the greatest common factor.** It is the distributive law run in reverse: $6x^2 + 9x = 3x(2x + 3)$, because $3x$ divides both terms. Why first, and why it matters: everything downstream gets smaller, and skipping it is the one omission that leaves an answer looking finished when it is not. $2x^2 - 18 = 2(x^2 - 9) = 2(x - 3)(x + 3)$ — pull the 2 and a difference of squares appears; leave it and the pattern is hidden.
- **After the GCF, count terms — that is the entire decision procedure.** Two terms: try difference of squares. Three terms: check for a perfect square trinomial, otherwise hunt the sum-and-product pair. Four terms: factor by grouping.
- **Difference of squares needs a *difference*, and both pieces must be squares.** $x^2 - 9$ qualifies: two terms, a minus, and $x^2 = (x)^2$, $9 = 3^2$. $x^2 + 9$ is a *sum* of squares and does not factor over the real numbers — there is no real pair whose product is $+9$ and sum is $0$. $x^2 + 6x + 9$ and $x^2 - 6x + 9$ are three-term perfect squares, a different pattern that people misfile here constantly.
- **Perfect square trinomials are verified, not guessed.** Test $a^2 \pm 2ab + b^2$: is the first term a square, is the last term a square, and is the middle term twice the product of their roots? For $x^2 + 6x + 9$: $\sqrt{x^2} = x$, $\sqrt{9} = 3$, and $2 \times x \times 3 = 6x$ ✓, so it is $(x + 3)^2$. Check the near-misses by expanding: $(x + 6)(x + 3) = x^2 + 9x + 18$ ✗ and $(x + 9)(x + 1) = x^2 + 10x + 9$ ✗, while $(x - 3)^2 = x^2 - 6x + 9$ has the wrong middle sign.
- **For a general three-term quadratic, find two numbers with the right product and sum.** To factor $x^2 + bx + c$ you need $p$ and $q$ with $pq = c$ and $p + q = b$ — the identity above, read right to left. $x^2 + 8x + 15$: factor pairs of 15 are $1 \times 15$ and $3 \times 5$; only $3 + 5 = 8$, so $(x + 3)(x + 5)$. $x^2 - 2x - 15$: a negative product means opposite signs, and $3 + (-5) = -2$ gives $(x + 3)(x - 5)$. If no integer pair works, the quadratic simply does not factor over the integers.
- **Four terms: group in pairs and demand that both pairs leave the same bracket.** $x^3 + 3x^2 + 2x + 6$ splits as $(x^3 + 3x^2) + (2x + 6)$; take $x^2$ out of the first pair and 2 out of the second to get $x^2(x + 3) + 2(x + 3)$. Both now carry the identical factor $(x + 3)$, so treat it as the common object and pull it out: $(x + 3)(x^2 + 2)$. If the two brackets come out different, the pairing was wrong — reorder the terms and try again.
- **Verification is free.** Expand what you produced: $(x + 3)(x^2 + 2) = x^3 + 2x + 3x^2 + 6$, which reorders to the original ✓. Multiplication is the inverse of factoring, so this check is complete, not a heuristic.

**Rules to remember**

- $(x + p)(x + q) = x^2 + (p + q)x + pq$: middle from the **sum**, constant from the **product**.
- $(a + b)^2 = a^2 + 2ab + b^2$ and $(a - b)^2 = a^2 - 2ab + b^2$. The middle term is never optional.
- $(a + b)(a - b) = a^2 - b^2$ — and only here does the middle term disappear.
- Squaring a binomial squares its coefficient: $(2x)^2 = 4x^2$.
- Check for a greatest common factor before anything else, every single time.
- Then count terms: two → difference of squares, three → perfect square or sum-and-product, four → grouping.
- A sum of squares such as $x^2 + 9$ does not factor over the reals.
- A perfect square trinomial must pass the middle-term test: $2ab$, with the right sign.
- In grouping, the two pairs must produce the *same* bracket or the split was wrong.
- Expand your answer to check it. It takes seconds and it is a proof.

**Common pitfalls**

- Writing $(a + b)^2 = a^2 + b^2$. Squaring is not distributive over addition; the omitted $2ab$ is the whole error.
- Writing $(a - b)^2 = a^2 - b^2$, which conflates the square of a difference with the difference of squares.
- Claiming $(a + b)(a - b) = a^2 + 2ab + b^2$. That product is the one with **no** middle term.
- Expanding $(x - 4)^2$ to $x^2 - 4x + 16$: the middle term is $2ab = 8x$, not $ab$.
- Squaring the variable but not the coefficient: $(2x + 1)(2x - 1) \neq 2x^2 - 1$.
- Calling $x^2 + 9$ a difference of squares, or trying to factor it as $(x + 3)^2$ — expand that and you get $x^2 + 6x + 9$.
- Factoring $x^2 + 6x + 9$ as $(x + 6)(x + 3)$ by matching the visible numbers instead of solving product 9, sum 6.
- Forgetting the GCF and reporting a partly factored answer such as $2(x^2 - 9)$, which still contains a factorable piece.
- Grouping a four-term polynomial without checking that both pairs left the same bracket, then forcing a mismatched answer.

**How to approach the questions**

1. On any "which identity is correct" item, test with numbers. Put $a = 3$, $b = 4$ into every option; $(3+4)^2 = 49$ settles the whole question in one line without recalling anything.
2. To expand, use $(x + p)(x + q) = x^2 + (p+q)x + pq$ and read the middle and last coefficients off directly. Check signs before arithmetic.
3. To factor a trinomial, list the factor pairs of the constant and pick the pair whose sum is the middle coefficient. That is a search over three or four pairs, not a derivation.
4. Count terms before choosing a method, and check the GCF before counting. Most wrong answers on factoring items are right answers to a different first step.
5. Distractors are built from adjacent patterns: a sign flipped, a missing $2ab$, a squared coefficient dropped. Identify which specific slip each option encodes and it names itself.
6. Every factoring answer can be verified by expanding it, so on multiple choice you can expand the options instead of factoring the stem — often the faster route.

**Where this leads**: everything here has been an *expression* — rewritten, never solved. The next lesson, **05 Quadratic functions and equations**, makes it a function and then an equation: vertex form and the features of a quadratic graph, solving by square roots, by the factoring you just learned, and by completing the square, then the quadratic formula for everything that refuses to factor, and interpreting quadratic models. The factoring you just learned becomes the fastest solving method there, because a product equals zero exactly when one of its factors does.
