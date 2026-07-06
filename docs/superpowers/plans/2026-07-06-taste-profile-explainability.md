# Taste Profile Explainability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an editable taste profile panel and dynamic feature weights report, with liked/disliked keyword preferences feeding the recommendation scorer as bounded soft signals.

**Architecture:** Keep the current modular monolith. Add backend services for explicit keyword interests and taste profile reporting, expose them through `/api/interests`, and keep frontend work in new components/helpers so `App.jsx` does not grow. Recommendation scoring remains deterministic vector/content scoring with a small keyword contribution added to the existing score breakdown.

**Tech Stack:** Express, Mongoose, Node test runner, React/Vite, existing CSS modules, MongoDB.

---

## File Structure

- Modify `cinema-ws/models/UserInterest.js`: add `keyword` type and `sentiment`.
- Create `cinema-ws/services/userInterest.service.js`: keyword normalization, payload validation, keyword scoring helpers.
- Create `cinema-ws/services/tasteProfileReport.service.js`: build explainable taste profile and feature weights report from snapshots.
- Modify `cinema-ws/services/vectorRecommendation.service.js`: include bounded keyword contribution in scoring.
- Modify `cinema-ws/services/mlRecommendation.service.js`: accept explicit interests and pass keyword preferences into scoring/model version.
- Create `cinema-ws/controllers/interest.controller.js`: profile, add keyword, delete keyword endpoints.
- Create `cinema-ws/routes/interest.routes.js`: mount protected/optional auth interest routes.
- Modify `cinema-ws/app.js`: mount `/api/interests`.
- Test `cinema-ws/test/userInterest.service.test.js`.
- Test `cinema-ws/test/tasteProfileReport.service.test.js`.
- Modify tests in `cinema-ws/test/vectorRecommendation.service.test.js`.
- Modify tests in `cinema-ws/test/mlRecommendation.service.test.js`.
- Create `client-react/src/tasteProfile.js`: frontend formatting helpers.
- Create `client-react/src/tasteProfile.test.js`.
- Create `client-react/src/components/TasteProfilePanel.jsx`.
- Modify `client-react/src/components/AppContent.jsx`: render the taste page.
- Modify `client-react/src/pageConfig.js`: add `Taste Profile` tab.
- Modify `client-react/src/styles/base.css` and `client-react/src/styles/responsive.css`: premium panel/chip/report styles.

## Task 1: Keyword Interest Model And Pure Helpers

**Files:**
- Modify: `cinema-ws/models/UserInterest.js`
- Create: `cinema-ws/services/userInterest.service.js`
- Create: `cinema-ws/test/userInterest.service.test.js`

- [ ] **Step 1: Write failing keyword helper tests**

Add tests for:

```js
const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildKeywordInterestPayload,
  getKeywordPreferenceScore,
  normalizeKeyword,
} = require("../services/userInterest.service");

test("normalizeKeyword trims, lowercases, and collapses spaces", () => {
  assert.equal(normalizeKeyword("  Legal   Drama  "), "legal drama");
});

test("buildKeywordInterestPayload creates explicit liked and disliked keywords", () => {
  assert.deepEqual(
    buildKeywordInterestPayload({
      userId: "user-1",
      value: "  Zombies ",
      sentiment: "dislike",
    }),
    {
      user: "user-1",
      interestType: "keyword",
      value: "zombies",
      sentiment: "dislike",
      source: "explicit",
      weight: 1,
    },
  );
});

test("getKeywordPreferenceScore boosts likes and caps dislike penalties", () => {
  const score = getKeywordPreferenceScore(
    {
      title: "A Legal Drama",
      overview: "A friendship story with zombies.",
      genres: ["Drama & Romance"],
    },
    [
      { value: "legal drama", sentiment: "like", weight: 1 },
      { value: "friendship", sentiment: "like", weight: 1 },
      { value: "zombies", sentiment: "dislike", weight: 3 },
    ],
  );

  assert.deepEqual(score, {
    value: -4,
    likedMatches: ["legal drama", "friendship"],
    dislikedMatches: ["zombies"],
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cinema-ws && npm test -- test/userInterest.service.test.js`

Expected: FAIL because `userInterest.service.js` does not exist.

- [ ] **Step 3: Implement helpers and model fields**

`UserInterest` must support:

```js
interestType: {
  type: String,
  enum: ["genre", "mood", "theme", "actor", "language", "era", "keyword"],
  required: true,
  index: true,
},
sentiment: {
  type: String,
  enum: ["like", "dislike"],
  default: "like",
  index: true,
},
```

`userInterest.service.js` exports:

- `normalizeKeyword(value)`
- `buildKeywordInterestPayload({ userId, value, sentiment, weight })`
- `getKeywordPreferenceScore(show, interests)`
- `LIKED_KEYWORD_BOOST_CAP = 8`
- `DISLIKED_KEYWORD_PENALTY_CAP = 12`

