# SOURCE PACK — Mathematics / Linear Algebra / 08 Symmetric Matrices and Quadratic Forms

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. From quadratic functions to symmetric matrices   (6 questions)
2. Classifying definiteness by eigenvalue signs   (6 questions)
3. Definiteness as shape: bowls, domes, and saddles   (12 questions)
4. The spectral theorem: real eigenvalues, orthogonal eigenvectors   (12 questions)

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
- Orthogonality and orthonormal bases
- The shadow formula: projecting one vector onto another
- Projections of vectors onto subspaces
- The Gram matrix and the normal equations
- The projection matrix onto a column space
- Applications: Least squares and linear regression foundations
- The residual lives in the left null space
- Changing the basis of a vector space
- Constructing the change-of-basis matrix
- Gram-Schmidt: subtracting the shadows
- From orthogonal to orthonormal: normalization
- QR decomposition from Gram-Schmidt
- Intuition behind eigenvectors and eigenvalues
- The characteristic equation and solving for eigenvalues
- Eigenspaces are null spaces: reusing the RREF toolkit
- Eigenspaces and basis of eigenvectors
- Algebraic vs geometric multiplicity and diagonalizability
- Diagonalization of matrices
- Application: PCA and PageRank algorithm

## Covered by LATER lessons — do not teach these here

- 09 SVD and PCA: The Capstone: Why A transpose A: turning any matrix symmetric, Finding V and the singular values, Building U: the translation formula, Filling U: silent dimensions from the left null space, SVD as rotate, stretch, rotate, PCA by hand: center, covariance, eigendecompose, project, The toolkit dependency graph: how it all composes

## The live quiz bank for these topics — 36 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### From quadratic functions to symmetric matrices

- Q: Let $A = \begin{bmatrix} 1 & 2 \\ 2 & 3 \end{bmatrix}$ and $\mathbf{x} = \begin{bmatrix} 1 \\ 2 \end{bmatrix}$. Compute the value of $\mathbf{x}^T A \mathbf{x}$.
    [ ] $17$
    [ ] $14$
    [ ] $25$
    [CORRECT] $21$
- Q: When writing a quadratic form as $\mathbf{x}^T A \mathbf{x}$, why can we always insist that $A$ be symmetric without changing the function?
    [ ] Every real square matrix can be factored into a product of two symmetric matrices
    [ ] Only symmetric matrices produce real-valued outputs in the expression $\mathbf{x}^T A \mathbf{x}$
    [CORRECT] The skew-symmetric part of any matrix contributes zero to the value of $\mathbf{x}^T A \mathbf{x}$
    [ ] Because $\mathbf{x}^T A \mathbf{x}$ is a scalar, only the diagonal entries of $A$ affect its value
- Q: For any square matrix $B$, the quadratic form $\mathbf{x}^T B \mathbf{x}$ equals $\mathbf{x}^T M \mathbf{x}$ for which symmetric matrix $M$?
    [ ] $B B^T$
    [ ] $\frac{1}{2}\left(B - B^T\right)$
    [ ] $B + B^T$
    [CORRECT] $\frac{1}{2}\left(B + B^T\right)$
- Q: Suppose $B$ and $C$ are two different square matrices with $\mathbf{x}^T B \mathbf{x} = \mathbf{x}^T C \mathbf{x}$ for every vector $\mathbf{x}$. What must be true?
    [ ] $B$ and $C$ must actually be the same matrix
    [ ] $B - C$ must be a symmetric matrix with zero trace
    [CORRECT] $B - C$ must be a skew-symmetric matrix
    [ ] $B$ and $C$ must share the same eigenvalues
- Q: For $A = \begin{bmatrix} 2 & 1 \\ 1 & 4 \end{bmatrix}$ and $\mathbf{x} = \begin{bmatrix} x \\ y \end{bmatrix}$, which polynomial equals $\mathbf{x}^T A \mathbf{x}$?
    [ ] $2x^2 + xy + 4y^2$
    [CORRECT] $2x^2 + 2xy + 4y^2$
    [ ] $2x^2 + 4xy + 4y^2$
    [ ] $x^2 + 2xy + 2y^2$
