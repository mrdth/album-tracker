# Implementation Plan: Album Tracker

**Branch**: `001-album-tracker` | **Date**: 2025-11-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-album-tracker/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a local-first web application for tracking music album collections by comparing artist discographies from MusicBrainz against filesystem folder structure. Users can search for artists, import their discographies, and automatically match albums against their music library folders. The system scans the filesystem on startup, caches results, and uses 80% string similarity matching to determine ownership status (Owned/Missing/Ambiguous). Manual overrides persist across scans for non-standard folder naming.

**Technical Approach**: Node.js/Express backend with better-sqlite3 for data persistence, Vue 3 frontend with Tailwind CSS, server-side filesystem scanning with cached results, existing MusicBrainzClient for API integration with exponential backoff retry strategy.

## Technical Context

**Language/Version**: Node.js (LTS), TypeScript 5.x  
**Backend Framework**: Express.js  
**Frontend Framework**: Vue 3 (Composition API with `<script setup>`)  
**Primary Dependencies**: 
- Backend: express, better-sqlite3, @types/better-sqlite3, fuse.js (fuzzy matching)
- Frontend: Vue 3, Tailwind CSS, Vue Router
- Shared: Vite (build), Vitest (testing), existing MusicBrainzClient

**Storage**: SQLite (better-sqlite3) for artist/album metadata, ownership status, manual overrides; filesystem cache in-memory or SQLite  
**Testing**: Vitest for unit/integration tests, Vue Test Utils for component tests  
**Target Platform**: Docker container deployed on server with direct filesystem access to music library  
**Project Type**: Web application (frontend + backend monorepo)  
**Performance Goals**: 
- Artist search + import + display: <30 seconds
- Filesystem scan (50 albums): <2 minutes
- Ownership matching: 90% accuracy at 80% similarity threshold
- UI interactions: <100ms response time
- Support 1000+ albums without lag

**Constraints**: 
- Read-only filesystem access (never modify user files)
- MusicBrainz API rate limits (1 req/sec unauthenticated)
- Single-user application (no authentication)
- Server-side only (no client filesystem access)
- Must persist manual overrides across scans

**Scale/Scope**: 
- 100 artists expected
- 1000+ albums total
- Single music library path
- Docker deployment on user's server

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Implementation Gate

- [x] **Feature specification exists with clear user stories** - spec.md complete with 6 prioritized user stories
- [x] **Architecture approach documented and reviewed** - Technical context defined, using existing MusicBrainzClient
- [ ] **Tests written and verified to fail** - Will be completed during Phase 1 (test-first approach)
- [x] **Constitution compliance verified** - Reviewing below

### Constitution Compliance Analysis

**Principle I: Code Quality (NON-NEGOTIABLE)**
- ✅ Will use TypeScript for type safety and self-documenting code
- ✅ ESLint + Prettier configured for consistent style
- ✅ Error handling with exponential backoff for API, validation for filesystem paths
- ✅ No magic numbers (80% threshold, timeouts as named constants)

**Principle II: Testing Standards (NON-NEGOTIABLE)**
- ✅ Test-first approach: Will write contract tests for API endpoints before implementation
- ✅ Integration tests for filesystem scanning logic
- ✅ Unit tests for string matching algorithm (>80% coverage requirement)
- ✅ **RESOLVED**: E2E tests with Playwright (3-tier strategy: PR/Merge/Nightly per research.md)

**Principle III: User Experience Consistency**
- ✅ Tailwind CSS for consistent component styling
- ✅ Loading states during API calls and filesystem scans
- ✅ User-friendly error messages (95% self-serve resolution target per SC-010)
- ✅ Server-side directory browser for consistent cross-browser experience
- ✅ Basic keyboard navigation (native browser support, no additional libraries needed for MVP)

**Principle IV: Maintainability**
- ✅ Clear separation: API layer (Express), business logic (services), data access (repositories)
- ✅ Minimal dependencies (using existing MusicBrainzClient only)
- ✅ **DOCUMENTED**: Architecture in data-model.md (entity relationships, query patterns, state transitions)
- ✅ Configuration externalized (library path, API rate limits, similarity threshold)
- ✅ YAGNI: Building only defined MVP features (no multi-library, no playlist, no accessibility libraries)

