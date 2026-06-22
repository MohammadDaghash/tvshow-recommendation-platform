import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "./api";
import "./App.css";

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

async function fetchInitialData() {
  const [recommendationsResponse, mlSuggestionsResponse] = await Promise.all([
    fetch(apiUrl("/api/recommendations")),
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

function App() {
  const [recommendations, setRecommendations] = useState([]);
  const [mlSuggestions, setMlSuggestions] = useState([]);
  const [initialLoad, setInitialLoad] = useState({
    status: "loading",
    error: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [activeTab, setActiveTab] = useState("watched");
  const [selectedShow, setSelectedShow] = useState(null);
  const [ratingInput, setRatingInput] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newShowTitle, setNewShowTitle] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [tmdbResults, setTmdbResults] = useState([]);
  const [selectedTMDBShow, setSelectedTMDBShow] = useState(null);
  const [detailsShow, setDetailsShow] = useState(null);
  const [showToDelete, setShowToDelete] = useState(null);
  const [adminToken, setAdminToken] = useState(
    localStorage.getItem("adminToken") || "",
  );
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [, setIsUserLoginOpen] = useState(false);
  const [, setIsSignupOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [ignoredSuggestionIds, setIgnoredSuggestionIds] = useState([]);

  const loadInitialData = useCallback(async () => {
    setInitialLoad({
      status: "loading",
      error: "",
    });

    try {
      const { nextRecommendations, nextMlSuggestions } =
        await fetchInitialData();

      setRecommendations(nextRecommendations);
      setMlSuggestions(nextMlSuggestions);
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

    async function loadAppData() {
      try {
        const { nextRecommendations, nextMlSuggestions } =
          await fetchInitialData();

        if (!isCurrent) {
          return;
        }

        setRecommendations(nextRecommendations);
        setMlSuggestions(nextMlSuggestions);
        setInitialLoad({
          status: "ready",
          error: "",
        });
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        setInitialLoad({
          status: "error",
          error:
            error.message ||
            "Something went wrong while connecting to the database.",
        });
      }
    }

    loadAppData();

    return () => {
      isCurrent = false;
    };
  }, []);

  const watchedShows = recommendations
    .filter((show) => show.watched === true)
    .sort((a, b) => b.userRating - a.userRating);

  const unwatchedShows = recommendations
    .filter((show) => show.watched === false)
    .sort((a, b) => b.recommendationScore - a.recommendationScore);

  const currentShows = activeTab === "watched" ? watchedShows : unwatchedShows;

  const allGenres = [
    "All",
    ...new Set(
      currentShows
        .flatMap((show) => show.genres)
        .filter(Boolean)
        .sort(),
    ),
  ];

  const filteredShows = currentShows.filter((show) => {
    const matchesSearch = show.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesGenre =
      selectedGenre === "All" || show.genres.includes(selectedGenre);

    return matchesSearch && matchesGenre;
  });

  const isFiltering = searchTerm !== "" || selectedGenre !== "All";

  const getPrimaryCategory = (show) => {
    const genres = show.genres;

    if (genres.includes("Animation") || genres.includes("Anime")) {
      return "Animation";
    }

    if (
      genres.includes("Fantasy") ||
      genres.includes("Sci-Fi") ||
      genres.includes("Science Fiction") ||
      genres.includes("Science-Fiction") ||
      genres.includes("Sci-Fi & Fantasy") ||
      genres.includes("Adventure")
    ) {
      return "Fantasy & Sci-Fi";
    }

    if (
      genres.includes("Crime") ||
      genres.includes("Thriller") ||
      genres.includes("Mystery") ||
      genres.includes("Horror")
    ) {
      return "Crime & Thriller";
    }

    if (genres.includes("Drama") && genres.includes("Romance")) {
      return "Drama & Romance";
    }

    if (genres.includes("Comedy")) {
      return "Comedy";
    }

    return "Drama & Romance";
  };

  const categoryOrder = [
    "Comedy",
    "Drama & Romance",
    "Crime & Thriller",
    "Fantasy & Sci-Fi",
    "Animation",
  ];

  const showsByCategory = categoryOrder
    .map((category) => ({
      category,
      shows: currentShows.filter(
        (show) => getPrimaryCategory(show) === category,
      ),
    }))
    .filter((group) => group.shows.length > 0);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm("");
    setSelectedGenre("All");
  };

  const openRatingModal = (show) => {
    setSelectedShow(show);
    setRatingInput("");
  };

  const submitRating = async () => {
    const rating = Number(ratingInput);

    if (rating < 0 || rating > 10) {
      alert("Rating must be between 0 and 10");
      return;
    }

    await fetch(
      apiUrl(`/api/recommendations/${selectedShow._id}/watch`),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userRating: rating,
        }),
      },
    );

    await refreshRecommendations();

    setSelectedShow(null);
    setActiveTab("watched");
  };

  const refreshRecommendations = async () => {
    const response = await fetch(apiUrl("/api/recommendations"));
    const updatedRecommendations = await response.json();

    setRecommendations(updatedRecommendations);
  };

  const refreshMLSuggestions = async () => {
    const response = await fetch(apiUrl("/api/ml-recommendations/tmdb"));

    const data = await response.json();

    setMlSuggestions(data);
  };

  const ignoreSuggestion = async (tmdbId, title) => {
    try {
      await fetch(apiUrl("/api/ignored-suggestions"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tmdbId,
          title,
        }),
      });

      await refreshMLSuggestions();

      setIgnoredSuggestionIds((previousIds) => [...previousIds, tmdbId]);

      setDetailsShow(null);
    } catch (error) {
      console.error(error);
    }
  };

  const moveToWantToWatch = async (showId) => {
    await fetch(apiUrl(`/api/recommendations/${showId}/unwatch`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    await refreshRecommendations();
    setActiveTab("unwatched");
  };

  const deleteTVShow = async (showId) => {
    await fetch(apiUrl(`/api/recommendations/${showId}`), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    await refreshRecommendations();
    setShowToDelete(null);
    setDetailsShow(null);
  };

  const searchTMDBShows = async () => {
    if (!newShowTitle.trim()) {
      return;
    }

    const response = await fetch(
      apiUrl(`/api/tmdb/search?title=${encodeURIComponent(newShowTitle)}`),
    );

    const results = await response.json();

    setTmdbResults(results);
  };

  const importTVShow = async (tmdbId) => {
    setIsImporting(true);

    await fetch(apiUrl("/api/tmdb/import"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        tmdbId,
      }),
    });

    await refreshRecommendations();
    await refreshMLSuggestions();

    setDetailsShow(null);
    setNewShowTitle("");
    setTmdbResults([]);
    setSelectedTMDBShow(null);
    setIsAddModalOpen(false);
    setIsImporting(false);
    setActiveTab("unwatched");
  };

  const isAdmin = Boolean(adminToken);

  const requireAdmin = (action) => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }

    action();
  };

  const loginAdmin = async () => {
    const response = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: loginEmail,
        password: loginPassword,
      }),
    });

    if (!response.ok) {
      setLoginError("Invalid email or password.");
      return;
    }

    const data = await response.json();

    localStorage.setItem("adminToken", data.token);
    setAdminToken(data.token);
    setLoginError("");
    setIsLoginModalOpen(false);
    setLoginEmail("");
    setLoginPassword("");
  };

  const logoutAdmin = () => {
    localStorage.removeItem("adminToken");
    setAdminToken("");
  };

  const renderCard = (show) => (
    <div
      className="tv-card"
      key={show._id}
      onClick={() => setDetailsShow(show)}
    >
      <img src={show.imageUrl} alt={show.title} />

      <h3>{show.title}</h3>

      <p>{show.genres.join(", ")}</p>

      <p>Year: {show.year}</p>

      {show.watched ? (
        <p className="rating">Your Rating: ⭐ {show.userRating}</p>
      ) : (
        <p className="score">Match Score: {show.recommendationScore}%</p>
      )}
    </div>
  );

  if (initialLoad.status !== "ready") {
    return (
      <LoadingScreen
        error={initialLoad.status === "error" ? initialLoad.error : ""}
        onRetry={loadInitialData}
      />
    );
  }

  return (
    <div className="app">
      <h1>TV Show Recommendation Platform</h1>

      <div className="top-bar">
        <div className="auth-buttons">
          <button
            className="secondary-button"
            onClick={() => setIsUserLoginOpen(true)}
          >
            Login
          </button>

          <button
            className="secondary-button"
            onClick={() => setIsSignupOpen(true)}
          >
            Sign Up
          </button>
        </div>

        <div className="admin-bar">
          {isAdmin ? (
            <button className="secondary-button" onClick={logoutAdmin}>
              Admin Logout
            </button>
          ) : (
            <button
              className="secondary-button"
              onClick={() => setIsLoginModalOpen(true)}
            >
              Admin Login
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "watched" ? "tab active-tab" : "tab"}
          onClick={() => handleTabChange("watched")}
        >
          Watched
        </button>

        <button
          className={activeTab === "unwatched" ? "tab active-tab" : "tab"}
          onClick={() => handleTabChange("unwatched")}
        >
          Want to Watch
        </button>

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
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="genre-select"
        >
          {allGenres.map((genre) => (
            <option value={genre} key={genre}>
              {genre}
            </option>
          ))}
        </select>
      </div>

      {isFiltering ? (
        <section>
          <h2 className="section-title">Filtered Results</h2>
          <div className="carousel-row">{filteredShows.map(renderCard)}</div>
        </section>
      ) : (
        <>
          {activeTab === "unwatched" && (
            <>
              <section>
                <h2 className="section-title">AI Suggestions</h2>

                <div className="carousel-row">
                  {mlSuggestions
                    .filter(
                      (show) => !ignoredSuggestionIds.includes(show.tmdbId),
                    )
                    .map((show) => (
                      <div
                        className="tv-card"
                        key={show.title}
                        onClick={() => setDetailsShow(show)}
                      >
                        <img src={show.imageUrl} alt={show.title} />

                        <h3>{show.title}</h3>

                        <p>{show.genres.join(", ")}</p>

                        <p>Year: {show.year}</p>

                        <p className="score">Match Score: {show.matchScore}%</p>
                      </div>
                    ))}
                </div>
              </section>

              <section>
                <h2 className="section-title">Want to Watch</h2>

                <div className="carousel-row">
                  {unwatchedShows.map(renderCard)}
                </div>
              </section>
            </>
          )}

          {showsByCategory.map((group) => (
            <section key={group.category}>
              <h2 className="section-title">{group.category}</h2>
              <div className="carousel-row">{group.shows.map(renderCard)}</div>
            </section>
          ))}
        </>
      )}

      {selectedShow && (
        <div className="modal-overlay">
          <div className="rating-modal">
            <h2>Rate "{selectedShow.title}"</h2>

            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={ratingInput}
              onChange={(e) => setRatingInput(e.target.value)}
              placeholder="Enter rating..."
              className="rating-input"
            />

            <div className="modal-buttons">
              <button
                className="cancel-button"
                onClick={() => setSelectedShow(null)}
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
        <div className="modal-overlay">
          <div className="add-show-modal">
            <h2>Add TV Show</h2>

            <div className="tmdb-search-row">
              <input
                type="text"
                value={newShowTitle}
                onChange={(e) => setNewShowTitle(e.target.value)}
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
                  {show.imageUrl && (
                    <img src={show.imageUrl} alt={show.title} />
                  )}

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
        <div className="modal-overlay" onClick={() => setDetailsShow(null)}>
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-button"
              onClick={() => setDetailsShow(null)}
            >
              ×
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
                  <p className="score">
                    Match Score: {detailsShow.recommendationScore}%
                  </p>

                  {detailsShow.scoreBreakdown && (
                    <p className="score-breakdown">
                      Taste: {detailsShow.scoreBreakdown.genreSimilarity}% ·
                      Category Preference:{" "}
                      {detailsShow.scoreBreakdown.categoryPreference}% · TMDB:{" "}
                      {detailsShow.scoreBreakdown.tmdbRating}% · Popularity:{" "}
                      {detailsShow.scoreBreakdown.popularity}% · Year Match:{" "}
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
                    <button
                      className="watch-button"
                      onClick={() =>
                        requireAdmin(() => importTVShow(detailsShow.tmdbId))
                      }
                    >
                      Add to Want to Watch
                    </button>

                    <button
                      className="danger-button"
                      onClick={() =>
                        requireAdmin(() =>
                          ignoreSuggestion(
                            detailsShow.tmdbId,
                            detailsShow.title,
                          ),
                        )
                      }
                    >
                      Not Interested
                    </button>
                  </div>
                </>
              ) : detailsShow.watched ? (
                <>
                  <p className="rating">
                    Your Rating: ⭐ {detailsShow.userRating}
                  </p>

                  <div className="details-actions">
                    <button
                      className="secondary-button"
                      onClick={() =>
                        requireAdmin(() => {
                          setDetailsShow(null);
                          moveToWantToWatch(detailsShow._id);
                        })
                      }
                    >
                      Move to Want to Watch
                    </button>

                    <button
                      className="danger-button"
                      onClick={() =>
                        requireAdmin(() => {
                          setDetailsShow(null);
                          setShowToDelete(detailsShow);
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="score">
                    Match Score: {detailsShow.recommendationScore}%
                  </p>

                  {detailsShow.scoreBreakdown && (
                    <p className="score-breakdown">
                      Taste: {detailsShow.scoreBreakdown.genreSimilarity}% ·
                      Category Preference:{" "}
                      {detailsShow.scoreBreakdown.categoryPreference}% · TMDB:{" "}
                      {detailsShow.scoreBreakdown.tmdbRating}% · Popularity:{" "}
                      {detailsShow.scoreBreakdown.popularity}% · Year Match:{" "}
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
                    <button
                      className="watch-button"
                      onClick={() =>
                        requireAdmin(() => {
                          setDetailsShow(null);
                          openRatingModal(detailsShow);
                        })
                      }
                    >
                      Mark as Watched
                    </button>

                    <button
                      className="danger-button"
                      onClick={() =>
                        requireAdmin(() => {
                          setDetailsShow(null);
                          setShowToDelete(detailsShow);
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {showToDelete && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h2>Delete "{showToDelete.title}"?</h2>

            <p>This will permanently remove it from your TV show list.</p>

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

      {isLoginModalOpen && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h2>Admin Login</h2>

            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="rating-input"
            />

            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="rating-input"
            />

            {loginError && <p className="error-message">{loginError}</p>}

            <div className="modal-buttons">
              <button
                className="cancel-button"
                onClick={() => setIsLoginModalOpen(false)}
              >
                Cancel
              </button>

              <button className="save-button" onClick={loginAdmin}>
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
