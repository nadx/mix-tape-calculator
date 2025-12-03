import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Search, Loader2, Music } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SongInputProps {
  onAddSong: (song: { name: string; artist: string; duration: number }) => void;
}

interface SpotifyTrack {
  songName: string;
  artist: string;
  duration: number;
  albumArt: string | null;
  albumName?: string;
  spotifyId?: string;
}

export function SongInput({ onAddSong }: SongInputProps) {
  const [songName, setSongName] = useState('');
  const [artist, setArtist] = useState('');
  const [manualDuration, setManualDuration] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[] | null>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);

  const handleFetchDuration = async () => {
    if (!songName.trim()) {
      setError('Please enter a song name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-20b8aa27/search-track`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            songName: songName.trim(),
            artist: artist.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      console.log('Spotify search response:', data);

      if (data.error) {
        setError(data.error);
        console.error('Spotify search error:', data.error);
      } else if (data.multiple && data.results && Array.isArray(data.results) && data.results.length > 1) {
        // Multiple results - show selection dialog
        console.log(`Showing dialog with ${data.results.length} results`, data.results);
        // Set results first, then dialog state
        setSearchResults(data.results);
        // Use setTimeout to ensure state updates in correct order
        setTimeout(() => {
          console.log('Setting dialog to open');
          setShowResultsDialog(true);
        }, 0);
      } else if (data.results && Array.isArray(data.results) && data.results.length > 1) {
        // Handle case where multiple results are returned but 'multiple' flag might be missing
        console.log(`Showing dialog with ${data.results.length} results (no multiple flag)`);
        setSearchResults(data.results);
        setShowResultsDialog(true);
      } else {
        // Single result - add directly (backward compatible)
        console.log('Adding single result directly');
        onAddSong({
          name: data.songName,
          artist: data.artist,
          duration: data.duration,
        });
        setSongName('');
        setArtist('');
        setManualDuration('');
        setError('');
      }
    } catch (err) {
      setError('Failed to fetch song duration. Please try again.');
      console.error('Error fetching song:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAdd = () => {
    if (!songName.trim()) {
      setError('Please enter a song name');
      return;
    }

    const duration = parseFloat(manualDuration);
    if (!manualDuration || isNaN(duration) || duration <= 0) {
      setError('Please enter a valid duration in seconds');
      return;
    }

    onAddSong({
      name: songName.trim(),
      artist: artist.trim() || 'Unknown Artist',
      duration: Math.round(duration),
    });

    setSongName('');
    setArtist('');
    setManualDuration('');
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  const handleSelectTrack = (track: SpotifyTrack) => {
    console.log('Selecting track:', track.songName);
    onAddSong({
      name: track.songName,
      artist: track.artist,
      duration: track.duration,
    });
    setSongName('');
    setArtist('');
    setManualDuration('');
    setError('');
    setSearchResults(null);
    setShowResultsDialog(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Debug: Log dialog state changes
  useEffect(() => {
    console.log('Dialog state changed:', showResultsDialog, 'Results:', searchResults?.length);
    if (showResultsDialog) {
      // Check if dialog element exists in DOM after a brief delay
      setTimeout(() => {
        const dialogElement = document.querySelector('[data-slot="dialog-content"]');
        const overlayElement = document.querySelector('[data-slot="dialog-overlay"]');
        console.log('Dialog element in DOM:', !!dialogElement, 'Overlay:', !!overlayElement);
        if (dialogElement) {
          const styles = window.getComputedStyle(dialogElement);
          console.log('Dialog visibility:', {
            display: styles.display,
            opacity: styles.opacity,
            visibility: styles.visibility,
            zIndex: styles.zIndex,
            transform: styles.transform,
            top: styles.top,
            left: styles.left,
            position: styles.position,
            backgroundColor: styles.backgroundColor,
          });
          console.log('Dialog data-state:', dialogElement.getAttribute('data-state'));
        }
      }, 100);
    }
  }, [showResultsDialog, searchResults]);

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="space-y-2">
        <Label htmlFor="song-name">Song Name</Label>
        <Input
          id="song-name"
          placeholder="Enter song name"
          value={songName}
          onChange={(e) => setSongName(e.target.value)}
          onKeyPress={(e) => handleKeyPress(e, handleFetchDuration)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="artist">Artist (optional)</Label>
        <Input
          id="artist"
          placeholder="Enter artist name"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          onKeyPress={(e) => handleKeyPress(e, handleFetchDuration)}
        />
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={handleFetchDuration} 
          disabled={isLoading || !songName.trim()}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Fetch from Spotify
            </>
          )}
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-300" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-50 px-2 text-slate-500">Or add manually</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="manual-duration">Duration (seconds)</Label>
        <div className="flex gap-2">
          <Input
            id="manual-duration"
            type="number"
            placeholder="e.g. 245"
            value={manualDuration}
            onChange={(e) => setManualDuration(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleManualAdd)}
            className="flex-1"
          />
          <Button 
            onClick={handleManualAdd}
            variant="outline"
            disabled={!songName.trim() || !manualDuration}
          >
            Add
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {error}
        </div>
      )}

      {/* Results Selection Dialog */}
      <Dialog 
        open={showResultsDialog} 
        onOpenChange={(open) => {
          console.log('Dialog onOpenChange called with:', open, 'Current state:', showResultsDialog);
          setShowResultsDialog(open);
        }}
        modal={true}
      >
        <DialogContent 
          className="max-w-2xl max-h-[80vh] !bg-white !text-slate-900 flex flex-col"
        >
            <DialogHeader className="flex-shrink-0 pb-4">
              <DialogTitle className="text-slate-900">Multiple Results Found</DialogTitle>
              <DialogDescription className="text-slate-600">
                Please select the correct song from the search results
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-2 -mr-2">
            {searchResults?.map((track, index) => (
              <button
                key={track.spotifyId || index}
                onClick={() => handleSelectTrack(track)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
              >
                {track.albumArt ? (
                  <img
                    src={track.albumArt}
                    alt={track.albumName || track.songName}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <Music className="h-6 w-6 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate text-sm">
                    {track.songName}
                  </div>
                  <div className="text-xs text-slate-600 truncate">
                    {track.artist}
                  </div>
                  {track.albumName && (
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {track.albumName}
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-600 tabular-nums flex-shrink-0">
                  {formatTime(track.duration)}
                </div>
              </button>
            ))}
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}