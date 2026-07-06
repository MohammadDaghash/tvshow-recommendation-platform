const mongoose = require("mongoose");

const userInterestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    interestType: {
      type: String,
      enum: ["genre", "mood", "theme", "actor", "language", "era", "keyword"],
      required: true,
      index: true,
    },

    value: {
      type: String,
      required: true,
      trim: true,
    },

    weight: {
      type: Number,
      default: 1,
      min: 0,
      max: 10,
    },

    sentiment: {
      type: String,
      enum: ["like", "dislike"],
      default: "like",
      index: true,
    },

    source: {
      type: String,
      enum: ["explicit", "derived"],
      default: "explicit",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

userInterestSchema.index(
  { user: 1, interestType: 1, value: 1, source: 1 },
  { unique: true },
);

module.exports = mongoose.model("UserInterest", userInterestSchema);
