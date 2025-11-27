# Technical Research: Album Tracker Implementation

**Feature Branch**: `001-album-tracker`  
**Research Date**: 2025-11-27  
**Status**: Complete  
**Last Updated**: 2025-11-27

---

## 0. String Matching Library Selection (Album Matching)

### Decision

**Recommendation**: Use **Fuse.js** for album folder name matching instead of implementing custom string similarity from scratch.

**Key Strategy**:
- Install Fuse.js as lightweight dependency (zero dependencies itself)
- Configure with threshold matching 80% similarity requirement
- Use for comparing parsed album folder names against MusicBrainz metadata
- Fall back to manual override UI for ambiguous matches

**Justification**:
- **Battle-tested**: Widely used library (6M+ weekly downloads) with proven fuzzy matching
- **Lightweight**: Zero dependencies, ~12KB minified+gzipped
- **Configurable**: Threshold-based scoring aligns with spec requirement (80% similarity)
- **Maintainable**: Avoid reinventing complex string similarity algorithms (Levenshtein distance, edit distance)
- **Constitution Aligned**: Minimal dependencies (Principle IV) while avoiding premature optimization

### Implementation Approach

**Installation**:
```bash
npm install fuse.js
```

**Configuration for Album Matching** (`backend/src/services/AlbumMatcher.ts`):
```typescript
import Fuse from 'fuse.js'

interface AlbumCandidate {
  title: string
  year: number
  folderPath: string
}

class AlbumMatcher {
  private readonly SIMILARITY_THRESHOLD = 0.80 // From spec clarifications
  
  /**
   * Match album metadata against filesystem folders
   */
  matchAlbums(
    albums: { title: string; releaseYear: number }[],
    folders: { parsed_title: string; parsed_year: number; folder_path: string }[]
  ): Map<string, MatchResult> {
    const matches = new Map<string, MatchResult>()
    
    albums.forEach(album => {
      // Filter folders by year first (exact match or within 1 year tolerance)
      const yearCandidates = folders.filter(folder => 
        folder.parsed_year && 
        Math.abs(folder.parsed_year - album.releaseYear) <= 1
      )
      
      if (yearCandidates.length === 0) {
        matches.set(album.title, { status: 'Missing', confidence: 0 })
        return
      }
      
      // Use Fuse.js for fuzzy title matching
      const fuse = new Fuse(yearCandidates, {
        keys: ['parsed_title'],
        threshold: 1 - this.SIMILARITY_THRESHOLD, // Fuse uses 0.0 = perfect match
        includeScore: true,
        ignoreLocation: true, // Don't penalize position
        ignoreFieldNorm: true // Don't penalize length differences
      })
      
      const results = fuse.search(this.normalizeTitle(album.title))
      
      if (results.length === 0) {
        matches.set(album.title, { status: 'Missing', confidence: 0 })
        return
      }
      
      const bestMatch = results[0]
      const confidence = 1 - (bestMatch.score || 0) // Convert back to similarity
      
      matches.set(album.title, {
        status: confidence >= this.SIMILARITY_THRESHOLD ? 'Owned' : 'Ambiguous',
        confidence,
        folderPath: bestMatch.item.folder_path
      })
    })
    
    return matches
  }
  
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .trim()
  }
}

interface MatchResult {
  status: 'Owned' | 'Missing' | 'Ambiguous'
  confidence: number
  folderPath?: string
}
```

**Fuse.js Configuration Options**:
- `threshold`: `0.2` (1 - 0.80) - controls fuzziness, lower = stricter matching
- `ignoreLocation`: `true` - don't penalize where match occurs in string
- `ignoreFieldNorm`: `true` - don't penalize length differences
- `includeScore`: `true` - return confidence scores for transparency

**Year Filtering Strategy**:
- Filter candidates by year **before** fuzzy matching (performance optimization)
- Allow ±1 year tolerance (MusicBrainz release dates can vary by region)
- Only run Fuse.js on year-filtered subset

### Performance Characteristics

**Fuse.js Performance**:
- Optimized for client-side search with 100s-1000s of items
- Minimal overhead: ~1ms per search on modern hardware for <1000 items
- Pre-indexing option available for repeated searches on same dataset

**Album Tracker Scale**:
- Expected: 100 artists × 10-20 albums = 1,000-2,000 albums total
- Filesystem cache: 10,000+ folder entries (entire library)
- **Verdict**: Well within Fuse.js sweet spot

**Optimization Strategy**:
- Year filtering reduces search space from 10,000 folders to ~50-100 per album
- Fuse.js only searches year-matched candidates
- Cache normalized titles to avoid repeated normalization

### Alternatives Considered

**Option 1: Custom Levenshtein Distance Implementation**
- **Pros**: Full control, no dependency, educational
- **Cons**: Complex to implement correctly, performance pitfalls, edge case handling (UTF-8, accents), no battle-testing
- **Why not chosen**: Violates DRY and YAGNI principles; Fuse.js is 12KB - minimal cost for proven quality

**Option 2: string-similarity library**
- **Pros**: Simple API, dice coefficient algorithm
- **Cons**: Less configurable than Fuse.js, no built-in search/ranking, 1/10th the weekly downloads
- **Why not chosen**: Fuse.js provides more features (scoring, ranking, multi-key search) for similar bundle size

**Option 3: @leeoniya/ufuzzy**
- **Pros**: Ultra-fast performance, optimized for large datasets
- **Cons**: More complex API, overkill for Album Tracker scale, less documentation
- **Why not chosen**: Album Tracker has <2000 albums; Fuse.js performance is sufficient and API is simpler

**Option 4: Exact match only (no fuzzy search)**
- **Pros**: Simple, no dependency
- **Cons**: Fails on minor differences (punctuation, extra spaces, "The" vs no "The")
- **Why not chosen**: Spec requires handling real-world naming variations; exact match would force excessive manual overrides

### Testing Strategy

