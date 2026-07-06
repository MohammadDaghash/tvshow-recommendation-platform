# ML Interview Deep Dive

This document explains the recommendation system as a statistics and machine
learning project, not just as an app feature.

It does not copy private course material. It translates relevant probability,
statistics, and ML ideas into this project's own design.

## One-Sentence Project Pitch

I built a full-stack TV recommendation platform that collects user ratings,
watch-list behavior, recommendation impressions, and feedback, then uses
content-based vectors, supervised labels, and statistical evaluation to improve
recommendations over time.

## The Data Science Problem

The app is trying to estimate:

```text
P(user will like show | user history, show metadata, recommendation context)
```

That probability is not observed directly. The system observes noisy signals:

- user rated a show highly
- user added a show to Want to Watch
- user started watching
- user marked Not Interested
- user opened a recommendation card
- user ignored a recommendation

Each event is an observation from a user-item interaction process.

## Random Variables

For a user `u` and show `i`:

```text
X_ui = feature vector for user-show pair
Y_ui = feedback label
S_ui = model score
R_ui = explicit user rating, if available
```

`Y_ui` is treated like a Bernoulli random variable:

```text
Y_ui = 1 if user accepts or rates highly
Y_ui = 0 if user rejects or rates poorly
```

Neutral behavior, such as no click or a middle rating, is not automatically
treated as negative. This matters because "not observed" is not the same as
"disliked."

## Feature Engineering

Each show becomes a vector:

```text
show_vector = [
  genre indicators,
  normalized TMDB rating,
  normalized popularity,
  normalized year,
  language preference
]
```

The current canonical genre dimensions are:

```text
Comedy
Drama & Romance
Action & Adventure
Mystery & Thriller
Science-Fiction & Fantasy
Anime
Horror
Legal
History
Other
```

The user taste vector is a weighted average of watched-show vectors:

```text
taste_vector_u =
  sum(rating_weight_ui * show_vector_i) / sum(abs(rating_weight_ui))
```

High ratings push the vector toward a genre/metadata pattern. Low ratings can
push it away.

## Cosine Similarity

The content-based score uses cosine similarity:

```text
cosine(a, b) = (a . b) / (||a|| ||b||)
```

Why cosine?

- It compares direction, not raw magnitude.
- It works well for sparse genre vectors.
- It is explainable: similar features create a higher score.

In interview terms:

> I used cosine similarity because I wanted a stable, interpretable content-based
> baseline before moving to a more complex model.

## Runtime Score

The production model currently uses:

```text
score =
  0.75 * vectorSimilarity
+ 0.10 * tmdbRating
+ 0.05 * popularity
+ 0.05 * yearSimilarity
+ 0.05 * languagePreference
```

This is `vector-content-v1.1`.

The key engineering choice is that the score is decomposable. Every card can
explain why it was recommended.

## Leave-One-Out Evaluation

To evaluate the model with sparse data, the project uses leave-one-out testing.

For each highly rated watched show:

1. Remove that show from the user's history.
2. Build a taste vector from the remaining watched shows.
3. Rank candidate shows.
4. Check whether the hidden liked show appears near the top.

This answers:

```text
If the system had not known one liked show, could it recover it from taste?
```

Current command:

```bash
cd cinema-ws
npm run experiment:vector
```

Current result:

```text
Leave-one-out cases: 24
Best preset: taste_heavy
hit@20: 1.000
MRR: 0.185
nDCG@20: 0.362
```

Interpretation:

- `hit@20 = 1.0`: the hidden liked show appeared somewhere in the top 20.
- `MRR = 0.185`: the average reciprocal rank is still modest, so many hits are
  not near rank 1.
- `nDCG@20 = 0.362`: useful ranking signal exists, but ordering can improve.

This is a good interview point: the model works as a baseline, but evaluation
shows exactly where it is weak.

## Supervised Learning Layer

The Python experiment turns recommendation feedback into a labelled dataset.

Command:

```bash
cd cinema-ws
npm run ml:learn-weights
```

The supervised model is logistic regression:

```text
p(Y = 1 | x) = sigmoid(w . x + b)
sigmoid(z) = 1 / (1 + exp(-z))
```

The model learns weights for:

```text
vectorSimilarity
tmdbRating
popularity
yearSimilarity
languagePreference
```

The loss function is binary cross-entropy:

```text
L = - mean(y log(p) + (1-y) log(1-p))
```

This is appropriate because feedback is binary:

```text
accepted/high rating = 1
ignored/low rating = 0
```

## Why Logistic Regression First

Logistic regression is intentionally simple.

Advantages:

- works with small datasets better than deep models
- produces interpretable coefficients
- estimates probabilities
- supports calibration metrics
- can be explained clearly in an interview

I would not start with a neural network because the dataset is too small and too
sparse. A neural network would likely overfit and would be harder to debug.

