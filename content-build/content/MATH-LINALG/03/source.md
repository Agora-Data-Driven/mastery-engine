# SOURCE PACK — Mathematics / Linear Algebra / 03 The Four Fundamental Subspaces

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Vector spaces and subspaces   (16 questions)
2. Basis and dimension of a space   (6 questions)
3. Column space and the span of pivot columns   (6 questions)
4. Row space: nonzero rows of RREF   (6 questions)
5. Null space: free variables and special solutions   (8 questions)
6. Left null space: relationships among rows   (6 questions)
7. The Rank-Nullity Theorem   (6 questions)

## Already taught earlier in this course

- Vector operations: Addition, scalar multiplication, and dot products
- Geometric interpretation of vectors and transformations
- Linear transformations and matrix-vector multiplication
- Matrix multiplication as a composition of transformations
- Representing systems of linear equations as matrices
- Elementary row operations and Gaussian elimination
- REF and Reduced Row Echelon Form (RREF)
- Rank of a matrix
- Linear dependence and independence
- Singularity and solvability of systems

## Covered by LATER lessons — do not teach these here

- 04 Determinants, Cofactors, and the Inverse: Determinants: Geometric meaning and calculation, Minors: deleting a row and a column, Cofactors and the checkerboard sign pattern, Cofactor expansion: the recursive determinant, The adjugate: transpose of the cofactor matrix, Two roads to the inverse: adjugate formula and Gauss-Jordan, Inverse matrices and their role in transformations
- 05 Orthogonality, Projections, and Least Squares: Orthogonality and orthonormal bases, The shadow formula: projecting one vector onto another, Projections of vectors onto subspaces, The Gram matrix and the normal equations, The projection matrix onto a column space, Applications: Least squares and linear regression foundations, The residual lives in the left null space
- 06 Building Better Bases: Change of Basis, Gram-Schmidt, and QR: Changing the basis of a vector space, Constructing the change-of-basis matrix, Gram-Schmidt: subtracting the shadows, From orthogonal to orthonormal: normalization, QR decomposition from Gram-Schmidt
- 07 Eigenvalues, Eigenvectors, and Diagonalization: Intuition behind eigenvectors and eigenvalues, The characteristic equation and solving for eigenvalues, Eigenspaces are null spaces: reusing the RREF toolkit, Eigenspaces and basis of eigenvectors, Algebraic vs geometric multiplicity and diagonalizability, Diagonalization of matrices, Application: PCA and PageRank algorithm
- 08 Symmetric Matrices and Quadratic Forms: From quadratic functions to symmetric matrices, Classifying definiteness by eigenvalue signs, Definiteness as shape: bowls, domes, and saddles, The spectral theorem: real eigenvalues, orthogonal eigenvectors
- 09 SVD and PCA: The Capstone: Why A transpose A: turning any matrix symmetric, Finding V and the singular values, Building U: the translation formula, Filling U: silent dimensions from the left null space, SVD as rotate, stretch, rotate, PCA by hand: center, covariance, eigendecompose, project, The toolkit dependency graph: how it all composes

## The live quiz bank for these topics — 54 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Vector spaces and subspaces

- Q: Consider the subset of $\mathbb{R}^2$ defined by $S = \{ (x,y) \in \mathbb{R}^2 \mid y \ge 0 \}$, i.e., all points on or above the $x$-axis. Determine which statement about $S$ is true with respect to the standard vector operations.
    [CORRECT] $S$ is not a vector space because it fails closure under scalar multiplication by negative scalars.
    [ ] $S$ is not a vector space because it does not contain the zero vector.
    [ ] $S$ is not a vector space because it fails closure under vector addition.
    [ ] $S$ is a vector space because it contains the origin and is closed under addition and nonnegative scaling.
- Q: Consider the set $S = \{ (x, y) \in \mathbb{R}^2 \mid y = x + 1 \}$. Which property required for $S$ to be a subspace of $\mathbb{R}^2$ does this set fail to satisfy?
    [CORRECT] It does not contain the vector $(0, 0)$.
    [ ] It is not closed under scalar multiplication by $c = 0$.
    [ ] It is not closed under vector addition.
    [ ] It does not contain any vectors at all.
