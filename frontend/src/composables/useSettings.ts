/**
 * useSettings Composable
 *
 * Reactive state management for application settings.
 */

import { ref, onMounted } from 'vue'
import { api } from '../services/api'

export interface Settings {
  id: number
  library_root_path: string
  similarity_threshold: number
  api_rate_limit_ms: number
  max_api_retries: number
  updated_at: string
}

export function useSettings() {
  const settings = ref<Settings | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchSettings = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await api.get('/settings')
      settings.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch settings'
      console.error('Error fetching settings:', err)
    } finally {
      loading.value = false
    }
  }

  const updateSettings = async (updates: Partial<Settings>) => {
    loading.value = true
    error.value = null

    try {
      const response = await api.patch('/settings', updates)
      settings.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update settings'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    fetchSettings()
  })

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings
  }
}
