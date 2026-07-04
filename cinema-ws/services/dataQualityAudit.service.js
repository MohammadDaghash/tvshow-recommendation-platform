const validUserShowStatuses = new Set(["watched", "want", "watching"]);
const validFeedbackActions = new Set([
  "accepted_want",
  "accepted_watching",
  "accepted_watched",
  "ignored",
  "opened",
  "rated",
]);

const toId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.toString === "function") return value.toString();
  return String(value);
};

const hasValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null && value !== "";
};

const isRating = (value) => {
  if (!hasValue(value)) return false;

  const rating = Number(value);

  return Number.isFinite(rating) && rating >= 0 && rating <= 10;
};

const isScore = (value) => {
  if (!hasValue(value)) return false;

  const score = Number(value);

  return Number.isFinite(score) && score >= 0 && score <= 100;
};

const addIssue = (issues, issue) => {
  issues.push({
    severity: "error",
    ...issue,
  });
};

const buildIdSet = (records = []) => new Set(records.map((record) => toId(record._id)));

const hasShowIdentifier = (record) =>
  hasValue(record.tvShow) || hasValue(record.tmdbId) || hasValue(record.title);

const auditTVShows = (snapshot, issues) => {
  for (const show of snapshot.tvShows || []) {
    const missingFields = [
      "genres",
      "year",
      "imageUrl",
      "tmdbId",
      "tmdbRating",
      "popularity",
    ].filter((field) => !hasValue(show[field]));

    if (missingFields.length > 0) {
      addIssue(issues, {
        collection: "TVShow",
        code: "tvshow_missing_metadata",
        id: toId(show._id),
        title: show.title,
        detail: `Missing required metadata: ${missingFields.join(", ")}`,
      });
    }
  }
};

const auditUserShows = (snapshot, issues, userIds, tvShowIds) => {
  const seenPairs = new Map();

  for (const userShow of snapshot.userShows || []) {
    const id = toId(userShow._id);
    const userId = toId(userShow.user);
    const tvShowId = toId(userShow.tvShow);
    const pairKey = `${userId}:${tvShowId}`;

    if (userShow.status === "watched" && !isRating(userShow.userRating)) {
      addIssue(issues, {
        collection: "UserShow",
        code: "usershow_watched_missing_rating",
        id,
        detail: "Watched records need a userRating between 0 and 10",
      });
    }

    if (seenPairs.has(pairKey)) {
      addIssue(issues, {
        collection: "UserShow",
        code: "usershow_duplicate",
        id,
        detail: `Duplicate user/show pair also seen in ${seenPairs.get(pairKey)}`,
      });
    } else {
      seenPairs.set(pairKey, id);
    }

    if (!userIds.has(userId)) {
      addIssue(issues, {
        collection: "UserShow",
        code: "usershow_orphan_user",
        id,
        detail: `User ${userId || "(missing)"} does not exist`,
      });
    }

    if (!tvShowIds.has(tvShowId)) {
      addIssue(issues, {
        collection: "UserShow",
        code: "usershow_orphan_tvshow",
        id,
        detail: `TV show ${tvShowId || "(missing)"} does not exist`,
      });
    }

    if (userShow.status !== "watched" && hasValue(userShow.userRating)) {
      addIssue(issues, {
        collection: "UserShow",
        code: "usershow_non_watched_has_rating",
        id,
        detail: "Only watched records should keep userRating",
      });
    }

    if (!validUserShowStatuses.has(userShow.status)) {
      addIssue(issues, {
        collection: "UserShow",
        code: "usershow_invalid_status",
        id,
        detail: `Invalid status: ${userShow.status}`,
      });
    }
  }
};

