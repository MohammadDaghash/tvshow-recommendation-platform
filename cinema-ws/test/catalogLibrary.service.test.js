const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildCatalogShowUpdate,
} = require("../services/catalogLibrary.service");

test("buildCatalogShowUpdate marks public catalog shows as currently watching", () => {
  assert.deepEqual(buildCatalogShowUpdate("watching", { userRating: 8 }), {
    status: "watching",
    watched: false,
    userRating: null,
  });
});

test("buildCatalogShowUpdate requires a rating when marking watched", () => {
  assert.throws(
    () => buildCatalogShowUpdate("watched", {}),
    /Rating is required/,
  );

  assert.deepEqual(buildCatalogShowUpdate("watched", { userRating: 9 }), {
    status: "watched",
    watched: true,
    userRating: 9,
  });
});
