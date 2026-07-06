const mongoose = require("mongoose");

const ignoredSuggestionSchema = new mongoose.Schema(
  {
    tmdbId: {
      type: Number,
      required: true,
      unique: true,
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

module.exports = mongoose.model("IgnoredSuggestion", ignoredSuggestionSchema);
