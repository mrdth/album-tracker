import { describe, it, expect } from 'vitest'
import { AlbumMatcher } from '../../../src/services/AlbumMatcher'

describe('AlbumMatcher', () => {
  const matcher = new AlbumMatcher()

  describe('matchAlbums()', () => {
    it('should match exact title and year', () => {
      const albums = [{ mbid: '1', title: 'Abbey Road', release_year: 1969 }]
      const folders = [
        {
          folder_path: '/music/Beatles/[1969] Abbey Road',
          parsed_year: 1969,
          parsed_title: 'abbey road',
        },
      ]

      const matches = matcher.matchAlbums(albums, folders)

      const match = matches.get('1')
      expect(match?.status).toBe('Owned')
      expect(match?.confidence).toBeGreaterThanOrEqual(0.99)
      expect(match?.folder_path).toBe('/music/Beatles/[1969] Abbey Road')
    })

    it('should handle punctuation differences', () => {
      const albums = [{ mbid: '1', title: 'OK Computer', release_year: 1997 }]
      const folders = [
        {
          folder_path: '/music/Radiohead/[1997] OK Computer',
          parsed_year: 1997,
          parsed_title: 'ok computer',
        },
      ]

      const matches = matcher.matchAlbums(albums, folders)

      expect(matches.get('1')?.status).toBe('Owned')
      expect(matches.get('1')?.confidence).toBeGreaterThanOrEqual(0.8)
    })

    it('should mark low-confidence matches as Ambiguous', () => {
      const albums = [{ mbid: '1', title: 'In Rainbows', release_year: 2007 }]
      const folders = [
        {
          folder_path: '/music/Radiohead/[2007] Rainbows',
          parsed_year: 2007,
          parsed_title: 'rainbows',
        },
      ]

      const matches = matcher.matchAlbums(albums, folders)

      // Partial match should be Ambiguous (below 80% but above 0)
      const match = matches.get('1')
      expect(match?.status).toBe('Ambiguous')
      expect(match?.confidence).toBeGreaterThan(0)
      expect(match?.confidence).toBeLessThan(0.8)
    })

    it('should return Missing when no year candidates', () => {
      const albums = [{ mbid: '1', title: 'Abbey Road', release_year: 1969 }]
      const folders = [
        {
          folder_path: '/music/Beatles/[2020] Abbey Road',
          parsed_year: 2020,
          parsed_title: 'abbey road',
        },
      ]

      const matches = matcher.matchAlbums(albums, folders)

      expect(matches.get('1')?.status).toBe('Missing')
      expect(matches.get('1')?.confidence).toBe(0)
    })

    it('should allow ±1 year tolerance', () => {
      const albums = [{ mbid: '1', title: 'Album Title', release_year: 2000 }]
      const folders = [
        {
          folder_path: '/music/Artist/[2001] Album Title',
          parsed_year: 2001,
          parsed_title: 'album title',
        },
      ]

      const matches = matcher.matchAlbums(albums, folders)

      expect(matches.get('1')?.status).toBe('Owned')
    })

    it('should reject >1 year difference', () => {
      const albums = [{ mbid: '1', title: 'Album Title', release_year: 2000 }]
      const folders = [
        {
          folder_path: '/music/Artist/[2003] Album Title',
          parsed_year: 2003,
          parsed_title: 'album title',
        },
      ]

      const matches = matcher.matchAlbums(albums, folders)

      expect(matches.get('1')?.status).toBe('Missing')
    })

    it('should match multiple albums', () => {
      const albums = [
        { mbid: '1', title: 'Album One', release_year: 2000 },
        { mbid: '2', title: 'Album Two', release_year: 2001 },
      ]
      const folders = [
        {
          folder_path: '/music/Artist/[2000] Album One',
          parsed_year: 2000,
          parsed_title: 'album one',
        },
        {
          folder_path: '/music/Artist/[2001] Album Two',
          parsed_year: 2001,
          parsed_title: 'album two',
        },
      ]

      const matches = matcher.matchAlbums(albums, folders)

      expect(matches.get('1')?.status).toBe('Owned')
      expect(matches.get('2')?.status).toBe('Owned')
    })

    it('should choose best match when multiple folders match year', () => {
      const albums = [{ mbid: '1', title: 'OK Computer', release_year: 1997 }]
      const folders = [
        {
          folder_path: '/music/Radiohead/[1997] Different Album',
          parsed_year: 1997,
          parsed_title: 'different album',
        },
        {
          folder_path: '/music/Radiohead/[1997] OK Computer',
          parsed_year: 1997,
          parsed_title: 'ok computer',
        },
      ]

      const matches = matcher.matchAlbums(albums, folders)

      expect(matches.get('1')?.status).toBe('Owned')
      expect(matches.get('1')?.folder_path).toBe('/music/Radiohead/[1997] OK Computer')
    })

    it('should handle albums with no release year', () => {
      const albums = [{ mbid: '1', title: 'Unknown Year Album', release_year: null as any }]
      const folders = [
        {
          folder_path: '/music/Artist/[2020] Unknown Year Album',
          parsed_year: 2020,
          parsed_title: 'unknown year album',
        },
      ]

      const matches = matcher.matchAlbums(albums, folders)

      expect(matches.get('1')?.status).toBe('Missing')
    })

    it('should handle empty album list', () => {
      const albums: any[] = []
      const folders = [
        { folder_path: '/music/Artist/[2020] Album', parsed_year: 2020, parsed_title: 'album' },
      ]

      const matches = matcher.matchAlbums(albums, folders)

      expect(matches.size).toBe(0)
    })

    it('should handle empty folder list', () => {
      const albums = [{ mbid: '1', title: 'Album Title', release_year: 2000 }]
      const folders: any[] = []

      const matches = matcher.matchAlbums(albums, folders)

      expect(matches.get('1')?.status).toBe('Missing')
    })

    it('should use 80% threshold for Owned vs Ambiguous', () => {
      const albums = [{ mbid: '1', title: 'Test Album', release_year: 2000 }]
      const folders = [
        {
          folder_path: '/music/Artist/[2000] Test Album',
          parsed_year: 2000,
          parsed_title: 'test album',
        },
      ]

      const matches = matcher.matchAlbums(albums, folders)

      // Exact match should be Owned
      expect(matches.get('1')?.status).toBe('Owned')
      expect(matches.get('1')?.confidence).toBeGreaterThanOrEqual(0.8)
    })

    it('should normalize special characters', () => {
      const albums = [{ mbid: '1', title: 'Hail to the Thief!', release_year: 2003 }]
      const folders = [
        {
          folder_path: '/music/Radiohead/[2003] Hail to the Thief',
          parsed_year: 2003,
          parsed_title: 'hail to the thief',
        },
      ]

      const matches = matcher.matchAlbums(albums, folders)

      expect(matches.get('1')?.status).toBe('Owned')
    })

    it('should handle "The" article differences', () => {
      const albums = [{ mbid: '1', title: 'The Bends', release_year: 1995 }]
      const folders = [
        {
          folder_path: '/music/Radiohead/[1995] The Bends',
          parsed_year: 1995,
          parsed_title: 'the bends',
        },
      ]

      const matches = matcher.matchAlbums(albums, folders)

      // Should match even with "The" normalized
      expect(matches.get('1')?.status).toBe('Owned')
    })

    it('should handle remastered editions', () => {
      const albums = [{ mbid: '1', title: 'Dark Side of the Moon', release_year: 1973 }]
      const folders = [
        {
          folder_path: '/music/Pink Floyd/[1973] Dark Side of the Moon (Remastered)',
          parsed_year: 1973,
          parsed_title: 'dark side of the moon remastered',
        },
      ]

      const matches = matcher.matchAlbums(albums, folders)

      expect(matches.get('1')?.confidence).toBeGreaterThanOrEqual(0.75)
    })
  })

  describe('normalizeTitle()', () => {
    it('should convert to lowercase', () => {
      const result = matcher.normalizeTitle('UPPERCASE TITLE')
      expect(result).toBe('uppercase title')
    })

    it('should remove punctuation', () => {
      const result = matcher.normalizeTitle('Title: With, Punct.u!a?tion')
      expect(result).toBe('title with punctuation')
    })

    it('should trim whitespace', () => {
      const result = matcher.normalizeTitle('  Extra  Spaces  ')
      expect(result).toBe('extra spaces')
    })

    it('should handle empty string', () => {
      const result = matcher.normalizeTitle('')
      expect(result).toBe('')
    })

    it('should preserve numbers', () => {
      const result = matcher.normalizeTitle('Album 2020')
      expect(result).toBe('album 2020')
    })
  })
})
