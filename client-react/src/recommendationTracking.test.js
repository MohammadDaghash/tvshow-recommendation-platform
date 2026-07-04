import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSuggestionTrackingPayloads,
  buildSuggestionTrackingSignature,
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