- Q: Consider the set $V = \{(x,y) \in \mathbb{R}^2 \mid x \ge 0,\ y \ge 0\}$ (the first quadrant, including the axes). Under the usual vector addition and scalar multiplication, is $V$ a vector space?
    [CORRECT] No, because multiplying any vector in $V$ by a negative scalar produces a vector not in $V$.
    [ ] Yes, because $V$ contains $\mathbf{0}$ and is closed under both addition and scaling by nonnegative scalars.
    [ ] No, because $V$ does not contain the zero vector $(0,0)$, which is required for a vector space.
    [ ] Yes, because $V$ is a subset of $\mathbb{R}^2$, and any subset containing $\mathbf{0}$ is a subspace.
- Q: Let $\mathbf{v}$ be a nonzero vector in $\mathbb{R}^3$, and let $S = \operatorname{span}\{\mathbf{v}\}$. Suppose a vector $\mathbf{w}$ satisfies $\mathbf{w} \cdot \mathbf{v} \neq 0$. Which statement must be true?
    [CORRECT] $\mathbf{w}$ cannot belong to $S$
    [ ] $\mathbf{w}$ must belong to $S$
    [ ] $\mathbf{w}$ belongs to $S$ only if it is a unit vector
    [ ] $\mathbf{w}$ cannot be orthogonal to $\mathbf{v}$
- Q: In $\mathbb{R}^2$, let $\mathbf{v}$ be a nonzero vector. Which of the following sets is exactly equal to $\operatorname{span}\{\mathbf{v}\}$?
    [CORRECT] The infinite line through the origin in the direction of $\mathbf{v}$.
    [ ] The line segment from the origin to the tip of $\mathbf{v}$.
    [ ] The ray from the origin through the tip of $\mathbf{v}$.
    [ ] The set containing only the origin and the tip of $\mathbf{v}$.
- Q: In $\mathbb{R}^3$, consider the vectors $\mathbf{a} = (1, 2, 3)$ and $\mathbf{b} = (-2, -4, -6)$. What does their span $\operatorname{span}\{\mathbf{a}, \mathbf{b}\}$ represent geometrically?
    [CORRECT] A line through the origin
    [ ] A plane through the origin
    [ ] All of $\mathbb{R}^3$
    [ ] Two distinct lines intersecting at the origin
- Q: Consider the set $S = \{\mathbf{0}\}$ containing only the zero vector in $\mathbb{R}^3$. What is $\operatorname{span}(S)$?
    [CORRECT] $\{\mathbf{0}\}$, the trivial subspace
    [ ] $\emptyset$, the empty set
    [ ] All vectors parallel to some nonzero direction in $\mathbb{R}^3$
    [ ] A single point at the origin with zero measure but not a subspace
- Q: Suppose $S = \{\mathbf{v}_1, \mathbf{v}_2\}$ is a set of two non-parallel vectors in $\mathbb{R}^3$, and let $U = \operatorname{span}(S)$. If we form a new set $T = \{\mathbf{v}_1, \mathbf{v}_2, \mathbf{w}\}$ where $\mathbf{w} = 2\mathbf{v}_1 - 3\mathbf{v}_2$, how does $\operatorname{span}(T)$ compare to $U$?
    [CORRECT] $\operatorname{span}(T) = U$
    [ ] $\operatorname{span}(T)$ is a proper superset of $U$
    [ ] $\operatorname{span}(T)$ is a proper subset of $U$
    [ ] $\operatorname{span}(T)$ is the whole $\mathbb{R}^3$
- Q: Which of these sets, considered with the usual polynomial addition and scalar multiplication, fails to be a vector space?
    [CORRECT] All polynomials of degree exactly 2, with real coefficients.
    [ ] All polynomials of degree at most 2, with real coefficients.
    [ ] All polynomials with real coefficients and zero constant term.
    [ ] All polynomials of the form $a x^2 + b x$, where $a, b \in \mathbb{R}$.
