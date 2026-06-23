import assert from "node:assert/strict";
import test from "node:test";

import { getTopAISuggestions } from "./aiSuggestions.js";

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
