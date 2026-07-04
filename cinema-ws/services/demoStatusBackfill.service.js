const isExplicitWatching = (show) => show.status === "watching";

const isWatched = (show) => show.status === "watched" || show.watched === true;

const isBackfillCandidate = (show) => {
  return !isWatched(show) && !isExplicitWatching(show);
};

const getRankScore = (show) => {
  return show.recommendationScore || show.popularity || show.tmdbRating || 0;
};

const selectDemoWatchingBackfillCandidates = (
  shows = [],
  { limit = 2 } = {},
) => {
  if (shows.some(isExplicitWatching)) {
    return [];
  }

  return shows
    .filter(isBackfillCandidate)
    .sort((left, right) => getRankScore(right) - getRankScore(left))
    .slice(0, limit);
};

const buildDemoWatchingStatusUpdate = () => ({
  status: "watching",
  watched: false,
  userRating: null,
});

module.exports = {
  buildDemoWatchingStatusUpdate,
  selectDemoWatchingBackfillCandidates,
};
