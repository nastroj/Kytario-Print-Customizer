/**
 * Barrel module re-exporting the app's utility helpers.
 *
 * The implementation lives in focused modules under `./utils/`:
 * - `utils/constants`     – shared constants (regexes, unit conversions, limits)
 * - `utils/parserTypes`   – structural types produced by the ChordPro parser
 * - `utils/chordProParser`– low-level line/chunk parsing primitives
 * - `utils/songParser`    – whole-song parsing with memoization + section linking
 * - `utils/pageGeometry`  – page dimensions and per-page margins (Book Mode)
 * - `utils/layoutEngine`  – font scaling, column balancing, section filling
 * - `utils/jsonParsers`   – robust songbook JSON parsing/normalization
 * - `utils/urlHelpers`    – URL/slug extraction and cover URL resolution
 * - `utils/colorUtils`    – display color mapping
 */

// ---- Shared constants ----
export {
  MIN_READABLE_LYRICS_FONT_SIZE,
  MIN_READABLE_CHORDS_FONT_SIZE,
} from './utils/constants';

// ---- Parser types ----
export type { ChordChunk, ParsedLine, SongSection } from './utils/parserTypes';

// ---- Low-level ChordPro line parsing ----
export {
  isSectionHeaderLine,
  splitLineOnSectionRefs,
  isRepetitionOrChordsOnlyLine,
  parseChordLine,
} from './utils/chordProParser';

// ---- Song parsing (memoized) ----
export { parseSongContent, linkSectionReferences } from './utils/songParser';

// ---- Page geometry ----
export { getPageMargins } from './utils/pageGeometry';
export type { PageMarginsMm, PageDimensionsPx } from './utils/pageGeometry';

// ---- Layout engine ----
export {
  getOptimalColumnCount,
  computeSmartFitScale,
  computeSmartColumnBalance,
  partitionSectionsIntoColumns,
  computeSmartSectionFilling,
  computeSongFitDebug,
  computeSmartFitLineMargin,
} from './utils/layoutEngine';
export type { ColumnFillingInfo, SmartSectionFillingPlan } from './utils/layoutEngine';

// ---- Songbook JSON parsing & normalization ----
export {
  convertKytarioSectionsToChordpro,
  normalizeSingleSong,
  safeParseSongbookJson,
} from './utils/jsonParsers';

// ---- URL helpers ----
export {
  normalizeUrlAndShortUrl,
  extractSongbookUrlAndSlug,
  formatCoverDisplayUrl,
  formatCoverQrUrl,
  resolveCoverUrl,
  cleanSongbookTitle,
  normalizeSongbookData,
} from './utils/urlHelpers';

// ---- Color helpers ----
export { getDisplayColor } from './utils/colorUtils';
