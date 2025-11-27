# Data Model: Album Tracker

**Feature**: 001-album-tracker  
**Created**: 2025-11-27  
**Source**: [spec.md](./spec.md) - Key Entities section

## Overview

The Album Tracker data model supports tracking music collections through four core entities: Artist, Album, Settings, and ManualOverride. The model is designed for SQLite (better-sqlite3) with emphasis on:
- Read-heavy operations (collection overview, album grids)
- Manual override persistence across scans
- Efficient querying for ownership statistics
- MBID-based stable identity for sync/refresh operations

## Entities

### Artist

Represents a music artist imported from MusicBrainz with computed ownership statistics.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Internal database ID |
| mbid | TEXT | NOT NULL, UNIQUE | MusicBrainz artist ID (stable external identifier) |
| name | TEXT | NOT NULL | Artist display name |
| sort_name | TEXT | NULL | MusicBrainz sort name (e.g., "Beatles, The") |
| disambiguation | TEXT | NULL | Disambiguating text (e.g., "British rock band") |
| linked_folder_path | TEXT | NULL | User-selected artist folder (manual override) |
| created_at | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | ISO 8601 timestamp |
| updated_at | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | ISO 8601 timestamp |

**Computed Fields** (not stored, calculated at query time):
- `total_albums`: COUNT of related Album records
- `owned_albums`: COUNT of related Albums WHERE ownership_status = 'Owned'
- `completion_percentage`: (owned_albums / total_albums) * 100

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_artist_mbid ON Artist(mbid);
CREATE INDEX idx_artist_name ON Artist(name COLLATE NOCASE);
```

**Relationships**:
- **1:N** with Album (one artist has many albums)

**Validation Rules** (from FR-003, FR-017):
- `mbid` must be valid UUID format from MusicBrainz
- `linked_folder_path` if provided, must exist and be within library root
- `name` cannot be empty string

**State Transitions**:
- Initial import: `linked_folder_path` = NULL (automatic detection)
- User links folder: `linked_folder_path` = selected path (overrides automatic)
- User clears link: `linked_folder_path` = NULL (reverts to automatic)

**Example**:
```json
{
  "id": 1,
  "mbid": "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d",
  "name": "The Beatles",
  "sort_name": "Beatles, The",
  "disambiguation": "English rock band",
  "linked_folder_path": "/music/= B =/Beatles, The",
  "created_at": "2025-11-27T10:00:00Z",
  "updated_at": "2025-11-27T10:05:00Z",
  "total_albums": 13,
  "owned_albums": 10,
  "completion_percentage": 76.92
}
```

---

### Album

Represents a release-group of type "Album" belonging to an artist, with ownership tracking.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Internal database ID |
| artist_id | INTEGER | NOT NULL, FOREIGN KEY → Artist(id) ON DELETE CASCADE | Parent artist |
| mbid | TEXT | NOT NULL, UNIQUE | MusicBrainz release-group ID |
| title | TEXT | NOT NULL | Album title |
| release_year | INTEGER | NULL | First release year (extracted from release_date) |
| release_date | TEXT | NULL | ISO date from MusicBrainz (YYYY, YYYY-MM, or YYYY-MM-DD) |
| disambiguation | TEXT | NULL | Disambiguating text |
| ownership_status | TEXT | NOT NULL, DEFAULT 'Missing' | 'Owned', 'Missing', or 'Ambiguous' |
| matched_folder_path | TEXT | NULL | Filesystem path if matched (automatic or manual) |
| match_confidence | REAL | NULL, CHECK (match_confidence BETWEEN 0 AND 1) | String similarity score (0.0-1.0) |
| is_manual_override | INTEGER | NOT NULL, DEFAULT 0 | Boolean: 1 if manually set, 0 if automatic |
| created_at | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | ISO 8601 timestamp |
| updated_at | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | ISO 8601 timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_album_mbid ON Album(mbid);
CREATE INDEX idx_album_artist_id ON Album(artist_id);
CREATE INDEX idx_album_ownership ON Album(ownership_status);
CREATE INDEX idx_album_manual ON Album(is_manual_override);
```

**Relationships**:
- **N:1** with Artist (many albums belong to one artist)

