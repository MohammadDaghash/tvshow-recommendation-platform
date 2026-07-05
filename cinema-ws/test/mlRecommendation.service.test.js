const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AI_SUGGESTION_CANDIDATE_LIMIT,
  AI_SUGGESTION_FETCH_PAGE_COUNT,
  buildTMDBSuggestionRequest,
  buildTMDBRecommendations,
  getFavoriteGenreIds,
  getPreferredOriginalLanguage,
  resolveSuggestionExcludedShows,
  resolveSuggestionIgnoredSuggestions,
  resolveSuggestionProfileShows,
} = require("../services/mlRecommendation.service");

const tmdbShow = (id, voteAverage = 9, originalLanguage = "en") => ({
  id,
  name: `TMDB Show ${id}`,
  genre_ids: [35],
  first_air_date: "2024-01-01",
  poster_path: `/poster-${id}.jpg`,
  overview: `Overview ${id}`,
  vote_average: voteAverage,
  vote_count: 1000,
  popularity: 90 - id,
  original_language: originalLanguage,
  origin_country: originalLanguage === "ko" ? ["KR"] : ["US"],
});

test("AI suggestion settings keep a deep refill buffer beyond 20 visible picks", () => {
  assert.equal(AI_SUGGESTION_CANDIDATE_LIMIT, 80);
  assert.equal(AI_SUGGESTION_FETCH_PAGE_COUNT, 10);
  assert.ok(AI_SUGGESTION_CANDIDATE_LIMIT >= 20 * 4);
});

test("buildTMDBRecommendations filters excluded candidates before limiting to 20", () => {
  const recommendations = buildTMDBRecommendations({
    tmdbResults: Array.from({ length: 23 }, (_, index) => tmdbShow(index + 1)),
    watchedShows: [
      {
        title: "Liked Comedy",
        genres: ["Comedy"],
        userRating: 9,
      },
    ],
    excludedTMDBIds: [1, 2, 3],
    excludedTitles: [],
    limit: 20,
  });

  assert.equal(recommendations.length, 20);
  assert.deepEqual(
    recommendations.map((show) => show.tmdbId),
    Array.from({ length: 20 }, (_, index) => index + 4),
  );
});

test("buildTMDBRecommendations excludes candidates by normalized title", () => {
  const recommendations = buildTMDBRecommendations({
    tmdbResults: [tmdbShow(1), tmdbShow(2), tmdbShow(3)],
    watchedShows: [
      {
        title: "Liked Comedy",
        genres: ["Comedy"],
        userRating: 9,
      },
    ],
    excludedTMDBIds: [],
    excludedTitles: [" tmdb show 2 "],
    limit: 20,
  });

  assert.deepEqual(
    recommendations.map((show) => show.tmdbId),
    [1, 3],
  );
});

test("buildTMDBRecommendations preserves TMDB top-rated order for cold-start users", () => {
  const recommendations = buildTMDBRecommendations({
    tmdbResults: [
      tmdbShow(1, 9.9),
      {
        ...tmdbShow(2, 9.8),
        popularity: 200,
      },
      tmdbShow(3, 9.7),
    ],
    watchedShows: [],
    excludedTMDBIds: [],
    excludedTitles: [],
    limit: 3,
  });

  assert.deepEqual(
    recommendations.map((show) => show.tmdbId),
    [1, 2, 3],
  );
  assert.equal(recommendations[0].matchScore, 99);
});

test("buildTMDBRecommendations ranks preferred-language shows above higher-rated mismatches", () => {
  const recommendations = buildTMDBRecommendations({
    tmdbResults: [tmdbShow(1, 9.9, "ko"), tmdbShow(2, 8.6, "en")],
    watchedShows: [],
    excludedTMDBIds: [],
    excludedTitles: [],
    preferredOriginalLanguage: "en",
    limit: 2,
  });

  assert.deepEqual(
    recommendations.map((show) => show.tmdbId),
    [2, 1],
  );
  assert.equal(recommendations[0].originalLanguage, "en");
  assert.deepEqual(recommendations[0].originCountry, ["US"]);
  assert.equal(recommendations[0].voteCount, 1000);
  assert.ok(
    recommendations[0].scoreBreakdown.languagePreference >
      recommendations[1].scoreBreakdown.languagePreference,
  );
});

