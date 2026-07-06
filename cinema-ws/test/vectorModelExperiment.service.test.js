const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildLeaveOneOutCases,
  calculateWeightedScore,
  parseVectorExperimentArgs,
  rankCandidatesForProfile,
  runVectorWeightExperiment,
} = require("../services/vectorModelExperiment.service");

const show = ({
  id,
  title,
  genres,
  rating,
  tmdbRating = 8,
  popularity = 50,
  year = 2010,
  status = "watched",
}) => ({
  _id: id,
  title,
  genres,
  userRating: rating,
  tmdbRating,
  popularity,
  year,
  status,
  originalLanguage: "en",
});

test("calculateWeightedScore normalizes weights into a 0-100 experiment score", () => {
  const score = calculateWeightedScore(
    {
      vectorSimilarity: 80,
      tmdbRating: 90,
      popularity: 20,
      yearSimilarity: 50,
      languagePreference: 100,
    },
    {
      vectorSimilarity: 6,
      tmdbRating: 2,
      popularity: 1,
      yearSimilarity: 0.5,
      languagePreference: 0.5,
    },
  );

  assert.equal(score, 76);
});

test("buildLeaveOneOutCases creates supervised cases from positive watched ratings", () => {
  const cases = buildLeaveOneOutCases(
    {
      tvShows: [
        show({
          id: "breaking-bad",
          title: "Breaking Bad",
          genres: ["Drama & Romance", "Mystery & Thriller"],
          rating: 10,
        }),
        show({
          id: "better-call-saul",
          title: "Better Call Saul",
          genres: ["Drama & Romance", "Mystery & Thriller"],
          rating: 9,
        }),
        show({
          id: "mid-rated-drama",
          title: "Mid Rated Drama",
          genres: ["Drama & Romance"],
          rating: 6,
        }),
        show({
          id: "watchlist-show",
          title: "Watchlist Show",
          genres: ["Comedy"],
          rating: null,
          status: "want",
        }),
      ],
    },
    {
      positiveRatingThreshold: 8,
    },
  );

  assert.equal(cases.length, 2);
  assert.deepEqual(
    cases.map((evaluationCase) => evaluationCase.heldOutShow.title),
    ["Breaking Bad", "Better Call Saul"],
  );
  assert.ok(
    cases.every((evaluationCase) => {
      return evaluationCase.profileShows.every((profileShow) => {
        return profileShow._id !== evaluationCase.heldOutShow._id;
      });
    }),
  );
  assert.equal(cases[0].candidateShows.length, 2);
});

test("rankCandidatesForProfile ranks a taste match over an unrelated high-rated show", () => {
  const ranked = rankCandidatesForProfile({
    profileShows: [
      show({
        id: "breaking-bad",
        title: "Breaking Bad",
        genres: ["Drama & Romance", "Mystery & Thriller"],
        rating: 10,
        tmdbRating: 9,
        popularity: 90,
      }),
    ],
    candidateShows: [
      show({
        id: "the-wire",
        title: "The Wire",
        genres: ["Drama & Romance", "Mystery & Thriller"],
        rating: null,
        tmdbRating: 8.6,
        popularity: 60,
        year: 2002,
        status: "want",
      }),
      show({
        id: "bright-sitcom",
        title: "Bright Sitcom",
        genres: ["Comedy"],
        rating: null,
        tmdbRating: 9.9,
        popularity: 100,
        year: 2024,
        status: "want",
      }),
    ],
    weights: {
      vectorSimilarity: 0.8,
      tmdbRating: 0.1,
      popularity: 0.05,
      yearSimilarity: 0.025,
      languagePreference: 0.025,
    },
  });

  assert.equal(ranked[0].title, "The Wire");
  assert.ok(ranked[0].experimentScore > ranked[1].experimentScore);
  assert.ok(
    ranked[0].scoreBreakdown.vectorSimilarity >
      ranked[1].scoreBreakdown.vectorSimilarity,
  );
});

test("runVectorWeightExperiment compares presets with leave-one-out metrics", () => {
  const report = runVectorWeightExperiment(
    {
      tvShows: [
        show({
          id: "breaking-bad",
          title: "Breaking Bad",
          genres: ["Drama & Romance", "Mystery & Thriller"],
          rating: 10,
          tmdbRating: 9.5,
          popularity: 90,
          year: 2008,
        }),
        show({
          id: "better-call-saul",
          title: "Better Call Saul",
          genres: ["Drama & Romance", "Mystery & Thriller"],
          rating: 9,
          tmdbRating: 9,
          popularity: 80,
          year: 2015,
        }),
        show({
          id: "friends",
          title: "Friends",
          genres: ["Comedy"],
          rating: 9,
          tmdbRating: 8.8,
          popularity: 100,
          year: 1994,
        }),
        show({
          id: "office",
          title: "The Office",
          genres: ["Comedy"],
          rating: null,
          tmdbRating: 8.7,
          popularity: 95,
          year: 2005,
          status: "want",
        }),
      ],
    },
    {
      k: 2,
      positiveRatingThreshold: 8,
      presets: [
        {
          name: "taste_heavy",
          weights: {
            vectorSimilarity: 0.8,
            tmdbRating: 0.1,
            popularity: 0.05,
            yearSimilarity: 0.025,
            languagePreference: 0.025,
          },
        },
      ],
    },
  );

  assert.deepEqual(report.summary, {
    k: 2,
    positiveRatingThreshold: 8,
    caseCount: 3,
    presetCount: 1,
  });
  assert.equal(report.presets[0].name, "taste_heavy");
  assert.equal(report.presets[0].metrics.hitRate, 1);
  assert.ok(report.presets[0].metrics.meanReciprocalRank > 0);
  assert.ok(report.presets[0].metrics.ndcg > 0);
  assert.equal(report.bestPreset.name, "taste_heavy");
});

test("runVectorWeightExperiment does not choose a winner without cases", () => {
  const report = runVectorWeightExperiment({
    tvShows: [
      show({
        id: "single-liked-show",
        title: "Single Liked Show",
        genres: ["Drama & Romance"],
        rating: 9,
      }),
    ],
  });

  assert.equal(report.summary.caseCount, 0);
  assert.equal(report.bestPreset, null);
  assert.ok(report.presets.every((preset) => preset.metrics.cases === 0));
});

test("parseVectorExperimentArgs supports report options", () => {
  assert.deepEqual(parseVectorExperimentArgs([]), {
    format: "text",
    k: 20,
    positiveRatingThreshold: 8,
  });

  assert.deepEqual(parseVectorExperimentArgs(["--json", "--k=5", "--threshold=7"]), {
    format: "json",
    k: 5,
    positiveRatingThreshold: 7,
  });
});
