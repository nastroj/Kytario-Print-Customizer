import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, memo, useCallback } from 'react';
import { SongbookData, PrintSettings, Song, ZoomMode } from '../types';
import { SongDisplay } from './SongDisplay';
import { FrontCoverPage } from './FrontCoverPage';
import { BackCoverPage } from './BackCoverPage';
import { SongbookSkeleton } from './SongbookSkeleton';
import { SongFitDebugHud } from './SongFitDebugHud';
import { getDisplayColor, computeSongFitDebug, getPageMargins } from '../utils';
import { isDebugHudConfigured } from '../config';
import { 
  Minus, 
  Plus, 
  Maximize2, 
  RotateCcw, 
  BookOpen, 
  ChevronUp, 
  Check, 
  Loader2,
  Music,
  FileText,
  ChevronDown,
  Bug,
} from 'lucide-react';

interface SongbookPreviewProps {
  data: SongbookData;
  settings: PrintSettings;
  isUpdatingLayout?: boolean;
  onOpenSettings?: () => void;
  onDownloadStatusChange?: (isDownloading: boolean) => void;
  zoomMode?: ZoomMode;
  setZoomMode?: (mode: ZoomMode) => void;
  customZoom?: number;
  setCustomZoom?: (zoom: number) => void;
  onScaleChange?: (scale: number) => void;
  isSongNavOpen?: boolean;
  setIsSongNavOpen?: (open: boolean | ((prev: boolean) => boolean)) => void;
}

