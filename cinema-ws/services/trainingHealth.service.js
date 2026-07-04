const {
  buildRecommendationSignalReport,
} = require("./recommendationSignalReport.service");
const {
  analyzeTrainingDataExport,
} = require("./trainingDataAnalysis.service");
const { buildTrainingDataExport } = require("./trainingDataExport.service");

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
    trainingData: {
      summary: trainingData.summary,
    },
    trainingAnalysis,
  };
}

module.exports = {
  buildTrainingHealth,
};
