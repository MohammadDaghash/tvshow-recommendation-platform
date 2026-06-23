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
