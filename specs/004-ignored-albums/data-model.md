# Data Model: Ignored Albums

**Feature**: 004-ignored-albums  
**Date**: 2025-12-14  
**Status**: Phase 1

## Overview

This document defines the data model changes required to support the ignored albums feature. The primary change is adding an `is_ignored` boolean field to the Album entity to track user visibility preferences.

---

## Entity: Album (Modified)

The Album entity is extended with a new field to track ignored status.

### Fields

| Field | Type | Constraints | Description | Changes |
|-------|------|-------------|-------------|---------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique album identifier | NO CHANGE |
| artist_id | INTEGER | NOT NULL, FOREIGN KEY → Artist(id) | Reference to parent artist | NO CHANGE |
| mbid | TEXT | NOT NULL, UNIQUE | MusicBrainz release-group UUID | NO CHANGE |
| title | TEXT | NOT NULL | Album title | NO CHANGE |
| release_year | INTEGER | NULLABLE | Year extracted from release_date | NO CHANGE |
| release_date | TEXT | NULLABLE | ISO date (YYYY, YYYY-MM, YYYY-MM-DD) | NO CHANGE |
| disambiguation | TEXT | NULLABLE | Disambiguation text | NO CHANGE |
| ownership_status | TEXT | NOT NULL, CHECK IN ('Owned', 'Missing', 'Ambiguous') | Physical ownership state | NO CHANGE |
| matched_folder_path | TEXT | NULLABLE | Filesystem path if matched | NO CHANGE |
| match_confidence | REAL | NULLABLE, CHECK 0.0-1.0 | Similarity score for automatic matching | NO CHANGE |
| is_manual_override | INTEGER | NOT NULL, DEFAULT 0, CHECK IN (0, 1) | Manual vs automatic match flag | NO CHANGE |
| **is_ignored** | **INTEGER** | **NOT NULL, DEFAULT 0, CHECK IN (0, 1)** | **User visibility preference** | **NEW FIELD** |
| created_at | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | ISO 8601 creation timestamp | NO CHANGE |
| updated_at | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | ISO 8601 last update timestamp | NO CHANGE |

### New Field Details

