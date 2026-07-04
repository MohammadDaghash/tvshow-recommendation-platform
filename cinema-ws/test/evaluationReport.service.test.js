const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildEvaluationReport,
  evaluateRanking,
  parseEvaluationArgs,
} = require("../services/evaluationReport.service");

test("evaluateRanking calculates top-k ranking metrics", () => {
  const metrics = evaluateRanking({
    rankedItems: [
      { _id: "show-1", title: "A" },
      { _id: "show-2", title: "B" },
      { _id: "show-3", title: "C" },
      { _id: "show-4", title: "D" },
    ],
    relevantIds: new Set(["show-2", "show-4"]),
    k: 3,
  });

  assert.deepEqual(metrics, {
    k: 3,
    relevantCount: 2,
    hits: 1,
    hitRate: 1,
    precision: 0.33,
    recall: 0.5,
    averagePrecision: 0.25,
    firstHitRank: 2,
  });
});

test("evaluateRanking handles no relevant items", () => {
  const metrics = evaluateRanking({
    rankedItems: [{ _id: "show-1", title: "A" }],
    relevantIds: new Set(),
    k: 5,
  });

  assert.deepEqual(metrics, {
    k: 5,
    relevantCount: 0,
    hits: 0,
    hitRate: 0,
    precision: 0,
    recall: 0,
    averagePrecision: 0,
    firstHitRank: null,
  });
});

test("buildEvaluationReport evaluates multiple strategies against positive ratings", () => {
  const report = buildEvaluationReport({
    tvShows: [
      {
        _id: "show-1",
        title: "Friends",
        status: "watched",
        userRating: 9,
      },
      {
        _id: "show-2",
        title: "Breaking Bad",
        status: "watched",
        userRating: 7,
      },
      {
        _id: "show-3",
        title: "Severance",
      },
    ],
    userShows: [
      {
        _id: "user-show-1",
        tvShow: "show-3",
        status: "watched",
        userRating: 10,
      },
    ],
    strategies: {
      popular: [
        { _id: "show-2", title: "Breaking Bad" },
        { _id: "show-1", title: "Friends" },
        { _id: "show-3", title: "Severance" },
      ],
      tmdb: [
        { _id: "show-3", title: "Severance" },
        { _id: "show-2", title: "Breaking Bad" },
        { _id: "show-1", title: "Friends" },
      ],
    },
  }, {
    k: 2,
    positiveRatingThreshold: 8,
  });

  assert.deepEqual(report.summary, {
    k: 2,
    positiveRatingThreshold: 8,
    positiveItemCount: 2,
    strategyCount: 2,
  });
  assert.deepEqual(
    report.strategies.map((strategy) => ({
      name: strategy.name,
      hits: strategy.metrics.hits,
      recall: strategy.metrics.recall,
      averagePrecision: strategy.metrics.averagePrecision,
    })),
    [
      {
        name: "popular",
        hits: 1,
        recall: 0.5,
        averagePrecision: 0.25,
      },
      {
        name: "tmdb",
        hits: 1,
        recall: 0.5,
        averagePrecision: 0.5,
      },
    ],
  );
});

test("buildEvaluationReport treats legacy watched catalog ratings as positives", () => {
  const report = buildEvaluationReport({
    tvShows: [
      {
        _id: "show-1",
        title: "Friends",
        watched: true,
        userRating: 9,
      },
    ],
    strategies: {
      popular: [{ _id: "show-1", title: "Friends" }],
    },
  });

  assert.equal(report.summary.positiveItemCount, 1);
  assert.equal(report.strategies[0].metrics.hits, 1);
});

test("parseEvaluationArgs defaults to text and supports json, k, and threshold", () => {
  assert.deepEqual(parseEvaluationArgs([]), {
    format: "text",
    k: 10,
    positiveRatingThreshold: 8,
  });

  assert.deepEqual(parseEvaluationArgs(["--json", "--k=5", "--threshold=7.5"]), {
    format: "json",
    k: 5,
    positiveRatingThreshold: 7.5,
  });
});
