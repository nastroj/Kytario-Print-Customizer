import { SongbookData, Song, PrintSettings, SongFitDebugInfo } from './types';

export interface ChordChunk {
  chord: string | null;
  text: string;
  isSectionRef?: boolean;
}

export interface ParsedLine {
  raw: string;
  isEmpty: boolean;
  chunks: ChordChunk[];
  hasChords: boolean;
  isRepetitionLine?: boolean;
}

export interface SongSection {
  marker: string;
  isRefrain: boolean;
  lines: string[];
  parsedLines: ParsedLine[];
}

const songContentCache = new Map<string, SongSection[]>();
const MAX_CACHE_SIZE = 1000;

/**
 * Preprocesses raw JSON input by stripping BOM, invisible characters, markdown fences,
 * and extracting JSON blocks if surrounded by conversational or extraneous text.
 */
function preprocessJsonText(raw: string): string {
  if (!raw) return '';
  let cleaned = String(raw).trim();

  // 1. Remove UTF-8 BOM and non-standard invisible whitespace/separators
  cleaned = cleaned.replace(/^[\uFEFF\u200B\u200C\u200D\u00A0\s]+/, '').trim();

  // 2. Remove Markdown code block wrappers if present (e.g. ```json ... ```)
  const codeBlockMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 3. Extract JSON object or array if surrounded by leading/trailing text
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let firstValid = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    firstValid = Math.min(firstBrace, firstBracket);
  } else {
    firstValid = Math.max(firstBrace, firstBracket);
  }

  if (firstValid > 0) {
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const lastValid = Math.max(lastBrace, lastBracket);
    if (lastValid > firstValid) {
      cleaned = cleaned.slice(firstValid, lastValid + 1).trim();
    }
  }

  return cleaned;
}

/**
 * Converts literal unescaped newlines, carriage returns, tabs, and ASCII control codes
 * occurring inside JSON string literals ("...") into valid JSON escape sequences.
 */
function fixUnescapedControlCharsInJson(str: string): string {
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (inString) {
      if (isEscaped) {
        result += char;
        isEscaped = false;
      } else if (char === '\\') {
        result += char;
        isEscaped = true;
      } else if (char === '"') {
        result += char;
        inString = false;
      } else if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        if (str[i + 1] !== '\n') {
          result += '\\n';
        }
      } else if (char === '\t') {
        result += '\\t';
      } else if (char.charCodeAt(0) < 32) {
        result += '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
      } else {
        result += char;
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }
  return result;
}

/**
 * Removes trailing commas in objects and arrays: `, }` -> `}` and `, ]` -> `]`.
 */
function removeTrailingCommas(str: string): string {
  return str.replace(/,(\s*[}\]])/g, '$1');
}

/**
 * Balances unclosed brackets/braces and closes unclosed strings for truncated JSON.
 */
function balanceJsonBrackets(raw: string): string {
  let inString = false;
  let isEscaped = false;
  const stack: string[] = [];

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === '\\') {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
      }
    }
  }

  let repaired = raw;
  if (inString) {
    repaired += '"';
  }
  repaired = repaired.replace(/,\s*$/, '');

  while (stack.length > 0) {
    const top = stack.pop();
    if (top === '{') repaired += '}';
    else if (top === '[') repaired += ']';
  }

  return repaired;
}

/**
 * Attempts to parse comma-separated or newline-separated (NDJSON) objects without outer brackets.
 */
