# SOURCE PACK — Machine Learning / Neural Networks / Neural Networks in TensorFlow

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. General Dense Layer Implementation   (20 questions)
2. Efficient Neural Network Vectorization   (12 questions)
3. TensorFlow Dense Layers   (15 questions)
4. Building Neural Networks with TensorFlow Sequential   (41 questions)

## Already taught earlier in this course

- Activations and Activation Functions
- ReLU Activation Function
- Why ReLU Is Preferred in Hidden Layers
- Choosing Activation Functions for Output Layers
- Binary Classification vs. Regression Output Design
- Forward Propagation
- Implementing Forward Propagation from Scratch
- Loss Function vs. Cost Function
- Binary Cross-Entropy
- Backpropagation
- Training Neural Networks in TensorFlow
- Inference vs. Training in Neural Networks
- Handwritten Digit Recognition with Neural Networks

## Covered by LATER lessons — do not teach these here

- Neural Network Foundations & Architecture: History of Neural Networks, Artificial Neurons vs. Biological Neurons, Neural Network Architecture, Input Layer, Hidden Layer, and Output Layer, Neural Network Layers as Logistic Units, Matrix Multiplication for Neural Networks, Neural Networks as Learned Feature Engineering, Why Neural Networks Work Well with Large Data, Neural Networks vs. Decision Trees

## The live quiz bank for these topics — 88 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### General Dense Layer Implementation

- Q: When stacking dense layers manually, what should be passed as $a_{in}$ to the second layer's computation?
    [ ] The original raw input features $X$ fed into the network
    [ ] The target labels $Y$ associated with the training set
    [CORRECT] The activation output $a_{out}$ produced by the first layer
    [ ] The weight matrix $W$ that the first layer has learned
- Q: What does a dense function return?
    [CORRECT] The activations of the current layer
    [ ] The decision boundary equation
    [ ] The original input passed through unchanged
    [ ] The complete training history
- Q: How does the bias vector $b$ relate to the neurons in a dense-layer implementation?
    [ ] Vector $b$ must match the shape of input $a_{in}$
    [ ] Only the first and last neurons receive a bias
    [ ] One single bias value is shared by all neurons
    [CORRECT] Each neuron $j$ has its own scalar bias $b[j]$
- Q: A for-loop helps explain a dense layer, but why are vectorized operations such as np.matmul preferred in production?
    [ ] They remove the need for any activation functions
    [ ] They force all of the learned weights to be positive
    [ ] They make the code longer and more explicit
    [CORRECT] They greatly speed up and streamline the computation
- Q: In a manual dense layer, why is each column of the weight matrix W pulled out separately?
    [ ] Columns are only needed during backpropagation
    [ ] Each column stores one training example
    [CORRECT] Each column holds the parameter vector for one unit
    [ ] Each column is a label from the dataset
- Q: Inside a per-neuron loop, which expression correctly computes the scalar $z$ for neuron $j$ (weights $w$, input $a_{\text{in}}$, bias $b$) before the activation is applied?
    [ ] $z = \text{np.sum}(w + a_{\text{in}}) \times b_j$
    [ ] $z = w \times a_{\text{in}} \times b_j$
    [ ] $z = \text{np.dot}(W, b) + a_{\text{in}}$
    [CORRECT] $z = \text{np.dot}(w, a_{\text{in}}) + b_j$
- Q: Why does a vectorized dense layer using np.matmul give the same result as looping neuron-by-neuron?
    [ ] A bias vector can be added solely through matrix products
    [ ] The explicit for-loop only works for linear activations
    [CORRECT] Matmul computes every neuron's weighted sum in one operation
    [ ] NumPy arrays cannot support plain scalar addition
- Q: In a dense-layer implementation where W is the weight matrix with one column per neuron, what does W.shape[0] count?
    [CORRECT] The number of inputs arriving from the previous layer
    [ ] The number of neurons (units) in the current layer
    [ ] The total parameter count, biases included
    [ ] The number of training examples in the current batch
