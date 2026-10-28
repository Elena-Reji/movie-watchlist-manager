
const express = require("express");
const Movie = require("../models/Movie");

const router = express.Router();

const genres = [
  "Action", "Comedy", "Drama", "Horror",
  "Sci-Fi", "Romance", "Thriller"
];

const platforms = [
  "Netflix", "Prime Video", "Hotstar",
  "Theatre", "Other"
];

const statuses = ["To Watch", "Watching", "Watched"];

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
    data: null
  });
}

function validMovieFields(body) {
  const { title, genre, releaseYear, runtime, platform, priority } = body;
  const year = new Date().getFullYear();

  if (
    typeof title !== "string" ||
    !title.trim() ||
    !genres.includes(genre) ||
    !Number.isInteger(Number(releaseYear)) ||
    Number(releaseYear) < 1950 ||
    Number(releaseYear) > year ||
    !Number.isInteger(Number(runtime)) ||
    Number(runtime) < 30 ||
    Number(runtime) > 300 ||
    !platforms.includes(platform) ||
    !Number.isInteger(Number(priority)) ||
    Number(priority) < 1 ||
    Number(priority) > 5
  ) {
    return false;
  }

  return true;
}

function validRating(value) {
  return Number.isInteger(Number(value)) &&
    Number(value) >= 1 && Number(value) <= 10;
}

function handleDatabaseError(res, error) {
  if (error.code === 11000) {
    return sendError(
      res, 409,
      "A movie with this title and release year already exists."
    );
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return sendError(res, 400, "Invalid movie data.");
  }

  console.error(error);
  return sendError(res, 500, "Internal server error.");
}

// GET /api/movies
// Query parameters: status, genre, search, page, limit
router.get("/", async (req, res) => {
  try {
    const { status, genre, search = "" } = req.query;
    const page = Number(req.query.page || 1);
    const limit = 6;

    if (!Number.isInteger(page) || page < 1) {
      return sendError(res, 400, "Page must be a positive integer.");
    }

    if (status && !statuses.includes(status)) {
      return sendError(res, 400, "Invalid status filter.");
    }

    if (genre && !genres.includes(genre)) {
      return sendError(res, 400, "Invalid genre filter.");
    }

    const filter = {};

    if (status) filter.status = status;
    if (genre) filter.genre = genre;

    if (search.trim()) {
      filter.title = {
        $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i"
      };
    }

    const totalMovies = await Movie.countDocuments(filter);
    const totalPages = Math.ceil(totalMovies / limit);

    const data = await Movie.find(filter)
      .sort({ status: 1, priority: -1, runtime: 1, createdAt: -1 })
      .collation({ locale: "en", strength: 2 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Put To Watch movies first, with priority descending.
    data.sort((a, b) => {
      if (a.status === "To Watch" && b.status !== "To Watch") return -1;
      if (b.status === "To Watch" && a.status !== "To Watch") return 1;
      return b.priority - a.priority || a.runtime - b.runtime;
    });

    res.json({
      success: true,
      message: "Movies retrieved successfully.",
      data: {
        movies: data,
        currentPage: page,
        totalPages,
        totalMovies
      }
    });
  } catch (error) {
    handleDatabaseError(res, error);
  }
});

// GET /api/movies/stats
router.get("/stats", async (req, res) => {
  try {
    const statusCounts = await Movie.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const watchedStats = await Movie.aggregate([
      { $match: { status: "Watched" } },
      {
        $group: {
          _id: null,
          totalMinutes: { $sum: "$runtime" },
          averageRating: { $avg: "$rating" }
        }
      }
    ]);

    const genreStats = await Movie.aggregate([
      { $match: { status: "Watched" } },
      { $group: { _id: "$genre", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 1 }
    ]);

    const counts = {
      "To Watch": 0,
      Watching: 0,
      Watched: 0
    };

    statusCounts.forEach(item => {
      counts[item._id] = item.count;
    });

    const watched = watchedStats[0] || {
      totalMinutes: 0,
      averageRating: null
    };

    res.json({
      success: true,
      message: "Statistics calculated successfully.",
      data: {
        statusCounts: counts,
        totalMovies: Object.values(counts).reduce((a, b) => a + b, 0),
        totalHoursWatched: Math.round(
          (watched.totalMinutes / 60) * 10
        ) / 10,
        averageRating: watched.averageRating == null
          ? null
          : Math.round(watched.averageRating * 10) / 10,
        topWatchedGenre: genreStats[0]?._id || null
      }
    });
  } catch (error) {
    handleDatabaseError(res, error);
  }
});

// GET /api/movies/watch-next
router.get("/watch-next", async (req, res) => {
  try {
    const movie = await Movie.findOne({ status: "To Watch" })
      .sort({ priority: -1, runtime: 1 });

    if (!movie) {
      return sendError(res, 404, "There are no movies left to watch.");
    }

    res.json({
      success: true,
      message: "Your next recommended movie.",
      data: movie
    });
  } catch (error) {
    handleDatabaseError(res, error);
  }
});

// POST /api/movies
router.post("/", async (req, res) => {
  try {
    if (!validMovieFields(req.body)) {
      return sendError(res, 400, "Please provide valid movie details.");
    }

    const year = Number(req.body.releaseYear);

    const previous = await Movie.findOne({ releaseYear: year })
      .sort({ movieCode: -1 })
      .select("movieCode");

    const previousSequence = previous
      ? Number(previous.movieCode.slice(-3))
      : 0;

    const movieCode =
      `MV-${year}-${String(previousSequence + 1).padStart(3, "0")}`;

    const movie = await Movie.create({
      title: req.body.title.trim(),
      genre: req.body.genre,
      releaseYear: year,
      runtime: Number(req.body.runtime),
      platform: req.body.platform,
      priority: Number(req.body.priority),
      movieCode,
      status: "To Watch"
    });

    res.status(201).json({
      success: true,
      message: "Movie added successfully.",
      data: movie
    });
  } catch (error) {
    handleDatabaseError(res, error);
  }
});

// PATCH /api/movies/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) return sendError(res, 404, "Movie not found.");

    const { status, rating } = req.body;

    const allowed = {
      "To Watch": ["Watching", "Watched"],
      Watching: ["Watched", "To Watch"],
      Watched: []
    };

    if (!allowed[movie.status].includes(status)) {
      return sendError(res, 400, "This status transition is not allowed.");
    }

    if (status === "Watched" && !validRating(rating)) {
      return sendError(
        res, 400, "A rating from 1 to 10 is required when marking Watched."
      );
    }

    movie.status = status;

    if (status === "Watched") {
      movie.rating = Number(rating);
      movie.watchedDate = new Date();
    } else {
      movie.rating = null;
      movie.watchedDate = null;
    }

    await movie.save();

    res.json({
      success: true,
      message: "Movie status updated successfully.",
      data: movie
    });
  } catch (error) {
    handleDatabaseError(res, error);
  }
});

