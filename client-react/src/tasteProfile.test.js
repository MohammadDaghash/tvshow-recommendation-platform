import assert from "node:assert/strict";
import test from "node:test";

import {
  canEditTasteProfile,
  getKeywordColumnTitle,
  getSignalEffectText,
  getSignalTone,
  getTasteProfileScopeLabel,
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

test("getTasteProfileScopeLabel keeps signed-in users out of demo fallback", () => {
  assert.equal(
    getTasteProfileScopeLabel({
      currentUser: { _id: "user-1", role: "user" },
      dataScope: undefined,
    }),
    "Private profile",
  );

  assert.equal(
    getTasteProfileScopeLabel({
      currentUser: { _id: "admin-1", role: "admin" },
      dataScope: undefined,
    }),
    "Demo profile",
  );

  assert.equal(
    getTasteProfileScopeLabel({
      currentUser: null,
      dataScope: undefined,
    }),
    "Demo profile",
  );
});

test("canEditTasteProfile trusts the current session when profile fetch fails", () => {
  assert.equal(
    canEditTasteProfile({
      currentUser: { _id: "user-1" },
      profileCanEdit: false,
    }),
    true,
  );

  assert.equal(
    canEditTasteProfile({
      currentUser: null,
      profileCanEdit: true,
    }),
    true,
  );

  assert.equal(
    canEditTasteProfile({
      currentUser: null,
      profileCanEdit: false,
    }),
    false,
  );
});