**`is_ignored`**
- **Type**: INTEGER (SQLite boolean: 0 = false, 1 = true)
- **Default**: 0 (not ignored)
- **Purpose**: Tracks whether user has marked this album to be hidden from views and excluded from statistics
- **Business Rules**:
  - Can only be set to `1` (true) if `ownership_status != 'Owned'`
  - Automatically reset to `0` (false) when `ownership_status` changes to 'Owned'
  - Independent of `is_manual_override` (ignored status doesn't affect automatic matching)

---

## Constraints

### Existing Constraints (Unchanged)

```sql
CONSTRAINT pk_album PRIMARY KEY (id),
CONSTRAINT fk_album_artist FOREIGN KEY (artist_id) REFERENCES Artist(id) ON DELETE CASCADE,
CONSTRAINT uq_album_mbid UNIQUE (mbid),
CONSTRAINT chk_ownership_status CHECK (ownership_status IN ('Owned', 'Missing', 'Ambiguous')),
CONSTRAINT chk_match_confidence CHECK (match_confidence IS NULL OR (match_confidence >= 0.0 AND match_confidence <= 1.0)),
CONSTRAINT chk_is_manual_override CHECK (is_manual_override IN (0, 1)),
CONSTRAINT chk_owned_has_path CHECK (ownership_status != 'Owned' OR matched_folder_path IS NOT NULL)
```

### New Constraints

```sql
-- Ensures is_ignored is boolean (0 or 1)
CONSTRAINT chk_is_ignored CHECK (is_ignored IN (0, 1)),

-- Business rule: owned albums cannot be ignored
CONSTRAINT chk_owned_not_ignored CHECK (ownership_status != 'Owned' OR is_ignored = 0)
```

---

## Indexes

### Existing Indexes (Unchanged)

```sql
CREATE UNIQUE INDEX idx_album_mbid ON Album(mbid);
CREATE INDEX idx_album_artist_id ON Album(artist_id);
CREATE INDEX idx_album_ownership_status ON Album(ownership_status);
CREATE INDEX idx_album_manual_override ON Album(is_manual_override) WHERE is_manual_override = 1;
```

### New Index

```sql
-- Partial index for efficient filtering when showing ignored albums
CREATE INDEX idx_album_ignored ON Album(artist_id, is_ignored) 
WHERE is_ignored = 1;
```

**Rationale**: Most albums will NOT be ignored, so indexing only the smaller subset (is_ignored = 1) improves performance for the "Show Ignored Albums" toggle while minimizing index size.

---

## Triggers

### New Trigger: Auto-Clear Ignored Status on Ownership Change

```sql
CREATE TRIGGER auto_unignore_owned_albums
AFTER UPDATE OF ownership_status ON Album
FOR EACH ROW
WHEN NEW.ownership_status = 'Owned' AND NEW.is_ignored = 1
BEGIN
  UPDATE Album SET is_ignored = 0 WHERE id = NEW.id;
END;
```

**Purpose**: Implements FR-013 requirement - automatically clears ignored status when an album's ownership status changes to 'Owned' (e.g., during a filesystem rescan).

**Behavior**:
- Fires only when `ownership_status` is updated to 'Owned'
- Only executes if `is_ignored = 1` (prevents unnecessary updates)
- Ensures data integrity without requiring application code changes

---

## State Transitions

### Ignored Status Lifecycle

```
┌─────────────────┐
│  Album Created  │
│  is_ignored = 0 │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  User Action: Mark as Ignored       │
│  (Only if ownership_status != Owned)│
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────┐         ┌──────────────────────────┐
│  is_ignored = 1 │────────▶│  Ownership Status Change │
│  (Hidden)       │         │  to 'Owned' (Trigger)    │
└────────┬────────┘         └────────┬─────────────────┘
         │                           │
         │                           ▼
         │                  ┌─────────────────┐
         │                  │  is_ignored = 0 │
         │                  │  (Auto-cleared) │
         │                  └─────────────────┘
         │
         ▼
┌─────────────────────────┐
│  User Action: Un-ignore │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│  is_ignored = 0 │
│  (Visible)      │
└─────────────────┘
```

### State Transition Rules

| Current State | Action | Validation | New State |
|---------------|--------|------------|-----------|
| is_ignored = 0 | User clicks "Ignore" | ownership_status != 'Owned' | is_ignored = 1 |
| is_ignored = 0 | User clicks "Ignore" | ownership_status = 'Owned' | **ERROR**: "Cannot ignore owned albums" |
| is_ignored = 1 | User clicks "Un-ignore" | None | is_ignored = 0 |
| is_ignored = 1 | Ownership changes to 'Owned' | **AUTO** (trigger) | is_ignored = 0 |
| is_ignored = 1 | Ownership changes to 'Missing' | None | is_ignored = 1 (unchanged) |
| is_ignored = 1 | Artist refresh/rescan | None | is_ignored = 1 (persisted via MBID match) |

---

## Validation Rules

### Field-Level Validation

**`is_ignored`**
- **Type**: Must be INTEGER (0 or 1)
- **Range**: 0 (false) or 1 (true) only
- **Required**: NOT NULL (always has a value)
- **Default**: 0 (not ignored)

### Business Rule Validation

**Rule 1: Owned Albums Cannot Be Ignored**
- **Constraint**: `chk_owned_not_ignored`
- **Logic**: `ownership_status != 'Owned' OR is_ignored = 0`
- **Error Message**: "Cannot ignore owned albums"
- **Enforcement**:
  - Database: CHECK constraint (ultimate enforcement)
  - Application: Pre-validation in `AlbumRepository.setIgnored()` (user-friendly error)

**Rule 2: Ignored Status Must Persist Across Refreshes**
- **Mechanism**: During artist refresh, albums are matched by MBID (stable identifier)
- **Behavior**: When existing album is updated, `is_ignored` field is NOT modified unless ownership changes to 'Owned'
- **Implementation**: `AlbumService` or refresh logic must preserve `is_ignored` when updating other fields

**Rule 3: Auto-Clear on Ownership Change**
- **Constraint**: `auto_unignore_owned_albums` trigger
- **Logic**: When `ownership_status` → 'Owned', set `is_ignored = 0`
- **Purpose**: Prevents inconsistent state where owned albums are hidden

---

## TypeScript Interface

### Shared Type Definition

**File**: `/shared/types/index.ts`

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
  is_ignored: boolean;  // NEW FIELD
  created_at: string;   // ISO 8601 timestamp
  updated_at: string;   // ISO 8601 timestamp
}
```

### Model Class

**File**: `/backend/src/models/Album.ts`

```typescript
export class AlbumModel implements Album {
  // ... existing fields ...
  is_ignored: boolean;

  constructor(data: Album) {
    // ... existing assignments ...
    this.is_ignored = data.is_ignored;
  }

  // No additional validation needed - is_ignored is always valid boolean
}
```

---

## Database Migration

### Migration Strategy

**File**: `/backend/src/db/connection.ts`

Add to `runMigrations()` function:

```typescript
// Migration: Add is_ignored column to Album table
const albumColumns = database.pragma('table_info(Album)') as Array<{ name: string }>;
const hasIsIgnored = albumColumns.some(col => col.name === 'is_ignored');

