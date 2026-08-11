# SOURCE PACK — Mathematics / Linear Algebra / 07 Eigenvalues, Eigenvectors, and Diagonalization

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Intuition behind eigenvectors and eigenvalues   (5 questions)
2. The characteristic equation and solving for eigenvalues   (5 questions)
3. Eigenspaces are null spaces: reusing the RREF toolkit   (13 questions)
4. Eigenspaces and basis of eigenvectors   (4 questions)
5. Algebraic vs geometric multiplicity and diagonalizability   (12 questions)
6. Diagonalization of matrices   (5 questions)
7. Application: PCA and PageRank algorithm   (6 questions)

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

## Covered by LATER lessons — do not teach these here

- 08 Symmetric Matrices and Quadratic Forms: From quadratic functions to symmetric matrices, Classifying definiteness by eigenvalue signs, Definiteness as shape: bowls, domes, and saddles, The spectral theorem: real eigenvalues, orthogonal eigenvectors
- 09 SVD and PCA: The Capstone: Why A transpose A: turning any matrix symmetric, Finding V and the singular values, Building U: the translation formula, Filling U: silent dimensions from the left null space, SVD as rotate, stretch, rotate, PCA by hand: center, covariance, eigendecompose, project, The toolkit dependency graph: how it all composes

## The live quiz bank for these topics — 50 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Intuition behind eigenvectors and eigenvalues

- Q: Given a nonzero vector v with Av = 3v, how are v and the number 3 classified?
    [ ] v is singular and 3 is the determinant
    [ ] v is a basis and 3 is its dimension
    [CORRECT] v is an eigenvector and 3 is its eigenvalue
    [ ] v is a null vector and 3 is its rank
- Q: Geometrically, why are eigenvectors a useful way to understand a linear transformation?
    [ ] They exist only in the case where the matrix happens to be symmetric
    [ ] They give a direct closed-form formula for the matrix's inverse
    [ ] They always line up exactly with the standard coordinate basis vectors
    [CORRECT] They mark directions the map only stretches or shrinks, never rotating
- Q: Why are eigenvalues found before solving for the eigenvectors, rather than the other way around?
    [ ] Because eigenvectors cannot exist until a determinant is computed
    [ ] Because each eigenvector is simply a row taken from A - I
    [CORRECT] Because the equation Av = λv needs the specific value of λ to solve for v
    [ ] Because the eigenvalues are read directly off the inverse of A
- Q: A $2 \times 2$ matrix $A$ is applied to four different vectors. The before and after vectors are plotted as arrows. For which plot does the BEFORE vector clearly represent an eigenvector of $A$?
    [CORRECT] Before: $(1, 0)$ points along the x-axis. After: $(3, 0)$ points along the same x-axis.
    [ ] Before: $(1, 1)$ points diagonally. After: $(2, 3)$ points in a different direction.
    [ ] Before: $(0, 1)$ points along the y-axis. After: $(1, 1)$ points diagonally.
    [ ] Before: $(2, 1)$ points in the first quadrant. After: $(4, -2)$ points in the fourth quadrant.
- Q: For a matrix A and one of its eigenvectors, what does the corresponding eigenvalue tell you?
    [ ] The count of rows and columns making up A
    [CORRECT] The factor by which that eigenvector is scaled
    [ ] The number of pivot positions found in A
    [ ] The determinant of the entire square matrix A itself

### The characteristic equation and solving for eigenvalues

- Q: For a $3 \times 3$ matrix $A$, the characteristic polynomial in $\lambda$ is obtained from which expression?
    [CORRECT] The determinant of the matrix $A - \lambda I$
    [ ] The null space of the matrix $A$
    [ ] The trace of $A$ taken on its own
    [ ] The sum of all the entries of $A$
- Q: How are the eigenvalues of a square matrix $A$ found?
    [ ] By solving the matrix equation $A^2 = I$
    [ ] By reducing A to RREF and reading its diagonal
    [CORRECT] By solving $\det(A - \lambda I) = 0$ for $\lambda$
    [ ] By solving the homogeneous system $Av = 0$
- Q: Once you have computed the roots of the characteristic polynomial of A, what have you found?
    [CORRECT] The eigenvalues of the matrix A
    [ ] The inverse of the matrix A
    [ ] The eigenvectors of A directly
    [ ] The orthogonal projection matrix
