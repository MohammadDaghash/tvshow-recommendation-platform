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

test("fetchInitialData can keep public recommendations while authenticating ML suggestions", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];

  globalThis.fetch = async (url, options = {}) => {
    requests.push({
      url,
      authorization: options.headers?.Authorization,
    });

    if (url.endsWith("/api/recommendations")) {
      return jsonResponse([{ title: "Public Demo Show" }]);
    }

    return jsonResponse([{ title: "Refilled AI Pick" }]);
  };

  try {
    const data = await fetchInitialData("", "admin-token");

    assert.deepEqual(data, {
      nextRecommendations: [{ title: "Public Demo Show" }],
      nextMlSuggestions: [{ title: "Refilled AI Pick" }],
    });
    assert.deepEqual(
      requests.map((request) => [request.url, request.authorization]),
      [
        ["http://localhost:5001/api/recommendations", undefined],
        [
          "http://localhost:5001/api/ml-recommendations/tmdb",
          "Bearer admin-token",
        ],
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
