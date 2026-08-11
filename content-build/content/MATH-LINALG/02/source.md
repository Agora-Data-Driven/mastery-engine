# SOURCE PACK — Mathematics / Linear Algebra / 02 Systems of Linear Equations and RREF

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Representing systems of linear equations as matrices   (5 questions)
2. Elementary row operations and Gaussian elimination   (5 questions)
3. REF and Reduced Row Echelon Form (RREF)   (5 questions)
4. Rank of a matrix   (9 questions)
5. Linear dependence and independence   (10 questions)
6. Singularity and solvability of systems   (6 questions)

## Already taught earlier in this course

- Vector operations: Addition, scalar multiplication, and dot products
- Geometric interpretation of vectors and transformations
- Linear transformations and matrix-vector multiplication
- Matrix multiplication as a composition of transformations

## Covered by LATER lessons — do not teach these here

- 03 The Four Fundamental Subspaces: Vector spaces and subspaces, Basis and dimension of a space, Column space and the span of pivot columns, Row space: nonzero rows of RREF, Null space: free variables and special solutions, Left null space: relationships among rows, The Rank-Nullity Theorem
- 04 Determinants, Cofactors, and the Inverse: Determinants: Geometric meaning and calculation, Minors: deleting a row and a column, Cofactors and the checkerboard sign pattern, Cofactor expansion: the recursive determinant, The adjugate: transpose of the cofactor matrix, Two roads to the inverse: adjugate formula and Gauss-Jordan, Inverse matrices and their role in transformations
- 05 Orthogonality, Projections, and Least Squares: Orthogonality and orthonormal bases, The shadow formula: projecting one vector onto another, Projections of vectors onto subspaces, The Gram matrix and the normal equations, The projection matrix onto a column space, Applications: Least squares and linear regression foundations, The residual lives in the left null space
- 06 Building Better Bases: Change of Basis, Gram-Schmidt, and QR: Changing the basis of a vector space, Constructing the change-of-basis matrix, Gram-Schmidt: subtracting the shadows, From orthogonal to orthonormal: normalization, QR decomposition from Gram-Schmidt
- 07 Eigenvalues, Eigenvectors, and Diagonalization: Intuition behind eigenvectors and eigenvalues, The characteristic equation and solving for eigenvalues, Eigenspaces are null spaces: reusing the RREF toolkit, Eigenspaces and basis of eigenvectors, Algebraic vs geometric multiplicity and diagonalizability, Diagonalization of matrices, Application: PCA and PageRank algorithm
- 08 Symmetric Matrices and Quadratic Forms: From quadratic functions to symmetric matrices, Classifying definiteness by eigenvalue signs, Definiteness as shape: bowls, domes, and saddles, The spectral theorem: real eigenvalues, orthogonal eigenvectors
- 09 SVD and PCA: The Capstone: Why A transpose A: turning any matrix symmetric, Finding V and the singular values, Building U: the translation formula, Filling U: silent dimensions from the left null space, SVD as rotate, stretch, rotate, PCA by hand: center, covariance, eigendecompose, project, The toolkit dependency graph: how it all composes

## The live quiz bank for these topics — 40 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Representing systems of linear equations as matrices

- Q: How is a system of linear equations converted into a matrix?
    [ ] Replace each equation by its own determinant value
    [ ] Place the constant terms along the main diagonal
    [CORRECT] Place the coefficients of the variables into an array
    [ ] Put each variable into a separate matrix of its own
- Q: When a linear system is written as a coefficient matrix, what does each row of that matrix correspond to?
    [ ] A variable
    [CORRECT] An equation
    [ ] A solution
    [ ] A basis vector
- Q: When deciding whether a system is singular or non-singular, why can the right-hand-side constants be ignored?
    [ ] Because the constants only affect the determinant
    [CORRECT] Because singularity depends on the coefficient structure
    [ ] Because the constants vanish after one row swap
    [ ] Because the constants are always zero in practice
- Q: When a linear system is written as a coefficient matrix, what does each column of that matrix correspond to?
    [ ] A distinct constant term taken from each equation
    [CORRECT] The coefficients of one variable across the equations
    [ ] A separate matrix operation applied to the system
    [ ] A different method used to solve the linear system
