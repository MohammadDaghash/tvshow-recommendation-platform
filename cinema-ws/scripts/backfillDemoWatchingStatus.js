#!/usr/bin/env node

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const TVShow = require("../models/TVShow");
const {
  buildDemoWatchingStatusUpdate,
  selectDemoWatchingBackfillCandidates,
} = require("../services/demoStatusBackfill.service");

const parseArgs = (args) => ({
  apply: args.includes("--apply"),
});

const getShowId = (show) =>
  typeof show._id?.toString === "function" ? show._id.toString() : show._id;

const runBackfill = async () => {
  const options = parseArgs(process.argv.slice(2));

  await connectDB();

  const shows = await TVShow.find({}).lean();
  const candidates = selectDemoWatchingBackfillCandidates(shows);
  const update = buildDemoWatchingStatusUpdate();

  console.log(
    `${options.apply ? "Apply mode" : "Dry run"}: found ${
      candidates.length
    } public demo shows to mark as currently watching.`,
  );

  for (const show of candidates) {
    if (options.apply) {
      await TVShow.updateOne(
        {
          _id: getShowId(show),
        },
        {
          $set: update,
        },
      );
    }

    console.log(
      `[${options.apply ? "UPDATED" : "DRY-RUN"}] ${show.title} -> watching`,
    );
  }

  console.log(
    `Summary: scanned=${shows.length}, ${
      options.apply ? "updated" : "wouldUpdate"
    }=${candidates.length}`,
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
