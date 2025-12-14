-- Album Tracker Database Schema
-- Created: 2025-11-27
-- SQLite 3.x compatible

-- ============================================================================
-- Artist Table
-- ============================================================================
-- Stores music artists imported from MusicBrainz with ownership statistics
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

-- Indexes for Artist
CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_mbid ON Artist(mbid);
CREATE INDEX IF NOT EXISTS idx_artist_name ON Artist(name COLLATE NOCASE);

-- ============================================================================
-- Album Table
-- ============================================================================
-- Stores release-groups (type: Album) belonging to artists with ownership tracking
CREATE TABLE IF NOT EXISTS Album (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id INTEGER NOT NULL,
  mbid TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  release_year INTEGER,
  release_date TEXT,
  disambiguation TEXT,
  ownership_status TEXT NOT NULL DEFAULT 'Missing',
  matched_folder_path TEXT,
  match_confidence REAL,
  is_manual_override INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (artist_id) REFERENCES Artist(id) ON DELETE CASCADE,

  CONSTRAINT chk_mbid_format CHECK (length(mbid) = 36),
  CONSTRAINT chk_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT chk_ownership_status CHECK (ownership_status IN ('Owned', 'Missing', 'Ambiguous')),
  CONSTRAINT chk_match_confidence CHECK (match_confidence IS NULL OR (match_confidence BETWEEN 0 AND 1)),
  CONSTRAINT chk_is_manual_override CHECK (is_manual_override IN (0, 1)),
  CONSTRAINT chk_owned_has_path CHECK (ownership_status != 'Owned' OR matched_folder_path IS NOT NULL)
);

-- Indexes for Album
CREATE UNIQUE INDEX IF NOT EXISTS idx_album_mbid ON Album(mbid);
CREATE INDEX IF NOT EXISTS idx_album_artist_id ON Album(artist_id);
CREATE INDEX IF NOT EXISTS idx_album_ownership ON Album(ownership_status);
CREATE INDEX IF NOT EXISTS idx_album_manual ON Album(is_manual_override);

-- ============================================================================
-- Settings Table (Singleton)
-- ============================================================================
-- Application configuration with singleton pattern (only one row exists)
CREATE TABLE IF NOT EXISTS Settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  library_root_path TEXT NOT NULL,
  similarity_threshold REAL NOT NULL DEFAULT 0.80,
  api_rate_limit_ms INTEGER NOT NULL DEFAULT 1000,
  max_api_retries INTEGER NOT NULL DEFAULT 3,
  last_scan_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT chk_similarity_threshold CHECK (similarity_threshold BETWEEN 0 AND 1),
  CONSTRAINT chk_api_rate_limit CHECK (api_rate_limit_ms >= 500),
  CONSTRAINT chk_max_retries CHECK (max_api_retries >= 1)
);

-- Trigger to enforce Settings singleton
CREATE TRIGGER IF NOT EXISTS enforce_settings_singleton
BEFORE INSERT ON Settings
WHEN (SELECT COUNT(*) FROM Settings) >= 1
BEGIN
  SELECT RAISE(FAIL, 'Settings table can only have one row');
END;

-- ============================================================================
-- FilesystemCache Table
-- ============================================================================
-- Cache of filesystem scan results for fast matching
CREATE TABLE IF NOT EXISTS FilesystemCache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_path TEXT NOT NULL UNIQUE,
  folder_name TEXT NOT NULL,
  parent_path TEXT NOT NULL,
  is_artist_folder INTEGER NOT NULL DEFAULT 0,
  parsed_year INTEGER,
  parsed_title TEXT,
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT chk_is_artist_folder CHECK (is_artist_folder IN (0, 1))
);

-- Indexes for FilesystemCache
CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_folder_path ON FilesystemCache(folder_path);
CREATE INDEX IF NOT EXISTS idx_cache_parent ON FilesystemCache(parent_path);
CREATE INDEX IF NOT EXISTS idx_cache_artist ON FilesystemCache(is_artist_folder);
CREATE INDEX IF NOT EXISTS idx_cache_name ON FilesystemCache(folder_name COLLATE NOCASE);

-- ============================================================================
-- Triggers for updated_at timestamps
-- ============================================================================

-- Artist updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_artist_timestamp
AFTER UPDATE ON Artist
FOR EACH ROW
BEGIN
  UPDATE Artist SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Album updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_album_timestamp
AFTER UPDATE ON Album
FOR EACH ROW
BEGIN
  UPDATE Album SET updated_at = datetime('now') WHERE id = OLD.id;
END;



-- Settings updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_settings_timestamp
AFTER UPDATE ON Settings
FOR EACH ROW
BEGIN
  UPDATE Settings SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ============================================================================
-- Default Settings Row
-- ============================================================================
-- Insert default settings row (will be created by connection.ts on first run)
-- This is commented out as it will be handled by the application initialization
-- INSERT OR IGNORE INTO Settings (id, library_root_path) VALUES (1, '/music');
