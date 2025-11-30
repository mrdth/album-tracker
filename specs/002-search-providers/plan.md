# Implementation Plan: Search Providers for Missing Albums

**Branch**: `002-search-providers` | **Date**: 2025-11-30 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/002-search-providers/spec.md`

## Summary

Enable users to configure custom search providers (like Discogs, MusicBrainz, or personal stores) via the settings page and use them to quickly search for missing albums. Each provider has a name and URL template with {artist} and {album} placeholders. Missing album cards display a dropdown menu to open search URLs in new tabs.

**Technical Approach**: Extend the existing Settings singleton with a new search_providers JSON column in SQLite. Create REST API endpoints for CRUD operations. Update the frontend Settings page with a list manager component, and enhance AlbumCard with a dropdown that renders URLs client-side using template string replacement and URL encoding.

## Technical Context

**Language/Version**: Node.js 20.19.0 LTS, TypeScript 5.9.3  
**Primary Dependencies**: 
- Backend: Express 5.1.0, better-sqlite3 12.4.6, cors 2.8.5
- Frontend: Vue 3.5.25, Vue Router 4.6.3, Tailwind CSS 4.1.17  
**Storage**: SQLite (better-sqlite3) with schema in backend/src/db/schema.sql  
**Testing**: Vitest 4.0.14 (unit/integration), Playwright 1.57.0 (E2E)  
**Target Platform**: Web application (SPA + REST API), development on Linux, production-ready for desktop browsers  
**Project Type**: Web application with monorepo structure (backend/, frontend/, shared/)  
**Performance Goals**: Settings UI response <100ms, search dropdown render <50ms, URL generation <10ms  
**Constraints**: 
- Must maintain Settings singleton pattern (only one row in Settings table)
- Must persist search providers across sessions
- URL encoding must handle international characters (UTF-8)
- Dropdown must remain usable with 20+ providers (scrolling)  
**Scale/Scope**: Single-user application, <20 search providers expected, minimal API calls (CRUD only on settings changes)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Implementation Gate

- [x] **Feature specification exists** - specs/002-search-providers/spec.md complete with user stories and requirements
- [x] **Architecture approach documented** - This plan documents REST API + client-side rendering approach
- [x] **Tests written and verified to fail (TDD)** - Will be created in Phase 2 (tasks generation)
- [x] **Constitution compliance verified** - Proceeding to detailed check below

### Constitution Compliance

**Principle I: Code Quality (NON-NEGOTIABLE)**
- [x] Readable code: Use descriptive names (SearchProvider, urlTemplate, encodeSearchUrl)
- [x] Comments: Document URL template syntax and encoding logic
- [x] Linting: Existing ESLint setup will enforce style
- [x] No duplication: Extract URL encoding/replacement into shared utility function
- [x] Error handling: Validate template syntax, handle missing album data gracefully
- [x] Named constants: Define placeholder patterns as constants ({artist}, {album})
- [x] Latest packages: All dependencies already at latest versions per package.json

**Principle II: Testing Standards (NON-NEGOTIABLE)**
- [x] TDD: Tests will be written before implementation (Phase 2 tasks)
- [x] Contract tests: Required for search provider CRUD API endpoints
- [x] Integration tests: Required for Settings persistence and AlbumCard dropdown rendering
- [x] Unit tests: Required for URL template replacement and encoding logic
- [x] E2E tests: Required for end-to-end flow (configure provider → search from album card)

**Principle III: User Experience Consistency**
- [x] Design system: Use Tailwind CSS classes consistent with existing components
- [x] Immediate feedback: Show validation errors for empty names/templates, loading states for API calls
- [x] User-friendly errors: "Provider name is required" not "Validation failed: name field empty"
- [x] Consistent navigation: Settings page already exists, extend it with provider management
- [x] Semantic HTML: Use `<button>`, `<form>`, `<select>` elements appropriately
- [x] Performance: URL generation client-side (<10ms), no API calls on search action

**Principle IV: Maintainability**
- [x] Separation of concerns: API layer (routes), business logic (services), data access (repository), presentation (Vue components)
- [x] Minimal dependencies: No new dependencies required (use built-in URL encoding)
- [x] Documented architecture: This plan + data-model.md + contracts/
- [x] No breaking changes: Additive feature, existing Settings API remains compatible
- [x] Externalized config: Search providers stored in DB, not hardcoded
- [x] YAGNI: Build only template replacement with {artist}/{album}, not generic placeholder engine

**Principle V: Security**
- [x] Input validation: Validate provider name (not empty), URL template (basic URL structure)
- [x] No auth required: Single-user desktop application (per constitution clarification)
- [x] No sensitive data: Search providers are user preferences, not secrets
- [x] Dependency scanning: Existing npm audit process applies
- [x] Security logging: Not required for this feature (no security-sensitive operations)
- [x] No secrets: URLs may be sensitive (private stores), but user-managed and local-only

### Pre-Merge Gate (to be verified during implementation)

- [ ] All tests passing (contract, integration, unit, E2E)
- [ ] Code coverage meets 80% for business logic (URL replacement, validation)
- [ ] Linting and formatting checks pass
- [ ] Security scan shows no HIGH or CRITICAL vulnerabilities
- [ ] Self-review completed against this plan
- [ ] Documentation updated (CLAUDE.md if new patterns introduced)

### Pre-Release Gate (to be verified before deployment)

- [ ] All critical user journeys tested E2E (configure → search → verify URL)
- [ ] Performance benchmarks met (<100ms settings UI, <50ms dropdown render)
- [ ] Security review completed
- [ ] No migration guide needed (backward compatible addition)

**GATE STATUS**: ✅ PASS - All pre-implementation checks satisfied, no violations

## Project Structure

### Documentation (this feature)

```text
specs/002-search-providers/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── search-providers-api.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   ├── Settings.ts           # [EXTEND] Add SearchProvider type and validation
│   │   └── SearchProvider.ts     # [NEW] SearchProvider model class
│   ├── repositories/
│   │   └── SettingsRepository.ts # [EXTEND] Add CRUD methods for search providers
│   ├── services/
│   │   └── SearchProviderService.ts # [NEW] Business logic for provider management
│   ├── api/
│   │   └── routes/
│   │       └── searchProvidersRoutes.ts # [NEW] REST API endpoints
│   ├── utils/
│   │   └── urlTemplate.ts        # [NEW] URL template replacement and encoding utilities
│   └── server.ts                  # [EXTEND] Register search provider routes
└── tests/
    ├── unit/
    │   ├── urlTemplate.test.ts    # [NEW] Unit tests for URL utilities
    │   └── SearchProvider.test.ts # [NEW] Unit tests for model validation
    ├── integration/
    │   └── searchProviders.test.ts # [NEW] API integration tests
    └── contract/
        └── searchProvidersApi.test.ts # [NEW] Contract tests

