import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Check, X, ListFilter, Search, Eye, EyeOff, CheckCheck, XCircle, AlertCircle, ArrowDownWideNarrow } from 'lucide-react';
import { Song } from '../types';

interface SongSelectionModalProps {
  isOpen: boolean;
  songs: Song[];
  selectedSongIds: Set<string | number>;
  onApply: (selectedSongIds: Set<string | number>) => void;
  onCancel: () => void;
}

type SortOption = 'title' | 'artist' | 'original';

export const SongSelectionModal: React.FC<SongSelectionModalProps> = ({
  isOpen,
  songs,
  selectedSongIds,
  onApply,
  onCancel,
}) => {
  // Local staged selection state for 0ms instantaneous UI clicks and zero lag
  const [draftSelectedIds, setDraftSelectedIds] = useState<Set<string | number>>(() => new Set(selectedSongIds));
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('original');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync draft state with incoming selectedSongIds when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftSelectedIds(new Set(selectedSongIds));
      setSearchTerm('');
      setSortOption('original');
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, selectedSongIds]);

  // Extract lightweight song references
  const lightSongs = useMemo(() => {
    return (songs || []).map((s, idx) => {
      const id = s.id !== undefined && s.id !== null ? s.id : idx + 1;
      return {
        id,
        title: s.title || s.name || `Song ${idx + 1}`,
        artist: s.artist || s.author || '',
        originalIndex: idx + 1,
      };
    });
  }, [songs]);

  const filteredSongs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let result = lightSongs;
    if (term) {
      result = result.filter(s => 
        s.title.toLowerCase().includes(term) || 
        s.artist.toLowerCase().includes(term) ||
        String(s.originalIndex) === term
      );
    }
    
    // Sort
    return [...result].sort((a, b) => {
      if (sortOption === 'title') return a.title.localeCompare(b.title);
      if (sortOption === 'artist') return a.artist.localeCompare(b.artist);
      return a.originalIndex - b.originalIndex;
    });
  }, [lightSongs, searchTerm, sortOption]);

  // Instant local toggle (0ms latency, does not trigger expensive preview re-renders)
  const handleToggleSong = useCallback((id: string | number) => {
    setDraftSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Quick batch actions
  const handleSelectAll = useCallback(() => {
    setDraftSelectedIds(new Set(lightSongs.map(s => s.id)));
  }, [lightSongs]);

  const handleDeselectAll = useCallback(() => {
    setDraftSelectedIds(new Set());
  }, []);

  const allFilteredSelected = filteredSongs.length > 0 && filteredSongs.every(s => draftSelectedIds.has(s.id));

  const handleToggleFiltered = useCallback(() => {
    setDraftSelectedIds(prev => {
      const next = new Set(prev);
      const shouldSelect = !allFilteredSelected;
      filteredSongs.forEach(s => {
        if (shouldSelect) next.add(s.id);
        else next.delete(s.id);
      });
      return next;
    });
  }, [allFilteredSelected, filteredSongs]);

  const handleApply = useCallback(() => {
    if (draftSelectedIds.size === 0) return;
    onApply(draftSelectedIds);
  }, [onApply, draftSelectedIds]);

  // Check if draft has modifications compared to original
  const hasChanges = useMemo(() => {
    if (draftSelectedIds.size !== selectedSongIds.size) return true;
    for (const id of draftSelectedIds) {
      if (!selectedSongIds.has(id)) return true;
    }
    return false;
  }, [draftSelectedIds, selectedSongIds]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-zinc-950/70 backdrop-blur-md animate-in fade-in duration-200"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[92dvh] sm:h-[85vh] sm:max-h-[85vh] max-h-[95dvh] flex flex-col overflow-hidden border border-zinc-200/90 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-manager-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 sm:px-5 border-b border-zinc-100 bg-zinc-50/90 shrink-0">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 id="song-manager-title" className="text-sm sm:text-base font-bold text-zinc-900 flex items-center gap-2 truncate">
                <ListFilter className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                <span>Manage Song Visibility</span>
              </h3>
              {hasChanges && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                  Unsaved changes
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5 truncate">
              Showing {filteredSongs.length} of {songs.length} songs &bull;{' '}
              <span className="font-semibold text-zinc-800">{draftSelectedIds.size}</span> included in PDF
            </p>
          </div>
          <button 
            type="button"
            onClick={onCancel} 
            className="text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-xl p-1.5 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner if 0 songs selected */}
        {draftSelectedIds.size === 0 && (
          <div className="bg-red-50 border-b border-red-200 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 text-red-700 text-xs font-semibold shrink-0 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>Songbook cannot be empty. Please select at least one song to continue.</span>
          </div>
        )}

        {/* Search & Sorting Toolbar */}
        <div className="p-2.5 sm:p-3.5 bg-zinc-50/50 border-b border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <div className="relative flex-1 w-full flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-white border border-zinc-200 rounded-xl pl-8 pr-7 py-1.5 sm:py-2 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (containerRef.current) {
                    containerRef.current.scrollTop = 0;
                  }
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative w-28 sm:w-32 shrink-0">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full h-8 sm:h-9 bg-white border border-zinc-200 rounded-xl pl-7 pr-2 py-1 sm:py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all cursor-pointer appearance-none text-zinc-700 font-medium"
              >
                <option value="original">Original</option>
                <option value="title">By Title</option>
                <option value="artist">By Artist</option>
              </select>
              <ArrowDownWideNarrow className="absolute left-2.5 top-2 sm:top-2.5 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end shrink-0">
            {searchTerm ? (
              <button
                type="button"
                onClick={handleToggleFiltered}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-1.5 sm:py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:scale-98 transition-all text-zinc-800 cursor-pointer border border-zinc-200/80"
              >
                {allFilteredSelected ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-zinc-600" />
                    <span>Hide Filtered</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-zinc-600" />
                    <span>Show Filtered</span>
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1 text-xs font-bold px-2.5 py-1.5 sm:py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:scale-98 transition-all text-zinc-800 cursor-pointer border border-zinc-200/80"
                  title="Include all songs"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-zinc-600" />
                  <span>All</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1 text-xs font-bold px-2.5 py-1.5 sm:py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:scale-98 transition-all text-zinc-800 cursor-pointer border border-zinc-200/80"
                  title="Hide all songs"
                >
                  <XCircle className="w-3.5 h-3.5 text-zinc-600" />
                  <span>None</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Clean, Jitter-Free Scroll Container */}
        <div 
          ref={containerRef}
          className="flex-1 min-h-0 overflow-y-auto px-2.5 sm:px-4 py-2 space-y-1.5 overscroll-contain select-none"
        >
          {filteredSongs.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 text-xs">
              No songs found matching &ldquo;{searchTerm}&rdquo;
            </div>
          ) : (
            filteredSongs.map((song) => {
              const isSelected = draftSelectedIds.has(song.id);
              return (
                <div
                  key={song.id}
                  onClick={() => handleToggleSong(song.id)}
                  className={`flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-zinc-900 bg-zinc-900/[0.03] shadow-2xs hover:bg-zinc-900/[0.06]' 
                      : 'border-zinc-200 hover:bg-zinc-50 bg-white opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div 
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                        isSelected 
                          ? 'bg-zinc-900 border-zinc-900 text-white' 
                          : 'border-zinc-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400 shrink-0 w-6 sm:w-7">
                      #{song.originalIndex}
                    </span>
                    <div className="min-w-0">
                      <p className={`font-bold text-xs truncate ${isSelected ? 'text-zinc-900' : 'text-zinc-500'}`}>
                        {song.title}
                      </p>
                      {song.artist && (
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {song.artist}
                        </p>
                      )}
                    </div>
                  </div>
                  <span 
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ml-2 ${
                      isSelected 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                        : 'bg-zinc-100 text-zinc-400'
                    }`}
                  >
                    {isSelected ? 'Included' : 'Hidden'}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Footer - Always Visible on All Devices & Resolutions */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 bg-zinc-50/95 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-10">
          <div className="text-xs text-zinc-500 w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 shrink-0">
            <div>
              <span className={`font-bold ${draftSelectedIds.size === 0 ? 'text-red-600' : 'text-zinc-950'}`}>
                {draftSelectedIds.size}
              </span>{' '}
              of {songs.length} songs selected
            </div>
            {draftSelectedIds.size === 0 && (
              <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md animate-pulse">
                Select at least 1 song
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
            <button 
              type="button"
              onClick={onCancel} 
              className="flex-1 sm:flex-initial px-4 py-2.5 min-h-[42px] text-xs sm:text-sm font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 rounded-xl transition-all duration-200 cursor-pointer text-center flex items-center justify-center"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleApply}
              disabled={draftSelectedIds.size === 0}
              className={`flex-1 sm:flex-initial px-5 py-2.5 min-h-[42px] text-xs sm:text-sm font-bold text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 text-center ${
                draftSelectedIds.size === 0
                  ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed opacity-70 shadow-none'
                  : 'bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 cursor-pointer'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Apply Selection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
