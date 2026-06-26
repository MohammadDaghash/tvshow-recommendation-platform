import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "./api";
import { getTopAISuggestions } from "./aiSuggestions";
import { buildDemoLibrary } from "./demoLibrary";
import { getLibraryActionLabels } from "./cardPresentation";
import {
  AddShowModal,
  AuthModal,
  ConfirmDeleteModal,
  DetailsModal,
  NoticeModal,
  RatingModal,
} from "./components/AppModals";
import { AppContent } from "./components/AppContent";
import { LoadingScreen } from "./components/LoadingScreen";
import { LibraryCard, SuggestionCard } from "./components/ShowCards";
import {
  getSuggestionActionLabels,
  shouldShowIgnoreSuggestionSuccess,
} from "./suggestionFeedback";
import {
  getDisplayGenreList,
  getFilterGenres,
  getNormalizedDisplayGenres,
  getRecommendationFetchToken,
  groupShowsByCategory,
  shouldUsePublicDataset,
} from "./displayLibrary";
import { getLeadCarouselConfig } from "./pageLayout";
import "./App.css";

const SESSION_STORAGE_KEY = "tvshowUserSession";
const LEGACY_ADMIN_TOKEN_KEY = "adminToken";

const pageConfig = {
  watched: {
    label: "Watched",
    emptyTitle: "No watched shows yet",
    emptyText: "Mark shows as watched and rate them to improve your suggestions.",
  },
  want: {
    label: "Want to Watch",
    emptyTitle: "Your watchlist is empty",
    emptyText: "Add shows from AI Suggestions or move shows here for later.",
  },
  watching: {
    label: "Currently Watching",
    emptyTitle: "Nothing in progress",
    emptyText: "Start watching a show to keep it visible while you work through it.",
  },
  ai: {
    label: "AI Suggestions",
    emptyTitle: "No AI suggestions right now",
    emptyText: "Rate more watched shows or try again after adding more to your list.",
  },
};

function readStoredSession() {
  try {
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);

    if (storedSession) {
      return JSON.parse(storedSession);
    }

    const legacyAdminToken = localStorage.getItem(LEGACY_ADMIN_TOKEN_KEY);

    if (legacyAdminToken) {
      return {
        token: legacyAdminToken,
        user: null,
      };
    }
  } catch (error) {
    console.error(error);
  }

  return null;
}

function saveStoredSession(session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

  if (session.user?.role === "admin") {
    localStorage.setItem(LEGACY_ADMIN_TOKEN_KEY, session.token);
  } else {
    localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
  }
}

function clearStoredSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
}

function authHeaders(token, headers = {}) {
  return token
    ? {
        ...headers,
        Authorization: `Bearer ${token}`,
      }
    : headers;
}

async function parseJSONResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed. Please try again.");
  }

  return data;
}

async function fetchInitialData(token) {
  const authenticatedOptions = token
    ? {
        headers: authHeaders(token),
      }
    : undefined;

  const [recommendationsResponse, mlSuggestionsResponse] = await Promise.all([
    fetch(apiUrl("/api/recommendations"), authenticatedOptions),
    fetch(apiUrl("/api/ml-recommendations/tmdb"), authenticatedOptions),
  ]);

  if (!recommendationsResponse.ok || !mlSuggestionsResponse.ok) {
    throw new Error("The server did not return the required TV show data.");
  }

  const [nextRecommendations, nextMlSuggestions] = await Promise.all([
    recommendationsResponse.json(),
    mlSuggestionsResponse.json(),
  ]);

  return {
    nextRecommendations,
    nextMlSuggestions,
  };
}

async function fetchIgnoredSuggestionIds(token) {
  if (!token) return [];

  const response = await fetch(apiUrl("/api/ignored-suggestions"), {
    headers: authHeaders(token),
  });

  if (!response.ok) return [];

  const ignoredSuggestions = await response.json();

  return ignoredSuggestions.map((suggestion) => suggestion.tmdbId);
}

