import assert from "node:assert/strict";
import test from "node:test";

import * as suggestionFeedback from "./suggestionFeedback.js";

test("shouldShowIgnoreSuggestionSuccess suppresses success feedback for silent quick actions", () => {
  assert.equal(
    suggestionFeedback.shouldShowIgnoreSuggestionSuccess({ silent: true }),
    false,
  );
});

test("shouldShowIgnoreSuggestionSuccess keeps success feedback by default", () => {
  assert.equal(suggestionFeedback.shouldShowIgnoreSuggestionSuccess(), true);
  assert.equal(
    suggestionFeedback.shouldShowIgnoreSuggestionSuccess({ silent: false }),
    true,
  );
});

test("admin suggestion cards use the same viewer action labels", () => {
  assert.equal(
    typeof suggestionFeedback.getSuggestionActionLabels,
    "function",
  );

  assert.deepEqual(
    suggestionFeedback.getSuggestionActionLabels({ role: "admin" }),
    [
      "Not Interested",
      "Add to Want to Watch",
      "Add to Currently Watching",
      "Add to Watched",
    ],
  );
  assert.equal(
    suggestionFeedback
      .getSuggestionActionLabels({ role: "admin" })
      .includes("Add to Catalog"),
    false,
  );
});