- Q: Which symmetric matrix $A$ represents the quadratic form $q(x_1, x_2) = 2x_1^2 + 6x_1x_2 + 5x_2^2$ in the form $q(\mathbf{x}) = \mathbf{x}^T A \mathbf{x}$?
    [CORRECT] $\begin{bmatrix} 2 & 3 \\ 3 & 5 \end{bmatrix}$
    [ ] $\begin{bmatrix} 2 & 6 \\ 6 & 5 \end{bmatrix}$
    [ ] $\begin{bmatrix} 2 & 6 \\ 0 & 5 \end{bmatrix}$
    [ ] $\begin{bmatrix} 5 & 3 \\ 3 & 2 \end{bmatrix}$

### Classifying definiteness by eigenvalue signs

- Q: A symmetric matrix $F$ has the repeated eigenvalue $6$ with multiplicity three, so its only eigenvalue is $6$. Classify the definiteness of $F$.
    [CORRECT] The matrix $F$ is positive definite.
    [ ] The matrix $F$ is positive semidefinite.
    [ ] The matrix $F$ is indefinite in sign.
    [ ] The matrix $F$ cannot be classified.
- Q: A symmetric matrix $E$ is positive definite. What does this guarantee about the quadratic form $q(\mathbf{x}) = \mathbf{x}^T E \mathbf{x}$ for every nonzero vector $\mathbf{x}$?
    [CORRECT] The value of $q(\mathbf{x})$ is strictly positive.
    [ ] The value of $q(\mathbf{x})$ is strictly negative.
    [ ] The value of $q(\mathbf{x})$ is nonnegative, possibly zero.
    [ ] The value of $q(\mathbf{x})$ depends on the sign of $\mathbf{x}$.
- Q: A symmetric matrix $D$ has eigenvalues $4$, $0$, and $1$. Classify the definiteness of $D$.
    [CORRECT] The matrix $D$ is positive semidefinite.
    [ ] The matrix $D$ is positive definite.
    [ ] The matrix $D$ is indefinite in sign.
    [ ] The matrix $D$ is negative semidefinite.
- Q: A symmetric matrix $C$ has eigenvalues $3$, $-2$, and $4$. Classify the definiteness of $C$.
    [CORRECT] The matrix $C$ is indefinite in sign.
    [ ] The matrix $C$ is positive definite.
    [ ] The matrix $C$ is negative definite.
    [ ] The matrix $C$ is positive semidefinite.
- Q: A symmetric matrix $A$ has eigenvalues $2$, $5$, and $7$. Classify the definiteness of $A$.
    [CORRECT] The matrix $A$ is positive definite.
    [ ] The matrix $A$ is negative definite.
    [ ] The matrix $A$ is positive semidefinite.
    [ ] The matrix $A$ is indefinite in sign.
- Q: A symmetric matrix $B$ has eigenvalues $-1$, $-3$, and $-6$. Classify the definiteness of $B$.
    [CORRECT] The matrix $B$ is negative definite.
    [ ] The matrix $B$ is positive definite.
    [ ] The matrix $B$ is negative semidefinite.
    [ ] The matrix $B$ is indefinite in sign.

### Definiteness as shape: bowls, domes, and saddles

- Q: Which of the following conditions is by itself sufficient to conclude that a symmetric matrix $A$ is positive definite, so that $z=\mathbf{x}^T A\,\mathbf{x}$ is a bowl?
    [ ] Every diagonal entry of $A$ is a strictly positive number
    [ ] The determinant of $A$ is computed to be strictly positive
    [ ] All of the entries of $A$ are strictly positive real numbers
    [CORRECT] Every leading principal minor of $A$ is computed to be positive
