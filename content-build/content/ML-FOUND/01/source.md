# SOURCE PACK — Machine Learning / Foundations / Machine Learning Fundamentals

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. What Machine Learning Is   (16 questions)
2. When to Use Machine Learning   (5 questions)
3. Applications of Machine Learning   (13 questions)
4. Supervised vs. Unsupervised Learning   (13 questions)
5. Regression vs. Classification   (14 questions)
6. Training Set, Features, Targets, and Predictions   (13 questions)
7. Vector and Dot Product Notation   (13 questions)
8. Vectorization   (12 questions)
9. Model Parameters: Weights and Bias   (13 questions)
10. Tensors vs. NumPy Arrays   (15 questions)
11. Binary Classification   (10 questions)

## The live quiz bank for these topics — 137 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### What Machine Learning Is

- Q: In Arthur Samuel's checkers program, how did the system improve its play over time?
    [ ] It simply memorized a fixed list of board positions known to win
    [ ] It searched every possible continuation of the game to perfect depth
    [CORRECT] It learned by playing many games against itself and tracking outcomes
    [ ] It was corrected by hand by a human expert after each move it made
- Q: Why is machine learning well suited to tasks such as speech recognition or web search ranking?
    [ ] Every rule needed to hand-code these systems is already fully known
    [CORRECT] These tasks are too complex to capture fully with explicit rules
    [ ] These tasks can be carried out without making use of any data at all
    [ ] These tasks involve only a very small number of possible outputs
- Q: A model is trained to predict student exam scores (0-100) using hours studied (numeric) and whether the student attended review sessions (yes/no). After training, the model is given the input: \texttt{hours\_studied = 2.5}, \texttt{attended\_review = no}. The predicted score is 68. Which learning paradigm does this fall under, and what error metric is most appropriate for evaluation?
    [CORRECT] Supervised regression, with evaluation using Mean Absolute Error (MAE) or Root Mean Squared Error (RMSE)
    [ ] Supervised classification, with evaluation using accuracy or a confusion matrix
    [ ] Unsupervised regression, with evaluation using silhouette score or Davies-Bouldin index
    [ ] Reinforcement learning, with evaluation using cumulative reward over an episode of study sessions
- Q: Which of the following is an example of machine learning in action?
    [CORRECT] A streaming service recommending movies similar to ones you watched
    [ ] Computing the sales tax on a purchase with a fixed written formula
    [ ] Saving a brand-new contact in your phone by typing in the details
    [ ] Typing out a text message with predictive word suggestions disabled
- Q: A real estate model estimates house prices using square footage (numeric), number of bedrooms (integer), and neighborhood (a text label like 'downtown' or 'suburbs'). The model internally converts neighborhood into three binary columns: \texttt{is\_downtown}, \texttt{is\_suburbs}, \texttt{is\_rural}. What is the name of this conversion, and why is it necessary for most algorithms?
    [CORRECT] One-hot encoding, to represent categorical values as numeric features without imposing false ordinal relationships
    [ ] Feature scaling, to normalize all input columns so that text labels do not dominate numeric magnitudes
    [ ] Dimensionality reduction, to compress the three binary columns back into a single neighborhood column
    [ ] Label encoding, to assign integers like 0, 1, 2 to neighborhoods while preserving meaningful order
- Q: A dataset contains three columns: temperature in Celsius (numeric), humidity percentage (numeric), and a 'rain' column with values 'none', 'light', or 'heavy'. You want to predict the 'rain' column from temperature and humidity. What kind of output does this model produce, and what challenge arises from the ordering of the categories?
    [CORRECT] A classification output with three classes; treating 'none', 'light', 'heavy' as ordered may help but is not required
    [ ] A regression output with continuous values; the model must interpolate between 'none' and 'heavy' as real numbers
    [ ] A regression output that generates numeric values; the categories must be encoded as 0, 1, 2 with equal spacing
    [ ] A classification output with two classes; the three rain levels must be collapsed into a binary 'rain' vs 'no rain'
- Q: Which statement best defines machine learning?
    [CORRECT] Letting computers learn from data instead of being explicitly programmed
    [ ] Storing very large datasets so that software can search through them faster
    [ ] Automating routine work so that humans are removed from all decisions
    [ ] Hand-coding in advance every single rule a program will ever apply
- Q: Consider a problem where the input is a medical image (pixel grid) and the output is a blood pressure reading in mmHg. Compare this to a problem where the input is a medical image and the output is a diagnosis (one of five disease categories). Which statement correctly identifies the shared and differing elements?
    [CORRECT] Both use the same image input type, but the first is regression with a continuous output and the second is classification with discrete output
    [ ] Both are classification problems because the image input is categorical, differing only in how many output classes exist
    [ ] Both are regression problems because images are numeric inputs, differing only in whether the target is rounded to categories
    [ ] Both use categorical image inputs, but the first performs regression on pixels and the second performs regression on diagnoses
- Q: Consider a spam filter that is trained to automatically detect unwanted email by showing it many examples of emails that have been manually marked as 'spam' or 'not spam'. According to Tom Mitchell's formal definition of a well-posed learning problem, which of the following correctly identifies the Task T, Performance measure P, and Experience E for this learning system?
    [CORRECT] Task T: classifying emails as spam or not spam; Performance P: percentage of emails correctly classified; Experience E: a set of emails with correct spam labels.
    [ ] Task T: reducing the number of spam emails in the inbox; Performance P: a database of labeled spam and non-spam emails; Experience E: the fraction of emails misclassified.
    [ ] Task T: learning the concept of spam from examples; Performance P: the accuracy of the filter on future emails; Experience E: a mathematical model that captures spam patterns.
    [ ] Task T: ranking email words by their spam likelihood; Performance P: the total count of spam emails identified; Experience E: the user's explicit rules for filtering spam.
- Q: A company wants to build a system that classifies customer support emails as urgent or non-urgent. They have 100,000 historically labeled emails. Why would a machine learning approach be preferred over having developers manually write keyword rules (e.g., flag emails containing "ASAP" or "emergency")?
    [CORRECT] Learning can discover subtle patterns and adapt to new phrases without requiring programmers to anticipate every variation in advance.
    [ ] Learning is faster because it never needs labeled examples, whereas rules require many examples to be written by hand.
    [ ] Learning guarantees 100% classification accuracy, whereas manually written rules always contain human error.
    [ ] Learning requires no data to function, while rule-based systems depend on having a large dataset of past emails.
- Q: A bank wants to predict if a transaction is fraudulent (yes/no) using the transaction amount (\$) and the hour of day (0-23). An engineer suggests treating hour as a numeric feature. What subtle issue could arise from using raw hour values like 0 and 23 in a linear model?
    [CORRECT] The model sees hour 23 as far from hour 0 numerically, even though they are adjacent in a daily cycle
    [ ] The hour feature would need one-hot encoding because it is fundamentally categorical, not numeric
    [ ] Hour values below 12 would be classified as morning and above 12 as evening, creating unintended classes
    [ ] Regression models cannot accept integer inputs, so hour must be converted to a floating-point representation
- Q: Why is machine learning often viewed as a key step toward building more capable AI systems?
    [ ] Because every AI system that exists today is already fully intelligent
    [ ] Because machine learning removes essentially all need for computation
    [ ] Because symbolic, rule-based programming has now been abandoned entirely
    [CORRECT] Because learning algorithms let systems improve from experience
