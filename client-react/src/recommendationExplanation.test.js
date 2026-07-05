import assert from "node:assert/strict";
import test from "node:test";

import { buildRecommendationExplanationPayload } from "./hooks/useRecommendationExplanation.js";

test("buildRecommendationExplanationPayload echoes only the scoring context needed by the API", () => {
  assert.deepEqual(
    buildRecommendationExplanationPayload({
      _id: "show-1",
      title: "Client Title",
      recommendationScore: 91,
      scoreBreakdown: {
        genreSimilarity: 82,
        categoryPreference: 70,
        tmdbRating: 90,
        popularity: 75,
        yearSimilarity: 30,
      },
      similarWatchedShows: [
        { title: "Breaking Bad", similarity: 0.8 },
        { title: "Better Call Saul", similarity: 0.7 },
        { title: "Severance", similarity: 0.6 },
        { title: "Extra", similarity: 0.5 },
      ],
      recommendationLogId: "log-1",
      position: 4,
      sourcePage: "want",
      overview: "Should not be sent.",
    }),
    {
      recommendationScore: 91,
      scoreBreakdown: {
        genreSimilarity: 82,
        categoryPreference: 70,
        tmdbRating: 90,
        popularity: 75,
        yearSimilarity: 30,
      },
      similarWatchedShows: [
        { title: "Breaking Bad", similarity: 0.8 },
        { title: "Better Call Saul", similarity: 0.7 },
        { title: "Severance", similarity: 0.6 },
      ],
      recommendationLogId: "log-1",
      position: 4,
      sourcePage: "want",
    },
  );
});

test("buildRecommendationExplanationPayload falls back to matchScore when recommendationScore is absent", () => {
  assert.equal(
    buildRecommendationExplanationPayload({
      matchScore: 88,
      scoreBreakdown: {},
    }).recommendationScore,
    88,
  );
});
