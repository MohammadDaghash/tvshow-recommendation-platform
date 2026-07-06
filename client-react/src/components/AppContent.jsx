import { TrainingHealthPanel } from "./TrainingHealthPanel";
import { TasteProfilePanel } from "./TasteProfilePanel";

export function AppContent({
  activePage,
  allGenres,
  authToken,
  currentUser,
  filteredShows,
  groupedShows,
  handlePageChange,
  isAdmin,
  isDemoMode,
  leadCarouselConfig,
  leadCarouselShows,
  logout,
  onTasteProfileChanged,
  openAuthModal,
  pageConfig,
  pageCounts,
  requireAdmin,
  renderPageCard,
  searchTerm,
  selectedGenre,
  setIsAddModalOpen,
  setSearchTerm,
  setSelectedGenre,
  visibleAISuggestions,
  wantShows,
  watchedShows,
  watchingShows,
}) {
  const isTrainingPage = activePage === "training";
  const isTasteProfilePage = activePage === "taste";
  const isUtilityPage = isTrainingPage || isTasteProfilePage;
  const visiblePageEntries = Object.entries(pageConfig).filter(
    ([, config]) => !config.adminOnly || isAdmin,
  );

  return (
    <>
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
            {visiblePageEntries.map(([page, config]) => (
              <button
                className={activePage === page ? "tab active-tab" : "tab"}
                key={page}
                onClick={() => handlePageChange(page)}
              >
                {config.label}
                {pageCounts[page] !== undefined && (
                  <span className="page-count">{pageCounts[page]}</span>
                )}
              </button>
            ))}

            <button
              className="add-show-button"
              onClick={() => requireAdmin(() => setIsAddModalOpen(true))}
            >
              + Add TV Show
            </button>
          </div>

          {!isUtilityPage && (
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
          )}
        </div>

        {isTrainingPage ? (
          <TrainingHealthPanel />
        ) : isTasteProfilePage ? (
          <TasteProfilePanel
            authToken={authToken}
            currentUser={currentUser}
            onPreferencesChanged={onTasteProfileChanged}
            openAuthModal={openAuthModal}
          />
        ) : (
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

          {leadCarouselConfig && (
            <section
              className="lead-carousel-panel"
              aria-label={leadCarouselConfig.ariaLabel}
            >
              <div className="genre-group-header lead-carousel-header">
                <div>
                  <p className="lead-carousel-kicker">
                    {leadCarouselConfig.kicker}
                  </p>
                  <h3>{leadCarouselConfig.title}</h3>
                </div>
                <span>{leadCarouselConfig.countLabel}</span>
              </div>

              <div className="carousel-row lead-carousel-row">
                {leadCarouselShows.map(renderPageCard)}
              </div>
            </section>
          )}

          {filteredShows.length === 0 ? (
            <div className="empty-state">
              <h3>{pageConfig[activePage].emptyTitle}</h3>
              <p>{pageConfig[activePage].emptyText}</p>
              {activePage !== "ai" && (
                <button
                  className="secondary-button"
                  onClick={() => handlePageChange("ai")}
                >
                  Browse AI Suggestions
                </button>
              )}
            </div>
          ) : (
            <div className="grouped-show-sections">
              {groupedShows.map((group) => (
                <section className="genre-group" key={group.category}>
                  <div className="genre-group-header">
                    <h3>{group.category}</h3>
                    <span>
                      {group.shows.length}{" "}
                      {group.shows.length === 1 ? "show" : "shows"}
                    </span>
                  </div>

                  <div className="carousel-row genre-carousel">
                    {group.shows.map(renderPageCard)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
        )}
      </main>
    </>
  );
}
