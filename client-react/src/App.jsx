import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "./api";
import { buildDemoLibrary } from "./demoLibrary";
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

function LoadingScreen({ error, onRetry }) {
  return (
    <main className="initial-state-screen">
      <section className="initial-state-card">
        {error ? (
          <>
            <div className="initial-state-icon error-icon">!</div>
            <h1>Unable to load TV show data</h1>
            <p>{error}</p>
            <button className="retry-button" onClick={onRetry}>
              Retry
            </button>
          </>
        ) : (
          <>
            <div className="loading-spinner" aria-hidden="true" />
            <h1>Loading TV show data</h1>
            <p>Connecting to database...</p>
          </>
        )}
      </section>
    </main>
  );
}

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
  const recommendationsOptions = token
    ? {
        headers: authHeaders(token),
      }
    : undefined;

  const [recommendationsResponse, mlSuggestionsResponse] = await Promise.all([
    fetch(apiUrl("/api/recommendations"), recommendationsOptions),
    fetch(apiUrl("/api/ml-recommendations/tmdb")),
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
        await loadAppData(nextSession.token);
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

  const userRecommendations = currentUser ? recommendations : null;

  const watchedShows = currentUser
    ? userRecommendations
        .filter((show) => show.status === "watched")
        .sort((a, b) => (b.userRating || 0) - (a.userRating || 0))
    : demoLibrary.watchedShows;

  const wantShows = currentUser
    ? userRecommendations
        .filter((show) => show.status === "want")
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
    : demoLibrary.wantShows;

  const watchingShows = currentUser
    ? userRecommendations
        .filter((show) => show.status === "watching")
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
    : demoLibrary.watchingShows;

  const visibleAISuggestions = mlSuggestions.filter(
    (show) => !ignoredSuggestionIds.includes(show.tmdbId),
  );

  const pageShows = useMemo(() => {
    if (activePage === "watched") return watchedShows;
    if (activePage === "want") return wantShows;
    if (activePage === "watching") return watchingShows;
    return visibleAISuggestions;
  }, [activePage, visibleAISuggestions, wantShows, watchedShows, watchingShows]);

  const allGenres = [
    "All",
    ...new Set(
      pageShows
        .flatMap((show) => show.genres || [])
        .filter(Boolean)
        .sort(),
    ),
  ];

  const filteredShows = pageShows.filter((show) => {
    const matchesSearch = show.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesGenre =
      selectedGenre === "All" || show.genres?.includes(selectedGenre);

    return matchesSearch && matchesGenre;
  });

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

  const refreshRecommendations = async (token = authToken) => {
    const { nextRecommendations } = await fetchInitialData(token);
    setRecommendations(nextRecommendations);
  };

  const refreshMLSuggestions = async () => {
    const response = await fetch(apiUrl("/api/ml-recommendations/tmdb"));
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
      await loadAppData(nextSession.token);
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
        apiUrl(`/api/recommendations/${show._id}/status`),
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

  const submitRating = async () => {
    const rating = Number(ratingInput);

    if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
      showNotice("error", "Invalid rating", "Rating must be between 0 and 10.");
      return;
    }

    await updateLibraryStatus(ratingTarget, "watched", {
      userRating: rating,
      successMessage: "Saved to Watched with your rating.",
    });
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

  const addSuggestionToLibrary = async (show, status) => {
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
        `${show.title} was moved to ${pageConfig[status === "want" ? "want" : status].label}.`,
      );
    } catch (error) {
      showNotice("error", "Could not add show", error.message);
    }
  };

  const ignoreSuggestion = async (tmdbId, title) => {
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
      setIgnoredSuggestionIds((previousIds) => [...previousIds, tmdbId]);
      setDetailsShow(null);
      showNotice("success", "Suggestion hidden", `${title} will stay hidden.`);
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

  const renderShowActions = (show) => {
    if (isDemoMode) {
      return (
        <button className="watch-button compact-action" onClick={promptForPrivateList}>
          Sign in to use this
        </button>
      );
    }

    if (show.status === "watched") {
      return (
        <>
          <button className="secondary-button compact-action" onClick={() => openRatingModal(show)}>
            Edit Rating
          </button>
          <button className="danger-button compact-action" onClick={() => removeFromLibrary(show)}>
            Remove
          </button>
        </>
      );
    }

    if (show.status === "watching") {
      return (
        <>
          <button className="watch-button compact-action" onClick={() => openRatingModal(show)}>
            Mark Watched
          </button>
          <button
            className="secondary-button compact-action"
            onClick={() =>
              updateLibraryStatus(show, "want", {
                successMessage: "Moved back to Want to Watch.",
              })
            }
          >
            Move to Want
          </button>
          <button className="danger-button compact-action" onClick={() => removeFromLibrary(show)}>
            Stop Watching
          </button>
        </>
      );
    }

    return (
      <>
        <button
          className="watch-button compact-action"
          onClick={() =>
            updateLibraryStatus(show, "watching", {
              successMessage: "Moved to Currently Watching.",
            })
          }
        >
          Start Watching
        </button>
        <button className="secondary-button compact-action" onClick={() => openRatingModal(show)}>
          Mark Watched
        </button>
        <button className="danger-button compact-action" onClick={() => removeFromLibrary(show)}>
          Remove
        </button>
      </>
    );
  };

  const renderCard = (show) => (
    <article className="tv-card" key={show._id} onClick={() => setDetailsShow(show)}>
      <div className="poster-frame">
        <img src={show.imageUrl} alt={show.title} />
        <span className={show.status === "watched" ? "card-badge rating" : "card-badge score"}>
          {show.status === "watched"
            ? `${show.userRating}/10`
            : show.status === "watching"
              ? "Watching"
              : `${show.recommendationScore}%`}
        </span>
      </div>

      <div className="tv-card-body">
        <h3>{show.title}</h3>
        <p className="genre-line">{show.genres.join(", ")}</p>
        <p className="year-line">Year: {show.year}</p>

        {show.status === "watched" ? (
          <p className="rating">Your Rating: {show.userRating}</p>
        ) : show.status === "watching" ? (
          <p className="score">In progress</p>
        ) : (
          <p className="score">Match Score: {show.recommendationScore}%</p>
        )}

        <div className="card-actions" onClick={(event) => event.stopPropagation()}>
          {renderShowActions(show)}
        </div>
      </div>
    </article>
  );

  const renderSuggestionCard = (show) => (
    <article
      className="tv-card ai-card"
      key={show.tmdbId || show.title}
      onClick={() =>
        setDetailsShow({
          ...show,
          isAISuggestion: true,
        })
      }
    >
      <div className="poster-frame">
        <img src={show.imageUrl} alt={show.title} />
        <span className="card-badge score">{show.matchScore}%</span>
      </div>

      <div className="tv-card-body">
        <h3>{show.title}</h3>
        <p className="genre-line">{show.genres.join(", ")}</p>
        <p className="year-line">Year: {show.year}</p>
        <p className="score">Match Score: {show.matchScore}%</p>

        <div className="card-actions" onClick={(event) => event.stopPropagation()}>
          {isDemoMode ? (
            <button className="watch-button compact-action" onClick={promptForPrivateList}>
              Sign in to use this
            </button>
          ) : (
            <>
              <button
                className="watch-button compact-action"
                onClick={() => addSuggestionToLibrary(show, "want")}
              >
                Want
              </button>
              <button
                className="secondary-button compact-action"
                onClick={() => addSuggestionToLibrary(show, "watching")}
              >
                Start
              </button>
              <button
                className="danger-button compact-action"
                onClick={() => ignoreSuggestion(show.tmdbId, show.title)}
              >
                Not Interested
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );

  if (initialLoad.status !== "ready") {
    return (
      <LoadingScreen
        error={initialLoad.status === "error" ? initialLoad.error : ""}
        onRetry={() => loadAppData(authToken)}
      />
    );
  }

  return (
    <div className="app">
      <header className="hero-panel">
        <div className="hero-content">
          <p className="hero-kicker">Streaming Taste Engine</p>
          <h1>TV Show Recommendation Platform</h1>
          {isDemoMode && (
            <p className="demo-mode-pill">
              Demo mode - sign in to create your own private list
            </p>
          )}

          <div className="hero-stats" aria-label="TV show library stats">
            <span>
              <strong>{watchedShows.length}</strong>
              Watched
            </span>
            <span>
              <strong>{wantShows.length}</strong>
              Watchlist
            </span>
            <span>
              <strong>{watchingShows.length}</strong>
              Watching
            </span>
            <span>
              <strong>{visibleAISuggestions.length}</strong>
              AI Picks
            </span>
          </div>
        </div>

        <div className="top-bar">
          {currentUser ? (
            <div className="auth-buttons">
              <span className="session-pill">
                {currentUser.name} {isAdmin ? "(Admin)" : ""}
              </span>
              <button className="secondary-button" onClick={logout}>
                Log Out
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button
                className="secondary-button"
                onClick={() => openAuthModal("login")}
              >
                Login
              </button>

              <button
                className="secondary-button"
                onClick={() => openAuthModal("signup")}
              >
                Sign Up
              </button>

              <button
                className="secondary-button"
                onClick={() => openAuthModal("admin")}
              >
                Admin Login
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="content-shell">
        <div className="control-panel">
          <div className="tabs">
            {Object.entries(pageConfig).map(([page, config]) => (
              <button
                className={activePage === page ? "tab active-tab" : "tab"}
                key={page}
                onClick={() => handlePageChange(page)}
              >
                {config.label}
                <span className="page-count">{pageCounts[page]}</span>
              </button>
            ))}

            <button
              className="add-show-button"
              onClick={() => requireAdmin(() => setIsAddModalOpen(true))}
            >
              + Add TV Show
            </button>
          </div>

          <div className="filters">
            <input
              type="text"
              placeholder="Search TV shows..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="search-input"
            />

            <select
              value={selectedGenre}
              onChange={(event) => setSelectedGenre(event.target.value)}
              className="genre-select"
            >
              {allGenres.map((genre) => (
                <option value={genre} key={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <section className="show-section">
          <h2 className="section-title">{pageConfig[activePage].label}</h2>
          {isDemoMode && (
            <div className="demo-banner">
              <strong>Demo mode</strong>
              <span>
                These public cards show how the app works. Sign in to keep your
                own watched, watchlist, and currently watching data private.
              </span>
            </div>
          )}

          {filteredShows.length === 0 ? (
            <div className="empty-state">
              <h3>{pageConfig[activePage].emptyTitle}</h3>
              <p>{pageConfig[activePage].emptyText}</p>
              {activePage !== "ai" && (
                <button className="secondary-button" onClick={() => handlePageChange("ai")}>
                  Browse AI Suggestions
                </button>
              )}
            </div>
          ) : (
            <div className="show-grid">
              {activePage === "ai"
                ? filteredShows.map(renderSuggestionCard)
                : filteredShows.map(renderCard)}
            </div>
          )}
        </section>
      </main>

      {ratingTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="rating-modal">
            <h2>Rate "{ratingTarget.title}"</h2>
            <p className="modal-subtext">
              Your rating tunes future recommendations for this account.
            </p>

            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={ratingInput}
              onChange={(event) => setRatingInput(event.target.value)}
              placeholder="Enter rating..."
              className="rating-input"
            />

            <div className="modal-buttons">
              <button
                className="cancel-button"
                onClick={() => {
                  setRatingTarget(null);
                  setRatingInput("");
                }}
              >
                Cancel
              </button>

              <button className="save-button" onClick={submitRating}>
                Save Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="add-show-modal">
            <button
              className="close-button"
              onClick={() => {
                setIsAddModalOpen(false);
                setTmdbResults([]);
                setSelectedTMDBShow(null);
              }}
            >
              x
            </button>
            <h2>Add TV Show</h2>
            <p className="modal-subtext">
              Admin catalog imports become available for user lists and recommendations.
            </p>

            <div className="tmdb-search-row">
              <input
                type="text"
                value={newShowTitle}
                onChange={(event) => setNewShowTitle(event.target.value)}
                placeholder="Search TV show..."
                className="rating-input"
              />

              <button className="save-button" onClick={searchTMDBShows}>
                Search
              </button>
            </div>

            <div className="tmdb-results">
              {tmdbResults.map((show) => (
                <div
                  className={
                    selectedTMDBShow?.tmdbId === show.tmdbId
                      ? "tmdb-result selected-tmdb-result"
                      : "tmdb-result"
                  }
                  key={show.tmdbId}
                  onClick={() => setSelectedTMDBShow(show)}
                >
                  {show.imageUrl && <img src={show.imageUrl} alt={show.title} />}

                  <div>
                    <h3>{show.title}</h3>
                    <p>{show.year || "Unknown year"}</p>
                    <p>{show.overview || "No overview available."}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-buttons">
              <button
                className="cancel-button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setTmdbResults([]);
                  setSelectedTMDBShow(null);
                }}
              >
                Cancel
              </button>

              <button
                className="save-button"
                disabled={!selectedTMDBShow || isImporting}
                onClick={() => importTVShow(selectedTMDBShow.tmdbId)}
              >
                {isImporting ? "Importing..." : "Import Selected"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailsShow && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetailsShow(null)}
        >
          <div className="details-modal" onClick={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={() => setDetailsShow(null)}>
              x
            </button>

            <img
              src={detailsShow.imageUrl}
              alt={detailsShow.title}
              className="details-poster"
            />

            <div className="details-content">
              <h2>{detailsShow.title}</h2>
              <p>{detailsShow.genres.join(", ")}</p>
              <p>Year: {detailsShow.year}</p>

              {detailsShow.overview && <p>{detailsShow.overview}</p>}

              {detailsShow.isAISuggestion ? (
                <>
                  <p className="score">Match Score: {detailsShow.matchScore}%</p>

                  <div className="details-actions">
                    {isDemoMode ? (
                      <button className="watch-button" onClick={promptForPrivateList}>
                        Sign in to use this
                      </button>
                    ) : (
                      <>
                        <button
                          className="watch-button"
                          onClick={() => addSuggestionToLibrary(detailsShow, "want")}
                        >
                          Move to Want to Watch
                        </button>

                        <button
                          className="secondary-button"
                          onClick={() =>
                            addSuggestionToLibrary(detailsShow, "watching")
                          }
                        >
                          Start Watching
                        </button>

                        <button
                          className="danger-button"
                          onClick={() =>
                            ignoreSuggestion(detailsShow.tmdbId, detailsShow.title)
                          }
                        >
                          Not Interested
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {detailsShow.status === "watched" ? (
                    <p className="rating">Your Rating: {detailsShow.userRating}</p>
                  ) : detailsShow.status === "watching" ? (
                    <p className="score">Currently Watching</p>
                  ) : (
                    <p className="score">
                      Match Score: {detailsShow.recommendationScore}%
                    </p>
                  )}

                  {detailsShow.scoreBreakdown && (
                    <p className="score-breakdown">
                      Taste: {detailsShow.scoreBreakdown.genreSimilarity}% -
                      Category Preference:{" "}
                      {detailsShow.scoreBreakdown.categoryPreference}% - TMDB:{" "}
                      {detailsShow.scoreBreakdown.tmdbRating}% - Popularity:{" "}
                      {detailsShow.scoreBreakdown.popularity}% - Year Match:{" "}
                      {detailsShow.scoreBreakdown.yearSimilarity}%
                    </p>
                  )}

                  {detailsShow.similarWatchedShows?.length > 0 && (
                    <p className="similar-text">
                      Because you liked{" "}
                      {detailsShow.similarWatchedShows
                        .map(
                          (similarShow) =>
                            `${similarShow.title} (${Math.round(
                              similarShow.similarity * 100,
                            )}%)`,
                        )
                        .join(", ")}
                    </p>
                  )}

                  <div className="details-actions">
                    {renderShowActions(detailsShow)}

                    {isAdmin && (
                      <button
                        className="danger-button"
                        onClick={() => {
                          setDetailsShow(null);
                          setShowToDelete(detailsShow);
                        }}
                      >
                        Delete from Catalog
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showToDelete && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="confirm-modal">
            <h2>Delete "{showToDelete.title}"?</h2>
            <p>This permanently removes it from the shared TV show catalog.</p>

            <div className="modal-buttons">
              <button
                className="cancel-button"
                onClick={() => setShowToDelete(null)}
              >
                Cancel
              </button>

              <button
                className="danger-button"
                onClick={() => deleteTVShow(showToDelete._id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {authModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="confirm-modal auth-modal">
            <button className="close-button" onClick={() => setAuthModal(null)}>
              x
            </button>

            <h2>
              {authModal === "signup"
                ? "Create Account"
                : authModal === "admin"
                  ? "Admin Login"
                  : "Login"}
            </h2>

            <p className="modal-subtext">
              {authModal === "signup"
                ? "Create a private profile for your watched and watch-list data."
                : "Access your private TV show lists and recommendations."}
            </p>

            {authModal === "signup" && (
              <input
                type="text"
                placeholder="Name"
                value={authForm.name}
                onChange={(event) =>
                  setAuthForm((previousForm) => ({
                    ...previousForm,
                    name: event.target.value,
                  }))
                }
                className="rating-input"
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(event) =>
                setAuthForm((previousForm) => ({
                  ...previousForm,
                  email: event.target.value,
                }))
              }
              className="rating-input"
            />

            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(event) =>
                setAuthForm((previousForm) => ({
                  ...previousForm,
                  password: event.target.value,
                }))
              }
              className="rating-input"
            />

            {authError && <p className="error-message">{authError}</p>}

            <div className="modal-buttons">
              <button className="cancel-button" onClick={() => setAuthModal(null)}>
                Cancel
              </button>

              <button className="save-button" disabled={authBusy} onClick={handleAuthSubmit}>
                {authBusy ? "Please wait..." : authModal === "signup" ? "Sign Up" : "Login"}
              </button>
            </div>

            {authModal !== "admin" && (
              <button
                className="link-button"
                onClick={() => openAuthModal(authModal === "signup" ? "login" : "signup")}
              >
                {authModal === "signup"
                  ? "Already have an account? Login"
                  : "Need an account? Sign Up"}
              </button>
            )}
          </div>
        </div>
      )}

      {notice && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className={`confirm-modal notice-modal ${notice.type}`}>
            <h2>{notice.title}</h2>
            <p>{notice.message}</p>

            <div className="modal-buttons">
              <button className="save-button" onClick={() => setNotice(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
