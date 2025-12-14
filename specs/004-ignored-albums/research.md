# Research: Ignored Albums Feature

**Feature**: 004-ignored-albums  
**Date**: 2025-12-14  
**Status**: Phase 0 Complete

## Purpose

This document captures research findings and technical decisions for implementing the ignored albums feature. All "NEEDS CLARIFICATION" items from the Technical Context have been resolved through research of best practices and analysis of the existing codebase.

---

## 1. Database Schema Design

### Decision: Boolean Column `is_ignored`

Add a boolean column to the Album table rather than extending the `ownership_status` enum.

### Rationale:

- **Separation of Concerns**: `ownership_status` represents physical possession ('Owned', 'Missing', 'Ambiguous'), while `is_ignored` represents user preference/visibility - fundamentally different dimensions
- **Business Rule Independence**: The rule "owned albums can't be ignored" creates a constraint relationship between the two fields, which is cleaner to express as separate columns with CHECK constraints
- **Query Simplicity**: Statistics queries use `SUM(CASE WHEN ownership_status = 'Owned'...)` patterns; adding ignored to the enum would break these
- **Flexibility**: Allows independent filtering ("show ignored albums" vs "show missing albums" vs "show ignored missing albums")
- **Consistency**: Matches existing pattern in codebase - `is_manual_override` is already a boolean column

### Alternatives Considered:

- **Extending ownership_status enum**: Rejected because it conflates ownership state with visibility preference and would create awkward values like "IgnoredOwned"
- **Separate ignored_status enum**: Rejected because a simple on/off toggle doesn't need enum complexity

### Implementation:

```sql
-- Add to Album table in schema.sql
is_ignored INTEGER NOT NULL DEFAULT 0,

-- Add CHECK constraint
CONSTRAINT chk_is_ignored CHECK (is_ignored IN (0, 1)),
CONSTRAINT chk_owned_not_ignored CHECK (ownership_status != 'Owned' OR is_ignored = 0)
```

---

## 2. Database Indexing Strategy

### Decision: Partial Index on Ignored Albums

Create a partial index that only indexes albums where `is_ignored = 1`.

### Rationale:

- **Skewed Distribution**: Most albums will NOT be ignored (is_ignored=0), with only a small subset ignored (is_ignored=1)
- **Query Optimization**: The partial index efficiently supports the "show only ignored albums" query when users toggle the view
- **Storage Efficiency**: Smaller index size improves cache performance
- **Common Access Pattern**: Default view filters OUT ignored albums (`WHERE is_ignored = 0`), which doesn't need an index; toggle view shows ignored albums (`WHERE is_ignored = 1`), which benefits from the partial index

### Alternatives Considered:

- **Full composite index on (artist_id, is_ignored)**: Would work but wastes space indexing the common case (is_ignored=0)
- **No index**: Would work for small datasets but degrades as collection grows

### Implementation:

```sql
-- Partial index for efficient "show ignored albums" filtering
CREATE INDEX IF NOT EXISTS idx_album_ignored ON Album(artist_id, is_ignored) 
WHERE is_ignored = 1;
```

Note: If usage patterns show ~30-40% of albums are ignored, benchmark and consider switching to a full composite index.

---

## 3. Business Rule Enforcement

### Decision: Hybrid Approach - Database Constraint + Trigger + Application Logic

Implement the "owned albums can't be ignored" rule at three layers.

### Rationale:

- **Defense in Depth**: Database constraints prevent data corruption from any source (direct SQL, bugs, future features)
- **Automatic Behavior**: Triggers implement auto-clear logic transparently when ownership changes
- **User Experience**: Application validation provides immediate, user-friendly error messages
- **Existing Pattern**: Codebase already uses this layered approach for `chk_owned_has_path` constraint

### Implementation:

**Layer 1: Database CHECK Constraint**
```sql
CONSTRAINT chk_owned_not_ignored CHECK (ownership_status != 'Owned' OR is_ignored = 0)
```
Prevents ANY code path from violating the rule.

