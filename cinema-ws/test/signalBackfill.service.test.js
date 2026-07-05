const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildSignalBackfillUpdate,
  parseSignalBackfillArgs,
  summarizeSignalBackfill,
} = require("../services/signalBackfill.service");

test("buildSignalBackfillUpdate promotes clean metadata fields without overwriting existing values", () => {
  const update = buildSignalBackfillUpdate(
    {
      sourcePage: "existing-page",
      metadata: {
        sourcePage: "ai",
        position: "4",
        modelVersion: "baseline-v1",
        actionType: "move_to_watched",
        previousStatus: "ai_suggestion",
        nextStatus: "watched",
        recommendationScore: "91",
        matchScore: 93,
        tmdbRating: "8.4",
      },
    },
    {
      includeStatus: true,
    },
  );

  assert.deepEqual(update, {
    position: 4,
    modelVersion: "baseline-v1",
    actionType: "move_to_watched",
    previousStatus: "ai_suggestion",
    nextStatus: "watched",
    status: "watched",
    recommendationScore: 91,
    matchScore: 93,
    tmdbRating: 8.4,
  });
});

test("buildSignalBackfillUpdate skips invalid numbers and unsupported status fields", () => {
  assert.deepEqual(
    buildSignalBackfillUpdate(
      {
        metadata: {
          position: -1,
          recommendationScore: 120,
          matchScore: "not-a-number",
          tmdbRating: 11,
          nextStatus: "watching",
        },
      },
      {
        includeStatus: false,
      },
    ),
    {
      nextStatus: "watching",
    },
  );
});

test("summarizeSignalBackfill counts records that need updates", () => {
  const summary = summarizeSignalBackfill(
    [
      {
        _id: "record-1",
        metadata: {
          sourcePage: "ai",
        },
      },
      {
        _id: "record-2",
        sourcePage: "want",
        metadata: {
          sourcePage: "ai",
        },
      },
      {
        _id: "record-3",
        metadata: {},
      },
    ],
    {
      includeStatus: true,
    },
  );

  assert.deepEqual(summary, {
    scanned: 3,
    wouldUpdate: 1,
    skipped: 2,
    updates: [
      {
        id: "record-1",
        update: {
          sourcePage: "ai",
        },
      },
    ],
  });
});

test("parseSignalBackfillArgs defaults to dry-run and accepts apply", () => {
  assert.deepEqual(parseSignalBackfillArgs([]), {
    apply: false,
    dryRun: true,
    limit: null,
  });

  assert.deepEqual(parseSignalBackfillArgs(["--apply", "--limit=10"]), {
    apply: true,
    dryRun: false,
    limit: 10,
  });
});
