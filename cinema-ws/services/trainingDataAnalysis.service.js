const DEFAULT_MIN_POSITIVE_EXAMPLES = 20;
const DEFAULT_MIN_NEGATIVE_EXAMPLES = 20;
const DEFAULT_MIN_SUPERVISED_LABEL_RATE = 0.05;

const round = (value) => Number(value.toFixed(2));

const rate = (count, total) => {
  if (!total) return 0;

  return round(count / total);
};

const percentage = (value) => `${Math.round(value * 100)}%`;

const isPositiveRow = (row) => row.wasAccepted || row.wasRated;

const isNegativeRow = (row) => row.wasIgnored;

const isEngagedRow = (row) =>
  row.wasOpened || row.wasAccepted || row.wasIgnored || row.wasRated;

const hasSupervisedLabel = (row) => isPositiveRow(row) || isNegativeRow(row);

const summarizeRows = (rows) => {
  const rowCount = rows.length;
  const positiveCount = rows.filter(isPositiveRow).length;
  const negativeCount = rows.filter(isNegativeRow).length;
  const supervisedLabelCount = rows.filter(hasSupervisedLabel).length;
  const engagementCount = rows.filter(isEngagedRow).length;
  const openedCount = rows.filter((row) => row.wasOpened).length;
  const acceptedCount = rows.filter((row) => row.wasAccepted).length;
  const ignoredCount = rows.filter((row) => row.wasIgnored).length;
  const ratedRows = rows.filter((row) => row.wasRated && row.rating !== null);
  const ratingTotal = ratedRows.reduce(
    (sum, row) => sum + Number(row.rating || 0),
    0,
  );

  return {
    rowCount,
    engagementCount,
    engagementRate: rate(engagementCount, rowCount),
    supervisedLabelCount,
    supervisedLabelRate: rate(supervisedLabelCount, rowCount),
    unlabeledCount: rowCount - supervisedLabelCount,
    unlabeledRate: rate(rowCount - supervisedLabelCount, rowCount),
    positiveCount,
    negativeCount,
    openedCount,
    acceptedCount,
    ignoredCount,
    ratedCount: ratedRows.length,
    averageRating: ratedRows.length ? round(ratingTotal / ratedRows.length) : null,
  };
};

const calculateMetadataCoverage = (rows) => {
  const rowCount = rows.length;
  const genreRows = rows.filter((row) => (row.genres || []).length > 0).length;
  const tmdbRatingRows = rows.filter(
    (row) => row.tmdbRating !== null && row.tmdbRating !== undefined,
  ).length;

  return {
    genreRows,
    genreCoverage: rate(genreRows, rowCount),
    tmdbRatingRows,
    tmdbRatingCoverage: rate(tmdbRatingRows, rowCount),
  };
};

const createBucket = (labelField, label) => ({
  [labelField]: label,
  rows: 0,
  positiveCount: 0,
  negativeCount: 0,
  openedCount: 0,
});

const addRowToBucket = (bucket, row) => {
  bucket.rows += 1;
  if (isPositiveRow(row)) bucket.positiveCount += 1;
  if (isNegativeRow(row)) bucket.negativeCount += 1;
  if (row.wasOpened) bucket.openedCount += 1;
};

const finalizeBucket = (bucket) => ({
  ...bucket,
  supervisedLabelRate: rate(
    bucket.positiveCount + bucket.negativeCount,
    bucket.rows,
  ),
  positiveRate: rate(bucket.positiveCount, bucket.rows),
  negativeRate: rate(bucket.negativeCount, bucket.rows),
});

const compareBuckets = (left, right) => {
  const rowDifference = right.rows - left.rows;

  if (rowDifference !== 0) return rowDifference;

  return String(left.genre || left.modelVersion).localeCompare(
    String(right.genre || right.modelVersion),
  );
};

const analyzeGenres = (rows, topGenreLimit) => {
  const buckets = new Map();

  for (const row of rows) {
    for (const genre of row.genres || []) {
      if (!buckets.has(genre)) {
        buckets.set(genre, createBucket("genre", genre));
      }

      addRowToBucket(buckets.get(genre), row);
    }
  }

  return [...buckets.values()]
    .map(finalizeBucket)
    .sort(compareBuckets)
    .slice(0, topGenreLimit);
};

const analyzeModelVersions = (rows) => {
  const buckets = new Map();

  for (const row of rows) {
    const modelVersion = row.modelVersion || "unknown";

    if (!buckets.has(modelVersion)) {
      buckets.set(modelVersion, createBucket("modelVersion", modelVersion));
    }

    addRowToBucket(buckets.get(modelVersion), row);
  }

  return [...buckets.values()].map(finalizeBucket).sort(compareBuckets);
};

const buildReadiness = (summary, options) => {
  const minPositiveExamples =
    options.minPositiveExamples || DEFAULT_MIN_POSITIVE_EXAMPLES;
  const minNegativeExamples =
    options.minNegativeExamples || DEFAULT_MIN_NEGATIVE_EXAMPLES;
  const minSupervisedLabelRate =
    options.minSupervisedLabelRate || DEFAULT_MIN_SUPERVISED_LABEL_RATE;
  const reasons = [];

  if (summary.positiveCount < minPositiveExamples) {
    reasons.push(
      `Need at least ${minPositiveExamples} positive examples; found ${summary.positiveCount}.`,
    );
  }

  if (summary.negativeCount < minNegativeExamples) {
    reasons.push(
      `Need at least ${minNegativeExamples} negative examples; found ${summary.negativeCount}.`,
    );
  }

  if (summary.supervisedLabelRate < minSupervisedLabelRate) {
    reasons.push(
      `Need supervised label rate of at least ${percentage(
        minSupervisedLabelRate,
      )}; found ${percentage(summary.supervisedLabelRate)}.`,
    );
  }

  return {
    isReadyForML: reasons.length === 0,
    status: reasons.length === 0 ? "ready" : "not_ready",
    reasons,
  };
};

function analyzeTrainingDataExport(exportData, options = {}) {
  const rows = exportData.rows || [];
  const topGenreLimit =
    Number.isInteger(options.topGenreLimit) && options.topGenreLimit > 0
      ? options.topGenreLimit
      : 10;
  const summary = summarizeRows(rows);

  return {
    summary,
    metadataCoverage: calculateMetadataCoverage(rows),
    readiness: buildReadiness(summary, options),
    topGenres: analyzeGenres(rows, topGenreLimit),
    modelVersions: analyzeModelVersions(rows),
  };
}

function parseTrainingAnalysisArgs(args) {
  const options = {
    format: args.includes("--json") ? "json" : "text",
    topGenreLimit: 10,
  };

  for (const arg of args) {
    if (!arg.startsWith("--top=")) continue;

    const topGenreLimit = Number(arg.slice("--top=".length));

    if (!Number.isInteger(topGenreLimit) || topGenreLimit <= 0) {
      throw new Error("--top must be a positive integer");
    }

    options.topGenreLimit = topGenreLimit;
  }

  return options;
}

module.exports = {
  analyzeTrainingDataExport,
  parseTrainingAnalysisArgs,
};
