export function LoadingScreen({ error, onRetry }) {
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
