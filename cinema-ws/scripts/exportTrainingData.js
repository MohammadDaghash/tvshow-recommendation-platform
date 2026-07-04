#!/usr/bin/env node

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const RecommendationFeedback = require("../models/RecommendationFeedback");
const RecommendationLog = require("../models/RecommendationLog");
const TVShow = require("../models/TVShow");
const UserInteraction = require("../models/UserInteraction");
const {
  buildTrainingDataExport,
  parseTrainingExportArgs,
} = require("../services/trainingDataExport.service");

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

const formatBoolean = (value) => (value ? "1" : "0");

const printTextExport = (exportData) => {
  console.log("Recommendation Training Data Export");
  console.log(
    `Rows: ${exportData.summary.rowCount} | Logs: ${exportData.summary.recommendationLogCount} | Interactions: ${exportData.summary.linkedInteractionCount} | Feedback: ${exportData.summary.linkedFeedbackCount}`,
  );
  console.log(
    `Opened: ${exportData.summary.openedCount} | Accepted: ${exportData.summary.acceptedCount} | Ignored: ${exportData.summary.ignoredCount} | Rated: ${exportData.summary.ratedCount}`,
  );

  if (exportData.rows.length === 0) {
    console.log("- No training rows found.");
    return;
  }

  for (const row of exportData.rows) {
    console.log(
      [
        row.userId,
        row.title,
        `rank=${row.rank}`,
        `score=${row.score}`,
        `opened=${formatBoolean(row.wasOpened)}`,
        `accepted=${formatBoolean(row.wasAccepted)}`,
        `ignored=${formatBoolean(row.wasIgnored)}`,
        `rating=${row.rating ?? "null"}`,
      ].join(" | "),
    );
  }
};

const runExport = async () => {
  const options = parseTrainingExportArgs(process.argv.slice(2));

  await connectDB();

  const snapshot = await fetchSnapshot();
  const exportData = buildTrainingDataExport(snapshot, {
    limit: options.limit,
  });

  if (options.format === "json") {
    console.log(JSON.stringify(exportData, null, 2));
    return;
  }

  printTextExport(exportData);
};

runExport()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
