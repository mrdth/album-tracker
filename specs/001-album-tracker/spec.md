# Feature Specification: Album Tracker

**Feature Branch**: `001-album-tracker`  
**Created**: 2025-11-27  
**Status**: Draft  
**Input**: User description: "Build an album tracker app as specified in @prd.md"

## Clarifications

### Session 2025-11-27

- Q: What is the intended deployment target? → A: Pure web application (Node.js app, will eventually deploy via Docker to server holding music collection)
- Q: Should filesystem scan run automatically after artist import, or require manual trigger? → A: Skip automatic scan on artist import; filesystem is scanned on application startup and results are cached, then users manually trigger "Rescan" as needed
- Q: What confidence threshold should trigger the Ambiguous state for album matches? → A: 80% string similarity threshold
- Q: How should the system handle API failures and rate limits? → A: Retry with exponential backoff, max 3 attempts, then show error
- Q: How should the directory browser be implemented for manual folder selection? → A: Server-side directory tree with client navigation

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search and Import Artist Discography (Priority: P1)

A user wants to track their music collection for a specific artist. They search for the artist by name, review the search results to confirm they have the right artist, then import the artist's complete album discography into their local collection for tracking.

**Why this priority**: This is the foundational capability - without the ability to import artist data, no tracking can occur. This delivers immediate value by creating a baseline discography to compare against.

**Independent Test**: Can be fully tested by searching for an artist, selecting from results, and verifying the artist and albums are stored locally. Delivers value as a catalog/reference even without filesystem scanning.

**Acceptance Scenarios**:

1. **Given** the app is open, **When** user enters an artist name and searches, **Then** results display matching artists with names and disambiguation info
2. **Given** search results are displayed, **When** user selects an artist, **Then** the artist's metadata and full album discography (type: Album) are imported into local storage
3. **Given** an artist is imported, **When** import completes, **Then** user is taken to the Artist Detail page showing all albums with titles and release years
4. **Given** an artist already exists locally, **When** user searches and imports the same artist, **Then** system updates/refreshes the discography without creating duplicates

---

### User Story 2 - Configure Library Path and Scan Filesystem (Priority: P2)

A user has music files organized in folders on their computer. They configure the app to point to their music library root folder, then trigger a scan to automatically detect which albums they own based on folder matching.

**Why this priority**: This enables the core tracking functionality - comparing what albums exist in the discography versus what's actually in the user's collection. Without scanning, users have a reference but no ownership tracking.

**Independent Test**: Can be fully tested by configuring a library path, pointing to a test music folder with known artist/album structure, triggering a scan, and verifying ownership status updates correctly.

**Acceptance Scenarios**:

1. **Given** user is in Settings, **When** they enter a library root path, **Then** path is validated for existence and readability
2. **Given** library path is configured, **When** user triggers a scan from Artist Detail page, **Then** app searches for artist folder using naming rules
3. **Given** artist folder is found, **When** scan runs, **Then** app inspects subdirectories and parses album folder names (format: [YYYY] Title)
4. **Given** album folders are parsed, **When** scan completes, **Then** each imported album is marked as Owned, Missing, or Ambiguous based on match confidence
5. **Given** albums are matched, **When** scan completes, **Then** ownership status and matched folder paths are displayed on Artist Detail page

---

### User Story 3 - View Collection Overview and Progress (Priority: P3)

A user has imported multiple artists and wants to see their overall collection status. They view a list of all imported artists with summary statistics showing how many albums they own versus the total discography for each artist.

**Why this priority**: Provides high-level collection visibility and helps users prioritize which artists to focus on. This is valuable but depends on having imported artists and run scans first.

**Independent Test**: Can be fully tested by importing multiple artists, running scans, and verifying the Collection Overview displays correct counts and progress indicators for each artist.

**Acceptance Scenarios**:

1. **Given** multiple artists are imported, **When** user navigates to Collection Overview, **Then** all artists are listed with name and disambiguation
2. **Given** Collection Overview is displayed, **When** user views an artist entry, **Then** it shows "X owned / Y total albums" and a progress indicator
3. **Given** an artist entry is displayed, **When** user clicks on it, **Then** they navigate to that artist's Detail page

---

### User Story 4 - Manage Album Detail and Manual Overrides (Priority: P4)

A user has an album folder with non-standard naming that the automatic scan didn't match correctly, or they want to manually mark an album as owned/missing regardless of scan results. They view the Album Detail grid, select an album, and manually set its ownership status or link it to a specific folder.

**Why this priority**: Handles edge cases and user control. Automatic scanning works for most cases, but users need manual override capability for inconsistent naming or special situations.

**Independent Test**: Can be fully tested by viewing an artist's albums, manually selecting a folder for an album, and verifying the ownership status updates and persists across scans.