- Q: Consider the set $S = \{\begin{bmatrix} 1 \\ 0 \end{bmatrix}, \begin{bmatrix} 2 \\ 0 \end{bmatrix}\}$ in $\mathbb{R}^2$. Which of the following correctly describes the span of $S$?
    [ ] All vectors of the form $c_1 \begin{bmatrix} 1 \\ 0 \end{bmatrix} + c_2 \begin{bmatrix} 2 \\ 0 \end{bmatrix}$, where $c_1, c_2 \in \mathbb{R}$
    [ ] The set containing exactly $\begin{bmatrix} 1 \\ 0 \end{bmatrix}$ and $\begin{bmatrix} 2 \\ 0 \end{bmatrix}$
    [CORRECT] The set of all vectors $\begin{bmatrix} x \\ y \end{bmatrix}$ in $\mathbb{R}^2$ with $y = 0$
    [ ] The set containing $\begin{bmatrix} 0 \\ 0 \end{bmatrix}$, $\begin{bmatrix} 1 \\ 0 \end{bmatrix}$, and $\begin{bmatrix} 2 \\ 0 \end{bmatrix}$
- Q: Consider two nonzero vectors $\mathbf{u}$ and $\mathbf{v}$ in $\mathbb{R}^3$ that are not scalar multiples of one another. What does $\operatorname{span}\{\mathbf{u},\mathbf{v}\}$ look like geometrically, and why?
    [CORRECT] A plane through the origin, because every combination $c_1\mathbf{u}+c_2\mathbf{v}$ stays in a single 2‑dimensional sheet that contains $\mathbf{0}$.
    [ ] A plane through the origin, because any two vectors in $\mathbb{R}^3$ automatically generate a flat sheet that contains $\mathbf{0}$.
    [ ] All of $\mathbb{R}^3$, because two independent directions are enough to reach every point in three‑dimensional space.
    [ ] All of $\mathbb{R}^3$, because $\operatorname{span}\{\mathbf{u},\mathbf{v}\}$ always fills the ambient space when $\mathbf{u}$ and $\mathbf{v}$ are not parallel.
- Q: Geometrically, what does the span of a single nonzero vector in $\mathbb{R}^3$ form?
    [CORRECT] A line through the origin
    [ ] Just the single point at the tip
    [ ] A plane through the origin
    [ ] All of R^3
- Q: Two nonzero vectors in $\mathbb{R}^3$ point in different directions (neither is a scalar multiple of the other). What does their span form?
    [ ] Only the x-axis of $\mathbb{R}^3$
    [CORRECT] A plane through the origin
    [ ] Only a single line
    [ ] Nothing unless they are orthogonal
- Q: Given a set of vectors, what does their span describe?
    [ ] The single given vector that has the greatest length
    [ ] The set of all vectors orthogonal to every given vector
    [CORRECT] The set of all vectors reachable by their linear combinations
    [ ] The subset of the given vectors that are mutually invertible
- Q: If you add a vector that is a scalar multiple of one you already have, why does the span stay the same?
    [CORRECT] Because the new vector adds no genuinely new direction
    [ ] Because every scalar multiple is treated as the zero vector
    [ ] Because the determinant of the set becomes equal to 1
    [ ] Because the span depends only on the vectors' lengths
- Q: Consider a single nonzero vector $\mathbf{v} \in \mathbb{R}^3$. Which of the following vectors must belong to $\operatorname{span}\{\mathbf{v}\}$?
    [CORRECT] $-2\mathbf{v}$
    [ ] $\mathbf{v} + \mathbf{w}$ where $\mathbf{w}$ is any nonzero vector not parallel to $\mathbf{v}$
    [ ] $\frac{1}{2}\mathbf{v}$ only if $\mathbf{v}$ has integer components
    [ ] $c\mathbf{v}$ only for $c \ge 0$

### Basis and dimension of a space

- Q: How is the dimension of a vector space defined in terms of a basis?
    [ ] The sum of all the coordinates of the basis vectors
    [ ] The total length of all the basis vectors combined
    [ ] The determinant of the matrix formed by a basis
    [CORRECT] The number of vectors in any basis of the space
- Q: A set of three vectors spans a plane, but one of them is a linear combination of the other two. How should this set be classified?
    [CORRECT] It is not a basis, because it is not minimal
    [ ] It is a basis only if the vectors are orthogonal
    [ ] It cannot span a plane, since three vectors is too many
    [ ] It is a basis, because it spans the plane
