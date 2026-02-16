import { useState } from 'react';
import { SongInput } from './components/SongInput';
import { TapeSide } from './components/TapeSide';
import { Button } from './components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Label } from './components/ui/label';
import { RadioGroup, RadioGroupItem } from './components/ui/radio-group';
import { Textarea } from './components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { RotateCcw, Sparkles, Copy, RefreshCw } from 'lucide-react';
import mixtapeImage from './assets/9cef42a3913d9ff279e4e522c8890f8d19f449f6.png';
import { trace, SpanStatusCode } from '@opentelemetry/api';

interface Song {
  id: string;
  name: string;
  artist: string;
  duration: number;
}

type TapeLength = '60' | '90';

const PREDEFINED_WORDS = [
  'night', 'vibes', 'sessions', 'chill', 'groove', 'beats', 'jams', 'flow', 'mix', 'remix',
  'classic', 'deep', 'smooth', 'laidback', 'late', 'sunrise', 'sunset', 'drive', 'party',
  'lounge', 'acoustic', 'unplugged', 'soulful', 'electric', 'mellow', 'fresh', 'underground',
  'club', 'dance', 'radio', 'extended', 'version', 'DJ', 'summer', 'winter', 'workout',
  'throwback', 'retro', 'hits', 'essentials'
];

