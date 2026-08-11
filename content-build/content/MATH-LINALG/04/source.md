# SOURCE PACK — Mathematics / Linear Algebra / 04 Determinants, Cofactors, and the Inverse

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Determinants: Geometric meaning and calculation   (6 questions)
2. Minors: deleting a row and a column   (6 questions)
3. Cofactors and the checkerboard sign pattern   (6 questions)
4. Cofactor expansion: the recursive determinant   (6 questions)
5. The adjugate: transpose of the cofactor matrix   (6 questions)
6. Two roads to the inverse: adjugate formula and Gauss-Jordan   (8 questions)
7. Inverse matrices and their role in transformations   (5 questions)

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

## Covered by LATER lessons — do not teach these here

- 05 Orthogonality, Projections, and Least Squares: Orthogonality and orthonormal bases, The shadow formula: projecting one vector onto another, Projections of vectors onto subspaces, The Gram matrix and the normal equations, The projection matrix onto a column space, Applications: Least squares and linear regression foundations, The residual lives in the left null space
- 06 Building Better Bases: Change of Basis, Gram-Schmidt, and QR: Changing the basis of a vector space, Constructing the change-of-basis matrix, Gram-Schmidt: subtracting the shadows, From orthogonal to orthonormal: normalization, QR decomposition from Gram-Schmidt
- 07 Eigenvalues, Eigenvectors, and Diagonalization: Intuition behind eigenvectors and eigenvalues, The characteristic equation and solving for eigenvalues, Eigenspaces are null spaces: reusing the RREF toolkit, Eigenspaces and basis of eigenvectors, Algebraic vs geometric multiplicity and diagonalizability, Diagonalization of matrices, Application: PCA and PageRank algorithm
- 08 Symmetric Matrices and Quadratic Forms: From quadratic functions to symmetric matrices, Classifying definiteness by eigenvalue signs, Definiteness as shape: bowls, domes, and saddles, The spectral theorem: real eigenvalues, orthogonal eigenvectors
- 09 SVD and PCA: The Capstone: Why A transpose A: turning any matrix symmetric, Finding V and the singular values, Building U: the translation formula, Filling U: silent dimensions from the left null space, SVD as rotate, stretch, rotate, PCA by hand: center, covariance, eigendecompose, project, The toolkit dependency graph: how it all composes

## The live quiz bank for these topics — 43 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Determinants: Geometric meaning and calculation

- Q: Geometrically, what does the determinant of a linear transformation measure?
    [ ] The length of the matrix's longest eigenvector
    [CORRECT] The signed factor by which it scales area or volume
    [ ] The angle between the columns of the matrix
    [ ] The number of pivot columns in the matrix
- Q: Geometrically, why does a singular matrix have determinant 0?
    [ ] Because the entries of every singular matrix are required to sum exactly to zero
    [ ] Because any singular matrix must contain at least one exactly repeated row
    [CORRECT] Because it collapses area onto a line or lower-dimensional set of zero area
    [ ] Because a singular matrix always has strictly more columns than it has rows
- Q: Consider the matrix $A = \begin{bmatrix} 3 & 1 \\ 1 & 2 \end{bmatrix}$ corresponding to a linear transformation. Compute $\det(A)$ and select the statement that correctly interprets this value in geometric terms.
    [CORRECT] Area scaling factor is 5, orientation is preserved
    [ ] Area scaling factor is 5, orientation is reversed
    [ ] Area scaling factor is -5, orientation is preserved
    [ ] Area scaling factor is -5, orientation is reversed
- Q: What is the determinant of the $2 \times 2$ matrix $\begin{pmatrix} a & b \ c & d \end{pmatrix}$?
    [CORRECT] $ad - bc$
    [ ] $a + d - b - c$
    [ ] $ac - bd$
    [ ] $ab + cd$
- Q: A transformation sends the unit square (area 1) to a region of area 5, preserving orientation. What is its determinant?
    [ ] 1
    [ ] It cannot be expressed as a determinant
    [ ] 0
    [CORRECT] 5
