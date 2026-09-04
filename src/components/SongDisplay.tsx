import React, { useEffect, useRef, useMemo, memo } from 'react';
import { Song, PrintSettings } from '../types';
import { parseSongContent, computeSmartFitScale } from '../utils';

interface SongDisplayProps {
  key?: React.Key;
  song: Song;
  index: number;
  settings: PrintSettings;
}

export const SongDisplay = memo(function SongDisplay({ song, index, settings }: SongDisplayProps) {
  const title = song.title || song.name || 'Unknown Title';
  const artist = song.artist || song.author || song.interpreter || '';
  const text = song.text || song.content || song.lyrics || '';

  const containerRef = useRef<HTMLDivElement>(null);
  const sections = useMemo(() => parseSongContent(text), [text]);

  // Fast analytical scale calculation (O(1), zero DOM reading, zero while-loops)
  const computedScale = useMemo(() => {
    return computeSmartFitScale(sections, settings, Boolean(title), Boolean(artist));
  }, [
    sections,
    settings.smartFit,
    settings.pageFormat,
    settings.orientation,
    settings.columns,
    settings.titleFontSize,
    settings.artistFontSize,
    settings.lyricsFontSize,
    settings.chordsFontSize,
    settings.showChords,
    title,
    artist,
  ]);

  // Direct single-pass fine adjustment if actual DOM overflows slightly due to rare font metrics
  useEffect(() => {
    if (!settings.smartFit || !containerRef.current) return;
    const el = containerRef.current;
    const pageContainer = el.closest('.print-page-container') as HTMLElement;
    if (!pageContainer) return;

    const rafId = requestAnimationFrame(() => {
      if (!el || !pageContainer) return;
      const scrollH = pageContainer.scrollHeight;
      const clientH = pageContainer.clientHeight;
      if (scrollH > clientH + 4) {
        const ratio = clientH / scrollH;
        const fineScale = Math.max(0.50, Math.round(computedScale * ratio * 0.97 * 100) / 100);
        el.style.setProperty('--song-scale', fineScale.toString());
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [computedScale, settings.smartFit]);

  const colCount = settings.columns || 2;

  const hasAnyMarkers = useMemo(() => {
    return sections.some((s) => Boolean(s.marker && s.marker.trim()));
  }, [sections]);

  const markerColWidth = useMemo(() => {
    if (!hasAnyMarkers) return '0em';
    let maxLen = 0;
    for (const s of sections) {
      if (s.marker) {
        maxLen = Math.max(maxLen, s.marker.trim().length);
      }
    }
    if (maxLen <= 2) return '1.85em';
    if (maxLen <= 4) return '2.2em';
    return `${Math.max(2.2, maxLen * 0.6 + 0.4)}em`;
  }, [sections, hasAnyMarkers]);

  const dynamicStyles = {
    '--title-color': settings.titleColor,
    '--artist-color': settings.artistColor,
    '--lyrics-color': settings.lyricsColor,
    '--chords-color': settings.chordsColor,
    '--marker-color': settings.markerColor,
    '--title-size': `${settings.titleFontSize}px`,
    '--artist-size': `${settings.artistFontSize}px`,
    '--lyrics-size': `${settings.lyricsFontSize}px`,
    '--chords-size': `${settings.chordsFontSize}px`,
    '--song-scale': computedScale.toString(),
  } as React.CSSProperties;

  return (
    <div ref={containerRef} style={dynamicStyles} className="relative flex-1 flex flex-col h-full">
      <div 
        className="absolute top-0 left-0 bg-zinc-800 text-white font-bold rounded-sm flex items-center justify-center print:border print:border-black select-none"
        style={{ width: '26px', height: '26px', fontSize: '12px' }}
      >
        {index + 1}
      </div>

      <div className="text-center mb-5 sm:mb-6 px-8 shrink-0 song-title-block">
        <h2 
          className="font-bold leading-tight song-title-text" 
          style={{ color: 'var(--title-color)', fontSize: 'var(--title-size)' }}
        >
          {title} 
          {artist && (
            <span className="font-bold song-artist-text" style={{ color: 'var(--artist-color)', fontSize: 'var(--artist-size)' }}> - {artist}</span>
          )}
        </h2>
      </div>

      <div 
        className="font-sans whitespace-pre-wrap flex-1 min-h-0 song-columns-container"
        style={{
          columnCount: colCount,
          columnGap: colCount > 1 ? '1.5rem' : '0',
          columnFill: 'balance'
        }}
      >
        {sections.map((sec, vIndex) => {
          const shouldAvoidBreak = sections.length > 1 || sec.parsedLines.length < 4;
          const firstNonEmptyIndex = sec.parsedLines.findIndex((l) => !l.isEmpty);

          return (
            <div 
              key={vIndex} 
              className={`relative mb-4 song-section ${shouldAvoidBreak ? 'break-inside-avoid' : ''}`}
              style={{ 
                pageBreakInside: shouldAvoidBreak ? 'avoid' : 'auto' 
              }}
            >
              {sec.marker && firstNonEmptyIndex === -1 && (
                <div 
                  className="relative mb-0.5 song-line grid items-end"
                  style={{
                    gridTemplateColumns: hasAnyMarkers ? `${markerColWidth} 1fr` : '1fr',
                    minHeight: 'calc(var(--song-scale, 1) * (var(--lyrics-size) + 4px))'
                  }}
                >
                  <div className="flex items-baseline justify-end pr-1">
                    <div className="leading-none song-marker select-none">
                      {sec.marker}
                    </div>
                  </div>
                  <div />
                </div>
              )}

              {sec.parsedLines.map((lineData, i) => {
                if (lineData.isEmpty) {
                  return <div key={i} className="h-3"></div>;
                }

                const isFirstNonEmpty = i === firstNonEmptyIndex;
                const { chunks, hasChords } = lineData;

                return (
                  <div 
                    key={i} 
                    className="relative mb-0.5 song-line grid items-end" 
                    style={{
                      gridTemplateColumns: hasAnyMarkers ? `${markerColWidth} 1fr` : '1fr',
                      ...(hasChords && settings.showChords 
                        ? { minHeight: 'calc(var(--song-scale, 1) * (var(--chords-size) + var(--lyrics-size) + 4px))' } 
                        : { minHeight: 'calc(var(--song-scale, 1) * (var(--lyrics-size) + 4px))' }
                      )
                    }}
                  >
                    <div className="flex items-baseline justify-end pr-1">
                      {isFirstNonEmpty && sec.marker && (
                        <div className="leading-none song-marker select-none">
                          {sec.marker}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-end">
                      {chunks.map((chunk, j) => (
                        <div key={j} className="inline-flex flex-col">
                          {(hasChords && settings.showChords) && (
                            <div className="font-bold italic leading-none pr-1.5 song-chord pb-0.5 select-text" style={{ color: 'var(--chords-color)', fontSize: 'var(--chords-size)' }}>
                              {chunk.chord || ' '}
                            </div>
                          )}
                          <div 
                            className={`select-text ${chunk.isSectionRef ? 'song-marker' : 'leading-none song-lyric'}`}
                          >
                            {chunk.text ? chunk.text : (chunk.chord && settings.showChords ? '\u00A0' : '')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
});

