/**
 * Album Tracker Backend Server
 *
 * Express.js application with:
 * - CORS middleware
 * - JSON body parsing
 * - Global error handling
 * - Database initialization
 */

import express from 'express'
import cors from 'cors'
import { getDatabase } from './db/connection.js'
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler.js'
import artistsRouter from './api/routes/artists.js'
import settingsRouter from './api/routes/settings.js'
import filesystemRouter from './api/routes/filesystem.js'
import albumsRouter from './api/routes/albums.js'

const app = express()
const PORT = process.env.PORT || 3000

// ============================================================================
// Middleware
// ============================================================================

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
)

// JSON body parser
app.use(express.json())

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// ============================================================================
// Database Initialization
// ============================================================================

// Initialize database connection on startup
try {
  const db = getDatabase()
  console.log('[Server] Database initialized successfully')

  // Verify Settings table is initialized
  const settings = db.prepare('SELECT * FROM Settings WHERE id = 1').get()
  if (settings) {
    console.log('[Server] Settings loaded successfully')
  }
} catch (error) {
  console.error('[Server] Database initialization failed:', error)
  process.exit(1)
}

// ============================================================================
// Routes
// ============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// API version endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Album Tracker API',
    version: '1.0.0',
    endpoints: {
      artists: '/api/artists',
      settings: '/api/settings',
      filesystem: '/api/filesystem',
      albums: '/api/albums',
    },
  })
})

// Mount route handlers
app.use('/api/artists', artistsRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/filesystem', filesystemRouter)
app.use('/api/albums', albumsRouter)

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler for undefined routes
app.use(notFoundHandler)

// Global error handler (must be last)
app.use(errorHandler)

// ============================================================================
// Server Startup
// ============================================================================

app.listen(PORT, () => {
  console.log(`[Server] Album Tracker API running on port ${PORT}`)
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`[Server] CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n[Server] Shutting down gracefully...')
  process.exit(0)
})

export { app }
export default app
