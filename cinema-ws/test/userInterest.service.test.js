const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildKeywordInterestPayload,
  getKeywordPreferenceScore,
  normalizeKeyword,
} = require("../services/userInterest.service");

test("normalizeKeyword trims, lowercases, and collapses spaces", () => {
  assert.equal(normalizeKeyword("  Legal   Drama  "), "legal drama");
});

test("buildKeywordInterestPayload creates explicit liked and disliked keywords", () => {
  assert.deepEqual(
    buildKeywordInterestPayload({
      userId: "user-1",
      value: "  Zombies ",
      sentiment: "dislike",
    }),
    {
      user: "user-1",
      interestType: "keyword",
      value: "zombies",
      sentiment: "dislike",
      source: "explicit",
      weight: 1,
    },
  );
});

test("getKeywordPreferenceScore boosts likes and caps dislike penalties", () => {
  const score = getKeywordPreferenceScore(
    {
      title: "A Legal Drama",
      overview: "A friendship story with zombies.",
      genres: ["Drama & Romance"],
    },
    [
      {
        value: "legal drama",
        sentiment: "like",
        weight: 1,
      },
      {
        value: "friendship",
        sentiment: "like",
        weight: 1,
      },
      {
        value: "zombies",
        sentiment: "dislike",
        weight: 3,
      },
    ],
  );

  assert.deepEqual(score, {
    value: -4,
    likedMatches: ["legal drama", "friendship"],
    dislikedMatches: ["zombies"],
  });
});

test("buildKeywordInterestPayload rejects empty or invalid keyword input", () => {
  assert.throws(
    () =>
      buildKeywordInterestPayload({
        userId: "user-1",
        value: " ",
        sentiment: "like",
      }),
    /Keyword must be between 2 and 60 characters/,
  );

  assert.throws(
    () =>
      buildKeywordInterestPayload({
        userId: "user-1",
        value: "legal drama",
        sentiment: "maybe",
      }),
    /Keyword sentiment must be like or dislike/,
  );
});
