const {
  DEFAULT_SCORE_WEIGHTS,
  buildUserTasteVector,
  scoreCandidateForUser,
} = require("./vectorRecommendation.service");

const DEFAULT_WEIGHT_PRESETS = [
  {
    name: "balanced",
    weights: {
      vectorSimilarity: 0.6,
      tmdbRating: 0.2,
      popularity: 0.1,
      yearSimilarity: 0.05,
      languagePreference: 0.05,
    },
  },
  {
    name: "taste_heavy",
    weights: DEFAULT_SCORE_WEIGHTS,
  },
  {
    name: "quality_heavy",
    weights: {
      vectorSimilarity: 0.45,
      tmdbRating: 0.35,
      popularity: 0.1,
      yearSimilarity: 0.05,
      languagePreference: 0.05,
    },
  },
  {
    name: "language_aware",
    weights: {
      vectorSimilarity: 0.55,
      tmdbRating: 0.15,
      popularity: 0.1,
      yearSimilarity: 0.05,
      languagePreference: 0.15,
    },
  },
];

const SCORE_FIELDS = [
  "vectorSimilarity",
  "tmdbRating",
  "popularity",
  "yearSimilarity",
  "languagePreference",
];

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

const getShowKey = (show = {}) => {
  return (
    toId(show._id || show.tvShow) ||
    (show.tmdbId ? `tmdb:${Number(show.tmdbId)}` : "") ||
    `title:${normalizeTitle(show.title)}`
  );
};

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const round = (value, places = 3) => Number(value.toFixed(places));

const isWatched = (show = {}) =>
  show.status === "watched" || show.watched === true;

const isPositiveRated = (show = {}, threshold = 8) => {
  const rating = toNumber(show.userRating);

  return isWatched(show) && rating !== null && rating >= threshold;
};

const normalizeWeights = (weights = {}) => {
  const cleanedWeights = Object.fromEntries(
    SCORE_FIELDS.map((field) => [
      field,
      Math.max(0, toNumber(weights[field]) || 0),
    ]),
  );
  const totalWeight = Object.values(cleanedWeights).reduce(
    (sum, value) => sum + value,
    0,
  );

  if (totalWeight === 0) {
    return normalizeWeights(DEFAULT_WEIGHT_PRESETS[0].weights);
  }

  return Object.fromEntries(
    SCORE_FIELDS.map((field) => [field, cleanedWeights[field] / totalWeight]),
  );
};

function calculateWeightedScore(scoreBreakdown = {}, weights = {}) {
  const normalizedWeights = normalizeWeights(weights);
  const score = SCORE_FIELDS.reduce((sum, field) => {
    return sum + (toNumber(scoreBreakdown[field]) || 0) * normalizedWeights[field];
  }, 0);

  return Math.round(score);
}

const getYear = (show = {}) => {
  const year = toNumber(show.year);

  if (year !== null) return year;

  if (show.first_air_date) {
    return toNumber(String(show.first_air_date).slice(0, 4));
  }

  return null;
};

const buildVectorContext = ({
  profileShows = [],
  candidateShows = [],
  preferredOriginalLanguage = "en",
}) => {
  const shows = [...profileShows, ...candidateShows];
  const popularities = shows
    .map((show) => toNumber(show.popularity))
    .filter((value) => value !== null);
  const years = shows.map(getYear).filter((value) => value !== null);

  return {
    maxPopularity: Math.max(...popularities, 100),
    minYear: years.length ? Math.min(...years) : 1990,
    maxYear: years.length ? Math.max(...years) : new Date().getFullYear(),
    preferredOriginalLanguage,
  };
};

function rankCandidatesForProfile({
  profileShows = [],
  candidateShows = [],
  weights = DEFAULT_WEIGHT_PRESETS[0].weights,
  preferredOriginalLanguage = "en",
} = {}) {
  const context = buildVectorContext({
    profileShows,
    candidateShows,
    preferredOriginalLanguage,
  });
  const tasteVector = buildUserTasteVector(profileShows, context);

  return candidateShows
    .map((candidateShow) => {
      const scores = scoreCandidateForUser(candidateShow, tasteVector, context);
      const experimentScore = calculateWeightedScore(
        scores.scoreBreakdown,
        weights,
      );

      return {
        ...candidateShow,
        experimentScore,
        recommendationScore: experimentScore,
        similarity: scores.similarity,
        scoreBreakdown: scores.scoreBreakdown,
      };
    })
    .sort((left, right) => {
      if (right.experimentScore !== left.experimentScore) {
        return right.experimentScore - left.experimentScore;
      }

      return (right.tmdbRating || 0) - (left.tmdbRating || 0);
    });
}

const mergeUserShowsWithCatalog = ({ tvShows = [], userShows = [] }) => {
  const tvShowsById = new Map(tvShows.map((show) => [toId(show._id), show]));

  return userShows
    .map((userShow) => {
      const catalogShow = tvShowsById.get(toId(userShow.tvShow));

      if (!catalogShow) return null;

      return {
        ...catalogShow,
        user: toId(userShow.user),
        status: userShow.status,
        userRating: userShow.userRating,
      };
    })
    .filter(Boolean);
};

const buildOwnerGroups = ({ tvShows = [], userShows = [] }) => {
  const groups = new Map();
  const ensureGroup = (ownerKey) => {
    if (!groups.has(ownerKey)) groups.set(ownerKey, []);

    return groups.get(ownerKey);
  };

  ensureGroup("public-demo").push(...tvShows);

  for (const userShow of mergeUserShowsWithCatalog({ tvShows, userShows })) {
    ensureGroup(`user:${userShow.user}`).push(userShow);
  }

  return groups;
};

