import React, { useState } from 'react';
import { Type, Italic, ChevronDown, ChevronRight } from 'lucide-react';
import { PrintSettings } from '../../types';
import { ColorDotInput } from './ColorDotInput';
import { Stepper } from './Stepper';

export interface TypographySectionProps {
  idSuffix: string;
  draftSettings: PrintSettings;
  hasTypoChanges: boolean;
  onSettingChange: (key: keyof PrintSettings, value: any) => void;
  onResetDefaults: () => void;
}

interface TypographyRowItemProps {
  id: string;
  label: string;
  colorTitle: string;
  color: string;
  onColorChange: (color: string) => void;
  italic: boolean;
  italicTitle: string;
  italicAriaLabel: string;
  onItalicChange: (italic: boolean) => void;
  fontSize: number;
  fontSizeMin: number;
  fontSizeMax: number;
  fontSizeDefault: number;
  fontSizeAriaLabel: string;
  onFontSizeChange: (size: number) => void;
}

const TypographyRowItem = React.memo(function TypographyRowItem({
  id,
  label,
  colorTitle,
  color,
  onColorChange,
  italic,
  italicTitle,
  italicAriaLabel,
  onItalicChange,
  fontSize,
  fontSizeMin,
  fontSizeMax,
  fontSizeDefault,
  fontSizeAriaLabel,
  onFontSizeChange,
}: TypographyRowItemProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
      <ColorDotInput
        id={`color-${id}`}
        value={color}
        onChange={onColorChange}
        label={label}
        title={colorTitle}
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onItalicChange(!italic)}
          className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
            italic
              ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 border-transparent shadow-2xs font-bold'
              : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 border-black/5 dark:border-zinc-700'
          }`}
          title={italicTitle}
          aria-label={italicAriaLabel}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <Stepper
          id={`size-${id}`}
          value={fontSize}
          min={fontSizeMin}
          max={fontSizeMax}
          step={1}
          defaultValue={fontSizeDefault}
          suffix="px"
          onChange={onFontSizeChange}
          ariaLabel={fontSizeAriaLabel}
        />
      </div>
    </div>
  );
});

interface AccentColorCardProps {
  id: string;
  label: string;
  color: string;
  title: string;
  onChange: (color: string) => void;
}

const AccentColorCard = React.memo(function AccentColorCard({
  id,
  label,
  color,
  title,
  onChange,
}: AccentColorCardProps) {
  return (
    <div className="p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60 flex items-center justify-between">
      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{label}</span>
      <ColorDotInput
        id={id}
        value={color}
        onChange={onChange}
        title={title}
      />
    </div>
  );
});

const TYPO_KEYS: (keyof PrintSettings)[] = [
  'titleFontSize',
  'artistFontSize',
  'lyricsFontSize',
  'chordsFontSize',
  'tocFontSize',
  'titleColor',
  'artistColor',
  'lyricsColor',
  'chordsColor',
  'markerColor',
  'tocColor',
  'sectionLineColor',
  'refrainLineColor',
  'sectionSeparatorColor',
  'titleItalic',
  'artistItalic',
  'lyricsItalic',
  'chordsItalic',
  'tocItalic',
  'showTableOfContents',
  'showToc',
  'showIndex',
];

function areTypographyPropsEqual(prev: TypographySectionProps, next: TypographySectionProps): boolean {
  if (prev.idSuffix !== next.idSuffix) return false;
  if (prev.hasTypoChanges !== next.hasTypoChanges) return false;
  if (prev.onSettingChange !== next.onSettingChange) return false;
  if (prev.onResetDefaults !== next.onResetDefaults) return false;

  for (const key of TYPO_KEYS) {
    if (prev.draftSettings[key] !== next.draftSettings[key]) {
      return false;
    }
  }
  return true;
}

export const TypographySection = React.memo(function TypographySection({
  idSuffix,
  draftSettings,
  hasTypoChanges,
  onSettingChange,
  onResetDefaults,
}: TypographySectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="space-y-3 pt-3 border-t border-black/5 dark:border-zinc-800">
      {/* Section Header */}
      <div 
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between cursor-pointer group select-none py-0.5"
      >
        <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
          <Type className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          Typography & Colors
          {hasTypoChanges && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.2 rounded-md normal-case">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Modified
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onResetDefaults();
            }}
            className="px-2 py-0.5 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
            title="Reset typography and color settings to default"
          >
            Defaults
          </button>
          <div className="p-0.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-2 animate-in fade-in duration-150">
        {/* Typography Rows with Font Size Steppers & Color Dots */}
        <div className="space-y-1.5">
          {/* Title */}
          <TypographyRowItem
            id={`title-${idSuffix}`}
            label="Song Title"
            colorTitle="Change title color"
            color={draftSettings.titleColor}
            onColorChange={(c) => onSettingChange('titleColor', c)}
            italic={draftSettings.titleItalic || false}
            italicTitle="Toggle italic style for song titles"
            italicAriaLabel="Toggle title italic"
            onItalicChange={(it) => onSettingChange('titleItalic', it)}
            fontSize={draftSettings.titleFontSize}
            fontSizeMin={10}
            fontSizeMax={48}
            fontSizeDefault={16}
            fontSizeAriaLabel="Song Title Font Size"
            onFontSizeChange={(val) => onSettingChange('titleFontSize', val)}
          />

          {/* Artist */}
          <TypographyRowItem
            id={`artist-${idSuffix}`}
            label="Artist / Author"
            colorTitle="Change artist color"
            color={draftSettings.artistColor}
            onColorChange={(c) => onSettingChange('artistColor', c)}
            italic={draftSettings.artistItalic || false}
            italicTitle="Toggle italic style for artist names"
            italicAriaLabel="Toggle artist italic"
            onItalicChange={(it) => onSettingChange('artistItalic', it)}
            fontSize={draftSettings.artistFontSize}
            fontSizeMin={8}
            fontSizeMax={36}
            fontSizeDefault={12}
            fontSizeAriaLabel="Artist Font Size"
            onFontSizeChange={(val) => onSettingChange('artistFontSize', val)}
          />

          {/* Lyrics */}
          <TypographyRowItem
            id={`lyrics-${idSuffix}`}
            label="Lyrics Text"
            colorTitle="Change lyrics color"
            color={draftSettings.lyricsColor}
            onColorChange={(c) => onSettingChange('lyricsColor', c)}
            italic={draftSettings.lyricsItalic || false}
            italicTitle="Toggle italic style for lyrics"
            italicAriaLabel="Toggle lyrics italic"
            onItalicChange={(it) => onSettingChange('lyricsItalic', it)}
            fontSize={draftSettings.lyricsFontSize}
            fontSizeMin={8}
            fontSizeMax={32}
            fontSizeDefault={11}
            fontSizeAriaLabel="Lyrics Font Size"
            onFontSizeChange={(val) => onSettingChange('lyricsFontSize', val)}
          />

          {/* Chords */}
          <TypographyRowItem
            id={`chords-${idSuffix}`}
            label="Chords"
            colorTitle="Change chords color"
            color={draftSettings.chordsColor}
            onColorChange={(c) => onSettingChange('chordsColor', c)}
            italic={draftSettings.chordsItalic || false}
            italicTitle="Toggle italic style for chords"
            italicAriaLabel="Toggle chords italic"
            onItalicChange={(it) => onSettingChange('chordsItalic', it)}
            fontSize={draftSettings.chordsFontSize}
            fontSizeMin={8}
            fontSizeMax={32}
            fontSizeDefault={11}
            fontSizeAriaLabel="Chords Font Size"
            onFontSizeChange={(val) => onSettingChange('chordsFontSize', val)}
          />

          {/* Table of Contents Typography */}
          {(draftSettings.showTableOfContents !== false && draftSettings.showToc !== false && draftSettings.showIndex !== false) && (
            <TypographyRowItem
              id={`toc-${idSuffix}`}
              label="ToC Items"
              colorTitle="Change Table of Contents item color"
              color={draftSettings.tocColor || '#18181b'}
              onColorChange={(c) => onSettingChange('tocColor', c)}
              italic={draftSettings.tocItalic || false}
              italicTitle="Toggle italic style for Table of Contents items"
              italicAriaLabel="Toggle ToC italic"
              onItalicChange={(it) => onSettingChange('tocItalic', it)}
              fontSize={draftSettings.tocFontSize ?? 11}
              fontSizeMin={8}
              fontSizeMax={24}
              fontSizeDefault={11}
              fontSizeAriaLabel="Table of Contents Font Size"
              onFontSizeChange={(val) => onSettingChange('tocFontSize', val)}
            />
          )}

          {/* Line & Element Colors in Compact Grid */}
          <div className="pt-2 border-t border-black/5 dark:border-zinc-700/60">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
              Accents & Guide Lines
            </span>
            <div className="grid grid-cols-2 gap-2">
              <AccentColorCard
                id={`markerColor-${idSuffix}`}
                label="Markers"
                color={draftSettings.markerColor}
                title="Section markers (Verse 1, Chorus...)"
                onChange={(c) => onSettingChange('markerColor', c)}
              />

              <AccentColorCard
                id={`sectionLineColor-${idSuffix}`}
                label="Verse Line"
                color={draftSettings.sectionLineColor || '#71717a'}
                title="Vertical line along verses"
                onChange={(c) => onSettingChange('sectionLineColor', c)}
              />

              <AccentColorCard
                id={`refrainLineColor-${idSuffix}`}
                label="Refrain Line"
                color={draftSettings.refrainLineColor || '#18181b'}
                title="Vertical line along refrains / chorus"
                onChange={(c) => onSettingChange('refrainLineColor', c)}
              />

              <AccentColorCard
                id={`sectionSeparatorColor-${idSuffix}`}
                label="Separator"
                color={draftSettings.sectionSeparatorColor || '#e4e4e7'}
                title="Horizontal line between sections"
                onChange={(c) => onSettingChange('sectionSeparatorColor', c)}
              />
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}, areTypographyPropsEqual);
