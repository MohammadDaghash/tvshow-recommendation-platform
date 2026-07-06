const round = (value, places = 2) => Number(value.toFixed(places));

const isPositiveRow = (row) => row.wasAccepted || row.wasRated;

const isNegativeRow = (row) => row.wasIgnored;

const hasLabel = (row) => isPositiveRow(row) || isNegativeRow(row);

const rate = (count, total) => {
  if (!total) return 0;

  return round(count / total);
};

const average = (values) => {
  const cleanValues = values.filter((value) => Number.isFinite(value));

  if (cleanValues.length === 0) return null;

  return round(
    cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length,
  );
};

const wilsonInterval = (successes, total, z = 1.96) => {
  if (total <= 0) {
    return {
      estimate: 0,
      lower: 0,
      upper: 0,
    };
  }

  const pHat = successes / total;
  const zSquared = z * z;
  const denominator = 1 + zSquared / total;
  const center = (pHat + zSquared / (2 * total)) / denominator;
  const margin =
    (z *
      Math.sqrt((pHat * (1 - pHat) + zSquared / (4 * total)) / total)) /
    denominator;

  return {
    estimate: round(pHat),
    lower: round(Math.max(0, center - margin)),
    upper: round(Math.min(1, center + margin)),
  };
};

const createBucket = (modelVersion) => ({
  modelVersion,
  rows: 0,
  labelledRows: 0,
  positiveCount: 0,
  negativeCount: 0,
  openedCount: 0,
  acceptedCount: 0,
  ignoredCount: 0,
  ratedCount: 0,
  scores: [],
  ranks: [],
  ratings: [],
});

const addRowToBucket = (bucket, row) => {
  bucket.rows += 1;

  if (hasLabel(row)) bucket.labelledRows += 1;
  if (isPositiveRow(row)) bucket.positiveCount += 1;
  if (isNegativeRow(row)) bucket.negativeCount += 1;
  if (row.wasOpened) bucket.openedCount += 1;
  if (row.wasAccepted) bucket.acceptedCount += 1;
  if (row.wasIgnored) bucket.ignoredCount += 1;
  if (row.wasRated) bucket.ratedCount += 1;

  const score = Number(row.score);
  const rank = Number(row.rank);
  const rating = row.wasRated ? Number(row.rating) : NaN;

  if (Number.isFinite(score)) bucket.scores.push(score);
  if (Number.isFinite(rank)) bucket.ranks.push(rank);
  if (Number.isFinite(rating)) bucket.ratings.push(rating);
};

const finalizeBucket = (bucket) => ({
  modelVersion: bucket.modelVersion,
  rows: bucket.rows,
  labelledRows: bucket.labelledRows,
  positiveCount: bucket.positiveCount,
  negativeCount: bucket.negativeCount,
  openedCount: bucket.openedCount,
  acceptedCount: bucket.acceptedCount,
  ignoredCount: bucket.ignoredCount,
  ratedCount: bucket.ratedCount,
  averageRating: average(bucket.ratings),
  averageScore: average(bucket.scores),
  averageRank: average(bucket.ranks),
  labelRate: rate(bucket.labelledRows, bucket.rows),
  positiveRate: rate(bucket.positiveCount, bucket.rows),
  negativeRate: rate(bucket.negativeCount, bucket.rows),
  positiveLabelRate: rate(bucket.positiveCount, bucket.labelledRows),
  openRate: rate(bucket.openedCount, bucket.rows),
  acceptRate: rate(bucket.acceptedCount, bucket.rows),
  ignoreRate: rate(bucket.ignoredCount, bucket.rows),
  positiveLabelWilsonInterval: wilsonInterval(
    bucket.positiveCount,
    bucket.labelledRows,
  ),
});

const compareModels = (left, right) => {
  const outcomeDifference = right.positiveLabelRate - left.positiveLabelRate;

  if (outcomeDifference !== 0) return outcomeDifference;

  const rowDifference = right.rows - left.rows;

  if (rowDifference !== 0) return rowDifference;

  return String(left.modelVersion).localeCompare(String(right.modelVersion));
};

const buildComparison = (model, baseline) => ({
  modelVersion: model.modelVersion,
  baselineModelVersion: baseline.modelVersion,
  positiveLabelRateDelta: round(
    model.positiveLabelRate - baseline.positiveLabelRate,
  ),
  acceptRateDelta: round(model.acceptRate - baseline.acceptRate),
  ignoreRateDelta: round(model.ignoreRate - baseline.ignoreRate),
  averageScoreDelta:
    model.averageScore === null || baseline.averageScore === null
      ? null
      : round(model.averageScore - baseline.averageScore),
});

function buildModelComparisonReport(exportData = {}, options = {}) {
  const rows = exportData.rows || [];
  const buckets = new Map();

  for (const row of rows) {
    const modelVersion = row.modelVersion || "unknown";

    if (!buckets.has(modelVersion)) {
      buckets.set(modelVersion, createBucket(modelVersion));
    }

    addRowToBucket(buckets.get(modelVersion), row);
  }

  const models = [...buckets.values()].map(finalizeBucket).sort(compareModels);
  const baseline =
    models.find((model) => model.modelVersion === options.baselineModelVersion) ||
    models[models.length - 1] ||
    null;
  const comparisons =
    baseline && models.length > 1
      ? models
          .filter((model) => model.modelVersion !== baseline.modelVersion)
          .map((model) => buildComparison(model, baseline))
      : [];

  return {
    summary: {
      rowCount: rows.length,
      modelCount: models.length,
      comparisonReady: models.length > 1,
      baselineModelVersion: baseline?.modelVersion || null,
    },
    models,
    comparisons,
  };
}

function parseModelComparisonArgs(args) {
  const options = {
    baselineModelVersion: null,
    format: args.includes("--json") ? "json" : "text",
    limit: Number.MAX_SAFE_INTEGER,
  };

  for (const arg of args) {
    if (arg.startsWith("--baseline=")) {
      options.baselineModelVersion = arg.slice("--baseline=".length);
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
  buildModelComparisonReport,
  parseModelComparisonArgs,
};
