# SOURCE PACK — Mathematics / Linear Algebra / 05 Orthogonality, Projections, and Least Squares

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Orthogonality and orthonormal bases   (3 questions)
2. The shadow formula: projecting one vector onto another   (6 questions)
3. Projections of vectors onto subspaces   (7 questions)
4. The Gram matrix and the normal equations   (6 questions)
5. The projection matrix onto a column space   (6 questions)
6. Applications: Least squares and linear regression foundations   (7 questions)
7. The residual lives in the left null space   (6 questions)

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
- Vector spaces and subspaces
- Basis and dimension of a space
- Column space and the span of pivot columns
- Row space: nonzero rows of RREF
- Null space: free variables and special solutions
- Left null space: relationships among rows
- The Rank-Nullity Theorem
- Determinants: Geometric meaning and calculation
- Minors: deleting a row and a column
- Cofactors and the checkerboard sign pattern
- Cofactor expansion: the recursive determinant
- The adjugate: transpose of the cofactor matrix
- Two roads to the inverse: adjugate formula and Gauss-Jordan
- Inverse matrices and their role in transformations

## Covered by LATER lessons — do not teach these here

- 06 Building Better Bases: Change of Basis, Gram-Schmidt, and QR: Changing the basis of a vector space, Constructing the change-of-basis matrix, Gram-Schmidt: subtracting the shadows, From orthogonal to orthonormal: normalization, QR decomposition from Gram-Schmidt
- 07 Eigenvalues, Eigenvectors, and Diagonalization: Intuition behind eigenvectors and eigenvalues, The characteristic equation and solving for eigenvalues, Eigenspaces are null spaces: reusing the RREF toolkit, Eigenspaces and basis of eigenvectors, Algebraic vs geometric multiplicity and diagonalizability, Diagonalization of matrices, Application: PCA and PageRank algorithm
- 08 Symmetric Matrices and Quadratic Forms: From quadratic functions to symmetric matrices, Classifying definiteness by eigenvalue signs, Definiteness as shape: bowls, domes, and saddles, The spectral theorem: real eigenvalues, orthogonal eigenvectors
- 09 SVD and PCA: The Capstone: Why A transpose A: turning any matrix symmetric, Finding V and the singular values, Building U: the translation formula, Filling U: silent dimensions from the left null space, SVD as rotate, stretch, rotate, PCA by hand: center, covariance, eigendecompose, project, The toolkit dependency graph: how it all composes

## The live quiz bank for these topics — 41 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Orthogonality and orthonormal bases

- Q: In the Gram-Schmidt process, why is the projection onto the earlier vectors subtracted from each new vector?
    [ ] To force each vector to have a determinant of 1
    [ ] To increase the length of each resulting vector
    [CORRECT] To strip out overlap and keep only the new direction
    [ ] To turn every input set into the standard basis
- Q: What must be true of the vectors in an orthonormal basis?
    [ ] They together span only a single dimension
    [CORRECT] They are mutually perpendicular and each has length 1
    [ ] They all have strictly positive entries
    [ ] They are parallel to one another and equal in length
- Q: What is the main purpose of the Gram-Schmidt process?
    [ ] To evaluate the determinant of a matrix
    [ ] To compute the eigenvalues of a square matrix
    [CORRECT] To turn independent vectors into an orthonormal basis
    [ ] To test quickly whether a matrix is singular

### The shadow formula: projecting one vector onto another

- Q: Which expression correctly gives the vector projection of $\mathbf{a}$ onto $\mathbf{b}$ for nonzero $\mathbf{b}$?
    [ ] $\frac{\mathbf{a}\cdot\mathbf{b}}{|\mathbf{b}|}\,\mathbf{b}$
    [CORRECT] $\frac{\mathbf{a}\cdot\mathbf{b}}{\mathbf{b}\cdot\mathbf{b}}\,\mathbf{b}$
    [ ] $\frac{\mathbf{a}\cdot\mathbf{b}}{\mathbf{a}\cdot\mathbf{a}}\,\mathbf{a}$
    [ ] $\frac{\mathbf{a}\cdot\mathbf{b}}{|\mathbf{a}|}\,\mathbf{a}$
