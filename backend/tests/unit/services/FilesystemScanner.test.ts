import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FilesystemScanner } from '../../../src/services/FilesystemScanner'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('FilesystemScanner', () => {
  let testLibraryPath: string
  let scanner: FilesystemScanner

  beforeEach(async () => {
    // Create temporary test library
    testLibraryPath = path.join(os.tmpdir(), `test-library-${Date.now()}`)
    await fs.mkdir(testLibraryPath, { recursive: true })
    scanner = new FilesystemScanner(testLibraryPath)
  })

  afterEach(async () => {
    // Cleanup test library
    await fs.rm(testLibraryPath, { recursive: true, force: true })
  })

  describe('scan()', () => {
    it('should scan library and return folder entries', async () => {
      // Create test folder structure
      await fs.mkdir(path.join(testLibraryPath, 'Artist Name'), { recursive: true })
      await fs.mkdir(path.join(testLibraryPath, 'Artist Name', '[2020] Album Title'), {
        recursive: true,
      })

      const result = await scanner.scan()

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      const albumFolder = result.find(entry => entry.folder_name === '[2020] Album Title')
      expect(albumFolder).toBeDefined()
      expect(albumFolder?.parsed_year).toBe(2020)
      expect(albumFolder?.parsed_title).toBe('album title')
    })

    it('should handle empty library', async () => {
      const result = await scanner.scan()

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })

    it('should recursively scan nested directories', async () => {
      // Create nested structure
      await fs.mkdir(path.join(testLibraryPath, '= R ='), { recursive: true })
      await fs.mkdir(path.join(testLibraryPath, '= R =', 'Radiohead'), { recursive: true })
      await fs.mkdir(path.join(testLibraryPath, '= R =', 'Radiohead', '[1997] OK Computer'), {
        recursive: true,
      })

      const result = await scanner.scan()

      expect(result.length).toBeGreaterThan(0)
      const albumFolder = result.find(entry => entry.folder_name === '[1997] OK Computer')
      expect(albumFolder).toBeDefined()
      expect(albumFolder?.parsed_year).toBe(1997)
      expect(albumFolder?.parsed_title).toBe('ok computer')
    })

    it('should ignore files, only process directories', async () => {
      await fs.mkdir(path.join(testLibraryPath, 'Artist'), { recursive: true })
      await fs.writeFile(path.join(testLibraryPath, 'Artist', 'file.txt'), 'test content')
      await fs.mkdir(path.join(testLibraryPath, 'Artist', '[2020] Album'), { recursive: true })

      const result = await scanner.scan()

      // Should only find directories, not the file
      expect(result.every(entry => entry.folder_name !== 'file.txt')).toBe(true)
      expect(result.some(entry => entry.folder_name === '[2020] Album')).toBe(true)
    })

    it('should handle permission errors gracefully', async () => {
      // This test is platform-dependent and may be skipped on Windows
      if (process.platform === 'win32') {
        return
      }

      await fs.mkdir(path.join(testLibraryPath, 'restricted'), { recursive: true })
      await fs.chmod(path.join(testLibraryPath, 'restricted'), 0o000)

      const result = await scanner.scan()

      // Should not throw error, just skip restricted directory
      expect(result).toBeDefined()

      // Restore permissions for cleanup
      await fs.chmod(path.join(testLibraryPath, 'restricted'), 0o755)
    })
  })

  describe('parseFolderName()', () => {
    it('should parse [YYYY] Title format correctly', () => {
      const result = scanner.parseFolderName('[2020] Abbey Road')

      expect(result.year).toBe(2020)
      expect(result.title).toBe('abbey road')
    })

    it('should handle titles with punctuation', () => {
      const result = scanner.parseFolderName('[1997] OK Computer')

      expect(result.year).toBe(1997)
      expect(result.title).toBe('ok computer')
    })

    it('should normalize title (lowercase, no punctuation)', () => {
      const result = scanner.parseFolderName('[2003] Hail to the Thief!')

      expect(result.year).toBe(2003)
      expect(result.title).toBe('hail to the thief')
    })

    it('should handle folders without year prefix', () => {
      const result = scanner.parseFolderName('Random Folder')

      expect(result.year).toBeNull()
      expect(result.title).toBe('random folder')
    })

    it('should handle year-only folders', () => {
      const result = scanner.parseFolderName('[2020]')

      expect(result.year).toBe(2020)
      expect(result.title).toBe('')
    })

    it('should handle invalid year format', () => {
      const result = scanner.parseFolderName('[ABCD] Title')

      expect(result.year).toBeNull()
      expect(result.title).toBe('abcd title')
    })

    it('should trim whitespace from parsed title', () => {
      const result = scanner.parseFolderName('[2020]   Extra   Spaces   ')

      expect(result.year).toBe(2020)
      expect(result.title).toBe('extra spaces')
    })

    it('should handle special characters in title', () => {
      const result = scanner.parseFolderName('[2010] Ænima (Remastered)')

      expect(result.year).toBe(2010)
      expect(result.title).toBe('nima remastered')
    })
  })

  describe('isArtistFolder()', () => {
    it('should identify artist folders by naming convention', () => {
      expect(scanner.isArtistFolder('Radiohead')).toBe(true)
      expect(scanner.isArtistFolder('The Beatles')).toBe(true)
      expect(scanner.isArtistFolder('Pink Floyd')).toBe(true)
    })

    it('should reject album folder patterns', () => {
      expect(scanner.isArtistFolder('[2020] Album Title')).toBe(false)
      expect(scanner.isArtistFolder('[1997] OK Computer')).toBe(false)
    })

    it('should identify grouped directory markers', () => {
      expect(scanner.isArtistFolder('= A =')).toBe(false) // Grouping folder, not artist
      expect(scanner.isArtistFolder('= B =')).toBe(false)
    })

    it('should handle normalized artist names', () => {
      expect(scanner.isArtistFolder('Beatles, The')).toBe(true)
      expect(scanner.isArtistFolder('National, The')).toBe(true)
    })

    it('should reject single character folders', () => {
      expect(scanner.isArtistFolder('A')).toBe(false)
      expect(scanner.isArtistFolder('Z')).toBe(false)
    })
  })

  describe('detectArtistFolder()', () => {
    it('should find artist folder by exact name match', async () => {
      await fs.mkdir(path.join(testLibraryPath, 'Radiohead'), { recursive: true })

      const result = await scanner.detectArtistFolder('Radiohead')

      expect(result).toBe(path.join(testLibraryPath, 'Radiohead'))
    })

    it('should find artist folder with "The" article moved', async () => {
      await fs.mkdir(path.join(testLibraryPath, 'Beatles, The'), { recursive: true })

      const result = await scanner.detectArtistFolder('The Beatles')

      expect(result).toBe(path.join(testLibraryPath, 'Beatles, The'))
    })

    it('should find artist folder in grouped directories', async () => {
      await fs.mkdir(path.join(testLibraryPath, '= R =', 'Radiohead'), { recursive: true })

      const result = await scanner.detectArtistFolder('Radiohead')

      expect(result).toBe(path.join(testLibraryPath, '= R =', 'Radiohead'))
    })

    it('should handle case-insensitive matching', async () => {
      await fs.mkdir(path.join(testLibraryPath, 'radiohead'), { recursive: true })

      const result = await scanner.detectArtistFolder('Radiohead')

      expect(result).toBe(path.join(testLibraryPath, 'radiohead'))
    })

    it('should return null when artist folder not found', async () => {
      const result = await scanner.detectArtistFolder('Nonexistent Artist')

      expect(result).toBeNull()
    })

    it('should handle special characters in artist names', async () => {
      await fs.mkdir(path.join(testLibraryPath, 'AC-DC'), { recursive: true })

      const result = await scanner.detectArtistFolder('AC/DC')

      expect(result).toBe(path.join(testLibraryPath, 'AC-DC'))
    })
  })

  describe('scanArtistFolder()', () => {
    it('should find album folders within artist directory', async () => {
      const artistPath = path.join(testLibraryPath, 'Radiohead')
      await fs.mkdir(artistPath, { recursive: true })
      await fs.mkdir(path.join(artistPath, '[1997] OK Computer'), { recursive: true })
      await fs.mkdir(path.join(artistPath, '[2000] Kid A'), { recursive: true })

      const result = await scanner.scanArtistFolder(artistPath)

      expect(result.length).toBe(2)
      expect(result[0].parsed_year).toBe(1997)
      expect(result[0].parsed_title).toBe('ok computer')
      expect(result[1].parsed_year).toBe(2000)
      expect(result[1].parsed_title).toBe('kid a')
    })

    it('should ignore non-album folders (no year prefix)', async () => {
      const artistPath = path.join(testLibraryPath, 'Artist')
      await fs.mkdir(artistPath, { recursive: true })
      await fs.mkdir(path.join(artistPath, '[2020] Album'), { recursive: true })
      await fs.mkdir(path.join(artistPath, 'Artwork'), { recursive: true })

      const result = await scanner.scanArtistFolder(artistPath)

      expect(result.length).toBe(1)
      expect(result[0].folder_name).toBe('[2020] Album')
    })

    it('should return empty array for nonexistent path', async () => {
      const result = await scanner.scanArtistFolder('/nonexistent/path')

      expect(result).toBeDefined()
      expect(result.length).toBe(0)
    })
  })
})
