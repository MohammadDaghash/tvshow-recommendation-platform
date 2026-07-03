const escapeSvgText = (text) => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

const demoPosterUrl = (title) => {
  const safeTitle = escapeSvgText(title);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 750">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#1f2937"/>
          <stop offset="0.52" stop-color="#111827"/>
          <stop offset="1" stop-color="#0f766e"/>
        </linearGradient>
        <linearGradient id="edge" x1="0" x2="1">
          <stop stop-color="#ead38a" stop-opacity="0.85"/>
          <stop offset="1" stop-color="#78e2c2" stop-opacity="0.85"/>
        </linearGradient>
      </defs>
      <rect width="500" height="750" fill="url(#bg)"/>
      <rect x="28" y="28" width="444" height="694" rx="18" fill="none" stroke="url(#edge)" stroke-width="3" opacity="0.72"/>
      <rect x="56" y="92" width="388" height="10" rx="5" fill="#ead38a" opacity="0.75"/>
      <text x="250" y="360" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="800" text-anchor="middle">${safeTitle}</text>
      <text x="250" y="424" fill="#d6deea" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" text-anchor="middle" opacity="0.82">TV Series</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const demoShows = [
  {
    title: "Friends",
    genres: ["Comedy", "Romance"],
    year: 1994,
    userRating: 9.7,
    watched: true,
    recommendationScore: 96,
    tmdbId: 1668,
  },
  {
    title: "The Office",
    genres: ["Comedy"],
    year: 2005,
    userRating: 9.4,
    watched: true,
    recommendationScore: 94,
    tmdbId: 2316,
  },
  {
    title: "Game of Thrones",
    genres: ["Drama", "Fantasy", "Adventure"],
    year: 2011,
    userRating: 9.3,
    watched: true,
    recommendationScore: 93,
    tmdbId: 1399,
  },
  {
    title: "Breaking Bad",
    genres: ["Crime", "Drama", "Thriller"],
    year: 2008,
    userRating: 8.1,
    watched: true,
    recommendationScore: 91,
    tmdbId: 1396,
  },
  {
    title: "Modern Family",
    genres: ["Comedy"],
    year: 2009,
    userRating: 9.2,
    watched: true,
    recommendationScore: 90,
    tmdbId: 1421,
  },
  {
    title: "Bridgerton",
    genres: ["Drama", "Romance"],
    year: 2020,
    userRating: 9.2,
    watched: true,
    recommendationScore: 88,
    tmdbId: 91239,
  },
  {
    title: "Attack on Titan",
    genres: ["Animation", "Action", "Drama", "Fantasy"],
    year: 2013,
    userRating: 7.8,
    watched: true,
    recommendationScore: 86,
    tmdbId: 1429,
  },
  {
    title: "The Big Bang Theory",
    genres: ["Comedy", "Romance"],
    year: 2007,
    userRating: 9.5,
    watched: true,
    recommendationScore: 85,
    tmdbId: 1418,
  },
  {
    title: "The Bear",
    genres: ["Comedy", "Drama"],
    year: 2022,
    status: "watching",
    recommendationScore: 92,
    tmdbId: 136315,
  },
  {
    title: "Severance",
    genres: ["Drama", "Mystery", "Sci-Fi"],
    year: 2022,
    status: "watching",
    recommendationScore: 91,
    tmdbId: 95396,
  },
  {
    title: "Dark",
    genres: ["Drama", "Mystery", "Sci-Fi", "Thriller"],
    year: 2017,
    status: "watching",
    recommendationScore: 89,
    tmdbId: 70523,
  },
  {
    title: "Succession",
    genres: ["Drama"],
    year: 2018,
    watched: false,
    recommendationScore: 88,
    tmdbId: 76331,
  },
  {
    title: "The Last of Us",
    genres: ["Drama", "Sci-Fi", "Thriller"],
    year: 2023,
    watched: false,
    recommendationScore: 87,
    tmdbId: 100088,
  },
  {
    title: "House of the Dragon",
    genres: ["Drama", "Fantasy"],
    year: 2022,
    watched: false,
    recommendationScore: 86,
    tmdbId: 94997,
  },
  {
    title: "The White Lotus",
    genres: ["Comedy", "Drama"],
    year: 2021,
    watched: false,
    recommendationScore: 85,
    tmdbId: 111803,
  },
  {
    title: "Fleabag",
    genres: ["Comedy", "Drama"],
    year: 2016,
    watched: false,
    recommendationScore: 84,
    tmdbId: 67070,
  },
  {
    title: "Schitt's Creek",
    genres: ["Comedy"],
    year: 2015,
    watched: false,
    recommendationScore: 83,
    tmdbId: 61662,
  },
  {
    title: "Only Murders in the Building",
    genres: ["Comedy", "Crime", "Mystery"],
    year: 2021,
    watched: false,
    recommendationScore: 82,
    tmdbId: 107113,
  },
  {
    title: "Ozark",
    genres: ["Crime", "Drama", "Thriller"],
    year: 2017,
    watched: false,
    recommendationScore: 81,
    tmdbId: 69740,
  },
  {
    title: "Better Call Saul",
    genres: ["Crime", "Drama"],
    year: 2015,
    watched: false,
    recommendationScore: 80,
    tmdbId: 60059,
  },
  {
    title: "Alice in Borderland",
    genres: ["Action", "Drama", "Mystery", "Sci-Fi"],
    year: 2020,
    watched: false,
    recommendationScore: 79,
    tmdbId: 110316,
  },
  {
    title: "One Day",
    genres: ["Drama", "Romance"],
    year: 2024,
    watched: false,
    recommendationScore: 78,
    tmdbId: 219440,
  },
  {
    title: "Normal People",
    genres: ["Drama", "Romance"],
    year: 2020,
    watched: false,
    recommendationScore: 77,
    tmdbId: 89905,
  },
  {
    title: "Arcane",
    genres: ["Animation", "Action", "Fantasy"],
    year: 2021,
    watched: false,
    recommendationScore: 76,
    tmdbId: 94605,
  },
  {
    title: "Invincible",
    genres: ["Animation", "Action", "Drama"],
    year: 2021,
    watched: false,
    recommendationScore: 75,
    tmdbId: 95557,
  },
  {
    title: "Wednesday",
    genres: ["Comedy", "Fantasy", "Mystery"],
    year: 2022,
    watched: false,
    recommendationScore: 74,
    tmdbId: 119051,
  },
  {
    title: "Mindhunter",
    genres: ["Crime", "Drama", "Thriller"],
    year: 2017,
    watched: false,
    recommendationScore: 73,
    tmdbId: 67744,
  },
  {
    title: "Community",
    genres: ["Comedy"],
    year: 2009,
    watched: false,
    recommendationScore: 72,
    tmdbId: 18347,
  },
  {
    title: "New Girl",
    genres: ["Comedy", "Romance"],
    year: 2011,
    watched: false,
    recommendationScore: 71,
    tmdbId: 1420,
  },
  {
    title: "Black Mirror",
    genres: ["Drama", "Sci-Fi", "Thriller"],
    year: 2011,
    watched: false,
    recommendationScore: 70,
    tmdbId: 42009,
  },
];

export const DEMO_CATALOG = demoShows.map((show, index) => ({
  _id: `demo-${index + 1}`,
  imageUrl: demoPosterUrl(show.title),
  popularity: show.popularity ?? show.recommendationScore,
  tmdbRating: show.tmdbRating ?? Number((show.recommendationScore / 10).toFixed(1)),
  type: "tv-show",
  ...show,
}));
