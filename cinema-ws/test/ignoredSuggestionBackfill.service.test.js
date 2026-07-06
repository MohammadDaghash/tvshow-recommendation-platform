const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildIgnoredSuggestionMetadataUpdate,
  parseIgnoredSuggestionBackfillArgs,
  summarizeIgnoredSuggestionBackfill,
} = require("../services/ignoredSuggestionBackfill.service");

test("buildIgnoredSuggestionMetadataUpdate fills missing ML fields from matching signals", () => {
  const update = buildIgnoredSuggestionMetadataUpdate(
    {
      _id: "ignored-1",
      user: "user-1",
      tmdbId: 123,
      title: "Rejected Sitcom",
    },
    [
      {
        user: "user-1",
        tmdbId: 123,
        eventType: "suggestion_ignored",
        metadata: {
          genres: ["Comedy"],
          tmdbRating: "8.6",
          popularity: "71",
          year: "2021",
          originalLanguage: "en",
          originCountry: ["US"],
          voteCount: "1200",
        },
      },
    ],
  );

  assert.deepEqual(update, {
    genres: ["Comedy"],
    tmdbRating: 8.6,
    popularity: 71,
    year: 2021,
    originalLanguage: "en",
    originCountry: ["US"],
    voteCount: 1200,
    metadata: {
      genres: ["Comedy"],
      tmdbRating: 8.6,
      popularity: 71,
      year: 2021,
      originalLanguage: "en",
      originCountry: ["US"],
      voteCount: 1200,
    },
  });
});

test("buildIgnoredSuggestionMetadataUpdate does not overwrite existing values", () => {
  const update = buildIgnoredSuggestionMetadataUpdate(
    {
      user: "user-1",
      tmdbId: 123,
      title: "Rejected Sitcom",
      genres: ["Comedy"],
      tmdbRating: 9.1,
    },
    [
      {
        user: "user-1",
        tmdbId: 123,
        metadata: {
          genres: ["Drama & Romance"],
          tmdbRating: 7.5,
          popularity: 55,
        },
      },
    ],
  );

  assert.deepEqual(update, {
    popularity: 55,
    metadata: {
      genres: ["Comedy"],
      tmdbRating: 9.1,
      popularity: 55,
    },
  });
});

test("summarizeIgnoredSuggestionBackfill only uses same-user matching signals", () => {
  const summary = summarizeIgnoredSuggestionBackfill(
    [
      {
        _id: "ignored-1",
        user: "user-1",
        tmdbId: 123,
        title: "Rejected Sitcom",
      },
      {
        _id: "ignored-2",
        user: "user-2",
        tmdbId: 456,
        title: "Other Show",
      },
    ],
    [
      {
        user: "user-1",
        tmdbId: 123,
        eventType: "suggestion_ignored",
        metadata: {
          genres: ["Comedy"],
        },
      },
      {
        user: "user-1",
        tmdbId: 456,
        eventType: "suggestion_ignored",
        metadata: {
          genres: ["Horror"],
        },
      },
    ],
  );

  assert.deepEqual(summary, {
    scanned: 2,
    wouldUpdate: 1,
    skipped: 1,
    updates: [
      {
        id: "ignored-1",
        update: {
          genres: ["Comedy"],
          metadata: {
            genres: ["Comedy"],
          },
        },
      },
    ],
  });
});

test("parseIgnoredSuggestionBackfillArgs defaults to dry-run and validates limit", () => {
  assert.deepEqual(parseIgnoredSuggestionBackfillArgs([]), {
    apply: false,
    dryRun: true,
    limit: null,
  });
  assert.deepEqual(parseIgnoredSuggestionBackfillArgs(["--apply", "--limit=5"]), {
    apply: true,
    dryRun: false,
    limit: 5,
  });
  assert.throws(
    () => parseIgnoredSuggestionBackfillArgs(["--limit=0"]),
    /positive integer/,
  );
});
