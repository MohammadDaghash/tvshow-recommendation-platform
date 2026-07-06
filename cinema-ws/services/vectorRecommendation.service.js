const CANONICAL_GENRES = [
  "Comedy",
  "Drama & Romance",
  "Action & Adventure",
  "Mystery & Thriller",
  "Science-Fiction & Fantasy",
  "Anime",
  "Horror",
  "Legal",
  "History",
  "Other",
];

const {
  getKeywordPreferenceScore,
} = require("./userInterest.service");

const VECTOR_DIMENSIONS = [
  ...CANONICAL_GENRES,
  "tmdbRating",
  "popularity",
  "year",
  "languagePreference",
];

const DEFAULT_SCORE_WEIGHTS = {
  vectorSimilarity: 0.75,
  tmdbRating: 0.1,
  popularity: 0.05,
  yearSimilarity: 0.05,
  languagePreference: 0.05,
};
const DEFAULT_NEGATIVE_TASTE_PENALTY_WEIGHT = 0.35;

const round = (value, places = 3) => Number(value.toFixed(places));

const clamp = (value, min = 0, max = 1) => {
  return Math.min(max, Math.max(min, value));
};

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeGenre = (genre) => {
  const normalizedGenre = normalizeText(genre).replace(/&/g, "and");

  if (normalizedGenre === "comedy") return "Comedy";
  if (["drama", "romance", "drama and romance"].includes(normalizedGenre)) {
    return "Drama & Romance";
  }
  if (
    ["action", "adventure", "action and adventure"].includes(normalizedGenre)
  ) {
    return "Action & Adventure";
  }
  if (
    ["mystery", "thriller", "crime", "mystery and thriller"].includes(
      normalizedGenre,
    )
  ) {
    return "Mystery & Thriller";
  }
  if (
    [
      "science-fiction",
      "science fiction",
      "sci-fi",
      "sci fi",
      "fantasy",
      "supernatural",
      "fantasy and sci-fi",
      "sci-fi and fantasy",
      "science-fiction and fantasy",
    ].includes(normalizedGenre)
  ) {
    return "Science-Fiction & Fantasy";
  }
  if (["anime", "animation"].includes(normalizedGenre)) return "Anime";
  if (normalizedGenre === "horror") return "Horror";
  if (normalizedGenre === "legal") return "Legal";
  if (normalizedGenre === "history") return "History";

  return "";
};

const getCanonicalGenres = (genres = []) => {
  const canonicalGenres = genres.map(normalizeGenre).filter(Boolean);

  return canonicalGenres.length > 0 ? [...new Set(canonicalGenres)] : ["Other"];
};

const normalizeRating = (rating) => {
  const number = toNumber(rating);

  return number === null ? 0 : round(clamp(number / 10));
};

const normalizePopularity = (popularity, maxPopularity = 100) => {
  const number = toNumber(popularity);
  const max = toNumber(maxPopularity);

  if (number === null || !max) return 0;

  return round(clamp(number / max));
};

const normalizeYear = (year, { minYear, maxYear } = {}) => {
  const cleanYear = toNumber(year);
  const cleanMinYear = toNumber(minYear);
  const cleanMaxYear = toNumber(maxYear);

  if (cleanYear === null || cleanMinYear === null || cleanMaxYear === null) {
    return 0;
  }

  if (cleanMinYear === cleanMaxYear) return 0.5;

  return round(
    clamp((cleanYear - cleanMinYear) / (cleanMaxYear - cleanMinYear)),
  );
};

const normalizeOriginalLanguage = (language) => normalizeText(language);

const getLanguagePreference = (show, preferredOriginalLanguage = "en") => {
  const candidateLanguage = normalizeOriginalLanguage(
    show.originalLanguage || show.original_language,
  );
  const preferredLanguage = normalizeOriginalLanguage(preferredOriginalLanguage);

  if (!candidateLanguage || !preferredLanguage) return 0.7;

  return candidateLanguage === preferredLanguage ? 1 : 0.3;
};

