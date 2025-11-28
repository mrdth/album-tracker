/**
 * Albums API Contract Tests
 *
 * Tests for album-related API endpoints including manual overrides
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../../src/server'
import { getDatabase } from '../../../src/db/connection'
import * as fs from 'fs/promises'

describe('Albums API Contract Tests', () => {
  let testArtistId: number
  let testAlbumId1: number
  let testAlbumId2: number

  beforeAll(async () => {
    const db = getDatabase()

    // Update Settings to use test library path
    db.prepare('UPDATE Settings SET library_root_path = ? WHERE id = 1').run('/tmp/test-library')

    // Create test directories
    await fs.mkdir('/tmp/test-library', { recursive: true })
    await fs.mkdir('/tmp/test-library/TestArtist', { recursive: true })
    await fs.mkdir('/tmp/test-library/TestArtist/[2020] Test Album', { recursive: true })
  })

  beforeEach(() => {
    const db = getDatabase()

    // Clean up any existing test data
    db.prepare('DELETE FROM Album WHERE artist_id IN (SELECT id FROM Artist WHERE mbid = ?)').run(
      '88888888-1234-5678-90ab-cdef12345000'
    )
    db.prepare('DELETE FROM Artist WHERE mbid = ?').run('88888888-1234-5678-90ab-cdef12345000')

    // Create test artist
    const result = db
      .prepare(
        `
      INSERT INTO Artist (mbid, name, sort_name)
      VALUES ('88888888-1234-5678-90ab-cdef12345000', 'Test Artist', 'Artist, Test')
    `
      )
      .run()

    testArtistId = result.lastInsertRowid as number

    // Create test albums
    const album1 = db
      .prepare(
        `
      INSERT INTO Album (artist_id, mbid, title, release_year, ownership_status)
      VALUES (?, '88888888-1234-5678-90ab-000000000001', 'Test Album 1', 2020, 'Missing')
    `
      )
      .run(testArtistId)

    testAlbumId1 = album1.lastInsertRowid as number

    const album2 = db
      .prepare(
        `
      INSERT INTO Album (artist_id, mbid, title, release_year, ownership_status)
      VALUES (?, '88888888-1234-5678-90ab-000000000002', 'Test Album 2', 2021, 'Ambiguous')
    `
      )
      .run(testArtistId)

    testAlbumId2 = album2.lastInsertRowid as number
  })

  afterEach(() => {
    const db = getDatabase()
    db.prepare('DELETE FROM Album WHERE artist_id = ?').run(testArtistId)
    db.prepare('DELETE FROM Artist WHERE id = ?').run(testArtistId)
  })

  afterAll(async () => {
    const db = getDatabase()
    db.close()

    // Cleanup test directories
    await fs.rm('/tmp/test-library', { recursive: true, force: true })
  })

  describe('PATCH /api/albums/:albumId', () => {
    it('should manually link album to folder path', async () => {
      const response = await request(app)
        .patch(`/api/albums/${testAlbumId1}`)
        .send({ matched_folder_path: 'TestArtist/[2020] Test Album' })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('id', testAlbumId1)
      expect(response.body).toHaveProperty(
        'matched_folder_path',
        '/tmp/test-library/TestArtist/[2020] Test Album'
      )
      expect(response.body).toHaveProperty('ownership_status', 'Owned')
      expect(response.body).toHaveProperty('is_manual_override', true)
    })

    it('should reject invalid folder path', async () => {
      const response = await request(app)
        .patch(`/api/albums/${testAlbumId1}`)
        .send({ matched_folder_path: '/nonexistent/path' })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/invalid path|library root/i)
    })

    it('should reject relative folder path', async () => {
      const response = await request(app)
        .patch(`/api/albums/${testAlbumId1}`)
        .send({ matched_folder_path: '../../../etc/passwd' })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/invalid path|library root/i)
    })

    it('should reject path traversal attempts', async () => {
      const response = await request(app)
        .patch(`/api/albums/${testAlbumId1}`)
        .send({ matched_folder_path: '/tmp/../etc/passwd' })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/invalid path|library root/i)
    })

    it('should allow manual ownership toggle to Owned', async () => {
      // First, link a folder to the album
      await request(app)
        .patch(`/api/albums/${testAlbumId1}`)
        .send({ matched_folder_path: 'TestArtist/[2020] Test Album' })
        .expect(200)

      // Then toggle to Missing
      await request(app)
        .patch(`/api/albums/${testAlbumId1}`)
        .send({ ownership_status: 'Missing' })
        .expect(200)

      // Now toggle back to Owned (album still has matched_folder_path)
      const response = await request(app)
        .patch(`/api/albums/${testAlbumId1}`)
        .send({ ownership_status: 'Owned' })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('ownership_status', 'Owned')
      expect(response.body).toHaveProperty('is_manual_override', true)
    })

    it('should allow manual ownership toggle to Missing', async () => {
      const response = await request(app)
        .patch(`/api/albums/${testAlbumId2}`)
        .send({ ownership_status: 'Missing' })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('ownership_status', 'Missing')
      expect(response.body).toHaveProperty('is_manual_override', true)
    })

    it('should clear manual override when clear_override is true', async () => {
      // First set a manual override
      await request(app)
        .patch(`/api/albums/${testAlbumId1}`)
        .send({ matched_folder_path: 'TestArtist/[2020] Test Album' })
        .expect(200)

      // Then clear it
      const response = await request(app)
        .patch(`/api/albums/${testAlbumId1}`)
        .send({ clear_override: true })
        .expect(200)

      expect(response.body).toHaveProperty('is_manual_override', false)
    })

    it('should return 404 for nonexistent album', async () => {
      const response = await request(app)
        .patch('/api/albums/99999')
        .send({ ownership_status: 'Owned' })
        .expect('Content-Type', /json/)
        .expect(404)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/album.*not found/i)
    })

    it('should reject invalid ownership status', async () => {
      const response = await request(app)
        .patch(`/api/albums/${testAlbumId1}`)
        .send({ ownership_status: 'Invalid' })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 when no valid fields provided', async () => {
      const response = await request(app)
        .patch(`/api/albums/${testAlbumId1}`)
        .send({ unknown_field: 'value' })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/no.*fields/i)
    })
  })
})
