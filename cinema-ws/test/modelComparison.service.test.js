const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildModelComparisonReport,
  parseModelComparisonArgs,
} = require("../services/modelComparison.service");

const row = ({
  modelVersion,
  score = 80,
  rank = 1,
  accepted = false,
  ignored = false,
  opened = false,
  rated = false,
  rating = null,
}) => ({
  modelVersion,
  score,
  rank,
  wasAccepted: accepted,
  wasIgnored: ignored,
  wasOpened: opened,
  wasRated: rated,
  rating,
});

test("buildModelComparisonReport aggregates outcome metrics by model version", () => {
  const report = buildModelComparisonReport({
    rows: [
      row({
        modelVersion: "vector-content-v1.1",
        accepted: true,
        opened: true,
        score: 90,
      }),
      row({
        modelVersion: "vector-content-v1.1",
        ignored: true,
        score: 60,
        rank: 2,
      }),
      row({
        modelVersion: "vector-content-v1.2-negative-feedback",
        accepted: true,
        rated: true,
        rating: 9,
        score: 88,
      }),
      row({
        modelVersion: "vector-content-v1.2-negative-feedback",
        opened: true,
        score: 72,
        rank: 2,
      }),
    ],
  });

  assert.equal(report.summary.modelCount, 2);
  assert.equal(report.summary.comparisonReady, true);
  assert.deepEqual(
    report.models.map((model) => model.modelVersion),
    ["vector-content-v1.2-negative-feedback", "vector-content-v1.1"],
  );
  assert.deepEqual(report.models[0], {
    modelVersion: "vector-content-v1.2-negative-feedback",
    rows: 2,
    labelledRows: 1,
    positiveCount: 1,
    negativeCount: 0,
    openedCount: 1,
    acceptedCount: 1,
    ignoredCount: 0,
    ratedCount: 1,
    averageRating: 9,
    averageScore: 80,
    averageRank: 1.5,
    labelRate: 0.5,
    positiveRate: 0.5,
    negativeRate: 0,
    positiveLabelRate: 1,
    openRate: 0.5,
    acceptRate: 0.5,
    ignoreRate: 0,
    positiveLabelWilsonInterval: {
      estimate: 1,
      lower: 0.21,
      upper: 1,
    },
  });
});

test("buildModelComparisonReport compares every model with a chosen baseline", () => {
  const report = buildModelComparisonReport(
    {
      rows: [
        row({
          modelVersion: "old-model",
          accepted: true,
        }),
        row({
          modelVersion: "old-model",
          ignored: true,
        }),
        row({
          modelVersion: "new-model",
          accepted: true,
        }),
        row({
          modelVersion: "new-model",
          accepted: true,
        }),
      ],
    },
    {
      baselineModelVersion: "old-model",
    },
  );

  assert.deepEqual(report.comparisons, [
    {
      modelVersion: "new-model",
      baselineModelVersion: "old-model",
      positiveLabelRateDelta: 0.5,
      acceptRateDelta: 0.5,
      ignoreRateDelta: -0.5,
      averageScoreDelta: 0,
    },
  ]);
});

test("buildModelComparisonReport reports when comparison is not ready", () => {
  const report = buildModelComparisonReport({
    rows: [
      row({
        modelVersion: "only-model",
        accepted: true,
      }),
    ],
  });

  assert.equal(report.summary.comparisonReady, false);
  assert.deepEqual(report.comparisons, []);
});

test("parseModelComparisonArgs supports json, limit, and baseline", () => {
  assert.deepEqual(parseModelComparisonArgs([]), {
    baselineModelVersion: null,
    format: "text",
    limit: Number.MAX_SAFE_INTEGER,
  });
  assert.deepEqual(
    parseModelComparisonArgs([
      "--json",
      "--limit=100",
      "--baseline=vector-content-v1.1",
    ]),
    {
      baselineModelVersion: "vector-content-v1.1",
      format: "json",
      limit: 100,
    },
  );
});
