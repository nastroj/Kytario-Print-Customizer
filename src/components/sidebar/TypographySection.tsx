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
    <div className="flex items-center justify-between p-2 bg-zinc-50 rounded-lg border border-black/5 gap-1.5">
      <ColorDotInput
        id={`color-${id}`}
        value={color}
        onChange={onColorChange}
        label={label}
        title={colorTitle}
        size="sm"
        className="min-w-0"
      />
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onItalicChange(!italic)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors cursor-pointer shrink-0 ${
            italic
              ? 'bg-zinc-800 text-white border-transparent shadow-2xs font-bold'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500 border-black/5'
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
    <div className="p-2 bg-zinc-50 rounded-lg border border-black/5 flex items-center justify-between">
      <span className="text-xs font-semibold text-zinc-800">{label}</span>
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
  'tocArtistColor',
  'tocPageColor',
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
}: TypographySectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="pt-3 border-t border-black/5">
      <div className="p-2.5 bg-zinc-50 rounded-lg border border-black/5 transition-all">
        <div
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center justify-between select-none cursor-pointer group"
        >
          <div className="min-w-0 pr-2">
            <span className="text-xs font-semibold text-zinc-800 block">
              Font and Colors
            </span>
            <p className="text-[10.5px] text-zinc-500 leading-tight truncate">
              {draftSettings.lyricsFontSize ?? 12}px lyrics • {draftSettings.chordsFontSize ?? 12}px chords • Text & accent colors
            </p>
          </div>
          <div className="p-0.5 text-zinc-400 group-hover:text-zinc-700 transition-colors shrink-0">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>

        {isOpen && (
          <div className="space-y-2 pt-2.5 mt-2.5 border-t border-black/5 animate-in fade-in duration-150">
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
            <div className="space-y-2">
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
              <div className="grid grid-cols-2 gap-2">
                <AccentColorCard
                  id={`tocArtistColor-${idSuffix}`}
                  label="ToC Authors"
                  color={draftSettings.tocArtistColor || '#52525b'}
                  title="Author/artist name color in Table of Contents"
                  onChange={(c) => onSettingChange('tocArtistColor', c)}
                />
                <AccentColorCard
                  id={`tocPageColor-${idSuffix}`}
                  label="ToC Page Nums"
                  color={draftSettings.tocPageColor || '#71717a'}
                  title="Page number and subtext color in Table of Contents"
                  onChange={(c) => onSettingChange('tocPageColor', c)}
                />
              </div>
            </div>
          )}

          {/* Line & Element Colors in Compact Grid */}
          <div className="pt-2 border-t border-black/5">
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
    </div>
  );
}, areTypographyPropsEqual);
