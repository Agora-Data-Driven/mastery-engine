# SOURCE PACK — Mathematics / Linear Algebra / 09 SVD and PCA: The Capstone

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Why A transpose A: turning any matrix symmetric   (16 questions)
2. Finding V and the singular values   (7 questions)
3. Building U: the translation formula   (8 questions)
4. Filling U: silent dimensions from the left null space   (6 questions)
5. SVD as rotate, stretch, rotate   (6 questions)
6. PCA by hand: center, covariance, eigendecompose, project   (6 questions)
7. The toolkit dependency graph: how it all composes   (6 questions)

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
- From quadratic functions to symmetric matrices
- Classifying definiteness by eigenvalue signs
- Definiteness as shape: bowls, domes, and saddles
- The spectral theorem: real eigenvalues, orthogonal eigenvectors

## The live quiz bank for these topics — 55 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Why A transpose A: turning any matrix symmetric

- Q: For any real matrix $A$, what is the key algebraic step that proves $A^T A$ is symmetric?
    [CORRECT] Using the rule $(AB)^T = B^T A^T$ on the product $A^T A$
    [ ] Using the rule $(AB)^T = A^T B^T$ on the product $A^T A$
    [ ] Using the fact that $A^T = A$ holds for every matrix $A$
    [ ] Using the fact that the product $A^T A$ must be invertible
- Q: Why is $A^T A$ always positive semidefinite for any real matrix $A$?
    [CORRECT] Because $\mathbf{x}^T A^T A \mathbf{x} = \|A\mathbf{x}\|^2 \ge 0$ for all $\mathbf{x}$
    [ ] Because every eigenvalue of $A^T A$ is strictly positive
    [ ] Because the diagonal entries of $A^T A$ are always nonzero
    [ ] Because $A^T A$ is symmetric, and symmetric implies definite
- Q: For a real $m \times n$ matrix $A$, what does the trace $\operatorname{tr}(A^T A)$ equal?
    [CORRECT] The sum of the squares of all entries of $A$
    [ ] The square of the sum of all entries of $A$
    [ ] The product of the squared norms of the columns
    [ ] The square of the sum of the diagonal entries
- Q: Let $B$ and $C$ be two symmetric matrices of the same size, and define $D = BC$. It is possible that $D$ is not symmetric. Now let $A$ be any $m \times n$ matrix, and define $M = A^T A$. Which statement correctly explains why $M$ is always symmetric, even though the product of two arbitrary symmetric matrices sometimes fails to be?
    [CORRECT] Because $M = A^T A$ forces the product into the pattern $(X)^T X$, and the transpose rule $(X^T X)^T = X^T (X^T)^T = X^T X$ guarantees that $M$ equals its own transpose regardless of $A$'s shape.
    [ ] Because $A^T A$ multiplies a matrix by its own transpose, which ensures the off-diagonal entries always sum to zero and force symmetry in the final product.
    [ ] Because $A^T A$ is always a diagonal matrix, and any diagonal matrix is automatically symmetric, so the shape of $A$ becomes irrelevant to the symmetry argument.
    [ ] Because $A^{T}A$ equals $AA^{T}$ for any rectangular $A$, making the product interchangeable with its reverse and therefore trivially symmetric.
- Q: Minimizing $\|A\mathbf{x} - \mathbf{b}\|^2$ over all $\mathbf{x}$ leads to which system involving $A^T A$?
    [CORRECT] $A^T A \mathbf{x} = A^T \mathbf{b}$
    [ ] $A A^T \mathbf{x} = A \mathbf{b}$
    [ ] $A^T A \mathbf{x} = \mathbf{b}$
    [ ] $A A^T \mathbf{x} = \mathbf{b}$
- Q: Let $A = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$. Compute the matrix $A^T A$.
    [ ] $\begin{bmatrix} 5 & 11 \\ 11 & 25 \end{bmatrix}$
    [ ] $\begin{bmatrix} 7 & 10 \\ 15 & 22 \end{bmatrix}$
    [CORRECT] $\begin{bmatrix} 10 & 14 \\ 14 & 20 \end{bmatrix}$
    [ ] $\begin{bmatrix} 10 & 11 \\ 11 & 20 \end{bmatrix}$
