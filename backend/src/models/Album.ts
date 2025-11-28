/**
 * Album Model
 *
 * Represents an album (release-group) belonging to an artist with ownership tracking
 */

import type { Album } from '../../../shared/types/index.js';

export class AlbumModel implements Album {
  id: number;
  artist_id: number;
  mbid: string;
  title: string;
  release_year: number | null;
  release_date: string | null;
  disambiguation: string | null;
  ownership_status: 'Owned' | 'Missing' | 'Ambiguous';
  matched_folder_path: string | null;
  match_confidence: number | null;
  is_manual_override: boolean;
  created_at: string;
  updated_at: string;

  constructor(data: Album) {
    this.id = data.id;
    this.artist_id = data.artist_id;
    this.mbid = data.mbid;
    this.title = data.title;
    this.release_year = data.release_year;
    this.release_date = data.release_date;
    this.disambiguation = data.disambiguation;
    this.ownership_status = data.ownership_status;
    this.matched_folder_path = data.matched_folder_path;
    this.match_confidence = data.match_confidence;
    this.is_manual_override = data.is_manual_override;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Validate MusicBrainz ID format
   */
  static validateMbid(mbid: string): { valid: boolean; error?: string } {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(mbid)) {
      return { valid: false, error: 'Invalid MusicBrainz ID format (must be UUID)' };
    }

    return { valid: true };
  }

  /**
   * Validate album title
   */
  static validateTitle(title: string): { valid: boolean; error?: string } {
    if (!title || title.trim().length === 0) {
      return { valid: false, error: 'Album title cannot be empty' };
    }

    return { valid: true };
  }

  /**
   * Validate ownership status
   */
  static validateOwnershipStatus(status: string): { valid: boolean; error?: string } {
    const validStatuses = ['Owned', 'Missing', 'Ambiguous'];

    if (!validStatuses.includes(status)) {
      return {
        valid: false,
        error: `Ownership status must be one of: ${validStatuses.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate match confidence
   */
  static validateMatchConfidence(confidence: number | null): { valid: boolean; error?: string } {
    if (confidence === null) {
      return { valid: true };
    }

    if (confidence < 0 || confidence > 1) {
      return { valid: false, error: 'Match confidence must be between 0 and 1' };
    }

    return { valid: true };
  }

  /**
   * Extract year from release date string (YYYY, YYYY-MM, or YYYY-MM-DD)
   */
  static extractYear(releaseDate: string | null): number | null {
    if (!releaseDate) {
      return null;
    }

    const match = releaseDate.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : null;
  }
}
