# Feature Specification: Ignored Albums

**Feature Branch**: `004-ignored-albums`  
**Created**: 2025-12-14  
**Status**: Draft  
**Input**: User description: "New feature: Ignored Albums

The user should be able to mark an unowned album as ignored from a button on the album card.  

Ignored albums should be marked as such in the database, and should no longer be shown on the artist detail page.  Ignored albums should also not count toward statistics (Collection Summary, and the 'x of y albums owned' display on the artist card & detail page"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mark Album as Ignored (Priority: P1)

A user is viewing an artist's discography and sees albums they don't want to track (e.g., special editions, regional releases, or albums they're not interested in). They mark these albums as "ignored" from the album card so they're removed from view and statistics.

**Why this priority**: This is the core functionality that delivers immediate value. Users can clean up their collection view by removing albums they'll never want to track, making their collection overview more accurate to their actual interests.

**Independent Test**: Can be fully tested by viewing an artist with multiple unowned albums, clicking the "ignore" button on one album, and verifying it disappears from the display and owned/total counts update correctly.

**Acceptance Scenarios**:

1. **Given** an unowned album is displayed on the Artist Detail page, **When** user clicks the "Ignore" button on the album card, **Then** the album is marked as ignored in the database
2. **Given** an album is marked as ignored, **When** the Artist Detail page refreshes, **Then** the ignored album is no longer visible in the album grid
3. **Given** an album is marked as ignored, **When** user views Collection Overview, **Then** the artist's total album count excludes the ignored album
4. **Given** an album is marked as ignored, **When** user views Artist Detail page, **Then** the "X of Y albums owned" display excludes the ignored album from the total count
5. **Given** an album is marked as ignored, **When** user views Collection Summary statistics, **Then** the ignored album is not counted in any totals or percentages

---

### User Story 2 - View and Manage Ignored Albums (Priority: P2)

A user has marked several albums as ignored but now wants to review which albums they've ignored, either to verify their choices or to un-ignore an album they marked by mistake.

**Why this priority**: Provides visibility and control over ignored albums. Users need a way to see what they've hidden and reverse the action if needed, but this is secondary to the initial ignore capability.

**Independent Test**: Can be fully tested by toggling a view option to show ignored albums, verifying they appear with an "ignored" indicator, and clicking "un-ignore" to restore an album to normal view.

**Acceptance Scenarios**:

1. **Given** user is on Artist Detail page, **When** they toggle "Show Ignored Albums" option, **Then** previously hidden ignored albums become visible in the album grid
2. **Given** ignored albums are visible, **When** user views an ignored album card, **Then** it displays with a visual indicator (e.g., dimmed appearance or "Ignored" badge)
3. **Given** an ignored album is visible, **When** user clicks the "Un-ignore" button on the album card, **Then** the album is removed from ignored status
4. **Given** an album is un-ignored, **When** the page refreshes, **Then** the album appears in normal view and is included in all statistics
5. **Given** user toggles "Show Ignored Albums" off, **When** the view updates, **Then** ignored albums are hidden again

---

### User Story 3 - Prevent Ignoring Owned Albums (Priority: P3)

A user accidentally clicks the ignore button on an album they actually own. The system prevents this action to avoid hiding albums that are part of their actual collection.

**Why this priority**: This is a safety feature to prevent user errors. It's important for data integrity but less critical than the core ignore functionality since users are unlikely to try ignoring owned albums.

**Independent Test**: Can be fully tested by attempting to click the ignore button on an owned album and verifying the action is blocked with an appropriate message.

**Acceptance Scenarios**:

1. **Given** an owned album is displayed on the Artist Detail page, **When** user views the album card, **Then** no "Ignore" button is shown
2. **Given** an album has status "Owned", **When** user attempts to mark it as ignored via any interface, **Then** the system prevents the action
3. **Given** an ignored album is later scanned and found (becomes Owned), **When** scan completes, **Then** the ignored status is automatically cleared

---

### Edge Cases

- What happens when user ignores all albums for an artist? (Artist still appears in Collection Overview with 0/0 albums; user can still view artist page and un-ignore albums)
- What happens when an ignored album is manually marked as owned? (Ignored status is cleared, album becomes visible and counts in statistics)
- What happens when user re-imports/refreshes an artist's discography? (Ignored status persists for albums matched by MBID)
- What happens when user tries to ignore an album with status "Ambiguous"? (Action is allowed; album is hidden and excluded from counts)
- What happens when ignored albums are shown and user triggers a rescan? (Ignored albums remain visible in the filtered view, their ownership status may update but ignored flag persists)
- What happens when user toggles "Show Ignored Albums" on an artist with no ignored albums? (No change in display; all albums remain visible as normal)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an "Ignore" button/action on album cards for albums with status "Missing" or "Ambiguous"
- **FR-002**: System MUST NOT display "Ignore" button for albums with status "Owned"
- **FR-003**: System MUST persist ignored status for each album in the database
- **FR-004**: System MUST exclude ignored albums from display on Artist Detail page by default
- **FR-005**: System MUST exclude ignored albums from total album count in Collection Overview
- **FR-006**: System MUST exclude ignored albums from "X of Y albums owned" display on Artist Detail page
- **FR-007**: System MUST exclude ignored albums from "X of Y albums owned" display on Artist Card
- **FR-008**: System MUST exclude ignored albums from all Collection Summary statistics
- **FR-009**: System MUST provide a toggle option "Show Ignored Albums" on Artist Detail page
- **FR-010**: System MUST display ignored albums with a visual indicator (dimmed or badged) when "Show Ignored Albums" is enabled
- **FR-011**: System MUST provide an "Un-ignore" button/action on ignored album cards when they are visible
- **FR-012**: System MUST restore albums to normal view and statistics when un-ignored
- **FR-013**: System MUST automatically clear ignored status when an ignored album's ownership status changes to "Owned"
- **FR-014**: System MUST preserve ignored status across artist discography refreshes using stable MBID matching
- **FR-015**: System MUST preserve ignored status across filesystem rescans
- **FR-016**: System MUST allow ignoring albums with status "Missing" or "Ambiguous"

### Key Entities

- **Album**: Extended to include ignored status (boolean flag indicating whether user has marked this album to be excluded from view and statistics)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: User can mark an album as ignored and have it disappear from view within 2 seconds
- **SC-002**: Collection statistics update immediately after ignoring an album to reflect accurate owned/total counts
- **SC-003**: Users can toggle "Show Ignored Albums" and see all ignored albums appear within 1 second
- **SC-004**: Un-ignoring an album restores it to normal view and updates all statistics within 2 seconds
- **SC-005**: Ignored status persists correctly across 100% of artist refresh and rescan operations
- **SC-006**: System prevents ignoring owned albums in 100% of cases
- **SC-007**: Users can accurately assess their collection progress without being distracted by unwanted albums
- **SC-008**: Collection Overview accurately reflects user's curated album counts, improving satisfaction with progress tracking

## Assumptions

- **Assumption 1**: Ignored albums are hidden by default; users must explicitly toggle to view them
- **Assumption 2**: Visual indicator for ignored albums (when shown) can be a simple badge or dimmed styling; exact design is deferred to implementation
- **Assumption 3**: Ignored status is independent of ownership status and manual overrides, but is automatically cleared when album becomes Owned
- **Assumption 4**: Ignore functionality applies only to albums, not to entire artists
- **Assumption 5**: Toggle state for "Show Ignored Albums" is per-session and not persisted across page reloads (default is always hidden)
- **Assumption 6**: When calculating statistics, ignored albums are treated as if they don't exist in the discography
- **Assumption 7**: No limit on how many albums can be ignored per artist
- **Assumption 8**: Ignored albums remain in the database and are fully retrievable when "Show Ignored Albums" is enabled