- Q: Suppose $A$ is a real $m \times n$ matrix with $A^T A = I_n$. What does this tell you about the columns of $A$?
    [ ] The columns are orthogonal but may not be unit
    [ ] The rows are orthonormal in $\mathbb{R}^n$
    [ ] The columns are independent but not orthogonal
    [CORRECT] The columns are orthonormal in $\mathbb{R}^m$
- Q: Let $P = A^T$, $Q = B$, and $R = C$, where $B$ is symmetric and $C = A$. Apply the transpose-of-a-product rule $(XYZ)^T = Z^T Y^T X^T$ to expand $(PQR)^T$, then simplify the result using the given properties. What do you obtain?
    [CORRECT] $A^T B A$
    [ ] $A B A^T$
    [ ] $A^T B^T A$
    [ ] $A B^T A^T$
- Q: Let $A = \begin{bmatrix} 1 & 2 \\ 3 & 1 \\ 0 & 4 \end{bmatrix}$ and compute $A^T A$. Suppose a student mistakenly claims the columns of $A$ are orthogonal because all off-diagonal entries of a certain matrix are zero. Which statement best identifies what that student ignored?
    [CORRECT] The off-diagonal entries of $A^T A$ are $5$ and $5$, not zero, so the columns are not perpendicular.
    [ ] The off-diagonal entries are zero only after normalizing the columns, so the student forgot to scale them first.
    [ ] The matrix $A$ itself has zero in its first column, making orthogonality impossible from the start.
    [ ] The diagonal entries of $A^T A$ must be equal for orthogonality, but here they are $10$, $5$, and $4$.
- Q: Under what condition on $A$ is $A^T A$ guaranteed to be invertible?
    [CORRECT] When the columns of $A$ are linearly independent
    [ ] When the matrix $A$ is square and symmetric
    [ ] When all of the entries of $A$ are positive
    [ ] When the rows of $A$ are linearly dependent
- Q: Suppose $A^T A$ is the zero matrix. Using the fact that its diagonal entries are squared column norms, what must be true about $A$?
    [ ] $A$ must have orthogonal columns
    [ ] $A$ must be a symmetric matrix
    [CORRECT] $A$ must be the zero matrix
    [ ] $A$ must have orthonormal columns
- Q: Let $A$ be an $m \times n$ matrix with $m \neq n$. Which statement about the shape of $A^T A$ is correct?
    [CORRECT] It is $n \times n$, so it is square and possibly symmetric
    [ ] It is $m \times m$, so it is square and possibly symmetric
    [ ] It is $m \times n$, matching the shape of $A$ itself
    [ ] It is $n \times m$, the transpose of the shape of $A$
- Q: Let $A = \begin{bmatrix} 2 & 1 & 4 \\ 0 & 3 & -1 \end{bmatrix}$. Compute $A^T A$ and then compute its transpose $(A^T A)^T$. Which of the following correctly explains why the two results are always identical, regardless of the entries of $A$?
    [CORRECT] Because $(A^T A)^T = A^T (A^T)^T = A^T A$, a manipulation that relies solely on the rule $(MN)^T = N^T M^T$ and the fact that transposing twice returns the original matrix.
    [ ] Because $A^T A$ multiplies a matrix by its own transpose, creating a product whose diagonal entries are sums of squares, which forces the matrix to equal its transpose.
    [ ] Because for any rectangular matrix $A$, the product $A^T A$ produces a square matrix, and all square matrices are symmetric by definition.
    [ ] Because when you compute $A^T A$, the entry in row $i$, column $j$ is the dot product of column $i$ and column $j$ of $A$, which is commutative, so the matrix mirrors itself across the diagonal.
- Q: If $A$ has columns $\mathbf{a}_1, \mathbf{a}_2, \dots, \mathbf{a}_n$, what does the $(i, j)$ entry of $A^T A$ equal?
    [CORRECT] The dot product $\mathbf{a}_i \cdot \mathbf{a}_j$ of two columns
    [ ] The dot product of row $i$ and row $j$ of $A$
    [ ] The product of the norms $\|\mathbf{a}_i\| \cdot \|\mathbf{a}_j\|$
    [ ] The sum of entries in column $i$ and column $j$
