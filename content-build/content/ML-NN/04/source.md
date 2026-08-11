# SOURCE PACK — Machine Learning / Neural Networks / Neural Network Foundations & Architecture

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. History of Neural Networks   (10 questions)
2. Artificial Neurons vs. Biological Neurons   (17 questions)
3. Neural Network Architecture   (15 questions)
4. Input Layer, Hidden Layer, and Output Layer   (5 questions)
5. Neural Network Layers as Logistic Units   (9 questions)
6. Matrix Multiplication for Neural Networks   (10 questions)
7. Neural Networks as Learned Feature Engineering   (15 questions)
8. Why Neural Networks Work Well with Large Data   (5 questions)
9. Neural Networks vs. Decision Trees   (5 questions)

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
- General Dense Layer Implementation
- Efficient Neural Network Vectorization
- TensorFlow Dense Layers
- Building Neural Networks with TensorFlow Sequential

## The live quiz bank for these topics — 91 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### History of Neural Networks

- Q: According to the historical narrative, the “ImageNet moment” in 2012 primarily signified what breakthrough?
    [CORRECT] Deep convolutional networks proved effective for large-scale image classification
    [ ] Neural networks exceeded human-level performance on all visual tasks
    [ ] Speech recognition systems became integrated with computer vision
    [ ] Geoff Hinton’s biological vision theories were finally confirmed
- Q: The instructor’s advice about deciding between collecting more data or acquiring a bigger GPU reveals what key lesson about neural network performance?
    [ ] Neural networks are inherently limited by the choice of activation function
    [ ] The brand name of the hardware matters more than the data quantity
    [ ] Only big companies with massive resources can build practical systems
    [CORRECT] Success often hinges on scaling data and compute, not solely on novel algorithms
- Q: The historical pattern of falls from favor and resurgence suggests which underlying factor was critical for neural network success?
    [ ] The mathematical elegance of the backpropagation proof
    [ ] The philosophical debates about artificial consciousness
    [CORRECT] The availability of large datasets and powerful GPUs
    [ ] The legal frameworks governing AI research exports
- Q: What does the instructor identify as the primary reason the term “deep learning” became the successful brand for modern neural networks?
    [ ] It accurately described a new architecture with many layers
    [ ] It was required by academic publishing venues after 2010
    [CORRECT] It sounded much better and helped distance the field from earlier disappointments
    [ ] It highlighted the use of deep introspection into brain learning mechanisms
- Q: Based on the instructor’s account, which ordering correctly lists the application domains where modern neural networks first had huge impact, from earliest to latest?
    [ ] Computer vision, then natural language processing, then speech recognition
    [ ] Speech recognition, then natural language processing, then computer vision
    [CORRECT] Speech recognition, then computer vision, then natural language processing
    [ ] Natural language processing, then speech recognition, then computer vision
- Q: The instructor states that modern neural networks have “almost nothing to do with how the brain learns,” yet “some of the biological motivations still remain.” Which of the following best captures this remaining influence?
    [ ] Simulating the dendrite and nucleus dynamics inside each artificial neuron
    [ ] Replicating the layered connectivity of the cerebral cortex in the architecture
    [CORRECT] Adopting a simplified model of a neuron that sums inputs and produces an output
    [ ] Applying synaptic pruning algorithms to remove weak connections during training
- Q: According to the course introduction, what is meant by “inference” in the context of neural networks?
    [ ] Training a network using backpropagation
    [CORRECT] Using a pre-trained network to make predictions
    [ ] Collecting labeled examples to form a training set
    [ ] Initializing the parameters randomly before training
- Q: What real-world application did neural networks find in the 1980s that demonstrated their early utility?
    [CORRECT] Reading handwritten postal codes and dollar figures on checks
    [ ] Real-time voice translation on mobile phones
    [ ] Detecting fraudulent credit card transactions
    [ ] Recommending movies on streaming platforms
- Q: Why were handwritten digit recognition tasks, such as reading postal codes, a good fit for the neural networks of the 1980s?
    [ ] The images were high-resolution color photographs with rich textures
    [ ] The task demanded complex temporal reasoning over long sequences
    [ ] The government provided massive annotated datasets for all zip codes
    [CORRECT] The output space was small (ten digits) and the input was relatively low-dimensional