- Q: For the same $\mathbf{a}=\begin{bmatrix}2\\5\end{bmatrix}$ and $\mathbf{b}=\begin{bmatrix}4\\3\end{bmatrix}$, which vector is $\operatorname{proj}_{\mathbf{b}}\mathbf{a}$?
    [ ] $\begin{bmatrix}\frac{92}{5}\\\frac{69}{5}\end{bmatrix}$
    [ ] $\begin{bmatrix}\frac{46}{29}\\\frac{115}{29}\end{bmatrix}$
    [CORRECT] $\begin{bmatrix}\frac{92}{25}\\\frac{69}{25}\end{bmatrix}$
    [ ] $\begin{bmatrix}-\frac{42}{25}\\\frac{56}{25}\end{bmatrix}$
- Q: For $\mathbf{a}=\begin{bmatrix}2\\5\end{bmatrix}$ and $\mathbf{b}=\begin{bmatrix}4\\3\end{bmatrix}$, what is the scalar projection of $\mathbf{a}$ onto $\mathbf{b}$?
    [CORRECT] $\frac{23}{5}$
    [ ] $\frac{23}{25}$
    [ ] $\frac{23}{7}$
    [ ] $\frac{25}{23}$
- Q: The vector projection of $\mathbf{a}$ onto $\mathbf{b}$ is the zero vector exactly when which condition holds?
    [CORRECT] When $\mathbf{a}\cdot\mathbf{b}=0$
    [ ] When $|\mathbf{a}|=|\mathbf{b}|$
    [ ] When $\mathbf{a}\times\mathbf{b}=0$
    [ ] When $|\mathbf{a}|=0$ only
- Q: If $\mathbf{a}\cdot\mathbf{b}<0$, what does that sign imply about the projection onto $\mathbf{b}$?
    [CORRECT] The scalar projection onto $\mathbf{b}$ is negative
    [ ] The scalar projection onto $\mathbf{b}$ is positive
    [ ] The vector projection is parallel to $\mathbf{b}$
    [ ] The projected length equals $|\mathbf{a}|$
- Q: For $\mathbf{a}=\begin{bmatrix}1\\7\end{bmatrix}$ and $\mathbf{b}=\begin{bmatrix}2\\-1\end{bmatrix}$, find the length of the component of $\mathbf{a}$ perpendicular to $\mathbf{b}$.
    [CORRECT] $3\sqrt{5}$
    [ ] $5\sqrt{2}$
    [ ] $2\sqrt{10}$
    [ ] $\sqrt{29}$

### Projections of vectors onto subspaces

- Q: For the least-squares best approximation $A\hat{x}$ to $b$, which condition must the estimate $\hat{x}$ satisfy?
    [ ] $A^{-1} b = \hat{x}$
    [CORRECT] $A^T(b - A\hat{x}) = 0$
    [ ] $A(A^T b) = \hat{x}$
    [ ] $A\hat{x} = 0$
- Q: What does projecting a target vector onto a subspace find?
    [ ] The determinant of the matrix for the subspace
    [ ] The vector in the subspace farthest from the target
    [ ] The number of basis vectors spanning the subspace
    [CORRECT] The vector in the subspace closest to the target
- Q: Imagine shining a flashlight straight down onto a floor. In this analogy for projection onto a subspace, what represents the projection?
    [CORRECT] The shadow cast on the floor
    [ ] The determinant of the floor
    [ ] The beam of light itself
    [ ] The original object only
- Q: When p is the projection of b onto a subspace, why must the residual r = b - p be perpendicular to that subspace?
    [ ] Because only perpendicular vectors can ever be normalized
    [ ] Because residual vectors are always zero in linear algebra
    [ ] Because perpendicular vectors always have determinant 1
    [CORRECT] Because any in-subspace component would let p move closer to b
- Q: Which matrix gives the orthogonal projection onto the column space $\text{Col}(A)$?
    [ ] $A^T A$
    [CORRECT] $A(A^T A)^{-1}A^T$
    [ ] $A + A^T$
    [ ] $A^{-1}A^T$
- Q: Let $A = \begin{bmatrix} 1 & 0 \\ 2 & 1 \\ 1 & 1 \end{bmatrix}$ and $\mathbf{b} = \begin{bmatrix} 6 \\ 7 \\ 4 \end{bmatrix}$. Compute the orthogonal projection $\mathbf{p}$ of $\mathbf{b}$ onto the column space of $A$. Then find the Euclidean length of the residual vector $\mathbf{r} = \mathbf{b} - \mathbf{p}$.
    [CORRECT] $\mathbf{p} = \begin{bmatrix} 4 \\ 7 \\ 5 \end{bmatrix}, \ \|\mathbf{r}\| = 3$
    [ ] $\mathbf{p} = \begin{bmatrix} 5 \\ 8 \\ 4 \end{bmatrix}, \ \|\mathbf{r}\| = \sqrt{2}$
    [ ] $\mathbf{p} = \begin{bmatrix} 3 \\ 6 \\ 4 \end{bmatrix}, \ \|\mathbf{r}\| = \sqrt{11}$
    [ ] $\mathbf{p} = \begin{bmatrix} 4 \\ 7 \\ 5 \end{bmatrix}, \ \|\mathbf{r}\| = 2$