- Q: Suppose $A^T A \mathbf{x} = \mathbf{0}$ for some vector $\mathbf{x}$. What can you conclude?
    [CORRECT] $A \mathbf{x} = \mathbf{0}$, since $\|A\mathbf{x}\|^2 = \mathbf{x}^T A^T A \mathbf{x} = 0$
    [ ] $\mathbf{x} = \mathbf{0}$, since $A^T A$ is always invertible
    [ ] $A = 0$, since the product $A^T A$ has a zero eigenvalue
    [ ] Nothing, since $A^T A$ can map nonzero vectors to zero
- Q: For any real matrix $A$, what can you always conclude about the eigenvalues of $A^T A$?
    [ ] They are real, but some may be negative
    [CORRECT] They are all real and nonnegative
    [ ] They are all real and strictly positive
    [ ] They may be complex with positive real parts

### Finding V and the singular values

- Q: While building $V$ from eigenvectors of $A^T A$, a student finds a unit eigenvector $v_2$ but notices that $-v_2$ is also a unit eigenvector for the same eigenvalue. Which statement about the SVD is correct?
    [CORRECT] Either choice works, since $u_2$ adjusts to keep $A v_2 = \sigma_2 u_2$
    [ ] Only $v_2$ works, since $V$ must have positive first entries
    [ ] Neither choice works, since eigenvectors must be uniquely fixed
    [ ] Only $-v_2$ works, since det$(V)$ must always equal $-1$
- Q: For $A = \begin{bmatrix} 1 & 1 \\ 1 & 1 \end{bmatrix}$, compute $A^T A = \begin{bmatrix} 2 & 2 \\ 2 & 2 \end{bmatrix}$. Its eigenvalues are $4$ and $0$. What are the singular values of $A$?
    [CORRECT] $\sigma_1 = 2, \; \sigma_2 = 0$
    [ ] $\sigma_1 = 4, \; \sigma_2 = 0$
    [ ] $\sigma_1 = 2, \; \sigma_2 = 2$
    [ ] $\sigma_1 = \sqrt{2}, \; \sigma_2 = 0$
- Q: Let $A = \begin{bmatrix} 3 & 0 \\ 0 & 4 \end{bmatrix}$. What are the singular values of $A$?
    [CORRECT] $\sigma_1 = 4, \; \sigma_2 = 3$
    [ ] $\sigma_1 = 16, \; \sigma_2 = 9$
    [ ] $\sigma_1 = 7, \; \sigma_2 = 1$
    [ ] $\sigma_1 = 4, \; \sigma_2 = -3$
- Q: Let $A = \begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix}$. Compute $A^T A$, then find its eigenvalues and eigenvectors. Normalize the eigenvectors to form the columns of $V$ and determine the singular values $\sigma_1, \sigma_2$ (ordered so that $\sigma_1 \ge \sigma_2$). Which of the following gives a correct $V$ and singular values?
    [CORRECT] $V = \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \end{bmatrix}, \; \sigma_1 = 3, \; \sigma_2 = 1$
    [ ] $V = \begin{bmatrix} 1 & 1 \\ 1 & -1 \end{bmatrix}, \; \sigma_1 = 3, \; \sigma_2 = 1$
    [ ] $V = \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \end{bmatrix}, \; \sigma_1 = \sqrt{5}, \; \sigma_2 = \sqrt{1}$
    [ ] $V = \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \end{bmatrix}, \; \sigma_1 = 9, \; \sigma_2 = 1$
- Q: A student computes an eigenvector of $A^T A$ and gets $v_1 = \begin{bmatrix} 3 \\ 4 \end{bmatrix}$. Before placing it into $V$, what must be done, and what is the resulting column?
    [CORRECT] Normalize it, giving $\begin{bmatrix} 3/5 \\ 4/5 \end{bmatrix}$
    [ ] Square each entry, giving $\begin{bmatrix} 9 \\ 16 \end{bmatrix}$
    [ ] Negate each entry, giving $\begin{bmatrix} -3 \\ -4 \end{bmatrix}$
    [ ] Sort the entries, giving $\begin{bmatrix} 4 \\ 3 \end{bmatrix}$
- Q: To find the matrix $V$ in the SVD $A = U \Sigma V^T$, which matrix's normalized eigenvectors become the columns of $V$?
    [CORRECT] The matrix $A^T A$
    [ ] The matrix $A A^T$
    [ ] The matrix $A^T + A$
    [ ] The matrix $A^{-1} A^T$