test("buildTMDBRecommendations exposes vector similarity math for personalized ranking", () => {
  const recommendations = buildTMDBRecommendations({
    tmdbResults: [
      {
        ...tmdbShow(1, 8.1, "en"),
        name: "Matching Prestige Drama",
        genre_ids: [18, 80],
        popularity: 30,
        first_air_date: "2005-01-01",
      },
      {
        ...tmdbShow(2, 9.9, "en"),
        name: "High Rated Sitcom",
        genre_ids: [35],
        popularity: 100,
        first_air_date: "2024-01-01",
      },
    ],
    watchedShows: [
      {
        title: "Breaking Bad",
        genres: ["Drama & Romance", "Mystery & Thriller"],
        userRating: 10,
        tmdbRating: 9,
        popularity: 90,
        year: 2008,
        originalLanguage: "en",
      },
    ],
    excludedTMDBIds: [],
    excludedTitles: [],
    preferredOriginalLanguage: "en",
    limit: 2,
  });

  assert.equal(recommendations[0].tmdbId, 1);
  assert.equal(recommendations[0].recommendationModel, "vector-content-v1");
  assert.ok(recommendations[0].scoreBreakdown.vectorSimilarity > 90);
  assert.ok(
    recommendations[0].scoreBreakdown.vectorSimilarity >
      recommendations[1].scoreBreakdown.vectorSimilarity,
  );
});

test("getPreferredOriginalLanguage defaults to English and learns from rated history", () => {
  assert.equal(getPreferredOriginalLanguage([]), "en");
  assert.equal(
    getPreferredOriginalLanguage([
      {
        title: "Liked Korean Drama",
        originalLanguage: "ko",
        userRating: 9,
      },
      {
        title: "Lower Rated English Drama",
        originalLanguage: "en",
        userRating: 5,
      },
    ]),
    "ko",
  );
});

test("getFavoriteGenreIds supports canonical UI genres for TMDB discovery", () => {
  assert.deepEqual(
    getFavoriteGenreIds([
      {
        title: "Breaking Bad",
        genres: ["Drama & Romance", "Mystery & Thriller"],
        userRating: 10,
      },
      {
        title: "Arcane",
        genres: ["Science-Fiction & Fantasy", "Action & Adventure"],
        userRating: 9,
      },
    ]),
    [18, 80, 10765],
  );
});

test("resolveSuggestionProfileShows does not fall back to public taste data for empty normal users", () => {
  const catalogWatchedShows = [
    {
      title: "Admin Watched Show",
      genres: ["Drama"],
      userRating: 10,
    },
  ];

  assert.deepEqual(
    resolveSuggestionProfileShows({
      user: {
        role: "user",
      },
      personalizedWatchedShows: [],
      catalogWatchedShows,
    }),
    [],
  );
});

test("resolveSuggestionProfileShows keeps public taste data for visitors and admin", () => {
  const catalogWatchedShows = [
    {
      title: "Public Demo Show",
      genres: ["Comedy"],
      userRating: 9,
    },
  ];

  assert.deepEqual(
    resolveSuggestionProfileShows({
      user: null,
      personalizedWatchedShows: [],
      catalogWatchedShows,
    }),
    catalogWatchedShows,
  );

  assert.deepEqual(
    resolveSuggestionProfileShows({
      user: {
        role: "admin",
      },
      personalizedWatchedShows: [],
      catalogWatchedShows,
    }),
    catalogWatchedShows,
  );
});

