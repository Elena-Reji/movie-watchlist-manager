
import { useCallback, useEffect, useState } from "react";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/movies`;

const GENRES = [
  "Action", "Comedy", "Drama", "Horror",
  "Sci-Fi", "Romance", "Thriller"
];

const PLATFORMS = [
  "Netflix", "Prime Video", "Hotstar", "Theatre", "Other"
];

const EMPTY_FORM = {
  title: "",
  genre: "Action",
  releaseYear: new Date().getFullYear(),
  runtime: 120,
  platform: "Netflix",
  priority: 3
};

async function request(url, options = {}) {
  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  } catch {
    throw new Error(
      "Cannot connect to the backend. Check whether the server is running."
    );
  }

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Request failed.");
  }

  return result.data;
}

function MovieForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial || EMPTY_FORM);
    setError("");
  }, [initial]);

  function change(event) {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Enter a movie title.");
      return;
    }

    const year = Number(form.releaseYear);
    const runtime = Number(form.runtime);
    const priority = Number(form.priority);

    if (
      !Number.isInteger(year) ||
      year < 1950 ||
      year > new Date().getFullYear()
    ) {
      setError("Release year must be between 1950 and the current year.");
      return;
    }

    if (!Number.isInteger(runtime) || runtime < 30 || runtime > 300) {
      setError("Runtime must be between 30 and 300 minutes.");
      return;
    }

    if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
      setError("Priority must be between 1 and 5.");
      return;
    }

    setSaving(true);

    try {
      await onSave({
        ...form,
        title: form.title.trim(),
        releaseYear: year,
        runtime,
        priority
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="movie-form" onSubmit={submit}>
      <h2>{initial ? "Edit movie" : "Add a movie"}</h2>

      <label>
        Movie title
        <input
          name="title"
          value={form.title}
          onChange={change}
          required
          maxLength="150"
          placeholder="Enter movie title"
        />
      </label>

      <div className="form-grid">
        <label>
          Genre
          <select name="genre" value={form.genre} onChange={change}>
            {GENRES.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          Release year
          <input
            name="releaseYear"
            type="number"
            min="1950"
            max={new Date().getFullYear()}
            value={form.releaseYear}
            onChange={change}
          
            required
          />
        </label>

        <label>
          Runtime (minutes)
          <input
            name="runtime"
            type="number"
            min="30"
            max="300"
            value={form.runtime}
            onChange={change}
            required
          />
        </label>

        <label>
          Platform
          <select name="platform" value={form.platform} onChange={change}>
            {PLATFORMS.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          Priority
          <select
            name="priority"
            value={form.priority}
            onChange={change}
          >
            {[5, 4, 3, 2, 1].map(value => (
              <option key={value} value={value}>
                {value} {value === 5 ? "(Highest)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="button-row">
        <button className="primary" disabled={saving}>
          {saving ? "Saving..." : initial ? "Save changes" : "Add movie"}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function MovieCard({ movie, onEdit, onStatus, onDelete, onRate }) {
  const [nextStatus, setNextStatus] = useState("");
  const [rating, setRating] = useState(movie.rating || 8);
  const [error, setError] = useState("");

  const transitions = {
    "To Watch": ["Watching", "Watched"],
    Watching: ["Watched", "To Watch"],
    Watched: []
  };

  async function changeStatus() {
    if (!nextStatus) return;

    let chosenRating;

    if (nextStatus === "Watched") {
      chosenRating = Number(
        window.prompt("Give this movie a rating from 1 to 10:", "8")
      );

      if (
        !Number.isInteger(chosenRating) ||
        chosenRating < 1 ||
        chosenRating > 10
      ) {
        setError("Please enter a whole-number rating from 1 to 10.");
        return;
      }
    }

    setError("");

    try {
      await onStatus(movie._id, nextStatus, chosenRating);
      setNextStatus("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeRating() {
    const value = Number(rating);

    if (!Number.isInteger(value) || value < 1 || value > 10) {
      setError("Rating must be between 1 and 10.");
      return;
    }

    try {
      await onRate(movie._id, value);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeMovie() {
    if (movie.status === "Watching") return;

    if (!window.confirm(`Delete "${movie.title}" permanently?`)) return;

    try {
      await onDelete(movie._id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <article className="movie-card">
      <div className="card-top">
        <span className="movie-code">{movie.movieCode}</span>
        <span className={`status ${movie.status.toLowerCase().replaceAll(" ", "-")}`}>
          {movie.status}
        </span>
      </div>

      <h3>{movie.title}</h3>
      <p className="genre">{movie.genre} · {movie.releaseYear}</p>

      <div className="movie-details">
        <span>◷ {movie.runtime} min</span>
        <span>Priority: {movie.priority}/5</span>
      </div>

      <p className="platform">Available on: {movie.platform}</p>

      {movie.status === "Watched" && (
        <div className="rating-row">
          <span>Rating: {movie.rating ?? "Not rated"}/10</span>
          <select
            aria-label={`Rating for ${movie.title}`}
            value={rating}
            onChange={event => setRating(event.target.value)}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
              <option key={value} value={value}>{value}/10</option>
            ))}
          </select>
          <button className="small secondary" onClick={changeRating}>
            Save rating
          </button>
        </div>
      )}

      {movie.status !== "Watched" && (
        <div className="status-controls">
          <select
            aria-label={`Next status for ${movie.title}`}
            value={nextStatus}
            onChange={event => setNextStatus(event.target.value)}
          >
            <option value="">Change status...</option>
            {transitions[movie.status].map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button
            className="small primary"
            disabled={!nextStatus}
            onClick={changeStatus}
          >
            Update
          </button>
        </div>
      )}

      <div className="card-actions">
        <button className="secondary small" onClick={() => onEdit(movie)}>
          Edit
        </button>
        <button
          className="danger small"
          disabled={movie.status === "Watching"}
          title={
            movie.status === "Watching"
              ? "Movies currently being watched cannot be deleted"
              : "Delete movie"
          }
          onClick={removeMovie}
        >
          Delete
        </button>
      </div>

      {error && <p className="error">{error}</p>}
    </article>
  );
}

export default function App() {
  const [movies, setMovies] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [genre, setGenre] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalPages: 0,
    totalMovies: 0
  });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadMovies = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ page: String(page) });

      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (genre) params.set("genre", genre);

      const result = await request(`${API}?${params}`);
      setMovies(result.movies);
      setPagination({
        totalPages: result.totalPages,
        totalMovies: result.totalMovies
      });
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, genre]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await request(`${API}/stats`));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadMovies(), loadStats()]);
  }, [loadMovies, loadStats]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  async function saveMovie(form) {
    const isEditing = Boolean(editing);

    await request(
      isEditing ? `${API}/${editing._id}` : API,
      {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(form)
      }
    );

    setShowForm(false);
    setEditing(null);
    setMessage(isEditing ? "Movie updated." : "Movie added.");
    await refresh();
  }

  async function changeStatus(id, newStatus, rating) {
    await request(`${API}/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus, rating })
    });

    setMessage("Movie status updated.");
    await refresh();
  }

  async function changeRating(id, rating) {
    await request(`${API}/${id}/rating`, {
      method: "PATCH",
      body: JSON.stringify({ rating })
    });

    setMessage("Rating saved.");
    await refresh();
  }

  async function deleteMovie(id) {
    await request(`${API}/${id}`, { method: "DELETE" });
    setMessage("Movie deleted.");
    await refresh();
  }

  async function watchNext() {
    setError("");
    setMessage("");

    try {
      const movie = await request(`${API}/watch-next`);
      setRecommendation(movie);
    } catch (err) {
      setRecommendation(null);
      setError(err.message);
    }
  }

  function startAdd() {
    setEditing(null);
    setShowForm(true);
    setMessage("");
  }

  function startEdit(movie) {
    setEditing(movie);
    setShowForm(true);
    setMessage("");
  }

  function resetFilters() {
    setSearch("");
    setStatus("");
    setGenre("");
    setPage(1);
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">YOUR PERSONAL CINEMA</p>
          <h1>Movie Watchlist<span>.</span></h1>
          <p className="hero-description">
            Keep track of what you love, what you are watching
            and what deserves your next movie night.
          </p>
        </div>
        <button className="primary add-button" onClick={startAdd}>
          + Add movie
        </button>
      </header>

      {message && <div className="notice">{message}</div>}
      {error && <div className="error-banner">{error}</div>}

      <section className="stats-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR COLLECTION</p>
            <h2>At a glance</h2>
          </div>
          <button className="secondary small" onClick={refresh}>
            Refresh stats
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span>Total movies</span>
            <strong>{stats?.totalMovies ?? "—"}</strong>
          </div>
          <div className="stat-card">
            <span>To Watch</span>
            <strong>{stats?.statusCounts?.["To Watch"] ?? "—"}</strong>
          </div>
          <div className="stat-card">
            <span>Watching</span>
            <strong>{stats?.statusCounts?.Watching ?? "—"}</strong>
          </div>
          <div className="stat-card">
            <span>Watched</span>
            <strong>{stats?.statusCounts?.Watched ?? "—"}</strong>
          </div>
          <div className="stat-card">
            <span>Hours watched</span>
            <strong>{stats?.totalHoursWatched ?? "—"}</strong>
          </div>
          <div className="stat-card">
            <span>Average rating</span>
            <strong>
              {stats?.averageRating == null ? "—" : `${stats.averageRating}/10`}
            </strong>
          </div>
          <div className="stat-card">
            <span>Top watched genre</span>
            <strong className="genre-stat">{stats?.topWatchedGenre || "—"}</strong>
          </div>
        </div>
      </section>

      <section className="watch-next">
        <div>
          <p className="eyebrow">NEED A SUGGESTION?</p>
          <h2>What should I watch next?</h2>
          <p>Let your priorities decide your next movie.</p>
        </div>
        <button className="primary" onClick={watchNext}>
          Find my next movie →
        </button>
      </section>

      {recommendation && (
        <section className="recommendation">
          <div>
            <span className="recommend-label">YOUR NEXT PICK</span>
            <h3>{recommendation.title}</h3>
            <p>
              {recommendation.movieCode} · {recommendation.genre} ·
              {" "}{recommendation.runtime} min
            </p>
            <p>Priority: {recommendation.priority}/5</p>
          </div>
          <button
            className="secondary small"
            onClick={() => {
              setStatus("To Watch");
              setGenre("");
              setSearch("");
              setPage(1);
            }}
          >
            View watchlist
          </button>
        </section>
      )}

      <section className="library-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE COLLECTION</p>
            <h2>Your movies</h2>
            <p className="muted">
              {pagination.totalMovies} movie(s) match your filters.
            </p>
          </div>
        </div>

        <div className="filters">
          <input
            type="search"
            placeholder="Search by movie title..."
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />

          <select
            value={status}
            onChange={event => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option>To Watch</option>
            <option>Watching</option>
            <option>Watched</option>
          </select>

          <select
            value={genre}
            onChange={event => {
              setGenre(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All genres</option>
            {GENRES.map(item => <option key={item}>{item}</option>)}
          </select>

          <button className="secondary" onClick={resetFilters}>
            Clear filters
          </button>
        </div>

        {showForm && (
          <div className="form-panel">
            <MovieForm
              key={editing?._id || "new"}
              initial={editing ? {
                title: editing.title,
                genre: editing.genre,
                releaseYear: editing.releaseYear,
                runtime: editing.runtime,
                platform: editing.platform,
                priority: editing.priority
              } : null}
              onSave={saveMovie}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
            />
          </div>
        )}

        {loading ? (
          <p className="empty-state">Loading movies...</p>
        ) : movies.length === 0 ? (
          <div className="empty-state">
            <h3>No movies found</h3>
            <p>Try another search or clear the filters.</p>
          </div>
        ) : (
          <div className="movie-grid">
            {movies.map(movie => (
              <MovieCard
                key={movie._id}
                movie={movie}
                onEdit={startEdit}
                onStatus={changeStatus}
                onDelete={deleteMovie}
                onRate={changeRating}
              />
            ))}
          </div>
        )}

        <div className="pagination">
          <button
            className="secondary"
            disabled={page <= 1}
            onClick={() => setPage(current => current - 1)}
          >
            ← Previous
          </button>
          <span>
            Page {pagination.totalPages === 0 ? 0 : page}
            {" "}of {pagination.totalPages}
          </span>
          <button
            className="secondary"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(current => current + 1)}
          >
            Next →
          </button>
        </div>
      </section>

      <footer>
        <p>Movie Watchlist Manager · Built with the MERN Stack</p>
      </footer>
    </main>
  );
}