- Q: The function $f(x,y)=x^2+xy+2y^2$ has a critical point at the origin. Its Hessian there is $H=\begin{bmatrix}2 & 1\\ 1 & 4\end{bmatrix}$. What does the second derivative test conclude?
    [ ] A saddle point, since the Hessian has a nonzero off-diagonal entry
    [ ] A strict local maximum, since the Hessian is negative definite
    [CORRECT] A strict local minimum, since the Hessian is positive definite
    [ ] An inconclusive test, since the Hessian is only positive semidefinite
- Q: For which values of the parameter $k$ is the quadratic form $Q(x,y)=x^2+kxy+4y^2$ positive definite, so that its graph is an upward bowl?
    [ ] Exactly when $k$ satisfies $0 < k < 4$
    [ ] Exactly when $k$ satisfies $k > 4$ or $k < -4$
    [CORRECT] Exactly when $k$ satisfies $-4 < k < 4$
    [ ] For every real value of the parameter $k$
- Q: Classify the quadratic form $Q(x,y)=-2x^2+2xy-3y^2$ and the behavior of $z=Q(x,y)$ at the origin.
    [ ] Indefinite: the origin is a saddle point of the surface
    [CORRECT] Negative definite: a downward dome with a strict maximum at the origin
    [ ] Positive definite: an upward bowl with a strict minimum at the origin
    [ ] Negative semidefinite: a dome that stays flat along a line through the origin
- Q: Let $P$ be an orthogonal matrix and set $\mathbf{x}=P\mathbf{y}$, which turns $Q(\mathbf{x})=\mathbf{x}^T A\,\mathbf{x}$ into $\mathbf{y}^T(P^TAP)\,\mathbf{y}$. Which statement about the two quadratic forms is correct?
    [ ] The new form is always positive definite, since $P^TAP$ squares away the signs
    [CORRECT] They have the same definiteness, since $P^TAP$ has the same eigenvalues as $A$
    [ ] The new form is a saddle whenever $P$ mixes the variables of the old form
    [ ] Definiteness can change, since the entries of $P^TAP$ differ from those of $A$
- Q: Which condition is by itself sufficient to conclude that a symmetric $3\times 3$ matrix $A$ is negative definite, so that $z=\mathbf{x}^T A\,\mathbf{x}$ is a downward dome?
    [ ] Its leading principal minors are all strictly negative real numbers
    [ ] Its diagonal entries and its trace are all strictly negative numbers
    [CORRECT] Its leading principal minors alternate in sign, starting with a negative one
    [ ] Its determinant is negative and its off-diagonal entries are positive
- Q: Classify the quadratic form $Q(x,y)=2x^2+4xy+5y^2$ and describe the graph of $z=Q(x,y)$ near the origin.
    [CORRECT] Positive definite: an upward bowl with a strict minimum at the origin
    [ ] Negative definite: a downward dome with a strict maximum at the origin
    [ ] Indefinite: a saddle that rises in one direction and falls in another
    [ ] Positive semidefinite: a valley that is flat along a line through the origin
- Q: Consider the quadratic form $Q(x,y)=x^2-4xy+4y^2$, which factors as $(x-2y)^2$. Which statement correctly describes its definiteness and geometry?
    [ ] Positive definite, with a strict minimum only at the origin itself
    [ ] Indefinite, so the origin behaves as a saddle point of the graph
    [CORRECT] Positive semidefinite, taking the value zero along the line $x=2y$
    [ ] Negative semidefinite, taking its maximum along the line $x=2y$
- Q: A symmetric $2\times 2$ matrix $A$ has trace $-7$ and determinant $10$. Without computing eigenvalues explicitly, classify the surface $z=\mathbf{x}^T A\,\mathbf{x}$ near the origin.
    [CORRECT] A downward dome: both eigenvalues are negative, giving a strict peak
    [ ] An upward bowl: the positive determinant forces both eigenvalues positive
    [ ] A saddle: the negative trace forces the eigenvalues to have opposite signs
    [ ] Undetermined: the trace and determinant alone cannot fix the eigenvalue signs
