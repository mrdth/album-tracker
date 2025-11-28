import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { app } from '../../../src/server'
import { getDatabase } from '../../../src/db/connection'

describe('Filesystem API Contract Tests', () => {
  let testArtistId: number

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
    db.prepare('DELETE FROM Album WHERE artist_id IN (SELECT id FROM Artist WHERE mbid = ?)').run(
      '12345678-1234-1234-1234-123456789012'
    )
    db.prepare('DELETE FROM Artist WHERE mbid = ?').run('12345678-1234-1234-1234-123456789012')
    db.prepare('DELETE FROM FilesystemCache').run()

    // Create test artist
    const result = db
      .prepare(
        `
      INSERT INTO Artist (mbid, name, sort_name)
      VALUES ('12345678-1234-1234-1234-123456789012', 'Test Artist', 'Artist, Test')
    `
      )
      .run()

    testArtistId = result.lastInsertRowid as number

    // Create test albums
    db.prepare(
      `
      INSERT INTO Album (artist_id, mbid, title, release_year, ownership_status)
      VALUES
        (?, '12345678-1234-1234-1234-123456789001', 'Test Album 1', 2020, 'Missing'),
        (?, '12345678-1234-1234-1234-123456789002', 'Test Album 2', 2021, 'Missing')
    `
    ).run(testArtistId, testArtistId)
  })

  afterEach(() => {
    const db = getDatabase()

    // Clean up test data
    db.prepare('DELETE FROM Album WHERE artist_id = ?').run(testArtistId)
    db.prepare('DELETE FROM Artist WHERE id = ?').run(testArtistId)
    db.prepare('DELETE FROM FilesystemCache').run()
  })

  afterAll(() => {
    const db = getDatabase()
    db.close()
  })

  describe('POST /api/filesystem/scan', () => {
    it('should trigger filesystem scan and return scan results', async () => {
      const response = await request(app)
        .post('/api/filesystem/scan')
        .send({ artist_id: testArtistId })
        .expect('Content-Type', /json/)
        .expect(200)

      // Verify response schema
      expect(response.body).toHaveProperty('artist_id', testArtistId)
      expect(response.body).toHaveProperty('scanned_folders')
      expect(response.body).toHaveProperty('matched_albums')
      expect(response.body).toHaveProperty('scan_completed_at')

      // Type validation
      expect(typeof response.body.artist_id).toBe('number')
      expect(typeof response.body.scanned_folders).toBe('number')
      expect(typeof response.body.matched_albums).toBe('number')
      expect(typeof response.body.scan_completed_at).toBe('string')

      // Value validation
      expect(response.body.scanned_folders).toBeGreaterThanOrEqual(0)
      expect(response.body.matched_albums).toBeGreaterThanOrEqual(0)
      expect(response.body.matched_albums).toBeLessThanOrEqual(response.body.scanned_folders)
    })

    it('should return 400 for missing artist_id', async () => {
      const response = await request(app)
        .post('/api/filesystem/scan')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/artist_id.*required/i)
    })

    it('should return 404 for nonexistent artist', async () => {
      const response = await request(app)
        .post('/api/filesystem/scan')
        .send({ artist_id: 99999 })
        .expect('Content-Type', /json/)
        .expect(404)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/artist.*not found/i)
    })

    it('should return 400 when library path not configured', async () => {
      const db = getDatabase()
      // Temporarily set library path to empty
      db.prepare('UPDATE Settings SET library_root_path = ? WHERE id = 1').run('')

      const response = await request(app)
        .post('/api/filesystem/scan')
        .send({ artist_id: testArtistId })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/library.*path.*not configured/i)

      // Restore library path
      db.prepare('UPDATE Settings SET library_root_path = ? WHERE id = 1').run('/tmp/test-library')
    })

    it('should preserve manual overrides during scan', async () => {
      const db = getDatabase()

      // Set one album as manual override
      db.prepare(
        `
        UPDATE Album
        SET ownership_status = 'Owned',
            matched_folder_path = '/manual/path',
            is_manual_override = 1
        WHERE artist_id = ? AND mbid = '12345678-1234-1234-1234-123456789001'
      `
      ).run(testArtistId)

      const response = await request(app)
        .post('/api/filesystem/scan')
        .send({ artist_id: testArtistId })
        .expect(200)

      // Verify manual override was preserved
      const album = db
        .prepare(
          `
        SELECT ownership_status, matched_folder_path, is_manual_override
        FROM Album
        WHERE artist_id = ? AND mbid = '12345678-1234-1234-1234-123456789001'
      `
        )
        .get(testArtistId) as any

      expect(album.ownership_status).toBe('Owned')
      expect(album.matched_folder_path).toBe('/manual/path')
      expect(album.is_manual_override).toBe(1)
    })
  })

  describe('GET /api/filesystem/browse', () => {
    it('should return directory listing with correct schema', async () => {
      const response = await request(app)
        .get('/api/filesystem/browse')
        .query({ path: '' })
        .expect('Content-Type', /json/)
        .expect(200)

      // Verify response schema
      expect(response.body).toHaveProperty('current_path')
      expect(response.body).toHaveProperty('parent_path')
      expect(response.body).toHaveProperty('directories')

      // Type validation
      expect(typeof response.body.current_path).toBe('string')
      expect(Array.isArray(response.body.directories)).toBe(true)

      // Each directory entry should have name and path
      if (response.body.directories.length > 0) {
        const dir = response.body.directories[0]
        expect(dir).toHaveProperty('name')
        expect(dir).toHaveProperty('path')
        expect(typeof dir.name).toBe('string')
        expect(typeof dir.path).toBe('string')
      }
    })

    it('should reject path traversal attempts', async () => {
      const response = await request(app)
        .get('/api/filesystem/browse')
        .query({ path: '../../../etc' })
        .expect('Content-Type', /json/)
        .expect(403)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/forbidden|invalid/i)
    })

    it('should reject absolute paths outside library root', async () => {
      const response = await request(app)
        .get('/api/filesystem/browse')
        .query({ path: '/etc/passwd' })
        .expect('Content-Type', /json/)
        .expect(403)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 404 for nonexistent directory', async () => {
      const response = await request(app)
        .get('/api/filesystem/browse')
        .query({ path: 'nonexistent/directory' })
        .expect('Content-Type', /json/)
        .expect(404)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/not found/i)
    })
  })
})
