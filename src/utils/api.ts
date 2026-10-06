import axios from 'axios';
import { cleanSongbookTitle } from '../utils';

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

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .trim();
}

function sanitizeExtractedTitle(rawTitle: string): string | null {
  if (!rawTitle) return null;
  let text = decodeHtmlEntities(rawTitle).trim();
  
  text = cleanSongbookTitle(text);
  
  // Ignore generic fallback titles
  const lower = text.toLowerCase();
  if (
    !text || 
    lower === 'kytario' || 
    lower === 'songbook' || 
    lower === 'zpěvník' || 
    lower === 'zpevnik' || 
    lower === 'digital songbook' || 
    lower === 'digitální zpěvník'
  ) {
    return null;
  }
  
  return text;
}

export function extractTitleFromHtml(html: string): string | null {
  if (typeof html !== 'string') return null;

  // 1. OpenGraph / Twitter / Standard Meta Tags (Primary source for Kytario songbook titles)
  const metaRegex = /<meta\s+[^>]*?(?:property|name)=["'](?:og:title|twitter:title|title)["']\s+content=["']([^"']+)["']/gi;
  let metaMatch;
  while ((metaMatch = metaRegex.exec(html)) !== null) {
    if (metaMatch[1]) {
      const clean = sanitizeExtractedTitle(metaMatch[1]);
      if (clean) return clean;
    }
  }

  const metaRevRegex = /<meta\s+[^>]*?content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:title|twitter:title|title)["']/gi;
  while ((metaMatch = metaRevRegex.exec(html)) !== null) {
    if (metaMatch[1]) {
      const clean = sanitizeExtractedTitle(metaMatch[1]);
      if (clean) return clean;
    }
  }

  // 2. <title> Tag
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    const clean = sanitizeExtractedTitle(titleMatch[1]);
    if (clean) return clean;
  }

  // 3. Main Heading <h1> / <strong> inside digital songbook header
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    const stripped = h1Match[1].replace(/<[^>]+>/g, '');
    const clean = sanitizeExtractedTitle(stripped);
    if (clean) return clean;
  }

  const strongMatch = html.match(/<strong>\s*([^<]+?)\s*<\/strong>/i);
  if (strongMatch && strongMatch[1]) {
    const clean = sanitizeExtractedTitle(strongMatch[1]);
    if (clean) return clean;
  }

  // 4. JSON-LD Structured Data (Fallback - ignore if obj.name equals author name)
  const ldMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of ldMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      const obj = Array.isArray(parsed) ? parsed[0] : parsed;
      if (obj) {
        const authorName = obj.author?.name || obj.byArtist?.name;
        const candidate = obj.songbookName || obj.headline || (obj.name !== authorName ? obj.name : null);
        if (candidate && typeof candidate === 'string') {
          const clean = sanitizeExtractedTitle(candidate);
          if (clean) return clean;
        }
      }
    } catch {
      // Continue
    }
  }

  return null;
}

function hasSongsPayload(data: any): boolean {
  if (!data) return false;
  if (Array.isArray(data) && data.length > 0) return true;
  if (Array.isArray(data.songs) && data.songs.length > 0) return true;
  if (Array.isArray(data.songbookSongs) && data.songbookSongs.length > 0) return true;
  if (Array.isArray(data.sections) && data.sections.length > 0) return true;
  if (Array.isArray(data.tracks) && data.tracks.length > 0) return true;
  if (Array.isArray(data.track) && data.track.length > 0) return true;
  return false;
}

export function extractEmbeddedJsonFromHtml(html: string): any | null {
  if (typeof html !== 'string') return null;

  // 1. Next.js __NEXT_DATA__
  const nextDataMatch = html.match(/<script\s+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch && nextDataMatch[1]) {
    try {
      const parsed = JSON.parse(nextDataMatch[1]);
      const pageProps = parsed?.props?.pageProps;
      if (pageProps) {
        const candidate = pageProps.songbook || pageProps.sections || pageProps.data || pageProps.project;
        if (candidate && hasSongsPayload(candidate)) {
          return candidate;
        }
        if (hasSongsPayload(pageProps)) {
          return pageProps;
        }
      }
    } catch {
      // Continue
    }
  }

  // 2. JSON-LD structured data script tags
  const ldMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of ldMatches) {
    try {
      const parsed = JSON.parse(m[1]);
      const obj = Array.isArray(parsed) ? parsed[0] : parsed;
      if (obj && (hasSongsPayload(obj) || (Array.isArray(obj.track) && obj.track.length > 0))) {
        return obj;
      }
    } catch {
      // Continue
    }
  }

  // 3. Any application/json script tag containing songs or sections
  const jsonScriptMatches = html.matchAll(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonScriptMatches) {
    try {
      const parsed = JSON.parse(m[1]);
      if (hasSongsPayload(parsed)) return parsed;
    } catch {
      // Continue
    }
  }

  return null;
}

