import React, { useEffect, useRef, useMemo, memo } from 'react';
import { Song, PrintSettings } from '../types';
import { parseSongContent, computeSmartFitScale, MIN_READABLE_LYRICS_FONT_SIZE, SongSection } from '../utils';

interface UseSmartFitParams {
  sections: SongSection[];
  settings: PrintSettings;
  hasTitle: boolean;
  hasArtist: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseSmartFitResult {
  scale: number;
  chosenLyricsFontSize: number;
  chosenChordsFontSize: number;
  minFontSizeConstraint: number;
}

/**
 * Custom song rendering hook for smartFit auto-scaling.
 * Calculates vertical height by summing line heights, chords, and empty line buffers.
 * Ensures shorter songs are rendered with larger font sizes to fill the page,
 * and strictly adheres to a minimum readability font size constraint (>= 9.0px).
 */
export function useSmartFit({
  sections,
  settings,
  hasTitle,
  hasArtist,
  containerRef,
}: UseSmartFitParams): UseSmartFitResult {
  // Compute analytical scale by summing line heights, chords, empty line buffers, and section margins
  const scale = useMemo(() => {
    return computeSmartFitScale(sections, settings, hasTitle, hasArtist);
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
    settings.pageMargin,
    settings.maxScaleMultiplier,
    settings.maxAutoFontSize,
    hasTitle,
    hasArtist,
  ]);

  // Apply scale to DOM container, with single-pass fine adjustment strictly bound by min readability constraint
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!settings.smartFit) {
      el.style.removeProperty('--song-scale');
      return;
    }
    const pageContainer = el.closest('.print-page-container') as HTMLElement;
    if (!pageContainer) return;

    // Apply the analytically computed scale first
    el.style.setProperty('--song-scale', scale.toString());

