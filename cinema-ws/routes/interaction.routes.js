const express = require("express");
const interactionController = require("../controllers/interaction.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", protect, interactionController.recordInteraction);

router.post("/batch", protect, interactionController.recordInteractionBatch);

router.post("/recommendation-log", protect, interactionController.recordLog);

router.post("/feedback", protect, interactionController.recordFeedback);

module.exports = router;
