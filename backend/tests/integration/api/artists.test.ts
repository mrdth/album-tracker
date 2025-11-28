/**
 * Artists API Contract Tests
 *
 * Tests for artist-related API endpoints including statistics
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../../src/server'
import { getDatabase } from '../../../src/db/connection'

describe('Artists API Contract Tests', () => {
  let testArtistId1: number
  let testArtistId2: number

  beforeAll(async () => {
    const db = getDatabase()

    // Ensure Settings table has default row
    const settings = db.prepare('SELECT * FROM Settings WHERE id = 1').get()
    if (!settings) {
      db.prepare(
        `
        INSERT INTO Settings (id, library_root_path, similarity_threshold, api_rate_limit_ms, max_api_retries)
        VALUES (1, '/tmp/test-library', 0.80, 1000, 3)
      `
      ).run()
    }
  })

  beforeEach(() => {
    const db = getDatabase()

    // Clean up any existing test data first
    db.prepare(
      'DELETE FROM Album WHERE artist_id IN (SELECT id FROM Artist WHERE mbid IN (?, ?))'
    ).run('12345678-1234-1234-1234-123456789001', '12345678-1234-1234-1234-123456789002')
    db.prepare('DELETE FROM Artist WHERE mbid IN (?, ?)').run(
      '12345678-1234-1234-1234-123456789001',
      '12345678-1234-1234-1234-123456789002'
    )

    // Create test artist 1 with albums
    const result1 = db
      .prepare(
        `
      INSERT INTO Artist (mbid, name, sort_name)
      VALUES ('12345678-1234-1234-1234-123456789001', 'Test Artist 1', 'Artist 1, Test')
    `
      )
      .run()

    testArtistId1 = result1.lastInsertRowid as number

    // Create albums for artist 1 (3 total, 2 owned)
    db.prepare(
      `
      INSERT INTO Album (artist_id, mbid, title, release_year, ownership_status, matched_folder_path)
      VALUES
        (?, '12345678-1234-1234-1234-111111111111', 'Album 1', 2020, 'Owned', '/music/Test/[2020] Album 1'),
        (?, '12345678-1234-1234-1234-111111111112', 'Album 2', 2021, 'Owned', '/music/Test/[2021] Album 2'),
        (?, '12345678-1234-1234-1234-111111111113', 'Album 3', 2022, 'Missing', NULL)
    `
    ).run(testArtistId1, testArtistId1, testArtistId1)

    // Create test artist 2 with albums
    const result2 = db
      .prepare(
        `
      INSERT INTO Artist (mbid, name, sort_name)
      VALUES ('12345678-1234-1234-1234-123456789002', 'Test Artist 2', 'Artist 2, Test')
    `
      )
      .run()

    testArtistId2 = result2.lastInsertRowid as number

    // Create albums for artist 2 (2 total, 1 owned)
    db.prepare(
      `
      INSERT INTO Album (artist_id, mbid, title, release_year, ownership_status, matched_folder_path)
      VALUES
        (?, '12345678-1234-1234-1234-222222222221', 'Album A', 2018, 'Owned', '/music/Test2/[2018] Album A'),
        (?, '12345678-1234-1234-1234-222222222222', 'Album B', 2019, 'Ambiguous', NULL)
    `
    ).run(testArtistId2, testArtistId2)
  })

  afterEach(() => {
    const db = getDatabase()

    // Clean up test data
    db.prepare('DELETE FROM Album WHERE artist_id IN (?, ?)').run(testArtistId1, testArtistId2)
    db.prepare('DELETE FROM Artist WHERE id IN (?, ?)').run(testArtistId1, testArtistId2)
  })

  afterAll(() => {
    const db = getDatabase()
    db.close()
  })

  describe('GET /api/artists', () => {
    it('should return all artists with correct schema and statistics', async () => {
      const response = await request(app)
        .get('/api/artists')
        .expect('Content-Type', /json/)
        .expect(200)

      // Should return array
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(2)

      // Verify each artist has required fields
      const artist1 = response.body.find((a: any) => a.id === testArtistId1)
      expect(artist1).toBeDefined()

      // Required fields
      expect(artist1).toHaveProperty('id', testArtistId1)
      expect(artist1).toHaveProperty('mbid', '12345678-1234-1234-1234-123456789001')
      expect(artist1).toHaveProperty('name', 'Test Artist 1')
      expect(artist1).toHaveProperty('sort_name', 'Artist 1, Test')
      expect(artist1).toHaveProperty('created_at')
      expect(artist1).toHaveProperty('updated_at')

      // Computed statistics fields
      expect(artist1).toHaveProperty('total_albums')
      expect(artist1).toHaveProperty('owned_albums')
      expect(artist1).toHaveProperty('completion_percentage')

      // Type validation
      expect(typeof artist1.id).toBe('number')
      expect(typeof artist1.mbid).toBe('string')
      expect(typeof artist1.name).toBe('string')
      expect(typeof artist1.total_albums).toBe('number')
      expect(typeof artist1.owned_albums).toBe('number')
      expect(typeof artist1.completion_percentage).toBe('number')

      // Value validation for artist 1 (3 total, 2 owned = 66.67%)
      expect(artist1.total_albums).toBe(3)
      expect(artist1.owned_albums).toBe(2)
      expect(artist1.completion_percentage).toBeCloseTo(66.67, 1)

      // Verify artist 2 statistics (2 total, 1 owned = 50%)
      const artist2 = response.body.find((a: any) => a.id === testArtistId2)
      expect(artist2).toBeDefined()
      expect(artist2.total_albums).toBe(2)
      expect(artist2.owned_albums).toBe(1)
      expect(artist2.completion_percentage).toBe(50)
    })

    it('should return empty array when no artists exist', async () => {
      const db = getDatabase()

      // Clean up all artists
      db.prepare('DELETE FROM Album').run()
      db.prepare('DELETE FROM Artist').run()

      const response = await request(app)
        .get('/api/artists')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(0)
    })

    it('should handle artists with no albums correctly', async () => {
      const db = getDatabase()

      // Clean up first to ensure clean state
      db.prepare('DELETE FROM Album').run()
      db.prepare('DELETE FROM Artist').run()

      // Create artist with no albums
      const result = db
        .prepare(
          `
        INSERT INTO Artist (mbid, name, sort_name)
        VALUES ('12345678-1234-1234-1234-123456789999', 'Empty Artist', 'Artist, Empty')
      `
        )
        .run()

      const emptyArtistId = result.lastInsertRowid as number

      const response = await request(app).get('/api/artists').expect(200)

      const emptyArtist = response.body.find((a: any) => a.id === emptyArtistId)
      expect(emptyArtist).toBeDefined()
      expect(emptyArtist.total_albums).toBe(0)
      expect(emptyArtist.owned_albums).toBe(0)
      expect(emptyArtist.completion_percentage).toBe(0)

      // Cleanup
      db.prepare('DELETE FROM Artist WHERE id = ?').run(emptyArtistId)
    })
  })
})