function App() {
  const [authSession, setAuthSession] = useState(readStoredSession);
  const [recommendations, setRecommendations] = useState([]);
  const [mlSuggestions, setMlSuggestions] = useState([]);
  const [initialLoad, setInitialLoad] = useState({
    status: "loading",
    error: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [activePage, setActivePage] = useState("watched");
  const [ratingTarget, setRatingTarget] = useState(null);
  const [ratingInput, setRatingInput] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newShowTitle, setNewShowTitle] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [tmdbResults, setTmdbResults] = useState([]);
  const [selectedTMDBShow, setSelectedTMDBShow] = useState(null);
  const [detailsShow, setDetailsShow] = useState(null);
  const [showToDelete, setShowToDelete] = useState(null);
  const [authModal, setAuthModal] = useState(null);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [ignoredSuggestionIds, setIgnoredSuggestionIds] = useState([]);

  const currentUser = authSession?.user || null;
  const authToken = authSession?.token || "";
  const isAdmin = currentUser?.role === "admin";
  const isDemoMode = !currentUser;
  const usesPublicDataset = shouldUsePublicDataset(currentUser);
  const isAdminCatalogMode = isAdmin && usesPublicDataset;

  const loadAppData = useCallback(async (token = "") => {
    setInitialLoad({
      status: "loading",
      error: "",
    });

    try {
      const [{ nextRecommendations, nextMlSuggestions }, nextIgnoredIds] =
        await Promise.all([
          fetchInitialData(token),
          fetchIgnoredSuggestionIds(token),
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
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function hydrateApp() {
      const storedSession = readStoredSession();

      if (!storedSession?.token) {
        await loadAppData("");
        return;
      }

      try {
        const response = await fetch(apiUrl("/api/auth/me"), {
          headers: authHeaders(storedSession.token),
        });
        const data = await parseJSONResponse(response);

        if (!isCurrent) return;

        const nextSession = {
          token: storedSession.token,
          user: data.user,
        };

        saveStoredSession(nextSession);
        setAuthSession(nextSession);
        await loadAppData(getRecommendationFetchToken(nextSession));
      } catch (error) {
        console.error(error);
        clearStoredSession();

        if (!isCurrent) return;

        setAuthSession(null);
        await loadAppData("");
      }
    }

    hydrateApp();

    return () => {
      isCurrent = false;
    };
  }, [loadAppData]);

  const hasOpenModal = Boolean(
    authModal ||
      detailsShow ||
      isAddModalOpen ||
      notice ||
      ratingTarget ||
      showToDelete,
  );

  useEffect(() => {
    document.body.classList.toggle("modal-open", hasOpenModal);

    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [hasOpenModal]);

  const demoLibrary = useMemo(
    () => buildDemoLibrary(recommendations),
    [recommendations],
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
    () => getTopAISuggestions(mlSuggestions, ignoredSuggestionIds),
    [ignoredSuggestionIds, mlSuggestions],
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

  const handlePageChange = (page) => {
    setActivePage(page);
    setSearchTerm("");
    setSelectedGenre("All");
  };

  const showNotice = (type, title, message) => {
    setNotice({
      type,
      title,
      message,
    });
  };

  const openAuthModal = (mode, message = "") => {
    setAuthModal(mode);
    setAuthError(message);
    setAuthForm({
      name: "",
      email: "",
      password: "",
    });
  };

  const requireUser = (message = "Log in to manage your private watch list.") => {
    if (currentUser) return true;

    openAuthModal("login", message);
    return false;
  };

  const promptForPrivateList = () => {
    openAuthModal(
      "login",
      "Sign in to copy this action into your own private watch list.",
    );
  };

  const requireAdmin = (action) => {
    if (!isAdmin) {
      openAuthModal("admin", "Admin access is required for this action.");
      return;
    }

    action();
  };

  const refreshRecommendations = async () => {
    const { nextRecommendations } = await fetchInitialData(
      getRecommendationFetchToken(authSession),
    );
    setRecommendations(nextRecommendations);
  };

  const refreshMLSuggestions = async () => {
    const token = getRecommendationFetchToken(authSession);
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
  };

  const handleAuthSubmit = async () => {
    setAuthBusy(true);
    setAuthError("");

    try {
      const isSignup = authModal === "signup";
      const response = await fetch(
        apiUrl(isSignup ? "/api/auth/register" : "/api/auth/login"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: authForm.name,
            email: authForm.email,
            password: authForm.password,
          }),
        },
      );

      const data = await parseJSONResponse(response);

      if (authModal === "admin" && data.user.role !== "admin") {
        setAuthError("This account does not have admin access.");
        return;
      }

      const nextSession = {
        token: data.token,
        user: data.user,
      };

      saveStoredSession(nextSession);
      setAuthSession(nextSession);
      setAuthModal(null);
      setAuthForm({
        name: "",
        email: "",
        password: "",
      });
      await loadAppData(getRecommendationFetchToken(nextSession));
      showNotice(
        "success",
        isSignup ? "Account created" : "Logged in",
        `Welcome${data.user.name ? `, ${data.user.name}` : ""}.`,
      );
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const logout = async () => {
    clearStoredSession();
    setAuthSession(null);
    setIgnoredSuggestionIds([]);
    setActivePage("ai");
    await loadAppData("");
    showNotice("success", "Logged out", "Your private list is no longer shown.");
  };

  const updateLibraryStatus = async (
    show,
    status,
    { userRating, successMessage } = {},
  ) => {
    if (!requireUser()) return;

    try {
      const response = await fetch(
        apiUrl(
          isAdminCatalogMode
            ? `/api/recommendations/${show._id}/catalog-status`
            : `/api/recommendations/${show._id}/status`,
        ),
        {
          method: "PATCH",
          headers: authHeaders(authToken, {
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            status,
            userRating,
          }),
        },
      );

      await parseJSONResponse(response);
      await refreshRecommendations();
      setDetailsShow(null);
      setActivePage(status === "want" ? "want" : status);
      showNotice("success", "List updated", successMessage);
    } catch (error) {
      showNotice("error", "Could not update list", error.message);
    }
  };

  const openRatingModal = (show) => {
    if (!requireUser()) return;

    setDetailsShow(null);
    setRatingTarget(show);
    setRatingInput(show.userRating ? String(show.userRating) : "");
  };

  const openSuggestionRatingModal = (show) => {
    if (!requireUser()) return;

    setDetailsShow(null);
    setRatingTarget({
      ...show,
      isAISuggestion: true,
    });
    setRatingInput("");
  };

  const submitRating = async () => {
    const rating = Number(ratingInput);

    if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
      showNotice("error", "Invalid rating", "Rating must be between 0 and 10.");
      return;
    }

    if (ratingTarget.isAISuggestion) {
      await addSuggestionToLibrary(ratingTarget, "watched", {
        userRating: rating,
        successMessage: "Saved to Watched and recalculated your AI suggestions.",
      });
    } else {
      await updateLibraryStatus(ratingTarget, "watched", {
        userRating: rating,
        successMessage: "Saved to Watched with your rating.",
      });
    }

    setRatingTarget(null);
    setRatingInput("");
  };

  const removeFromLibrary = async (show) => {
    if (!requireUser()) return;

    try {
      const response = await fetch(
        apiUrl(`/api/recommendations/${show._id}/library`),
        {
          method: "DELETE",
          headers: authHeaders(authToken),
        },
      );

      await parseJSONResponse(response);
      await refreshRecommendations();
      setDetailsShow(null);
      showNotice("success", "Removed", `${show.title} was removed from your list.`);
    } catch (error) {
      showNotice("error", "Could not remove show", error.message);
    }
  };

  const addSuggestionToLibrary = async (
    show,
    status,
    { userRating, successMessage } = {},
  ) => {
    if (!requireUser()) return;

    try {
      const response = await fetch(apiUrl("/api/recommendations/from-tmdb"), {
        method: "POST",
        headers: authHeaders(authToken, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          tmdbId: show.tmdbId,
          status,
          userRating,
        }),
      });

      await parseJSONResponse(response);
      await refreshRecommendations();
      await refreshMLSuggestions();
      setDetailsShow(null);
      setActivePage(status === "want" ? "want" : status);
      showNotice(
        "success",
        "Added to your list",
        successMessage ||
          `${show.title} was moved to ${pageConfig[status === "want" ? "want" : status].label}.`,
      );
    } catch (error) {
      showNotice("error", "Could not add show", error.message);
    }
  };

  const ignoreSuggestion = async (tmdbId, title, options = {}) => {
    if (!requireUser()) return;

    try {
      const response = await fetch(apiUrl("/api/ignored-suggestions"), {
        method: "POST",
        headers: authHeaders(authToken, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          tmdbId,
          title,
        }),
      });

      await parseJSONResponse(response);
      setIgnoredSuggestionIds((previousIds) =>
        previousIds.includes(tmdbId) ? previousIds : [...previousIds, tmdbId],
      );
      await refreshMLSuggestions();
      setDetailsShow(null);

      if (shouldShowIgnoreSuggestionSuccess(options)) {
        showNotice("success", "Suggestion hidden", `${title} will stay hidden.`);
      }
    } catch (error) {
      showNotice("error", "Could not hide suggestion", error.message);
    }
  };

  const searchTMDBShows = async () => {
    if (!newShowTitle.trim()) {
      return;
    }

    try {
      const response = await fetch(
        apiUrl(`/api/tmdb/search?title=${encodeURIComponent(newShowTitle)}`),
      );
      const results = await parseJSONResponse(response);

      setTmdbResults(results);
    } catch (error) {
      showNotice("error", "Search failed", error.message);
    }
  };

  const importTVShow = async (tmdbId) => {
    setIsImporting(true);

    try {
      const response = await fetch(apiUrl("/api/tmdb/import"), {
        method: "POST",
        headers: authHeaders(authToken, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          tmdbId,
        }),
      });

      await parseJSONResponse(response);
      await refreshRecommendations();
      await refreshMLSuggestions();

      setDetailsShow(null);
      setNewShowTitle("");
      setTmdbResults([]);
      setSelectedTMDBShow(null);
      setIsAddModalOpen(false);
      setActivePage("want");
      showNotice("success", "Show imported", "The catalog has been updated.");
    } catch (error) {
      showNotice("error", "Import failed", error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const deleteTVShow = async (showId) => {
    try {
      const response = await fetch(apiUrl(`/api/recommendations/${showId}`), {
        method: "DELETE",
        headers: authHeaders(authToken),
      });

      await parseJSONResponse(response);
      await refreshRecommendations();
      await refreshMLSuggestions();
      setShowToDelete(null);
      setDetailsShow(null);
      showNotice("success", "Catalog show deleted", "The show was removed.");
    } catch (error) {
      showNotice("error", "Delete failed", error.message);
    }
  };

  const requestCatalogDelete = (show) => {
    setDetailsShow(null);
    setShowToDelete(show);
  };

  const formatDisplayGenres = (genres) => {
    return getDisplayGenreList(genres).join(", ");
  };

  const renderActionButton = ({
    label,
    className,
    onClick,
    disabled = false,
    actionKey = label,
  }) => (
    <button
      key={actionKey}
      className={`${className} compact-action`}
      disabled={disabled}
      onClick={isDemoMode ? promptForPrivateList : onClick}
    >
      {label}
    </button>
  );

  const renderShowAction = (show, label) => {
    if (label === "Move to Currently Watching") {
      return renderActionButton({
        label,
        className: "watch-button",
        onClick: () =>
          updateLibraryStatus(show, "watching", {
            successMessage: "Moved to Currently Watching.",
          }),
      });
    }

    if (label === "Move to Want to Watch") {
      return renderActionButton({
        label,
        className: "secondary-button",
        onClick: () =>
          updateLibraryStatus(show, "want", {
            successMessage: "Moved to Want to Watch.",
          }),
      });
    }

    if (label === "Move to Watched" || label === "Change Rating") {
      return renderActionButton({
        label,
        className: "watch-button",
        onClick: () => openRatingModal(show),
      });
    }

    return renderActionButton({
      label,
      className: "danger-button",
      onClick: () =>
        isAdminCatalogMode ? requestCatalogDelete(show) : removeFromLibrary(show),
    });
  };

  const renderShowActions = (show) => (
    <>
      {getLibraryActionLabels(show.status).map((label) =>
        renderShowAction(show, label),
      )}
    </>
  );

  const renderSuggestionAction = (show, label) => {
    if (label === "Not Interested") {
      return renderActionButton({
        label,
        className: "danger-button",
        onClick: () => ignoreSuggestion(show.tmdbId, show.title),
      });
    }

    if (label === "Add to Want to Watch") {
      return renderActionButton({
        label,
        className: "secondary-button",
        onClick: () => addSuggestionToLibrary(show, "want"),
      });
    }

    if (label === "Add to Currently Watching") {
      return renderActionButton({
        label,
        className: "secondary-button",
        onClick: () => addSuggestionToLibrary(show, "watching"),
      });
    }

    return renderActionButton({
      label,
      className: "watch-button",
      onClick: () => openSuggestionRatingModal(show),
    });
  };

  const renderSuggestionActions = (show) => (
    <>
      {getSuggestionActionLabels(currentUser).map((label) =>
        renderSuggestionAction(show, label),
      )}
    </>
  );

  const handleQuickIgnoreSuggestion = (event, show) => {
    event.stopPropagation();

    if (isDemoMode) {
      promptForPrivateList();
      return;
    }

    ignoreSuggestion(show.tmdbId, show.title, { silent: true });
  };

  const renderCard = (show) => (
    <LibraryCard
      formatGenres={formatDisplayGenres}
      key={show._id}
      onSelect={setDetailsShow}
      show={show}
    />
  );

  const renderSuggestionCard = (show) => (
    <SuggestionCard
      formatGenres={formatDisplayGenres}
      key={show.tmdbId || show.title}
      onQuickIgnore={handleQuickIgnoreSuggestion}
      onSelect={setDetailsShow}
      show={show}
    />
  );

  const renderPageCard = activePage === "ai" ? renderSuggestionCard : renderCard;

  if (initialLoad.status !== "ready") {
    return (
      <LoadingScreen
        error={initialLoad.status === "error" ? initialLoad.error : ""}
        onRetry={() => loadAppData(getRecommendationFetchToken(authSession))}
      />
    );
  }

  return (
    <div className="app">
      <AppContent
        activePage={activePage}
        allGenres={allGenres}
        currentUser={currentUser}
        filteredShows={filteredShows}
        groupedShows={groupedShows}
        handlePageChange={handlePageChange}
        isAdmin={isAdmin}
        isDemoMode={isDemoMode}
        leadCarouselConfig={leadCarouselConfig}
        leadCarouselShows={leadCarouselShows}
        logout={logout}
        openAuthModal={openAuthModal}
        pageConfig={pageConfig}
        pageCounts={pageCounts}
        requireAdmin={requireAdmin}
        renderPageCard={renderPageCard}
        searchTerm={searchTerm}
        selectedGenre={selectedGenre}
        setIsAddModalOpen={setIsAddModalOpen}
        setSearchTerm={setSearchTerm}
        setSelectedGenre={setSelectedGenre}
        visibleAISuggestions={visibleAISuggestions}
        wantShows={wantShows}
        watchedShows={watchedShows}
        watchingShows={watchingShows}
      />

      <RatingModal
        ratingInput={ratingInput}
        ratingTarget={ratingTarget}
        setRatingInput={setRatingInput}
        setRatingTarget={setRatingTarget}
        submitRating={submitRating}
      />

      <AddShowModal
        importTVShow={importTVShow}
        isAddModalOpen={isAddModalOpen}
        isImporting={isImporting}
        newShowTitle={newShowTitle}
        searchTMDBShows={searchTMDBShows}
        selectedTMDBShow={selectedTMDBShow}
        setIsAddModalOpen={setIsAddModalOpen}
        setNewShowTitle={setNewShowTitle}
        setSelectedTMDBShow={setSelectedTMDBShow}
        setTmdbResults={setTmdbResults}
        tmdbResults={tmdbResults}
      />

      <DetailsModal
        detailsShow={detailsShow}
        formatDisplayGenres={formatDisplayGenres}
        isAdmin={isAdmin}
        isAdminCatalogMode={isAdminCatalogMode}
        isDemoMode={isDemoMode}
        renderShowActions={renderShowActions}
        renderSuggestionActions={renderSuggestionActions}
        setDetailsShow={setDetailsShow}
        setShowToDelete={setShowToDelete}
      />

      <ConfirmDeleteModal
        deleteTVShow={deleteTVShow}
        setShowToDelete={setShowToDelete}
        showToDelete={showToDelete}
      />

      <AuthModal
        authBusy={authBusy}
        authError={authError}
        authForm={authForm}
        authModal={authModal}
        handleAuthSubmit={handleAuthSubmit}
        openAuthModal={openAuthModal}
        setAuthForm={setAuthForm}
        setAuthModal={setAuthModal}
      />

      <NoticeModal notice={notice} setNotice={setNotice} />
    </div>
  );
}

export default App;
