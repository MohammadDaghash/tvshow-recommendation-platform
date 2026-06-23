const express = require("express");
const recommendationController = require("../controllers/recommendation.controller");
const {
  adminOnly,
  optionalAuth,
  protect,
} = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", optionalAuth, recommendationController.getRecommendations);

router.post("/from-tmdb", protect, recommendationController.addTMDBToLibrary);

router.post("/:id/watch", protect, recommendationController.markAsWatched);

router.post(
  "/:id/unwatch",
  protect,
  recommendationController.moveToWantToWatch,
);

router.post(
  "/:id/watching",
  protect,
  recommendationController.moveToCurrentlyWatching,
);

router.patch("/:id/status", protect, recommendationController.updateLibraryStatus);

router.delete("/:id/library", protect, recommendationController.removeFromLibrary);

router.delete(
  "/:id",
  protect,
  adminOnly,
  recommendationController.deleteTVShow,
);

module.exports = router;
