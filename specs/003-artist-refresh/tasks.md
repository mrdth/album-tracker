# Tasks: Artist Data Refresh

**Input**: Design documents from `/specs/003-artist-refresh/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included based on Constitution Principle II (Testing Standards - NON-NEGOTIABLE)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app structure**: `backend/src/`, `frontend/src/`, `e2e/`
- Paths follow the project structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure (no setup needed - using existing project)

*No tasks required* - This feature integrates into existing album-tracker project with established structure.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 [P] Write failing contract test for POST /api/artists/:artistId/refresh in backend/tests/integration/api/artists-refresh.test.ts
- [x] T002 [P] Write failing contract test for GET /api/artists/stale-check in backend/tests/integration/api/artists-refresh.test.ts
- [x] T003 [P] Write failing unit test for dateFormat utility in backend/tests/unit/utils/dateFormat.test.ts
- [x] T004 [P] Implement dateFormat utility with formatRelativeTime() in backend/src/utils/dateFormat.ts
- [x] T005 Verify dateFormat tests now pass

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Manual Artist Refresh (Priority: P1) 🎯 MVP

**Goal**: Users can manually refresh an artist's album data from the music catalog via a button on the artist detail page, see new albums added, and have the "last checked" timestamp updated.

**Independent Test**: Navigate to artist detail page, click refresh button, verify new albums appear and timestamp updates. Test with artist that has new releases and artist with no new releases.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Write failing unit test for ArtistRefreshService.refreshArtist() in backend/tests/unit/services/ArtistRefreshService.test.ts
- [x] T007 [P] [US1] Write failing unit test for ArtistRefreshService concurrency handling in backend/tests/unit/services/ArtistRefreshService.test.ts
- [x] T008 [P] [US1] Write failing integration test for refresh endpoint success case in backend/tests/integration/api/artists-refresh.test.ts
- [x] T009 [P] [US1] Write failing integration test for refresh endpoint error cases in backend/tests/integration/api/artists-refresh.test.ts
- [x] T010 [P] [US1] Write failing E2E test for complete refresh flow in e2e/artist-refresh.spec.ts

### Backend Implementation for User Story 1

- [x] T011 [P] [US1] Create ArtistRefreshService class with activeRefreshes Set in backend/src/services/ArtistRefreshService.ts
- [x] T012 [US1] Implement ArtistRefreshService.refreshArtist() method with duplicate prevention logic in backend/src/services/ArtistRefreshService.ts
- [x] T013 [US1] Add POST /api/artists/:artistId/refresh endpoint with validation in backend/src/api/routes/artists.ts
- [x] T014 [US1] Wire up refresh endpoint to call ArtistRefreshService.refreshArtist() in backend/src/api/routes/artists.ts
- [x] T015 [US1] Add error handling for 404, 409, 503 cases in refresh endpoint in backend/src/api/routes/artists.ts
- [x] T016 [US1] Verify backend tests pass (T006-T009)

### Frontend Implementation for User Story 1

- [ ] T017 [P] [US1] Write failing test for RefreshButton component in frontend/tests/components/RefreshButton.test.ts
- [x] T018 [P] [US1] Implement frontend dateFormat utility with formatRelativeTime() in frontend/src/utils/dateFormat.ts
- [x] T019 [P] [US1] Create useArtistRefresh composable with isRefreshing and refresh() in frontend/src/composables/useArtistRefresh.ts
- [x] T020 [US1] Create RefreshButton component with loading state and error handling in frontend/src/components/artist/RefreshButton.vue
- [x] T021 [US1] Modify ArtistDetailHeader to add RefreshButton and display updated_at timestamp in frontend/src/components/artist/ArtistDetailHeader.vue
- [x] T022 [US1] Wire up refresh button click to useArtistRefresh.refresh() in frontend/src/components/artist/ArtistDetailHeader.vue
- [x] T023 [US1] Verify frontend tests pass (T017) and E2E test passes (T010)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can manually refresh artists and see results.

---

## Phase 4: User Story 2 - Display Last Checked Timestamp (Priority: P2)

**Goal**: Users can see a human-readable "last checked" timestamp on the artist detail page showing when the artist's albums were last refreshed.

**Independent Test**: View artist detail pages for artists with different refresh ages (today, yesterday, >7 days ago, never refreshed). Verify timestamp displays correctly in each case.

### Tests for User Story 2

- [ ] T024 [P] [US2] Write failing test for timestamp display formatting in frontend/tests/components/ArtistDetailHeader.test.ts
- [ ] T025 [P] [US2] Write failing E2E test for timestamp display on artist detail page in e2e/artist-detail-timestamp.spec.ts

### Implementation for User Story 2

- [ ] T026 [US2] Update ArtistDetailHeader to compute and display formatted timestamp using formatRelativeTime() in frontend/src/components/ArtistDetailHeader.vue
- [ ] T027 [US2] Add styles for timestamp display (subtle, gray text) in frontend/src/components/ArtistDetailHeader.vue
- [ ] T028 [US2] Verify tests pass (T024-T025) and timestamp displays correctly for various scenarios

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Timestamps accurately reflect data freshness.

---

## Phase 5: User Story 3 - Automatic Stale Data Refresh (Priority: P3)

**Goal**: System can identify artists whose data hasn't been refreshed in over 7 days and automatically refresh the oldest one via an API endpoint.

**Independent Test**: Create test artists with old updated_at timestamps (8, 15, 30 days ago). Call stale-check endpoint. Verify only the oldest artist (30 days) gets refreshed if > 7 days old. Verify artists <7 days old are not refreshed.

### Tests for User Story 3

- [ ] T029 [P] [US3] Write failing unit test for ArtistRepository.findOldest() in backend/tests/unit/repositories/ArtistRepository.test.ts
- [ ] T030 [P] [US3] Write failing unit test for ArtistRefreshService.checkStaleArtists() in backend/tests/unit/services/ArtistRefreshService.test.ts
- [ ] T031 [P] [US3] Write failing integration test for stale-check endpoint when stale artist exists in backend/tests/integration/api/artists-refresh.test.ts
- [ ] T032 [P] [US3] Write failing integration test for stale-check endpoint when no stale artists in backend/tests/integration/api/artists-refresh.test.ts

### Implementation for User Story 3

- [ ] T033 [P] [US3] Implement ArtistRepository.findOldest() method with ORDER BY updated_at ASC LIMIT 1 in backend/src/repositories/ArtistRepository.ts
- [ ] T034 [US3] Implement ArtistRefreshService.checkStaleArtists() with 7-day threshold logic in backend/src/services/ArtistRefreshService.ts
- [ ] T035 [US3] Add GET /api/artists/stale-check endpoint in backend/src/api/routes/artists.ts
- [ ] T036 [US3] Wire up stale-check endpoint to call ArtistRefreshService.checkStaleArtists() in backend/src/api/routes/artists.ts
- [ ] T037 [US3] Add error handling and response formatting for stale-check endpoint in backend/src/api/routes/artists.ts
- [ ] T038 [US3] Verify all tests pass (T029-T032)

**Checkpoint**: All user stories should now be independently functional. Stale data can be automatically detected and refreshed.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T039 [P] Add JSDoc comments to ArtistRefreshService methods in backend/src/services/ArtistRefreshService.ts
- [ ] T040 [P] Add JSDoc comments to dateFormat utilities in backend/src/utils/dateFormat.ts and frontend/src/utils/dateFormat.ts
- [ ] T041 [P] Update CLAUDE.md with any new patterns or conventions from this feature
- [ ] T042 Run full test suite (npm test) and verify all tests pass
- [ ] T043 Run linter (npm run lint) and fix any issues
- [ ] T044 Run type checker (npm run type-check) and fix any type errors
- [ ] T045 Manual testing: Verify quickstart.md scenarios work end-to-end
- [ ] T046 [P] Performance test: Verify refresh completes <10 seconds for artist with 100 albums
- [ ] T047 Code review: Self-review against constitution principles (Code Quality, Testing, UX, Maintainability, Security)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Not applicable - using existing project
- **Foundational (Phase 2)**: No dependencies - can start immediately - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion (T001-T005)
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 completion (T018 - uses dateFormat utility from US1) - Can reuse refresh functionality
- **User Story 3 (P3)**: Depends on US1 completion (T012 - uses ArtistRefreshService.refreshArtist()) - No dependency on US2

**Recommended Order**: US1 → US2 → US3 (or US1 → US3 in parallel with US2)

### Within Each User Story

- Tests (T006-T010) MUST be written and FAIL before implementation (T011-T023)
- Backend models/services before endpoints (T011-T012 before T013-T015)
- Backend complete (T016) before starting frontend (T017-T023)
- Core implementation before integration
- Story complete and validated before moving to next priority

### Parallel Opportunities

**Foundational Phase (Phase 2)**:
- T001, T002, T003 can all run in parallel (different test files)
- T004 can run in parallel with tests (implementation, not depending on tests yet)

**User Story 1 (Phase 3)**:
- Tests T006, T007, T008, T009, T010 can all run in parallel (different test files)
- After backend tests written: T011 can run in parallel with T017, T018 (backend service vs frontend components)
- After tests pass: Frontend tasks T017-T020 can run in parallel (different files)

**User Story 2 (Phase 4)**:
- Tests T024, T025 can run in parallel

**User Story 3 (Phase 5)**:
- Tests T029, T030, T031, T032 can all run in parallel
- After tests written: T033 can run in parallel with T034 (repository vs service)

**Polish Phase (Phase 6)**:
- T039, T040, T041 can all run in parallel (documentation tasks)
- T046 can run in parallel with manual testing
- T042-T044 should run sequentially (tests, lint, types)

**Cross-Story Parallelism**:
- Once Foundational is complete (T005), different team members can work on different user stories
- Example: Developer A works on US1, Developer B starts tests for US2

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational tests together:
Task: "Write failing contract test for POST /api/artists/:artistId/refresh in backend/tests/integration/api/artists-refresh.test.ts"
Task: "Write failing contract test for GET /api/artists/stale-check in backend/tests/integration/api/artists-refresh.test.ts"
Task: "Write failing unit test for dateFormat utility in backend/tests/unit/utils/dateFormat.test.ts"

# Simultaneously implement dateFormat utility:
Task: "Implement dateFormat utility with formatRelativeTime() in backend/src/utils/dateFormat.ts"
```

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write failing unit test for ArtistRefreshService.refreshArtist() in backend/tests/unit/services/ArtistRefreshService.test.ts"
Task: "Write failing unit test for ArtistRefreshService concurrency handling in backend/tests/unit/services/ArtistRefreshService.test.ts"
Task: "Write failing integration test for refresh endpoint success case in backend/tests/integration/api/artists-refresh.test.ts"
Task: "Write failing integration test for refresh endpoint error cases in backend/tests/integration/api/artists-refresh.test.ts"
Task: "Write failing E2E test for complete refresh flow in e2e/artist-refresh.spec.ts"

