/**
 * Search Provider Service
 *
 * API client for search provider CRUD operations
 */

import type { SearchProvider } from '../../../shared/types/index.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export class SearchProviderApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'SearchProviderApiError'
  }
}

/**
 * List all search providers
 */
export async function listSearchProviders(): Promise<SearchProvider[]> {
  const response = await fetch(`${API_BASE_URL}/settings/search-providers`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch providers' }))
    throw new SearchProviderApiError(error.error, response.status)
  }

  const data = await response.json()
  return data.providers
}

/**
 * Create a new search provider
 */
export async function createSearchProvider(
  name: string,
  urlTemplate: string
): Promise<SearchProvider> {
  const response = await fetch(`${API_BASE_URL}/settings/search-providers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, urlTemplate }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create provider' }))
    throw new SearchProviderApiError(error.error, response.status)
  }

  return response.json()
}

/**
 * Update an existing search provider
 */
export async function updateSearchProvider(
  id: number,
  updates: { name?: string; urlTemplate?: string }
): Promise<SearchProvider> {
  const response = await fetch(`${API_BASE_URL}/settings/search-providers/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update provider' }))
    throw new SearchProviderApiError(error.error, response.status)
  }

  return response.json()
}

/**
 * Delete a search provider
 */
export async function deleteSearchProvider(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/settings/search-providers/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete provider' }))
    throw new SearchProviderApiError(error.error, response.status)
  }
}
