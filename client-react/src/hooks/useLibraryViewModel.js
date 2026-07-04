import { useMemo } from "react";
import { getTopAISuggestions } from "../aiSuggestions";
import {
  buildDemoAISuggestions,
  buildDemoLibrary,
} from "../demoLibrary";
import {
  getFilterGenres,
  getNormalizedDisplayGenres,
  groupShowsByCategory,
  shouldDeriveDemoWatching,
  shouldUsePublicDataset,
} from "../displayLibrary";
import { getLeadCarouselConfig } from "../pageLayout";

export function useLibraryViewModel({
  activePage,
  currentUser,
  ignoredSuggestionIds,
  mlSuggestions,
  recommendations,
  searchTerm,
  selectedGenre,
}) {
  const usesPublicDataset = shouldUsePublicDataset(currentUser);

  const demoLibrary = useMemo(
    () =>
      buildDemoLibrary(recommendations, {
        deriveWatching: shouldDeriveDemoWatching(currentUser),
      }),
    [currentUser, recommendations],
  );

  const privateRecommendations = usesPublicDataset ? [] : recommendations;

  const watchedShows = usesPublicDataset
    ? demoLibrary.watchedShows
    : privateRecommendations
        .filter((show) => show.status === "watched")
        .sort((a, b) => (b.userRating || 0) - (a.userRating || 0));

  const wantShows = usesPublicDataset
    ? demoLibrary.wantShows
    : privateRecommendations
        .filter((show) => show.status === "want")
        .sort((a, b) => b.recommendationScore - a.recommendationScore);

  const watchingShows = usesPublicDataset
    ? demoLibrary.watchingShows
    : privateRecommendations
        .filter((show) => show.status === "watching")
        .sort((a, b) => b.recommendationScore - a.recommendationScore);

  const visibleAISuggestions = useMemo(
    () => {
      const suggestionSource =
        mlSuggestions.length > 0 || !usesPublicDataset
          ? mlSuggestions
          : buildDemoAISuggestions(recommendations);

      return getTopAISuggestions(suggestionSource, ignoredSuggestionIds);
    },
    [ignoredSuggestionIds, mlSuggestions, recommendations, usesPublicDataset],
  );

  const pageShows = useMemo(() => {
    if (activePage === "watched") return watchedShows;
    if (activePage === "want") return wantShows;
    if (activePage === "watching") return watchingShows;
    return visibleAISuggestions;
  }, [activePage, visibleAISuggestions, wantShows, watchedShows, watchingShows]);

  const allGenres = getFilterGenres(pageShows);

  const filteredShows = pageShows.filter((show) => {
    const matchesSearch = show.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesGenre =
      selectedGenre === "All" ||
      getNormalizedDisplayGenres(show.genres).includes(selectedGenre);

    return matchesSearch && matchesGenre;
  });

  const groupedShows = groupShowsByCategory(filteredShows, selectedGenre);
  const leadCarouselShows =
    activePage === "ai" ? visibleAISuggestions : filteredShows;
  const leadCarouselConfig = getLeadCarouselConfig(
    activePage,
    leadCarouselShows,
  );

  const pageCounts = {
    watched: watchedShows.length,
    want: wantShows.length,
    watching: watchingShows.length,
    ai: visibleAISuggestions.length,
  };

  return {
    allGenres,
    filteredShows,
    groupedShows,
    leadCarouselConfig,
    leadCarouselShows,
    pageCounts,
    usesPublicDataset,
    visibleAISuggestions,
    wantShows,
    watchedShows,
    watchingShows,
  };
}
