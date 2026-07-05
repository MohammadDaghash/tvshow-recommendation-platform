# Recommendation Explanations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Full rationale and the reconciled design decisions live in `docs/superpowers/specs/2026-07-05-recommendation-explanations-design.md` — read that first, it resolves several contradictions an earlier draft of this design had (auth gating, caching, circuit breaker).

**Goal:** Layer a Claude-generated natural-language explanation on top of the existing content-based `recommendationScore`/`scoreBreakdown`, without changing the recommender's scoring/ranking behavior, without breaching the 1000-line file cap, and without adding cache/circuit-breaker complexity that can't actually work on this app's serverless deployment.

**Architecture:** New on-demand endpoint (`POST /api/recommendations/:id/explanation`, behind `protect`), a new backend service that calls Claude Haiku with a rigid prompt + structured-output schema, cost control that reuses the existing `UserInteraction` collection instead of new persistent state, and a new frontend hook owned by `AppModals.jsx` (not `App.jsx`, which is already at the 1000-line ceiling).

**Tech Stack:** Express, Mongoose, axios (no new `@anthropic-ai/sdk` dependency — call `https://api.anthropic.com/v1/messages` directly, matching the existing `axios`-based style in `tmdb.service.js`), React hook, Node test runner.

---

### Task 1: Backend explanation service

**Files:**
- Create: `cinema-ws/services/recommendationExplanation.service.js`
- Create: `cinema-ws/services/recommendationExplanation.service.test.js`
- Modify: `cinema-ws/.env` (add `ANTHROPIC_API_KEY=`)
- Modify: `cinema-ws/.env.example` if one exists (same key, empty value)

- [ ] **Step 1: Guardrail pure functions**

In `recommendationExplanation.service.js`, implement `hasPersonalizationSignal(scoreBreakdown, similarWatchedShows)`, `hasAnySignal(scoreBreakdown, similarWatchedShows)`, `buildFallbackExplanation()` (returns the fixed "we don't have enough data yet" string + `emphasizedFactor: "general"`), `isTitleAllowed(text, showTitle, similarWatchedShows)`, and `isEmphasizedFactorConsistent(emphasizedFactor, scoreBreakdown)`. These are pure and should be unit-testable with no network access.

- [ ] **Step 2: Prompt builder**

Implement `buildPrompt({ showTitle, scoreBreakdown, similarWatchedShows, hasPersonalizationSignal })` returning `{ system, user }` strings using the exact templates in the design doc's "Prompt & Output Contract" section.

- [ ] **Step 3: Claude call**

Implement `callClaude({ system, user })` using `axios.post("https://api.anthropic.com/v1/messages", ...)` with model `claude-haiku-4-5`, the JSON schema from the design doc via `output_config`, `max_tokens: 200`, and an `AbortController` timeout around 6s. On any error (timeout, 429, other), catch and return a typed result `{ ok: false, reason: "timeout" | "rate_limited" | "unavailable" }` — never let a raw error object escape this function (see Step 5 on logging).

- [ ] **Step 4: Top-level orchestration**

Implement `async getExplanation({ showTitle, recommendationScore, scoreBreakdown, similarWatchedShows })`:
1. If `!hasAnySignal(...)`, return the fixed fallback immediately, no network call.
2. If `ANTHROPIC_API_KEY` is unset (checked once at module load), return `{ explanation: null, fallback: true, reason: "disabled" }` immediately.
3. Otherwise build the prompt, call Claude, and on success run the guardrail checks (title allow-list, emphasizedFactor consistency, length ≤ 220 chars); if any guardrail fails, return the fixed fallback instead of the model's output.
4. On any Claude-call failure, return `{ explanation: null, fallback: true, reason: <mapped reason> }`.

- [ ] **Step 5: Logging discipline**

Anywhere a Claude-call failure is logged, log only `status`, the Anthropic error `type`, and `message` — never the raw axios error or its `config` (which can carry the `x-api-key` header). Add a one-line comment at the log call site stating this constraint, since it's not obvious from the code alone.

- [ ] **Step 6: Unit tests**

In `recommendationExplanation.service.test.js`, mock `axios.post` and cover: personalization-signal branching, the zero-signal skip-the-call fallback, title allow-list rejection (model output naming an unrecognized show → falls back), emphasizedFactor/scoreBreakdown mismatch → falls back, and the "disabled" path when `ANTHROPIC_API_KEY` is unset.

---

### Task 2: Endpoint, auth, and cost control

