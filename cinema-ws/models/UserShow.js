const mongoose = require("mongoose");

const userShowSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tvShow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TVShow",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["watched", "want", "watching"],
      required: true,
    },

    userRating: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userShowSchema.index({ user: 1, tvShow: 1 }, { unique: true });

module.exports = mongoose.model("UserShow", userShowSchema);
