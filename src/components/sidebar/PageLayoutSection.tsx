import React, { useState } from 'react';
import { LayoutTemplate, RectangleVertical, RectangleHorizontal, ArrowUpDown, ArrowLeftRight, BookOpen, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Hash, ChevronDown, ChevronRight, Shrink, Sparkles } from 'lucide-react';
import { PrintSettings } from '../../types';
import { Stepper } from './Stepper';
import { MaterialToggle } from './MaterialToggle';

export interface PageLayoutSectionProps {
  idSuffix: string;
  draftSettings: PrintSettings;
  hasLayoutChanges: boolean;
  onSettingChange: (keyOrPartial: keyof PrintSettings | Partial<PrintSettings>, value?: any) => void;
}

const LAYOUT_KEYS: (keyof PrintSettings)[] = [
  'pageFormat',
  'orientation',
  'bookMode',
  'pageNumberPosition',
  'pageMarginTop',
  'pageMarginBottom',
  'pageMarginLeft',
  'pageMarginRight',
  'pageMarginInner',
  'pageMarginOuter',
  'pageMargin',
  'pageMarginTopBottom',
  'pageMarginLeftRight',
  'showTableOfContents',
  'showToc',
  'showIndex',
  'indexSortOrder',
  'tocAlphabeticalGrouping',
  'tocGroupDividers',
  'showChords',
  'showSectionLines',
  'smartFit',
  'maxFontSizePx',
  'maxLineHeight',
  'sectionMarginCap',
];

function arePageLayoutPropsEqual(prev: PageLayoutSectionProps, next: PageLayoutSectionProps): boolean {
  if (prev.idSuffix !== next.idSuffix) return false;
  if (prev.hasLayoutChanges !== next.hasLayoutChanges) return false;
  if (prev.onSettingChange !== next.onSettingChange) return false;

  for (const key of LAYOUT_KEYS) {
    if (prev.draftSettings[key] !== next.draftSettings[key]) {
      return false;
    }
  }
  return true;
}

