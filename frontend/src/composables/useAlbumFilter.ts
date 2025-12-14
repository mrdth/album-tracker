/**
 * Album Filter Composable
 *
 * Manages URL query state for album filtering, specifically for showing/hiding ignored albums.
 * Provides reactive state and functions to handle album filtering via URL parameters.
 */

import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Album } from '../../../shared/types/index.js'

export interface AlbumFilterOptions {
  includeIgnored: boolean
}

export function useAlbumFilter() {
  const route = useRoute()
  const router = useRouter()

  // Get current filter state from URL query params
  const includeIgnored = computed(() => {
    return route.query.includeIgnored === 'true'
  })

  /**
   * Update URL query params with new filter state
   */
  async function setIncludeIgnored(value: boolean) {
    const query = { ...route.query }

    if (value) {
      query.includeIgnored = 'true'
    } else {
      delete query.includeIgnored
    }

    // Update router without triggering navigation
    await router.replace({ query })
  }

  /**
   * Toggle the includeIgnored filter
   */
  async function toggleIncludeIgnored() {
    await setIncludeIgnored(!includeIgnored.value)
  }

  /**
   * Filter albums based on current ignore state
   */
  function filterAlbums(albums: Album[]): Album[] {
    if (includeIgnored.value) {
      return albums
    }
    return albums.filter(album => !album.is_ignored)
  }

  /**
   * Count albums excluding ignored ones (for statistics)
   */
  function countVisibleAlbums(albums: Album[]): number {
    return filterAlbums(albums).length
  }

  /**
   * Count owned albums excluding ignored ones
   */
  function countVisibleOwnedAlbums(albums: Album[]): number {
    return filterAlbums(albums).filter(album => album.ownership_status === 'Owned').length
  }

  /**
   * Check if any albums are ignored in the list
   */
  function hasIgnoredAlbums(albums: Album[]): boolean {
    return albums.some(album => album.is_ignored)
  }

  return {
    // Reactive state
    includeIgnored,

    // Actions
    setIncludeIgnored,
    toggleIncludeIgnored,

    // Utilities
    filterAlbums,
    countVisibleAlbums,
    countVisibleOwnedAlbums,
    hasIgnoredAlbums,
  }
}
