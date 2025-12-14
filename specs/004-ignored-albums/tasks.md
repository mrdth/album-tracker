# Tasks: Ignored Albums

**Input**: Design documents from `/specs/004-ignored-albums/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD approach - tests are written BEFORE implementation (80% coverage required per plan.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app monorepo**: `backend/src/`, `frontend/src/`, `shared/types/`
- Tests: `backend/tests/`, `frontend/tests/`, `e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema and type definitions that all user stories depend on

- [X] T001 Update Album table schema in backend/src/db/schema.sql (add is_ignored column, constraints, index, trigger)
- [X] T002 [P] Add database migration for is_ignored column in backend/src/db/connection.ts
- [X] T003 [P] Update Album interface in shared/types/index.ts (add is_ignored field)
- [X] T004 [P] Update AlbumModel class in backend/src/models/Album.ts (add is_ignored property)

**Checkpoint**: Database schema and types ready for all user stories

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational Infrastructure (TDD - Write First)

- [X] T005 [P] Write migration test in backend/tests/integration/db/migration.test.ts (verify is_ignored column added)
- [X] T006 [P] Write Album model test in backend/tests/unit/models/Album.test.ts (verify is_ignored field initialization)

### Foundational Implementation

- [X] T007 Run backend tests to verify T005 and T006 fail (npm run test in backend/)
- [X] T008 Implement migration logic in backend/src/db/connection.ts (runMigrations function)
- [X] T009 Implement Album model changes in backend/src/models/Album.ts (constructor assignment)
- [X] T010 Run backend tests to verify T005 and T006 now pass

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Mark Album as Ignored (Priority: P1) 🎯 MVP

**Goal**: Users can mark unowned albums as ignored, removing them from view and statistics

**Independent Test**: View an artist with multiple unowned albums, click "Ignore" on one album, verify it disappears from display and owned/total counts update correctly

### Tests for User Story 1 (TDD - Write First)

- [X] T011 [P] [US1] Write AlbumRepository.setIgnored() unit test in backend/tests/unit/repositories/AlbumRepository.test.ts
- [X] T012 [P] [US1] Write AlbumRepository.findByArtistId() filter test in backend/tests/unit/repositories/AlbumRepository.test.ts
- [X] T013 [P] [US1] Write AlbumRepository.countByArtist() exclusion test in backend/tests/unit/repositories/AlbumRepository.test.ts
- [X] T014 [P] [US1] Write PATCH /albums/:id contract test in backend/tests/integration/api/albums.test.ts (ignore album endpoint)
- [X] T015 [P] [US1] Write GET /artists/:id/albums contract test in backend/tests/integration/api/albums.test.ts (filter ignored albums)
- [X] T016 [US1] Run backend tests to verify T011-T015 fail (expected before implementation)

### Implementation for User Story 1 (Backend)

- [X] T017 [P] [US1] Implement AlbumRepository.setIgnored() method in backend/src/repositories/AlbumRepository.ts
- [X] T018 [P] [US1] Update AlbumRepository.findByArtistId() with includeIgnored parameter in backend/src/repositories/AlbumRepository.ts
- [X] T019 [P] [US1] Update AlbumRepository.countByArtist() to exclude ignored albums in backend/src/repositories/AlbumRepository.ts
- [X] T020 [US1] Add PATCH /albums/:id is_ignored handler in backend/src/api/routes/albums.ts
- [X] T021 [US1] Update GET /artists/:id/albums to support includeIgnored query param in backend/src/api/routes/albums.ts
- [X] T022 [US1] Run backend tests to verify T011-T015 now pass

### Implementation for User Story 1 (Frontend)

- [X] T023 [P] [US1] Create useAlbumFilter composable in frontend/src/composables/useAlbumFilter.ts (URL query state management)
- [X] T024 [P] [US1] Add ignoreAlbum() method to API client in frontend/src/services/api.ts
- [X] T025 [P] [US1] Add unignoreAlbum() method to API client in frontend/src/services/api.ts
- [X] T026 [US1] Update AlbumCard component in frontend/src/components/albums/AlbumCard.vue (add Ignore button, visual indicators)
- [X] T027 [US1] Update ArtistDetail page in frontend/src/views/ArtistDetailPage.vue (add filtering logic, handle ignore events)
- [X] T028 [US1] Update artist count displays to exclude ignored albums in relevant components

### E2E Test for User Story 1

- [X] T029 [US1] Write E2E test for ignore workflow in e2e/ignore-albums.spec.ts (mark ignored, verify hidden, check statistics)
- [X] T030 [US1] Run E2E test to verify User Story 1 complete workflow

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - View and Manage Ignored Albums (Priority: P2)