- Q: Let $P$ be the orthogonal projection matrix onto a subspace $S$, and let $\mathbf{p} = P\mathbf{b}$ for some vector $\mathbf{b}$. Which property of $P$ directly guarantees that $\mathbf{p}$ is already in $S$ and will remain unchanged if we project it again ($P\mathbf{p} = \mathbf{p}$)?
    [CORRECT] $P^2 = P$ (idempotent)
    [ ] $P^T = P$ (symmetric)
    [ ] $P$ has eigenvalues only 0 or 1
    [ ] $P = A(A^T A)^{-1} A^T$

### The Gram matrix and the normal equations

- Q: Let $$A = \begin{bmatrix} 1 & 1 \\ 1 & 2 \\ 1 & 3 \end{bmatrix}.$$ Compute the Gram matrix $A^T A$.
    [CORRECT] $$\begin{bmatrix} 3 & 6 \\ 6 & 14 \end{bmatrix}$$
    [ ] $$\begin{bmatrix} 3 & 6 \\ 6 & 11 \end{bmatrix}$$
    [ ] $$\begin{bmatrix} 3 & 5 \\ 5 & 14 \end{bmatrix}$$
    [ ] $$\begin{bmatrix} 6 & 3 \\ 3 & 14 \end{bmatrix}$$
- Q: Suppose the columns of $A$ are orthonormal, so that $A^T A = I$. Then the least squares solution of $Ax \approx b$ is given by:
    [CORRECT] $\hat{x} = A^T b$
    [ ] $\hat{x} = A^{-1} b$
    [ ] $\hat{x} = A b$
    [ ] $\hat{x} = b - A^T b$
- Q: For a real matrix $A$ of shape $m \times n$, when is the Gram matrix $A^T A$ invertible?
    [CORRECT] If and only if the columns of $A$ are linearly independent
    [ ] If and only if the rows of $A$ are linearly independent
    [ ] If and only if the matrix $A$ is square and nonzero
    [ ] If and only if all entries of $A$ are strictly positive
- Q: If $\hat{x}$ satisfies the normal equations $A^T A \hat{x} = A^T b$, what can be said about the residual vector $r = b - A\hat{x}$?
    [CORRECT] It is orthogonal to every column of $A$
    [ ] It is parallel to every column of $A$
    [ ] It must equal the zero vector exactly
    [ ] It is a scalar multiple of the vector $b$
- Q: A numerical analyst warns that forming $A^T A$ explicitly can be risky for ill conditioned problems. If $\kappa(A)$ denotes the 2-norm condition number of $A$, how does the condition number of the Gram matrix relate to it?
    [CORRECT] $\kappa(A^T A) = \kappa(A)^2$
    [ ] $\kappa(A^T A) = \kappa(A)$
    [ ] $\kappa(A^T A) = \sqrt{\kappa(A)}$
    [ ] $\kappa(A^T A) = 2\,\kappa(A)$
- Q: Suppose we want the constant $c$ that best fits the data $b = \begin{bmatrix} 1 \\ 2 \\ 5 \end{bmatrix}$ in the least squares sense, so $A = \begin{bmatrix} 1 \\ 1 \\ 1 \end{bmatrix}$. Solving the normal equation $A^T A \, c = A^T b$ gives:
    [CORRECT] $c = \frac{8}{3}$
    [ ] $c = 8$
    [ ] $c = \frac{3}{8}$
    [ ] $c = 3$

### The projection matrix onto a column space

- Q: Project the vector $b = \begin{bmatrix} 3 \\ 1 \end{bmatrix}$ onto the line spanned by $a = \begin{bmatrix} 1 \\ 1 \end{bmatrix}$ using $p = \frac{a^T b}{a^T a}\, a$. What is the projection $p$?
    [CORRECT] $\begin{bmatrix} 2 \\ 2 \end{bmatrix}$
    [ ] $\begin{bmatrix} 3 \\ 3 \end{bmatrix}$
    [ ] $\begin{bmatrix} 2 \\ 1 \end{bmatrix}$
    [ ] $\begin{bmatrix} 4 \\ 4 \end{bmatrix}$
