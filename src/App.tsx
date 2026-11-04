import React, {
  useState,
  useEffect,
  useDeferredValue,
  useTransition,
  useRef,
  useCallback,
  useMemo,
  startTransition,
  Suspense,
  lazy,
} from 'react';
import { Sidebar } from './components/Sidebar';
// Code-splitting: the heavy preview module (layout engine + page rendering, ~2.2k lines)
// is loaded on demand instead of blocking the initial import-screen bundle.
const SongbookPreview = lazy(() =>
  import('./components/SongbookPreview').then((m) => ({ default: m.SongbookPreview })),
);
import { ProgressBar } from './components/ProgressBar';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { KytarioLogo } from './components/KytarioLogo';
import { getChangedSettingsList } from './components/UnappliedSettingsBanner';
import { Song, SongbookData, PrintSettings, ZoomMode } from './types';
import type { JsonValue, RawLike } from './types/rawSongbook';
import {
  FileJson,
  Upload,
  Clipboard,
  CheckCircle2,
  Music,
  FileText,
  AlertCircle,
  SlidersHorizontal,
  FolderOpen,
  FileDown,
  Loader2,
  Globe,
  ExternalLink,
  AlertTriangle,
  Minus,
  Plus,
  RotateCcw,
  Maximize2,
  BookOpen,
  Archive,
  FileArchive,
  ListFilter,
} from 'lucide-react';
import {
  safeParseSongbookJson,
  normalizeSongbookData,
  normalizeSingleSong,
  formatCoverDisplayUrl,
} from './utils';
import { isZipFile, parseKytarioZip, ZipParseResult } from './utils/zipParser';
import { readFileAsText } from './utils/fileIO';
import {
  fetchSongbookFromKytario,
  cleanKytarioUrl,
  extractKytarioSlug,
  KytarioErrorDetails,
  getStoredProxyUrl,
  setStoredProxyUrl,
} from './utils/api';
import { APP_CONFIG } from './config';
import { DEFAULT_PRINT_SETTINGS, STORAGE_KEYS } from './config/constants';
import { useBackgroundPdfGenerator } from './hooks/useBackgroundPdfGenerator';
// Modal-only components: loaded on demand so they stay out of the initial chunk.
const BackgroundPdfProgressModal = lazy(() =>
  import('./components/BackgroundPdfProgressModal').then((m) => ({
    default: m.BackgroundPdfProgressModal,
  })),
);
const SongSelectionModal = lazy(() =>
  import('./components/SongSelectionModal').then((m) => ({ default: m.SongSelectionModal })),
);
import { saveCachedSongbookToStorage, loadCachedSongbookFromStorage } from './utils/storage';
import { ZipProjectSelectModal } from './components/ZipProjectSelectModal';
import { ImportTabs, type ImportTabId } from './components/import/ImportTabs';
import { UrlImportPanel } from './components/import/UrlImportPanel';
import { PasteImportPanel } from './components/import/PasteImportPanel';
import { FileDropzonePanel } from './components/import/FileDropzonePanel';
import { ResetSongbookDialog } from './components/ResetSongbookDialog';
import { PreviewChunkFallback } from './components/PreviewChunkFallback';

const defaultSettings: PrintSettings = DEFAULT_PRINT_SETTINGS;

/** Migrate & sanitize persisted settings; falls back to defaults on any error. */
function getInitialSettings(): PrintSettings {
  const baseDefaults = defaultSettings;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!saved) return baseDefaults;
    const parsed = JSON.parse(saved);
    if (
      (parsed.lyricsFontSize === 14 || parsed.lyricsFontSize === 11) &&
      (parsed.chordsFontSize === 14 || parsed.chordsFontSize === 11)
    ) {
      parsed.lyricsFontSize = 12;
      parsed.chordsFontSize = 12;
    }
    if (typeof parsed.maxFontSizePx !== 'number') {
      parsed.maxFontSizePx = 16;
    }
    if (typeof parsed.maxLineHeight !== 'number') {
      parsed.maxLineHeight = 1.6;
    }
    if (typeof parsed.sectionMarginCap !== 'number') {
      parsed.sectionMarginCap = 28;
    }
    return { ...baseDefaults, ...parsed, columns: 2 };
  } catch (e) {
    return baseDefaults;
  }
}

