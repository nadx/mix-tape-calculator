import { Trash2, Music, GripVertical } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Song {
  id: string;
  name: string;
  artist: string;
  duration: number;
}

interface TapeSideProps {
  side: 'A' | 'B';
  songs: Song[];
  maxDuration: number;
  onRemoveSong: (songId: string) => void;
  onReorderSongs?: (newOrder: Song[]) => void;
}

interface SortableSongItemProps {
  song: Song;
  index: number;
  onRemoveSong: (songId: string) => void;
  formatTime: (seconds: number) => string;
}

function SortableSongItem({ song, index, onRemoveSong, formatTime }: SortableSongItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors group"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="flex-shrink-0 w-6 text-slate-400 text-sm">
        {index + 1}.
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate">
          {song.name}
        </div>
        <div className="text-sm text-slate-500 truncate">
          {song.artist}
        </div>
      </div>
      <div className="flex-shrink-0 text-sm text-slate-600 tabular-nums">
        {formatTime(song.duration)}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemoveSong(song.id)}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}

export function TapeSide({ side, songs, maxDuration, onRemoveSong, onReorderSongs }: TapeSideProps) {
  const totalDuration = songs.reduce((sum, song) => sum + song.duration, 0);
  const remainingTime = maxDuration - totalDuration;
  const percentUsed = (totalDuration / maxDuration) * 100;
  const isOverLimit = totalDuration > maxDuration;
  const isNearLimit = percentUsed > 90 && !isOverLimit;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onReorderSongs) {
      const oldIndex = songs.findIndex((song) => song.id === active.id);
      const newIndex = songs.findIndex((song) => song.id === over.id);
      
      // Safety check: ensure both indices are valid
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(songs, oldIndex, newIndex);
        onReorderSongs(newOrder);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2">
          Side {side}
        </h3>
        <div className={`text-sm ${isOverLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-slate-600'}`}>
          {formatTime(totalDuration)} / {formatTime(maxDuration)}
        </div>
      </div>

      <div className="space-y-2">
        <Progress 
          value={Math.min(percentUsed, 100)} 
          className={`h-2 ${isOverLimit ? '[&>div]:bg-red-500' : isNearLimit ? '[&>div]:bg-amber-500' : ''}`}
        />
        <div className="flex justify-between text-xs">
          <span className={isOverLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-slate-600'}>
            {remainingTime >= 0 ? 'Remaining' : 'Over limit'}: {formatTime(remainingTime)}
          </span>
          <span className="text-slate-500">
            {percentUsed.toFixed(1)}% used
          </span>
        </div>
      </div>

      {isOverLimit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">
            ⚠️ This side is {formatTime(Math.abs(remainingTime))} over the limit. Remove some songs.
          </p>
        </div>
      )}

      {isNearLimit && !isOverLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            ⚠️ Almost full! Only {formatTime(remainingTime)} remaining.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {songs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No songs added yet</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={songs.map((song) => song.id)}
              strategy={verticalListSortingStrategy}
            >
              {songs.map((song, index) => (
                <SortableSongItem
                  key={song.id}
                  song={song}
                  index={index}
                  onRemoveSong={onRemoveSong}
                  formatTime={formatTime}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