- Q: A model takes two inputs: a person's age (years) and whether they have a chronic condition (yes/no), and outputs a predicted annual healthcare cost in dollars. What kind of learning problem is this, and what is the role of each input type?
    [CORRECT] Regression where age is a numeric feature and condition is a categorical feature
    [ ] Classification where age is a class label and condition is a numeric feature
    [ ] Regression where age is a class label and condition is a regression target
    [ ] Classification where age is a numeric target and condition is a categorical target
- Q: A software team needs to build a system that filters spam emails based on thousands of subtle patterns in message content, headers, and sender behavior. Which approach is more suitable and why?
    [ ] Rule-based approach, because it guarantees 100% accuracy on known spam patterns.
    [CORRECT] Machine learning approach, because it can automatically learn complex patterns from labeled email data.
    [ ] Rule-based approach, because it requires no training data and can be written once.
    [ ] Machine learning approach, because it explains exactly why each email is flagged as spam.
- Q: You have a dataset where each row contains a customer's annual income (\$), their credit score (300-850), and whether they defaulted on a loan (yes/no). You want to predict credit score from the other two variables. Which statement correctly characterizes this setup?
    [CORRECT] Income is a numeric input, default status is a categorical input, and the target is a regression output
    [ ] Income is a categorical input, default status is a regression output, and the target is a numeric input
    [ ] Income is a regression output, default status is a numeric input, and the target is a categorical input
    [ ] Income is a numeric input, default status is a regression output, and the target is a categorical output
- Q: A data scientist builds two models for the same task. Model A takes raw inputs: \texttt{income (\$)} and \texttt{zip\_code} (both as provided). Model B takes \texttt{income (\$)} unchanged but splits \texttt{zip\_code} into \texttt{median\_rent} and \texttt{population\_density} extracted from census data. For predicting loan default (yes/no), which model is likely to perform better and why?
    [CORRECT] Model B, because raw zip codes carry little inherent meaning and the derived features capture economically relevant signals
    [ ] Model A, because keeping zip code intact allows the model to learn geographical patterns without introducing external bias
    [ ] Model B, because splitting features always increases dimensionality and therefore always improves classification accuracy
    [ ] Model A, because converting a categorical column to numeric features violates the assumptions of classification algorithms

### When to Use Machine Learning

- Q: What common mistake should you avoid when deciding whether to apply machine learning?
    [ ] Thinking carefully about how the model will be deployed early on
    [CORRECT] Assuming good tools alone suffice without knowing how to apply them
    [ ] Collecting labeled examples before you begin to train any model
    [ ] Trying out more than one approach before committing to a method
- Q: Why do industries outside of software present large opportunities for machine learning?
    [ ] Only companies outside of software ever collect any usable data
    [CORRECT] Many sectors hold untapped problems where data can add value
    [ ] Software companies can no longer benefit at all from using ML
    [ ] Machine learning is mainly suited to academic research settings
- Q: For which kind of problem is machine learning especially appropriate?
    [ ] When no data exists at all and gathering examples is impossible
    [ ] When perfect certainty is required and no prediction is ever needed
    [CORRECT] When the input-to-output mapping is hard to specify but examples exist
    [ ] When the whole task can be solved by a few short hand-coded rules
- Q: Which statement best describes why the present is a strong time to learn machine learning?
    [ ] The field is shrinking quickly, so there is very little competition
    [ ] Most ML systems are already fully automated and need no people at all
    [CORRECT] Demand for ML skills is high and its economic impact is broad
    [ ] Only a small handful of industries still make any practical use of ML
- Q: Which task is the clearest sign that machine learning may outperform explicit programming?
    [ ] Sorting a long list of numbers from smallest to largest
    [CORRECT] Diagnosing disease by finding patterns in many X-ray images
    [ ] Computing a shortest path when all of the rules are known
    [ ] Looking up an amount owed in a fixed, published tax table

### Applications of Machine Learning

- Q: You have a dataset with a numeric feature 'temperature' and a categorical feature 'season' (winter, spring, summer, fall). For a linear regression model, you create an interaction term between temperature and season. How many total features (including the interaction) does the model receive when 'winter' is the reference category?
    [ ] 5: temperature and three indicator variables for season.
    [CORRECT] 6: temperature, three season indicators, and three product terms.
    [ ] 7: temperature, three season indicators, and three product terms.
    [ ] 4: temperature plus an interaction term for each season.
- Q: For a binary classification problem, you transform a numeric age feature into a categorical feature with bins: young (0-30), middle (30-60), senior (60+). What potential information loss occurs when switching from the original numeric age to the binned categorical version?
    [CORRECT] The model loses the ability to capture monotonic relationships with age.
    [ ] The model can no longer distinguish a 29-year-old from a 31-year-old.
    [ ] The model treats age as an unordered set, discarding ordinal knowledge.
    [ ] The model must now learn separate coefficients for every possible age.
- Q: A company uses logistic regression to classify customer churn (yes/no) based on monthly charges ($\$$) and contract type (monthly, annual). The model outputs a raw score of $z = -1.2 + 0.03 \cdot \text{charges} + 0.8 \cdot \text{is\_monthly}$. What does the value $\sigma(z)$ represent, where $\sigma$ is the sigmoid function?
    [CORRECT] The probability of churn given the specific feature values.
    [ ] The log-odds of churn transformed onto a linear scale.
    [ ] The classification threshold that minimizes misclassifications.
    [ ] The decision boundary separating churn from non-churn customers.
- Q: A model predicts house prices using square footage, number of bedrooms, and zip code. Zip code is categorical with 50 unique values and is one-hot encoded. How many coefficients does a linear regression model learn from the zip code feature alone, and why?
    [ ] 50 coefficients, one for each zip code category.
    [CORRECT] 49 coefficients, because one category is absorbed by the intercept.
    [ ] 50 coefficients, because the intercept is always excluded.
    [ ] 49 coefficients, because categorical features always lose one degree.
- Q: A dataset contains both numeric features (age, income) and categorical features (city, subscription type). For a classification task using logistic regression, what preprocessing step is mathematically essential across all feature types before training?
    [ ] Transform every feature into a single numeric scale.
    [ ] Convert all categorical values into one-hot encoded vectors.
    [CORRECT] Encode all features so the model receives only numeric values.
    [ ] Normalize the numeric features and ignore the categorical ones.
- Q: A regression model uses the categorical feature 'color' with values red, blue, green. If 'red' is dropped as the reference category, what does the learned coefficient for 'blue' quantify?
    [ ] The expected target value when color is blue, relative to the average.
    [ ] The difference in the predicted target between blue and green.
    [CORRECT] The difference in the predicted target between blue and the dropped red.
    [ ] The absolute contribution of blue to the predicted target value.
- Q: A marketing team trains a model to predict ad click-through rates, but initial performance is poor. Which factor most likely explains this, given how learning algorithms improve?
    [ ] The algorithm chosen was not state-of-the-art.
    [ ] The model had too many features causing overfitting.
    [CORRECT] The model had insufficient opportunity to learn from data.
    [ ] The problem requires an unsupervised learning approach.
- Q: A digital marketer wants to predict which email subscribers will open a campaign. Which machine learning approach is most commonly used for such tasks?
    [CORRECT] Supervised learning using labeled historical data.
    [ ] Unsupervised learning to cluster subscriber behavior.
    [ ] Reinforcement learning to optimize send times.
    [ ] Rule-based filtering based on past opens.
- Q: Which statement best describes the core idea of machine learning?
    [ ] Explicitly programming every decision rule.
    [CORRECT] Learning from experience without explicit programming.
    [ ] Training only on labeled data with neural networks.
    [ ] Automating all human tasks with algorithms.
