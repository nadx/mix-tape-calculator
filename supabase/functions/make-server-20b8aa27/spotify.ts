// Spotify API integration for fetching track information
import { tracer, SpanKind, ATTR, setSpanError, setSpanSuccess } from "./tracing.ts";

let spotifyAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * Get Spotify access token using Client Credentials flow
 */
async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.log('Missing Spotify credentials: SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not set');
    return null;
  }

  // Return cached token if still valid
  if (spotifyAccessToken && Date.now() < tokenExpiryTime) {
    return spotifyAccessToken;
  }

  try {
    const credentials = btoa(`${clientId}:${clientSecret}`);
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Spotify token error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    spotifyAccessToken = data.access_token;
    // Set expiry time to 5 minutes before actual expiry for safety
    tokenExpiryTime = Date.now() + (data.expires_in - 300) * 1000;
    
    return spotifyAccessToken;
  } catch (error) {
    console.log(`Error getting Spotify access token: ${error}`);
    return null;
  }
}

/**
 * Search for a track on Spotify and return all matching results
 */
export async function searchSpotifyTrack(songName: string, artist?: string) {
  return tracer.startActiveSpan("spotify.search_track", {
    kind: SpanKind.CLIENT,
    attributes: {
      [ATTR.HTTP_REQUEST_METHOD]: "GET",
      [ATTR.SERVER_ADDRESS]: "api.spotify.com",
      [ATTR.PEER_SERVICE]: "spotify",
      "spotify.search.song_name": songName,
      "spotify.search.artist": artist || "",
    },
  }, async (span) => {
    const accessToken = await getSpotifyAccessToken();
    
    if (!accessToken) {
      setSpanError(span, "Spotify API credentials not configured", "configuration_error");
      return { 
        error: 'Spotify API credentials not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.' 
      };
    }

    try {
      let bestQuery = songName;
      if (artist && artist.trim()) {
        bestQuery = `track:${songName} artist:${artist}`;
      }
      
      const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(bestQuery)}&type=track&limit=10`;
      span.setAttribute(ATTR.URL_FULL, searchUrl);
      
      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      span.setAttribute(ATTR.HTTP_RESPONSE_STATUS_CODE, response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`Spotify search error: ${response.status} - ${errorText}`);
        setSpanError(span, `Spotify API error: ${response.status}`, "api_error");
        return { error: 'Failed to search Spotify. Please try again.' };
      }

      const data = await response.json();
      
      if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
        const tracks = data.tracks.items.map((track: any) => ({
          songName: track.name,
          artist: track.artists.map((a: any) => a.name).join(', '),
          duration: Math.round(track.duration_ms / 1000),
          albumArt: track.album.images[0]?.url || null,
          albumName: track.album.name,
          spotifyId: track.id,
        }));
        
        span.setAttribute("spotify.search.result_count", tracks.length);
        setSpanSuccess(span);
        console.log(`Found ${tracks.length} track(s) for query: ${bestQuery}`);
        
        if (tracks.length > 1) {
          return {
            results: tracks,
            multiple: true,
          };
        }
        return tracks[0];
      }
      
      span.setAttribute("spotify.search.result_count", 0);
      setSpanError(span, "Track not found", "not_found");
      return { error: 'Track not found on Spotify. Try different search terms or add manually.' };
    } catch (error) {
      console.log(`Error searching Spotify track: ${error}`);
      setSpanError(span, error, "network_error");
      return { error: 'Failed to search for track' };
    }
  });
}