- Q: If $A$ is invertible and $\det(A) = 8$, what is $\det(A^{-1})$?
    [ ] 0
    [ ] -8
    [CORRECT] $\frac{1}{8}$
    [ ] 8

### Minors: deleting a row and a column

- Q: Let $A = \begin{bmatrix} 2 & 1 & 3 \\ 0 & 4 & 5 \\ 6 & 7 & 8 \end{bmatrix}$. The minor $M_{23}$ is found by deleting row 2 and column 3. What is the value of $M_{23}$?
    [CORRECT] $M_{23} = 8$
    [ ] $M_{23} = 5$
    [ ] $M_{23} = 2$
    [ ] $M_{23} = 11$
- Q: The minor $M_{31}$ of a $3 \times 3$ matrix $A$ equals $7$. What is the cofactor $C_{31}$ of the same entry?
    [CORRECT] $C_{31} = 7$
    [ ] $C_{31} = -7$
    [ ] $C_{31} = 3$
    [ ] $C_{31} = -3$
- Q: If $A$ is a $4 \times 4$ matrix and the minor $M_{24}$ is computed by deleting row 2 and column 4, what is the size of the submatrix whose determinant gives $M_{24}$?
    [ ] $2 \times 2$
    [CORRECT] $3 \times 3$
    [ ] $4 \times 4$
    [ ] $1 \times 4$
