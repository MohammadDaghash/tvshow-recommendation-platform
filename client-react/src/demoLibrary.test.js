import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDemoAISuggestions,
  buildDemoLibrary,
} from "./demoLibrary.js";

const show = (id, status, score = 50) => ({
  _id: id,
  title: `Show ${id}`,
  status,
  recommendationScore: score,
});

test("buildDemoLibrary preserves public watched catalog shows", () => {
  const library = buildDemoLibrary([
    show("watched-1", "watched", 20),
    show("want-1", "want", 99),
  ]);

  assert.deepEqual(
    library.watchedShows.map((item) => item._id),
    ["watched-1"],
  );
});

test("buildDemoLibrary creates a currently watching demo lane from top want shows", () => {
  const library = buildDemoLibrary([
    show("low", "want", 20),
    show("high", "want", 99),
    show("mid", "want", 70),
  ]);

  assert.deepEqual(
    library.watchingShows.map((item) => [item._id, item.status]),
    [
      ["high", "watching"],
      ["mid", "watching"],
    ],
  );
  assert.deepEqual(
    library.wantShows.map((item) => item._id),
    ["low"],
  );
});

test("buildDemoLibrary can avoid synthetic currently watching rows for editable public data", () => {
  const library = buildDemoLibrary(
    [
      show("low", "want", 20),
      show("high", "want", 99),
      show("mid", "want", 70),
    ],
    {
      deriveWatching: false,
    },
  );

  assert.deepEqual(library.watchingShows, []);
  assert.deepEqual(
    library.wantShows.map((item) => item._id),
    ["high", "mid", "low"],
  );
});

test("buildDemoLibrary preserves explicit currently watching rows in editable public data", () => {
  const library = buildDemoLibrary(
    [
      show("want-1", "want", 20),
      show("watching-1", "watching", 99),
    ],
    {
      deriveWatching: false,
    },
  );

  assert.deepEqual(
    library.watchingShows.map((item) => [item._id, item.status]),
    [["watching-1", "watching"]],
  );
  assert.deepEqual(
    library.wantShows.map((item) => item._id),
    ["want-1"],
  );
});

test("buildDemoLibrary keeps the legacy numeric watching count argument", () => {
  const library = buildDemoLibrary(
    [
      show("low", "want", 20),
      show("high", "want", 99),
      show("mid", "want", 70),
    ],
    1,
  );

  assert.deepEqual(
    library.watchingShows.map((item) => item._id),
    ["high"],
  );
});

test("buildDemoLibrary supports an options object with a custom derived watching count", () => {
  const library = buildDemoLibrary(
    [
      show("low", "want", 20),
      show("high", "want", 99),
      show("mid", "want", 70),
    ],
    {
      demoWatchingCount: 1,
      deriveWatching: true,
    },
  );

  assert.deepEqual(
    library.watchingShows.map((item) => item._id),
    ["high"],
  );
});

test("buildDemoLibrary falls back to unwatched catalog shows without status", () => {
  const library = buildDemoLibrary([
    { ...show("watched", undefined), watched: true },
    { ...show("unwatched", undefined), watched: false },
  ]);

  assert.equal(library.watchedShows[0].status, "watched");
  assert.equal(library.watchingShows[0].status, "watching");
});

test("buildDemoLibrary uses bundled public demo data when the API catalog is empty", () => {
  const library = buildDemoLibrary([]);

  assert.ok(library.watchedShows.length > 0);
  assert.ok(library.wantShows.length > 0);
  assert.ok(library.watchingShows.length > 0);
});

test("buildDemoAISuggestions provides enough public fallback candidates", () => {
  const suggestions = buildDemoAISuggestions([]);

  assert.ok(suggestions.length >= 20);
  assert.equal(suggestions[0].isAISuggestion, true);
  assert.equal(typeof suggestions[0].matchScore, "number");
});
