# Data Model: Search Providers for Missing Albums

**Feature**: 002-search-providers  
**Date**: 2025-11-30  
**Status**: Complete

## Overview

This document defines the data structures for search provider functionality. The design extends the existing Settings singleton with a JSON array field to store user-configured search providers.

## Entities

### SearchProvider

Represents a user-configured search destination (e.g., Discogs, MusicBrainz, local record store).

**Purpose**: Configuration entity that defines how to construct search URLs for missing albums.

**Fields**:

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| id | number | Yes | Unique identifier | Generated using `Date.now()` (timestamp in ms) |
| name | string | Yes | Display name shown in UI | Min length: 1, Max length: 100, No leading/trailing whitespace |
| urlTemplate | string | Yes | URL pattern with placeholders | Must start with `http://` or `https://`, Max length: 500 |
| createdAt | string | Yes | ISO 8601 timestamp | Auto-generated on creation |
| updatedAt | string | Yes | ISO 8601 timestamp | Auto-updated on modification |

**Validation Rules**:

```typescript
interface SearchProvider {
  id: number
  name: string
  urlTemplate: string
  createdAt: string
  updatedAt: string
}

// Validation
function validateSearchProvider(provider: Partial<SearchProvider>): ValidationResult {
  const errors: string[] = []
  
  // Name validation
  if (!provider.name || provider.name.trim().length === 0) {
    errors.push('Provider name is required')
  }
  if (provider.name && provider.name.length > 100) {
    errors.push('Provider name must be 100 characters or less')
  }
  
  // URL template validation
  if (!provider.urlTemplate || provider.urlTemplate.trim().length === 0) {
    errors.push('URL template is required')
  }
  if (provider.urlTemplate && !provider.urlTemplate.match(/^https?:\/\//)) {
    errors.push('URL template must start with http:// or https://')
  }
  if (provider.urlTemplate && provider.urlTemplate.length > 500) {
    errors.push('URL template must be 500 characters or less')
  }
  
  // Test URL building with dummy data
  if (provider.urlTemplate) {
    try {
      const testUrl = buildSearchUrl(provider.urlTemplate, 'Test Artist', 'Test Album')
      if (!testUrl) {
        errors.push('URL template creates invalid URL')
      }
    } catch (e) {
      errors.push('URL template is invalid')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
```

**Relationships**:
- **Many-to-One with Settings**: Multiple SearchProviders belong to one Settings instance (stored as JSON array)
- **No direct database relationship**: Embedded as JSON, not foreign key

**State Transitions**: None (simple CRUD entity with no lifecycle states)

**Examples**:

```json
{
  "id": 1701360000000,
  "name": "Discogs",
  "urlTemplate": "https://www.discogs.com/search/?q={artist}+{album}&type=release",
  "createdAt": "2025-11-30T10:00:00.000Z",
  "updatedAt": "2025-11-30T10:00:00.000Z"
}

{
  "id": 1701360001000,
  "name": "MusicBrainz",
  "urlTemplate": "https://musicbrainz.org/search?query={artist}+{album}&type=release",
  "createdAt": "2025-11-30T10:00:01.000Z",
  "updatedAt": "2025-11-30T10:00:01.000Z"
}

{
  "id": 1701360002000,
  "name": "Bandcamp",
  "urlTemplate": "https://bandcamp.com/search?q={artist}+{album}",
  "createdAt": "2025-11-30T10:00:02.000Z",
  "updatedAt": "2025-11-30T10:00:02.000Z"
}
```

---

### Settings (Extended)

The existing Settings singleton table is extended with a new field to store search providers.

**New Field**:

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| search_providers | TEXT (JSON) | Yes | Array of SearchProvider objects | Must be valid JSON array, defaults to `'[]'` |

**Schema Migration**:

```sql
-- Migration: Add search_providers column to Settings table
-- Run this migration before deploying the feature

ALTER TABLE Settings ADD COLUMN search_providers TEXT NOT NULL DEFAULT '[]';

-- Add constraint to validate JSON structure
-- Note: SQLite CHECK constraints with json_valid require JSON1 extension (enabled by default in modern SQLite)
-- Better-sqlite3 supports this natively

-- Validation will be enforced at application layer for compatibility
-- If JSON1 available, uncomment:
-- ALTER TABLE Settings ADD CONSTRAINT chk_search_providers_json 
--   CHECK (json_valid(search_providers) AND json_type(search_providers) = 'array');
```

**TypeScript Interface Extension**:

