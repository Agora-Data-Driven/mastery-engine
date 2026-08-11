# SOURCE PACK — Mathematics / Linear Algebra / 06 Building Better Bases: Change of Basis, Gram-Schmidt, and QR

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Changing the basis of a vector space   (4 questions)
2. Constructing the change-of-basis matrix   (6 questions)
3. Gram-Schmidt: subtracting the shadows   (6 questions)
4. From orthogonal to orthonormal: normalization   (6 questions)
5. QR decomposition from Gram-Schmidt   (12 questions)

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

## Covered by LATER lessons — do not teach these here

- 07 Eigenvalues, Eigenvectors, and Diagonalization: Intuition behind eigenvectors and eigenvalues, The characteristic equation and solving for eigenvalues, Eigenspaces are null spaces: reusing the RREF toolkit, Eigenspaces and basis of eigenvectors, Algebraic vs geometric multiplicity and diagonalizability, Diagonalization of matrices, Application: PCA and PageRank algorithm
- 08 Symmetric Matrices and Quadratic Forms: From quadratic functions to symmetric matrices, Classifying definiteness by eigenvalue signs, Definiteness as shape: bowls, domes, and saddles, The spectral theorem: real eigenvalues, orthogonal eigenvectors
- 09 SVD and PCA: The Capstone: Why A transpose A: turning any matrix symmetric, Finding V and the singular values, Building U: the translation formula, Filling U: silent dimensions from the left null space, SVD as rotate, stretch, rotate, PCA by hand: center, covariance, eigendecompose, project, The toolkit dependency graph: how it all composes

## The live quiz bank for these topics — 34 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Changing the basis of a vector space

- Q: Which analogy best captures what a change of basis does to a vector?
    [ ] Sliding the vector to a brand-new location
    [ ] Normalizing the vector before it can be used
    [ ] Making the basis matrix become singular
    [CORRECT] Relabeling its coordinates, like switching map grids
- Q: When you perform a change of basis on a vector, what actually changes?
    [ ] The determinant associated with the space
    [ ] The dimension of the surrounding space
    [ ] The actual vector itself in the space
    [CORRECT] Only the coordinates used to describe the vector
- Q: Let $B$ and $C$ be matrices whose columns are the basis vectors of bases B and C. Which expression is the change-of-basis matrix that takes $B$-coordinates to $C$-coordinates?
    [ ] $B^{-1}C$
    [ ] $BC^{-1}$
    [CORRECT] $C^{-1}B$
    [ ] $CB$
- Q: A change-of-basis map is written $P_{C \leftarrow B}$. What does applying it accomplish?
    [ ] It converts a vector's coordinates from basis C into basis B
    [ ] It maps any vector to standard coordinates with no matrix
    [CORRECT] It converts a vector's coordinates from basis B into basis C
    [ ] It returns the inverse of whatever matrix it is given

### Constructing the change-of-basis matrix

- Q: Let $\mathcal C=\left\{\begin{bmatrix}1\\1\end{bmatrix},\begin{bmatrix}1\\-1\end{bmatrix}\right\}$ and $\mathcal B=\left\{\begin{bmatrix}3\\1\end{bmatrix},\begin{bmatrix}1\\3\end{bmatrix}\right\}$ be bases of $\mathbb R^2$. Construct $P_{\mathcal C\leftarrow\mathcal B}$.
    [CORRECT] $\begin{bmatrix}2&2\\1&-1\end{bmatrix}$
    [ ] $\begin{bmatrix}2&1\\2&-1\end{bmatrix}$
    [ ] $\begin{bmatrix}3&1\\1&3\end{bmatrix}$
    [ ] $\begin{bmatrix}1&1\\1&-1\end{bmatrix}$
- Q: The columns of $B=\begin{bmatrix}1&1\\0&1\end{bmatrix}$ and $C=\begin{bmatrix}2&0\\0&1\end{bmatrix}$ give bases $\mathcal B$ and $\mathcal C$ in standard coordinates. Compute $P_{\mathcal C\leftarrow\mathcal B}$.
    [ ] $\begin{bmatrix}2&-1\\0&1\end{bmatrix}$
    [ ] $\begin{bmatrix}2&-2\\0&1\end{bmatrix}$
    [ ] $\begin{bmatrix}\frac12&1\\0&1\end{bmatrix}$
    [CORRECT] $\begin{bmatrix}\frac12&\frac12\\0&1\end{bmatrix}$
