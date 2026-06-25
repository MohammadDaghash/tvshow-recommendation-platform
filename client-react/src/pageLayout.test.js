import assert from "node:assert/strict";
import test from "node:test";

import { getLeadCarouselConfig } from "./pageLayout.js";

const shows = [
  { _id: "show-1", title: "Show One" },
  { _id: "show-2", title: "Show Two" },
];

test("getLeadCarouselConfig enables carousel-first layout for Want to Watch", () => {
  assert.deepEqual(getLeadCarouselConfig("want", shows), {
    kicker: "Your List",
    title: "Want to Watch",
    countLabel: "2 shows",
    ariaLabel: "Want to Watch carousel",
  });
});

test("getLeadCarouselConfig enables carousel-first layout for Currently Watching", () => {
  assert.deepEqual(getLeadCarouselConfig("watching", shows), {
    kicker: "In Progress",
    title: "Currently Watching",
    countLabel: "2 shows",
    ariaLabel: "Currently Watching carousel",
  });
});

test("getLeadCarouselConfig keeps AI Suggestions carousel-first and Watched grouped-only", () => {
  assert.deepEqual(getLeadCarouselConfig("ai", shows), {
    kicker: "Recommendation Engine",
    title: "Top AI Suggestions",
    countLabel: "2 picks",
    ariaLabel: "Top AI Suggestions",
  });

  assert.equal(getLeadCarouselConfig("watched", shows), null);
});

test("getLeadCarouselConfig suppresses empty lead carousels", () => {
  assert.equal(getLeadCarouselConfig("want", []), null);
});