- Q: Given the system: $2x - y + 3z = 7$, $x + y - z = 0$, $-3x + 4y + 2z = -5$. Which option correctly gives the coefficient matrix $A$, the constant vector $\mathbf{b}$, and the augmented matrix $[A\mid\mathbf{b}]$?
    [CORRECT] $A = \begin{bmatrix} 2 & -1 & 3 \\ 1 & 1 & -1 \\ -3 & 4 & 2 \end{bmatrix}$, $\mathbf{b} = \begin{bmatrix} 7 \\ 0 \\ -5 \end{bmatrix}$, $[A\mid\mathbf{b}] = \begin{bmatrix} 2 & -1 & 3 & 7 \\ 1 & 1 & -1 & 0 \\ -3 & 4 & 2 & -5 \end{bmatrix}$
    [ ] $A = \begin{bmatrix} 2 & -1 & 3 \\ 1 & 1 & -1 \\ -3 & 4 & 2 \end{bmatrix}$, $\mathbf{b} = \begin{bmatrix} 7 \\ 0 \\ -5 \end{bmatrix}$, $[A\mid\mathbf{b}] = \begin{bmatrix} 2 & 1 & -3 & 7 \\ -1 & 1 & 4 & 0 \\ 3 & -1 & 2 & -5 \end{bmatrix}$
    [ ] $A = \begin{bmatrix} 7 \\ 0 \\ -5 \end{bmatrix}$, $\mathbf{b} = \begin{bmatrix} 2 & -1 & 3 \\ 1 & 1 & -1 \\ -3 & 4 & 2 \end{bmatrix}$, $[A\mid\mathbf{b}] = \begin{bmatrix} 7 & 2 & -1 & 3 \\ 0 & 1 & 1 & -1 \\ -5 & -3 & 4 & 2 \end{bmatrix}$
    [ ] $A = \begin{bmatrix} 2 & -1 & 3 \\ 1 & 1 & -1 \\ -3 & 4 & 2 \end{bmatrix}$, $\mathbf{b} = \begin{bmatrix} 7 \\ 0 \\ -5 \end{bmatrix}$, $[A\mid\mathbf{b}] = \begin{bmatrix} 2 & -1 & 3 \\ 1 & 1 & -1 \\ -3 & 4 & 2 \\ 7 & 0 & -5 \end{bmatrix}$

### Elementary row operations and Gaussian elimination

- Q: During Gaussian elimination, the current pivot entry equals 2 and you want to scale it to 1. Which elementary row operation accomplishes this?
    [ ] Subtract the row from itself
    [ ] Add 2 to every entry of the row
    [ ] Swap the row with the constants column
    [CORRECT] Multiply the entire row by 1/2
- Q: In Gaussian elimination, what is the purpose of a pivot?
    [CORRECT] To create zeros below (and later above) key entries
    [ ] To remove the constants column from the matrix
    [ ] To estimate the value of the determinant
    [ ] To check whether two row vectors are orthogonal
- Q: Once the matrix is in row echelon form, what does back substitution accomplish?
    [ ] It converts each matrix column directly into a standard basis vector
    [ ] It rescales every single one of the rows by one shared scalar
    [CORRECT] It uses lower pivots to clear entries above and solve the unknowns
    [ ] It replaces each pivot entry with the whole matrix's determinant
- Q: When setting up Gaussian elimination to solve a linear system, what is the first matrix you construct?
    [ ] The full matrix inverse of the system's coefficient matrix
    [ ] The Hessian matrix of the system's second partial derivatives
    [CORRECT] The augmented matrix, with the constants as a final column
    [ ] The identity matrix having the exact same dimensions as it
- Q: Why can Gaussian elimination be carried out equally well by hand or implemented in code?
    [ ] Because it applies only to 2x2 matrices
    [ ] Because it never requires any stopping condition
    [ ] Because it relies on geometry rather than numbers
    [CORRECT] Because it is an algorithmic sequence of row operations

### REF and Reduced Row Echelon Form (RREF)

- Q: Reduced row echelon form (RREF) adds one extra requirement on top of ordinary row echelon form (REF). What is that extra condition?
    [ ] Every pivot entry must be a negative number
    [ ] The matrix must have more rows than columns
    [ ] Each pivot must equal 1 but signs may vary
    [CORRECT] Entries above each pivot must also be zero
