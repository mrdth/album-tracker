/**
 * ArtistRefreshService Unit Tests
 *
 * Tests for artist refresh service logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getDatabase } from '../../../src/db/connection'
import { ArtistRefreshService } from '../../../src/services/ArtistRefreshService'
import { MusicBrainzService } from '../../../src/services/MusicBrainzService'
import type { AlbumResult } from '../../../src/services/MusicBrainzClient'

describe('ArtistRefreshService', () => {
  let testArtistId: number
  let service: ArtistRefreshService

  beforeEach(() => {
    const db = getDatabase()

    // Clean up test data
    db.prepare('DELETE FROM Album WHERE artist_id IN (SELECT id FROM Artist WHERE mbid = ?)').run(
      '5b11f4ce-a62d-471e-81fc-a69a8278c7da'
    )
    db.prepare('DELETE FROM Artist WHERE mbid = ?').run('5b11f4ce-a62d-471e-81fc-a69a8278c7da')

    // Create test artist
    const result = db
      .prepare(
        `
      INSERT INTO Artist (mbid, name, sort_name)
      VALUES ('5b11f4ce-a62d-471e-81fc-a69a8278c7da', 'Pink Floyd', 'Pink Floyd')
    `
      )
      .run()

    testArtistId = result.lastInsertRowid as number

    // Create service instance
    service = new ArtistRefreshService()
  })

  afterEach(() => {
    const db = getDatabase()

    // Clean up test data
    db.prepare('DELETE FROM Album WHERE artist_id = ?').run(testArtistId)
    db.prepare('DELETE FROM Artist WHERE id = ?').run(testArtistId)

    // Restore all mocks
    vi.restoreAllMocks()
  })

  describe('refreshArtist()', () => {
    it('should fetch albums from MusicBrainz and add new ones', async () => {
      // Mock MusicBrainz API response
      const mockAlbums: AlbumResult[] = [
        {
          title: 'The Dark Side of the Moon',
          disambiguation: undefined,
          release_date: '1973-03-01',
          mbid: '12345678-1234-1234-1234-123456789001',
        },
        {
          title: 'The Wall',
          disambiguation: undefined,
          release_date: '1979-11-30',
          mbid: '12345678-1234-1234-1234-123456789002',
        },
      ]

      vi.spyOn(MusicBrainzService.prototype, 'fetchReleaseGroups').mockResolvedValue(mockAlbums)

      const result = await service.refreshArtist(testArtistId)

      expect(result.success).toBe(true)
      expect(result.albums_added).toBe(2)
      expect(result.updated_at).toBeDefined()

      // Verify albums were added to database
      const db = getDatabase()
      const albums = db.prepare('SELECT * FROM Album WHERE artist_id = ?').all(testArtistId)

      expect(albums).toHaveLength(2)
    })

    it('should not add duplicate albums (by MBID)', async () => {
      const db = getDatabase()

      // Insert existing album (use 'Missing' status to avoid path constraint)
      db.prepare(
        `
        INSERT INTO Album (artist_id, mbid, title, release_year, ownership_status)
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(
        testArtistId,
        '12345678-1234-1234-1234-123456789001',
        'The Dark Side of the Moon',
        1973,
        'Missing'
      )

      // Mock API to return same album plus a new one
      const mockAlbums: AlbumResult[] = [
        {
          title: 'The Dark Side of the Moon',
          disambiguation: undefined,
          release_date: '1973-03-01',
          mbid: '12345678-1234-1234-1234-123456789001', // Duplicate
        },
        {
          title: 'The Wall',
          disambiguation: undefined,
          release_date: '1979-11-30',
          mbid: '12345678-1234-1234-1234-123456789002', // New
        },
      ]

      vi.spyOn(MusicBrainzService.prototype, 'fetchReleaseGroups').mockResolvedValue(mockAlbums)

      const result = await service.refreshArtist(testArtistId)

      expect(result.success).toBe(true)
      expect(result.albums_added).toBe(1) // Only one new album

      // Verify only 2 albums total (not 3)
      const albums = db.prepare('SELECT * FROM Album WHERE artist_id = ?').all(testArtistId)

      expect(albums).toHaveLength(2)
    })

    it('should update artist updated_at timestamp', async () => {
      const db = getDatabase()

      // Get original timestamp
      const originalArtist = db
        .prepare('SELECT updated_at FROM Artist WHERE id = ?')
        .get(testArtistId) as { updated_at: string }

      // Wait a moment to ensure timestamp difference (SQLite datetime precision is 1 second)
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Mock empty API response
      vi.spyOn(MusicBrainzService.prototype, 'fetchReleaseGroups').mockResolvedValue([])

      const result = await service.refreshArtist(testArtistId)

      // Verify timestamp was updated
      const updatedArtist = db
        .prepare('SELECT updated_at FROM Artist WHERE id = ?')
        .get(testArtistId) as { updated_at: string }

      expect(new Date(updatedArtist.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(originalArtist.updated_at).getTime()
      )

      expect(result.updated_at).toBe(updatedArtist.updated_at)
    })

    it('should throw error when artist not found', async () => {
      const nonExistentId = 999999

      await expect(service.refreshArtist(nonExistentId)).rejects.toThrow('Artist not found')
    })

    it('should handle MusicBrainz API errors gracefully', async () => {
      // Mock API to throw error
      vi.spyOn(MusicBrainzService.prototype, 'fetchReleaseGroups').mockRejectedValue(
        new Error('MusicBrainz API unavailable')
      )

      await expect(service.refreshArtist(testArtistId)).rejects.toThrow(
        'MusicBrainz API unavailable'
      )
    })

    it('should return success with message when no new albums found', async () => {
      const db = getDatabase()

      // Add existing albums (use 'Missing' status to avoid path constraint)
      db.prepare(
        `
        INSERT INTO Album (artist_id, mbid, title, release_year, ownership_status)
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(
        testArtistId,
        '12345678-1234-1234-1234-123456789001',
        'The Dark Side of the Moon',
        1973,
        'Missing'
      )

      // Mock API to return only existing album
      const mockAlbums: AlbumResult[] = [
        {
          title: 'The Dark Side of the Moon',
          disambiguation: undefined,
          release_date: '1973-03-01',
          mbid: '12345678-1234-1234-1234-123456789001',
        },
      ]

      vi.spyOn(MusicBrainzService.prototype, 'fetchReleaseGroups').mockResolvedValue(mockAlbums)

      const result = await service.refreshArtist(testArtistId)

      expect(result.success).toBe(true)
      expect(result.albums_added).toBe(0)
      expect(result.message).toContain('No new albums found')
    })

    it('should extract release year from release_date', async () => {
      const mockAlbums: AlbumResult[] = [
        {
          title: 'The Dark Side of the Moon',
          disambiguation: undefined,
          release_date: '1973-03-01',
          mbid: '12345678-1234-1234-1234-123456789001',
        },
      ]

      vi.spyOn(MusicBrainzService.prototype, 'fetchReleaseGroups').mockResolvedValue(mockAlbums)

      await service.refreshArtist(testArtistId)

      const db = getDatabase()
      const album = db
        .prepare('SELECT release_year FROM Album WHERE mbid = ?')
        .get('12345678-1234-1234-1234-123456789001') as { release_year: number }

      expect(album.release_year).toBe(1973)
    })
  })

  describe('Concurrency Handling', () => {
    it('should prevent concurrent refreshes for the same artist', async () => {
      // Mock slow API call
      vi.spyOn(MusicBrainzService.prototype, 'fetchReleaseGroups').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      )

      // Start first refresh (don't await)
      const firstRefresh = service.refreshArtist(testArtistId)

      // Try to start second refresh immediately
      const secondRefresh = service.refreshArtist(testArtistId)

      // Second should fail with concurrent refresh error
      await expect(secondRefresh).rejects.toThrow('Refresh already in progress')

      // First should succeed
      await expect(firstRefresh).resolves.toHaveProperty('success', true)
    })

    it('should allow refresh after previous refresh completes', async () => {
      vi.spyOn(MusicBrainzService.prototype, 'fetchReleaseGroups').mockResolvedValue([])

      // First refresh
      const result1 = await service.refreshArtist(testArtistId)
      expect(result1.success).toBe(true)

      // Second refresh should succeed
      const result2 = await service.refreshArtist(testArtistId)
      expect(result2.success).toBe(true)
    })

    it('should allow concurrent refreshes for different artists', async () => {
      const db = getDatabase()

      // Create second test artist
      const result = db
        .prepare(
          `
        INSERT INTO Artist (mbid, name, sort_name)
        VALUES ('a74b1b7f-71a5-4011-9441-d0b5e4122711', 'Radiohead', 'Radiohead')
      `
        )
        .run()

      const secondArtistId = result.lastInsertRowid as number

      try {
        // Mock slow API calls
        vi.spyOn(MusicBrainzService.prototype, 'fetchReleaseGroups').mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve([]), 50))
        )

        // Start both refreshes concurrently
        const refresh1 = service.refreshArtist(testArtistId)
        const refresh2 = service.refreshArtist(secondArtistId)

        // Both should succeed
        const results = await Promise.all([refresh1, refresh2])
        expect(results[0].success).toBe(true)
        expect(results[1].success).toBe(true)
      } finally {
        // Clean up second artist
        db.prepare('DELETE FROM Album WHERE artist_id = ?').run(secondArtistId)
        db.prepare('DELETE FROM Artist WHERE id = ?').run(secondArtistId)
      }
    })

    it('should release lock even when refresh fails', async () => {
      // Mock API to fail
      vi.spyOn(MusicBrainzService.prototype, 'fetchReleaseGroups').mockRejectedValue(
        new Error('API Error')
      )

      // First refresh fails
      await expect(service.refreshArtist(testArtistId)).rejects.toThrow('API Error')

      // Mock API to succeed now
      vi.spyOn(MusicBrainzService.prototype, 'fetchReleaseGroups').mockResolvedValue([])

      // Second refresh should succeed (lock was released)
      const result = await service.refreshArtist(testArtistId)
      expect(result.success).toBe(true)
    })
  })
})