- Q: What is the core computation performed by a single dense layer?
    [CORRECT] A dot product plus bias, then an activation function
    [ ] A cost average followed by a regularization term
    [ ] A random sample followed by a threshold
    [ ] A cluster assignment followed by normalization
- Q: A dense layer's weight matrix W is stored so that each column holds the weights for one unit. How can the number of units in the layer be read directly from W?
    [ ] It equals the number of rows of W
    [ ] It cannot be recovered from W alone
    [ ] It equals the sum of all entries of W
    [CORRECT] It equals the number of columns of W
- Q: In a from-scratch Python implementation of a single dense layer, what is the role of the for loop that iterates over the units?
    [CORRECT] It computes the activation of each unit in the layer in turn
    [ ] It steps through the training examples one at a time
    [ ] It accumulates the total cost J across the dataset
    [ ] It searches for the global minimum of the gradient
- Q: Why is a dense layer routine described as a "general" implementation?
    [ ] It drops the activation and computes only a raw linear map
    [ ] It works only on the output layer, never on the hidden ones
    [ ] It runs correctly on just one specific small toy dataset
    [CORRECT] It captures the layer's computation pattern for any input
- Q: If the input vector $a_{\text{in}}$ has $10$ features and the dense layer has $5$ units, what is the shape of the weight matrix $W$ when each column holds one unit's weights?
    [ ] $(10, 10)$
    [ ] $(5, 10)$
    [CORRECT] $(10, 5)$
    [ ] $(5, 5)$
- Q: In a manual dense-layer implementation, what must be applied to the linear value z to produce a neuron's final activation a[j]?
    [ ] The transpose of the layer's weight matrix
    [ ] The overall cost function J of the network
    [CORRECT] An activation function such as sigmoid or ReLU
    [ ] The gradient descent parameter update rule
- Q: Which statement about a manual dense function is a misunderstanding to avoid?
    [ ] Its computed activation output can be passed into the next layer
    [CORRECT] It is a fundamentally different algorithm from any Dense layer
    [ ] The very same routine can be reused across many network layers
    [ ] It relies on the layer's own weight matrix and its bias terms
- Q: When computing a single neuron's activation $a_j$ by hand, what is the correct order of operations?
    [ ] Add $a_{\text{in}}$ to $b_j$, then multiply that result by the weights $w$
    [CORRECT] Dot $w$ with $a_{\text{in}}$, add the bias $b_j$, then apply the activation
    [ ] Sum the weights in $w$, then divide by the number of units
    [ ] Apply the activation to $w$, then multiply by $a_{\text{in}}$ and add $b_j$
- Q: Inside the loop 'for j in range(units)', the statement 'w = W[:,j]' is executed. What does this statement do?
    [ ] It extracts row j of W, the inputs to unit j
    [ ] It returns the dot product across all columns
    [CORRECT] It extracts column j of W, the weights for unit j
    [ ] It zeros out every weight stored in W
- Q: A general dense-layer function is given the input activations '$a_{\text{in}}$' together with the layer's weights $W$ and bias $b$. What does the function return?
    [ ] The final scalar cost $J$ for the network
    [ ] A scatter plot visualizing the input data
    [ ] The unchanged weight matrix $W$ it was passed
    [CORRECT] The layer's output activation vector '$a_{\text{out}}$'
- Q: A dense layer takes an input vector $a_{\text{in}}$ of length 10 and has 5 neurons. Under the convention $W[:, j]$ holds neuron $j$'s weights, what is the shape of the weight matrix $W$?
    [ ] 5 rows and 10 columns
    [ ] 10 rows and 10 columns
    [CORRECT] 10 rows and 5 columns
    [ ] 5 rows and 5 columns
- Q: Just before the unit-by-unit loop in a dense layer, the line 'a = np.zeros(units)' runs. Why is this line needed?
    [CORRECT] To preallocate an output array sized to hold each of the unit activations
    [ ] To reset all of the model parameters that were already learned back to zero
    [ ] To fill in any missing or invalid entries in the input feature vector
    [ ] To shrink the learning rate down to zero just before the updates begin

