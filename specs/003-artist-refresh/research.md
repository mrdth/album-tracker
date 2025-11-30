# Research: Artist Data Refresh

**Date**: 2025-11-30  
**Feature**: Artist Data Refresh  
**Status**: Complete

## Overview

This document consolidates research findings for implementing the artist refresh feature, resolving technical unknowns identified in the planning phase.

## Research Questions & Resolutions

### 1. MusicBrainz API Integration

**Question**: Does an existing MusicBrainz API client implementation exist, or do we need to create one?

**Decision**: Use existing MusicBrainzService

**Rationale**: 
- Existing `MusicBrainzClient.ts` provides low-level API calls (`artistSearch`, `getAlbums`)
- Existing `MusicBrainzService.ts` wraps the client with:
  - Rate limiting (respects `api_rate_limit_ms` from Settings)
  - Exponential backoff retry logic (uses `max_api_retries` from Settings)
  - Error handling and logging
- The service already has `fetchReleaseGroups(artistMbid)` method which returns albums
- No new dependencies or API clients needed

**Implementation Notes**:
- Reuse `musicBrainzService.fetchReleaseGroups()` for fetching albums during refresh
- Service automatically handles rate limiting and retries
- Already integrated with Settings repository for configuration

### 2. Duplicate Album Prevention Strategy

**Question**: How should we prevent duplicate albums from being added during refresh?

**Decision**: Check existing albums by MBID before insertion

**Rationale**:
- Database already has `UNIQUE INDEX idx_album_mbid ON Album(mbid)` constraint
- AlbumRepository likely has methods to check existence or will throw on constraint violation
- Best practice: Check before attempting insert to provide better error handling

**Implementation Approach**:
1. Fetch new albums from MusicBrainz
2. Query existing albums for the artist from AlbumRepository
3. Filter out albums that already exist (by MBID)
4. Only insert genuinely new albums
5. Return count of new albums added

**Alternatives Considered**:
- Let database constraint handle duplicates → Rejected: Poor UX, exception handling is uglier than prevention
- Use UPSERT pattern → Rejected: We only want to INSERT new albums, not UPDATE existing ones

### 3. Timestamp Formatting Pattern

**Question**: What's the best approach for human-readable timestamp formatting ("today", "yesterday", specific dates)?

**Decision**: Create shared utility function with relative time logic

**Rationale**:
- Avoid external dependencies (moment.js, date-fns are overkill for this use case)
- Simple logic: compare timestamp to current date
- Need both backend (for API responses) and frontend (for display) versions

**Implementation Pattern**:
```typescript
// Backend: backend/src/utils/dateFormat.ts
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  
  // Same day
  if (isSameDay(date, now)) {
    return `today at ${formatTime(date)}`
  }
  
  // Yesterday
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) {
    return `yesterday at ${formatTime(date)}`
  }
  
  // Older dates
  return `${formatDate(date)} at ${formatTime(date)}`
}

// Frontend: frontend/src/utils/dateFormat.ts
// Mirror implementation for client-side formatting
```

**Alternatives Considered**:
- Use Intl.RelativeTimeFormat → Rejected: Doesn't provide "today"/"yesterday" strings naturally
- Add date-fns library → Rejected: 70KB for simple date formatting is excessive
- Format server-side only → Rejected: Loses reactivity (timestamp needs to update without server round-trip)

### 4. Concurrent Refresh Handling

**Question**: How should we prevent concurrent refreshes for the same artist?

**Decision**: In-memory lock in service layer + UI button disabled state

**Rationale**:
- Single-user application → No distributed lock needed
- Two layers of protection:
  1. **UI Layer**: Disable refresh button while request is in progress
  2. **Service Layer**: Track in-flight refreshes in Set/Map

**Implementation**:
```typescript
// ArtistRefreshService.ts
class ArtistRefreshService {
  private activeRefreshes = new Set<number>() // artist IDs currently refreshing
  
  async refreshArtist(artistId: number) {
    if (this.activeRefreshes.has(artistId)) {
      throw new Error('Refresh already in progress for this artist')
    }
    
    try {
      this.activeRefreshes.add(artistId)
      // ... perform refresh
    } finally {
      this.activeRefreshes.delete(artistId)
    }
  }
}
```

**Alternatives Considered**:
- Database flag (is_refreshing column) → Rejected: Risk of orphaned locks if process crashes
- Queue system → Rejected: Over-engineering for single-user app
- No protection → Rejected: Could cause duplicate API calls and race conditions

### 5. Stale Data Detection Query

