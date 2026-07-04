const metadataFields = [
  "tmdbId",
  "tmdbRating",
  "popularity",
  "originalLanguage",
  "originCountry",
  "voteCount",
  "overview",
  "genres",
  "year",
  "imageUrl",
];

const normalizeTitle = (title = "") =>
  title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const hasValue = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value !== undefined && value !== null && value !== "";
};

const normalizeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const sameYear = (show, candidate) => {
  if (!show.year || !candidate.year) {
    return false;
  }

  return Number(show.year) === Number(candidate.year);
};

const isCompatibleTitle = (showTitle, candidateTitle) => {
  const normalizedShowTitle = normalizeTitle(showTitle);
  const normalizedCandidateTitle = normalizeTitle(candidateTitle);

  return (
    normalizedCandidateTitle === normalizedShowTitle ||
    normalizedCandidateTitle.includes(normalizedShowTitle) ||
    normalizedShowTitle.includes(normalizedCandidateTitle)
  );
};

function needsTMDBMetadataBackfill(show) {
  return metadataFields.some((field) => !hasValue(show[field]));
}

function selectTMDBSearchMatch(show, candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return {
      status: "not_found",
      reason: "No TMDB search results",
    };
  }

  const exactMatches = candidates.filter(
    (candidate) =>
      normalizeTitle(candidate.title) === normalizeTitle(show.title) &&
      sameYear(show, candidate),
  );

  if (exactMatches.length === 1) {
    return {
      status: "matched",
      candidate: exactMatches[0],
    };
  }

  if (exactMatches.length > 1) {
    return {
      status: "ambiguous",
      candidates: exactMatches,
      reason: "Multiple exact title/year matches",
    };
  }

  const compatibleYearMatches = candidates.filter(
    (candidate) =>
      sameYear(show, candidate) &&
      isCompatibleTitle(show.title, candidate.title),
  );

  if (compatibleYearMatches.length === 1) {
    return {
      status: "matched",
      candidate: compatibleYearMatches[0],
    };
  }

  if (compatibleYearMatches.length > 1) {
    return {
      status: "ambiguous",
      candidates: compatibleYearMatches,
      reason: "Multiple compatible title/year matches",
    };
  }

  return {
    status: "not_found",
    reason: "No safe title/year match",
  };
}

function buildTMDBMetadataUpdate(tmdbShow, existingShow = {}) {
  const update = {};
  const tmdbId = normalizeNumber(tmdbShow.tmdbId);
  const tmdbRating = normalizeNumber(tmdbShow.tmdbRating);
  const popularity = normalizeNumber(tmdbShow.popularity);
  const voteCount = normalizeNumber(tmdbShow.voteCount);
  const year = normalizeNumber(tmdbShow.year);

  if (
    !hasValue(existingShow.genres) &&
    Array.isArray(tmdbShow.genres) &&
    tmdbShow.genres.length > 0
  ) {
    update.genres = tmdbShow.genres;
  }

  if (!hasValue(existingShow.year) && year) {
    update.year = year;
  }

  if (!hasValue(existingShow.imageUrl) && hasValue(tmdbShow.imageUrl)) {
    update.imageUrl = tmdbShow.imageUrl;
  }

  if (!hasValue(existingShow.overview) && hasValue(tmdbShow.overview)) {
    update.overview = tmdbShow.overview;
  }

  if (popularity !== null) {
    update.popularity = popularity;
  }

  if (tmdbRating !== null) {
    update.tmdbRating = tmdbRating;
  }

  if (tmdbId !== null) {
    update.tmdbId = tmdbId;
  }

  if (hasValue(tmdbShow.originalLanguage)) {
    update.originalLanguage = tmdbShow.originalLanguage;
  }

  if (Array.isArray(tmdbShow.originCountry) && tmdbShow.originCountry.length > 0) {
    update.originCountry = tmdbShow.originCountry;
  }

  if (voteCount !== null) {
    update.voteCount = voteCount;
  }

  return update;
}

function parseBackfillArgs(args) {
  const options = {
    apply: false,
    dryRun: true,
    limit: null,
    title: "",
  };

  for (const arg of args) {
    if (arg === "--apply") {
      options.apply = true;
      options.dryRun = false;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const limit = Number(arg.slice("--limit=".length));

      if (!Number.isInteger(limit) || limit <= 0) {
        throw new Error("--limit must be a positive integer");
      }

      options.limit = limit;
      continue;
    }

    if (arg.startsWith("--title=")) {
      options.title = arg.slice("--title=".length).trim();
    }
  }

  return options;
}

module.exports = {
  buildTMDBMetadataUpdate,
  needsTMDBMetadataBackfill,
  parseBackfillArgs,
  selectTMDBSearchMatch,
};
