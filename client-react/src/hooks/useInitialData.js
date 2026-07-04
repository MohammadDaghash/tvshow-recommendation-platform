import { useCallback, useState } from "react";
import { apiUrl } from "../api";
import {
  getIgnoredSuggestionFetchToken,
  getMLSuggestionFetchToken,
  getRecommendationFetchToken,
} from "../displayLibrary";
import {
  authHeaders,
  fetchIgnoredSuggestionIds,
  fetchInitialData,
  parseJSONResponse,
} from "../httpClient";

export function useInitialData(authSession) {
  const [recommendations, setRecommendations] = useState([]);
  const [mlSuggestions, setMlSuggestions] = useState([]);
  const [ignoredSuggestionIds, setIgnoredSuggestionIds] = useState([]);
  const [initialLoad, setInitialLoad] = useState({
    status: "loading",
    error: "",
  });

  const loadAppData = useCallback(
    async (token = "", ignoredToken = token, mlSuggestionsToken = token) => {
      setInitialLoad({
        status: "loading",
        error: "",
      });

      try {
        const [{ nextRecommendations, nextMlSuggestions }, nextIgnoredIds] =
          await Promise.all([
            fetchInitialData(token, mlSuggestionsToken),
            fetchIgnoredSuggestionIds(ignoredToken),
          ]);

        setRecommendations(nextRecommendations);
        setMlSuggestions(nextMlSuggestions);
        setIgnoredSuggestionIds(nextIgnoredIds);
        setInitialLoad({
          status: "ready",
          error: "",
        });
      } catch (error) {
        setInitialLoad({
          status: "error",
          error:
            error.message ||
            "Something went wrong while connecting to the database.",
        });
      }
    },
    [],
  );

  const refreshRecommendations = useCallback(async () => {
    const { nextRecommendations } = await fetchInitialData(
      getRecommendationFetchToken(authSession),
    );

    setRecommendations(nextRecommendations);
  }, [authSession]);

  const refreshMLSuggestions = useCallback(async () => {
    const token = getMLSuggestionFetchToken(authSession);
    const response = await fetch(
      apiUrl("/api/ml-recommendations/tmdb"),
      token
        ? {
            headers: authHeaders(token),
          }
        : undefined,
    );
    const data = await parseJSONResponse(response);

    setMlSuggestions(data);
  }, [authSession]);

  const refreshIgnoredSuggestions = useCallback(async () => {
    const ignoredToken = getIgnoredSuggestionFetchToken(authSession);
    const nextIgnoredIds = await fetchIgnoredSuggestionIds(ignoredToken);

    setIgnoredSuggestionIds(nextIgnoredIds);
  }, [authSession]);

  return {
    ignoredSuggestionIds,
    initialLoad,
    loadAppData,
    mlSuggestions,
    recommendations,
    refreshMLSuggestions,
    refreshRecommendations,
    refreshIgnoredSuggestions,
    setIgnoredSuggestionIds,
  };
}
