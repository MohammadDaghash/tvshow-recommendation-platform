# Learning Map

## Stage 1: Data Collection

Relevant concepts:

- observations and samples
- user-item interactions
- raw versus derived data
- sampling bias

Project use:

- store ratings, statuses, interests, impressions, card opens, and feedback as raw events
- separate demo/admin data from real user data
- avoid training future models on mixed private/demo behavior

## Stage 2: Popularity Baseline

Relevant concepts:

- counts
- proportions
- expectation
- variance

Project use:

- rank shows by watchlist adds, watched conversions, ratings, and accepted suggestions
- use baseline metrics before adding ML
- compare future ML models against a simple baseline

## Stage 3: Content-Based Recommender

Relevant concepts:

- vectors and matrices
- dot products
- cosine similarity
- feature scaling
- conditional preferences

Project use:

- encode genres and metadata as feature vectors
- compare user taste vectors against candidate show vectors
- keep scoring explainable with score breakdowns

## Stage 4: Evaluation

Relevant concepts:

- train/test separation
- uncertainty
- confidence intervals
- hypothesis testing
- regression diagnostics

Project use:

- measure impression-to-accept rate
- measure accepted suggestion rating quality
- compare model versions before replacing production scoring
- track recommendation logs for offline evaluation

## Stage 5: Hybrid Ranking

Relevant concepts:

- weighted combinations
- supervised learning
- logistic regression
- decision trees and ensembles

Project use:

- combine content similarity, popularity, user history, and feedback
- predict whether a user will accept or rate a recommendation highly
- use model output as one ranking signal, not as opaque truth

## Stage 6: Optional Scikit-Learn Model

Relevant concepts:

- feature engineering
- feature scaling
- model evaluation
- classification and regression

Project use:

- export anonymized training rows
- train an offline accept/ignore classifier
- validate before serving predictions in the app
