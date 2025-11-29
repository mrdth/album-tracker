<script setup lang="ts">
import { ref } from 'vue'
import type { Artist } from '../../../../shared/types/index.js'
import DirectoryBrowser from '../albums/DirectoryBrowser.vue'
import { api } from '../../services/api'

interface Props {
  artist: Artist
}

const props = defineProps<Props>()
const emit = defineEmits<{
  update: []
}>()

const showDirectoryBrowser = ref(false)
const isLinking = ref(false)

async function handleLinkFolder(folderPath: string) {
  try {
    isLinking.value = true
    await api.updateArtist(props.artist.id, { linked_folder_path: folderPath })
    emit('update')
  } catch (error) {
    console.error('Failed to link artist folder:', error)
    alert('Failed to link artist folder. Please try again.')
  } finally {
    isLinking.value = false
    showDirectoryBrowser.value = false
  }
}

async function handleClearLink() {
  if (
    !confirm(
      'Are you sure you want to clear the linked artist folder? The app will revert to automatic folder detection.'
    )
  ) {
    return
  }

  try {
    isLinking.value = true
    await api.updateArtist(props.artist.id, { linked_folder_path: null })
    emit('update')
  } catch (error) {
    console.error('Failed to clear artist folder link:', error)
    alert('Failed to clear artist folder link. Please try again.')
  } finally {
    isLinking.value = false
  }
}

function openDirectoryBrowser() {
  showDirectoryBrowser.value = true
}
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

        <p v-if="artist.sort_name" class="text-sm text-gray-500 mb-2">
          Sort name: {{ artist.sort_name }}
        </p>

        <!-- Linked Folder Path Display -->
        <div v-if="artist.linked_folder_path" class="mt-3 flex items-center gap-2">
          <div class="flex items-center gap-2 text-sm bg-blue-50 px-3 py-2 rounded-lg">
            <svg
              class="w-4 h-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <span class="text-blue-900 font-medium">Linked folder:</span>
            <span data-testid="linked-folder-path" class="text-blue-700 font-mono">
              {{ artist.linked_folder_path }}
            </span>
          </div>
          <button
            type="button"
            data-testid="clear-artist-folder-link-button"
            class="text-sm px-3 py-2 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            :disabled="isLinking"
            @click="handleClearLink"
          >
            Clear Link
          </button>
        </div>

        <!-- Link Artist Folder Button -->
        <div v-else class="mt-3">
          <button
            type="button"
            data-testid="link-artist-folder-button"
            class="text-sm px-4 py-2 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2"
            :disabled="isLinking"
            @click="openDirectoryBrowser"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            Link Artist Folder
          </button>
        </div>
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

    <!-- Directory Browser Modal -->
    <DirectoryBrowser
      v-if="showDirectoryBrowser"
      @select="handleLinkFolder"
      @close="showDirectoryBrowser = false"
    />
  </div>
</template>