function buildShowFeatureVector(show = {}, context = {}) {
  const canonicalGenres = getCanonicalGenres(show.genres || []);
  const values = Object.fromEntries(
    VECTOR_DIMENSIONS.map((dimension) => [dimension, 0]),
  );

  for (const genre of canonicalGenres) {
    values[genre] = 1;
  }

  values.tmdbRating = normalizeRating(show.tmdbRating);
  values.popularity = normalizePopularity(show.popularity, context.maxPopularity);
  values.year = normalizeYear(show.year, context);
  values.languagePreference = getLanguagePreference(
    show,
    context.preferredOriginalLanguage,
  );

  return VECTOR_DIMENSIONS.map((dimension) => values[dimension]);
}

const dotProduct = (left, right) =>
  left.reduce((sum, value, index) => sum + value * right[index], 0);

const magnitude = (vector) =>
  Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

const cosineSimilarity = (left, right) => {
  const denominator = magnitude(left) * magnitude(right);

  if (denominator === 0) return 0;

  return dotProduct(left, right) / denominator;
};

const getRatingWeight = (rating) => {
  const number = toNumber(rating);

  if (number === null) return 0.4;

  return clamp((number - 5) / 5, -1, 1);
};

const getTasteContributionValue = (value, index, weight) => {
  if (weight >= 0) return value * weight;

  return index < CANONICAL_GENRES.length ? value * weight : 0;
};

function buildUserTasteVector(profileShows = [], context = {}) {
  const weightedVector = Array(VECTOR_DIMENSIONS.length).fill(0);
  let totalAbsoluteWeight = 0;

  for (const show of profileShows) {
    const weight = getRatingWeight(show.userRating);

    if (weight === 0) continue;

    const showVector = buildShowFeatureVector(show, context);

    showVector.forEach((value, index) => {
      weightedVector[index] += getTasteContributionValue(value, index, weight);
    });
    totalAbsoluteWeight += Math.abs(weight);
  }

  if (totalAbsoluteWeight === 0) return weightedVector;

  return weightedVector.map((value) => round(value / totalAbsoluteWeight));
}

function vectorToObject(vector = []) {
  return Object.fromEntries(
    VECTOR_DIMENSIONS.map((dimension, index) => [dimension, vector[index] || 0]),
  );
}

function scoreCandidateForUser(
  candidateShow = {},
  tasteVector = [],
  context = {},
) {
  const candidateVector = buildShowFeatureVector(candidateShow, context);
  const rawSimilarity = cosineSimilarity(tasteVector, candidateVector);
  const vectorSimilarity = round(Math.max(0, rawSimilarity) * 100, 1);
  const negativeTastePenalty = round(Math.max(0, -rawSimilarity) * 100, 1);
  const tmdbRating = round(normalizeRating(candidateShow.tmdbRating) * 100, 1);
  const popularity = round(
    normalizePopularity(candidateShow.popularity, context.maxPopularity) * 100,
    1,
  );
  const yearSimilarity = round(
    normalizeYear(candidateShow.year, context) * 100,
    1,
  );
  const languagePreference = round(
    getLanguagePreference(candidateShow, context.preferredOriginalLanguage) * 100,
    1,
  );
  const keywordPreference = getKeywordPreferenceScore(
    candidateShow,
    context.keywordPreferences || [],
  ).value;
  const scoreParts = {
    vectorSimilarity,
    tmdbRating,
    popularity,
    yearSimilarity,
    languagePreference,
    keywordPreference,
  };
  const finalScore = Object.entries(DEFAULT_SCORE_WEIGHTS).reduce(
    (sum, [field, weight]) => sum + scoreParts[field] * weight,
    keywordPreference,
  ) - negativeTastePenalty * DEFAULT_NEGATIVE_TASTE_PENALTY_WEIGHT;

  return {
    recommendationScore: Math.round(clamp(finalScore, 0, 100)),
    similarity: round(rawSimilarity),
    scoreBreakdown: {
      vectorSimilarity,
      genreSimilarity: vectorSimilarity,
      categoryPreference: vectorSimilarity,
      negativeTastePenalty,
      tmdbRating,
      popularity,
      yearSimilarity,
      languagePreference,
      keywordPreference,
    },
  };
}

module.exports = {
  DEFAULT_SCORE_WEIGHTS,
  DEFAULT_NEGATIVE_TASTE_PENALTY_WEIGHT,
  VECTOR_DIMENSIONS,
  buildShowFeatureVector,
  buildUserTasteVector,
  cosineSimilarity,
  scoreCandidateForUser,
  vectorToObject,
};
