# SOURCE PACK — Machine Learning / Recommender Systems / Collaborative Filtering

There is NO authored doc.md for this lesson. This pack is the ground truth.

## Topics, in order (headings must match these VERBATIM)

1. User Parameters and Item Features   (4 questions)
2. Recommender Systems with Per-Item Features   (5 questions)
3. Collaborative Filtering for Recommender Systems   (10 questions)
4. Learning Item Features from User Ratings   (4 questions)
5. Collaborative Filtering Without Hand-Crafted Features   (5 questions)
6. Joint Optimization of User Parameters and Item Features   (5 questions)
7. TensorFlow AutoDiff for Collaborative Filtering   (5 questions)
8. Mean Normalization in Recommender Systems   (5 questions)
9. Cold Start for New Users   (5 questions)
10. Binary Label Recommender Systems   (5 questions)
11. Logistic-Style Collaborative Filtering   (5 questions)

## The live quiz bank for these topics — 58 question(s)

These already exist and already define what the learner is examined on. Every claim you
teach must be consistent with them, and every concept they test must appear in your guide.

### User Parameters and Item Features

- Q: Why is representing recommendation through user-preference parameters and item-feature values useful?
    [ ] It works only when ratings are strictly binary, such as like or dislike
    [CORRECT] It frames recommendation as measuring how well a user's tastes fit an item
    [ ] It forces every single user to end up preferring the very same set of items
    [ ] It lets the system make accurate predictions without any observed data at all
- Q: In a recommender system, what do a user's parameters represent?
    [ ] A single fixed class label permanently assigned to that user
    [CORRECT] Numbers describing the user's preferences over item features
    [ ] The total count of distinct movies the user has watched so far
    [ ] The learning rate the optimizer applies while training the model
- Q: In a recommender system, what do an item's features represent?
    [ ] Only how many ratings the item has received
    [CORRECT] Numbers describing the attributes of that item
    [ ] The current value of the cost function
    [ ] The identity of the user currently logged in
- Q: Conceptually, how is a predicted rating formed from a user's parameters and an item's features?
    [ ] By treating the anomaly score as the rating label
    [ ] By assigning the item to its nearest centroid
    [ ] By taking the largest rating found anywhere in the data
    [CORRECT] By comparing the user's preferences with the item's features

### Recommender Systems with Per-Item Features

- Q: Which statement about per-item-feature recommenders is a misconception you should avoid?
    [ ] Different users can hold genuinely different preferences over the same features
    [CORRECT] Recommendations come only from popularity, not from matching features to tastes
    [ ] This approach differs from a system built purely on fixed hand-crafted rules
    [ ] Item attributes can be combined with each user's tastes to personalize results
- Q: Conceptually, how does the model use per-item features to predict a rating?
    [ ] It orders items by title alphabetically and recommends from the top
    [ ] It groups item feature vectors into K centroids and assigns each a label
    [CORRECT] It matches a user's learned preferences against each item's features
    [ ] It predicts each item's feature vector from its listed price alone
- Q: Why can per-item features help a recommender system?
    [CORRECT] They give structured information about what each item is like
    [ ] They are useful only for detecting anomalies
    [ ] They let the system work without any users at all
    [ ] They make every recommendation identical for all users
- Q: In a movie recommender, which of these is an example of a per-item feature?
    [ ] The anomaly-detection threshold epsilon
    [ ] The total number of users in the dataset
    [CORRECT] How much romance or action the movie contains
    [ ] Whether the user feels tired today
- Q: What is a recommender system with per-item features?
    [CORRECT] A system that draws on known item attributes, such as genre, to make recommendations
    [ ] A step-by-step procedure for selecting the best value of K within the K-means method
    [ ] A recommender that deliberately ignores every available item attribute when predicting
    [ ] A clustering algorithm that groups only the users together by their ratings

### Collaborative Filtering for Recommender Systems

- Q: Which statement is true about binary labels in recommender systems?
    [CORRECT] They capture engagement such as a click, like, or full view
    [ ] They apply only to five-star rating scales and nothing else
    [ ] They encode the calendar year in which an item was produced
    [ ] They can take on infinitely many distinct continuous values
- Q: What is the core goal of collaborative filtering?
    [ ] To predict house prices from square footage and location
    [ ] To partition the users into exactly K fixed, disjoint groups
    [ ] To flag anomalies hidden within raw transaction log data
    [CORRECT] To recommend items by learning patterns in user-item ratings
- Q: When a user has not yet rated a particular movie, what is the recommender's goal?
    [CORRECT] To predict how that user would likely rate the movie
    [ ] To remove that user's record from the dataset
    [ ] To assign the movie a uniformly random rating
    [ ] To require the user to rate the movie at once
