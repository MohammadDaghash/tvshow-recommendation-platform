const { buildCatalogShowUpdate } = require("./catalogLibrary.service");

const buildTMDBCatalogUpdate = (tmdbShow) => ({
  title: tmdbShow.title,
  genres: tmdbShow.genres,
  year: tmdbShow.year,
  imageUrl: tmdbShow.imageUrl,
  overview: tmdbShow.overview,
  popularity: tmdbShow.popularity,
  tmdbRating: tmdbShow.tmdbRating,
  originalLanguage: tmdbShow.originalLanguage || null,
  originCountry: tmdbShow.originCountry || [],
  voteCount: tmdbShow.voteCount || 0,
  tmdbId: tmdbShow.tmdbId,
  recommendationScore: 0,
  userRating: null,
  watched: false,
});

const buildTMDBCatalogStatusUpdate = (tmdbShow, status, { userRating } = {}) => ({
  ...buildTMDBCatalogUpdate(tmdbShow),
  ...buildCatalogShowUpdate(status, { userRating }),
});

module.exports = {
  buildTMDBCatalogStatusUpdate,
  buildTMDBCatalogUpdate,
};
