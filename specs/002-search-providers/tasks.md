# Tasks: Search Providers for Missing Albums

**Input**: Design documents from `/specs/002-search-providers/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/search-providers-api.yaml

**Tests**: Per the constitution, this feature requires comprehensive testing (TDD approach). Tests are included and must be written FIRST.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a web application with monorepo structure:
- Backend: `backend/src/`, `backend/tests/`
- Frontend: `frontend/src/`, `frontend/tests/`
- Shared: `shared/types/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration and shared type definitions needed by all user stories

- [x] T001 Run database migration to add search_providers column to Settings table per data-model.md
- [x] T002 [P] Add SearchProvider interface to shared/types/index.ts with fields: id, name, urlTemplate, createdAt, updatedAt
- [x] T003 [P] Extend Settings interface in shared/types/index.ts to include search_providers: SearchProvider[] field

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and repository layer that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create URL template utility in backend/src/utils/urlTemplate.ts with buildSearchUrl() and validateUrlTemplate() functions
- [x] T005 [P] Write unit tests for urlTemplate.ts in backend/tests/unit/urlTemplate.test.ts (verify encoding, placeholder replacement, validation)
- [x] T006 Create SearchProvider model class in backend/src/models/SearchProvider.ts with validation methods
- [x] T007 [P] Write unit tests for SearchProvider model in backend/tests/unit/SearchProvider.test.ts (verify validation rules)
- [x] T008 Extend SettingsRepository in backend/src/repositories/SettingsRepository.ts with methods: getSearchProviders(), createSearchProvider(), updateSearchProvider(), deleteSearchProvider()
- [x] T009 [P] Write integration tests for SettingsRepository search provider methods in backend/tests/integration/SettingsRepository.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Configure Search Providers (Priority: P1) 🎯 MVP

**Goal**: Users can add, edit, and delete search providers via the settings page. Providers persist across sessions.

**Independent Test**: Navigate to settings page, add a provider with name "Discogs" and URL template "https://www.discogs.com/search/?q={artist}+{album}", verify it appears in the list, edit the name, delete it, refresh page and verify changes persisted.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US1] Contract test for GET /api/settings/search-providers in backend/tests/integration/api/searchProvidersApi.test.ts
- [x] T011 [P] [US1] Contract test for POST /api/settings/search-providers in backend/tests/integration/api/searchProvidersApi.test.ts
- [x] T012 [P] [US1] Contract test for PUT /api/settings/search-providers/:id in backend/tests/integration/api/searchProvidersApi.test.ts
- [x] T013 [P] [US1] Contract test for DELETE /api/settings/search-providers/:id in backend/tests/integration/api/searchProvidersApi.test.ts
- [x] T014 [P] [US1] Integration test for full CRUD flow in backend/tests/integration/api/searchProvidersApi.test.ts

### Implementation for User Story 1

- [x] T015 [US1] Create SearchProviderService in backend/src/services/SearchProviderService.ts with business logic for CRUD operations and validation
- [x] T016 [US1] Create search provider routes in backend/src/api/routes/searchProvidersRoutes.ts implementing GET, POST, PUT, DELETE endpoints per contracts/search-providers-api.yaml
- [x] T017 [US1] Register search provider routes in backend/src/api/routes/settings.ts
- [x] T018 [P] [US1] Create searchProviderService API client in frontend/src/services/searchProviderService.ts with methods: list(), create(), update(), delete()
- [x] T019 [P] [US1] Create useSearchProviders composable in frontend/src/composables/useSearchProviders.ts with state management and CRUD methods
- [x] T020 [US1] Create SearchProvidersList component in frontend/src/components/settings/SearchProvidersList.vue with add/edit/delete UI
- [x] T021 [US1] Integrate SearchProvidersList component into frontend/src/pages/SettingsPage.vue
- [ ] T022 [P] [US1] Write unit tests for SearchProvidersList component in frontend/tests/unit/SearchProvidersList.test.ts
- [ ] T023 [P] [US1] Write E2E test for provider management flow in frontend/tests/e2e/searchProviders.spec.ts (add → edit → delete → persist)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can manage search providers via settings page and they persist across sessions

---

## Phase 4: User Story 2 - Search for Missing Albums (Priority: P2)

**Goal**: Users see a search dropdown on missing album cards and can click providers to open search URLs in new tabs.

