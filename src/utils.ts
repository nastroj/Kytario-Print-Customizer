import { SongbookData, Song } from './types';

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

  const parts = processedLine.split(/(\{[^\}]+\}|\[[^\]]+\])/g);
  const chunks: ChordChunk[] = [];
  
  let currentChord: string | null = null;
  
  const sectionRefRegex = /^(?:REF|R|CHORUS|BRIDGE|VERSE|PRE-CHORUS|INTRO|OUTRO|SOLO|CODA)[a-z]*\s*\d*[\.\:]?$/i;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if ((part.startsWith('[') && part.endsWith(']')) || (part.startsWith('{') && part.endsWith('}'))) {
      const inner = part.slice(1, -1);
      
      // If it's a section reference, treat it as inline text rather than an overhead chord
      if (part.startsWith('[') && sectionRefRegex.test(inner)) {
        if (currentChord !== null) {
          chunks.push({ chord: currentChord, text: '' });
          currentChord = null;
        }
        chunks.push({ chord: null, text: part, isSectionRef: true });
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

/**
 * Fast, analytical, O(1) font size scaling calculation for songs.
 * Computes the optimal scale ratio directly from layout geometry and song metrics,
 * eliminating synchronous DOM layout thrashing and while-loops.
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

  // Padding: px-[5mm] py-[6mm] (Total Y: 12mm = 45.35px, Total X: 10mm = 37.8px)
  const paddingY = 12 * mmToPx;
  const paddingX = 10 * mmToPx;

  const usableW = Math.max(200, totalPxWidth - paddingX);
  const usableH = Math.max(200, totalPxHeight - paddingY);

  const titleSize = Number(settings.titleFontSize) || 16;
  const artistSize = Number(settings.artistFontSize) || 12;
  const lyricsSize = Number(settings.lyricsFontSize) || 12;
  const chordsSize = Number(settings.chordsFontSize) || 10;

  // Title block height
  const titleBlockH = (hasTitle ? titleSize * 1.25 : 0) + (hasArtist ? artistSize * 1.25 : 0) + 18;
  const availColH = Math.max(100, usableH - titleBlockH - 24);

  const colCount = Math.max(1, settings.columns || 2);
  const colGap = colCount > 1 ? 24 : 0;
  const colWidth = (usableW - (colCount - 1) * colGap) / colCount;

  // Approximate character wrap limit (accounting for marker column indent if markers exist)
  const hasMarkers = sections.some(s => Boolean(s.marker && s.marker.trim()));
  const effectiveColW = hasMarkers ? Math.max(80, colWidth - (lyricsSize * 2.2)) : colWidth;
  const avgCharWidth = lyricsSize * 0.54;
  const charsPerCol = Math.max(16, Math.floor(effectiveColW / avgCharWidth));

  let totalContentH = 0;
  let maxSectionH = 0;

  for (let s = 0; s < sections.length; s++) {
    const sec = sections[s];
    let secH = 0;
    const pLines = sec.parsedLines;
    for (let l = 0; l < pLines.length; l++) {
      const lineData = pLines[l];
      if (lineData.isEmpty) {
        secH += 12;
      } else {
        const textLen = lineData.raw.replace(/\[[^\]]*\]|\{[^\}]*\}/g, '').length;
        const visualLines = Math.max(1, Math.ceil(textLen / charsPerCol));
        const hasChords = lineData.hasChords && settings.showChords;
        const chordH = hasChords ? chordsSize * 1.25 : 0;
        const lyricH = lyricsSize * 1.35;
        secH += (chordH + lyricH + 2) * visualLines;
      }
    }
    secH += 16; // 16px bottom margin (mb-4)
    totalContentH += secH;
    if (secH > maxSectionH) {
      maxSectionH = secH;
    }
  }

  // CSS column-count splits sections across columns, avoiding breaks inside sections
  const estimatedColH = colCount > 1 
    ? Math.max(maxSectionH, (totalContentH / colCount) * 1.05) 
    : totalContentH;

  let targetScale = 1.0;

  if (estimatedColH > availColH) {
    // Overflow -> scale down smoothly
    const ratio = (availColH * 0.95) / Math.max(availColH, estimatedColH);
    targetScale = Math.max(0.50, Math.min(0.98, ratio));
  } else if (estimatedColH < availColH * 0.82) {
    // Short song -> scale up moderately for clarity and legibility, capped to a sensible maximum (1.20)
    const fillRatio = (availColH * 0.85) / Math.max(30, estimatedColH);
    targetScale = Math.min(1.20, Math.max(1.0, fillRatio));
  }

  return Math.round(targetScale * 100) / 100;
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
  const markerRegex = /^(\d+[\.\:]|\(\d+\)|(?:REF|R|CHORUS|BRIDGE|VERSE|PRE-CHORUS|INTRO|OUTRO|SOLO|CODA)[a-z]*\s*\d*[\.\:]?)(?:\s+|(?=\[)|(?=\{)|$)/i;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trimEnd();

    // 1. Explicit dash marker (e.g. "- REF", "- 1.")
    if (line.startsWith('- ')) {
      const marker = line.substring(2).trim();
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

    // 3. Check if line starts with a marker (e.g. "1. ", "R: ", "Chorus:")
    const match = line.match(markerRegex);
    if (match && (!currentSection || currentSection.lines.some(l => l.trim() !== ''))) {
      const marker = match[1];
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
      return { raw: line, isEmpty, chunks, hasChords };
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

