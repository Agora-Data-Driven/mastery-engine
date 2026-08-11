# SOURCE PACK — Machine Learning / Neural Networks / Training Neural Networks

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. Loss Function vs. Cost Function   (9 questions)
2. Binary Cross-Entropy   (11 questions)
3. Backpropagation   (12 questions)
4. Training Neural Networks in TensorFlow   (10 questions)
5. Inference vs. Training in Neural Networks   (5 questions)
6. Handwritten Digit Recognition with Neural Networks   (15 questions)

## Already taught earlier in this course

- Activations and Activation Functions
- ReLU Activation Function
- Why ReLU Is Preferred in Hidden Layers
- Choosing Activation Functions for Output Layers
- Binary Classification vs. Regression Output Design
- Forward Propagation
- Implementing Forward Propagation from Scratch

## Covered by LATER lessons — do not teach these here

- Neural Networks in TensorFlow: General Dense Layer Implementation, Efficient Neural Network Vectorization, TensorFlow Dense Layers, Building Neural Networks with TensorFlow Sequential
- Neural Network Foundations & Architecture: History of Neural Networks, Artificial Neurons vs. Biological Neurons, Neural Network Architecture, Input Layer, Hidden Layer, and Output Layer, Neural Network Layers as Logistic Units, Matrix Multiplication for Neural Networks, Neural Networks as Learned Feature Engineering, Why Neural Networks Work Well with Large Data, Neural Networks vs. Decision Trees

## The live quiz bank for these topics — 62 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### Loss Function vs. Cost Function

- Q: Why is the cost function J written as a function of the parameters W and b?
    [ ] Because the inputs x and y are what serve as the model parameters
    [ ] Because J depends only on the training data and not on W and b
    [CORRECT] Because varying W and b shifts the predictions and thus the loss
    [ ] Because the values of W and b are permanently held constant
- Q: In logistic regression, what is the purpose of the loss term -y*log(f) - (1-y)*log(1-f), where f is the predicted probability and y is the label?
    [ ] To set the learning rate alpha
    [CORRECT] To score the prediction on one example
    [ ] To average the model's weights
    [ ] To count the active neurons
- Q: By the standard convention, the loss function measures the error on which of the following?
    [ ] Only the hidden-layer outputs
    [ ] The full training set at once
    [CORRECT] A single training example
    [ ] The weights but not the biases
- Q: Why is it useful to distinguish the loss function from the cost function?
    [ ] It guarantees better generalization to new data
    [ ] It makes the network's hidden layers unnecessary
    [CORRECT] It separates per-example error from the overall objective
    [ ] It removes the need for labeled training data
- Q: How is the cost function defined in terms of the loss?
    [ ] A shortcut used only for drawing contours
    [ ] The same object as the input feature vector
    [CORRECT] The average of the loss over the training set
    [ ] The activation of the final output neuron
- Q: How does the loss/cost distinction relate to training a model in TensorFlow?
    [ ] TensorFlow ignores cost and uses only activations
    [CORRECT] You specify a loss and it minimizes the averaged cost
    [ ] Loss functions only matter for unsupervised learning
    [ ] The cost equals a single output logit of the model
- Q: How is the cost function J defined in terms of the per-example loss function?
    [ ] The largest loss over all examples
    [CORRECT] The average loss across all examples
    [ ] The total sum of the input features
    [ ] The derivative of the loss values
- Q: How is the loss function defined?
    [CORRECT] The performance on a single training example
    [ ] The model's layer-by-layer architecture
    [ ] The complete set of learned model weights
    [ ] The averaged performance over all examples
- Q: When building a neural network in TensorFlow with Keras, in which step do you specify the loss function?
    [ ] Inside each Dense layer
    [CORRECT] In the model.compile() call
    [ ] It is chosen automatically
    [ ] In the model.fit() call

### Binary Cross-Entropy

