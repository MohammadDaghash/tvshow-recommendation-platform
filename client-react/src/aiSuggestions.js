const getSuggestionScore = (show) => {
  return show.matchScore ?? show.recommendationScore ?? 0;
};

export const getTopAISuggestions = (
  suggestions = [],
  ignoredSuggestionIds = [],
  limit = 20,
) => {
  const ignoredIds = new Set(ignoredSuggestionIds);

  return [...suggestions]
    .filter((show) => !ignoredIds.has(show.tmdbId))
    .sort((a, b) => getSuggestionScore(b) - getSuggestionScore(a))
    .slice(0, limit);
};
