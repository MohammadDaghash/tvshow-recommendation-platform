const assert = require("node:assert/strict");
const test = require("node:test");

const {
  VECTOR_DIMENSIONS,
  buildShowFeatureVector,
  buildUserTasteVector,
  scoreCandidateForUser,
  vectorToObject,
} = require("../services/vectorRecommendation.service");

const context = {
  maxPopularity: 100,
  minYear: 1990,
  maxYear: 2020,
  preferredOriginalLanguage: "en",
};

test("buildShowFeatureVector normalizes genres and numeric metadata into a stable vector", () => {
  const vector = buildShowFeatureVector(
    {
      title: "Prestige Crime Drama",
      genres: ["Drama", "Romance", "Crime"],
      tmdbRating: 8.5,
      popularity: 50,
      year: 2020,
      originalLanguage: "en",
    },
    context,
  );

  assert.equal(vector.length, VECTOR_DIMENSIONS.length);
  assert.deepEqual(vectorToObject(vector), {
    Comedy: 0,
    "Drama & Romance": 1,
    "Action & Adventure": 0,
    "Mystery & Thriller": 1,
    "Science-Fiction & Fantasy": 0,
    Anime: 0,
    Horror: 0,
    Legal: 0,
    History: 0,
    Other: 0,
    tmdbRating: 0.85,
    popularity: 0.5,
    year: 1,
    languagePreference: 1,
  });
});

test("buildUserTasteVector turns ratings into positive and negative taste weights", () => {
  const tasteVector = buildUserTasteVector(
    [
      {
        title: "Loved Mystery",
        genres: ["Mystery & Thriller", "Drama & Romance"],
        userRating: 9,
        tmdbRating: 9,
        popularity: 80,
        year: 2018,
        originalLanguage: "en",
      },
      {
        title: "Disliked Comedy",
        genres: ["Comedy"],
        userRating: 3,
        tmdbRating: 8,
        popularity: 90,
        year: 2018,
        originalLanguage: "en",
      },
    ],
    context,
  );
  const taste = vectorToObject(tasteVector);

  assert.ok(taste["Mystery & Thriller"] > 0);
  assert.ok(taste["Drama & Romance"] > 0);
  assert.ok(taste.Comedy < 0);
});

test("scoreCandidateForUser ranks a lower-rated matching show above an unrelated high-rated show", () => {
  const tasteVector = buildUserTasteVector(
    [
      {
        title: "Breaking Bad",
        genres: ["Drama & Romance", "Mystery & Thriller"],
        userRating: 10,
        tmdbRating: 9,
        popularity: 90,
        year: 2008,
        originalLanguage: "en",
      },
    ],
    context,
  );
  const matchingCandidate = scoreCandidateForUser(
    {
      title: "The Wire",
      genres: ["Drama & Romance", "Mystery & Thriller"],
      tmdbRating: 8.5,
      popularity: 60,
      year: 2002,
      originalLanguage: "en",
    },
    tasteVector,
    context,
  );
  const unrelatedCandidate = scoreCandidateForUser(
    {
      title: "Bright Sitcom",
      genres: ["Comedy"],
      tmdbRating: 9.8,
      popularity: 100,
      year: 2020,
      originalLanguage: "en",
    },
    tasteVector,
    context,
  );

  assert.ok(
    matchingCandidate.recommendationScore > unrelatedCandidate.recommendationScore,
  );
  assert.ok(
    matchingCandidate.scoreBreakdown.vectorSimilarity >
      unrelatedCandidate.scoreBreakdown.vectorSimilarity,
  );
});
