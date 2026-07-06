const mongoose = require("mongoose");

const userIgnoredSuggestionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tmdbId: {
      type: Number,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    genres: {
      type: [String],
      default: [],
    },

    tmdbRating: {
      type: Number,
      min: 0,
      max: 10,
    },

    popularity: {
      type: Number,
      min: 0,
    },

    year: {
      type: Number,
    },

    originalLanguage: {
      type: String,
    },

    originCountry: {
      type: [String],
      default: [],
    },

    voteCount: {
      type: Number,
      min: 0,
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

userIgnoredSuggestionSchema.index({ user: 1, tmdbId: 1 }, { unique: true });

module.exports = mongoose.model(
  "UserIgnoredSuggestion",
  userIgnoredSuggestionSchema,
);
