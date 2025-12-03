// Spotify API integration for fetching track information

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
  const accessToken = await getSpotifyAccessToken();
  
  if (!accessToken) {
    return { 
      error: 'Spotify API credentials not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.' 
    };
  }

  try {
    // Build search query - prioritize the most specific query
    let bestQuery = songName;
    
    // If artist is provided, use the most specific query first
    if (artist && artist.trim()) {
      bestQuery = `track:${songName} artist:${artist}`;
    }
    
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(bestQuery)}&type=track&limit=10`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Spotify search error: ${response.status} - ${errorText}`);
      return { error: 'Failed to search Spotify. Please try again.' };
    }

    const data = await response.json();
    
    if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
      // Map all tracks to our format
      const tracks = data.tracks.items.map((track: any) => ({
        songName: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        duration: Math.round(track.duration_ms / 1000),
        albumArt: track.album.images[0]?.url || null,
        albumName: track.album.name,
        spotifyId: track.id,
      }));
      
      console.log(`Found ${tracks.length} track(s) for query: ${bestQuery}`);
      
      // Always return multiple results format if there are 2+ results
      if (tracks.length > 1) {
        return {
          results: tracks,
          multiple: true,
        };
      }
      
      // Single result - return it directly (backward compatible)
      return tracks[0];
    }
    
    // If we get here, no results were found
    return { error: 'Track not found on Spotify. Try different search terms or add manually.' };
  } catch (error) {
    console.log(`Error searching Spotify track: ${error}`);
    return { error: 'Failed to search for track' };
  }
}