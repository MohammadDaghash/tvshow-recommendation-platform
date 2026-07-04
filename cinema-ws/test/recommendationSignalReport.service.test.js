const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildRecommendationSignalReport,
  parseSignalReportArgs,
} = require("../services/recommendationSignalReport.service");

test("buildRecommendationSignalReport aggregates training signals by user and model", () => {
  const report = buildRecommendationSignalReport({
    users: [
      {
        _id: "user-1",
        name: "Ava",
        email: "ava@example.com",
      },
      {
        _id: "user-2",
        name: "Noah",
        email: "noah@example.com",
      },
    ],
    recommendationLogs: [
      {
        _id: "log-1",
        user: "user-1",
        modelVersion: "baseline-v1",
        items: [{ title: "Severance" }, { title: "Breaking Bad" }],
      },
      {
        _id: "log-2",
        user: "user-1",
        modelVersion: "baseline-v1",
        items: [{ title: "Friends" }],
      },
      {
        _id: "log-3",
        user: "user-1",
        modelVersion: "baseline-v2",
        items: [{ title: "Dark" }],
      },
      {
        _id: "log-4",
        user: "user-2",
        modelVersion: "baseline-v1",
        items: [],
      },
    ],
    userInteractions: [
      {
        user: "user-1",
        recommendationLog: "log-1",
        eventType: "suggestion_impression",
      },
      {
        user: "user-1",
        recommendationLog: "log-1",
        eventType: "suggestion_impression",
      },
      {
        user: "user-1",
        recommendationLog: "log-1",
        eventType: "card_opened",
      },
      {
        user: "user-1",
        recommendationLog: "log-3",
        eventType: "card_opened",
      },
      {
        user: "user-2",
        modelVersion: "baseline-v1",
        eventType: "suggestion_impression",
      },
    ],
    recommendationFeedback: [
      {
        user: "user-1",
        recommendationLog: "log-1",
        action: "accepted_want",
      },
      {
        user: "user-1",
        recommendationLog: "log-1",
        action: "accepted_watched",
        rating: 9,
      },
      {
        user: "user-1",
        recommendationLog: "log-1",
        action: "ignored",
      },
      {
        user: "user-1",
        recommendationLog: "log-3",
        action: "rated",
        rating: 8,
      },
      {
        user: "user-1",
        action: "ignored",
      },
      {
        user: "user-2",
        recommendationLog: "log-4",
        action: "accepted_watching",
      },
    ],
  });

  assert.deepEqual(report.summary, {
    userCount: 2,
    modelVersionCount: 3,
    recommendationLogCount: 4,
    recommendedItemCount: 4,
    impressionCount: 3,
    openCount: 2,
    feedbackCount: 6,
    linkedFeedbackCount: 5,
    unlinkedFeedbackCount: 1,
    acceptCount: 3,
    ignoreCount: 2,
    ratingCount: 2,
  });

  assert.deepEqual(
    report.rows.map((row) => ({
      userEmail: row.userEmail,
      modelVersion: row.modelVersion,
      recommendationLogs: row.recommendationLogs,
      recommendedItems: row.recommendedItems,
      impressions: row.impressions,
      opens: row.opens,
      accepts: row.accepts,
      ignored: row.ignored,
      ratings: row.ratings,
      averageRating: row.averageRating,
      linkedFeedback: row.linkedFeedback,
      unlinkedFeedback: row.unlinkedFeedback,
      openRate: row.openRate,
      acceptanceRate: row.acceptanceRate,
      ignoreRate: row.ignoreRate,
    })),
    [
      {
        userEmail: "ava@example.com",
        modelVersion: "baseline-v1",
        recommendationLogs: 2,
        recommendedItems: 3,
        impressions: 2,
        opens: 1,
        accepts: 2,
        ignored: 1,
        ratings: 1,
        averageRating: 9,
        linkedFeedback: 3,
        unlinkedFeedback: 0,
        openRate: 0.5,
        acceptanceRate: 1,
        ignoreRate: 0.5,
      },
      {
        userEmail: "ava@example.com",
        modelVersion: "baseline-v2",
        recommendationLogs: 1,
        recommendedItems: 1,
        impressions: 0,
        opens: 1,
        accepts: 0,
        ignored: 0,
        ratings: 1,
        averageRating: 8,
        linkedFeedback: 1,
        unlinkedFeedback: 0,
        openRate: 0,
        acceptanceRate: 0,
        ignoreRate: 0,
      },
      {
        userEmail: "ava@example.com",
        modelVersion: "unknown",
        recommendationLogs: 0,
        recommendedItems: 0,
        impressions: 0,
        opens: 0,
        accepts: 0,
        ignored: 1,
        ratings: 0,
        averageRating: null,
        linkedFeedback: 0,
        unlinkedFeedback: 1,
        openRate: 0,
        acceptanceRate: 0,
        ignoreRate: 0,
      },
      {
        userEmail: "noah@example.com",
        modelVersion: "baseline-v1",
        recommendationLogs: 1,
        recommendedItems: 0,
        impressions: 1,
        opens: 0,
        accepts: 1,
        ignored: 0,
        ratings: 0,
        averageRating: null,
        linkedFeedback: 1,
        unlinkedFeedback: 0,
        openRate: 0,
        acceptanceRate: 1,
        ignoreRate: 0,
      },
    ],
  );
});

test("parseSignalReportArgs defaults to text and supports json and limit", () => {
  assert.deepEqual(parseSignalReportArgs([]), {
    format: "text",
    limit: 20,
  });

  assert.deepEqual(parseSignalReportArgs(["--json", "--limit=5"]), {
    format: "json",
    limit: 5,
  });
});
