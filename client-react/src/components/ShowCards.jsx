import {
  getLibraryBadgeText,
  getLibraryCardStatusText,
  getSuggestionBadgeText,
} from "../cardPresentation";
import { useTilt } from "../hooks/useTilt";

export function LibraryCard({ show, formatGenres, onSelect }) {
  const cardStatusText = getLibraryCardStatusText(show);
  const { ref, handlePointerMove, handlePointerLeave } = useTilt();

  return (
    <article
      className="tv-card"
      key={show._id}
      ref={ref}
      onClick={() => onSelect(show)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="poster-frame">
        <img src={show.imageUrl} alt={show.title} />
        <span className="card-badge tmdb-badge">
          {getLibraryBadgeText(show)}
        </span>
      </div>

      <div className="tv-card-body">
        <h3>{show.title}</h3>
        <p className="genre-line">{formatGenres(show.genres)}</p>
        <p className="year-line">Year: {show.year}</p>

        {cardStatusText && (
          <p className={show.status === "watched" ? "rating" : "score"}>
            {cardStatusText}
          </p>
        )}
      </div>
    </article>
  );
}

export function SuggestionCard({
  show,
  formatGenres,
  onQuickIgnore,
  onSelect,
}) {
  const { ref, handlePointerMove, handlePointerLeave } = useTilt();

  return (
    <article
      className="tv-card ai-card"
      key={show.tmdbId || show.title}
      ref={ref}
      onClick={() =>
        onSelect({
          ...show,
          isAISuggestion: true,
        })
      }
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="poster-frame">
        <img src={show.imageUrl} alt={show.title} />
        <span className="card-badge tmdb-badge">
          {getSuggestionBadgeText(show)}
        </span>
      </div>

      <div className="tv-card-body">
        <h3>{show.title}</h3>
        <p className="genre-line">{formatGenres(show.genres)}</p>
        <p className="year-line">Year: {show.year}</p>
        <p className="score">Match Score: {show.matchScore}%</p>
        <button
          className="quick-ignore-button"
          type="button"
          onClick={(event) => onQuickIgnore(event, show)}
        >
          Not Interested
        </button>
      </div>
    </article>
  );
}
