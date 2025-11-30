# Data Model: Artist Data Refresh

**Date**: 2025-11-30  
**Feature**: Artist Data Refresh  
**Status**: Complete

## Overview

This feature primarily works with existing entities (Artist, Album) and introduces no new database tables. The data model focuses on how existing entities are queried, updated, and related during the refresh operation.

## Existing Entities

### Artist

**Purpose**: Represents a music artist in the user's collection

**Schema** (from `backend/src/db/schema.sql`):
```sql
CREATE TABLE IF NOT EXISTS Artist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mbid TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_name TEXT,
  disambiguation TEXT,
  linked_folder_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  CONSTRAINT chk_mbid_format CHECK (length(mbid) = 36),
  CONSTRAINT chk_name_not_empty CHECK (length(trim(name)) > 0)
);
```

**Relevant Fields for This Feature**:
- `id`: Primary key, used to identify artist for refresh
- `mbid`: MusicBrainz ID, used to fetch albums from API
- `updated_at`: **KEY FIELD** - Timestamp of last refresh, used for:
  - Displaying "last checked" to users
  - Identifying stale artists (> 7 days old)
  - Updated automatically by database trigger on UPDATE

**TypeScript Model** (from `backend/src/models/Artist.ts`):
```typescript
export interface Artist {
  id: number;
  mbid: string;
  name: string;
  sort_name: string | null;
  disambiguation: string | null;
  linked_folder_path: string | null;
  created_at: string;  // ISO 8601 datetime
  updated_at: string;  // ISO 8601 datetime
}
```

**Operations for This Feature**:
- `findById(id)`: Retrieve artist for refresh validation
- `findOldest()`: NEW - Find artist with oldest updated_at for stale check
- `update(id, data)`: Update artist data (triggers updated_at refresh)

### Album

**Purpose**: Represents an album/release-group in the collection

**Schema** (relevant fields):
```sql
CREATE TABLE IF NOT EXISTS Album (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id INTEGER NOT NULL,
  mbid TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  release_year INTEGER,
  release_date TEXT,
  disambiguation TEXT,
  ownership_status TEXT NOT NULL DEFAULT 'Missing',
  -- ... other fields
  
  FOREIGN KEY (artist_id) REFERENCES Artist(id) ON DELETE CASCADE,
  CONSTRAINT chk_mbid_format CHECK (length(mbid) = 36)
);
```

**Relevant Fields for This Feature**:
- `artist_id`: Links album to artist being refreshed
- `mbid`: MusicBrainz ID, used to check for duplicates
- `title`, `release_date`, `disambiguation`: Data from MusicBrainz

**Operations for This Feature**:
- `findByArtistId(artistId)`: Get existing albums for duplicate check
- `bulkCreate(albums)`: Insert new albums discovered during refresh

## Data Flow

### Manual Refresh Flow

```
1. User clicks "Refresh" on Artist Detail page
   ↓
2. Frontend: POST /api/artists/:artistId/refresh
   ↓
3. Backend validates artistId exists
   ↓
4. Fetch artist.mbid from database
   ↓
5. Call MusicBrainzService.fetchReleaseGroups(mbid)
   ↓
6. MusicBrainz API returns AlbumResult[]
   ↓
7. Query existing albums: AlbumRepository.findByArtistId(artistId)
   ↓
8. Filter new albums: newAlbums = apiResults.filter(notInExisting)
   ↓
9. Insert new albums: AlbumRepository.bulkCreate(newAlbums)
   ↓
10. Trigger updated_at: ArtistRepository.update(artistId, {})
    ↓
11. Return: { albums_added: count, updated_at: timestamp }
```

### Stale Data Check Flow

```
1. Cron job / manual trigger calls GET /api/artists/stale-check
   ↓
2. Query: ArtistRepository.findOldest()
   ↓
3. Check if updated_at > 7 days ago
   ↓
4. If YES: Trigger refresh flow for that artist
   ↓
5. If NO: Return { refresh_needed: false }
```

## Data Validation Rules

### Artist Refresh

**Pre-Conditions**:
- Artist must exist in database (by ID)
- Artist must have valid MBID (36-character UUID)

**Post-Conditions**:
- `updated_at` timestamp is current
- No duplicate albums exist (enforced by MBID uniqueness)
- All new albums have valid release-group data

### Album Insertion

**Validation** (from existing AlbumModel):
- `mbid`: Must be 36-character UUID
- `title`: Must be non-empty
- `artist_id`: Must reference existing artist
- `release_year`: Extracted from `release_date` if available

**Duplicate Prevention**:
```typescript
// Pseudo-code for duplicate check
const existingAlbums = AlbumRepository.findByArtistId(artistId)
const existingMbids = new Set(existingAlbums.map(a => a.mbid))

const newAlbums = apiResults.filter(album => 
  !existingMbids.has(album.mbid)
)
```

## State Transitions

### Artist.updated_at State Machine

```
State: Never Refreshed
  - updated_at == created_at
  - Display: "Last checked: [creation date]"
  ↓
Trigger: Manual Refresh
  ↓
State: Recently Refreshed
  - updated_at > created_at
  - updated_at < 7 days ago
  - Display: "Last checked: today/yesterday/[date]"
  - Stale Check: No action
  ↓
Time passes (7+ days)
  ↓
State: Stale
  - updated_at > 7 days ago
  - Display: "Last checked: [date]" (old)
  - Stale Check: Triggers refresh
  ↓
Trigger: Automatic Stale Refresh
  ↓
State: Recently Refreshed (cycle repeats)
```

