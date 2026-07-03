const UserInteraction = require("../models/UserInteraction");

const INTERACTION_EVENT_TYPES = Object.freeze([
  "status_changed",
  "rating_submitted",
  "suggestion_accepted",
  "suggestion_ignored",
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

const buildInteractionEvent = ({
  userId,
  eventType,
  tvShowId,
  tmdbId,
  title,
  sourcePage,
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

  const event = {
    user,
    eventType,
    metadata: cleanMetadata(metadata),
  };

  if (tvShowId) event.tvShow = normalizeId(tvShowId);
  if (tmdbId) event.tmdbId = Number(tmdbId);
  if (title) event.title = title;
  if (sourcePage) event.sourcePage = sourcePage;
  if (status) event.status = status;

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

module.exports = {
  INTERACTION_EVENT_TYPES,
  buildInteractionEvent,
  recordInteractionEvent,
};
