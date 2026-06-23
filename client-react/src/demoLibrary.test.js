import assert from "node:assert/strict";
import test from "node:test";

import { buildDemoLibrary } from "./demoLibrary.js";

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

test("buildDemoLibrary falls back to unwatched catalog shows without status", () => {
  const library = buildDemoLibrary([
    { ...show("watched", undefined), watched: true },
    { ...show("unwatched", undefined), watched: false },
  ]);

  assert.equal(library.watchedShows[0].status, "watched");
  assert.equal(library.watchingShows[0].status, "watching");
});
