import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SearchProviderModel } from '../../src/models/SearchProvider'

describe('SearchProviderModel', () => {
  describe('validate()', () => {
    it('should validate a valid provider', () => {
      const result = SearchProviderModel.validate({
        name: 'Discogs',
        urlTemplate: 'https://discogs.com/search?q={artist}+{album}'
      })

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject empty name', () => {
      const result = SearchProviderModel.validate({
        name: '',
        urlTemplate: 'https://example.com'
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Provider name is required')
    })

    it('should reject missing name', () => {
      const result = SearchProviderModel.validate({
        urlTemplate: 'https://example.com'
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Provider name is required')
    })

    it('should reject whitespace-only name', () => {
      const result = SearchProviderModel.validate({
        name: '   ',
        urlTemplate: 'https://example.com'
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Provider name is required')
    })

    it('should reject name longer than 100 characters', () => {
      const result = SearchProviderModel.validate({
        name: 'x'.repeat(101),
        urlTemplate: 'https://example.com'
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Provider name must be 100 characters or less')
    })

    it('should accept name with exactly 100 characters', () => {
      const result = SearchProviderModel.validate({
        name: 'x'.repeat(100),
        urlTemplate: 'https://example.com/search'
      })

      expect(result.valid).toBe(true)
    })

    it('should reject name with leading whitespace', () => {
      const result = SearchProviderModel.validate({
        name: '  Discogs',
        urlTemplate: 'https://example.com'
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Provider name cannot have leading or trailing whitespace')
    })

    it('should reject name with trailing whitespace', () => {
      const result = SearchProviderModel.validate({
        name: 'Discogs  ',
        urlTemplate: 'https://example.com'
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Provider name cannot have leading or trailing whitespace')
    })

    it('should reject empty URL template', () => {
      const result = SearchProviderModel.validate({
        name: 'Discogs',
        urlTemplate: ''
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('URL template is required')
    })

    it('should reject missing URL template', () => {
      const result = SearchProviderModel.validate({
        name: 'Discogs'
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('URL template is required')
    })

    it('should reject URL template longer than 500 characters', () => {
      const result = SearchProviderModel.validate({
        name: 'Test',
        urlTemplate: 'https://example.com/' + 'x'.repeat(500)
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('URL template must be 500 characters or less')
    })

    it('should accept URL template with exactly 500 characters', () => {
      const template = 'https://example.com/' + 'x'.repeat(480) // Total = 500
      const result = SearchProviderModel.validate({
        name: 'Test',
        urlTemplate: template
      })

      expect(result.valid).toBe(true)
    })

    it('should reject URL template without http:// or https://', () => {
      const result = SearchProviderModel.validate({
        name: 'Test',
        urlTemplate: 'ftp://example.com'
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('URL template must start with http:// or https://')
    })

    it('should reject URL template with javascript: protocol', () => {
      const result = SearchProviderModel.validate({
        name: 'Test',
        urlTemplate: 'javascript:alert("xss")'
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('URL template must start with http:// or https://')
    })

    it('should accept URL template with {artist} placeholder', () => {
      const result = SearchProviderModel.validate({
        name: 'Test',
        urlTemplate: 'https://example.com/search?artist={artist}'
      })

      expect(result.valid).toBe(true)
    })

    it('should accept URL template with {album} placeholder', () => {
      const result = SearchProviderModel.validate({
        name: 'Test',
        urlTemplate: 'https://example.com/search?album={album}'
      })

      expect(result.valid).toBe(true)
    })

    it('should accept URL template with both placeholders', () => {
      const result = SearchProviderModel.validate({
        name: 'Test',
        urlTemplate: 'https://example.com/search?q={artist}+{album}'
      })

      expect(result.valid).toBe(true)
    })

    it('should accept URL template without placeholders', () => {
      const result = SearchProviderModel.validate({
        name: 'Test',
        urlTemplate: 'https://example.com/search'
      })

      expect(result.valid).toBe(true)
    })

    it('should return multiple errors for multiple violations', () => {
      const result = SearchProviderModel.validate({
        name: '',
        urlTemplate: ''
      })

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
      expect(result.errors).toContain('Provider name is required')
      expect(result.errors).toContain('URL template is required')
    })
  })

  describe('create()', () => {
    beforeEach(() => {
      // Mock Date.now() for consistent ID generation
      vi.setSystemTime(new Date('2025-11-30T10:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should create a provider with generated ID and timestamps', () => {
      const provider = SearchProviderModel.create('Discogs', 'https://discogs.com/search?q={artist}')

      expect(provider.id).toBe(Date.now())
      expect(provider.name).toBe('Discogs')
      expect(provider.urlTemplate).toBe('https://discogs.com/search?q={artist}')
      expect(provider.createdAt).toBe('2025-11-30T10:00:00.000Z')
      expect(provider.updatedAt).toBe('2025-11-30T10:00:00.000Z')
    })

    it('should trim name whitespace', () => {
      const provider = SearchProviderModel.create('  Discogs  ', 'https://discogs.com')

      expect(provider.name).toBe('Discogs')
    })

    it('should trim URL template whitespace', () => {
      const provider = SearchProviderModel.create('Test', '  https://example.com  ')

      expect(provider.urlTemplate).toBe('https://example.com')
    })

    it('should generate unique IDs for providers created at different times', () => {
      const provider1 = SearchProviderModel.create('Test1', 'https://example.com')

      vi.setSystemTime(new Date('2025-11-30T10:00:01.000Z'))

      const provider2 = SearchProviderModel.create('Test2', 'https://example.com')

      expect(provider1.id).not.toBe(provider2.id)
      expect(provider2.id).toBeGreaterThan(provider1.id)
    })
  })

  describe('update()', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2025-11-30T10:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should update name and preserve other fields', () => {
      const existing = SearchProviderModel.create('Old Name', 'https://example.com')

      vi.setSystemTime(new Date('2025-11-30T10:01:00.000Z'))

      const updated = SearchProviderModel.update(existing, { name: 'New Name' })

      expect(updated.id).toBe(existing.id)
      expect(updated.name).toBe('New Name')
      expect(updated.urlTemplate).toBe('https://example.com')
      expect(updated.createdAt).toBe(existing.createdAt)
      expect(updated.updatedAt).toBe('2025-11-30T10:01:00.000Z')
      expect(updated.updatedAt).not.toBe(existing.updatedAt)
    })

    it('should update URL template and preserve other fields', () => {
      const existing = SearchProviderModel.create('Test', 'https://old.com')

      vi.setSystemTime(new Date('2025-11-30T10:01:00.000Z'))

      const updated = SearchProviderModel.update(existing, { urlTemplate: 'https://new.com' })

      expect(updated.id).toBe(existing.id)
      expect(updated.name).toBe('Test')
      expect(updated.urlTemplate).toBe('https://new.com')
      expect(updated.createdAt).toBe(existing.createdAt)
      expect(updated.updatedAt).toBe('2025-11-30T10:01:00.000Z')
    })

    it('should update both name and URL template', () => {
      const existing = SearchProviderModel.create('Old', 'https://old.com')

      vi.setSystemTime(new Date('2025-11-30T10:01:00.000Z'))

      const updated = SearchProviderModel.update(existing, {
        name: 'New',
        urlTemplate: 'https://new.com'
      })

      expect(updated.name).toBe('New')
      expect(updated.urlTemplate).toBe('https://new.com')
      expect(updated.updatedAt).toBe('2025-11-30T10:01:00.000Z')
    })

    it('should preserve original values when no updates provided', () => {
      const existing = SearchProviderModel.create('Test', 'https://example.com')

      vi.setSystemTime(new Date('2025-11-30T10:01:00.000Z'))

      const updated = SearchProviderModel.update(existing, {})

      expect(updated.name).toBe('Test')
      expect(updated.urlTemplate).toBe('https://example.com')
      expect(updated.updatedAt).toBe('2025-11-30T10:01:00.000Z')
    })

    it('should trim name whitespace on update', () => {
      const existing = SearchProviderModel.create('Test', 'https://example.com')
      const updated = SearchProviderModel.update(existing, { name: '  Updated  ' })

      expect(updated.name).toBe('Updated')
    })

    it('should trim URL template whitespace on update', () => {
      const existing = SearchProviderModel.create('Test', 'https://example.com')
      const updated = SearchProviderModel.update(existing, { urlTemplate: '  https://new.com  ' })

      expect(updated.urlTemplate).toBe('https://new.com')
    })
  })
})
