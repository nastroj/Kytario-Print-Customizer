import React, { useState, useEffect, useDeferredValue, useRef, useCallback, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { SongbookPreview } from './components/SongbookPreview';
import { ProgressBar } from './components/ProgressBar';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { KytarioLogo } from './components/KytarioLogo';
import { getChangedSettingsList } from './components/UnappliedSettingsBanner';
import { SongbookData, PrintSettings } from './types';
import { FileJson, Upload, Clipboard, CheckCircle2, Music, FileText, AlertCircle, SlidersHorizontal, Printer, FolderOpen, FileDown, Loader2, Sun, Moon, Eye, CloudAlert } from 'lucide-react';
import { safeParseSongbookJson, normalizeSongbookData } from './utils';
import { APP_CONFIG } from './config';
import { 
  saveSongbookToStorage, 
  saveSettingsToStorage, 
  loadAppStateFromStorage, 
  clearSavedSongbookStorage 
} from './utils/storage';
import { AutoSaveIndicator, AutoSaveStatus } from './components/AutoSaveIndicator';
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
  pageMarginInner: 5,
  pageMarginOuter: 5,
  bookMode: false,
  pageNumberPosition: 'outer',
  columns: 2,
  titleColor: '#1c1917', // zinc-900
  artistColor: '#57534e', // zinc-500
  lyricsColor: '#27272a', // zinc-800
  chordsColor: '#2563eb', // blue-600
  markerColor: '#27272a', // zinc-800
  tocColor: '#1c1917', // zinc-900
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
  maxFontSizePx: 32,
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
  frontCoverShowNotation: true,
  frontCoverShowFooter: true,
  frontCoverDedication: '',
  frontCoverShowDedication: true,
  showBackCover: true,
  backCoverType: 'auto',
  backCoverShowQr: true,
  backCoverShowNotation: true,
  backCoverShowFooter: true,
  backCoverDedication: '',
  backCoverShowDedication: true,
};

const defaultDarkSettings: PrintSettings = {
  pageFormat: 'A4',
  orientation: 'landscape',
  pageMargin: 5,
  pageMarginTopBottom: 6,
  pageMarginLeftRight: 5,
  pageMarginTop: 6,
  pageMarginBottom: 6,
  pageMarginLeft: 5,
  pageMarginRight: 5,
  pageMarginInner: 5,
  pageMarginOuter: 5,
  bookMode: false,
  pageNumberPosition: 'outer',
  columns: 2,
  titleColor: '#f4f4f5', // zinc-100
  artistColor: '#a1a1aa', // zinc-400
  lyricsColor: '#f4f4f5', // zinc-100
  chordsColor: '#60a5fa', // blue-400
  markerColor: '#f4f4f5', // zinc-100
  tocColor: '#f4f4f5', // zinc-100
  sectionLineColor: '#52525b', // zinc-600
  refrainLineColor: '#60a5fa', // blue-400
  separatorLineColor: '#3f3f46', // zinc-700
  sectionSeparatorColor: '#3f3f46', // zinc-700
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
  maxFontSizePx: 32,
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
  frontCoverShowNotation: true,
  frontCoverShowFooter: true,
  frontCoverDedication: '',
  frontCoverShowDedication: true,
  showBackCover: true,
  backCoverType: 'auto',
  backCoverShowQr: true,
  backCoverShowNotation: true,
  backCoverShowFooter: true,
  backCoverDedication: '',
  backCoverShowDedication: true,
};

