import { apiUrl } from "./api.js";

export function authHeaders(token, headers = {}) {
  return token
    ? {
        ...headers,
        Authorization: `Bearer ${token}`,
      }
    : headers;
}

export async function parseJSONResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed. Please try again.");
  }

  return data;
}

export async function fetchInitialData(token) {
  const authenticatedOptions = token
    ? {
        headers: authHeaders(token),
      }
    : undefined;

  const [recommendationsResponse, mlSuggestionsResponse] = await Promise.all([
    fetch(apiUrl("/api/recommendations"), authenticatedOptions),
    fetch(apiUrl("/api/ml-recommendations/tmdb"), authenticatedOptions).catch(
      () => null,
    ),
  ]);

  if (!recommendationsResponse.ok) {
    throw new Error("The server did not return the required TV show data.");
  }

  const nextRecommendations = await recommendationsResponse.json();
  const nextMlSuggestions = mlSuggestionsResponse?.ok
    ? await mlSuggestionsResponse.json().catch(() => [])
    : [];

  return {
    nextRecommendations,
    nextMlSuggestions,
  };
}

export async function fetchIgnoredSuggestionIds(token) {
  if (!token) return [];

  const response = await fetch(apiUrl("/api/ignored-suggestions"), {
    headers: authHeaders(token),
  });

  if (!response.ok) return [];

  const ignoredSuggestions = await response.json();

  return ignoredSuggestions.map((suggestion) => suggestion.tmdbId);
}
