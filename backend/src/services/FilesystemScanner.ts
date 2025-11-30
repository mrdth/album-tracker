/**
 * FilesystemScanner Service
 *
 * Scans music library filesystem and caches folder structure.
 * Implements security best practices for path traversal prevention.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { CreateFilesystemCacheEntry } from '../models/FilesystemCache'
import { safeResolvePath } from '../utils/pathValidation'

export interface ParsedFolder {
  year: number | null
  title: string
}

export class FilesystemScanner {
  private libraryRoot: string

  constructor(libraryRoot: string) {
    if (!path.isAbsolute(libraryRoot)) {
      throw new Error('Library root must be an absolute path')
    }
    this.libraryRoot = libraryRoot
  }

  /**
   * Scan entire library and return cache entries
   */
  async scan(): Promise<CreateFilesystemCacheEntry[]> {
    const entries: CreateFilesystemCacheEntry[] = []

    try {
      await this.scanDirectory(this.libraryRoot, entries)
    } catch (error) {
      console.error('Error scanning library:', error)
      // Return partial results even if scan fails
    }

    return entries
  }

  /**
   * Recursively scan directory and populate cache entries
   */
  private async scanDirectory(
    dirPath: string,
    entries: CreateFilesystemCacheEntry[]
  ): Promise<void> {
    let dirEntries: any[]

    try {
      dirEntries = await fs.readdir(dirPath, { withFileTypes: true })
    } catch (error: any) {
      // Handle permission errors or non-existent paths gracefully
      if (error.code === 'EACCES' || error.code === 'ENOENT') {
        console.warn(`Cannot access directory: ${dirPath}`)
        return
      }
      throw error
    }

    for (const entry of dirEntries) {
      if (!entry.isDirectory()) {
        continue // Skip files
      }

      const folderPath = path.join(dirPath, entry.name)
      const parsed = this.parseFolderName(entry.name)
      const isArtist = this.isArtistFolder(entry.name)

      entries.push({
        folder_path: folderPath,
        folder_name: entry.name,
        parent_path: dirPath,
        is_artist_folder: isArtist,
        parsed_year: parsed.year,
        parsed_title: parsed.title,
      })

      // Recursively scan subdirectories
      await this.scanDirectory(folderPath, entries)
    }
  }

  /**
   * Parse folder name to extract year and title
   * Format: [YYYY] Title
   */
  parseFolderName(folderName: string): ParsedFolder {
    // Regex to match [YYYY] prefix
    const yearMatch = folderName.match(/^\[(\d{4})\]/)

    let year: number | null = null
    let title = folderName

    if (yearMatch) {
      year = parseInt(yearMatch[1], 10)
      // Remove [YYYY] prefix from title
      title = folderName.substring(yearMatch[0].length).trim()
    }

    // Normalize title: lowercase, remove punctuation, trim
    const normalizedTitle = this.normalizeTitle(title)

    return {
      year,
      title: normalizedTitle,
    }
  }

  /**
   * Normalize title for matching
   */
  normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Determine if folder is likely an artist folder
   * (not an album folder with [YYYY] prefix, not a grouping folder)
   */
  isArtistFolder(folderName: string): boolean {
    // Reject album folder patterns ([YYYY] Title)
    if (/^\[\d{4}\]/.test(folderName)) {
      return false
    }

    // Reject grouping folders (= A =, = B =, etc.)
    if (/^=\s*[A-Z0-9]\s*=$/.test(folderName)) {
      return false
    }

    // Reject single character folders
    if (folderName.length === 1) {
      return false
    }

    return true
  }

  /**
   * Detect artist folder by name (with normalization)
   * Supports:
   * - Exact match
   * - "The" article movement ("The Beatles" → "Beatles, The")
   * - Grouped directories (= A =, = B =)
   * - Case-insensitive matching
   */
  async detectArtistFolder(artistName: string): Promise<string | null> {
    const entries = await this.scan()

    // Generate variations
    const variations = this.generateArtistNameVariations(artistName)

    for (const entry of entries) {
      const entryName = entry.folder_name.toLowerCase()

      // Check all variations
      for (const variation of variations) {
        if (entryName === variation.toLowerCase()) {
          return entry.folder_path
        }
      }
    }

    return null
  }

  /**
   * Generate artist name variations for matching
   * - Original name
   * - Name with "The" moved ("The Beatles" → "Beatles, The")
   * - Name normalized (special chars replaced)
   */
  private generateArtistNameVariations(artistName: string): string[] {
    const variations = [artistName]

    // Handle "The" article
    if (artistName.startsWith('The ')) {
      const withoutThe = artistName.substring(4)
      variations.push(`${withoutThe}, The`)
    } else if (artistName.endsWith(', The')) {
      const name = artistName.substring(0, artistName.length - 5)
      variations.push(`The ${name}`)
    }

    // Handle special characters (AC/DC → AC-DC)
    const normalized = artistName.replace(/[\/\\]/g, '-')
    if (normalized !== artistName) {
      variations.push(normalized)
    }

    return variations
  }

  /**
   * Scan specific artist folder for album folders
   */
  async scanArtistFolder(artistFolderPath: string): Promise<CreateFilesystemCacheEntry[]> {
    const entries: CreateFilesystemCacheEntry[] = []

    try {
      const dirEntries = await fs.readdir(artistFolderPath, { withFileTypes: true })

      for (const entry of dirEntries) {
        if (!entry.isDirectory()) {
          continue
        }

        const folderPath = path.join(artistFolderPath, entry.name)
        const parsed = this.parseFolderName(entry.name)

        // Only include folders with year prefix (album folders)
        if (parsed.year !== null) {
          entries.push({
            folder_path: folderPath,
            folder_name: entry.name,
            parent_path: artistFolderPath,
            is_artist_folder: false,
            parsed_year: parsed.year,
            parsed_title: parsed.title,
          })
        }
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.warn(`Artist folder not found: ${artistFolderPath}`)
        return []
      }
      throw error
    }

    return entries
  }

  /**
   * Validate path is within library root (security)
   */
  validatePath(userPath: string): string | null {
    return safeResolvePath(this.libraryRoot, userPath)
  }
}