- Q: When constructing $P_{\mathcal C\leftarrow\mathcal B}$ from ordered bases $\mathcal B=\{b_1,\dots,b_n\}$ and $\mathcal C=\{c_1,\dots,c_n\}$, what is the correct column rule?
    [CORRECT] Place $[b_j]_{\mathcal C}$ as column $j$ of the matrix
    [ ] Place $[b_j]_{\mathcal C}$ as row $j$ of the matrix
    [ ] Place $[c_j]_{\mathcal B}$ as column $j$ of the matrix
    [ ] Place $[c_j]_{\mathcal B}$ as row $j$ of the matrix
- Q: If $P_{\mathcal C\leftarrow\mathcal B}=\begin{bmatrix}2&1\\0&1\end{bmatrix}$, which matrix is $P_{\mathcal B\leftarrow\mathcal C}$?
    [ ] $\begin{bmatrix}2&1\\0&1\end{bmatrix}$
    [ ] $\begin{bmatrix}2&0\\1&1\end{bmatrix}$
    [CORRECT] $\begin{bmatrix}\frac12&-\frac12\\0&1\end{bmatrix}$
    [ ] $\begin{bmatrix}-\frac12&\frac12\\0&-1\end{bmatrix}$
- Q: Let $P=P_{\mathcal C\leftarrow\mathcal B}$. For a linear map $T$, which expression gives $[T]_{\mathcal C}$ from $[T]_{\mathcal B}$?
    [ ] $P^{-1}[T]_{\mathcal B}P$
    [CORRECT] $P[T]_{\mathcal B}P^{-1}$
    [ ] $P[T]_{\mathcal B}P$
    [ ] $P^{-1}[T]_{\mathcal B}P^{-1}$
- Q: Suppose the columns of $B=\begin{bmatrix}1&3\\2&4\end{bmatrix}$ are the vectors of a basis $\mathcal B$, written in standard coordinates. For $v=\begin{bmatrix}1\\0\end{bmatrix}$ in standard coordinates, find $[v]_{\mathcal B}$.
    [ ] $\begin{bmatrix}1\\0\end{bmatrix}$
    [ ] $\begin{bmatrix}1\\2\end{bmatrix}$
    [CORRECT] $\begin{bmatrix}-2\\1\end{bmatrix}$
    [ ] $\begin{bmatrix}2\\-1\end{bmatrix}$

### Gram-Schmidt: subtracting the shadows

- Q: Let $\mathbf{v}_1 = (1, 1, 0)$ and $\mathbf{v}_2 = (3, 1, 2)$. Setting $\mathbf{u}_1 = \mathbf{v}_1$, compute the second Gram-Schmidt vector $\mathbf{u}_2 = \mathbf{v}_2 - \operatorname{proj}_{\mathbf{u}_1}\mathbf{v}_2$.
    [ ] $(2, 2, 0)$
    [ ] $(3, 1, 2)$
    [ ] $(-1, 1, -2)$
    [CORRECT] $(1, -1, 2)$
- Q: The first Gram-Schmidt step yields $\mathbf{u}_1 = (3, 4)$. What is the normalized vector $\mathbf{q}_1 = \frac{\mathbf{u}_1}{\lVert \mathbf{u}_1 \rVert}$?
    [ ] $\left(\frac{3}{7}, \frac{4}{7}\right)$
    [CORRECT] $\left(\frac{3}{5}, \frac{4}{5}\right)$
    [ ] $\left(\frac{3}{25}, \frac{4}{25}\right)$
    [ ] $\left(\frac{1}{5}, \frac{4}{5}\right)$
- Q: In the Gram-Schmidt step $\mathbf{u}_2 = \mathbf{v}_2 - \operatorname{proj}_{\mathbf{u}_1}\mathbf{v}_2$, why is the projection subtracted from $\mathbf{v}_2$?
    [CORRECT] It removes the part of $\mathbf{v}_2$ that lies along $\mathbf{u}_1$.
    [ ] It shrinks $\mathbf{v}_2$ so that its length becomes one.
    [ ] It flips $\mathbf{v}_2$ to point opposite to $\mathbf{u}_1$.
    [ ] It copies the direction of $\mathbf{u}_1$ onto $\mathbf{v}_2$.