**Unit Tests** (`backend/tests/unit/matching/AlbumMatcher.test.ts`):
```typescript
describe('AlbumMatcher', () => {
  it('should match exact title and year', () => {
    const matcher = new AlbumMatcher()
    const albums = [{ title: 'Abbey Road', releaseYear: 1969 }]
    const folders = [{ 
      parsed_title: 'abbey road', 
      parsed_year: 1969,
      folder_path: '/music/Beatles/[1969] Abbey Road'
    }]
    
    const matches = matcher.matchAlbums(albums, folders)
    expect(matches.get('Abbey Road')).toEqual({
      status: 'Owned',
      confidence: 1.0,
      folderPath: '/music/Beatles/[1969] Abbey Road'
    })
  })
  
  it('should handle punctuation differences', () => {
    const matcher = new AlbumMatcher()
    const albums = [{ title: 'OK Computer', releaseYear: 1997 }]
    const folders = [{ 
      parsed_title: 'ok computer', 
      parsed_year: 1997,
      folder_path: '/music/Radiohead/[1997] OK Computer'
    }]
    
    const matches = matcher.matchAlbums(albums, folders)
    expect(matches.get('OK Computer')?.status).toBe('Owned')
    expect(matches.get('OK Computer')?.confidence).toBeGreaterThanOrEqual(0.80)
  })
  
  it('should mark low-confidence matches as Ambiguous', () => {
    const matcher = new AlbumMatcher()
    const albums = [{ title: 'Abbey Road', releaseYear: 1969 }]
    const folders = [{ 
      parsed_title: 'different album', 
      parsed_year: 1969,
      folder_path: '/music/Beatles/[1969] Different Album'
    }]
    
    const matches = matcher.matchAlbums(albums, folders)
    expect(matches.get('Abbey Road')?.status).toBe('Ambiguous')
    expect(matches.get('Abbey Road')?.confidence).toBeLessThan(0.80)
  })
  
  it('should return Missing when no year candidates', () => {
    const matcher = new AlbumMatcher()
    const albums = [{ title: 'Abbey Road', releaseYear: 1969 }]
    const folders = [{ 
      parsed_title: 'abbey road', 
      parsed_year: 2020, // Wrong year
      folder_path: '/music/Beatles/[2020] Abbey Road'
    }]
    
    const matches = matcher.matchAlbums(albums, folders)
    expect(matches.get('Abbey Road')?.status).toBe('Missing')
  })
})
```

**Integration Tests**: Test with real album metadata and mock filesystem structure

### Resources

