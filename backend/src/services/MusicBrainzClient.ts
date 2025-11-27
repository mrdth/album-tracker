// MusicBrainzClient.ts

export interface ArtistResult {
  name: string;
  sort_name: string | undefined;
  disambiguation: string | undefined;
  mbid: string;
  score?: number;
}

export interface AlbumResult {
  title: string;
  disambiguation: string | undefined;
  release_date: string | undefined;
  mbid: string;
}

interface MusicBrainzArtist {
  id: string;
  name: string;
  "sort-name"?: string;
  disambiguation?: string;
  score?: number;
}

interface MusicBrainzAlbum {
  id: string;
  title: string;
  disambiguation?: string;
  "first-release-date"?: string;
  "secondary-types"?: string[];
}

interface ArtistSearchResponse {
  artists?: MusicBrainzArtist[];
}

interface ReleaseGroupResponse {
  "release-groups"?: MusicBrainzAlbum[];
}

export class MusicBrainzClient {
  private userAgent = "MrdthMusicInfo/0.0.1 ( mrdth@zeventien.org )";
  private apiBase = "https://musicbrainz.org/ws/2/";

  constructor(
    // Allow injection for testing or environments without global fetch
    private fetchImpl: typeof fetch = fetch,
  ) {}

  /**
   * Search for artists by name.
   */
  async artistSearch(searchTerm: string): Promise<ArtistResult[]> {
    // Ensure the search term is safely encoded
    const encoded = encodeURIComponent(searchTerm);
    const response = await this.doQuery<ArtistSearchResponse>(
      `artist?query=${encoded}`,
    );

    const artists = response.artists ?? [];

    return artists
      .slice()
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((artist) => ({
        name: artist.name,
        sort_name: artist["sort-name"],
        disambiguation: artist.disambiguation,
        mbid: artist.id,
        score: artist.score,
      }));
  }

  /**
   * Get album release-groups for the given artist MBID.
   */
  async getAlbums(mbId: string): Promise<AlbumResult[]> {
    const query = `release-group?artist=${encodeURIComponent(
      mbId,
    )}&type=album&limit=100`;

    const response = await this.doQuery<ReleaseGroupResponse>(query);

    const groups = response["release-groups"] ?? [];

    return (
      groups
        // Filter out things with secondary types
        .filter((album) => (album["secondary-types"] ?? []).length === 0)
        // Sort by first-release-date (ISO date strings sort chronologically)
        .slice()
        .sort((a, b) => {
          const da = a["first-release-date"] ?? "";
          const db = b["first-release-date"] ?? "";
          if (da === db) return 0;
          if (!da) return 1; // push undated to the end
          if (!db) return -1;
          return da.localeCompare(db);
        })
        .map((album) => ({
          title: album.title,
          disambiguation: album.disambiguation,
          release_date: album["first-release-date"],
          mbid: album.id,
        }))
    );
  }

  /**
   * Low-level query helper with error handling.
   */
  private async doQuery<T = unknown>(query: string): Promise<T> {
    const url = `${this.apiBase}${query}${
      query.includes("?") ? "&" : "?"
    }fmt=json`;

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          "User-Agent": this.userAgent,
          Accept: "application/json",
        },
      });
    } catch (err) {
      // Network-level or fetch-level error
      throw new Error(
        `Network error when calling MusicBrainz: ${(err as Error).message}`,
      );
    }

    // HTTP-level error handling
    if (!res.ok) {
      let bodyText: string | undefined;
      try {
        bodyText = await res.text();
      } catch {
        // ignore secondary error
      }

      const snippet =
        bodyText && bodyText.length > 300
          ? bodyText.slice(0, 300) + "..."
          : bodyText;

      throw new Error(
        `MusicBrainz API error: ${res.status} ${res.statusText}${
          snippet ? ` - ${snippet}` : ""
        }`,
      );
    }

    // JSON parse error handling
    try {
      const json = (await res.json()) as T;
      return json;
    } catch (err) {
      throw new Error(
        `Failed to parse MusicBrainz response as JSON: ${(err as Error).message}`,
      );
    }
  }
}
