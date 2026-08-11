# SOURCE PACK — Mathematics / Linear Algebra / 01 Vectors and Linear Transformations

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Vector operations: Addition, scalar multiplication, and dot products   (3 questions)
2. Geometric interpretation of vectors and transformations   (6 questions)
3. Linear transformations and matrix-vector multiplication   (4 questions)
4. Matrix multiplication as a composition of transformations   (5 questions)

## Covered by LATER lessons — do not teach these here

- 02 Systems of Linear Equations and RREF: Representing systems of linear equations as matrices, Elementary row operations and Gaussian elimination, REF and Reduced Row Echelon Form (RREF), Rank of a matrix, Linear dependence and independence, Singularity and solvability of systems
- 03 The Four Fundamental Subspaces: Vector spaces and subspaces, Basis and dimension of a space, Column space and the span of pivot columns, Row space: nonzero rows of RREF, Null space: free variables and special solutions, Left null space: relationships among rows, The Rank-Nullity Theorem
- 04 Determinants, Cofactors, and the Inverse: Determinants: Geometric meaning and calculation, Minors: deleting a row and a column, Cofactors and the checkerboard sign pattern, Cofactor expansion: the recursive determinant, The adjugate: transpose of the cofactor matrix, Two roads to the inverse: adjugate formula and Gauss-Jordan, Inverse matrices and their role in transformations
- 05 Orthogonality, Projections, and Least Squares: Orthogonality and orthonormal bases, The shadow formula: projecting one vector onto another, Projections of vectors onto subspaces, The Gram matrix and the normal equations, The projection matrix onto a column space, Applications: Least squares and linear regression foundations, The residual lives in the left null space
- 06 Building Better Bases: Change of Basis, Gram-Schmidt, and QR: Changing the basis of a vector space, Constructing the change-of-basis matrix, Gram-Schmidt: subtracting the shadows, From orthogonal to orthonormal: normalization, QR decomposition from Gram-Schmidt
- 07 Eigenvalues, Eigenvectors, and Diagonalization: Intuition behind eigenvectors and eigenvalues, The characteristic equation and solving for eigenvalues, Eigenspaces are null spaces: reusing the RREF toolkit, Eigenspaces and basis of eigenvectors, Algebraic vs geometric multiplicity and diagonalizability, Diagonalization of matrices, Application: PCA and PageRank algorithm
- 08 Symmetric Matrices and Quadratic Forms: From quadratic functions to symmetric matrices, Classifying definiteness by eigenvalue signs, Definiteness as shape: bowls, domes, and saddles, The spectral theorem: real eigenvalues, orthogonal eigenvectors
- 09 SVD and PCA: The Capstone: Why A transpose A: turning any matrix symmetric, Finding V and the singular values, Building U: the translation formula, Filling U: silent dimensions from the left null space, SVD as rotate, stretch, rotate, PCA by hand: center, covariance, eigendecompose, project, The toolkit dependency graph: how it all composes

## The live quiz bank for these topics — 18 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Vector operations: Addition, scalar multiplication, and dot products

- Q: How are vector addition and subtraction carried out?
    [CORRECT] Component by component
    [ ] By converting both vectors to matrices first
    [ ] By multiplying magnitudes and adding the angles
    [ ] By taking the determinant of the pair
- Q: In matrix multiplication, which operation is applied between a row of the first matrix and a column of the second to produce a single entry?
    [ ] The determinant
    [CORRECT] The dot product
    [ ] The cross product
    [ ] The matrix inverse
- Q: In typical applications, what does a vector represent?
    [ ] A location only, having no size
    [ ] A square matrix written compactly
    [ ] A table of probabilities
    [CORRECT] Both a magnitude and a direction

### Geometric interpretation of vectors and transformations

- Q: In the plane, what is a linear transformation?
    [ ] A rule that assigns a single number to each point of the plane
    [CORRECT] A rule that sends each point of the plane to another point in the plane
    [ ] The graph of a quadratic surface over the plane
    [ ] A procedure that returns only the eigenvectors of a matrix
- Q: Under any linear transformation, where is the origin always sent?
    [ ] To an undefined location
    [ ] To the value of the determinant
    [CORRECT] To the origin itself
    [ ] To the first column of the matrix
