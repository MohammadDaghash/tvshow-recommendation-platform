const TVShow = require("../models/TVShow");
const UserInteraction = require("../models/UserInteraction");
const {
  recordInteractionEvent,
} = require("../services/interactionEvent.service");
const recommendationExplanationService = require("../services/recommendationExplanation.service");

const EXPLANATION_DAILY_LIMIT_PER_USER = 50;
const SCORE_FIELDS = recommendationExplanationService.SCORE_FIELDS;

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseBoundedNumber = (value, fieldName, { min = 0, max = 100 } = {}) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${fieldName} must be a number between ${min} and ${max}`);
  }

  return number;
};

const normalizeScoreBreakdown = (scoreBreakdown) => {
  if (!isPlainObject(scoreBreakdown)) {
    throw new Error("scoreBreakdown must be an object");
  }

  return Object.fromEntries(
    SCORE_FIELDS.map((field) => [
      field,
      parseBoundedNumber(scoreBreakdown[field], `scoreBreakdown.${field}`),
    ]),
  );
};

const normalizeSimilarWatchedShows = (similarWatchedShows = []) => {
  if (!Array.isArray(similarWatchedShows)) {
    throw new Error("similarWatchedShows must be an array");
  }

  if (similarWatchedShows.length > 3) {
    throw new Error("similarWatchedShows can include at most 3 shows");
  }

  return similarWatchedShows.map((show, index) => {
    if (!isPlainObject(show) || typeof show.title !== "string") {
      throw new Error(`similarWatchedShows.${index}.title is required`);
    }

    return {
      title: show.title.trim(),
      similarity: parseBoundedNumber(
        show.similarity,
        `similarWatchedShows.${index}.similarity`,
        {
          min: 0,
          max: 1,
        },
      ),
    };
  });
};

function buildExplanationRequest(body = {}) {
  return {
    recommendationScore: parseBoundedNumber(
      body.recommendationScore,
      "recommendationScore",
    ),
    scoreBreakdown: normalizeScoreBreakdown(body.scoreBreakdown),
    similarWatchedShows: normalizeSimilarWatchedShows(body.similarWatchedShows),
    recommendationLogId: body.recommendationLogId,
    position:
      body.position === undefined || body.position === null
        ? undefined
        : parseBoundedNumber(body.position, "position", {
            min: 0,
            max: Number.MAX_SAFE_INTEGER,
          }),
    sourcePage: body.sourcePage,
  };
}

const buildClientResponse = (explanationResult) => ({
  explanation: explanationResult.explanation ?? null,
  emphasizedFactor: explanationResult.emphasizedFactor ?? null,
  cached: Boolean(explanationResult.cached),
  fallback: Boolean(explanationResult.fallback),
  reason: explanationResult.reason ?? null,
});

const getDailyWindowStart = () => {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 1);

  return windowStart;
};

function createRecommendationExplanationController({
  TVShowModel = TVShow,
  UserInteractionModel = UserInteraction,
  explanationService = recommendationExplanationService,
} = {}) {
  const getExplanation = async (req, res) => {
    let requestPayload;

    try {
      requestPayload = buildExplanationRequest(req.body);
    } catch (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    try {
      const tvShow = await TVShowModel.findById(req.params.id);

      if (!tvShow) {
        return res.status(404).json({
          message: "TV show not found",
        });
      }

      const explanationCount = await UserInteractionModel.countDocuments({
        user: req.user._id,
        eventType: "explanation_viewed",
        createdAt: {
          $gte: getDailyWindowStart(),
        },
      });

      if (explanationCount >= EXPLANATION_DAILY_LIMIT_PER_USER) {
        return res.json({
          explanation: null,
          emphasizedFactor: null,
          cached: false,
          fallback: true,
          reason: "daily_limit_reached",
        });
      }

      const explanationResult = await explanationService.getExplanation({
        showTitle: tvShow.title,
        recommendationScore: requestPayload.recommendationScore,
        scoreBreakdown: requestPayload.scoreBreakdown,
        similarWatchedShows: requestPayload.similarWatchedShows,
      });

      if (!explanationResult.fallback && explanationResult.explanation) {
        await recordInteractionEvent(
          {
            userId: req.user._id,
            eventType: "explanation_viewed",
            tvShowId: tvShow._id,
            tmdbId: tvShow.tmdbId,
            title: tvShow.title,
            recommendationLogId: requestPayload.recommendationLogId,
            sourcePage: requestPayload.sourcePage,
            position: requestPayload.position,
            metadata: {
              claudeModel: explanationResult.model,
              latencyMs: explanationResult.latencyMs,
              deduped: Boolean(explanationResult.deduped),
            },
          },
          {
            model: UserInteractionModel,
          },
        );
      }

      return res.json(buildClientResponse(explanationResult));
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };

  return {
    getExplanation,
  };
}

module.exports = {
  EXPLANATION_DAILY_LIMIT_PER_USER,
  buildExplanationRequest,
  createRecommendationExplanationController,
  getExplanation: createRecommendationExplanationController().getExplanation,
};
