const cleanMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
};

const getActorRole = (user) => user?.role || "user";

const getDataScope = (user) => {
  return user?.role === "admin" ? "demo" : "private";
};

const shouldRecordTasteSignals = (user) => {
  return Boolean(user?._id);
};

const shouldApplySuggestionToCatalog = (user) => {
  return user?.role === "admin";
};

const withRecommendationSignalContext = (user, metadata = {}) => {
  return {
    ...cleanMetadata(metadata),
    actorRole: getActorRole(user),
    dataScope: getDataScope(user),
  };
};

module.exports = {
  shouldApplySuggestionToCatalog,
  shouldRecordTasteSignals,
  withRecommendationSignalContext,
};
