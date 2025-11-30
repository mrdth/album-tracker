/**
 * URL Template Utility
 *
 * Provides functions for building search URLs from templates with {artist} and {album} placeholders.
 * Uses encodeURIComponent() for proper RFC 3986 percent-encoding of special characters.
 */

/**
 * Dangerous protocols that should be blocked for security
 */
const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'file:']

/**
 * Builds a search URL from a template by replacing {artist} and {album} placeholders
 * with properly encoded values.
 *
 * @param template - URL template with {artist} and {album} placeholders
 * @param artist - Artist name to insert into template
 * @param album - Album title to insert into template
 * @returns The constructed URL with encoded values, or null if the result is invalid
 *
 * @example
 * buildSearchUrl('https://discogs.com/search?q={artist}+{album}', 'Pink Floyd', 'The Wall')
 * // Returns: 'https://discogs.com/search?q=Pink%20Floyd+The%20Wall'
 *
 * @example
 * buildSearchUrl('https://example.com?q={artist}', 'Beyoncé', 'Lemonade')
 * // Returns: 'https://example.com?q=Beyonc%C3%A9'
 */
export function buildSearchUrl(
  template: string,
  artist: string,
  album: string
): string | null {
  // Replace placeholders with encoded values
  const url = template
    .replace(/{artist}/g, encodeURIComponent(artist || ''))
    .replace(/{album}/g, encodeURIComponent(album || ''))

  // Validate resulting URL
  try {
    const parsed = new URL(url)

    // Block dangerous protocols
    if (DANGEROUS_PROTOCOLS.some(proto => parsed.protocol === proto)) {
      console.warn(`Blocked dangerous protocol: ${parsed.protocol}`)
      return null
    }

    return url
  } catch (e) {
    console.warn(`Invalid URL after template replacement: ${url}`)
    return null
  }
}

/**
 * Validation result for URL templates
 */
export interface UrlTemplateValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates a URL template to ensure it will produce valid URLs.
 *
 * @param template - URL template to validate
 * @returns Validation result with valid flag and optional error message
 *
 * @example
 * validateUrlTemplate('https://discogs.com/search?q={artist}+{album}')
 * // Returns: { valid: true }
 *
 * @example
 * validateUrlTemplate('ftp://example.com')
 * // Returns: { valid: false, error: 'URL template must start with http:// or https://' }
 */
export function validateUrlTemplate(template: string): UrlTemplateValidationResult {
  // Must contain http:// or https://
  if (!template.startsWith('http://') && !template.startsWith('https://')) {
    return {
      valid: false,
      error: 'URL template must start with http:// or https://'
    }
  }

  // Try building with dummy values to verify template creates valid URL
  const testUrl = buildSearchUrl(template, 'Test Artist', 'Test Album')
  if (!testUrl) {
    return {
      valid: false,
      error: 'URL template creates invalid URL'
    }
  }

  return { valid: true }
}