**Acceptance Scenarios**:

1. **Given** user is on Artist Detail page, **When** they view the album grid, **Then** each album shows title, year, ownership status (Owned/Missing/Ambiguous), and filesystem path if owned
2. **Given** an album is marked Ambiguous or Missing, **When** user manually selects a folder for that album, **Then** ownership is set to Owned and path is stored
3. **Given** user manually overrides an album, **When** future scans run, **Then** manual overrides persist and are not changed by scan results
4. **Given** an album has a manual folder link, **When** user clears the override, **Then** next scan re-evaluates ownership automatically
5. **Given** an album ownership is incorrect, **When** user toggles ownership status manually, **Then** status updates and persists

---

### User Story 5 - Link Artist Folder Manually (Priority: P4)

A user's artist folder doesn't match the automatic naming rules (e.g., different spelling, special characters, or custom organization). They manually select the correct artist folder from their library so all future scans use this folder.

**Why this priority**: Similar to album overrides, this handles non-standard folder structures. Less common than album-level issues but critical for users with custom organization.

**Independent Test**: Can be fully tested by selecting an artist folder manually, running a scan, and verifying albums are detected within that folder regardless of naming convention.

**Acceptance Scenarios**:

1. **Given** user is on Artist Detail page, **When** they click "Link Artist Folder", **Then** system shows a server-side directory browser starting at library root
2. **Given** directory browser is open, **When** user navigates and selects a folder, **Then** that folder is stored as the artist folder path
3. **Given** artist folder is manually linked, **When** user triggers a scan, **Then** scan uses the linked folder instead of automatic naming rules
4. **Given** artist folder is linked, **When** user clears the link, **Then** next scan reverts to automatic artist folder detection

---

### User Story 6 - Rescan After Library Changes (Priority: P3)

A user has added new albums to their music library or renamed folders. They trigger a rescan from the Artist Detail page to update ownership status based on the current filesystem state.

**Why this priority**: Keeps the tracking data fresh as the user's collection evolves. Important for ongoing use but not essential for initial setup.

**Independent Test**: Can be fully tested by running an initial scan, modifying filesystem (add/remove/rename folders), triggering rescan, and verifying ownership status updates correctly.

**Acceptance Scenarios**:

1. **Given** user is on Artist Detail page, **When** they click "Rescan" button, **Then** filesystem cache is refreshed and album matching re-runs for that artist
2. **Given** rescan runs, **When** new albums are found in refreshed cache, **Then** ownership status updates to Owned and paths are stored
3. **Given** rescan runs, **When** previously owned albums are no longer found in cache, **Then** ownership status updates to Missing and paths are cleared
4. **Given** manual overrides exist, **When** rescan runs, **Then** manual overrides are preserved regardless of cache results

---

### Edge Cases

