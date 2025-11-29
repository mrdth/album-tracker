/**
 * Path Traversal Prevention Utility
 *
 * Implements defense-in-depth path validation with 5-layer security:
 * 1. Decode user input (handle URL encoding)
 * 2. Validate input format (reject null bytes, suspicious patterns)
 * 3. Canonicalize paths using path.resolve()
 * 4. Verify resolved path starts with configured library root
 * 5. Check file/directory permissions
 *
 * Based on research from research.md - Path Traversal Prevention section
 */

import { resolve, isAbsolute, sep } from 'path'
import { access, stat, constants } from 'fs/promises'

/**
 * Windows reserved device names that can bypass path validation
 * CVE-2025-27210
 */
const WINDOWS_DEVICE_NAMES = [
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]

/**
 * Check for Windows reserved device names
 */
function containsWindowsDeviceName(pathStr: string): boolean {
  if (process.platform !== 'win32') {
    return false
  }

  const parts = pathStr.split(sep)
  return parts.some(part => {
    const baseName = part.split('.')[0].toUpperCase()
    return WINDOWS_DEVICE_NAMES.includes(baseName)
  })
}

/**
 * Safely resolve a user-provided path within the library root
 *
 * @param libraryRoot - Configured library root directory (absolute path)
 * @param userPath - User-provided relative path or directory name
 * @returns Resolved safe path or null if validation fails
 */
export function safeResolvePath(libraryRoot: string, userPath: string): string | null {
  // Step 1: Validate library root exists and is absolute
  if (!isAbsolute(libraryRoot)) {
    throw new Error('Library root must be an absolute path')
  }

  // Normalize library root by removing trailing slashes
  libraryRoot = libraryRoot.replace(/[\/\\]+$/, '')

  // Step 2: Decode user input to handle URL encoding bypasses
  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(userPath)
  } catch (e) {
    // Invalid encoding
    console.warn('[Security] Invalid URL encoding in path:', userPath)
    return null
  }

  // Step 3: Check for null bytes (security bypass technique)
  if (decodedPath.includes('\0')) {
    console.warn('[Security] Null byte injection attempt:', decodedPath)
    return null
  }

  // Step 4: Check for Windows device names
  if (containsWindowsDeviceName(decodedPath)) {
    console.warn('[Security] Windows device name detected:', decodedPath)
    return null
  }

  // Step 5: Validate input doesn't contain suspicious patterns
  // This is defense-in-depth, not the primary protection
  const suspiciousPatterns = [
    /\.\.[\/\\]/, // Dot-dot-slash sequences
    /^[\/\\]/, // Absolute path indicators
  ]

  if (suspiciousPatterns.some(pattern => pattern.test(decodedPath))) {
    console.warn('[Security] Suspicious path pattern detected:', decodedPath)
    // Don't reject yet - let path.resolve handle it
  }

  // Step 6: Resolve to absolute path
  const resolvedPath = resolve(libraryRoot, decodedPath)

  // Step 7: CRITICAL - Verify path is within library root
  // This is the primary security control
  const rootWithSep = libraryRoot + sep
  if (!resolvedPath.startsWith(rootWithSep) && resolvedPath !== libraryRoot) {
    console.warn('[Security] Path traversal attempt blocked:', {
      userPath,
      resolvedPath,
      libraryRoot,
    })
    return null
  }

  return resolvedPath
}

/**
 * Validate and check if a path exists and is readable
 *
 * @param path - Path to validate
 * @returns Object with validation result and error message if invalid
 */
export async function validatePathExists(path: string): Promise<{
  valid: boolean
  error?: string
  isDirectory?: boolean
}> {
  try {
    await access(path, constants.R_OK)
    const stats = await stat(path)

    return {
      valid: true,
      isDirectory: stats.isDirectory(),
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { valid: false, error: 'Path does not exist' }
    }
    if (error.code === 'EACCES') {
      return { valid: false, error: 'Permission denied: cannot read path' }
    }
    return { valid: false, error: `Failed to access path: ${error.message}` }
  }
}

/**
 * Validate artist folder name with whitelist approach
 *
 * @param folderName - Folder name to validate
 * @returns Object with validation result and error message if invalid
 */
export function validateArtistFolder(folderName: string): {
  valid: boolean
  error?: string
} {
  // Allow only alphanumeric, spaces, hyphens, underscores, and common punctuation
  const allowedChars = /^[a-zA-Z0-9\s\-_.,&'()=]+$/

  if (!allowedChars.test(folderName)) {
    return {
      valid: false,
      error:
        "Folder name contains invalid characters. Allowed: letters, numbers, spaces, -_.,&'()=",
    }
  }

  // Check length constraints
  if (folderName.length > 255) {
    return {
      valid: false,
      error: 'Folder name must be 255 characters or less',
    }
  }

  if (folderName.trim().length === 0) {
    return {
      valid: false,
      error: 'Folder name cannot be empty',
    }
  }

  return { valid: true }
}

/**
 * Combine safe path resolution with existence validation
 *
 * @param libraryRoot - Library root directory
 * @param userPath - User-provided path
 * @param requireDirectory - If true, path must be a directory
 * @returns Validated path or null with error message
 */
export async function validateAndResolvePath(
  libraryRoot: string,
  userPath: string,
  requireDirectory: boolean = false
): Promise<{
  path: string | null
  error?: string
}> {
  // First, resolve path safely
  const safePath = safeResolvePath(libraryRoot, userPath)

  if (!safePath) {
    return {
      path: null,
      error: 'Invalid path: access outside library root is forbidden',
    }
  }

  // Then validate it exists
  const validation = await validatePathExists(safePath)

  if (!validation.valid) {
    return {
      path: null,
      error: validation.error,
    }
  }

  // Check directory requirement
  if (requireDirectory && !validation.isDirectory) {
    return {
      path: null,
      error: 'Path must be a directory',
    }
  }

  return { path: safePath }
}