- Q: How does the instructor characterize the shift in motivation from early neural network research to modern deep learning?
    [ ] The early goal was to build conscious machines; today we aim for mathematical optimization
    [ ] The initial networks were purely rule-based; today’s networks are entirely data-driven
    [CORRECT] The original goal was to mimic the brain; modern networks are largely mathematical tools with only a loose biological analogy
    [ ] The field moved from focusing on speech to exclusively focusing on vision tasks

### Artificial Neurons vs. Biological Neurons

- Q: What major caveat applies to the biological inspiration behind neural networks?
    [ ] Biological and artificial neurons are mathematically identical
    [ ] Knowing dendrite behavior is required to build networks
    [CORRECT] The brain is still so poorly understood that the analogy is loose
    [ ] Deep learning is essentially a subfield of biology
- Q: In the common biological analogy for an artificial neuron, which part of a biological neuron corresponds to the inputs the artificial neuron receives?
    [ ] The myelin sheath
    [ ] The nucleus
    [ ] The axon
    [CORRECT] The dendrites
- Q: Considering how information flows through a neuron, the biological axon is most comparable to which part of an artificial neuron model?
    [ ] The summation step
    [ ] The learning rate
    [CORRECT] The output signal
    [ ] The input features
- Q: What is a primary difference in how biological neurons and artificial neurons communicate information?
    [ ] Artificial neurons faithfully reproduce every detail of biological neurons
    [CORRECT] Biological neurons fire discrete electrical spikes, whereas artificial neurons pass continuous numeric values
    [ ] Biological neurons rely on matrix multiplication, whereas artificial neurons rely on chemical signals
    [ ] Biological neurons have no connections to any other neurons
- Q: Why do modern researchers treat the brain-to-network analogy as loose inspiration rather than a strict design guide?
    [ ] Biological brains are now known not to rely on electricity at all to operate
    [ ] Artificial neurons in practice are physically built from real organic material
    [ ] Biology is far too simple to ever supply any useful engineering ideas at all
    [CORRECT] Key training methods like backpropagation lack a clear biological counterpart
- Q: In the simplified view, what does a single artificial neuron do?
    [CORRECT] It takes numeric inputs, computes, and outputs a number
    [ ] It stores an entire dataset inside itself
    [ ] It labels examples without any training
    [ ] It serves as a replacement for matrix multiplication
- Q: Which statement best describes the relationship between modern artificial neural networks and the human brain?
    [ ] Each artificial neuron is more intricate than a biological one
    [ ] They are identical to the brain in both function and architecture
    [ ] They reproduce biological learning so well they replace neuroscience
    [CORRECT] They are vastly oversimplified and resemble brain learning only loosely
- Q: In an artificial neuron, which component plays the role that biological 'synaptic strength' plays between two connected neurons?
    [CORRECT] The weights
    [ ] The activation function
    [ ] The bias term
    [ ] The input vector
- Q: In the simplified mathematical model of a neuron, what basic operation does the neuron perform?
    [CORRECT] It takes numeric inputs, computes on them, and outputs a number
    [ ] It emits random electrical impulses to simulate thinking
    [ ] It acts as linear regression but holds no parameters
    [ ] It stores a fixed label and returns that label unchanged
- Q: Which part of a biological neuron sends electrical impulses outward to other neurons downstream?
    [CORRECT] The axon
    [ ] The dendrites
    [ ] The nucleus
    [ ] The cell body
- Q: Why are biological neurons mentioned when introducing artificial neural networks?
    [ ] To argue that trained neural networks reason exactly the way a human does
    [ ] To claim that artificial neurons replicate real brain cells in detail
    [CORRECT] To give loose intuition for units that take inputs and emit an output
    [ ] To show that biology knowledge is required in order to write the code
- Q: Why do neuroscientists keep making fundamental discoveries even though deep learning is already successful?
    [CORRECT] Because we still understand very little about how the brain works
    [ ] Because the brain's learning rules are now completely mapped
    [ ] Because deep learning rests on perfectly accurate brain models
    [ ] Because biological neurons are simpler to program than artificial ones