**Principle V: Security**
- ✅ Input validation: filesystem paths validated for existence/readability
- ✅ No authentication needed (single-user)
- ✅ **RESOLVED**: 5-layer path traversal prevention (decode → validate → resolve → boundary check → permissions, per research.md)
- ✅ No sensitive data storage
- ✅ No secrets (MusicBrainz doesn't require auth)

**Gate Status**: ✅ **PASSED** - All action items resolved in Phase 0 research:
1. ✅ UX: Basic keyboard navigation via semantic HTML (native browser support sufficient for single-user MVP)
2. ✅ Security: Defense-in-depth path validation with boundary enforcement (path.resolve + startsWith check)
3. ✅ Testing: Playwright E2E with 3-tier CI/CD strategy (Chromium-only PR, multi-browser merge, full nightly)

## Project Structure

### Documentation (this feature)

```text
specs/001-album-tracker/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api.openapi.yaml # REST API contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   ├── Artist.ts           # Artist entity
│   │   ├── Album.ts            # Album entity  
│   │   ├── Settings.ts         # Settings entity
│   │   └── FilesystemCache.ts  # Filesystem scan cache
│   ├── repositories/
│   │   ├── ArtistRepository.ts
│   │   ├── AlbumRepository.ts
│   │   └── SettingsRepository.ts
│   ├── services/
│   │   ├── MusicBrainzClient.ts        # Existing API client
│   │   ├── MusicBrainzService.ts       # Retry logic wrapper
│   │   ├── FilesystemScanner.ts        # Scan + cache logic
│   │   ├── AlbumMatcher.ts             # String similarity matching
│   │   └── DirectoryBrowserService.ts  # Server-side dir tree
│   ├── api/
│   │   ├── routes/
│   │   │   ├── artists.ts      # Artist search, import, detail
│   │   │   ├── albums.ts       # Album list, override
│   │   │   ├── settings.ts     # Library path config
│   │   │   └── filesystem.ts   # Directory browser, rescan
│   │   └── middleware/
│   │       ├── errorHandler.ts
│   │       └── validation.ts
│   ├── db/
│   │   ├── schema.sql          # SQLite schema
│   │   └── connection.ts       # better-sqlite3 setup
│   └── server.ts               # Express app entry point
└── tests/
    ├── integration/
    │   ├── api/                # API endpoint tests
    │   ├── services/           # Service integration tests
    │   └── filesystem/         # Filesystem scanning tests
    ├── unit/
    │   ├── matching/           # String similarity tests
    │   └── models/             # Entity tests
    └── fixtures/
        └── sample-library/     # Test music folder structure

frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── LoadingSpinner.vue
│   │   │   ├── ErrorMessage.vue
│   │   │   └── ProgressBar.vue
│   │   ├── search/
│   │   │   ├── ArtistSearchForm.vue
│   │   │   └── ArtistSearchResults.vue
│   │   ├── artist/
│   │   │   ├── ArtistDetailHeader.vue
│   │   │   ├── AlbumGrid.vue
│   │   │   └── AlbumCard.vue
│   │   ├── collection/
│   │   │   └── CollectionOverview.vue
│   │   ├── settings/
│   │   │   └── LibraryPathConfig.vue
│   │   └── filesystem/
│   │       └── DirectoryBrowser.vue
│   ├── pages/
│   │   ├── HomePage.vue           # Artist search (P1)
│   │   ├── ArtistDetailPage.vue   # Album grid + rescan (P2, P4)
│   │   ├── CollectionPage.vue     # Collection overview (P3)
│   │   └── SettingsPage.vue       # Library path config (P2)
│   ├── services/
│   │   ├── api.ts                 # Axios/fetch wrapper
│   │   └── types.ts               # TypeScript interfaces
│   ├── composables/
│   │   ├── useArtistSearch.ts
│   │   ├── useFilesystemScan.ts
│   │   └── useDirectoryBrowser.ts
│   ├── router/
│   │   └── index.ts               # Vue Router config
│   ├── App.vue
│   └── main.ts
└── tests/
    ├── components/                # Component tests
    └── integration/               # E2E tests (critical paths)

shared/
└── types/
    └── index.ts                   # Shared TypeScript interfaces
```

**Structure Decision**: Web application architecture (frontend + backend) chosen because:
- User provided explicit stack: "Backend: NodeJS, Express.js" and "Frontend: Vue 3"
- Specification requires server-side filesystem access (Docker deployment on server)
- Separation supports independent testing of API contracts and UI components
- Shared types ensure frontend/backend consistency

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations requiring justification. The architecture follows standard patterns:
- Web app structure is appropriate for the deployment model (Docker on server)
- Separation of concerns aligns with maintainability principle
- Testing approach meets TDD requirements
- No unnecessary abstractions or premature optimization
