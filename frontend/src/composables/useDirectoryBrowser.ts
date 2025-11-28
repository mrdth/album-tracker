/**
 * Directory Browser Composable
 *
 * Provides state and methods for directory browsing functionality
 */

import { ref } from 'vue'
import { api } from '../services/api'

export function useDirectoryBrowser() {
  const isOpen = ref(false)
  const initialPath = ref('')

  function open(path: string = '') {
    initialPath.value = path
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  async function selectFolder(albumId: number, folderPath: string): Promise<void> {
    await api.updateAlbum(albumId, {
      matched_folder_path: folderPath,
    })
  }

  return {
    isOpen,
    initialPath,
    open,
    close,
    selectFolder,
  }
}