- Q: What was the original motivation behind the invention of neural networks decades ago?
    [ ] To design faster graphics processing hardware
    [CORRECT] To build software that imitates how the brain learns
    [ ] To replace linear regression with a richer formula
    [ ] To automate the collection of large digital datasets
- Q: Despite the brain being poorly understood, why does the biological analogy still help?
    [CORRECT] It gives an intuitive starting point, though engineering now leads practice
    [ ] It shows that every good model must copy the wiring of the brain exactly
    [ ] It removes the need for experimentation when designing a network architecture
    [ ] It proves that any sufficiently large neural network gains consciousness
- Q: Which misunderstanding about the brain analogy should be avoided?
    [ ] Recognizing modern networks work despite being simplified
    [ ] Treating biology as motivation rather than a literal blueprint
    [ ] Understanding that the brain remains poorly understood
    [CORRECT] Assuming deep learning succeeds by modeling neuroscience in detail
- Q: A colleague says, 'If we just keep adding more data to our logistic regression model, performance will keep improving at the same rate as it would for a large neural network.' Based on how these algorithms scale with data, which statement is the most accurate correction?
    [CORRECT] Logistic regression performance tends to plateau even as more data is added
    [ ] Logistic regression scales better than large neural networks with more data
    [ ] Both algorithms improve at identical rates as the dataset grows larger
    [ ] Large neural networks plateau sooner than logistic regression with big data
- Q: A junior marketer asks why neural networks became dramatically more effective in the years after 2005 compared to earlier decades. Which combination of factors best explains this shift?
    [CORRECT] The growth of digital data and the ability of large networks to use it
    [ ] New biological discoveries about how the human brain processes signals
    [ ] A switch from electrical impulses to numerical inputs in neuron models
    [ ] The invention of dendrite-inspired architectures for deep networks

### Neural Network Architecture

- Q: What determines the activation values a computed by a hidden layer?
    [ ] The single final output probability that the whole network ends up producing
    [CORRECT] That layer's own parameters w and b and the previous layer's activations
    [ ] A fixed preference value that the user sets by hand before any training
    [ ] Only the original input feature vector x that was first fed to the network
- Q: Which is a common architecture pattern in feedforward networks?
    [CORRECT] Hidden units often decrease toward the output layer
    [ ] All hidden layers are required to be the same size
    [ ] The output layer always has the most units
    [ ] Every effective network has exactly one hidden layer
- Q: When a network is described as having four layers, which layers are usually counted?
    [ ] Only the single input layer of the network
    [ ] Every individual matrix multiplication performed
    [CORRECT] The hidden layers plus the output layer, not the input
    [ ] Only the hidden layers, excluding the output
- Q: By convention, which layer's activation is written as $a^{[0]}$ so the layer numbering stays consistent?
    [ ] The first hidden layer of the network
    [ ] The single output unit of the network
    [ ] The final layer producing the output
    [CORRECT] The input feature vector $x$ of the network
- Q: In neural network design, what does the term 'depth' of a network refer to?
    [CORRECT] The count of hidden plus output layers
    [ ] The largest value the activation can take
    [ ] The bit precision used to store weights
    [ ] The number of neurons in the input layer
- Q: What is a "multilayer perceptron"?
    [CORRECT] A neural net with hidden and output layers
    [ ] A hardware device built for big data jobs
    [ ] A structure found in the biological brain
    [ ] A single-step linear regression model
- Q: If a network's layers are indexed from $0$ to $L$, what does the quantity $a^{[L]}$ typically represent?
    [ ] The raw input features
    [ ] The weights of the first layer
    [ ] The bias of the hidden layers
    [CORRECT] The output layer's activation
- Q: What does the term neural network architecture refer to?
    [ ] The order in which training examples are seen
    [ ] Only the optimizer chosen to train the network
    [ ] The color scheme used when plotting the network
    [CORRECT] The arrangement of layers and units in the network
- Q: In the activation notation $a^{[l]}_j$, what does the superscript $[l]$ in square brackets indicate?
    [ ] The index of the current training example
    [ ] The position of the neuron within the layer
    [ ] The exponent that the activation $a$ is raised to
    [CORRECT] The layer of the network the activation belongs to
