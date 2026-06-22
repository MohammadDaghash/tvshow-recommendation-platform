# TV Show Recommendation Platform

Content-based TV show recommendation system using rating-weighted genre vectors, TMDB enrichment, and transparent similarity scoring.

This full-stack platform manages watched and want-to-watch TV shows, imports metadata from TMDB, protects admin actions, and generates explainable recommendations based on watched-show ratings and content similarity.

## What It Does

- Lets visitors browse watched and want-to-watch TV shows.
- Lets admins import shows from TMDB, mark shows as watched, rate shows, move shows back to want-to-watch, and delete records.
- Builds a rating-weighted user taste profile from watched shows.
- Scores candidate shows with genre/category vectors, cosine similarity, TMDB rating, popularity, and year signals.
- Explains recommendations with score breakdowns and similar watched shows.
- Persists "Not Interested" feedback so ignored suggestions do not return.

## Key Features

- React + Vite frontend
- Responsive carousel-style show browsing
- Search and genre filtering
- Detailed show modal with poster, overview, metadata, score breakdown, and recommendation reason
- Node.js/Express API
- MongoDB/Mongoose data model
- JWT authentication and admin-only protected actions
- TMDB search/import workflow
- Dynamic TMDB recommendation endpoint
- Persistent ignored-suggestion collection
- Python ML experiments for content-based recommendation logic

## Tech Stack

- React + Vite
- JavaScript
- Node.js
- Express
- MongoDB
- Mongoose
- JWT / bcrypt
- TMDB API
- Python
- Pandas
- scikit-learn
- Vercel configuration

## Architecture / How It Works

```text
React client
    |
    v
Express API
    |
    +--> MongoDB TVShow / User / IgnoredSuggestion collections
    |
    +--> TMDB API metadata search/import
    |
    v
Recommendation service
    |
    v
Rating-weighted category vectors + cosine similarity + metadata scoring
```

Important areas:

- `cinema-ws/server.js` starts the Express API and connects backend routes.
- `cinema-ws/models/TVShow.js` stores show metadata, watched status, user rating, and recommendation score.
- `cinema-ws/models/User.js` stores authenticated users and roles.
- `cinema-ws/services/recommendation.service.js` builds preference vectors, calculates similarity, combines metadata signals, and returns ranked shows.
- `cinema-ws/controllers/mlRecommendation.controller.js` generates TMDB-based suggestions and filters existing/ignored shows.
- `cinema-ws/services/tmdb.service.js` searches and imports TMDB metadata.
- `client-react/src/App.jsx` renders library tabs, admin flows, modals, score breakdowns, and ignored-suggestion actions.
- `cinema-ws/ml/` contains Python experiments for feature matrices and content-based recommendation scoring.

## Recommendation Logic

The system maps each show into weighted content categories:

- Comedy
- Drama & Romance
- Crime & Thriller
- Fantasy & Sci-Fi
- Animation

Watched shows are weighted by user rating to create a taste vector:

```text
u_j = sum(r_i * x_ij) / sum(r_i)
```

Candidate shows are scored using:

- Genre/category similarity
- Category preference
- TMDB rating
- Popularity
- Year similarity
- Similar watched shows for explanation

## Screenshots

Screenshots are not committed yet. Recommended captures:

- Watched shows carousel
- Want-to-watch recommendations
- AI Suggestions section
- Details modal with score breakdown
- Admin TMDB import flow

## Setup

### Backend

```bash
cd cinema-ws
npm install
npm run dev
```

Required environment variables:

```bash
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
TMDB_API_KEY=your_tmdb_api_key
```

### Frontend

```bash
cd client-react
npm install
npm run dev
```

Optional frontend environment variable:

```bash
VITE_API_BASE_URL=http://localhost:5001
```

## API Areas

```text
GET  /api/recommendations
POST /api/recommendations/:id/watch
POST /api/recommendations/:id/unwatch
DELETE /api/recommendations/:id

GET  /api/tmdb/search
POST /api/tmdb/import

POST /api/auth/register
POST /api/auth/login

GET  /api/ml-recommendations/tmdb
POST /api/ignored-suggestions
```

## What This Demonstrates

- Content-based recommendation system design
- Rating-weighted genre/category vectors
- Cosine similarity and hybrid metadata scoring
- Explainable recommendation breakdowns
- MongoDB-backed admin-curated dataset workflows
- Authenticated full-stack product architecture
- External API enrichment with TMDB

## Roadmap

- More formal recommendation evaluation metrics
- Better feature scaling in the production JavaScript recommender
- User-specific recommendation profiles
- Clustering experiments for similar shows
