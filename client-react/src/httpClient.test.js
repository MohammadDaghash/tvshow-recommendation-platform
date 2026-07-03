import assert from "node:assert/strict";
import test from "node:test";

import { fetchInitialData } from "./httpClient.js";

const jsonResponse = (data, init = {}) => {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
};

test("fetchInitialData keeps recommendations when optional ML suggestions fail", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    if (url.endsWith("/api/recommendations")) {
      return jsonResponse([
        {
          title: "Demo Show",
        },
      ]);
    }

    return jsonResponse(
      {
        message: "Failed to generate TMDB recommendations",
      },
      {
        status: 500,
      },
    );
  };

  try {
    const data = await fetchInitialData("");

    assert.deepEqual(data, {
      nextRecommendations: [
        {
          title: "Demo Show",
        },
      ],
      nextMlSuggestions: [],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
