# Quickstart Guide: Album Tracker Development

**Feature**: 001-album-tracker  
**Last Updated**: 2025-11-27  
**For**: Developers implementing or extending the Album Tracker feature

## Overview

This guide helps you get the Album Tracker application running locally for development and testing. The application consists of:
- **Backend**: Node.js/Express API with SQLite database
- **Frontend**: Vue 3 SPA with Tailwind CSS
- **Deployment**: Docker container for production

**Prerequisites**:
- Node.js 18+ (LTS recommended)
- npm or pnpm
- Docker (for production deployment)
- Git

---

## Project Structure Quick Reference

```
album-tracker/
├── backend/                    # Express API + SQLite
│   ├── src/
│   │   ├── models/            # Data entities (Artist, Album, Settings)
│   │   ├── repositories/      # Database access layer
│   │   ├── services/          # Business logic (MusicBrainz, filesystem, matching)
│   │   ├── api/               # Express routes + middleware
│   │   ├── db/                # SQLite schema + connection
│   │   └── server.ts          # Entry point
│   └── tests/                 # Vitest unit + integration tests
├── frontend/                   # Vue 3 SPA
│   ├── src/
│   │   ├── components/        # Reusable Vue components
│   │   ├── pages/             # Route pages (Home, ArtistDetail, Settings)
│   │   ├── composables/       # Vue composition functions
│   │   └── services/          # API client
│   └── tests/                 # Vitest + Vue Test Utils
├── shared/                     # TypeScript types (shared between FE/BE)
└── specs/001-album-tracker/   # Feature documentation
    ├── spec.md                # Feature specification
    ├── plan.md                # This implementation plan
    ├── data-model.md          # Database schema
    ├── research.md            # Technical research findings
    └── contracts/api.openapi.yaml  # API contract
```

---

## 1. Initial Setup

### Clone and Install Dependencies

```bash
# Clone repository
git clone <repo-url>
cd album-tracker

# Checkout feature branch
git checkout 001-album-tracker

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Configuration

Create `.env` files for local development:

**Backend** (`backend/.env`):
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./album-tracker.db

# MusicBrainz API
MUSICBRAINZ_USER_AGENT="AlbumTracker/1.0.0 (your-email@example.com)"
MUSICBRAINZ_RATE_LIMIT_MS=1000
MUSICBRAINZ_MAX_RETRIES=3

# Filesystem
# Set this to your local music library for testing
LIBRARY_ROOT_PATH=/path/to/your/music/library
```

**Frontend** (`frontend/.env`):
```env
# API endpoint
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## 2. Database Setup

### Initialize Schema

The database will be automatically created on first run, but you can manually initialize:

```bash
cd backend

# Initialize database with schema
npm run db:init

# (Optional) Seed test data
npm run db:seed
```

**Manual Schema Creation**:
```bash
sqlite3 album-tracker.db < src/db/schema.sql
```

### Database Inspection

```bash
# Open SQLite CLI
sqlite3 album-tracker.db

# View schema
.schema

# Query artists
SELECT * FROM Artist;

# Exit
.quit
```

---

## 3. Running the Application

### Development Mode (Hot Reload)

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173 (Vite default)
```

### Access the Application

Open browser to: **http://localhost:5173**

---

## 4. Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/services/AlbumMatcher.test.ts

# Watch mode
npm run test:watch
```

### Frontend Tests

```bash
cd frontend

# Run component tests
npm test

# Run with coverage
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e

