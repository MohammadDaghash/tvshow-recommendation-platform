require("dotenv").config();

const mongoose = require("mongoose");
const TVShow = require("./models/TVShow");

const FALLBACK_IMAGE_URL =
  "https://placehold.co/300x450/1e293b/ffffff?text=No+Image";

const watchedTVShows = [
  {
    title: "Game of Thrones",
    searchTitle: "Game of Thrones",
    userRating: 9.3,
    fallbackGenres: ["Drama", "Fantasy", "Adventure"],
    fallbackYear: 2011,
  },
  {
    title: "13 Reasons Why",
    searchTitle: "13 Reasons Why",
    userRating: 7.6,
    fallbackGenres: ["Drama", "Mystery", "Thriller"],
    fallbackYear: 2017,
  },
  {
    title: "How to Get Away with Murder",
    searchTitle: "How to Get Away with Murder",
    userRating: 7.3,
    fallbackGenres: ["Drama", "Crime", "Mystery"],
    fallbackYear: 2014,
  },
  {
    title: "Peaky Blinders",
    searchTitle: "Peaky Blinders",
    userRating: 4,
    fallbackGenres: ["Drama", "Crime"],
    fallbackYear: 2013,
  },
  {
    title: "Breaking Bad",
    searchTitle: "Breaking Bad",
    userRating: 8.1,
    fallbackGenres: ["Crime", "Drama", "Thriller"],
    fallbackYear: 2008,
  },
  {
    title: "Friends",
    searchTitle: "Friends",
    userRating: 9.7,
    fallbackGenres: ["Comedy", "Romance"],
    fallbackYear: 1994,
  },
  {
    title: "Elite",
    searchTitle: "Elite",
    userRating: 7.5,
    fallbackGenres: ["Drama", "Crime", "Thriller"],
    fallbackYear: 2018,
  },
  {
    title: "Prison Break",
    searchTitle: "Prison Break",
    userRating: 7.8,
    fallbackGenres: ["Action", "Crime", "Drama", "Thriller"],
    fallbackYear: 2005,
  },
  {
    title: "How I Met Your Mother",
    searchTitle: "How I Met Your Mother",
    userRating: 9.7,
    fallbackGenres: ["Comedy", "Romance"],
    fallbackYear: 2005,
  },
  {
    title: "Rick and Morty",
    searchTitle: "Rick and Morty",
    userRating: 7.6,
    fallbackGenres: ["Animation", "Comedy", "Sci-Fi"],
    fallbackYear: 2013,
  },
  {
    title: "Attack on Titan",
    searchTitle: "Attack on Titan",
    userRating: 7.8,
    fallbackGenres: ["Animation", "Action", "Drama", "Fantasy"],
    fallbackYear: 2013,
  },
  {
    title: "The Office",
    searchTitle: "The Office US",
    userRating: 9.4,
    fallbackGenres: ["Comedy"],
    fallbackYear: 2005,
  },
  {
    title: "Money Heist",
    searchTitle: "La Casa de Papel",
    userRating: 7.3,
    fallbackGenres: ["Crime", "Drama", "Thriller"],
    fallbackYear: 2017,
  },
  {
    title: "Squid Game",
    searchTitle: "Squid Game",
    userRating: 7.4,
    fallbackGenres: ["Drama", "Thriller", "Action"],
    fallbackYear: 2021,
  },
  {
    title: "AlRawabi School",
    searchTitle: "AlRawabi School for Girls",
    userRating: 7.2,
    fallbackGenres: ["Drama"],
    fallbackYear: 2021,
  },
  {
    title: "How I Met Your Father",
    searchTitle: "How I Met Your Father",
    userRating: 8,
    fallbackGenres: ["Comedy", "Romance"],
    fallbackYear: 2022,
  },
  {
    title: "Bridgerton",
    searchTitle: "Bridgerton",
    userRating: 9.2,
    fallbackGenres: ["Drama", "Romance"],
    fallbackYear: 2020,
  },
  {
    title: "Uncoupled",
    searchTitle: "Uncoupled",
    userRating: 8,
    fallbackGenres: ["Comedy", "Romance"],
    fallbackYear: 2022,
  },
  {
    title: "Stranger Things",
    searchTitle: "Stranger Things",
    userRating: 9,
    fallbackGenres: ["Sci-Fi", "Drama", "Mystery"],
    fallbackYear: 2016,
  },
  {
    title: "Heartstopper",
    searchTitle: "Heartstopper",
    userRating: 9,
    fallbackGenres: ["Drama", "Romance"],
    fallbackYear: 2022,
  },
  {
    title: "Dahmer",
    searchTitle: "Dahmer - Monster: The Jeffrey Dahmer Story",
    userRating: 7.2,
    fallbackGenres: ["Crime", "Drama", "Thriller"],
    fallbackYear: 2022,
  },
  {
    title: "Wednesday",
    searchTitle: "Wednesday",
    userRating: 8.6,
    fallbackGenres: ["Comedy", "Fantasy", "Mystery"],
    fallbackYear: 2022,
  },
  {
    title: "Brooklyn Nine-Nine",
    searchTitle: "Brooklyn Nine-Nine",
    userRating: 9.2,
    fallbackGenres: ["Comedy", "Crime"],
    fallbackYear: 2013,
  },
  {
    title: "You",
    searchTitle: "You",
    userRating: 6.5,
    fallbackGenres: ["Crime", "Drama", "Thriller"],
    fallbackYear: 2018,
  },
  {
    title: "Euphoria",
    searchTitle: "Euphoria",
    userRating: 7.6,
    fallbackGenres: ["Drama"],
    fallbackYear: 2019,
  },
  {
    title: "Emily in Paris",
    searchTitle: "Emily in Paris",
    userRating: 7.6,
    fallbackGenres: ["Comedy", "Drama", "Romance"],
    fallbackYear: 2020,
  },
  {
    title: "Sex Education",
    searchTitle: "Sex Education",
    userRating: 9,
    fallbackGenres: ["Comedy", "Drama", "Romance"],
    fallbackYear: 2019,
  },
  {
    title: "Queen Charlotte",
    searchTitle: "Queen Charlotte: A Bridgerton Story",
    userRating: 9.3,
    fallbackGenres: ["Drama", "Romance"],
    fallbackYear: 2023,
  },
  {
    title: "Never Have I Ever",
    searchTitle: "Never Have I Ever",
    userRating: 8.4,
    fallbackGenres: ["Comedy", "Drama", "Romance"],
    fallbackYear: 2020,
  },
  {
    title: "Gossip Girl",
    searchTitle: "Gossip Girl",
    userRating: 8,
    fallbackGenres: ["Drama", "Romance"],
    fallbackYear: 2007,
  },
  {
    title: "Smiley",
    searchTitle: "Smiley",
    userRating: 7.5,
    fallbackGenres: ["Comedy", "Romance"],
    fallbackYear: 2022,
  },
  {
    title: "Young Sheldon",
    searchTitle: "Young Sheldon",
    userRating: 9.1,
    fallbackGenres: ["Comedy"],
    fallbackYear: 2017,
  },
  {
    title: "The Big Bang Theory",
    searchTitle: "The Big Bang Theory",
    userRating: 9.5,
    fallbackGenres: ["Comedy", "Romance"],
    fallbackYear: 2007,
  },
  {
    title: "Gilmore Girls",
    searchTitle: "Gilmore Girls",
    userRating: 8,
    fallbackGenres: ["Comedy", "Drama"],
    fallbackYear: 2000,
  },
  {
    title: "Modern Family",
    searchTitle: "Modern Family",
    userRating: 9.2,
    fallbackGenres: ["Comedy"],
    fallbackYear: 2009,
  },
  {
    title: "Abbott Elementary",
    searchTitle: "Abbott Elementary",
    userRating: 8.5,
    fallbackGenres: ["Comedy"],
    fallbackYear: 2021,
  },
  {
    title: "Ginny & Georgia",
    searchTitle: "Ginny & Georgia",
    userRating: 8,
    fallbackGenres: ["Comedy", "Drama"],
    fallbackYear: 2021,
  },
  {
    title: "Overcompensating",
    searchTitle: "Overcompensating",
    userRating: 8.6,
    fallbackGenres: ["Comedy"],
    fallbackYear: 2025,
  },
  {
    title: "2 Broke Girls",
    searchTitle: "2 Broke Girls",
    userRating: 9.1,
    fallbackGenres: ["Comedy"],
    fallbackYear: 2011,
  },
  {
    title: "Heated Rivalry",
    searchTitle: "Heated Rivalry",
    userRating: 9,
    fallbackGenres: ["Drama", "Romance"],
    fallbackYear: 2025,
  },
  {
    title: "Fellow Travelers",
    searchTitle: "Fellow Travelers",
    userRating: 8.5,
    fallbackGenres: ["Drama", "Romance", "History"],
    fallbackYear: 2023,
  },
  {
    title: "Dark",
    searchTitle: "Dark",
    userRating: null,
    watched: false,
    fallbackGenres: ["Drama", "Mystery", "Sci-Fi", "Thriller"],
    fallbackYear: 2017,
  },
  {
    title: "The Bear",
    searchTitle: "The Bear",
    userRating: null,
    watched: false,
    fallbackGenres: ["Comedy", "Drama"],
    fallbackYear: 2022,
  },
  {
    title: "Succession",
    searchTitle: "Succession",
    userRating: null,
    watched: false,
    fallbackGenres: ["Drama"],
    fallbackYear: 2018,
  },
  {
    title: "Severance",
    searchTitle: "Severance",
    userRating: null,
    watched: false,
    fallbackGenres: ["Drama", "Mystery", "Sci-Fi"],
    fallbackYear: 2022,
  },
  {
    title: "Black Mirror",
    searchTitle: "Black Mirror",
    userRating: null,
    watched: false,
    fallbackGenres: ["Drama", "Sci-Fi", "Thriller"],
    fallbackYear: 2011,
  },
  {
    title: "The Last of Us",
    searchTitle: "The Last of Us",
    userRating: null,
    watched: false,
    fallbackGenres: ["Drama", "Sci-Fi", "Thriller"],
    fallbackYear: 2023,
  },
  {
    title: "House of the Dragon",
    searchTitle: "House of the Dragon",
    userRating: null,
    watched: false,
    fallbackGenres: ["Drama", "Fantasy"],
    fallbackYear: 2022,
  },
  {
    title: "The White Lotus",
    searchTitle: "The White Lotus",
    userRating: null,
    watched: false,
    fallbackGenres: ["Comedy", "Drama"],
    fallbackYear: 2021,
  },
  {
    title: "Fleabag",
    searchTitle: "Fleabag",
    userRating: null,
    watched: false,
    fallbackGenres: ["Comedy", "Drama"],
    fallbackYear: 2016,
  },
  {
    title: "Schitt's Creek",
    searchTitle: "Schitt's Creek",
    userRating: null,
    watched: false,
    fallbackGenres: ["Comedy"],
    fallbackYear: 2015,
  },
  {
    title: "Community",
    searchTitle: "Community",
    userRating: null,
    watched: false,
    fallbackGenres: ["Comedy"],
    fallbackYear: 2009,
  },
  {
    title: "New Girl",
    searchTitle: "New Girl",
    userRating: null,
    watched: false,
    fallbackGenres: ["Comedy", "Romance"],
    fallbackYear: 2011,
  },
  {
    title: "Only Murders in the Building",
    searchTitle: "Only Murders in the Building",
    userRating: null,
    watched: false,
    fallbackGenres: ["Comedy", "Crime", "Mystery"],
    fallbackYear: 2021,
  },
  {
    title: "Ozark",
    searchTitle: "Ozark",
    userRating: null,
    watched: false,
    fallbackGenres: ["Crime", "Drama", "Thriller"],
    fallbackYear: 2017,
  },
  {
    title: "Better Call Saul",
    searchTitle: "Better Call Saul",
    userRating: null,
    watched: false,
    fallbackGenres: ["Crime", "Drama"],
    fallbackYear: 2015,
  },
  {
    title: "Mindhunter",
    searchTitle: "Mindhunter",
    userRating: null,
    watched: false,
    fallbackGenres: ["Crime", "Drama", "Thriller"],
    fallbackYear: 2017,
  },
  {
    title: "Alice in Borderland",
    searchTitle: "Alice in Borderland",
    userRating: null,
    watched: false,
    fallbackGenres: ["Action", "Drama", "Mystery", "Sci-Fi"],
    fallbackYear: 2020,
  },
  {
    title: "All of Us Are Dead",
    searchTitle: "All of Us Are Dead",
    userRating: null,
    watched: false,
    fallbackGenres: ["Action", "Drama", "Horror"],
    fallbackYear: 2022,
  },
  {
    title: "The End of the F***ing World",
    searchTitle: "The End of the F***ing World",
    userRating: null,
    watched: false,
    fallbackGenres: ["Comedy", "Crime", "Drama"],
    fallbackYear: 2017,
  },
  {
    title: "One Day",
    searchTitle: "One Day",
    userRating: null,
    watched: false,
    fallbackGenres: ["Drama", "Romance"],
    fallbackYear: 2024,
  },
  {
    title: "Normal People",
    searchTitle: "Normal People",
    userRating: null,
    watched: false,
    fallbackGenres: ["Drama", "Romance"],
    fallbackYear: 2020,
  },
  {
    title: "The Summer I Turned Pretty",
    searchTitle: "The Summer I Turned Pretty",
    userRating: null,
    watched: false,
    fallbackGenres: ["Drama", "Romance"],
    fallbackYear: 2022,
  },
  {
    title: "Love, Victor",
    searchTitle: "Love, Victor",
    userRating: null,
    watched: false,
    fallbackGenres: ["Comedy", "Drama", "Romance"],
    fallbackYear: 2020,
  },
  {
    title: "Arcane",
    searchTitle: "Arcane",
    userRating: null,
    watched: false,
    fallbackGenres: ["Animation", "Action", "Fantasy"],
    fallbackYear: 2021,
  },
  {
    title: "Invincible",
    searchTitle: "Invincible",
    userRating: null,
    watched: false,
    fallbackGenres: ["Animation", "Action", "Drama"],
    fallbackYear: 2021,
  },
];