- Q: Let $A = \begin{bmatrix} 1 \\ 0 \end{bmatrix}$. Using $P = A(A^T A)^{-1} A^T$, what is the projection matrix onto the column space of $A$?
    [CORRECT] $\begin{bmatrix} 1 & 0 \\ 0 & 0 \end{bmatrix}$
    [ ] $\begin{bmatrix} 0 & 0 \\ 0 & 1 \end{bmatrix}$
    [ ] $\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}$
    [ ] $\begin{bmatrix} 1 & 1 \\ 0 & 0 \end{bmatrix}$
- Q: If $P = A(A^T A)^{-1} A^T$ is the projection matrix onto the column space of $A$, which pair of properties must $P$ always satisfy?
    [CORRECT] It is symmetric and satisfies $P^2 = P$.
    [ ] It is invertible and satisfies $P^2 = I$.
    [ ] It is symmetric and satisfies $P^2 = I$.
    [ ] It is orthogonal and satisfies $P^{-1} = P^T$.
- Q: Let $P$ be the projection matrix onto the column space of $A$. Which equation expresses the key fact that the error vector $b - Pb$ is perpendicular to that column space?
    [CORRECT] $A^T(b - Pb) = 0$
    [ ] $A^T(b - Pb) = b$
    [ ] $A(b - Pb) = b$
    [ ] $P(b - Pb) = b$
- Q: If $A$ is an $n \times n$ invertible matrix, what does the formula $P = A(A^T A)^{-1} A^T$ give for the projection onto its column space?
    [CORRECT] $P = I$
    [ ] $P = A$
    [ ] $P = 0$
    [ ] $P = A^T$
- Q: Suppose $P$ projects onto the column space of $A$, and the vector $b$ already lies in that column space. What is the result of applying $P$ to $b$?
    [CORRECT] $Pb = b$
    [ ] $Pb = 0$
    [ ] $Pb = A^T b$
    [ ] $Pb = b - p$

### Applications: Least squares and linear regression foundations

- Q: What problem is the least-squares method designed to solve?
    [CORRECT] Finding the x that minimizes ‖Ax − b‖ when Ax = b has no exact solution
    [ ] Choosing the x that maximizes the determinant of the matrix A
    [ ] Rewriting any matrix A as a diagonal matrix via row operations
    [ ] Finding exact solutions only when Ax = b has infinitely many solutions
- Q: How does least squares relate to fitting a linear regression model?
    [CORRECT] Regression fits a linear model by minimizing squared error when no exact fit exists
    [ ] Regression avoids matrix operations, so least squares is never needed
    [ ] Regression is a classification method, so least squares does not apply to it
    [ ] Regression always admits a perfect exact solution, so squared error is zero
- Q: Consider the overdetermined system $A\mathbf{x} \approx \mathbf{b}$ where $$A = \begin{bmatrix} 1 & 0 \\ 1 & 1 \\ 1 & 2 \end{bmatrix}, \quad \mathbf{b} = \begin{bmatrix} 1 \\ 3 \\ 4 \end{bmatrix}.$$ Which vector $\hat{\mathbf{x}} = \begin{bmatrix} \hat{x}_1 \\ \hat{x}_2 \end{bmatrix}$ is the least-squares solution obtained by solving the normal equations $A^\mathsf{T}\!A\hat{\mathbf{x}} = A^\mathsf{T}\mathbf{b}$?
    [CORRECT] $\hat{\mathbf{x}} = \begin{bmatrix} 1 \\ 1.5 \end{bmatrix}$
    [ ] $\hat{\mathbf{x}} = \begin{bmatrix} 1.5 \\ 1 \end{bmatrix}$
    [ ] $\hat{\mathbf{x}} = \begin{bmatrix} 0.5 \\ 2 \end{bmatrix}$
    [ ] $\hat{\mathbf{x}} = \begin{bmatrix} 2 \\ 0.5 \end{bmatrix}$
- Q: Consider the overdetermined system $A\mathbf{x} \approx \mathbf{b}$ with $$A = \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ 1 & 1 \end{bmatrix}, \quad \mathbf{b} = \begin{bmatrix} 2 \\ 3 \\ 7 \end{bmatrix}.$$ Compute the least-squares solution $\hat{\mathbf{x}}$ using the normal equations. What is $\hat{\mathbf{x}}$?
    [CORRECT] $\begin{bmatrix} 3 \\ 2 \end{bmatrix}$
    [ ] $\begin{bmatrix} 2 \\ 3 \end{bmatrix}$
    [ ] $\begin{bmatrix} 4 \\ 3 \end{bmatrix}$
    [ ] $\begin{bmatrix} 3 \\ 4 \end{bmatrix}$