- Q: A subspace $V$ of $\mathbb{R}^3$ is spanned by $\mathbf{u} = \begin{bmatrix}1\\2\\1\end{bmatrix}$, $\mathbf{v} = \begin{bmatrix}2\\4\\2\end{bmatrix}$, and $\mathbf{w} = \begin{bmatrix}0\\1\\3\end{bmatrix}$. What is $\dim V$ and which set forms a basis for $V$?
    [CORRECT] $\dim V = 2$ and a basis is $\{\mathbf{u}, \mathbf{w}\}$
    [ ] $\dim V = 3$ and a basis is $\{\mathbf{u}, \mathbf{v}, \mathbf{w}\}$
    [ ] $\dim V = 2$ and a basis is $\{\mathbf{u}, \mathbf{v}\}$
    [ ] $\dim V = 1$ and a basis is $\{\mathbf{u}, \mathbf{v}\}$
- Q: Which statement gives the defining property of a basis for a vector space?
    [ ] It is any set containing exactly two vectors
    [ ] It is the set of the longest vectors in the space
    [ ] It is any set of mutually orthogonal vectors
    [CORRECT] It is a minimal set of vectors that spans the space
- Q: A line through the origin has a basis consisting of one vector. What is the dimension of that space?
    [ ] 2
    [CORRECT] 1
    [ ] It depends on which vector is chosen
    [ ] 0
- Q: Consider the set $S = \left\{ \begin{bmatrix} 1 \\ 2 \end{bmatrix}, \begin{bmatrix} 2 \\ 4 \end{bmatrix}, \begin{bmatrix} 3 \\ 5 \end{bmatrix} \right\}$ in $\mathbb{R}^2$. Which statement is true?
    [CORRECT] $S$ is not a basis because it fails linear independence, though it spans $\mathbb{R}^2$.
    [ ] $S$ is not a basis because it fails to span $\mathbb{R}^2$, though it is linearly independent.
    [ ] $S$ is a basis for $\mathbb{R}^2$ because it contains three vectors.
    [ ] $S$ is not a basis because it fails both linear independence and spanning of $\mathbb{R}^2$.

### Column space and the span of pivot columns

- Q: For a $3\times 2$ matrix $A$, the reduced form of $[A\ \mathbf b]$ has pivots only in the two columns of $A$, and its last column is $(2,-1,0)$. Which conclusion is correct?
    [ ] It is inconsistent, so $\mathbf b$ is outside $\operatorname{Col} A$.
    [ ] It has a pivot in $\mathbf b$, so $\mathbf b$ is outside $\operatorname{Col} A$.
    [CORRECT] It is consistent, so $\mathbf b$ lies in $\operatorname{Col} A$.
    [ ] It is rectangular, so determinants are needed to decide $\operatorname{Col} A$.
- Q: A $4\times 6$ matrix $A$ has reduced form with pivots in columns $1$, $3$, and $4$ only. What is the triple $(\operatorname{rank} A,\dim\operatorname{Col} A,\dim\operatorname{Nul} A)$?
    [ ] $(4,4,2)$
    [ ] $(6,3,3)$
    [ ] $(3,3,2)$
    [CORRECT] $(3,3,3)$
- Q: For a matrix $A$, the reduced form has pivot columns $1$, $2$, and $4$. Which statement must be true about the columns $\mathbf a_1,\mathbf a_2,\mathbf a_3,\mathbf a_4$ of $A$?
    [CORRECT] The column $\mathbf a_3$ lies in $\operatorname{span}\{\mathbf a_1,\mathbf a_2\}$.
    [ ] The column $\mathbf a_4$ lies in $\operatorname{span}\{\mathbf a_1,\mathbf a_2\}$.
    [ ] The column $\mathbf a_1$ lies in $\operatorname{span}\{\mathbf a_2,\mathbf a_3,\mathbf a_4\}$.
    [ ] The span of $\{\mathbf a_1,\mathbf a_2\}$ is all of $\operatorname{Col} A$.
