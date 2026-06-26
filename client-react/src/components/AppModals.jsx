function ActionPanel({ actions, isDemoMode }) {
  return (
    <div className="action-panel">
      <div className="action-panel-header">
        <p>Actions</p>
        {isDemoMode && <span>Demo mode</span>}
      </div>

      {isDemoMode && (
        <p className="action-panel-hint">
          Sign in to use these actions with your private list.
        </p>
      )}

      <div className="details-actions">{actions}</div>
    </div>
  );
}

export function RatingModal({
  ratingInput,
  ratingTarget,
  setRatingInput,
  setRatingTarget,
  submitRating,
}) {
  if (!ratingTarget) return null;

  return (
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
  );
}

export function AddShowModal({
  importTVShow,
  isAddModalOpen,
  isImporting,
  newShowTitle,
  searchTMDBShows,
  selectedTMDBShow,
  setIsAddModalOpen,
  setNewShowTitle,
  setSelectedTMDBShow,
  setTmdbResults,
  tmdbResults,
}) {
  if (!isAddModalOpen) return null;

  const closeModal = () => {
    setIsAddModalOpen(false);
    setTmdbResults([]);
    setSelectedTMDBShow(null);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="add-show-modal">
        <button className="close-button" onClick={closeModal}>
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
          <button className="cancel-button" onClick={closeModal}>
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
  );
}

export function DetailsModal({
  detailsShow,
  formatDisplayGenres,
  isAdmin,
  isAdminCatalogMode,
  isDemoMode,
  renderShowActions,
  renderSuggestionActions,
  setDetailsShow,
  setShowToDelete,
}) {
  if (!detailsShow) return null;

  return (
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
          <p>{formatDisplayGenres(detailsShow.genres)}</p>
          <p>Year: {detailsShow.year}</p>

          {detailsShow.overview && <p>{detailsShow.overview}</p>}

          {detailsShow.isAISuggestion ? (
            <>
              <p className="score">Match Score: {detailsShow.matchScore}%</p>

              <ActionPanel
                actions={renderSuggestionActions(detailsShow)}
                isDemoMode={isDemoMode}
              />
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

              <ActionPanel
                actions={
                  <>
                    {renderShowActions(detailsShow)}

                    {isAdmin && !isAdminCatalogMode && (
                      <button
                        className="danger-button compact-action"
                        onClick={() => {
                          setDetailsShow(null);
                          setShowToDelete(detailsShow);
                        }}
                      >
                        Delete from Catalog
                      </button>
                    )}
                  </>
                }
                isDemoMode={isDemoMode}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDeleteModal({
  deleteTVShow,
  setShowToDelete,
  showToDelete,
}) {
  if (!showToDelete) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="confirm-modal">
        <h2>Delete "{showToDelete.title}"?</h2>
        <p>This permanently removes it from the shared TV show catalog.</p>

        <div className="modal-buttons">
          <button className="cancel-button" onClick={() => setShowToDelete(null)}>
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
  );
}

export function AuthModal({
  authBusy,
  authError,
  authForm,
  authModal,
  handleAuthSubmit,
  openAuthModal,
  setAuthForm,
  setAuthModal,
}) {
  if (!authModal) return null;

  return (
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

          <button
            className="save-button"
            disabled={authBusy}
            onClick={handleAuthSubmit}
          >
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
  );
}

export function NoticeModal({ notice, setNotice }) {
  if (!notice) return null;

  return (
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
  );
}
