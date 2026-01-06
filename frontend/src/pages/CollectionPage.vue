<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../services/api'
import CollectionOverview from '../components/collection/CollectionOverview.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorMessage from '../components/common/ErrorMessage.vue'
import type { Artist } from '../../../shared/types/index.js'

const artists = ref<Artist[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const fetchArtists = async () => {
  loading.value = true
  error.value = null

  try {
    artists.value = await api.getAllArtists()
  } catch (err: any) {
    error.value = err.message || 'Failed to load collection'
    console.error('Error fetching artists:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchArtists()
})
</script>

<template>
  <div class="collection-page container mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <LoadingSpinner />
    </div>

    <!-- Error State -->
    <ErrorMessage v-if="error && !loading" :message="error" />

    <!-- Collection Overview -->
    <CollectionOverview v-if="!loading && !error" :artists="artists" />
  </div>
</template>

<style scoped>
@reference "../assets/main.css";
.collection-page {
  @apply min-h-screen;
}
</style>
