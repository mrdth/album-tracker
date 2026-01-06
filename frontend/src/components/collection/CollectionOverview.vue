<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import ArtistSummaryCard from './ArtistSummaryCard.vue'
import { useCollectionFilter } from '../../stores/collectionFilter'
import type { Artist } from '../../../../shared/types/index.js'

const props = defineProps<{
  artists: Artist[]
}>()

const router = useRouter()

// Use the collection filter store
const { sortBy, filterBy } = useCollectionFilter()

// Local search state (not persisted)
const searchText = ref('')

// Computed sorted and filtered artists
const displayedArtists = computed(() => {
  let result = [...props.artists]

  // Apply search filter
  if (searchText.value.trim()) {
    const search = searchText.value.toLowerCase()
    result = result.filter(artist => artist.name.toLowerCase().includes(search))
  }

  // Apply completion filter
  if (filterBy.value === 'incomplete') {
    result = result.filter(artist => (artist.completion_percentage || 0) < 100)
  } else if (filterBy.value === 'complete') {
    result = result.filter(artist => (artist.completion_percentage || 0) === 100)
  }

  // Apply sort
  if (sortBy.value === 'name') {
    result.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortBy.value === 'completion') {
    result.sort((a, b) => {
      const percentA = a.completion_percentage || 0
      const percentB = b.completion_percentage || 0
      return percentB - percentA // Descending
    })
  } else if (sortBy.value === 'owned') {
    result.sort((a, b) => {
      const ownedA = a.owned_albums || 0
      const ownedB = b.owned_albums || 0
      return ownedB - ownedA // Descending
    })
  }

  return result
})

const handleArtistClick = (artistId: number) => {
  router.push(`/artist/${artistId}`)
}

// Summary statistics
const totalArtists = computed(() => props.artists.length)
const totalAlbums = computed(() =>
  props.artists.reduce((sum, artist) => sum + (artist.total_albums || 0), 0)
)
const totalOwned = computed(() =>
  props.artists.reduce((sum, artist) => sum + (artist.owned_albums || 0), 0)
)
const overallCompletion = computed(() => {
  if (totalAlbums.value === 0) return 0
  return Math.round((totalOwned.value / totalAlbums.value) * 100)
})
</script>

<template>
  <div class="collection-overview">
    <!-- Summary Stats -->
    <div class="mb-6 bg-white rounded-lg shadow-md p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Collection Summary</h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-3xl font-bold text-blue-600">{{ totalArtists }}</div>
          <div class="text-sm text-gray-600">Artists</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-green-600">{{ totalOwned }}</div>
          <div class="text-sm text-gray-600">Albums Owned</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-gray-600">{{ totalAlbums }}</div>
          <div class="text-sm text-gray-600">Total Albums</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-purple-600">{{ overallCompletion }}%</div>
          <div class="text-sm text-gray-600">Complete</div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="mb-6 bg-white rounded-lg shadow-md p-4">
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <!-- Sort Options -->
        <div class="flex items-center gap-2">
          <label for="sort-select" class="text-sm font-medium text-gray-700"> Sort by: </label>
          <select
            id="sort-select"
            v-model="sortBy"
            class="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="name">Name</option>
            <option value="completion">Completion %</option>
            <option value="owned">Albums Owned</option>
          </select>
        </div>

        <!-- Search Input -->
        <div class="flex items-center gap-2">
          <input
            id="search-input"
            v-model="searchText"
            type="text"
            placeholder="Filter by artist name..."
            class="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[200px]"
          />
        </div>

        <!-- Filter Options -->
        <div class="flex items-center gap-2">
          <label for="filter-select" class="text-sm font-medium text-gray-700"> Show: </label>
          <select
            id="filter-select"
            v-model="filterBy"
            class="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Artists</option>
            <option value="incomplete">Incomplete Only</option>
            <option value="complete">Complete Only</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Artist Grid -->
    <div
      v-if="displayedArtists.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <ArtistSummaryCard
        v-for="artist in displayedArtists"
        :key="artist.id"
        :artist="artist"
        @click="handleArtistClick"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-lg shadow-md p-12 text-center">
      <svg
        class="mx-auto h-12 w-12 text-gray-400 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        {{ filterBy === 'all' ? 'No artists imported yet' : 'No artists match filter' }}
      </h3>
      <p class="text-gray-500">
        {{
          filterBy === 'all'
            ? 'Search for an artist to get started'
            : 'Try changing your filter settings'
        }}
      </p>
    </div>
  </div>
</template>

<style scoped>
@reference "../../assets/main.css";
.collection-overview {
  @apply w-full;
}
</style>