const ZOOM_STEPS = [0.25, 0.35, 0.5, 0.65, 0.75, 0.9, 1.0, 1.15, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

export interface TocItem {
  song?: Song;
  originalIndex?: number;
  title: string;
  artist?: string;
  groupLetter?: string;
}

interface TocPage {
  pageIndex: number;
  totalPages: number;
  items: TocItem[];
  columnsData?: TocItem[][];
  isFirstPage: boolean;
  columns: number;
}

function balanceColumns<T extends { groupLetter?: string }>(items: T[], numCols: number): T[][] {
  if (numCols <= 1 || items.length <= 1) {
    return [items];
  }

  const total = items.length;
  const base = Math.floor(total / numCols);
  const remainder = total % numCols;

  // Initial balanced target counts across columns
  const counts = Array.from({ length: numCols }, (_, c) => base + (c < remainder ? 1 : 0));

  // If a column ends with a group header (an orphan header where subsequent items in that group are in the next column),
  // move that single item to start the next column, avoiding stranded/clipped group headers at column bottoms
  for (let c = 0; c < numCols - 1; c++) {
    if (counts[c] > 1) {
      let colStartIndex = 0;
      for (let i = 0; i < c; i++) {
        colStartIndex += counts[i];
      }
      const lastItemIndex = colStartIndex + counts[c] - 1;
      const lastItem = items[lastItemIndex];
      
      if (lastItem && lastItem.groupLetter && lastItemIndex + 1 < items.length) {
        counts[c]--;
        counts[c + 1]++;
      }
    }
  }

  // Slice items into balanced columns
  const columns: T[][] = [];
  let offset = 0;
  for (let c = 0; c < numCols; c++) {
    const colCount = counts[c];
    columns.push(items.slice(offset, offset + colCount));
    offset += colCount;
  }

  return columns;
}

function getColumnHeight<T extends { groupLetter?: string }>(
  colItems: T[],
  showDividers: boolean,
  singleItemHeight: number,
  dividerTotalHeight: number
): number {
  let h = 0;
  for (let i = 0; i < colItems.length; i++) {
    const item = colItems[i];
    if (showDividers && item.groupLetter && i > 0) {
      h += dividerTotalHeight;
    }
    h += singleItemHeight;
  }
  return h;
}

// On-Screen Print Margin Guides & Physical Sheet Crop Marks Overlay
const VirtualPage = memo(function VirtualPage({ 
  children, 
  isScaled,
  scaledWidth,
  scaledHeight,
  defaultWidth,
  defaultHeight,
  id
}: { 
  children: React.ReactNode, 
  isScaled: boolean,
  scaledWidth: number,
  scaledHeight: number,
  defaultWidth: string,
  defaultHeight: string,
  id?: string
}) {
  return (
    <div 
      id={id}
      className="mx-auto mb-6 sm:mb-10 print:mb-0 print:mx-0 shrink-0 song-page-outer-wrapper"
      style={{
        width: isScaled ? `${scaledWidth}px` : 'fit-content',
        height: isScaled ? `${scaledHeight}px` : 'auto',
        minHeight: isScaled ? `${scaledHeight}px` : defaultHeight,
        minWidth: isScaled ? `${scaledWidth}px` : defaultWidth,
        position: 'relative',
        contentVisibility: 'auto',
        containIntrinsicSize: isScaled ? `${scaledWidth}px ${scaledHeight}px` : `${defaultWidth} ${defaultHeight}`,
      }}
    >
      {children}
    </div>
  );
});

// Dedicated Memoized Song Pages List
interface SongPagesListProps {
  url?: string;
  shortUrl?: string;
  slug?: string;
  songs: Song[];
  title: string;
  settings: PrintSettings;
  tocPages: TocPage[];
  cssWidth: string;
  cssHeight: string;
  scaledWidth: number;
  scaledHeight: number;
  effectiveScale: number;
  isScaled: boolean;
  onScrollToSong: (id: string) => void;
  isDebugMode?: boolean;
}

const SongPagesList = memo(function SongPagesList({
  url,
  shortUrl,
  slug,
  songs,
  title,
  settings,
  tocPages,
  cssWidth,
  cssHeight,
  scaledWidth,
  scaledHeight,
  effectiveScale,
  isScaled,
  onScrollToSong,
  isDebugMode = false,
}: SongPagesListProps) {
  const numColWidth = useMemo(() => {
    if (songs.length >= 100) return '2.8em';
    if (songs.length >= 10) return '2.1em';
    return '1.5em';
  }, [songs.length]);

  const hasLetterGrouping = settings.indexSortOrder === 'alphabetical' && !!settings.tocAlphabeticalGrouping;
  const showDividers = hasLetterGrouping && (settings.tocGroupDividers !== false);
  const letterColWidth = hasLetterGrouping ? '1.85em' : '0em';

  const marginMmX = settings.pageMarginLeftRight ?? settings.pageMargin ?? 5;
  const marginMmY = settings.pageMarginTopBottom ?? (settings.pageMargin ? Math.round(settings.pageMargin * 1.2) : 6);
  const tocMarginMmX = settings.pageMarginLeftRight ?? settings.pageMargin ?? 8;
  const tocMarginMmYTop = settings.pageMarginTopBottom ?? (settings.pageMargin ? Math.round(settings.pageMargin * 1.2) : 8);
  const tocMarginMmYBottom = settings.pageMarginTopBottom ?? (settings.pageMargin ? Math.round(settings.pageMargin * 1.2) : 8);
  const safeTocSize = Number(settings.tocFontSize) || (Number(settings.lyricsFontSize) * 0.95) || 12;
  const safeTitleSize = Number(settings.titleFontSize) || 16;

  // Exact row metrics matching pagination algorithm
  const rowLineHeight = 1.35;
  const rowLineHeightPx = Math.ceil(safeTocSize * rowLineHeight);
  const rowPaddingYPx = 1.5;
  const rowMarginBottomPx = 1;

  const pageContainerClass = 'bg-white text-zinc-900 shadow-md print:shadow-none border border-black/5';

  return (
    <>
      {/* FRONT COVER / TITLE PAGE (PAGE 1) */}
      {settings.showFrontCover !== false && songs.length > 0 && (() => {
        const m = getPageMargins(settings, 0);
        return (
          <VirtualPage
            key="front-cover-page"
            id="front-cover-page"
            isScaled={isScaled}
            scaledWidth={scaledWidth}
            scaledHeight={scaledHeight}
            defaultWidth={cssWidth}
            defaultHeight={cssHeight}
          >
            <div 
              className={`${pageContainerClass} print-cover-container flex flex-col overflow-hidden origin-top-left relative`}
              style={{ 
                width: cssWidth, 
                height: cssHeight,
                minHeight: cssHeight,
                maxHeight: cssHeight,
                boxSizing: 'border-box',
                padding: `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`,
                transform: isScaled ? `scale(${effectiveScale})` : 'none',
                transformOrigin: 'top left',
                position: isScaled ? 'absolute' : 'relative',
                top: 0,
                left: 0,
              }}
            >
              <FrontCoverPage
                title={title}
                url={url}
                shortUrl={shortUrl}
                slug={slug}
                settings={settings}
              />
            </div>
          </VirtualPage>
        );
      })()}

      {/* INDEX / TABLE OF CONTENTS PAGES (PAGINATED) */}
      {tocPages.map((tocPage) => {
        const columnsData = tocPage.columnsData || balanceColumns(tocPage.items, tocPage.columns);
        const m = getPageMargins(settings, tocPage.pageIndex - 1);

        return (
          <VirtualPage
            key={`toc-page-${tocPage.pageIndex}`}
            id={tocPage.isFirstPage ? "toc-page" : `toc-page-${tocPage.pageIndex}`}
            isScaled={isScaled}
            scaledWidth={scaledWidth}
            scaledHeight={scaledHeight}
            defaultWidth={cssWidth}
            defaultHeight={cssHeight}
          >
            <div 
              className={`${pageContainerClass} print-index-container flex flex-col overflow-hidden origin-top-left`}
              style={{ 
                width: cssWidth, 
                height: cssHeight,
                minHeight: cssHeight,
                maxHeight: cssHeight,
                boxSizing: 'border-box',
                padding: `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`,
                transform: isScaled ? `scale(${effectiveScale})` : 'none',
                transformOrigin: 'top left',
                position: isScaled ? 'absolute' : 'relative',
                top: 0,
                left: 0,
              }}
            >
              {/* Page Header */}
              {tocPage.isFirstPage ? (
                <div className="text-center shrink-0" style={{ marginBottom: '12px' }}>
                  <h1 
                    className="font-bold uppercase tracking-tight toc-title-header truncate px-2"
                    style={{ 
                      color: getDisplayColor(settings.titleColor), 
                      fontSize: `${Math.round(safeTitleSize * 1.15)}px`,
                      lineHeight: 1.2
                    }}
                  >
                    {title}
                  </h1>
                  <p 
                    className="text-xs uppercase tracking-wider font-medium flex items-center justify-center gap-1.5 select-none"
                    style={{ marginTop: '2px', lineHeight: '16px', color: getDisplayColor(settings.tocPageColor || '#71717a') }}
                  >
                    <span>Obsah{tocPages.length > 1 ? ` • Strana 1 z ${tocPages.length}` : ''}</span>
                    <span className="print:hidden normal-case font-normal text-[11px]" style={{ opacity: 0.8 }}>
                      • tap to jump
                    </span>
                  </p>
                </div>
              ) : (
                <div 
                  className="text-center border-b border-black/5 shrink-0"
                  style={{ marginBottom: '10px', paddingBottom: '4px' }}
                >
                  <h2 
                    className="font-bold uppercase tracking-tight toc-title-header truncate px-2"
                    style={{ 
                      color: getDisplayColor(settings.titleColor), 
                      fontSize: `${Math.round(safeTitleSize * 0.85)}px`,
                      lineHeight: 1.2
                    }}
                  >
                    {title} <span className="text-zinc-400 font-normal text-xs normal-case">(pokračování)</span>
                  </h2>
                  <p 
                    className="text-xs uppercase tracking-wider font-medium flex items-center justify-center gap-1.5 select-none"
                    style={{ marginTop: '2px', lineHeight: '16px', color: getDisplayColor(settings.tocPageColor || '#71717a') }}
                  >
                    <span>Obsah • Strana {tocPage.pageIndex} z {tocPages.length}</span>
                    <span className="print:hidden normal-case font-normal text-[11px]" style={{ opacity: 0.8 }}>
                      • tap to jump
                    </span>
                  </p>
                </div>
              )}
              
              {/* Columns of Song Titles (CSS Grid for balanced, unclipped columns) */}
              <div 
                className="flex-1 min-h-0 grid toc-columns-body overflow-hidden"
                style={{ 
                  gridTemplateColumns: `repeat(${tocPage.columns}, minmax(0, 1fr))`,
                  columnGap: tocPage.columns >= 3 ? '1.75rem' : '2.25rem',
                  color: getDisplayColor(settings.tocColor || settings.lyricsColor),
                  alignItems: 'start',
                  alignContent: 'start',
                }}
              >
                {columnsData.map((colItems, colIdx) => (
                  <div 
                    key={colIdx} 
                    className="min-w-0 flex flex-col"
                  >
                    {colItems.map((item, itemIdx) => {
                      const fullTitle = `${item.originalIndex! + 1}. ${item.title}${item.artist ? ` - ${item.artist}` : ''}`;
                      return (
                        <div 
                          key={item.originalIndex} 
                          className="shrink-0 max-w-full"
                          style={{ 
                            marginBottom: `${rowMarginBottomPx}px`,
                            boxSizing: 'border-box'
                          }}
                        >
                          {showDividers && item.groupLetter && itemIdx > 0 && (
                            <div 
                              className="border-t w-full select-none"
                              style={{ 
                                height: '1px',
                                marginTop: '3px',
                                marginBottom: '3px',
                                borderColor: getDisplayColor(settings.sectionLineColor || '#a1a1aa'),
                                opacity: 0.35,
                                boxSizing: 'border-box'
                              }} 
                            />
                          )}
                          <a 
                            href={`#song-${item.originalIndex}`} 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onScrollToSong(`song-${item.originalIndex}`);
                            }}
                            title={fullTitle}
                            className="flex items-center w-full max-w-full group cursor-pointer transition-colors hover:opacity-85 touch-manipulation active:opacity-60 overflow-hidden"
                            style={{ 
                              color: 'inherit', 
                              textDecoration: 'none',
                              height: `${rowLineHeightPx + rowPaddingYPx * 2}px`,
                              paddingTop: `${rowPaddingYPx}px`,
                              paddingBottom: `${rowPaddingYPx}px`,
                              lineHeight: `${rowLineHeightPx}px`,
                              boxSizing: 'border-box',
                            }}
                          >
                            {hasLetterGrouping && (
                              <span 
                                className="shrink-0 font-bold select-none text-left toc-group-letter"
                                style={{ 
                                  width: letterColWidth,
                                  minWidth: letterColWidth,
                                  color: getDisplayColor(settings.titleColor),
                                  opacity: 0.9,
                                  fontSize: '1.05em'
                                }}
                              >
                                {item.groupLetter || ''}
                              </span>
                            )}
                            <span 
                              className="shrink-0 text-right tabular-nums font-semibold pr-2 select-none toc-song-number"
                              style={{ 
                                width: numColWidth,
                                color: getDisplayColor(settings.titleColor),
                                opacity: 0.8
                              }}
                            >
                              {item.originalIndex! + 1}.
                            </span>
                            <span className="truncate flex-1 min-w-0">
                              <span className="font-medium group-hover:underline toc-song-title">{item.title}</span>
                              {item.artist && (
                                <span 
                                  className="font-normal ml-1.5 toc-song-artist"
                                  style={{ 
                                    color: getDisplayColor(settings.tocArtistColor || settings.artistColor || '#52525b'),
                                    opacity: 0.85,
                                    fontSize: '0.92em'
                                  }}
                                >
                                  - {item.artist}
                                </span>
                              )}
                            </span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </VirtualPage>
        );
      })}

      {/* SONG PAGES */}
      {songs.map((song, i) => {
        const songDocPageIndex = (settings.showFrontCover !== false ? 1 : 0) + (settings.showTableOfContents !== false ? tocPages.length : 0) + i;
        const m = getPageMargins(settings, songDocPageIndex);
        return (
          <VirtualPage
            key={song.id || `song-${i}`}
            id={`song-${i}`}
            isScaled={isScaled}
            scaledWidth={scaledWidth}
            scaledHeight={scaledHeight}
            defaultWidth={cssWidth}
            defaultHeight={cssHeight}
          >
            <div 
              className={`${pageContainerClass} print-page-container flex flex-col overflow-hidden origin-top-left`}
              style={{ 
                width: cssWidth, 
                height: cssHeight,
                padding: `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`,
                transform: isScaled ? `scale(${effectiveScale})` : 'none',
                transformOrigin: 'top left',
                position: isScaled ? 'absolute' : 'relative',
                top: 0,
                left: 0,
              }}
            >
              <SongDisplay 
                song={song} 
                index={i} 
                docPageIndex={songDocPageIndex}
                settings={settings} 
                isDebugMode={isDebugMode} 
              />
            </div>
          </VirtualPage>
        );
      })}

      
      {/* Back Cover Page */}
      {settings.showBackCover !== false && songs.length > 0 && (() => {
        const backCoverDocPageIndex = (settings.showFrontCover !== false ? 1 : 0) + (settings.showTableOfContents !== false ? tocPages.length : 0) + songs.length;
        const m = getPageMargins(settings, backCoverDocPageIndex);
        return (
          <VirtualPage
            key="back-cover"
            width={cssWidth}
            height={cssHeight}
            isScaled={isScaled}
            scaledWidth={scaledWidth}
            scaledHeight={scaledHeight}
            defaultWidth={cssWidth}
            defaultHeight={cssHeight}
          >
            <div 
              className={`${pageContainerClass} print-cover-container flex flex-col overflow-hidden origin-top-left relative shadow-md ring-1 ring-black/5 print:shadow-none print:ring-0`}
              style={{ 
                width: cssWidth, 
                height: cssHeight,
                minHeight: cssHeight,
                maxHeight: cssHeight,
                boxSizing: 'border-box',
                padding: `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`,
                transform: isScaled ? `scale(${effectiveScale})` : 'none',
                transformOrigin: 'top left',
                position: isScaled ? 'absolute' : 'relative',
                top: 0,
                left: 0,
              }}
            >
              <BackCoverPage 
                title={title} 
                url={url} 
                shortUrl={shortUrl} 
                slug={slug}
                settings={settings} 
              />
            </div>
          </VirtualPage>
        );
      })()}

      {songs.length === 0 && (

        <div 
          className="mx-auto flex justify-center shrink-0 mb-6 sm:mb-10 print:hidden"
          style={{ 
            width: isScaled ? `${scaledWidth}px` : 'fit-content',
            height: isScaled ? `${scaledHeight}px` : 'auto',
            minHeight: isScaled ? `${scaledHeight}px` : undefined,
            position: 'relative',
          }}
        >
          <div 
            className="bg-zinc-50 border-2 border-dashed border-black/10 shadow-sm mx-auto px-[5mm] py-[6mm] flex flex-col items-center justify-center overflow-hidden origin-top-left"
            style={{ 
              width: cssWidth, 
              height: cssHeight,
              minHeight: cssHeight,
              transform: isScaled ? `scale(${effectiveScale})` : 'none',
              transformOrigin: 'top left',
              position: isScaled ? 'absolute' : 'relative',
              top: 0,
              left: 0,
            }}
          >
            <div className="flex flex-col items-center max-w-md text-center">
              <div className="w-full max-w-[180px] mb-8 text-zinc-300 mx-auto animate-in fade-in zoom-in-95 duration-700">
                <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-sm">
                  {/* Abstract Background Elements */}
                  <circle cx="100" cy="80" r="60" fill="currentColor" className="opacity-10" />
                  <circle cx="130" cy="60" r="30" fill="currentColor" className="opacity-10" />
                  
                  {/* Book Base */}
                  <path d="M100 130C100 130 80 135 50 120C40 115 35 110 35 100V50C35 45 40 40 50 45C80 60 100 70 100 70" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M100 130C100 130 120 135 150 120C160 115 165 110 165 100V50C165 45 160 40 150 45C120 60 100 70 100 70" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M100 70V130" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                  
                  {/* Left Page Lines */}
                  <path d="M55 70C70 77 85 82 90 84" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-40" />
                  <path d="M55 85C70 92 85 97 90 99" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-40" />
                  <path d="M55 100C70 107 85 112 90 114" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-40" />
                  
                  {/* Right Page Lines */}
                  <path d="M145 70C130 77 115 82 110 84" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-40" />
                  <path d="M145 85C130 92 115 97 110 99" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-40" />
                  
                  {/* Floating Music Notes */}
                  <path d="M125 40V20C125 18 127 16 129 16.5L145 20.5C147 21 148 23 148 25V42" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="120" cy="40" r="5" fill="currentColor" />
                  <circle cx="143" cy="43" r="5" fill="currentColor" />
                  
                  <path d="M65 30V15C65 13 67 11 69 11.5L80 14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="opacity-60" />
                  <circle cx="60" cy="30" r="5" fill="currentColor" className="opacity-60" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-zinc-700 mb-3">No Songs Loaded</h3>
              <p className="text-zinc-500 mb-10 text-lg max-w-sm">
                Your songbook is currently empty. Open the sidebar to upload a file or add songs to generate your printable book.
              </p>
              
              <div className="grid grid-cols-2 gap-6 w-full px-4">
                <div className="bg-white border border-black/5 rounded-lg p-5 flex flex-col items-center text-center shadow-sm">
                  <FileText className="w-8 h-8 text-amber-500 mb-3" />
                  <span className="font-semibold text-zinc-700 mb-1">Auto-formatted</span>
                  <span className="text-sm text-zinc-500">Chords and lyrics automatically aligned</span>
                </div>
                <div className="bg-white border border-black/5 rounded-lg p-5 flex flex-col items-center text-center shadow-sm">
                  <BookOpen className="w-8 h-8 text-blue-500 mb-3" />
                  <span className="font-semibold text-zinc-700 mb-1">Print Ready</span>
                  <span className="text-sm text-zinc-500">Smart columns and index generation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

// Custom comparator for React.memo to ignore insignificant layout fluctuations
const areSettingsEquivalent = (prev: PrintSettings, next: PrintSettings): boolean => {
  if (prev === next) return true;
  if (!prev || !next) return false;

  return (
    prev.pageFormat === next.pageFormat &&
    prev.orientation === next.orientation &&
    prev.columns === next.columns &&
    prev.showChords === next.showChords &&
    prev.smartFit === next.smartFit &&
    prev.maxLineHeight === next.maxLineHeight &&
    prev.sectionMarginCap === next.sectionMarginCap &&
    prev.lineHeight === next.lineHeight &&
    prev.bookMode === next.bookMode &&
    prev.pageNumberPosition === next.pageNumberPosition &&
    prev.pageMargin === next.pageMargin &&
    prev.pageMarginTopBottom === next.pageMarginTopBottom &&
    prev.pageMarginLeftRight === next.pageMarginLeftRight &&
    prev.pageMarginTop === next.pageMarginTop &&
    prev.pageMarginBottom === next.pageMarginBottom &&
    prev.pageMarginLeft === next.pageMarginLeft &&
    prev.pageMarginRight === next.pageMarginRight &&
    prev.pageMarginInner === next.pageMarginInner &&
    prev.pageMarginOuter === next.pageMarginOuter &&
    prev.maxFontSizePx === next.maxFontSizePx &&
    prev.indexSortOrder === next.indexSortOrder &&
    prev.titleColor === next.titleColor &&
    prev.artistColor === next.artistColor &&
    prev.lyricsColor === next.lyricsColor &&
    prev.chordsColor === next.chordsColor &&
    prev.markerColor === next.markerColor &&
    prev.tocColor === next.tocColor &&
    prev.tocArtistColor === next.tocArtistColor &&
    prev.tocPageColor === next.tocPageColor &&
    Math.abs((prev.titleFontSize || 16) - (next.titleFontSize || 16)) < 0.05 &&
    Math.abs((prev.artistFontSize || 16) - (next.artistFontSize || 16)) < 0.05 &&
    Math.abs((prev.lyricsFontSize || 12) - (next.lyricsFontSize || 12)) < 0.05 &&
    Math.abs((prev.chordsFontSize || 12) - (next.chordsFontSize || 12)) < 0.05 &&
    Math.abs((prev.tocFontSize || 12) - (next.tocFontSize || 12)) < 0.05
  );
};

const areSongbookDataEquivalent = (prev: SongbookData, next: SongbookData): boolean => {
  if (prev === next) return true;
  if (!prev || !next) return false;

  const prevTitle = prev.title || prev.name || '';
  const nextTitle = next.title || next.name || '';
  if (prevTitle !== nextTitle) return false;

  const prevSongs = prev.songs || prev.items || prev.songbookSongs?.map((i: any) => i.song) || [];
  const nextSongs = next.songs || next.items || next.songbookSongs?.map((i: any) => i.song) || [];

  if (prevSongs.length !== nextSongs.length) return false;

  for (let i = 0; i < prevSongs.length; i++) {
    const p = prevSongs[i];
    const n = nextSongs[i];
    if (
      p.id !== n.id ||
      (p.title || p.name) !== (n.title || n.name) ||
      (p.artist || p.author || p.interpreter) !== (n.artist || n.author || n.interpreter) ||
      (p.text || p.lyrics || p.content) !== (n.text || n.lyrics || n.content) ||
      p.chords !== n.chords
    ) {
      return false;
    }
  }

  return true;
};

const songbookPreviewComparator = (
  prevProps: SongbookPreviewProps,
  nextProps: SongbookPreviewProps
): boolean => {
  // If update progress state changes, re-render immediately
  if (Boolean(prevProps.isUpdatingLayout) !== Boolean(nextProps.isUpdatingLayout)) {
    return false;
  }

  // If zoom props change, re-render immediately
  if (prevProps.zoomMode !== nextProps.zoomMode) return false;
  if (prevProps.customZoom !== nextProps.customZoom) return false;

  // Compare print settings, ignoring sub-pixel or insignificant fluctuations
  if (!areSettingsEquivalent(prevProps.settings, nextProps.settings)) {
    return false;
  }

  // If navigation state changes, re-render immediately
  if (prevProps.isSongNavOpen !== nextProps.isSongNavOpen) {
    return false;
  }

  // Compare songbook data content
  if (!areSongbookDataEquivalent(prevProps.data, nextProps.data)) {
    return false;
  }

  return true;
};

interface QuickSongNavigatorProps {
  songs: Song[];
  isSongNavOpen: boolean;
  onScrollTo: (id: string) => void;
}

const QuickSongNavigator = memo(function QuickSongNavigator({ 
  songs, 
  isSongNavOpen, 
  onScrollTo 
}: QuickSongNavigatorProps) {
  if (!isSongNavOpen || songs.length === 0) return null;

  return (
    <div className="relative">
      <div 
        id="song-nav-modal"
        className="absolute bottom-0 right-0 w-64 max-h-72 overflow-y-auto bg-white/95 backdrop-blur-xl border border-black/10 text-zinc-800 rounded-lg shadow-2xl p-2 space-y-1 z-40 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-black/5 mb-1 flex items-center justify-between">
          <span>Jump to Song ({songs.length})</span>
          <button 
            onClick={() => onScrollTo('toc-page')}
            className="hover:underline text-zinc-600 hover:text-zinc-900 font-semibold cursor-pointer"
          >
            ToC
          </button>
        </div>

        <div className="space-y-0.5">
          {songs.map((s, idx) => {
            const sTitle = s.title || s.name || `Song #${idx + 1}`;
            return (
              <button
                key={idx}
                onClick={() => onScrollTo(`song-${idx}`)}
                className="w-full px-2 py-1.5 rounded-lg text-left text-zinc-600 hover:bg-black/5 hover:text-zinc-900 transition-colors truncate flex items-center gap-2 cursor-pointer"
              >
                <span className="w-5 font-mono text-zinc-400 font-semibold shrink-0 text-right">{idx + 1}.</span>
                <span className="truncate">{sTitle}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

const SongbookPreviewComponent: React.FC<SongbookPreviewProps> = ({ 
  data, 
  settings, 
  isUpdatingLayout = false, 
  onOpenSettings,
  onDownloadStatusChange,
  zoomMode: propsZoomMode,
  setZoomMode: propsSetZoomMode,
  customZoom: propsCustomZoom,
  setCustomZoom: propsSetCustomZoom,
  onScaleChange,
  isSongNavOpen: propsIsSongNavOpen,
  setIsSongNavOpen: propsSetSongNavOpen,
}) => {
  const songs = useMemo(() => {
    if (!data) return [];
    return data.songs || data.items || data.songbookSongs?.map((i: any) => i.song) || [];
  }, [data]);
  const title = useMemo(() => {
    if (!data) return 'Untitled Songbook';
    return data.title || data.name || 'Untitled Songbook';
  }, [data]);

  const containerRef = useRef<HTMLDivElement>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const printTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const printSafetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const originalTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : '');
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1000, 
    height: typeof window !== 'undefined' ? window.innerHeight : 900 
  });

  const [internalZoomMode, setInternalZoomMode] = useState<ZoomMode>('fit-width');
  const [internalCustomZoom, setInternalCustomZoom] = useState<number>(1.0);

  const zoomMode = propsZoomMode !== undefined ? propsZoomMode : internalZoomMode;
  const setZoomMode = propsSetZoomMode !== undefined ? propsSetZoomMode : setInternalZoomMode;
  const customZoom = propsCustomZoom !== undefined ? propsCustomZoom : internalCustomZoom;
  const setCustomZoom = propsSetCustomZoom !== undefined ? propsSetCustomZoom : setInternalCustomZoom;

  const [internalSongNavOpen, setInternalSongNavOpen] = useState(false);
  const isSongNavOpen = propsIsSongNavOpen !== undefined ? propsIsSongNavOpen : internalSongNavOpen;
  const setIsSongNavOpen = propsSetSongNavOpen !== undefined ? propsSetSongNavOpen : setInternalSongNavOpen;

  const [isBottomZoomMenuOpen, setIsBottomZoomMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const isDebugFeatureEnabled = isDebugHudConfigured();
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(() => {
    if (!isDebugHudConfigured()) return false;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kytario-debug-view') === 'true';
    }
    return false;
  });
  const [activeSongIndex, setActiveSongIndex] = useState<number>(0);

  // Throttled ResizeObserver using requestAnimationFrame for immediate frame-synchronized measurement
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    let rafId: number | null = null;

    const measure = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      setContainerSize(prev => (Math.abs(prev.width - w) < 2 && Math.abs(prev.height - h) < 2 ? prev : { width: w, height: h }));
    };

    const scheduleMeasure = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        measure();
      });
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(() => {
      scheduleMeasure();
    });

    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', scheduleMeasure);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('#zoom-controls-toolbar') && 
        !target.closest('#song-nav-modal') &&
        !target.closest('#floating-nav-btn')
      ) {
        setIsBottomZoomMenuOpen(false);
        setIsSongNavOpen(false);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Page Physical Dimensions in CSS and Pixels (96 DPI)
  const { width: cssWidth, height: cssHeight, basePxWidth, basePxHeight } = useMemo(() => {
    const isLand = settings.orientation === 'landscape';
    const mmToPx = 3.779528; // Standard CSS pixels per mm

    switch (settings.pageFormat) {
      case 'A4':
        return isLand 
          ? { width: '297mm', height: '210mm', basePxWidth: 297 * mmToPx, basePxHeight: 210 * mmToPx } 
          : { width: '210mm', height: '297mm', basePxWidth: 210 * mmToPx, basePxHeight: 297 * mmToPx };
      case 'A5':
        return isLand 
          ? { width: '210mm', height: '148mm', basePxWidth: 210 * mmToPx, basePxHeight: 148 * mmToPx } 
          : { width: '148mm', height: '210mm', basePxWidth: 148 * mmToPx, basePxHeight: 210 * mmToPx };
      case 'Letter':
        return isLand 
          ? { width: '11in', height: '8.5in', basePxWidth: 11 * 96, basePxHeight: 8.5 * 96 } 
          : { width: '8.5in', height: '11in', basePxWidth: 8.5 * 96, basePxHeight: 11 * 96 };
      default:
        return { width: '210mm', height: '297mm', basePxWidth: 210 * mmToPx, basePxHeight: 297 * mmToPx };
    }
  }, [settings.pageFormat, settings.orientation]);

  // Compute adaptive scales
  const isMobile = containerSize.width < 768;
  const paddingX = isMobile ? 24 : 64;
  const paddingY = isMobile ? 40 : 80;
  
  const availWidth = Math.max(200, containerSize.width - paddingX);
  const availHeight = Math.max(200, containerSize.height - paddingY);

  const fitWidthScale = Math.max(0.25, Math.min(3.0, availWidth / basePxWidth));
  const fitPageScale = Math.max(0.25, Math.min(3.0, Math.min(availWidth / basePxWidth, availHeight / basePxHeight)));

  let effectiveScale = customZoom;
  if (zoomMode === 'fit-width') {
    effectiveScale = fitWidthScale;
  } else if (zoomMode === 'fit-page') {
    effectiveScale = fitPageScale;
  }

  useEffect(() => {
    if (onScaleChange) {
      onScaleChange(effectiveScale);
    }
  }, [effectiveScale, onScaleChange]);

  // Display percentage and scaled wrapper dimensions
  const displayPercentage = Math.round(effectiveScale * 100);
  const scaledWidth = Math.round(basePxWidth * effectiveScale);
  const scaledHeight = Math.round(basePxHeight * effectiveScale);

  const handleZoomIn = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const baseScale = Math.round(effectiveScale * 10) / 10;
    const nextScale = Math.min(3.0, baseScale + 0.1);
    setCustomZoom(Math.round(nextScale * 100) / 100);
    setZoomMode('custom');
    setIsBottomZoomMenuOpen(false);
  }, [effectiveScale, setCustomZoom, setZoomMode]);

  const handleZoomOut = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const baseScale = Math.round(effectiveScale * 10) / 10;
    const nextScale = Math.max(0.25, baseScale - 0.1);
    setCustomZoom(Math.round(nextScale * 100) / 100);
    setZoomMode('custom');
    setIsBottomZoomMenuOpen(false);
  }, [effectiveScale, setCustomZoom, setZoomMode]);

  const setPresetZoom = useCallback((mode: ZoomMode, val?: number) => {
    setZoomMode(mode);
    if (val !== undefined) {
      setCustomZoom(val);
    }
    setIsBottomZoomMenuOpen(false);
  }, []);

  // Keyboard shortcuts: Ctrl/Cmd + Plus, Ctrl/Cmd + Minus, Ctrl/Cmd + 0
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        handleZoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setPresetZoom('custom', 1.0);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        if (!isDebugFeatureEnabled) return;
        e.preventDefault();
        setIsDebugOpen(prev => {
          const next = !prev;
          try { localStorage.setItem('kytario-debug-view', String(next)); } catch (err) {}
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, setPresetZoom, isDebugFeatureEnabled]);

  // Mouse wheel zoom inside preview canvas: Ctrl/Cmd + Scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoomIn();
        } else if (e.deltaY > 0) {
          handleZoomOut();
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleZoomIn, handleZoomOut]);

  // Stable ref for effectiveScale to prevent Touch/Pinch gesture handler from re-binding mid-gesture
  const effectiveScaleRef = useRef(effectiveScale);
  useEffect(() => {
    effectiveScaleRef.current = effectiveScale;
  }, [effectiveScale]);

  // Touch Pinch-to-Zoom inside preview canvas for mobile/tablet touch devices
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let initialDist = 0;
    let initialScaleVal = effectiveScaleRef.current;

    const getDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Prevent default native browser viewport scaling
        e.preventDefault();
        initialDist = getDistance(e.touches[0], e.touches[1]);
        initialScaleVal = effectiveScaleRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDist > 0) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const factor = dist / initialDist;
        const targetScale = Math.min(3.0, Math.max(0.25, initialScaleVal * factor));
        
        // Update customZoom and set mode to custom
        setCustomZoom(Math.round(targetScale * 100) / 100);
        setZoomMode('custom');
      }
    };

    const handleTouchEnd = () => {
      initialDist = 0;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [setCustomZoom, setZoomMode]);

  const handleScrollTo = useCallback((id: string) => {
    setIsSongNavOpen(false);
    const element = document.getElementById(id);
    if (element && containerRef.current) {
      element.scrollIntoView({ behavior: 'auto', block: 'start' });
      if (id.startsWith('song-')) {
        const idx = parseInt(id.replace('song-', ''), 10);
        if (!isNaN(idx)) {
          setActiveSongIndex(idx);
        }
      }
    }
  }, []);

  const scrollToTop = () => {
    if (containerRef.current) {
      try {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) {
        containerRef.current.scrollTop = 0;
      }
    }
  };

  // Calculate dynamic pagination for Table of Contents (Memoized for high performance)
  const tocPages = useMemo(() => {
    if (settings.showTableOfContents === false || settings.showToc === false || settings.showIndex === false || songs.length === 0) {
      return [];
    }
    let items: Array<{
      song?: Song;
      originalIndex?: number;
      title: string;
      artist?: string;
      groupLetter?: string;
    }> = songs.map((song, i) => ({
      song,
      originalIndex: i,
      title: song.title || song.name || 'Unknown Title',
      artist: song.artist || song.author || song.interpreter || ''
    }));

    if (settings.indexSortOrder === 'alphabetical') {
      const getSortKey = (t: string) => t.trim().replace(/^["'„“\(\[\{]+/, '');
      items.sort((a, b) => getSortKey(a.title).localeCompare(getSortKey(b.title), 'cs'));
      
      if (settings.tocAlphabeticalGrouping) {
        let currentLetter = '';
        for (const item of items) {
          const cleanTitle = getSortKey(item.title);
          const upper = cleanTitle.toUpperCase();
          const isCh = upper.startsWith('CH');
          const firstChar = upper.charAt(0) || '#';
          const map: Record<string, string> = {
            'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ý': 'Y', 'Ů': 'U',
            'Ä': 'A', 'Ö': 'O', 'Ü': 'U', 'Ë': 'E'
          };
          let letter = isCh ? 'CH' : (map[firstChar] || firstChar);
          letter = isCh ? 'CH' : (/^[A-Z0-9ČĎŇŘŠŤŽ]$/i.test(letter) ? letter : '#');
          if (letter !== currentLetter) {
            currentLetter = letter;
            item.groupLetter = currentLetter;
          }
        }
      }
    }

    const mmToPx = 3.779528;
    const isLandscape = settings.orientation === 'landscape';
    const tocColumns = isLandscape ? 3 : 2;
    const tocMargins = getPageMargins(settings);
    const paddingTotalY = (tocMargins.top + tocMargins.bottom) * mmToPx;
    
    const safeTocSize = Number(settings.tocFontSize) || (Number(settings.lyricsFontSize) * 0.95) || 12;
    const safeTitleSize = Number(settings.titleFontSize) || 16;

    // Explicit row metrics in pixels (guaranteed 1:1 match with rendered DOM elements)
    const rowLineHeight = 1.35;
    const rowLineHeightPx = Math.ceil(safeTocSize * rowLineHeight);
    const rowPaddingYPx = 1.5;
    const rowMarginBottomPx = 1;
    const singleItemHeight = rowLineHeightPx + (rowPaddingYPx * 2) + rowMarginBottomPx;

    const showDividers = (settings.indexSortOrder === 'alphabetical') && !!settings.tocAlphabeticalGrouping && (settings.tocGroupDividers !== false);
    const dividerTotalHeight = 7; // 1px border + 3px marginTop + 3px marginBottom

    // Page 1 Header exact height
    const headerHeightP1 = Math.ceil(Math.round(safeTitleSize * 1.15) * 1.2) + 36;
    
    // Subsequent Pages Header exact height
    const headerHeightSubsequent = Math.ceil(Math.round(safeTitleSize * 0.85) * 1.2) + 37;

    // Minimal safety buffer (2px) to handle sub-pixel rounding without artificially inflating the margin
    const bottomSafetyBuffer = 2;

    const availableContentHeightP1 = Math.max(80, basePxHeight - paddingTotalY - headerHeightP1 - bottomSafetyBuffer);
    const availableContentHeightSubsequent = Math.max(80, basePxHeight - paddingTotalY - headerHeightSubsequent - bottomSafetyBuffer);

    const pages: TocPage[] = [];
    const totalItems = items.length;
    let offset = 0;
    let pageNum = 1;

    while (offset < totalItems) {
      const isFirst = pageNum === 1;
      const availH = isFirst ? availableContentHeightP1 : availableContentHeightSubsequent;
      const remaining = totalItems - offset;

      // Start testing from theoretical max down to 1
      const maxPossible = Math.min(remaining, Math.ceil(availH / singleItemHeight) * tocColumns);
      let K = maxPossible;

      while (K > 1) {
        const candidateItems = items.slice(offset, offset + K);
        const cols = balanceColumns(candidateItems, tocColumns);
        const maxColH = Math.max(...cols.map(c => getColumnHeight(c, showDividers, singleItemHeight, dividerTotalHeight)));

        if (maxColH <= availH) {
          // Prevent leaving an orphan group header as the very last item of this page if more items follow
          if (offset + K < totalItems && candidateItems[candidateItems.length - 1].groupLetter && K > 1) {
            K--;
            continue;
          }
          break;
        }
        K--;
      }

      const pageItems = items.slice(offset, offset + K);
      const cols = balanceColumns(pageItems, tocColumns);

      pages.push({
        pageIndex: pageNum,
        totalPages: 1,
        items: pageItems,
        columnsData: cols,
        isFirstPage: isFirst,
        columns: tocColumns,
      });

      offset += K;
      pageNum++;
    }

    const totalPages = pages.length;
    for (let i = 0; i < totalPages; i++) {
      pages[i].totalPages = totalPages;
    }

    return pages;
  }, [
    songs, 
    title,
    settings.indexSortOrder, 
    settings.tocAlphabeticalGrouping,
    settings.tocGroupDividers,
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
    settings.tocFontSize,
    settings.lyricsFontSize, 
    settings.titleFontSize, 
    basePxHeight
  ]);

  const isScaled = Math.abs(effectiveScale - 1.0) > 0.005;

  // Track scroll position for "Back to Top" button and active song index with O(1) math
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (el) {
            setShowScrollTop(el.scrollTop > 400);

            // Determine currently active song in viewport with high-performance O(1) page step math
            if (songs.length > 0) {
              const pageStep = (isScaled ? scaledHeight : (parseInt(cssHeight, 10) || 1123)) + 40;
              const tocTotalHeight = (tocPages.length || 0) * pageStep;
              const scrollFromSongs = Math.max(0, el.scrollTop - tocTotalHeight + pageStep * 0.3);
              const computedIndex = Math.min(songs.length - 1, Math.max(0, Math.floor(scrollFromSongs / pageStep)));
              setActiveSongIndex(prev => (prev !== computedIndex ? computedIndex : prev));
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [songs.length, isScaled, scaledHeight, cssHeight, tocPages.length]);

  const documentTitle = useMemo(() => {
    const raw = title || 'Kytario_Songbook';
    return raw.trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
  }, [title]);

  const syncHeadPrintPageSetup = useCallback((pageFormat: string, orientation: string, width: string, height: string, settings: PrintSettings) => {
    if (typeof document === 'undefined') return;
    let styleEl = document.getElementById('kytario-print-page-setup') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'kytario-print-page-setup';
      document.head.appendChild(styleEl);
    }
    const formatName = pageFormat === 'Letter' ? 'letter' : pageFormat;

    // For double-sided book printing, we use @page :left and :right pseudo-classes
    // to provide the print engine with precise margin information for registration.
    const inner = settings.pageMarginInner ?? 5;
    const outer = settings.pageMarginOuter ?? 5;

    styleEl.textContent = `
      @page {
        size: ${formatName} ${orientation};
        size: ${width} ${height};
        margin: 0mm !important;
        bleed: 0mm;
        marks: none;
      }
      @page :first {
        size: ${formatName} ${orientation};
        size: ${width} ${height};
        margin: 0mm !important;
      }
      @page :left {
        size: ${formatName} ${orientation};
        size: ${width} ${height};
        ${settings.bookMode ? `
          margin-left: ${outer}mm !important;
          margin-right: ${inner}mm !important;
        ` : 'margin: 0mm !important;'}
      }
      @page :right {
        size: ${formatName} ${orientation};
        size: ${width} ${height};
        ${settings.bookMode ? `
          margin-left: ${inner}mm !important;
          margin-right: ${outer}mm !important;
        ` : 'margin: 0mm !important;'}
      }
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* Ensure the containers themselves don't double up the margin if the @page margin is respected */
        .print-page-container, .print-index-container, .print-cover-container {
          ${settings.bookMode ? 'padding-left: 0 !important; padding-right: 0 !important;' : ''}
        }
      }
    `;
  }, []);

  // Keep document head @page print rules in exact sync with current format and orientation
  useEffect(() => {
    syncHeadPrintPageSetup(settings.pageFormat, settings.orientation, cssWidth, cssHeight, settings);
  }, [settings, cssWidth, cssHeight, syncHeadPrintPageSetup]);

  const cleanupPrint = useCallback(() => {
    if (printTimeoutRef.current) {
      clearTimeout(printTimeoutRef.current);
      printTimeoutRef.current = null;
    }
    if (printSafetyTimerRef.current) {
      clearTimeout(printSafetyTimerRef.current);
      printSafetyTimerRef.current = null;
    }
    setIsPrinting(false);
    setIsPreparingPdf(false);
    if (onDownloadStatusChange) {
      onDownloadStatusChange(false);
    }
    if (originalTitleRef.current) {
      try {
        document.title = originalTitleRef.current;
      } catch (e) {}
    }
  }, [onDownloadStatusChange]);

  const handleDownloadPdf = useCallback(() => {
    // 0. Ensure document head has exact, current @page size & orientation rules before printing
    syncHeadPrintPageSetup(settings.pageFormat, settings.orientation, cssWidth, cssHeight, settings);

    // 1. Instantly trigger visual indicators (0ms delay) so user never sees a frozen app
    setIsPreparingPdf(true);
    setIsPrinting(true);
    if (onDownloadStatusChange) {
      onDownloadStatusChange(true);
    }

    try {
      originalTitleRef.current = document.title;
      document.title = documentTitle;
    } catch (e) {}

    if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
    if (printSafetyTimerRef.current) clearTimeout(printSafetyTimerRef.current);

    // Dynamic wait time scaled by song count to guarantee complete layout of all pages
    // 35 songs -> ~450ms
    // 100 songs -> ~900ms
    // 250 songs -> ~1900ms
    const totalCount = songs.length;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const baseWait = Math.min(2400, Math.max(450, Math.round(totalCount * 7.5)));
    const waitTime = isMobile ? Math.max(baseWait, 900) : baseWait;

    // 2. Yield control via double requestAnimationFrame to ensure browser paints status banner
    // and applies CSS content-visibility un-skipping across all pages
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        // Ensure web fonts are completely resolved before snapshotting/printing
        if (document.fonts && document.fonts.ready) {
          try {
            await document.fonts.ready;
          } catch (e) {}
        }

        printTimeoutRef.current = setTimeout(() => {
          let cleanedUp = false;
          const doCleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            window.removeEventListener('afterprint', doCleanup);
            cleanupPrint();
          };

          window.addEventListener('afterprint', doCleanup, { once: true });

          // Fallback safety timeout: 180s (3 minutes) instead of 25s,
          // ensuring large 250+ page print preview generation is never aborted mid-generation
          printSafetyTimerRef.current = setTimeout(doCleanup, 180000);

          try {
            window.print();
          } catch (err) {
            console.error('Print execution error:', err);
            doCleanup();
          }
        }, waitTime);
      });
    });
  }, [documentTitle, songs.length, onDownloadStatusChange, cleanupPrint, settings.pageFormat, settings.orientation, cssWidth, cssHeight, syncHeadPrintPageSetup]);

  // Global browser print event listeners (handles Direct Print, Ctrl+P, and Download as PDF)
  useEffect(() => {
    const handleBeforePrint = () => {
      syncHeadPrintPageSetup(settings.pageFormat, settings.orientation, cssWidth, cssHeight);
      setIsPreparingPdf(true);
      setIsPrinting(true);
      try {
        originalTitleRef.current = document.title;
        document.title = documentTitle;
      } catch (e) {}
    };
    const handleAfterPrint = () => {
      cleanupPrint();
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [documentTitle, cleanupPrint, settings.pageFormat, settings.orientation, cssWidth, cssHeight, syncHeadPrintPageSetup]);

  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
      if (printSafetyTimerRef.current) clearTimeout(printSafetyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (onDownloadStatusChange) {
      onDownloadStatusChange(isPreparingPdf || isPrinting);
    }
  }, [isPreparingPdf, isPrinting, onDownloadStatusChange]);

  const coverPagesCount = (settings.showFrontCover !== false ? 1 : 0) + (settings.showBackCover !== false ? 1 : 0);
  const totalPages = coverPagesCount + tocPages.length + songs.length;

  const activeSong = songs[activeSongIndex] || songs[0] || null;

  const activeDebugInfo = useMemo(() => {
    if (!activeSong) return null;
    return computeSongFitDebug(activeSong, activeSongIndex, settings);
  }, [activeSong, activeSongIndex, settings]);

  // Console log active song metrics for developer inspection
  useEffect(() => {
    if (!activeDebugInfo) return;
    console.log(
      `%c[Song Fit Debug]%c #${activeDebugInfo.songIndex + 1} "${activeDebugInfo.title}" | ` +
      `Calculated Total Lines: ${activeDebugInfo.totalLines} (raw: ${activeDebugInfo.rawLinesCount}, section: ${activeDebugInfo.sectionLinesCount}, visual: ${activeDebugInfo.visualLinesAtScale}) | ` +
      `Chosen Font Size: ${activeDebugInfo.chosenLyricsFontSize}px (Scale: ${activeDebugInfo.computedScale}x, Base: ${activeDebugInfo.baseLyricsFontSize}px) | ` +
      `Height: ${activeDebugInfo.calculatedHeight}px / ${activeDebugInfo.availColHeight}px (${activeDebugInfo.heightUtilization}%)`,
      'background: #1e293b; color: #38bdf8; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
      'color: inherit;'
    );
  }, [activeDebugInfo]);

  // Global helper on window for easy DevTools interaction
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__KYTARIO_DEBUG__ = {
        getActiveSong: () => activeDebugInfo,
        getAllSongs: () => songs.map((s, i) => computeSongFitDebug(s, i, settings)),
        toggleDebugView: () => {
          if (!isDebugFeatureEnabled) {
            console.warn('[Songbook Debug] Debug HUD is hidden because ENABLE_DEBUG_HUD is false in src/config.ts.');
            return;
          }
          setIsDebugOpen(prev => {
            const next = !prev;
            try { localStorage.setItem('kytario-debug-view', String(next)); } catch (e) {}
            return next;
          });
        },
      };
    }
  }, [activeDebugInfo, songs, settings, isDebugFeatureEnabled]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative print:h-auto print:min-h-0 print:overflow-visible print:block print:static">
      {/* Floating Status Pill when Songbook is Updating (Prominent Black Oval) */}
      {isUpdatingLayout && (
        <div 
          id="preview-updating-status-pill"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-50 print:hidden flex items-center gap-3 bg-zinc-950/95 text-white px-6 py-2.5 rounded-full shadow-2xl border border-zinc-700/80 backdrop-blur-md animate-in fade-in slide-in-from-top-2 text-sm font-semibold select-none pointer-events-none"
        >
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          <span>Updating preview...</span>
        </div>
      )}

      {/* SCROLLABLE PREVIEW CANVAS */}
      <div 
        ref={containerRef}
        className="relative flex-1 overflow-y-auto overflow-x-auto bg-zinc-50 p-3 sm:p-8 pb-28 sm:pb-36 print:p-0 print:m-0 print:bg-white print:h-auto print:min-h-0 print:overflow-visible print:block print:static print-scroll-container"
      >
        {(isPreparingPdf || isPrinting) && (
          <div 
            id="preview-downloading-pdf-pill"
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 print:hidden flex items-center gap-2.5 bg-blue-600 text-white px-4 py-2 rounded-full shadow-xl border border-blue-500/80 backdrop-blur-md animate-in fade-in slide-in-from-top-3 text-xs font-bold select-none pointer-events-none"
          >
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>
              Preparing {settings.pageFormat} {settings.orientation === 'landscape' ? 'Landscape' : 'Portrait'} PDF...
            </span>
          </div>
        )}

        {/* SONG PAGES LIST (ISOLATED & MEMOIZED PRINTABLE ROOT) */}
        <div 
          ref={printableRef}
          id="songbook-printable-area"
          className={`songbook-print-root ${isPrinting ? 'is-printing-mode' : ''} animate-in fade-in duration-200 min-w-fit flex flex-col items-center print:block print:h-auto print:min-h-0 print:w-full print:static print:overflow-visible print:m-0 print:p-0 ${isUpdatingLayout ? 'opacity-80' : 'opacity-100'}`}
        >
          <SongPagesList 
            songs={songs}
            title={title}
            url={data.url}
            shortUrl={data.shortUrl}
            slug={data.slug}
            settings={settings}
            tocPages={tocPages}
            cssWidth={cssWidth}
            cssHeight={cssHeight}
            scaledWidth={scaledWidth}
            scaledHeight={scaledHeight}
            effectiveScale={effectiveScale}
            isScaled={isScaled}
            onScrollToSong={handleScrollTo}
            isDebugMode={isDebugFeatureEnabled && isDebugOpen}
          />
        </div>

        {/* Spacer so bottom floating toolbar does not cover bottom of last page */}
        <div className="h-28 sm:h-24 print:hidden" />
      </div>

      {/* FLOATING QUICK ACTIONS GROUP (PAGES NAVIGATOR, DEBUG HUD & SCROLL TO TOP - OUT OF THE WAY OF BOTTOM BAR) */}
      <div className="fixed bottom-28 sm:bottom-24 right-4 z-30 print:hidden flex flex-col gap-2">
        {/* Scroll to Top */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="w-10 h-10 bg-white/95 hover:bg-zinc-100 text-zinc-600 rounded-full shadow-lg border border-black/10 flex items-center justify-center transition-colors cursor-pointer"
            title="Scroll to Top"
            aria-label="Scroll to Top"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        )}

        {/* Quick Song Navigator Popover - Now controlled from floating bar in App.tsx */}
        <QuickSongNavigator 
          songs={songs}
          isSongNavOpen={isSongNavOpen}
          onScrollTo={handleScrollTo}
        />

        {/* Toggle Hidden Song Fit Debug View - ONLY rendered if ENABLE_DEBUG_HUD is true in src/config.ts */}
        {isDebugFeatureEnabled && (
          <button
            id="toggle-debug-view-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsDebugOpen(prev => {
                const next = !prev;
                try { localStorage.setItem('kytario-debug-view', String(next)); } catch (err) {}
                return next;
              });
            }}
            className={`w-10 h-10 bg-white/95 hover:bg-zinc-100 text-zinc-600 rounded-full shadow-lg border border-black/10 flex items-center justify-center transition-colors cursor-pointer ${
              isDebugOpen 
                ? 'bg-amber-500/20 text-amber-600 font-bold hover:bg-amber-500/30' 
                : 'hover:bg-black/5 hover:text-zinc-900'
            }`}
            title="Toggle Song Fit Debug View"
            aria-label="Toggle Debug View"
          >
            <Bug className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Global styles for preview transitions and printing */}
      <style>{`
        /* Text element transitions have been removed to prevent scroll reflow animations */
        .song-section {
          font-size: calc(var(--song-scale, 1) * var(--lyrics-size));
        }
        .song-line {
          font-size: calc(var(--song-scale, 1) * var(--lyrics-size));
        }
        .song-marker {
          color: var(--marker-color);
          font-size: calc(var(--song-scale, 1) * var(--lyrics-size) * 0.833);
        }
        .song-chord {
          color: var(--chords-color);
          font-size: calc(var(--song-scale, 1) * var(--chords-size));
          min-height: calc(var(--song-scale, 1) * var(--chords-size));
          margin-bottom: 0.15em;
        }
        .song-repetition-line .song-chord {
          margin-bottom: 0;
          min-height: auto;
        }
        .song-lyric {
          color: var(--lyrics-color);
          min-height: calc(var(--song-scale, 1) * var(--lyrics-size));
        }

        /* Page container scaling performance optimization */
        .song-page-outer-wrapper {
          will-change: width, height;
        }
        .songbook-print-root.is-printing-mode .song-page-outer-wrapper {
          content-visibility: visible !important;
          contain-intrinsic-size: none !important;
        }
        .print-page-container,
        .print-index-container {
          will-change: transform, width, height;
        }

        @page {
          size: ${settings.pageFormat === 'Letter' ? 'letter' : settings.pageFormat} ${settings.orientation};
          size: ${cssWidth} ${cssHeight};
          margin: 0mm !important;
        }
        @page :first {
          size: ${settings.pageFormat === 'Letter' ? 'letter' : settings.pageFormat} ${settings.orientation};
          size: ${cssWidth} ${cssHeight};
          margin: 0mm !important;
        }
        @page :left {
          size: ${settings.pageFormat === 'Letter' ? 'letter' : settings.pageFormat} ${settings.orientation};
          size: ${cssWidth} ${cssHeight};
          margin: 0mm !important;
        }
        @page :right {
          size: ${settings.pageFormat === 'Letter' ? 'letter' : settings.pageFormat} ${settings.orientation};
          size: ${cssWidth} ${cssHeight};
          margin: 0mm !important;
        }

        @media print {
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            transition: none !important;
            animation: none !important;
          }

          /* Ensure all ancestors avoid clipping and overflow termination */
          html, body, #root {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
          }

          .print-scroll-container {
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            position: static !important;
            display: block !important;
          }

          .songbook-print-root {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            position: static !important;
          }

          .song-page-outer-wrapper {
            content-visibility: visible !important;
            contain-intrinsic-size: none !important;
            will-change: auto !important;
            width: ${cssWidth} !important;
            height: ${cssHeight} !important;
            min-height: ${cssHeight} !important;
            max-height: ${cssHeight} !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-before: auto !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            position: relative !important;
            display: block !important;
            transform: none !important;
            box-shadow: none !important;
            border: none !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            float: none !important;
            clear: both !important;
          }

          .song-page-outer-wrapper:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .print-page-container {
            display: flex !important;
            flex-direction: column !important;
            will-change: auto !important;
            width: ${cssWidth} !important;
            height: ${cssHeight} !important;
            min-height: ${cssHeight} !important;
            max-height: ${cssHeight} !important;
            transform: none !important;
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .print-index-container {
            display: flex !important;
            flex-direction: column !important;
            will-change: auto !important;
            width: ${cssWidth} !important;
            height: ${cssHeight} !important;
            min-height: ${cssHeight} !important;
            max-height: ${cssHeight} !important;
            transform: none !important;
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .print-cover-container {
            display: flex !important;
            flex-direction: column !important;
            will-change: auto !important;
            width: ${cssWidth} !important;
            height: ${cssHeight} !important;
            min-height: ${cssHeight} !important;
            max-height: ${cssHeight} !important;
            transform: none !important;
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Song Display Root & Header Positioning */
          .song-display-root {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 1 0% !important;
            height: 100% !important;
            min-height: 0 !important;
            position: relative !important;
          }

          /* Song Title and Header Block */
          .song-title-block {
            display: block !important;
            text-align: center !important;
            padding-left: 2rem !important;
            padding-right: 2rem !important;
            margin-bottom: 1.25rem !important;
            flex-shrink: 0 !important;
            position: relative !important;
            z-index: 5 !important;
          }

          /* Page / Song Number Badge: 100% reliable visibility in all PDF generators */
          .song-page-number-badge {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: absolute !important;
            top: 0 !important;
            width: 26px !important;
            height: 26px !important;
            min-width: 26px !important;
            min-height: 26px !important;
            border-radius: 5px !important;
            background-color: #27272a !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            forced-color-adjust: none !important;
            border: 1px solid #18181b !important;
            z-index: 50 !important;
            visibility: visible !important;
            opacity: 1 !important;
          }

          .song-page-number-badge svg {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .song-page-number-badge svg rect {
            fill: #27272a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .song-page-number-badge span {
            display: block !important;
            position: relative !important;
            z-index: 10 !important;
            color: #ffffff !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            line-height: 1 !important;
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-hidden, [print-hidden] {
            display: none !important;
          }

          .song-section {
            font-size: calc(var(--song-scale, 1) * var(--lyrics-size)) !important;
          }
          .song-line {
            font-size: calc(var(--song-scale, 1) * var(--lyrics-size)) !important;
          }
          .song-marker {
            color: var(--marker-color) !important;
            font-size: calc(var(--song-scale, 1) * var(--lyrics-size) * 0.833) !important;
          }
          .song-chord {
            color: var(--chords-color) !important;
            font-size: calc(var(--song-scale, 1) * var(--chords-size)) !important;
            min-height: calc(var(--song-scale, 1) * var(--chords-size)) !important;
            margin-bottom: 0.15em !important;
          }
          .song-repetition-line .song-chord {
            margin-bottom: 0 !important;
            min-height: auto !important;
          }
          .song-lyric {
            color: var(--lyrics-color) !important;
            min-height: calc(var(--song-scale, 1) * var(--lyrics-size)) !important;
          }
        }
      `}</style>

      {/* Floating Song Fit Debug HUD - ONLY rendered if ENABLE_DEBUG_HUD is true in src/config.ts */}
      {isDebugFeatureEnabled && isDebugOpen && (
        <SongFitDebugHud 
          debugInfo={activeDebugInfo}
          totalSongs={songs.length}
          onPrevSong={() => {
            if (activeSongIndex > 0) {
              const nextIdx = activeSongIndex - 1;
              setActiveSongIndex(nextIdx);
              handleScrollTo(`song-${nextIdx}`);
            }
          }}
          onNextSong={() => {
            if (activeSongIndex < songs.length - 1) {
              const nextIdx = activeSongIndex + 1;
              setActiveSongIndex(nextIdx);
              handleScrollTo(`song-${nextIdx}`);
            }
          }}
          onClose={() => {
            setIsDebugOpen(false);
            try { localStorage.setItem('kytario-debug-view', 'false'); } catch (err) {}
          }}
          onScrollToActive={() => handleScrollTo(`song-${activeSongIndex}`)}
        />
      )}
    </div>
  );
};

export const SongbookPreview = memo(SongbookPreviewComponent, songbookPreviewComparator);
