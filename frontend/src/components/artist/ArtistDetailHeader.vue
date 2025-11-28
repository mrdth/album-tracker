<script setup lang="ts">
import type { Artist } from '../../../../shared/types/index.js';

interface Props {
  artist: Artist;
}

defineProps<Props>();
</script>

<template>
  <div class="card mb-6">
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          {{ artist.name }}
        </h1>

        <p v-if="artist.disambiguation" class="text-gray-600 mb-2">
          {{ artist.disambiguation }}
        </p>

        <p v-if="artist.sort_name" class="text-sm text-gray-500">
          Sort name: {{ artist.sort_name }}
        </p>
      </div>

      <div class="flex flex-col items-end gap-2">
        <div class="text-right">
          <p class="text-2xl font-bold text-blue-600">
            {{ artist.owned_albums || 0 }} / {{ artist.total_albums || 0 }}
          </p>
          <p class="text-sm text-gray-600">Albums Owned</p>
        </div>

        <div v-if="artist.completion_percentage !== undefined" class="w-32">
          <div class="bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all"
              :style="{ width: `${artist.completion_percentage}%` }"
            ></div>
          </div>
          <p class="text-xs text-gray-500 text-center mt-1">
            {{ Math.round(artist.completion_percentage) }}% Complete
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
