const TVShow = require("../models/TVShow");
const UserShow = require("../models/UserShow");
const recommendationService = require("../services/recommendation.service");
const { getTVShowDetailsById } = require("../services/tmdb.service");
const { buildUserShowUpdate } = require("../services/userLibrary.service");

const getRecommendations = async (req, res) => {
  try {
    const recommendations = await recommendationService.getRecommendations(
      req.user?._id,
    );

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getUserShowResponse = async (userId, tvShowId) => {
  const recommendations = await recommendationService.getRecommendations(userId);
  const targetShowId = tvShowId.toString();

  return recommendations.find((show) => show._id.toString() === targetShowId);
};

const upsertUserShowStatus = async ({ userId, tvShowId, status, userRating }) => {
  const tvShow = await TVShow.findById(tvShowId);

  if (!tvShow) {
    const notFoundError = new Error("TV show not found");
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  const update = buildUserShowUpdate(status, { userRating });

  await UserShow.findOneAndUpdate(
    {
      user: userId,
      tvShow: tvShowId,
    },
    update,
    {
      returnDocument: "after",
      setDefaultsOnInsert: true,
      upsert: true,
    },
  );

  return getUserShowResponse(userId, tvShowId);
};

const updateLibraryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, userRating } = req.body;

    const updatedShow = await upsertUserShowStatus({
      userId: req.user._id,
      tvShowId: id,
      status,
      userRating,
    });

    res.json(updatedShow);
  } catch (error) {
    res.status(error.statusCode || 400).json({
      message: error.message,
    });
  }
};

const markAsWatched = async (req, res) => {
  try {
    const { id } = req.params;
    const { userRating } = req.body;

    const updatedShow = await upsertUserShowStatus({
      userId: req.user._id,
      tvShowId: id,
      status: "watched",
      userRating,
    });

    res.json(updatedShow);
  } catch (error) {
    res.status(error.statusCode || 400).json({
      message: error.message,
    });
  }
};

const moveToWantToWatch = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedShow = await upsertUserShowStatus({
      userId: req.user._id,
      tvShowId: id,
      status: "want",
    });

    res.json(updatedShow);
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

const moveToCurrentlyWatching = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedShow = await upsertUserShowStatus({
      userId: req.user._id,
      tvShowId: id,
      status: "watching",
    });

    res.json(updatedShow);
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

const addTMDBToLibrary = async (req, res) => {
  try {
    const { tmdbId, status = "want", userRating } = req.body;

    if (!tmdbId) {
      return res.status(400).json({
        message: "TMDB id is required",
      });
    }

    const tmdbShow = await getTVShowDetailsById(tmdbId);

    const tvShow = await TVShow.findOneAndUpdate(
      {
        tmdbId: tmdbShow.tmdbId,
      },
      {
        title: tmdbShow.title,
        genres: tmdbShow.genres,
        year: tmdbShow.year,
        imageUrl: tmdbShow.imageUrl,
        overview: tmdbShow.overview,
        popularity: tmdbShow.popularity,
        tmdbRating: tmdbShow.tmdbRating,
        tmdbId: tmdbShow.tmdbId,
        recommendationScore: 0,
      },
      {
        returnDocument: "after",
        setDefaultsOnInsert: true,
        upsert: true,
      },
    );

    const updatedShow = await upsertUserShowStatus({
      userId: req.user._id,
      tvShowId: tvShow._id,
      status,
      userRating,
    });

    res.status(201).json(updatedShow);
  } catch (error) {
    res.status(error.statusCode || 400).json({
      message: error.message,
    });
  }
};

const removeFromLibrary = async (req, res) => {
  try {
    const { id } = req.params;

    await UserShow.findOneAndDelete({
      user: req.user._id,
      tvShow: id,
    });

    res.json({
      message: "TV show removed from your list",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTVShow = async (req, res) => {
  try {
    const { id } = req.params;

    await TVShow.findByIdAndDelete(id);
    await UserShow.deleteMany({ tvShow: id });

    res.json({ message: "TV show deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addTMDBToLibrary,
  deleteTVShow,
  getRecommendations,
  markAsWatched,
  moveToCurrentlyWatching,
  moveToWantToWatch,
  removeFromLibrary,
  updateLibraryStatus,
};
