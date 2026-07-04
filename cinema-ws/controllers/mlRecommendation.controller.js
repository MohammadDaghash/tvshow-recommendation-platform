const axios = require("axios");
const TVShow = require("../models/TVShow");
const UserShow = require("../models/UserShow");
const IgnoredSuggestion = require("../models/IgnoredSuggestion");
const UserIgnoredSuggestion = require("../models/UserIgnoredSuggestion");
const recommendationService = require("../services/recommendation.service");
const {
  AI_SUGGESTION_CANDIDATE_LIMIT,
  buildTMDBRecommendations,
  buildTMDBSuggestionRequest,
  getFavoriteGenreIds,
  resolveSuggestionExcludedShows,
  resolveSuggestionIgnoredSuggestions,
  resolveSuggestionProfileShows,
} = require("../services/mlRecommendation.service");

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const getPersonalizedWatchedShows = async (user) => {
  if (!user || user.role === "admin") {
    return [];
  }

  const recommendations = await recommendationService.getRecommendations(user._id);

  return recommendations.filter((show) => show.status === "watched");
};

const getProfileWatchedShows = async (user) => {
  const personalizedWatchedShows = await getPersonalizedWatchedShows(user);
  const catalogWatchedShows =
    !user || user.role === "admin" ? await TVShow.find({ watched: true }) : [];

  return resolveSuggestionProfileShows({
    user,
    personalizedWatchedShows,
    catalogWatchedShows,
  });
};

const getUserLibraryShows = async (user) => {
  if (!user || user.role === "admin") {
    return [];
  }

  const userShows = await UserShow.find({ user: user._id }).populate("tvShow");

  return userShows.map((userShow) => userShow.tvShow).filter(Boolean);
};

const collectExcludedValues = (shows, ignoredSuggestions) => {
  return {
    excludedTMDBIds: [
      ...shows.map((show) => show.tmdbId).filter(Boolean),
      ...ignoredSuggestions.map((show) => show.tmdbId).filter(Boolean),
    ],
    excludedTitles: [
      ...shows.map((show) => show.title).filter(Boolean),
      ...ignoredSuggestions.map((show) => show.title).filter(Boolean),
    ],
  };
};

const getTMDBRecommendations = async (req, res) => {
  try {
    const watchedShows = await getProfileWatchedShows(req.user);
    const allExistingShows = await TVShow.find();
    const userLibraryShows = await getUserLibraryShows(req.user);
    const globalIgnoredSuggestions = await IgnoredSuggestion.find();
    const userIgnoredSuggestions = req.user
      ? await UserIgnoredSuggestion.find({ user: req.user._id })
      : [];
    const ignoredSuggestions = resolveSuggestionIgnoredSuggestions({
      user: req.user,
      globalIgnoredSuggestions,
      userIgnoredSuggestions,
    });
    const excludedShows = resolveSuggestionExcludedShows({
      user: req.user,
      catalogShows: allExistingShows,
      userLibraryShows,
    });
    const { excludedTMDBIds, excludedTitles } = collectExcludedValues(
      excludedShows,
      ignoredSuggestions,
    );
    const favoriteGenreIds = getFavoriteGenreIds(watchedShows);

    const tmdbPages = await Promise.all(
      [1, 2, 3, 4, 5].map((page) => {
        const request = buildTMDBSuggestionRequest({
          apiKey: TMDB_API_KEY,
          favoriteGenreIds,
          page,
        });

        return axios.get(`${TMDB_BASE_URL}${request.path}`, {
          params: request.params,
        });
      }),
    );

    const tmdbResults = tmdbPages.flatMap((response) => response.data.results);
    const recommendations = buildTMDBRecommendations({
      tmdbResults,
      watchedShows,
      excludedTMDBIds,
      excludedTitles,
      limit: AI_SUGGESTION_CANDIDATE_LIMIT,
    });

    res.json(recommendations);
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      message: "Failed to generate TMDB recommendations",
    });
  }
};

module.exports = {
  getTMDBRecommendations,
};
