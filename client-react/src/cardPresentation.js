export function getLibraryCardStatusText(show) {
  if (show.status === "watched") {
    return `Your Rating: ${show.userRating}`;
  }

  if (show.status === "watching") {
    return "In progress";
  }

  return null;
}
