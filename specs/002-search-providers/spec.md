# Feature Specification: Search Providers for Missing Albums

**Feature Branch**: `002-search-providers`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "Searching for missing albums. The user should be able to define SearchProviders via the settings page, each of which should have a name, and a search URL template. The search URL template should be a string that contains placeholders for artist name, and/or album title. The placeholders should be named in a way that makes it easy to understand what they represent. For example, the placeholder for the artist name could be \"{artist}\" and the placeholder for the album title could be \"{album}\". When SearchProviders exist then a dropdown search menu should be displayed on the AlbumCard component, when the album is missing. Clicking a provider in the dropdown should open it's URL in a new tab, with the placeholders replaced by the actual values."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Search Providers (Priority: P1)

A user wants to set up their preferred music search sites (like Discogs, MusicBrainz, or personal stores) so they can quickly search for albums they don't own yet. They navigate to the settings page and add search providers with custom URL templates.

**Why this priority**: This is the foundation - without configured search providers, the search functionality cannot work. It's independently valuable as it allows users to prepare their search tools even before they start tracking albums.

**Independent Test**: Can be fully tested by navigating to settings, adding/editing/deleting search providers with various URL patterns, and verifying they persist across sessions. Delivers value by allowing users to set up their preferred search destinations.

**Acceptance Scenarios**:

1. **Given** I am on the settings page, **When** I add a new search provider with name "Discogs" and URL template "https://www.discogs.com/search/?q={artist}+{album}", **Then** the provider is saved and appears in my list of search providers
2. **Given** I have existing search providers, **When** I edit a provider's name or URL template, **Then** the changes are saved and reflected immediately
3. **Given** I have existing search providers, **When** I delete a provider, **Then** it is removed from the list permanently
4. **Given** I am adding a search provider, **When** I leave the name or URL template field empty, **Then** I see a validation error and cannot save
5. **Given** I am configuring a URL template, **When** I use placeholders like {artist} and {album}, **Then** the system accepts these as valid template syntax

---

### User Story 2 - Search for Missing Albums (Priority: P2)

A user is viewing an album card for an album marked as "missing" in their collection. They want to quickly search for this album on their configured search providers to find where they can acquire it. They click the search dropdown on the album card and select a provider, which opens the search results in a new browser tab.

**Why this priority**: This is the core user-facing functionality that delivers the actual search capability. It depends on P1 (configured providers) but provides the primary value proposition of the feature.

**Independent Test**: Can be tested by viewing missing album cards, verifying the search dropdown appears, selecting different providers, and confirming that new tabs open with correctly formatted search URLs. Delivers immediate value by enabling quick searches for missing albums.

**Acceptance Scenarios**:

1. **Given** I have configured search providers and am viewing a missing album card, **When** I look at the album card, **Then** I see a search dropdown menu with all my configured providers
2. **Given** I am viewing a missing album card with artist "Pink Floyd" and album "The Wall", **When** I select "Discogs" from the search dropdown, **Then** a new tab opens with URL "https://www.discogs.com/search/?q=Pink+Floyd+The+Wall" (with spaces URL-encoded)
3. **Given** I am viewing a missing album card, **When** I select any provider from the dropdown, **Then** the search URL opens in a new browser tab (not the current tab)
4. **Given** I am viewing an album card for an owned album, **When** I look at the card, **Then** the search dropdown is not displayed
5. **Given** I have no configured search providers, **When** I view a missing album card, **Then** the search dropdown is not displayed

---

### User Story 3 - Handle Special Characters in Search (Priority: P3)

A user searches for albums with special characters, punctuation, or non-ASCII characters in the artist or album name (e.g., "Beyoncé", "AC/DC", "Mötley Crüe"). The system correctly encodes these characters so the search URLs work properly.

**Why this priority**: This handles edge cases and ensures robustness across different music catalogs. While important for user experience, the feature is still usable without perfect encoding - users can manually adjust searches if needed.

**Independent Test**: Can be tested by creating missing album cards with various special characters (accents, slashes, ampersands, etc.) and verifying that clicking search providers generates working URLs with proper encoding. Delivers value by improving search accuracy for international and stylized artist names.

**Acceptance Scenarios**:

1. **Given** I am viewing a missing album with artist "Beyoncé", **When** I select a search provider, **Then** the URL correctly encodes the accented character (e.g., "Beyonc%C3%A9")
2. **Given** I am viewing a missing album with artist "AC/DC" (containing a slash), **When** I select a search provider, **Then** the slash is properly encoded or handled so the URL works correctly
3. **Given** I am viewing a missing album with special characters in the album title, **When** I select a search provider, **Then** all special characters are properly URL-encoded

---

### Edge Cases

- What happens when a user creates a URL template without any placeholders (e.g., just "https://www.musicstore.com/search")? The system should allow this and open the static URL.
- What happens when an album is missing artist or album title data? The system should replace the missing placeholder with an empty string or skip that placeholder.
- What happens when a user creates a URL template with invalid placeholders (e.g., {invalidPlaceholder})? The system should either validate and reject these, or pass them through as-is (invalid placeholders remain as literal text).
- What happens when there are many search providers (10+)? The dropdown should remain usable with scrolling or appropriate UI treatment.
- What happens if URL template encoding creates an extremely long URL? Most browsers support URLs up to 2000+ characters, but the system should handle this gracefully.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a settings interface where users can manage (create, read, update, delete) search providers
- **FR-002**: Each search provider MUST have a unique name chosen by the user
- **FR-003**: Each search provider MUST have a URL template that can contain placeholders for artist name and album title
- **FR-004**: System MUST support the placeholder syntax {artist} for artist name and {album} for album title in URL templates
- **FR-005**: System MUST display a search dropdown menu on album cards when the album is marked as missing
- **FR-006**: System MUST NOT display the search dropdown on album cards for owned/present albums
- **FR-007**: System MUST populate the search dropdown with all configured search providers
- **FR-008**: When a user selects a search provider from the dropdown, system MUST replace placeholders with actual album data and open the resulting URL in a new browser tab
- **FR-009**: System MUST properly URL-encode the artist name and album title when replacing placeholders to ensure valid URLs
- **FR-010**: System MUST persist search provider configurations so they remain available across application sessions
- **FR-011**: System MUST handle cases where album data (artist or title) is missing by replacing the placeholder with an empty string
- **FR-012**: When no search providers are configured, system MUST NOT display the search dropdown on missing album cards

### Key Entities

- **SearchProvider**: Represents a search destination configured by the user
  - Name: User-friendly display name (e.g., "Discogs", "MusicBrainz", "Local Record Store")
  - URL Template: A URL string containing optional placeholders {artist} and {album} that get replaced with actual values
  - Relationships: Many search providers can exist; each is independent

- **Album**: Existing entity representing an album in the user's collection
  - Status: Indicates whether the album is "missing" or "owned" (determines if search dropdown appears)
  - Artist: The artist/band name used for search placeholder replacement
  - Title: The album title used for search placeholder replacement

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can configure at least one search provider from the settings page
- **SC-002**: Users can successfully search for a missing album using any configured provider with a single click (select from dropdown)
- **SC-003**: Search URLs open in a new tab within 500ms of selecting a provider from the dropdown
- **SC-004**: 100% of search provider configurations persist correctly across application restarts
- **SC-005**: System correctly handles and encodes special characters (accents, punctuation, spaces) in 95%+ of real-world album/artist names
- **SC-006**: Users can manage (add/edit/delete) up to 20 search providers without performance degradation in the settings UI
