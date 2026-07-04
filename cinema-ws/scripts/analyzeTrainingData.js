#!/usr/bin/env node

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const RecommendationFeedback = require("../models/RecommendationFeedback");
const RecommendationLog = require("../models/RecommendationLog");
const TVShow = require("../models/TVShow");
const UserInteraction = require("../models/UserInteraction");
const {
  analyzeTrainingDataExport,
  parseTrainingAnalysisArgs,
} = require("../services/trainingDataAnalysis.service");
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

const printTextAnalysis = (analysis) => {
  console.log("Recommendation Training Data Quality");
  console.log(
    `Rows: ${analysis.summary.rowCount} | Labelled: ${analysis.summary.supervisedLabelCount} (${formatRate(
      analysis.summary.supervisedLabelRate,
    )}) | Positive: ${analysis.summary.positiveCount} | Negative: ${analysis.summary.negativeCount}`,
  );
  console.log(
    `Engaged: ${analysis.summary.engagementCount} (${formatRate(
      analysis.summary.engagementRate,
    )}) | Opened: ${analysis.summary.openedCount} | Accepted: ${analysis.summary.acceptedCount} | Ignored: ${analysis.summary.ignoredCount} | Rated: ${analysis.summary.ratedCount}`,
  );
  console.log(
    `Genre coverage: ${formatRate(
      analysis.metadataCoverage.genreCoverage,
    )} | TMDB rating coverage: ${formatRate(
      analysis.metadataCoverage.tmdbRatingCoverage,
    )}`,
  );
  console.log(`ML readiness: ${analysis.readiness.status}`);

  for (const reason of analysis.readiness.reasons) {
    console.log(`- ${reason}`);
  }

  console.log("\nTop Genres");
  if (analysis.topGenres.length === 0) {
    console.log("- No genre metadata available.");
  } else {
    for (const genre of analysis.topGenres) {
      console.log(
        `- ${genre.genre}: rows=${genre.rows}, positive=${genre.positiveCount}, negative=${genre.negativeCount}, labels=${formatRate(
          genre.supervisedLabelRate,
        )}`,
      );
    }
  }

  console.log("\nModel Versions");
  for (const model of analysis.modelVersions) {
    console.log(
      `- ${model.modelVersion}: rows=${model.rows}, positive=${model.positiveCount}, negative=${model.negativeCount}, labels=${formatRate(
        model.supervisedLabelRate,
      )}`,
    );
  }
};

const runAnalysis = async () => {
  const options = parseTrainingAnalysisArgs(process.argv.slice(2));

  await connectDB();

  const snapshot = await fetchSnapshot();
  const exportData = buildTrainingDataExport(snapshot, {
    limit: Number.MAX_SAFE_INTEGER,
  });
  const analysis = analyzeTrainingDataExport(exportData, {
    topGenreLimit: options.topGenreLimit,
  });

  if (options.format === "json") {
    console.log(JSON.stringify(analysis, null, 2));
    return;
  }

  printTextAnalysis(analysis);
};

runAnalysis()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
