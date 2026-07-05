const TEXT_FIELDS = [
  "sourcePage",
  "modelVersion",
  "actionType",
  "previousStatus",
  "nextStatus",
];

const NUMBER_FIELDS = {
  position: {
    min: 0,
  },
  recommendationScore: {
    min: 0,
    max: 100,
  },
  matchScore: {
    min: 0,
    max: 100,
  },
  tmdbRating: {
    min: 0,
    max: 10,
  },
};

const STATUS_VALUES = new Set(["watched", "want", "watching", "none"]);

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasValue = (value) => {
  if (typeof value === "string") return value.trim().length > 0;

  return value !== undefined && value !== null && value !== "";
};

const getRecordId = (record) => record._id?.toString?.() || record._id;

const toBoundedNumber = (value, { min = -Infinity, max = Infinity } = {}) => {
  if (value === undefined || value === null || value === "") return undefined;

  const number = Number(value);

  if (!Number.isFinite(number) || number < min || number > max) {
    return undefined;
  }

  return number;
};

function buildSignalBackfillUpdate(record = {}, { includeStatus = false } = {}) {
  const metadata = isPlainObject(record.metadata) ? record.metadata : {};
  const update = {};

  for (const field of TEXT_FIELDS) {
    if (!hasValue(record[field]) && hasValue(metadata[field])) {
      update[field] = metadata[field];
    }
  }

  for (const [field, bounds] of Object.entries(NUMBER_FIELDS)) {
    if (hasValue(record[field])) continue;

    const number = toBoundedNumber(metadata[field], bounds);

    if (number !== undefined) {
      update[field] = number;
    }
  }

  if (
    includeStatus &&
    !hasValue(record.status) &&
    STATUS_VALUES.has(metadata.nextStatus)
  ) {
    update.status = metadata.nextStatus;
  }

  return update;
}

function summarizeSignalBackfill(records = [], options = {}) {
  const updates = records
    .map((record) => ({
      id: getRecordId(record),
      update: buildSignalBackfillUpdate(record, options),
    }))
    .filter((entry) => Object.keys(entry.update).length > 0);

  return {
    scanned: records.length,
    wouldUpdate: updates.length,
    skipped: records.length - updates.length,
    updates,
  };
}

function parseSignalBackfillArgs(args) {
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
  buildSignalBackfillUpdate,
  parseSignalBackfillArgs,
  summarizeSignalBackfill,
};
