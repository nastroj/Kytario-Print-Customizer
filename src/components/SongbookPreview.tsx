import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, memo, useCallback } from 'react';
import { SongbookData, PrintSettings, Song } from '../types';
import { SongDisplay } from './SongDisplay';
import { SongbookSkeleton } from './SongbookSkeleton';
import { SongFitDebugHud } from './SongFitDebugHud';
import { getDisplayColor, computeSongFitDebug } from '../utils';
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
  Eye,
  Ruler,
  Columns,
  X
} from 'lucide-react';

interface SongbookPreviewProps {
  data: SongbookData;
  settings: PrintSettings;
  isUpdatingLayout?: boolean;
  onOpenSettings?: () => void;
  onRegisterPrintTrigger?: (trigger: () => void) => void;
  onRegisterPrintPreviewTrigger?: (trigger: () => void) => void;
  onPrintPreviewStateChange?: (isActive: boolean) => void;
  onDownloadStatusChange?: (isDownloading: boolean) => void;
  isDarkMode?: boolean;
}

type ZoomMode = 'fit-width' | 'fit-page' | 'custom';

const ZOOM_STEPS = [0.25, 0.35, 0.5, 0.65, 0.75, 0.9, 1.0, 1.15, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

interface TocPage {
  pageIndex: number;
  totalPages: number;
  items: Array<{
    song: Song;
    originalIndex: number;
    title: string;
    artist: string;
  }>;
  isFirstPage: boolean;
  columns: number;
}

// On-Screen Print Margin Guides & Physical Sheet Crop Marks Overlay
interface PageMarginGuidesProps {
  marginMmX: number;
  marginMmY: number;
  marginMmYBottom?: number;
  pageFormat: string;
  orientation: string;
  pageLabel?: string;
}

const PageMarginGuides = memo(function PageMarginGuides({
  marginMmX,
  marginMmY,
  marginMmYBottom,
  pageFormat,
  orientation,
  pageLabel
}: PageMarginGuidesProps) {
  const bottomMm = marginMmYBottom ?? marginMmY;
  return (
    <div 
      className="pointer-events-none absolute inset-0 z-30 print:hidden overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Dashed Margin Border indicating Safe Printable Area */}
      <div 
        className="absolute border border-dashed border-sky-500/70 dark:border-sky-400/60 bg-sky-500/[0.02] dark:bg-sky-400/[0.02]"
        style={{
          top: `${marginMmY}mm`,
          bottom: `${bottomMm}mm`,
          left: `${marginMmX}mm`,
          right: `${marginMmX}mm`,
        }}
      >
        {/* Margin Guide Tag */}
        <div className="absolute top-1 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50/95 dark:bg-sky-950/90 text-sky-700 dark:text-sky-300 text-[9px] font-mono font-semibold border border-sky-300/80 dark:border-sky-700/60 shadow-2xs">
          <span>Safe Area ({marginMmX}mm × {marginMmY}{bottomMm !== marginMmY ? `/${bottomMm}` : ''}mm)</span>
        </div>
      </div>

      {/* 4 Corner Crop Marks (Simulating physical paper sheet trimming edges) */}
      {/* Top Left */}
      <div className="absolute top-1 left-1 w-4 h-4 pointer-events-none">
        <div className="absolute top-0 left-0 w-3 h-[1px] bg-zinc-400 dark:bg-zinc-600" />
        <div className="absolute top-0 left-0 w-[1px] h-3 bg-zinc-400 dark:bg-zinc-600" />
      </div>
      {/* Top Right */}
      <div className="absolute top-1 right-1 w-4 h-4 pointer-events-none">
        <div className="absolute top-0 right-0 w-3 h-[1px] bg-zinc-400 dark:bg-zinc-600" />
        <div className="absolute top-0 right-0 w-[1px] h-3 bg-zinc-400 dark:bg-zinc-600" />
      </div>
      {/* Bottom Left */}
      <div className="absolute bottom-1 left-1 w-4 h-4 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-3 h-[1px] bg-zinc-400 dark:bg-zinc-600" />
        <div className="absolute bottom-0 left-0 w-[1px] h-3 bg-zinc-400 dark:bg-zinc-600" />
      </div>
      {/* Bottom Right */}
      <div className="absolute bottom-1 right-1 w-4 h-4 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-3 h-[1px] bg-zinc-400 dark:bg-zinc-600" />
        <div className="absolute bottom-0 right-0 w-[1px] h-3 bg-zinc-400 dark:bg-zinc-600" />
      </div>

      {/* Sheet Dimensions / Page Info Tag in bottom margin */}
      <div className="absolute bottom-1.5 right-2 text-[9px] font-mono text-zinc-400 dark:text-zinc-500 select-none">
        {pageLabel ? `${pageLabel} • ` : ''}{pageFormat} ({orientation})
      </div>
    </div>
  );
});


const VirtualPage = memo(function VirtualPage({ 
  children, 
  isPrinting,
  isScaled,
  scaledWidth,
  scaledHeight,
  defaultWidth,
  defaultHeight,
  id
}: { 
  children: React.ReactNode, 
  isPrinting: boolean,
  isScaled: boolean,
  scaledWidth: number,
  scaledHeight: number,
  defaultWidth: string,
  defaultHeight: string,
  id?: string
}) {
  const [isVisible, setIsVisible] = useState(isPrinting);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPrinting) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
      }
    }, {
      rootMargin: '200% 0px'
    });

    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [isPrinting]);

  // When printing, immediately render all pages on first pass without waiting for async effects
  const shouldRender = isPrinting || isVisible;

  return (
    <div 
      ref={ref}
      id={id}
      className="mx-auto mb-6 sm:mb-10 print:mb-0 print:mx-0 shrink-0 song-page-outer-wrapper"
      style={{
        width: isPrinting ? defaultWidth : (isScaled ? `${scaledWidth}px` : 'fit-content'),
        height: isPrinting 
          ? defaultHeight 
          : (shouldRender ? (isScaled ? `${scaledHeight}px` : 'auto') : (isScaled ? `${scaledHeight}px` : defaultHeight)),
        minHeight: isPrinting ? defaultHeight : (isScaled ? `${scaledHeight}px` : defaultHeight),
        maxHeight: isPrinting ? defaultHeight : undefined,
        minWidth: isPrinting ? defaultWidth : (isScaled ? `${scaledWidth}px` : defaultWidth),
        position: 'relative',
        contentVisibility: isPrinting ? 'visible' : 'auto',
        containIntrinsicSize: isPrinting ? undefined : (isScaled ? `${scaledWidth}px ${scaledHeight}px` : `${defaultWidth} ${defaultHeight}`),
      }}
    >
      {shouldRender ? children : <div style={{ height: isScaled ? `${scaledHeight}px` : defaultHeight }} />}
    </div>
  );
});

