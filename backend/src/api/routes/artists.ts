/**
 * Artists API Routes
 *
 * Endpoints for artist search, import, and management
 */

import { Router } from 'express'
import { ArtistRepository } from '../../repositories/ArtistRepository.js'
import { AlbumRepository } from '../../repositories/AlbumRepository.js'
import { SettingsRepository } from '../../repositories/SettingsRepository.js'
import { musicBrainzService } from '../../services/MusicBrainzService.js'
import { ArtistRefreshService } from '../../services/ArtistRefreshService.js'
import { AlbumModel } from '../../models/Album.js'
import { asyncHandler, createApiError } from '../middleware/errorHandler.js'
import {
  validateQuery,
  validateBody,
  validateParams,
  ValidationPatterns,
} from '../middleware/validation.js'
import { safeResolvePath } from '../../utils/pathValidation.js'

const router = Router()
const refreshService = new ArtistRefreshService()

// ============================================================================
// GET /api/artists/search - Search for artists
// ============================================================================

router.get(
  '/search',
  validateQuery({
    q: {
      type: 'string',
      required: true,
      min: 1,
    },
  }),
  asyncHandler(async (req, res) => {
    const searchTerm = req.query.q as string

    // Call MusicBrainz service
    const results = await musicBrainzService.searchArtists(searchTerm)

    // Map to API response format
    const response = results.map(artist => ({
      mbid: artist.mbid,
      name: artist.name,
      sort_name: artist.sort_name || null,
      disambiguation: artist.disambiguation || null,
      type: null, // Not provided by current client
      country: null, // Not provided by current client
      score: artist.score,
    }))

    res.json(response)
  })
)

// ============================================================================
// POST /api/artists - Import artist and discography
// ============================================================================

router.post(
  '/',
  validateBody({
    mbid: {
      type: 'string',
      required: true,
      pattern: ValidationPatterns.MBID,
    },
    name: {
      type: 'string',
      required: true,
      min: 1,
    },
    sort_name: {
      type: 'string',
      required: false,
    },
    disambiguation: {
      type: 'string',
      required: false,
    },
  }),
  asyncHandler(async (req, res) => {
    const { mbid, name, sort_name, disambiguation } = req.body

    // Check if artist already exists
    if (ArtistRepository.exists(mbid)) {
      throw createApiError('Artist already exists in collection', 409, 'ARTIST_EXISTS')
    }

    // Fetch artist releases from MusicBrainz
    const albums = await musicBrainzService.fetchReleaseGroups(mbid)

    if (albums.length === 0) {
      throw createApiError('No albums found for this artist', 404, 'NO_ALBUMS')
    }

    // Create artist with provided details
    const artist = ArtistRepository.create({
      mbid,
      name,
      sort_name: sort_name || null,
      disambiguation: disambiguation || null,
    })

    // Create albums
    const albumsToCreate = albums.map(album => ({
      artist_id: artist.id,
      mbid: album.mbid,
      title: album.title,
      release_date: album.release_date || null,
      release_year: AlbumModel.extractYear(album.release_date || null),
      disambiguation: album.disambiguation || null,
    }))

    const createdAlbums = AlbumRepository.bulkCreate(albumsToCreate)

    // Return response
    res.status(201).json({
      artist,
      albums_imported: createdAlbums.length,
    })
  })
)

// ============================================================================
// GET /api/artists - List all artists with stats
// ============================================================================

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const artists = ArtistRepository.list()
    res.json(artists)
  })
)

// ============================================================================
// GET /api/artists/:artistId - Get artist detail with albums
// ============================================================================

router.get(
  '/:artistId',
  validateParams({
    artistId: {
      type: 'string',
      pattern: ValidationPatterns.INTEGER,
      validate: value => {
        const id = parseInt(value, 10)
        if (isNaN(id) || id <= 0) {
          return { valid: false, error: 'Artist ID must be a positive integer' }
        }
        return { valid: true }
      },
    },
  }),
  asyncHandler(async (req, res) => {
    const artistId = parseInt(req.params.artistId, 10)

    const artist = ArtistRepository.findById(artistId)

    if (!artist) {
      throw createApiError('Artist not found', 404, 'ARTIST_NOT_FOUND')
    }

    const albums = AlbumRepository.findByArtistId(artistId)

    res.json({
      ...artist,
      albums,
    })
  })
)

