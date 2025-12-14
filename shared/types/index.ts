/**
 * Shared TypeScript Interfaces
 *
 * Type definitions shared between frontend and backend
 */

export interface Artist {
  id: number;
  mbid: string;
  name: string;
  sort_name: string | null;
  disambiguation: string | null;
  linked_folder_path: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  // Computed fields (not in DB)
  total_albums?: number;
  owned_albums?: number;
  completion_percentage?: number;
}

export interface Album {
  id: number;
  artist_id: number;
  mbid: string;
  title: string;
  release_year: number | null;
  release_date: string | null;
  disambiguation: string | null;
  ownership_status: "Owned" | "Missing" | "Ambiguous";
  matched_folder_path: string | null;
  match_confidence: number | null; // 0.0-1.0
  is_manual_override: boolean;
  is_ignored: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface SearchProvider {
  id: number;
  name: string;
  urlTemplate: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface Settings {
  id: 1;
  library_root_path: string;
  similarity_threshold: number; // 0.0-1.0
  api_rate_limit_ms: number;
  max_api_retries: number;
  last_scan_at: string | null; // ISO 8601
  updated_at: string; // ISO 8601
  search_providers: SearchProvider[];
}

export interface FilesystemCacheEntry {
  id: number;
  folder_path: string;
  folder_name: string;
  parent_path: string;
  is_artist_folder: boolean;
  parsed_year: number | null;
  parsed_title: string | null;
  scanned_at: string; // ISO 8601
}

// API Response Types

export interface ArtistSearchResult {
  mbid: string;
  name: string;
  sort_name: string | null;
  disambiguation: string | null;
  type: string | null;
  country: string | null;
}

export interface ArtistImportResponse {
  artist: Artist;
  albums_imported: number;
}

export interface ScanResult {
  artist_id: number;
  folders_scanned: number;
  albums_updated: number;
  new_owned: number;
  new_missing: number;
  new_ambiguous: number;
}

export interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
}
