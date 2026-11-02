/**
 * Shared constants for the Kytario Print Customizer.
 * Centralizes magic strings (storage keys) and default values so they are
 * defined once instead of being duplicated across components.
 */
import type { PrintSettings } from '../types';

/** localStorage / IndexedDB keys used throughout the app. */
export const STORAGE_KEYS = {
  /** Current, versioned print settings blob. */
  SETTINGS: 'kytario-print-settings-v2',
  /** Cached songbook JSON (localStorage mirror of IndexedDB). */
  CACHED_SONGBBOOK: 'kytario-cached-songbook',
  /** Legacy keys — removed on startup during storage cleanup. */
  LEGACY_SONGBBOOK: 'kytario-saved-songbook',
  LEGACY_LAST_SAVED: 'kytario-last-saved-time',
  LEGACY_DRAFT_SETTINGS: 'kytario-draft-settings',
} as const;

/**
 * Default print settings applied to a fresh session and used when resetting.
 * Spread into user-provided settings to guarantee every field exists.
 */
export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  pageFormat: 'A4',
  orientation: 'landscape',
  pageMargin: 5,
  pageMarginTopBottom: 6,
  pageMarginLeftRight: 5,
  pageMarginTop: 6,
  pageMarginBottom: 6,
  pageMarginLeft: 5,
  pageMarginRight: 5,
  pageMarginInner: 15,
  pageMarginOuter: 5,
  bookMode: false,
  pageNumberPosition: 'right',
  columns: 2,
  titleColor: '#1c1917', // zinc-900
  artistColor: '#57534e', // zinc-500
  lyricsColor: '#27272a', // zinc-800
  chordsColor: '#2563eb', // blue-600
  markerColor: '#27272a', // zinc-800
  tocColor: '#1c1917', // zinc-900
  tocArtistColor: '#57534e', // zinc-500 (matches artistColor)
  tocPageColor: '#71717a', // zinc-500 (matches colSubtle)
  sectionLineColor: '#a1a1aa', // zinc-400 (matches Kytario gray)
  refrainLineColor: '#2563eb', // blue-600 (matches Kytario blue)
  separatorLineColor: '#e4e4e7', // zinc-200
  sectionSeparatorColor: '#e4e4e7', // zinc-200
  showSectionLines: true,
  titleFontSize: 16,
  artistFontSize: 16,
  lyricsFontSize: 12,
  chordsFontSize: 12,
  tocFontSize: 12,
  titleItalic: false,
  artistItalic: false,
  lyricsItalic: false,
  chordsItalic: true,
  tocItalic: false,
  showChords: true,
  smartFit: true,
  smartSectionFilling: true,
  maxLineHeight: 1.6,
  sectionMarginCap: 28,
  lineHeight: 1.3,
  maxFontSizePx: 16,
  indexSortOrder: 'alphabetical',
  tocAlphabeticalGrouping: true,
  tocGroupDividers: true,
  showToc: true,
  showIndex: true,
  fontFamily: 'Inter',
  showFrontCover: true,
  showTableOfContents: true,
  frontCoverType: 'auto',
  frontCoverShowQr: true,
  frontCoverShowFooter: false,
  frontCoverFooterText: '',
  frontCoverDedication: '',
  frontCoverShowDedication: true,
  showBackCover: true,
  backCoverType: 'auto',
  backCoverShowQr: true,
  backCoverShowFooter: false,
  backCoverFooterText: '',
  backCoverDedication: '',
  backCoverShowDedication: true,
};
