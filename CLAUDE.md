# album-tracker Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-27

## Active Technologies
- Node.js 20.19.0 LTS, TypeScript 5.9.3 (002-search-providers)
- SQLite (better-sqlite3) with schema in backend/src/db/schema.sql (002-search-providers)
- TypeScript 5.9.3 / Node.js 20.19.0 LTS (003-artist-refresh)
- SQLite (better-sqlite3) with schema in `backend/src/db/schema.sql` (003-artist-refresh)
- TypeScript 5.9.3 / Node.js 20.19.0 LTS (ES2022 backend, ES2020 frontend) + Backend: Express 5.1.0, better-sqlite3 12.4.6, fuse.js 7.1.0; Frontend: Vue 3.5.25, vue-router 4.6.3, Tailwind CSS 4.1.17, Vite 7.2.4 (004-ignored-albums)
- SQLite via better-sqlite3, schema in `backend/src/db/schema.sql`, Album table with ownership_status field (004-ignored-albums)

- Node.js (LTS), TypeScript 5.x (001-album-tracker)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

Node.js (LTS), TypeScript 5.x: Follow standard conventions

## Recent Changes
- 004-ignored-albums: Added TypeScript 5.9.3 / Node.js 20.19.0 LTS (ES2022 backend, ES2020 frontend) + Backend: Express 5.1.0, better-sqlite3 12.4.6, fuse.js 7.1.0; Frontend: Vue 3.5.25, vue-router 4.6.3, Tailwind CSS 4.1.17, Vite 7.2.4
- 003-artist-refresh: Added TypeScript 5.9.3 / Node.js 20.19.0 LTS
- 002-search-providers: Added Node.js 20.19.0 LTS, TypeScript 5.9.3


<!-- MANUAL ADDITIONS START -->
Ensure frontend components use Tailwind CSS for styling.
Only perform commits when prompted.
<!-- MANUAL ADDITIONS END -->
