#!/usr/bin/env node

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const RecommendationFeedback = require("../models/RecommendationFeedback");
const RecommendationLog = require("../models/RecommendationLog");
const TVShow = require("../models/TVShow");
const UserInteraction = require("../models/UserInteraction");
const {
  buildModelComparisonReport,
  parseModelComparisonArgs,
} = require("../services/modelComparison.service");
const { buildTrainingDataExport } = require("../services/trainingDataExport.service");

const toPlainRecord = (record) => ({
  ...record,
  _id: record._id?.toString?.() || record._id,
  user: record.user?.toString?.() || record.user,
  tvShow: record.tvShow?.toString?.() || record.tvShow,
  recommendationLog:
    record.recommendationLog?.toString?.() || record.recommendationLog,
  items: Array.isArray(record.items)
    ? record.items.map((item) => ({
        ...item,
        tvShow: item.tvShow?.toString?.() || item.tvShow,
      }))
    : record.items,
});

const fetchSnapshot = async () => {
  const [tvShows, recommendationLogs, userInteractions, recommendationFeedback] =
    await Promise.all([
      TVShow.find({}).lean(),
      RecommendationLog.find({}).lean(),
      UserInteraction.find({}).lean(),
      RecommendationFeedback.find({}).lean(),
    ]);

  return {
    tvShows: tvShows.map(toPlainRecord),
    recommendationLogs: recommendationLogs.map(toPlainRecord),
    userInteractions: userInteractions.map(toPlainRecord),
    recommendationFeedback: recommendationFeedback.map(toPlainRecord),
  };
};

const formatRate = (value) => `${Math.round(value * 100)}%`;

const formatMetric = (value) => (value === null ? "n/a" : value);

const printTextReport = (report) => {
  console.log("Recommendation Model Comparison");
  console.log(
    `Rows: ${report.summary.rowCount} | Models: ${report.summary.modelCount} | Baseline: ${
      report.summary.baselineModelVersion || "n/a"
    }`,
  );

  if (!report.summary.comparisonReady) {
    console.log(
      "Comparison not ready: only one model version has logged recommendation rows.",
    );
  }

  console.log("\nModel Outcomes");
  for (const model of report.models) {
    console.log(
      `- ${model.modelVersion}: rows=${model.rows}, labels=${model.labelledRows}, positive=${model.positiveCount}, negative=${model.negativeCount}, positiveLabelRate=${formatRate(
        model.positiveLabelRate,
      )} [${formatRate(model.positiveLabelWilsonInterval.lower)}, ${formatRate(
        model.positiveLabelWilsonInterval.upper,
      )}], acceptRate=${formatRate(model.acceptRate)}, ignoreRate=${formatRate(
        model.ignoreRate,
      )}, avgScore=${formatMetric(model.averageScore)}`,
    );
  }

  console.log("\nBaseline Comparisons");
  if (report.comparisons.length === 0) {
    console.log("- No pairwise comparisons available yet.");
    return;
  }

  for (const comparison of report.comparisons) {
    console.log(
      `- ${comparison.modelVersion} vs ${comparison.baselineModelVersion}: positiveLabelRateDelta=${formatRate(
        comparison.positiveLabelRateDelta,
      )}, acceptRateDelta=${formatRate(
        comparison.acceptRateDelta,
      )}, ignoreRateDelta=${formatRate(
        comparison.ignoreRateDelta,
      )}, averageScoreDelta=${formatMetric(comparison.averageScoreDelta)}`,
    );
  }
};

const runComparison = async () => {
  const options = parseModelComparisonArgs(process.argv.slice(2));

  await connectDB();

  const snapshot = await fetchSnapshot();
  const exportData = buildTrainingDataExport(snapshot, {
    limit: options.limit,
  });
  const report = buildModelComparisonReport(exportData, {
    baselineModelVersion: options.baselineModelVersion,
  });

  if (options.format === "json") {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printTextReport(report);
};

runComparison()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