- Q: Why can the exact equality Ax = b fail to have a solution in least-squares settings?
    [CORRECT] Because b may lie outside the column space of A
    [ ] Because the determinant of A is undefined
    [ ] Because the entries of x are required to be integers
    [ ] Because the matrix A is always singular
- Q: Which normal equation characterizes the least-squares estimate $\hat{x}$ for $Ax = b$?
    [CORRECT] $A^T A \hat{x} = A^T b$
    [ ] $A \hat{x} = b$
    [ ] $A^{-1} b = \hat{x}$
    [ ] $A A^T \hat{x} = b$
- Q: If $A$ has linearly independent columns, which closed-form formula gives the least-squares solution $\hat{x}$?
    [ ] $\hat{x} = A^Tb$
    [ ] $\hat{x} = A^{-1}A^Tb$
    [CORRECT] $\hat{x} = (A^TA)^{-1}A^Tb$
    [ ] $\hat{x} = A(A^TA)^{-1}b$

### The residual lives in the left null space

- Q: Let $A = \begin{bmatrix} 1 \\ 1 \end{bmatrix}$ and $b = \begin{bmatrix} 1 \\ 3 \end{bmatrix}$. The least squares solution gives $\hat{x} = 2$, so $A\hat{x} = \begin{bmatrix} 2 \\ 2 \end{bmatrix}$. What is the residual $r = b - A\hat{x}$, and does it satisfy $A^{T}r = 0$?
    [CORRECT] $r = \begin{bmatrix} -1 \\ 1 \end{bmatrix}$, and $A^{T}r = 0$
    [ ] $r = \begin{bmatrix} 1 \\ 1 \end{bmatrix}$, and $A^{T}r = 0$
    [ ] $r = \begin{bmatrix} 1 \\ -1 \end{bmatrix}$, and $A^{T}r = 0$
    [ ] $r = \begin{bmatrix} -1 \\ -1 \end{bmatrix}$, and $A^{T}r = 0$
- Q: Let $A$ be an $m \times n$ matrix with $m > n$, and let $\hat{x}$ be the least squares solution to $Ax = b$. If $r = b - A\hat{x}$ is the residual, which equation must $r$ satisfy?
    [CORRECT] $A^{T} r = 0$
    [ ] $A r = 0$
    [ ] $A^{T} r = b$
    [ ] $A r = b$
- Q: A classmate says: since the residual is annihilated, it must lie in the null space of $A$. For an $m \times n$ matrix with $m > n$, why is this claim incorrect?
    [CORRECT] $r$ lives in $\mathbb{R}^m$, while $N(A)$ is a subspace of $\mathbb{R}^n$, so $r$ cannot belong to it
    [ ] $r$ lives in $\mathbb{R}^n$, while $N(A)$ is a subspace of $\mathbb{R}^m$, so $r$ cannot belong to it
    [ ] $N(A)$ contains only the zero vector, so no nonzero vector can ever be inside it
    [ ] $N(A)$ requires $Ar = b$ to hold, but the residual instead satisfies $Ar = 0$
- Q: Suppose $b$ already lies in the column space of $A$, so $Ax = b$ has an exact solution. What can be said about the least squares residual $r$?
    [CORRECT] $r = 0$, and the zero vector still counts as a member of $N(A^{T})$
    [ ] $r = b$, because the least squares process makes no progress here
    [ ] $r$ equals the projection of $b$ onto $C(A)$, so it is nonzero
    [ ] $r$ is undefined, because $A^{T}A$ becomes singular in this case
- Q: Which manipulation most directly proves that the residual $r = b - A\hat{x}$ lies in the left null space of $A$?
    [CORRECT] Starting from $A^{T}A\hat{x} = A^{T}b$, rearrange to get $A^{T}r = 0$
    [ ] Starting from $A\hat{x} = b$, multiply both sides by $A^{T}$
    [ ] Applying rank nullity to $A$ to force every entry of $r$ to zero
    [ ] Using the identity $AA^{T} = I$ so that $A^{T}r$ reduces to zero
- Q: In least squares, the residual $r = b - A\hat{x}$ is guaranteed to lie in which fundamental subspace of $A$?
    [CORRECT] The left null space $N(A^{T})$
    [ ] The column space $C(A)$
    [ ] The null space $N(A)$
    [ ] The row space $C(A^{T})$

