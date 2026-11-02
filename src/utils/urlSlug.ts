/**
 * Songbook URL / slug normalization, discovery, and cover-page URL resolution.
 */
import {
  asRecord,
  isRecord,
  type JsonValue,
  type RawLike,
} from '../types/rawSongbook';

/**
 * Normalizes an arbitrary URL, path, or slug into clean full URL, short/display URL, and slug.
 */
export function normalizeUrlAndShortUrl(
  foundVal?: string | null,
  foundSlug?: string | null,
  defaultDomain = 'kytario.com',
): { url: string; shortUrl: string; slug?: string } {
  if (!foundVal || !foundVal.trim()) {
    if (foundSlug && foundSlug.trim()) {
      const s = foundSlug.trim().replace(/^\/+|\/+$/g, '');
      return {
        url: `https://${defaultDomain}/${s}`,
        shortUrl: `${defaultDomain}/${s}`,
        slug: s,
      };
    }
    return {
      url: `https://${defaultDomain}`,
      shortUrl: defaultDomain,
    };
  }

  const cleaned = foundVal.trim().replace(/\/+$/, '');
  const s = foundSlug?.trim() ? foundSlug.trim().replace(/^\/+|\/+$/g, '') : undefined;

  // If foundVal is just root kytario.com (no path), but we also have a slug, attach the slug
  const isJustRoot =
    /^https?:\/\/(?:www\.)?kytario\.com\/?$/i.test(cleaned) ||
    /^(?:www\.)?kytario\.com\/?$/i.test(cleaned);

  if (isJustRoot && s) {
    return {
      url: `https://${defaultDomain}/${s}`,
      shortUrl: `${defaultDomain}/${s}`,
      slug: s,
    };
  }

  // If it already has http:// or https://
  if (/^https?:\/\//i.test(cleaned)) {
    const url = cleaned.replace(/^http:\/\//i, 'https://');
    const shortUrl = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    const derivedSlug =
      s ||
      (url.includes(defaultDomain) ? url.split(defaultDomain)[1]?.replace(/^\/+/, '') : undefined);
    return { url, shortUrl, slug: derivedSlug || undefined };
  }

  // If it starts with a domain name like kytario.com/... or example.com/...
  if (/^(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/.*)?$/i.test(cleaned)) {
    const cleanNoWww = cleaned.replace(/^www\./i, '');
    const url = 'https://' + cleanNoWww;
    const derivedSlug =
      s ||
      (cleanNoWww.includes(defaultDomain)
        ? cleanNoWww.split(defaultDomain)[1]?.replace(/^\/+/, '')
        : undefined);
    return {
      url,
      shortUrl: cleanNoWww,
      slug: derivedSlug || undefined,
    };
  }

  // Otherwise, it's a relative path or raw slug (e.g. "your-songbook" or "/your-songbook" or "/zpevnik/your-songbook")
  const path = cleaned.startsWith('/') ? cleaned : '/' + cleaned;
  const derivedSlug = s || cleaned.replace(/^\/+/, '');
  return {
    url: `https://${defaultDomain}${path}`,
    shortUrl: `${defaultDomain}${path}`,
    slug: derivedSlug,
  };
}

/**
 * Searches songbook raw data or raw text for URL, slug, shortUrl, or code.
 */
export function extractSongbookUrlAndSlug(
  raw: JsonValue | unknown,
  rawJsonText?: string,
): { url: string; shortUrl: string; slug?: string } {
  const candidates: RawLike[] = [];
  const root = asRecord(raw);
  if (root) {
    candidates.push(root);
    // Collect known nested container objects that may carry the identifiers
    const containerKeys = ['songbook', 'data', 'payload', 'result', 'meta', 'metadata', 'info', 'collection'] as const;
    for (const key of containerKeys) {
      const nested = asRecord(root[key]);
      if (nested) {
        candidates.push(nested);
        const innerSongbook = asRecord(nested.songbook);
        if (innerSongbook) candidates.push(innerSongbook);
      }
    }
  }

  /** Reads the first non-empty trimmed string value for any of the keys. */
  const readStringKey = (obj: RawLike, keys: readonly string[]): string | undefined => {
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return undefined;
  };

  const slugKeys = [
    'urlToken',
    'url_token',
    'slugToken',
    'slug_token',
    'slug',
    'songbookSlug',
    'songbook_slug',
    'zpevnikSlug',
    'zpevnik_slug',
    'code',
    'shareCode',
    'share_code',
    'songbookCode',
    'songbook_code',
    'hash',
  ];

  const urlKeys = [
    'shortUrl',
    'short_url',
    'shortURL',
    'url',
    'songbookUrl',
    'songbook_url',
    'url_slug',
    'shareUrl',
    'share_url',
    'shareLink',
    'share_link',
    'link',
    'songbookLink',
    'songbook_link',
    'webUrl',
    'web_url',
    'path',
    'route',
    'songbookId',
    'songbook_id',
  ];

  let foundSlug: string | undefined = undefined;
  let foundUrl: string | undefined = undefined;

  for (const obj of candidates) {
    if (!foundSlug) {
      foundSlug = readStringKey(obj, slugKeys);
    }
    if (!foundUrl) {
      foundUrl = readStringKey(obj, urlKeys);
    }
    // Check if obj.id is a string slug (non-numeric)
    if (!foundSlug && !foundUrl) {
      const idStr = readStringKey(obj, ['id']);
      if (idStr && !/^\d+$/.test(idStr)) foundSlug = idStr;
    }
    if (foundUrl && foundSlug) break;
  }

  // If not found in object, or if foundUrl is just root kytario.com, scan raw text
  if (
    (!foundUrl && !foundSlug) ||
    (foundUrl && /^(?:https?:\/\/)?(?:www\.)?kytario\.com\/?$/i.test(foundUrl) && !foundSlug)
  ) {
    if (rawJsonText) {
      // Strip songs/songbookSongs array bodies and "project" objects to avoid extracting inner song or author project tokens
      let textToScan = rawJsonText
        .replace(/"(?:songbookSongs|songs)"\s*:\s*\[[\s\S]*?\](?=,\s*"|\s*\})/g, '"songs":[]')
        .replace(/"project"\s*:\s*\{[\s\S]*?\}/g, '');

      const slugMatch = textToScan.match(
        /"(?:urlToken|url_token|slugToken|slug_token|slug|songbookSlug|songbook_slug|zpevnikSlug|zpevnik_slug|code|shareCode|share_code|songbookCode|songbook_code)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i,
      );
      if (slugMatch && slugMatch[1]) {
        try {
          foundSlug = JSON.parse(`"${slugMatch[1]}"`).trim();
        } catch {
          foundSlug = slugMatch[1].trim();
        }
      }

      if (!foundUrl) {
        const urlMatch = textToScan.match(
          /"(?:shortUrl|short_url|shortURL|url|songbookUrl|songbook_url|shareUrl|share_url|shareLink|share_link|link|path)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i,
        );
        if (urlMatch && urlMatch[1]) {
          try {
            foundUrl = JSON.parse(`"${urlMatch[1]}"`).trim();
          } catch {
            foundUrl = urlMatch[1].trim();
          }
        }
      }
    }
  }

  return normalizeUrlAndShortUrl(foundUrl || foundSlug, foundSlug);
}

/**
 * Cleanly formats a display URL for songbook cover pages (e.g. "kytario.com/your-songbook").
 */
export function formatCoverDisplayUrl(
  rawUrlOrSlug?: string | null,
  fallbackDomain = 'kytario.com',
): string {
  if (!rawUrlOrSlug || !rawUrlOrSlug.trim()) return fallbackDomain;
  let trimmed = rawUrlOrSlug.trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    trimmed = trimmed.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  } else if (/^www\./i.test(trimmed)) {
    trimmed = trimmed.replace(/^www\./i, '');
  } else if (!/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i.test(trimmed)) {
    const path = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
    trimmed = fallbackDomain + path;
  }
  return trimmed;
}

/**
 * Cleanly formats a QR code target URL (e.g. "https://kytario.com/your-songbook").
 */
export function formatCoverQrUrl(
  rawUrlOrSlug?: string | null,
  fallbackUrl = 'https://kytario.com',
): string {
  if (!rawUrlOrSlug || !rawUrlOrSlug.trim()) return fallbackUrl;
  const trimmed = rawUrlOrSlug.trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http:\/\//i, 'https://');
  }
  if (/^(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i.test(trimmed)) {
    return 'https://' + trimmed.replace(/^www\./i, '');
  }
  const path = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
  return 'https://kytario.com' + path;
}

/**
 * Validates whether a songbook URL or slug is non-empty, well-formed, and points to a real songbook/playlist path
 * rather than a generic root domain, reserved system route, or invalid metadata.
 */
export function isValidSongbookUrlOrSlug(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed || trimmed === '/' || trimmed === 'https://' || trimmed === 'http://') return false;
  if (/undefined|null|\[object/i.test(trimmed)) return false;

  const noProto = trimmed.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  if (!noProto || noProto.toLowerCase() === 'kytario.com' || noProto.toLowerCase() === 'kytario.com/') {
    // Just root domain without slug is not a specific songbook URL
    return false;
  }

  // Extract path/slug portion
  const pathPart = noProto.includes('kytario.com')
    ? noProto.split('kytario.com')[1] || ''
    : noProto;
  const cleanPath = pathPart.replace(/^\/+|\/+$/g, '');
  const slug = cleanPath.split('?')[0].split('#')[0];
  if (!slug) return false;

  const reserved = new Set([
    'api',
    'v1',
    'v2',
    'cs',
    'en',
    'sk',
    'de',
    'report-content',
    'sign-in',
    'sign-up',
    'terms',
    'privacy',
    'about-kytario',
    'about-us',
    'news',
    'docs',
    'site.webmanifest',
    'sitemap.xml',
    'login',
    'logout',
    'register',
    'admin',
    'auth',
    '404',
    'error',
    'download',
  ]);
  if (reserved.has(slug.toLowerCase())) return false;

  return true;
}

/**
 * Unified resolver for cover page display URL and QR code target URL.
 * Ensures that auto-generated covers always display the full songbook link (e.g. kytario.com/your-songbook)
 * and that custom covers can optionally override them. Validates that the URL points to a specific songbook.
 */
export function resolveCoverUrl(options: {
  isCustom?: boolean;
  customUrl?: string;
  customQrUrl?: string;
  songbookUrl?: string;
  songbookShortUrl?: string;
  songbookSlug?: string;
}): { displayUrl: string; qrTarget: string; isValid: boolean } {
  const {
    isCustom = false,
    customUrl,
    customQrUrl,
    songbookUrl,
    songbookShortUrl,
    songbookSlug,
  } = options;

  // Custom cover with user-specified URL
  if (isCustom && customUrl && customUrl.trim()) {
    const valid = isValidSongbookUrlOrSlug(customUrl.trim());
    const displayUrl = formatCoverDisplayUrl(customUrl.trim());
    const qrTarget =
      customQrUrl && customQrUrl.trim() ? customQrUrl.trim() : formatCoverQrUrl(customUrl.trim());
    return { displayUrl, qrTarget, isValid: valid };
  }

  // Auto-generated cover (or custom cover using songbook defaults):
  const candidate = songbookShortUrl || songbookUrl || songbookSlug || '';
  if (!candidate || !candidate.trim()) {
    const displayUrl = formatCoverDisplayUrl();
    const qrTarget =
      isCustom && customQrUrl && customQrUrl.trim()
        ? customQrUrl.trim()
        : formatCoverQrUrl();
    return { displayUrl, qrTarget, isValid: true };
  }

  const valid = isValidSongbookUrlOrSlug(candidate);
  const displayUrl = valid ? formatCoverDisplayUrl(candidate) : '';
  const qrTarget =
    isCustom && customQrUrl && customQrUrl.trim()
      ? customQrUrl.trim()
      : valid
        ? formatCoverQrUrl(candidate)
        : '';

  return { displayUrl, qrTarget, isValid: valid };
}
