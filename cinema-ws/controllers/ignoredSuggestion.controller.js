const UserIgnoredSuggestion = require("../models/UserIgnoredSuggestion");
const {
  recordInteractionEvent,
} = require("../services/interactionEvent.service");

const recordIgnoredSuggestion = (req, payload) => {
  if (!req.user || req.user.role === "admin") {
    return Promise.resolve(null);
  }

  return recordInteractionEvent(
    {
      userId: req.user._id,
      eventType: "suggestion_ignored",
      sourcePage: req.body?.sourcePage || "ai",
      ...payload,
    },
    { bestEffort: true },
  );
};

const getIgnoredSuggestions = async (req, res) => {
  try {
    const ignoredSuggestions = await UserIgnoredSuggestion.find({
      user: req.user._id,
    });

    res.json(ignoredSuggestions);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const ignoreSuggestion = async (req, res) => {
  try {
    const { tmdbId, title } = req.body;

    if (!tmdbId || !title) {
      return res.status(400).json({
        message: "TMDB id and title are required",
      });
    }

    const ignoredSuggestion = await UserIgnoredSuggestion.findOneAndUpdate(
      {
        user: req.user._id,
        tmdbId,
      },
      {
        user: req.user._id,
        tmdbId,
        title,
      },
      {
        returnDocument: "after",
        upsert: true,
      },
    );

    await recordIgnoredSuggestion(req, {
      tmdbId,
      title,
    });

    res.status(201).json(ignoredSuggestion);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getIgnoredSuggestions,
  ignoreSuggestion,
};