// ============================================================================
// PATCH /api/artists/:artistId - Update artist
// ============================================================================

router.patch(
  '/:artistId',
  validateParams({
    artistId: {
      type: 'string',
      pattern: ValidationPatterns.INTEGER,
    },
  }),
  validateBody({
    linked_folder_path: {
      type: 'string',
      required: false,
    },
  }),
  asyncHandler(async (req, res) => {
    const artistId = parseInt(req.params.artistId, 10)

    const artist = ArtistRepository.findById(artistId)

    if (!artist) {
      throw createApiError('Artist not found', 404, 'ARTIST_NOT_FOUND')
    }

    const updates: any = {}

    if (req.body.linked_folder_path !== undefined) {
      const folderPath = req.body.linked_folder_path

      // Validate path if provided (null is allowed to clear the path)
      if (folderPath !== null) {
        // Get library root from settings
        const settings = SettingsRepository.get()
        const libraryRoot = settings.library_root_path

        if (!libraryRoot) {
          throw createApiError('Library root path not configured', 400, 'LIBRARY_NOT_CONFIGURED')
        }

        // Validate path is within library root (path traversal prevention)
        const safePath = safeResolvePath(libraryRoot, folderPath)

        if (!safePath) {
          throw createApiError('Invalid path: must be within library root', 400, 'INVALID_PATH')
        }

        // Store the validated absolute path
        updates.linked_folder_path = safePath
      } else {
        // Clear the linked folder path
        updates.linked_folder_path = null
      }
    }

    // Check if there are any valid updates
    if (Object.keys(updates).length === 0) {
      throw createApiError('No valid fields provided for update', 400, 'NO_VALID_FIELDS')
    }

    const updatedArtist = ArtistRepository.update(artistId, updates)

    res.json(updatedArtist)
  })
)

// ============================================================================
// POST /api/artists/:artistId/refresh - Refresh artist's album collection
// ============================================================================

router.post(
  '/:artistId/refresh',
  validateParams({
    artistId: {
      type: 'string',
      pattern: ValidationPatterns.INTEGER,
      validate: value => {
        const id = parseInt(value, 10)
        if (isNaN(id) || id <= 0) {
          return { valid: false, error: 'Artist ID must be a positive integer' }
        }
        return { valid: true }
      },
    },
  }),
  asyncHandler(async (req, res) => {
    const artistId = parseInt(req.params.artistId, 10)

    try {
      const result = await refreshService.refreshArtist(artistId)
      res.json(result)
    } catch (error: any) {
      const message = error.message || 'Unknown error'

      // Handle specific error cases
      if (message === 'Artist not found') {
        throw createApiError('Artist not found', 404, 'ARTIST_NOT_FOUND')
      }

      if (message === 'Refresh already in progress for this artist') {
        throw createApiError(
          'Refresh already in progress for this artist',
          409,
          'REFRESH_IN_PROGRESS'
        )
      }

      // MusicBrainz API errors
      if (message.includes('MusicBrainz') || message.includes('Network error')) {
        throw createApiError(
          'Unable to connect to MusicBrainz service',
          503,
          'EXTERNAL_API_ERROR',
          { detail: message }
        )
      }

      // Re-throw unknown errors
      throw error
    }
  })
)

// ============================================================================
// DELETE /api/artists/:artistId - Delete artist
// ============================================================================

router.delete(
  '/:artistId',
  validateParams({
    artistId: {
      type: 'string',
      pattern: ValidationPatterns.INTEGER,
    },
  }),
  asyncHandler(async (req, res) => {
    const artistId = parseInt(req.params.artistId, 10)

    const artist = ArtistRepository.findById(artistId)

    if (!artist) {
      throw createApiError('Artist not found', 404, 'ARTIST_NOT_FOUND')
    }

    ArtistRepository.delete(artistId)

    res.status(204).send()
  })
)

export default router
