const VALID_STATUSES = new Set(["watched", "want", "watching"]);

const normalizeId = (value) => {
  if (!value) return "";

  return value.toString();
};

const buildUserShowUpdate = (status, { userRating } = {}) => {
  if (!VALID_STATUSES.has(status)) {
    throw new Error("Invalid watch status");
  }

  if (status !== "watched") {
    return {
      status,
      userRating: null,
    };
  }

  const rating = Number(userRating);

  if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
    throw new Error("Rating is required and must be between 0 and 10");
  }

  return {
    status,
    userRating: rating,
  };
};

const decorateShowsWithUserState = (tvShows, userStates = []) => {
  const stateByShowId = new Map(
    userStates.map((state) => [normalizeId(state.tvShow), state]),
  );

  return tvShows.map((tvShow) => {
    const show = typeof tvShow.toObject === "function" ? tvShow.toObject() : tvShow;
    const state = stateByShowId.get(normalizeId(show._id));
    const status = state?.status || "none";

    return {
      ...show,
      watched: status === "watched",
      userRating: status === "watched" ? state.userRating : null,
      status,
    };
  });
};

const decorateShowsWithCatalogState = (tvShows) => {
  return tvShows.map((tvShow) => {
    const show = typeof tvShow.toObject === "function" ? tvShow.toObject() : tvShow;
    const status = show.watched ? "watched" : "want";

    return {
      ...show,
      status,
    };
  });
};

module.exports = {
  buildUserShowUpdate,
  decorateShowsWithCatalogState,
  decorateShowsWithUserState,
};
