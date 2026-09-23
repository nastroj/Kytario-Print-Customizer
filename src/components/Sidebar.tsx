import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PrintSettings } from '../types';
import { APP_CONFIG } from '../config';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  Settings2, 
  Printer, 
  FileDown,
  UploadCloud, 
  FolderOpen, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Loader2, 
  RefreshCw,
  RotateCcw,
  Sun,
  Moon,
  Eye,
  AlertCircle,
  Check,
} from 'lucide-react';
import { ChangedSettingItem, getChangedSettingsList } from './UnappliedSettingsBanner';
import { AutoSaveIndicator, AutoSaveStatus } from './AutoSaveIndicator';
import { PageLayoutSection } from './sidebar/PageLayoutSection';
import { CoverPageSection } from './sidebar/CoverPageSection';
import { TypographySection } from './sidebar/TypographySection';

interface SidebarProps {
  settings: PrintSettings;
  draftSettings?: PrintSettings;
  onDraftSettingsChange?: (settings: PrintSettings | ((prev: PrintSettings) => PrintSettings)) => void;
  onDiscardSettings?: () => void;
  hasUnappliedChanges?: boolean;
  changes?: ChangedSettingItem[];
  onApplySettings: (settings: PrintSettings) => void;
  onResetSongbook?: () => void;
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadPdf?: () => void;
  onPrint?: () => void;
  onOpenPrintPreview?: () => void;
  isDownloadingPdf?: boolean;
  isPdfReady?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isUpdatingLayout?: boolean;
  isLoadingJson?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  autoSaveStatus?: AutoSaveStatus;
  lastSavedAt?: number | null;
  storageBackend?: 'indexeddb' | 'localstorage' | 'none';
}

