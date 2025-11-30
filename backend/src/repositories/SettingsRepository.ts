/**
 * Settings Repository
 *
 * Data access layer for Settings singleton
 */

import { getDatabase } from '../db/connection.js'
import { SettingsModel } from '../models/Settings.js'
import type { Settings } from '../../../shared/types/index.js'

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
}