- Q: Why is binary cross-entropy a natural loss for classifying handwritten digits as 0 versus 1?
    [ ] Because it lets the network skip the sigmoid
    [ ] Because the output value must be negative
    [CORRECT] Because it is binary and the output is a probability
    [ ] Because the network needs two hidden layers
- Q: In TensorFlow's Keras losses, what is the class name for binary cross-entropy?
    [ ] CrossEntropyBinary
    [ ] LogisticLoss
    [CORRECT] BinaryCrossentropy
    [ ] BCELoss
- Q: Which quantities appear directly in the binary cross-entropy loss?
    [ ] Only the regularization parameter
    [CORRECT] The true label y and the prediction f(x)
    [ ] Only the input feature vector x
    [ ] Only the chosen model architecture
- Q: Which statement about binary cross-entropy is a misconception to avoid?
    [ ] It is the right fit for binary classification outputs
    [ ] It is closely related to logistic-regression loss
    [CORRECT] It is a universal loss for any task and output type
    [ ] Common frameworks provide a named version of it
- Q: In the binary cross-entropy formula, what does the symbol 'y' denote?
    [ ] The network's predicted output
    [ ] The chosen activation function
    [CORRECT] The ground-truth target label
    [ ] The count of training examples
- Q: Why is binary cross-entropy given that name?
    [CORRECT] Because the label takes one of two classes
    [ ] Because it can only be evaluated by hand
    [ ] Because it requires exactly two hidden layers
    [ ] Because it squares the binary output values
- Q: Which type of problem is binary cross-entropy used for?
    [ ] Unsupervised clustering
    [ ] PCA-based visualization
    [ ] Multi-output regression
    [CORRECT] Binary classification
- Q: How does the binary cross-entropy loss relate to logistic regression?
    [ ] It applies strictly to multiclass softmax-only problems
    [ ] It is a fundamentally different and unrelated formula
    [CORRECT] It is exactly the loss used to train logistic regression
    [ ] It removes any need for gradient descent while training it
- Q: For classifying handwritten digits as either 0 or 1, which loss function is the standard choice?
    [ ] Mean squared error
    [CORRECT] Binary cross-entropy
    [ ] Sparse categorical cross-entropy
    [ ] Mean absolute (linear) loss
- Q: A colleague claims that binary cross-entropy is only used for neural networks and has no connection to simpler machine learning models. Which statement correctly describes the relationship between binary cross-entropy and logistic regression?
    [CORRECT] Binary cross-entropy is the standard loss function used to train logistic regression
    [ ] Binary cross-entropy is a more complex loss that replaced logistic regression entirely
    [ ] Logistic regression uses a different loss function derived from linear regression
    [ ] Binary cross-entropy and logistic regression are unrelated concepts from different fields
- Q: A team is building a neural network to classify emails as spam or not spam. They are deciding between a loss function designed for binary classification and one designed for multi-class problems. Which loss function is most appropriate for this task?
    [CORRECT] Binary cross-entropy, because the output is one of two classes
    [ ] Mean squared error, because it penalizes large errors more
    [ ] Categorical cross-entropy, because it handles multiple classes
    [ ] Hinge loss, because it maximizes the margin between classes

### Backpropagation

- Q: Why is backpropagation important when training a neural network?
    [ ] It guarantees that the model reaches zero error on every example
    [ ] It assigns the correct labels to unlabeled training data
    [CORRECT] Gradient updates need to know how each parameter affects the cost
    [ ] It removes any need for activation functions in the layers
- Q: How does backpropagation relate to forward propagation in a neural network?
    [ ] Forward propagation only renders tensors for visualization purposes
    [ ] They are identical procedures run in two different directions only
    [ ] Forward propagation becomes optional once backpropagation is in use
    [CORRECT] Forward propagation produces outputs; backpropagation supplies gradients
