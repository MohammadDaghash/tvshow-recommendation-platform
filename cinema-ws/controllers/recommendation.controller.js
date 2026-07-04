const TVShow = require("../models/TVShow");
const UserShow = require("../models/UserShow");
const recommendationService = require("../services/recommendation.service");
const { getTVShowDetailsById } = require("../services/tmdb.service");
const { buildTMDBCatalogUpdate } = require("../services/tmdbCatalog.service");
const { buildCatalogShowUpdate } = require("../services/catalogLibrary.service");
const { buildUserShowUpdate } = require("../services/userLibrary.service");
const {
  recordInteractionEvent,
} = require("../services/interactionEvent.service");
const {
  shouldRecordTasteSignals,
  withRecommendationSignalContext,
} = require("../services/recommendationSignalContext.service");

const recordUserInteraction = (req, payload) => {
  if (!shouldRecordTasteSignals(req.user)) {
    return Promise.resolve(null);
  }

  const requestMetadata = req.body?.metadata || {};

  return recordInteractionEvent(
    {
      userId: req.user._id,
      sourcePage: req.body?.sourcePage,
      ...payload,
      metadata: {
        ...withRecommendationSignalContext(req.user, {
          ...requestMetadata,
          ...(payload.metadata || {}),
        }),
      },
    },
    { bestEffort: true },
  );
};

const getStatusEventType = (status) => {
  return status === "watched" ? "rating_submitted" : "status_changed";
};

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

    await recordUserInteraction(req, {
      eventType: getStatusEventType(status),
      tvShowId: id,
      title: updatedShow?.title,
      rating: status === "watched" ? userRating : undefined,
      status,
    });

    res.json(updatedShow);
  } catch (error) {
    res.status(error.statusCode || 400).json({
      message: error.message,
    });
  }
};

const updateCatalogStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, userRating } = req.body;
    const update = buildCatalogShowUpdate(status, { userRating });
    const updatedShow = await TVShow.findByIdAndUpdate(id, update, {
      returnDocument: "after",
    });

    if (!updatedShow) {
      return res.status(404).json({
        message: "TV show not found",
      });
    }

    await recordUserInteraction(req, {
      eventType: getStatusEventType(status),
      tvShowId: id,
      tmdbId: updatedShow.tmdbId,
      title: updatedShow.title,
      rating: status === "watched" ? userRating : undefined,
      status,
      metadata: {
        catalogAction: "status_update",
      },
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

    await recordUserInteraction(req, {
      eventType: "rating_submitted",
      tvShowId: id,
      title: updatedShow?.title,
      rating: userRating,
      status: "watched",
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

    await recordUserInteraction(req, {
      eventType: "status_changed",
      tvShowId: id,
      title: updatedShow?.title,
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

    await recordUserInteraction(req, {
      eventType: "status_changed",
      tvShowId: id,
      title: updatedShow?.title,
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
      buildTMDBCatalogUpdate(tmdbShow),
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

    await recordUserInteraction(req, {
      eventType: "suggestion_accepted",
      tvShowId: tvShow._id,
      tmdbId: tvShow.tmdbId,
      title: tvShow.title,
      rating: status === "watched" ? userRating : undefined,
      status,
      metadata: {
        ...(req.body.metadata || {}),
        popularity: tvShow.popularity,
        tmdbRating: tvShow.tmdbRating,
      },
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

    const deletedUserShow = await UserShow.findOneAndDelete({
      user: req.user._id,
      tvShow: id,
    }).populate("tvShow");

    await recordUserInteraction(req, {
      eventType: "library_removed",
      tvShowId: id,
      title: deletedUserShow?.tvShow?.title,
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
    const show = await TVShow.findById(id);

    await TVShow.findByIdAndDelete(id);
    await UserShow.deleteMany({ tvShow: id });

    await recordUserInteraction(req, {
      eventType: "catalog_deleted",
      tmdbId: show?.tmdbId,
      title: show?.title,
      sourcePage: req.body?.sourcePage || "admin",
      status: "none",
      metadata: {
        catalogAction: "delete",
      },
    });

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
  updateCatalogStatus,
  updateLibraryStatus,
};
