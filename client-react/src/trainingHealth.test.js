import assert from "node:assert/strict";
import test from "node:test";

import {
  formatPercent,
  getHealthMetricCards,
  getReadinessLabel,
} from "./trainingHealth.js";

test("formatPercent renders decimal rates as whole percentages", () => {
  assert.equal(formatPercent(0.034), "3%");
  assert.equal(formatPercent(0.5), "50%");
});

test("getReadinessLabel explains ML readiness simply", () => {
  assert.equal(getReadinessLabel("ready"), "Taste profile ready");
  assert.equal(getReadinessLabel("not_ready"), "Collect more signals");
});

test("getHealthMetricCards summarizes the important training health numbers", () => {
  const cards = getHealthMetricCards({
    signalReport: {
      summary: {
        linkedFeedbackCount: 17,
      },
    },
    tasteProfile: {
      summary: {
        ratedCount: 55,
        totalTasteSignals: 91,
      },
    },
    trainingAnalysis: {
      summary: {
        rowCount: 520,
        supervisedLabelCount: 14,
        supervisedLabelRate: 0.03,
        positiveCount: 2,
        negativeCount: 12,
      },
    },
  });

  assert.deepEqual(cards, [
    {
      label: "Rated Shows",
      value: 55,
    },
    {
      label: "Taste Signals",
      value: 91,
    },
    {
      label: "AI Feedback Labels",
      value: "14 (3%)",
    },
    {
      label: "Positive / Negative",
      value: "2 / 12",
    },
    {
      label: "Linked Feedback",
      value: 17,
    },
  ]);
});
