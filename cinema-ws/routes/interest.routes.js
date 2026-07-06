const express = require("express");
const {
  createKeywordInterest,
  deleteKeywordInterest,
  getTasteProfile,
} = require("../controllers/interest.controller");
const { optionalAuth, protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/profile", optionalAuth, getTasteProfile);
router.post("/keywords", protect, createKeywordInterest);
router.delete("/keywords/:id", protect, deleteKeywordInterest);

module.exports = router;
