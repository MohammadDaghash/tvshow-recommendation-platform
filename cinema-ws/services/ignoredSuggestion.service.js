const cleanObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  );

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;

  const number = Number(value);

  return Number.isFinite(number) ? number : undefined;
};

const toOptionalString = (value) => {
  if (value === undefined || value === null || value === "") return undefined;

  return String(value);
};

const cleanStringList = (value) => {
  if (!Array.isArray(value)) return undefined;

  const cleanValues = value.map(toOptionalString).filter(Boolean);

  return cleanValues.length ? cleanValues : undefined;
};

const compactMetadata = (metadata = {}) =>
  cleanObject({
    genres: cleanStringList(metadata.genres),
    tmdbRating: toOptionalNumber(metadata.tmdbRating),
    popularity: toOptionalNumber(metadata.popularity),
    year: toOptionalNumber(metadata.year),
    originalLanguage: toOptionalString(metadata.originalLanguage),
    originCountry: cleanStringList(metadata.originCountry),
    voteCount: toOptionalNumber(metadata.voteCount),
  });

const buildIgnoredSuggestionUpdate = ({
  userId,
  tmdbId,
  title,
  metadata = {},
}) => {
  const cleanMetadata = compactMetadata(metadata);

  return cleanObject({
    user: userId,
    tmdbId: Number(tmdbId),
    title,
    genres: cleanMetadata.genres,
    tmdbRating: cleanMetadata.tmdbRating,
    popularity: cleanMetadata.popularity,
    year: cleanMetadata.year,
    originalLanguage: cleanMetadata.originalLanguage,
    originCountry: cleanMetadata.originCountry,
    voteCount: cleanMetadata.voteCount,
    metadata: cleanMetadata,
  });
};

module.exports = {
  buildIgnoredSuggestionUpdate,
};