- Q: Beyond solving a single linear system, why is putting a matrix into RREF so useful?
    [CORRECT] It exposes rank, free variables, and consistency
    [ ] It reaches the answer without any row operations
    [ ] It computes eigenvalues straight from the pivots
    [ ] It keeps the original columns exactly unchanged
- Q: A matrix in RREF has exactly three pivot positions. What is its rank?
    [ ] 2
    [ ] 0
    [CORRECT] 3
    [ ] 1
- Q: When a linear system is written in RREF, what does a free variable represent?
    [CORRECT] A variable that can take any chosen value
    [ ] A variable left untouched by all row operations
    [ ] A variable existing only in square matrices
    [ ] A variable certain to become a pivot later
- Q: When a linear system is written in RREF, what does a pivot variable represent?
    [ ] A variable free to take any chosen value
    [CORRECT] A variable whose value is fixed by the system
    [ ] A variable forced to equal zero in the system
    [ ] A variable forbidden from entering any basis

### Rank of a matrix

- Q: A $2 \times 2$ homogeneous system has a solution space that forms a line through the origin. What is the rank of its coefficient matrix?
    [ ] 0
    [CORRECT] 1
    [ ] 3
    [ ] 2
- Q: Why is the rank of a matrix relevant to image compression?
    [ ] Rank is exactly equal to the image's pixel count
    [CORRECT] Rank is tied to how much storage the image needs
    [ ] Higher-rank images always end up looking blurrier
    [ ] Any image matrix reduces to rank 1 with no loss
- Q: Consider the matrix $A = \begin{bmatrix} 1 & 2 & 3 \\ 2 & 1 & 0 \\ 5 & 4 & 3 \end{bmatrix}$, where row 3 is the sum of twice row 1 plus row 2. What is $\operatorname{rank}(A)$, and how does this value reflect both the number of independent rows and independent columns?
    [CORRECT] Rank 2: there are only 2 independent rows, and the columns span a 2‑dimensional plane inside $\mathbb{R}^3$.
    [ ] Rank 3: despite the row dependency, the matrix still maps to a 3‑dimensional space because it is square.
    [ ] Rank 2: there are 2 independent rows, but the columns span all of $\mathbb{R}^3$ since column rank is always independent of row rank.
    [ ] Rank 1: the single dependency among the rows forces the column space to collapse to a line through the origin.
- Q: In an intuitive sense, what does the rank of a matrix measure?
    [ ] The average magnitude of its entries
    [ ] The number of columns added to the rows
    [CORRECT] How much information its system carries
    [ ] The determinant left after row reduction
- Q: A matrix $A$ has been reduced to the row echelon form shown below. What is $\operatorname{rank}(A)$? $$\begin{bmatrix} 1 & 2 & -1 & 4 \\ 0 & 0 & 3 & 0 \\ 0 & 0 & 0 & 1 \\ 0 & 0 & 0 & 0 \end{bmatrix}$$
    [CORRECT] 3
    [ ] 4
    [ ] 2
    [ ] 1
- Q: A linear transformation $T: \mathbb{R}^3 \to \mathbb{R}^3$ is defined by $T(\mathbf{x}) = A\mathbf{x}$. Geometrically, $T$ maps every vector in $\mathbb{R}^3$ onto a plane passing through the origin. What is the rank of the matrix $A$?
    [CORRECT] $2$
    [ ] $1$
    [ ] $3$
    [ ] $0$
- Q: Stated in terms of rank, what condition makes a square matrix non-singular?
    [ ] Its rank falls below the number of rows
    [ ] Its rank is one more than the column count
    [ ] Its rank matches the determinant value
    [CORRECT] Its rank is equal to the number of rows
- Q: A $2 \times 2$ homogeneous system has a solution space consisting of only the single point $(0, 0)$. What is the rank of its coefficient matrix?
    [ ] It cannot be found from the solution space
    [ ] $0$
    [CORRECT] $2$
    [ ] $1$
- Q: Find the rank of the matrix $$A = \begin{bmatrix} 1 & 2 & 1 \\ 2 & 4 & 3 \\ 3 & 6 & 4 \end{bmatrix}$$ by row-reducing to echelon form.
    [CORRECT] 2
    [ ] 1
    [ ] 3
    [ ] 0

### Linear dependence and independence

