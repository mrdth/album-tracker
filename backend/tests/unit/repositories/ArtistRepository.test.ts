/**
 * ArtistRepository Unit Tests
 *
 * Tests for Artist repository methods including statistics computation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Database } from 'better-sqlite3'
import { getDatabase } from '../../../src/db/connection'
import { ArtistRepository } from '../../../src/repositories/ArtistRepository'

describe('ArtistRepository', () => {
  let db: Database
  let testArtistId1: number
  let testArtistId2: number

  beforeEach(() => {
    db = getDatabase()

    // Clean up any existing test data
    db.prepare(
      'DELETE FROM Album WHERE artist_id IN (SELECT id FROM Artist WHERE mbid IN (?, ?))'
    ).run('a0b1c2d3-1234-5678-90ab-cdef12345001', 'a0b1c2d3-1234-5678-90ab-cdef12345002')
    db.prepare('DELETE FROM Artist WHERE mbid IN (?, ?)').run(
      'a0b1c2d3-1234-5678-90ab-cdef12345001',
      'a0b1c2d3-1234-5678-90ab-cdef12345002'
    )

    // Create test artist 1
    const result1 = db
      .prepare(
        `
      INSERT INTO Artist (mbid, name, sort_name, disambiguation)
      VALUES ('a0b1c2d3-1234-5678-90ab-cdef12345001', 'Radiohead', 'Radiohead', 'English rock band')
    `
      )
      .run()

    testArtistId1 = result1.lastInsertRowid as number

    // Create albums for artist 1 (5 total, 3 owned, 1 ambiguous, 1 missing)
    db.prepare(
      `
      INSERT INTO Album (artist_id, mbid, title, release_year, ownership_status, matched_folder_path)
      VALUES
        (?, 'a0b1c2d3-1234-5678-90ab-000000000001', 'OK Computer', 1997, 'Owned', '/music/Radiohead/[1997] OK Computer'),
        (?, 'a0b1c2d3-1234-5678-90ab-000000000002', 'Kid A', 2000, 'Owned', '/music/Radiohead/[2000] Kid A'),
        (?, 'a0b1c2d3-1234-5678-90ab-000000000003', 'In Rainbows', 2007, 'Owned', '/music/Radiohead/[2007] In Rainbows'),
        (?, 'a0b1c2d3-1234-5678-90ab-000000000004', 'The King of Limbs', 2011, 'Ambiguous', NULL),
        (?, 'a0b1c2d3-1234-5678-90ab-000000000005', 'A Moon Shaped Pool', 2016, 'Missing', NULL)
    `
    ).run(testArtistId1, testArtistId1, testArtistId1, testArtistId1, testArtistId1)

    // Create test artist 2
    const result2 = db
      .prepare(
        `
      INSERT INTO Artist (mbid, name, sort_name)
      VALUES ('a0b1c2d3-1234-5678-90ab-cdef12345002', 'The Beatles', 'Beatles, The')
    `
      )
      .run()

    testArtistId2 = result2.lastInsertRowid as number

    // Create albums for artist 2 (2 total, 2 owned = 100%)
    db.prepare(
      `
      INSERT INTO Album (artist_id, mbid, title, release_year, ownership_status, matched_folder_path)
      VALUES
        (?, 'a0b1c2d3-1234-5678-90ab-000000000006', 'Abbey Road', 1969, 'Owned', '/music/Beatles/[1969] Abbey Road'),
        (?, 'a0b1c2d3-1234-5678-90ab-000000000007', 'Sgt. Pepper', 1967, 'Owned', '/music/Beatles/[1967] Sgt. Pepper')
    `
    ).run(testArtistId2, testArtistId2)
  })

  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM Album WHERE artist_id IN (?, ?)').run(testArtistId1, testArtistId2)
    db.prepare('DELETE FROM Artist WHERE id IN (?, ?)').run(testArtistId1, testArtistId2)
  })

  describe('list()', () => {
    it('should return all artists with computed statistics', () => {
      const artists = ArtistRepository.list()

      expect(artists).toHaveLength(2)

      // Find artist 1
      const artist1 = artists.find(a => a.id === testArtistId1)
      expect(artist1).toBeDefined()
      expect(artist1!.name).toBe('Radiohead')
      expect(artist1!.total_albums).toBe(5)
      expect(artist1!.owned_albums).toBe(3)
      expect(artist1!.completion_percentage).toBe(60)

      // Find artist 2
      const artist2 = artists.find(a => a.id === testArtistId2)
      expect(artist2).toBeDefined()
      expect(artist2!.name).toBe('The Beatles')
      expect(artist2!.total_albums).toBe(2)
      expect(artist2!.owned_albums).toBe(2)
      expect(artist2!.completion_percentage).toBe(100)
    })

    it('should return empty array when no artists exist', () => {
      // Clean up all artists
      db.prepare('DELETE FROM Album').run()
      db.prepare('DELETE FROM Artist').run()

      const artists = ArtistRepository.list()

      expect(artists).toHaveLength(0)
      expect(Array.isArray(artists)).toBe(true)
    })

    it('should handle artists with no albums correctly', () => {
      // Create artist with no albums
      const result = db
        .prepare(
          `
        INSERT INTO Artist (mbid, name, sort_name)
        VALUES ('a0b1c2d3-1234-5678-90ab-cdef12340000', 'Empty Artist', 'Artist, Empty')
      `
        )
        .run()

      const emptyArtistId = result.lastInsertRowid as number

      const artists = ArtistRepository.list()

      const emptyArtist = artists.find(a => a.id === emptyArtistId)
      expect(emptyArtist).toBeDefined()
      expect(emptyArtist!.total_albums).toBe(0)
      expect(emptyArtist!.owned_albums).toBe(0)
      expect(emptyArtist!.completion_percentage).toBe(0)

      // Cleanup
      db.prepare('DELETE FROM Artist WHERE id = ?').run(emptyArtistId)
    })

    it('should include linked_folder_path when set', () => {
      // Update artist with linked folder
      db.prepare('UPDATE Artist SET linked_folder_path = ? WHERE id = ?').run(
        '/music/= R =/Radiohead',
        testArtistId1
      )

      const artists = ArtistRepository.list()

      const artist = artists.find(a => a.id === testArtistId1)
      expect(artist).toBeDefined()
      expect(artist!.linked_folder_path).toBe('/music/= R =/Radiohead')
    })

    it('should compute percentage as integer (no decimals)', () => {
      // Create artist with 3 albums, 1 owned (33.33...%)
      const result = db
        .prepare(
          `
        INSERT INTO Artist (mbid, name, sort_name)
        VALUES ('a0b1c2d3-1234-5678-90ab-cdef12345003', 'Pink Floyd', 'Pink Floyd')
      `
        )
        .run()

      const artistId = result.lastInsertRowid as number

      db.prepare(
        `
        INSERT INTO Album (artist_id, mbid, title, release_year, ownership_status, matched_folder_path)
        VALUES
          (?, 'a0b1c2d3-1234-5678-90ab-000000000008', 'Dark Side', 1973, 'Owned', '/music/Pink Floyd/[1973] Dark Side'),
          (?, 'a0b1c2d3-1234-5678-90ab-000000000009', 'The Wall', 1979, 'Missing', NULL),
          (?, 'a0b1c2d3-1234-5678-90ab-000000000010', 'Wish You Were Here', 1975, 'Missing', NULL)
      `
      ).run(artistId, artistId, artistId)

      const artists = ArtistRepository.list()

      const artist = artists.find(a => a.id === artistId)
      expect(artist).toBeDefined()
      expect(artist!.completion_percentage).toBe(33) // Rounded/truncated to integer

      // Cleanup
      db.prepare('DELETE FROM Album WHERE artist_id = ?').run(artistId)
      db.prepare('DELETE FROM Artist WHERE id = ?').run(artistId)
    })

    it('should return artists sorted by name by default', () => {
      const artists = ArtistRepository.list()

      expect(artists).toHaveLength(2)
      // "Radiohead" < "The Beatles" alphabetically (case-insensitive)
      expect(artists[0].name).toBe('Radiohead')
      expect(artists[1].name).toBe('The Beatles')
    })
  })
})
