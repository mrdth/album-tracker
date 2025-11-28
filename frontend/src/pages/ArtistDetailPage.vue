<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { ApiError } from '../services/api.js'
import type { Artist, Album } from '../../../shared/types/index.js'
import ArtistDetailHeader from '../components/artist/ArtistDetailHeader.vue'
import AlbumGrid from '../components/artist/AlbumGrid.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorMessage from '../components/common/ErrorMessage.vue'

const route = useRoute()
const router = useRouter()

const artistId = parseInt(route.params.artistId as string, 10)

const artist = ref<Artist | null>(null)
const albums = ref<Album[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

const loadArtist = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await api.getArtist(artistId)
    artist.value = response as Artist
    albums.value = (response as any).albums || []
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) {
        error.value = 'Artist not found'
      } else {
        error.value = err.message
      }
    } else {
      error.value = 'Failed to load artist details'
    }
    console.error('Load artist error:', err)
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  if (isNaN(artistId) || artistId <= 0) {
    error.value = 'Invalid artist ID'
    isLoading.value = false
    return
  }

  loadArtist()
})
</script>

<template>
  <div class="px-4 py-8">
    <div class="max-w-6xl mx-auto">
      <!-- Back Button -->
      <button @click="goBack" class="btn btn-secondary mb-4 flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Search
      </button>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center py-12">
        <LoadingSpinner size="lg" message="Loading artist details..." />
      </div>

      <!-- Error State -->
      <ErrorMessage v-else-if="error" :message="error" />

      <!-- Artist Detail -->
      <div v-else-if="artist">
        <ArtistDetailHeader :artist="artist" />

        <div class="mb-4">
          <h2 class="text-2xl font-semibold text-gray-900">Discography</h2>
        </div>

        <AlbumGrid :albums="albums" />
      </div>
    </div>
  </div>
</template>
