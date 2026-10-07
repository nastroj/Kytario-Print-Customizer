import React, { useState, useEffect, useDeferredValue, useRef, useCallback, useMemo, startTransition } from 'react';
import { Sidebar } from './components/Sidebar';
import { SongbookPreview } from './components/SongbookPreview';
import { ProgressBar } from './components/ProgressBar';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { KytarioLogo } from './components/KytarioLogo';
import { getChangedSettingsList } from './components/UnappliedSettingsBanner';
import { SongbookData, PrintSettings, ZoomMode } from './types';
import { FileJson, Upload, Clipboard, CheckCircle2, Music, FileText, AlertCircle, SlidersHorizontal, FolderOpen, FileDown, Loader2, Globe, ExternalLink, AlertTriangle, Minus, Plus, RotateCcw, Maximize2, BookOpen } from 'lucide-react';
import { safeParseSongbookJson, normalizeSongbookData } from './utils';
import { fetchSongbookFromKytario, cleanKytarioUrl, KytarioErrorDetails } from './utils/api';
import { APP_CONFIG } from './config';
import { useBackgroundPdfGenerator } from './hooks/useBackgroundPdfGenerator';
import { BackgroundPdfProgressModal } from './components/BackgroundPdfProgressModal';

const defaultSettings: PrintSettings = {
  pageFormat: 'A4',
  orientation: 'landscape',
  pageMargin: 5,
  pageMarginTopBottom: 6,
  pageMarginLeftRight: 5,
  pageMarginTop: 6,
  pageMarginBottom: 6,
  pageMarginLeft: 5,
  pageMarginRight: 5,
  pageMarginInner: 15,
  pageMarginOuter: 5,
  bookMode: false,
  pageNumberPosition: 'right',
  columns: 2,
  titleColor: '#1c1917', // zinc-900
  artistColor: '#57534e', // zinc-500
  lyricsColor: '#27272a', // zinc-800
  chordsColor: '#2563eb', // blue-600
  markerColor: '#27272a', // zinc-800
  tocColor: '#1c1917', // zinc-900
  tocArtistColor: '#57534e', // zinc-500 (matches artistColor)
  tocPageColor: '#71717a', // zinc-500 (matches colSubtle)
  sectionLineColor: '#a1a1aa', // zinc-400 (matches Kytario gray)
  refrainLineColor: '#2563eb', // blue-600 (matches Kytario blue)
  separatorLineColor: '#e4e4e7', // zinc-200
  sectionSeparatorColor: '#e4e4e7', // zinc-200
  showSectionLines: true,
  titleFontSize: 16,
  artistFontSize: 16,
  lyricsFontSize: 12,
  chordsFontSize: 12,
  tocFontSize: 12,
  titleItalic: false,
  artistItalic: false,
  lyricsItalic: false,
  chordsItalic: true,
  tocItalic: false,
  showChords: true,
  smartFit: true,
  smartSectionFilling: true,
  maxLineHeight: 1.6,
  sectionMarginCap: 28,
  lineHeight: 1.3,
  maxFontSizePx: 16,
  indexSortOrder: 'alphabetical',
  tocAlphabeticalGrouping: true,
  tocGroupDividers: true,
  showToc: true,
  showIndex: true,
  fontFamily: 'Inter',
  showFrontCover: true,
  showTableOfContents: true,
  frontCoverType: 'auto',
  frontCoverShowQr: true,
  frontCoverShowFooter: false,
  frontCoverFooterText: '',
  frontCoverDedication: '',
  frontCoverShowDedication: true,
  showBackCover: true,
  backCoverType: 'auto',
  backCoverShowQr: true,
  backCoverShowFooter: false,
  backCoverFooterText: '',
  backCoverDedication: '',
  backCoverShowDedication: true,
};

