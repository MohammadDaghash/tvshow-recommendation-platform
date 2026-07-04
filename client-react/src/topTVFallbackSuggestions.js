const escapeSvgText = (text) => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

const fallbackPosterUrl = (title) => {
  const safeTitle = escapeSvgText(title);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 750">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#111827"/>
          <stop offset="0.54" stop-color="#0b1020"/>
          <stop offset="1" stop-color="#1f766f"/>
        </linearGradient>
        <linearGradient id="edge" x1="0" x2="1">
          <stop stop-color="#ead38a" stop-opacity="0.88"/>
          <stop offset="1" stop-color="#78e2c2" stop-opacity="0.88"/>
        </linearGradient>
      </defs>
      <rect width="500" height="750" fill="url(#bg)"/>
      <rect x="30" y="30" width="440" height="690" rx="18" fill="none" stroke="url(#edge)" stroke-width="3" opacity="0.78"/>
      <rect x="72" y="104" width="356" height="8" rx="4" fill="#ead38a" opacity="0.82"/>
      <text x="250" y="350" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="40" font-weight="800" text-anchor="middle">${safeTitle}</text>
      <text x="250" y="414" fill="#d6deea" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" text-anchor="middle" opacity="0.82">Top TV Pick</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const fallbackShows = [
  {
    title: "The Sopranos",
    tmdbId: 1398,
    year: 1999,
    tmdbRating: 8.7,
    genres: ["Drama & Romance", "Mystery & Thriller"],
  },
  {
    title: "The Wire",
    tmdbId: 1438,
    year: 2002,
    tmdbRating: 8.6,
    genres: ["Drama & Romance", "Mystery & Thriller"],
  },
  {
    title: "Chernobyl",
    tmdbId: 87108,
    year: 2019,
    tmdbRating: 8.7,
    genres: ["History", "Drama & Romance"],
  },
  {
    title: "Better Call Saul",
    tmdbId: 60059,
    year: 2015,
    tmdbRating: 8.7,
    genres: ["Drama & Romance", "Mystery & Thriller"],
  },
  {
    title: "Avatar: The Last Airbender",
    tmdbId: 246,
    year: 2005,
    tmdbRating: 8.8,
    genres: ["Anime", "Action & Adventure", "Science-Fiction & Fantasy"],
  },
  {
    title: "Arcane",
    tmdbId: 94605,
    year: 2021,
    tmdbRating: 8.8,
    genres: ["Anime", "Action & Adventure", "Science-Fiction & Fantasy"],
  },
  {
    title: "Band of Brothers",
    tmdbId: 4613,
    year: 2001,
    tmdbRating: 8.6,
    genres: ["History", "Action & Adventure", "Drama & Romance"],
  },
  {
    title: "Sherlock",
    tmdbId: 19885,
    year: 2010,
    tmdbRating: 8.5,
    genres: ["Mystery & Thriller", "Drama & Romance"],
  },
  {
    title: "True Detective",
    tmdbId: 46648,
    year: 2014,
    tmdbRating: 8.3,
    genres: ["Mystery & Thriller", "Drama & Romance"],
  },
  {
    title: "Fargo",
    tmdbId: 60622,
    year: 2014,
    tmdbRating: 8.3,
    genres: ["Mystery & Thriller", "Drama & Romance"],
  },
  {
    title: "Mad Men",
    tmdbId: 1104,
    year: 2007,
    tmdbRating: 8.1,
    genres: ["Drama & Romance"],
  },
  {
    title: "Succession",
    tmdbId: 76331,
    year: 2018,
    tmdbRating: 8.3,
    genres: ["Drama & Romance"],
  },
  {
    title: "The Leftovers",
    tmdbId: 54344,
    year: 2014,
    tmdbRating: 7.6,
    genres: ["Drama & Romance", "Science-Fiction & Fantasy"],
  },
  {
    title: "Dark",
    tmdbId: 70523,
    year: 2017,
    tmdbRating: 8.4,
    genres: ["Science-Fiction & Fantasy", "Mystery & Thriller"],
  },
  {
    title: "Severance",
    tmdbId: 95396,
    year: 2022,
    tmdbRating: 8.4,
    genres: ["Science-Fiction & Fantasy", "Mystery & Thriller"],
  },
  {
    title: "Stranger Things",
    tmdbId: 66732,
    year: 2016,
    tmdbRating: 8.6,
    genres: ["Science-Fiction & Fantasy", "Horror", "Drama & Romance"],
  },
  {
    title: "Mr. Robot",
    tmdbId: 62560,
    year: 2015,
    tmdbRating: 8.2,
    genres: ["Mystery & Thriller", "Drama & Romance"],
  },
  {
    title: "House",
    tmdbId: 1408,
    year: 2004,
    tmdbRating: 8.6,
    genres: ["Drama & Romance", "Mystery & Thriller"],
  },
  {
    title: "Peaky Blinders",
    tmdbId: 60574,
    year: 2013,
    tmdbRating: 8.5,
    genres: ["Drama & Romance", "Mystery & Thriller"],
  },
  {
    title: "The Crown",
    tmdbId: 65494,
    year: 2016,
    tmdbRating: 8.2,
    genres: ["History", "Drama & Romance"],
  },
  {
    title: "Lost",
    tmdbId: 4607,
    year: 2004,
    tmdbRating: 8.0,
    genres: ["Science-Fiction & Fantasy", "Mystery & Thriller"],
  },
  {
    title: "Dexter",
    tmdbId: 1405,
    year: 2006,
    tmdbRating: 8.2,
    genres: ["Mystery & Thriller", "Drama & Romance"],
  },
  {
    title: "Narcos",
    tmdbId: 63351,
    year: 2015,
    tmdbRating: 8.0,
    genres: ["Mystery & Thriller", "Drama & Romance"],
  },
  {
    title: "The Mandalorian",
    tmdbId: 82856,
    year: 2019,
    tmdbRating: 8.4,
    genres: ["Science-Fiction & Fantasy", "Action & Adventure"],
  },
  {
    title: "The Boys",
    tmdbId: 76479,
    year: 2019,
    tmdbRating: 8.4,
    genres: ["Action & Adventure", "Science-Fiction & Fantasy"],
  },
  {
    title: "Westworld",
    tmdbId: 63247,
    year: 2016,
    tmdbRating: 8.0,
    genres: ["Science-Fiction & Fantasy", "Mystery & Thriller"],
  },
  {
    title: "Andor",
    tmdbId: 83867,
    year: 2022,
    tmdbRating: 8.2,
    genres: ["Science-Fiction & Fantasy", "Action & Adventure"],
  },
  {
    title: "Shogun",
    tmdbId: 126308,
    year: 2024,
    tmdbRating: 8.5,
    genres: ["History", "Drama & Romance", "Action & Adventure"],
  },
  {
    title: "The Haunting of Hill House",
    tmdbId: 72844,
    year: 2018,
    tmdbRating: 8.1,
    genres: ["Horror", "Mystery & Thriller"],
  },
  {
    title: "Hannibal",
    tmdbId: 40008,
    year: 2013,
    tmdbRating: 8.2,
    genres: ["Horror", "Mystery & Thriller"],
  },
  {
    title: "The Bear",
    tmdbId: 136315,
    year: 2022,
    tmdbRating: 8.2,
    genres: ["Comedy", "Drama & Romance"],
  },
  {
    title: "Fleabag",
    tmdbId: 67070,
    year: 2016,
    tmdbRating: 8.3,
    genres: ["Comedy", "Drama & Romance"],
  },
  {
    title: "Community",
    tmdbId: 18347,
    year: 2009,
    tmdbRating: 8.0,
    genres: ["Comedy"],
  },
  {
    title: "Parks and Recreation",
    tmdbId: 8592,
    year: 2009,
    tmdbRating: 8.0,
    genres: ["Comedy"],
  },
  {
    title: "Brooklyn Nine-Nine",
    tmdbId: 48891,
    year: 2013,
    tmdbRating: 8.2,
    genres: ["Comedy"],
  },
  {
    title: "How I Met Your Mother",
    tmdbId: 1100,
    year: 2005,
    tmdbRating: 8.2,
    genres: ["Comedy", "Drama & Romance"],
  },
  {
    title: "Ted Lasso",
    tmdbId: 97546,
    year: 2020,
    tmdbRating: 8.4,
    genres: ["Comedy", "Drama & Romance"],
  },
  {
    title: "The Good Place",
    tmdbId: 66573,
    year: 2016,
    tmdbRating: 8.0,
    genres: ["Comedy", "Science-Fiction & Fantasy"],
  },
  {
    title: "The Queen's Gambit",
    tmdbId: 87739,
    year: 2020,
    tmdbRating: 8.5,
    genres: ["Drama & Romance", "History"],
  },
  {
    title: "The Expanse",
    tmdbId: 63639,
    year: 2015,
    tmdbRating: 8.1,
    genres: ["Science-Fiction & Fantasy", "Drama & Romance"],
  },
];

export const TOP_TV_FALLBACK_SUGGESTIONS = fallbackShows.map((show, index) => ({
  ...show,
  _id: `fallback-ai-${show.tmdbId}`,
  imageUrl: fallbackPosterUrl(show.title),
  isAISuggestion: true,
  matchScore: 99 - index,
  overview: "A highly rated TV series used as a neutral refill candidate.",
  popularity: 100 - index,
  recommendationScore: 99 - index,
  type: "tv-show",
}));