- Q: By convention, when reporting the number of layers in a neural network, which layer is not counted in the total?
    [ ] The final activation layer
    [ ] The output layer
    [CORRECT] The input layer
    [ ] The first hidden layer
- Q: In a fully connected (dense) layer, how are its neurons connected to the previous layer?
    [ ] Neurons link only to their neighbors in the same layer
    [ ] Each neuron links to just one previous-layer neuron
    [CORRECT] Each neuron links to every previous-layer neuron
    [ ] Neurons link directly to the output layer only
- Q: Which statement about network architecture is a misconception that should be avoided?
    [CORRECT] Architecture is merely cosmetic and unrelated to computation
    [ ] Architecture choices directly affect the model's modeling power
    [ ] Architecture specifies the structure of the computations performed
    [ ] Hidden layers and the output layer may differ in size
- Q: Why does the choice of network architecture matter?
    [ ] It becomes irrelevant once the weights are initialized
    [ ] It only affects how the network diagram is drawn
    [CORRECT] It governs how information is transformed through the network
    [ ] It removes the need to use activation functions
- Q: Which two design choices primarily define a neural network's architecture?
    [CORRECT] The number of hidden layers and the units per layer
    [ ] The programming language and the source of the data
    [ ] The number of training examples and the target accuracy
    [ ] The GPU model and the size of the dataset used
- Q: What does the 'width' of a hidden layer describe?
    [ ] The gap between the input and output layers
    [CORRECT] The number of neurons in that layer
    [ ] The spread of values in the input vector x
    [ ] The number of training iterations needed

### Input Layer, Hidden Layer, and Output Layer

- Q: Which statement best describes a "layer" in a neural network?
    [ ] The physical processor hardware on which the learning algorithm is executed
    [CORRECT] A group of neurons that take similar inputs and together output a vector
    [ ] The ordered list of target labels that is attached to the training examples
    [ ] A single neuron that receives many different inputs all at the same time
- Q: What does the output layer of a neural network typically provide?
    [ ] The total count of neurons across the network
    [CORRECT] The model's final prediction or estimated probability
    [ ] The raw input feature vector x for the network
    [ ] The learned features feeding the hidden layers
- Q: Why is a middle layer of a neural network called a "hidden layer"?
    [ ] It stays invisible to the processor while the training program is executing
    [ ] Programmers are not permitted to view the source code that computes its values
    [CORRECT] Its activations never appear in the training data, which lists only x and y
    [ ] Its only purpose is to encrypt the feature values flowing through the network
- Q: In neural network terminology, what is another name for the input layer?
    [CORRECT] Layer 0
    [ ] The hidden layer
    [ ] Layer 1
    [ ] The activation function
- Q: By the usual convention (which excludes the input layer from the count), how many layers does a network with one input layer, one hidden layer, and one output layer have?
    [CORRECT] Two layers
    [ ] Three layers
    [ ] Zero layers
    [ ] One layer

### Neural Network Layers as Logistic Units

- Q: In a binary demand-prediction network, how does the output layer differ from the hidden layer?
    [ ] It contains strictly more neurons than the preceding hidden layer does
    [ ] It carries no parameters w or b and simply forwards the activations along
    [ ] It does not pass its result through the sigmoid activation function at all
    [CORRECT] It has a single unit mapping the hidden activations to one probability
- Q: When a hidden layer uses sigmoid activations, what is each neuron in that layer effectively computing?
    [CORRECT] A small logistic regression unit
    [ ] A linear regression line with no sigmoid
    [ ] A plain sum of its incoming inputs
    [ ] A number drawn at random each time
- Q: Why is viewing each hidden neuron as a logistic-regression-like unit a useful perspective?
    [CORRECT] It shows layers are built from simple repeated units
    [ ] It guarantees every hidden unit is human-interpretable
    [ ] It demonstrates that backpropagation is optional
    [ ] It implies hidden layers can be removed entirely
- Q: How is the activation $a_1$ of a hidden unit related to the logistic (sigmoid) function $g$?
    [ ] $a_1$ is a weight used inside the function $g$
    [ ] $a_1$ is the derivative of the function $g$
    [ ] $a_1$ is the raw input passed into $g$
    [CORRECT] $a_1$ is the value of $g$ applied to $(w \cdot x + b)$