- Q: Which statement about collaborative filtering is a misconception you should avoid?
    [ ] It is well suited to recommendation tasks
    [ ] It learns its patterns from observed ratings across many users
    [ ] It can estimate ratings that are currently missing
    [CORRECT] It needs a hand-written rule for every user-item pair
- Q: In a movie recommender, what does the label y(i, j) represent?
    [ ] The total running time of movie i
    [ ] The calendar year movie i was released
    [ ] The display name of user j
    [CORRECT] The rating that user j gave to movie i
- Q: What is the core idea behind collaborative filtering?
    [ ] Removing every item that has received low ratings
    [ ] Recommending items based solely on their listed price
    [ ] Hand-labeling each individual user's preferences in advance
    [CORRECT] Using many users' ratings of many items to find patterns
- Q: What kind of data is central to a collaborative filtering system?
    [ ] Only the price and text description of each item
    [CORRECT] A table of user ratings or preferences for items
    [ ] A list of preset anomaly-detection thresholds
    [ ] Only demographic labels attached to each user
- Q: Why is the economic value of recommender systems considered very large for many companies?
    [ ] They eliminate any need to maintain a website
    [CORRECT] They drive a large share of sales via relevant suggestions
    [ ] They collect trillions of dollars in fees from users
    [ ] They directly lower the retail price of each item
- Q: Why is the approach called collaborative filtering?
    [CORRECT] Because recommendations emerge from the collective behavior of many users
    [ ] Because each candidate item is carefully reviewed and approved by a moderator
    [ ] Because the users are manually grouped into teams that pick out items together
    [ ] Because two entirely separate models must actively collaborate to run it
- Q: Why can collaborative filtering recommend a movie that a particular user has not yet rated?
    [ ] It reads and memorizes the full text of each movie's script
    [ ] It can only ever recommend items that the user has already rated
    [ ] It disregards all ratings and recommends movies entirely at random
    [CORRECT] It infers the missing preference from similar users and items

### Learning Item Features from User Ratings

- Q: Why can user ratings reveal hidden item features only indirectly?
    [ ] Because every user is assumed to rate all of the items identically
    [CORRECT] Because ratings reflect how users respond to shared item properties
    [ ] Because every rating embeds the item's full plot synopsis verbatim
    [ ] Because each rating is simply an average of the item's own timestamps
- Q: What makes the item features learned by collaborative filtering "latent"?
    [ ] They are produced exclusively by the K-means algorithm
    [ ] They are by definition impossible to ever interpret
    [ ] They reside only inside the held-out test set
    [CORRECT] They are hidden variables inferred from data, not given labels
- Q: Which kind of item feature might collaborative filtering learn even though no one labeled it in advance?
    [ ] The number of gradient-descent steps taken while training the model
    [ ] The precise legal copyright registration status of the given movie
    [CORRECT] A latent trait such as how romantic or action-heavy a movie feels
    [ ] The strength of the rating user's stored login account password
- Q: In collaborative filtering, how are item features obtained when they are not provided in advance?
    [ ] They are fixed to one identical value that is shared across all items
    [ ] They are copied directly from the raw text of each item's own title
    [CORRECT] They are inferred so that, with user parameters, they explain ratings
    [ ] They are drawn at random just once and then left permanently unchanged

### Collaborative Filtering Without Hand-Crafted Features

- Q: Why can the features learned by collaborative filtering be more powerful than fixed human-defined descriptors?
    [ ] They are guaranteed to match named genre categories exactly
    [ ] They let the system recommend without users rating anything
    [CORRECT] They are tuned to help predict ratings, not bound by human labels
    [ ] They make every learned dimension fully human-interpretable
- Q: In collaborative filtering that does not use hand-crafted item features, what is a key appeal of the approach?
    [ ] It produces recommendations without any optimization step
    [CORRECT] It learns useful item characteristics directly from ratings data
    [ ] It works only when the dataset contains no users yet
    [ ] It needs a manually written attribute vector for every item
- Q: Which statement about collaborative filtering that learns features from ratings is a misunderstanding to avoid?
    [CORRECT] It cannot function unless every item has manual features
    [ ] Observed ratings can serve as a learning signal for features
    [ ] Learning features from data is a strength of the method
    [ ] The algorithm can infer item representations from rating patterns
- Q: Why is learning item features from ratings useful compared with relying only on hand-crafted item features?
    [ ] Learned features cannot generalize beyond the training items
    [ ] Hand-crafted feature vectors are essentially always optimal
    [CORRECT] Manual features can miss preference dimensions that data reveals
    [ ] Learned features eliminate the need for any rating data
- Q: When a collaborative filtering model uses no hand-crafted item features, what is it actually learning?
    [ ] The exact written review text users wrote for each given item
    [CORRECT] Latent item features and user preferences that explain ratings
    [ ] Only the single global average rating taken across all the items
    [ ] One single clustering label assigned to each individual user

