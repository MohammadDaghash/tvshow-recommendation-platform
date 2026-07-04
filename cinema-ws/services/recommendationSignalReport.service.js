const ACCEPT_ACTIONS = new Set([
  "accepted_want",
  "accepted_watching",
  "accepted_watched",
]);

const toId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.toString === "function") return value.toString();
  return String(value);
};

const round = (value) => Number(value.toFixed(2));

const isValidRating = (value) => {
  if (value === undefined || value === null || value === "") return false;

  const rating = Number(value);

  return Number.isFinite(rating) && rating >= 0 && rating <= 10;
};

const buildUserLookup = (users = []) => {
  return new Map(
    users.map((user) => [
      toId(user._id),
      {
        userId: toId(user._id),
        userName: user.name || "Unknown user",
        userEmail: user.email || "",
      },
    ]),
  );
};

const getUserInfo = (userLookup, userId) => {
  const cleanUserId = toId(userId);

  return (
    userLookup.get(cleanUserId) || {
      userId: cleanUserId,
      userName: "Unknown user",
      userEmail: "",
    }
  );
};

const getRowKey = (userId, modelVersion) => {
  return `${toId(userId)}::${modelVersion || "unknown"}`;
};

const createEmptyRow = (userInfo, modelVersion) => ({
  userId: userInfo.userId,
  userName: userInfo.userName,
  userEmail: userInfo.userEmail,
  modelVersion: modelVersion || "unknown",
  recommendationLogs: 0,
  recommendedItems: 0,
  impressions: 0,
  opens: 0,
  feedbackEvents: 0,
  linkedFeedback: 0,
  unlinkedFeedback: 0,
  accepts: 0,
  ignored: 0,
  ratings: 0,
  averageRating: null,
  openRate: 0,
  acceptanceRate: 0,
  ignoreRate: 0,
  ratingTotal: 0,
});

const getOrCreateRow = ({ rowsByKey, userLookup, userId, modelVersion }) => {
  const cleanModelVersion = modelVersion || "unknown";
  const key = getRowKey(userId, cleanModelVersion);

  if (!rowsByKey.has(key)) {
    rowsByKey.set(
      key,
      createEmptyRow(getUserInfo(userLookup, userId), cleanModelVersion),
    );
  }

  return rowsByKey.get(key);
};

const buildLogLookup = (recommendationLogs = []) => {
  return new Map(
    recommendationLogs.map((log) => [
      toId(log._id),
      {
        user: toId(log.user),
        modelVersion: log.modelVersion || "unknown",
      },
    ]),
  );
};

const getSignalModelVersion = (record, logLookup) => {
  const linkedLog = logLookup.get(toId(record.recommendationLog));

  return record.modelVersion || linkedLog?.modelVersion || "unknown";
};

const getSignalUserId = (record, logLookup) => {
  const linkedLog = logLookup.get(toId(record.recommendationLog));

  return toId(record.user) || linkedLog?.user || "";
};

const finalizeRow = (row) => {
  const averageRating = row.ratings > 0 ? round(row.ratingTotal / row.ratings) : null;
  const openRate = row.impressions > 0 ? round(row.opens / row.impressions) : 0;
  const acceptanceRate =
    row.impressions > 0 ? round(row.accepts / row.impressions) : 0;
  const ignoreRate =
    row.impressions > 0 ? round(row.ignored / row.impressions) : 0;
  const { ratingTotal, ...publicRow } = row;

  return {
    ...publicRow,
    averageRating,
    openRate,
    acceptanceRate,
    ignoreRate,
  };
};

const compareRows = (left, right) => {
  const emailDifference = String(left.userEmail).localeCompare(
    String(right.userEmail),
  );

  if (emailDifference !== 0) return emailDifference;

  return String(left.modelVersion).localeCompare(String(right.modelVersion));
};

function buildRecommendationSignalReport(
  {
    users = [],
    recommendationLogs = [],
    userInteractions = [],
    recommendationFeedback = [],
  },
  { limit = 20 } = {},
) {
  const cleanLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;
  const userLookup = buildUserLookup(users);
  const logLookup = buildLogLookup(recommendationLogs);
  const rowsByKey = new Map();
  const summary = {
    userCount: new Set(users.map((user) => toId(user._id))).size,
    modelVersionCount: 0,
    recommendationLogCount: recommendationLogs.length,
    recommendedItemCount: 0,
    impressionCount: 0,
    openCount: 0,
    feedbackCount: recommendationFeedback.length,
    linkedFeedbackCount: 0,
    unlinkedFeedbackCount: 0,
    acceptCount: 0,
    ignoreCount: 0,
    ratingCount: 0,
  };

  for (const log of recommendationLogs) {
    const row = getOrCreateRow({
      rowsByKey,
      userLookup,
      userId: log.user,
      modelVersion: log.modelVersion,
    });
    const itemCount = Array.isArray(log.items) ? log.items.length : 0;

    row.recommendationLogs += 1;
    row.recommendedItems += itemCount;
    summary.recommendedItemCount += itemCount;
  }

  for (const interaction of userInteractions) {
    const row = getOrCreateRow({
      rowsByKey,
      userLookup,
      userId: getSignalUserId(interaction, logLookup),
      modelVersion: getSignalModelVersion(interaction, logLookup),
    });

    if (interaction.eventType === "suggestion_impression") {
      row.impressions += 1;
      summary.impressionCount += 1;
    }

    if (interaction.eventType === "card_opened") {
      row.opens += 1;
      summary.openCount += 1;
    }
  }

  for (const feedback of recommendationFeedback) {
    const linkedFeedback = Boolean(feedback.recommendationLog);
    const row = getOrCreateRow({
      rowsByKey,
      userLookup,
      userId: getSignalUserId(feedback, logLookup),
      modelVersion: getSignalModelVersion(feedback, logLookup),
    });

    row.feedbackEvents += 1;

    if (linkedFeedback) {
      row.linkedFeedback += 1;
      summary.linkedFeedbackCount += 1;
    } else {
      row.unlinkedFeedback += 1;
      summary.unlinkedFeedbackCount += 1;
    }

    if (ACCEPT_ACTIONS.has(feedback.action)) {
      row.accepts += 1;
      summary.acceptCount += 1;
    }

    if (feedback.action === "ignored") {
      row.ignored += 1;
      summary.ignoreCount += 1;
    }

    if (isValidRating(feedback.rating)) {
      row.ratings += 1;
      row.ratingTotal += Number(feedback.rating);
      summary.ratingCount += 1;
    }
  }

  const rows = [...rowsByKey.values()].map(finalizeRow).sort(compareRows);

  summary.modelVersionCount = new Set(rows.map((row) => row.modelVersion)).size;

  return {
    summary,
    rows: rows.slice(0, cleanLimit),
  };
}

function parseSignalReportArgs(args) {
  const options = {
    format: args.includes("--json") ? "json" : "text",
    limit: 20,
  };

  for (const arg of args) {
    if (!arg.startsWith("--limit=")) continue;

    const limit = Number(arg.slice("--limit=".length));

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error("--limit must be a positive integer");
    }

    options.limit = limit;
  }

  return options;
}

module.exports = {
  buildRecommendationSignalReport,
  parseSignalReportArgs,
};
