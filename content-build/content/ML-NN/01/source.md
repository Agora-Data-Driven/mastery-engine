# SOURCE PACK — Machine Learning / Neural Networks / Forward Propagation, Activations & Output Design

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Activations and Activation Functions   (23 questions)
2. ReLU Activation Function   (7 questions)
3. Why ReLU Is Preferred in Hidden Layers   (11 questions)
4. Choosing Activation Functions for Output Layers   (12 questions)
5. Binary Classification vs. Regression Output Design   (12 questions)
6. Forward Propagation   (16 questions)
7. Implementing Forward Propagation from Scratch   (9 questions)

## Covered by LATER lessons — do not teach these here

- Training Neural Networks: Loss Function vs. Cost Function, Binary Cross-Entropy, Backpropagation, Training Neural Networks in TensorFlow, Inference vs. Training in Neural Networks, Handwritten Digit Recognition with Neural Networks
- Neural Networks in TensorFlow: General Dense Layer Implementation, Efficient Neural Network Vectorization, TensorFlow Dense Layers, Building Neural Networks with TensorFlow Sequential
- Neural Network Foundations & Architecture: History of Neural Networks, Artificial Neurons vs. Biological Neurons, Neural Network Architecture, Input Layer, Hidden Layer, and Output Layer, Neural Network Layers as Logistic Units, Matrix Multiplication for Neural Networks, Neural Networks as Learned Feature Engineering, Why Neural Networks Work Well with Large Data, Neural Networks vs. Decision Trees

## The live quiz bank for these topics — 90 question(s)

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

### ReLU Activation Function

- Q: Which belief about ReLU is a misconception that should be avoided?
    [ ] It is a common and effective choice for hidden-layer units
    [ ] It outputs 0 for negative inputs and rises linearly for positive ones
    [CORRECT] It acts like a sigmoid, squashing every output into the range 0 to 1
    [ ] It is a widely used activation function in modern neural networks
- Q: In TensorFlow, how do you set a ReLU activation on a Dense layer?
    [CORRECT] activation="relu"
    [ ] activation="rectified"
    [ ] activation="max0"
    [ ] activation="sigmoid"
- Q: What does the abbreviation ReLU stand for?
    [ ] Reduced logistic update
    [CORRECT] Rectified linear unit
    [ ] Residual learning unit
    [ ] Regression lookup unit
- Q: Why can ReLU be a natural choice for the output unit in some regression tasks?
    [ ] It always converts its input into a valid probability
    [ ] It forces the predicted output to be exactly 0 or 1
    [CORRECT] It keeps outputs non-negative when the target cannot be negative
    [ ] It is the only activation that can process image inputs
- Q: What range of outputs can the ReLU activation function produce?
    [ ] Only values between 0 and 1
    [ ] Only strictly negative values
    [ ] Only whole-number integers
    [CORRECT] Zero or any positive value
- Q: Why do practitioners often prefer ReLU over sigmoid for hidden-layer activations?
    [CORRECT] It tends to let the network train faster
    [ ] It looks more elegant on a plot
    [ ] It forces the whole network to stay linear
    [ ] It outputs only negative values
- Q: Which activation function is the most common default choice for hidden layers in modern neural networks?
    [ ] Sigmoid
    [ ] Polynomial
    [CORRECT] ReLU
    [ ] Linear

### Why ReLU Is Preferred in Hidden Layers

- Q: What is one practical reason ReLU is emphasized as a good default for hidden layers?
    [CORRECT] It is simple to use and effective for building powerful networks
    [ ] It restricts every neuron's output to the range 0 to 1
    [ ] It makes the role of every individual neuron interpretable
    [ ] It removes the need to tune any hyperparameters at all
- Q: Defaulting to ReLU in hidden layers supports which broader principle about network design?
    [CORRECT] Hidden layers need nonlinearities so that depth adds modeling power
    [ ] Hidden layers should mirror the output layer's activation exactly
    [ ] Every task should constrain hidden layers to one fixed output range
    [ ] Backpropagation becomes unnecessary once ReLU units are used here
- Q: Why are linear activations a poor choice for the hidden layers of a network?
    [ ] They are simply far too slow to evaluate during model training
    [ ] They have a zero derivative, so the hidden layer cannot be trained
    [CORRECT] They collapse the network into plain linear or logistic regression
    [ ] They make the entire network overfit badly on every dataset given