- Q: For the matrix $A = \begin{bmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \\ 7 & 8 & 9 \end{bmatrix}$, which submatrix is used to compute the minor $M_{12}$?
    [CORRECT] $\begin{bmatrix} 4 & 6 \\ 7 & 9 \end{bmatrix}$
    [ ] $\begin{bmatrix} 5 & 6 \\ 8 & 9 \end{bmatrix}$
    [ ] $\begin{bmatrix} 1 & 3 \\ 7 & 9 \end{bmatrix}$
    [ ] $\begin{bmatrix} 4 & 5 \\ 7 & 8 \end{bmatrix}$
- Q: Let $A = \begin{bmatrix} 1 & 0 & 2 \\ 3 & 1 & 4 \\ 2 & 5 & 1 \end{bmatrix}$. A student computes the minor $M_{11}$ by deleting row 1 and column 1. What is the correct value of $M_{11}$?
    [CORRECT] $M_{11} = -19$
    [ ] $M_{11} = -21$
    [ ] $M_{11} = 11$
    [ ] $M_{11} = 21$
- Q: Let $B = \begin{bmatrix} 3 & -2 \\ 1 & 5 \end{bmatrix}$. What is the minor $M_{22}$, obtained by deleting row 2 and column 2?
    [ ] $M_{22} = 5$
    [CORRECT] $M_{22} = 3$
    [ ] $M_{22} = -2$
    [ ] $M_{22} = 1$

### Cofactors and the checkerboard sign pattern

- Q: For $A=\begin{bmatrix}2&1&0\\3&4&5\\0&1&1\end{bmatrix}$, compute the cofactor $C_{12}$.
    [ ] $3$
    [ ] $-5$
    [CORRECT] $-3$
    [ ] $5$
- Q: When are a minor $M_{ij}$ and its cofactor $C_{ij}$ exactly equal?
    [ ] When $i+j$ is odd
    [CORRECT] When $i+j$ is even
    [ ] Only when $a_{ij}=0$
    [ ] Only when $A$ is diagonal
- Q: Using the zero-rich middle column of $\begin{bmatrix}1&0&2\\0&3&0\\4&0&5\end{bmatrix}$, find the determinant.
    [ ] $9$
    [ ] $-3$
    [ ] $3$
    [CORRECT] $-9$
- Q: For a $5\times5$ matrix, what is the checkerboard sign used in the cofactor $C_{32}$?
    [CORRECT] Negative: $3+2$ is odd
    [ ] Positive: $3+2$ is even
    [ ] Positive: row index is odd
    [ ] It follows the minor sign
- Q: For the same square matrix, how do cofactor expansion along row 2 and along column 3 compare?
    [ ] Columns give $-\det(A)$ instead
    [CORRECT] Both expansions give $\det(A)$
    [ ] Only symmetric matrices allow this
    [ ] They match only for triangular $A$
- Q: In $B=\begin{bmatrix}2&0&1\\1&3&2\\0&4&0\end{bmatrix}$, what is the contribution of $a_{32}$ to a row 3 cofactor expansion?
    [CORRECT] $-12$
    [ ] $12$
    [ ] $-4$
    [ ] $4$

### Cofactor expansion: the recursive determinant

- Q: You want to compute $\det(A)$ by cofactor expansion with the least amount of work, where $$A = \begin{bmatrix} 3 & 0 & 2 \\ 5 & 0 & 1 \\ 4 & 7 & 6 \end{bmatrix}$$ Which row or column is the smartest choice, and why?
    [CORRECT] Column 2, since two of its entries are zero
    [ ] Row 1, since its first entry is smallest
    [ ] Row 3, since its entries are the largest
    [ ] Column 1, since all of its entries are nonzero
- Q: Compute $\det(A)$ by expanding along the second column, where $$A = \begin{bmatrix} 1 & 0 & 2 \\ 3 & 0 & -1 \\ 2 & 4 & 5 \end{bmatrix}$$
    [CORRECT] $28$
    [ ] $-28$
    [ ] $14$
    [ ] $-14$
- Q: For an $n \times n$ matrix $A$, the minor $M_{ij}$ is the determinant of the submatrix obtained by deleting row $i$ and column $j$. How is the cofactor $C_{ij}$ related to the minor $M_{ij}$?
    [CORRECT] $C_{ij} = (-1)^{i+j} M_{ij}$
    [ ] $C_{ij} = (-1)^{i \cdot j} M_{ij}$
    [ ] $C_{ij} = M_{ij} - (-1)^{i+j}$
    [ ] $C_{ij} = a_{ij} \cdot M_{ij}$
- Q: Applying cofactor expansion along the first column repeatedly to an upper triangular $4 \times 4$ matrix $U$ (all entries below the diagonal are zero) shows that $\det(U)$ always equals which expression?
    [CORRECT] $u_{11} u_{22} u_{33} u_{44}$
    [ ] $u_{11} + u_{22} + u_{33} + u_{44}$
    [ ] $u_{14} u_{24} u_{34} u_{44}$
    [ ] $u_{11} u_{44} - u_{14} u_{41}$
- Q: Use cofactor expansion along the first row to compute $\det(A)$, where $$A = \begin{bmatrix} 2 & 1 & 0 \\ 3 & -1 & 2 \\ 0 & 1 & 1 \end{bmatrix}$$
    [CORRECT] $-9$
    [ ] $-3$
    [ ] $3$
    [ ] $9$
- Q: When forming the cofactor $C_{23}$ of the entry $a_{23}$ in a cofactor expansion, what sign factor $(-1)^{i+j}$ is attached to it, and why?
    [ ] $+1$, because $2 \cdot 3 = 6$ is even
    [CORRECT] $-1$, because $2 + 3 = 5$ is odd
    [ ] $+1$, because $2 + 3 = 5$ is odd
    [ ] $-1$, because $2 \cdot 3 = 6$ is even

### The adjugate: transpose of the cofactor matrix

- Q: If $A$ is an invertible square matrix, which formula expresses $A^{-1}$ in terms of the adjugate?
    [CORRECT] $A^{-1} = \frac{1}{\det(A)} \operatorname{adj}(A)$
    [ ] $A^{-1} = \det(A) \operatorname{adj}(A)$
    [ ] $A^{-1} = \frac{1}{\det(A)} \operatorname{adj}(A)^{T}$
    [ ] $A^{-1} = \det(A) \operatorname{adj}(A)^{T}$
- Q: A key consequence of the cofactor expansion is the identity $A \operatorname{adj}(A) = X$. For any square matrix $A$, what is $X$?
    [CORRECT] $\det(A)\, I$
    [ ] $\det(A)\, A$
    [ ] $\operatorname{adj}(A)\, A^{T}$
    [ ] $\det(A)\, A^{T}$
- Q: Let $A = \begin{bmatrix} 1 & 0 & 2 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix}$. Compute the cofactor matrix, then transpose it to find $\operatorname{adj}(A)$.
    [CORRECT] $\begin{bmatrix} 1 & 0 & -2 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix}$
    [ ] $\begin{bmatrix} 1 & 0 & 2 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix}$
    [ ] $\begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ -2 & 0 & 1 \end{bmatrix}$
    [ ] $\begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 2 & 1 \end{bmatrix}$
