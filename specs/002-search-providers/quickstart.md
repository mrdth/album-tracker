# Quickstart Guide: Search Providers

**Feature**: 002-search-providers  
**Audience**: Developers implementing or testing the search provider feature  
**Last Updated**: 2025-11-30

## Table of Contents

1. [Overview](#overview)
2. [API Examples](#api-examples)
3. [Frontend Integration](#frontend-integration)
4. [Testing Locally](#testing-locally)
5. [Common Issues](#common-issues)

---

## Overview

The search providers feature allows users to configure custom search destinations (like Discogs, MusicBrainz, or personal stores) for missing albums. This guide shows you how to:

- Use the REST API to manage search providers
- Integrate the search dropdown into AlbumCard
- Test URL template replacement
- Troubleshoot common issues

---

## API Examples

### 1. List All Search Providers

```bash
curl http://localhost:3000/api/settings/search-providers
```

**Response** (200 OK):
```json
{
  "providers": [
    {
      "id": 1701360000000,
      "name": "Discogs",
      "urlTemplate": "https://www.discogs.com/search/?q={artist}+{album}&type=release",
      "createdAt": "2025-11-30T10:00:00.000Z",
      "updatedAt": "2025-11-30T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Create a New Search Provider

```bash
curl -X POST http://localhost:3000/api/settings/search-providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Discogs",
    "urlTemplate": "https://www.discogs.com/search/?q={artist}+{album}&type=release"
  }'
```

**Response** (201 Created):
```json
{
  "id": 1701360000000,
  "name": "Discogs",
  "urlTemplate": "https://www.discogs.com/search/?q={artist}+{album}&type=release",
  "createdAt": "2025-11-30T10:00:00.000Z",
  "updatedAt": "2025-11-30T10:00:00.000Z"
}
```

**Common Templates**:

```bash
# MusicBrainz
curl -X POST http://localhost:3000/api/settings/search-providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MusicBrainz",
    "urlTemplate": "https://musicbrainz.org/search?query={artist}+{album}&type=release"
  }'

# Bandcamp
curl -X POST http://localhost:3000/api/settings/search-providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bandcamp",
    "urlTemplate": "https://bandcamp.com/search?q={artist}+{album}"
  }'

# AllMusic
curl -X POST http://localhost:3000/api/settings/search-providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AllMusic",
    "urlTemplate": "https://www.allmusic.com/search/all/{artist}%20{album}"
  }'
```

---

### 3. Update a Search Provider

```bash
curl -X PUT http://localhost:3000/api/settings/search-providers/1701360000000 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Discogs (Official)"
  }'
```

**Response** (200 OK):
```json
{
  "id": 1701360000000,
  "name": "Discogs (Official)",
  "urlTemplate": "https://www.discogs.com/search/?q={artist}+{album}&type=release",
  "createdAt": "2025-11-30T10:00:00.000Z",
  "updatedAt": "2025-11-30T10:15:00.000Z"
}
```

---

### 4. Delete a Search Provider

```bash
curl -X DELETE http://localhost:3000/api/settings/search-providers/1701360000000
```

**Response** (204 No Content)

---

## Frontend Integration

### 1. Fetch Search Providers (Composable)

```typescript
// frontend/src/composables/useSearchProviders.ts
import { ref, onMounted } from 'vue'
import type { SearchProvider } from '../../../shared/types/index.js'
import { searchProviderService } from '../services/searchProviderService.js'

