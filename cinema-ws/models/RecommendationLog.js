const mongoose = require("mongoose");

const recommendationLogItemSchema = new mongoose.Schema(
  {
    tvShow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TVShow",
      index: true,
    },

    tmdbId: {
      type: Number,
      index: true,
    },

    title: {
      type: String,
      required: true,
    },

    score: {
      type: Number,
      min: 0,
      max: 100,
    },

    position: {
      type: Number,
      min: 0,
      required: true,
    },

    scoreBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    _id: false,
  },
);

const recommendationLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    modelVersion: {
      type: String,
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: ["catalog", "tmdb", "demo"],
      required: true,
    },

    page: {
      type: String,
      required: true,
      index: true,
    },

    items: {
      type: [recommendationLogItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("RecommendationLog", recommendationLogSchema);
