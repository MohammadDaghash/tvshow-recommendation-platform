const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildBaselineReport,
  parseBaselineArgs,
} = require("../services/baselineReport.service");

const tvShows = [
  {
    _id: "show-1",
    title: "Friends",
    genres: ["Comedy"],
    popularity: 120,
    tmdbRating: 8.4,
    tmdbId: 1668,
    status: "watched",
    userRating: 9,
  },
  {
    _id: "show-2",
    title: "Breaking Bad",
    genres: ["Drama", "Crime"],
    popularity: 145,
    tmdbRating: 8.9,
    tmdbId: 1396,
  },
  {
    _id: "show-3",
    title: "One Vote Wonder",
    genres: ["Drama"],
    popularity: 20,
    tmdbRating: 7.1,
    tmdbId: 3000,
  },
];

test("buildBaselineReport ranks popular and TMDB-rated shows", () => {
  const report = buildBaselineReport({
    tvShows,
    userShows: [],
  });

  assert.deepEqual(
    report.topPopular.map((show) => show.title),
    ["Breaking Bad", "Friends", "One Vote Wonder"],
  );

  assert.deepEqual(
    report.topTMDBRated.map((show) => show.title),
    ["Breaking Bad", "Friends", "One Vote Wonder"],
  );
});

test("buildBaselineReport keeps show ids for evaluation matching", () => {
  const report = buildBaselineReport(
    {
      tvShows,
      userShows: [],
    },
    {
      limit: 1,
    },
  );

  assert.equal(report.topPopular[0]._id, "show-2");
});

test("buildBaselineReport ranks user-rated shows with weighted average", () => {
  const report = buildBaselineReport({
    tvShows,
    userShows: [
      {
        _id: "rating-1",
        tvShow: "show-1",
        status: "watched",
        userRating: 9,
      },
      {
        _id: "rating-2",
        tvShow: "show-1",
        status: "watched",
        userRating: 8,
      },
      {
        _id: "rating-3",
        tvShow: "show-2",
        status: "watched",
        userRating: 8,
      },
      {
        _id: "rating-4",
        tvShow: "show-3",
        status: "watched",
        userRating: 10,
      },
      {
        _id: "rating-5",
        tvShow: "show-3",
        status: "want",
        userRating: 10,
      },
    ],
  });

  assert.deepEqual(
    report.topUserRated.map((show) => ({
      title: show.title,
      ratingCount: show.ratingCount,
      averageUserRating: show.averageUserRating,
      weightedUserRating: show.weightedUserRating,
    })),
    [
      {
        title: "Friends",
        ratingCount: 3,
        averageUserRating: 8.67,
        weightedUserRating: 8.72,
      },
      {
        title: "One Vote Wonder",
        ratingCount: 1,
        averageUserRating: 10,
        weightedUserRating: 9.2,
      },
      {
        title: "Breaking Bad",
        ratingCount: 1,
        averageUserRating: 8,
        weightedUserRating: 8.53,
      },
    ],
  );
});

test("buildBaselineReport respects limit", () => {
  const report = buildBaselineReport(
    {
      tvShows,
      userShows: [],
    },
    {
      limit: 2,
    },
  );

  assert.equal(report.topPopular.length, 2);
  assert.equal(report.topTMDBRated.length, 2);
});

test("parseBaselineArgs defaults to text and supports json and limit", () => {
  assert.deepEqual(parseBaselineArgs([]), {
    format: "text",
    limit: 10,
  });

  assert.deepEqual(parseBaselineArgs(["--json", "--limit=5"]), {
    format: "json",
    limit: 5,
  });
});