export function useSearchProviders() {
  const providers = ref<SearchProvider[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProviders() {
    loading.value = true
    error.value = null
    try {
      providers.value = await searchProviderService.list()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load providers'
    } finally {
      loading.value = false
    }
  }

  async function createProvider(name: string, urlTemplate: string) {
    const provider = await searchProviderService.create(name, urlTemplate)
    providers.value.push(provider)
    return provider
  }

  async function deleteProvider(id: number) {
    await searchProviderService.delete(id)
    providers.value = providers.value.filter(p => p.id !== id)
  }

  onMounted(() => {
    fetchProviders()
  })

  return {
    providers,
    loading,
    error,
    fetchProviders,
    createProvider,
    deleteProvider
  }
}
```

---

### 2. Add Search Dropdown to AlbumCard

```vue
<!-- frontend/src/components/artist/AlbumCard.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import type { Album } from '../../../../shared/types/index.js'
import { useSearchProviders } from '../../composables/useSearchProviders.js'

interface Props {
  album: Album
}

const props = defineProps<Props>()
const { providers } = useSearchProviders()
const isDropdownOpen = ref(false)

function buildSearchUrl(urlTemplate: string): string {
  const artistName = props.album.artist?.name || ''
  const albumTitle = props.album.title || ''
  
  return urlTemplate
    .replace(/{artist}/g, encodeURIComponent(artistName))
    .replace(/{album}/g, encodeURIComponent(albumTitle))
}

function openSearch(urlTemplate: string) {
  const url = buildSearchUrl(urlTemplate)
  window.open(url, '_blank', 'noopener,noreferrer')
  isDropdownOpen.value = false
}
</script>

<template>
  <!-- Existing album card content -->
  
  <!-- Search dropdown (only for missing albums with configured providers) -->
  <div 
    v-if="album.ownership_status === 'Missing' && providers.length > 0"
    class="relative mt-3"
  >
    <button
      @click="isDropdownOpen = !isDropdownOpen"
      class="btn-secondary text-sm w-full"
      :aria-expanded="isDropdownOpen"
      aria-haspopup="true"
    >
      Search for Album
      <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    
    <ul
      v-if="isDropdownOpen"
      class="absolute right-0 mt-2 w-full bg-white rounded-md shadow-lg max-h-60 overflow-auto z-10 border border-gray-200"
      role="menu"
    >
      <li v-for="provider in providers" :key="provider.id" role="none">
        <button
          @click="openSearch(provider.urlTemplate)"
          class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
          role="menuitem"
        >
          {{ provider.name }}
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </li>
    </ul>
  </div>
</template>
```

---

### 3. Settings Page Integration

```vue
<!-- frontend/src/components/settings/SearchProvidersList.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useSearchProviders } from '../../composables/useSearchProviders.js'

const { providers, createProvider, deleteProvider, loading } = useSearchProviders()

const newName = ref('')
const newTemplate = ref('')
const validationError = ref('')