```typescript
// In shared/types/index.ts

export interface SearchProvider {
  id: number
  name: string
  urlTemplate: string
  createdAt: string
  updatedAt: string
}

export interface Settings {
  id: 1 // Singleton
  library_root_path: string
  similarity_threshold: number
  api_rate_limit_ms: number
  max_api_retries: number
  last_scan_at: string | null
  updated_at: string
  search_providers: SearchProvider[] // NEW FIELD
}
```

**Backward Compatibility**:

- **Default Value**: New installations get empty array `[]`
- **Existing Installations**: Migration adds column with default `'[]'` (empty JSON array)
- **API Responses**: Frontend clients ignore unknown fields, so old clients continue working
- **Database Constraint**: JSON validation ensures data integrity (application layer fallback if JSON1 unavailable)

---

## Data Access Patterns

### Read All Providers

```typescript
// SettingsRepository.ts
getSearchProviders(): SearchProvider[] {
  const settings = this.db
    .prepare('SELECT search_providers FROM Settings WHERE id = 1')
    .get() as { search_providers: string }
  
  if (!settings) {
    return []
  }
  
  try {
    const providers = JSON.parse(settings.search_providers)
    return Array.isArray(providers) ? providers : []
  } catch (e) {
    console.error('Failed to parse search_providers JSON:', e)
    return []
  }
}
```

### Create Provider

```typescript
// SettingsRepository.ts
createSearchProvider(name: string, urlTemplate: string): SearchProvider {
  const providers = this.getSearchProviders()
  
  const newProvider: SearchProvider = {
    id: Date.now(), // Timestamp-based ID (unique for single-user, <1 provider/second)
    name: name.trim(),
    urlTemplate: urlTemplate.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  providers.push(newProvider)
  
  this.db
    .prepare('UPDATE Settings SET search_providers = ? WHERE id = 1')
    .run(JSON.stringify(providers))
  
  return newProvider
}
```

### Update Provider

```typescript
// SettingsRepository.ts
updateSearchProvider(id: number, updates: { name?: string, urlTemplate?: string }): SearchProvider | null {
  const providers = this.getSearchProviders()
  const index = providers.findIndex(p => p.id === id)
  
  if (index === -1) {
    return null
  }
  
  const updated: SearchProvider = {
    ...providers[index],
    ...updates,
    name: updates.name?.trim() ?? providers[index].name,
    urlTemplate: updates.urlTemplate?.trim() ?? providers[index].urlTemplate,
    updatedAt: new Date().toISOString()
  }
  
  providers[index] = updated
  
  this.db
    .prepare('UPDATE Settings SET search_providers = ? WHERE id = 1')
    .run(JSON.stringify(providers))
  
  return updated
}
```

### Delete Provider

```typescript
// SettingsRepository.ts
deleteSearchProvider(id: number): boolean {
  const providers = this.getSearchProviders()
  const initialLength = providers.length
  
  const filtered = providers.filter(p => p.id !== id)
  
  if (filtered.length === initialLength) {
    return false // Provider not found
  }
  
  this.db
    .prepare('UPDATE Settings SET search_providers = ? WHERE id = 1')
    .run(JSON.stringify(filtered))
  
  return true
}
```

### Transaction Handling

All write operations (create, update, delete) should be wrapped in transactions for consistency:

```typescript
// Example with better-sqlite3 transaction
createSearchProvider(name: string, urlTemplate: string): SearchProvider {
  const transaction = this.db.transaction((name: string, urlTemplate: string) => {
    // Read-modify-write pattern
    const providers = this.getSearchProviders()
    const newProvider: SearchProvider = {
      id: Date.now(),
      name: name.trim(),
      urlTemplate: urlTemplate.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    providers.push(newProvider)
    
    this.db
      .prepare('UPDATE Settings SET search_providers = ? WHERE id = 1')
      .run(JSON.stringify(providers))
    
    return newProvider
  })
  
  return transaction(name, urlTemplate)
}
```

---

## Performance Considerations

### Read Performance
- **Expected Load**: <20 providers (per SC-006), JSON parsing <1ms
- **Optimization**: No caching needed for settings (rarely changes, singleton pattern)
- **Frontend**: Fetch once on app load, cache in composable state

### Write Performance
- **Frequency**: Low (user manually adds/edits providers, not automated)
- **Bottleneck**: None - single UPDATE query with JSON serialization (<5ms)
- **Concurrency**: Single-user app, no concurrent write concerns

### Scaling Limits
- **JSON Array Size**: 20 providers × ~200 bytes/provider = ~4KB (well under SQLite TEXT limit of 1GB)
- **Parse Time**: Linear with array size, but negligible for <100 providers

---

## Migration Strategy