- Q: Suppose $A^T A$ has eigenvalues $25$, $9$, and $0$. What is the rank of the matrix $A$?
    [CORRECT] The rank of $A$ is $2$
    [ ] The rank of $A$ is $3$
    [ ] The rank of $A$ is $1$
    [ ] The rank of $A$ is $0$

### Building U: the translation formula

- Q: Let $f(x) = x^2$. The graph of $f$ is shifted to produce the graph of $g(x) = (x + 3)^2 - 7$. What are the coordinates of the image of the point $(2, 5)$ under this same transformation?
    [CORRECT] $(-1, -2)$
    [ ] $(5, -2)$
    [ ] $(-1, 12)$
    [ ] $(5, 12)$
- Q: A $3 \times 2$ matrix $A$ has singular values $\sigma_1 = 10$, $\sigma_2 = 4$ and corresponding right singular vectors $\mathbf{v}_1 = \begin{bmatrix} 1 \\ 0 \end{bmatrix}$, $\mathbf{v}_2 = \begin{bmatrix} 0 \\ 1 \end{bmatrix}$. Suppose $A\mathbf{v}_1 = \begin{bmatrix} 6 \\ 8 \\ 0 \end{bmatrix}$ and $A\mathbf{v}_2 = \begin{bmatrix} 0 \\ 0 \\ 4 \end{bmatrix}$. Compute $\mathbf{u}_1$ and $\mathbf{u}_2$ using the translation formula, then find their dot product $\mathbf{u}_1 \cdot \mathbf{u}_2$.
    [CORRECT] $0$
    [ ] $1$
    [ ] $10$
    [ ] $40$
- Q: The graph of $y = x^3$ is translated to produce the graph of $y = (x + 2)^3 - 5$. Which translation was applied?
    [ ] $2$ units right and $5$ units down
    [ ] $2$ units left and $5$ units up
    [CORRECT] $2$ units left and $5$ units down
    [ ] $2$ units right and $5$ units up
- Q: The graph of $y = x^2$ is translated $3$ units to the right and $2$ units up. Which equation describes the new graph?
    [ ] $y = (x + 3)^2 + 2$
    [ ] $y = (x - 3)^2 - 2$
    [CORRECT] $y = (x - 3)^2 + 2$
    [ ] $y = (x + 3)^2 - 2$
- Q: Which translation maps the point $(2, 3)$ directly onto the point $(6, -1)$?
    [CORRECT] $(x, y) \to (x + 4, y - 4)$
    [ ] $(x, y) \to (x + 4, y + 4)$
    [ ] $(x, y) \to (x - 4, y - 4)$
    [ ] $(x, y) \to (x - 4, y + 4)$
- Q: One translation maps $(x, y)$ to $(x + 3, y + 1)$. A second translation is then applied, mapping each resulting point $(x, y)$ to $(x - 5, y - 4)$. A single translation equivalent to applying both in order maps $(x, y)$ to:
    [CORRECT] $(x - 2, y - 3)$
    [ ] $(x + 2, y + 3)$
    [ ] $(x + 8, y - 3)$
    [ ] $(x - 2, y + 3)$
- Q: A translation maps every point $(x, y)$ to $(x + 5, y - 2)$. Where does this translation send the point $(4, -1)$?
    [ ] $(-1, -3)$
    [CORRECT] $(9, -3)$
    [ ] $(9, 1)$
    [ ] $(-1, 1)$
- Q: Which equation results from translating the graph of $y = f(x)$ exactly $4$ units to the left?
    [ ] $y = f(x) - 4$
    [ ] $y = f(x - 4)$
    [ ] $y = f(x) + 4$
    [CORRECT] $y = f(x + 4)$

### Filling U: silent dimensions from the left null space

- Q: A matrix $A$ is $4 \times 6$ with rank $r = 4$ (full row rank). In constructing $U$ via $\mathbf{u}_i = A\mathbf{v}_i/\sigma_i$ followed by filling from the left null space, how many columns of $U$ come from $N(A^T)$?
    [CORRECT] $0$ columns
    [ ] $1$ column
    [ ] $2$ columns
    [ ] $3$ columns