function tryParseSequenceOrNdjson(str: string): any[] | null {
  const trimmed = str.trim();
  if (!trimmed.startsWith('[') && trimmed.startsWith('{')) {
    try {
      const wrapped = `[${trimmed}]`;
      const fixed = fixUnescapedControlCharsInJson(removeTrailingCommas(wrapped));
      const parsed = JSON.parse(fixed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Try line-by-line NDJSON
      const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const objects: any[] = [];
      for (const line of lines) {
        try {
          const p = JSON.parse(fixUnescapedControlCharsInJson(removeTrailingCommas(line.replace(/,$/, ''))));
          if (p && typeof p === 'object') objects.push(p);
        } catch {
          // ignore unparsable line
        }
      }
      if (objects.length > 0) return objects;
    }
  }
  return null;
}

/**
 * Normalizes a single raw object into a complete Song entity.
 */
export function normalizeSingleSong(s: any, idx = 0): Song {
  const content =
    s.content ||
    s.lyrics ||
    s.text ||
    s.chordpro ||
    s.body ||
    s.chords ||
    s.song_text ||
    s.tab ||
    (Array.isArray(s.lines)
      ? s.lines.map((l: any) => (typeof l === 'string' ? l : l?.text || '')).join('\n')
      : '') ||
    '';

  const title =
    s.title ||
    s.name ||
    s.songName ||
    s.song_title ||
    s.headline ||
    (s.id ? `Song ${s.id}` : `Song ${idx + 1}`);

  const author =
    s.author ||
    s.artist ||
    s.interpreter ||
    s.composer ||
    s.performer ||
    s.band ||
    s.group ||
    '';

  const artist =
    s.artist ||
    s.author ||
    s.interpreter ||
    s.composer ||
    s.performer ||
    s.band ||
    s.group ||
    '';

  return {
    id: s.id || idx + 1,
    title,
    name: title,
    author,
    artist,
    content,
    rating: s.rating,
  };
}

/**
 * Deeply extracts songs from any JSON object, array, or dictionary structure.
 */
function extractSongsFromAny(data: any): Song[] {
  if (!data) return [];

  // Array of items
  if (Array.isArray(data)) {
    const list: Song[] = [];
    data.forEach((item, idx) => {
      if (!item) return;
      const s = item.song || item.item || item;
      if (typeof s === 'object') {
        const title = s.title || s.name || s.songName || s.song_title;
        const content =
          s.content ||
          s.lyrics ||
          s.text ||
          s.chordpro ||
          s.body ||
          s.chords ||
          s.song_text ||
          (Array.isArray(s.lines) ? s.lines.join('\n') : '');
        if (title || content || s.artist || s.author) {
          list.push(normalizeSingleSong(s, idx));
        }
      }
    });
    if (list.length > 0) return list;
  }

  if (typeof data !== 'object') return [];

  // Check if data itself is a single song
  const selfTitle = data.title || data.name || data.songName;
  const selfContent =
    data.content ||
    data.lyrics ||
    data.text ||
    data.chordpro ||
    data.body ||
    data.chords ||
    data.lines;
  if ((selfTitle || selfContent) && (selfContent || data.author || data.artist)) {
    return [normalizeSingleSong(data, 0)];
  }

  // Known array property names across songbook export systems
  const arrayProps = [
    'songs',
    'songbookSongs',
    'songbook_songs',
    'items',
    'songList',
    'song_list',
    'trackList',
    'tracks',
    'list',
    'data',
    'results',
    'result',
    'payload',
    'content',
    'songs_list',
    'collection',
  ];

  for (const prop of arrayProps) {
    if (Array.isArray(data[prop])) {
      const extracted = extractSongsFromAny(data[prop]);
      if (extracted.length > 0) return extracted;
    }
  }

  // Known nested object container names
  const objProps = ['songbook', 'data', 'payload', 'result', 'response', 'collection', 'album'];
  for (const prop of objProps) {
    if (data[prop] && typeof data[prop] === 'object' && !Array.isArray(data[prop])) {
      const extracted = extractSongsFromAny(data[prop]);
      if (extracted.length > 0) return extracted;
    }
  }

  // Dictionary of songs (e.g. { "0": {...}, "1": {...} } or { "song_a": {...} })
  const values = Object.values(data);
  const songCandidates = values.filter(
    (v: any) =>
      v &&
      typeof v === 'object' &&
      (v.title || v.name || v.songName) &&
      (v.content || v.lyrics || v.text || v.chords || v.artist || v.author)
  );
  if (songCandidates.length > 0) {
    return songCandidates.map((s: any, idx: number) => normalizeSingleSong(s, idx));
  }

  // Exhaustive search over all object properties for any array containing songs
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key])) {
      const extracted = extractSongsFromAny(data[key]);
      if (extracted.length > 0) return extracted;
    }
  }

  return [];
}

/**
 * Fallback scanner that isolates and parses individual song JSON objects from raw text
 * even when the enclosing file is severely corrupted or truncated.
 */
