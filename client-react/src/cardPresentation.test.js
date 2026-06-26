import assert from "node:assert/strict";
import test from "node:test";

import { getLibraryCardStatusText } from "./cardPresentation.js";

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
