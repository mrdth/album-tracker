/**
 * Request Validation Middleware
 *
 * Provides validation utilities for:
 * - Request body validation
 * - Query parameter validation
 * - Path parameter validation
 */

import type { Request, Response, NextFunction } from 'express'
import { createApiError } from './errorHandler.js'

/**
 * Validation schema type
 */
export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
    required?: boolean
    min?: number
    max?: number
    pattern?: RegExp
    enum?: any[]
    validate?: (value: any) => { valid: boolean; error?: string }
  }
}

/**
 * Validate request body against schema
 */
export function validateBody(schema: ValidationSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = []

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field]

      // Check required
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`Field '${field}' is required`)
        continue
      }

      // Skip validation if field is optional and not provided
      if (!rules.required && (value === undefined || value === null)) {
        continue
      }

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value
      if (actualType !== rules.type) {
        errors.push(`Field '${field}' must be of type ${rules.type}, got ${actualType}`)
        continue
      }

      // String validations
      if (rules.type === 'string') {
        if (rules.min !== undefined && value.length < rules.min) {
          errors.push(`Field '${field}' must be at least ${rules.min} characters`)
        }
        if (rules.max !== undefined && value.length > rules.max) {
          errors.push(`Field '${field}' must be at most ${rules.max} characters`)
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`Field '${field}' format is invalid`)
        }
      }

      // Number validations
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Field '${field}' must be at least ${rules.min}`)
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`Field '${field}' must be at most ${rules.max}`)
        }
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`Field '${field}' must be one of: ${rules.enum.join(', ')}`)
      }

      // Custom validation
      if (rules.validate) {
        const result = rules.validate(value)
        if (!result.valid) {
          errors.push(result.error || `Field '${field}' is invalid`)
        }
      }
    }

    if (errors.length > 0) {
      const error = createApiError('Validation failed', 400, 'VALIDATION_ERROR', errors.join('; '))
      next(error)
      return
    }

    next()
  }
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: ValidationSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = []

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.query[field]

      // Check required
      if (rules.required && (value === undefined || value === '')) {
        errors.push(`Query parameter '${field}' is required`)
        continue
      }

      // Skip validation if field is optional and not provided
      if (!rules.required && (value === undefined || value === '')) {
        continue
      }

      // Validate type
      if (rules.type === 'number') {
        const num = Number(value)
        if (isNaN(num)) {
          errors.push(`Query parameter '${field}' must be a number`)
          continue
        }
      } else if (rules.type === 'boolean') {
        if (value !== 'true' && value !== 'false' && value !== '1' && value !== '0') {
          errors.push(`Query parameter '${field}' must be a boolean`)
          continue
        }
      }
    }

    if (errors.length > 0) {
      const error = createApiError('Validation failed', 400, 'VALIDATION_ERROR', errors.join('; '))
      next(error)
      return
    }

    next()
  }
}

/**
 * Validate path parameters (e.g., /artists/:id)
 */
export function validateParams(schema: ValidationSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = []

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.params[field]

      // Path params are always strings and always present if route matches
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`Path parameter '${field}' format is invalid`)
      }

      if (rules.validate) {
        const result = rules.validate(value)
        if (!result.valid) {
          errors.push(result.error || `Path parameter '${field}' is invalid`)
        }
      }
    }

    if (errors.length > 0) {
      const error = createApiError('Validation failed', 400, 'VALIDATION_ERROR', errors.join('; '))
      next(error)
      return
    }

    next()
  }
}

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  MBID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ABSOLUTE_PATH: /^\/[^\0]*$/,
  INTEGER: /^\d+$/,
}
