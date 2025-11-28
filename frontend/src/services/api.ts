/**
 * API Client Wrapper
 *
 * Centralized API communication with:
 * - Base URL configuration
 * - Error handling
 * - Type-safe request/response
 */

import type {
  Artist,
  Album,
  Settings,
  ArtistSearchResult,
  ArtistImportResponse,
  ScanResult,
  ErrorResponse,
} from '../../../shared/types/index.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

/**
 * API Error class with status code and details
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Generic API request function
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    // Handle non-OK responses
    if (!response.ok) {
      const errorData: ErrorResponse = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))

      throw new ApiError(errorData.error, response.status, errorData.code, errorData.details)
    }

    // Parse JSON response
    const data: T = await response.json()
    return data
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error
    }

    // Network or other errors
    if (error instanceof Error) {
      throw new ApiError(`Network error: ${error.message}`, 0)
    }

    throw new ApiError('Unknown error occurred', 0)
  }
}

/**
 * API Client
 */
export const api = {
  // ============================================================================
  // Artists
  // ============================================================================

  /**
   * Search for artists by name
   */
  async searchArtists(searchTerm: string): Promise<ArtistSearchResult[]> {
    return apiRequest<ArtistSearchResult[]>(`/artists/search?q=${encodeURIComponent(searchTerm)}`)
  },

  /**
   * Import artist and discography
   */
  async importArtist(artist: {
    mbid: string
    name: string
    sort_name?: string | null
    disambiguation?: string | null
  }): Promise<ArtistImportResponse> {
    return apiRequest<ArtistImportResponse>('/artists', {
      method: 'POST',
      body: JSON.stringify(artist),
    })
  },

  /**
   * Get artist detail with albums
   */
  async getArtist(artistId: number): Promise<Artist> {
    return apiRequest<Artist>(`/artists/${artistId}`)
  },

  /**
   * Get all artists (Collection Overview)
   */
  async getAllArtists(): Promise<Artist[]> {
    return apiRequest<Artist[]>('/artists')
  },

  /**
   * Update artist (link folder)
   */
  async updateArtist(
    artistId: number,
    updates: { linked_folder_path?: string | null }
  ): Promise<Artist> {
    return apiRequest<Artist>(`/artists/${artistId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  /**
   * Delete artist
   */
  async deleteArtist(artistId: number): Promise<void> {
    return apiRequest<void>(`/artists/${artistId}`, {
      method: 'DELETE',
    })
  },

  // ============================================================================
  // Albums
  // ============================================================================

  /**
   * Get albums for an artist
   */
  async getAlbums(artistId: number): Promise<Album[]> {
    return apiRequest<Album[]>(`/artists/${artistId}/albums`)
  },

  /**
   * Update album (manual override)
   */
  async updateAlbum(
    albumId: number,
    updates: {
      matched_folder_path?: string | null
      ownership_status?: 'Owned' | 'Missing' | 'Ambiguous'
      clear_override?: boolean
    }
  ): Promise<Album> {
    return apiRequest<Album>(`/albums/${albumId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  // ============================================================================
  // Settings
  // ============================================================================

  /**
   * Get settings
   */
  async getSettings(): Promise<Settings> {
    return apiRequest<Settings>('/settings')
  },

  /**
   * Update settings
   */
  async updateSettings(updates: Partial<Omit<Settings, 'id' | 'updated_at'>>): Promise<Settings> {
    return apiRequest<Settings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  // ============================================================================
  // Filesystem
  // ============================================================================

  /**
   * Trigger filesystem scan
   */
  async scanFilesystem(artistId?: number): Promise<ScanResult> {
    return apiRequest<ScanResult>('/filesystem/scan', {
      method: 'POST',
      body: JSON.stringify({ artist_id: artistId }),
    })
  },

  /**
   * Browse directory tree
   */
  async browseDirectory(path: string = ''): Promise<{
    current_path: string
    parent_path: string | null
    directories: Array<{ name: string; path: string }>
  }> {
    return apiRequest(`/filesystem/browse?path=${encodeURIComponent(path)}`)
  },
}

export default api
