/**
 * AlbumRepository Unit Tests
 *
 * Tests for Album repository methods including ignored albums functionality
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'better-sqlite3'
import { getDatabase } from '../../../src/db/connection.js'
import { AlbumRepository } from '../../../src/repositories/AlbumRepository.js'
import { ArtistRepository } from '../../../src/repositories/ArtistRepository.js'

describe('AlbumRepository - Ignored Albums', () => {
  let db: Database
  let testArtistId: number

  beforeEach(() => {
    db = getDatabase()

    // Clean up test data
    db.prepare('DELETE FROM Album WHERE artist_id IN (SELECT id FROM Artist WHERE mbid = ?)').run(
      'a0b0c0d0-0000-0000-0000-000000000001'
    )
    db.prepare('DELETE FROM Artist WHERE mbid = ?').run('a0b0c0d0-0000-0000-0000-000000000001')

    // Create test artist
    const artist = ArtistRepository.create({
      mbid: 'a0b0c0d0-0000-0000-0000-000000000001',
      name: 'Test Artist',
      sort_name: 'Artist, Test',
    })

    testArtistId = artist.id
  })

  describe('setIgnored()', () => {
    it('should set album as ignored', () => {
      // Create a Missing album
      const album = AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000001',
        title: 'Test Album',
        ownership_status: 'Missing',
      })

      const updated = AlbumRepository.setIgnored(album.id, true)

      expect(updated.is_ignored).toBe(true)
      expect(updated.id).toBe(album.id)
    })

    it('should un-ignore an ignored album', () => {
      // Create an ignored album
      const album = AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000002',
        title: 'Test Album 2',
        ownership_status: 'Missing',
      })

      // First ignore it
      AlbumRepository.setIgnored(album.id, true)

      // Then un-ignore
      const updated = AlbumRepository.setIgnored(album.id, false)

      expect(updated.is_ignored).toBe(false)
    })

    it('should throw error when ignoring owned album', () => {
      // Create an owned album
      const album = AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000003',
        title: 'Owned Album',
        ownership_status: 'Owned',
        matched_folder_path: '/music/Test/Album',
      })

      expect(() => AlbumRepository.setIgnored(album.id, true)).toThrow('Cannot ignore owned albums')
    })

    it('should throw error when album not found', () => {
      expect(() => AlbumRepository.setIgnored(99999, true)).toThrow('Album not found')
    })

    it('should allow ignoring ambiguous albums', () => {
      const album = AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000004',
        title: 'Ambiguous Album',
        ownership_status: 'Ambiguous',
        match_confidence: 0.5,
      })

      const updated = AlbumRepository.setIgnored(album.id, true)

      expect(updated.is_ignored).toBe(true)
      expect(updated.ownership_status).toBe('Ambiguous')
    })
  })

  describe('findByArtistId() with includeIgnored parameter', () => {
    beforeEach(() => {
      // Create test albums: 2 normal, 2 ignored
      AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000010',
        title: 'Normal Album 1',
        ownership_status: 'Missing',
      })

      AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000011',
        title: 'Normal Album 2',
        ownership_status: 'Owned',
        matched_folder_path: '/music/Test/Album2',
      })

      const ignored1 = AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000012',
        title: 'Ignored Album 1',
        ownership_status: 'Missing',
      })
      AlbumRepository.setIgnored(ignored1.id, true)

      const ignored2 = AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000013',
        title: 'Ignored Album 2',
        ownership_status: 'Ambiguous',
        match_confidence: 0.6,
      })
      AlbumRepository.setIgnored(ignored2.id, true)
    })

    it('should exclude ignored albums by default', () => {
      const albums = AlbumRepository.findByArtistId(testArtistId)

      expect(albums).toHaveLength(2)
      expect(albums.every(a => !a.is_ignored)).toBe(true)
    })

    it('should include ignored albums when includeIgnored=true', () => {
      const albums = AlbumRepository.findByArtistId(testArtistId, true)

      expect(albums).toHaveLength(4)
      expect(albums.filter(a => a.is_ignored)).toHaveLength(2)
      expect(albums.filter(a => !a.is_ignored)).toHaveLength(2)
    })

    it('should return empty array when all albums are ignored and includeIgnored=false', () => {
      // Ignore all non-owned albums
      const allAlbums = AlbumRepository.findByArtistId(testArtistId, true)
      allAlbums
        .filter(a => a.ownership_status !== 'Owned')
        .forEach(a => AlbumRepository.setIgnored(a.id, true))

      const visibleAlbums = AlbumRepository.findByArtistId(testArtistId)

      // Should only have the 1 owned album
      expect(visibleAlbums).toHaveLength(1)
      expect(visibleAlbums[0].ownership_status).toBe('Owned')
    })
  })

  describe('countByArtist() excluding ignored albums', () => {
    it('should exclude ignored albums from counts', () => {
      // Create 3 albums: 1 owned, 1 missing, 1 ignored missing
      AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000020',
        title: 'Owned Album',
        ownership_status: 'Owned',
        matched_folder_path: '/music/Test/Owned',
      })

      AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000021',
        title: 'Missing Album',
        ownership_status: 'Missing',
      })

      const ignored = AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000022',
        title: 'Ignored Missing Album',
        ownership_status: 'Missing',
      })
      AlbumRepository.setIgnored(ignored.id, true)

      const counts = AlbumRepository.countByArtist(testArtistId)

      expect(counts.total).toBe(2) // Excludes ignored
      expect(counts.owned).toBe(1)
    })

    it('should return zero counts when all albums are ignored', () => {
      const album1 = AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000030',
        title: 'Album 1',
        ownership_status: 'Missing',
      })

      const album2 = AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000031',
        title: 'Album 2',
        ownership_status: 'Ambiguous',
        match_confidence: 0.7,
      })

      AlbumRepository.setIgnored(album1.id, true)
      AlbumRepository.setIgnored(album2.id, true)

      const counts = AlbumRepository.countByArtist(testArtistId)

      expect(counts.total).toBe(0)
      expect(counts.owned).toBe(0)
    })

    it('should count owned albums even if other albums are ignored', () => {
      AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000040',
        title: 'Owned 1',
        ownership_status: 'Owned',
        matched_folder_path: '/music/Test/Owned1',
      })

      AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000041',
        title: 'Owned 2',
        ownership_status: 'Owned',
        matched_folder_path: '/music/Test/Owned2',
      })

      const ignored = AlbumRepository.create({
        artist_id: testArtistId,
        mbid: 'a1b1c1d1-0000-0000-0000-000000000042',
        title: 'Ignored Missing',
        ownership_status: 'Missing',
      })
      AlbumRepository.setIgnored(ignored.id, true)

      const counts = AlbumRepository.countByArtist(testArtistId)

      expect(counts.total).toBe(2)
      expect(counts.owned).toBe(2)
    })
  })
})
