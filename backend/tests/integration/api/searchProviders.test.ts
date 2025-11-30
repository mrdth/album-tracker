import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../../../src/server'
import { getDatabase } from '../../../src/db/connection'

describe('Search Providers API Contract Tests', () => {
  beforeAll(async () => {
    // Initialize test database
    const db = getDatabase()
    // Ensure Settings table has default row
    const settings = db.prepare('SELECT * FROM Settings WHERE id = 1').get()
    if (!settings) {
      db.prepare(
        `
        INSERT INTO Settings (id, library_root_path, similarity_threshold, api_rate_limit_ms, max_api_retries, search_providers)
        VALUES (1, '/music', 0.80, 1000, 3, '[]')
      `
      ).run()
    }
  })

  beforeEach(() => {
    // Reset search_providers to empty array before each test
    const db = getDatabase()
    db.prepare('UPDATE Settings SET search_providers = ? WHERE id = 1').run('[]')
  })

  afterAll(() => {
    // Cleanup database
    const db = getDatabase()
    db.close()
  })

  describe('GET /api/settings/search-providers', () => {
    it('should return empty array when no providers exist', async () => {
      const response = await request(app)
        .get('/api/settings/search-providers')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('providers')
      expect(Array.isArray(response.body.providers)).toBe(true)
      expect(response.body.providers).toHaveLength(0)
    })

    it('should return all providers with correct schema', async () => {
      // Manually insert test providers
      const db = getDatabase()
      const testProviders = [
        {
          id: 1701360000000,
          name: 'Discogs',
          urlTemplate: 'https://discogs.com/search?q={artist}+{album}',
          createdAt: '2025-11-30T10:00:00.000Z',
          updatedAt: '2025-11-30T10:00:00.000Z'
        },
        {
          id: 1701360001000,
          name: 'MusicBrainz',
          urlTemplate: 'https://musicbrainz.org/search?query={artist}+{album}',
          createdAt: '2025-11-30T10:00:01.000Z',
          updatedAt: '2025-11-30T10:00:01.000Z'
        }
      ]
      db.prepare('UPDATE Settings SET search_providers = ? WHERE id = 1').run(
        JSON.stringify(testProviders)
      )

      const response = await request(app)
        .get('/api/settings/search-providers')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body.providers).toHaveLength(2)

      const provider = response.body.providers[0]
      expect(provider).toHaveProperty('id')
      expect(provider).toHaveProperty('name')
      expect(provider).toHaveProperty('urlTemplate')
      expect(provider).toHaveProperty('createdAt')
      expect(provider).toHaveProperty('updatedAt')

      // Type validation
      expect(typeof provider.id).toBe('number')
      expect(typeof provider.name).toBe('string')
      expect(typeof provider.urlTemplate).toBe('string')
      expect(typeof provider.createdAt).toBe('string')
      expect(typeof provider.updatedAt).toBe('string')

      // Value validation
      expect(provider.name).toBe('Discogs')
      expect(provider.urlTemplate).toMatch(/^https?:\/\//)
    })
  })

  describe('POST /api/settings/search-providers', () => {
    it('should create a new provider with valid data', async () => {
      const response = await request(app)
        .post('/api/settings/search-providers')
        .send({
          name: 'Discogs',
          urlTemplate: 'https://discogs.com/search?q={artist}+{album}'
        })
        .expect('Content-Type', /json/)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('name', 'Discogs')
      expect(response.body).toHaveProperty(
        'urlTemplate',
        'https://discogs.com/search?q={artist}+{album}'
      )
      expect(response.body).toHaveProperty('createdAt')
      expect(response.body).toHaveProperty('updatedAt')

      // Verify ID is a timestamp
      expect(response.body.id).toBeGreaterThan(0)

      // Verify timestamps are ISO 8601
      expect(response.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(response.body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should persist the new provider to database', async () => {
      await request(app)
        .post('/api/settings/search-providers')
        .send({
          name: 'Test Provider',
          urlTemplate: 'https://example.com/search?q={artist}'
        })
        .expect(201)

      // Verify it was persisted
      const response = await request(app)
        .get('/api/settings/search-providers')
        .expect(200)

      expect(response.body.providers).toHaveLength(1)
      expect(response.body.providers[0].name).toBe('Test Provider')
    })

    it('should reject empty name', async () => {
      const response = await request(app)
        .post('/api/settings/search-providers')
        .send({
          name: '',
          urlTemplate: 'https://example.com'
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('Provider name is required')
    })

    it('should reject missing name', async () => {
      const response = await request(app)
        .post('/api/settings/search-providers')
        .send({
          urlTemplate: 'https://example.com'
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should reject empty URL template', async () => {
      const response = await request(app)
        .post('/api/settings/search-providers')
        .send({
          name: 'Test',
          urlTemplate: ''
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('URL template is required')
    })

    it('should reject missing URL template', async () => {
      const response = await request(app)
        .post('/api/settings/search-providers')
        .send({
          name: 'Test'
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should reject URL template without http:// or https://', async () => {
      const response = await request(app)
        .post('/api/settings/search-providers')
        .send({
          name: 'Test',
          urlTemplate: 'ftp://example.com'
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('must start with http:// or https://')
    })

    it('should reject name longer than 100 characters', async () => {
      const response = await request(app)
        .post('/api/settings/search-providers')
        .send({
          name: 'x'.repeat(101),
          urlTemplate: 'https://example.com'
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('100 characters or less')
    })

    it('should reject name with leading/trailing whitespace', async () => {
      const response = await request(app)
        .post('/api/settings/search-providers')
        .send({
          name: '  Test  ',
          urlTemplate: 'https://example.com'
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('leading or trailing whitespace')
    })
  })

  describe('PUT /api/settings/search-providers/:id', () => {
    let providerId: number

    beforeEach(async () => {
      // Create a provider for update tests
      const response = await request(app)
        .post('/api/settings/search-providers')
        .send({
          name: 'Original Name',
          urlTemplate: 'https://original.com'
        })
        .expect(201)

      providerId = response.body.id
    })

    it('should update provider name', async () => {
      const response = await request(app)
        .put(`/api/settings/search-providers/${providerId}`)
        .send({
          name: 'Updated Name'
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('id', providerId)
      expect(response.body).toHaveProperty('name', 'Updated Name')
      expect(response.body).toHaveProperty('urlTemplate', 'https://original.com')
      expect(response.body).toHaveProperty('updatedAt')

      // updatedAt should be different from createdAt
      expect(response.body.updatedAt).not.toBe(response.body.createdAt)
    })

    it('should update provider URL template', async () => {
      const response = await request(app)
        .put(`/api/settings/search-providers/${providerId}`)
        .send({
          urlTemplate: 'https://updated.com'
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('name', 'Original Name')
      expect(response.body).toHaveProperty('urlTemplate', 'https://updated.com')
    })

    it('should update both name and URL template', async () => {
      const response = await request(app)
        .put(`/api/settings/search-providers/${providerId}`)
        .send({
          name: 'New Name',
          urlTemplate: 'https://new.com'
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('name', 'New Name')
      expect(response.body).toHaveProperty('urlTemplate', 'https://new.com')
    })

    it('should return 404 for nonexistent provider ID', async () => {
      const response = await request(app)
        .put('/api/settings/search-providers/99999')
        .send({
          name: 'Updated'
        })
        .expect('Content-Type', /json/)
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })

    it('should reject invalid name update', async () => {
      const response = await request(app)
        .put(`/api/settings/search-providers/${providerId}`)
        .send({
          name: ''
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('Provider name is required')
    })

    it('should reject invalid URL template update', async () => {
      const response = await request(app)
        .put(`/api/settings/search-providers/${providerId}`)
        .send({
          urlTemplate: 'javascript:alert("xss")'
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('must start with http:// or https://')
    })

    it('should return 400 when no valid fields provided', async () => {
      const response = await request(app)
        .put(`/api/settings/search-providers/${providerId}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('DELETE /api/settings/search-providers/:id', () => {
    let providerId: number

    beforeEach(async () => {
      // Create a provider for delete tests
      const response = await request(app)
        .post('/api/settings/search-providers')
        .send({
          name: 'To Delete',
          urlTemplate: 'https://example.com'
        })
        .expect(201)

      providerId = response.body.id
    })

    it('should delete provider and return 204', async () => {
      await request(app).delete(`/api/settings/search-providers/${providerId}`).expect(204)
    })

    it('should remove provider from database', async () => {
      await request(app).delete(`/api/settings/search-providers/${providerId}`).expect(204)

      // Verify it was removed
      const response = await request(app).get('/api/settings/search-providers').expect(200)

      expect(response.body.providers).toHaveLength(0)
    })

    it('should return 404 for nonexistent provider ID', async () => {
      const response = await request(app)
        .delete('/api/settings/search-providers/99999')
        .expect('Content-Type', /json/)
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })

    it('should handle multiple deletions correctly', async () => {
      // Create second provider
      const response2 = await request(app)
        .post('/api/settings/search-providers')
        .send({
          name: 'Second Provider',
          urlTemplate: 'https://example2.com'
        })
        .expect(201)

      // Delete first provider
      await request(app).delete(`/api/settings/search-providers/${providerId}`).expect(204)

      // Verify only second provider remains
      const response = await request(app).get('/api/settings/search-providers').expect(200)

      expect(response.body.providers).toHaveLength(1)
      expect(response.body.providers[0].id).toBe(response2.body.id)
    })
  })
})
