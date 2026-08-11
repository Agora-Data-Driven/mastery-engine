# SOURCE PACK — Mathematics / Calculus / 06 Calculus in Neural Networks

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Activations and Activation Functions   (23 questions)
2. Computational graphs and the Chain Rule in graphs   (5 questions)
3. Backpropagation algorithm math   (5 questions)

## Already taught earlier in this course

- Estimating limits and one-sided limits
- Limits by direct substitution, factoring, and conjugates
- The Squeeze Theorem
- Limits of trigonometric functions
- Types of discontinuities
- Intermediate Value Theorem (IVT)
- Derivative as slope and rate of change
- Derivative rules (Power rule, Product, Quotient)
- Derivatives of sin(x) and cos(x)
- Chain Rule and Implicit differentiation
- Higher-order derivatives and Second derivatives
- Tangent lines and linear approximations
- Optimization and Related rates
- Square loss and log loss functions
- Riemann sums (Left, Right, Midpoint, Trapezoidal)
- Definite integrals and the Fundamental Theorem of Calculus
- Antiderivatives and Indefinite integrals
- Reverse Power Rule
- Indefinite integrals of ex,1/x,sin, and cos
- u-substitution
- Area between curves
- Functions of several variables
- Partial derivatives and the Gradient vector
- Directional derivatives
- Higher-order derivatives and the Hessian matrix
- Gradients of cost functions (e.g., Mean Squared Error)
- Introduction to Gradient Descent
- Learning rate and convergence
- Newton's Method for optimization

## The live quiz bank for these topics — 33 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Activations and Activation Functions

- Q: What happens if every neuron in a deep network uses a linear activation function?
    [ ] The network automatically turns itself into a binary classifier
    [CORRECT] The whole network collapses to an equivalent single linear model
    [ ] The hidden layers quietly stop multiplying inputs by their weights
    [ ] The network gains strictly more expressive representational power
- Q: Which activation function is defined by the rule max(0, z)?
    [ ] Sigmoid
    [CORRECT] ReLU
    [ ] Soft threshold
    [ ] Linear (identity)
- Q: Using $g$ for the activation function, $W$ and $b$ for a layer's weights and bias, what is the standard formula for the activation vector $a^{[l]}$ of layer $l$ in terms of $a^{[l-1]}$?
    [ ] $a^{[l]} = W^{[l]} + a^{[l-1]}$
    [ ] $a^{[l]} = g(W^{[l]} / b^{[l]})$
    [ ] $a^{[l]} = \max(W^{[l]}, a^{[l-1]})$
    [CORRECT] $a^{[l]} = g(W^{[l]} \cdot a^{[l-1]} + b^{[l]})$
- Q: In a multi-layer neural network, which notation represents the output activation vector of the second layer?
    [ ] $a_2$
    [CORRECT] $a^{[2]}$
    [ ] $z_2$
    [ ] $f^{[2]}$
- Q: Which output-layer activation is most appropriate for multi-class classification where each input belongs to exactly one of several mutually exclusive classes?
    [ ] ReLU
    [CORRECT] Softmax
    [ ] Logistic sigmoid
    [ ] Linear (identity)
- Q: A colleague claims that training a neural network to perfectly copy the human brain is the most direct path to building powerful AI. Based on the current understanding of neuroscience, why is this approach unlikely to succeed?
    [CORRECT] Our knowledge of how the brain works is still very limited
    [ ] Biological neurons are too slow to simulate accurately
    [ ] Artificial networks require more data than brains
    [ ] Computer hardware cannot handle biological complexity
- Q: In the context of a single neuron, what does the term "activation" refer to?
    [ ] The act of powering on the computer that runs it
    [ ] The number of training iterations completed so far
    [CORRECT] How strongly the neuron sends output to neurons downstream
    [ ] The total number of parameters w and b in the neuron
- Q: What is an activation in a neural network?
    [ ] The particular learning rate that gets assigned to one given layer
    [ ] A stored internal copy of the training example's true target label
    [CORRECT] A neuron's output value after its activation function is applied
    [ ] The total count of the individual units contained within a layer
- Q: Which activation function is defined by the expression f(x) = max(0, x), outputting x when x is positive and 0 otherwise?
    [CORRECT] Rectified linear unit (ReLU)
    [ ] Logistic sigmoid
    [ ] Leaky rectified linear unit
    [ ] Hyperbolic tangent (tanh)
- Q: If every layer of a deep neural network uses only a linear (identity) activation, what is the effective expressive power of the whole model?
    [CORRECT] It behaves as a single linear transformation
    [ ] It can approximate any non-linear function
    [ ] It doubles its parameter count automatically
    [ ] It turns into an unsupervised clustering model
