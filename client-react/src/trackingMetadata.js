const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  );

export const getLibraryActionType = (status) => {
  if (status === "watched") return "move_to_watched";
  if (status === "watching") return "move_to_currently_watching";
  if (status === "want") return "move_to_want_to_watch";
  if (status === "none") return "remove_from_library";

  return "status_changed";
};

export const buildShowTrackingMetadata = (show = {}, metadata = {}) =>
  compactObject({
    ...metadata,
    matchScore: show.matchScore,
    recommendationScore: show.recommendationScore,
    tmdbRating: show.tmdbRating,
    userRating: show.userRating,
    status: show.status,
    genres: show.genres,
    originalLanguage: show.originalLanguage,
    originCountry: show.originCountry,
    voteCount: show.voteCount,
  });

export const buildLibraryTransitionMetadata = (
  show = {},
  {
    sourcePage,
    previousStatus = show.status || "none",
    nextStatus,
    actionType = getLibraryActionType(nextStatus),
    rating,
  } = {},
) =>
  buildShowTrackingMetadata(show, {
    sourcePage,
    previousStatus,
    nextStatus,
    actionType,
    rating,
  });
