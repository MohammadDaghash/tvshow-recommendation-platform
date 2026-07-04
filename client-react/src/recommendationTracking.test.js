import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSuggestionTrackingPayloads,
  buildSuggestionTrackingSignature,
  resolveCurrentRecommendationLogId,
} from "./recommendationTracking.js";

const suggestions = [
  {
    _id: "show-1",
    tmdbId: 95396,
    title: "Severance",
    matchScore: 93,
  },
  {
    tmdbId: 1396,
    title: "Breaking Bad",
    recommendationScore: 89,
  },
];

test("buildSuggestionTrackingSignature identifies the exact ranked suggestion set", () => {
  assert.equal(
    buildSuggestionTrackingSignature({
      userId: "user-1",
      shows: suggestions,
    }),
    "user-1|95396|1396",
  );
});

test("buildSuggestionTrackingPayloads creates linked log and impression payloads", () => {
  const payloads = buildSuggestionTrackingPayloads({
    shows: suggestions,
    usesPublicDataset: false,
    recommendationLogId: "log-1",
  });

  assert.equal(payloads.logPayload.source, "tmdb");
  assert.equal(payloads.logPayload.items.length, 2);
  assert.deepEqual(
    payloads.impressionEvents.map((event) => [
      event.recommendationLogId,
      event.position,
    ]),
    [
      ["log-1", 1],
      ["log-1", 2],
    ],
  );
});

test("resolveCurrentRecommendationLogId waits for a pending log response", async () => {
  const trackingEntry = {
    signature: "user-1|95396",
    promise: Promise.resolve({
      id: "log-1",
    }),
  };

  const recommendationLogId = await resolveCurrentRecommendationLogId({
    currentSignature: "user-1|95396",
    getTrackingEntry: () => trackingEntry,
  });

  assert.equal(recommendationLogId, "log-1");
});

test("resolveCurrentRecommendationLogId ignores stale pending log responses", async () => {
  let trackingEntry = {
    signature: "user-1|old",
    promise: Promise.resolve({
      id: "old-log",
    }),
  };

  const recommendationLogId = await resolveCurrentRecommendationLogId({
    currentSignature: "user-1|old",
    getTrackingEntry: () => {
      const entry = trackingEntry;

      trackingEntry = {
        signature: "user-1|new",
        id: "new-log",
      };

      return entry;
    },
  });

  assert.equal(recommendationLogId, undefined);
});
