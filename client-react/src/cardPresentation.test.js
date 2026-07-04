import assert from "node:assert/strict";
import test from "node:test";

import {
  getLibraryActionLabels,
  getLibraryCardStatusText,
  getSuggestionBadgeText,
} from "./cardPresentation.js";

test("getLibraryCardStatusText omits duplicate match score text for want-to-watch cards", () => {
  assert.equal(
    getLibraryCardStatusText({
      status: "want",
      recommendationScore: 57,
    }),
    null,
  );
});

test("getLibraryCardStatusText keeps watched and currently watching card status text", () => {
  assert.equal(
    getLibraryCardStatusText({
      status: "watched",
      userRating: 8.5,
    }),
    "Your Rating: 8.5",
  );

  assert.equal(
    getLibraryCardStatusText({
      status: "watching",
    }),
    "In progress",
  );
});

test("getLibraryActionLabels returns watched card actions in viewer order", () => {
  assert.deepEqual(getLibraryActionLabels("watched"), [
    "Move to Currently Watching",
    "Move to Want to Watch",
    "Change Rating",
    "Delete",
  ]);
});

test("getLibraryActionLabels returns page actions without catalog labels", () => {
  assert.deepEqual(getLibraryActionLabels("want"), [
    "Move to Currently Watching",
    "Move to Watched",
    "Delete",
  ]);
  assert.deepEqual(getLibraryActionLabels("watching"), [
    "Move to Want to Watch",
    "Move to Watched",
    "Delete",
  ]);
});

test("getSuggestionBadgeText uses TMDB rating instead of duplicate match score", () => {
  assert.equal(
    getSuggestionBadgeText({
      matchScore: 92,
      tmdbRating: 8.734,
    }),
    "TMDB 8.7",
  );
});