- Q: What does it mean to call a neural network layer "dense"?
    [ ] The layer relies on a linear activation function
    [CORRECT] Every unit connects to all outputs of the previous layer
    [ ] The layer is unusually expensive to compute
    [ ] The layer contains a very large number of units
- Q: If a hidden layer contains three neurons, how many separate sets of parameters (w and b) does that layer hold?
    [ ] Zero, since only the output layer has them
    [CORRECT] Three sets, one for each neuron
    [ ] Four sets, one per input feature
    [ ] One shared set for the whole layer
- Q: When several neurons in one layer each compute their own output, what does the layer produce as a whole?
    [ ] A confusion matrix of the predictions
    [CORRECT] A vector of activations passed to the next layer
    [ ] A full cost surface over the parameters
    [ ] A batch of training labels for the data
- Q: What is the key intuition behind calling a hidden neuron a "logistic unit"?
    [ ] It carries no learnable parameters of any kind during the whole training
    [ ] It emits an unbounded, growing number of separate independent outputs
    [ ] It completely eliminates the need for any additive bias term whatsoever
    [CORRECT] It applies a weighted sum then an activation, like logistic regression
- Q: How is a single neuron in a hidden layer of a neural network best described computationally?
    [CORRECT] A unit computing g(w*x + b), much like logistic regression
    [ ] A standalone cost function that the network needs to minimize
    [ ] A verbatim, unchanged copy of its own input feature vector
    [ ] A small unsupervised clustering step applied to the inputs

### Matrix Multiplication for Neural Networks

- Q: Why does expressing a dense layer as a matrix multiplication make it computationally efficient?
    [ ] It removes the need for any bias terms
    [ ] It forces the layer output to be discrete
    [CORRECT] It computes the weighted sums for all units at once
    [ ] It converts the input tensors directly into labels
- Q: Which NumPy function carries out matrix multiplication of two arrays?
    [ ] np.array_split()
    [ ] np.multiply()
    [ ] np.sum()
    [CORRECT] np.matmul()
- Q: When forming the product A·B of two matrices, what condition must the dimensions satisfy?
    [ ] A must have more columns than B has columns
    [ ] The rows of A must equal the columns of B
    [CORRECT] The columns of A must equal the rows of B
    [ ] Both matrices must have exactly one column
- Q: In a vectorized dense layer, what does the quantity z represent before the activation function is applied?
    [ ] The learning-rate schedule for training
    [ ] The total loss measured over the network
    [ ] The final ground-truth labels of the data
    [CORRECT] The matrix of weighted sums plus the biases
- Q: Which operation is central to implementing efficient forward propagation through a dense neural network layer?
    [ ] String concatenation
    [CORRECT] Matrix multiplication
    [ ] One-hot encoding
    [ ] Quicksort on inputs
- Q: Why does the order of the factors matter when multiplying matrices, so that A·B generally differs from B·A?
    [ ] NumPy permits matrix multiplication in only one single fixed order
    [CORRECT] The columns of the first factor must match the rows of the second
    [ ] Matrix products are fully commutative, so the order has no effect
    [ ] The bias term is required to appear inside the first factor matrix
- Q: After computing the pre-activation matrix z in a vectorized layer, what is the next step?
    [CORRECT] An activation is applied elementwise to z
    [ ] The gradients are computed with no loss
    [ ] The input replaces z and z is discarded
    [ ] The model is considered fully trained
- Q: In modern Python, which operator serves as shorthand for a call to matmul between two arrays?
    [ ] %
    [ ] &
    [CORRECT] @
    [ ] #
- Q: What is the effect of 'A.T' (equivalently 'np.transpose(A)') on a matrix A?
    [CORRECT] It reflects A over its main diagonal, swapping rows and columns
    [ ] It strips out the bias vector that is being stored inside A
    [ ] It subtracts the mean so that each column of A averages to zero
    [ ] It raises every individual element of A to the second power
