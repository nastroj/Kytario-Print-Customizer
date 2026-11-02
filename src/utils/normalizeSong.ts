/**
 * Normalization of raw imported JSON objects into Song entities, including
 * deep extraction from arbitrary structures and fallback recovery scanning
 * for severely corrupted/truncated files.
 */
import type { Song } from '../types';
import {
  asRecord,
  firstRawString,
  rawBoolean,
  rawNumber,
  rawString,
  type JsonValue,
  type RawLike,
  type RawSongLike,
} from '../types/rawSongbook';
import { convertKytarioSectionsToChordpro, getStringContent } from './chordpro';
import { fixUnescapedControlCharsInJson, removeTrailingCommas } from './jsonRepair';

/** Content keys checked (in order) when extracting lyrics/chord text. */
const CONTENT_KEYS = [
  'content',
  'lyrics',
  'text',
  'chordpro',
  'body',
  'chords',
  'song_text',
  'text_original',
  'original_text',
  'tab',
  'lines',
] as const;

/** Title keys checked (in order) when resolving a song's display name. */
const TITLE_KEYS = ['title', 'name', 'songName', 'song_title', 'headline'] as const;

/** Reads a raw property as string|number|undefined for Song metadata fields. */
function rawScalar(obj: RawLike, key: string): string | number | undefined {
  const v = obj[key];
  return typeof v === 'string' || typeof v === 'number' ? v : undefined;
}

/**
 * Normalizes a single raw object into a complete Song entity.
 * Input is untrusted JSON; all field access goes through typed helpers.
 * Also accepts an already-normalized `Song` (used by the ZIP importer to
 * re-normalize indices).
 */
export function normalizeSingleSong(input: RawSongLike | Song, idx = 0): Song {
  const s: RawLike = { ...input };
  let content = '';
  if (Array.isArray(s.sections) && s.sections.some((sec) => Array.isArray(asRecord(sec)?.tokens))) {
    content = convertKytarioSectionsToChordpro(s.sections as unknown[]);
  }

  if (!content) {
    for (const key of CONTENT_KEYS) {
      content = getStringContent(s[key] as JsonValue);
      if (content) break;
    }
  }

  const idValue = s.id;
  const idText =
    typeof idValue === 'string' || typeof idValue === 'number' ? String(idValue) : '';

  const title = firstRawString(s, TITLE_KEYS) || (idText ? `Song ${idText}` : `Song ${idx + 1}`);

  // In Kytario, interpreter is the performer/band (e.g. Jaroslav Ježek, Nirvana, Lucie),
  // while author is the composer/lyricist (e.g. Jiří Voskovec, Jan Werich).
  const artist =
    firstRawString(s, ['interpreter', 'artist', 'author', 'composer', 'performer', 'band', 'group']) || '';

  const author = firstRawString(s, ['author', 'composer', 'artist', 'interpreter', 'performer']) || '';

  const capoValue = s.capo;
  const key = firstRawString(s, ['tonalKey', 'key']);

  return {
    id: idText ? idText : `song-${idx + 1}-${Math.random().toString(36).substring(2, 7)}`,
    title: String(title),
    name: String(title),
    author: String(author),
    artist: String(artist),
    content: String(content),
    rating: rawNumber(s, 'rating'),
    capo: capoValue === undefined || capoValue === null ? undefined : (capoValue as string | number),
    key: key || undefined,
    tonalKey: key || undefined,
    tempo: rawScalar(s, 'tempo'),
    releaseYear: rawScalar(s, 'releaseYear'),
    isPrivate: rawBoolean(s, 'isPrivate') || rawString(s, 'visibility') === 'private',
    createdAt: rawString(s, 'createdAt') || undefined,
  };
}

/**
 * Deeply extracts songs from any JSON object, array, or dictionary structure.
 * Uses a non-short-circuiting approach to collect all possible songs across multiple properties.
 */
