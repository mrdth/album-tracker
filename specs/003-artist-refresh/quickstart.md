# Quickstart Guide: Artist Data Refresh

**Feature**: Artist Data Refresh  
**Date**: 2025-11-30  
**For**: Developers implementing this feature

## Overview

This guide provides a quick reference for implementing the artist refresh feature. Read this first, then refer to detailed artifacts (research.md, data-model.md, contracts/) as needed.

## What You're Building

A feature that lets users:
1. **Manually refresh** an artist's albums from MusicBrainz via a button on the artist detail page
2. **See "last checked" timestamp** showing when artist data was last refreshed
3. **Auto-refresh stale artists** via an endpoint that refreshes artists with data >7 days old

## Key Files to Create/Modify

### Backend

**NEW Files**:
```
backend/src/services/ArtistRefreshService.ts   # Core refresh logic
backend/src/utils/dateFormat.ts                 # Timestamp formatting
backend/tests/unit/services/ArtistRefreshService.test.ts
backend/tests/unit/utils/dateFormat.test.ts
backend/tests/integration/api/artists-refresh.test.ts
```

**MODIFY Files**:
```
backend/src/api/routes/artists.ts               # Add refresh endpoints
backend/src/repositories/ArtistRepository.ts    # Add findOldest() method
```

### Frontend

**NEW Files**:
```
frontend/src/components/RefreshButton.vue       # Reusable refresh button
frontend/src/composables/useArtistRefresh.ts   # Refresh logic composable
frontend/src/utils/dateFormat.ts                # Timestamp formatting
frontend/tests/components/RefreshButton.test.ts
```

**MODIFY Files**:
```
frontend/src/components/ArtistDetailHeader.vue  # Add refresh button & timestamp
```

**E2E Tests**:
```
e2e/artist-refresh.spec.ts                      # Complete refresh flow test
```

## Implementation Checklist

### Phase 1: Backend Foundation (TDD)

- [ ] **Write failing tests** for ArtistRefreshService
- [ ] **Implement ArtistRepository.findOldest()**
  ```typescript
  findOldest(): Artist | null {
    const stmt = this.db.prepare(`
      SELECT * FROM Artist ORDER BY updated_at ASC LIMIT 1
    `);
    return stmt.get() as Artist | null;
  }
  ```

- [ ] **Create ArtistRefreshService**
  - Constructor: Inject MusicBrainzService, ArtistRepo, AlbumRepo
  - Method: `refreshArtist(artistId: number): RefreshResult`
  - Method: `checkStaleArtists(): StaleCheckResult`
  - Track in-flight refreshes in Set to prevent concurrent refreshes

- [ ] **Create dateFormat utility**
  ```typescript
  export function formatRelativeTime(timestamp: string): string {
    // "today at 2:30 PM"
    // "yesterday at 10:00 AM"  
    // "Nov 15, 2025 at 3:45 PM"
  }
  ```

### Phase 2: API Endpoints (Contract Tests)

- [ ] **Write contract tests** for endpoints (use OpenAPI contracts)
- [ ] **Add POST /api/artists/:artistId/refresh**
  - Validate artistId is positive integer
  - Call ArtistRefreshService.refreshArtist()
  - Return { success, albums_added, updated_at }
  - Handle errors (404, 409, 503)

- [ ] **Add GET /api/artists/stale-check**
  - Call ArtistRefreshService.checkStaleArtists()
  - Return refresh_needed + artist info + results

### Phase 3: Frontend Components (TDD)

- [ ] **Write tests** for RefreshButton component
- [ ] **Create RefreshButton.vue**
  - Props: artistId, isLoading
  - Emits: refresh
  - Shows loading spinner when isLoading=true
  - Disabled during refresh

- [ ] **Create useArtistRefresh.ts composable**
  ```typescript
  export function useArtistRefresh(artistId: number) {
    const isRefreshing = ref(false)
    const error = ref<string | null>(null)
    
    async function refresh() {
      // POST to /api/artists/:artistId/refresh
      // Handle loading, success, errors
    }
    
    return { isRefreshing, error, refresh }
  }
  ```

- [ ] **Create frontend dateFormat utility**
  - Mirror backend implementation
  - Use for displaying "last checked" timestamp

### Phase 4: Integration (E2E Tests)

- [ ] **Modify ArtistDetailHeader.vue**
  - Import RefreshButton and useArtistRefresh
  - Display artist.updated_at using formatRelativeTime()
  - Wire up refresh button

- [ ] **Write E2E test**
  - Navigate to artist detail page
  - Verify "last checked" timestamp displays
  - Click refresh button
  - Wait for loading to complete
  - Verify new albums appear (if any)
  - Verify timestamp updated

## Code Patterns to Follow

### Service Layer Pattern

