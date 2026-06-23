const axios = require("axios");
const TVShow = require("../models/TVShow");
const UserShow = require("../models/UserShow");
const IgnoredSuggestion = require("../models/IgnoredSuggestion");
const UserIgnoredSuggestion = require("../models/UserIgnoredSuggestion");
const recommendationService = require("../services/recommendation.service");
const {
  buildTMDBRecommendations,
  getFavoriteGenreIds,
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

  if (personalizedWatchedShows.length > 0) {
    return personalizedWatchedShows;
  }

  return TVShow.find({ watched: true });
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
    const userIgnoredSuggestions =
      req.user && req.user.role !== "admin"
        ? await UserIgnoredSuggestion.find({ user: req.user._id })
        : [];
    const ignoredSuggestions = [
      ...globalIgnoredSuggestions,
      ...userIgnoredSuggestions,
    ];
    const { excludedTMDBIds, excludedTitles } = collectExcludedValues(
      [...allExistingShows, ...userLibraryShows],
      ignoredSuggestions,
    );
    const favoriteGenreIds = getFavoriteGenreIds(watchedShows);

    const tmdbPages = await Promise.all(
      [1, 2, 3, 4, 5].map((page) =>
        axios.get(`${TMDB_BASE_URL}/discover/tv`, {
          params: {
            api_key: TMDB_API_KEY,
            sort_by: "vote_average.desc",
            "vote_count.gte": 50,
            language: "en-US",
            page,
            ...(favoriteGenreIds[0]
              ? {
                  with_genres: favoriteGenreIds[0],
                }
              : {}),
          },
        }),
      ),
    );

    const tmdbResults = tmdbPages.flatMap((response) => response.data.results);
    const recommendations = buildTMDBRecommendations({
      tmdbResults,
      watchedShows,
      excludedTMDBIds,
      excludedTitles,
      limit: 20,
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
