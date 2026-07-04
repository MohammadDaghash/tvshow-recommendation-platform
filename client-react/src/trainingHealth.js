export const formatPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

export function getReadinessLabel(status) {
  return status === "ready" ? "Ready for ML experiments" : "Collect more signals";
}

export function getHealthMetricCards(health) {
  const signalSummary = health?.signalReport?.summary || {};
  const analysisSummary = health?.trainingAnalysis?.summary || {};

  return [
    {
      label: "Training Rows",
      value: analysisSummary.rowCount || 0,
    },
    {
      label: "Labelled Rows",
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
