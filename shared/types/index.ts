/**
 * Shared TypeScript types for Album Tracker
 * Used by both frontend and backend
 */

export interface Artist {
  id: number
  mbid: string
  name: string
  sort_name: string | null
  disambiguation: string | null
  linked_folder_path: string | null
  created_at: string
  updated_at: string
  // Computed fields (not in DB)
  total_albums?: number
  owned_albums?: number
  completion_percentage?: number
}

export interface Album {
  id: number
  artist_id: number
  mbid: string
  title: string
  release_year: number | null
  release_date: string | null
  disambiguation: string | null
  ownership_status: 'Owned' | 'Missing' | 'Ambiguous'
  matched_folder_path: string | null
  match_confidence: number | null
  is_manual_override: boolean
  created_at: string
  updated_at: string
}

export interface Settings {
  id: 1
  library_root_path: string
  similarity_threshold: number
  api_rate_limit_ms: number
  max_api_retries: number
  updated_at: string
}

export interface FilesystemCacheEntry {
  id: number
  folder_path: string
  folder_name: string
  parent_path: string
  is_artist_folder: boolean
  parsed_year: number | null
  parsed_title: string | null
  scanned_at: string
}
