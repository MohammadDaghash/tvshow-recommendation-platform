const VALID_STATUSES = new Set(["watched", "want", "watching"]);

const buildCatalogShowUpdate = (status, { userRating } = {}) => {
  if (!VALID_STATUSES.has(status)) {
    throw new Error("Invalid watch status");
  }

  if (status !== "watched") {
    return {
      status,
      watched: false,
      userRating: null,
    };
  }

  const rating = Number(userRating);

  if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
    throw new Error("Rating is required and must be between 0 and 10");
  }

  return {
    status,
    watched: true,
    userRating: rating,
  };
};

module.exports = {
  buildCatalogShowUpdate,
};
