/**
 * useArtistRefresh Composable
 *
 * Reactive state management for artist refresh operations
 */

import { ref } from 'vue'

export interface RefreshResult {
  success: boolean
  albums_added: number
  updated_at: string
  message?: string
}

export function useArtistRefresh(artistId: number) {
  const isRefreshing = ref(false)
  const error = ref<string | null>(null)
  const lastRefreshResult = ref<RefreshResult | null>(null)

  const refresh = async (): Promise<RefreshResult> => {
    isRefreshing.value = true
    error.value = null

    try {
      const response = await fetch(`/api/artists/${artistId}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))

        // Handle specific error codes
        if (response.status === 404) {
          throw new Error('Artist not found')
        } else if (response.status === 409) {
          throw new Error('Refresh already in progress for this artist')
        } else if (response.status === 503) {
          throw new Error('Unable to connect to MusicBrainz service. Please try again later.')
        } else {
          throw new Error(errorData.error || `Refresh failed: ${response.statusText}`)
        }
      }

      const result: RefreshResult = await response.json()
      lastRefreshResult.value = result

      return result
    } catch (err: any) {
      error.value = err.message || 'Failed to refresh artist'
      throw err
    } finally {
      isRefreshing.value = false
    }
  }

  return {
    isRefreshing,
    error,
    lastRefreshResult,
    refresh
  }
}
