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
  "Crime",
  "Thriller",
  "Mystery",
  "Science-Fiction",
  "Fantasy",
  "Supernatural",
  "Horror",
  "Anime",
  "Legal",
  "Sports",
  "History",
  "Other",
];

const DISPLAY_GENRE_PRIORITY = [
  "Science-Fiction",
  "Fantasy",
  "Supernatural",
  "Horror",
  "Thriller",
  "Mystery",
  "Crime",
  "Legal",
  "Anime",
  "Sports",
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
  ["crime", "Crime"],
  ["thriller", "Thriller"],
  ["mystery", "Mystery"],
  ["sci-fi", "Science-Fiction"],
  ["sci-fi & fantasy", "Science-Fiction"],
  ["science fiction", "Science-Fiction"],
  ["science-fiction", "Science-Fiction"],
  ["fantasy", "Fantasy"],
  ["supernatural", "Supernatural"],
  ["horror", "Horror"],
  ["anime", "Anime"],
  ["animation", "Anime"],
  ["legal", "Legal"],
  ["sports", "Sports"],
  ["sport", "Sports"],
  ["history", "History"],
]);

export const getNormalizedDisplayGenres = (genres = []) => {
  const normalizedGenres = [];

  genres.forEach((genre) => {
    const lookupGenre = normalizeLookup(genre);

    if (lookupGenre === "family") {
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

  return DISPLAY_GENRE_PRIORITY.filter((genre) => groups.has(genre)).map(
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
