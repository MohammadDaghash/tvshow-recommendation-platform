const buildTMDBCatalogUpdate = (tmdbShow) => ({
  title: tmdbShow.title,
  genres: tmdbShow.genres,
  year: tmdbShow.year,
  imageUrl: tmdbShow.imageUrl,
  overview: tmdbShow.overview,
  popularity: tmdbShow.popularity,
  tmdbRating: tmdbShow.tmdbRating,
  tmdbId: tmdbShow.tmdbId,
  recommendationScore: 0,
  userRating: null,
  watched: false,
});

module.exports = {
  buildTMDBCatalogUpdate,
};