- Q: Why does the characteristic equation set det(A - λI) equal to zero rather than using A alone?
    [CORRECT] Because (A - λI)v = 0 admits a nonzero v only when A - λI is singular
    [ ] Because λI serves, by its very definition, as the inverse of matrix A
    [ ] Because subtracting λI is required to force the matrix A to be square
    [ ] Because subtracting λI is what makes every determinant come out positive
- Q: If the characteristic polynomial factors as (λ - 2)(λ - 3) = 0, what are the eigenvalues?
    [ ] λ = 5 and λ = 6
    [CORRECT] λ = 2 and λ = 3
    [ ] λ = 1 and λ = 0
    [ ] λ = -2 and λ = -3

### Eigenspaces are null spaces: reusing the RREF toolkit

- Q: For a $4\times4$ matrix $A$, suppose $\operatorname{rank}(A-7I)=2$. What is $\dim E_7$?
    [ ] It is $4$: all columns become free variables.
    [CORRECT] It is $2$: two columns are free variables.
    [ ] It is $0$: the matrix $A-7I$ is invertible.
    [ ] It is $1$: each eigenvalue gives one eigenvector.
- Q: If $\operatorname{rref}(A-2I)=\begin{bmatrix}1&0&-3\\0&1&2\\0&0&0\end{bmatrix}$, which set spans $E_2$?
    [ ] $\operatorname{span}\{(1,0,-3),(0,1,2)\}$
    [ ] $\operatorname{span}\{(-3,2,1)\}$
    [ ] $\operatorname{span}\{(0,0,0)\}$
    [CORRECT] $\operatorname{span}\{(3,-2,1)\}$
- Q: Which statement about $E_\lambda=\mathcal{N}(A-\lambda I)$ is correct?
    [ ] It excludes $0$, since eigenvectors are nonzero.
    [ ] It is a line whenever $\lambda$ is real.
    [CORRECT] It contains $0$, but eigenvectors are nonzero.
    [ ] It is empty unless $A$ is diagonalizable.
- Q: Suppose the nonzero vectors $u$ and $v$ both lie in $E_3=\mathcal{N}(A-3I)$. Which statement must be true?
    [CORRECT] The vector $2u-5v$ must also lie in $E_3$.
    [ ] The sum $u+v$ lies in $E_3$ only when $u=v$.
    [ ] The vector $2u$ stays in $E_3$, but $u+v$ may not.
    [ ] No combination of $u$ and $v$ is forced to lie in $E_3$.
- Q: If $\operatorname{rref}(A-3I)=\begin{bmatrix}1&0&4\\0&1&-2\\0&0&0\end{bmatrix}$, which set spans $E_3$?
    [CORRECT] $\operatorname{span}\{(-4,2,1)\}$
    [ ] $\operatorname{span}\{(4,-2,1)\}$
    [ ] $\operatorname{span}\{(-4,-2,1)\}$
    [ ] $\operatorname{span}\{(4,2,1)\}$
- Q: If the RREF of $A-5I$ is $I_3$, what is the correct conclusion about $5$ and $A$?
    [ ] The eigenspace is all of $\mathbb{R}^3$.
    [ ] The eigenspace has dimension exactly $1$.
    [CORRECT] The value $5$ is not an eigenvalue of $A$.
    [ ] The matrix $A-5I$ has a nontrivial null space.
- Q: For $A=\begin{bmatrix}2&1\\0&2\end{bmatrix}$ and $\lambda=2$, which set is the eigenspace $E_2$?
    [ ] $\operatorname{span}\{(0,1)\}$
    [CORRECT] $\operatorname{span}\{(1,0)\}$
    [ ] $\operatorname{span}\{(1,1)\}$
    [ ] $\operatorname{span}\{(2,1)\}$
- Q: A nonzero vector $v$ is an eigenvector of $A$ for $\lambda$ exactly when $v$ lies in which null space?
    [CORRECT] $\mathcal{N}(A-\lambda I)$
    [ ] $\mathcal{N}(A+\lambda I)$
    [ ] $\mathcal{N}(A^T-\lambda I)$
    [ ] $\mathcal{N}(A)$ for every $\lambda$
- Q: Let $A=\begin{bmatrix}3&1\\0&2\end{bmatrix}$. Since $E_2=\mathcal{N}(A-2I)$, which set is the eigenspace $E_2$?
    [ ] $\operatorname{span}\{(1,1)\}$
    [CORRECT] $\operatorname{span}\{(-1,1)\}$
    [ ] $\operatorname{span}\{(1,0)\}$
    [ ] $\operatorname{span}\{(0,1)\}$
