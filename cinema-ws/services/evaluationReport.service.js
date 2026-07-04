const toId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.toString === "function") return value.toString();
  return String(value);
};

const round = (value) => Number(value.toFixed(2));

const getItemId = (item) => toId(item._id || item.tvShow || item.tmdbId || item.title);

const isWatchedRecord = (record) =>
  record.status === "watched" || record.watched === true;

const isPositiveRating = (record, threshold) => {
  if (!isWatchedRecord(record)) return false;

  const rating = Number(record.userRating);

  return Number.isFinite(rating) && rating >= threshold;
};

const collectPositiveItemIds = ({ tvShows = [], userShows = [] }, threshold) => {
  const positiveIds = new Set();

  for (const show of tvShows) {
    if (isPositiveRating(show, threshold)) {
      positiveIds.add(toId(show._id));
    }
  }

  for (const userShow of userShows) {
    if (isPositiveRating(userShow, threshold)) {
      positiveIds.add(toId(userShow.tvShow));
    }
  }

  return positiveIds;
};

function evaluateRanking({ rankedItems = [], relevantIds = new Set(), k = 10 }) {
  const cutoff = Number.isInteger(k) && k > 0 ? k : 10;
  const topItems = rankedItems.slice(0, cutoff);
  const relevantCount = relevantIds.size;
  let hits = 0;
  let precisionSum = 0;
  let firstHitRank = null;

  topItems.forEach((item, index) => {
    const rank = index + 1;

    if (!relevantIds.has(getItemId(item))) return;

    hits += 1;
    precisionSum += hits / rank;

    if (firstHitRank === null) {
      firstHitRank = rank;
    }
  });

  return {
    k: cutoff,
    relevantCount,
    hits,
    hitRate: hits > 0 ? 1 : 0,
    precision: topItems.length > 0 ? round(hits / cutoff) : 0,
    recall: relevantCount > 0 ? round(hits / relevantCount) : 0,
    averagePrecision:
      relevantCount > 0 ? round(precisionSum / relevantCount) : 0,
    firstHitRank,
  };
}

function buildEvaluationReport(
  { tvShows = [], userShows = [], strategies = {} },
  { k = 10, positiveRatingThreshold = 8 } = {},
) {
  const cutoff = Number.isInteger(k) && k > 0 ? k : 10;
  const threshold = Number(positiveRatingThreshold);
  const relevantIds = collectPositiveItemIds(
    {
      tvShows,
      userShows,
    },
    Number.isFinite(threshold) ? threshold : 8,
  );
  const strategyReports = Object.entries(strategies).map(([name, rankedItems]) => ({
    name,
    metrics: evaluateRanking({
      rankedItems,
      relevantIds,
      k: cutoff,
    }),
  }));

  return {
    summary: {
      k: cutoff,
      positiveRatingThreshold: Number.isFinite(threshold) ? threshold : 8,
      positiveItemCount: relevantIds.size,
      strategyCount: strategyReports.length,
    },
    strategies: strategyReports,
  };
}

function parseEvaluationArgs(args) {
  const options = {
    format: args.includes("--json") ? "json" : "text",
    k: 10,
    positiveRatingThreshold: 8,
  };

  for (const arg of args) {
    if (arg.startsWith("--k=")) {
      const k = Number(arg.slice("--k=".length));

      if (!Number.isInteger(k) || k <= 0) {
        throw new Error("--k must be a positive integer");
      }

      options.k = k;
    }

    if (arg.startsWith("--threshold=")) {
      const threshold = Number(arg.slice("--threshold=".length));

      if (!Number.isFinite(threshold) || threshold < 0 || threshold > 10) {
        throw new Error("--threshold must be a number between 0 and 10");
      }

      options.positiveRatingThreshold = threshold;
    }
  }

  return options;
}

module.exports = {
  buildEvaluationReport,
  evaluateRanking,
  parseEvaluationArgs,
};
