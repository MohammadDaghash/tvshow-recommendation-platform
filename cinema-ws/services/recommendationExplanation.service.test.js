const assert = require("node:assert/strict");
const test = require("node:test");

const axios = require("axios");

const servicePath = require.resolve("./recommendationExplanation.service");

const loadService = (apiKey = "test-anthropic-key") => {
  delete require.cache[servicePath];

  if (apiKey) {
    process.env.ANTHROPIC_API_KEY = apiKey;
  } else {
    delete process.env.ANTHROPIC_API_KEY;
  }

  return require("./recommendationExplanation.service");
};

const scoreBreakdown = {
  genreSimilarity: 81,
  categoryPreference: 66,
  tmdbRating: 92,
  popularity: 74,
  yearSimilarity: 40,
};

const mockClaudeJSON = (payload) => {
  axios.post = async () => ({
    data: {
      content: [
        {
          text: JSON.stringify(payload),
        },
      ],
    },
  });
};

test.afterEach(() => {
  delete require.cache[servicePath];
  delete process.env.ANTHROPIC_API_KEY;
});

test("hasPersonalizationSignal and hasAnySignal branch on real score signals", () => {
  const {
    hasAnySignal,
    hasPersonalizationSignal,
  } = loadService();

  assert.equal(hasPersonalizationSignal({ tmdbRating: 90 }, []), false);
  assert.equal(hasPersonalizationSignal({ genreSimilarity: 1 }, []), true);
  assert.equal(hasPersonalizationSignal({ categoryPreference: 1 }, []), true);
  assert.equal(hasPersonalizationSignal({}, [{ title: "Breaking Bad" }]), true);

  assert.equal(hasAnySignal({}, []), false);
  assert.equal(hasAnySignal({ popularity: 24 }, []), true);
  assert.equal(hasAnySignal({ tmdbRating: 90 }, []), true);
});

test("getExplanation skips Claude and returns the fixed fallback with no signals", async () => {
  const service = loadService();
  let callCount = 0;
  axios.post = async () => {
    callCount += 1;
    throw new Error("Claude should not be called");
  };

  const result = await service.getExplanation({
    showTitle: "Unknown Pick",
    recommendationScore: 0,
    scoreBreakdown: {},
    similarWatchedShows: [],
  });

  assert.equal(callCount, 0);
  assert.deepEqual(result, {
    explanation: service.FALLBACK_EXPLANATION,
    emphasizedFactor: "general",
    fallback: true,
    reason: null,
    cached: false,
  });
});

test("getExplanation returns disabled without calling Claude when the API key is unset", async () => {
  const service = loadService("");
  let callCount = 0;
  axios.post = async () => {
    callCount += 1;
  };

  const result = await service.getExplanation({
    showTitle: "Severance",
    recommendationScore: 91,
    scoreBreakdown,
    similarWatchedShows: [{ title: "Breaking Bad", similarity: 0.8 }],
  });

  assert.equal(callCount, 0);
  assert.deepEqual(result, {
    explanation: null,
    emphasizedFactor: null,
    fallback: true,
    reason: "disabled",
    cached: false,
  });
});

test("getExplanation rejects Claude output that names an unrecognized show", async () => {
  const service = loadService();
  mockClaudeJSON({
    explanation: "Severance fits because it has the same workplace energy as The Office.",
    emphasizedFactor: "similarity",
  });

  const result = await service.getExplanation({
    showTitle: "Severance",
    recommendationScore: 91,
    scoreBreakdown,
    similarWatchedShows: [{ title: "Breaking Bad", similarity: 0.8 }],
  });

  assert.equal(result.explanation, service.FALLBACK_EXPLANATION);
  assert.equal(result.emphasizedFactor, "general");
  assert.equal(result.fallback, true);
});

test("getExplanation rejects emphasized factors unsupported by the score breakdown", async () => {
  const service = loadService();
  mockClaudeJSON({
    explanation: "Severance is a quality pick while your profile develops.",
    emphasizedFactor: "quality",
  });

  const result = await service.getExplanation({
    showTitle: "Severance",
    recommendationScore: 50,
    scoreBreakdown: {
      genreSimilarity: 55,
      categoryPreference: 0,
      tmdbRating: 0,
      popularity: 0,
      yearSimilarity: 0,
    },
    similarWatchedShows: [],
  });

  assert.equal(result.explanation, service.FALLBACK_EXPLANATION);
  assert.equal(result.emphasizedFactor, "general");
  assert.equal(result.fallback, true);
});

test("getExplanation returns validated Claude text for supported output", async () => {
  const service = loadService();
  mockClaudeJSON({
    explanation: "Severance lines up with the genres you tend to rate highly.",
    emphasizedFactor: "genre",
  });

  const result = await service.getExplanation({
    showTitle: "Severance",
    recommendationScore: 91,
    scoreBreakdown,
    similarWatchedShows: [{ title: "Breaking Bad", similarity: 0.8 }],
  });

  assert.equal(
    result.explanation,
    "Severance lines up with the genres you tend to rate highly.",
  );
  assert.equal(result.emphasizedFactor, "genre");
  assert.equal(result.fallback, false);
  assert.equal(result.reason, null);
  assert.equal(result.model, "claude-haiku-4-5");
  assert.equal(typeof result.latencyMs, "number");
});
