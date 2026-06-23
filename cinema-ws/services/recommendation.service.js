const TVShow = require("../models/TVShow");
const UserShow = require("../models/UserShow");

const {
  MAJOR_CATEGORIES,
  createGenreVector,
  cosineSimilarity,
} = require("./featureEngineering.service");

const {
  decorateShowsWithCatalogState,
  decorateShowsWithUserState,
} = require("./userLibrary.service");

const normalizeValue = (value, maxValue) => {
  if (!value || !maxValue) return 0;

  return Math.min(value / maxValue, 1);
};

const calculateAverageWatchedYear = (watchedShows) => {
  const showsWithYear = watchedShows.filter((show) => show.year);

  if (showsWithYear.length === 0) return null;

  const totalYear = showsWithYear.reduce((sum, show) => {
    return sum + show.year;
  }, 0);

  return totalYear / showsWithYear.length;
};

const calculateYearSimilarity = (candidateYear, averageWatchedYear) => {
  if (!candidateYear || !averageWatchedYear) return 0;

  const yearDifference = Math.abs(candidateYear - averageWatchedYear);

  return Math.max(0, 1 - yearDifference / 30);
};

const createPreferenceVector = (watchedShows) => {
  const preferenceVector = Array(MAJOR_CATEGORIES.length).fill(0);

  const totalRating = watchedShows.reduce((sum, tvShow) => {
    return sum + (tvShow.userRating || 0);
  }, 0);

  if (totalRating === 0) return preferenceVector;

  watchedShows.forEach((tvShow) => {
    const genreVector = createGenreVector(tvShow);
    const ratingWeight = tvShow.userRating || 0;

    genreVector.forEach((value, index) => {
      preferenceVector[index] += value * ratingWeight;
    });
  });

  return preferenceVector.map((value) => value / totalRating);
};

const calculateCategoryPreferenceScore = (tvShow, watchedShows) => {
  const candidateVector = createGenreVector(tvShow);

  if (watchedShows.length === 0) {
    return 0;
  }

  const relatedWatchedShows = watchedShows.filter((watchedShow) => {
    const watchedVector = createGenreVector(watchedShow);
    return cosineSimilarity(candidateVector, watchedVector) > 0;
  });

  if (relatedWatchedShows.length === 0) {
    return 0;
  }

  const watchedCountScore = normalizeValue(
    relatedWatchedShows.length,
    watchedShows.length,
  );

  const averageUserRating =
    relatedWatchedShows.reduce((sum, show) => {
      return sum + (show.userRating || 0);
    }, 0) / relatedWatchedShows.length;

  const averageTMDBRating =
    relatedWatchedShows.reduce((sum, show) => {
      return sum + (show.tmdbRating || 0);
    }, 0) / relatedWatchedShows.length;

  const averagePopularity =
    relatedWatchedShows.reduce((sum, show) => {
      return sum + (show.popularity || 0);
    }, 0) / relatedWatchedShows.length;

  const averageYear =
    relatedWatchedShows.reduce((sum, show) => {
      return sum + (show.year || 0);
    }, 0) / relatedWatchedShows.length;

  const userRatingScore = normalizeValue(averageUserRating, 10);
  const tmdbRatingScore = normalizeValue(averageTMDBRating, 10);
  const popularityScore = normalizeValue(averagePopularity, 100);
  const yearScore = calculateYearSimilarity(tvShow.year, averageYear);

  return (
    watchedCountScore * 0.25 +
    userRatingScore * 0.35 +
    tmdbRatingScore * 0.2 +
    popularityScore * 0.15 +
    yearScore * 0.05
  );
};

const calculateRecommendationScore = (
  tvShow,
  preferenceVector,
  averageWatchedYear,
  maxPopularity,
  watchedShows,
) => {
  const genreVector = createGenreVector(tvShow);
  const genreSimilarity = cosineSimilarity(genreVector, preferenceVector);

  const categoryPreferenceScore = calculateCategoryPreferenceScore(
    tvShow,
    watchedShows,
  );

  const tmdbRatingScore = normalizeValue(tvShow.tmdbRating, 10);
  const popularityScore = normalizeValue(tvShow.popularity, maxPopularity);
  const yearScore = calculateYearSimilarity(tvShow.year, averageWatchedYear);

  const qualityScore =
    tmdbRatingScore * 0.5 + popularityScore * 0.3 + yearScore * 0.2;

  const finalScore =
    genreSimilarity * 0.55 +
    categoryPreferenceScore * 0.3 +
    qualityScore * 0.15;

  return {
    recommendationScore: Math.round(finalScore * 100),
    similarity: Number(genreSimilarity.toFixed(3)),
    scoreBreakdown: {
      genreSimilarity: Number((genreSimilarity * 100).toFixed(1)),
      categoryPreference: Number((categoryPreferenceScore * 100).toFixed(1)),
      tmdbRating: Number((tmdbRatingScore * 100).toFixed(1)),
      popularity: Number((popularityScore * 100).toFixed(1)),
      yearSimilarity: Number((yearScore * 100).toFixed(1)),
    },
  };
};

const findSimilarWatchedShows = (candidateShow, watchedShows) => {
  const candidateVector = createGenreVector(candidateShow);

  return watchedShows
    .map((watchedShow) => {
      const watchedVector = createGenreVector(watchedShow);
      const similarity = cosineSimilarity(candidateVector, watchedVector);

      return {
        title: watchedShow.title,
        similarity: Number(similarity.toFixed(3)),
      };
    })
    .filter((show) => show.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
};

const getRecommendations = async (userId) => {
  const tvShows = await TVShow.find();

  if (tvShows.length === 0) return [];

  const decoratedTVShows = userId
    ? decorateShowsWithUserState(tvShows, await UserShow.find({ user: userId }))
    : decorateShowsWithCatalogState(tvShows);

  const watchedShows = decoratedTVShows.filter(
    (tvShow) => tvShow.status === "watched",
  );

  const preferenceVector = createPreferenceVector(watchedShows);
  const averageWatchedYear = calculateAverageWatchedYear(watchedShows);

  const maxPopularity = Math.max(
    ...decoratedTVShows.map((tvShow) => tvShow.popularity || 0),
  );

  const scoredTVShows = decoratedTVShows.map((tvShow) => {
    const scores = calculateRecommendationScore(
      tvShow,
      preferenceVector,
      averageWatchedYear,
      maxPopularity,
      watchedShows,
    );

    const similarWatchedShows =
      tvShow.status !== "watched"
        ? findSimilarWatchedShows(tvShow, watchedShows)
        : [];

    return {
      ...tvShow,
      recommendationScore: scores.recommendationScore,
      similarity: scores.similarity,
      scoreBreakdown: scores.scoreBreakdown,
      similarWatchedShows,
    };
  });

  return scoredTVShows.sort((a, b) => {
    return b.recommendationScore - a.recommendationScore;
  });
};

module.exports = {
  getRecommendations,
};
