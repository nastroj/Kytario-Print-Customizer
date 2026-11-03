/**
 * Shared types, layout constants, and hoisted regular expressions used by the
 * song parser (songParser.ts) and the layout engine (layoutEngine.ts).
 *
 * Regexes live at module scope so hot layout loops reuse a single compiled
 * regex instead of allocating (and re-parsing) a fresh literal on every call.
 */

export interface ChordChunk {
  chord: string | null;
  text: string;
  isSectionRef?: boolean;
  targetSectionIndex?: number;
}

export interface ParsedLine {
  raw: string;
  isEmpty: boolean;
  chunks: ChordChunk[];
  hasChords: boolean;
  isRepetitionLine?: boolean;
  /** Length of the visible lyric text with chord markup stripped, precomputed once at parse time. */
  textLen: number;
  /** Total rendered width of the line's chords in character units (chord length + 2), precomputed at parse time. */
  chordsWidth: number;
  /** Sum of per-chunk max(text width, chord width) for normal lines; sum of text+chord widths for repetition lines. Precomputed at parse time. */
  renderedWidth: number;
}

export interface SongSection {
  marker: string;
  isRefrain: boolean;
  lines: string[];
  parsedLines: ParsedLine[];
}

/** Average glyph width as a fraction of font size (monospace-ish approximation). */
export const AVG_CHAR_WIDTH_FACTOR = 0.48;
/** Same factor tuned for the slightly wider column-balancing estimator. */
export const BALANCE_CHAR_WIDTH_FACTOR = 0.54;
/** Minimum smart-fit scale floor independent of base font size. */
export const MIN_SCALE_FLOOR = 0.48;

export const MIN_READABLE_LYRICS_FONT_SIZE = 9.0;
export const MIN_READABLE_CHORDS_FONT_SIZE = 9.0;

/** Splits a line into plain text and bracketed/braced tokens (kept in the result). */
export const chordSplitRegex = /(\{[^}]+\}|\[[^[\]]+\])/g;
/** Matches repetition/bar notation like "|:" ":|" "| |". */
export const repBarRegex = /:\|\|:|:\|\s*\|:/g;
/** Matches leading whitespace of a string. */
export const leadingWhitespaceRegex = /^(\s*)(.*)$/;
/** ChordPro closing directives (end_of_chorus etc.). */
export const cpCloseDirectiveRegex =
  /^\{(?:end_of_chorus|eoc|end_of_bridge|eob|end_of_verse|eov|end_of_tab|eot)\}/i;
/** ChordPro opening/comment directives used as section headers. */
export const cpOpenDirectiveRegex =
  /^\{(?:(?:c|comment):\s*([^}]+)|(start_of_chorus|soc|start_of_bridge|sob|start_of_verse|sov|start_of_tab|sot))\}(?:\s*(.*)|$)/i;
