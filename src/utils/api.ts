import axios from 'axios';

export interface KytarioErrorDetails {
  isCorsOrStaticHost: boolean;
  token: string;
  apiUrl: string;
  webUrl: string;
}

export class KytarioFetchError extends Error {
  details?: KytarioErrorDetails;
  constructor(message: string, details?: KytarioErrorDetails) {
    super(message);
    this.name = 'KytarioFetchError';
    this.details = details;
  }
}

/**
 * Robustly extracts the songbook slug / code from any Kytario URL, link, or path format.
 */
export function extractKytarioSlug(input: string): string {
  if (!input) return '';
  let str = input.trim();
  str = str.split('#')[0].split('?')[0].trim();
  str = str.replace(/\/+$/, '');

  const noProto = str.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  
  let segments: string[] = [];
  if (noProto.includes('kytario.com')) {
    const afterDomain = noProto.split('kytario.com')[1] || '';
    segments = afterDomain.split('/').filter(Boolean);
  } else {
    segments = noProto.split('/').filter(Boolean);
  }

  if (segments.length === 0) return '';

  const ignore = new Set([
    'api', 'v1', 'v2', 'public', 
    'songbook', 'songbooks', 'zpevnik', 'zpevniky', 
    'project', 'projects', 'sections', 'export', 
    'shared', 'cs', 'en', 'sk', 'de', 'user', 'users'
  ]);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i].toLowerCase();
    if ((seg === 'songbooks' || seg === 'songbook' || seg === 'zpevnik' || seg === 'zpevniky' || seg === 'projects' || seg === 'project') && i + 1 < segments.length) {
      const next = segments[i + 1];
      if (!ignore.has(next.toLowerCase())) {
        return next;
      }
    }
  }

  const valid = segments.filter(s => !ignore.has(s.toLowerCase()));
  if (valid.length > 0) {
    return valid[valid.length - 1];
  }

  return '';
}

export function extractTitleFromHtml(html: string): string | null {
  if (typeof html !== 'string') return null;

  // 1. JSON-LD MusicAlbum name
  const ldMatch = html.match(/"@type"\s*:\s*"MusicAlbum"\s*,\s*"name"\s*:\s*"([^"]+)"/);
  if (ldMatch && ldMatch[1] && ldMatch[1].trim()) return ldMatch[1].trim();

  // 2. Heading "Welcome to digital songbook ... <strong>NAME</strong>"
  const headingMatch = html.match(/<strong>([^<]+)<\/strong>/i);
  if (headingMatch && headingMatch[1] && headingMatch[1].trim()) return headingMatch[1].trim();

  // 3. Title tag: <title>Songbook NAME | Kytario</title> or <title>Zpěvník NAME | Kytario</title>
  const titleMatch = html.match(/<title>\s*(?:Songbook\s+|Zpěvník\s+)?(.*?)\s*\|\s*Kytario<\/title>/i);
  if (titleMatch && titleMatch[1] && titleMatch[1].trim()) return titleMatch[1].trim();

  // 4. og:title
  const ogMatch = html.match(/property="og:title"\s+content="(?:Songbook\s+|Zpěvník\s+)?(.*?)\s*\|\s*Kytario"/i);
  if (ogMatch && ogMatch[1] && ogMatch[1].trim()) return ogMatch[1].trim();

  return null;
}

function hasSongsPayload(data: any): boolean {
  if (!data) return false;
  if (Array.isArray(data) && data.length > 0) return true;
  if (Array.isArray(data.songs) && data.songs.length > 0) return true;
  if (Array.isArray(data.songbookSongs) && data.songbookSongs.length > 0) return true;
  if (Array.isArray(data.sections) && data.sections.length > 0) return true;
  return false;
}

async function fetchViaPublicProxies(token: string): Promise<any> {
  const candidateUrls = [
    `https://kytario.com/api/songbooks/${token}/sections`,
    `https://kytario.com/api/v1/songbooks/${token}/sections`,
    `https://kytario.com/api/songbooks/${token}`,
  ];

  for (const targetUrl of candidateUrls) {
    // 1. Direct fetch (e.g. if CORS is permitted or user has a CORS browser extension)
    try {
      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        if (hasSongsPayload(data)) {
          return data;
        }
      }
    } catch {
      // Direct CORS blocked, continue
    }

    // 2. allorigins raw proxy
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const text = await res.text();
        const data = JSON.parse(text);
        if (hasSongsPayload(data)) {
          return data;
        }
      }
    } catch {
      // Continue
    }

    // 3. allorigins get proxy (JSON wrapper)
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const wrapper = await res.json();
        if (wrapper && wrapper.contents) {
          const data = JSON.parse(wrapper.contents);
          if (hasSongsPayload(data)) {
            return data;
          }
        }
      }
    } catch {
      // Continue
    }

    // 4. codetabs proxy
    try {
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (hasSongsPayload(data)) {
          return data;
        }
      }
    } catch {
      // Continue
    }
  }

  return null;
}

async function enrichTitleInClient(data: any, token: string) {
  if (!token || !data) return;
  try {
    const webUrl = `https://kytario.com/${token}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(webUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const wrapper = await res.json();
      if (wrapper && wrapper.contents) {
        const title = extractTitleFromHtml(wrapper.contents);
        if (title) {
          data.title = title;
          data.name = title;
          data.songbookTitle = title;
        }
      }
    }
  } catch {
    // Ignore enrichment errors
  }
}

export async function fetchSongbookFromKytario(url: string): Promise<any> {
  const cleanUrl = url.trim();
  const token = extractKytarioSlug(cleanUrl);
  
  if (!token && !/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('Please enter a valid Kytario songbook URL or code (e.g. "bodg" or "https://kytario.com/bodg").');
  }

  const isStaticHost = typeof window !== 'undefined' && (
    window.location.hostname.endsWith('github.io') ||
    window.location.protocol === 'file:'
  );

  const targetParam = token || cleanUrl;

  // If NOT a static-only hosting environment, try local backend server proxy first
  if (!isStaticHost) {
    try {
      const response = await axios.get(`/api/proxy/kytario/${encodeURIComponent(targetParam)}`, {
        params: { url: cleanUrl, token },
        timeout: 10000
      });
      if (response.data && hasSongsPayload(response.data)) {
        return response.data;
      }
    } catch (err: any) {
      console.warn('Local proxy not available, attempting client-side fallback strategies:', err?.message);
    }
  }

  // Next, try client-side direct access and public CORS proxies
  if (token) {
    try {
      const clientData = await fetchViaPublicProxies(token);
      if (clientData) {
        await enrichTitleInClient(clientData, token);
        return clientData;
      }
    } catch (clientErr: any) {
      console.warn('Client-side proxy fetch encountered error:', clientErr?.message);
    }
  }

  // If all automated attempts fail, provide clear structured guidance with direct copy links
  const resolvedToken = token || 'bodg';
  const apiUrl = `https://kytario.com/api/songbooks/${encodeURIComponent(resolvedToken)}/sections`;
  const webUrl = `https://kytario.com/${encodeURIComponent(resolvedToken)}`;

  const errorDetails: KytarioErrorDetails = {
    isCorsOrStaticHost: true,
    token: resolvedToken,
    apiUrl,
    webUrl,
  };

  const message = isStaticHost
    ? `GitHub Pages is a static site without a backend proxy server, and Kytario's servers do not allow direct browser connections (CORS).`
    : `Could not fetch songbook from Kytario. Please check the URL or copy the JSON payload into the Paste JSON tab.`;

  throw new KytarioFetchError(message, errorDetails);
}