# E2E in UI mode
npm run test:e2e:ui
```

### Test-First Development (TDD)

Per **Constitution Principle II**, write tests BEFORE implementation:

1. **Write failing test**:
   ```bash
   # Example: Test string similarity matching
   npm test -- src/services/AlbumMatcher.test.ts
   # Should fail initially
   ```

2. **Implement feature** to make test pass

3. **Refactor** while keeping tests green

4. **Verify coverage** meets 80% threshold:
   ```bash
   npm run test:coverage
   ```

---

## 5. Key Development Workflows

### Workflow 1: Add New API Endpoint

1. **Update OpenAPI Contract** (`specs/001-album-tracker/contracts/api.openapi.yaml`):
   ```yaml
   /new-endpoint:
     get:
       summary: "New endpoint description"
       # ... define request/response
   ```

2. **Write Contract Test** (`backend/tests/integration/api/new-endpoint.test.ts`):
   ```typescript
   describe('GET /api/new-endpoint', () => {
     it('should return expected response format', async () => {
       // Test contract compliance
     });
   });
   ```

3. **Implement Route** (`backend/src/api/routes/new-endpoint.ts`):
   ```typescript
   router.get('/new-endpoint', async (req, res) => {
     // Implementation
   });
   ```

4. **Verify**:
   ```bash
   npm test -- new-endpoint.test.ts
   ```

### Workflow 2: Add New Vue Component

1. **Write Component Test** (`frontend/tests/components/NewComponent.spec.ts`):
   ```typescript
   import { mount } from '@vue/test-utils'
   import NewComponent from '@/components/NewComponent.vue'

   describe('NewComponent', () => {
     it('should render correctly', () => {
       const wrapper = mount(NewComponent)
       // Assertions
     });
   });
   ```

2. **Create Component** (`frontend/src/components/NewComponent.vue`):
   ```vue
   <script setup lang="ts">
   // Component logic
   </script>

   <template>
     <!-- Template -->
   </template>
   ```

3. **Verify Accessibility** (per Constitution Principle III):
   ```typescript
   it('should be keyboard navigable', async () => {
     const wrapper = mount(NewComponent)
     await wrapper.find('button').trigger('keydown.enter')
     // Verify behavior
   });
   ```

### Workflow 3: Implement Filesystem Scanning

1. **Review Security Research** (`specs/001-album-tracker/research.md` - Path Traversal Prevention)

2. **Write Integration Test** with fixture library:
   ```typescript
   describe('FilesystemScanner', () => {
     it('should scan library and populate cache', async () => {
       const scanner = new FilesystemScanner(testLibraryPath)
       const cache = await scanner.scan()
       expect(cache).toHaveLength(expectedFolderCount)
     });
   });
   ```

3. **Implement with Security Validation**:
   ```typescript
   // backend/src/services/FilesystemScanner.ts
   private validatePath(userPath: string): string | null {
     const resolved = path.resolve(this.libraryRoot, userPath)
     if (!resolved.startsWith(this.libraryRoot + path.sep)) {
       return null // Path traversal attempt
     }
     return resolved
   }
   ```

---

## 6. Code Quality Checks

### Linting and Formatting

```bash
# Backend
cd backend
npm run lint        # ESLint check
npm run lint:fix    # Auto-fix issues
npm run format      # Prettier format

# Frontend
cd frontend
npm run lint
npm run lint:fix
npm run format
```

### Type Checking

```bash
# Backend
npm run type-check  # TypeScript compilation check

# Frontend
npm run type-check
```

### Pre-Commit Checks (Recommended)

Install pre-commit hooks:
```bash
# In project root
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm test"
```

---

## 7. Docker Deployment

### Build Docker Image

```bash
# From project root
docker build -t album-tracker:latest .
```

### Run with Docker Compose

**docker-compose.yml** example:
```yaml
version: '3.8'
services:
  album-tracker:
    image: album-tracker:latest
    ports:
      - "8080:3000"
    volumes:
      - /path/to/music:/music:ro  # Read-only music library
      - ./data:/app/data          # SQLite database persistence
    environment:
      LIBRARY_ROOT_PATH: /music
      NODE_ENV: production
```

Run:
```bash
docker-compose up -d
```

Access: **http://localhost:8080**

---

## 8. Common Tasks

### Reset Database

```bash
cd backend
rm album-tracker.db
npm run db:init
```

### Import Test Artist

```bash
# Using curl
curl -X POST http://localhost:3000/api/artists \
  -H "Content-Type: application/json" \
  -d '{"mbid": "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d"}'

# Response: The Beatles with full discography
```

### Trigger Filesystem Scan

```bash
curl -X POST http://localhost:3000/api/filesystem/scan \
  -H "Content-Type: application/json" \
  -d '{"artist_id": 1}'
