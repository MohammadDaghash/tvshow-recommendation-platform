export function shouldShowIgnoreSuggestionSuccess({ silent = false } = {}) {
  return !silent;
}

export const VIEWER_SUGGESTION_ACTION_LABELS = [
  "Not Interested",
  "Add to Want to Watch",
  "Add to Currently Watching",
  "Add to Watched",
];

export function getSuggestionActionLabels() {
  return VIEWER_SUGGESTION_ACTION_LABELS;
}
