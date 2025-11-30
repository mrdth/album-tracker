# Album Tracker

A web application for tracking your music album collection against artists' complete discographies from MusicBrainz.

## Features

- **Artist Search & Import**: Search MusicBrainz and import artists with their complete album discography
- **Collection Management**: Track which albums you own, are missing, or have ambiguous matches
- **Filesystem Integration**: Scan your music library and automatically match albums
- **Manual Override**: Manually link albums to folders when automatic matching fails
- **Completion Tracking**: View ownership statistics and completion percentages per artist
- **Artist Refresh**: Refresh artist data to get newly released albums
- **Stale Data Detection**: Automatically detect and refresh artists with outdated data (>7 days)
- **Search Providers**: Configure custom search providers for quick album lookups

## Technology Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express 5.1
- **Database**: SQLite (better-sqlite3)
- **Language**: TypeScript 5.9

### Frontend
- **Framework**: Vue 3
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript 5.9

## Deployment

### Docker Compose (Recommended)

The easiest way to deploy Album Tracker is using Docker Compose:

```bash
# Quick start
./deploy.sh
```

Or manually:

```bash
# Copy environment configuration
cp .env.example .env

# Edit .env and set your music library path
nano .env

# Build and start services
docker-compose up -d
```

**Access the application:**
- Frontend: http://localhost:8175
- Backend API: http://localhost:3035

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

### Manual Deployment

#### Backend

```bash
cd backend
npm install
npm run build
PORT=3035 npm start
```

#### Frontend

```bash
cd frontend
npm install
npm run build
# Serve the dist/ folder with your preferred web server
```

## Development

### Prerequisites
- Node.js 20 LTS
- npm 10+

### Backend Development

```bash
cd backend
npm install
npm run dev          # Start development server with hot reload
npm test             # Run tests
npm run lint         # Run linter
npm run type-check   # Type check without building
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev          # Start development server (http://localhost:5173)
npm test             # Run unit tests
npm run test:e2e     # Run E2E tests
npm run lint         # Run linter
npm run type-check   # Type check without building
```

## Project Structure

```
album-tracker/
├── backend/              # Express.js API server
│   ├── src/
│   │   ├── api/         # API routes and middleware
│   │   ├── db/          # Database schema and connection
│   │   ├── models/      # Data models
│   │   ├── repositories/# Data access layer
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utility functions
│   ├── tests/           # Unit and integration tests
│   ├── Dockerfile       # Backend container definition
│   └── package.json
├── frontend/            # Vue 3 SPA
│   ├── src/
│   │   ├── components/  # Vue components
│   │   ├── composables/ # Vue composition functions
│   │   ├── router/      # Vue Router configuration
│   │   ├── services/    # API client services
│   │   └── types/       # TypeScript type definitions
│   ├── tests/           # Unit and E2E tests
│   ├── Dockerfile       # Frontend container definition
│   ├── nginx.conf       # Nginx configuration for production
│   └── package.json
├── specs/               # Feature specifications
├── docker-compose.yml   # Docker Compose orchestration
├── .env.example         # Environment variables template
├── deploy.sh            # Deployment helper script
└── DEPLOYMENT.md        # Detailed deployment guide
```

## API Documentation

### Key Endpoints

- `GET /api/artists` - List all artists
- `GET /api/artists/search?q=term` - Search MusicBrainz for artists
- `POST /api/artists` - Import artist and discography
- `POST /api/artists/:id/refresh` - Refresh artist's album data
- `GET /api/artists/stale-check` - Check for and refresh stale artists
- `GET /api/albums` - List all albums (with filtering)
- `PATCH /api/albums/:id` - Update album ownership/path
- `POST /api/filesystem/scan` - Scan music library
- `GET /api/settings` - Get application settings
- `PATCH /api/settings` - Update settings

## Configuration

### Environment Variables

**Backend** (`backend/.env` or Docker environment):
```bash
PORT=3035
NODE_ENV=production
DATABASE_PATH=/app/data/album-tracker.db
FRONTEND_URL=http://localhost:8175
```

**Frontend** (build-time):
```bash
VITE_API_URL=http://localhost:3035
```

### Database

SQLite database is automatically initialized on first run. Schema is located at:
- `backend/src/db/schema.sql`

In Docker deployments, the database is persisted in a named volume.

## Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:coverage      # Run with coverage
npm run test:watch         # Watch mode
```

### Frontend Tests
```bash
cd frontend
npm test                   # Run unit tests
npm run test:e2e          # Run E2E tests
npm run test:e2e:ui       # E2E tests with UI
```

## Architecture

### Backend Architecture
- **Repository Pattern**: Data access abstraction
- **Service Layer**: Business logic separation
- **Middleware**: Request validation, error handling, CORS
- **Concurrency Control**: Prevents simultaneous refreshes per artist

### Frontend Architecture
- **Component-Based**: Reusable Vue 3 components
- **Composition API**: Modern Vue patterns with `<script setup>`
- **Type Safety**: Full TypeScript coverage
- **Reactive State**: Vue reactivity with refs and computed properties

## Contributing

1. Create a feature branch from `main`
2. Follow existing code style (use ESLint/Prettier)
3. Write tests for new features
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## License

ISC

## Support

For deployment issues, see [DEPLOYMENT.md](./DEPLOYMENT.md)

For feature specifications, see the `specs/` directory
