# Quickstart: Ignored Albums Implementation

**Feature**: 004-ignored-albums  
**Branch**: `004-ignored-albums`  
**Date**: 2025-12-14

## Overview

This guide provides a step-by-step implementation path for the ignored albums feature. Follow these steps in order to implement the feature according to the design artifacts (research.md, data-model.md, contracts/albums-api.yaml).

---

## Prerequisites

- Feature branch `004-ignored-albums` checked out
- Development environment running (Node.js 20.19.0, npm workspaces)
- All design artifacts reviewed (research.md, data-model.md, contracts/)
- Understanding of TDD workflow (tests first, then implementation)

---

## Implementation Phases

### Phase 1: Database Layer (Backend)

**Duration**: ~1-2 hours  
**Test-First**: Yes (unit tests for migration)

#### 1.1 Update Database Schema

**File**: `backend/src/db/schema.sql`

**Changes**:
1. Add `is_ignored INTEGER NOT NULL DEFAULT 0` column to Album table (after `is_manual_override`)
2. Add CHECK constraint: `CONSTRAINT chk_is_ignored CHECK (is_ignored IN (0, 1))`
3. Add business rule constraint: `CONSTRAINT chk_owned_not_ignored CHECK (ownership_status != 'Owned' OR is_ignored = 0)`
4. Add partial index: `CREATE INDEX IF NOT EXISTS idx_album_ignored ON Album(artist_id, is_ignored) WHERE is_ignored = 1;`
5. Add trigger for auto-clear:

```sql
CREATE TRIGGER IF NOT EXISTS auto_unignore_owned_albums
AFTER UPDATE OF ownership_status ON Album
FOR EACH ROW
WHEN NEW.ownership_status = 'Owned' AND NEW.is_ignored = 1
BEGIN
  UPDATE Album SET is_ignored = 0 WHERE id = NEW.id;
END;
```

**Verification**: Run `sqlite3 album-tracker.db < backend/src/db/schema.sql` on a test database to ensure syntax is valid.

#### 1.2 Add Database Migration

**File**: `backend/src/db/connection.ts`

**Changes**: Add to `runMigrations()` function:

```typescript
// Migration: Add is_ignored column to Album table
const albumColumns = database.pragma('table_info(Album)') as Array<{ name: string }>;
const hasIsIgnored = albumColumns.some(col => col.name === 'is_ignored');

if (!hasIsIgnored) {
  database.exec('ALTER TABLE Album ADD COLUMN is_ignored INTEGER NOT NULL DEFAULT 0');
  console.log('[DB] Migration: Added is_ignored column to Album table');
}
```

**Test**: Write integration test to verify migration runs successfully and is idempotent (can run multiple times without error).