### Efficient Neural Network Vectorization

- Q: What hardware benefit does vectorized neural-network code provide?
    [ ] It avoids all floating-point arithmetic and saves compute
    [ ] It requires specialized neuromorphic spiking hardware to run
    [CORRECT] It runs matrix multiplications efficiently on CPUs and GPUs
    [ ] It accelerates only very small models, never larger ones
- Q: Why is vectorization important for implementing neural networks?
    [ ] It removes the need for activation functions
    [CORRECT] It enables efficient matrix operations on modern hardware
    [ ] It turns classification problems into regression
    [ ] It guarantees the model will not overfit
- Q: A digital marketer is deciding whether to use a traditional algorithm like logistic regression or a neural network for a new customer behavior prediction task. Based on the performance trends described, which approach is most likely to improve as the amount of available customer data grows very large?
    [CORRECT] A neural network with a large number of neurons
    [ ] Logistic regression trained on the same dataset
    [ ] A traditional algorithm with carefully tuned features
    [ ] A small neural network with very few neurons
- Q: Which statement about vectorization in neural networks is a misunderstanding to avoid?
    [ ] Modern hardware is well suited to these operations
    [ ] It leaves the underlying model unchanged
    [ ] Matrix-based implementations are central to its speed
    [CORRECT] It is just prettier code, not a gain in speed or scale
- Q: What is the result of applying the sigmoid function element-wise to a matrix $Z$?
    [CORRECT] Each entry of $Z$ is passed through sigmoid individually
    [ ] Every negative entry of $Z$ is clipped so it becomes zero
    [ ] The matrix $Z$ is collapsed down to a single scalar value
    [ ] The matrix $Z$ is multiplied by its own transpose $Z^T$
- Q: In a vectorized implementation of forward propagation, what replaces the separate per-neuron dot products used in a loop-based version?
    [ ] Manual addition of the weight values
    [ ] A Python for loop over the neurons
    [ ] A linear activation applied to each neuron
    [CORRECT] One matrix multiplication for the whole layer
- Q: Why was vectorization a major enabler of large-scale deep learning?
    [ ] It makes labeled data unnecessary
    [ ] It removes the need for large training datasets
    [ ] It forces hidden layers to stay linear
    [CORRECT] It makes huge networks feasible when matrix ops are fast
- Q: How does vectorization compare with computing each neuron separately in a loop?
    [ ] It makes the resulting network shallower
    [ ] It produces a mathematically different model
    [ ] It works only for linear models
    [CORRECT] It does many related computations together far faster
- Q: Which piece of hardware was originally built to accelerate computer graphics yet turns out to be very effective for deep learning?
    [CORRECT] The GPU (graphics processing unit)
    [ ] The CPU (central processing unit)
    [ ] The system memory (RAM)
    [ ] The hard disk drive (HDD)
- Q: What is the main practical benefit of representing a layer's activations and weights as 2D arrays (matrices) in code?
    [ ] It eliminates the need for any bias parameters
    [ ] It makes the source code easier to read
    [ ] It changes the mathematical form of the sigmoid
    [CORRECT] Parallel hardware can then run the math far faster
- Q: What practice has most enabled researchers to scale up to very large neural networks over the past decade?
    [ ] Restricting the models to use only biological neuron designs
    [CORRECT] Writing efficient vectorized implementations of the network
    [ ] Avoiding matrix operations in favor of plain scalar loops
    [ ] Training the models on far smaller amounts of input data
- Q: A colleague argues that modern deep learning works because artificial neural networks are precise simulations of how biological neurons process information in the human brain. Which statement best reflects the relationship between biological and artificial neurons?
    [CORRECT] Artificial networks use a simplified mathematical model inspired by neurons
    [ ] Artificial networks replicate the exact electrical behavior of brain cells
    [ ] Artificial networks require detailed knowledge of dendrites and axons
    [ ] Artificial networks are designed to match biological intelligence closely

