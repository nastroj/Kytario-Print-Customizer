export interface Song {
  id?: number | string;
  title?: string;
  name?: string;
  artist?: string;
  author?: string;
  interpreter?: string;
  text?: string;
  lyrics?: string;
  content?: string;
  chords?: string;
  rating?: number;
}

export interface SongbookData {
  title?: string;
  name?: string;
  songs?: Song[];
  items?: Song[];
  songbookSongs?: { song: Song }[];
}

export interface PrintSettings {
  pageFormat: 'A4' | 'A5' | 'Letter';
  orientation: 'portrait' | 'landscape';
  columns: number;
  titleColor: string;
  artistColor: string;
  lyricsColor: string;
  chordsColor: string;
  markerColor: string;
  tocColor: string;
  titleFontSize: number;
  artistFontSize: number;
  lyricsFontSize: number;
  chordsFontSize: number;
  tocFontSize: number;
  showChords: boolean;
  smartFit: boolean;
  maxScaleMultiplier?: number;
  maxAutoFontSize?: number;
  maxFontSizePx?: number;
  indexSortOrder: 'original' | 'alphabetical';
  pageMargin?: number; // Margin in mm (default: 5)
}

export interface SectionDebugDetail {
  marker: string;
  lineCount: number;
  estimatedHeight: number;
}

export interface SongFitDebugInfo {
  songIndex: number;
  title: string;
  artist: string;
  totalLines: number;          // Total non-empty content lines
  rawLinesCount: number;       // All raw lines in source string
  nonEmptyLinesCount: number;  // Non-empty raw lines in source string
  sectionLinesCount: number;   // Sum of lines across parsed sections
  sectionsCount: number;       // Number of sections
  visualLinesAtScale: number;  // Visual lines after column wrap calculation
  baseLyricsFontSize: number;  // e.g. 12
  baseChordsFontSize: number;  // e.g. 12
  baseTitleFontSize: number;   // e.g. 16
  computedScale: number;       // e.g. 1.49
  chosenLyricsFontSize: number;// e.g. 17.9
  chosenChordsFontSize: number;// e.g. 17.9
  minFontSizeConstraint: number; // e.g. 9.0 (enforced minimum readability constraint)
  isMinConstraintActive: boolean; // whether scale was clamped by the minimum constraint
  calculatedHeight: number;    // Estimated height in px
  availColHeight: number;      // Available column height in px
  heightUtilization: number;   // e.g. 90%
  columns: number;
  maxWrapLines: number;
  pageFormat: string;
  orientation: string;
  smartFitEnabled: boolean;
  sectionsDetail: SectionDebugDetail[];
}

export type { SongSection } from './utils';