**Validation Rules** (from FR-010, FR-014, FR-015, FR-016):
- `mbid` must be valid UUID format from MusicBrainz
- `ownership_status` must be one of: 'Owned', 'Missing', 'Ambiguous'
- `ownership_status` = 'Owned' requires `matched_folder_path` to be set
- `match_confidence` if automatic match: >=0.80 → 'Owned', <0.80 → 'Ambiguous'
- `is_manual_override` = 1 prevents automatic updates during rescan
- `matched_folder_path` if provided, must exist within artist folder or library root

**State Transitions**:
| Current State | Action | New State | Notes |
|---------------|--------|-----------|-------|
| Missing | Automatic scan finds match >=80% | Owned | `match_confidence` set, `is_manual_override` = 0 |
| Missing | Automatic scan finds match <80% | Ambiguous | `match_confidence` set, `is_manual_override` = 0 |
| Owned/Ambiguous | User manually selects folder | Owned | `is_manual_override` = 1, `matched_folder_path` set |
| Owned/Ambiguous | User toggles to Missing | Missing | `is_manual_override` = 1, `matched_folder_path` = NULL |
| Owned (manual) | Rescan runs | Owned (unchanged) | Manual overrides persist |
| Owned (automatic) | Rescan doesn't find folder | Missing | Automatic match removed |

**Example**:
```json
{
  "id": 42,
  "artist_id": 1,
  "mbid": "42c3e1d2-be17-4e0d-b10b-fc9e0be17e2c",
  "title": "Abbey Road",
  "release_year": 1969,
  "release_date": "1969-09-26",
  "disambiguation": null,
  "ownership_status": "Owned",
  "matched_folder_path": "/music/= B =/Beatles, The/[1969] Abbey Road",
  "match_confidence": 0.95,
  "is_manual_override": 0,
  "created_at": "2025-11-27T10:00:00Z",
  "updated_at": "2025-11-27T10:05:00Z"
}
```

---

### Settings

Application configuration with singleton pattern (only one row exists).

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, CHECK (id = 1) | Always 1 (singleton) |
| library_root_path | TEXT | NOT NULL | Filesystem root for music library |
| similarity_threshold | REAL | NOT NULL, DEFAULT 0.80, CHECK (similarity_threshold BETWEEN 0 AND 1) | Match confidence threshold (Owned vs Ambiguous) |
| api_rate_limit_ms | INTEGER | NOT NULL, DEFAULT 1000 | Milliseconds between MusicBrainz API calls |
| max_api_retries | INTEGER | NOT NULL, DEFAULT 3 | Max exponential backoff retry attempts |
| updated_at | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | ISO 8601 timestamp |

**Indexes**: None (single row table)

**Validation Rules** (from FR-005, FR-006, FR-022):
- `library_root_path` must exist and be readable before accepting
- `library_root_path` must be absolute path (not relative)
- `similarity_threshold` validated range: 0.0-1.0 (default 0.80 per clarifications)
- `api_rate_limit_ms` minimum: 500 (MusicBrainz requires ~1 req/sec)
- `max_api_retries` minimum: 1 (at least one retry)

**Singleton Enforcement**:
```sql
CREATE TRIGGER enforce_settings_singleton
BEFORE INSERT ON Settings
WHEN (SELECT COUNT(*) FROM Settings) >= 1
BEGIN
  SELECT RAISE(FAIL, 'Settings table can only have one row');
END;
```

**Example**:
```json
{
  "id": 1,
  "library_root_path": "/mnt/music",
  "similarity_threshold": 0.80,
  "api_rate_limit_ms": 1000,
  "max_api_retries": 3,
  "updated_at": "2025-11-27T10:00:00Z"
}
```

---

### FilesystemCache

