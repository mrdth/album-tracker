/**
 * FilesystemScanner Integration Tests
 *
 * Tests for filesystem scanning with manual override persistence
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { getDatabase } from '../../../src/db/connection'
import { FilesystemScanner } from '../../../src/services/FilesystemScanner'
import { AlbumMatcher } from '../../../src/services/AlbumMatcher'
import { AlbumRepository } from '../../../src/repositories/AlbumRepository'
import * as fs from 'fs/promises'

describe('FilesystemScanner - Manual Override Persistence', () => {
  let testArtistId: number
  let testAlbumId1: number
  let testAlbumId2: number
  const testLibraryPath = '/tmp/test-library-manual-override'

  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(testLibraryPath, { recursive: true })
    await fs.mkdir(`${testLibraryPath}/TestArtist`, { recursive: true })
    await fs.mkdir(`${testLibraryPath}/TestArtist/[2020] Album One`, { recursive: true })
    await fs.mkdir(`${testLibraryPath}/TestArtist/[2021] Album Two`, { recursive: true })
  })

  beforeEach(() => {
    const db = getDatabase()

    // Update settings with test library path
    db.prepare('UPDATE Settings SET library_root_path = ? WHERE id = 1').run(testLibraryPath)

    // Clean up any existing test data
    db.prepare('DELETE FROM Album WHERE artist_id IN (SELECT id FROM Artist WHERE mbid = ?)').run(
      '99999999-1234-5678-90ab-cdef12345000'
    )
    db.prepare('DELETE FROM Artist WHERE mbid = ?').run('99999999-1234-5678-90ab-cdef12345000')
    db.prepare('DELETE FROM FilesystemCache').run()

    // Create test artist
    const result = db
      .prepare(
        `
      INSERT INTO Artist (mbid, name, sort_name)
      VALUES ('99999999-1234-5678-90ab-cdef12345000', 'TestArtist', 'TestArtist')
    `
      )
      .run()

    testArtistId = result.lastInsertRowid as number

    // Create test albums
    const album1 = db
      .prepare(
        `
      INSERT INTO Album (artist_id, mbid, title, release_year, ownership_status)
      VALUES (?, '99999999-1234-5678-90ab-000000000001', 'Album One', 2020, 'Missing')
    `
      )
      .run(testArtistId)

    testAlbumId1 = album1.lastInsertRowid as number

    const album2 = db
      .prepare(
        `
      INSERT INTO Album (artist_id, mbid, title, release_year, ownership_status)
      VALUES (?, '99999999-1234-5678-90ab-000000000002', 'Album Two', 2021, 'Missing')
    `
      )
      .run(testArtistId)

    testAlbumId2 = album2.lastInsertRowid as number
  })

  afterEach(() => {
    const db = getDatabase()
    db.prepare('DELETE FROM Album WHERE artist_id = ?').run(testArtistId)
    db.prepare('DELETE FROM Artist WHERE id = ?').run(testArtistId)
    db.prepare('DELETE FROM FilesystemCache').run()
  })

  afterAll(async () => {
    const db = getDatabase()
    db.close()

    // Cleanup test directories
    await fs.rm(testLibraryPath, { recursive: true, force: true })
  })

  it('should not override manually set album during rescan', async () => {
    const db = getDatabase()
    const scanner = new FilesystemScanner(testLibraryPath)
    const matcher = new AlbumMatcher()

    // First scan - should match both albums automatically
    const folders = await scanner.scanArtistFolder(`${testLibraryPath}/TestArtist`)
    expect(folders.length).toBeGreaterThan(0)

    // Get albums from database
    const albums = AlbumRepository.findByArtistId(testArtistId)

    // Run matcher
    const matchResults = matcher.matchAlbums(albums, folders)

    // Update albums with match results
    for (const album of albums) {
      const match = matchResults.get(album.mbid)
      if (match) {
        AlbumRepository.updateOwnership(album.id, {
          ownership_status: match.status,
          matched_folder_path: match.folder_path || null,
          match_confidence: match.confidence,
        })
      }
    }

    // Verify both albums are now Owned
    let album1 = AlbumRepository.findById(testAlbumId1)
    let album2 = AlbumRepository.findById(testAlbumId2)

    expect(album1?.ownership_status).toBe('Owned')
    expect(album2?.ownership_status).toBe('Owned')

    // Manually override album 1 to Missing with manual flag
    AlbumRepository.updateOwnership(testAlbumId1, {
      ownership_status: 'Missing',
      matched_folder_path: null,
      is_manual_override: true,
    })

    // Verify manual override was set
    album1 = AlbumRepository.findById(testAlbumId1)
    expect(album1?.ownership_status).toBe('Missing')
    expect(album1?.is_manual_override).toBe(true)

    // Rescan the folder
    const foldersRescan = await scanner.scanArtistFolder(`${testLibraryPath}/TestArtist`)

    // Refetch albums to get updated is_manual_override flags
    const updatedAlbums = AlbumRepository.findByArtistId(testArtistId)
    const matchResultsRescan = matcher.matchAlbums(updatedAlbums, foldersRescan)

    // Update albums with rescan results, but skip manual overrides
    for (const album of updatedAlbums) {
      if (album.is_manual_override) {
        continue // Skip manually overridden albums
      }

      const match = matchResultsRescan.get(album.mbid)
      if (match) {
        AlbumRepository.updateOwnership(album.id, {
          ownership_status: match.status,
          matched_folder_path: match.folder_path || null,
          match_confidence: match.confidence,
        })
      }
    }

    // Verify album 1 is still Missing (manual override preserved)
    album1 = AlbumRepository.findById(testAlbumId1)
    expect(album1?.ownership_status).toBe('Missing')
    expect(album1?.is_manual_override).toBe(true)

    // Verify album 2 is still Owned (automatic match still works)
    album2 = AlbumRepository.findById(testAlbumId2)
    expect(album2?.ownership_status).toBe('Owned')
    expect(album2?.is_manual_override).toBe(false)
  })

  it('should preserve manually linked folder path across rescans', async () => {
    const db = getDatabase()

    // Manually link album 1 to a specific folder
    AlbumRepository.updateOwnership(testAlbumId1, {
      ownership_status: 'Owned',
      matched_folder_path: `${testLibraryPath}/TestArtist/[2020] Album One`,
      is_manual_override: true,
    })

    // Verify manual link was set
    let album1 = AlbumRepository.findById(testAlbumId1)
    expect(album1?.matched_folder_path).toBe(`${testLibraryPath}/TestArtist/[2020] Album One`)
    expect(album1?.is_manual_override).toBe(true)

    // Simulate rescan (which would normally update automatic matches)
    const scanner = new FilesystemScanner(testLibraryPath)
    const matcher = new AlbumMatcher()
    const folders = await scanner.scanArtistFolder(`${testLibraryPath}/TestArtist`)
    const albums = AlbumRepository.findByArtistId(testArtistId)
    const matchResults = matcher.matchAlbums(albums, folders)

    // Update only non-manual albums
    for (const album of albums) {
      if (album.is_manual_override) {
        continue
      }

      const match = matchResults.get(album.mbid)
      if (match) {
        AlbumRepository.updateOwnership(album.id, {
          ownership_status: match.status,
          matched_folder_path: match.folder_path || null,
          match_confidence: match.confidence,
        })
      }
    }

    // Verify manual link is still preserved
    album1 = AlbumRepository.findById(testAlbumId1)
    expect(album1?.matched_folder_path).toBe(`${testLibraryPath}/TestArtist/[2020] Album One`)
    expect(album1?.ownership_status).toBe('Owned')
    expect(album1?.is_manual_override).toBe(true)
  })
})