- Q: Which statement about using matrix multiplication in neural networks is a misconception to avoid?
    [CORRECT] It is just notation, not a real efficiency tool
    [ ] It computes many neuron outputs together
    [ ] Frameworks rely on it for layer computations
    [ ] Modern GPUs and TPUs accelerate it well

### Neural Networks as Learned Feature Engineering

- Q: What role do the "activations" passed from one layer to the next play in a neural network?
    [CORRECT] They are learned features that ease the task for later layers
    [ ] They are the raw pixel intensities of the original image
    [ ] They are the single final prediction returned to the user
    [ ] They are values used to hand-compute the cost function
- Q: Why is the learned-feature-engineering view helpful for intuition?
    [ ] It implies a network never needs the designer to make architecture choices
    [CORRECT] It explains how complex predictions get built from simpler learned features
    [ ] It shows that input features are basically irrelevant in machine learning
    [ ] It proves that every hidden unit ends up with a clear human-readable meaning
- Q: If the same neural network architecture is trained on pictures of cars instead of faces, what happens to the features its layers learn?
    [ ] It stops working because it was built only for faces
    [CORRECT] It learns edges, then car parts, then whole car shapes
    [ ] It still detects eyes and ears in the first layer
    [ ] It needs the programmer to redefine each hidden layer
- Q: Which misunderstanding about feature learning in neural networks should be avoided?
    [ ] That learned internal representations help make neural networks powerful
    [ ] That successive hidden layers can transform the network inputs progressively
    [CORRECT] That learned features free humans from caring about inputs or data quality
    [ ] That a network can reduce some of the manual feature design work on its own
- Q: How do hidden layers typically help a network solve problems that are not linearly separable in the original input space?
    [CORRECT] By mapping inputs into a new feature space where the classes separate
    [ ] By ignoring the inputs and attending only to the labels
    [ ] By ensuring no transformation is applied to the input signal
    [ ] By shrinking the network down to a single neuron
- Q: In a face-recognition neural network, what do the earliest hidden layers typically learn to detect?
    [ ] Distinct face parts such as an eye or an ear
    [CORRECT] Very short lines or oriented edges in the image
    [ ] Whole face shapes like a complete head
    [ ] The identity of the specific person shown
- Q: Compared with manual feature engineering (such as hand-combining house size and lot dimensions for price prediction), what is a neural network's main advantage?
    [ ] It relies on fewer mathematical formulas than manual work
    [ ] It is restricted to fitting purely linear functions
    [CORRECT] It can learn useful features from the data on its own
    [ ] It needs the user to hand-combine features into better ones
- Q: What is an important caution about features that a network learns internally?
    [ ] Learning good features makes the iterative training process unnecessary
    [CORRECT] Learned features can help even when humans cannot easily interpret them
    [ ] Every neuron reliably maps to a single clearly named real-world concept
    [ ] Feature learning takes place only inside the final output layer of the net
- Q: Which statement best describes the hierarchical nature of feature learning across the layers of a multi-layer network?
    [CORRECT] Successive layers turn raw inputs into increasingly abstract representations
    [ ] Hidden layers simply store exact copies of the input data
    [ ] Every layer learns the same level of feature detail at once
    [ ] Early layers capture abstractions while later layers recover raw pixels
- Q: Traditional machine learning often relies on manually engineered features. Viewing deep learning as 'learned feature engineering,' how does it differ?
    [CORRECT] It folds feature extraction directly into the model's optimization process
    [ ] It completely removes the need for any data preprocessing step whatsoever
    [ ] It demands even more manual feature selection than linear models ever do
    [ ] It swaps the entire learning process out for fixed, hard-coded human rules
- Q: What is the core idea of viewing neural networks as learned feature engineering?
    [ ] They function correctly only when every input feature is strictly binary
    [ ] They remove the need to supply the network with any input features at all
    [ ] They memorize the training labels directly without any real computation
    [CORRECT] They learn useful internal features instead of using hand-designed ones
- Q: In a face-recognition network where early layers detect edges and middle layers detect face parts, what does a still-later hidden layer typically learn to do?
    [ ] Convert pixel intensities into a tabular spreadsheet
    [CORRECT] Combine face parts into larger, coarser face shapes
    [ ] Detect only simple edges and short line segments
    [ ] Identify the dominant color of the input image
