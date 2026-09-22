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
  urlToken?: string;
  url?: string;
  shortUrl?: string;
  slug?: string;
  code?: string;
  songs?: Song[];
  items?: Song[];
  songbookSongs?: { song: Song }[];
  [key: string]: any;
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
  lyricsItalic?: boolean;
  chordsItalic?: boolean;
  titleItalic?: boolean;
  artistItalic?: boolean;
  tocItalic?: boolean;
  maxScaleMultiplier?: number;
  maxAutoFontSize?: number;
  maxFontSizePx?: number;
  indexSortOrder: 'original' | 'alphabetical';
  tocAlphabeticalGrouping?: boolean;
  tocGroupDividers?: boolean;
  pageMargin?: number; // Legacy/fallback margin in mm (default: 5)
  pageMarginTopBottom?: number; // Vertical margin (top & bottom) in mm (default: 6)
  pageMarginLeftRight?: number; // Horizontal margin (left & right / inner & outer) in mm (default: 5)
  pageMarginTop?: number; // Top margin in mm (default: 6)
  pageMarginBottom?: number; // Bottom margin in mm (default: 6)
  pageMarginLeft?: number; // Left margin in mm (when bookMode is false, default: 5)
  pageMarginRight?: number; // Right margin in mm (when bookMode is false, default: 5)
  pageMarginInner?: number; // Inner (binding/gutter) margin in mm (when bookMode is true, default: 5)
  pageMarginOuter?: number; // Outer margin in mm (when bookMode is true, default: 5)
  bookMode?: boolean; // Book mode (facing pages: inner/outer margins, alternating page numbers)
  pageNumberPosition?: 'left' | 'right' | 'outer' | 'none'; // Position of page number badge on top (default: 'outer')
  showSectionLines?: boolean;
  separatorLineColor?: string;
  sectionSeparatorColor?: string;
  sectionLineColor?: string;
  refrainLineColor?: string;
  fontFamily?: string;

  // Front & Back Cover Page Settings
  showFrontCover?: boolean; // default: true
  showTableOfContents?: boolean; // default: true (includes Table of Contents in printout / PDF)
  showToc?: boolean; // alias for showTableOfContents
  showIndex?: boolean; // alias for showTableOfContents
  frontCoverType?: 'auto' | 'custom'; // 'auto' (Kytario classic) or 'custom'
  frontCoverTitle?: string; // custom title override
  frontCoverSubtitle?: string; // custom subtitle or description
  frontCoverUrl?: string; // custom URL
  frontCoverShowQr?: boolean; // default: true
  frontCoverQrUrl?: string; // custom QR target URL
  frontCoverShowNotation?: boolean; // default: true
  frontCoverNotationText?: string; // custom notation text
  frontCoverShowFooter?: boolean; // default: true
  frontCoverFooterText?: string; // custom footer text
  frontCoverCustomImage?: string; // base64 / data URL
  frontCoverImagePosition?: 'above-title' | 'replace-qr' | 'below-qr'; // default: 'replace-qr'
  frontCoverAlignment?: 'center' | 'left'; // default: 'center'
  frontCoverDedication?: string; // user-defined dedication or subtitle note
  frontCoverShowDedication?: boolean; // default: true
  showBackCover?: boolean; // default: true
  backCoverType?: 'auto' | 'custom';
  backCoverTitle?: string;
  backCoverSubtitle?: string;
  backCoverUrl?: string;
  backCoverShowQr?: boolean;
  backCoverQrUrl?: string;
  backCoverShowNotation?: boolean;
  backCoverNotationText?: string;
  backCoverShowFooter?: boolean;
  backCoverFooterText?: string;
  backCoverCustomImage?: string;
  backCoverImagePosition?: 'above-title' | 'replace-qr' | 'below-qr';
  backCoverAlignment?: 'center' | 'left';
  backCoverDedication?: string;
  backCoverShowDedication?: boolean;
}

export interface SectionDebugDetail {
  marker: string;
  lineCount: number;
  estimatedHeight: number;
}

export interface SectionBalancePlan {
  sectionIndex: number;
  breakBeforeColumn: boolean;
  avoidBreakInside: boolean;
  orphanProtection: {
    hasHeadGroup: boolean;
    headGroupCount: number;
    hasTailGroup: boolean;
    tailGroupStartIndex: number;
  };
}

export interface ColumnBalancePlan {
  colCount: number;
  isMultiColumn: boolean;
  sections: SectionBalancePlan[];
  cuts?: number[];
  orphanPrevented: boolean;
  strategy: 'single-column' | 'inter-section-clean' | 'protected-split';
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
  columnBalancing?: {
    isBalanced: boolean;
    orphanPrevented: boolean;
    strategy: string;
  };
}

export type { SongSection } from './utils';
