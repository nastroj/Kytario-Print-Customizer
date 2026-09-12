import React, { useState, useEffect, useMemo } from 'react';
import { PrintSettings } from '../types';
import { APP_CONFIG } from '../config';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  Settings2, 
  Type, 
  LayoutTemplate, 
  Printer, 
  FileDown,
  UploadCloud, 
  FolderOpen, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Loader2, 
  Minus, 
  Plus,
  Italic,
  RefreshCw,
  RotateCcw,
  Sun,
  Moon,
  Eye,
  AlertCircle,
  Check
} from 'lucide-react';
import { ChangedSettingItem, getChangedSettingsList } from './UnappliedSettingsBanner';
import { AutoSaveIndicator, AutoSaveStatus } from './AutoSaveIndicator';

interface SidebarProps {
  settings: PrintSettings;
  draftSettings?: PrintSettings;
  onDraftSettingsChange?: (settings: PrintSettings) => void;
  onDiscardSettings?: () => void;
  hasUnappliedChanges?: boolean;
  changes?: ChangedSettingItem[];
  onApplySettings: (settings: PrintSettings) => void;
  onResetSongbook?: () => void;
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadPdf?: () => void;
  onOpenPrintPreview?: () => void;
  isDownloadingPdf?: boolean;
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

interface TypographyItemProps {
  id: string;
  label: string;
  fontSize: number;
  color: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  isItalic?: boolean;
  onFontSizeChange: (val: number) => void;
  onColorChange: (color: string) => void;
  onItalicChange?: (val: boolean) => void;
}

function TypographyItemRow({
  id,
  label,
  fontSize,
  color,
  min = 6,
  max = 48,
  step = 1,
  defaultValue = 12,
  isItalic = false,
  onFontSizeChange,
  onColorChange,
  onItalicChange,
}: TypographyItemProps) {
  const [localStr, setLocalStr] = useState(fontSize.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalStr(fontSize.toString());
    }
  }, [fontSize, isFocused]);

  const commitValue = (valStr: string) => {
    const num = parseInt(valStr, 10);
    if (isNaN(num)) {
      setLocalStr(defaultValue.toString());
      onFontSizeChange(defaultValue);
      return;
    }
    const clamped = Math.max(min, Math.min(max, num));
    setLocalStr(clamped.toString());
    if (clamped !== fontSize) {
      onFontSizeChange(clamped);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setLocalStr(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onFontSizeChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    commitValue(localStr);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue(localStr);
      e.currentTarget.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
    }
  };

  const handleведении = () => {};

  const handleIncrement = () => {
    const current = isNaN(parseInt(localStr, 10)) ? fontSize : parseInt(localStr, 10);
    const next = Math.min(max, current + step);
    setLocalStr(next.toString());
    onFontSizeChange(next);
  };

  const handleDecrement = () => {
    const current = isNaN(parseInt(localStr, 10)) ? fontSize : parseInt(localStr, 10);
    const prev = Math.max(min, current - step);
    setLocalStr(prev.toString());
    onFontSizeChange(prev);
  };

  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Color picker dot */}
        <div 
          className="relative w-5 h-5 rounded-full border border-black/10 dark:border-zinc-600 shrink-0 hover:scale-110 transition-transform overflow-hidden cursor-pointer"
          style={{ backgroundColor: color }}
        >
          <input
            type="color"
            id={`${id}-color`}
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute opacity-0 inset-0 w-full h-full cursor-pointer"
            title={`Click to change ${label.toLowerCase()} color`}
          />
        </div>
        <label htmlFor={`${id}-font`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate cursor-pointer select-none">
          {label}
        </label>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {onItalicChange && (
          <button
            type="button"
            onClick={() => onItalicChange(!isItalic)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
              isItalic 
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm' 
                : 'bg-white dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border-black/10 dark:border-zinc-600'
            }`}
            title={isItalic ? "Remove italics" : "Make italic"}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Stepper with - / input / + */}
        <div className="flex items-center border border-black/5 dark:border-zinc-700/60 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 focus:bg-white dark:focus:bg-zinc-800 rounded-lg overflow-hidden shrink-0 shadow-2xs focus-within:ring-1 focus-within:ring-zinc-800 dark:focus-within:ring-zinc-400">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={fontSize <= min}
          className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:hover:text-zinc-100 active:bg-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title={`Decrease ${label} size`}
          aria-label={`Decrease ${label} size`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="relative flex items-center">
          <input
            id={`${id}-font`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={localStr}
            onFocus={(e) => {
              setIsFocused(true);
              e.target.select();
            }}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-8 text-center py-0.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-transparent focus:outline-none"
          />
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 -ml-1 pr-1 pointer-events-none select-none">px</span>
        </div>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={fontSize >= max}
          className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:hover:text-zinc-100 active:bg-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title={`Increase ${label} size`}
          aria-label={`Increase ${label} size`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
);
}

export function Sidebar({ 
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
  onOpenPrintPreview,
  isDownloadingPdf = false,
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

  // Synchronize internal draft when settings prop changes if not controlled
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

  const hasTypographyChanges = useMemo(() => {
    return changes.some(c => c.section === 'typography');
  }, [changes]);

  const setCollapsed = (val: boolean) => {
    if (onToggleCollapse) {
      onToggleCollapse(val);
    } else {
      setInternalCollapsed(val);
    }
  };

  const updateDraft = (updater: (prev: PrintSettings) => PrintSettings) => {
    const updated = updater(draftSettings);
    if (onDraftSettingsChange) {
      onDraftSettingsChange(updated);
    } else {
      setInternalDraftSettings(updated);
    }
  };

  const handleSettingChange = (key: keyof PrintSettings, value: any) => {
    updateDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

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
              {hasChanges && (
                <span 
                  id={`unapplied-badge-${idSuffix}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                  title={`${changes.length} unapplied changes`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unapplied ({changes.length})
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Page layout, fonts & colors</p>
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

        {/* Clean, Non-nested Settings Sections */}
        <div className="space-y-5 flex-1 overflow-y-auto pr-1">
          
          {/* SECTION 1: Page & Layout */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <LayoutTemplate className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                Page & Layout
                {hasLayoutChanges && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.2 rounded-md normal-case">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Modified
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => {
                  updateDraft(prev => ({
                    ...prev,
                    pageFormat: 'A4',
                    orientation: 'landscape',
                    indexSortOrder: 'alphabetical',
                    showChords: true,
                    smartFit: false,
                    showSectionLines: true,
                    pageMargin: 5
                  }));
                }}
                className="px-2 py-0.5 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Reset layout to default"
              >
                Defaults
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                <label htmlFor={`pageFormat-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">
                  Paper Format
                </label>
                <select
                  id={`pageFormat-${idSuffix}`}
                  className="w-36 rounded-md border border-black/10 dark:border-zinc-600 shadow-2xs bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                  value={draftSettings.pageFormat}
                  onChange={(e) => handleSettingChange('pageFormat', e.target.value)}
                >
                  <option value="A4">A4 (210×297)</option>
                  <option value="A5">A5 (148×210)</option>
                  <option value="Letter">US Letter</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                <label htmlFor={`orientation-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">
                  Orientation
                </label>
                <select
                  id={`orientation-${idSuffix}`}
                  className="w-36 rounded-md border border-black/10 dark:border-zinc-600 shadow-2xs bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                  value={draftSettings.orientation}
                  onChange={(e) => handleSettingChange('orientation', e.target.value)}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                <label htmlFor={`pageMargin-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">
                  Margins (mm)
                </label>
                <select
                  id={`pageMargin-${idSuffix}`}
                  className="w-36 rounded-md border border-black/10 dark:border-zinc-600 shadow-2xs bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                  value={draftSettings.pageMargin ?? 5}
                  onChange={(e) => handleSettingChange('pageMargin', parseInt(e.target.value, 10))}
                >
                  <option value="3">3 mm</option>
                  <option value="4">4 mm</option>
                  <option value="5">5 mm</option>
                  <option value="6">6 mm</option>
                  <option value="8">8 mm</option>
                  <option value="10">10 mm</option>
                  <option value="12">12 mm</option>
                  <option value="15">15 mm</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                <label htmlFor={`indexSortOrder-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">
                  ToC Order
                </label>
                <select
                  id={`indexSortOrder-${idSuffix}`}
                  className="w-36 rounded-md border border-black/10 dark:border-zinc-600 shadow-2xs bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                  value={draftSettings.indexSortOrder}
                  onChange={(e) => handleSettingChange('indexSortOrder', e.target.value)}
                >
                  <option value="alphabetical">Alphabetical</option>
                  <option value="original">As in File</option>
                </select>
              </div>

              <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                <input
                  type="checkbox"
                  id={`showChords-${idSuffix}`}
                  checked={draftSettings.showChords}
                  onChange={(e) => handleSettingChange('showChords', e.target.checked)}
                  className="rounded border-black/10 dark:border-zinc-600 shadow-2xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-400 w-4 h-4 cursor-pointer"
                />
                <label htmlFor={`showChords-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer select-none">
                  Display Chords
                </label>
              </div>

              <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                <input
                  type="checkbox"
                  id={`smartFit-${idSuffix}`}
                  checked={draftSettings.smartFit}
                  onChange={(e) => handleSettingChange('smartFit', e.target.checked)}
                  className="rounded border-black/10 dark:border-zinc-600 shadow-2xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-400 w-4 h-4 cursor-pointer"
                />
                <label htmlFor={`smartFit-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer select-none" title="Auto-scales song lyrics and chords to fit comfortably on the page">
                  Smart Auto-scale
                </label>
              </div>

              {draftSettings.smartFit && (() => {
                const maxFontSizePx = typeof draftSettings.maxFontSizePx === 'number' ? draftSettings.maxFontSizePx : 32;
                
                const minPx = 16;
                const maxPx = 72;
                const step = 1;
                
                const handleDecrement = () => {
                  updateDraft((prev) => ({
                    ...prev,
                    maxFontSizePx: Math.max(minPx, maxFontSizePx - step),
                  }));
                };

                const handleIncrement = () => {
                  updateDraft((prev) => ({
                    ...prev,
                    maxFontSizePx: Math.min(maxPx, maxFontSizePx + step),
                  }));
                };

                return (
                  <div className="p-2.5 bg-zinc-100/50 dark:bg-zinc-800/30 rounded-lg border border-black/5 dark:border-zinc-700/40 ml-2 mt-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
                        Max Font Size
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDecrement}
                          disabled={maxFontSizePx <= minPx}
                          className="w-5 h-5 flex items-center justify-center bg-white dark:bg-zinc-700 border border-black/10 dark:border-zinc-600 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50 shadow-2xs"
                          title="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 min-w-[40px] text-center select-none">
                          {maxFontSizePx}px
                        </span>
                        <button
                          type="button"
                          onClick={handleIncrement}
                          disabled={maxFontSizePx >= maxPx}
                          className="w-5 h-5 flex items-center justify-center bg-white dark:bg-zinc-700 border border-black/10 dark:border-zinc-600 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50 shadow-2xs"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Allows lyrics to grow up to <span className="font-semibold text-zinc-600 dark:text-zinc-300">{maxFontSizePx}px</span> to fill empty space.
                    </p>
                  </div>
                );
              })()}

              <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                <input
                  type="checkbox"
                  id={`showSectionLines-${idSuffix}`}
                  checked={draftSettings.showSectionLines ?? true}
                  onChange={(e) => handleSettingChange('showSectionLines', e.target.checked)}
                  className="rounded border-black/10 dark:border-zinc-600 shadow-2xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-400 w-4 h-4 cursor-pointer"
                />
                <label htmlFor={`showSectionLines-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer select-none" title="Displays vertical guide lines next to each song section (like on Kytario.com)">
                  Section Lines
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 2: Typography & Colors Combined */}
          <div className="space-y-3 pt-3 border-t border-black/5 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                Fonts & Colors
                {hasTypographyChanges && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.2 rounded-md normal-case">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Modified
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => {
                  const defaults = isDarkMode ? {
                    titleColor: '#f4f4f5',
                    artistColor: '#a1a1aa',
                    lyricsColor: '#f4f4f5',
                    chordsColor: '#60a5fa',
                    markerColor: '#f4f4f5',
                    tocColor: '#f4f4f5',
                    sectionLineColor: '#52525b',
                    refrainLineColor: '#60a5fa',
                    titleFontSize: 16,
                    artistFontSize: 16,
                    lyricsFontSize: 12,
                    chordsFontSize: 12,
                    tocFontSize: 12,
                    lyricsItalic: false,
                    chordsItalic: true,
                  } : {
                    titleColor: '#1c1917',
                    artistColor: '#57534e',
                    lyricsColor: '#27272a',
                    chordsColor: '#2563eb',
                    markerColor: '#27272a',
                    tocColor: '#1c1917',
                    sectionLineColor: '#a1a1aa',
                    refrainLineColor: '#2563eb',
                    titleFontSize: 16,
                    artistFontSize: 16,
                    lyricsFontSize: 12,
                    chordsFontSize: 12,
                    tocFontSize: 12,
                    lyricsItalic: false,
                    chordsItalic: true,
                  };
                  updateDraft(prev => ({
                    ...prev,
                    ...defaults
                  }));
                }}
                className="px-2 py-0.5 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Reset colors to default"
              >
                Defaults
              </button>
            </div>

            <div className="space-y-2">
              <TypographyItemRow
                id={`title-${idSuffix}`}
                label="Song Title"
                fontSize={draftSettings.titleFontSize}
                color={draftSettings.titleColor}
                min={8}
                max={48}
                defaultValue={16}
                onFontSizeChange={(val) => handleSettingChange('titleFontSize', val)}
                onColorChange={(col) => handleSettingChange('titleColor', col)}
              />
              <TypographyItemRow
                id={`artist-${idSuffix}`}
                label="Artist Name"
                fontSize={draftSettings.artistFontSize}
                color={draftSettings.artistColor}
                min={6}
                max={36}
                defaultValue={16}
                onFontSizeChange={(val) => handleSettingChange('artistFontSize', val)}
                onColorChange={(col) => handleSettingChange('artistColor', col)}
              />
              <TypographyItemRow
                id={`lyrics-${idSuffix}`}
                label="Lyrics"
                fontSize={draftSettings.lyricsFontSize}
                color={draftSettings.lyricsColor}
                min={6}
                max={36}
                defaultValue={12}
                isItalic={draftSettings.lyricsItalic}
                onFontSizeChange={(val) => handleSettingChange('lyricsFontSize', val)}
                onColorChange={(col) => handleSettingChange('lyricsColor', col)}
                onItalicChange={(val) => handleSettingChange('lyricsItalic', val)}
              />
              <TypographyItemRow
                id={`chords-${idSuffix}`}
                label="Chords"
                fontSize={draftSettings.chordsFontSize}
                color={draftSettings.chordsColor}
                min={6}
                max={36}
                defaultValue={12}
                isItalic={draftSettings.chordsItalic}
                onFontSizeChange={(val) => handleSettingChange('chordsFontSize', val)}
                onColorChange={(col) => handleSettingChange('chordsColor', col)}
                onItalicChange={(val) => handleSettingChange('chordsItalic', val)}
              />
              <TypographyItemRow
                id={`toc-${idSuffix}`}
                label="Table of Contents"
                fontSize={draftSettings.tocFontSize}
                color={draftSettings.tocColor}
                min={6}
                max={36}
                defaultValue={12}
                onFontSizeChange={(val) => handleSettingChange('tocFontSize', val)}
                onColorChange={(col) => handleSettingChange('tocColor', col)}
              />
              
              {/* Marker Color Row */}
              <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div 
                    className="relative w-5 h-5 rounded-full border border-black/10 dark:border-zinc-600 shrink-0 hover:scale-110 transition-transform overflow-hidden cursor-pointer"
                    style={{ backgroundColor: draftSettings.markerColor }}
                  >
                    <input
                      type="color"
                      id={`marker-color-${idSuffix}`}
                      value={draftSettings.markerColor}
                      onChange={(e) => handleSettingChange('markerColor', e.target.value)}
                      className="absolute opacity-0 inset-0 w-full h-full cursor-pointer"
                      title="Click to change section marker color"
                    />
                  </div>
                  <label htmlFor={`marker-color-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer select-none truncate">
                    Markers [Chorus/Verse]
                  </label>
                </div>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">Color only</span>
              </div>

              {/* Section Line Color Row */}
              {draftSettings.showSectionLines !== false && (
                <>
                  <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div 
                        className="relative w-5 h-5 rounded-full border border-black/10 dark:border-zinc-600 shrink-0 hover:scale-110 transition-transform overflow-hidden cursor-pointer"
                        style={{ backgroundColor: draftSettings.sectionLineColor || (isDarkMode ? '#52525b' : '#a1a1aa') }}
                      >
                        <input
                          type="color"
                          id={`section-line-color-${idSuffix}`}
                          value={draftSettings.sectionLineColor || (isDarkMode ? '#52525b' : '#a1a1aa')}
                          onChange={(e) => handleSettingChange('sectionLineColor', e.target.value)}
                          className="absolute opacity-0 inset-0 w-full h-full cursor-pointer"
                          title="Click to change section line color"
                        />
                      </div>
                      <label htmlFor={`section-line-color-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer select-none truncate">
                        Section Line
                      </label>
                    </div>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">Color only</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div 
                        className="relative w-5 h-5 rounded-full border border-black/10 dark:border-zinc-600 shrink-0 hover:scale-110 transition-transform overflow-hidden cursor-pointer"
                        style={{ backgroundColor: draftSettings.refrainLineColor || (isDarkMode ? '#60a5fa' : '#2563eb') }}
                      >
                        <input
                          type="color"
                          id={`refrain-line-color-${idSuffix}`}
                          value={draftSettings.refrainLineColor || (isDarkMode ? '#60a5fa' : '#2563eb')}
                          onChange={(e) => handleSettingChange('refrainLineColor', e.target.value)}
                          className="absolute opacity-0 inset-0 w-full h-full cursor-pointer"
                          title="Click to change refrain/chorus line color"
                        />
                      </div>
                      <label htmlFor={`refrain-line-color-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer select-none truncate">
                        Refrain Line
                      </label>
                    </div>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">Color only</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="pt-6 pb-2 space-y-3">
            <PWAInstallButton variant="sidebar" />
            <div className="text-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">
                Kytario Print Customizer v{APP_CONFIG.APP_VERSION}
              </span>
            </div>
          </div>


        </div>
        


        {/* Sticky Action Footer */}
        <div className="pt-3 border-t border-black/5 dark:border-zinc-800 space-y-2 shrink-0">
          {/* Update / Discard Buttons - Fixed directly above the 4 small action buttons */}
          {hasChanges ? (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300 font-semibold px-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unapplied changes
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-200 px-1.5 py-0.2 rounded font-semibold">
                  {changes.length} {changes.length === 1 ? 'change' : 'changes'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id={`footer-discard-settings-btn-${idSuffix}`}
                  onClick={handleDiscardChanges}
                  disabled={isUpdatingLayout}
                  className="flex-1 py-2 px-3 flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 border border-black/5 dark:border-zinc-700/60 shadow-2xs"
                  title="Discard pending changes and restore applied layout"
                  aria-label="Discard pending changes"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Discard</span>
                </button>
                <button
                  type="button"
                  id={`footer-update-settings-btn-${idSuffix}`}
                  onClick={() => handleUpdateClick(isDrawer)}
                  disabled={isUpdatingLayout}
                  className="flex-1 py-2 px-3 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  title="Apply changes & recalculate layout"
                  aria-label="Apply changes and recalculate layout"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingLayout ? 'animate-spin' : ''}`} />
                  <span>Update</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 opacity-50">
              <button
                type="button"
                disabled
                className="flex-1 py-2 px-3 flex items-center justify-center gap-1.5 bg-zinc-100/50 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600 rounded-lg text-xs font-medium cursor-not-allowed border border-black/5 dark:border-zinc-800"
                title="No pending changes to discard"
              >
                <RotateCcw className="w-3.5 h-3.5 opacity-50" />
                <span>Discard</span>
              </button>
              <button
                type="button"
                disabled
                className="flex-1 py-2 px-3 flex items-center justify-center gap-1.5 bg-zinc-100/50 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600 rounded-lg text-xs font-medium cursor-not-allowed border border-black/5 dark:border-zinc-800"
                title="All settings are applied"
              >
                <Check className="w-3.5 h-3.5 opacity-60" />
                <span>Up to date</span>
              </button>
            </div>
          )}

          {/* Compact Icon-Only Action Buttons */}
          <div className="flex items-center gap-1.5">
            {onResetSongbook && (
              <button
                type="button"
                onClick={() => {
                  if (isDrawer && onMobileClose) onMobileClose();
                  onResetSongbook();
                }}
                className="flex-1 py-2 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                title="Change Songbook (load different JSON)"
                aria-label="Change Songbook"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              id={isDrawer ? "screen-print-preview-btn-mobile" : "screen-print-preview-btn"}
              onClick={() => {
                if (isDrawer && onMobileClose) onMobileClose();
                if (onOpenPrintPreview) {
                  onOpenPrintPreview();
                }
              }}
              className="flex-1 py-2 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              title="On-Screen Print Preview (boundaries & margins)"
              aria-label="On-Screen Print Preview"
            >
              <Eye className="w-4 h-4" />
            </button>

            <button
              type="button"
              id={isDrawer ? "print-songbook-btn-mobile" : "print-songbook-btn"}
              onClick={() => {
                if (isDrawer && onMobileClose) onMobileClose();
                if (onDownloadPdf) {
                  onDownloadPdf();
                } else {
                  window.print();
                }
              }}
              className="flex-1 py-2 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              title="Direct Print (open browser print dialog)"
              aria-label="Direct Print"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              type="button"
              id={isDrawer ? "download-pdf-btn-mobile" : "download-pdf-btn"}
              onClick={() => {
                if (isDrawer && onMobileClose) onMobileClose();
                if (onDownloadPdf) {
                  onDownloadPdf();
                } else {
                  window.print();
                }
              }}
              disabled={isDownloadingPdf}
              className="flex-1 py-2 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
              title="Download as PDF"
              aria-label="Download as PDF"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-600 dark:text-zinc-300" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Auto-Save Status Indicator */}
          {autoSaveStatus && (
            <div className="flex items-center justify-center pt-1.5">
              <AutoSaveIndicator 
                status={autoSaveStatus} 
                lastSavedAt={lastSavedAt ?? null} 
                storageBackend={storageBackend} 
              />
            </div>
          )}

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
                if (onDownloadPdf) {
                  onDownloadPdf();
                } else {
                  window.print();
                }
              }}
              className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs transition-colors cursor-pointer"
              title="Direct Print"
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
              className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Download as PDF"
              aria-label="Download as PDF"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-600 dark:text-zinc-300" />
              ) : (
                <FileDown className="w-4 h-4" />
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
}
