/**
 * Normalizes various songbook JSON structures into a unified SongbookData shape.
 */
import type { SongbookData } from '../types';
import {
  asRecord,
  firstRawString,
  isRecord,
  type JsonValue,
  type RawSongbookLike,
} from '../types/rawSongbook';
import { extractSongsFromAny } from './normalizeSong';
import { extractSongbookUrlAndSlug } from './urlSlug';

export function cleanSongbookTitle(rawTitle: string): string {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  let text = rawTitle.trim();

  // Strip trailing site brand identifiers
  text = text.replace(/\s*(?:\||-|–|—)\s*Kytario.*$/i, '').trim();
  text = text.replace(/\s*(?:\||-|–|—)\s*(?:Digitální zpěvník|Digital Songbook).*$/i, '').trim();

  // Strip parenthesized or bracketed terms like "(Songbook)" or "[Zpěvník]"
  text = text
    .replace(/\s*[\(\[](?:Songbook|Zpěvník|Zpevnik|Digitální zpěvník|Digital Songbook)[\)\]]/i, '')
    .trim();

  // Strip leading prefixes like "Songbook Písničky", "Songbook: Písničky", "Songbook - Písničky", "Zpěvník Písničky"
  const strippedLeading = text
    .replace(/^(?:Songbook|Zpěvník|Zpevnik|Digitální zpěvník|Digital Songbook)[\s:\-–—]+/i, '')
    .trim();
  if (strippedLeading) {
    text = strippedLeading;
  }

  // Strip trailing "Songbook" / "Zpěvník" if preceded by space/dash
  const strippedTrailing = text
    .replace(/[\s:\-–—]+(?:Songbook|Zpěvník|Zpevnik|Digitální zpěvník|Digital Songbook)$/i, '')
    .trim();
  if (strippedTrailing) {
    text = strippedTrailing;
  }

  return text || rawTitle.trim();
}

/** Reads a nested raw record chain, e.g. `rawPath(o, 'songbook', 'title')`. */
function rawPath(obj: RawSongbookLike | undefined, ...keys: string[]): JsonValue | undefined {
  let cur: JsonValue | undefined = obj;
  for (const key of keys) {
    // Support array indexing via numeric path segments (e.g. 'songbookSongs', '0', 'song').
    if (/^\d+$/.test(key) && Array.isArray(cur)) {
      cur = cur[Number(key)];
      continue;
    }
    const rec = asRecord(cur);
    if (!rec) return undefined;
    cur = rec[key];
  }
  return cur;
}

/** Reads the first non-empty string from a list of (possibly nested) paths. */
function firstRawPath(obj: RawSongbookLike | undefined, paths: readonly string[][]): string {
  for (const path of paths) {
    const v = rawPath(obj, ...path);
    if (typeof v === 'string' && v.length > 0) return v;
    if (typeof v === 'number') return String(v);
  }
  return '';
}

/**
 * Normalizes various songbook JSON structures into a unified SongbookData
 * Input is untrusted JSON; all field access goes through typed helpers.
 */
export function normalizeSongbookData(raw: RawSongbookLike, rawJsonText?: string): SongbookData {
  if (!raw) return { title: 'Untitled Songbook', songs: [] };

  const songs = extractSongsFromAny(raw);
  const urlInfo = extractSongbookUrlAndSlug(raw, rawJsonText);
  const songbookSongsValue = rawPath(raw, 'songbookSongs');
  const firstProject = Array.isArray(songbookSongsValue)
    ? asRecord(asRecord(asRecord(songbookSongsValue[0])?.song)?.project)
    : undefined;
  const urlToken = isRecord(raw)
    ? firstRawString(raw, [
        'urlToken',
        'url_token',
        'slugToken',
        'slug_token',
        'slug',
      ]) ||
      (firstProject ? firstRawString(firstProject, ['urlToken']) : '') ||
      urlInfo.slug
    : urlInfo.slug;

  let title = '';
  if (isRecord(raw)) {
    const candidates = [
      firstRawPath(raw, [['title']]),
      firstRawPath(raw, [['songbookTitle']]),
      firstRawPath(raw, [['songbook', 'title']]),
      firstRawPath(raw, [['data', 'title']]),
      firstRawPath(raw, [['payload', 'title']]),
      firstRawPath(raw, [['name']]),
      firstRawPath(raw, [['songbook_name']]),
      firstRawPath(raw, [['songbook', 'name']]),
      firstRawPath(raw, [['data', 'songbook', 'name']]),
      firstRawPath(raw, [['data', 'name']]),
      firstRawPath(raw, [['payload', 'name']]),
      firstRawPath(raw, [['songbookSongs', '0', 'song', 'project', 'name']]),
    ].filter(Boolean);

    for (const cand of candidates) {
      const cleaned = cleanSongbookTitle(cand);
      if (cleaned) {
        const lower = cleaned.toLowerCase();
        // Ignore generic placeholder titles
        if (
          lower === 'kytario' ||
          lower === 'songbook' ||
          lower === 'zpěvník' ||
          lower === 'zpevnik' ||
          lower === 'digital songbook' ||
          lower === 'digitální zpěvník'
        ) {
          continue;
        }
        // Ignore candidate if it matches the urlToken / slug case-insensitively (e.g. "BODG" vs "bodg")
        if (urlToken && lower === urlToken.trim().toLowerCase()) {
          continue;
        }
        title = cleaned;
        break;
      }
    }
  }

  if (!title) {
    title = 'Songbook';
  }

  return {
    ...(isRecord(raw) ? raw : {}),
    title,
    name: title,
    urlToken,
    url: urlInfo.url,
    shortUrl: urlInfo.shortUrl,
    slug: urlInfo.slug,
    songs,
  } as SongbookData;
}
