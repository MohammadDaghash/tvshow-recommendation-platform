#!/usr/bin/env node

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const RecommendationFeedback = require("../models/RecommendationFeedback");
const UserIgnoredSuggestion = require("../models/UserIgnoredSuggestion");
const UserInteraction = require("../models/UserInteraction");
const {
  parseIgnoredSuggestionBackfillArgs,
  summarizeIgnoredSuggestionBackfill,
} = require("../services/ignoredSuggestionBackfill.service");

const formatUpdate = (update) =>
  Object.entries(update)
    .map(([field, value]) => `${field}=${JSON.stringify(value)}`)
    .join(", ");

const fetchIgnoredSuggestions = (limit) => {
  const query = UserIgnoredSuggestion.find({}).sort({ createdAt: 1 }).lean();

  return limit ? query.limit(limit) : query;
};

const fetchIgnoredSignals = async () => {
  const [interactions, feedback] = await Promise.all([
    UserInteraction.find({
      eventType: "suggestion_ignored",
    })
      .sort({ createdAt: 1 })
      .lean(),
    RecommendationFeedback.find({
      action: "ignored",
    })
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  return [...interactions, ...feedback];
};

const runBackfill = async () => {
  const options = parseIgnoredSuggestionBackfillArgs(process.argv.slice(2));

  await connectDB();

  console.log(
    `${options.apply ? "Apply mode" : "Dry run"}: backfilling ignored-suggestion ML metadata.`,
  );

  const ignoredSuggestions = await fetchIgnoredSuggestions(options.limit);
  const ignoredSignals = await fetchIgnoredSignals();
  const summary = summarizeIgnoredSuggestionBackfill(
    ignoredSuggestions,
    ignoredSignals,
  );

  console.log(
    `UserIgnoredSuggestion: scanned=${summary.scanned}, ${
      options.apply ? "willUpdate" : "wouldUpdate"
    }=${summary.wouldUpdate}, skipped=${summary.skipped}`,
  );

  for (const { id, update } of summary.updates) {
    if (options.apply) {
      await UserIgnoredSuggestion.updateOne(
        {
          _id: id,
        },
        {
          $set: update,
        },
      );
    }

    console.log(
      `[${options.apply ? "UPDATED" : "DRY-RUN"}] UserIgnoredSuggestion ${id}: ${formatUpdate(update)}`,
    );
  }

  console.log(
    `Summary: scanned=${summary.scanned}, ${
      options.apply ? "updated" : "wouldUpdate"
    }=${summary.wouldUpdate}, skipped=${summary.skipped}`,
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