In-memory or persisted cache of filesystem scan results for fast matching.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Internal database ID |
| folder_path | TEXT | NOT NULL, UNIQUE | Absolute filesystem path |
| folder_name | TEXT | NOT NULL | Base name (for display/matching) |
| parent_path | TEXT | NOT NULL | Parent directory (for tree navigation) |
| is_artist_folder | INTEGER | NOT NULL, DEFAULT 0 | Boolean: 1 if matches artist folder pattern |
| parsed_year | INTEGER | NULL | Extracted year from [YYYY] prefix (album folders only) |
| parsed_title | TEXT | NULL | Extracted title after [YYYY] (album folders only) |
| scanned_at | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | ISO 8601 timestamp of last scan |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_cache_folder_path ON FilesystemCache(folder_path);
CREATE INDEX idx_cache_parent ON FilesystemCache(parent_path);
CREATE INDEX idx_cache_artist ON FilesystemCache(is_artist_folder);
CREATE INDEX idx_cache_name ON FilesystemCache(folder_name COLLATE NOCASE);
```

**Lifecycle**:
- **Populated**: On application startup (full library scan)
- **Refreshed**: On user-triggered "Rescan" (full library re-scan)
- **Queried**: During artist import for automatic matching
- **Optional**: Can be in-memory only (not persisted to SQLite) for faster startup with large libraries

**Validation Rules** (from FR-007, FR-024):
- `folder_path` must be within `library_root_path` from Settings
- `parsed_year` extracted via regex: `/^\[(\d{4})\]/`
- `parsed_title` normalized: lowercase, punctuation removed, trimmed

**Example**:
```json
{
  "id": 100,
  "folder_path": "/mnt/music/= B =/Beatles, The/[1969] Abbey Road",
  "folder_name": "[1969] Abbey Road",
  "parent_path": "/mnt/music/= B =/Beatles, The",
  "is_artist_folder": 0,
  "parsed_year": 1969,
  "parsed_title": "abbey road",
  "scanned_at": "2025-11-27T09:00:00Z"
}
```

---

## Relationships Diagram

```
┌─────────────────┐
│    Settings     │  (Singleton)
└─────────────────┘
        
┌─────────────────┐
│FilesystemCache  │  (Scanned on startup)
└─────────────────┘
        
┌─────────────────┐           ┌─────────────────┐
│     Artist      │ 1 ───── N │      Album      │
│                 │           │                 │
│ - mbid (UK)     │           │ - mbid (UK)     │
│ - name          │           │ - title         │
│ - linked_folder │           │ - ownership     │
└─────────────────┘           │ - matched_folder│
                              │ - is_manual     │
                              └─────────────────┘
```

**Legend**: UK = UNIQUE KEY, 1:N = one-to-many relationship

---

## Query Patterns

### Collection Overview (User Story 3)
```sql
SELECT 
  a.id,
  a.name,
  a.disambiguation,
  COUNT(al.id) AS total_albums,
  SUM(CASE WHEN al.ownership_status = 'Owned' THEN 1 ELSE 0 END) AS owned_albums,
  CAST(SUM(CASE WHEN al.ownership_status = 'Owned' THEN 1 ELSE 0 END) AS REAL) / COUNT(al.id) * 100 AS completion_percentage
FROM Artist a
LEFT JOIN Album al ON al.artist_id = a.id
GROUP BY a.id
ORDER BY a.name COLLATE NOCASE;
```

### Artist Detail with Albums (User Story 4)
```sql
SELECT 
  id, title, release_year, ownership_status, matched_folder_path, is_manual_override
FROM Album
WHERE artist_id = ?
ORDER BY release_year ASC, title COLLATE NOCASE;
```

### Find Album Matches from Cache (Automatic Matching)
```sql
SELECT 
  fc.folder_path,
  fc.parsed_year,
  fc.parsed_title
FROM FilesystemCache fc
WHERE fc.parent_path = ? -- artist folder path
  AND fc.parsed_year IS NOT NULL -- album folder pattern
ORDER BY fc.parsed_year, fc.folder_name;
```

### Check Manual Overrides Before Update
```sql
UPDATE Album
SET 
  ownership_status = ?,
  matched_folder_path = ?,
  match_confidence = ?,
  updated_at = CURRENT_TIMESTAMP
WHERE id = ?
  AND is_manual_override = 0; -- Only update automatic matches