// PATCH /api/movies/:id/rating
router.patch("/:id/rating", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) return sendError(res, 404, "Movie not found.");

    if (movie.status !== "Watched") {
      return sendError(res, 400, "Only Watched movies can be rated.");
    }

    if (!validRating(req.body.rating)) {
      return sendError(res, 400, "Rating must be between 1 and 10.");
    }

    movie.rating = Number(req.body.rating);
    await movie.save();

    res.json({
      success: true,
      message: "Rating updated successfully.",
      data: movie
    });
  } catch (error) {
    handleDatabaseError(res, error);
  }
});

// PUT /api/movies/:id
router.put("/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) return sendError(res, 404, "Movie not found.");

    if (!validMovieFields(req.body)) {
      return sendError(res, 400, "Please provide valid movie details.");
    }

    movie.title = req.body.title.trim();
    movie.genre = req.body.genre;
    movie.runtime = Number(req.body.runtime);
    movie.platform = req.body.platform;
    movie.priority = Number(req.body.priority);

    // Movie code, release year, status and watched details
    // cannot be modified through this endpoint.
    await movie.save();

    res.json({
      success: true,
      message: "Movie updated successfully.",
      data: movie
    });
  } catch (error) {
    handleDatabaseError(res, error);
  }
});

// DELETE /api/movies/:id
router.delete("/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) return sendError(res, 404, "Movie not found.");

    if (movie.status === "Watching") {
      return sendError(res, 400, "Movies currently being watched cannot be deleted.");
    }

    await Movie.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Movie deleted successfully.",
      data: movie
    });
  } catch (error) {
    handleDatabaseError(res, error);
  }
});

module.exports = router;
