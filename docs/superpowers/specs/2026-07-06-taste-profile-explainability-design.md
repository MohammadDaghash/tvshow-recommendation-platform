# Taste Profile Explainability Design

## Goal

Add a premium, editable taste profile surface that shows what the recommender currently thinks a user likes and dislikes, and add a dynamic feature weights report that explains how ratings, list actions, ignored suggestions, and explicit keywords affect recommendation scores.

This feature should make the recommendation engine easier to trust and easier to discuss in interviews: the app should show the math-facing signals behind the AI Suggestions page without pretending that a production-grade ML model already exists.

## Product Behavior

### Taste Profile Explainability Panel

The panel shows a user/admin a readable summary of their current taste profile:

- liked genres inferred from high ratings and positive list actions
- disliked genres inferred from low ratings and Not Interested actions
- preferred language signal
- watched / want / currently watching counts
- strongest positive and negative signals
- editable liked keywords
- editable disliked keywords

For normal users, the panel uses only that user's private data.

For admins, the panel uses the admin/demo profile because admin demo edits are treated as real taste data for validating the recommender.

For logged-out demo visitors, the app can show a read-only demo taste profile, but editing requires sign-in.

### Editable Keywords

Users can add and remove short text keywords in two groups:

- **Liked keywords**: examples include `legal drama`, `friendship`, `coming of age`, `slow burn`.
- **Disliked keywords**: examples include `zombies`, `reality TV`, `too violent`, `medical drama`.

Keywords are manual steering signals. They should influence recommendations softly, not override behavior data.

Ratings and actions remain the strongest signals:

1. watched ratings
2. Not Interested feedback
3. list actions
4. explicit keywords
5. TMDB metadata and popularity fallback

This means one typed keyword should not dominate a profile built from many ratings.

### Dynamic Feature Weights Report

The report explains how score components contribute to recommendations. It should show:

- current recommender model version
- score weights used by the model
- positive and negative taste dimensions
- keyword boost / keyword penalty contribution
- language preference contribution
- TMDB rating and popularity contribution
- negative taste penalty from Not Interested feedback

The report should be understandable without reading code. Example rows:

| Signal | Direction | Source | Example Effect |
| --- | --- | --- | --- |
| Drama & Romance | Boost | high ratings | +14 |
| Mystery & Thriller | Penalty | Not Interested | -9 |
| `legal drama` | Boost | liked keyword | +5 |
| `zombies` | Penalty | disliked keyword | -7 |
| Original language: English | Boost | watched history | +5 |
| TMDB rating | Boost | catalog metadata | +8 |

## Recommendation Logic

The current vector/content recommender remains the base model. This feature adds an explainability layer and a soft keyword preference layer.

### Existing Signals To Preserve

Do not remove or weaken these existing behaviors:

- high watched ratings create positive taste weights
- low watched ratings create negative genre taste weights
- Not Interested feedback excludes the exact show and penalizes similar genre taste
- Want to Watch and Currently Watching exclude a show from AI Suggestions
- cold-start users get high-quality general recommendations instead of admin suggestions
- admins use demo/public profile behavior as real taste data

### Keyword Scoring

Keyword scoring should be deterministic and transparent:

- normalize keyword text by trimming, lowercasing, and collapsing repeated spaces
- match keywords against available show text fields:
  - title
  - overview
  - genres
  - original language if useful
- liked keyword matches add a small boost
- disliked keyword matches add a stronger but still bounded penalty
- cap total keyword impact so keywords cannot dominate the score

Recommended v1 caps:

- liked keyword boost cap: `+8`
- disliked keyword penalty cap: `-12`
- total keyword contribution appears in `scoreBreakdown.keywordPreference`

The exact values can be tuned later through the model comparison report.

## Data Model

Use the existing `UserInterest` model rather than creating a separate preference model.

Extend it to support:

- `interestType: "keyword"`
- `sentiment: "like" | "dislike"`
- `source: "explicit"`
- `weight`: small numeric strength, default `1`

Keep derived interests separate from explicit user-entered keywords. A future task can add derived interests if needed.

## API Design

Add protected endpoints for the signed-in user's explicit interests:

- `GET /api/interests/profile`
- `POST /api/interests/keywords`
- `DELETE /api/interests/keywords/:id`

Admin should use the same endpoints, but the backend should resolve admin profile scope consistently with the existing admin/demo taste behavior.

Responses should include:

- explicit liked keywords
- explicit disliked keywords
- inferred profile summary
- feature weight summary

## Frontend Design

Add a new panel in the existing premium style, without bloating `client-react/src/App.jsx`.

Likely components:

- `TasteProfilePanel.jsx`
- `FeatureWeightsReport.jsx`
- `KeywordPreferenceEditor.jsx`

The panel can live inside the current Training Health page at first, because it is already the project's model/data introspection page. A later UI pass can promote it into its own top-level tab if it becomes too large.

UX rules:

- edit keywords as chips
- adding a keyword should be one input + one button
- deleting a keyword should be one small icon/button
- logged-out users see read-only demo explanation and a sign-in prompt
- failures show clear retry/error states
- mobile layout stacks cleanly

## Testing

Backend tests should cover:

- keyword normalization
- duplicate keyword prevention
- user/private scope
- admin/demo scope
- keyword boost and penalty caps
- feature weight report content

Frontend tests should cover:

- rendering liked/disliked keywords
- adding a keyword
- deleting a keyword
- read-only logged-out state
- feature weight rows displayed clearly

## Non-Goals

Do not implement collaborative filtering yet.

Do not train a scikit-learn model for this slice.

Do not use an LLM to infer taste keywords.

Do not make keywords hard filters.

Do not store or commit private course PDFs/material.

## Risks And Tradeoffs

Manual keywords can make recommendations feel more controllable, but they can also overfit the user if weighted too strongly. This design avoids that by keeping keywords as bounded soft signals.

The Training Health page may become crowded. The first implementation should keep sections compact and reusable so a later split into a dedicated Taste Profile tab is cheap.

The model explanation must be honest: it should say "this signal contributed" rather than "the AI knows you love this" unless the data clearly supports that statement.

