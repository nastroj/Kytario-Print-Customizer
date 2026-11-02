/**
 * Normalization of raw imported JSON objects into Song entities, including
 * deep extraction from arbitrary structures and fallback recovery scanning
 * for severely corrupted/truncated files.
 */
import type { Song } from '../types';
import { convertKytarioSectionsToChordpro, getStringContent } from './chordpro';
import { fixUnescapedControlCharsInJson, removeTrailingCommas } from './jsonRepair';

/**
 * Normalizes a single raw object into a complete Song entity.
 */
export function normalizeSingleSong(s: any, idx = 0): Song {
  let content = '';
  if (
    Array.isArray(s.sections) &&
    s.sections.some((sec: any) => sec && Array.isArray(sec.tokens))
  ) {
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

  // In Kytario, s.interpreter is the performer/band (e.g. Jaroslav Ježek, Nirvana, Lucie),
  // while s.author is the composer/lyricist (e.g. Jiří Voskovec, Jan Werich).
  const artist =
    s.interpreter || s.artist || s.author || s.composer || s.performer || s.band || s.group || '';

  const author = s.author || s.composer || s.artist || s.interpreter || s.performer || '';

  return {
    id: s.id ? `${s.id}` : `song-${idx + 1}-${Math.random().toString(36).substring(2, 7)}`,
    title: String(title),
    name: String(title),
    author: String(author),
    artist: String(artist),
    content: String(content),
    rating: s.rating,
    capo: s.capo !== undefined && s.capo !== null ? s.capo : undefined,
    key: s.tonalKey || s.key,
    tonalKey: s.tonalKey || s.key,
    tempo: s.tempo,
    releaseYear: s.releaseYear,
    isPrivate: !!(s.isPrivate || s.visibility === 'private'),
    createdAt: s.createdAt,
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
  const hasTitle = !!(
    data.title ||
    data.name ||
    data.songName ||
    data.song_title ||
    data.song_name ||
    data.headline ||
    data.title_name
  );

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

  const hasTokenSections =
    Array.isArray(data.sections) &&
    data.sections.some((sec: any) => sec && Array.isArray(sec.tokens) && sec.tokens.length > 0);

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
    'song_items',
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
      const parsed = JSON.parse(sanitized);
      const s = parsed.song || parsed.item || parsed;
      if (s && (s.title || s.name || s.content || s.lyrics || s.text)) {
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
