<script setup lang="ts">
import { ref } from 'vue'
import { useSearchProviders } from '../../composables/useSearchProviders'
import LoadingSpinner from '../common/LoadingSpinner.vue'
import ErrorMessage from '../common/ErrorMessage.vue'
import type { SearchProvider } from '../../../../shared/types/index.js'

const { providers, loading, error, addProvider, editProvider, removeProvider } =
  useSearchProviders()

const showAddForm = ref(false)
const editingId = ref<number | null>(null)

// Add form state
const newProviderName = ref('')
const newProviderUrl = ref('')
const addError = ref<string | null>(null)
const adding = ref(false)

// Edit form state
const editingName = ref('')
const editingUrl = ref('')
const editError = ref<string | null>(null)
const updating = ref(false)

// Delete confirmation state
const deletingId = ref<number | null>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

const handleAdd = async () => {
  addError.value = null
  adding.value = true

  try {
    await addProvider(newProviderName.value, newProviderUrl.value)

    // Reset form
    newProviderName.value = ''
    newProviderUrl.value = ''
    showAddForm.value = false
  } catch (err: any) {
    addError.value = err.message || 'Failed to add provider'
  } finally {
    adding.value = false
  }
}

const startEdit = (provider: SearchProvider) => {
  editingId.value = provider.id
  editingName.value = provider.name
  editingUrl.value = provider.urlTemplate
  editError.value = null
}

const cancelEdit = () => {
  editingId.value = null
  editingName.value = ''
  editingUrl.value = ''
  editError.value = null
}

const handleEdit = async (id: number) => {
  editError.value = null
  updating.value = true

  try {
    await editProvider(id, {
      name: editingName.value,
      urlTemplate: editingUrl.value
    })

    // Reset edit state
    editingId.value = null
    editingName.value = ''
    editingUrl.value = ''
  } catch (err: any) {
    editError.value = err.message || 'Failed to update provider'
  } finally {
    updating.value = false
  }
}

const handleDelete = async (id: number) => {
  deletingId.value = id
  deleteError.value = null
  deleting.value = true

  try {
    await removeProvider(id)
    deletingId.value = null
  } catch (err: any) {
    deleteError.value = err.message || 'Failed to delete provider'
  } finally {
    deleting.value = false
  }
}

const cancelDelete = () => {
  deletingId.value = null
  deleteError.value = null
}
</script>

<template>
  <div class="search-providers-list">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold">Search Providers</h3>
      <button
        v-if="!showAddForm"
        @click="showAddForm = true"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Add Provider
      </button>
    </div>

    <LoadingSpinner v-if="loading && providers.length === 0" />

    <ErrorMessage v-if="error" :message="error" />

    <!-- Add Form -->
    <div
      v-if="showAddForm"
      class="mb-6 p-4 border border-gray-300 rounded-md bg-gray-50"
    >
      <h4 class="text-md font-semibold mb-3">Add Search Provider</h4>

      <div class="space-y-3">
        <div>
          <label for="new-provider-name" class="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="new-provider-name"
            v-model="newProviderName"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Discogs"
          />
        </div>

        <div>
          <label for="new-provider-url" class="block text-sm font-medium text-gray-700 mb-1">
            URL Template
          </label>
          <input
            id="new-provider-url"
            v-model="newProviderUrl"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://www.discogs.com/search/?q={artist}+{album}"
          />
          <p class="mt-1 text-sm text-gray-500">
            Use {artist} and {album} as placeholders
          </p>
        </div>

        <div v-if="addError" class="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          {{ addError }}
        </div>

        <div class="flex gap-3">
          <button
            @click="handleAdd"
            :disabled="adding || !newProviderName || !newProviderUrl"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ adding ? 'Adding...' : 'Add' }}
          </button>
          <button
            @click="showAddForm = false"
            :disabled="adding"
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Providers List -->
    <div v-if="!loading && !error && providers.length === 0 && !showAddForm" class="text-center py-8 text-gray-500">
      No search providers configured. Click "Add Provider" to get started.
    </div>

    <div v-if="providers.length > 0" class="space-y-3">
      <div
        v-for="provider in providers"
        :key="provider.id"
        class="p-4 border border-gray-300 rounded-md bg-white"
      >
        <!-- View Mode -->
        <div v-if="editingId !== provider.id && deletingId !== provider.id" class="space-y-2">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h4 class="text-md font-semibold text-gray-900">{{ provider.name }}</h4>
              <p class="text-sm text-gray-600 break-all mt-1">{{ provider.urlTemplate }}</p>
            </div>
            <div class="flex gap-2 ml-4">
              <button
                @click="startEdit(provider)"
                class="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Edit
              </button>
              <button
                @click="deletingId = provider.id"
                class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Edit Mode -->
        <div v-if="editingId === provider.id" class="space-y-3">
          <div>
            <label :for="`edit-name-${provider.id}`" class="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              :id="`edit-name-${provider.id}`"
              v-model="editingName"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label :for="`edit-url-${provider.id}`" class="block text-sm font-medium text-gray-700 mb-1">
              URL Template
            </label>
            <input
              :id="`edit-url-${provider.id}`"
              v-model="editingUrl"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div v-if="editError" class="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {{ editError }}
          </div>

          <div class="flex gap-3">
            <button
              @click="handleEdit(provider.id)"
              :disabled="updating || !editingName || !editingUrl"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ updating ? 'Saving...' : 'Save' }}
            </button>
            <button
              @click="cancelEdit"
              :disabled="updating"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Delete Confirmation -->
        <div v-if="deletingId === provider.id" class="space-y-3">
          <p class="text-sm text-gray-700">
            Are you sure you want to delete "{{ provider.name }}"? This action cannot be undone.
          </p>

          <div v-if="deleteError" class="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {{ deleteError }}
          </div>

          <div class="flex gap-3">
            <button
              @click="handleDelete(provider.id)"
              :disabled="deleting"
              class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
            <button
              @click="cancelDelete"
              :disabled="deleting"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
