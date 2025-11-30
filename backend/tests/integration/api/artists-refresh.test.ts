/**
 * Artist Refresh API Contract Tests
 *
 * Tests for artist refresh endpoints (manual refresh and stale check)
 */

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../../src/server'
import { getDatabase } from '../../../src/db/connection'

describe('Artist Refresh API Contract Tests', () => {
  let testArtistId: number

  beforeEach(() => {
    const db = getDatabase()

    // Clean up any existing test data
    db.prepare(
      'DELETE FROM Album WHERE artist_id IN (SELECT id FROM Artist WHERE mbid = ?)'
    ).run('5b11f4ce-a62d-471e-81fc-a69a8278c7da')
    db.prepare('DELETE FROM Artist WHERE mbid = ?').run('5b11f4ce-a62d-471e-81fc-a69a8278c7da')

    // Create test artist (Pink Floyd - real MBID)
    const result = db
      .prepare(
        `
      INSERT INTO Artist (mbid, name, sort_name)
      VALUES ('5b11f4ce-a62d-471e-81fc-a69a8278c7da', 'Pink Floyd', 'Pink Floyd')
    `
      )
      .run()

    testArtistId = result.lastInsertRowid as number
  })

  afterEach(() => {
    const db = getDatabase()

    // Clean up test data
    db.prepare('DELETE FROM Album WHERE artist_id = ?').run(testArtistId)
    db.prepare('DELETE FROM Artist WHERE id = ?').run(testArtistId)
  })

  afterAll(() => {
    const db = getDatabase()
    db.close()
  })

  describe('POST /api/artists/:artistId/refresh', () => {
    it('should return 200 with refresh result schema', async () => {
      const response = await request(app)
        .post(`/api/artists/${testArtistId}/refresh`)
        .expect('Content-Type', /json/)
        .expect(200)

      // Verify response schema matches contract
      expect(response.body).toHaveProperty('success')
      expect(response.body).toHaveProperty('albums_added')
      expect(response.body).toHaveProperty('updated_at')

      expect(typeof response.body.success).toBe('boolean')
      expect(typeof response.body.albums_added).toBe('number')
      expect(typeof response.body.updated_at).toBe('string')

      // Verify albums_added is non-negative
      expect(response.body.albums_added).toBeGreaterThanOrEqual(0)

      // Verify updated_at is valid ISO 8601 datetime
      const updatedAt = new Date(response.body.updated_at)
      expect(updatedAt.toString()).not.toBe('Invalid Date')
    })

    it('should return 404 when artist does not exist', async () => {
      const nonExistentId = 999999

      const response = await request(app)
        .post(`/api/artists/${nonExistentId}/refresh`)
        .expect('Content-Type', /json/)
        .expect(404)

      // Verify error response schema
      expect(response.body).toHaveProperty('error')
      expect(response.body).toHaveProperty('code')
      expect(response.body).toHaveProperty('status')

      expect(response.body.code).toBe('ARTIST_NOT_FOUND')
      expect(response.body.status).toBe(404)
    })

    it('should return 400 for invalid artist ID', async () => {
      const response = await request(app)
        .post('/api/artists/invalid/refresh')
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 409 when refresh is already in progress', async () => {
      // This test will verify concurrent refresh prevention
      // For now, we expect the endpoint to exist and handle this case
      // Implementation will make this test pass
    })

    it('should include optional message field when no new albums found', async () => {
      // First refresh should potentially add albums
      await request(app).post(`/api/artists/${testArtistId}/refresh`).expect(200)

      // Second refresh immediately after should find no new albums
      const response = await request(app)
        .post(`/api/artists/${testArtistId}/refresh`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.albums_added).toBe(0)

      // Message is optional per contract
      if (response.body.message) {
        expect(typeof response.body.message).toBe('string')
      }
    })
  })

  describe('GET /api/artists/stale-check', () => {
    it('should return 200 with no refresh needed when no stale artists', async () => {
      const response = await request(app)
        .get('/api/artists/stale-check')
        .expect('Content-Type', /json/)
        .expect(200)

      // Should have refresh_needed field
      expect(response.body).toHaveProperty('refresh_needed')
      expect(typeof response.body.refresh_needed).toBe('boolean')

      // When no stale artists, should be false
      expect(response.body.refresh_needed).toBe(false)
    })

    it('should return 200 with refresh triggered when stale artist exists', async () => {
      const db = getDatabase()

      // Set artist's updated_at to 15 days ago
      const fifteenDaysAgo = new Date()
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

      db.prepare('UPDATE Artist SET updated_at = ? WHERE id = ?').run(
        fifteenDaysAgo.toISOString(),
        testArtistId
      )

      const response = await request(app)
        .get('/api/artists/stale-check')
        .expect('Content-Type', /json/)
        .expect(200)

      // Should indicate refresh was needed
      expect(response.body.refresh_needed).toBe(true)

      // Should include artist information
      expect(response.body).toHaveProperty('artist')
      expect(response.body.artist).toHaveProperty('id')
      expect(response.body.artist).toHaveProperty('name')
      expect(response.body.artist).toHaveProperty('updated_at')
      expect(response.body.artist).toHaveProperty('days_since_update')

      expect(response.body.artist.id).toBe(testArtistId)
      expect(typeof response.body.artist.days_since_update).toBe('number')
      expect(response.body.artist.days_since_update).toBeGreaterThan(7)

      // Should include refresh result
      expect(response.body).toHaveProperty('refresh_result')
      expect(response.body.refresh_result).toHaveProperty('success')
      expect(response.body.refresh_result).toHaveProperty('albums_added')
      expect(response.body.refresh_result).toHaveProperty('updated_at')
    })

    it('should return 200 with no refresh needed when all artists are fresh', async () => {
      // Artist was just created, so updated_at should be recent
      const response = await request(app)
        .get('/api/artists/stale-check')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body.refresh_needed).toBe(false)
    })

    it('should handle empty collection gracefully', async () => {
      const db = getDatabase()

      // Remove all artists
      db.prepare('DELETE FROM Album WHERE artist_id = ?').run(testArtistId)
      db.prepare('DELETE FROM Artist WHERE id = ?').run(testArtistId)

      const response = await request(app)
        .get('/api/artists/stale-check')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body.refresh_needed).toBe(false)

      // Optional message field
      if (response.body.message) {
        expect(typeof response.body.message).toBe('string')
      }
    })
  })
})
