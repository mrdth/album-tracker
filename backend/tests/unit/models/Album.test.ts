/**
 * Album Model Unit Tests
 *
 * Unit tests for Album model class including is_ignored field
 */

import { describe, it, expect } from 'vitest'
import { AlbumModel } from '../../../src/models/Album.js'
import type { Album } from '../../../shared/types/index.js'

describe('AlbumModel', () => {
  const baseAlbumData: Album = {
    id: 1,
    artist_id: 100,
    mbid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    title: 'Test Album',
    release_year: 2020,
    release_date: '2020-05-15',
    disambiguation: null,
    ownership_status: 'Missing',
    matched_folder_path: null,
    match_confidence: null,
    is_manual_override: false,
    is_ignored: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }

  describe('constructor', () => {
    it('should initialize is_ignored field to false', () => {
      const album = new AlbumModel({
        ...baseAlbumData,
        is_ignored: false
      })

      expect(album.is_ignored).toBe(false)
    })

    it('should initialize is_ignored field to true', () => {
      const album = new AlbumModel({
        ...baseAlbumData,
        is_ignored: true
      })

      expect(album.is_ignored).toBe(true)
    })

    it('should properly assign all fields including is_ignored', () => {
      const album = new AlbumModel(baseAlbumData)

      expect(album.id).toBe(1)
      expect(album.artist_id).toBe(100)
      expect(album.mbid).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
      expect(album.title).toBe('Test Album')
      expect(album.release_year).toBe(2020)
      expect(album.release_date).toBe('2020-05-15')
      expect(album.disambiguation).toBeNull()
      expect(album.ownership_status).toBe('Missing')
      expect(album.matched_folder_path).toBeNull()
      expect(album.match_confidence).toBeNull()
      expect(album.is_manual_override).toBe(false)
      expect(album.is_ignored).toBe(false)
      expect(album.created_at).toBe('2025-01-01T00:00:00Z')
      expect(album.updated_at).toBe('2025-01-01T00:00:00Z')
    })
  })

  describe('is_ignored field', () => {
    it('should handle is_ignored = false for owned albums', () => {
      const album = new AlbumModel({
        ...baseAlbumData,
        ownership_status: 'Owned',
        matched_folder_path: '/music/Artist/Album',
        is_ignored: false
      })

      expect(album.is_ignored).toBe(false)
      expect(album.ownership_status).toBe('Owned')
    })

    it('should handle is_ignored = true for missing albums', () => {
      const album = new AlbumModel({
        ...baseAlbumData,
        ownership_status: 'Missing',
        is_ignored: true
      })

      expect(album.is_ignored).toBe(true)
      expect(album.ownership_status).toBe('Missing')
    })

    it('should handle is_ignored = true for ambiguous albums', () => {
      const album = new AlbumModel({
        ...baseAlbumData,
        ownership_status: 'Ambiguous',
        match_confidence: 0.5,
        is_ignored: true
      })

      expect(album.is_ignored).toBe(true)
      expect(album.ownership_status).toBe('Ambiguous')
    })
  })

  describe('existing validation methods', () => {
    it('should validate MBID format', () => {
      const validResult = AlbumModel.validateMbid('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
      expect(validResult.valid).toBe(true)

      const invalidResult = AlbumModel.validateMbid('invalid-mbid')
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.error).toContain('Invalid MusicBrainz ID')
    })

    it('should validate title', () => {
      const validResult = AlbumModel.validateTitle('Test Album')
      expect(validResult.valid).toBe(true)

      const invalidResult = AlbumModel.validateTitle('   ')
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.error).toContain('cannot be empty')
    })

    it('should validate ownership status', () => {
      const validResult = AlbumModel.validateOwnershipStatus('Owned')
      expect(validResult.valid).toBe(true)

      const invalidResult = AlbumModel.validateOwnershipStatus('Invalid')
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.error).toContain('Ownership status must be one of')
    })

    it('should validate match confidence', () => {
      const validResult = AlbumModel.validateMatchConfidence(0.85)
      expect(validResult.valid).toBe(true)

      const nullResult = AlbumModel.validateMatchConfidence(null)
      expect(nullResult.valid).toBe(true)

      const invalidResult = AlbumModel.validateMatchConfidence(1.5)
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.error).toContain('between 0 and 1')
    })

    it('should extract year from release date', () => {
      expect(AlbumModel.extractYear('2020-05-15')).toBe(2020)
      expect(AlbumModel.extractYear('2020-05')).toBe(2020)
      expect(AlbumModel.extractYear('2020')).toBe(2020)
      expect(AlbumModel.extractYear(null)).toBeNull()
      expect(AlbumModel.extractYear('invalid')).toBeNull()
    })
  })
})
