/**
 * Artist Refresh Service
 *
 * Handles refreshing artist album data from MusicBrainz API with:
 * - Duplicate album prevention
 * - Concurrent refresh protection
 * - Timestamp updates
 */

import { MusicBrainzService } from './MusicBrainzService.js'
import { ArtistRepository } from '../repositories/ArtistRepository.js'
import { AlbumRepository } from '../repositories/AlbumRepository.js'

export interface RefreshResult {
  success: boolean
  albums_added: number
  updated_at: string
  message?: string
}

export interface StaleCheckResult {
  refresh_needed: boolean
  artist?: {
    id: number
    name: string
    updated_at: string
    days_since_update: number
  }
  refresh_result?: RefreshResult
}

export class ArtistRefreshService {
  private musicBrainzService: MusicBrainzService
  private activeRefreshes: Set<number>

  constructor() {
    this.musicBrainzService = new MusicBrainzService()
    this.activeRefreshes = new Set<number>()
  }

  /**
   * Refresh an artist's album collection from MusicBrainz
   *
   * @param artistId Internal database ID of the artist
   * @returns Refresh result with count of new albums added
   * @throws Error if artist not found or refresh already in progress
   */
  async refreshArtist(artistId: number): Promise<RefreshResult> {
    // Check if refresh already in progress for this artist
    if (this.activeRefreshes.has(artistId)) {
      throw new Error('Refresh already in progress for this artist')
    }

    try {
      // Add to active refreshes set
      this.activeRefreshes.add(artistId)

      // Validate artist exists and get MBID
      const artist = ArtistRepository.findById(artistId)
      if (!artist) {
        throw new Error('Artist not found')
      }

      // Fetch albums from MusicBrainz API
      const apiAlbums = await this.musicBrainzService.fetchReleaseGroups(artist.mbid)

      // Get existing albums for this artist
      const existingAlbums = AlbumRepository.findByArtistId(artistId)
      const existingMbids = new Set(existingAlbums.map(album => album.mbid))

      // Filter to only new albums (not already in database)
      const newAlbums = apiAlbums.filter(album => !existingMbids.has(album.mbid))

      // Insert new albums if any
      if (newAlbums.length > 0) {
        const albumsToCreate = newAlbums.map(album => ({
          artist_id: artistId,
          mbid: album.mbid,
          title: album.title,
          release_year: this.extractReleaseYear(album.release_date),
          release_date: album.release_date || null,
          disambiguation: album.disambiguation || null,
        }))

        AlbumRepository.bulkCreate(albumsToCreate)
      }

      // Update artist to trigger updated_at timestamp
      const updatedArtist = ArtistRepository.touch(artistId)

      return {
        success: true,
        albums_added: newAlbums.length,
        updated_at: updatedArtist.updated_at,
        message: newAlbums.length === 0 ? 'No new albums found' : undefined,
      }
    } finally {
      // Always remove from active refreshes, even if error occurs
      this.activeRefreshes.delete(artistId)
    }
  }

  /**
   * Check for stale artists and refresh if needed
   *
   * Finds the artist with the oldest updated_at timestamp.
   * If that timestamp is >7 days old, triggers a refresh for that artist.
   *
   * @returns Stale check result with refresh status and details
   */
  async checkStaleArtists(): Promise<StaleCheckResult> {
    const STALE_THRESHOLD_DAYS = 7

    // Find artist with oldest updated_at
    const oldestArtist = ArtistRepository.findOldest()

    // No artists exist
    if (!oldestArtist) {
      return {
        refresh_needed: false,
      }
    }

    // Calculate days since last update
    const updatedAt = new Date(oldestArtist.updated_at)
    const now = new Date()
    const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)

    // Check if stale (>7 days, not >=7)
    if (daysSinceUpdate <= STALE_THRESHOLD_DAYS) {
      return {
        refresh_needed: false,
      }
    }

    // Artist is stale - trigger refresh
    const refreshResult = await this.refreshArtist(oldestArtist.id)

    return {
      refresh_needed: true,
      artist: {
        id: oldestArtist.id,
        name: oldestArtist.name,
        updated_at: oldestArtist.updated_at,
        days_since_update: daysSinceUpdate,
      },
      refresh_result: refreshResult,
    }
  }

  /**
   * Extract release year from ISO date string
   *
   * @param releaseDate ISO date string (e.g., "1973-03-01" or "1973")
   * @returns Release year as number, or null if invalid
   */
  private extractReleaseYear(releaseDate: string | undefined): number | null {
    if (!releaseDate) {
      return null
    }

    // Try to parse year from date string
    const yearMatch = releaseDate.match(/^(\d{4})/)
    if (yearMatch) {
      return parseInt(yearMatch[1], 10)
    }

    return null
  }
}