- Q: Suppose $\operatorname{rref}(A)=R$ has pivot columns $1$ and $3$. Let $\mathbf a_j$ be the columns of $A$ and $\mathbf r_j$ be the columns of $R$. Which set is a basis for $\operatorname{Col} A$?
    [CORRECT] $\{\mathbf a_1,\mathbf a_3\}$
    [ ] $\{\mathbf r_1,\mathbf r_3\}$
    [ ] $\{\mathbf a_1,\mathbf a_2\}$
    [ ] $\{\mathbf a_2,\mathbf a_4\}$
- Q: If $R=\operatorname{rref}(A)$ has the same pivot positions as $A$, why can the pivot columns of $R$ fail to be a basis for $\operatorname{Col} A$?
    [ ] Because $R$ must have fewer columns than $A$ itself.
    [CORRECT] Because row operations can change $\operatorname{Col} A$ while keeping pivot locations.
    [ ] Because each pivot column of $A$ becomes zero after row reduction.
    [ ] Because a basis is required to contain all nonzero columns of $A$.
- Q: For an $m\times n$ matrix $A$, which condition is equivalent to saying the columns of $A$ span all of $\mathbb R^m$?
    [ ] Every column of $\operatorname{rref}(A)$ contains a pivot.
    [CORRECT] Every row of $\operatorname{rref}(A)$ contains a pivot.
    [ ] The system $A\mathbf x=\mathbf 0$ has no free variables.
    [ ] The matrix $A$ has more rows than columns.

### Row space: nonzero rows of RREF

- Q: Let $$A = \begin{bmatrix}1&2&1\\2&4&2\\1&3&3\end{bmatrix}$$ Row reduce $A$ to RREF. Which set is a basis for the row space of $A$?
    [ ] $\{(1,2,1),\ (2,4,2)\}$
    [ ] $\{(1,0,0),\ (0,1,0)\}$
    [ ] $\{(1,0,-3),\ (0,0,0)\}$
    [CORRECT] $\{(1,0,-3),\ (0,1,2)\}$
- Q: A $3 \times 4$ matrix $A$ has an RREF with exactly two nonzero rows. Which statement correctly describes the row space of $A$?
    [ ] The row space is a $3$-dimensional subspace of $\mathbb{R}^4$
    [CORRECT] The row space is a $2$-dimensional subspace of $\mathbb{R}^4$
    [ ] The row space is a $2$-dimensional subspace of $\mathbb{R}^3$
    [ ] The row space is a $3$-dimensional subspace of $\mathbb{R}^3$
- Q: Which property of elementary row operations justifies using the nonzero rows of the RREF of $A$ as a spanning set for the row space of $A$?
    [ ] They keep each pivot column identical to the corresponding original column
    [ ] They preserve the dot product between every pair of distinct rows
    [ ] They leave every entry in the leftmost column of the matrix fixed
    [CORRECT] They produce new rows that always stay in the span of the original rows
- Q: Let $$A = \begin{bmatrix}1&2&3\\2&4&6\\0&1&1\end{bmatrix}$$ After row reduction, how many nonzero rows does the RREF of $A$ have, and hence what is the dimension of the row space of $A$?
    [ ] $0$
    [ ] $1$
    [CORRECT] $2$
    [ ] $3$
- Q: Why must the nonzero rows of a matrix in RREF be linearly independent?
    [ ] The reduction divides each row by its pivot, giving every row unit length
    [ ] The zero rows are removed, so no remaining row can equal another row
    [CORRECT] The pivot of each row lies in a column where every other row has zero
    [ ] The reduction process forces any two remaining rows to be orthogonal
- Q: Suppose the RREF of a matrix $A$ is $$R = \begin{bmatrix}1&0&2\\0&1&-1\\0&0&0\end{bmatrix}$$ Which set is a basis for the row space of $A$?
    [CORRECT] $\{(1,0,2),\ (0,1,-1)\}$
    [ ] $\{(1,0,2),\ (0,1,1)\}$
    [ ] $\{(1,0,0),\ (0,1,0)\}$
    [ ] $\{(0,1,-1),\ (0,0,0)\}$

### Null space: free variables and special solutions

- Q: Suppose $A$ is a $5 \times 7$ matrix with rank $3$. What is the dimension of the null space of $A$?
    [ ] The null space has dimension $3$
    [CORRECT] The null space has dimension $4$
    [ ] The null space has dimension $5$
    [ ] The null space has dimension $7$
