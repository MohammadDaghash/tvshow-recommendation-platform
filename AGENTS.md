# TV Show Recommendation Platform Agent Guide

## Project Goal

Build a full-stack TV show recommendation platform that collects user ratings, interests, watch history, and interaction data so recommendations can become more accurate over time. Machine learning should come after the data model, app structure, and evaluation foundation are clean.

## Current Priority

Prepare the app to collect useful recommendation data:

- private user ratings
- watched / want / currently watching status
- explicit interests
- interaction events
- recommendation impressions
- recommendation feedback

Do not jump to advanced ML before these signals are reliable.

## Build Order

1. Clean data models and ownership boundaries.
2. Collect raw user behavior and feedback.
3. Add analytics and evaluation metrics.
4. Build a popularity baseline.
5. Improve content-based recommendations with genre vectors and metadata.
6. Add recommendation logs and compare model versions.
7. Add hybrid ranking when enough real user data exists.
8. Add optional scikit-learn experiments.
9. Polish README, demo story, and CV/project explanations.

## Coding Rules

- Keep each source file below 1000 lines.
- Prefer focused modules, services, hooks, and helpers over large files.
- Preserve auth, admin mode, demo mode, private user data, and current recommendation behavior unless a task explicitly changes them.
- Use tests for behavior changes.
- Keep generated files, private files, build output, and course books out of git.
- Do not rewrite the app architecture unless the existing structure blocks the task.

## Course And Private Material Rules

The probability/statistics course PDFs and other course books are private reference material only.

- Do not upload, copy, commit, or require original course books in this repository.
- Do not quote long passages from private course material.
- If course material is useful, write short project-specific summaries in original words.
- The repository may contain code, docs, generated summaries, instructions, and project-specific learning maps.
- The repository must not contain original PDFs, EPUBs, DJVU files, or private course-book folders.

## Learning Sources To Use When Relevant

- Probability and statistics: observations, samples, random variables, user-item interactions, sampling bias, conditional probability, expectation, variance, estimation, hypothesis testing, regression, and evaluation uncertainty.
- Machine Learning Specialization: vectors, matrices, dot products, cosine similarity, feature engineering, feature scaling, scikit-learn, model evaluation, supervised learning, unsupervised learning, and recommender systems.
- MSc statistics/data science topics: statistical inference, optimization, statistical learning theory, high-dimensional statistics, simulation, and deep learning when the project is ready.

## Main Rule

Use statistics and ML concepts only when they naturally improve the product. Do not force theory into unrelated code.
