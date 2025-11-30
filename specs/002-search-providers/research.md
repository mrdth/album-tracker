# Research: Search Providers for Missing Albums

**Feature**: 002-search-providers  
**Date**: 2025-11-30  
**Status**: Complete

## Executive Summary

This document consolidates research findings for implementing search provider functionality. All technical unknowns from the planning phase have been resolved with specific implementation decisions.

## Research Task 1: URL Encoding Standards for International Characters

### Decision
Use JavaScript's built-in `encodeURIComponent()` for encoding artist names and album titles before inserting them into URL templates.

### Rationale
- **RFC 3986 Compliance**: `encodeURIComponent()` implements percent-encoding per RFC 3986, ensuring maximum browser compatibility
- **UTF-8 Support**: Properly encodes international characters (é → %C3%A9, ö → %C3%B6)
- **Special Character Handling**: Encodes all non-alphanumeric characters except `-_.!~*'()`
  - Spaces → `%20` (proper encoding, not `+` which is query-string specific)
  - Slashes → `%2F` (safe for artist names like "AC/DC")
  - Ampersands → `%26` (safe for names like "Simon & Garfunkel")
- **Built-in**: No additional dependencies required

### Alternatives Considered
- **encodeURI()**: Rejected - Too permissive, doesn't encode characters that should be encoded when used as query parameters (e.g., `&`, `=`, `?`)
- **Custom encoding function**: Rejected - Reinventing the wheel, `encodeURIComponent()` handles edge cases already
- **Template literals with URL API**: Rejected - `URL` constructor is for building complete URLs, not for encoding individual components

### Implementation Example
```typescript
function replaceUrlPlaceholders(template: string, artist: string, album: string): string {
  return template
    .replace(/{artist}/g, encodeURIComponent(artist))
    .replace(/{album}/g, encodeURIComponent(album))
}

// Example: "Beyoncé" + "Lemonade" → "Beyonc%C3%A9" + "Lemonade"
// https://discogs.com/search?q={artist}+{album}
// → https://discogs.com/search?q=Beyonc%C3%A9+Lemonade
```

### Edge Cases Handled
- Empty values: Replace with empty string (template: `{artist} {album}`, artist="", album="Test" → ` Test`)
- Missing placeholders: Template without placeholders passed through unchanged
- Multiple occurrences: Global replace handles templates like `https://example.com/{artist}/albums/{artist}/{album}`

---

## Research Task 2: JSON Column Storage in SQLite with better-sqlite3

### Decision
Use a **JSON column** in the existing Settings table to store search providers as a JSON array. Do not create a separate SearchProvider table.

### Rationale
- **Singleton Pattern**: Settings is a singleton (one row, id=1), and search providers are configuration data, not domain entities
- **Simplicity**: No foreign keys, no joins, no separate CRUD overhead for a simple list
- **Performance**: For <20 providers (per spec SC-006), JSON parsing overhead is negligible (<1ms)
- **SQLite JSON1 Extension**: Built into modern SQLite (3.38.0+), better-sqlite3 supports it natively
- **Atomic Updates**: Can update entire providers array in a single UPDATE transaction

### Alternatives Considered
- **Separate SearchProvider Table**: Rejected - Overkill for simple configuration list, adds unnecessary normalization complexity
  - Would require: Foreign key to Settings, additional CRUD repository methods, join queries
  - Benefit (ACID on individual providers) not worth the complexity for <20 items
- **Separate JSON File**: Rejected - Loses transactional integrity with other settings, complicates backup/restore

### Schema Design
```sql
-- Migration: Add search_providers column to Settings table
ALTER TABLE Settings ADD COLUMN search_providers TEXT NOT NULL DEFAULT '[]';

-- Constraint: Validate JSON structure
ALTER TABLE Settings ADD CONSTRAINT chk_search_providers_json 
  CHECK (json_valid(search_providers) AND json_type(search_providers) = 'array');
```

