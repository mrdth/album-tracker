<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    data-testid="directory-browser-dialog"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-900">Select Album Folder</h2>
        <p class="text-sm text-gray-600 mt-1">
          Current path: {{ currentPath || '/' }}
        </p>
      </div>

      <!-- Directory list -->
      <div class="flex-1 overflow-y-auto p-6" data-testid="directory-list">
        <!-- Loading state -->
        <div v-if="loading" class="text-center py-8 text-gray-500">
          Loading directories...
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8 text-red-600">
          {{ error }}
        </div>

        <!-- Directory list -->
        <div v-else class="space-y-2">
          <!-- Parent directory option -->
          <button
            v-if="parentPath !== null"
            data-testid="parent-directory-item"
            class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            :class="{ 'bg-blue-50': selectedIndex === -1 }"
            @click="navigateToParent"
            @dblclick="navigateToParent"
          >
            <svg class="w-5 h-5 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span class="font-medium text-gray-700">..</span>
            <span class="ml-2 text-sm text-gray-500">(Parent directory)</span>
          </button>

          <!-- Directories -->
          <button
            v-for="(dir, index) in directories"
            :key="dir.path"
            :data-testid="'directory-item'"
            class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            :class="{ 'bg-blue-50': selectedIndex === index }"
            @click="selectDirectory(index)"
            @dblclick="navigateInto(dir.path)"
          >
            <svg class="w-5 h-5 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span class="text-gray-900">{{ dir.name }}</span>
          </button>

          <!-- Empty state -->
          <div v-if="directories.length === 0 && parentPath === null" class="text-center py-8 text-gray-500">
            No directories found
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
        <div class="text-sm text-gray-600">
          <span v-if="selectedDirectory">
            Selected: <span class="font-medium">{{ selectedDirectory.name }}</span>
          </span>
          <span v-else class="text-gray-400">
            No folder selected
          </span>
        </div>
        <div class="flex gap-3">
          <button
            type="button"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="confirm-selection-button"
            class="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!selectedDirectory"
            @click="confirmSelection"
          >
            Select Folder
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '../../services/api'

const props = defineProps<{
  initialPath?: string
}>()

const emit = defineEmits<{
  close: []
  select: [path: string]
}>()

const currentPath = ref(props.initialPath || '')
const parentPath = ref<string | null>(null)
const directories = ref<Array<{ name: string; path: string }>>([])
const loading = ref(false)
const error = ref<string | null>(null)
const selectedIndex = ref<number | null>(null)

const selectedDirectory = computed(() => {
  if (selectedIndex.value === null || selectedIndex.value < 0) {
    return null
  }
  return directories.value[selectedIndex.value]
})

async function loadDirectory(path: string) {
  loading.value = true
  error.value = null
  selectedIndex.value = null

  try {
    const response = await api.browseDirectory(path)
    currentPath.value = response.current_path
    parentPath.value = response.parent_path
    directories.value = response.directories
  } catch (err: any) {
    error.value = err.message || 'Failed to load directory'
  } finally {
    loading.value = false
  }
}

function selectDirectory(index: number) {
  selectedIndex.value = index
}

function navigateInto(path: string) {
  loadDirectory(path)
}

function navigateToParent() {
  if (parentPath.value !== null) {
    loadDirectory(parentPath.value)
  }
}

function confirmSelection() {
  if (selectedDirectory.value) {
    emit('select', selectedDirectory.value.path)
    emit('close')
  }
}

// Keyboard navigation
function handleKeyDown(event: KeyboardEvent) {
  const maxIndex = directories.value.length - 1

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (selectedIndex.value === null) {
        selectedIndex.value = 0
      } else if (selectedIndex.value < maxIndex) {
        selectedIndex.value++
      }
      break

    case 'ArrowUp':
      event.preventDefault()
      if (selectedIndex.value === null) {
        selectedIndex.value = maxIndex
      } else if (selectedIndex.value > 0) {
        selectedIndex.value--
      } else if (parentPath.value !== null) {
        selectedIndex.value = -1
      }
      break

    case 'Enter':
      event.preventDefault()
      if (selectedIndex.value === -1) {
        navigateToParent()
      } else if (selectedDirectory.value) {
        navigateInto(selectedDirectory.value.path)
      }
      break

    case 'Escape':
      event.preventDefault()
      emit('close')
      break

    case 'Backspace':
      event.preventDefault()
      if (parentPath.value !== null) {
        navigateToParent()
      }
      break
  }
}

onMounted(() => {
  loadDirectory(currentPath.value)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>
