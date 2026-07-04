import { useEffect, useState } from "react";

import { apiUrl } from "../api";
import { authHeaders, parseJSONResponse } from "../httpClient";
import { readStoredSession } from "../sessionStorage";
import { formatPercent, getHealthMetricCards } from "../trainingHealth";

const fetchTrainingHealth = async () => {
  const token = readStoredSession()?.token;
  const response = await fetch(apiUrl("/api/ml/training-health"), {
    headers: authHeaders(token),
  });

  return parseJSONResponse(response);
};

export function TrainingHealthPanel() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadHealth = async () => {
    setIsLoading(true);
    setError("");

    try {
      setHealth(await fetchTrainingHealth());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isCurrent = true;

    fetchTrainingHealth()
      .then((data) => {
        if (isCurrent) setHealth(data);
      })
      .catch((loadError) => {
        if (isCurrent) setError(loadError.message);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section className="training-health-panel">
        <p className="lead-carousel-kicker">Training Data</p>
        <h2>Loading training health...</h2>
      </section>
    );
  }

  if (error) {
    return (
      <section className="training-health-panel">
        <p className="lead-carousel-kicker">Training Data</p>
        <h2>Unable to load training health</h2>
        <p className="training-health-muted">{error}</p>
        <button className="secondary-button" onClick={loadHealth}>
          Retry
        </button>
      </section>
    );
  }

  const metricCards = getHealthMetricCards(health);
  const analysis = health.trainingAnalysis;

  return (
    <section className="training-health-panel">
      <div className="training-health-header">
        <div>
          <p className="lead-carousel-kicker">Training Data</p>
          <h2>Current data snapshot</h2>
          <p className="training-health-muted">
            The recommender uses the watched ratings, list actions, AI
            feedback, and catalog metadata available right now. More activity
            improves the signal, but there is no hard minimum for it to work.
          </p>
        </div>
      </div>

      <div className="training-health-grid">
        {metricCards.map((card) => (
          <article className="training-health-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <div className="training-health-columns">
        <article className="training-health-detail">
          <h3>Profile Counts</h3>
          <p>
            Watched:{" "}
            <strong>{health.tasteProfile.summary.watchedCount}</strong>
          </p>
          <p>
            Want to Watch:{" "}
            <strong>{health.tasteProfile.summary.wantCount}</strong>
          </p>
          <p>
            Currently Watching:{" "}
            <strong>{health.tasteProfile.summary.watchingCount}</strong>
          </p>
        </article>

        <article className="training-health-detail">
          <h3>Recommendation Row Coverage</h3>
          <p>
            Genre metadata:{" "}
            <strong>
              {formatPercent(analysis.metadataCoverage.genreCoverage)}
            </strong>
          </p>
          <p>
            TMDB ratings:{" "}
            <strong>
              {formatPercent(analysis.metadataCoverage.tmdbRatingCoverage)}
            </strong>
          </p>
        </article>
      </div>

      <article className="training-health-detail">
        <h3>Top Genres</h3>
        <div className="training-health-table">
          {analysis.topGenres.map((genre) => (
            <div className="training-health-row" key={genre.genre}>
              <span>{genre.genre}</span>
              <span>{genre.rows} rows</span>
              <span>{formatPercent(genre.supervisedLabelRate)} labelled</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
