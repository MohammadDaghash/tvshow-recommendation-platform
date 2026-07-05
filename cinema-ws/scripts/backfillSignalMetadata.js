#!/usr/bin/env node

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const RecommendationFeedback = require("../models/RecommendationFeedback");
const UserInteraction = require("../models/UserInteraction");
const {
  buildSignalBackfillUpdate,
  parseSignalBackfillArgs,
  summarizeSignalBackfill,
} = require("../services/signalBackfill.service");

const getRecordId = (record) => record._id?.toString?.() || record._id;

const formatUpdate = (update) =>
  Object.entries(update)
    .map(([field, value]) => `${field}=${JSON.stringify(value)}`)
    .join(", ");

const fetchRecords = (model, limit) => {
  const query = model.find({}).sort({ createdAt: 1 }).lean();

  return limit ? query.limit(limit) : query;
};

const runModelBackfill = async ({
  apply,
  includeStatus,
  label,
  limit,
  model,
}) => {
  const records = await fetchRecords(model, limit);
  const summary = summarizeSignalBackfill(records, { includeStatus });

  console.log(
    `${label}: scanned=${summary.scanned}, ${
      apply ? "willUpdate" : "wouldUpdate"
    }=${summary.wouldUpdate}, skipped=${summary.skipped}`,
  );

  for (const { id, update } of summary.updates) {
    if (apply) {
      await model.updateOne(
        {
          _id: id,
        },
        {
          $set: update,
        },
      );
    }

    console.log(`[${apply ? "UPDATED" : "DRY-RUN"}] ${label} ${id}: ${formatUpdate(update)}`);
  }

  return summary;
};

const runBackfill = async () => {
  const options = parseSignalBackfillArgs(process.argv.slice(2));

  await connectDB();

  console.log(
    `${options.apply ? "Apply mode" : "Dry run"}: backfilling signal metadata fields.`,
  );

  const interactionSummary = await runModelBackfill({
    apply: options.apply,
    includeStatus: true,
    label: "UserInteraction",
    limit: options.limit,
    model: UserInteraction,
  });
  const feedbackSummary = await runModelBackfill({
    apply: options.apply,
    includeStatus: false,
    label: "RecommendationFeedback",
    limit: options.limit,
    model: RecommendationFeedback,
  });

  const totalScanned = interactionSummary.scanned + feedbackSummary.scanned;
  const totalUpdates = interactionSummary.wouldUpdate + feedbackSummary.wouldUpdate;
  const totalSkipped = interactionSummary.skipped + feedbackSummary.skipped;

  console.log(
    `Summary: scanned=${totalScanned}, ${
      options.apply ? "updated" : "wouldUpdate"
    }=${totalUpdates}, skipped=${totalSkipped}`,
  );
};

runBackfill()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