/** Markdown-style decorated headers ("### Bridge", "**Bridge**", "--- Bridge ---"). */
export const mdHeaderRegex =
  /^(?:#{1,4}|\*{1,2}|-{2,4}|={2,4})\s*([A-Za-z0-9\u00C0-\u024F\s\.:]+?)\s*(?:#{1,4}|\*{1,2}|-{2,4}|={2,4})?$/;
/** Bracketed section marker at line start ("[REF]", "[1.] verse"). */
export const bracketHeaderRegex = /^\[([^\]]+)\](?:\s*(.*)|$)/;
/** Parenthesized section marker at line start ("(REF)", "(1.) verse"). */
export const parenHeaderRegex = /^\(([^\)]+)\)(?:\s*(.*)|$)/;
/** Standalone bracketed section reference ("[R]"). */
export const standaloneBracketRefRegex = /^\[([^\]]+)\]$/;
/** Section prefix markers at line start ("1.", "Bridge:", "R:", "Mezihra:"). */
export const markerPatternRegex =
  /^((?:(?:\d+[\.\:]|\(\d+\))(?:\s*(?:VERSE|SLOKA))?[\.\:]?|(?:REFR[EÉ]N|REFRAIN|REF|CHORUS|BRIDGE|BRD|PREF|PRE-REF|PRE-CHORUS|OUTRO|OUT|SPC|VERSE|SLOKA|INTRO|SOLO|CODA|MEZIHRA|MEDZIHRA|PŘEDEHRA|PREDOHRA|DOHRA|INTERLUDE|RIFF)(?:\s*\d+)?[\.\:]?|R\d*[\.\:]?|BRD\d*[\.\:]?|PREF\d*[\.\:]?|OUT\d*[\.\:]?|SPC\d*[\.\:]?|B[\.\:]|M[\.\:]))(?:\s+|(?=\[)|(?=\{)|$)/i;
/** Refrain detection on an uppercased marker. */
export const refrainMarkerRegex = /^R\d*[\.:]?$/;

export const sectionRefRegex =
  /^(?:(?:\d+[\.\:]?|\(\d+\))(?:\s*(?:VERSE|SLOKA))?|(?:REFR[EÉ]N|REFRAIN|REF|CHORUS|BRIDGE|BRD|PREF|PRE-REF|PRE-CHORUS|OUTRO|OUT|SPC|VERSE|SLOKA|INTRO|SOLO|CODA|MEZIHRA|MEDZIHRA|PŘEDEHRA|PREDOHRA|DOHRA|INTERLUDE|RIFF)(?:\s*\d+)?[\.\:]?|R\d*[\.\:]?|BRD\d*[\.\:]?|PREF\d*[\.\:]?|OUT\d*[\.\:]?|SPC\d*[\.\:]?|B[\.\:]|M[\.\:])$/i;

/**
 * Matches chord/section markup tokens such as "[C]" or "{G}". Hoisted to module
 * scope so hot layout loops reuse a single compiled regex instead of allocating
 * (and re-parsing) a fresh literal on every call.
 */
export const chordMarkupRegex = /\[[^\]]*\]|\{[^}]*\}/g;

/** Matches one or more bracketed/braced tokens (global variant for match/replace). */
export const chordTokensGlobalRegex = /\{[^\}]+\}|\[[^\]]+\]/g;
/** Fast test for any bracketed/braced token character in a line. */
export const hasChordTokenRegex = /[[{]/;

/** Matches literal [ or ] characters in section markers. */
export const markerBracketsRegex = /[\[\]]/g;

/** Matches a line wrapped in [ ... ] so it can be unwrapped to its inner text. */
export const wrappedMarkerRegex = /^\[(.*)\]$/;

/** ChordPro opening/comment directives used as section headers (no tail capture). */
export const cpOpenDirectiveNoTailRegex =
  /^\{(?:(?:c|comment):\s*([^}]+)|(start_of_chorus|soc|start_of_bridge|sob|start_of_verse|sov|start_of_tab|sot))\}/i;
/** Strips repetition/bar/punctuation/count characters from notation lines. */
export const repNotationCharsRegex = /[|:\\/!.()\[\]{}\s0-9xX%*\-+~]/g;
/** Musical label prefixes allowed on chords-only lines ("Intro:", "Mezihra", ...). */
export const musicLabelRegex =
  /^(?:Intro|Outro|OUT|Solo|SPC|Mezihra|Bridge|BRD|Coda|R|Ref|PREF|Pre-Ref|Pre-Chorus|Refrén|Refrain|Chorus|Verse|Sloka|Riff|Interlude|Předehra|Dohra|Kytara|Guitar|Instr|Instrumental|Theme|Lead|Break|Takt|Bar|Akordy|Chords)[0-9]*[\.:]?$/i;
/** Kytario spacing tags ({-}, {--}, {---} and bracket variants). */
export const spacingTagRegex = /\{-{1,3}\}|\[-{1,3}\]/g;
/** Bracketed tokens used when splitting lines on section references. */
export const bracketTokenScanRegex = /\[([^\]]+)\]/g;

/** Extra character units added around a rendered chord token (left/right padding). */
export const CHORD_WIDTH_PADDING = 2;