- Q: A matrix $A$ is $5 \times 3$ with rank $r = 2$. When building the orthogonal matrix $U$ in $A = U\Sigma V^T$, the first $r$ columns come from $\mathbf{u}_i = A\mathbf{v}_i/\sigma_i$. How many remaining columns of $U$ must be filled in from the left null space $N(A^T)$?
    [ ] $1$ column
    [ ] $2$ columns
    [CORRECT] $3$ columns
    [ ] $4$ columns
- Q: Two students compute the SVD of the same rank-deficient matrix and produce different matrices $U$, yet both satisfy $A = U\Sigma V^T$ with orthonormal columns. Which statement best explains this?
    [CORRECT] Any orthonormal basis of $N(A^T)$ can fill the last columns of $U$
    [ ] One student erred, since the matrix $U$ is always uniquely determined
    [ ] The difference comes only from reordering the columns of the matrix $V$
    [ ] The singular vectors $\mathbf{u}_i = A\mathbf{v}_i/\sigma_i$ are chosen arbitrarily
- Q: Suppose $\mathbf{y}$ lies in the left null space $N(A^T)$ and $\mathbf{u}_i = A\mathbf{v}_i/\sigma_i$ is one of the first $r$ columns of $U$. Why is $\mathbf{y}$ automatically orthogonal to $\mathbf{u}_i$?
    [CORRECT] $\mathbf{y}^T A\mathbf{v}_i = (A^T\mathbf{y})^T\mathbf{v}_i = 0$ since $A^T\mathbf{y} = \mathbf{0}$
    [ ] $\mathbf{y}^T A\mathbf{v}_i = \sigma_i$ and singular values are zero for $i > r$
    [ ] $\mathbf{y}$ lies in the row space of $A$ and $\mathbf{u}_i$ lies in the null space
    [ ] $\mathbf{v}_i$ is an eigenvector of $AA^T$ with eigenvalue equal to zero
- Q: Let $A = \begin{bmatrix} 1 & 1 \\ 1 & 1 \end{bmatrix}$, which has rank $1$. The first column of $U$ is $\mathbf{u}_1 = \frac{1}{\sqrt{2}}(1, 1)$. Which vector is a valid choice to fill the second column of $U$ from the left null space?
    [ ] $\frac{1}{\sqrt{2}}(1, 1)$
    [CORRECT] $\frac{1}{\sqrt{2}}(1, -1)$
    [ ] $\frac{1}{2}(1, -1)$
    [ ] $(1, 0)$
- Q: When filling the last $m - r$ columns of $U$ using vectors from $N(A^T)$, which set of conditions must those added columns satisfy?
    [CORRECT] They must be orthonormal and orthogonal to the column space of $A$
    [ ] They must be eigenvectors of $A^TA$ with positive eigenvalues
    [ ] They must be linearly independent rows of the matrix $A$
    [ ] They must be orthogonal to all right singular vectors $\mathbf{v}_i$

### SVD as rotate, stretch, rotate

- Q: Since $U$ and $V^T$ are orthogonal, they preserve all lengths. What does this imply about the stretching done by $A$?
    [CORRECT] The largest singular value gives the maximum stretch of any unit vector
    [ ] The largest singular value gives the minimum stretch of any unit vector
    [ ] The smallest singular value gives the maximum stretch of any unit vector
    [ ] The product of the singular values gives the maximum unit vector stretch
- Q: In the SVD $A = U\Sigma V^T$, what makes the first right singular vector $\mathbf{v}_1$ geometrically special?
    [CORRECT] It is the unit direction that $A$ stretches by the greatest amount
    [ ] It is the unit direction that $A$ always collapses down to zero
    [ ] It is the unit direction that $A$ leaves completely unchanged
    [ ] It is the unit direction that $A$ turns by exactly $90^{\circ}$
- Q: Suppose a $2 \times 2$ matrix $A$ has SVD with $\sigma_1 > 0$ but $\sigma_2 = 0$. What does $A$ do to the plane geometrically?
    [CORRECT] It flattens the whole plane onto a single line through the origin
    [ ] It rotates every vector in the plane onto one common fixed line
    [ ] It reflects the entire plane across a line through the origin
    [ ] It collapses the entire plane down to the single zero vector