**Test File**: `backend/tests/integration/db/migration.test.ts` (create if doesn't exist)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../../src/db/connection';

describe('is_ignored migration', () => {
  it('should add is_ignored column to Album table', () => {
    const db = new Database(':memory:');
    // Create old schema without is_ignored
    db.exec('CREATE TABLE Album (id INTEGER PRIMARY KEY, title TEXT)');
    
    runMigrations(db);
    
    const columns = db.pragma('table_info(Album)') as Array<{ name: string }>;
    expect(columns.some(col => col.name === 'is_ignored')).toBe(true);
  });
  
  it('should be idempotent (safe to run multiple times)', () => {
    const db = new Database(':memory:');
    db.exec('CREATE TABLE Album (id INTEGER PRIMARY KEY, title TEXT)');
    
    expect(() => {
      runMigrations(db);
      runMigrations(db); // Run twice
    }).not.toThrow();
  });
});
```

---

### Phase 2: Type Definitions (Shared)

**Duration**: ~15 minutes  
**Test-First**: No (types don't need tests)

#### 2.1 Update Album Interface

**File**: `shared/types/index.ts`

**Changes**: Add `is_ignored: boolean;` to Album interface (after `is_manual_override`)

```typescript
export interface Album {
  id: number;
  artist_id: number;
  mbid: string;
  title: string;
  release_year: number | null;
  release_date: string | null;
  disambiguation: string | null;
  ownership_status: "Owned" | "Missing" | "Ambiguous";
  matched_folder_path: string | null;
  match_confidence: number | null;
  is_manual_override: boolean;
  is_ignored: boolean;  // NEW
  created_at: string;
  updated_at: string;
}
```

**Verification**: Run `npm run typecheck` in all workspaces to ensure no type errors.

---

### Phase 3: Model Layer (Backend)

**Duration**: ~30 minutes  
**Test-First**: Yes (unit tests for model)

#### 3.1 Update Album Model

**File**: `backend/src/models/Album.ts`

**Changes**: Add `is_ignored` property to AlbumModel class

```typescript
export class AlbumModel implements Album {
  // ... existing fields ...
  is_ignored: boolean;

  constructor(data: Album) {
    // ... existing assignments ...
    this.is_ignored = data.is_ignored;
  }
}
```

**Test File**: `backend/tests/unit/models/Album.test.ts`

**Changes**: Add test for `is_ignored` field

```typescript
it('should initialize is_ignored field', () => {
  const album = new AlbumModel({
    // ... existing fields ...
    is_ignored: true,
  });
  expect(album.is_ignored).toBe(true);
});

it('should default is_ignored to false for new albums', () => {
  const album = new AlbumModel({
    // ... existing fields ...
    is_ignored: false,
  });
  expect(album.is_ignored).toBe(false);
});
```

---

### Phase 4: Repository Layer (Backend)

**Duration**: ~1-2 hours  
**Test-First**: Yes (unit tests for repository methods)

#### 4.1 Add setIgnored Method

**File**: `backend/src/repositories/AlbumRepository.ts`

**Test File**: `backend/tests/unit/repositories/AlbumRepository.test.ts`

**Test-First**: Write tests BEFORE implementation:

```typescript
describe('AlbumRepository.setIgnored', () => {
  it('should set album as ignored', () => {
    // Create a Missing album
    const album = AlbumRepository.create({ /* ... */ ownership_status: 'Missing' });
    
    const updated = AlbumRepository.setIgnored(album.id, true);
    
    expect(updated.is_ignored).toBe(true);
  });
  
  it('should un-ignore an ignored album', () => {
    const album = AlbumRepository.create({ /* ... */ is_ignored: true });
    
    const updated = AlbumRepository.setIgnored(album.id, false);
    
    expect(updated.is_ignored).toBe(false);
  });
  
  it('should throw error when ignoring owned album', () => {
    const album = AlbumRepository.create({ /* ... */ ownership_status: 'Owned' });
    
    expect(() => AlbumRepository.setIgnored(album.id, true))
      .toThrow('Cannot ignore owned albums');
  });
  
  it('should throw error when album not found', () => {
    expect(() => AlbumRepository.setIgnored(9999, true))
      .toThrow('Album not found');
  });
});
```

**Implementation**:

```typescript
static setIgnored(id: number, ignored: boolean): AlbumModel {
  const album = this.findById(id);
  
  if (!album) {
    throw new Error('Album not found');
  }
  
  if (ignored && album.ownership_status === 'Owned') {
    throw new Error('Cannot ignore owned albums');
  }
  
  const db = getDatabase();
  const stmt = db.prepare('UPDATE Album SET is_ignored = ? WHERE id = ?');
  stmt.run(ignored ? 1 : 0, id);
  
  return this.findById(id)!;
}
```

#### 4.2 Update findByArtistId to Filter Ignored

**Test**:

```typescript
describe('AlbumRepository.findByArtistId', () => {
  it('should exclude ignored albums by default', () => {
    const artist = ArtistRepository.create({ /* ... */ });
    AlbumRepository.create({ artist_id: artist.id, is_ignored: false });
    AlbumRepository.create({ artist_id: artist.id, is_ignored: true });
    
    const albums = AlbumRepository.findByArtistId(artist.id);
    
    expect(albums).toHaveLength(1);
    expect(albums[0].is_ignored).toBe(false);
  });
  
  it('should include ignored albums when includeIgnored=true', () => {
    const artist = ArtistRepository.create({ /* ... */ });
    AlbumRepository.create({ artist_id: artist.id, is_ignored: false });
    AlbumRepository.create({ artist_id: artist.id, is_ignored: true });
    
    const albums = AlbumRepository.findByArtistId(artist.id, true);
    
    expect(albums).toHaveLength(2);
  });
});
```

**Implementation**: Modify signature and add WHERE clause:

```typescript
static findByArtistId(artistId: number, includeIgnored = false): AlbumModel[] {
  const db = getDatabase();
  
  const whereClause = includeIgnored 
    ? 'WHERE artist_id = ?' 
    : 'WHERE artist_id = ? AND is_ignored = 0';

  const rows = db
    .prepare(`SELECT * FROM Album ${whereClause} ORDER BY release_year ASC, title COLLATE NOCASE`)
    .all(artistId) as Album[];

  return rows.map(row => new AlbumModel({
    ...row,
    is_manual_override: Boolean(row.is_manual_override),
    is_ignored: Boolean(row.is_ignored)  // Convert INTEGER to boolean
  }));
}
```

#### 4.3 Update countByArtist to Exclude Ignored

**Test**:

```typescript
describe('AlbumRepository.countByArtist', () => {
  it('should exclude ignored albums from counts', () => {
    const artist = ArtistRepository.create({ /* ... */ });
    AlbumRepository.create({ artist_id: artist.id, ownership_status: 'Owned', is_ignored: false });
    AlbumRepository.create({ artist_id: artist.id, ownership_status: 'Missing', is_ignored: false });
    AlbumRepository.create({ artist_id: artist.id, ownership_status: 'Missing', is_ignored: true });
    
    const counts = AlbumRepository.countByArtist(artist.id);
    
    expect(counts.total).toBe(2); // Excludes ignored
    expect(counts.owned).toBe(1);
  });
});
```

**Implementation**: Add `AND is_ignored = 0` to WHERE clause:

```typescript
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

---

### Phase 5: API Layer (Backend)

**Duration**: ~1-2 hours  
**Test-First**: Yes (integration/contract tests)

#### 5.1 Update PATCH /albums/:id Endpoint

**File**: `backend/src/api/routes/albums.ts`

**Test File**: `backend/tests/integration/api/albums.test.ts`

**Test-First**:

```typescript
describe('PATCH /api/albums/:id', () => {
  describe('is_ignored field', () => {
    it('should ignore a Missing album', async () => {
      const album = await createTestAlbum({ ownership_status: 'Missing' });
      
      const response = await request(app)
        .patch(`/api/albums/${album.id}`)
        .send({ is_ignored: true })
        .expect(200);
      
      expect(response.body.is_ignored).toBe(true);
    });
    
    it('should un-ignore an ignored album', async () => {
      const album = await createTestAlbum({ is_ignored: true });
      
      const response = await request(app)
        .patch(`/api/albums/${album.id}`)
        .send({ is_ignored: false })
        .expect(200);
      
      expect(response.body.is_ignored).toBe(false);
    });
    
    it('should return 403 when attempting to ignore Owned album', async () => {
      const album = await createTestAlbum({ ownership_status: 'Owned' });
      
      const response = await request(app)
        .patch(`/api/albums/${album.id}`)
        .send({ is_ignored: true })
        .expect(403);
      
      expect(response.body.code).toBe('CANNOT_IGNORE_OWNED');
    });
    
    it('should return 400 when is_ignored is not a boolean', async () => {
      const album = await createTestAlbum({});
      
      const response = await request(app)
        .patch(`/api/albums/${album.id}`)
        .send({ is_ignored: 'not-a-boolean' })
        .expect(400);
      
      expect(response.body.code).toBe('INVALID_FIELD_TYPE');
    });
  });
});
```

**Implementation**: Add `is_ignored` handling to existing PATCH endpoint:

```typescript
router.patch(
  '/:albumId',
  validateParams({ /* ... */ }),
  validateBody({
    is_ignored: {
      type: 'boolean',
      required: false,
    },
    // ... existing fields
  }),
  asyncHandler(async (req, res) => {
    const albumId = parseInt(req.params.albumId, 10);
    const album = AlbumRepository.findById(albumId);
    
    if (!album) {
      throw createApiError('Album not found', 404, 'ALBUM_NOT_FOUND');
    }

    // Handle is_ignored update
    if (req.body.is_ignored !== undefined) {
      if (req.body.is_ignored === true && album.ownership_status === 'Owned') {
        throw createApiError(
          'Cannot ignore owned albums',
          403,
          'CANNOT_IGNORE_OWNED'
        );
      }

      const updatedAlbum = AlbumRepository.setIgnored(albumId, req.body.is_ignored);
      return res.json(updatedAlbum);
    }

    // ... handle other fields (existing code)
  })
);
```

#### 5.2 Update GET /artists/:id/albums Endpoint

**Test**:

```typescript
describe('GET /api/artists/:id/albums', () => {
  it('should exclude ignored albums by default', async () => {
    const artist = await createTestArtist({});
    await createTestAlbum({ artist_id: artist.id, is_ignored: false });
    await createTestAlbum({ artist_id: artist.id, is_ignored: true });
    
    const response = await request(app)
      .get(`/api/artists/${artist.id}/albums`)
      .expect(200);
    
    expect(response.body).toHaveLength(1);
    expect(response.body[0].is_ignored).toBe(false);
  });
  
  it('should include ignored albums when includeIgnored=true', async () => {
    const artist = await createTestArtist({});
    await createTestAlbum({ artist_id: artist.id, is_ignored: false });
    await createTestAlbum({ artist_id: artist.id, is_ignored: true });
    
    const response = await request(app)
      .get(`/api/artists/${artist.id}/albums?includeIgnored=true`)
      .expect(200);
    
    expect(response.body).toHaveLength(2);
  });
});
```

**Implementation**: Pass query param to repository:

```typescript
router.get(
  '/artists/:artistId/albums',
  asyncHandler(async (req, res) => {
    const artistId = parseInt(req.params.artistId, 10);
    const includeIgnored = req.query.includeIgnored === 'true';
    
    const albums = AlbumRepository.findByArtistId(artistId, includeIgnored);
    
    res.json(albums);
  })
);
```

---

### Phase 6: Frontend Composables

**Duration**: ~1 hour  
**Test-First**: Optional (composables can be tested with component tests)

#### 6.1 Create useAlbumFilter Composable

**File**: `frontend/src/composables/useAlbumFilter.ts` (NEW)

**Implementation**:

```typescript
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Album } from '../../../shared/types/index.js'

export function useAlbumFilter() {
  const route = useRoute()
  const router = useRouter()

  const showIgnored = ref<boolean>(route.query.showIgnored === 'true')

  const updateShowIgnored = (value: boolean) => {
    showIgnored.value = value
    
    router.replace({
      query: {
        ...route.query,
        showIgnored: value ? 'true' : undefined,
      },
    })
  }

  watch(
    () => route.query.showIgnored,
    (newValue) => {
      showIgnored.value = newValue === 'true'
    }
  )

  return {
    showIgnored,
    updateShowIgnored,
  }
}
```

#### 6.2 Update API Client

**File**: `frontend/src/services/api.ts`

**Changes**: Add methods for ignore/un-ignore:

```typescript
async ignoreAlbum(albumId: number): Promise<Album> {
  const response = await fetch(`${this.baseUrl}/albums/${albumId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_ignored: true }),
  });
  
  if (!response.ok) {
    throw await this.handleError(response);
  }
  
  return response.json();
}

