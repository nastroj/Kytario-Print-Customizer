/**
 * Shared constants used across the layout, parsing and rendering utilities.
 */

/** Minimum font size (in pt) below which lyrics are considered unreadable. */
export const MIN_READABLE_LYRICS_FONT_SIZE = 9.0;

/** Minimum font size (in pt) below which chords are considered unreadable. */
export const MIN_READABLE_CHORDS_FONT_SIZE = 9.0;

/** Conversion factor: millimeters to CSS pixels (at 96 DPI). */
export const MM_TO_PX = 3.779528;

/** Conversion factor: inches to CSS pixels. */
export const INCH_TO_PX = 96;

/**
 * Matches standalone section-reference markers such as "1.", "(2)", "REFRÉN",
 * "R2", "BRD.", "PREF", "OUTRO", "M:", etc. Used by the line splitter,
 * chord-line parser and section-header detector.
 */
export const sectionRefRegex = /^(?:(?:\d+[\.\:]?|\(\d+\))(?:\s*(?:VERSE|SLOKA))?|(?:REFR[EÉ]N|REFRAIN|REF|CHORUS|BRIDGE|BRD|PREF|PRE-REF|PRE-CHORUS|OUTRO|OUT|SPC|VERSE|SLOKA|INTRO|SOLO|CODA|MEZIHRA|MEDZIHRA|PŘEDEHRA|PREDOHRA|DOHRA|INTERLUDE|RIFF)(?:\s*\d+)?[\.\:]?|R\d*[\.\:]?|BRD\d*[\.\:]?|PREF\d*[\.\:]?|OUT\d*[\.\:]?|SPC\d*[\.\:]?|B[\.\:]|M[\.\:])$/i;