- Q: A team is building a neural network to predict whether customers will click on an ad. They are deciding between using a large neural network or a simpler logistic regression model. Based on how these algorithms scale with data, which outcome should they expect as they collect more customer interaction data?
    [ ] The logistic regression model will keep improving indefinitely as more data is added
    [CORRECT] The large neural network will continue to improve while logistic regression plateaus
    [ ] Both models will show identical performance improvements with additional data
    [ ] The logistic regression model will eventually outperform the neural network
- Q: Why are nonlinear activation functions important in neural networks?
    [ ] They remove the need for any learnable parameters
    [CORRECT] They let the network model patterns a plain linear map cannot
    [ ] They force all of the network's outputs to be binary
    [ ] They keep every layer linear to simplify the math
- Q: A data scientist wants to build a model that keeps improving as they collect more digital records from their online platform. Why would they choose a large neural network over linear regression?
    [CORRECT] Large networks can take effective advantage of massive datasets
    [ ] Neural networks require less computational power to train
    [ ] Linear regression cannot process more than a few features
    [ ] Neural networks are always faster to train than regression
- Q: A marketing team is deciding between a traditional logistic regression model and a large neural network for predicting customer behavior. They have a massive dataset that keeps growing. Which outcome should they expect as they feed more data to each algorithm?
    [CORRECT] The neural network performance will continue to improve
    [ ] The logistic regression will eventually outperform the network
    [ ] Both algorithms will plateau at the same performance level
    [ ] The neural network will overfit and degrade rapidly
- Q: What was the original motivation for inventing neural networks?
    [CORRECT] To write software that mimics how the biological brain learns
    [ ] To create faster algorithms for processing big data
    [ ] To solve problems that decision trees cannot handle
    [ ] To replace traditional statistical methods entirely
- Q: An engineer downloads a neural network with pre-trained parameters from the internet and uses it to make predictions on new data without any further training. What is this process called?
    [CORRECT] Inference
    [ ] Training
    [ ] Backpropagation
    [ ] Optimization
- Q: Why are non-linear activation functions placed between the hidden layers of a neural network?
    [CORRECT] They let stacked layers model non-linear relationships
    [ ] They speed up matrix multiplication on a GPU
    [ ] They keep the weight values from ever reaching zero
    [ ] They lower the memory needed to store the weights
- Q: Which statement about activation functions is true?
    [ ] The sigmoid is the only activation function any neural network can use
    [ ] Activation functions are applied only to units within the input layer
    [CORRECT] Functions other than sigmoid can be used to make a network more powerful
    [ ] Activation functions are what hand-engineer the input features of the data
- Q: Which activation function squashes its input to an output strictly between 0 and 1?
    [ ] Linear (identity)
    [ ] ReLU
    [ ] Dot product
    [CORRECT] Sigmoid
- Q: What is the name of the function g (such as the sigmoid) that produces a neuron's activation value?
    [ ] The prediction function
    [ ] The loss function
    [ ] The cost function
    [CORRECT] The activation function
- Q: An output-layer neuron produces an activation of 0.84. To turn this into a binary prediction of 1 or 0, what should you do?
    [CORRECT] Threshold the activation at 0.5
    [ ] Multiply the activation by two
    [ ] Round the activation to the nearest ten
    [ ] Switch the activation function to ReLU
- Q: When constructing a deep neural network for image classification, why is the ReLU activation function often preferred over sigmoid for hidden layers?
    [ ] ReLU outputs are bounded between 0 and 1, preventing gradient explosions.
    [CORRECT] ReLU reduces vanishing gradients by having a constant derivative of 1 for positive inputs.
    [ ] Sigmoid outputs are zero-centered, causing unstable gradient updates during training.
    [ ] Sigmoid can produce negative activations that permanently deactivate neurons.
- Q: An engineer is designing a neural network for image recognition. They want to understand why neural networks have become so much more powerful in recent years compared to earlier decades. What is the primary reason modern neural networks can achieve better performance on many applications?
    [ ] Neural networks now perfectly mimic how biological neurons actually function
    [ ] The algorithms themselves have fundamentally changed to work like the human brain
    [ ] Researchers have discovered exactly how the brain processes visual information
    [CORRECT] The amount of digital data available has grown and neural networks scale with it

### Computational graphs and the Chain Rule in graphs

- Q: During backpropagation through a computational graph, why are intermediate derivatives stored once they have been computed?
    [ ] Because saved derivatives can alter the network's connection structure
    [CORRECT] Because reusing them avoids recomputing the same quantities repeatedly
    [ ] Because caching them somehow guarantees reaching a global minimum loss
    [ ] Because storing them removes any need to pick a learning rate at all
