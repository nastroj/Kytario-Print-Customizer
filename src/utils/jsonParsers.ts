/**
 * Robust songbook JSON parsing: repairs malformed JSON and recovers songs from
 * corrupted or truncated Kytario payloads.
 */
import { SongbookData, Song } from '../types';
import { extractSongbookUrlAndSlug, normalizeSongbookData } from './urlHelpers';

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
 * Converts Kytario AST token sections into ChordPro formatted text.
 */
export function convertKytarioSectionsToChordpro(sections: any[]): string {
  if (!Array.isArray(sections) || sections.length === 0) return '';
  let fullText = '';
  for (const sec of sections) {
    if (!sec) continue;
    // Always add a section title line to distinguish from inline references, even if empty
    const title = (sec.title && String(sec.title).trim()) || '';
    fullText += `- ${title}`.trim() + '\n';
    
    if (Array.isArray(sec.tokens)) {
      for (const t of sec.tokens) {
        if (!t) continue;
        if (t.type === 0) {
          fullText += t.content !== undefined ? String(t.content) : '';
        } else if (t.type === 1 || t.type === 2) {
          const chord = t.content !== undefined ? String(t.content).trim() : '';
          if (chord) {
            fullText += `[${chord}]`;
          }
        } else if (t.type === 3) {
          const count = Number(t.content) || 1;
          fullText += ' '.repeat(Math.max(1, count));
        } else if (t.type === 4) {
          fullText += '|: ';
        } else if (t.type === 5) {
          const count = t.content !== undefined ? String(t.content) : '2';
          fullText += ` :| (${count}x)`;
        } else if (t.type === 6) {
          fullText += '\n';
        } else if (t.content !== undefined) {
          fullText += String(t.content);
        }
      }
    } else if (typeof sec.content === 'string') {
      fullText += sec.content;
    } else if (typeof sec.text === 'string') {
      fullText += sec.text;
    }
    fullText += '\n\n';
  }
  return fullText.trim();
}

/**
 * Internal helper to find string content from a potential song object field.
 */
function getStringContent(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    return val.map((l: any) => (typeof l === 'string' ? l : l?.text || l?.content || l?.val || l?.line || l?.text_original || l?.lyrics || '')).join('\n');
  }
  if (typeof val === 'object') {
    return val.text || val.content || val.lyrics || val.body || val.val || val.raw || val.text_original || val.original_text || val.chordpro || '';
  }
  return String(val);
}

/**
 * Normalizes a single raw object into a complete Song entity.
 */
export function normalizeSingleSong(s: any, idx = 0): Song {
  let content = '';
  if (Array.isArray(s.sections) && s.sections.some((sec: any) => sec && Array.isArray(sec.tokens))) {
    content = convertKytarioSectionsToChordpro(s.sections);
  }

  if (!content) {
    content =
      getStringContent(s.content) ||
      getStringContent(s.lyrics) ||
      getStringContent(s.text) ||
      getStringContent(s.chordpro) ||
      getStringContent(s.body) ||
      getStringContent(s.chords) ||
      getStringContent(s.song_text) ||
      getStringContent(s.text_original) ||
      getStringContent(s.original_text) ||
      getStringContent(s.tab) ||
      getStringContent(s.lines) ||
      '';
  }

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
    title: String(title),
    name: String(title),
    author: String(author),
    artist: String(artist),
    content: String(content),
    rating: s.rating,
  };
}

/**
 * Deeply extracts songs from any JSON object, array, or dictionary structure.
 * Uses a non-short-circuiting approach to collect all possible songs across multiple properties.
 */