- Q: When computing special solutions, we set one free variable to $1$ and all other free variables to $0$, repeating for each free variable. What is the main reason for using this pattern?
    [CORRECT] It makes the special solutions linearly independent
    [ ] It ensures the special solutions have unit length
    [ ] It guarantees the special solutions are all positive
    [ ] It forces the special solutions to be orthogonal
- Q: If an $m \times n$ matrix $A$ has full column rank, meaning every column contains a pivot, what can be said about its null space?
    [CORRECT] It contains only the zero vector of $\mathbb{R}^n$
    [ ] It equals the whole space $\mathbb{R}^n$ itself
    [ ] It has dimension equal to the rank of $A$
    [ ] It is spanned by the pivot columns of $A$
- Q: The matrix $$A = \begin{bmatrix} 1 & 0 & -2 \\ 0 & 1 & 4 \\ 2 & 1 & 0 \end{bmatrix}$$ reduces to $\begin{bmatrix} 1 & 0 & -2 \\ 0 & 1 & 4 \\ 0 & 0 & 0 \end{bmatrix}$. Which of the following is the complete solution to $Ax = 0$?
    [CORRECT] $x = c(2, -4, 1)$ for any scalar $c$
    [ ] $x = c(-2, 4, 1)$ for any scalar $c$
    [ ] $x = c(2, 4, 1)$ for any scalar $c$
    [ ] $x = c(1, -4, 2)$ for any scalar $c$
- Q: A matrix has been reduced to row echelon form $$R = \begin{bmatrix} 1 & 2 & 0 & 3 \\ 0 & 0 & 1 & 4 \\ 0 & 0 & 0 & 0 \end{bmatrix}$$ How many free variables does the system $Rx = 0$ have?
    [ ] The system has $0$ free variables
    [ ] The system has $1$ free variable
    [CORRECT] The system has $2$ free variables
    [ ] The system has $3$ free variables
- Q: The matrix $$A = \begin{bmatrix} 1 & -1 & 2 \\ 2 & -2 & 4 \\ 1 & 0 & 3 \end{bmatrix}$$ reduces to $\begin{bmatrix} 1 & 0 & 3 \\ 0 & 1 & 1 \\ 0 & 0 & 0 \end{bmatrix}$. Which of the following is the complete solution to $Ax = 0$?
    [ ] $x = c(3, 1, 1)$ for any scalar $c$
    [CORRECT] $x = c(-3, -1, 1)$ for any scalar $c$
    [ ] $x = c(-3, 1, -1)$ for any scalar $c$
    [ ] $x = c(1, 1, 3)$ for any scalar $c$
- Q: For the reduced matrix $$R = \begin{bmatrix} 1 & 2 & 0 & 3 \\ 0 & 0 & 1 & 4 \end{bmatrix}$$ the free variables are $x_2$ and $x_4$. Which pair gives the two special solutions of $Rx = 0$?
    [ ] $(2, 1, 0, 0)$ and $(3, 0, 4, 1)$
    [CORRECT] $(-2, 1, 0, 0)$ and $(-3, 0, -4, 1)$
    [ ] $(-2, 0, 1, 0)$ and $(-3, -4, 0, 1)$
    [ ] $(1, 0, -2, 0)$ and $(0, 1, -3, -4)$
- Q: For the reduced matrix $$R = \begin{bmatrix} 1 & 0 & 2 & -3 \\ 0 & 1 & -1 & 4 \end{bmatrix}$$ the free variables are $x_3$ and $x_4$. Which pair gives the two special solutions of $Rx = 0$?
    [CORRECT] $(-2, 1, 1, 0)$ and $(3, -4, 0, 1)$
    [ ] $(2, -1, 1, 0)$ and $(-3, 4, 0, 1)$
    [ ] $(-2, 1, 0, 1)$ and $(3, -4, 1, 0)$
    [ ] $(1, 0, -2, 1)$ and $(0, 1, 3, -4)$

### Left null space: relationships among rows

- Q: Suppose $A$ is a $4 \times 3$ matrix with rank $2$. What is the dimension of the left null space of $A$?
    [ ] $0$
    [CORRECT] $2$
    [ ] $1$
    [ ] $3$
