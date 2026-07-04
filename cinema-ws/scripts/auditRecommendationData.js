#!/usr/bin/env node

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const IgnoredSuggestion = require("../models/IgnoredSuggestion");
const RecommendationFeedback = require("../models/RecommendationFeedback");
const RecommendationLog = require("../models/RecommendationLog");
const TVShow = require("../models/TVShow");
const User = require("../models/User");
const UserIgnoredSuggestion = require("../models/UserIgnoredSuggestion");
const UserInteraction = require("../models/UserInteraction");
const UserInterest = require("../models/UserInterest");
const UserShow = require("../models/UserShow");
const {
  auditDataQualitySnapshot,
  parseAuditArgs,
} = require("../services/dataQualityAudit.service");

const toPlainRecord = (record) => ({
  ...record,
  _id: record._id?.toString?.() || record._id,
  user: record.user?.toString?.() || record.user,
  tvShow: record.tvShow?.toString?.() || record.tvShow,
  recommendationLog:
    record.recommendationLog?.toString?.() || record.recommendationLog,
});

const fetchSnapshot = async () => {
  const [
    tvShows,
    users,
    userShows,
    userInteractions,
    recommendationLogs,
    recommendationFeedback,
    userInterests,
    ignoredSuggestions,
    userIgnoredSuggestions,
  ] = await Promise.all([
    TVShow.find({}).lean(),
    User.find({}).lean(),
    UserShow.find({}).lean(),
    UserInteraction.find({}).lean(),
    RecommendationLog.find({}).lean(),
    RecommendationFeedback.find({}).lean(),
    UserInterest.find({}).lean(),
    IgnoredSuggestion.find({}).lean(),
    UserIgnoredSuggestion.find({}).lean(),
  ]);

  return {
    tvShows: tvShows.map(toPlainRecord),
    users: users.map(toPlainRecord),
    userShows: userShows.map(toPlainRecord),
    userInteractions: userInteractions.map(toPlainRecord),
    recommendationLogs: recommendationLogs.map(toPlainRecord),
    recommendationFeedback: recommendationFeedback.map(toPlainRecord),
    userInterests: userInterests.map(toPlainRecord),
    ignoredSuggestions: ignoredSuggestions.map(toPlainRecord),
    userIgnoredSuggestions: userIgnoredSuggestions.map(toPlainRecord),
  };
};

const formatIssue = (issue) =>
  [
    issue.severity.toUpperCase(),
    issue.collection,
    issue.code,
    issue.title ? `"${issue.title}"` : issue.id,
    issue.detail,
  ]
    .filter(Boolean)
    .join(" | ");

const printTextReport = (report) => {
  console.log("Recommendation Data Quality Audit");
  console.log(
    `Issues: ${report.summary.issueCount} (${report.summary.errorCount} errors)`,
  );

  if (report.issues.length === 0) {
    console.log("No data quality issues found.");
    return;
  }

  for (const issue of report.issues) {
    console.log(`- ${formatIssue(issue)}`);
  }
};

const runAudit = async () => {
  const options = parseAuditArgs(process.argv.slice(2));

  await connectDB();

  const snapshot = await fetchSnapshot();
  const report = auditDataQualitySnapshot(snapshot);

  if (options.format === "json") {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printTextReport(report);
  }

  if (options.failOnError && report.summary.errorCount > 0) {
    process.exitCode = 1;
  }
};

runAudit()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
