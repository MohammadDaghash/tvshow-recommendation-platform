const mongoose = require("mongoose");

const tvShowSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    genres: {
      type: [String],
      required: true,
    },

    year: {
      type: Number,
    },

    imageUrl: {
      type: String,
    },

    overview: {
      type: String,
    },

    popularity: {
      type: Number,
    },

    tmdbRating: {
      type: Number,
    },

    tmdbId: {
      type: Number,
    },

    userRating: {
      type: Number,
      min: 0,
      max: 10,
    },

    recommendationScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    watched: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["watched", "want", "watching"],
    },

    type: {
      type: String,
      default: "tv-show",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("TVShow", tvShowSchema);
