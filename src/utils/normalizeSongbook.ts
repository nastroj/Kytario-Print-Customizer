/**
 * Normalizes various songbook JSON structures into a unified SongbookData shape.
 */
import type { SongbookData } from '../types';
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

/**
 * Normalizes various songbook JSON structures into a unified SongbookData
 */
export function normalizeSongbookData(raw: any, rawJsonText?: string): SongbookData {
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
      raw.data?.songbook?.name ||
      raw.data?.name ||
      raw.data?.title ||
      raw.payload?.name ||
      raw.payload?.title ||
      raw.songbookSongs?.[0]?.song?.project?.name ||
      'Songbook';
  }

  title = cleanSongbookTitle(title);
  if (!title) title = 'Songbook';

  const urlInfo = extractSongbookUrlAndSlug(raw, rawJsonText);
  const urlToken =
    typeof raw === 'object' && raw !== null
      ? raw.urlToken ||
        raw.url_token ||
        raw.slugToken ||
        raw.slug_token ||
        raw.slug ||
        raw.songbookSongs?.[0]?.song?.project?.urlToken ||
        urlInfo.slug
      : urlInfo.slug;

  return {
    ...(typeof raw === 'object' && !Array.isArray(raw) ? raw : {}),
    title,
    name: title,
    urlToken,
    url: urlInfo.url,
    shortUrl: urlInfo.shortUrl,
    slug: urlInfo.slug,
    songs,
  };
}
