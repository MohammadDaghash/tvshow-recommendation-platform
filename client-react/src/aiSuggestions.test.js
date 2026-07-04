import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAISuggestionCandidates,
  getTopAISuggestions,
} from "./aiSuggestions.js";

const suggestion = (index, score) => ({
  tmdbId: index,
  title: `Suggestion ${index}`,
  matchScore: score,
});

test("getTopAISuggestions returns exactly 20 suggestions sorted by match score", () => {
  const suggestions = Array.from({ length: 24 }, (_, index) => {
    return suggestion(index + 1, 24 - index);
  });

  const topSuggestions = getTopAISuggestions(suggestions);

  assert.equal(topSuggestions.length, 20);
  assert.deepEqual(
    topSuggestions.map((show) => show.matchScore),
    Array.from({ length: 20 }, (_, index) => 24 - index),
  );
});

test("getTopAISuggestions removes ignored ids before taking the top 20", () => {
  const suggestions = Array.from({ length: 22 }, (_, index) => {
    return suggestion(index + 1, 100 - index);
  });

  const topSuggestions = getTopAISuggestions(suggestions, [1, 2]);

  assert.equal(topSuggestions.length, 20);
  assert.equal(topSuggestions[0].tmdbId, 3);
  assert.equal(topSuggestions.at(-1).tmdbId, 22);
});

test("buildAISuggestionCandidates keeps 20 visible picks when ignored ids shrink the live source", () => {
  const staleLiveSuggestions = Array.from({ length: 20 }, (_, index) => {
    return suggestion(index + 1, 100 - index);
  });
  const fallbackSuggestions = Array.from({ length: 12 }, (_, index) => {
    return suggestion(index + 21, 70 - index);
  });

  const candidates = buildAISuggestionCandidates({
    fallbackSuggestions,
    mlSuggestions: staleLiveSuggestions,
    recommendations: [],
    usesPublicDataset: false,
  });
  const topSuggestions = getTopAISuggestions(candidates, [1, 2, 3, 4, 5, 6]);

  assert.equal(topSuggestions.length, 20);
  assert.deepEqual(
    topSuggestions.slice(-6).map((show) => show.tmdbId),
    [21, 22, 23, 24, 25, 26],
  );
});

test("buildAISuggestionCandidates excludes normal user library shows from fallback suggestions", () => {
  const candidates = buildAISuggestionCandidates({
    fallbackSuggestions: [suggestion(1, 90), suggestion(2, 80)],
    mlSuggestions: [],
    recommendations: [
      {
        ...suggestion(1, 95),
        status: "want",
      },
    ],
    usesPublicDataset: false,
  });

  assert.deepEqual(
    candidates.map((show) => show.tmdbId),
    [2],
  );
});

test("getTopAISuggestions keeps real ML poster suggestions ahead of fallback fillers", () => {
  const realSuggestions = Array.from({ length: 20 }, (_, index) => ({
    ...suggestion(index + 1, 60 - index),
    imageUrl: `https://image.tmdb.org/t/p/w500/poster-${index + 1}.jpg`,
  }));
  const fallbackSuggestions = Array.from({ length: 4 }, (_, index) => ({
    ...suggestion(index + 21, 99 - index),
    isFallbackSuggestion: true,
  }));

  const topSuggestions = getTopAISuggestions([
    ...realSuggestions,
    ...fallbackSuggestions,
  ]);

  assert.equal(topSuggestions.length, 20);
  assert.ok(topSuggestions.every((show) => !show.isFallbackSuggestion));
  assert.deepEqual(
    topSuggestions.slice(0, 3).map((show) => show.tmdbId),
    [1, 2, 3],
  );
});
