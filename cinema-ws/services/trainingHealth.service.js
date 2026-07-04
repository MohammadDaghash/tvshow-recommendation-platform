const {
  buildRecommendationSignalReport,
} = require("./recommendationSignalReport.service");
const {
  analyzeTrainingDataExport,
} = require("./trainingDataAnalysis.service");
const { buildTrainingDataExport } = require("./trainingDataExport.service");

const isRating = (value) => {
  const rating = Number(value);

  return Number.isFinite(rating) && rating >= 0 && rating <= 10;
};

const getCatalogStatus = (show) => {
  if (show.status) return show.status;
  if (show.watched) return "watched";

  return "";
};

function buildTasteProfile({ tvShows = [], userShows = [], userInteractions = [] }) {
  const catalogStatusShows = tvShows
    .map((show) => ({
      status: getCatalogStatus(show),
      userRating: show.userRating,
    }))
    .filter((show) => show.status);
  const profileRows = [...userShows, ...catalogStatusShows];
  const summary = {
    watchedCount: profileRows.filter((row) => row.status === "watched").length,
    ratedCount: profileRows.filter((row) => isRating(row.userRating)).length,
    wantCount: profileRows.filter((row) => row.status === "want").length,
    watchingCount: profileRows.filter((row) => row.status === "watching").length,
    interactionCount: userInteractions.length,
    totalTasteSignals: 0,
  };

  summary.totalTasteSignals =
    summary.ratedCount +
    summary.wantCount +
    summary.watchingCount +
    summary.interactionCount;

  return {
    summary,
  };
}

function buildTrainingHealth(snapshot, options = {}) {
  const trainingData = buildTrainingDataExport(snapshot, {
    limit: Number.MAX_SAFE_INTEGER,
  });
  const trainingAnalysis = analyzeTrainingDataExport(trainingData, {
    topGenreLimit: options.topGenreLimit || 10,
  });
  const signalReport = buildRecommendationSignalReport(snapshot, {
    limit: options.userLimit || 20,
  });

  return {
    generatedAt: options.generatedAt || new Date().toISOString(),
    signalReport,
    tasteProfile: buildTasteProfile(snapshot),
    trainingData: {
      summary: trainingData.summary,
    },
    trainingAnalysis,
  };
}

module.exports = {
  buildTrainingHealth,
  buildTasteProfile,
};