- Q: In backpropagation, what role does the computation graph serve?
    [ ] It plots out the trained model's final accuracy curve
    [ ] It hides the network's parameters from the user in training
    [ ] It randomly initializes all of the network's weights
    [CORRECT] It splits the calculation into nodes to derive gradients
- Q: For a small network whose cost is $J = \frac{1}{2}d^2$, where $d$ is the final output quantity, what is the first step of backpropagation?
    [CORRECT] Computing the derivative of $J$ with respect to $d$
    [ ] Resetting all the weights to zero
    [ ] Predicting the output value a
    [ ] Sweeping left to right through the graph
- Q: A digital marketer is evaluating whether to invest in a neural network for a new customer segmentation project. The project has access to a massive and continuously growing dataset of customer interactions. Based on how neural networks perform relative to traditional algorithms, why is a large neural network a strong candidate for this project?
    [CORRECT] Large neural networks can keep improving performance as data volume grows, unlike traditional algorithms that plateau.
    [ ] Neural networks are the only algorithms that can process digital records instead of paper records.
    [ ] Traditional algorithms like logistic regression are too simple to ever achieve high accuracy on any task.
    [ ] Neural networks require significantly less data than traditional algorithms to achieve the same performance.
- Q: When building an artificial neural network, engineers often draw inspiration from biological neurons but do not attempt to perfectly replicate the human brain. What is the primary reason for this approach?
    [CORRECT] Current neuroscience knowledge is too limited for blind mimicry to be effective, so engineering principles are favored.
    [ ] Biological neurons are too slow to be simulated accurately by modern computer hardware.
    [ ] Artificial neural networks were invented before scientists understood how biological neurons functioned.
    [ ] Replicating the brain exactly would require too much labeled training data to be practical.
- Q: Which statement about backpropagation is a misconception that should be avoided?
    [ ] It is frequently automated by modern deep-learning libraries
    [CORRECT] It is how the trained network produces predictions on new inputs
    [ ] It computes derivatives of the cost during the training process
    [ ] It is a central mechanism used to update parameters while learning
- Q: What role does a framework like TensorFlow play with respect to backpropagation?
    [ ] It requires you to derive every gradient by hand beforehand
    [ ] It runs backpropagation only on plain NumPy arrays, not tensors
    [CORRECT] It automatically applies backpropagation to compute the needed gradients
    [ ] It blocks backpropagation so only the forward pass can run
- Q: Why is the algorithm called "backpropagation"?
    [ ] Because it deletes hidden layers from the whole network
    [ ] Because it was historically the first method ever invented
    [ ] Because it always runs forward from Layer 0 up to Layer 3
    [CORRECT] Because it computes derivatives from output back to input
- Q: What is the primary task of the backpropagation algorithm?
    [ ] To gather more labeled training examples for the model
    [ ] To produce the model's very first set of forward predictions
    [CORRECT] To compute the cost's derivatives w.r.t. the parameters
    [ ] To enlarge the network by adding several hidden units
- Q: Why is backpropagation more efficient than computing each derivative separately by hand for large networks?
    [ ] It avoids using any calculus or the chain rule at all
    [ ] It skips the entire output layer to save computation
    [CORRECT] It reuses intermediate results to avoid redundant work
    [ ] It reruns a billion full forward steps for each neuron
- Q: In neural-network training, what is backpropagation used for?
    [ ] To set every weight to the same value before the first epoch
    [ ] To cluster hidden-layer activations into groups before training
    [ ] To replace the forward pass when making predictions at inference time
    [CORRECT] To compute the gradients of the cost with respect to the parameters

### Training Neural Networks in TensorFlow

- Q: Which call actually launches the training loop of a compiled Keras model?
    [ ] model.compile()
    [ ] model.start()
    [ ] model.train()
    [CORRECT] model.fit()
- Q: What is the main role of model.compile in the TensorFlow training workflow?
    [ ] It predicts outputs on brand-new data
    [ ] It selects the plotting style for charts
    [ ] It erases the model's existing weights
    [CORRECT] It sets the loss function and optimizer