test("resolveSuggestionExcludedShows keeps normal users separate from the admin catalog", () => {
  const catalogShows = [
    {
      title: "Admin Catalog Show",
      tmdbId: 1,
    },
  ];
  const userLibraryShows = [
    {
      title: "Private User Show",
      tmdbId: 2,
    },
  ];

  assert.deepEqual(
    resolveSuggestionExcludedShows({
      user: {
        role: "user",
      },
      catalogShows,
      userLibraryShows,
    }),
    userLibraryShows,
  );
});

test("resolveSuggestionExcludedShows keeps demo/admin exclusions public", () => {
  const catalogShows = [
    {
      title: "Public Catalog Show",
      tmdbId: 1,
    },
  ];

  assert.deepEqual(
    resolveSuggestionExcludedShows({
      user: null,
      catalogShows,
      userLibraryShows: [],
    }),
    catalogShows,
  );

  assert.deepEqual(
    resolveSuggestionExcludedShows({
      user: {
        role: "admin",
      },
      catalogShows,
      userLibraryShows: [],
    }),
    catalogShows,
  );
});

test("resolveSuggestionIgnoredSuggestions keeps normal user feedback private", () => {
  const globalIgnoredSuggestions = [
    {
      title: "Globally Hidden Show",
      tmdbId: 1,
    },
  ];
  const userIgnoredSuggestions = [
    {
      title: "User Hidden Show",
      tmdbId: 2,
    },
  ];

  assert.deepEqual(
    resolveSuggestionIgnoredSuggestions({
      user: {
        role: "user",
      },
      globalIgnoredSuggestions,
      userIgnoredSuggestions,
    }),
    userIgnoredSuggestions,
  );
});

test("resolveSuggestionIgnoredSuggestions combines global and admin feedback for demo admins", () => {
  const globalIgnoredSuggestions = [
    {
      title: "Globally Hidden Show",
      tmdbId: 1,
    },
  ];
  const userIgnoredSuggestions = [
    {
      title: "Admin Hidden Show",
      tmdbId: 2,
    },
  ];

  assert.deepEqual(
    resolveSuggestionIgnoredSuggestions({
      user: {
        role: "admin",
      },
      globalIgnoredSuggestions,
      userIgnoredSuggestions,
    }),
    [...globalIgnoredSuggestions, ...userIgnoredSuggestions],
  );
});

test("buildTMDBRecommendations refills to 20 after ignored ids are excluded", () => {
  const recommendations = buildTMDBRecommendations({
    tmdbResults: Array.from({ length: 26 }, (_, index) => tmdbShow(index + 1)),
    watchedShows: [],
    excludedTMDBIds: [1, 2, 3, 4, 5, 6],
    excludedTitles: [],
    limit: 20,
  });

  assert.equal(recommendations.length, 20);
  assert.deepEqual(
    recommendations.map((show) => show.tmdbId),
    Array.from({ length: 20 }, (_, index) => index + 7),
  );
});

test("buildTMDBSuggestionRequest uses language-filtered discovery for cold-start users", () => {
  assert.deepEqual(
    buildTMDBSuggestionRequest({
      apiKey: "tmdb-key",
      favoriteGenreIds: [],
      page: 2,
      preferredOriginalLanguage: "en",
    }),
    {
      path: "/discover/tv",
      params: {
        "vote_count.gte": 50,
        api_key: "tmdb-key",
        language: "en-US",
        page: 2,
        sort_by: "vote_average.desc",
        with_original_language: "en",
      },
    },
  );
});

test("buildTMDBSuggestionRequest uses genre discovery after the user has a profile", () => {
  assert.deepEqual(
    buildTMDBSuggestionRequest({
      apiKey: "tmdb-key",
      favoriteGenreIds: [35],
      page: 1,
      preferredOriginalLanguage: "en",
    }),
    {
      path: "/discover/tv",
      params: {
        api_key: "tmdb-key",
        sort_by: "vote_average.desc",
        "vote_count.gte": 50,
        language: "en-US",
        page: 1,
        with_genres: 35,
        with_original_language: "en",
      },
    },
  );
});