**Files:**
- Create: `cinema-ws/controllers/recommendationExplanation.controller.js`
- Modify: `cinema-ws/routes/recommendationRoutes.js`
- Modify: `cinema-ws/models/UserInteraction.js`

- [ ] **Step 1: Add the interaction event type**

Add `"explanation_viewed"` to `interactionEventTypes` in `UserInteraction.js`. Do not touch `modelVersion` semantics — that field stays the recommender-iteration grouping key used by `recommendationSignalReport.service.js`; put any Claude-specific facts (model id, latency ms, whether this was a duplicate/best-effort-deduped request) in the existing `metadata: Mixed` field.

- [ ] **Step 2: Controller**

`getExplanation(req, res)` in `recommendationExplanation.controller.js`:
1. `req.user` is guaranteed present (route is behind `protect`).
2. Validate the request body: `recommendationScore` numeric, `scoreBreakdown` object with the 5 known keys each 0-100, `similarWatchedShows` an array of at most 3 `{ title, similarity }` objects. Reject malformed bodies with `400`.
3. Load the `TVShow` by `req.params.id`; `404` if not found. Use its canonical `title` for the prompt, never a client-supplied one.
4. Count `UserInteraction.countDocuments({ user: req.user._id, eventType: "explanation_viewed", createdAt: { $gte: <24h ago> } })`; if ≥ `EXPLANATION_DAILY_LIMIT_PER_USER` (default 50), return `{ explanation: null, fallback: true, reason: "daily_limit_reached" }` with `200`, no Claude call.
5. Otherwise call `recommendationExplanationService.getExplanation(...)`.
6. On a real (non-fallback) success, write one `UserInteraction` row (`eventType: "explanation_viewed"`, `tvShow`, `recommendationLog`/`position` if available from the request context, `metadata: { model, latencyMs }`).
7. Return the response contract shape from the design doc.

- [ ] **Step 3: Route**

Add `router.post("/:id/explanation", protect, recommendationExplanationController.getExplanation);` to `recommendationRoutes.js`.

---

### Task 3: Frontend integration

**Files:**
- Create: `client-react/src/hooks/useRecommendationExplanation.js`
- Modify: `client-react/src/components/AppModals.jsx`

- [ ] **Step 1: Hook**

`useRecommendationExplanation()` owns `{ explanation, emphasizedFactor, loading, error, fetchExplanation(show) }`. `fetchExplanation` POSTs the show's already-known `recommendationScore`/`scoreBreakdown`/`similarWatchedShows` to `/api/recommendations/:id/explanation` using the existing `authHeaders`/`httpClient` helpers. No polling, no auto-fetch — only called when invoked.

- [ ] **Step 2: UI**

In `AppModals.jsx`'s `DetailsModal`, add a "Why this pick?" button/toggle next to the existing numeric `scoreBreakdown` display (only on the "Recommended" tab, where `scoreBreakdown` exists — leave the TMDB-backed AI-suggestions tab untouched). On click, call `fetchExplanation`. Render the existing numeric breakdown and similarity sentence immediately and unconditionally as today; render the Claude text underneath once loaded, with its own small loading spinner / inline error state that never blocks or replaces the numeric UI.

- [ ] **Step 3: Manual verification**

Run the app locally, open a recommendation's detail view, click "Why this pick?", and confirm: (a) the explanation renders and reads naturally, (b) a cold-start user (no ratings) gets the non-personalized framing, not a hallucinated "based on your taste" line, (c) with `ANTHROPIC_API_KEY` unset, the button still degrades gracefully instead of erroring the whole modal.

---

### Task 4 (follow-up slice, not required for v1 to ship): Observability

**Files:**
- Modify: `cinema-ws/services/recommendationSignalReport.service.js`
- Modify: `client-react/src/components/TrainingHealthPanel.jsx`
- Modify: `client-react/src/trainingHealth.js`

- [ ] **Step 1:** Add `explanationViews` and `explanationViewRate` (`explanationViews / opens`) to the per-user × modelVersion rows in `recommendationSignalReport.service.js`, counted from `UserInteraction` rows with `eventType: "explanation_viewed"`.
- [ ] **Step 2:** Surface both alongside the existing coverage stats in `TrainingHealthPanel.jsx`.

---

### Task 5: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** Extend the existing "Explainable recommendation breakdowns" bullet under "What This Demonstrates" with the one-sentence hybrid-architecture framing from the design doc. Do not add a separate "AI/LLM" bullet.