- Q: When training a Keras model in TensorFlow, what is specified during the 'compile' step?
    [CORRECT] The loss function the network will be trained against
    [ ] The predictions the model makes on fresh inputs
    [ ] The arrangement of layers that defines the model
    [ ] The packaging of the model into a mobile app
- Q: What are the three broad steps for training a neural network in TensorFlow/Keras?
    [ ] Build a tree, prune it, and take a vote
    [ ] Pick K, place centroids, assign points
    [CORRECT] Specify the model, compile it, fit to data
    [ ] Normalize labels, cluster, threshold output
- Q: What does calling model.fit(X, Y) do?
    [ ] It converts NumPy arrays to Python lists
    [CORRECT] It trains the model on the data X and Y
    [ ] It only draws a diagram of the network
    [ ] It runs one forward pass and then halts
- Q: Which belief about TensorFlow training code is a misconception to avoid?
    [ ] The choice of loss function matters
    [ ] compile and fit hide real optimization work
    [ ] Specifying a model is only one of the steps
    [CORRECT] A few lines means learning is trivial
- Q: After running 100 iterations of gradient descent on a network, what is the expected outcome for the parameters?
    [ ] They collapse so that every parameter is zero
    [ ] They drift back to their initial random values
    [CORRECT] They settle near values that minimize the cost
    [ ] They grow to roughly double their starting size
- Q: In the Keras 'fit' function, what does the 'epochs' argument specify?
    [ ] What fraction of the data is held out for testing
    [CORRECT] How many full passes the optimizer makes over the data
    [ ] How many layers are stacked inside the network
    [ ] How many units are placed in each hidden layer
- Q: What kind of algorithm does TensorFlow use under the hood to minimize a neural network's cost function?
    [CORRECT] Gradient descent, such as the Adam optimizer
    [ ] The normal equation solved in closed form
    [ ] Principal component analysis of the inputs
    [ ] K-means clustering of the training points
- Q: In the context of model.fit, what does the number of epochs specify?
    [CORRECT] How many full passes are made over the data
    [ ] The number of labels in the dataset
    [ ] The shape of an input tensor
    [ ] The number of output units in the model

### Inference vs. Training in Neural Networks

- Q: Why is it useful to keep inference (using a model) and training (fitting a model) conceptually distinct?
    [ ] Because the two terms actually mean exactly the same thing in practice
    [ ] Because inference applies only to regression tasks, not classification
    [CORRECT] Because using a model and learning one are related but separate steps
    [ ] Because training somehow makes the model stop computing activations
- Q: What does training a neural network refer to?
    [ ] Running forward propagation just once on a single fresh input
    [CORRECT] Learning the weight values from data so predictions are useful
    [ ] Drawing out the full architecture diagram before writing any code
    [ ] Converting the model's output tensors into plain NumPy arrays first
- Q: In a TensorFlow model, forward propagation corresponds most directly to which operation?
    [ ] Setting every single weight value by hand on each forward pass
    [ ] Randomly reinitializing all of the training labels before each pass
    [CORRECT] Inference that computes activations through layers to the output
    [ ] Partitioning the whole training dataset into unlabeled clusters
- Q: Which common confusion about inference and training should be avoided?
    [ ] Recognizing that training sets weights while inference applies them
    [ ] Understanding that both steps appear in typical workflows
    [CORRECT] Believing that computing a prediction is the same as fitting the weights
    [ ] Noting that forward propagation is the core of inference
- Q: What does inference mean in the context of a neural network?
    [CORRECT] Running a trained network to produce an output from an input
    [ ] Adjusting the weights using labeled training examples
    [ ] Selecting which optimizer to use during fitting
    [ ] Removing hidden layers to shrink the model

### Handwritten Digit Recognition with Neural Networks

