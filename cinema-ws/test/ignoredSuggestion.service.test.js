const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildIgnoredSuggestionUpdate,
} = require("../services/ignoredSuggestion.service");

test("buildIgnoredSuggestionUpdate stores ML-ready metadata from rejected cards", () => {
  assert.deepEqual(
    buildIgnoredSuggestionUpdate({
      userId: "user-1",
      tmdbId: "123",
      title: "Rejected Sitcom",
      metadata: {
        genres: ["Comedy"],
        tmdbRating: 8.6,
        popularity: 73,
        year: 2021,
        originalLanguage: "en",
        originCountry: ["US"],
        voteCount: 1200,
        unsafeField: undefined,
      },
    }),
    {
      user: "user-1",
      tmdbId: 123,
      title: "Rejected Sitcom",
      genres: ["Comedy"],
      tmdbRating: 8.6,
      popularity: 73,
      year: 2021,
      originalLanguage: "en",
      originCountry: ["US"],
      voteCount: 1200,
      metadata: {
        genres: ["Comedy"],
        tmdbRating: 8.6,
        popularity: 73,
        year: 2021,
        originalLanguage: "en",
        originCountry: ["US"],
        voteCount: 1200,
      },
    },
  );
});