## Statistical Diagnostics

The Python experiment now reports:

```text
sample count
positive count
negative count
Wilson confidence interval for positive rate
Brier score
log-loss
expected calibration error
bootstrap confidence interval for Brier score
```

Current result:

```text
samples: 31
positive: 2
negative: 29
positive label rate: 0.0645
Wilson CI: [0.0179, 0.2072]
Brier score: 0.1599
log-loss: 0.5042
ECE: 0.3474
Brier bootstrap CI: [0.1276, 0.1967]
```

Interpretation:

- The model technically trains.
- The dataset is highly imbalanced.
- The positive-rate confidence interval is wide.
- The learned weights should not be trusted for production yet.

This is strong statistically because it avoids pretending a model is good just
because a metric looks good on tiny data.

## Wilson Confidence Interval

For a binomial proportion such as positive feedback rate, the project uses a
Wilson interval instead of just:

```text
p_hat = positives / total
```

Why?

With small samples, the naive estimate is unstable. The Wilson interval gives a
more honest uncertainty range.

Interview phrasing:

> I reported the positive feedback rate with a Wilson confidence interval because
> the sample is small and imbalanced. That prevents overconfidence in early model
> results.

## Bootstrap Uncertainty

For metrics such as Brier score, the project uses bootstrap resampling.

Idea:

1. Sample the labelled rows with replacement.
2. Recompute the metric many times.
3. Use the empirical distribution as an uncertainty estimate.

This helps answer:

```text
How much could this metric move if the observed sample changed slightly?
```

## Calibration

A recommender should not only rank items; it should estimate useful
probabilities.

The project tracks:

- Brier score: mean squared error of predicted probabilities
- log-loss: penalty for confident wrong predictions
- expected calibration error: gap between confidence and observed frequency

Example:

```text
If the model says 80% probability, about 80% of those items should eventually be
positive.
```

With the current sparse data, calibration is not production-ready yet.

## Bias And Data Limitations

The biggest limitation is selection bias:

- users only rate shows they already watched
- Not Interested creates more negative labels than positive labels
- demo/admin behavior is useful but not representative of many users
- TMDB popularity can bias toward globally popular shows

The project handles this by:

- separating raw events from derived labels
- preserving model versions
- logging recommendation impressions
- reporting class imbalance warnings
- avoiding automatic deployment of weak Python-learned weights

## Why The Python Weights Were Not Deployed

The Python model learned:

```text
samples: 31
positive: 2
negative: 29
warnings: low_sample_count, low_positive_count, class_imbalance
```

That is enough to prove the training pipeline works, but not enough to trust the
coefficients. The production model stays on the measured content-based
`vector-content-v1.1` weights until more positive labels exist.

This is an important interview signal: I can build ML, but I also know when not
to deploy it.

## How I Would Explain The Architecture

```text
Frontend actions
  -> raw interaction events
  -> recommendation logs
  -> labelled training rows
  -> offline Python experiments
  -> evaluated candidate weights
  -> production Node scoring
  -> new model version logs
```

The app separates:

- online serving: fast, explainable, Node-based
- offline learning: Python, sklearn, diagnostics, uncertainty

## Job Interview Answer

If asked "Where is the ML?", answer:

> The live model is an interpretable content-based recommender. I encode each TV
> show as a feature vector using genre and metadata, build a user taste vector
> from ratings, and use cosine similarity plus calibrated metadata weights for
> ranking. I also log every recommendation and feedback event, export the data,
> and run Python experiments with logistic regression to learn whether the score
> components predict accept/ignore behavior. Because the current labelled data is
> small and imbalanced, I report Wilson confidence intervals, Brier score,
> log-loss, calibration error, and bootstrap intervals before deciding whether to
> deploy learned weights.

If asked "Why not deep learning?", answer:

> The dataset is not large enough yet. I chose an interpretable model first
> because it gives a strong baseline, supports explainability, and lets me collect
> better training data. Once the label volume grows, I can compare logistic
> regression, matrix factorization, gradient boosting, and neural recommenders
> against the same logged evaluation pipeline.

If asked "How would you improve it next?", answer:

> I would collect more balanced feedback, especially positive labels, then move
> from hand-tuned weights to a hybrid model. I would evaluate ranking metrics such
> as nDCG and MRR, probability metrics like Brier score, and use bootstrap
> intervals to avoid overfitting to small samples.

## Next ML Upgrade

The strongest next technical step is negative-feedback learning:

- Not Interested should not only remove that exact show.
- It should reduce the score of similar future shows.
- Low ratings should contribute negative taste weights.
- The effect should decay as the user adds more positive evidence.

This can be implemented as:

```text
adjusted_taste_vector =
  positive_profile_vector - lambda * negative_profile_vector
```

Then tune `lambda` offline with leave-one-out and feedback logs.