### Joint Optimization of User Parameters and Item Features

- Q: When user parameters and item features are learned together, what objective is being minimized?
    [CORRECT] The prediction error on the observed ratings
    [ ] The Gaussian variance estimated for each feature
    [ ] The total number of items that remain unrated
    [ ] The hinge loss used to train support vector machines
- Q: Why is it important to optimize user parameters and item features jointly?
    [ ] Because users and items are best learned with no shared interaction at all
    [CORRECT] Because good user preferences depend on good item features and vice versa
    [ ] Because it lets the model skip defining any cost function whatsoever
    [ ] Because doing so guarantees exactly correct ratings for every single pair
- Q: Which statement about jointly optimizing user parameters and item features is a misunderstanding to avoid?
    [ ] Joint learning is central to how collaborative filtering works
    [CORRECT] User parameters can be learned correctly while ignoring item features
    [ ] Both sides are fit together to explain the observed ratings
    [ ] The optimization couples the user and item quantities together
- Q: In collaborative filtering, which quantities are optimized jointly?
    [ ] Only the displayed titles assigned to items
    [ ] Only the threshold used for anomaly detection
    [ ] The cluster count and the centroid locations
    [CORRECT] User parameters and item features at the same time
- Q: Conceptually, how should you think about the user parameters and item features that are learned together?
    [ ] As two separate models that never influence one another at all
    [ ] As fixed constants chosen up front before any rating is observed
    [ ] As discrete labels handed out by a preliminary clustering step
    [CORRECT] As cooperating representations that must fit to explain ratings

### TensorFlow AutoDiff for Collaborative Filtering

- Q: Which statement about using TensorFlow for collaborative filtering is a misunderstanding to avoid?
    [CORRECT] TensorFlow only aids standard neural nets and cannot optimize this
    [ ] Collaborative filtering still involves optimizing parameters
    [ ] TensorFlow can cut down the calculus you do by hand
    [ ] AutoDiff can be applied to custom cost functions
- Q: When using AutoDiff for collaborative filtering, what is the main thing you must supply?
    [ ] A manually built decision tree
    [ ] Only the final list of recommended movies
    [CORRECT] Code that computes the cost function J
    [ ] The exact gradient formulas worked out by hand
- Q: Why is AutoDiff especially helpful for collaborative filtering specifically?
    [ ] Because the collaborative filtering model turns out to have no free parameters to fit
    [ ] Because relying on it altogether removes any need to collect observed rating data
    [CORRECT] Because its cost function does not match standard Dense layers yet must be optimized
    [ ] Because it somehow guarantees the resulting recommendations are exactly correct
- Q: What is TensorFlow AutoDiff mainly used for when training a collaborative filtering model?
    [ ] Selecting how many hidden layers the network ought to use overall
    [ ] Replacing the observed rating data with the learned item features
    [ ] Clustering the movies into groups before the training run begins
    [CORRECT] Automatically computing derivatives of the model's cost function
- Q: Which TensorFlow tool provides the automatic differentiation used here?
    [CORRECT] tf.GradientTape
    [ ] tf.keras.metrics
    [ ] tf.data.Dataset
    [ ] tf.Sequential

### Mean Normalization in Recommender Systems

- Q: Why does mean normalization help for a new item or user that has little rating data?
    [ ] It removes any need to ever collect rating data from new users
    [ ] It converts the recommendation task into pure anomaly detection
    [CORRECT] It gives a sensible baseline instead of forcing predictions to zero
    [ ] It guarantees flawless cold-start recommendations every single time
- Q: What does mean normalization do in a recommender system?
    [CORRECT] It subtracts an item's average rating so the model learns deviations
    [ ] It rescales all of the input features to unit variance and nothing else
    [ ] It divides each observed rating by the total number of users seen
    [ ] It permanently replaces every one of the missing ratings with zero
- Q: After ratings are mean-normalized, what does the model actually learn to predict?
    [ ] The exact missing ratings with zero uncertainty
    [ ] The number of clusters present in the user matrix
    [CORRECT] How each user deviates from an item's average rating
    [ ] The single most popular movie across all users
- Q: After training on mean-normalized data, how is a final predicted rating recovered?
    [ ] By multiplying the prediction by a small epsilon
    [ ] By keeping the item mean and discarding the prediction
    [CORRECT] By adding the item's mean back to the predicted deviation
    [ ] By snapping the result to the nearest centroid
- Q: Which statement about mean normalization is a misunderstanding to avoid?
    [CORRECT] It permanently erases the original rating scale rather than just shifting it
    [ ] It is especially useful in settings where the rating data happen to be sparse
    [ ] The item mean can always be added back onto a normalized prediction later on
    [ ] It changes which underlying quantity the model is actually learning to predict

