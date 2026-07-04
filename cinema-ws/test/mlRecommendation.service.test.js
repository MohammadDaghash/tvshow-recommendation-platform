const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AI_SUGGESTION_CANDIDATE_LIMIT,
  buildTMDBSuggestionRequest,
  buildTMDBRecommendations,
  resolveSuggestionProfileShows,
} = require("../services/mlRecommendation.service");

const tmdbShow = (id, voteAverage = 9) => ({
  id,
  name: `TMDB Show ${id}`,
  genre_ids: [35],
  first_air_date: "2024-01-01",
  poster_path: `/poster-${id}.jpg`,
  overview: `Overview ${id}`,
  vote_average: voteAverage,
  popularity: 90 - id,
});

test("AI_SUGGESTION_CANDIDATE_LIMIT keeps an extra refill buffer beyond 20 visible picks", () => {
  assert.equal(AI_SUGGESTION_CANDIDATE_LIMIT, 40);
  assert.ok(AI_SUGGESTION_CANDIDATE_LIMIT > 20);
});

test("buildTMDBRecommendations filters excluded candidates before limiting to 20", () => {
  const recommendations = buildTMDBRecommendations({
    tmdbResults: Array.from({ length: 23 }, (_, index) => tmdbShow(index + 1)),
    watchedShows: [
      {
        title: "Liked Comedy",
        genres: ["Comedy"],
        userRating: 9,
      },
    ],
    excludedTMDBIds: [1, 2, 3],
    excludedTitles: [],
    limit: 20,
  });

  assert.equal(recommendations.length, 20);
  assert.deepEqual(
    recommendations.map((show) => show.tmdbId),
    Array.from({ length: 20 }, (_, index) => index + 4),
  );
});

test("buildTMDBRecommendations excludes candidates by normalized title", () => {
  const recommendations = buildTMDBRecommendations({
    tmdbResults: [tmdbShow(1), tmdbShow(2), tmdbShow(3)],
    watchedShows: [
      {
        title: "Liked Comedy",
        genres: ["Comedy"],
        userRating: 9,
      },
    ],
    excludedTMDBIds: [],
    excludedTitles: [" tmdb show 2 "],
    limit: 20,
  });

  assert.deepEqual(
    recommendations.map((show) => show.tmdbId),
    [1, 3],
  );
});

test("resolveSuggestionProfileShows does not fall back to public taste data for empty normal users", () => {
  const catalogWatchedShows = [
    {
      title: "Admin Watched Show",
      genres: ["Drama"],
      userRating: 10,
    },
  ];

  assert.deepEqual(
    resolveSuggestionProfileShows({
      user: {
        role: "user",
      },
      personalizedWatchedShows: [],
      catalogWatchedShows,
    }),
    [],
  );
});

test("resolveSuggestionProfileShows keeps public taste data for visitors and admin", () => {
  const catalogWatchedShows = [
    {
      title: "Public Demo Show",
      genres: ["Comedy"],
      userRating: 9,
    },
  ];

  assert.deepEqual(
    resolveSuggestionProfileShows({
      user: null,
      personalizedWatchedShows: [],
      catalogWatchedShows,
    }),
    catalogWatchedShows,
  );

  assert.deepEqual(
    resolveSuggestionProfileShows({
      user: {
        role: "admin",
      },
      personalizedWatchedShows: [],
      catalogWatchedShows,
    }),
    catalogWatchedShows,
  );
});

test("buildTMDBSuggestionRequest uses top-rated shows for cold-start users", () => {
  assert.deepEqual(
    buildTMDBSuggestionRequest({
      apiKey: "tmdb-key",
      favoriteGenreIds: [],
      page: 2,
    }),
    {
      path: "/tv/top_rated",
      params: {
        api_key: "tmdb-key",
        language: "en-US",
        page: 2,
      },
    },
  );
});

test("buildTMDBSuggestionRequest uses genre discovery after the user has a profile", () => {
  assert.deepEqual(
    buildTMDBSuggestionRequest({
      apiKey: "tmdb-key",
      favoriteGenreIds: [35],
      page: 1,
    }),
    {
      path: "/discover/tv",
      params: {
        api_key: "tmdb-key",
        sort_by: "vote_average.desc",
        "vote_count.gte": 50,
        language: "en-US",
        page: 1,
        with_genres: 35,
      },
    },
  );
});
