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
 * Matches a standalone section-reference token such as "REF", "[1.]", "R2:", "BRD",
 * "PŘEDEHRA 1", etc. Used by the ChordPro parser to distinguish section markers
 * from chord symbols inside brackets/braces.
 */
export const sectionRefRegex = /^(?:(?:\d+[\.\:]?|\(\d+\))(?:\s*(?:VERSE|SLOKA))?|(?:REFR[EÉ]N|REFRAIN|REF|CHORUS|BRIDGE|BRD|PREF|PRE-REF|PRE-CHORUS|OUTRO|OUT|SPC|VERSE|SLOKA|INTRO|SOLO|CODA|MEZIHRA|MEDZIHRA|PŘEDEHRA|PREDOHRA|DOHRA|INTERLUDE|RIFF)(?:\s*\d+)?[\.\:]?|R\d*[\.\:]?|BRD\d*[\.\:]?|PREF\d*[\.\:]?|OUT\d*[\.\:]?|SPC\d*[\.\:]?|B[\.\:]|M[\.\:])$/i;
