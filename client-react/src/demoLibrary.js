const normalizeDemoStatus = (show) => {
  if (show.status === "watched" || show.watched === true) {
    return "watched";
  }

  if (show.status === "watching") {
    return "watching";
  }

  return "want";
};

const byRecommendationScore = (left, right) => {
  return (right.recommendationScore || 0) - (left.recommendationScore || 0);
};

export function buildDemoLibrary(recommendations, demoWatchingCount = 2) {
  const normalizedShows = recommendations.map((show) => ({
    ...show,
    status: normalizeDemoStatus(show),
    watched: normalizeDemoStatus(show) === "watched",
  }));

  const watchedShows = normalizedShows
    .filter((show) => show.status === "watched")
    .sort((a, b) => (b.userRating || 0) - (a.userRating || 0));

  const explicitWatchingShows = normalizedShows.filter(
    (show) => show.status === "watching",
  );

  const wantCandidates = normalizedShows
    .filter((show) => show.status === "want")
    .sort(byRecommendationScore);

  const derivedWatchingShows =
    explicitWatchingShows.length > 0
      ? explicitWatchingShows.sort(byRecommendationScore)
      : wantCandidates.slice(0, demoWatchingCount).map((show) => ({
          ...show,
          status: "watching",
        }));

  const watchingIds = new Set(derivedWatchingShows.map((show) => show._id));
  const wantShows = wantCandidates.filter((show) => !watchingIds.has(show._id));

  return {
    wantShows,
    watchedShows,
    watchingShows: derivedWatchingShows,
  };
}
