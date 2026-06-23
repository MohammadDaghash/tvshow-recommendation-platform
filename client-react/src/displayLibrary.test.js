import assert from "node:assert/strict";
import test from "node:test";

import {
  getRecommendationFetchToken,
  groupShowsByCategory,
  shouldUsePublicDataset,
} from "./displayLibrary.js";

const show = (title, genres) => ({
  _id: title.toLowerCase().replaceAll(" ", "-"),
  title,
  genres,
});

test("admin sessions use the public dataset while normal users use private data", () => {
  assert.equal(shouldUsePublicDataset(null), true);
  assert.equal(shouldUsePublicDataset({ role: "admin" }), true);
  assert.equal(shouldUsePublicDataset({ role: "user" }), false);

  assert.equal(
    getRecommendationFetchToken({
      token: "admin-token",
      user: { role: "admin" },
    }),
    "",
  );
  assert.equal(
    getRecommendationFetchToken({
      token: "user-token",
      user: { role: "user" },
    }),
    "user-token",
  );
});

test("groupShowsByCategory creates clear genre sections", () => {
  const groupedShows = groupShowsByCategory([
    show("The Office", ["Comedy"]),
    show("This Is Us", ["Drama"]),
    show("Dark", ["Thriller"]),
    show("Bridgerton", ["Romance"]),
    show("Mindhunter", ["Crime"]),
    show("The Witcher", ["Fantasy"]),
    show("Foundation", ["Sci-Fi & Fantasy"]),
  ]);

  assert.deepEqual(
    groupedShows.map((group) => group.category),
    ["Comedy", "Drama", "Thriller", "Romance", "Crime", "Fantasy", "Sci-Fi"],
  );
});

test("groupShowsByCategory uses the active genre filter as the section heading", () => {
  const groupedShows = groupShowsByCategory(
    [show("Bridgerton", ["Drama", "Romance"])],
    "Romance",
  );

  assert.deepEqual(
    groupedShows.map((group) => [group.category, group.shows[0].title]),
    [["Romance", "Bridgerton"]],
  );
});
