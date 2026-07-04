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

export async function resolveCurrentRecommendationLogId({
  currentSignature,
  getTrackingEntry,
}) {
  const trackingEntry = getTrackingEntry();

  if (!trackingEntry || trackingEntry.signature !== currentSignature) {
    return undefined;
  }

  if (trackingEntry.id) return trackingEntry.id;

  const logResponse = await trackingEntry.promise;
  const latestEntry = getTrackingEntry();

  if (latestEntry?.signature !== currentSignature) {
    return undefined;
  }

  return latestEntry?.id || logResponse?.id;
}