- Q: You train a k-Nearest Neighbors classifier on customer data where age is in years (range 18-90) and salary is in dollars (range 20000-200000). Without preprocessing, why does salary dominate the distance calculation?
    [CORRECT] Salary has a larger magnitude, so its squared differences dwarf those of age.
    [ ] k-NN treats salary as a label, not a feature, during distance computation.
    [ ] Salary has higher variance, making it the only feature used in Euclidean distance.
    [ ] Age is always treated as categorical, so its distance contribution is zero.
- Q: A linear regression predicts exam scores from hours studied and a binary feature 'tutoring' (0 or 1). The learned equation is $\hat{y} = 50 + 8 \cdot x_{\text{hours}} + 15 \cdot x_{\text{tutoring}}$. What is the interpretation of the coefficient 15?
    [CORRECT] Students with tutoring score 15 points higher on average, assuming equal study hours.
    [ ] Tutoring adds 15 points for every additional hour a student studies for the exam.
    [ ] The intercept shifts by 15 when tutoring switches from 0 to 1, ignoring hours.
    [ ] For each hour studied, tutoring increases the score by 15 points on average.
- Q: Learning algorithms are often compared to a set of tools. What additional skill is stressed as essential for success in using them?
    [CORRECT] Knowing how to apply these tools effectively.
    [ ] Having the fastest and most advanced algorithm.
    [ ] Using only deep learning techniques for all problems.
    [ ] Collecting as much data as possible from any source.
- Q: Machine learning types include supervised and unsupervised learning. How are recommender systems typically categorized?
    [ ] As a form of supervised learning for prediction.
    [CORRECT] As a separate type alongside unsupervised learning.
    [ ] As a subset of reinforcement learning for agents.
    [ ] As not considered a true machine learning method.

### Supervised vs. Unsupervised Learning

- Q: Which statement accurately captures a fundamental relationship between input types and the classification-vs-regression distinction?
    [ ] Classification requires categorical input features to define class boundaries
    [ ] Regression requires numerical input features to fit a continuous function
    [CORRECT] The choice between classification and regression depends only on the target type, not the input type
    [ ] Both input and target must be of the same type (both numerical or both categorical)
- Q: Which question is most naturally framed as a supervised learning problem?
    [ ] Which of these news articles appear most similar to one another?
    [CORRECT] Is this incoming email message spam or not spam?
    [ ] What previously hidden structure is present within this dataset?
    [ ] How should these unlabeled customers be grouped into segments?
- Q: Why is unsupervised learning described as 'unsupervised'?
    [ ] Because it can operate only on data that is randomly generated
    [ ] Because the input examples it receives contain no features at all
    [CORRECT] Because the algorithm gets no correct answer for any example
    [ ] Because it needs no human involvement of any kind whatsoever
- Q: You have a dataset of real estate listings. Each listing includes: number of bedrooms (integer), square footage (real number), neighborhood name (text string), and sale price (real number). You want to predict the neighborhood name from the other three features. What is the accurate description of this supervised learning task?
    [ ] Regression with mixed input types
    [CORRECT] Classification with mixed input types
    [ ] Clustering with mixed input types
    [ ] Dimensionality reduction with numerical input
- Q: You train a supervised model with two input features: a person's height in centimeters and their shirt size (S, M, L, XL). The model outputs a predicted weight in kilograms. Later you realize you need to instead predict whether the person weighs above or below 80 kg. What changes and what stays the same?
    [ ] Input types change; output type changes; the problem type stays the same
    [CORRECT] Input types stay the same; output type changes; the problem type changes
    [ ] Input types change; output type stays the same; the problem type stays the same
    [ ] Input types stay the same; output type stays the same; the problem type changes
- Q: A model takes a patient's blood pressure and cholesterol level (both real numbers) and outputs a prediction of either 'high risk' or 'low risk'. If you wanted to reframe this as a regression problem without changing the underlying goal of risk assessment, which target would be most appropriate?
    [CORRECT] The probability that the patient belongs to the 'high risk' class
    [ ] A binary 0/1 encoding where 1 means 'high risk' and 0 means 'low risk'
    [ ] A three-class label: 'low', 'medium', or 'high' risk
    [ ] The patient's actual cholesterol level replaced by a categorical bin
- Q: An engineer argues: 'If my input data includes zip codes (represented as numbers), then my model is using numerical input, so it must be a regression problem.' What is the most precise flaw in this reasoning?
    [ ] Zip codes cannot be used as features in any supervised learning model
    [CORRECT] Numerical input can be used for classification; the problem type depends on the target, not the input encoding
    [ ] Regression requires that all features, including zip codes, have a natural ordering relationship
    [ ] A model with any numerical input automatically becomes a regression problem regardless of the target
- Q: Which question is most naturally framed as an unsupervised learning problem?
    [CORRECT] How can these unlabeled data points be grouped by similarity?
    [ ] Which one of two categories does this tumor most likely belong to?
    [ ] What price should this house sell for, given past labeled sales?
    [ ] Will this particular user end up clicking on the displayed ad?
- Q: Which pairing of a task with its learning type is correct?
    [ ] Spam filtering—unsupervised; market segmentation—supervised learning
    [ ] Speech recognition—unsupervised; anomaly detection—supervised learning
    [ ] Housing-price prediction—unsupervised; news clustering—supervised learning
    [CORRECT] Breast-tumor diagnosis—supervised; customer grouping—unsupervised
- Q: What is the key distinction between supervised and unsupervised learning?
    [ ] Supervised learning is outdated while unsupervised learning is the modern choice
    [ ] Supervised learning handles only images while unsupervised handles only text
    [ ] Supervised learning is always linear while unsupervised is always nonlinear
    [CORRECT] Supervised learning uses labeled outputs while unsupervised does not
- Q: You have a dataset where each example contains: the pixel grid of a handwritten digit, the digit label (0-9), and the writer's age. You want to predict the writer's age from the pixel grid alone. What combination of input type, target type, and learning problem does this represent?
    [ ] Numerical input, numerical target, regression
    [CORRECT] Categorical input, numerical target, regression
    [ ] Numerical input, categorical target, classification
    [ ] Categorical input, categorical target, classification
- Q: A dataset contains customer ID, annual income, and purchase history categorized as 'frequent', 'occasional', or 'rare'. You train a model that outputs a predicted income value when given a customer ID and purchase history category. How should the input and output types be classified?
    [ ] Purely numerical input, purely numerical output
    [CORRECT] Mixed input (categorical and numerical), numerical output
    [ ] Purely categorical input, purely categorical output
    [ ] Mixed input (categorical and numerical), categorical output
- Q: Consider a model that predicts the expected temperature for tomorrow given today's weather description (e.g., 'sunny', 'cloudy', 'rainy'). The weather description is the only feature. Which statement about this setup is correct?
    [ ] The input type is numerical because temperature is numerical
    [CORRECT] The input type is categorical even though the target is numerical
    [ ] The output type is categorical because the input is categorical
    [ ] This cannot be a supervised learning problem without numerical input

### Regression vs. Classification

- Q: What characterizes a regression problem?
    [ ] The model happens to rely on more than one input feature
    [CORRECT] The goal is to predict a number from many possible values
    [ ] The output is only an ordered ranking and nothing more
    [ ] The output is selected from a small fixed set of categories
- Q: What characterizes a classification problem?
    [ ] The training data is restricted to just a single input feature
    [ ] The model is required to take images as its only form of input
    [CORRECT] The model predicts one label from a limited set of categories
    [ ] The model predicts any real-valued number along a continuum
