import React, { useState, useEffect, useMemo } from 'react';
import { PrintSettings } from '../types';
import { APP_CONFIG } from '../config';
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
  RefreshCw,
  RotateCcw,
  Sun,
  Moon,
  Eye
} from 'lucide-react';

interface SidebarProps {
  settings: PrintSettings;
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
  onFontSizeChange: (val: number) => void;
  onColorChange: (color: string) => void;
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
  onFontSizeChange,
  onColorChange,
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
  );
}

export function Sidebar({ 
  settings, 
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
  onToggleDarkMode
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const [draftSettings, setDraftSettings] = useState<PrintSettings>(settings);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  const hasChanges = useMemo(() => {
    return (
      draftSettings.pageFormat !== settings.pageFormat ||
      draftSettings.orientation !== settings.orientation ||
      draftSettings.pageMargin !== settings.pageMargin ||
      draftSettings.indexSortOrder !== settings.indexSortOrder ||
      draftSettings.showChords !== settings.showChords ||
      draftSettings.smartFit !== settings.smartFit ||
      draftSettings.maxScaleMultiplier !== settings.maxScaleMultiplier ||
      draftSettings.maxAutoFontSize !== settings.maxAutoFontSize ||
      draftSettings.titleFontSize !== settings.titleFontSize ||
      draftSettings.artistFontSize !== settings.artistFontSize ||
      draftSettings.lyricsFontSize !== settings.lyricsFontSize ||
      draftSettings.chordsFontSize !== settings.chordsFontSize ||
      draftSettings.titleColor !== settings.titleColor ||
      draftSettings.artistColor !== settings.artistColor ||
      draftSettings.lyricsColor !== settings.lyricsColor ||
      draftSettings.chordsColor !== settings.chordsColor ||
      draftSettings.markerColor !== settings.markerColor
    );
  }, [draftSettings, settings]);

  const setCollapsed = (val: boolean) => {
    if (onToggleCollapse) {
      onToggleCollapse(val);
    } else {
      setInternalCollapsed(val);
    }
  };

  const handleSettingChange = (key: keyof PrintSettings, value: any) => {
    setDraftSettings((prev) => ({
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
    setDraftSettings(settings);
  };

  const renderContent = (isDrawer = false) => {
    const idSuffix = isDrawer ? 'mobile' : 'desktop';

    return (
      <div className="flex flex-col h-full gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-zinc-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                Settings
              </h2>
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
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <LayoutTemplate className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              Page & Layout
            </h3>

            {/* Page Format Dropdown */}
            <div>
              <label htmlFor={`pageFormat-${idSuffix}`} className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Paper Format
              </label>
              <select
                id={`pageFormat-${idSuffix}`}
                className="w-full rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 focus:bg-white dark:focus:bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-0 focus:border-transparent cursor-pointer"
                value={draftSettings.pageFormat}
                onChange={(e) => handleSettingChange('pageFormat', e.target.value)}
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="A5">A5 (148 × 210 mm)</option>
                <option value="Letter">US Letter (8.5 × 11 in)</option>
              </select>
            </div>

            {/* Orientation Dropdown */}
            <div>
              <label htmlFor={`orientation-${idSuffix}`} className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Orientation
              </label>
              <select
                id={`orientation-${idSuffix}`}
                className="w-full rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 focus:bg-white dark:focus:bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-0 focus:border-transparent cursor-pointer"
                value={draftSettings.orientation}
                onChange={(e) => handleSettingChange('orientation', e.target.value)}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            {/* Page Margins Dropdown */}
            <div>
              <label htmlFor={`pageMargin-${idSuffix}`} className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Page Margins
              </label>
              <select
                id={`pageMargin-${idSuffix}`}
                className="w-full rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 focus:bg-white dark:focus:bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-0 focus:border-transparent cursor-pointer"
                value={draftSettings.pageMargin ?? 5}
                onChange={(e) => handleSettingChange('pageMargin', parseInt(e.target.value, 10))}
              >
                <option value="3">Ultra Compact (3 mm)</option>
                <option value="4">Compact (4 mm)</option>
                <option value="5">Standard (5 mm)</option>
                <option value="6">Comfortable (6 mm)</option>
                <option value="8">Normal (8 mm)</option>
                <option value="10">Spacious (10 mm)</option>
                <option value="12">Wide / Ring Binder (12 mm)</option>
                <option value="15">Extra Wide (15 mm)</option>
              </select>
            </div>

            {/* Table of Contents Order Dropdown */}
            <div>
              <label htmlFor={`indexSortOrder-${idSuffix}`} className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Table of Contents Order
              </label>
              <select
                id={`indexSortOrder-${idSuffix}`}
                className="w-full rounded-lg border border-black/5 dark:border-zinc-700/60 shadow-2xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 focus:bg-white dark:focus:bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-0 focus:border-transparent cursor-pointer"
                value={draftSettings.indexSortOrder}
                onChange={(e) => handleSettingChange('indexSortOrder', e.target.value)}
              >
                <option value="alphabetical">Alphabetical</option>
                <option value="original">As in File</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div className="pt-1 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  id={`showChords-${idSuffix}`}
                  checked={draftSettings.showChords}
                  onChange={(e) => handleSettingChange('showChords', e.target.checked)}
                  className="rounded border-black/10 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-400 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Display Chords
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none w-fit" title="Auto-scales song lyrics and chords to fit comfortably on the page">
                <input
                  type="checkbox"
                  id={`smartFit-${idSuffix}`}
                  checked={draftSettings.smartFit}
                  onChange={(e) => handleSettingChange('smartFit', e.target.checked)}
                  className="rounded border-black/10 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-400 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Auto-scale lyrics & chords to page
                </span>
              </label>

              {draftSettings.smartFit && (() => {
                const multiplier = typeof draftSettings.maxScaleMultiplier === 'number' ? draftSettings.maxScaleMultiplier : 2.0;
                const baseLyricsPt = draftSettings.lyricsFontSize || 12;
                const maxLyricsPt = Math.round(baseLyricsPt * multiplier * 10) / 10;
                const minMult = 1.0;
                const maxMult = 2.5;
                const step = 0.1;

                const handleDecrement = () => {
                  const next = Math.max(minMult, Math.round((multiplier - step) * 10) / 10);
                  setDraftSettings((prev) => ({
                    ...prev,
                    maxScaleMultiplier: next,
                    maxAutoFontSize: 0,
                  }));
                };

                const handleIncrement = () => {
                  const next = Math.min(maxMult, Math.round((multiplier + step) * 10) / 10);
                  setDraftSettings((prev) => ({
                    ...prev,
                    maxScaleMultiplier: next,
                    maxAutoFontSize: 0,
                  }));
                };

                return (
                  <div className="pl-6 pt-1 border-l-2 border-zinc-200 dark:border-zinc-700 ml-1.5 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                      <div className="flex flex-col min-w-0">
                        <label 
                          htmlFor={`max-scale-input-${idSuffix}`}
                          className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate cursor-pointer select-none"
                        >
                          Max. Auto-Scale
                        </label>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                          {multiplier <= 1.001
                            ? `Base ${baseLyricsPt} pt (no growth)`
                            : `Max ${maxLyricsPt} pt lyrics`}
                        </span>
                      </div>

                      {/* Stepper with - / value / + */}
                      <div className="flex items-center border border-black/5 dark:border-zinc-700/60 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-lg overflow-hidden shrink-0 shadow-2xs">
                        <button
                          type="button"
                          id={`max-scale-dec-${idSuffix}`}
                          onClick={handleDecrement}
                          disabled={multiplier <= minMult}
                          className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:hover:text-zinc-100 active:bg-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                          title="Decrease max auto-scale multiplier"
                          aria-label="Decrease max auto-scale multiplier"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <div 
                          id={`max-scale-input-${idSuffix}`}
                          className="px-2 py-0.5 text-center text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 select-none min-w-[48px]"
                        >
                          {multiplier.toFixed(1)}×
                        </div>
                        <button
                          type="button"
                          id={`max-scale-inc-${idSuffix}`}
                          onClick={handleIncrement}
                          disabled={multiplier >= maxMult}
                          className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:hover:text-zinc-100 active:bg-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                          title="Increase max auto-scale multiplier"
                          aria-label="Increase max auto-scale multiplier"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* SECTION 2: Typography & Colors Combined */}
          <div className="space-y-3 pt-3 border-t border-black/5 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                Fonts & Colors
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
                    titleFontSize: 16,
                    artistFontSize: 16,
                    lyricsFontSize: 12,
                    chordsFontSize: 12,
                    tocFontSize: 12,
                  } : {
                    titleColor: '#1c1917',
                    artistColor: '#57534e',
                    lyricsColor: '#27272a',
                    chordsColor: '#2563eb',
                    markerColor: '#27272a',
                    tocColor: '#1c1917',
                    titleFontSize: 16,
                    artistFontSize: 16,
                    lyricsFontSize: 12,
                    chordsFontSize: 12,
                    tocFontSize: 12,
                  };
                  setDraftSettings(prev => ({
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
                onFontSizeChange={(val) => handleSettingChange('lyricsFontSize', val)}
                onColorChange={(col) => handleSettingChange('lyricsColor', col)}
              />
              <TypographyItemRow
                id={`chords-${idSuffix}`}
                label="Chords"
                fontSize={draftSettings.chordsFontSize}
                color={draftSettings.chordsColor}
                min={6}
                max={36}
                defaultValue={12}
                onFontSizeChange={(val) => handleSettingChange('chordsFontSize', val)}
                onColorChange={(col) => handleSettingChange('chordsColor', col)}
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
            </div>
          </div>
          <div className="text-center pt-8 pb-2">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">
              Kytario Print Customizer v{APP_CONFIG.APP_VERSION}
            </span>
          </div>


        </div>
        


        {/* Sticky Action Footer */}
        <div className="pt-3 border-t border-black/5 dark:border-zinc-800 space-y-2 shrink-0">
          {hasChanges && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <button
                type="button"
                id={`footer-discard-settings-btn-${idSuffix}`}
                onClick={handleDiscardChanges}
                disabled={isUpdatingLayout}
                className="flex-1 py-2 px-3 flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 border border-black/5 dark:border-zinc-700/60 shadow-2xs"
                title="Discard pending changes"
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
                className="flex-1 py-2 px-3 flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                title="Apply changes & update preview"
                aria-label="Apply changes & update preview"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingLayout ? 'animate-spin' : ''}`} />
                <span>Update</span>
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
            className="p-2 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 rounded-lg border border-black/5 shadow-2xs text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer" 
            title="Open Settings Panel"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => setCollapsed(false)}
            className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 rounded-lg border border-transparent hover:border-black/5 dark:hover:border-zinc-700/60 hover:shadow-2xs transition-all cursor-pointer"
            title="Settings"
          >
            <Settings2 className="w-4 h-4" />
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
