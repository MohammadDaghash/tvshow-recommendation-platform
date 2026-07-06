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
  recommendationModel: "vector-content-v1.2-negative-feedback",
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
    modelVersion: "vector-content-v1.2-negative-feedback",
    metadata: {
      matchScore: 93,
      modelVersion: "vector-content-v1.2-negative-feedback",
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

test("buildCardOpenEvent includes show metadata for future training data", () => {
  assert.deepEqual(
    buildCardOpenEvent(
      {
        ...suggestion,
        genres: ["Drama & Romance"],
        status: "want",
        tmdbRating: 8.8,
        popularity: 77,
        year: 2022,
        originalLanguage: "en",
        originCountry: ["US"],
        voteCount: 1200,
      },
      "want",
      1,
      {
        metadata: {
          actionType: "card_opened",
          previousStatus: "want",
        },
      },
    ).metadata,
    {
      actionType: "card_opened",
      previousStatus: "want",
      matchScore: 93,
      modelVersion: "vector-content-v1.2-negative-feedback",
      recommendationScore: 91,
      tmdbRating: 8.8,
      popularity: 77,
      year: 2022,
      status: "want",
      genres: ["Drama & Romance"],
      originalLanguage: "en",
      originCountry: ["US"],
      voteCount: 1200,
    },
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
      modelVersion: "vector-content-v1.2-negative-feedback",
      metadata: {
        matchScore: 93,
        modelVersion: "vector-content-v1.2-negative-feedback",
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
      modelVersion: "vector-content-v1.2-negative-feedback",
      source: "tmdb",
      page: "ai",
      items: [
        {
          tvShowId: "show-1",
          tmdbId: 95396,
          title: "Severance",
          score: 93,
          position: 1,
          modelVersion: "vector-content-v1.2-negative-feedback",
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
        modelVersion: "vector-content-v1.2-negative-feedback",
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

test("buildRecommendationFeedbackPayload merges action metadata with show metadata", () => {
  assert.deepEqual(
    buildRecommendationFeedbackPayload(
      {
        ...suggestion,
        status: "watching",
        tmdbRating: 8.947,
        userRating: 8.7,
      },
      "accepted_watched",
      {
        rating: 9.4,
        sourcePage: "watching",
        metadata: {
          previousStatus: "watching",
          nextStatus: "watched",
          actionType: "move_to_watched",
        },
      },
    ).metadata,
    {
      sourcePage: "watching",
      previousStatus: "watching",
      nextStatus: "watched",
      actionType: "move_to_watched",
      matchScore: 93,
      modelVersion: "vector-content-v1.2-negative-feedback",
      recommendationScore: 91,
      tmdbRating: 8.947,
      userRating: 8.7,
      status: "watching",
    },
  );
});
