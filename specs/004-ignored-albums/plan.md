# Implementation Plan: Ignored Albums

**Branch**: `004-ignored-albums` | **Date**: 2025-12-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-ignored-albums/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add ability for users to mark unowned albums as "ignored" to hide them from display and exclude them from collection statistics. Ignored albums can be toggled visible for management, and can be un-ignored to restore normal view. The ignored status persists across artist refreshes and rescans using stable MBID matching.

## Technical Context

**Language/Version**: TypeScript 5.9.3 / Node.js 20.19.0 LTS (ES2022 backend, ES2020 frontend)  
**Primary Dependencies**: Backend: Express 5.1.0, better-sqlite3 12.4.6, fuse.js 7.1.0; Frontend: Vue 3.5.25, vue-router 4.6.3, Tailwind CSS 4.1.17, Vite 7.2.4  
**Storage**: SQLite via better-sqlite3, schema in `backend/src/db/schema.sql`, Album table with ownership_status field  
**Testing**: Vitest 4.0.14 (unit/integration, 80% coverage required), Playwright 1.57.0 (E2E), repository in backend/tests/  
**Target Platform**: Web application (backend API on port 3035, frontend SPA served via Vite)  
**Project Type**: Web (monorepo with backend/frontend/shared workspaces)  
**Performance Goals**: Album state updates <2s, toggle view <1s, API responses <100ms  
**Constraints**: Single-user application, must maintain ownership tracking integrity, ignored status independent of ownership status  
**Scale/Scope**: Personal music collection tracker, ~10-100 artists, ~100-1000 albums typical use case

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Code Quality (NON-NEGOTIABLE)
- ✅ **PASS** - All code will follow existing TypeScript/ESLint patterns in codebase
- ✅ **PASS** - Will use existing constants and models (Album model already exists)
- ✅ **PASS** - Error handling follows existing patterns in AlbumRepository and API routes
- ✅ **PASS** - npm packages will be kept at latest versions

### Principle II: Testing Standards (NON-NEGOTIABLE)
- ✅ **PASS** - Tests will be written BEFORE implementation (TDD)
- ✅ **PASS** - Contract tests required for new API endpoint (PATCH /albums/:id/ignored)
- ✅ **PASS** - Integration tests for database operations (AlbumRepository.setIgnored)
- ✅ **PASS** - Unit tests for business logic in services
- ✅ **PASS** - E2E tests for critical user journey (ignore → hide → un-ignore)
- ✅ **PASS** - Target: >80% coverage (matches existing vitest.config.ts thresholds)

### Principle III: User Experience Consistency
- ✅ **PASS** - Will use existing Tailwind CSS design system and component patterns
- ✅ **PASS** - Immediate feedback required (FR-001: <2s for state updates)
- ✅ **PASS** - Error messages follow existing user-friendly patterns
- ✅ **PASS** - Button placement consistent with existing album card actions
- ✅ **PASS** - Performance: <2s updates, <1s toggle view (matches spec success criteria)

### Principle IV: Maintainability
- ✅ **PASS** - Follows existing separation: API routes → Services → Repositories → Models → Database
- ✅ **PASS** - No new dependencies required (uses existing better-sqlite3, Vue 3, Tailwind)
- ✅ **PASS** - Schema migration required (add `is_ignored` column to Album table)
- ✅ **PASS** - YAGNI: Only building required ignore/un-ignore functionality, no extra features

### Principle V: Security
- ✅ **PASS** - Input validation on API endpoint (album ID parameter)
- ✅ **PASS** - Database operations use parameterized queries (better-sqlite3 binding)
- ✅ **PASS** - Single-user app, no auth complexity needed
- ✅ **PASS** - No sensitive data involved (album ignored status is non-sensitive)

### Gate Summary
**STATUS: ✅ ALL GATES PASS** - No violations. Feature aligns with all constitution principles. May proceed to Phase 0.

---

## Post-Design Constitution Re-Evaluation

*Re-checked after Phase 1 design completion (research.md, data-model.md, contracts/, quickstart.md)*

### Principle I: Code Quality ✅ PASS
- Design uses existing TypeScript patterns and conventions
- Schema follows existing constraint patterns (chk_is_ignored, chk_owned_not_ignored)
- Error handling consistent with existing API error codes (CANNOT_IGNORE_OWNED, ALBUM_NOT_FOUND)
- No magic numbers - all values are constants or boolean flags
- No new dependencies added

