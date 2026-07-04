export function getLibraryCardStatusText(show) {
  if (show.status === "watched") {
    return `Your Rating: ${show.userRating}`;
  }

  const matchScore = show.matchScore ?? show.recommendationScore;

  if (matchScore === undefined || matchScore === null) return null;

  return `Match Score: ${matchScore}%`;
}

export function getSuggestionBadgeText(show) {
  const rating = Number(show.tmdbRating);

  if (!Number.isFinite(rating) || rating <= 0) {
    return "TMDB --";
  }

  return `TMDB ${rating.toFixed(1)}`;
}

export function getLibraryBadgeText(show) {
  if (show.status === "watched") {
    return `${show.userRating}/10`;
  }

  return getSuggestionBadgeText(show);
}

export function getLibraryActionLabels(status) {
  if (status === "watched") {
    return [
      "Move to Currently Watching",
      "Move to Want to Watch",
      "Change Rating",
      "Delete",
    ];
  }

  if (status === "watching") {
    return [
      "Move to Want to Watch",
      "Move to Watched",
      "Delete",
    ];
  }

  return [
    "Move to Currently Watching",
    "Move to Watched",
    "Delete",
  ];
}