if (!hasIsIgnored) {
  database.exec('ALTER TABLE Album ADD COLUMN is_ignored INTEGER NOT NULL DEFAULT 0');
  console.log('[DB] Migration: Added is_ignored column to Album table');
}
```

**Notes**:
- SQLite `ALTER TABLE` cannot add CHECK constraints or triggers retroactively
- Constraints and triggers must be added to `schema.sql` for new installations
- For existing databases, application-level validation enforces business rules until schema is recreated
- Migration is idempotent (checks for column existence before adding)

---

## Schema Updates

### Complete Album Table Definition

**File**: `/backend/src/db/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS Album (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id INTEGER NOT NULL,
  mbid TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  release_year INTEGER,
  release_date TEXT,
  disambiguation TEXT,
  ownership_status TEXT NOT NULL CHECK (ownership_status IN ('Owned', 'Missing', 'Ambiguous')),
  matched_folder_path TEXT,
  match_confidence REAL CHECK (match_confidence IS NULL OR (match_confidence >= 0.0 AND match_confidence <= 1.0)),
  is_manual_override INTEGER NOT NULL DEFAULT 0,
  is_ignored INTEGER NOT NULL DEFAULT 0,  -- NEW FIELD
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  CONSTRAINT fk_album_artist FOREIGN KEY (artist_id) REFERENCES Artist(id) ON DELETE CASCADE,
  CONSTRAINT chk_is_manual_override CHECK (is_manual_override IN (0, 1)),
  CONSTRAINT chk_is_ignored CHECK (is_ignored IN (0, 1)),  -- NEW CONSTRAINT
  CONSTRAINT chk_owned_has_path CHECK (ownership_status != 'Owned' OR matched_folder_path IS NOT NULL),
  CONSTRAINT chk_owned_not_ignored CHECK (ownership_status != 'Owned' OR is_ignored = 0)  -- NEW CONSTRAINT
);

-- Existing indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_album_mbid ON Album(mbid);
CREATE INDEX IF NOT EXISTS idx_album_artist_id ON Album(artist_id);
CREATE INDEX IF NOT EXISTS idx_album_ownership_status ON Album(ownership_status);
CREATE INDEX IF NOT EXISTS idx_album_manual_override ON Album(is_manual_override) WHERE is_manual_override = 1;

-- New index
CREATE INDEX IF NOT EXISTS idx_album_ignored ON Album(artist_id, is_ignored) WHERE is_ignored = 1;

-- Trigger for updated_at (existing)
CREATE TRIGGER IF NOT EXISTS update_album_timestamp
AFTER UPDATE ON Album
FOR EACH ROW
BEGIN
  UPDATE Album SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- New trigger for auto-clearing ignored status
CREATE TRIGGER IF NOT EXISTS auto_unignore_owned_albums
AFTER UPDATE OF ownership_status ON Album
FOR EACH ROW
WHEN NEW.ownership_status = 'Owned' AND NEW.is_ignored = 1
BEGIN
  UPDATE Album SET is_ignored = 0 WHERE id = NEW.id;
END;
```

---

## Impact on Related Entities

### Artist (No Changes)

The Artist entity is not modified. However, queries that aggregate album statistics must now filter by `is_ignored = 0`.

**Example**: Artist card displays "X of Y albums owned"
- **Before**: `SELECT COUNT(*) FROM Album WHERE artist_id = ?`
- **After**: `SELECT COUNT(*) FROM Album WHERE artist_id = ? AND is_ignored = 0`

### FilesystemCache (No Changes)

The FilesystemCache entity is not affected. Ignored albums remain in the cache and can be matched during rescans.

### Settings (No Changes)

No new settings are required. Ignored status is per-album, not a global configuration.

---

## Data Integrity Guarantees

1. **No Orphaned Ignored Albums**: CASCADE delete on artist ensures ignored albums are deleted when parent artist is removed
2. **No Ignored Owned Albums**: CHECK constraint prevents invalid state at database level
3. **Automatic Consistency**: Trigger ensures ignored status is cleared when albums become owned
4. **Persistent Identification**: MBID uniqueness ensures ignored status survives artist refreshes
5. **Default Safety**: All new albums default to `is_ignored = 0` (visible)

---

## Summary of Changes

| Component | File | Change Type | Description |
|-----------|------|-------------|-------------|
| Schema | `backend/src/db/schema.sql` | MODIFY | Add `is_ignored` column, constraints, index, trigger |
| Migration | `backend/src/db/connection.ts` | MODIFY | Add migration for `is_ignored` column |
| TypeScript Interface | `shared/types/index.ts` | MODIFY | Add `is_ignored: boolean` to Album interface |
| Model Class | `backend/src/models/Album.ts` | MODIFY | Add `is_ignored` property to AlbumModel |

All changes are backward-compatible. Existing albums will default to `is_ignored = 0` (visible) after migration.
