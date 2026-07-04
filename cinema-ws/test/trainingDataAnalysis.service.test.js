const assert = require("node:assert/strict");
const test = require("node:test");

const {
  analyzeTrainingDataExport,
  parseTrainingAnalysisArgs,
} = require("../services/trainingDataAnalysis.service");

const rows = [
  {
    modelVersion: "baseline-v1",
    genres: ["Comedy"],
    tmdbRating: 8.4,
    wasOpened: true,
    wasAccepted: true,
    wasIgnored: false,
    wasRated: true,
    rating: 9,
  },
  {
    modelVersion: "baseline-v1",
    genres: ["Drama & Romance"],
    tmdbRating: 7.9,
    wasOpened: false,
    wasAccepted: false,
    wasIgnored: true,
    wasRated: false,
    rating: null,
  },
  {
    modelVersion: "baseline-v1",
    genres: ["Drama & Romance"],
    tmdbRating: null,
    wasOpened: false,
    wasAccepted: false,
    wasIgnored: false,
    wasRated: false,
    rating: null,
  },
  {
    modelVersion: "baseline-v2",
    genres: ["Science-Fiction & Fantasy"],
    tmdbRating: 8.8,
    wasOpened: true,
    wasAccepted: false,
    wasIgnored: false,
    wasRated: false,
    rating: null,
  },
  {
    modelVersion: "baseline-v2",
    genres: [],
    tmdbRating: null,
    wasOpened: false,
    wasAccepted: false,
    wasIgnored: false,
    wasRated: false,
    rating: null,
  },
];

test("analyzeTrainingDataExport summarizes label sparsity and readiness", () => {
  const analysis = analyzeTrainingDataExport(
    {
      summary: {
        rowCount: rows.length,
      },
      rows,
    },
    {
      minPositiveExamples: 2,
      minNegativeExamples: 2,
      minSupervisedLabelRate: 0.5,
      topGenreLimit: 2,
    },
  );

  assert.deepEqual(analysis.summary, {
    rowCount: 5,
    engagementCount: 3,
    engagementRate: 0.6,
    supervisedLabelCount: 2,
    supervisedLabelRate: 0.4,
    unlabeledCount: 3,
    unlabeledRate: 0.6,
    positiveCount: 1,
    negativeCount: 1,
    openedCount: 2,
    acceptedCount: 1,
    ignoredCount: 1,
    ratedCount: 1,
    averageRating: 9,
  });

  assert.deepEqual(analysis.metadataCoverage, {
    genreRows: 4,
    genreCoverage: 0.8,
    tmdbRatingRows: 3,
    tmdbRatingCoverage: 0.6,
  });

  assert.deepEqual(analysis.readiness, {
    isReadyForML: false,
    status: "not_ready",
    reasons: [
      "Need at least 2 positive examples; found 1.",
      "Need at least 2 negative examples; found 1.",
      "Need supervised label rate of at least 50%; found 40%.",
    ],
  });
});

test("analyzeTrainingDataExport reports top genre and model-version signal rates", () => {
  const analysis = analyzeTrainingDataExport(
    {
      rows,
    },
    {
      minPositiveExamples: 1,
      minNegativeExamples: 1,
      minSupervisedLabelRate: 0.2,
      topGenreLimit: 2,
    },
  );

  assert.deepEqual(analysis.topGenres, [
    {
      genre: "Drama & Romance",
      rows: 2,
      positiveCount: 0,
      negativeCount: 1,
      openedCount: 0,
      supervisedLabelRate: 0.5,
      positiveRate: 0,
      negativeRate: 0.5,
    },
    {
      genre: "Comedy",
      rows: 1,
      positiveCount: 1,
      negativeCount: 0,
      openedCount: 1,
      supervisedLabelRate: 1,
      positiveRate: 1,
      negativeRate: 0,
    },
  ]);

  assert.deepEqual(analysis.modelVersions, [
    {
      modelVersion: "baseline-v1",
      rows: 3,
      positiveCount: 1,
      negativeCount: 1,
      openedCount: 1,
      supervisedLabelRate: 0.67,
      positiveRate: 0.33,
      negativeRate: 0.33,
    },
    {
      modelVersion: "baseline-v2",
      rows: 2,
      positiveCount: 0,
      negativeCount: 0,
      openedCount: 1,
      supervisedLabelRate: 0,
      positiveRate: 0,
      negativeRate: 0,
    },
  ]);

  assert.equal(analysis.readiness.isReadyForML, true);
});

test("parseTrainingAnalysisArgs defaults to text and supports json and top", () => {
  assert.deepEqual(parseTrainingAnalysisArgs([]), {
    format: "text",
    topGenreLimit: 10,
  });

  assert.deepEqual(parseTrainingAnalysisArgs(["--json", "--top=3"]), {
    format: "json",
    topGenreLimit: 3,
  });
});