- Q: Which of the following is the best example of a classification problem?
    [ ] Predicting the exact final selling price of a home
    [CORRECT] Labeling a tumor as either benign or malignant
    [ ] Forecasting tomorrow's high temperature in degrees
    [ ] Estimating the height of a given person in centimeters
- Q: Consider these five prediction tasks: (1) predicting tomorrow's temperature in degrees Celsius, (2) diagnosing a tumor as benign or malignant, (3) estimating a person's age in years from a photo, (4) classifying an email as spam or not spam, (5) forecasting the price of a stock in dollars. Which statement correctly identifies all regression tasks and all classification tasks, and correctly explains the reason?
    [CORRECT] Tasks 1, 3, and 5 are regression because each outputs a continuous numeric quantity; tasks 2 and 4 are classification because each outputs a category.
    [ ] Tasks 1, 3, and 5 are classification because they involve numbers; tasks 2 and 4 are regression because they involve yes/no decisions.
    [ ] Tasks 1, 2, and 3 are regression because they involve numeric outputs; tasks 4 and 5 are classification because they involve sorting into groups.
    [ ] Tasks 1, 2, and 5 are regression because they predict real-world values; tasks 3 and 4 are classification because they predict labels.
- Q: Why can outputs written as 0 and 1 still describe classification rather than regression?
    [ ] Because classification can never make any use of text-based labels at all
    [ ] Because regression problems are restricted to using negative numbers only
    [ ] Because any use of numbers at all automatically makes a task regression
    [CORRECT] Because what truly matters is that the outputs stand for categories
- Q: Why is predicting a home's selling price treated as regression rather than classification?
    [ ] Because the data about houses is essentially always unlabeled
    [CORRECT] Because prices span many numeric values, not a few categories
    [ ] Because the model used must take the form of a straight line
    [ ] Because houses are physical, visual objects out in the world
- Q: An online store uses purchase history (dollar amounts, item counts) and membership tier (bronze, silver, gold) to predict the discount percentage a customer will use on their next order. The output is a number like 15 or 20. Which statement about this problem is correct?
    [ ] It must be classification because membership tier is categorical
    [CORRECT] It must be regression because the output discount percentages are continuous numeric values in practice
    [ ] It becomes classification only if the dollar amounts are binned into ranges
    [ ] It cannot be solved without converting membership tier to numbers first
- Q: A sensor system takes a vibration reading (a real number) and a fault code (an integer 0-255 representing error types) as input. It must predict whether the machine will fail within 24 hours. Which of the following correctly identifies the task type and the reason?
    [ ] Regression, because vibration is a continuous measurement
    [CORRECT] Classification, because the prediction target is a binary yes-or-no outcome
    [ ] Regression, because fault codes are integers and integers imply numeric prediction
    [ ] Classification, because the fault code input is a discrete categorical identifier
- Q: A dataset contains a numeric feature $x$ and a categorical feature $z$. For which target variable would this be a classification problem?
    [ ] The expected lifetime dollar spending of the customer
    [ ] The square footage of the customer's next purchased home
    [CORRECT] Whether the customer will renew a subscription next month
    [ ] The number of months until the customer's contract expires
- Q: A lending company uses a customer's annual income (numeric) and employment status (employed, self-employed, unemployed) to assign an interest rate from a fixed set: 5%, 8%, or 12%. Why is this classification despite the numeric-sounding output?
    [ ] Interest rates under 10% are treated as continuous values in finance
    [ ] The presence of a categorical feature forces the output into discrete classes
    [CORRECT] The output is drawn from a small fixed set of categories, not a continuous range
    [ ] Numeric inputs always require a regression formulation regardless of output
- Q: Two models are trained on the same dataset with features $\{ \text{age}, \text{income}, \text{city} \}$. Model A outputs a dollar amount. Model B outputs one of three labels: low, medium, or high. Which statement about the task types is correct?
    [ ] Both models solve classification tasks because city is a categorical input
    [CORRECT] Model A solves regression because its output is a continuous numeric value; Model B solves classification because its output is a category
    [ ] Model A solves classification if the dollar amounts are rounded to whole numbers
    [ ] Model B solves regression only if labels are encoded as 0, 1, and 2
- Q: A weather station records wind speed (km/h), humidity (%), and a text description (sunny, cloudy, rainy). The goal is to predict the wind speed for the next hour. What determines that this is regression rather than classification?
    [ ] Wind speed and humidity are both continuous measurements
    [ ] The text description has only three possible values
    [CORRECT] The predicted quantity itself is a numeric measurement on a continuous scale
    [ ] All three inputs must be numeric for classification to apply
- Q: A student argues: "If any input feature is categorical, the problem must be classification, because categories are classes." Which counterexample best refutes this claim?
    [CORRECT] Predicting a person's height in centimetres using their favorite colour as one input
    [ ] Grouping customers into segments based only on their purchase frequency
    [ ] Labeling an image as containing a cat or not based on pixel intensities
    [ ] Separating emails into spam and non-spam using word counts only
- Q: A model takes two kinds of inputs: the number of hospital visits in the past year (an integer) and a blood type label (A, B, AB, or O). The target is the number of days until the next appointment. Why is this task regression despite the categorical input?
    [ ] The presence of any categorical feature forces the task into classification
    [CORRECT] The target variable is a continuous numeric quantity being predicted
    [ ] Integer inputs always override categorical inputs when determining task type
    [ ] Blood type carries ordering information that makes regression possible

### Training Set, Features, Targets, and Predictions

- Q: Consider two supervised learning problems. Problem A: predict whether an email is spam (0 or 1) from word count features. Problem B: predict the number of days until a subscription expires from user activity features. How do the roles of $y$ differ across these problems?
    [CORRECT] In Problem A, $y$ is a discrete class label; in Problem B, $y$ is a continuous value, and this distinction defines the task type regardless of the input features
    [ ] In Problem A, $y$ is a probability; in Problem B, $y$ is a count, making both problems instances of regression with constrained output ranges
    [ ] In both problems, $y$ is a numeric value, so the task type can only be determined by examining the loss function, not the target
    [ ] In Problem A, $y$ is the input to a softmax; in Problem B, $y$ is the input to a linear activation, and the input features $x$ are irrelevant to this distinction
- Q: In supervised learning, what is a training set?
    [ ] The list of model parameters obtained after training
    [CORRECT] A dataset of inputs paired with their correct outputs
    [ ] A collection containing solely unlabeled raw input data
    [ ] A separate dataset reserved only for final deployment
- Q: In standard supervised-learning notation, what does y represent?
    [ ] The model's estimated output
    [ ] The value of the cost function
    [CORRECT] The actual target output value
    [ ] The model's learning rate
- Q: A training pipeline accepts a raw dataset where each row has a text review and a star rating from 1 to 5. Before feeding the data to a model, an engineer creates $x$ by converting text to TF-IDF numeric vectors, and keeps $y$ as the integer star rating. The model is trained to predict $y$ from $x$. Which statement is true?
    [CORRECT] The task could be either regression or ordinal classification, and the choice depends on how the integer ratings are interpreted in the loss function
    [ ] The task is necessarily classification because the target $y$ takes only five discrete values, which makes regression impossible
    [ ] The task is necessarily regression because the text was converted to continuous numeric features, which forces the output to be continuous
    [ ] The task cannot be supervised learning because the original input was unstructured text, which is incompatible with the $(x, y)$ framework
- Q: In standard supervised-learning notation, what does x represent?
    [ ] The target output value
    [ ] The count of training examples
    [ ] The prediction the model makes
    [CORRECT] The input feature or features