- Q: How do hidden layers support the idea of learned feature engineering?
    [ ] They take over the job of the output layer and remove it from the network
    [ ] They store the entire training set unchanged and look up answers later
    [ ] They force every activation in the layer to settle on one single value
    [CORRECT] They learn transformations of inputs that become more useful for the task
- Q: In end-to-end learning, the network is trained jointly from raw input to final output. What is a primary advantage of this for feature engineering?
    [ ] It guarantees every learned feature is easy for humans to interpret
    [CORRECT] The features themselves are tuned to minimize the task's loss function
    [ ] It stops the model from relying on gradients during training
    [ ] It makes the choice of network architecture entirely irrelevant
- Q: Which of the following is a common challenge when treating neural networks as automated feature engineers?
    [ ] Neural networks are unable to process multi-dimensional inputs
    [ ] Manual feature engineering is always more accurate than learned features
    [ ] The networks simply refuse to learn from large datasets
    [CORRECT] The learned features act as black boxes that are hard to interpret

### Why Neural Networks Work Well with Large Data

- Q: How do neural networks typically contrast with many traditional learning algorithms as data grows?
    [ ] Neural nets help only on very small datasets
    [ ] Traditional methods always improve faster with more data
    [ ] Traditional methods are unsupervised; neural nets are supervised
    [CORRECT] Neural nets keep gaining where many older methods plateau early
- Q: Which misunderstanding about data and neural networks should be avoided?
    [ ] That their strength is closely tied to access to ample useful data
    [ ] That model size can influence final performance
    [CORRECT] That neural nets are powerful regardless of data scale or quality
    [ ] That performance trends can vary across algorithms
- Q: Given plenty of data, why might a larger neural network beat a smaller one?
    [ ] Smaller networks are incapable of doing inference
    [CORRECT] Greater capacity lets it exploit more of the information
    [ ] Larger models automatically guarantee zero error
    [ ] Bigger networks skip the training step entirely
- Q: Why have neural networks grown sharply more important in recent years?
    [ ] They removed the need for any optimization step during the training
    [ ] They require far less underlying mathematics than older methods did
    [CORRECT] Their accuracy tends to keep rising as more data becomes available
    [ ] They now operate exclusively on image data and nothing else at all
- Q: What broader change made neural networks far more useful in practice?
    [ ] CPUs were abandoned across machine learning
    [ ] Labels vanished from nearly all modern datasets
    [CORRECT] The volume of available digital data grew dramatically
    [ ] Neural networks stopped relying on trainable parameters

### Neural Networks vs. Decision Trees

- Q: What broader point applies when comparing neural networks with other model families such as decision trees?
    [ ] Once neural networks exist, every simpler model is never useful for anything
    [CORRECT] Model families have trade-offs; neural nets excel in larger composite systems
    [ ] Decision trees and neural networks are exactly identical models in theory
    [ ] Neural networks fully remove any need for feature design in every single case
- Q: What is one reason neural networks are attractive relative to simpler models like decision trees?
    [ ] They outperform every other model on every possible task
    [ ] They never require any optimization during training
    [CORRECT] They can be scaled up and combined into larger systems
    [ ] They make labeled training data completely unnecessary
- Q: Why might neural networks be favored in systems that combine multiple learned components?
    [ ] Because decision trees are simply unable to produce any predictions at all
    [ ] Because combining several components removes the need for any training
    [ ] Because neural networks can be trained well without using any data at all
    [CORRECT] Because neural network modules can be connected together more naturally
- Q: Which belief is a misunderstanding to avoid when comparing different types of models?
    [CORRECT] One model class is universally best regardless of task and scale
    [ ] Neural networks can be powerful for complex large-scale problems
    [ ] Some methods combine into larger systems more easily than others
    [ ] Which method works best depends on the specific application
- Q: What practical theme does the comparison between neural networks and decision trees illustrate?
    [ ] Only supervised learning models are ever genuinely worth considering here
    [ ] Model architecture stops mattering entirely once you collect enough data
    [CORRECT] Model choice depends on how well a method fits the problem and scales
    [ ] The newest model available is always going to be the very best choice

