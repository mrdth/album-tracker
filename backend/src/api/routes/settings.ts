/**
 * Settings API Routes
 *
 * Endpoints for managing application configuration.
 */

import { Router, Request, Response } from 'express'
import { SettingsRepository } from '../../repositories/SettingsRepository'
import searchProvidersRouter from './searchProviders.js'
import * as fs from 'fs/promises'
import * as path from 'path'

const router = Router()

// Mount search providers subrouter
router.use('/search-providers', searchProvidersRouter)

/**
 * GET /api/settings
 * Get current settings
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = SettingsRepository.get()

    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' })
    }

    res.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PATCH /api/settings
 * Update settings
 */
router.patch('/', async (req: Request, res: Response) => {
  try {
    const updates = req.body

    // Validate library_root_path if provided
    if (updates.library_root_path !== undefined) {
      const validationError = await validateLibraryPath(updates.library_root_path)
      if (validationError) {
        return res.status(validationError.status).json({ error: validationError.message })
      }
    }

    // Validate similarity_threshold if provided
    if (updates.similarity_threshold !== undefined) {
      if (typeof updates.similarity_threshold !== 'number') {
        return res.status(400).json({ error: 'Similarity threshold must be a number' })
      }
      if (updates.similarity_threshold < 0 || updates.similarity_threshold > 1) {
        return res.status(400).json({ error: 'Similarity threshold must be between 0 and 1' })
      }
    }

    // Validate api_rate_limit_ms if provided
    if (updates.api_rate_limit_ms !== undefined) {
      if (typeof updates.api_rate_limit_ms !== 'number') {
        return res.status(400).json({ error: 'API rate limit must be a number' })
      }
      if (updates.api_rate_limit_ms < 500) {
        return res.status(400).json({ error: 'API rate limit must be at least 500ms' })
      }
    }

    // Validate max_api_retries if provided
    if (updates.max_api_retries !== undefined) {
      if (typeof updates.max_api_retries !== 'number') {
        return res.status(400).json({ error: 'Max API retries must be a number' })
      }
      if (updates.max_api_retries < 1) {
        return res.status(400).json({ error: 'Max API retries must be at least 1' })
      }
    }

    // Filter to only allowed fields
    const allowedFields = [
      'library_root_path',
      'similarity_threshold',
      'api_rate_limit_ms',
      'max_api_retries',
    ]

    const filteredUpdates: any = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    const updatedSettings = SettingsRepository.update(filteredUpdates)

    res.json(updatedSettings)
  } catch (error) {
    console.error('Error updating settings:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Validate library path
 */
async function validateLibraryPath(
  libraryPath: string
): Promise<{ status: number; message: string } | null> {
  // Must be a string
  if (typeof libraryPath !== 'string' || libraryPath.trim() === '') {
    return { status: 400, message: 'Library path must be a non-empty string' }
  }

  // Must be absolute path
  if (!path.isAbsolute(libraryPath)) {
    return { status: 400, message: 'Library path must be an absolute path' }
  }

  // Check for path traversal (defense in depth)
  const normalized = path.normalize(libraryPath)
  if (normalized !== libraryPath && normalized.includes('..')) {
    return { status: 400, message: 'Invalid path: path traversal detected' }
  }

  // Verify path exists
  try {
    const stats = await fs.stat(libraryPath)

    if (!stats.isDirectory()) {
      return { status: 400, message: 'Library path must be a directory' }
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { status: 404, message: 'Library path does not exist' }
    }
    if (error.code === 'EACCES') {
      return { status: 403, message: 'Permission denied: cannot access library path' }
    }
    throw error
  }

  // Verify read permissions
  try {
    await fs.access(libraryPath, fs.constants.R_OK)
  } catch (error) {
    return { status: 403, message: 'Permission denied: cannot read library path' }
  }

  return null // No error
}

export default router