function buildLeaveOneOutCases(
  { tvShows = [], userShows = [] },
  { positiveRatingThreshold = 8, minProfileSize = 1 } = {},
) {
  const threshold = Number.isFinite(Number(positiveRatingThreshold))
    ? Number(positiveRatingThreshold)
    : 8;
  const ownerGroups = buildOwnerGroups({ tvShows, userShows });
  const cases = [];

  for (const [ownerKey, ownerShows] of ownerGroups.entries()) {
    const ratedWatchedShows = ownerShows.filter((show) => {
      return isWatched(show) && toNumber(show.userRating) !== null;
    });
    const positiveShows = ratedWatchedShows.filter((show) => {
      return isPositiveRated(show, threshold);
    });

    for (const heldOutShow of positiveShows) {
      const heldOutKey = getShowKey(heldOutShow);
      const profileShows = ratedWatchedShows.filter((show) => {
        return getShowKey(show) !== heldOutKey;
      });

      if (profileShows.length < minProfileSize) continue;

      const profileKeys = new Set(profileShows.map(getShowKey));
      const candidateShows = ownerShows.filter((show) => {
        return !profileKeys.has(getShowKey(show));
      });

      cases.push({
        ownerKey,
        heldOutShow,
        heldOutKey,
        profileShows,
        candidateShows,
      });
    }
  }

  return cases;
}

const getRankForHeldOut = (rankedCandidates, heldOutKey) => {
  const index = rankedCandidates.findIndex((candidate) => {
    return getShowKey(candidate) === heldOutKey;
  });

  return index === -1 ? null : index + 1;
};

const mean = (values) => {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const evaluatePreset = ({ cases, preset, k }) => {
  const caseResults = cases.map((evaluationCase) => {
    const rankedCandidates = rankCandidatesForProfile({
      profileShows: evaluationCase.profileShows,
      candidateShows: evaluationCase.candidateShows,
      weights: preset.weights,
    });
    const heldOutRank = getRankForHeldOut(
      rankedCandidates,
      evaluationCase.heldOutKey,
    );
    const hit = heldOutRank !== null && heldOutRank <= k ? 1 : 0;
    const reciprocalRank = heldOutRank ? 1 / heldOutRank : 0;
    const ndcg = hit ? 1 / Math.log2(heldOutRank + 1) : 0;

    return {
      ownerKey: evaluationCase.ownerKey,
      heldOutTitle: evaluationCase.heldOutShow.title,
      heldOutRank,
      hit,
      reciprocalRank,
      ndcg,
      topRecommendation: rankedCandidates[0]?.title || "",
      topScore: rankedCandidates[0]?.experimentScore || 0,
    };
  });
  const ranks = caseResults
    .map((result) => result.heldOutRank)
    .filter((rank) => rank !== null);
  const misses = caseResults
    .filter((result) => !result.hit)
    .slice(0, 5);

  return {
    name: preset.name,
    weights: normalizeWeights(preset.weights),
    metrics: {
      cases: caseResults.length,
      hits: caseResults.reduce((sum, result) => sum + result.hit, 0),
      hitRate: round(mean(caseResults.map((result) => result.hit)), 3),
      meanReciprocalRank: round(
        mean(caseResults.map((result) => result.reciprocalRank)),
        3,
      ),
      ndcg: round(mean(caseResults.map((result) => result.ndcg)), 3),
      meanHeldOutRank: ranks.length ? round(mean(ranks), 2) : null,
    },
    misses,
  };
};

const comparePresetReports = (left, right) => {
  const metricDifference =
    right.metrics.ndcg - left.metrics.ndcg ||
    right.metrics.meanReciprocalRank - left.metrics.meanReciprocalRank ||
    right.metrics.hitRate - left.metrics.hitRate;

  if (metricDifference !== 0) return metricDifference;

  return left.name.localeCompare(right.name);
};

function runVectorWeightExperiment(
  snapshot,
  {
    k = 20,
    positiveRatingThreshold = 8,
    presets = DEFAULT_WEIGHT_PRESETS,
  } = {},
) {
  const cutoff = Number.isInteger(k) && k > 0 ? k : 20;
  const threshold = Number.isFinite(Number(positiveRatingThreshold))
    ? Number(positiveRatingThreshold)
    : 8;
  const cases = buildLeaveOneOutCases(snapshot, {
    positiveRatingThreshold: threshold,
  });
  const presetReports = presets
    .map((preset) => evaluatePreset({ cases, preset, k: cutoff }))
    .sort(comparePresetReports);
  const bestPreset = cases.length > 0 ? presetReports[0] || null : null;

  return {
    summary: {
      k: cutoff,
      positiveRatingThreshold: threshold,
      caseCount: cases.length,
      presetCount: presetReports.length,
    },
    bestPreset,
    presets: presetReports,
  };
}

function parseVectorExperimentArgs(args) {
  const options = {
    format: args.includes("--json") ? "json" : "text",
    k: 20,
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
  DEFAULT_WEIGHT_PRESETS,
  buildLeaveOneOutCases,
  calculateWeightedScore,
  parseVectorExperimentArgs,
  rankCandidatesForProfile,
  runVectorWeightExperiment,
};
