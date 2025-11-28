<script setup lang="ts">
import type { Album } from '../../../../shared/types/index.js';

interface Props {
  album: Album;
}

defineProps<Props>();

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Owned':
      return 'bg-green-100 text-green-800';
    case 'Missing':
      return 'bg-gray-100 text-gray-800';
    case 'Ambiguous':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
</script>

<template>
  <div class="card hover:shadow-lg transition-shadow">
    <div class="flex items-start justify-between mb-2">
      <h3 class="text-lg font-semibold text-gray-900 flex-1">
        {{ album.title }}
      </h3>
      <span
        :class="['px-2 py-1 rounded-full text-xs font-medium ml-2', getStatusBadge(album.ownership_status)]"
      >
        {{ album.ownership_status }}
      </span>
    </div>

    <div class="text-sm text-gray-600 space-y-1">
      <p v-if="album.release_year">
        <span class="font-medium">Year:</span> {{ album.release_year }}
      </p>

      <p v-if="album.disambiguation" class="text-gray-500 italic">
        {{ album.disambiguation }}
      </p>

      <p v-if="album.matched_folder_path" class="text-xs text-gray-400 break-all">
        <span class="font-medium">Path:</span> {{ album.matched_folder_path }}
      </p>

      <p v-if="album.match_confidence !== null && album.ownership_status === 'Ambiguous'" class="text-xs">
        <span class="font-medium">Confidence:</span> {{ Math.round(album.match_confidence * 100) }}%
      </p>

      <div v-if="album.is_manual_override" class="flex items-center gap-1 text-xs text-blue-600">
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
        <span>Manual Override</span>
      </div>
    </div>
  </div>
</template>
