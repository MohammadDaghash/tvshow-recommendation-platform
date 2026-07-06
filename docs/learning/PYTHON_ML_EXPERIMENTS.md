# Python ML Experiments

This project uses two recommendation layers:

- Node/Express production scoring for the live app.
- Python experiments for learning, analysis, and model comparison.

The Python layer should not replace production scoring automatically. It should
produce evidence first, then the winning idea can be ported back into the Node
runtime.

## Current Workflow

From `cinema-ws`:

```bash
npm run ml:learn-weights
```

This command:

1. Exports recommendation training rows from MongoDB into
   `.codex-private/training-data.json`.
2. Runs `ml/experiments/vector_weight_learning.py`.
3. Writes learned output to `.codex-private/learned-vector-weights.json`.

Generated files stay in `.codex-private` and must not be committed.

## What The Python Model Learns

The script trains a logistic regression model using these inputs:

```text
vectorSimilarity
tmdbRating
popularity
yearSimilarity
languagePreference
```

Labels come from user feedback:

```text
positive = accepted recommendation or rating >= 8
negative = Not Interested or rating <= 5
ignored = neutral rating or no feedback
```

The learned coefficients are normalized into candidate runtime weights, but they
are only a suggestion.

## Current Result

The first run trained on a small, imbalanced set:

```text
samples: 31
positive: 2
negative: 29
warnings: low_sample_count, low_positive_count, class_imbalance
```

This is useful as a working pipeline, but not enough evidence to replace the
current `vector-content-v1.1` runtime weights.

## Next Data Goal

Collect more positive feedback:

- Add to Want to Watch
- Add to Currently Watching
- Add to Watched with rating >= 8

The model will become more useful when positive and negative examples are less
imbalanced.