- Q: Why is the image of the unit square (the fundamental square spanned by the standard basis vectors) so informative about a linear transformation?
    [ ] Because only perfectly square matrices can be drawn as plane transformations
    [CORRECT] Because the square and its image show how the matrix reshapes the whole plane
    [ ] Because the unit square is always an eigenbasis aligned with the matrix's axes
    [ ] Because its image merely fixes the determinant value and reveals nothing else
- Q: Consider the vector $\vec{v} = \begin{bmatrix} 3 \\ 1 \end{bmatrix}$ in $\mathbb{R}^2$ and the matrix $A = \begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix}$. Which option correctly describes the location of the transformed vector $A\vec{v}$ relative to the original $\vec{v}$, and the geometric effect of $A$ on the entire plane?
    [CORRECT] $A\vec{v} = \begin{bmatrix} -1 \\ 3 \end{bmatrix}$, which is $\vec{v}$ rotated counterclockwise by $90^\circ$; the whole plane is rotated counterclockwise by $90^\circ$ about the origin.
    [ ] $A\vec{v} = \begin{bmatrix} -1 \\ 3 \end{bmatrix}$, which is $\vec{v}$ reflected across the line $y = x$; the whole plane is reflected across the line $y = x$.
    [ ] $A\vec{v} = \begin{bmatrix} 1 \\ -3 \end{bmatrix}$, which is $\vec{v}$ rotated clockwise by $90^\circ$; the whole plane is rotated clockwise by $90^\circ$ about the origin.
    [ ] $A\vec{v} = \begin{bmatrix} 3 \\ -1 \end{bmatrix}$, which is $\vec{v}$ reflected across the $x$-axis; the whole plane is sheared horizontally by a factor of $1$.
- Q: Let $A = \begin{bmatrix} 1 & 2 \\ 0 & 1 \end{bmatrix}$ and $\mathbf{v} = (2, 1)$. Compute $A\mathbf{v}$ and identify the geometric effect of the transformation $A$ on the entire plane $\mathbb{R}^2$.
    [CORRECT] $(4, 1)$ and the plane undergoes a horizontal shear.
    [ ] $(4, 1)$ and the plane is scaled horizontally by a factor of 2.
    [ ] $(2, 5)$ and the plane undergoes a vertical shear.
    [ ] $(2, 1)$ and the plane is unchanged (identity transformation).
- Q: The matrix $A = \begin{bmatrix} 1 & 0 \\ 0 & -1 \end{bmatrix}$ reflects vectors across the $x$-axis. A vector $\mathbf{v}$ is shown as an arrow from the origin to $(2, 3)$. Which diagram correctly shows the transformed vector $A\mathbf{v}$, along with how the standard basis vectors $\mathbf{e}_1 = (1,0)$ and $\mathbf{e}_2 = (0,1)$ are transformed by $A$?
    [CORRECT] Basis $\mathbf{e}_1$ stays at $(1,0)$, $\mathbf{e}_2$ moves to $(0,-1)$, and $\mathbf{v}$ moves to $(2,-3)$.
    [ ] Basis $\mathbf{e}_1$ moves to $(-1,0)$, $\mathbf{e}_2$ stays at $(0,1)$, and $\mathbf{v}$ moves to $(-2,3)$.
    [ ] Basis $\mathbf{e}_1$ stays at $(1,0)$, $\mathbf{e}_2$ moves to $(0,1)$, and $\mathbf{v}$ moves to $(2,3)$.
    [ ] Basis $\mathbf{e}_1$ moves to $(0,1)$, $\mathbf{e}_2$ moves to $(1,0)$, and $\mathbf{v}$ moves to $(3,2)$.

### Linear transformations and matrix-vector multiplication

- Q: How is a linear transformation in the plane best described?
    [ ] A rule that assigns two completely separate outputs to every input
    [CORRECT] A rule that sends each point to another point in a structured way
    [ ] A computational shortcut used only for evaluating determinants
    [ ] A graph that displays all of a matrix's entries at once visually
- Q: Why does the image of the unit square help you visualize matrix-vector multiplication?
    [ ] Because only square regions of the plane can be multiplied by a given matrix
    [CORRECT] Because the basis vectors' images then show how the whole plane is reshaped
    [ ] Because it lets you avoid working with individual vectors altogether here
    [ ] Because the image of the square directly hands you the full inverse matrix
