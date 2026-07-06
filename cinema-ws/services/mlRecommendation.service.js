const {
  buildShowFeatureVector,
  buildUserTasteVector,
  cosineSimilarity,
  scoreCandidateForUser,
} = require("./vectorRecommendation.service");

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const AI_SUGGESTION_CANDIDATE_LIMIT = 80;
const AI_SUGGESTION_FETCH_PAGE_COUNT = 10;

const genreMap = {
  Comedy: 35,
  Drama: 18,
  "Drama & Romance": 18,
  Romance: 10749,
  Crime: 80,
  Thriller: 53,
  Mystery: 9648,
  "Mystery & Thriller": 80,
  Horror: 27,
  Fantasy: 10765,
  "Sci-Fi": 10765,
  "Science Fiction": 10765,
  "Science-Fiction & Fantasy": 10765,
  "Fantasy & Sci-Fi": 10765,
  Supernatural: 10765,
  Action: 10759,
  Adventure: 10759,
  "Action & Adventure": 10759,
  Animation: 16,
  Anime: 16,
  History: 36,
};

const genreNameMap = {
  18: "Drama & Romance",
  35: "Comedy",
  10749: "Drama & Romance",
  80: "Mystery & Thriller",
  53: "Mystery & Thriller",
  9648: "Mystery & Thriller",
  27: "Horror",
  10765: "Science-Fiction & Fantasy",
  10759: "Action & Adventure",
  16: "Anime",
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

const getShowYear = (show) => {
  if (show.year) return Number(show.year);
  if (show.first_air_date) return Number(show.first_air_date.slice(0, 4));

  return null;
};

const buildVectorContext = ({
  candidateShows = [],
  preferredOriginalLanguage = "en",
  watchedShows = [],
}) => {
  const popularities = [...candidateShows, ...watchedShows]
    .map((show) => Number(show.popularity || 0))
    .filter((popularity) => Number.isFinite(popularity));
  const years = [...candidateShows, ...watchedShows]
    .map(getShowYear)
    .filter((year) => Number.isFinite(year));

  return {
    maxPopularity: Math.max(...popularities, 100),
    minYear: years.length ? Math.min(...years) : 1990,
    maxYear: years.length ? Math.max(...years) : new Date().getFullYear(),
    preferredOriginalLanguage,
  };
};

const buildCandidateShow = (show) => {
  const showGenres = (show.genre_ids || [])
    .map((id) => genreNameMap[id])
    .filter(Boolean);

  return {
    tmdbId: show.id,
    title: show.name,
    genres: showGenres,
    year: getShowYear(show),
    imageUrl: show.poster_path ? `${TMDB_IMAGE_BASE_URL}${show.poster_path}` : "",
    overview: show.overview,
    tmdbRating: show.vote_average,
    originalLanguage: show.original_language || null,
    originCountry: show.origin_country || [],
    voteCount: show.vote_count || 0,
    popularity: show.popularity,
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
  const isColdStart = watchedShows.length === 0;
  const candidateShows = tmdbResults
    .filter((show) => {
      return (
        !excludedTMDBIdSet.has(show.id) &&
        !excludedTitleSet.has(normalizeTitle(show.name))
      );
    })
    .map(buildCandidateShow);
  const vectorContext = buildVectorContext({
    candidateShows,
    preferredOriginalLanguage,
    watchedShows,
  });
  const userTasteVector = buildUserTasteVector(watchedShows, vectorContext);

  const recommendations = candidateShows.map((candidateShow) => {
    const vectorScores = scoreCandidateForUser(
      candidateShow,
      userTasteVector,
      vectorContext,
    );
    const tmdbScore = Math.min(
      100,
      Math.round((candidateShow.tmdbRating || 0) * 10),
    );
    const popularityScore = Math.min(
      100,
      Math.round((candidateShow.popularity || 0) / 2),
    );
    const yearSimilarity = 80;
    const languagePreference = getLanguagePreferenceScore(
      candidateShow,
      preferredOriginalLanguage,
    );

    const recommendationScore = isColdStart
      ? Math.round(tmdbScore * 0.75 + languagePreference * 0.25)
      : vectorScores.recommendationScore;
    const scoreBreakdown = isColdStart
      ? {
          vectorSimilarity: 0,
          genreSimilarity: 0,
          categoryPreference: 0,
          tmdbRating: tmdbScore,
          popularity: popularityScore,
          yearSimilarity,
          languagePreference,
        }
      : vectorScores.scoreBreakdown;
    const candidateVector = buildShowFeatureVector(candidateShow, vectorContext);

    return {
      ...candidateShow,
      recommendationScore,
      matchScore: recommendationScore,
      recommendationModel: isColdStart
        ? "tmdb-cold-start-v1"
        : "vector-content-v1.1",
      similarity: vectorScores.similarity,
      isAISuggestion: true,
      scoreBreakdown,
      similarWatchedShows: watchedShows
        .map((watchedShow) => {
          const watchedVector = buildShowFeatureVector(
            watchedShow,
            vectorContext,
          );

          return {
            title: watchedShow.title,
            similarity: cosineSimilarity(candidateVector, watchedVector),
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