- Q: A symmetric matrix $A$ has eigenvalues $3$, $1$, and $-2$. Near the origin, the surface $z=\mathbf{x}^T A\,\mathbf{x}$ most resembles which shape, and why?
    [ ] A bowl, since two of the three eigenvalues happen to be positive
    [ ] A dome, since the single negative eigenvalue flips the shape over
    [CORRECT] A saddle, since the eigenvalues include both positive and negative signs
    [ ] A valley, since one eigenvalue has a much smaller magnitude than the rest
- Q: Classify the quadratic form $Q(x,y)=2x^2-4xy+y^2$ and describe the graph of $z=Q(x,y)$ near the origin.
    [ ] Positive definite: the $x^2$ coefficient is positive, so it is a bowl
    [CORRECT] Indefinite: it rewrites as $2(x-y)^2-y^2$, so the surface is a saddle
    [ ] Negative definite: the cross term dominates, so the surface is a dome
    [ ] Positive semidefinite: it vanishes on a line, so it forms a trough
- Q: Classify the quadratic form $Q(x,y)=4xy$ and the shape of $z=Q(x,y)$ near the origin.
    [CORRECT] A saddle: the form takes both signs in every neighborhood of the origin
    [ ] A bowl: the positive coefficient keeps the form nonnegative near the origin
    [ ] A dome: the form curves downward in every direction from the origin
    [ ] Flat: with no squared terms the form has no curvature at the origin

### The spectral theorem: real eigenvalues, orthogonal eigenvectors

- Q: Let $A$ be a symmetric matrix with $A v_1 = 2 v_1$ and $A v_2 = 5 v_2$ for nonzero vectors $v_1, v_2$. Which argument correctly proves that $v_1$ and $v_2$ are orthogonal?
    [CORRECT] Since $v_2^T A v_1$ equals both $2\, v_2^T v_1$ and $5\, v_2^T v_1$, it follows that $v_2^T v_1 = 0$
    [ ] Since $A$ scales $v_1$ and $v_2$ by different factors, their images are orthogonal, so $v_2^T v_1 = 0$
    [ ] Since eigenvectors are always linearly independent, independence forces $v_2^T v_1 = 0$
    [ ] Since eigenvectors of any square matrix are orthogonal, we conclude $v_2^T v_1 = 0$
- Q: Let $A$ be symmetric with orthonormal eigenvectors $q_1=\frac{1}{\sqrt{2}}\begin{bmatrix}1\\1\end{bmatrix}$, $q_2=\frac{1}{\sqrt{2}}\begin{bmatrix}1\\-1\end{bmatrix}$ and eigenvalues $\lambda_1=1$, $\lambda_2=3$. What is $A^2$?
    [CORRECT] $\begin{bmatrix}5&-4\\-4&5\end{bmatrix}$
    [ ] $\begin{bmatrix}2&-1\\-1&2\end{bmatrix}$
    [ ] $\begin{bmatrix}4&-2\\-2&4\end{bmatrix}$
    [ ] $\begin{bmatrix}10&-8\\-8&10\end{bmatrix}$
- Q: Let $A$ be a symmetric $3 \times 3$ matrix with orthonormal eigenvectors $q_1, q_2, q_3$ and corresponding eigenvalues $\lambda_1, \lambda_2, \lambda_3$. If $Q$ is the matrix whose columns are $q_1, q_2, q_3$, what is the matrix $Q^T A Q$?
    [CORRECT] The diagonal matrix with $\lambda_1, \lambda_2, \lambda_3$ on its diagonal
    [ ] The diagonal matrix with $1/\lambda_1, 1/\lambda_2, 1/\lambda_3$ on its diagonal
    [ ] The identity matrix, since $Q$ has orthonormal columns
    [ ] The matrix $A$ itself, since $Q^T Q = I$
- Q: Find the eigenvalues of the symmetric matrix $$A = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}$$
    [CORRECT] $\lambda = 1$ and $\lambda = 3$
    [ ] $\lambda = 2$ and $\lambda = 2$
    [ ] $\lambda = 1$ and $\lambda = 2$
    [ ] $\lambda = -1$ and $\lambda = 3$