const auditRecommendationLogs = (snapshot, issues, userIds) => {
  for (const log of snapshot.recommendationLogs || []) {
    const id = toId(log._id);

    if (!Array.isArray(log.items) || log.items.length === 0) {
      addIssue(issues, {
        collection: "RecommendationLog",
        code: "recommendation_log_empty",
        id,
        detail: "Recommendation logs should include ranked items",
      });
    }

    if (!userIds.has(toId(log.user))) {
      addIssue(issues, {
        collection: "RecommendationLog",
        code: "recommendation_log_orphan_user",
        id,
        detail: `User ${toId(log.user) || "(missing)"} does not exist`,
      });
    }

    for (const item of log.items || []) {
      if (!hasShowIdentifier(item)) {
        addIssue(issues, {
          collection: "RecommendationLog",
          code: "recommendation_item_missing_identifier",
          id,
          detail: `Item at position ${item.position} has no tvShow, tmdbId, or title`,
        });
      }

      if (!isScore(item.score)) {
        addIssue(issues, {
          collection: "RecommendationLog",
          code: "recommendation_item_invalid_score",
          id,
          detail: `Item at position ${item.position} has invalid score ${item.score}`,
        });
      }
    }
  }
};

const auditRecommendationFeedback = (
  snapshot,
  issues,
  userIds,
  tvShowIds,
  recommendationLogIds,
) => {
  for (const feedback of snapshot.recommendationFeedback || []) {
    const id = toId(feedback._id);
    const tvShowId = toId(feedback.tvShow);
    const logId = toId(feedback.recommendationLog);

    if (!userIds.has(toId(feedback.user))) {
      addIssue(issues, {
        collection: "RecommendationFeedback",
        code: "feedback_orphan_user",
        id,
        detail: `User ${toId(feedback.user) || "(missing)"} does not exist`,
      });
    }

    if (logId && !recommendationLogIds.has(logId)) {
      addIssue(issues, {
        collection: "RecommendationFeedback",
        code: "feedback_orphan_log",
        id,
        detail: `Recommendation log ${logId} does not exist`,
      });
    }

    if (tvShowId && !tvShowIds.has(tvShowId)) {
      addIssue(issues, {
        collection: "RecommendationFeedback",
        code: "feedback_orphan_tvshow",
        id,
        detail: `TV show ${tvShowId} does not exist`,
      });
    }

    if (!hasShowIdentifier(feedback)) {
      addIssue(issues, {
        collection: "RecommendationFeedback",
        code: "feedback_missing_item_identifier",
        id,
        detail: "Feedback should include tvShow, tmdbId, or title metadata",
      });
    }

    if (hasValue(feedback.rating) && !isRating(feedback.rating)) {
      addIssue(issues, {
        collection: "RecommendationFeedback",
        code: "feedback_invalid_rating",
        id,
        detail: `Invalid feedback rating: ${feedback.rating}`,
      });
    }

    if (!validFeedbackActions.has(feedback.action)) {
      addIssue(issues, {
        collection: "RecommendationFeedback",
        code: "feedback_invalid_action",
        id,
        detail: `Invalid feedback action: ${feedback.action}`,
      });
    }
  }
};

function auditDataQualitySnapshot(snapshot = {}) {
  const issues = [];
  const userIds = buildIdSet(snapshot.users);
  const tvShowIds = buildIdSet(snapshot.tvShows);
  const recommendationLogIds = buildIdSet(snapshot.recommendationLogs);

  auditTVShows(snapshot, issues);
  auditUserShows(snapshot, issues, userIds, tvShowIds);
  auditRecommendationLogs(snapshot, issues, userIds);
  auditRecommendationFeedback(
    snapshot,
    issues,
    userIds,
    tvShowIds,
    recommendationLogIds,
  );

  return {
    summary: {
      issueCount: issues.length,
      errorCount: issues.filter((issue) => issue.severity === "error").length,
    },
    issues,
  };
}

function parseAuditArgs(args) {
  return {
    format: args.includes("--json") ? "json" : "text",
    failOnError: args.includes("--fail-on-error"),
  };
}

module.exports = {
  auditDataQualitySnapshot,
  parseAuditArgs,
};
