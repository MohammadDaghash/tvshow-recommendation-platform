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

const normalizeTitle = (title) =>
  String(title || "")
    .trim()
    .toLowerCase();

const cleanObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
};

const isValidRating = (value) => {
  if (value === undefined || value === null || value === "") return false;

  const rating = Number(value);

  return Number.isFinite(rating) && rating >= 0 && rating <= 10;
};

const buildShowLookup = (tvShows = []) => {
  const byId = new Map();
  const byTmdbId = new Map();

  for (const show of tvShows) {
    const showId = toId(show._id);

    if (showId) byId.set(showId, show);
    if (show.tmdbId) byTmdbId.set(Number(show.tmdbId), show);
  }

  return {
    byId,
    byTmdbId,
  };
};

const getShowMetadata = (item, showLookup) => {
  const show =
    showLookup.byId.get(toId(item.tvShow)) ||
    showLookup.byTmdbId.get(Number(item.tmdbId)) ||
    {};

  return {
    tvShowId: toId(item.tvShow || show._id),
    tmdbId:
      item.tmdbId !== undefined && item.tmdbId !== null
        ? Number(item.tmdbId)
        : show.tmdbId || null,
    title: item.title || show.title || "",
    genres: show.genres || [],
    year: show.year || null,
    tmdbRating:
      show.tmdbRating !== undefined && show.tmdbRating !== null
        ? Number(show.tmdbRating)
        : null,
    popularity:
      show.popularity !== undefined && show.popularity !== null
        ? Number(show.popularity)
        : null,
  };
};

const buildRowKey = (logId, item) => {
  const parts = [toId(logId)];

  if (toId(item.tvShow)) parts.push(`show:${toId(item.tvShow)}`);
  if (item.tmdbId) parts.push(`tmdb:${Number(item.tmdbId)}`);
  if (item.position) parts.push(`rank:${Number(item.position)}`);
  if (item.title) parts.push(`title:${normalizeTitle(item.title)}`);

  return parts.join("|");
};

const recordMatchesItem = (record, item, logId) => {
  if (toId(record.recommendationLog) !== toId(logId)) return false;

  if (toId(record.tvShow) && toId(item.tvShow)) {
    return toId(record.tvShow) === toId(item.tvShow);
  }

  if (record.tmdbId && item.tmdbId) {
    return Number(record.tmdbId) === Number(item.tmdbId);
  }

  if (record.position && item.position) {
    return Number(record.position) === Number(item.position);
  }

  if (record.title && item.title) {
    return normalizeTitle(record.title) === normalizeTitle(item.title);
  }

  return false;
};

const groupSignalsByItem = ({ recommendationLogs, userInteractions, recommendationFeedback }) => {
  const signalsByKey = new Map();

  const ensureSignals = (logId, item) => {
    const key = buildRowKey(logId, item);

    if (!signalsByKey.has(key)) {
      signalsByKey.set(key, {
        feedback: [],
        interactions: [],
      });
    }

    return signalsByKey.get(key);
  };

  for (const log of recommendationLogs) {
    for (const item of log.items || []) {
      const signals = ensureSignals(log._id, item);

      for (const interaction of userInteractions) {
        if (recordMatchesItem(interaction, item, log._id)) {
          signals.interactions.push(interaction);
        }
      }

      for (const feedback of recommendationFeedback) {
        if (recordMatchesItem(feedback, item, log._id)) {
          signals.feedback.push(feedback);
        }
      }
    }
  }

  return signalsByKey;
};

const getSignalContext = ({ log, signals }) => {
  const linkedSignals = [...signals.feedback, ...signals.interactions];
  const contextSignal = linkedSignals.find((signal) => {
    return signal.metadata?.actorRole || signal.metadata?.dataScope;
  });

  return {
    actorRole: contextSignal?.metadata?.actorRole || "",
    dataScope:
      contextSignal?.metadata?.dataScope ||
      (log.source === "demo" ? "demo" : "private"),
  };
};

