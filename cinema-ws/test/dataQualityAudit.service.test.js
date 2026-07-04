const assert = require("node:assert/strict");
const test = require("node:test");

const {
  auditDataQualitySnapshot,
  parseAuditArgs,
} = require("../services/dataQualityAudit.service");

test("auditDataQualitySnapshot flags catalog metadata gaps", () => {
  const report = auditDataQualitySnapshot({
    tvShows: [
      {
        _id: "show-1",
        title: "Friends",
        genres: ["Comedy"],
        year: 1994,
        imageUrl: "poster.jpg",
        tmdbId: 1668,
        tmdbRating: 8.4,
        popularity: 120,
      },
      {
        _id: "show-2",
        title: "Broken Show",
        genres: [],
        tmdbRating: null,
      },
    ],
  });

  assert.equal(report.summary.issueCount, 1);
  assert.deepEqual(report.issues[0], {
    severity: "error",
    collection: "TVShow",
    code: "tvshow_missing_metadata",
    id: "show-2",
    title: "Broken Show",
    detail: "Missing required metadata: genres, year, imageUrl, tmdbId, tmdbRating, popularity",
  });
});

test("auditDataQualitySnapshot flags invalid user show state and duplicates", () => {
  const report = auditDataQualitySnapshot({
    users: [{ _id: "user-1" }],
    tvShows: [
      {
        _id: "show-1",
        title: "Friends",
        genres: ["Comedy"],
        year: 1994,
        imageUrl: "poster.jpg",
        tmdbId: 1668,
        tmdbRating: 8.4,
        popularity: 120,
      },
    ],
    userShows: [
      {
        _id: "user-show-1",
        user: "user-1",
        tvShow: "show-1",
        status: "watched",
        userRating: null,
      },
      {
        _id: "user-show-2",
        user: "user-1",
        tvShow: "show-1",
        status: "want",
        userRating: null,
      },
      {
        _id: "user-show-3",
        user: "missing-user",
        tvShow: "missing-show",
        status: "watching",
        userRating: 8,
      },
    ],
  });

  assert.deepEqual(
    report.issues.map((issue) => issue.code),
    [
      "usershow_watched_missing_rating",
      "usershow_duplicate",
      "usershow_orphan_user",
      "usershow_orphan_tvshow",
      "usershow_non_watched_has_rating",
    ],
  );
});

test("auditDataQualitySnapshot checks recommendation logs and feedback records", () => {
  const report = auditDataQualitySnapshot({
    users: [{ _id: "user-1" }],
    tvShows: [
      {
        _id: "show-1",
        title: "Friends",
        genres: ["Comedy"],
        year: 1994,
        imageUrl: "poster.jpg",
        tmdbId: 1668,
        tmdbRating: 8.4,
        popularity: 120,
      },
    ],
    recommendationLogs: [
      {
        _id: "log-1",
        user: "user-1",
        modelVersion: "tmdb-v1",
        source: "tmdb",
        page: "ai",
        items: [],
      },
      {
        _id: "log-2",
        user: "missing-user",
        modelVersion: "tmdb-v1",
        source: "tmdb",
        page: "ai",
        items: [
          {
            position: 0,
            score: 101,
          },
        ],
      },
    ],
    recommendationFeedback: [
      {
        _id: "feedback-1",
        user: "user-1",
        recommendationLog: "missing-log",
        action: "accepted_watched",
        rating: 12,
      },
    ],
  });

  assert.deepEqual(
    report.issues.map((issue) => issue.code),
    [
      "recommendation_log_empty",
      "recommendation_log_orphan_user",
      "recommendation_item_missing_identifier",
      "recommendation_item_invalid_score",
      "feedback_orphan_log",
      "feedback_missing_item_identifier",
      "feedback_invalid_rating",
    ],
  );
});

test("parseAuditArgs supports json output and fail-on-error", () => {
  assert.deepEqual(parseAuditArgs([]), {
    format: "text",
    failOnError: false,
  });

  assert.deepEqual(parseAuditArgs(["--json", "--fail-on-error"]), {
    format: "json",
    failOnError: true,
  });
});
