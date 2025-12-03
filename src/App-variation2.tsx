import { useState } from 'react';
import { SongInput } from './components/SongInput';
import { TapeSide } from './components/TapeSide';
import { Button } from './components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Label } from './components/ui/label';
import { RadioGroup, RadioGroupItem } from './components/ui/radio-group';
import { RotateCcw } from 'lucide-react';
import mixtapeImage from 'figma:asset/9cef42a3913d9ff279e4e522c8890f8d19f449f6.png';

interface Song {
  id: string;
  name: string;
  artist: string;
  duration: number;
}

type TapeLength = '60' | '90';

export default function App() {
  const [tapeLength, setTapeLength] = useState<TapeLength>('60');
  const [sideASongs, setSideASongs] = useState<Song[]>([]);
  const [sideBSongs, setSideBSongs] = useState<Song[]>([]);
  const [activeSide, setActiveSide] = useState<'A' | 'B'>('A');

  const maxDurationPerSide = tapeLength === '60' ? 30 * 60 : 45 * 60; // in seconds

  const handleAddSong = (song: { name: string; artist: string; duration: number }) => {
    const newSong: Song = {
      id: Date.now().toString() + Math.random().toString(36),
      ...song,
    };

    if (activeSide === 'A') {
      setSideASongs([...sideASongs, newSong]);
    } else {
      setSideBSongs([...sideBSongs, newSong]);
    }
  };

  const handleRemoveSong = (songId: string, side: 'A' | 'B') => {
    if (side === 'A') {
      setSideASongs(sideASongs.filter(song => song.id !== songId));
    } else {
      setSideBSongs(sideBSongs.filter(song => song.id !== songId));
    }
  };

  const handleClearTape = () => {
    if (confirm('Are you sure you want to clear all songs from both sides?')) {
      setSideASongs([]);
      setSideBSongs([]);
    }
  };

  const handleClearSide = (side: 'A' | 'B') => {
    if (confirm(`Are you sure you want to clear all songs from Side ${side}?`)) {
      if (side === 'A') {
        setSideASongs([]);
      } else {
        setSideBSongs([]);
      }
    }
  };

  const getTotalTime = (side: 'A' | 'B') => {
    const songs = side === 'A' ? sideASongs : sideBSongs;
    return songs.reduce((sum, song) => sum + song.duration, 0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Compact Header with Side Image */}
        <div className="grid md:grid-cols-[300px_1fr] gap-6 items-start">
          <div className="relative overflow-hidden rounded-xl shadow-lg">
            <img 
              src={mixtapeImage} 
              alt="Mixtape Calculator" 
              className="w-full h-auto object-cover"
            />
          </div>
          
          <div className="space-y-4">
            <div>
              <h1 className="text-slate-900 mb-2">Vinyl Mixtape Maker</h1>
              <p className="text-slate-600">
                Create the perfect mixtape from your vinyl collection with automatic Spotify duration lookup
              </p>
            </div>

            {/* Tape Length Selector */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <Label className="mb-3 block">Tape Length</Label>
              <RadioGroup value={tapeLength} onValueChange={(value) => setTapeLength(value as TapeLength)}>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="60" id="60min" />
                    <Label htmlFor="60min" className="cursor-pointer">
                      60 minutes (30 min/side)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="90" id="90min" />
                    <Label htmlFor="90min" className="cursor-pointer">
                      90 minutes (45 min/side)
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Song Input */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2>Add Songs to Side {activeSide}</h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={activeSide === 'A' ? 'default' : 'outline'}
                    onClick={() => setActiveSide('A')}
                  >
                    Side A
                  </Button>
                  <Button
                    size="sm"
                    variant={activeSide === 'B' ? 'default' : 'outline'}
                    onClick={() => setActiveSide('B')}
                  >
                    Side B
                  </Button>
                </div>
              </div>
              <SongInput onAddSong={handleAddSong} />
            </div>

            {/* Summary */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
              <h3>Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Side A:</span>
                  <span>{sideASongs.length} songs, {formatTime(getTotalTime('A'))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Side B:</span>
                  <span>{sideBSongs.length} songs, {formatTime(getTotalTime('B'))}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between">
                  <span>Total:</span>
                  <span>{sideASongs.length + sideBSongs.length} songs, {formatTime(getTotalTime('A') + getTotalTime('B'))}</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleClearTape}
                disabled={sideASongs.length === 0 && sideBSongs.length === 0}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            </div>
          </div>

          {/* Tape Sides */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <Tabs value={activeSide} onValueChange={(value) => setActiveSide(value as 'A' | 'B')}>
              <div className="border-b border-slate-200 px-4 pt-4">
                <TabsList className="w-full">
                  <TabsTrigger value="A" className="flex-1">
                    Side A ({sideASongs.length})
                  </TabsTrigger>
                  <TabsTrigger value="B" className="flex-1">
                    Side B ({sideBSongs.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="A" className="p-4 space-y-4">
                <TapeSide
                  side="A"
                  songs={sideASongs}
                  maxDuration={maxDurationPerSide}
                  onRemoveSong={(songId) => handleRemoveSong(songId, 'A')}
                />
                {sideASongs.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleClearSide('A')}
                  >
                    Clear Side A
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="B" className="p-4 space-y-4">
                <TapeSide
                  side="B"
                  songs={sideBSongs}
                  maxDuration={maxDurationPerSide}
                  onRemoveSong={(songId) => handleRemoveSong(songId, 'B')}
                />
                {sideBSongs.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleClearSide('B')}
                  >
                    Clear Side B
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
