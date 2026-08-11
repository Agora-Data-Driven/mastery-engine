# SOURCE PACK — Mathematics / Precalculus / 07 Matrices

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Matrix arithmetic (Addition, Subtraction, Scalar Multiplication)   (5 questions)
2. Matrix multiplication and properties   (5 questions)
3. Inverses and solving systems with matrices   (4 questions)
4. Matrices as transformations of the plane   (5 questions)

## Already taught earlier in this course

- Composing functions and modeling
- Invertible functions and restricting domains
- Verifying inverse functions
- Special trig values and identities on the unit circle
- Angle addition identities
- Inverse trigonometric functions
- Laws of sines and cosines
- Sinusoidal equations and models
- The complex plane (Distance, Midpoint, Conjugates)
- Modulus and argument
- Polar form of complex numbers
- Multiplying/Dividing complex numbers in polar form
- The Fundamental Theorem of Algebra
- Advanced rational expression arithmetic
- End behavior and discontinuities (Asymptotes)
- Graphs of rational functions
- Introduction to ellipses and hyperbolas
- Foci, vertices, and equations of conics
- Vector components, magnitude, and direction
- Scalar multiplication, addition, and subtraction
- Vector word problems

## Covered by LATER lessons — do not teach these here

- 08 Probability and combinatorics: Venn diagrams and addition/multiplication rules, Permutations and combinations, Discrete random variables and Expected Value
- 09 Series: Summation notation, Arithmetic and Geometric series, The Binomial Theorem
- 10 Limits and continuity: Defining and estimating limits (Graphs and Tables), Limit properties and algebraic manipulation, Continuity and the Intermediate Value Theorem

## The live quiz bank for these topics — 19 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Matrix arithmetic (Addition, Subtraction, Scalar Multiplication)

- Q: What does multiplying a matrix by a scalar k do to the matrix?
    [CORRECT] Multiplies every entry of the matrix by k
    [ ] Adds k to every entry of the matrix
    [ ] Scales only the entries on the main diagonal
    [ ] Interchanges the rows with the columns
- Q: Compute the sum [[1,2],[3,4]] + [[2,0],[-1,5]].
    [CORRECT] [[3,2],[2,9]]
    [ ] [[3,0],[2,9]]
    [ ] [[1,2],[-3,9]]
    [ ] [[2,2],[3,20]]
- Q: Under what condition is the sum of two matrices A + B defined?
    [ ] Only when both matrices are square
    [CORRECT] Only when A and B have identical dimensions
    [ ] For any two matrices, without restriction
    [ ] Only when their determinants are equal
- Q: Compute the difference [[4,1],[0,3]] - [[2,-1],[5,1]].
    [ ] [[6,0],[-5,4]]
    [ ] [[2,2],[5,2]]
    [ ] [[2,0],[5,2]]
    [CORRECT] [[2,2],[-5,2]]
- Q: Compute the scalar multiple 2[[1,-3],[4,0]].
    [CORRECT] [[2,-6],[8,0]]
    [ ] [[2,-3],[4,0]]
    [ ] [[2,6],[8,0]]
    [ ] [[1,-6],[8,0]]

### Matrix multiplication and properties

- Q: Which property generally fails to hold for matrix multiplication?
    [CORRECT] Commutativity (AB equals BA)
    [ ] Distributivity over matrix addition
    [ ] Associativity (A(BC) equals (AB)C)
    [ ] Existence of a multiplicative identity
- Q: For which matrices A and B is the product AB defined?
    [ ] When both A and B are square matrices
    [ ] For any pair of matrices, without restriction
    [CORRECT] When the column count of A equals the row count of B
    [ ] When A and B have the same number of rows
- Q: If A is a $2 \times 3$ matrix and B is a $3 \times 4$ matrix, what are the dimensions of the product $AB$?
    [ ] $4 \times 2$
    [ ] $3 \times 3$
    [CORRECT] $2 \times 4$
    [ ] $2 \times 3$
- Q: Compute the product [[1,0],[2,1]] [[3,4],[5,6]].
    [ ] [[3,4],[7,10]]
    [ ] [[3,0],[6,6]]
    [ ] [[8,10],[5,6]]
    [CORRECT] [[3,4],[11,14]]
- Q: Compute the product [[1,2],[0,1]] [[3],[4]].
    [ ] [[8],[4]]
    [ ] [[3],[6]]
    [CORRECT] [[11],[4]]
    [ ] [[11],[1]]

### Inverses and solving systems with matrices

- Q: What is the inverse of the $2 \times 2$ identity matrix $\begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}$?
    [ ] It has no inverse
    [CORRECT] $\begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}$
    [ ] $\begin{pmatrix} -1 & 0 \\ 0 & -1 \end{pmatrix}$
    [ ] $\begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}$
- Q: Solve the system x + y = 5 and x - y = 1 for x and y.
    [CORRECT] x = 3, y = 2
    [ ] x = 1, y = 4
    [ ] x = 4, y = 1
    [ ] x = 2, y = 3
- Q: What is the determinant of the $2 \times 2$ matrix [[a,b],[c,d]]?
    [ ] $ab - cd$
    [ ] $a + d - b - c$
    [ ] $ad + bc$
    [CORRECT] $ad - bc$
- Q: In the matrix equation $AX = B$, why does left-multiplying both sides by $A^{-1}$ isolate $X$?
    [ ] Because $B$ is converted into the identity
    [ ] Because any two matrices commute
    [CORRECT] Because $A^{-1} A$ equals the identity matrix
    [ ] Because inverses cancel matrix addition

### Matrices as transformations of the plane

- Q: Geometrically, what does a $2 \times 2$ matrix acting on column vectors represent?
    [ ] A fixed lookup table of precomputed probability values
    [ ] The complex conjugate of one single given complex number
    [ ] A single polynomial equation in one single real variable
    [CORRECT] A linear transformation acting on vectors in the plane
- Q: Apply the matrix [[2,0],[0,2]] to the vector <1,3>.
    [ ] <1,6>
    [CORRECT] <2,6>
    [ ] <3,6>
    [ ] <2,3>
- Q: As a transformation of the plane, what does the $2 \times 2$ identity matrix do to every vector?
    [ ] Scales each vector by a factor of 2
    [CORRECT] Leaves every vector unchanged
    [ ] Reflects each vector across the x-axis
    [ ] Rotates each vector by 90 degrees
- Q: What is the effect of the matrix [[1,0],[0,-1]] on a vector <x,y>?
    [ ] It returns <2x,2y>
    [ ] It returns <y,x>
    [ ] It returns <-x,y>
    [CORRECT] It returns <x,-y>
- Q: Which matrix sends every vector <x,y> to <y,x> (swapping its coordinates)?
    [CORRECT] [[0,1],[1,0]]
    [ ] [[1,0],[0,1]]
    [ ] [[1,0],[0,-1]]
    [ ] [[-1,0],[0,1]]

