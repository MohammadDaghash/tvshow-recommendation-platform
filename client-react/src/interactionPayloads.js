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

const getScoreMetadata = (show) =>
  compactObject({
    matchScore: show.matchScore,
    recommendationScore: show.recommendationScore,
  });

const getRecommendationScore = (show) =>
  show.matchScore ?? show.recommendationScore ?? 0;

export function buildCardOpenEvent(show, sourcePage, position) {
  return compactObject({
    eventType: "card_opened",
    ...getShowIdentity(show),
    sourcePage,
    position,
    modelVersion: RECOMMENDATION_MODEL_VERSION,
    metadata: getScoreMetadata(show),
  });
}

export function buildSuggestionImpressionEvents(shows, sourcePage) {
  return shows.map((show, index) =>
    compactObject({
      eventType: "suggestion_impression",
      ...getShowIdentity(show),
      sourcePage,
      position: index + 1,
      modelVersion: RECOMMENDATION_MODEL_VERSION,
      metadata: getScoreMetadata(show),
    }),
  );
}

export function buildRecommendationLogPayload({ page, source, shows }) {
  return {
    modelVersion: RECOMMENDATION_MODEL_VERSION,
    source,
    page,
    items: shows.map((show, index) =>
      compactObject({
        ...getShowIdentity(show),
        score: getRecommendationScore(show),
        position: index + 1,
        scoreBreakdown: show.scoreBreakdown || {},
      }),
    ),
  };
}

export function buildRecommendationFeedbackPayload(
  show,
  action,
  { rating, sourcePage } = {},
) {
  return compactObject({
    tvShowId: show._id,
    tmdbId: show.tmdbId,
    action,
    rating,
    metadata: compactObject({
      sourcePage,
      ...getScoreMetadata(show),
    }),
  });
}
