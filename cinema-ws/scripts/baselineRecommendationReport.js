#!/usr/bin/env node

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const TVShow = require("../models/TVShow");
const UserShow = require("../models/UserShow");
const {
  buildBaselineReport,
  parseBaselineArgs,
} = require("../services/baselineReport.service");

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

const formatRankedList = (title, rows, fields) => {
  console.log(`\n${title}`);

  if (rows.length === 0) {
    console.log("- No rows");
    return;
  }

  rows.forEach((row, index) => {
    const details = fields
      .map(([label, field]) => `${label}: ${row[field]}`)
      .join(" | ");

    console.log(`${index + 1}. ${row.title} (${details})`);
  });
};

const printTextReport = (report) => {
  console.log("Baseline Recommendation Report");
  console.log(
    `Catalog shows: ${report.summary.catalogCount} | Ratings: ${report.summary.userRatingCount} | Limit: ${report.summary.limit}`,
  );

  formatRankedList("Top Popular Shows", report.topPopular, [
    ["popularity", "popularity"],
    ["TMDB", "tmdbRating"],
  ]);

  formatRankedList("Top TMDB Rated Shows", report.topTMDBRated, [
    ["TMDB", "tmdbRating"],
    ["popularity", "popularity"],
  ]);

  formatRankedList("Top User Rated Shows", report.topUserRated, [
    ["weighted", "weightedUserRating"],
    ["avg", "averageUserRating"],
    ["ratings", "ratingCount"],
  ]);
};

const runReport = async () => {
  const options = parseBaselineArgs(process.argv.slice(2));

  await connectDB();

  const snapshot = await fetchSnapshot();
  const report = buildBaselineReport(snapshot, {
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
