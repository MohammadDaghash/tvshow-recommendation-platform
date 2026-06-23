const express = require("express");
const {
  getIgnoredSuggestions,
  ignoreSuggestion,
} = require("../controllers/ignoredSuggestion.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, getIgnoredSuggestions);

router.post("/", protect, ignoreSuggestion);

module.exports = router;
