import { apiUrl } from "./api";
import { authHeaders, parseJSONResponse } from "./httpClient";

const postInteraction = async (token, path, body) => {
  if (!token) return null;

  try {
    const response = await fetch(apiUrl(path), {
      method: "POST",
      headers: authHeaders(token, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(body),
    });

    return parseJSONResponse(response);
  } catch (error) {
    console.warn("Recommendation tracking failed:", error.message);
    return null;
  }
};

export const trackInteraction = (token, event) =>
  postInteraction(token, "/api/interactions", event);

export const trackInteractionBatch = (token, events) =>
  events.length
    ? postInteraction(token, "/api/interactions/batch", { events })
    : Promise.resolve(null);

export const trackRecommendationLog = (token, payload) =>
  postInteraction(token, "/api/interactions/recommendation-log", payload);

export const trackRecommendationFeedback = (token, payload) =>
  postInteraction(token, "/api/interactions/feedback", payload);