```

---

## Schema Migration Strategy

**Initial Schema** (V1):
- Create all tables with constraints
- Insert default Settings row
- Create indexes for performance

**Future Migrations**:
- Use migration tool (e.g., `better-sqlite3-helper` or custom)
- Version tracked in `schema_version` table
- Backward-compatible additions preferred (new columns nullable)
- Breaking changes require data migration script

**Example Migration File Structure**:
```
backend/src/db/migrations/
├── 001_initial_schema.sql
├── 002_add_album_type_filters.sql  (Future)
└── 003_add_artwork_urls.sql        (Future)
```

---

## Performance Considerations

### Expected Data Volumes (from Spec SC-005, SC-008)
- 100 artists max
- 1000+ albums total
- Single Settings row
- 10,000+ FilesystemCache entries (large libraries)

### Optimization Strategies
1. **Indexes**: Created on foreign keys, MBIDs, ownership status for fast queries
2. **Computed Fields**: Calculate stats at query time (minimal overhead with 1000 albums)
3. **Caching**: FilesystemCache pre-scanned on startup (avoid repeated file I/O)
4. **Batch Operations**: Use transactions for import (multiple album inserts)
5. **Pagination**: Not required at current scale (<1000 albums per artist unlikely)

### SQLite Configuration
```javascript
// backend/src/db/connection.ts
const db = new Database('album-tracker.db');
db.pragma('journal_mode = WAL'); // Write-Ahead Logging for concurrency
db.pragma('foreign_keys = ON');  // Enforce FK constraints
db.pragma('synchronous = NORMAL'); // Balance safety/performance
```

---

## Data Integrity Rules

### Cascading Deletes
- Deleting Artist → CASCADE deletes all Albums
- Deleting Settings → PREVENTED (singleton must exist)

### Orphan Prevention
- Albums require valid `artist_id` (FK constraint)
- Manual folder paths validated before insert/update

### Consistency Guarantees
- Manual overrides (`is_manual_override = 1`) never auto-updated
- Ownership status = 'Owned' requires `matched_folder_path`
- MBID uniqueness ensures no duplicate artists/albums
- Settings singleton ensures single source of truth for config

---

## TypeScript Interfaces

**Location**: `shared/types/index.ts`

```typescript
export interface Artist {
  id: number;
  mbid: string;
  name: string;
  sort_name: string | null;
  disambiguation: string | null;
  linked_folder_path: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  // Computed fields (not in DB)
  total_albums?: number;
  owned_albums?: number;
  completion_percentage?: number;
}

export interface Album {
  id: number;
  artist_id: number;
  mbid: string;
  title: string;
  release_year: number | null;
  release_date: string | null;
  disambiguation: string | null;
  ownership_status: 'Owned' | 'Missing' | 'Ambiguous';
  matched_folder_path: string | null;
  match_confidence: number | null; // 0.0-1.0
  is_manual_override: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface Settings {
  id: 1;
  library_root_path: string;
  similarity_threshold: number; // 0.0-1.0
  api_rate_limit_ms: number;
  max_api_retries: number;
  updated_at: string; // ISO 8601
}

export interface FilesystemCacheEntry {
  id: number;
  folder_path: string;
  folder_name: string;
  parent_path: string;
  is_artist_folder: boolean;
  parsed_year: number | null;
  parsed_title: string | null;
  scanned_at: string; // ISO 8601
}
```

---

## Test Data Fixtures

**Location**: `backend/tests/fixtures/test-data.sql`

Example fixture for integration tests:
```sql
-- Test artist
INSERT INTO Artist (id, mbid, name, sort_name, disambiguation) 
VALUES (1, 'test-mbid-001', 'Test Artist', 'Artist, Test', 'Test band');

-- Test albums (various states)
INSERT INTO Album (artist_id, mbid, title, release_year, ownership_status, is_manual_override)
VALUES 
  (1, 'album-001', 'Owned Album', 2020, 'Owned', 0),
  (1, 'album-002', 'Missing Album', 2021, 'Missing', 0),
  (1, 'album-003', 'Ambiguous Album', 2022, 'Ambiguous', 0),
  (1, 'album-004', 'Manual Override', 2023, 'Owned', 1);

-- Test settings
INSERT INTO Settings (id, library_root_path) 
VALUES (1, '/tmp/test-library');
```
