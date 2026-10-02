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
 * Normalizes a Kytario URL by removing page/index suffixes like '/index-1' or '/index'
 * (e.g. 'https://kytario.com/cs/pisnicky/index-1' -> 'https://kytario.com/cs/pisnicky').
 */
export function cleanKytarioUrl(input: string): string {
  if (!input) return '';
  let str = input.trim();
  // Strip trailing /index-1 or /index-\d+ or /index at the end of the URL/path before query/hash or end
  str = str.replace(/\/index(?:-\d+)?\/?(?=[?#]|$)/i, '');
  return str;
}

/**
 * Robustly extracts the songbook slug / code from any Kytario URL, link, or path format.
 */
export function extractKytarioSlug(input: string): string {
  if (!input) return '';
  let str = cleanKytarioUrl(input);
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
      if (!ignore.has(next.toLowerCase()) && !/^index(?:-\d+)?$/i.test(next)) {
        return next;
      }
    }
  }

  const valid = segments.filter(s => !ignore.has(s.toLowerCase()) && !/^index(?:-\d+)?$/i.test(s));
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

    // Jina Reader supports large Kytario JSON responses and returns the body as text.
    try {
      const proxyUrl = `https://r.jina.ai/${targetUrl}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
      if (res.ok) {
        const text = await res.text();
        const marker = 'Markdown Content:\n';
        const markerIndex = text.indexOf(marker);
        const content = (markerIndex >= 0 ? text.slice(markerIndex + marker.length) : text).trim();
        const jsonStart = content.search(/[\[{]/);
        const data = JSON.parse(content.slice(jsonStart));
        if (hasSongsPayload(data)) {
          return data;
        }
      }
    } catch {
      // Continue to other public relays.
    }

    // 3. allorigins raw proxy
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

    // 4. allorigins get proxy (JSON wrapper)
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

    // 5. codetabs proxy
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
  const cleanUrl = cleanKytarioUrl(url);
  const token = extractKytarioSlug(cleanUrl);
  
  if (!token && !/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('Please enter a valid Kytario songbook URL or code.');
  }

  const isStaticHost = typeof window !== 'undefined' && (
    window.location.hostname.endsWith('github.io') ||
    window.location.protocol === 'file:'
  );

  const targetParam = token || cleanUrl;
  const configuredProxyUrl = import.meta.env.VITE_KYTARIO_PROXY_URL?.trim();

  // Prefer a configured hosted proxy on static hosts, otherwise use the local backend.
  if (configuredProxyUrl || !isStaticHost) {
    try {
      const proxyBase = configuredProxyUrl || '/api/proxy/kytario';
      const response = await axios.get(`${proxyBase.replace(/\/+$/, '')}/${encodeURIComponent(targetParam)}`, {
        params: { url: cleanUrl, token },
        timeout: 25000
      });
      if (response.data && hasSongsPayload(response.data)) {
        return response.data;
      }
    } catch (err: any) {
      console.warn('Configured Kytario proxy not available, attempting client-side fallback strategies:', err?.message);
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
  const resolvedToken = token || cleanUrl.replace(/^https?:\/\//i, '').replace(/[\/\?#].*$/, '');
  const apiUrl = `https://kytario.com/api/songbooks/${encodeURIComponent(resolvedToken)}/sections`;
  const webUrl = `https://kytario.com/${encodeURIComponent(resolvedToken)}`;

  const errorDetails: KytarioErrorDetails = {
    isCorsOrStaticHost: true,
    token: resolvedToken,
    apiUrl,
    webUrl,
  };

  const message = isStaticHost
    ? `Automatic Kytario import tried public CORS relays but could not fetch this songbook. You can configure a Cloudflare Worker proxy with VITE_KYTARIO_PROXY_URL or import the JSON manually.`
    : `Could not fetch songbook from Kytario. Please check the URL or copy the JSON payload into the Paste JSON tab.`;

  throw new KytarioFetchError(message, errorDetails);
}
