/**
 * useSearchProviders Composable
 *
 * Reactive state management for search providers.
 */

import { ref, onMounted } from 'vue'
import type { SearchProvider } from '../../../shared/types/index.js'
import {
  listSearchProviders,
  createSearchProvider,
  updateSearchProvider,
  deleteSearchProvider,
  SearchProviderApiError
} from '../services/searchProviderService'

export function useSearchProviders() {
  const providers = ref<SearchProvider[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchProviders = async () => {
    loading.value = true
    error.value = null

    try {
      providers.value = await listSearchProviders()
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch search providers'
      console.error('Error fetching search providers:', err)
    } finally {
      loading.value = false
    }
  }

  const addProvider = async (name: string, urlTemplate: string) => {
    loading.value = true
    error.value = null

    try {
      const newProvider = await createSearchProvider(name, urlTemplate)
      providers.value.push(newProvider)
      return newProvider
    } catch (err: any) {
      error.value = err.message || 'Failed to create search provider'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const editProvider = async (id: number, updates: { name?: string; urlTemplate?: string }) => {
    loading.value = true
    error.value = null

    try {
      const updatedProvider = await updateSearchProvider(id, updates)
      const index = providers.value.findIndex(p => p.id === id)
      if (index !== -1) {
        providers.value[index] = updatedProvider
      }
      return updatedProvider
    } catch (err: any) {
      error.value = err.message || 'Failed to update search provider'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const removeProvider = async (id: number) => {
    loading.value = true
    error.value = null

    try {
      await deleteSearchProvider(id)
      providers.value = providers.value.filter(p => p.id !== id)
    } catch (err: any) {
      error.value = err.message || 'Failed to delete search provider'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    fetchProviders()
  })

  return {
    providers,
    loading,
    error,
    fetchProviders,
    addProvider,
    editProvider,
    removeProvider
  }
}
