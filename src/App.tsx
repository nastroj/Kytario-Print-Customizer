import React, { useState, useEffect, useDeferredValue, useRef, useCallback, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { SongbookPreview } from './components/SongbookPreview';
import { ProgressBar } from './components/ProgressBar';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { KytarioLogo } from './components/KytarioLogo';
import { getChangedSettingsList } from './components/UnappliedSettingsBanner';
import { SongbookData, PrintSettings } from './types';
import { FileJson, Upload, Clipboard, CheckCircle2, Music, FileText, AlertCircle, SlidersHorizontal, FolderOpen, FileDown, Loader2, Sun, Moon, Globe, ExternalLink, AlertTriangle } from 'lucide-react';
import { safeParseSongbookJson, normalizeSongbookData } from './utils';
import { fetchSongbookFromKytario, KytarioErrorDetails } from './utils/api';
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
  const [songbookData, setSongbookData] = useState<SongbookData | null>(null);
  const [pastedJson, setPastedJson] = useState('');
  const [kytarioUrl, setKytarioUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'url'>('url');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [kytarioFetchDetails, setKytarioFetchDetails] = useState<KytarioErrorDetails | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isLoadingJson, setIsLoadingJson] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up any stale legacy auto-save localStorage items
  useEffect(() => {
    try {
      localStorage.removeItem('kytario-saved-songbook');
      localStorage.removeItem('kytario-last-saved-time');
      localStorage.removeItem('kytario-draft-settings');
      localStorage.removeItem('kytario-draft-settings_light');
      localStorage.removeItem('kytario-draft-settings_dark');
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

  const lightSettingsRef = useRef<PrintSettings>(getInitialSettings(false));
  const darkSettingsRef = useRef<PrintSettings>(getInitialSettings(true));

  const [settings, setSettings] = useState<PrintSettings>(() => {
    return isDarkMode ? darkSettingsRef.current : lightSettingsRef.current;
  });
  
  const [draftSettings, setDraftSettings] = useState<PrintSettings>(() => {
    return isDarkMode ? darkSettingsRef.current : lightSettingsRef.current;
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

  const handleToggleDarkMode = useCallback(() => {
    if (isDarkMode) {
      darkSettingsRef.current = settings;
    } else {
      lightSettingsRef.current = settings;
    }

    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    
    const nextSettings = nextMode ? darkSettingsRef.current : lightSettingsRef.current;
    
    setSettings(nextSettings);
    setDraftSettings(nextSettings);
  }, [isDarkMode, settings]);


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

  const handleKytarioUrlSubmit = async () => {
    if (!kytarioUrl.trim()) {
      setErrorMessage('Please enter a Kytario URL first.');
      setKytarioFetchDetails(null);
      return;
    }
    
    setErrorMessage(null);
    setKytarioFetchDetails(null);
    setRecoveryNotice(null);
    setWarningMessage(null);
    setIsLoadingJson(true);
    setLoadingStatus({
      title: 'Fetching from Kytario...',
      subtitle: kytarioUrl,
    });

    try {
      const rawData = await fetchSongbookFromKytario(kytarioUrl);
      const data = normalizeSongbookData(rawData);
      const songs = data.songs || [];
      
      if (songs.length === 0) {
        throw new Error('No songs found in the Kytario response. The songbook might be private or the URL might be incorrect.');
      }
      
      setSongbookData(data);
      setDraftSettings(prev => ({
        ...prev,
        frontCoverTitle: undefined,
        backCoverTitle: undefined
      }));
      setSettings(prev => ({
        ...prev,
        frontCoverTitle: undefined,
        backCoverTitle: undefined
      }));
      setIsLoadingJson(false);
      setKytarioFetchDetails(null);
      const songCount = songs.length;
      const songsWithContent = songs.filter(s => s.content && s.content.trim().length > 0).length;
      
      if (songsWithContent === 0 && songCount > 0) {
        showToast(`Imported ${songCount} titles, but lyrics were not found. Try a different URL?`, 'info');
      } else {
        showToast(`Successfully imported "${data.title}" from Kytario (${songsWithContent}/${songCount} songs with lyrics)!`);
      }
    } catch (err: any) {
      console.warn('Kytario import:', err?.message || err);
      setIsLoadingJson(false);
      setErrorMessage(err.message || 'Failed to import from Kytario.');
      if (err.details) {
        setKytarioFetchDetails(err.details);
      }
    }
  };

  const resetSongbook = () => {
    setSongbookData(null);
    setPastedJson('');
    setErrorMessage(null);
    setRecoveryNotice(null);
    setIsLoadingJson(false);
    setIsMobileSidebarOpen(false);
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
                className={`w-full text-white text-xs sm:text-sm font-medium py-2.5 sm:py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm ${
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
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-3 text-left">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                        GitHub Pages Static Hosting Notice
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                        GitHub Pages is a static host without a backend proxy server, so web browsers block direct background requests to Kytario due to CORS security rules.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-900/90 rounded-lg border border-amber-200/70 dark:border-amber-900/50 space-y-2">
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      ⚡ Quick 2-Step Import:
                    </div>
                    <ol className="text-xs text-zinc-600 dark:text-zinc-400 list-decimal list-inside space-y-1.5 leading-relaxed">
                      <li>
                        Click below to open the songbook JSON data directly in your browser:
                        <div className="mt-1">
                          <a
                            href={kytarioFetchDetails.apiUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 font-mono text-[11px] font-semibold hover:bg-blue-100 transition-colors"
                          >
                            <span>Open {kytarioFetchDetails.token} JSON Data</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </li>
                      <li>
                        Press <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded font-mono text-[10px] font-semibold">Ctrl+A</kbd> then <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded font-mono text-[10px] font-semibold">Ctrl+C</kbd> to copy all text.
                      </li>
                      <li>
                        Switch to the{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('paste');
                            setKytarioFetchDetails(null);
                          }}
                          className="text-blue-600 dark:text-blue-400 font-bold underline cursor-pointer"
                        >
                          Paste JSON tab
                        </button>{' '}
                        and press <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded font-mono text-[10px] font-semibold">Ctrl+V</kbd>.
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
                      className="flex-1 min-w-[130px] px-3 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
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
          isDarkMode={isDarkMode}
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
      </div>
    </div>
  );
}