- Q: A set of vectors forms a basis for a space only if it satisfies which two conditions together?
    [CORRECT] It spans the space and is linearly independent
    [ ] Every vector is an eigenvector of one shared matrix
    [ ] It is orthogonal and every vector has unit length
    [ ] All vectors share a coordinate count and a norm
- Q: A set of rows or vectors is called linearly dependent in which situation?
    [ ] When the system has as many equations as unknowns
    [ ] When none of them comes from any of the others
    [CORRECT] When one of them is a linear combination of the others
    [ ] When all of their entries happen to be positive
- Q: If you have more vectors than the dimension of the space they are meant to span, what must be true of that set of vectors?
    [ ] The vectors must all be eigenvectors
    [ ] The vectors automatically form a basis
    [CORRECT] The set must be linearly dependent
    [ ] The set must be mutually orthogonal
- Q: Suppose $v_3$ can be written as $\alpha v_1 + \beta v_2$ for some scalars $\alpha$ and $\beta$. What does this tell you about the set $\{v_1, v_2, v_3\}$?
    [ ] The three vectors must be mutually perpendicular
    [CORRECT] The set $\{v_1, v_2, v_3\}$ is linearly dependent
    [ ] The set is guaranteed to be a basis for the space
    [ ] The set spans a strictly higher-dimensional space
- Q: Consider the set of vectors in $\mathbb{R}^3$: $\mathbf{v}_1 = \begin{bmatrix} 1 \\ 2 \\ 1 \end{bmatrix}$, $\mathbf{v}_2 = \begin{bmatrix} 2 \\ 4 \\ 2 \end{bmatrix}$, and $\mathbf{v}_3 = \begin{bmatrix} 3 \\ 1 \\ 4 \end{bmatrix}$. Which statement correctly describes their linear dependence or independence?
    [CORRECT] The set is linearly dependent because $\mathbf{v}_1$ and $\mathbf{v}_2$ are scalar multiples, so the entire set cannot be independent.
    [ ] The set is linearly independent because $\mathbf{v}_1$ and $\mathbf{v}_3$ are not scalar multiples of each other.
    [ ] The set is linearly independent because all three vectors lie in $\mathbb{R}^3$ and no single vector is a scalar multiple of any other.
    [ ] The set is linearly dependent because $\mathbf{v}_3$ can be written as $c_1 \mathbf{v}_1 + c_2 \mathbf{v}_2$ with non-zero $c_1$, $c_2$.
- Q: Consider these vectors in $\mathbb{R}^2$: $\mathbf{v}_1 = \begin{bmatrix}1 \\ 0\end{bmatrix}$, $\mathbf{v}_2 = \begin{bmatrix}2 \\ 1\end{bmatrix}$, $\mathbf{v}_3 = \begin{bmatrix}0 \\ -1\end{bmatrix}$. Which statement about the set $\{\mathbf{v}_1, \mathbf{v}_2, \mathbf{v}_3\}$ is correct?
    [CORRECT] The set is linearly dependent because you can form $\mathbf{v}_2$ via $1\mathbf{v}_1 - 1\mathbf{v}_3$ with weights not all zero.
    [ ] The set is linearly independent because no pair of these vectors is a scalar multiple of the other.
    [ ] The set is linearly independent because the vectors span all of $\mathbb{R}^2$, satisfying the definition of independence.
    [ ] The set is linearly dependent because $\mathbf{v}_3$ equals $(-2)\mathbf{v}_1 + (1)\mathbf{v}_2$, making the vectors collinear overall.
- Q: Consider the set $S = \{ \mathbf{v}_1 = [1, 3]^T,\; \mathbf{v}_2 = [2, 6]^T \}$. According to the formal definition, which choice of scalars $(c_1, c_2)$ demonstrates that $S$ is linearly dependent?
    [CORRECT] $c_1 = 2, c_2 = -1$
    [ ] $c_1 = 0, c_2 = 1$
    [ ] $c_1 = 1, c_2 = 0$
    [ ] $c_1 = 1, c_2 = 1$
- Q: A system of equations becomes singular when one equation carries the same information as the others. Why is that the case?
    [ ] Dependence shrinks the size of the constants column
    [CORRECT] Repeated information makes those equations linearly dependent
    [ ] Singular systems are limited to a single variable
    [ ] Repeated information cancels the constant terms entirely