export default function App() {
  const [songbookData, setSongbookData] = useState<SongbookData | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CACHED_SONGBBOOK);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.songs || parsed.items || parsed.sections)) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  // Asynchronously check IndexedDB storage on mount if localStorage was empty or exceeded quota
  useEffect(() => {
    let mounted = true;
    if (!songbookData) {
      loadCachedSongbookFromStorage()
        .then((data) => {
          if (mounted && data && (data.songs || data.items || data.sections)) {
            setSongbookData(data);
          }
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, []);

  // Persist songbook changes to both IndexedDB and localStorage safely
  useEffect(() => {
    saveCachedSongbookToStorage(songbookData).catch(() => {});
  }, [songbookData]);
  const [pastedJson, setPastedJson] = useState('');
  const [kytarioUrl, setKytarioUrl] = useState('');
  const [activeTab, setActiveTab] = useState<ImportTabId>('url');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [kytarioFetchDetails, setKytarioFetchDetails] = useState<KytarioErrorDetails | null>(null);
  const [showProxyConfig, setShowProxyConfig] = useState(false);
  const [customProxyInput, setCustomProxyInput] = useState(() => getStoredProxyUrl());
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [pendingZipResult, setPendingZipResult] = useState<{
    result: ZipParseResult;
    fileName: string;
  } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSongNavOpen, setIsSongNavOpen] = useState(false);
  const [isSongSelectionOpen, setIsSongSelectionOpen] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string | number>>(new Set());
  const [, startSongSelectionTransition] = useTransition();

  // Debounce timer ref to handle high-frequency selection toggles gracefully
  const songSelectionDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Automatically initialize selectedSongIds when songbook songs load
  useEffect(() => {
    if (songbookData?.songs && songbookData.songs.length > 0) {
      setSelectedSongIds((prev) => {
        if (prev.size === 0) {
          return new Set(
            songbookData.songs!.map((s, idx) =>
              s.id !== undefined && s.id !== null ? s.id : idx + 1,
            ),
          );
        }
        return prev;
      });
    }
  }, [songbookData]);

  // Transition-wrapped and debounced state updater for selectedSongIds
  const updateSelectedSongIds = useCallback(
    (
      updater: Set<string | number> | ((prev: Set<string | number>) => Set<string | number>),
      debounceMs = 0,
    ) => {
      if (debounceMs > 0) {
        if (songSelectionDebounceTimerRef.current) {
          clearTimeout(songSelectionDebounceTimerRef.current);
        }
        songSelectionDebounceTimerRef.current = setTimeout(() => {
          startSongSelectionTransition(() => {
            setSelectedSongIds(updater);
          });
        }, debounceMs);
      } else {
        startSongSelectionTransition(() => {
          setSelectedSongIds(updater);
        });
      }
    },
    [],
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (songSelectionDebounceTimerRef.current) {
        clearTimeout(songSelectionDebounceTimerRef.current);
      }
    };
  }, []);

  // Use deferred value for the expensive PDF preview calculation to keep the UI fluid during rapid toggling
  const deferredSelectedSongIds = useDeferredValue(selectedSongIds);

  // Memoized visible songs based on deferredSelectedSongIds
  const previewSongs = useMemo(() => {
    if (!songbookData?.songs) return [];
    if (deferredSelectedSongIds.size === 0) return songbookData.songs;
    return songbookData.songs.filter((s, idx) => {
      const id = s.id !== undefined && s.id !== null ? s.id : idx + 1;
      return deferredSelectedSongIds.has(id);
    });
  }, [songbookData?.songs, deferredSelectedSongIds]);

  // Memoized songbook data object for SongbookPreview to avoid unnecessary layout recalculations
  const previewData = useMemo(() => {
    if (!songbookData) return null;
    return {
      ...songbookData,
      songs: previewSongs,
    };
  }, [songbookData, previewSongs]);

  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit-page');
  const [customZoom, setCustomZoom] = useState<number>(1.0);
  const [activeScale, setActiveScale] = useState<number>(1.0);

  const handleZoomIn = useCallback(() => {
    // Step zoom relative to currently rendered activeScale to prevent sudden jumps on fit modes
    const baseScale = Math.round(activeScale * 10) / 10;
    const nextScale = Math.min(3.0, baseScale + 0.1);
    setCustomZoom(Math.round(nextScale * 100) / 100);
    setZoomMode('custom');
  }, [activeScale]);

  const handleZoomOut = useCallback(() => {
    // Step zoom relative to currently rendered activeScale to prevent sudden jumps on fit modes
    const baseScale = Math.round(activeScale * 10) / 10;
    const nextScale = Math.max(0.25, baseScale - 0.1);
    setCustomZoom(Math.round(nextScale * 100) / 100);
    setZoomMode('custom');
  }, [activeScale]);

  const handleResetZoom = useCallback(() => {
    setCustomZoom(1.0);
    setZoomMode('custom');
  }, []);

  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isLoadingJson, setIsLoadingJson] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up any stale legacy auto-save localStorage items
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.LEGACY_SONGBBOOK);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_LAST_SAVED);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_DRAFT_SETTINGS);
    } catch (e) {}
  }, []);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      setToast({ message, type });
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
      }, 3500);
    },
    [],
  );
  const [loadingStatus, setLoadingStatus] = useState<{
    title: string;
    subtitle?: string;
    progress?: number;
  }>({
    title: 'Loading songbook...',
    subtitle: 'Processing songs and Table of Contents...',
  });

  const [settings, setSettings] = useState<PrintSettings>(getInitialSettings);
  const [draftSettings, setDraftSettings] = useState<PrintSettings>(getInitialSettings);

  const unappliedChanges = useMemo(() => {
    return getChangedSettingsList(draftSettings, settings);
  }, [draftSettings, settings]);

  const hasUnappliedSettings = unappliedChanges.length > 0;

  const handleDiscardDraftSettings = useCallback(() => {
    setDraftSettings(settings);
    showToast('Pending settings changes discarded', 'info');
  }, [settings, showToast]);

  // Instant settings updates with clear visual feedback
  const [isUpdatingLayout, setIsUpdatingLayout] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  const handleSaveSettings = useCallback(() => {
    const key = STORAGE_KEYS.SETTINGS;
    const settingsToSave: PrintSettings = {
      ...defaultSettings,
      ...draftSettings,
      columns: 2,
    };

    try {
      localStorage.setItem(key, JSON.stringify(settingsToSave));
      setSettings(settingsToSave);
      setDraftSettings(settingsToSave);
      showToast('Settings saved locally!', 'success');
    } catch (e) {
      showToast('Failed to save settings to local storage', 'error');
    }
  }, [draftSettings, showToast]);

  const handleResetToDefaults = useCallback(() => {
    const key = STORAGE_KEYS.SETTINGS;
    try {
      localStorage.removeItem(key);
    } catch (e) {}

    setSettings(defaultSettings);
    setDraftSettings(defaultSettings);
    showToast('Settings reset to defaults', 'info');
  }, [showToast]);

  const updateTimersRef = useRef<{
    applyTimer?: ReturnType<typeof setTimeout>;
    finishTimer?: ReturnType<typeof setTimeout>;
  }>({});

  // Background Web Worker PDF Generation Engine
  const {
    isGenerating: isGeneratingWorkerPdf,
    progress: workerPdfProgress,
    error: workerPdfError,
    lastGenerated: workerPdfLastGenerated,
    cachedPdf: workerCachedPdf,
    generatePdf: generateWorkerPdf,
    downloadCachedPdf: downloadWorkerCachedPdf,
    invalidateCachedPdf: invalidateWorkerCachedPdf,
    cancelPdfGeneration: cancelWorkerPdf,
    clearError: clearWorkerPdfError,
    clearLastGenerated: clearWorkerPdfLastGenerated,
  } = useBackgroundPdfGenerator();

  // Compute a stable fingerprint of the songbook data & applied settings
  const computeFingerprint = useCallback(
    (data: SongbookData | null, appliedSettings: PrintSettings): string => {
      if (!data) return '';
      return JSON.stringify({
        title: data.title,
        songCount: data.songs?.length,
        songIds: data.songs?.map((s) => s.id || s.title),
        appliedSettings,
      });
    },
    [],
  );

  const currentFingerprint = useMemo(() => {
    return computeFingerprint(songbookData, settings);
  }, [songbookData, settings, computeFingerprint]);

  // Invalidate cache if songbookData changes or applied settings change
  useEffect(() => {
    if (workerCachedPdf && workerCachedPdf.fingerprint !== currentFingerprint) {
      invalidateWorkerCachedPdf();
    }
  }, [currentFingerprint, workerCachedPdf, invalidateWorkerCachedPdf]);

  // PDF is ready for instant download when we have a valid cached PDF matching the current songbook + settings,
  // and there are no unapplied draft settings pending
  const isPdfReady = Boolean(
    workerCachedPdf &&
    !isGeneratingWorkerPdf &&
    !hasUnappliedSettings &&
    workerCachedPdf.fingerprint === currentFingerprint,
  );

  // Background Web Worker PDF Download (or instant cached re-download)
  const handleDownloadPdf = useCallback(
    async (forceRegenerate: boolean = false) => {
      if (!songbookData) return;

      // If PDF is already ready and no forced regeneration requested, download cached blob instantly
      if (!forceRegenerate && isPdfReady && downloadWorkerCachedPdf()) {
        showToast(`Downloading ready PDF (${workerCachedPdf?.filename || 'Songbook'})`, 'success');
        return;
      }

      // Otherwise, generate fresh PDF via Web Worker with current state fingerprint
      try {
        showToast('Starting PDF generation... compiling pages in background thread.', 'info');
        await generateWorkerPdf(songbookData, settings, currentFingerprint);
      } catch (err: any) {
        showToast(err?.message || 'Background PDF generation failed', 'error');
      }
    },
    [
      songbookData,
      settings,
      isPdfReady,
      downloadWorkerCachedPdf,
      workerCachedPdf,
      generateWorkerPdf,
      currentFingerprint,
      showToast,
    ],
  );

  const handleOpenResetModal = useCallback(() => {
    setIsConfirmResetOpen(true);
  }, []);

  const handleCloseResetModal = useCallback(() => {
    setIsConfirmResetOpen(false);
  }, []);

  const handleCloseMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  const handleOpenMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setIsMobileSidebarOpen(true);
    setIsDesktopSidebarCollapsed(false);
  }, []);

  // Close 'Song Navigation' (Content) drawer and mobile settings sidebar on click outside
  useEffect(() => {
    if (!isSongNavOpen && !isMobileSidebarOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore click if the element is no longer connected to the document DOM
      // (React often unmounts or re-renders elements clicked inside the sidebar or modals synchronously,
      // which causes target.closest() to return null even though the click was inside).
      if (!target.isConnected || !document.body.contains(target)) {
        return;
      }

      // Close Song Navigation drawer if click was outside the popover and its toggle button
      if (isSongNavOpen) {
        const isInsideSongNav =
          target.closest('#song-nav-modal') || target.closest('#floating-nav-btn');
        if (!isInsideSongNav) {
          setIsSongNavOpen(false);
        }
      }

      // Close Mobile Settings sidebar if click was outside the sidebar container and its toggle button
      if (isMobileSidebarOpen) {
        const isInsideMobileSidebar =
          target.closest('#mobile-settings-sidebar') || target.closest('#floating-settings-btn');
        if (!isInsideMobileSidebar) {
          setIsMobileSidebarOpen(false);
        }
      }
    };

    document.body.addEventListener('click', handleOutsideClick);

    return () => {
      document.body.removeEventListener('click', handleOutsideClick);
    };
  }, [isSongNavOpen, isMobileSidebarOpen]);

  // Global Escape key shortcut handler for desktop accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSongNavOpen) setIsSongNavOpen(false);
        if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
        if (isConfirmResetOpen) setIsConfirmResetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSongNavOpen, isMobileSidebarOpen, isConfirmResetOpen]);

  const handleSidebarDownloadPdf = useCallback(() => {
    handleDownloadPdf();
  }, [handleDownloadPdf]);

  const handleApplySettings = (newSettings: any) => {
    if (!newSettings || typeof newSettings !== 'object' || 'nativeEvent' in newSettings) {
      return;
    }
    const safeSettings: PrintSettings = {
      ...defaultSettings,
      ...newSettings,
      columns: 2,
    };

    // Clear any existing update timers
    if (updateTimersRef.current.applyTimer) {
      clearTimeout(updateTimersRef.current.applyTimer);
    }
    if (updateTimersRef.current.finishTimer) {
      clearTimeout(updateTimersRef.current.finishTimer);
    }

    // 1. FIRST: Immediately display the message that updating is in progress!
    setIsUpdatingLayout(true);

    // 2. Allow browser to paint the updating status on screen before starting heavy layout update
    updateTimersRef.current.applyTimer = setTimeout(() => {
      // 3. Now start applying changes
      setSettings(safeSettings);
      setDraftSettings(safeSettings);

      // Automatically save settings to local storage on update/apply
      const key = STORAGE_KEYS.SETTINGS;
      try {
        localStorage.setItem(key, JSON.stringify(safeSettings));

        // Show automated auto-save indicator briefly
        setShowAutoSaveIndicator(true);
        setTimeout(() => {
          setShowAutoSaveIndicator(false);
        }, 2200);
      } catch (err) {
        console.warn('Auto-save settings error:', err);
      }

      // 4. Keep the updating status active until layout rendering completes, then dismiss
      updateTimersRef.current.finishTimer = setTimeout(() => {
        setIsUpdatingLayout(false);
        showToast('Settings successfully applied!');
      }, 650);
    }, 120);
  };

  const animateSongbookLoad = useCallback(
    (
      data: SongbookData,
      options: {
        startProgress?: number;
        isRepaired?: boolean;
        recoveredCount?: number;
        sourceType: 'file' | 'url' | 'paste';
        sourceLabel?: string;
      },
    ) => {
      setIsLoadingJson(true);
      const songs = data.songs || data.items || [];
      if (songs.length === 0) {
        setIsLoadingJson(false);
        setErrorMessage(
          options.sourceType === 'url'
            ? 'No songs found in the Kytario response. The songbook might be private or the URL might be incorrect.'
            : 'No songs found in the provided JSON.',
        );
        return;
      }

      // Explicitly verify the presence and format of the urlToken field
      const candidateToken = data.urlToken || data.slug || data.shortUrl;
      if (!candidateToken || !String(candidateToken).trim()) {
        setWarningMessage(
          'Warning: The "urlToken" field is missing or empty. Generated covers or QR codes might be incomplete.',
        );
      } else if (!/^[a-zA-Z0-9_\-\./]+$/.test(String(candidateToken).trim())) {
        setWarningMessage(
          'Warning: The "urlToken" field format appears invalid (contains unsupported characters). Generated covers or QR codes might be incomplete.',
        );
      }

      const startProgress = options.startProgress ?? 20;
      const targetSongProgress = 90; // Formatting songs advances progress to 90%
      const progressRange = targetSongProgress - startProgress;

      let currentSong = 0;
      const totalSongs = songs.length;
      // 12-16 update steps so the user sees smooth, detailed progression
      const steps = Math.min(15, totalSongs);
      const chunkSize = Math.max(1, Math.ceil(totalSongs / steps));

      const stepProgress = () => {
        currentSong = Math.min(currentSong + chunkSize, totalSongs);
        const ratio = currentSong / totalSongs;
        const percent = Math.round(startProgress + ratio * progressRange);
        const currentTitle = songs[currentSong - 1]?.title;
        const songSuffix = currentTitle ? `: ${currentTitle}` : '';

        setLoadingStatus({
          title: 'Processing songs...',
          subtitle: `Formatting song ${currentSong} of ${totalSongs}${songSuffix}`,
          progress: percent,
        });

        if (currentSong < totalSongs) {
          requestAnimationFrame(() => setTimeout(stepProgress, 35));
        } else {
          // Formatting is complete! Now transition to layout rendering at 95%
          setLoadingStatus({
            title: 'Preparing preview...',
            subtitle: 'Rendering layouts & page breaks...',
            progress: 95,
          });

          // Small timeout allows browser to paint the 95% state before heavy layout calculation
          setTimeout(() => {
            setSongbookData(data);
            if (options.sourceType === 'url') {
              setDraftSettings((prev) => ({
                ...prev,
                frontCoverTitle: undefined,
                backCoverTitle: undefined,
              }));
              setSettings((prev) => ({
                ...prev,
                frontCoverTitle: undefined,
                backCoverTitle: undefined,
              }));
            }
            if (options.isRepaired) {
              setRecoveryNotice(
                `Successfully parsed and recovered ${options.recoveredCount} songs from formatted/truncated JSON data.`,
              );
            }

            // Next animation frame after songbookData mounts
            requestAnimationFrame(() => {
              setTimeout(() => {
                // Layout is mounted, now advance to 100%!
                setLoadingStatus({
                  title: 'Ready!',
                  subtitle: 'Layout complete',
                  progress: 100,
                });

                // Give user 2000ms to clearly see the progress bar reach the 100% end
                setTimeout(() => {
                  setIsLoadingJson(false);
                  const songCount = songs.length;
                  const songsWithContent = songs.filter(
                    (s) => s.content && s.content.trim().length > 0,
                  ).length;
                  const bookTitle = data.title || options.sourceLabel || 'Songbook';

                  if (options.sourceType === 'url') {
                    if (songsWithContent === 0 && songCount > 0) {
                      showToast(
                        `Imported ${songCount} titles, but lyrics were not found. Try a different URL?`,
                        'info',
                      );
                    } else {
                      showToast(
                        `Successfully imported "${bookTitle}" from Kytario (${songsWithContent}/${songCount} songs with lyrics)!`,
                      );
                    }
                  } else {
                    showToast(
                      `Successfully loaded "${bookTitle}" (${songCount} song${songCount === 1 ? '' : 's'})!`,
                    );
                  }
                  setSelectedSongIds(new Set(songs.map((s) => s.id!)));
                }, 800);
              }, 100);
            });
          }, 80);
        }
      };

      requestAnimationFrame(() => setTimeout(stepProgress, 40));
    },
    [showToast],
  );

  const processJsonString = (rawString: string, fileName?: string) => {
    setErrorMessage(null);
    setRecoveryNotice(null);
    setWarningMessage(null);
    setIsLoadingJson(true);
    setLoadingStatus({
      title: 'Reading JSON file...',
      subtitle: fileName ? `Extracting songs from ${fileName}...` : 'Analyzing structure...',
      progress: 10,
    });

    // Short timeout allows the browser to render the loading spinner before computational work
    setTimeout(() => {
      try {
        const { data, isRepaired, recoveredCount } = safeParseSongbookJson(rawString);
        animateSongbookLoad(data, {
          startProgress: 20,
          isRepaired,
          recoveredCount,
          sourceType: fileName ? 'file' : 'paste',
          sourceLabel: fileName,
        });
      } catch (err: any) {
        console.error('JSON parse error:', err);
        setIsLoadingJson(false);
        setErrorMessage(
          err.message ||
            'Could not parse JSON. Please check that it is valid Kytario songbook data.',
        );
      }
    }, 100);
  };

  const processUploadedFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    // 1. Check if any file is a ZIP archive (e.g. Kytario export ZIP)
    const zipFile = files.find((f) => isZipFile(f));
    if (zipFile) {
      setIsLoadingJson(true);
      setLoadingStatus({
        title: 'Extracting Kytario export archive...',
        subtitle: `Analyzing ${zipFile.name}...`,
        progress: 25,
      });

      try {
        const result = await parseKytarioZip(zipFile);
        if (result.projects.length > 1) {
          setIsLoadingJson(false);
          setPendingZipResult({
            result,
            fileName: zipFile.name,
          });
        } else {
          animateSongbookLoad(result.songbook, {
            startProgress: 50,
            sourceType: 'file',
            sourceLabel: zipFile.name,
          });
          showToast(`Successfully extracted ${result.totalSongs} songs from "${zipFile.name}"!`);
        }
      } catch (err: any) {
        console.error('ZIP extraction error:', err);
        setIsLoadingJson(false);
        setErrorMessage(err.message || 'Could not extract Kytario export ZIP.');
      }
      return;
    }

    // 2. Multiple JSON files (e.g. user selected multiple songs from projects/bodg/songs/)
    if (files.length > 1) {
      setIsLoadingJson(true);
      setLoadingStatus({
        title: 'Reading multiple song files...',
        subtitle: `Loading ${files.length} JSON files...`,
        progress: 20,
      });

      try {
        const combinedSongs: Song[] = [];
        const unreadableFiles: string[] = [];
        for (const file of files) {
          try {
            // Non-blocking async read (File.text() with FileReader fallback)
            const text = await readFileAsText(file);
            const parsed: JsonValue = JSON.parse(text);
            if (Array.isArray(parsed)) {
              combinedSongs.push(
                ...parsed.map((s, idx) =>
                  normalizeSingleSong(s as RawLike, combinedSongs.length + idx),
                ),
              );
            } else if (!Array.isArray(parsed) && parsed && typeof parsed === 'object' && 'song' in parsed) {
              const songVal = (parsed as RawLike).song;
              combinedSongs.push(normalizeSingleSong(songVal as RawLike, combinedSongs.length));
            } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (('name' in parsed) || ('title' in parsed) || ('content' in parsed) || ('sections' in parsed))) {
              combinedSongs.push(normalizeSingleSong(parsed as RawLike, combinedSongs.length));
            } else {
              unreadableFiles.push(file.name);
            }
          } catch {
            unreadableFiles.push(file.name);
          }
        }

        if (unreadableFiles.length > 0) {
          setWarningMessage(
            `${unreadableFiles.length} file${unreadableFiles.length === 1 ? '' : 's'} could not be read as valid song JSON and ${unreadableFiles.length === 1 ? 'was' : 'were'} skipped: ${unreadableFiles.slice(0, 5).join(', ')}${unreadableFiles.length > 5 ? '…' : ''}`,
          );
        }

        if (combinedSongs.length > 0) {
          const songbookData: SongbookData = {
            title: 'Imported Songbook',
            name: 'Imported Songbook',
            songs: combinedSongs,
          };
          animateSongbookLoad(songbookData, {
            startProgress: 50,
            sourceType: 'file',
            sourceLabel: `${files.length} files`,
          });
          return;
        }

        setIsLoadingJson(false);
        setErrorMessage('None of the selected files contained recognizable Kytario song JSON.');
      } catch (err: any) {
        console.error('Multi-file read error:', err);
        setIsLoadingJson(false);
        setErrorMessage(err?.message || 'Failed to read the selected files.');
      }
    }

    // 3. Single JSON file — async, non-blocking read instead of callback FileReader
    const file = files[0];
    setIsLoadingJson(true);
    setLoadingStatus({
      title: 'Reading file...',
      subtitle: file.name,
    });

    try {
      const content = await readFileAsText(file);
      processJsonString(content, file.name);
    } catch (err: any) {
      setIsLoadingJson(false);
      setErrorMessage(err?.message || 'Failed to read file.');
    }
  };

  const handleAcceptedFiles = useCallback(
    (files: File[]) => {
      setErrorMessage(null);
      setRecoveryNotice(null);
      setWarningMessage(null);
      processUploadedFiles(files);
    },
    [processUploadedFiles],
  );

  const handleUploadValidationErrors = useCallback(
    (errors: { fileName: string; reason: string }[]) => {
      const summary = errors.map((e) => `${e.fileName}: ${e.reason}`).join(' ');
      setErrorMessage(`Some files were rejected. ${summary}`);
    },
    [],
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    processUploadedFiles(e.target.files);
    e.target.value = '';
  };

  const handlePasteSubmit = () => {
    if (!pastedJson.trim()) {
      setErrorMessage('Please paste JSON content first.');
      return;
    }
    setIsLoadingJson(true);
    setLoadingStatus({
      title: 'Processing pasted JSON...',
      subtitle: 'Analyzing songbook payload...',
    });
    processJsonString(pastedJson);
  };

  const handleSelectZipProject = (selectedSlug: string | 'all', onlyPublic: boolean) => {
    if (!pendingZipResult) return;
    const { result, fileName } = pendingZipResult;

    // Close modal immediately to allow UI to update
    setPendingZipResult(null);

    // Defer heavy processing to allow React to paint the modal closure
    setTimeout(() => {
      setIsLoadingJson(true);
      setLoadingStatus({
        title: 'Preparing songbook...',
        subtitle: `Extracting ${selectedSlug === 'all' ? 'all projects' : selectedSlug}...`,
        progress: 30,
      });

      let targetSongbook: SongbookData;

      if (selectedSlug === 'all') {
        const allSongs: Song[] = [];
        result.projects.forEach((p) => {
          p.songs.forEach((s) => {
            if (onlyPublic && s.isPrivate) return;
            allSongs.push({
              ...s,
              id: allSongs.length + 1,
            });
          });
        });

        targetSongbook = {
          title: `${fileName.replace(/\.zip$/i, '')} (All Projects)`,
          name: `${fileName.replace(/\.zip$/i, '')} (All Projects)`,
          songs: allSongs,
        };
      } else {
        const selectedProject =
          result.projects.find((p) => p.slug === selectedSlug) || result.projects[0];
        if (!selectedProject) {
          setIsLoadingJson(false);
          return;
        }

        const songs = selectedProject.songs.filter((s) => !onlyPublic || !s.isPrivate);

        targetSongbook = {
          title: selectedProject.name,
          name: selectedProject.name,
          urlToken: selectedProject.slug,
          slug: selectedProject.slug,
          songs: songs,
        };
      }

      animateSongbookLoad(targetSongbook, {
        startProgress: 35,
        sourceType: 'file',
        sourceLabel: `${targetSongbook.title} (${fileName})`,
      });
    }, 50);
  };

  const handleKytarioUrlSubmit = async () => {
    const cleanUrl = cleanKytarioUrl(kytarioUrl);
    if (!cleanUrl) {
      setErrorMessage('Please enter a Kytario URL first.');
      setKytarioFetchDetails(null);
      return;
    }

    const hasPlaylist = /[?&]playlist=/i.test(kytarioUrl);
    if (!hasPlaylist && cleanUrl !== kytarioUrl) {
      setKytarioUrl(cleanUrl);
    }

    setErrorMessage(null);
    setKytarioFetchDetails(null);
    setRecoveryNotice(null);
    setWarningMessage(null);
    setIsLoadingJson(true);

    const targetUrl = kytarioUrl.trim() || cleanUrl;

    // Initial Stage 1: Connecting
    setLoadingStatus({
      title: 'Connecting to Kytario...',
      subtitle: targetUrl,
      progress: 8,
    });

    // Progressive Ticker during asynchronous fetching (8% -> 34%)
    let currentFetchProgress = 8;
    const fetchProgressInterval = setInterval(() => {
      currentFetchProgress = Math.min(34, currentFetchProgress + 3);
      let stageTitle = 'Connecting to Kytario...';
      let stageSubtitle = targetUrl;

      if (currentFetchProgress >= 14 && currentFetchProgress < 22) {
        stageTitle = 'Fetching songbook payload...';
        stageSubtitle = 'Requesting sections & songs from Kytario API...';
      } else if (currentFetchProgress >= 22 && currentFetchProgress < 28) {
        stageTitle = 'Reading webpage metadata...';
        stageSubtitle = 'Extracting songbook name & details...';
      } else if (currentFetchProgress >= 28) {
        stageTitle = 'Receiving JSON data...';
        stageSubtitle = 'Parsing song structures & chords...';
      }

      setLoadingStatus({
        title: stageTitle,
        subtitle: stageSubtitle,
        progress: currentFetchProgress,
      });
    }, 280);

    try {
      const rawData = await fetchSongbookFromKytario(targetUrl);
      clearInterval(fetchProgressInterval);

      // Guarantee that rawData carries the exact requested songbook/playlist URL, slug, and display shortUrl
      const resolvedSlug = extractKytarioSlug(targetUrl) || extractKytarioSlug(cleanUrl);
      if (resolvedSlug) {
        rawData.urlToken = resolvedSlug;
        rawData.slug = resolvedSlug;
      }
      if (cleanUrl && /^https?:\/\//i.test(cleanUrl)) {
        rawData.url = cleanUrl;
        rawData.shortUrl = formatCoverDisplayUrl(cleanUrl);
      } else if (cleanUrl && /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i.test(cleanUrl)) {
        rawData.url = `https://${cleanUrl}`;
        rawData.shortUrl = formatCoverDisplayUrl(cleanUrl);
      } else if (resolvedSlug) {
        rawData.url = rawData.url || `https://kytario.com/${resolvedSlug}`;
        rawData.shortUrl = rawData.shortUrl || formatCoverDisplayUrl(rawData.url);
      }

      const data = normalizeSongbookData(rawData);
      setKytarioFetchDetails(null);

      const songCount = (data.songs || []).length;
      const songbookName = data.title || 'Songbook';

      // Informative Transition Stage 2: Payload Received & Name Confirmed (38%)
      setLoadingStatus({
        title: 'Songbook Received!',
        subtitle: `Found ${songCount} song${songCount === 1 ? '' : 's'} in "${songbookName}"`,
        progress: 38,
      });

      // Brief frame paint so user clearly reads the confirmed songbook name and song count
      setTimeout(() => {
        setLoadingStatus({
          title: 'Parsing & Validating...',
          subtitle: 'Extracting song sections, chords, and Table of Contents...',
          progress: 42,
        });

        setTimeout(() => {
          animateSongbookLoad(data, {
            startProgress: 42,
            sourceType: 'url',
            sourceLabel: cleanUrl,
          });
        }, 150);
      }, 280);
    } catch (err: any) {
      clearInterval(fetchProgressInterval);
      console.warn('Kytario import:', err?.message || err);
      setErrorMessage(err.message || 'Failed to import from Kytario.');
      if (err.details) {
        setKytarioFetchDetails(err.details);
      }
      setIsLoadingJson(false);
    }
  };

  const resetSongbook = () => {
    setSongbookData(null);
    setPastedJson('');
    setErrorMessage(null);
    setRecoveryNotice(null);
    setIsLoadingJson(false);
    setIsMobileSidebarOpen(false);
    try {
      localStorage.removeItem(STORAGE_KEYS.CACHED_SONGBBOOK);
    } catch (e) {}
    showToast('Songbook reset', 'info');
  };

  if (!songbookData) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-3 sm:p-6 relative">
        {/* Project Selection Modal for Multi-Project ZIP Archives */}
        <ZipProjectSelectModal
          isOpen={pendingZipResult !== null}
          fileName={pendingZipResult?.fileName || ''}
          projects={pendingZipResult?.result.projects || []}
          totalSongs={pendingZipResult?.result.totalSongs || 0}
          onSelectProject={(slug, onlyPublic) => handleSelectZipProject(slug, onlyPublic)}
          onCancel={() => {
            setPendingZipResult(null);
            setIsLoadingJson(false);
          }}
        />

        {/* Full-screen Loading Spinner Overlay while parsing and preparing songbook */}
        <ProgressBar
          active={isLoadingJson}
          statusText={loadingStatus.title}
          subText={loadingStatus.subtitle}
          progress={loadingStatus.progress}
          variant="overlay"
        />

        <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg border border-black/5 p-5 sm:p-8 space-y-5 sm:space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center mx-auto">
              <KytarioLogo className="w-14 h-14 sm:w-16 sm:h-16" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
                Kytario Print Customizer
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                v{APP_CONFIG.APP_VERSION}
              </span>
            </div>
            <p className="text-zinc-600 text-xs sm:text-sm max-w-sm mx-auto">
              Transform your Kytario songbook into print-ready PDF pages with automatic Table of
              Contents and clean formatting.
            </p>
            <div className="pt-1 flex justify-center">
              <PWAInstallButton variant="primary" />
            </div>
          </div>

          <ImportTabs
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setErrorMessage(null);
              setKytarioFetchDetails(null);
            }}
          />

          {/* Global import error live region for screen readers */}
          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700 text-xs sm:text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <div
            role="tabpanel"
            id={`import-panel-${activeTab}`}
            aria-labelledby={`import-tab-${activeTab}`}
            tabIndex={0}
            className="focus:outline-none"
          >
            {activeTab === 'upload' && (
              <FileDropzonePanel
                onFilesAccepted={handleAcceptedFiles}
                onValidationErrors={handleUploadValidationErrors}
                isProcessing={isLoadingJson}
              />
            )}

            {activeTab === 'url' && (
              <UrlImportPanel
                url={kytarioUrl}
                onUrlChange={(v) => {
                  setKytarioUrl(v);
                  if (kytarioFetchDetails) setKytarioFetchDetails(null);
                }}
                onSubmit={handleKytarioUrlSubmit}
                onBlurNormalize={() => {
                  const cleaned = cleanKytarioUrl(kytarioUrl);
                  if (cleaned && cleaned !== kytarioUrl) setKytarioUrl(cleaned);
                }}
                isProcessing={isLoadingJson}
                fetchDetails={kytarioFetchDetails}
                showProxyConfig={showProxyConfig}
                onToggleProxyConfig={() => setShowProxyConfig((p) => !p)}
                proxyInput={customProxyInput}
                onProxyInputChange={setCustomProxyInput}
                onSaveProxyAndRetry={() => {
                  setStoredProxyUrl(customProxyInput);
                  showToast('Proxy URL saved! Retrying import...', 'info');
                  handleKytarioUrlSubmit();
                }}
                onClearProxy={() => {
                  setStoredProxyUrl('');
                  setCustomProxyInput('');
                  showToast('Custom proxy cleared', 'info');
                }}
                onSwitchToPasteTab={() => {
                  setActiveTab('paste');
                  setKytarioFetchDetails(null);
                }}
              />
            )}

            {activeTab === 'paste' && (
              <PasteImportPanel
                value={pastedJson}
                onChange={setPastedJson}
                onSubmit={handlePasteSubmit}
                isProcessing={isLoadingJson}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  const songCount = (songbookData.songs || songbookData.items || []).length;
  const songbookTitle = songbookData.title || songbookData.name || 'Songbook';

  return (
    <div className="flex h-screen h-[100dvh] min-h-[100dvh] bg-zinc-50 text-zinc-900 overflow-hidden font-sans relative print:h-auto print:min-h-0 print:overflow-visible print:block print:bg-white print:text-black print:p-0 print:m-0">
      {/* Keyboard users can jump straight to the songbook preview, skipping the sidebar controls */}
      <a
        href="#main-preview"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-white focus:text-zinc-900 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-semibold print:hidden"
      >
        Skip to songbook preview
      </a>

      {/* Full-screen Loading Spinner Overlay while parsing or loading a new songbook */}
      <ProgressBar
        active={isLoadingJson}
        statusText={loadingStatus.title}
        subText={loadingStatus.subtitle}
        progress={loadingStatus.progress}
        variant="overlay"
      />

      {/* Sidebar Component (handles desktop docked + mobile drawer modal) */}
      <Sidebar
        settings={settings}
        draftSettings={draftSettings}
        onDraftSettingsChange={setDraftSettings}
        onDiscardSettings={handleDiscardDraftSettings}
        hasUnappliedChanges={hasUnappliedSettings}
        changes={unappliedChanges}
        onApplySettings={handleApplySettings}
        onSaveSettings={handleSaveSettings}
        onResetToDefaults={handleResetToDefaults}
        onResetSongbook={handleOpenResetModal}
        onFileUpload={handleFileUpload}
        onDownloadPdf={handleSidebarDownloadPdf}
        isDownloadingPdf={isDownloadingPdf || isGeneratingWorkerPdf}
        isPdfReady={isPdfReady}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={handleCloseMobileSidebar}
        isCollapsed={isDesktopSidebarCollapsed}
        onToggleCollapse={setIsDesktopSidebarCollapsed}
        isUpdatingLayout={isUpdatingLayout}
        isLoadingJson={isLoadingJson}
      />

      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden print:h-auto print:min-h-0 print:overflow-visible print:block print:p-0 print:m-0">
        {/* Confirmation Dialog for Changing Songbook */}
        <ResetSongbookDialog
          isOpen={isConfirmResetOpen}
          onCancel={handleCloseResetModal}
          onConfirm={() => {
            handleCloseResetModal();
            resetSongbook();
          }}
        />

        {recoveryNotice && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2 text-xs font-medium text-amber-800 flex items-center justify-between print:hidden shrink-0">
            <span className="truncate mr-2">{recoveryNotice}</span>
            <button
              onClick={() => setRecoveryNotice(null)}
              className="text-amber-600 hover:text-amber-900 text-xs font-bold p-1"
            >
              ✕
            </button>
          </div>
        )}

        {warningMessage && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2 text-xs font-medium text-amber-800 flex items-center justify-between print:hidden shrink-0">
            <span className="truncate mr-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              {warningMessage}
            </span>
            <button
              onClick={() => setWarningMessage(null)}
              className="text-amber-600 hover:text-amber-900 text-xs font-bold p-1"
            >
              ✕
            </button>
          </div>
        )}

        <main id="main-preview" tabIndex={-1} className="flex flex-col min-h-0">
          <Suspense fallback={<PreviewChunkFallback settings={settings} />}>
            <SongbookPreview
            data={previewData}
            settings={settings}
            isUpdatingLayout={isUpdatingLayout || selectedSongIds !== deferredSelectedSongIds}
            onDownloadStatusChange={setIsDownloadingPdf}
            onOpenSettings={handleOpenSettings}
            zoomMode={zoomMode}
            setZoomMode={setZoomMode}
            customZoom={customZoom}
            setCustomZoom={setCustomZoom}
            onScaleChange={setActiveScale}
            isSongNavOpen={isSongNavOpen}
            setIsSongNavOpen={setIsSongNavOpen}
            onOpenManageSongs={() => setIsSongSelectionOpen(true)}
          />
        </Suspense>

        {/* Project Selection Modal for Multi-Project ZIP Archives */}
        <ZipProjectSelectModal
          isOpen={pendingZipResult !== null}
          fileName={pendingZipResult?.fileName || ''}
          projects={pendingZipResult?.result.projects || []}
          totalSongs={pendingZipResult?.result.totalSongs || 0}
          onSelectProject={(slug, onlyPublic) => handleSelectZipProject(slug, onlyPublic)}
          onCancel={() => {
            setPendingZipResult(null);
            setIsLoadingJson(false);
          }}
        />

        {isSongSelectionOpen && (
          <Suspense fallback={null}>
            <SongSelectionModal
              isOpen={isSongSelectionOpen}
              songs={songbookData?.songs || []}
              selectedSongIds={selectedSongIds}
              onApply={(newSelectedIds) => {
                updateSelectedSongIds(newSelectedIds);
                showToast(`Updating preview with ${newSelectedIds.size} visible songs...`, 'info');
                setIsSongSelectionOpen(false);
              }}
              onCancel={() => setIsSongSelectionOpen(false)}
            />
          </Suspense>
        )}

        {/* Background Web Worker PDF Generation Status Modal */}
        <Suspense fallback={null}>
          <BackgroundPdfProgressModal
            isGenerating={isGeneratingWorkerPdf}
            progress={workerPdfProgress}
            error={workerPdfError}
            lastGenerated={workerPdfLastGenerated}
            isPdfReady={isPdfReady}
            onDownloadAgain={() => handleDownloadPdf(false)}
            onRegenerate={() => handleDownloadPdf(true)}
            onCancel={cancelWorkerPdf}
            onClearError={clearWorkerPdfError}
            onClearLastGenerated={clearWorkerPdfLastGenerated}
          />
        </Suspense>
        </main>

        {/* Floating Bottom Menu - Unified Toolbar in Exact Requested Order */}
        <div
          className="fixed left-1/2 -translate-x-1/2 z-40 w-full max-w-[calc(100vw-1rem)] flex items-center justify-center print:hidden select-none pointer-events-none px-2"
          style={{ bottom: 'max(0.75rem, calc(0.5rem + env(safe-area-inset-bottom, 0px)))' }}
        >
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-zinc-200/80 shadow-2xl rounded-2xl p-1.5 flex flex-wrap items-center justify-center gap-1 shrink-0">
            {/* 1. Zoom Out (-) */}
            <button
              onClick={handleZoomOut}
              disabled={customZoom <= 0.25}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-zinc-100 active:bg-zinc-200 text-zinc-700 hover:text-zinc-950 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer shrink-0"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* 2. Reset Zoom */}
            <button
              onClick={handleResetZoom}
              className="flex flex-col items-center justify-center px-1.5 sm:px-2 min-w-[2.75rem] sm:min-w-[3.25rem] h-9 sm:h-10 rounded-xl hover:bg-zinc-100 active:bg-zinc-200 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer shrink-0"
              title="Reset Zoom to 100%"
            >
              <span className="text-xs font-mono font-bold tracking-tight leading-tight">
                {Math.round(activeScale * 100)}%
              </span>
              <span className="text-[8px] font-bold text-zinc-400 flex items-center gap-0.5 leading-none mt-0.5">
                <RotateCcw className="w-2.5 h-2.5" />
                reset
              </span>
            </button>

            {/* 3. Fit View */}
            <button
              onClick={() =>
                setZoomMode((prev) => (prev === 'fit-width' ? 'fit-page' : 'fit-width'))
              }
              className={`flex flex-col items-center justify-center w-9 sm:w-10 h-9 sm:h-10 rounded-xl transition-colors cursor-pointer shrink-0 ${
                zoomMode === 'fit-width' || zoomMode === 'fit-page'
                  ? 'text-zinc-950 font-bold bg-zinc-200'
                  : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 active:bg-zinc-200'
              }`}
              title={zoomMode === 'fit-width' ? 'Switch to Fit Page' : 'Switch to Fit Width'}
            >
              <Maximize2 className="w-4 h-4" />
              <span className="text-[9px] sm:text-[10px] font-bold mt-0.5 tracking-tight">Fit</span>
            </button>

            {/* 4. Zoom In (+) */}
            <button
              onClick={handleZoomIn}
              disabled={customZoom >= 3.0}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-zinc-100 active:bg-zinc-200 text-zinc-700 hover:text-zinc-950 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer shrink-0"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-zinc-200/80 mx-1 shrink-0" />

            {/* 5. Import Songbook */}
            <button
              onClick={() => setIsConfirmResetOpen(true)}
              className="flex flex-col items-center justify-center px-2.5 sm:px-3 h-9 sm:h-10 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 active:bg-zinc-200 transition-colors cursor-pointer shrink-0"
              title="Import Songbook (load different JSON)"
            >
              <FolderOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="text-[9px] sm:text-[10px] font-bold mt-0.5 tracking-tight">
                Import
              </span>
            </button>

            {/* 6. Settings */}
            <button
              id="floating-settings-btn"
              onClick={handleOpenMobileSidebar}
              className="flex flex-col items-center justify-center px-2.5 sm:px-3 h-9 sm:h-10 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 active:bg-zinc-200 transition-colors relative cursor-pointer shrink-0"
              title={
                hasUnappliedSettings
                  ? `Settings (${unappliedChanges.length} unapplied changes pending)`
                  : 'Open Settings'
              }
            >
              <SlidersHorizontal className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="text-[9px] sm:text-[10px] font-bold mt-0.5 tracking-tight">
                Settings
              </span>
              {hasUnappliedSettings && (
                <span className="absolute top-0.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
              )}
            </button>

            {/* 7. ToC (Table of Contents) */}
            <button
              id="floating-nav-btn"
              onClick={() => setIsSongNavOpen((prev) => !prev)}
              className={`flex flex-col items-center justify-center px-2.5 sm:px-3 h-9 sm:h-10 rounded-xl transition-colors cursor-pointer shrink-0 ${
                isSongNavOpen
                  ? 'text-zinc-950 font-bold bg-zinc-200'
                  : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 active:bg-zinc-200'
              }`}
              title="Table of Contents & Jump to Song"
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-[9px] sm:text-[10px] font-bold mt-0.5 tracking-tight">ToC</span>
            </button>

            {/* 8. Songs (Manage Songs Visibility) */}
            <button
              id="floating-manage-songs-btn"
              onClick={() => setIsSongSelectionOpen(true)}
              className="flex flex-col items-center justify-center px-2.5 sm:px-3 h-9 sm:h-10 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 active:bg-zinc-200 transition-colors relative cursor-pointer shrink-0"
              title={`Manage songs (${selectedSongIds.size} of ${songCount} visible)`}
            >
              <div className="relative">
                <ListFilter className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                {selectedSongIds.size < songCount && (
                  <span className="absolute -top-1 -right-2 text-[8px] font-bold bg-amber-500 text-white px-1 rounded-full leading-none py-0.5">
                    {selectedSongIds.size}
                  </span>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold mt-0.5 tracking-tight">
                Songs
              </span>
            </button>

            {/* 9. Export PDF */}
            <button
              onClick={() => handleDownloadPdf()}
              disabled={isDownloadingPdf || isGeneratingWorkerPdf}
              className={`flex flex-col items-center justify-center px-2.5 sm:px-3.5 h-9 sm:h-10 rounded-xl transition-all cursor-pointer shrink-0 relative ${
                isPdfReady
                  ? 'text-emerald-800 font-bold bg-emerald-100 hover:bg-emerald-200'
                  : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 active:bg-zinc-200'
              }`}
              title={
                isPdfReady
                  ? 'PDF is ready! Click to download again instantly'
                  : 'Export and download as PDF'
              }
            >
              {isDownloadingPdf || isGeneratingWorkerPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="relative">
                  <FileDown className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  {isPdfReady && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                  )}
                </div>
              )}
              <span className="text-[9px] sm:text-[10px] font-bold mt-0.5 tracking-tight whitespace-nowrap">
                {isPdfReady ? 'Save PDF' : 'Export PDF'}
              </span>
            </button>
          </div>
        </div>

        {/* Offline Indicator */}
        <OfflineIndicator />

        {/* Unified Top-Right Notification Toast Container (persistent live region so screen readers announce every toast) */}
        <div className="fixed top-4 right-4 z-[100] print:hidden" role="status" aria-live="polite">
          {toast && (
            <div className="animate-in fade-in slide-in-from-top-3 duration-300">
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs sm:text-sm font-medium ${
                  toast.type === 'error'
                    ? 'bg-red-950 text-white border-red-800/60'
                    : 'bg-zinc-950 text-white border-white/15'
                }`}
              >
                {toast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                )}
                <span>{toast.message}</span>
                <button
                  onClick={() => setToast(null)}
                  className="ml-2 text-zinc-300 hover:text-white transition-colors p-1 cursor-pointer"
                  aria-label="Dismiss notification"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Auto-save Brief Notification */}
        {showAutoSaveIndicator && (
          <div
            className="fixed top-4 right-4 z-[99] print:hidden animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-none select-none"
            role="status"
          >
            <div className="bg-zinc-950/95 text-white border border-zinc-700/50 rounded-full py-2 px-4 shadow-2xl flex items-center gap-2.5 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Changes auto-saved</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
