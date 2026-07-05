const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildRecommendationFeedback,
  buildRecommendationLog,
  recordRecommendationFeedback,
  recordRecommendationLog,
} = require("../services/recommendationData.service");

test("buildRecommendationLog keeps ranked item score data", () => {
  assert.deepEqual(
    buildRecommendationLog({
      userId: "user-1",
      modelVersion: "baseline-v1",
      source: "tmdb",
      page: "ai",
      items: [
        {
          tvShowId: "show-1",
          tmdbId: 95396,
          title: "Severance",
          score: 91,
          position: 1,
          scoreBreakdown: {
            genreSimilarity: 80,
          },
        },
      ],
    }),
    {
      user: "user-1",
      modelVersion: "baseline-v1",
      source: "tmdb",
      page: "ai",
      items: [
        {
          tvShow: "show-1",
          tmdbId: 95396,
          title: "Severance",
          score: 91,
          position: 1,
          scoreBreakdown: {
            genreSimilarity: 80,
          },
        },
      ],
    },
  );
});

test("buildRecommendationFeedback creates supervised feedback labels", () => {
  assert.deepEqual(
    buildRecommendationFeedback({
      userId: "user-1",
      recommendationLogId: "log-1",
      tvShowId: "show-1",
      tmdbId: 95396,
      action: "accepted_watched",
      rating: 9,
      metadata: {
        sourcePage: "ai",
        ignored: undefined,
      },
    }),
    {
      user: "user-1",
      recommendationLog: "log-1",
      tvShow: "show-1",
      tmdbId: 95396,
      action: "accepted_watched",
      rating: 9,
      sourcePage: "ai",
      metadata: {
        sourcePage: "ai",
      },
    },
  );
});

test("buildRecommendationFeedback promotes source and score context for ML joins", () => {
  assert.deepEqual(
    buildRecommendationFeedback({
      userId: "user-1",
      recommendationLogId: "log-1",
      tvShowId: "show-1",
      tmdbId: 95396,
      action: "accepted_watching",
      metadata: {
        sourcePage: "ai",
        position: 4,
        modelVersion: "baseline-v1",
        actionType: "move_to_currently_watching",
        previousStatus: "ai_suggestion",
        nextStatus: "watching",
        recommendationScore: 91,
        matchScore: 93,
        tmdbRating: 8.4,
        ignoredValue: undefined,
      },
    }),
    {
      user: "user-1",
      recommendationLog: "log-1",
      tvShow: "show-1",
      tmdbId: 95396,
      action: "accepted_watching",
      sourcePage: "ai",
      position: 4,
      modelVersion: "baseline-v1",
      actionType: "move_to_currently_watching",
      previousStatus: "ai_suggestion",
      nextStatus: "watching",
      recommendationScore: 91,
      matchScore: 93,
      tmdbRating: 8.4,
      metadata: {
        sourcePage: "ai",
        position: 4,
        modelVersion: "baseline-v1",
        actionType: "move_to_currently_watching",
        previousStatus: "ai_suggestion",
        nextStatus: "watching",
        recommendationScore: 91,
        matchScore: 93,
        tmdbRating: 8.4,
      },
    },
  );
});

test("recordRecommendationLog and recordRecommendationFeedback support injected models", async () => {
  const createdLogs = [];
  const createdFeedback = [];
  const logModel = {
    create: async (payload) => {
      createdLogs.push(payload);
      return {
        _id: "log-1",
        ...payload,
      };
    },
  };
  const feedbackModel = {
    create: async (payload) => {
      createdFeedback.push(payload);
      return {
        _id: "feedback-1",
        ...payload,
      };
    },
  };

  const log = await recordRecommendationLog(
    {
      userId: "user-1",
      modelVersion: "baseline-v1",
      source: "catalog",
      page: "ai",
      items: [],
    },
    { model: logModel },
  );
  const feedback = await recordRecommendationFeedback(
    {
      userId: "user-1",
      recommendationLogId: log._id,
      action: "ignored",
      tmdbId: 1,
    },
    { model: feedbackModel },
  );

  assert.equal(log._id, "log-1");
  assert.equal(feedback._id, "feedback-1");
  assert.equal(createdLogs.length, 1);
  assert.equal(createdFeedback.length, 1);
});
