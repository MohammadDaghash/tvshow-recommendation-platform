const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildInteractionEvent,
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