```

### View Logs

```bash
# Development (backend console output)
cd backend && npm run dev

# Docker
docker-compose logs -f album-tracker
```

---

## 9. Debugging Tips

### Backend Debugging (VS Code)

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

Set breakpoints in `backend/src/**/*.ts` files and press F5.

### Frontend Debugging (Browser DevTools)

1. Open Chrome DevTools (F12)
2. Go to Sources tab
3. Find Vue components under `webpack://` → `src/`
4. Set breakpoints and interact with UI

### SQLite Debugging

```bash
# Enable query logging
sqlite3 album-tracker.db
.log stdout
SELECT * FROM Artist;
```

---

## 10. Constitution Compliance Checklist

Before committing code, verify:

- [ ] **Principle I (Code Quality)**: Code linted, formatted, no magic numbers
- [ ] **Principle II (Testing)**: Tests written first, >80% coverage, all passing
- [ ] **Principle III (UX)**: Loading states, error messages, keyboard navigation
- [ ] **Principle IV (Maintainability)**: Clear separation of concerns, no duplication
- [ ] **Principle V (Security)**: Input validation, path traversal prevention, no secrets in code

**Pre-Merge Gate**:
```bash
# Run full quality checks
npm run lint && npm run type-check && npm run test:coverage
```

---

## 11. Useful Resources

### Documentation Links
- [Feature Specification](./spec.md)
- [Data Model](./data-model.md)
- [API Contract](./contracts/api.openapi.yaml)
- [Research Findings](./research.md)
- [Project Constitution](../../.specify/memory/constitution.md)

### External References
- [MusicBrainz API Docs](https://musicbrainz.org/doc/MusicBrainz_API)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [better-sqlite3 Docs](https://github.com/WiseLibs/better-sqlite3/wiki)
- [Playwright E2E Testing](https://playwright.dev/)

---

## 12. Troubleshooting

### Issue: MusicBrainz API Rate Limit Errors

**Symptom**: `503 Service Unavailable` or `429 Too Many Requests`

**Solution**:
- Verify `MUSICBRAINZ_RATE_LIMIT_MS` is set to 1000+ in `.env`
- Check retry logic in `backend/src/services/MusicBrainzService.ts`
- Exponential backoff should handle transient failures (max 3 retries)

### Issue: Filesystem Scan Finds No Folders

**Symptom**: All albums marked as "Missing" after scan

**Solution**:
1. Verify `LIBRARY_ROOT_PATH` in `.env` points to correct directory
2. Check folder naming convention: `[YYYY] Title` for albums
3. Check artist folder grouping: `= A =`, `= B =`, etc. or flat structure
4. Enable debug logging:
   ```typescript
   // backend/src/services/FilesystemScanner.ts
   console.log('Scanning:', folderPath)
   ```

### Issue: Frontend Not Connecting to Backend

**Symptom**: `ERR_CONNECTION_REFUSED` or CORS errors

**Solution**:
1. Verify backend is running: `curl http://localhost:3000/api/settings`
2. Check `VITE_API_BASE_URL` in `frontend/.env` matches backend port
3. Verify CORS middleware in `backend/src/server.ts`:
   ```typescript
   app.use(cors({ origin: 'http://localhost:5173' }))
   ```

### Issue: Test Failures After Schema Changes

**Symptom**: Integration tests fail with "no such column" errors

**Solution**:
1. Delete test database: `rm backend/album-tracker.test.db`
2. Update schema: `backend/src/db/schema.sql`
3. Update fixtures: `backend/tests/fixtures/test-data.sql`
4. Re-run tests: `npm test`

---

## Next Steps

1. **Review Specification**: Read [spec.md](./spec.md) for full feature requirements
2. **Study Data Model**: Understand entities in [data-model.md](./data-model.md)
3. **Run Tests**: Verify setup with `npm test` in both backend/frontend
4. **Start Development**: Pick a user story (P1-P6) and implement test-first
5. **Generate Tasks**: Run `/speckit.tasks` to create detailed task breakdown

**Questions?** Check the [research.md](./research.md) for technical decisions and patterns.
