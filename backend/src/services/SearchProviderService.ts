/**
 * SearchProviderService
 *
 * Business logic layer for search provider management
 */

import { SettingsRepository } from '../repositories/SettingsRepository.js'
import type { SearchProvider } from '../shared/types/index.js'

export class SearchProviderService {
  /**
   * Get all search providers
   */
  static list(): SearchProvider[] {
    return SettingsRepository.getSearchProviders()
  }

  /**
   * Create a new search provider
   * @throws Error if validation fails
   */
  static create(name: string, urlTemplate: string): SearchProvider {
    return SettingsRepository.createSearchProvider(name, urlTemplate)
  }

  /**
   * Update an existing search provider
   * @returns Updated provider or null if not found
   * @throws Error if validation fails
   */
  static update(
    id: number,
    updates: { name?: string; urlTemplate?: string }
  ): SearchProvider | null {
    // Validate that at least one field is provided
    if (updates.name === undefined && updates.urlTemplate === undefined) {
      throw new Error('At least one field (name or urlTemplate) must be provided for update')
    }

    return SettingsRepository.updateSearchProvider(id, updates)
  }

  /**
   * Delete a search provider
   * @returns true if deleted, false if not found
   */
  static delete(id: number): boolean {
    return SettingsRepository.deleteSearchProvider(id)
  }
}