async unignoreAlbum(albumId: number): Promise<Album> {
  const response = await fetch(`${this.baseUrl}/albums/${albumId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_ignored: false }),
  });
  
  if (!response.ok) {
    throw await this.handleError(response);
  }
  
  return response.json();
}
```

---

### Phase 7: Frontend Components

**Duration**: ~2-3 hours  
**Test-First**: Optional (E2E tests will cover functionality)

#### 7.1 Update AlbumCard Component

**File**: `frontend/src/components/albums/AlbumCard.vue`

**Changes**:
1. Add visual indicators for ignored albums (opacity, strikethrough, badge)
2. Add "Ignore" button for non-owned albums
3. Add "Un-ignore" button for ignored albums

**Key changes**:

```vue
<template>
  <div 
    :class="[
      'card hover:shadow-lg transition-shadow',
      album.is_ignored && 'opacity-60'
    ]"
  >
    <!-- Title with strikethrough if ignored -->
    <h3 
      :class="[
        'text-lg font-semibold',
        album.is_ignored ? 'text-gray-500 line-through' : 'text-gray-900'
      ]"
    >
      {{ album.title }}
    </h3>
    
    <!-- Ignored badge -->
    <span
      v-if="album.is_ignored"
      class="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600"
    >
      Ignored
    </span>
    
    <!-- Action buttons -->
    <button
      v-if="!album.is_ignored && album.ownership_status !== 'Owned'"
      @click="$emit('ignore', album.id)"
      class="btn btn-secondary"
    >
      Ignore
    </button>
    
    <button
      v-if="album.is_ignored"
      @click="$emit('unignore', album.id)"
      class="btn btn-primary"
    >
      Un-ignore
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Album } from '../../../../shared/types/index.js'

defineProps<{
  album: Album
}>()

defineEmits<{
  ignore: [albumId: number]
  unignore: [albumId: number]
}>()
</script>
```

#### 7.2 Update ArtistDetail Page

**File**: `frontend/src/views/ArtistDetailPage.vue`

**Changes**:
1. Import useAlbumFilter composable
2. Add toggle switch UI
3. Filter albums based on showIgnored state
4. Handle ignore/unignore events

**Key changes**:

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAlbumFilter } from '../composables/useAlbumFilter'
import api from '../services/api'

const albums = ref<Album[]>([])
const { showIgnored, updateShowIgnored } = useAlbumFilter()

const displayedAlbums = computed(() => {
  if (showIgnored.value) {
    return albums.value
  }
  return albums.value.filter(album => !album.is_ignored)
})

async function handleIgnore(albumId: number) {
  try {
    const updated = await api.ignoreAlbum(albumId)
    // Update local state
    const index = albums.value.findIndex(a => a.id === albumId)
    if (index !== -1) {
      albums.value[index] = updated
    }
  } catch (error) {
    console.error('Failed to ignore album:', error)
    // Show error toast/notification
  }
}

async function handleUnignore(albumId: number) {
  try {
    const updated = await api.unignoreAlbum(albumId)
    const index = albums.value.findIndex(a => a.id === albumId)
    if (index !== -1) {
      albums.value[index] = updated
    }
  } catch (error) {
    console.error('Failed to un-ignore album:', error)
  }
}
</script>

<template>
  <!-- Toggle control -->
  <div class="mb-6 flex items-center justify-between p-4 bg-white rounded-lg shadow">
    <div>
      <h3 class="text-sm font-medium">Display Options</h3>
      <p class="text-xs text-gray-500">
        {{ showIgnored ? 'Showing all albums' : 'Hiding ignored albums' }}
      </p>
    </div>
    
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
  </div>
  
  <!-- Album grid -->
  <AlbumGrid
    :albums="displayedAlbums"
    @ignore="handleIgnore"
    @unignore="handleUnignore"
  />
</template>
```

---

### Phase 8: End-to-End Tests

**Duration**: ~1-2 hours  
**Test-First**: Write E2E tests after implementation (verify complete workflow)

**File**: `e2e/ignore-albums.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test'

test.describe('Ignored Albums', () => {
  test('should mark album as ignored and hide it from view', async ({ page }) => {
    await page.goto('/artists/1')
    
    // Find a Missing album
    const albumCard = page.locator('[data-testid="album-card"]').first()
    const albumTitle = await albumCard.locator('[data-testid="album-title"]').textContent()
    
    // Click Ignore button
    await albumCard.locator('button:has-text("Ignore")').click()
    
    // Album should disappear from default view
    await expect(page.locator(`text=${albumTitle}`)).not.toBeVisible()
    
    // Toggle "Show Ignored Albums"
    await page.locator('button[role="switch"]').click()
    
    // Album should reappear with "Ignored" badge
    const ignoredAlbum = page.locator(`text=${albumTitle}`).locator('..')
    await expect(ignoredAlbum).toBeVisible()
    await expect(ignoredAlbum.locator('text=Ignored')).toBeVisible()
  })
  
  test('should prevent ignoring owned albums', async ({ page }) => {
    await page.goto('/artists/1')
    
    // Find an Owned album (should not have Ignore button)
    const ownedAlbum = page.locator('[data-testid="ownership-status"]:has-text("Owned")').locator('..')
    await expect(ownedAlbum.locator('button:has-text("Ignore")')).not.toBeVisible()
  })
  
  test('should un-ignore an album', async ({ page }) => {
    await page.goto('/artists/1')
    
    // Toggle to show ignored albums
    await page.locator('button[role="switch"]').click()
    
    // Find an ignored album
    const ignoredAlbum = page.locator('text=Ignored').locator('..').first()
    const albumTitle = await ignoredAlbum.locator('[data-testid="album-title"]').textContent()
    
    // Click Un-ignore
    await ignoredAlbum.locator('button:has-text("Un-ignore")').click()
    
    // Toggle back to normal view
    await page.locator('button[role="switch"]').click()
    
    // Album should be visible in normal view
    await expect(page.locator(`text=${albumTitle}`)).toBeVisible()
  })
  
  test('should exclude ignored albums from statistics', async ({ page }) => {
    await page.goto('/collection')
    
    // Get current count for an artist
    const artistCard = page.locator('[data-testid="artist-card"]').first()
    const initialCount = await artistCard.locator('[data-testid="album-count"]').textContent()
    
    // Navigate to artist detail
    await artistCard.click()
    
    // Ignore an album
    await page.locator('button:has-text("Ignore")').first().click()
    
    // Go back to collection
    await page.goto('/collection')
    
    // Count should be decreased by 1
    const newCount = await artistCard.locator('[data-testid="album-count"]').textContent()
    expect(newCount).not.toBe(initialCount)
  })
})
```

---

## Verification Checklist

After completing all phases, verify:

- [ ] All unit tests pass (`npm run test` in backend)
- [ ] All integration tests pass
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] Code coverage ≥80% for new code
- [ ] TypeScript compilation succeeds (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Manual testing complete:
  - [ ] Mark Missing album as ignored → disappears from view
  - [ ] Toggle "Show Ignored Albums" → ignored album reappears with badge
  - [ ] Un-ignore album → restores to normal view
  - [ ] Attempt to ignore Owned album → error message shown
  - [ ] Rescan filesystem with owned album → ignored status cleared
  - [ ] Artist refresh → ignored status persists for existing albums
  - [ ] Collection statistics exclude ignored albums
- [ ] Performance targets met:
  - [ ] Album state update <2s
  - [ ] Toggle view <1s
  - [ ] API response <100ms

---

## Common Issues & Solutions

### Issue: Migration doesn't run on existing database

**Solution**: Ensure `runMigrations()` is called in `getDatabase()` function in connection.ts. Check console for migration log messages.

### Issue: is_ignored shows as INTEGER (0/1) instead of boolean

**Solution**: Convert in repository layer when mapping rows to AlbumModel:
```typescript
is_ignored: Boolean(row.is_ignored)
```

### Issue: Trigger doesn't auto-clear ignored status

**Solution**: Ensure trigger is created in schema.sql. For existing databases, manually create trigger:
```sql
sqlite3 album-tracker.db < backend/src/db/schema.sql
```

### Issue: Frontend shows stale data after ignore/un-ignore

**Solution**: Update local state immediately after API call:
```typescript
const updated = await api.ignoreAlbum(albumId)
albums.value = albums.value.map(a => a.id === albumId ? updated : a)
```

### Issue: Toggle state doesn't persist across navigation

**Solution**: Verify `useAlbumFilter()` uses `route.query.showIgnored` and `router.replace()` correctly.

---

## Next Steps

After completing implementation and verification:

1. Run `/speckit.tasks` to generate dependency-ordered tasks for tracking
2. Create pull request with all changes
3. Request code review
4. Update CLAUDE.md with any new patterns or decisions
5. Merge to main branch after approval

---

## Estimated Total Time

- Database Layer: 1-2 hours
- Type Definitions: 15 minutes
- Model Layer: 30 minutes
- Repository Layer: 1-2 hours
- API Layer: 1-2 hours
- Frontend Composables: 1 hour
- Frontend Components: 2-3 hours
- E2E Tests: 1-2 hours

**Total: 8-13 hours** (1-2 developer days)