- What happens when library path is set to a non-existent directory? (Validation error displayed, path not saved)
- What happens when library path permissions prevent reading? (Error displayed indicating permission issue)
- What happens when artist folder contains no subdirectories? (All albums marked as Missing)
- What happens when an album folder name doesn't match the expected [YYYY] Title format? (Marked as Ambiguous or not matched, requires manual override)
- What happens when multiple album folders could match the same album title? (Match confidence used; lowest confidence marked Ambiguous)
- What happens when user imports the same artist twice? (Discography refreshed/updated, existing manual overrides preserved)
- What happens when an album folder is moved or renamed between scans? (Previously Owned album becomes Missing unless manually linked)
- What happens when filesystem has multiple artist folders with similar names? (First match by naming rules is used; user can override with manual link)
- What happens when artist name contains filesystem-unsafe characters (/, \, :, etc.)? (Characters normalized to safe equivalents like _ for folder matching)
- What happens when external metadata API is unavailable during search? (System retries up to 3 times with exponential backoff, then displays error message allowing user to retry manually)
- What happens when artist has no albums in metadata API? (Artist imported with zero albums, user informed)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow user to search for artists by name using external metadata API (MusicBrainz or equivalent)
- **FR-002**: System MUST display search results including artist name and disambiguation information
- **FR-003**: System MUST import selected artist metadata (name, MBID, disambiguation) and album discography (filtered to type: Album)
- **FR-004**: System MUST store album metadata including title, release year, MBID, and type information
- **FR-005**: System MUST allow user to configure a library root path in Settings
- **FR-006**: System MUST validate library path for existence and readability before accepting
- **FR-007**: System MUST scan entire filesystem on application startup to populate cache (no matching performed); users manually trigger "Rescan" from Artist Detail page to run album matching against current cache
- **FR-008**: System MUST locate artist folders using naming rules: character normalization, article movement (e.g., "The 1975" → "1975, The"), and grouped directories (= A =, = B =, ... = # =)
- **FR-009**: System MUST parse album folder names assuming format [YYYY] Title with case-insensitive and punctuation-insensitive matching
- **FR-010**: System MUST match album folders to imported album metadata and assign ownership status: Owned (≥80% string similarity), Ambiguous (<80% but matched), or Missing (no match found)
- **FR-011**: System MUST store filesystem paths for matched albums
- **FR-012**: System MUST display Collection Overview showing all imported artists with owned/total album counts
- **FR-013**: System MUST display Artist Detail page with album grid showing title, year, ownership status, and path
- **FR-014**: System MUST provide server-side directory browser for user to manually select a folder for an album, setting ownership to Owned
- **FR-015**: System MUST allow user to manually toggle album ownership status (Owned/Missing)
- **FR-016**: System MUST preserve manual overrides across future scans
- **FR-017**: System MUST provide server-side directory browser for user to manually link an artist folder, overriding automatic detection
- **FR-018**: System MUST persist all data locally (artists, albums, ownership status, folder paths, manual overrides)
- **FR-019**: System MUST never modify the user's filesystem (read-only scanning)
- **FR-020**: System MUST support refreshing artist discography without losing manual overrides
- **FR-021**: System MUST handle artist names with filesystem-unsafe characters by normalizing to safe equivalents
- **FR-022**: System MUST retry failed API requests using exponential backoff (max 3 attempts) before displaying error message to user
- **FR-023**: System MUST provide clear error messages when library path is invalid or unreadable
- **FR-024**: System MUST refresh filesystem cache when user triggers "Rescan", scanning the library path for updated folder structure
- **FR-025**: System MUST respect API rate limits and handle rate limit errors gracefully with appropriate backoff
- **FR-026**: System MUST provide server-side API endpoint to generate directory tree structure for client navigation

### Key Entities

- **Artist**: Represents a music artist with unique identifier (MBID), name, disambiguation text, optional manually-linked folder path, and computed counts (total albums, owned albums)
- **Album**: Represents a release-group of type "Album" belonging to an artist, including unique identifier (MBID), title, release year, type/secondary type, ownership status (Owned/Missing/Ambiguous), optional filesystem folder path, and optional match confidence score
- **Settings**: Application configuration including library root path, last scan timestamp, optional naming rule flags, and optional album type filters (include/exclude compilations, live albums, etc.)
- **Manual Override**: User-specified folder link for an artist or album that persists across scans and overrides automatic detection

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: User can search for an artist, import discography, and view all albums within 30 seconds of opening the app
- **SC-002**: User can configure library path and complete first filesystem scan for an artist with 50 albums in under 2 minutes
- **SC-003**: Album folder matching achieves 90% accuracy for standard naming conventions ([YYYY] Title format)
- **SC-004**: Users can successfully override incorrect matches in under 20 seconds per album using manual folder selection
- **SC-005**: Collection Overview displays owned/total counts accurately for up to 100 artists without performance degradation
- **SC-006**: Manual overrides (artist folder links, album folder links, ownership toggles) persist correctly across 100% of rescan operations
- **SC-007**: Filesystem scans detect newly added or removed album folders with 100% accuracy on rescan
- **SC-008**: Application handles 1000+ albums across multiple artists without noticeable lag in UI responsiveness
- **SC-009**: User can understand ownership status of their entire collection at a glance via Collection Overview
- **SC-010**: Error messages for invalid library paths or API failures are clear enough that 95% of users can resolve the issue without support

## Assumptions

- **Assumption 1**: External metadata API (MusicBrainz) is the primary source; alternative APIs may be swapped but are not required for MVP
- **Assumption 2**: Album folders follow [YYYY] Title naming convention in majority of cases; deviations require manual override
- **Assumption 3**: Library path points to a single root directory; multi-library support is deferred to future enhancement
- **Assumption 4**: User's music library uses artist-grouped directories (= A =, = B =, etc.) or flat artist folders directly under library root
- **Assumption 5**: Local storage mechanism (file-based, browser storage, or lightweight database) is sufficient for single-user data persistence
- **Assumption 6**: User understands basic filesystem navigation to manually link folders when needed
- **Assumption 7**: Match confidence scoring is based on string similarity between parsed folder names and album metadata; exact algorithm can be refined during implementation
- **Assumption 8**: Application is a Node.js web application deployed via Docker to the server hosting the music collection, with server-side filesystem access
- **Assumption 9**: Albums with string similarity below 80% are marked as Ambiguous; those at or above 80% are marked as Owned
- **Assumption 10**: Refresh/re-import of artist discography merges new albums and updates existing ones while preserving manual overrides via stable MBID matching
