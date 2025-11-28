<script setup lang="ts">
import { computed } from 'vue'
import type { Artist } from '../../../../shared/types/index.js'

const props = defineProps<{
  artist: Artist
}>()

const emit = defineEmits<{
  click: [artistId: number]
}>()

const completionColor = computed(() => {
  const percentage = props.artist.completion_percentage || 0
  if (percentage === 100) return 'bg-green-500'
  if (percentage >= 75) return 'bg-blue-500'
  if (percentage >= 50) return 'bg-yellow-500'
  if (percentage >= 25) return 'bg-orange-500'
  return 'bg-red-500'
})

const handleClick = () => {
  emit('click', props.artist.id)
}

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleClick()
  }
}
</script>

<template>
  <div
    data-testid="artist-summary-card"
    class="artist-summary-card bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keypress="handleKeyPress"
  >
    <!-- Artist Name -->
    <h3
      data-testid="artist-name"
      class="text-xl font-semibold text-gray-900 mb-2"
    >
      {{ artist.name }}
    </h3>

    <!-- Disambiguation (if present) -->
    <p
      v-if="artist.disambiguation"
      class="text-sm text-gray-500 mb-4"
    >
      {{ artist.disambiguation }}
    </p>

    <!-- Statistics -->
    <div class="flex items-center gap-2 mb-3 text-sm text-gray-700">
      <span data-testid="owned-count" class="font-medium">
        {{ artist.owned_albums || 0 }}
      </span>
      <span>of</span>
      <span data-testid="total-count" class="font-medium">
        {{ artist.total_albums || 0 }}
      </span>
      <span>albums owned</span>
    </div>

    <!-- Progress Bar -->
    <div
      data-testid="progress-bar"
      class="w-full bg-gray-200 rounded-full h-2.5 mb-2"
    >
      <div
        data-testid="progress-fill"
        :class="completionColor"
        class="h-2.5 rounded-full transition-all duration-300"
        :style="{ width: `${artist.completion_percentage || 0}%` }"
      ></div>
    </div>

    <!-- Completion Percentage -->
    <div class="flex justify-between items-center">
      <span
        data-testid="completion-percentage"
        class="text-sm font-semibold text-gray-800"
      >
        {{ artist.completion_percentage || 0 }}%
      </span>
      <span class="text-xs text-gray-500">
        {{ artist.total_albums === 0 ? 'No albums' : 'Complete' }}
      </span>
    </div>

    <!-- Linked Folder Indicator -->
    <div
      v-if="artist.linked_folder_path"
      class="mt-3 pt-3 border-t border-gray-200"
    >
      <div class="flex items-center gap-2 text-xs text-gray-600">
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <span class="truncate" :title="artist.linked_folder_path">
          Linked folder
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.artist-summary-card {
  @apply transition-transform;
}

.artist-summary-card:hover {
  @apply transform scale-105;
}

.artist-summary-card:active {
  @apply transform scale-100;
}
</style>
