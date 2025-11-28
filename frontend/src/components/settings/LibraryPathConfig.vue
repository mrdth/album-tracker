<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSettings } from '../../composables/useSettings'
import LoadingSpinner from '../common/LoadingSpinner.vue'
import ErrorMessage from '../common/ErrorMessage.vue'

const { settings, loading, error, updateSettings } = useSettings()

const libraryPath = ref('')
const saving = ref(false)
const saveError = ref<string | null>(null)
const saveSuccess = ref(false)

// Initialize library path when settings load
const updateLibraryPath = () => {
  if (settings.value) {
    libraryPath.value = settings.value.library_root_path
  }
}

// Watch for settings changes and update libraryPath
watch(
  settings,
  newSettings => {
    if (newSettings) {
      libraryPath.value = newSettings.library_root_path
    }
  },
  { immediate: true }
)

// Check if path has been changed
const isPathChanged = computed(() => {
  return settings.value && libraryPath.value !== settings.value.library_root_path
})

const handleSave = async () => {
  saveError.value = null
  saveSuccess.value = false
  saving.value = true

  try {
    await updateSettings({ library_root_path: libraryPath.value })
    saveSuccess.value = true

    // Clear success message after 3 seconds
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } catch (err: any) {
    saveError.value = err.message || 'Failed to save library path'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="library-path-config">
    <h3 class="text-lg font-semibold mb-4">Music Library Path</h3>

    <LoadingSpinner v-if="loading" />

    <ErrorMessage v-if="error" :message="error" />

    <div v-if="!loading && !error" class="space-y-4">
      <div class="form-group">
        <label for="library-path" class="block text-sm font-medium text-gray-700 mb-2">
          Library Root Path
        </label>
        <input
          id="library-path"
          v-model="libraryPath"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="/path/to/music/library"
          :aria-describedby="saveError ? 'path-error' : undefined"
        />
        <p class="mt-2 text-sm text-gray-500">Absolute path to your music library folder</p>
      </div>

      <div
        v-if="saveError"
        id="path-error"
        role="alert"
        class="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm"
      >
        {{ saveError }}
      </div>

      <div
        v-if="saveSuccess"
        role="status"
        class="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm"
      >
        Library path saved successfully!
      </div>

      <div class="flex gap-3">
        <button
          @click="handleSave"
          :disabled="saving || !isPathChanged"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="saving">Saving...</span>
          <span v-else>Save</span>
        </button>

        <button
          v-if="isPathChanged"
          @click="updateLibraryPath"
          :disabled="saving"
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <div v-if="settings" class="mt-6 p-4 bg-gray-50 rounded-md">
        <h4 class="text-sm font-semibold text-gray-700 mb-2">Advanced Settings</h4>
        <div class="space-y-2 text-sm text-gray-600">
          <div>
            <span class="font-medium">Similarity Threshold:</span>
            {{ (settings.similarity_threshold * 100).toFixed(0) }}%
          </div>
          <div>
            <span class="font-medium">API Rate Limit:</span>
            {{ settings.api_rate_limit_ms }}ms
          </div>
          <div>
            <span class="font-medium">Max Retries:</span>
            {{ settings.max_api_retries }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../../assets/main.css";
.library-path-config {
  @apply max-w-2xl;
}
</style>
