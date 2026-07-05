import { useCallback, useState } from "react";
import { apiUrl } from "../api.js";
import { authHeaders, parseJSONResponse } from "../httpClient.js";
import { readStoredSession } from "../sessionStorage.js";

const SCORE_FIELDS = [
  "genreSimilarity",
  "categoryPreference",
  "tmdbRating",
  "popularity",
  "yearSimilarity",
];

const emptyState = {
  explanation: "",
  emphasizedFactor: "",
  loading: false,
  error: "",
  resetKey: null,
};

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  );

const normalizeScoreBreakdown = (scoreBreakdown = {}) =>
  Object.fromEntries(
    SCORE_FIELDS.map((field) => [field, Number(scoreBreakdown[field] || 0)]),
  );

const normalizeSimilarWatchedShows = (similarWatchedShows = []) =>
  similarWatchedShows.slice(0, 3).map((show) => ({
    title: show.title,
    similarity: Number(show.similarity || 0),
  }));

export function buildRecommendationExplanationPayload(show) {
  return compactObject({
    recommendationScore: show.recommendationScore ?? show.matchScore ?? 0,
    scoreBreakdown: normalizeScoreBreakdown(show.scoreBreakdown),
    similarWatchedShows: normalizeSimilarWatchedShows(
      show.similarWatchedShows || [],
    ),
    recommendationLogId: show.recommendationLogId,
    position: show.position,
    sourcePage: show.sourcePage,
  });
}

const getUnavailableMessage = (reason) => {
  if (reason === "daily_limit_reached") {
    return "Daily explanation limit reached. Try again tomorrow.";
  }

  if (reason === "disabled") {
    return "Explanation writing is not enabled in this environment.";
  }

  if (reason === "timeout") {
    return "The explanation took too long. Try again.";
  }

  if (reason === "rate_limited") {
    return "Explanation writing is busy right now. Try again later.";
  }

  return "Explanation is unavailable right now.";
};

export function useRecommendationExplanation(resetKey) {
  const [state, setState] = useState(emptyState);
  const visibleState = state.resetKey === resetKey ? state : emptyState;

  const fetchExplanation = useCallback(async (show) => {
    const token = readStoredSession()?.token;

    if (!token) {
      setState({
        ...emptyState,
        error: "Sign in to generate a personal explanation.",
        resetKey,
      });
      return null;
    }

    setState({
      ...emptyState,
      loading: true,
      resetKey,
    });

    try {
      const response = await fetch(
        apiUrl(`/api/recommendations/${show._id}/explanation`),
        {
          method: "POST",
          headers: authHeaders(token, {
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(buildRecommendationExplanationPayload(show)),
        },
      );
      const data = await parseJSONResponse(response);

      setState({
        explanation: data.explanation || "",
        emphasizedFactor: data.emphasizedFactor || "",
        loading: false,
        error: data.explanation ? "" : getUnavailableMessage(data.reason),
        resetKey,
      });

      return data;
    } catch (error) {
      setState({
        ...emptyState,
        error: error.message || "Explanation is unavailable right now.",
        resetKey,
      });

      return null;
    }
  }, [resetKey]);

  return {
    ...visibleState,
    fetchExplanation,
  };
}
