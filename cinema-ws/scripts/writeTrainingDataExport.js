#!/usr/bin/env node

require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const RecommendationFeedback = require("../models/RecommendationFeedback");
const RecommendationLog = require("../models/RecommendationLog");
const TVShow = require("../models/TVShow");
const UserInteraction = require("../models/UserInteraction");
const { buildTrainingDataExport } = require("../services/trainingDataExport.service");

const DEFAULT_OUTPUT_PATH = ".codex-private/training-data.json";

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

const parseArgs = (args) => {
  const options = {
    output: DEFAULT_OUTPUT_PATH,
    limit: 5000,
  };

  for (const arg of args) {
    if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
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
};

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

const writeJsonFile = (outputPath, data) => {
  const absolutePath = path.resolve(process.cwd(), outputPath);

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(data, null, 2)}\n`);

  return absolutePath;
};

const runExport = async () => {
  const options = parseArgs(process.argv.slice(2));

  await connectDB();

  const snapshot = await fetchSnapshot();
  const exportData = buildTrainingDataExport(snapshot, {
    limit: options.limit,
  });
  const outputPath = writeJsonFile(options.output, exportData);

  console.log(
    `Training export written: ${outputPath} (${exportData.rows.length}/${exportData.summary.rowCount} rows)`,
  );
};

runExport()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
