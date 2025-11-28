/**
 * AlbumMatcher Service
 *
 * Matches album metadata against filesystem folders using fuzzy string matching.
 * Uses Fuse.js for efficient similarity scoring with 80% threshold.
 */

import Fuse from 'fuse.js'
import { FilesystemCacheEntry } from '../models/FilesystemCache'

export interface AlbumMatchInput {
  mbid: string
  title: string
  release_year: number | null
}

export interface AlbumMatchResult {
  status: 'Owned' | 'Missing' | 'Ambiguous'
  confidence: number
  folder_path?: string
}

export class AlbumMatcher {
  private SIMILARITY_THRESHOLD: number = 0.8
  private readonly YEAR_TOLERANCE = 1

  constructor(similarityThreshold?: number) {
    if (similarityThreshold !== undefined) {
      if (similarityThreshold < 0 || similarityThreshold > 1) {
        throw new Error('Similarity threshold must be between 0 and 1')
      }
      this.SIMILARITY_THRESHOLD = similarityThreshold
    }
  }

  /**
   * Match albums against filesystem folders
   * Returns map of album MBID to match result
   */
  matchAlbums(
    albums: AlbumMatchInput[],
    folders: FilesystemCacheEntry[]
  ): Map<string, AlbumMatchResult> {
    const matches = new Map<string, AlbumMatchResult>()

    for (const album of albums) {
      const match = this.matchSingleAlbum(album, folders)
      matches.set(album.mbid, match)
    }

    return matches
  }

  /**
   * Match single album against folders
   */
  private matchSingleAlbum(
    album: AlbumMatchInput,
    folders: FilesystemCacheEntry[]
  ): AlbumMatchResult {
    // Filter folders by year first (performance optimization)
    const yearCandidates = this.filterByYear(folders, album.release_year)

    if (yearCandidates.length === 0) {
      return {
        status: 'Missing',
        confidence: 0,
      }
    }

    // Use Fuse.js for fuzzy title matching
    const fuse = new Fuse(yearCandidates, {
      keys: ['parsed_title'],
      threshold: 0.4, // More lenient threshold to catch potential matches
      includeScore: true,
      ignoreLocation: true, // Don't penalize position
      ignoreFieldNorm: true, // Don't penalize length differences
    })

    const normalizedTitle = this.normalizeTitle(album.title)
    const results = fuse.search(normalizedTitle)

    if (results.length === 0) {
      return {
        status: 'Missing',
        confidence: 0,
      }
    }

    // Get best match
    const bestMatch = results[0]
    const confidence = 1 - (bestMatch.score || 0) // Convert back to similarity

    return {
      status: confidence >= this.SIMILARITY_THRESHOLD ? 'Owned' : 'Ambiguous',
      confidence,
      folder_path: bestMatch.item.folder_path,
    }
  }

  /**
   * Filter folders by year with tolerance
   */
  private filterByYear(
    folders: FilesystemCacheEntry[],
    releaseYear: number | null
  ): FilesystemCacheEntry[] {
    if (releaseYear === null) {
      return []
    }

    return folders.filter(folder => {
      if (folder.parsed_year === null) {
        return false
      }

      const yearDiff = Math.abs(folder.parsed_year - releaseYear)
      return yearDiff <= this.YEAR_TOLERANCE
    })
  }

  /**
   * Normalize title for matching
   * - Lowercase
   * - Remove punctuation
   * - Trim whitespace
   */
  normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }
}