export default function App() {
  const [songbookData, setSongbookData] = useState<SongbookData | null>(() => {
    const saved = localStorage.getItem('kytario-saved-songbook');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.songs) || Array.isArray(parsed.items))) {
          return normalizeSongbookData(parsed);
        }
      } catch (e) {
        // ignore
      }
      localStorage.removeItem('kytario-saved-songbook');
    }
    return null;
  });
  const [pastedJson, setPastedJson] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isLoadingJson, setIsLoadingJson] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('kytario-dark-mode');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  
  const getInitialSettings = (isDark: boolean) => {
    const key = isDark ? 'kytario-print-settings-v2_dark' : 'kytario-print-settings-v2_light';
    let saved = localStorage.getItem(key);
    if (!saved) {
       saved = localStorage.getItem('kytario-print-settings-v2');
    }
    const baseDefaults = isDark ? defaultDarkSettings : defaultSettings;
    
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
          parsed.maxFontSizePx = 32;
        }
        const restoredOrientation = parsed.orientation || baseDefaults.orientation || 'landscape';
        return { ...baseDefaults, ...parsed, columns: 2 };
      } catch (e) {}
    }
    return baseDefaults;
  };
  
  const getInitialDraftSettings = (isDark: boolean, currentSettings: PrintSettings) => {
    const key = isDark ? 'kytario-draft-settings_dark' : 'kytario-draft-settings_light';
    let saved = localStorage.getItem(key);
    if (!saved) {
       saved = localStorage.getItem('kytario-draft-settings');
    }
    if (saved) {
       try {
         return { ...currentSettings, ...JSON.parse(saved) };
       } catch(e) {}
    }
    return currentSettings;
  };

  const lightSettingsRef = useRef<PrintSettings>(getInitialSettings(false));
  const darkSettingsRef = useRef<PrintSettings>(getInitialSettings(true));
  const lightDraftRef = useRef<PrintSettings | null>(getInitialDraftSettings(false, lightSettingsRef.current));
  const darkDraftRef = useRef<PrintSettings | null>(getInitialDraftSettings(true, darkSettingsRef.current));

  const [settings, setSettings] = useState<PrintSettings>(() => {
    return isDarkMode ? darkSettingsRef.current : lightSettingsRef.current;
  });
  
  const [draftSettings, setDraftSettings] = useState<PrintSettings>(() => {
    return isDarkMode ? (darkDraftRef.current || darkSettingsRef.current) : (lightDraftRef.current || lightSettingsRef.current);
  });

  

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
  const [isPrintPreviewActive, setIsPrintPreviewActive] = useState(false);

  // Auto-Save Engine State
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('kytario-last-saved-time');
      return saved ? Number(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [storageBackend, setStorageBackend] = useState<'indexeddb' | 'localstorage' | 'none'>('indexeddb');
  const isInitialRestoreDoneRef = useRef(false);
  const isDirtyRef = useRef(false);
  const autoSaveDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem('kytario-dark-mode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  useEffect(() => {
    if (isDarkMode) {
      darkSettingsRef.current = settings;
    } else {
      lightSettingsRef.current = settings;
    }
  }, [settings, isDarkMode]);

  useEffect(() => {
    if (isDarkMode) {
      darkDraftRef.current = draftSettings;
    } else {
      lightDraftRef.current = draftSettings;
    }
  }, [draftSettings, isDarkMode]);

  const handleToggleDarkMode = useCallback(() => {
    if (isDarkMode) {
      darkSettingsRef.current = settings;
      darkDraftRef.current = draftSettings;
    } else {
      lightSettingsRef.current = settings;
      lightDraftRef.current = draftSettings;
    }

    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    
    const nextSettings = nextMode ? darkSettingsRef.current : lightSettingsRef.current;
    const nextDraft = nextMode ? (darkDraftRef.current || darkSettingsRef.current) : (lightDraftRef.current || lightSettingsRef.current);
    
    setSettings(nextSettings);
    setDraftSettings(nextDraft);
  }, [isDarkMode, settings, draftSettings]);


  const printTriggerRef = useRef<(() => void) | null>(null);
  const printPreviewTriggerRef = useRef<(() => void) | null>(null);
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

  const handleRegisterPrintTrigger = useCallback((trigger: () => void) => {
    printTriggerRef.current = trigger;
  }, []);

  const handleRegisterPrintPreviewTrigger = useCallback((trigger: () => void) => {
    printPreviewTriggerRef.current = trigger;
  }, []);

  const handleOpenPrintPreview = useCallback(() => {
    if (printPreviewTriggerRef.current) {
      printPreviewTriggerRef.current();
    }
  }, []);

  // Direct Print dialog (browser window.print)
  const handlePrint = useCallback(() => {
    if (printTriggerRef.current) {
      printTriggerRef.current();
    } else {
      window.print();
    }
  }, []);

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

  const handleSidebarDownloadPdf = useCallback(() => {
    handleDownloadPdf();
  }, [handleDownloadPdf]);

  const handleApplySettings = (newSettings: any) => {
    if (!newSettings || typeof newSettings !== 'object' || 'nativeEvent' in newSettings) {
      return;
    }
    const orientation = newSettings.orientation || (isDarkMode ? defaultDarkSettings.orientation : defaultSettings.orientation);
    const safeSettings: PrintSettings = {
      ...(isDarkMode ? defaultDarkSettings : defaultSettings),
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

      // 4. Keep the updating status active until layout rendering completes, then dismiss
      updateTimersRef.current.finishTimer = setTimeout(() => {
        setIsUpdatingLayout(false);
        showToast("Settings successfully applied!");
      }, 650);
    }, 120);
  };

  // 1. Initial asynchronous restoration from IndexedDB (or localStorage fallback/migration)
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const restored = await loadAppStateFromStorage();
        if (!isMounted) return;

        if (restored.backend) {
          setStorageBackend(restored.backend);
        }

        if (restored.songbookData) {
          setSongbookData(normalizeSongbookData(restored.songbookData));
        }

        
        if (restored.lightSettings) {
          lightSettingsRef.current = { ...defaultSettings, ...restored.lightSettings };
        }
        if (restored.darkSettings) {
          darkSettingsRef.current = { ...defaultDarkSettings, ...restored.darkSettings };
        }
        if (restored.lightDraft) {
          lightDraftRef.current = { ...lightSettingsRef.current, ...restored.lightDraft };
        }
        if (restored.darkDraft) {
          darkDraftRef.current = { ...darkSettingsRef.current, ...restored.darkDraft };
        }
        
        if (restored.lightSettings || restored.darkSettings) {
          setSettings(isDarkMode ? darkSettingsRef.current : lightSettingsRef.current);
          setDraftSettings(isDarkMode ? (darkDraftRef.current || darkSettingsRef.current) : (lightDraftRef.current || lightSettingsRef.current));
        }

        if (restored.lastSavedAt) {
          setLastSavedAt(restored.lastSavedAt);
        }

        setAutoSaveStatus('saved');
      } catch (err) {
        console.warn('Could not restore auto-saved session:', err);
      } finally {
        if (isMounted) {
          isInitialRestoreDoneRef.current = true;
        }
      }
    }

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Core Auto-Save execution
  const triggerAutoSave = useCallback(async () => {
    if (!isInitialRestoreDoneRef.current) return;
    const wasDirty = isDirtyRef.current;
    try {
      setAutoSaveStatus('saving');
      const now = Date.now();

      await Promise.all([
        saveSongbookToStorage(songbookData),
        saveSettingsToStorage(isDarkMode, settings, hasUnappliedSettings ? draftSettings : null),
      ]);

      isDirtyRef.current = false;
      setLastSavedAt(now);
      setAutoSaveStatus('saved');
      if (wasDirty) {
        showToast('Changes auto-saved successfully', 'success');
      }
    } catch (err) {
      console.error('Auto-save error:', err);
      setAutoSaveStatus('error');
      showToast('Auto-save failed. Check browser storage quota.', 'error');
    }
  }, [songbookData, settings, draftSettings, hasUnappliedSettings, isDarkMode, showToast]);

  // 3. Mark dirty & debounced auto-save on any change to songbook or settings
  useEffect(() => {
    if (!isInitialRestoreDoneRef.current) return;

    isDirtyRef.current = true;
    setAutoSaveStatus('saving');

    if (autoSaveDebounceTimerRef.current) {
      clearTimeout(autoSaveDebounceTimerRef.current);
    }

    autoSaveDebounceTimerRef.current = setTimeout(() => {
      triggerAutoSave();
    }, 1200);

    return () => {
      if (autoSaveDebounceTimerRef.current) {
        clearTimeout(autoSaveDebounceTimerRef.current);
      }
    };
  }, [songbookData, settings, draftSettings, triggerAutoSave]);

  // 4. Periodic Heartbeat Auto-Save (every 10 seconds if unsaved changes exist)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current) {
        triggerAutoSave();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [triggerAutoSave]);

  // 5. Emergency Auto-Save on page exit or tab switch
  useEffect(() => {
    const handleEmergencySave = () => {
      if (isDirtyRef.current || autoSaveStatus === 'saving') {
        try {
          if (songbookData) {
            localStorage.setItem('kytario-saved-songbook', JSON.stringify(songbookData));
          }
          localStorage.setItem(isDarkMode ? 'kytario-print-settings-v2_dark' : 'kytario-print-settings-v2_light', JSON.stringify(settings));
          if (hasUnappliedSettings) {
            localStorage.setItem(isDarkMode ? 'kytario-draft-settings_dark' : 'kytario-draft-settings_light', JSON.stringify(draftSettings));
          } else {
            localStorage.removeItem(isDarkMode ? 'kytario-draft-settings_dark' : 'kytario-draft-settings_light');
          }
          localStorage.setItem('kytario-last-saved-time', String(Date.now()));
        } catch (e) {}
        triggerAutoSave();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleEmergencySave();
      }
    };

    window.addEventListener('beforeunload', handleEmergencySave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleEmergencySave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [songbookData, settings, draftSettings, hasUnappliedSettings, autoSaveStatus, triggerAutoSave, isDarkMode]);

  
  const processJsonString = (rawString: string, fileName?: string) => {
    setErrorMessage(null);
    setRecoveryNotice(null);
    setWarningMessage(null);
    setIsLoadingJson(true);
    setLoadingStatus({
      title: 'Reading JSON file...',
      subtitle: fileName ? `Extracting songs from ${fileName}...` : 'Analyzing structure...',
      progress: 0
    });

    // Short timeout allows the browser to render the loading spinner before computational work
    setTimeout(() => {
      try {
        const { data, isRepaired, recoveredCount } = safeParseSongbookJson(rawString);
        const songs = data.songs || data.items || [];
        
        if (songs.length === 0) {
          throw new Error('No songs found in the provided JSON.');
        }

        // Explicitly verify the presence and format of the urlToken field
        const candidateToken = data.urlToken || data.slug || data.shortUrl;
        if (!candidateToken || !String(candidateToken).trim()) {
          setWarningMessage('Warning: The "urlToken" field is missing or empty. Generated covers or QR codes might be incomplete.');
        } else if (!/^[a-zA-Z0-9_\-\./]+$/.test(String(candidateToken).trim())) {
          setWarningMessage('Warning: The "urlToken" field format appears invalid (contains unsupported characters). Generated covers or QR codes might be incomplete.');
        }

        // Simulate progress for a more professional feel
        let currentSong = 0;
        const totalSongs = songs.length;
        const steps = Math.min(10, totalSongs); // Max 10 update steps
        const chunkSize = Math.max(1, Math.ceil(totalSongs / steps));
        
        const updateProgress = () => {
          currentSong = Math.min(currentSong + chunkSize, totalSongs);
          const percent = Math.round((currentSong / totalSongs) * 100);
          
          setLoadingStatus({
            title: 'Processing songs...',
            subtitle: `Formatting song ${currentSong} of ${totalSongs}...`,
            progress: percent
          });
          
          if (currentSong < totalSongs) {
            requestAnimationFrame(() => setTimeout(updateProgress, 30));
          } else {
            // Done simulating, set data and render
            setLoadingStatus({
              title: 'Preparing preview...',
              subtitle: 'Rendering layouts...',
              progress: 100
            });
            
            setTimeout(() => {
              setSongbookData(data);
              if (isRepaired) {
                setRecoveryNotice(`Successfully parsed and recovered ${recoveredCount} songs from formatted/truncated JSON data.`);
              }
              
              requestAnimationFrame(() => {
                setTimeout(() => {
                  setIsLoadingJson(false);
                  const songCount = songs.length;
                  const bookTitle = data.title || fileName || 'Songbook';
                  showToast(`Successfully loaded "${bookTitle}" (${songCount} song${songCount === 1 ? '' : 's'})!`);
                }, 400);
              });
            }, 50);
          }
        };
        
        updateProgress();

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

  const resetSongbook = async () => {
    setSongbookData(null);
    setPastedJson('');
    setErrorMessage(null);
    setRecoveryNotice(null);
    setIsLoadingJson(false);
    setIsMobileSidebarOpen(false);
    isDirtyRef.current = false;
    await clearSavedSongbookStorage();
    setLastSavedAt(null);
    setAutoSaveStatus('idle');
    showToast('Songbook reset and auto-save cleared', 'info');
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
          <div className="flex border-b border-black/5">
            <button
              id="upload-tab-btn"
              onClick={() => { setActiveTab('upload'); setErrorMessage(null); }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload File
            </button>
            <button
              id="paste-tab-btn"
              onClick={() => { setActiveTab('paste'); setErrorMessage(null); }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'paste'
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Clipboard className="w-4 h-4" />
              Paste JSON
            </button>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {activeTab === 'upload' ? (
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
                
                <label className={`inline-flex items-center gap-2 text-white text-xs sm:text-sm font-semibold px-5 sm:px-6 py-2.5 rounded-full transition-all shadow-sm active:scale-95 ${
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
          ) : (
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
                id="load-pasted-json-btn"
                onClick={handlePasteSubmit}
                disabled={isLoadingJson}
                className={`w-full text-white text-xs sm:text-sm font-medium py-2.5 sm:py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm ${
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
    <div className="flex h-screen h-[100dvh] min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans relative print:h-auto print:min-h-0 print:overflow-visible print:block print:bg-white print:text-black print:p-0 print:m-0">
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
        onResetSongbook={handleOpenResetModal}
        onFileUpload={handleFileUpload}
        onDownloadPdf={handleSidebarDownloadPdf}
        onPrint={handlePrint}
        onOpenPrintPreview={handleOpenPrintPreview}
        isDownloadingPdf={isDownloadingPdf || isGeneratingWorkerPdf}
        isPdfReady={isPdfReady}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={handleCloseMobileSidebar}
        isCollapsed={isDesktopSidebarCollapsed}
        onToggleCollapse={setIsDesktopSidebarCollapsed}
        isUpdatingLayout={isUpdatingLayout}
        isLoadingJson={isLoadingJson}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        autoSaveStatus={autoSaveStatus}
        lastSavedAt={lastSavedAt}
        storageBackend={storageBackend}
      />

      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden print:h-auto print:min-h-0 print:overflow-visible print:block print:p-0 print:m-0">
        {/* Mobile Header Bar */}
        <header className="md:hidden bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-black/5 dark:border-zinc-800 px-3 py-2 flex items-center justify-between shrink-0 print:hidden z-20 shadow-xs gap-2">
          <button
            id="mobile-open-settings-btn"
            onClick={handleOpenMobileSidebar}
            className="relative p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs transition-colors cursor-pointer shrink-0"
            title={hasUnappliedSettings ? `Settings (${unappliedChanges.length} unapplied changes pending)` : "Settings"}
            aria-label="Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {hasUnappliedSettings && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
            )}
          </button>

          <div className="text-center px-1 truncate min-w-0 flex-1">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{songbookTitle}</p>
            <div className="flex items-center justify-center gap-1.5 truncate">
              <p className={`text-[10px] font-medium truncate ${hasUnappliedSettings ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {songCount} songs • {hasUnappliedSettings ? 'Changes pending' : settings.pageFormat}
              </p>
              <AutoSaveIndicator 
                status={autoSaveStatus} 
                lastSavedAt={lastSavedAt} 
                storageBackend={storageBackend} 
                compact={true} 
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <PWAInstallButton variant="minimal" />
            <button
              onClick={() => setIsConfirmResetOpen(true)}
              className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs transition-colors cursor-pointer"
              title="Change Songbook (load different JSON)"
              aria-label="Change Songbook"
            >
              <FolderOpen className="w-4 h-4" />
            </button>

            <button
              onClick={handleOpenPrintPreview}
              className={`p-2 rounded-lg border shadow-2xs transition-colors cursor-pointer ${
                isPrintPreviewActive 
                  ? 'bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 border-black/5 dark:border-zinc-700/60'
              }`}
              title="On-Screen Print Preview (boundaries & margins)"
              aria-label="On-Screen Print Preview"
            >
              <Eye className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrint}
              className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs transition-colors cursor-pointer"
              title="Direct Print (open browser print dialog)"
              aria-label="Direct Print"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              id="mobile-header-download-pdf-btn"
              onClick={() => handleDownloadPdf()}
              disabled={isDownloadingPdf || isGeneratingWorkerPdf}
              className={`p-2 rounded-lg border shadow-2xs transition-all cursor-pointer disabled:opacity-50 relative ${
                isPdfReady
                  ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 border-emerald-500/40 dark:border-emerald-500/40'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 border-black/5 dark:border-zinc-700/60'
              }`}
              title={isPdfReady ? "PDF is ready! Click to download again instantly" : "Download as PDF (Client-Side Web Worker)"}
              aria-label={isPdfReady ? "Download Ready PDF" : "Download as PDF"}
            >
              {isDownloadingPdf || isGeneratingWorkerPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-600 dark:text-zinc-300" />
              ) : (
                <div className="relative flex items-center justify-center">
                  <FileDown className={`w-4 h-4 ${isPdfReady ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                  {isPdfReady && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-1 ring-white dark:ring-zinc-900" />
                    </span>
                  )}
                </div>
              )}
            </button>
          </div>
        </header>

        {/* Confirmation Dialog for Changing Songbook */}
        {isConfirmResetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
            <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in" onClick={() => setIsConfirmResetOpen(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-black/10 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 z-10">
              <h3 className="text-base font-bold text-zinc-900">Change Songbook?</h3>
              <p className="text-xs sm:text-sm text-zinc-600">
                Are you sure you want to change the songbook? Any unsaved layout adjustments or current songbook data will be cleared and you will return to the upload screen.
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmResetOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
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
              <CloudAlert className="w-4 h-4 text-amber-600 shrink-0" />
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
          onRegisterPrintTrigger={handleRegisterPrintTrigger}
          onRegisterPrintPreviewTrigger={handleRegisterPrintPreviewTrigger}
          onPrintPreviewStateChange={setIsPrintPreviewActive}
          onDownloadStatusChange={setIsDownloadingPdf}
          isDarkMode={isDarkMode}
          autoSaveStatus={autoSaveStatus}
          lastSavedAt={lastSavedAt}
          storageBackend={storageBackend}
          onOpenSettings={handleOpenSettings}
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
                ? 'bg-red-900 dark:bg-red-950 text-white border-red-700/50'
                : 'bg-zinc-900 dark:bg-zinc-800 text-white border-white/10'
            }`}>
              {toast.type === 'error' ? (
                <CloudAlert className="w-4 h-4 text-red-400 shrink-0" />
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
      </div>
    </div>
  );
}
