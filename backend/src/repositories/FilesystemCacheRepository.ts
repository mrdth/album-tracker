/**
 * FilesystemCacheRepository
 *
 * Data access layer for filesystem cache entries.
 * Supports bulk operations for efficient scanning.
 */

import { Database } from 'better-sqlite3'
import { getDatabase } from '../db/connection.js'
import { FilesystemCacheEntry, CreateFilesystemCacheEntry } from '../models/FilesystemCache.js'

export class FilesystemCacheRepository {
  private db: Database

  constructor(db?: Database) {
    this.db = db || getDatabase()
  }

  /**
   * Bulk insert cache entries for efficient scanning
   */
  bulkInsert(entries: CreateFilesystemCacheEntry[]): number {
    if (entries.length === 0) {
      return 0
    }

    const stmt = this.db.prepare(`
      INSERT INTO FilesystemCache (
        folder_path, folder_name, parent_path, is_artist_folder,
        parsed_year, parsed_title
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const insertMany = this.db.transaction((entries: CreateFilesystemCacheEntry[]) => {
      for (const entry of entries) {
        stmt.run(
          entry.folder_path,
          entry.folder_name,
          entry.parent_path,
          entry.is_artist_folder ? 1 : 0,
          entry.parsed_year,
          entry.parsed_title
        )
      }
    })

    insertMany(entries)
    return entries.length
  }

  /**
   * Find all folders within a parent path
   */
  findByParentPath(parentPath: string): FilesystemCacheEntry[] {
    const stmt = this.db.prepare(`
      SELECT
        id, folder_path, folder_name, parent_path,
        is_artist_folder, parsed_year, parsed_title, scanned_at
      FROM FilesystemCache
      WHERE parent_path = ?
      ORDER BY folder_name COLLATE NOCASE
    `)

    const rows = stmt.all(parentPath) as any[]

    return rows.map(row => ({
      ...row,
      is_artist_folder: Boolean(row.is_artist_folder),
    }))
  }

  /**
   * Find all album folders (have parsed_year)
   */
  findAlbumFolders(parentPath?: string): FilesystemCacheEntry[] {
    let query = `
      SELECT
        id, folder_path, folder_name, parent_path,
        is_artist_folder, parsed_year, parsed_title, scanned_at
      FROM FilesystemCache
      WHERE parsed_year IS NOT NULL
    `

    const params: any[] = []

    if (parentPath) {
      query += ' AND parent_path = ?'
      params.push(parentPath)
    }

    query += ' ORDER BY parsed_year, folder_name COLLATE NOCASE'

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params) as any[]

    return rows.map(row => ({
      ...row,
      is_artist_folder: Boolean(row.is_artist_folder),
    }))
  }

  /**
   * Find artist folders
   */
  findArtistFolders(): FilesystemCacheEntry[] {
    const stmt = this.db.prepare(`
      SELECT
        id, folder_path, folder_name, parent_path,
        is_artist_folder, parsed_year, parsed_title, scanned_at
      FROM FilesystemCache
      WHERE is_artist_folder = 1
      ORDER BY folder_name COLLATE NOCASE
    `)

    const rows = stmt.all() as any[]

    return rows.map(row => ({
      ...row,
      is_artist_folder: Boolean(row.is_artist_folder),
    }))
  }

  /**
   * Search for folder by name (case-insensitive)
   */
  findByName(folderName: string): FilesystemCacheEntry | null {
    const stmt = this.db.prepare(`
      SELECT
        id, folder_path, folder_name, parent_path,
        is_artist_folder, parsed_year, parsed_title, scanned_at
      FROM FilesystemCache
      WHERE folder_name = ? COLLATE NOCASE
      LIMIT 1
    `)

    const row = stmt.get(folderName) as any

    if (!row) {
      return null
    }

    return {
      ...row,
      is_artist_folder: Boolean(row.is_artist_folder),
    }
  }

  /**
   * Clear all cache entries (before rescan)
   */
  clear(): number {
    const stmt = this.db.prepare('DELETE FROM FilesystemCache')
    const result = stmt.run()
    return result.changes
  }

  /**
   * Clear cache entries for specific parent path
   */
  clearByParentPath(parentPath: string): number {
    const stmt = this.db.prepare('DELETE FROM FilesystemCache WHERE parent_path = ?')
    const result = stmt.run(parentPath)
    return result.changes
  }

  /**
   * Clear cache entries matching pattern (for artist-specific rescans)
   */
  clearByPattern(pattern: string): number {
    const stmt = this.db.prepare('DELETE FROM FilesystemCache WHERE folder_path LIKE ?')
    const result = stmt.run(pattern)
    return result.changes
  }

  /**
   * Get total cache entry count
   */
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM FilesystemCache')
    const result = stmt.get() as { count: number }
    return result.count
  }
}
