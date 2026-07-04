const legacyTMDBRatingsByTitle = {
  "13 reasons why": 7.5,
  "2 broke girls": 7.2,
  "abbott elementary": 7.4,
  "alrawabi school": 7.5,
  "attack on titan": 8.7,
  "breaking bad": 8.9,
  "bridgerton": 8.1,
  "brooklyn nine-nine": 8.2,
  "dahmer": 8.0,
  "elite": 8.0,
  "emily in paris": 7.6,
  "euphoria": 8.3,
  "fellow travelers": 8.4,
  "friends": 8.4,
  "game of thrones": 8.5,
  "gilmore girls": 7.9,
  "ginny & georgia": 8.0,
  "gossip girl": 8.2,
  "heated rivalry": 8.8,
  "heartstopper": 8.6,
  "how i met your father": 6.5,
  "how i met your mother": 8.1,
  "how to get away with murder": 7.8,
  "modern family": 7.9,
  "money heist": 8.2,
  "never have i ever": 8.1,
  "overcompensating": 7.3,
  "peaky blinders": 8.5,
  "prison break": 8.1,
  "queen charlotte": 8.0,
  "rick and morty": 8.7,
  "sex education": 8.2,
  "smiley": 8.2,
  "squid game": 7.9,
  "stranger things": 8.6,
  "the big bang theory": 7.9,
  "the office": 8.6,
  "uncoupled": 6.4,
  "wednesday": 8.3,
  "you": 8.0,
  "young sheldon": 8.0,
};

const normalizeTitleKey = (title = "") => title.trim().toLowerCase();

function normalizeTMDBRatingValue(value) {
  const rating = Number(value);

  if (!Number.isFinite(rating) || rating <= 0) {
    return null;
  }

  return rating > 10 ? rating / 10 : rating;
}

function getTMDBRatingValue(show) {
  const directRating =
    normalizeTMDBRatingValue(show.tmdbRating) ??
    normalizeTMDBRatingValue(show.voteAverage) ??
    normalizeTMDBRatingValue(show.vote_average) ??
    normalizeTMDBRatingValue(show.scoreBreakdown?.tmdbRating);

  if (directRating) {
    return directRating;
  }

  return legacyTMDBRatingsByTitle[normalizeTitleKey(show.title)] ?? null;
}

export function getLibraryCardStatusText(show) {
  if (show.status === "watched") {
    return `Your Rating: ${show.userRating}`;
  }

  const matchScore = show.matchScore ?? show.recommendationScore;

  if (matchScore === undefined || matchScore === null) return null;

  return `Match Score: ${matchScore}%`;
}

export function getSuggestionBadgeText(show) {
  const rating = getTMDBRatingValue(show);

  if (!rating) {
    return "TMDB --";
  }

  return `TMDB ${rating.toFixed(1)}`;
}

export function getLibraryBadgeText(show) {
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
