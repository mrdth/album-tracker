/**
 * SearchProvider Model
 *
 * Model for user-configured search providers for missing albums
 */

import type { SearchProvider } from '../shared/types/index.js'
import { validateUrlTemplate } from '../utils/urlTemplate.js'

/**
 * Validation result for SearchProvider
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export class SearchProviderModel implements SearchProvider {
  id: number
  name: string
  urlTemplate: string
  createdAt: string
  updatedAt: string

  constructor(data: SearchProvider) {
    this.id = data.id
    this.name = data.name
    this.urlTemplate = data.urlTemplate
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }

  /**
   * Validate a search provider before creation or update
   */
  static validate(provider: Partial<SearchProvider>): ValidationResult {
    const errors: string[] = []

    // Name validation
    if (!provider.name || provider.name.trim().length === 0) {
      errors.push('Provider name is required')
    }
    if (provider.name && provider.name.length > 100) {
      errors.push('Provider name must be 100 characters or less')
    }
    if (provider.name && provider.name.trim() !== provider.name) {
      errors.push('Provider name cannot have leading or trailing whitespace')
    }

    // URL template validation
    if (!provider.urlTemplate || provider.urlTemplate.trim().length === 0) {
      errors.push('URL template is required')
    }
    if (provider.urlTemplate && provider.urlTemplate.length > 500) {
      errors.push('URL template must be 500 characters or less')
    }
    if (provider.urlTemplate) {
      const urlValidation = validateUrlTemplate(provider.urlTemplate)
      if (!urlValidation.valid && urlValidation.error) {
        errors.push(urlValidation.error)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Create a new SearchProvider with generated timestamps and ID
   */
  static create(name: string, urlTemplate: string): SearchProvider {
    const now = new Date().toISOString()
    return {
      id: Date.now(), // Timestamp-based ID (unique for single-user, <1 provider/second)
      name: name.trim(),
      urlTemplate: urlTemplate.trim(),
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * Update an existing SearchProvider with new values
   */
  static update(
    existing: SearchProvider,
    updates: { name?: string; urlTemplate?: string }
  ): SearchProvider {
    return {
      ...existing,
      name: updates.name !== undefined ? updates.name.trim() : existing.name,
      urlTemplate: updates.urlTemplate !== undefined ? updates.urlTemplate.trim() : existing.urlTemplate,
      updatedAt: new Date().toISOString()
    }
  }
}
