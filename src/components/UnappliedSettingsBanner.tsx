import React from 'react';
import { PrintSettings } from '../types';
import { AlertCircle, RefreshCw, RotateCcw, SlidersHorizontal } from 'lucide-react';

export interface ChangedSettingItem {
  key: keyof PrintSettings;
  label: string;
  section: 'layout' | 'typography';
}

export function getChangedSettingsList(
  draft: PrintSettings,
  applied: PrintSettings
): ChangedSettingItem[] {
  if (!draft || !applied) return [];
  const changes: ChangedSettingItem[] = [];

  // Layout section
  if (draft.pageFormat !== applied.pageFormat) changes.push({ key: 'pageFormat', label: 'Paper Format', section: 'layout' });
  if (draft.orientation !== applied.orientation) changes.push({ key: 'orientation', label: 'Orientation', section: 'layout' });
  if (draft.pageMargin !== applied.pageMargin) changes.push({ key: 'pageMargin', label: 'Margins', section: 'layout' });
  if (draft.columns !== applied.columns) changes.push({ key: 'columns', label: 'Columns', section: 'layout' });
  if (draft.showChords !== applied.showChords) changes.push({ key: 'showChords', label: 'Chords Visibility', section: 'layout' });
  if (draft.smartFit !== applied.smartFit) changes.push({ key: 'smartFit', label: 'Auto-fit Scaling', section: 'layout' });
  if (draft.maxFontSizePx !== applied.maxFontSizePx) changes.push({ key: 'maxFontSizePx', label: 'Max Font Cap', section: 'layout' });
  if (draft.indexSortOrder !== applied.indexSortOrder) changes.push({ key: 'indexSortOrder', label: 'Index Sorting', section: 'layout' });
  if (draft.showSectionLines !== applied.showSectionLines) changes.push({ key: 'showSectionLines', label: 'Section Lines', section: 'layout' });

  // Typography & Colors section
  if (draft.titleFontSize !== applied.titleFontSize) changes.push({ key: 'titleFontSize', label: 'Title Size', section: 'typography' });
  if (draft.artistFontSize !== applied.artistFontSize) changes.push({ key: 'artistFontSize', label: 'Artist Size', section: 'typography' });
  if (draft.lyricsFontSize !== applied.lyricsFontSize) changes.push({ key: 'lyricsFontSize', label: 'Lyrics Size', section: 'typography' });
  if (draft.chordsFontSize !== applied.chordsFontSize) changes.push({ key: 'chordsFontSize', label: 'Chords Size', section: 'typography' });
  if (draft.tocFontSize !== applied.tocFontSize) changes.push({ key: 'tocFontSize', label: 'ToC Size', section: 'typography' });
  if (draft.lyricsItalic !== applied.lyricsItalic) changes.push({ key: 'lyricsItalic', label: 'Lyrics Italic', section: 'typography' });
  if (draft.chordsItalic !== applied.chordsItalic) changes.push({ key: 'chordsItalic', label: 'Chords Italic', section: 'typography' });
  if (draft.titleColor !== applied.titleColor) changes.push({ key: 'titleColor', label: 'Title Color', section: 'typography' });
  if (draft.artistColor !== applied.artistColor) changes.push({ key: 'artistColor', label: 'Artist Color', section: 'typography' });
  if (draft.lyricsColor !== applied.lyricsColor) changes.push({ key: 'lyricsColor', label: 'Lyrics Color', section: 'typography' });
  if (draft.chordsColor !== applied.chordsColor) changes.push({ key: 'chordsColor', label: 'Chords Color', section: 'typography' });
  if (draft.tocColor !== applied.tocColor) changes.push({ key: 'tocColor', label: 'ToC Color', section: 'typography' });
  if (draft.markerColor !== applied.markerColor) changes.push({ key: 'markerColor', label: 'Marker Color', section: 'typography' });
  if (draft.sectionLineColor !== applied.sectionLineColor) changes.push({ key: 'sectionLineColor', label: 'Section Line Color', section: 'typography' });
  if (draft.refrainLineColor !== applied.refrainLineColor) changes.push({ key: 'refrainLineColor', label: 'Refrain Line Color', section: 'typography' });

  return changes;
}

interface UnappliedSettingsBannerProps {
  currentSettings: PrintSettings;
  draftSettings: PrintSettings;
  changes: ChangedSettingItem[];
  onApply: () => void;
  onDiscard: () => void;
  onOpenSettings?: () => void;
  isUpdatingLayout?: boolean;
}

export function UnappliedSettingsBanner({
  currentSettings,
  draftSettings,
  changes,
  onApply,
  onDiscard,
  onOpenSettings,
  isUpdatingLayout = false,
}: UnappliedSettingsBannerProps) {
  if (!changes.length) return null;

  const count = changes.length;
  const changeLabels = changes.map((c) => c.label);
  const displayedLabels =
    changeLabels.length <= 3
      ? changeLabels.join(', ')
      : `${changeLabels.slice(0, 2).join(', ')} +${changeLabels.length - 2} more`;

  return (
    <div
      id="unapplied-settings-banner"
      role="status"
      aria-live="polite"
      className="bg-amber-500/10 dark:bg-amber-500/15 border-t border-amber-500/25 dark:border-amber-500/35 text-amber-950 dark:text-amber-100 px-3.5 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden z-20 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      {/* Indicator info on current layout vs draft state */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 dark:bg-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-amber-950 dark:text-amber-100">
              Unapplied Settings Changes
            </span>
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/20 dark:bg-amber-500/30 px-1.5 py-0.5 rounded-md">
              {count} {count === 1 ? 'change' : 'changes'} pending
            </span>
          </div>
          <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 truncate">
            <span className="font-medium text-amber-950 dark:text-amber-100">Current layout:</span>{' '}
            {currentSettings.pageFormat} {currentSettings.orientation}, {currentSettings.lyricsFontSize}pt lyrics
            <span className="mx-1.5 opacity-40">•</span>
            <span className="font-medium text-amber-950 dark:text-amber-100">Pending:</span> {displayedLabels}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 border border-black/10 dark:border-zinc-700 transition-colors shadow-2xs cursor-pointer"
            title="Review modified settings in panel"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Review</span>
          </button>
        )}

        <button
          type="button"
          id="banner-discard-settings-btn"
          onClick={onDiscard}
          disabled={isUpdatingLayout}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 border border-black/10 dark:border-zinc-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          title="Discard pending changes and keep current layout"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Discard</span>
        </button>

        <button
          type="button"
          id="banner-update-settings-btn"
          onClick={onApply}
          disabled={isUpdatingLayout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          title="Apply pending settings changes and recalculate layout"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingLayout ? 'animate-spin' : ''}`} />
          <span>Update Layout</span>
        </button>
      </div>
    </div>
  );
}