**Goal**: Users can toggle to view ignored albums with visual indicators and un-ignore them

**Independent Test**: Toggle "Show Ignored Albums" option, verify ignored albums appear with indicators, click "Un-ignore" to restore an album to normal view

### Tests for User Story 2 (TDD - Write First)

- [X] T031 [US2] Write toggle view test in e2e/ignore-albums.spec.ts (toggle show ignored, verify albums reappear)
- [X] T032 [US2] Write un-ignore test in e2e/ignore-albums.spec.ts (un-ignore album, verify restored to normal)

### Implementation for User Story 2 (Frontend)

- [X] T033 [US2] Add toggle switch UI component in frontend/src/views/ArtistDetailPage.vue (Show Ignored Albums control)
- [X] T034 [US2] Add visual indicators for ignored albums in frontend/src/components/albums/AlbumCard.vue (opacity, badge, strikethrough)
- [X] T035 [US2] Add Un-ignore button to AlbumCard when ignored in frontend/src/components/albums/AlbumCard.vue
- [X] T036 [US2] Implement toggle state sync to URL query params using useAlbumFilter in frontend/src/views/ArtistDetailPage.vue
- [X] T037 [US2] Implement computed property for filtered albums in frontend/src/views/ArtistDetailPage.vue (reactive filtering)
- [X] T038 [US2] Run E2E tests to verify T031-T032 pass

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Prevent Ignoring Owned Albums (Priority: P3)

**Goal**: System prevents users from accidentally ignoring albums they own

**Independent Test**: Attempt to click ignore button on an owned album and verify the action is blocked with appropriate message

### Tests for User Story 3 (TDD - Write First)

- [ ] T039 [US3] Write test for owned album ignore prevention in backend/tests/integration/api/albums.test.ts (403 error expected)
- [ ] T040 [US3] Write test for auto-clear trigger in backend/tests/integration/db/triggers.test.ts (owned album auto-unignores)
- [ ] T041 [US3] Write E2E test for owned album UI in e2e/ignore-albums.spec.ts (no Ignore button shown)
- [ ] T042 [US3] Run backend tests to verify T039-T040 fail (expected before implementation)

### Implementation for User Story 3

- [ ] T043 [US3] Verify database constraint chk_owned_not_ignored exists in backend/src/db/schema.sql (should exist from Phase 1)
- [ ] T044 [US3] Verify auto_unignore_owned_albums trigger exists in backend/src/db/schema.sql (should exist from Phase 1)
- [ ] T045 [US3] Add business rule validation in AlbumRepository.setIgnored() in backend/src/repositories/AlbumRepository.ts (throw error if owned)
- [ ] T046 [US3] Add 403 error handling in PATCH /albums/:id endpoint in backend/src/api/routes/albums.ts (CANNOT_IGNORE_OWNED code)
- [ ] T047 [US3] Hide Ignore button for owned albums in frontend/src/components/albums/AlbumCard.vue (conditional rendering)
- [ ] T048 [US3] Run backend tests to verify T039-T040 now pass
- [ ] T049 [US3] Run E2E test to verify T041 passes

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T050 [P] Update Collection Overview statistics to exclude ignored albums in relevant frontend components
- [ ] T051 [P] Update Artist Card album counts to exclude ignored albums in relevant frontend components
- [ ] T052 [P] Add error handling and user feedback for API failures in frontend/src/views/ArtistDetailPage.vue (toast/notification)
- [ ] T053 Run full test suite (npm run test in backend/, frontend/, and npm run test:e2e)
- [ ] T054 Verify test coverage ≥80% using vitest coverage report (npm run test:coverage in backend/)
- [ ] T055 Run linting (npm run lint) and fix any issues
- [ ] T056 Run TypeScript type checking (npm run typecheck) and fix any errors
- [ ] T057 Manual testing per quickstart.md validation checklist
- [ ] T058 Performance testing (verify <2s updates, <1s toggle, <100ms API responses)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational (Phase 2) completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user stories (Phase 3-5) being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies (uses US1 infrastructure but independently testable)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - No dependencies (enforces rules on US1 functionality but independently testable)

### Within Each User Story

1. **Tests FIRST** (TDD): Write all tests for the story, verify they FAIL
2. **Models/Repository** before **Services/API**
3. **Backend** before **Frontend** (API must exist for frontend to call)
4. **Core implementation** before **integration**
5. **Story complete** before moving to next priority

### Parallel Opportunities

**Phase 1: Setup**
- T002, T003, T004 can run in parallel (different files)

**Phase 2: Foundational Tests**
- T005, T006 can run in parallel (different test files)