export const PageLayoutSection = React.memo(function PageLayoutSection({
  idSuffix,
  draftSettings,
  hasLayoutChanges,
  onSettingChange,
}: PageLayoutSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isSmartFitOpen, setIsSmartFitOpen] = useState(false);
  const [isMarginsOpen, setIsMarginsOpen] = useState(false);

  const handleOrientationToggle = (newOrientation: 'portrait' | 'landscape') => {
    onSettingChange('orientation', newOrientation);
  };

  const handlePaperFormatChange = (newFormat: 'A4' | 'A5' | 'Letter') => {
    onSettingChange({
      pageFormat: newFormat,
    });
  };

  return (
    <div className="space-y-3">
      {isOpen && (
        <div className="space-y-2 animate-in fade-in duration-150">
        {/* Paper Format */}
        <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 rounded-lg border border-black/5">
          <label htmlFor={`pageFormat-${idSuffix}`} className="text-xs font-semibold text-zinc-800 shrink-0">
            Paper Format
          </label>
          <select
            id={`pageFormat-${idSuffix}`}
            className="w-28 sm:w-32 min-w-0 max-w-full truncate rounded-md border border-black/10 shadow-2xs bg-white px-2 py-1 text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
            value={draftSettings.pageFormat}
            onChange={(e) => handlePaperFormatChange(e.target.value as any)}
          >
            <option value="A4">A4 (210×297 mm)</option>
            <option value="A5">A5 (148×210 mm)</option>
            <option value="Letter">US Letter</option>
          </select>
        </div>

        {/* Orientation Toggle: Portrait vs Landscape */}
        <div className="p-2 bg-zinc-50 rounded-lg border border-black/5 space-y-1.5">
          <span className="block text-xs font-semibold text-zinc-800">
            Orientation
          </span>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-200/70 rounded-lg">
            <button
              type="button"
              id={`orientation-portrait-btn-${idSuffix}`}
              onClick={() => handleOrientationToggle('portrait')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                draftSettings.orientation === 'portrait'
                  ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Vertical Portrait layout (standard document page)"
              aria-pressed={draftSettings.orientation === 'portrait'}
            >
              <RectangleVertical className="w-3.5 h-3.5 shrink-0" />
              <span>Portrait</span>
            </button>
            <button
              type="button"
              id={`orientation-landscape-btn-${idSuffix}`}
              onClick={() => handleOrientationToggle('landscape')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                draftSettings.orientation === 'landscape'
                  ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Horizontal Landscape layout (wide spread)"
              aria-pressed={draftSettings.orientation === 'landscape'}
            >
              <RectangleHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>Landscape</span>
            </button>
          </div>
        </div>

        {/* Book Mode Switch */}
        <div className="p-2.5 bg-zinc-50 rounded-lg border border-black/5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <BookOpen className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <label
                htmlFor={`bookMode-${idSuffix}`}
                className="text-xs font-semibold text-zinc-800 cursor-pointer select-none truncate"
              >
                Book Mode
              </label>
            </div>
            <MaterialToggle
              id={`bookMode-${idSuffix}`}
              checked={!!draftSettings.bookMode}
              onChange={(checked) => {
                if (checked) {
                  onSettingChange({
                    bookMode: true,
                    pageNumberPosition: 'outer',
                  });
                } else {
                  onSettingChange({
                    bookMode: false,
                    pageNumberPosition: 'right',
                  });
                }
              }}
            />
          </div>
          <p className="text-[10.5px] text-zinc-500 leading-tight">
            Alternate page numbers
          </p>
        </div>

        {/* Page Number Position (Top) */}
        <div className="p-2.5 bg-zinc-50 rounded-lg border border-black/5 space-y-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <label 
              htmlFor={`pageNumberPosition-${idSuffix}`}
              className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5 shrink-0"
            >
              <Hash className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>Page Numbers</span>
            </label>
            <select
              id={`pageNumberPosition-${idSuffix}`}
              className="w-28 sm:w-32 min-w-0 max-w-full truncate rounded-md border border-black/10 shadow-2xs bg-white px-2 py-1.5 text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
              value={draftSettings.bookMode ? (draftSettings.pageNumberPosition ?? 'outer') : ((draftSettings.pageNumberPosition === 'outer' || !draftSettings.pageNumberPosition) ? 'right' : draftSettings.pageNumberPosition)}
              onChange={(e) => onSettingChange('pageNumberPosition', e.target.value as any)}
            >
              {draftSettings.bookMode && (
                <option value="outer">Outer (Alternating)</option>
              )}
              <option value="right">Right</option>
              <option value="left">Left</option>
              <option value="none">Hidden / None</option>
            </select>
          </div>
          {(() => {
            const pageNumText = draftSettings.bookMode
              ? ((draftSettings.pageNumberPosition ?? 'outer') === 'outer'
                  ? 'Alternates based on book spread: outer right on recto pages, outer left on verso pages.'
                  : draftSettings.pageNumberPosition === 'left'
                    ? 'Positioned on the top-left of every page.'
                    : draftSettings.pageNumberPosition === 'none'
                      ? 'Page numbers are hidden.'
                      : '')
              : (draftSettings.pageNumberPosition === 'left'
                  ? 'Positioned on the top-left of every page.'
                  : draftSettings.pageNumberPosition === 'none'
                    ? 'Page numbers are hidden.'
                    : '');
            return pageNumText ? (
              <p className="text-[10.5px] text-zinc-500 leading-tight">
                {pageNumText}
              </p>
            ) : null;
          })()}
        </div>

        {/* Granular Separate Margins */}
        <div className="p-2.5 bg-zinc-50 rounded-lg border border-black/5 space-y-2.5">
          <div
            onClick={() => setIsMarginsOpen((prev) => !prev)}
            className="flex items-center justify-between cursor-pointer select-none group"
          >
            <div className="min-w-0 pr-2">
              <span className="block text-xs font-semibold text-zinc-800">
                Page Margins {draftSettings.bookMode ? '(Book Layout)' : '(Standard)'}
              </span>
              <p className="text-[10.5px] text-zinc-500 leading-tight truncate">
                {draftSettings.bookMode
                  ? `Top: ${draftSettings.pageMarginTop ?? 6}mm • Bottom: ${draftSettings.pageMarginBottom ?? 6}mm • Inner: ${draftSettings.pageMarginInner ?? 15}mm • Outer: ${draftSettings.pageMarginOuter ?? 5}mm`
                  : `Top: ${draftSettings.pageMarginTop ?? 6}mm • Bottom: ${draftSettings.pageMarginBottom ?? 6}mm • Left: ${draftSettings.pageMarginLeft ?? 5}mm • Right: ${draftSettings.pageMarginRight ?? 5}mm`
                }
              </p>
            </div>
            <div className="p-0.5 text-zinc-400 group-hover:text-zinc-700 transition-colors shrink-0">
              {isMarginsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </div>

          {isMarginsOpen && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5 animate-in fade-in duration-100">
            {/* Top Margin */}
            <div className="space-y-1">
              <label 
                htmlFor={`pageMarginTop-${idSuffix}`} 
                className="text-[11px] font-medium text-zinc-600 flex items-center gap-1 truncate"
                title="Top page margin"
              >
                <ArrowUp className="w-3 h-3 text-zinc-500 shrink-0" />
                <span>Top</span>
              </label>
              <select
                id={`pageMarginTop-${idSuffix}`}
                className="w-full rounded-md border border-black/10 shadow-2xs bg-white px-2 py-1.5 text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                value={draftSettings.pageMarginTop ?? draftSettings.pageMarginTopBottom ?? (draftSettings.pageMargin ? Math.round(draftSettings.pageMargin * 1.2) : 6)}
                onChange={(e) => onSettingChange('pageMarginTop', parseInt(e.target.value, 10))}
              >
                <option value="2">2 mm (Minimal)</option>
                <option value="3">3 mm (Tight)</option>
                <option value="4">4 mm</option>
                <option value="5">5 mm</option>
                <option value="6">6 mm (Standard)</option>
                <option value="7">7 mm</option>
                <option value="8">8 mm</option>
                <option value="9">9 mm</option>
                <option value="10">10 mm</option>
                <option value="12">12 mm</option>
                <option value="14">14 mm</option>
                <option value="15">15 mm (Wide)</option>
                <option value="18">18 mm</option>
                <option value="20">20 mm</option>
                <option value="25">25 mm</option>
              </select>
            </div>

            {/* Bottom Margin */}
            <div className="space-y-1">
              <label 
                htmlFor={`pageMarginBottom-${idSuffix}`} 
                className="text-[11px] font-medium text-zinc-600 flex items-center gap-1 truncate"
                title="Bottom page margin"
              >
                <ArrowDown className="w-3 h-3 text-zinc-500 shrink-0" />
                <span>Bottom</span>
              </label>
              <select
                id={`pageMarginBottom-${idSuffix}`}
                className="w-full rounded-md border border-black/10 shadow-2xs bg-white px-2 py-1.5 text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                value={draftSettings.pageMarginBottom ?? draftSettings.pageMarginTopBottom ?? (draftSettings.pageMargin ? Math.round(draftSettings.pageMargin * 1.2) : 6)}
                onChange={(e) => onSettingChange('pageMarginBottom', parseInt(e.target.value, 10))}
              >
                <option value="2">2 mm (Minimal)</option>
                <option value="3">3 mm (Tight)</option>
                <option value="4">4 mm</option>
                <option value="5">5 mm</option>
                <option value="6">6 mm (Standard)</option>
                <option value="7">7 mm</option>
                <option value="8">8 mm</option>
                <option value="9">9 mm</option>
                <option value="10">10 mm</option>
                <option value="12">12 mm</option>
                <option value="14">14 mm</option>
                <option value="15">15 mm (Wide)</option>
                <option value="18">18 mm</option>
                <option value="20">20 mm</option>
                <option value="25">25 mm</option>
              </select>
            </div>

            {draftSettings.bookMode ? (
              <>
                {/* Inner Margin (Binding / Gutter) */}
                <div className="space-y-1">
                  <label 
                    htmlFor={`pageMarginInner-${idSuffix}`} 
                    className="text-[11px] font-medium text-zinc-600 flex items-center gap-1 truncate"
                    title="Inner margin (binding gutter between facing pages)"
                  >
                    <ArrowLeftRight className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span>Inner (Binding)</span>
                  </label>
                  <select
                    id={`pageMarginInner-${idSuffix}`}
                    className="w-full rounded-md border border-black/10 shadow-2xs bg-white px-2 py-1.5 text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                    value={draftSettings.pageMarginInner ?? draftSettings.pageMarginLeftRight ?? (draftSettings.pageMargin ?? 15)}
                    onChange={(e) => onSettingChange('pageMarginInner', parseInt(e.target.value, 10))}
                  >
                    <option value="2">2 mm (Minimal)</option>
                    <option value="3">3 mm</option>
                    <option value="4">4 mm</option>
                    <option value="5">5 mm (Narrow)</option>
                    <option value="6">6 mm</option>
                    <option value="7">7 mm</option>
                    <option value="8">8 mm</option>
                    <option value="9">9 mm</option>
                    <option value="10">10 mm</option>
                    <option value="12">12 mm</option>
                    <option value="14">14 mm</option>
                    <option value="15">15 mm (Standard Binding)</option>
                    <option value="18">18 mm</option>
                    <option value="20">20 mm (Wide Binding)</option>
                    <option value="25">25 mm (Deep Gutter)</option>
                  </select>
                </div>

                {/* Outer Margin */}
                <div className="space-y-1">
                  <label 
                    htmlFor={`pageMarginOuter-${idSuffix}`} 
                    className="text-[11px] font-medium text-zinc-600 flex items-center gap-1 truncate"
                    title="Outer margin (external edge of the book)"
                  >
                    <ArrowLeftRight className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span>Outer Edge</span>
                  </label>
                  <select
                    id={`pageMarginOuter-${idSuffix}`}
                    className="w-full rounded-md border border-black/10 shadow-2xs bg-white px-2 py-1.5 text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                    value={draftSettings.pageMarginOuter ?? draftSettings.pageMarginLeftRight ?? (draftSettings.pageMargin ?? 5)}
                    onChange={(e) => onSettingChange('pageMarginOuter', parseInt(e.target.value, 10))}
                  >
                    <option value="2">2 mm (Minimal)</option>
                    <option value="3">3 mm</option>
                    <option value="4">4 mm</option>
                    <option value="5">5 mm (Standard)</option>
                    <option value="6">6 mm</option>
                    <option value="7">7 mm</option>
                    <option value="8">8 mm</option>
                    <option value="9">9 mm</option>
                    <option value="10">10 mm</option>
                    <option value="12">12 mm</option>
                    <option value="14">14 mm</option>
                    <option value="15">15 mm (Wide)</option>
                    <option value="18">18 mm</option>
                    <option value="20">20 mm</option>
                    <option value="25">25 mm</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                {/* Left Margin */}
                <div className="space-y-1">
                  <label 
                    htmlFor={`pageMarginLeft-${idSuffix}`} 
                    className="text-[11px] font-medium text-zinc-600 flex items-center gap-1 truncate"
                    title="Left page margin"
                  >
                    <ArrowLeft className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span>Left</span>
                  </label>
                  <select
                    id={`pageMarginLeft-${idSuffix}`}
                    className="w-full rounded-md border border-black/10 shadow-2xs bg-white px-2 py-1.5 text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                    value={draftSettings.pageMarginLeft ?? draftSettings.pageMarginLeftRight ?? (draftSettings.pageMargin ?? 5)}
                    onChange={(e) => onSettingChange('pageMarginLeft', parseInt(e.target.value, 10))}
                  >
                    <option value="2">2 mm (Minimal)</option>
                    <option value="3">3 mm (Tight)</option>
                    <option value="4">4 mm</option>
                    <option value="5">5 mm (Standard)</option>
                    <option value="6">6 mm</option>
                    <option value="7">7 mm</option>
                    <option value="8">8 mm</option>
                    <option value="9">9 mm</option>
                    <option value="10">10 mm</option>
                    <option value="12">12 mm</option>
                    <option value="14">14 mm</option>
                    <option value="15">15 mm (Wide)</option>
                    <option value="18">18 mm</option>
                    <option value="20">20 mm (Binding)</option>
                    <option value="25">25 mm</option>
                  </select>
                </div>

                {/* Right Margin */}
                <div className="space-y-1">
                  <label 
                    htmlFor={`pageMarginRight-${idSuffix}`} 
                    className="text-[11px] font-medium text-zinc-600 flex items-center gap-1 truncate"
                    title="Right page margin"
                  >
                    <ArrowRight className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span>Right</span>
                  </label>
                  <select
                    id={`pageMarginRight-${idSuffix}`}
                    className="w-full rounded-md border border-black/10 shadow-2xs bg-white px-2 py-1.5 text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                    value={draftSettings.pageMarginRight ?? draftSettings.pageMarginLeftRight ?? (draftSettings.pageMargin ?? 5)}
                    onChange={(e) => onSettingChange('pageMarginRight', parseInt(e.target.value, 10))}
                  >
                    <option value="2">2 mm (Minimal)</option>
                    <option value="3">3 mm (Tight)</option>
                    <option value="4">4 mm</option>
                    <option value="5">5 mm (Standard)</option>
                    <option value="6">6 mm</option>
                    <option value="7">7 mm</option>
                    <option value="8">8 mm</option>
                    <option value="9">9 mm</option>
                    <option value="10">10 mm</option>
                    <option value="12">12 mm</option>
                    <option value="14">14 mm</option>
                    <option value="15">15 mm (Wide)</option>
                    <option value="18">18 mm</option>
                    <option value="20">20 mm (Binding)</option>
                    <option value="25">25 mm</option>
                  </select>
                </div>
              </>
            )}
            </div>
          )}
        </div>

        {/* Table of Contents Ordering */}
        <div className="p-2 bg-zinc-50 rounded-lg border border-black/5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`indexSortOrder-${idSuffix}`} className="text-xs font-semibold text-zinc-800 shrink-0">
              ToC Sort Order
            </label>
            <select
              id={`indexSortOrder-${idSuffix}`}
              className="w-28 sm:w-32 min-w-0 max-w-full truncate rounded-md border border-black/10 shadow-2xs bg-white px-2 py-1 text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
              value={draftSettings.indexSortOrder}
              onChange={(e) => onSettingChange('indexSortOrder', e.target.value)}
            >
              <option value="alphabetical">Alphabetical</option>
              <option value="original">As in File</option>
            </select>
          </div>

          {draftSettings.indexSortOrder === 'alphabetical' && (
            <div className="pt-2 border-t border-black/5 space-y-2">
              <div
                onClick={() => onSettingChange('tocAlphabeticalGrouping', !draftSettings.tocAlphabeticalGrouping)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <span className="text-xs text-zinc-700 font-medium">
                  Group by Starting Letter
                </span>
                <MaterialToggle
                  id={`tocAlphabeticalGrouping-${idSuffix}`}
                  size="sm"
                  checked={draftSettings.tocAlphabeticalGrouping || false}
                  onChange={(checked) => onSettingChange('tocAlphabeticalGrouping', checked)}
                  ariaLabel="Group Table of Contents by Starting Letter"
                />
              </div>

              {draftSettings.tocAlphabeticalGrouping && (
                <div
                  onClick={() => onSettingChange('tocGroupDividers', !(draftSettings.tocGroupDividers ?? true))}
                  className="flex items-center justify-between pl-3 border-l-2 border-zinc-200 cursor-pointer select-none"
                >
                  <span className="text-xs text-zinc-700 font-medium">
                    Letter Group Dividers
                  </span>
                  <MaterialToggle
                    id={`tocGroupDividers-${idSuffix}`}
                    size="sm"
                    checked={draftSettings.tocGroupDividers ?? true}
                    onChange={(checked) => onSettingChange('tocGroupDividers', checked)}
                    ariaLabel="Show Letter Group Dividers"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Song Layout Toggles */}
        <div
          onClick={() => onSettingChange('showChords', !draftSettings.showChords)}
          className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-lg border border-black/5 cursor-pointer hover:bg-zinc-100/60 transition-colors select-none"
        >
          <div>
            <span className="text-xs font-semibold text-zinc-800 block">
              Display Chords
            </span>
            <span className="text-[10.5px] text-zinc-500 leading-tight block">
              Show chord diagrams & notation above lyrics
            </span>
          </div>
          <MaterialToggle
            id={`showChords-${idSuffix}`}
            checked={draftSettings.showChords}
            onChange={(checked) => onSettingChange('showChords', checked)}
            ariaLabel="Display Chords"
          />
        </div>

        <div
          onClick={() => onSettingChange('showSectionLines', !(draftSettings.showSectionLines ?? true))}
          className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-lg border border-black/5 cursor-pointer hover:bg-zinc-100/60 transition-colors select-none"
        >
          <div>
            <span className="text-xs font-semibold text-zinc-800 block">
              Section Guide Lines
            </span>
            <span className="text-[10.5px] text-zinc-500 leading-tight block">
              Vertical guide lines beside verses & chorus
            </span>
          </div>
          <MaterialToggle
            id={`showSectionLines-${idSuffix}`}
            checked={draftSettings.showSectionLines ?? true}
            onChange={(checked) => onSettingChange('showSectionLines', checked)}
            ariaLabel="Section Guide Lines"
          />
        </div>

        {/* Smart Auto-scale & Layout Caps */}
        <div className="p-2.5 bg-zinc-50 rounded-lg border border-black/5 space-y-2">
          <div
            onClick={() => setIsSmartFitOpen((prev) => !prev)}
            className="flex items-center justify-between cursor-pointer select-none group"
          >
            <div className="min-w-0 pr-2">
              <span className="text-xs font-semibold text-zinc-800 block">
                Smart Auto-scale
              </span>
              <p className="text-[10.5px] text-zinc-500 leading-tight truncate">Fit lyrics comfortably on page</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div onClick={(e) => e.stopPropagation()}>
                <MaterialToggle
                  id={`smartFit-${idSuffix}`}
                  size="sm"
                  checked={draftSettings.smartFit}
                  onChange={(checked) => onSettingChange('smartFit', checked)}
                  ariaLabel="Smart Auto-scale"
                />
              </div>
              <div className="p-0.5 text-zinc-400 group-hover:text-zinc-700 transition-colors">
                {isSmartFitOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {isSmartFitOpen && (
            <div className="pt-2 border-t border-black/5 p-2.5 bg-zinc-100/80 rounded-lg border border-black/5 space-y-2 animate-in fade-in duration-100">
              {/* Max Font Cap */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label htmlFor={`max-font-${idSuffix}`} className="text-xs font-medium text-zinc-700 block">
                    Max Font Cap
                  </label>
                  <span className="text-[10px] text-zinc-400 block">
                    Max lyric size
                  </span>
                </div>
                <Stepper
                  id={`max-font-${idSuffix}`}
                  value={typeof draftSettings.maxFontSizePx === 'number' ? draftSettings.maxFontSizePx : 16}
                  min={12}
                  max={72}
                  step={1}
                  defaultValue={16}
                  suffix="px"
                  onChange={(val) => onSettingChange('maxFontSizePx', val)}
                  ariaLabel="Max Font Size Cap"
                />
              </div>

              {/* Max. Line Height */}
              <div className="pt-2 border-t border-black/5 flex items-center justify-between gap-2">
                <div>
                  <label htmlFor={`max-line-height-${idSuffix}`} className="text-xs font-medium text-zinc-700 block">
                    Max. Line Height
                  </label>
                  <span className="text-[10px] text-zinc-400 block">
                    Max line spacing
                  </span>
                </div>
                <Stepper
                  id={`max-line-height-${idSuffix}`}
                  value={typeof draftSettings.maxLineHeight === 'number' ? draftSettings.maxLineHeight : 1.6}
                  min={1.1}
                  max={2.5}
                  step={0.1}
                  defaultValue={1.6}
                  suffix="×"
                  onChange={(val) => onSettingChange('maxLineHeight', val)}
                  ariaLabel="Maximum Line Height Multiplier"
                />
              </div>

              {/* Section Margin Cap */}
              <div className="pt-2 border-t border-black/5 flex items-center justify-between gap-2">
                <div>
                  <label htmlFor={`section-margin-cap-${idSuffix}`} className="text-xs font-medium text-zinc-700 block">
                    Section Margin Cap
                  </label>
                  <span className="text-[10px] text-zinc-400 block">
                    Max gap between stanzas
                  </span>
                </div>
                <Stepper
                  id={`section-margin-cap-${idSuffix}`}
                  value={typeof draftSettings.sectionMarginCap === 'number' ? draftSettings.sectionMarginCap : 28}
                  min={8}
                  max={72}
                  step={1}
                  defaultValue={28}
                  suffix="px"
                  onChange={(val) => onSettingChange('sectionMarginCap', val)}
                  ariaLabel="Section Margin Cap"
                />
              </div>

              <p className="text-[10px] text-zinc-400 leading-tight pt-1">
                Caps font size, line height, and section padding when auto-fitting songs to the page.
              </p>
            </div>
          )}
        </div>
      </div>
    )}
    </div>
  );
}, arePageLayoutPropsEqual);