- Q: What is the common rule of thumb for activations in the hidden layers of a network?
    [ ] Use linear activations throughout every hidden layer
    [ ] Use sigmoid in every hidden layer regardless of the task
    [ ] Use no activation function in the hidden layers
    [CORRECT] Use ReLU as the default activation in hidden layers
- Q: If every neuron in a large neural network used a linear activation, what would the network be unable to fit?
    [ ] Simple averages of the input features
    [CORRECT] Anything more complex than linear regression
    [ ] Straight lines through the input data
    [ ] Plain numerical (non-image) data
- Q: Compared with Sigmoid, why does ReLU tend to help hidden layers learn faster?
    [ ] It only functions when the inputs are stored as dense tensors
    [CORRECT] It is cheap to compute and stays non-flat for large positive z
    [ ] It maps every positive input value straight down to exactly zero
    [ ] It forces all of the hidden-unit weights to remain strictly negative
- Q: Which statement most accurately characterizes the influence of ReLU activation on the interpretability of *individual neuron roles* in deep network hidden layers?
    [ ] It significantly simplifies the process of understanding what each specific neuron detects or represents.
    [ ] It guarantees that every neuron will perform a uniquely isolated and easily human-understandable function or feature detection.
    [CORRECT] While it promotes sparsity, it does not reliably ensure strong, clear interpretability of individual neuron roles.
    [ ] Its non-negative output makes the precise computational contribution of any single neuron entirely self-evident to an observer.
- Q: Regarding ReLU in hidden layers, which belief is a misconception that should be avoided?
    [ ] Hidden layers generally benefit from a nonlinear activation
    [ ] Linear activations are usually a poor default for hidden layers
    [ ] It serves as a practical nonlinear default rather than a probability output
    [CORRECT] It is chosen because hidden layers are meant to output probabilities
- Q: Stacking hidden layers that all use linear activations defeats what?
    [ ] The requirement to collect training data
    [ ] The ability to run the Adam optimizer
    [ ] The ability to accelerate training on GPUs
    [CORRECT] The whole purpose of using a neural network
- Q: What is the common rule of thumb for choosing activation functions in hidden layers?
    [ ] Use a linear activation for every hidden unit
    [ ] Use no activation function in hidden layers
    [ ] Use a sigmoid activation for every hidden unit
    [CORRECT] Use ReLU as the default for hidden layers
- Q: What is a significant drawback of using linear activation functions in the hidden layers?
    [CORRECT] The whole network reduces to plain linear regression
    [ ] It blocks gradient descent from being applied
    [ ] It makes the network far too complex to train
    [ ] It restricts the network to 8x8 image inputs

### Choosing Activation Functions for Output Layers

- Q: In a regression problem where the target y can only be non-negative (e.g., a house price), which output-layer activation is recommended?
    [ ] Linear, since it can output any real value
    [ ] Tanh, since it restricts output to (-1, 1)
    [CORRECT] ReLU, since it can output only values >= 0
    [ ] Sigmoid, since it restricts output to (0, 1)
- Q: A data science team is building a neural network to predict customer lifetime value, where the target variable represents revenue and must be zero or positive. Which output-layer activation function should they choose?
    [CORRECT] ReLU
    [ ] Sigmoid
    [ ] Linear
    [ ] Tanh
- Q: When choosing an output-layer activation, which belief is a misconception that should be avoided?
    [ ] Sigmoid is the natural output choice for binary classification
    [CORRECT] One single output activation is always best for any task whatsoever
    [ ] The output design should reflect the target variable's value range
    [ ] Linear and ReLU can each fit different kinds of regression targets
- Q: What is the effect of using a linear activation g(z) = z in the output layer?
    [ ] The learning algorithm is guaranteed to diverge
    [ ] The network is converted into a classifier
    [ ] The output is forced into the range [0, 1]
    [CORRECT] The output can take any positive or negative value
- Q: For a binary classification problem, which activation function should the output layer use?
    [ ] ReLU, giving a non-negative score
    [ ] Linear, giving any real-valued score
    [ ] Softmax over the two raw class scores
    [CORRECT] Sigmoid, giving a probability in (0, 1)