### Principle II: Testing Standards ✅ PASS
- TDD workflow documented in quickstart.md (tests before implementation)
- Contract tests specified for PATCH /albums/:id endpoint
- Integration tests specified for database operations
- Unit tests specified for AlbumRepository.setIgnored()
- E2E tests specified for full ignore workflow (e2e/ignore-albums.spec.ts)
- Coverage target: 80% (matches existing vitest.config.ts)

### Principle III: User Experience Consistency ✅ PASS
- UI uses existing Tailwind design system (toggle switch, badges)
- Immediate feedback: <2s for state updates, <1s for toggle view
- Error messages are user-friendly ("Cannot ignore owned albums")
- Button placement consistent with existing album card actions
- Multi-cue visual indicators (opacity + badge + strikethrough) for accessibility

### Principle IV: Maintainability ✅ PASS
- Follows existing layered architecture (API → Services → Repositories → Models → DB)
- No new dependencies (uses existing better-sqlite3, Vue 3, Tailwind)
- Schema migration documented and follows existing pattern in connection.ts
- YAGNI principle maintained - only implements required functionality
- Clear separation of concerns (ignored status independent from ownership status)

### Principle V: Security ✅ PASS
- Input validation on API endpoint (album ID, is_ignored boolean type)
- Database operations use parameterized queries (prepared statements)
- Business rule enforced at three layers (DB constraint + trigger + app validation)
- No sensitive data involved (ignored status is non-sensitive metadata)

### Final Gate Assessment
**STATUS: ✅ ALL GATES PASS POST-DESIGN** - Design maintains constitution compliance. All design artifacts (research.md, data-model.md, contracts/, quickstart.md) align with project principles. Ready for implementation.

## Project Structure

### Documentation (this feature)

```text
specs/004-ignored-albums/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── albums-api.yaml  # OpenAPI spec for ignore/un-ignore endpoints
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Structure Decision**: Web application monorepo with backend/frontend/shared workspaces

```text
backend/
├── src/
│   ├── db/
│   │   ├── schema.sql                    # [MODIFY] Add is_ignored column to Album table
│   │   ├── migrations/                   # [NEW] Add migration for is_ignored column
│   │   └── connection.ts                 # [NO CHANGE] Existing database connection
│   ├── models/
│   │   └── Album.ts                      # [MODIFY] Add is_ignored field validation
│   ├── repositories/
│   │   └── AlbumRepository.ts            # [MODIFY] Add setIgnored(), findByArtistId filtering
│   ├── services/
│   │   └── AlbumService.ts               # [NEW or MODIFY] Add ignore/un-ignore business logic
│   └── api/
│       └── routes/
│           └── albums.ts                 # [MODIFY] Add PATCH /albums/:id/ignored endpoint
└── tests/
    ├── unit/
    │   ├── models/Album.test.ts          # [MODIFY] Add is_ignored validation tests
    │   └── repositories/AlbumRepository.test.ts  # [NEW] Add setIgnored() tests
    ├── integration/
    │   └── api/albums.test.ts            # [NEW] Add ignore/un-ignore API contract tests
    └── e2e/                              # [NEW] E2E tests for ignore workflow

frontend/
├── src/
│   ├── components/
│   │   └── albums/
│   │       ├── AlbumCard.vue             # [MODIFY] Add ignore/un-ignore button
│   │       └── AlbumGrid.vue             # [MODIFY] Add "Show Ignored Albums" toggle
│   ├── composables/
│   │   └── useAlbums.ts                  # [MODIFY] Add ignoreAlbum(), unignoreAlbum() methods
│   ├── services/
│   │   └── api.ts                        # [MODIFY] Add PATCH /albums/:id/ignored endpoint call
│   └── views/
│       └── ArtistDetail.vue              # [MODIFY] Add toggle state, filter logic
└── tests/
    └── unit/
        └── components/AlbumCard.test.ts  # [NEW] Test ignore button rendering/behavior

shared/
└── types/
    └── index.ts                          # [MODIFY] Add is_ignored to Album interface

e2e/
└── ignore-albums.spec.ts                 # [NEW] E2E test for full ignore workflow
```

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations** - All constitution gates passed. No complexity justification required.
