<script setup lang="ts">
import type { ArtistSearchResult } from '../../../../shared/types/index.js'

interface Props {
  results: ArtistSearchResult[]
  importing?: string | null
}

withDefaults(defineProps<Props>(), {
  importing: null,
})

const emit = defineEmits<{
  import: [artist: ArtistSearchResult]
}>()

const handleImport = (artist: ArtistSearchResult) => {
  emit('import', artist)
}
</script>

<template>
  <div class="w-full max-w-2xl">
    <div v-if="results.length === 0" class="text-center py-8 text-gray-500">No results found</div>

    <div v-else class="space-y-3">
      <div
        v-for="artist in results"
        :key="artist.mbid"
        class="card flex items-center justify-between"
      >
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ artist.name }}
          </h3>
          <p v-if="artist.disambiguation" class="text-sm text-gray-600">
            {{ artist.disambiguation }}
          </p>
          <p v-if="artist.sort_name" class="text-xs text-gray-500 mt-1">
            Sort: {{ artist.sort_name }}
          </p>
        </div>

        <button
          class="btn btn-primary"
          :disabled="importing !== null"
          @click="handleImport(artist)"
        >
          {{ importing === artist.mbid ? 'Importing...' : 'Import' }}
        </button>
      </div>
    </div>
  </div>
</template>
