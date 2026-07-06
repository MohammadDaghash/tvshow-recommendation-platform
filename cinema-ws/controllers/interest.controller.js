const TVShow = require("../models/TVShow");
const UserIgnoredSuggestion = require("../models/UserIgnoredSuggestion");
const UserInterest = require("../models/UserInterest");
const UserShow = require("../models/UserShow");
const {
  buildTasteProfileReport,
} = require("../services/tasteProfileReport.service");
const {
  buildKeywordInterestPayload,
} = require("../services/userInterest.service");

const keywordQuery = (userId) => ({
  user: userId,
  interestType: "keyword",
  source: "explicit",
});

const getDataScope = (user) => {
  if (!user) return "demo";

  return user.role === "admin" ? "demo" : "private";
};

const getUserShows = async (UserShowModel, user) => {
  if (!user || user.role === "admin") return [];

  return UserShowModel.find({
    user: user._id,
  }).populate("tvShow");
};

const getCatalogShows = async (TVShowModel, user) => {
  if (user && user.role !== "admin") return [];

  return TVShowModel.find({});
};

const getUserKeywords = async (UserInterestModel, user) => {
  if (!user) return [];

  return UserInterestModel.find(keywordQuery(user._id));
};

const getIgnoredSuggestions = async (UserIgnoredSuggestionModel, user) => {
  if (!user) return [];

  return UserIgnoredSuggestionModel.find({
    user: user._id,
  });
};

function createInterestController({
  TVShowModel = TVShow,
  UserIgnoredSuggestionModel = UserIgnoredSuggestion,
  UserInterestModel = UserInterest,
  UserShowModel = UserShow,
} = {}) {
  const getTasteProfile = async (req, res) => {
    try {
      const [tvShows, userShows, ignoredSuggestions, userInterests] =
        await Promise.all([
          getCatalogShows(TVShowModel, req.user),
          getUserShows(UserShowModel, req.user),
          getIgnoredSuggestions(UserIgnoredSuggestionModel, req.user),
          getUserKeywords(UserInterestModel, req.user),
        ]);

      res.json({
        canEdit: Boolean(req.user),
        dataScope: getDataScope(req.user),
        profile: buildTasteProfileReport({
          ignoredSuggestions,
          tvShows,
          userInterests,
          userShows,
        }),
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to load taste profile",
      });
    }
  };

  const createKeywordInterest = async (req, res) => {
    try {
      const payload = buildKeywordInterestPayload({
        userId: req.user._id,
        value: req.body?.value,
        sentiment: req.body?.sentiment,
        weight: req.body?.weight,
      });
      const interest = await UserInterestModel.findOneAndUpdate(
        {
          user: req.user._id,
          interestType: "keyword",
          value: payload.value,
        },
        payload,
        {
          returnDocument: "after",
          setDefaultsOnInsert: true,
          upsert: true,
        },
      );

      res.status(201).json(interest);
    } catch (error) {
      res.status(400).json({
        message: error.message,
      });
    }
  };

  const deleteKeywordInterest = async (req, res) => {
    try {
      const result = await UserInterestModel.deleteOne({
        _id: req.params.id,
        user: req.user._id,
        interestType: "keyword",
      });

      if (!result.deletedCount) {
        return res.status(404).json({
          message: "Keyword not found",
        });
      }

      res.json({
        message: "Keyword removed",
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to delete keyword",
      });
    }
  };

  return {
    createKeywordInterest,
    deleteKeywordInterest,
    getTasteProfile,
  };
}

module.exports = {
  ...createInterestController(),
  createInterestController,
};