- Q: What is the geometric role of the diagonal matrix $\Sigma$ in the factorization $A = U\Sigma V^T$?
    [CORRECT] It scales space along the coordinate axes by the singular values
    [ ] It rotates space while preserving every length and every angle
    [ ] It shears space by mixing the coordinates into one another
    [ ] It reflects space across each coordinate hyperplane in sequence
- Q: A $2 \times 2$ matrix $A$ has SVD $A = U\Sigma V^T$ with $\sigma_1, \sigma_2 > 0$. What is the image of the unit circle under $A$?
    [CORRECT] An ellipse with semi-axes $\sigma_1, \sigma_2$ pointing along $\mathbf{u}_1, \mathbf{u}_2$
    [ ] An ellipse with semi-axes $\sigma_1, \sigma_2$ pointing along $\mathbf{v}_1, \mathbf{v}_2$
    [ ] A circle with radius $\sigma_1 \sigma_2$ centered at the origin of the plane
    [ ] A circle with radius $\sigma_1 + \sigma_2$ centered at the origin of the plane
- Q: When $A = U\Sigma V^T$ acts on a vector $\mathbf{x}$, in what order do the three geometric actions occur?
    [CORRECT] Rotate by $V^T$, then scale by $\Sigma$, then rotate by $U$
    [ ] Rotate by $U$, then scale by $\Sigma$, then rotate by $V^T$
    [ ] Scale by $\Sigma$, then rotate by $U$, then rotate by $V^T$
    [ ] Scale by $\Sigma$, then rotate by $V^T$, then rotate by $U$

### PCA by hand: center, covariance, eigendecompose, project

- Q: For centered two-dimensional data, a point is projected onto the first principal component and reconstructed in the original plane. How is the reconstruction residual related to the first principal component direction?
    [CORRECT] It is orthogonal to that direction and lies along the remaining eigenvector
    [ ] It is parallel to that direction and lies along the same eigenvector
    [ ] It is zero for every point whenever the data were centered
    [ ] It equals the original feature means added back after projection
- Q: After centering, a point is $x=(2,0)$ and the first principal component is the unit vector $u=\frac{1}{\sqrt{2}}(1,1)$. What is the projected score $z=x^{T}u$ and the rank-one reconstruction $\hat{x}=zu$?
    [CORRECT] $z=\sqrt{2}$ and $\hat{x}=(1,1)$
    [ ] $z=2$ and $\hat{x}=(\sqrt{2},\sqrt{2})$
    [ ] $z=\sqrt{2}$ and $\hat{x}=(2,0)$
    [ ] $z=2$ and $\hat{x}=(1,1)$
- Q: Why is centering the columns of the data matrix done before forming the covariance matrix in PCA?
    [CORRECT] Because covariance should measure variation about the mean rather than location of the mean
    [ ] Because centering is required to make every covariance matrix perfectly symmetric
    [ ] Because centering guarantees all eigenvalues become positive instead of merely nonnegative
    [ ] Because centering rescales every feature to have exactly unit variance
- Q: For the data matrix with rows $(1,1)$, $(2,3)$, and $(3,2)$, center the columns and then compute the population covariance matrix using denominator $n$. Which matrix is correct?
    [CORRECT] $\begin{bmatrix} \frac{2}{3} & \frac{1}{3} \\ \frac{1}{3} & \frac{2}{3} \end{bmatrix}$
    [ ] $\begin{bmatrix} 1 & \frac{1}{2} \\ \frac{1}{2} & 1 \end{bmatrix}$
    [ ] $\begin{bmatrix} \frac{14}{3} & \frac{13}{3} \\ \frac{13}{3} & \frac{14}{3} \end{bmatrix}$
    [ ] $\begin{bmatrix} \frac{2}{3} & -\frac{1}{3} \\ -\frac{1}{3} & \frac{2}{3} \end{bmatrix}$
- Q: A centered data set has covariance matrix $C=\begin{bmatrix}2&1\\1&2\end{bmatrix}$. Which unit vector is the first principal component direction?
    [CORRECT] $\frac{1}{\sqrt{2}}\begin{bmatrix}1\\1\end{bmatrix}$
    [ ] $\frac{1}{\sqrt{2}}\begin{bmatrix}1\\-1\end{bmatrix}$
    [ ] $\frac{1}{\sqrt{2}}\begin{bmatrix}1\\0\end{bmatrix}$
    [ ] $\frac{1}{\sqrt{2}}\begin{bmatrix}0\\1\end{bmatrix}$
