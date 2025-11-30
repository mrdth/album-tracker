# Feature Specification: Artist Data Refresh

**Feature Branch**: `003-artist-refresh`  
**Created**: 2025-11-30  
**Status**: Draft  
**Input**: User description: "The user should be able to trigger a refresh for an artist from the artist detail page. Triggering a refresh should fetch the artist's albums from the MusicBrainz API, and add any new albums to the artist's collection, then update the artist's updated_at timestamp. A 'last checked' timestamp should be shown on the details page, based on the updated_at column to reflect the last time the artist's albums were refreshed. Additionally, a new endpoint should be created which will get the artist with the oldest updated_at timestamp, and if that timestamp is more than a week old, trigger a refresh for that artist."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manual Artist Refresh (Priority: P1)

A user is viewing an artist's detail page and wants to check if the artist has released any new albums since the last time they imported data. They click a "Refresh" button, which retrieves the latest album information from the music catalog, adds any newly released albums to their collection, and updates the "last checked" timestamp.

**Why this priority**: This is the core functionality that delivers immediate user value. Users can manually keep their collection up-to-date with the latest releases from their favorite artists. It's independently testable and provides value even without the automatic refresh feature.

**Independent Test**: Can be fully tested by navigating to an artist detail page, clicking the refresh button, and verifying that new albums appear and the "last checked" timestamp updates. Delivers value by allowing users to discover new releases on-demand.

**Acceptance Scenarios**:

1. **Given** I am viewing an artist detail page with existing albums, **When** I click the "Refresh" button, **Then** the system retrieves the latest albums from the music catalog and adds any new albums not already in my collection
2. **Given** I am viewing an artist detail page, **When** I click the "Refresh" button and the refresh completes, **Then** the "last checked" timestamp updates to the current date and time
3. **Given** I am viewing an artist with no new albums released, **When** I click the "Refresh" button, **Then** the "last checked" timestamp updates but no new albums are added
4. **Given** I am viewing an artist detail page, **When** I look at the page, **Then** I see a "last checked" timestamp showing when the artist's albums were last refreshed
5. **Given** I trigger a refresh for an artist, **When** the music catalog service returns an error or is unavailable, **Then** I see an error message and the "last checked" timestamp does not update

---

### User Story 2 - Display Last Checked Timestamp (Priority: P2)

A user wants to know how fresh the data is for a particular artist. When viewing an artist detail page, they see a "last checked" timestamp that shows the last time the artist's albums were refreshed from the music catalog.

**Why this priority**: This provides transparency and helps users decide whether they need to manually refresh. It's a supporting feature for the manual refresh but provides independent value by showing data freshness.

**Independent Test**: Can be tested by viewing artist detail pages and verifying that the timestamp displays correctly based on when the artist was last refreshed. Delivers value by informing users about data currency.

**Acceptance Scenarios**:

1. **Given** I am viewing an artist detail page for an artist last refreshed today, **When** I look at the "last checked" timestamp, **Then** it shows "Last checked: today at [time]"
2. **Given** I am viewing an artist detail page for an artist last refreshed yesterday, **When** I look at the "last checked" timestamp, **Then** it shows "Last checked: yesterday at [time]"
3. **Given** I am viewing an artist detail page for an artist last refreshed over a week ago, **When** I look at the "last checked" timestamp, **Then** it shows "Last checked: [date] at [time]"
4. **Given** I am viewing an artist detail page for a newly added artist that has never been refreshed, **When** I look at the "last checked" timestamp, **Then** it shows the initial creation timestamp

---

### User Story 3 - Automatic Stale Data Refresh (Priority: P3)

The system automatically identifies artists whose data hasn't been refreshed in over a week and provides an automated way to refresh them. This ensures the collection stays reasonably up-to-date without requiring constant manual intervention.

**Why this priority**: This is a convenience feature that automates data freshness maintenance. While valuable for long-term use, the feature is fully functional without it through manual refreshes. It's independently valuable as a background maintenance task.

**Independent Test**: Can be tested by creating artists with old refresh timestamps, triggering the stale data check, and verifying that artists not refreshed in over a week get updated. Delivers value by reducing manual maintenance burden.

**Acceptance Scenarios**:

1. **Given** an artist has not been refreshed in over 7 days, **When** the stale data check is triggered, **Then** the artist's albums are retrieved from the music catalog and any new albums are added
2. **Given** multiple artists exist with varying refresh timestamps, **When** the stale data check is triggered, **Then** only the artist with the oldest refresh timestamp (if over 7 days old) is refreshed
3. **Given** all artists have been refreshed within the past 7 days, **When** the stale data check is triggered, **Then** no refresh occurs and the system indicates no action was needed
4. **Given** an artist was last refreshed exactly 7 days ago, **When** the stale data check is triggered, **Then** the artist is not refreshed (only artists older than 7 days are refreshed)
5. **Given** the stale data check is triggered and identifies a stale artist, **When** the refresh completes, **Then** that artist's refresh timestamp is updated to the current time

---

### Edge Cases

- What happens when the music catalog service rate limit is exceeded during a refresh? The system should respect configured rate limiting and queue/delay requests appropriately, showing a message to the user if immediate refresh isn't possible.
- What happens when an artist has hundreds of albums and the refresh takes a long time? The system should provide feedback (loading indicator) and handle the operation asynchronously so the interface remains responsive.
- What happens when a refresh is triggered while another refresh for the same artist is already in progress? The system should prevent concurrent refreshes for the same artist, either by disabling the refresh control or showing a message that a refresh is in progress.
- What happens when the music catalog returns an album that already exists in the collection? The system should skip adding duplicates and only add genuinely new albums.
- What happens if an artist's refresh timestamp is in the future due to system clock issues? The stale data check should handle this gracefully, potentially treating it as current data.
- What happens when the stale data check is triggered multiple times simultaneously? The system should handle concurrent checks safely, ensuring only one refresh happens per artist.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a refresh action on the artist detail page that retrieves the artist's albums from the music catalog
- **FR-002**: When a refresh is triggered, system MUST retrieve all current albums for the artist from the music catalog
- **FR-003**: System MUST add only new albums (albums not already in the collection) to the artist during a refresh
- **FR-004**: System MUST update the artist's refresh timestamp to the current date and time when a refresh completes successfully
- **FR-005**: System MUST display a "last checked" timestamp on the artist detail page showing when albums were last refreshed
- **FR-006**: The "last checked" timestamp MUST display in human-readable relative time format (e.g., "today", "yesterday", specific date for older timestamps)
- **FR-007**: System MUST provide functionality that identifies the artist with the oldest refresh timestamp
- **FR-008**: The stale data check MUST only trigger a refresh if the oldest artist's refresh timestamp is more than 7 days old
- **FR-009**: When the stale data check triggers a refresh, it MUST follow the same refresh process as manual refresh (retrieve albums, add new ones, update timestamp)
- **FR-010**: System MUST respect configured rate limiting when making music catalog requests during refresh
- **FR-011**: System MUST handle music catalog service errors gracefully, showing appropriate error messages to users and not updating the timestamp on failed refreshes
- **FR-012**: System MUST prevent adding duplicate albums by checking if an album already exists in the collection before adding
- **FR-013**: System MUST provide user feedback during the refresh operation (loading state, success/error messages)

### Key Entities

- **Artist**: Represents a music artist in the collection
  - Refresh timestamp: When the artist's albums were last updated from the music catalog (used for "last checked" display and staleness detection)
  - Identifier: Unique identifier used to retrieve artist's albums from the music catalog
  - Relationship: Has many albums

- **Album**: Represents an album/release in the collection
  - Identifier: Unique identifier used to prevent duplicate additions during refresh
  - Artist reference: Links the album to its artist
  - Relationship: Belongs to an artist

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully trigger a refresh and see new albums appear within 10 seconds for artists with typical catalog sizes (under 100 albums)
- **SC-002**: The "last checked" timestamp accurately reflects the last refresh time and updates immediately after a successful refresh
- **SC-003**: The stale data check correctly identifies and refreshes artists with data older than 7 days with 100% accuracy
- **SC-004**: Zero duplicate albums are added to the collection during refresh operations
- **SC-005**: Refresh operations respect configured rate limiting 100% of the time
- **SC-006**: Users receive clear feedback for all refresh outcomes (success, error, no new albums) within 2 seconds of operation completion