export const Sidebar = React.memo(function Sidebar({ 
  settings, 
  draftSettings: externalDraftSettings,
  onDraftSettingsChange,
  onDiscardSettings,
  hasUnappliedChanges: externalHasUnappliedChanges,
  changes: externalChanges,
  onApplySettings, 
  onResetSongbook, 
  onFileUpload, 
  onDownloadPdf, 
  onPrint,
  onOpenPrintPreview,
  isDownloadingPdf = false,
  isPdfReady = false,
  isMobileOpen = false,
  onMobileClose,
  isUpdatingLayout = false,
  isLoadingJson = false,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  isDarkMode = false,
  onToggleDarkMode,
  autoSaveStatus,
  lastSavedAt,
  storageBackend = 'indexeddb' as 'indexeddb' | 'localstorage' | 'none'
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const [internalDraftSettings, setInternalDraftSettings] = useState<PrintSettings>(settings);

  // Synchronize internal draft when settings prop changes if not externally controlled
  useEffect(() => {
    setInternalDraftSettings(settings);
  }, [settings]);

  // Effective draft settings
  const draftSettings = externalDraftSettings ?? internalDraftSettings;

  // Compute changes using standard helper
  const changes = useMemo(() => {
    return externalChanges ?? getChangedSettingsList(draftSettings, settings);
  }, [externalChanges, draftSettings, settings]);

  const hasChanges = externalHasUnappliedChanges !== undefined ? externalHasUnappliedChanges : changes.length > 0;

  const hasLayoutChanges = useMemo(() => {
    return changes.some(c => c.section === 'layout');
  }, [changes]);

  const hasCoverChanges = useMemo(() => {
    return changes.some(c => c.section === 'cover');
  }, [changes]);

  const hasTypographyChanges = useMemo(() => {
    return changes.some(c => c.section === 'typography');
  }, [changes]);

  const setCollapsed = useCallback((val: boolean) => {
    if (onToggleCollapse) {
      onToggleCollapse(val);
    } else {
      setInternalCollapsed(val);
    }
  }, [onToggleCollapse]);

  const updateDraft = useCallback((updater: (prev: PrintSettings) => PrintSettings) => {
    if (onDraftSettingsChange) {
      (onDraftSettingsChange as any)((prev: PrintSettings) => updater(prev));
    } else {
      setInternalDraftSettings(updater);
    }
  }, [onDraftSettingsChange]);

  const handleSettingChange = useCallback((keyOrPartial: keyof PrintSettings | Partial<PrintSettings>, value?: any) => {
    updateDraft((prev) => {
      if (typeof keyOrPartial === 'object' && keyOrPartial !== null) {
        return {
          ...prev,
          ...keyOrPartial,
        };
      }
      return {
        ...prev,
        [keyOrPartial as keyof PrintSettings]: value,
      };
    });
  }, [updateDraft]);

  const handleResetLayoutDefaults = useCallback(() => {
    updateDraft((prev) => ({
      ...prev,
      pageFormat: 'A4',
      orientation: 'landscape',
      columns: 2,
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
      showFrontCover: true,
      showTableOfContents: true,
      showToc: true,
      showIndex: true,
      showBackCover: true,
      indexSortOrder: 'alphabetical',
      tocAlphabeticalGrouping: true,
      tocGroupDividers: true,
      showChords: true,
      showSectionLines: true,
      smartFit: true,
      maxFontSizePx: 32,
    }));
  }, [updateDraft]);

  const handleResetCoverDefaults = useCallback(() => {
    updateDraft((prev) => ({
      ...prev,
      showFrontCover: true,
      frontCoverType: 'auto',
      frontCoverTitle: undefined,
      frontCoverSubtitle: undefined,
      frontCoverDedication: undefined,
      frontCoverShowDedication: true,
      frontCoverUrl: undefined,
      frontCoverQrUrl: undefined,
      frontCoverShowQr: true,
      frontCoverCustomImage: undefined,
      frontCoverImagePosition: 'replace-qr',
      frontCoverAlignment: 'center',
      frontCoverShowNotation: true,
      frontCoverNotationText: undefined,
      frontCoverShowFooter: true,
      frontCoverFooterText: undefined,
      showBackCover: true,
      backCoverType: 'auto',
      backCoverTitle: undefined,
      backCoverSubtitle: undefined,
      backCoverDedication: undefined,
      backCoverShowDedication: true,
      backCoverUrl: undefined,
      backCoverQrUrl: undefined,
      backCoverShowQr: true,
      backCoverCustomImage: undefined,
      backCoverImagePosition: 'replace-qr',
      backCoverAlignment: 'center',
      backCoverShowNotation: true,
      backCoverNotationText: undefined,
      backCoverShowFooter: true,
      backCoverFooterText: undefined,
    }));
  }, [updateDraft]);

  const handleResetTypoDefaults = useCallback(() => {
    updateDraft((prev) => ({
      ...prev,
      fontFamily: 'Inter',
      titleFontSize: 16,
      artistFontSize: 16,
      lyricsFontSize: 12,
      chordsFontSize: 12,
      tocFontSize: 12,
      titleColor: isDarkMode ? '#f4f4f5' : '#1c1917',
      artistColor: isDarkMode ? '#a1a1aa' : '#57534e',
      lyricsColor: isDarkMode ? '#f4f4f5' : '#27272a',
      chordsColor: isDarkMode ? '#60a5fa' : '#2563eb',
      markerColor: isDarkMode ? '#f4f4f5' : '#27272a',
      tocColor: isDarkMode ? '#f4f4f5' : '#1c1917',
      sectionLineColor: isDarkMode ? '#52525b' : '#a1a1aa',
      refrainLineColor: isDarkMode ? '#60a5fa' : '#2563eb',
      sectionSeparatorColor: isDarkMode ? '#3f3f46' : '#e4e4e7',
      titleItalic: false,
      artistItalic: false,
      lyricsItalic: false,
      chordsItalic: true,
      tocItalic: false,
    }));
  }, [updateDraft, isDarkMode]);

  const handleUpdateClick = (isDrawer = false) => {
    onApplySettings(draftSettings);
    if (isDrawer && onMobileClose) {
      setTimeout(() => {
        onMobileClose();
      }, 150);
    }
  };

  const handleDiscardChanges = () => {
    if (onDiscardSettings) {
      onDiscardSettings();
    } else {
      setInternalDraftSettings(settings);
    }
  };

  const renderContent = (isDrawer = false) => {
    const idSuffix = isDrawer ? 'mobile' : 'desktop';

    return (
      <div className="flex flex-col h-full gap-3.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-zinc-800 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                Settings
              </h2>
              {autoSaveStatus && (
                <AutoSaveIndicator 
                  status={autoSaveStatus} 
                  lastSavedAt={lastSavedAt ?? null} 
                  storageBackend={storageBackend} 
                  compact={true}
                />
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Kytario Print Customizer v{APP_CONFIG.APP_VERSION}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {onToggleDarkMode && (
              <button 
                onClick={onToggleDarkMode} 
                className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer" 
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
            {isDrawer ? (
              <button 
                onClick={onMobileClose} 
                className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer" 
                title="Close Settings"
                aria-label="Close Settings"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={() => setCollapsed(true)} 
                className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer" 
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Modular Settings Sections */}
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          {/* SECTION 1: Page Layout */}
          <PageLayoutSection
            idSuffix={idSuffix}
            draftSettings={draftSettings}
            hasLayoutChanges={hasLayoutChanges}
            onSettingChange={handleSettingChange}
            onResetDefaults={handleResetLayoutDefaults}
          />

          {/* SECTION 2: Cover Pages */}
          <CoverPageSection
            idSuffix={idSuffix}
            draftSettings={draftSettings}
            hasCoverChanges={hasCoverChanges}
            onSettingChange={handleSettingChange}
            onResetDefaults={handleResetCoverDefaults}
          />

          {/* SECTION 3: Typography & Colors */}
          <TypographySection
            idSuffix={idSuffix}
            draftSettings={draftSettings}
            hasTypoChanges={hasTypographyChanges}
            onSettingChange={handleSettingChange}
            onResetDefaults={handleResetTypoDefaults}
          />
        </div>

        {/* Footer / Actions Area */}
        <div className="pt-3 border-t border-black/5 dark:border-zinc-800 shrink-0 space-y-2.5">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Unapplied Changes Bar in Sidebar */}
          {hasChanges && (
            <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-xl space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
                    {changes.length} {changes.length === 1 ? 'change' : 'changes'} pending
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 underline decoration-zinc-400/50 cursor-pointer"
                  title="Discard changes and revert to current preview"
                >
                  Discard
                </button>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  id={`sidebar-apply-btn-${idSuffix}`}
                  onClick={() => handleUpdateClick(isDrawer)}
                  disabled={isUpdatingLayout}
                  className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Apply changes to update songbook layout"
                >
                  {isUpdatingLayout ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Apply Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {onResetSongbook && (
              <button
                type="button"
                id={`sidebar-load-different-songbook-btn-${idSuffix}`}
                onClick={onResetSongbook}
                disabled={isLoadingJson}
                className="py-2 px-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-black/5 dark:border-zinc-700/60"
                title="Open a different songbook JSON file"
              >
                {isLoadingJson ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FolderOpen className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                )}
                <span className="truncate">Change JSON</span>
              </button>
            )}

            <button
              type="button"
              id={`sidebar-preview-print-btn-${idSuffix}`}
              onClick={() => {
                if (onOpenPrintPreview) onOpenPrintPreview();
                if (isDrawer && onMobileClose) onMobileClose();
              }}
              className="py-2 px-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-black/5 dark:border-zinc-700/60"
              title="Preview exact pages on screen before printing"
            >
              <Eye className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>Preview</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id={`sidebar-print-btn-${idSuffix}`}
              onClick={() => {
                if (onPrint) {
                  onPrint();
                } else if (onDownloadPdf) {
                  onDownloadPdf();
                } else {
                  window.print();
                }
              }}
              className="py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-black/5 dark:border-zinc-700/60"
              title="Open browser print dialog"
            >
              <Printer className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              <span>Print</span>
            </button>

            <button
              type="button"
              id={`sidebar-pdf-download-btn-${idSuffix}`}
              onClick={() => {
                if (onDownloadPdf) {
                  onDownloadPdf();
                } else {
                  window.print();
                }
              }}
              disabled={isDownloadingPdf}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border ${
                isPdfReady
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
                  : 'bg-zinc-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 border-transparent'
              }`}
              title={isPdfReady ? "PDF generated! Click to save" : "Export and download as PDF"}
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Building...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>{isPdfReady ? 'Save PDF' : 'Get PDF'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Drawer Backdrop and Modal with smooth CSS transition */}
      <div 
        className={`fixed inset-0 z-50 md:hidden flex print:hidden transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        }`}
        aria-hidden={!isMobileOpen}
      >
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            isMobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onMobileClose}
        />
        {/* Drawer */}
        <div 
          className={`relative w-84 max-w-[88vw] bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 backdrop-blur-2xl h-full shadow-2xl p-4 z-10 flex flex-col transform transition-transform duration-300 ease-out ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {renderContent(true)}
        </div>
      </div>

      {/* Desktop Sidebar with smooth CSS transition */}
      <aside 
        className={`hidden md:flex flex-col h-screen shrink-0 print:hidden shadow-sm border-r border-black/5 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 backdrop-blur-2xl transition-[width] duration-300 ease-in-out overflow-hidden relative ${
          isCollapsed ? 'w-16' : 'w-80'
        }`}
      >
        {/* Collapsed view content (64px width) */}
        <div 
          className={`absolute inset-0 flex flex-col items-center py-6 px-2.5 gap-4 transition-opacity duration-200 ${
            isCollapsed ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'
          }`}
        >
          <button 
            id="desktop-expand-sidebar-btn"
            onClick={() => setCollapsed(false)} 
            className="relative p-2 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 rounded-lg border border-black/5 shadow-2xs text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer" 
            title={hasChanges ? `Open Settings (${changes.length} unapplied changes pending)` : "Open Settings Panel"}
          >
            <ChevronRight className="w-5 h-5" />
            {hasChanges && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
            )}
          </button>

          <button
            onClick={() => setCollapsed(false)}
            className="relative p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 rounded-lg border border-transparent hover:border-black/5 dark:hover:border-zinc-700/60 hover:shadow-2xs transition-all cursor-pointer"
            title={hasChanges ? `Settings (${changes.length} unapplied changes pending)` : "Settings"}
          >
            <Settings2 className="w-4 h-4" />
            {hasChanges && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
            )}
          </button>

          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          <div className="flex-1" />

          {/* Action buttons in collapsed state */}
          <div className="flex flex-col items-center gap-2 pb-2">
            {onResetSongbook && (
              <button
                type="button"
                onClick={onResetSongbook}
                className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs transition-colors cursor-pointer"
                title="Change Songbook (load different JSON)"
                aria-label="Change Songbook"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                if (onOpenPrintPreview) onOpenPrintPreview();
              }}
              className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs transition-colors cursor-pointer"
              title="On-Screen Print Preview"
              aria-label="On-Screen Print Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (onPrint) {
                  onPrint();
                } else if (onDownloadPdf) {
                  onDownloadPdf();
                } else {
                  window.print();
                }
              }}
              className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs transition-colors cursor-pointer"
              title="Direct Print (open browser print dialog)"
              aria-label="Direct Print"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (onDownloadPdf) {
                  onDownloadPdf();
                } else {
                  window.print();
                }
              }}
              disabled={isDownloadingPdf}
              className={`p-2 rounded-lg border shadow-2xs transition-all cursor-pointer disabled:opacity-50 relative ${
                isPdfReady
                  ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 border-emerald-500/40 dark:border-emerald-500/40'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 border-black/5 dark:border-zinc-700/60'
              }`}
              title={isPdfReady ? "PDF is ready! Click to download again instantly" : "Download as PDF"}
              aria-label={isPdfReady ? "Download Ready PDF" : "Download as PDF"}
            >
              {isDownloadingPdf ? (
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

            {autoSaveStatus && (
              <AutoSaveIndicator 
                status={autoSaveStatus} 
                lastSavedAt={lastSavedAt ?? null} 
                storageBackend={storageBackend} 
                compact={true} 
              />
            )}
          </div>
        </div>

        {/* Expanded view content (320px width) */}
        <div 
          className={`w-80 h-full p-5 flex flex-col transition-opacity duration-200 ${
            isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
          }`}
        >
          {renderContent(false)}
        </div>
      </aside>
    </>
  );
});
