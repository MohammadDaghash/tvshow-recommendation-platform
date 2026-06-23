const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildTMDBRecommendations,
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