### Migration Script

```typescript
// scripts/migrations/002-add-search-providers.ts
import Database from 'better-sqlite3'

export function migrate(db: Database.Database): void {
  console.log('Running migration: 002-add-search-providers')
  
  // Check if column already exists
  const columns = db.pragma('table_info(Settings)')
  const hasColumn = columns.some((col: any) => col.name === 'search_providers')
  
  if (!hasColumn) {
    db.exec(`
      ALTER TABLE Settings 
      ADD COLUMN search_providers TEXT NOT NULL DEFAULT '[]'
    `)
    console.log('✓ Added search_providers column to Settings table')
  } else {
    console.log('✓ search_providers column already exists, skipping')
  }
}

export function rollback(db: Database.Database): void {
  console.log('Rolling back migration: 002-add-search-providers')
  
  // SQLite does not support DROP COLUMN in older versions
  // For rollback, would need to recreate table without column
  // For this feature, rollback not critical (column can remain empty)
  
  db.exec(`
    UPDATE Settings SET search_providers = '[]' WHERE id = 1
  `)
  console.log('✓ Cleared search_providers data')
}
```

### Deployment Checklist

- [ ] Run migration script before deploying new code
- [ ] Verify Settings table has `search_providers` column
- [ ] Verify default value is `'[]'` for existing row
- [ ] Test JSON parsing with empty array
- [ ] Test creating first provider
- [ ] Verify backward compatibility with old frontend (if applicable)

---

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/SearchProvider.test.ts
describe('SearchProvider Validation', () => {
  test('validates required fields', () => {
    expect(validateSearchProvider({}).valid).toBe(false)
  })
  
  test('validates name length', () => {
    const longName = 'x'.repeat(101)
    expect(validateSearchProvider({ name: longName, urlTemplate: 'https://...' }).valid).toBe(false)
  })
  
  test('validates URL template protocol', () => {
    expect(validateSearchProvider({ name: 'Test', urlTemplate: 'ftp://...' }).valid).toBe(false)
  })
  
  test('accepts valid provider', () => {
    expect(validateSearchProvider({ 
      name: 'Discogs', 
      urlTemplate: 'https://discogs.com/search?q={artist}+{album}' 
    }).valid).toBe(true)
  })
})
```

### Integration Tests

```typescript
// tests/integration/SettingsRepository.test.ts
describe('SettingsRepository.searchProviders', () => {
  test('creates provider with generated ID and timestamps', () => {
    const provider = repo.createSearchProvider('Test', 'https://test.com?q={artist}')
    expect(provider.id).toBeGreaterThan(0)
    expect(provider.createdAt).toBeTruthy()
    expect(provider.updatedAt).toBeTruthy()
  })
  
  test('updates provider and modifies updatedAt', async () => {
    const provider = repo.createSearchProvider('Test', 'https://test.com')
    await new Promise(resolve => setTimeout(resolve, 10)) // Ensure time difference
    const updated = repo.updateSearchProvider(provider.id, { name: 'Updated' })
    expect(updated.name).toBe('Updated')
    expect(updated.updatedAt).not.toBe(provider.updatedAt)
  })
  
  test('deletes provider and returns true', () => {
    const provider = repo.createSearchProvider('Test', 'https://test.com')
    expect(repo.deleteSearchProvider(provider.id)).toBe(true)
    expect(repo.getSearchProviders()).toHaveLength(0)
  })
  
  test('handles JSON parsing errors gracefully', () => {
    // Manually corrupt JSON in database
    db.exec(`UPDATE Settings SET search_providers = 'invalid json' WHERE id = 1`)
    expect(repo.getSearchProviders()).toEqual([])
  })
})
```

---

## Future Enhancements

**Not included in this feature, potential future work:**

1. **Provider Icons**: Add optional `iconUrl` field to display provider logos
2. **Provider Groups**: Add `category` field to group providers (stores, databases, streaming)
3. **Usage Analytics**: Track which providers are used most frequently
4. **Template Variables**: Support additional placeholders like `{year}`, `{genre}`
5. **Shared Provider Presets**: Provide built-in templates for popular services
6. **Import/Export**: Allow users to share provider configurations as JSON files

---

## Summary

- **Entities**: SearchProvider (embedded in Settings), Settings (extended with search_providers field)
- **Storage**: JSON column in Settings table (simple, performant for <20 providers)
- **Validation**: Application-layer validation (name, URL template format)
- **Access Pattern**: Read-modify-write with transactions
- **Migration**: Single ALTER TABLE to add column with default value
- **Backward Compatible**: Empty array default, existing fields unchanged