- Q: Suppose $\mathbf{v}_2$ happens to already be orthogonal to $\mathbf{u}_1$. What does the step $\mathbf{u}_2 = \mathbf{v}_2 - \operatorname{proj}_{\mathbf{u}_1}\mathbf{v}_2$ produce?
    [ ] It makes $\mathbf{u}_2$ the zero vector, since the vectors share no part.
    [ ] It makes $\mathbf{u}_2$ equal to $\mathbf{u}_1$, since directions must match.
    [CORRECT] It leaves $\mathbf{u}_2$ equal to $\mathbf{v}_2$, since the projection is $\mathbf{0}$.
    [ ] It makes $\mathbf{u}_2$ equal to $-\mathbf{v}_2$, since the projection flips sign.
- Q: Let $\mathbf{v}_1 = (3, 0)$ and $\mathbf{v}_2 = (2, 2)$. Using $\operatorname{proj}_{\mathbf{u}}\mathbf{v} = \frac{\mathbf{v} \cdot \mathbf{u}}{\mathbf{u} \cdot \mathbf{u}}\,\mathbf{u}$, set $\mathbf{u}_1 = \mathbf{v}_1$ and compute $\mathbf{u}_2 = \mathbf{v}_2 - \operatorname{proj}_{\mathbf{u}_1}\mathbf{v}_2$.
    [ ] $(2, 0)$
    [ ] $(2, 2)$
    [CORRECT] $(0, 2)$
    [ ] $(0, -2)$
- Q: Gram-Schmidt produces orthogonal vectors $\mathbf{u}_1, \mathbf{u}_2$ from linearly independent vectors $\mathbf{v}_1, \mathbf{v}_2$. How does $\operatorname{span}\{\mathbf{u}_1, \mathbf{u}_2\}$ compare to $\operatorname{span}\{\mathbf{v}_1, \mathbf{v}_2\}$?
    [ ] The new span is strictly smaller, since subtracting removes directions.
    [CORRECT] The spans are identical, since each step only recombines the given vectors.
    [ ] The new span is strictly larger, since orthogonal vectors cover more space.
    [ ] The spans are unrelated, since orthogonalization changes the plane entirely.

### From orthogonal to orthonormal: normalization

- Q: The vector $v = \begin{bmatrix} 6 \\ 8 \end{bmatrix}$ has norm $\|v\| = 10$. Which statement about the normalized vector $\hat{v} = v/10$ is correct?
    [CORRECT] It points in the same direction as $v$ and has length $1$
    [ ] It points in the opposite direction to $v$ and has length $1$
    [ ] It points in the same direction as $v$ and has length $10$
    [ ] It is perpendicular to $v$ and has length $1$
- Q: A student wants to normalize $v = \begin{bmatrix} 1 \\ 2 \\ 2 \end{bmatrix}$ and computes $\|v\|^2 = 1 + 4 + 4 = 9$, then writes $\hat{v} = \begin{bmatrix} 1/9 \\ 2/9 \\ 2/9 \end{bmatrix}$. What went wrong?
    [CORRECT] The student divided by $\|v\|^2 = 9$ instead of dividing by $\|v\| = 3$
    [ ] The student should have multiplied by $9$ instead of dividing by it
    [ ] The student computed $\|v\|^2$ incorrectly; it should equal $5$
    [ ] The student did nothing wrong; the resulting vector is a unit vector
- Q: Let $u$ be any nonzero vector in $\mathbb{R}^n$. What is the value of $\left\| \dfrac{u}{\|u\|} \right\|$?
    [CORRECT] It equals $1$
    [ ] It equals $\|u\|$
    [ ] It equals $\|u\|^2$
    [ ] It equals $\dfrac{1}{\|u\|}$
- Q: Suppose $\{q_1, q_2\}$ is an orthonormal set in $\mathbb{R}^3$. What are the values of $q_1 \cdot q_1$ and $q_1 \cdot q_2$?
    [CORRECT] $q_1 \cdot q_1 = 1$ and $q_1 \cdot q_2 = 0$
    [ ] $q_1 \cdot q_1 = 0$ and $q_1 \cdot q_2 = 1$
    [ ] $q_1 \cdot q_1 = 1$ and $q_1 \cdot q_2 = 1$
    [ ] $q_1 \cdot q_1 = 0$ and $q_1 \cdot q_2 = 0$