function recoverSongsFromCorruptedText(raw: string): Song[] {
  const songs: Song[] = [];
  const regex = /\{[^{}]*"(?:title|name|content|lyrics|text|chordpro)"/gi;
  let match: RegExpExecArray | null;
  const visitedIndices = new Set<number>();

  const candidateStarts: number[] = [];
  while ((match = regex.exec(raw)) !== null) {
    candidateStarts.push(match.index);
  }

  for (const start of candidateStarts) {
    if (visitedIndices.has(start)) continue;

    let depth = 0;
    let inString = false;
    let isEscaped = false;
    let end = -1;

    for (let j = start; j < raw.length; j++) {
      const char = raw[j];
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (char === '\\') {
        isEscaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') depth++;
        else if (char === '}') {
          depth--;
          if (depth === 0) {
            end = j + 1;
            break;
          }
        }
      }
    }

    let slice = '';
    if (end !== -1) {
      slice = raw.slice(start, end);
      for (let k = start; k < end; k++) visitedIndices.add(k);
    } else {
      slice = raw.slice(start) + (inString ? '"' : '') + '}'.repeat(Math.max(1, depth));
    }

    const sanitized = fixUnescapedControlCharsInJson(removeTrailingCommas(slice));

    try {
      const parsed = JSON.parse(sanitized);
      const s = parsed.song || parsed.item || parsed;
      if (s && (s.title || s.name || s.content || s.lyrics || s.text)) {
        songs.push(normalizeSingleSong(s, songs.length));
      }
    } catch {
      // Regex field extraction fallback for this single object
      const titleM = slice.match(/"(?:title|name)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
      const contentM = slice.match(/"(?:content|lyrics|text|chords)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
      const artistM = slice.match(/"(?:artist|author|interpreter)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
      if (titleM || contentM) {
        songs.push(
          normalizeSingleSong(
            {
              title: titleM ? titleM[1] : undefined,
              content: contentM ? contentM[1] : undefined,
              artist: artistM ? artistM[1] : undefined,
            },
            songs.length
          )
        );
      }
    }
  }

  return songs;
}

/**
 * Attempts to parse or repair potentially truncated, malformed, unescaped,
 * or non-standard Songbook JSON with multi-pass recovery.
 */
export function safeParseSongbookJson(rawJson: string): {
  data: SongbookData;
  isRepaired: boolean;
  recoveredCount: number;
} {
  const rawCleaned = (rawJson || '').trim();
  if (!rawCleaned) {
    throw new Error('The provided JSON input is empty.');
  }

  const cleaned = preprocessJsonText(rawCleaned);

  // Attempt 1: Standard JSON.parse directly
  try {
    const parsed = JSON.parse(cleaned);
    const data = normalizeSongbookData(parsed);
    if (data.songs && data.songs.length > 0) {
      return { data, isRepaired: false, recoveredCount: data.songs.length };
    }
  } catch {
    // Continue to repair pipelines
  }

  // Attempt 2: Fix unescaped newlines/tabs inside strings and trailing commas
  try {
    const sanitized = fixUnescapedControlCharsInJson(removeTrailingCommas(cleaned));
    const parsed = JSON.parse(sanitized);
    const data = normalizeSongbookData(parsed);
    if (data.songs && data.songs.length > 0) {
      return { data, isRepaired: true, recoveredCount: data.songs.length };
    }
  } catch {
    // Continue
  }

  // Attempt 3: Balance unclosed braces/brackets for truncated JSON files
  try {
    const balanced = balanceJsonBrackets(cleaned);
    const sanitizedBalanced = fixUnescapedControlCharsInJson(removeTrailingCommas(balanced));
    const parsed = JSON.parse(sanitizedBalanced);
    const data = normalizeSongbookData(parsed);
    if (data.songs && data.songs.length > 0) {
      return { data, isRepaired: true, recoveredCount: data.songs.length };
    }
  } catch {
    // Continue
  }

  // Attempt 4: Try parsing NDJSON or comma-separated object sequences
  const seqObjects = tryParseSequenceOrNdjson(cleaned);
  if (seqObjects && seqObjects.length > 0) {
    const data = normalizeSongbookData(seqObjects);
    if (data.songs && data.songs.length > 0) {
      return { data, isRepaired: true, recoveredCount: data.songs.length };
    }
  }

  // Attempt 5: Robust individual object scanner and extractor
  const recoveredSongs = recoverSongsFromCorruptedText(cleaned);
  if (recoveredSongs.length > 0) {
    // Extract songbook title if available
    let songbookTitle = 'Recovered Songbook';
    const titleMatch = cleaned.match(/"(?:name|title|songbook)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
    if (titleMatch && titleMatch[1]) {
      try {
        songbookTitle = JSON.parse(`"${titleMatch[1]}"`);
      } catch {
        songbookTitle = titleMatch[1];
      }
    }

    return {
      data: {
        title: songbookTitle,
        name: songbookTitle,
        songs: recoveredSongs,
      },
      isRepaired: true,
      recoveredCount: recoveredSongs.length,
    };
  }

  throw new Error('Unable to parse JSON file. Please verify that the file contains song data with titles and lyrics.');
}

/**
 * Normalizes various songbook JSON structures into a unified SongbookData
 */
export function normalizeSongbookData(raw: any): SongbookData {
  if (!raw) return { title: 'Untitled Songbook', songs: [] };

  const songs = extractSongsFromAny(raw);

  let title = 'Songbook';
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    title =
      raw.name ||
      raw.title ||
      raw.songbookTitle ||
      raw.songbook_name ||
      raw.songbook?.name ||
      raw.songbook?.title ||
      'Songbook';
  }

  return {
    ...raw,
    title,
    name: title,
    songs,
  };
}

export const sectionRefRegex = /^(?:(?:\d+[\.\:]?|\(\d+\))|(?:REFR[EÉ]N|REFRAIN|REF|CHORUS|BRIDGE|VERSE|SLOKA|PRE-CHORUS|INTRO|OUTRO|SOLO|CODA|MEZIHRA|PŘEDEHRA|DOHRA|INTERLUDE|RIFF)(?:\s*\d+)?[\.\:]?|R\d*[\.\:]?)$/i;

/**
 * Checks if a line is a repetition notation line or chords-only line
 * (e.g. "|:{Am}{Asus2}{Am}{Asus2}:|", "|: [C] [G] :| (4x)", "{C} {G} {Am}", "Intro: [C] [D] [Am]").
 * On these lines, chords and repetition marks are rendered on the SAME line without an empty lyrics row.
 */
export function isRepetitionOrChordsOnlyLine(line: string): boolean {
  if (!line || !line.trim()) return false;

  // Extract all bracketed/braced contents
  const matches = line.match(/\{[^\}]+\}|\[[^\]]+\]/g);
  if (!matches) return false;

  // Check if at least one match is an actual chord (not a section reference)
  const hasActualChords = matches.some((m) => {
    const inner = m.slice(1, -1).trim();
    return !sectionRefRegex.test(inner);
  });
  if (!hasActualChords) return false;

  // Strip all chord and section ref brackets
  const withoutChords = line.replace(/\{[^\}]+\}|\[[^\]]+\]/g, '').trim();
  if (!withoutChords) return true; // Only chords and whitespace

  // Check if what remains outside chords consists strictly of repetition / bar / tempo / count notation
  // e.g. |: :| | || //: :// 1. 2. (4x) 2x %
  const stripped = withoutChords.replace(/[|:\\/!.\(\)\[\]\{\}\s0-9xX%*\-+~]/g, '');
  if (stripped.length === 0) return true;

  // Also check if what remains is a musical label prefix or note
  // e.g. Intro:, Solo:, Riff:, Mezihra:, Předehra:, Dohra:, Bridge:, Interlude:, Sloka:, Verse:, Chorus:
  const strippedNoLabels = stripped.replace(/^(?:Intro|Outro|Solo|Mezihra|Bridge|Coda|R|Ref|Refrén|Refrain|Chorus|Verse|Sloka|Riff|Interlude|Předehra|Dohra|Kytara|Guitar|Instr|Instrumental|Theme|Lead|Break|Takt|Bar|Akordy|Chords)[0-9]*[\.:]?$/i, '');
  return strippedNoLabels.length === 0;
}

