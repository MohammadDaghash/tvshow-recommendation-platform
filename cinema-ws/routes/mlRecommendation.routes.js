const express = require("express");

const {
  getTMDBRecommendations,
} = require("../controllers/mlRecommendation.controller");
const { optionalAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/tmdb", optionalAuth, getTMDBRecommendations);

module.exports = router;