const createTrainingRow = ({ log, item, showLookup, signals }) => {
  const metadata = getShowMetadata(item, showLookup);
  const signalContext = getSignalContext({ log, signals });
  const feedbackActions = signals.feedback.map((feedback) => feedback.action);
  const ratingFeedback = signals.feedback.find((feedback) =>
    isValidRating(feedback.rating),
  );
  const wasOpened =
    signals.interactions.some(
      (interaction) => interaction.eventType === "card_opened",
    ) || feedbackActions.includes("opened");
  const wasAccepted = feedbackActions.some((action) => ACCEPT_ACTIONS.has(action));
  const wasIgnored = feedbackActions.includes("ignored");
  const rating = ratingFeedback ? Number(ratingFeedback.rating) : null;

  return {
    logId: toId(log._id),
    userId: toId(log.user),
    actorRole: signalContext.actorRole,
    dataScope: signalContext.dataScope,
    modelVersion: log.modelVersion || "unknown",
    source: log.source || "",
    page: log.page || "",
    shownAt: log.createdAt ? new Date(log.createdAt).toISOString() : null,
    tvShowId: metadata.tvShowId,
    tmdbId: metadata.tmdbId,
    title: metadata.title,
    genres: metadata.genres,
    year: metadata.year,
    tmdbRating: metadata.tmdbRating,
    popularity: metadata.popularity,
    rank: Number(item.position) || null,
    score:
      item.score !== undefined && item.score !== null ? Number(item.score) : null,
    scoreBreakdown: cleanObject(item.scoreBreakdown),
    wasImpressed: signals.interactions.some(
      (interaction) => interaction.eventType === "suggestion_impression",
    ),
    wasOpened,
    wasAccepted,
    wasIgnored,
    wasRated: rating !== null,
    rating,
    interactionCount: signals.interactions.length,
    feedbackCount: signals.feedback.length,
    feedbackActions,
  };
};

const compareTrainingRows = (left, right) => {
  const leftTime = left.shownAt ? Date.parse(left.shownAt) : 0;
  const rightTime = right.shownAt ? Date.parse(right.shownAt) : 0;
  const timeDifference = rightTime - leftTime;

  if (timeDifference !== 0) return timeDifference;

  return (left.rank || 0) - (right.rank || 0);
};

function buildTrainingDataExport(
  {
    tvShows = [],
    recommendationLogs = [],
    userInteractions = [],
    recommendationFeedback = [],
  },
  { limit = 100 } = {},
) {
  const cleanLimit = Number.isInteger(limit) && limit > 0 ? limit : 100;
  const showLookup = buildShowLookup(tvShows);
  const signalsByKey = groupSignalsByItem({
    recommendationLogs,
    userInteractions,
    recommendationFeedback,
  });
  const rows = [];
  const summary = {
    rowCount: 0,
    recommendationLogCount: recommendationLogs.length,
    linkedInteractionCount: 0,
    linkedFeedbackCount: 0,
    acceptedCount: 0,
    ignoredCount: 0,
    openedCount: 0,
    ratedCount: 0,
  };

  for (const log of recommendationLogs) {
    for (const item of log.items || []) {
      const signals = signalsByKey.get(buildRowKey(log._id, item)) || {
        feedback: [],
        interactions: [],
      };
      const row = createTrainingRow({
        log,
        item,
        showLookup,
        signals,
      });

      rows.push(row);
      summary.linkedInteractionCount += signals.interactions.length;
      summary.linkedFeedbackCount += signals.feedback.length;
      if (row.wasAccepted) summary.acceptedCount += 1;
      if (row.wasIgnored) summary.ignoredCount += 1;
      if (row.wasOpened) summary.openedCount += 1;
      if (row.wasRated) summary.ratedCount += 1;
    }
  }

  summary.rowCount = rows.length;

  const sortedRows = rows.sort(compareTrainingRows);

  return {
    summary,
    rows: sortedRows.slice(0, cleanLimit),
  };
}

function parseTrainingExportArgs(args) {
  const options = {
    format: args.includes("--json") ? "json" : "text",
    limit: 100,
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
  buildTrainingDataExport,
  parseTrainingExportArgs,
};