### TensorFlow Dense Layers

- Q: Which misunderstanding about Dense layers should be avoided?
    [ ] That they can be composed together to form a network
    [CORRECT] That they are an output-only layer, not a general layer type
    [ ] That they can sit in both hidden and output positions
    [ ] That they hold parameters and apply activation functions
- Q: Which tf.keras class lets you build a model by stacking Dense layers in a simple linear order, one feeding into the next?
    [ ] tf.keras.layers.Stack
    [CORRECT] tf.keras.Sequential
    [ ] tf.keras.ModelGroup
    [ ] tf.Module
- Q: In a Keras Dense layer, what does the setting activation="sigmoid" specify?
    [ ] The scheme used to initialize the layer's weight values
    [ ] The optimizer used to carry out the gradient descent step
    [CORRECT] The function applied to each unit to produce its activation
    [ ] The loss function that the overall model tries to minimize
- Q: Which of these is the most widely used framework for building and training deep learning models?
    [ ] Pandas
    [ ] NumPy
    [CORRECT] TensorFlow
    [ ] Matplotlib
- Q: In neural network terminology, what does the term "dense" layer refer to?
    [ ] The raw input feature vector that is passed into the network
    [ ] An activation function that squashes values into the range (0,1)
    [ ] A training process that converges unusually slowly over time
    [CORRECT] A layer where every unit connects to all previous activations
- Q: What does specifying units=3 when creating a TensorFlow Dense layer mean?
    [ ] The layer processes only three training examples
    [ ] The overall model has exactly three output classes
    [CORRECT] The layer contains three neurons (units)
    [ ] The input tensor is required to have rank 3
- Q: What does a Dense layer represent in TensorFlow?
    [CORRECT] The standard fully connected layer type
    [ ] A loss function used during training
    [ ] A built-in clustering routine for data
    [ ] A container that holds the dataset
- Q: A Dense layer computes activation(inputs · kernel + bias). What does the 'kernel' variable hold?
    [CORRECT] The weights matrix
    [ ] The activation map
    [ ] The bias vector
    [ ] The layer's inputs
- Q: If the 'activation' argument is omitted when constructing a tf.keras Dense layer, which behavior is applied to the layer's output?
    [ ] Sigmoid is applied
    [ ] Softmax is applied
    [CORRECT] No nonlinearity (linear)
    [ ] ReLU is applied
- Q: In the Keras call Dense(units=3, activation="sigmoid"), what does the argument units=3 specify?
    [ ] The learning rate used for that layer
    [CORRECT] The number of neurons in that layer
    [ ] The number of training examples fed in
    [ ] The total number of layers in the network
- Q: When a Dense layer is applied to an input, what does it compute?
    [ ] The full gradient of the entire model, computed fully automatically
    [CORRECT] Output activations from the input and the layer's own parameters
    [ ] The supervised training labels, read directly from the supplied data
    [ ] The single global minimum of the model's overall cost function
- Q: When defining the first Dense layer in a tf.keras Sequential model, which constructor argument tells the layer the dimensions of each input sample?
    [ ] input_units
    [CORRECT] input_shape
    [ ] batch_size
    [ ] kernel_size
- Q: Which argument of the Dense layer constructor controls the starting values assigned to the weights before training?
    [ ] activation
    [ ] trainable
    [CORRECT] kernel_initializer
    [ ] bias_regularizer
- Q: Why is a Dense layer called "dense"?
    [CORRECT] Because each neuron uses every activation from the previous layer
    [ ] Because it can only ever be applied to raw, unprocessed image data
    [ ] Because it deliberately omits all of its additive per-neuron biases
    [ ] Because it actively compresses the dataset to save on memory
- Q: Given a Keras Dense layer object named Layer1 and an input x, how do you compute that layer's output activations a1 in code?
    [ ] a1 = Dense(x)
    [ ] a1 = sigmoid(x)
    [CORRECT] a1 = Layer1(x)
    [ ] a1 = Layer1.weights()

