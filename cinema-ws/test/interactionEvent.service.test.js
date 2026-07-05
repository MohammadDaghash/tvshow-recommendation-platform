const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildInteractionEvent,
  recordInteractionEvents,
  recordInteractionEvent,
} = require("../services/interactionEvent.service");

test("buildInteractionEvent creates a clean user interaction payload", () => {
  const event = buildInteractionEvent({
    userId: {
      toString: () => "user-1",
    },
    eventType: "suggestion_accepted",
    tvShowId: {
      toString: () => "show-1",
    },
    tmdbId: 1399,
    title: "Game of Thrones",
    sourcePage: "ai",
    rating: 9,
    status: "watched",
    metadata: {
      matchScore: 87,
      emptyValue: undefined,
    },
  });

  assert.deepEqual(event, {
    user: "user-1",
    eventType: "suggestion_accepted",
    tvShow: "show-1",
    tmdbId: 1399,
    title: "Game of Thrones",
    sourcePage: "ai",
    rating: 9,
    status: "watched",
    metadata: {
      matchScore: 87,
    },
  });
});

test("buildInteractionEvent rejects missing users and unsupported events", () => {
  assert.throws(
    () =>
      buildInteractionEvent({
        eventType: "status_changed",
      }),
    /User is required/,
  );

  assert.throws(
    () =>
      buildInteractionEvent({
        userId: "user-1",
        eventType: "clicked_everything",
      }),
    /Unsupported interaction event/,
  );
});

test("recordInteractionEvent persists built events with an injected model", async () => {
  const createdEvents = [];
  const model = {
    create: async (event) => {
      createdEvents.push(event);
      return {
        _id: "event-1",
        ...event,
      };
    },
  };

  const result = await recordInteractionEvent(
    {
      userId: "user-1",
      eventType: "rating_submitted",
      tvShowId: "show-1",
      rating: 8,
      status: "watched",
    },
    { model },
  );

  assert.equal(result._id, "event-1");
  assert.deepEqual(createdEvents, [
    {
      user: "user-1",
      eventType: "rating_submitted",
      tvShow: "show-1",
      rating: 8,
      status: "watched",
      metadata: {},
    },
  ]);
});

test("recordInteractionEvent can fail silently in best-effort mode", async () => {
  const model = {
    create: async () => {
      throw new Error("database unavailable");
    },
  };

  const result = await recordInteractionEvent(
    {
      userId: "user-1",
      eventType: "library_removed",
      tvShowId: "show-1",
    },
    {
      bestEffort: true,
      logger: null,
      model,
    },
  );

  assert.equal(result, null);
});

test("buildInteractionEvent supports card opens and suggestion impressions", () => {
  assert.deepEqual(
    buildInteractionEvent({
      userId: "user-1",
      eventType: "card_opened",
      tvShowId: "show-1",
      title: "Severance",
      sourcePage: "want",
      position: 4,
      modelVersion: "baseline-v1",
    }),
    {
      user: "user-1",
      eventType: "card_opened",
      tvShow: "show-1",
      title: "Severance",
      sourcePage: "want",
      position: 4,
      modelVersion: "baseline-v1",
      metadata: {},
    },
  );

  assert.equal(
    buildInteractionEvent({
      userId: "user-1",
      eventType: "suggestion_impression",
      tmdbId: 95396,
      title: "Severance",
      sourcePage: "ai",
    }).eventType,
    "suggestion_impression",
  );
});

test("buildInteractionEvent supports recommendation explanation views", () => {
  assert.deepEqual(
    buildInteractionEvent({
      userId: "user-1",
      eventType: "explanation_viewed",
      tvShowId: "show-1",
      title: "Severance",
      sourcePage: "want",
      position: 2,
      metadata: {
        claudeModel: "claude-haiku-4-5",
        latencyMs: 1200,
      },
    }),
    {
      user: "user-1",
      eventType: "explanation_viewed",
      tvShow: "show-1",
      title: "Severance",
      sourcePage: "want",
      position: 2,
      metadata: {
        claudeModel: "claude-haiku-4-5",
        latencyMs: 1200,
      },
    },
  );
});

test("buildInteractionEvent supports honest admin catalog maintenance events", () => {
  assert.deepEqual(
    [
      buildInteractionEvent({
        userId: "admin-1",
        eventType: "catalog_imported",
        tmdbId: 95396,
        title: "Severance",
        sourcePage: "admin",
        metadata: {
          actorRole: "admin",
          dataScope: "demo",
        },
      }).eventType,
      buildInteractionEvent({
        userId: "admin-1",
        eventType: "catalog_deleted",
        tmdbId: 95396,
        title: "Severance",
        sourcePage: "admin",
        metadata: {
          actorRole: "admin",
          dataScope: "demo",
        },
      }).eventType,
    ],
    ["catalog_imported", "catalog_deleted"],
  );
});

test("recordInteractionEvents persists a batch of built events", async () => {
  const insertedEvents = [];
  const model = {
    insertMany: async (events) => {
      insertedEvents.push(...events);
      return events.map((event, index) => ({
        _id: `event-${index + 1}`,
        ...event,
      }));
    },
  };

  const result = await recordInteractionEvents(
    [
      {
        userId: "user-1",
        eventType: "suggestion_impression",
        tmdbId: 1,
        title: "Suggestion 1",
        sourcePage: "ai",
      },
      {
        userId: "user-1",
        eventType: "suggestion_impression",
        tmdbId: 2,
        title: "Suggestion 2",
        sourcePage: "ai",
      },
    ],
    { model },
  );

  assert.equal(result.length, 2);
  assert.deepEqual(
    insertedEvents.map((event) => [event.eventType, event.tmdbId]),
    [
      ["suggestion_impression", 1],
      ["suggestion_impression", 2],
    ],
  );
});
