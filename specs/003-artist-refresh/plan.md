# Implementation Plan: Artist Data Refresh

**Branch**: `003-artist-refresh` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-artist-refresh/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature enables users to manually refresh artist album data from the music catalog (MusicBrainz) and displays a "last checked" timestamp on artist detail pages. Additionally, it provides automated staleness detection for artists whose data hasn't been updated in over 7 days. The implementation will add a refresh endpoint, update the Artist model's timestamp handling, and create UI components for the refresh action and timestamp display.

## Technical Context

**Language/Version**: TypeScript 5.9.3 / Node.js 20.19.0 LTS  
**Primary Dependencies**: 
- Backend: Express 5.1.0, better-sqlite3 12.4.6
- Frontend: Vue 3.5.25, Vue Router 4.6.3, Tailwind CSS 4.1.17
- Testing: Vitest 4.0.14, Playwright 1.57.0
- MusicBrainz API integration: NEEDS CLARIFICATION (existing implementation or new)

**Storage**: SQLite (better-sqlite3) with schema in `backend/src/db/schema.sql`  
**Testing**: Vitest for unit/integration, Playwright for E2E  
**Target Platform**: Web application (monorepo with backend/frontend workspaces)  
**Project Type**: Web (frontend + backend)  
**Performance Goals**: 
- Refresh completion <10 seconds for artists with <100 albums
- UI feedback within 2 seconds for all operations
- Respect MusicBrainz API rate limits (1 req/sec default)

**Constraints**: 
- Must respect MusicBrainz API rate limiting (configurable via Settings)
- Must handle concurrent refresh requests safely
- Must prevent duplicate album additions
- Single-user application (no multi-user auth complexity)

**Scale/Scope**: 
- Single-user personal music collection management
- Expected: <1000 artists, <10,000 albums in typical usage
- MusicBrainz API responses can be large for prolific artists (100+ albums)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Implementation Gate
- [x] Feature specification exists with clear user stories ✅ (spec.md complete)
- [x] Architecture approach documented and reviewed ✅ (research.md, data-model.md, contracts/ complete)
- [ ] Tests written and verified to fail (TDD) (pending implementation - Phase 2)
- [x] Constitution compliance verified ✅ (see re-evaluation below)

### Code Quality (Principle I)
- [ ] Follow existing project patterns (models, repositories, services, routes)
- [ ] Use TypeScript strict mode with explicit types
- [ ] Extract MusicBrainz API client if not already exists
- [ ] Handle errors gracefully (API failures, network issues, rate limits)
- [ ] Use named constants for magic values (e.g., STALE_THRESHOLD_DAYS = 7)

### Testing Standards (Principle II)
- [ ] Contract tests for new API endpoints (refresh, stale-check)
- [ ] Integration tests for MusicBrainz API interaction with mocked responses
- [ ] Unit tests for timestamp formatting logic
- [ ] E2E test for complete refresh flow (button click → new albums appear)
- [ ] Regression test for duplicate album prevention

### User Experience Consistency (Principle III)
- [ ] Follow existing UI patterns for buttons and loading states
- [ ] Provide immediate feedback (loading spinner during refresh)
- [ ] Display user-friendly error messages (not raw API errors)
- [ ] Use consistent timestamp formatting across application
- [ ] Semantic HTML (button for refresh action)

### Maintainability (Principle IV)
- [ ] Separate concerns: API client, business logic, UI components
- [ ] Document MusicBrainz API rate limiting behavior
- [ ] Reuse existing timestamp utilities if available
- [ ] Keep dependencies minimal (no new external libs for timestamp formatting if possible)

### Security (Principle V)
- [ ] Validate artist ID before refresh (prevent arbitrary API calls)
- [ ] Sanitize MusicBrainz API responses before database insertion
- [ ] Prevent SQL injection via parameterized queries (existing pattern)
- [ ] Rate limit refresh endpoint to prevent abuse (NEEDS CLARIFICATION: per-artist or global?)

**Initial Assessment**: ✅ PASS - No constitution violations anticipated. Follows existing patterns.

### Post-Design Re-Evaluation (After Phase 1)

**Code Quality (Principle I)**: ✅ PASS
- Design follows existing layered architecture (routes → services → repositories)
- Reuses MusicBrainzService (no new API client needed)
- Defined clear error handling strategy (research.md §7)
- Named constants documented (STALE_THRESHOLD_DAYS = 7)

**Testing Standards (Principle II)**: ✅ PASS
- Contract tests specified via OpenAPI schemas (contracts/)
- Integration tests planned for API endpoints
- Unit tests planned for service and utility layers
- E2E test for complete refresh flow documented in quickstart.md
- TDD approach documented in quickstart implementation checklist

**User Experience Consistency (Principle III)**: ✅ PASS
- Reuses existing UI component patterns (RefreshButton.vue similar to other buttons)
- Loading states defined (isRefreshing flag)
- User-friendly error messages (no raw API errors surfaced)
- Timestamp formatting consistent with "human-readable relative time"
- Semantic HTML (button element for refresh action)

**Maintainability (Principle IV)**: ✅ PASS
- Clear separation of concerns (service layer, repository layer, UI layer)
- No new dependencies (uses native Date for formatting)
- Documented architecture in research.md and data-model.md
- Reuses existing MusicBrainzService (configuration already externalized)

**Security (Principle V)**: ✅ PASS
- Artist ID validation via existing validation middleware
- MusicBrainz response sanitization via existing repository pattern
- Rate limiting handled by existing MusicBrainzService
- SQL injection prevented via existing parameterized queries
- Concurrent refresh protection via in-memory Set (research.md §4)

**Final Assessment**: ✅ PASS - All constitution principles satisfied. Ready for implementation.

## Project Structure

### Documentation (this feature)

```text
specs/003-artist-refresh/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── refresh-artist.yaml
│   └── check-stale.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   └── artists.ts          # Add refresh endpoints
│   │   └── middleware/
│   ├── models/
│   │   └── Artist.ts                # Already exists, timestamp handling
│   ├── repositories/
│   │   └── ArtistRepository.ts      # Add findOldest method
│   ├── services/
│   │   ├── MusicBrainzClient.ts     # NEW: API client (if not exists)
│   │   └── ArtistRefreshService.ts  # NEW: Refresh logic
│   └── utils/
│       └── dateFormat.ts            # NEW: Timestamp formatting utilities
└── tests/
    ├── unit/
    │   ├── services/ArtistRefreshService.test.ts
    │   └── utils/dateFormat.test.ts
    ├── integration/
    │   └── api/artists-refresh.test.ts
    └── e2e/
        └── artist-refresh.spec.ts

frontend/
├── src/
│   ├── components/
│   │   ├── ArtistDetailHeader.vue   # Add refresh button & timestamp
│   │   └── RefreshButton.vue        # NEW: Reusable refresh button
│   ├── composables/
│   │   └── useArtistRefresh.ts      # NEW: Refresh logic hook
│   └── utils/
│       └── dateFormat.ts            # NEW: Frontend timestamp formatting
└── tests/
    └── components/
        └── RefreshButton.test.ts
```

**Structure Decision**: Web application with separate backend/frontend workspaces. Backend follows layered architecture (routes → services → repositories → models). Frontend uses Vue 3 composition API with composables for shared logic. Testing follows the existing Vitest + Playwright pattern.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. This feature follows existing patterns and requires no additional complexity.
