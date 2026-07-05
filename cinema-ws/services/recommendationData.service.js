const RecommendationFeedback = require("../models/RecommendationFeedback");
const RecommendationLog = require("../models/RecommendationLog");

const normalizeId = (value) => {
  if (!value) return "";

  return value.toString();
};

const cleanObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
};

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;

  const number = Number(value);

  return Number.isFinite(number) ? number : undefined;
};

const buildRecommendationLogItem = (item, index) => {
  const normalizedItem = {
    title: item.title,
    position: item.position ?? index + 1,
    scoreBreakdown: cleanObject(item.scoreBreakdown),
  };

  if (item.tvShowId) normalizedItem.tvShow = normalizeId(item.tvShowId);
  if (item.tmdbId) normalizedItem.tmdbId = Number(item.tmdbId);
  if (item.score !== undefined && item.score !== null) {
    normalizedItem.score = Number(item.score);
  }

  return normalizedItem;
};

const buildRecommendationLog = ({
  userId,
  modelVersion,
  source,
  page,
  items = [],
}) => {
  const user = normalizeId(userId);

  if (!user) {
    throw new Error("User is required for recommendation logs");
  }

  if (!modelVersion || !source || !page) {
    throw new Error("Model version, source, and page are required");
  }

  return {
    user,
    modelVersion,
    source,
    page,
    items: items.map(buildRecommendationLogItem),
  };
};

const buildRecommendationFeedback = ({
  userId,
  recommendationLogId,
  tvShowId,
  tmdbId,
  action,
  rating,
  sourcePage,
  position,
  modelVersion,
  actionType,
  previousStatus,
  nextStatus,
  recommendationScore,
  matchScore,
  tmdbRating,
  metadata,
}) => {
  const user = normalizeId(userId);

  if (!user) {
    throw new Error("User is required for recommendation feedback");
  }

  if (!action) {
    throw new Error("Feedback action is required");
  }

  const cleanedMetadata = cleanObject(metadata);
  const feedback = {
    user,
    action,
    metadata: cleanedMetadata,
  };

  if (recommendationLogId) {
    feedback.recommendationLog = normalizeId(recommendationLogId);
  }
  if (tvShowId) feedback.tvShow = normalizeId(tvShowId);
  if (tmdbId) feedback.tmdbId = Number(tmdbId);
  if (firstDefined(sourcePage, cleanedMetadata.sourcePage)) {
    feedback.sourcePage = firstDefined(sourcePage, cleanedMetadata.sourcePage);
  }

  const cleanPosition = toOptionalNumber(
    firstDefined(position, cleanedMetadata.position),
  );
  if (cleanPosition !== undefined) {
    feedback.position = cleanPosition;
  }
  if (firstDefined(modelVersion, cleanedMetadata.modelVersion)) {
    feedback.modelVersion = firstDefined(modelVersion, cleanedMetadata.modelVersion);
  }
  if (firstDefined(actionType, cleanedMetadata.actionType)) {
    feedback.actionType = firstDefined(actionType, cleanedMetadata.actionType);
  }
  if (firstDefined(previousStatus, cleanedMetadata.previousStatus)) {
    feedback.previousStatus = firstDefined(
      previousStatus,
      cleanedMetadata.previousStatus,
    );
  }
  if (firstDefined(nextStatus, cleanedMetadata.nextStatus)) {
    feedback.nextStatus = firstDefined(nextStatus, cleanedMetadata.nextStatus);
  }

  const promotedNumbers = {
    recommendationScore: toOptionalNumber(
      firstDefined(recommendationScore, cleanedMetadata.recommendationScore),
    ),
    matchScore: toOptionalNumber(
      firstDefined(matchScore, cleanedMetadata.matchScore),
    ),
    tmdbRating: toOptionalNumber(
      firstDefined(tmdbRating, cleanedMetadata.tmdbRating),
    ),
  };

  for (const [field, value] of Object.entries(promotedNumbers)) {
    if (value !== undefined) feedback[field] = value;
  }

  if (rating !== undefined && rating !== null) {
    const numericRating = Number(rating);

    if (!Number.isFinite(numericRating) || numericRating < 0 || numericRating > 10) {
      throw new Error("Feedback rating must be between 0 and 10");
    }

    feedback.rating = numericRating;
  }

  return feedback;
};

const recordRecommendationLog = async (
  payload,
  { bestEffort = false, logger = console.warn, model = RecommendationLog } = {},
) => {
  try {
    return await model.create(buildRecommendationLog(payload));
  } catch (error) {
    if (bestEffort) {
      if (logger) {
        logger("Recommendation log was not recorded:", error.message);
      }

      return null;
    }

    throw error;
  }
};

const recordRecommendationFeedback = async (
  payload,
  {
    bestEffort = false,
    logger = console.warn,
    model = RecommendationFeedback,
  } = {},
) => {
  try {
    return await model.create(buildRecommendationFeedback(payload));
  } catch (error) {
    if (bestEffort) {
      if (logger) {
        logger("Recommendation feedback was not recorded:", error.message);
      }

      return null;
    }

    throw error;
  }
};

module.exports = {
  buildRecommendationFeedback,
  buildRecommendationLog,
  recordRecommendationFeedback,
  recordRecommendationLog,
};