- Q: Why does the best choice of output-layer activation depend on the target variable y?
    [ ] Because the chosen activation rewrites the dataset's labels
    [CORRECT] Because the activation's output range should match the values predicted
    [ ] Because each layer of a network must use a distinct activation
    [ ] Because the hidden layers fix the output type automatically
- Q: For a regression target y that must be non-negative, which output-layer activation is recommended?
    [ ] Step function
    [ ] Linear
    [CORRECT] ReLU
    [ ] Sigmoid
- Q: You are predicting tomorrow's stock price, which can be either positive or negative. Which output-layer activation is most appropriate?
    [ ] ReLU, clamping output to be non-negative
    [ ] Softmax across price buckets
    [CORRECT] Linear, allowing any positive or negative value
    [ ] Sigmoid, squashing output to (0, 1)
- Q: For a regression target y that can be either positive or negative, which output-layer activation is recommended?
    [ ] ReLU
    [CORRECT] Linear
    [ ] Softmax
    [ ] Sigmoid
- Q: Which output-layer activation is the natural default for binary classification?
    [ ] No activation at all
    [ ] ReLU
    [CORRECT] Sigmoid
    [ ] Linear
- Q: Why is Sigmoid the natural choice for the output unit in binary classification?
    [ ] It computes faster than ReLU at the output
    [CORRECT] Its output is a probability that y equals 1
    [ ] It works only with labels of 0 and 9
    [ ] It speeds up prediction at inference time
- Q: An engineer is designing a neural network to forecast daily temperature changes, which can be either positive or negative values. Which output-layer activation function is most appropriate for this regression task?
    [CORRECT] Linear
    [ ] ReLU
    [ ] Sigmoid
    [ ] Softmax

### Binary Classification vs. Regression Output Design

- Q: Why is a sigmoid activation a natural choice for the output of a binary classifier?
    [ ] It makes the overall network a purely linear function of its inputs
    [ ] It forces the output to be exactly 0 or exactly 1 with no values between
    [ ] It keeps the output unbounded so any real value is allowed
    [CORRECT] It squashes the output into the range 0 to 1, readable as a probability
- Q: For a regression target that can be either positive or negative, why is a linear output activation a sensible choice?
    [ ] Because regression outputs never use any activation function at all
    [CORRECT] Because a linear output can produce values of either sign without bound
    [ ] Because a linear output rounds every prediction to an integer
    [ ] Because a linear output predicts discrete class labels accurately
- Q: How does a multiclass classification problem differ from binary classification?
    [ ] It is solved with unsupervised learning
    [ ] It always requires fewer network layers
    [ ] It uses no target labels y at all
    [CORRECT] It predicts one of three or more categories
- Q: When would a ReLU activation be a sensible choice for a regression output rather than a linear one?
    [ ] When the task is actually binary classification in disguise
    [ ] When the model should be trained without any labels
    [CORRECT] When the target value is constrained to be non-negative
    [ ] When the loss must be computed inside the output unit
- Q: Which belief about choosing an output activation is a misconception to avoid?
    [ ] Binary classification and regression can call for different outputs
    [ ] The allowed range of the target value should inform the activation
    [CORRECT] The architecture alone fixes the activation, regardless of the range
    [ ] A sigmoid maps the output into a 0-to-1 probability-like value range
- Q: In TensorFlow, which loss function is recommended for multiclass classification with integer class labels?
    [ ] BinaryCrossentropy (two-class loss)
    [ ] MeanSquaredError (regression loss)
    [CORRECT] SparseCategoricalCrossentropy loss
    [ ] KLDivergence (distribution loss)
- Q: In a 10-class handwritten-digit recognition task, what does a Softmax output layer produce?
    [ ] A list of raw pixel intensity values
    [CORRECT] Ten probabilities that sum to 1
    [ ] A 2D matrix filled with zeros
    [ ] A single integer label from 0 to 9
- Q: A marketing team wants to predict the exact dollar amount a customer will spend on their next purchase, which could be any positive or negative value. Why would a linear activation be preferred over a sigmoid for the output layer?
    [CORRECT] Linear outputs can represent any real number
    [ ] Linear outputs train faster than sigmoid outputs
    [ ] Linear outputs prevent overfitting on small datasets
    [ ] Linear outputs require less computational power