**Independent Test**: Configure at least one provider in settings, navigate to an artist page with missing albums, verify search dropdown appears on missing album cards only, click a provider and verify new tab opens with correctly formatted URL containing encoded artist/album names.

### Tests for User Story 2 ⚠️

- [ ] T024 [P] [US2] Unit test for AlbumCard search dropdown rendering in frontend/tests/unit/AlbumCard.test.ts (verify shows for missing, hides for owned)
- [ ] T025 [P] [US2] Unit test for URL building logic in AlbumCard in frontend/tests/unit/AlbumCard.test.ts (verify placeholder replacement)
- [ ] T026 [P] [US2] Integration test for search dropdown integration in frontend/tests/integration/albumSearch.test.ts

### Implementation for User Story 2

- [x] T027 [US2] Extend AlbumCard component in frontend/src/components/artist/AlbumCard.vue to import useSearchProviders composable
- [x] T028 [US2] Add buildSearchUrl function to AlbumCard component for client-side URL construction
- [x] T029 [US2] Add search dropdown UI to AlbumCard component (button + dropdown menu) with conditional rendering for missing albums and when providers exist
- [x] T030 [US2] Implement dropdown click handlers to open search URLs in new tabs with window.open(url, '_blank', 'noopener,noreferrer')
- [ ] T031 [P] [US2] Write E2E test for search flow in frontend/tests/e2e/searchProviders.spec.ts (configure provider → view missing album → click search → verify URL)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can configure providers and search for missing albums

---

## Phase 5: User Story 3 - Handle Special Characters in Search (Priority: P3)

**Goal**: Search URLs correctly encode special characters (accents, slashes, ampersands) for international artists and album titles.

**Independent Test**: Configure a provider, create test albums with artist "Beyoncé" and "AC/DC", verify search URLs contain proper encoding (Beyonc%C3%A9, AC%2FDC).

### Tests for User Story 3 ⚠️

- [ ] T032 [P] [US3] Unit test for special character encoding in backend/tests/unit/urlTemplate.test.ts (test cases: é, /, &, spaces, etc.)
- [ ] T033 [P] [US3] E2E test for special character handling in frontend/tests/e2e/searchProviders.spec.ts (create albums with special chars → verify URLs)

### Implementation for User Story 3

- [ ] T034 [US3] Verify encodeURIComponent() is used in backend/src/utils/urlTemplate.ts buildSearchUrl() function (should already be correct per research.md)
- [ ] T035 [US3] Verify encodeURIComponent() is used in frontend AlbumCard buildSearchUrl() function (should already be correct per implementation in T028)
- [ ] T036 [US3] Add additional test cases for edge cases: empty values, multiple occurrences, nested braces

**Checkpoint**: All user stories should now be independently functional with robust encoding support

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [ ] T037 [P] Add validation error messages to SearchProvidersList component for better UX (empty name, invalid URL, etc.)
- [ ] T038 [P] Add loading states to SearchProvidersList component during API calls
- [ ] T039 [P] Add close-on-click-outside behavior to AlbumCard search dropdown
- [ ] T040 [P] Add keyboard navigation support (Escape to close) to search dropdown
- [ ] T041 [P] Verify dropdown scrolling works correctly with 20+ providers per SC-006
- [ ] T042 [P] Run performance validation: settings UI response <100ms, dropdown render <50ms, URL generation <10ms
- [ ] T043 [P] Verify all linting and formatting checks pass (npm run lint)
- [ ] T044 [P] Run full test suite and verify all tests pass (npm test)
- [ ] T045 Code review against constitution checklist (code quality, maintainability, security)
- [ ] T046 [P] Update documentation if new patterns introduced (check if CLAUDE.md needs manual additions)
- [ ] T047 Validate against quickstart.md scenarios (test all curl examples, frontend integration steps)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Phase 2 - No dependencies on other stories
  - User Story 2 (P2): Can start after Phase 2 - Depends on Phase 3 for provider configuration, but independently testable with manually configured providers
  - User Story 3 (P3): Can start after Phase 2 - Enhances US1/US2 but is independently testable with encoding validation
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - pure CRUD for provider management
- **User Story 2 (P2)**: Logically depends on US1 for provider configuration, but can be implemented and tested independently (tests can manually create providers)
- **User Story 3 (P3)**: Enhances US1 and US2 with robust encoding, but can be tested independently with unit tests

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Backend service layer before API routes
3. API routes before frontend services
4. Frontend services/composables before components
5. Core implementation before integration
6. Unit tests before integration tests before E2E tests
7. Story complete before moving to next priority

