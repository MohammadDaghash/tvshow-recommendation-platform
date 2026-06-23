export const shouldUsePublicDataset = (user) => {
  return !user || user.role === "admin";
};

export const getRecommendationFetchToken = (session) => {
  if (!session?.token || shouldUsePublicDataset(session.user)) {
    return "";
  }

  return session.token;
};

const categoryDefinitions = [
  {
    category: "Comedy",
    aliases: ["Comedy"],
  },
  {
    category: "Drama",
    aliases: ["Drama"],
  },
  {
    category: "Thriller",
    aliases: ["Thriller", "Mystery", "Horror"],
  },
  {
    category: "Romance",
    aliases: ["Romance"],
  },
  {
    category: "Crime",
    aliases: ["Crime", "Legal"],
  },
  {
    category: "Fantasy",
    aliases: ["Fantasy"],
  },
  {
    category: "Sci-Fi",
    aliases: [
      "Sci-Fi",
      "Science Fiction",
      "Science-Fiction",
      "Sci-Fi & Fantasy",
    ],
  },
  {
    category: "Action & Adventure",
    aliases: ["Action", "Adventure", "Action & Adventure"],
  },
  {
    category: "Family & Animation",
    aliases: ["Animation", "Anime", "Family"],
  },
];

const normalizeGenre = (genre) => genre.toLowerCase();

export const getPrimaryCategory = (show, selectedGenre = "All") => {
  if (selectedGenre !== "All") {
    return selectedGenre;
  }

  const normalizedGenres = new Set((show.genres || []).map(normalizeGenre));
  const matchingCategory = categoryDefinitions.find(({ aliases }) => {
    return aliases.some((alias) => normalizedGenres.has(normalizeGenre(alias)));
  });

  return matchingCategory?.category || "Other";
};

export const groupShowsByCategory = (shows, selectedGenre = "All") => {
  const groups = new Map();

  shows.forEach((show) => {
    const category = getPrimaryCategory(show, selectedGenre);
    const categoryShows = groups.get(category) || [];

    groups.set(category, [...categoryShows, show]);
  });

  return Array.from(groups, ([category, categoryShows]) => ({
    category,
    shows: categoryShows,
  }));
};