- Q: A digital marketer is building a neural network to predict whether a user will click on an ad (click/no click). Which output layer design is most appropriate for this task?
    [CORRECT] A single neuron with a sigmoid activation
    [ ] A single neuron with a linear activation
    [ ] Ten neurons with a softmax activation
    [ ] A single neuron with a ReLU activation
- Q: How does the choice of output-layer activation typically differ between binary classification and regression in a neural network?
    [CORRECT] Classification often uses sigmoid; regression fits the target range
    [ ] Both tasks should reliably use a sigmoid output activation function
    [ ] Both tasks should reliably use a plain linear output activation
    [ ] Regression often uses sigmoid; classification fits the class count
- Q: How does multi-label classification differ from multi-class classification?
    [ ] It is restricted to ordinary single-variable linear regression tasks
    [ ] It relies on exactly one sigmoid output neuron for the whole network
    [CORRECT] It can attach several labels to one input (e.g., car and pedestrian)
    [ ] It is really just a disguised form of unsupervised cluster discovery
- Q: What is Softmax regression?
    [ ] A scheme for the lossy compression of large image files
    [ ] A statistical method for estimating a Gaussian's mean value
    [ ] A reinforcement-learning method for optimal policy control
    [CORRECT] A generalization of logistic regression to multiple classes

### Forward Propagation

- Q: In a network with layers indexed 1, 2, 3, why must activation a[1] be computed before a[2]?
    [ ] Because backprop runs between each pair
    [ ] Because bias b[2] is derived from a[1]
    [ ] Because a[1] is always initialized to zero
    [CORRECT] Because a[2] takes a[1] as its input
- Q: What is the primary purpose of applying an activation function such as sigmoid or ReLU during forward propagation?
    [ ] To compute the loss between output and target
    [ ] To update the weights as the model trains
    [CORRECT] To inject non-linearity into the model's output
    [ ] To rescale the input features into the 0-to-1 range
- Q: Why is computing activations through forward propagation often called "inference"?
    [CORRECT] Because it applies learned parameters to predict an output for a new input
    [ ] Because it does away with any need for a label y during the whole process
    [ ] Because it works backward to recover the full training set from the weights
    [ ] Because a person still has to step in and finalize each predicted answer
- Q: Why is forward propagation usually implemented with vectorized matrix operations instead of explicit Python for-loops over neurons?
    [ ] It removes the need to ever run backpropagation
    [CORRECT] Vectorized math runs far faster on CPUs and GPUs
    [ ] For-loops cannot evaluate ReLU activations at all
    [ ] It cuts the number of parameters the model needs
- Q: What does f(x) denote in the neural-network setting?
    [ ] The activation function applied at a neuron
    [ ] The training loss on a single example
    [ ] The count of hidden units in the network
    [CORRECT] The output the network computes as a function of x
- Q: Inside a single neuron during forward propagation, what are the two computations performed, in order?
    [ ] Add the weights, then subtract the bias term
    [CORRECT] Compute weights·inputs + bias, then apply g(z)
    [ ] Pick one weight at random, then scale the input
    [ ] Differentiate the input, then apply a sigmoid
- Q: In what order are the layers evaluated during forward propagation?
    [CORRECT] From the input layer through the hidden layers to the output layer
    [ ] From the output layer working backward toward the original input layer
    [ ] Every layer simultaneously computes all of its outputs in one step
    [ ] From the leaf nodes upward through the branches to a single root node
- Q: Which statement about forward propagation is a confusion that should be avoided?
    [CORRECT] It is the same as the algorithm that adjusts the weights
    [ ] It proceeds from the input layer to the output layer
    [ ] It computes the layer activations one layer at a time
    [ ] It is the inference pass using the current parameters
- Q: During forward propagation, how is the activation of the input layer a[0] typically defined?
    [ ] As a vector filled with ones
    [ ] As the weight matrix W[1]
    [CORRECT] As the feature vector x
    [ ] As the final prediction y-hat
- Q: In a neural network during forward propagation, what is the primary source or characteristic of the bias vector $b^{[l]}$ for a given layer $l$?
    [ ] It is directly computed from the output activations $a^{[l-1]}$ of the prior layer.
    [CORRECT] It is a set of fixed, learnable parameters for that specific layer.
    [ ] It is always initialized as a vector of zeros and remains constant.
    [ ] It is a dynamic value adjusted based on the initial input features $X$.