- Q: Let $A=\begin{bmatrix}2&1\\1&2\end{bmatrix}$ and $v=(1,1)$. For which value $\lambda$ does $v$ lie in $E_\lambda=\mathcal{N}(A-\lambda I)$?
    [ ] $\lambda=1$
    [ ] $\lambda=2$
    [CORRECT] $\lambda=3$
    [ ] $\lambda=4$
- Q: To find a basis for the eigenspace $E_6$ of a $3\times3$ matrix $A$, which matrix should be row reduced?
    [ ] $A$
    [ ] $A+6I$
    [CORRECT] $A-6I$
    [ ] $A^{T}-6I$
- Q: For a $4\times4$ matrix $A$, suppose $\operatorname{rref}(A-\lambda I)$ has pivot columns $1$, $2$, and $4$. What is $\dim E_\lambda$?
    [CORRECT] $1$
    [ ] $2$
    [ ] $3$
    [ ] $4$
- Q: Suppose $\operatorname{rref}(A-4I)=\begin{bmatrix}1&-1&2\\0&0&0\\0&0&0\end{bmatrix}$. Which set is a basis for $E_4$?
    [CORRECT] $\{(1,1,0),\;(-2,0,1)\}$
    [ ] $\{(-1,1,0),\;(2,0,1)\}$
    [ ] $\{(1,1,0),\;(0,0,1)\}$
    [ ] $\{(1,-1,2)\}$

### Eigenspaces and basis of eigenvectors

- Q: What is the eigenspace associated with a particular eigenvalue λ of a matrix A?
    [ ] The set of all nonzero vectors having the same length
    [ ] The entire column space of the matrix A
    [CORRECT] All eigenvectors for that λ together with the zero vector
    [ ] The set of all solutions v to the system Av = b
- Q: Once an eigenvalue λ of a matrix A is known, how do you find its corresponding eigenvectors?
    [ ] Row reduce A all the way to the identity
    [CORRECT] Solve the homogeneous system (A - λI)v = 0
    [ ] Compute the determinant det(A + λI)
    [ ] Invert A and then multiply it by λ
- Q: If λ = 4 and solving (A - 4I)v = 0 yields exactly one independent direction, what follows about that eigenspace?
    [CORRECT] It has a basis of a single vector
    [ ] It contains no nonzero vectors at all
    [ ] It is automatically two-dimensional
    [ ] It must equal the whole vector space
- Q: Why is any nonzero scalar multiple of an eigenvector still an eigenvector for the same λ?
    [CORRECT] Because Av = λv still holds after scaling v by a nonzero c
    [ ] Because scaling a vector resets its eigenvalue to 1
    [ ] Because every eigenvector is required to have unit length
    [ ] Because the determinant cancels out the scalar

### Algebraic vs geometric multiplicity and diagonalizability

- Q: An $n \times n$ matrix $A$ is diagonalizable if and only if:
    [CORRECT] the sum of the geometric multiplicities of its eigenvalues equals $n$
    [ ] the sum of the algebraic multiplicities of its eigenvalues equals $n$
    [ ] every eigenvalue has algebraic multiplicity exactly equal to $1$
    [ ] its characteristic polynomial has $n$ distinct real roots
- Q: Which statement about multiplicities is always true for any eigenvalue $\lambda$ of a square matrix $A$?
    [ ] algebraic multiplicity is at least $1$ and at most the geometric multiplicity
    [ ] geometric multiplicity always equals the algebraic multiplicity exactly
    [CORRECT] geometric multiplicity is at least $1$ and at most the algebraic multiplicity
    [ ] algebraic multiplicity is always one more than the geometric multiplicity
- Q: A $3 \times 3$ matrix $A$ has characteristic polynomial $p(\lambda) = (\lambda - 2)^2(\lambda - 7)$, and $\operatorname{nullity}(A - 2I) = 2$. Which conclusion is correct?
    [CORRECT] Diagonalizable, since $\dim E_2 = 2$ and $\dim E_7 = 1$
    [ ] Not diagonalizable, since $\lambda = 2$ is a repeated eigenvalue
    [ ] Diagonalizable only if $A$ is also assumed to be symmetric
    [ ] Cannot be decided from multiplicity information alone