### Cold Start for New Users

- Q: When asking a new user to rate a few items to ease cold start, why choose those items carefully?
    [CORRECT] Because informative items reveal a user's preferences faster than random ones
    [ ] Because mean normalization stops mattering the very moment a new user exists
    [ ] Because every single item happens to convey exactly the same information overall
    [ ] Because brand-new users are simply not permitted to rate the most popular items
- Q: What is the cold-start problem for new users in a recommender system?
    [ ] The Gaussian variance used by the model is too small
    [CORRECT] A new user lacks enough ratings for the system to personalize
    [ ] The recommender's servers have gone offline
    [ ] Every item feature vector has become all zeros
- Q: Why is the cold-start problem difficult in collaborative filtering?
    [ ] Because the catalog of items is always too small
    [CORRECT] Because there is little data to infer the user's preferences
    [ ] Because collaborative filtering cannot make use of ratings
    [ ] Because every new user is known to like the average item
- Q: Which general strategy can begin to address the cold-start problem for a new user?
    [CORRECT] Asking the new user to rate a few items up front
    [ ] Pinning the user to one random cluster permanently
    [ ] Switching the system over to anomaly detection
    [ ] Excluding the new user from training from now on
- Q: Which statement about the cold-start problem is a misunderstanding to avoid?
    [ ] Some initial ratings are usually needed to estimate preferences
    [ ] Sparse early data makes the new-user case challenging
    [CORRECT] Collaborative filtering can personalize perfectly with no signals
    [ ] Thoughtful recommender design can partly mitigate it

### Binary Label Recommender Systems

- Q: With binary engagement labels, how does the recommendation goal change?
    [CORRECT] It estimates the likelihood of a positive interaction
    [ ] It learns nothing beyond each item's popularity
    [ ] It predicts a continuous value such as a house price
    [ ] It abandons personalizing results for each user
- Q: Why might binary labels be more natural than star ratings in some recommender applications?
    [ ] Binary labels remove all uncertainty from predictions
    [CORRECT] Many systems observe click or no-click, not numeric scores
    [ ] Binary labels are only ever helpful for clustering tasks
    [ ] Computing star ratings is mathematically impossible
- Q: Which statement about binary-label recommender systems is a misunderstanding to avoid?
    [ ] The learning objective shifts with the type of label used
    [ ] Some applications naturally use yes-or-no interaction labels
    [CORRECT] Recommenders must always predict multi-level star ratings
    [ ] Recommendations can still be personalized per user
- Q: How does the task change when a recommender system uses binary labels instead of numeric ratings?
    [ ] It assigns the identical engagement prediction to every single item
    [ ] It must cluster all of the data before any training can begin
    [ ] It stops modeling individual users and predicts one global label
    [CORRECT] It predicts whether a user will engage rather than a 1-to-5 score
- Q: Which of the following is an example of a binary label in a recommender system?
    [ ] A movie that received a rating of 4.5 stars
    [ ] The average variance of the item's features
    [CORRECT] Whether the user clicked on or purchased the item
    [ ] The exact running time of a movie in minutes

### Logistic-Style Collaborative Filtering

- Q: Which statement about logistic-style collaborative filtering is a misunderstanding to avoid?
    [ ] A sigmoid is used to produce the binary-style output
    [ ] It adapts collaborative filtering to handle binary labels
    [CORRECT] Binary recommendation first requires predicting 1-to-5 star values
    [ ] It can directly estimate a probability-like chance of interaction
- Q: Why is logistic-style collaborative filtering similar in spirit to logistic regression?
    [CORRECT] It passes a score through a sigmoid to model binary outcomes
    [ ] It works only when the data are linearly separable
    [ ] It ignores the observed labels during training
    [ ] It predicts an unlimited number of distinct rating levels
- Q: When collaborative filtering is adapted to binary labels with a sigmoid, what does the model's output represent?
    [ ] The index of the user's assigned centroid
    [ ] The total number of users in the rating matrix
    [CORRECT] The estimated chance of positive user engagement
    [ ] A real-valued price assigned to the movie
- Q: In logistic-style collaborative filtering, what is applied to the raw user-item score to produce the prediction?
    [ ] A square-root normalization step
    [ ] A k-means clustering assignment
    [ ] A contour-plot transformation
    [CORRECT] A logistic sigmoid function
- Q: Why is logistic-style collaborative filtering well suited to binary labels such as click or no-click?
    [ ] It guarantees a perfectly correct ranking across all the candidate items
    [CORRECT] It maps each user-item score to a value in (0, 1) read as a probability
    [ ] It can only ever be trained as a plain real-valued regression model
    [ ] It discards the learned item feature vectors entirely before scoring

