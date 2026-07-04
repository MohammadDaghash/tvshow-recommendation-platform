import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCardOpenEvent,
  buildRecommendationFeedbackPayload,
  buildRecommendationLogPayload,
  buildSuggestionImpressionEvents,
} from "./interactionPayloads.js";

const suggestion = {
  _id: "show-1",
  tmdbId: 95396,
  title: "Severance",
  recommendationScore: 91,
  matchScore: 93,
  scoreBreakdown: {
    genreSimilarity: 82,
  },
};

test("buildCardOpenEvent creates a raw card-open interaction", () => {
  assert.deepEqual(buildCardOpenEvent(suggestion, "ai", 2), {
    eventType: "card_opened",
    tvShowId: "show-1",
    tmdbId: 95396,
    title: "Severance",
    sourcePage: "ai",
    position: 2,
    modelVersion: "baseline-v1",
    metadata: {
      matchScore: 93,
      recommendationScore: 91,
    },
  });
});

test("buildCardOpenEvent can link opens to a recommendation log", () => {
  assert.equal(
    buildCardOpenEvent(suggestion, "ai", 2, {
      recommendationLogId: "log-1",
    }).recommendationLogId,
    "log-1",
  );
});

test("buildSuggestionImpressionEvents creates ranked impression events", () => {
  assert.deepEqual(buildSuggestionImpressionEvents([suggestion], "ai"), [
    {
      eventType: "suggestion_impression",
      tvShowId: "show-1",
      tmdbId: 95396,
      title: "Severance",
      sourcePage: "ai",
      position: 1,
      modelVersion: "baseline-v1",
      metadata: {
        matchScore: 93,
        recommendationScore: 91,
      },
    },
  ]);
});

test("buildSuggestionImpressionEvents can link impressions to a recommendation log", () => {
  assert.equal(
    buildSuggestionImpressionEvents([suggestion], "ai", {
      recommendationLogId: "log-1",
    })[0].recommendationLogId,
    "log-1",
  );
});

test("buildRecommendationLogPayload keeps ranked score breakdowns", () => {
  assert.deepEqual(
    buildRecommendationLogPayload({
      page: "ai",
      source: "tmdb",
      shows: [suggestion],
    }),
    {
      modelVersion: "baseline-v1",
      source: "tmdb",
      page: "ai",
      items: [
        {
          tvShowId: "show-1",
          tmdbId: 95396,
          title: "Severance",
          score: 93,
          position: 1,
          scoreBreakdown: {
            genreSimilarity: 82,
          },
        },
      ],
    },
  );
});

test("buildRecommendationFeedbackPayload labels user actions", () => {
  assert.deepEqual(
    buildRecommendationFeedbackPayload(suggestion, "accepted_watched", {
      rating: 9,
      sourcePage: "ai",
    }),
    {
      tvShowId: "show-1",
      tmdbId: 95396,
      action: "accepted_watched",
      rating: 9,
      metadata: {
        sourcePage: "ai",
        matchScore: 93,
        recommendationScore: 91,
      },
    },
  );
});

test("buildRecommendationFeedbackPayload can link feedback to a recommendation log", () => {
  assert.equal(
    buildRecommendationFeedbackPayload(suggestion, "ignored", {
      recommendationLogId: "log-1",
      sourcePage: "ai",
    }).recommendationLogId,
    "log-1",
  );
});
