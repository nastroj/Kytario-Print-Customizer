import React, { useEffect, useRef, useMemo, memo } from 'react';
import { Song, PrintSettings, ColumnBalancePlan } from '../types';
import { parseSongContent, computeSmartFitScale, computeSmartColumnBalance, partitionSectionsIntoColumns, computeSmartFitLineMargin, MIN_READABLE_LYRICS_FONT_SIZE, SongSection, ParsedLine, getPageMargins, getOptimalColumnCount } from '../utils';
import { getFontFamilyStack } from '../fonts';

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
  columnPlan: ColumnBalancePlan;
}

/**
 * Custom song rendering hook for smartFit auto-scaling and smart column balancing.
 * - Calculates vertical height by summing line heights, chords, and empty line buffers.
 * - Ensures shorter songs are rendered with larger font sizes to fill the page.
 * - Strictly adheres to a minimum readability font size constraint (>= 9.0px).
 * - Implements 'smart column balancing' algorithm that prevents lone lines from orphans
 *   at the top of a new column, ensuring a professional print aesthetic.
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
    settings.pageMarginTopBottom,
    settings.pageMarginLeftRight,
    settings.pageMarginTop,
    settings.pageMarginBottom,
    settings.pageMarginLeft,
    settings.pageMarginRight,
    settings.pageMarginInner,
    settings.pageMarginOuter,
    settings.bookMode,
    settings.maxFontSizePx,
    hasTitle,
    hasArtist,
  ]);


  // Compute available column height for smart balancing
  const availColH = useMemo(() => {
    const isLand = settings.orientation === 'landscape';
    const mmToPx = 3.779528;
    let totalPxHeight = 297 * mmToPx;
    switch (settings.pageFormat) {
      case 'A4':
        totalPxHeight = (isLand ? 210 : 297) * mmToPx;
        break;
      case 'A5':
        totalPxHeight = (isLand ? 148 : 210) * mmToPx;
        break;
      case 'Letter':
        totalPxHeight = (isLand ? 8.5 : 11) * 96;
        break;
    }
    const margins = getPageMargins(settings);
    const paddingY = (margins.top + margins.bottom) * mmToPx;
    const titleSize = Number(settings.titleFontSize) || 16;
    const artistSize = Number(settings.artistFontSize) || 16;
    const titleBlockH = (hasTitle ? titleSize * 1.25 : 0) + (hasArtist ? artistSize * 1.25 : 0) + 18;
    return Math.max(100, totalPxHeight - paddingY - titleBlockH - 24);
  }, [
    settings.orientation,
    settings.pageFormat,
    settings.pageMargin,
    settings.pageMarginTopBottom,
    settings.pageMarginLeftRight,
    settings.pageMarginTop,
    settings.pageMarginBottom,
    settings.pageMarginLeft,
    settings.pageMarginRight,
    settings.pageMarginInner,
    settings.pageMarginOuter,
    settings.bookMode,
    settings.titleFontSize,
    settings.artistFontSize,
    hasTitle,
    hasArtist,
  ]);
  // Smart Column Balancing: prevents lone lines / orphans at top of new column
  const columnPlan = useMemo(() => {
    return computeSmartColumnBalance(sections, settings, availColH, scale);
  }, [sections, settings, availColH, scale]);


  const baseLyricsSize = Number(settings.lyricsFontSize) || 12;
  const baseChordsSize = Number(settings.chordsFontSize) || 12;
  const chosenLyricsFontSize = Math.round(baseLyricsSize * scale * 10) / 10;
  const chosenChordsFontSize = Math.round(baseChordsSize * scale * 10) / 10;

  return {
    scale,
    chosenLyricsFontSize,
    chosenChordsFontSize,
    minFontSizeConstraint: MIN_READABLE_LYRICS_FONT_SIZE,
    columnPlan,
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

  // Hook handles vertical height calculation, line/chord/buffer summing, upscale for short songs,
  // min readability constraint, & smart column balancing with orphan prevention
  const { scale: computedScale, chosenLyricsFontSize, columnPlan } = useSmartFit({
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

  const colCount = useMemo(() => {
    return getOptimalColumnCount(sections, settings);
  }, [sections, settings]);

  const columns = useMemo(() => {
    return partitionSectionsIntoColumns(sections, columnPlan, colCount);
  }, [sections, columnPlan, colCount]);

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

  const defaultLineCol = isDarkMode ? '#52525b' : '#a1a1aa';
  const defaultRefrainLineCol = isDarkMode ? '#60a5fa' : '#2563eb';

  const lineMargin = useMemo(() => {
    return computeSmartFitLineMargin(sections, settings, Boolean(title), Boolean(artist), computedScale);
  }, [sections, settings, computedScale, title, artist]);

  const dynamicStyles = {
    '--title-color': settings.titleColor,
    '--artist-color': settings.artistColor,
    '--lyrics-color': settings.lyricsColor,
    '--chords-color': settings.chordsColor,
    '--marker-color': settings.markerColor,
    '--section-line-color': settings.sectionLineColor || defaultLineCol,
    '--refrain-line-color': settings.refrainLineColor || settings.chordsColor || defaultRefrainLineCol,
    '--songbook-font-family': getFontFamilyStack(settings.fontFamily),
    '--title-size': `${settings.titleFontSize}px`,
    '--artist-size': `${settings.artistFontSize}px`,
    '--lyrics-size': `${settings.lyricsFontSize}px`,
    '--chords-size': `${settings.chordsFontSize}px`,
    '--lyrics-font-style': settings.lyricsItalic ? 'italic' : 'normal',
    '--chords-font-style': settings.chordsItalic ? 'italic' : 'normal',
    '--song-scale': computedScale.toString(),
    '--marker-width': markerColWidth,
    '--line-margin': `${lineMargin}px`,
    '--section-padding-left': '0.20rem',
    fontFamily: 'var(--songbook-font-family)',
  } as React.CSSProperties;

  const renderSongLine = (lineData: ParsedLine, i: number, firstNonEmptyIndex: number, secMarker: string) => {
    if (lineData.isEmpty) return <div key={i} className="h-3"></div>;

    const isFirstNonEmpty = i === firstNonEmptyIndex;
    const { chunks, hasChords } = lineData;
    const isRep = lineData.isRepetitionLine;
    const isChordsOnly = isRep || (!chunks || !chunks.some((c: any) => c.text && c.text.trim().length > 0 && !c.isSectionRef));

    const lineStyle = {
      gridTemplateColumns: hasAnyMarkers ? 'var(--marker-width) 1fr' : '1fr',
      fontSize: 'calc(var(--song-scale, 1) * var(--lyrics-size))',
      minHeight: isRep 
        ? 'calc(var(--song-scale, 1) * (var(--chords-size) + 4px))'
        : (hasChords && settings.showChords 
            ? 'calc(var(--song-scale, 1) * (var(--chords-size) + var(--lyrics-size) + 4px))' 
            : 'calc(var(--song-scale, 1) * (var(--lyrics-size) + 4px))')
    } as React.CSSProperties;

    return (
      <div key={i} className={`relative song-line grid items-end ${isChordsOnly ? 'mb-0' : 'mb-[var(--line-margin)]'}`} style={lineStyle}>
        <div className="flex items-baseline justify-end pr-1">
          {isFirstNonEmpty && secMarker && (
            <>
              <div className="leading-none song-marker select-none">
                {secMarker.replace(/^\[(.*)\]$/, '$1')}
              </div>
              <div className="leading-none song-lyric w-0 overflow-hidden opacity-0 select-none">X</div>
            </>
          )}
        </div>

        <div className={`flex flex-wrap ${isRep ? 'items-baseline gap-x-2 py-0.5' : 'items-end'}`}>
          {chunks.map((chunk, j) => {
            const isSectionRef = chunk.isSectionRef;
            const hasChord = Boolean(chunk.chord && settings.showChords);
            const isLast = j === chunks.length - 1;
            const hasText = Boolean(chunk.text && (isRep ? chunk.text.trim() : true));
            // In chorded lines, if a chunk has a chord, it MUST have a lyric slot so the chord aligns on the top track
            const shouldRenderLyric = isRep ? hasText : (hasText || hasChord || isSectionRef);

            const hasActualText = Boolean(chunk.text && chunk.text.length > 0);
            const isWhitespaceOnly = hasActualText && chunk.text.trim().length === 0;

            return (
              <div key={j} className={isRep ? 'contents' : `inline-flex flex-col ${hasChord || isSectionRef ? 'shrink-0' : 'min-w-0 max-w-full'}`}>
                {hasChord && (
                  <div 
                    className={`font-bold leading-none song-chord select-text ${isRep ? '' : 'mb-0'} ${isLast ? 'pr-0' : 'pr-1.5'}`}
                    style={{ 
                      color: 'var(--chords-color)', 
                      fontSize: 'calc(var(--song-scale, 1) * var(--chords-size))',
                      fontStyle: 'var(--chords-font-style)',
                      lineHeight: 1,
                      ...(isRep ? {} : { minHeight: 'calc(var(--song-scale, 1) * var(--chords-size))' })
                    }}
                  >
                    {chunk.chord}
                  </div>
                )}
                {shouldRenderLyric && (
                  <div 
                    className={`select-text ${isSectionRef ? 'song-marker font-semibold' : `leading-none song-lyric ${isRep ? 'font-semibold' : ''}`}`}
                    style={{
                      color: isSectionRef ? 'var(--marker-color)' : undefined,
                      fontStyle: !isSectionRef && !isRep ? 'var(--lyrics-font-style)' : 'normal',
                      minHeight: isRep ? undefined : 'calc(var(--song-scale, 1) * var(--lyrics-size))',
                      lineHeight: 1,
                    }}
                  >
                    {isSectionRef ? (
                      chunk.text
                    ) : hasActualText && !isWhitespaceOnly ? (
                      chunk.text
                    ) : isWhitespaceOnly ? (
                      <>
                        {chunk.text.replace(/ /g, '\u00A0')}
                        <span className="invisible select-none inline-block overflow-hidden" style={{ width: 0, height: 0 }} aria-hidden="true">
                          Ág
                        </span>
                      </>
                    ) : (
                      // Empty lyric under chord (e.g. chord at the end of a line) with strut for exact baseline/line-height in Firefox
                      <span className="invisible select-none inline-block overflow-hidden" style={{ width: 0, height: 0 }} aria-hidden="true">
                        Ág
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} style={dynamicStyles} className="relative flex-1 flex flex-col h-full">
      {/* Page / Song Number Badge on top */}
      {settings.pageNumberPosition !== 'none' && (
        <div 
          className={`absolute top-0 ${
            settings.pageNumberPosition === 'left' 
              ? 'left-0 print:!left-0 print:!right-auto' 
              : settings.pageNumberPosition === 'right'
                ? 'right-0 print:!right-0 print:!left-auto'
                : (index % 2 !== 0 ? 'right-0 print:!right-0 print:!left-auto' : 'left-0 print:!left-0 print:!right-auto')
          } bg-zinc-800 text-white font-bold rounded-[5px] flex items-center justify-center print:border print:border-black select-none z-10`}
          style={{ width: '26px', height: '26px', fontSize: '12px' }}
        >
          {index + 1}
        </div>
      )}

      {isDebugMode && debugStats && (
        <div 
          className="absolute bottom-0 right-0 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded px-2 py-0.5 text-[11px] font-mono select-none print:hidden flex items-center gap-1.5 z-10"
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
        className="whitespace-pre-wrap flex-1 min-h-0 flex song-columns-container"
        style={{
          fontFamily: 'var(--songbook-font-family)',
          gap: colCount > 1 ? '1.5rem' : '0',
        }}
      >
        {columns.map((col, colIdx) => (
          <div 
            key={colIdx} 
            className="flex-1 min-w-0 flex flex-col song-column"
          >
            {col.columnSections.map((sec, sIdxInCol) => {
              const globalSecIndex = col.startIndex + sIdxInCol;
              const isFirstInColumn = sIdxInCol === 0;
              const plan = columnPlan?.sections?.[globalSecIndex];
              const firstNonEmptyIndex = sec.parsedLines.findIndex((l) => !l.isEmpty);

              const orphanProtection = plan?.orphanProtection;
              const hasOrphanGuards = Boolean(
                orphanProtection && orphanProtection.hasHeadGroup && orphanProtection.hasTailGroup && orphanProtection.tailGroupStartIndex > 0
              );

              const headLines: { line: ParsedLine; index: number }[] = [];
              const middleLines: { line: ParsedLine; index: number }[] = [];
              const tailLines: { line: ParsedLine; index: number }[] = [];

              if (hasOrphanGuards && orphanProtection) {
                const nonEmptyIndices = sec.parsedLines
                  .map((l, idx) => ({ isEmpty: l.isEmpty, idx }))
                  .filter(l => !l.isEmpty);

                const headEndIdx = nonEmptyIndices.length >= 2 ? nonEmptyIndices[1].idx : 0;
                const tailStartIdx = orphanProtection.tailGroupStartIndex;

                if (headEndIdx < tailStartIdx) {
                  sec.parsedLines.forEach((line, idx) => {
                    if (idx <= headEndIdx) {
                      headLines.push({ line, index: idx });
                    } else if (idx < tailStartIdx) {
                      middleLines.push({ line, index: idx });
                    } else {
                      tailLines.push({ line, index: idx });
                    }
                  });
                }
              }

              const showSectionLines = settings.showSectionLines !== false;
              const currentLineColor = sec.isRefrain
                ? (settings.refrainLineColor || settings.chordsColor || defaultRefrainLineCol)
                : (settings.sectionLineColor || defaultLineCol);

              return (
                <div 
                  key={globalSecIndex}
                  className="song-section-block"
                >
                  <div 
                    className={`relative mb-3.5 sm:mb-4 song-section ${showSectionLines ? 'song-section-with-line' : ''} ${showSectionLines && sec.isRefrain ? 'song-section-refrain' : ''}`}
                    style={{ 
                      ...(showSectionLines ? {
                        borderLeft: `0.22em solid ${currentLineColor}`,
                        paddingLeft: 'var(--section-padding-left)',
                        WebkitBoxDecorationBreak: 'clone' as any,
                        boxDecorationBreak: 'clone' as any,
                      } : {}),
                    }}
                  >
                    {sec.marker && firstNonEmptyIndex === -1 && (
                      <div 
                        className="relative song-line grid items-end mb-[5px]"
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

                    {hasOrphanGuards && headLines.length > 0 && tailLines.length > 0 ? (
                      <>
                        <div className="song-orphan-guard-head">
                          {headLines.map(({ line, index }) => renderSongLine(line, index, firstNonEmptyIndex, sec.marker))}
                        </div>
                        {middleLines.map(({ line, index }) => renderSongLine(line, index, firstNonEmptyIndex, sec.marker))}
                        <div className="song-orphan-guard-tail">
                          {tailLines.map(({ line, index }) => renderSongLine(line, index, firstNonEmptyIndex, sec.marker))}
                        </div>
                      </>
                    ) : (
                      sec.parsedLines.map((lineData, i) => renderSongLine(lineData, i, firstNonEmptyIndex, sec.marker))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

