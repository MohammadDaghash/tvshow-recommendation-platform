import assert from "node:assert/strict";
import test from "node:test";

import {
  getLibraryActionLabels,
  getLibraryBadgeText,
  getLibraryCardStatusText,
  getSuggestionBadgeText,
} from "./cardPresentation.js";

test("getLibraryCardStatusText shows match score for non-watched cards", () => {
  assert.equal(
    getLibraryCardStatusText({
      status: "want",
      recommendationScore: 57,
    }),
    "Match Score: 57%",
  );

  assert.equal(
    getLibraryCardStatusText({
      status: "watching",
      recommendationScore: 64,
    }),
    "Match Score: 64%",
  );
});

test("getLibraryCardStatusText keeps watched card status as user rating", () => {
  assert.equal(
    getLibraryCardStatusText({
      status: "watched",
      userRating: 8.5,
      recommendationScore: 92,
    }),
    "Your Rating: 8.5",
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

test("getLibraryBadgeText uses TMDB rating on library cards", () => {
  assert.equal(
    getLibraryBadgeText({
      status: "want",
      tmdbRating: 8.234,
      recommendationScore: 71,
    }),
    "TMDB 8.2",
  );

  assert.equal(
    getLibraryBadgeText({
      status: "watching",
      tmdbRating: 7.9,
    }),
    "TMDB 7.9",
  );

  assert.equal(
    getLibraryBadgeText({
      status: "watched",
      userRating: 9.1,
      tmdbRating: 8.8,
    }),
    "TMDB 8.8",
  );
});
