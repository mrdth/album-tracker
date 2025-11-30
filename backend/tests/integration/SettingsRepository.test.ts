/**
 * SettingsRepository Integration Tests - Search Providers
 *
 * Integration tests for search provider CRUD operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Database } from 'better-sqlite3'
import { getDatabase } from '../../src/db/connection'
import { SettingsRepository } from '../../src/repositories/SettingsRepository'

describe('SettingsRepository - Search Providers', () => {
  let db: Database

  beforeEach(() => {
    db = getDatabase()

    // Reset search_providers to empty array
    db.prepare('UPDATE Settings SET search_providers = ? WHERE id = 1').run('[]')

    // Mock Date.now() for consistent ID generation
    vi.setSystemTime(new Date('2025-11-30T10:00:00.000Z'))
  })

  afterEach(() => {
    // Clean up - reset to empty array
    db.prepare('UPDATE Settings SET search_providers = ? WHERE id = 1').run('[]')

    vi.useRealTimers()
  })

  describe('getSearchProviders()', () => {
    it('should return empty array when no providers exist', () => {
      const providers = SettingsRepository.getSearchProviders()

      expect(providers).toEqual([])
    })

    it('should return all providers', () => {
      // Manually insert providers
      const testProviders = [
        {
          id: 1,
          name: 'Discogs',
          urlTemplate: 'https://discogs.com/search?q={artist}+{album}',
          createdAt: '2025-11-30T10:00:00.000Z',
          updatedAt: '2025-11-30T10:00:00.000Z'
        },
        {
          id: 2,
          name: 'MusicBrainz',
          urlTemplate: 'https://musicbrainz.org/search?query={artist}+{album}',
          createdAt: '2025-11-30T10:00:00.000Z',
          updatedAt: '2025-11-30T10:00:00.000Z'
        }
      ]

      db.prepare('UPDATE Settings SET search_providers = ? WHERE id = 1').run(
        JSON.stringify(testProviders)
      )

      const providers = SettingsRepository.getSearchProviders()

      expect(providers).toHaveLength(2)
      expect(providers[0].name).toBe('Discogs')
      expect(providers[1].name).toBe('MusicBrainz')
    })

    it('should handle corrupt JSON gracefully', () => {
      // Manually corrupt the JSON
      db.exec("UPDATE Settings SET search_providers = 'invalid json' WHERE id = 1")

      const providers = SettingsRepository.getSearchProviders()

      expect(providers).toEqual([])
    })

    it('should handle non-array JSON gracefully', () => {
      // Store an object instead of array
      db.prepare('UPDATE Settings SET search_providers = ? WHERE id = 1').run(
        JSON.stringify({ not: 'an array' })
      )

      const providers = SettingsRepository.getSearchProviders()

      expect(providers).toEqual([])
    })
  })

  describe('createSearchProvider()', () => {
    it('should create a provider with generated ID and timestamps', () => {
      const provider = SettingsRepository.createSearchProvider(
        'Discogs',
        'https://discogs.com/search?q={artist}'
      )

      expect(provider.id).toBe(Date.now())
      expect(provider.name).toBe('Discogs')
      expect(provider.urlTemplate).toBe('https://discogs.com/search?q={artist}')
      expect(provider.createdAt).toBe('2025-11-30T10:00:00.000Z')
      expect(provider.updatedAt).toBe('2025-11-30T10:00:00.000Z')
    })

    it('should persist provider to database', () => {
      SettingsRepository.createSearchProvider('Test', 'https://example.com')

      const providers = SettingsRepository.getSearchProviders()

      expect(providers).toHaveLength(1)
      expect(providers[0].name).toBe('Test')
    })

    it('should append to existing providers', () => {
      SettingsRepository.createSearchProvider('First', 'https://first.com')

      vi.setSystemTime(new Date('2025-11-30T10:00:01.000Z'))

      SettingsRepository.createSearchProvider('Second', 'https://second.com')

      const providers = SettingsRepository.getSearchProviders()

      expect(providers).toHaveLength(2)
      expect(providers[0].name).toBe('First')
      expect(providers[1].name).toBe('Second')
    })

    it('should throw error for empty name', () => {
      expect(() => {
        SettingsRepository.createSearchProvider('', 'https://example.com')
      }).toThrow('Provider name is required')
    })

    it('should throw error for invalid URL template', () => {
      expect(() => {
        SettingsRepository.createSearchProvider('Test', 'ftp://invalid.com')
      }).toThrow('URL template must start with http:// or https://')
    })

    it('should throw error for name with leading whitespace', () => {
      expect(() => {
        SettingsRepository.createSearchProvider('  Test', 'https://example.com')
      }).toThrow('Provider name cannot have leading or trailing whitespace')
    })

    it('should throw error for name longer than 100 characters', () => {
      expect(() => {
        SettingsRepository.createSearchProvider('x'.repeat(101), 'https://example.com')
      }).toThrow('Provider name must be 100 characters or less')
    })
  })

  describe('updateSearchProvider()', () => {
    let providerId: number

    beforeEach(() => {
      const provider = SettingsRepository.createSearchProvider(
        'Original Name',
        'https://original.com'
      )
      providerId = provider.id
    })

    it('should update provider name', () => {
      vi.setSystemTime(new Date('2025-11-30T10:01:00.000Z'))

      const updated = SettingsRepository.updateSearchProvider(providerId, {
        name: 'Updated Name'
      })

      expect(updated).not.toBeNull()
      expect(updated!.id).toBe(providerId)
      expect(updated!.name).toBe('Updated Name')
      expect(updated!.urlTemplate).toBe('https://original.com')
      expect(updated!.updatedAt).toBe('2025-11-30T10:01:00.000Z')
    })

    it('should update provider URL template', () => {
      vi.setSystemTime(new Date('2025-11-30T10:01:00.000Z'))

      const updated = SettingsRepository.updateSearchProvider(providerId, {
        urlTemplate: 'https://updated.com'
      })

      expect(updated).not.toBeNull()
      expect(updated!.name).toBe('Original Name')
      expect(updated!.urlTemplate).toBe('https://updated.com')
      expect(updated!.updatedAt).toBe('2025-11-30T10:01:00.000Z')
    })

    it('should update both name and URL template', () => {
      vi.setSystemTime(new Date('2025-11-30T10:01:00.000Z'))

      const updated = SettingsRepository.updateSearchProvider(providerId, {
        name: 'New Name',
        urlTemplate: 'https://new.com'
      })

      expect(updated).not.toBeNull()
      expect(updated!.name).toBe('New Name')
      expect(updated!.urlTemplate).toBe('https://new.com')
      expect(updated!.updatedAt).toBe('2025-11-30T10:01:00.000Z')
    })

    it('should persist updates to database', () => {
      SettingsRepository.updateSearchProvider(providerId, { name: 'Persisted' })

      const providers = SettingsRepository.getSearchProviders()

      expect(providers[0].name).toBe('Persisted')
    })

    it('should return null for nonexistent provider ID', () => {
      const result = SettingsRepository.updateSearchProvider(99999, { name: 'Test' })

      expect(result).toBeNull()
    })

    it('should throw error for invalid name', () => {
      expect(() => {
        SettingsRepository.updateSearchProvider(providerId, { name: '' })
      }).toThrow('Provider name is required')
    })

    it('should throw error for invalid URL template', () => {
      expect(() => {
        SettingsRepository.updateSearchProvider(providerId, {
          urlTemplate: 'javascript:alert("xss")'
        })
      }).toThrow('URL template must start with http:// or https://')
    })

    it('should update only the specified provider in a list', () => {
      // Create second provider
      vi.setSystemTime(new Date('2025-11-30T10:00:01.000Z'))
      const provider2 = SettingsRepository.createSearchProvider('Second', 'https://second.com')

      vi.setSystemTime(new Date('2025-11-30T10:02:00.000Z'))

      // Update first provider
      SettingsRepository.updateSearchProvider(providerId, { name: 'Updated First' })

      const providers = SettingsRepository.getSearchProviders()

      expect(providers).toHaveLength(2)
      expect(providers[0].name).toBe('Updated First')
      expect(providers[1].name).toBe('Second') // Unchanged
    })
  })

  describe('deleteSearchProvider()', () => {
    let providerId: number

    beforeEach(() => {
      const provider = SettingsRepository.createSearchProvider('Test', 'https://test.com')
      providerId = provider.id
    })

    it('should delete provider and return true', () => {
      const result = SettingsRepository.deleteSearchProvider(providerId)

      expect(result).toBe(true)
    })

    it('should remove provider from database', () => {
      SettingsRepository.deleteSearchProvider(providerId)

      const providers = SettingsRepository.getSearchProviders()

      expect(providers).toHaveLength(0)
    })

    it('should return false for nonexistent provider ID', () => {
      const result = SettingsRepository.deleteSearchProvider(99999)

      expect(result).toBe(false)
    })

    it('should delete only the specified provider from a list', () => {
      // Create second provider
      vi.setSystemTime(new Date('2025-11-30T10:00:01.000Z'))
      const provider2 = SettingsRepository.createSearchProvider('Second', 'https://second.com')

      // Delete first provider
      SettingsRepository.deleteSearchProvider(providerId)

      const providers = SettingsRepository.getSearchProviders()

      expect(providers).toHaveLength(1)
      expect(providers[0].id).toBe(provider2.id)
      expect(providers[0].name).toBe('Second')
    })

    it('should handle deleting from empty list', () => {
      SettingsRepository.deleteSearchProvider(providerId) // Delete the one
      const result = SettingsRepository.deleteSearchProvider(providerId) // Try again

      expect(result).toBe(false)
    })
  })

  describe('CRUD transaction integrity', () => {
    it('should handle concurrent-like CRUD operations', () => {
      // Create multiple providers
      const provider1 = SettingsRepository.createSearchProvider('First', 'https://first.com')

      vi.setSystemTime(new Date('2025-11-30T10:00:01.000Z'))
      const provider2 = SettingsRepository.createSearchProvider('Second', 'https://second.com')

      vi.setSystemTime(new Date('2025-11-30T10:00:02.000Z'))
      const provider3 = SettingsRepository.createSearchProvider('Third', 'https://third.com')

      // Update middle provider
      vi.setSystemTime(new Date('2025-11-30T10:01:00.000Z'))
      SettingsRepository.updateSearchProvider(provider2.id, { name: 'Updated Second' })

      // Delete first provider
      SettingsRepository.deleteSearchProvider(provider1.id)

      // Verify final state
      const providers = SettingsRepository.getSearchProviders()

      expect(providers).toHaveLength(2)
      expect(providers[0].id).toBe(provider2.id)
      expect(providers[0].name).toBe('Updated Second')
      expect(providers[1].id).toBe(provider3.id)
      expect(providers[1].name).toBe('Third')
    })

    it('should maintain data integrity with rapid operations', () => {
      const ids: number[] = []

      // Rapid creation
      for (let i = 0; i < 5; i++) {
        vi.setSystemTime(new Date(`2025-11-30T10:00:0${i}.000Z`))
        const provider = SettingsRepository.createSearchProvider(
          `Provider ${i}`,
          `https://example${i}.com`
        )
        ids.push(provider.id)
      }

      // Rapid updates
      for (let i = 0; i < 5; i++) {
        vi.setSystemTime(new Date(`2025-11-30T10:01:0${i}.000Z`))
        SettingsRepository.updateSearchProvider(ids[i], { name: `Updated ${i}` })
      }

      // Delete alternating providers
      SettingsRepository.deleteSearchProvider(ids[0])
      SettingsRepository.deleteSearchProvider(ids[2])
      SettingsRepository.deleteSearchProvider(ids[4])

      const providers = SettingsRepository.getSearchProviders()

      expect(providers).toHaveLength(2)
      expect(providers[0].name).toBe('Updated 1')
      expect(providers[1].name).toBe('Updated 3')
    })
  })
})