export default function App() {
  const tracer = trace.getTracer('mixtape-creator-tool');
  const [tapeLength, setTapeLength] = useState<TapeLength>('60');
  const [sideASongs, setSideASongs] = useState<Song[]>([]);
  const [sideBSongs, setSideBSongs] = useState<Song[]>([]);
  const [activeSide, setActiveSide] = useState<'A' | 'B'>('A');
  const [keywords, setKeywords] = useState<string>('');
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);

  const maxDurationPerSide = tapeLength === '60' ? 30 * 60 : 45 * 60; // in seconds

  const validateDurationForSide = (songs: Song[], side: 'A' | 'B') => {
    const span = tracer.startSpan('mixtape.validate_duration', {
      attributes: {
        'mixtape.side': side,
        'mixtape.song_count': songs.length,
      },
    });
    const durationSeconds = songs.reduce((sum, currentSong) => sum + currentSong.duration, 0);
    const isOverLimit = durationSeconds > maxDurationPerSide;
    span.setAttribute('mixtape.duration_seconds', durationSeconds);
    span.setAttribute('mixtape.max_duration_seconds', maxDurationPerSide);
    span.setAttribute('mixtape.over_limit', isOverLimit);
    span.setStatus({
      code: isOverLimit ? SpanStatusCode.ERROR : SpanStatusCode.OK,
      message: isOverLimit ? 'side_over_limit' : undefined,
    });
    span.end();
  };

  const handleAddSong = (song: { name: string; artist: string; duration: number }) => {
    const span = tracer.startSpan('mixtape.add_song', {
      attributes: {
        'song.name': song.name,
        'song.artist': song.artist,
        'song.duration_seconds': song.duration,
        'mixtape.side': activeSide,
        'user.action': 'add_song',
      },
    });

    const newSong: Song = {
      id: Date.now().toString() + Math.random().toString(36),
      ...song,
    };

    if (activeSide === 'A') {
      const updated = [...sideASongs, newSong];
      setSideASongs(updated);
      validateDurationForSide(updated, 'A');
      span.setAttribute('mixtape.side_song_count', updated.length);
    } else {
      const updated = [...sideBSongs, newSong];
      setSideBSongs(updated);
      validateDurationForSide(updated, 'B');
      span.setAttribute('mixtape.side_song_count', updated.length);
    }

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  };

  const handleRemoveSong = (songId: string, side: 'A' | 'B') => {
    const span = tracer.startSpan('mixtape.remove_song', {
      attributes: {
        'song.id': songId,
        'mixtape.side': side,
        'user.action': 'remove_song',
      },
    });

    if (side === 'A') {
      const updated = sideASongs.filter(song => song.id !== songId);
      setSideASongs(updated);
      validateDurationForSide(updated, 'A');
      span.setAttribute('mixtape.side_song_count', updated.length);
    } else {
      const updated = sideBSongs.filter(song => song.id !== songId);
      setSideBSongs(updated);
      validateDurationForSide(updated, 'B');
      span.setAttribute('mixtape.side_song_count', updated.length);
    }

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  };

  const handleReorderSongs = (newOrder: Song[], side: 'A' | 'B') => {
    if (side === 'A') {
      setSideASongs(newOrder);
    } else {
      setSideBSongs(newOrder);
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

  const generateTitles = () => {
    const allSongs = [...sideASongs, ...sideBSongs];
    if (allSongs.length === 0) {
      setGeneratedTitles(['Add some songs to generate titles!']);
      return;
    }

    // Extract words from song titles and artists
    const songWords: string[] = [];
    allSongs.forEach(song => {
      const titleWords = song.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const artistWords = song.artist.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      songWords.push(...titleWords, ...artistWords);
    });

    // Combine with user keywords
    const userKeywords = keywords.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const allKeywords = [...songWords, ...userKeywords, ...PREDEFINED_WORDS];

    // Generate title variations
    const titles: string[] = [];
    const patterns = [
      // Pattern: [word] + [word] + Mix/Collection
      () => {
        const w1 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        const w2 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        return `${w1.charAt(0).toUpperCase() + w1.slice(1)} ${w2.charAt(0).toUpperCase() + w2.slice(1)} Mix`;
      },
      // Pattern: [word] Sessions
      () => {
        const w = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        return `${w.charAt(0).toUpperCase() + w.slice(1)} Sessions`;
      },
      // Pattern: [word] Vibes
      () => {
        const w = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        return `${w.charAt(0).toUpperCase() + w.slice(1)} Vibes`;
      },
      // Pattern: [word] + [word] + Collection
      () => {
        const w1 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        const w2 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        return `${w1.charAt(0).toUpperCase() + w1.slice(1)} ${w2.charAt(0).toUpperCase() + w2.slice(1)} Collection`;
      },
      // Pattern: [word] + [word] + Jams
      () => {
        const w1 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        const w2 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        return `${w1.charAt(0).toUpperCase() + w1.slice(1)} ${w2.charAt(0).toUpperCase() + w2.slice(1)} Jams`;
      },
      // Pattern: [word] + [word] + Beats
      () => {
        const w1 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        const w2 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        return `${w1.charAt(0).toUpperCase() + w1.slice(1)} ${w2.charAt(0).toUpperCase() + w2.slice(1)} Beats`;
      },
      // Pattern: [word] Essentials
      () => {
        const w = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        return `${w.charAt(0).toUpperCase() + w.slice(1)} Essentials`;
      },
      // Pattern: [word] + [word] + Flow
      () => {
        const w1 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        const w2 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        return `${w1.charAt(0).toUpperCase() + w1.slice(1)} ${w2.charAt(0).toUpperCase() + w2.slice(1)} Flow`;
      },
      // Pattern: [word] + [word] + Groove
      () => {
        const w1 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        const w2 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        return `${w1.charAt(0).toUpperCase() + w1.slice(1)} ${w2.charAt(0).toUpperCase() + w2.slice(1)} Groove`;
      },
      // Pattern: [word] + [word] + [word] Mix
      () => {
        const w1 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        const w2 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        const w3 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
        return `${w1.charAt(0).toUpperCase() + w1.slice(1)} ${w2.charAt(0).toUpperCase() + w2.slice(1)} ${w3.charAt(0).toUpperCase() + w3.slice(1)} Mix`;
      },
    ];

    // Generate 8 unique titles
    const generated = new Set<string>();
    let attempts = 0;
    while (generated.size < 8 && attempts < 100) {
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      const title = pattern();
      if (!generated.has(title)) {
        generated.add(title);
        titles.push(title);
      }
      attempts++;
    }

    setGeneratedTitles(Array.from(generated));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
                  onReorderSongs={(newOrder) => handleReorderSongs(newOrder, 'A')}
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
                  onReorderSongs={(newOrder) => handleReorderSongs(newOrder, 'B')}
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

        {/* Title Generator */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <CardTitle>Mixtape Title Generator</CardTitle>
            </div>
            <CardDescription>
              Generate creative titles for your mixtape based on your songs and keywords
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords / Mood / Theme</Label>
              <Textarea
                id="keywords"
                placeholder="e.g., summer nights, road trip, workout, relaxing..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <p className="text-xs text-slate-500">
                Enter words that describe the mood, theme, or vibe of your mixtape. These will be combined with your song titles and artists to generate creative titles.
              </p>
            </div>

            <Button
              onClick={generateTitles}
              className="w-full"
              disabled={sideASongs.length === 0 && sideBSongs.length === 0}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Titles
            </Button>

            {generatedTitles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Generated Titles</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateTitles}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Regenerate
                  </Button>
                </div>
                <div className="grid gap-2">
                  {generatedTitles.map((title, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <span className="font-medium text-slate-900">{title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(title)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
