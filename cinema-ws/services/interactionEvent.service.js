const UserInteraction = require("../models/UserInteraction");

const INTERACTION_EVENT_TYPES = Object.freeze([
  "catalog_deleted",
  "catalog_imported",
  "status_changed",
  "rating_submitted",
  "suggestion_accepted",
  "suggestion_ignored",
  "suggestion_impression",
  "card_opened",
  "explanation_viewed",
  "search_performed",
  "filter_used",
  "library_removed",
]);

const validEventTypes = new Set(INTERACTION_EVENT_TYPES);

const normalizeId = (value) => {
  if (!value) return "";

  return value.toString();
};

const cleanMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
};

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;

  const number = Number(value);

  return Number.isFinite(number) ? number : undefined;
};

const buildInteractionEvent = ({
  userId,
  eventType,
  tvShowId,
  recommendationLogId,
  tmdbId,
  title,
  sourcePage,
  position,
  actionType,
  previousStatus,
  nextStatus,
  modelVersion,
  recommendationScore,
  matchScore,
  tmdbRating,
  rating,
  status,
  metadata,
}) => {
  const user = normalizeId(userId);

  if (!user) {
    throw new Error("User is required for interaction events");
  }

  if (!validEventTypes.has(eventType)) {
    throw new Error(`Unsupported interaction event: ${eventType}`);
  }

  const cleanedMetadata = cleanMetadata(metadata);
  const event = {
    user,
    eventType,
    metadata: cleanedMetadata,
  };

  if (tvShowId) event.tvShow = normalizeId(tvShowId);
  if (recommendationLogId) {
    event.recommendationLog = normalizeId(recommendationLogId);
  }
  if (tmdbId) event.tmdbId = Number(tmdbId);
  if (title) event.title = title;
  if (firstDefined(sourcePage, cleanedMetadata.sourcePage)) {
    event.sourcePage = firstDefined(sourcePage, cleanedMetadata.sourcePage);
  }

  const cleanPosition = toOptionalNumber(
    firstDefined(position, cleanedMetadata.position),
  );
  if (cleanPosition !== undefined) {
    event.position = cleanPosition;
  }
  if (firstDefined(modelVersion, cleanedMetadata.modelVersion)) {
    event.modelVersion = firstDefined(modelVersion, cleanedMetadata.modelVersion);
  }
  if (firstDefined(status, cleanedMetadata.nextStatus)) {
    event.status = firstDefined(status, cleanedMetadata.nextStatus);
  }
  if (firstDefined(actionType, cleanedMetadata.actionType)) {
    event.actionType = firstDefined(actionType, cleanedMetadata.actionType);
  }
  if (firstDefined(previousStatus, cleanedMetadata.previousStatus)) {
    event.previousStatus = firstDefined(
      previousStatus,
      cleanedMetadata.previousStatus,
    );
  }
  if (firstDefined(nextStatus, cleanedMetadata.nextStatus)) {
    event.nextStatus = firstDefined(nextStatus, cleanedMetadata.nextStatus);
  }

  const promotedNumbers = {
    recommendationScore: toOptionalNumber(
      firstDefined(recommendationScore, cleanedMetadata.recommendationScore),
    ),
    matchScore: toOptionalNumber(firstDefined(matchScore, cleanedMetadata.matchScore)),
    tmdbRating: toOptionalNumber(firstDefined(tmdbRating, cleanedMetadata.tmdbRating)),
  };

  for (const [field, value] of Object.entries(promotedNumbers)) {
    if (value !== undefined) event[field] = value;
  }

  if (rating !== undefined && rating !== null) {
    const numericRating = Number(rating);

    if (!Number.isFinite(numericRating) || numericRating < 0 || numericRating > 10) {
      throw new Error("Interaction rating must be between 0 and 10");
    }

    event.rating = numericRating;
  }

  return event;
};

const recordInteractionEvent = async (
  payload,
  { bestEffort = false, logger = console.warn, model = UserInteraction } = {},
) => {
  try {
    return await model.create(buildInteractionEvent(payload));
  } catch (error) {
    if (bestEffort) {
      if (logger) {
        logger("Interaction event was not recorded:", error.message);
      }

      return null;
    }

    throw error;
  }
};

const recordInteractionEvents = async (
  payloads,
  { bestEffort = false, logger = console.warn, model = UserInteraction } = {},
) => {
  try {
    const events = payloads.map((payload) => buildInteractionEvent(payload));

    if (events.length === 0) return [];

    return await model.insertMany(events);
  } catch (error) {
    if (bestEffort) {
      if (logger) {
        logger("Interaction event batch was not recorded:", error.message);
      }

      return [];
    }

    throw error;
  }
};

module.exports = {
  INTERACTION_EVENT_TYPES,
  buildInteractionEvent,
  recordInteractionEvents,
  recordInteractionEvent,
};
