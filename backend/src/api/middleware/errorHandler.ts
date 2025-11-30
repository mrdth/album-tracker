/**
 * Global Error Handling Middleware
 *
 * Centralized error handling for Express with:
 * - Consistent error response format
 * - Error logging
 * - Safe error messages (no internal details exposed)
 */

import type { Request, Response, NextFunction } from 'express'

export interface ApiError extends Error {
  status?: number
  code?: string
  details?: string
}

/**
 * Global error handler middleware
 * Must be registered AFTER all routes
 */
export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error for debugging
  console.error('[API Error]', {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    status: err.status || 500,
  })

  // Determine status code
  const status = err.status || 500

  // Determine if we should expose error details
  const isProduction = process.env.NODE_ENV === 'production'
  const shouldExposeDetails = !isProduction || status < 500

  // Build error response
  const errorResponse: any = {
    error: shouldExposeDetails ? err.message : 'Internal server error',
    status: status,
  }

  // Add error code if available
  if (err.code) {
    errorResponse.code = err.code
  }

  // Add details if available and safe to expose
  if (shouldExposeDetails && err.details) {
    errorResponse.details = err.details
  }

  // Add stack trace in development
  if (!isProduction && err.stack) {
    errorResponse.stack = err.stack
  }

  res.status(status).json(errorResponse)
}

/**
 * Create an API error with status code
 */
export function createApiError(
  message: string,
  status: number = 500,
  code?: string,
  details?: string
): ApiError {
  const error: ApiError = new Error(message)
  error.status = status
  error.code = code
  error.details = details
  return error
}

/**
 * Not Found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = createApiError(`Route not found: ${req.method} ${req.path}`, 404, 'ROUTE_NOT_FOUND')
  next(error)
}

/**
 * Async route wrapper to catch promise rejections
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