### Building Neural Networks with TensorFlow Sequential

- Q: When creating a tf.keras.layers.Dense layer, which parameter sets the number of neurons in that layer?
    [CORRECT] units
    [ ] size
    [ ] shape
    [ ] neurons
- Q: In the call model.fit(X, y, epochs=10), what does the value 10 specify?
    [CORRECT] The number of full passes over the training set
    [ ] The batch size used for gradient descent
    [ ] The neuron count of the hidden layer
    [ ] The number of cross-validation folds
- Q: What is the main convenience of building a model with Sequential rather than applying each layer by hand?
    [ ] It fundamentally changes the underlying math of the built model
    [ ] It restricts every network it builds to one single hidden layer
    [ ] It can only ever be used to build models for regression tasks
    [CORRECT] It manages the layer chaining for both training and prediction
- Q: When building a digit classifier, what is the main advantage of using a Sequential model instead of wiring the layers together by hand?
    [ ] It removes any need to define a dedicated output layer at all
    [CORRECT] It lets TensorFlow pass data between the layers automatically
    [ ] It is the only available way to make use of the sigmoid function
    [ ] It makes the resulting network slower to run but more accurate
- Q: Which method prints a text table of a Sequential model's layers, their output shapes, and the parameter counts?
    [ ] model.report()
    [CORRECT] model.summary()
    [ ] model.layers()
    [ ] model.describe()
- Q: In the Keras training workflow, which method is responsible for specifying the loss function and the optimizer?
    [ ] model.predict()
    [ ] model.evaluate()
    [CORRECT] model.compile()
    [ ] model.fit()
- Q: What type of object does a Sequential model return when model.predict() is called on a batch of input features?
    [ ] A single boolean value summarizing the entire batch
    [CORRECT] A numeric array holding the model's computed output values
    [ ] A Python list of class-name strings, one per example
    [ ] The gradient of the loss with respect to the inputs
- Q: What are the three general steps for specifying and training a model in TensorFlow?
    [ ] Initialize weights, take the derivative, update
    [CORRECT] Define the model, compile it, then fit it
    [ ] Receive input, process it, return output
    [ ] Scale the features, train, then test
- Q: Why must a Sequential model know its input shape, either declared explicitly or inferred from the first batch of data?
    [ ] To decide how many epochs ensure convergence
    [CORRECT] To size the weight matrices and initialize parameters
    [ ] To select the appropriate loss function
    [ ] To pick the most suitable optimizer
- Q: When calling model.fit(), the 'epochs' argument controls which aspect of training?
    [CORRECT] How many full passes are made over the entire training dataset
    [ ] The number of individual neurons that sit in each hidden layer
    [ ] The size of step the optimizer takes on each weight update
    [ ] The total count of layers that are stacked up within the network
- Q: How are the individual layers usually supplied to the tf.keras.Sequential constructor?
    [ ] As a dictionary keyed by layer name
    [ ] As comma-separated positional args
    [CORRECT] As a list of layer objects
    [ ] Wrapped inside a nested tuple
- Q: In model.compile(), which argument specifies the function the model is trained to minimize?
    [ ] metrics
    [ ] epochs
    [CORRECT] loss
    [ ] optimizer
- Q: What is the primary role of a fully-connected 'Dense' layer in a Keras Sequential model?
    [ ] It randomly drops connections to reduce model overfitting
    [ ] It pools adjacent values to downsample the input feature map
    [ ] It flattens multi-dimensional inputs into a single 1D vector
    [CORRECT] Each of its neurons connects to every output of the previous layer
- Q: In model.fit(), what does the 'epochs' parameter control?
    [ ] How many hidden layers the network contains
    [ ] How many input features the matrix X has
    [CORRECT] How many full passes are made over the training data
    [ ] How fast the learning rate decays over time
