import React, { useState, useEffect, useDeferredValue, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { SongbookPreview } from './components/SongbookPreview';
import { ProgressBar } from './components/ProgressBar';
import { SongbookData, PrintSettings } from './types';
import { FileJson, Upload, Clipboard, CheckCircle2, AlertCircle, SlidersHorizontal, Printer, FolderOpen, FileDown, Loader2, Sun, Moon } from 'lucide-react';
import { safeParseSongbookJson } from './utils';
import { APP_CONFIG } from './config';

const defaultSettings: PrintSettings = {
  pageFormat: 'A4',
  orientation: 'landscape',
  columns: 2,
  titleColor: '#1c1917', // zinc-900
  artistColor: '#57534e', // zinc-500
  lyricsColor: '#27272a', // zinc-800
  chordsColor: '#2563eb', // blue-600
  markerColor: '#27272a', // zinc-800
  tocColor: '#1c1917', // zinc-900
  titleFontSize: 16,
  artistFontSize: 16,
  lyricsFontSize: 12,
  chordsFontSize: 12,
  tocFontSize: 12,
  showChords: true,
  smartFit: true,
  indexSortOrder: 'alphabetical',
};

const defaultDarkSettings: PrintSettings = {
  pageFormat: 'A4',
  orientation: 'landscape',
  columns: 2,
  titleColor: '#f4f4f5', // zinc-100
  artistColor: '#a1a1aa', // zinc-400
  lyricsColor: '#f4f4f5', // zinc-100
  chordsColor: '#60a5fa', // blue-400
  markerColor: '#f4f4f5', // zinc-100
  tocColor: '#f4f4f5', // zinc-100
  titleFontSize: 16,
  artistFontSize: 16,
  lyricsFontSize: 12,
  chordsFontSize: 12,
  tocFontSize: 12,
  showChords: true,
  smartFit: true,
  indexSortOrder: 'alphabetical',
};

export default function App() {
  const [songbookData, setSongbookData] = useState<SongbookData | null>(() => {
    const saved = localStorage.getItem('kytario-saved-songbook');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.songs) || Array.isArray(parsed.items))) {
          return parsed;
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
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isLoadingJson, setIsLoadingJson] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<{ title: string; subtitle?: string }>({
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

  const [settings, setSettings] = useState<PrintSettings>(() => {
    const saved = localStorage.getItem('kytario-print-settings-v2');
    const baseDefaults = isDarkMode ? defaultDarkSettings : defaultSettings;
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // If the user hasn't explicitly customized colors, or if we want to ensure 
        // the correct theme colors are applied when switching modes externally,
        // we should probably just use the baseDefaults for colors if they match 
        // the *other* theme's defaults.
        // For simplicity, we can just spread the parsed settings over the base defaults.
        // However, if the parsed settings contain explicit color values that were just the 
        // light-theme defaults, they will overwrite the dark-theme defaults.
        // Let's check if the saved titleColor matches the wrong theme's default titleColor.
        const isWrongThemeSaved = 
          (isDarkMode && parsed.titleColor === defaultSettings.titleColor) ||
          (!isDarkMode && parsed.titleColor === defaultDarkSettings.titleColor);
          
        if (isWrongThemeSaved) {
          // Overwrite the saved colors with the correct theme's defaults
          parsed.titleColor = baseDefaults.titleColor;
          parsed.artistColor = baseDefaults.artistColor;
          parsed.lyricsColor = baseDefaults.lyricsColor;
          parsed.chordsColor = baseDefaults.chordsColor;
          parsed.markerColor = baseDefaults.markerColor;
          parsed.tocColor = baseDefaults.tocColor;
        }

        // Migrate legacy defaults (14px or 11px) to 45-line 12px default
        if (
          (parsed.lyricsFontSize === 14 || parsed.lyricsFontSize === 11) &&
          (parsed.chordsFontSize === 14 || parsed.chordsFontSize === 11)
        ) {
          parsed.lyricsFontSize = 12;
          parsed.chordsFontSize = 12;
        }

        return { ...baseDefaults, ...parsed, columns: 2 };
      } catch (e) {
        // ignore
      }
    }
    return baseDefaults;
  });

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
  const handleToggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    const defaults = nextMode ? defaultDarkSettings : defaultSettings;
    setSettings(prev => ({
      ...prev,
      titleColor: defaults.titleColor,
      artistColor: defaults.artistColor,
      lyricsColor: defaults.lyricsColor,
      chordsColor: defaults.chordsColor,
      tocColor: defaults.tocColor,
      markerColor: defaults.markerColor,
    }));
  };

  const printTriggerRef = useRef<(() => void) | null>(null);
  const updateTimersRef = useRef<{ applyTimer?: ReturnType<typeof setTimeout>; finishTimer?: ReturnType<typeof setTimeout> }>({});

  const handleRegisterPrintTrigger = useCallback((trigger: () => void) => {
    printTriggerRef.current = trigger;
  }, []);

  const handleDownloadPdf = useCallback(() => {
    if (printTriggerRef.current) {
      printTriggerRef.current();
    } else {
      window.print();
    }
  }, []);

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

      // 4. Keep the updating status active until layout rendering completes, then dismiss
      updateTimersRef.current.finishTimer = setTimeout(() => {
        setIsUpdatingLayout(false);
      }, 650);
    }, 120);
  };

  useEffect(() => {
    localStorage.setItem('kytario-print-settings-v2', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (songbookData) {
      localStorage.setItem('kytario-saved-songbook', JSON.stringify(songbookData));
    } else {
      localStorage.removeItem('kytario-saved-songbook');
    }
  }, [songbookData]);

  const processJsonString = (rawString: string, fileName?: string) => {
    setErrorMessage(null);
    setRecoveryNotice(null);
    setIsLoadingJson(true);
    setLoadingStatus({
      title: 'Reading & parsing JSON...',
      subtitle: fileName ? `Extracting songs from ${fileName}...` : 'Validating songbook structure and chords...',
    });

    // Short timeout allows the browser to render the loading spinner before computational work
    setTimeout(() => {
      try {
        const { data, isRepaired, recoveredCount } = safeParseSongbookJson(rawString);
        const songs = data.songs || data.items || [];
        if (songs.length === 0) {
          throw new Error('No songs found in the provided JSON.');
        }

        setLoadingStatus({
          title: 'Preparing songbook preview...',
          subtitle: `Formatting ${songs.length} song${songs.length === 1 ? '' : 's'} and Table of Contents...`,
        });

        setSongbookData(data);
        if (isRepaired) {
          setRecoveryNotice(`Successfully parsed and recovered ${recoveredCount} songs from formatted/truncated JSON data.`);
        }

        // Keep spinner visible smoothly while the preview and song pages render
        requestAnimationFrame(() => {
          setTimeout(() => {
            setIsLoadingJson(false);
          }, 350);
        });
      } catch (err: any) {
        console.error('JSON parse error:', err);
        setIsLoadingJson(false);
        setErrorMessage(
          err.message || 'Could not parse JSON. Please check that it is valid Kytario songbook data.'
        );
      }
    }, 40);
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

  const resetSongbook = () => {
    setSongbookData(null);
    setPastedJson('');
    setErrorMessage(null);
    setRecoveryNotice(null);
    setIsLoadingJson(false);
    setIsMobileSidebarOpen(false);
    localStorage.removeItem('kytario-saved-songbook');
  };

  if (!songbookData) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-3 sm:p-6 relative">
        {/* Full-screen Loading Spinner Overlay while parsing and preparing songbook */}
        <ProgressBar
          active={isLoadingJson}
          statusText={loadingStatus.title}
          subText={loadingStatus.subtitle}
          variant="overlay"
        />

        <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg border border-black/5 p-5 sm:p-8 space-y-5 sm:space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-zinc-900 text-white rounded-lg flex items-center justify-center mx-auto shadow-sm">
              <FileJson className="w-6 h-6 sm:w-7 sm:h-7" />
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
              className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                isDragging ? 'border-zinc-800 bg-zinc-50' : 'border-black/10 hover:border-zinc-400 bg-zinc-50/50'
              }`}
            >
              <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
              <p className="text-xs sm:text-sm font-medium text-zinc-700 mb-1">
                Drag and drop your Kytario .json file here
              </p>
              <p className="text-[11px] sm:text-xs text-zinc-400 mb-4">Supports standard and large songbook exports</p>
              
              <label className={`inline-flex items-center gap-2 text-white text-xs sm:text-sm font-medium px-4 sm:px-5 py-2.5 rounded-lg transition-colors shadow-sm ${
                isLoadingJson
                  ? 'bg-zinc-800 pointer-events-none'
                  : 'bg-zinc-900 hover:bg-zinc-800 cursor-pointer'
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
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans relative">
      {/* Full-screen Loading Spinner Overlay while parsing or loading a new songbook */}
      <ProgressBar
        active={isLoadingJson}
        statusText={loadingStatus.title}
        subText={loadingStatus.subtitle}
        variant="overlay"
      />

      {/* Sidebar Component (handles desktop docked + mobile drawer modal) */}
      <Sidebar
        settings={settings}
        onApplySettings={handleApplySettings}
        onResetSongbook={() => setIsConfirmResetOpen(true)}
        onFileUpload={handleFileUpload}
        onDownloadPdf={handleDownloadPdf}
        isDownloadingPdf={isDownloadingPdf}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isDesktopSidebarCollapsed}
        onToggleCollapse={setIsDesktopSidebarCollapsed}
        isUpdatingLayout={isUpdatingLayout}
        isLoadingJson={isLoadingJson}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="md:hidden bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-black/5 dark:border-zinc-800 px-3.5 py-2.5 flex items-center justify-between shrink-0 print:hidden z-20 shadow-xs">
          <button
            id="mobile-open-settings-btn"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold transition-colors border border-black/5 dark:border-zinc-700"
          >
            <SlidersHorizontal className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
            <span>Settings</span>
          </button>

          <div className="text-center px-2 truncate max-w-[130px] sm:max-w-[200px]">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{songbookTitle}</p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">{songCount} songs • {settings.pageFormat}</p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleDarkMode}
              className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors shadow-xs cursor-pointer"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="p-2 bg-[#4FC3F7] hover:bg-[#29B6F6] active:bg-[#03A9F4] text-zinc-950 font-semibold rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              title="Download as PDF"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
              ) : (
                <FileDown className="w-4 h-4 text-zinc-950" />
              )}
            </button>
            <button
              onClick={() => window.print()}
              className="p-2 bg-[#f6cf02] hover:bg-[#e5be02] active:bg-[#d4ad02] text-zinc-950 font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Direct Print"
            >
              <Printer className="w-4 h-4 text-zinc-950" />
            </button>
            <button
              onClick={() => setIsConfirmResetOpen(true)}
              className="p-2 bg-[#afafaf] hover:bg-[#9e9e9e] active:bg-[#8e8e8e] text-zinc-900 font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Change Songbook"
            >
              <FolderOpen className="w-4 h-4 text-zinc-900" />
            </button>
          </div>
        </header>

        {/* Confirmation Dialog for Changing Songbook */}
        {isConfirmResetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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

        <SongbookPreview 
          data={songbookData} 
          settings={settings}
          isUpdatingLayout={isUpdatingLayout}
          onRegisterPrintTrigger={handleRegisterPrintTrigger}
          onDownloadStatusChange={setIsDownloadingPdf}
          isDarkMode={isDarkMode}
          onOpenSettings={() => {
            setIsMobileSidebarOpen(true);
            setIsDesktopSidebarCollapsed(false);
          }}
        />
      </div>
    </div>
  );
}
