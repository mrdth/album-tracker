/**
 * MusicBrainz Service
 *
 * Wrapper for MusicBrainzClient with:
 * - Exponential backoff retry logic
 * - Rate limiting per MusicBrainz API requirements
 * - Error handling and logging
 */

import { MusicBrainzClient, type ArtistResult, type AlbumResult } from './MusicBrainzClient.js';
import { SettingsRepository } from '../repositories/SettingsRepository.js';

/**
 * Sleep utility for rate limiting and retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class MusicBrainzService {
  private client: MusicBrainzClient;
  private lastRequestTime: number = 0;

  constructor() {
    this.client = new MusicBrainzClient();
  }

  /**
   * Enforce rate limiting before making requests
   */
  private async enforceRateLimit(): Promise<void> {
    const settings = SettingsRepository.get();
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < settings.api_rate_limit_ms) {
      const waitTime = settings.api_rate_limit_ms - timeSinceLastRequest;
      await sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Execute a function with exponential backoff retry logic
   *
   * @param fn Function to execute
   * @param operationName Name for logging
   * @returns Result of function execution
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const settings = SettingsRepository.get();
    const maxRetries = settings.max_api_retries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Enforce rate limit before each attempt
        await this.enforceRateLimit();

        // Execute the operation
        const result = await fn();

        if (attempt > 0) {
          console.log(`[MusicBrainz] ${operationName} succeeded on attempt ${attempt + 1}`);
        }

        return result;
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || attempt === maxRetries) {
          console.error(`[MusicBrainz] ${operationName} failed after ${attempt + 1} attempts:`, error.message);
          throw error;
        }

        // Calculate exponential backoff delay: 2^attempt * 1000ms
        const backoffDelay = Math.pow(2, attempt) * 1000;
        console.warn(
          `[MusicBrainz] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}). ` +
          `Retrying in ${backoffDelay}ms... Error: ${error.message}`
        );

        await sleep(backoffDelay);
      }
    }

    // This should never be reached due to throw in the loop
    throw lastError || new Error(`${operationName} failed after ${maxRetries + 1} attempts`);
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Retryable: Network errors, timeouts, rate limits, server errors
    const retryablePatterns = [
      'network error',
      'timeout',
      'econnrefused',
      'enotfound',
      'econnreset',
      '429', // Too Many Requests
      '503', // Service Unavailable
      '502', // Bad Gateway
      '504', // Gateway Timeout
    ];

    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Search for artists by name
   *
   * @param searchTerm Artist name to search for
   * @returns Array of artist search results sorted by relevance
   */
  async searchArtists(searchTerm: string): Promise<ArtistResult[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new Error('Search term cannot be empty');
    }

    return this.retryWithBackoff(
      () => this.client.artistSearch(searchTerm),
      `Artist search for "${searchTerm}"`
    );
  }

  /**
   * Fetch release groups (albums) for an artist
   *
   * @param artistMbid MusicBrainz artist ID
   * @returns Array of album release groups filtered to type: Album only
   */
  async fetchReleaseGroups(artistMbid: string): Promise<AlbumResult[]> {
    if (!artistMbid || artistMbid.length !== 36) {
      throw new Error('Invalid MusicBrainz artist ID (must be UUID format)');
    }

    return this.retryWithBackoff(
      () => this.client.getAlbums(artistMbid),
      `Fetch albums for artist ${artistMbid}`
    );
  }

  /**
   * Get current rate limit settings
   */
  getRateLimitInfo(): { rate_limit_ms: number; max_retries: number } {
    const settings = SettingsRepository.get();
    return {
      rate_limit_ms: settings.api_rate_limit_ms,
      max_retries: settings.max_api_retries
    };
  }
}

// Export singleton instance
export const musicBrainzService = new MusicBrainzService();
