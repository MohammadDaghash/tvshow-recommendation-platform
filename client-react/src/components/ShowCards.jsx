import {
  getLibraryCardStatusText,
  getSuggestionBadgeText,
} from "../cardPresentation";

export function LibraryCard({ show, formatGenres, onSelect }) {
  const cardStatusText = getLibraryCardStatusText(show);

  return (
    <article className="tv-card" key={show._id} onClick={() => onSelect(show)}>
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
  return (
    <article
      className="tv-card ai-card"
      key={show.tmdbId || show.title}
      onClick={() =>
        onSelect({
          ...show,
          isAISuggestion: true,
        })
      }
    >
      <div className="poster-frame">
        <img src={show.imageUrl} alt={show.title} />
        <span className="card-badge rating">{getSuggestionBadgeText(show)}</span>
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
