<script setup lang="ts">
import type { Album } from '../../../../shared/types/index.js'

interface Props {
  album: Album
}

const props = defineProps<Props>()

const emit = defineEmits<{
  linkFolder: [albumId: number]
  toggleOwnership: [albumId: number]
  clearOverride: [albumId: number]
}>()

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Owned':
      return 'bg-green-100 text-green-800'
    case 'Missing':
      return 'bg-gray-100 text-gray-800'
    case 'Ambiguous':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function handleLinkFolder() {
  emit('linkFolder', props.album.id)
}

function handleToggleOwnership() {
  emit('toggleOwnership', props.album.id)
}

function handleClearOverride() {
  emit('clearOverride', props.album.id)
}
</script>

<template>
  <div class="card hover:shadow-lg transition-shadow" data-testid="album-card">
    <div class="flex items-start justify-between mb-2">
      <h3 class="text-lg font-semibold text-gray-900 flex-1" data-testid="album-title">
        {{ album.title }}
      </h3>
      <span
        data-testid="ownership-status"
        :class="[
          'px-2 py-1 rounded-full text-xs font-medium ml-2',
          getStatusBadge(album.ownership_status),
        ]"
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

      <p
        v-if="album.match_confidence !== null && album.ownership_status === 'Ambiguous'"
        class="text-xs"
      >
        <span class="font-medium">Confidence:</span> {{ Math.round(album.match_confidence * 100) }}%
      </p>

      <div
        v-if="album.is_manual_override"
        data-testid="manual-override-indicator"
        class="flex items-center gap-1 text-xs text-blue-600"
      >
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
          />
        </svg>
        <span>Manual Override</span>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="mt-4 flex flex-wrap gap-2">
      <!-- Link Folder button -->
      <button
        v-if="album.ownership_status !== 'Owned'"
        type="button"
        data-testid="link-folder-button"
        class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        @click="handleLinkFolder"
      >
        Link Folder
      </button>

      <!-- Toggle Ownership button -->
      <button
        v-if="album.ownership_status !== 'Owned' && album.matched_folder_path"
        type="button"
        data-testid="toggle-ownership-button"
        class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        @click="handleToggleOwnership"
      >
        Toggle Ownership
      </button>

      <!-- Clear Override button (only show if manual override) -->
      <button
        v-if="album.is_manual_override"
        type="button"
        data-testid="clear-override-button"
        class="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
        @click="handleClearOverride"
      >
        Clear Override
      </button>
    </div>
  </div>
</template>