- Q: In a network that classifies digits 0 through 9, how many output units does the final Softmax layer have?
    [ ] 1
    [ ] 64
    [ ] 2
    [CORRECT] 10
- Q: Why is handwritten-digit recognition a useful illustrative example for neural networks?
    [ ] It is a pure regression task with smooth continuous numeric outputs
    [ ] It needs absolutely no activation functions at any layer involved
    [ ] It can be trained quite successfully without any labeled examples
    [CORRECT] It maps raw pixel data to a digit class through layered computation
- Q: In a binary handwritten-digit classifier, what is the network's final output meant to represent?
    [ ] The number of hidden layers in the network
    [ ] The mean brightness across the image
    [ ] The total count of pixels in the image
    [CORRECT] The confidence or probability of the target class
- Q: What is the goal of a multiclass handwritten-digit recognition system?
    [ ] To rotate images to a standard angle
    [ ] To tell apart only the digits 0 and 1
    [CORRECT] To recognize each digit from 0 to 9
    [ ] To count how many pixels an image has
- Q: If the input layer has 64 features and the first hidden layer has 25 neurons in a dense network, how many weight parameters connect the two layers, excluding biases?
    [ ] 89
    [CORRECT] 1600
    [ ] 25
    [ ] 64
- Q: Which belief about a handwritten-digit classifier is a misconception to avoid?
    [ ] That its final numeric output can be thresholded to decide a class label
    [CORRECT] That it memorizes one fixed image rather than a pixel-to-label mapping
    [ ] That its raw grayscale input image is represented internally as numbers
    [ ] That its hidden layers transform the input over successive stages
- Q: In a deep network for handwritten digit recognition, what do the earliest hidden layers typically learn to detect?
    [ ] The average brightness of the image
    [CORRECT] Simple features like edges and strokes
    [ ] The complete digit shape in one step
    [ ] The final per-class probabilities
- Q: In a handwritten-digit recognition network, what serves as the input x?
    [ ] A short string of text describing the digit
    [ ] A single scalar temperature measurement
    [CORRECT] A grid of pixel intensity values from the image
    [ ] Only the final predicted class probability
- Q: For a network classifying digits 0-9 whose output is a softmax over 10 classes with integer labels, which loss function is most suitable?
    [CORRECT] Sparse categorical cross-entropy
    [ ] Huber regression loss
    [ ] Binary cross-entropy loss
    [ ] Mean squared error loss
- Q: A binary digit classifier has two hidden layers with 25 and 15 units. How many units are in its output layer?
    [CORRECT] One unit giving the chance of 1 vs 0
    [ ] 40 units, the sum of the hidden units
    [ ] 64 units, matching the input pixels
    [ ] 15 units, matching the last hidden layer
- Q: When feeding an 8x8 pixel image into a fully connected network, the 2D grid is reshaped into a single 1D vector of 64 values. What is this step called?
    [ ] Scaling
    [ ] Pooling
    [CORRECT] Flattening
    [ ] Normalization
- Q: For an 8x8 grayscale image, how many input features are fed into the neural network?
    [ ] 8
    [CORRECT] 64
    [ ] 255
    [ ] 16
- Q: In a simple introductory neural-network classification example, what is the network trained to recognize?
    [ ] Whether a listed house is expensive or cheap
    [CORRECT] Whether an input image is the digit 0 or 1
    [ ] Whether an email article is spam or not
    [ ] Whether a cup of coffee tastes good
- Q: Which activation function is commonly used in the hidden layers of a modern digit-recognition network so it can learn complex non-linear patterns?
    [ ] Constant output
    [ ] Hard step function
    [ ] Identity (linear)
    [CORRECT] ReLU
- Q: On a 0-255 grayscale scale, what does a pixel intensity value of 255 represent?
    [ ] The digit value zero
    [ ] A fully black pixel
    [ ] A mid-tone gray pixel
    [CORRECT] A fully white pixel

