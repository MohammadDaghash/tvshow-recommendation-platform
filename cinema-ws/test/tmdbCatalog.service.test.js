const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildTMDBCatalogStatusUpdate,
  buildTMDBCatalogUpdate,
} = require("../services/tmdbCatalog.service");

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
    originalLanguage: "es",
    originCountry: ["CO"],
    voteCount: 321,
  });

  assert.equal(update.watched, false);
  assert.equal(update.userRating, null);
  assert.equal(update.recommendationScore, 0);
  assert.equal(update.originalLanguage, "es");
  assert.deepEqual(update.originCountry, ["CO"]);
  assert.equal(update.voteCount, 321);
});

test("buildTMDBCatalogStatusUpdate applies admin AI suggestion actions to demo catalog state", () => {
  const update = buildTMDBCatalogStatusUpdate(
    {
      title: "Severance",
      genres: ["Drama"],
      year: 2022,
      imageUrl: "poster.jpg",
      overview: "Work-life balance.",
      popularity: 120,
      tmdbRating: 8.4,
      tmdbId: 95396,
    },
    "watched",
    { userRating: 9.2 },
  );

  assert.equal(update.status, "watched");
  assert.equal(update.watched, true);
  assert.equal(update.userRating, 9.2);
  assert.equal(update.tmdbId, 95396);
});