- Q: A set of vectors $\{v_1, v_2, v_3\}$ is orthogonal, with $\|v_1\| = 2$, $\|v_2\| = 5$, and $\|v_3\| = 10$. To convert this set into an orthonormal set, you should:
    [CORRECT] Divide each vector by its own norm: $v_1/2$, $v_2/5$, $v_3/10$
    [ ] Divide each vector by the largest norm: $v_1/10$, $v_2/10$, $v_3/10$
    [ ] Multiply each vector by its own norm: $2v_1$, $5v_2$, $10v_3$
    [ ] Divide each vector by the smallest norm: $v_1/2$, $v_2/2$, $v_3/2$
- Q: Let $v = \begin{bmatrix} 3 \\ 4 \end{bmatrix}$. Which vector is the normalized (unit) version of $v$?
    [CORRECT] $\begin{bmatrix} 3/5 \\ 4/5 \end{bmatrix}$
    [ ] $\begin{bmatrix} 3/7 \\ 4/7 \end{bmatrix}$
    [ ] $\begin{bmatrix} 1/3 \\ 1/4 \end{bmatrix}$
    [ ] $\begin{bmatrix} 3/25 \\ 4/25 \end{bmatrix}$

### QR decomposition from Gram-Schmidt

- Q: In the factorization $A = QR$ produced by Gram-Schmidt, the matrix $R$ is always upper triangular. What is the underlying reason the entries $r_{jk}$ with $j > k$ must equal zero?
    [CORRECT] Because $\mathbf{a}_k$ lies in the span of only $\mathbf{q}_1$ through $\mathbf{q}_k$
    [ ] Because $\mathbf{q}_j$ is built from only $\mathbf{a}_j$ through $\mathbf{a}_n$
    [ ] Because the normalization step cancels all below diagonal entries
    [ ] Because $R$ stores only the lengths of the orthogonalized vectors
- Q: Suppose the first orthonormal column is $\mathbf{q}_1 = \frac{1}{3}(1, 2, 2)^T$ and the second column of $A$ is $\mathbf{a}_2 = (2, 4, 1)^T$. In the relation $A = QR$, what is the entry $r_{12}$ of $R$?
    [ ] $12$
    [ ] $\frac{4}{3}$
    [CORRECT] $4$
    [ ] $\sqrt{21}$
- Q: Given $A = QR$ where $Q$ has columns $\mathbf{q}_1, \mathbf{q}_2, \mathbf{q}_3$, which expression correctly reconstructs the third column $\mathbf{a}_3$ of $A$ from the entries of $R$?
    [ ] $r_{31}\mathbf{q}_1 + r_{32}\mathbf{q}_2 + r_{33}\mathbf{q}_3$
    [ ] $r_{11}\mathbf{q}_1 + r_{22}\mathbf{q}_2 + r_{33}\mathbf{q}_3$
    [CORRECT] $r_{13}\mathbf{q}_1 + r_{23}\mathbf{q}_2 + r_{33}\mathbf{q}_3$
    [ ] $r_{13}\mathbf{q}_3 + r_{23}\mathbf{q}_2 + r_{33}\mathbf{q}_1$
- Q: In exact reduced QR of a full column rank matrix, what removes the freedom to multiply a column of $Q$ by $-1$?
    [ ] Requiring each column of $R$ to have unit Euclidean norm
    [ ] Requiring each column of $Q$ to have nonnegative entries
    [CORRECT] Requiring each diagonal entry $r_{kk}$ to be positive
    [ ] Requiring each row of $A$ to be normalized before starting
- Q: While running classical Gram-Schmidt on the columns of $A$, you compute $\mathbf{v}_2 = \mathbf{a}_2 - (\mathbf{q}_1^T \mathbf{a}_2)\mathbf{q}_1$ and obtain the zero vector. What does this outcome reveal?
    [ ] The vector $\mathbf{a}_2$ is already orthogonal to $\mathbf{q}_1$
    [ ] The vector $\mathbf{q}_1$ was normalized incorrectly earlier
    [ ] The vector $\mathbf{a}_2$ has unit length and needs no scaling
    [CORRECT] The vector $\mathbf{a}_2$ lies in the span of $\mathbf{a}_1$, so $A$ is rank deficient