async function fetchViaPublicProxies(token: string, rawUrl?: string): Promise<any> {
  const candidateUrls: string[] = [];

  if (rawUrl && /^https?:\/\//i.test(rawUrl.trim())) {
    candidateUrls.push(rawUrl.trim().split('#')[0]);
  }

  if (token) {
    candidateUrls.push(`https://kytario.com/api/songbooks/${token}/sections`);
    candidateUrls.push(`https://kytario.com/cs/${token}`);
    candidateUrls.push(`https://kytario.com/sk/${token}`);
    candidateUrls.push(`https://kytario.com/en/${token}`);
    candidateUrls.push(`https://kytario.com/${token}`);
    candidateUrls.push(`https://kytario.com/zpevnik/${token}`);
    candidateUrls.push(`https://kytario.com/api/v1/songbooks/${token}/sections`);
    candidateUrls.push(`https://kytario.com/api/songbooks/${token}`);
  }

  const uniqueEndpoints = Array.from(new Set(candidateUrls));

  for (const targetUrl of uniqueEndpoints) {
    // 1. Direct fetch (e.g. if CORS is permitted or user has a CORS browser extension)
    try {
      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (hasSongsPayload(data)) return data;
        } catch {
          const embedded = extractEmbeddedJsonFromHtml(text);
          if (embedded) return embedded;
        }
      }
    } catch {
      // Direct CORS blocked, continue
    }

    // 2. CorsProxy.io (Fast, reliable public CORS proxy)
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (hasSongsPayload(data)) return data;
        } catch {
          const embedded = extractEmbeddedJsonFromHtml(text);
          if (embedded) return embedded;
        }
      }
    } catch {
      // Continue
    }

    // 3. allorigins get proxy (JSON wrapper)
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const wrapper = await res.json();
        if (wrapper && wrapper.contents) {
          try {
            const data = JSON.parse(wrapper.contents);
            if (hasSongsPayload(data)) return data;
          } catch {
            const embedded = extractEmbeddedJsonFromHtml(wrapper.contents);
            if (embedded) return embedded;
          }
        }
      }
    } catch {
      // Continue
    }

    // 4. Jina Reader proxy
    try {
      const proxyUrl = `https://r.jina.ai/${targetUrl}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(4500) });
      if (res.ok) {
        const text = await res.text();
        const jsonStart = text.search(/[\[{]/);
        if (jsonStart >= 0) {
          try {
            const data = JSON.parse(text.slice(jsonStart));
            if (hasSongsPayload(data)) return data;
          } catch {
            const embedded = extractEmbeddedJsonFromHtml(text);
            if (embedded) return embedded;
          }
        }
      }
    } catch {
      // Continue
    }

    // 5. CodeTabs proxy
    try {
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (hasSongsPayload(data)) return data;
        } catch {
          const embedded = extractEmbeddedJsonFromHtml(text);
          if (embedded) return embedded;
        }
      }
    } catch {
      // Continue
    }
  }

  return null;
}

async function enrichTitleInClient(data: any, token: string, rawUrl?: string) {
  if (!data) return;
  const urlsToTry: string[] = [];
  if (rawUrl && /^https?:\/\//i.test(rawUrl.trim())) {
    urlsToTry.push(rawUrl.trim().split('#')[0]);
  }
  if (token) {
    urlsToTry.push(`https://kytario.com/${token}`);
    urlsToTry.push(`https://kytario.com/cs/${token}`);
    urlsToTry.push(`https://kytario.com/sk/${token}`);
    urlsToTry.push(`https://kytario.com/en/${token}`);
    urlsToTry.push(`https://kytario.com/zpevnik/${token}`);
  }

  const uniqueUrls = Array.from(new Set(urlsToTry));

  for (const webUrl of uniqueUrls) {
    try {
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
            return;
          }
        }
      }
    } catch {
      // Continue
    }
  }
}

/**
 * Fast control function to verify if a Kytario songbook URL/token exists before full fetching.
 * If 404 or 400 is returned, fails immediately without freezing or hanging on slow proxies.
 */
export async function checkSongbookExists(tokenOrUrl: string): Promise<{ exists: boolean; status?: number; error?: string }> {
  try {
    const token = extractKytarioSlug(tokenOrUrl) || tokenOrUrl.trim();
    if (!token) return { exists: false, error: 'Empty songbook token' };

    const checkUrl = `https://kytario.com/api/songbooks/${encodeURIComponent(token)}/sections`;
    const res = await fetch(checkUrl, { 
      method: 'GET',
      signal: AbortSignal.timeout(4000) 
    });

    if (res.status === 404 || res.status === 400) {
      return { exists: false, status: res.status, error: `Songbook "${token}" was not found (404).` };
    }
    return { exists: true, status: res.status };
  } catch (err: any) {
    // If network error or timeout, let main proxy / fallback handle it without blocking
    return { exists: true };
  }
}

export async function fetchSongbookFromKytario(url: string): Promise<any> {
  const cleanUrl = cleanKytarioUrl(url);
  const token = extractKytarioSlug(cleanUrl);
  
  if (!token && !/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('Please enter a valid Kytario songbook URL or code.');
  }

  // Quick validation control function: check if songbook exists
  if (token) {
    const check = await checkSongbookExists(token);
    if (!check.exists && (check.status === 404 || check.status === 400)) {
      throw new KytarioFetchError(`Songbook "${token}" was not found (404). Please check the URL or code.`, {
        isCorsOrStaticHost: false,
        token,
        apiUrl: `https://kytario.com/api/songbooks/${token}/sections`,
        webUrl: `https://kytario.com/${token}`,
      });
    }
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
      if (err.response) {
        const status = err.response.status;
        const errMsg = err.response.data?.error || `Kytario proxy error (Status ${status})`;
        
        // If it's a 404 or 400, the songbook is genuinely missing or invalid. Do not attempt client-side fallbacks!
        if (status === 404 || status === 400) {
          throw new KytarioFetchError(errMsg, {
            isCorsOrStaticHost: false,
            token: token || '',
            apiUrl: `https://kytario.com/api/songbooks/${token}/sections`,
            webUrl: `https://kytario.com/${token}`,
          });
        }
      }
      console.warn('Configured Kytario proxy not available, attempting client-side fallback strategies:', err?.message);
    }
  }

  // Next, try client-side direct access and public CORS proxies
  if (token || cleanUrl) {
    try {
      const clientData = await fetchViaPublicProxies(token, cleanUrl);
      if (clientData) {
        await enrichTitleInClient(clientData, token, cleanUrl);
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
