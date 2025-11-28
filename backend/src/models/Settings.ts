/**
 * Settings Model
 *
 * Singleton model for application configuration
 */

import type { Settings } from '../../../shared/types/index.js';

export class SettingsModel implements Settings {
  id: 1 = 1; // Always 1 (singleton)
  library_root_path: string;
  similarity_threshold: number;
  api_rate_limit_ms: number;
  max_api_retries: number;
  updated_at: string;

  constructor(data: Settings) {
    this.id = 1;
    this.library_root_path = data.library_root_path;
    this.similarity_threshold = data.similarity_threshold;
    this.api_rate_limit_ms = data.api_rate_limit_ms;
    this.max_api_retries = data.max_api_retries;
    this.updated_at = data.updated_at;
  }

  /**
   * Validate library root path
   */
  static validateLibraryPath(path: string): { valid: boolean; error?: string } {
    if (!path || path.trim().length === 0) {
      return { valid: false, error: 'Library path cannot be empty' };
    }

    if (!path.startsWith('/')) {
      return { valid: false, error: 'Library path must be an absolute path' };
    }

    return { valid: true };
  }

  /**
   * Validate similarity threshold
   */
  static validateSimilarityThreshold(threshold: number): { valid: boolean; error?: string } {
    if (threshold < 0 || threshold > 1) {
      return { valid: false, error: 'Similarity threshold must be between 0 and 1' };
    }

    return { valid: true };
  }

  /**
   * Validate API rate limit
   */
  static validateApiRateLimit(ms: number): { valid: boolean; error?: string } {
    if (ms < 500) {
      return { valid: false, error: 'API rate limit must be at least 500ms (MusicBrainz requirement)' };
    }

    return { valid: true };
  }

  /**
   * Validate max retries
   */
  static validateMaxRetries(retries: number): { valid: boolean; error?: string } {
    if (retries < 1) {
      return { valid: false, error: 'Max retries must be at least 1' };
    }

    return { valid: true };
  }
}
