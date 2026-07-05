const mongoose = require("mongoose");

const recommendationFeedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    recommendationLog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecommendationLog",
      index: true,
    },

    tvShow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TVShow",
      index: true,
    },

    tmdbId: {
      type: Number,
      index: true,
    },

    action: {
      type: String,
      enum: [
        "accepted_want",
        "accepted_watching",
        "accepted_watched",
        "ignored",
        "opened",
        "rated",
      ],
      required: true,
      index: true,
    },

    sourcePage: {
      type: String,
      index: true,
    },

    position: {
      type: Number,
      min: 0,
    },

    modelVersion: {
      type: String,
      index: true,
    },

    actionType: {
      type: String,
      index: true,
    },

    previousStatus: {
      type: String,
    },

    nextStatus: {
      type: String,
    },

    recommendationScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    matchScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    tmdbRating: {
      type: Number,
      min: 0,
      max: 10,
    },

    rating: {
      type: Number,
      min: 0,
      max: 10,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "RecommendationFeedback",
  recommendationFeedbackSchema,
);