- Q: A PCA covariance matrix has eigenvalues $5$, $3$, and $2$. If the total variance is the sum of eigenvalues, what fraction of variance is explained by the first two principal components?
    [CORRECT] $\frac{5+3}{5+3+2}=0.8$
    [ ] $\frac{5}{5+3+2}=0.5$
    [ ] $\frac{2}{5+3+2}=0.2$
    [ ] $\frac{5+3+2}{3}\approx 3.33$

### The toolkit dependency graph: how it all composes

- Q: A developer edits the source of $\texttt{parser}$. In the dependency graph, $\texttt{lexer}$ is used by $\texttt{parser}$, while $\texttt{cli}$ and $\texttt{fmt}$ each use $\texttt{parser}$. Which components must be rebuilt in a minimal rebuild?
    [ ] Only $\texttt{parser}$, since edits never propagate beyond one component
    [CORRECT] $\texttt{parser}$, $\texttt{cli}$, and $\texttt{fmt}$, following reverse edges
    [ ] $\texttt{parser}$ and $\texttt{lexer}$, following the forward edges
    [ ] All four components, since any edit invalidates the whole graph
- Q: In a toolkit's dependency graph, what does a directed edge from component $\texttt{A}$ to component $\texttt{B}$ conventionally express?
    [CORRECT] \texttt{A} requires \texttt{B} to be present before \texttt{A} can work
    [ ] \texttt{B} calls into \texttt{A} whenever \texttt{B} finishes its own setup
    [ ] \texttt{A} and \texttt{B} must always be installed as a single bundle
    [ ] \texttt{B} is an optional plugin that \texttt{A} loads only at runtime
- Q: A toolkit has these dependencies: $\texttt{core}$ needs nothing, $\texttt{utils}$ needs $\texttt{core}$, $\texttt{viz}$ needs $\texttt{utils}$, and $\texttt{report}$ needs $\texttt{viz}$ and $\texttt{core}$. Which installation order is valid?
    [ ] \texttt{utils}, \texttt{core}, \texttt{viz}, \texttt{report}
    [ ] \texttt{core}, \texttt{viz}, \texttt{utils}, \texttt{report}
    [CORRECT] \texttt{core}, \texttt{utils}, \texttt{viz}, \texttt{report}
    [ ] \texttt{report}, \texttt{viz}, \texttt{utils}, \texttt{core}
- Q: $\texttt{app}$ depends on $\texttt{X}$ and $\texttt{Y}$. Separately, $\texttt{X}$ needs $\texttt{lib}$ version $1$ while $\texttt{Y}$ needs $\texttt{lib}$ version $2$. What is this diamond-shaped situation called, and what does it cause?
    [CORRECT] A version conflict, since one shared component is requested at two versions
    [ ] A circular dependency, since $\texttt{lib}$ is reached through two distinct paths
    [ ] A redundant install, since $\texttt{lib}$ only needs to be fetched exactly once
    [ ] A lazy binding, since $\texttt{lib}$ resolves its version when first invoked
- Q: During composition, the toolkit's resolver discovers a cycle: $\texttt{A}$ depends on $\texttt{B}$, $\texttt{B}$ depends on $\texttt{C}$, and $\texttt{C}$ depends on $\texttt{A}$. Why does this block a standard build?
    [CORRECT] No topological ordering exists, so no component can be built first
    [ ] The resolver must build all three components strictly in parallel
    [ ] Each component ends up compiled twice, wasting memory and time
    [ ] The graph becomes a tree, which toolkits cannot traverse safely
- Q: $\texttt{app}$ depends on $\texttt{mid}$, and $\texttt{mid}$ depends on $\texttt{base}$. A breaking change ships in $\texttt{base}$, but $\texttt{app}$'s author never references $\texttt{base}$ directly. Why can $\texttt{app}$ still break?
    [CORRECT] Dependencies are transitive, so changes propagate up through $\texttt{mid}$
    [ ] Toolkits always recompile every component after any single change
    [ ] Direct references are rewritten to the root component at install time
    [ ] The resolver merges $\texttt{base}$ and $\texttt{app}$ into one component

