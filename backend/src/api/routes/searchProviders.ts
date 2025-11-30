/**
 * Search Providers API Routes
 *
 * Endpoints for managing search provider configurations.
 */

import { Router, Request, Response } from 'express'
import { SearchProviderService } from '../../services/SearchProviderService.js'

const router = Router()

/**
 * GET /api/settings/search-providers
 * List all search providers
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const providers = SearchProviderService.list()
    res.json({ providers })
  } catch (error) {
    console.error('Error fetching search providers:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/settings/search-providers
 * Create a new search provider
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, urlTemplate } = req.body

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Provider name is required and must be a string' })
    }

    if (!urlTemplate || typeof urlTemplate !== 'string') {
      return res
        .status(400)
        .json({ error: 'URL template is required and must be a string' })
    }

    const provider = SearchProviderService.create(name, urlTemplate)
    res.status(201).json(provider)
  } catch (error) {
    if (error instanceof Error) {
      // Validation errors from the service/repository layer
      return res.status(400).json({ error: error.message })
    }

    console.error('Error creating search provider:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /api/settings/search-providers/:id
 * Update an existing search provider
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10)

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid provider ID' })
    }

    const { name, urlTemplate } = req.body

    // Validate that at least one field is provided
    if (name === undefined && urlTemplate === undefined) {
      return res
        .status(400)
        .json({ error: 'At least one field (name or urlTemplate) must be provided' })
    }

    // Validate field types if provided
    if (name !== undefined && typeof name !== 'string') {
      return res.status(400).json({ error: 'Provider name must be a string' })
    }

    if (urlTemplate !== undefined && typeof urlTemplate !== 'string') {
      return res.status(400).json({ error: 'URL template must be a string' })
    }

    const updates: { name?: string; urlTemplate?: string } = {}
    if (name !== undefined) updates.name = name
    if (urlTemplate !== undefined) updates.urlTemplate = urlTemplate

    const provider = SearchProviderService.update(id, updates)

    if (!provider) {
      return res.status(404).json({ error: 'Search provider not found' })
    }

    res.json(provider)
  } catch (error) {
    if (error instanceof Error) {
      // Validation errors from the service/repository layer
      return res.status(400).json({ error: error.message })
    }

    console.error('Error updating search provider:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /api/settings/search-providers/:id
 * Delete a search provider
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10)

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid provider ID' })
    }

    const deleted = SearchProviderService.delete(id)

    if (!deleted) {
      return res.status(404).json({ error: 'Search provider not found' })
    }

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting search provider:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