- Q: In $\mathbb{R}^2$, you are given three nonzero vectors: $\mathbf{a}$ points east, $\mathbf{b}$ points northwest, and $\mathbf{c}$ points exactly opposite to $\mathbf{a}$. Without any calculation, which statement about the set $\{\mathbf{a}, \mathbf{b}, \mathbf{c}\}$ must be true?
    [CORRECT] The set is linearly dependent because $\mathbf{a}$ and $\mathbf{c}$ lie on the same line through the origin, so one is a scalar multiple of the other.
    [ ] The set is linearly independent because all three vectors are nonzero and point in distinct directions in the plane.
    [ ] The set is linearly dependent because any three vectors in a two-dimensional space must always be dependent, regardless of their directions.
    [ ] The set is linearly independent because $\mathbf{b}$ points to a different quadrant than either $\mathbf{a}$ or $\mathbf{c}$, breaking any possible dependence relation.
- Q: Consider the vectors $\mathbf{v}_1 = \begin{bmatrix} 2 \\ -1 \\ 4 \end{bmatrix}$, $\mathbf{v}_2 = \begin{bmatrix} -6 \\ 3 \\ -12 \end{bmatrix}$, and $\mathbf{v}_3 = \begin{bmatrix} 1 \\ 0 \\ 5 \end{bmatrix}$. Which choice directly shows the set $\{ \mathbf{v}_1, \mathbf{v}_2, \mathbf{v}_3 \}$ is linearly dependent, using the formal definition?
    [CORRECT] There exist scalars $c_1, c_2, c_3$, not all zero, such that $c_1\mathbf{v}_1 + c_2\mathbf{v}_2 + c_3\mathbf{v}_3 = \mathbf{0}$.
    [ ] The vector $\mathbf{v}_2$ equals $-3\mathbf{v}_1$, so the determinant of the matrix formed by the three vectors must be zero.
    [ ] The set has three vectors in $\mathbb{R}^3$ and one is a multiple of another, so a nontrivial combination can only sum to a nonzero vector.
    [ ] Since $\mathbf{v}_3$ is not a scalar multiple of $\mathbf{v}_1$, the set must be linearly independent.

### Singularity and solvability of systems

- Q: A 2x2 matrix maps the entire plane onto a single line under its linear transformation. How is such a matrix classified?
    [ ] Non-singular, since a line is still infinite
    [ ] Invertible, since every point has an output
    [CORRECT] Singular, since its image no longer fills the plane
    [ ] Orthogonal, since lines stay straight
- Q: While solving a linear system by Gaussian elimination, a row reduces to all zeros, including a zero constant on the right. What does this imply about the system?
    [ ] It has exactly one solution
    [CORRECT] It has infinitely many solutions
    [ ] It has no solution
    [ ] It must be non-singular
- Q: While solving a linear system by Gaussian elimination, a row reduces to all zeros on the left but its right-hand constant is nonzero. What is the correct conclusion?
    [ ] The system has exactly one solution
    [ ] The system turns non-singular after back substitution
    [ ] The system has infinitely many solutions
    [CORRECT] The system has no solution
- Q: Whether a linear system is singular or non-singular does not depend on the constants on the right-hand side. Which feature of the system does determine it?
    [ ] Whether the solution values come out positive
    [ ] The determinant of the augmented matrix
    [ ] The magnitude of the constants column
    [CORRECT] The coefficient structure of the equations
- Q: In linear algebra, what makes a system of linear equations singular?
    [ ] It has strictly more unknown variables in it than it has equations
    [ ] It simply cannot be written down in any matrix or vector form at all
    [ ] Its right-hand-side constants all happen to be strictly nonzero ones
    [CORRECT] Its equations are linearly dependent, carrying redundant information
- Q: A square $3 \times 3$ matrix $A$ has row two equal to exactly three times row one. Without any other information, which statement must be true?
    [CORRECT] $A$ is singular because its rows are linearly dependent, making $\operatorname{rank}(A) < 3$.
    [ ] $A$ is invertible as long as row three is not a multiple of row one.
    [ ] $A$ is singular only if $\mathbf{b} = \mathbf{0}$ in the system $A\mathbf{x} = \mathbf{b}$.
    [ ] $A$ is invertible if the third row contains at least one nonzero entry.

