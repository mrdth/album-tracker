---
description: "Implementation tasks for Album Tracker feature"
---

# Tasks: Album Tracker

**Input**: Design documents from `/specs/001-album-tracker/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.openapi.yaml

**Tests**: Following TDD approach per Constitution Principle II - tests written FIRST before implementation

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project directory structure (backend/, frontend/, shared/)
- [X] T002 Initialize backend Node.js/TypeScript project with Express, better-sqlite3, fuse.js dependencies in backend/package.json
- [X] T003 [P] Initialize frontend Vue 3/Vite project with Tailwind CSS, Vue Router dependencies in frontend/package.json
- [X] T004 [P] Configure ESLint and Prettier for backend in backend/.eslintrc.js and backend/.prettierrc
- [X] T005 [P] Configure ESLint and Prettier for frontend in frontend/.eslintrc.js and frontend/.prettierrc
- [X] T006 [P] Configure Vitest for backend testing in backend/vitest.config.ts
- [X] T007 [P] Configure Vitest for frontend component testing in frontend/vitest.config.ts
- [X] T008 [P] Configure Playwright for E2E testing in playwright.config.ts
- [X] T009 Setup shared TypeScript types in shared/types/index.ts (Artist, Album, Settings, FilesystemCacheEntry interfaces)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T010 Create SQLite schema in backend/src/db/schema.sql (Artist, Album, Settings, FilesystemCache tables)
- [X] T011 Implement database connection wrapper in backend/src/db/connection.ts (better-sqlite3 setup with WAL mode)
- [X] T012 [P] Create Settings singleton model in backend/src/models/Settings.ts
- [X] T013 [P] Create Settings repository in backend/src/repositories/SettingsRepository.ts
- [X] T014 Initialize default Settings row on database creation
- [X] T015 [P] Implement path traversal prevention utility in backend/src/utils/pathValidation.ts (safeResolvePath with 5-layer security)
- [X] T016 [P] Implement existing MusicBrainzClient wrapper with retry logic in backend/src/services/MusicBrainzService.ts (exponential backoff, 3 retries)
- [X] T017 [P] Create Express app scaffolding in backend/src/server.ts (CORS, JSON middleware, error handler)
- [X] T018 [P] Implement global error handling middleware in backend/src/api/middleware/errorHandler.ts
- [X] T019 [P] Implement request validation middleware in backend/src/api/middleware/validation.ts
- [X] T020 [P] Setup Tailwind CSS in frontend (tailwind.config.js, postcss.config.js, main CSS import)
- [X] T021 [P] Create Vue Router configuration in frontend/src/router/index.ts (routes for Home, ArtistDetail, Collection, Settings)
- [X] T022 [P] Create API client wrapper in frontend/src/services/api.ts (fetch with base URL and error handling)
- [X] T023 [P] Create reusable LoadingSpinner component in frontend/src/components/common/LoadingSpinner.vue
- [X] T024 [P] Create reusable ErrorMessage component in frontend/src/components/common/ErrorMessage.vue

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Search and Import Artist Discography (Priority: P1) 🎯 MVP

**Goal**: Enable users to search for artists, view results, and import complete discographies into local storage

**Independent Test**: Search for "Radiohead", import artist, verify artist and albums stored in database with all metadata

### Tests for User Story 1 (TDD - Write FIRST)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T025 [P] [US1] Contract test for GET /api/artists/search in backend/tests/integration/api/artists.test.ts (verify response schema matches OpenAPI)
- [ ] T026 [P] [US1] Contract test for POST /api/artists in backend/tests/integration/api/artists.test.ts (verify import response schema)
- [ ] T027 [P] [US1] Contract test for GET /api/artists/:artistId in backend/tests/integration/api/artists.test.ts (verify detail response schema)
- [ ] T028 [P] [US1] Unit test for MusicBrainzService artist search in backend/tests/unit/services/MusicBrainzService.test.ts (mock API responses)
- [ ] T029 [P] [US1] Unit test for MusicBrainzService discography fetch in backend/tests/unit/services/MusicBrainzService.test.ts (filter type: Album)
- [ ] T030 [P] [US1] E2E test for complete artist import journey in e2e/critical/artist-import.spec.ts (search → select → import → view detail)
- [ ] T031 [P] [US1] E2E test for duplicate artist prevention in e2e/critical/artist-import.spec.ts (import same artist twice)

### Implementation for User Story 1

- [ ] T032 [P] [US1] Create Artist model in backend/src/models/Artist.ts (MBID, name, sort_name, disambiguation, linked_folder_path)
- [ ] T033 [P] [US1] Create Album model in backend/src/models/Album.ts (MBID, title, release_year, ownership_status, match_confidence, is_manual_override)
- [ ] T034 [US1] Create ArtistRepository in backend/src/repositories/ArtistRepository.ts (create, findByMbid, findById, list with stats)
- [ ] T035 [US1] Create AlbumRepository in backend/src/repositories/AlbumRepository.ts (bulkCreate, findByArtistId, updateOwnership)
- [ ] T036 [US1] Implement artist search in MusicBrainzService.searchArtists() (query MusicBrainz API, handle rate limits)
- [ ] T037 [US1] Implement discography import in MusicBrainzService.fetchReleaseGroups() (fetch albums, filter type: Album only)
- [ ] T038 [US1] Implement GET /api/artists/search route in backend/src/api/routes/artists.ts (call MusicBrainzService, return sorted results)
- [ ] T039 [US1] Implement POST /api/artists route in backend/src/api/routes/artists.ts (import artist + albums, handle duplicates with 409)
- [ ] T040 [US1] Implement GET /api/artists/:artistId route in backend/src/api/routes/artists.ts (return artist with all albums)
- [ ] T041 [US1] Implement GET /api/artists route in backend/src/api/routes/artists.ts (Collection Overview - all artists with stats)
- [ ] T042 [P] [US1] Create ArtistSearchForm component in frontend/src/components/search/ArtistSearchForm.vue (input, search button, loading state)
- [ ] T043 [P] [US1] Create ArtistSearchResults component in frontend/src/components/search/ArtistSearchResults.vue (result cards, import buttons)
- [ ] T044 [P] [US1] Create useArtistSearch composable in frontend/src/composables/useArtistSearch.ts (reactive search state, API calls)
- [ ] T045 [US1] Create HomePage in frontend/src/pages/HomePage.vue (integrate search form + results)
- [ ] T046 [P] [US1] Create ArtistDetailHeader component in frontend/src/components/artist/ArtistDetailHeader.vue (artist name, stats, disambiguation)
- [ ] T047 [P] [US1] Create AlbumCard component in frontend/src/components/artist/AlbumCard.vue (title, year, ownership status badge)
- [ ] T048 [P] [US1] Create AlbumGrid component in frontend/src/components/artist/AlbumGrid.vue (grid layout with AlbumCard instances)
- [ ] T049 [US1] Create ArtistDetailPage in frontend/src/pages/ArtistDetailPage.vue (header + album grid)
- [ ] T050 [US1] Add error handling and user-friendly error messages to all US1 components (95% self-serve resolution per SC-010)
- [ ] T051 [US1] Add loading states and ARIA live regions to all US1 components (screen reader announcements)

**Checkpoint**: User Story 1 complete - can search artists, import discographies, view album lists

---

## Phase 4: User Story 2 - Configure Library Path and Scan Filesystem (Priority: P2)

**Goal**: Enable users to configure music library path, trigger filesystem scan, and automatically match albums

**Independent Test**: Set library path to test fixture folder, trigger scan, verify ownership status updates correctly for known album folders

### Tests for User Story 2 (TDD - Write FIRST)

- [ ] T052 [P] [US2] Contract test for GET /api/settings in backend/tests/integration/api/settings.test.ts
- [ ] T053 [P] [US2] Contract test for PATCH /api/settings in backend/tests/integration/api/settings.test.ts (path validation scenarios)
- [ ] T054 [P] [US2] Contract test for POST /api/filesystem/scan in backend/tests/integration/api/filesystem.test.ts
- [ ] T055 [P] [US2] Unit test for FilesystemScanner.scan() in backend/tests/unit/services/FilesystemScanner.test.ts (with test fixtures)
- [ ] T056 [P] [US2] Unit test for AlbumMatcher with Fuse.js in backend/tests/unit/services/AlbumMatcher.test.ts (80% threshold scenarios)
- [ ] T057 [P] [US2] Integration test for folder name parsing in backend/tests/integration/services/FilesystemScanner.test.ts ([YYYY] Title format)
- [ ] T058 [P] [US2] E2E test for library configuration in e2e/important/library-scan.spec.ts (configure path, trigger scan, verify results)
- [ ] T059 [P] [US2] E2E test for invalid path validation in e2e/important/library-scan.spec.ts (nonexistent path, permission denied)

### Implementation for User Story 2

- [ ] T060 [US2] Create FilesystemCache model in backend/src/models/FilesystemCache.ts (folder_path, parsed_year, parsed_title)
- [ ] T061 [US2] Create FilesystemCacheRepository in backend/src/repositories/FilesystemCacheRepository.ts (bulkInsert, findByParentPath, clear)
- [ ] T062 [US2] Implement FilesystemScanner service in backend/src/services/FilesystemScanner.ts (recursive scan, folder parsing, cache population)
- [ ] T063 [US2] Implement folder name parsing logic in FilesystemScanner (regex for [YYYY] Title, normalization, grouped directories = A =)
- [ ] T064 [US2] Implement artist folder detection in FilesystemScanner with unit test (naming rules, character normalization, article movement "The Beatles" → "Beatles, The", grouped directories = A =)
- [ ] T065 [US2] Implement AlbumMatcher service in backend/src/services/AlbumMatcher.ts (Fuse.js integration, year filtering, confidence scoring)
- [ ] T066 [US2] Configure Fuse.js for 80% similarity threshold in AlbumMatcher (threshold: 0.2, ignoreLocation: true)
- [ ] T067 [US2] Implement GET /api/settings route in backend/src/api/routes/settings.ts (return singleton settings)
- [ ] T068 [US2] Implement PATCH /api/settings route in backend/src/api/routes/settings.ts (validate library path with safeResolvePath, check existence/readability)
- [ ] T069 [US2] Implement POST /api/filesystem/scan route in backend/src/api/routes/filesystem.ts (trigger scan, run matching, update Album ownership)
- [ ] T070 [US2] Implement scan logic to preserve manual overrides in FilesystemScanner (skip albums where is_manual_override = 1)
- [ ] T071 [P] [US2] Create LibraryPathConfig component in frontend/src/components/settings/LibraryPathConfig.vue (path input, validation, save button)
- [ ] T072 [P] [US2] Create SettingsPage in frontend/src/pages/SettingsPage.vue (library path config, similarity threshold display)
- [ ] T073 [US2] Add "Scan Library" button to ArtistDetailPage (trigger rescan for current artist)
- [ ] T074 [US2] Create useFilesystemScan composable in frontend/src/composables/useFilesystemScan.ts (scan state, progress tracking)
- [ ] T075 [US2] Add scan progress indicator to ArtistDetailPage (loading spinner, progress bar, completion message)
- [ ] T076 [US2] Update AlbumCard component to display matched folder path when ownership_status = Owned
- [ ] T077 [US2] Add match confidence indicator to AlbumCard (show confidence score for Ambiguous status)

**Checkpoint**: User Story 2 complete - can configure library, scan filesystem, see ownership status

---

## Phase 5: User Story 3 - View Collection Overview and Progress (Priority: P3)

**Goal**: Provide high-level view of all imported artists with ownership statistics

**Independent Test**: Import 3 artists, run scans, verify Collection Overview shows correct owned/total counts and progress percentages

### Tests for User Story 3 (TDD - Write FIRST)

- [ ] T078 [P] [US3] Contract test for GET /api/artists in backend/tests/integration/api/artists.test.ts (verify statistics in response)
- [ ] T079 [P] [US3] Unit test for ArtistRepository.list() with computed stats in backend/tests/unit/repositories/ArtistRepository.test.ts
- [ ] T080 [P] [US3] E2E test for Collection Overview display in e2e/important/collection-view.spec.ts (verify counts, progress bars, navigation)

### Implementation for User Story 3

- [ ] T081 [US3] Update ArtistRepository.list() to include computed fields (total_albums, owned_albums, completion_percentage via SQL query)
- [ ] T082 [P] [US3] Create ArtistSummaryCard component in frontend/src/components/collection/ArtistSummaryCard.vue (artist name, stats, progress bar, click to detail)
- [ ] T083 [P] [US3] Create CollectionOverview component in frontend/src/components/collection/CollectionOverview.vue (grid of ArtistSummaryCard instances)
- [ ] T084 [US3] Create CollectionPage in frontend/src/pages/CollectionPage.vue (fetch all artists, display overview)
- [ ] T085 [US3] Add navigation link to CollectionPage in frontend App.vue navigation bar
- [ ] T086 [US3] Add sorting options to CollectionOverview (by name, by completion percentage, by owned count)
- [ ] T087 [US3] Add filter options to CollectionOverview (show all, show incomplete only, show complete only)

**Checkpoint**: User Story 3 complete - can view collection overview with statistics

---

## Phase 6: User Story 4 - Manage Album Detail and Manual Overrides (Priority: P4)

**Goal**: Allow users to manually link folders to albums or toggle ownership status

**Independent Test**: Select an Ambiguous album, manually select folder, verify ownership becomes Owned and persists across rescans

### Tests for User Story 4 (TDD - Write FIRST)

- [ ] T088 [P] [US4] Contract test for PATCH /api/albums/:albumId in backend/tests/integration/api/albums.test.ts (manual override scenarios)
- [ ] T089 [P] [US4] Integration test for manual override persistence in backend/tests/integration/services/FilesystemScanner.test.ts (rescan doesn't override manual)
- [ ] T090 [P] [US4] E2E test for manual folder selection in e2e/important/manual-overrides.spec.ts (directory browser, folder selection, persistence)

### Implementation for User Story 4

- [ ] T091 [US4] Implement PATCH /api/albums/:albumId route in backend/src/api/routes/albums.ts (update matched_folder_path, set is_manual_override = 1)
- [ ] T092 [US4] Add validation to PATCH /api/albums/:albumId (validate folder path with safeResolvePath, set ownership to Owned if path provided)
- [ ] T093 [US4] Implement ownership toggle in PATCH /api/albums/:albumId (allow manual Owned/Missing toggle, set is_manual_override = 1)
- [ ] T094 [US4] Implement GET /api/filesystem/browse route in backend/src/api/routes/filesystem.ts (server-side directory tree with path traversal prevention)
- [ ] T095 [US4] Add parent_path calculation to directory browser (enable navigation up)
- [ ] T096 [P] [US4] Create DirectoryBrowser component in frontend/src/components/filesystem/DirectoryBrowser.vue (tree view, navigation, folder selection)
- [ ] T097 [P] [US4] Create useDirectoryBrowser composable in frontend/src/composables/useDirectoryBrowser.ts (navigation state, API calls)
- [ ] T098 [US4] Add "Link Folder" button to AlbumCard component (opens DirectoryBrowser modal)
- [ ] T099 [US4] Add "Toggle Ownership" button to AlbumCard component (manual Owned/Missing toggle)
- [ ] T100 [US4] Add "Clear Override" button to AlbumCard for manually-linked albums
- [ ] T101 [US4] Add manual override indicator to AlbumCard (badge showing "Manual" when is_manual_override = true)
- [ ] T102 [US4] Implement keyboard navigation for DirectoryBrowser (Arrow keys, Enter, Escape)

**Checkpoint**: User Story 4 complete - can manually override album ownership and folder links

---

## Phase 7: User Story 5 - Link Artist Folder Manually (Priority: P4)

**Goal**: Allow users to manually link artist folders for non-standard naming

**Independent Test**: Import artist, manually link artist folder with custom name, trigger scan, verify albums detected within that folder

### Tests for User Story 5 (TDD - Write FIRST)

- [ ] T103 [P] [US5] Contract test for PATCH /api/artists/:artistId in backend/tests/integration/api/artists.test.ts (linked_folder_path scenarios)
- [ ] T104 [P] [US5] Integration test for linked artist folder in backend/tests/integration/services/FilesystemScanner.test.ts (scan uses linked folder)
- [ ] T105 [P] [US5] E2E test for artist folder linking in e2e/important/artist-folder-link.spec.ts (link folder, scan, verify detection)

### Implementation for User Story 5

- [ ] T106 [US5] Implement PATCH /api/artists/:artistId route in backend/src/api/routes/artists.ts (update linked_folder_path with validation)
- [ ] T107 [US5] Update FilesystemScanner to prioritize linked_folder_path over automatic detection
- [ ] T108 [US5] Add "Clear Link" functionality to PATCH /api/artists/:artistId (set linked_folder_path = null, revert to automatic)
- [ ] T109 [US5] Add "Link Artist Folder" button to ArtistDetailHeader component (opens DirectoryBrowser modal)
- [ ] T110 [US5] Display linked artist folder path in ArtistDetailHeader when set
- [ ] T111 [US5] Add "Clear Artist Folder Link" button to ArtistDetailHeader when linked_folder_path is set

**Checkpoint**: User Story 5 complete - can manually link artist folders

---

## Phase 8: User Story 6 - Rescan After Library Changes (Priority: P3)

**Goal**: Enable users to refresh scan results when library changes

**Independent Test**: Run initial scan, add new album folder to filesystem, trigger rescan, verify new album detected

### Tests for User Story 6 (TDD - Write FIRST)

- [ ] T112 [P] [US6] Integration test for cache refresh in backend/tests/integration/services/FilesystemScanner.test.ts (clear old cache, detect new folders)
- [ ] T113 [P] [US6] Integration test for ownership updates on rescan in backend/tests/integration/services/FilesystemScanner.test.ts (new Owned, removed → Missing)
- [ ] T114 [P] [US6] E2E test for rescan flow in e2e/important/rescan.spec.ts (initial scan, modify fixtures, rescan, verify updates)

### Implementation for User Story 6

- [ ] T115 [US6] Implement cache clearing in FilesystemScanner.scan() (delete old cache for artist before rescanning)
- [ ] T116 [US6] Implement ownership status updates on rescan (automatic matches: update to Missing if folder removed, update to Owned if new match)
- [ ] T117 [US6] Add rescan timestamp tracking to Settings (last_scan_at field)
- [ ] T118 [US6] Display last scan timestamp in ArtistDetailPage
- [ ] T119 [US6] Add confirmation dialog to "Rescan" button (warn about potential ownership changes)
- [ ] T120 [US6] Add rescan result summary (X new albums found, Y albums removed, Z ownership changes)

**Checkpoint**: User Story 6 complete - can rescan and detect library changes

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T121 [P] Add comprehensive JSDoc comments to all backend services
- [ ] T122 [P] Add comprehensive component documentation to all Vue components
- [ ] T123 [P] Implement DELETE /api/artists/:artistId route in backend/src/api/routes/artists.ts (cascade delete albums)
- [ ] T124 [P] Add artist deletion confirmation dialog in ArtistDetailPage
- [ ] T125 [P] Implement global loading state in frontend App.vue (NProgress or similar)
- [ ] T126 [P] Add global error toast notifications in frontend App.vue
- [ ] T127 Code cleanup: Remove console.log statements, fix linter warnings
- [ ] T128 Performance optimization: Add database indexes per data-model.md (MBID, ownership_status, parent_path)
- [ ] T129 Performance optimization: Implement pagination for large artist lists (if >100 artists)
- [ ] T130 [P] Security audit: Review all path validation, input sanitization, error messages (no internal details exposed)
- [ ] T131 [P] Accessibility audit: Verify keyboard navigation, ARIA labels, focus states per Constitution Principle III
- [ ] T132 [P] Create test fixture library in backend/tests/fixtures/sample-library/ (organized music folders for testing)
- [ ] T133 [P] Create mock MusicBrainz API responses in backend/tests/fixtures/api-responses/
- [ ] T134 Update quickstart.md with final setup instructions
- [ ] T135 Create Docker Compose configuration in docker-compose.yml (app + test fixtures volume)
- [ ] T136 Create Dockerfile for production deployment
- [ ] T137 Run full E2E test suite across all user stories (Playwright critical + important)
- [ ] T138 Run test coverage report and verify >80% per Constitution Principle II
- [ ] T139 Validate all OpenAPI contract tests pass
- [ ] T140 Final constitution compliance check (all 5 principles verified)
- [ ] T141 [P] Validate album matching accuracy against test fixtures (must achieve >=90% per SC-003)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - **P1 (US1)**: Can start after Foundational - No dependencies on other stories
  - **P2 (US2)**: Can start after Foundational - Uses Artist/Album models from US1 but can run in parallel
  - **P3 (US3)**: Can start after Foundational - Uses Artist model from US1 but can run in parallel
  - **P4 (US4)**: Depends on US2 (needs FilesystemScanner) - Should complete US2 first
  - **P4 (US5)**: Depends on US2 (needs FilesystemScanner) - Should complete US2 first
  - **P3 (US6)**: Depends on US2 (needs FilesystemScanner) - Should complete US2 first
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### Recommended Execution Order

**MVP Path (Minimal Viable Product)**:
1. Phase 1: Setup → Phase 2: Foundational → Phase 3: US1 (Search & Import) → Phase 4: US2 (Scan) → **STOP and VALIDATE**
2. This delivers: Artist search, import, and automatic ownership tracking

**Full Feature Path**:
1. Setup → Foundational → US1 → US2 → US3 (Collection Overview) → US4 (Manual Overrides) → US5 (Artist Folders) → US6 (Rescan) → Polish

**Parallel Team Strategy**:
- Complete Setup + Foundational together
- Once Foundational done:
  - Developer A: US1 (Search & Import)
  - Developer B: US2 (Filesystem Scanning) - can work in parallel
  - Developer C: US3 (Collection Overview) - can work in parallel
- Then converge for US4, US5, US6 (depend on US2)

### Within Each User Story

- **CRITICAL**: Tests MUST be written and FAIL before implementation (TDD per Constitution)
- Tests marked [P] can run in parallel (different test files)
- Models before repositories before services before routes
- Backend implementation before frontend integration
- Core functionality before error handling/polish
- Story complete and independently tested before moving to next

### Parallel Opportunities

#### Phase 1 (Setup)
All tasks T002-T009 can run in parallel (different config files)

#### Phase 2 (Foundational)
- T012-T013 (Settings) can run in parallel
- T015-T016 (path validation, MusicBrainz) can run in parallel
- T017-T019 (Express setup) can run in parallel
- T020-T024 (Frontend foundation) can run in parallel

#### Phase 3 (US1)
- All tests T025-T031 can run in parallel
- Models T032-T033 can run in parallel
- Frontend components T042-T048 can run in parallel (different files)

#### Phase 4 (US2)
- All tests T052-T059 can run in parallel
- Frontend components T071-T072 can run in parallel

#### Cross-Story Parallelism
- Once Foundational complete: US1, US2, US3 can all start in parallel (different files, minimal overlap)
- US4, US5, US6 should wait for US2 completion

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
npm run test -- artist-import.spec.ts &
npm run test -- backend/tests/integration/api/artists.test.ts &
npm run test -- backend/tests/unit/services/MusicBrainzService.test.ts &

# Launch all models for User Story 1 together:
# (Different developers or sequential file edits)
# - backend/src/models/Artist.ts
# - backend/src/models/Album.ts

# Launch all frontend components together:
# - frontend/src/components/search/ArtistSearchForm.vue
# - frontend/src/components/search/ArtistSearchResults.vue
# - frontend/src/components/artist/ArtistDetailHeader.vue
# - frontend/src/components/artist/AlbumCard.vue
```

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. **Complete Phase 1**: Setup → ~9 tasks
2. **Complete Phase 2**: Foundational → ~15 tasks (CRITICAL GATE)
3. **Complete Phase 3**: User Story 1 (Search & Import) → ~27 tasks
4. **Complete Phase 4**: User Story 2 (Filesystem Scanning) → ~26 tasks
5. **STOP and VALIDATE**: Test end-to-end journey (search artist, import, scan library, see ownership)
6. Deploy/demo MVP if ready (~77 total tasks for MVP)

