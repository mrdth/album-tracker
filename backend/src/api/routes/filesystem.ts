/**
 * Filesystem API Routes
 *
 * Endpoints for filesystem scanning and directory browsing.
 */

import { Router, Request, Response } from 'express'
import { FilesystemScanner } from '../../services/FilesystemScanner.js'
import { AlbumMatcher } from '../../services/AlbumMatcher.js'
import { FilesystemCacheRepository } from '../../repositories/FilesystemCacheRepository.js'
import { ArtistRepository } from '../../repositories/ArtistRepository.js'
import { AlbumRepository } from '../../repositories/AlbumRepository.js'
import { SettingsRepository } from '../../repositories/SettingsRepository.js'
import { safeResolvePath } from '../../utils/pathValidation.js'
import * as fs from 'fs/promises'
import * as path from 'path'

const router = Router()
const cacheRepo = new FilesystemCacheRepository()

/**
 * POST /api/filesystem/scan
 * Trigger filesystem scan for an artist
 */
router.post('/scan', async (req: Request, res: Response) => {
  try {
    const { artist_id } = req.body

    // Validate artist_id
    if (!artist_id || typeof artist_id !== 'number') {
      return res.status(400).json({ error: 'artist_id is required and must be a number' })
    }

    // Verify artist exists
    const artist = ArtistRepository.findById(artist_id)
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' })
    }

    // Get settings
    const settings = SettingsRepository.get()
    if (!settings || !settings.library_root_path || settings.library_root_path.trim() === '') {
      return res.status(400).json({ error: 'Library path not configured in settings' })
    }

    // Initialize scanner and matcher
    const scanner = new FilesystemScanner(settings.library_root_path)
    const matcher = new AlbumMatcher(settings.similarity_threshold)

    // Determine artist folder path
    let artistFolderPath: string | null = null

    if (artist.linked_folder_path) {
      // Use linked folder if set
      artistFolderPath = artist.linked_folder_path
    } else {
      // Auto-detect artist folder
      artistFolderPath = await scanner.detectArtistFolder(artist.name)
    }

    if (!artistFolderPath) {
      // No artist folder found - mark all albums as Missing
      const albums = AlbumRepository.findByArtistId(artist_id)

      for (const album of albums) {
        // Only update automatic matches
        if (!album.is_manual_override) {
          AlbumRepository.updateOwnership(album.id, {
            ownership_status: 'Missing',
            matched_folder_path: null,
            match_confidence: 0,
          })
        }
      }

      return res.json({
        artist_id,
        scanned_folders: 0,
        matched_albums: 0,
        scan_completed_at: new Date().toISOString(),
      })
    }

    // Clear old cache for this artist folder
    cacheRepo.clearByPattern(`${artistFolderPath}%`)

    // Scan artist folder
    const folderEntries = await scanner.scanArtistFolder(artistFolderPath)

    // Populate cache
    if (folderEntries.length > 0) {
      cacheRepo.bulkInsert(folderEntries)
    }

    // Get albums for this artist
    const albums = AlbumRepository.findByArtistId(artist_id)

    // Match albums against folders
    const matchResults = matcher.matchAlbums(
      albums.map((a: any) => ({
        mbid: a.mbid,
        title: a.title,
        release_year: a.release_year,
      })),
      folderEntries as any
    )

    // Update album ownership status
    let matchedCount = 0

    for (const album of albums) {
      // Skip manual overrides
      if (album.is_manual_override) {
        continue
      }

      const match = matchResults.get(album.mbid)
      if (match) {
        // Match found - update to Owned or Missing based on match
        AlbumRepository.updateOwnership(album.id, {
          ownership_status: match.status,
          matched_folder_path: match.folder_path || null,
          match_confidence: match.confidence,
        })

        if (match.status === 'Owned') {
          matchedCount++
        }
      } else {
        // No match found - mark as Missing (folder may have been removed)
        AlbumRepository.updateOwnership(album.id, {
          ownership_status: 'Missing',
          matched_folder_path: null,
          match_confidence: 0,
        })
      }
    }

    // Update last scan timestamp
    const scanTimestamp = new Date().toISOString()
    SettingsRepository.updateLastScanAt(scanTimestamp)

    return res.json({
      artist_id,
      scanned_folders: folderEntries.length,
      matched_albums: matchedCount,
      scan_completed_at: scanTimestamp,
    })
  } catch (error) {
    console.error('Error during filesystem scan:', error)
    return res.status(500).json({ error: 'Internal server error during scan' })
  }
})

/**
 * GET /api/filesystem/browse
 * Browse directory tree (server-side)
 */
router.get('/browse', async (req: Request, res: Response) => {
  try {
    const { path: relativePath = '' } = req.query

    if (typeof relativePath !== 'string') {
      return res.status(400).json({ error: 'Path must be a string' })
    }

    // Get settings
    const settings = SettingsRepository.get()
    if (!settings || !settings.library_root_path) {
      return res.status(400).json({ error: 'Library path not configured' })
    }

    // Validate and resolve path
    const safePath = safeResolvePath(settings.library_root_path, relativePath)

    if (!safePath) {
      return res
        .status(403)
        .json({ error: 'Invalid path: access outside library root is forbidden' })
    }

    // Verify path exists and is directory
    try {
      const stats = await fs.stat(safePath)

      if (!stats.isDirectory()) {
        return res.status(400).json({ error: 'Path is not a directory' })
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'Directory not found' })
      }
      if (error.code === 'EACCES') {
        return res.status(403).json({ error: 'Permission denied' })
      }
      throw error
    }

    // Read directory contents
    const entries = await fs.readdir(safePath, { withFileTypes: true })

    // Filter to directories only
    const directories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: entry.name,
        path: path.relative(settings.library_root_path, path.join(safePath, entry.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Calculate parent path
    let parentPath: string | null = null
    if (safePath !== settings.library_root_path) {
      const parent = path.dirname(safePath)
      parentPath = path.relative(settings.library_root_path, parent)
    }

    return res.json({
      current_path: path.relative(settings.library_root_path, safePath),
      parent_path: parentPath,
      directories,
    })
  } catch (error) {
    console.error('Error browsing directory:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
