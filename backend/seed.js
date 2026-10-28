
require("dotenv").config();

const mongoose = require("mongoose");
const Movie = require("./models/Movie");

const sampleMovies = [
  {
    movieCode: "MV-2019-001",
    title: "Joker",
    genre: "Drama",
    releaseYear: 2019,
    runtime: 122,
    platform: "Prime Video",
    priority: 5,
    status: "To Watch"
  },
  {
    movieCode: "MV-2021-001",
    title: "Dune",
    genre: "Sci-Fi",
    releaseYear: 2021,
    runtime: 155,
    platform: "Netflix",
    priority: 4,
    status: "To Watch"
  },
  {
    movieCode: "MV-2019-002",
    title: "Avengers: Endgame",
    genre: "Action",
    releaseYear: 2019,
    runtime: 181,
    platform: "Hotstar",
    priority: 3,
    status: "Watched",
    rating: 9,
    watchedDate: new Date("2026-01-10")
  },
  {
    movieCode: "MV-2014-001",
    title: "Interstellar",
    genre: "Sci-Fi",
    releaseYear: 2014,
    runtime: 169,
    platform: "Other",
    priority: 2,
    status: "Watched",
    rating: 10,
    watchedDate: new Date("2026-02-12")
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // WARNING: This clears the movie collection before seeding.
    await Movie.deleteMany({});
    await Movie.insertMany(sampleMovies);

    console.log("Successfully inserted 4 sample movies.");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