- Q: Which of the following matrices is diagonalizable?
    [ ] $\begin{bmatrix} 2 & 1 \\ 0 & 2 \end{bmatrix}$
    [ ] $\begin{bmatrix} 0 & 1 \\ 0 & 0 \end{bmatrix}$
    [CORRECT] $\begin{bmatrix} 3 & 0 \\ 0 & 3 \end{bmatrix}$
    [ ] $\begin{bmatrix} 5 & 4 \\ 0 & 5 \end{bmatrix}$
- Q: A $5 \times 5$ matrix $A$ has characteristic polynomial $p(\lambda) = (\lambda - 1)(\lambda - 2)(\lambda - 3)(\lambda - 4)(\lambda - 5)$. Why must $A$ be diagonalizable?
    [ ] distinct eigenvalues force every eigenvalue to have algebraic multiplicity $5$
    [CORRECT] each eigenvalue has geometric multiplicity at least $1$, and there are $5$
    [ ] each eigenvalue has algebraic multiplicity $1$, so eigenspaces have dimension $2$
    [ ] triangular matrices are diagonalizable whenever eigenvalues are distinct
- Q: The geometric multiplicity of an eigenvalue $\lambda = 4$ of a matrix $A$ is defined as:
    [ ] the rank of the matrix $A - 4I$
    [ ] the number of zero entries on the diagonal of $A$
    [CORRECT] the nullity of the matrix $A - 4I$
    [ ] the exponent of $(\lambda - 4)$ in $\det(A - \lambda I)$
- Q: Let $$A = \begin{bmatrix} 2 & 1 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & 3 \end{bmatrix}$$. For the eigenvalue $\lambda = 2$, which statement correctly gives its multiplicities and the resulting conclusion about $A$?
    [ ] algebraic $2$, geometric $2$, so $A$ is diagonalizable
    [ ] algebraic $1$, geometric $2$, so $A$ is diagonalizable
    [CORRECT] algebraic $2$, geometric $1$, so $A$ is not diagonalizable
    [ ] algebraic $1$, geometric $1$, so $A$ is not diagonalizable
- Q: A $5 \times 5$ matrix $A$ has the following data: $\lambda = 1$ has algebraic multiplicity $2$ and geometric multiplicity $2$; $\lambda = 3$ has algebraic multiplicity $2$ and geometric multiplicity $1$; $\lambda = 4$ has algebraic multiplicity $1$ and geometric multiplicity $1$. Which conclusion is correct?
    [ ] $A$ is diagonalizable, since all of its eigenspaces are nontrivial
    [ ] $A$ is diagonalizable, since the eigenvalue $1$ has equal multiplicities
    [ ] $A$ is not diagonalizable, since it has three distinct eigenvalues
    [CORRECT] $A$ is not diagonalizable, since $\dim E_3 = 1 < 2$
- Q: A $4 \times 4$ matrix $A$ has rank $3$, and $\lambda = 0$ is an eigenvalue of $A$ with algebraic multiplicity $2$. Which conclusion is correct?
    [CORRECT] Geometric multiplicity of $0$ is $1$, so $A$ is not diagonalizable
    [ ] Geometric multiplicity of $0$ is $2$, so $A$ is diagonalizable
    [ ] Geometric multiplicity of $0$ is $3$, so $A$ is diagonalizable
    [ ] Geometric multiplicity of $0$ is $1$, so $A$ is diagonalizable
- Q: Suppose a $4 \times 4$ matrix $A$ is diagonalizable and its only eigenvalue is $\lambda = 5$. What must $A$ be?
    [ ] any upper triangular matrix with $5$'s on the diagonal
    [CORRECT] $A = 5I$, since $A = PDP^{-1}$ with $D = 5I$
    [ ] any matrix with characteristic polynomial $(\lambda - 5)^4$
    [ ] $A = 5P$ for some invertible matrix $P$
- Q: Let $$A = \begin{bmatrix} 4 & 1 & 0 \\ 0 & 4 & 0 \\ 0 & 0 & 4 \end{bmatrix}$$. The geometric multiplicity of the eigenvalue $\lambda = 4$ is:
    [ ] $0$
    [ ] $1$
    [CORRECT] $2$
    [ ] $3$
- Q: The eigenvalue $\lambda = 6$ of a matrix $A$ has algebraic multiplicity $3$. Which choice lists all possible values of its geometric multiplicity?
    [CORRECT] $1$, $2$, or $3$
    [ ] $0$, $1$, $2$, or $3$
    [ ] $3$ only
    [ ] $1$ only

