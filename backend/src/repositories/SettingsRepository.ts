/**
 * Settings Repository
 *
 * Data access layer for Settings singleton
 */

import { getDatabase } from '../db/connection.js'
import { SettingsModel } from '../models/Settings.js'
import { SearchProviderModel } from '../models/SearchProvider.js'
import type { Settings, SearchProvider } from '../../../shared/types/index.js'

export class SettingsRepository {
  /**
   * Get the singleton Settings record
   */
  static get(): SettingsModel {
    const db = getDatabase()

    const row = db.prepare('SELECT * FROM Settings WHERE id = 1').get() as any

    if (!row) {
      throw new Error('Settings not initialized. Database may be corrupted.')
    }

    // Parse search_providers JSON field
    if (row.search_providers && typeof row.search_providers === 'string') {
      try {
        row.search_providers = JSON.parse(row.search_providers)
      } catch (e) {
        console.error('Failed to parse search_providers JSON:', e)
        row.search_providers = []
      }
    } else {
      row.search_providers = []
    }

    return new SettingsModel(row as Settings)
  }

  /**
   * Update Settings
   * @param updates Partial settings object with fields to update
   */
  static update(updates: Partial<Omit<Settings, 'id' | 'updated_at'>>): SettingsModel {
    const db = getDatabase()

    // Build dynamic UPDATE query based on provided fields
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'updated_at')

    if (fields.length === 0) {
      throw new Error('No fields to update')
    }

    // Validate updates
    if (updates.library_root_path !== undefined) {
      const validation = SettingsModel.validateLibraryPath(updates.library_root_path)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
    }

    if (updates.similarity_threshold !== undefined) {
      const validation = SettingsModel.validateSimilarityThreshold(updates.similarity_threshold)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
    }

    if (updates.api_rate_limit_ms !== undefined) {
      const validation = SettingsModel.validateApiRateLimit(updates.api_rate_limit_ms)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
    }

    if (updates.max_api_retries !== undefined) {
      const validation = SettingsModel.validateMaxRetries(updates.max_api_retries)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => (updates as any)[field])

    const stmt = db.prepare(`
      UPDATE Settings
      SET ${setClause}
      WHERE id = 1
    `)

    stmt.run(...values)

    return this.get()
  }

  /**
   * Update library root path
   */
  static updateLibraryPath(path: string): SettingsModel {
    return this.update({ library_root_path: path })
  }

  /**
   * Update similarity threshold
   */
  static updateSimilarityThreshold(threshold: number): SettingsModel {
    return this.update({ similarity_threshold: threshold })
  }

  /**
   * Update last scan timestamp
   */
  static updateLastScanAt(timestamp: string): SettingsModel {
    return this.update({ last_scan_at: timestamp })
  }

  /**
   * Get all search providers
   */
  static getSearchProviders(): SearchProvider[] {
    const db = getDatabase()

    const row = db.prepare('SELECT search_providers FROM Settings WHERE id = 1').get() as {
      search_providers: string
    }

    if (!row) {
      return []
    }

    try {
      const providers = JSON.parse(row.search_providers)
      return Array.isArray(providers) ? providers : []
    } catch (e) {
      console.error('Failed to parse search_providers JSON:', e)
      return []
    }
  }

  /**
   * Create a new search provider
   */
  static createSearchProvider(name: string, urlTemplate: string): SearchProvider {
    const db = getDatabase()

    // Validate the provider
    const validation = SearchProviderModel.validate({ name, urlTemplate })
    if (!validation.valid) {
      throw new Error(validation.errors.join('; '))
    }

    // Use a transaction for read-modify-write
    const transaction = db.transaction(() => {
      const providers = this.getSearchProviders()

      const newProvider = SearchProviderModel.create(name, urlTemplate)
      providers.push(newProvider)

      db.prepare('UPDATE Settings SET search_providers = ? WHERE id = 1').run(
        JSON.stringify(providers)
      )

      return newProvider
    })

    return transaction()
  }

  /**
   * Update an existing search provider
   */
  static updateSearchProvider(
    id: number,
    updates: { name?: string; urlTemplate?: string }
  ): SearchProvider | null {
    const db = getDatabase()

    // Validate updates
    if (updates.name !== undefined || updates.urlTemplate !== undefined) {
      // Get existing provider for validation
      const providers = this.getSearchProviders()
      const existing = providers.find(p => p.id === id)

      if (!existing) {
        return null
      }

      // Validate the updated provider
      const updated = {
        name: updates.name !== undefined ? updates.name : existing.name,
        urlTemplate: updates.urlTemplate !== undefined ? updates.urlTemplate : existing.urlTemplate,
      }

      const validation = SearchProviderModel.validate(updated)
      if (!validation.valid) {
        throw new Error(validation.errors.join('; '))
      }
    }

    // Use a transaction for read-modify-write
    const transaction = db.transaction(() => {
      const providers = this.getSearchProviders()
      const index = providers.findIndex(p => p.id === id)

      if (index === -1) {
        return null
      }

      const updatedProvider = SearchProviderModel.update(providers[index], updates)
      providers[index] = updatedProvider

      db.prepare('UPDATE Settings SET search_providers = ? WHERE id = 1').run(
        JSON.stringify(providers)
      )

      return updatedProvider
    })

    return transaction()
  }

  /**
   * Delete a search provider
   */
  static deleteSearchProvider(id: number): boolean {
    const db = getDatabase()

    // Use a transaction for read-modify-write
    const transaction = db.transaction(() => {
      const providers = this.getSearchProviders()
      const initialLength = providers.length

      const filtered = providers.filter(p => p.id !== id)

      if (filtered.length === initialLength) {
        return false // Provider not found
      }

      db.prepare('UPDATE Settings SET search_providers = ? WHERE id = 1').run(
        JSON.stringify(filtered)
      )

      return true
    })

    return transaction()
  }
}