- Q: For a $3 \times 3$ matrix $A$ with cofactors $C_{ij}$, which cofactor appears in the $(2,3)$ position of $\operatorname{adj}(A)$?
    [CORRECT] The cofactor $C_{32}$
    [ ] The cofactor $C_{23}$
    [ ] The cofactor $C_{22}$
    [ ] The cofactor $C_{33}$
- Q: Suppose $A$ is a $3 \times 3$ matrix with $\det(A) = 2$. Using the identity $A \operatorname{adj}(A) = \det(A)\, I$ and taking determinants of both sides, what is $\det(\operatorname{adj}(A))$?
    [CORRECT] $4$
    [ ] $2$
    [ ] $6$
    [ ] $8$
- Q: Let $A = \begin{bmatrix} 3 & 2 \\ 1 & 4 \end{bmatrix}$. Using the cofactor method, what is $\operatorname{adj}(A)$, the transpose of the cofactor matrix?
    [CORRECT] $\begin{bmatrix} 4 & -2 \\ -1 & 3 \end{bmatrix}$
    [ ] $\begin{bmatrix} 4 & 2 \\ 1 & 3 \end{bmatrix}$
    [ ] $\begin{bmatrix} 3 & -2 \\ -1 & 4 \end{bmatrix}$
    [ ] $\begin{bmatrix} 4 & -1 \\ -2 & 3 \end{bmatrix}$

### Two roads to the inverse: adjugate formula and Gauss-Jordan

- Q: Apply Gauss-Jordan elimination to $[A\mid I]$ where $A=\begin{bmatrix}2 & 5 \\ 1 & 3\end{bmatrix}$. After the left block becomes $I$, what is the right block?
    [CORRECT] $\begin{bmatrix}3 & -5 \\ -1 & 2\end{bmatrix}$
    [ ] $\begin{bmatrix}3 & 5 \\ 1 & 2\end{bmatrix}$
    [ ] $\begin{bmatrix}-3 & 5 \\ 1 & -2\end{bmatrix}$
    [ ] $\begin{bmatrix}2 & -5 \\ -1 & 3\end{bmatrix}$
- Q: Which identity is the direct reason that $A^{-1}=\frac{1}{\det(A)}\operatorname{adj}(A)$ works when $\det(A)\neq 0$?
    [ ] $A\operatorname{adj}(A)=I$ for every square matrix $A$
    [CORRECT] $A\operatorname{adj}(A)=\det(A)I$ for every square matrix $A$
    [ ] $\operatorname{adj}(A)=A^T$ whenever $A$ is invertible
    [ ] $\det(\operatorname{adj}(A))=\det(A)$ whenever $A$ is invertible
- Q: Suppose Gauss-Jordan elimination transforms $[A\mid I]$ into $[I\mid B]$. Which conclusion is justified?
    [ ] $B=A^T$, so $A$ must be symmetric
    [ ] $\det(B)=1$, so $B$ is orthogonal
    [CORRECT] $AB=I$ and $BA=I$, so $B=A^{-1}$
    [ ] $\det(A)=0$, so the reduction was invalid
- Q: Using Gauss-Jordan elimination on $[A\mid I]$ with $A=\begin{bmatrix}4 & 3 \\ 5 & 4\end{bmatrix}$, the left block becomes $I$. What is the right block?
    [CORRECT] $\begin{bmatrix}4 & -3 \\ -5 & 4\end{bmatrix}$
    [ ] $\begin{bmatrix}4 & 3 \\ 5 & 4\end{bmatrix}$
    [ ] $\begin{bmatrix}-4 & 3 \\ 5 & -4\end{bmatrix}$
    [ ] $\begin{bmatrix}4 & 5 \\ 3 & 4\end{bmatrix}$
