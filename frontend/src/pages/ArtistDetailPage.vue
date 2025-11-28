<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { ApiError } from '../services/api.js'
import type { Artist, Album } from '../../../shared/types/index.js'
import ArtistDetailHeader from '../components/artist/ArtistDetailHeader.vue'
import AlbumGrid from '../components/artist/AlbumGrid.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ErrorMessage from '../components/common/ErrorMessage.vue'
import DirectoryBrowser from '../components/albums/DirectoryBrowser.vue'
import { useFilesystemScan } from '../composables/useFilesystemScan'
import { useDirectoryBrowser } from '../composables/useDirectoryBrowser'

const route = useRoute()
const router = useRouter()

const artistId = parseInt(route.params.artistId as string, 10)

const artist = ref<Artist | null>(null)
const albums = ref<Album[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

const { scanning, scanResult, scanError, scanProgress, triggerScan, resetScan } =
  useFilesystemScan()

const {
  isOpen: directoryBrowserOpen,
  initialPath,
  open: openDirectoryBrowser,
  close: closeDirectoryBrowser,
} = useDirectoryBrowser()

const currentAlbumId = ref<number | null>(null)

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

const handleScan = async () => {
  resetScan()
  const result = await triggerScan(artistId)

  if (result) {
    // Reload artist data to get updated ownership status
    await loadArtist()
  }
}

const handleLinkFolder = (albumId: number) => {
  currentAlbumId.value = albumId
  openDirectoryBrowser('')
}

const handleFolderSelected = async (folderPath: string) => {
  if (currentAlbumId.value === null) return

  try {
    await api.updateAlbum(currentAlbumId.value, {
      matched_folder_path: folderPath,
    })
    // Reload artist data to get updated album
    await loadArtist()
  } catch (err) {
    console.error('Failed to link folder:', err)
    error.value = 'Failed to link folder to album'
  } finally {
    currentAlbumId.value = null
  }
}

const handleToggleOwnership = async (albumId: number) => {
  try {
    // Find the album to determine new status
    const album = albums.value.find(a => a.id === albumId)
    if (!album) return

    const newStatus = album.ownership_status === 'Owned' ? 'Missing' : 'Owned'

    await api.updateAlbum(albumId, {
      ownership_status: newStatus,
    })
    // Reload artist data
    await loadArtist()
  } catch (err) {
    console.error('Failed to toggle ownership:', err)
    error.value = 'Failed to toggle album ownership'
  }
}

const handleClearOverride = async (albumId: number) => {
  try {
    await api.updateAlbum(albumId, {
      clear_override: true,
    })
    // Reload artist data
    await loadArtist()
  } catch (err) {
    console.error('Failed to clear override:', err)
    error.value = 'Failed to clear manual override'
  }
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

        <!-- Scan Controls -->
        <div class="mb-6 p-4 bg-white rounded-lg shadow">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Library Scan</h3>
              <p class="text-sm text-gray-600">
                Scan your music library to match albums with filesystem folders
              </p>
            </div>
            <button
              @click="handleScan"
              :disabled="scanning"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="scanning">Scanning...</span>
              <span v-else>Scan Library</span>
            </button>
          </div>

          <!-- Scan Progress -->
          <div v-if="scanning" class="mt-4" role="status" aria-live="polite">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${scanProgress}%` }"
              />
            </div>
            <p class="text-sm text-gray-600 mt-2">Scanning library... {{ scanProgress }}%</p>
          </div>

          <!-- Scan Result -->
          <div
            v-if="scanResult"
            class="mt-4 p-3 bg-green-50 border border-green-200 rounded-md"
            role="region"
            aria-label="Scan summary"
          >
            <p class="text-sm text-green-800">
              <strong>Scan complete!</strong> Scanned {{ scanResult.scanned_folders }} folders,
              matched {{ scanResult.matched_albums }} albums.
            </p>
          </div>

          <!-- Scan Error -->
          <div
            v-if="scanError"
            class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md"
            role="alert"
          >
            <p class="text-sm text-red-800">{{ scanError }}</p>
          </div>
        </div>

        <div class="mb-4">
          <h2 class="text-2xl font-semibold text-gray-900">Discography</h2>
        </div>

        <AlbumGrid
          :albums="albums"
          @link-folder="handleLinkFolder"
          @toggle-ownership="handleToggleOwnership"
          @clear-override="handleClearOverride"
        />
      </div>
    </div>

    <!-- Directory Browser Dialog -->
    <DirectoryBrowser
      v-if="directoryBrowserOpen"
      :initial-path="initialPath"
      @select="handleFolderSelected"
      @close="closeDirectoryBrowser"
    />
  </div>
</template>