    const rafId = requestAnimationFrame(() => {
      if (!el || !pageContainer) return;
      const scrollH = pageContainer.scrollHeight;
      const clientH = pageContainer.clientHeight;
      if (scrollH > clientH + 2) {
        const ratio = clientH / scrollH;
        // Strictly adhere to minimum readability font size constraint (9.0px)
        const baseLyricsSize = Number(settings.lyricsFontSize) || 12;
        const minFineScale = Math.max(0.55, MIN_READABLE_LYRICS_FONT_SIZE / baseLyricsSize);
        const fineScale = Math.max(minFineScale, Math.round(scale * ratio * 0.98 * 100) / 100);
        el.style.setProperty('--song-scale', fineScale.toString());
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [scale, settings.smartFit, settings.lyricsFontSize, containerRef]);

  const baseLyricsSize = Number(settings.lyricsFontSize) || 12;
  const baseChordsSize = Number(settings.chordsFontSize) || 12;
  const chosenLyricsFontSize = Math.round(baseLyricsSize * scale * 10) / 10;
  const chosenChordsFontSize = Math.round(baseChordsSize * scale * 10) / 10;

  return {
    scale,
    chosenLyricsFontSize,
    chosenChordsFontSize,
    minFontSizeConstraint: MIN_READABLE_LYRICS_FONT_SIZE,
  };
}

interface SongDisplayProps {
  key?: React.Key;
  song: Song;
  index: number;
  settings: PrintSettings;
  isDarkMode?: boolean;
  isDebugMode?: boolean;
}

export const SongDisplay = memo(function SongDisplay({ song, index, settings, isDarkMode = false, isDebugMode = false }: SongDisplayProps) {
  const title = song.title || song.name || 'Unknown Title';
  const artist = song.artist || song.author || song.interpreter || '';
  const text = song.text || song.content || song.lyrics || '';

  const containerRef = useRef<HTMLDivElement>(null);
  const sections = useMemo(() => parseSongContent(text), [text]);

  // Hook handles vertical height calculation, line/chord/buffer summing, upscale for short songs, & min readability constraint
  const { scale: computedScale, chosenLyricsFontSize } = useSmartFit({
    sections,
    settings,
    hasTitle: Boolean(title),
    hasArtist: Boolean(artist),
    containerRef,
  });

  const debugStats = useMemo(() => {
    if (!isDebugMode) return null;
    const rawLines = text ? text.split('\n') : [];
    const nonEmpty = rawLines.filter((l) => l.trim().length > 0).length;
    return {
      totalLines: nonEmpty,
      rawLines: rawLines.length,
      chosenSize: chosenLyricsFontSize,
      scale: computedScale,
    };
  }, [isDebugMode, text, chosenLyricsFontSize, computedScale]);

  const colCount = settings.columns || 2;

  const hasAnyMarkers = useMemo(() => {
    return sections.some((s) => Boolean(s.marker && s.marker.trim()));
  }, [sections]);

  const markerColWidth = useMemo(() => {
    if (!hasAnyMarkers) return '0em';
    let maxLen = 0;
    for (const s of sections) {
      if (s.marker) {
        const cleanMarker = s.marker.replace(/^\[(.*)\]$/, '$1').trim();
        maxLen = Math.max(maxLen, cleanMarker.length);
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

      {isDebugMode && debugStats && (
        <div 
          className="absolute top-0 right-0 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded px-2 py-0.5 text-[11px] font-mono select-none print:hidden flex items-center gap-1.5 z-10"
          title={`Total Lines: ${debugStats.totalLines} (raw: ${debugStats.rawLines}), Font: ${debugStats.chosenSize}px (Scale: ${debugStats.scale}x)`}
        >
          <span className="font-bold">{debugStats.totalLines} lines</span>
          <span className="text-amber-400">•</span>
          <span className="font-bold">{debugStats.chosenSize}px</span>
          <span className="text-[10px] opacity-75">({debugStats.scale}×)</span>
        </div>
      )}

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
                    fontSize: 'calc(var(--song-scale, 1) * var(--lyrics-size))',
                    minHeight: 'calc(var(--song-scale, 1) * (var(--lyrics-size) + 4px))'
                  }}
                >
                  <div className="flex items-baseline justify-end pr-1">
                    <div className="leading-none song-marker select-none">
                      {sec.marker.replace(/^\[(.*)\]$/, '$1')}
                    </div>
                    {/* Typographic strut to align baseline perfectly with lyrics */}
                    <div className="leading-none song-lyric w-0 overflow-hidden opacity-0 select-none">X</div>
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
                const isRep = lineData.isRepetitionLine;

                return (
                  <div 
                    key={i} 
                    className="relative mb-0.5 song-line grid items-end" 
                    style={{
                      gridTemplateColumns: hasAnyMarkers ? `${markerColWidth} 1fr` : '1fr',
                      fontSize: 'calc(var(--song-scale, 1) * var(--lyrics-size))',
                      ...(isRep
                        ? { minHeight: 'calc(var(--song-scale, 1) * (var(--chords-size) + 4px))' }
                        : (hasChords && settings.showChords 
                            ? { minHeight: 'calc(var(--song-scale, 1) * (var(--chords-size) + var(--lyrics-size) + 4px))' } 
                            : { minHeight: 'calc(var(--song-scale, 1) * (var(--lyrics-size) + 4px))' }
                          )
                      )
                    }}
                  >
                    <div className="flex items-baseline justify-end pr-1">
                      {isFirstNonEmpty && sec.marker && (
                        <>
                          <div className="leading-none song-marker select-none">
                            {sec.marker.replace(/^\[(.*)\]$/, '$1')}
                          </div>
                          {/* Typographic strut to align baseline perfectly with lyrics */}
                          <div className="leading-none song-lyric w-0 overflow-hidden opacity-0 select-none">X</div>
                        </>
                      )}
                    </div>

                    {isRep ? (
                      <div className="flex flex-wrap items-baseline gap-x-2 select-text song-repetition-line py-0.5">
                        {chunks.map((chunk, j) => {
                          if (chunk.chord && settings.showChords) {
                            return (
                              <span 
                                key={j} 
                                className="font-bold italic leading-none song-chord select-text pr-1" 
                                style={{ 
                                  color: 'var(--chords-color)', 
                                  fontSize: 'calc(var(--song-scale, 1) * var(--chords-size))' 
                                }}
                              >
                                {chunk.chord}
                              </span>
                            );
                          }
                          if (chunk.text && chunk.text.trim()) {
                            return (
                              <span 
                                key={j} 
                                className={`leading-none select-text pr-1 ${chunk.isSectionRef ? 'song-marker font-semibold' : 'song-lyric font-semibold'}`}
                                style={chunk.isSectionRef ? { color: 'var(--marker-color)' } : undefined}
                              >
                                {chunk.text}
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-end">
                        {chunks.map((chunk, j) => (
                          <div key={j} className="inline-flex flex-col">
                            {(hasChords && settings.showChords) && (
                              <div 
                                className="font-bold italic leading-none pr-1.5 song-chord pb-0.5 select-text" 
                                style={{ 
                                  color: 'var(--chords-color)', 
                                  fontSize: 'calc(var(--song-scale, 1) * var(--chords-size))',
                                  minHeight: 'calc(var(--song-scale, 1) * var(--chords-size))'
                                }}
                              >
                                {chunk.chord || ' '}
                              </div>
                            )}
                            <div 
                              className={`select-text ${chunk.isSectionRef ? 'song-marker font-semibold' : 'leading-none song-lyric'}`}
                              style={chunk.isSectionRef ? { color: 'var(--marker-color)' } : undefined}
                            >
                              {chunk.text ? chunk.text : (chunk.chord && settings.showChords ? '\u00A0' : '')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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

