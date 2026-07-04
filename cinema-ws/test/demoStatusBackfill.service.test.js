const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildDemoWatchingStatusUpdate,
  selectDemoWatchingBackfillCandidates,
} = require("../services/demoStatusBackfill.service");

const show = (id, status, score, extra = {}) => ({
  _id: id,
  title: `Show ${id}`,
  status,
  recommendationScore: score,
  watched: false,
  ...extra,
});

test("selectDemoWatchingBackfillCandidates does nothing when explicit watching exists", () => {
  const candidates = selectDemoWatchingBackfillCandidates([
    show("watching", "watching", 99),
    show("want", "want", 80),
  ]);

  assert.deepEqual(candidates, []);
});

test("selectDemoWatchingBackfillCandidates chooses top non-watched public shows", () => {
  const candidates = selectDemoWatchingBackfillCandidates(
    [
      show("watched", "watched", 100, { watched: true }),
      show("low", "want", 20),
      show("high", "want", 99),
      show("fallback", undefined, 70),
    ],
    { limit: 2 },
  );

  assert.deepEqual(
    candidates.map((candidate) => candidate._id),
    ["high", "fallback"],
  );
});

test("buildDemoWatchingStatusUpdate creates an explicit movable watching state", () => {
  assert.deepEqual(buildDemoWatchingStatusUpdate(), {
    status: "watching",
    watched: false,
    userRating: null,
  });
});