- Q: If model.compile() uses the BinaryCrossentropy loss, what should the model's final layer be designed to output?
    [ ] An unbounded real value on (-inf, +inf)
    [ ] The learned weights of the hidden layers
    [CORRECT] A probability between 0 and 1
    [ ] The number of epochs left in training
- Q: In model.compile(), which parameter names the weight-update algorithm such as Adam or SGD?
    [ ] activation
    [CORRECT] optimizer
    [ ] metrics
    [ ] loss
- Q: What is the main purpose of the model.compile() step in the Keras training workflow?
    [CORRECT] To set the loss function and optimizer for training
    [ ] To load weights saved from a prior run
    [ ] To print a summary of the model's parameters
    [ ] To define the architecture and the layer count
- Q: How is an activation such as 'relu' or 'sigmoid' usually assigned to a layer in a Sequential model?
    [ ] It gets chosen automatically based on the input feature count
    [ ] Set it as one single global option supplied inside model.fit()
    [ ] Call a separate model.activate() method right after compiling
    [CORRECT] Pass its name as a string to the layer's 'activation' argument
- Q: In the call model.fit(X, y, epochs=100), what does the value 100 determine?
    [ ] The fraction of data held out for validation
    [ ] The neuron count in each hidden layer
    [ ] The rate at which the learning rate decays
    [CORRECT] The number of full passes over the dataset
- Q: When calling model.fit(X, y, epochs=10), what does the 'epochs' argument specify?
    [CORRECT] The number of full passes the model makes over the training set
    [ ] The number of neurons placed in each individual dense layer
    [ ] The number of hidden layers that are contained in the network
    [ ] The step size the optimizer uses when it updates the weights
- Q: Which method runs inference on new inputs with a trained Sequential model?
    [ ] model.loss($X_{new}$)
    [ ] model.scale($X_{new}$)
    [CORRECT] model.predict($X_{new}$)
    [ ] model.gradient($X_{new}$)
- Q: What role does the 'optimizer' argument play in model.compile()?
    [ ] It selects the activation function used by all the hidden layers
    [CORRECT] It sets the algorithm that updates the weights, like Adam or SGD
    [ ] It reshapes the raw input data into properly formatted tensors
    [ ] It fixes the total number of neurons placed in the output layer
- Q: Which statement about Sequential models is a misunderstanding to avoid?
    [ ] It chains the Dense layers in the exact order that you list them
    [ ] Its computation is still ordinary layer-by-layer forward propagation
    [ ] It exposes convenient methods for both training and prediction
    [CORRECT] It removes the network structure instead of just specifying it
- Q: A colleague argues that building effective neural networks today requires faithfully replicating the structure and behavior of biological neurons. Which view best reflects how modern deep learning researchers actually approach this?
    [CORRECT] They rely on engineering principles rather than biological mimicry
    [ ] They follow neuroscience findings closely to guide architecture design
    [ ] They avoid using any concepts that originated from brain research
    [ ] They rebuild each biological neuron exactly before scaling up the model
- Q: When constructing a tf.keras.layers.Dense layer, which constructor parameter sets the non-linear function applied to that layer's output?
    [CORRECT] activation
    [ ] use_bias
    [ ] transformation
    [ ] nonlinearity
- Q: Which Keras layer creates a fully connected layer in which every input connects to every output neuron?
    [CORRECT] tf.keras.layers.Dense
    [ ] tf.keras.layers.Flatten
    [ ] tf.keras.layers.Connected
    [ ] tf.keras.layers.Linear
- Q: What does TensorFlow's Sequential API let you do?
    [ ] Pick optimal hyperparameters automatically
    [ ] Skip forward propagation at inference time
    [ ] Cluster the training set into groups
    [CORRECT] Chain layers in order to build a neural network
- Q: When modeling whether a batch of coffee is roasted well, why might you use a Sequential model with two layers?
    [CORRECT] A hidden layer can extract features and the output layer gives a probability
    [ ] Splitting into two layers lets the model avoid working with tensors entirely
    [ ] Each layer is restricted to processing only one single input feature at a time
    [ ] Two separate layers are required so that the coffee ends up roasted twice over