- Q: Why is forward propagation given that name?
    [ ] It always increases the value of the network's output
    [ ] It is used solely to predict future time steps
    [CORRECT] Activations are passed from earlier layers to later ones
    [ ] It can only run after backpropagation has finished
- Q: In a handwritten-digit classifier, what does the final forward-propagation output $a^{[3]}$ represent?
    [ ] The intensity value of the 64th image pixel
    [ ] The total of all weights in the third layer
    [CORRECT] The predicted probability the image is that digit
    [ ] A fixed vector consisting of zeros and ones
- Q: What is forward propagation in a neural network?
    [ ] The updating of the weights using computed gradients
    [ ] The evaluation of only the regularization penalty term
    [ ] The random shuffling of the training set each epoch
    [CORRECT] The input-to-output computation of each layer's activations
- Q: During forward propagation, what serves as the input to Layer 2?
    [ ] The ground-truth label y for the example
    [ ] A freshly generated set of random numbers
    [CORRECT] The output activation vector of Layer 1
    [ ] The original input feature vector x
- Q: What is the core purpose of the forward propagation algorithm in a neural network?
    [CORRECT] To produce predictions or inferences from an input
    [ ] To attach the correct labels to the training images
    [ ] To compute the gradients of the cost function
    [ ] To update the network's weights w and biases b
- Q: In a three-hidden-layer digit classifier, what computation order does forward propagation follow?
    [ ] y to x to loss
    [ ] a3 to a2 to a1 to x
    [CORRECT] x to a1 to a2 to a3
    [ ] w to b to x

### Implementing Forward Propagation from Scratch

- Q: If you implement forward propagation for a layer of 3 units in plain Python, what would you use to hold the layer's final activations?
    [ ] A text string built up from the pixel values
    [ ] A single floating-point number value
    [ ] A Python list of the raw pixel intensities
    [CORRECT] A NumPy array holding the 3 activation values
- Q: In a single neural network layer, how is the activation of one unit computed by hand?
    [CORRECT] Dot the weights $w$ with the input $a_{in}$, add bias $b$, then apply the activation
    [ ] Use a for loop to count how many of the input pixels are nonzero
    [ ] Add together all of the weight values that appear anywhere in that layer
    [ ] Take the arithmetic average of all of the input values to the layer
- Q: Why is understanding a from-scratch implementation useful in practice?
    [ ] It makes backpropagation no longer necessary
    [CORRECT] It helps you reason about what the library does underneath
    [ ] It guarantees hand-written code outruns TensorFlow
    [ ] It removes the need for matrix operations
- Q: In the code for a single layer's forward pass, what does $a_{\text{in}}$ represent?
    [ ] The final output produced by the entire network
    [CORRECT] The activation vector coming from the previous layer
    [ ] The true target label $y$ for the current example
    [ ] The count of neurons present in the current layer
- Q: In a hand-built dense layer, what does the loop over units do?
    [CORRECT] It computes each neuron's activation one at a time
    [ ] It ranks the input features by importance
    [ ] It rescales every weight to equal one
    [ ] It changes how many training examples there are
- Q: Why is it worthwhile to learn how to implement forward propagation from scratch?
    [ ] It is a strict requirement listed for every machine learning job opening
    [ ] It demonstrates why TensorFlow should essentially never be used
    [CORRECT] It builds intuition for what libraries do inside and helps with debugging
    [ ] It is needed in order to design graphics processing unit hardware
- Q: When computing a unit's activation by hand, what does the quantity z represent before the activation function is applied?
    [CORRECT] The weighted sum of the inputs plus the bias
    [ ] The cost incurred by the prediction error
    [ ] The final predicted output value of the unit
    [ ] The learning rate used during model training
- Q: Why implement forward propagation by hand even though TensorFlow can do it for you?
    [CORRECT] To build intuition and make debugging easier
    [ ] To eliminate the need for activation functions
    [ ] To replace TensorFlow in all production work
    [ ] To prove that ML libraries are unnecessary
- Q: In a from-scratch forward pass, what does a dense function compute?
    [ ] The L2 regularization constant that scales the layer's weights
    [ ] The Adam optimizer's adaptive per-parameter learning rate value
    [ ] The total prediction cost summed over the whole training dataset
    [CORRECT] This layer's activations from the prior layer and its parameters

