<script setup lang="ts">
import type { Album } from '../../../../shared/types/index.js'
import AlbumCard from './AlbumCard.vue'

interface Props {
  albums: Album[]
  artistName: string
}

defineProps<Props>()

const emit = defineEmits<{
  linkFolder: [albumId: number]
  toggleOwnership: [albumId: number]
  clearOverride: [albumId: number]
  ignoreAlbum: [albumId: number]
  unignoreAlbum: [albumId: number]
}>()
</script>

<template>
  <div>
    <div v-if="albums.length === 0" class="text-center py-12 text-gray-500">
      <p>No albums found for this artist.</p>
    </div>

    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      role="region"
      aria-label="Album collection"
    >
      <AlbumCard
        v-for="album in albums"
        :key="album.id"
        :album="album"
        :artist-name="artistName"
        @link-folder="emit('linkFolder', $event)"
        @toggle-ownership="emit('toggleOwnership', $event)"
        @clear-override="emit('clearOverride', $event)"
        @ignore-album="emit('ignoreAlbum', $event)"
        @unignore-album="emit('unignoreAlbum', $event)"
      />
    </div>

    <div v-if="albums.length > 0" class="mt-6 text-center text-sm text-gray-500">
      Showing {{ albums.length }} album{{ albums.length === 1 ? '' : 's' }}
    </div>
  </div>
</template>
