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
  assert.equal(report.summary.explicitKeywordCount, 2);
  assert.equal(report.keywords.liked[0].value, "legal drama");
  assert.equal(report.keywords.disliked[0].value, "zombies");
  assert.ok(
    report.positiveSignals.some(
      (signal) => signal.name === "Mystery & Thriller",
    ),
  );
  assert.ok(
    report.negativeSignals.some((signal) => signal.name === "Comedy"),
  );
  assert.ok(
    report.featureWeights.some((row) => row.signal === "Keyword preferences"),
  );
});

test("buildTasteProfileReport includes populated user shows and ignored suggestions", () => {
  const report = buildTasteProfileReport({
    userShows: [
      {
        status: "want",
        userRating: null,
        tvShow: {
          title: "Better Call Saul",
          genres: ["Drama", "Legal"],
          tmdbRating: 8.7,
          popularity: 75,
          year: 2015,
          originalLanguage: "en",
        },
      },
      {
        status: "watching",
        userRating: null,
        tvShow: {
          title: "Severance",
          genres: ["Science-Fiction", "Mystery"],
          tmdbRating: 8.5,
          popularity: 90,
          year: 2022,
          originalLanguage: "en",
        },
      },
    ],
    ignoredSuggestions: [
      {
        title: "Rejected Comedy",
        genres: ["Comedy"],
      },
    ],
  });

  assert.equal(report.summary.wantCount, 1);
  assert.equal(report.summary.watchingCount, 1);
  assert.equal(report.summary.ignoredCount, 1);
  assert.ok(
    report.featureWeights.some(
      (row) => row.signal === "Negative taste penalty",
    ),
  );
});