export function parseChordLine(line: string): ChordChunk[] {
  if (!line) return [];
  
  // Fast path: if no brackets, braces, or spacing tags, return whole line as plain text
  if (line.indexOf('[') === -1 && line.indexOf('{') === -1) {
    return [{ chord: null, text: line }];
  }

  // Pre-process Kytario spacing tags into physical spaces only if present
  let processedLine = line;
  if (line.includes('{-') || line.includes('[-')) {
    processedLine = line.replace(/\{-{1,3}\}|\[-{1,3}\]/g, (m) => ' '.repeat(m.length - 2));
  }

  // Handle repetition / chords-only lines where chords and repetition marks are inline
  if (isRepetitionOrChordsOnlyLine(processedLine)) {
    const parts = processedLine.split(/(\{[^\}]+\}|\[[^\]]+\])/g);
    const chunks: ChordChunk[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      if ((part.startsWith('{') && part.endsWith('}')) || (part.startsWith('[') && part.endsWith(']'))) {
        const inner = part.slice(1, -1).trim();
        if (sectionRefRegex.test(inner)) {
          chunks.push({ chord: null, text: inner, isSectionRef: true });
        } else if (inner.length > 0) {
          chunks.push({ chord: inner, text: '' });
        }
      } else {
        const normalized = part.replace(/:\|\|:/g, ':| |:').replace(/:\|\s*\|:/g, ':| |:').trim();
        if (normalized.length > 0) {
          chunks.push({ chord: null, text: normalized });
        }
      }
    }
    return chunks;
  }

  const parts = processedLine.split(/(\{[^\}]+\}|\[[^\]]+\])/g);
  const chunks: ChordChunk[] = [];
  
  let currentChord: string | null = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if ((part.startsWith('[') && part.endsWith(']')) || (part.startsWith('{') && part.endsWith('}'))) {
      const inner = part.slice(1, -1).trim();
      
      // If it's a section reference (e.g. [REF] or [1.]), render it without brackets as an inline marker
      if (sectionRefRegex.test(inner)) {
        if (currentChord !== null) {
          chunks.push({ chord: currentChord, text: '' });
          currentChord = null;
        }
        chunks.push({ chord: null, text: inner, isSectionRef: true });
        continue;
      }

      if (currentChord !== null) {
        chunks.push({ chord: currentChord, text: '' });
      }
      currentChord = inner;
    } else {
      if (currentChord !== null || part.length > 0) {
        // Extract leading spaces to ensure text following a spaced chord starts *after* the chord's visual width
        const match = part.match(/^(\s*)(.*)$/);
        const leadingSpaces = match ? match[1] : '';
        const restText = match ? match[2] : '';
        
        if (leadingSpaces.length > 0) {
          chunks.push({ chord: currentChord, text: leadingSpaces });
          if (restText.length > 0) {
            chunks.push({ chord: null, text: restText });
          }
        } else {
          chunks.push({ chord: currentChord, text: part });
        }
        
        currentChord = null;
      }
    }
  }
  
  if (currentChord !== null) {
    chunks.push({ chord: currentChord, text: '' });
  }
  
  return chunks;
}

export const MIN_READABLE_LYRICS_FONT_SIZE = 9.0;
export const MIN_READABLE_CHORDS_FONT_SIZE = 9.0;

/**
 * Fast, analytical, O(1) font size scaling calculation for songs.
 * Computes the optimal scale ratio directly from layout geometry and song metrics,
 * calculating vertical height of sections including chords and empty line buffers.
 * Specifically ensures songs with fewer lines are rendered with a larger font size to fill the page,
 * while enforcing a strict minimum font size constraint to maintain readability.
 */
