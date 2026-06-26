export function getLibraryCardStatusText(show) {
  if (show.status === "watched") {
    return `Your Rating: ${show.userRating}`;
  }

  if (show.status === "watching") {
    return "In progress";
  }

  return null;
}

export function getLibraryActionLabels(status) {
  if (status === "watched") {
    return [
      "Move to Currently Watching",
      "Move to Want to Watch",
      "Change Rating",
      "Delete",
    ];
  }

  if (status === "watching") {
    return [
      "Move to Want to Watch",
      "Move to Watched",
      "Delete",
    ];
  }

  return [
    "Move to Currently Watching",
    "Move to Watched",
    "Delete",
  ];
}
