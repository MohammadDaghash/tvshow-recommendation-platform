const {
  createCategoryVector,
  cosineSimilarity,
} = require("../utils/recommendation.utils");

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const AI_SUGGESTION_CANDIDATE_LIMIT = 80;
const AI_SUGGESTION_FETCH_PAGE_COUNT = 10;

const genreMap = {
  Comedy: 35,
  Drama: 18,
  Romance: 10749,
  Crime: 80,
  Thriller: 53,
  Mystery: 9648,
  Horror: 27,
  Fantasy: 10765,
  "Sci-Fi": 10765,
  "Science Fiction": 10765,
  Adventure: 10759,
  Animation: 16,
  Anime: 16,
};

const genreNameMap = {
  18: "Drama",
  35: "Comedy",
  10749: "Romance",
  80: "Crime",
  53: "Thriller",
  9648: "Mystery",
  27: "Horror",
  10765: "Fantasy & Sci-Fi",
  10759: "Adventure",
  16: "Animation",
};

const normalizeTitle = (title) => {
  return String(title || "")
    .toLowerCase()
    .trim();
};

const normalizeOriginalLanguage = (language) => {
  return String(language || "")
    .toLowerCase()
    .trim();
};

const getShowOriginalLanguage = (show = {}) => {
  return normalizeOriginalLanguage(show.originalLanguage || show.original_language);
};