export function computeSmartFitScale(
  sections: SongSection[],
  settings: {
    pageFormat?: 'A4' | 'A5' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    columns?: number;
    titleFontSize?: number;
    artistFontSize?: number;
    lyricsFontSize?: number;
    chordsFontSize?: number;
    showChords?: boolean;
    smartFit?: boolean;
    pageMargin?: number;
    maxFontSizePx?: number;
  },
  hasTitle: boolean = true,
  hasArtist: boolean = false
): number {
  if (!settings.smartFit || !sections || sections.length === 0) {
    return 1.0;
  }

  const isLand = settings.orientation === 'landscape';
  const mmToPx = 3.779528; // Standard 96 DPI CSS pixels per mm

  let totalPxWidth = 210 * mmToPx;
  let totalPxHeight = 297 * mmToPx;

  switch (settings.pageFormat) {
    case 'A4':
      totalPxWidth = (isLand ? 297 : 210) * mmToPx;
      totalPxHeight = (isLand ? 210 : 297) * mmToPx;
      break;
    case 'A5':
      totalPxWidth = (isLand ? 210 : 148) * mmToPx;
      totalPxHeight = (isLand ? 148 : 210) * mmToPx;
      break;
    case 'Letter':
      totalPxWidth = (isLand ? 11 : 8.5) * 96;
      totalPxHeight = (isLand ? 8.5 : 11) * 96;
      break;
  }

  // Margin calculation: horizontal margin = pageMargin mm, vertical margin = round(pageMargin * 1.2) mm
  const marginMmX = settings.pageMargin ?? 5;
  const marginMmY = Math.round((settings.pageMargin ?? 5) * 1.2);
  const paddingY = (marginMmY * 2) * mmToPx;
  const paddingX = (marginMmX * 2) * mmToPx;

  const usableW = Math.max(200, totalPxWidth - paddingX);
  const usableH = Math.max(200, totalPxHeight - paddingY);

  const titleSize = Number(settings.titleFontSize) || 16;
  const artistSize = Number(settings.artistFontSize) || 16;
  const baseLyricsSize = Number(settings.lyricsFontSize) || 12;
  const baseChordsSize = Number(settings.chordsFontSize) || 12;

  // Title block height
  const titleBlockH = (hasTitle ? titleSize * 1.25 : 0) + (hasArtist ? artistSize * 1.25 : 0) + 18;
  const availColH = Math.max(100, usableH - titleBlockH - 24);

  const colCount = Math.max(1, settings.columns || 2);
  const colGap = colCount > 1 ? 24 : 0;
  const colWidth = (usableW - (colCount - 1) * colGap) / colCount;

  // Approximate character wrap limit (accounting for marker column indent if markers exist)
  const hasMarkers = sections.some(s => Boolean(s.marker && s.marker.trim()));
  let maxMarkerLen = 0;
  if (hasMarkers) {
    for (const s of sections) {
      if (s.marker) {
        const cleanMarker = s.marker.replace(/^\[(.*)\]$/, '$1').trim();
        maxMarkerLen = Math.max(maxMarkerLen, cleanMarker.length);
      }
    }
  }
  const markerColEm = maxMarkerLen <= 2 ? 1.85 : maxMarkerLen <= 4 ? 2.2 : Math.max(2.2, maxMarkerLen * 0.6 + 0.4);
  const effectiveColW = hasMarkers ? Math.max(80, colWidth - (baseLyricsSize * markerColEm)) : colWidth;
  const showChords = settings.showChords ?? true;

  // Strict minimum font size readability constraint
  const minLyricsScale = MIN_READABLE_LYRICS_FONT_SIZE / baseLyricsSize;
  const minChordsScale = MIN_READABLE_CHORDS_FONT_SIZE / baseChordsSize;
  const minScaleFloor = Math.max(0.55, Math.min(minLyricsScale, minChordsScale));

  // Analytical height evaluation at candidate scale factor s
  const calcHeightAtScale = (s: number): { height: number; maxWrapLines: number } => {
    const lSize = baseLyricsSize * s;
    const cSize = baseChordsSize * s;
    const avgCharW = lSize * 0.54;
    const charsPerCol = Math.max(16, Math.floor(effectiveColW / avgCharW));

    let maxWrapLines = 1;
    const sectionHeights: number[] = [];

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      let secH = 0;
      const pLines = sec.parsedLines;
      const hasLines = pLines && pLines.length > 0;

      // Standalone section marker line (e.g. [Intro] or [Refrain] with no text on same line)
      if (sec.marker && (!hasLines || pLines.every(l => l.isEmpty))) {
        secH += Math.round(lSize + 6);
      }

      for (let j = 0; j < pLines.length; j++) {
        const lineData = pLines[j];
        if (lineData.isEmpty) {
          // Empty line buffer: in SongDisplay rendered as <div className="h-3"></div> (12px)
          const emptyBufferH = Math.max(10, Math.round(12 * Math.min(1.4, s)));
          secH += emptyBufferH;
          continue;
        }

        // Accurately determine if line contains only chords (without lyric text)
        const isChordsOnly = lineData.isRepetitionLine ||
          (!lineData.chunks || !lineData.chunks.some((c: any) => c.text && c.text.trim().length > 0 && !c.isSectionRef));

        const textLen = lineData.raw.replace(/\[[^\]]*\]|\{[^\}]*\}/g, '').length;
        let chordsLen = 0;
        const hasChords = lineData.hasChords && showChords;
        if (hasChords && lineData.chunks) {
          for (const c of lineData.chunks) {
            if (c.chord) chordsLen += c.chord.length + 2;
          }
        }
        const effectiveChars = Math.max(textLen, chordsLen);
        const visualLines = Math.max(1, Math.ceil(effectiveChars / charsPerCol));
        maxWrapLines = Math.max(maxWrapLines, visualLines);

        if (isChordsOnly) {
          // Repetition or chord-only line: minHeight: (chords-size + 4) + 0px margin
          const chordLineH = Math.round((cSize + 4) * 1.05);
          secH += chordLineH * visualLines;
        } else if (hasChords) {
          // Both chords and lyrics: minHeight: (chords-size + lyrics-size + 4) + 5px margin
          const chordLyricLineH = Math.round((cSize + lSize + 4) * 1.05 + 5);
          secH += chordLyricLineH * visualLines;
        } else {
          // Lyrics only: minHeight: (lyrics-size + 4) + 5px margin
          const lyricLineH = Math.round((lSize + 4) * 1.05 + 5);
          secH += lyricLineH * visualLines;
        }
      }

      // Section spacing buffer: in SongDisplay rendered as mb-4 (16px)
      const sectionBufferH = Math.max(14, Math.round(16 * Math.min(1.3, s)));
      secH += sectionBufferH;
      sectionHeights.push(secH);
    }

    const total = sectionHeights.reduce((a, b) => a + b, 0);
    if (colCount <= 1 || sections.length <= 1) {
      return { height: total, maxWrapLines };
    }

    // Balance multi-column distribution simulating CSS columnFill: 'balance' & break-inside: avoid
    const maxSec = Math.max(...sectionHeights);
    let low = Math.max(Math.ceil(total / colCount), Math.min(maxSec, Math.ceil(availColH * 0.95)));
    let high = total;
    let best = total;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      let colsNeeded = 1;
      let currentH = 0;
      for (const h of sectionHeights) {
        if (currentH + h > mid) {
          colsNeeded++;
          currentH = h;
        } else {
          currentH += h;
        }
      }
      if (colsNeeded <= colCount) {
        best = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return { height: best, maxWrapLines };
  };

  // Evaluate baseline scale 1.0
  const { height: baseHeight } = calcHeightAtScale(1.0);

  if (baseHeight > availColH) {
    // Overflow -> scale down smoothly with safety margin so the song fits on 1 page
    // STRICT CONSTRAINT: Never scale below minScaleFloor to guarantee readable fonts (>= 9.0px)
    const ratio = (availColH * 0.96) / Math.max(availColH, baseHeight);
    const clampedScale = Math.max(minScaleFloor, Math.min(0.98, ratio));
    return Math.round(clampedScale * 100) / 100;
  }

  // Song fits at scale 1.0 -> determine optimal upscale parameters based on line count and section density
  const totalNonEmptyLines = sections.reduce((acc, sec) => acc + sec.parsedLines.filter(l => !l.isEmpty).length, 0);
  const linesPerCol = totalNonEmptyLines / colCount;

  // Songs with fewer lines get a higher upscale limit and targeted column filling to eliminate vast empty space
  let maxUpscale = 1.50;
  let targetColUtilization = 0.90;
  let maxWrapLinesLimit = 2;

  if (linesPerCol <= 12) {
    // Very short song (e.g. <= 24 lines in 2 columns, or <= 12 lines in 1 column)
    maxUpscale = 2.25;
    targetColUtilization = 0.94;
    maxWrapLinesLimit = 3;
  } else if (linesPerCol <= 18) {
    // Short song (e.g. Wish You Were Here with ~24-30 lines across 2 columns)
    maxUpscale = 1.95;
    targetColUtilization = 0.93;
    maxWrapLinesLimit = 3;
  } else if (linesPerCol <= 25) {
    // Medium-short song
    maxUpscale = 1.70;
    targetColUtilization = 0.91;
    maxWrapLinesLimit = 2;
  } else {
    // Denser song
    maxUpscale = 1.50;
    targetColUtilization = 0.90;
    maxWrapLinesLimit = 2;
  }

  // Apply user-configured max font size in px
  const maxFontSizePx = (typeof settings.maxFontSizePx === 'number' && settings.maxFontSizePx > 0)
    ? settings.maxFontSizePx
    : 32;
    
  // Convert px to pt (1pt = 1.333px, so px * 0.75 = pt)
  const maxFontSizePt = maxFontSizePx * (72 / 96);
  
  // Constrain maxUpscale based on the font cap
  const fontCapMultiplier = maxFontSizePt / baseLyricsSize;
  maxUpscale = Math.min(maxUpscale, fontCapMultiplier);

  // If maxUpscale is constrained to <= 1.0, do not upscale short songs beyond 1.0
  if (maxUpscale <= 1.0) {
    return 1.0;
  }

  const targetMaxH = availColH * targetColUtilization;
  let bestScale = 1.0;

  let low = 1.0;
  let high = maxUpscale;
  for (let step = 0; step < 9; step++) {
    const mid = (low + high) / 2;
    const { height, maxWrapLines } = calcHeightAtScale(mid);
    if (height <= targetMaxH && maxWrapLines <= maxWrapLinesLimit) {
      bestScale = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.round(bestScale * 100) / 100;
}

export function computeSongFitDebug(
  song: Song,
  index: number,
  settings: PrintSettings
): SongFitDebugInfo {
  const title = song.title || song.name || `Song #${index + 1}`;
  const artist = song.artist || song.author || song.interpreter || '';
  const text = song.text || song.content || song.lyrics || '';
  const sections = parseSongContent(text);
  const rawLines = text ? text.split('\n') : [];
  const rawLinesCount = rawLines.length;
  const nonEmptyLinesCount = rawLines.filter((l) => l.trim().length > 0).length;
  const sectionLinesCount = sections.reduce((acc, s) => acc + s.lines.length, 0);

  const isLand = settings.orientation === 'landscape';
  const mmToPx = 3.779528;

  let totalPxWidth = 210 * mmToPx;
  let totalPxHeight = 297 * mmToPx;

  switch (settings.pageFormat) {
    case 'A4':
      totalPxWidth = (isLand ? 297 : 210) * mmToPx;
      totalPxHeight = (isLand ? 210 : 297) * mmToPx;
      break;
    case 'A5':
      totalPxWidth = (isLand ? 210 : 148) * mmToPx;
      totalPxHeight = (isLand ? 148 : 210) * mmToPx;
      break;
    case 'Letter':
      totalPxWidth = (isLand ? 11 : 8.5) * 96;
      totalPxHeight = (isLand ? 8.5 : 11) * 96;
      break;
  }

  const marginMmX = settings.pageMargin ?? 5;
  const marginMmY = Math.round((settings.pageMargin ?? 5) * 1.2);
  const paddingY = (marginMmY * 2) * mmToPx;
  const paddingX = (marginMmX * 2) * mmToPx;

  const usableW = Math.max(200, totalPxWidth - paddingX);
  const usableH = Math.max(200, totalPxHeight - paddingY);

  const titleSize = Number(settings.titleFontSize) || 16;
  const artistSize = Number(settings.artistFontSize) || 16;
  const baseLyricsSize = Number(settings.lyricsFontSize) || 12;
  const baseChordsSize = Number(settings.chordsFontSize) || 12;

  const titleBlockH = (title ? titleSize * 1.25 : 0) + (artist ? artistSize * 1.25 : 0) + 18;
  const availColH = Math.max(100, usableH - titleBlockH - 24);

  const colCount = Math.max(1, settings.columns || 2);
  const colGap = colCount > 1 ? 24 : 0;
  const colWidth = (usableW - (colCount - 1) * colGap) / colCount;

  const hasMarkers = sections.some((s) => Boolean(s.marker && s.marker.trim()));
  let maxMarkerLen = 0;
  if (hasMarkers) {
    for (const s of sections) {
      if (s.marker) {
        const cleanMarker = s.marker.replace(/^\[(.*)\]$/, '$1').trim();
        maxMarkerLen = Math.max(maxMarkerLen, cleanMarker.length);
      }
    }
  }
  const markerColEm = maxMarkerLen <= 2 ? 1.85 : maxMarkerLen <= 4 ? 2.2 : Math.max(2.2, maxMarkerLen * 0.6 + 0.4);
  const effectiveColW = hasMarkers ? Math.max(80, colWidth - baseLyricsSize * markerColEm) : colWidth;
  const showChords = settings.showChords ?? true;

  // Strict minimum readable font constraint (9.0px)
  const minLyricsScale = MIN_READABLE_LYRICS_FONT_SIZE / baseLyricsSize;
  const minChordsScale = MIN_READABLE_CHORDS_FONT_SIZE / baseChordsSize;
  const minScaleFloor = Math.max(0.55, Math.min(minLyricsScale, minChordsScale));

  const calcHeightAtScale = (s: number) => {
    const lSize = baseLyricsSize * s;
    const cSize = baseChordsSize * s;
    const avgCharW = lSize * 0.54;
    const charsPerCol = Math.max(16, Math.floor(effectiveColW / avgCharW));

    let maxWrapLines = 1;
    let totalVisualLines = 0;
    const sectionHeights: number[] = [];
    const secDetails: Array<{ marker: string; lineCount: number; estimatedHeight: number }> = [];

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      let secH = 0;
      const pLines = sec.parsedLines;
      const hasLines = pLines && pLines.length > 0;

      if (sec.marker && (!hasLines || pLines.every(l => l.isEmpty))) {
        secH += Math.round(lSize + 6);
      }

      for (let j = 0; j < pLines.length; j++) {
        const lineData = pLines[j];
        if (lineData.isEmpty) {
          const emptyBufferH = Math.max(10, Math.round(12 * Math.min(1.4, s)));
          secH += emptyBufferH;
          totalVisualLines += 1;
          continue;
        }

        const isChordsOnly =
          lineData.isRepetitionLine ||
          (!lineData.chunks || !lineData.chunks.some((c: any) => c.text && c.text.trim().length > 0 && !c.isSectionRef));

        const textLen = lineData.raw.replace(/\[[^\]]*\]|\{[^\}]*\}/g, '').length;
        let chordsLen = 0;
        const hasChords = lineData.hasChords && showChords;
        if (hasChords && lineData.chunks) {
          for (const c of lineData.chunks) {
            if (c.chord) chordsLen += c.chord.length + 2;
          }
        }
        const effectiveChars = Math.max(textLen, chordsLen);
        const visualLines = Math.max(1, Math.ceil(effectiveChars / charsPerCol));
        maxWrapLines = Math.max(maxWrapLines, visualLines);
        totalVisualLines += visualLines;

        if (isChordsOnly) {
          const lineH = Math.round((cSize + 4) * 1.05 + 2);
          secH += lineH * visualLines;
        } else if (hasChords) {
          const chordLyricLineH = Math.round((cSize + lSize + 4) * 1.05 + 2);
          secH += chordLyricLineH * visualLines;
        } else {
          const lyricLineH = Math.round((lSize + 4) * 1.05 + 2);
          secH += lyricLineH * visualLines;
        }
      }
      const sectionBufferH = Math.max(14, Math.round(16 * Math.min(1.3, s)));
      secH += sectionBufferH;
      sectionHeights.push(secH);
      secDetails.push({
        marker: sec.marker || `[Part ${i + 1}]`,
        lineCount: sec.lines.length,
        estimatedHeight: Math.round(secH),
      });
    }

    const total = sectionHeights.reduce((a, b) => a + b, 0);
    if (colCount <= 1 || sections.length <= 1) {
      return { height: total, maxWrapLines, totalVisualLines, secDetails };
    }

    const maxSec = Math.max(...sectionHeights);
    let low = Math.max(Math.ceil(total / colCount), Math.min(maxSec, Math.ceil(availColH * 0.95)));
    let high = total;
    let best = total;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      let colsNeeded = 1;
      let currentH = 0;
      for (const h of sectionHeights) {
        if (currentH + h > mid) {
          colsNeeded++;
          currentH = h;
        } else {
          currentH += h;
        }
      }
      if (colsNeeded <= colCount) {
        best = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return { height: best, maxWrapLines, totalVisualLines, secDetails };
  };

  const computedScale = computeSmartFitScale(sections, settings, Boolean(title), Boolean(artist));
  const resultAtScale = calcHeightAtScale(computedScale);
  const chosenLyricsFontSize = Math.round(baseLyricsSize * computedScale * 10) / 10;
  const chosenChordsFontSize = Math.round(baseChordsSize * computedScale * 10) / 10;
  const heightUtilization = Math.round((resultAtScale.height / availColH) * 100);

  // Check if minimum readability constraint was active
  const baseEval = calcHeightAtScale(1.0);
  const isMinConstraintActive = baseEval.height > availColH && computedScale <= (minScaleFloor + 0.01);

  return {
    songIndex: index,
    title,
    artist,
    totalLines: nonEmptyLinesCount,
    rawLinesCount,
    nonEmptyLinesCount,
    sectionLinesCount,
    sectionsCount: sections.length,
    visualLinesAtScale: resultAtScale.totalVisualLines,
    baseLyricsFontSize: baseLyricsSize,
    baseChordsFontSize: baseChordsSize,
    baseTitleFontSize: titleSize,
    computedScale,
    chosenLyricsFontSize,
    chosenChordsFontSize,
    minFontSizeConstraint: MIN_READABLE_LYRICS_FONT_SIZE,
    isMinConstraintActive,
    calculatedHeight: Math.round(resultAtScale.height),
    availColHeight: Math.round(availColH),
    heightUtilization,
    columns: colCount,
    maxWrapLines: resultAtScale.maxWrapLines,
    pageFormat: settings.pageFormat,
    orientation: settings.orientation,
    smartFitEnabled: Boolean(settings.smartFit),
    sectionsDetail: resultAtScale.secDetails,
  };
}

