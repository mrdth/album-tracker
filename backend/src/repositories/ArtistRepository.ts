/**
 * Artist Repository
 *
 * Data access layer for Artist entities with computed statistics
 */

import { getDatabase } from '../db/connection.js'
import { ArtistModel } from '../models/Artist.ts'
import type { Artist } from '../../../shared/types/index.js'

export class ArtistRepository {
  /**
   * Create a new artist
   */
  static create(artist: {
    mbid: string
    name: string
    sort_name?: string | null
    disambiguation?: string | null
    linked_folder_path?: string | null
  }): ArtistModel {
    const db = getDatabase()

    // Validate required fields
    const mbidValidation = ArtistModel.validateMbid(artist.mbid)
    if (!mbidValidation.valid) {
      throw new Error(mbidValidation.error)
    }

    const nameValidation = ArtistModel.validateName(artist.name)
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error)
    }

    const stmt = db.prepare(`
      INSERT INTO Artist (mbid, name, sort_name, disambiguation, linked_folder_path)
      VALUES (?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      artist.mbid,
      artist.name,
      artist.sort_name || null,
      artist.disambiguation || null,
      artist.linked_folder_path || null
    )

    const artistId = result.lastInsertRowid as number
    return this.findById(artistId)!
  }

  /**
   * Find artist by MusicBrainz ID
   */
  static findByMbid(mbid: string): ArtistModel | null {
    const db = getDatabase()

    const row = db.prepare('SELECT * FROM Artist WHERE mbid = ?').get(mbid) as Artist | undefined

    return row ? new ArtistModel(row) : null
  }

  /**
   * Find artist by internal ID with computed statistics
   */
  static findById(id: number): ArtistModel | null {
    const db = getDatabase()

    const row = db
      .prepare(
        `
        SELECT
          a.*,
          COUNT(al.id) AS total_albums,
          SUM(CASE WHEN al.ownership_status = 'Owned' THEN 1 ELSE 0 END) AS owned_albums,
          CAST(
            CASE
              WHEN COUNT(al.id) > 0
              THEN CAST(SUM(CASE WHEN al.ownership_status = 'Owned' THEN 1 ELSE 0 END) AS REAL) / COUNT(al.id) * 100
              ELSE 0
            END AS INTEGER
          ) AS completion_percentage
        FROM Artist a
        LEFT JOIN Album al ON al.artist_id = a.id
        WHERE a.id = ?
        GROUP BY a.id
      `
      )
      .get(id) as Artist | undefined

    return row ? new ArtistModel(row) : null
  }

  /**
   * List all artists with computed statistics
   */
  static list(): ArtistModel[] {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT
          a.*,
          COUNT(al.id) AS total_albums,
          SUM(CASE WHEN al.ownership_status = 'Owned' THEN 1 ELSE 0 END) AS owned_albums,
          CAST(
            CASE
              WHEN COUNT(al.id) > 0
              THEN CAST(SUM(CASE WHEN al.ownership_status = 'Owned' THEN 1 ELSE 0 END) AS REAL) / COUNT(al.id) * 100
              ELSE 0
            END AS INTEGER
          ) AS completion_percentage
        FROM Artist a
        LEFT JOIN Album al ON al.artist_id = a.id
        GROUP BY a.id
        ORDER BY a.name COLLATE NOCASE
      `
      )
      .all() as Artist[]

    return rows.map(row => new ArtistModel(row))
  }

  /**
   * Update artist
   */
  static update(
    id: number,
    updates: Partial<Pick<Artist, 'name' | 'sort_name' | 'disambiguation' | 'linked_folder_path'>>
  ): ArtistModel {
    const db = getDatabase()

    const fields = Object.keys(updates).filter(key =>
      ['name', 'sort_name', 'disambiguation', 'linked_folder_path'].includes(key)
    )

    if (fields.length === 0) {
      throw new Error('No fields to update')
    }

    // Validate name if provided
    if (updates.name !== undefined) {
      const validation = ArtistModel.validateName(updates.name)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => (updates as any)[field])

    const stmt = db.prepare(`
      UPDATE Artist
      SET ${setClause}
      WHERE id = ?
    `)

    stmt.run(...values, id)

    return this.findById(id)!
  }

  /**
   * Delete artist (cascade deletes albums)
   */
  static delete(id: number): void {
    const db = getDatabase()

    const stmt = db.prepare('DELETE FROM Artist WHERE id = ?')
    stmt.run(id)
  }

  /**
   * Touch artist to update updated_at timestamp
   *
   * This triggers the updated_at trigger without changing any fields
   */
  static touch(id: number): ArtistModel {
    const db = getDatabase()

    // Update with same value to trigger updated_at
    const stmt = db.prepare(`
      UPDATE Artist
      SET updated_at = datetime('now')
      WHERE id = ?
    `)

    stmt.run(id)

    return this.findById(id)!
  }

  /**
   * Find artist with oldest updated_at timestamp
   *
   * Used for stale data detection
   */
  static findOldest(): ArtistModel | null {
    const db = getDatabase()

    const row = db
      .prepare(
        `
        SELECT
          a.*,
          COUNT(al.id) AS total_albums,
          SUM(CASE WHEN al.ownership_status = 'Owned' THEN 1 ELSE 0 END) AS owned_albums,
          CAST(
            CASE
              WHEN COUNT(al.id) > 0
              THEN CAST(SUM(CASE WHEN al.ownership_status = 'Owned' THEN 1 ELSE 0 END) AS REAL) / COUNT(al.id) * 100
              ELSE 0
            END AS INTEGER
          ) AS completion_percentage
        FROM Artist a
        LEFT JOIN Album al ON al.artist_id = a.id
        GROUP BY a.id
        ORDER BY a.updated_at ASC
        LIMIT 1
      `
      )
      .get() as Artist | undefined

    return row ? new ArtistModel(row) : null
  }

  /**
   * Check if artist with MBID already exists
   */
  static exists(mbid: string): boolean {
    const db = getDatabase()

    const row = db.prepare('SELECT COUNT(*) as count FROM Artist WHERE mbid = ?').get(mbid) as {
      count: number
    }

    return row.count > 0
  }
}
