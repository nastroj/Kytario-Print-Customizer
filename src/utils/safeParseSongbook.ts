/**
 * Attempts to parse or repair potentially truncated, malformed, unescaped,
 * or non-standard Songbook JSON with multi-pass recovery.
 */
import type { SongbookData, Song } from '../types';
import {
  preprocessJsonText,
  fixUnescapedControlCharsInJson,
  removeTrailingCommas,
  balanceJsonBrackets,
  tryParseSequenceOrNdjson,
} from './jsonRepair';
import { recoverSongsFromCorruptedText } from './normalizeSong';
import { normalizeSongbookData } from './normalizeSongbook';
import { extractSongbookUrlAndSlug } from './urlSlug';

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
    const titleMatch = cleaned.match(
      /"(?:name|title|songbookTitle|songbook)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i,
    );
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

  throw new Error(
    'Unable to parse JSON file. Please verify that the file contains song data with titles and lyrics.',
  );
}