export function extractSongsFromAny(data: JsonValue | unknown, seen = new Set<object>()): Song[] {
  if (!data || typeof data !== 'object') return [];
  const dataObj = data as object;
  if (seen.has(dataObj)) return [];
  seen.add(dataObj);

  const songs: Song[] = [];

  // 1. Handle Arrays (e.g. [ {song}, {song} ] or [ {section}, {section} ])
  if (Array.isArray(data)) {
    for (const item of data as JsonValue[]) {
      if (!item || typeof item !== 'object') continue;
      // Kytario sometimes wraps songs in an 'item' or 'song' property
      const wrapped = asRecord(item) ?? undefined;
      const s = (wrapped && (asRecord(wrapped.song) || asRecord(wrapped.item))) || wrapped;
      if (s) {
        const nested = extractSongsFromAny(s, seen);
        songs.push(...nested);
      }
    }
    return songs;
  }

  const record = asRecord(data);
  if (!record) return [];

  // 2. Check if the current object IS a song
  const hasTitle = !!firstRawString(record, [
    'title',
    'name',
    'songName',
    'song_title',
    'song_name',
    'headline',
    'title_name',
  ]);

  const contentValue = CONTENT_KEYS.map((k) => record[k]).find((v) => v !== undefined);

  const hasTokenSections =
    Array.isArray(record.sections) &&
    record.sections.some(
      (sec) => Array.isArray(asRecord(sec)?.tokens) && (asRecord(sec)?.tokens as unknown[]).length > 0,
    );

  const hasContent =
    hasTokenSections ||
    !!(
      (typeof contentValue === 'string' && contentValue.trim().length > 0) ||
      (Array.isArray(contentValue) && contentValue.length > 0) ||
      (typeof contentValue === 'object' &&
        contentValue !== null &&
        Object.keys(contentValue).length > 0)
    );

  // A song is identified if it has content OR a title.
  // We prioritize objects with content to avoid treating entire sections as single songs if they have a title.
  if (hasContent) {
    songs.push(normalizeSingleSong(record, songs.length));
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
    'song_items',
  ];

  let hasNestedSongs = false;
  for (const prop of commonProps) {
    const v = record[prop];
    if (v && (Array.isArray(v) || typeof v === 'object')) {
      hasNestedSongs = true;
      break;
    }
  }

  if (hasTitle && !hasNestedSongs) {
    // Looks like a song metadata (title only), we import it as a song with empty lyrics
    // This allows ToC to be populated even if lyrics fetch fails for some reason.
    songs.push(normalizeSingleSong(record, songs.length));
    return songs;
  }

  // 3. Otherwise, look for songs in common property names
  for (const prop of commonProps) {
    const value = record[prop];
    if (value) {
      // Special case for sections that might contain songs directly
      if ((prop === 'sections' || prop === 'items') && Array.isArray(value)) {
        for (const item of value) {
          const itemRec = asRecord(item);
          if (itemRec && Array.isArray(itemRec.songs)) {
            songs.push(...extractSongsFromAny(itemRec.songs, seen));
          } else {
            songs.push(...extractSongsFromAny(item, seen));
          }
        }
      } else {
        songs.push(...extractSongsFromAny(value, seen));
      }
    }
  }

  // 4. If still no songs found, perform exhaustive search over all object properties
  if (songs.length === 0) {
    for (const key of Object.keys(record)) {
      if (commonProps.includes(key)) continue; // Already checked
      const v = record[key];
      if (v && typeof v === 'object') {
        // Only recurse into objects that might be containers (avoiding circular or massive depth if possible)
        songs.push(...extractSongsFromAny(v, seen));
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
export function recoverSongsFromCorruptedText(raw: string): Song[] {
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
      const parsed = JSON.parse(sanitized) as JsonValue;
      const parsedRec = asRecord(parsed);
      const s = (parsedRec && (asRecord(parsedRec.song) || asRecord(parsedRec.item))) || parsedRec;
      if (s && firstRawString(s, ['title', 'name', 'content', 'lyrics', 'text'])) {
        songs.push(normalizeSingleSong(s, songs.length));
      }
    } catch {
      // Regex field extraction fallback for this single object
      const titleM = slice.match(/"(?:title|name)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
      const contentM = slice.match(
        /"(?:content|lyrics|text|chords)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i,
      );
      const artistM = slice.match(
        /"(?:artist|author|interpreter)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i,
      );
      if (titleM || contentM) {
        songs.push(
          normalizeSingleSong(
            {
              title: titleM ? titleM[1] : undefined,
              content: contentM ? contentM[1] : undefined,
              artist: artistM ? artistM[1] : undefined,
            },
            songs.length,
          ),
        );
      }
    }
  }

  return songs;
}