- Q: Suppose $Q$ is orthogonal and $Q^TAQ=\operatorname{diag}(1,4,-2)$. What is $Q^T(A+3I)Q$?
    [ ] $\operatorname{diag}(3,12,-6)$
    [ ] $\operatorname{diag}(-2,1,-5)$
    [CORRECT] $\operatorname{diag}(4,7,1)$
    [ ] $\operatorname{diag}(1,4,-2)$
- Q: Let $q_1,q_2$ be orthonormal eigenvectors of a symmetric matrix with eigenvalues $1$ and $-2$. If $x=3q_1+4q_2$, what is $x^TAx$?
    [ ] $-7$
    [CORRECT] $-23$
    [ ] $25$
    [ ] $41$
- Q: Which property of a real matrix $A$ guarantees, by the spectral theorem, that $A$ has only real eigenvalues and an orthonormal basis of eigenvectors?
    [CORRECT] $A$ is symmetric, meaning $A = A^T$
    [ ] $A$ is orthogonal, meaning $A^T A = I$
    [ ] $A$ is invertible, meaning $\det A \neq 0$
    [ ] $A$ is diagonal, meaning $a_{ij} = 0$ for $i \neq j$
- Q: Symmetry is essential for guaranteeing orthogonal eigenvectors. Which of the following matrices has real eigenvalues but does not have an orthogonal basis of eigenvectors?
    [CORRECT] $\begin{bmatrix} 1 & 1 \\ 0 & 2 \end{bmatrix}$
    [ ] $\begin{bmatrix} 1 & 1 \\ 1 & 2 \end{bmatrix}$
    [ ] $\begin{bmatrix} 2 & 0 \\ 0 & 2 \end{bmatrix}$
    [ ] $\begin{bmatrix} 1 & -1 \\ -1 & 2 \end{bmatrix}$
- Q: For $$A=\begin{bmatrix}0&2\\2&0\end{bmatrix}$$ which orthogonal matrix $Q$ satisfies $Q^TAQ=\begin{bmatrix}2&0\\0&-2\end{bmatrix}$?
    [ ] $\begin{bmatrix}1&1\\1&-1\end{bmatrix}$
    [ ] $\frac{1}{\sqrt{2}}\begin{bmatrix}1&1\\-1&1\end{bmatrix}$
    [ ] $\frac{1}{\sqrt{2}}\begin{bmatrix}1&1\\1&1\end{bmatrix}$
    [CORRECT] $\frac{1}{\sqrt{2}}\begin{bmatrix}1&1\\1&-1\end{bmatrix}$
- Q: The matrix $$A = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}$$ has eigenvalue $\lambda = 3$ with eigenvector $\begin{bmatrix} 1 \\ 1 \end{bmatrix}$. Which vector is an eigenvector for the other eigenvalue of $A$?
    [CORRECT] $\begin{bmatrix} 1 \\ -1 \end{bmatrix}$
    [ ] $\begin{bmatrix} 1 \\ 1 \end{bmatrix}$
    [ ] $\begin{bmatrix} 1 \\ 2 \end{bmatrix}$
    [ ] $\begin{bmatrix} 2 \\ 1 \end{bmatrix}$
- Q: A symmetric matrix has a repeated eigenvalue. Which statement is correct?
    [ ] It must have exactly one eigenvector for the repeated eigenvalue
    [ ] It cannot be diagonalized because the eigenvalue is repeated
    [CORRECT] It still has an orthonormal eigenbasis, chosen freely inside each eigenspace
    [ ] It gains a complex eigenvalue pair from the repeated eigenvalue
- Q: A symmetric $3\times3$ matrix has eigenvalues $2,5,7$. Which statement must be true?
    [CORRECT] $x^TAx>0$ for every nonzero vector $x$
    [ ] $x^TAx=0$ for at least one nonzero vector $x$
    [ ] $x^TAx<0$ for at least one unit vector $x$
    [ ] $x^TAx=0$ whenever $x_1+x_2+x_3=0$

