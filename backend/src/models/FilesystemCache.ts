/**
 * FilesystemCache Model
 *
 * Represents a cached entry from filesystem scan.
 * Used for fast matching without repeated file I/O.
 */

export interface FilesystemCacheEntry {
  id: number
  folder_path: string
  folder_name: string
  parent_path: string
  is_artist_folder: boolean
  parsed_year: number | null
  parsed_title: string | null
  scanned_at: string // ISO 8601 timestamp
}

export interface CreateFilesystemCacheEntry {
  folder_path: string
  folder_name: string
  parent_path: string
  is_artist_folder: boolean
  parsed_year: number | null
  parsed_title: string | null
}