**Official Documentation**:
- [Fuse.js Official Site](https://www.fusejs.io/)
- [Fuse.js GitHub Repository](https://github.com/krisk/fuse)
- [Fuse.js API Documentation](https://www.fusejs.io/api/options.html)

**Comparisons & Analysis**:
- [JavaScript fuzzy search that makes sense - Stack Overflow](https://stackoverflow.com/questions/23305000/javascript-fuzzy-search-that-makes-sense)
- [fuse.js vs string-similarity comparison - npm-compare](https://npm-compare.com/fuse.js,natural,string-natural-compare,string-similarity)
- [How to Implement Fuzzy Search in JavaScript - Codementor](https://www.codementor.io/@anwarulislam/how-to-implement-fuzzy-search-in-javascript-2742dqz1p9)

**Alternative Libraries**:
- [leven (Levenshtein distance) vs fuse.js comparison](https://npm-compare.com/fuse.js,fuzzyset.js,jaro-winkler,leven,string-similarity,string-similarity-js)
- [string-similarity library - Best of JS](https://bestofjs.org/projects/string-similarity)

### Integration with Existing Architecture

**Dependencies Update** (`backend/package.json`):
```json
{
  "dependencies": {
    "fuse.js": "^7.0.0"
  }
}
```

**Service Integration**:
- `FilesystemScanner.ts`: Populates FilesystemCache with parsed folder data
- `AlbumMatcher.ts`: Uses Fuse.js to match albums against cache
- `ArtistRepository.ts`: Stores match results with confidence scores

**Data Model Update** (already defined in data-model.md):
- `Album.match_confidence` field stores Fuse.js score (0.0-1.0)
- `Album.is_manual_override` flag bypasses automatic matching

---

## 1. Accessibility Implementation for Vue 3 + Tailwind CSS

> **NOTE: FUTURE ENHANCEMENT - NOT REQUIRED FOR MVP**
> 
> This section documents accessibility best practices for potential future implementation. 
> For the MVP (single-user, personal application), basic semantic HTML and native browser 
> keyboard navigation are sufficient. Screen reader support and WCAG 2.1 Level AA compliance 
> are overkill for a personal tool.
>
> **MVP Approach**: Use semantic HTML (`<button>`, `<nav>`, `<main>`) and Tailwind's basic 
> focus states. No additional accessibility libraries needed.

### Decision (Future Enhancement Only)

**Recommendation**: If accessibility becomes a requirement (e.g., public deployment, enterprise use), implement WCAG 2.1 Level AA compliance using semantic HTML, Tailwind CSS accessibility utilities, and Vue-specific accessibility libraries.

**Key Strategy** (for future reference):
- Use semantic HTML as the foundation (not just divs/spans styled to look semantic)
- Leverage Tailwind's built-in accessibility utilities (focus states, ARIA variants, sr-only)
- Integrate `@vue-a11y/announcer` for screen reader announcements (future only)
- Implement `vue-keyboard-trap` for complex keyboard navigation in directory browser (future only)

**Why Not for MVP**:
- Single-user application (you control the environment)
- No regulatory compliance requirements
- Screen reader support adds complexity without user benefit
- Native browser keyboard navigation is sufficient for basic interactions
- Semantic HTML provides baseline accessibility at no cost

### Implementation Approach

#### Core Principles
1. **Semantic HTML First**: Use proper elements (`<button>`, `<nav>`, `<main>`, `<article>`) before styling
2. **Tailwind Accessibility Utilities**:
   - Focus states: `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none`
   - Use `focus-visible:` variant for keyboard-only focus indicators
   - Screen reader only text: `sr-only` class for hidden but accessible content
   - ARIA conditional styling: `aria-[checked]:bg-blue-500` for state-based styles
3. **Color Contrast Requirements**:
   - Normal text: 4.5:1 minimum contrast ratio
   - Large text (18pt+): 3:1 minimum contrast ratio
   - UI components/graphics: 3:1 minimum contrast ratio
   - Always verify Tailwind color combinations meet these thresholds

#### Vue 3 Accessibility Libraries

**@vue-a11y/announcer** (Recommended)
```javascript
// Install
npm install @vue-a11y/announcer

// Usage in Vue component
import { useAnnouncer } from '@vue-a11y/announcer'

const { assertive, polite } = useAnnouncer()

// For loading states
polite('Please wait. Loading albums...')
polite('Loading complete. 15 albums found.')

// For critical errors
assertive('Error: Unable to connect to MusicBrainz API')
```

**vue-keyboard-trap** (For directory browser)
```javascript
// Install
npm install vue-keyboard-trap

// Usage for tree navigation
import { vKbdTrap } from 'vue-keyboard-trap'

<div v-kbd-trap="{ mode: 'grid', autofocus: true }">
  <div role="row" data-v-kbd-trap-row="0">
    <button role="gridcell" data-v-kbd-trap-col="0">Folder 1</button>
  </div>
  <div role="row" data-v-kbd-trap-row="1">
    <button role="gridcell" data-v-kbd-trap-col="0">Folder 2</button>
  </div>
</div>
```

#### Directory Browser Component - Keyboard Navigation Patterns

**ARIA Roles for Tree Structure**:
```vue
<template>
  <div role="tree" aria-label="Music library directory browser">
    <div 
      v-for="folder in folders" 
      :key="folder.path"
      role="treeitem"
      :aria-expanded="folder.isOpen"
      :aria-level="folder.depth"
      tabindex="0"
      @keydown="handleKeyNavigation"
    >
      {{ folder.name }}
    </div>
  </div>
</template>
```

**Keyboard Shortcuts**:
- `Arrow Up/Down`: Navigate between items
- `Arrow Right`: Expand folder
- `Arrow Left`: Collapse folder or move to parent
- `Enter/Space`: Select folder
- `Home/End`: Jump to first/last item
- `Type-ahead`: Jump to item by typing first letters

#### Screen Reader Considerations

**ARIA Live Regions for Dynamic Content**:
```vue
<template>
  <!-- Always present in DOM, never conditionally rendered -->
  <div 
    aria-live="polite" 
    aria-atomic="true"
    class="sr-only"
  >
    {{ statusMessage }}
  </div>
  
  <!-- Album grid updates -->
  <div role="region" aria-label="Album collection">
    <div 
      aria-live="polite" 
      aria-atomic="false"
      class="sr-only"
    >
      Showing {{ ownedCount }} owned out of {{ totalCount }} total albums
    </div>
    <!-- Grid content -->
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const statusMessage = ref('')

// Update status when loading state changes
watch(isLoading, (loading) => {
  if (loading) {
    statusMessage.value = 'Loading albums, please wait...'
  } else {
    statusMessage.value = `Loading complete. ${albums.length} albums loaded.`
  }
})
</script>
```

**Critical Implementation Requirements**:
- ARIA live region elements must ALWAYS exist in the DOM (no `v-if`)
- Use `v-show` if you need to conditionally display live regions
- Wait at least 2 seconds after page load before injecting text into live regions
- Change text content, don't replace the element entirely (Vue's reactivity can break this)
- Use `aria-live="polite"` for most updates (loading states, counts)
- Use `aria-live="assertive"` only for critical errors that require immediate attention

**Loading States Best Practices**:
```vue
<template>
  <!-- Loading spinner with accessible label -->
  <div v-if="isLoading" role="status" aria-live="polite">
    <svg class="animate-spin" aria-hidden="true"><!-- spinner --></svg>
    <span class="sr-only">Loading artist discography...</span>
  </div>
  
  <!-- Album grid with loading overlay -->
  <div :aria-busy="isLoading">
    <!-- Content -->
  </div>
</template>
```

### Alternatives Considered

**Option 1: Headless UI / Radix Vue**
- **Pros**: Pre-built accessible components with ARIA patterns, focus management built-in
- **Cons**: Additional dependency, may be overkill for simple components, learning curve
- **Why not chosen**: Album Tracker has relatively simple UI patterns; building custom with smaller focused libraries provides more control and less bundle size

**Option 2: Vuetify with Material Design**
- **Pros**: Complete component library with accessibility features
- **Cons**: Heavy framework, opinionated design system, larger bundle, may conflict with Tailwind
- **Why not chosen**: Adds significant complexity and bundle size; Tailwind + focused accessibility libraries is more flexible

**Option 3: Build everything from scratch without libraries**
- **Pros**: Full control, no dependencies
- **Cons**: High risk of missing accessibility edge cases, reinventing solved problems
- **Why not chosen**: ARIA live regions and keyboard navigation have subtle implementation requirements; using battle-tested libraries reduces risk

### Resources

**Official Documentation**:
- [Vue.js Accessibility Guide](https://vuejs.org/guide/best-practices/accessibility.html)
- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- [Tailwind CSS Hover, Focus, and Other States](https://tailwindcss.com/docs/hover-focus-and-other-states)
- [ARIA Live Regions - MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)

**Vue Libraries**:
- [@vue-a11y/announcer](https://github.com/vue-a11y/vue-announcer) - Screen reader announcements
- [vue-keyboard-trap](https://github.com/pdanpdan/vue-keyboard-trap) - Keyboard navigation patterns
- [Accessible Vue Guide](https://accessible-vue.com/) - Comprehensive Vue accessibility resource

**Tools & Testing**:
- [Colour Accessibility for Tailwind CSS](https://colour-a11y.vercel.app/) - Contrast checker
- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension for accessibility testing
- [NVDA](https://www.nvaccess.org/) - Free screen reader for Windows
- [VoiceOver](https://www.apple.com/accessibility/voiceover/) - Built-in macOS/iOS screen reader

**Articles & Guides**:
- [How to Build Accessible Vue.js Applications | Vue Mastery](https://www.vuemastery.com/blog/how-to-build-accessible-vuejs-applications/)
- [Building Accessible UI with Tailwind CSS and ARIA](https://www.bahaj.dev/blog/building-accessible-ui-with-tailwind-css-and-aria)
- [When Your Live Region Isn't Live: Fixing aria-live in Vue](https://dev.to/dkoppenhagen/when-your-live-region-isnt-live-fixing-aria-live-in-angular-react-and-vue-1g0j)
- [Making dynamic UIs accessible with ARIA live regions](https://dev.to/nick_fe_nick/making-dynamic-uis-accessible-with-aria-live-regions-531d)
- [The Accessibility Conversation: Making Tailwind CSS Projects Inclusive](https://fsjs.dev/the-accessibility-conversation-tailwind-css-inclusive/)

---

## 2. Path Traversal Prevention for Server-Side Directory Browser

### Decision

**Recommendation**: Implement defense-in-depth path traversal prevention using path validation, canonicalization, and root directory boundary enforcement.

**Key Strategy**:
1. Decode user input (handle URL encoding)
2. Validate input format (reject null bytes, suspicious patterns)
3. Canonicalize paths using `path.resolve()`
4. Verify resolved path starts with configured library root
5. Implement file/directory whitelisting where applicable
6. Never trust user input - always validate server-side

**Justification**:
- Path traversal attacks (using `../`, absolute paths, URL encoding) are a critical security vulnerability
- `path.normalize()` alone is insufficient - it removes redundancy but doesn't prevent traversal
- Multiple validation layers provide defense-in-depth against bypass techniques
- Recent CVEs (CVE-2025-27210) show evolving attack vectors (Windows device names)

### Implementation Approach

#### Core Security Pattern

```javascript
const path = require('path')
const fs = require('fs').promises

/**
 * Safely resolve a user-provided path within the library root
 * @param {string} libraryRoot - Configured library root directory (absolute path)
 * @param {string} userPath - User-provided relative path or directory name
 * @returns {string|null} Resolved safe path or null if validation fails
 */
function safeResolvePath(libraryRoot, userPath) {
  // Step 1: Validate library root exists and is absolute
  if (!path.isAbsolute(libraryRoot)) {
    throw new Error('Library root must be an absolute path')
  }
  
  // Step 2: Decode user input to handle URL encoding bypasses
  let decodedPath
  try {
    decodedPath = decodeURIComponent(userPath)
  } catch (e) {
    // Invalid encoding
    return null
  }
  
  // Step 3: Check for null bytes (security bypass technique)
  if (decodedPath.includes('\0')) {
    return null
  }
  
  // Step 4: Validate input doesn't contain suspicious patterns
  // This is defense-in-depth, not the primary protection
  const suspiciousPatterns = [
    /\.\.[\/\\]/,  // Dot-dot-slash sequences
    /^[\/\\]/,     // Absolute path indicators
  ]
  
  if (suspiciousPatterns.some(pattern => pattern.test(decodedPath))) {
    console.warn('Suspicious path pattern detected:', decodedPath)
  }
  
  // Step 5: Resolve to absolute path
  const resolvedPath = path.resolve(libraryRoot, decodedPath)
  
  // Step 6: CRITICAL - Verify path is within library root
  // This is the primary security control
  if (!resolvedPath.startsWith(libraryRoot + path.sep) && 
      resolvedPath !== libraryRoot) {
    return null
  }
  
  return resolvedPath
}

/**
 * Express.js route handler for directory browsing
 */
async function browseDirectory(req, res) {
  const libraryRoot = process.env.LIBRARY_ROOT || '/var/music'
  const requestedPath = req.query.path || ''
  
  // Validate and resolve path
  const safePath = safeResolvePath(libraryRoot, requestedPath)
  
  if (!safePath) {
    return res.status(403).json({ 
      error: 'Invalid path: access outside library root is forbidden' 
    })
  }
  
  try {
    // Verify path exists and is a directory
    const stats = await fs.stat(safePath)
    
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' })
    }
    
    // Read directory contents
    const entries = await fs.readdir(safePath, { withFileTypes: true })
    
    // Filter to only directories, map to safe response
    const directories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: entry.name,
        // Return relative path from library root for client
        path: path.relative(libraryRoot, path.join(safePath, entry.name))
      }))
    
    return res.json({ 
      currentPath: path.relative(libraryRoot, safePath),
      directories 
    })
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Directory not found' })
    }
    if (error.code === 'EACCES') {
      return res.status(403).json({ error: 'Permission denied' })
    }
    
    console.error('Directory browse error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
```

#### Advanced Validation Techniques

**Whitelisting for Known Patterns**:
```javascript
/**
 * Validate artist folder selection with additional whitelisting
 */
function validateArtistFolder(folderName) {
  // Allow only alphanumeric, spaces, hyphens, underscores, and common punctuation
  const allowedChars = /^[a-zA-Z0-9\s\-_.,&'()]+$/
  
  if (!allowedChars.test(folderName)) {
    return false
  }
  
  // Check length constraints
  if (folderName.length > 255) {
    return false
  }
  
  return true
}
```

**Handling Windows Device Names (CVE-2025-27210)**:
```javascript
/**
 * Check for Windows reserved device names
 * These can bypass path validation on Windows systems
 */
function containsWindowsDeviceName(pathStr) {
  const deviceNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ]
  
  const parts = pathStr.split(path.sep)
  return parts.some(part => {
    const baseName = part.split('.')[0].toUpperCase()
    return deviceNames.includes(baseName)
  })
}

// Add to safeResolvePath validation
if (process.platform === 'win32' && containsWindowsDeviceName(decodedPath)) {
  return null
}
```

#### Express.js API Design

```javascript
const express = require('express')
const router = express.Router()

/**
 * GET /api/browse?path=relative/path
 * Returns directory tree structure for client navigation
 */
router.get('/api/browse', async (req, res) => {
  return browseDirectory(req, res)
})

/**
 * POST /api/settings/library-path
 * Validate and save library root configuration
 */
router.post('/api/settings/library-path', async (req, res) => {
  const { libraryPath } = req.body
  
  // Validate input exists
  if (!libraryPath || typeof libraryPath !== 'string') {
    return res.status(400).json({ error: 'Library path is required' })
  }
  
  // Must be absolute path
  if (!path.isAbsolute(libraryPath)) {
    return res.status(400).json({ 
      error: 'Library path must be an absolute path' 
    })
  }
  
  try {
    // Verify path exists
    const stats = await fs.stat(libraryPath)
    
    if (!stats.isDirectory()) {
      return res.status(400).json({ 
        error: 'Library path must be a directory' 
      })
    }
    
    // Verify read permissions
    await fs.access(libraryPath, fs.constants.R_OK)
    
    // Save to configuration (implementation depends on storage mechanism)
    await saveLibraryPath(libraryPath)
    
    return res.json({ 
      success: true, 
      libraryPath 
    })
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ 
        error: 'Library path does not exist' 
      })
    }
    if (error.code === 'EACCES') {
      return res.status(403).json({ 
        error: 'Permission denied: cannot read library path' 
      })
    }
    
    console.error('Library path validation error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
```

#### Testing Path Traversal Prevention

```javascript
/**
 * Unit tests for path security
 */
const assert = require('assert')

describe('Path Traversal Prevention', () => {
  const libraryRoot = '/var/music'
  
  it('should allow valid relative paths', () => {
    const result = safeResolvePath(libraryRoot, 'artist/album')
    assert.strictEqual(result, '/var/music/artist/album')
  })
  
  it('should reject dot-dot traversal', () => {
    const result = safeResolvePath(libraryRoot, '../etc/passwd')
    assert.strictEqual(result, null)
  })
  
  it('should reject absolute paths', () => {
    const result = safeResolvePath(libraryRoot, '/etc/passwd')
    assert.strictEqual(result, null)
  })
  
  it('should handle URL encoded traversal', () => {
    const result = safeResolvePath(libraryRoot, '..%2F..%2Fetc%2Fpasswd')
    assert.strictEqual(result, null)
  })
  
  it('should reject null byte injection', () => {
    const result = safeResolvePath(libraryRoot, 'valid\0../etc/passwd')
    assert.strictEqual(result, null)
  })
  
  it('should allow library root itself', () => {
    const result = safeResolvePath(libraryRoot, '')
    assert.strictEqual(result, libraryRoot)
  })
  
  it('should reject paths that resolve outside root', () => {
    const result = safeResolvePath(libraryRoot, 'artist/../../..')
    assert.strictEqual(result, null)
  })
})
```

### Alternatives Considered

**Option 1: Use path.normalize() only**
- **Pros**: Simple, built-in Node.js function
- **Cons**: Insufficient - doesn't prevent traversal attacks, only removes redundancy
- **Why not chosen**: Security researchers have demonstrated bypasses; not a security control

**Option 2: Regex-based input sanitization**
- **Pros**: Can block obvious patterns like `../`
- **Cons**: Easily bypassed with URL encoding, Unicode normalization, mixed separators
- **Why not chosen**: Blacklist approach is fundamentally flawed; attackers find creative bypasses

**Option 3: Chroot jail / containerization only**
- **Pros**: OS-level isolation provides strong security boundary
- **Cons**: Doesn't eliminate need for application-level validation, complex deployment
- **Why not chosen**: Defense-in-depth requires both application and system-level controls

**Option 4: Third-party library (e.g., path-is-inside)**
- **Pros**: Well-tested implementation
- **Cons**: Additional dependency, may not be maintained
- **Why not chosen**: Implementation with path.resolve() is simple enough and well-understood

### Resources

**Security Research & Guides**:
- [Node.js Secure Coding: Prevention and Exploitation of Path Traversal Vulnerabilities](https://www.nodejs-security.com/book/path-traversal)
- [Secure Coding Practices in Node.js Against Path Traversal Vulnerabilities](https://www.nodejs-security.com/blog/secure-coding-practices-nodejs-path-traversal-vulnerabilities)
- [Node.js Path Traversal Guide: Examples and Prevention | StackHawk](https://www.stackhawk.com/blog/node-js-path-traversal-guide-examples-and-prevention/)
- [Path Traversal and Remediation in JavaScript | Medium](https://medium.com/h7w/path-traversal-and-remediation-in-javascript-fbe8f4f95c26)

**Stack Overflow Discussions**:
- [How to prevent directory traversal when joining paths in node.js? | InfoSec Stack Exchange](https://security.stackexchange.com/questions/123720/how-to-prevent-directory-traversal-when-joining-paths-in-node-js)
- [Does nodejs prevent directory/path traversal by default?](https://stackoverflow.com/questions/65860214/does-nodejs-prevent-directory-path-traversal-by-default)

**CVEs & Vulnerabilities**:
- [CVE-2025-27210: Node.js Path Traversal on Windows | ZeroPath](https://zeropath.com/blog/cve-2025-27210-nodejs-path-traversal-windows)

**Node.js Documentation**:
- [Path Module | Node.js Documentation](https://nodejs.org/api/path.html)

**Express.js Security**:
- [Potential Directory Traversal in an Express JS App | Medium](https://koumudi-garikipati.medium.com/directory-traversal-in-express-js-55a8e852fb41)

---

## 3. E2E Testing Strategy for Vue 3 Applications

### Decision

**Recommendation**: Use **Playwright** as the primary E2E testing framework with a tiered testing strategy based on priority levels (P1, P2) and CI/CD pipeline stages.

**Key Strategy**:
1. **Tool Selection**: Playwright for E2E tests, Vitest for unit/component tests
2. **Test Organization**: Priority-based organization (P1 critical journeys, P2 important features)
3. **CI/CD Integration**: Three-tier approach (PR smoke tests, merge regression suite, nightly full suite)
4. **Docker Strategy**: Use official Playwright Docker images for consistency across environments

**Justification**:
- Playwright outperforms Cypress in benchmarks (4.5s vs 9.4s average)
- Cross-browser support (Chrome, Firefox, Safari/WebKit) vs Cypress (no Safari)
- Playwright is open source with no commercial cloud dependency
- Active maintenance by Microsoft with modern architecture
- Better parallelization and Docker support out of the box

### Implementation Approach

#### Framework Selection: Playwright

**Installation**:
```bash
npm install -D @playwright/test
npx playwright install --with-deps
```

**Configuration** (`playwright.config.ts`):
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  
  // Test timeout
  timeout: 30000,
  
  // Expect timeout
  expect: {
    timeout: 5000
  },
  
  // Fail fast in CI
  fullyParallel: true,
  
  // Retry on CI, no retry locally
  retries: process.env.CI ? 2 : 0,
  
  // Parallel workers
  workers: process.env.CI ? 2 : undefined,
  
  // Reporter
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:5173',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on first retry
    video: 'retain-on-failure',
    
    // Trace on first retry
    trace: 'on-first-retry',
  },
  
  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  
  // Run dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

#### Test Organization by Priority

**Directory Structure**:
```
e2e/
├── critical/              # P1 - Critical user journeys
│   ├── artist-import.spec.ts
│   ├── library-scan.spec.ts
│   └── collection-view.spec.ts
├── important/             # P2 - Important features
│   ├── album-detail.spec.ts
│   ├── manual-overrides.spec.ts
│   └── rescan.spec.ts
├── fixtures/              # Test data and page objects
│   ├── test-data.ts
│   └── pages/
│       ├── CollectionPage.ts
│       ├── ArtistDetailPage.ts
│       └── SettingsPage.ts
└── utils/                 # Test utilities
    └── setup.ts
```

**P1 Critical Journey Example** (`e2e/critical/artist-import.spec.ts`):
```typescript
import { test, expect } from '@playwright/test'
import { CollectionPage } from '../fixtures/pages/CollectionPage'

test.describe('P1: Artist Import Journey', () => {
  test('should search, import artist, and view discography', async ({ page }) => {
    const collection = new CollectionPage(page)
    
    // Navigate to app
    await page.goto('/')
    
    // Search for artist
    await page.getByRole('searchbox', { name: 'Search for artist' }).fill('Radiohead')
    await page.getByRole('button', { name: 'Search' }).click()
    
    // Wait for results
    await expect(page.getByRole('heading', { name: 'Search Results' })).toBeVisible()
    
    // Select first result
    await page.getByRole('button', { name: /Import.*Radiohead/ }).first().click()
    
    // Verify navigation to artist detail
    await expect(page).toHaveURL(/\/artist\//)
    await expect(page.getByRole('heading', { name: 'Radiohead' })).toBeVisible()
    
    // Verify albums are displayed
    const albumGrid = page.getByRole('region', { name: 'Album collection' })
    await expect(albumGrid.getByRole('article')).toHaveCount.greaterThan(5)
    
    // Verify album has correct metadata
    const firstAlbum = albumGrid.getByRole('article').first()
    await expect(firstAlbum).toContainText(/\d{4}/) // Has year
    await expect(firstAlbum.getByRole('status')).toBeVisible() // Has ownership status
  })
  
  test('should prevent duplicate artist imports', async ({ page }) => {
    // Import artist first time
    await page.goto('/')
    await page.getByRole('searchbox', { name: 'Search for artist' }).fill('Radiohead')
    await page.getByRole('button', { name: 'Search' }).click()
    await page.getByRole('button', { name: /Import.*Radiohead/ }).first().click()
    
    // Navigate back and import again
    await page.goto('/')
    await page.getByRole('searchbox', { name: 'Search for artist' }).fill('Radiohead')
    await page.getByRole('button', { name: 'Search' }).click()
    
    // Should show "already imported" state
    await expect(page.getByText(/already in collection/i)).toBeVisible()
  })
})
```

**P2 Important Feature Example** (`e2e/important/library-scan.spec.ts`):
```typescript
import { test, expect } from '@playwright/test'

test.describe('P2: Library Path Configuration and Scanning', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Import an artist first
    await page.goto('/')
    await page.getByRole('searchbox', { name: 'Search for artist' }).fill('Radiohead')
    await page.getByRole('button', { name: 'Search' }).click()
    await page.getByRole('button', { name: /Import.*Radiohead/ }).first().click()
  })
  
  test('should configure library path and trigger scan', async ({ page }) => {
    // Navigate to settings
    await page.getByRole('link', { name: 'Settings' }).click()
    
    // Set library path
    const pathInput = page.getByRole('textbox', { name: 'Library root path' })
    await pathInput.fill('/test-fixtures/music-library')
    await page.getByRole('button', { name: 'Save' }).click()
    
    // Verify success
    await expect(page.getByText(/Library path saved/i)).toBeVisible()
    
    // Navigate to artist detail
    await page.goto('/artist/radiohead')
    
    // Trigger scan
    await page.getByRole('button', { name: 'Scan Library' }).click()
    
    // Verify loading state with screen reader announcement
    await expect(page.getByRole('status')).toContainText(/scanning/i)
    
    // Verify scan completion
    await expect(page.getByText(/Scan complete/i)).toBeVisible({ timeout: 10000 })
    
    // Verify ownership status updated
    const ownedAlbums = page.getByRole('article', { name: /owned/i })
    await expect(ownedAlbums).toHaveCount.greaterThan(0)
  })
  
  test('should show validation error for invalid library path', async ({ page }) => {
    await page.getByRole('link', { name: 'Settings' }).click()
    
    const pathInput = page.getByRole('textbox', { name: 'Library root path' })
    await pathInput.fill('/nonexistent/path')
    await page.getByRole('button', { name: 'Save' }).click()
    
    // Verify error message
    await expect(page.getByRole('alert')).toContainText(/does not exist/i)
  })
})
```

**Page Object Model** (`e2e/fixtures/pages/CollectionPage.ts`):
```typescript
import { Page, Locator } from '@playwright/test'

export class CollectionPage {
  readonly page: Page
  readonly searchInput: Locator
  readonly searchButton: Locator
  readonly artistCards: Locator
  
  constructor(page: Page) {
    this.page = page
    this.searchInput = page.getByRole('searchbox', { name: 'Search for artist' })
    this.searchButton = page.getByRole('button', { name: 'Search' })
    this.artistCards = page.getByRole('article', { name: /artist/i })
  }
  
  async goto() {
    await this.page.goto('/')
  }
  
  async searchArtist(name: string) {
    await this.searchInput.fill(name)
    await this.searchButton.click()
  }
  
  async importArtist(index: number = 0) {
    await this.page.getByRole('button', { name: /import/i }).nth(index).click()
  }
  
  async getArtistCount() {
    return this.artistCards.count()
  }
}
```

#### CI/CD Integration Strategy

**Three-Tier Testing Approach**:

**Tier 1: Pull Request Smoke Tests** (Fast feedback ~5 minutes)
```yaml
# .github/workflows/pr-tests.yml
name: PR Tests

on: pull_request

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linters
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run P1 E2E tests (Chromium only)
        run: npx playwright test e2e/critical --project=chromium
      
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

**Tier 2: Merge to Main - Regression Suite** (~30 minutes)
```yaml
# .github/workflows/merge-tests.yml
name: Regression Tests

on:
  push:
    branches: [main]

jobs:
  regression:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}
      
      - name: Run all E2E tests
        run: npx playwright test --project=${{ matrix.browser }}
      
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-${{ matrix.browser }}-report
          path: playwright-report/
```

**Tier 3: Nightly Full Suite** (Complete validation)
```yaml
# .github/workflows/nightly.yml
name: Nightly Full Suite

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily

jobs:
  full-suite:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run all E2E tests
        run: npx playwright test --project=${{ matrix.browser }}
      
      - name: Run visual regression tests
        run: npx playwright test --update-snapshots
      
      - name: Run performance tests
        run: npm run test:performance
      
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: nightly-${{ matrix.browser }}-report
          path: |
            playwright-report/
            test-results/
```

#### Docker Testing Strategy

**Official Playwright Docker Image**:
```dockerfile
# Dockerfile.e2e
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Run tests
CMD ["npx", "playwright", "test"]
```

**Docker Compose for Full Stack Testing**:
```yaml
# docker-compose.test.yml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - NODE_ENV=test
      - LIBRARY_ROOT=/test-fixtures/music-library
    volumes:
      - ./test-fixtures/music-library:/test-fixtures/music-library:ro
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 5s
      timeout: 3s
      retries: 5

  frontend:
    build: ./frontend
    environment:
      - VITE_API_URL=http://backend:3000
    ports:
      - "5173:5173"
    depends_on:
      backend:
        condition: service_healthy

  e2e:
    build:
      context: .
      dockerfile: Dockerfile.e2e
    depends_on:
      - frontend
    environment:
      - PLAYWRIGHT_BASE_URL=http://frontend:5173
    volumes:
      - ./e2e:/app/e2e
      - ./playwright-report:/app/playwright-report
      - ./test-results:/app/test-results
    command: npx playwright test
```

**Running Docker Tests**:
```bash
# Build and run all services with tests
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

# Run specific test suite
docker-compose -f docker-compose.test.yml run e2e npx playwright test e2e/critical

# Run with UI mode (requires X11 forwarding)
docker-compose -f docker-compose.test.yml run -e DISPLAY=$DISPLAY e2e npx playwright test --ui
```

**Docker CI Integration**:
```yaml
# .github/workflows/docker-tests.yml
name: Docker E2E Tests

on: [push, pull_request]

jobs:
  docker-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build and run tests in Docker
        run: docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
      
      - name: Copy test results from container
        if: always()
        run: |
          docker-compose -f docker-compose.test.yml cp e2e:/app/playwright-report ./playwright-report
          docker-compose -f docker-compose.test.yml cp e2e:/app/test-results ./test-results
      
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: docker-e2e-report
          path: |
            playwright-report/
            test-results/
```

#### Test Data Management

**Test Fixtures Structure**:
```
test-fixtures/
├── music-library/           # Mock filesystem for testing
│   ├── = R =/
│   │   └── Radiohead/
│   │       ├── [1997] OK Computer/
│   │       ├── [2000] Kid A/
│   │       └── [2003] Hail to the Thief/
│   └── = T =/
│       └── The National/
│           └── [2010] High Violet/
└── api-responses/           # Mock MusicBrainz responses
    ├── radiohead-search.json
    └── radiohead-releases.json
```

**Mock API Responses**:
```typescript
// e2e/fixtures/mock-api.ts
import { Page } from '@playwright/test'

export async function mockMusicBrainzAPI(page: Page) {
  await page.route('**/musicbrainz.org/ws/2/**', async (route) => {
    const url = route.request().url()
    
    if (url.includes('artist?query=radiohead')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(require('./api-responses/radiohead-search.json'))
      })
    } else if (url.includes('release-group')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(require('./api-responses/radiohead-releases.json'))
      })
    } else {
      await route.continue()
    }
  })
}
```

### Alternatives Considered

**Option 1: Cypress**
- **Pros**: Excellent developer experience, time-travel debugging, component testing maturity, large community
- **Cons**: No Safari/WebKit support (experimental only), slower than Playwright, requires Cypress Cloud for parallelization
- **Why not chosen**: Lack of Safari support is critical gap; Playwright's performance and open-source parallelization are better fit

**Option 2: Vitest Browser Mode**
- **Pros**: Unified testing tool (unit + E2E), fast, excellent Vite integration
- **Cons**: Browser mode is relatively new, less mature for complex E2E scenarios, smaller ecosystem
- **Why not chosen**: Still emerging; Playwright has more mature E2E features and better cross-browser support

**Option 3: Nightwatch.js**
- **Pros**: Established E2E framework, good documentation
- **Cons**: Older architecture, slower than modern tools, smaller community
- **Why not chosen**: Playwright and Cypress have surpassed it in features and performance

**Option 4: TestCafe**
- **Pros**: No WebDriver needed, cross-browser support
- **Cons**: Smaller ecosystem, slower development pace
- **Why not chosen**: Playwright has better performance, more active development, and stronger community

### Resources

**Official Documentation**:
- [Playwright Documentation](https://playwright.dev/)
- [Vue.js Testing Guide](https://vuejs.org/guide/scaling-up/testing.html)
- [Vitest Comparisons with Other Test Runners](https://vitest.dev/guide/comparisons)

**Framework Comparisons**:
- [Playwright vs. Cypress: The Ultimate 2025 E2E Testing Showdown | Frugal Testing](https://www.frugaltesting.com/blog/playwright-vs-cypress-the-ultimate-2025-e2e-testing-showdown)
- [Comparison of End-to-End Testing Frameworks for Vue.js: Cypress vs Nightwatch vs Playwright](https://www.madalin.me/programming/2025/060/comparison-end-to-end-test-cypress-nightwatch-playwright-vue.html)
- [Cypress vs Playwright in 2025 | BugBug](https://bugbug.io/blog/test-automation-tools/cypress-vs-playwright/)

**CI/CD Integration**:
- [Ultimate Guide to E2E Testing in CI/CD | Ranger](https://www.ranger.net/post/ultimate-guide-to-e2e-testing-in-ci-cd)
- [Developing a Powerful Test Automation Strategy - Frameworks, CI/CD & E2E Tests](https://dev.to/idavidov13/developing-a-powerful-test-automation-strategy-frameworks-cicd-e2e-tests-1916)

**Docker Testing**:
- [Docker + Cypress in 2025: How I've Perfected My E2E Testing Setup](https://dev.to/cypress/docker-cypress-in-2025-how-ive-perfected-my-e2e-testing-setup-4f7j)
- [End-to-End Testing with Playwright and Docker | BrowserStack](https://www.browserstack.com/guide/playwright-docker)
- [Dockerizing Playwright/E2E Tests | Medium](https://medium.com/geekculture/dockerizing-playwright-e2e-tests-c041fede3186)

**Best Practices**:
- [Testing Vue.js with Playwright: A Journey to Flawless Web Apps](https://dev.to/uncle_ben/testing-vuejs-with-playwright-a-funny-journey-to-flawless-web-apps-3h3g)
- [Building a Comprehensive E2E Test Suite with Playwright: Lessons from 100+ Test Cases](https://dev.to/bugslayer/building-a-comprehensive-e2e-test-suite-with-playwright-lessons-from-100-test-cases-171k)
- [End-To-End Testing: 2025 Guide for E2E Testing | LEAPWORK](https://www.leapwork.com/blog/end-to-end-testing)

---

## Summary & Next Steps

### Key Decisions Made

1. **Accessibility**: WCAG 2.1 Level AA compliance using semantic HTML + Tailwind utilities + vue-a11y/announcer + vue-keyboard-trap
2. **Security**: Defense-in-depth path traversal prevention with path.resolve() validation and root boundary enforcement
3. **E2E Testing**: Playwright with tiered testing strategy (P1 smoke on PR, P2 regression on merge, full suite nightly)

### Implementation Priorities

**Phase 1 - Foundation** (Aligned with User Stories 1-2):
- Set up Playwright with basic P1 tests for artist import
- Implement path security validation in directory browser API
- Add basic ARIA labels and semantic HTML structure

**Phase 2 - Accessibility** (Aligned with User Stories 3-4):
- Integrate @vue-a11y/announcer for loading states and dynamic updates
- Implement keyboard navigation with vue-keyboard-trap for directory browser
- Add comprehensive ARIA live regions for album grid updates

**Phase 3 - Testing Maturity** (Aligned with User Stories 5-6):
- Expand E2E coverage to P2 important features
- Set up Docker testing environment
- Implement CI/CD three-tier testing pipeline

### Constitution Alignment

This research satisfies constitutional principles:

- **Security (Principle V)**: Path traversal prevention with multiple validation layers
- **Testing Standards (Principle II)**: Comprehensive E2E strategy with test-first approach
- **User Experience Consistency (Principle III)**: WCAG 2.1 AA accessibility ensures consistent, predictable UX
- **Code Quality (Principle I)**: Well-documented patterns and best practices from industry leaders
- **Maintainability (Principle IV)**: Clear separation of concerns, minimal dependencies, documented architecture

### Open Questions

1. Should we support visual regression testing? (Playwright has built-in screenshot comparison)
2. Do we need accessibility audit tooling in CI/CD? (e.g., axe-core integration)
3. Should we implement rate limiting for MusicBrainz API calls to prevent abuse?
4. What level of accessibility testing should be automated vs manual?

---

**Research Completed By**: Claude (Album Tracker Agent)  
**Review Status**: Ready for technical review and implementation planning
