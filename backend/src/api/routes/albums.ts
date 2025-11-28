/**
 * Albums API Routes
 *
 * Endpoints for album management and manual overrides
 */

import { Router } from 'express'
import { AlbumRepository } from '../../repositories/AlbumRepository.js'
import { SettingsRepository } from '../../repositories/SettingsRepository.js'
import { asyncHandler, createApiError } from '../middleware/errorHandler.js'
import { validateParams, validateBody, ValidationPatterns } from '../middleware/validation.js'
import { safeResolvePath } from '../../utils/pathValidation.js'

const router = Router()

// ============================================================================
// PATCH /api/albums/:albumId - Update album (manual overrides)
// ============================================================================

router.patch(
  '/:albumId',
  validateParams({
    albumId: {
      type: 'string',
      pattern: ValidationPatterns.INTEGER,
      validate: value => {
        const id = parseInt(value, 10)
        if (isNaN(id) || id <= 0) {
          return { valid: false, error: 'Album ID must be a positive integer' }
        }
        return { valid: true }
      },
    },
  }),
  validateBody({
    matched_folder_path: {
      type: 'string',
      required: false,
    },
    ownership_status: {
      type: 'string',
      required: false,
      validate: value => {
        if (!['Owned', 'Missing', 'Ambiguous'].includes(value)) {
          return {
            valid: false,
            error: 'ownership_status must be one of: Owned, Missing, Ambiguous',
          }
        }
        return { valid: true }
      },
    },
    clear_override: {
      type: 'boolean',
      required: false,
    },
  }),
  asyncHandler(async (req, res) => {
    const albumId = parseInt(req.params.albumId, 10)

    // Check if album exists
    const album = AlbumRepository.findById(albumId)
    if (!album) {
      throw createApiError('Album not found', 404, 'ALBUM_NOT_FOUND')
    }

    // Handle clear_override request
    if (req.body.clear_override === true) {
      // Clear manual override - reset to automatic matching state
      const updatedAlbum = AlbumRepository.updateOwnership(albumId, {
        is_manual_override: false,
      })

      return res.json(updatedAlbum)
    }

    // Handle manual folder path linking
    if (req.body.matched_folder_path !== undefined) {
      const folderPath = req.body.matched_folder_path

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

        // Update album with manual override
        const updatedAlbum = AlbumRepository.updateOwnership(albumId, {
          matched_folder_path: safePath,
          ownership_status: 'Owned',
          is_manual_override: true,
          match_confidence: null, // Clear automatic match confidence
        })

        return res.json(updatedAlbum)
      } else {
        // Clear folder path (set to Missing)
        const updatedAlbum = AlbumRepository.updateOwnership(albumId, {
          matched_folder_path: null,
          ownership_status: 'Missing',
          is_manual_override: true,
          match_confidence: null,
        })

        return res.json(updatedAlbum)
      }
    }

    // Handle ownership status toggle
    if (req.body.ownership_status !== undefined) {
      const newStatus = req.body.ownership_status as 'Owned' | 'Missing' | 'Ambiguous'

      // Toggling ownership status requires clearing or setting matched_folder_path
      let updates: {
        ownership_status: 'Owned' | 'Missing' | 'Ambiguous'
        matched_folder_path?: string | null
        is_manual_override: boolean
        match_confidence: null
      }

      if (newStatus === 'Owned') {
        // If toggling to Owned, must provide matched_folder_path
        if (!album.matched_folder_path) {
          throw createApiError(
            'Cannot set ownership to Owned without a matched folder path',
            400,
            'MISSING_FOLDER_PATH'
          )
        }

        updates = {
          ownership_status: 'Owned',
          is_manual_override: true,
          match_confidence: null,
        }
      } else {
        // If toggling to Missing/Ambiguous, keep existing path but change status
        updates = {
          ownership_status: newStatus,
          is_manual_override: true,
          match_confidence: null,
        }
      }

      const updatedAlbum = AlbumRepository.updateOwnership(albumId, updates)

      return res.json(updatedAlbum)
    }

    // If no recognized update field was provided
    throw createApiError('No valid update fields provided', 400, 'INVALID_REQUEST')
  })
)

export default router
