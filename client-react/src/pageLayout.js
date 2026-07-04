const leadCarouselCopy = {
  watched: {
    kicker: "Watched Library",
    title: "All Watched Shows",
    ariaLabel: "All watched shows carousel",
    countUnit: "show",
  },
  want: {
    kicker: "Your List",
    title: "Want to Watch",
    ariaLabel: "Want to Watch carousel",
    countUnit: "show",
  },
  watching: {
    kicker: "In Progress",
    title: "Currently Watching",
    ariaLabel: "Currently Watching carousel",
    countUnit: "show",
  },
  ai: {
    kicker: "Recommendation Engine",
    title: "Top AI Suggestions",
    ariaLabel: "Top AI Suggestions",
    countUnit: "pick",
  },
};

function pluralize(count, unit) {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

export function getLeadCarouselConfig(activePage, shows) {
  const pageCopy = leadCarouselCopy[activePage];

  if (!pageCopy || shows.length === 0) {
    return null;
  }

  return {
    kicker: pageCopy.kicker,
    title: pageCopy.title,
    countLabel: pluralize(shows.length, pageCopy.countUnit),
    ariaLabel: pageCopy.ariaLabel,
  };
}
