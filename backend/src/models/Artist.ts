/**
 * Artist Model
 *
 * Represents a music artist imported from MusicBrainz
 */

import type { Artist } from '../../../shared/types/index.js';

export class ArtistModel implements Artist {
  id: number;
  mbid: string;
  name: string;
  sort_name: string | null;
  disambiguation: string | null;
  linked_folder_path: string | null;
  created_at: string;
  updated_at: string;
  total_albums?: number;
  owned_albums?: number;
  completion_percentage?: number;

  constructor(data: Artist) {
    this.id = data.id;
    this.mbid = data.mbid;
    this.name = data.name;
    this.sort_name = data.sort_name;
    this.disambiguation = data.disambiguation;
    this.linked_folder_path = data.linked_folder_path;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.total_albums = data.total_albums;
    this.owned_albums = data.owned_albums;
    this.completion_percentage = data.completion_percentage;
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
   * Validate artist name
   */
  static validateName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Artist name cannot be empty' };
    }

    return { valid: true };
  }
}