- Q: A training example has features $x = [2.5, 0, 1]$. The model computes $\hat{y} = 3.7$, and the true target is $y = 4.0$. If the task is regression, what does the difference $y - \hat{y} = 0.3$ represent?
    [CORRECT] The residual error for this single training example
    [ ] The bias of the model, indicating systematic underprediction
    [ ] The variance of the prediction, measuring sensitivity to the training set
    [ ] The regularization penalty that will be added to the loss function
- Q: In standard supervised-learning notation, what does y-hat represent?
    [ ] A single special training example
    [ ] The true output recorded in the training set
    [ ] The number of input features used
    [CORRECT] The model's predicted estimate of y
- Q: A model for predicting house prices uses features $x$ that include both numeric values (square footage) and categorical values (neighborhood name). Before training, the neighborhood names are one-hot encoded into multiple binary columns. Which statement best characterizes what happened to the input representation?
    [CORRECT] The number of features in $x$ increased, and the categorical information is now expressed in a numeric form suitable for the model
    [ ] The number of training examples $m$ increased because each neighborhood became its own training instance
    [ ] The target variable $y$ was transformed from a continuous price into a set of binary classification targets
    [ ] The input dimension decreased because all categorical information was compressed into a single numeric feature
- Q: A supervised learning dataset has $m = 1000$ training examples. For each example $i$, the input $x^{(i)}$ is a feature vector of length 20, and the target $y^{(i)}$ is a single real number. A colleague argues that because $y^{(i)}$ is a single number, the problem must be regression. Is this reasoning valid?
    [CORRECT] No, because a single numeric target can represent class labels (e.g., 0, 1, 2) for a classification task as well
    [ ] No, because regression requires the target to be a vector of at least two dimensions to capture variance
    [ ] Yes, because a scalar target value is the defining property that distinguishes regression from classification
    [ ] Yes, because classification always requires a target that is a categorical string, never a numeric value
