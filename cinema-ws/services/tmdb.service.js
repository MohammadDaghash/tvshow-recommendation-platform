const axios = require("axios");

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

const searchTVShows = async (title) => {
  const response = await axios.get(`${TMDB_BASE_URL}/search/tv`, {
    params: {
      api_key: TMDB_API_KEY,
      query: title,
    },
  });

  return response.data.results.slice(0, 8).map((show) => ({
    tmdbId: show.id,
    title: show.name,
    year: show.first_air_date ? Number(show.first_air_date.slice(0, 4)) : null,
    imageUrl: show.poster_path
      ? `${TMDB_IMAGE_BASE_URL}${show.poster_path}`
      : "",
    overview: show.overview,
    tmdbRating: show.vote_average,
    originalLanguage: show.original_language || null,
    originCountry: show.origin_country || [],
    voteCount: show.vote_count || 0,
    popularity: show.popularity,
  }));
};

const getTVShowDetailsById = async (tmdbId) => {
  const detailsResponse = await axios.get(`${TMDB_BASE_URL}/tv/${tmdbId}`, {
    params: {
      api_key: TMDB_API_KEY,
    },
  });

  const details = detailsResponse.data;

  return {
    title: details.name,
    genres: details.genres.map((genre) => genre.name),
    year: details.first_air_date
      ? Number(details.first_air_date.slice(0, 4))
      : null,
    imageUrl: details.poster_path
      ? `${TMDB_IMAGE_BASE_URL}${details.poster_path}`
      : "",
    overview: details.overview,
    popularity: details.popularity,
    tmdbRating: details.vote_average,
    originalLanguage: details.original_language || null,
    originCountry: details.origin_country || [],
    voteCount: details.vote_count || 0,
    tmdbId: details.id,
  };
};

module.exports = {
  searchTVShows,
  getTVShowDetailsById,
};