**Question**: Most efficient way to find artist with oldest updated_at timestamp?

**Decision**: Simple SQL query with ORDER BY and LIMIT

**Implementation**:
```sql
SELECT * FROM Artist 
ORDER BY updated_at ASC 
LIMIT 1
```

Then check if `updated_at < (NOW() - 7 days)` in application logic.

**Rationale**:
- SQLite handles ORDER BY efficiently with index on updated_at
- Simpler than complex WHERE clause with subquery
- Application code can clearly express the 7-day threshold

**Alternatives Considered**:
- Use MIN(updated_at) with WHERE clause → Rejected: Requires two queries (find min, then find artist)
- Add database index on updated_at → Keep as performance optimization option if needed

### 6. Rate Limiting Scope

**Question**: Should refresh endpoint rate limiting be per-artist or global?

**Decision**: Global rate limiting via MusicBrainzService (already implemented)

**Rationale**:
- MusicBrainz API rate limit is per-client (our app), not per-artist
- Existing MusicBrainzService already enforces global rate limiting
- Per-artist limiting would be redundant and more complex

**Implementation Notes**:
- No additional rate limiting needed
- MusicBrainzService.enforceRateLimit() already called before each API request
- Respects api_rate_limit_ms from Settings (default: 1000ms = 1 req/sec)

### 7. Error Handling Strategy

**Question**: How to handle various MusicBrainz API error scenarios?

**Decision**: Leverage existing MusicBrainzService error handling + specific refresh errors

**Error Categories**:
1. **Network/API Errors**: Handled by MusicBrainzService retry logic
2. **Artist Not Found**: Return 404 from refresh endpoint
3. **No New Albums**: Success with message "No new albums found"
4. **Rate Limit Exceeded**: Service automatically handles with retry/backoff

**Response Format**:
```typescript
{
  success: true,
  albums_added: number,
  message?: string,  // e.g., "No new albums found"
  updated_at: string
}
```

**Alternatives Considered**:
- Return 4xx for "no new albums" → Rejected: It's a success case, not an error
- Surface raw MusicBrainz errors → Rejected: Constitution Principle III requires user-friendly messages

## Technology Decisions Summary

| Decision Point | Choice | Key Dependencies |
|----------------|--------|------------------|
| API Client | Reuse MusicBrainzService | Existing services/MusicBrainzService.ts |
| Rate Limiting | Use existing global limiter | Settings.api_rate_limit_ms |
| Duplicate Prevention | Pre-check by MBID | AlbumRepository.findByArtistId() |
| Timestamp Format | Custom utility function | None (native Date) |
| Concurrency | In-memory Set + UI state | None |
| Stale Detection | SQL ORDER BY + app logic | None |

## Best Practices Applied

### MusicBrainz API Guidelines
- **Rate Limiting**: 1 request per second (configurable via Settings)
- **User-Agent**: Already set in MusicBrainzClient ("MrdthMusicInfo/0.0.1")
- **Error Handling**: Retry transient errors with exponential backoff
- **Response Caching**: Not implemented (future enhancement)

### Performance Considerations
- Fetch albums in single API call (limit=100 sufficient for most artists)
- Batch insert new albums using existing AlbumRepository.bulkCreate()
- Use SQLite indexes for updated_at queries
- Async operations to prevent UI blocking

### Security Considerations
- Validate artist ID exists before attempting refresh
- Sanitize MusicBrainz responses (handled by existing repository layer)
- Rate limit prevents API abuse
- No user input goes directly to external API (only artist MBID from our DB)

## Open Questions / Future Enhancements

1. **Partial Failure Handling**: What if 5 of 10 new albums fail to insert?
   - Current approach: Transaction would roll back all or succeed all
   - Future: Consider partial success reporting

2. **Progress Indication**: For artists with 100+ albums, should we stream progress?
   - Current: Single response after completion
   - Future: WebSocket or SSE for real-time progress

3. **Refresh History**: Should we track refresh history/changelog?
   - Current: Only updated_at timestamp
   - Future: Audit log of what was added when

4. **Intelligent Refresh**: Should we skip artists recently added (updated_at == created_at)?
   - Current: Refresh any artist on demand
   - Future: Warn if artist was just imported

## References

- MusicBrainz API Documentation: https://musicbrainz.org/doc/MusicBrainz_API
- Existing implementation: `backend/src/services/MusicBrainzService.ts`
- Database schema: `backend/src/db/schema.sql`
- Constitution: `.specify/memory/constitution.md`