- Q: Consider a computational graph where a variable $x$ affects the output $f$ through two independent paths: path 1 is $x \to y_1 \to f$, and path 2 is $x \to y_2 \to f$. The local partial derivatives are given along each edge. According to the chain rule on graphs, which expression gives the total derivative $\frac{\partial f}{\partial x}$?
    [CORRECT] $\frac{\partial f}{\partial x} = \frac{\partial f}{\partial y_1} \cdot \frac{\partial y_1}{\partial x} + \frac{\partial f}{\partial y_2} \cdot \frac{\partial y_2}{\partial x}$
    [ ] $\frac{\partial f}{\partial x} = \frac{\partial f}{\partial y_1} \cdot \frac{\partial y_1}{\partial x} \cdot \frac{\partial f}{\partial y_2} \cdot \frac{\partial y_2}{\partial x}$
    [ ] $\frac{\partial f}{\partial x} = \left(\frac{\partial f}{\partial y_1} + \frac{\partial f}{\partial y_2}\right) \cdot \left(\frac{\partial y_1}{\partial x} + \frac{\partial y_2}{\partial x}\right)$
    [ ] $\frac{\partial f}{\partial x} = \frac{\partial f}{\partial y_1} \cdot \frac{\partial f}{\partial y_2} + \frac{\partial y_1}{\partial x} \cdot \frac{\partial y_2}{\partial x}$
- Q: In a neural network's computational graph, the local derivative at each small step is usually easy to compute because each step is typically what kind of function?
    [ ] Either a determinant or an inverse
    [ ] Either a logarithm or a square root
    [CORRECT] Either a sigmoid or a linear function
    [ ] Either a tangent plane or a Hessian
- Q: In a computational graph, a derivative such as ∂L/∂w is computed as a product of several simpler derivatives. What justifies expressing it this way?
    [CORRECT] Because the variables form a chain of dependence from w to L
    [ ] Because partial derivatives can only be taken two at a time
    [ ] Because every loss function is quadratic in its inputs
    [ ] Because weights are always multiplied by biases
- Q: In a computational graph, a weight $w$ influences the loss along the path $w \to z \to \hat{y} \to L$. How is $\frac{\partial L}{\partial w}$ obtained from the local derivatives along this path?
    [CORRECT] Multiply $\frac{\partial z}{\partial w}$, $\frac{\partial \hat{y}}{\partial z}$, and $\frac{\partial L}{\partial \hat{y}}$ together
    [ ] Add $\frac{\partial z}{\partial w}$, $\frac{\partial \hat{y}}{\partial z}$, and $\frac{\partial L}{\partial \hat{y}}$ together
    [ ] Subtract $\frac{\partial L}{\partial \hat{y}}$ from $\frac{\partial z}{\partial w}$
    [ ] Multiply only the first and the last local derivative

### Backpropagation algorithm math

- Q: Suppose $L$ depends on $\hat{y}$, $\hat{y}$ on $z$, $z$ on $a_1$, $a_1$ on $z_1$, and $z_1$ on the weight $w_{11}$. By the chain rule, $\frac{\partial L}{\partial w_{11}}$ is expressed as:
    [ ] just the final derivative $\frac{\partial z_1}{\partial w_{11}}$
    [ ] just the first derivative $\frac{\partial L}{\partial \hat{y}}$
    [CORRECT] the product of the five derivatives along the dependency chain
    [ ] the sum of the five derivatives along the dependency chain
- Q: Why does backpropagation rely so heavily on the chain rule of calculus?
    [ ] Because every layer's output stays independent of all the other layers
    [CORRECT] Because each weight affects the loss through many intermediate variables
    [ ] Because backpropagation entirely ignores the network's activation functions
    [ ] Because the chain rule is required only to differentiate logarithm terms
- Q: Why does backpropagation scale well to deeper networks with many layers?
    [ ] Because a deeper network ends up having far fewer parameters to adjust later
    [ ] Because stacking more layers removes the need for any bias terms
    [ ] Because deeper networks no longer need any loss function to train
    [CORRECT] Because one chain-rule computation is reused layer by layer per weight
- Q: For a sigmoid output a = sigmoid(z), what is its local derivative da/dz used during backpropagation?
    [ ] a
    [CORRECT] a(1 - a)
    [ ] 1/a
    [ ] z(1 - z)
- Q: What is the main purpose of the backpropagation algorithm in training a neural network?
    [CORRECT] To compute the gradient of the loss for every weight and bias to be updated
    [ ] To replace gradient descent with a purely random search over weight settings
    [ ] To force all neurons within a single layer to share one common weight value
    [ ] To choose how many layers and neurons the network should automatically contain