- Q: For $C=\begin{bmatrix}2 & 4 \\ 1 & 2\end{bmatrix}$, why do both inverse methods fail?
    [ ] The pivots are nonzero, so only rounding can make them fail
    [ ] The matrix is square, so both methods must still succeed
    [ ] The cofactors exist, so dividing by them gives an inverse
    [CORRECT] The determinant is zero, so division by it and reduction to $I$ both break down
- Q: For $A=\begin{bmatrix}3 & 1 \\ 2 & 4\end{bmatrix}$, use the adjugate formula to find $A^{-1}$.
    [CORRECT] $\frac{1}{10}\begin{bmatrix}4 & -1 \\ -2 & 3\end{bmatrix}$
    [ ] $\begin{bmatrix}4 & -1 \\ -2 & 3\end{bmatrix}$
    [ ] $\frac{1}{10}\begin{bmatrix}4 & -2 \\ -1 & 3\end{bmatrix}$
    [ ] $\frac{1}{10}\begin{bmatrix}4 & 1 \\ 2 & 3\end{bmatrix}$
- Q: After applying Gauss-Jordan elimination to $[B\mid I]$ for $B=\begin{bmatrix}1 & 2 \\ 3 & 7\end{bmatrix}$, the left block becomes $I$. What is the right block?
    [ ] $\begin{bmatrix}1 & -2 \\ -3 & 7\end{bmatrix}$
    [ ] $\begin{bmatrix}7 & 2 \\ 3 & 1\end{bmatrix}$
    [CORRECT] $\begin{bmatrix}7 & -2 \\ -3 & 1\end{bmatrix}$
    [ ] $\begin{bmatrix}-7 & 2 \\ 3 & -1\end{bmatrix}$
- Q: If $A$ is a $3\times 3$ invertible matrix with $\det(A)=5$, what is $\det(\operatorname{adj}(A))$?
    [CORRECT] $25$
    [ ] $5$
    [ ] $\frac{1}{5}$
    [ ] $125$

### Inverse matrices and their role in transformations

- Q: If det(A) = 0, which conclusion follows?
    [ ] A has infinitely many inverses
    [ ] A has an inverse whose determinant is 0
    [CORRECT] A has no inverse
    [ ] A must be an orthogonal matrix
- Q: Why can a matrix have an inverse only if it never sends two different inputs to the same output?
    [CORRECT] Because undoing it would be impossible if distinct inputs shared one output
    [ ] Because the elementary row operations would otherwise stop working entirely
    [ ] Because matrix inverses are known to exist solely for diagonal square matrices
    [ ] Because determinants themselves are only ever defined for invertible matrices
- Q: If $A$ maps the vector $x$ to the vector $b$, what does $A^{-1}$ do?
    [ ] It maps every vector to the identity
    [ ] It maps $x$ to the product $Ab$
    [CORRECT] It maps $b$ back to $x$
    [ ] It maps only the zero vector to $x$
- Q: What is the main role of the inverse of a matrix?
    [ ] To generate a brand-new basis automatically
    [ ] To project vectors onto a fixed line
    [CORRECT] To undo the transformation that the matrix performs
    [ ] To estimate the determinant of the original matrix
- Q: Let $A = \begin{bmatrix} 2 & 1 \\ 6 & 4 \end{bmatrix}$. Compute $A^{-1}$ using the formula $A^{-1} = \frac{1}{\det(A)} \operatorname{adj}(A)$, then multiply $A A^{-1}$ to confirm you recover the identity matrix. Which of the following is the correct inverse?
    [CORRECT] $A^{-1} = \begin{bmatrix} 2 & -0.5 \\ -3 & 1 \end{bmatrix}$
    [ ] $A^{-1} = \begin{bmatrix} 4 & -1 \\ -6 & 2 \end{bmatrix}$
    [ ] $A^{-1} = \begin{bmatrix} -2 & 0.5 \\ 3 & -1 \end{bmatrix}$
    [ ] $A^{-1} = \begin{bmatrix} 2 & -3 \\ -0.5 & 1 \end{bmatrix}$

