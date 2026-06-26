import assert from "node:assert/strict";
import test from "node:test";

import { shouldShowIgnoreSuggestionSuccess } from "./suggestionFeedback.js";

test("shouldShowIgnoreSuggestionSuccess suppresses success feedback for silent quick actions", () => {
  assert.equal(shouldShowIgnoreSuggestionSuccess({ silent: true }), false);
});

test("shouldShowIgnoreSuggestionSuccess keeps success feedback by default", () => {
  assert.equal(shouldShowIgnoreSuggestionSuccess(), true);
  assert.equal(shouldShowIgnoreSuggestionSuccess({ silent: false }), true);
});