```typescript
// ArtistRefreshService.ts
export class ArtistRefreshService {
  private activeRefreshes = new Set<number>()
  
  constructor(
    private musicBrainz: MusicBrainzService,
    private artistRepo: ArtistRepository,
    private albumRepo: AlbumRepository
  ) {}
  
  async refreshArtist(artistId: number): Promise<RefreshResult> {
    // 1. Check if refresh already in progress
    if (this.activeRefreshes.has(artistId)) {
      throw new Error('Refresh already in progress')
    }
    
    try {
      this.activeRefreshes.add(artistId)
      
      // 2. Validate artist exists
      const artist = this.artistRepo.findById(artistId)
      if (!artist) throw new Error('Artist not found')
      
      // 3. Fetch albums from MusicBrainz
      const apiAlbums = await this.musicBrainz.fetchReleaseGroups(artist.mbid)
      
      // 4. Get existing albums
      const existingAlbums = this.albumRepo.findByArtistId(artistId)
      const existingMbids = new Set(existingAlbums.map(a => a.mbid))
      
      // 5. Filter to only new albums
      const newAlbums = apiAlbums.filter(a => !existingMbids.has(a.mbid))
      
      // 6. Insert new albums
      if (newAlbums.length > 0) {
        const albumsToCreate = newAlbums.map(a => ({
          artist_id: artistId,
          mbid: a.mbid,
          title: a.title,
          // ... map other fields
        }))
        this.albumRepo.bulkCreate(albumsToCreate)
      }
      
      // 7. Update artist to trigger updated_at
      const updated = this.artistRepo.update(artistId, {})
      
      return {
        success: true,
        albums_added: newAlbums.length,
        updated_at: updated.updated_at
      }
    } finally {
      this.activeRefreshes.delete(artistId)
    }
  }
}
```

### Vue Composable Pattern

```typescript
// useArtistRefresh.ts
import { ref } from 'vue'

export function useArtistRefresh(artistId: number) {
  const isRefreshing = ref(false)
  const error = ref<string | null>(null)
  const lastRefresh = ref<string | null>(null)
  
  async function refresh() {
    isRefreshing.value = true
    error.value = null
    
    try {
      const response = await fetch(`/api/artists/${artistId}/refresh`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Refresh failed')
      }
      
      const result = await response.json()
      lastRefresh.value = result.updated_at
      
      return result
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      isRefreshing.value = false
    }
  }
  
  return { isRefreshing, error, lastRefresh, refresh }
}
```

## Testing Strategy

### Unit Tests

**ArtistRefreshService**:
- ✅ Prevents concurrent refreshes for same artist
- ✅ Throws error if artist not found
- ✅ Filters out duplicate albums by MBID
- ✅ Returns correct albums_added count
- ✅ Updates artist.updated_at timestamp

**dateFormat**:
- ✅ Returns "today at [time]" for same day
- ✅ Returns "yesterday at [time]" for previous day
- ✅ Returns "[date] at [time]" for older dates
- ✅ Handles edge cases (midnight, timezone, invalid input)

### Integration Tests

**POST /api/artists/:artistId/refresh**:
- ✅ Returns 404 if artist doesn't exist
- ✅ Returns 200 with albums_added count
- ✅ Actually adds new albums to database
- ✅ Updates artist.updated_at timestamp
- ✅ Returns 409 if refresh already in progress
- ✅ Handles MusicBrainz API errors gracefully

**GET /api/artists/stale-check**:
- ✅ Returns refresh_needed=false if no artists exist
- ✅ Returns refresh_needed=false if all artists fresh (<7 days)
- ✅ Returns refresh_needed=true and triggers refresh if stale artist found
- ✅ Includes artist info and refresh results in response

### E2E Tests

**Artist Refresh Flow**:
1. Import artist with known albums
2. Navigate to artist detail page
3. Verify "last checked" timestamp shows creation date
4. Click refresh button
5. Verify loading spinner appears
6. Wait for completion
7. Verify timestamp updated to current time
8. Manually add album to MusicBrainz (mock)
9. Refresh again
10. Verify new album appears in list

## Common Pitfalls to Avoid

❌ **Don't**: Call MusicBrainz API without rate limiting  
✅ **Do**: Use existing MusicBrainzService (handles rate limiting automatically)

❌ **Don't**: Let duplicate albums slip through  
✅ **Do**: Filter by MBID before insertion + rely on DB unique constraint as safety net

❌ **Don't**: Expose raw API errors to users  
✅ **Do**: Catch and transform into user-friendly messages

❌ **Don't**: Forget to update artist.updated_at  
✅ **Do**: Call ArtistRepository.update() to trigger timestamp (DB trigger handles it)

❌ **Don't**: Allow concurrent refreshes for same artist  
✅ **Do**: Track in-flight refreshes in Set and reject duplicates

## Performance Expectations

- **Refresh time**: <10 seconds for artists with <100 albums
- **API calls**: 1 per refresh (fetchReleaseGroups fetches all albums)
- **Rate limiting**: Automatic via MusicBrainzService (1 req/sec default)
- **Database queries**: 3 per refresh (find artist, find albums, insert new albums)

## Next Steps After Implementation

1. Run full test suite: `npm test`
2. Run linter: `npm run lint`
3. Manual testing in dev environment
4. Update CLAUDE.md if new technologies added
5. Create PR for review
6. After merge, consider:
   - Adding background job for automatic stale checks
   - Caching MusicBrainz responses
   - Progress indication for large refreshes

## Questions?

Refer to:
- **research.md** - Detailed research and decisions
- **data-model.md** - Database interactions and queries
- **contracts/** - API specifications
- **Constitution** - Code quality and testing requirements
