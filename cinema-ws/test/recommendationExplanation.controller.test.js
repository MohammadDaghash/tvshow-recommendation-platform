const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createRecommendationExplanationController,
} = require("../controllers/recommendationExplanation.controller");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const validBody = {
  recommendationScore: 91,
  scoreBreakdown: {
    genreSimilarity: 82,
    categoryPreference: 70,
    tmdbRating: 90,
    popularity: 75,
    yearSimilarity: 30,
  },
  similarWatchedShows: [{ title: "Breaking Bad", similarity: 0.8 }],
  recommendationLogId: "log-1",
  position: 3,
  sourcePage: "want",
};

const show = {
  _id: "show-1",
  tmdbId: 95396,
  title: "Severance",
};

test("getExplanation rejects malformed score payloads", async () => {
  const controller = createRecommendationExplanationController();
  const res = createResponse();

  await controller.getExplanation(
    {
      params: { id: "show-1" },
      user: { _id: "user-1" },
      body: {
        recommendationScore: 91,
        scoreBreakdown: {
          genreSimilarity: 101,
        },
      },
    },
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /scoreBreakdown/);
});

test("getExplanation returns 404 when the TV show does not exist", async () => {
  const controller = createRecommendationExplanationController({
    TVShowModel: {
      findById: async () => null,
    },
  });
  const res = createResponse();

  await controller.getExplanation(
    {
      params: { id: "missing-show" },
      user: { _id: "user-1" },
      body: validBody,
    },
    res,
  );

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, {
    message: "TV show not found",
  });
});

test("getExplanation short-circuits at the daily explanation limit", async () => {
  let serviceCalls = 0;
  const controller = createRecommendationExplanationController({
    TVShowModel: {
      findById: async () => show,
    },
    UserInteractionModel: {
      countDocuments: async () => 50,
      create: async () => {
        throw new Error("should not create");
      },
    },
    explanationService: {
      getExplanation: async () => {
        serviceCalls += 1;
      },
    },
  });
  const res = createResponse();

  await controller.getExplanation(
    {
      params: { id: "show-1" },
      user: { _id: "user-1" },
      body: validBody,
    },
    res,
  );

  assert.equal(serviceCalls, 0);
  assert.deepEqual(res.body, {
    explanation: null,
    emphasizedFactor: null,
    cached: false,
    fallback: true,
    reason: "daily_limit_reached",
  });
});

test("getExplanation uses the canonical title and records successful explanation views", async () => {
  const createdEvents = [];
  const controller = createRecommendationExplanationController({
    TVShowModel: {
      findById: async () => show,
    },
    UserInteractionModel: {
      countDocuments: async (query) => {
        assert.equal(query.user, "user-1");
        assert.equal(query.eventType, "explanation_viewed");
        assert.ok(query.createdAt.$gte instanceof Date);
        return 4;
      },
      create: async (event) => {
        createdEvents.push(event);
        return event;
      },
    },
    explanationService: {
      getExplanation: async (payload) => {
        assert.equal(payload.showTitle, "Severance");
        assert.equal(payload.recommendationScore, 91);
        return {
          explanation: "Severance lines up with genres you rate highly.",
          emphasizedFactor: "genre",
          cached: false,
          fallback: false,
          reason: null,
          model: "claude-haiku-4-5",
          latencyMs: 987,
        };
      },
    },
  });
  const res = createResponse();

  await controller.getExplanation(
    {
      params: { id: "show-1" },
      user: { _id: "user-1" },
      body: {
        ...validBody,
        showTitle: "Client Spoofed Title",
      },
    },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.explanation, "Severance lines up with genres you rate highly.");
  assert.deepEqual(createdEvents, [
    {
      user: "user-1",
      eventType: "explanation_viewed",
      tvShow: "show-1",
      tmdbId: 95396,
      title: "Severance",
      recommendationLog: "log-1",
      sourcePage: "want",
      position: 3,
      metadata: {
        claudeModel: "claude-haiku-4-5",
        latencyMs: 987,
        deduped: false,
      },
    },
  ]);
});
