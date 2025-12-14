<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Album } from '../../../../shared/types/index.js'
import { useSearchProviders } from '../../composables/useSearchProviders'

interface Props {
  album: Album
  artistName: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  linkFolder: [albumId: number]
  toggleOwnership: [albumId: number]
  clearOverride: [albumId: number]
  ignoreAlbum: [albumId: number]
  unignoreAlbum: [albumId: number]
}>()

// Search providers
const { providers } = useSearchProviders()
const showSearchDropdown = ref(false)

// Check if search dropdown should be shown (only for missing albums with providers)
const shouldShowSearchDropdown = computed(() => {
  return props.album.ownership_status === 'Missing' && providers.value.length > 0
})

/**
 * Build search URL from template by replacing {artist} and {album} placeholders
 */
function buildSearchUrl(urlTemplate: string): string {
  return urlTemplate
    .replace(/{artist}/g, encodeURIComponent(props.artistName))
    .replace(/{album}/g, encodeURIComponent(props.album.title))
}

/**
 * Handle search provider click - opens URL in new tab
 */
function handleSearch(urlTemplate: string) {
  const searchUrl = buildSearchUrl(urlTemplate)
  window.open(searchUrl, '_blank', 'noopener,noreferrer')
  showSearchDropdown.value = false
}

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

function handleIgnoreAlbum() {
  emit('ignoreAlbum', props.album.id)
}

function handleUnignoreAlbum() {
  emit('unignoreAlbum', props.album.id)
}
</script>

<template>
  <div
    class="card hover:shadow-lg transition-shadow"
    :class="{ 'opacity-50': album.is_ignored }"
    data-testid="album-card"
  >
    <div class="flex items-start justify-between mb-2">
      <h3
        class="text-lg font-semibold text-gray-900 flex-1"
        :class="{ 'line-through text-gray-500': album.is_ignored }"
        data-testid="album-title"
      >
        {{ album.title }}
      </h3>
      <div class="flex items-center gap-2 ml-2">
        <!-- Ignored indicator badge -->
        <span
          v-if="album.is_ignored"
          data-testid="ignored-indicator"
          class="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
        >
          Ignored
        </span>
        <!-- Ownership status badge -->
        <span
          data-testid="ownership-status"
          :class="[
            'px-2 py-1 rounded-full text-xs font-medium',
            getStatusBadge(album.ownership_status),
          ]"
        >
          {{ album.ownership_status }}
        </span>
      </div>
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
      <!-- Search Dropdown (only for missing albums with providers) -->
      <div v-if="shouldShowSearchDropdown" class="relative" data-testid="search-dropdown-container">
        <button
          type="button"
          data-testid="search-dropdown-button"
          class="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center gap-1"
          @click="showSearchDropdown = !showSearchDropdown"
          :aria-expanded="showSearchDropdown"
          aria-haspopup="true"
        >
          Search
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <!-- Dropdown Menu -->
        <div
          v-if="showSearchDropdown"
          data-testid="search-dropdown-menu"
          class="absolute left-0 mt-1 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200 max-h-60 overflow-auto"
          role="menu"
        >
          <a
            v-for="provider in providers"
            :key="provider.id"
            :href="buildSearchUrl(provider.urlTemplate)"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="search-provider-link"
            class="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-900 cursor-pointer"
            role="menuitem"
            @click.prevent="handleSearch(provider.urlTemplate)"
          >
            {{ provider.name }}
          </a>
        </div>
      </div>

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

      <!-- Ignore/Un-ignore button (only show for unowned albums) -->
      <button
        v-if="album.ownership_status !== 'Owned' && !album.is_ignored"
        type="button"
        data-testid="ignore-album-button"
        class="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
        @click="handleIgnoreAlbum"
      >
        Ignore
      </button>

      <!-- Un-ignore button (only show for ignored unowned albums) -->
      <button
        v-if="album.ownership_status !== 'Owned' && album.is_ignored"
        type="button"
        data-testid="unignore-album-button"
        class="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500"
        @click="handleUnignoreAlbum"
      >
        Un-ignore
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