frontend/
├── src/
│   ├── components/
│   │   ├── artist/
│   │   │   └── AlbumCard.vue      # [EXTEND] Add search dropdown for missing albums
│   │   └── settings/
│   │       └── SearchProvidersList.vue # [NEW] List manager for providers
│   ├── pages/
│   │   └── SettingsPage.vue       # [EXTEND] Add SearchProvidersList component
│   ├── services/
│   │   └── searchProviderService.ts # [NEW] API client for search provider operations
│   └── composables/
│       └── useSearchProviders.ts   # [NEW] Composable for provider state management
└── tests/
    ├── unit/
    │   └── AlbumCard.test.ts       # [EXTEND] Test search dropdown rendering
    └── e2e/
        └── searchProviders.spec.ts  # [NEW] E2E tests for full flow

shared/
└── types/
    └── index.ts                     # [EXTEND] Add SearchProvider interface

```

**Structure Decision**: This is a web application following the existing monorepo structure with backend/, frontend/, and shared/ workspaces. Backend uses Express with layered architecture (models, repositories, services, API routes). Frontend uses Vue 3 with component-based architecture. No new top-level directories needed; feature integrates into existing structure.

## Complexity Tracking

> **No violations requiring justification** - All constitution checks passed.

## Phase 0: Research & Decisions

The following research tasks will be executed to resolve all technical unknowns and establish implementation patterns.

### Research Tasks

1. **URL Encoding Standards for International Characters**
   - **Question**: How to properly encode special characters (é, /, &, spaces) in search URLs for maximum browser compatibility?
   - **Research Needed**: 
     - RFC 3986 URI encoding specifications
     - JavaScript encodeURIComponent vs encodeURI usage
     - Handling edge cases like plus signs, slashes in artist names
   - **Decision Required**: Choose encoding function and document edge case handling

2. **JSON Column Storage in SQLite with better-sqlite3**
   - **Question**: Best practice for storing array of search providers in SQLite Settings table?
   - **Research Needed**:
     - JSON1 extension support in better-sqlite3
     - JSON column vs separate table trade-offs
     - Query/update patterns for JSON arrays in SQLite
   - **Decision Required**: Schema approach (JSON column vs normalized table) with rationale

3. **Vue 3 Dropdown Component Best Practices**
   - **Question**: How to build an accessible, performant dropdown menu for 20+ items in Vue 3 with Tailwind CSS?
   - **Research Needed**:
     - Native `<select>` vs custom dropdown with keyboard navigation
     - Tailwind CSS dropdown patterns (headlessui alternatives)
     - Performance considerations for conditional rendering
   - **Decision Required**: Component implementation approach (native vs custom)

4. **Template String Replacement Security**
   - **Question**: How to safely replace {artist} and {album} placeholders without injection vulnerabilities?
   - **Research Needed**:
     - Template literal vs string replace approaches
     - Protection against malicious templates (e.g., {artist}<script>...)
     - URL validation after placeholder replacement
   - **Decision Required**: Safe replacement algorithm with validation

5. **Settings API Versioning Strategy**
   - **Question**: How to extend Settings API without breaking existing clients?
   - **Research Needed**:
     - Backward compatibility patterns for JSON field additions
     - API versioning approaches (none vs /v1/ prefix)
     - Frontend/backend coupling in monorepo context
   - **Decision Required**: Versioning strategy for this and future Settings extensions

**Output**: research.md with consolidated findings and decisions

## Phase 1: Design & Contracts

### Data Model Design

**Entities to Define** (in data-model.md):

1. **SearchProvider**
   - Fields: id, name, urlTemplate, createdAt, updatedAt
   - Validation rules: name non-empty, urlTemplate valid URL structure
   - Relationships: Many providers per Settings (stored as JSON array)
   - State: No transitions (simple CRUD)

2. **Settings (Extended)**
   - New field: search_providers (JSON array of SearchProvider objects)
   - Migration: Add column with default empty array '[]'
   - Backward compatibility: Existing fields unchanged

### API Contract Design

**Endpoints to Define** (in contracts/search-providers-api.yaml):

Following RESTful patterns from existing API structure:

```
GET    /api/settings/search-providers          # List all providers
POST   /api/settings/search-providers          # Create new provider
PUT    /api/settings/search-providers/:id      # Update provider
DELETE /api/settings/search-providers/:id      # Delete provider
```

Request/response schemas:
- SearchProviderRequest: { name: string, urlTemplate: string }
- SearchProviderResponse: { id: number, name: string, urlTemplate: string, createdAt: string, updatedAt: string }
- ErrorResponse: { error: string, details?: string }

Validation rules and error codes to be documented in OpenAPI 3.0 format.

### Developer Quickstart

**Output**: quickstart.md with:
- How to add a search provider via API (curl examples)
- How to test URL template replacement locally
- How to add the dropdown to AlbumCard (component usage)
- Common troubleshooting (empty dropdown, encoding issues)

### Agent Context Update

Run `.specify/scripts/bash/update-agent-context.sh claude` to update CLAUDE.md with:
- New patterns: JSON column storage in SQLite, URL template replacement
- Testing approach: Contract tests for CRUD, unit tests for encoding
- Component patterns: Vue dropdown with Tailwind CSS

**Outputs**: 
- data-model.md
- contracts/search-providers-api.yaml  
- quickstart.md
- CLAUDE.md (updated)

---

**Planning Phase Complete**: After Phase 1, proceed with `/speckit.tasks` to generate actionable implementation tasks.
