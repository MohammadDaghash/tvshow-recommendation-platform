import assert from "node:assert/strict";
import test from "node:test";

import {
  getKeywordColumnTitle,
  getSignalEffectText,
  getSignalTone,
} from "./tasteProfile.js";

test("getSignalEffectText formats positive and negative effects", () => {
  assert.equal(getSignalEffectText(8), "+8");
  assert.equal(getSignalEffectText(-12), "-12");
  assert.equal(getSignalEffectText(0), "0");
  assert.equal(getSignalEffectText("8 / -12"), "8 / -12");
});

test("getKeywordColumnTitle labels liked and disliked keyword groups", () => {
  assert.equal(getKeywordColumnTitle("like"), "Liked keywords");
  assert.equal(getKeywordColumnTitle("dislike"), "Disliked keywords");
});

test("getSignalTone maps score direction into UI tones", () => {
  assert.equal(getSignalTone(0.25), "positive");
  assert.equal(getSignalTone(-0.25), "negative");
  assert.equal(getSignalTone(0), "neutral");
});