// Dedicated Memoized Song Pages List
interface SongPagesListProps {
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
  isDarkMode?: boolean;
  isDebugMode?: boolean;
  isPrintPreviewMode?: boolean;
  showMarginGuides?: boolean;
  isPrinting?: boolean;
}

const SongPagesList = memo(function SongPagesList({
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
  isDarkMode = false,
  isDebugMode = false,
  isPrintPreviewMode = false,
  showMarginGuides = true,
  isPrinting = false,
}: SongPagesListProps) {
  const numColWidth = useMemo(() => {
    if (songs.length >= 100) return '2.8em';
    if (songs.length >= 10) return '2.1em';
    return '1.5em';
  }, [songs.length]);

  const marginMmX = settings.pageMargin ?? 5;
  const marginMmY = Math.round((settings.pageMargin ?? 5) * 1.2);
  const tocMarginMmX = settings.pageMargin ?? 5;
  const tocMarginMmYTop = Math.round((settings.pageMargin ?? 5) * 1.1);
  const tocMarginMmYBottom = Math.max(3, Math.round((settings.pageMargin ?? 5) * 0.75));
  const effectiveDarkMode = isDarkMode;
  const safeTocSize = Number(settings.tocFontSize) || (Number(settings.lyricsFontSize) * 0.95) || 12;
  const safeTitleSize = Number(settings.titleFontSize) || 16;

  const pageContainerClass = isPrintPreviewMode
    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-black/10 dark:border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-1 ring-black/5 dark:ring-white/5 print:bg-white print:text-black print:border-none print:shadow-none print:ring-0'
    : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-md print:shadow-none border border-black/5 dark:border-zinc-800';

  return (
    <>
      {/* INDEX / TABLE OF CONTENTS PAGES (PAGINATED) */}
      {tocPages.map((tocPage) => {
        const itemsPerCol = Math.max(1, Math.ceil(tocPage.items.length / tocPage.columns));
        const columnsData = Array.from({ length: tocPage.columns }, (_, c) => {
          const start = c * itemsPerCol;
          return tocPage.items.slice(start, start + itemsPerCol);
        });

        return (
          <VirtualPage
            key={`toc-page-${tocPage.pageIndex}`}
            id={tocPage.isFirstPage ? "toc-page" : `toc-page-${tocPage.pageIndex}`}
            isPrinting={isPrinting}
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
                padding: `${tocMarginMmYTop}mm ${tocMarginMmX}mm ${tocMarginMmYBottom}mm ${tocMarginMmX}mm`,
                transform: isPrinting ? 'none' : (isScaled ? `scale(${effectiveScale})` : 'none'),
                transformOrigin: 'top left',
                position: isPrinting ? 'relative' : (isScaled ? 'absolute' : 'relative'),
                top: 0,
                left: 0,
              }}
            >
              {/* On-Screen Print Margin Guides Overlay */}
              {isPrintPreviewMode && showMarginGuides && (
                <PageMarginGuides 
                  marginMmX={tocMarginMmX} 
                  marginMmY={tocMarginMmYTop} 
                  marginMmYBottom={tocMarginMmYBottom}
                  pageFormat={settings.pageFormat} 
                  orientation={settings.orientation}
                  pageLabel={`Contents p.${tocPage.pageIndex}`}
                />
              )}

              {/* Page Header */}
              {tocPage.isFirstPage ? (
                <div className="mb-3 sm:mb-3.5 text-center shrink-0">
                  <h1 
                    className="font-bold uppercase tracking-tight toc-title-header truncate px-2"
                    style={{ 
                      color: getDisplayColor(settings.titleColor, effectiveDarkMode), 
                      fontSize: `${safeTitleSize * 1.15}px`,
                      lineHeight: 1.2
                    }}
                  >
                    {title}
                  </h1>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wider font-medium flex items-center justify-center gap-1.5 select-none">
                    <span>Obsah{tocPages.length > 1 ? ` • Strana 1 z ${tocPages.length}` : ''}</span>
                    <span className="print:hidden normal-case font-normal text-[11px] text-zinc-400 dark:text-zinc-500">
                      • tap to jump
                    </span>
                  </p>
                </div>
              ) : (
                <div className="mb-2.5 text-center border-b border-black/5 dark:border-zinc-800 pb-1 shrink-0">
                  <h2 
                    className="font-bold uppercase tracking-tight toc-title-header truncate px-2"
                    style={{ 
                      color: getDisplayColor(settings.titleColor, effectiveDarkMode), 
                      fontSize: `${safeTitleSize * 0.85}px`,
                      lineHeight: 1.2
                    }}
                  >
                    {title} <span className="text-zinc-400 dark:text-zinc-500 font-normal text-xs normal-case">(pokračování)</span>
                  </h2>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wider font-medium flex items-center justify-center gap-1.5 select-none">
                    <span>Obsah • Strana {tocPage.pageIndex} z {tocPages.length}</span>
                    <span className="print:hidden normal-case font-normal text-[11px] text-zinc-400 dark:text-zinc-500">
                      • tap to jump
                    </span>
                  </p>
                </div>
              )}
              
              {/* Columns of Song Titles */}
              <div 
                className="flex-1 min-h-0 flex toc-columns-body overflow-hidden"
                style={{ 
                  gap: tocPage.columns === 3 ? '1.75rem' : '2.5rem',
                  color: getDisplayColor(settings.tocColor || settings.lyricsColor, effectiveDarkMode),
                  fontSize: `${safeTocSize}px`,
                }}
              >
                {columnsData.map((colItems, colIdx) => (
                  <div 
                    key={colIdx} 
                    className="flex-1 min-w-0 flex flex-col overflow-hidden"
                    style={{ 
                      maxWidth: `${100 / tocPage.columns}%` 
                    }}
                  >
                    {colItems.map((item) => {
                      const fullTitle = `${item.originalIndex + 1}. ${item.title}${item.artist ? ` - ${item.artist}` : ''}`;
                      return (
                        <div 
                          key={item.originalIndex} 
                          className="mb-0.5 max-w-full overflow-hidden shrink-0"
                        >
                          <a 
                            href={`#song-${item.originalIndex}`} 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onScrollToSong(`song-${item.originalIndex}`);
                            }}
                            title={fullTitle}
                            className="flex items-baseline w-full max-w-full group cursor-pointer transition-colors hover:opacity-85 touch-manipulation py-0.5 active:opacity-60"
                            style={{ 
                              color: 'inherit', 
                              textDecoration: 'none',
                              lineHeight: 1.28
                            }}
                          >
                            <span 
                              className="shrink-0 text-right tabular-nums font-semibold pr-2 select-none toc-song-number"
                              style={{ 
                                width: numColWidth,
                                color: getDisplayColor(settings.titleColor, effectiveDarkMode),
                                opacity: 0.8
                              }}
                            >
                              {item.originalIndex + 1}.
                            </span>
                            <span className="truncate flex-1 min-w-0">
                              <span className="font-medium group-hover:underline toc-song-title">{item.title}</span>
                              {item.artist && (
                                <span 
                                  className="font-normal ml-1.5 toc-song-artist"
                                  style={{ 
                                    color: getDisplayColor(settings.artistColor, effectiveDarkMode),
                                    opacity: 0.75,
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
      {songs.map((song, i) => (
        <VirtualPage
          key={song.id || `song-${i}`}
          id={`song-${i}`}
          isPrinting={isPrinting}
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
              padding: `${marginMmY}mm ${marginMmX}mm`,
              transform: isPrinting ? 'none' : (isScaled ? `scale(${effectiveScale})` : 'none'),
              transformOrigin: 'top left',
              position: isPrinting ? 'relative' : (isScaled ? 'absolute' : 'relative'),
              top: 0,
              left: 0,
            }}
          >
            {/* On-Screen Print Margin Guides Overlay */}
            {isPrintPreviewMode && showMarginGuides && (
              <PageMarginGuides 
                marginMmX={marginMmX} 
                marginMmY={marginMmY} 
                pageFormat={settings.pageFormat} 
                orientation={settings.orientation}
                pageLabel={`Song #${i + 1}`}
              />
            )}

            <SongDisplay song={song} index={i} settings={settings} isDarkMode={effectiveDarkMode} isDebugMode={isDebugMode} />
          </div>
        </VirtualPage>
      ))}

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
              <div className="w-full max-w-[180px] mb-8 text-zinc-300 dark:text-zinc-600 mx-auto animate-in fade-in zoom-in-95 duration-700">
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
              <h3 className="text-2xl font-bold text-zinc-700 dark:text-zinc-300 mb-3">No Songs Loaded</h3>
              <p className="text-zinc-500 mb-10 text-lg max-w-sm">
                Your songbook is currently empty. Open the sidebar to upload a file or add songs to generate your printable book.
              </p>
              
              <div className="grid grid-cols-2 gap-6 w-full px-4">
                <div className="bg-white dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 rounded-lg p-5 flex flex-col items-center text-center shadow-sm">
                  <FileText className="w-8 h-8 text-amber-500 dark:text-amber-400 mb-3" />
                  <span className="font-semibold text-zinc-700 dark:text-zinc-200 mb-1">Auto-formatted</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Chords and lyrics automatically aligned</span>
                </div>
                <div className="bg-white dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 rounded-lg p-5 flex flex-col items-center text-center shadow-sm">
                  <BookOpen className="w-8 h-8 text-blue-500 dark:text-blue-400 mb-3" />
                  <span className="font-semibold text-zinc-700 dark:text-zinc-200 mb-1">Print Ready</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Smart columns and index generation</span>
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
    prev.pageMargin === next.pageMargin &&
    prev.maxFontSizePx === next.maxFontSizePx &&
    prev.indexSortOrder === next.indexSortOrder &&
    prev.titleColor === next.titleColor &&
    prev.artistColor === next.artistColor &&
    prev.lyricsColor === next.lyricsColor &&
    prev.chordsColor === next.chordsColor &&
    prev.markerColor === next.markerColor &&
    prev.tocColor === next.tocColor &&
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

  // Compare print settings, ignoring sub-pixel or insignificant fluctuations
  if (!areSettingsEquivalent(prevProps.settings, nextProps.settings)) {
    return false;
  }

  // Compare songbook data content
  if (!areSongbookDataEquivalent(prevProps.data, nextProps.data)) {
    return false;
  }

  return true;
};

const SongbookPreviewComponent: React.FC<SongbookPreviewProps> = ({ 
  data, 
  settings, 
  isUpdatingLayout = false, 
  onOpenSettings,
  onRegisterPrintTrigger,
  onRegisterPrintPreviewTrigger,
  onPrintPreviewStateChange,
  onDownloadStatusChange,
  isDarkMode = false
}) => {
  const songs = useMemo(() => data.songs || data.items || data.songbookSongs?.map((i: any) => i.song) || [], [data]);
  const title = data.title || data.name || 'Untitled Songbook';

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

  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit-width');
  const [customZoom, setCustomZoom] = useState<number>(1.0);
  const [isBottomZoomMenuOpen, setIsBottomZoomMenuOpen] = useState(false);
  const [isSongNavOpen, setIsSongNavOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isPrintPreviewMode, setIsPrintPreviewMode] = useState(false);
  const [showMarginGuides, setShowMarginGuides] = useState(true);
  const [previewLayout, setPreviewLayout] = useState<'continuous' | 'spread'>('continuous');

  useEffect(() => {
    if (onPrintPreviewStateChange) {
      onPrintPreviewStateChange(isPrintPreviewMode);
    }
  }, [isPrintPreviewMode, onPrintPreviewStateChange]);

  const togglePrintPreview = useCallback(() => {
    setIsPrintPreviewMode(prev => {
      const next = !prev;
      if (next) {
        setZoomMode('fit-page');
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (onRegisterPrintPreviewTrigger) {
      onRegisterPrintPreviewTrigger(togglePrintPreview);
    }
  }, [togglePrintPreview, onRegisterPrintPreviewTrigger]);

  const isDebugFeatureEnabled = isDebugHudConfigured();
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(() => {
    if (!isDebugHudConfigured()) return false;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kytario-debug-view') === 'true';
    }
    return false;
  });
  const [activeSongIndex, setActiveSongIndex] = useState<number>(0);

  // Throttled ResizeObserver using requestIdleCallback / requestAnimationFrame to defer heavy layout checks
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    let cleanupIdle: (() => void) | null = null;

    const scheduleMeasure = () => {
      if (cleanupIdle) cleanupIdle();

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        const id = (window as Window & { requestIdleCallback: any; cancelIdleCallback: any }).requestIdleCallback(() => {
          if (containerRef.current) {
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            setContainerSize(prev => (Math.abs(prev.width - w) < 2 && Math.abs(prev.height - h) < 2 ? prev : { width: w, height: h }));
          }
        }, { timeout: 120 });
        cleanupIdle = () => (window as Window & { cancelIdleCallback: any }).cancelIdleCallback(id);
      } else {
        const rafId = requestAnimationFrame(() => {
          if (containerRef.current) {
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            setContainerSize(prev => (Math.abs(prev.width - w) < 2 && Math.abs(prev.height - h) < 2 ? prev : { width: w, height: h }));
          }
        });
        cleanupIdle = () => cancelAnimationFrame(rafId);
      }
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(() => {
      scheduleMeasure();
    });

    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', scheduleMeasure);

    return () => {
      if (cleanupIdle) cleanupIdle();
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, []);

  // Track scroll position for "Back to Top" button
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (el) {
            setShowScrollTop(el.scrollTop > 400);

            // Determine currently active song in viewport
            if (songs.length > 0) {
              const containerRect = el.getBoundingClientRect();
              const triggerY = containerRect.top + Math.min(250, containerRect.height * 0.3);

              let bestIndex = -1;
              for (let i = 0; i < songs.length; i++) {
                const pageEl = document.getElementById(`song-${i}`);
                if (pageEl) {
                  const rect = pageEl.getBoundingClientRect();
                  if (rect.top <= triggerY && rect.bottom >= triggerY) {
                    bestIndex = i;
                    break;
                  }
                }
              }

              if (bestIndex === -1) {
                let minDiff = Infinity;
                let closest = 0;
                for (let i = 0; i < songs.length; i++) {
                  const pageEl = document.getElementById(`song-${i}`);
                  if (pageEl) {
                    const rect = pageEl.getBoundingClientRect();
                    const diff = Math.abs(rect.top - triggerY);
                    if (diff < minDiff) {
                      minDiff = diff;
                      closest = i;
                    }
                  }
                }
                bestIndex = closest;
              }

              if (bestIndex >= 0 && bestIndex < songs.length) {
                setActiveSongIndex(prev => (prev !== bestIndex ? bestIndex : prev));
              }
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('#zoom-controls-toolbar') && 
        !target.closest('#song-nav-modal')
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

  // Display percentage and scaled wrapper dimensions
  const displayPercentage = Math.round(effectiveScale * 100);
  const scaledWidth = Math.round(basePxWidth * effectiveScale);
  const scaledHeight = Math.round(basePxHeight * effectiveScale);

  const handleZoomIn = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStep = ZOOM_STEPS.find(s => s > effectiveScale + 0.04) || Math.min(3.0, effectiveScale + 0.25);
    setCustomZoom(Math.round(nextStep * 100) / 100);
    setZoomMode('custom');
    setIsBottomZoomMenuOpen(false);
  }, [effectiveScale]);

  const handleZoomOut = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const prevSteps = ZOOM_STEPS.filter(s => s < effectiveScale - 0.04);
    const prevStep = prevSteps.length > 0 ? prevSteps[prevSteps.length - 1] : Math.max(0.25, effectiveScale - 0.25);
    setCustomZoom(Math.round(prevStep * 100) / 100);
    setZoomMode('custom');
    setIsBottomZoomMenuOpen(false);
  }, [effectiveScale]);

  const setPresetZoom = useCallback((mode: ZoomMode, val?: number) => {
    setZoomMode(mode);
    if (val !== undefined) {
      setCustomZoom(val);
    }
    setIsBottomZoomMenuOpen(false);
  }, []);

  // Keyboard shortcuts: Ctrl/Cmd + Plus, Ctrl/Cmd + Minus, Ctrl/Cmd + 0, P (print preview), Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key === 'Escape' && isPrintPreviewMode) {
        e.preventDefault();
        setIsPrintPreviewMode(false);
      } else if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        togglePrintPreview();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
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
  }, [handleZoomIn, handleZoomOut, setPresetZoom, isPrintPreviewMode, togglePrintPreview, isDebugFeatureEnabled]);

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
    const items = songs.map((song, i) => ({
      song,
      originalIndex: i,
      title: song.title || song.name || 'Unknown Title',
      artist: song.artist || song.author || song.interpreter || ''
    }));

    if (settings.indexSortOrder === 'alphabetical') {
      items.sort((a, b) => a.title.localeCompare(b.title));
    }

    const mmToPx = 3.779528;
    const isLandscape = settings.orientation === 'landscape';
    const tocColumns = isLandscape ? 3 : 2;
    const tocMarginMmX = settings.pageMargin ?? 5;
    const tocMarginMmYTop = Math.round((settings.pageMargin ?? 5) * 1.1);
    const tocMarginMmYBottom = Math.max(3, Math.round((settings.pageMargin ?? 5) * 0.75));
    const paddingTotalY = (tocMarginMmYTop + tocMarginMmYBottom) * mmToPx;
    
    const safeTocSize = Number(settings.tocFontSize) || (Number(settings.lyricsFontSize) * 0.95) || 12;
    const safeTitleSize = Number(settings.titleFontSize) || 16;

    // Exact height occupied by 1 item line:
    // lineHeight (1.28) + padding py-0.5 (4px) + margin mb-0.5 (2px)
    const itemLineHeight = Math.ceil(safeTocSize * 1.28) + 5;
    
    // Safety buffer (4px) to prevent sub-pixel rounding overflow while keeping bottom margin compact
    const bottomBuffer = 4;

    // Header on Page 1 (Title + subtitle + margins + spacing)
    const headerHeightP1 = Math.ceil(safeTitleSize * 1.15 * 1.2) + 30;
    const availableContentHeightP1 = Math.max(80, basePxHeight - paddingTotalY - headerHeightP1 - bottomBuffer);
    const rowsPerColP1 = Math.max(3, Math.floor(availableContentHeightP1 / itemLineHeight));
    const itemsPerPage1 = Math.max(1, rowsPerColP1 * tocColumns);

    // Header on Subsequent Pages
    const headerHeightSubsequent = Math.ceil(safeTitleSize * 0.85 * 1.2) + 33;
    const availableContentHeightSubsequent = Math.max(80, basePxHeight - paddingTotalY - headerHeightSubsequent - bottomBuffer);
    const rowsPerColSubsequent = Math.max(3, Math.floor(availableContentHeightSubsequent / itemLineHeight));
    const itemsPerPageSubsequent = Math.max(1, rowsPerColSubsequent * tocColumns);

    const pages: TocPage[] = [];
    const totalItems = items.length;

    if (totalItems > 0) {
      const count1 = Math.max(1, isNaN(itemsPerPage1) ? 20 : itemsPerPage1);
      pages.push({
        pageIndex: 1,
        totalPages: 1,
        items: items.slice(0, count1),
        isFirstPage: true,
        columns: tocColumns,
      });

      let offset = count1;
      let pageNum = 2;
      const countSub = Math.max(1, isNaN(itemsPerPageSubsequent) ? 20 : itemsPerPageSubsequent);

      while (offset < totalItems) {
        pages.push({
          pageIndex: pageNum,
          totalPages: 1,
          items: items.slice(offset, offset + countSub),
          isFirstPage: false,
          columns: tocColumns,
        });
        offset += countSub;
        pageNum++;
      }

      const totalPages = pages.length;
      for (let i = 0; i < totalPages; i++) {
        pages[i].totalPages = totalPages;
      }
    }

    return pages;
  }, [
    songs, 
    title,
    settings.indexSortOrder, 
    settings.orientation, 
    settings.pageFormat,
    settings.pageMargin,
    settings.tocFontSize,
    settings.lyricsFontSize, 
    settings.titleFontSize, 
    basePxHeight
  ]);

  const isScaled = Math.abs(effectiveScale - 1.0) > 0.005;

  const documentTitle = useMemo(() => {
    const raw = title || 'Kytario_Songbook';
    return raw.trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
  }, [title]);

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
    // 1. Instantly trigger visual indicators (0ms delay) so user never sees a frozen app
    setIsPreparingPdf(true);
    if (onDownloadStatusChange) {
      onDownloadStatusChange(true);
    }

    try {
      originalTitleRef.current = document.title;
      document.title = documentTitle;
    } catch (e) {}

    if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
    if (printSafetyTimerRef.current) clearTimeout(printSafetyTimerRef.current);

    // 2. Yield control via double requestAnimationFrame to ensure browser paints the blue banner immediately
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // 3. Mount full print DOM
        setIsPrinting(true);

        // 4. Mobile/Android optimization: give Chromium layout engine adequate time (~450ms)
        // to compute column layouts, render SVG chord diagrams, and stabilize without crashing Android PrintSpooler
        const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        const waitTime = isMobile ? 450 : 250;

        printTimeoutRef.current = setTimeout(() => {
          let cleanedUp = false;
          const doCleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            window.removeEventListener('afterprint', doCleanup);
            window.removeEventListener('focus', onFocusAfterPrint);
            cleanupPrint();
          };

          const onFocusAfterPrint = () => {
            // Slight delay after regaining window focus when print dialog closes
            setTimeout(doCleanup, 600);
          };

          window.addEventListener('afterprint', doCleanup, { once: true });
          setTimeout(() => {
            window.addEventListener('focus', onFocusAfterPrint, { once: true });
          }, 800);

          // Absolute fallback safety timeout (25s) so UI is never permanently blocked
          printSafetyTimerRef.current = setTimeout(doCleanup, 25000);

          try {
            window.print();
          } catch (err) {
            console.error('Print execution error:', err);
            doCleanup();
          }
        }, waitTime);
      });
    });
  }, [documentTitle, onDownloadStatusChange, cleanupPrint]);

  // Global browser print event listeners (handles Direct Print, Ctrl+P, and Download as PDF)
  useEffect(() => {
    const handleBeforePrint = () => {
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
  }, [documentTitle, cleanupPrint]);

  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
      if (printSafetyTimerRef.current) clearTimeout(printSafetyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (onRegisterPrintTrigger) {
      onRegisterPrintTrigger(handleDownloadPdf);
    }
  }, [handleDownloadPdf, onRegisterPrintTrigger]);

  useEffect(() => {
    if (onDownloadStatusChange) {
      onDownloadStatusChange(isPreparingPdf || isPrinting);
    }
  }, [isPreparingPdf, isPrinting, onDownloadStatusChange]);

  const totalPages = tocPages.length + songs.length;

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

  const marginMmX = settings.pageMargin ?? 5;
  const marginMmY = Math.round((settings.pageMargin ?? 5) * 1.2);
  const tocMarginMmX = settings.pageMargin ?? 5;
  const tocMarginMmYTop = Math.round((settings.pageMargin ?? 5) * 1.1);
  const tocMarginMmYBottom = Math.max(3, Math.round((settings.pageMargin ?? 5) * 0.75));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative print:h-auto print:min-h-0 print:overflow-visible print:block print:static">
      {/* ON-SCREEN PRINT PREVIEW TOP BANNER BAR */}
      {isPrintPreviewMode && (
        <div 
          id="print-preview-header-bar"
          className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md text-zinc-800 dark:text-zinc-200 border-b border-black/5 dark:border-zinc-800 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-4 shrink-0 print:hidden z-30 shadow-xs animate-in slide-in-from-top-1 duration-150"
        >
          {/* Left: Mode Title and Paper Specs */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 shrink-0 select-none">
              Print Preview
            </span>
            <div className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block shrink-0" />
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 truncate select-none">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{settings.pageFormat}</span>
              <span>•</span>
              <span className="capitalize">{settings.orientation}</span>
              <span>•</span>
              <span>{marginMmX}mm margin</span>
            </div>
          </div>

          {/* Right: Only Guides and Pagination Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Toggle Margin Guides */}
            <button
              id="preview-guides-btn"
              onClick={() => setShowMarginGuides(!showMarginGuides)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-black/5 dark:border-zinc-700/60 shadow-2xs transition-colors cursor-pointer ${
                showMarginGuides
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}
              title="Toggle Margin & Crop Guides"
            >
              <Ruler className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Guides</span>
            </button>

            {/* Layout Mode (Single Page vs 2-Page Spread) */}
            <button
              id="preview-pagination-toggle-btn"
              onClick={() => setPreviewLayout(prev => prev === 'continuous' ? 'spread' : 'continuous')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-black/5 dark:border-zinc-700/60 shadow-2xs transition-colors cursor-pointer ${
                previewLayout === 'spread'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}
              title={previewLayout === 'spread' ? "Switch to Vertical Stack" : "Switch to 2-Page Spread"}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{previewLayout === 'spread' ? 'Spread' : 'Vertical'}</span>
            </button>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

            {/* Exit Preview Button */}
            <button
              onClick={() => setIsPrintPreviewMode(false)}
              className="p-1.5 rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs transition-colors cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              title="Exit Preview (Esc)"
              aria-label="Exit Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
        className={`relative flex-1 overflow-y-auto overflow-x-auto ${
          isPrintPreviewMode ? 'bg-zinc-200/80 dark:bg-zinc-950' : 'bg-zinc-50 dark:bg-zinc-950'
        } p-3 sm:p-8 print:p-0 print:m-0 print:bg-white print:h-auto print:min-h-0 print:overflow-visible print:block print:static print-scroll-container`}
      >
        {(isPreparingPdf || isPrinting) && (
          <div 
            id="preview-downloading-pdf-pill"
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 print:hidden flex items-center gap-2.5 bg-blue-600 text-white px-4 py-2 rounded-full shadow-xl border border-blue-500/80 backdrop-blur-md animate-in fade-in slide-in-from-top-3 text-xs font-bold select-none pointer-events-none"
          >
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Preparing PDF for download...</span>
          </div>
        )}

        {/* SONG PAGES LIST (ISOLATED & MEMOIZED PRINTABLE ROOT) */}
        <div 
          ref={printableRef}
          id="songbook-printable-area"
          className={`songbook-print-root animate-in fade-in duration-200 min-w-fit flex ${
            isPrintPreviewMode && previewLayout === 'spread'
              ? 'flex-row flex-wrap justify-center gap-8'
              : 'flex-col items-center'
          } print:block print:h-auto print:min-h-0 print:w-full print:static print:overflow-visible print:m-0 print:p-0 ${isUpdatingLayout ? 'opacity-80' : 'opacity-100'}`}
        >
          <SongPagesList 
            songs={songs}
            title={title}
            settings={settings}
            tocPages={tocPages}
            cssWidth={cssWidth}
            cssHeight={cssHeight}
            scaledWidth={scaledWidth}
            scaledHeight={scaledHeight}
            effectiveScale={effectiveScale}
            isScaled={isScaled}
            onScrollToSong={handleScrollTo}
            isDarkMode={isDarkMode}
            isDebugMode={isDebugFeatureEnabled && isDebugOpen}
            isPrintPreviewMode={isPrintPreviewMode}
            showMarginGuides={showMarginGuides}
            isPrinting={isPrinting}
          />
        </div>

        {/* Spacer so bottom floating toolbar does not cover bottom of last page */}
        <div className="h-24 print:hidden" />
      </div>

      {/* FLOATING QUICK VIEW TOOLBAR (CENTERED OVER PREVIEW PANE) */}
      <div 
        id="zoom-controls-toolbar"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 print:hidden flex items-center gap-1 sm:gap-1.5 bg-white/90 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-200 backdrop-blur-2xl px-2.5 sm:px-3.5 py-1.5 rounded-full shadow-xl border border-black/10 dark:border-zinc-800 transition-all select-none"
      >
        {/* Zoom Out (-) */}
        <button
          id="zoom-out-btn"
          onClick={handleZoomOut}
          disabled={effectiveScale <= 0.25}
          className="p-1.5 sm:p-2 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-colors cursor-pointer"
          title="Zoom Out (Ctrl -)"
          aria-label="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Zoom Percentage / Presets Menu Toggle */}
        <div className="relative">
          <button
            id="zoom-preset-menu-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsBottomZoomMenuOpen(!isBottomZoomMenuOpen);
              setIsSongNavOpen(false);
            }}
            className="px-2.5 py-1 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors min-w-[66px] justify-center cursor-pointer"
            title="Choose Zoom Level"
          >
            <span>{displayPercentage}%</span>
            {zoomMode === 'fit-width' && <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal hidden sm:inline">(Fit)</span>}
          </button>

          {/* Zoom Presets Dropdown */}
          {isBottomZoomMenuOpen && (
            <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 w-48 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/10 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg shadow-2xl p-1.5 space-y-0.5 z-40 text-xs animate-in fade-in slide-in-from-bottom-2 duration-100">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-black/5 dark:border-zinc-800 mb-1">
                Display Modes
              </div>

              <button
                onClick={() => setPresetZoom('fit-width')}
                className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer ${
                  zoomMode === 'fit-width' ? 'bg-black/5 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold' : 'text-zinc-600 dark:text-zinc-300'
                }`}
              >
                <span>Fit Screen Width</span>
                {zoomMode === 'fit-width' && <Check className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />}
              </button>

              <button
                onClick={() => setPresetZoom('fit-page')}
                className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer ${
                  zoomMode === 'fit-page' ? 'bg-black/5 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold' : 'text-zinc-600 dark:text-zinc-300'
                }`}
              >
                <span>Fit Full Page</span>
                {zoomMode === 'fit-page' && <Check className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />}
              </button>

              <button
                onClick={() => setPresetZoom('custom', 1.0)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer ${
                  zoomMode === 'custom' && Math.abs(customZoom - 1.0) < 0.01 ? 'bg-black/5 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold' : 'text-zinc-600 dark:text-zinc-300'
                }`}
              >
                <span>100% (Actual Print Size)</span>
                {zoomMode === 'custom' && Math.abs(customZoom - 1.0) < 0.01 && <Check className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />}
              </button>

              <div className="my-1 border-t border-black/5 dark:border-zinc-800" />

              <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Percentages
              </div>

              {[0.5, 0.75, 0.9, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0].map((level) => {
                const isSelected = zoomMode === 'custom' && Math.abs(customZoom - level) < 0.03;
                return (
                  <button
                    key={level}
                    onClick={() => setPresetZoom('custom', level)}
                    className={`w-full px-2.5 py-1 rounded-lg text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer ${
                      isSelected ? 'bg-black/5 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold' : 'text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <span>{Math.round(level * 100)}%</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Zoom In (+) */}
        <button
          id="zoom-in-btn"
          onClick={handleZoomIn}
          disabled={effectiveScale >= 3.0}
          className="p-1.5 sm:p-2 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-colors cursor-pointer"
          title="Zoom In (Ctrl +)"
          aria-label="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

        {/* 100% Actual Size Button */}
        <button
          id="zoom-100-btn"
          onClick={() => setPresetZoom('custom', 1.0)}
          className={`p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer ${
            zoomMode === 'custom' && Math.abs(customZoom - 1.0) < 0.01 
              ? 'bg-black/10 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
              : 'hover:bg-black/5 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100 text-zinc-600 dark:text-zinc-300'
          }`}
          title="Actual Size 100% (Ctrl 0)"
          aria-label="Actual Size 100%"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Fit Width / Page Action */}
        <button
          id="zoom-fit-width-btn"
          onClick={() => setPresetZoom(zoomMode === 'fit-width' ? 'fit-page' : 'fit-width')}
          className={`p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer ${
            zoomMode === 'fit-width' || zoomMode === 'fit-page' 
              ? 'bg-black/10 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
              : 'hover:bg-black/5 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100 text-zinc-600 dark:text-zinc-300'
          }`}
          title={zoomMode === 'fit-width' ? "Fit Full Page" : "Fit to Screen Width"}
          aria-label="Fit View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* On-Screen Print Preview Mode Toggle */}
        <button
          id="zoom-print-preview-btn"
          onClick={togglePrintPreview}
          className={`p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer ${
            isPrintPreviewMode 
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs' 
              : 'hover:bg-black/5 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100 text-zinc-600 dark:text-zinc-300'
          }`}
          title={isPrintPreviewMode ? "Exit Print Preview (Esc or P)" : "On-Screen Print Preview (P)"}
          aria-label="Toggle Print Preview"
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Quick Song Navigator (Table of Contents / Jump to song) */}
        {songs.length > 0 && (
          <div className="relative">
            <button
              id="song-navigator-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsSongNavOpen(!isSongNavOpen);
                setIsBottomZoomMenuOpen(false);
              }}
              className="p-1.5 sm:p-2 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full transition-colors cursor-pointer"
              title="Jump to Song"
              aria-label="Jump to Song"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Quick Song Jump Popover */}
            {isSongNavOpen && (
              <div 
                id="song-nav-modal"
                className="absolute bottom-full mb-2.5 right-0 sm:left-1/2 sm:-translate-x-1/2 w-64 max-h-72 overflow-y-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/10 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg shadow-2xl p-2 space-y-1 z-40 text-xs"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-black/5 dark:border-zinc-800 mb-1 flex items-center justify-between">
                  <span>Jump to Song ({songs.length})</span>
                  <button 
                    onClick={() => handleScrollTo('toc-page')}
                    className="hover:underline text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-semibold cursor-pointer"
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
                        onClick={() => handleScrollTo(`song-${idx}`)}
                        className="w-full px-2 py-1.5 rounded-lg text-left text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors truncate flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-5 font-mono text-zinc-400 dark:text-zinc-500 font-semibold shrink-0 text-right">{idx + 1}.</span>
                        <span className="truncate">{sTitle}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

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
            className={`p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer ${
              isDebugOpen 
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500/30' 
                : 'hover:bg-black/5 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100 text-zinc-400 hover:text-zinc-600'
            }`}
            title="Toggle Song Fit Debug View (Ctrl+Shift+D)"
            aria-label="Toggle Debug View"
          >
            <Bug className="w-4 h-4" />
          </button>
        )}

        {/* Scroll to Top */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="p-1.5 sm:p-2 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full transition-colors cursor-pointer"
            title="Scroll to Top"
            aria-label="Scroll to Top"
          >
            <ChevronUp className="w-4 h-4" />
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
        }

        /* Page container scaling performance optimization */
        .song-page-outer-wrapper {
          will-change: width, height;
        }
        .print-page-container,
        .print-index-container {
          will-change: transform, width, height;
        }

        @page {
          size: ${settings.pageFormat === 'Letter' ? 'letter' : settings.pageFormat} ${settings.orientation};
          margin: 0mm;
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
            padding: ${marginMmY}mm ${marginMmX}mm !important;
            background: #ffffff !important;
            color: #000000 !important;
          }

          .print-index-container {
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
            padding: ${tocMarginMmYTop}mm ${tocMarginMmX}mm ${tocMarginMmYBottom}mm ${tocMarginMmX}mm !important;
            background: #ffffff !important;
            color: #000000 !important;
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
