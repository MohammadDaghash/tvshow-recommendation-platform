const assert = require("node:assert/strict");
const test = require("node:test");

const { buildTMDBCatalogUpdate } = require("../services/tmdbCatalog.service");

test("buildTMDBCatalogUpdate keeps user-added suggestions out of watched demo data", () => {
  const update = buildTMDBCatalogUpdate({
    title: "Pa Quererte",
    genres: ["Comedy", "Drama"],
    year: 2020,
    imageUrl: "poster.jpg",
    overview: "A show overview",
    popularity: 12,
    tmdbRating: 7.4,
    tmdbId: 136228,
  });

  assert.equal(update.watched, false);
  assert.equal(update.userRating, null);
  assert.equal(update.recommendationScore, 0);
});