### Parallel Opportunities

- **Setup (Phase 1)**: T002 and T003 can run in parallel (different files)
- **Foundational (Phase 2)**: T005, T007, T009 can run in parallel (different test files)
- **User Story 1**: 
  - Tests T010-T014 can all run in parallel (different test suites)
  - T018 and T019 can run in parallel (backend service done, frontend work independent)
  - T022 and T023 can run in parallel (different test types)
- **User Story 2**:
  - Tests T024-T026 can run in parallel
- **User Story 3**:
  - Tests T032-T033 can run in parallel
- **Polish (Phase 6)**: T037-T044, T046-T047 can all run in parallel (independent improvements)

---

## Parallel Example: User Story 1

```bash
# After foundational phase, launch all contract tests together:
Task: "Contract test for GET /api/settings/search-providers"
Task: "Contract test for POST /api/settings/search-providers"
Task: "Contract test for PUT /api/settings/search-providers/:id"
Task: "Contract test for DELETE /api/settings/search-providers/:id"

# After backend API is implemented, launch frontend work in parallel:
Task: "Create searchProviderService API client in frontend/src/services/"
Task: "Create useSearchProviders composable in frontend/src/composables/"

# After components implemented, launch final tests in parallel:
Task: "Unit tests for SearchProvidersList component"
Task: "E2E test for provider management flow"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003) - ~30 minutes
2. Complete Phase 2: Foundational (T004-T009) - ~2 hours
3. Complete Phase 3: User Story 1 (T010-T023) - ~4 hours
4. **STOP and VALIDATE**: Test provider management independently
5. Deploy/demo if ready - users can now configure search providers

**MVP Scope**: Just provider management (add/edit/delete in settings). This is independently valuable as it allows users to set up their tools even before searching.

### Incremental Delivery

1. **Foundation** (Phase 1-2): Setup + utilities/repository → ~2.5 hours
2. **MVP** (Phase 3): Add provider management → ~4 hours → Deploy/Demo
3. **Search Feature** (Phase 4): Add album search dropdown → ~3 hours → Deploy/Demo
4. **Robustness** (Phase 5): Add encoding edge cases → ~2 hours → Deploy/Demo
5. **Polish** (Phase 6): UX improvements and validation → ~2 hours → Final Release

Total estimated time: ~13-15 hours for complete feature

### Parallel Team Strategy

With 2-3 developers:

1. **Together**: Complete Setup + Foundational (Phase 1-2)
2. **Once Foundational is done**:
   - Developer A: User Story 1 (Backend: T010-T017)
   - Developer B: User Story 1 (Frontend: T018-T023)
   - Developer C: User Story 2 (T024-T031, can start in parallel)
3. **After US1 complete**: Developer A moves to US3, all stories integrate independently
4. **Polish**: All developers can work on different polish tasks in parallel

---

## Notes

- **[P] tasks**: Different files, no dependencies - safe to parallelize
- **[Story] labels**: Map tasks to user stories for traceability and independent testing
- **TDD Approach**: All tests written first per constitution requirement
- **Independent Stories**: Each user story can be tested and deployed independently
- **Encoding**: Should work correctly from US2 implementation, US3 adds robustness/edge cases
- **Validation**: Constitution gates checked in Phase 6 before merge
- **Performance**: Targets verified in T042 (settings <100ms, dropdown <50ms, URL gen <10ms)

### Commit Strategy

- Commit after each foundational task (T001-T009)
- Commit after all tests for a story are written (and fail)
- Commit after each story implementation is complete
- Commit after each polish task
- Use conventional commit format: `feat(search): implement provider management (US1)`

### Testing Verification

Before marking any story complete:
- [ ] All tests for that story pass
- [ ] Story can be demonstrated independently
- [ ] No regressions in previous stories
- [ ] Constitution checklist items verified

### Risk Mitigation

- **Database Migration**: T001 is critical - test on dev database first
- **JSON Parsing**: T008-T009 must handle corrupt JSON gracefully (per data-model.md)
- **URL Validation**: T004-T005 must block dangerous protocols (javascript:, data:, file:)
- **XSS Prevention**: T029-T030 must use proper target="_blank" with noopener,noreferrer
