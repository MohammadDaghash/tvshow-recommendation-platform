const assert = require("node:assert/strict");
const test = require("node:test");

const { buildTrainingHealth } = require("../services/trainingHealth.service");

test("buildTrainingHealth combines signal report and training analysis", () => {
  const health = buildTrainingHealth(
    {
      users: [
        {
          _id: "user-1",
          name: "Admin",
          email: "admin@example.com",
        },
      ],
      tvShows: [
        {
          _id: "show-1",
          tmdbId: 1396,
          title: "Breaking Bad",
          genres: ["Drama", "Crime"],
          year: 2008,
          tmdbRating: 8.9,
          popularity: 120,
        },
      ],
      recommendationLogs: [
        {
          _id: "log-1",
          user: "user-1",
          modelVersion: "baseline-v1",
          source: "tmdb",
          page: "ai",
          items: [
            {
              tvShow: "show-1",
              tmdbId: 1396,
              title: "Breaking Bad",
              score: 92,
              position: 1,
            },
          ],
          createdAt: "2026-07-04T12:00:00.000Z",
        },
      ],
      userInteractions: [
        {
          user: "user-1",
          recommendationLog: "log-1",
          tvShow: "show-1",
          eventType: "suggestion_impression",
        },
        {
          user: "user-1",
          recommendationLog: "log-1",
          tvShow: "show-1",
          eventType: "card_opened",
        },
      ],
      recommendationFeedback: [
        {
          user: "user-1",
          recommendationLog: "log-1",
          tvShow: "show-1",
          action: "accepted_watched",
          rating: 9.4,
        },
      ],
    },
    {
      generatedAt: "2026-07-04T12:30:00.000Z",
      topGenreLimit: 3,
      userLimit: 3,
    },
  );

  assert.equal(health.generatedAt, "2026-07-04T12:30:00.000Z");
  assert.equal(health.signalReport.summary.recommendationLogCount, 1);
  assert.equal(health.signalReport.summary.openCount, 1);
  assert.equal(health.trainingData.summary.rowCount, 1);
  assert.equal(health.trainingData.summary.acceptedCount, 1);
  assert.equal(health.trainingAnalysis.summary.positiveCount, 1);
  assert.equal(health.trainingAnalysis.summary.ratedCount, 1);
  assert.equal(health.trainingAnalysis.metadataCoverage.tmdbRatingCoverage, 1);
  assert.equal(health.trainingAnalysis.readiness.status, "not_ready");
});
