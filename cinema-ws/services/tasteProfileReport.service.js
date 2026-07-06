const {
  DEFAULT_NEGATIVE_TASTE_PENALTY_WEIGHT,
  DEFAULT_SCORE_WEIGHTS,
  VECTOR_DIMENSIONS,
  buildUserTasteVector,
  vectorToObject,
} = require("./vectorRecommendation.service");
const {
  DISLIKED_KEYWORD_PENALTY_CAP,
  LIKED_KEYWORD_BOOST_CAP,
  getKeywordPreferences,
} = require("./userInterest.service");

const METADATA_DIMENSIONS = new Set([
  "tmdbRating",
  "popularity",
  "year",
  "languagePreference",
]);

const isRating = (value) => {
  const rating = Number(value);

  return Number.isFinite(rating) && rating >= 0 && rating <= 10;
};

const round = (value, places = 3) => Number(value.toFixed(places));

const getCatalogStatus = (show) => {
  if (show.status) return show.status;
  if (show.watched) return "watched";

  return "";
};

const getShowYear = (show) => {
  const year = Number(show.year);

  return Number.isFinite(year) ? year : null;
};

const normalizeUserShow = (userShow = {}) => {
  const tvShow = userShow.tvShow || {};

  return {
    ...tvShow,
    status: userShow.status || tvShow.status || getCatalogStatus(tvShow),
    userRating:
      userShow.userRating === undefined ? tvShow.userRating : userShow.userRating,
  };
};

const normalizeCatalogShow = (show = {}) => ({
  ...show,
  status: getCatalogStatus(show),
});

const normalizeIgnoredSuggestion = (suggestion = {}) => ({
  ...suggestion,
  status: "ignored",
  userRating: 2,
});

const buildProfileShows = ({ tvShows = [], userShows = [], ignoredSuggestions = [] }) => {
  return [
    ...tvShows.map(normalizeCatalogShow).filter((show) => show.status),
    ...userShows.map(normalizeUserShow).filter((show) => show.status),
    ...ignoredSuggestions.map(normalizeIgnoredSuggestion),
  ];
};

const getPreferredOriginalLanguage = (profileShows = []) => {
  const languageWeights = new Map();

  for (const show of profileShows) {
    const language = String(show.originalLanguage || show.original_language || "")
      .trim()
      .toLowerCase();

    if (!language) continue;

    const ratingWeight = Number(show.userRating) || 5;

    languageWeights.set(language, (languageWeights.get(language) || 0) + ratingWeight);
  }

  if (languageWeights.size === 0) return "en";

  return [...languageWeights.entries()].sort((left, right) => right[1] - left[1])[0][0];
};

const buildVectorContext = (profileShows = []) => {
  const popularities = profileShows
    .map((show) => Number(show.popularity || 0))
    .filter((value) => Number.isFinite(value));
  const years = profileShows.map(getShowYear).filter((year) => Number.isFinite(year));

  return {
    maxPopularity: Math.max(...popularities, 100),
    minYear: years.length ? Math.min(...years) : 1990,
    maxYear: years.length ? Math.max(...years) : new Date().getFullYear(),
    preferredOriginalLanguage: getPreferredOriginalLanguage(profileShows),
  };
};

const toSignalRows = (tasteProfile) => {
  return Object.entries(tasteProfile)
    .filter(([dimension, value]) => {
      return !METADATA_DIMENSIONS.has(dimension) && Math.abs(value) > 0;
    })
    .map(([name, value]) => ({
      name,
      value: round(value),
      source: value >= 0 ? "ratings and list actions" : "low ratings or ignored feedback",
    }));
};

const sortByStrength = (left, right) => Math.abs(right.value) - Math.abs(left.value);

const toKeywordRows = (interests = [], sentiment) => {
  return getKeywordPreferences(interests)
    .filter((interest) => interest.sentiment === sentiment)
    .map((interest) => {
      const sourceInterest = interests.find(
        (candidate) =>
          candidate.value === interest.value && candidate.sentiment === sentiment,
      );

      return {
        id: sourceInterest?._id?.toString?.() || sourceInterest?._id || interest.value,
        value: interest.value,
        weight: interest.weight,
      };
    });
};

const buildFeatureWeights = ({ context, keywords, ignoredCount }) => [
  {
    signal: "Vector taste similarity",
    direction: "Boost or penalty",
    source: "watched ratings and list status",
    effect: DEFAULT_SCORE_WEIGHTS.vectorSimilarity,
  },
  {
    signal: "Negative taste penalty",
    direction: "Penalty",
    source: "low ratings and Not Interested actions",
    effect: -DEFAULT_NEGATIVE_TASTE_PENALTY_WEIGHT,
    count: ignoredCount,
  },
  {
    signal: "Keyword preferences",
    direction: "Boost or penalty",
    source: "explicit liked/disliked keywords",
    effect: `${LIKED_KEYWORD_BOOST_CAP} / -${DISLIKED_KEYWORD_PENALTY_CAP}`,
    count: keywords.liked.length + keywords.disliked.length,
  },
  {
    signal: "Original language",
    direction: "Boost",
    source: `preferred language: ${context.preferredOriginalLanguage}`,
    effect: DEFAULT_SCORE_WEIGHTS.languagePreference,
  },
  {
    signal: "TMDB rating",
    direction: "Boost",
    source: "catalog metadata",
    effect: DEFAULT_SCORE_WEIGHTS.tmdbRating,
  },
  {
    signal: "Popularity",
    direction: "Boost",
    source: "catalog metadata",
    effect: DEFAULT_SCORE_WEIGHTS.popularity,
  },
];

function buildTasteProfileReport({
  tvShows = [],
  userShows = [],
  ignoredSuggestions = [],
  userInterests = [],
} = {}) {
  const profileShows = buildProfileShows({
    ignoredSuggestions,
    tvShows,
    userShows,
  });
  const context = buildVectorContext(profileShows);
  const tasteVector = buildUserTasteVector(profileShows, context);
  const tasteProfile = vectorToObject(tasteVector);
  const signals = toSignalRows(tasteProfile);
  const keywords = {
    liked: toKeywordRows(userInterests, "like"),
    disliked: toKeywordRows(userInterests, "dislike"),
  };
  const summary = {
    watchedCount: profileShows.filter((show) => show.status === "watched").length,
    wantCount: profileShows.filter((show) => show.status === "want").length,
    watchingCount: profileShows.filter((show) => show.status === "watching").length,
    ratedCount: profileShows.filter((show) => isRating(show.userRating)).length,
    ignoredCount: ignoredSuggestions.length,
    explicitKeywordCount: keywords.liked.length + keywords.disliked.length,
  };

  return {
    summary,
    positiveSignals: signals
      .filter((signal) => signal.value > 0)
      .sort(sortByStrength)
      .slice(0, VECTOR_DIMENSIONS.length),
    negativeSignals: signals
      .filter((signal) => signal.value < 0)
      .sort(sortByStrength)
      .slice(0, VECTOR_DIMENSIONS.length),
    keywords,
    featureWeights: buildFeatureWeights({
      context,
      ignoredCount: summary.ignoredCount,
      keywords,
    }),
  };
}

module.exports = {
  buildTasteProfileReport,
};
