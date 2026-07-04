import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLibraryTransitionMetadata,
  getLibraryActionType,
} from "./trackingMetadata.js";

const show = {
  title: "Breaking Bad",
  genres: ["Drama & Romance", "Mystery & Thriller"],
  status: "watching",
  userRating: 8.7,
  matchScore: 92,
  recommendationScore: 89,
  tmdbRating: 8.947,
  originalLanguage: "en",
  originCountry: ["US"],
  voteCount: 18039,
};

test("getLibraryActionType names status transitions consistently", () => {
  assert.equal(getLibraryActionType("watched"), "move_to_watched");
  assert.equal(getLibraryActionType("watching"), "move_to_currently_watching");
  assert.equal(getLibraryActionType("want"), "move_to_want_to_watch");
  assert.equal(getLibraryActionType("none"), "remove_from_library");
});

test("buildLibraryTransitionMetadata keeps clean show and action context", () => {
  assert.deepEqual(
    buildLibraryTransitionMetadata(show, {
      sourcePage: "watching",
      previousStatus: "watching",
      nextStatus: "watched",
      rating: 9.4,
    }),
    {
      sourcePage: "watching",
      previousStatus: "watching",
      nextStatus: "watched",
      actionType: "move_to_watched",
      rating: 9.4,
      matchScore: 92,
      recommendationScore: 89,
      tmdbRating: 8.947,
      userRating: 8.7,
      status: "watching",
      genres: ["Drama & Romance", "Mystery & Thriller"],
      originalLanguage: "en",
      originCountry: ["US"],
      voteCount: 18039,
    },
  );
});
