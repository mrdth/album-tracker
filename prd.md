# Album Tracker – Functional Specification (PRD)
1. Overview

The Album Tracker is a local, single-user web application that allows a user to:

- Search for an artist via an external metadata source (e.g., MusicBrainz).
- Import the artist and their album discography into a local collection.
- Compare this discography with the user’s local filesystem, under a configurable library path.
- Track which albums the user owns vs. is missing, based on folder matching.
- The app is entirely local and does not require user accounts or cloud services.

2. Core Features
2.1 Artist Search

- User can search for an artist by name.
- The app queries an external music metadata API.
- Results display artist name and disambiguation if available.
- User selects an artist to import into the local collection.

2.2 Artist Import

When a user selects an artist:
- The app imports:
  - Artist metadata (name, MBID, etc.)
  - Album discography (release-groups, filtered to “Album” type)

- Album entries are stored locally with:
  - Title
  - Release year
  - MBID

User is taken to the Artist Detail page.

2.3 Filesystem Library Path Configuration

User sets a root music library path in Settings.

Path must be validated (existence and readability check).

All filesystem scans originate from this root.

2.4 Filesystem Scanning

The app scans the filesystem to determine which albums the user owns.

Scan triggered by:

Artist import (optional automatic scan)

Manual “Rescan” button on Artist Detail page

Scan logic:

Locate the artist folder using the app’s naming rules and/or previously linked folder.

Inspect subdirectories representing album folders.

Parse album folder names (e.g., [YYYY] Title) to identify year + title.

Match album folders to imported album metadata.

Mark each album as one of:

Owned

Missing

Ambiguous (optional; requires user resolution)

Stored scan results:

Ownership status

Matched folder path

Optional match confidence level

2.5 Artist Detail View

For each imported artist, the user can:

View all albums (grid or table):

Title

Release year

Ownership state (Owned / Missing / Ambiguous)

Filesystem path if owned

Trigger a filesystem rescan.

Manually override:

Mark album as owned or not owned

Select a specific folder for the album

Link or override the artist folder, if incorrect

User overrides persist and are not overwritten unless changed manually.

2.6 Collection Overview

A list of all imported artists.

For each artist:

Number of albums owned vs. total

Simple progress indicator

Quick link to Artist Detail page

2.7 Manual Overrides

To ensure reliability when filesystem naming varies, user can:

Select an artist folder manually

Choose a directory under the library root

All future scans use this folder

Select an album folder manually

Pick from child folders under the artist

Sets ownership to true for that album

Toggle ownership manually

Especially useful for custom or misnamed folders

2.8 Settings

Settings page includes:

Library root path input + validation

(Optional future) naming rule presets

(Optional future) include/exclude album types (live, compilations)

3. Naming Rules (Functional)

To support common patterns in real-world filesystem naming, the app applies the following logic when attempting automatic folder detection.

3.1 Artist Folder Naming Rules

Artist names may be normalized:

Safe character replacement (e.g., / → _)

Leading article movement:

"The 1975" → "1975, The"

Case-insensitive matching

Artist folders are located in a group directory based on first character:

= A = for A

= B = for B

…

= # = for any non-letter (digits, punctuation, symbols)

3.2 Album Folder Naming Rules

Album folders typically follow:

[YYYY] Title


Safe characters may be replaced with _

Some titles may be truncated with suffix like .._

Title matching is case-insensitive, punctuation-insensitive

4. Data Requirements (Functional Only)
4.1 Artist

ID (internal)

External artist ID (e.g., MBID)

Artist name

Disambiguation (if available)

Stored artist folder path (optional)

Total albums (computed)

Owned albums (computed)

4.2 Album

ID (internal)

Artist ID (internal)

External album ID (e.g., MBID)

Album title

Release year

Type / secondary type

Ownership status (Owned / Missing / Ambiguous)

Filesystem folder path (optional)

Match confidence (optional)

4.3 Settings

Library root path

(Optional) Naming rule flags

(Optional) Include/exclude secondary album types

5. Non-Functional Requirements

Local-first: No cloud storage, no remote dependencies except metadata API.

Single user: No login or authentication.

File-safe: App never modifies the filesystem; read-only scanning.

Resilient to inconsistent folder naming.

Metadata refresh-friendly:

User can re-import / refresh discographies without losing manual overrides.

6. Future Enhancements (Not Required for MVP)

Album artwork fetching

Multi-folder (multi-library) support

Playlist or “want list”

Export/import collection to JSON

Automatic periodic rescan scheduler

Multi-version/deluxe edition grouping
