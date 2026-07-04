#!/usr/bin/env node

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const TVShow = require("../models/TVShow");
const {
  getTVShowDetailsById,
  searchTVShows,
} = require("../services/tmdb.service");
const {
  buildTMDBMetadataUpdate,
  needsTMDBMetadataBackfill,
  parseBackfillArgs,
  selectTMDBSearchMatch,
} = require("../services/tmdbBackfill.service");

const formatUpdate = (update) =>
  Object.entries(update)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}=[${value.join(", ")}]`;
      }

      return `${key}=${JSON.stringify(value)}`;
    })
    .join(", ");

const getShowId = (show) =>
  typeof show._id?.toString === "function" ? show._id.toString() : show._id;

const getBackfillCandidates = async ({ title, limit }) => {
  const query = title
    ? {
        title: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      }
    : {};

  const shows = await TVShow.find(query).sort({ title: 1 }).lean();
  const candidates = shows.filter(needsTMDBMetadataBackfill);

  return limit ? candidates.slice(0, limit) : candidates;
};

const resolveTMDBDetails = async (show) => {
  if (show.tmdbId) {
    return {
      matchSource: "tmdbId",
      tmdbShow: await getTVShowDetailsById(show.tmdbId),
    };
  }

  const searchResults = await searchTVShows(show.title);
  const match = selectTMDBSearchMatch(show, searchResults);

  if (match.status !== "matched") {
    return {
      matchSource: match.status,
      reason: match.reason,
      candidates: match.candidates || [],
    };
  }

  return {
    matchSource: "title-year",
    tmdbShow: await getTVShowDetailsById(match.candidate.tmdbId),
  };
};

const runBackfill = async () => {
  const options = parseBackfillArgs(process.argv.slice(2));

  await connectDB();

  const candidates = await getBackfillCandidates(options);
  const summary = {
    scanned: candidates.length,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  console.log(
    `${options.dryRun ? "Dry run" : "Apply mode"}: found ${
      candidates.length
    } TV shows needing TMDB metadata.`,
  );

  for (const show of candidates) {
    try {
      const resolved = await resolveTMDBDetails(show);

      if (!resolved.tmdbShow) {
        summary.skipped += 1;
        console.log(
          `[SKIP] ${show.title} (${show.year || "unknown year"}) - ${
            resolved.reason || resolved.matchSource
          }`,
        );
        continue;
      }

      const update = buildTMDBMetadataUpdate(resolved.tmdbShow, show);

      if (Object.keys(update).length === 0) {
        summary.skipped += 1;
        console.log(`[SKIP] ${show.title} - no TMDB fields to update`);
        continue;
      }

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

      summary.updated += 1;
      console.log(
        `[${options.dryRun ? "DRY-RUN" : "UPDATED"}] ${show.title} <- ${
          resolved.tmdbShow.title
        } via ${resolved.matchSource}: ${formatUpdate(update)}`,
      );
    } catch (error) {
      summary.failed += 1;
      console.log(`[ERROR] ${show.title}: ${error.message}`);
    }
  }

  console.log(
    `Summary: scanned=${summary.scanned}, ${
      options.dryRun ? "wouldUpdate" : "updated"
    }=${summary.updated}, skipped=${summary.skipped}, failed=${summary.failed}`,
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
