const TVShow = require("../models/TVShow");
const {
  recordInteractionEvent,
} = require("../services/interactionEvent.service");
const {
  shouldRecordTasteSignals,
  withRecommendationSignalContext,
} = require("../services/recommendationSignalContext.service");

const {
  searchTVShows,
  getTVShowDetailsById,
} = require("../services/tmdb.service");

const searchTMDBTVShows = async (req, res) => {
  try {
    const { title } = req.query;

    if (!title) {
      return res.status(400).json({
        message: "Title query is required",
      });
    }

    const results = await searchTVShows(title);

    res.json(results);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const recordCatalogImport = (req, tvShow) => {
  if (!shouldRecordTasteSignals(req.user)) {
    return Promise.resolve(null);
  }

  return recordInteractionEvent(
    {
      userId: req.user._id,
      eventType: "catalog_imported",
      tvShowId: tvShow._id,
      tmdbId: tvShow.tmdbId,
      title: tvShow.title,
      sourcePage: req.body?.sourcePage || "admin",
      metadata: withRecommendationSignalContext(req.user, {
        catalogAction: "import",
        popularity: tvShow.popularity,
        tmdbRating: tvShow.tmdbRating,
      }),
    },
    { bestEffort: true },
  );
};

const importTVShow = async (req, res) => {
  try {
    const { tmdbId } = req.body;

    const tmdbShow = await getTVShowDetailsById(tmdbId);

    const existingShow = await TVShow.findOne({
      tmdbId: tmdbShow.tmdbId,
    });

    if (existingShow) {
      return res.status(400).json({
        message: "TV show already exists",
      });
    }

    const newTVShow = await TVShow.create({
      title: tmdbShow.title,
      genres: tmdbShow.genres,
      year: tmdbShow.year,
      imageUrl: tmdbShow.imageUrl,
      overview: tmdbShow.overview,
      popularity: tmdbShow.popularity,
      tmdbRating: tmdbShow.tmdbRating,
      tmdbId: tmdbShow.tmdbId,
      watched: false,
      userRating: null,
      recommendationScore: 0,
    });

    await recordCatalogImport(req, newTVShow);

    res.status(201).json(newTVShow);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  searchTMDBTVShows,
  importTVShow,
};