- Q: Under a linear transformation, what always happens to the origin?
    [CORRECT] It stays at the origin
    [ ] It becomes undefined
    [ ] It moves to the value of the determinant
    [ ] It moves to the first column of the matrix
- Q: Consider the mapping $T: \mathbb{R}^2 \to \mathbb{R}^2$ defined by $T\left(\begin{bmatrix} x \\ y \end{bmatrix}\right) = \begin{bmatrix} 2x - y \\ x + 3y \end{bmatrix}$. Which of the following algebraic checks correctly verifies that $T$ satisfies the addition property $T(\mathbf{u} + \mathbf{v}) = T(\mathbf{u}) + T(\mathbf{v})$?
    [CORRECT] Let $\mathbf{u} = \begin{bmatrix} x_1 \\ y_1 \end{bmatrix}$, $\mathbf{v} = \begin{bmatrix} x_2 \\ y_2 \end{bmatrix}$. Then $T(\mathbf{u} + \mathbf{v}) = \begin{bmatrix} 2(x_1+x_2) - (y_1+y_2) \\ (x_1+x_2) + 3(y_1+y_2) \end{bmatrix} = \begin{bmatrix} 2x_1 - y_1 \\ x_1 + 3y_1 \end{bmatrix} + \begin{bmatrix} 2x_2 - y_2 \\ x_2 + 3y_2 \end{bmatrix} = T(\mathbf{u}) + T(\mathbf{v})$.
    [ ] Let $\mathbf{u} = \begin{bmatrix} x_1 \\ y_1 \end{bmatrix}$, $\mathbf{v} = \begin{bmatrix} x_2 \\ y_2 \end{bmatrix}$. Then $T(\mathbf{u} + \mathbf{v}) = \begin{bmatrix} 2x_1 + y_1 \\ x_1 - 3y_1 \end{bmatrix} + \begin{bmatrix} 2x_2 + y_2 \\ x_2 - 3y_2 \end{bmatrix} = T(\mathbf{u}) + T(\mathbf{v})$.
    [ ] Let $\mathbf{u} = \begin{bmatrix} x_1 \\ y_1 \end{bmatrix}$. Then $T(2\mathbf{u}) = \begin{bmatrix} 4x_1 - 2y_1 \\ 2x_1 + 6y_1 \end{bmatrix} = 2 \begin{bmatrix} 2x_1 - y_1 \\ x_1 + 3y_1 \end{bmatrix} = 2T(\mathbf{u})$, so addition also holds.
    [ ] Since $T$ outputs vectors of the form $\begin{bmatrix} 2x - y \\ x + 3y \end{bmatrix}$ and the origin maps to itself, the transformation automatically preserves vector addition.

### Matrix multiplication as a composition of transformations

- Q: For the product AB to be defined, which dimension condition must hold?
    [ ] The determinants of A and B must be equal
    [ ] The number of rows of A equals the number of columns of B
    [CORRECT] The number of columns of A equals the number of rows of B
    [ ] Both A and B must be square matrices
- Q: If $A$ is a $2 \times 3$ matrix and $B$ is a $3 \times 4$ matrix, what are the dimensions of the product $AB$?
    [ ] $4 \times 2$
    [ ] $2 \times 3$
    [ ] $3 \times 3$
    [CORRECT] $2 \times 4$
- Q: To compute a single entry of a matrix product, which pair of vectors do you combine with a dot product?
    [ ] A column of the first matrix with a column of the second
    [ ] Two columns taken from the second matrix
    [ ] Two rows taken from the first matrix
    [CORRECT] A row of the first matrix with a column of the second
- Q: When a composition of transformations is written as a matrix product acting on a column vector, why do the matrices appear in the opposite order from the order in which you visually apply the transformations?
    [ ] Because taking the determinant of a product reverses the order of its factors
    [CORRECT] Because the vector multiplies on the right, so the first transform sits closest
    [ ] Because any prior row operations must be fully undone before you can multiply
    [ ] Because matrix multiplication happens to be commutative in these particular cases
- Q: Geometrically, what does multiplying two matrices represent?
    [ ] Eliminating the need to act on vectors
    [CORRECT] Composing two linear transformations into a single one
    [ ] Swapping the coordinates of every input vector
    [ ] Averaging the effects of two transformations

