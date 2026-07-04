const express = require("express");
const {
  getMLRecommendations,
  getTrainingHealth,
} = require("../controllers/ml.controller");
const { adminOnly, protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/recommendations", getMLRecommendations);
router.get("/training-health", protect, adminOnly, getTrainingHealth);

module.exports = router;