export function extractSongsFromAny(data: any, seen = new Set()): Song[] {
  if (!data || seen.has(data)) return [];
  if (typeof data === 'object') seen.add(data);

  const songs: Song[] = [];

  // 1. Handle Arrays (e.g. [ {song}, {song} ] or [ {section}, {section} ])
  if (Array.isArray(data)) {
    for (const item of data) {
      if (!item) continue;
      // Kytario sometimes wraps songs in an 'item' or 'song' property
      const s = item.song || item.item || item;
      if (typeof s === 'object') {
        const nested = extractSongsFromAny(s, seen);
        songs.push(...nested);
      }
    }
    return songs;
  }

  if (typeof data !== 'object') return [];

  // 2. Check if the current object IS a song
  const hasTitle = !!(data.title || data.name || data.songName || data.song_title || data.song_name || data.headline || data.title_name);
  
  const contentValue = 
    data.content ||
    data.lyrics ||
    data.text ||
    data.chordpro ||
    data.body ||
    data.chords ||
    data.song_text ||
    data.text_original ||
    data.original_text ||
    data.tab ||
    data.lines;

  const hasTokenSections = Array.isArray(data.sections) && data.sections.some((sec: any) => sec && Array.isArray(sec.tokens) && sec.tokens.length > 0);

  const hasContent = hasTokenSections || !!(
    (typeof contentValue === 'string' && contentValue.trim().length > 0) ||
    (Array.isArray(contentValue) && contentValue.length > 0) ||
    (typeof contentValue === 'object' && contentValue !== null && Object.keys(contentValue).length > 0)
  );

  // A song is identified if it has content OR a title.
  // We prioritize objects with content to avoid treating entire sections as single songs if they have a title.
  if (hasContent && hasTitle) {
    songs.push(normalizeSingleSong(data, songs.length));
    return songs;
  }
  
  // If it ONLY has content, it's probably a song without a title
  if (hasContent && !hasTitle) {
    songs.push(normalizeSingleSong(data, songs.length));
    return songs;
  }

  // If it ONLY has a title, it might be a song metadata or a section header.
  // We'll peek into properties to see if it's a container first.
  const commonProps = [
    'songs',
    'songbookSongs',
    'songbook_songs',
    'sections',
    'items',
    'songList',
    'song_list',
    'trackList',
    'tracks',
    'track',
    'recordings',
    'data',
    'payload',
    'result',
    'results',
    'collection',
    'song_items'
  ];

  let hasNestedSongs = false;
  for (const prop of commonProps) {
    if (data[prop] && (Array.isArray(data[prop]) || typeof data[prop] === 'object')) {
      hasNestedSongs = true;
      break;
    }
  }

  if (hasTitle && !hasNestedSongs) {
    // Looks like a song metadata (title only), we import it as a song with empty lyrics
    // This allows ToC to be populated even if lyrics fetch fails for some reason.
    songs.push(normalizeSingleSong(data, songs.length));
    return songs;
  }

  // 3. Otherwise, look for songs in common property names
  for (const prop of commonProps) {
    if (data[prop]) {
      // Special case for sections that might contain songs directly
      if ((prop === 'sections' || prop === 'items') && Array.isArray(data[prop])) {
        for (const item of data[prop]) {
          if (item && item.songs && Array.isArray(item.songs)) {
            songs.push(...extractSongsFromAny(item.songs, seen));
          } else {
            songs.push(...extractSongsFromAny(item, seen));
          }
        }
      } else {
        songs.push(...extractSongsFromAny(data[prop], seen));
      }
    }
  }

  // 4. If still no songs found, perform exhaustive search over all object properties
  if (songs.length === 0) {
    for (const key of Object.keys(data)) {
      if (commonProps.includes(key)) continue; // Already checked
      if (data[key] && typeof data[key] === 'object') {
        // Only recurse into objects that might be containers (avoiding circular or massive depth if possible)
        songs.push(...extractSongsFromAny(data[key], seen));
      }
    }
  }

  // 5. Last resort: If we found no "proper" songs but the object has a title and some non-standard content field,
  // we could try one more normalization, but the logic above usually catches it.

  return songs;
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
    const data = normalizeSongbookData(parsed, cleaned);
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
    const data = normalizeSongbookData(parsed, sanitized);
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
    const data = normalizeSongbookData(parsed, sanitizedBalanced);
    if (data.songs && data.songs.length > 0) {
      return { data, isRepaired: true, recoveredCount: data.songs.length };
    }
  } catch {
    // Continue
  }

  // Attempt 4: Try parsing NDJSON or comma-separated object sequences
  const seqObjects = tryParseSequenceOrNdjson(cleaned);
  if (seqObjects && seqObjects.length > 0) {
    const data = normalizeSongbookData(seqObjects, cleaned);
    if (data.songs && data.songs.length > 0) {
      return { data, isRepaired: true, recoveredCount: data.songs.length };
    }
  }

  // Attempt 5: Robust individual object scanner and extractor
  const recoveredSongs = recoverSongsFromCorruptedText(cleaned);
  if (recoveredSongs.length > 0) {
    // Extract songbook title if available
    let songbookTitle = 'Recovered Songbook';
    const titleMatch = cleaned.match(/"(?:name|title|songbookTitle|songbook)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
    if (titleMatch && titleMatch[1]) {
      try {
        songbookTitle = JSON.parse(`"${titleMatch[1]}"`);
      } catch {
        songbookTitle = titleMatch[1];
      }
    }

    const urlInfo = extractSongbookUrlAndSlug(null, cleaned);

    return {
      data: {
        title: songbookTitle,
        name: songbookTitle,
        url: urlInfo.url,
        shortUrl: urlInfo.shortUrl,
        slug: urlInfo.slug,
        songs: recoveredSongs,
      },
      isRepaired: true,
      recoveredCount: recoveredSongs.length,
    };
  }

  throw new Error('Unable to parse JSON file. Please verify that the file contains song data with titles and lyrics.');
}
