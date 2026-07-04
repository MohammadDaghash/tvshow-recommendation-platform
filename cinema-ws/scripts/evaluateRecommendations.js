#!/usr/bin/env node

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const TVShow = require("../models/TVShow");
const UserShow = require("../models/UserShow");
const {
  buildBaselineReport,
} = require("../services/baselineReport.service");
const {
  buildEvaluationReport,
  parseEvaluationArgs,
} = require("../services/evaluationReport.service");
const recommendationService = require("../services/recommendation.service");

const toPlainRecord = (record) => ({
  ...record,
  _id: record._id?.toString?.() || record._id,
  tvShow: record.tvShow?.toString?.() || record.tvShow,
  user: record.user?.toString?.() || record.user,
});

const fetchSnapshot = async () => {
  const [tvShows, userShows] = await Promise.all([
    TVShow.find({}).lean(),
    UserShow.find({}).lean(),
  ]);

  return {
    tvShows: tvShows.map(toPlainRecord),
    userShows: userShows.map(toPlainRecord),
  };
};

const formatMetric = (value) => {
  if (value === null || value === undefined) return "n/a";

  return typeof value === "number" ? value.toFixed(2) : value;
};

const printTextReport = (report) => {
  console.log("Recommendation Evaluation Report");
  console.log(
    `K: ${report.summary.k} | Positive threshold: ${report.summary.positiveRatingThreshold} | Positive items: ${report.summary.positiveItemCount}`,
  );

  for (const strategy of report.strategies) {
    const metrics = strategy.metrics;

    console.log(
      `- ${strategy.name}: hits=${metrics.hits}/${metrics.relevantCount}, precision@${metrics.k}=${formatMetric(
        metrics.precision,
      )}, recall@${metrics.k}=${formatMetric(
        metrics.recall,
      )}, AP@${metrics.k}=${formatMetric(
        metrics.averagePrecision,
      )}, firstHitRank=${formatMetric(metrics.firstHitRank)}`,
    );
  }
};

const runEvaluation = async () => {
  const options = parseEvaluationArgs(process.argv.slice(2));

  await connectDB();

  const snapshot = await fetchSnapshot();
  const baselineReport = buildBaselineReport(snapshot, {
    limit: snapshot.tvShows.length || options.k,
  });
  const currentRecommendations = (await recommendationService.getRecommendations()).map(
    toPlainRecord,
  );
  const report = buildEvaluationReport(
    {
      ...snapshot,
      strategies: {
        current_recommender: currentRecommendations,
        top_popular: baselineReport.topPopular,
        top_tmdb_rated: baselineReport.topTMDBRated,
        top_user_rated: baselineReport.topUserRated,
      },
    },
    {
      k: options.k,
      positiveRatingThreshold: options.positiveRatingThreshold,
    },
  );

  if (options.format === "json") {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printTextReport(report);
};

runEvaluation()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