const getPreferredOriginalLanguage = (watchedShows = []) => {
  const languageWeights = new Map();

  watchedShows.forEach((show) => {
    const language = getShowOriginalLanguage(show);

    if (!language) return;

    const ratingWeight = Number(show.userRating) || 5;
    languageWeights.set(
      language,
      (languageWeights.get(language) || 0) + ratingWeight,
    );
  });

  if (languageWeights.size === 0) {
    return "en";
  }

  return [...languageWeights.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

const getLanguagePreferenceScore = (show, preferredOriginalLanguage = "en") => {
  const candidateLanguage = getShowOriginalLanguage(show);
  const preferredLanguage = normalizeOriginalLanguage(preferredOriginalLanguage);

  if (!candidateLanguage || !preferredLanguage) {
    return 70;
  }

  return candidateLanguage === preferredLanguage ? 100 : 30;
};

const createProfileVector = (watchedShows = []) => {
  if (watchedShows.length === 0) {
    return createCategoryVector([]);
  }

  const watchedVectors = watchedShows.map((show) => ({
    vector: createCategoryVector(show.genres || []),
    rating: show.userRating || 5,
  }));

  const totalRatingWeight = watchedVectors.reduce((sum, show) => {
    return sum + show.rating;
  }, 0);

  if (totalRatingWeight === 0) {
    return createCategoryVector([]);
  }

  return watchedVectors[0].vector.map((_, index) => {
    const weightedSum = watchedVectors.reduce((total, show) => {
      return total + show.vector[index] * show.rating;
    }, 0);

    return weightedSum / totalRatingWeight;
  });
};

const getFavoriteGenreIds = (watchedShows = []) => {
  const genreFrequency = {};

  watchedShows.forEach((show) => {
    const ratingWeight = show.userRating || 5;

    (show.genres || []).forEach((genre) => {
      genreFrequency[genre] = (genreFrequency[genre] || 0) + ratingWeight;
    });
  });

  return Object.entries(genreFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genreMap[genre])
    .filter(Boolean)
    .slice(0, 3);
};

const resolveSuggestionProfileShows = ({
  user,
  personalizedWatchedShows = [],
  catalogWatchedShows = [],
}) => {
  if (!user || user.role === "admin") {
    return catalogWatchedShows;
  }

  return personalizedWatchedShows;
};

const resolveSuggestionExcludedShows = ({
  user,
  catalogShows = [],
  userLibraryShows = [],
}) => {
  if (!user || user.role === "admin") {
    return catalogShows;
  }

  return userLibraryShows;
};

const resolveSuggestionIgnoredSuggestions = ({
  user,
  globalIgnoredSuggestions = [],
  userIgnoredSuggestions = [],
}) => {
  if (!user) {
    return globalIgnoredSuggestions;
  }

  if (user.role === "admin") {
    return [...globalIgnoredSuggestions, ...userIgnoredSuggestions];
  }

  return userIgnoredSuggestions;
};

const buildTMDBSuggestionRequest = ({
  apiKey,
  favoriteGenreIds = [],
  page,
  preferredOriginalLanguage,
}) => {
  const baseParams = {
    api_key: apiKey,
    language: "en-US",
    page,
    ...(preferredOriginalLanguage
      ? {
          with_original_language: preferredOriginalLanguage,
        }
      : {}),
  };

  if (!favoriteGenreIds[0]) {
    return {
      path: "/discover/tv",
      params: {
        ...baseParams,
        sort_by: "vote_average.desc",
        "vote_count.gte": 50,
      },
    };
  }

  return {
    path: "/discover/tv",
    params: {
      ...baseParams,
      sort_by: "vote_average.desc",
      "vote_count.gte": 50,
      with_genres: favoriteGenreIds[0],
    },
  };
};

const buildTMDBRecommendations = ({
  tmdbResults = [],
  watchedShows = [],
  excludedTMDBIds = [],
  excludedTitles = [],
  preferredOriginalLanguage = "en",
  limit = 20,
}) => {
  const excludedTMDBIdSet = new Set(excludedTMDBIds.filter(Boolean));
  const excludedTitleSet = new Set(
    excludedTitles.map(normalizeTitle).filter(Boolean),
  );
  const userProfileVector = createProfileVector(watchedShows);
  const isColdStart = watchedShows.length === 0;

  const recommendations = tmdbResults
    .filter((show) => {
      return (
        !excludedTMDBIdSet.has(show.id) &&
        !excludedTitleSet.has(normalizeTitle(show.name))
      );
    })
    .map((show) => {
      const showGenres = show.genre_ids
        .map((id) => genreNameMap[id])
        .filter(Boolean);

      const showVector = createCategoryVector(showGenres);

      const genreSimilarity = Math.round(
        cosineSimilarity(userProfileVector, showVector) * 100,
      );

      const categoryPreference = genreSimilarity;
      const tmdbScore = Math.min(
        100,
        Math.round((show.vote_average || 0) * 10),
      );
      const popularityScore = Math.min(
        100,
        Math.round((show.popularity || 0) / 2),
      );
      const yearSimilarity = 80;
      const languagePreference = getLanguagePreferenceScore(
        show,
        preferredOriginalLanguage,
      );

      const recommendationScore = isColdStart
        ? Math.round(tmdbScore * 0.75 + languagePreference * 0.25)
        : Math.round(
            genreSimilarity * 0.35 +
              categoryPreference * 0.2 +
              tmdbScore * 0.2 +
              popularityScore * 0.1 +
              yearSimilarity * 0.05 +
              languagePreference * 0.1,
          );

      return {
        tmdbId: show.id,
        title: show.name,
        genres: showGenres,
        year: show.first_air_date
          ? Number(show.first_air_date.slice(0, 4))
          : null,
        imageUrl: show.poster_path
          ? `${TMDB_IMAGE_BASE_URL}${show.poster_path}`
          : "",
        overview: show.overview,
        tmdbRating: show.vote_average,
        originalLanguage: show.original_language || null,
        originCountry: show.origin_country || [],
        voteCount: show.vote_count || 0,
        popularity: show.popularity,
        recommendationScore,
        matchScore: recommendationScore,
        isAISuggestion: true,
        scoreBreakdown: {
          genreSimilarity,
          categoryPreference,
          tmdbRating: tmdbScore,
          popularity: popularityScore,
          yearSimilarity,
          languagePreference,
        },
        similarWatchedShows: watchedShows
          .map((watchedShow) => {
            const watchedVector = createCategoryVector(watchedShow.genres || []);

            return {
              title: watchedShow.title,
              similarity: cosineSimilarity(showVector, watchedVector),
            };
          })
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 3),
      };
    });

  const rankedRecommendations = recommendations.sort(
    (a, b) => b.recommendationScore - a.recommendationScore,
  );

  return rankedRecommendations.slice(0, limit);
};

module.exports = {
  AI_SUGGESTION_CANDIDATE_LIMIT,
  AI_SUGGESTION_FETCH_PAGE_COUNT,
  buildTMDBSuggestionRequest,
  buildTMDBRecommendations,
  getPreferredOriginalLanguage,
  getFavoriteGenreIds,
  normalizeTitle,
  resolveSuggestionExcludedShows,
  resolveSuggestionIgnoredSuggestions,
  resolveSuggestionProfileShows,
};