### Query Patterns
```typescript
// Read all providers
const settings = db.prepare('SELECT search_providers FROM Settings WHERE id = 1').get()
const providers = JSON.parse(settings.search_providers)

// Add provider (read-modify-write pattern)
const settings = db.prepare('SELECT search_providers FROM Settings WHERE id = 1').get()
const providers = JSON.parse(settings.search_providers)
const newProvider = { id: Date.now(), name: 'Discogs', urlTemplate: 'https://...' }
providers.push(newProvider)
db.prepare('UPDATE Settings SET search_providers = ? WHERE id = 1')
  .run(JSON.stringify(providers))

// Update provider (find-replace pattern)
const settings = db.prepare('SELECT search_providers FROM Settings WHERE id = 1').get()
const providers = JSON.parse(settings.search_providers)
const index = providers.findIndex(p => p.id === targetId)
if (index !== -1) providers[index] = updatedProvider
db.prepare('UPDATE Settings SET search_providers = ? WHERE id = 1')
  .run(JSON.stringify(providers))

// Delete provider (filter pattern)
const settings = db.prepare('SELECT search_providers FROM Settings WHERE id = 1').get()
const providers = JSON.parse(settings.search_providers)
const filtered = providers.filter(p => p.id !== targetId)
db.prepare('UPDATE Settings SET search_providers = ? WHERE id = 1')
  .run(JSON.stringify(filtered))
```

### Trade-offs Accepted
- No SQL-level validation of individual provider objects (handled in application layer)
- Read-modify-write pattern requires transaction handling (use better-sqlite3 transactions)
- ID generation uses timestamp (unique enough for single-user, <1 provider/second creation rate)

---

## Research Task 3: Vue 3 Dropdown Component Best Practices

### Decision
Use a **custom dropdown component** built with native HTML elements (`<button>`, `<div>`, `<ul>`, `<li>`) and Tailwind CSS, with keyboard navigation support. Do not use `<select>`.

### Rationale
- **Design Control**: `<select>` styling is limited and inconsistent across browsers; custom dropdown allows Tailwind CSS styling to match existing design system
- **Better UX for Actions**: Selecting a search provider triggers navigation (opens new tab), not form submission - custom button-based dropdown better communicates this
- **Icon Support**: Can add provider icons or external link icons next to provider names
- **Consistency**: Matches existing pattern in AlbumCard.vue for action dropdowns (if any)
- **Accessibility**: Can implement ARIA attributes (aria-haspopup, aria-expanded) and keyboard navigation (arrow keys, Enter, Escape)

### Alternatives Considered
- **Native `<select>`**: Rejected - Poor styling control, form-oriented semantics don't match action-oriented use case
- **Headless UI**: Rejected - Not currently in dependencies, YAGNI for simple dropdown (would add 10KB+ bundle size)
- **Radix Vue**: Rejected - Same reason as Headless UI

### Implementation Pattern
```vue
<template>
  <div class="relative" v-if="album.ownership_status === 'Missing' && providers.length > 0">
    <button 
      @click="isOpen = !isOpen"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      class="btn-secondary text-sm"
    >
      Search
      <svg><!-- dropdown icon --></svg>
    </button>
    
    <ul 
      v-if="isOpen" 
      class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg max-h-60 overflow-auto z-10"
      role="menu"
    >
      <li v-for="provider in providers" :key="provider.id" role="none">
        <a 
          :href="buildSearchUrl(provider, album)"
          target="_blank"
          rel="noopener noreferrer"
          class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          role="menuitem"
          @click="isOpen = false"
        >
          {{ provider.name }}
        </a>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)

function buildSearchUrl(provider: SearchProvider, album: Album): string {
  return provider.urlTemplate
    .replace(/{artist}/g, encodeURIComponent(album.artist.name))
    .replace(/{album}/g, encodeURIComponent(album.title))
}
</script>
```

### Accessibility Features
- **Keyboard Navigation**: Arrow keys to navigate items (future enhancement if needed, links already keyboard-accessible with Tab)
- **Escape to Close**: Close dropdown on Escape key
- **Click Outside**: Close dropdown when clicking outside (use `@click.outside` or composable)
- **ARIA Attributes**: `aria-haspopup="true"`, `aria-expanded` for screen readers
- **Focus Management**: Return focus to button when dropdown closes

### Performance Optimization
- **v-if for Conditional Rendering**: Only render dropdown DOM when `isOpen = true` (Vue optimizes with v-if)
- **max-h-60 overflow-auto**: Limit height and add scrolling for 20+ providers (per SC-006)
- **Client-Side URL Building**: No API calls on dropdown open or provider selection

---

## Research Task 4: Template String Replacement Security

### Decision
Use **simple string replacement** with regex for {artist} and {album} placeholders, combined with URL validation after replacement. Do not use template literals or eval.

