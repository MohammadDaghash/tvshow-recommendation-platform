const fs = require("fs");
const path = require("path");

const RecommendationFeedback = require("../models/RecommendationFeedback");
const RecommendationLog = require("../models/RecommendationLog");
const TVShow = require("../models/TVShow");
const User = require("../models/User");
const UserInteraction = require("../models/UserInteraction");
const { buildTrainingHealth } = require("../services/trainingHealth.service");

const toPlainRecord = (record) => ({
  ...record,
  _id: record._id?.toString?.() || record._id,
  user: record.user?.toString?.() || record.user,
  tvShow: record.tvShow?.toString?.() || record.tvShow,
  recommendationLog:
    record.recommendationLog?.toString?.() || record.recommendationLog,
  items: Array.isArray(record.items)
    ? record.items.map((item) => ({
        ...item,
        tvShow: item.tvShow?.toString?.() || item.tvShow,
      }))
    : record.items,
});

const getMLRecommendations = async (req, res) => {
  try {
    const filePath = path.resolve(
      process.cwd(),
      "ml/experiments/recommendations.json",
    );

    console.log("Looking for recommendations at:", filePath);

    const data = fs.readFileSync(filePath, "utf-8");

    const recommendations = JSON.parse(data);

    res.json(recommendations);
  } catch (error) {
    console.log("ML recommendations error:", error.message);

    res.status(500).json({
      message: "Failed to load ML recommendations",
    });
  }
};

const getTrainingHealth = async (req, res) => {
  try {
    const [users, tvShows, recommendationLogs, userInteractions, feedback] =
      await Promise.all([
        User.find({}).lean(),
        TVShow.find({}).lean(),
        RecommendationLog.find({}).lean(),
        UserInteraction.find({}).lean(),
        RecommendationFeedback.find({}).lean(),
      ]);

    res.json(
      buildTrainingHealth({
        users: users.map(toPlainRecord),
        tvShows: tvShows.map(toPlainRecord),
        recommendationLogs: recommendationLogs.map(toPlainRecord),
        userInteractions: userInteractions.map(toPlainRecord),
        recommendationFeedback: feedback.map(toPlainRecord),
      }),
    );
  } catch (error) {
    res.status(500).json({
      message: "Failed to load training data health",
    });
  }
};

module.exports = {
  getMLRecommendations,
  getTrainingHealth,
};