export default function App() {
  const [songbookData, setSongbookData] = useState<SongbookData | null>(() => {
    try {
      const saved = localStorage.getItem('kytario-cached-songbook');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.songs || parsed.items || parsed.sections)) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    try {
      if (songbookData) {
        localStorage.setItem('kytario-cached-songbook', JSON.stringify(songbookData));
      } else {
        localStorage.removeItem('kytario-cached-songbook');
      }
    } catch (e) {}
  }, [songbookData]);
  const [pastedJson, setPastedJson] = useState('');
  const [kytarioUrl, setKytarioUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'url'>('url');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [kytarioFetchDetails, setKytarioFetchDetails] = useState<KytarioErrorDetails | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSongNavOpen, setIsSongNavOpen] = useState(false);
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up any stale legacy auto-save localStorage items
  useEffect(() => {
    try {
      localStorage.removeItem('kytario-saved-songbook');
      localStorage.removeItem('kytario-last-saved-time');
      localStorage.removeItem('kytario-draft-settings');
    } catch (e) {}
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);
  const [loadingStatus, setLoadingStatus] = useState<{ title: string; subtitle?: string; progress?: number }>({
    title: 'Loading songbook...',
    subtitle: 'Processing songs and Table of Contents...',
  });

  const getInitialSettings = () => {
    const key = 'kytario-print-settings-v2';
    let saved = localStorage.getItem(key);
    const baseDefaults = defaultSettings;
    
    if (saved) {
      try {
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
      } catch (e) {}
    }
    return baseDefaults;
  };

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
    const key = 'kytario-print-settings-v2';
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
    const key = 'kytario-print-settings-v2';
    try {
      localStorage.removeItem(key);
    } catch (e) {}

    setSettings(defaultSettings);
    setDraftSettings(defaultSettings);
    showToast('Settings reset to defaults', 'info');
  }, [showToast]);


  const updateTimersRef = useRef<{ applyTimer?: ReturnType<typeof setTimeout>; finishTimer?: ReturnType<typeof setTimeout> }>({});

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
  const computeFingerprint = useCallback((data: SongbookData | null, appliedSettings: PrintSettings): string => {
    if (!data) return '';
    return JSON.stringify({
      title: data.title,
      songCount: data.songs?.length,
      songIds: data.songs?.map((s) => s.id || s.title),
      appliedSettings,
    });
  }, []);

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
    workerCachedPdf.fingerprint === currentFingerprint
  );

  // Background Web Worker PDF Download (or instant cached re-download)
  const handleDownloadPdf = useCallback(async (forceRegenerate: boolean = false) => {
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
  }, [
    songbookData,
    settings,
    isPdfReady,
    downloadWorkerCachedPdf,
    workerCachedPdf,
    generateWorkerPdf,
    currentFingerprint,
    showToast,
  ]);

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
        const isInsideSongNav = target.closest('#song-nav-modal') || target.closest('#floating-nav-btn');
        if (!isInsideSongNav) {
          setIsSongNavOpen(false);
        }
      }

      // Close Mobile Settings sidebar if click was outside the sidebar container and its toggle button
      if (isMobileSidebarOpen) {
        const isInsideMobileSidebar = target.closest('#mobile-settings-sidebar') || target.closest('#floating-settings-btn');
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
      const key = 'kytario-print-settings-v2';
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
        showToast("Settings successfully applied!");
      }, 650);
    }, 120);
  };

  const animateSongbookLoad = useCallback((
    data: SongbookData,
    options: {
      startProgress?: number;
      isRepaired?: boolean;
      recoveredCount?: number;
      sourceType: 'file' | 'url' | 'paste';
      sourceLabel?: string;
    }
  ) => {
    const songs = data.songs || data.items || [];
    if (songs.length === 0) {
      setIsLoadingJson(false);
      setErrorMessage(
        options.sourceType === 'url'
          ? 'No songs found in the Kytario response. The songbook might be private or the URL might be incorrect.'
          : 'No songs found in the provided JSON.'
      );
      return;
    }

    // Explicitly verify the presence and format of the urlToken field
    const candidateToken = data.urlToken || data.slug || data.shortUrl;
    if (!candidateToken || !String(candidateToken).trim()) {
      setWarningMessage('Warning: The "urlToken" field is missing or empty. Generated covers or QR codes might be incomplete.');
    } else if (!/^[a-zA-Z0-9_\-\./]+$/.test(String(candidateToken).trim())) {
      setWarningMessage('Warning: The "urlToken" field format appears invalid (contains unsupported characters). Generated covers or QR codes might be incomplete.');
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
            setDraftSettings(prev => ({
              ...prev,
              frontCoverTitle: undefined,
              backCoverTitle: undefined,
            }));
            setSettings(prev => ({
              ...prev,
              frontCoverTitle: undefined,
              backCoverTitle: undefined,
            }));
          }
          if (options.isRepaired) {
            setRecoveryNotice(`Successfully parsed and recovered ${options.recoveredCount} songs from formatted/truncated JSON data.`);
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
                const songsWithContent = songs.filter(s => s.content && s.content.trim().length > 0).length;
                const bookTitle = data.title || options.sourceLabel || 'Songbook';

                if (options.sourceType === 'url') {
                  if (songsWithContent === 0 && songCount > 0) {
                    showToast(`Imported ${songCount} titles, but lyrics were not found. Try a different URL?`, 'info');
                  } else {
                    showToast(`Successfully imported "${bookTitle}" from Kytario (${songsWithContent}/${songCount} songs with lyrics)!`);
                  }
                } else {
                  showToast(`Successfully loaded "${bookTitle}" (${songCount} song${songCount === 1 ? '' : 's'})!`);
                }
              }, 800);
            }, 100);
          });
        }, 80);
      }
    };

    requestAnimationFrame(() => setTimeout(stepProgress, 40));
  }, [showToast]);

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
          err.message || 'Could not parse JSON. Please check that it is valid Kytario songbook data.'
        );
      }
    }, 100);
  };


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingJson(true);
    setLoadingStatus({
      title: 'Reading file...',
      subtitle: file.name,
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processJsonString(content, file.name);
    };
    reader.onerror = () => {
      setIsLoadingJson(false);
      setErrorMessage('Failed to read file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setIsLoadingJson(true);
    setLoadingStatus({
      title: 'Reading file...',
      subtitle: file.name,
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processJsonString(content, file.name);
    };
    reader.onerror = () => {
      setIsLoadingJson(false);
      setErrorMessage('Failed to read file.');
    };
    reader.readAsText(file);
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

  const handleKytarioUrlSubmit = async () => {
    const cleanUrl = cleanKytarioUrl(kytarioUrl);
    if (!cleanUrl) {
      setErrorMessage('Please enter a Kytario URL first.');
      setKytarioFetchDetails(null);
      return;
    }

    if (cleanUrl !== kytarioUrl) {
      setKytarioUrl(cleanUrl);
    }
    
    setErrorMessage(null);
    setKytarioFetchDetails(null);
    setRecoveryNotice(null);
    setWarningMessage(null);
    setIsLoadingJson(true);

    // Initial Stage 1: Connecting
    setLoadingStatus({
      title: 'Connecting to Kytario...',
      subtitle: cleanUrl,
      progress: 8,
    });

    // Progressive Ticker during asynchronous fetching (8% -> 34%)
    let currentFetchProgress = 8;
    const fetchProgressInterval = setInterval(() => {
      currentFetchProgress = Math.min(34, currentFetchProgress + 3);
      let stageTitle = 'Connecting to Kytario...';
      let stageSubtitle = cleanUrl;

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
      const rawData = await fetchSongbookFromKytario(cleanUrl);
      clearInterval(fetchProgressInterval);

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
      localStorage.removeItem('kytario-cached-songbook');
    } catch (e) {}
    showToast('Songbook reset', 'info');
  };

  if (!songbookData) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-3 sm:p-6 relative">
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
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Kytario Print Customizer</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                v{APP_CONFIG.APP_VERSION}
              </span>
            </div>
            <p className="text-zinc-500 text-xs sm:text-sm max-w-sm mx-auto">
              Transform your Kytario songbook into print-ready PDF pages with automatic Table of Contents and clean formatting.
            </p>
            <div className="pt-1 flex justify-center">
              <PWAInstallButton variant="primary" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-black/5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => { setActiveTab('url'); setErrorMessage(null); setKytarioFetchDetails(null); }}
              className={`flex-1 min-w-[80px] py-2.5 text-[11px] sm:text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'url'
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Kytario URL
            </button>
            <button
              onClick={() => { setActiveTab('paste'); setErrorMessage(null); setKytarioFetchDetails(null); }}
              className={`flex-1 min-w-[80px] py-2.5 text-[11px] sm:text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'paste'
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Clipboard className="w-3.5 h-3.5" />
              Paste JSON
            </button>
            <button
              onClick={() => { setActiveTab('upload'); setErrorMessage(null); setKytarioFetchDetails(null); }}
              className={`flex-1 min-w-[80px] py-2.5 text-[11px] sm:text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'upload'
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              JSON File
            </button>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative overflow-hidden border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-300 ${
                isDragging ? 'border-zinc-800 bg-zinc-100/50 scale-[1.02] shadow-sm' : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/30'
              }`}
            >
              {/* Decorative background pattern */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full" width="100%" height="100%">
                  <pattern id="pattern-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.5" className="fill-zinc-900" />
                  </pattern>
                  <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-dots)" />
                </svg>
              </div>
              
              {/* Floating decorative elements */}
              <div className={`absolute top-6 left-8 text-zinc-400/20 transition-transform duration-500 ${isDragging ? 'scale-110 -translate-y-2 -rotate-12' : 'scale-100 rotate-0'}`}>
                <Music className="w-12 h-12" />
              </div>
              <div className={`absolute bottom-8 right-8 text-zinc-400/20 transition-transform duration-500 ${isDragging ? 'scale-110 translate-y-2 rotate-12' : 'scale-100 rotate-0'}`}>
                <FileJson className="w-16 h-16" />
              </div>
              <div className={`absolute top-1/2 right-12 text-zinc-400/10 transition-transform duration-500 ${isDragging ? 'scale-125 -translate-y-4 translate-x-2 rotate-45' : 'scale-100 rotate-12'}`}>
                <FileText className="w-10 h-10" />
              </div>
              <div className={`absolute bottom-12 left-12 text-zinc-400/10 transition-transform duration-500 ${isDragging ? 'scale-125 translate-y-4 -translate-x-2 -rotate-45' : 'scale-100 -rotate-12'}`}>
                <Music className="w-8 h-8" />
              </div>

              <div className="relative z-10 flex flex-col items-center justify-center">
                <div className={`w-16 h-16 bg-white rounded-full shadow-sm border border-zinc-100 flex items-center justify-center mb-4 transition-transform duration-300 ${isDragging ? 'scale-110 shadow-md' : 'scale-100'}`}>
                  <Upload className={`w-7 h-7 transition-colors duration-300 ${isDragging ? 'text-zinc-900' : 'text-zinc-400'}`} />
                </div>
                <p className={`text-base sm:text-lg font-semibold transition-colors duration-300 mb-1 ${isDragging ? 'text-zinc-900' : 'text-zinc-700'}`}>
                  Drag and drop your Kytario .json file here
                </p>
                <p className="text-[12px] sm:text-sm text-zinc-500 mb-6 font-medium">Supports standard and large songbook exports</p>
                
                <label className={`inline-flex items-center gap-2 text-white text-xs sm:text-sm font-bold px-5 sm:px-6 py-2.5 rounded-full transition-all shadow-sm active:scale-95 ${
                  isLoadingJson
                    ? 'bg-zinc-800 pointer-events-none'
                    : 'bg-zinc-900 hover:bg-zinc-800 hover:shadow-md cursor-pointer'
                }`}>
                  {isLoadingJson ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>{isLoadingJson ? 'Reading & Processing...' : 'Browse File'}</span>
                  <input
                    type="file"
                    accept=".json,application/json,text/plain"
                    disabled={isLoadingJson}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider ml-1">Kytario Songbook Link or Code</label>
                <input
                  type="text"
                  value={kytarioUrl}
                  onChange={(e) => {
                    setKytarioUrl(e.target.value);
                    if (kytarioFetchDetails) setKytarioFetchDetails(null);
                  }}
                  onBlur={() => {
                    const cleaned = cleanKytarioUrl(kytarioUrl);
                    if (cleaned && cleaned !== kytarioUrl) {
                      setKytarioUrl(cleaned);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoadingJson) {
                      e.preventDefault();
                      handleKytarioUrlSubmit();
                    }
                  }}
                  placeholder="https://kytario.com/... or songbook code"
                  disabled={isLoadingJson}
                  className="w-full rounded-lg border border-black/10 p-3 text-sm focus:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800 bg-zinc-50 disabled:opacity-60"
                />
              </div>
              <button
                onClick={handleKytarioUrlSubmit}
                disabled={isLoadingJson}
                className={`w-full text-white text-xs sm:text-sm font-bold py-2.5 sm:py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm ${
                  isLoadingJson
                    ? 'bg-zinc-800 pointer-events-none'
                    : 'bg-zinc-900 hover:bg-zinc-800 cursor-pointer'
                }`}
              >
                {isLoadingJson ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                <span>{isLoadingJson ? 'Fetching Data...' : 'Import from Kytario'}</span>
              </button>

              {kytarioFetchDetails && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 text-left">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-900">
                        GitHub Pages Static Hosting Notice
                      </h4>
                      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                        Automatic import tried public CORS relays but could not fetch this songbook. If relays are unavailable, configure the optional Cloudflare Worker proxy or use the manual JSON steps below.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-amber-200/70 space-y-2">
                    <div className="text-xs font-bold text-zinc-900">
                      ⚡ Quick 2-Step Import:
                    </div>
                    <ol className="text-xs text-zinc-600 list-decimal list-inside space-y-1.5 leading-relaxed">
                      <li>
                        Click below to open the songbook JSON data directly in your browser:
                        <div className="mt-1">
                          <a
                            href={kytarioFetchDetails.apiUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 font-mono text-[11px] font-semibold hover:bg-blue-100 transition-colors"
                          >
                            <span>Open {kytarioFetchDetails.token} JSON Data</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </li>
                      <li>
                        Press <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded font-mono text-[10px] font-semibold">Ctrl+A</kbd> then <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded font-mono text-[10px] font-semibold">Ctrl+C</kbd> to copy all text.
                      </li>
                      <li>
                        Switch to the{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('paste');
                            setKytarioFetchDetails(null);
                          }}
                          className="text-blue-600 font-bold underline cursor-pointer"
                        >
                          Paste JSON tab
                        </button>{' '}
                        and press <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded font-mono text-[10px] font-semibold">Ctrl+V</kbd>.
                      </li>
                    </ol>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <a
                      href={kytarioFetchDetails.apiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-[130px] px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors text-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>1. Open JSON Tab</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('paste');
                        setKytarioFetchDetails(null);
                      }}
                      className="flex-1 min-w-[130px] px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>2. Go to Paste Tab</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-4">
              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder="Paste your Kytario songbook JSON payload here..."
                rows={7}
                disabled={isLoadingJson}
                className="w-full rounded-lg border border-black/10 p-3 text-xs font-mono focus:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800 resize-none bg-zinc-50 disabled:opacity-60"
              />
              <button
                onClick={handlePasteSubmit}
                disabled={isLoadingJson}
                className={`w-full text-white text-xs sm:text-sm font-bold py-2.5 sm:py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm ${
                  isLoadingJson
                    ? 'bg-zinc-800 pointer-events-none'
                    : 'bg-zinc-900 hover:bg-zinc-800 cursor-pointer'
                }`}
              >
                {isLoadingJson ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{isLoadingJson ? 'Processing Songbook...' : 'Load Pasted Songbook'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const songCount = (songbookData.songs || songbookData.items || []).length;
  const songbookTitle = songbookData.title || songbookData.name || 'Songbook';

  return (
    <div className="flex h-screen h-[100dvh] min-h-[100dvh] bg-zinc-50 text-zinc-900 overflow-hidden font-sans relative print:h-auto print:min-h-0 print:overflow-visible print:block print:bg-white print:text-black print:p-0 print:m-0">
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
        {isConfirmResetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setIsConfirmResetOpen(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-black/10 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 z-10">
              <h3 className="text-base font-bold text-zinc-900">Change Songbook?</h3>
              <p className="text-xs sm:text-sm text-zinc-600">
                Are you sure you want to change the songbook? Any unsaved layout adjustments or current songbook data will be cleared and you will return to the upload screen.
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmResetOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmResetOpen(false);
                    resetSongbook();
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#b40b24] hover:bg-[#9b091f] active:bg-[#82071a] transition-colors cursor-pointer shadow-sm"
                >
                  Yes, Change Songbook
                </button>
              </div>
            </div>
          </div>
        )}

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

        <SongbookPreview 
          data={songbookData} 
          settings={settings}
          isUpdatingLayout={isUpdatingLayout}
          onDownloadStatusChange={setIsDownloadingPdf}
          onOpenSettings={handleOpenSettings}
          zoomMode={zoomMode}
          setZoomMode={setZoomMode}
          customZoom={customZoom}
          setCustomZoom={setCustomZoom}
          onScaleChange={setActiveScale}
          isSongNavOpen={isSongNavOpen}
          setIsSongNavOpen={setIsSongNavOpen}
        />

        {/* Background Web Worker PDF Generation Status Modal */}
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

        {/* Floating Bottom Menu - Separated Zoom & Main Action Pods */}
        <div 
          className="fixed left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1.5rem)] flex flex-wrap items-center justify-center gap-2 sm:gap-3 print:hidden select-none pointer-events-none"
          style={{ bottom: 'max(0.75rem, calc(0.5rem + env(safe-area-inset-bottom, 0px)))' }}
        >
          {/* 1. Zoom Controls Pod */}
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-zinc-200/80 shadow-xl rounded-2xl h-14 sm:h-16 px-2.5 sm:px-3 flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Zoom Out */}
            <button
              onClick={handleZoomOut}
              disabled={customZoom <= 0.25}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 active:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer shrink-0"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Reset Zoom & Dynamic Mode Display */}
            <button
              onClick={handleResetZoom}
              className="flex flex-col items-center justify-center px-1.5 sm:px-2 min-w-[2.75rem] sm:min-w-[3.25rem] h-9 sm:h-10 rounded-lg hover:bg-zinc-100 active:bg-zinc-200 text-zinc-700 hover:text-zinc-900 transition-colors cursor-pointer shrink-0"
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

            {/* Zoom In */}
            <button
              onClick={handleZoomIn}
              disabled={customZoom >= 3.0}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 active:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer shrink-0"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Divider inside Zoom Pod */}
            <div className="w-px h-6 sm:h-7 bg-zinc-200/80 mx-0.5 shrink-0" />

            {/* Fit View (Toggles between fit-width and fit-page) */}
            <button
              onClick={() => setZoomMode((prev) => prev === 'fit-width' ? 'fit-page' : 'fit-width')}
              className={`flex flex-col items-center justify-center w-10 sm:w-11 h-10 sm:h-11 rounded-xl transition-colors cursor-pointer shrink-0 ${
                zoomMode === 'fit-width' || zoomMode === 'fit-page'
                  ? 'text-blue-600 font-bold bg-blue-500/10'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/60 active:bg-zinc-100'
              }`}
              title={zoomMode === 'fit-width' ? "Switch to Fit Page" : "Switch to Fit Width"}
            >
              <Maximize2 className="w-4 h-4" />
              <span className="text-[9px] sm:text-[10px] font-bold mt-0.5 tracking-tight">Fit</span>
            </button>
          </div>

          {/* 2. Main Actions Pod (Wider, Spacious, Primary) */}
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-zinc-200/80 shadow-xl rounded-2xl h-14 sm:h-16 px-3 sm:px-5 md:px-6 flex items-center justify-center gap-2 sm:gap-4 md:gap-5 shrink-0">
            {/* Import Songbook */}
            <button
              onClick={() => setIsConfirmResetOpen(true)}
              className="flex flex-col items-center justify-center w-12 sm:w-14 md:w-16 h-11 sm:h-12 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/60 active:bg-zinc-100 transition-colors cursor-pointer shrink-0"
              title="Import Songbook (load different JSON)"
            >
              <FolderOpen className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              <span className="text-[10px] sm:text-[11px] font-bold mt-1 tracking-tight">Import</span>
            </button>

            {/* Divider */}
            <div className="w-px h-6 sm:h-7 bg-zinc-200/80 shrink-0" />

            {/* Settings button */}
            <button
              id="floating-settings-btn"
              onClick={handleOpenMobileSidebar}
              className="flex flex-col items-center justify-center w-12 sm:w-14 md:w-16 h-11 sm:h-12 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/60 active:bg-zinc-100 transition-colors relative cursor-pointer shrink-0"
              title={hasUnappliedSettings ? `Settings (${unappliedChanges.length} unapplied changes pending)` : "Open Settings"}
            >
              <SlidersHorizontal className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              <span className="text-[10px] sm:text-[11px] font-bold mt-1 tracking-tight">Settings</span>
              {hasUnappliedSettings && (
                <span className="absolute top-1 right-2 sm:top-1.5 sm:right-3 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
              )}
            </button>

            {/* Divider */}
            <div className="w-px h-6 sm:h-7 bg-zinc-200/80 shrink-0" />

            {/* Download/Export PDF */}
            <button
              onClick={() => handleDownloadPdf()}
              disabled={isDownloadingPdf || isGeneratingWorkerPdf}
              className={`flex flex-col items-center justify-center px-2.5 sm:px-3.5 min-w-[4rem] sm:min-w-[4.75rem] md:min-w-[5.25rem] h-11 sm:h-12 rounded-xl transition-all cursor-pointer shrink-0 relative ${
                isPdfReady
                  ? 'text-emerald-600 hover:text-emerald-700 font-bold bg-emerald-500/10 hover:bg-emerald-500/15'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/60 active:bg-zinc-100'
              }`}
              title={isPdfReady ? "PDF is ready! Click to download again instantly" : "Export and download as PDF"}
            >
              {isDownloadingPdf || isGeneratingWorkerPdf ? (
                <Loader2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <div className="relative">
                  <FileDown className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  {isPdfReady && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  )}
                </div>
              )}
              <span className="text-[10px] sm:text-[11px] font-bold mt-1 tracking-tight whitespace-nowrap">
                {isPdfReady ? 'Save PDF' : 'Export PDF'}
              </span>
            </button>
          </div>
        </div>

        {/* Offline Indicator */}
        <OfflineIndicator />

        {/* Toast Notification */}
        {toast && (
          <div 
            className="fixed right-6 z-[100] print:hidden animate-in fade-in slide-in-from-bottom-3 duration-300"
            style={{ bottom: 'max(1.5rem, calc(1rem + env(safe-area-inset-bottom, 0px)))' }}
          >
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs sm:text-sm font-medium ${
              toast.type === 'error'
                ? 'bg-red-900 text-white border-red-700/50'
                : 'bg-zinc-900 text-white border-white/10'
            }`}>
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{toast.message}</span>
              <button 
                onClick={() => setToast(null)}
                className="ml-2 text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Auto-save Brief Notification */}
        {showAutoSaveIndicator && (
          <div className="fixed top-4 right-4 z-[100] print:hidden animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-none select-none">
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
