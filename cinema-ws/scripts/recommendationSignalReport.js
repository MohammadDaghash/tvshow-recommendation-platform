#!/usr/bin/env node

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const RecommendationFeedback = require("../models/RecommendationFeedback");
const RecommendationLog = require("../models/RecommendationLog");
const User = require("../models/User");
const UserInteraction = require("../models/UserInteraction");
const {
  buildRecommendationSignalReport,
  parseSignalReportArgs,
} = require("../services/recommendationSignalReport.service");

const toPlainRecord = (record) => ({
  ...record,
  _id: record._id?.toString?.() || record._id,
  user: record.user?.toString?.() || record.user,
  tvShow: record.tvShow?.toString?.() || record.tvShow,
  recommendationLog:
    record.recommendationLog?.toString?.() || record.recommendationLog,
});

const fetchSnapshot = async () => {
  const [users, recommendationLogs, userInteractions, recommendationFeedback] =
    await Promise.all([
      User.find({}).lean(),
      RecommendationLog.find({}).lean(),
      UserInteraction.find({}).lean(),
      RecommendationFeedback.find({}).lean(),
    ]);

  return {
    users: users.map(toPlainRecord),
    recommendationLogs: recommendationLogs.map(toPlainRecord),
    userInteractions: userInteractions.map(toPlainRecord),
    recommendationFeedback: recommendationFeedback.map(toPlainRecord),
  };
};

const formatMetric = (value) => {
  if (value === null || value === undefined) return "n/a";

  return typeof value === "number" ? value.toFixed(2) : value;
};

const printTextReport = (report) => {
  console.log("Recommendation Signal Report");
  console.log(
    `Users: ${report.summary.userCount} | Models: ${report.summary.modelVersionCount} | Logs: ${report.summary.recommendationLogCount} | Items: ${report.summary.recommendedItemCount}`,
  );
  console.log(
    `Impressions: ${report.summary.impressionCount} | Opens: ${report.summary.openCount} | Feedback: ${report.summary.feedbackCount} | Accepts: ${report.summary.acceptCount} | Ignores: ${report.summary.ignoreCount} | Ratings: ${report.summary.ratingCount}`,
  );
  console.log(
    `Linked feedback: ${report.summary.linkedFeedbackCount} | Unlinked feedback: ${report.summary.unlinkedFeedbackCount}`,
  );

  if (report.rows.length === 0) {
    console.log("- No recommendation signals found.");
    return;
  }

  for (const row of report.rows) {
    const userLabel = row.userEmail || row.userName || row.userId;

    console.log(
      `- ${userLabel} | ${row.modelVersion}: logs=${row.recommendationLogs}, items=${row.recommendedItems}, impressions=${row.impressions}, opens=${row.opens}, accepts=${row.accepts}, ignores=${row.ignored}, ratings=${row.ratings}, avgRating=${formatMetric(row.averageRating)}, openRate=${formatMetric(row.openRate)}, acceptRate=${formatMetric(row.acceptanceRate)}`,
    );
  }
};

const runReport = async () => {
  const options = parseSignalReportArgs(process.argv.slice(2));

  await connectDB();

  const snapshot = await fetchSnapshot();
  const report = buildRecommendationSignalReport(snapshot, {
    limit: options.limit,
  });

  if (options.format === "json") {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printTextReport(report);
};

runReport()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
