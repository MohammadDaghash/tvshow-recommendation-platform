#!/usr/bin/env node

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const TVShow = require("../models/TVShow");
const UserShow = require("../models/UserShow");
const {
  parseVectorExperimentArgs,
  runVectorWeightExperiment,
} = require("../services/vectorModelExperiment.service");

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

const formatDecimal = (value) => {
  if (value === null || value === undefined) return "n/a";

  return typeof value === "number" ? value.toFixed(3) : value;
};

const formatWeight = (value) => `${Math.round(value * 100)}%`;

const formatWeights = (weights) => {
  return [
    `taste=${formatWeight(weights.vectorSimilarity)}`,
    `tmdb=${formatWeight(weights.tmdbRating)}`,
    `popularity=${formatWeight(weights.popularity)}`,
    `year=${formatWeight(weights.yearSimilarity)}`,
    `language=${formatWeight(weights.languagePreference)}`,
  ].join(", ");
};

const printTextReport = (report) => {
  console.log("Vector Recommendation Experiment");
  console.log(
    `K: ${report.summary.k} | Positive rating threshold: ${report.summary.positiveRatingThreshold} | Leave-one-out cases: ${report.summary.caseCount}`,
  );
  console.log(
    "Formula: score = weighted sum(vector cosine similarity, TMDB rating, popularity, year, language)",
  );

  if (report.summary.caseCount === 0) {
    console.log(
      "- No evaluation cases found in the current data snapshot. Add more watched ratings, then rerun this command.",
    );
    return;
  }

  console.log("");

  for (const preset of report.presets) {
    const metrics = preset.metrics;

    console.log(
      `- ${preset.name}: hit@${report.summary.k}=${formatDecimal(
        metrics.hitRate,
      )}, MRR=${formatDecimal(metrics.meanReciprocalRank)}, nDCG@${report.summary.k}=${formatDecimal(
        metrics.ndcg,
      )}, mean held-out rank=${formatDecimal(metrics.meanHeldOutRank)}`,
    );
    console.log(`  weights: ${formatWeights(preset.weights)}`);

    if (preset.misses.length > 0) {
      console.log(
        `  misses: ${preset.misses
          .map((miss) => `${miss.heldOutTitle} -> top was ${miss.topRecommendation}`)
          .join("; ")}`,
      );
    }
  }

  console.log("");
  console.log(`Best preset: ${report.bestPreset?.name || "n/a"}`);
};

const runExperiment = async () => {
  const options = parseVectorExperimentArgs(process.argv.slice(2));

  await connectDB();

  const snapshot = await fetchSnapshot();
  const report = runVectorWeightExperiment(snapshot, {
    k: options.k,
    positiveRatingThreshold: options.positiveRatingThreshold,
  });

  if (options.format === "json") {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printTextReport(report);
};

runExperiment()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
