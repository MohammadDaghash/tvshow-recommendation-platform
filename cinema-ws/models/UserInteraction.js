const mongoose = require("mongoose");

const interactionEventTypes = [
  "status_changed",
  "rating_submitted",
  "suggestion_accepted",
  "suggestion_ignored",
  "library_removed",
];

const userInteractionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    eventType: {
      type: String,
      enum: interactionEventTypes,
      required: true,
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

    title: {
      type: String,
    },

    sourcePage: {
      type: String,
    },

    rating: {
      type: Number,
      min: 0,
      max: 10,
    },

    status: {
      type: String,
      enum: ["watched", "want", "watching", "none"],
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

module.exports = mongoose.model("UserInteraction", userInteractionSchema);
