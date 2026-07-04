const toId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.toString === "function") return value.toString();
  return String(value);
};

const isValidRating = (value) => {
  if (value === undefined || value === null || value === "") return false;

  const rating = Number(value);

  return Number.isFinite(rating) && rating >= 0 && rating <= 10;
};

const round = (value, digits = 2) => Number(value.toFixed(digits));

const byNumberDesc = (field, tieBreaker = "title") => (left, right) => {
  const difference = (Number(right[field]) || 0) - (Number(left[field]) || 0);

  if (difference !== 0) return difference;

  return String(left[tieBreaker] || "").localeCompare(String(right[tieBreaker] || ""));
};

const publicShowRating = (show) => {
  if (
    (show.status === "watched" || show.watched === true) &&
    isValidRating(show.userRating)
  ) {
    return Number(show.userRating);
  }

  return null;
};

const formatCatalogShow = (show) => ({
  _id: toId(show._id),
  title: show.title,
  tmdbId: show.tmdbId,
  genres: show.genres || [],
  year: show.year || null,
  popularity: Number(show.popularity) || 0,
  tmdbRating: Number(show.tmdbRating) || 0,
});

const collectRatingsByShow = (tvShows, userShows) => {
  const ratingsByShowId = new Map();

  for (const show of tvShows) {
    const rating = publicShowRating(show);

    if (rating === null) continue;

    ratingsByShowId.set(toId(show._id), [rating]);
  }

  for (const userShow of userShows || []) {
    if (userShow.status !== "watched" || !isValidRating(userShow.userRating)) {
      continue;
    }

    const showId = toId(userShow.tvShow);

    if (!ratingsByShowId.has(showId)) {
      ratingsByShowId.set(showId, []);
    }

    ratingsByShowId.get(showId).push(Number(userShow.userRating));
  }

  return ratingsByShowId;
};

const calculateGlobalMean = (ratingsByShowId) => {
  const allRatings = [...ratingsByShowId.values()].flat();

  if (allRatings.length === 0) return 0;

  return allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length;
};

const buildTopUserRated = ({ tvShows, userShows, limit, minRatings }) => {
  const showById = new Map(tvShows.map((show) => [toId(show._id), show]));
  const ratingsByShowId = collectRatingsByShow(tvShows, userShows);
  const globalMean = calculateGlobalMean(ratingsByShowId);

  return [...ratingsByShowId.entries()]
    .map(([showId, ratings]) => {
      const show = showById.get(showId);
      const ratingCount = ratings.length;
      const averageUserRating =
        ratings.reduce((sum, rating) => sum + rating, 0) / ratingCount;
      const weightedUserRating =
        (ratingCount / (ratingCount + minRatings)) * averageUserRating +
        (minRatings / (ratingCount + minRatings)) * globalMean;

      return {
        ...formatCatalogShow(show || {}),
        ratingCount,
        averageUserRating: round(averageUserRating),
        weightedUserRating: round(weightedUserRating),
      };
    })
    .sort((left, right) => {
      const leftQualified = left.ratingCount >= minRatings ? 1 : 0;
      const rightQualified = right.ratingCount >= minRatings ? 1 : 0;
      const qualificationDifference = rightQualified - leftQualified;

      if (qualificationDifference !== 0) return qualificationDifference;

      const weightedDifference =
        right.weightedUserRating - left.weightedUserRating;

      if (weightedDifference !== 0) return weightedDifference;

      return right.ratingCount - left.ratingCount;
    })
    .slice(0, limit);
};

function buildBaselineReport(
  { tvShows = [], userShows = [] },
  { limit = 10, minRatings = 2 } = {},
) {
  const cleanLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;
  const catalogShows = tvShows.map(formatCatalogShow);
  const topPopular = [...catalogShows]
    .sort(byNumberDesc("popularity"))
    .slice(0, cleanLimit);
  const topTMDBRated = [...catalogShows]
    .sort(byNumberDesc("tmdbRating"))
    .slice(0, cleanLimit);
  const topUserRated = buildTopUserRated({
    tvShows,
    userShows,
    limit: cleanLimit,
    minRatings,
  });

  return {
    summary: {
      catalogCount: tvShows.length,
      userRatingCount: [...collectRatingsByShow(tvShows, userShows).values()]
        .flat().length,
      limit: cleanLimit,
    },
    topPopular,
    topTMDBRated,
    topUserRated,
  };
}

function parseBaselineArgs(args) {
  const options = {
    format: args.includes("--json") ? "json" : "text",
    limit: 10,
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
  buildBaselineReport,
  parseBaselineArgs,
};
