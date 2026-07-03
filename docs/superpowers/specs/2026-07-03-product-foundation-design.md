# Product Foundation Design

## Goal

Keep the TV show recommendation platform moving toward its core purpose: collect private user ratings, watch-list actions, and interest signals so recommendations can become more accurate over time, while keeping the codebase maintainable and every file below 1000 lines.

## Architecture

The project should stay a modular monolith for now. True network microservices would add deployment, auth, database, and observability overhead before the recommendation product has enough traffic or training data to justify it. Instead, the code should use microservice-style boundaries: focused frontend hooks, backend models/controllers/services, and small utility modules with clear responsibilities.

The first implementation slice splits `client-react/src/App.jsx`, because it is already near the 1000-line ceiling. Data fetching, auth/session helpers, library derivation, and card/action handlers should move into focused modules without changing routes, API behavior, admin behavior, demo mode, or recommendation behavior.

The second slice adds first-party interaction event collection. User actions such as card views, status moves, watched ratings, ignored suggestions, and accepted AI suggestions should be captured as structured backend events for logged-in users. This creates the data foundation for later ML work without changing today’s scoring model.

The third slice is visual polish. The current premium cinematic direction should be strengthened with glass depth, card shadows, hover/press motion, and modal/carousel refinement, while keeping the UI clean and avoiding noisy color.

## Data Flow

Logged-out visitors continue to use demo/public data. Normal logged-in users see only private user state. Admin users keep public/demo catalog behavior. Interaction events are only recorded for authenticated non-demo actions and include enough metadata for later model training: event type, user, TV show or TMDB id, status, rating when present, source page, and score metadata when available.

## ML Direction

The current recommendation service should remain in place. Later, interaction events can feed a hybrid system:

- Content-based profile from genres, metadata, ratings, and ignored items.
- Collaborative filtering once enough users and ratings exist.
- Explainable scoring so users can see why a show is recommended.

Public repo research supports this sequence: start with content-based and explicit ratings, keep model serving separated from product APIs, and only add collaborative or neural methods after useful interaction volume exists.

## Testing

The line-count guard remains mandatory. New backend data logic needs unit tests before implementation. Frontend refactors should preserve existing tests and add focused tests only when behavior changes. Visual polish is verified through build and local browser checks rather than snapshot churn.
