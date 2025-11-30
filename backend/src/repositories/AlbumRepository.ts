/**
 * Album Repository
 *
 * Data access layer for Album entities
 */

import { getDatabase, transaction } from '../db/connection.js';
import { AlbumModel } from '../models/Album.js';
import type { Album } from '../shared/types/index.js';

export class AlbumRepository {
  /**
   * Create a single album
   */
  static create(album: {
    artist_id: number;
    mbid: string;
    title: string;
    release_year?: number | null;
    release_date?: string | null;
    disambiguation?: string | null;
    ownership_status?: 'Owned' | 'Missing' | 'Ambiguous';
    matched_folder_path?: string | null;
    match_confidence?: number | null;
    is_manual_override?: boolean;
  }): AlbumModel {
    const db = getDatabase();

    // Validate required fields
    const mbidValidation = AlbumModel.validateMbid(album.mbid);
    if (!mbidValidation.valid) {
      throw new Error(mbidValidation.error);
    }

    const titleValidation = AlbumModel.validateTitle(album.title);
    if (!titleValidation.valid) {
      throw new Error(titleValidation.error);
    }

    const stmt = db.prepare(`
      INSERT INTO Album (
        artist_id, mbid, title, release_year, release_date, disambiguation,
        ownership_status, matched_folder_path, match_confidence, is_manual_override
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      album.artist_id,
      album.mbid,
      album.title,
      album.release_year || null,
      album.release_date || null,
      album.disambiguation || null,
      album.ownership_status || 'Missing',
      album.matched_folder_path || null,
      album.match_confidence || null,
      album.is_manual_override ? 1 : 0
    );

    const albumId = result.lastInsertRowid as number;
    return this.findById(albumId)!;
  }

  /**
   * Bulk create albums (transaction)
   */
  static bulkCreate(albums: Array<{
    artist_id: number;
    mbid: string;
    title: string;
    release_year?: number | null;
    release_date?: string | null;
    disambiguation?: string | null;
  }>): AlbumModel[] {
    return transaction((db) => {
      const stmt = db.prepare(`
        INSERT INTO Album (
          artist_id, mbid, title, release_year, release_date, disambiguation, ownership_status
        )
        VALUES (?, ?, ?, ?, ?, ?, 'Missing')
      `);

      const createdIds: number[] = [];

      for (const album of albums) {
        // Validate
        const mbidValidation = AlbumModel.validateMbid(album.mbid);
        if (!mbidValidation.valid) {
          throw new Error(`Album ${album.title}: ${mbidValidation.error}`);
        }

        const titleValidation = AlbumModel.validateTitle(album.title);
        if (!titleValidation.valid) {
          throw new Error(`Album ${album.title}: ${titleValidation.error}`);
        }

        const result = stmt.run(
          album.artist_id,
          album.mbid,
          album.title,
          album.release_year || null,
          album.release_date || null,
          album.disambiguation || null
        );

        createdIds.push(result.lastInsertRowid as number);
      }

      // Return created albums
      return createdIds.map(id => this.findById(id)!);
    });
  }

  /**
   * Find album by ID
   */
  static findById(id: number): AlbumModel | null {
    const db = getDatabase();

    const row = db
      .prepare('SELECT * FROM Album WHERE id = ?')
      .get(id) as Album | undefined;

    if (!row) {
      return null;
    }

    // Convert is_manual_override from integer to boolean
    return new AlbumModel({
      ...row,
      is_manual_override: Boolean(row.is_manual_override)
    });
  }

  /**
   * Find albums by artist ID
   */
  static findByArtistId(artistId: number): AlbumModel[] {
    const db = getDatabase();

    const rows = db
      .prepare(`
        SELECT * FROM Album
        WHERE artist_id = ?
        ORDER BY release_year ASC, title COLLATE NOCASE
      `)
      .all(artistId) as Album[];

    return rows.map(row => new AlbumModel({
      ...row,
      is_manual_override: Boolean(row.is_manual_override)
    }));
  }

  /**
   * Update album ownership status
   */
  static updateOwnership(
    id: number,
    updates: {
      ownership_status?: 'Owned' | 'Missing' | 'Ambiguous';
      matched_folder_path?: string | null;
      match_confidence?: number | null;
      is_manual_override?: boolean;
    }
  ): AlbumModel {
    const db = getDatabase();

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.ownership_status !== undefined) {
      const validation = AlbumModel.validateOwnershipStatus(updates.ownership_status);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      fields.push('ownership_status = ?');
      values.push(updates.ownership_status);
    }

    if (updates.matched_folder_path !== undefined) {
      fields.push('matched_folder_path = ?');
      values.push(updates.matched_folder_path);
    }

    if (updates.match_confidence !== undefined) {
      const validation = AlbumModel.validateMatchConfidence(updates.match_confidence);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      fields.push('match_confidence = ?');
      values.push(updates.match_confidence);
    }

    if (updates.is_manual_override !== undefined) {
      fields.push('is_manual_override = ?');
      values.push(updates.is_manual_override ? 1 : 0);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const stmt = db.prepare(`
      UPDATE Album
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values, id);

    return this.findById(id)!;
  }

  /**
   * Delete album
   */
  static delete(id: number): void {
    const db = getDatabase();

    const stmt = db.prepare('DELETE FROM Album WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Count albums by artist
   */
  static countByArtist(artistId: number): { total: number; owned: number } {
    const db = getDatabase();

    const row = db
      .prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN ownership_status = 'Owned' THEN 1 ELSE 0 END) as owned
        FROM Album
        WHERE artist_id = ?
      `)
      .get(artistId) as { total: number; owned: number };

    return row;
  }
}
