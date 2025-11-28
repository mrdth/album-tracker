<script setup lang="ts">
import LibraryPathConfig from '../components/settings/LibraryPathConfig.vue'
</script>

<template>
  <div class="settings-page">
    <div class="container mx-auto px-4 py-8">
      <header class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
        <p class="mt-2 text-gray-600">
          Configure your music library and album matching preferences
        </p>
      </header>

      <div class="bg-white rounded-lg shadow-md p-6">
        <LibraryPathConfig />
      </div>

      <div class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 class="text-sm font-semibold text-blue-900 mb-2">How Scanning Works</h3>
        <ul class="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>
            The scanner looks for folders matching the pattern
            <code class="bg-blue-100 px-1 rounded">[YYYY] Album Title</code>
          </li>
          <li>
            Albums are matched using fuzzy string matching with {{ '80%' }} similarity threshold
          </li>
          <li>Manual overrides are preserved across scans</li>
          <li>Artist folders can be auto-detected or manually linked</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/main.css";
.settings-page {
  @apply min-h-screen bg-gray-50;
}
</style>
