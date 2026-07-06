require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const tvShowRoutes = require("./routes/tvShowRoutes.js");
const recommendationRoutes = require("./routes/recommendationRoutes");
const tmdbRoutes = require("./routes/tmdb.routes");
const authRoutes = require("./routes/auth.routes");
const mlRoutes = require("./routes/ml.routes");
const mlRecommendationRoutes = require("./routes/mlRecommendation.routes");
const ignoredSuggestionRoutes = require("./routes/ignoredSuggestion.routes");
const interactionRoutes = require("./routes/interaction.routes");
const interestRoutes = require("./routes/interest.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

app.use("/api/tv-shows", tvShowRoutes);
app.use("/api/recommendations", recommendationRoutes);

app.use("/api/tmdb", tmdbRoutes);
app.use("/api/auth", authRoutes);

app.use("/api/ml", mlRoutes);
app.use("/api/ml-recommendations", mlRecommendationRoutes);
app.use("/api/ignored-suggestions", ignoredSuggestionRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/interests", interestRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "TV Show Recommendation API is running",
  });
});

module.exports = app;