**Phase 3: User Story 1 Tests**
- T011, T012, T013, T014, T015 can run in parallel (different test files/test cases)

**Phase 3: User Story 1 Backend Implementation**
- T017, T018, T019 can run in parallel (same file but different methods)
- T024, T025 can run in parallel (different methods in api.ts)

**Phase 3: User Story 1 Frontend Implementation**
- T023, T024, T025 can run in parallel (different files)

**After Foundational (Phase 2) Complete**
- User Story 1 (Phase 3), User Story 2 (Phase 4), and User Story 3 (Phase 5) can ALL run in parallel by different team members

**Phase 6: Polish**
- T050, T051 can run in parallel (different components)

---

## Parallel Example: User Story 1 Backend Tests

```bash
# Launch all backend tests for User Story 1 together:
Task: "Write AlbumRepository.setIgnored() unit test in backend/tests/unit/repositories/AlbumRepository.test.ts"
Task: "Write AlbumRepository.findByArtistId() filter test in backend/tests/unit/repositories/AlbumRepository.test.ts"
Task: "Write AlbumRepository.countByArtist() exclusion test in backend/tests/unit/repositories/AlbumRepository.test.ts"
Task: "Write PATCH /albums/:id contract test in backend/tests/integration/api/albums.test.ts"
Task: "Write GET /artists/:id/albums contract test in backend/tests/integration/api/albums.test.ts"
```

## Parallel Example: User Story 1 Backend Implementation

```bash
# Launch all repository methods for User Story 1 together:
Task: "Implement AlbumRepository.setIgnored() method in backend/src/repositories/AlbumRepository.ts"
Task: "Update AlbumRepository.findByArtistId() with includeIgnored parameter in backend/src/repositories/AlbumRepository.ts"
Task: "Update AlbumRepository.countByArtist() to exclude ignored albums in backend/src/repositories/AlbumRepository.ts"
```

## Parallel Example: Multiple User Stories

```bash
# After Foundational (Phase 2) is complete, launch all user stories in parallel:
Task: "User Story 1 - Mark Album as Ignored (Phase 3)"
Task: "User Story 2 - View and Manage Ignored Albums (Phase 4)"
Task: "User Story 3 - Prevent Ignoring Owned Albums (Phase 5)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004) → Schema and types ready
2. Complete Phase 2: Foundational (T005-T010) → CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T011-T030) → Core ignore functionality
4. **STOP and VALIDATE**: Test User Story 1 independently using acceptance scenarios
5. Deploy/demo if ready → Users can now ignore albums and clean up their collection view

### Incremental Delivery

1. **Setup + Foundational** (T001-T010) → Foundation ready
2. **Add User Story 1** (T011-T030) → Test independently → Deploy/Demo (MVP! Users can ignore albums)
3. **Add User Story 2** (T031-T038) → Test independently → Deploy/Demo (Users can manage ignored albums)
4. **Add User Story 3** (T039-T049) → Test independently → Deploy/Demo (Safety feature prevents errors)
5. **Polish** (T050-T058) → Final quality pass → Production ready
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (T001-T010)
2. **Once Foundational is done**:
   - Developer A: User Story 1 (T011-T030) - Core ignore functionality
   - Developer B: User Story 2 (T031-T038) - Toggle and un-ignore UI
   - Developer C: User Story 3 (T039-T049) - Safety validations
3. Stories complete and integrate independently
4. **Team completes Polish together** (T050-T058)

---

## Task Summary

- **Total Tasks**: 58 tasks
- **Setup Phase**: 4 tasks
- **Foundational Phase**: 6 tasks
- **User Story 1 (P1)**: 20 tasks (MVP scope)
- **User Story 2 (P2)**: 8 tasks
- **User Story 3 (P3)**: 11 tasks
- **Polish Phase**: 9 tasks

**Parallel Opportunities Identified**: 15 tasks can run in parallel (marked with [P])

**Independent Test Criteria**:
- **US1**: Mark unowned album as ignored → verify hidden from view and excluded from statistics
- **US2**: Toggle "Show Ignored Albums" → verify ignored albums appear with indicators → un-ignore → verify restored
- **US3**: Attempt to ignore owned album → verify action blocked with appropriate feedback

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only) = 30 tasks
- Delivers core value: users can clean up their collection view by ignoring unwanted albums
- Estimated time: 8-13 hours (per quickstart.md)

---

## Notes

- **TDD Approach**: All tests are written BEFORE implementation (per constitution Principle II)
- **[P] tasks**: Different files or methods, no dependencies, can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **Always verify tests fail before implementing** (red → green → refactor)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Constitution compliance**: 80% test coverage required, all gates passed in plan.md
