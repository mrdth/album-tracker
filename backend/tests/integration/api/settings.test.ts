import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../../src/server'
import { getDatabase } from '../../../src/db/connection'
import * as fs from 'fs/promises'

describe('Settings API Contract Tests', () => {
  beforeAll(async () => {
    // Create test directories
    await fs.mkdir('/tmp/test-library', { recursive: true })
    await fs.mkdir('/tmp/test-music', { recursive: true })

    // Initialize test database
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

  afterAll(async () => {
    // Cleanup test directories
    await fs.rm('/tmp/test-library', { recursive: true, force: true })
    await fs.rm('/tmp/test-music', { recursive: true, force: true })

    // Cleanup database
    const db = getDatabase()
    db.close()
  })

  describe('GET /api/settings', () => {
    it('should return settings with correct schema', async () => {
      const response = await request(app)
        .get('/api/settings')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('id', 1)
      expect(response.body).toHaveProperty('library_root_path')
      expect(response.body).toHaveProperty('similarity_threshold')
      expect(response.body).toHaveProperty('api_rate_limit_ms')
      expect(response.body).toHaveProperty('max_api_retries')
      expect(response.body).toHaveProperty('updated_at')

      // Type validation
      expect(typeof response.body.id).toBe('number')
      expect(typeof response.body.library_root_path).toBe('string')
      expect(typeof response.body.similarity_threshold).toBe('number')
      expect(typeof response.body.api_rate_limit_ms).toBe('number')
      expect(typeof response.body.max_api_retries).toBe('number')
      expect(typeof response.body.updated_at).toBe('string')

      // Value validation
      expect(response.body.similarity_threshold).toBeGreaterThanOrEqual(0)
      expect(response.body.similarity_threshold).toBeLessThanOrEqual(1)
      expect(response.body.api_rate_limit_ms).toBeGreaterThanOrEqual(500)
      expect(response.body.max_api_retries).toBeGreaterThanOrEqual(1)
    })
  })

  describe('PATCH /api/settings', () => {
    it('should update library_root_path with valid absolute path', async () => {
      const response = await request(app)
        .patch('/api/settings')
        .send({ library_root_path: '/tmp/test-music' })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('library_root_path', '/tmp/test-music')
      expect(response.body).toHaveProperty('updated_at')
    })

    it('should reject relative paths', async () => {
      const response = await request(app)
        .patch('/api/settings')
        .send({ library_root_path: '../etc/passwd' })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/absolute path/i)
    })

    it('should reject nonexistent paths', async () => {
      const response = await request(app)
        .patch('/api/settings')
        .send({ library_root_path: '/nonexistent/path/to/nowhere' })
        .expect('Content-Type', /json/)
        .expect(404)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/does not exist/i)
    })

    it('should reject paths with path traversal attempts', async () => {
      const response = await request(app)
        .patch('/api/settings')
        .send({ library_root_path: '/tmp/../etc/passwd' })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should update similarity_threshold within valid range', async () => {
      const response = await request(app)
        .patch('/api/settings')
        .send({ similarity_threshold: 0.75 })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('similarity_threshold', 0.75)
    })

    it('should reject similarity_threshold outside valid range', async () => {
      const response = await request(app)
        .patch('/api/settings')
        .send({ similarity_threshold: 1.5 })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/between 0 and 1/i)
    })

    it('should update multiple settings at once', async () => {
      const response = await request(app)
        .patch('/api/settings')
        .send({
          similarity_threshold: 0.85,
          api_rate_limit_ms: 1500,
          max_api_retries: 5,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body.similarity_threshold).toBe(0.85)
      expect(response.body.api_rate_limit_ms).toBe(1500)
      expect(response.body.max_api_retries).toBe(5)
    })

    it('should reject invalid field types', async () => {
      const response = await request(app)
        .patch('/api/settings')
        .send({ similarity_threshold: 'invalid' })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should ignore unknown fields', async () => {
      const response = await request(app)
        .patch('/api/settings')
        .send({
          similarity_threshold: 0.8,
          unknown_field: 'should be ignored',
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).not.toHaveProperty('unknown_field')
      expect(response.body.similarity_threshold).toBe(0.8)
    })
  })
})
