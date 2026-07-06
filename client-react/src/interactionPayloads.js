import {
  buildShowTrackingMetadata,
  getShowModelVersion,
} from "./trackingMetadata.js";

export const RECOMMENDATION_MODEL_VERSION = "baseline-v1";

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  );

const getShowIdentity = (show) =>
  compactObject({
    tvShowId: show._id,
    tmdbId: show.tmdbId,
    title: show.title,
  });

const getRecommendationScore = (show) =>
  show.matchScore ?? show.recommendationScore ?? 0;

const getPayloadModelVersion = (show) =>
  getShowModelVersion(show) || RECOMMENDATION_MODEL_VERSION;

const getRecommendationSetModelVersion = (shows = []) =>
  shows.map(getPayloadModelVersion).find(Boolean) || RECOMMENDATION_MODEL_VERSION;

export function buildCardOpenEvent(
  show,
  sourcePage,
  position,
  { recommendationLogId, metadata } = {},
) {
  return compactObject({
    eventType: "card_opened",
    ...getShowIdentity(show),
    recommendationLogId,
    sourcePage,
    position,
    modelVersion: getPayloadModelVersion(show),
    metadata: buildShowTrackingMetadata(show, metadata),
  });
}

export function buildSuggestionImpressionEvents(
  shows,
  sourcePage,
  { recommendationLogId } = {},
) {
  return shows.map((show, index) =>
    compactObject({
      eventType: "suggestion_impression",
      ...getShowIdentity(show),
      recommendationLogId,
      sourcePage,
      position: index + 1,
      modelVersion: getPayloadModelVersion(show),
      metadata: buildShowTrackingMetadata(show),
    }),
  );
}

export function buildRecommendationLogPayload({ page, source, shows }) {
  return {
    modelVersion: getRecommendationSetModelVersion(shows),
    source,
    page,
    items: shows.map((show, index) =>
      compactObject({
        ...getShowIdentity(show),
        score: getRecommendationScore(show),
        position: index + 1,
        modelVersion: getPayloadModelVersion(show),
        scoreBreakdown: show.scoreBreakdown || {},
      }),
    ),
  };
}

export function buildRecommendationFeedbackPayload(
  show,
  action,
  { rating, recommendationLogId, sourcePage, metadata } = {},
) {
  return compactObject({
    tvShowId: show._id,
    tmdbId: show.tmdbId,
    recommendationLogId,
    action,
    rating,
    metadata: buildShowTrackingMetadata(show, {
      sourcePage,
      ...metadata,
    }),
  });
}