### Diagonalization of matrices

- Q: Why can a repeated eigenvalue sometimes prevent a matrix from being diagonalizable?
    [CORRECT] Because the repeat may not yield enough independent eigenvectors
    [ ] Because a repeated eigenvalue forces the determinant to zero
    [ ] Because a diagonal matrix may not repeat any of its entries
    [ ] Because a repeated eigenvalue is always equal to zero
- Q: A $2 \times 2$ matrix is found to have two linearly independent eigenvectors. What can you conclude?
    [ ] The matrix is not diagonalizable
    [CORRECT] The matrix is diagonalizable
    [ ] The matrix must be singular
    [ ] Its determinant must equal 1
- Q: After diagonalizing A as PDP⁻¹, what do the diagonal entries of D represent?
    [ ] The singular values belonging to the matrix A
    [ ] The summed totals of the individual rows of matrix A
    [ ] The coordinates of the standard basis vectors
    [CORRECT] The eigenvalues for the chosen eigenvector basis
- Q: Under what condition is an $n \times n$ matrix diagonalizable?
    [ ] When all of its entries are positive numbers
    [ ] When all of its eigenvalues are equal to each other
    [CORRECT] When it has n independent eigenvectors forming a basis
    [ ] When its determinant is some nonzero value
- Q: What is the main benefit of diagonalizing a matrix?
    [ ] It strips away every one of the matrix's eigenvalues
    [CORRECT] It recasts the action as scaling along eigenvector directions
    [ ] It converts any square matrix into the identity matrix
    [ ] It guarantees the resulting eigenvectors come out mutually orthogonal

### Application: PCA and PageRank algorithm

- Q: In PageRank-style problems modeled by a transition matrix, what role do eigenvectors play?
    [ ] They eliminate the need to use probabilities
    [CORRECT] They can capture the long-run equilibrium of the system
    [ ] They represent only temporary, transient states
    [ ] They are always equal to the all-ones vector
- Q: Why does Principal Component Analysis (PCA) rely on eigenvalues and eigenvectors?
    [ ] Because PCA is constructed entirely from inverse trig functions
    [ ] Because PCA depends on nothing more than computing determinants
    [ ] Because PCA somehow manages to avoid relying on any matrices whatsoever
    [CORRECT] Because eigenvectors identify the main directions of variation in data
- Q: Why are applications like PageRank and PCA emphasized in a machine-learning context?
    [CORRECT] Because they show eigen ideas drive real ranking and data reduction
    [ ] Because they let you skip every data preprocessing step beforehand
    [ ] Because such applications only ever come up inside geometry classes
    [ ] Because together these methods prove every matrix is diagonalizable
- Q: In a transition system such as PageRank, what does the equilibrium (steady-state) vector tell you?
    [ ] Only the total number of links between pages
    [CORRECT] The long-run probabilities of being in each state
    [ ] The determinant of the transition matrix itself
    [ ] The gradient of the underlying transition system
- Q: What kind of task is PCA primarily used to support?
    [CORRECT] Reducing the dimensionality of data such as images
    [ ] Replacing a covariance matrix with raw probabilities
    [ ] Computing the exact value of definite integrals
    [ ] Solving linear systems that are strictly $2 \times 2$ in size
- Q: You are given a centered 2D dataset with $n=5$ points. The covariance matrix is $\Sigma = \begin{bmatrix} 8 & 2 \\ 2 & 5 \end{bmatrix}$. Its eigenvalues are $\lambda_1 = 9$, $\lambda_2 = 4$, with corresponding eigenvectors $\mathbf{v}_1 = \begin{bmatrix} 2 \\ 1 \end{bmatrix}$ and $\mathbf{v}_2 = \begin{bmatrix} -1 \\ 2 \end{bmatrix}$. Which vector gives the direction of the first principal component, and what fraction of the total variance does it capture?
    [CORRECT] $\mathbf{v}_1$; it captures $\frac{9}{13}$ of the total variance
    [ ] $\mathbf{v}_2$; it captures $\frac{4}{13}$ of the total variance
    [ ] $\mathbf{v}_1$; it captures $\frac{9}{9+4} = \frac{9}{13}$ of the total variance
    [ ] $\mathbf{v}_2$; it captures $\frac{9}{13}$ of the total variance