**Layer 2: Database Trigger (Auto-Clear)**
```sql
CREATE TRIGGER IF NOT EXISTS auto_unignore_owned_albums
AFTER UPDATE OF ownership_status ON Album
FOR EACH ROW
WHEN NEW.ownership_status = 'Owned' AND NEW.is_ignored = 1
BEGIN
  UPDATE Album SET is_ignored = 0 WHERE id = NEW.id;
END;
```
Implements FR-013: automatically clears ignored status when albums become owned.

**Layer 3: Application Validation**
```typescript
// In AlbumRepository.setIgnored()
if (ignored && album.ownership_status === 'Owned') {
  throw new Error('Cannot ignore owned albums');
}
```
Provides user-friendly validation before database operation.

### Alternatives Considered:

- **Application-only validation**: Rejected because it's vulnerable to bugs, direct database access, and future code changes
- **Database-only constraints**: Rejected because users would see cryptic SQLite error messages instead of helpful feedback

---

## 4. Database Migration Strategy

### Decision: In-Code Migration in `connection.ts`

Add migration logic to the existing `runMigrations()` function using `PRAGMA table_info()` for idempotency.

### Rationale:

- **Consistency**: Matches existing migration pattern in codebase (`last_scan_at`, `max_api_retries` columns)
- **Zero Dependencies**: No need for external migration libraries
- **Automatic Execution**: Runs on application startup
- **Idempotent**: Uses `PRAGMA table_info()` to check if migration already applied
- **Test Compatibility**: Works with in-memory test databases

### Implementation:

```typescript
// Add to runMigrations() in backend/src/db/connection.ts
function runMigrations(database: Database.Database): void {
  // ... existing migrations ...

  // Migration: Add is_ignored column to Album table
  const albumColumns = database.pragma('table_info(Album)') as Array<{ name: string }>;
  const hasIsIgnored = albumColumns.some(col => col.name === 'is_ignored');
  
  if (!hasIsIgnored) {
    database.exec('ALTER TABLE Album ADD COLUMN is_ignored INTEGER NOT NULL DEFAULT 0');
    console.log('[DB] Migration: Added is_ignored column to Album table');
  }
}
```

**Important**: SQLite's `ALTER TABLE` cannot add CHECK constraints or triggers. These must be added to `schema.sql` and will apply to:
- New database installations
- Test databases using schema.sql
- The migration code adds the column; triggers/constraints are enforced by application logic until schema is recreated

### Alternatives Considered:

- **External migration library (better-sqlite3-migrations)**: Rejected because it adds dependency for minimal benefit
- **Manual SQL migration files**: Rejected because existing codebase uses programmatic migrations

---

## 5. REST API Design

### Decision: Single PATCH Endpoint with `is_ignored` Field

Use existing `PATCH /api/albums/:albumId` endpoint with new `is_ignored` boolean field.

### Rationale:

- **Consistency**: Endpoint already exists for album updates (ownership_status, matched_folder_path)
- **RESTful**: PATCH is standard for partial resource updates
- **Simplicity**: Single endpoint handles both ignore and un-ignore actions
- **Type Safety**: Boolean field is clear and self-documenting
- **Idempotent**: Setting `is_ignored = true` multiple times has same effect

### Request/Response:

**Request**: `PATCH /api/albums/:albumId`
```json
{
  "is_ignored": true
}
```

**Response**: `200 OK`
```json
{
  "id": 123,
  "artist_id": 45,
  "mbid": "abc-123-...",
  "title": "Album Name",
  "ownership_status": "Missing",
  "is_ignored": true,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-15T12:34:56Z"
}
```

### Error Responses:

| Status | Scenario | Response |
|--------|----------|----------|
| 200 OK | Successfully updated | Updated album object |
| 400 Bad Request | Invalid type/format | `{"error": "is_ignored must be a boolean", "code": "INVALID_FIELD_TYPE"}` |
| 403 Forbidden | Attempting to ignore owned album | `{"error": "Cannot ignore owned albums", "code": "CANNOT_IGNORE_OWNED"}` |
| 404 Not Found | Album doesn't exist | `{"error": "Album not found", "code": "ALBUM_NOT_FOUND"}` |

### Alternatives Considered:

- **Separate endpoints (PUT /albums/:id/ignored, DELETE /albums/:id/ignored)**: Rejected because it's inconsistent with existing architecture and over-engineered for a simple boolean toggle
- **POST /albums/:id/ignore and POST /albums/:id/unignore**: Rejected because PATCH is more RESTful for state updates