- Q: If column $\mathbf{a}_k$ of a full column rank matrix is replaced by $c\mathbf{a}_k$ with $c > 0$, and $R$ keeps positive diagonal entries, what changes in the reduced QR factorization?
    [CORRECT] $Q$ stays fixed, and column $k$ of $R$ is scaled by $c$
    [ ] $Q$ stays fixed, and every column of $R$ is scaled by $c$
    [ ] $\mathbf{q}_k$ is scaled by $c$, and column $k$ of $R$ stays fixed
    [ ] $\mathbf{q}_k$ changes sign, and row $k$ of $R$ is scaled by $c$
- Q: Suppose $\mathbf{q}_1 = \frac{1}{\sqrt{2}}(1, 0, 1)^T$ and $\mathbf{a}_2 = (2, 1, 3)^T$. After the projection step $\mathbf{v}_2 = \mathbf{a}_2 - (\mathbf{q}_1^T\mathbf{a}_2)\mathbf{q}_1$, what is $\mathbf{q}_2$?
    [CORRECT] $\frac{1}{\sqrt{6}}(-1, 2, 1)^T$
    [ ] $\frac{1}{\sqrt{6}}(1, -2, -1)^T$
    [ ] $\frac{1}{\sqrt{14}}(2, 1, 3)^T$
    [ ] $\frac{1}{\sqrt{3}}(-1, 1, 1)^T$
- Q: Let $A$ have columns $\mathbf{a}_1 = (1, 1, 0)^T$ and $\mathbf{a}_2 = (1, 0, 1)^T$. After computing $\mathbf{q}_1 = \frac{1}{\sqrt{2}}(1, 1, 0)^T$, applying the Gram-Schmidt process gives which second orthonormal column $\mathbf{q}_2$?
    [ ] $\frac{1}{\sqrt{2}}(1, 0, 1)^T$
    [CORRECT] $\frac{1}{\sqrt{6}}(1, -1, 2)^T$
    [ ] $\frac{1}{\sqrt{2}}(0, -1, 1)^T$
    [ ] $\frac{1}{\sqrt{6}}(1, 1, -2)^T$
- Q: For a full column rank matrix with reduced factorization $A = QR$, which identity follows from $Q^TQ = I$ and gives $R$ directly?
    [ ] $R = A^TQ$
    [ ] $R = QA^T$
    [CORRECT] $R = Q^TA$
    [ ] $R = AQ^T$
- Q: For a tall full column rank matrix with $m > n$ and reduced factorization $A = QR$, which statement about $Q$ is correct?
    [ ] $QQ^T = I_m$, but $Q^TQ$ is not generally $I_n$
    [ ] $Q^TQ = I_m$, and $QQ^T = I_n$ for every tall $Q$
    [ ] $Q^TQ = 0$, and $QQ^T = I_m$ for every tall $Q$
    [CORRECT] $Q^TQ = I_n$, but $QQ^T$ is not generally $I_m$
- Q: The first column of $A$ is $\mathbf{a}_1 = (1, 2, 2)^T$. In the first step of QR factorization via Gram-Schmidt, what is the first column $\mathbf{q}_1$ of $Q$?
    [ ] $\frac{1}{9}(1, 2, 2)^T$
    [CORRECT] $\frac{1}{3}(1, 2, 2)^T$
    [ ] $\frac{1}{5}(1, 2, 2)^T$
    [ ] $(1, 2, 2)^T$
- Q: Let $A$ have columns $\mathbf{a}_1 = (1, 2, 2)^T$ and $\mathbf{a}_2 = (3, 0, 3)^T$. Using $\mathbf{q}_1 = \frac{1}{3}(1, 2, 2)^T$, what are the entries $r_{12}$ and $r_{22}$ in $A = QR$?
    [ ] $r_{12} = 9,\ r_{22} = 3$
    [CORRECT] $r_{12} = 3,\ r_{22} = 3$
    [ ] $r_{12} = 4,\ r_{22} = 3$
    [ ] $r_{12} = 3,\ r_{22} = \sqrt{14}$

