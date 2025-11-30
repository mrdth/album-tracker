import { describe, it, expect } from 'vitest'
import { buildSearchUrl, validateUrlTemplate } from '../../src/utils/urlTemplate'

describe('urlTemplate', () => {
  describe('buildSearchUrl()', () => {
    it('should replace {artist} and {album} placeholders with encoded values', () => {
      const template = 'https://discogs.com/search?q={artist}+{album}'
      const result = buildSearchUrl(template, 'Pink Floyd', 'The Wall')

      expect(result).toBe('https://discogs.com/search?q=Pink%20Floyd+The%20Wall')
    })

    it('should encode special characters in artist names', () => {
      const template = 'https://example.com/search?artist={artist}'
      const result = buildSearchUrl(template, 'Beyoncé', 'Lemonade')

      expect(result).toBe('https://example.com/search?artist=Beyonc%C3%A9')
    })

    it('should encode slashes in artist names', () => {
      const template = 'https://example.com/search?q={artist}'
      const result = buildSearchUrl(template, 'AC/DC', 'Back in Black')

      expect(result).toBe('https://example.com/search?q=AC%2FDC')
    })

    it('should encode ampersands in artist names', () => {
      const template = 'https://example.com/search?q={artist}'
      const result = buildSearchUrl(template, 'Simon & Garfunkel', 'Bridge Over Troubled Water')

      expect(result).toBe('https://example.com/search?q=Simon%20%26%20Garfunkel')
    })

    it('should encode spaces as %20', () => {
      const template = 'https://example.com/search?q={artist}+{album}'
      const result = buildSearchUrl(template, 'The Beatles', 'Abbey Road')

      expect(result).toBe('https://example.com/search?q=The%20Beatles+Abbey%20Road')
    })

    it('should handle templates without {album} placeholder', () => {
      const template = 'https://example.com/artist/{artist}'
      const result = buildSearchUrl(template, 'Radiohead', 'OK Computer')

      expect(result).toBe('https://example.com/artist/Radiohead')
    })

    it('should handle templates without {artist} placeholder', () => {
      const template = 'https://example.com/album/{album}'
      const result = buildSearchUrl(template, 'Nirvana', 'Nevermind')

      expect(result).toBe('https://example.com/album/Nevermind')
    })

    it('should handle multiple occurrences of the same placeholder', () => {
      const template = 'https://example.com/{artist}/albums/{artist}/{album}'
      const result = buildSearchUrl(template, 'Metallica', 'Master of Puppets')

      expect(result).toBe('https://example.com/Metallica/albums/Metallica/Master%20of%20Puppets')
    })

    it('should handle empty artist value', () => {
      const template = 'https://example.com/search?artist={artist}&album={album}'
      const result = buildSearchUrl(template, '', 'Unknown Album')

      expect(result).toBe('https://example.com/search?artist=&album=Unknown%20Album')
    })

    it('should handle empty album value', () => {
      const template = 'https://example.com/search?artist={artist}&album={album}'
      const result = buildSearchUrl(template, 'Unknown Artist', '')

      expect(result).toBe('https://example.com/search?artist=Unknown%20Artist&album=')
    })

    it('should return null for dangerous javascript: protocol', () => {
      const template = 'javascript:alert({artist})'
      const result = buildSearchUrl(template, 'Test', 'Album')

      expect(result).toBeNull()
    })

    it('should return null for dangerous data: protocol', () => {
      const template = 'data:text/html,<script>alert({artist})</script>'
      const result = buildSearchUrl(template, 'Test', 'Album')

      expect(result).toBeNull()
    })

    it('should return null for dangerous file: protocol', () => {
      const template = 'file:///etc/passwd?q={artist}'
      const result = buildSearchUrl(template, 'Test', 'Album')

      expect(result).toBeNull()
    })

    it('should return null for invalid URL after replacement', () => {
      const template = 'not-a-valid-url-{artist}'
      const result = buildSearchUrl(template, 'Test', 'Album')

      expect(result).toBeNull()
    })

    it('should handle international characters correctly', () => {
      const template = 'https://example.com/search?q={artist}+{album}'
      const result = buildSearchUrl(template, 'Björk', 'Homogenic')

      expect(result).toBe('https://example.com/search?q=Bj%C3%B6rk+Homogenic')
    })

    it('should handle question marks in album titles', () => {
      const template = 'https://example.com/search?q={album}'
      const result = buildSearchUrl(template, 'Artist', 'What\'s Going On?')

      expect(result).toBe('https://example.com/search?q=What\'s%20Going%20On%3F')
    })

    it('should handle equals signs in values', () => {
      const template = 'https://example.com/search?q={artist}'
      const result = buildSearchUrl(template, 'Artist=Value', 'Album')

      expect(result).toBe('https://example.com/search?q=Artist%3DValue')
    })

    it('should preserve plus signs in template literal (not in placeholder values)', () => {
      const template = 'https://example.com/search?q={artist}+{album}'
      const result = buildSearchUrl(template, 'The Beatles', 'Abbey Road')

      // Plus sign in template stays, spaces in values become %20
      expect(result).toBe('https://example.com/search?q=The%20Beatles+Abbey%20Road')
    })
  })

  describe('validateUrlTemplate()', () => {
    it('should validate https:// templates as valid', () => {
      const result = validateUrlTemplate('https://discogs.com/search?q={artist}+{album}')

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should validate http:// templates as valid', () => {
      const result = validateUrlTemplate('http://example.com/search?q={artist}')

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject templates without http:// or https://', () => {
      const result = validateUrlTemplate('ftp://example.com/search')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('URL template must start with http:// or https://')
    })

    it('should reject templates that create invalid URLs', () => {
      const result = validateUrlTemplate('https://[invalid-url-{artist}')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('URL template creates invalid URL')
    })

    it('should reject javascript: protocol', () => {
      const result = validateUrlTemplate('javascript:alert("xss")')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('URL template must start with http:// or https://')
    })

    it('should reject data: protocol', () => {
      const result = validateUrlTemplate('data:text/html,<h1>Test</h1>')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('URL template must start with http:// or https://')
    })

    it('should reject file: protocol', () => {
      const result = validateUrlTemplate('file:///etc/passwd')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('URL template must start with http:// or https://')
    })

    it('should accept templates with special characters that will be encoded', () => {
      const result = validateUrlTemplate('https://example.com/search?q={artist}&type=release')

      expect(result.valid).toBe(true)
    })

    it('should accept templates with multiple placeholders', () => {
      const result = validateUrlTemplate('https://example.com/{artist}/albums/{album}')

      expect(result.valid).toBe(true)
    })

    it('should accept templates without placeholders', () => {
      const result = validateUrlTemplate('https://example.com/search')

      expect(result.valid).toBe(true)
    })
  })
})
