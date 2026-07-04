import {
  buildRecommendationLogPayload,
  buildSuggestionImpressionEvents,
} from "./interactionPayloads.js";

const getShowTrackingId = (show) => show.tmdbId || show._id || show.title;

export function buildSuggestionTrackingSignature({ userId, shows }) {
  return [userId, ...shows.map(getShowTrackingId)].join("|");
}

export function buildSuggestionTrackingPayloads({
  shows,
  usesPublicDataset,
  recommendationLogId,
}) {
  return {
    logPayload: buildRecommendationLogPayload({
      page: "ai",
      source: usesPublicDataset ? "demo" : "tmdb",
      shows,
    }),
    impressionEvents: buildSuggestionImpressionEvents(shows, "ai", {
      recommendationLogId,
    }),
  };
}