# After backend service created, launch all frontend components together:
Task: "Implement frontend dateFormat utility with formatRelativeTime() in frontend/src/utils/dateFormat.ts"
Task: "Create useArtistRefresh composable with isRefreshing and refresh() in frontend/src/composables/useArtistRefresh.ts"
Task: "Create RefreshButton component with loading state and error handling in frontend/src/components/RefreshButton.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001-T005)
2. Complete Phase 3: User Story 1 (T006-T023)
3. **STOP and VALIDATE**: Test User Story 1 independently
4. Deploy/demo if ready - Users can manually refresh artists!

### Incremental Delivery

1. Complete Foundational → Foundation ready (T001-T005)
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!) (T006-T023)
3. Add User Story 2 → Test independently → Deploy/Demo (T024-T028)
4. Add User Story 3 → Test independently → Deploy/Demo (T029-T038)
5. Polish → Final release (T039-T047)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Foundational together (T001-T005)
2. Once Foundational is done:
   - Developer A: User Story 1 (T006-T023)
   - Developer B: Start tests for User Story 2 (T024-T025)
   - Developer C: Start tests for User Story 3 (T029-T032)
3. As US1 completes:
   - Developer B: Complete User Story 2 implementation (T026-T028)
   - Developer C: Complete User Story 3 implementation (T033-T038)
4. Team collaborates on Polish (T039-T047)

---

## Task Count Summary

- **Total Tasks**: 47
- **Foundational**: 5 tasks (T001-T005)
- **User Story 1 (P1 - MVP)**: 18 tasks (T006-T023)
- **User Story 2 (P2)**: 5 tasks (T024-T028)
- **User Story 3 (P3)**: 10 tasks (T029-T038)
- **Polish**: 9 tasks (T039-T047)

**Parallel Opportunities**: 24 tasks marked [P] can run in parallel with other tasks

**MVP Scope**: Complete T001-T023 (23 tasks) for a working manual artist refresh feature

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach per Constitution Principle II)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution principles verified in T047 (final code review)
- All file paths follow the project structure defined in plan.md