- Q: A model uses two input columns: $x_1$ (a person's age in years, numeric) and $x_2$ (whether they own a home, encoded as 0 or 1). Which task is this input format capable of supporting, and why?
    [CORRECT] Both classification and regression, because numeric and binary features can be combined as a vector input to either task type
    [ ] Only regression, because $x_2$ is discrete and would break gradient calculations in classification models
    [ ] Only classification, because binary features force the output to be a discrete category rather than a continuous value
    [ ] Neither, because mixing numeric and categorical features in one input violates the i.i.d. assumption required for supervised learning
- Q: In standard supervised-learning dataset notation, what does m denote?
    [CORRECT] The total number of training examples
    [ ] The size of the model's prediction error
    [ ] The number of distinct output classes
    [ ] The number of layers inside the model
- Q: You are designing a supervised learning system. The target $y$ is the number of seconds until a user clicks a button (a positive real number), and the input $x$ is a 50-dimensional vector of mixed numeric and one-hot-encoded categorical features. Which output layer configuration is most appropriate?
    [CORRECT] A single unit with no activation function, trained to output a continuous positive value
    [ ] A single unit with a sigmoid activation, clamping the output between 0 and 1
    [ ] A softmax layer over a predefined set of time buckets, converting the problem to multiclass classification
    [ ] A linear layer followed by a softmax, producing a probability distribution over all possible times
- Q: You have a dataset where each input $x$ is an image and the target $y$ is a single word describing the main object in the image (e.g., "cat", "dog", "bridge"). Which statement about $y$ and the learning task is correct?
    [CORRECT] The task is classification because $y$ is categorical, even though $x$ is high-dimensional and continuous
    [ ] The task is classification, but only if the number of possible words is exactly two, otherwise it becomes regression
    [ ] The task is regression because the input $x$ consists of continuous pixel intensities, which dominate the formulation
    [ ] The task type cannot be determined because categorical targets must always be encoded as numeric values before use

### Vector and Dot Product Notation

- Q: Why is vector notation introduced for multiple linear regression?
    [ ] To eliminate the need for features
    [CORRECT] To write the same model more compactly
    [ ] To turn the model into a classifier
    [ ] To drop the bias term from the model
- Q: Which statement correctly describes the notation used for multiple linear regression?
    [ ] Vectors show up only within unsupervised learning settings, never here
    [ ] The bias $b$ also becomes a vector whenever the input $x$ is a vector
    [CORRECT] $x^{(i)}$ can be a vector, unlike the scalar $x$ in the univariate case
    [ ] Dot product notation is useful only for drawing cost contour plots
- Q: If w and x are vectors, what is the role of b in f(x) = w·x + b?
    [ ] It counts the dimensions of vector w
    [ ] It converts the input x into a matrix
    [ ] It stores the current loss value
    [CORRECT] It is added as a separate scalar offset
- Q: You build a binary classifier $f(\mathbf{x}) = \mathbf{w} \cdot \mathbf{x} + b$ with threshold 0. You then train a second classifier with $\mathbf{w}' = 2\mathbf{w}$ and $b' = 2b$. How do the decision boundaries of the two models compare?
    [CORRECT] They are identical because the inequality $\mathbf{w} \cdot \mathbf{x} + b \ge 0$ is unchanged by scaling both sides
    [ ] They differ because doubling the weights makes the boundary twice as steep in feature space
    [ ] They differ because the bias shift moves the boundary away from the origin by a factor of two
    [ ] They are identical only if the input features are also doubled before computing the dot product
- Q: Regarding terminology, which point about naming this model is commonly clarified to avoid confusion?
    [ ] Dot products taken between two vectors are simply not permitted in machine learning
    [ ] Only one single input feature is ever truly capable of carrying meaningful signal
    [ ] Vectors written in this notation are never once allowed to be laid out as rows
    [CORRECT] The model with multiple features is "multiple," not "multivariate," regression
- Q: A model is changed from $f(x) = w x + b$ (one feature) to $f(\mathbf{x}) = \mathbf{w} \cdot \mathbf{x} + b$ (three features). The learner initializes all $w_j$ to the old scalar $w$. What does $f(\mathbf{x})$ compute for an input where all features $x_j$ equal the old single feature value $x$?
    [CORRECT] It computes $3 w x + b$, which is three times the old model's output before the bias
    [ ] It computes $w x + b$, identical to the original single-feature model output
    [ ] It computes $w x^3 + b$, cubing the feature value due to the three components
    [ ] It computes $w^3 x + b$, cubing the weight due to the dot product structure
- Q: For a classification task, a model outputs $f(\mathbf{x}) = \mathbf{w} \cdot \mathbf{x} + b$. A prediction of class 1 is made when $f(\mathbf{x}) \ge 0$. If $\mathbf{w} = [2, -1]$, $b = -3$, and $\mathbf{x} = [1, k]$, what range of $k$ gives a class 1 prediction?
    [CORRECT] $k \le -1$
    [ ] $k \ge 5$
    [ ] $k \le 1$
    [ ] $k \ge -5$
- Q: In f(x) = w·x + b, what does the dot product w·x compute?
    [ ] The output class that scores the highest
    [ ] The feature count multiplied by the bias
    [ ] The gap between the target and the prediction
    [CORRECT] The sum of paired products of weights and features
- Q: You have a dataset with one categorical feature (three levels) and one numerical feature. For a linear regression model $f(\mathbf{x}) = \mathbf{w} \cdot \mathbf{x} + b$, what must happen to the categorical feature before $\mathbf{w} \cdot \mathbf{x}$ can be computed?
    [CORRECT] It must be encoded into numerical columns, increasing the dimension of $\mathbf{x}$
    [ ] It must be multiplied by the numerical feature to form a single interaction term
    [ ] It must be treated as the scalar offset $b$ in the model equation
    [ ] It must be kept as a single column with string labels for the dot product
- Q: Given $\mathbf{w} = [3, 4]$ and $b = 0$, the set of all $\mathbf{x}$ satisfying $\mathbf{w} \cdot \mathbf{x} = 1$ forms a geometric object in the plane. Which vector is perpendicular to this object?
    [CORRECT] The weight vector $\mathbf{w}$ itself
    [ ] The point $\mathbf{x} = [3, 4]$ on the object
    [ ] The scalar value 1 representing the constant
    [ ] The difference between any two points satisfying the equation
- Q: A student claims that if every component $x_j$ in $\mathbf{x}$ is doubled, the output $f(\mathbf{x}) = \mathbf{w} \cdot \mathbf{x} + b$ also doubles. Under what condition is this claim actually correct?
    [CORRECT] The statement is true only when the scalar $b$ equals zero
    [ ] The statement is true for any value of $b$ due to the distributive property
    [ ] The statement is true only when every component $w_j$ is also doubled
    [ ] The statement is never true because $b$ is a constant unaffected by scaling
- Q: Consider a model where $\mathbf{w} = [0.5, 0.5]$ and $b = 0$. Input A is $[10, 10]$ and input B is $[20, 0]$. Both yield $f(\mathbf{x}) = 10$. What does this illustrate about the dot product as a model component?
    [CORRECT] Different feature vectors can map to the same scalar output, losing individual feature information
    [ ] The model is nonlinear because two different inputs produce the same output value
    [ ] The bias term must be nonzero to distinguish between these two inputs effectively
    [ ] The weight vector must be orthogonal to both inputs for them to produce equal outputs
- Q: A regression model is defined as $f(\mathbf{x}) = \mathbf{w} \cdot \mathbf{x} + b$. A learner computes $\mathbf{w} \cdot \mathbf{x}$ by summing the elements of a vector $\mathbf{v}$ where $v_j = w_j + x_j$. Which operation did the learner mistakenly apply?
    [CORRECT] Summing the elements of the vector after component-wise addition
    [ ] Summing the elements of the vector after component-wise multiplication
    [ ] Taking the dot product of a vector with a scalar after addition
    [ ] Applying scalar multiplication to each component before summing

### Vectorization

- Q: A dataset for binary classification contains a numerical feature $x$ (ranging from 0 to 100) and a categorical feature with 4 levels. You train a logistic regression model using one-hot encoding (3 columns, one level dropped). The model outputs $\hat{p} = \sigma(z)$ where $z = w_0 + w_1 x + \sum_{j} w_j d_j$. How many scalar parameters does this model learn in total?
    [CORRECT] Exactly 5 parameters are learned from the data.
    [ ] Exactly 6 parameters are learned from the data.
    [ ] Exactly 4 parameters are learned from the data.
    [ ] Exactly 7 parameters are learned from the data.
- Q: A linear regression model $\hat{y} = w_0 + w_1 x_1 + w_2 x_2$ is trained where $x_1$ is a numerical feature and $x_2$ is a binary indicator (0 or 1). After training, you discover that setting $x_2 = 1$ always adds exactly $3.5$ to the prediction regardless of $x_1$. What must be true about the learned parameters?
    [CORRECT] The parameter $w_2$ equals $3.5$, and $x_2$ acts as an intercept shift.
    [ ] The parameter $w_1$ equals $3.5$, and $x_2$ acts as a scaling factor.
    [ ] The parameter $w_0$ equals $3.5$, and $x_2$ acts as a dummy encoding.
    [ ] The parameter $w_2$ equals $3.5$ divided by the mean of $x_1$.
- Q: Why can vectorized code run much faster than an equivalent for-loop implementation?
    [CORRECT] Because libraries and hardware run many operations in parallel
    [ ] Because it quietly cuts down the amount of training data used
    [ ] Because it manages to avoid using any model parameters at all
    [ ] Because it swaps the learning objective for a much simpler one
- Q: Why is vectorization especially useful when writing machine learning code?
    [ ] It makes the underlying model less mathematical
    [ ] It guarantees a model with higher predictive accuracy
    [CORRECT] It usually makes the code shorter and faster to run
    [ ] It removes the need to collect training data
- Q: A student claims that after one-hot encoding a categorical feature and then applying standardization (subtract mean, divide by standard deviation), the resulting columns properly prepare the categorical variable for a regularized linear model. What is the most accurate assessment of this claim?
    [CORRECT] Standardizing binary dummy columns distorts their interpretability and is generally inadvisable.
    [ ] Standardizing binary dummy columns is essential because regularization requires all features to be zero-centered.
    [ ] Standardizing binary dummy columns is harmless but unnecessary since they are already on a 0-1 scale.
    [ ] Standardizing binary dummy columns improves model convergence because it removes multicollinearity.
- Q: You build a binary classifier using logistic regression on a mixed dataset. Feature $x_1$ is a real-valued measurement, and feature $x_2$ encodes 'Treatment' vs 'Control' as 1 and 0. You want to test whether there is an interaction effect: the treatment impact depends on the level of $x_1$. Which expanded feature set, when fed to the model, properly captures this hypothesis?
    [CORRECT] Include $x_1$, $x_2$, and a new feature computed element-wise as $x_1 \cdot x_2$.
    [ ] Include $x_1$ and $x_2$ only; the model's nonlinearity already captures interactions.
    [ ] Include $x_1$, $x_2$, and a new feature computed element-wise as $x_1 + x_2$.
    [ ] Include $x_1$, $x_2$, and replace $x_1$ with its polynomial expansion $x_1^2$.
- Q: Consider vectorized logistic regression with $m$ training examples and $n$ features. The weight vector $\mathbf{w}$ has shape $(n, 1)$ and the bias is a scalar $b$. Feature matrix $\mathbf{X}$ has shape $(m, n)$. Which vectorized expression correctly computes the raw logits $\mathbf{z}$ (an $m \times 1$ column vector) in a single NumPy operation?
    [CORRECT] Use \texttt{np.dot(X, w)} and broadcast-add the scalar $b$.
    [ ] Use \texttt{np.dot(w, X)} and broadcast-add the scalar $b$.
    [ ] Use \texttt{np.multiply(X, w)} and sum along axis 1, then add $b$.
    [ ] Use \texttt{np.dot(X, w.T)} and broadcast-add the scalar $b$.
- Q: Which statement about vectorization is a misunderstanding that should be avoided?
    [CORRECT] It is purely a cosmetic rewrite with no effect on speed
    [ ] It can improve efficiency without changing the mathematical result
    [ ] It is most beneficial when there are many features to process
    [ ] It lets code take advantage of optimized linear algebra libraries
- Q: What is the most efficient way to compute the dot product of a weight vector w and a feature vector x in Python?
    [ ] Sort the two vectors and then multiply them pairwise
    [ ] Convert both vectors to strings before combining them
    [CORRECT] Use a vectorized NumPy operation such as np.dot(w, x)
    [ ] Write out each multiplication term by hand and sum them
- Q: You have a dataset with one categorical feature 'Color' taking values Red, Green, or Blue, and you want to use it for linear regression. After one-hot encoding, you obtain three binary columns and drop the Blue column. The learned coefficient for $x_\text{Red}$ is $2.1$ and for $x_\text{Green}$ is $-1.4$. What is the predicted difference between a Red observation and an identical Blue observation?
    [CORRECT] The predicted value for Red is higher by $2.1$.
    [ ] The predicted value for Red is higher by $3.5$.
    [ ] The predicted value for Red is higher by $0.7$.
    [ ] The predicted value for Red is lower by $1.4$.
- Q: For a regression model with an intercept term, you one-hot encode a categorical feature with $k$ levels, including all $k$ columns in the design matrix without dropping any. You then run ordinary least squares. What will occur?
    [CORRECT] The design matrix becomes rank-deficient, causing the normal equations to have infinite solutions.
    [ ] The model automatically drops one redundant column and proceeds without error.
    [ ] The intercept gets perfectly estimated, but all category coefficients become biased.
    [ ] The coefficients for the $k$ columns are uniquely determined, but the intercept becomes meaningless.
- Q: You have two features: a numerical feature $x_1$ and a categorical feature with 3 levels (A, B, C). Level A is dropped during one-hot encoding. The fitted linear model gives $\hat{y} = 5 + 2x_1 - 3d_B + 4d_C$. Which of the following is an equivalent model re-parameterized with $d_A$ included and a different dropped level?
    [ ] To drop level B instead, the coefficient for $d_A$ would be 0 and the bias would remain 5.
    [CORRECT] To drop level C instead, the coefficient for $d_A$ would be $-4$ and the bias would become 9.
    [ ] To drop level B instead, the coefficient for $d_A$ would be 3 and the bias would become 2.
    [ ] To drop level C instead, the coefficient for $d_A$ would be $-4$ and the bias would become 1.

### Model Parameters: Weights and Bias

- Q: If w = 0 in the model f(x) = wx + b, what kind of prediction function results?
    [CORRECT] A flat, constant horizontal line
    [ ] A vertical line through the origin
    [ ] A two-output binary classifier
    [ ] An upward-opening parabola
- Q: In the linear model f(x) = wx + b, what does the weight w control?
    [ ] The count of the training examples
    [CORRECT] The slope, or tilt, of the line
    [ ] The stored set of target values
    [ ] The recorded prediction error value
- Q: Suppose $f(x) = w x + b$ is used for a binary classification task with target labels 0 and 1, where you apply a threshold of 0.5 after the function's output to decide the class. If $w = 0.6$ and $b = -0.2$, what happens to the classification boundary as $x$ varies?
    [CORRECT] The decision boundary falls at $x \approx 1.17$, where the function output crosses 0.5
    [ ] The decision boundary is fixed at $x = 0$, regardless of $w$ and $b$ values
    [ ] The boundary is at $x \approx -0.33$, where the raw output equals zero
    [ ] No boundary exists because binary classification requires two weights, not one
- Q: Why are the parameters w and b central to how a machine learning model learns?
    [ ] They take the place of the training data
    [CORRECT] They are tuned in training to fit data
    [ ] They only have an effect in clustering
    [ ] They are fixed before any data is seen
- Q: Two data scientists train separate linear models on identical data. Model A uses $f(x) = w x + b$ and achieves zero training error. Model B uses $f(x) = w x$ (no bias term) and also achieves zero training error. What must be true about the data?
    [ ] The data points lie exactly on a straight line passing through the origin
    [ ] The data points have identical $y$ values for every $x$
    [CORRECT] The data points are perfectly collinear and the line crosses the $y$-axis at zero
    [ ] The data has exactly two points, one of which is at $x=0, y=0$
- Q: A model is defined as $f(x) = w x + b$. During training, $w$ and $b$ are adjusted to minimize error. If the training data consists of perfect points from the line $y = 3x - 2$, but you initialize $w = 0$ and $b = 5$, what is the prediction error for an input $x = 4$ before any training occurs?
    [CORRECT] $f(4) = 5$, because the weight zeroes the input leaving only the bias
    [ ] $f(4) = 20$, because the bias multiplies with the input when weight is zero
    [ ] $f(4) = 9$, because zero weight and bias five combine to shift the line upward
    [ ] $f(4) = 12$, because the model reverses the roles of weight and bias
- Q: You fit $f(x) = w x + b$ to a dataset that has two distinct clusters of points far apart along the $x$-axis. Cluster A has $x$ values around 2, and cluster B has $x$ values around 100. The $y$ values in cluster A average 5, and in cluster B average 20. Which statement about the learned parameters is most plausible?
    [ ] A small perturbation in $b$ shifts predictions dramatically for both clusters
    [ ] The weight $w$ converges to exactly 15 divided by 98, the ratio of the cluster averages
    [ ] The bias $b$ alone determines predictions for cluster A, while $w$ alone determines predictions for cluster B
    [CORRECT] The learned model is highly sensitive: a tiny change in $w$ produces a large change in predicted $y$ for cluster B
- Q: In the model $f(x) = w x + b$, the parameters start at $w = 0$ and $b = 0$. After one gradient descent update using a single training point $(x=2, y=10)$ with learning rate $\eta = 0.1$ and mean squared error loss, what are the new parameter values?
    [ ] $w = 4$, $b = 2$
    [ ] $w = 2$, $b = 0.2$
    [CORRECT] $w = 2$, $b = 1$
    [ ] $w = 0.2$, $b = 2$
- Q: In the linear model f(x) = wx + b, what does the bias b represent?
    [ ] The total number of features
    [ ] The overall size of the dataset
    [CORRECT] The y-intercept of the line
    [ ] A value held at zero in training
- Q: You have a dataset where the input feature $x$ is a categorical code (values 0, 1, or 2 representing three types of soil) and the target $y$ is crop yield (in tons). You fit the model $f(x) = w x + b$ to this data. What limitation does this model face when making predictions for $x = 1$?
    [CORRECT] The model imposes an ordering where soil type 1 is numerically between types 0 and 2, which may not reflect reality
    [ ] The model cannot compute $y$ for categorical inputs because the multiplication $w x$ is undefined for codes
    [ ] The model requires the bias $b$ to be exactly the mean yield of soil type 1, otherwise predictions are impossible
    [ ] The model automatically treats the codes as probabilities and scales predictions to sum to one
- Q: In the model f(x) = wx + b, what are w and b together called?
    [CORRECT] The model's parameters
    [ ] The model's predictions
    [ ] The training examples
    [ ] The target output labels
- Q: A model $f(x) = w x + b$ is trained on house size $x$ (in square feet) to predict price $y$ (in dollars). The resulting parameters are $w = 120$ and $b = 15000$. A second model is trained on the same data but with $x$ rescaled to thousands of square feet (so a 2000 sq ft house becomes $x = 2$). How do the new optimal parameters compare?
    [CORRECT] $w$ becomes $120,000$ and $b$ stays $15,000$, because only the weight absorbs the unit change
    [ ] $w$ becomes $120,000$ and $b$ becomes $15$, because the bias scales inversely with the feature
    [ ] $w$ stays 120 and $b$ becomes $15,000,000$, because the bias carries the full effect of rescaling
    [ ] $w$ becomes $0.120$ and $b$ becomes $15,000$, because both parameters scale linearly with the unit
- Q: A learner claims: "If you set $w = 0$ and $b$ equals the mean of the target values in a regression dataset, the function $f(x) = w x + b$ becomes the best possible predictor." Under what condition is this claim defensibly correct?
    [CORRECT] When the loss function is mean squared error and the true relationship between $x$ and $y$ has zero slope
    [ ] When the loss function is mean absolute error and the data contains no outliers
    [ ] When the dataset has a perfectly linear relationship with slope zero
    [ ] When the feature $x$ has zero variance and the target $y$ is constant

### Tensors vs. NumPy Arrays

- Q: In TensorFlow, what is a tensor best thought of as for practical purposes?
    [CORRECT] A data structure that stores matrices and n-d arrays efficiently
    [ ] A specialized neural-network activation function applied in layers
    [ ] Another internal name for the gradient descent algorithm itself
    [ ] A scheme for encoding categorical class labels and nothing more
- Q: Which Python library is the standard tool for linear algebra and array computation that existed before TensorFlow?
    [ ] Keras
    [ ] Scikit-learn
    [CORRECT] NumPy
    [ ] PyTorch
- Q: What typically happens when you pass a NumPy array into a TensorFlow operation?
    [ ] It can no longer be converted back into an array afterward
    [CORRECT] It is converted into a TensorFlow tensor for the computation
    [ ] It is silently turned into an ordinary Python text string
    [ ] It is automatically rescaled to have a zero mean per feature
- Q: Why do NumPy and TensorFlow sometimes represent the same data in slightly different ways?
    [ ] NumPy is only ever able to represent one-dimensional vectors of numbers
    [CORRECT] They were built years apart by different teams using different conventions
    [ ] NumPy stores numbers in binary while TensorFlow stores them in decimal form
    [ ] A single team built both at the same time with fully identical conventions
- Q: Which call converts a TensorFlow tensor back into an ordinary NumPy array?
    [ ] tensor.as_array()
    [ ] tensor.to_numpy()
    [CORRECT] tensor.numpy()
    [ ] tensor.convert()
- Q: Which TensorFlow capability lets tensors record the operations applied to them so gradients can be computed for training?
    [ ] Fully manual, user-driven memory management
    [ ] A binary-only on-disk storage format
    [ ] Reliance on ordinary Python lists for storage
    [CORRECT] Automatic differentiation via computational graphs
- Q: Regarding mutability, how does a standard TensorFlow constant tensor differ from a NumPy array?
    [ ] Both can be modified only while connected to the cloud
    [ ] The tensor is mutable, while the NumPy array cannot be changed
    [ ] Both are strictly immutable once they have been created
    [CORRECT] The tensor is immutable, while the NumPy array allows in-place edits
- Q: How do you convert a TensorFlow tensor back into a NumPy array?
    [CORRECT] By calling its .numpy() method
    [ ] By transposing the tensor twice
    [ ] By applying a sigmoid to it
    [ ] By passing it through compile()
- Q: Which common misunderstanding about tensors and NumPy arrays should be avoided?
    [ ] That both of them can represent model inputs and activations
    [ ] That TensorFlow quietly maintains its own internal data format
    [CORRECT] That they are unrelated data, not two forms of similar numbers
    [ ] That conversion between the two formats is usually possible
- Q: In Python, how does a 1D vector such as [200, 17] differ from a 2D matrix such as [[200, 17]]?
    [ ] The 2D matrix is structurally unable to hold any numeric values at all
    [ ] They are completely identical to one another once they are stored in code
    [ ] The 1D vector runs faster to process but loses some numerical accuracy
    [CORRECT] The 1D vector has no row/column shape; the 2D matrix has set dimensions
- Q: Why is NumPy frequently used alongside TensorFlow in a machine learning pipeline?
    [ ] TensorFlow handles only text data and never numeric data
    [ ] TensorFlow cannot perform any mathematical operations itself
    [CORRECT] It is convenient for preprocessing and loading data before conversion
    [ ] It is required to power on and initialize the GPU
- Q: What is a key advantage of TensorFlow tensors over NumPy arrays for deep learning workloads?
    [ ] They are inherently easier for humans to read
    [ ] They remove the need to define any loss function
    [CORRECT] They run with hardware acceleration on GPUs and TPUs
    [ ] They alone are able to store floating-point numbers
- Q: Why does TensorFlow favor matrix-style (tensor) representations of data?
    [ ] It makes tensors identical to the labels
    [ ] It removes any need for hidden layers
    [CORRECT] It lets TensorFlow process data efficiently at scale
    [ ] It guarantees a higher final model accuracy
- Q: Which call is commonly used to turn a Python list or NumPy array into a TensorFlow tensor?
    [ ] tf.make_array()
    [ ] tf.create()
    [ ] tf.to_list()
    [CORRECT] tf.constant()
- Q: What is the name of the core data structure TensorFlow uses to represent matrices and multidimensional arrays?
    [ ] Series
    [ ] Column vector
    [CORRECT] Tensor
    [ ] DataFrame

### Binary Classification

- Q: Which statement about the sigmoid function (also called the logistic function) is correct?
    [CORRECT] It outputs values between 0 and 1 for any real input
    [ ] It outputs values between -1 and 1 for any real input
    [ ] It becomes linear when the input z is very large
    [ ] It returns a value of 0.5 when the input z is equal to 1
- Q: In logistic regression, if the linear function w.x+b evaluates to exactly zero, what is the predicted probability of the positive class?
    [ ] A probability of 0.
    [CORRECT] A probability of 0.5.
    [ ] A probability of 1.
    [ ] An undefined probability.
- Q: A logistic regression model for tumor classification outputs 0.7 for a new patient. What is the best interpretation of this result?
    [ ] The tumor is definitely malignant because the output is above 0.5
    [CORRECT] The model estimates a 70% chance that the tumor is malignant
    [ ] The tumor is benign because the output is less than 1.0
    [ ] The model is uncertain and needs additional features to decide
- Q: A marketing team wants to predict whether a website visitor will click on a banner ad (click or no click). Which type of machine learning problem is this?
    [ ] Predicts a continuous value like click-through rate
    [CORRECT] Predicts one of two possible outcomes
    [ ] Predicts multiple categories like age groups
    [ ] Predicts a probability using linear regression
- Q: When labeling classes in a binary classification model for fraudulent transaction detection, which statement is correct?
    [ ] The fraudulent class must always be labeled as 1.
    [CORRECT] The labeling of classes is somewhat arbitrary and can be swapped.
    [ ] The negative class must always be labeled 0.
    [ ] The positive class must always be labeled 1.
- Q: In a binary classification system for detecting fraudulent transactions, which class is conventionally called the positive class?
    [ ] The class representing legitimate transactions
    [CORRECT] The class representing fraudulent transactions
    [ ] The class that contains fewer training examples
    [ ] The class that is easier for the model to detect
- Q: A marketing analyst uses linear regression to predict binary outcomes (subscribe yes or no). The model outputs a predicted value of 1.3 for a customer. What does this indicate?
    [ ] The output indicates a 130 percent chance of subscribing, which is impossible.
    [CORRECT] The output shows the model is unsuitable since it can exceed the 0 to 1 range.
    [ ] The output of 1.3 is a valid probability that should be used directly.
    [ ] The output demonstrates that the model has excellent predictive accuracy.
- Q: Which characteristic defines a binary classification problem?
    [ ] The output variable can take any numerical value.
    [CORRECT] The output variable is restricted to two possible categories.
    [ ] The input features must be only zero or one.
    [ ] The model must use a linear regression algorithm.
- Q: A data scientist uses linear regression to classify emails as spam or not spam. After adding a long, legitimate email, the model's decision boundary shifts to the right, causing many spam emails to be misclassified as safe. Why does this happen?
    [ ] Linear regression cannot handle text features at all
    [CORRECT] Linear regression is sensitive to outliers and shifts the best-fit line
    [ ] Logistic regression requires more data to avoid such shifts
    [ ] The threshold of 0.5 is too high for linear regression models
- Q: What is a fundamental characteristic of logistic regression model outputs?
    [ ] They are always either 0 or 1 after rounding.
    [ ] They can be any real number, including negatives.
    [CORRECT] They are probabilities constrained between 0 and 1.
    [ ] They are equal to the linear combination w.x+b.

