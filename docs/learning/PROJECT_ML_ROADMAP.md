# Project ML Roadmap

## Stage 0: Repo And Project Setup

- Keep frontend, backend, and ML experiments organized.
- Keep every file below 1000 lines.
- Keep private course materials out of git.
- Document project decisions as the recommendation system evolves.

## Stage 1: Clean Data Collection

- Ensure user accounts and private lists work reliably.
- Store watched, want-to-watch, currently-watching, and rating data per user.
- Keep demo/admin catalog data separate from normal user data.

## Stage 2: Ratings, Interests, Interactions, And Recommendation Logs

- Store explicit ratings.
- Store explicit user interests.
- Store raw interaction events.
- Store recommendation logs for each model/version.
- Store recommendation feedback such as accepted, ignored, watched, and rated.

## Stage 3: Popularity Baseline

- Rank shows using simple aggregate behavior.
- Use this as the first measurable baseline.
- Track acceptance and conversion metrics.

## Stage 4: Genre-Vector Content-Based Recommender

- Convert shows into genre/metadata vectors.
- Convert user behavior into taste vectors.
- Use dot product or cosine similarity for ranking.
- Keep score breakdowns explainable.

## Stage 5: React Recommendation UI

- Show why each recommendation appears.
- Keep recommendation actions easy to use.
- Collect feedback naturally from user actions.

## Stage 6: Evaluation Notebook

- Export anonymized interactions.
- Compute baseline metrics.
- Compare recommendation versions.
- Use uncertainty estimates when judging improvements.

## Stage 7: Hybrid Ranking

- Combine content similarity, popularity, feedback, and user-specific behavior.
- Keep the system interpretable enough to debug.
- Avoid overfitting sparse user data.

## Stage 8: Optional Scikit-Learn Model

- Train an accept/ignore classifier or rating predictor.
- Use scikit-learn only after enough real interactions exist.
- Validate offline before integrating into production ranking.

## Stage 9: README And CV Polish

- Explain the product goal.
- Explain the data pipeline.
- Explain the recommendation stages.
- Include metrics and screenshots.
- Show how probability, statistics, and ML concepts were applied naturally.
