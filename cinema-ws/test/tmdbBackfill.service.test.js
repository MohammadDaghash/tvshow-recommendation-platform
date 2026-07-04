const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildTMDBMetadataUpdate,
  needsTMDBMetadataBackfill,
  parseBackfillArgs,
  selectTMDBSearchMatch,
} = require("../services/tmdbBackfill.service");

test("needsTMDBMetadataBackfill detects missing catalog metadata", () => {
  assert.equal(
    needsTMDBMetadataBackfill({
      title: "Friends",
      genres: ["Comedy"],
      year: 1994,
      imageUrl: "poster.jpg",
      tmdbId: 1668,
      tmdbRating: 8.4,
      popularity: 120,
      overview: "A sitcom.",
    }),
    false,
  );

  assert.equal(
    needsTMDBMetadataBackfill({
      title: "Friends",
      tmdbId: 1668,
      tmdbRating: null,
      popularity: 120,
      overview: "A sitcom.",
    }),
    true,
  );

  assert.equal(
    needsTMDBMetadataBackfill({
      title: "Friends",
      tmdbRating: 8.4,
      popularity: 120,
      overview: "A sitcom.",
    }),
    true,
  );
});

test("selectTMDBSearchMatch uses exact normalized title and year", () => {
  const match = selectTMDBSearchMatch(
    {
      title: "Smiley",
      year: 2022,
    },
    [
      {
        tmdbId: 26338,
        title: "Tavis Smiley",
        year: 2004,
      },
      {
        tmdbId: 214609,
        title: "Smiley",
        year: 2022,
      },
    ],
  );

  assert.deepEqual(match, {
    status: "matched",
    candidate: {
      tmdbId: 214609,
      title: "Smiley",
      year: 2022,
    },
  });
});

test("selectTMDBSearchMatch flags ambiguous exact matches", () => {
  const match = selectTMDBSearchMatch(
    {
      title: "The Office",
      year: 2005,
    },
    [
      {
        tmdbId: 2316,
        title: "The Office",
        year: 2005,
      },
      {
        tmdbId: 9999,
        title: "The Office",
        year: 2005,
      },
    ],
  );

  assert.equal(match.status, "ambiguous");
  assert.equal(match.candidates.length, 2);
});

test("buildTMDBMetadataUpdate keeps user and existing catalog fields safe", () => {
  const update = buildTMDBMetadataUpdate(
    {
      title: "Friends",
      genres: ["Comedy"],
      year: 1994,
      imageUrl: "tmdb-poster.jpg",
      overview: "Six friends in New York.",
      popularity: 240,
      tmdbRating: 8.4,
      tmdbId: 1668,
      userRating: 2,
      watched: false,
      status: "want",
      recommendationScore: 4,
    },
    {
      genres: ["Comedy", "Romance"],
      year: 1994,
      imageUrl: "existing-poster.jpg",
      userRating: 9.7,
      watched: true,
      status: "watched",
      recommendationScore: 96,
    },
  );

  assert.deepEqual(update, {
    overview: "Six friends in New York.",
    popularity: 240,
    tmdbRating: 8.4,
    tmdbId: 1668,
  });
});

test("parseBackfillArgs defaults to dry-run and accepts apply and limit flags", () => {
  assert.deepEqual(parseBackfillArgs([]), {
    apply: false,
    dryRun: true,
    limit: null,
    title: "",
  });

  assert.deepEqual(parseBackfillArgs(["--apply", "--limit=5", "--title=Friends"]), {
    apply: true,
    dryRun: false,
    limit: 5,
    title: "Friends",
  });
});
