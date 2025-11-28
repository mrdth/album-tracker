/**
 * useFilesystemScan Composable
 *
 * Reactive state management for filesystem scanning.
 */

import { ref } from 'vue'
import { api } from '../services/api'

export interface ScanResult {
  artist_id: number
  scanned_folders: number
  matched_albums: number
  scan_completed_at: string
}

export function useFilesystemScan() {
  const scanning = ref(false)
  const scanResult = ref<ScanResult | null>(null)
  const scanError = ref<string | null>(null)
  const scanProgress = ref(0)

  const triggerScan = async (artistId: number): Promise<ScanResult | null> => {
    scanning.value = true
    scanError.value = null
    scanProgress.value = 0

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        if (scanProgress.value < 90) {
          scanProgress.value += 10
        }
      }, 200)

      const result = await api.scanFilesystem(artistId)
      scanResult.value = result

      clearInterval(progressInterval)
      scanProgress.value = 100

      return result
    } catch (err: any) {
      scanError.value = err.message || 'Failed to scan library'
      console.error('Error scanning library:', err)
      return null
    } finally {
      scanning.value = false
    }
  }

  const resetScan = () => {
    scanResult.value = null
    scanError.value = null
    scanProgress.value = 0
  }

  return {
    scanning,
    scanResult,
    scanError,
    scanProgress,
    triggerScan,
    resetScan,
  }
}
