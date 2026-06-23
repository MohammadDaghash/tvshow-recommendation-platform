export const shouldUsePublicDataset = (user) => {
  return !user || user.role === "admin";
};

export const getRecommendationFetchToken = (session) => {
  if (!session?.token || shouldUsePublicDataset(session.user)) {
    return "";
  }

  return session.token;
};

export const CANONICAL_DISPLAY_GENRES = [
  "Comedy",
  "Drama & Romance",
  "Action & Adventure",
  "Mystery & Thriller",
  "Science-Fiction & Fantasy",
  "Anime",
  "Horror",
  "Legal",
  "History",
  "Other",
];

const DISPLAY_GENRE_PRIORITY = [
  "Science-Fiction & Fantasy",
  "Mystery & Thriller",
  "Horror",
  "Anime",
  "Legal",
  "History",
  "Action & Adventure",
  "Drama & Romance",
  "Comedy",
  "Other",
];

const normalizeLookup = (genre) => {
  return String(genre || "")
    .trim()
    .toLowerCase();
};

const genreAliasMap = new Map([
  ["comedy", "Comedy"],
  ["drama", "Drama & Romance"],
  ["romance", "Drama & Romance"],
  ["drama & romance", "Drama & Romance"],
  ["action", "Action & Adventure"],
  ["adventure", "Action & Adventure"],
  ["action & adventure", "Action & Adventure"],
  ["crime", "Mystery & Thriller"],
  ["thriller", "Mystery & Thriller"],
  ["mystery", "Mystery & Thriller"],
  ["mystery & thriller", "Mystery & Thriller"],
  ["sci-fi", "Science-Fiction & Fantasy"],
  ["sci-fi & fantasy", "Science-Fiction & Fantasy"],
  ["science fiction", "Science-Fiction & Fantasy"],
  ["science-fiction", "Science-Fiction & Fantasy"],
  ["science-fiction & fantasy", "Science-Fiction & Fantasy"],
  ["fantasy", "Science-Fiction & Fantasy"],
  ["supernatural", "Science-Fiction & Fantasy"],
  ["horror", "Horror"],
  ["anime", "Anime"],
  ["animation", "Anime"],
  ["legal", "Legal"],
  ["history", "History"],
]);

export const getNormalizedDisplayGenres = (genres = []) => {
  const normalizedGenres = [];

  genres.forEach((genre) => {
    const lookupGenre = normalizeLookup(genre);

    if (
      lookupGenre === "family" ||
      lookupGenre === "sports" ||
      lookupGenre === "sport"
    ) {
      return;
    }

    const canonicalGenre = genreAliasMap.get(lookupGenre);

    if (canonicalGenre && !normalizedGenres.includes(canonicalGenre)) {
      normalizedGenres.push(canonicalGenre);
    }
  });

  return normalizedGenres;
};

const hasSourceGenre = (genres, expectedGenre) => {
  const expectedLookup = normalizeLookup(expectedGenre);

  return genres.some((genre) => normalizeLookup(genre) === expectedLookup);
};

export const getDisplayGenre = (genres = []) => {
  const normalizedGenres = getNormalizedDisplayGenres(genres);

  if (normalizedGenres.length === 0) {
    return "Other";
  }

  const hasComedy = normalizedGenres.includes("Comedy");
  const hasDrama = hasSourceGenre(genres, "Drama");
  const hasRomance = hasSourceGenre(genres, "Romance");

  if (
    hasComedy &&
    hasDrama &&
    hasRomance &&
    normalizedGenres.length === 2
  ) {
    return "Drama & Romance";
  }

  if (
    hasComedy &&
    (hasDrama || hasRomance) &&
    !(hasDrama && hasRomance) &&
    normalizedGenres.length === 2
  ) {
    return "Comedy";
  }

  return (
    DISPLAY_GENRE_PRIORITY.find((genre) => normalizedGenres.includes(genre)) ||
    "Other"
  );
};

export const groupShowsByCategory = (shows, selectedGenre = "All") => {
  const groups = new Map();

  shows.forEach((show) => {
    const category =
      selectedGenre === "All" ? getDisplayGenre(show.genres) : selectedGenre;
    const categoryShows = groups.get(category) || [];

    groups.set(category, [...categoryShows, show]);
  });

  return CANONICAL_DISPLAY_GENRES.filter((genre) => groups.has(genre)).map(
    (category) => ({
      category,
      shows: groups.get(category),
    }),
  );
};

export const getFilterGenres = (shows) => {
  const visibleGenres = new Set(
    shows.flatMap((show) => getNormalizedDisplayGenres(show.genres)),
  );

  return [
    "All",
    ...CANONICAL_DISPLAY_GENRES.filter((genre) => visibleGenres.has(genre)),
  ];
};

export const getDisplayGenreList = (genres = []) => {
  const normalizedGenres = getNormalizedDisplayGenres(genres);

  return normalizedGenres.length > 0 ? normalizedGenres : ["Other"];
};