- Q: The vector $y = (1, 2, -1)$ lies in the left null space of a $3 \times n$ matrix $A$ whose rows are $\mathbf{r}_1, \mathbf{r}_2, \mathbf{r}_3$ and whose columns are $\mathbf{c}_1, \mathbf{c}_2, \mathbf{c}_3$. Which conclusion follows?
    [ ] $\mathbf{r}_1 - 2\mathbf{r}_2 + \mathbf{r}_3 = \mathbf{0}$
    [ ] $\mathbf{c}_1 + 2\mathbf{c}_2 - \mathbf{c}_3 = \mathbf{0}$
    [ ] $\mathbf{r}_1 - 2\mathbf{r}_2 - \mathbf{r}_3 = \mathbf{0}$
    [CORRECT] $\mathbf{r}_1 + 2\mathbf{r}_2 - \mathbf{r}_3 = \mathbf{0}$
- Q: Within $\mathbb{R}^m$, the left null space of an $m \times n$ matrix $A$ is the orthogonal complement of which subspace?
    [CORRECT] Column space of $A$
    [ ] Row space of $A$
    [ ] Null space of $A$
    [ ] Eigenspace of $A$
- Q: Let $$A = \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ 1 & 1 \end{bmatrix}.$$ Which of the following vectors lies in the left null space of $A$?
    [ ] $(1, 1, 1)$
    [ ] $(1, -1, 1)$
    [CORRECT] $(1, 1, -1)$
    [ ] $(1, -1, -1)$
- Q: For an $m \times n$ matrix $A$, the left null space is defined as the set of all vectors $y$ satisfying which equation?
    [ ] $A y = \mathbf{0}$
    [ ] $A^T A y = \mathbf{0}$
    [CORRECT] $A^T y = \mathbf{0}$
    [ ] $y^T y = \mathbf{0}$
- Q: Suppose $y^T A = \mathbf{0}$ for some nonzero vector $y$. If the system $A\mathbf{x} = \mathbf{b}$ has at least one solution, which condition must $\mathbf{b}$ satisfy?
    [ ] $A^T b = \mathbf{0}$
    [CORRECT] $y^T b = 0$
    [ ] $b^T b = 0$
    [ ] $y^T b = 1$

### The Rank-Nullity Theorem

- Q: Let $T: \mathbb{R}^5 \to \mathbb{R}^3$ be a linear transformation. Using the Rank-Nullity Theorem, which conclusion must be true?
    [CORRECT] $T$ cannot be injective (one-to-one)
    [ ] $T$ cannot be surjective (onto)
    [ ] $T$ must be an isomorphism
    [ ] $T$ must have rank equal to $5$
- Q: Suppose $T: \mathbb{R}^6 \to \mathbb{R}^4$ is a linear transformation whose null space has dimension $2$. What is the dimension of the range (image) of $T$?
    [CORRECT] $4$
    [ ] $2$
    [ ] $6$
    [ ] $3$
- Q: A $4 \times 4$ matrix $A$ has a null space of dimension $1$. What is the dimension of the column space of $A$?
    [CORRECT] $3$
    [ ] $1$
    [ ] $4$
    [ ] $2$
- Q: Which statement about a linear transformation $T: V \to W$ with $\dim V = n$ correctly expresses the Rank-Nullity Theorem?
    [CORRECT] $\operatorname{rank}(T) + \operatorname{nullity}(T) = n$
    [ ] $\operatorname{rank}(T) \cdot \operatorname{nullity}(T) = n$
    [ ] $\operatorname{rank}(T) - \operatorname{nullity}(T) = n$
    [ ] $\operatorname{rank}(T) + \operatorname{nullity}(T) = \dim W$
- Q: A $5 \times 7$ matrix $A$ has rank $3$. Viewing $A$ as a linear map from $\mathbb{R}^7$ to $\mathbb{R}^5$, what is the dimension of the null space of $A$?
    [CORRECT] $4$
    [ ] $2$
    [ ] $3$
    [ ] $7$
- Q: Let $T: V \to W$ be a linear transformation where $V$ is a vector space with $\dim V = 9$. If the rank of $T$ is $4$, what is the nullity of $T$?
    [CORRECT] $5$
    [ ] $4$
    [ ] $13$
    [ ] $9$

