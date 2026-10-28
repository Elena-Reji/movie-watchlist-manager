
# Movie Watchlist Manager

A full-stack movie management application built using MongoDB,
Express.js, React.js and Node.js.

## Features

- Add, view, edit and delete movies
- Search by title and filter by status or genre
- Paginated movie listing with six movies per page
- Automatic movie codes
- Movie status workflow and ratings
- Watch Next recommendation
- Statistics dashboard
- Responsive interface

## Project Structure

- frontend: React and Vite
- backend: Express, Mongoose and MongoDB

## Local Setup

### Backend

1. Open a terminal in the backend folder.
2. Run npm install.
3. Create a .env file using .env.example as a guide.
4. Set MONGODB_URI to your MongoDB Atlas connection string.
5. Run npm run seed to insert four sample movies.
6. Run npm run dev.

### Frontend

1. Open a second terminal in the frontend folder.
2. Run npm install.
3. Create a .env file using .env.example as a guide.
4. Set VITE_API_URL to http://localhost:5000/api.
5. Run npm run dev.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/movies | List, search, filter and paginate |
| POST | /api/movies | Add movie |
| PUT | /api/movies/:id | Edit movie |
| PATCH | /api/movies/:id/status | Change status |
| PATCH | /api/movies/:id/rating | Update rating |
| DELETE | /api/movies/:id | Delete movie |
| GET | /api/movies/watch-next | Recommend next movie |
| GET | /api/movies/stats | Dashboard statistics |

## Environment Variables

Backend: MONGODB_URI, PORT, CLIENT_URL

Frontend: VITE_API_URL

Never commit real credentials or database passwords.

## Screenshots

Add two screenshots of the working application here
before submitting the project.
## Working Application

![Movie Watchlist Manager](movie-watchlist.png)
