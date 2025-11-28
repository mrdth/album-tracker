/**
 * Artist Search Composable
 *
 * Reactive state and methods for artist search functionality
 */

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api, { ApiError } from '../services/api.js';
import type { ArtistSearchResult } from '../../../shared/types/index.js';

export function useArtistSearch() {
  const router = useRouter();

  const searchResults = ref<ArtistSearchResult[]>([]);
  const isSearching = ref(false);
  const isImporting = ref<string | null>(null);
  const searchError = ref<string | null>(null);
  const importError = ref<string | null>(null);

  /**
   * Search for artists
   */
  const searchArtists = async (searchTerm: string) => {
    isSearching.value = true;
    searchError.value = null;
    searchResults.value = [];

    try {
      const results = await api.searchArtists(searchTerm);
      searchResults.value = results;
    } catch (error) {
      if (error instanceof ApiError) {
        searchError.value = error.message;
      } else {
        searchError.value = 'Failed to search for artists';
      }
      console.error('Search error:', error);
    } finally {
      isSearching.value = false;
    }
  };

  /**
   * Import artist and navigate to detail page
   */
  const importArtist = async (mbid: string) => {
    isImporting.value = mbid;
    importError.value = null;

    try {
      const response = await api.importArtist(mbid);

      // Navigate to artist detail page
      router.push(`/artist/${response.artist.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          importError.value = 'This artist is already in your collection';
        } else {
          importError.value = error.message;
        }
      } else {
        importError.value = 'Failed to import artist';
      }
      console.error('Import error:', error);
    } finally {
      isImporting.value = null;
    }
  };

  /**
   * Clear search results
   */
  const clearResults = () => {
    searchResults.value = [];
    searchError.value = null;
    importError.value = null;
  };

  return {
    searchResults,
    isSearching,
    isImporting,
    searchError,
    importError,
    searchArtists,
    importArtist,
    clearResults
  };
}