const normalizeText = (text) => {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
};

const pickBestMatch = (results, item) => {
  if (!results.length) {
    return null;
  }

  const normalizedTitle = normalizeText(item.searchTitle);

  const exactMatch = results.find((result) => {
    return normalizeText(result.show.name) === normalizedTitle;
  });

  return exactMatch || results[0];
};

const fetchTVShowMetadata = async (item) => {
  try {
    const response = await fetch(
      `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(
        item.searchTitle,
      )}`,
    );

    if (!response.ok) {
      throw new Error(`TVMaze request failed for ${item.title}`);
    }

    const results = await response.json();
    const bestMatch = pickBestMatch(results, item);
    const show = bestMatch?.show;

    return {
      title: item.title,
      genres: show?.genres?.length ? show.genres : item.fallbackGenres,
      year: show?.premiered
        ? Number(show.premiered.slice(0, 4))
        : item.fallbackYear,
      imageUrl:
        show?.image?.original || show?.image?.medium || FALLBACK_IMAGE_URL,
      userRating: item.userRating,
      watched: item.watched ?? true,
      recommendationScore: 0,
      type: "tv-show",
    };
  } catch (error) {
    console.log(`Using fallback data for ${item.title}: ${error.message}`);

    return {
      title: item.title,
      genres: item.fallbackGenres,
      year: item.fallbackYear,
      imageUrl: FALLBACK_IMAGE_URL,
      userRating: item.userRating,
      recommendationScore: 0,
      type: "tv-show",
    };
  }
};

const seedTVShows = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");
    console.log("Seeding TV shows...");

    for (const item of watchedTVShows) {
      const tvShowData = await fetchTVShowMetadata(item);

      await TVShow.findOneAndUpdate(
        { title: tvShowData.title },
        { $set: tvShowData },
        {
          returnDocument: "after",
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );

      console.log(`Upserted: ${tvShowData.title}`);
    }

    console.log("TV show seed completed successfully");
  } catch (error) {
    console.error("Seed failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
};

seedTVShows();