---

## 6. Frontend State Management

### Decision: URL Query Parameter for Toggle State

Store "Show Ignored Albums" toggle state in URL query parameter (`?showIgnored=true`).

### Rationale:

- **Persistence**: State survives page refreshes
- **Shareable**: Users can bookmark/share filtered views
- **Browser Integration**: Works with back/forward navigation
- **Per-Page State**: Each artist page can have independent filter state
- **No Backend**: No need to store user preferences server-side
- **Composable Pattern**: Fits existing architecture using Vue Router composables

### Implementation:

Create `/frontend/src/composables/useAlbumFilter.ts`:

```typescript
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export function useAlbumFilter() {
  const route = useRoute()
  const router = useRouter()

  // Initialize from URL query param (defaults to false)
  const showIgnored = ref<boolean>(route.query.showIgnored === 'true')

  // Sync toggle state to URL
  const updateShowIgnored = (value: boolean) => {
    showIgnored.value = value
    router.replace({
      query: {
        ...route.query,
        showIgnored: value ? 'true' : undefined, // Remove when false
      },
    })
  }

  // Watch route changes (browser back/forward)
  watch(
    () => route.query.showIgnored,
    (newValue) => { showIgnored.value = newValue === 'true' }
  )

  return { showIgnored, updateShowIgnored }
}
```

### Alternatives Considered:

- **Component-local ref**: Rejected because state is lost on navigation/refresh
- **localStorage**: Rejected because global persistence could be confusing (user forgets they enabled it weeks ago)
- **Vuex/Pinia**: Rejected because it adds unnecessary complexity for a simple boolean toggle

---

## 7. Reactive Filtering Pattern

### Decision: Computed Property for Filtering Albums

Use Vue 3 computed properties to reactively filter albums based on toggle state.

### Rationale:

- **Idiomatic Vue 3**: Computed properties are the recommended pattern for derived state
- **Automatic Reactivity**: Re-computes when dependencies change
- **Performance**: Built-in caching prevents unnecessary recalculations
- **Declarative**: Easier to reason about than watchers
- **Type Safety**: Full TypeScript support

### Implementation:

```typescript
// In ArtistDetailPage.vue
const { showIgnored } = useAlbumFilter()
const albums = ref<Album[]>([])

const displayedAlbums = computed(() => {
  if (showIgnored.value) {
    return albums.value // Show all
  }
  return albums.value.filter(album => !album.is_ignored)
})
```

### Alternatives Considered:

- **Watchers**: Rejected because computed properties are more declarative and performant
- **Manual array mutation**: Rejected because it breaks reactivity and is error-prone

---

## 8. UI/UX Patterns

### Decision A: Toggle Switch for Control

Use a Tailwind CSS toggle switch component for the "Show Ignored Albums" control.

### Rationale:

- **Visual Clarity**: Toggle switches communicate immediate on/off action better than checkboxes
- **Modern UX**: Industry standard for binary settings (iOS, Material Design)
- **Accessibility**: Supports `role="switch"` and `aria-checked` attributes
- **Tailwind Native**: No additional dependencies required

### Implementation:

```vue
<button
  type="button"
  role="switch"
  :aria-checked="showIgnored"
  @click="updateShowIgnored(!showIgnored)"
  :class="[
    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
    showIgnored ? 'bg-blue-600' : 'bg-gray-200'
  ]"
>
  <span class="sr-only">Show ignored albums</span>
  <span
    :class="[
      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
      showIgnored ? 'translate-x-6' : 'translate-x-1'
    ]"
  />
</button>
```

### Decision B: Multi-Cue Visual Indicator for Ignored Albums

Use combined visual indicators: reduced opacity + badge + strikethrough.

### Rationale:

- **Accessibility**: Multiple cues prevent reliance on color alone (WCAG best practice)
- **Clarity**: Users immediately understand which albums are ignored
- **Reversibility**: Clear visual feedback for un-ignore action
- **Consistency**: Badge pattern matches existing ownership status badges

### Implementation:

```vue
<div 
  :class="[
    'card hover:shadow-lg transition-shadow',
    album.is_ignored && 'opacity-60'
  ]"
>
  <h3 
    :class="[
      'text-lg font-semibold',
      album.is_ignored ? 'text-gray-500 line-through' : 'text-gray-900'
    ]"
  >
    {{ album.title }}
  </h3>
  
  <span
    v-if="album.is_ignored"
    class="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600"
  >
    Ignored
  </span>
</div>
```

### Alternatives Considered:

- **Opacity only**: Rejected because it's too subtle and not accessible
- **Badge only**: Rejected because it doesn't visually de-emphasize the album
- **Color change only**: Rejected because it fails accessibility (color-blind users)

---

## 9. Repository Pattern Updates

### Decision: Add Filtering Parameter to Existing Methods

Modify `AlbumRepository.findByArtistId()` to accept optional `includeIgnored` parameter.

### Rationale:

- **Backward Compatibility**: Default `includeIgnored = false` maintains current behavior
- **Single Responsibility**: Repository handles data access; composable handles UI filtering
- **Performance**: Filtering at database level is more efficient than post-query filtering for large datasets
- **Consistency**: Matches existing parameter pattern in other repository methods

### Implementation:

```typescript
// In AlbumRepository.ts
static findByArtistId(artistId: number, includeIgnored = false): AlbumModel[] {
  const db = getDatabase();
  
  const whereClause = includeIgnored 
    ? 'WHERE artist_id = ?' 
    : 'WHERE artist_id = ? AND is_ignored = 0';

  const rows = db
    .prepare(`SELECT * FROM Album ${whereClause} ORDER BY release_year ASC`)
    .all(artistId) as Album[];

  return rows.map(row => new AlbumModel({
    ...row,
    is_manual_override: Boolean(row.is_manual_override),
    is_ignored: Boolean(row.is_ignored)
  }));
}
```

### Alternatives Considered:

- **Separate method (findByArtistIdIncludingIgnored)**: Rejected because it duplicates code
- **Always fetch all, filter in application**: Rejected because it's less efficient

---

## 10. Statistics Calculation Updates

### Decision: Exclude Ignored Albums from All Statistics by Default

Update count queries to add `AND is_ignored = 0` condition.

### Rationale:

- **Spec Requirement**: FR-005 through FR-008 explicitly require exclusion from statistics
- **User Intent**: Ignored albums are conceptually "not part of the collection"
- **Accuracy**: Users want progress tracking based on albums they care about
- **Consistency**: Same filtering logic applies to all views (Collection Overview, Artist Cards, Artist Detail)

### Implementation:

```typescript
// In AlbumRepository.ts
static countByArtist(artistId: number): { total: number; owned: number } {
  const db = getDatabase();

  const row = db
    .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN ownership_status = 'Owned' THEN 1 ELSE 0 END) as owned
      FROM Album
      WHERE artist_id = ? AND is_ignored = 0
    `)
    .get(artistId) as { total: number; owned: number };

  return row;
}
```

Similar updates required in:
- `/backend/src/repositories/ArtistRepository.ts` (Collection Summary statistics)
- `/frontend/src/composables/useArtists.ts` (frontend aggregations if any)

---

## Implementation Summary

### Key Technologies Confirmed:

- **Backend**: TypeScript 5.9.3, Node.js 20.19.0, Express 5.1.0, better-sqlite3 12.4.6
- **Frontend**: Vue 3.5.25, vue-router 4.6.3, Tailwind CSS 4.1.17
- **Testing**: Vitest 4.0.14 (80% coverage), Playwright 1.57.0

### Architecture Decisions:

1. **Database**: Boolean `is_ignored` column with CHECK constraint and trigger
2. **API**: PATCH /api/albums/:id with `is_ignored` field
3. **Frontend State**: URL query parameter (`?showIgnored=true`)
4. **Filtering**: Computed properties with reactive refs
5. **UI**: Toggle switch + multi-cue visual indicators (opacity + badge + strikethrough)

### Performance Targets Validated:

- Album state updates <2s: Achievable (single UPDATE query)
- Toggle view <1s: Achievable (computed property with cached filtering)
- API responses <100ms: Achievable (indexed query on small dataset)

All technical unknowns have been resolved. Ready to proceed to Phase 1: Design & Contracts.
