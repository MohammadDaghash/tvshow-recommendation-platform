const BACKFILL_FIELDS = {
  genres: {
    type: "stringList",
  },
  tmdbRating: {
    type: "number",
    min: 0,
    max: 10,
  },
  popularity: {
    type: "number",
    min: 0,
  },
  year: {
    type: "number",
  },
  originalLanguage: {
    type: "string",
  },
  originCountry: {
    type: "stringList",
  },
  voteCount: {
    type: "number",
    min: 0,
  },
};

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;

  return value !== undefined && value !== null && value !== "";
};

const getRecordId = (record) => record._id?.toString?.() || record._id;

const normalizeTitle = (title) =>
  String(title || "")
    .trim()
    .toLowerCase();

const toId = (value) => value?.toString?.() || String(value || "");

const toNumber = (value, { min = -Infinity, max = Infinity } = {}) => {
  if (!hasValue(value)) return undefined;

  const number = Number(value);

  if (!Number.isFinite(number) || number < min || number > max) {
    return undefined;
  }

  return number;
};

const toStringValue = (value) => {
  if (!hasValue(value)) return undefined;

  return String(value).trim();
};

const toStringList = (value) => {
  if (!Array.isArray(value)) return undefined;

  const list = value.map(toStringValue).filter(Boolean);

  return list.length ? [...new Set(list)] : undefined;
};

const cleanField = (value, config) => {
  if (config.type === "number") return toNumber(value, config);
  if (config.type === "string") return toStringValue(value);
  if (config.type === "stringList") return toStringList(value);

  return undefined;
};

const getMetadata = (record) =>
  isPlainObject(record?.metadata) ? record.metadata : {};

const getCleanRecordField = (record, field, config) => {
  const topLevelValue = cleanField(record?.[field], config);

  if (topLevelValue !== undefined) return topLevelValue;

  return cleanField(getMetadata(record)[field], config);
};

const isIgnoredSignal = (signal) => {
  return signal?.eventType === "suggestion_ignored" || signal?.action === "ignored";
};

const signalMatchesIgnoredSuggestion = (ignoredSuggestion, signal) => {
  if (!isIgnoredSignal(signal)) return false;
  if (toId(ignoredSuggestion.user) !== toId(signal.user)) return false;

  const ignoredTmdbId = toNumber(ignoredSuggestion.tmdbId);
  const signalTmdbId = toNumber(signal.tmdbId);

  if (ignoredTmdbId !== undefined && signalTmdbId !== undefined) {
    return ignoredTmdbId === signalTmdbId;
  }

  const ignoredTitle = normalizeTitle(ignoredSuggestion.title);
  const signalTitle = normalizeTitle(signal.title || getMetadata(signal).title);

  return Boolean(ignoredTitle && signalTitle && ignoredTitle === signalTitle);
};

const findSignalValue = (signals, field, config) => {
  for (const signal of signals) {
    const value = getCleanRecordField(signal, field, config);

    if (value !== undefined) return value;
  }

  return undefined;
};

function buildIgnoredSuggestionMetadataUpdate(
  ignoredSuggestion = {},
  matchingSignals = [],
) {
  const update = {};
  const metadata = {};

  for (const [field, config] of Object.entries(BACKFILL_FIELDS)) {
    const existingValue = getCleanRecordField(ignoredSuggestion, field, config);
    const signalValue = findSignalValue(matchingSignals, field, config);
    const finalValue = existingValue !== undefined ? existingValue : signalValue;

    if (finalValue === undefined) continue;

    metadata[field] = finalValue;

    if (existingValue === undefined && signalValue !== undefined) {
      update[field] = signalValue;
    }
  }

  if (Object.keys(metadata).length > 0 && Object.keys(update).length > 0) {
    update.metadata = metadata;
  }

  return update;
}

function summarizeIgnoredSuggestionBackfill(
  ignoredSuggestions = [],
  signalRecords = [],
) {
  const updates = ignoredSuggestions
    .map((ignoredSuggestion) => {
      const matchingSignals = signalRecords.filter((signal) =>
        signalMatchesIgnoredSuggestion(ignoredSuggestion, signal),
      );

      return {
        id: getRecordId(ignoredSuggestion),
        update: buildIgnoredSuggestionMetadataUpdate(
          ignoredSuggestion,
          matchingSignals,
        ),
      };
    })
    .filter((entry) => Object.keys(entry.update).length > 0);

  return {
    scanned: ignoredSuggestions.length,
    wouldUpdate: updates.length,
    skipped: ignoredSuggestions.length - updates.length,
    updates,
  };
}

function parseIgnoredSuggestionBackfillArgs(args) {
  const options = {
    apply: false,
    dryRun: true,
    limit: null,
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
    }
  }

  return options;
}

module.exports = {
  buildIgnoredSuggestionMetadataUpdate,
  parseIgnoredSuggestionBackfillArgs,
  summarizeIgnoredSuggestionBackfill,
};