## Query Patterns

### Find Artist with Oldest Updated Timestamp

**SQL**:
```sql
SELECT * FROM Artist 
ORDER BY updated_at ASC 
LIMIT 1
```

**Repository Method** (NEW):
```typescript
// ArtistRepository.ts
findOldest(): Artist | null {
  const stmt = this.db.prepare(`
    SELECT * FROM Artist 
    ORDER BY updated_at ASC 
    LIMIT 1
  `);
  
  return stmt.get() as Artist | null;
}
```

### Check if Refresh Needed

**Application Logic**:
```typescript
function isStale(artist: Artist): boolean {
  const STALE_THRESHOLD_DAYS = 7;
  const updatedAt = new Date(artist.updated_at);
  const now = new Date();
  const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceUpdate > STALE_THRESHOLD_DAYS;
}
```

### Get Existing Albums for Duplicate Check

**SQL** (via AlbumRepository):
```sql
SELECT * FROM Album 
WHERE artist_id = ?
```

**Usage**:
```typescript
const existingAlbums = AlbumRepository.findByArtistId(artistId);
const existingMbids = new Set(existingAlbums.map(a => a.mbid));
```

## Performance Considerations

### Indexes

**Existing Indexes** (already optimal):
- `idx_artist_mbid`: UNIQUE index on Artist.mbid (fast lookup)
- `idx_album_mbid`: UNIQUE index on Album.mbid (duplicate prevention)
- `idx_album_artist_id`: Index on Album.artist_id (fast join)

**Potential Addition**:
```sql
-- If stale checks become frequent
CREATE INDEX IF NOT EXISTS idx_artist_updated_at 
ON Artist(updated_at ASC);
```
Status: **NOT REQUIRED FOR MVP** - Single oldest query is fast enough without index

### Batch Operations

**Album Insertion**:
- Use `AlbumRepository.bulkCreate()` for inserting multiple albums
- Single transaction for all inserts (existing behavior)
- Typical batch size: 10-100 albums per artist

**Rate Limiting**:
- MusicBrainz API: 1 request per second (enforced by MusicBrainzService)
- Single API call per refresh (fetchReleaseGroups returns all albums)

## Data Constraints Summary

| Constraint | Enforcement | Impact on Feature |
|------------|-------------|-------------------|
| Artist.mbid UNIQUE | Database | Prevents duplicate artist imports (existing) |
| Album.mbid UNIQUE | Database | Prevents duplicate albums during refresh |
| Album.artist_id FK | Database | Ensures albums link to valid artists |
| MBID format (36 chars) | Database CHECK | Validates MusicBrainz IDs |
| updated_at trigger | Database TRIGGER | Auto-updates timestamp on Artist changes |

## TypeScript Types

### Service Response Types

```typescript
// ArtistRefreshService.ts
export interface RefreshResult {
  success: boolean;
  albums_added: number;
  updated_at: string;  // ISO 8601 datetime
  message?: string;    // e.g., "No new albums found"
}

export interface StaleCheckResult {
  refresh_needed: boolean;
  artist?: {
    id: number;
    name: string;
    updated_at: string;
    days_since_update: number;
  };
  refresh_result?: RefreshResult;  // If refresh was triggered
}
```

### API Request/Response Types

```typescript
// POST /api/artists/:artistId/refresh
// Request: none (artistId in URL)
// Response:
{
  success: true,
  albums_added: 5,
  updated_at: "2025-11-30T14:23:45.000Z"
}

// GET /api/artists/stale-check
// Request: none
// Response (refresh triggered):
{
  refresh_needed: true,
  artist: {
    id: 42,
    name: "Pink Floyd",
    updated_at: "2025-11-15T10:00:00.000Z",
    days_since_update: 15
  },
  refresh_result: {
    success: true,
    albums_added: 2,
    updated_at: "2025-11-30T14:30:00.000Z"
  }
}

// Response (no refresh needed):
{
  refresh_needed: false
}
```

## Error Cases

### Data-Related Errors

| Error Condition | HTTP Status | Error Code | Handling |
|-----------------|-------------|------------|----------|
| Artist not found | 404 | ARTIST_NOT_FOUND | Validate ID before refresh |
| Invalid MBID format | 400 | INVALID_MBID | Should never occur (DB constraint) |
| MusicBrainz API error | 503 | EXTERNAL_API_ERROR | Retry with exponential backoff |
| Duplicate album MBID | 409 | DUPLICATE_ALBUM | Filter duplicates before insert |
| No new albums found | 200 | SUCCESS | Return success with message |

## Summary

This feature requires **no schema changes**. All data operations use existing tables with existing constraints. The key data interactions are:

1. **Read** Artist by ID and MBID
2. **Query** Artist by oldest updated_at
3. **Update** Artist to trigger updated_at timestamp
4. **Read** existing Albums by artist_id
5. **Insert** new Albums in batch
6. **Filter** duplicate Albums by MBID before insertion

The data model is simple, leveraging existing patterns and constraints for correctness and performance.