### Rationale
- **No Code Execution**: String replacement is safe - cannot inject JavaScript or execute code
- **XSS Protection**: URLs are opened in `target="_blank"` with `rel="noopener noreferrer"`, preventing access to window.opener
- **Malicious Template Example**: `https://evil.com?q={artist}<script>alert('xss')</script>` → Encoded to `?q=Pink%20Floyd%3Cscript%3Ealert%28%27xss%27%29%3C%2Fscript%3E` (script tags become harmless text)
- **Browser Protection**: Modern browsers don't execute scripts in URLs unless via `javascript:` protocol (which we validate against)
- **SSRF Not Applicable**: Client-side only, no server-side URL fetching

### Implementation
```typescript
const PLACEHOLDER_PATTERN = /\{(artist|album)\}/g
const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'file:']

export function buildSearchUrl(
  template: string, 
  artist: string, 
  album: string
): string | null {
  // 1. Replace placeholders with encoded values
  const url = template
    .replace(/{artist}/g, encodeURIComponent(artist || ''))
    .replace(/{album}/g, encodeURIComponent(album || ''))
  
  // 2. Validate resulting URL
  try {
    const parsed = new URL(url)
    
    // 3. Block dangerous protocols
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

// Validation on template save (backend)
export function validateUrlTemplate(template: string): { valid: boolean; error?: string } {
  // Must contain http:// or https://
  if (!template.startsWith('http://') && !template.startsWith('https://')) {
    return { valid: false, error: 'URL template must start with http:// or https://' }
  }
  
  // Try building with dummy values
  const testUrl = buildSearchUrl(template, 'Test Artist', 'Test Album')
  if (!testUrl) {
    return { valid: false, error: 'URL template creates invalid URL' }
  }
  
  return { valid: true }
}
```

### Alternatives Considered
- **Template Literals**: Rejected - Would require eval() or Function constructor, massive security risk
- **Mustache/Handlebars**: Rejected - Overkill for two placeholders, adds dependency
- **Regex with Capture Groups**: Rejected - Simpler to use direct string replace than regex capture

### Edge Cases Handled
- **Case Sensitivity**: Use lowercase `{artist}` and `{album}` only (document in UI)
- **Unknown Placeholders**: `{invalidPlaceholder}` passes through unchanged (becomes literal text in URL)
- **Nested Braces**: `{{artist}}` → First `{artist}` replaced, second `{` remains → `{Pink%20Floyd}`
- **Empty Values**: Empty string after encoding is valid (template gracefully degrades)

---

## Research Task 5: Settings API Versioning Strategy

### Decision
**No API versioning** for this feature. Extend existing Settings API with new endpoints under `/api/settings/search-providers`. Maintain backward compatibility through additive-only changes.

### Rationale
- **Monorepo Coupling**: Frontend and backend deployed together (not separate services), so breaking changes can be coordinated in a single commit
- **Single User**: No multi-client concerns (mobile app, third-party integrations)
- **Additive Changes**: New endpoints don't modify existing Settings fields or contracts
- **Simplicity**: Versioning adds complexity (routing, controller duplication, documentation overhead) without benefit for single-user tool
- **Future-Proof**: If versioning needed later (e.g., public API), can introduce `/api/v2/...` prefix at that time

### API Design Principles
- **Backward Compatibility**: New `search_providers` field in Settings response defaults to `[]` if not set (existing clients ignore unknown fields)
- **Namespaced Routes**: Use `/api/settings/search-providers/*` to logically group under settings resource
- **Consistent Errors**: Use existing error response format `{ error: string, details?: string }`
- **HTTP Semantics**: Follow REST conventions (POST=create, PUT=update, DELETE=delete, GET=list)

### Future Considerations
If API becomes public or multi-client:
1. Introduce `/api/v1/` prefix for all endpoints
2. Version at API level, not per-resource (`/api/v1/settings`, `/api/v1/albums`)
3. Document deprecation timeline for old versions (e.g., 6 months before removal)
4. Use `Accept-Version` header as alternative to URL versioning

### Breaking Change Policy
- **This Feature**: No breaking changes - purely additive
- **Future**: If breaking changes needed to Settings, increment major version in package.json and document migration in CHANGELOG

---

## Implementation Checklist

Based on research findings, the following technical decisions are locked in:

- [x] URL encoding: `encodeURIComponent()` for artist/album values
- [x] Data storage: JSON column `search_providers` in Settings table
- [x] Dropdown UI: Custom component with Tailwind CSS and accessibility support
- [x] Template security: String replacement + URL validation (no eval)
- [x] API versioning: None - additive changes to `/api/settings/...`

**Next Steps**: Proceed to Phase 1 (Data Model & Contracts design)