### Incremental Delivery

1. Setup + Foundational → Foundation ready (~24 tasks)
2. Add US1 → Test independently → Deploy/Demo (MVP v0.1 - reference catalog)
3. Add US2 → Test independently → Deploy/Demo (MVP v0.2 - ownership tracking) ✅ **Recommended MVP**
4. Add US3 → Test independently → Deploy/Demo (v0.3 - collection overview)
5. Add US4 → Test independently → Deploy/Demo (v0.4 - manual overrides)
6. Add US5 → Test independently → Deploy/Demo (v0.5 - artist folder links)
7. Add US6 → Test independently → Deploy/Demo (v0.6 - rescan)
8. Polish → Deploy/Demo (v1.0 - production ready)

### Test-First Development Flow (Per Task)

1. **Read task description** (includes file path)
2. **Write test** that verifies expected behavior
3. **Run test** - verify it FAILS (red phase)
4. **Implement feature** in specified file
5. **Run test** - verify it PASSES (green phase)
6. **Refactor** if needed while keeping tests green
7. **Commit** with task ID in message
8. **Move to next task**

---

## Notes

- **[P] tasks**: Different files, no dependencies - safe to parallelize
- **[Story] label**: Maps task to specific user story for traceability
- **TDD is mandatory**: Per Constitution Principle II, all tests written before implementation
- **Independent testing**: Each user story should be independently testable after completion
- **File paths included**: Every implementation task specifies exact file location
- **Constitution compliance**: All tasks align with Code Quality, Testing, UX, Maintainability, Security principles
- **Total task count**: 140 tasks (24 Setup/Foundation + 116 User Stories/Polish)
- **Estimated MVP**: ~77 tasks (Setup + Foundational + US1 + US2)
- **Parallel opportunities**: ~60% of tasks can run in parallel with proper team coordination
