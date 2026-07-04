export const formatPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

export function getReadinessLabel(status) {
  return status === "ready" ? "Taste profile ready" : "Collect more signals";
}

export function getHealthMetricCards(health) {
  const signalSummary = health?.signalReport?.summary || {};
  const analysisSummary = health?.trainingAnalysis?.summary || {};
  const tasteSummary = health?.tasteProfile?.summary || {};

  return [
    {
      label: "Rated Shows",
      value: tasteSummary.ratedCount || 0,
    },
    {
      label: "Taste Signals",
      value: tasteSummary.totalTasteSignals || 0,
    },
    {
      label: "AI Feedback Labels",
      value: `${analysisSummary.supervisedLabelCount || 0} (${formatPercent(
        analysisSummary.supervisedLabelRate,
      )})`,
    },
    {
      label: "Positive / Negative",
      value: `${analysisSummary.positiveCount || 0} / ${
        analysisSummary.negativeCount || 0
      }`,
    },
    {
      label: "Linked Feedback",
      value: signalSummary.linkedFeedbackCount || 0,
    },
  ];
}
