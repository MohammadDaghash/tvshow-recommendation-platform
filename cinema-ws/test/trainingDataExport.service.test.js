const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildTrainingDataExport,
  parseTrainingExportArgs,
} = require("../services/trainingDataExport.service");

test("buildTrainingDataExport creates one ML row per recommended item", () => {
  const exportData = buildTrainingDataExport({
    tvShows: [
      {
        _id: "show-1",
        title: "Severance",
        genres: ["Drama", "Science-Fiction & Fantasy"],
        year: 2022,
        tmdbId: 95396,
        tmdbRating: 8.4,
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
        createdAt: "2026-07-04T10:00:00.000Z",
        items: [
          {
            tvShow: "show-1",
            tmdbId: 95396,
            title: "Severance",
            position: 1,
            score: 94,
            scoreBreakdown: {
              genreSimilarity: 88,
            },
          },
          {
            tmdbId: 1396,
            title: "Breaking Bad",
            position: 2,
            score: 91,
          },
          {
            tmdbId: 42,
            title: "Ignored Show",
            position: 3,
            score: 70,
          },
        ],
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
        tmdbId: 1396,
        eventType: "suggestion_impression",
      },
      {
        user: "user-1",
        recommendationLog: "log-1",
        tmdbId: 1396,
        eventType: "card_opened",
      },
      {
        user: "user-1",
        recommendationLog: "log-1",
        tmdbId: 42,
        eventType: "suggestion_impression",
      },
    ],
    recommendationFeedback: [
      {
        user: "user-1",
        recommendationLog: "log-1",
        tvShow: "show-1",
        action: "accepted_watched",
        rating: 9,
      },
      {
        user: "user-1",
        recommendationLog: "log-1",
        tmdbId: 1396,
        action: "opened",
      },
      {
        user: "user-1",
        recommendationLog: "log-1",
        tmdbId: 42,
        action: "ignored",
      },
    ],
  });

  assert.deepEqual(exportData.summary, {
    rowCount: 3,
    recommendationLogCount: 1,
    linkedInteractionCount: 4,
    linkedFeedbackCount: 3,
    acceptedCount: 1,
    ignoredCount: 1,
    openedCount: 1,
    ratedCount: 1,
  });

  assert.deepEqual(
    exportData.rows.map((row) => ({
      logId: row.logId,
      userId: row.userId,
      modelVersion: row.modelVersion,
      source: row.source,
      page: row.page,
      shownAt: row.shownAt,
      tvShowId: row.tvShowId,
      tmdbId: row.tmdbId,
      title: row.title,
      genres: row.genres,
      year: row.year,
      tmdbRating: row.tmdbRating,
      popularity: row.popularity,
      rank: row.rank,
      score: row.score,
      wasImpressed: row.wasImpressed,
      wasOpened: row.wasOpened,
      wasAccepted: row.wasAccepted,
      wasIgnored: row.wasIgnored,
      wasRated: row.wasRated,
      rating: row.rating,
      feedbackActions: row.feedbackActions,
      scoreBreakdown: row.scoreBreakdown,
    })),
    [
      {
        logId: "log-1",
        userId: "user-1",
        modelVersion: "baseline-v1",
        source: "tmdb",
        page: "ai",
        shownAt: "2026-07-04T10:00:00.000Z",
        tvShowId: "show-1",
        tmdbId: 95396,
        title: "Severance",
        genres: ["Drama", "Science-Fiction & Fantasy"],
        year: 2022,
        tmdbRating: 8.4,
        popularity: 120,
        rank: 1,
        score: 94,
        wasImpressed: true,
        wasOpened: false,
        wasAccepted: true,
        wasIgnored: false,
        wasRated: true,
        rating: 9,
        feedbackActions: ["accepted_watched"],
        scoreBreakdown: {
          genreSimilarity: 88,
        },
      },
      {
        logId: "log-1",
        userId: "user-1",
        modelVersion: "baseline-v1",
        source: "tmdb",
        page: "ai",
        shownAt: "2026-07-04T10:00:00.000Z",
        tvShowId: "",
        tmdbId: 1396,
        title: "Breaking Bad",
        genres: [],
        year: null,
        tmdbRating: null,
        popularity: null,
        rank: 2,
        score: 91,
        wasImpressed: true,
        wasOpened: true,
        wasAccepted: false,
        wasIgnored: false,
        wasRated: false,
        rating: null,
        feedbackActions: ["opened"],
        scoreBreakdown: {},
      },
      {
        logId: "log-1",
        userId: "user-1",
        modelVersion: "baseline-v1",
        source: "tmdb",
        page: "ai",
        shownAt: "2026-07-04T10:00:00.000Z",
        tvShowId: "",
        tmdbId: 42,
        title: "Ignored Show",
        genres: [],
        year: null,
        tmdbRating: null,
        popularity: null,
        rank: 3,
        score: 70,
        wasImpressed: true,
        wasOpened: false,
        wasAccepted: false,
        wasIgnored: true,
        wasRated: false,
        rating: null,
        feedbackActions: ["ignored"],
        scoreBreakdown: {},
      },
    ],
  );
});

test("parseTrainingExportArgs defaults to text and supports json and limit", () => {
  assert.deepEqual(parseTrainingExportArgs([]), {
    format: "text",
    limit: 100,
  });

  assert.deepEqual(parseTrainingExportArgs(["--json", "--limit=5"]), {
    format: "json",
    limit: 5,
  });
});

test("buildTrainingDataExport sorts newest recommendation logs first", () => {
  const exportData = buildTrainingDataExport({
    recommendationLogs: [
      {
        _id: "old-log",
        user: "user-1",
        modelVersion: "baseline-v1",
        source: "tmdb",
        page: "ai",
        createdAt: "2026-07-03T10:00:00.000Z",
        items: [
          {
            tmdbId: 1,
            title: "Old First",
            position: 1,
            score: 60,
          },
        ],
      },
      {
        _id: "new-log",
        user: "user-1",
        modelVersion: "baseline-v1",
        source: "tmdb",
        page: "ai",
        createdAt: "2026-07-04T10:00:00.000Z",
        items: [
          {
            tmdbId: 2,
            title: "New Second",
            position: 2,
            score: 80,
          },
          {
            tmdbId: 3,
            title: "New First",
            position: 1,
            score: 90,
          },
        ],
      },
    ],
  });

  assert.deepEqual(
    exportData.rows.map((row) => row.title),
    ["New First", "New Second", "Old First"],
  );
});
