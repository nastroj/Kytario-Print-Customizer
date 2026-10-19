import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Check, X, ListFilter, Search, Eye, EyeOff } from 'lucide-react';
import { Song } from '../types';

interface SongSelectionModalProps {
  isOpen: boolean;
  songs: Song[];
  selectedSongIds: Set<string | number>;
  onToggleSong: (songId: string | number) => void;
  onToggleAll: (selectAll: boolean, targetSongs?: Song[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const ITEM_HEIGHT = 64; // Row height in px
const OVERSCAN = 8; // Extra buffer rows

export const SongSelectionModal: React.FC<SongSelectionModalProps> = ({
  isOpen,
  songs,
  selectedSongIds,
  onToggleSong,
  onToggleAll,
  onConfirm,
  onCancel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500); // Sensible default
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (!term) return lightSongs;
    return lightSongs.filter(s => 
      s.title.toLowerCase().includes(term) || 
      s.artist.toLowerCase().includes(term) ||
      String(s.originalIndex) === term
    );
  }, [lightSongs, searchTerm]);

  // Keep containerHeight measured dynamically
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      if (el.clientHeight > 100) {
        setContainerHeight(el.clientHeight);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Virtual windowing calculations with guaranteed fallbacks
  const totalCount = filteredSongs.length;
  const visibleCount = Math.max(8, Math.ceil(containerHeight / ITEM_HEIGHT));

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(totalCount, startIndex + visibleCount + (OVERSCAN * 2));

  const topSpacerHeight = startIndex * ITEM_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (totalCount - endIndex) * ITEM_HEIGHT);

  const visibleSongs = useMemo(() => {
    const slice = filteredSongs.slice(startIndex, endIndex);
    // Safety guard: if slice is empty but we have songs, show first page
    if (slice.length === 0 && filteredSongs.length > 0) {
      return filteredSongs.slice(0, 30);
    }
    return slice;
  }, [filteredSongs, startIndex, endIndex]);

  const allFilteredSelected = filteredSongs.length > 0 && filteredSongs.every(s => selectedSongIds.has(s.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border border-zinc-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-manager-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100 bg-zinc-50/80 shrink-0">
          <div>
            <h3 id="song-manager-title" className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-amber-600" />
              Manage Song Visibility
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Showing {filteredSongs.length} of {songs.length} songs &bull;{' '}
              <span className="font-semibold text-zinc-800">{selectedSongIds.size}</span> included in PDF
            </p>
          </div>
          <button 
            type="button"
            onClick={onCancel} 
            className="text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-xl p-1.5 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Bulk Selection Toolbar */}
        <div className="p-3 sm:p-4 bg-zinc-50/50 border-b border-zinc-100 flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, artist, or song number..."
              className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
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
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={() => {
                const selectAll = !allFilteredSelected;
                const originalMap = new Map(songs.map((s, idx) => [s.id !== undefined && s.id !== null ? s.id : idx + 1, s]));
                const targetOriginals = filteredSongs.map(ls => originalMap.get(ls.id)!).filter(Boolean);
                onToggleAll(selectAll, targetOriginals);
              }}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:scale-98 transition-all text-zinc-800 cursor-pointer border border-zinc-200/80"
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
          </div>
        </div>

        {/* High-Performance Virtualized Scroll Container */}
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 min-h-[340px] max-h-[55vh] overscroll-contain select-none"
        >
          {filteredSongs.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 text-xs">
              No songs found matching &ldquo;{searchTerm}&rdquo;
            </div>
          ) : (
            <div>
              {/* Top virtual spacer */}
              {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} aria-hidden="true" />}

              {/* Rendered visible slice */}
              <div className="space-y-1.5">
                {visibleSongs.map((song) => {
                  const isSelected = selectedSongIds.has(song.id);
                  return (
                    <div
                      key={song.id}
                      style={{ minHeight: ITEM_HEIGHT - 6 }}
                      onClick={() => onToggleSong(song.id)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-zinc-900 bg-zinc-900/[0.03] shadow-2xs hover:bg-zinc-900/[0.06]' 
                          : 'border-zinc-200 hover:bg-zinc-50 bg-white opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div 
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected 
                              ? 'bg-zinc-900 border-zinc-900 text-white' 
                              : 'border-zinc-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400 shrink-0 w-7">
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
                })}
              </div>

              {/* Bottom virtual spacer */}
              {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} aria-hidden="true" />}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-100 bg-zinc-50/80 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-zinc-500">
            <span className="font-bold text-zinc-900">{selectedSongIds.size}</span> of {songs.length} songs selected
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={onCancel} 
              className="px-3.5 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={onConfirm} 
              className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 active:scale-98 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