- Q: Which method generates predictions on new inputs from a trained Sequential model?
    [ ] model.forward()
    [ ] model.compile()
    [CORRECT] model.predict()
    [ ] model.fit()
- Q: What does the Sequential model in TensorFlow/Keras do?
    [ ] It converts incoming NumPy arrays into TensorFlow tensors
    [ ] It computes the value of the cost function for a single example
    [ ] It trains the assembled network by running gradient descent
    [CORRECT] It chains multiple layers together in order to form one network
- Q: Which layer type is most commonly stacked in a Sequential model to form a densely connected (fully connected) network?
    [ ] tf.keras.layers.Dropout
    [CORRECT] tf.keras.layers.Dense
    [ ] tf.keras.layers.Conv2D
    [ ] tf.keras.layers.Flatten
- Q: Which two arguments are most commonly passed to model.compile() to prepare a Keras model for training?
    [ ] inputs and outputs
    [CORRECT] loss and optimizer
    [ ] layers and units
    [ ] epochs and batch_size
- Q: In a Sequential model, how is a per-layer activation function usually specified?
    [ ] Call model.set_activation() after compiling
    [ ] Add one Activation layer only at the model's end
    [CORRECT] Pass an 'activation' argument to the Dense constructor
    [ ] Keras selects it automatically from the loss
- Q: What is the standard way to apply a ReLU activation to a Dense layer in a Sequential model?
    [CORRECT] Pass activation='relu' to the Dense layer
    [ ] Insert an Activation layer after each neuron
    [ ] Call tf.relu() by hand after fitting
    [ ] Let model.compile() infer it from the loss
- Q: For a binary classification network, which final-layer configuration is most typical in a Sequential model?
    [CORRECT] A Dense layer with 1 unit and 'sigmoid' activation
    [ ] A Dense layer with 10 units and 'relu' activation
    [ ] A Flatten layer producing the class output
    [ ] A Dense layer with 2 units and 'linear' activation
- Q: Which Keras layer class is most commonly stacked in a Sequential model to build a standard fully connected layer?
    [CORRECT] tf.keras.layers.Dense
    [ ] tf.keras.layers.Linear
    [ ] tf.keras.layers.Connect
    [ ] tf.keras.layers.Flatten
- Q: How is an activation function most commonly assigned to a Dense layer in a Sequential model?
    [ ] It is chosen automatically and cannot be set by the user
    [ ] By calling model.activate() once the model has been trained
    [ ] By writing a separate for-loop after the model is compiled
    [CORRECT] By passing a name such as 'relu' to the layer's activation argument
- Q: How is a nonlinear activation such as 'relu' or 'sigmoid' normally attached to a Dense layer in a Sequential model?
    [CORRECT] By setting the Dense layer's 'activation' argument
    [ ] By building a separate model per activation
    [ ] By calling the function by hand after model.fit()
    [ ] By listing it inside the model.compile() call
- Q: How does a Keras Sequential model expect the feature input X to be shaped when passed to model.predict()?
    [ ] As one scalar value per call
    [ ] As a flat 1D list of all features
    [ ] As a dictionary keyed by feature name
    [CORRECT] As a 2D array with one example per row
- Q: During training with fit(), what does a single 'epoch' correspond to?
    [CORRECT] One complete pass over the entire training set
    [ ] The wall-clock time taken to compile the model
    [ ] One weight update from a single training example
    [ ] The number of layers in the Sequential constructor
- Q: A team is deciding whether to invest in a much larger neural network for a problem where they have access to a massive and growing dataset. Based on how neural network performance scales with data, what does a larger network offer that traditional algorithms like logistic regression typically do not?
    [CORRECT] It keeps improving as more data is fed to it
    [ ] It reaches peak accuracy with far less data
    [ ] It removes the need for labeled training data
    [ ] It trains faster on small datasets than linear models