Keyword match logic:

- normalized keyword must be 2-60 chars
- match against normalized `title`, `overview`, `genres.join(" ")`, and `originalLanguage`
- each liked match contributes `+4 * weight`
- each disliked match contributes `-4 * weight`
- final boost capped to `+8`
- final penalty capped to `-12`

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cinema-ws && npm test -- test/userInterest.service.test.js`

Expected: PASS.

## Task 2: Taste Profile And Feature Weights Report

**Files:**
- Create: `cinema-ws/services/tasteProfileReport.service.js`
- Create: `cinema-ws/test/tasteProfileReport.service.test.js`

- [ ] **Step 1: Write failing taste profile report tests**

Test expected behavior:

```js
const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildTasteProfileReport,
} = require("../services/tasteProfileReport.service");

test("buildTasteProfileReport summarizes inferred taste and explicit keywords", () => {
  const report = buildTasteProfileReport({
    tvShows: [
      {
        _id: "show-1",
        title: "Breaking Bad",
        genres: ["Drama", "Crime"],
        status: "watched",
        userRating: 9.5,
        tmdbRating: 8.9,
        popularity: 100,
        year: 2008,
        originalLanguage: "en",
      },
      {
        _id: "show-2",
        title: "Rejected Sitcom",
        genres: ["Comedy"],
        status: "watched",
        userRating: 3,
        tmdbRating: 8,
        popularity: 80,
        year: 2020,
        originalLanguage: "en",
      },
    ],
    userInterests: [
      {
        _id: "interest-1",
        value: "legal drama",
        interestType: "keyword",
        sentiment: "like",
        weight: 1,
      },
      {
        _id: "interest-2",
        value: "zombies",
        interestType: "keyword",
        sentiment: "dislike",
        weight: 1,
      },
    ],
  });

  assert.equal(report.summary.ratedCount, 2);
  assert.equal(report.keywords.liked[0].value, "legal drama");
  assert.equal(report.keywords.disliked[0].value, "zombies");
  assert.ok(report.positiveSignals.some((signal) => signal.name === "Mystery & Thriller"));
  assert.ok(report.negativeSignals.some((signal) => signal.name === "Comedy"));
  assert.ok(report.featureWeights.some((row) => row.signal === "Keyword preferences"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cinema-ws && npm test -- test/tasteProfileReport.service.test.js`

Expected: FAIL because service does not exist.

- [ ] **Step 3: Implement report service**

Implement `buildTasteProfileReport({ tvShows, userShows, ignoredSuggestions, userInterests })`.

Return shape:

```js
{
  summary: {
    watchedCount,
    wantCount,
    watchingCount,
    ratedCount,
    ignoredCount,
    explicitKeywordCount
  },
  positiveSignals: [{ name, value, source }],
  negativeSignals: [{ name, value, source }],
  keywords: {
    liked: [{ id, value, weight }],
    disliked: [{ id, value, weight }]
  },
  featureWeights: [{ signal, direction, source, effect }]
}
```

Use `buildUserTasteVector` and `vectorToObject` for inferred signal values.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cinema-ws && npm test -- test/tasteProfileReport.service.test.js`

Expected: PASS.

## Task 3: Recommendation Scoring Keyword Integration

**Files:**
- Modify: `cinema-ws/services/vectorRecommendation.service.js`
- Modify: `cinema-ws/services/mlRecommendation.service.js`
- Modify: `cinema-ws/test/vectorRecommendation.service.test.js`
- Modify: `cinema-ws/test/mlRecommendation.service.test.js`

- [ ] **Step 1: Write failing scorer tests**

Add a vector service test:

```js
test("scoreCandidateForUser includes bounded keyword preferences", () => {
  const result = scoreCandidateForUser(
    {
      title: "Legal Drama With Zombies",
      overview: "A legal drama about zombies.",
      genres: ["Drama & Romance"],
      tmdbRating: 8,
      popularity: 60,
      year: 2020,
      originalLanguage: "en",
    },
    Array(VECTOR_DIMENSIONS.length).fill(0),
    {
      ...context,
      keywordPreferences: [
        { value: "legal drama", sentiment: "like", weight: 1 },
        { value: "zombies", sentiment: "dislike", weight: 3 },
      ],
    },
  );

  assert.equal(result.scoreBreakdown.keywordPreference, -4);
});
```

Add an ML recommendation test that a keyword-only profile can rank matching candidates first and emit `vector-content-v1.3-keywords`.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd cinema-ws && npm test -- test/vectorRecommendation.service.test.js test/mlRecommendation.service.test.js
```

Expected: FAIL because keyword scoring is not wired.

- [ ] **Step 3: Implement keyword scoring**

Update `scoreCandidateForUser`:

- call `getKeywordPreferenceScore(candidateShow, context.keywordPreferences || [])`
- add `keywordPreference` to `scoreBreakdown`
- add the direct signed keyword score to final score before clamping

Update `buildTMDBRecommendations`:

- accept `userInterests = []`
- convert keyword interests into `keywordPreferences`
- treat keyword preferences as non-cold-start personalization
- set model version `vector-content-v1.3-keywords` when keywords are present

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd cinema-ws && npm test -- test/vectorRecommendation.service.test.js test/mlRecommendation.service.test.js
```

Expected: PASS.

## Task 4: Interests API

**Files:**
- Create: `cinema-ws/controllers/interest.controller.js`
- Create: `cinema-ws/routes/interest.routes.js`
- Modify: `cinema-ws/app.js`
- Optional test if controller pattern stays simple: `cinema-ws/test/interest.controller.test.js`

- [ ] **Step 1: Wire route contract**

Routes:

```js
router.get("/profile", optionalAuth, getTasteProfile);
router.post("/keywords", protect, createKeywordInterest);
router.delete("/keywords/:id", protect, deleteKeywordInterest);
```

- [ ] **Step 2: Implement controller**

Controller responsibilities:

- normal user profile uses `UserShow` + populated `TVShow` + that user's interests/ignored suggestions
- admin profile uses catalog `TVShow` demo data + admin interests/ignored suggestions
- logged-out profile uses catalog `TVShow` demo data and no editable keywords
- create validates sentiment/value, upserts by `{ user, interestType: "keyword", value }`
- delete only removes records owned by `req.user._id`

- [ ] **Step 3: Mount route**

In `app.js`:

```js
const interestRoutes = require("./routes/interest.routes");
app.use("/api/interests", interestRoutes);
```

- [ ] **Step 4: Smoke test backend**

Run: `cd cinema-ws && npm test`

Expected: all tests pass.

## Task 5: Frontend Taste Profile Panel

**Files:**
- Create: `client-react/src/tasteProfile.js`
- Create: `client-react/src/tasteProfile.test.js`
- Create: `client-react/src/components/TasteProfilePanel.jsx`
- Modify: `client-react/src/components/AppContent.jsx`
- Modify: `client-react/src/pageConfig.js`
- Modify: `client-react/src/styles/base.css`
- Modify: `client-react/src/styles/responsive.css`

- [ ] **Step 1: Write frontend helper tests**

Add tests for:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  getKeywordColumnTitle,
  getSignalEffectText,
} from "./tasteProfile.js";

test("getSignalEffectText formats positive and negative effects", () => {
  assert.equal(getSignalEffectText(8), "+8");
  assert.equal(getSignalEffectText(-12), "-12");
  assert.equal(getSignalEffectText(0), "0");
});

test("getKeywordColumnTitle labels liked and disliked keyword groups", () => {
  assert.equal(getKeywordColumnTitle("like"), "Liked keywords");
  assert.equal(getKeywordColumnTitle("dislike"), "Disliked keywords");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client-react && npm test -- src/tasteProfile.test.js`

Expected: FAIL because helper file does not exist.

- [ ] **Step 3: Implement helper and panel**

Panel behavior:

- fetch `GET /api/interests/profile` using auth token when available
- render summary cards, positive/negative signals, keyword chips, and feature weights
- allow add/delete only when signed in
- logged-out users see read-only demo with sign-in prompt
- after add/delete, refresh the panel and trigger no full-app reload

Add page:

```js
taste: {
  label: "Taste Profile",
  emptyTitle: "No taste profile yet",
  emptyText: "Rate shows and add keywords to shape recommendations.",
}
```

In `AppContent`, render `TasteProfilePanel` when `activePage === "taste"`.

- [ ] **Step 4: Run frontend tests**

Run: `cd client-react && npm test -- src/tasteProfile.test.js`

Expected: PASS.

## Task 6: Verification, Commit, Push

**Files:** all touched files.

- [ ] **Step 1: Run backend tests**

Run: `cd cinema-ws && npm test`

Expected: all tests pass.

- [ ] **Step 2: Run Python tests**

Run: `cd cinema-ws && npm run test:python`

Expected: all tests pass.

- [ ] **Step 3: Run frontend tests, lint, build**

Run:

```bash
cd client-react && npm test
cd client-react && npm run lint
cd client-react && npm run build
```

Expected: all pass.

- [ ] **Step 4: Check file sizes and diff**

Run:

```bash
find cinema-ws client-react/src -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.py" \) -not -path "*/node_modules/*" -print0 | xargs -0 wc -l | sort -nr | head -20
git diff --check
git status --short
```

Expected: no source file over 1000 lines, no whitespace errors.

- [ ] **Step 5: Commit and push**

Run:

```bash
git add .
git commit -m "Add taste profile explainability"
git push origin main
```

Expected: commit and push succeed.