export function parseSongContent(content: string): SongSection[] {
  if (!content) return [];
  const strContent =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
      ? (content as any[]).join('\n')
      : String(content);
  if (!strContent.trim()) return [];

  const cached = songContentCache.get(strContent);
  if (cached) return cached;

  const sections: SongSection[] = [];
  const rawLines = strContent.split('\n');

  let currentSection: SongSection | null = null;
  const markerRegex = /^(?:(\d+[\.\:]|\(\d+\))|(?:REFR[EÉ]N|REFRAIN|REF|CHORUS|BRIDGE|VERSE|SLOKA|PRE-CHORUS|INTRO|OUTRO|SOLO|CODA|MEZIHRA|PŘEDEHRA|DOHRA|INTERLUDE|RIFF)(?:\s*\d+)?[\.\:]?|R\d*[\.\:]|\(R\d*\))(?:\s+|(?=\[)|(?=\{)|$)/i;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trimEnd();

    // 1. Explicit dash marker (e.g. "- REF", "- [REF]", "- 1.", "- [1.]")
    if (line.startsWith('- ')) {
      let marker = line.substring(2).trim();
      if (marker.startsWith('[') && marker.endsWith(']')) {
        marker = marker.slice(1, -1).trim();
      }
      const upperMarker = marker.toUpperCase();
      const isRefrain = upperMarker.includes('REF') || upperMarker.includes('R') || upperMarker.includes('CHORUS');
      currentSection = { marker, isRefrain, lines: [], parsedLines: [] };
      sections.push(currentSection);
      continue;
    }

    // 2. Empty line indicates end of previous section/verse
    if (line.trim() === '') {
      if (currentSection && currentSection.lines.some(l => l.trim() !== '')) {
        currentSection = null;
      }
      continue;
    }

    // 3a. Bracketed section marker at line start (e.g. "[1.]", "[REF]", "[R]")
    const bracketMatch = line.match(/^\[([^\]]+)\](?:\s+(.*)|$)/);
    if (bracketMatch && sectionRefRegex.test(bracketMatch[1].trim()) && (!currentSection || currentSection.lines.some(l => l.trim() !== ''))) {
      const marker = bracketMatch[1].trim();
      const upperMarker = marker.toUpperCase();
      const isRefrain = upperMarker.includes('REF') || upperMarker.includes('R') || upperMarker.includes('CHORUS');
      const textAfterMarker = bracketMatch[2] || '';

      currentSection = { marker, isRefrain, lines: [], parsedLines: [] };
      sections.push(currentSection);
      if (textAfterMarker.trim() !== '') {
        currentSection.lines.push(textAfterMarker);
      }
      continue;
    }

    // 3b. Check if line starts with a marker (e.g. "1. ", "R: ", "Chorus:")
    const match = line.match(markerRegex);
    if (match && (!currentSection || currentSection.lines.some(l => l.trim() !== ''))) {
      let marker = match[1];
      if (marker.startsWith('[') && marker.endsWith(']')) {
        marker = marker.slice(1, -1).trim();
      }
      const upperMarker = marker.toUpperCase();
      const isRefrain = upperMarker.includes('REF') || upperMarker.includes('R') || upperMarker.includes('CHORUS');
      const textAfterMarker = line.substring(match[0].length);

      currentSection = { marker, isRefrain, lines: [], parsedLines: [] };
      sections.push(currentSection);
      if (textAfterMarker.trim() !== '') {
        currentSection.lines.push(textAfterMarker);
      }
      continue;
    }

    // 4. Regular line
    if (!currentSection) {
      currentSection = { marker: '', isRefrain: false, lines: [], parsedLines: [] };
      sections.push(currentSection);
    }

    currentSection.lines.push(line);
  }

  for (const sec of sections) {
    while (sec.lines.length > 0 && sec.lines[sec.lines.length - 1].trim() === '') {
      sec.lines.pop();
    }
    // Pre-calculate parsedLines for fast zero-cost rendering
    sec.parsedLines = sec.lines.map((line) => {
      const isEmpty = line.trim() === '';
      const chunks = isEmpty ? [] : parseChordLine(line);
      const hasChords = chunks.some((c) => c.chord !== null);
      const hasActualLyricText = chunks.some((c) => c.text && c.text.trim().length > 0 && !c.isSectionRef);
      const isRep = !isEmpty && (isRepetitionOrChordsOnlyLine(line) || (hasChords && !hasActualLyricText));
      return { raw: line, isEmpty, chunks, hasChords, isRepetitionLine: isRep };
    });
  }

  const result = sections.filter(s => s.lines.length > 0 || s.marker !== '');
  
  if (songContentCache.size >= MAX_CACHE_SIZE) {
    songContentCache.clear();
  }
  songContentCache.set(strContent, result);

  return result;
}

/**
 * Adjusts or inverts color for legibility in dark mode preview while preserving original print colors.
 */
export function getDisplayColor(colorHex: string, isDarkMode: boolean): string {
  if (!isDarkMode) return colorHex;
  if (!colorHex) return '#f4f4f5';
  try {
    let hex = colorHex.replace('#', '').trim();
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (luminance < 0.5) {
        return `rgb(${255 - r}, ${255 - g}, ${255 - b})`;
      }
    }
  } catch (e) {
    // fallback
  }
  return colorHex;
}

