const {
  createCategoryVector,
  cosineSimilarity,
} = require("../utils/recommendation.utils");

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const AI_SUGGESTION_CANDIDATE_LIMIT = 40;

const genreMap = {
  Comedy: 35,
  Drama: 18,
  Romance: 10749,
  Crime: 80,
  Thriller: 53,
  Mystery: 9648,
  Horror: 27,
  Fantasy: 10765,
  "Sci-Fi": 10765,
  "Science Fiction": 10765,
  Adventure: 10759,
  Animation: 16,
  Anime: 16,
};

const genreNameMap = {
  18: "Drama",
  35: "Comedy",
  10749: "Romance",
  80: "Crime",
  53: "Thriller",
  9648: "Mystery",
  27: "Horror",
  10765: "Fantasy & Sci-Fi",
  10759: "Adventure",
  16: "Animation",
};

const normalizeTitle = (title) => {
  return String(title || "")
    .toLowerCase()
    .trim();
};

const createProfileVector = (watchedShows = []) => {
  if (watchedShows.length === 0) {
    return createCategoryVector([]);
  }

  const watchedVectors = watchedShows.map((show) => ({
    vector: createCategoryVector(show.genres || []),
    rating: show.userRating || 5,
  }));

  const totalRatingWeight = watchedVectors.reduce((sum, show) => {
    return sum + show.rating;
  }, 0);

  if (totalRatingWeight === 0) {
    return createCategoryVector([]);
  }

  return watchedVectors[0].vector.map((_, index) => {
    const weightedSum = watchedVectors.reduce((total, show) => {
      return total + show.vector[index] * show.rating;
    }, 0);

    return weightedSum / totalRatingWeight;
  });
};

const getFavoriteGenreIds = (watchedShows = []) => {
  const genreFrequency = {};

  watchedShows.forEach((show) => {
    const ratingWeight = show.userRating || 5;

    (show.genres || []).forEach((genre) => {
      genreFrequency[genre] = (genreFrequency[genre] || 0) + ratingWeight;
    });
  });

  return Object.entries(genreFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genreMap[genre])
    .filter(Boolean)
    .slice(0, 3);
};

const buildTMDBRecommendations = ({
  tmdbResults = [],
  watchedShows = [],
  excludedTMDBIds = [],
  excludedTitles = [],
  limit = 20,
}) => {
  const excludedTMDBIdSet = new Set(excludedTMDBIds.filter(Boolean));
  const excludedTitleSet = new Set(
    excludedTitles.map(normalizeTitle).filter(Boolean),
  );
  const userProfileVector = createProfileVector(watchedShows);

  return tmdbResults
    .filter((show) => {
      return (
        !excludedTMDBIdSet.has(show.id) &&
        !excludedTitleSet.has(normalizeTitle(show.name))
      );
    })
    .map((show) => {
      const showGenres = show.genre_ids
        .map((id) => genreNameMap[id])
        .filter(Boolean);

      const showVector = createCategoryVector(showGenres);

      const genreSimilarity = Math.round(
        cosineSimilarity(userProfileVector, showVector) * 100,
      );

      const categoryPreference = genreSimilarity;
      const tmdbScore = Math.min(
        100,
        Math.round((show.vote_average || 0) * 10),
      );
      const popularityScore = Math.min(
        100,
        Math.round((show.popularity || 0) / 2),
      );
      const yearSimilarity = 80;

      const recommendationScore = Math.round(
        genreSimilarity * 0.4 +
          categoryPreference * 0.2 +
          tmdbScore * 0.2 +
          popularityScore * 0.1 +
          yearSimilarity * 0.1,
      );

      return {
        tmdbId: show.id,
        title: show.name,
        genres: showGenres,
        year: show.first_air_date
          ? Number(show.first_air_date.slice(0, 4))
          : null,
        imageUrl: show.poster_path
          ? `${TMDB_IMAGE_BASE_URL}${show.poster_path}`
          : "",
        overview: show.overview,
        tmdbRating: show.vote_average,
        popularity: show.popularity,
        recommendationScore,
        matchScore: recommendationScore,
        isAISuggestion: true,
        scoreBreakdown: {
          genreSimilarity,
          categoryPreference,
          tmdbRating: tmdbScore,
          popularity: popularityScore,
          yearSimilarity,
        },
        similarWatchedShows: watchedShows
          .map((watchedShow) => {
            const watchedVector = createCategoryVector(watchedShow.genres || []);

            return {
              title: watchedShow.title,
              similarity: cosineSimilarity(showVector, watchedVector),
            };
          })
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 3),
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
};

module.exports = {
  AI_SUGGESTION_CANDIDATE_LIMIT,
  buildTMDBRecommendations,
  getFavoriteGenreIds,
  normalizeTitle,
};
