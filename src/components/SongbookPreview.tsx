import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, memo, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { SongbookData, PrintSettings, Song } from '../types';
import { SongDisplay } from './SongDisplay';
import { SongbookSkeleton } from './SongbookSkeleton';
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
  ChevronDown
} from 'lucide-react';

interface SongbookPreviewProps {
  data: SongbookData;
  settings: PrintSettings;
  isUpdatingLayout?: boolean;
  onOpenSettings?: () => void;
  onRegisterPrintTrigger?: (trigger: () => void) => void;
  onDownloadStatusChange?: (isDownloading: boolean) => void;
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
}: SongPagesListProps) {
  const numColWidth = useMemo(() => {
    if (songs.length >= 100) return '2.8em';
    if (songs.length >= 10) return '2.1em';
    return '1.5em';
  }, [songs.length]);

  return (
    <>
      {/* INDEX / TABLE OF CONTENTS PAGES (PAGINATED) */}
      {tocPages.map((tocPage) => (
        <div 
          key={`toc-page-${tocPage.pageIndex}`}
          className="mx-auto mb-6 sm:mb-10 print:mb-0 print:mx-0 shrink-0 song-page-outer-wrapper"
          style={{
            width: isScaled ? `${scaledWidth}px` : 'fit-content',
            height: isScaled ? `${scaledHeight}px` : 'auto',
            minHeight: isScaled ? `${scaledHeight}px` : undefined,
            position: 'relative',
            contentVisibility: 'auto',
            containIntrinsicSize: isScaled ? `${scaledWidth}px ${scaledHeight}px` : '794px 1123px',
          }}
        >
          <div 
            id={tocPage.isFirstPage ? "toc-page" : `toc-page-${tocPage.pageIndex}`}
            className="bg-white shadow-md print:shadow-none px-[5mm] py-[6mm] print-index-container flex flex-col overflow-hidden origin-top-left"
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
            {/* Page Header */}
            {tocPage.isFirstPage ? (
              <div className="mb-6 sm:mb-8 text-center">
                <h1 
                  className="font-bold uppercase tracking-tight"
                  style={{ 
                    color: settings.titleColor, 
                    fontSize: `${settings.titleFontSize * 1.2}px` 
                  }}
                >
                  {title}
                </h1>
                {tocPages.length > 1 && (
                  <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider font-medium">
                    Obsah • Strana 1 z {tocPages.length}
                  </p>
                )}
              </div>
            ) : (
              <div className="mb-4 text-center border-b border-black/5/80 pb-2">
                <h2 
                  className="font-bold uppercase tracking-tight"
                  style={{ 
                    color: settings.titleColor, 
                    fontSize: `${settings.titleFontSize * 0.85}px` 
                  }}
                >
                  {title} <span className="text-zinc-400 font-normal text-xs normal-case">(pokračování)</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5 uppercase tracking-wider font-medium">
                  Obsah • Strana {tocPage.pageIndex} z {tocPages.length}
                </p>
              </div>
            )}
            
            {/* Columns of Song Titles */}
            <div 
              className="flex-1"
              style={{ 
                columnCount: tocPage.columns, 
                columnGap: '2.5rem',
                color: settings.tocColor || settings.lyricsColor,
                fontSize: `${settings.tocFontSize || (settings.lyricsFontSize * 0.95)}px`,
                lineHeight: '1.4'
              }}
            >
              {tocPage.items.map((item) => {
                const fullTitle = `${item.originalIndex + 1}. ${item.title}${item.artist ? ` - ${item.artist}` : ''}`;
                return (
                  <div 
                    key={item.originalIndex} 
                    className="mb-1.5 break-inside-avoid max-w-full overflow-hidden" 
                    style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                  >
                    <a 
                      href={`#song-${item.originalIndex}`} 
                      onClick={(e) => {
                        e.preventDefault();
                        onScrollToSong(`song-${item.originalIndex}`);
                      }}
                      title={fullTitle}
                      className="flex items-baseline w-full max-w-full group cursor-pointer transition-colors hover:opacity-85"
                      style={{ 
                        color: 'inherit', 
                        textDecoration: 'none',
                      }}
                    >
                      <span 
                        className="shrink-0 text-right tabular-nums font-semibold pr-2 select-none"
                        style={{ 
                          width: numColWidth,
                          color: settings.titleColor || 'inherit',
                          opacity: 0.8
                        }}
                      >
                        {item.originalIndex + 1}.
                      </span>
                      <span className="truncate flex-1 min-w-0">
                        <span className="font-medium group-hover:underline">{item.title}</span>
                        {item.artist && (
                          <span 
                            className="font-normal ml-1.5"
                            style={{ 
                              color: settings.artistColor || 'inherit',
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
          </div>
        </div>
      ))}

      {/* SONG PAGES */}
      {songs.map((song, i) => (
        <div 
          key={song.id || `song-${i}`}
          className="mx-auto mb-6 sm:mb-10 print:mb-0 print:mx-0 shrink-0 song-page-outer-wrapper"
          style={{
            width: isScaled ? `${scaledWidth}px` : 'fit-content',
            height: isScaled ? `${scaledHeight}px` : 'auto',
            minHeight: isScaled ? `${scaledHeight}px` : undefined,
            position: 'relative',
            contentVisibility: 'auto',
            containIntrinsicSize: isScaled ? `${scaledWidth}px ${scaledHeight}px` : '794px 1123px',
          }}
        >
          <div 
            id={`song-${i}`}
            className="bg-white shadow-md print:shadow-none px-[5mm] py-[6mm] print-page-container flex flex-col overflow-hidden origin-top-left"
            style={{ 
              width: cssWidth, 
              height: cssHeight,
              transform: isScaled ? `scale(${effectiveScale})` : 'none',
              transformOrigin: 'top left',
              position: isScaled ? 'absolute' : 'relative',
              top: 0,
              left: 0,
            }}
          >
            <SongDisplay song={song} index={i} settings={settings} />
          </div>
        </div>
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
              <div className="w-24 h-24 bg-zinc-200/60 rounded-full flex items-center justify-center mb-6 text-zinc-400 ring-8 ring-zinc-100">
                <Music className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-700 mb-3">No Songs Loaded</h3>
              <p className="text-zinc-500 mb-10 text-lg max-w-sm">
                Your songbook is currently empty. Open the sidebar to upload a file or add songs to generate your printable book.
              </p>
              
              <div className="grid grid-cols-2 gap-6 w-full px-4">
                <div className="bg-white border border-black/5/80 rounded-xl p-5 flex flex-col items-center text-center shadow-sm">
                  <FileText className="w-8 h-8 text-amber-500 mb-3" />
                  <span className="font-semibold text-zinc-700 mb-1">Auto-formatted</span>
                  <span className="text-sm text-zinc-500">Chords and lyrics automatically aligned</span>
                </div>
                <div className="bg-white border border-black/5/80 rounded-xl p-5 flex flex-col items-center text-center shadow-sm">
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
    prev.indexSortOrder === next.indexSortOrder &&
    prev.titleColor === next.titleColor &&
    prev.artistColor === next.artistColor &&
    prev.lyricsColor === next.lyricsColor &&
    prev.chordsColor === next.chordsColor &&
    prev.markerColor === next.markerColor &&
    Math.abs((prev.titleFontSize || 16) - (next.titleFontSize || 16)) < 0.05 &&
    Math.abs((prev.artistFontSize || 12) - (next.artistFontSize || 12)) < 0.05 &&
    Math.abs((prev.lyricsFontSize || 12) - (next.lyricsFontSize || 12)) < 0.05 &&
    Math.abs((prev.chordsFontSize || 10) - (next.chordsFontSize || 10)) < 0.05
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
  onDownloadStatusChange
}) => {
  const songs = useMemo(() => data.songs || data.items || data.songbookSongs?.map((i: any) => i.song) || [], [data]);
  const title = data.title || data.name || 'Untitled Songbook';

  const containerRef = useRef<HTMLDivElement>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1000, 
    height: typeof window !== 'undefined' ? window.innerHeight : 900 
  });

  const [zoomMode, setZoomMode] = useState<ZoomMode>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'fit-width';
    }
    return 'custom';
  });
  const [customZoom, setCustomZoom] = useState<number>(1.0);
  const [isBottomZoomMenuOpen, setIsBottomZoomMenuOpen] = useState(false);
  const [isSongNavOpen, setIsSongNavOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, setPresetZoom]);

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
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
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
    const paddingTotalY = 12 * mmToPx; // 6mm top + 6mm bottom padding
    
    const safeTocSize = Number(settings.tocFontSize) || (Number(settings.lyricsFontSize) * 0.95) || 12;
    const safeTitleSize = Number(settings.titleFontSize) || 16;

    // Height occupied by 1 item line
    const itemLineHeight = Math.max(16, (safeTocSize * 1.4) + 6);
    
    // Header on Page 1 (Title + margins)
    const headerHeightP1 = (safeTitleSize * 1.2 * 1.3) + 38;
    const availableContentHeightP1 = Math.max(120, basePxHeight - paddingTotalY - headerHeightP1 - 10);
    const rowsPerColP1 = Math.max(4, Math.floor(availableContentHeightP1 / itemLineHeight));
    const itemsPerPage1 = Math.max(1, rowsPerColP1 * tocColumns);

    // Header on Subsequent Pages
    const headerHeightSubsequent = (safeTitleSize * 0.85 * 1.3) + 30;
    const availableContentHeightSubsequent = Math.max(120, basePxHeight - paddingTotalY - headerHeightSubsequent - 10);
    const rowsPerColSubsequent = Math.max(4, Math.floor(availableContentHeightSubsequent / itemLineHeight));
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
  }, [songs, settings.indexSortOrder, settings.orientation, settings.lyricsFontSize, settings.titleFontSize, basePxHeight]);

  const isScaled = Math.abs(effectiveScale - 1.0) > 0.005;

  const documentTitle = useMemo(() => {
    const raw = title || 'Kytario_Songbook';
    return raw.trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
  }, [title]);

  const printPageStyle = useMemo(() => `
    @page {
      size: ${settings.pageFormat === 'Letter' ? 'letter' : settings.pageFormat} ${settings.orientation};
      margin: 0mm;
    }
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        width: 100% !important;
        min-height: 100% !important;
      }
      .songbook-print-root {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        display: block !important;
      }
      .song-page-outer-wrapper {
        content-visibility: visible !important;
        contain-intrinsic-size: none !important;
        width: ${cssWidth} !important;
        height: ${cssHeight} !important;
        min-height: ${cssHeight} !important;
        max-height: ${cssHeight} !important;
        margin: 0 !important;
        padding: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        position: relative !important;
        transform: none !important;
        box-shadow: none !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      .print-page-container, .print-index-container {
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
      }
      .print-hidden {
        display: none !important;
      }
    }
  `, [settings.pageFormat, settings.orientation, cssWidth, cssHeight]);

  const handleDownloadPdf = useReactToPrint({
    contentRef: printableRef,
    documentTitle: documentTitle,
    pageStyle: printPageStyle,
    onBeforePrint: async () => {
      setIsPrinting(true);
    },
    onAfterPrint: () => {
      setIsPrinting(false);
    },
    onPrintError: (errorLocation, error) => {
      setIsPrinting(false);
      console.error('PDF print/download error:', errorLocation, error);
      window.print();
    }
  });

  useEffect(() => {
    if (onRegisterPrintTrigger) {
      onRegisterPrintTrigger(handleDownloadPdf);
    }
  }, [handleDownloadPdf, onRegisterPrintTrigger]);

  useEffect(() => {
    if (onDownloadStatusChange) {
      onDownloadStatusChange(isPrinting);
    }
  }, [isPrinting, onDownloadStatusChange]);

  const totalPages = tocPages.length + songs.length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
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
        className="relative flex-1 overflow-y-auto overflow-x-auto bg-zinc-50 p-3 sm:p-8 print:p-0 print:bg-white print-scroll-container scroll-smooth"
      >
        {isPrinting && (
          <div 
            id="preview-downloading-pdf-pill"
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 print:hidden flex items-center gap-2.5 bg-blue-600 text-white px-4 py-2 rounded-full shadow-xl border border-blue-500/80 backdrop-blur-md animate-in fade-in slide-in-from-top-3 text-xs font-bold select-none"
          >
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Preparing PDF for download...</span>
          </div>
        )}

        {/* SONG PAGES LIST (ISOLATED & MEMOIZED PRINTABLE ROOT) */}
        <div 
          ref={printableRef}
          id="songbook-printable-area"
          className={`songbook-print-root transition-opacity duration-150 min-w-fit flex flex-col items-center ${isUpdatingLayout ? 'opacity-80' : 'opacity-100'}`}
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
          />
        </div>

        {/* Spacer so bottom floating toolbar does not cover bottom of last page */}
        <div className="h-24 print:hidden" />
      </div>

      {/* FLOATING QUICK VIEW TOOLBAR (CENTERED OVER PREVIEW PANE) */}
      <div 
        id="zoom-controls-toolbar"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 print:hidden flex items-center gap-1 sm:gap-1.5 bg-white/90 text-zinc-800 backdrop-blur-2xl px-2.5 sm:px-3.5 py-1.5 rounded-full shadow-xl border border-black/10 transition-all select-none"
      >
        {/* Zoom Out (-) */}
        <button
          id="zoom-out-btn"
          onClick={handleZoomOut}
          disabled={effectiveScale <= 0.25}
          className="p-1.5 sm:p-2 hover:bg-black/5 active:bg-black/10 text-zinc-600 hover:text-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-colors cursor-pointer"
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
            className="px-2.5 py-1 hover:bg-black/5 active:bg-black/10 text-zinc-600 hover:text-zinc-900 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors min-w-[66px] justify-center cursor-pointer"
            title="Choose Zoom Level"
          >
            <span>{displayPercentage}%</span>
            {zoomMode === 'fit-width' && <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">(Fit)</span>}
          </button>

          {/* Zoom Presets Dropdown */}
          {isBottomZoomMenuOpen && (
            <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 w-48 bg-white/95 backdrop-blur-xl border border-black/10 rounded-xl shadow-2xl p-1.5 space-y-0.5 z-40 text-xs animate-in fade-in slide-in-from-bottom-2 duration-100">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 mb-1">
                Display Modes
              </div>

              <button
                onClick={() => setPresetZoom('fit-width')}
                className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between hover:bg-black/5 hover:text-zinc-900 transition-colors cursor-pointer ${
                  zoomMode === 'fit-width' ? 'bg-black/5 text-zinc-900 font-bold' : 'text-zinc-600'
                }`}
              >
                <span>Fit Screen Width</span>
                {zoomMode === 'fit-width' && <Check className="w-3.5 h-3.5 text-zinc-600" />}
              </button>

              <button
                onClick={() => setPresetZoom('fit-page')}
                className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between hover:bg-black/5 hover:text-zinc-900 transition-colors cursor-pointer ${
                  zoomMode === 'fit-page' ? 'bg-black/5 text-zinc-900 font-bold' : 'text-zinc-600'
                }`}
              >
                <span>Fit Full Page</span>
                {zoomMode === 'fit-page' && <Check className="w-3.5 h-3.5 text-zinc-600" />}
              </button>

              <button
                onClick={() => setPresetZoom('custom', 1.0)}
                className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between hover:bg-black/5 hover:text-zinc-900 transition-colors cursor-pointer ${
                  zoomMode === 'custom' && Math.abs(customZoom - 1.0) < 0.01 ? 'bg-black/5 text-zinc-900 font-bold' : 'text-zinc-600'
                }`}
              >
                <span>100% (Actual Print Size)</span>
                {zoomMode === 'custom' && Math.abs(customZoom - 1.0) < 0.01 && <Check className="w-3.5 h-3.5 text-zinc-600" />}
              </button>

              <div className="my-1 border-t border-zinc-800" />

              <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Percentages
              </div>

              {[0.5, 0.75, 0.9, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0].map((level) => {
                const isSelected = zoomMode === 'custom' && Math.abs(customZoom - level) < 0.03;
                return (
                  <button
                    key={level}
                    onClick={() => setPresetZoom('custom', level)}
                    className={`w-full px-2.5 py-1 rounded-xl text-left flex items-center justify-between hover:bg-black/5 hover:text-zinc-900 transition-colors cursor-pointer ${
                      isSelected ? 'bg-black/5 text-zinc-900 font-bold' : 'text-zinc-600'
                    }`}
                  >
                    <span>{Math.round(level * 100)}%</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-zinc-600" />}
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
          className="p-1.5 sm:p-2 hover:bg-black/5 active:bg-black/10 text-zinc-600 hover:text-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-colors cursor-pointer"
          title="Zoom In (Ctrl +)"
          aria-label="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-zinc-700 mx-0.5" />

        {/* 100% Actual Size Button */}
        <button
          id="zoom-100-btn"
          onClick={() => setPresetZoom('custom', 1.0)}
          className={`p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer ${
            zoomMode === 'custom' && Math.abs(customZoom - 1.0) < 0.01 ? 'bg-black/5 text-zinc-900' : 'hover:bg-black/5 hover:text-zinc-900 text-zinc-600'
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
            zoomMode === 'fit-width' || zoomMode === 'fit-page' ? 'bg-black/5 text-zinc-900' : 'hover:bg-black/5 hover:text-zinc-900 text-zinc-600'
          }`}
          title={zoomMode === 'fit-width' ? "Fit Full Page" : "Fit to Screen Width"}
          aria-label="Fit View"
        >
          <Maximize2 className="w-4 h-4" />
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
              className="p-1.5 sm:p-2 hover:bg-black/5 active:bg-black/10 text-zinc-600 hover:text-zinc-900 text-zinc-600 rounded-full transition-colors cursor-pointer"
              title="Jump to Song"
              aria-label="Jump to Song"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Quick Song Jump Popover */}
            {isSongNavOpen && (
              <div 
                id="song-nav-modal"
                className="absolute bottom-full mb-2.5 right-0 sm:left-1/2 sm:-translate-x-1/2 w-64 max-h-72 overflow-y-auto bg-white/95 backdrop-blur-xl border border-black/10 rounded-xl shadow-2xl p-2 space-y-1 z-40 text-xs"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 mb-1 flex items-center justify-between">
                  <span>Jump to Song ({songs.length})</span>
                  <button 
                    onClick={() => handleScrollTo('toc-page')}
                    className="hover:underline text-zinc-600 font-semibold cursor-pointer"
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
                        className="w-full px-2 py-1.5 rounded-xl text-left text-zinc-600 hover:bg-black/5 hover:text-zinc-900 hover:text-white transition-colors truncate flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-5 font-mono text-zinc-500 font-semibold shrink-0 text-right">{idx + 1}.</span>
                        <span className="truncate">{sTitle}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scroll to Top */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="p-1.5 sm:p-2 hover:bg-black/5 active:bg-black/10 text-zinc-600 hover:text-zinc-900 text-zinc-600 rounded-full transition-colors cursor-pointer"
            title="Scroll to Top"
            aria-label="Scroll to Top"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Global styles for printing */}
      <style>{`
        .song-section {
          font-size: calc(var(--song-scale, 1) * var(--lyrics-size));
        }
        .song-line {
          font-size: calc(var(--song-scale, 1) * var(--lyrics-size));
        }
        .song-marker {
          color: var(--marker-color);
          font-size: 0.85em;
        }
        .song-chord {
          color: var(--chords-color);
          font-size: calc(var(--song-scale, 1) * var(--chords-size));
          min-height: calc(var(--song-scale, 1) * var(--chords-size));
          margin-bottom: 0.15em;
        }
        .song-lyric {
          color: var(--lyrics-color);
        }

        @media print {
          @page {
            size: ${settings.pageFormat === 'Letter' ? 'letter' : settings.pageFormat} ${settings.orientation};
            margin: 0;
          }
          body {
            background: white !important;
          }
          .print-scroll-container {
            overflow: visible !important;
            height: auto !important;
            padding: 0 !important;
            background: white !important;
          }
          .song-page-outer-wrapper {
            content-visibility: visible !important;
            contain-intrinsic-size: none !important;
          }
          .print-page-container,
          .print-index-container {
            box-shadow: none !important;
            break-after: page !important;
            page-break-after: always !important;
            margin: 0 !important;
            transform: none !important;
            position: relative !important;
          }
        }
      `}</style>
    </div>
  );
};

export const SongbookPreview = memo(SongbookPreviewComponent, songbookPreviewComparator);
