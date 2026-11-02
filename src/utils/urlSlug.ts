/**
 * Songbook URL / slug normalization, discovery, and cover-page URL resolution.
 */

/**
 * Normalizes an arbitrary URL, path, or slug into clean full URL, short/display URL, and slug.
 */
export function normalizeUrlAndShortUrl(
  foundVal?: string | null,
  foundSlug?: string | null,
  defaultDomain = 'kytario.com'
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

  let cleaned = foundVal.trim().replace(/\/+$/, '');
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
    const derivedSlug = s || (url.includes(defaultDomain) ? url.split(defaultDomain)[1]?.replace(/^\/+/, '') : undefined);
    return { url, shortUrl, slug: derivedSlug || undefined };
  }

  // If it starts with a domain name like kytario.com/... or example.com/...
  if (/^(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/.*)?$/i.test(cleaned)) {
    const cleanNoWww = cleaned.replace(/^www\./i, '');
    const url = 'https://' + cleanNoWww;
    const derivedSlug = s || (cleanNoWww.includes(defaultDomain) ? cleanNoWww.split(defaultDomain)[1]?.replace(/^\/+/, '') : undefined);
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
  raw: any,
  rawJsonText?: string
): { url: string; shortUrl: string; slug?: string } {
  const candidates: any[] = [];
  if (raw && typeof raw === 'object') {
    candidates.push(raw);
    if (raw.songbook && typeof raw.songbook === 'object') candidates.push(raw.songbook);
    if (raw.data && typeof raw.data === 'object') {
      candidates.push(raw.data);
      if (raw.data.songbook && typeof raw.data.songbook === 'object') candidates.push(raw.data.songbook);
    }
    if (raw.payload && typeof raw.payload === 'object') {
      candidates.push(raw.payload);
      if (raw.payload.songbook && typeof raw.payload.songbook === 'object') candidates.push(raw.payload.songbook);
    }
    if (raw.result && typeof raw.result === 'object') {
      candidates.push(raw.result);
      if (raw.result.songbook && typeof raw.result.songbook === 'object') candidates.push(raw.result.songbook);
    }
    if (raw.meta && typeof raw.meta === 'object') candidates.push(raw.meta);
    if (raw.metadata && typeof raw.metadata === 'object') candidates.push(raw.metadata);
    if (raw.info && typeof raw.info === 'object') candidates.push(raw.info);
    if (raw.collection && typeof raw.collection === 'object') candidates.push(raw.collection);
    if (Array.isArray(raw.songbookSongs) && raw.songbookSongs[0]?.song?.project) {
      candidates.push(raw.songbookSongs[0].song.project);
    }
  }

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
      for (const k of slugKeys) {
        if (typeof obj[k] === 'string' && obj[k].trim()) {
          foundSlug = obj[k].trim();
          break;
        }
      }
    }
    if (!foundUrl) {
      for (const k of urlKeys) {
        if (typeof obj[k] === 'string' && obj[k].trim()) {
          foundUrl = obj[k].trim();
          break;
        }
      }
    }
    // Check if obj.id is a string slug (non-numeric)
    if (!foundSlug && !foundUrl && typeof obj.id === 'string' && obj.id.trim() && !/^\d+$/.test(obj.id.trim())) {
      foundSlug = obj.id.trim();
    }
    if (foundUrl && foundSlug) break;
  }

  // If not found in object, or if foundUrl is just root kytario.com, scan raw text
  if ((!foundUrl && !foundSlug) || (foundUrl && /^(?:https?:\/\/)?(?:www\.)?kytario\.com\/?$/i.test(foundUrl) && !foundSlug)) {
    if (rawJsonText) {
      const slugMatch = rawJsonText.match(
        /"(?:urlToken|url_token|slugToken|slug_token|slug|songbookSlug|songbook_slug|zpevnikSlug|zpevnik_slug|code|shareCode|share_code|songbookCode|songbook_code)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i
      );
      if (slugMatch && slugMatch[1]) {
        try {
          foundSlug = JSON.parse(`"${slugMatch[1]}"`).trim();
        } catch {
          foundSlug = slugMatch[1].trim();
        }
      }

      if (!foundUrl) {
        const urlMatch = rawJsonText.match(
          /"(?:shortUrl|short_url|shortURL|url|songbookUrl|songbook_url|shareUrl|share_url|shareLink|share_link|link|path)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i
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
export function formatCoverDisplayUrl(rawUrlOrSlug?: string | null, fallbackDomain = 'kytario.com'): string {
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
export function formatCoverQrUrl(rawUrlOrSlug?: string | null, fallbackUrl = 'https://kytario.com'): string {
  if (!rawUrlOrSlug || !rawUrlOrSlug.trim()) return fallbackUrl;
  let trimmed = rawUrlOrSlug.trim().replace(/\/+$/, '');
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
 * Unified resolver for cover page display URL and QR code target URL.
 * Ensures that auto-generated covers always display the full songbook link (e.g. kytario.com/your-songbook)
 * and that custom covers can optionally override them.
 */
export function resolveCoverUrl(options: {
  isCustom?: boolean;
  customUrl?: string;
  customQrUrl?: string;
  songbookUrl?: string;
  songbookShortUrl?: string;
  songbookSlug?: string;
}): { displayUrl: string; qrTarget: string } {
  const { isCustom = false, customUrl, customQrUrl, songbookUrl, songbookShortUrl, songbookSlug } = options;

  // Custom cover with user-specified URL
  if (isCustom && customUrl && customUrl.trim()) {
    const displayUrl = formatCoverDisplayUrl(customUrl.trim());
    const qrTarget = (customQrUrl && customQrUrl.trim())
      ? customQrUrl.trim()
      : formatCoverQrUrl(customUrl.trim());
    return { displayUrl, qrTarget };
  }

  // Auto-generated cover (or custom cover using songbook defaults):
  const candidate = songbookShortUrl || songbookUrl || songbookSlug || '';
  const displayUrl = formatCoverDisplayUrl(candidate);
  const qrTarget = (isCustom && customQrUrl && customQrUrl.trim())
    ? customQrUrl.trim()
    : formatCoverQrUrl(candidate);

  return { displayUrl, qrTarget };
}
