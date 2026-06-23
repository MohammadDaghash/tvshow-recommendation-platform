const UserIgnoredSuggestion = require("../models/UserIgnoredSuggestion");

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
