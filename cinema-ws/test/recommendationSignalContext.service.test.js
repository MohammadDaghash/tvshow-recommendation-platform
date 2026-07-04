const assert = require("node:assert/strict");
const test = require("node:test");

const {
  shouldApplySuggestionToCatalog,
  shouldRecordTasteSignals,
  withRecommendationSignalContext,
} = require("../services/recommendationSignalContext.service");

test("shouldRecordTasteSignals allows admin demo actions and normal user actions", () => {
  assert.equal(shouldRecordTasteSignals(null), false);
  assert.equal(shouldRecordTasteSignals({ _id: "admin-1", role: "admin" }), true);
  assert.equal(shouldRecordTasteSignals({ _id: "user-1", role: "user" }), true);
});

test("withRecommendationSignalContext tags admin demo metadata separately", () => {
  assert.deepEqual(
    withRecommendationSignalContext(
      { _id: "admin-1", role: "admin" },
      {
        matchScore: 91,
        emptyValue: undefined,
      },
    ),
    {
      matchScore: 91,
      actorRole: "admin",
      dataScope: "demo",
    },
  );
});

test("withRecommendationSignalContext tags normal users as private data", () => {
  assert.deepEqual(
    withRecommendationSignalContext(
      { _id: "user-1", role: "user" },
      {
        sourcePage: "ai",
      },
    ),
    {
      sourcePage: "ai",
      actorRole: "user",
      dataScope: "private",
    },
  );
});

test("shouldApplySuggestionToCatalog keeps admin AI accepts in demo mode", () => {
  assert.equal(shouldApplySuggestionToCatalog({ role: "admin" }), true);
  assert.equal(shouldApplySuggestionToCatalog({ role: "user" }), false);
  assert.equal(shouldApplySuggestionToCatalog(null), false);
});
