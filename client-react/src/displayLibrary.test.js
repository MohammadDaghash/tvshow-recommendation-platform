import assert from "node:assert/strict";
import test from "node:test";

import {
  getRecommendationFetchToken,
  getDisplayGenre,
  getFilterGenres,
  getNormalizedDisplayGenres,
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
    show("This Is Us", ["Drama", "Romance"]),
    show("Dark", ["Thriller"]),
    show("Mindhunter", ["Crime"]),
    show("The Witcher", ["Fantasy"]),
    show("Foundation", ["Sci-Fi & Fantasy"]),
    show("Ace Attorney", ["Legal"]),
    show("The Crown", ["History"]),
  ]);

  assert.deepEqual(
    groupedShows.map((group) => group.category),
    [
      "Comedy",
      "Drama & Romance",
      "Mystery & Thriller",
      "Science-Fiction & Fantasy",
      "Legal",
      "History",
    ],
  );
});

test("groupShowsByCategory uses the active genre filter as the section heading", () => {
  const groupedShows = groupShowsByCategory(
    [show("Bridgerton", ["Drama", "Romance"])],
    "Drama & Romance",
  );

  assert.deepEqual(
    groupedShows.map((group) => [group.category, group.shows[0].title]),
    [["Drama & Romance", "Bridgerton"]],
  );
});

test("getNormalizedDisplayGenres canonicalizes, removes Family, and deduplicates genres", () => {
  assert.deepEqual(
    getNormalizedDisplayGenres([
      "Action",
      "Adventure",
      "Action & Adventure",
      "Family",
      "Sci-Fi",
      "Sci-Fi & Fantasy",
      "Science-Fiction",
      "Fantasy",
      "Supernatural",
      "Sports",
      "Crime",
      "Mystery",
      "Thriller",
    ]),
    [
      "Action & Adventure",
      "Science-Fiction & Fantasy",
      "Mystery & Thriller",
    ],
  );
});

test("getDisplayGenre applies special comedy and romance rules before priority", () => {
  assert.equal(
    getDisplayGenre(["Comedy", "Drama", "Romance"]),
    "Drama & Romance",
  );
  assert.equal(getDisplayGenre(["Comedy", "Drama"]), "Comedy");
  assert.equal(getDisplayGenre(["Comedy", "Romance"]), "Comedy");
});

test("getDisplayGenre uses deterministic priority for rare genres", () => {
  assert.equal(
    getDisplayGenre(["Comedy", "Drama", "Sci-Fi & Fantasy"]),
    "Science-Fiction & Fantasy",
  );
  assert.equal(
    getDisplayGenre(["Drama", "Crime", "Legal"]),
    "Mystery & Thriller",
  );
  assert.equal(getDisplayGenre(["Family"]), "Other");
});

test("getFilterGenres returns canonical genres without Family or redundant source genres", () => {
  const filterGenres = getFilterGenres([
    show("Adventure Show", ["Action", "Adventure", "Family"]),
    show("Space Show", ["Sci-Fi", "Sci-Fi & Fantasy"]),
    show("Love Story", ["Drama", "Romance"]),
  ]);

  assert.deepEqual(filterGenres, [
    "All",
    "Drama & Romance",
    "Action & Adventure",
    "Science-Fiction & Fantasy",
  ]);
});

test("getFilterGenres returns only the canonical taxonomy in friendly order", () => {
  const filterGenres = getFilterGenres([
    show("Comedy", ["Comedy"]),
    show("Drama", ["Drama"]),
    show("Action", ["Action"]),
    show("Crime", ["Crime"]),
    show("Space", ["Science-Fiction"]),
    show("Anime", ["Anime"]),
    show("Horror", ["Horror"]),
    show("Legal", ["Legal"]),
    show("History", ["History"]),
    show("Unknown", ["Family", "Sports"]),
  ]);

  assert.deepEqual(filterGenres, [
    "All",
    "Comedy",
    "Drama & Romance",
    "Action & Adventure",
    "Mystery & Thriller",
    "Science-Fiction & Fantasy",
    "Anime",
    "Horror",
    "Legal",
    "History",
  ]);
});
