<script setup lang="ts">
import { useArtistSearch } from '../composables/useArtistSearch.js'
import ArtistSearchForm from '../components/search/ArtistSearchForm.vue'
import ArtistSearchResults from '../components/search/ArtistSearchResults.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorMessage from '../components/common/ErrorMessage.vue'
import type { ArtistSearchResult } from '../../../shared/types/index.js'

const {
  searchResults,
  isSearching,
  isImporting,
  searchError,
  importError,
  searchArtists,
  importArtist,
  clearResults,
} = useArtistSearch()

const handleSearch = (searchTerm: string) => {
  searchArtists(searchTerm)
}

const handleImport = (artist: ArtistSearchResult) => {
  importArtist(artist)
}

const dismissError = () => {
  clearResults()
}
</script>

<template>
  <div class="px-4 py-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Search Artists</h1>
      <p class="text-gray-600 mb-8">
        Search for artists on MusicBrainz and import their discographies into your collection.
      </p>

      <div class="flex flex-col items-center gap-6">
        <ArtistSearchForm :loading="isSearching" @search="handleSearch" />

        <!-- Search Error -->
        <ErrorMessage
          v-if="searchError"
          :message="searchError"
          :dismissible="true"
          @dismiss="dismissError"
        />

        <!-- Import Error -->
        <ErrorMessage
          v-if="importError"
          :message="importError"
          :dismissible="true"
          @dismiss="dismissError"
        />

        <!-- Loading State -->
        <LoadingSpinner v-if="isSearching" size="lg" message="Searching MusicBrainz..." />

        <!-- Search Results -->
        <ArtistSearchResults
          v-else-if="searchResults.length > 0"
          :results="searchResults"
          :importing="isImporting"
          @import="handleImport"
        />
      </div>
    </div>
  </div>
</template>