async function handleCreate() {
  validationError.value = ''
  
  if (!newName.value.trim()) {
    validationError.value = 'Provider name is required'
    return
  }
  
  if (!newTemplate.value.trim()) {
    validationError.value = 'URL template is required'
    return
  }
  
  if (!newTemplate.value.match(/^https?:\/\//)) {
    validationError.value = 'URL template must start with http:// or https://'
    return
  }
  
  try {
    await createProvider(newName.value, newTemplate.value)
    newName.value = ''
    newTemplate.value = ''
  } catch (e) {
    validationError.value = e instanceof Error ? e.message : 'Failed to create provider'
  }
}

async function handleDelete(id: number) {
  if (confirm('Delete this search provider?')) {
    await deleteProvider(id)
  }
}
</script>

<template>
  <div class="card">
    <h3 class="text-lg font-semibold mb-4">Search Providers</h3>
    
    <!-- Provider List -->
    <div v-if="providers.length > 0" class="space-y-2 mb-4">
      <div 
        v-for="provider in providers" 
        :key="provider.id"
        class="flex items-center justify-between p-3 bg-gray-50 rounded-md"
      >
        <div class="flex-1">
          <div class="font-medium">{{ provider.name }}</div>
          <div class="text-sm text-gray-500 truncate">{{ provider.urlTemplate }}</div>
        </div>
        <button 
          @click="handleDelete(provider.id)"
          class="btn-danger text-sm ml-3"
        >
          Delete
        </button>
      </div>
    </div>
    
    <div v-else class="text-gray-500 mb-4">
      No search providers configured. Add one below.
    </div>
    
    <!-- Add Provider Form -->
    <div class="border-t pt-4">
      <h4 class="font-medium mb-3">Add Search Provider</h4>
      
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-1">Provider Name</label>
          <input 
            v-model="newName"
            type="text"
            placeholder="Discogs"
            class="input w-full"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">URL Template</label>
          <input 
            v-model="newTemplate"
            type="text"
            placeholder="https://www.discogs.com/search/?q={artist}+{album}"
            class="input w-full"
          />
          <p class="text-xs text-gray-500 mt-1">
            Use {artist} and {album} as placeholders
          </p>
        </div>
        
        <div v-if="validationError" class="text-red-600 text-sm">
          {{ validationError }}
        </div>
        
        <button 
          @click="handleCreate"
          :disabled="loading"
          class="btn-primary"
        >
          Add Provider
        </button>
      </div>
    </div>
  </div>
</template>
```

---

## Testing Locally

### 1. Test URL Template Replacement

```typescript
// Quick test in browser console or unit test
function testUrlReplacement() {
  const template = "https://www.discogs.com/search/?q={artist}+{album}"
  const artist = "Pink Floyd"
  const album = "The Wall"
  
  const url = template
    .replace(/{artist}/g, encodeURIComponent(artist))
    .replace(/{album}/g, encodeURIComponent(album))
  
  console.log(url)
  // Expected: https://www.discogs.com/search/?q=Pink%20Floyd+The%20Wall
}

testUrlReplacement()
```

### 2. Test Special Characters

```typescript
function testSpecialCharacters() {
  const template = "https://example.com/search?q={artist}+{album}"
  
  // Test accents
  console.log(
    template
      .replace(/{artist}/g, encodeURIComponent("Beyoncé"))
      .replace(/{album}/g, encodeURIComponent("Lemonade"))
  )
  // Expected: https://example.com/search?q=Beyonc%C3%A9+Lemonade
  
  // Test slashes
  console.log(
    template
      .replace(/{artist}/g, encodeURIComponent("AC/DC"))
      .replace(/{album}/g, encodeURIComponent("Back in Black"))
  )
  // Expected: https://example.com/search?q=AC%2FDC+Back%20in%20Black
}

testSpecialCharacters()
```

### 3. Manual Testing Checklist

- [ ] Create a search provider via settings page
- [ ] Verify it appears in the provider list
- [ ] View a missing album card
- [ ] Verify search dropdown appears
- [ ] Click a provider and verify new tab opens
- [ ] Check URL is correctly formatted with artist/album values
- [ ] Test with special characters (é, /, &)
- [ ] Edit a provider and verify changes save
- [ ] Delete a provider and verify it's removed
- [ ] Verify dropdown does NOT appear for owned albums
- [ ] Verify dropdown does NOT appear when no providers configured

---

## Common Issues

### Issue: Dropdown doesn't appear on missing album cards

**Symptoms**: Search button/dropdown not visible on AlbumCard for missing albums

**Checklist**:
1. Verify album `ownership_status === 'Missing'`
2. Verify at least one search provider is configured (check API: `GET /api/settings/search-providers`)
3. Check Vue component has `useSearchProviders()` composable
4. Check browser console for errors

**Fix**:
```vue
<!-- Ensure condition is correct -->
<div v-if="album.ownership_status === 'Missing' && providers.length > 0">
```

---

### Issue: URL encoding not working correctly

**Symptoms**: Special characters appear garbled in search URLs

**Checklist**:
1. Verify using `encodeURIComponent()` not `encodeURI()`
2. Check artist/album values are not already encoded
3. Test with browser DevTools to inspect actual URL

**Fix**:
```typescript
// WRONG - double encoding
const url = encodeURIComponent(template.replace(/{artist}/g, artist))

// CORRECT - encode values, not template
const url = template.replace(/{artist}/g, encodeURIComponent(artist))
```

---

### Issue: "Provider name is required" when name is filled

**Symptoms**: Validation error despite entering a name

**Checklist**:
1. Check for leading/trailing whitespace
2. Verify field is bound correctly with `v-model`
3. Check validation logic trims values

**Fix**:
```typescript
// Add trim to validation
if (!name.trim()) {
  return { valid: false, error: 'Provider name is required' }
}
```

---

### Issue: Database error "json_valid" not recognized

**Symptoms**: Error adding search_providers column with JSON validation constraint

**Checklist**:
1. Check SQLite version (need 3.38.0+ for JSON1)
2. Verify better-sqlite3 is up to date

**Fix**:
```sql
-- Option 1: Remove JSON constraint if JSON1 not available
ALTER TABLE Settings ADD COLUMN search_providers TEXT NOT NULL DEFAULT '[]';

-- Option 2: Add application-layer validation instead
-- (Handled in SettingsRepository.ts)
```

---

### Issue: Clicking provider doesn't open new tab

**Symptoms**: Nothing happens when selecting a provider from dropdown

**Checklist**:
1. Check browser console for blocked popups
2. Verify `window.open()` has correct parameters
3. Check URL is valid (not null from validation failure)

**Fix**:
```typescript
function openSearch(urlTemplate: string) {
  const url = buildSearchUrl(urlTemplate)
  
  // Add null check
  if (!url) {
    console.error('Invalid URL generated from template')
    return
  }
  
  // Use correct window.open signature
  window.open(url, '_blank', 'noopener,noreferrer')
}
```

---

## Next Steps

After implementing the basic feature:

1. **Run tests**: `npm test` to verify all contract/integration/unit tests pass
2. **Manual QA**: Go through the manual testing checklist above
3. **E2E tests**: Run `npm run test:e2e` for full user flow validation
4. **Performance check**: Verify dropdown renders <50ms, URL generation <10ms
5. **Accessibility review**: Test keyboard navigation (Tab, Enter, Escape)

For more details, see:
- [API Contract](contracts/search-providers-api.yaml)
- [Data Model](data-model.md)
- [Research Decisions](research.md)
- [Implementation Plan](plan.md)
