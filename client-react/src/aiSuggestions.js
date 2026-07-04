const getSuggestionScore = (show) => {
  return show.matchScore ?? show.recommendationScore ?? 0;
};

const listStatuses = new Set(["watched", "want", "watching"]);

const normalizeTitle = (title) => {
  return String(title || "")
    .trim()
    .toLowerCase();
};

const getSuggestionKey = (show) => {
  if (show.tmdbId) return `tmdb:${show.tmdbId}`;

  const title = normalizeTitle(show.title);
  return title ? `title:${title}` : "";
};

const hasListStatus = (show) => {
  return listStatuses.has(show.status) || show.watched === true;
};

const toSuggestionCandidate = (show) => {
  const score = getSuggestionScore(show);

  return {
    ...show,
    isAISuggestion: true,
    matchScore: score,
    recommendationScore: show.recommendationScore ?? score,
  };
};

export const buildAISuggestionCandidates = ({
  fallbackSuggestions = [],
  mlSuggestions = [],
  recommendations = [],
} = {}) => {
  const blockedKeys = new Set(
    recommendations.filter(hasListStatus).map(getSuggestionKey).filter(Boolean),
  );
  const seenKeys = new Set();
  const candidates = [];

  [...mlSuggestions, ...fallbackSuggestions].forEach((show) => {
    const key = getSuggestionKey(show);

    if (!key || blockedKeys.has(key) || seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    candidates.push(toSuggestionCandidate(show));
  });

  return candidates;
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
