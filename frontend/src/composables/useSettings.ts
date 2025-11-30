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
      settings.value = await api.getSettings()
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch settings'
      console.error('Error fetching settings:', err)
    } finally {
      loading.value = false
    }
  }

  const updateSettings = async (updates: Partial<Settings>) => {
    loading.value = true
    error.value = null

    try {
      settings.value = await api.updateSettings(updates)
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update settings'
      error.value = errorMsg
      throw new Error(errorMsg)
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
    updateSettings,
  }
}
